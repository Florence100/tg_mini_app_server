# Telegram Mini App Server

Backend часть fullstack-приложения для Telegram Mini Apps.  
Сервер реализован на Node.js с использованием Express и MySQL.  
Обеспечивает REST API, Telegram Bot-интеграцию и управление заказами.

---

## Описание проекта

Серверная часть обрабатывает запросы клиентского приложения, управляет базой данных, обрабатывает платежи и взаимодействует с Telegram Bot API.  

---

## Технологический стек

- Node.js  
- Express.js  
- MySQL  
- Node Telegram Bot API     

---

## Основной функционал

- CRUD-операции для заказов, товаров и пользователей  
- REST API для клиентской части (React)  
- Telegram Bot API (обработка команд, передача данных)    
- Логирование и обработка ошибок  

---

## Настройка окружения

Пример `.env` файла:

```bash
BOT_TOKEN=your_telegram_bot_token
PROVIDER_TOKEN=your_payment_provider_token
WEB_APP_URL=https://4mhfmdzg-3000.euw.devtunnels.ms
SERVER_URL=https://4mhfmdzg-8001.euw.devtunnels.ms
PORT=8001

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=telegram_app
DB_PORT=3306
```

## Как запустить проект

```bash
# Клонировать репозиторий
git clone https://github.com/Florence100/tg_mini_app_server
cd tg_mini_app_server
```

# Установить зависимости
npm install

# Создать .env и заполнить данные (см. выше)

# Запустить проект
npm run start
