param(
	[Parameter(Mandatory = $true)]
	[ValidateSet("backend", "frontend")]
	[string]$Service
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot "backend"
$frontendPath = Join-Path $repoRoot "frontend"

if ($Service -eq "backend") {
	Set-Location $backendPath
	dotnet run --project ./IoTDataPortal.API
	exit $LASTEXITCODE
}

Set-Location $frontendPath
npm.cmd run dev
exit $LASTEXITCODE