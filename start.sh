#!/bin/bash
echo "Starting Financial Risk Management System..."

# Start Backend
cd financial_risk && python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start Frontend
cd ..
npm start &
FRONTEND_PID=$!

echo "Both services started! Access the dashboard at http://localhost:3000"
echo "Press Ctrl+C to stop both services"

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait 