const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    res.send('Сервер работает!');
});

module.exports = router;