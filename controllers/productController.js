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
        let connection;

        try {
            connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(Q.product_get_actually);
            const transformedData = dataTransform(data);
            res.status(200).json(transformedData);
        } catch(e) {
            console.error('GetActually product error: ', e);
            return next(e.code === 'ECONNREFUSED'
                ? ApiError.internal('Сервер базы данных недоступен.')
                : ApiError.notFound('Что-то пошло не так.'));
        } finally {
            if (connection) await connection.end();
        }
    }

    async getList (req, res, next) {
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

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            connection = await mysql.createConnection(CONFIG);

            const [totalRows] = await connection.execute(`
                    SELECT 
                        COUNT(DISTINCT p.id) AS total
                    FROM 
                        product p
                    LEFT JOIN image i ON p.id = i.product_id
                    ${whereClause}
                `, values
            );

            const total = totalRows[0].total;

            const limit = parseInt(end) - parseInt(start) + 1;

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
                    product p
                LEFT OUTER JOIN
                    image i ON p.id = i.product_id
                ${whereClause}
                GROUP BY
                    p.id
                ORDER BY
                    ${field} ${order}
                LIMIT ${parseInt(start)}, ${limit};
            `;

            const [data] = await connection.execute(query, values);
            const transformedData = dataTransform(data);

            res.setHeader('Content-Range', `products ${start}-${end - 1}/${total}`);
            res.status(200).json(transformedData);
        } catch(e) {
            console.error('GetList product error:', e);
            return next(e.code === 'ECONNREFUSED'
                ? ApiError.internal('Сервер базы данных недоступен.')
                : ApiError.badRequest(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async getOne (req, res, next) {
        let connection;

        try {
            const id = +req.params.id;
            if (!id) return next(ApiError.badRequest('Missing id parameter'));

            connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(Q.product_get_one, [id]);

            res.status(200).json(dataTransform(data)[0]);
        } catch(e) {
            console.error('GetOne product error: ', e);
            return next(e.code === 'ECONNREFUSED'
                ? ApiError.internal('Сервер базы данных недоступен.')
                : ApiError.badRequest(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async create(req, res, next) {
        let connection;

        try {
            const { 
                name, 
                price, 
                actually, 
                description, 
                proteins, 
                fats, 
                carbohydrates, 
                calorie, 
                weight 
            } = req.body;

            connection = await mysql.createConnection(CONFIG);
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
        } catch (e) {
            console.error('Create product error: ', e);
            return next(ApiError.internal(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async update(req, res, next) {
        let connection;

        try {
            const { 
                id, name, price, description, proteins, fats, 
                carbohydrates, calorie, weight, actually, oldImages 
            } = req.body;

            connection = await mysql.createConnection(CONFIG);
            const [productExists] = await connection.execute('SELECT COUNT(*) AS count FROM product WHERE id = ? ', [id]);
            
            if (productExists[0].count === 0) {
                return ApiError.notFound('Product is not found');
            }

            await connection.execute(Q.product_update, [
                name, price, description, proteins, fats, carbohydrates, 
                calorie, weight, actually === 'true' ? 1 : 0, id
            ]);

            let paths = [];
            try {
                const parsed = JSON.parse(oldImages || '[]');
                paths = parsed.map((imgPath) => {
                    const url = new URL(imgPath);
                    return url.pathname;
                });
            } catch (err) {
                console.warn('Invalid oldImages JSON:', oldImages);
            }

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

            if (req.files?.length > 0) {
                const imagePaths = req.files.map(file => [id, `/uploads/${file.filename}`]);
                await connection.query(Q.product_set_img, [imagePaths]);
            }

            res.status(200).json({
                id, name, price, description, proteins, 
                fats, carbohydrates, calorie, weight, actually
            })
        } catch (e) {
            console.error('Update product error: ', e);
            return next(ApiError.internal(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async delete(req, res, next) {
        let connection;

        try {
            const id = +req.params.id;
            if (!id) return next(ApiError.badRequest('Missing id parameter'));

            connection = await mysql.createConnection(CONFIG);
            const [data] = await connection.execute(Q.product_delete, [id]);
            res.status(200).json(data);
        } catch (e) {
            console.error('Delete product error: ', e);
            return next(ApiError.internal(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }

    async deleteMany(req, res, next) {
        let connection;

        try {
            const { filter = '{}' } = req.query;
            const ids = JSON.parse(filter).id || [];
            if (!ids.length) return next(ApiError.badRequest('Нет ID для удаления.'));

            connection = await mysql.createConnection(CONFIG);
            const placeholders = ids.map(() => '?').join(', ');

            await connection.execute(`DELETE FROM product WHERE id IN (${placeholders})`, ids);
            res.status(200).json({ data: ids });
        } catch (e) {
            console.error('DeleteMany product error: ', e);
            return next(ApiError.internal(e.message));
        } finally {
            if (connection) await connection.end();
        }
    }
}

module.exports = new ProductController();