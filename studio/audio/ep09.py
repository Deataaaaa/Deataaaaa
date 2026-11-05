"""Soundtrack for post 3 (What if a whale swallowed you?), point of view. Cue times match episodes/ep09.js.

The hook: the jaws closing around you in slow motion, a deep boom, your slowed breath, the thud as it shuts ->
the calm dive: the ocean's low hum, your regulator (inhale hiss, exhale bubbles, synced to the bubbles on screen),
a quiet ambient theme -> the sand lance: a shimmer -> they scatter: everything stops -> the whale: a drone, its
call, your heart, a riser -> the gulp: a roar of water, then the jaws shut and the world goes muffled -> inside:
your breathing, close and fast, the torch click, creaks and a pressure groan as it squeezes, then the rise ->
the surface: light, the head shake, thrown into the air, the splash -> the real cases on VHS -> the calm returns."""
import sys
import numpy as np
from synth import *

DUR = 75.2
T = dict(A=0, B=3.7, C=13.46, D=20.84, E=30.06, F=34.36, G=38.96, G2=44.36, H=47.26, I1=51.36, I2=56.66, I3=62.46, J=66.26, K=71.66)
E_RATE = 0.45
TS_E, TS_CLOSE1, TS_SURF, TS_SPIT = 30.7, 31.85, 45.0, 46.4
BREATHS = [0.6, 2.2, 5.2, 9.9, 14.6, 18.6, 22.3, 24.3, 26.1, 27.7, 29.2, 35.6, 37.4, 39.1, 40.7, 42.2, 43.6, 45.0, 46.2, 49.6, 72.4]
TS_F = T['E'] + (T['F'] - T['E']) * E_RATE


def vt(ts):
    """video time of a story time (E runs at 0.45x)"""
    if ts < T['E']: return ts
    if ts < TS_F: return T['E'] + (ts - T['E']) / E_RATE
    return T['F'] + (ts - TS_F)


t_gulp, t_shut, t_surf, t_spit = vt(TS_E), vt(TS_CLOSE1), vt(TS_SURF), vt(TS_SPIT)
t_splash = t_spit + 0.37
t_torch = T['F'] + 0.62
hook_gulp = 3.62 - (TS_CLOSE1 - TS_E) / 0.483
m = Mix(DUR, seed=9)
rng = np.random.default_rng(90)


def midi(n): return 440.0 * 2 ** ((n - 69) / 12)


def norm(x): return x / (np.abs(x).max() + 1e-9)


def epiano(f, dur=1.6, vel=1.0):
    t = tt(dur)
    x = np.sin(2 * np.pi * f * t) + 0.28 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3) + 0.08 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 5)
    x *= np.exp(-t * 1.2) * np.minimum(1, t * 300)
    return x * vel / (np.abs(x).max() + 1e-9)


