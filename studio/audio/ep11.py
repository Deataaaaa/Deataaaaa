"""Soundtrack for post 5 (What if every radioactive atom decayed at once?). Cue times match episodes/ep11cams.js (T).

The hook: a hit, the electric hum of the blue sea, Apple purring through it -> calm Guarapari at dusk: surf, wind, gulls,
a music-box motif over a mid-range drone, a Geiger counter crackling (the sand is 100x normal) and ticks that speed up
toward zero, a riser -> the decay: a huge hit and a bright electric shimmer; time slowed a billion times: a frozen deep
drone with a glassy high tone; the hand spinner's whirr, the only sound still running at normal speed -> the sand heats
(micro-seconds): a sizzling rumble that grows, a riser into the white-out -> the coast (milliseconds): a wall of roar,
deep booms, crackle, the hiss of the sea boiling, a riser -> space: a hit, a vast drone, the roar far away, the spinner
again -> Goiania 1987: near silence, a hum, an eerie glassy tone, Geiger clicks that speed up -> the end card: hush, the
motif once more, the last clicks."""
import sys
import numpy as np
from synth import *

DUR = 68.0
T = dict(HOOK=3.6, T0=10.6, BANANA=17.2, SAND=20.0, US=20.4, MS=25.2, WHITE=25.9, ERUPT=26.8, SPACE=38.0, GOI=50.0, END=62.0)
m = Mix(DUR, seed=11)
rng = np.random.default_rng(111)


def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)


def click(r, bright=1.0):
    d = 0.006; t = tt(d)
    x = r.standard_normal(len(t)) * np.exp(-t * 900) + 0.4 * np.sin(2 * np.pi * r.uniform(2400, 3400) * t) * np.exp(-t * 600)
    return norm(hp(x, 900 + 600 * bright))


def geiger(t0, t1, rate0, rate1, gain, seed, pan=0.0):
    r = np.random.default_rng(seed); t = t0
    while t < t1:
        k = (t - t0) / max(t1 - t0, 1e-6); rate = rate0 + (rate1 - rate0) * k
        m.add(t, click(r), gain=gain * r.uniform(0.6, 1.0), pan=pan + r.uniform(-0.15, 0.15), rev=0.06)
        t += r.exponential(1.0 / rate)


def surf(dur, r, period=7.0):
    n = noise(dur, r, 'pink'); t = tt(dur)
    sw = 0.35 + 0.65 * np.clip(np.sin(2 * np.pi * t / period) * 0.5 + 0.5, 0, 1) ** 3
    return norm(sweep_filter(n, 500 + 1600 * sw, 'lowpass')) * sw


def gull(r):
    d = r.uniform(0.35, 0.6); t = tt(d)
    f = np.interp(t, [0, 0.12 * d, 0.45 * d, d], [1300, 2300, 1900, 1200]) * (1 + 0.02 * np.sin(2 * np.pi * 30 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    return bp(x * np.sin(np.pi * t / d) ** 1.5, 800, 5000)


def purr(dur, r):
    t = tt(dur); n = bp(noise(dur, r, 'pink'), 90, 700)
    am = (0.5 + 0.5 * np.sin(2 * np.pi * 26 * t)) ** 2
    breath = 0.45 + 0.55 * np.clip(np.sin(2 * np.pi * t / 1.3), 0, 1) ** 0.7
    return norm(n * am * breath)


def whirr(dur, r, rps=2.2):
    t = tt(dur); lobes = 3 * rps
    hiss = bp(noise(dur, r, 'white'), 2200, 7000) * (0.7 + 0.3 * np.sin(2 * np.pi * lobes * t))
    hum = np.sin(2 * np.pi * 410 * t + 0.6 * np.sin(2 * np.pi * lobes * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * lobes * t))
    return norm(0.6 * norm(hiss) + 0.4 * hum)


def shimmer(freqs, dur, r, beat=0.7):
    t = tt(dur); x = np.zeros_like(t)
    for i, f in enumerate(freqs): x += np.sin(2 * np.pi * f * t + i) * (0.6 + 0.4 * np.sin(2 * np.pi * beat * (i + 1) * 0.37 * t + i))
    return norm(x)


tl = tt(DUR)

# ---------- calm Guarapari at dusk (3.6 -> 10.6) ----------
C0, C1 = T['HOOK'], T['T0']
dC = C1 - C0
m.add(C0, fade(surf(dC, rng), 0.3, 0.05), gain=0.14, rev=0.3)
m.add(C0, fade(norm(wind(rng, dC, 200, 1100, 0.2, 0.4)), 0.4, 0.05), gain=0.04, rev=0.2)
city = bp(noise(dC, rng, 'pink'), 250, 1500) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * tt(dC)))
m.add(C0, fade(norm(city), 0.5, 0.05), gain=0.02, pan=-0.3, rev=0.4)
gr = np.random.default_rng(5)
for tg in [C0 + 0.6, C0 + 2.9, C0 + 3.3, C0 + 5.4]: m.add(tg, gull(gr), gain=0.03, pan=gr.uniform(-0.7, 0.7), rev=0.5)
dr = drone([196.0, 293.66, 392.0, 440.0], dC + 0.3, rng, cutoff=1300, lfo=0.06)          # G sus2, mid-range for phones
m.add(C0, (fade(dr[0], 0.8, 0.1), fade(dr[1], 0.8, 0.1)), gain=0.055, rev=0.4)
motif = [79, 83, 86, 84, 83, 79, 78, 79, 74]
for j, nn in enumerate(motif):
    tj = C0 + 0.35 + j * 0.7
    if tj < C1 - 0.2: m.add(tj, bell(midi(nn), rng, 1.8), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.6)
