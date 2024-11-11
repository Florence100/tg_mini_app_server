const TelegramBot = require('node-telegram-bot-api');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

//Bot
const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;
const serverUrl = process.env.SERVER_URL;
const providerToken = process.env.UKASSA_TOKEN;

const photoUrl = path.join(serverUrl, 'img', 'big_burger.png');
console.log(photoUrl)

const bot = new TelegramBot(token, { webHook: true });
bot.setWebHook(`${serverUrl}/bot${token}`);

// REDSYS оплата в BYN проходит
// UNLIMINT CURRENCY_INVALID - при использовании BYN
// BILL_LINE CURRENCY_INVALID - при использовании BYN
// SMART_GLOCAL

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        await bot.sendMessage(
            chatId, 
            '<b>Давай начнем &#127828;</b>\n\nПожалуйста, нажми на кнопку ниже, чтобы заказать свой лучший обед!',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{text: 'Открыть', web_app: {url: webAppUrl}}],
                    ],
                }
            }
        )
        .catch((error) => {
            console.log(error);
            throw error;
        })
    }

    if (msg.successful_payment) {
        console.log(msg)
        bot.sendMessage(chatId, 'Спасибо за ваш заказ!');
    }
});

// Обработчик pre-checkout
bot.on('pre_checkout_query', (query) => {
    const preCheckoutQueryId = query.id;
  
    // Подтверждаем, что бот готов принять платеж
    bot.answerPreCheckoutQuery(preCheckoutQueryId, true)
        .then(() => {
            console.log('Pre-checkout query confirmed');
        })
        .catch((error) => {
            console.error('Error confirming pre-checkout query:', error);
        });
});

//Server
const app = express();
app.use(express.json());
app.use(cors());
app.use('/img', express.static(path.join(__dirname, 'img')));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Обработчик запросов от Telegram
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.post('/create-invoice', async (req,res) => {
    console.log(req.body)
    const products = req.body.productsList;
    const sanitizedpayload = DOMPurify.sanitize(req.body.payload.comment);
    const payload = sanitizedpayload || 'castom payload';
    console.log('payload: ', payload)

    const pricesData = products.map(product => ({
        label: `${product.name} × ${product.count}`,
        amount: +(product.price * product.count * 100).toFixed(2),
    }))

    try {
        const invoiceLink = await bot.createInvoiceLink(
            'Данные тестовой карты:',
            '1111 1111 1111 1026 \nСрок действия 12/22 \nCVC 000',
            payload,
            providerToken,
            'RUB',
            pricesData,
            {
                need_name: true,
                need_phone_number: true,
                photo_url: `${serverUrl}/img/burger_small.png`,
                // photo_size: 34101,
                // photo_width: 500,
                // photo_height: 500,
                // photo_height: 200,
                // need_email: true,
                // need_shipping_address: true,
            }
        );
        res.json({ invoiceLink });
    } catch (error) {
        console.error('Ошибка при создании счета:', error);
        res.status(500).send('Ошибка при создании счета');
    }
})

const PORT = 8000;

app.listen(PORT, () => console.log('Server started on PORT ' + PORT));


