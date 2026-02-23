<#
.SYNOPSIS
    SocialFlow Bootstrapper
#>

$ErrorActionPreference = 'Stop'

if ($MyInvocation.MyCommand.Path) {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
}
else {
    $scriptPath = $PWD.Path
}
Set-Location $scriptPath

Write-Host ">>> Initializing SNA Boot Sequence..." -ForegroundColor Cyan

# Phase 1: Port Cleanup
$TargetPorts = @(8000, 5173)

foreach ($port in $TargetPorts) {
    Try {
        $blockingProcess = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($blockingProcess) {
            Write-Host "[WARN] Port $port blocked. Terminating PID: $($blockingProcess.OwningProcess)..." -ForegroundColor Yellow
            Stop-Process -Id $blockingProcess.OwningProcess -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }
    Catch {
        # ignore
    }
}
Write-Host "[OK] Network clear." -ForegroundColor Green

# Phase 2: Dependencies
$Modules = @(
    @{ Name = "Backend"; Path = ".\backend" },
    @{ Name = "Frontend"; Path = ".\frontend" }
)

foreach ($mod in $Modules) {
    Set-Location -Path (Join-Path $scriptPath $mod.Path)
    if (-not (Test-Path "node_modules")) {
        Write-Host ">>> Missing $($mod.Name) modules. Executing npm install..." -ForegroundColor Yellow
        npm install --silent
    }
    Set-Location $scriptPath
}
Write-Host "[OK] Dependencies verified." -ForegroundColor Green

# Phase 3: Launch
Write-Host ">>> Spawning microservices..." -ForegroundColor Cyan

Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd backend; npx tsx db/init.ts; npx tsx server.ts" -WindowStyle Normal
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd frontend; npx vite --port 5173 --force" -WindowStyle Normal

Write-Host "[READY] System processes launched." -ForegroundColor Green
Write-Host "-> Portal:  http://localhost:5173" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "-> API Health: http://localhost:8000/api/system/overview" -ForegroundColor DarkGray
