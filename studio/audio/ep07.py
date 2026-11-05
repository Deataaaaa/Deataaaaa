"""Soundtrack for EP07 (What if your elevator's cable snapped?). Cue times match episodes/ep07.js.

Story in sound: cheesy elevator music from the ceiling speaker -> it dies in a tape-stop when the cable snaps ->
slow-motion fall (wind rising with speed, a whoosh per floor) -> freeze, then the fall plays BACKWARDS in sync
with the picture -> brakes screech and hold -> 1854 phonograph + the crowd cheering Otis -> 75 floors counted
in ticks -> the door chime, and the elevator music comes back so the video loops seamlessly."""
import sys
import numpy as np
from synth import *

DUR = 53.8
T_SNAP, SLOW = 8.6, 8.0
T_FREEZE, T_REW0, T_REW_END = 24.3, 25.2, 27.6
G = 9.81
FLOOR = 3.1
m = Mix(DUR, seed=7)
rng = np.random.default_rng(70)


def midi(n): return 440.0 * 2 ** ((n - 69) / 12)


def stereo_len(x, n):
    l, r = x
    out = []
    for c in (l, r):
        c = c[:n]
        if len(c) < n: c = np.concatenate([c, np.zeros(n - len(c))])
        out.append(c)
    return out[0], out[1]


def play_at(x, pos_s):
    """resample stereo buffer x at fractional positions pos_s (seconds); outside -> 0."""
    idx = np.arange(len(x[0]))
    p = pos_s * SR
    return tuple(np.interp(p, idx, c, left=0.0, right=0.0) for c in x)


def epiano(f, dur=1.6, vel=1.0):
    t = tt(dur)
    x = np.sin(2 * np.pi * f * t) + 0.28 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3) + 0.08 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 5)
    x += 0.22 * np.sin(2 * np.pi * f * 7.1 * t) * np.exp(-t * 26)          # tine ping
    x *= np.exp(-t * 1.6) * np.minimum(1, t * 300) * (1 + 0.12 * np.sin(2 * np.pi * 4.7 * t))
    return x * vel / (np.abs(x).max() + 1e-9)


def ragpiano(f, dur=0.9):
    t = tt(dur); x = np.zeros_like(t)
    for det in (-7, 7):                                                     # honky-tonk detune (cents)
        ff = f * 2 ** (det / 1200)
        for h, a in [(1, 1), (2, 0.5), (3, 0.3), (4, 0.18), (5, 0.1), (6, 0.06)]:
            x += a * np.sin(2 * np.pi * ff * h * t) * np.exp(-t * (2.2 + h * 0.9))
    x *= np.minimum(1, t * 600)
    return x / (np.abs(x).max() + 1e-9)


def babble(dur, n, rng, lo=0.15, hi=0.45):
    """crowd murmur: many short formant-filtered voiced bursts."""
    L = np.zeros(int(dur * SR)); R = np.zeros_like(L)
    for _ in range(n):
        d = rng.uniform(lo, hi); t = tt(d); f0 = rng.uniform(95, 230)
        src = np.sign(np.sin(2 * np.pi * f0 * t * (1 + 0.04 * np.sin(2 * np.pi * 5 * t)))) * 0.5 + rng.standard_normal(len(t)) * 0.15
        f1, f2 = rng.uniform(300, 800), rng.uniform(900, 2300)
        y = bp(src, f1 * 0.8, f1 * 1.25) + 0.6 * bp(src, f2 * 0.85, f2 * 1.15)
        y *= np.sin(np.pi * np.arange(len(t)) / len(t)) ** 1.5
        i = int(rng.uniform(0, dur - d) * SR); pan = rng.uniform(-0.8, 0.8)
        L[i:i + len(y)] += y * np.sqrt(0.5 * (1 - pan)); R[i:i + len(y)] += y * np.sqrt(0.5 * (1 + pan))
    s = max(np.abs(L).max(), np.abs(R).max()) + 1e-9
    return (L / s, R / s)


def applause(dur, rate, rng):
    L = np.zeros(int(dur * SR)); R = np.zeros_like(L)
    nclaps = int(dur * rate)
    for _ in range(nclaps):
        tc = rng.uniform(0, dur - 0.3); c = clap(rng) * rng.uniform(0.4, 1.0); pan = rng.uniform(-0.9, 0.9)
        i = int(tc * SR); L[i:i + len(c)] += c * np.sqrt(0.5 * (1 - pan)); R[i:i + len(c)] += c * np.sqrt(0.5 * (1 + pan))
    s = max(np.abs(L).max(), np.abs(R).max()) + 1e-9
    return (L / s, R / s)


