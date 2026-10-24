"""Soundtrack for post 12 (What if all the ice on Earth melted in 5 seconds?). Cue times match episodes/ep18cams.js.
Hook: the meltwater wall in slow motion: a sub hit on frame 1, a stretched roar, spray. Calm: Diamond Beach at sunset
(surf breaking on the black sand, wind, terns, the old ice fizzing and ticking as its trapped air escapes), the drone,
the motif, ticks speeding up to the melt. The 5 seconds: a hit, fizzing turning to a hiss, drips and splashes, whooshes
on each cut, the bergs collapsing, the glacier's roar rising. The flood: one huge growing roar, groans, crunches. Space:
muffled, sub booms on the cuts, a hum dying out as the cities go dark. You: wind, the roar coming closer and closer, a
racing heartbeat, breaths... cut to silence. End card."""
import sys, os
import numpy as np
from synth import *

DUR = 68.0
T = dict(HOOK=3.6, CUT1=7.4, MELT=12.0, BEACH=13.6, LAGOON=17.2, GONE=20.0, SPACE=33.0, CUTA=39.85, CUTB=43.7, POV=51.0, END=62.0)
m = Mix(DUR, seed=18)
rng = np.random.default_rng(1818)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)
def roar(dur, rng, lo=60, hi=900, grit=0.35):
    """a flood's roar: brown rumble + band-passed hiss, slowly churning"""
    t = tt(dur); r = norm(lp(noise(dur, rng, 'brown'), 220)) + grit * norm(bp(noise(dur, rng, 'pink'), lo * 4, hi))
    churn = 0.75 + 0.25 * norm(lp(noise(dur, rng, 'white'), 3.0))
    return norm(r * churn)
def fizz(dur, rng, rate=60, bright=1.0):
    """old glacier ice fizzing: tiny bubbles of compressed air popping out as it melts"""
    n = int(dur * SR); x = np.zeros(n)
    for _ in range(int(dur * rate)):
        i = int(rng.uniform(0, n - 400)); d = int(rng.uniform(0.0015, 0.005) * SR); f = rng.uniform(2500, 7000) * bright
        k = np.arange(d) / SR; x[i:i + d] += np.sin(2 * np.pi * f * k) * np.exp(-k / (d / SR * 0.25)) * rng.uniform(0.3, 1.0)
    return norm(hp(x, 1500))
def splash(rng, dur=0.6, big=1.0):
    t = tt(dur); x = norm(bp(noise(dur, rng, 'white'), 400 / big, 6000)) * np.exp(-t / (0.08 * big)) * (1 - np.exp(-t / 0.004))
    return norm(x + 0.6 * big * norm(lp(noise(dur, rng, 'brown'), 200)) * np.exp(-t / (0.2 * big)))
def surf(dur, rng):
    """waves breaking on a steep beach every ~8 s, then the hiss of the backwash over the sand"""
    t = tt(dur); out = np.zeros(len(t)); tw = 0.6
    while tw < dur - 0.5:
        k = (t - tw); e = np.where(k > 0, (1 - np.exp(-k / 0.08)) * np.exp(-k / 1.6), 0)
        wash = np.where(k > 0.8, np.exp(-(k - 0.8) / 2.2) * (1 - np.exp(-(k - 0.8) / 0.4)), 0)
        out += e * 1.0 + wash * 0.35; tw += 7.5 + rng.uniform(-1.2, 1.2)
    return norm(out * norm(bp(noise(dur, rng, 'pink'), 150, 5000)) + 0.15 * norm(lp(noise(dur, rng, 'brown'), 120)))
def tern(rng):
    """an arctic tern's harsh 'kee-arr'"""
    d = 0.32; t = tt(d); f = 2600 + 900 * np.sin(np.pi * t / d) - 1200 * t / d
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return norm(x * np.sin(np.pi * t / d) ** 0.6 * (0.7 + 0.3 * np.sin(2 * np.pi * 38 * t)))

motif = [69, 72, 76, 74, 72, 67, 69]          # A minor, glassy

