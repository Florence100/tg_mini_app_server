const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.post('/create', orderController.create);
router.get('/many', orderController.getMany);
router.get('/:id', orderController.getOne);
router.get('/', orderController.getList);
router.put('/:id', orderController.update);
router.delete('/:id', orderController.delete);
router.delete('/', orderController.deleteMany);

module.exports = router;