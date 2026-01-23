#!/usr/bin/env pwsh
# Restart Development Services Script
# This script safely stops running services, regenerates Prisma Client, and restarts development servers

Write-Host "🛑 Stopping Development Services..." -ForegroundColor Yellow

# Find and stop Node processes related to this project
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*$PWD*" -or $_.CommandLine -like "*$PWD*"
}

if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node process(es) to stop..." -ForegroundColor Cyan
    $nodeProcesses | ForEach-Object {
        Write-Host "  Stopping process $($_.Id)..." -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "No active Node processes found." -ForegroundColor Gray
}

# Clean up Prisma Client
Write-Host ""
Write-Host "🧹 Cleaning Prisma Client..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Path "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Removed node_modules\.prisma" -ForegroundColor Green
}

if (Test-Path "node_modules\@prisma\client") {
    Remove-Item -Path "node_modules\@prisma\client" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Removed node_modules\@prisma\client" -ForegroundColor Green
}

# Regenerate Prisma Client
Write-Host ""
Write-Host "🔄 Regenerating Prisma Client..." -ForegroundColor Yellow
$generateResult = npx prisma generate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Prisma Client generated successfully!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Failed to generate Prisma Client!" -ForegroundColor Red
    Write-Host $generateResult
    exit 1
}

# Restart Development Server
Write-Host ""
Write-Host "🚀 Starting Development Services..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting dev server..." -ForegroundColor Cyan
Write-Host "To start Prisma Studio, run: npm run prisma:studio" -ForegroundColor Cyan
Write-Host ""

# Start dev server
npm run dev
