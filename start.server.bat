@echo off
chcp 65001 >nul
cd /d "C:\Users\CH 560\Desktop\All\Универ\Предметы\IT предметы\Базы Данных\trade-project\trade-app"

echo Выберите режим запуска:
echo 1 - Production (npm start)
echo 2 - Development (npm run dev)
echo.
set /p choice="Введите номер: "

if "%choice%"=="1" (
    echo Запуск в режиме Production...
    npm start
) else if "%choice%"=="2" (
    echo Запуск в режиме Development...
    npm run dev
) else (
    echo Неверный выбор, запуск по умолчанию...
    npm start
)

pause