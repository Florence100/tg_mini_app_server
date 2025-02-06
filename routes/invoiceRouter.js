const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.post('/delete', invoiceController.delete);
router.post('/add', invoiceController.add);

module.exports = router;