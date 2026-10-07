"""Soundtrack for EP01 (Earth stops spinning for 1 second). Cue times match episodes/ep01.js."""
import sys
import numpy as np
from synth import *

DUR = 60.0
STOP, RESTART = 13.5, 43.5
CUTS = [3.4, 8.6, 13.5, 16.9, 20.6, 24.4, 30.2, 35.0, 39.4, 43.5, 48.6, 51.6, 56.0]
m = Mix(DUR, seed=11)
rng = np.random.default_rng(5)

A = 110.0
chordA = [A, A * 1.5, A * 2, A * 2 * 1.26, A * 3, A * 4.5]          # A2 E3 A3 C#4 E4 B4 (add9)
chordF = [87.3, 130.8, 174.6, 220.0, 261.6, 392.0]                 # Fmaj9-ish for tension

# --- intro pad (cut dead at the stop) ---
p = pad(chordA, STOP + 0.2, rng, cutoff=1500, attack=1.6, release=0.05)
p = (fade(p[0], 0.0, 0.08), fade(p[1], 0.0, 0.08))
m.add(0.0, p, gain=0.22, rev=0.5)
sub = np.sin(2 * np.pi * 55 * tt(STOP)) * adsr(int(STOP * SR), 3, 1, 0.8, 0.05)
m.add(0.0, sub, gain=0.08)
# shimmer motif on the title
for i, (tm, f) in enumerate([(0.15, 880), (0.75, 1108.7), (1.35, 1318.5), (2.6, 1760)]):
    m.add(tm, bell(f, rng, 2.5), gain=0.05, pan=(-0.4 + 0.3 * i), rev=0.8)

# --- countdown ticks ---
for n in range(13, 0, -1):
    t = STOP - n
    loud = n <= 3
    m.add(t, tick(rng, 1.0, low=loud), gain=0.10 + 0.05 * (13 - n) / 12 + (0.12 if loud else 0), pan=0.15 if n % 2 else -0.15, rev=0.25)
# heartbeat from 9.4 s, speeding up
hb_t = 9.4
gap = 0.95
while hb_t < STOP - 0.3:
    m.add(hb_t, heartbeat(rng), gain=0.55, rev=0.1)
    hb_t += gap; gap *= 0.9
# riser into the stop, with a breath of silence right before the hit
r = riser(rng, 4.3, 180, 6500, 1.6)
m.add(STOP - 4.35, fade(r, 0.5, 0.03), gain=0.33, rev=0.3)

# --- STOP impact ---
m.add(STOP, boom(rng, 5.0, 75, 26, 1.9, 0.9, 0.9), gain=1.0, rev=0.35)
m.add(STOP, thud(rng, 48, 1.2), gain=0.5)
m.add(STOP + 0.02, lp(rng.standard_normal(int(0.9 * SR)), 3000) * np.exp(-tt(0.9) * 6), gain=0.35, rev=0.6)

# --- slow-motion bed (stopped second) ---
seg = RESTART - STOP
d = drone([55, 82.4, 110, 130.8], seg + 1.0, rng, cutoff=360)
m.add(STOP + 0.3, (fade(d[0], 2.0, 0.6), fade(d[1], 2.0, 0.6)), gain=0.24, rev=0.4)
w = wind(rng, seg, 140, 950, 0.13, 0.55)
wR = wind(np.random.default_rng(9), seg, 140, 950, 0.11, 0.55)
# wind level per shot: loud in Paris, muffled in globe/kid/plane
tline = np.arange(len(w)) / SR + STOP
lvl = np.interp(tline, [STOP, STOP + 1.5, 30.0, 30.4, 34.6, 35.2, 43.0, 43.5], [0.0, 1.0, 1.0, 0.45, 0.45, 0.22, 0.22, 0.0])
cut = np.interp(tline, [STOP, 30.0, 30.4, 34.6, 35.2, 43.5], [1600, 1600, 700, 700, 380, 380])
wl = sweep_filter(w * lvl, cut, 'lowpass'); wr = sweep_filter(wR * lvl, cut, 'lowpass')
m.add(STOP, (wl, wr), gain=0.42, rev=0.2)
# transition whooshes on cuts
for c in [16.9, 20.6, 24.4, 30.2, 35.0, 39.4]:
    m.add(c - 0.9, whoosh(rng, 1.5, 250, 2200, 0.6), gain=0.22, pan=rng.uniform(-0.4, 0.4), rev=0.3)
