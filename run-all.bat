@echo off
echo ========================================================
echo Starting Lakshya AI Career Platform (Backend + Frontend)
echo ========================================================

echo Starting FastAPI Backend on http://127.0.0.1:10000 ...
start "Lakshya AI - Backend" cmd /k "cd lakshyaai-backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 10000 --reload"

timeout /t 3 /nobreak >nul

echo Starting Vite React Frontend on http://127.0.0.1:5173 ...
start "Lakshya AI - Frontend" cmd /k "npm run dev"

echo.
echo Both servers started!
echo Frontend: http://127.0.0.1:5173
echo Backend:  http://127.0.0.1:10000 (API Docs: http://127.0.0.1:10000/docs)
echo ========================================================
