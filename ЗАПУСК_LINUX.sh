#!/bin/bash
echo "========================================"
echo "   AgroVerse - Локальный запуск"
echo "========================================"
echo ""

# Проверить Docker
if ! command -v docker &> /dev/null; then
    echo "[ОШИБКА] Docker не установлен!"
    echo "Установи Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "[1/3] Запускаем базу данных и бэкенд..."
cd "agroverse back"
docker compose up -d --build

if [ $? -ne 0 ]; then
    echo "[ОШИБКА] Не удалось запустить контейнеры"
    exit 1
fi

echo ""
echo "[2/3] Ждем запуска сервера (15 сек)..."
sleep 15

echo ""
echo "[3/3] Открываем фронтенд..."
cd "../agroverse front"

# Открыть браузер
if command -v xdg-open &> /dev/null; then
    xdg-open index.html
elif command -v open &> /dev/null; then
    open index.html
fi

echo ""
echo "========================================"
echo " Готово!"
echo " Бэкенд:  http://localhost:8000"
echo " API Docs: http://localhost:8000/docs"
echo " Фронтенд: agroverse front/index.html"
echo "========================================"
echo ""
echo "Для остановки: cd 'agroverse back' && docker compose down"
