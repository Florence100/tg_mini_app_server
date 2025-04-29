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
            const [rows] = await connection.execute(Q.find_user, [userData.id]);

            if (rows.length === 0) {
                await connection.execute(
                    Q.create_user,
                    [
                        userData.id,
                        userData.first_name,
                        userData.username ?? null,
                        userData.last_name ?? null,
                        userData.photo_url ?? null
                    ]
                );

                const [roleRows] = await connection.execute(
                    Q.select_role,
                    ['user']
                );

                const roleId = roleRows[0].id;
                await connection.execute(
                    Q.assign_role,
                    [userData.id, roleId]
                );
            }

            const [rolesRows] = await connection.execute(
                Q.get_user_roles,
                [userData.id]
            )
            const roles = rolesRows.map((role) => role.name);

            await connection.end();
            // res.status(200).json(userData);
            res.status(200).json({...initData, roles});
        } catch (e) {
            console.error('AuthError: ', e);
            next(ApiError.forbidden(e.message));
        }
    }

    async getUsers (req, res, next) {
        try {
            const { range } = req.query;
            const [start, end] = JSON.parse(range);

            const { sort } = req.query;
            const [field, order] = JSON.parse(sort);
            console.log(JSON.parse(sort));

            const buildQuery = (field, order) => `
                SELECT
                    *
                FROM
                    user
                ORDER BY
                    ${field} ${order}
                LIMIT ?, ?;
            `;

            const connection = await mysql.createConnection(CONFIG);
            const [totalRows] = await connection.execute('SELECT COUNT(*) AS total FROM user');
            const total = totalRows[0].total;

            const query = buildQuery(field, order);
            const [data] = await connection.execute(query, [parseInt(start), parseInt(end) - parseInt(start) + 1]);
            res.setHeader('Content-Range', `products ${start}-${end - 1}/${total}`);
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
}

module.exports = new UserController();