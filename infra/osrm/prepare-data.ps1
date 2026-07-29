# Скачивает OSM-данные СКФО (Ингушетия и соседние регионы) и готовит их для OSRM.
# Запуск из корня репозитория:
#   powershell -ExecutionPolicy Bypass -File infra/osrm/prepare-data.ps1
# После подготовки:
#   docker compose --profile osrm up -d osrm

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataDir = Join-Path $ScriptDir 'data'
$DatasetName = 'north-caucasus-fed-district-latest.osm.pbf'
$DatasetPath = Join-Path $DataDir $DatasetName
$DownloadUrl = "https://download.geofabrik.de/russia/$DatasetName"
$OsrmImage = 'ghcr.io/project-osrm/osrm-backend'

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

if (-not (Test-Path $DatasetPath)) {
  Write-Host "Downloading $DownloadUrl ..."
  Invoke-WebRequest -Uri $DownloadUrl -OutFile $DatasetPath
} else {
  Write-Host "Dataset already exists: $DatasetPath"
}

function Invoke-OsrmStep {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Command
  )

  docker run --rm -t -v "${DataDir}:/data" $OsrmImage @Command
}

Write-Host 'Running osrm-extract ...'
Invoke-OsrmStep -Command @('osrm-extract', '-p', '/opt/car.lua', "/data/$DatasetName")

Write-Host 'Running osrm-partition ...'
Invoke-OsrmStep -Command @('osrm-partition', "/data/$DatasetName")

Write-Host 'Running osrm-customize ...'
Invoke-OsrmStep -Command @('osrm-customize', "/data/$DatasetName")

Write-Host 'OSRM data is ready.'
Write-Host 'Start routing server: docker compose --profile osrm up -d osrm'
Write-Host 'Backend env: MAP_ROUTING_PROVIDER=osrm OSRM_BASE_URL=http://localhost:5001'
