const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');
const ApiError = require('../error/ApiError');
const { getInitData } = require('../middleware/authMiddleware');


class OrderController {
    async getList(req, res, next) {
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
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const connection = await mysql.createConnection(CONFIG);
            const [totalRows] = await connection.execute('SELECT COUNT(*) AS total FROM orders');
            const total = totalRows[0].total;

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
                LIMIT ?, ?;
            `;

            values.push(parseInt(start), parseInt(end) - parseInt(start) + 1);

            const [data] = await connection.execute(query, values);
            res.setHeader('Content-Range', `orders ${start}-${end - 1}/${total}`);
            res.status(200).json(data);
            await connection.end();
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        }
    }

    async getOne(req, res, next) {
        try {
            const id = +req.params.id;
            const connection = await mysql.createConnection(CONFIG);
            const querie = Q.get_one_order;
            const [data] = await connection.execute(querie, [id]);
            res.status(200).json(data[0]);
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        }
    }

    async getMany(req, res, next) {
        try {
            const { ids } = req.query;
            const parsedIds = ids.split(',').map((item) => Number(item));
            const querie = `
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
            const connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(querie);
            res.status(200).json(data);
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        }
    }

    async create(req, res, next) {
        const deliveryOption = req.body.deliveryOption;
        const deliveryCost   = req.body.deliveryCost;
        const readyDate      = req.body.readyDate;
        const readyTime      = req.body.readyTime;
        const address        = req.body.address;
        const comment        = req.body.comment;
        const cartItems      = req.body.cartItems;

        try {
            const initData = getInitData(res);
            const userId = initData.user.id;
            const connection = await mysql.createConnection(CONFIG);
            const [order] = await connection.query(Q.order_create, [userId, deliveryOption, deliveryCost, readyDate, readyTime, address, comment]);
            const orderId = order.insertId;

            const values = cartItems.map(item => [
                orderId,
                item.id,
                item.name,
                item.price,
                item.count
            ]);

            await connection.query(Q.order_product_create, [values]);

            res.status(200).json({ 
                message: 'Order created successfully',
                orderId: orderId
            });

            await connection.end();
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        }
    }

    async update(req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const { id, status, ready_date, ready_time, address, comment } = req.body;

            const [orderExists] = await connection.execute('SELECT COUNT(*) AS count FROM orders WHERE id = ? ', [id]);
            if (orderExists[0].count === 0) {
                return ApiError.notFound('Order is not found');
            }

            await connection.execute(Q.order_update, [status, ready_date, ready_time, address, comment, id]);

            res.status(200).json({ id, status, ready_date, ready_time, address, comment })
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        }
    }

    async delete(req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const id = +req.params.id;
            const [data] = await connection.execute(Q.order_delete, [id]);
            res.status(200).json(data);
            await connection.end();
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        }
    }

    async deleteMany(req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const { filter } = req.query;
            const ids = JSON.parse(filter).id;
            const querie = `DELETE FROM orders WHERE id IN (${ids.join(',')})`;
            const [data] = await connection.execute(querie);
            res.status(200).json({ data: ids });
            await connection.end();
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        }
    }
}

module.exports = new OrderController();