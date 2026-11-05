"""Soundtrack for « 12 % » Partie 4 · Le noir (season 1 finale). Cue times come from the narration's timing
(audio/vo/ep23_<voice>.json), the same rules as episodes/ep23.js. A dark drone and her heartbeat; the hook (the handle going down in
slow motion, the door against the bolt); the dead phone; metal scraping in the lock, the key sliding in and turning twice; the handle's
spring; the door forcing and slamming into the bolt; the bolt sliding home at 4:29 (a memory); his whisper through the door;
Apple's growl; « ET SI… »: the key, the door swinging wide, his steps in, the latch; the tape rewind; the second slam; her steps;
the window's catch and hinges, the street air; her shout echoing off the façades; three switches across the street; DTMF 1-7
behind a window; running steps down the stairwell, keys hitting a tread; the French two-tone siren, doors, radio; the officers'
boots; the 22:41 hall (muffled); the purr; the end card's music box.
  python3 audio/ep23.py out/ep23.wav [voice]"""
import sys, os, json, math
import numpy as np
from synth import *

HERE = os.path.dirname(os.path.abspath(__file__))
voice = sys.argv[2] if len(sys.argv) > 2 else 'developpeuse'
VO = json.load(open(os.path.join(HERE, 'vo', f'ep23_{voice}.json')))
Ln = VO['lines']
L = lambda i: Ln[i]['t0']
def Lw(i, w, n=1):
    us = [u for u in Ln[i]['units'] if u['shown'].lower().startswith(w.lower())]
    return us[n - 1]['t0'] if len(us) >= n else Ln[i]['t0']
cut = lambda x: x - 0.08
END0 = Ln[-1]['t0'] - 0.25
DUR = math.ceil((VO['duration'] + 4.4) * 10) / 10
names = ['hook', 'dead', 'dark', 'lock', 'key', 'handle', 'force', 'bolt', 'bolt2', 'voice', 'apple', 'etsi', 'etsiOpen', 'etsiIn', 'stat',
         'rewind', 'holds', 'away', 'think', 'open', 'shout', 'across', 'third', 'tip1', 'steps', 'sirens', 'found', 'keys', 'tag', 'before',
         'double', 'tip2', 'mail', 'tip3', 'sit', 'alive', 'keys2', 'tags']
S = {n: (cut(L(i)) if i else 0.0) for i, n in enumerate(names)}; S['end'] = END0
nxt = {n: (S[names[i + 1]] if i + 1 < len(names) else END0) for i, n in enumerate(names)}
def at(n, k): return S[n] + k * (nxt[n] - S[n])
T_KEY = Lw(3, 'métal') - 0.1                                        # the key slides into her lock
T_TURN = [L(4) + 0.15, L(4) + 0.75]                                 # two turns
HOOK_BANG = 0.7 * S['dead']
BANG, BANG2 = L(7) + 0.1, Lw(16, 'Mais') + 0.15                     # the door against the bolt
m = Mix(DUR, seed=23)
rng = np.random.default_rng(2323)
POST = []                                                           # (t, x, kw): mixed after the ducking (slams, bangs)
def addp(t, x, **kw): POST.append((t, x, kw))

def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)
def seg(a, b): return max(0.05, b - a)
def heart(t0, t1, bpm0, bpm1, gain=0.22):
    tb = t0
    while tb < t1:
        k = (tb - t0) / max(0.01, t1 - t0); bpm = bpm0 + (bpm1 - bpm0) * k
        m.add(tb, heartbeat(rng), gain=gain, rev=0.1); tb += 60.0 / bpm
def click(f=2500):
    t = tt(0.05); return norm(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) + 0.4 * noise(0.05, rng, 'white') * np.exp(-t / 0.003))
def creak(dur, rng, f=180):
    t = tt(dur); fm = f * (1 + 0.25 * np.sin(2 * np.pi * 0.7 * t) + 0.1 * norm(lp(noise(dur, rng, 'white'), 6)))
    x = np.sign(np.sin(2 * np.pi * np.cumsum(fm) / SR)) * np.exp(-((t - dur / 2) / (dur / 2.2)) ** 2)
    return norm(bp(x, 300, 2500))