geiger(C0, C1 - 0.1, 2.0, 9.0, 0.05, 31, pan=0.25)                          # the sand: up to 100x normal radiation
tk = 0.0                                                                    # ticks speeding up toward zero (from frame 1)
while tk < C1 - 0.05:
    rem = C1 - tk
    m.add(tk, tick(rng, 1.0 + (rem < 3) * 0.4), gain=0.06 if tk >= C0 else 0.04, pan=-0.1, rev=0.1)
    tk += 1.0 if rem > 6 else 0.5 if rem > 3 else 0.25 if rem > 1.2 else 0.12
m.add(C1 - 2.4, riser(rng, 2.4, 300, 6000, 2.2), gain=0.22, rev=0.3)
m.add(C1 - 1.0, norm(sweep_filter(noise(1.0, rng, 'pink'), np.linspace(2000, 120, int(SR * 1.0)), 'lowpass')) * np.linspace(0.2, 1, int(SR * 1.0)), gain=0.12)

# ---------- the decay (10.6): hit + electric shimmer; time slowed a billion times ----------
m.add(C1, boom(rng, 4.5, 70, 22, 1.8, 0.9, 1.0), gain=1.1, rev=0.45)
zap = bp(noise(1.2, rng, 'white'), 1500, 11000) * np.exp(-tt(1.2) * 4.0)
m.add(C1, norm(zap), gain=0.5, rev=0.4)
blue = shimmer([1318.5, 1975.5, 2637.0, 3951.1], T['US'] - C1 + 0.6, rng, 0.9)        # the blue glow: a glassy high hum
benv = env_at(tt(T['US'] - C1 + 0.6), [0, 0.05, 1.0, T['US'] - C1 - 0.8, T['US'] - C1 + 0.6], [0, 1, 0.55, 0.45, 0])
m.add(C1, blue * benv, gain=0.07, rev=0.6)
F0, F1 = C1, T['ERUPT']
dF = F1 - F0
fz = drone([49.0, 73.42, 98.0, 146.83], dF + 0.4, rng, cutoff=750, lfo=0.04)
fenv = env_at(tt(dF + 0.4), [0, 0.6, T['US'] - F0, T['MS'] - F0, dF - 0.3, dF + 0.4], [0, 0.75, 0.6, 0.9, 1.0, 0.0])
m.add(F0, (fz[0] * fenv, fz[1] * fenv), gain=0.22, rev=0.35)
# the hand spinner: the only thing still running at normal speed (heard whenever it is close in shot)
for (a, b, g) in [(C1 + 0.4, C1 + 3.0, 0.035), (T['BANANA'] + 1.0, T['ERUPT'] - 1.2, 0.07)]:
    m.add(a, fade(whirr(b - a, rng), 0.5, 0.6), gain=g, pan=0.25, rev=0.15)
