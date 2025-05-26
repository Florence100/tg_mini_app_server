const Router = require('express');
const router = new Router();
const productRouter = require('./productRouter');
const invoiceRouter = require('./invoiceRouter');
const userRouter = require('./userRouter');
const orderRouter = require('./orderRouter');
const documentRouter = require('./documentRouter');

router.use('/products', productRouter);
router.use('/invoice', invoiceRouter);
router.use('/user', userRouter);
router.use('/order', orderRouter);
router.use('/document', documentRouter);

module.exports = router;