# ---------- the regulator: inhale (valve tick + hiss), exhale (a rumble of bubbles) ----------
def reg_inhale(r, dur=1.5, pitch=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    x = bp(r.standard_normal(n), 1600 * pitch, 6000 * pitch) * 0.75 + bp(r.standard_normal(n), 420 * pitch, 1300 * pitch) * 0.35
    x *= np.interp(t, [0, 0.1, dur * 0.65, dur], [0, 1, 0.75, 0]) * (1 + 0.15 * np.sin(2 * np.pi * 7 * t))
    x = norm(x)
    x[:int(0.03 * SR)] += norm(tick(r, 1.2))[:int(0.03 * SR)] * 0.5
    return norm(x)


def reg_exhale(r, dur=2.0, pitch=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for _ in range(int(70 * dur)):
        pos = r.uniform(0, dur * 0.85); f = r.uniform(130, 560) * pitch; L = int(r.uniform(0.02, 0.08) * SR); tb = np.arange(L) / SR
        b = np.sin(2 * np.pi * (f + f * 1.8 * tb / max(tb[-1], 1e-3)) * tb) * np.exp(-tb * r.uniform(35, 90))
        i0 = int(pos * SR); k = min(L, n - i0); y[i0:i0 + k] += b[:k] * r.uniform(0.3, 1.0)
    rum = lp(r.standard_normal(n), 380 * pitch) * (0.6 + 0.4 * (lp(r.standard_normal(n), 14) > 0))
    env = np.interp(t, [0, 0.06, dur * 0.7, dur], [0, 1, 0.7, 0])
    return norm((norm(y) * 0.8 + norm(rum) * 0.45) * env)


br = np.random.default_rng(31)
for b in BREATHS:
    hook = b < T['B']
    inside = T['F'] <= b < T['H']
    panic = T['D'] <= b < T['I1']
    if hook:                                                  # slowed with the picture
        m.add(b, reg_exhale(br, 3.6, 0.5), gain=0.38, rev=0.3)
        continue
    ind = 0.85 if panic else 1.55
    if b - ind - 0.12 > 0: m.add(b - ind - 0.12, reg_inhale(br, ind, 1.0), gain=0.16 if inside else 0.12, pan=0.05, rev=0.05 if inside else 0.15)
    m.add(b, reg_exhale(br, 1.4 if panic else 2.1, 1.0), gain=0.3 if inside else 0.24, pan=-0.05, rev=0.08 if inside else 0.2)

# ---------- the ocean: a low hum, slow surge; muffled inside the mouth, bright at the surface ----------
tl = tt(DUR)
oc1 = lp(noise(DUR, rng, 'brown'), 260); oc2 = lp(noise(DUR, np.random.default_rng(91), 'brown'), 260)
surge = 0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * tl) * np.sin(2 * np.pi * 0.047 * tl + 1)
olvl = np.interp(tl, [0, T['B'] - 0.01, T['B'], t_shut - 0.05, t_shut + 0.1, t_surf, t_surf + 0.3, t_splash, t_splash + 0.1, T['I1'] - 0.05, T['I1'], T['K'], T['K'] + 0.4, DUR],
                     [0.4, 0.4, 1.0, 1.0, 0.25, 0.25, 0.6, 0.6, 1.0, 1.0, 0.45, 0.45, 1.0, 1.0])
m.add(0.0, (norm(oc1) * surge * olvl, norm(oc2) * surge * olvl), gain=0.22, rev=0.1)
hiss_w = hp(noise(DUR, rng, 'pink'), 2500) * np.interp(tl, [0, T['B'], T['B'] + 0.5, t_shut, t_shut + 0.1, t_surf, T['I1'], T['K'], DUR], [0, 0, 1, 1, 0, 0, 0, 0.8, 0.8])
m.add(0.0, norm(hiss_w), gain=0.012)

# ---------- the calm theme (B and K): Am9 pad, a slow piano line ----------
CALM = [110.0, 164.81, 246.94, 261.63, 329.63]
for t0, t1 in [(T['B'], T['C'] + 4.2), (T['K'], DUR + 0.1)]:
    d = t1 - t0
    pd = pad(CALM, d, rng, cutoff=1500, attack=1.6, release=1.2, voices=3, harmonics=10)
    m.add(t0, (fade(pd[0], 0.6, 0.8), fade(pd[1], 0.6, 0.8)), gain=0.13, rev=0.5)
    line = [69, 72, 76, 74, 72, 71, 69, 64]
    for j, nn in enumerate(line):
        tj = t0 + 0.9 + j * 1.55
        if tj < t1 - 0.6: m.add(tj, epiano(midi(nn), 2.4, 0.8), gain=0.09, pan=0.25 * np.sin(j * 1.3), rev=0.6)

# ---------- the sand lance (C): a shimmer, a soft rushing of thousands of fish; then they scatter ----------
for k in range(14):
    tk = T['C'] + 0.6 + k * 0.29
    m.add(tk, bell(midi([81, 84, 88, 86, 84, 81, 79][k % 7]), rng, 1.6), gain=0.035, pan=np.sin(k * 0.9) * 0.6, rev=0.7)
sw = bp(noise(4.6, rng, 'pink'), 900, 4200) * adsr(int(4.6 * SR), 1.4, 0.6, 0.8, 1.4) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.9 * tt(4.6)))
m.add(T['C'] + 0.3, norm(sw), gain=0.05, pan=-0.2, rev=0.3)
m.add(17.6, whoosh(rng, 1.1, 2400, 500, 0.15), gain=0.28, rev=0.3)
for k in range(10): m.add(17.62 + k * 0.03, norm(bp(noise(0.25, rng, 'white'), 1500, 6000) * np.exp(-tt(0.25) * 14)), gain=0.05, pan=rng.uniform(-0.9, 0.9), rev=0.2)
m.add(17.7, thud(rng, 50, 1.2), gain=0.25, rev=0.4)

