"""Soundtrack for EP08 (What if your plane's window broke at 11,000 m?). Cue times match episodes/ep08.js.

Calm in-flight music over the engines -> the crack ticks -> BANG, roar of air rushing out (slow motion),
masks clatter down -> hypoxia: everything muffles, heartbeat, ringing, countdown ticks -> the mask goes on:
oxygen hiss, sound comes back -> freeze, the whole decompression plays backwards -> confident groove for the
explanation (glass clinks, the crack, the hiss of the breather hole) -> engines spool down for the dive ->
1990 on VHS -> the seatbelt chime, and the in-flight music returns so the video loops."""
import sys
import numpy as np
from synth import *

DUR = 83.4
T_CRACK, T_BRK, T_FRZ, T_REW_END = 16.3, 18.2, 39.41, 43.88
m = Mix(DUR, seed=8)
rng = np.random.default_rng(80)


def midi(n): return 440.0 * 2 ** ((n - 69) / 12)


def play_at(x, pos_s):
    idx = np.arange(len(x[0])); p = pos_s * SR
    return tuple(np.interp(p, idx, c, left=0.0, right=0.0) for c in x)


def epiano(f, dur=1.6, vel=1.0):
    t = tt(dur)
    x = np.sin(2 * np.pi * f * t) + 0.28 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3) + 0.08 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 5)
    x += 0.2 * np.sin(2 * np.pi * f * 7.1 * t) * np.exp(-t * 26)
    x *= np.exp(-t * 1.4) * np.minimum(1, t * 300) * (1 + 0.1 * np.sin(2 * np.pi * 4.3 * t))
    return x * vel / (np.abs(x).max() + 1e-9)


def ecOf(te):
    if te < T_BRK: return te - T_BRK
    if te < 21.24: return (te - T_BRK) / 6
    if te < 25.88: return (21.24 - T_BRK) / 6 + (te - 21.24) / 2
    return (21.24 - T_BRK) / 6 + (25.88 - 21.24) / 2 + (te - 25.88)


def glass_tink(rng, f=None):
    f = f or rng.uniform(2500, 6500); t = tt(0.35)
    x = sum(a * np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6)) * np.exp(-t * (18 + 10 * k)) for k, a in [(1, 1), (2.76, 0.5), (5.4, 0.25)])
    x += bp(rng.standard_normal(len(t)), 3000, 12000) * np.exp(-t * 90) * 0.4
    return x / (np.abs(x).max() + 1e-9)


# =====================================================================================
# 1) in-flight music (lo-fi Rhodes in D, 90 BPM, 8-bar loop = 21.33 s) + engine drone
# =====================================================================================
BPM = 90; beat = 60 / BPM; CYC = 32 * beat
ORIGIN = 0.15
chords = [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 66]]   # Dmaj7 Bm7 Gmaj7 A6
roots = [38, 35, 31, 33]
n_ = int(3 * CYC * SR) + SR
mL = np.zeros(n_); mR = np.zeros(n_)
def madd(t, x, g, pan=0.0):
    i = int(t * SR); k = min(len(x), n_ - i)
    if k <= 0: return
    mL[i:i + k] += x[:k] * g * np.sqrt(0.5 * (1 - pan)) * 1.41; mR[i:i + k] += x[:k] * g * np.sqrt(0.5 * (1 + pan)) * 1.41
mr = np.random.default_rng(4)
for cyc in range(3):
    for bar in range(8):
        t0 = cyc * CYC + bar * 4 * beat; ch = chords[bar % 4]
        for bt, v in [(0, 1.0), (2.5, 0.75)]:
            for k, n in enumerate(ch): madd(t0 + bt * beat + k * 0.018, epiano(midi(n + 12), 2.2, v), 0.1, pan=-0.25 + 0.16 * k)
        tb = tt(0.9); f = midi(roots[bar % 4] + 12)
        b = (np.sin(2 * np.pi * f * tb) + 0.4 * np.sin(4 * np.pi * f * tb)) * np.exp(-tb * 3) * np.minimum(1, tb * 200)
        madd(t0, b, 0.3); madd(t0 + 2.5 * beat, b * 0.7, 0.3)
        for bt in range(4):
            if bt in (0, 2): madd(t0 + bt * beat + (0.03 if bt == 2 else 0), kick(mr, 0.5), 0.22)
            if bt in (1, 3): madd(t0 + bt * beat, snare(mr, 210) * 0.6, 0.12, pan=0.05)
            for e in range(2): madd(t0 + bt * beat + e * beat / 2 + 0.02 * e, hat(mr) * (0.7 if e else 1.0), 0.04, pan=0.3)
    mel = [(0, 78), (1.5, 76), (2.5, 74), (4, 73), (6, 71), (8, 74), (9.5, 73), (10.5, 71), (12, 69), (14, 66), (16, 78), (17.5, 81), (18.5, 78), (20, 76), (22, 74), (24, 73), (25.5, 74), (26.5, 76), (28, 74)]
    for bt, n in mel: madd(cyc * CYC + bt * beat, bell(midi(n), mr, 1.4), 0.1, pan=0.2)
