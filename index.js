const TelegramBot = require('node-telegram-bot-api');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const botToken      = process.env.BOT_TOKEN;
const providerToken = process.env.SBERBANK_TOKEN;
const webAppUrl     = `https://${process.env.WEB_APP_URL}`;
const serverUrl     = `https://${process.env.SERVER_URL}`;

const bot = new TelegramBot(botToken, { webHook: true });
bot.setWebHook(`${serverUrl}/bot${botToken}`).then(() => console.log('Webhook установлен!'));


const app = express();

app.use(express.json());
app.use(cors({ origin: webAppUrl }));
app.use('/img', express.static(path.join(__dirname, 'img')));

app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Обработчик запросов от Telegram
app.post(`/bot${botToken}`, (req, res) => {
    const update = req.body;
    bot.processUpdate(update);

    const message = update?.message;

    if (message) {
        const chatId = message.chat.id;
        // console.log('chatId: ', chatId)
        const text = message.text;

        if (text === '/start') {
            bot.sendMessage(
                chatId, 
                '<b>Приступим?</b>\n\nНажми на кнопку &#10549;',
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

        // if (message.successful_payment) {
        //     console.log('message.successful_payment: ', message.successful_payment)
        //     const invoiceId = message.successful_payment.invoice_payload;
        //     const orderDetails = currentOpenInvoices[invoiceId];

        //     const deliveryOption = orderDetails?.deliveryOption;
        //     const readyDate = orderDetails?.readyDate;
        //     const formattedDate = dateConvert(readyDate);
        //     const readyTime = orderDetails?.readyTime;
        //     const address = orderDetails?.address;

        //     let messageToUser;

        //     if (deliveryOption === 'pickup') {
        //         messageToUser = `Оплата прошла успешно! ⬆️\n\nВаш заказ будет готов ${formattedDate} в промежуток времени ${readyTime} \nСпасибо, что выбираете нас!`;
        //     } else if (deliveryOption === 'delivery') {
        //         messageToUser = `Оплата прошла успешно! ⬆️\n\nВаш заказ будет доставлен ${formattedDate} по адресу ${address} в промежуток времени ${readyTime}  \nСпасибо, что выбираете нас!`;
        //     }

        //     bot.sendMessage(chatId, messageToUser);
        //     // delete currentOpenInvoices[invoiceId];

        //     // console.log('currentOpenInvoices after delete: ', currentOpenInvoices);
        // }
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

const currentOpenInvoices = {};

app.post('/create-invoice', async (req,res) => {
    const window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);

    const paymentPayload = req.body?.paymentPayload;
    const userId         = paymentPayload.userId;
    const products       = paymentPayload.cartItems;
    const deliveryOption = paymentPayload.deliveryOption;
    const deliveryCost   = paymentPayload.deliveryCost;
    const readyDate      = paymentPayload.readyDate;
    const readyTime      = paymentPayload.readyTime;
    const address        = DOMPurify.sanitize(paymentPayload?.address) || '';
    const comment        = DOMPurify.sanitize(paymentPayload?.comment) || '';

    const pricesData = products.map(product => ({
        label  : `${product.name} × ${product.count}`,
        amount : +(product.price * product.count * 100).toFixed(2),
    }))

    if (deliveryOption === 'delivery') {
        pricesData.push(
            { 
                label : 'Доставка курьером', 
                amount: deliveryCost === 0 ? 0 : +(deliveryCost * 100).toFixed(2)
            }
        );
    }

    try {
        const currentDate = Date.now();
        const invoiceId = `${userId}-${currentDate}`;

        const invoiceLink = await bot.createInvoiceLink(
            'Данные тестовой карты:', //title
            '6390 0200 0000 000003 \nСрок действия 2024/12 CVC 123 \nКод 3-D Secure 12345678 ', //description
            invoiceId, //payload
            providerToken,
            'RUB',
            pricesData,
            {
                need_name             : true,
                need_phone_number     : true,
                photo_url             : `${serverUrl}/img/burger_small.png`,
            }
        );

        const slug = invoiceLink.split('/').pop().replace('$', '');

        currentOpenInvoices[slug] = {
            deliveryOption: deliveryOption,
            readyDate: readyDate,
            readyTime: readyTime,
            address: address,
        }

        console.log('currentOpenInvoices: ', currentOpenInvoices);
        // console.log('invoiceLink: ', invoiceLink);

        res.json({ invoiceLink });
    } catch (error) {
        console.error('Ошибка при создании счета:', error);
        res.status(500).send('Ошибка при создании счета');
    }
})


app.post('/delete-invoice', async (req, res) => {
    const slug   = req.body?.slug;
    const status = req.body?.status;
    const chatId = req.body?.chatId;

    console.log('chatId: ', chatId)

    if (status === 'paid') {
        const orderDetails = currentOpenInvoices[slug];
        const deliveryOption = orderDetails?.deliveryOption;
        const readyDate = orderDetails?.readyDate;
        const formattedDate = dateConvert(readyDate);
        const readyTime = orderDetails?.readyTime;
        const address = orderDetails?.address;

        let messageToUser;

        if (deliveryOption === 'pickup') {
            messageToUser = `Оплата прошла успешно! ⬆️\n\nВаш заказ будет готов ${formattedDate} в промежуток времени ${readyTime} \nСпасибо, что выбираете нас!`;
        } else if (deliveryOption === 'delivery') {
            messageToUser = `Оплата прошла успешно! ⬆️\n\nВаш заказ будет доставлен ${formattedDate} по адресу ${address} в промежуток времени ${readyTime}  \nСпасибо, что выбираете нас!`;
        }

        console.log(messageToUser)

        bot.sendMessage(chatId, messageToUser);

        delete currentOpenInvoices[slug];
        console.log('currentOpenInvoices after delete: ', currentOpenInvoices);
    } else if (status === 'failed' || status === 'cancelled') {
        delete currentOpenInvoices[slug];
        console.log('currentOpenInvoices after delete: ', currentOpenInvoices);
    }

    res.sendStatus(200);
})

function dateConvert(isoDate) {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы в JavaScript начинаются с 0
    const year = date.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;

    return formattedDate;
}

const PORT = 8000;

app.listen(PORT, () => console.log('Server started on PORT ' + PORT));


