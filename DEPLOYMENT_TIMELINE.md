# 🎯 ХРОНОМЕТРАЖ: Точно как развертывать на Hetzner

## ⏱️ ПОЛНОЕ ВРЕМЯ: ~45 минут

---

## ЭТАП 1: ПОДГОТОВКА (15 минут)

### 1️⃣ Создать сервер на Hetzner (5 мин)
```
Зайти на https://console.hetzner.cloud
├─ Create Server
├─ Image: Ubuntu 22.04
├─ Type: CPX11 ($5.49/month)
├─ Location: Frankfurt (или рядом)
├─ Storage: 40GB (default)
└─ Create Server
⏳ ждать 2-3 минуты
📝 Записать: IP адрес (например 192.0.2.1)
```

### 2️⃣ Настроить домен (5 мин)
```
Зайти у регистратора домена (Namecheap, GoDaddy и т.д.)
├─ DNS Management
├─ Добавить A record:
│  ├─ Name: @ или вашего домена
│  ├─ Type: A
│  └─ Value: 192.0.2.1 (IP Hetzner)
└─ Save
⏳ DNS обновляется 5-30 минут
```

### 3️⃣ Создать Telegram бота (3 мин)
```
В Telegram:
├─ Написать @BotFather
├─ Команда: /newbot
├─ Введите имя: "Cave of Greed"
├─ Введите username: "cave_of_greed_bot"
└─ Получить токен
📝 Записать: API Token (123456:ABC-DEF...)
```

### 4️⃣ Подготовить локальные файлы (2 мин)
```powershell
# На локальной машине в PowerShell

# Открыть и отредактировать .env.hetzner
notepad d:\cave-game\.env.hetzner
# Заменить:
# - your-domain.com → ваш реальный домен
# - TELEGRAM_BOT_TOKEN → ваш реальный токен

# Открыть и отредактировать deploy.sh
notepad d:\cave-game\deploy.sh
# Заменить:
# - REPO_URL на ваш GitHub репозиторий
# - DOMAIN на ваш реальный домен

# Закоммитить и push
cd d:\cave-game
git add .
git commit -m "Add Hetzner deployment configuration"
git push origin main
```

---

## ЭТАП 2: РАЗВЕРТЫВАНИЕ (10 минут)

### 1️⃣ SSH подключение (1 мин)
```powershell
# На локальной машине в PowerShell
ssh root@192.0.2.1
# Введите пароль (был отправлен в email)

# Если SSH не работает, могут потребоваться 2-3 минуты после создания сервера
```

### 2️⃣ Копирование файлов (2 мин)
```powershell
# На локальной машине в PowerShell

$IP = "192.0.2.1"
$FILES = "deploy.sh", ".env.hetzner", "ecosystem.config.js", "nginx.conf", "security-setup.sh"

foreach ($file in $FILES) {
    scp "d:\cave-game\$file" "root@$($IP):/tmp/"
}
```

### 3️⃣ Запуск развертывания (7 мин)
```bash
# На сервере (в SSH сессии)

cd /tmp
chmod +x deploy.sh
bash deploy.sh

# ⏳ Ждите 7 минут пока скрипт выполняется
# Вы увидите прогресс с зелёными ✓ галочками

# В конце будет:
# ✨ Deployment complete!
```

---

## ЭТАП 3: ФИНАЛИЗАЦИЯ (5 минут)

### 1️⃣ Обновить переменные окружения (2 мин)
```bash
# На сервере

nano /home/cave-game/.env

# Отредактировать и убедиться что всё правильно:
# TELEGRAM_BOT_TOKEN=ваш_реальный_токен
# VITE_API_URL=https://your-domain.com
# VITE_APP_URL=https://your-domain.com
# WS_URL=wss://your-domain.com

# Сохранить: Ctrl+O → Enter → Ctrl+X
```

### 2️⃣ Перезапустить приложение (1 мин)
```bash
# На сервере

pm2 restart ecosystem.config.js
sleep 3
pm2 status

# Должно быть:
# ┌────────────────────┬─────┬──────┐
# │ App Name           │ PID │ stat │
# ├────────────────────┼─────┼──────┤
# │ cave-game-api      │ xxx │ online
# │ cave-game-frontend │ xxx │ online
# └────────────────────┴─────┴──────┘
```

### 3️⃣ Проверить в браузере (1 мин)
```
Открыть в браузере:
https://your-domain.com

Должны увидеть:
✓ Загрузилась игра
✓ Видна сетка и карточки
✓ Нет ошибок в консоли
```

