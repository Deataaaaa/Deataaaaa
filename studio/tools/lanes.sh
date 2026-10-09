#!/usr/bin/env bash
# Keeps the CPU busy until a set of frames is rendered: splits the ranges into chunks and runs workers on them (one
# chunk each, --resume: frames already on disk are skipped) while fewer than <max> render workers run on the machine.
# Every `node render.mjs` counts, whoever started it (lanes started by hand, another queue), so a slot is taken the
# moment any worker ends: no lane sits idle while another still has an hour of frames.
# usage: tools/lanes.sh <ep> <outdir> <max> <chunk> <from-to> [<from-to> ...]   (to = exclusive)
# example: tools/lanes.sh ep10 /tmp/frames 4 24 108-324 630-691
set -u
EP=$1; OUT=$2; MAX=$3; CH=$4; shift 4
cd "$(dirname "$0")/.."
chunks=()
for r in "$@"; do a=${r%-*}; b=${r#*-}; for ((s = a; s < b; s += CH)); do chunks+=("$s $((s + CH < b ? s + CH : b))"); done; done
mkdir -p "$OUT"; k=0
workers() { ps -eo args= | grep -c '^node render.mjs'; }
echo "$(date -u +%H:%M:%S) ${#chunks[@]} chunks, up to $MAX workers on the machine"
while :; do
  mine=$(jobs -rp | wc -l)
  [ $k -ge ${#chunks[@]} ] && [ "$mine" -eq 0 ] && break
  while [ $k -lt ${#chunks[@]} ] && [ "$(workers)" -lt "$MAX" ]; do
    set -- ${chunks[$k]}
    node render.mjs --ep "$EP" --out "$OUT" --from "$1" --to "$2" --resume >> "$OUT/lane_$1.log" 2>&1 &
    echo "$(date -u +%H:%M:%S) start $1-$2 (pid $!)"; k=$((k + 1)); sleep 2
  done
  sleep 10
done
echo "$(date -u +%H:%M:%S) all chunks done"
