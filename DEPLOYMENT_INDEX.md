# 🗺️ Навигация по документации развертывания

## Начните отсюда! 👈

### 🎯 Первый раз развертываете?

**Прочитайте в этом порядке:**

1. **[HETZNER_DEPLOYMENT_README.md](HETZNER_DEPLOYMENT_README.md)** (5 мин)
   - Обзор процесса
   - Быстрый старт
   - Основные команды

2. **[DEPLOYMENT_STEP_BY_STEP.md](DEPLOYMENT_STEP_BY_STEP.md)** (20 мин)
   - Пошаговая инструкция
   - Все шаги от A до Z
   - Скриншоты и примеры

3. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** (5 мин)
   - Убедитесь, что ничего не пропустили
   - Проверка на каждом этапе

4. **[DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md)** (10 мин)
   - Как все устроено
   - Архитектура системы
   - Структура директорий

---

## Для разных ситуаций

### 🚀 Уже развертываю прямо сейчас
→ [DEPLOYMENT_STEP_BY_STEP.md](DEPLOYMENT_STEP_BY_STEP.md)

### 📖 Мне нужна полная информация
→ [DEPLOYMENT_HETZNER.md](DEPLOYMENT_HETZNER.md)

### 🔧 Забыл команду
→ [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md)

### ❌ Что-то пошло не так
→ [DEPLOYMENT_HETZNER.md#решение-проблем](DEPLOYMENT_HETZNER.md#решение-проблем)

### 🏗️ Хочу понять архитектуру
→ [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md)

### ✅ Завершаю развертывание
→ [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

## Все документы

| Документ | Размер | Время чтения | Для кого | Ссылка |
|----------|--------|----------|----------|--------|
| **README** | 5 KB | 5 мин | Все | [HETZNER_DEPLOYMENT_README.md](HETZNER_DEPLOYMENT_README.md) |
| **Step-by-Step** | 20 KB | 20 мин | Новички | [DEPLOYMENT_STEP_BY_STEP.md](DEPLOYMENT_STEP_BY_STEP.md) |
| **Full Guide** | 15 KB | 30 мин | Опытные | [DEPLOYMENT_HETZNER.md](DEPLOYMENT_HETZNER.md) |
| **Commands** | 10 KB | 10 мин | Все | [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) |
| **Checklist** | 12 KB | 5 мин | Все | [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) |
| **Architecture** | 18 KB | 15 мин | Архитекторы | [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md) |
| **Навигация** | Вы здесь | 5 мин | Все | [DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md) |

---

## Файлы для развертывания

### 🔧 Конфигурационные

- **`.env.hetzner`** - Переменные окружения для production
- **`ecosystem.config.js`** - Конфигурация PM2
- **`nginx.conf`** - Конфигурация Nginx и SSL

### 📜 Скрипты

- **`deploy.sh`** - Главный скрипт развертывания (запустить один раз)
- **`update.sh`** - Обновление приложения
- **`backup.sh`** - Создание резервных копий
- **`check-status.sh`** - Проверка здоровья
- **`security-setup.sh`** - Безопасность и автоматизация

---

## Быстрые ссылки

### Создание сервера
- [Hetzner Cloud Console](https://console.hetzner.cloud)
- [Hetzner Pricing](https://www.hetzner.com/cloud)

### Telegram
- [@BotFather](https://t.me/botfather) - Создание бота
- [Telegram WebApp Docs](https://core.telegram.org/bots/webapps)

### Регистраторы доменов
- [Namecheap](https://www.namecheap.com)
- [GoDaddy](https://www.godaddy.com)
- [Cloudflare Domains](https://www.cloudflare.com/products/registrar)

### SSL Сертификаты
- [Let's Encrypt](https://letsencrypt.org)
- [Certbot Docs](https://certbot.eff.org)

### Документация
- [Node.js Docs](https://nodejs.org/docs)
- [Express Docs](https://expressjs.com)
- [React Docs](https://react.dev)
- [Nginx Docs](https://nginx.org/en/docs)
- [PM2 Docs](https://pm2.keymetrics.io)

---

## Команды для быстрого копирования

### SSH на сервер
```bash
ssh root@YOUR_SERVER_IP
```

### Копирование файлов на сервер
```bash
scp deploy.sh .env.hetzner ecosystem.config.js nginx.conf security-setup.sh root@YOUR_SERVER_IP:/tmp/
```

### Запуск развертывания
```bash
cd /tmp && chmod +x deploy.sh && bash deploy.sh
```

### Проверка статуса
```bash
pm2 status
pm2 logs
```

### Обновление .env
```bash
nano /home/cave-game/.env
pm2 restart ecosystem.config.js
```

---

## Часто задаваемые вопросы

**Q: Где скачать все файлы?**  
A: Все файлы находятся в корне проекта (`d:\cave-game\`)

**Q: Сколько это стоит?**  
A: Hetzner CPX11 стоит ~$5.49/месяц + домен (~$10/год)

**Q: Как часто обновлять приложение?**  
A: Когда вам нужно. Git hook автоматизирует процесс.

**Q: Нужно ли постоянно следить за сервером?**  
A: Нет! Настроены автоматические обновления и резервные копии.

**Q: Что делать если сервер упадет?**  
A: PM2 автоматически перезапустит приложение

**Q: Как восстановиться из резервной копии?**  
A: Смотрите раздел "Резервное копирование" в [DEPLOYMENT_HETZNER.md](DEPLOYMENT_HETZNER.md)

**Q: Как добавить базу данных?**  
A: Смотрите раздел "Масштабирование" в [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md)

---

## Рекомендуемый порядок чтения

### Для начинающих (1 час)
1. Этот файл (5 мин)
2. [HETZNER_DEPLOYMENT_README.md](HETZNER_DEPLOYMENT_README.md) (10 мин)
3. [DEPLOYMENT_STEP_BY_STEP.md](DEPLOYMENT_STEP_BY_STEP.md) (30 мин)
4. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) (5 мин)
5. Затем развертывание (10 мин)

### Для опытных (30 мин)
1. [HETZNER_DEPLOYMENT_README.md](HETZNER_DEPLOYMENT_README.md) (5 мин)
2. [DEPLOYMENT_HETZNER.md](DEPLOYMENT_HETZNER.md) (15 мин)
3. Затем развертывание (10 мин)

### Для администраторов (45 мин)
1. [DEPLOYMENT_HETZNER.md](DEPLOYMENT_HETZNER.md) (15 мин)
2. [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md) (20 мин)
3. [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) (10 мин)

---

## Подсказки и советы

💡 **Сохраните эту страницу в закладки!**

💡 **Создайте текстовый файл со своей информацией:**
```
Сервер: YOUR_SERVER_IP
Домен: your-domain.com
Бот: @your_bot_username
Токен: (сохранить безопасно!)
```

💡 **Когда что-то не работает:**
1. Проверьте логи: `pm2 logs`
2. Перезагрузитесь: `pm2 restart ecosystem.config.js`
3. Проверьте ошибки: `nginx -t`
4. Погуглите ошибку
5. Спросите в ChatGPT
6. Спросите в GitHub Issues

💡 **Hetzner - это огонь!** 🔥

---

## Что дальше после развертывания?

### Сегодня
- ✅ Развернуть приложение
- ✅ Проверить что все работает
- ✅ Пригласить тестировщиков

### На этой неделе
- 📝 Собрать отзывы
- 🐛 Исправить баги
- ⚡ Оптимизировать

### На следующей неделе
- 🚀 Публичный запуск
- 📢 Маркетинг
- 📊 Аналитика

---

## Контакты и поддержка

- **GitHub Issues**: [cave-game/issues](https://github.com/your-username/cave-game/issues)
- **Hetzner Support**: [support.hetzner.com](https://support.hetzner.com)
- **Telegram**: [@your_bot_username](https://t.me/your_bot_username)

---

## История изменений

- **v1.0** (Dec 2024) - Первая версия документации
  - ✅ Все файлы для развертывания
  - ✅ Пошаговые инструкции
  - ✅ Справочник команд
  - ✅ Чек-листы

---

## Лицензия и условия использования

Эта документация предоставляется как есть. Используйте на свой риск.

Все компоненты используют open-source лицензии:
- Express: MIT
- React: MIT
- PM2: MIT/Commerce
- Nginx: BSD
- Node.js: MIT

---

**Последнее обновление**: Декабрь 2024  
**Версия документации**: 1.0  
**Статус**: ✅ Production Ready  

Готовы начать? 🚀

→ [Перейдите к HETZNER_DEPLOYMENT_README.md](HETZNER_DEPLOYMENT_README.md)

или

→ [Перейдите прямо к пошаговому гайду](DEPLOYMENT_STEP_BY_STEP.md)
