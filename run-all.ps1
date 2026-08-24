Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting Lakshya AI Career Platform (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$workspace = $PSScriptRoot

Write-Host "Starting FastAPI Backend on http://127.0.0.1:10000 ..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$workspace\lakshyaai-backend'; & '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --host 127.0.0.1 --port 10000 --reload"

Start-Sleep -Seconds 3

Write-Host "Starting Vite React Frontend on http://127.0.0.1:5173 ..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$workspace'; npm run dev"

Write-Host "`nBoth servers started successfully!" -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:5173" -ForegroundColor Cyan
Write-Host "Backend:  http://127.0.0.1:10000 (Swagger: http://127.0.0.1:10000/docs)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
