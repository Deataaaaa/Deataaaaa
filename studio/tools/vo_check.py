#!/usr/bin/env python3
# Pronunciation and intonation check of a narration (owner, 30 Oct 2026: « la voix fait toujours trop robotisée, applique-toi
# sur la prononciation »). Whisper (no prompt, so it cannot guess from the script) transcribes each block's WAV and the words it
# hears differently from the script are listed: the ones the TTS slurred or misread (digits for numbers and homophones such as
# seule/seul are fine). Every line that ends in « ? » gets the pitch of its last word against the block's median (YIN): a French
# question without inversion must rise (flag under +1.5 semitones).
#   python3 tools/vo_check.py audio/vo/ep24_lines.json audio/vo/ep24_developpeuse [model]
import sys, re, json, wave, difflib, unicodedata
import numpy as np
from scipy import signal
from faster_whisper import WhisperModel
from vo_text import blocks, block_name, spoken

lines = json.load(open(sys.argv[1]))['lines']; d = sys.argv[2]
model = WhisperModel(sys.argv[3] if len(sys.argv) > 3 else 'small', device='cpu', compute_type='int8')
def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return re.sub(r"[^a-z0-9]", '', w)
def words(s): return [norm(w) for w in s.replace('’', "'").replace("'", ' ').replace('-', ' ').split() if norm(w)]
def read(p):
    with wave.open(p) as w: return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768, w.getframerate()
def yin(x, sr, fmin=110, fmax=480, hop=0.01, win=0.03, th=0.15):
    N, t0, t1 = int(win * sr), int(sr / fmax), int(sr / fmin); f = []
    for i in range(0, len(x) - N - t1, int(hop * sr)):
        fr = x[i:i + N + t1]
        if np.sqrt(np.mean(fr[:N] ** 2)) < 0.01: f.append(0); continue
        dd = np.array([np.sum((fr[:N] - fr[t:t + N]) ** 2) for t in range(t1 + 1)])
        c = dd.copy(); c[1:] = dd[1:] * np.arange(1, t1 + 1) / np.maximum(np.cumsum(dd[1:]), 1e-9); c[0] = 1
        k = next((t for t in range(t0, t1) if c[t] < th and c[t] <= c[t + 1]), None)
        f.append(sr / k if k else 0)
    return np.array(f)
bad = total = flat = 0
for b in blocks(lines):
    x, sr = read(f'{d}/{block_name(lines, b)}')
    a16 = signal.resample_poly(x, 16000, sr) if sr != 16000 else x
    segs, _ = model.transcribe(a16, language='fr', beam_size=5, word_timestamps=True, condition_on_previous_text=False)
    hw = [(norm(p), w.start, w.end) for s in segs for w in s.words for p in w.word.replace('’', "'").replace("'", ' ').replace('-', ' ').split() if norm(p)]
    want = ' '.join(spoken(lines[i]['t']) for i in b)
    A, B = words(want), [h[0] for h in hw]
    sm = difflib.SequenceMatcher(None, A, B, autojunk=False); diffs = []
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op != 'equal': diffs.append(f"{' '.join(A[a0:a1]) or '∅'} → {' '.join(B[b0:b1]) or '∅'}")
    total += len(A); bad += sum(a1 - a0 for op, a0, a1, b0, b1 in sm.get_opcodes() if op != 'equal')
    # questions: the last word of each line ending in « ? », found through the matched words
    f = yin(x, sr); v = f[f > 0]; med = np.median(v) if len(v) else 1; rises = []
    pos = {a + j: c + j for a, c, n in sm.get_matching_blocks() for j in range(n)}
    k = 0
    for i in b:
        k += len(words(spoken(lines[i]['t'])))
        if not spoken(lines[i]['t']).rstrip(' »').endswith('?'): continue
        h = pos.get(k - 1)
        if h is None: rises.append(f'L{i}: last word not heard'); flat += 1; continue
        s0, s1 = hw[h][1], hw[h][2]; e = f[int((s0 + 0.4 * (s1 - s0)) / 0.01): int(s1 / 0.01)]; e = e[e > 0]
        r = 12 * np.log2(np.median(e[-max(1, len(e) // 2):]) / med) if len(e) else float('nan')
        ok = r >= 1.5; flat += not ok; rises.append(f'L{i} « {hw[h][0]} ? » {r:+.1f} st{"" if ok else " FLAT"}')
    heard = ' '.join(s.text.strip() for s in segs)
    print(f'{b[0]:02d}-{b[-1]:02d} {"OK " if not diffs else "!! "} {want}\n      heard: {heard}' + (f'\n      diff:  ' + ' | '.join(diffs) if diffs else '') + (f'\n      ?:     ' + ' | '.join(rises) if rises else ''))
print(f'words heard differently: {bad}/{total} ({100 * bad / max(1, total):.1f} %), flat questions: {flat}')
