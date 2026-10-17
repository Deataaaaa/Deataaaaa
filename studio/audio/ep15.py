"""Soundtrack for post 9 (What if air became as thick as honey for 5 seconds?). Cue times match episodes/ep15cams.js.
Hook: a hit, then the thick air's muffled world (a low hum, a heartbeat). Calm: London in the rain (hiss, patter on the
umbrella, traffic, tyres on wet road), a plane passing over, a warm drone, the motif, ticks speeding up to zero.
Zero: the sound dies (a sub thump, then near silence: only the lowest rumble carries, and your own heartbeat). The
bridge: muffled thuds, the score low. The plane: its engines spooling down (a falling whine), clunks as the power
drops and the ram air turbine swings out. Space: hush. Second 5: everything slams back (rain, a gasp, the city), then the
plane gliding on: wind over the airframe, no engines. End card: the motif, Apple's two pops."""
import sys
import numpy as np
from synth import *

DUR = 75.0
T = dict(HOOK=3.6, CUT1=7.0, THICK=11.0, BRIDGE=23.0, PLANE=33.0, SPACE=44.0, BACK2=50.0, BACK=51.0, RET2=56.0, MEME=62.0, WAVE=65.0, END=69.6)
m = Mix(DUR, seed=15)
rng = np.random.default_rng(1515)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)

def rain(dur, r, k=1.0):
    """rain: a broadband hiss (high-passed pink noise) with a slow swell"""
    t = tt(dur); x = bp(noise(dur, r, 'pink'), 900, 9000) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.13 * t + r.uniform(0, 6)))
    return norm(x) * k
def patter(dur, r, rate=26.0):
    """drops on the umbrella's nylon: short soft ticks at random"""
    n = int(dur * SR); x = np.zeros(n)
    for _ in range(int(dur * rate)):
        i = int(r.uniform(0, n - 2000)); d = int(r.uniform(0.006, 0.02) * SR); e = np.exp(-np.arange(d) / (d * 0.18))
        x[i:i + d] += bp(r.standard_normal(d), r.uniform(1200, 2500), r.uniform(3500, 7000)) * e * r.uniform(0.3, 1.0)
    return norm(x)
def tyres(dur, r):
    """traffic on a wet road: a hiss that swells as cars pass"""
    t = tt(dur); x = bp(noise(dur, r, 'white'), 400, 5000); env = np.zeros_like(t)
    for c in r.uniform(0, dur, 6): env += np.exp(-((t - c) / 0.9) ** 2)
    return norm(x * (0.25 + env))
def jet_pass(dur, r, t0):
    """an airliner passing over at ~1,300 m: a broadband roar with a fan whine, rising, peaking at t0, falling (Doppler)"""
    t = tt(dur); env = np.exp(-((t - t0) / (dur * 0.28)) ** 2)
    fw = 1650 * (1 + 0.035 * np.tanh((t0 - t) / 1.2)); ph = 2 * np.pi * np.cumsum(fw) / SR
    x = norm(lp(noise(dur, r, 'brown'), 900)) + 0.12 * np.sin(ph) * env
    return norm(x * env)
def spool_down(dur, r, f0=1400.0, f1=60.0, tau=1.6):
    """a turbofan running down: a whine falling in pitch, its roar fading"""
    t = tt(dur); f = f1 + (f0 - f1) * np.exp(-t / tau); ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3.1 * ph)) * np.exp(-t / (tau * 2.2))
    x += 0.6 * lp(noise(dur, r, 'brown'), 500) * np.exp(-t / tau)
    return norm(x)
def clunk(r, f=180.0):
    d = 0.45; t = tt(d); x = np.sin(2 * np.pi * f * t) * np.exp(-t * 18) + 0.5 * bp(r.standard_normal(len(t)), 300, 2500) * np.exp(-t * 40)
    return norm(x)
