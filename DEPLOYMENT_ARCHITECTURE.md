# 📁 Структура развертывания на Hetzner

## Файлы для развертывания

В папке проекта созданы следующие файлы для развертывания на Hetzner:

### 🔧 Конфигурационные файлы

| Файл | Назначение |
|------|-----------|
| `.env.hetzner` | Переменные окружения для production |
| `ecosystem.config.js` | Конфигурация PM2 для управления процессами |
| `nginx.conf` | Конфигурация Nginx reverse proxy и SSL |

### 📜 Скрипты развертывания

| Скрипт | Назначение |
|--------|-----------|
| `deploy.sh` | Главный скрипт развертывания (запустить один раз) |
| `update.sh` | Обновление приложения из Git |
| `backup.sh` | Создание резервной копии |
| `check-status.sh` | Проверка здоровья приложения |
| `security-setup.sh` | Настройка безопасности и автоматизации |

### 📚 Документация

| Документ | Содержание |
|----------|-----------|
| `DEPLOYMENT_HETZNER.md` | Полная документация по развертыванию |
| `DEPLOYMENT_STEP_BY_STEP.md` | Пошаговая инструкция (начните отсюда!) |
| `COMMANDS_REFERENCE.md` | Справочник полезных команд |

---

## Процесс развертывания

### Этап 1: Подготовка (локально)

```
1. Создать Hetzner сервер (Ubuntu 22.04, CPX11)
2. Настроить доменное имя → IP сервера (DNS A record)
3. Получить Telegram бот токен
4. Редактировать .env.hetzner и deploy.sh
5. Push код в GitHub
```

### Этап 2: Развертывание (на сервере)

```
1. SSH подключение к серверу
2. Загрузить скрипты (deploy.sh, .env.hetzner и т.д.)
3. Запустить: bash deploy.sh
4. Скрипт автоматически:
   - Обновляет систему
   - Устанавливает Node.js, Nginx, PM2, Certbot
   - Клонирует Git репозиторий
   - Устанавливает зависимости
   - Собирает фронтенд
   - Создает SSL сертификат
   - Запускает приложение
```

### Этап 3: Финализация

```
1. Обновить .env файл (TELEGRAM_BOT_TOKEN, домены)
2. Перезапустить приложение: pm2 restart ecosystem.config.js
3. Проверить работу: https://your-domain.com
4. Запустить security-setup.sh для автоматизации
5. Проверить в Telegram: нажать на бота и "Play"
```

---

## Архитектура на Hetzner

```
┌─────────────────────────────────────────────┐
│       HETZNER UBUNTU 22.04 SERVER           │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         NGINX (Reverse Proxy)       │   │
│  │  Port 80 (HTTP)  ──┐                │   │
│  │  Port 443 (HTTPS) ─┼─→ SSL/TLS      │   │
│  │                    │                │   │
│  │  ├─ / (Frontend)──→ Port 3000       │   │
│  │  ├─ /api (API)   ──→ Port 3001      │   │
│  │  └─ /ws (WS)     ──→ Port 3001      │   │
│  └─────────────────────────────────────┘   │
│                 ↓                          │
│  ┌─────────────────────────────────────┐   │
│  │      PM2 Process Manager            │   │
│  ├─────────────────────────────────────┤   │
│  │  cave-game-api                      │   │
│  │  ├─ Port: 3001                      │   │
│  │  ├─ Process: server.js              │   │
│  │  └─ Instances: 2 (max)              │   │
│  │                                     │   │
│  │  cave-game-frontend                 │   │
│  │  ├─ Port: 3000                      │   │
│  │  ├─ Process: frontend-server.js     │   │
│  │  └─ Instances: 1                    │   │
│  └─────────────────────────────────────┘   │
│                 ↓                          │
│  ┌─────────────────────────────────────┐   │
│  │     Application Directory           │   │
│  │  /home/cave-game/                   │   │
│  │  ├─ dist/              (build)      │   │
│  │  ├─ node_modules/      (npm)        │   │
│  │  ├─ src/               (source)     │   │
│  │  ├─ server.js          (API)        │   │
│  │  ├─ .env               (config)     │   │
│  │  └─ ecosystem.config.js             │   │
│  └─────────────────────────────────────┘   │
│                 ↓                          │
│  ┌─────────────────────────────────────┐   │
│  │    System Services                  │   │
│  │  ├─ Node.js v20                    │   │
│  │  ├─ Certbot (SSL renewal)          │   │
│  │  ├─ Fail2ban (Security)            │   │
│  │  └─ Systemd (Auto-restart)         │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
         │             │
         ↓             ↓
    TELEGRAM      INTERNET
     USERS        (HTTPS)
```

---

## Порты и их назначение

