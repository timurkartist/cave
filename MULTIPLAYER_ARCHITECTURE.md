# 🎮 Cave of Greed - Multiplayer Architecture

## 📋 Обзор

Это полнофункциональная онлайн-игра для нескольких игроков с поддержкой Telegram.

**Ключевое отличие от других игр:**
- ✅ Все игроки подключаются к **ОДНОМУ лоббию** (не каждый создаёт своё)
- ✅ WebSocket синхронизация в реальном времени
- ✅ Детерминированная игровая логика на сервере
- ✅ Telegram интеграция для распределения ссылок

---

## 🏗️ Архитектура

### Поток подключения

```
Telegram Chat
    ↓
User нажимает /newgame
    ↓
Бот генерирует УНИКАЛЬНЫЙ roomId
    ↓
Бот отправляет URL с roomId:
https://app.com/?roomId=room-xyz&chatId=123
    ↓
ВСЕ игроки в чате нажимают на кнопку
    ↓
ВСЕ подключаются к ОДНОМУ roomId
    ↓
Играют вместе в ОДНОМ лоббию
```

### Компоненты системы

```
┌─────────────────┐
│   TELEGRAM      │ (bot.js)
│   BOT           │ - /newgame команда
│                 │ - Генерирует roomId
│                 │ - Отправляет URL
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│   FRONTEND (React + TypeScript)      │ (App.tsx)
│   - Читает roomId из URL            │
│   - Подключается к WebSocket        │
│   - Отправляет действия игрока      │
└────────┬────────────────────────────┘
         │ WebSocket
         │ ws://server:3001
         ↓
┌─────────────────────────────────────┐
│   BACKEND (Node + Express)          │ (server.js)
│   - WebSocket сервер                │
│   - Единая колода для комнаты      │
│   - Обработка действий              │
│   - Broadcast результатов           │
│   - Mapping chatId -> roomId        │
└─────────────────────────────────────┘
```

---

## 🔑 Ключевые моменты

### 1. roomId генерируется ботом (БЕЗ случайности на клиенте!)

**bot.js:**
```javascript
// Генерируем roomId когда пользователь нажимает /newgame
const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

// Отправляем URL со ВСЕМИ параметрами
const gameUrl = `${APP_URL}/?roomId=${roomId}&chatId=${chatId}`;
```

**ЧТО БЫЛО РАНЬШЕ (НЕПРАВИЛЬНО):**
```javascript
// App.tsx генерировал roomId случайно!
const roomCodeValue = gameIdFromUrl || `room-${Math.random()...}`; // ❌ КАЖДЫЙ ИГРОК СВОЙ!
```

### 2. Frontend использует roomId из URL

**App.tsx:**
```typescript
const roomIdFromUrl = params.get('roomId'); // Из URL параметров
// ...
let roomCodeValue;
if (roomIdFromUrl) {
  roomCodeValue = roomIdFromUrl; // ✅ ОДИНАКОВЫЙ ДЛЯ ВСЕХ!
}
```

### 3. Server хранит mapping chatId -> roomId

**server.js:**
```javascript
const telegramGameSessions = new Map(); // { chatId: { roomId, creatorId, ... } }

// Бот регистрирует игру
app.post('/api/telegram/register-game', (req, res) => {
  telegramGameSessions.set(chatId.toString(), {
    roomId,
    creatorId,
    creatorName,
    createdAt: Date.now()
  });
});
```

### 4. WebSocket синхронизирует действия в реальном времени

**Поток действия "Копание":**
```
Player 1 нажимает на ячейку
    ↓
Frontend отправляет: { type: 'player_action', action: 'dig', data: {x:1, y:2} }
    ↓
Server получает действие
    ↓
Server берёт карту из ЕДИНОЙ колоды для этого roomId
    ↓
Server отправляет ОДИНАКОВУЮ карту ВСЕМ игрокам в roomId
    ↓
Player 1 и Player 2 видят ТУ ЖЕ карту!
```

---

## 📱 Telegram интеграция

### Команды бота

| Команда | Действие |
|---------|----------|
| `/start` | Показать приветствие |
| `/newgame` | Создать новую игру в чате (генерирует roomId) |
| `/help` | Показать справку |

### Как это работает

1. **Любой пользователь в чате** пишет `/newgame`
2. **Бот генерирует уникальный roomId** для этого чата
3. **Бот отправляет кнопку** со ссылкой вида:
   ```
   https://app.com/?roomId=room-1703-a1b2c&chatId=123456
   ```
4. **Любой (сколько угодно) человек из чата** нажимает кнопку
5. **Все подключаются к одному roomId** → играют вместе!

---

## 🔄 Синхронизация в игре

### ФАЗА 1: Лобби (персонажи)

```
Игрок 1 выбирает 🐱
    ↓
Frontend отправляет: select_character
    ↓
Server обновляет wsClients[userId].character = '🐱'
    ↓
Server broadcast всем в комнате: character_selected
    ↓
Игрок 2 видит что Игрок 1 выбрал 🐱
```

### ФАЗА 2: Копание (Expedition)

