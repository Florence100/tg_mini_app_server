const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/auth', userController.auth);
router.get('/many',userController.getMany);
router.get('/:id', userController.getOne);
router.get('/', userController.getList);

module.exports = router;