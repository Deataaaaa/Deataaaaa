"""Soundtrack for EP03 (atmosphere vanishes for 5 s). The key moment: total silence while the air is gone."""
import sys
import numpy as np
from synth import *

T_V, T_R, DUR = 9.0, 39.0, 51.6
m = Mix(DUR, seed=31)
rng = np.random.default_rng(13)


def waves(dur, rng, period=6.5):
    n = int(dur * SR); t = np.arange(n) / SR
    body = lp(noise(dur, rng, 'brown'), 500)
    hiss = bp(noise(dur, rng, 'white'), 1500, 7000)
    ph = (t / period + rng.uniform(0, 1)) % 1.0
    swell = np.exp(-((ph - 0.35) ** 2) / 0.02)
    crash = np.exp(-np.maximum(0, ph - 0.38) * 9) * (ph > 0.38)
    x = body * (0.4 + 0.6 * swell) + hiss * crash * 0.5
    return x / (np.abs(x).max() + 1e-9)


def gull(rng):
    d = 0.42; t = tt(d)
    f = 1700 + 900 * np.sin(np.pi * t / d) ** 0.7 - 500 * (t / d)
    f *= 1 + 0.02 * np.sin(2 * np.pi * 28 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    x *= np.sin(np.pi * t / d) ** 1.5
    return bp(x, 900, 6000) / 1.6


chordC = [130.8, 196.0, 261.6, 329.6, 392.0, 587.3]   # C add9 (sunny)
chordAm = [110.0, 164.8, 220.0, 261.6, 329.6]

# --- before: beach ambience + light score ---
wv = waves(T_V + 0.05, rng); wv2 = waves(T_V + 0.05, np.random.default_rng(2), 7.3)
m.add(0, (fade(wv, 0.4, 0.02), fade(wv2, 0.4, 0.02)), gain=0.32, rev=0.15)
for tg in [0.6, 1.4, 2.9, 4.1, 6.3, 7.2, 8.1]:
    m.add(tg, gull(rng), gain=0.09, pan=rng.uniform(-0.8, 0.8), rev=0.4)
pc = pad(chordC, T_V + 0.05, rng, cutoff=2600, attack=1.2, release=0.02)
m.add(0, (fade(pc[0], 0, 0.02), fade(pc[1], 0, 0.02)), gain=0.13, rev=0.5)
for i, (tm, f) in enumerate([(0.2, 523.3), (0.8, 659.3), (1.4, 784.0), (2.6, 1046.5)]):
    m.add(tm, bell(f, rng, 2.5), gain=0.06, pan=-0.4 + 0.27 * i, rev=0.8)
prop = bp(noise(T_V, rng, 'pink'), 90, 400) * (0.6 + 0.4 * np.sin(2 * np.pi * 27 * tt(T_V)))
m.add(0, fade(prop / np.abs(prop).max(), 1.0, 0.02), gain=0.04)
for k in range(1, 9):
    m.add(T_V - k, tick(rng, 0.7, low=k <= 3), gain=0.06 + (0.06 if k <= 3 else 0), pan=0.1 * (-1) ** k, rev=0.2)
rr = riser(rng, 3.0, 300, 6000, 1.6)
m.add(T_V - 3.0, fade(rr, 0.4, 0.01), gain=0.22)

# --- the air vanishes: hard cut to (almost) nothing ---
# what's left is inside you: heartbeat (bone conduction), faint ringing, sparse score
ring = np.sin(2 * np.pi * 6200 * tt(T_R - T_V)) * 0.5 + np.sin(2 * np.pi * 4100 * tt(T_R - T_V)) * 0.3
m.add(T_V, fade(ring, 1.5, 0.05), gain=0.006)
hb, gap = T_V + 0.8, 1.15
while hb < T_R - 0.5:
    m.add(hb, heartbeat(rng), gain=0.3, rev=0.05)
    hb += gap; gap = max(0.75, gap * 0.985)
dr = drone([55.0, 82.4, 110.0], T_R - T_V, rng, cutoff=260, lfo=0.06)
m.add(T_V + 0.6, (fade(dr[0], 3.0, 0.05), fade(dr[1], 3.0, 0.05)), gain=0.09, rev=0.4)
pa = pad(chordAm, T_R - T_V - 2, rng, cutoff=1500, attack=5.0, release=0.05)
m.add(T_V + 2, (fade(pa[0], 0, 0.05), fade(pa[1], 0, 0.05)), gain=0.07, rev=0.8)
for i, f in enumerate([880.0, 659.3, 523.3, 440.0, 659.3, 587.3, 523.3, 493.9]):
    m.add(T_V + 3 + i * 3.2, bell(f, rng, 3.5), gain=0.035, pan=0.4 * np.sin(i), rev=1.0)
# each real second without air: a dull internal thump
for k in range(1, 5):
    m.add(T_V + k * 6, thud(rng, 48, 0.6), gain=0.18)
rv = riser(rng, 1.6, 300, 5000, 1.3)
m.add(T_R - 1.62, fade(rv, 0.3, 0.02), gain=0.2)

# --- the air returns: the world rushes back ---
m.add(T_R, whoosh(rng, 1.2, 200, 5000, 0.15), gain=0.4, rev=0.3)
wv3 = waves(DUR - T_R, rng); wv4 = waves(DUR - T_R, np.random.default_rng(4), 7.1)
m.add(T_R, (fade(wv3, 0.05, 2.0), fade(wv4, 0.05, 2.0)), gain=0.32, rev=0.15)
for tg in [39.4, 40.2, 41.5, 43.0, 45.1]:
    m.add(tg, gull(rng), gain=0.09, pan=rng.uniform(-0.8, 0.8), rev=0.4)
pc2 = pad(chordC, DUR - T_R, rng, cutoff=3000, attack=0.8, release=1.5)
m.add(T_R, pc2, gain=0.16, rev=0.6)
for i, f in enumerate([523.3, 659.3, 784.0, 1046.5, 1318.5]):
    m.add(44.0 + i * 0.55, bell(f, rng, 3.0), gain=0.06, pan=-0.5 + 0.25 * i, rev=0.9)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep03.wav'
m.render(out, rev_time=2.4, target_rms_db=-18.0)
print('wrote', out)
