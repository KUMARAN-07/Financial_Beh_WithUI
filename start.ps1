# Starting Financial Risk Management System
Write-Host "Starting Financial Risk Management System..." -ForegroundColor Green

# Start Backend
$backendJob = Start-Process powershell -ArgumentList "-Command cd '$PSScriptRoot\financial_risk'; python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000" -PassThru -WindowStyle Normal

# Start Frontend
$env:PORT = 3001
$frontendJob = Start-Process powershell -ArgumentList "-Command cd '$PSScriptRoot'; npm start" -PassThru -WindowStyle Normal

Write-Host "Both services started! Access the dashboard at http://localhost:3001" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the services" -ForegroundColor Yellow

# Wait for user to press Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # Clean up processes when script is terminated
    if (-not $backendJob.HasExited) { Stop-Process -Id $backendJob.Id -Force }
    if (-not $frontendJob.HasExited) { Stop-Process -Id $frontendJob.Id -Force }
    Write-Host "Services stopped." -ForegroundColor Red
} 