param(
    [switch]$SkipAdmin,
    [switch]$SkipIonic
)

$ErrorActionPreference = 'Stop'

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

Write-Host "Checking prerequisites..." -ForegroundColor Cyan
Assert-Command node
Assert-Command npm
Assert-Command java
Assert-Command mvn

$root = Split-Path -Parent $PSScriptRoot

if (-not $SkipIonic) {
    Write-Host "Installing Ionic app dependencies..." -ForegroundColor Cyan
    Push-Location (Join-Path $root "ionic-app")
    npm install
    Pop-Location
}

if (-not $SkipAdmin) {
    Write-Host "Installing admin panel dependencies..." -ForegroundColor Cyan
    Push-Location (Join-Path $root "admin-panel")
    npm install
    Pop-Location
}

Write-Host "Setup complete." -ForegroundColor Green