# ---------- hook (0 -> 3.6): the wall in slow motion ----------
m.add(0.0, boom(rng, 3.8, 46, 20, 2.6, 0.5, 1.0), gain=0.9, rev=0.5)                        # the hit on frame 1
m.add(0.0, roar(3.7, rng, 50, 700, 0.25) * env_at(tt(3.7), [0, 0.3, 3.2, 3.7], [0.5, 1, 1, 0.3]), gain=0.55, rev=0.45)
m.add(0.2, groan(rng, 3.2, 52), gain=0.25, rev=0.5)
m.add(0.6, norm(lp(bp(noise(2.8, rng, 'white'), 300, 3000), 1800)) * env_at(tt(2.8), [0, 0.8, 2.8], [0, 1, 0.4]), gain=0.18, rev=0.6)   # spray, stretched
m.add(T['HOOK'] - 0.9, riser(rng, 0.9, 200, 3000, 2.0) * np.linspace(1, 0, int(0.9 * SR)), gain=0.1, rev=0.3)   # a downer into the cut
m.add(T['HOOK'], thud(rng, 52, 0.7), gain=0.5, rev=0.3)

# ---------- calm (3.6 -> 12): Diamond Beach at sunset ----------
C0, C1 = T['HOOK'], T['MELT']; dC = C1 - C0
m.add(C0, fade(surf(dC + 0.5, rng), 0.5, 0.2), gain=0.3, pan=-0.15, rev=0.35)
m.add(C0, fade(wind(rng, dC + 0.5, 150, 800, 0.2, 0.5), 0.6, 0.1), gain=0.1, rev=0.3)
m.add(C0, fade(fizz(dC + 0.3, rng, 45), 0.8, 0.1), gain=0.06, pan=0.25, rev=0.2)
for tb in [5.1, 8.3, 10.2]: m.add(tb, tern(rng), gain=0.05, pan=float(rng.uniform(-0.7, 0.7)), rev=0.5)
dr = drone([110.0, 164.81, 220.0, 261.63], dC + 0.3, rng, cutoff=1100, lfo=0.06)
m.add(C0, (fade(dr[0], 0.8, 0.1), fade(dr[1], 0.8, 0.1)), gain=0.05, rev=0.45)
for j, nn in enumerate(motif):
    tj = C0 + 0.5 + j * 0.85
    if tj < C1 - 1.6: m.add(tj, bell(midi(nn), rng, 2.0), gain=0.04, pan=0.3 * np.sin(j * 1.7), rev=0.65)
m.add(T['CUT1'] - 0.12, whoosh(rng, 0.5, 300, 3000, 0.5), gain=0.08, rev=0.3)
tk = C0 + 0.4
while tk < C1 - 0.05:
    rem = C1 - tk
    m.add(tk, tick(rng, 1.0 + (rem < 3) * 0.4, low=rem < 1.2), gain=0.06, pan=-0.1, rev=0.1)
    tk += 1.0 if rem > 6 else 0.5 if rem > 3 else 0.25 if rem > 1.2 else 0.12
m.add(C1 - 1.8, riser(rng, 1.8, 300, 6000, 2.2), gain=0.16, rev=0.3)

# ---------- the 5 seconds (12 -> 20) ----------
M0, M1 = T['MELT'], T['GONE']; dm = M1 - M0
m.add(M0, boom(rng, 2.0, 70, 36, 1.0, 0.7, 0.6), gain=0.45, rev=0.35)
m.add(M0, norm(fizz(dm, rng, 260, 1.1)) * env_at(tt(dm), [0, 0.6, 2.5, dm], [0.3, 1, 0.8, 0.4]), gain=0.12, rev=0.25)
m.add(M0 + 0.4, norm(bp(noise(dm - 0.4, rng, 'white'), 2000, 9000)) * env_at(tt(dm - 0.4), [0, 2, dm - 0.4], [0, 0.6, 1]), gain=0.05, rev=0.3)   # the hiss of everything melting
for k in range(5): m.add(M0 + 0.55 + k * 0.14, splash(rng, 0.25, 0.3), gain=0.04, pan=float(rng.uniform(-0.3, 0.3)), rev=0.2)   # the cubes go
for cut in [T['BEACH'], T['LAGOON']]:
    m.add(cut - 0.35, whoosh(rng, 0.4, 400, 4000, 0.6), gain=0.12, rev=0.3); m.add(cut, thud(rng, 64, 0.5), gain=0.4, rev=0.3)