```
Игрок 1 нажимает копать на (1,2)
    ↓
Отправляет: player_action { action: 'dig', data: {x:1, y:2} }
    ↓
Server: processDigAction(room, userId, 1, 2)
    ├─ Берёт карту из room.deck[0]
    ├─ Проверяет на опасность
    ├─ Вычисляет очки
    └─ Возвращает { card, hazardMatch, ... }
    ↓
Server broadcast всем: card_revealed с одной и той же картой!
    ↓
Игрок 1 видит 💎50
Игрок 2 видит 💎50 (ОДИНАКОВО!)
```

### ФАЗА 3: Решения (Stay/Leave)

```
После каждой карты игроки выбирают: stay или leave
    ↓
Отправляют: player_action { action: 'submit_decision', data: { choice: 'stay' } }
    ↓
Server собирает решения: room.pendingDecisions[userId] = 'stay'
    ↓
Когда ВСЕ РЕШИЛИ → Server обрабатывает
    ├─ Вычисляет кто вышел (leave)
    ├─ Распределяет очки
    └─ Broadcast результат
    ↓
Отправляет: decisions_processed { decisions: {...}, leavers: [...] }
    ↓
Оба игрока видят результат одновременно!
```

---

## 📊 Data Flow

### Состояние комнаты на сервере

```javascript
wsRooms.set(roomId, {
  roomId: 'room-1703-a1b2c',
  gameState: 'waiting' | 'playing',
  createdBy: 'user-123',
  createdAt: Date,
  
  // Игровое состояние
  deck: GameCard[],              // Единая колода
  round: 1,                       // Текущий раунд
  revealedCards: GameCard[],     // Откопанные карты
  activeHazards: HazardType[],   // Активные опасности
  roundFailed: boolean,           // Провалился ли раунд
  pendingDecisions: {},           // { userId: 'stay'|'leave'|null }
  playerScores: {}                // { userId: totalScore }
});
```

### Клиенты в комнате

```javascript
wsClients.set(userId, {
  ws: WebSocket,      // Соединение
  roomId: 'room-...',  // В какой комнате
  userId: 'user-123',
  username: 'John',
  character: '🐱'      // Выбранный персонаж
});
```

---

## 🚀 Запуск

### Локально

```bash
# Terminal 1: Server
npm run dev:server

# Terminal 2: Frontend
npm run dev

# Terminal 3: Bot (опционально)
npm run dev:bot

# Открыть в браузере
http://localhost:3000/?roomId=room-test&chatId=123
```

### Через Telegram

1. Открой Telegram чат
2. Напиши `/newgame`
3. Получишь кнопку со ссылкой
4. Нажми кнопку → откроется игра в браузере

---

## ✅ Проверка синхронизации

Открой 2 браузера с одним и тем же roomId:

```
Browser 1: http://localhost:3000/?roomId=room-test&chatId=123
Browser 2: http://localhost:3000/?roomId=room-test&chatId=123
```

Проверь:
- [ ] Оба видят друг друга в лобби
- [ ] Выбор персонажей синхронизирован
- [ ] При копании - одна и та же карта
- [ ] Решения stay/leave синхронизированы
- [ ] Очки одинаковые
- [ ] Раунды синхронизированы

---

## 🔒 Безопасность

### Текущие гарантии

- ✅ roomId генерируется на сервере (бот)
- ✅ Игровая логика выполняется на сервере
- ✅ Клиент не может подделать действие
- ✅ Колода единая для всех (определена на сервере)

### Что можно улучшить

- ❌ Telegram initData валидация (опционально)
- ❌ HTTPS для production (ngrok уже имеет)
- ❌ Rate limiting на API endpoints

---

## 📝 Файлы проекта

| Файл | Описание |
|------|---------|
| `bot.js` | Telegram бот - генерирует roomId, отправляет ссылки |
| `server.js` | Express + WebSocket - игровой сервер |
| `App.tsx` | React компонент - UI игры |
| `useGameWebSocket.ts` | WebSocket hook - соединение с сервером |
| `types.ts` | TypeScript типы игры |
| `constants.ts` | Константы (колода, персонажи и т.д.) |
| `services/gameLogicService.ts` | Логика игры (опционально) |

---

## 🎯 Как это работает концептуально

**ГЛАВНОЕ:** Сервер - источник истины (**source of truth**)

```
    Frontend 1              Server              Frontend 2
    
    Показывает              Хранит              Показывает
    локальный UI            реальное            локальный UI
                           состояние
                               ↓
                           Вычисляет
                           результаты
                               ↓
                           Отправляет
                           результаты
                            обоим
    ←─────────────────────────┤──────────────────→
    
    Показывает          Все видят
    ОДИН РЕЗУЛЬТАТ      ОДНО СОСТОЯНИЕ
```

**Отправка действия:**
```
Player нажимает кнопку → Frontend отправляет на server
                         Server обрабатывает → Broadcast результат
                         Frontend получает → Обновляет UI
```

**Ошибка в старом коде:**
```
Player 1 нажимает      Player 2 нажимает
    ↓                      ↓
Frontend 1 обновляет   Frontend 2 обновляет
своё состояние        своё состояние
    ↓                      ↓
Разные результаты!     ❌ БАГ!
```

---

## 📈 Масштабируемость

Текущая архитектура поддерживает:
- ✅ 10 игроков в одной комнате
- ✅ Неограниченное количество комнат
- ✅ Множество одновременных игр через Telegram

Для production:
- Добавить Redis для хранения состояния комнат
- Использовать database для истории игр
- Масштабировать на несколько Node процессов

---

