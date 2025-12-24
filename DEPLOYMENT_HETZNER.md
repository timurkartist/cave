# 🚀 Развертывание Cave Game на Hetzner

## Предварительные требования

- Сервер Hetzner с Ubuntu 20.04+ (рекомендуется 22.04)
- Минимум 2 GB RAM, 2 CPU cores
- Доменное имя, указывающее на IP сервера
- SSH доступ к серверу (root или sudo user)

## Быстрый старт

### 1. Подготовка сервера (локально)

```bash
# Отредактировать переменные в deploy.sh
cd d:\cave-game
# Открыть deploy.sh и обновить:
# - REPO_URL (ваш GitHub репозиторий)
# - DOMAIN (ваше доменное имя)
```

### 2. Загрузка на сервер

```bash
# Скопировать файлы развертывания на сервер
scp deploy.sh root@your-server-ip:/tmp/
scp .env.hetzner root@your-server-ip:/tmp/
scp ecosystem.config.js root@your-server-ip:/tmp/
scp nginx.conf root@your-server-ip:/tmp/

# Подключиться к серверу
ssh root@your-server-ip
```

### 3. Запуск развертывания на сервере

```bash
cd /tmp
chmod +x deploy.sh
./deploy.sh
```

Скрипт автоматически:
- ✅ Обновит систему
- ✅ Установит Node.js
- ✅ Установит Nginx
- ✅ Установит PM2
- ✅ Установит Certbot (SSL)
- ✅ Клонирует репозиторий
- ✅ Соберет фронтенд
- ✅ Настроит HTTPS
- ✅ Запустит приложение

### 4. Настройка переменных окружения

```bash
# На сервере отредактировать .env файл
nano /home/cave-game/.env
```

Установить следующие значения:

```env
# Telegram
TELEGRAM_BOT_TOKEN=ваш_токен_бота
TELEGRAM_API_ID=ваш_api_id
TELEGRAM_API_HASH=ваш_api_hash

# URLs
VITE_API_URL=https://ваш-домен.com
VITE_APP_URL=https://ваш-домен.com
FRONTEND_URL=https://ваш-домен.com
BACKEND_URL=https://ваш-домен.com/api

# WebSocket
WS_URL=wss://ваш-домен.com
```

После редактирования перезапустить приложение:

```bash
pm2 restart ecosystem.config.js
```

## Структура развертывания

```
/home/cave-game/
├── src/                    # Исходный код
├── dist/                   # Собранный фронтенд
├── server.js              # API сервер
├── frontend-server.js     # Frontend сервер
├── package.json
├── ecosystem.config.js    # PM2 конфигурация
├── .env                   # Переменные окружения
└── .git/                  # Git репозиторий

/etc/nginx/
├── sites-available/
│   └── cave-game          # Nginx конфиг

/etc/letsencrypt/
└── live/
    └── your-domain.com/   # SSL сертификаты

/var/log/pm2/            # Логи приложения
```

## Команды управления

### PM2 (управление приложением)

```bash
# Статус приложения
pm2 status

# Просмотр логов
pm2 logs

# Просмотр логов конкретного приложения
pm2 logs cave-game-api
pm2 logs cave-game-frontend

# Перезапуск приложения
pm2 restart ecosystem.config.js

# Остановка приложения
pm2 stop ecosystem.config.js

# Запуск приложения
pm2 start ecosystem.config.js

# Удаление из PM2
pm2 delete ecosystem.config.js
```

### Nginx

```bash
# Проверить конфиг
nginx -t

# Перезапустить Nginx
systemctl restart nginx

# Статус Nginx
systemctl status nginx
```

### SSL сертификат

```bash
# Проверить сертификат
certbot certificates

# Обновить сертификат (обычно делается автоматически)
certbot renew

# Просмотр автоматического обновления
crontab -l
```

## Мониторинг

### Проверка статуса приложения

```bash
# Проверить endpoint здоровья
curl https://your-domain.com/health

# Проверить WebSocket соединение
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
     -H "Sec-WebSocket-Version: 13" \
     wss://your-domain.com/ws
```

### Системные ресурсы

```bash
# Использование памяти
pm2 monit

# Дополнительная информация
free -h
df -h
ps aux | grep node
```

## Обновление приложения

### Вариант 1: Вручную

```bash
cd /home/cave-game
git pull origin main
npm ci --omit=dev
npm run build
pm2 restart ecosystem.config.js
```

### Вариант 2: Автоматически через Git Hook

```bash
# Push в репозиторий работает как развертывание
git push origin main

# На сервере автоматически:
# - Обновляется код
# - Переустанавливаются зависимости
# - Собирается фронтенд
# - Перезапускается приложение
```

## Резервное копирование

```bash
# Создать резервную копию
tar -czf ~/backups/cave-game-$(date +%Y%m%d).tar.gz /home/cave-game

# Восстановить из резервной копии
tar -xzf ~/backups/cave-game-20240101.tar.gz -C /
pm2 restart ecosystem.config.js
```

## Разрешение проблем

### Приложение не запускается

```bash
# Проверить логи
pm2 logs

# Проверить, доступны ли зависимости
cd /home/cave-game
npm install

# Проверить синтаксис конфига
pm2 validate ecosystem.config.js
```

### Nginx возвращает 502 Bad Gateway

```bash
# Проверить, запущен ли приложение
pm2 status

# Проверить, слушает ли порт 3001
netstat -tlnp | grep 3001

# Перезапустить Nginx
systemctl restart nginx
```

### WebSocket не подключается

```bash
# Проверить логи приложения
pm2 logs cave-game-api

# Убедиться, что /ws маршрут настроен в Nginx
nginx -T | grep "location /ws"

# Проверить HTTPS редирект
curl -I http://your-domain.com
```

### Проблемы с SSL

```bash
# Проверить сертификат
certbot certificates

# Возобновить сертификат вручную
certbot renew --dry-run

# Просмотреть ошибки
journalctl -u certbot.timer
```

## Оптимизация производительности

### Увеличение лимита соединений

```bash
# Редактировать /etc/security/limits.conf
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

### Настройка PM2

В `ecosystem.config.js`:
```javascript
instances: 'max',  // Использовать все CPU cores
max_memory_restart: '500M',  // Перезапуск при 500 MB
```

### Включение кеширования

В `nginx.conf`:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Поддержка и контакты

При возникновении проблем:

1. Проверить логи: `pm2 logs`
2. Проверить конфигурацию: `nginx -t`
3. Перезапустить приложение: `pm2 restart ecosystem.config.js`
4. Обратиться в поддержку Hetzner

## Безопасность

- 🔒 HTTPS включен и обновляется автоматически
- 🛡️ Firewall настроен (только необходимые порты)
- 🔑 SSH ключи вместо паролей (рекомендуется)
- 🚫 CORS настроен для безопасности
- 🔐 Environment переменные защищены

## Дополнительно

- Документация PM2: https://pm2.keymetrics.io/
- Документация Nginx: https://nginx.org/en/docs/
- Документация Certbot: https://certbot.eff.org/docs/
- Документация Hetzner: https://docs.hetzner.cloud/
