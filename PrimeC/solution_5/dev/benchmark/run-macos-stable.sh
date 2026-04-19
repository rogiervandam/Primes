#!/usr/bin/env bash
set -euo pipefail

WARMUP_RUNS="${PRIME_BENCHMARK_WARMUP:-1}"
MEASURED_RUNS="${PRIME_BENCHMARK_RUNS:-7}"

if [[ "${PRIME_BENCHMARK_NO_CAFFEINATE:-0}" != "1" ]]; then
  export PRIME_BENCHMARK_NO_CAFFEINATE=1
  exec caffeinate -dimsu "$0" "$@"
fi

if [[ $# -eq 0 ]]; then
  CMD=("./sieve" "--threads" "1" "--time" "5")
else
  CMD=("$@")
fi

echo "Warmup runs: $WARMUP_RUNS"
echo "Measured runs: $MEASURED_RUNS"
echo "Command: ${CMD[*]}"

if command -v renice >/dev/null 2>&1; then
  renice -n -10 -p $$ >/dev/null 2>&1 || true
fi

for ((i=1; i<=WARMUP_RUNS; i++)); do
  echo "Warmup $i/$WARMUP_RUNS"
  "${CMD[@]}" >/dev/null
done

for ((i=1; i<=MEASURED_RUNS; i++)); do
  echo "Run $i/$MEASURED_RUNS"
  "${CMD[@]}"
done
