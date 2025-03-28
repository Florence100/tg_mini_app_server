const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.post('/update', invoiceController.update);
router.post('/create', invoiceController.create);

module.exports = router;