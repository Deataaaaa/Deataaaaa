"""Soundtrack for « 12 % » Saison 2 · Partie 1 · Le VTC. Cue times come from the narration's timing (audio/vo/ep24_<voice>.json),
the same rules as episodes/ep24.js. Pigalle at 2 am: wet tyres, a muffled bar beat behind a door, voices, far traffic; a dark drone
and her heartbeat. The hook (the window coming down, his face); her heels; the app's taps and the chime of a found ride; the black
car arriving on the wet road, braking, its indicator; the electric window; his line through the cabin; the door unlatching.
« ET SI… »: the central locking's double clack, the engine pulling away, the indicator, the dead handle (the child lock), the heart,
the hit to black; the tunnel's roar under the April 2024 card; the tape rewind; the black car leaving, its window going up; the
grey car arriving; a door shutting her in; the cabin's hum; the phone's vibration; the notification; the end card's music box.
  python3 audio/ep24.py out/ep24.wav [voice]"""
import sys, os, json, math
import numpy as np
from synth import *

HERE = os.path.dirname(os.path.abspath(__file__))
voice = sys.argv[2] if len(sys.argv) > 2 else 'developpeuse'
VO = json.load(open(os.path.join(HERE, 'vo', f'ep24_{voice}.json')))
Ln = VO['lines']
L = lambda i: Ln[i]['t0']
def Lw(i, w, n=1):
    us = [u for u in Ln[i]['units'] if u['shown'].lower().replace('«', '').replace('»', '').replace('"', '').startswith(w.lower())]
    return us[n - 1]['t0'] if len(us) >= n else Ln[i]['t0']
cut = lambda x: x - 0.08
END0 = Ln[-1]['t0'] - 0.25
DUR = math.ceil((VO['duration'] + 4.4) * 10) / 10
starts = [('hook', 0.0), ('s1', cut(L(1))), ('s2', cut(L(2))), ('s3', cut(L(3))), ('s4', cut(L(4))), ('s5', cut(L(5))), ('etsi', cut(L(6))),
          ('e1', cut(L(7))), ('e2', cut(L(8))), ('e3', cut(L(9))), ('e4', cut(L(10))), ('e5', cut(L(11))), ('stat1', cut(L(12))), ('stat2', cut(L(13))),
          ('rewind', cut(L(15))), ('r1', cut(L(16))), ('tip1', cut(L(17))), ('tip2a', cut(L(18))), ('tip2b', cut(Lw(18, 'Tout'))), ('tip3', cut(L(19))),
          ('tip4', cut(L(20))), ('r2', cut(L(21))), ('r3', cut(L(22))), ('r4a', cut(L(23))), ('r4b', cut(Lw(23, 'Bonne'))), ('r5', cut(L(24))),
          ('tw1', cut(L(25))), ('tw2', cut(L(26))), ('tw3', cut(L(27))), ('end', END0)]
S = dict(starts); names = [n for n, _ in starts]
nxt = {n: (starts[i + 1][1] if i + 1 < len(starts) else DUR) for i, (n, _) in enumerate(starts)}
def at(n, k): return S[n] + k * (nxt[n] - S[n])
T_STOP, T_WIN, T_DOOR = Lw(3, 'La') - 0.25, Lw(3, 'descend') - 0.1, Lw(5, 'ouvre')
T_LOCK, T_GO = Lw(7, 'Clac') + 0.05, S['e1'] + 0.6
T_LEAVE, T_ARR2, T_STOP2 = S['r3'] + 0.6, S['r4a'] - 0.2, S['r4a'] + 2.2
m = Mix(DUR, seed=24)
rng = np.random.default_rng(2424)
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
    """the inner handle pulled twice: plastic clacks, nothing behind them"""
    y = np.zeros(int(0.9 * SR))
    for d in [0.0, 0.45]:
        c = click(950) + 0.5 * click(600); n0 = int(d * SR); y[n0:n0 + len(c)] += c
        r = click(1400) * 0.5; n1 = n0 + int(0.12 * SR); y[n1:n1 + len(r)] += r
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

# ---------- under everything: a dark drone that swells with the danger ----------
dr = drone([73.42, 110.0, 146.83, 155.56], DUR, rng, cutoff=520, lfo=0.05)
shape = env_at(tt(DUR), [0, S['s1'], S['s3'], S['s4'], S['etsi'], S['e3'], S['e5'], S['stat1'], S['rewind'], S['r1'], S['tip1'], S['r3'], S['r4a'], S['r5'], S['tw1'], S['tw3'], S['end'], DUR],
               [0.9, 0.35, 0.55, 0.85, 0.9, 1.0, 1.0, 0.6, 0.6, 0.7, 0.5, 0.55, 0.4, 0.35, 0.6, 1.0, 0.5, 0.0])
