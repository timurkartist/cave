# 🎮 Multiplayer Synchronization Implementation

## ✅ Completed Phases

### ФАЗА 1: Синхронизация копания (Dig Synchronization)

**Проблема:** Каждый игрок видел свою версию сокровищ/опасностей

**Решение:**
1. **Server (server.js)**
   - ✅ Добавлена единая колода `initializeDeckForRoom()` для каждой комнаты
   - ✅ Функция `processDigAction()` обрабатывает копание детерминированно
   - ✅ Обработчик `player_action` с типом `dig` обрабатывает действие копания
   - ✅ Событие `card_revealed` отправляется ВСЕ игрокам с одной и той же картой

2. **Frontend (App.tsx)**
   - ✅ `handleDig()` теперь отправляет действие на сервер вместо локального обновления
   - ✅ Слушаем событие `card_revealed` в useEffect
   - ✅ Обновляем очки всех активных игроков на основе данных с сервера

3. **WebSocket Hook (useGameWebSocket.ts)**
   - ✅ Обработчик события `card_revealed` заполняет `lastCardRevealed` в roomState

**Результат:** Все игроки видят одинаковую карту когда копают

---

### ФАЗА 2: Синхронизация решений (Decision Phase Sync)

**Проблема:** Решения (stay/leave) обрабатывались локально, другие игроки не видели результаты

**Решение:**
1. **Server (server.js)**
   - ✅ Хранение решений в `room.pendingDecisions`
   - ✅ Обработчик `player_action` с типом `submit_decision`
   - ✅ Когда все решения собраны - отправляем всем `decisions_processed` событие

2. **Frontend (App.tsx)**
   - ✅ `submitDecision()` отправляет решение на сервер через `sendPlayerAction()`
   - ✅ Слушаем событие `decisionsResult` и применяем решения всем игрокам одновременно

3. **WebSocket Hook (useGameWebSocket.ts)**
   - ✅ Обработчик события `decisions_processed` заполняет `decisionsResult`

**Результат:** Все игроки видят решения всех остальных и результаты синхронизированы

---

### ФАЗА 3: Синхронизация раундов (Round Synchronization)

**Проблема:** Разные клиенты могли быть в разных раундах

**Решение:**
1. **Server (server.js)**
   - ✅ Обработчик `player_action` с типом `next_round`
   - ✅ Сервер инициализирует новую колоду для каждого раунда
   - ✅ Отправляет `round_updated` событие всем игрокам

2. **Frontend (App.tsx)**
   - ✅ `nextRound()` отправляет действие на сервер
   - ✅ Слушаем событие `roundInfo` и обновляем локальный раунд

3. **WebSocket Hook (useGameWebSocket.ts)**
   - ✅ Обработчик события `round_updated` заполняет `roundInfo`

**Результат:** Все игроки переходят в новый раунд синхронизированно

---

## 📊 Архитектура потока данных

```
PLAYER 1                    SERVER                    PLAYER 2
   ↓ (нажал на ячейку)       ↓                          ↓
   dig(x,y) ─────────────→ processDigAction() ─────→ card_revealed
                                   ↓
                           broadcastToRoom()
                                   ↓
            ← card_revealed ─────────────→ card_revealed
            
   видит 💎              видит 💎              видит 💎
   (одна и та же)        (одна и та же)        (одна и та же)
```

## 🔧 Ключевые компоненты

### Server-side structures

```javascript
// Состояние комнаты
wsRooms.set(roomId, {
  roomId,
  gameState: 'waiting' | 'playing',
  createdBy: userId,
  createdAt: new Date(),
  
  // Игровое состояние
  deck: GameCard[],           // Единая колода для комнаты
  round: number,               // Текущий раунд
  revealedCards: GameCard[],   // Откопанные карты
  activeHazards: HazardType[], // Активные опасности
  roundFailed: boolean,        // Провалился ли раунд
  pendingDecisions: {},        // { userId: 'stay'|'leave'|null }
  playerScores: {}             // { userId: score }
});
```

### Events

