const express = require('express');
const cors = require('cors');
const path = require('path');
const router = require('./routes/index');
const { errorHandlingMiddleware } = require('./middleware/errorHandlingMiddleware');
const { authMiddleware } = require('./middleware/authMiddleware');
const ApiError = require('./error/ApiError');
require('dotenv').config();

const PORT = process.env.PORT;
const WEB_APP_URL = `https://${process.env.WEB_APP_URL}`;

const app = express();

app.use(cors({
    origin: WEB_APP_URL,
    methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range']
}));
app.options('*', cors());

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '30d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 дней
    }
}));
app.use(authMiddleware);
app.use('/', router);

app.use((req, res, next) => {
    next(ApiError.notFound('Страница не найдена.'));
});

app.use(errorHandlingMiddleware);

app.listen(PORT, () => console.log('Server started on PORT ' + PORT));
