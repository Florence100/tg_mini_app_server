const Router = require('express');
const router = new Router();
const productRouter = require('./productRouter');
const invoiceRouter = require('./invoiceRouter');

router.use('/product', productRouter);
router.use('/invoice', invoiceRouter);

module.exports = router;