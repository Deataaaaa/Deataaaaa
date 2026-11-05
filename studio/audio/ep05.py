"""Soundtrack for EP05 (the Moon stops and falls). Calm night -> dread -> impact -> calm."""
import sys
import numpy as np
from synth import *

T_STOP, T_IMPACT, DUR = 9.8, 35.0, 55.6
m = Mix(DUR, seed=51)
rng = np.random.default_rng(23)

def waves(dur, rng, period=7.0, lowcut=420):
    n = int(dur * SR); t = np.arange(n) / SR
    body = lp(noise(dur, rng, 'brown'), lowcut)
    hiss = bp(noise(dur, rng, 'white'), 1500, 6000)
    ph = (t / period + rng.uniform(0, 1)) % 1.0
    swell = np.exp(-((ph - 0.35) ** 2) / 0.02); crash = np.exp(-np.maximum(0, ph - 0.38) * 9) * (ph > 0.38)
    x = body * (0.4 + 0.6 * swell) + hiss * crash * 0.35
    return x / (np.abs(x).max() + 1e-9)

Em = [82.4, 123.5, 164.8, 196.0, 246.9, 370.0]
Cm = [65.4, 98.0, 130.8, 155.6, 196.0, 293.7]
# night beach: soft waves + crickets-free calm pad + music box motif
w1 = waves(25.5, rng); m.add(0, fade(w1, 0.5, 0.6), gain=0.22, rev=0.2)
p1 = pad(Em, T_STOP + 0.6, rng, cutoff=1800, attack=1.5, release=0.5); m.add(0, p1, gain=0.15, rev=0.7)
for i, (tm, f) in enumerate([(0.2, 659.3), (0.8, 987.8), (1.4, 1318.5), (3.6, 1174.7), (4.4, 987.8), (5.2, 739.99), (6.6, 659.3), (7.6, 493.9)]):
    m.add(tm, bell(f, rng, 3.0), gain=0.05, pan=np.sin(i) * 0.5, rev=0.9)
# the stop: a hard, low "clunk" + everything dips
m.add(T_STOP, boom(rng, 3.5, 60, 28, 1.4, 0.2, 0.6), gain=0.6, rev=0.4)
m.add(T_STOP - 0.9, whoosh(rng, 1.0, 300, 3000, 0.8), gain=0.25)
# dread: drone rising over the days, clock ticks speeding up
d = drone([41.2, 61.7, 82.4], 25.2, rng, cutoff=300, lfo=0.05)
env = np.linspace(0.3, 1.0, len(d[0])) ** 1.5
m.add(T_STOP + 0.5, (d[0] * env, d[1] * env), gain=0.28, rev=0.3)
pd = pad(Cm, 25.0, rng, cutoff=1200, attack=4.0, release=0.3); m.add(T_STOP + 0.8, pd, gain=0.1, rev=0.8)
tk, gap = T_STOP + 1.5, 1.4
while tk < T_IMPACT - 0.3:
    m.add(tk, tick(rng, 0.7, low=tk > 28), gain=0.06 + 0.1 * (tk - T_STOP) / 25, pan=0.1 * np.sin(tk), rev=0.3)
    tk += gap; gap = max(0.22, gap * 0.93)
for c in [12.7, 15.5, 18.7, 21.9]:
    m.add(c, thud(rng, 50, 0.8), gain=0.3, rev=0.4)
# flood shot: roaring surge
surge = lp(noise(3.4, rng, 'pink'), 900) * np.linspace(0.3, 1, int(3.4 * SR))
m.add(25.45, surge / np.abs(surge).max(), gain=0.5, rev=0.3)
m.add(25.45, waves(3.4, rng, 1.2, 800), gain=0.35)
# breakup: groans, cracking
m.add(28.7, groan(rng, 3.5, 60), gain=0.4, rev=0.5)
for i in range(18):
    tm = rng.uniform(29.5, 34.5)
    crack = hp(rng.standard_normal(int(0.25 * SR)), 800) * np.exp(-tt(0.25) * 25)
    m.add(tm, crack / np.abs(crack).max(), gain=0.12, pan=rng.uniform(-0.7, 0.7), rev=0.6)
rr = riser(rng, 5.6, 100, 4000, 1.4); m.add(T_IMPACT - 5.6, fade(rr, 1.0, 0.02), gain=0.32, rev=0.3)
# impact
m.add(T_IMPACT, boom(rng, 7.0, 70, 18, 3.0, 1.0, 1.0), gain=1.0, rev=0.5)
m.add(T_IMPACT, thud(rng, 40, 1.5), gain=0.6)
roar = lp(noise(6.4, rng, 'brown'), 300) * adsr(int(6.4 * SR), 0.05, 1.5, 0.6, 3.5)
m.add(T_IMPACT + 0.05, roar / np.abs(roar).max(), gain=0.5, rev=0.4)
# calm again: waves + pad + music box (same motif as the start)
w2 = waves(DUR - 41.45, rng); m.add(41.45, fade(w2, 1.0, 1.5), gain=0.22, rev=0.2)
p2 = pad(Em, DUR - 41.45, rng, cutoff=2000, attack=2.0, release=1.0); m.add(41.45, p2, gain=0.15, rev=0.7)
for i, (tm, f) in enumerate([(42.0, 659.3), (42.6, 987.8), (43.2, 1318.5), (45.4, 1174.7), (46.2, 987.8), (47.0, 739.99), (48.5, 659.3), (49.5, 493.9), (50.5, 329.6)]):
    m.add(tm, bell(f, rng, 3.0), gain=0.05, pan=np.sin(i) * 0.5, rev=0.9)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep05.wav'
m.render(out, rev_time=2.8, target_rms_db=-17.5)
print('wrote', out)
