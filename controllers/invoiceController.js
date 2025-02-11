const { bot } = require('../bot');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const providerToken = process.env.PROVIDER_TOKEN;
const serverUrl = `https://${process.env.SERVER_URL}`;

const currentOpenInvoices = {};


class InvoiceController {
    async add(req, res) {
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
            console.log(`${serverUrl}/public/img/burger_small.png`)

            const invoiceLink = await bot.createInvoiceLink(
                'Данные тестовой карты:', //title
                '6390 0200 0000 000003 \nСрок действия 2024/12 CVC 123 \nКод 3-D Secure 12345678 ', //description
                invoiceId, //payload
                providerToken,
                'RUB',
                pricesData,
                {
                    need_name         : true,
                    need_phone_number : true,
                    photo_url         : `${serverUrl}/img/burger_small.png`,
                }
            );

            const slug = invoiceLink.split('/').pop().replace('$', '');

            currentOpenInvoices[slug] = {
                deliveryOption: deliveryOption,
                readyDate: readyDate,
                readyTime: readyTime,
                address: address,
            }

            res.json({ invoiceLink });
        } catch (error) {
            console.error('Ошибка при создании счета:', error);
            res.status(500).send('Ошибка при создании счета');
        }
    }

    async delete(req, res) {
        const slug   = req.body?.slug;
        const status = req.body?.status;
        const chatId = req.body?.chatId;

        try {
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

                bot.sendMessage(chatId, messageToUser);
                delete currentOpenInvoices[slug];

            } else if (status === 'failed' || status === 'cancelled') {
                delete currentOpenInvoices[slug];
            }
        } catch (e) {
            console.log(e);
            throw new Error(e);
        }

        res.sendStatus(200);
    }
}

function dateConvert(isoDate) {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы в JavaScript начинаются с 0
    const year = date.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;

    return formattedDate;
}

module.exports = new InvoiceController();