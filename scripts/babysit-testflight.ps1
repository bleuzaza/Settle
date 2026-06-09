# Surveille Settle TestFlight, extrait les erreurs, relance le workflow.
# Usage:
#   .\scripts\babysit-testflight.ps1              # attend la fin du dernier run
#   .\scripts\babysit-testflight.ps1 -Trigger       # lance un nouveau run puis surveille
#   .\scripts\babysit-testflight.ps1 -RunId 123   # surveille un run précis

param(
  [string]$Repo = "bleuzaza/Settle",
  [string]$Workflow = "settle-testflight.yml",
  [string]$RunId = "",
  [switch]$Trigger,
  [int]$PollSeconds = 30,
  [int]$MaxMinutes = 90
)

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\Git\bin;C:\Program Files\GitHub CLI;" + $env:Path
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LogDir = Join-Path $Root "Output"
$LogFile = Join-Path $LogDir "testflight-latest-failure.log"

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Report-Failure {
  param([string]$Url)
  $errors = Select-String -Path $LogFile -Pattern "error:|::error|altool.*ERROR" -ErrorAction SilentlyContinue | Select-Object -Last 25
  Write-Host "`n--- Dernieres erreurs ---" -ForegroundColor Yellow
  if ($errors) { $errors | ForEach-Object { Write-Host $_.Line } }
  Write-Host "`nLog: $LogFile" -ForegroundColor Yellow
  Write-Host "URL: $Url" -ForegroundColor Yellow
}

function Get-LatestRun {
  param([string]$Status = "")
  $args = @("run", "list", "--repo", $Repo, "--workflow", $Workflow, "--limit", "1", "--json", "databaseId,status,conclusion,url,displayTitle")
  if ($Status) { $args += @("--status", $Status) }
  $json = gh @args | ConvertFrom-Json
  return $json[0]
}

if ($Trigger) {
  Write-Host "Lancement workflow $Workflow..." -ForegroundColor Cyan
  gh workflow run $Workflow --repo $Repo
  Start-Sleep -Seconds 8
}

if (-not $RunId) {
  $run = Get-LatestRun -Status "in_progress"
  if (-not $run) { $run = Get-LatestRun }
  $RunId = $run.databaseId
}

Write-Host "Surveillance run $RunId ($Repo)" -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes($MaxMinutes)

while ((Get-Date) -lt $deadline) {
  $info = gh run view $RunId --repo $Repo --json status,conclusion,url,displayTitle | ConvertFrom-Json
  Write-Host ("[{0}] {1} - {2}" -f (Get-Date -Format "HH:mm:ss"), $info.status, $info.displayTitle)

  if ($info.status -eq "completed") {
    $fullLog = Join-Path $LogDir "testflight-latest-full.log"
    gh run view $RunId --repo $Repo --log 2>&1 | Out-File -FilePath $fullLog -Encoding utf8

    if (Select-String -Path $fullLog -Pattern "altool.*ERROR:|Cannot determine the Apple ID|Aucune app App Store Connect|upload_testflight.*failed|Fastlane.*error" -Quiet) {
      Write-Host "ATTENTION: build OK mais upload TestFlight echoue" -ForegroundColor Yellow
      gh run view $RunId --repo $Repo --log-failed 2>&1 | Out-File -FilePath $LogFile -Encoding utf8
      Report-Failure $info.url
      Write-Host "Action: creer l'app Settle (com.cashthetrain.settle) sur App Store Connect puis relancer RUN-TESTFLIGHT.bat" -ForegroundColor Yellow
      exit 1
    }

    if ($info.conclusion -eq "success") {
      Write-Host "OK - $($info.url)" -ForegroundColor Green
      if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
      exit 0
    }

    Write-Host "ECHEC - extraction des logs..." -ForegroundColor Red
    gh run view $RunId --repo $Repo --log-failed 2>&1 | Out-File -FilePath $LogFile -Encoding utf8
    Report-Failure $info.url
    exit 1
  }

  Start-Sleep -Seconds $PollSeconds
}

Write-Host "Timeout apres $MaxMinutes min - run $RunId encore en cours" -ForegroundColor Red
exit 2
