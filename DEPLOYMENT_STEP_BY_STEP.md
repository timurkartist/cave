# 📋 Пошаговая инструкция по развертыванию на Hetzner

## Шаг 1️⃣: Подготовка локально

### 1.1 Получить Hetzner сервер

1. Зарегистрируйтесь на [Hetzner Cloud](https://console.hetzner.cloud)
2. Создайте новый сервер:
   - **Image**: Ubuntu 22.04
   - **Type**: CPX11 (2 CPU, 2 GB RAM) - достаточно для старта
   - **Location**: Выберите ближайший регион
   - **Storage**: 40 GB (по умолчанию)

3. Получите IP адрес сервера (например: `192.0.2.1`)

### 1.2 Настроить доменное имя

1. Зайдите в настройки домена (где вы его купили)
2. Отредактируйте DNS записи:
   - **A record**: Укажите IP вашего Hetzner сервера

Примеры для популярных регистраторов:
- Namecheap: Advanced DNS → Add A record
- GoDaddy: DNS Management → Add record (A)
- Cloudflare: DNS → Add record (A)

```
Type    Name    Value           TTL
A       @       192.0.2.1       Automatic
```

⏳ DNS может обновиться 5-30 минут

### 1.3 Подготовить токен Telegram бота

1. Откройте чат с [@BotFather](https://t.me/botfather)
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте **API Token** (выглядит как: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
5. Запомните **Bot Username** (например: `@cave_of_greed_bot`)

### 1.4 Подготовить файлы на локальной машине

```bash
# Откройте PowerShell в папке проекта
cd d:\cave-game

# Отредактируйте .env.hetzner
# Замените:
# - TELEGRAM_BOT_TOKEN на ваш реальный токен
# - your-domain.com на ваше доменное имя

# Отредактируйте deploy.sh
# Замените:
# - your-username в REPO_URL на ваше имя пользователя GitHub
# - your-domain.com в переменной DOMAIN

# Убедитесь, что папка проекта в Git репозитории
git status
git config user.name "Your Name"
git config user.email "your@email.com"
git add .
git commit -m "Add Hetzner deployment configuration"
git push origin main
```

## Шаг 2️⃣: Первоначальное подключение к серверу

### 2.1 Подключиться через SSH

```powershell
# В PowerShell
ssh root@192.0.2.1

# Если первый раз, введите "yes" когда спросит about host authenticity
# Пароль был отправлен в почту при создании сервера
```

### 2.2 Создать SSH ключ (для безопасности)

```bash
# На сервере
ssh-keygen -t ed25519 -f ~/.ssh/hetzner_key -N ""

# Добавить публичный ключ в authorized_keys
cat ~/.ssh/hetzner_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Скопировать приватный ключ на локальную машину
cat ~/.ssh/hetzner_key
# Скопируйте вывод и сохраните в файл: d:\cave-game\.ssh\hetzner_key
```

Потом можно подключаться без пароля:
```powershell
ssh -i "d:\cave-game\.ssh\hetzner_key" root@192.0.2.1
```

### 2.3 Обновить систему

```bash
# На сервере
apt-get update
apt-get upgrade -y
```

## Шаг 3️⃣: Развертывание приложения

### 3.1 Загрузить скрипты развертывания

```powershell
# На локальной машине
$ServerIP = "192.0.2.1"

# Копировать скрипты на сервер
scp d:\cave-game\deploy.sh root@${ServerIP}:/tmp/
scp d:\cave-game\.env.hetzner root@${ServerIP}:/tmp/
scp d:\cave-game\ecosystem.config.js root@${ServerIP}:/tmp/
scp d:\cave-game\nginx.conf root@${ServerIP}:/tmp/
scp d:\cave-game\security-setup.sh root@${ServerIP}:/tmp/
```

### 3.2 Запустить скрипт развертывания

```bash
# На сервере
cd /tmp
chmod +x deploy.sh
bash deploy.sh
```

Скрипт автоматически:
- ✅ Обновит пакеты системы
- ✅ Установит Node.js v20
- ✅ Установит Nginx и PM2
- ✅ Установит Certbot для SSL
- ✅ Клонирует ваш GitHub репозиторий
- ✅ Установит зависимости
- ✅ Соберет фронтенд
- ✅ Настроит HTTPS сертификат
- ✅ Запустит приложение через PM2
- ✅ Настроит Nginx как reverse proxy

⏳ Процесс займет 5-10 минут

## Шаг 4️⃣: Финальная настройка

### 4.1 Обновить переменные окружения

```bash
# На сервере
nano /home/cave-game/.env
```

Отредактируйте все значения, особенно:
```env
TELEGRAM_BOT_TOKEN=ваш_реальный_токен
VITE_API_URL=https://ваш-домен.com
VITE_APP_URL=https://ваш-домен.com
WS_URL=wss://ваш-домен.com
```

Нажмите `Ctrl+O`, потом `Enter`, потом `Ctrl+X` для сохранения

### 4.2 Перезапустить приложение

```bash
# На сервере
pm2 restart ecosystem.config.js

# Подождите 3-5 секунд
pm2 status
```

### 4.3 Проверить, что все работает

```bash
# На сервере
pm2 logs
# Должны увидеть: "Server is running on port 3001"
#                  "Frontend server listening on port 3000"

# Нажмите Ctrl+C для выхода из логов
```

### 4.4 Настроить безопасность

```bash
# На сервере
cd /home/cave-game
chmod +x security-setup.sh backup.sh update.sh check-status.sh
bash security-setup.sh
```

Это настроит:
- ✅ Автоматические системные обновления
- ✅ Автоматические резервные копии
- ✅ SSH безопасность
- ✅ Защиту от брутфорса (fail2ban)

## Шаг 5️⃣: Тестирование

### 5.1 Проверить веб-интерфейс

```bash
# Откройте в браузере
https://ваш-домен.com
```

Должны увидеть игру (может загружаться 30 секунд в первый раз)

### 5.2 Проверить здоровье приложения

```bash
# На сервере
bash check-status.sh your-domain.com
```

Все должно быть зелено ✓

### 5.3 Проверить Telegram интеграцию

1. Добавьте вашего бота в Telegram: `@your_bot_username`
2. Отправьте `/start`
3. Нажмите кнопку "Play"
4. Должна открыться ваша игра в webview Telegram

## Шаг 6️⃣: Продолжающееся обслуживание

### Просмотр логов

```bash
# Все логи
pm2 logs

# Только API
pm2 logs cave-game-api

# Только frontend
pm2 logs cave-game-frontend

# Следить за логами в реальном времени
pm2 logs --lines 100
```

### Обновление приложения

```bash
# На сервере
cd /home/cave-game
bash update.sh
```

Или просто push в GitHub:
```powershell
# На локальной машине
git push origin main
# Автоматически развернется на сервере через Git hook
```

### Создание резервной копии

```bash
# На сервере
bash backup.sh
```

Резервные копии сохраняются в `/home/cave-game/backups/`

### Остановка/запуск приложения

```bash
# Остановить
pm2 stop ecosystem.config.js

# Запустить
pm2 start ecosystem.config.js

# Перезапустить
pm2 restart ecosystem.config.js

# Полностью удалить из PM2
pm2 delete ecosystem.config.js
```

## 🆘 Решение проблем

### Приложение не запускается

```bash
# Проверить логи
pm2 logs

# Проверить ошибки Node.js
node /home/cave-game/server.js

# Проверить зависимости
cd /home/cave-game
npm install
npm run build
```

### Domain не работает

```bash
# Проверить DNS
nslookup your-domain.com
# Должен вернуть ваш IP адрес

# Если DNS еще не обновился (15-30 минут)
# Подождите или свяжитесь с регистратором домена
```

### SSL сертификат не работает

```bash
# Проверить сертификат
certbot certificates

# Обновить вручную
certbot renew --dry-run

# Проверить логи
journalctl -u certbot.service
```

### 502 Bad Gateway ошибка

```bash
# Проверить, запущено ли приложение
pm2 status

# Если не запущено
pm2 start ecosystem.config.js

# Если запущено, перезапустить Nginx
systemctl restart nginx

# Проверить логи Nginx
tail -f /var/log/nginx/error.log
```

### WebSocket не подключается

```bash
# Проверить логи приложения
pm2 logs cave-game-api

# Проверить конфигурацию Nginx
nginx -T | grep "ws"

# Перезапустить Nginx
systemctl restart nginx
```

## 📞 Контакты и ссылки

- **Telegram бот**: @cave_of_greed_bot
- **GitHub**: https://github.com/your-username/cave-game
- **Hetzner консоль**: https://console.hetzner.cloud
- **Поддержка Hetzner**: https://support.hetzner.com

## ✅ Финальный чек-лист

- [ ] Сервер Hetzner создан
- [ ] Доменное имя указывает на IP сервера
- [ ] Токен Telegram бота получен
- [ ] Скрипты развертывания загружены
- [ ] deploy.sh выполнен успешно
- [ ] .env файл обновлен реальными значениями
- [ ] Приложение работает (pm2 status показывает "online")
- [ ] HTTPS работает (https://ваш-домен.com)
- [ ] Telegram бот включен и в webview открывается игра
- [ ] Автоматические резервные копии настроены
- [ ] Системные обновления настроены

Готово! Ваша игра теперь на производственном сервере! 🎉
