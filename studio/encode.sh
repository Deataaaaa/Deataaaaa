#!/usr/bin/env bash
# usage: ./encode.sh <frames_dir> <audio.wav> <out_basename>
# Makes <out>.mp4 (high quality) and <out>_phone.mp4 (under 29 MB, two-pass), then proves each file carries
# a real, loud, stereo AAC track that matches the soundtrack (fails loudly otherwise).
set -euo pipefail
ffmpeg() { command ffmpeg -nostdin "$@"; }   # never read the console (the render window's mouse trail reads it)
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
# Render Engine v3 (owner, 4 Nov 2026: « why is encode so slow… 15 % on both, my cpu and gpu »): ffmpeg decodes JPEGs on one
# core, and v2 decoded every frame twice in a row (HQ, then phone). Now the frames are cut into K segments encoded side by
# side (each process decodes its own frames once and feeds both files through a split), then joined without re-encoding.
NPROC=$(nproc 2>/dev/null | tr -d '\r'); NPROC=${NPROC:-${NUMBER_OF_PROCESSORS:-4}}
K=${SEGMENTS:-$(( NPROC < 12 ? NPROC : 12 ))}; [ "$K" -ge 1 ] || K=1
SD="${OUT}_seg"                                         # next to the video: Windows ffmpeg cannot read Git Bash's /tmp in a list file
set_k() { K=$1; SEG=$(( (NFR + K - 1) / K )); K=$(( (NFR + SEG - 1) / SEG )); TH=$(( NPROC / K )); [ "$TH" -ge 1 ] || TH=1; rm -rf "$SD"; mkdir -p "$SD"; }
set_k "$K"
# every segment in parallel. $1 = amf | x264, $2 = both (HQ + phone) | phone, $3 = the phone file's kbit/s
run_segments() {
  local pids=() i s n d=0 bad=0
  for ((i = 0; i < K; i++)); do
    s=$((i * SEG)); n=$(( NFR - s < SEG ? NFR - s : SEG ))
    SRC=(-y -v error -threads "$TH" -start_number "$s" -framerate 30 -i "$FR/f_%05d.jpg" -frames:v "$n")
    if [ "$1" = amf ]; then
      PH=("${AMF[@]}" -rc vbr_peak -b:v ${3}k -maxrate $(( $3 * 3 / 2 ))k -bufsize $(( $3 * 2 ))k "${PA[@]}" -profile:v high "$SD/ph_$i.mp4")
      if [ "$2" = both ]; then
        ffmpeg "${SRC[@]}" -filter_complex "[0:v]format=yuv420p,split=2[a][b]" -map "[a]" "${AMF[@]}" -rc cqp -qp_i 16 -qp_p 18 -qp_b 20 -profile:v high "$SD/hq_$i.mp4" -map "[b]" "${PH[@]}" &
      else
        ffmpeg "${SRC[@]}" -vf format=yuv420p "${PH[@]}" &
      fi
    else
      X=("${SRC[@]}" -pix_fmt yuv420p -c:v libx264 -threads "$TH")
      { if [ "$2" = both ]; then ffmpeg "${X[@]}" -preset slow -crf 17 "${X264[@]}" "$SD/hq_$i.mp4"; fi \
        && ffmpeg "${X[@]}" -preset veryslow -b:v ${3}k "${X264[@]}" -pass 1 -passlogfile "$SD/pass_$i" -f mp4 "$SD/p1_$i.mp4" \
        && ffmpeg "${X[@]}" -preset veryslow -b:v ${3}k "${X264[@]}" -pass 2 -passlogfile "$SD/pass_$i" "$SD/ph_$i.mp4"; } &
    fi
    pids+=($!)
  done
  for p in "${pids[@]}"; do wait "$p" || bad=1; d=$((d + 1)); echo "$1 $2: $d/$K segments"; done
  return $bad
}
join_segments() {  # concatenates the segments (no re-encode) and adds the soundtrack; $1 = both | phone
  local f
  for f in hq ph; do : > "$SD/$f.txt"; for ((i = 0; i < K; i++)); do echo "file '${f}_$i.mp4'" >> "$SD/$f.txt"; done; done
  if [ "$1" = both ]; then ffmpeg -y -v error -f concat -safe 0 -i "$SD/hq.txt" -i "$WAV" -map 0:v:0 -map 1:a:0 -c:v copy "${AUD[@]}" -movflags +faststart -shortest "$OUT.mp4" || return 1; fi
  ffmpeg -y -v error -f concat -safe 0 -i "$SD/ph.txt" -i "$WAV" -map 0:v:0 -map 1:a:0 -c:v copy "${AUD[@]}" -movflags +faststart -shortest "${OUT}_phone.mp4"
}
fsize() { stat -c %s "$1" 2>/dev/null || wc -c < "$1"; }
LIMIT=${PHONE_LIMIT:-30408704}                                          # 29 MB: the chat's send limit
X264=(-tune film -x264-params "aq-mode=3:aq-strength=0.85:deblock=-1,-1")
# On the owner's PC (AMD RX 6700 XT) the graphics card's video engine encodes (owner, 30 Oct 2026: the encoding on the GPU too):
# h264_amf, the HQ file at constant quality, the phone file at its size budget with pre-analysis and variance AQ. A ffmpeg
# without AMF, or a driver that refuses it, falls back to x264 on the processor (this cloud box, or a broken driver).
ENC=x264
if [ "${ENCODER:-auto}" != x264 ] && ffmpeg -hide_banner -encoders 2>/dev/null | grep -q h264_amf \
   && ffmpeg -v error -f lavfi -i color=c=gray:s=256x256:d=0.2 -c:v h264_amf -f null - 2>/dev/null; then ENC=amf; fi