m.add(0.0, (dr[0] * shape, dr[1] * shape), gain=0.07, rev=0.45)
# the street: far traffic, voices, the bar's beat behind its door (outside shots only)
OUT = [('hook', 's4'), ('s4', 'e1'), ('rewind', 'r5')]
for a, b in OUT:
    d = seg(S[a], S[b])
    m.add(S[a], fade(norm(lp(noise(d, rng, 'brown'), 180)), 0.2, 0.2), gain=0.05, rev=0.5)
    m.add(S[a], fade(murmur(d), 0.3, 0.3), gain=0.012, pan=-0.3, rev=0.6)
    m.add(S[a], fade(bar_beat(d), 0.3, 0.3), gain=0.05, pan=-0.2, rev=0.3)
for tp_, pn_ in [(4.2, 0.4), (9.0, -0.3), (51.0, 0.5), (57.5, -0.4), (65.0, 0.3), (71.0, -0.2)]: pass_by(tp_, gain=0.04, pan=pn_)

# ---------- hook: a hit on frame 1; the window down, his face; slow motion ----------
m.add(0.0, boom(rng, 3.0, 48, 22, 1.8, 0.5, 1.0), gain=0.8, rev=0.5)
m.add(0.05, lp(window_motor(1.6), 2500), gain=0.05, rev=0.5)
heart(0.2, S['s1'], 72, 78, 0.2)
m.add(S['s1'] - 0.6, riser(rng, 0.6, 200, 3500, 2.0) * np.linspace(1, 0.2, int(0.6 * SR)), gain=0.1, rev=0.3)
m.add(S['s1'], thud(rng, 46, 0.7), gain=0.45, rev=0.3)
# ---------- out of the bar: the door's music, her heels; the app ----------
m.add(S['s1'] + 0.1, fade(norm(lp(bar_beat(1.4), 2500)), 0.02, 0.9), gain=0.05, pan=-0.2, rev=0.3)
heels(S['s1'] + 0.35, S['s1'] + 0.85 * (nxt['s1'] - S['s1']), 0.5, gain=0.05)
for d in [0.25, 0.9]: m.add(at('s2', d / (nxt['s2'] - S['s2'])), tap(), gain=0.05, rev=0.1)
m.add(at('s2', 0.47), chime(), gain=0.05, rev=0.3)
# ---------- the black car: arriving on the wet road, braking, the indicator, the window ----------
arr = seg(S['s3'] - 0.6, T_STOP)
m.add(S['s3'] - 0.6, norm(hiss(arr) * np.linspace(0.4, 1.0, int(arr * SR)) ** 2 * np.linspace(1, 0.2, int(arr * SR))), gain=0.06, rev=0.3)
m.add(S['s3'] - 0.6, engine(arr + 1.2, 40, 26), gain=0.05, rev=0.25)
m.add(T_STOP - 0.5, norm(bp(noise(0.5, rng, 'white'), 2500, 6000) * np.sin(np.pi * tt(0.5) / 0.5)), gain=0.015, rev=0.2)
indicator(S['s3'], T_STOP + 0.3, gain=0.03)
m.add(T_WIN, window_motor(1.0), gain=0.08, rev=0.15)
m.add(T_STOP, engine(seg(T_STOP, S['e1']), 24, 24, 0.2), gain=0.025, rev=0.2)          # idling at the kerb
heart(S['s4'], S['etsi'], 96, 118, 0.2)
# the door unlatching
m.add(T_DOOR + 0.1, unlatch(), gain=0.14, rev=0.2)
# ---------- « ET SI… »: in; the locks; away; the dead handle; his eyes ----------
m.add(S['etsi'] - 0.2, riser(rng, 1.2, 300, 5000, 1.6), gain=0.12, rev=0.6)
m.add(S['etsi'] + 0.05, bell(midi(74), rng, 2.4), gain=0.06, rev=0.7)
addp(at('etsi', 0.85), door_shut(), gain=0.45, rev=0.2)
cab = seg(S['e1'], S['stat1'])
m.add(S['e1'], fade(norm(lp(noise(cab, rng, 'brown'), 160)), 0.1, 0.3), gain=0.07, rev=0.1)                 # the cabin
m.add(T_GO, engine(seg(T_GO, S['stat1']), 26, 44, 0.25), gain=0.06, rev=0.1)
m.add(T_GO, fade(hiss(seg(T_GO, S['stat1']), 600, 4000), 2.0, 0.3), gain=0.02, rev=0.1)
addp(T_LOCK, central_lock(), gain=0.55, rev=0.12)
m.add(T_LOCK, boom(rng, 2.4, 50, 24, 1.4, 0.4, 0.9), gain=0.4, rev=0.5)
indicator(S['e3'] + 0.2, S['e4'], gain=0.04)
m.add(at('e4', 0.2), handle_dead(), gain=0.2, rev=0.1)
heart(S['e1'], S['e5'], 126, 150, 0.22)
heart(S['e5'], S['stat1'] - 0.3, 150, 164, 0.26)
m.add(S['e5'], riser(rng, seg(S['e5'], S['stat1']) - 0.2, 120, 3000, 2.5), gain=0.09, rev=0.4)
addp(S['stat1'] - 0.12, boom(rng, 3.5, 44, 20, 2.4, 0.6, 1.0), gain=0.85, rev=0.6)
# ---------- April 2024: the tunnel's roar ----------
tun = seg(S['stat1'], S['rewind'])
m.add(S['stat1'], fade(norm(bp(noise(tun, rng, 'pink'), 70, 900) + 0.3 * engine(tun, 40, 46)), 0.6, 0.6), gain=0.08, rev=0.7)
m.add(S['stat1'], fade(norm(np.sin(2 * np.pi * 100 * tt(tun)) + 0.4 * np.sin(2 * np.pi * 200 * tt(tun))), 0.6, 0.6), gain=0.006, rev=0.4)
pn = pad([73.42, 110.0, 146.83, 174.61], tun, rng, cutoff=900, attack=0.8, release=0.5, voices=2, harmonics=8)
m.add(S['stat1'], (fade(pn[0], 0.8, 0.4), fade(pn[1], 0.8, 0.4)), gain=0.06, rev=0.6)
m.add(Lw(14, 'saute'), boom(rng, 2.6, 46, 22, 1.6, 0.4, 0.9), gain=0.45, rev=0.6)
# ---------- rewind ----------
rw = seg(S['rewind'], S['r1'])
t_ = tt(rw); f_ = 260 * np.exp(np.log(14) * t_ / rw)
x_ = np.sin(2 * np.pi * np.cumsum(f_ * (1 + 0.05 * np.sin(2 * np.pi * 27 * t_))) / SR)
m.add(S['rewind'], norm(lp(x_, 4500) * np.sin(np.pi * t_ / rw) ** 0.4 + 0.3 * norm(bp(noise(rw, rng, 'white'), 1500, 6000))), gain=0.14, rev=0.25)
m.add(S['r1'] - 0.03, click(1200), gain=0.12, rev=0.2)
# ---------- the real moves: ticks, a calm pad; the idling car; she steps back ----------
m.add(S['r1'], engine(seg(S['r1'], T_LEAVE), 24, 24, 0.2), gain=0.025, rev=0.2)
pt = pad([73.42, 110.0, 146.83, 220.0], seg(S['tip1'], S['r2']), rng, cutoff=1000, attack=1.2, release=0.6, voices=2, harmonics=8)
m.add(S['tip1'], (fade(pt[0], 1.2, 0.6), fade(pt[1], 1.2, 0.6)), gain=0.05, rev=0.6)
for n in ['tip1', 'tip2a', 'tip3', 'tip4']: m.add(S[n] + 0.1, woodblock(rng, 1250), gain=0.04, rev=0.25)
heart(S['r1'], S['r3'], 104, 96, 0.15)
heels(S['r2'] + 0.25, S['r2'] + 1.6, 0.55, gain=0.05)
# the black car goes: the window up, the engine, the tyres
m.add(T_LEAVE - 0.5, window_motor(0.7, up=True), gain=0.07, rev=0.15)
lv = seg(T_LEAVE, S['r4a'])
m.add(T_LEAVE, fade(engine(lv, 28, 46), 0.05, 1.2), gain=0.06, rev=0.3)
m.add(T_LEAVE + 0.4, fade(hiss(lv - 0.4) * np.linspace(1, 0.2, int((lv - 0.4) * SR)), 0.3, 0.6), gain=0.04, rev=0.3)
# ---------- the grey car: right plate, right photo ----------
a2 = seg(T_ARR2, T_STOP2)
m.add(T_ARR2, norm(hiss(a2) * np.linspace(0.4, 1.0, int(a2 * SR)) ** 2 * np.linspace(1, 0.2, int(a2 * SR))), gain=0.05, rev=0.3)
m.add(T_ARR2, engine(a2 + 1.0, 36, 24), gain=0.045, rev=0.25)
m.add(S['r4b'] + 0.15, chime(), gain=0.04, rev=0.3)
# in the back of the grey car: the door shuts her in, the cabin's hum, sharing the trip
addp(S['r5'] + 0.15, door_shut(), gain=0.35, rev=0.15)
cb2 = seg(S['r5'], S['end'])
m.add(S['r5'], fade(norm(lp(noise(cb2, rng, 'brown'), 150)), 0.2, 0.6), gain=0.06, rev=0.1)
m.add(S['r5'] + 0.9, fade(engine(cb2 - 0.9, 26, 38, 0.2), 1.0, 0.6), gain=0.04, rev=0.1)
m.add(at('r5', 0.55), tap(), gain=0.05, rev=0.1); m.add(at('r5', 0.62), chime(), gain=0.04, rev=0.3)
heart(S['tw1'], S['tw3'], 84, 102, 0.17)
m.add(S['tw2'] + 0.15, vibrate(2), gain=0.12, rev=0.05)
m.add(S['tw3'] + 0.02, chime(), gain=0.06, rev=0.3)
m.add(S['tw3'] + 0.05, boom(rng, 3.0, 44, 20, 2.0, 0.3, 1.0), gain=0.6, rev=0.6)
m.add(S['tw3'] + 0.05, metal_hit(rng, 240, 2.4), gain=0.1, rev=0.7)
heart(S['tw3'], S['end'], 110, 128, 0.2)
# ---------- end card: the series motif on a music box over a dark pad ----------
pe = pad([73.42, 110.0, 146.83, 174.61], DUR - S['end'] + 0.1, rng, cutoff=1100, attack=1.0, release=2.0, voices=2, harmonics=8)
m.add(S['end'] + 0.3, (fade(pe[0], 1.0, 2.0), fade(pe[1], 1.0, 2.0)), gain=0.08, rev=0.6)
for j, nn in enumerate(theme): m.add(S['end'] + 0.4 + j * 0.42, bell(midi(nn + 12), rng, 2.2), gain=0.065, pan=0.25 * math.sin(j * 1.7), rev=0.7)
m.add(S['end'] + 1.2, woodblock(rng, 1250), gain=0.04, rev=0.25)