def tinnitus(dur):
    t = tt(dur); return np.sin(2 * np.pi * 5800 * t) * np.sin(np.pi * t / dur) ** 2
def step(f=95, hard=1.0):
    x = thud(rng, f, 0.18).copy(); c = lp(creak(0.12, rng, 260 + rng.uniform(-40, 40)), 2600); n = min(len(x), len(c))
    x[:n] += 0.25 * hard * c[:n]
    return norm(lp(x, 1800))
def steps(t0, t1, period, gain=0.08, f=95, pan=0.0, rev=0.35, hard=1.0, muffle=None, fade_to=1.0):
    tb = t0
    while tb < t1:
        k = (tb - t0) / max(0.01, t1 - t0); x = step(f + rng.uniform(-8, 8), hard); x = x if muffle is None else norm(lp(x, muffle))
        m.add(tb, x, gain=gain * rng.uniform(0.85, 1.1) * (1 + (fade_to - 1) * k), pan=pan, rev=rev); tb += period * rng.uniform(0.94, 1.06)
def breath(dur, rng, rate=0.6):
    t = tt(dur); e = np.maximum(0, np.sin(2 * np.pi * rate * t)) ** 1.5
    return norm(bp(noise(dur, rng, 'pink'), 500, 3200) * e)
def comb(x, d, fb):
    n = int(d * SR); y = x.copy()
    for i in range(n, len(y)): y[i] += fb * y[i - n]
    return y
# the lock and the door
def scrape(dur):
    """metal on metal: a key point searching the keyhole"""
    t = tt(dur); g = np.abs(norm(lp(noise(dur, rng, 'white'), 18))) ** 1.5
    return norm(bp(noise(dur, rng, 'white'), 2500, 8000) * g + 0.4 * bp(noise(dur, rng, 'white'), 900, 2500) * g)
def key_in():
    """the shank sliding into the lock: a short rising rasp and a seat click"""
    t = tt(0.35); x = bp(noise(0.35, rng, 'white'), 1800, 7000) * np.exp(-((t - 0.15) / 0.09) ** 2)
    c = click(1900); x[-len(c):] += 0.8 * c; return norm(x)
def turn_clack():
    """one turn of an old mortise lock: the bit drags, the bolt jumps back"""
    t = tt(0.32); drag = bp(noise(0.32, rng, 'white'), 1200, 5000) * np.exp(-((t - 0.12) / 0.07) ** 2) * 0.5
    x = drag.copy(); c = norm(thud(rng, 140, 0.18)) * 0.7; n0 = int(0.2 * SR); x[n0:n0 + len(c)] += c[: len(x) - n0]
    k = click(1100) + 0.6 * click(700); x[n0:n0 + len(k)] += k[: len(x) - n0]; return norm(x)
def lever_spring(dur=1.4, up=False):
    """the handle's return spring winding (or snapping back)"""
    t = tt(dur); f = 520 + (280 if up else -160) * t / dur
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f * (1 + 0.06 * np.sin(2 * np.pi * 9 * t))) / SR)) * np.sin(np.pi * t / dur) ** 2
    return norm(bp(x, 400, 3000))
def bolt_rattle(dur=0.5):
    t = tt(dur); return norm(bp(noise(dur, rng, 'white'), 2200, 7500) * np.exp(-t / 0.08) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 38 * t))))
def slam():
    """the leaf driven into the bolt: a wooden boom and the keeper's metal clack"""
    x = thud(rng, 85, 0.5) + 0.5 * bp(noise(0.5, rng, 'white'), 300, 2000) * np.exp(-tt(0.5) / 0.03)
    r = bolt_rattle(0.45); x[: len(r)] += 0.5 * r; return norm(lp(x, 4500))
def wood_groan(dur):
    return norm(lp(creak(dur, rng, 95), 900) + 0.4 * lp(noise(dur, rng, 'brown'), 200) * np.sin(np.pi * tt(dur) / dur))
