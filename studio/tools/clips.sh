#!/usr/bin/env bash
# clips.sh <part_phone.mp4> <clips.json> <outdir>: short extracts of a finished part, each opening on the part's own hook, so
# one render gives several posts. clips.json: { "hook": [t0, t1], "clips": [ { "name": "slug", "from": s, "to": s }, ... ] }
# (times = shot cuts, in seconds). Each clip = hook + [from, to], cut frame-exact (re-encoded), with tiny fades at the joins
# and a short fade-out at the end. Writes <outdir>/<part>_clipN_<slug>.mp4 and prints "OK <file>" per clip.
set -euo pipefail
IN=$1; CJ=$2; OUT=$3
PY=${PYTHON:-python3}   # Windows (pc/render.ps1): PYTHON="py -3"
base=$(basename "$IN" .mp4); base=${base%_phone}
mapfile -t ROWS < <($PY - "$CJ" <<'PYEOF' | tr -d '\r'
import json, sys
d = json.load(open(sys.argv[1], encoding='utf-8')); h0, h1 = d.get('hook', [0, 0])
for i, c in enumerate(d['clips'], 1):
    a, b = c['from'], c['to']
    print(i, c['name'], h0, h1, a, b, round(h1 - h0 - 0.03, 3), round(b - a - 0.5, 3))
PYEOF
)
for row in "${ROWS[@]}"; do
  read -r i name h0 h1 a b f0 f1 <<< "$row"
  f="$OUT/${base}_clip${i}_${name}.mp4"
  ffmpeg -y -v error -i "$IN" -filter_complex \
"[0:v]trim=${h0}:${h1},setpts=PTS-STARTPTS[v0];[0:a]atrim=${h0}:${h1},asetpts=PTS-STARTPTS,afade=t=out:st=${f0}:d=0.03[a0];\
[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v1];[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=${f1}:d=0.5[a1];\
[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" -r 30 -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$f"
  echo "OK $f"
done
