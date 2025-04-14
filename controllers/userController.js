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
            await connection.end();
            res.status(200).json(userData);
        } catch (e) {
            console.error('AuthError: ', e);
            next(ApiError.forbidden(e.message));
        }
    }
}

module.exports = new UserController();