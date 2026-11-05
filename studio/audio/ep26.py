"""Soundtrack for « 12 % » Saison 2 · Partie 3 · Le verre (scarier: a darker drone, silences, low hits). Cue times come from the
narration's timing (audio/vo/ep26_<voice>.json), the same rules as episodes/ep26.js. The hook: a hit, the glass set down, the bar's
music through the room; the commissariat (strip lights, keys); the flashback whoosh into the bar; « ET SI… »: the sip, then the room's
sound stretching and sinking (the music slowed and muffled, a ringing), her heart slowing; his line close to her ear; nobody moves; the
door swings shut on the street; her phone buzzing on the counter; the ANSM cards; the tape rewind; the moves; back at the
commissariat: the paper drawn out of the pocket, turned over, a low hit, silence; 3 %; the end card's music box.
  python3 audio/ep26.py out/ep26.wav [voice]"""
import sys, os, json, math
import numpy as np
from synth import *

HERE = os.path.dirname(os.path.abspath(__file__))
voice = sys.argv[2] if len(sys.argv) > 2 else 'developpeuse'
VO = json.load(open(os.path.join(HERE, 'vo', f'ep26_{voice}.json')))
Ln = VO['lines']
L = lambda i: Ln[i]['t0']
def Lw(i, w, n=1):
    us = [u for u in Ln[i]['units'] if u['shown'].lower().replace('«', '').replace('»', '').replace('"', '').replace('…', '').startswith(w.lower())]
    return us[n - 1]['t0'] if len(us) >= n else Ln[i]['t0']
cut = lambda x: x - 0.08
END0 = Ln[-1]['t0'] - 0.25
DUR = math.ceil((VO['duration'] + 4.4) * 10) / 10
starts = [('hook', 0.0), ('s1', cut(L(1))), ('s2', cut(L(2))), ('f1', cut(L(3))), ('f2', cut(L(4))), ('etsi', cut(L(5))),
          ('e1a', cut(L(6))), ('e1b', cut(Lw(6, 'Dix'))), ('e2', cut(L(7))), ('e3', cut(L(8))), ('e4', cut(L(9))), ('e4b', cut(Lw(9, 'La'))), ('stat1', cut(L(10))), ('stat2', cut(L(11))),
          ('rewind', cut(L(12))), ('r1', cut(L(13))), ('tip1', cut(L(14))), ('tip2', cut(L(15))), ('tip3', cut(L(16))), ('tip4', cut(L(17))),
          ('tip5', cut(L(18))), ('tip6', cut(L(19))), ('tw1', cut(L(20))), ('tw2', cut(L(21))), ('tw3', cut(L(22))), ('tw4', cut(L(23))), ('end', END0)]
S = dict(starts)
nxt = {n: (starts[i + 1][1] if i + 1 < len(starts) else DUR) for i, (n, _) in enumerate(starts)}
def at(n, k): return S[n] + k * (nxt[n] - S[n])
m = Mix(DUR, seed=26)
rng = np.random.default_rng(2626)
POST = []
def addp(t, x, **kw): POST.append((t, x, kw))
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)
def seg(a, b): return max(0.05, b - a)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
theme = [62, 65, 69, 68, 65, 62, 61]           # the series motif (music box)
def heart(t0, t1, bpm0, bpm1, gain=0.2):
    tb = t0
    while tb < t1:
        k = (tb - t0) / max(0.01, t1 - t0); bpm = bpm0 + (bpm1 - bpm0) * k
        m.add(tb, heartbeat(rng), gain=gain, rev=0.1); tb += 60.0 / bpm
def click(f=2500):
    t = tt(0.05); return norm(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) + 0.4 * noise(0.05, rng, 'white') * np.exp(-t / 0.003))
# ---- the street and the cars ----
def heel():
    """a heel on wet stone: a sharp tick and a little body"""
    t = tt(0.12); x = 0.7 * bp(noise(0.12, rng, 'white'), 2500, 7000) * np.exp(-t / 0.006) + 0.6 * np.sin(2 * np.pi * 260 * t) * np.exp(-t / 0.02)
    return norm(x)