def growl(dur):
    """a cat's low growl: a buzzing ~26 Hz pulse train through a nasal formant"""
    t = tt(dur); p = (np.sin(2 * np.pi * 26 * t + 0.6 * np.sin(2 * np.pi * 0.8 * t)) > 0.3).astype(float)
    x = bp(noise(dur, rng, 'pink') * p, 250, 900) * np.sin(np.pi * t / dur) ** 0.7
    return norm(x)
def purr(dur):
    """a purr: ~25 Hz grain, louder on the in-breath and the out-breath"""
    t = tt(dur); g = (np.sin(2 * np.pi * 25 * t) > 0.2).astype(float) * (0.55 + 0.45 * np.abs(np.sin(np.pi * t / 1.6)))
    return norm(lp(bp(noise(dur, rng, 'brown'), 40, 400) * g, 500)) * fade(np.ones(len(t)), 0.6, 0.8)
def switch_far():
    return norm(lp(click(1500) + 0.5 * click(800), 2000))
def dtmf(lo, hi, dur=0.16):
    t = tt(dur); return norm(np.sin(2 * np.pi * lo * t) + np.sin(2 * np.pi * hi * t)) * fade(np.ones(len(t)), 0.005, 0.01)
def jingle(n=7):
    """keys hitting a stone tread: a cluster of short metal pings"""
    x = np.zeros(int(0.6 * SR))
    for i in range(n):
        f = rng.uniform(2600, 6200); d = rng.uniform(0.08, 0.25); tt_ = tt(d); y = np.sin(2 * np.pi * f * tt_) * np.exp(-tt_ / (d / 4)) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt_) * np.exp(-tt_ / (d / 6))
        o = int(rng.uniform(0, 0.25) * SR); x[o:o + len(y)] += y[: len(x) - o] * rng.uniform(0.4, 1.0)
    return norm(x)
def siren(dur, f1=435.0, f2=580.0, period=1.2):
    """the French two-tone (« deux-tons »): two notes, half a period each, through a horn"""
    t = tt(dur); f = np.where((t % period) < period / 2, f1, f2)
    ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sign(np.sin(ph)) * 0.6 + np.sin(ph) + 0.3 * np.sin(2 * ph)
    return norm(bp(x, 300, 3500))
def radio(dur):
    """a police radio: squelch bursts of band-limited noise and a garbled voice rhythm"""
    t = tt(dur); g = (np.sin(2 * np.pi * 0.6 * t + 1.3) > 0.2).astype(float) * (0.5 + 0.5 * (np.sin(2 * np.pi * 4.3 * t) > 0))
    return norm(bp(noise(dur, rng, 'white') * g, 700, 2800))
def engine(dur, rng, f0=38):
    t = tt(dur); x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.04 * np.sin(2 * np.pi * 0.3 * t))) / SR)
    return norm(lp(np.sign(x) * 0.4 + x + 0.5 * norm(lp(noise(dur, rng, 'brown'), 160)), 700))

theme = [62, 65, 69, 68, 65, 62, 61]           # the series motif (music box)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

# ---------- under everything: a dark drone that swells with the danger ----------
dr = drone([73.42, 110.0, 146.83, 155.56], DUR, rng, cutoff=520, lfo=0.05)
shape = env_at(tt(DUR), [0, S['dead'], S['lock'], S['force'], S['voice'], S['etsi'], S['etsiIn'], S['stat'], S['rewind'], S['holds'], S['open'], S['third'], S['steps'], S['sirens'],
                         S['found'], S['tag'], S['mail'], S['sit'], S['keys2'], S['end'], DUR],
               [0.9, 0.5, 0.7, 0.9, 1.0, 0.8, 1.0, 0.5, 0.6, 0.9, 0.7, 0.5, 0.8, 0.5, 0.6, 0.8, 0.45, 0.25, 0.85, 0.5, 0.0])
m.add(0.0, (dr[0] * shape, dr[1] * shape), gain=0.07, rev=0.45)

