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
            res.json(data);
            await connection.end();
        } catch(e) {
            next(ApiError.internal(e.message));
        }
    }

    async getOne (req, res, next) {
        try {
            const id = +req.params.id;
            const connection = await mysql.createConnection(CONFIG);
            const querie = Q.get_one_product;
            const [data] = await connection.execute(querie, [id]);
            res.json(data);
            await connection.end();
        } catch(e) {
            next(ApiError.internal(e.message));
        }
    }

    async getBasketProducts (req, res, next) {
        try {
            
        } catch(e) {
            next(ApiError.internal(e.message));
        }
    }

    // async getProducts (req, res, next) {
    //     const productIds = req.query.productIds;

    //     if (!productIds) {
    //         return res.status(400).json({ error: 'Отсутствуют идентификаторы продуктов' });
    //     }

    //     const placeholders = productIds.map(() => '?').join(',');
    //     const query = `
    //         SELECT 
    //             product.id,
    //             product.name,
    //             product.price,
    //             image.img_path AS img
    //         FROM 
    //             product
    //         JOIN 
    //             image ON product.id = image.product_id
    //         WHERE 
    //             product.id IN (${placeholders})
    //         `;

    //     try {
    //         const connection = await mysql.createConnection(CONFIG);
    //         const [rows] = await connection.execute(query, productIds);
    //         await connection.end();
            
    //         res.json(rows);
    //     } catch (e) {
    //         next(ApiError.internal('Ошибка сервера'));
    //     }
    // }

    async uploadProduct(req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const { name, actually, price, description, proteins, fats, carbohydrates, calorie, weight } = req.body;

            const queryProduct = Q.upload_product;
            const [results] = await connection.execute(queryProduct, [name, actually, price, description, proteins, fats, carbohydrates, calorie, weight]);
            const productId = results.insertId;

            // Вставляем изображения в таблицу product_images
            const queryImage = 'INSERT INTO image (product_id, img_path) VALUES ?';
            const imagePaths = req.files.map(file => [productId, `/uploads/${file.filename}`]);

            await connection.query(queryImage, [imagePaths]);
            res.send('Product and images uploaded successfully!');
        } catch (e) {
            next(ApiError.internal(e.message));
        } finally {
            connection.end();
        }
    }
}

module.exports = new ProductController();