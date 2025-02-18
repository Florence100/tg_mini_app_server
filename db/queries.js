module.exports = {
    get_products: 'SELECT p.id, p.name, p.price, i.img_path FROM `product` AS p LEFT OUTER JOIN `image` AS i ON p.id=i.product_id WHERE p.actually = 1',
    get_one_product: 'SELECT * FROM `product` AS p LEFT OUTER JOIN `image` AS i ON p.id=i.product_id WHERE p.id=?',
    upload_product: 'INSERT INTO product (name, actually, price, description, proteins, fats, carbohydrates, calorie, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
}