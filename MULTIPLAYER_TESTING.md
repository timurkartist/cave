# 🚀 Запуск Multiplayer Игры

## Быстрый старт (локально)

### Terminal 1: Сервер API + WebSocket
```bash
cd d:\cave-game
npm run dev:server
```

Вывод должен быть:
```
✅ Server started on port 3001
🔗 WebSocket available at ws://localhost:3001
```

### Terminal 2: Frontend
```bash
cd d:\cave-game
npm run dev
```

Вывод должен быть:
```
  VITE v6.2.0  ready in 442 ms

  ➜  Local:   http://localhost:3000/
```

### Terminal 3: Telegram Bot (опционально)
```bash
cd d:\cave-game
npm run dev:bot
```

### Открыть в браузерах

**Браузер 1 (Игрок 1):**
```
http://localhost:3000/
```

**Браузер 2 (Игрок 2):** (используй InPrivate/Private для разных cookies)
```
http://localhost:3000/
```

---

## Тестовый сценарий

### 1. Создание лобби
- [ ] Браузер 1: видишь случайный room код (например `room-a1b2c3`)
- [ ] Браузер 1: видишь свой userId (например `user-1702-abc123`)

### 2. Подключение второго игрока
- [ ] Браузер 2: **В консоли DevTools**:
  ```javascript
  // Скопируй roomCode из Browser 1
  roomCode = 'room-a1b2c3'
  ```
- [ ] Браузер 2 должен автоматически подключиться к той же комнате

### 3. Выбор персонажей
- [ ] Браузер 1: нажми на разные эмоджи (выбери одного)
- [ ] Браузер 1: видишь свой эмоджи выбранным (янтарный фон)
- [ ] Браузер 2: видишь эмоджи Браузера 1 (в реальном времени)
- [ ] Браузер 2: выбери другого эмоджи
- [ ] Браузер 1: видишь эмоджи Браузера 2 (в реальном времени)

### 4. Запуск игры
- [ ] Браузер 1: видишь кнопку "Begin Descent" (активна, когда 2+ игроков выбрали персонажей)
- [ ] Браузер 1: нажми "Begin Descent"
- [ ] **Браузер 1 ДО**: видишь LOBBY с эмоджи
- [ ] **Браузер 1 ПОСЛЕ**: видишь EXPEDITION с пустой шахтой
- [ ] **Браузер 2 ДО**: видишь LOBBY
- [ ] **Браузер 2 ПОСЛЕ**: видишь EXPEDITION (автоматически!)

### 5. Синхронизация копания (ГЛАВНАЯ ПРОВЕРКА)
- [ ] Браузер 1: нажми на одну из 4 ячеек в первом ряду
- [ ] Браузер 1: видишь карту (либо 💎 либо 🐍)
- [ ] **Браузер 2: видишь ТУ ЖЕ карту** ← ГЛАВНОЕ!
- [ ] Браузер 1 и 2: видите одинаковые очки

### 6. Фаза решений
- [ ] Браузер 1 нажимает копать еще
- [ ] Браузер 2 видит эту же новую карту
- [ ] Когда открыли карту, оба видят кнопки "Stay In ⛏️" и "Go Back ⛺"
- [ ] Браузер 1: выбирает "Stay In"
- [ ] Браузер 2: видит что Браузер 1 выбрал (зелёная галочка ✓)
- [ ] Браузер 2: выбирает "Go Back"
- [ ] Оба видят результат: Браузер 2 выходит с очками, Браузер 1 остаётся

### 7. Следующий раунд
- [ ] После всех решений - видим кнопку "Deeper into Shaft 2"
- [ ] Нажимаем
- [ ] Оба переходят в раунд 2
- [ ] Прогресс бар показывает раунд 2

### 8. Конец игры
- [ ] После 5-го раунда видим экран GAME_OVER
- [ ] Таблица лидеров с очками
- [ ] Оба видят одинаковую таблицу

---

## Console Logs для отладки

### Server logs
```
[WS] New connection, total clients: 1
[room-a1b2c3] Player_123 joined, total: 1
[room-a1b2c3] Player_456 joined, total: 2
[room-a1b2c3] Player_123 selected 🐱
[room-a1b2c3] Game started with deck of 30 cards
[room-a1b2c3] Player_123 dug at (0, 0): TREASURE
[room-a1b2c3] Player_456 decided to stay
[room-a1b2c3] Player_123 decided to leave
[room-a1b2c3] Decisions processed. Leavers: 1
[room-a1b2c3] Moving to round 2
```

### Client logs (DevTools Console)
```
🔗 WebSocket URL: ws://localhost:3001
✅ WebSocket connected
📨 WebSocket message received: { type: 'room_state', ... }
💎 Card revealed from server: { card: {...}, hazardMatch: false, ... }
✅ Decisions processed from server: { decisions: {...}, ... }
🔄 Round updated: { round: 2, ... }
```

---

## Проблемы и решения

### ❌ Браузер 2 не видит изменений
- [ ] Проверь что roomCode одинаковый в обоих браузерах
- [ ] Проверь консоль сервера - `[WS] New connection`?
- [ ] Проверь консоль браузера - нет ошибок?

### ❌ Две разные карты видны
- [ ] **Это БАГ!** Карта должна быть ОДНА
- [ ] Проверь что сервер отправляет `card_revealed` с одной и той же картой
- [ ] Проверь `activePlayers` в карте - правильно ли передаётся?

### ❌ Очки не совпадают
- [ ] Проверь что оба игрока видят одинаковую карту
- [ ] Проверь расчёт: value / 2 = share для каждого
- [ ] Если один выходит - остаток идёт ему

### ❌ Один игрок видит другой раунд
- [ ] **Это БАГ!** Раунд должен быть СИНХРОНИЗИРОВАН
- [ ] Проверь что сервер отправляет `round_updated` обоим
- [ ] Проверь что клиент получает это событие

---

## Production (ngrok + Telegram)

Когда локальное тестирование пройдёт, можно запустить через ngrok:

### Terminal 4: ngrok
```bash
npm run start:ngrok
```

Будет что-то вроде:
```
Ngrok running at: https://keep-it-all.com
Updated TELEGRAM_APP_URL in .env
```

Тогда откройся в браузере:
```
https://keep-it-all.com/
```

И у тебя будет реальная онлайн игра для двух и больше игроков!

---

## Дебаг режим

Если что-то не работает, включи лог на сервере:

**server.js (добавь в processDigAction):**
```javascript
console.log('DEBUG processDigAction:', {
  cardType: card.type,
  hazardMatch,
  roundFailed,
  cardsRemaining: room.deck.length,
  activeHazards: room.activeHazards
});
```

**App.tsx (добавь в useEffect):**
```typescript
console.log('DEBUG card revealed:', {
  cardType: cardData.card.type,
  hazardMatch: cardData.hazardMatch,
  activePlayers: cardData.activePlayers,
  playerCount: players.length
});
```

---

✨ Готово к тестированию!
