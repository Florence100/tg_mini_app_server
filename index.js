const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;

// ngrok http --url=https://modern-mutt-native.ngrok-free.app 3000

const bot = new TelegramBot(token, {polling: true});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if(text === '/start') {
        await bot.sendMessage(
            chatId, 
            '<b>Давай начнем </b><tg-emoji emoji-id="5368324170671202286">👍</tg-emoji>\n\nПожалуйста, нажми на кнопку ниже, чтобы заказать свой лучший обед!',
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
            console.log(error)
            // throw error;
        })
    }
});
