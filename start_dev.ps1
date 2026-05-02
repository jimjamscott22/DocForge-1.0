# Navigate to the web directory relative to this script
Set-Location -Path "$PSScriptRoot\web"

Write-Host "Starting DocForge Development Server..." -ForegroundColor Green
Write-Host "Running npm install (just in case)..." -ForegroundColor Cyan
npm install

Write-Host "Starting the app..." -ForegroundColor Green
npm run dev

# Keep the window open if the app crashes or stops
Write-Host "Press any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
