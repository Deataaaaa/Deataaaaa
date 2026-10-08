"""Soundtrack for post 2 (What if your plane's window broke at 11,000 m?), worst-case cut. Cue times match
episodes/ep08.js.

Calm in-flight music over the engines -> the crack ticks -> BANG, the roar of air rushing out at the speed of sound
(slow motion), she slams into the wall -> masks clatter down, the hole keeps howling -> hypoxia: everything
muffles, heartbeat, ringing, the countdown ticks faster and faster -> black out: silence -> the dive -> 2018 and
1990 on VHS -> the calm cabin and the in-flight music come back, so the video loops."""
import sys
import numpy as np
from synth import *

DUR = 77.2
T_CRACK, T_BRK = 16.3, 18.2
T_R1, T_R2, T_G, T_V, T_K, T_DV, T_S1, T_S2, T_O, T_P, T_Q = 21.24, 25.6, 30.3, 34.66, 40.56, 43.56, 48.36, 54.0, 61.66, 67.26, 72.66
T_DROP_EC = 7.6
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
    e1 = (T_R1 - T_BRK) / 6
    if te < T_R1: return (te - T_BRK) / 6
    e2 = e1 + (T_R2 - T_R1) / 2
    if te < T_R2: return e1 + (te - T_R1) / 2
    e3 = e2 + (T_V - T_R2)
    if te < T_V: return e2 + (te - T_R2)
    if te < T_K: return e3 + 3 * (te - T_V)
    return e3 + 3 * (T_K - T_V) + (te - T_K)


def te_of_ec(ec):
    lo, hi = T_BRK, DUR
    for _ in range(60):
        mid = (lo + hi) / 2
        if ecOf(mid) < ec: lo = mid
        else: hi = mid
    return lo


def glass_tink(rng, f=None):
    f = f or rng.uniform(2500, 6500); t = tt(0.35)
    x = sum(a * np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6)) * np.exp(-t * (18 + 10 * k)) for k, a in [(1, 1), (2.76, 0.5), (5.4, 0.25)])
    x += bp(rng.standard_normal(len(t)), 3000, 12000) * np.exp(-t * 90) * 0.4
    return x / (np.abs(x).max() + 1e-9)


# =====================================================================================
# 1) in-flight music (lo-fi Rhodes in D, 90 BPM, 8-bar loop = 21.33 s) + engine drone
# =====================================================================================
BPM = 90; beat = 60 / BPM; CYC = 32 * beat
T_HOOK = 3.7            # 0 -> 3.7: the hook (flash-forward of the yank), then the calm story starts
ORIGIN = T_HOOK + 0.05
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

t_in = np.arange(int(T_HOOK * SR), int(T_BRK * SR)) / SR
a = play_at(MUS, mus_pos(t_in))
duck = np.interp(t_in, [0, 12.8, 16.3, T_BRK], [1, 1, 0.55, 0.4])
m.add(T_HOOK, (fade(a[0] * duck, 0.01, 0.01), fade(a[1] * duck, 0.01, 0.01)), gain=0.42, rev=0.15)

# the airliner itself: broadband engine/airflow drone + a low hum; present in every cabin shot
tl = tt(DUR)
drn = lp(noise(DUR, rng, 'pink'), 900); drn2 = lp(noise(DUR, np.random.default_rng(81), 'pink'), 900)
hum = sum(a_ * np.sin(2 * np.pi * 115 * k * tl) for k, a_ in [(1, 1), (2, 0.5), (3, 0.3)])
cabin_lvl = np.interp(tl, [0, T_HOOK - 0.01, T_HOOK, T_BRK - 0.01, T_BRK, T_V, T_K, T_K + 0.6, T_DV, T_DV + 0.8, T_S1 - 0.05, T_S1, T_Q, T_Q + 0.6, DUR],
                          [0.5, 0.5, 1, 1, 0.6, 0.45, 0.25, 0.0, 0.0, 0.7, 0.7, 0.0, 0.0, 1, 1])
