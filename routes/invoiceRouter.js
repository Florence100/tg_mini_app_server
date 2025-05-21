const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.get('/many', invoiceController.getMany);
router.get('/:id', invoiceController.getOne);
router.get('/', invoiceController.getList);
router.post('/update', invoiceController.update);
router.post('/create', invoiceController.create);

module.exports = router;