def heels(t0, t1, period, gain=0.06, pan=0.0):
    tb = t0
    while tb < t1: m.add(tb, heel(), gain=gain * rng.uniform(0.8, 1.1), pan=pan, rev=0.35); tb += period * rng.uniform(0.94, 1.06)
def hiss(dur, lo=900, hi=6000):
    """wet tyres on asphalt"""
    return norm(bp(noise(dur, rng, 'white'), lo, hi) * (0.8 + 0.2 * norm(lp(noise(dur, rng, 'white'), 8))))
def engine(dur, f0, f1, rough=0.35):
    """a petrol-hybrid hum: a few harmonics of the firing frequency, a little noise, gliding from f0 to f1"""
    t = tt(dur); f = np.linspace(f0, f1, len(t)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(a * np.sin(k * ph + 0.3 * k) for k, a in [(1, 1.0), (2, 0.55), (3, 0.3), (4, 0.15)])
    x = x * (1 + rough * norm(lp(noise(dur, rng, 'white'), 40))) + 0.3 * lp(noise(dur, rng, 'brown'), 300)
    return norm(lp(x, 900))
def pass_by(t, dur=2.4, gain=0.05, pan=0.0):
    t_ = tt(dur); e = np.exp(-((t_ - dur / 2) / (dur / 4.5)) ** 2)
    m.add(t, norm(hiss(dur) * e + 0.5 * engine(dur, 34, 30) * e), gain=gain, pan=pan, rev=0.4)
def window_motor(dur, up=False):
    """an electric window: the motor's whine sagging under load, the glass's rubber squeak, the stop"""
    t = tt(dur); f = (760 if up else 820) + (60 if up else -90) * t / dur
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.01 * np.sin(2 * np.pi * 31 * t))) / SR
    x = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sign(np.sin(3 * ph))) * np.sin(np.pi * np.minimum(1, t / 0.06)) * fade(np.ones(len(t)), 0.03, 0.05)
    x = bp(x, 300, 4000) + 0.25 * bp(noise(dur, rng, 'white'), 1500, 5000) * norm(np.abs(lp(noise(dur, rng, 'white'), 12)))
    s = norm(thud(rng, 120, 0.12)); x[-len(s):] += 0.6 * s
    return norm(x)
def unlatch():
    """the outer handle pulled: the catch lets go, the seal unsticks"""
    x = click(900) + 0.6 * click(520); y = np.zeros(int(0.35 * SR)); y[: len(x)] += x
    pop = bp(noise(0.25, rng, 'white'), 200, 1500) * np.exp(-tt(0.25) / 0.05); y[int(0.06 * SR): int(0.06 * SR) + len(pop)] += 0.6 * pop
    return norm(y)
def door_shut():
    x = thud(rng, 70, 0.5) + 0.35 * bp(noise(0.5, rng, 'white'), 250, 1800) * np.exp(-tt(0.5) / 0.04)
    c = click(800) + 0.5 * click(480); x[: len(c)] += 0.5 * c; return norm(lp(x, 3000))
def central_lock():
    """the central locking: two quick solenoid clacks"""
    y = np.zeros(int(0.25 * SR))
    for d, f in [(0.0, 140), (0.045, 120)]:
        c = norm(thud(rng, f, 0.08)); k_ = 0.8 * click(1300) + 0.4 * click(700); c[: len(k_)] += k_; n0 = int(d * SR); y[n0:n0 + len(c)] += c[: len(y) - n0]
    return norm(lp(y, 6000))
def handle_dead():
    """one pull of the inner handle: the lever hits its stop (a plastic clack), nothing unlatches, it snaps back"""
    y = np.zeros(int(0.8 * SR))
    c = click(950) + 0.5 * click(600); y[:len(c)] += c
    r = click(1400) * 0.5; n1 = int(0.43 * SR); y[n1:n1 + len(r)] += r
    return norm(y)
def indicator(t0, t1, gain=0.05):
    tb = t0; k = 0
    while tb < t1: m.add(tb, lp(click(1900 if k % 2 == 0 else 1500), 5000), gain=gain, rev=0.05); tb += 0.36; k += 1