m.add(T['BANANA'] + 0.15, bell(midi(91), rng, 1.6), gain=0.05, rev=0.6)                 # the banana glinting blue
# the sand heats (micro-seconds): a sizzling rumble that grows, crackles, a riser into the white-out
sd = T['ERUPT'] - T['US']
siz = bp(noise(sd, rng, 'white'), 1800, 9000) * env_at(tt(sd), [0, 1.5, sd - 2.5, sd - 0.4, sd], [0, 0.3, 0.7, 1.0, 0.2])
m.add(T['US'], norm(siz), gain=0.06, rev=0.3)
rum = lp(noise(sd, rng, 'brown'), 500) * env_at(tt(sd), [0, sd - 3.0, sd - 0.5, sd], [0.05, 0.4, 1.0, 0.3])
m.add(T['US'], norm(rum), gain=0.45, rev=0.3)
cr = np.random.default_rng(12); tc = T['US'] + 0.5
while tc < T['ERUPT'] - 0.3:
    d = cr.uniform(0.04, 0.14); x = bp(cr.standard_normal(int(d * SR)), 800, 6000) * np.exp(-tt(d) * cr.uniform(20, 50))
    m.add(tc, norm(x), gain=cr.uniform(0.02, 0.05) * min(1, (tc - T['US']) / 2.5), pan=cr.uniform(-0.7, 0.7), rev=0.3)
    tc += cr.uniform(0.05, 0.25) * max(0.3, (T['ERUPT'] - tc) / sd)
m.add(T['MS'] - 0.2, boom(rng, 2.5, 60, 28, 1.2, 0.4, 0.8), gain=0.45, rev=0.4)
m.add(T['ERUPT'] - 2.2, riser(rng, 2.2, 250, 7500, 2.4), gain=0.28, rev=0.3)

# ---------- the coast (26.8 -> 38): a wall of roar, deep booms, crackle, the sea boiling ----------
K0, K1 = T['ERUPT'], T['SPACE']
kd = K1 - K0 + 0.4
m.add(K0, boom(np.random.default_rng(271), 5.5, 46, 18, 2.4, 1.0, 1.0), gain=1.0, rev=0.5)
r1 = lp(noise(kd, rng, 'brown'), 950); r2 = lp(noise(kd, np.random.default_rng(102), 'brown'), 950)
renv = env_at(tt(kd), [0, 0.05, 3.0, kd - 1.2, kd - 0.3, kd], [0, 1.0, 0.75, 0.9, 1.0, 0])
m.add(K0, (norm(r1) * renv, norm(r2) * renv), gain=0.62, rev=0.35)
for k, tb in enumerate([28.6, 30.9, 33.4, 35.8]): m.add(tb, boom(np.random.default_rng(400 + k), 3.0, 52, 24, 1.5, 0.5, 0.9), gain=0.45, pan=0.3 * np.sin(k), rev=0.5)
for k in range(46):
    tk = K0 + 0.5 + (K1 - K0 - 1.0) * (k / 46)
    m.add(tk, norm(bp(noise(0.12, rng, 'white'), 600, 5000) * np.exp(-tt(0.12) * 30)), gain=0.04 + 0.03 * np.sin(k * 0.7) ** 2, pan=rng.uniform(-0.8, 0.8), rev=0.3)
hs = bp(noise(K1 - 33.0, rng, 'white'), 1500, 9000) * env_at(tt(K1 - 33.0), [0, 1.2, K1 - 33.6, K1 - 33.0], [0, 0.8, 1.0, 0.3])
m.add(33.0, norm(hs), gain=0.08, rev=0.3)                                                  # the sea hissing into steam
m.add(K1 - 2.6, riser(rng, 2.6, 200, 7000, 2.5), gain=0.25, rev=0.3)

# ---------- space (38 -> 50): a hit, a vast drone, the roar far away, the spinner ----------
S0, S1 = T['SPACE'], T['GOI']
m.add(S0, boom(rng, 5.0, 55, 20, 2.2, 0.6, 1.0), gain=1.0, rev=0.5)
sdur = S1 - S0 + 0.4
sp = drone([41.2, 61.74, 82.41, 123.47], sdur, rng, cutoff=650, lfo=0.05)
senv = env_at(tt(sdur), [0, 0.5, sdur - 1.0, sdur], [0, 1, 0.9, 0])
m.add(S0, (sp[0] * senv, sp[1] * senv), gain=0.26, rev=0.4)
sp2 = pad([220.0, 261.63, 329.63, 392.0], sdur, rng, cutoff=1500, attack=2.5, release=1.0, voices=2, harmonics=8)
m.add(S0, (sp2[0] * senv, sp2[1] * senv), gain=0.06, rev=0.6)
m.add(S0, norm(lp(noise(sdur, rng, 'brown'), 400)) * senv, gain=0.2, rev=0.5)
m.add(S0 + 1.5, whoosh(rng, 3.5, 150, 900, 0.5), gain=0.18, rev=0.6)
m.add(S0 + 6.0, whoosh(rng, 3.0, 120, 700, 0.5), gain=0.14, rev=0.6)
m.add(S0 + 0.6, fade(whirr(S1 - S0 - 1.2, rng), 1.0, 1.0), gain=0.04, pan=0.35, rev=0.2)
m.add(41.9, bell(midi(86), rng, 2.6), gain=0.06, rev=0.8)
m.add(45.7, thud(rng, 44, 1.2), gain=0.35, rev=0.6)
m.add(S1 - 1.4, riser(rng, 1.4, 300, 4000, 2.0), gain=0.12, rev=0.3)