# ---------- the narration: the music ducks under it; his « C'est pour Inès ? » comes from inside the car ----------
import wave
from scipy import signal
vp = os.path.join(HERE, 'vo', f'ep24_{voice}.wav')
with wave.open(vp, 'rb') as w: vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
vo = signal.resample_poly(vo, SR, vsr)[: m.n]
vo = hp(vo, 80) + 0.25 * bp(vo, 2200, 5200)
def through(a_t, b_t, fn, mix=0.8):
    a, b = int(a_t * SR), int(b_t * SR); s0 = vo[a:b].copy(); x = fn(s0)
    k = np.linspace(0, 1, len(s0)); w_ = np.clip(np.minimum(k / 0.04, (1 - k) / 0.08), 0, 1)
    vo[a:b] = s0 * (1 - w_) + mix * norm(x) * np.abs(s0).max() * w_
def cabin(s0):
    y = lp(bp(s0, 180, 3800), 3200); d = int(0.011 * SR); y[d:] += 0.35 * y[:-d]; return y
through(Ln[4]['t0'] - 0.05, Ln[4]['t1'] + 0.2, cabin)
env = np.sqrt(signal.sosfilt(signal.butter(1, 12, 'lowpass', fs=SR, output='sos'), vo * vo) + 1e-12)
vo = vo * np.where(env > 0.06, (0.06 / env) ** 0.45, 1.0)
duck = signal.sosfilt(signal.butter(1, 3, 'lowpass', fs=SR, output='sos'), np.clip(env / 0.03, 0, 1))
duck = 1.0 - 0.5 * np.clip(duck, 0, 1)
n = len(duck); m.L[:n] *= duck; m.R[:n] *= duck; m.rev_L[:n] *= duck; m.rev_R[:n] *= duck
m.add(0.0, norm(vo), gain=0.95, rev=0.05)
for t_, x_, kw in POST: m.add(t_, x_, **kw)

out = sys.argv[1] if len(sys.argv) > 1 else 'out/ep24.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