def tap(): return norm(lp(click(3200), 7000))
def chime():
    y = np.zeros(int(0.9 * SR))
    for d, n in [(0.0, 76), (0.12, 83)]: b = bell(midi(n), rng, 0.7); n0 = int(d * SR); y[n0:n0 + len(b)] += b[: len(y) - n0]
    return norm(y)
def vibrate(n=2):
    y = np.zeros(int((0.55 * n) * SR))
    for j in range(n):
        t_ = tt(0.38); b = np.sin(2 * np.pi * 172 * t_) * (0.6 + 0.4 * np.sin(2 * np.pi * 21 * t_)) * fade(np.ones(len(t_)), 0.02, 0.04)
        n0 = int(j * 0.55 * SR); y[n0:n0 + len(b)] += b
    return norm(bp(y, 120, 2500))
def bar_beat(dur):
    """a club's kick and bass through a wall: only the low end gets out"""
    t = tt(dur); x = np.zeros(len(t)); bpm = 122; per = 60 / bpm
    for tb in np.arange(0, dur, per):
        k = norm(kick(rng, 0.8)); n0 = int(tb * SR); x[n0:n0 + len(k)] += k[: len(x) - n0]
    bass = np.sin(2 * np.pi * np.where((t / per) % 4 < 2, 55.0, 49.0) * t) * (0.5 + 0.5 * np.sin(np.pi * ((t / per) % 1)))
    return norm(lp(x + 0.5 * bass, 240))
def murmur(dur):
    return norm(bp(noise(dur, rng, 'pink'), 300, 2500) * (0.6 + 0.4 * norm(lp(noise(dur, rng, 'white'), 1.5))))


def tracker_chirp(muffle=False):
    """the tracker's « Faire sonner » tune: a quick rising triplet of square-ish chirps, twice"""
    y = np.zeros(int(1.1 * SR))
    for rep in range(2):
        for j, f in enumerate([2350, 2790, 3130]):
            t_ = tt(0.09); s_ = np.sign(np.sin(2 * np.pi * f * t_)) * 0.6 + np.sin(2 * np.pi * f * t_) * 0.4
            s_ *= np.sin(np.pi * np.minimum(1, t_ / 0.09)) ** 0.5; n0 = int((rep * 0.5 + j * 0.11) * SR); y[n0:n0 + len(s_)] += s_
    y = bp(y, 900, 6000)
    return norm(lp(y, 1100) if muffle else y)
def sms_ding():
    y = np.zeros(int(1.0 * SR))
    for d, n in [(0.0, 81), (0.11, 88)]: b = bell(midi(n), rng, 0.6); n0 = int(d * SR); y[n0:n0 + len(b)] += b[: len(y) - n0]
    return norm(y)
def alert_buzz():
    """the system alert: two short buzzes and a soft tone"""
    y = np.zeros(int(1.2 * SR)); v = vibrate(2); y[: len(v)] += 0.8 * v
    b = bell(midi(79), rng, 0.8); n0 = int(0.15 * SR); y[n0:n0 + len(b)] += 0.5 * b[: len(y) - n0]
    return norm(y)
def shutter():
    y = np.zeros(int(0.25 * SR)); a = click(2200); y[: len(a)] += a; b = click(1600) * 0.8; n0 = int(0.07 * SR); y[n0:n0 + len(b)] += b
    return norm(y + 0.3 * bp(noise(0.25, rng, 'white'), 2000, 7000) * np.exp(-tt(0.25) / 0.03))
def blip(f=1900): t_ = tt(0.08); return norm(np.sin(2 * np.pi * f * t_) * np.exp(-t_ / 0.02))
def bolt():
    """a deadbolt thrown: a slide and a metal clack"""
    y = np.zeros(int(0.4 * SR)); sl = bp(noise(0.12, rng, 'white'), 1500, 6000) * np.linspace(0.3, 1, int(0.12 * SR)); y[: len(sl)] += 0.4 * sl
    h = norm(metal_hit(rng, 1800, 0.25)) * 0.7; k_ = 0.6 * click(1100); c = np.zeros(max(len(h), len(k_))); c[: len(h)] += h; c[: len(k_)] += k_
    n0 = int(0.11 * SR); c = c[: len(y) - n0]; y[n0:n0 + len(c)] += c
    return norm(y)
