const mysql = require('mysql2/promise');
const CONFIG = require('../db/config');
const Q = require('../db/queries');
const ApiError = require('../error/ApiError');


function dataTransform(data) {
    return data.map((product) => ({
        ...product,
        actually: product.actually === 1,
        images: product.images 
            ? product.images.split(';').map((path) => ({ src: path, title: product.name })) 
            : []
    }))
}

class ProductController {
    async getActually (req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const querie = Q.product_get_actually;
            const [data] = await connection.execute(querie);
            const transformedData = dataTransform(data);
            res.status(200).json(transformedData);
            await connection.end();
        } catch(e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, закройте приложение и попробуйте еще раз.'));
            }
            next(ApiError.notFound('Что-то пошло не так. Страница не найдена.'));
        }
    }

    async getList (req, res, next) {
        try {
            const { range } = req.query;
            const [start, end] = JSON.parse(range);

            const { sort } = req.query;
            const [field, order] = JSON.parse(sort);

            const { filter } = req.query;
            const whereConditions = [];
            const values = [];

            if (filter) {
                const filterObj = JSON.parse(filter);
                for (const [key, value] of Object.entries(filterObj)) {
                    if (key === 'q') {
                        const likeValue = `%${value}%`;
                        whereConditions.push(`(
                            p.id = ? OR
                            p.name LIKE ?
                        )`);
                        values.push(value, likeValue);
                    } else if (key === 'actually') {
                        whereConditions.push(`p.actually = ?`);
                        values.push(value);
                    } else {
                        whereConditions.push(`p.${key} LIKE ?`);
                        values.push(`%${value}%`);
                    }
                }
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            const connection = await mysql.createConnection(CONFIG);

            const [totalRows] = await connection.execute(
                `
                    SELECT 
                        COUNT(DISTINCT p.id) AS total
                    FROM 
                        product AS p
                    LEFT JOIN 
                        image AS i ON p.id = i.product_id
                    ${whereClause}
                `,
                values
            );

            const total = totalRows[0].total || 0;

            const query = `
                SELECT
                    p.id,
                    p.name,
                    p.price,
                    p.description,
                    p.weight,
                    p.proteins,
                    p.fats,
                    p.carbohydrates,
                    p.calorie,
                    GROUP_CONCAT(i.img_path SEPARATOR ';') AS images,
                    p.actually AS actually
                FROM
                    product AS p
                LEFT OUTER JOIN
                    image AS i ON p.id = i.product_id
                ${whereClause}
                GROUP BY
                    p.id
                ORDER BY
                    ${field} ${order}
                LIMIT ?, ?;
            `;

            values.push(parseInt(start), parseInt(end) - parseInt(start) + 1);
            
            const [data] = await connection.execute(query, values);
            const transformedData = dataTransform(data);

            res.setHeader('Content-Range', `products ${start}-${end - 1}/${total}`);
            res.status(200).json(transformedData);
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
            const querie = Q.product_get_one;
            const [data] = await connection.execute(querie, [id]);
            const transformedData = dataTransform(data)[0];

            res.status(200).json(transformedData);
            await connection.end();
        } catch(e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, закройте приложение и попробуйте еще раз.'));
            }
            next(ApiError.notFound('Что-то пошло не так. Страница не найдена.'));
        }
    }

    async create(req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const { name, price, actually, description, proteins, fats, carbohydrates, calorie, weight } = req.body;

            const [results] = await connection.execute(Q.product_create, [
                name, 
                price, 
                actually === 'true' ? 1 : 0,
                description ? description : null, 
                proteins ? proteins : null, 
                fats ? fats : null, 
                carbohydrates ? carbohydrates : null, 
                calorie ? calorie : null, 
                weight ? weight : null
            ]);
            
            const id = results.insertId;

            const imagePaths = req.files?.map(file => [id, `/uploads/${file.filename}`]);
            if (imagePaths.length > 0) {
                await connection.query(Q.product_set_img, [imagePaths]);
            }

            res.status(200).json({
                id, name, price, description, proteins, fats, carbohydrates, calorie, weight, actually
            })
            connection.end();
        } catch (e) {
            console.error('error: ', e);
            next(ApiError.internal(e.message));
        }
    }

    async update(req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const { id, name, price, description, proteins, fats, carbohydrates, calorie, weight, actually, oldImages } = req.body;

            const [productExists] = await connection.execute('SELECT COUNT(*) AS count FROM product WHERE id = ? ', [id]);
            if (productExists[0].count === 0) {
                return ApiError.notFound('Product is not found');
            }

            await connection.execute(Q.product_update, [
                name, price, description, proteins, fats, carbohydrates, calorie, weight, actually === 'true' ? 1 : 0, id
            ]);

            const paths = JSON.parse(oldImages).map((imgPath) => {
                const url = new URL(imgPath);
                return url.pathname;
            })

            // Удаление лишних изображений
            if (paths.length > 0) {
                const placeholders = paths.map(() => '?').join(', ');
                await connection.execute(
                    `DELETE FROM image WHERE product_id = ? AND img_path NOT IN (${placeholders})`,
                    [id, ...paths]
                );
            } else {
                await connection.execute(
                    `DELETE FROM image WHERE product_id = ?`,
                    [id]
                );
            }

            if (req.files && req.files.length > 0) {
                const imagePaths = req.files.map(file => [id, `/uploads/${file.filename}`]);
                await connection.query(Q.product_set_img, [imagePaths]);
            }

            res.status(200).json({
                id, name, price, description, proteins, fats, carbohydrates, calorie, weight, actually
            })
            await connection.end();
        } catch (e) {
            console.error('error: ', e);
            next(ApiError.internal(e.message));
        }
    }

    async delete(req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const id = +req.params.id;
            const [data] = await connection.execute(Q.product_delete, [id]);

            res.status(200).json(data);
            await connection.end();
        } catch (e) {
            console.error('error: ', e);
            next(ApiError.internal(e.message));
        }
    }

    async deleteMany(req, res, next) {
        try {
            const connection = await mysql.createConnection(CONFIG);
            const { filter } = req.query;
            const ids = JSON.parse(filter).id;
            const querie = `DELETE FROM product WHERE id IN (${ids.join(',')})`;
            const [data] = await connection.execute(querie);
            res.status(200).json({ data: ids });
            await connection.end();
        } catch (e) {
            console.error('error: ', e);
            next(ApiError.internal(e.message));
        }
    }
}

module.exports = new ProductController();