# ---------- hook: a hit on frame 1; the handle going down by itself in slow motion; the door against the bolt ----------
m.add(0.0, boom(rng, 3.0, 48, 22, 1.8, 0.5, 1.0), gain=0.8, rev=0.5)
m.add(0.05, lp(lever_spring(HOOK_BANG - 0.1), 2200), gain=0.05, rev=0.5)
m.add(0.2, fade(lp(scrape(1.2), 3500), 0.1, 0.4), gain=0.03, rev=0.4)
m.add(0.0, tinnitus(S['dead']), gain=0.01, rev=0.3)
heart(0.2, S['dead'], 70, 74, 0.2)
addp(HOOK_BANG, slam(), gain=0.6, rev=0.4)
m.add(HOOK_BANG, boom(rng, 2.0, 50, 26, 1.0, 0.3, 0.8), gain=0.35, rev=0.5)
m.add(S['dead'] - 0.6, riser(rng, 0.6, 200, 3500, 2.0) * np.linspace(1, 0.2, int(0.6 * SR)), gain=0.1, rev=0.3)
m.add(S['dead'], thud(rng, 46, 0.7), gain=0.45, rev=0.3)

# ---------- 4:47: the dead phone (a press, nothing), the dark room ----------
m.add(at('dead', 0.3), click(3200) * 0.6, gain=0.05, rev=0.05)
m.add(at('dead', 0.32), bell(midi(86), rng, 0.6) * 0.3, gain=0.015, rev=0.4)
m.add(S['dead'], fade(norm(lp(noise(seg(S['dead'], S['lock']), rng, 'brown'), 120)), 0.4, 0.3), gain=0.05, rev=0.4)   # the building at night
heart(S['dead'], S['lock'], 74, 80, 0.15)
# ---------- metal in the lock: the key searching, sliding in; two turns; the handle ----------
m.add(T_KEY - 1.0, fade(scrape(1.0), 0.05, 0.1), gain=0.05, pan=0.1, rev=0.2)
m.add(T_KEY, key_in(), gain=0.09, pan=0.1, rev=0.2)
m.add(T_KEY + 0.02, metal_hit(rng, 300, 1.6), gain=0.05, rev=0.6)
for tk in T_TURN: m.add(tk + 0.25, turn_clack(), gain=0.14, pan=0.1, rev=0.3)
m.add(T_TURN[1] + 0.45, boom(rng, 1.8, 50, 28, 1.0, 0.2, 0.7), gain=0.25, rev=0.5)
heart(S['lock'], S['handle'], 96, 118, 0.2)
m.add(S['handle'] + 0.2, lever_spring(seg(S['handle'] + 0.2, S['force'] - 0.1)), gain=0.06, pan=0.1, rev=0.3)
m.add(S['force'] - 0.15, click(1300) + 0.5 * click(800), gain=0.08, rev=0.2)                                    # the latch draws back
# ---------- the door forces; the bolt holds ----------
m.add(S['force'] + 0.05, wood_groan(seg(S['force'], BANG)), gain=0.12, rev=0.3)
m.add(S['force'] + 0.1, fade(bolt_rattle(seg(S['force'], BANG) - 0.1), 0.05, 0.05), gain=0.03, rev=0.2)
addp(BANG, slam(), gain=0.75, rev=0.4)
m.add(BANG, boom(rng, 2.6, 48, 24, 1.4, 0.4, 0.9), gain=0.45, rev=0.5)
m.add(S['bolt2'] - 0.3, lever_spring(0.3, up=True), gain=0.06, rev=0.3)                                       # he lets go of the handle
heart(S['force'], S['bolt2'], 120, 132, 0.21)
# ---------- 4:29, a memory: the bolt sliding home (muffled, far) ----------
mem = seg(S['bolt2'], S['voice'])
m.add(S['bolt2'], fade(norm(lp(noise(mem, rng, 'pink'), 600)), 0.2, 0.3), gain=0.03, rev=0.6)
bt = at('bolt2', 0.3)
m.add(bt, lp(norm(bp(noise(0.3, rng, 'white'), 1200, 5000)) * np.exp(-tt(0.3) / 0.1), 2500), gain=0.05, rev=0.6)
m.add(bt + mem * 0.25, lp(click(1000) + 0.7 * click(620), 2500), gain=0.12, rev=0.7)
m.add(S['bolt2'] + 0.1, bell(midi(74), rng, 2.4), gain=0.035, rev=0.8)
# ---------- his voice through the door (the quote is filtered below); Apple's growl ----------
m.add(S['voice'], fade(norm(lp(noise(seg(S['voice'], S['apple']), rng, 'brown'), 90)), 0.2, 0.3), gain=0.08, rev=0.4)
heart(S['voice'], S['etsi'], 130, 138, 0.2)
m.add(at('apple', 0.25), fade(growl(seg(S['apple'], S['etsi']) * 0.7), 0.3, 0.3), gain=0.07, pan=-0.1, rev=0.25)

