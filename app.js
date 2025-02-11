const express = require('express');
const cors = require('cors');
const path = require('path');
const router = require('./routes/index');
require('dotenv').config();

const PORT = process.env.PORT;
const WEB_APP_URL = `https://${process.env.WEB_APP_URL}`;

const app = express();

app.use(express.json());

app.use(cors({
    origin: WEB_APP_URL,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/', router);

app.listen(PORT, () => console.log('Server started on PORT ' + PORT));

