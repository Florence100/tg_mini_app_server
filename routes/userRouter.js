const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/auth', userController.auth);

module.exports = router;