# ---------- « ET SI… »: the bolt undone; the key turns, the door swings wide, his steps, the latch ----------
m.add(S['etsi'] - 0.2, riser(rng, 1.2, 300, 5000, 1.6), gain=0.12, rev=0.6)
m.add(S['etsi'] + 0.05, bell(midi(74), rng, 2.4), gain=0.06, rev=0.7)
m.add(at('etsi', 0.3), click(1000) + 0.7 * click(620), gain=0.09, rev=0.4)                                   # the bolt draws back by itself
for j in range(2): m.add(S['etsiOpen'] + 0.2 + 0.45 * j, turn_clack(), gain=0.12, rev=0.3)
m.add(at('etsiOpen', 0.12), lever_spring(0.35), gain=0.06, rev=0.3)
m.add(at('etsiOpen', 0.22), creak(1.6, rng, 120), gain=0.12, rev=0.4)
m.add(at('etsiOpen', 0.25), fade(norm(lp(noise(2.0, rng, 'pink'), 700)), 0.2, 0.8), gain=0.05, rev=0.5)    # the stairwell's air
m.add(at('etsiOpen', 0.62), lp(thud(rng, 70, 0.3), 900), gain=0.15, rev=0.4)                                 # the leaf hits its stop
heart(S['etsiOpen'], S['stat'], 140, 156, 0.23)
for j in range(3): m.add(S['etsiIn'] + 0.15 + 0.55 * j, step(85, 1.0), gain=0.16, rev=0.3)
m.add(at('etsiIn', 0.55), creak(1.0, rng, 150), gain=0.09, rev=0.35)
addp(at('etsiIn', 0.98), lp(thud(rng, 75, 0.45), 1400), gain=0.5, rev=0.4)                                   # the door shut behind him
m.add(at('etsiIn', 0.98), click(900) + 0.6 * click(560), gain=0.13, rev=0.3)
m.add(at('etsiIn', 0.98), boom(rng, 3.0, 44, 20, 2.0, 0.3, 1.0), gain=0.6, rev=0.6)
m.add(S['stat'], fade(norm(lp(noise(seg(S['stat'], S['rewind']) + 0.3, rng, 'brown'), 70)), 0.05, 0.8), gain=0.1, rev=0.5)
pn = pad([73.42, 110.0, 146.83, 174.61], seg(S['stat'], S['rewind']), rng, cutoff=900, attack=0.8, release=0.5, voices=2, harmonics=8)
m.add(S['stat'], (fade(pn[0], 0.8, 0.4), fade(pn[1], 0.8, 0.4)), gain=0.06, rev=0.6)
# ---------- rewind ----------
rw = seg(S['rewind'], S['holds'])
t_ = tt(rw); f_ = 260 * np.exp(np.log(14) * t_ / rw)
x_ = np.sin(2 * np.pi * np.cumsum(f_ * (1 + 0.05 * np.sin(2 * np.pi * 27 * t_))) / SR)
m.add(S['rewind'], norm(lp(x_, 4500) * np.sin(np.pi * t_ / rw) ** 0.4 + 0.3 * norm(bp(noise(rw, rng, 'white'), 1500, 6000))), gain=0.14, rev=0.25)
m.add(S['holds'] - 0.03, click(1200), gain=0.12, rev=0.2)

