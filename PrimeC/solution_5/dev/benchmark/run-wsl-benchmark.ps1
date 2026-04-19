param(
    [string]$Distro = "Ubuntu",
    [string]$AffinityMask = "1",
    [string]$LinuxRepoPath = "~/Primes/PrimeC/solution_5",
    [string]$BenchmarkCommand = "./dev/benchmark/run-linux-stable.sh ./sieve --threads 1 --time 5"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$linuxCommand = "cd $LinuxRepoPath && PRIME_BENCHMARK_CPU=0 $BenchmarkCommand"
$cmdArgs = @(
    "/c",
    "start",
    '""',
    "/wait",
    "/affinity",
    $AffinityMask,
    "wsl.exe",
    "-d",
    $Distro,
    "bash",
    "-lc",
    $linuxCommand
)

Write-Host "Running: cmd.exe $($cmdArgs -join ' ')"

& cmd.exe @cmdArgs
exit $LASTEXITCODE
