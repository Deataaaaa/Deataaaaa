"""Soundtrack for EP02 (falling into Sagittarius A*). Cue times match episodes/ep02.js."""
import sys
import numpy as np
from synth import *

T_CROSS = 23.8
T_LEFT = 28.2
SLOW = 25
T_SLOW = T_CROSS + T_LEFT - 0.1
T_END = T_SLOW + 0.1 * SLOW
DUR = T_END + 4.4
m = Mix(DUR, seed=21)
rng = np.random.default_rng(8)

# minor-ish space chords
Dm = [73.4, 110.0, 146.8, 174.6, 220.0, 329.6]
Bb = [58.3, 87.3, 116.5, 146.8, 174.6, 233.1]

# --- approach: deep drone + shimmer, building ---
d = drone([36.7, 55.0, 73.4, 110.0], T_CROSS + 0.3, rng, cutoff=420, lfo=0.05)
m.add(0.0, (fade(d[0], 2.5, 0.08), fade(d[1], 2.5, 0.08)), gain=0.3, rev=0.4)
pz = pad(Dm, T_CROSS + 0.3, rng, cutoff=2200, attack=3.0, release=0.08)
m.add(0.0, (fade(pz[0], 0, 0.08), fade(pz[1], 0, 0.08)), gain=0.12, rev=0.8)
for i, (tm, f) in enumerate([(0.2, 587.3), (0.9, 880.0), (1.6, 1174.7), (2.7, 1760.0)]):
    m.add(tm, bell(f, rng, 3.0), gain=0.05, pan=-0.4 + 0.27 * i, rev=0.9)
# sparkles
for k in range(60):
    tm = rng.uniform(0.5, T_CROSS - 1.0)
    m.add(tm, bell(rng.choice([1760, 2093, 2637, 3136]), rng, 1.2), gain=0.012, pan=rng.uniform(-0.8, 0.8), rev=1.0)
# gravitational pulse (sub throb) speeding up as we fall
tp, gap = 4.0, 2.4
while tp < T_CROSS - 0.4:
    m.add(tp, thud(rng, 42, 1.0), gain=0.32, rev=0.2)
    tp += gap; gap = max(0.55, gap * 0.9)
# rising tension into the horizon
rr = riser(rng, 8.0, 120, 5200, 1.8)
m.add(T_CROSS - 8.05, fade(rr, 2.0, 0.04), gain=0.3, rev=0.4)
rum = lp(noise(9.0, rng, 'brown'), 200) * np.linspace(0, 1, int(9.0 * SR)) ** 2
m.add(T_CROSS - 9.0, fade(rum / np.abs(rum).max(), 0, 0.05), gain=0.4)
# transition whooshes on the camera moves
for c in [3.4, 14.5]:
    m.add(c - 0.7, whoosh(rng, 1.6, 200, 1800, 0.55), gain=0.18, rev=0.4)

# --- crossing: everything drops away. near-silence, thin tone, heartbeat, clock ---
thin = np.sin(2 * np.pi * 1318.5 * tt(10.6)) * adsr(int(10.6 * SR), 0.6, 1.0, 0.6, 2.0) * 0.6
m.add(T_CROSS, thin, gain=0.035, rev=0.9)
low = pad(Bb, DUR - T_CROSS, rng, cutoff=900, attack=4.0, release=1.0)
m.add(T_CROSS + 0.5, (fade(low[0], 0, 2.0), fade(low[1], 0, 2.0)), gain=0.13, rev=0.7)
# heartbeat, slow then faster near the end
hb, gap = T_CROSS + 1.2, 1.25
while hb < T_SLOW - 0.2:
    m.add(hb, heartbeat(rng), gain=0.5, rev=0.1)
    hb += gap; gap = max(0.42, gap * 0.975)
# clock ticks on each real second left
for k in range(1, 28):
    tk = T_CROSS + k
    if tk >= T_SLOW: break
    late = tk > 43.6
    muff = 34.4 < tk < 43.6
    s = tick(rng, 0.8, low=late)
    if muff: s = lp(s, 1200)
    m.add(tk, s, gain=0.07 + (0.08 if late else 0) + 0.002 * k, pan=0.12 * (-1) ** k, rev=0.35)
# friends' view: distant, sad bell motif
for i, f in enumerate([440.0, 349.2, 293.7, 261.6, 220.0]):
    m.add(34.6 + i * 1.7, bell(f, rng, 4.0), gain=0.06, pan=0.3 * np.sin(i), rev=1.0)
# tension builds toward the end
rr2 = riser(rng, 8.0, 90, 3000, 1.5)
m.add(T_SLOW - 8.0, fade(rr2, 1.5, 0.05), gain=0.28, rev=0.3)
rum2 = lp(noise(8.3, rng, 'brown'), 160) * np.linspace(0, 1, int(8.3 * SR)) ** 1.5
m.add(T_SLOW - 8.3, rum2 / np.abs(rum2).max(), gain=0.35)

# --- slow-motion final tenth: stretching groan, then sudden silence ---
sl = T_END - T_SLOW
g = groan(rng, sl + 0.2, 70)
m.add(T_SLOW, fade(g, 0.1, 0.05), gain=0.5, rev=0.5)
whine_f = 300 * (6 ** (np.linspace(0, 1, int(sl * SR)) ** 2))
whine = np.sin(2 * np.pi * np.cumsum(whine_f) / SR) * np.linspace(0.2, 1, len(whine_f))
m.add(T_SLOW, fade(whine, 0.2, 0.03), gain=0.12, rev=0.4)
m.add(T_SLOW, boom(rng, 3.0, 50, 20, 2.0, 0.2, 0.3)[: int(sl * SR)], gain=0.6)
# (silence from T_END until the end card)

# --- end card pad (loops into the intro drone) ---
pe = pad(Dm, DUR - (T_END + 0.4), rng, cutoff=1800, attack=1.0, release=0.3)
m.add(T_END + 0.4, pe, gain=0.18, rev=0.6)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep02.wav'
m.render(out, rev_time=3.2, target_rms_db=-18.0)
print('wrote', out, DUR)
