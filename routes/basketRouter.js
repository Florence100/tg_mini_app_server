const express = require('express');
const basketController = require('../controllers/basketController');

const router = express.Router();

router.get('/getBasket', basketController.getBasket);
router.delete('/clear', basketController.clearBasket);
router.post('/add', basketController.addProduct);
router.delete('/remove', basketController.removeProduct);
router.put('/incr', basketController.incrProduct);
router.put('/decr', basketController.decrProduct);

module.exports = router;