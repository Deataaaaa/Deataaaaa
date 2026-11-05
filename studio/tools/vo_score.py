# Scores a narration take: the words Whisper hears against the script, and whether each question rises in pitch.
# tools/vo_kyutai.py keeps the best of several takes with it, tools/vo_check.py prints the report.
# Whisper writes numbers as digits (« 2h14 », « 12% »): they are spelled out before comparing, and words that sound the same
# (seule/seul, monte/montent) count as the same word. A French question without inversion (« vous montez ? ») must rise at
# its end: it passes when Whisper hears a « ? » on its last word or when that word ends 2.5+ semitones over the line (YIN).
# Questions with a question word (comment, qui…) and « Et si… ? » fall naturally and are not tested.
import re, unicodedata
import numpy as np
from num2words import num2words

def _n(s, **k): return num2words(int(s.replace(' ', '').replace(' ', '').replace(' ', '')), lang='fr', **k)
def spell(s):
    """Digits as Whisper writes them -> French words."""
    s = re.sub(r'(\d+)\s?h\s?(\d+)', lambda m: f'{_n(m[1])} heures {_n(m[2])}', s)
    s = re.sub(r'(\d+)\s?h\b', lambda m: f'{_n(m[1])} heures', s)
    s = re.sub(r'(\d[\d   ]*\d|\d)\s?%', lambda m: f'{_n(m[1])} pour cent', s)
    s = re.sub(r'(\d[\d   ]*\d|\d)\s?€', lambda m: f'{_n(m[1])} euros', s)
    s = re.sub(r'\b1er\b', 'premier', s)
    s = re.sub(r'(\d+)\s?(e|ème)\b', lambda m: _n(m[1], to='ordinal'), s)
    return re.sub(r'\d+(?:[   ]\d{3})*', lambda m: _n(m[0]), s)

def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', w)

def key(w):
    """A rough sound key: the silent endings of French (-ent, -s, -e, -x, -t) go."""
    w = norm(w)
    if len(w) > 4 and w.endswith('ent'): w = w[:-3]
    w = re.sub(r'[sx]$', '', w); w = re.sub(r'e$', '', w) if len(w) > 2 else w
    return re.sub(r'(.)\1', r'\1', w)                                  # (Pigalle / Pigal)

def words(s):
    """Script or transcript -> [(key, raw)], split on spaces, hyphens and elisions."""
    out = []
    for raw in spell(s).replace('’', "'").replace("'", "' ").replace('-', ' ').split():
        if norm(raw): out.append((key(raw), raw))
    return out

def yin(x, sr, fmin=110, fmax=480, hop=0.01, win=0.03, th=0.18):
    N, t0, t1 = int(win * sr), int(sr / fmax), int(sr / fmin); f = []
    for i in range(0, len(x) - N - t1, int(hop * sr)):
        fr = x[i:i + N + t1]
        if np.sqrt(np.mean(fr[:N] ** 2)) < 0.006: f.append(0); continue
        dd = np.array([np.sum((fr[:N] - fr[t:t + N]) ** 2) for t in range(t1 + 1)])
        c = dd.copy(); c[1:] = dd[1:] * np.arange(1, t1 + 1) / np.maximum(np.cumsum(dd[1:]), 1e-9); c[0] = 1
        k = next((t for t in range(t0, t1) if c[t] < th and c[t] <= c[t + 1]), None)
        f.append(sr / k if k else 0)
    return np.array(f)

WH = re.compile(r"\b(qui|que|qu'|quoi|comment|où|ou|pourquoi|quand|combien|quel|quelle|quels|quelles|lequel|laquelle)\b", re.I)
def rising(t):
    """A question that must rise: a yes/no question without a question word (« vous montez ? »); « comment… ? », « pour qui ? »
    and « Et si… ? » fall naturally in French."""
    t = t.rstrip(' »"')
    if not t.endswith('?'): return False
    last = re.split(r'[.!…:]\s', t)[-1]
    return not WH.search(last) and not re.match(r"\s*«?\s*et si\b", last, re.I)

