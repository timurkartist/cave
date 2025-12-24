# 🚀 Развертывание Cave Game на Hetzner

## ⚡ Быстрый старт (5 минут)

Если вы спешите, вот самое короткое описание:

1. **Создать сервер на Hetzner** (Ubuntu 22.04, CPX11)
2. **Настроить домен** (A record → IP сервера)
3. **SSH на сервер** и скопировать файлы:
   ```bash
   # На локальной машине:
   scp deploy.sh .env.hetzner ecosystem.config.js nginx.conf security-setup.sh root@IP:/tmp/
   
   # На сервере:
   cd /tmp && chmod +x deploy.sh && bash deploy.sh
   ```
4. **Отредактировать .env** на сервере:
   ```bash
   nano /home/cave-game/.env
   # Обновить TELEGRAM_BOT_TOKEN и домены
   ```
5. **Перезапустить**:
   ```bash
   pm2 restart ecosystem.config.js
   ```
6. **Проверить**: https://your-domain.com

Готово! ✅

---

## 📚 Полная документация

| Документ | Для кого | Когда читать |
|----------|----------|----------|
| **[DEPLOYMENT_STEP_BY_STEP.md](DEPLOYMENT_STEP_BY_STEP.md)** | Новички | В первый раз |
| **[DEPLOYMENT_HETZNER.md](DEPLOYMENT_HETZNER.md)** | Опытные | Для справки |
| **[COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md)** | Все | Часто используемые команды |
| **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** | Все | Убедиться, что ничего не пропустили |
| **[DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md)** | Архитекторы | Как все устроено |

---

## 📦 Что включено в развертывание

### Конфигурационные файлы
- ✅ `.env.hetzner` - переменные окружения
- ✅ `ecosystem.config.js` - управление PM2 процессами
- ✅ `nginx.conf` - веб-сервер и reverse proxy

### Скрипты
- ✅ `deploy.sh` - главный скрипт (ALL-IN-ONE)
- ✅ `update.sh` - обновление приложения
- ✅ `backup.sh` - создание резервных копий
- ✅ `check-status.sh` - проверка здоровья
- ✅ `security-setup.sh` - безопасность и автоматизация

### Документация
- ✅ Пошаговая инструкция
- ✅ Справочник команд
- ✅ Чек-лист проверки
- ✅ Архитектура системы

---

## 🎯 Основные компоненты

### Hetzner Server (Ubuntu 22.04)
- **Процессор**: 2 CPU cores
- **Память**: 2 GB RAM (можно расширить)
- **Диск**: 40 GB SSD
- **ОС**: Ubuntu 22.04 LTS

### Установка программного обеспечения
- **Node.js 20** - Runtime для JavaScript
- **Nginx** - Веб-сервер и reverse proxy
- **PM2** - Менеджер процессов
- **Certbot** - Автоматический SSL
- **Git** - Управление версиями
- **Fail2ban** - Защита от атак

### Приложение
- **Frontend**: React + TypeScript (dist папка)
- **Backend**: Express + Node.js (server.js)
- **Protocol**: HTTPS + WebSocket
- **Domain**: Ваше доменное имя
- **SSL**: Let's Encrypt (автоматический)

---

## 🔒 Безопасность

Все автоматически настроено:

- 🔐 **HTTPS/TLS** - Все трафик зашифрован
- 🛡️ **Firewall** - Открыты только необходимые порты
- 🔑 **SSH Keys** - Вместо паролей (рекомендуется)
- 🚫 **Fail2ban** - Защита от brute-force атак
- ⏰ **Автоматические обновления** - Безопасность системы
- 🔄 **Автоматические резервные копии** - Защита данных

---

## 📊 Требования

| Параметр | Минимум | Рекомендуется | Premium |
|----------|---------|---------------|---------|
| CPU | 2 cores | 4 cores | 8 cores |
| RAM | 2 GB | 4 GB | 8 GB |
| Диск | 40 GB | 100 GB | 200+ GB |
| Hetzner | CPX11 | CPX21 | CPX41 |
| Стоимость | $5.49/м | $10.99/м | $27.99/м |

---

## ✨ Что происходит при развертывании

```
deploy.sh запускается
    ↓
[1] Обновляет систему (apt-get update/upgrade)
    ↓
[2] Устанавливает Node.js 20
    ↓
[3] Устанавливает Nginx
    ↓
[4] Устанавливает PM2
    ↓
[5] Устанавливает Certbot (SSL)
    ↓
[6] Клонирует Git репозиторий
    ↓
[7] Устанавливает зависимости (npm ci)
    ↓
[8] Собирает фронтенд (npm run build)
    ↓
[9] Создает SSL сертификат (Let's Encrypt)
    ↓
[10] Настраивает Nginx
    ↓
[11] Запускает приложение через PM2
    ↓
✅ Приложение готово к использованию
```

