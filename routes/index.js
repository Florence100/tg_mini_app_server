const Router = require('express');
const router = new Router();
const productRouter = require('./productRouter');
const invoiceRouter = require('./invoiceRouter');
const userRouter = require('./userRouter');
const basketRouter = require('./basketRouter');
const orderRouter = require('./orderRouter');

router.use('/products', productRouter);
router.use('/invoice', invoiceRouter);
router.use('/user', userRouter);
router.use('/basket', basketRouter);
router.use('/order', orderRouter);

module.exports = router;