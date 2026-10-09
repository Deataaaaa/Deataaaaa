"""Soundtrack for post 4 (What if light became instant for 5 seconds?). Cue times match episodes/ep10.js (T).

The hook: the white-hot sky over the tower, a roar and a hit -> calm Paris: wind, birds, a murmur of picnics, a
music-box motif over a mid-range drone, ticks that speed up toward zero, a riser -> the flash: a huge hit, then a
ringing in the ears; time slowed 1,000x: a deep frozen drone, slowed crackles of the grass catching fire -> the stars:
a glassy shimmer -> the invisible light: silence, then the hiss of the Big Bang growing into the roar of the air
igniting, a riser into the cut -> space: the roar far away, the planet's air leaving -> the black Sun: near silence, a
heartbeat, fast ticks of the 8-minute timer, the Sun's return as a bright swell -> 1964: the hiss in the horn antenna,
pigeons, a reveal chord -> the end card: hush and the motif again."""
import sys
import numpy as np
from synth import *

DUR = 75.0
T = dict(HOOK=3.6, T0=10.6, STARS=17.6, BIG=21.0, AIR=24.7, KT=27.8, MELT=32.5, SPACE=38.6, REAL=41.5, NORMAL=46.5, DARK=46.7, SUNBACK=56.6, REC=57.0, END=69.2)
m = Mix(DUR, seed=10)
rng = np.random.default_rng(100)


def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)


tl = tt(DUR)

# ---------- calm Paris (3.6 -> 10.6): wind, birds, picnic murmur ----------
C0, C1 = T['HOOK'], T['T0']
dC = C1 - C0
w = wind(rng, dC, 200, 1200, 0.2, 0.4)
m.add(C0, fade(norm(w), 0.3, 0.05), gain=0.05, rev=0.2)
mur = bp(noise(dC, rng, 'pink'), 280, 1900) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.35 * tt(dC)) * np.sin(2 * np.pi * 0.13 * tt(dC) + 1))
m.add(C0, fade(norm(mur), 0.4, 0.05), gain=0.035, pan=0.1, rev=0.3)


def chirp(r):
    d = r.uniform(0.06, 0.16); t = tt(d); f0 = r.uniform(2600, 4200); f1 = f0 * r.uniform(1.15, 1.6)
    ph = 2 * np.pi * np.cumsum(np.interp(t, [0, d], [f0, f1])) / SR
    return np.sin(ph + 2.5 * np.sin(2 * np.pi * 38 * t)) * np.sin(np.pi * t / d) ** 2


br = np.random.default_rng(7)
tb = C0 + 0.2
while tb < C1 - 0.3:
    for k in range(br.integers(2, 5)): m.add(tb + k * br.uniform(0.08, 0.14), chirp(br), gain=0.025, pan=br.uniform(-0.8, 0.8), rev=0.35)
    tb += br.uniform(0.7, 1.6)

# music: a mid-range drone (audible on phones) and a music-box motif (A minor add9)
dr = drone([220.0, 329.63, 440.0, 493.88], dC + 0.3, rng, cutoff=1400, lfo=0.06)
m.add(C0, (fade(dr[0], 0.8, 0.1), fade(dr[1], 0.8, 0.1)), gain=0.055, rev=0.4)
motif = [81, 84, 88, 86, 84, 81, 79, 81, 76]
for j, nn in enumerate(motif):
    tj = C0 + 0.35 + j * 0.7
    if tj < C1 - 0.2: m.add(tj, bell(midi(nn), rng, 1.8), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.6)
# ticks speeding up toward zero (from frame 1)
tk = 0.0
while tk < C1 - 0.05:
    rem = C1 - tk
    m.add(tk, tick(rng, 1.0 + (rem < 3) * 0.4), gain=0.06 if tk >= C0 else 0.045, pan=0.15, rev=0.1)
    tk += 1.0 if rem > 6 else 0.5 if rem > 3 else 0.25 if rem > 1.2 else 0.12
