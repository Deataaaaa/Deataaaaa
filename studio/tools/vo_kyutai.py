#!/usr/bin/env python3
# French narration with Kyutai TTS 1.6B en_fr (CC-BY 4.0) and Kyutai's own CC0 voices, a block of lines at a time.
#   <venv>/bin/python tools/vo_kyutai.py audio/vo/ep20_lines.json audio/vo/ep20 <voice> [<voice> ...]
#   voice = a path in the kyutai/tts-voices repo, e.g. unmute-prod-website/developpeuse-3.wav
# For each voice writes <out>_<tag>/bNN_<hash>.wav: one trimmed WAV (24 kHz mono) per block of lines, read in one go so the
# sentences flow into each other (tools/vo_text.py: a block ends where the script leaves a real pause). tools/vo_align.py then
# lays the blocks out with their gaps, finds every word's time (and so where each line starts) and writes <out>_<tag>.wav +
# <out>_<tag>.json. Lines use [spoken|shown] markup (only the spoken part is read) and *red* marks (ignored here);
# "brk": 1 starts a new block, "seed": n reads a block again differently.
# Needs a venv with torch (CPU) + moshi: uv venv ktts --python 3.12; uv pip install --python ktts/bin/python moshi
import sys, os, json, time, wave
import numpy as np, torch
from moshi.models.loaders import CheckpointInfo
from moshi.models.tts import DEFAULT_DSM_TTS_REPO, TTSModel
from faster_whisper import WhisperModel
from vo_text import blocks, block_text, block_name, block_seed, spoken
from vo_score import score

lines = json.load(open(sys.argv[1]))['lines']
out, voices = sys.argv[2], sys.argv[3:]
torch.set_num_threads(os.cpu_count() or 4)
tts = TTSModel.from_checkpoint_info(CheckpointInfo.from_hf_repo(DEFAULT_DSM_TTS_REPO), n_q=32, temp=0.6, device='cpu', dtype=torch.float32)
SR = int(tts.mimi.sample_rate)
asr = WhisperModel('small', device='cpu', compute_type='int8')

def say(text, voice, seed):
    torch.manual_seed(seed)
    entries = tts.prepare_script([text], padding_between=0)                  # (1 forces a pause after every word: robotic)
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
    for b in blocks(lines):
        p = f'{d}/{block_name(lines, b)}'
        if os.path.exists(p): continue                                      # resume (a changed block has a new name)
        texts = [spoken(lines[i]['t']) for i in b]; best = None; t0 = time.time()
        for k in range(4 if any(t.rstrip(' »').endswith('?') for t in texts) else 2):
            y = say(block_text(lines, b), voice, block_seed(lines, b) + 7919 * k); sc = score(y, SR, texts, asr)
            print(f'   take {k}: {sc["bad"]}/{sc["n"]} words off, {sc["flat"]} flat question(s), cost {sc["cost"]}  ' + ' | '.join(sc['diffs']), flush=True)
            if best is None or sc['cost'] < best[0]: best = (sc['cost'], y)
            if sc['cost'] == 0: break
        x = best[1]
        with wave.open(p, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
        print(f'{tag} {b[0]:02d}-{b[-1]:02d} {len(x) / SR:5.2f}s ({time.time() - t0:.0f}s)  {block_text(lines, b)}', flush=True)
print('done')
