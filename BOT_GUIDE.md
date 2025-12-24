# 🤖 Telegram Bot Integration Guide

## Что это?

Теперь можно создавать игровые сессии прямо из Telegram чата!

```
/newgame → создается игровая сессия
         → кнопка "Join Game"
         → каждый игрок присоединяется
         → начинается онлайн игра
```

---

## 🚀 Как запустить

### 1. Создать Telegram Bot (если еще не создал)

Как создать бота подробно описано в [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#создать-telegram-bot-в-botfather)

TL;DR:
```
→ Telegram: @BotFather
→ /newbot
→ Дать имя: "Cave of Greed Bot"
→ Выбрать username: cave_of_greed_bot
→ Скопировать токен
→ Вставить в .env: TELEGRAM_BOT_TOKEN=...
```

### 2. Установить зависимости

```bash
npm install
```

Добавлены:
- `node-telegram-bot-api` - Telegram bot SDK
- `axios` - HTTP client для API запросов

### 3. Запустить все вместе

```bash
# Запускает фронт + бэк + бот одновременно
npm run dev:all
```

Или отдельно:
```bash
npm run dev          # Frontend на 3003
npm run dev:server   # Backend на 3001  
npm run dev:bot      # Bot polling
```

---

## 📱 Использование в Telegram

### Команды бота

| Команда | Описание |
|---------|---------|
| `/start` | Показать приветствие и кнопку "Play Solo" |
| `/newgame` | Создать новую игровую сессию для группы |
| `/help` | Показать справку |

### Сценарий игры

```
1. Юзер: /newgame
   ↓
2. Бот создает игровую сессию на backend
   ↓
3. Бот отправляет кнопку "Join Game" со ссылкой
   ↓
4. Каждый игрок нажимает кнопку
   ↓
5. Приложение открывается в Telegram WebView
   ↓
6. Игроки видят друг друга в лобби
   ↓
7. Когда >= 2 игроков → "Begin Descent"
   ↓
8. Начинается онлайн игра! 🎮
```

---

## 🔗 URL структура

Когда бот создает игру, отправляет ссылку:

```
https://your-app.vercel.app?gameId=ABC123&userId=987654321
```

Frontend парсит параметры:
- `gameId` - ID игровой сессии
- `userId` - ID пользователя из Telegram

---

## 🛠️ Backend структура

### Новый эндпоинт

```
POST /api/bot/create-game
Body: {
  createdBy: 123456789,      // Telegram User ID
  chatId: -987654321,        // Telegram Chat ID
  creatorName: "John"        // User's first name
}

Response: {
  gameId: "ABC123",
  game: { ... }
}
```

### Существующие эндпоинты

```
POST /api/games/join           - Присоединиться к игре
GET  /api/games/:gameId        - Получить состояние игры
POST /api/games/:gameId/action - Совершить действие в игре
```

---

## 💾 Хранилище данных

Сейчас все игры хранятся в памяти (в Map):
```javascript
const games = new Map();  // gameId → game state
```

**Для продакшена нужна БД!** (PostgreSQL, MongoDB)

---

## 🔄 Flow синхронизации

```
Telegram Chat
    ↓
Bot (/newgame)
    ↓
Backend (POST /api/bot/create-game)
    ↓
Games Map (хранилище)
    ↓
Бот отправляет кнопку с gameId
    ↓
Игроки нажимают → открывается WebApp с ?gameId=...
    ↓
Frontend (API Service)
    ↓
Backend (GET /api/games/gameId)
    ↓
Получает состояние игры → синхронизирует в React
    ↓
🎮 Игра начинается!
```

---

## 📊 Текущие ограничения

| Что | Сейчас | Нужно |
|-----|--------|-------|
| Хранилище | Memory | PostgreSQL |
| Real-time | Polling | WebSocket |
| Масштабируемость | 1 сервер | Load Balancer |
| Persistent | ❌ | ✅ |

---

## 🚀 Дальнейшие улучшения

1. **WebSocket** - для real-time синхронизации вместо polling
2. **PostgreSQL** - сохранение игр в БД
3. **Redis** - кэширование и очереди
4. **Admin Panel** - управление ботом из админ-интерфейса
5. **In-game Notifications** - уведомления через Telegram
6. **Leaderboard** - рейтинг игроков в Telegram

---

## 🆘 Troubleshooting

### Бот не отвечает

```
Проверить:
✅ BOT_TOKEN установлен в .env
✅ npm run dev:bot запущен
✅ Бот добавлен в чат
✅ Backend доступен (http://localhost:3001)
```

### Web App не открывается

```
Проверить:
✅ URL в allowedHosts (vite.config.ts)
✅ VITE_APP_URL правильный
✅ Frontend запущен
✅ Это HTTPS (для продакшена)
```

### Игроки не видят друг друга

```
Это нормально! Нужно добавить WebSocket:
→ Следующий шаг: real-time синхронизация через Socket.io
```

---

## 📝 Пример использования

```bash
# 1. Запустить все
npm run dev:all

# 2. В Telegram боте (например, в тестовом чате с собой)
/newgame

# 3. Нажать кнопку "Join Game"
# → Откроется приложение в WebView

# 4. Выбрать персонажа и начать игру!
```

---

## 📚 Документация

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Полный гайд deployment
- [HOW_TO_RUN.md](./HOW_TO_RUN.md) - Как запустить локально
- [START_HERE.md](./START_HERE.md) - Начни здесь!

---

**Готово! Бот работает! 🤖🎮**