# =====================================================================================
# 1) elevator music ("muzak") from a small ceiling speaker: bossa in F, 120 BPM, 8-second loop
# =====================================================================================
BPM = 120; beat = 60 / BPM; CYC = 16 * beat                       # 4 bars of 4 beats = 8 s
ORIGIN = 0.1                                                      # beat grid starts at 0.1 s (ticks land on beats)
chords = [[53, 57, 60, 64], [50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 58]]   # Fmaj7  Dm7  Gm7  C7
roots = [41, 38, 43, 36]
mz_n = int(3 * CYC * SR) + SR
mL = np.zeros(mz_n); mR = np.zeros(mz_n)
def madd(t, x, g, pan=0.0):
    i = int(t * SR); n = min(len(x), mz_n - i)
    if n <= 0: return
    mL[i:i + n] += x[:n] * g * np.sqrt(0.5 * (1 - pan)) * 1.41; mR[i:i + n] += x[:n] * g * np.sqrt(0.5 * (1 + pan)) * 1.41
mr = np.random.default_rng(3)
for cyc in range(3):
    for bar in range(4):
        t0 = cyc * CYC + bar * 4 * beat
        ch = chords[bar]
        # bossa comping: 1, 2&, 3&, 4& (syncopated)
        for bt, v in [(0, 1.0), (1.5, 0.8), (2.5, 0.75), (3.5, 0.7)]:
            for k, n in enumerate(ch):
                madd(t0 + bt * beat + k * 0.012, epiano(midi(n + 12), 1.2, v), 0.11, pan=-0.2 + 0.13 * k)
        # bass: root on 1, fifth on 3 (with a pickup)
        for bt, n in [(0, roots[bar]), (1.5, roots[bar] + 7), (2, roots[bar] + 7), (3.5, roots[bar])]:
            tb = tt(0.5); f = midi(n + 12)
            b = (np.sin(2 * np.pi * f * tb) + 0.35 * np.sin(4 * np.pi * f * tb)) * np.exp(-tb * 5) * np.minimum(1, tb * 200)
            madd(t0 + bt * beat, b, 0.3)
        # shaker on 8ths, rim click on the bossa clave
        for e in range(8):
            madd(t0 + e * beat / 2, hat(mr) * (0.6 if e % 2 else 1.0), 0.05, pan=0.3)
        for bt in ([0, 1.5, 3] if bar % 2 == 0 else [1, 2.5]):
            madd(t0 + bt * beat, woodblock(mr, 1250), 0.07, pan=-0.25)
    # vibraphone melody (the "hold music" tune)
    mel = [(0, 72), (1, 76), (1.5, 74), (2.5, 72), (4, 69), (5.5, 72), (6, 74), (8, 74), (9, 77), (9.5, 76), (10.5, 74), (12, 72), (13, 70), (14, 69)]
    for bt, n in mel:
        madd(cyc * CYC + bt * beat, bell(midi(n), mr, 1.2), 0.14, pan=0.15)
# small speaker in the ceiling: band-limited, a little gritty, a little roomy
mL = np.tanh(bp(mL, 280, 5200) * 1.6); mR = np.tanh(bp(mR, 280, 5200) * 1.6)
MUZ = (mL[int(CYC * SR):int(2 * CYC * SR)], mR[int(CYC * SR):int(2 * CYC * SR)])   # steady-state middle cycle
def muzak_pos(t): return np.mod(t - ORIGIN, CYC)
def muzak_pos_end(t): return np.mod(t - DUR - ORIGIN, CYC)      # reaches the t=0 position exactly at the last frame

# intro: muzak until the snap, then a tape-stop (pitch dives to nothing in 0.45 s)
t_intro = np.arange(int(T_SNAP * SR)) / SR
a = play_at(MUZ, muzak_pos(t_intro))
m.add(0.0, (fade(a[0], 0.02, 0), fade(a[1], 0.02, 0)), gain=0.42, rev=0.12)
ts = np.arange(int(0.45 * SR)) / SR
p0 = muzak_pos(T_SNAP)
pos = p0 + ts - ts ** 2 / (2 * 0.45)
b = play_at(MUZ, np.mod(pos, CYC))
env = (1 - ts / 0.45) ** 0.6
m.add(T_SNAP, (b[0] * env, b[1] * env), gain=0.42, rev=0.12)

