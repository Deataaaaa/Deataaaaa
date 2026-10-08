#!/usr/bin/env bash
# Zero-clipping audit (rule 13). usage: tools/clipcheck.sh <episode> '[t1,t2,...]'
# For each time it renders the frame, then measures (in metres) the camera and the visible parts of the diver to every
# triangle of the whale, the whale and the camera above the seabed, the gloves to nearby rocks, and a kayak to the whale.
# Any value at or near 0 is a clip: fix the path, then run it again.
cd "$(dirname "$0")/.."
EP=$1 timeout 3000 node tools/probe.mjs tools/clipcheck.js "$2" 2>&1 | grep -v "GPU stall\|WebGL\|importmap" > /tmp/_clipcheck_out.txt
python3 - <<'PY'
import json,re
txt=open('/tmp/_clipcheck_out.txt').read()
m=re.search(r'^\[\s*\{', txt, re.M)
if not m: print(txt[-2000:]); raise SystemExit(1)
for r in json.loads(txt[m.start():]):
    print(f"t={r['t']:6} {r['shot']:3} cam→whale {r['cam']:>7}  diver→whale {r.get('diver','-'):>7} ({r['nDiver']} pts)  whale↑bed {r['whaleBed']}  cam↑bed {r['camBed']}  diver→rocks {r.get('rock','-')}  diver↑sand {r.get('sand','-')}  kayak→whale {r.get('kayak','-')}")
PY