**card_revealed**
```json
{
  "type": "card_revealed",
  "payload": {
    "card": {...},
    "hazardMatch": boolean,
    "roundFailed": boolean,
    "cardsRemaining": number,
    "activeHazards": [...],
    "activePlayers": [userId1, userId2, ...]
  }
}
```

**decisions_processed**
```json
{
  "type": "decisions_processed",
  "payload": {
    "decisions": { userId: 'stay'|'leave' },
    "leavers": [userId1, ...],
    "timestamp": number
  }
}
```

**round_updated**
```json
{
  "type": "round_updated",
  "payload": {
    "round": number,
    "deckRemaining": number
  }
}
```

---

## ⚙️ Изменённые файлы

### server.js
- ✅ Добавлены импорты CardType, HazardType из types.ts
- ✅ Добавлена функция `initializeDeckForRoom()`
- ✅ Добавлена функция `processDigAction()`
- ✅ Расширена инициализация wsRooms с игровым состоянием
- ✅ Обновлён обработчик `start_game` для инициализации колоды
- ✅ Добавлена обработка `player_action` с типами: dig, submit_decision, next_round

### App.tsx
- ✅ Изменён `handleDig()` - отправляет действие на сервер
- ✅ Изменён `submitDecision()` - отправляет решение на сервер
- ✅ Изменён `nextRound()` - отправляет действие на сервер
- ✅ Добавлена обработка `lastCardRevealed` в useEffect
- ✅ Добавлена обработка `decisionsResult` в useEffect
- ✅ Добавлена обработка `roundInfo` в useEffect
- ✅ Исправлен расчёт очков с использованием `activePlayers` от сервера

### hooks/useGameWebSocket.ts
- ✅ Добавлена обработка события `card_revealed`
- ✅ Добавлена обработка события `decisions_processed`
- ✅ Добавлена обработка события `round_updated`

---

## 🚀 Как это работает (пошагово)

### Сценарий: Два игрока копают на одного сокровища

1. **Игрок 1 нажал на ячейку (1, 2)**
   - Frontend отправляет: `{ type: 'player_action', action: 'dig', data: {x:1, y:2} }`

2. **Server обрабатывает действие**
   - Берёт карту из единой колоды
   - Проверяет на опасность
   - Отправляет `card_revealed` ВСЕ игрокам с одной и той же картой

3. **Оба игрока получают одинаковую карту**
   - Видят: 💎 Treasure: 50
   - Очки распределяются: 50 / 2 = 25 каждому

4. **Ни один игрок не может получить другую карту**
   - Карта уже взята из колоды
   - Все видят одинаковый результат

---

## ✨ Преимущества новой архитектуры

1. **Детерминированность**: Все игроки видят одинаковые карты
2. **Справедливость**: Очки распределяются правильно
3. **Синхронизация**: Все действия синхронизированы через сервер
4. **Безопасность**: Клиент не может подделать действие (сервер валидирует)
5. **Масштабируемость**: Может быть 10 игроков в комнате

---

## 📝 Что ещё нужно (опционально)

1. **Сохранение финальных очков на сервере**
   - Сейчас очки хранятся только на клиенте
   
2. **История действий**
   - Логирование всех копаний и решений

3. **Переподключение**
   - Восстановление состояния при отключении

4. **Сброс раунда при ошибке**
   - Если сервер или клиент падёт

5. **AI игроки**
   - Использование `GameLogicService.getAIDecision()` для ботов

---

## 🧪 Тестирование

### Для локального тестирования:
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:server

# Browser 1
http://localhost:3000

# Browser 2
http://localhost:3000
```

### Проверить:
1. ✅ Два игрока создают одну комнату
2. ✅ Видят друг друга в лобби
3. ✅ Выбирают разные персонажи
4. ✅ Один начинает игру
5. ✅ Оба переходят в EXPEDITION
6. ✅ Первый копает карту
7. ✅ Оба видят одинаковую карту
8. ✅ Оба видят одинаковые очки
9. ✅ Оба выбирают stay/leave
10. ✅ Результаты синхронизированы
11. ✅ Переход на следующий раунд синхронизирован

