param(
  [int]$Port = 5183
)

$ErrorActionPreference = "Stop"
$ViewerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $ViewerDir ".roba-viewer.pid"
$OutLog = Join-Path $ViewerDir ".roba-viewer.out.log"
$ErrLog = Join-Path $ViewerDir ".roba-viewer.err.log"
$Url = "http://127.0.0.1:$Port/"

function Test-PortOpen {
  param([int]$TargetPort)
  $client = New-Object Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect("127.0.0.1", $TargetPort, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(300)) { return $false }
    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Test-ProcessAlive {
  param([int]$ProcessId)
  try {
    $process = Get-Process -Id $ProcessId -ErrorAction Stop
    return -not $process.HasExited
  } catch {
    return $false
  }
}

if ((Test-Path $PidFile) -and (Test-PortOpen -TargetPort $Port)) {
  $existingPid = (Get-Content -Raw $PidFile).Trim()
  if ($existingPid -match "^\d+$" -and (Test-ProcessAlive -ProcessId ([int]$existingPid))) {
    Start-Process $Url
    Write-Host "roBa Keymap Viewer is already running: $Url"
    exit 0
  }
}

if (-not (Test-Path (Join-Path $ViewerDir "node_modules"))) {
  Write-Host "node_modules is missing."
  Write-Host "Run this once first:"
  Write-Host "  cd tools\roba-keymap-viewer"
  Write-Host "  npm install"
  pause
  exit 1
}

if (Test-PortOpen -TargetPort $Port) {
  Start-Process $Url
  Write-Host "Port $Port is already in use. Opened $Url"
  exit 0
}

$process = Start-Process -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "$Port") `
  -WorkingDirectory $ViewerDir `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError $ErrLog `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $PidFile -Value $process.Id -Encoding ASCII

$ready = $false
for ($i = 0; $i -lt 30; $i += 1) {
  Start-Sleep -Milliseconds 500
  if (Test-PortOpen -TargetPort $Port) {
    $ready = $true
    break
  }
}

if ($ready) {
  Start-Process $Url
  Write-Host "Started roBa Keymap Viewer: $Url"
  Write-Host "Use stop-roba-viewer.cmd to stop it."
  exit 0
}

Write-Host "Viewer did not become ready. Check logs:"
Write-Host "  $OutLog"
Write-Host "  $ErrLog"
pause
exit 1