def splash(r):
    # a ball of water hitting wet stone: a heavy slap, a spray of droplets pattering after it
    d = 0.9; t = tt(d); x = bp(r.standard_normal(len(t)), 180, 2600) * np.exp(-t * 16) + 0.4 * bp(r.standard_normal(len(t)), 2000, 7000) * np.exp(-t * 30)
    for k in range(9):
        t0 = 0.05 + 0.07 * k + r.uniform(0, 0.05); i0 = int(t0 * SR); n = min(len(t) - i0, int(0.03 * SR))
        x[i0:i0 + n] += (0.35 - 0.03 * k) * bp(r.standard_normal(n), 1500, 6000) * np.exp(-np.arange(n) / SR * 120)
    return norm(x)

def gasp(r, d=0.75):
    """a sharp breath in: band-passed noise, rising then cut"""
    t = tt(d); fc = 900 + 1500 * (t / d); x = sweep_filter(noise(d, r, 'white'), list(zip(fc * 0.5, fc * 1.8)), 'bandpass')
    return norm(norm(x) * np.sin(np.pi * np.minimum(1, t / d) ** 0.7) ** 1.2)
def downer(r, d=0.9, f0=1800, f1=90):
    n = int(d * SR); k = np.linspace(0, 1, n); fc = f0 * (f1 / f0) ** (k ** 0.7)
    x = sweep_filter(noise(d, r, 'pink'), list(zip(fc * 0.6, fc * 1.5)), 'bandpass'); return norm(norm(x) + 0.35 * np.sin(2 * np.pi * np.cumsum(fc * 0.25) / SR)) * (1 - k) ** 1.6
def braam(r, d=2.8, f=55.0):
    x = sum(saw_voice(f * k, d, harmonics=24, detune_cents=c) for k, c in [(1, -6), (1, 7), (1.5, 0), (2, -4), (2, 5), (3, 2)])
    k = np.linspace(0, 1, len(x)); fc = 180 + 1300 * np.sin(np.pi * np.minimum(1, k * 1.6)) ** 0.7 * (1 - k) ** 0.5
    x = np.tanh(2.5 * norm(sweep_filter(x, fc))) * env_at(tt(d), [0, 0.06, d * 0.5, d], [0, 1, 0.7, 0]); return norm(x)

motif = [64, 67, 71, 74, 71, 67, 69]
# ---------- the hook (0 -> 3.6): a hit, then the thick air's muffled world ----------
m.add(0.0, boom(rng, 4.0, 46, 20, 2.2, 1.0, 1.0), gain=0.95, rev=0.5)
m.add(0.05, braam(rng, 3.4, 46.25), gain=0.33, rev=0.5)
hk = lp(noise(3.6, rng, 'brown'), 180) * env_at(tt(3.6), [0, 0.2, 3.3, 3.6], [0, 1, 0.8, 0])
m.add(0.0, norm(hk), gain=0.5, rev=0.3)
for k in range(3): m.add(0.6 + k * 0.95, heartbeat(rng), gain=0.2, rev=0.15)
m.add(T['HOOK'] - 0.9, riser(rng, 0.9, 400, 6000, 2.0), gain=0.15, rev=0.3)

# ---------- London in the rain + the countdown (3.6 -> 11) ----------
C0, C1 = T['HOOK'], T['THICK']; dC = C1 - C0
m.add(C0, (fade(rain(dC + 0.05, rng), 0.3, 0.004), fade(rain(dC + 0.05, np.random.default_rng(9)), 0.3, 0.004)), gain=0.3, rev=0.2)
m.add(T['CUT1'], fade(patter(C1 - T['CUT1'] + 0.05, rng), 0.2, 0.004), gain=0.12, pan=0.15, rev=0.1)
m.add(C0, fade(tyres(dC + 0.05, rng), 0.3, 0.004), gain=0.12, rev=0.3)
m.add(C0, fade(norm(lp(noise(dC + 0.05, rng, 'brown'), 260)), 0.3, 0.004), gain=0.08, rev=0.2)          # the city's hum
m.add(C0, fade(jet_pass(dC + 0.05, rng, 4.6), 0.3, 0.004), gain=0.22, pan=-0.2, rev=0.4)                # a plane on approach
m.add(T['CUT1'] - 0.1, whoosh(rng, 0.5, 300, 3000, 0.5), gain=0.14, rev=0.3)                            # the cut onto the deck
tk = T['HOOK']
while tk < T['THICK'] - 0.05:
    rem = T['THICK'] - tk
    m.add(tk, tick(rng, 1.0 + (rem < 3) * 0.4, low=rem < 1.2), gain=0.065, pan=-0.1, rev=0.1)
    tk += 1.0 if rem > 6 else 0.5 if rem > 3 else 0.25 if rem > 1.2 else 0.12