# cabin: ventilation hiss + 100 Hz electrical hum (audible harmonics), all along the in-car shots
hum_t = tt(DUR)
hum = sum(a * np.sin(2 * np.pi * 100 * k * hum_t) for k, a in [(1, 1), (2, 0.6), (3, 0.45), (4, 0.25), (6, 0.12)])
vent = bp(noise(DUR, rng, 'pink'), 500, 3000)
cab = hum / np.abs(hum).max() * 0.6 + vent / np.abs(vent).max() * 0.4
in_car = np.interp(hum_t, [0, 8.6, 8.7, 24.3, 24.31, 27.6, 27.61, 35.3, 35.4, 38.4, 38.41, 42.4, 42.5, 49.8, 50.5],
                          [1, 1, 0.35, 0.35, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1.0])
m.add(0.0, cab * in_car, gain=0.05, rev=0.1)

# floor display chime when it appears, countdown ticks on the beat (3.6 ... 7.6)
m.add(3.42, bell(midi(88), rng, 1.6), gain=0.08, pan=0.2, rev=0.4)
for i, tk in enumerate([3.6, 4.6, 5.6, 6.6, 7.6]):
    m.add(tk, tick(rng, 0.9, low=i >= 3), gain=0.10 + 0.04 * i, pan=0.12 * (-1) ** i, rev=0.2)
hb = 5.9; gap = 0.8
while hb < T_SNAP - 0.25:
    m.add(hb, heartbeat(rng), gain=0.45, rev=0.1); hb += gap; gap *= 0.88
r = riser(rng, 3.0, 220, 6000, 1.7)
m.add(T_SNAP - 3.02, fade(r, 0.4, 0.02), gain=0.22, rev=0.3)

# =====================================================================================
# 2) the fall (8.6 -> 24.3), built as its own buffer so the rewind can play it backwards
# =====================================================================================
FD = T_FREEZE - T_SNAP
fn = int(FD * SR)
F = Mix(FD + 0.01, seed=8)
fr = np.random.default_rng(81)
# the snap: cable twang + whip, crack, metal, boom
tw = tt(1.6)
twang = np.sin(2 * np.pi * np.cumsum(1900 * np.exp(-tw * 7) + 260) / SR) * np.exp(-tw * 3.2)
F.add(0.0, twang, gain=0.45, pan=0.25, rev=0.5)
F.add(0.0, metal_hit(fr, 640, 2.4), gain=0.8, rev=0.6)
F.add(0.0, crunch(fr, 1.2), gain=0.95, rev=0.4)
F.add(0.0, snare(fr, 170), gain=0.7, rev=0.5)
F.add(0.0, boom(fr, 4.5, 70, 26, 1.6, 0.9, 0.9), gain=0.9, rev=0.35)
F.add(0.005, bp(fr.standard_normal(int(0.25 * SR)), 1500, 9000) * np.exp(-tt(0.25) * 30), gain=0.6)
# lights flicker: electrical buzz chopped like the picture (sin(t*90) > 0.2 for 0.9 s)
tf_ = tt(0.9)
buzz = sum(np.sin(2 * np.pi * 100 * k * tf_) / k for k in range(1, 12))
gate = (np.sin((T_SNAP + tf_) * 90) > 0.2).astype(float)
gate = np.convolve(gate, np.ones(96) / 96, 'same')
F.add(0.0, buzz / np.abs(buzz).max() * (1 - gate) + bp(fr.standard_normal(len(tf_)), 2000, 8000) * (1 - gate) * 0.3, gain=0.22, pan=-0.2, rev=0.2)
# alarm bell (the cabin alarm rings, slowed down 8x it becomes a low pulsing tone)
for k in range(5):
    F.add(0.8 + k * 3.0, bell(midi(57), fr, 3.0), gain=0.09, pan=0.3, rev=0.7)
