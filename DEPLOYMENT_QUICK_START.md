# 🎯 КРАТКАЯ СВОДКА: Развертывание Cave Game на Hetzner

## ⚡ В 3 словах: Автоматизировано, Просто, Готово

---

## 🚀 Три основных шага

### ШАГ 1️⃣: Подготовка (15 минут)
```bash
# На локальной машине

# 1. Создать сервер на Hetzner.com
#    - Ubuntu 22.04
#    - CPX11 (2 CPU, 2 GB RAM)
#    - Записать IP: 192.0.2.1

# 2. Настроить домен
#    - A record → IP сервера

# 3. Создать Telegram бота
#    - Написать @BotFather
#    - Команда /newbot
#    - Записать токен

# 4. Отредактировать .env.hetzner
nano .env.hetzner
# Заменить your-domain.com и TELEGRAM_BOT_TOKEN

# 5. Отредактировать deploy.sh
nano deploy.sh
# Заменить REPO_URL и DOMAIN

# 6. Push в GitHub
git add .
git commit -m "Add Hetzner deployment"
git push origin main
```

### ШАГ 2️⃣: Развертывание (10 минут)
```bash
# На сервере Hetzner

# 1. Подключиться по SSH
ssh root@192.0.2.1

# 2. Скопировать файлы со своего компьютера
# В PowerShell на локальной машине:
scp deploy.sh .env.hetzner ecosystem.config.js nginx.conf security-setup.sh root@192.0.2.1:/tmp/

# 3. На сервере запустить развертывание
cd /tmp
chmod +x deploy.sh
bash deploy.sh
# Подождать 5-10 минут...
```

### ШАГ 3️⃣: Финализация (5 минут)
```bash
# На сервере

# 1. Отредактировать переменные окружения
nano /home/cave-game/.env
# Убедиться что все реальные значения (TELEGRAM_BOT_TOKEN и т.д.)

# 2. Перезапустить приложение
pm2 restart ecosystem.config.js

# 3. Проверить что работает
pm2 status
# Оба процесса должны быть "online"

# 4. Открыть в браузере
# https://your-domain.com
```

---

## ✅ Готово!

Ваша игра доступна:
- 🌐 **Веб**: https://your-domain.com
- 🤖 **Telegram**: @your_bot_username
- 📱 **Клиенты**: Telegram webview

---

## 📁 8 новых файлов созданы

### Конфигурация (редактировать перед deploy.sh)
- `.env.hetzner` - переменные (домены, токены)
- `deploy.sh` - скрипт (REPO_URL, DOMAIN)

### Использование (скопировать на сервер)
- `ecosystem.config.js` - PM2 конфиг
- `nginx.conf` - веб-сервер
- `security-setup.sh` - автоматизация

### Документация (читать для справки)
- `HETZNER_DEPLOYMENT_README.md` - начните здесь ⭐
- `DEPLOYMENT_STEP_BY_STEP.md` - пошаговый гайд ⭐
- `COMMANDS_REFERENCE.md` - справочник команд
- `DEPLOYMENT_CHECKLIST.md` - чек-лист
- `DEPLOYMENT_ARCHITECTURE.md` - архитектура
- `DEPLOYMENT_INDEX.md` - навигация
- `DEPLOYMENT_FILES_MANIFEST.md` - описание файлов

---

## 🔧 Что установится автоматически

✅ Node.js 20  
✅ Nginx (веб-сервер)  
✅ PM2 (менеджер процессов)  
✅ Certbot (SSL сертификаты)  
✅ Git (управление версиями)  
✅ Fail2ban (безопасность)  

---

## 📊 Стоимость и ресурсы

| Ресурс | Стоимость | Параметры |
|--------|-----------|-----------|
| Hetzner CPX11 | $5.49/месяц | 2 CPU, 2GB RAM, 40GB SSD |
| Домен | $10/год | Ваше имя |
| SSL | Бесплатно | Let's Encrypt (автоматический) |
| **Итого** | ~$1.40/месяц | Полностью функциональный сервер |

---

## 🎯 Команды на каждый день

