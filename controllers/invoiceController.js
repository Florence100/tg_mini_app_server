const { bot } = require('../bot');
const { getInitData } = require('../middleware/authMiddleware');
const ApiError = require('../error/ApiError');
const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');


const providerToken = process.env.PROVIDER_TOKEN;
const serverUrl = `https://${process.env.SERVER_URL}`;

function dateConvert(isoDate) {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы в JavaScript начинаются с 0
    const year = date.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;

    return formattedDate;
}

class InvoiceController {
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
            } catch (err) {
                console.warn('Invalid range param:', range);
            }

            try {
                [field, order] = JSON.parse(sort);
            } catch (err) {
                console.warn('Invalid sort param:', sort);
            }

            try {
                filterObj = JSON.parse(filter);
            } catch (err) {
                console.warn('Invalid filter param:', filter);
            }

            const whereConditions = [];
            const values = [];

            for (const [key, value] of Object.entries(filterObj)) {
                if (key === 'status') {
                    whereConditions.push(`i.status = ?`);
                    values.push(value);
                } else if (key === 'created_at_gte') {
                    whereConditions.push(`DATE(i.created_at) >= ?`);
                    values.push(value);
                } else if (key === 'created_at_lte') {
                    whereConditions.push(`DATE(i.created_at) <= ?`);
                    values.push(value);
                } else if (key === 'created_at') {
                    whereConditions.push(`DATE(i.created_at) = ?`);
                    values.push(value);
                } else {
                    whereConditions.push(`i.${key} = ?`);
                    values.push(value);
                }
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            connection = await mysql.createConnection(CONFIG);
    
            const [totalRows] = await connection.execute(`
                SELECT COUNT(*) AS total FROM invoice i ${whereClause}
                `, values);
            const total = totalRows[0].total;

            const query = `
                SELECT 
                    i.id,
                    i.order_id,
                    i.status,
                    i.created_at,
                    i.total_amount,
                    u.id AS user_id
                FROM 
                    invoice i
                LEFT JOIN orders o ON o.id = i.order_id
                LEFT JOIN user u ON u.id = o.user_id
                ${whereClause}
                ORDER BY
                    ${field} ${order}
                LIMIT ?, ?;
            `;

            values.push(parseInt(start), parseInt(end) - parseInt(start) + 1);

            const [data] = await connection.execute(query, values);
            res.setHeader('Content-Range', `invoices ${start}-${end - 1}/${total}`);
            res.status(200).json(data);
        } catch (e) {
            console.error('GetList invoice error: ', e);
            if (e.code === 'ECONNREFUSED') {
                return next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            return next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
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
            const query = `
                SELECT 
                    i.id,
                    i.order_id,
                    i.status,
                    i.created_at,
                    i.total_amount,
                    u.id AS user_id
                FROM 
                    invoice i
                LEFT JOIN orders o ON o.id = i.order_id
                LEFT JOIN user u ON u.id = o.user_id
                WHERE i.order_id = ?
            `;
            const [data] = await connection.execute(query, [id]);
            res.status(200).json(data[0]);
        } catch (e) {
            console.error('GetOne invoice error: ', e);
            if (e.code === 'ECONNREFUSED') {
                return next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            return next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
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
                    i.id,
                    i.order_id,
                    i.status,
                    i.created_at,
                    i.total_amount,
                    u.id AS user_id
                FROM 
                    invoice i
                LEFT JOIN orders o ON o.id = i.order_id
                LEFT JOIN user u ON u.id = o.user_id
                WHERE i.order_id IN (${parsedIds.join(',')})
            `;

            connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(query);
            res.status(200).json(data);
        } catch (e) {
            console.error('GetMany invoice error: ', e);
            if (e.code === 'ECONNREFUSED') {
                return next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            return next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        } finally {
            if (connection) await connection.end();
        }
    }

    async create(req, res, next) {
        let connection;

        try {
            const initData = getInitData(res);
            const userId = initData.user.id;
            const orderId = req.body.orderId;

            if (!userId || !orderId) return next(ApiError.badRequest('Missing userId or orderId'));

            connection = await mysql.createConnection(CONFIG);
            const [orderInfo] = await connection.execute(Q.order_get_info, [orderId]);
            const [orderProducts] = await connection.execute(Q.order_get_products, [orderId]);
            const { deliveryOption, deliveryCost } = orderInfo[0];

            const pricesData = orderProducts.map(product => ({
                label  : `${product.name} × ${product.count}`,
                amount : Math.round(product.price * product.count),
            }))

            if (deliveryOption === 'delivery') {
                pricesData.push(
                    {
                        label : 'Доставка курьером',
                        amount: deliveryCost === 0 ? 0 : Math.round(deliveryCost)
                    }
                );
            }

            const totalAmount = pricesData.reduce(function (result, curValue) {
                return result + curValue.amount;
            }, 0)

            const currentDate = Date.now();
            const payload = `${userId}-${currentDate}`;

            const invoiceLink = await bot.createInvoiceLink(
                'Данные тестовой карты:', //title
                '4918 0100 0000 0085 \nСрок действия - любая дата в будущем \n CVC - любые три цифры', //description
                payload,
                providerToken,
                'RUB',
                pricesData,
                {
                    need_name         : true,
                    need_phone_number : true,
                    photo_url         : `${serverUrl}/img/macaron-1.png`,
                }
            );

            const slug = invoiceLink.split('/').pop().replace('$', '');
            const invoiceId = orderId;
            await connection.execute(Q.invoice_create, [invoiceId, orderId, slug, totalAmount, 'pending']);

            res.status(200).json({ invoiceLink });
        } catch (e) {
            console.error('Create invoice error: ', e);
            if (e.code === 'ECONNREFUSED') {
                return next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            return next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        } finally {
            if (connection) await connection.end();
        }
    }

    async update(req, res) {
        const initData = getInitData(res);
        const userId = initData.user.id;
        if (!userId) return next(ApiError.badRequest('Missing userId'));

        const slug = req.body?.slug;
        const status = req.body?.status;
        let connection;

        try {
            connection = await mysql.createConnection(CONFIG);
            const [rows] = await connection.execute(
                `SELECT order_id AS orderId FROM invoice WHERE invoice.slug = ?`,
                [slug]
            );
            const orderId = rows[0].orderId;

            if (status === 'paid') {
                const [orderInfo] = await connection.execute(Q.order_get_info, [orderId]);
                const { deliveryOption, readyDate, readyTime, address } = orderInfo[0];
                const formattedDate = dateConvert(readyDate);
                let messageToUser;

                if (deliveryOption === 'pickup') {
                    messageToUser = `Оплата прошла успешно! Ваш чек здесь ⬆️\n\nВаш заказ будет готов ${formattedDate} в промежуток времени ${readyTime} \nСпасибо, что выбираете нас!`;
                } else if (deliveryOption === 'delivery') {
                    messageToUser = `Оплата прошла успешно! Ваш чек здесь ⬆️\n\nВаш заказ будет доставлен ${formattedDate} по адресу ${address} в промежуток времени ${readyTime}  \nСпасибо, что выбираете нас!`;
                }

                await connection.execute(Q.invoice_update_status, [status, slug]);
                await connection.execute(Q.order_update_status, [status, orderId]);
                bot.sendMessage(userId, messageToUser);
            } else if (status === 'failed' || status === 'cancelled') {
                await connection.execute(Q.invoice_update_status, [status, slug]);
                await connection.execute(Q.order_update_status, [status, orderId]);
            }
            res.sendStatus(200);
        } catch (e) {
            console.error('Update invoice error: ', e);
            if (e.code === 'ECONNREFUSED') {
                return next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            return next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        } finally {
            if (connection) await connection.end();
        }
    }
}

module.exports = new InvoiceController();