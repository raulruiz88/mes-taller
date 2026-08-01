@echo off
title Publicar Cambios - MES Taller
echo ===================================================
echo    PUBLICANDO CAMBIOS EN GITHUB Y VERCEL...
echo ===================================================
echo.
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Actualizacion MES Taller - Notificaciones, Gastos, Doble Fecha Admin y Roles"
"C:\Program Files\Git\cmd\git.exe" push -u origin main -f
echo.
echo ===================================================
echo   [OK] !Cambios enviados a GitHub y Vercel!
echo ===================================================
pause
