# ===========================================================
#   AgroVerse - Запуск проекта (Windows PowerShell)
#   Backend (FastAPI + PostgreSQL) + Frontend
# ===========================================================

Set-Location -Path $PSScriptRoot

$BackDir  = Join-Path $PSScriptRoot "agroverse back"
$FrontDir = Join-Path $PSScriptRoot "agroverse front"
$VenvDir  = Join-Path $BackDir "venv"
$VenvPy   = Join-Path $VenvDir "Scripts\python.exe"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "   AgroVerse - Ishga tushirish / Запуск" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

# ----- 1. Python tekshirish -----
Write-Host "[1/4] Python tekshirilmoqda..." -ForegroundColor Yellow
$pythonCmd = $null
foreach ($cmd in @("python", "py", "python3")) {
    try {
        $v = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pythonCmd = $cmd
            Write-Host "      OK: $v ($cmd)" -ForegroundColor Green
            break
        }
    } catch {}
}

if (-not $pythonCmd) {
    Write-Host ""
    Write-Host "[XATO] Python topilmadi!" -ForegroundColor Red
    Write-Host "https://python.org dan yuklab oling" -ForegroundColor Yellow
    Write-Host "O'rnatishda 'Add Python to PATH' belgisini qo'ying!" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Davom etish uchun Enter bosing"
    exit 1
}

# ----- 2. .env faylini tekshirish -----
$envFile = Join-Path $BackDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host ""
    Write-Host "[DIQQAT] .env fayl topilmadi!" -ForegroundColor Red
    Write-Host "  $envFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Quyidagi matnni .env fayliga saqlang:" -ForegroundColor Yellow
    Write-Host "  DATABASE_URL=postgresql://user:password@localhost:5432/agroverse" -ForegroundColor Cyan
    Write-Host "  SECRET_KEY=supersecretkey123" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "PostgreSQL ishlayotganiga ishonch hosil qiling." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Davom etish uchun Enter bosing (yoki .env yaratib qayta ishga tushiring)"
}

# ----- 3. Virtual muhit -----
Write-Host ""
Write-Host "[2/4] Virtual muhit (venv)..." -ForegroundColor Yellow
if (-not (Test-Path $VenvPy)) {
    Write-Host "      Yaratilmoqda..." -ForegroundColor Gray
    & $pythonCmd -m venv "$VenvDir"
    if (-not (Test-Path $VenvPy)) {
        Write-Host "[XATO] venv yaratilmadi!" -ForegroundColor Red
        Read-Host "Enter bosing"
        exit 1
    }
    Write-Host "      Kutubxonalar o'rnatilmoqda (1-2 daqiqa)..." -ForegroundColor Gray
    & $VenvPy -m pip install --upgrade pip -q
    & $VenvPy -m pip install -r (Join-Path $BackDir "requirements.txt") -q
    Write-Host "      OK" -ForegroundColor Green
} else {
    Write-Host "      OK (venv allaqachon bor)" -ForegroundColor Green
}

# ----- 4. Backend alohida oynada -----
Write-Host ""
Write-Host "[3/4] Backend ishga tushirilmoqda (port 8000)..." -ForegroundColor Yellow

$backScript = @"
Set-Location '$BackDir'
Write-Host '=== AgroVerse BACKEND ===' -ForegroundColor Green
Write-Host 'API:   http://127.0.0.1:8000' -ForegroundColor Cyan
Write-Host 'Docs:  http://127.0.0.1:8000/docs' -ForegroundColor Cyan
Write-Host 'Bu oynani yopmang!' -ForegroundColor Yellow
Write-Host ''
& '$VenvPy' -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
Write-Host ''
Write-Host 'Backend toxtadi.' -ForegroundColor Red
Read-Host 'Enter bosing'
"@

$backFile = Join-Path $env:TEMP "agroverse_back_run.ps1"
$backScript | Out-File -FilePath $backFile -Encoding UTF8
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", "`"$backFile`""

Write-Host "      Backend ishi kutilmoqda (6 soniya)..." -ForegroundColor Gray
Start-Sleep -Seconds 6
Write-Host "      OK" -ForegroundColor Green

# ----- 5. Frontend alohida oynada -----
Write-Host ""
Write-Host "[4/4] Frontend ishga tushirilmoqda (port 5500)..." -ForegroundColor Yellow

$frontScript = @"
Set-Location '$FrontDir'
Write-Host '=== AgroVerse FRONTEND ===' -ForegroundColor Green
Write-Host 'Sayt: http://127.0.0.1:5500' -ForegroundColor Cyan
Write-Host 'Bu oynani yopmang!' -ForegroundColor Yellow
Write-Host ''
& '$VenvPy' -m http.server 5500
Write-Host ''
Write-Host 'Frontend toxtadi.' -ForegroundColor Red
Read-Host 'Enter bosing'
"@

$frontFile = Join-Path $env:TEMP "agroverse_front_run.ps1"
$frontScript | Out-File -FilePath $frontFile -Encoding UTF8
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", "`"$frontFile`""

Write-Host "      Kutilmoqda (3 soniya)..." -ForegroundColor Gray
Start-Sleep -Seconds 3
Write-Host "      OK" -ForegroundColor Green

# ----- Brauzer -----
Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "   Tayyor! Brauzer ochilmoqda..." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Sayt:    http://127.0.0.1:5500" -ForegroundColor Cyan
Write-Host "  API:     http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "  Docs:    http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  BACKEND va FRONTEND oynalarini yopmang!" -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:5500"

Read-Host "Bu oynani yopishingiz mumkin (sayt ishlashda davom etadi)"
