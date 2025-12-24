# 🚀 Запуск приложения в сети

## ⚡ Быстрый старт (Вариант с Node.js - РЕКОМЕНДУЕТСЯ)

### Терминал 1: Фронтенд
```bash
npm run dev
```
Откроется на `http://localhost:3000`

### Терминал 2: Бэкенд  
```bash
node server.js
```
Запустится на `http://localhost:3001`

### Терминал 3: Telegram бот
```bash
node bot.js
```

### Терминал 4: ngrok туннели (Node.js скрипт)
```bash
npm run start:ngrok
```

**ГОТОВО!** URL будет выведена в консоль, скопируйте её друзьям.

---

## 🌐 Альтернатива: Запуск через ngrok CLI

Если хотите использовать ngrok CLI напрямую (уже установлен):

### PowerShell:
```powershell
.\start-ngrok-cli.ps1
```

### Батник (двойной клик):
```
start-ngrok-cli.bat
```

### Или вручную:
```bash
$env:Path += ";C:\ngrok"
ngrok http 3000
```

---

## 📋 Сравнение методов

| Метод | Команда | Плюсы | Минусы |
|-------|---------|-------|--------|
| **Node.js** | `npm run start:ngrok` | Встроено, два туннеля, автомат .env | Зависит от @ngrok/ngrok |
| **CLI** | `start-ngrok-cli.bat` | Официальная ngrok, стабильность | Нужно установить, один туннель |
| **Вручную** | `ngrok http 3000` | Максимум контроля | Нужно все вводить |

---

## 🔑 Установка ngrok CLI (если еще не установлен)

### Windows - Автоматическая установка (PowerShell):

```powershell
# 1. Создаем папку
$ngrokPath = "C:\ngrok"
New-Item -ItemType Directory -Path $ngrokPath -Force | Out-Null

# 2. Скачиваем ngrok
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$url = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
Invoke-WebRequest -Uri $url -OutFile "$ngrokPath\ngrok.zip"

# 3. Распаковываем
Expand-Archive -Path "$ngrokPath\ngrok.zip" -DestinationPath $ngrokPath -Force
Remove-Item "$ngrokPath\ngrok.zip"

# 4. Добавляем в PATH (постоянно)
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*C:\ngrok*") {
    [Environment]::SetEnvironmentVariable("Path", $currentPath + ";C:\ngrok", "User")
}

# 5. Настраиваем authtoken
$env:Path += ";C:\ngrok"
ngrok config add-authtoken 2tIu5ZIRACPqWgbwFi2cQqDhrzP_6PJdKYwYvzwVJ6QicYSLt
```

### Или скачайте вручную:
1. https://ngrok.com/download
2. Распакуйте в `C:\ngrok`
3. Откройте новый терминал
4. Команда `ngrok` должна работать

---

## 🌍 Какой метод выбрать?

### ✅ Выбирайте Node.js если:
- Хотите простоты
- Нужны два туннеля (3000 + 3001)
- Не хотите устанавливать ngrok CLI

### ✅ Выбирайте CLI если:
- Хотите максимум контроля
- Уже установлен ngrok
- Нужны продвинутые опции

---

## 📱 Как другие присоединяются

1. **Вы даете им URL:**
   ```
   https://random-string.ngrok-free.dev
   ```

2. **Они открывают в браузере** (любое устройство, в интернете)

3. **WebSocket подключится** автоматически

4. **Играют вместе!**

---

## 🔧 Конфиги

### .env переменные (автоматически обновляются):
```env
VITE_APP_URL=https://random-string.ngrok-free.dev
VITE_API_URL=https://random-string.ngrok-free.dev
VITE_WS_URL=wss://random-string.ngrok-free.dev
```

### ngrok конфиг файл:
```
~/.ngrok/ngrok.yml
```

---

## 🚨 Проблемы и решения

| Проблема | Решение |
|----------|---------|
| `ngrok not found` | Установите ngrok CLI или используйте `npm run start:ngrok` |
| WebSocket error | Перезагрузите страницу, проверьте что оба туннеля запущены |
| Port 3000/3001 занят | `taskkill /F /IM node.exe` убейте старые процессы |
| Custom domain не работает | Нужен PRO аккаунт ngrok + зарезервировать domain |

---

## 📖 Дополнительно

- [NETWORK_SETUP.md](NETWORK_SETUP.md) - детальный анализ архитектуры
- [NGROK_SETUP.md](NGROK_SETUP.md) - подробно про ngrok
- [QUICK_START.md](QUICK_START.md) - быстрые инструкции

---

**Готово!** 🎮 Начните с `npm run dev` в одном терминале и `npm run start:ngrok` в другом.
