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

router.post('/', upload.array('images', 5), productController.create);
router.get('/actually', productController.getActually);
router.get('/:id', productController.getOne);
router.get('/', productController.getList);
router.put('/:id', upload.array('images', 5), productController.update);
router.delete('/:id', productController.delete);
router.delete('/', productController.deleteMany);

module.exports = router;