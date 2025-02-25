const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');
const ApiError = require('../error/ApiError');
const { getInitData } = require('../middleware/authMiddleware');

class BasketController {
    async getBasket(req, res, next) {
        try {
            const initData = getInitData(res);
            const userId = initData.user.id;
            const connection = await mysql.createConnection(CONFIG);
            const [row] = await connection.execute(Q.basket_find, [userId]); //user's basket id
            const basketId = row[0].id;
            const [data] = await connection.execute(Q.basket_product_get, [basketId]);
            res.json(data);
            await connection.end();
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    async clearBasket(req, res, next) {
        try {
            const initData = getInitData(res);
            const userId = initData.user.id;
            const connection = await mysql.createConnection(CONFIG);
            const [row] = await connection.execute(Q.basket_find, [userId]);
            const basketId = row[0].id;
            
            if (row.length > 0) {
                await connection.execute(Q.basket_clear, [basketId]);
            }
            await connection.end();
            res.send('Basket cleared successfully!');
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    async addProduct(req, res, next) {
        try {
            const productId = req.body.productId;
            const count = req.body.count;
            const initData = getInitData(res);
            const userId = initData.user.id;
            const connection = await mysql.createConnection(CONFIG);
            const [row] = await connection.execute(Q.basket_find, [userId]);
            const basketId = row[0].id;
            
            if (row.length > 0) {
                await connection.execute(Q.basket_product_add, [basketId, productId, count]);
            }
            await connection.end();
            res.send('Product added successfully!');
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    async removeProduct(req, res, next) {
        try {
            const productId = req.body.productId;
            const initData = getInitData(res);
            const userId = initData.user.id;
            const connection = await mysql.createConnection(CONFIG);
            const [row] = await connection.execute(Q.basket_find, [userId]);
            const basketId = row[0].id;
            
            if (row.length > 0) {
                await connection.execute(Q.basket_product_remove, [basketId, productId]);
            }
            await connection.end();
            res.send('Product deleted successfully!');
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }



    async incrProduct(req, res, next) {
        try {
            const productId = req.body.productId;
            const initData = getInitData(res);
            const userId = initData.user.id;
            const connection = await mysql.createConnection(CONFIG);
            const [row] = await connection.execute(Q.basket_find, [userId]);
            const basketId = row[0].id;
            
            if (row.length > 0) {
                await connection.execute(Q.basket_product_incr, [basketId, productId]);
            }
            await connection.end();
            res.send('Product update successfully!');
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    async decrProduct(req, res, next) {
        try {
            const productId = req.body.productId;
            const initData = getInitData(res);
            const userId = initData.user.id;
            const connection = await mysql.createConnection(CONFIG);
            const [row] = await connection.execute(Q.basket_find, [userId]);
            const basketId = row[0].id;
            
            if (row.length > 0) {
                await connection.execute(Q.basket_product_decr, [basketId, productId]);
            }
            await connection.end();
            res.send('Product update successfully!');
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }
}

module.exports = new BasketController();