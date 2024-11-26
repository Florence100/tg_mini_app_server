const TelegramBot = require('node-telegram-bot-api');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();


const botToken      = process.env.BOT_TOKEN;
const webAppUrl     = process.env.WEB_APP_URL;
const serverUrl     = process.env.SERVER_URL;
const providerToken = process.env.SBERBANK_TOKEN;

const bot = new TelegramBot(botToken, { webHook: true });
bot.setWebHook(`${serverUrl}/bot${botToken}`)
    .then(() => console.log('Webhook установлен!'));

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

let clients = [];

// Обработчик запросов от Telegram
app.post(`/bot${botToken}`, (req, res) => {
    const update = req.body;
    bot.processUpdate(update);

    const message = update?.message;

    if (message) {
        const chatId = message.chat.id;
        const text = message.text;

        if (text === '/start') {
            bot.sendMessage(
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

        if (message.successful_payment) {
            console.log('successful_payment:', message.successful_payment);
            bot.sendMessage(chatId, 'Спасибо за ваш заказ!');

            // Отправка события успешной оплаты всем подключенным клиентам
            clients.forEach(client => {
                client.res.write(`event: paymentSuccess\n`);
                client.res.write(`data: ${JSON.stringify({ chatId })}\n\n`);
            });
        }
    }

    if (update.pre_checkout_query) {
        bot.answerPreCheckoutQuery(update.pre_checkout_query.id, true)
            .then(() => {
                console.log('Pre-checkout query confirmed');
            })
            .catch((error) => {
                console.error('Error confirming pre-checkout query:', error);
            });
    }

    res.sendStatus(200);
});


app.post('/create-invoice', async (req,res) => {
    const window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);

    const paymentPayload = req.body?.paymentPayload;
    const products       = paymentPayload.productsList;
    const deliveryOption = paymentPayload.deliveryOption;
    const deliveryCost   = paymentPayload.deliveryCost;
    const readyDate      = paymentPayload.readyDate;
    const readyTime      = paymentPayload.readyTime;
    const comment        = DOMPurify.sanitize(paymentPayload?.comment) || '';
    // const callbackUrl    = req.body?.callbackUrl;

    const pricesData = products.map(product => ({
        label  : `${product.name} × ${product.count}`,
        amount : +(product.price * product.count * 100).toFixed(2),
    }))

    if (deliveryOption === 'delivery') {
        pricesData.push(
            { 
                label : 'Доставка курьером', 
                amount: deliveryCost === 0 ? 'Бесплатно' : +(deliveryCost * 100).toFixed(2)
            }
        );
    }

    try {
        const invoiceLink = await bot.createInvoiceLink(
            'Данные тестовой карты:',
            '1111 1111 1111 1026 \nСрок действия 12/22 \nCVC 000',
            'custom payload',
            providerToken,
            'RUB',
            pricesData,
            {
                need_name             : true,
                need_phone_number     : true,
                photo_url             : `${serverUrl}/img/burger_small.png`,
                // need_shipping_address : deliveryOption === 'delivery',
                // is_flexible           : deliveryOption === 'delivery',
            }
        );
        res.json({ invoiceLink });
    } catch (error) {
        console.error('Ошибка при создании счета:', error);
        res.status(500).send('Ошибка при создании счета');
    }
})


app.get('/sse-endpoint', (req, res) => {
    console.log('SSE установлен');
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);
    console.log(clients)

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
    });
});


const PORT = 8000;

app.listen(PORT, () => console.log('Server started on PORT ' + PORT));


