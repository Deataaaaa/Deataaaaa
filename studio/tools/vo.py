"""Voiceover: synthesises each line with a Piper voice (offline neural TTS), fits it inside its caption window (speeds it up
when needed, a touch slower and deeper otherwise) and writes one mono WAV at 24 kHz aligned to the video's time.
usage: python3 tools/vo.py <lines.json> <voice.onnx> <out.wav> [duration]"""
import sys, json, wave, io
import numpy as np
from scipy import signal
from piper import PiperVoice, SynthesisConfig

lines, model, out = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3]
dur = float(sys.argv[4]) if len(sys.argv) > 4 else 68.0
voice = PiperVoice.load(model)
SRO = 24000

def synth(text, ls):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w: voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=ls, noise_scale=0.55, noise_w_scale=0.7))
    buf.seek(0)
    with wave.open(buf, 'rb') as r: sr = r.getframerate(); x = np.frombuffer(r.readframes(r.getnframes()), np.int16).astype(np.float64) / 32768
    x = signal.resample_poly(x, SRO, sr)
    nz = np.nonzero(np.abs(x) > 0.01)[0]                       # trim silence
    return x[max(0, nz[0] - 200): nz[-1] + 1200] if len(nz) else x

DEEP = 1.05                                                    # resample: 5 % slower and lower (a deeper narrator)
track = np.zeros(int(dur * SRO))
for t0, t1, text in lines:
    room = t1 - t0 - 0.1
    ls = 1.04; x = synth(text, ls)
    d = len(x) * DEEP / SRO
    if d > room: ls = max(0.72, ls * room / d); x = synth(text, ls); d = len(x) * DEEP / SRO
    x = signal.resample_poly(x, int(DEEP * 100), 100)
    i0 = int((t0 + 0.05) * SRO); track[i0:i0 + len(x)] += x[: len(track) - i0]
    print(f'{t0:5.1f}-{t1:5.1f}  {d:4.2f}s / {room:4.2f}s  ls {ls:.2f}  {text}')
track /= np.abs(track).max() + 1e-9
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SRO); w.writeframes((track * 0.95 * 32767).astype(np.int16).tobytes())
print('wrote', out)
