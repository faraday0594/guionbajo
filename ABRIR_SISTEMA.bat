@echo off
title Guionbajo - Sistema de Aprendizaje con Inteligencia Artificial

cls
echo ===================================================================
echo   GUIONBAJO - LANZADOR AUTOMATICO DEL SISTEMA
echo ===================================================================
echo.
echo  [1/3] Iniciando Servidor Backend (FastAPI en puerto 8000)...
start "Guionbajo Backend" /d "%~dp0backend" cmd /k "python main.py"

echo.
echo  [2/3] Iniciando Servidor Frontend (Next.js en puerto 3000)...
start "Guionbajo Frontend" /d "%~dp0frontend" cmd /k "npm run dev"

echo.
echo  [3/3] Esperando inicializacion de servicios y abriendo navegador...
ping 127.0.0.1 -n 5 >nul
start http://localhost:3000

echo.
echo ===================================================================
echo   SISTEMA INICIADO CON EXITO!
echo.
echo  - Frontend Web UI:  http://localhost:3000
echo  - Backend API:     http://localhost:8000
echo  - Documentacion:   http://localhost:8000/docs
echo ===================================================================
echo.
echo  Las consolas del Backend y Frontend se estan ejecutando.
echo  Puedes minimizar esta ventana. Para apagar el sistema, cierra
echo  las ventanas de comandos creadas.
echo.
pause
