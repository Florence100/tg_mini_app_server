const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');
const ApiError = require('../error/ApiError');
const { getInitData } = require('../middleware/authMiddleware');


class OrderController {
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
                if (key === 'status') {
                    whereConditions.push(`o.status = ?`);
                    values.push(value);
                } else if (key === 'ready_at_gte') {
                    whereConditions.push(`DATE(o.ready_date) >= ?`);
                    values.push(value);
                } else if (key === 'ready_at_lte') {
                    whereConditions.push(`DATE(o.ready_date) <= ?`);
                    values.push(value);
                } else if (key === 'ready_date') {
                    whereConditions.push(`DATE(o.ready_date) = ?`);
                    values.push(value);
                } else {
                    whereConditions.push(`o.${key} = ?`);
                    values.push(value);
                }
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            connection = await mysql.createConnection(CONFIG);
            const [totalRows] = await connection.execute(
                `SELECT COUNT(*) AS total FROM orders o ${whereClause}`, 
                values
            );
            const total = totalRows[0].total;

            const limit = parseInt(end) - parseInt(start) + 1;

            const query = `
                SELECT 
                    o.id AS id, 
                    o.user_id, 
                    o.status, 
                    o.created_at, 
                    o.delivery, 
                    o.delivery_cost, 
                    o.ready_date, 
                    o.ready_time, 
                    o.address, 
                    o.comment, 
                    i.total_amount,
                    i.order_id,
                    CONCAT('[', GROUP_CONCAT(
                        CONCAT(
                            '{ "product_id": "', op.product_id, '", ',
                            '"name": "', op.name, '", ',
                            '"count": "', op.count, '", ',
                            '"price": "', op.price, '" }'
                        )
                    ), ']') AS products_info 
                FROM 
                    orders o 
                LEFT JOIN order_product op ON o.id = op.order_id
                LEFT JOIN user u ON o.user_id = u.id 
                LEFT JOIN invoice i ON i.order_id = op.order_id
                ${whereClause}
                GROUP BY o.id
                ORDER BY
                    ${field} ${order}
                LIMIT ${parseInt(start)}, ${limit};
            `;

            const [data] = await connection.execute(query, values);
            res.setHeader('Content-Range', `orders ${start}-${end - 1}/${total}`);
            res.status(200).json(data);
        } catch (e) {
            console.error('GetList order error: ', e);
            return next(e.code === 'ECONNREFUSED'
                ? ApiError.internal('Сервер базы данных недоступен.')
                : ApiError.badRequest(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async getOne(req, res, next) {
        let connection;

        try {
            const id = +req.params.id;

            if (!id) return next(ApiError.badRequest('Missing id parameter'));

            connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(Q.order_get_one, [id]);
            res.status(200).json(data[0]);
        } catch (e) {
            console.error('GetOne order error: ', e);
            return next(e.code === 'ECONNREFUSED'
                ? ApiError.internal('Сервер базы данных недоступен.')
                : ApiError.badRequest(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async getMany(req, res, next) {
        let connection;

        try {
            const { ids } = req.query;
            if (!ids) return next(ApiError.badRequest('Missing ids parameter'));

            const parsedIds = ids.split(',').map((item) => Number(item));

            const query = `
                SELECT 
                    o.id AS id, 
                    o.user_id, 
                    o.status, 
                    o.created_at, 
                    o.delivery, 
                    o.delivery_cost, 
                    o.ready_date, 
                    o.ready_time, 
                    o.address, 
                    o.comment, 
                    i.total_amount,
                    i.order_id,
                    CONCAT('[', GROUP_CONCAT(
                        CONCAT(
                            '{ "product_id": "', op.product_id, '", ',
                            '"name": "', op.name, '", ',
                            '"count": "', op.count, '", ',
                            '"price": "', op.price, '" }'
                        )
                    ), ']') AS products_info 
                FROM 
                    orders o 
                LEFT JOIN order_product op ON o.id = op.order_id
                LEFT JOIN user u ON o.user_id = u.id 
                LEFT JOIN invoice i ON i.order_id = op.order_id
                WHERE o.id IN (${parsedIds.join(',')})
                GROUP BY o.id;
            `;

            connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(query);
            res.status(200).json(data);
        } catch (e) {
            console.error('GetMany order error: ', e);
            return next(e.code === 'ECONNREFUSED'
                ? ApiError.internal('Сервер базы данных недоступен.')
                : ApiError.badRequest(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async create(req, res, next) {
        const {
            deliveryOption,
            deliveryCost,
            readyDate,
            readyTime,
            address,
            comment,
            cartItems
        } = req.body;

        let connection;

        try {
            const initData = getInitData(res);
            const userId = initData.user.id;

            if (!userId) return next(ApiError.badRequest('Missing userId parameter'));

            connection = await mysql.createConnection(CONFIG);
            const [order] = await connection.query(
                Q.order_create, 
                [userId, deliveryOption, deliveryCost, readyDate, readyTime, address, comment]
            );
            const orderId = order.insertId;

            const values = cartItems.map(item => [
                orderId,
                item.id,
                item.name,
                item.price,
                item.count
            ]);

            await connection.query(Q.order_create_product, [values]);

            res.status(200).json({ 
                message: 'Order created successfully',
                orderId: orderId
            });
        } catch (e) {
            console.error('Create order error: ', e);
            return next(e.code === 'ECONNREFUSED'
                ? ApiError.internal('Сервер базы данных недоступен.')
                : ApiError.badRequest(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async update(req, res, next) {
        let connection;

        try {
            const { id, status, ready_date, ready_time, address, comment } = req.body;

            connection = await mysql.createConnection(CONFIG);
            const [orderExists] = await connection.execute('SELECT COUNT(*) AS count FROM orders WHERE id = ? ', [id]);
            if (orderExists[0].count === 0) {
                return ApiError.notFound('Order is not found');
            }

            await connection.execute(Q.order_update, [status, ready_date, ready_time, address, comment, id]);

            res.status(200).json({ id, status, ready_date, ready_time, address, comment });
        } catch (e) {
            console.error('error: ', e);
            return next(e.code === 'ECONNREFUSED'
                ? ApiError.internal('Сервер базы данных недоступен.')
                : ApiError.badRequest(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async delete(req, res, next) {
        let connection;

        try {
            const id = +req.params.id;
            if (!id) return next(ApiError.badRequest('Missing id parameter'));

            connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(Q.order_delete, [id]);
            res.status(200).json(data);
        } catch (e) {
            console.error('Delete order error: ', e);
            return next(e.code === 'ECONNREFUSED'
                ? ApiError.internal('Сервер базы данных недоступен.')
                : ApiError.badRequest(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async deleteMany(req, res, next) {
        let connection;

        try {
            const { filter = '{}' } = req.query;
            const ids = JSON.parse(filter).id || [];
            if (!ids.length) return next(ApiError.badRequest('Нет ID для удаления.'));

            connection = await mysql.createConnection(CONFIG);
            const placeholders = ids.map(() => '?').join(', ');

            await connection.execute(`DELETE FROM orders WHERE id IN (${placeholders})`, ids);
            res.status(200).json({ data: ids });
        } catch (e) {
            console.error('DeleteMany order error: ', e);
            return next(e.code === 'ECONNREFUSED'
                ? ApiError.internal('Сервер базы данных недоступен.')
                : ApiError.badRequest(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }
}

module.exports = new OrderController();