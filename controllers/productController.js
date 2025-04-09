const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');
const ApiError = require('../error/ApiError');

class ProductController {
    async getAll (req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const querie = Q.get_products;
            const [data] = await connection.execute(querie);
            res.status(200).json(data);
            await connection.end();
        } catch(e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, закройте приложение и попробуйте еще раз.'));
            }
            next(ApiError.notFound('Что-то пошло не так. Страница не найдена.'));
        }
    }

    async getOne (req, res, next) {
        try {
            const id = +req.params.id;
            const connection = await mysql.createConnection(CONFIG);
            const querie = Q.get_one_product;
            const [data] = await connection.execute(querie, [id]);
            res.status(200).json(data);
            await connection.end();
        } catch(e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, закройте приложение и попробуйте еще раз.'));
            }
            next(ApiError.notFound('Что-то пошло не так. Страница не найдена.'));
        }
    }

    async uploadProduct(req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const { name, price, description, proteins, fats, carbohydrates, calorie, weight } = req.body;

            const [results] = await connection.execute(Q.upload_product, [name, price, description, proteins, fats, carbohydrates, calorie, weight]);
            const productId = results.insertId;

            // Вставляем изображения в таблицу product_images
            const queryImage = 'INSERT INTO image (product_id, img_path) VALUES ?';
            const imagePaths = req.files.map(file => [productId, `/uploads/${file.filename}`]);

            await connection.query(queryImage, [imagePaths]);
            res.send('Product and images uploaded successfully!');
            connection.end();
        } catch (e) {
            console.error('error: ', e);
            next(ApiError.internal(e.message));
        }
    }
}

module.exports = new ProductController();