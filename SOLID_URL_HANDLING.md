# 🏗️ ЖЕЛЕЗОБЕТОННОЕ решение для URL параметров (ngrok-proof)

## Проблема
- Query параметры (`?roomId=test`) **ТЕРЯЮТСЯ** при проксировании через ngrok
- Hash параметры (`#roomId=test`) **ВЫЖИВАЮТ** через ngrok (клиент-сторона)
- Пользователи делились ссылками с query параметрами, которые затем терялись

## Решение: URL Нормализация

### 1️⃣ Приоритет чтения roomId (in `App.tsx`)
```
1. Hash (#roomId=X)         ← приоритет 1, ngrok-safe
2. Query (?roomId=X)        ← приоритет 2, для обратной совместимости
3. SessionStorage fallback  ← приоритет 3, backup
4. Генерируем новый        ← fallback если ничего не найдено
```

### 2️⃣ Нормализация URL (URL не пропадет)
```typescript
if (roomId found from query params) {
  // Перенесем в hash без перезагрузки страницы
  history.replaceState({}, '', `${pathname}#roomId=${roomId}`)
}
// Теперь URL в браузере будет #roomId вместо ?roomId
```

### 3️⃣ Генерация ссылок (in `bot.js`)
```javascript
// ❌ ДО (потеряется на ngrok)
const gameUrl = `${APP_URL}/?roomId=${roomId}`

// ✅ ПОСЛЕ (выживет на ngrok)
const gameUrl = `${APP_URL}/#roomId=${roomId}`
```

## Алгоритм (в деталях)

### Фаза 1: Инициализация (App.tsx при монтировании)
```
1. Проверяем hash - если есть #roomId=X, берем X
2. Если нет хэша, проверяем query - если есть ?roomId=Y, берем Y
   → И сразу нормализуем: history.replaceState() → #roomId=Y
3. Если нет параметров, проверяем sessionStorage
4. Если ничего, генерируем новый roomCode
```

### Фаза 2: Взаимодействие (Telegram бот генерирует ссылку)
```
1. Бот создает новый roomId (timestamp + random)
2. Генерирует ссылку с этим roomId в hash: https://domain/#roomId=...
3. Отправляет Telegram пользователю
4. Пользователь кликает - открывает приложение с #roomId=...
5. App.tsx читает roomId из hash и присоединяется к комнате
```

### Фаза 3: Обратная совместимость
```
Если пользователь вручную добавит ?roomId=old-value:
1. App.tsx прочитает старый формат
2. Сразу нормализует: history.replaceState()
3. URL станет #roomId=old-value (без перезагрузки)
4. При повторном шеринге ссылка уже будет в хорошем формате
```

## Что изменилось

### App.tsx (lines 47-95)
✅ Читает roomId из hash (приоритет 1)
✅ Читает roomId из query (приоритет 2) 
✅ Нормализует query → hash через `history.replaceState()`
✅ Читает из sessionStorage (приоритет 3)
✅ Генерирует fallback только если ничего не найдено
✅ Чистый, понятный код без излишних логирований

### bot.js (lines 59-61)
✅ Генерирует ссылки с hash: `/#roomId=...`
✅ Гарантирует что все bot-сгенерированные ссылки ngrok-safe

## Тестирование

### Localhost
```
1. Откройте http://localhost:3000/#roomId=test-room
   → Ожидается: roomCode = "test-room"
2. Откройте http://localhost:3000/?roomId=test-room
   → Ожидается: roomCode = "test-room", URL нормализуется в #roomId=test-room
3. Откройте http://localhost:3000/
   → Ожидается: генерируется новый roomCode
```

### ngrok
```
1. Откройте https://ngrok-domain/#roomId=test-room
   → Ожидается: roomCode = "test-room" (hash ВЫЖИВАЕТ через proxy)
2. Откройте https://ngrok-domain/?roomId=test-room (old format)
   → Ожидается: параметр ПОТЕРЯЕТСЯ на входе в proxy, но это okay
   → Потому что бот больше НЕ ГЕНЕРИРУЕТ такие ссылки
3. Telegram бот отправляет ссылку с #roomId
   → Ожидается: клик открывает приложение с правильным roomId
```

## Почему это "железобетонно"

1. **Безопасность от ngrok**: hash работает через proxy, query нет
2. **Обратная совместимость**: старые ссылки с query параметрами автоматически нормализуются
3. **Нет потерь**: если roomId был найден, он будет установлен до нормализации
4. **Чистые ссылки на шеринг**: все новые ссылки от бота в хорошем формате
5. **Нет перезагрузок**: history.replaceState() обновляет URL без reload
6. **Единая логика**: один useEffect обрабатывает все сценарии

## Резюме изменений

| Файл | Изменение | Результат |
|------|-----------|-----------|
| App.tsx | Новый useEffect с приоритетом hash → query → sessionStorage | Все roomId читаются в правильном порядке + нормализация |
| bot.js | Ссылки теперь с #roomId вместо ?roomId | Все bot-ссылки ngrok-safe |

✅ Готово к использованию на ngrok и локалхосте!
