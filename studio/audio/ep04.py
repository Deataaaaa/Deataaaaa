"""Soundtrack for EP04 (falling through the Earth). Intensity follows the fall speed."""
import sys, json
import numpy as np
from synth import *

T_JUMP, T_CENTER, T_OUT, DUR = 8.0, 30.0, 41.6, 54.0
m = Mix(DUR, seed=41)
rng = np.random.default_rng(17)

# speed envelope (0..1) on the screen timeline
tl = np.arange(int(DUR * SR)) / SR
spd = np.interp(tl, [0, T_JUMP, 12, 20, T_CENTER, 36, T_OUT - 0.4, T_OUT + 1.8, T_OUT + 3.6, 47, 50, DUR],
                     [0, 0, 0.25, 0.7, 1.0, 0.7, 0.05, 0.0, 0.05, 0.6, 0.6, 0.0])

# polar wind before the jump
wd = wind(rng, T_JUMP + 2.4, 300, 2400, 0.2, 0.6)
m.add(0, fade(wd, 1.0, 2.0), gain=0.22, rev=0.3)
cold = pad([110.0, 164.8, 246.9, 329.6, 493.9], T_JUMP + 0.5, rng, cutoff=2400, attack=1.5, release=0.4)
m.add(0, cold, gain=0.14, rev=0.7)
for i, (tm, f) in enumerate([(0.2, 659.3), (0.8, 987.8), (1.4, 1318.5)]):
    m.add(tm, bell(f, rng, 2.5), gain=0.05, pan=-0.3 + 0.3 * i, rev=0.9)
for k in range(1, 5):
    m.add(T_JUMP - k, tick(rng, 0.8, low=k <= 2), gain=0.09, rev=0.2)

# the jump
m.add(T_JUMP + 0.3, whoosh(rng, 1.8, 200, 3000, 0.3), gain=0.4, rev=0.4)

# rumble + roar that scale with speed
n = len(tl)
rum = lp(noise(DUR, rng, 'brown'), 160)
roar = bp(noise(DUR, rng, 'pink'), 120, 900)
env = spd ** 1.3
m.add(0, rum / np.abs(rum).max() * env, gain=0.45)
m.add(0, roar / np.abs(roar).max() * env ** 1.5, gain=0.25, rev=0.2)
# heat crackle deeper down (mantle/core), from ~16 s
cr = np.zeros(n)
for i in range(1400):
    tm = rng.uniform(15, 40)
    j = int(tm * SR); L = int(0.004 * SR)
    if j + L < n: cr[j:j + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (0.0008 * SR))
cr = hp(cr, 2000) * np.interp(tl, [14, 20, 30, 40, 42], [0, 1, 1, 0.6, 0])
m.add(0, cr / (np.abs(cr).max() + 1e-9), gain=0.08, rev=0.3)
# drone whose pitch follows the speed
f = 55 * (1 + spd * 1.0)
ph = 2 * np.pi * np.cumsum(f) / SR
dr = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)) * (0.2 + 0.8 * spd) * (tl > T_JUMP)
m.add(0, lp(dr, 600), gain=0.12, rev=0.3)
# pulse toward the centre, accelerating
tp, gap = T_JUMP + 1.0, 1.2
while tp < T_CENTER - 0.2:
    m.add(tp, thud(rng, 55, 0.5), gain=0.3, rev=0.15)
    tp += gap; gap = max(0.32, gap * 0.92)
# passing the centre
m.add(T_CENTER - 0.6, whoosh(rng, 1.4, 150, 4000, 0.45), gain=0.5, rev=0.3)
m.add(T_CENTER, boom(rng, 3.0, 70, 30, 1.0, 0.4, 0.6), gain=0.6, rev=0.4)
# slowing down: descending tones
for i, fq in enumerate([392.0, 349.2, 329.6, 293.7, 261.6]):
    m.add(33.2 + i * 1.6, bell(fq, rng, 2.8), gain=0.05, pan=0.3 * np.sin(i), rev=0.9)
# the apex: suspended, almost silent
sus = np.sin(2 * np.pi * 1318.5 * tt(2.6)) * adsr(int(2.6 * SR), 0.3, 0.5, 0.7, 1.2)
m.add(T_OUT + 0.6, sus, gain=0.05, rev=0.9)
m.add(T_OUT + 3.4, whoosh(rng, 1.6, 2500, 200, 0.2), gain=0.35, rev=0.4)
# end card
pe = pad([110.0, 164.8, 220.0, 277.2, 329.6], DUR - 49.6, rng, cutoff=2000, attack=0.8, release=0.4)
m.add(49.6, pe, gain=0.16, rev=0.6)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep04.wav'
m.render(out, rev_time=2.6, target_rms_db=-17.5)
print('wrote', out)