def typing(dur):
    """a keyboard: soft plastic taps at an uneven pace"""
    y = np.zeros(int(dur * SR)); tb = 0.05
    while tb < dur - 0.05:
        c = lp(click(rng.uniform(1700, 2600)), 5000) * rng.uniform(0.5, 1.0); n0 = int(tb * SR); y[n0:n0 + len(c)] += c[: len(y) - n0]; tb += rng.uniform(0.07, 0.22)
    return norm(y)
def strip_hum(dur):
    t_ = tt(dur); return norm(np.sin(2 * np.pi * 100 * t_) + 0.5 * np.sin(2 * np.pi * 200 * t_) + 0.2 * np.sin(2 * np.pi * 300 * t_) + 0.2 * bp(noise(dur, rng, 'white'), 3000, 8000))
def glass_down():
    """a stemmed glass set on a wooden bar: a dull knock and a short ring"""
    y = norm(thud(rng, 210, 0.15)) * 0.7; r = bell(2900, rng, 0.5) * 0.25; y2 = np.zeros(max(len(y), len(r))); y2[: len(y)] += y; y2[: len(r)] += r
    return norm(y2)
def clinks(t0, t1, gain=0.02):
    tb = t0
    while tb < t1: m.add(tb, bell(rng.uniform(2600, 3800), rng, 0.4), gain=gain * rng.uniform(0.5, 1), pan=rng.uniform(-0.6, 0.6), rev=0.5); tb += rng.uniform(0.6, 1.6)
def whoosh(dur=0.9, rev_=False):
    t_ = tt(dur); x = bp(noise(dur, rng, 'pink'), 300, 5000) * (t_ / dur) ** 2
    return norm(x[::-1] if rev_ else x)
def bar_music(dur):
    """the bar's music, heard in the room: a soft groove (kick, bass, a muted keys chord)"""
    t = tt(dur); x = np.zeros(len(t)); per = 60 / 98
    for tb in np.arange(0, dur, per):
        k = norm(kick(rng, 0.5)); n0 = int(tb * SR); x[n0:n0 + len(k)] += 0.6 * k[: len(x) - n0]
    bass = np.sin(2 * np.pi * np.where((t / per) % 8 < 4, 61.74, 55.0) * t) * (0.5 + 0.5 * np.sin(np.pi * ((t / per) % 1)))
    keys = sum(np.sin(2 * np.pi * midi(n) * t) for n in [62, 65, 69]) * (0.5 + 0.5 * np.sin(np.pi * ((t / (2 * per)) % 1))) * 0.25
    return norm(lp(x + 0.6 * bass + keys, 1800))

def stretch(x, k):
    """slowed down by k (pitch drops with it), like a tape running slow"""
    from scipy import signal as sg
    return sg.resample(x, int(len(x) * k))
def paper(dur=0.5):
    """paper drawn out of a pocket / turned over: a dry rustle"""
    t_ = tt(dur); return norm(bp(noise(dur, rng, 'white'), 1800, 9000) * (0.4 + 0.6 * norm(lp(noise(dur, rng, 'white'), 30)) ** 2) * np.sin(np.pi * t_ / dur))
def creak(dur=1.2):
    """a door's hinge: a slow scraping squeal"""
    t_ = tt(dur); f = 420 + 160 * np.sin(2 * np.pi * 0.7 * t_); x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.5 + 0.5 * norm(lp(noise(dur, rng, 'white'), 25)))
    return norm(bp(x, 500, 3500) * np.sin(np.pi * t_ / dur) ** 0.7)
def ring_tone(dur, f=6200):
    t_ = tt(dur); return norm(np.sin(2 * np.pi * f * t_) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.4 * t_)))

