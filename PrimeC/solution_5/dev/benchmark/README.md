# Stable Benchmarking Setup

This directory contains helper scripts to reduce run-to-run noise for local micro-benchmarks.

## Goals and limits

The scripts aim to reduce variance, not make timings perfectly identical.

- Linux/macOS: process scheduling and background tasks can still add noise.
- WSL2: Linux runs inside a VM, so both Linux guest and Windows host scheduling matter.

## Quick start

### Preferred wrapper command

From `PrimeC/solution_5`, the easiest entrypoint is the `sieve` wrapper with autodetection:

```bash
./sieve stable sieve_extend --threads 1 --time 5
```

If you are on WSL and want host-level setup from inside WSL:

```bash
./sieve stable-setup
./sieve stable-wsl-host sieve_extend --threads 1 --time 5
```

### Linux (native)

From `PrimeC/solution_5`:

```bash
chmod +x ./dev/benchmark/run-linux-stable.sh
PRIME_BENCHMARK_CPU=0 PRIME_BENCHMARK_WARMUP=1 PRIME_BENCHMARK_RUNS=9 \
  ./dev/benchmark/run-linux-stable.sh ./sieve --threads 1 --time 5
```

### Windows + WSL2

1. Keep your benchmark workspace in the Linux filesystem (for example `~/Primes`), not under `/mnt/c/...`.
2. In PowerShell, from `PrimeC/solution_5`, apply stable WSL VM settings:

```powershell
.\dev\benchmark\setup-wsl-benchmark.ps1 -Processors 1 -MemoryGb 4 -SwapGb 0
```

3. Run with host-level affinity + in-guest CPU pinning:

```powershell
.\dev\benchmark\run-wsl-benchmark.ps1 -Distro Ubuntu -AffinityMask 1
```

### macOS

From `PrimeC/solution_5`:

```bash
chmod +x ./dev/benchmark/run-macos-stable.sh
PRIME_BENCHMARK_WARMUP=1 PRIME_BENCHMARK_RUNS=9 \
  ./dev/benchmark/run-macos-stable.sh ./sieve --threads 1 --time 5
```

The macOS script automatically uses `caffeinate` while runs are active.

## Script reference

- `setup-wsl-benchmark.ps1`: writes or updates `%USERPROFILE%\\.wslconfig` with stable `wsl2` CPU/memory/swap settings and restarts WSL.
- `run-wsl-benchmark.ps1`: launches `wsl.exe` using `start /affinity` and runs the Linux benchmark command with `PRIME_BENCHMARK_CPU=0`.
- `run-linux-stable.sh`: performs warmup and measured runs with `taskset` pinning.
- `run-macos-stable.sh`: performs warmup and measured runs under `caffeinate`.

## In-program settings

The benchmark code supports selecting the target pinned CPU using:

```bash
PRIME_BENCHMARK_CPU=0
```

When not set, CPU `0` is used by default for single-thread benchmarks.

## Recommended reporting discipline

- Use single-thread mode when comparing single-thread algorithm changes.
- Run multiple times and report median.
- Discard at least one warmup run.
- Keep machine temperature stable.
- Avoid heavy background tasks during runs.
