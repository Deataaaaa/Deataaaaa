#!/bin/bash
# render queue: waits for the previous job's worker to finish before starting the next one
S=/tmp/claude-0/-home-user-Deataaaaa/0ace717f-f142-5241-9367-750ded1185b8/scratchpad
cd /home/user/Deataaaaa/studio
waitfor() { while pgrep -f "$1" >/dev/null; do sleep 5; done; }
job() { # ep from to
  mkdir -p $S/frames_$1
  node render.mjs --ep $1 --out $S/frames_$1 --from $2 --to $3 --resume > $S/frames_$1/log_$2.txt 2>&1
}