# ---------- under everything: a darker drone (a minor second rubbing), swelling with the danger ----------
dr = drone([55.0, 82.41, 110.0, 116.54], DUR, rng, cutoff=420, lfo=0.04)
shape = env_at(tt(DUR), [0, S['s1'], S['f1'], S['f2'], S['etsi'], S['e2'], S['e3'], S['e4'], S['stat1'], S['rewind'], S['r1'], S['tip1'], S['tip6'], S['tw1'], S['tw3'], S['tw4'], S['end'], DUR],
               [1.0, 0.45, 0.5, 0.75, 0.85, 1.0, 1.1, 0.9, 0.7, 0.6, 0.5, 0.45, 0.7, 0.55, 1.0, 0.9, 0.5, 0.0])
m.add(0.0, (dr[0] * shape, dr[1] * shape), gain=0.12, rev=0.4)
# ---------- hook: a hit on frame 1, the glass set down beside hers, his reflection ----------
m.add(0.0, boom(rng, 3.0, 44, 20, 1.9, 0.5, 1.0), gain=0.8, rev=0.5)
hb = seg(0.0, S['s1'])
m.add(0.0, fade(bar_music(hb), 0.05, 0.3), gain=0.05, rev=0.4)
m.add(0.0, fade(murmur(hb), 0.05, 0.3), gain=0.02, rev=0.5)
addp(at('hook', 0.5), glass_down(), gain=0.3, rev=0.25)
heart(0.3, S['s1'], 80, 88, 0.2)
m.add(S['s1'] - 0.6, riser(rng, 0.6, 200, 3500, 2.0) * np.linspace(1, 0.2, int(0.6 * SR)), gain=0.1, rev=0.3)
m.add(S['s1'], thud(rng, 46, 0.7), gain=0.45, rev=0.3)
# ---------- 2:58, the commissariat ----------
off = seg(S['s1'], S['f1'])
m.add(S['s1'], fade(strip_hum(off), 0.2, 0.2), gain=0.008, rev=0.2)
m.add(S['s1'] + 0.3, fade(typing(seg(S['s1'], S['s2']) - 0.4), 0.05, 0.2), gain=0.05, pan=0.2, rev=0.2)
heart(S['s2'], S['f1'], 90, 98, 0.15)
# ---------- 1:24, the bar ----------
m.add(S['f1'] - 0.7, whoosh(0.8), gain=0.12, rev=0.4)
bar1 = seg(S['f1'], S['e1b'])
m.add(S['f1'], fade(bar_music(bar1), 0.3, 0.1), gain=0.06, rev=0.4)
m.add(S['f1'], fade(murmur(bar1), 0.3, 0.1), gain=0.025, rev=0.5)
clinks(S['f1'] + 0.4, S['etsi'] - 0.3)
m.add(S['f2'], riser(rng, seg(S['f2'], S['etsi']), 90, 900, 2.5), gain=0.05, rev=0.5)
heart(S['f2'], S['etsi'], 92, 104, 0.18)
# ---------- « ET SI… »: she drinks ----------
m.add(S['etsi'] - 0.2, riser(rng, 1.2, 300, 5000, 1.6), gain=0.12, rev=0.6)
m.add(S['etsi'] + 0.05, bell(midi(73), rng, 2.4), gain=0.06, rev=0.7)
addp(at('e1a', 0.3), glass_down(), gain=0.22, rev=0.25)
# ten minutes later: the room's sound stretches and sinks, a ringing, her heart slows
dz = seg(S['e1b'], S['e4'])
bm = stretch(bar_music(dz / 1.6 + 0.2), 1.6)[: int(dz * SR)]
km = np.linspace(0.2, 1.0, len(bm)) ** 1.5
m.add(S['e1b'], fade(norm(lp(bm, 900) * (1 - km) + lp(bm, 260) * km), 0.3, 0.3), gain=0.08, rev=0.8)
m.add(S['e1b'], fade(norm(stretch(murmur(dz / 2 + 0.2), 2.0)[: int(dz * SR)]), 0.4, 0.3), gain=0.03, rev=0.9)
m.add(S['e1b'] + 0.4, fade(ring_tone(dz - 0.4), 1.5, 0.5), gain=0.012, rev=0.3)
heart(S['e1b'], S['e4'], 70, 48, 0.24)
m.add(S['e2'], groan(rng, seg(S['e2'], S['e3']) + 1.0, 70), gain=0.05, rev=0.8)
# his hand, his voice by her ear
addp(S['e3'] + 0.05, boom(rng, 2.5, 40, 22, 1.6, 0.2, 1.0), gain=0.5, rev=0.6)
# nobody moves: the bar's music goes on, normal; the door swings shut on the street
e4d = seg(S['e4'], S['stat1'])
m.add(S['e4'], fade(bar_music(e4d), 0.1, 0.4), gain=0.05, rev=0.4)
m.add(S['e4'], fade(murmur(e4d), 0.1, 0.4), gain=0.02, rev=0.5)
m.add(S['e4b'] + 0.4, creak(1.4), gain=0.04, pan=0.4, rev=0.4)
m.add(S['e4b'] + 0.2, fade(norm(lp(noise(1.9, rng, 'brown'), 300)), 0.1, 0.3), gain=0.05, pan=0.4, rev=0.5)
addp(S['e4b'] + 2.0, thud(rng, 70, 0.6), gain=0.4, pan=0.4, rev=0.3)
addp(S['e4b'] + 2.0, boom(rng, 3.0, 42, 20, 2.0, 0.3, 1.0), gain=0.55, rev=0.6)
# ---------- ANSM 2024; her phone buzzing on the counter ----------
st = seg(S['stat1'], S['rewind'])
pn = pad([55.0, 82.41, 110.0, 130.81], st, rng, cutoff=800, attack=0.8, release=0.5, voices=2, harmonics=8)
m.add(S['stat1'], (fade(pn[0], 0.8, 0.4), fade(pn[1], 0.8, 0.4)), gain=0.06, rev=0.6)
for n_ in ['stat1', 'stat2']: m.add(S[n_] + 0.05, thud(rng, 50, 0.8), gain=0.35, rev=0.4)
for k_ in [0.35, 0.75]: m.add(at('stat2', k_), norm(lp(vibrate(2), 900)), gain=0.14, rev=0.1)
# ---------- rewind ----------
rw = seg(S['rewind'], S['r1'])
t_ = tt(rw); f_ = 260 * np.exp(np.log(14) * t_ / rw)
x_ = np.sin(2 * np.pi * np.cumsum(f_ * (1 + 0.05 * np.sin(2 * np.pi * 27 * t_))) / SR)
m.add(S['rewind'], norm(lp(x_, 4500) * np.sin(np.pi * t_ / rw) ** 0.4 + 0.3 * norm(bp(noise(rw, rng, 'white'), 1500, 6000))), gain=0.14, rev=0.25)
m.add(S['r1'] - 0.03, click(1200), gain=0.12, rev=0.2)
# ---------- the real moves: back in the bar ----------
bar2 = seg(S['r1'], S['tw1'])
m.add(S['r1'], fade(bar_music(bar2), 0.2, 0.3), gain=0.05, rev=0.4)
m.add(S['r1'], fade(murmur(bar2), 0.2, 0.3), gain=0.02, rev=0.5)
clinks(S['r1'] + 0.4, S['tw1'] - 0.3, gain=0.015)
for n_ in ['tip1', 'tip2', 'tip3', 'tip4', 'tip5', 'tip6']: m.add(S[n_] + 0.02, woodblock(rng, 1100), gain=0.03, rev=0.3)
m.add(S['tip5'] + 0.1, tap(), gain=0.05, rev=0.1)
m.add(S['tip6'], riser(rng, seg(S['tip6'], S['tw1']), 100, 1500, 2.4), gain=0.06, rev=0.5)
heart(S['tip6'], S['tw1'], 96, 108, 0.16)
# ---------- 3:05, the commissariat: the receipt ----------
m.add(S['tw1'] - 0.5, whoosh(0.5, True), gain=0.1, rev=0.3)
off2 = seg(S['tw1'], S['end'])
m.add(S['tw1'], fade(strip_hum(off2), 0.2, 0.3), gain=0.008, rev=0.2)
m.add(at('tw1', 0.45), paper(0.7), gain=0.07, rev=0.2)
heart(S['tw1'], S['tw3'], 96, 112, 0.18)
m.add(S['tw2'] + 0.1, riser(rng, seg(S['tw2'], S['tw3']), 120, 2200, 2.4), gain=0.07, rev=0.4)
m.add(at('tw3', 0.08), paper(0.4), gain=0.08, rev=0.2)
addp(S['tw3'] + 0.45, boom(rng, 3.4, 40, 18, 2.4, 0.6, 1.0), gain=0.85, rev=0.7)
m.add(S['tw3'] + 0.45, metal_hit(rng, 220, 2.6), gain=0.08, rev=0.8)
heart(S['tw3'] + 1.2, S['end'] + 1.0, 118, 132, 0.22)
# ---------- end card: the series motif on a music box over a dark pad ----------
pe = pad([73.42, 110.0, 146.83, 174.61], DUR - S['end'] + 0.1, rng, cutoff=1100, attack=1.0, release=2.0, voices=2, harmonics=8)
m.add(S['end'] + 0.3, (fade(pe[0], 1.0, 2.0), fade(pe[1], 1.0, 2.0)), gain=0.08, rev=0.6)
for j, nn in enumerate(theme): m.add(S['end'] + 0.4 + j * 0.42, bell(midi(nn + 12), rng, 2.2), gain=0.065, pan=0.25 * math.sin(j * 1.7), rev=0.7)
m.add(S['end'] + 1.2, woodblock(rng, 1250), gain=0.04, rev=0.25)

