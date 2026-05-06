$ErrorActionPreference = "Stop"
$ViewerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $ViewerDir ".roba-viewer.pid"

function Stop-ProcessTree {
  param([int]$RootProcessId)

  $children = Get-CimInstance Win32_Process |
    Where-Object { $_.ParentProcessId -eq $RootProcessId }

  foreach ($child in $children) {
    Stop-ProcessTree -RootProcessId ([int]$child.ProcessId)
  }

  try {
    Stop-Process -Id $RootProcessId -Force -ErrorAction Stop
  } catch {
    return
  }
}

if (-not (Test-Path $PidFile)) {
  Write-Host "roBa Keymap Viewer pid file was not found. It may already be stopped."
  exit 0
}

$rawPid = (Get-Content -Raw $PidFile).Trim()
if ($rawPid -notmatch "^\d+$") {
  Remove-Item -LiteralPath $PidFile -Force
  Write-Host "Removed invalid pid file."
  exit 0
}

Stop-ProcessTree -RootProcessId ([int]$rawPid)
Remove-Item -LiteralPath $PidFile -Force
Write-Host "Stopped roBa Keymap Viewer."
