const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.post('/create', orderController.create);

module.exports = router;