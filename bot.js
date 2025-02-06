const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const WEB_APP_URL = `https://${process.env.WEB_APP_URL}`;
const BOT_TOKEN = process.env.BOT_TOKEN;

const bot = new TelegramBot(BOT_TOKEN, {polling: true});
console.log('Bot is working');

bot.on('message', async (message) => {
    console.log('message', message);
    const chatId = message.chat.id;
    const text = message.text;

    if (text === '/start') {
        bot.sendMessage(
            chatId,
            '<b>Приступим?</b>\n\nНажми на кнопку &#10549;',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{text: 'Открыть', web_app: {url: WEB_APP_URL}}],
                    ],
                }
            }
        )
        .catch((error) => {
            console.log(error);
            throw error;
        })
    }
})

bot.on('pre_checkout_query', (query) => {
    bot.answerPreCheckoutQuery(query.id, true)
        .then(() => {
            console.log('Pre-checkout query confirmed');
        })
        .catch((error) => {
            console.error('Error confirming pre-checkout query:', error);
        });
})

module.exports = { bot };