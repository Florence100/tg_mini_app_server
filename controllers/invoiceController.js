const { bot } = require('../bot');
const { JSDOM } = require('jsdom');
const { getInitData } = require('../middleware/authMiddleware');
const ApiError = require('../error/ApiError');
const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');

const providerToken = process.env.PROVIDER_TOKEN;
const serverUrl = `https://${process.env.SERVER_URL}`;

class InvoiceController {
    async create(req, res, next) {
        const initData = getInitData(res);
        const userId = initData.user.id;
        const orderId = req.body.orderId;

        try {
            const connection = await mysql.createConnection(CONFIG);
            const [orderInfo] = await connection.execute(Q.order_info_get, [orderId]);
            const [orderProducts] = await connection.execute(Q.order_products_get, [orderId]);
            const { deliveryOption, deliveryCost } = orderInfo[0];

            const pricesData = orderProducts.map(product => ({
                label  : `${product.name} × ${product.count}`,
                amount : +(product.price * product.count * 100).toFixed(2),
            }))

            if (deliveryOption === 'delivery') {
                pricesData.push(
                    {
                        label : 'Доставка курьером',
                        amount: deliveryCost === 0 ? 0 : +(deliveryCost * 100).toFixed(2)
                    }
                );
            }

            const currentDate = Date.now();
            const invoiceId = `${userId}-${currentDate}`;

            const invoiceLink = await bot.createInvoiceLink(
                'Данные тестовой карты:', //title
                '6390 0200 0000 000003 \nСрок действия 2024/12 CVC 123 \nКод 3-D Secure 12345678 ', //description
                invoiceId, //payload
                providerToken,
                'RUB',
                pricesData,
                {
                    need_name         : true,
                    need_phone_number : true,
                    photo_url         : `${serverUrl}/img/burger_small.png`,
                }
            );

            const slug = invoiceLink.split('/').pop().replace('$', '');
            await connection.execute(Q.invoice_create, [orderId, slug, 'pending']);
            res.status(200).json({ invoiceLink });
        } catch (e) {
            next(ApiError.internal(e.message));
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
                const [orderInfo] = await connection.execute(Q.order_info_get, [orderId]);
                const { deliveryOption, readyDate, readyTime, address } = orderInfo[0];
                const formattedDate = dateConvert(readyDate);
                let messageToUser;

                if (deliveryOption === 'pickup') {
                    messageToUser = `Оплата прошла успешно! Ваш чек здесь ⬆️\n\nВаш заказ будет готов ${formattedDate} в промежуток времени ${readyTime} \nСпасибо, что выбираете нас!`;
                } else if (deliveryOption === 'delivery') {
                    messageToUser = `Оплата прошла успешно! Ваш чек здесь ⬆️\n\nВаш заказ будет доставлен ${formattedDate} по адресу ${address} в промежуток времени ${readyTime}  \nСпасибо, что выбираете нас!`;
                }

                await connection.execute(Q.invoice_status_update, [status, slug]);
                await connection.execute(Q.order_status_update, [status, orderId]);
                bot.sendMessage(userId, messageToUser);

            } else if (status === 'failed' || status === 'cancelled') {
                await connection.execute(Q.invoice_status_update, [status, slug]);
                await connection.execute(Q.order_status_update, [status, orderId]);
            }
        } catch (e) {
            next(ApiError.internal(e.message));
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