for k in range(26):                                                                         # the blocks on the beach collapse
    tb = T['BEACH'] + 0.4 + 1.6 * (k / 26) ** 0.8 + rng.uniform(-0.08, 0.08)
    m.add(tb, splash(rng, 0.5, 0.6 + 0.6 * rng.uniform()), gain=0.06 + 0.04 * rng.uniform(), pan=float(rng.uniform(-0.8, 0.8)), rev=0.3)
for k in range(9):                                                                          # icebergs slump into the lagoon
    tb = 17.5 + 0.45 * k / 9 * 1.5 + rng.uniform(-0.05, 0.05)
    m.add(tb, splash(rng, 1.4, 2.2), gain=0.12, pan=float(rng.uniform(-0.6, 0.6)), rev=0.55)
m.add(18.3, roar(dm - 6.3 + 0.2, rng, 45, 600, 0.3) * env_at(tt(dm - 6.1), [0, 0.6, 1.9], [0, 0.6, 1]), gain=0.45, rev=0.5)   # the glacier lets go
m.add(18.4, groan(rng, 2.0, 46), gain=0.3, rev=0.5)
m.add(M1 - 0.9, riser(rng, 0.9, 300, 5000, 2.0), gain=0.14, rev=0.3)

# ---------- the flood (20 -> 33): the wall coming across the lagoon ----------
F0, F1 = T['GONE'], T['SPACE']; fd = F1 - F0
m.add(F0, boom(rng, 3.0, 40, 18, 2.0, 0.4, 1.0), gain=0.75, rev=0.55)
m.add(F0, roar(fd, rng, 40, 800, 0.4) * env_at(tt(fd), [0, 1, fd - 1.2, fd], [0.55, 0.7, 1, 1]), gain=0.6, rev=0.45)
m.add(F0, pad([55.0, 82.41, 110.0, 130.81], fd, rng, cutoff=600, attack=1.2, release=0.5, voices=2, harmonics=8), gain=0.08, rev=0.5)
for tg in [22.4, 26.8, 30.3]: m.add(tg, groan(rng, 2.6, 44 + 4 * rng.uniform()), gain=0.22, rev=0.55)
for tc in [24.1, 27.6, 29.9, 31.6]: m.add(tc, crunch(rng, 1.0), gain=0.12, pan=float(rng.uniform(-0.5, 0.5)), rev=0.45)
tk = F0 + 0.3
while tk < F1 - 0.3:                                                                        # the HUD's clock running fast
    m.add(tk, tick(rng, 0.8, low=True), gain=0.025, pan=-0.1, rev=0.1); tk += 0.5
m.add(F1 - 1.2, riser(rng, 1.2, 250, 6000, 2.2), gain=0.16, rev=0.3)

# ---------- space (33 -> 51): muffled; sub hits on the cuts; the cities' hum dies ----------
S0, S1 = T['SPACE'], T['POV']; sd = S1 - S0
m.add(S0, boom(rng, 4.0, 36, 16, 2.8, 0.3, 1.0), gain=0.8, rev=0.6)
m.add(S0, lp(roar(2.4, rng, 40, 500, 0.2), 300) * np.linspace(1, 0, int(2.4 * SR)), gain=0.45, rev=0.5)
m.add(S0, pad([110.0, 164.81, 220.0, 246.94], sd, rng, cutoff=900, attack=1.0, release=1.0, voices=2, harmonics=8), gain=0.08, rev=0.7)
for c in [T['CUTA'], T['CUTB']]:
    m.add(c - 0.5, whoosh(rng, 0.5, 300, 3000, 0.6), gain=0.1, rev=0.4); m.add(c, boom(rng, 3.0, 40, 18, 2.0, 0.3, 1.0), gain=0.6, rev=0.6)