dive = np.interp(tl, [T_DV, T_DV + 0.8, T_S1], [1, 0.6, 0.6])           # engines back to idle for the dive
m.add(0.0, ((drn / np.abs(drn).max() * 0.8 + hum / np.abs(hum).max() * 0.2) * cabin_lvl * dive, (drn2 / np.abs(drn2).max() * 0.8 + hum / np.abs(hum).max() * 0.2) * cabin_lvl * dive), gain=0.14, rev=0.05)
# seatbelt chime at the start, outside cold whistle, pressure creaks, the crack ticking
for tc, f0 in [(T_HOOK + 0.15, midi(84)), (T_HOOK + 0.47, midi(79))]: m.add(tc, bell(f0, rng, 1.8), gain=0.1, rev=0.5)
# the hook (0 -> 3.7): the decompression in deep slow motion, she slams into the wall, a rewind swoosh into the calm
hr = np.random.default_rng(97); th = np.arange(int(T_HOOK * SR)) / SR
m.add(0.0, boom(hr, 3.5, 48, 20, 2.0, 0.8, 1.0), gain=0.9, rev=0.4)
hw1 = noise(T_HOOK, hr, 'pink'); hw2 = noise(T_HOOK, np.random.default_rng(98), 'pink')
henv = np.interp(th, [0, 0.03, T_HOOK - 0.35, T_HOOK - 0.08], [0, 1, 0.8, 0])
m.add(0.0, (sweep_filter(hw1, 420 + 900 * henv, 'lowpass') * henv, sweep_filter(hw2, 440 + 900 * henv, 'lowpass') * henv), gain=0.85, rev=0.2)
hh = bp(noise(T_HOOK, hr, 'white'), 1500, 5000) * henv
m.add(0.0, hh / np.abs(hh).max(), gain=0.06, pan=-0.3, rev=0.15)
m.add(1.1, thud(hr, 55, 0.9), gain=0.8, rev=0.3); m.add(1.13, thud(hr, 110, 0.4), gain=0.4, pan=-0.4, rev=0.3)
for k in range(22): m.add(hr.uniform(0, 2.4), glass_tink(hr, hr.uniform(900, 2400)), gain=hr.uniform(0.04, 0.1), pan=hr.uniform(-0.8, 0.3), rev=0.5)
hf = bp(hr.standard_normal(len(th)), 300, 1500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * th))) * henv
m.add(0.0, hf / np.abs(hf).max(), gain=0.08, pan=-0.3, rev=0.2)
rew = riser(hr, 0.45, 5000, 300, 1.3); m.add(T_HOOK - 0.47, fade(rew, 0.05, 0.02), gain=0.25, rev=0.1)
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
# 2) the decompression (18.2 -> blackout): bang, the roar at the hole, the slam, masks, hypoxia, silence
# =====================================================================================
FD = T_DV - T_BRK; fn = int(FD * SR)
F = Mix(FD + 0.01, seed=9); fr = np.random.default_rng(91)
tF = np.arange(fn) / SR + T_BRK
ecF = np.array([ecOf(x) for x in tF[::480]]); ecF = np.interp(np.arange(fn), np.arange(0, fn, 480)[:len(ecF)], ecF)
F.add(0.0, boom(fr, 5.0, 60, 22, 2.2, 1.0, 1.0), gain=1.0, rev=0.4)
F.add(0.0, crunch(fr, 1.6), gain=1.2, rev=0.5)
F.add(0.0, metal_hit(fr, 520, 1.8), gain=0.6, rev=0.5)
F.add(0.0, snare(fr, 140), gain=0.6, rev=0.6)
for k in range(46): F.add(0.03 + fr.uniform(0, 2.6) ** 1.6 * 0.5, glass_tink(fr, fr.uniform(1500, 4500)), gain=fr.uniform(0.05, 0.16), pan=fr.uniform(-0.8, 0.4), rev=0.5)
# the roar of air leaving at the speed of sound: a hard hiss on top of the rumble, slowed (lower) in E and R1
rw1 = noise(FD, fr, 'pink'); rw2 = noise(FD, np.random.default_rng(93), 'pink')
lvl = np.clip(np.interp(ecF, [0, 0.05, 3, 12, 22], [0, 1, 0.9, 0.55, 0.4]), 0, 1)
slow = np.interp(tF, [T_BRK, T_R1, T_R1 + 0.05, T_R2, T_R2 + 0.05, T_DV], [0.35, 0.35, 0.6, 0.6, 1.0, 1.0])
hyp = np.interp(tF, [T_BRK, T_V, T_V + 1.5, T_K, T_K + 0.9, T_DV], [1, 1, 0.35, 0.15, 0.0, 0.0])    # hypoxia muffles, then black out
cut = (260 + 3600 * slow * lvl) * (0.25 + 0.75 * hyp)
gate = np.interp(tF, [T_BRK, T_K + 0.4, T_K + 1.0, T_DV], [1, 1, 0, 0])
F.add(0.0, (sweep_filter(rw1, cut, 'lowpass') * lvl * gate, sweep_filter(rw2, cut * 1.05, 'lowpass') * lvl * gate), gain=0.8, rev=0.15)
hiss = bp(noise(FD, fr, 'white'), 2500, 9000) * np.interp(ecF, [0, 0.05, 2, 6, 12], [0, 1, 0.8, 0.35, 0.15]) * hyp * gate
F.add(0.0, hiss / (np.abs(hiss).max() + 1e-9), gain=0.12, pan=-0.35, rev=0.1)
# she is thrown against the wall: a body thud, the seat creaks, a whistle where her arm fills the hole
t_slam = te_of_ec(0.56)
F.add(t_slam - T_BRK, thud(fr, 70, 0.7), gain=0.75, rev=0.25); F.add(t_slam - T_BRK + 0.03, thud(fr, 140, 0.35), gain=0.4, pan=-0.4, rev=0.2)
F.add(t_slam - T_BRK + 0.1, groan(fr, 1.6, 120), gain=0.12, pan=-0.3, rev=0.3)
whs = np.sin(2 * np.pi * np.cumsum(np.interp(tF, [T_BRK, t_slam, t_slam + 0.4, T_V, T_K], [900, 900, 1500, 1350, 1100])) / SR)
whs *= np.interp(tF, [T_BRK, t_slam, t_slam + 0.3, T_V, T_K, T_K + 0.6], [0, 0, 1, 0.7, 0.2, 0]) * (0.7 + 0.3 * np.sin(2 * np.pi * 5.3 * tF))
F.add(0.0, whs * 0.5, gain=0.06, pan=-0.4, rev=0.2)
# papers and cups flapping past her, out through the top of the hole
flut = bp(fr.standard_normal(fn), 600, 3000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * tF))) * np.interp(ecF, [0, 0.3, 1.2, 2.0], [0, 1, 0.6, 0])
F.add(0.0, flut / (np.abs(flut).max() + 1e-9), gain=0.12, pan=-0.3, rev=0.2)
# the PSU doors pop and the masks drop
T_DROP = te_of_ec(T_DROP_EC)
for k in range(9): F.add(T_DROP - T_BRK + k * 0.045 + fr.uniform(0, 0.02), woodblock(fr, fr.uniform(600, 900)), gain=0.13, pan=fr.uniform(-0.7, 0.7), rev=0.3)
for k in range(3): F.add(T_DROP - T_BRK + 0.35 + k * 0.6, bell(midi(81), fr, 0.9), gain=0.07, pan=0.3, rev=0.5)
# hypoxia: heartbeat speeding up, ringing ears, a tick per second of the (fast) countdown, then one last beat
hb, gap = T_V - 0.2, 0.62
while hb < T_K + 0.3:
    F.add(hb - T_BRK, heartbeat(fr), gain=0.8, rev=0.1); hb += gap; gap = max(0.4, gap * 0.95)
