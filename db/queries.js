module.exports = {
    get_products: `
        SELECT
            p.id,
            p.name,
            p.price,
            i.img_path AS img
        FROM
            product AS p
        LEFT OUTER JOIN
            image AS i
        ON
            p.id = i.product_id
        WHERE
            p.actually = 1
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
            i.img_path AS img
        FROM
            product AS p
        LEFT OUTER JOIN
            image AS i
        ON
            p.id = i.product_id
        WHERE
            p.id = ?
    `,

    upload_product: `
        INSERT INTO product
        (
            name,
            price,
            description,
            proteins,
            fats,
            carbohydrates,
            calorie,
            weight
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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

    // basket_create: `
    //     INSERT INTO basket
    //         (user_id)
    //     VALUES(?)
    // `,

    // basket_find: `
    //     SELECT
    //         id
    //     FROM
    //         basket
    //     WHERE
    //         user_id = ?
    //     limit 1
    // `,

    // basket_clear: `
    //     DELETE FROM
    //         basket_product
    //     WHERE
    //         basket_id = ?
    // `,

    // basket_product_add: `
    //     INSERT INTO basket_product
    //     (
    //         basket_id,
    //         product_id,
    //         count
    //     )
    //     VALUES(?, ?, ?)
    // `,

    // basket_product_remove: `
    //     DELETE FROM
    //         basket_product
    //     WHERE
    //         basket_id = ?
    //     AND
    //         product_id = ?
    // `,

    // basket_product_incr: `
    //     UPDATE
    //         basket_product
    //     SET
    //         count = count + 1
    //     WHERE
    //         basket_id = ?
    //     AND
    //         product_id = ?
    // `,

    // basket_product_decr: `
    //     UPDATE
    //         basket_product
    //     SET
    //         count = count - 1
    //     WHERE
    //         basket_id = ?
    //     AND
    //         product_id = ?
    // `,

    // basket_product_get: `
    //     SELECT 
    //         bp.product_id AS id, 
    //         bp.count, 
    //         p.name, 
    //         p.price, 
    //         i.img_path AS img
    //     FROM 
    //         basket_product AS bp 
    //     LEFT OUTER JOIN 
    //         product AS p 
    //     ON 
    //         p.id = bp.product_id 
    //     LEFT OUTER JOIN 
    //         image AS i 
    //     ON 
    //         i.product_id = p.id 
    //     WHERE 
    //         bp.basket_id = ?
    //     AND 
    //         p.actually = 1
    // `,

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