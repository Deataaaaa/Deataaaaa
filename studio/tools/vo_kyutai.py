#!/usr/bin/env python3
# French narration with Kyutai TTS 1.6B en_fr (CC-BY 4.0) and Kyutai's own CC0 voices, one line at a time.
#   <venv>/bin/python tools/vo_kyutai.py audio/vo/ep20_lines.json audio/vo/ep20 <voice> [<voice> ...]
#   voice = a path in the kyutai/tts-voices repo, e.g. unmute-prod-website/developpeuse-3.wav
# For each voice writes <out>_<tag>/NN.wav (one trimmed WAV per line, 24 kHz mono). tools/vo_align.py then lays the
# lines out with their gaps, finds every word's time and writes <out>_<tag>.wav + <out>_<tag>.json.
# Lines use [spoken|shown] markup (only the spoken part is read) and *red* marks (ignored here).
# Needs a venv with torch (CPU) + moshi: uv venv ktts --python 3.12; uv pip install --python ktts/bin/python moshi
import sys, os, re, json, time, wave
import numpy as np, torch
from moshi.models.loaders import CheckpointInfo
from moshi.models.tts import DEFAULT_DSM_TTS_REPO, TTSModel

lines = json.load(open(sys.argv[1]))['lines']
out, voices = sys.argv[2], sys.argv[3:]
spoken = lambda s: re.sub(r'\[([^|\]]*)\|[^\]]*\]', r'\1', s).replace('*', '')
torch.set_num_threads(os.cpu_count() or 4)
tts = TTSModel.from_checkpoint_info(CheckpointInfo.from_hf_repo(DEFAULT_DSM_TTS_REPO), n_q=32, temp=0.6, device='cpu', dtype=torch.float32)
SR = int(tts.mimi.sample_rate)

def say(text, voice, seed):
    torch.manual_seed(seed)
    entries = tts.prepare_script([text], padding_between=1)
    attrs = tts.make_condition_attributes([tts.get_voice_path(voice)], cfg_coef=2.0)
    pcms = []
    def on_frame(frame):
        if (frame != -1).all():
            pcms.append(np.clip(tts.mimi.decode(frame[:, 1:, :]).cpu().numpy()[0, 0], -1, 1))
    with tts.mimi.streaming(1), torch.no_grad():
        tts.generate([entries], [attrs], on_frame=on_frame)
    x = np.concatenate(pcms).astype(np.float32)
    env = np.convolve(np.abs(x), np.ones(240) / 240, 'same')               # trim leading/trailing silence (10 ms envelope)
    nz = np.nonzero(env > 0.012)[0]
    return x[max(0, nz[0] - 480): nz[-1] + 1440] if len(nz) else x

for voice in voices:
    tag = os.path.splitext(os.path.basename(voice))[0].split('-')[0]
    d = f'{out}_{tag}'; os.makedirs(d, exist_ok=True)
    for i, ln in enumerate(lines):
        p = f'{d}/{i:02d}.wav'
        if os.path.exists(p): continue                                      # resume
        t0 = time.time(); x = say(spoken(ln['t']), voice, 1000 + i)
        with wave.open(p, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
        print(f'{tag} {i:02d} {len(x) / SR:5.2f}s ({time.time() - t0:.0f}s)  {spoken(ln["t"])}', flush=True)
print('done')