F.add(T_K + 0.9 - T_BRK, heartbeat(fr), gain=0.6, rev=0.3)
ring = np.sin(2 * np.pi * 3600 * tt(T_K - T_V + 0.5)) * adsr(int((T_K - T_V + 0.5) * SR), 2.0, 1.0, 0.8, 0.6)
F.add(T_V - T_BRK, ring, gain=0.03, rev=0.2)
for sec in range(18, 0, -1):
    tc = te_of_ec(30 - sec)
    if T_V < tc < T_K: F.add(tc - T_BRK, tick(fr, 0.7, low=False), gain=0.09, pan=0.15, rev=0.1)
drop_sub = np.sin(2 * np.pi * np.cumsum(np.interp(np.arange(int(2.0 * SR)) / SR, [0, 2.0], [70, 28])) / SR) * adsr(int(2.0 * SR), 0.05, 0.3, 0.6, 1.4)
F.add(T_K + 0.5 - T_BRK, drop_sub, gain=0.35, rev=0.3)
# dark slow-motion strings under it all, gone at the black out
sp = pad([146.8, 174.6, 220.0, 261.6], T_K - T_BRK + 0.6, fr, cutoff=2400, attack=3.0, release=0.6, voices=3, harmonics=14)
F.add(0.8, (fade(sp[0], 3.0, 0.6), fade(sp[1], 3.0, 0.6)), gain=0.12, rev=0.6)
ir_l, ir_r = reverb_ir(2.2, F.rng)
FL = (F.L + signal.fftconvolve(F.rev_L, ir_l)[:F.n])[:fn]; FR = (F.R + signal.fftconvolve(F.rev_R, ir_r)[:F.n])[:fn]
FL[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR)); FR[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
m.add(T_BRK, (FL, FR), gain=0.75)

# =====================================================================================
# 3) the dive: sound comes back muffled, the hole still howling, engines spool down, a long falling tone
# =====================================================================================
DV = T_S1 - T_DV; tdv = np.arange(int(DV * SR)) / SR
dvw = lp(noise(DV, rng, 'pink'), 900) * np.interp(tdv, [0, 0.8, DV - 0.3, DV], [0, 1, 1, 0])
m.add(T_DV, dvw / np.abs(dvw).max(), gain=0.4, pan=-0.2, rev=0.2)
dsc = np.sin(2 * np.pi * np.cumsum(np.interp(tdv, [0, DV], [620, 300])) / SR) * adsr(len(tdv), 0.8, 0.5, 0.7, 0.8)
m.add(T_DV, dsc, gain=0.05, rev=0.5)
for tc in [T_DV + 1.0, T_DV + 2.6]: m.add(tc, bell(midi(84), rng, 1.2), gain=0.06, rev=0.5)
dpad = pad([110.0, 130.8, 164.8], DV, rng, cutoff=1200, attack=0.8, release=0.5, voices=2, harmonics=10)
m.add(T_DV, dpad, gain=0.08, rev=0.5)

# =====================================================================================
# 4) 2018 on VHS: wind at 800 km/h, the wrecked engine rumbling, tape hiss, then a hit and near silence
# =====================================================================================
V0, V1 = T_S1, T_O; VD = V1 - V0; tv = np.arange(int(VD * SR)) / SR
venv = np.interp(tv, [0, 0.4, 58.76 - V0, 58.76 - V0 + 1.2, VD - 0.3, VD], [0, 1, 1, 0.3, 0.3, 0])
vw = lp(noise(VD, rng, 'pink'), 1600); vw2 = lp(noise(VD, np.random.default_rng(85), 'pink'), 1600)
gust = 0.75 + 0.25 * np.sin(2 * np.pi * 0.6 * tv) * np.sin(2 * np.pi * 0.21 * tv)
m.add(V0, (vw / np.abs(vw).max() * gust * venv, vw2 / np.abs(vw2).max() * gust * venv), gain=0.46, rev=0.1)
rum = lp(noise(VD, rng, 'brown'), 220) * (1 + 0.6 * (np.sin(2 * np.pi * 23 * tv) > 0.6))
m.add(V0, rum / np.abs(rum).max() * venv, gain=0.3, pan=0.3, rev=0.15)
tape = hp(noise(VD, rng, 'white'), 4000) * 0.4 + np.sin(2 * np.pi * 60 * tv) * 0.3
m.add(V0, tape / np.abs(tape).max() * np.interp(tv, [0, 0.4, VD - 0.3, VD], [0, 1, 1, 0]), gain=0.035)
vp = pad([98.0, 116.5, 146.8, 196.0], VD, rng, cutoff=1300, attack=1.5, release=1.5, voices=2, harmonics=10)
m.add(V0, (vp[0] * venv, vp[1] * venv), gain=0.18, rev=0.5)
m.add(58.76, boom(rng, 3.5, 55, 25, 1.8, 0.4, 0.9), gain=0.55, rev=0.5)       # "She didn't survive."

# =====================================================================================
# 5) 1990 on VHS: muffled 500 km/h wind, tape hiss and hum, a low documentary pad
# =====================================================================================
V0, V1 = T_O, T_Q; VD = V1 - V0
vw = lp(noise(VD, rng, 'pink'), 1400); vw2 = lp(noise(VD, np.random.default_rng(83), 'pink'), 1400)
tv = np.arange(int(VD * SR)) / SR
gust = 0.75 + 0.25 * np.sin(2 * np.pi * 0.7 * tv) * np.sin(2 * np.pi * 0.23 * tv)
venv = np.interp(tv, [0, 0.4, VD - 0.5, VD], [0, 1, 1, 0])
m.add(V0, (vw / np.abs(vw).max() * gust * venv, vw2 / np.abs(vw2).max() * gust * venv), gain=0.42, rev=0.1)
tape = hp(noise(VD, rng, 'white'), 4000) * 0.4 + np.sin(2 * np.pi * 60 * tv) * 0.3
m.add(V0, tape / np.abs(tape).max() * venv, gain=0.035)
vp = pad([110.0, 130.8, 164.8, 220.0], VD, rng, cutoff=1500, attack=1.5, release=1.5, voices=2, harmonics=10)
wob = 1 + 0.004 * np.sin(2 * np.pi * 0.8 * tv)
vpl = np.interp(np.cumsum(wob) - 1, np.arange(len(vp[0])), vp[0]); vpr = np.interp(np.cumsum(wob) - 1, np.arange(len(vp[1])), vp[1])
m.add(V0, (vpl * venv, vpr * venv), gain=0.17, rev=0.5)
for j, nn in enumerate([69, 72, 76, 74, 72, 69]): m.add(V0 + 0.8 + j * 1.7, epiano(midi(nn), 2.0, 0.8), gain=0.1, pan=0.2 * np.sin(j), rev=0.6)
m.add(T_P + 0.12, bell(midi(81), rng, 2.5), gain=0.08, rev=0.7)          # "He survived."

# =====================================================================================
# 6) back to the calm cruise: the in-flight music returns (seamless loop to the start)
# =====================================================================================
t_end = np.arange(int(T_Q * SR), int(DUR * SR)) / SR
e = play_at(MUS, mus_pos_end(t_end))
fe = np.interp(t_end, [T_Q, T_Q + 0.8, DUR - 0.06, DUR], [0, 1, 1, 0])
m.add(T_Q, (e[0] * fe, e[1] * fe), gain=0.42, rev=0.15)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep08.wav'
render_phone(m, out, rev_time=2.2, target=-10.5, tp=-1.5, limit=True)
print('wrote', out, 'slam at', round(t_slam, 2), 'masks drop at', round(T_DROP, 2))
