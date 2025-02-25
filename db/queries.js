module.exports = {
    get_products: `
        SELECT
            p.id,
            p.name,
            p.price,
            i.img_path
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
            *
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
            actually,
            price,
            description,
            proteins,
            fats,
            carbohydrates,
            calorie,
            weight
        ) 
        VALUES 
        (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        )
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
        VALUES
        (
            ?,
            ?,
            ?,
            ?,
            ?
        )
    `,

    assign_role: `
        INSERT INTO user_role
        (
            user_id,
            role_id
        ) 
        VALUES
            (?, ?)
    `,

    select_role: `
        SELECT
            id
        FROM
            role
        WHERE
            role_name = ?
    `,

    basket_create: `
        INSERT INTO basket
            (user_id)
        VALUES
            (?)
    `,

    basket_find: `
        SELECT
            id
        FROM
            basket
        WHERE
            user_id = ?
        limit 1
    `,

    basket_clear: `
        DELETE FROM
            basket_product
        WHERE
            basket_id = ?
    `,

    basket_product_add: `
        INSERT INTO basket_product
        (
            basket_id,
            product_id,
            count
        )
        VALUES
        (
            ?,
            ?,
            ?
        )
    `,

    basket_product_remove: `
        DELETE FROM
            basket_product
        WHERE
            basket_id = ?
        AND
            product_id = ?
    `,

    basket_product_incr: `
        UPDATE
            basket_product
        SET
            count = count + 1
        WHERE
            basket_id = ?
        AND
            product_id = ?
    `,

    basket_product_decr: `
        UPDATE
            basket_product
        SET
            count = count - 1
        WHERE
            basket_id = ?
        AND
            product_id = ?
    `,

    basket_product_get: `
        SELECT 
            bp.product_id AS id, 
            bp.count, 
            p.name, 
            p.price, 
            i.img_path AS img
        FROM 
            basket_product AS bp 
        LEFT OUTER JOIN 
            product AS p 
        ON 
            p.id = bp.product_id 
        LEFT OUTER JOIN 
            image AS i 
        ON 
            i.product_id = p.id 
        WHERE 
            bp.basket_id = ?
    `
}