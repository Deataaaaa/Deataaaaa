#!/bin/bash
# encodes each episode as soon as all of its frames exist and nothing is rendering it:
#   <name>.mp4 (high quality) and <name>_phone.mp4 (< 30 MB, for sending to a phone)
S=/tmp/claude-0/-home-user-Deataaaaa/0ace717f-f142-5241-9367-750ded1185b8/scratchpad
V=/home/user/Deataaaaa/videos
cd /home/user/Deataaaaa/studio
declare -A total=( [ep02]=1764 [ep03]=1548 [ep04]=1620 [ep05]=1668 [ep06]=1665 )
declare -A name=( [ep02]=day2_black_hole [ep03]=day3_atmosphere_vanishes [ep04]=day4_hole_through_earth [ep05]=day5_moon_stops [ep06]=day6_sun_disappears )
done_list=""
while true; do
  for ep in ep02 ep03 ep04 ep05 ep06; do
    [[ " $done_list " == *" $ep "* ]] && continue
    n=$(ls $S/frames_$ep/f_*.jpg 2>/dev/null | wc -l)
    if [ "$n" -ge "${total[$ep]}" ] && ! pgrep -f "[r]ender.mjs --ep $ep " >/dev/null; then
      out=$V/${name[$ep]}
      nice -n 5 ffmpeg -v error -y -framerate 30 -i $S/frames_$ep/f_%05d.jpg -i out/$ep.wav -c:v libx264 -preset medium -crf 22 -maxrate 7M -bufsize 14M -pix_fmt yuv420p -profile:v high -level 4.2 -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest $out.mp4 \
      && nice -n 5 ffmpeg -v error -y -i $out.mp4 -c:v libx264 -preset medium -b:v 3500k -pass 1 -passlogfile $S/pl_$ep -an -f mp4 /dev/null \
      && nice -n 5 ffmpeg -v error -y -i $out.mp4 -c:v libx264 -preset medium -b:v 3500k -maxrate 5M -bufsize 10M -pass 2 -passlogfile $S/pl_$ep -pix_fmt yuv420p -profile:v high -level 4.2 -c:a aac -b:a 160k -movflags +faststart ${out}_phone.mp4 \
      && echo "$(date +%H:%M) encoded $ep -> ${name[$ep]}" && done_list="$done_list $ep"
    fi
  done
  [ $(echo $done_list | wc -w) -ge 5 ] && break
  sleep 20
done
echo all-encoded
