# 📦 Основные файлы проекта Cave of Greed

## 🎯 Структура проекта

```
cave-game/
├── gpt/                          # 👈 ОСНОВНЫЕ ФАЙЛЫ (скопии для изучения)
│   ├── hooks/useGameWebSocket.ts    # WebSocket подключение
│   ├── services/gameLogicService.ts # Игровая логика
│   ├── server/websocketHandlers.js  # Обработчики WebSocket
│   ├── types.ts                     # TypeScript типы
│   ├── constants.ts                 # Константы
│   └── README.md                    # Документация
│
├── src/
│   ├── App.tsx                   # Главный компонент приложения
│   ├── index.tsx                 # Точка входа
│   ├── types.ts                  # Типы данных
│   ├── constants.ts              # Константы игры
│   ├── index.html                # HTML страница
│   │
│   ├── hooks/
│   │   └── useGameWebSocket.ts   # React hook для WebSocket
│   │
│   ├── services/
│   │   └── gameLogicService.ts   # Бизнес логика игры
│   │
│   └── components/
│       └── GameRoom.tsx          # Компонент комнаты (опционально)
│
├── server.js                     # 🔴 ГЛАВНЫЙ ФАЙЛ - API сервер + WebSocket
├── bot.js                        # Telegram бот
├── start-ngrok.js                # Запуск ngrok туннеля
│
├── .env                          # Переменные окружения
├── package.json                  # Зависимости проекта
├── vite.config.ts                # Конфиг Vite (фронтенд)
├── tsconfig.json                 # Конфиг TypeScript
│
└── dist/                         # Собранный фронтенд (после npm run build)
```

## 🔴 Критически важные файлы

### **server.js** - главный сервер
- Запускается на `PORT=3001`
- Express сервер для REST API
- WebSocket сервер (встроен в Express)
- Подаёт статические файлы из `dist/`
- Все WebSocket обработчики здесь

**Запуск:** `npm run dev:server`

### **App.tsx** - главный React компонент
- Инициализация userId и roomCode
- Управление состоянием игры (LOBBY, EXPEDITION, etc.)
- Рендеринг всего UI
- Интеграция с useGameWebSocket hook

### **.env** - конфигурация
```
TELEGRAM_BOT_TOKEN=...           # Токен бота
PORT=3001                        # Порт сервера
VITE_APP_URL=...                 # URL приложения
TELEGRAM_APP_URL=...             # URL для Telegram ссылок
NGROK_AUTHTOKEN=...              # Для ngrok туннеля
```

## 🚀 Команды запуска

```bash
# Развитие локально
npm run dev:server               # Сервер (3001)
npm run dev                      # Фронтенд (3000)
npm run dev:bot                  # Telegram бот

# Сборка для production
npm run build                    # Собрать фронтенд в dist/

# Запуск через ngrok
npm run start:ngrok              # Запустить ngrok туннель

# Все вместе
npm run dev:all                  # dev + dev:server + dev:bot (старое)
```

## 🔌 WebSocket архитектура

```
1. Клиент открывает браузер
   ↓
2. App.tsx генерирует userId и roomCode
   ↓
3. useGameWebSocket подключается по WebSocket
   ↓
4. Server.js добавляет клиента в wsClients Map
   ↓
5. broadcastToRoom отправляет обновления всем в комнате
   ↓
6. Клиент получает обновления через ws.onmessage
```

## 📡 Основные WebSocket события

### Client → Server
- `join_room` - присоединиться
- `select_character` - выбрать эмоджи
- `start_game` - начать игру
- `leave_room` - выйти

### Server → Client
- `room_state` - состояние комнаты
- `character_selected` - персонаж выбран
- `game_started` - игра началась
- `player_disconnected` - игрок вышел

## 🎮 Игровые состояния

```typescript
enum GameState {
  LOBBY = 'LOBBY',                  // Выбор персонажей
  EXPEDITION = 'EXPEDITION',        // Копание карт
  DECISION_PHASE = 'DECISION_PHASE', // Решение: остаться или выйти
  ROUND_END = 'ROUND_END',          // Конец раунда
  GAME_OVER = 'GAME_OVER'           // Конец игры
}
```

## 🌐 Онлайн архитектура (ngrok)

```
Браузер локального игрока (localhost:3000)
         ↓ WebSocket
Ngrok туннель (https://your-ngrok-url.ngrok-free.dev)
         ↓ перенаправляет на
API сервер (localhost:3001)
         ↓
WebSocket Pool + Room State
         ↓ broadcast
Браузер другого игрока (https://your-ngrok-url.ngrok-free.dev)
```

## 🎯 Ключевые особенности

- ✅ Мультиплеер в реальном времени
- ✅ Автоматическое определение localhost vs ngrok
- ✅ Автоматическое переподключение WebSocket
- ✅ Максимум 10 игроков в комнате
- ✅ Первый игрок = создатель (может начать игру)
- ✅ Синхронизация состояния через WebSocket
- ✅ Telegram интеграция (через бота)

## 📝 Для разработки

Смотри файлы в папке `gpt/`:
- `gpt/README.md` - подробная документация
- `gpt/hooks/useGameWebSocket.ts` - как работает WebSocket
- `gpt/services/gameLogicService.ts` - игровая логика
- `gpt/server/websocketHandlers.js` - обработчики на сервере
- `gpt/types.ts` - все TypeScript типы
- `gpt/constants.ts` - колода, иконки, константы

## 🐛 Troubleshooting

**Чёрный экран?**
- Проверь консоль браузера (F12)
- Убедись что сервер запущен (`npm run dev:server`)
- Убедись что WebSocket подключился (смотри логи в консоли)

**WebSocket connection error?**
- Проверь что сервер работает на правильном порту (3001)
- Для ngrok - убедись что ngrok туннель активен (`npm run start:ngrok`)

**Игроки не видят друг друга?**
- Проверь что они в одной roomCode
- Смотри логи сервера: `[room-XXX] Player joined`

## 🔗 Полезные ссылки

- WebSocket Docs: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- Express: https://expressjs.com/
- React Hooks: https://react.dev/reference/react/hooks
- Vite: https://vitejs.dev/
