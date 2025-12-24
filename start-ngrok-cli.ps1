# ===== ngrok CLI Launcher =====
# Запускает ngrok туннель с custom domain cave.ngrok.app
# Требует: ngrok установлен и authtoken настроен

# Добавляем ngrok в PATH этого процесса
$env:Path += ";C:\ngrok"

Write-Host ""
Write-Host "╔════════════════════════════════════╗"
Write-Host "║  NGROK CLI LAUNCHER                ║"
Write-Host "║  cave.ngrok.app                    ║"
Write-Host "╚════════════════════════════════════╝"
Write-Host ""

# Проверяем ngrok
Write-Host "✓ Проверяю ngrok..."
try {
    $version = & ngrok --version
    Write-Host "✓ ngrok $version"
} catch {
    Write-Host "✗ ngrok не найден!"
    Write-Host "  Установите: https://ngrok.com/download"
    exit 1
}

# Проверяем что сервера запущены
Write-Host ""
Write-Host "✓ Убедитесь что запущены:"
Write-Host "  • Фронтенд:  npm run dev          (порт 3000)"
Write-Host "  • Бэкенд:    node server.js       (порт 3001)"
Write-Host ""

Write-Host "⏳ Запускаю ngrok туннель..."
Write-Host ""

# ===== Опция 1: Использовать custom domain (требует PRO) =====
# ngrok http --url=cave.ngrok.app 3000

# ===== Опция 2: Бесплатный тоннель (рекомендуется) =====
# Запускаем на порте 3000 (фронтенд)
& ngrok http 3000

