# Crée le repo GitHub bleuzaza/Settle (si besoin) et pousse main.

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\Git\bin;C:\Program Files\GitHub CLI;" + $env:Path
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Connexion GitHub requise : gh auth login" -ForegroundColor Yellow
  exit 1
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
  Write-Host "Creation du repo GitHub bleuzaza/Settle..." -ForegroundColor Cyan
  gh repo create bleuzaza/Settle --public --source . --remote origin --description "Settle iOS — décharge mentale (TestFlight comme Panium)"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host "Remote existant: $remote"
}

git push -u origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "OK — https://github.com/bleuzaza/Settle" -ForegroundColor Green
}
