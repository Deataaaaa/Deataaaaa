#!/usr/bin/env bash
# usage: ./encode.sh <frames_dir> <audio.wav> <out_basename>
# Makes <out>.mp4 (high quality) and <out>_phone.mp4 (under 29 MB, two-pass), then proves each file carries
# a real, loud, stereo AAC track that matches the soundtrack (fails loudly otherwise).
set -euo pipefail
FR=$1; WAV=$2; OUT=$3
PY=${PYTHON:-python3}   # Windows (pc/render.ps1): PYTHON="py -3"
PASSLOG=$(mktemp -d)/pass
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WAV" | tr -d '\r')   # Windows tools end lines with \r\n
NFR=$(ls "$FR"/f_*.jpg | wc -l)
EXP=$($PY -c "print(round($DUR*30))" | tr -d '\r')
[ "$NFR" -eq "$EXP" ] || { echo "frame count $NFR != expected $EXP"; exit 1; }
AUD=(-c:a aac -b:a 192k -ar 48000 -ac 2)
VID=(-pix_fmt yuv420p -profile:v high -level 4.2 -movflags +faststart)

VB=$($PY -c "print(int((28.5*8*1024*1024/$DUR - 200000)/1000))" | tr -d '\r')
# On the owner's PC (AMD RX 6700 XT) the graphics card's video engine encodes (owner, 30 Oct 2026: the encoding on the GPU too):
# h264_amf, the HQ file at constant quality, the phone file at its size budget with pre-analysis and variance AQ. A ffmpeg
# without AMF, or a driver that refuses it, falls back to x264 on the processor (this cloud box, or a broken driver).
ENC=x264
if [ "${ENCODER:-auto}" != x264 ] && ffmpeg -hide_banner -encoders 2>/dev/null | grep -q h264_amf \
   && ffmpeg -v error -f lavfi -i color=c=gray:s=256x256:d=0.2 -c:v h264_amf -f null - 2>/dev/null; then ENC=amf; fi
if [ $ENC = amf ]; then
  AMF=(-c:v h264_amf -usage transcoding -quality quality)
  ffmpeg -y -v error -framerate 30 -i "$FR/f_%05d.jpg" -i "$WAV" -map 0:v:0 -map 1:a:0 \
    "${AMF[@]}" -rc cqp -qp_i 16 -qp_p 18 -qp_b 20 "${VID[@]}" "${AUD[@]}" -shortest "$OUT.mp4" \
  && { ffmpeg -y -v error -framerate 30 -i "$FR/f_%05d.jpg" -i "$WAV" -map 0:v:0 -map 1:a:0 \
      "${AMF[@]}" -rc vbr_peak -b:v ${VB}k -maxrate $((VB * 2))k -bufsize $((VB * 2))k -preanalysis true -vbaq true "${VID[@]}" "${AUD[@]}" -shortest "${OUT}_phone.mp4" \
    || ffmpeg -y -v error -framerate 30 -i "$FR/f_%05d.jpg" -i "$WAV" -map 0:v:0 -map 1:a:0 \
      "${AMF[@]}" -rc vbr_peak -b:v ${VB}k -maxrate $((VB * 2))k -bufsize $((VB * 2))k "${VID[@]}" "${AUD[@]}" -shortest "${OUT}_phone.mp4"; } \
  || { echo "AMF encoding failed: falling back to x264"; ENC=x264; }   # (older drivers or ffmpeg builds lack pre-analysis: the second try goes without)
  # the phone file must stay under the chat's 29 MB: if the GPU's rate control overshot, the processor redoes it
  if [ $ENC = amf ] && [ "$(stat -c %s "${OUT}_phone.mp4" 2>/dev/null || wc -c < "${OUT}_phone.mp4")" -gt 30408704 ]; then echo "AMF phone file over 29 MB: x264 instead"; ENC=x264; fi
fi
if [ $ENC = x264 ]; then
  # x264 tuned for clean CG frames (no grain): film tune, variance AQ biased to dark areas (no banding or blocks
  # crawling in skies and shadows), lighter deblocking so fine sparks keep their shape
  X264=(-tune film -x264-params "aq-mode=3:aq-strength=0.85:deblock=-1,-1")
  ffmpeg -y -v error -framerate 30 -i "$FR/f_%05d.jpg" -i "$WAV" -map 0:v:0 -map 1:a:0 \
    -c:v libx264 -preset slow -crf 17 "${X264[@]}" "${VID[@]}" "${AUD[@]}" -shortest "$OUT.mp4"
  ffmpeg -y -v error -framerate 30 -i "$FR/f_%05d.jpg" -c:v libx264 -preset veryslow -b:v ${VB}k "${X264[@]}" -pass 1 -passlogfile "$PASSLOG" -pix_fmt yuv420p -an -f null /dev/null
  ffmpeg -y -v error -framerate 30 -i "$FR/f_%05d.jpg" -i "$WAV" -map 0:v:0 -map 1:a:0 \
    -c:v libx264 -preset veryslow -b:v ${VB}k "${X264[@]}" -pass 2 -passlogfile "$PASSLOG" "${VID[@]}" "${AUD[@]}" -shortest "${OUT}_phone.mp4"
fi
echo "ENCODER $ENC"

REF=$(ffmpeg -hide_banner -nostats -i "$WAV" -af ebur128 -f null - 2>&1 | tr -d '\r' | awk '/Summary/{s=1} s&&/I:/{print $2; exit}')
for f in "$OUT.mp4" "${OUT}_phone.mp4"; do
  A=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of csv=p=0 "$f" | tr -d '\r')
  [ "$A" = "aac,48000,2" ] || { echo "$f: bad or missing audio stream ($A)"; exit 1; }
  I=$(ffmpeg -hide_banner -nostats -i "$f" -map 0:a:0 -af ebur128 -f null - 2>&1 | tr -d '\r' | awk '/Summary/{s=1} s&&/I:/{print $2; exit}')
  $PY -c "import sys; d=abs($I-($REF)); sys.exit(0 if d<0.6 and $I>-14 else 1)" || { echo "$f: audio loudness $I LUFS vs soundtrack $REF"; exit 1; }
  VD=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$f" | tr -d '\r')
  echo "OK $f  $(du -h "$f" | cut -f1)  video ${VD}s  audio $A  ${I} LUFS (soundtrack ${REF})"
done

# flicker check (owner's note on post 4 v1): the phone file against the source frames, motion-compensated
$PY "$(dirname "$0")/tools/flickercheck.py" "${OUT}_phone.mp4" --ref "$FR" | tee "${OUT}_flicker.txt" | tail -n 12   # full table kept next to the video
