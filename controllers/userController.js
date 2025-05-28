const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');
const ApiError = require('../error/ApiError');
const { getInitData } = require('../middleware/authMiddleware');

class UserController {
    async auth(req, res, next) {
        let connection;
        try {
            const initData = getInitData(res);
            const userData = initData.user;

            connection = await mysql.createConnection(CONFIG);
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

                const [[roleRows]] = await connection.execute(`SELECT id FROM role WHERE role_name = ?`, ['user']);

                await connection.execute(`INSERT INTO user_role (user_id, role_id) VALUES(?, ?)`, [userData.id, roleRows.id]);
            }

            const [rolesRows] = await connection.execute(
                Q.user_get_roles,
                [userData.id]
            )
            const roles = rolesRows.map((role) => role.name);

            res.status(200).json({...initData, roles});
        } catch (e) {
            console.error('AuthError: ', e);
            return next(ApiError.forbidden(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async getList(req, res, next) {
        let connection;

        try {
            const {
                range = '[0, 9]',
                sort = '["id", "ASC"]',
                filter = '{}'
            } = req.query;

            let start = 0, end = 9;
            let field = 'id', order = 'ASC';
            let filterObj = {};

            try { 
                [start, end] = JSON.parse(range); 
            } catch (e) { 
                console.warn('Invalid range param:', range); 
            }

            try { 
                [field, order] = JSON.parse(sort); 
            } catch (e) { 
                console.warn('Invalid sort param:', sort); 
            }

            try { 
                filterObj = JSON.parse(filter); 
            } catch (e) { 
                console.warn('Invalid filter param:', filter); 
            }

            const whereConditions = [];
            const values = [];

            for (const [key, value] of Object.entries(filterObj)) {
                if (key === 'q') {
                    const like = `%${value}%`;
                    whereConditions.push(`(
                        u.id LIKE ? OR
                        u.first_name LIKE ? OR
                        u.user_name LIKE ? OR
                        u.last_name LIKE ?
                    )`);
                    values.push(like, like, like, like);
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

            const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
            connection = await mysql.createConnection(CONFIG);

            const [totalRows] = await connection.execute(
                `SELECT COUNT(*) AS total FROM user u ${whereClause}`,
                values
            );
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
        } catch (e) {
            console.error('GetList user error:', e);
            if (e.code === 'ECONNREFUSED') {
                return next(ApiError.internal('Соединение отклонено сервером.'));
            }
            return next(ApiError.badRequest(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async getOne (req, res, next) {
        let connection;

        try {
            const id = +req.params.id;
            if (!id) return next(ApiError.badRequest('Missing id parameter'));
    
            connection = await mysql.createConnection(CONFIG);
            const [[data]] = await connection.execute(`SELECT * FROM user WHERE id = ?`, [id]);
            res.status(200).json(data);
        } catch (e) {
            console.error('GetOne user error: ', e);
            if (e.code === 'ECONNREFUSED') {
                return next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, закройте приложение и попробуйте еще раз.'));
            }
            return next(ApiError.notFound('Что-то пошло не так. Страница не найдена.'));
        } finally {
            if (connection) await connection.end();
        }
    }

    async getMany (req, res, next) {
        let connection;

        try {
            const { ids } = req.query;
            if (!ids) return next(ApiError.badRequest('Missing ids parameter'));

            const parsedIds = ids
                .split(',')
                .map((item) => Number(item))
                .filter(id => !isNaN(id));
            
            if (!parsedIds.length) return next(ApiError.badRequest('Invalid ids'));

            const placeholders = parsedIds.map(() => '?').join(',');

            const query = `SELECT * FROM user WHERE id IN (${placeholders})`;

            connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(query, parsedIds);

            res.status(200).json(data);
        } catch (e) {
            console.error('GetMany user error: ', e);
            if (e.code === 'ECONNREFUSED') {
                return next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, закройте приложение и попробуйте еще раз.'));
            }
            return next(ApiError.notFound('Что-то пошло не так. Страница не найдена.'));
        } finally {
            if (connection) await connection.end();
        }
    }
}

module.exports = new UserController();