# ---------- the narration: the music ducks under it; the officer across the desk, his lines close ----------
import wave
from scipy import signal
vp = os.path.join(HERE, 'vo', f'ep26_{voice}.wav')
with wave.open(vp, 'rb') as w: vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
vo = signal.resample_poly(vo, SR, vsr)[: m.n]
vo = hp(vo, 80) + 0.25 * bp(vo, 2200, 5200)
def through(a_t, b_t, fn, mix=0.8):
    a, b = int(a_t * SR), int(b_t * SR); s0 = vo[a:b].copy(); x = fn(s0)
    k = np.linspace(0, 1, len(s0)); w_ = np.clip(np.minimum(k / 0.04, (1 - k) / 0.08), 0, 1)
    vo[a:b] = s0 * (1 - w_) + mix * norm(x) * np.abs(s0).max() * w_
def cabin(s0):
    y = lp(bp(s0, 180, 3800), 3200); d = int(0.011 * SR); y[d:] += 0.35 * y[:-d]; return y
def room(s0):
    y = lp(bp(s0, 150, 5000), 4500); d = int(0.017 * SR); y[d:] += 0.3 * y[:-d]; return y
def close(s0):
    y = lp(bp(s0, 120, 6000), 5200); d = int(0.006 * SR); y[d:] += 0.2 * y[:-d]; return y