# slow-motion bed: dark strings in D minor + low drone + heartbeat
sp = pad([146.8, 174.6, 220.0, 261.6, 349.2], FD, fr, cutoff=2600, attack=2.5, release=0.01, voices=3, harmonics=16)
F.add(0.3, (fade(sp[0], 2.0, 0.0), fade(sp[1], 2.0, 0.0)), gain=0.17, rev=0.6)
dr = drone([36.7, 73.4, 110.0], FD, fr, cutoff=420)
F.add(0.0, dr, gain=0.3, rev=0.3)
hbt = 1.0
while hbt < FD - 0.6:
    F.add(hbt, heartbeat(fr), gain=0.6, rev=0.15); hbt += 1.35
# low pulse (slowed engine of the music): kick + crunch every 1.6 s, closer together as it builds
tp = 1.2; gp = 1.6
while tp < FD - 0.3:
    F.add(tp, kick(fr, 0.6), gain=0.4, rev=0.3); F.add(tp, crunch(fr, 0.7), gain=0.12, rev=0.5)
    tp += gp; gp = max(0.55, gp * 0.93)
# rush of air: grows with the speed of the fall, brighter in the shaft shot (14.6-18)
tl = np.arange(fn) / SR; v = G * tl / SLOW
w1 = wind(fr, FD, 250, 1600, 0.21, 0.4); w2 = wind(np.random.default_rng(83), FD, 250, 1600, 0.17, 0.4)
lvl = np.clip(v / 19.0, 0, 1) ** 1.3 * np.interp(tl + T_SNAP, [T_SNAP, 14.5, 14.7, 17.9, 18.1, 24.3], [0.6, 0.6, 1.0, 1.0, 0.6, 0.7])
cut = 500 + 2200 * np.clip(v / 19.0, 0, 1) * np.interp(tl + T_SNAP, [T_SNAP, 14.5, 14.7, 17.9, 18.1, 24.3], [0.7, 0.7, 1.0, 1.0, 0.75, 0.8])
F.add(0.0, (sweep_filter(w1 * lvl, cut, 'lowpass'), sweep_filter(w2 * lvl, cut, 'lowpass')), gain=0.55, rev=0.15)
# floors going past (display 16 -> 15 -> ...): whoosh + click at the exact moments
for n in range(1, 8):
    tn = T_SNAP + SLOW * np.sqrt(2 * 3.1 * n / G)
    if tn >= T_FREEZE - 0.05: break
    if 14.5 < tn < 18.1: continue
    F.add(tn - T_SNAP - 0.6, whoosh(fr, 1.2, 300, 2600, 0.5), gain=0.28, pan=0.3 * (-1) ** n, rev=0.3)
    F.add(tn - T_SNAP, tick(fr, 1.0, low=True), gain=0.2, pan=0.1, rev=0.3)
# phone floating (11.5-14.6): glassy weightless shimmer
for j, nn in enumerate([86, 90, 93, 98, 93, 90, 95, 98]):
    F.add(11.4 - T_SNAP + j * 0.38, bell(midi(nn), fr, 2.4), gain=0.06, pan=0.5 * np.sin(j * 1.7), rev=0.95)
shim = pad([midi(74), midi(78), midi(81), midi(86)], 3.6, fr, cutoff=6000, attack=1.2, release=1.2, voices=2, harmonics=8)
F.add(11.3 - T_SNAP, shim, gain=0.07, rev=0.9)
# shaft shot: cables whipping (low wobbling metal) + rails rattling
for k, t0 in enumerate([14.8, 15.9, 16.9]):
    tw2 = tt(1.3); wob = np.sin(2 * np.pi * np.cumsum(140 + 60 * np.sin(2 * np.pi * 3.5 * tw2)) / SR) * np.exp(-tw2 * 2.2)
    F.add(t0 - T_SNAP, wob, gain=0.18, pan=-0.3 + 0.3 * k, rev=0.5)
    F.add(t0 - T_SNAP + 0.1, metal_hit(fr, 330 + 40 * k, 1.2), gain=0.12, rev=0.5)
rat = bp(fr.standard_normal(int(3.4 * SR)), 1200, 5000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 13 * tt(3.4))))
F.add(14.6 - T_SNAP, fade(rat, 0.4, 0.4), gain=0.05, rev=0.3)
# the last seconds: rising tension into the freeze
r2 = riser(fr, 4.2, 200, 7000, 1.5)
F.add(FD - 4.2, r2, gain=0.3, rev=0.2)
for j in range(12):
    F.add(FD - 3.0 + j * 0.25, synth_pluck(midi(62 + (j % 4) * 3), 0.3, 3000, 8.0), gain=0.1 + 0.01 * j, pan=0.3 * np.sin(j), rev=0.3)

