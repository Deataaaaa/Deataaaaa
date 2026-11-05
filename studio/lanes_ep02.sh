#!/bin/bash
source /home/user/Deataaaaa/studio/queue.sh
laneA() { waitfor "ep01 --out .* --from 0 "; job ep02 0 882; }
laneB() { waitfor "ep01 --out .* --from 900 "; job ep02 882 1764; }
laneA & laneB & wait