m.add(46.0, norm(lp(np.sin(2 * np.pi * 120 * tt(4.0)) + 0.4 * np.sin(2 * np.pi * 240 * tt(4.0)), 900)) * env_at(tt(4.0), [0, 0.3, 3.0, 4.0], [0, 1, 0.5, 0]) * np.linspace(1, 0.4, int(4.0 * SR)), gain=0.05, rev=0.5)   # mains hum, dying
for j, nn in enumerate(motif):
    m.add(S0 + 1.0 + j * 1.1, bell(midi(nn - 12), rng, 2.6), gain=0.035, pan=0.3 * np.sin(j * 1.7), rev=0.75)
m.add(S1 - 1.0, riser(rng, 1.0, 300, 5000, 2.0), gain=0.14, rev=0.3)

# ---------- you (51 -> 62): the wall coming over Route 1 ----------
P0, P1 = T['POV'], 61.95; pd = P1 - P0
tg = tt(pd); near = np.minimum(1.0, (120.0 / np.maximum(1.0, 891 - 86 * tg)) ** 0.85)   # the wall's distance (ep18cams: wallX + lagF at your z)
m.add(P0, roar(pd, rng, 35, 1400, 0.55) * (0.25 + 0.75 * near), gain=0.85, rev=0.35)
m.add(P0, fade(wind(rng, pd, 200, 1400, 0.3, 0.6), 0.3, 0.05) * (0.4 + 0.6 * near), gain=0.14, rev=0.3)
tb, bpm = P0 + 0.5, 92.0
while tb < P1 - 0.2:
    m.add(tb, heartbeat(rng), gain=0.22, rev=0.1); bpm = min(165.0, bpm + 6.5); tb += 60.0 / bpm
for tbr in [55.6, 57.4, 58.9, 60.0, 60.9]:                     # breaths, faster and faster
    m.add(tbr, norm(bp(noise(0.5, rng, 'white'), 500, 2500)) * np.sin(np.pi * tt(0.5) / 0.5) ** 2, gain=0.08, rev=0.15)
m.add(P1 - 2.6, riser(rng, 2.6, 120, 2500, 2.4), gain=0.14, rev=0.3)
m.add(61.25, boom(rng, 0.8, 50, 24, 0.5, 0.9, 1.0) * np.linspace(1, 0.2, int(0.8 * SR)), gain=0.8, rev=0.2)   # it hits; cut at 61.95

# ---------- end card (62 -> 68) ----------
ep_ = pad([110.0, 164.81, 220.0, 261.63], DUR - T['END'] + 0.1, rng, cutoff=1500, attack=0.6, release=2.0, voices=2, harmonics=10)
m.add(T['END'] + 0.15, (fade(ep_[0], 0.6, 2.2), fade(ep_[1], 0.6, 2.2)), gain=0.08, rev=0.6)
for j, nn in enumerate(motif[:5]): m.add(T['END'] + 0.5 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)
m.add(T['END'] + 1.42, woodblock(rng, 1250), gain=0.05, rev=0.25)
m.add(T['END'] + 1.62, woodblock(rng, 1480), gain=0.04, rev=0.25)

# silence the instant the wall hits (61.95 -> 62.15) before the end card's pad
i0, i1 = int(61.95 * SR), int(62.15 * SR)
for arr in (m.L, m.R, m.rev_L, m.rev_R): arr[i0:i1] *= np.linspace(0.0, 0.0, i1 - i0); arr[int(61.9 * SR):i0] *= np.linspace(1, 0, i0 - int(61.9 * SR))

# ---------- the voiceover (audio/vo/ep18_vo.wav, made by tools/vo.py): the music ducks under it ----------
import wave
from scipy import signal
vp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vo', 'ep18_vo.wav')
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

out = sys.argv[1] if len(sys.argv) > 1 else 'out/ep18.wav'
render_phone(m, out, rev_time=2.6, target=-10.5, tp=-1.5, limit=True)
