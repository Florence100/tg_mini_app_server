module.exports = {
    get_actually_products: `
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

    get_one_product: `
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

    upload_product: `
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

    update_product: `
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

    delete_product: `
        DELETE FROM 
            product 
        WHERE 
            product.id = ?
    `,

    set_product_img: `
        INSERT INTO 
            image (product_id, img_path) 
        VALUES 
            ?
    `,

    find_user: `
        SELECT
            id
        FROM
            user
        WHERE
            id = ?
    `,

    create_user: `
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

    assign_role: `
        INSERT INTO user_role
        (
            user_id,
            role_id
        ) 
        VALUES(?, ?)
    `,

    select_role: `
        SELECT
            id
        FROM
            role
        WHERE
            role_name = ?
    `,

    get_user_roles: `
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

    order_status_update: `
        UPDATE
            orders
        SET
            status = ?
        WHERE
            id = ?
    `,

    order_product_create: `
        INSERT INTO order_product (
            order_id,
            product_id,
            name,
            price,
            count
        )
        VALUES ?
    `,

    order_info_get: `
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

    order_products_get: `
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

    invoice_create: `
        INSERT INTO invoice (
            order_id,
            slug,
            status
        ) 
        VALUES (?, ?, ?)
    `,

    invoice_status_update: `
        UPDATE
            invoice
        SET
            status = ?
        WHERE
            slug = ?
    `,
}