dr = drone([164.81, 246.94, 329.63, 392.0], dC + 0.3, rng, cutoff=1200, lfo=0.06)
m.add(C0, (fade(dr[0], 0.8, 0.1), fade(dr[1], 0.8, 0.1)), gain=0.05, rev=0.4)
for j, nn in enumerate(motif):
    tj = C0 + 0.4 + j * 0.75
    if tj < C1 - 0.5: m.add(tj, bell(midi(nn), rng, 1.8), gain=0.04, pan=0.3 * np.sin(j * 1.7), rev=0.6)
m.add(C1 - 2.4, riser(rng, 2.4, 300, 6500, 2.2), gain=0.22, rev=0.3)

# ---------- the thick air (11 -> 33): the sound dies; only the lowest rumble, and your heartbeat ----------
N0, N1 = T['THICK'], T['PLANE']; nd = N1 - N0
m.add(N0, boom(rng, 3.0, 40, 22, 1.6, 0.25, 0.4), gain=0.75, rev=0.2)                                  # a sub thump, no top
rum = lp(noise(nd, rng, 'brown'), 110) * env_at(tt(nd), [0, 0.4, nd - 1, nd], [0, 1, 1, 0])
m.add(N0, norm(rum), gain=0.32, rev=0.1)
tone = sum(np.sin(2 * np.pi * f * tt(nd)) / (k + 1) for k, f in enumerate([6200, 6230]))                # the silence rings
m.add(N0, norm(tone) * env_at(tt(nd), [0, 1.5, nd - 1, nd], [0, 0.4, 0.25, 0]), gain=0.008, rev=0.3)
pd = pad([82.41, 123.47, 164.81, 196.0], nd, rng, cutoff=700, attack=2.5, release=0.8, voices=2, harmonics=8)
m.add(N0, pd, gain=0.08, rev=0.5)
hb = N0 + 0.9
while hb < N1 - 0.4:                                                     # your heart, faster as the breath doesn't come
    m.add(hb, heartbeat(rng), gain=0.22, rev=0.08); hb += 1.05 - 0.35 * min(1, (hb - N0) / nd)
for tq in [24.2, 26.1, 28.4, 30.3]: m.add(tq, boom(rng, 1.2, 70, 40, 0.5, 0.1, 0.2), gain=0.2, rev=0.3)  # muffled thuds
m.add(N1 - 1.0, riser(rng, 1.0, 200, 2500, 1.6), gain=0.12, rev=0.3)
m.add(N1 - 0.9, downer(rng, 0.9, 1400, 80), gain=0.12, rev=0.3)

# ---------- the plane (33 -> 44): engines running down, the power dropping, the RAT ----------
P0, P1 = T['PLANE'], T['SPACE']; pdur = P1 - P0
m.add(P0, boom(rng, 2.5, 52, 24, 1.2, 0.6, 0.8), gain=0.6, rev=0.4)
m.add(P0, spool_down(pdur, rng, 520, 40, 3.0), gain=0.3, rev=0.3)
m.add(P0, norm(lp(noise(pdur, rng, 'brown'), 160)) * env_at(tt(pdur), [0, 1, pdur - 0.5, pdur], [0, 1, 1, 0]), gain=0.25, rev=0.2)
m.add(34.96, clunk(rng, 140), gain=0.3, rev=0.3)                                                       # the generators drop
m.add(37.7, clunk(rng, 220), gain=0.26, rev=0.3); m.add(38.1, metal_hit(rng, 900, 0.6), gain=0.05, rev=0.4)   # the RAT
m.add(P0, pad([73.42, 110.0, 146.83, 174.61], pdur, rng, cutoff=800, attack=1.0, release=1.0, voices=2, harmonics=10), gain=0.08, rev=0.6)
m.add(P1 - 1.0, riser(rng, 1.0, 300, 4000, 2.0), gain=0.16, rev=0.3)