```bash
# Проверить статус
pm2 status

# Посмотреть логи
pm2 logs

# Обновить приложение (если пушили в GitHub)
cd /home/cave-game && git pull && npm ci && npm run build && pm2 restart ecosystem.config.js

# Или просто
bash update.sh

# Создать резервную копию
bash backup.sh

# Проверить здоровье приложения
bash check-status.sh your-domain.com
```

---

## 🔐 Безопасность - всё настроено

✅ HTTPS обязателен (HTTP редирект)  
✅ SSL автоматически обновляется  
✅ Firewall включен (UFW)  
✅ SSH защищен (только ключи)  
✅ Fail2ban включен  
✅ Ежедневные обновления системы  
✅ Ежедневные резервные копии  

---

## ❌ Если что-то пошло не так

### Приложение не запускается
```bash
pm2 logs
pm2 restart ecosystem.config.js
```

### Домен не работает
```bash
nslookup your-domain.com
# Должен вернуть IP Hetzner сервера
# Если нет - подождите 15-30 минут для DNS обновления
```

### WebSocket не подключается
```bash
pm2 logs cave-game-api
systemctl restart nginx
nginx -t
```

### SSL ошибка
```bash
certbot certificates
certbot renew --dry-run
```

**Для всех остальных проблем:** смотрите [DEPLOYMENT_HETZNER.md](DEPLOYMENT_HETZNER.md#решение-проблем)

---

## 📚 Документация

| Документ | Когда читать |
|----------|-------------|
| [HETZNER_DEPLOYMENT_README.md](HETZNER_DEPLOYMENT_README.md) | ⭐ Начните здесь |
| [DEPLOYMENT_STEP_BY_STEP.md](DEPLOYMENT_STEP_BY_STEP.md) | ⭐ Для пошагового гайда |
| [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) | Когда нужна команда |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Когда завершаете |

Остальные документы для справки и понимания архитектуры.

---

## 🎊 После развертывания

1. ✅ Приложение работает на production сервере
2. ✅ Игра доступна через Telegram
3. ✅ Резервные копии создаются ежедневно
4. ✅ Обновления системы автоматические
5. ✅ SSL сертификат обновляется автоматически
6. ✅ Приложение перезапускается при сбое

### Можете сфокусироваться на
- 🎮 Разработке новых фич
- 🐛 Исправлении багов
- 📈 Масштабировании (когда вырастет)

---

## 💡 Полезные ссылки

- [Hetzner Cloud](https://console.hetzner.cloud)
- [@BotFather в Telegram](https://t.me/botfather)
- [Документация Node.js](https://nodejs.org/docs)
- [PM2 Документация](https://pm2.keymetrics.io)

---

## 📝 Чек-лист перед deploy.sh

- [ ] Hetzner сервер создан (IP записан)
- [ ] Домен настроен (A record → IP)
- [ ] Telegram бот создан (токен записан)
- [ ] `.env.hetzner` отредактирован (домены, токены)
- [ ] `deploy.sh` отредактирован (REPO_URL, DOMAIN)
- [ ] Код залит в GitHub

Если всё ✓ → готовы к запуску `bash deploy.sh`

---

## 🚀 Следующие шаги

1. **Сейчас**: Запустить развертывание (30 мин)
2. **Завтра**: Пригласить тестировщиков
3. **На неделе**: Собрать отзывы, исправить баги
4. **На следующей неделе**: Публичный запуск 🎉

---

## 📞 Нужна помощь?

1. Прочитайте [документацию](#-документация)
2. Проверьте [DEPLOYMENT_HETZNER.md](DEPLOYMENT_HETZNER.md#решение-проблем)
3. Посмотрите логи: `pm2 logs`
4. Гуглите ошибку (частые вещи обычно там)
5. Спросите в GitHub Issues

---

## 🎉 Готовы?

**Следующий шаг**: Прочитайте [HETZNER_DEPLOYMENT_README.md](HETZNER_DEPLOYMENT_README.md)

Затем: Запустите развертывание! 🚀

```bash
bash deploy.sh
```

**Время до запуска игры на production: ~30 минут** ⏱️

---

**Версия**: 1.0  
**Дата**: Декабрь 2024  
**Статус**: ✅ Production Ready  

Вам будет успешно! 🎯
