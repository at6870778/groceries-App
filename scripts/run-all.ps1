param(
    [switch]$SkipAdmin
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting backend (8080)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "cd '$root\\backend'; mvn spring-boot:run '-Dspring-boot.run.profiles=dev'"
)

Write-Host "Starting Ionic app (8102)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "cd '$root\\ionic-app'; npx ng serve --host 0.0.0.0 --port 8102"
)

if (-not $SkipAdmin) {
    Write-Host "Starting admin panel (8101)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @(
        '-NoExit',
        '-Command',
        "cd '$root\\admin-panel'; npx ng serve --port 8101"
    )
}

Write-Host "All services launched in new terminals." -ForegroundColor Green
Write-Host "Ionic: http://localhost:8102" -ForegroundColor Yellow
Write-Host "Admin: http://localhost:8101" -ForegroundColor Yellow
Write-Host "Backend: http://localhost:8080" -ForegroundColor Yellow
