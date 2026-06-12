@echo off
echo ========================================
echo    AgroVerse - Локальный запуск
echo ========================================
echo.

REM Проверить Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Docker не установлен!
    echo Скачай Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [1/3] Запускаем базу данных и бэкенд...
cd "agroverse back"
docker-compose up -d --build
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось запустить Docker контейнеры
    pause
    exit /b 1
)

echo.
echo [2/3] Ждем запуска сервера (15 сек)...
timeout /t 15 /nobreak >nul

echo.
echo [3/3] Открываем фронтенд...
cd "..\agroverse front"
start "" index.html

echo.
echo ========================================
echo  Готово!
echo  Бэкенд: http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo  Фронтенд: открыт в браузере
echo ========================================
echo.
echo Для остановки: cd "agroverse back" && docker-compose down
pause
