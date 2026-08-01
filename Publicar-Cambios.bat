@echo off
echo ===================================================
echo 🚀 PUBLICANDO ACTUALIZACIONES A VERCEL PROD...
echo ===================================================
echo.
npx vercel login
echo.
npx vercel --prod --yes
echo.
echo ===================================================
echo ✅ PROCESO COMPLETADO. Tu PWA esta actualizada.
echo ===================================================
pause
