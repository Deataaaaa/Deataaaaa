"""Soundtrack for post 7 (What if the air stopped turning with Earth for 30 seconds?). Cue times match episodes/ep13cams.js.
Hook: a hit, the blast in slow motion. Calm: surf, gulls, the Golden Gate foghorn, a warm drone, a motif, ticks speeding up
to zero. Zero: a huge hit and a 30 s roar (howling resonances, sand hiss, debris knocks); the bridge groans and snaps.
Space: the roar muffled. The wind stops: sudden silence, falling sand, then the sea draining (a deep sucking rumble,
rushing water). The wave: a roar that builds to the impact, then black. End card: hush, the motif, Apple's two pops."""
import sys
import numpy as np
from synth import *

DUR = 68.0
T = dict(HOOK=3.6, ZERO=11.0, BRIDGE=17.0, BREAK=26.5, SPACE=31.0, SEA=37.0, BACK=41.0, EARLIER=45.2, WAVE=55.5, HIT=60.2, END=62.0)
m = Mix(DUR, seed=13)
rng = np.random.default_rng(1313)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)

def howl(dur, r, lo=300, hi=900, rate=0.15, q=0.08):
    t = tt(dur); fc = lo + (hi - lo) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + r.uniform(0, 6)) * (0.7 + 0.3 * np.sin(2 * np.pi * rate * 2.3 * t)))
    return norm(sweep_filter(noise(dur, r, 'white'), list(zip(fc * (1 - q), fc * (1 + q))), 'bandpass'))
def surf(dur, r, period=7.0):
    n = noise(dur, r, 'pink'); t = tt(dur); sw = 0.35 + 0.65 * np.clip(np.sin(2 * np.pi * t / period) * 0.5 + 0.5, 0, 1) ** 3
    return norm(sweep_filter(n, 500 + 1600 * sw, 'lowpass')) * sw