def muffle(s0): return lp(s0, 1600)
through(Lw(2, 'Et') - 0.05, Ln[2]['t1'] + 0.15, room, mix=0.5)             # the officer across the desk
through(Lw(8, 'Elle') - 0.05, Ln[8]['t1'] + 0.15, close, mix=0.7)           # his line by her ear
through(Lw(22, 'Tu') - 0.05, Ln[22]['t1'] + 0.15, close, mix=0.55)          # the note, his words
env = np.sqrt(signal.sosfilt(signal.butter(1, 12, 'lowpass', fs=SR, output='sos'), vo * vo) + 1e-12)
vo = vo * np.where(env > 0.06, (0.06 / env) ** 0.45, 1.0)
duck = signal.sosfilt(signal.butter(1, 3, 'lowpass', fs=SR, output='sos'), np.clip(env / 0.03, 0, 1))
duck = 1.0 - 0.5 * np.clip(duck, 0, 1)
n = len(duck); m.L[:n] *= duck; m.R[:n] *= duck; m.rev_L[:n] *= duck; m.rev_R[:n] *= duck
m.add(0.0, norm(vo), gain=0.95, rev=0.05)
for t_, x_, kw in POST: m.add(t_, x_, **kw)

out = sys.argv[1] if len(sys.argv) > 1 else 'out/ep26.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