### 4️⃣ Проверить Telegram (1 мин)
```
В Telegram:
├─ Найти своего бота: @cave_of_greed_bot
├─ Отправить /start
├─ Нажать кнопку "🎮 Play Game"
├─ Должна открыться ваша игра в webview
└─ Попробовать играть
```

---

## ЭТАП 4: SECURITY SETUP (5 минут) [ОПЦИОНАЛЬНО]

```bash
# На сервере

bash security-setup.sh

# Это настроит:
# ✅ Автоматические системные обновления (2 AM)
# ✅ Автоматическое обновление приложения (3 AM воскресенье)
# ✅ Ежедневные резервные копии (4 AM)
# ✅ Защиту от атак (Fail2ban)
# ✅ SSH безопасность

# ⏳ Время: 2-3 минуты
```

---

## ИТОГО: ✅ ГОТОВО!

Ваша игра работает на production сервере!

**Где приглашать игроков:**
```
Telegram: @cave_of_greed_bot
Веб: https://your-domain.com
```

**Ежедневные команды:**
```bash
pm2 status              # Проверить статус
pm2 logs                # Посмотреть логи
bash check-status.sh    # Проверить здоровье
pm2 restart ecosystem.config.js  # Перезапустить
```

**Для обновления кода:**
```bash
git push origin main    # На локальной машине
# Автоматически обновится на сервере

# ИЛИ вручную:
bash update.sh          # На сервере
```

---

## ⚠️ ЕСЛИ ЧТО-ТО ПОШЛО НЕ ТАК

### Домен не работает
```bash
# На сервере проверить IP
curl -I http://localhost

# На локальной машине проверить DNS
nslookup your-domain.com
# Должен вернуть 192.0.2.1
# Если нет - подождите 15-30 минут
```

### Приложение не запускается
```bash
# На сервере проверить логи
pm2 logs

# Перезагрузить .env и перезапустить
nano /home/cave-game/.env
pm2 restart ecosystem.config.js
```

### WebSocket не работает
```bash
# На сервере проверить логи API
pm2 logs cave-game-api

# Проверить Nginx
nginx -t
systemctl restart nginx
```

---

## 📚 ДОКУМЕНТАЦИЯ

Для более подробной информации:

- **Полный гайд**: [DEPLOYMENT_STEP_BY_STEP.md](DEPLOYMENT_STEP_BY_STEP.md)
- **Справочник команд**: [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md)
- **Проблемы и решения**: [DEPLOYMENT_HETZNER.md](DEPLOYMENT_HETZNER.md#решение-проблем)
- **Архитектура**: [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md)

---

## 🎯 ПРАКТИЧЕСКИЙ ПРИМЕР

```
Время: 10:00 AM
Начало: создание сервера

10:05 - ✓ Сервер создан, IP: 192.0.2.1
10:10 - ✓ Домен настроен (A record)
10:12 - ✓ Telegram бот создан
10:15 - ✓ Файлы отредактированы
10:20 - ✓ SSH подключение
10:22 - ✓ Файлы скопированы
10:25 - ✓ deploy.sh запущен
10:32 - ✓ deploy.sh завершён
10:34 - ✓ .env обновлён
10:35 - ✓ Приложение перезапущено
10:36 - ✓ Веб работает
10:37 - ✓ Telegram работает

ИТОГО: ~37 минут от начала до полного запуска

10:45 - ✓ Security setup завершён (опционально)
```

---

## 💰 СТОИМОСТЬ

```
Hetzner CPX11:      $5.49/месяц
Домен (.com):       ~$10/год  = $0.83/месяц
SSL сертификат:     БЕСПЛАТНО (Let's Encrypt)
─────────────────────────────────
ИТОГО:              ~$6.32/месяц
```

**Это дешевле чем кофе! ☕**

---

## ✨ ВЫ УСПЕШНО РАЗВЕРНУЛИ!

Теперь можете:
1. ✅ Пригласить друзей через Telegram бота
2. ✅ Следить за логами (pm2 logs)
3. ✅ Обновлять приложение (git push)
4. ✅ Спать спокойно (резервные копии + автообновления)

---

## 🚀 ДАЛЬНИЕ ШАГИ (на будущее)

Если популярно растет:
- Увеличить сервер до CPX21 (2x ресурсы)
- Добавить базу данных (PostgreSQL)
- Добавить Redis для кеширования
- Добавить CDN (Cloudflare)
- Добавить мониторинг (DataDog, New Relic)

Но сейчас вам этого не нужно! 😄

---

**Готовы? Поехали! 🚀**

Начните с этапа 1 и следуйте инструкциям.

**Если все идет по плану - через 45 минут ваша игра будет на production!**

Успехов! 🎉
