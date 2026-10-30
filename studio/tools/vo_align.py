#!/usr/bin/env python3
# Lays out the narration's blocks from tools/vo_kyutai.py (several lines read in one go) and times every caption word.
#   python3 tools/vo_align.py audio/vo/ep20_lines.json audio/vo/ep20_developpeuse [start]
# Writes audio/vo/ep20_developpeuse.wav (24 kHz mono, the whole narration) and audio/vo/ep20_developpeuse.json:
#   { duration, lines: [ { t0, t1, units: [ { shown, red, t0, t1 } ] } ] }
# A unit is one caption word, or a [spoken|shown] group (it starts with its first spoken word and ends with its last).
# Word times come from faster-whisper (word_timestamps) matched to the known text; words it misses are interpolated. Inside a
# block, a line starts in the middle of the pause before its first word (the shots cut there).
import sys, re, json, wave, difflib, unicodedata
import numpy as np
from scipy import signal
from faster_whisper import WhisperModel
from vo_text import blocks, block_name

lines = json.load(open(sys.argv[1]))['lines']
d = sys.argv[2]; start = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
SR = 24000
model = WhisperModel('small', device='cpu', compute_type='int8')

def units_of(s):
    out = []
    for m in re.finditer(r'\[([^|\]]*)\|([^\]]*)\]([^\s\[]*)|(\S+)', s):
        if m.group(4) is not None:
            w = m.group(4); out.append({'sp': [w.replace('*', '')], 'shown': w.replace('*', ''), 'red': '*' in w})
        else:
            sp, sh, tail = m.group(1), m.group(2), m.group(3)
            out.append({'sp': sp.replace('*', '').split(), 'shown': (sh + tail).replace('*', ''), 'red': '*' in sp + sh})
    return out

def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return re.sub(r"[^a-z0-9']", '', w)

def read(p):
    with wave.open(p) as w:
        assert w.getframerate() == SR
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768

track, res, t = [], [], start
for b in blocks(lines):
    x = read(f'{d}/{block_name(lines, b)}'); t += lines[b[0]].get('gap', 0.3)
    U = [units_of(lines[i]['t']) for i in b]
    toks = [(li, k, w) for li, Ul in enumerate(U) for k, u in enumerate(Ul) for w in u['sp']]
    a16 = signal.resample_poly(x, 2, 3)
    # the text as a prompt usually helps, but it can make whisper return nothing for a line (ep22: 0/11 and 0/17 matched):
    # transcribe without it too and keep whichever matches more words
    best = None
    for prompt in (' '.join(w for *_, w in toks), None):
        segs, _ = model.transcribe(a16, language='fr', word_timestamps=True, beam_size=5, initial_prompt=prompt)
        hw = []
        for w in (w for s in segs for w in s.words):                 # whisper splits elisions (« n » + « 'a »): glue them back
            if hw and w.word.strip()[:1] in "'’": hw[-1] = (hw[-1][0] + norm(w.word), hw[-1][1], w.end)
            else: hw.append((norm(w.word), w.start, w.end))
        sm = difflib.SequenceMatcher(None, [norm(w) for *_, w in toks], [h[0] for h in hw], autojunk=False)
        tt = [None] * len(toks)
        for a, c, n in sm.get_matching_blocks():
            for j in range(n): tt[a + j] = (hw[c + j][1], hw[c + j][2])
        if best is None or sum(v is not None for v in tt) > sum(v is not None for v in best): best = tt
        if sum(v is not None for v in tt) >= 0.8 * len(toks): break
    tt = best
    dur = len(x) / SR
    known = [j for j, v in enumerate(tt) if v]                       # interpolate the misses by character count
    for j in range(len(toks)):
        if tt[j]: continue
        p = max([k for k in known if k < j], default=None); q = min([k for k in known if k > j], default=None)
        a0 = tt[p][1] if p is not None else 0.0; b0 = tt[q][0] if q is not None else dur
        gap = list(range((p if p is not None else -1) + 1, q if q is not None else len(toks)))
        L = [len(toks[g][2]) + 1 for g in gap]; c = np.cumsum([0] + L) / max(1, sum(L))
        g = gap.index(j); tt[j] = (a0 + (b0 - a0) * c[g], a0 + (b0 - a0) * c[g + 1])
    first = [min(j for j, tk in enumerate(toks) if tk[0] == li) for li in range(len(b))]
    last = [max(j for j, tk in enumerate(toks) if tk[0] == li) for li in range(len(b))]
    edge = [0.0] + [0.5 * (tt[last[li]][1] + tt[first[li + 1]][0]) for li in range(len(b) - 1)] + [dur]
    for li in range(len(b)):
        units = []
        for k, u in enumerate(U[li]):
            js = [j for j, tk in enumerate(toks) if tk[0] == li and tk[1] == k]
            units.append({'shown': u['shown'], 'red': u['red'], 't0': round(t + tt[js[0]][0], 3), 't1': round(t + tt[js[-1]][1], 3)})
        res.append({'t0': round(t + edge[li], 3), 't1': round(t + edge[li + 1], 3), 'units': units})
        hit = sum(1 for j in known if toks[j][0] == li); n = sum(1 for tk in toks if tk[0] == li)
        print(f'{res[-1]["t0"]:6.2f}-{res[-1]["t1"]:6.2f}  matched {hit}/{n}  {" ".join(u["shown"] for u in U[li])}')
    track.append((int(t * SR), x)); t += dur

n = int((t + 0.5) * SR); y = np.zeros(n, np.float32)
for i0, x in track: y[i0:i0 + len(x)] += x
y /= np.abs(y).max() + 1e-9
with wave.open(d + '.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 0.95 * 32767).astype(np.int16).tobytes())
json.dump({'duration': round(t, 3), 'lines': res}, open(d + '.json', 'w'), ensure_ascii=False, indent=1)
print('wrote', d + '.wav', d + '.json', f'{t:.2f} s')