| Порт | Сервис | Доступ | Назначение |
|------|--------|--------|-----------|
| 22 | SSH | Internal | Управление сервером |
| 80 | HTTP | Internet | Redirect на HTTPS |
| 443 | HTTPS | Internet | Веб-сайт + API + WS |
| 3000 | Frontend | Internal | Next.js фронтенд |
| 3001 | API | Internal | Express API + WS |

---

## Логи и мониторинг

### Основные логи

```bash
# PM2 логи
tail -f ~/.pm2/logs/cave-game-api-out.log
tail -f ~/.pm2/logs/cave-game-frontend-out.log

# Nginx логи
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Certbot логи
tail -f /var/log/letsencrypt/letsencrypt.log

# Системные логи
journalctl -xe
```

### Мониторинг в реальном времени

```bash
# PM2 мониторинг
pm2 monit

# Система
top
htop

# Сеть
iftop
ss -tulpn
```

---

## Безопасность

### Установленные меры

✅ **HTTPS/SSL** - Certbot с Let's Encrypt
✅ **Firewall** - UFW (только 22, 80, 443)
✅ **SSH** - Отключены логины по паролю
✅ **Fail2ban** - Защита от brute-force
✅ **CORS** - Настроены разрешенные домены
✅ **DDoS** - Rate limiting в Nginx
✅ **Обновления** - Автоматические системные обновления

### Автоматические задачи

```
02:00 AM - Системные обновления (apt-get)
03:00 AM - Обновление приложения (Git pull, npm install, rebuild)
04:00 AM - Резервная копия приложения
05:00 AM - Очистка старых резервных копий (старше 7 дней)
```

---

## Требования ресурсов

### Минимальные (для старта)

- **Память**: 2 GB RAM
- **CPU**: 2 cores
- **Диск**: 40 GB SSD
- **Пропускная способность**: Неограниченная

### Рекомендуемые (для продакшена)

- **Память**: 4-8 GB RAM
- **CPU**: 4 cores
- **Диск**: 100+ GB SSD
- **Server type**: CPX21 или выше

---

## Переменные окружения

### Обязательные

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
VITE_API_URL=https://your-domain.com
VITE_APP_URL=https://your-domain.com
```

### Важные для работы WebSocket

```env
WS_URL=wss://your-domain.com
WS_PATH=/ws
```

### Опциональные

```env
LOG_LEVEL=info
ALLOW_ORIGINS=https://your-domain.com,https://t.me
NODE_ENV=production
```

---

## Обновление приложения

### Способ 1: Через Git (рекомендуемый)

```bash
# На локальной машине
git push origin main

# На сервере автоматически происходит (через Git hook):
# - git pull
# - npm ci
# - npm run build
# - pm2 restart
```

### Способ 2: Вручную

```bash
# На сервере
cd /home/cave-game
git pull origin main
npm ci --omit=dev
npm run build
pm2 restart ecosystem.config.js
```

### Способ 3: Через скрипт

```bash
# На сервере
bash update.sh
```

---

## Резервное копирование

### Автоматическое

Запланировано ежедневно в 4 AM через cron

```bash
/home/cave-game/backups/cave-game_YYYYMMDD_HHMMSS.tar.gz
```

### Вручную

```bash
# На сервере
bash backup.sh /home/cave-game/backups
```

### Восстановление

```bash
# Остановить приложение
pm2 stop ecosystem.config.js

# Восстановить из бэкапа
tar -xzf /home/cave-game/backups/cave-game_20240101.tar.gz -C /

# Запустить снова
pm2 start ecosystem.config.js
```

---

## Масштабирование

Если приложение становится популярным:

### Горизонтальное масштабирование (несколько серверов)

```
Load Balancer (Hetzner)
    ↓
├─ Server 1 (API)
├─ Server 2 (API)
├─ Server 3 (API)
├─ Frontend Server
└─ Database Server (PostgreSQL)
```

### Вертикальное масштабирование (больше ресурсов)

```bash
# В Hetzner Console
1. Создать больший server (CPX41, CPX51)
2. Скопировать приложение
3. Перенаправить домен на новый IP
```

### Оптимизация

- Включить кеширование (Redis)
- Использовать CDN (Cloudflare)
- Включить компрессию (gzip)
- Оптимизировать БД запросы

---

## Контакты и поддержка

- **Hetzner Support**: https://support.hetzner.com
- **Let's Encrypt Status**: https://letsencrypt.status.io
- **Node.js Docs**: https://nodejs.org/docs
- **PM2 Docs**: https://pm2.keymetrics.io
- **Nginx Docs**: https://nginx.org/en/docs

---

**Дата создания**: Декабрь 2024  
**Версия**: 1.0  
**Статус**: Production-ready ✅