# render the fall bed to a buffer (reverb included) and place it with a hard cut at the freeze
ir_l, ir_r = reverb_ir(2.4, F.rng)
FL = F.L + signal.fftconvolve(F.rev_L, ir_l)[:F.n]; FR = F.R + signal.fftconvolve(F.rev_R, ir_r)[:F.n]
FL, FR = stereo_len((FL, FR), fn)
# ---- the real-time plunge (shot F, 14.6 -> impact): the bed ducks, the shaft roars past, then the hit ----
P0 = 14.6; T_PL = np.sqrt(2 * 50 / G); T_HIT = P0 + T_PL
tl2 = np.arange(fn) / SR + T_SNAP
duck = np.interp(tl2, [T_SNAP, P0 - 0.05, P0 + 0.25, T_HIT - 0.02, T_HIT, 18.0, 18.25, T_FREEZE], [1, 1, 0.22, 0.22, 0.0, 0.0, 1, 1])
FL *= duck; FR *= duck
PL = Mix(T_PL + 1.2, seed=91); pr = np.random.default_rng(92)
tp_ = np.arange(int(T_PL * SR)) / SR; vp = G * tp_ / 31.3
r1 = noise(T_PL, pr, 'pink'); r2 = noise(T_PL, np.random.default_rng(93), 'pink')
cutp = 250 + 3800 * vp ** 1.2
roarL = sweep_filter(r1, cutp, 'lowpass') * vp ** 1.5; roarR = sweep_filter(r2, cutp, 'lowpass') * vp ** 1.5
PL.add(0.0, (roarL / np.abs(roarL).max(), roarR / np.abs(roarR).max()), gain=1.0)
rum = lp(noise(T_PL, pr, 'brown'), 220) * vp; rum += np.sin(2 * np.pi * np.cumsum(38 + 50 * vp) / SR) * vp * 0.5
PL.add(0.0, rum / np.abs(rum).max(), gain=0.45)
rattle = bp(pr.standard_normal(len(tp_)), 900, 4200) * (0.4 + 0.6 * (np.sin(2 * np.pi * (9 + 40 * vp) * tp_) > 0.6)) * vp ** 1.2
PL.add(0.0, rattle / np.abs(rattle).max(), gain=0.18)
for n in range(1, 17):                                     # every landing flashing past
    tn = np.sqrt(2 * FLOOR * n / G)
    if tn >= T_PL - 0.02: break
    vv = G * tn / 31.3
    wl = 0.32 - 0.22 * vv
    w = bp(pr.standard_normal(int(wl * SR)), 300 + 1500 * vv, 1200 + 5000 * vv) * np.sin(np.pi * np.arange(int(wl * SR)) / int(wl * SR)) ** 2
    PL.add(tn - wl / 2, w / np.abs(w).max(), gain=0.3 + 0.35 * vv, pan=0.5 * (-1) ** n)
    PL.add(tn, thud(pr, 70 + 50 * vv, 0.18), gain=0.15 + 0.2 * vv, pan=0.3 * (-1) ** n)
