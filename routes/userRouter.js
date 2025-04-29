const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/auth', userController.auth);
router.get('/', userController.getUsers);

module.exports = router;