# ---------- the whale (D): a drone, its call out of the green, your heart, the riser ----------
D0, D1 = T['D'] - 0.4, t_gulp
dr = drone([55.0, 58.27, 82.41, 110.0], D1 - D0 + 0.5, rng, cutoff=420, lfo=0.09)
denv = np.interp(tt(D1 - D0 + 0.5), [0, 2.5, D1 - D0 - 0.3, D1 - D0 + 0.5], [0, 0.7, 1.0, 0.3])
m.add(D0, (dr[0] * denv, dr[1] * denv), gain=0.32, rev=0.3)


def whale_call(r, dur=3.0, f0=180, f1=95, wob=0.06):
    n = int(dur * SR); t = np.arange(n) / SR
    f = np.interp(t, [0, dur * 0.3, dur], [f0 * 0.85, f0, f1]) * (1 + wob * np.sin(2 * np.pi * 4.5 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(a * np.sin(k * ph) for k, a in [(1, 1.0), (2, 0.55), (3, 0.3), (4, 0.18), (5, 0.1)])
    x = bp(x, 80, 1800) * adsr(n, 0.4, 0.4, 0.8, dur * 0.4)
    return norm(x)


m.add(22.9, whale_call(rng, 3.6, 210, 120), gain=0.32, pan=0.15, rev=0.8)
m.add(27.2, whale_call(rng, 2.0, 150, 85, 0.1), gain=0.22, pan=0.1, rev=0.7)
hb, gap = 24.6, 0.78
while hb < t_gulp - 0.2:
    m.add(hb, heartbeat(rng), gain=0.55, rev=0.1); hb += gap; gap = max(0.42, gap * 0.94)
r_ = riser(rng, 2.6, 180, 3000, 1.8); m.add(t_gulp - 2.6, fade(r_, 0.4, 0.02), gain=0.2, rev=0.3)

# ---------- the gulp (E, slowed): the boom, water roaring in, then the jaws shut and the world is muffled ----------
m.add(t_gulp - 0.05, boom(rng, 4.5, 46, 20, 2.2, 0.5, 1.0), gain=0.95, rev=0.4)
RD = t_shut - t_gulp + 0.4; trd = tt(RD)
rw1 = noise(RD, rng, 'pink'); rw2 = noise(RD, np.random.default_rng(93), 'pink')
renv = np.interp(trd, [0, 0.15, RD - 0.55, RD - 0.4, RD], [0, 1, 0.9, 0.05, 0.0])
cut = np.interp(trd, [0, 0.4, RD - 0.6, RD - 0.4], [600, 1500, 900, 200])
m.add(t_gulp, (sweep_filter(rw1, cut, 'lowpass') * renv, sweep_filter(rw2, cut * 1.05, 'lowpass') * renv), gain=0.75, rev=0.3)
m.add(t_shut - 0.02, thud(rng, 45, 1.4), gain=0.9, rev=0.5); m.add(t_shut, thud(rng, 90, 0.6), gain=0.5, rev=0.4)
sub = np.sin(2 * np.pi * np.cumsum(np.interp(tt(2.0), [0, 2.0], [62, 30])) / SR) * adsr(int(2.0 * SR), 0.03, 0.3, 0.6, 1.4)
m.add(t_shut, sub, gain=0.35, rev=0.3)

# ---------- inside (F, G, G2): the torch click, your heart, creaks, the squeeze, then the rise ----------
m.add(t_torch, tick(rng, 1.5), gain=0.35, rev=0.05); m.add(t_torch + 0.012, tick(rng, 0.8, low=True), gain=0.2, rev=0.05)
hb, gap = T['F'] + 0.4, 0.62
while hb < t_surf - 0.1:
    m.add(hb, heartbeat(rng), gain=0.6, rev=0.05); hb += gap; gap = max(0.38, gap * 0.985)
for tc, d, f in [(35.9, 2.4, 70), (38.2, 2.0, 62), (40.3, 3.0, 55), (42.6, 2.6, 66), (44.8, 2.2, 58)]:
    m.add(tc, groan(rng, d, f), gain=0.2, pan=rng.uniform(-0.5, 0.5), rev=0.25)
SQ = T['G2'] - T['G'] + 0.3; tsq = tt(SQ)
pr = lp(noise(SQ, rng, 'brown'), 140) * np.interp(tsq, [0, 1.5, SQ - 0.4, SQ], [0, 1, 1, 0.4])
m.add(T['G'], norm(pr), gain=0.4, rev=0.1)
inpad = pad([73.42, 77.78, 110.0, 155.56], T['H'] - T['F'], rng, cutoff=700, attack=2.5, release=0.8, voices=3, harmonics=10)
m.add(T['F'], inpad, gain=0.14, rev=0.4)
G2D = T['H'] - T['G2'] + 0.2
rise = np.sin(2 * np.pi * np.cumsum(np.interp(tt(G2D), [0, G2D], [70, 160])) / SR) * adsr(int(G2D * SR), 0.6, 0.3, 0.8, 0.3)
m.add(T['G2'], rise, gain=0.12, rev=0.3)
mv = lp(noise(G2D, rng, 'pink'), 500) * np.interp(tt(G2D), [0, 0.8, G2D], [0, 1, 1.4])
m.add(T['G2'], norm(mv), gain=0.2, rev=0.2)

# ---------- the surface (H): light pours in, the head shake, thrown into the air, the splash, it sinks away ----------
m.add(t_surf, whoosh(rng, 1.2, 400, 3500, 0.2), gain=0.4, rev=0.3)
gush = bp(noise(1.6, rng, 'pink'), 300, 5000) * adsr(int(1.6 * SR), 0.05, 0.3, 0.7, 0.8)
m.add(t_surf + 0.05, norm(gush), gain=0.3, rev=0.2)
for k in range(5): m.add(t_surf + 0.1 + k * 0.21, whoosh(rng, 0.35, 600, 2200, 0.5), gain=0.16, pan=(-1) ** k * 0.6, rev=0.2)
m.add(t_spit - 0.05, whoosh(rng, 0.5, 300, 6000, 0.4), gain=0.45, rev=0.2)
air = hp(noise(0.42, rng, 'white'), 2500) * adsr(int(0.42 * SR), 0.03, 0.1, 0.8, 0.15)
m.add(t_spit + 0.02, norm(air), gain=0.12, rev=0.3)
m.add(t_splash, boom(rng, 1.6, 90, 40, 0.6, 1.0, 0.6), gain=0.6, rev=0.3)
spl = bp(noise(1.2, rng, 'white'), 400, 7000) * np.exp(-tt(1.2) * 3.5)
m.add(t_splash, norm(spl), gain=0.4, rev=0.3)
for k in range(40): m.add(t_splash + 0.05 + rng.uniform(0, 1.6), norm(np.sin(2 * np.pi * rng.uniform(300, 1200) * tt(0.05)) * np.exp(-tt(0.05) * 60)), gain=0.05, pan=rng.uniform(-0.9, 0.9), rev=0.3)
m.add(t_splash + 0.6, whale_call(rng, 3.2, 120, 70, 0.04), gain=0.3, rev=0.8)
relief = pad([110.0, 138.59, 164.81, 220.0], T['I1'] - t_splash + 0.4, rng, cutoff=1400, attack=1.5, release=0.5, voices=3, harmonics=10)
m.add(t_splash, relief, gain=0.1, rev=0.6)

# ---------- the real cases on tape (I1 -> J): hiss and hum, a low documentary pad, muffled effects ----------
V0, V1 = T['I1'], T['K']; VD = V1 - V0; tv = tt(VD)
venv = np.interp(tv, [0, 0.3, VD - 0.4, VD], [0, 1, 1, 0])
tape = hp(noise(VD, rng, 'white'), 4000) * 0.4 + np.sin(2 * np.pi * 60 * tv) * 0.3
m.add(V0, norm(tape) * venv, gain=0.03)
vp = pad([98.0, 116.54, 146.83, 196.0], VD, rng, cutoff=1300, attack=1.5, release=1.5, voices=2, harmonics=10)
wob = 1 + 0.004 * np.sin(2 * np.pi * 0.8 * tv)
vpl = np.interp(np.cumsum(wob) - 1, np.arange(len(vp[0])), vp[0]); vpr = np.interp(np.cumsum(wob) - 1, np.arange(len(vp[1])), vp[1])
m.add(V0, (vpl * venv, vpr * venv), gain=0.17, rev=0.5)
for j, nn in enumerate([69, 72, 76, 74, 72, 69, 67, 69]): m.add(V0 + 0.7 + j * 2.4, epiano(midi(nn), 2.2, 0.8), gain=0.08, pan=0.2 * np.sin(j), rev=0.6)
m.add(T['I2'] - 1.4, whoosh(rng, 1.5, 200, 1200, 0.7), gain=0.25, rev=0.4)            # the whale reaching him
m.add(T['I2'] + 1.0, whale_call(rng, 3.0, 160, 90), gain=0.18, rev=0.8)
t_dsp = T['I3'] + 0.3125 * (T['J'] - T['I3'])
m.add(t_dsp, norm(bp(noise(0.9, rng, 'white'), 300, 5000) * np.exp(-tt(0.9) * 4)), gain=0.3, rev=0.3)
m.add(T['I3'] + 0.12, bell(midi(81), rng, 2.4), gain=0.07, rev=0.7)                    # "He survived"
t_br = T['J'] + 0.43 * (T['K'] - T['J'])
m.add(t_br, boom(rng, 2.2, 70, 30, 0.9, 0.8, 0.8), gain=0.5, rev=0.4)
brk = bp(noise(2.0, rng, 'white'), 300, 6000) * adsr(int(2.0 * SR), 0.03, 0.4, 0.6, 1.2)
m.add(t_br, norm(brk), gain=0.35, rev=0.3)

# ---------- the hook (0 -> 3.7): slowed, the jaws closing around you, the thud as it shuts ----------
hr = np.random.default_rng(97); th = tt(T['B'])
m.add(0.0, boom(hr, 3.5, 40, 18, 2.4, 0.4, 1.0), gain=0.85, rev=0.4)
hw1 = noise(T['B'], hr, 'pink'); hw2 = noise(T['B'], np.random.default_rng(98), 'pink')
henv = np.interp(th, [0, 0.05, 3.3, 3.55, 3.62], [0, 1, 0.9, 0.2, 0])
m.add(0.0, (sweep_filter(hw1, 300 + 700 * henv, 'lowpass') * henv, sweep_filter(hw2, 320 + 700 * henv, 'lowpass') * henv), gain=0.8, rev=0.25)
m.add(hook_gulp, whoosh(hr, 1.4, 200, 900, 0.4), gain=0.3, rev=0.3)
m.add(3.5, thud(hr, 42, 1.0), gain=0.9, rev=0.4); m.add(3.52, thud(hr, 85, 0.5), gain=0.4, rev=0.3)
hp_ = pad([55.0, 58.27, 82.41], T['B'], hr, cutoff=500, attack=0.05, release=0.2, voices=2, harmonics=8)
m.add(0.0, (fade(hp_[0], 0.02, 0.15), fade(hp_[1], 0.02, 0.15)), gain=0.2, rev=0.3)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep09.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
print('wrote', out, 'gulp', round(t_gulp, 2), 'shut', round(t_shut, 2), 'surface', round(t_surf, 2), 'spit', round(t_spit, 2), 'splash', round(t_splash, 2))