# ---------- the bolt holds; a second slam; she backs away to the window ----------
m.add(BANG2 - 0.5, wood_groan(0.5), gain=0.1, rev=0.3)
addp(BANG2, slam(), gain=0.7, rev=0.4)
m.add(BANG2, boom(rng, 2.2, 50, 26, 1.2, 0.3, 0.8), gain=0.35, rev=0.5)
heart(S['holds'], S['open'], 138, 128, 0.2)
steps(S['away'] + 0.2, S['think'] - 0.1, 0.62, gain=0.03, f=150, rev=0.15, hard=0.6)
m.add(at('away', 0.45), lp(creak(0.5, rng, 210), 1800), gain=0.035, rev=0.2)
m.add(S['think'] + 0.3, fade(breath(seg(S['think'], S['open']), rng, 0.45), 0.2, 0.3), gain=0.06, rev=0.1)
# ---------- the window: the catch, the hinges, the street air; her shout echoes off the façades ----------
m.add(at('open', 0.15), click(900) + 0.8 * click(500), gain=0.14, rev=0.3)                                    # the espagnolette
m.add(at('open', 0.2), creak(1.2, rng, 230), gain=0.07, pan=-0.2, rev=0.35)
m.add(at('open', 0.25), creak(1.0, rng, 260), gain=0.06, pan=0.2, rev=0.35)
street = seg(at('open', 0.25), S['steps'])
m.add(at('open', 0.25), fade(wind(rng, street, 120, 700, 0.12, 0.3), 0.6, 0.8), gain=0.05, rev=0.4)
m.add(at('open', 0.25), fade(norm(lp(noise(street, rng, 'brown'), 140)), 0.6, 0.8), gain=0.06, rev=0.5)        # the city at night
heart(S['shout'], S['third'], 140, 132, 0.18)
# ---------- across the street: three switches, three windows; the 3rd-floor neighbour dials 1-7 ----------
for w in ('une', 'deux', 'trois'): m.add(Lw(21, w) + 0.05, switch_far(), gain=0.05, pan=rng.uniform(-0.4, 0.4), rev=0.7)
d0 = at('third', 0.55)
m.add(d0, lp(dtmf(697, 1209), 2500), gain=0.025, pan=0.3, rev=0.5); m.add(d0 + 0.3, lp(dtmf(852, 1209), 2500), gain=0.025, pan=0.3, rev=0.5)
pt = pad([73.42, 110.0, 146.83, 174.61], seg(S['tip1'], S['steps']), rng, cutoff=900, attack=0.8, release=0.5, voices=2, harmonics=8)
m.add(S['tip1'], (fade(pt[0], 0.8, 0.4), fade(pt[1], 0.8, 0.4)), gain=0.05, rev=0.6)
# ---------- he runs: steps going down, fading; the keyring hits a tread ----------
steps(S['steps'] + 0.1, S['sirens'] - 0.2, 0.21, gain=0.12, f=90, rev=0.6, muffle=1500, fade_to=0.3)
m.add(at('steps', 0.75), jingle(8), gain=0.06, rev=0.7)
m.add(S['steps'] + 0.05, metal_hit(rng, 300, 1.6), gain=0.06, rev=0.6)
heart(S['steps'], S['sirens'], 132, 120, 0.18)
# ---------- 4:58: the two-tone siren arriving, the car stopping, its doors, the radio ----------
sr_ = seg(S['sirens'] - 1.2, S['found'] + 0.3)
sg = env_at(tt(sr_), [0, 1.2, sr_ * 0.75, sr_], [0.15, 0.6, 1.0, 0.0])
m.add(S['sirens'] - 1.2, siren(sr_) * sg, gain=0.09, rev=0.5)
m.add(S['sirens'], fade(engine(seg(S['sirens'], S['found']), rng), 0.2, 0.4), gain=0.06, rev=0.35)
m.add(at('sirens', 0.6), fade(norm(bp(noise(0.6, rng, 'pink'), 150, 900)), 0.05, 0.3), gain=0.04, rev=0.3)       # the tyres stop
for j in range(2): m.add(at('sirens', 0.78) + 0.3 * j, lp(thud(rng, 95, 0.25), 1500), gain=0.12, rev=0.5)     # doors
m.add(at('sirens', 0.85), radio(1.0), gain=0.025, rev=0.4)
# ---------- the stairs: officers' boots, the radio, a stop ----------
steps(S['found'] - 0.3, at('found', 0.5), 0.4, gain=0.12, f=80, rev=0.6, hard=1.2)
m.add(at('found', 0.45), radio(0.9), gain=0.03, rev=0.3)
m.add(at('found', 0.15), boom(rng, 2.0, 46, 26, 1.2, 0.3, 0.8), gain=0.3, rev=0.5)
heart(S['found'], S['mail'], 118, 100, 0.16)
m.add(S['keys'] + 0.1, jingle(5) * 0.5, gain=0.03, rev=0.5)
m.add(Lw(28, 'Chez'), metal_hit(rng, 260, 2.2), gain=0.1, rev=0.7)
m.add(Lw(28, 'Chez'), boom(rng, 2.6, 44, 22, 1.6, 0.3, 1.0), gain=0.5, rev=0.6)
m.add(Lw(29, 'Avant'), boom(rng, 2.0, 46, 26, 1.2, 0.2, 0.8), gain=0.3, rev=0.5)
m.add(at('double', 0.15), lp(key_in(), 3000), gain=0.05, rev=0.6)
m.add(Lw(30, 'personne'), metal_hit(rng, 300, 1.8), gain=0.08, rev=0.6)
p2 = pad([73.42, 110.0, 146.83, 174.61], seg(S['tip2'], S['mail']), rng, cutoff=900, attack=0.8, release=0.5, voices=2, harmonics=8)
m.add(S['tip2'], (fade(p2[0], 0.8, 0.4), fade(p2[1], 0.8, 0.4)), gain=0.05, rev=0.6)
# ---------- 22:41, the hall (muffled): the street door swings shut, his steps, a letterbox flap ----------
hl = seg(S['mail'], S['sit'])
m.add(S['mail'] - 0.3, whoosh(rng, 0.5, 300, 2500, 0.5), gain=0.08, rev=0.4)
m.add(S['mail'], fade(norm(lp(noise(hl, rng, 'pink'), 500)), 0.3, 0.4), gain=0.035, rev=0.7)
m.add(S['mail'] + 0.3, lp(thud(rng, 70, 0.5), 900), gain=0.18, rev=0.8)
steps(S['mail'] + 0.7, at('mail', 0.6), 0.6, gain=0.05, f=110, rev=0.8, muffle=1400)
m.add(at('mail', 0.7), lp(click(2000) + 0.5 * click(1200), 3000), gain=0.04, rev=0.6)
m.add(at('tip3', 0.4), lp(norm(bp(noise(0.4, rng, 'white'), 2000, 7000)) * np.exp(-tt(0.4) / 0.15), 6000), gain=0.03, rev=0.3)   # the label peeled off
# ---------- 5:10: calm; the police radio far below; Apple purring ----------
m.add(S['sit'], fade(norm(lp(noise(seg(S['sit'], S['keys2']), rng, 'brown'), 120)), 0.5, 0.5), gain=0.04, rev=0.4)
m.add(at('sit', 0.5), lp(radio(1.2), 1400), gain=0.012, rev=0.6)
m.add(at('sit', 0.55), purr(seg(at('sit', 0.55), S['keys2'])), gain=0.07, rev=0.1)
heart(S['sit'], S['keys2'], 92, 76, 0.13)
ps = pad([73.42, 110.0, 146.83, 220.0], seg(S['sit'], S['keys2']), rng, cutoff=1000, attack=1.5, release=0.6, voices=2, harmonics=8)
m.add(S['sit'], (fade(ps[0], 1.5, 0.6), fade(ps[1], 1.5, 0.6)), gain=0.05, rev=0.6)
# ---------- other keys, other tags: the danger comes back ----------
m.add(S['keys2'], boom(rng, 2.4, 46, 24, 1.4, 0.3, 0.9), gain=0.4, rev=0.6)
m.add(S['keys2'] + 0.2, jingle(6) * 0.6, gain=0.035, rev=0.6)
m.add(Lw(37, 'étiquettes'), metal_hit(rng, 240, 2.4), gain=0.12, rev=0.7)
m.add(Lw(37, 'étiquettes'), boom(rng, 3.0, 42, 20, 2.0, 0.3, 1.0), gain=0.6, rev=0.6)
heart(S['keys2'], S['end'], 100, 120, 0.17)
# ---------- end card: the series motif on a music box over a dark pad ----------
pe = pad([73.42, 110.0, 146.83, 174.61], DUR - S['end'] + 0.1, rng, cutoff=1100, attack=1.0, release=2.0, voices=2, harmonics=8)
m.add(S['end'] + 0.3, (fade(pe[0], 1.0, 2.0), fade(pe[1], 1.0, 2.0)), gain=0.08, rev=0.6)
for j, nn in enumerate(theme): m.add(S['end'] + 0.4 + j * 0.42, bell(midi(nn + 12), rng, 2.2), gain=0.065, pan=0.25 * math.sin(j * 1.7), rev=0.7)
m.add(S['end'] + 1.2, woodblock(rng, 1250), gain=0.04, rev=0.25)