mL = lp(mL, 6500); mR = lp(mR, 6500)
MUS = (mL[int(CYC * SR):int(2 * CYC * SR)], mR[int(CYC * SR):int(2 * CYC * SR)])
def mus_pos(t): return np.mod(t - ORIGIN, CYC)
def mus_pos_end(t): return np.mod(t - DUR - ORIGIN, CYC)

t_in = np.arange(int(T_BRK * SR)) / SR
a = play_at(MUS, mus_pos(t_in))
duck = np.interp(t_in, [0, 12.8, 16.3, T_BRK], [1, 1, 0.55, 0.4])
m.add(0.0, (fade(a[0] * duck, 0.02, 0.01), fade(a[1] * duck, 0.02, 0.01)), gain=0.42, rev=0.15)

# the airliner itself: broadband engine/airflow drone + a low hum; present in every cabin shot
tl = tt(DUR)
drn = lp(noise(DUR, rng, 'pink'), 900); drn2 = lp(noise(DUR, np.random.default_rng(81), 'pink'), 900)
hum = sum(a_ * np.sin(2 * np.pi * 115 * k * tl) for k, a_ in [(1, 1), (2, 0.5), (3, 0.3)])
cabin_lvl = np.interp(tl, [0, T_BRK - 0.01, T_BRK, T_FRZ, T_FRZ + 0.01, 43.88, 43.89, 57.62, 57.63, 63.59, 63.6, 74.36, 74.37, DUR],
                          [1, 1, 0.6, 0.6, 0, 0, 0.0, 0.0, 1, 1, 0, 0, 1, 1])
dive = np.interp(tl, [57.62, 58.2, 63.5], [1, 0.55, 0.55])          # engines back to idle for the dive
m.add(0.0, ((drn / np.abs(drn).max() * 0.8 + hum / np.abs(hum).max() * 0.2) * cabin_lvl * dive, (drn2 / np.abs(drn2).max() * 0.8 + hum / np.abs(hum).max() * 0.2) * cabin_lvl * dive), gain=0.14, rev=0.05)
# seatbelt chime at the start, outside cold whistle, pressure creaks, the crack ticking
for tc, f0 in [(0.3, midi(84)), (0.62, midi(79))]: m.add(tc, bell(f0, rng, 1.8), gain=0.1, rev=0.5)
whis = bp(noise(5.0, rng, 'white'), 2200, 5200) * adsr(int(5.0 * SR), 1.2, 0.5, 0.7, 1.6)
m.add(7.6, whis / np.abs(whis).max(), gain=0.05, pan=-0.4, rev=0.3)
tens = pad([146.8, 155.6, 220.0, 293.7], 5.4, rng, cutoff=2400, attack=2.2, release=0.1, voices=3, harmonics=14)
m.add(12.9, tens, gain=0.1, rev=0.5)
for t0 in [13.6, 14.9, 15.8]: m.add(t0, groan(rng, 0.9, 140 + 40 * rng.uniform()), gain=0.08, pan=-0.3, rev=0.4)
ct = T_CRACK; gap = 0.42
while ct < T_BRK - 0.05:
    g_ = 0.18 + 0.12 * (ct - T_CRACK) / (T_BRK - T_CRACK)
    m.add(ct, glass_tink(rng, rng.uniform(1800, 3200)), gain=g_ * 0.6, pan=-0.35, rev=0.2); m.add(ct, tick(rng, 0.8), gain=g_ * 0.4, pan=-0.35, rev=0.2)
    ct += gap; gap = max(0.07, gap * 0.8)
r = riser(rng, 2.4, 300, 7000, 1.6); m.add(T_BRK - 2.42, fade(r, 0.3, 0.02), gain=0.22, rev=0.2)

