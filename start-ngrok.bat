@echo off
REM ===== ngrok CLI запуск для Windows =====
REM Этот скрипт запускает ngrok с custom domain cave.ngrok.app
REM 
REM Требования:
REM   1. ngrok установлен (https://ngrok.com/download)
REM   2. В PATH добавлен путь к ngrok.exe
REM   3. Запущены: backend (3001) и frontend (3000)

REM Цвета для вывода
setlocal enabledelayedexpansion

cls
echo.
echo ========================================
echo   NGROK LAUNCHER - cave.ngrok.app
echo ========================================
echo.

REM Проверяем установку ngrok
where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] ngrok не найден в PATH
    echo.
    echo Решение:
    echo   1. Скачайте ngrok: https://ngrok.com/download
    echo   2. Распакуйте ngrok.exe в папку, которая в PATH
    echo      Или добавьте папку с ngrok в PATH вручную
    echo   3. Откройте новый терминал и попробуйте снова
    echo.
    pause
    exit /b 1
)

REM Проверяем что сервера запущены
echo [INFO] Проверяю подключение к серверам...
timeout /t 1 /nobreak >nul

echo.
echo [INFO] Запускаю ngrok tunnels...
echo.
echo   Фронтенд (3000):  http://localhost:3000
echo   Бэкенд (3001):    http://localhost:3001
echo.
echo   Custom domain:    cave.ngrok.app
echo.

REM Запускаем ngrok для двух портов
REM ВАЖНО: это зависит от плана ngrok (free/pro)
REM Бесплатный план позволяет только ОДН туннель

echo [ВАЖНО] Бесплатный ngrok позволяет только ОДИН туннель!
echo        Используем фронтенд (порт 3000)
echo.

ngrok http --url=cave.ngrok.app 3000

pause
