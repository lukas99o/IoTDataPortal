$stopped = @()

$ports = @(5000, 5173)
$portPids = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in $ports } |
    Select-Object -ExpandProperty OwningProcess -Unique

foreach ($portPid in $portPids) {
    if ($portPid -and ($stopped -notcontains $portPid)) {
        $proc = Get-Process -Id $portPid -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $portPid -Force
            $stopped += $portPid
        }
    }
}

$cmdlinePids = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
        ($_.CommandLine -like "*dotnet run --project ./IoTDataPortal.API*") -or
        ($_.CommandLine -like "*npm*run dev*") -or
        ($_.CommandLine -like "*vite*")
    } |
    Select-Object -ExpandProperty ProcessId -Unique

foreach ($cmdPid in $cmdlinePids) {
    if ($cmdPid -and ($stopped -notcontains $cmdPid)) {
        $proc = Get-Process -Id $cmdPid -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $cmdPid -Force
            $stopped += $cmdPid
        }
    }
}

if ($stopped.Count -gt 0) {
    Write-Host "Stopped processes: $($stopped -join ', ')"
}
else {
    Write-Host "No matching dev processes were running."
}
