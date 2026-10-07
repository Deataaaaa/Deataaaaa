#!/bin/bash
# Days 3-6: two render lanes, each waits for its half of Day 2 to finish first
source /home/user/Deataaaaa/studio/queue.sh
laneA() { while pgrep -f "[r]ender.mjs --ep ep02 .* --from 0 " >/dev/null; do sleep 10; done
  job ep03 0 774; job ep04 0 810; job ep05 0 834; job ep06 0 832; }
laneB() { while pgrep -f "[r]ender.mjs --ep ep02 .* --from 882 " >/dev/null; do sleep 10; done
  job ep03 774 1548; job ep04 810 1620; job ep05 834 1668; job ep06 832 1665; }
laneA & laneB & wait
