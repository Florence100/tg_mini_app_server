const { bot } = require('../bot');
const ApiError = require('../error/ApiError');


class DocumentController {
    async send(req, res, next) {
        try {
            const file = req.file;
            const userId = req.body.userId;

            if (!file || !file.buffer || !file.originalname) {
                return res.status(400).json({ error: 'Файл не был передан' });
            }

            const fileOptions = {
                filename: file.originalname,
                contentType: file.mimetype,
            };

            await bot.sendDocument(userId, file.buffer, {}, fileOptions);

            res.status(200).json({ success: true });
        } catch (e) {
            console.error('error: ', e);
            if (e.code === 'ECONNREFUSED') {
                return next(ApiError.internal('Соединение отклонено сервером. Пожалуйста, попробуйте еще раз.'));
            }
            return next(ApiError.internal('Ошибка при отправке документа в Telegram'));
        }
    }
}

module.exports = new DocumentController();