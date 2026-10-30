# Shared by tools/vo_kyutai.py, tools/vo_align.py and tools/vo_check.py: what the TTS reads, and how lines group into blocks.
# Owner, 30 Oct 2026: « la voix fait toujours trop robotisée, garde la même mais applique-toi sur la prononciation ».
# Two causes: every line was read on its own (the same fresh start and the same fall at the end of every line, then a fixed
# gap: a list, not a story), and the TTS was told to pause after every word (padding_between=1), which also flattened the
# questions (« vous montez ? » fell 1-4 semitones; read freely it rises 3-8 on about one take in two: tools/vo_score.py).
import re, hashlib

def spoken(s):
    """The words read aloud: [spoken|shown] -> spoken, *red* marks dropped."""
    return re.sub(r'\[([^|\]]*)\|[^\]]*\]', r'\1', s).replace('*', '')

def tts_text(s):
    """The text the TTS gets: no guillemets (they cost a second of noise), no French space before ? ! ; and plain dots."""
    s = spoken(s).replace('«', ' ').replace('»', ' ').replace(' ', ' ').replace(' ', ' ')
    s = re.sub(r'\s+([?!:;,.])', r'\1', s).replace('…', '...').replace(':', ',')   # (the TTS drops colons: a comma keeps the pause)
    return re.sub(r'\s+', ' ', s).strip()

def blocks(lines, split=0.45, most=4):
    """Consecutive lines read in one go, so the voice carries one intonation across them and pauses where it wants.
    A new block where the script leaves a real pause (gap >= split s), at a line marked "brk", or after `most` lines."""
    out = []
    for i, ln in enumerate(lines):
        if not out or ln.get('brk') or ln.get('gap', 0.3) >= split or len(out[-1]) >= most: out.append([i])
        else: out[-1].append(i)
    return out

def block_text(lines, b):
    return ' '.join(tts_text(lines[i]['t']) for i in b)

def block_name(lines, b):
    """One WAV per block, named by its first line and a hash of what is read (a changed text or seed is read again)."""
    key = block_text(lines, b) + '|' + str(sum(lines[i].get('seed', 0) for i in b))
    return f'b{b[0]:02d}_{hashlib.sha1(key.encode()).hexdigest()[:8]}.wav'

def block_seed(lines, b):
    return 1000 + b[0] + 100 * sum(lines[i].get('seed', 0) for i in b)
