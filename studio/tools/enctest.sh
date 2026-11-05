#!/usr/bin/env bash
# The video encoder test of the RENDER.bat menu (GPU test): is the graphics card's encoder (h264_amf) there, how fast is it
# on 1080x1920 frames, and does the driver take as many encoder sessions at once as encode.sh opens (2 per segment)?
# Prints one verdict line: "ENCTEST amf <fps> fps, <n> sessions ok" or "ENCTEST x264 <reason>".
ffmpeg() { command ffmpeg -nostdin -hide_banner "$@"; }
NPROC=$(nproc 2>/dev/null | tr -d '\r'); NPROC=${NPROC:-${NUMBER_OF_PROCESSORS:-4}}
K=$(( NPROC < 12 ? NPROC : 12 ))
SRC=(-f lavfi -i "testsrc2=s=1080x1920:r=30:d=10")
if ! ffmpeg -encoders 2>/dev/null | grep -q h264_amf; then echo "ENCTEST x264 this ffmpeg has no h264_amf"; exit 0; fi
E=$(ffmpeg -v error -f lavfi -i color=c=gray:s=256x256:d=0.2 -c:v h264_amf -f null - 2>&1 | tr -d '\r' | tail -n 1)
if [ -n "$E" ] && ! ffmpeg -v error -f lavfi -i color=c=gray:s=256x256:d=0.2 -c:v h264_amf -f null - >/dev/null 2>&1; then
  echo "ENCTEST x264 the driver refused h264_amf: ${E:0:80}"; exit 0
fi
AMF=(-c:v h264_amf -usage transcoding -quality quality)
T0=$(date +%s%N)
ffmpeg -v error "${SRC[@]}" -vf format=yuv420p "${AMF[@]}" -rc cqp -qp_i 16 -qp_p 18 -qp_b 20 -f null - || { echo "ENCTEST x264 h264_amf failed on 1080x1920"; exit 0; }
MS=$(( ($(date +%s%N) - T0) / 1000000 )); FPS=$(( 300 * 1000 / (MS > 0 ? MS : 1) ))
echo "1 session: 300 frames in ${MS} ms"
# as many sessions as encode.sh: K segments x (HQ + phone)
pids=(); for ((i = 0; i < K; i++)); do
  ffmpeg -v error -f lavfi -i "testsrc2=s=1080x1920:r=30:d=2" -filter_complex "[0:v]format=yuv420p,split=2[a][b]" \
    -map "[a]" "${AMF[@]}" -rc cqp -qp_i 16 -qp_p 18 -qp_b 20 -f null - -map "[b]" "${AMF[@]}" -rc vbr_peak -b:v 2000k -maxrate 3000k -bufsize 4000k -f null - &
  pids+=($!)
done
bad=0; for p in "${pids[@]}"; do wait "$p" || bad=$((bad + 1)); done
if [ $bad -eq 0 ]; then echo "ENCTEST amf ${FPS} fps, $((2 * K)) sessions ok"; else echo "ENCTEST amf ${FPS} fps, $((2 * K)) sessions: $bad of $K segments refused (encode.sh drops to 3 segments)"; fi