# ---------- the narration: the music ducks under it; his « Inès. Ouvre-moi. » comes through the door, her shout echoes ----------
import wave
from scipy import signal
vp = os.path.join(HERE, 'vo', f'ep23_{voice}.wav')
with wave.open(vp, 'rb') as w: vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
vo = signal.resample_poly(vo, SR, vsr)[: m.n]
vo = hp(vo, 80) + 0.25 * bp(vo, 2200, 5200)
def through(a_t, b_t, fn, mix=0.8):
    a, b = int(a_t * SR), int(b_t * SR); s0 = vo[a:b].copy(); x = fn(s0)
    k = np.linspace(0, 1, len(s0)); w_ = np.clip(np.minimum(k / 0.04, (1 - k) / 0.08), 0, 1)
    vo[a:b] = s0 * (1 - w_) + mix * norm(x) * np.abs(s0).max() * w_
through(Lw(9, 'Inès') - 0.05, Ln[9]['t1'] + 0.4, lambda s0: comb(lp(bp(s0, 250, 2400), 1500), 0.0061, 0.35))          # behind the door
def echo(s0):
    y = s0.copy(); d1, d2 = int(0.19 * SR), int(0.46 * SR)
    y[d1:] += 0.32 * lp(s0[:-d1], 2500); y[d2:] += 0.16 * lp(s0[:-d2], 1800); return y
through(Ln[20]['t0'] - 0.05, Ln[20]['t1'] + 0.7, echo, mix=0.9)                                                     # off the façades
env = np.sqrt(signal.sosfilt(signal.butter(1, 12, 'lowpass', fs=SR, output='sos'), vo * vo) + 1e-12)
vo = vo * np.where(env > 0.06, (0.06 / env) ** 0.45, 1.0)
duck = signal.sosfilt(signal.butter(1, 3, 'lowpass', fs=SR, output='sos'), np.clip(env / 0.03, 0, 1))
duck = 1.0 - 0.5 * np.clip(duck, 0, 1)
n = len(duck); m.L[:n] *= duck; m.R[:n] *= duck; m.rev_L[:n] *= duck; m.rev_R[:n] *= duck
m.add(0.0, norm(vo), gain=0.95, rev=0.05)
for t_, x_, kw in POST: m.add(t_, x_, **kw)

out = sys.argv[1] if len(sys.argv) > 1 else 'out/ep23.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
