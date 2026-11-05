"""Voiceover: synthesises each line (offline neural TTS), fits it inside its caption window (speeds it up when needed) and
writes one mono WAV at 24 kHz aligned to the video's time.
usage: python3 tools/vo.py <lines.json> <voice> <out.wav> [duration] [deepen, 1.0 = none]
  voice = kokoro:af_heart (the house voice since post 8: Kokoro-82M, Apache-2.0; pip install kokoro-onnx, model files
          kokoro-v1.0.onnx + voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx releases in $KOKORO_DIR)
          or a Piper .onnx voice (pip install piper-tts)"""
import sys, json, wave, io, os
import numpy as np
from scipy import signal

lines, model, out = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3]
dur = float(sys.argv[4]) if len(sys.argv) > 4 else 68.0
SRO = 24000
KOKORO = model.startswith('kokoro:')
if KOKORO:
    from kokoro_onnx import Kokoro
    kd = os.environ.get('KOKORO_DIR', os.path.expanduser('~/.cache/kokoro'))
    kk, kvoice = Kokoro(os.path.join(kd, 'kokoro-v1.0.onnx'), os.path.join(kd, 'voices-v1.0.bin')), model.split(':', 1)[1]
else:
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(model)

def trim(x):
    nz = np.nonzero(np.abs(x) > 0.01)[0]                       # trim silence
    return x[max(0, nz[0] - 200): nz[-1] + 1200] if len(nz) else x

def synth(text, ls):
    if KOKORO:                                                 # ls = length scale: speed = 1 / ls
        x, sr = kk.create(text, voice=kvoice, speed=1.0 / ls, lang='en-gb' if kvoice[0] == 'b' else 'en-us')
        return trim(signal.resample_poly(np.asarray(x, np.float64), SRO, sr) if sr != SRO else np.asarray(x, np.float64))
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w: voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=ls, noise_scale=0.55, noise_w_scale=0.7))
    buf.seek(0)
    with wave.open(buf, 'rb') as r: sr = r.getframerate(); x = np.frombuffer(r.readframes(r.getnframes()), np.int16).astype(np.float64) / 32768
    return trim(signal.resample_poly(x, SRO, sr))

DEEP = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0          # resample: e.g. 1.05 = 5 % slower and lower (a deeper narrator)
track = np.zeros(int(dur * SRO))
for t0, t1, text in lines:
    room = t1 - t0 - 0.1
    ls = 1.08 if KOKORO else 1.04; x = synth(text, ls)              # Kokoro: a calm narrator, 8 % under its default pace
    d = len(x) * DEEP / SRO
    for _ in range(4):                                         # speech time is not linear in the speed: iterate
        if d <= room or ls <= 0.74: break
        ls = max(0.74, ls * room / d * 0.97); x = synth(text, ls); d = len(x) * DEEP / SRO
    x = signal.resample_poly(x, int(DEEP * 100), 100)
    i0 = int((t0 + 0.05) * SRO); track[i0:i0 + len(x)] += x[: len(track) - i0]
    print(f'{t0:5.1f}-{t1:5.1f}  {d:4.2f}s / {room:4.2f}s  ls {ls:.2f}  {text}')
track /= np.abs(track).max() + 1e-9
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SRO); w.writeframes((track * 0.95 * 32767).astype(np.int16).tobytes())
print('wrote', out)