m.add(C1 - 2.4, riser(rng, 2.4, 300, 6000, 2.2), gain=0.22, rev=0.3)
m.add(C1 - 1.0, norm(sweep_filter(noise(1.0, rng, 'pink'), np.linspace(2000, 120, int(SR * 1.0)), 'lowpass')) * np.linspace(0.2, 1, int(SR * 1.0)), gain=0.12)

# ---------- the flash (10.6): hit + ringing ears; then frozen time ----------
m.add(C1, boom(rng, 4.5, 70, 22, 1.8, 0.9, 1.0), gain=1.1, rev=0.45)
blast = bp(noise(1.6, rng, 'white'), 200, 9000) * np.exp(-tt(1.6) * 2.8)
m.add(C1, norm(blast), gain=0.7, rev=0.4)
ring = np.sin(2 * np.pi * 5200 * tt(7.0)) * np.exp(-tt(7.0) * 0.45) * np.minimum(1, tt(7.0) * 40)
m.add(C1 + 0.05, ring, gain=0.035)
F0, F1 = C1, T['SPACE']
dF = F1 - F0
fz = drone([55.0, 82.41, 110.0, 164.81], dF + 0.5, rng, cutoff=700, lfo=0.04)
fenv = env_at(tt(dF + 0.5), [0, 0.6, T['BIG'] - F0 - 0.4, T['BIG'] - F0, T['AIR'] - F0, dF, dF + 0.5], [0, 0.8, 0.8, 0.15, 0.4, 1.0, 0.3])
m.add(F0, (fz[0] * fenv, fz[1] * fenv), gain=0.22, rev=0.35)
# slowed crackles: the grass catching fire, a thousand times slower (low, sparse thuds and ticks)
cr = np.random.default_rng(12)
tc = F0 + 0.8
while tc < T['BIG'] + 0.5:
    d = cr.uniform(0.08, 0.3); x = lp(cr.standard_normal(int(d * SR)), cr.uniform(300, 900)) * np.exp(-tt(d) * cr.uniform(8, 20))
    m.add(tc, norm(x), gain=cr.uniform(0.02, 0.06) * min(1, (tc - F0) / 3), pan=cr.uniform(-0.7, 0.7), rev=0.4)
    tc += cr.uniform(0.12, 0.45)
# the stars: a glassy shimmer swell
for k in range(12):
    m.add(T['STARS'] + k * 0.06, bell(midi([88, 91, 95, 93, 100, 98][k % 6]), rng, 2.4), gain=0.045, pan=np.sin(k * 1.1) * 0.7, rev=0.8)
m.add(T['STARS'] - 0.3, whoosh(rng, 1.2, 800, 6000, 0.3), gain=0.12, rev=0.4)
# "the deadliest light is invisible": a drop to almost nothing, then the hiss of the Big Bang grows into the roar
m.add(T['BIG'], thud(rng, 48, 1.2), gain=0.4, rev=0.5)
hd = T['SPACE'] - T['AIR'] + 0.5
hiss = noise(hd, rng, 'pink')
henv = env_at(tt(hd), [0, 3.0, T['KT'] - T['AIR'], T['SPACE'] - T['AIR'], hd], [0, 0.35, 0.55, 1.0, 0.0])
hcut = 1500 + 5000 * henv
m.add(T['AIR'], norm(sweep_filter(hiss, hcut, 'lowpass')) * henv, gain=0.2, rev=0.2)
roar1 = lp(noise(hd, rng, 'brown'), 900); roar2 = lp(noise(hd, np.random.default_rng(101), 'brown'), 900)
renv = env_at(tt(hd), [0, T['KT'] - T['AIR'], T['MELT'] - T['AIR'], T['SPACE'] - T['AIR'] - 0.2, hd], [0, 0.25, 0.7, 1.0, 0])
m.add(T['AIR'], (norm(roar1) * renv, norm(roar2) * renv), gain=0.6, rev=0.3)
m.add(T['KT'], boom(rng, 3.0, 60, 25, 1.4, 0.5, 0.9), gain=0.65, rev=0.4)
for k in range(30):                                     # crackle of everything igniting, denser toward the cut
    tk = T['KT'] + (T['SPACE'] - T['KT']) * (k / 30) ** 0.7
    m.add(tk, norm(bp(noise(0.12, rng, 'white'), 600, 5000) * np.exp(-tt(0.12) * 30)), gain=0.05 + 0.05 * k / 30, pan=rng.uniform(-0.8, 0.8), rev=0.3)
