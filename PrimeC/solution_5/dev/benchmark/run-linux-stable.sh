#!/usr/bin/env bash
set -euo pipefail

CPU="${PRIME_BENCHMARK_CPU:-0}"
WARMUP_RUNS="${PRIME_BENCHMARK_WARMUP:-1}"
MEASURED_RUNS="${PRIME_BENCHMARK_RUNS:-7}"

if [[ $# -eq 0 ]]; then
  CMD=("./sieve" "--threads" "1" "--time" "5")
else
  CMD=("$@")
fi

echo "Benchmark CPU pin: $CPU"
echo "Warmup runs: $WARMUP_RUNS"
echo "Measured runs: $MEASURED_RUNS"
echo "Command: ${CMD[*]}"

for ((i=1; i<=WARMUP_RUNS; i++)); do
  echo "Warmup $i/$WARMUP_RUNS"
  taskset -c "$CPU" "${CMD[@]}" >/dev/null
done

for ((i=1; i<=MEASURED_RUNS; i++)); do
  echo "Run $i/$MEASURED_RUNS"
  taskset -c "$CPU" "${CMD[@]}"
done