# ---------- space (44 -> 50): hush, the motif slowed ----------
S0, S1 = T['SPACE'], T['BACK2']; sd = S1 - S0
m.add(S0, boom(rng, 3.0, 60, 30, 1.6, 0.3, 0.6), gain=0.35, rev=0.7)
m.add(S0, pad([82.41, 123.47, 164.81, 246.94], sd, rng, cutoff=1100, attack=1.0, release=1.0, voices=2, harmonics=10), gain=0.07, rev=0.7)
for j, nn in enumerate(motif[:5]): m.add(S0 + 0.8 + j * 1.0, bell(midi(nn - 12), rng, 2.5), gain=0.04, pan=0.3 * np.sin(j * 1.7), rev=0.7)

# ---------- second 5 (50 -> 56): the last frozen second, then everything slams back ----------
B0, B1 = T['BACK2'], T['RET2']
m.add(B0, norm(lp(noise(1.0, rng, 'brown'), 110)), gain=0.3, rev=0.1)
for k in range(3): m.add(B0 + 0.05 + k * 0.32, heartbeat(rng), gain=0.24, rev=0.08)
m.add(T['BACK'] - 1.0, riser(rng, 1.0, 200, 9000, 2.6), gain=0.3, rev=0.3)
m.add(T['BACK'], boom(rng, 2.5, 50, 22, 1.2, 1.0, 1.0), gain=0.85, rev=0.4)
bd = B1 - T['BACK']
m.add(T['BACK'], (fade(rain(bd, rng, 1.0), 0.01, 0.2), fade(rain(bd, np.random.default_rng(31), 1.0), 0.01, 0.2)), gain=0.42, rev=0.25)
m.add(T['BACK'], fade(patter(bd, rng, 60), 0.01, 0.2), gain=0.18, rev=0.1)
m.add(T['BACK'], fade(tyres(bd, rng), 0.05, 0.2), gain=0.12, rev=0.3)
m.add(T['BACK'] + 0.05, gasp(rng), gain=0.3, rev=0.15)
m.add(T['BACK'] + 0.55, splash(rng), gain=0.24, rev=0.2)   # the goldfish's ball of water drops and splashes (off screen)
m.add(T['BACK'] + 1.6, gasp(rng, 0.6), gain=0.18, rev=0.15)
m.add(T['BACK'], pad([164.81, 196.0, 246.94, 329.63], bd, rng, cutoff=1300, attack=0.4, release=0.6, voices=2, harmonics=10), gain=0.06, rev=0.5)
m.add(B1 - 0.9, downer(rng, 0.9, 1600, 90), gain=0.14, rev=0.3)

# ---------- the plane gliding on (56 -> 62): wind over the airframe, rain on it, no engines ----------
G0, G1 = T['RET2'], T['MEME']; gd = G1 - G0
m.add(G0, boom(rng, 2.0, 56, 26, 1.0, 0.5, 0.7), gain=0.5, rev=0.4)
wind = sweep_filter(noise(gd, rng, 'pink'), list(zip(np.full(int(gd * SR), 250.0), np.full(int(gd * SR), 1800.0))), 'bandpass')
m.add(G0, norm(wind) * env_at(tt(gd), [0, 0.3, gd - 0.4, gd], [0, 1, 1, 0]), gain=0.3, rev=0.3)
m.add(G0, fade(rain(gd, rng, 1.0), 0.2, 0.4), gain=0.2, rev=0.3)
whir = np.sin(2 * np.pi * np.cumsum(np.full(int(gd * SR), 95.0)) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * tt(gd)))
m.add(G0, norm(bp(whir, 60, 900)) * env_at(tt(gd), [0, 0.5, gd - 0.4, gd], [0, 1, 1, 0]), gain=0.06, rev=0.3)   # the RAT
m.add(G0, pad([110.0, 130.81, 164.81, 220.0], gd, rng, cutoff=1100, attack=0.8, release=1.0, voices=2, harmonics=10), gain=0.07, rev=0.6)
m.add(G1 - 0.9, riser(rng, 0.9, 400, 5000, 2.0), gain=0.15, rev=0.3)