m.add(T['SPACE'] - 3.0, riser(rng, 3.0, 200, 7000, 2.5), gain=0.25, rev=0.3)

# ---------- space (38.6 -> 46.5): the hit, the roar far away, the air leaving ----------
m.add(T['SPACE'], boom(rng, 5.0, 55, 20, 2.2, 0.6, 1.0), gain=1.0, rev=0.5)
sd = T['NORMAL'] - T['SPACE'] + 0.4
sp = drone([41.2, 61.74, 82.41, 123.47], sd, rng, cutoff=600, lfo=0.05)
senv = env_at(tt(sd), [0, 0.5, sd - 0.6, sd], [0, 1, 0.9, 0])
m.add(T['SPACE'], (sp[0] * senv, sp[1] * senv), gain=0.26, rev=0.4)
far = lp(noise(sd, rng, 'brown'), 400) * senv
m.add(T['SPACE'], norm(far), gain=0.2, rev=0.5)
m.add(T['SPACE'] + 1.5, whoosh(rng, 3.5, 150, 900, 0.5), gain=0.2, rev=0.6)
m.add(T['SPACE'] + 5.5, whoosh(rng, 3.0, 120, 700, 0.5), gain=0.16, rev=0.6)

# ---------- the black Sun (46.5 -> 56.6): near silence, a heartbeat, the fast ticks of the 8-minute timer ----------
m.add(T['NORMAL'], thud(rng, 40, 1.4), gain=0.5, rev=0.6)
bd = T['SUNBACK'] - T['DARK'] + 0.3
bp_ = pad([110.0, 130.81, 164.81, 196.0], bd, rng, cutoff=900, attack=1.2, release=0.6, voices=2, harmonics=8)
m.add(T['DARK'], (fade(bp_[0], 1.0, 0.3), fade(bp_[1], 1.0, 0.3)), gain=0.08, rev=0.6)
for k in range(int(bd / 0.95)): m.add(T['DARK'] + 0.6 + k * 0.95, heartbeat(rng), gain=0.22, rev=0.2)
tk = T['DARK'] + 0.3
while tk < T['SUNBACK'] - 0.05:
    m.add(tk, tick(rng, 0.8), gain=0.035, pan=-0.2, rev=0.05)
    tk += 0.18
m.add(T['SUNBACK'] - 1.8, riser(rng, 1.8, 400, 5000, 2.0), gain=0.16, rev=0.3)
sun = pad([220.0, 277.18, 329.63, 440.0], 2.6, rng, cutoff=3000, attack=0.05, release=1.8, voices=3, harmonics=12)
m.add(T['SUNBACK'], (fade(sun[0], 0.02, 1.4), fade(sun[1], 0.02, 1.4)), gain=0.22, rev=0.7)
m.add(T['SUNBACK'], bell(midi(88), rng, 2.6), gain=0.08, rev=0.8)

# ---------- 1964 (57.0 -> 69.2): the hiss in the horn antenna, pigeons, a reveal chord ----------
R0, R1 = T['REC'], T['END']
rd = R1 - R0
radio = bp(noise(rd, rng, 'white'), 600, 5200) * (0.9 + 0.1 * np.sin(2 * np.pi * 50 * tt(rd)))
renv2 = env_at(tt(rd), [0, 0.4, 4.0, 8.0, rd - 0.6, rd], [0, 0.5, 0.9, 0.7, 0.6, 0])
m.add(R0, norm(radio) * renv2, gain=0.05, rev=0.1)
rp = pad([146.83, 174.61, 220.0, 293.66], rd, rng, cutoff=1300, attack=1.5, release=1.2, voices=2, harmonics=9)
wob = 1 + 0.004 * np.sin(2 * np.pi * 0.7 * tt(rd))
rpl = np.interp(np.cumsum(wob) - 1, np.arange(len(rp[0])), rp[0]); rpr = np.interp(np.cumsum(wob) - 1, np.arange(len(rp[1])), rp[1])
m.add(R0, (fade(rpl, 1.0, 0.6), fade(rpr, 1.0, 0.6)), gain=0.08, rev=0.5)


