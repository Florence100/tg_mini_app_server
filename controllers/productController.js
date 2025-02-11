const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');

class ProductController {
    async getAll (req, res) {
        const connection = await mysql.createConnection(CONFIG);
        const querie = Q.get_products;
        const [data] = await connection.execute(querie);
        res.json(data);
        await connection.end();
    }

    async getOne (req, res) {
        const id = +req.params.id;
        const connection = await mysql.createConnection(CONFIG);
        const querie = Q.get_one_product;
        const [data] = await connection.execute(querie, [id]);
        res.json(data);
        await connection.end();
    }

    async uploadProduct(req, res) {
        const connection = await mysql.createConnection(CONFIG);
        const { name, price, description, proteins, fats, carbohydrates, calorie, weight } = req.body;
        console.log('req: ', req.files)

        try {
            // Вставляем продукт в таблицу product
            const queryProduct = Q.upload_product;
            const [results] = await connection.execute(queryProduct, [name, price, description, proteins, fats, carbohydrates, calorie, weight]);

            const productId = results.insertId;

            // Вставляем изображения в таблицу product_images
            const queryImage = Q.upload_img_path;
            const imagePaths = req.files.map(file => [productId, `/uploads/${file.filename}`]);

            console.log('Image paths:', imagePaths); // Добавьте это для отладки

            await connection.query(queryImage, [imagePaths]);
            res.send('Product and images uploaded successfully!');
        } catch (err) {
            console.error('Error inserting product or images:', err);
            res.status(500).send('Error uploading product or images');
        } finally {
            connection.end();
        }
    }
}

module.exports = new ProductController();