#!/usr/bin/env bash
# usage: ./encode.sh <frames_dir> <audio.wav> <out_basename>
# Makes <out>.mp4 (high quality) and <out>_phone.mp4 (under 29 MB, two-pass), then proves each file carries
# a real, loud, stereo AAC track that matches the soundtrack (fails loudly otherwise).
set -euo pipefail
FR=$1; WAV=$2; OUT=$3
PASSLOG=$(mktemp -d)/pass
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WAV")
NFR=$(ls "$FR"/f_*.jpg | wc -l)
EXP=$(python3 -c "print(round($DUR*30))")
[ "$NFR" -eq "$EXP" ] || { echo "frame count $NFR != expected $EXP"; exit 1; }
AUD=(-c:a aac -b:a 192k -ar 48000 -ac 2)
VID=(-pix_fmt yuv420p -profile:v high -level 4.2 -movflags +faststart)

ffmpeg -y -v error -framerate 30 -i "$FR/f_%05d.jpg" -i "$WAV" -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -crf 18 "${VID[@]}" "${AUD[@]}" -shortest "$OUT.mp4"

VB=$(python3 -c "print(int((28.5*8*1024*1024/$DUR - 200000)/1000))")
ffmpeg -y -v error -framerate 30 -i "$FR/f_%05d.jpg" -c:v libx264 -preset slow -b:v ${VB}k -pass 1 -passlogfile "$PASSLOG" -pix_fmt yuv420p -an -f null /dev/null
ffmpeg -y -v error -framerate 30 -i "$FR/f_%05d.jpg" -i "$WAV" -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -b:v ${VB}k -pass 2 -passlogfile "$PASSLOG" "${VID[@]}" "${AUD[@]}" -shortest "${OUT}_phone.mp4"

REF=$(ffmpeg -hide_banner -nostats -i "$WAV" -af ebur128 -f null - 2>&1 | awk '/Summary/{s=1} s&&/I:/{print $2; exit}')
for f in "$OUT.mp4" "${OUT}_phone.mp4"; do
  A=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of csv=p=0 "$f")
  [ "$A" = "aac,48000,2" ] || { echo "$f: bad or missing audio stream ($A)"; exit 1; }
  I=$(ffmpeg -hide_banner -nostats -i "$f" -map 0:a:0 -af ebur128 -f null - 2>&1 | awk '/Summary/{s=1} s&&/I:/{print $2; exit}')
  python3 -c "import sys; d=abs($I-($REF)); sys.exit(0 if d<0.6 and $I>-14 else 1)" || { echo "$f: audio loudness $I LUFS vs soundtrack $REF"; exit 1; }
  VD=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$f")
  echo "OK $f  $(du -h "$f" | cut -f1)  video ${VD}s  audio $A  ${I} LUFS (soundtrack ${REF})"
done