# tumbling bodies + debris thuds (Paris shots)
for t0 in [14.4, 15.3, 17.4, 18.2, 19.1, 19.9, 25.0, 26.3, 27.7, 28.8]:
    m.add(t0, thud(rng, rng.uniform(45, 80), 0.7), gain=0.25, pan=rng.uniform(-0.6, 0.6), rev=0.3)
# tower: metal groan + tearing hits
m.add(20.6, groan(rng, 3.9, 84), gain=0.42, pan=0.1, rev=0.5)
m.add(20.75, boom(rng, 2.5, 95, 40, 0.8, 1.0, 0.5), gain=0.55, rev=0.4)
m.add(21.7, thud(rng, 70, 0.8), gain=0.45, rev=0.4)
m.add(22.6, groan(rng, 2.0, 120), gain=0.2, pan=-0.3, rev=0.6)
# globe: deep ocean surge, hit on "slams into Europe"
ocean = lp(noise(4.8, rng, 'brown'), 380) * adsr(int(4.8 * SR), 1.2, 0.5, 0.8, 1.0)
m.add(30.2, ocean / np.abs(ocean).max(), gain=0.35, rev=0.3)
m.add(32.65, boom(rng, 3.0, 60, 30, 1.2, 0.3, 0.4), gain=0.55, rev=0.5)
# kid + plane: wonder motif (A major arpeggio), soft jet air
arp = [440.0, 554.4, 659.3, 880.0, 659.3, 554.4, 740.0, 880.0, 1108.7]
for i, f in enumerate(arp):
    m.add(35.15 + i * 0.95, bell(f, rng, 3.2), gain=0.085, pan=np.sin(i) * 0.5, rev=0.9)
pd2 = pad([220, 277.2, 329.6, 440], 8.6, rng, cutoff=1800, attack=1.8, release=1.2)
m.add(35.0, pd2, gain=0.1, rev=0.7)
jet = bp(noise(4.2, rng, 'pink'), 1800, 4200) * adsr(int(4.2 * SR), 1.0, 0.5, 0.8, 1.0)
m.add(39.4, jet / np.abs(jet).max(), gain=0.05, rev=0.4)
# reverse swell into the restart
rv = riser(rng, 1.3, 400, 5000, 1.2)
m.add(RESTART - 1.32, fade(rv, 0.2, 0.02), gain=0.35, rev=0.2)

# --- RESTART impact ---
m.add(RESTART, boom(rng, 5.5, 80, 24, 2.1, 1.0, 1.0), gain=1.0, rev=0.4)
m.add(RESTART + 0.01, thud(rng, 52, 1.2), gain=0.55)
m.add(RESTART + 0.04, bp(rng.standard_normal(int(1.2 * SR)), 600, 6000) * np.exp(-tt(1.2) * 4.5), gain=0.28, rev=0.7)
af = lp(noise(8.0, rng, 'brown'), 260) * adsr(int(8.0 * SR), 0.05, 1.0, 0.5, 5.0)
m.add(RESTART, af / np.abs(af).max(), gain=0.3, rev=0.3)
for t0 in [44.3, 44.9, 45.8, 46.6, 47.5]:
    m.add(t0, thud(rng, rng.uniform(55, 95), 0.5), gain=0.16, pan=rng.uniform(-0.7, 0.7), rev=0.5)
# kid lands: soft thump + pad returns
m.add(48.6 + 1.41, thud(rng, 90, 0.4), gain=0.25, rev=0.3)
p3 = pad(chordA, 7.6, rng, cutoff=1300, attack=1.5, release=1.5)
m.add(48.6, p3, gain=0.13, rev=0.6)

# --- clock: tick, tick, tick ... and the extra (leap) second ---
for i, t0 in enumerate([51.75, 52.75, 53.75]):
    m.add(t0, woodblock(rng, 830), gain=0.32, pan=0.1 * (-1) ** i, rev=0.5)
m.add(54.75, woodblock(rng, 620), gain=0.42, rev=0.8)
m.add(54.75, bell(1760, rng, 3.0), gain=0.12, rev=0.9)

# --- end card pad (loops back into the intro) ---
p4 = pad(chordA, 4.4, rng, cutoff=1500, attack=1.2, release=0.4)
m.add(55.6, p4, gain=0.2, rev=0.5)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep01.wav'
m.render(out, rev_time=2.6, target_rms_db=-17.0)
print('wrote', out)