# =====================================================================================
# 2) the decompression (18.2 -> 39.41) as its own buffer, so the rewind can play it backwards
# =====================================================================================
FD = T_FRZ - T_BRK; fn = int(FD * SR)
F = Mix(FD + 0.01, seed=9); fr = np.random.default_rng(91)
tF = np.arange(fn) / SR + T_BRK
ecF = np.array([ecOf(x) for x in tF[::480]]); ecF = np.interp(np.arange(fn), np.arange(0, fn, 480)[:len(ecF)], ecF)
# the bang + glass bursting outwards (slow-motion: deep and long)
F.add(0.0, boom(fr, 5.0, 60, 22, 2.2, 1.0, 1.0), gain=1.0, rev=0.4)
F.add(0.0, crunch(fr, 1.6), gain=1.2, rev=0.5)
F.add(0.0, metal_hit(fr, 520, 1.8), gain=0.6, rev=0.5)
F.add(0.0, snare(fr, 140), gain=0.6, rev=0.6)
for k in range(46): F.add(0.03 + fr.uniform(0, 2.6) ** 1.6 * 0.5, glass_tink(fr, fr.uniform(1500, 4500)), gain=fr.uniform(0.05, 0.16), pan=fr.uniform(-0.8, 0.4), rev=0.5)
# the roar of air rushing out: loud first, easing as the pressure equalises; slowed (lower) in E/F
rw1 = noise(FD, fr, 'pink'); rw2 = noise(FD, np.random.default_rng(93), 'pink')
lvl = np.clip(np.interp(ecF, [0, 0.05, 3, 14, 21], [0, 1, 0.85, 0.35, 0.25]), 0, 1)
slow = np.interp(tF, [T_BRK, 21.24, 21.3, 25.88, 25.95, T_FRZ], [0.35, 0.35, 0.6, 0.6, 1.0, 1.0])
cut = 260 + 3200 * slow * lvl
m_ = np.interp(tF, [T_BRK, 29.05, 30.5, 34.9, 36.9, 38.4, T_FRZ], [1, 1, 0.3, 0.12, 0.12, 1, 1])   # hypoxia muffles everything
cut = cut * (0.25 + 0.75 * m_)
F.add(0.0, (sweep_filter(rw1, cut, 'lowpass') * lvl, sweep_filter(rw2, cut * 1.05, 'lowpass') * lvl), gain=0.8, rev=0.15)
# shade flutter + paper flapping (mid-range), the PSU doors clacking open, the masks dropping
flut = bp(fr.standard_normal(fn), 600, 3000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * tF))) * np.interp(ecF, [0, 0.3, 4, 8], [0, 1, 0.5, 0])
F.add(0.0, flut / (np.abs(flut).max() + 1e-9), gain=0.1, pan=-0.3, rev=0.2)
T_DROP = 25.88 + (2.9 - ecOf(25.88))
for k in range(9): F.add(T_DROP - T_BRK + k * 0.045 + fr.uniform(0, 0.02), woodblock(fr, fr.uniform(600, 900)), gain=0.12, pan=fr.uniform(-0.7, 0.7), rev=0.3)
for k in range(3): F.add(T_DROP - T_BRK + 0.35 + k * 0.6, bell(midi(81), fr, 0.9), gain=0.07, pan=0.3, rev=0.5)
# hypoxia (H): heartbeat, ringing ears, a tick per second of the countdown
hb = 29.2
while hb < 37.0:
    F.add(hb - T_BRK, heartbeat(fr), gain=0.75, rev=0.1); hb += 0.72
ring = np.sin(2 * np.pi * 3600 * tt(8.0)) * adsr(int(8.0 * SR), 2.5, 1.0, 0.8, 2.0)
F.add(29.4 - T_BRK, ring, gain=0.025, rev=0.2)
for s_ in range(24, 15, -1):
    tc = T_BRK + (30 - s_)
    if 29.0 < tc < 36.9: F.add(tc - T_BRK, tick(fr, 0.7, low=False), gain=0.08, pan=0.15, rev=0.1)