# ---------- the meme (62 -> 69.6): the Thames drains (a sucking rumble, the rain far off), then on the hit at 65 a wave
# 400 m tall shoots up: braam, boom and a roar that swells until the hard cut to the end card ----------
M0, M1, M2 = T['MEME'], T['WAVE'], T['END']; md = M1 - M0; wd = M2 - M1
m.add(M0, boom(rng, 1.6, 48, 24, 0.8, 0.4, 0.6), gain=0.35, rev=0.4)
m.add(M0, fade(rain(md, rng, 0.6), 0.3, 0.3), gain=0.1, rev=0.3)
suck = sweep_filter(noise(md, rng, 'brown'), list(zip(np.linspace(900, 120, int(md * SR)), np.linspace(2200, 400, int(md * SR)))), 'bandpass')
m.add(M0, norm(suck) * env_at(tt(md), [0, 0.6, md - 0.3, md], [0, 1, 0.8, 0]), gain=0.32, rev=0.35)
m.add(M0, pad([98.0, 116.54, 146.83], md, rng, cutoff=900, attack=0.8, release=0.3, voices=2, harmonics=10), gain=0.08, rev=0.6)
m.add(M1 - 1.2, riser(rng, 1.2, 150, 7000, 2.4), gain=0.3, rev=0.3)
m.add(M1, braam(rng, 3.2, 49.0), gain=0.75, rev=0.45)
m.add(M1, boom(rng, 2.6, 46, 20, 1.2, 1.0, 1.0), gain=0.9, rev=0.45)
roar = sweep_filter(noise(wd, rng, 'brown'), list(zip(np.linspace(60, 90, int(wd * SR)), np.linspace(1400, 2600, int(wd * SR)))), 'bandpass')
m.add(M1, norm(roar) * env_at(tt(wd), [0, 0.15, wd - 0.05, wd], [0, 0.7, 1, 0]), gain=0.55, rev=0.3)
crash = bp(noise(wd, rng, 'white'), 800, 6000) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * tt(wd)))
m.add(M1 + 0.2, norm(crash) * env_at(tt(wd), [0, 0.8, wd - 0.25, wd], [0, 0.6, 1, 0])[:len(crash)], gain=0.16, rev=0.3)

# ---------- end card (69.6 -> 75) ----------
ep_ = pad([164.81, 246.94, 329.63, 392.0], DUR - T['END'] + 0.1, rng, cutoff=1500, attack=1.0, release=2.0, voices=2, harmonics=10)
m.add(T['END'], (fade(ep_[0], 0.8, 2.2), fade(ep_[1], 0.8, 2.2)), gain=0.08, rev=0.6)
for j, nn in enumerate(motif[:5]): m.add(T['END'] + 0.4 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)
m.add(63.42, woodblock(rng, 1250), gain=0.05, rev=0.25)
m.add(63.62, woodblock(rng, 1480), gain=0.04, rev=0.25)

# ---------- the voiceover (audio/vo/ep15_vo.wav, made by tools/vo.py): the music ducks under it ----------
import os, wave
vp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vo', 'ep15_vo.wav')
if os.path.exists(vp):
    with wave.open(vp, 'rb') as w: vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    vo = signal.resample_poly(vo, SR, vsr)[: m.n]
    vo = hp(vo, 90) + 0.3 * bp(vo, 2200, 5200)
    env = np.sqrt(signal.sosfilt(signal.butter(1, 12, 'lowpass', fs=SR, output='sos'), vo * vo) + 1e-12)
    vo = vo * np.where(env > 0.06, (0.06 / env) ** 0.45, 1.0)
    duck = signal.sosfilt(signal.butter(1, 3, 'lowpass', fs=SR, output='sos'), np.clip(env / 0.03, 0, 1))
    duck = 1.0 - 0.5 * np.clip(duck, 0, 1)
    n = len(duck); m.L[:n] *= duck; m.R[:n] *= duck; m.rev_L[:n] *= duck; m.rev_R[:n] *= duck
    m.add(0.0, norm(vo), gain=0.95, rev=0.06)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep15.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
print('wrote', out)