# ---------- Goiania 1987 (50 -> 62): a hum, an eerie glassy tone, Geiger clicks speeding up ----------
G0, G1 = T['GOI'], T['END']
gd = G1 - G0
m.add(G0, thud(rng, 40, 1.4), gain=0.45, rev=0.6)
hum = (np.sin(2 * np.pi * 120 * tt(gd)) + 0.4 * np.sin(2 * np.pi * 240 * tt(gd))) * env_at(tt(gd), [0, 0.8, gd - 0.8, gd], [0, 1, 1, 0])
m.add(G0, hum, gain=0.012, rev=0.2)
gl = shimmer([987.8, 1318.5, 1760.0], gd, rng, 0.5) * env_at(tt(gd), [0, 2.0, gd - 1.0, gd], [0, 0.8, 1.0, 0])
m.add(G0, gl, gain=0.04, rev=0.7)
gp = pad([110.0, 130.81, 164.81, 196.0], gd, rng, cutoff=900, attack=2.0, release=1.0, voices=2, harmonics=8)
m.add(G0, (fade(gp[0], 1.5, 0.8), fade(gp[1], 1.5, 0.8)), gain=0.07, rev=0.6)
geiger(G0 + 0.4, G1 - 0.2, 3.0, 22.0, 0.07, 77, pan=-0.2)
for j, nn in enumerate([69, 72, 76, 74, 72, 69, 67, 64]): m.add(G0 + 1.2 + j * 1.35, bell(midi(nn), rng, 2.0), gain=0.035, pan=0.2 * np.sin(j), rev=0.7)
m.add(57.9, thud(rng, 46, 1.0), gain=0.25, rev=0.6)

# ---------- end card (62 -> 68): hush, the motif once more, the last clicks ----------
ep_ = pad([196.0, 293.66, 392.0, 440.0], DUR - G1 + 0.1, rng, cutoff=1500, attack=1.0, release=2.0, voices=2, harmonics=10)
m.add(G1, (fade(ep_[0], 0.8, 2.2), fade(ep_[1], 0.8, 2.2)), gain=0.08, rev=0.6)
for j, nn in enumerate(motif[:6]): m.add(G1 + 0.5 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)
geiger(G1, G1 + 2.6, 6.0, 1.0, 0.04, 78, pan=-0.2)

# ---------- the hook (0 -> 3.6): hit, the electric hum of the blue sea, Apple purring ----------
hr = np.random.default_rng(97); th = tt(T['HOOK'])
m.add(0.0, boom(hr, 3.6, 52, 22, 2.0, 0.8, 1.0), gain=1.0, rev=0.4)
hb = shimmer([1318.5, 1975.5, 2637.0, 3951.1], T['HOOK'], hr, 0.9) * env_at(th, [0, 0.02, 3.3, 3.6], [0, 1, 0.8, 0])
m.add(0.0, hb, gain=0.07, rev=0.6)
hp_ = pad([49.0, 73.42, 98.0], T['HOOK'], hr, cutoff=600, attack=0.05, release=0.2, voices=2, harmonics=8)
m.add(0.0, (fade(hp_[0], 0.02, 0.15), fade(hp_[1], 0.02, 0.15)), gain=0.22, rev=0.3)
hro = lp(noise(T['HOOK'], hr, 'brown'), 700) * env_at(th, [0, 0.03, 3.3, 3.6], [0, 1, 0.6, 0])
m.add(0.0, norm(hro), gain=0.3, rev=0.3)
m.add(0.5, fade(purr(2.9, hr), 0.3, 0.3), gain=0.16, pan=-0.1, rev=0.15)               # Apple, unbothered
m.add(0.05, bell(midi(88), hr, 3.0), gain=0.08, rev=0.7)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep11.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
print('wrote', out)