⏱️ **Время**: 5-10 минут

---

## 🚀 После развертывания

### Первые проверки

```bash
# 1. Проверить статус приложения
pm2 status

# 2. Просмотреть логи
pm2 logs

# 3. Проверить здоровье
curl https://your-domain.com/health

# 4. Открыть в браузере
https://your-domain.com
```

### Ежедневное управление

```bash
# Просмотреть логи в реальном времени
pm2 logs

# Перезапустить приложение
pm2 restart ecosystem.config.js

# Остановить приложение
pm2 stop ecosystem.config.js

# Запустить приложение
pm2 start ecosystem.config.js

# Обновить из GitHub
cd /home/cave-game && git pull origin main && npm ci && npm run build && pm2 restart ecosystem.config.js
```

---

## 📝 Переменные окружения

Обязательные (установить в `/home/cave-game/.env`):

```env
# Telegram
TELEGRAM_BOT_TOKEN=ваш_реальный_токен

# URLs (замените на ваш домен)
VITE_API_URL=https://your-domain.com
VITE_APP_URL=https://your-domain.com
WS_URL=wss://your-domain.com
```

---

## 🔄 Обновление приложения

Когда вы обновили код в GitHub:

### Вариант 1: Автоматическое (через Git hook)
```bash
# На локальной машине
git push origin main
# На сервере автоматически: скачивание, сборка, перезапуск
```

### Вариант 2: Вручную
```bash
# На сервере
bash update.sh
```

---

## 💾 Резервные копии

### Автоматические
- ✅ Создаются каждый день в 4 AM
- ✅ Хранятся 7 дней автоматически
- ✅ Расположение: `/home/cave-game/backups/`

### Вручную
```bash
# На сервере
bash backup.sh
```

### Восстановление
```bash
# На сервере
cd /home/cave-game
tar -xzf backups/cave-game_20240101.tar.gz -C /
pm2 restart ecosystem.config.js
```

---

## 🆘 Помощь при проблемах

### Приложение не запускается
```bash
# Проверить логи
pm2 logs

# Перезапустить
pm2 restart ecosystem.config.js

# Проверить .env
cat /home/cave-game/.env
```

### Домен не работает
```bash
# Проверить DNS
nslookup your-domain.com
# Должен вернуть IP Hetzner сервера

# Если не обновился, подождите (15-30 минут)
```

### SSL ошибка
```bash
# Проверить сертификат
certbot certificates

# Обновить вручную
certbot renew --dry-run
```

### WebSocket проблемы
```bash
# Проверить логи API
pm2 logs cave-game-api

# Проверить Nginx конфиг
nginx -t

# Перезапустить Nginx
systemctl restart nginx
```

---

## 📞 Когда обращаться в поддержку

### Hetzner Support
- Проблемы с сервером, сетью, IP
- Вопросы по биллингу
- https://support.hetzner.com

### Let's Encrypt Support
- Проблемы с SSL сертификатом
- https://community.letsencrypt.org

### GitHub Issues
- Проблемы с кодом приложения
- https://github.com/your-username/cave-game/issues

---

## 🎯 Что дальше

### Если приложение работает отлично
1. ✅ Пригласите друзей через Telegram бота
2. ✅ Мониторьте логи на наличие ошибок
3. ✅ Следите за использованием памяти и диска
4. ✅ Обновляйте приложение по мере выхода новых версий

### Если нужна масштабируемость
1. 📈 Обновите сервер до CPX21 или выше
2. 💾 Добавьте базу данных (PostgreSQL)
3. ⚡ Добавьте Redis для кеширования
4. 🌐 Добавьте CDN (Cloudflare)
5. 🔄 Настройте несколько серверов с load balancer

---

## 📋 Итоговый чек-лист

Перед тем как объявить о запуске:

- [ ] Сервер создан и работает
- [ ] Домен настроен и работает
- [ ] HTTPS работает (зелёный замок в браузере)
- [ ] Приложение открывается без ошибок
- [ ] Telegram бот работает и может открыть webview
- [ ] Игра полностью функциональна
- [ ] Резервные копии настроены
- [ ] Автоматические обновления включены
- [ ] Документация сохранена

---

## 🎉 Готово!

Ваша игра Cave Game теперь работает на production сервере!

**Ссылка для игроков**: https://t.me/your_bot_username

Спасибо за использование этого гайда! 🚀

---

**Версия**: 1.0  
**Дата**: Декабрь 2024  
**Статус**: ✅ Production Ready  

Для более подробной информации смотрите [DEPLOYMENT_STEP_BY_STEP.md](DEPLOYMENT_STEP_BY_STEP.md)
