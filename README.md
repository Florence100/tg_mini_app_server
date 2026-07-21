# Telegram Mini App Server

The backend component of a full-stack Telegram Mini App.  
The server is built with Node.js, using Express and MySQL.  
It provides a REST API, Telegram Bot integration, and order management.

---

## Project Description

The server-side component processes client application requests, manages the database, handles payments, and interacts with the Telegram Bot API. 

---

## Technology stack

- Node.js  
- Express.js  
- MySQL  
- Node Telegram Bot API     

---

## Core functionality

- CRUD operations for orders, products, and users  
- REST API for the client-side (React)  
- Telegram Bot API (command processing, data transmission)    
- Logging and error handling

---

## Environment setup

Example `.env` file:

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

## How to run a project

```bash
# Clone the repository
git clone https://github.com/Florence100/tg_mini_app_server
cd tg_mini_app_server
```

# Install dependencies
npm install

# Create a .env file and fill in the data (see above).

# Run the project
npm run start
