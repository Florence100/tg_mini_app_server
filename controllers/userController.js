const { authMiddleware, showInitDataMiddleware } = require('../middleware/authMiddleware');

class UserController {
    async auth(req, res, next) {
        showInitDataMiddleware(req, res, next);
    }
}

module.exports = new UserController();