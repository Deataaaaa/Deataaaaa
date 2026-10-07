"""Soundtrack for EP06 (the Sun disappears). Bright -> held breath -> darkness -> cold -> warm return."""
import sys
import numpy as np
from synth import *

T_GONE, T_DARK, DUR = 3.5, 19.2, 55.5
m = Mix(DUR, seed=61)
rng = np.random.default_rng(29)

def waves(dur, rng, period=6.8):
    n = int(dur * SR); t = np.arange(n) / SR
    body = lp(noise(dur, rng, 'brown'), 480); hiss = bp(noise(dur, rng, 'white'), 1500, 6500)
    ph = (t / period + rng.uniform(0, 1)) % 1.0
    swell = np.exp(-((ph - 0.35) ** 2) / 0.02); crash = np.exp(-np.maximum(0, ph - 0.38) * 9) * (ph > 0.38)
    x = body * (0.4 + 0.6 * swell) + hiss * crash * 0.45
    return x / (np.abs(x).max() + 1e-9)

D = [146.8, 220.0, 293.7, 370.0, 440.0, 659.3]      # D major add9 (sunny)
Dm = [73.4, 110.0, 146.8, 174.6, 220.0]
# sunny intro
w = waves(T_DARK + 0.1, rng); m.add(0, fade(w, 0.4, 0.05), gain=0.26, rev=0.15)
p = pad(D, T_GONE + 0.2, rng, cutoff=2800, attack=0.8, release=0.15); m.add(0, p, gain=0.15, rev=0.6)
for i, (tm, f) in enumerate([(0.2, 587.3), (0.8, 740.0), (1.4, 880.0), (2.4, 1174.7)]):
    m.add(tm, bell(f, rng, 2.5), gain=0.06, pan=-0.4 + 0.27 * i, rev=0.8)
# the Sun vanishes: a soft inverted 'whump' (no sound would travel, so keep it musical), then a held breath
m.add(T_GONE - 0.6, whoosh(rng, 0.8, 4000, 300, 0.7), gain=0.25, rev=0.5)
m.add(T_GONE, boom(rng, 3.0, 55, 30, 1.2, 0.1, 0.3), gain=0.45, rev=0.6)
# suspense while the last light travels: clock ticks speeding with the time-lapse + rising drone
tk, gap = T_GONE + 0.8, 1.0
while tk < T_DARK - 0.2:
    m.add(tk, tick(rng, 0.6, low=False), gain=0.07, pan=0.1 * np.sin(tk * 3), rev=0.25)
    tk += gap; gap = max(0.35, gap * 0.94)
dr = drone([73.4, 110.0, 146.8], T_DARK - T_GONE, rng, cutoff=420, lfo=0.08)
env = np.linspace(0.3, 1.0, len(dr[0])) ** 1.6
m.add(T_GONE + 0.3, (dr[0] * env, dr[1] * env), gain=0.22, rev=0.3)
rr = riser(rng, 4.0, 200, 5000, 1.5); m.add(T_DARK - 4.0, fade(rr, 0.8, 0.02), gain=0.26, rev=0.3)
# darkness: everything drops to a cold, sparse bed
m.add(T_DARK, boom(rng, 4.0, 50, 25, 1.6, 0.0, 0.2), gain=0.55, rev=0.6)
cold = pad(Dm, 45.5 - T_DARK - 0.3, rng, cutoff=900, attack=3.0, release=1.5)
m.add(T_DARK + 0.3, cold, gain=0.12, rev=0.9)
wnd = wind(rng, 45.5 - T_DARK, 200, 1600, 0.09, 0.6)
lvl = np.interp(np.arange(len(wnd)) / SR, [0, 9, 13, 19, 26.3], [0.2, 0.5, 0.9, 0.6, 0.0])
m.add(T_DARK, wnd * lvl, gain=0.22, rev=0.4)
for i, f in enumerate([880.0, 698.5, 587.3, 523.3, 440.0, 349.2, 293.7]):
    m.add(T_DARK + 2.5 + i * 3.4, bell(f, rng, 3.5), gain=0.04, pan=0.4 * np.sin(i), rev=1.0)
# freezing: ice creaks
for i in range(14):
    tm = rng.uniform(31.8, 38.2)
    cr = bp(rng.standard_normal(int(0.4 * SR)), 300, 2500) * np.exp(-tt(0.4) * 9) * np.sin(2 * np.pi * rng.uniform(80, 200) * tt(0.4))
    m.add(tm, cr / np.abs(cr).max(), gain=0.12, pan=rng.uniform(-0.7, 0.7), rev=0.7)
# underwater / vent: muffled rumble + bubbles
uw = lp(noise(7.2, rng, 'brown'), 220) * adsr(int(7.2 * SR), 0.8, 0.5, 0.8, 1.0)
m.add(38.3, uw / np.abs(uw).max(), gain=0.3, rev=0.5)
for i in range(30):
    tm = rng.uniform(42.0, 45.3); f0 = rng.uniform(300, 900); d = 0.08
    b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2 * tt(d) / d)) / SR) * np.exp(-tt(d) * 40)
    m.add(tm, b, gain=0.05, pan=rng.uniform(-0.5, 0.5), rev=0.6)
# the real Sun: warmth returns
w2 = waves(DUR - 45.5, rng); m.add(45.5, fade(w2, 0.6, 1.0), gain=0.24, rev=0.15)
p2 = pad(D, DUR - 45.5, rng, cutoff=3000, attack=1.0, release=1.5); m.add(45.5, p2, gain=0.17, rev=0.6)
for i, f in enumerate([587.3, 740.0, 880.0, 1174.7, 1480.0]):
    m.add(48.7 + i * 0.5, bell(f, rng, 3.0), gain=0.06, pan=-0.5 + 0.25 * i, rev=0.9)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep06.wav'
m.render(out, rev_time=2.6, target_rms_db=-17.5)
print('wrote', out)