PL.add(T_PL, boom(pr, 1.2, 80, 30, 0.6, 1.0, 1.0), gain=1.0)
PL.add(T_PL, crunch(pr, 0.5), gain=1.1)
PL.add(T_PL, snare(pr, 150), gain=0.8)
PL.add(T_PL, metal_hit(pr, 300, 0.6), gain=0.5)
ring = np.sin(2 * np.pi * 3150 * tt(0.9)) * np.exp(-tt(0.9) * 5) * np.minimum(1, tt(0.9) * 50)
PL.add(T_PL + 0.03, ring, gain=0.06)
ir2 = reverb_ir(1.2, PL.rng)
PLL = PL.L + signal.fftconvolve(PL.L * 0.25, ir2[0])[:PL.n]; PLR = PL.R + signal.fftconvolve(PL.R * 0.25, ir2[1])[:PL.n]
i0 = int((P0 - T_SNAP) * SR); n2 = min(PL.n, fn - i0)
cut_after = np.ones(n2); ih = int((T_PL + 0.36) * SR)
if ih < n2: cut_after[ih:] = np.exp(-np.arange(n2 - ih) / (0.04 * SR))      # quick decay so slow motion comes back clean
FL[i0:i0 + n2] += PLL[:n2] * cut_after; FR[i0:i0 + n2] += PLR[:n2] * cut_after
FL[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR)); FR[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
m.add(T_SNAP, (FL, FR), gain=1.0)

# =====================================================================================
# 3) freeze + rewind: the fall audio, backwards, following the picture's rewind curve
# =====================================================================================
m.add(T_FREEZE, thud(rng, 120, 0.25), gain=0.35)
m.add(T_FREEZE, bp(rng.standard_normal(int(0.06 * SR)), 1500, 6000) * np.exp(-tt(0.06) * 60), gain=0.4)
tau_f = FD / SLOW
tr = np.arange(int((T_REW_END - T_REW0) * SR)) / SR
u = tr / (T_REW_END - T_REW0)
eio = np.where(u < 0.5, 4 * u ** 3, 1 - (-2 * u + 2) ** 3 / 2)
fall_pos = SLOW * tau_f * (1 - eio)                       # seconds into the fall buffer
rw = play_at((FL, FR), fall_pos)
rw = (lp(rw[0], 6500) * np.interp(u, [0, 0.08, 0.92, 1], [0, 1, 1, 0.6]), lp(rw[1], 6500) * np.interp(u, [0, 0.08, 0.92, 1], [0, 1, 1, 0.6]))
m.add(T_REW0, rw, gain=0.55, rev=0.1)
whir = sweep_filter(noise(T_REW_END - T_REW0, rng, 'white'), 800 + 4000 * np.sin(np.pi * u), 'lowpass')
m.add(T_REW0, whir / np.abs(whir).max() * np.sin(np.pi * u), gain=0.1, rev=0.1)

# =====================================================================================
# 4) here's why: confident major groove (D major, 100 BPM) 27.6 -> 38.4
# =====================================================================================
B2 = 100; bt2 = 60 / B2
prog = [[62, 66, 69, 74], [57, 61, 64, 69], [59, 62, 66, 71], [55, 59, 62, 67]]     # D A Bm G
t0 = T_REW_END + 0.05; i = 0
while t0 < 38.3:
    ch = prog[(i // 8) % 4]
    f = midi(ch[[0, 1, 2, 3, 2, 1, 2, 3][i % 8]] + 12)
    m.add(t0, synth_pluck(f, 0.4, 3800, 7.0), gain=0.14, pan=0.35 * np.sin(i * 1.3), rev=0.35)
    t0 += bt2 / 2; i += 1
tb = T_REW_END + 0.05; k = 0
while tb < 38.3:
    if k % 2 == 0: m.add(tb, kick(rng), gain=0.38)
    if k % 4 in (1, 3): m.add(tb, clap(rng), gain=0.18, rev=0.25)
    m.add(tb, hat(rng), gain=0.07, pan=0.3); m.add(tb + bt2 / 2, hat(rng), gain=0.05, pan=-0.3)
    tb += bt2; k += 1
for j, ch in enumerate(prog * 2):
    tj = T_REW_END + j * 4 * bt2
    if tj > 38.2: break
    pd = pad([midi(n) for n in ch], 4 * bt2 + 0.3, rng, cutoff=2400, attack=0.4, release=0.4, voices=2, harmonics=12)
    m.add(tj, pd, gain=0.09, rev=0.5)
# cables from the roof: deep steel creaks under tension
for t0 in [28.0, 29.4, 30.6]:
    m.add(t0, groan(rng, 1.4, 70 + 15 * rng.uniform()), gain=0.16, pan=rng.uniform(-0.4, 0.4), rev=0.5)
# brakes (shot J): car drops from 32.0 (shown 2.5x slower), trips at 3 m/s, slides, holds
T_TRIP = 32.0 + 2.5 * (3 / G); T_HOLD = T_TRIP + 2.5 * (3 / (0.6 * G))
m.add(32.0, whoosh(rng, 0.9, 200, 1400, 0.8), gain=0.18, rev=0.2)
m.add(T_TRIP, metal_hit(rng, 520, 1.6), gain=0.75, rev=0.4)
m.add(T_TRIP, crunch(rng, 0.6), gain=0.4, rev=0.3)
sl = T_HOLD - T_TRIP; tsl = tt(sl + 0.15)
scr = sum(np.sin(2 * np.pi * f0 * tsl * (1 + 0.01 * np.sin(2 * np.pi * 23 * tsl))) for f0 in (2350, 3120, 4410))
scr = scr / 3 + bp(rng.standard_normal(len(tsl)), 1800, 6500) * 0.8
scr *= np.interp(tsl, [0, 0.05, sl * 0.7, sl, sl + 0.15], [0, 1, 0.8, 0.3, 0])
m.add(T_TRIP, scr / np.abs(scr).max(), gain=0.22, pan=0.25, rev=0.3)
m.add(T_HOLD, thud(rng, 70, 0.8), gain=0.55, rev=0.3)
m.add(T_HOLD, metal_hit(rng, 280, 1.4), gain=0.3, rev=0.5)
# safe: warm swell when the car is shown stopped
m.add(35.3, bell(midi(74), rng, 2.5), gain=0.08, rev=0.8)
m.add(36.0, thud(rng, 85, 0.4), gain=0.2, rev=0.3)                     # feet back on the floor

# =====================================================================================
# 5) New York, 1854: phonograph ragtime, the crowd, the axe, the catch, the cheer
# =====================================================================================
L0, L1 = 38.4, 42.4; CUT = L0 + 1.6
rag = Mix(L1 - L0 + 0.5, seed=18); rr = np.random.default_rng(19)
rb = 0.25
lh = [(0, 36), (0.5, 52), (1, 43), (1.5, 52), (2, 36), (2.5, 52), (3, 43), (3.5, 55), (4, 41), (4.5, 57), (5, 36), (5.5, 52), (6, 43), (6.5, 50), (7, 36)]
rh = [(0, 76), (0.25, 79), (0.75, 84), (1.0, 81), (1.5, 79), (2.0, 76), (2.25, 77), (2.75, 79), (3.5, 84), (4.0, 86), (4.5, 84), (5.0, 81), (5.5, 79), (6.0, 76), (6.5, 72)]
for b_, n in lh: rag.add(b_ * rb * 2, ragpiano(midi(n), 0.6), gain=0.35, pan=-0.1)
for b_, n in rh: rag.add(b_ * rb * 2, ragpiano(midi(n), 0.7), gain=0.3, pan=0.1)
rL, rR = rag.L, rag.R
rL = bp(rL, 380, 3200); rR = bp(rR, 380, 3200)
tt_r = np.arange(len(rL)) / SR
wow = 1 + 0.004 * np.sin(2 * np.pi * 0.9 * tt_r)
rL = np.interp(np.cumsum(wow) - 1, np.arange(len(rL)), rL); rR = np.interp(np.cumsum(wow) - 1, np.arange(len(rR)), rR)
crack = np.zeros_like(rL); ci = rr.integers(0, len(crack), 260); crack[ci] = rr.uniform(-1, 1, len(ci))
crack = hp(crack, 1500) * 0.9 + bp(rr.standard_normal(len(rL)), 2000, 7000) * 0.05
s_ = np.abs(rL).max() + 1e-9
duck = np.interp(tt_r + L0, [L0, CUT - 0.05, CUT, CUT + 0.9, CUT + 1.4, L1], [1, 1, 0.35, 0.35, 0.8, 0.8])
m.add(L0, ((rL / s_ + crack * 0.25) * duck, (rR / s_ + crack * 0.25) * duck), gain=0.32, rev=0.15)
crowd = babble(L1 - L0, 230, rng)
cl = np.interp(np.arange(len(crowd[0])) / SR + L0, [L0, L0 + 0.5, CUT - 0.1, CUT + 0.05, CUT + 0.4, L1], [0, 1, 1, 0.2, 0.2, 0.2])
m.add(L0, (crowd[0] * cl, crowd[1] * cl), gain=0.14, rev=0.4)
# the axe, the rope, the catch
m.add(CUT - 0.03, woodblock(rng, 210), gain=0.45, rev=0.3)
m.add(CUT - 0.03, thud(rng, 95, 0.4), gain=0.35)
m.add(CUT, bp(rng.standard_normal(int(0.12 * SR)), 1200, 8000) * np.exp(-tt(0.12) * 40), gain=0.45, pan=0.1)
t_stop = CUT + np.sqrt(2 * 0.08 / G)
m.add(t_stop, metal_hit(rng, 380, 1.0), gain=0.65, rev=0.35)
m.add(t_stop, thud(rng, 75, 0.6), gain=0.5, rev=0.3)
m.add(t_stop, woodblock(rng, 160), gain=0.3, rev=0.3)
gasp = bp(noise(0.6, rng, 'pink'), 500, 2500) * adsr(int(0.6 * SR), 0.05, 0.2, 0.6, 0.3)
m.add(CUT + 0.05, gasp / np.abs(gasp).max(), gain=0.18, rev=0.4)
ap = applause(L1 - (CUT + 0.9) + 0.4, 160, rng)
apl = np.interp(np.arange(len(ap[0])) / SR, [0, 0.4, 1.3, 1.9], [0, 1, 0.9, 0.0])
m.add(CUT + 0.9, (ap[0] * apl, ap[1] * apl), gain=0.3, rev=0.4)
cheer = babble(1.6, 90, rng, 0.3, 0.7)
m.add(CUT + 1.0, (cheer[0] * np.interp(np.arange(len(cheer[0])) / SR, [0, 0.3, 1.2, 1.6], [0, 1, 0.6, 0]), cheer[1] * np.interp(np.arange(len(cheer[1])) / SR, [0, 0.3, 1.2, 1.6], [0, 1, 0.6, 0])), gain=0.16, rev=0.5)

# =====================================================================================
# 6) 75 floors (1945): one tick per floor on the display, accelerating, then the impact
# =====================================================================================
ts_ = np.arange(42.4, 46.3, 1 / SR * 8)
def floor_at(t): return np.maximum(1, np.round(75 + (1 - 75) * np.clip((t - 42.6) / 3.3, 0, 1) ** 3))
fl = floor_at(ts_)
chg = ts_[1:][np.diff(fl) != 0]
for j, tc in enumerate(chg):
    m.add(tc, tick(rng, 0.8, low=False), gain=0.09 + 0.08 * j / max(1, len(chg)), pan=0.2 * np.sin(j), rev=0.15)
tension = pad([146.8, 155.6, 220.0, 233.1], 3.6, rng, cutoff=3000, attack=2.5, release=0.05, voices=3, harmonics=14)
m.add(42.4, tension, gain=0.12, rev=0.5)
r3 = riser(rng, 3.2, 300, 8000, 2.0)
T_IMP = float(chg[-1]) + 0.05 if len(chg) else 45.9
m.add(T_IMP - 3.2, fade(r3, 0.3, 0.02), gain=0.25, rev=0.2)
m.add(T_IMP, boom(rng, 3.5, 70, 28, 1.3, 1.0, 0.8), gain=0.85, rev=0.4)
m.add(T_IMP, crunch(rng, 1.0), gain=0.8, rev=0.4)
m.add(T_IMP, snare(rng, 150), gain=0.6, rev=0.5)

# =====================================================================================
# 7) the doors open (ding), relax ... and the elevator music returns (seamless loop)
# =====================================================================================
m.add(46.45, bell(midi(88), rng, 2.4), gain=0.13, pan=-0.1, rev=0.6)        # ding
m.add(46.85, bell(midi(84), rng, 2.6), gain=0.12, pan=0.1, rev=0.6)          # dong
door = bp(noise(1.0, rng, 'pink'), 200, 1200) * adsr(int(1.0 * SR), 0.15, 0.3, 0.7, 0.4)
m.add(46.5, door / np.abs(door).max(), gain=0.1, rev=0.3)
lobby = babble(3.6, 40, rng, 0.3, 0.6)
m.add(46.6, (lobby[0] * 0.5, lobby[1] * 0.5), gain=0.06, rev=0.7)
res = pad([146.8, 185.0, 220.0, 293.7, 329.6, 440.0], 3.7, rng, cutoff=2600, attack=0.8, release=1.2, voices=3, harmonics=14)
m.add(46.3, res, gain=0.12, rev=0.6)
for j, nn in enumerate([74, 78, 81, 86, 81, 78, 76, 78]):
    m.add(46.6 + j * 0.36, synth_pluck(midi(nn), 0.5, 3600, 6.0), gain=0.1, pan=0.3 * np.sin(j), rev=0.5)
t_end = np.arange(int(49.8 * SR), int(DUR * SR)) / SR
e = play_at(MUZ, muzak_pos_end(t_end))
fe = np.interp(t_end, [49.8, 50.6, DUR], [0, 1, 1])
m.add(49.8, (e[0] * fe, e[1] * fe), gain=0.42, rev=0.12)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep07.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
print('wrote', out, 'impact', round(T_IMP, 2), 'trip', round(T_TRIP, 2), 'hold', round(T_HOLD, 2))
