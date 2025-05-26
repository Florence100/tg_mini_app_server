const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');


const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/send', upload.single('document'), documentController.send);

module.exports = router;