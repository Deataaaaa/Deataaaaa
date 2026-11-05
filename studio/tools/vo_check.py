#!/usr/bin/env python3
# Pronunciation and intonation report of a narration (owner, 30 Oct 2026: « la voix fait toujours trop robotisée, applique-toi
# sur la prononciation »), with tools/vo_score.py (the same test tools/vo_kyutai.py picks its takes with): per block, the words
# Whisper hears differently from the script (numbers spelled out, homophones folded) and the pitch at the end of every yes/no
# question (it must rise).
#   python3 tools/vo_check.py audio/vo/ep24_lines.json audio/vo/ep24_developpeuse [model]
import sys, json, wave
import numpy as np
from faster_whisper import WhisperModel
from vo_text import blocks, block_name, spoken
from vo_score import score

lines = json.load(open(sys.argv[1]))['lines']; d = sys.argv[2]
model = WhisperModel(sys.argv[3] if len(sys.argv) > 3 else 'small', device='cpu', compute_type='int8')
bad = total = flat = 0
for b in blocks(lines):
    with wave.open(f'{d}/{block_name(lines, b)}') as w: x, sr = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768, w.getframerate()
    texts = [spoken(lines[i]['t']) for i in b]; sc = score(x, sr, texts, model)
    bad += sc['bad']; total += sc['n']; flat += sc['flat']
    rises = ' | '.join(f"L{b[li]} {'?' if r is None or r != r else f'{r:+.1f} st'}{'' if ok else ' FLAT'}" for li, r, ok in sc['rises'])
    print(f"{b[0]:02d}-{b[-1]:02d} {'OK ' if not sc['diffs'] else '!! '} {' '.join(texts)}\n      heard: {sc['heard']}" + (f"\n      diff:  {' | '.join(sc['diffs'])}" if sc['diffs'] else '') + (f"\n      ?:     {rises}" if rises else ''))
print(f'words heard differently: {bad}/{total} ({100 * bad / max(1, total):.1f} %), flat yes/no questions: {flat}')
