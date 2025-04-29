@echo off
echo Starting Financial Risk Management System...

:: Start Backend
start cmd /k "cd financial_risk && python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000"

:: Start Frontend
start cmd /k "set PORT=3001 && npm start"

echo Both services started! Access the dashboard at http://localhost:3001 