const Router = require('express');
const router = new Router();
const productsRouter = require('./productsRouter');
const invoiceRouter = require('./invoiceRouter');

router.use('/', productsRouter);
router.use('/invoice', invoiceRouter);

module.exports = router;