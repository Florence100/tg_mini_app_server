const express = require('express');
const multer = require('multer');
const path = require('path');
const productController = require('../controllers/productController');

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Папка для сохранения файлов
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname); // Получаем расширение файла
        const uniqueName = `${file.fieldname}-${Date.now()}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

router.get('/:id', productController.getOne);
router.post('/upload', upload.array('images', 10), productController.uploadProduct);
router.get('/', productController.getAll);

module.exports = router;