param(
    [int]$Processors = 1,
    [int]$MemoryGb = 4,
    [int]$SwapGb = 0,
    [switch]$SkipShutdown
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Processors -lt 1) {
    throw "Processors must be >= 1"
}

if ($MemoryGb -lt 1) {
    throw "MemoryGb must be >= 1"
}

if ($SwapGb -lt 0) {
    throw "SwapGb must be >= 0"
}

$wslConfigPath = Join-Path $env:USERPROFILE ".wslconfig"
$backupPath = "{0}.bak-{1}" -f $wslConfigPath, (Get-Date -Format "yyyyMMdd-HHmmss")

$lines = @()
if (Test-Path $wslConfigPath) {
    Copy-Item $wslConfigPath $backupPath -Force
    $lines = Get-Content $wslConfigPath
}

$sectionIndex = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim().ToLower() -eq "[wsl2]") {
        $sectionIndex = $i
        break
    }
}

if ($sectionIndex -eq -1) {
    if ($lines.Count -gt 0 -and $lines[$lines.Count - 1].Trim() -ne "") {
        $lines += ""
    }
    $lines += "[wsl2]"
    $lines += "processors=$Processors"
    $lines += "memory=${MemoryGb}GB"
    $lines += "swap=${SwapGb}GB"
}
else {
    $endIndex = $lines.Count
    for ($i = $sectionIndex + 1; $i -lt $lines.Count; $i++) {
        if ($lines[$i].Trim().StartsWith("[") -and $lines[$i].Trim().EndsWith("]")) {
            $endIndex = $i
            break
        }
    }

    $section = @($lines[$sectionIndex..($endIndex - 1)])

    function Set-OrAddKey {
        param(
            [string[]]$SectionLines,
            [string]$Key,
            [string]$Value
        )

        $updated = $false
        for ($j = 1; $j -lt $SectionLines.Count; $j++) {
            $raw = $SectionLines[$j]
            $trim = $raw.Trim()
            if ($trim.StartsWith("$Key=", [System.StringComparison]::OrdinalIgnoreCase)) {
                $SectionLines[$j] = "$Key=$Value"
                $updated = $true
                break
            }
        }

        if (-not $updated) {
            $SectionLines += "$Key=$Value"
        }

        return ,$SectionLines
    }

    $section = Set-OrAddKey -SectionLines $section -Key "processors" -Value "$Processors"
    $section = Set-OrAddKey -SectionLines $section -Key "memory" -Value "${MemoryGb}GB"
    $section = Set-OrAddKey -SectionLines $section -Key "swap" -Value "${SwapGb}GB"

    $prefix = @()
    if ($sectionIndex -gt 0) {
        $prefix = $lines[0..($sectionIndex - 1)]
    }

    $suffix = @()
    if ($endIndex -lt $lines.Count) {
        $suffix = $lines[$endIndex..($lines.Count - 1)]
    }

    $lines = @($prefix + $section + $suffix)
}

Set-Content -Path $wslConfigPath -Value $lines -Encoding ascii

Write-Host "Updated $wslConfigPath"
if (Test-Path $backupPath) {
    Write-Host "Backup created at $backupPath"
}

if (-not $SkipShutdown) {
    Write-Host "Restarting WSL VM (wsl --shutdown)..."
    wsl --shutdown
}

Write-Host ""
Write-Host "Suggested benchmark launch from PowerShell:"
Write-Host "  .\\dev\\benchmark\\run-wsl-benchmark.ps1 -Distro Ubuntu -AffinityMask 1"
