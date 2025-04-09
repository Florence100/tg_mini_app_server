const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');
const ApiError = require('../error/ApiError');
const { getInitData } = require('../middleware/authMiddleware');


class OrderController {
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
}

module.exports = new OrderController();