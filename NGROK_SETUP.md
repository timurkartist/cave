# 🌐 Ngrok CLI - Установка и использование

## Проблема

Команда `ngrok http --url=cave.ngrok.app 80` не работает потому что:
- ❌ `ngrok` CLI не установлен на компьютере
- ❌ Нет в переменной окружения PATH
- ❌ Попытка использовать порт 80 (требует администратора)

## Решение

### Вариант 1: Использовать Node.js скрипт (РЕКОМЕНДУЕТСЯ)

Это уже сделано в проекте! Просто запустите:

```bash
npm run start:ngrok
```

✅ **Преимущества:**
- Не нужно ничего устанавливать
- Автоматически настраивает оба туннеля (3000 и 3001)
- Работает на всех ОС (Windows, Mac, Linux)
- Заполняет `.env` автоматически

---

### Вариант 2: Установить ngrok CLI (если очень нужно)

#### Шаг 1: Скачайте ngrok

https://ngrok.com/download

Выберите версию для Windows (ngrok-v3-stable-windows-amd64.zip)

#### Шаг 2: Распакуйте

```
C:\ngrok\
  └── ngrok.exe
```

#### Шаг 3: Добавьте в PATH

**Способ A: Временно (на эту сессию)**
```powershell
$env:Path += ";C:\ngrok"
ngrok --version
```

**Способ B: Навсегда (через GUI)**
1. Нажмите `Win + Pause`
2. "Дополнительные параметры системы"
3. "Переменные окружения"
4. Найдите `Path` в "Переменные среды"
5. Нажмите "Изменить"
6. Добавьте: `C:\ngrok`
7. OK, OK, перезагрузитесь

**Способ C: Навсегда (PowerShell)**
```powershell
# Запустите как администратор:
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\ngrok", "User")
```

#### Шаг 4: Используйте

Откройте новый терминал и команда будет работать:

```bash
ngrok http --url=cave.ngrok.app 3000
```

---

## ⚠️ Ограничение: Custom Domain требует PRO

Бесплатный ngrok **НЕ поддерживает** custom domains как `cave.ngrok.app`.

Custom domain дает:
- 🎁 Одна определенная доменная зона
- 💰 Стоит $5-10/месяц
- 🔐 Более надежно для production

Без PRO вам будут давать случайные домены типа:
- `https://a1b2c3d4e5f6.ngrok-free.dev`

### Как использовать cave.ngrok.app

**Вариант 1: Бесплатно - использовать случайный domain**
```bash
ngrok http 3000
```
Будет: `https://random-string.ngrok-free.dev`

**Вариант 2: Проф - купить PRO аккаунт**
1. https://ngrok.com/pricing
2. Выбрать план PRO
3. В дашбоарде зарезервировать `cave.ngrok.app`
4. Тогда команда сработает:
```bash
ngrok http --url=cave.ngrok.app 3000
```

---

## 🎯 Итог - что делать

| Ситуация | Решение |
|----------|---------|
| Хочу быстро запустить | `npm run start:ngrok` |
| Хочу использовать CLI | Установите ngrok по инструкции выше |
| Нужен постоянный domain | Купите PRO ngrok + зарезервируйте domain |
| Развиваю локально | Используйте `http://localhost:3000` и `3001` |

---

## 🔧 Текущий setup

Проект использует **Node.js ngrok library** (`@ngrok/ngrok`):

```javascript
// start-ngrok.js
const tunnel = await ngrok.connect({
  addr: 'http://localhost:3000',
  authtoken: process.env.NGROK_AUTHTOKEN,
  proto: 'http',
  domain: 'cave.ngrok.app'  // ← Попытается использовать если доступно
});
```

Если domain недоступен (нет PRO), скрипт падает, но можем это исправить fallback.

---

## 🚀 Быстрый старт

```bash
# Просто запустите
npm run start:ngrok

# Готово! URL будет выводиться в консоль
```

**Вопросы?** Смотрите [NETWORK_SETUP.md](NETWORK_SETUP.md)
