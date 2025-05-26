module.exports = {
    // product
    product_get_actually: `
        SELECT
            p.id,
            p.name,
            p.price,
            GROUP_CONCAT(i.img_path SEPARATOR ';') AS images
        FROM
            product AS p
        LEFT OUTER JOIN
            image AS i
        ON
            p.id = i.product_id
        WHERE
            p.actually = 1
        GROUP BY p.id
    `,

    product_get_one: `
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
            image AS i
        ON
            p.id = i.product_id
        WHERE
            p.id = ?
        GROUP BY p.id
    `,

    product_create: `
        INSERT INTO product
        (
            name,
            price,
            actually,
            description,
            proteins,
            fats,
            carbohydrates,
            calorie,
            weight
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    product_update: `
        UPDATE
            product
        SET
            name = ?,
            price = ?,
            description = ?,
            proteins = ?,
            fats = ?,
            carbohydrates = ?,
            calorie = ?,
            weight = ?,
            actually = ?
        WHERE
            id = ?
    `,

    product_delete: `
        DELETE FROM 
            product 
        WHERE 
            product.id = ?
    `,

    product_set_img: `
        INSERT INTO 
            image (product_id, img_path) 
        VALUES 
            ?
    `,

    // user
    user_find: `
        SELECT
            id
        FROM
            user
        WHERE
            id = ?
    `,

    user_create: `
        INSERT INTO user
        (
            id,
            first_name,
            user_name,
            last_name,
            photo_url
        )
        VALUES (?, ?, ?, ?, ?)
    `,

    user_get_roles: `
        SELECT
            r.role_name as name
        FROM
            user_role as ur
        LEFT OUTER JOIN
            role as r
        ON
            r.id = ur.role_id
        WHERE 
            user_id = ?
    `,

    // order
    order_get_one: `
        SELECT 
            o.id, 
            o.user_id, 
            o.status, 
            o.created_at, 
            o.delivery, 
            o.delivery_cost, 
            o.ready_date, 
            o.ready_time, 
            o.address, 
            o.comment, 
            i.total_amount,
            i.order_id,
            CONCAT('[', GROUP_CONCAT(
                CONCAT(
                    '{ "product_id": "', op.product_id, '", ',
                    '"name": "', op.name, '", ',
                    '"count": "', op.count, '", ',
                    '"price": "', op.price, '" }'
                )
            ), ']') AS products_info 
        FROM 
            orders o 
        LEFT JOIN order_product op ON o.id = op.order_id
        LEFT JOIN user u ON o.user_id = u.id 
        LEFT JOIN invoice i ON i.order_id = op.order_id
        WHERE o.id = ? 
        GROUP BY o.id; 
    `,

    order_create: `
        INSERT INTO orders (
            user_id,
            delivery,
            delivery_cost,
            ready_date,
            ready_time,
            address,
            comment
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,

    order_delete: `
        DELETE FROM orders
        WHERE id = ?
    `,

    order_update_status: `
        UPDATE
            orders
        SET
            status = ?
        WHERE
            id = ?
    `,

    order_update: `
        UPDATE
            orders
        SET
            status = ?,
            ready_date = ?,
            ready_time = ?,
            address = ?,
            comment = ?
        WHERE
            id = ?
    `,

    order_create_product: `
        INSERT INTO order_product (
            order_id,
            product_id,
            name,
            price,
            count
        )
        VALUES ?
    `,

    order_get_info: `
        SELECT
            o.delivery AS deliveryOption,
            o.delivery_cost AS deliveryCost,
            o.ready_date AS readyDate,
            o.ready_time AS readyTime,
            o.address,
            o.comment
        FROM
            orders AS o
        WHERE
            o.id = ?
    `,

    order_get_products: `
        SELECT
            op.count,
            p.name,
            p.price
        FROM
            orders AS o
        LEFT OUTER JOIN 
            order_product AS op
        ON 
            o.id = op.order_id
        LEFT OUTER JOIN 
            product AS p 
        ON 
            p.id = op.product_id
        WHERE 
            o.id = ?
    `,

    // invoice
    invoice_create: `
        INSERT INTO invoice (
            id,
            order_id,
            slug,
            total_amount,
            status
        ) 
        VALUES (?, ?, ?, ?, ?)
    `,

    invoice_update_status: `
        UPDATE
            invoice
        SET
            status = ?
        WHERE
            slug = ?
    `,
}