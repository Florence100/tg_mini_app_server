const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');
const ApiError = require('../error/ApiError');
const { getInitData } = require('../middleware/authMiddleware');
// const moment = require('moment-timezone');


class OrderController {
    async create(req, res, next) {
        const deliveryOption = req.body.deliveryOption;
        const deliveryCost   = req.body.deliveryCost;
        const readyDate      = req.body.readyDate;
        const readyTime      = req.body.readyTime;
        const address        = req.body.address;
        const comment        = req.body.comment;

        // const formattedReadyDate = moment.tz(readyDate, 'Europe/Moscow').format('YYYY-MM-DD');

        try {
            const initData = getInitData(res);
            const userId = initData.user.id; 
            const connection = await mysql.createConnection(CONFIG);
            const [order] = await connection.query(Q.order_create, [userId, deliveryOption, deliveryCost, readyDate, readyTime, address, comment]);
            const orderId = order.insertId;
            const [basket] = await connection.execute(Q.basket_find, [userId]);
            const basketId = basket[0].id;
            const [basketItems] = await connection.query(Q.basket_product_get, [basketId]);

            const values = basketItems.map(item => [
                orderId,
                item.id,
                item.name,
                item.price,
                item.count
            ]);
            console.log('values: ', values)

            await connection.query(Q.order_product_create, [values]);

            res.status(200).json({ 
                message: 'Order created successfully',
                orderId: orderId
            });

            await connection.end();
        } catch (e) {
            next(ApiError.forbidden(e.message));
        }
    }
}

module.exports = new OrderController();