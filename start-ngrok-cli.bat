@echo off
REM ===== NGROK CLI LAUNCHER =====
REM Запускает ngrok туннель для cave.ngrok.app
REM

cls
echo.
echo ========================================
echo   NGROK CLI LAUNCHER
echo   cave.ngrok.app
echo ========================================
echo.

REM Добавляем ngrok в PATH
set PATH=%PATH%;C:\ngrok

REM Проверяем ngrok
where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] ngrok не найден!
    echo.
    echo Решение:
    echo   1. Скачайте: https://ngrok.com/download
    echo   2. Распакуйте в: C:\ngrok
    echo   3. Или установите через Package Manager
    echo.
    pause
    exit /b 1
)

REM Показываем версию
echo [INFO] Проверка ngrok...
ngrok --version
echo.

REM Убедяемся что сервера запущены
echo [INFO] Убедитесь что запущены:
echo        • Фронтенд:  npm run dev          (порт 3000)
echo        • Бэкенд:    node server.js       (порт 3001)
echo.

REM Запускаем бесплатный туннель
echo [INFO] Запускаю ngrok туннель...
echo.

REM Опция 1: Туннель на фронтенд (3000) - РЕКОМЕНДУЕТСЯ
ngrok http 3000

REM Опция 2: С custom domain (требует PRO)
REM ngrok http --url=cave.ngrok.app 3000

REM Опция 3: Туннель на бэкенд (3001)
REM ngrok http 3001

pause
