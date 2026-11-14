param(
  [Parameter(Mandatory)][ValidateSet('guest', 'tunnel', 'screenshot')][string]$Mode,
  [string]$GuestScript = '',
  [int[]]$Ports = @(),
  [string]$VmName = 'sts2-dev'
)
$ErrorActionPreference = 'Stop'
$hostJson = Get-Content "$env:ProgramData\AppSandbox\host.json" -Raw | ConvertFrom-Json
$headers = @{ Authorization = "Bearer $($hostJson.token)" }
$api = "$($hostJson.endpoint)/v1"
$vm = (Invoke-RestMethod "$api/vms" -Headers $headers).vms | Where-Object name -eq $VmName
if (-not $vm) { throw "VM $VmName not found" }
if ($vm.state -ne 'online') { throw "VM $VmName is $($vm.state)" }
if ($Mode -eq 'screenshot') {
  $shot = Invoke-RestMethod "$api/vm-ids/$($vm.id)/screenshot" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"timeoutMs":8000}'
  Write-Output $shot.image.data
  exit 0
}
$info = Invoke-RestMethod "$api/vm-ids/$($vm.id)/sshInfo" -Headers $headers
$key = Join-Path $env:ProgramData 'AppSandbox\ssh\id_appsandbox'
$knownHosts = Join-Path $env:TEMP 'sts2-mcp-known_hosts'
$ssh = @('-o', 'StrictHostKeyChecking=no', '-o', "UserKnownHostsFile=$knownHosts", '-o', 'BatchMode=yes', '-o', 'ServerAliveInterval=15', '-i', $key, '-p', "$($info.port)")
$target = "$($info.user)@$($info.host)"
if ($Mode -eq 'tunnel') {
  $forwards = $Ports | ForEach-Object { @('-L', "127.0.0.1:${_}:127.0.0.1:$_") }
  $session = $null
  $id = $PID
  while (-not $session) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$id"
    if (-not $process) { throw 'the ssh session that started this tunnel was not found' }
    if ($process.Name -like 'sshd*') { $session = Get-Process -Id $id }
    $id = $process.ParentProcessId
  }
  $start = [Diagnostics.ProcessStartInfo]::new('ssh')
  foreach ($argument in @($ssh) + @('-N', '-o', 'ExitOnForwardFailure=yes') + @($forwards) + @($target)) { $start.ArgumentList.Add($argument) }
  $start.UseShellExecute = $false
  $tunnel = [Diagnostics.Process]::Start($start)
  try {
    while (-not $tunnel.HasExited) {
      $listening = @(Get-NetTCPConnection -State Listen -OwningProcess $tunnel.Id -ErrorAction SilentlyContinue | Where-Object LocalPort -in $Ports)
      if ($listening.Count -ge $Ports.Count) { break }
      Start-Sleep -Milliseconds 200
    }
    if ($tunnel.HasExited) { exit $tunnel.ExitCode }
    Write-Output 'sts2-mcp tunnel ready'
    while (-not $tunnel.HasExited -and -not $session.HasExited) { Start-Sleep -Seconds 1 }
  } finally {
    if (-not $tunnel.HasExited) { $tunnel.Kill() }
  }
  exit 0
}
& ssh @ssh $target "powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand $GuestScript"
exit $LASTEXITCODE