def coo(r):
    d = 0.9; t = tt(d); f = np.interp(t, [0, 0.25, 0.5, 0.9], [330, 420, 360, 300]) * (1 + 0.04 * np.sin(2 * np.pi * 28 * t))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return lp(x * np.interp(t, [0, 0.08, 0.3, 0.45, 0.6, 0.9], [0, 1, 0.6, 1, 0.5, 0]), 1400)


for tc_, pan in [(R0 + 1.2, 0.4), (R0 + 4.6, -0.3), (R0 + 8.4, 0.5), (T['REC'] + 8.1 + 0.4, 0.2)]: m.add(tc_, coo(rng), gain=0.06, pan=pan, rev=0.3)
for j, nn in enumerate([69, 72, 76, 74, 72, 69, 67, 69]): m.add(R0 + 0.8 + j * 1.4, epiano(midi(nn), 2.0, 0.8) if 'epiano' in globals() else bell(midi(nn), rng, 1.6), gain=0.045, pan=0.2 * np.sin(j), rev=0.6)
reveal = pad([110.0, 164.81, 220.0, 277.18, 329.63], 4.0, rng, cutoff=2400, attack=0.08, release=2.0, voices=3, harmonics=12)
m.add(65.1, (fade(reveal[0], 0.05, 1.8), fade(reveal[1], 0.05, 1.8)), gain=0.16, rev=0.7)
m.add(65.1, boom(rng, 2.5, 60, 30, 1.2, 0.3, 0.8), gain=0.35, rev=0.5)

# ---------- end card (69.2 -> 75): hush, the motif once more ----------
ep_ = pad([220.0, 329.63, 440.0, 493.88], DUR - R1 + 0.1, rng, cutoff=1500, attack=1.0, release=2.0, voices=2, harmonics=10)
m.add(R1, (fade(ep_[0], 0.8, 2.2), fade(ep_[1], 0.8, 2.2)), gain=0.08, rev=0.6)
for j, nn in enumerate(motif[:6]): m.add(R1 + 0.5 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)

# ---------- the hook (0 -> 3.6): the white-hot sky, roar + hit, cut to calm ----------
hr = np.random.default_rng(97); th = tt(T['HOOK'])
m.add(0.0, boom(hr, 3.6, 50, 20, 2.0, 0.8, 1.0), gain=1.0, rev=0.4)
hro1 = lp(noise(T['HOOK'], hr, 'brown'), 1100); hro2 = lp(noise(T['HOOK'], np.random.default_rng(98), 'brown'), 1100)
henv2 = env_at(th, [0, 0.03, 3.3, 3.55, 3.6], [0, 1, 0.85, 0.2, 0])
m.add(0.0, (norm(hro1) * henv2, norm(hro2) * henv2), gain=0.6, rev=0.3)
for k in range(16): m.add(0.1 + k * 0.21, norm(bp(noise(0.12, hr, 'white'), 600, 5000) * np.exp(-tt(0.12) * 30)), gain=0.06, pan=hr.uniform(-0.8, 0.8), rev=0.3)
m.add(0.05, bell(midi(76), hr, 3.0), gain=0.1, rev=0.7)
hp_ = pad([55.0, 82.41, 110.0], T['HOOK'], hr, cutoff=600, attack=0.05, release=0.2, voices=2, harmonics=8)
m.add(0.0, (fade(hp_[0], 0.02, 0.15), fade(hp_[1], 0.02, 0.15)), gain=0.22, rev=0.3)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep10.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
print('wrote', out)
