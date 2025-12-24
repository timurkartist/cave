# 🚀 Быстрый справочник команд Hetzner

## SSH подключение

```bash
# Базовое подключение
ssh root@192.0.2.1

# С SSH ключом
ssh -i "путь/к/ключу" root@192.0.2.1

# С кастомным портом
ssh -p 2222 root@192.0.2.1
```

## PM2 - Управление приложением

```bash
# Статус приложения
pm2 status

# Просмотр логов (все процессы)
pm2 logs

# Логи конкретного процесса
pm2 logs cave-game-api
pm2 logs cave-game-frontend

# Следить за логами в реальном времени
pm2 monit

# Просмотр информации о процессе
pm2 describe cave-game-api

# Перезапуск приложения
pm2 restart ecosystem.config.js

# Остановка
pm2 stop ecosystem.config.js

# Запуск
pm2 start ecosystem.config.js

# Полностью удалить
pm2 delete ecosystem.config.js
pm2 save
```

## Nginx - Веб-сервер

```bash
# Проверить синтаксис конфига
nginx -t

# Перезагрузить конфиг
systemctl reload nginx

# Перезапустить Nginx
systemctl restart nginx

# Остановить Nginx
systemctl stop nginx

# Запустить Nginx
systemctl start nginx

# Статус Nginx
systemctl status nginx

# Просмотреть логи ошибок
tail -f /var/log/nginx/error.log

# Просмотреть логи доступа
tail -f /var/log/nginx/access.log
```

## SSL - Сертификаты

```bash
# Список сертификатов
certbot certificates

# Обновить сертификат
certbot renew

# Сухой запуск (проверка)
certbot renew --dry-run

# Обновить конкретный домен
certbot renew --cert-name your-domain.com

# Удалить сертификат
certbot delete --cert-name your-domain.com

# Посмотреть дату истечения
openssl x509 -enddate -noout -in /etc/letsencrypt/live/your-domain.com/cert.pem
```

## Системные команды

```bash
# Обновить систему
apt-get update
apt-get upgrade -y

# Просмотр использования памяти
free -h

# Просмотр использования диска
df -h

# Просмотр процессов Node.js
ps aux | grep node

# Просмотр открытых портов
netstat -tlnp

# Проверить порт 3001
netstat -tlnp | grep 3001
```

## Развертывание

```bash
# Обновить приложение
cd /home/cave-game && bash update.sh

# Создать резервную копию
bash backup.sh

# Проверить здоровье приложения
bash check-status.sh your-domain.com

# Настроить автоматическое обновление и безопасность
bash security-setup.sh
```

## Работа с Git

```bash
# Проверить статус
git status

# Просмотр истории коммитов
git log --oneline -n 20

# Обновить код
git pull origin main

# Откатить последний коммит
git reset --hard HEAD~1

# Переключиться на конкретный коммит
git checkout abc123def
```

## Работа с переменными окружения

```bash
# Редактировать .env
nano /home/cave-game/.env

# Просмотр содержимого .env
cat /home/cave-game/.env

# Добавить переменную
echo "NEW_VAR=value" >> /home/cave-game/.env

# Перезагрузить приложение после изменения .env
pm2 restart ecosystem.config.js
```

## Диагностика проблем

```bash
# Проверить, слушает ли приложение на портах
lsof -i :3000,3001

# Проверить DNS
nslookup your-domain.com

# Проверить доступ на порт 80
curl -i http://localhost

# Проверить доступ на порт 443
curl -i https://localhost

# Проверить API endpoint
curl https://your-domain.com/health

# Проверить WebSocket
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
  -H "Sec-WebSocket-Version: 13" \
  wss://your-domain.com/ws
```

## Сетевые команды

```bash
# Тест соединения с сервером
ping -c 4 your-domain.com

# Трассировка маршрута
traceroute your-domain.com

# Проверка доступности портов
nc -zv your-domain.com 80
nc -zv your-domain.com 443

# Получить информацию о домене
whois your-domain.com
```

## Файловая система

```bash
# Список файлов в папке
ls -la /home/cave-game

# Размер папки
du -sh /home/cave-game

# Найти большие файлы
find /home/cave-game -size +100M

# Удалить старые файлы
find /home/cave-game -name "*.log" -mtime +7 -delete

# Изменить права доступа
chmod 755 /home/cave-game/deploy.sh

# Изменить владельца файла
chown root:root /home/cave-game/file.txt
```

## Мониторинг системы

```bash
# Интерактивный монитор системы
top

# Расширенная статистика
htop

# Мониторинг в PM2
pm2 monit

# Статистика сети
iftop

# Просмотр активных соединений
ss -tulpn
```

## Резервное копирование и восстановление

```bash
# Создать резервную копию вручную
tar -czf ~/backups/cave-game-$(date +%Y%m%d).tar.gz /home/cave-game

# Восстановить из резервной копии
tar -xzf ~/backups/cave-game-20240101.tar.gz -C /

# Список резервных копий
ls -lah ~/backups/

# Размер всех резервных копий
du -sh ~/backups/*
```

## Документирование команд

```bash
# Сохранить вывод команды в файл
pm2 logs > ~/logs/current_logs.txt 2>&1

# Создать лог файл с меткой времени
date > ~/logs/deployment-$(date +%Y%m%d-%H%M%S).log

# Append вывод в существующий файл
pm2 status >> ~/logs/status.log
```

## Полезные советы

```bash
# Быстро перейти в папку приложения
cd /home/cave-game

# Посмотреть последние 50 строк лога
pm2 logs --lines 50

# Очистить экран
clear

# Поиск текста в файлах
grep -r "search_text" /home/cave-game/

# Подсчитать количество файлов
find /home/cave-game -type f | wc -l

# Просмотр недавно измененных файлов
find /home/cave-game -type f -mtime -1

# Запланировать команду
at 23:00 tomorrow << 'EOF'
/home/cave-game/backup.sh
EOF
```

## Экстренные команды

```bash
# Если нужно быстро остановить приложение
pm2 kill

# Если нужно перезагрузить сервер
reboot

# Если нужно выключить сервер
shutdown -h now

# Закончить процесс по PID
kill -9 PID_NUMBER

# Убить все Node процессы
killall node

# Перезагрузить за N минут с сообщением
shutdown -r +30 "Server maintenance"

# Отменить перезагрузку
shutdown -c
```

---

**Совет**: Сохраните этот файл в закладках для быстрого доступа к командам!