F0_REF, RATE = 238.0, (2.4, 4.4)
def score(x, sr, line_texts, model):
    """x: one block's audio; line_texts: the spoken text of each line in it. Returns a dict: bad (words heard differently),
    n (script words), flat (questions that do not rise), half (questions only one test passes), cost, diffs, rises, heard, words (Whisper's words with times)."""
    import difflib
    from scipy import signal
    a16 = signal.resample_poly(x, 16000, sr) if sr != 16000 else x
    segs, _ = model.transcribe(a16, language='fr', beam_size=5, word_timestamps=True, condition_on_previous_text=False)
    segs = list(segs)
    ws = []                                                            # Whisper's words, « 45 » + « 000 » and « 12 » + « % » glued back
    for w in (w for s in segs for w in s.words):
        if ws and re.fullmatch(r'\s?(\d{3}\W*|[%€]\W*)', w.word) and re.search(r'\d$', ws[-1][0]): ws[-1] = (ws[-1][0] + ' ' + w.word.strip(), ws[-1][1], w.end)
        else: ws.append((w.word.strip(), w.start, w.end))
    hw = [(k, raw, s0, s1) for raw, s0, s1 in ws for k, _ in words(raw)]   # (key, raw, start, end)
    A, ends = [], []                                                   # the script's keys, and where each line ends
    for t in line_texts: A += [k for k, _ in words(t)]; ends.append(len(A) - 1)
    sm = difflib.SequenceMatcher(None, A, [h[0] for h in hw], autojunk=False)
    ops = sm.get_opcodes(); pos = {a + j: b + j for a, b, n in sm.get_matching_blocks() for j in range(n)}
    bad = sum(a1 - a0 for op, a0, a1, b0, b1 in ops if op != 'equal') + sum(b1 - b0 for op, a0, a1, b0, b1 in ops if op == 'insert')
    diffs = [f"{' '.join(A[a0:a1]) or '∅'} → {' '.join(h[0] for h in hw[b0:b1]) or '∅'}" for op, a0, a1, b0, b1 in ops if op != 'equal']
    f = yin(x, sr); flat = half = 0; rises = []
    for li, t in enumerate(line_texts):
        if not rising(t): continue
        h = pos.get(ends[li])
        if h is None: flat += 1; rises.append((li, None, False)); continue
        first = pos.get(ends[li - 1] + 1 if li else 0, h)
        s0, s1 = hw[h][2], hw[h][3]; ls0 = hw[first][2]
        e = f[int(s0 / 0.01): int((s1 + 0.06) / 0.01)]; e = e[e > 0]
        L = f[int(ls0 / 0.01): int((s1 + 0.06) / 0.01)]; L = L[L > 0]
        r = 12 * np.log2(np.median(e[-max(1, len(e) // 2):]) / np.median(L)) if len(e) and len(L) else float('nan')
        heardq, rose = '?' in hw[h][1], r == r and r >= 2.5
        ok = heardq or rose
        flat += not ok; half += ok and not (heardq and rose); rises.append((li, r, ok))
    # one performance: the block's pitch near the voice's own (F0_REF), and every line at a speaking pace (RATE words/s);
    # S2 P2's blocks swung from 207 to 296 Hz and from 1.8 to 7.2 words/s, which read as several voices
    fv = f[f > 0]; f0 = float(np.median(fv)) if len(fv) else F0_REF
    off = abs(12 * np.log2(f0 / F0_REF)); pitch = max(0.0, off - 1.0)
    rates, pace = [], 0.0
    for li in range(len(line_texts)):
        a0 = pos.get(ends[li - 1] + 1 if li else 0); a1 = pos.get(ends[li])
        nw = ends[li] - (ends[li - 1] if li else -1)
        if a0 is None or a1 is None or nw < 3: continue
        r = nw / max(0.2, hw[a1][3] - hw[a0][2]); rates.append(round(r, 1))
        pace += max(0.0, r - RATE[1]) + max(0.0, RATE[0] - r)
    return {'bad': bad, 'n': len(A), 'flat': flat, 'half': half, 'f0': f0, 'rates': rates,
            'cost': 2 * bad + 3 * flat + 0.5 * half + 2.0 * pitch + 1.5 * pace, 'diffs': diffs, 'rises': rises,
            'heard': ' '.join(s.text.strip() for s in segs), 'words': hw}
