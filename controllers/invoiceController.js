const { bot } = require('../bot');
const { getInitData } = require('../middleware/authMiddleware');
const ApiError = require('../error/ApiError');
const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');

const providerToken = process.env.PROVIDER_TOKEN;
const serverUrl = `https://${process.env.SERVER_URL}`;

class InvoiceController {
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
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const connection = await mysql.createConnection(CONFIG);
            const [totalRows] = await connection.execute('SELECT COUNT(*) AS total FROM invoice');
            const total = totalRows[0].total;

            const buildQuery = (field, order) => `
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

            const query = buildQuery(field, order);
            const [data] = await connection.execute(query, values);
            res.setHeader('Content-Range', `invoices ${start}-${end - 1}/${total}`);
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

            const connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(query);
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
        const initData = getInitData(res);
        const userId = initData.user.id;
        const orderId = req.body.orderId;

        try {
            const connection = await mysql.createConnection(CONFIG);
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
            // const invoiceId = `${userId}-${currentDate}`;

            const invoiceLink = await bot.createInvoiceLink(
                'Данные тестовой карты:', //title
                '6390 0200 0000 000003 \nСрок действия 2024/12 CVC 123 \nКод 3-D Secure 12345678 ', //description
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
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        }
    }

    async update(req, res) {
        const initData = getInitData(res);
        const userId   = initData.user.id;
        const slug     = req.body?.slug;
        const status   = req.body?.status;

        try {
            const connection = await mysql.createConnection(CONFIG);
            const getOrderIdQuery = `SELECT order_id AS orderId FROM invoice WHERE invoice.slug = ?`;
            const [rows] = await connection.execute(getOrderIdQuery, [slug]);
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
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте оформить заказ еще раз.'));
            }
            next(ApiError.unavailable('Сервер не готов обработать запрос в данный момент. Пожалуйста, попробуйте оформить заказ еще раз.'));
        }

        res.sendStatus(200);
    }
}

function dateConvert(isoDate) {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы в JavaScript начинаются с 0
    const year = date.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;

    return formattedDate;
}

module.exports = new InvoiceController();