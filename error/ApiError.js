class ApiError extends Error {
    constructor(status, message) {
        super();
        this.status = status;
        this.message = message;
    }

    // ошибка клиента (например, неправильный синтаксис, формат или маршрутизация запроса)
    static badRequest(message) {
        return new ApiError(400, message);
    }

    // Клиент не авторизован
    static unauthorized(message) {
        return new ApiError(401, message);
    }

    // Клиент авторизован, но не имеет достаточных прав
    static forbidden(message) {
        return new ApiError(403, message);
    }

    // Сервер не может найти запрошенный ресурс
    static notFound(message) {
        return new ApiError(404, message);
    }

    // На сервере произошла ошибка, в результате которой он не может успешно обработать запрос
    static internal(message) {
        return new ApiError(500, message);
    }

    // Сервер не готов обработать запрос в данный момент (техническое обслуживание или перегрузка сервера)
    static unavailable(message) {
        return new ApiError(503, message);
    }
}

module.exports = ApiError;