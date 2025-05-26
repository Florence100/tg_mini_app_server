const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');
const ApiError = require('../error/ApiError');
const { getInitData } = require('../middleware/authMiddleware');

class UserController {
    async auth(req, res, next) {
        try {
            const initData = getInitData(res);
            const userData = initData.user;
            const connection = await mysql.createConnection(CONFIG);
            const [rows] = await connection.execute(Q.user_find, [userData.id]);

            if (rows.length === 0) {
                await connection.execute(
                    Q.user_create,
                    [
                        userData.id,
                        userData.first_name,
                        userData.username ?? null,
                        userData.last_name ?? null,
                        userData.photo_url ?? null
                    ]
                );

                const [roleRows] = await connection.execute(`SELECT id FROM role WHERE role_name = ?`, ['user']);
                const roleId = roleRows[0].id;

                await connection.execute(`INSERT INTO user_role (user_id, role_id) VALUES(?, ?)`, [userData.id, roleId]);
            }

            const [rolesRows] = await connection.execute(
                Q.user_get_roles,
                [userData.id]
            )
            const roles = rolesRows.map((role) => role.name);

            await connection.end();
            res.status(200).json({...initData, roles});
        } catch (e) {
            console.error('AuthError: ', e);
            next(ApiError.forbidden(e.message));
        }
    }

    async getList (req, res, next) {
        try {
            const { range } = req.query;
            const [start, end] = JSON.parse(range);

            const { sort } = req.query;
            const [field, order] = JSON.parse(sort);

            const { filter } = req.query;
            const whereConditions = [];
            const values = [];

            if(filter) {
                const filterObj = JSON.parse(filter);
                for (const [key, value] of Object.entries(filterObj)) {
                    if (key === 'q') {
                        const likeValue = `%${value}%`;
                        whereConditions.push(`(
                            u.id LIKE ? OR
                            u.first_name LIKE ? OR
                            u.user_name LIKE ? OR
                            u.last_name LIKE ?
                        )`);
                        values.push(likeValue, likeValue, likeValue, likeValue);
                    } else if (key === 'id') {
                        whereConditions.push(`u.id LIKE ?`);
                        values.push(`%${value}%`);
                    } else if (key === 'created_at_gte') {
                        whereConditions.push(`DATE(u.created_at) >= ?`);
                        values.push(value);
                    } else if (key === 'created_at_lte') {
                        whereConditions.push(`DATE(u.created_at) <= ?`);
                        values.push(value);
                    } else {
                        whereConditions.push(`u.${key} LIKE ?`);
                        values.push(`%${value}%`);
                    }
                }
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const connection = await mysql.createConnection(CONFIG);
            const [totalRows] = await connection.execute('SELECT COUNT(*) AS total FROM user');
            const total = totalRows[0].total;

            const query = `
                SELECT
                    u.id,
                    u.first_name,
                    u.user_name,
                    u.last_name,
                    u.photo_url,
                    u.created_at
                FROM
                    user u
                ${whereClause}
                ORDER BY
                    ${field} ${order}
                LIMIT ?, ?;
            `;

            values.push(parseInt(start), parseInt(end) - parseInt(start) + 1);

            const [data] = await connection.execute(query, values);
            res.setHeader('Content-Range', `user ${start}-${end - 1}/${total}`);
            res.status(200).json(data);
            await connection.end();
            
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, закройте приложение и попробуйте еще раз.'));
            }
            next(ApiError.notFound('Что-то пошло не так. Страница не найдена.'));
        }
    }

    async getOne (req, res, next) {
        try {
            const id = +req.params.id;
            const connection = await mysql.createConnection(CONFIG);
            const querie = `
                SELECT
                    *
                FROM
                    user
                WHERE
                    id = ?
            `;
            const [data] = await connection.execute(querie, [id]);
            res.status(200).json(data[0]);
            await connection.end();
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, закройте приложение и попробуйте еще раз.'));
            }
            next(ApiError.notFound('Что-то пошло не так. Страница не найдена.'));
        }
    }

    async getMany (req, res, next) {
        try {
            const { ids } = req.query;
            const parsedIds = ids.split(',').map((item) => Number(item));
            const querie = `
                SELECT
                    *
                FROM
                    user
                WHERE
                    id IN (${parsedIds.join(',')})
            `;
            const connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(querie);
            res.status(200).json(data);
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, закройте приложение и попробуйте еще раз.'));
            }
            next(ApiError.notFound('Что-то пошло не так. Страница не найдена.'));
        }
    }
}

module.exports = new UserController();