def gull(r):
    d = r.uniform(0.35, 0.6); t = tt(d); f = np.interp(t, [0, 0.12 * d, 0.45 * d, d], [1300, 2300, 1900, 1200]) * (1 + 0.02 * np.sin(2 * np.pi * 30 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR; return bp((np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * np.sin(np.pi * t / d) ** 1.5, 800, 5000)
def foghorn(r, f=178.0, d=2.6):
    """the Golden Gate's diaphone: a low reed tone that drops at the end ('beee-ohh')"""
    t = tt(d); fr = np.where(t < d * 0.62, f, f * 0.84); ph = 2 * np.pi * np.cumsum(fr) / SR
    x = sum(np.sin(k * ph) / k ** 0.8 for k in range(1, 12)); env = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.35)
    return norm(lp(x, 1800) * env)
def knock(r):
    d = r.uniform(0.05, 0.16); x = bp(r.standard_normal(int(d * SR)), r.uniform(300, 900), r.uniform(1500, 4000)) * np.exp(-tt(d) * r.uniform(25, 60)); return norm(x)
def snap(r, d=0.8):
    t = tt(d); x = hp(r.standard_normal(len(t)), 900) * np.exp(-t * 40)
    for _ in range(6): x += 0.3 * np.sin(2 * np.pi * r.uniform(400, 2400) * t) * np.exp(-t * r.uniform(5, 14))
    return norm(x)
def downer(r, d=0.9, f0=1800, f1=90):
    n = int(d * SR); k = np.linspace(0, 1, n); fc = f0 * (f1 / f0) ** (k ** 0.7)
    x = sweep_filter(noise(d, r, 'pink'), list(zip(fc * 0.6, fc * 1.5)), 'bandpass'); return norm(norm(x) + 0.35 * np.sin(2 * np.pi * np.cumsum(fc * 0.25) / SR)) * (1 - k) ** 1.6

motif = [72, 76, 79, 81, 79, 76, 74]
# ---------- the countdown (from frame 1) ----------
tk = 0.0
while tk < T['ZERO'] - 0.05:
    rem = T['ZERO'] - tk
    m.add(tk, tick(rng, 1.0 + (rem < 3) * 0.4, low=rem < 1.2), gain=0.065 if tk >= T['HOOK'] else 0.045, pan=-0.1, rev=0.1)
    tk += 1.0 if rem > 6 else 0.5 if rem > 3 else 0.25 if rem > 1.2 else 0.12

# ---------- calm Baker Beach (3.6 -> 11) ----------
C0, C1 = T['HOOK'], T['ZERO']; dC = C1 - C0
m.add(C0, fade(surf(dC, rng, 6.5), 0.3, 0.004), gain=0.2, pan=0.3, rev=0.3)
m.add(C0, fade(norm(wind(rng, dC, 200, 1100, 0.2, 0.4)), 0.4, 0.004), gain=0.05, rev=0.2)
gr = np.random.default_rng(5)
for tg in [C0 + 0.8, C0 + 2.6, C0 + 3.0, C0 + 5.6]: m.add(tg, gull(gr), gain=0.035, pan=gr.uniform(-0.7, 0.7), rev=0.5)
m.add(C0 + 1.2, foghorn(rng), gain=0.09, pan=-0.35, rev=0.7)
dr = drone([196.0, 293.66, 392.0, 440.0], dC + 0.3, rng, cutoff=1300, lfo=0.06)
m.add(C0, (fade(dr[0], 0.8, 0.1), fade(dr[1], 0.8, 0.1)), gain=0.05, rev=0.4)
for j, nn in enumerate(motif):
    tj = C0 + 0.4 + j * 0.75
    if tj < C1 - 0.5: m.add(tj, bell(midi(nn), rng, 1.8), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.6)
m.add(C1 - 2.4, riser(rng, 2.4, 300, 6500, 2.2), gain=0.22, rev=0.3)
m.add(C0, downer(rng, 0.8, 1500, 100), gain=0.12, rev=0.3)

# ---------- the wind (11 -> 41): a hit, then the roar ----------
W0, W1 = T['ZERO'], T['BACK']; wd = W1 - W0
m.add(W0, boom(rng, 4.5, 64, 22, 1.8, 1.0, 1.0), gain=1.1, rev=0.4)
muff = env_at(tt(wd), [0, T['SPACE'] - W0 - 0.05, T['SPACE'] - W0 + 0.05, T['SEA'] - W0 - 0.05, T['SEA'] - W0 + 0.05, wd], [1, 1, 0.35, 0.35, 1, 1])
cut = np.ones(int(wd * SR)); cut[-int(0.012 * SR):] = np.linspace(1, 0, int(0.012 * SR))          # the wind stops dead
r1 = lp(noise(wd, rng, 'brown'), 900); r2 = lp(noise(wd, np.random.default_rng(7), 'brown'), 900)
renv = env_at(tt(wd), [0, 0.04, 2.0, wd], [0, 1.0, 0.85, 0.9]) * muff * cut
m.add(W0, (norm(r1) * renv, norm(r2) * renv), gain=0.62)
hiss = hp(noise(wd, rng, 'pink'), 2500) * renv * env_at(tt(wd), [0, T['SPACE'] - W0, T['SEA'] - W0, wd], [1, 1, 1, 1]) * np.where(muff < 0.5, 0.15, 1)
m.add(W0, norm(hiss), gain=0.09)
for k, (lo, hi, rate, pan) in enumerate([(280, 800, 0.18, -0.4), (450, 1300, 0.27, 0.4), (900, 2200, 0.41, 0.0)]):
    h = howl(wd, np.random.default_rng(30 + k), lo, hi, rate, 0.06) * renv
    m.add(W0, h, gain=0.07 - 0.015 * k, pan=pan)
kr = np.random.default_rng(66); tc = W0 + 0.3
while tc < W1 - 0.2:                                                    # debris knocks and cracks
    if not (T['SPACE'] < tc < T['SEA']): m.add(tc, knock(kr), gain=kr.uniform(0.04, 0.12), pan=kr.uniform(-0.8, 0.8))
    tc += kr.uniform(0.05, 0.3)
for tb in [T['BRIDGE'], T['SEA']]: m.add(tb, boom(rng, 2.5, 58, 26, 1.2, 0.6, 0.8), gain=0.5, rev=0.3)
for tg_ in [18.5, 21.3, 24.0]: m.add(tg_, groan(rng, 3.0, 70), gain=0.13, pan=0.3, rev=0.5)    # the bridge groaning
m.add(T['BREAK'], snap(rng, 1.2), gain=0.4, pan=0.3, rev=0.5)
m.add(T['BREAK'] + 0.1, boom(rng, 4.0, 48, 20, 1.8, 0.5, 0.9), gain=0.55, pan=0.3, rev=0.6)
m.add(T['BREAK'] + 2.5, norm(lp(noise(2.5, rng, 'brown'), 500)) * env_at(tt(2.5), [0, 0.3, 2.5], [0, 1, 0]), gain=0.25, pan=0.3, rev=0.5)
sd = T['SEA'] - T['SPACE'] + 0.3
sp = drone([73.42, 110.0, 146.83, 220.0], sd, rng, cutoff=650, lfo=0.05)
m.add(T['SPACE'], (fade(sp[0], 0.2, 0.3), fade(sp[1], 0.2, 0.3)), gain=0.2, rev=0.4)
m.add(T['SPACE'], boom(rng, 3.0, 55, 22, 1.5, 0.4, 0.9), gain=0.6, rev=0.5)

# ---------- the wind stops (41): silence, falling sand, the sea draining ----------
B0 = T['BACK']
ring = (np.sin(2 * np.pi * 2637 * tt(4.0)) + 0.6 * np.sin(2 * np.pi * 3951 * tt(4.0))) * env_at(tt(4.0), [0, 0.1, 3.5, 4.0], [0, 1, 0.6, 0])
m.add(B0, ring, gain=0.01)
m.add(B0 + 0.2, norm(hp(noise(4.0, rng, 'pink'), 3000)) * env_at(tt(4.0), [0, 0.5, 4.0], [0, 1, 0]), gain=0.035)
dd = T['EARLIER'] - B0 + 0.4
suck = lp(noise(dd, rng, 'brown'), 260) * env_at(tt(dd), [0, 0.5, dd - 0.6, dd], [0, 0.5, 1.0, 0.0])
m.add(B0, norm(suck), gain=0.45, rev=0.4)
rush = bp(noise(dd, rng, 'pink'), 400, 2600) * env_at(tt(dd), [0, 0.8, dd - 0.5, dd], [0, 0.6, 1.0, 0])
m.add(B0, norm(rush), gain=0.12, pan=0.4, rev=0.4)
gp = pad([110.0, 130.81, 164.81], dd, rng, cutoff=900, attack=1.5, release=0.5, voices=2, harmonics=8)
m.add(B0, gp, gain=0.06, rev=0.6)
m.add(T['EARLIER'] - 1.3, riser(rng, 1.3, 300, 5000, 2.0), gain=0.14, rev=0.3)

# ---------- the wave (45.2 -> 60.2) ----------
E0, E1 = T['EARLIER'], T['HIT']; ed = E1 - E0
m.add(E0, boom(rng, 4.0, 52, 20, 2.0, 0.5, 1.0), gain=0.85, rev=0.5)
roar = lp(noise(ed, rng, 'brown'), 700) * env_at(tt(ed), [0, 2.0, ed - 3.0, ed - 0.02, ed], [0.1, 0.3, 0.75, 1.0, 0.0])
roar2 = lp(noise(ed, np.random.default_rng(11), 'brown'), 700) * env_at(tt(ed), [0, 2.0, ed - 3.0, ed - 0.02, ed], [0.1, 0.3, 0.75, 1.0, 0.0])
m.add(E0, (norm(roar), norm(roar2)), gain=0.6, rev=0.4)
crash = bp(noise(ed, rng, 'pink'), 600, 5000) * env_at(tt(ed), [0, ed - 6, ed - 0.02, ed], [0, 0.3, 1.0, 0])
m.add(E0, norm(crash), gain=0.14, rev=0.4)
wdr = drone([58.27, 87.31, 116.54, 174.61], ed, rng, cutoff=700, lfo=0.07)
m.add(E0, (wdr[0] * env_at(tt(ed), [0, 1, ed - 0.05, ed], [0, 0.8, 1, 0]), wdr[1] * env_at(tt(ed), [0, 1, ed - 0.05, ed], [0, 0.8, 1, 0])), gain=0.16, rev=0.4)
m.add(T['WAVE'], boom(rng, 2.5, 56, 26, 1.2, 0.4, 0.8), gain=0.45, rev=0.4)
m.add(53.0, snap(rng, 1.0), gain=0.15, pan=-0.3, rev=0.7)                # the bridge goes under
m.add(E1 - 3.0, riser(rng, 3.0, 200, 8000, 2.4), gain=0.32, rev=0.3)
m.add(E1, boom(np.random.default_rng(99), 1.8, 46, 20, 0.8, 1.0, 1.0), gain=1.0, rev=0.15)

# ---------- end card (62 -> 68) ----------
ep_ = pad([196.0, 293.66, 392.0, 440.0], DUR - T['END'] + 0.1, rng, cutoff=1500, attack=1.0, release=2.0, voices=2, harmonics=10)
m.add(T['END'], (fade(ep_[0], 0.8, 2.2), fade(ep_[1], 0.8, 2.2)), gain=0.08, rev=0.6)
for j, nn in enumerate(motif[:5]): m.add(T['END'] + 0.4 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)
m.add(63.42, woodblock(rng, 1250), gain=0.05, rev=0.25)
m.add(65.4, woodblock(rng, 830), gain=0.04, rev=0.25)

# ---------- the hook (0 -> 3.6): the blast in slow motion ----------
hr = np.random.default_rng(97); th = tt(T['HOOK'])
m.add(0.0, boom(hr, 3.6, 52, 22, 2.0, 0.8, 1.0), gain=1.0, rev=0.4)
hro = lp(noise(T['HOOK'], hr, 'brown'), 400) * env_at(th, [0, 0.03, 3.4, 3.6], [0, 1, 0.8, 0])
m.add(0.0, norm(hro), gain=0.55, rev=0.3)
hh = howl(T['HOOK'], hr, 160, 420, 0.25, 0.08) * env_at(th, [0, 0.05, 3.4, 3.6], [0, 1, 0.9, 0])
m.add(0.0, hh, gain=0.09, rev=0.5)
m.add(0.05, bell(midi(84), hr, 3.0), gain=0.07, rev=0.7)
m.add(T['HOOK'] - 0.9, riser(hr, 0.9, 600, 7000, 1.6), gain=0.12, rev=0.2)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep13.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
print('wrote', out)