# the grab and the mask: plastic tug, then the oxygen hiss and a breath
F.add(36.1 - T_BRK, woodblock(fr, 420), gain=0.12, rev=0.2)
hiss = bp(noise(2.6, fr, 'white'), 3000, 7000) * adsr(int(2.6 * SR), 0.2, 0.4, 0.6, 1.2)
F.add(36.9 - T_BRK, hiss / np.abs(hiss).max(), gain=0.07, rev=0.2)
br = bp(noise(1.2, fr, 'pink'), 300, 2200) * np.sin(np.pi * np.arange(int(1.2 * SR)) / int(1.2 * SR)) ** 2
F.add(37.0 - T_BRK, br / np.abs(br).max(), gain=0.12, rev=0.2)
sw = riser(fr, 1.5, 400, 5000, 1.2); F.add(37.0 - T_BRK, sw, gain=0.12, rev=0.3)
# dark slow-motion strings under it all
sp = pad([146.8, 174.6, 220.0, 261.6], FD, fr, cutoff=2400, attack=3.0, release=0.01, voices=3, harmonics=14)
F.add(0.8, (fade(sp[0], 3.0, 0.0), fade(sp[1], 3.0, 0.0)), gain=0.12, rev=0.6)
ir_l, ir_r = reverb_ir(2.2, F.rng)
FL = (F.L + signal.fftconvolve(F.rev_L, ir_l)[:F.n])[:fn]; FR = (F.R + signal.fftconvolve(F.rev_R, ir_r)[:F.n])[:fn]
FL[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR)); FR[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
m.add(T_BRK, (FL, FR), gain=1.0)

# =====================================================================================
# 3) freeze + rewind (the decompression backwards, following the picture)
# =====================================================================================
m.add(T_FRZ, thud(rng, 120, 0.25), gain=0.35)
T_R0 = T_FRZ + 0.8
tr = np.arange(int((T_REW_END - T_R0) * SR)) / SR; u = tr / (T_REW_END - T_R0)
eio = np.where(u < 0.5, 4 * u ** 3, 1 - (-2 * u + 2) ** 3 / 2)
te = T_FRZ + (12.0 - T_FRZ) * eio
pos = te - T_BRK
rwv = play_at((FL, FR), pos)
env = np.interp(u, [0, 0.06, 0.9, 1], [0, 1, 1, 0])
m.add(T_R0, (lp(rwv[0], 6000) * env, lp(rwv[1], 6000) * env), gain=0.55, rev=0.1)
whir = sweep_filter(noise(T_REW_END - T_R0, rng, 'white'), 800 + 4000 * np.sin(np.pi * u), 'lowpass')
m.add(T_R0, whir / np.abs(whir).max() * np.sin(np.pi * u), gain=0.1)

# =====================================================================================
# 4) here's why: confident groove (A major, 100 BPM) 43.9 -> 63.6, glass details
# =====================================================================================
B2 = 100; bt2 = 60 / B2
prog = [[57, 61, 64, 69], [52, 56, 59, 64], [54, 57, 61, 66], [50, 54, 57, 62]]       # A E F#m D
t0 = 43.95; i = 0
while t0 < 63.5:
    ch = prog[(i // 8) % 4]; f = midi(ch[[0, 1, 2, 3, 2, 1, 2, 3][i % 8]] + 12)
    m.add(t0, synth_pluck(f, 0.4, 3800, 7.0), gain=0.1, pan=0.35 * np.sin(i * 1.3), rev=0.35); t0 += bt2 / 2; i += 1
tb = 43.95; k = 0
while tb < 63.5:
    if k % 2 == 0: m.add(tb, kick(rng), gain=0.25)
    if k % 4 in (1, 3): m.add(tb, clap(rng), gain=0.12, rev=0.25)
    m.add(tb, hat(rng), gain=0.06, pan=0.3); m.add(tb + bt2 / 2, hat(rng), gain=0.045, pan=-0.3)
    tb += bt2; k += 1
for j, ch in enumerate(prog * 3):
    tj = 43.95 + j * 4 * bt2
    if tj > 63.4: break
    pd = pad([midi(n) for n in ch], 4 * bt2 + 0.3, rng, cutoff=2400, attack=0.4, release=0.4, voices=2, harmonics=12)
    m.add(tj, pd, gain=0.06, rev=0.5)
m.add(43.95, whoosh(rng, 1.4, 400, 3000, 0.5), gain=0.16, rev=0.3)
for j, tc in enumerate([44.4, 44.9, 45.4]): m.add(tc, glass_tink(rng, 2200 + 500 * j), gain=0.14, pan=-0.3 + 0.3 * j, rev=0.6)
for k in range(12): m.add(48.6 + k * 0.07, glass_tink(rng, rng.uniform(1800, 3000)), gain=0.06, pan=0.3, rev=0.4)
m.add(48.6, crunch(rng, 0.5), gain=0.3, rev=0.4)
m.add(49.5, thud(rng, 80, 0.5), gain=0.35, rev=0.3); m.add(49.5, bell(midi(81), rng, 1.5), gain=0.06, rev=0.6)
bh = bp(noise(4.4, rng, 'white'), 2500, 6000) * adsr(int(4.4 * SR), 1.0, 0.5, 0.6, 1.5)
m.add(53.0, bh / np.abs(bh).max(), gain=0.04, rev=0.4)
# the dive: engines spool down, a long descending tone under the altitude counter
dsc = np.sin(2 * np.pi * np.cumsum(np.interp(np.arange(int(5.8 * SR)) / SR, [0, 5.8], [660, 330])) / SR) * adsr(int(5.8 * SR), 0.8, 0.5, 0.7, 1.0)
m.add(57.7, dsc, gain=0.04, rev=0.5)
spool = lp(noise(2.5, rng, 'pink'), 1200) * np.interp(np.arange(int(2.5 * SR)) / SR, [0, 0.3, 2.5], [0, 1, 0])
m.add(57.7, sweep_filter(spool, np.interp(np.arange(int(2.5 * SR)) / SR, [0, 2.5], [2400, 300]), 'lowpass') / np.abs(spool).max(), gain=0.2, rev=0.2)

# =====================================================================================
# 5) 1990 on VHS: muffled 500 km/h wind, tape hiss and hum, a low documentary pad
# =====================================================================================
V0, V1 = 63.59, 74.36; VD = V1 - V0
vw = lp(noise(VD, rng, 'pink'), 1400); vw2 = lp(noise(VD, np.random.default_rng(83), 'pink'), 1400)
tv = np.arange(int(VD * SR)) / SR
gust = 0.75 + 0.25 * np.sin(2 * np.pi * 0.7 * tv) * np.sin(2 * np.pi * 0.23 * tv)
venv = np.interp(tv, [0, 0.4, VD - 0.5, VD], [0, 1, 1, 0])
m.add(V0, (vw / np.abs(vw).max() * gust * venv, vw2 / np.abs(vw2).max() * gust * venv), gain=0.32, rev=0.1)
tape = hp(noise(VD, rng, 'white'), 4000) * 0.4 + np.sin(2 * np.pi * 60 * tv) * 0.3
m.add(V0, tape / np.abs(tape).max() * venv, gain=0.035)
vp = pad([110.0, 130.8, 164.8, 220.0], VD, rng, cutoff=1500, attack=1.5, release=1.5, voices=2, harmonics=10)
wob = 1 + 0.004 * np.sin(2 * np.pi * 0.8 * tv)
vpl = np.interp(np.cumsum(wob) - 1, np.arange(len(vp[0])), vp[0]); vpr = np.interp(np.cumsum(wob) - 1, np.arange(len(vp[1])), vp[1])
m.add(V0, (vpl * venv, vpr * venv), gain=0.13, rev=0.5)
for j, nn in enumerate([69, 72, 76, 74, 72, 69]): m.add(V0 + 0.8 + j * 1.7, epiano(midi(nn), 2.0, 0.8), gain=0.08, pan=0.2 * np.sin(j), rev=0.6)
m.add(69.15, bell(midi(81), rng, 2.5), gain=0.08, rev=0.7)          # "He survived."

# =====================================================================================
# 6) seatbelt chime, calm cabin, and the in-flight music back (seamless loop)
# =====================================================================================
for tc, f0 in [(74.6, midi(84)), (74.92, midi(79))]: m.add(tc, bell(f0, rng, 1.8), gain=0.13, rev=0.5)
m.add(75.4, woodblock(rng, 1500), gain=0.1, rev=0.2)                 # buckle click
t_end = np.arange(int(74.4 * SR), int(DUR * SR)) / SR
e = play_at(MUS, mus_pos_end(t_end))
fe = np.interp(t_end, [74.4, 75.4, DUR], [0, 1, 1])
m.add(74.4, (e[0] * fe, e[1] * fe), gain=0.42, rev=0.15)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep08.wav'
render_phone(m, out, rev_time=2.2, target=-10.5, tp=-1.5, limit=True)
print('wrote', out, 'masks drop at', round(T_DROP, 2))
