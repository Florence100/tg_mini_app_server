const { validate, parse } = require('@telegram-apps/init-data-node');
const ApiError = require('../error/ApiError');

const BOT_TOKEN = process.env.BOT_TOKEN;

function setInitData(res, initData) {
    res.locals.initData = initData;
}

function getInitData(res) {
    return res.locals.initData;
}

const authMiddleware = function (req, res, next) {
    const [authType, authData = ''] = (req.header('authorization') || '').split(' ');
  
    switch (authType) {
        case 'tma':
            try {
                validate(authData, BOT_TOKEN, {
                    expiresIn: 3600,
                })
                setInitData(res, parse(authData));
                return next();
            } catch (e) {
                if (e.message.includes('Sign is invalid')) {
                    return next(ApiError.forbidden('Ошибка авторизации. Подпись недействительна. Пожалуйста, обновите страницу и попробуйте снова.'));
                }
                if (e.message.includes('\"auth_date\" parameter is missing')) {
                    return next(ApiError.forbidden('Ошибка авторизации. Пожалуйста, обновите страницу и попробуйте снова.'));
                }
                if (e.message.includes('\"auth_date\" parameter is invalid')) {
                    return next(ApiError.forbidden('Ошибка авторизации. Пожалуйста, обновите страницу и попробуйте снова.'));
                }
                if (e.message.includes('\"hash\" parameter is missing')) {
                    return next(ApiError.forbidden('Ошибка авторизации. Пожалуйста, обновите страницу и попробуйте снова.'));
                }
                if (e.message.includes('Init data has expired')) {
                    return next(ApiError.forbidden('Данные инициализации истекли. Пожалуйста, выполните вход снова.'));
                }
                return next(ApiError.forbidden(e.message));
            }
        // ... other authorization methods.
        default:
            return next(ApiError.unauthorized('Извините, но вы не авторизованы для доступа к этому ресурсу.'));
    }
};

const showInitDataMiddleware = function(_req, res, next) {
    const initData = getInitData(res);
    if (!initData) {
        return next(ApiError.forbidden('Cant display init data as long as it was not found'));
    }
    res.json(initData);
};

module.exports = { authMiddleware, showInitDataMiddleware };