T0=$(date +%s); NOTE=""
if [ $ENC = amf ]; then
  AMF=(-c:v h264_amf -usage transcoding -quality quality)
  PA=(-preanalysis true -vbaq true)                     # older drivers or ffmpeg builds lack pre-analysis
  ffmpeg -v error -f lavfi -i color=c=gray:s=256x256:d=0.2 "${AMF[@]}" "${PA[@]}" -f null - 2>/dev/null || PA=()
  VBA=$(( VB * 93 / 100 ))                              # the card's rate control runs a little over: aim 7 % under
  # a driver that refuses that many encoder sessions at once gets a second try with 3
  { run_segments amf both $VBA || { echo "AMF with $K segments failed: 3 segments"; set_k 3; run_segments amf both $VBA; }; } && join_segments both \
    || { echo "AMF encoding failed: falling back to x264"; ENC=x264; set_k "${SEGMENTS:-$(( NPROC < 12 ? NPROC : 12 ))}"; }
  # the phone file must stay under 29 MB. v3 redid both files on the processor when the card overshot (minutes of x264):
  # now only the phone file is redone, on the card at a bitrate scaled by the overshoot, and on the processor only if that fails too
  if [ $ENC = amf ]; then
    SZ=$(fsize "${OUT}_phone.mp4" | tr -d '\r')
    if [ "$SZ" -gt $LIMIT ]; then
      VB2=$(( VBA * 27500000 / SZ ))
      echo "AMF phone file $(( SZ / 1048576 )) MB: phone file again on the card at ${VB2}k"
      run_segments amf phone $VB2 && join_segments phone; NOTE=" (phone re-encoded on the card)"
      SZ=$(fsize "${OUT}_phone.mp4" | tr -d '\r')
      if [ "$SZ" -gt $LIMIT ]; then echo "still over 29 MB: phone file on the processor"; run_segments x264 phone $VB && join_segments phone || { echo "x264 encoding failed"; exit 1; }; NOTE=" (phone file x264)"; fi
    fi
  fi
fi
if [ $ENC = x264 ]; then
  # x264 tuned for clean CG frames (no grain): film tune, variance AQ biased to dark areas (no banding or blocks
  # in the night shots), lighter deblocking to keep fine detail; the phone file two-pass to its size budget
  run_segments x264 both $VB && join_segments both || { echo "x264 encoding failed"; exit 1; }
fi
echo "ENCODER $ENC  $K segments x $TH threads  $(( $(date +%s) - T0 )) s$NOTE"
rm -rf "$SD"


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
