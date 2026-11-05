"""Soundtrack for post 11 (What if every sneeze was twice as strong as the last?). Cue times match episodes/ep17cams.js
(the sneeze schedule SN is rebuilt here the same way).
Hook: sneeze 40 in slow motion: a stretched, sub-heavy boom, a slowed "choo", a rumble. Calm: Venice at golden hour
(water lapping on the quay, pigeons cooing, a far church bell), the drone, the motif, ticks speeding up; the itch ("ah...
ah..."). The fit: each sneeze a real "ah-choo"; from sneeze 13 a supersonic crack; from 20 a bang; from 25 booms that
grow with the energy; the Campanile's fall. Far: the booms become one rising roar. Space: muffled, a sub impact on 84,
the oceans' hiss. You: quiet wind and embers, the motif comes home, the next itch... cut. End card."""
import sys, os
import numpy as np
from synth import *

DUR = 68.0
T = dict(HOOK=3.6, CUT1=7.0, FIRST=11.0, WATER=25.0, FAR=36.0, SPACE=45.0, FACE=51.0, END=62.0)
SN = [11.0, 12.5, 13.8, 14.9, 15.85, 16.7, 17.45, 18.15, 18.8, 19.4]
SN += [19.4 + (n - 10) * 0.48 for n in range(11, 21)]
SN += [25.2 + (n - 21) * 0.38 for n in range(21, 46)]
SN += [36.2 + (n - 46) * 0.45 for n in range(46, 64)]
SN += [45.3 + (n - 64) * 0.085 for n in range(64, 85)]
SN += [47.25 + (n - 85) * 0.25 for n in range(85, 98)]
En = lambda n: 0.05 * 2 ** (n - 1)
m = Mix(DUR, seed=17)
rng = np.random.default_rng(1717)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)

def voiced(dur, f0, f1, lo, hi, rng, breath=0.5):
    """a voiced sound through a formant band: a glottal buzz gliding f0 -> f1 plus breath"""
    t = tt(dur); f = np.geomspace(f0, f1, len(t)); ph = 2 * np.pi * np.cumsum(f) / SR
    buzz = sum(np.sin(k * ph) / k ** 1.1 for k in range(1, 14))
    return norm(bp(buzz, lo, hi)) * (1 - breath) + breath * norm(bp(noise(dur, rng, 'white'), lo, hi * 1.4))
def ahh(rng, dur=0.55, f0=185, f1=245):
    """the 'ah' of the build-up: a rising, breathy vowel"""
    x = voiced(dur, f0, f1, 550, 1500, rng, 0.45); t = tt(dur)
    return norm(x * np.sin(np.pi * np.minimum(1, t / dur)) ** 0.8 * np.linspace(0.6, 1, len(t)))
def choo(rng, k=1.0):
    """the 'choo': a hissing burst ('tch') into a short voiced 'oo', falling in pitch"""
    d = 0.42; t = tt(d)
    burst = norm(bp(noise(d, rng, 'white'), 1500, 7000)) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.003))
    oo = voiced(d, 230, 150, 250, 950, rng, 0.35) * np.exp(-np.maximum(t - 0.03, 0) / 0.12) * (1 - np.exp(-t / 0.02))
    return norm(1.0 * burst + 0.8 * oo)

motif = [64, 67, 71, 74, 71, 67, 69]
# ---------- the hook (0 -> 3.6): sneeze 40 in slow motion ----------
m.add(0.0, boom(rng, 4.2, 36, 16, 2.6, 0.5, 1.0), gain=1.0, rev=0.55)
slow = voiced(3.4, 70, 45, 120, 600, rng, 0.55) * env_at(tt(3.4), [0, 0.15, 2.4, 3.4], [0, 1, 0.6, 0])          # the "choo", a thousand times slower
m.add(0.05, norm(slow), gain=0.22, rev=0.6)
m.add(0.0, norm(lp(noise(3.6, rng, 'brown'), 220)) * env_at(tt(3.6), [0, 0.2, 3.0, 3.6], [0, 1, 1, 0.3]), gain=0.35, rev=0.4)
m.add(0.0, norm(sweep_filter(noise(3.6, rng, 'white'), np.linspace(300, 2400, int(3.6 * SR)))) * env_at(tt(3.6), [0, 0.3, 3.6], [0, 0.6, 1]), gain=0.06, rev=0.5)
m.add(T['HOOK'] - 0.9, riser(rng, 0.9, 400, 6000, 2.0), gain=0.14, rev=0.3)

# ---------- Venice at golden hour, the countdown (3.6 -> 11) ----------
C0, C1 = T['HOOK'], T['FIRST']; dC = C1 - C0
lap = norm(lp(noise(DUR, rng, 'pink'), 900)) * (0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 0.31 * tt(DUR))) ** 2)   # water against the quay
m.add(C0, fade(lap[: int((T['FACE'] - C0) * SR)], 1.0, 1.0), gain=0.1, rev=0.25)
m.add(C0, fade(wind(rng, DUR - C0 - 6.0, 160, 800, 0.12, 0.35), 0.8, 2.0), gain=0.07, rev=0.2)
for k in range(14):                                                                                              # pigeons cooing near you
    tc = C0 + 0.6 + k * 0.9 + rng.uniform(0, 0.4)
    if tc > SN[8]: break
    m.add(tc, voiced(0.5, 330, 270, 200, 700, rng, 0.2) * np.sin(np.pi * tt(0.5) / 0.5) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * tt(0.5))), gain=0.03, pan=float(rng.uniform(-0.6, 0.6)), rev=0.3)
for tb in [4.4, 6.9, 9.4]: m.add(tb, bell(midi(57), rng, 3.5), gain=0.025, pan=-0.5, rev=0.8)                   # a far church bell
m.add(T['CUT1'] - 0.1, whoosh(rng, 0.5, 300, 3000, 0.5), gain=0.1, rev=0.3)
tk = T['HOOK']
while tk < C1 - 0.05:
    rem = C1 - tk
    m.add(tk, tick(rng, 1.0 + (rem < 3) * 0.4, low=rem < 1.2), gain=0.06, pan=-0.1, rev=0.1)
    tk += 1.0 if rem > 6 else 0.5 if rem > 3 else 0.25 if rem > 1.2 else 0.12
dr = drone([164.81, 246.94, 329.63, 392.0], dC + 0.3, rng, cutoff=1200, lfo=0.06)
m.add(C0, (fade(dr[0], 0.8, 0.1), fade(dr[1], 0.8, 0.1)), gain=0.05, rev=0.4)
for j, nn in enumerate(motif):
    tj = C0 + 0.4 + j * 0.72
    if tj < C1 - 1.8: m.add(tj, bell(midi(nn), rng, 1.8), gain=0.04, pan=0.3 * np.sin(j * 1.7), rev=0.6)
m.add(9.15, ahh(rng, 0.6, 175, 225), gain=0.3, rev=0.15); m.add(10.05, ahh(rng, 0.75, 190, 260), gain=0.36, rev=0.15)   # "ah... ah..."
m.add(C1 - 1.6, riser(rng, 1.6, 300, 5500, 2.2), gain=0.16, rev=0.3)

# ---------- the sneezes ----------
for n in range(1, 98):
    ts = SN[n - 1]; E = En(n); L = np.log10(E / 0.05) / np.log10(2)        # n - 1
    space = ts >= T['SPACE']; far = T['FAR'] <= ts < T['SPACE']
    if n <= 24 and n > 1:
        pre = min(0.32, 0.6 * (ts - SN[n - 2]))
        if pre > 0.12: m.add(ts - pre, ahh(rng, pre, 200, 250), gain=0.16, rev=0.12)
    if n <= 30: m.add(ts - 0.01, choo(rng), gain=min(0.75, 0.42 + 0.012 * n), pan=0.0, rev=0.15)
    if 13 <= n < 25: m.add(ts + 0.005, norm(hp(noise(0.06, rng, 'white'), 2000)) * np.exp(-tt(0.06) / 0.008), gain=0.12 + 0.02 * (n - 13), rev=0.3)   # the crack of a supersonic jet
    if 18 <= n < 25: m.add(ts + 0.02, boom(rng, 1.4, 70, 34, 0.7, 0.8, 0.5), gain=0.22 + 0.04 * (n - 18), rev=0.35)
    if 25 <= n < 46: m.add(ts + 0.02, boom(rng, 2.2 + 0.05 * (n - 25), 58 - 0.6 * (n - 25), 24, 1.0 + 0.04 * (n - 25), 0.9, 0.9), gain=min(0.95, 0.5 + 0.025 * (n - 25)), pan=float(rng.uniform(-0.15, 0.15)), rev=0.45)
    if far: m.add(ts + 0.05, boom(rng, 3.2, 44, 18, 2.0, 0.5, 1.0), gain=0.7, rev=0.55)
    if space and n % 3 == 0: m.add(ts, lp(boom(rng, 2.0, 40, 20, 1.2, 0.2, 0.8), 900), gain=0.25, rev=0.6)
m.add(T['WATER'] - 0.1, whoosh(rng, 0.45, 300, 2500, 0.5), gain=0.1, rev=0.3)
# the Campanile slumps (sneeze 45): a groan, crunching masonry, a long rumble
m.add(SN[44] + 0.15, groan(rng, 2.4, 70), gain=0.35, rev=0.5)
m.add(SN[44] + 0.3, crunch(rng, 1.4), gain=0.3, rev=0.45)
m.add(SN[44] + 0.25, norm(lp(noise(2.4, rng, 'brown'), 160)) * env_at(tt(2.4), [0, 0.3, 1.6, 2.4], [0, 1, 0.7, 0]), gain=0.45, rev=0.5)
m.add(T['FAR'] - 0.7, riser(rng, 0.7, 300, 4000, 2.0), gain=0.14, rev=0.3)

# ---------- far: the roar of fireballs outgrowing each other (36 -> 45) ----------
F0, F1 = T['FAR'], T['SPACE']; fd = F1 - F0
m.add(F0, norm(lp(noise(fd, rng, 'brown'), 300)) * env_at(tt(fd), [0, 2.2, fd - 0.6, fd], [0.2, 0.8, 1, 0]), gain=0.4, rev=0.5)
m.add(F0 + 2.2, braam(rng, 3.4, 41.2) if 'braam' in globals() else boom(rng, 3.4, 41, 20, 2.0, 0.4, 1.0), gain=0.25, rev=0.5)
m.add(F0, pad([82.41, 123.47, 164.81], fd, rng, cutoff=700, attack=1.5, release=0.6, voices=2, harmonics=8), gain=0.08, rev=0.5)
m.add(F1 - 0.9, riser(rng, 0.9, 300, 5000, 2.0), gain=0.14, rev=0.3)

# ---------- space: muffled; sneeze 84's impact; the oceans' hiss (45 -> 51) ----------
S0, S1 = T['SPACE'], T['FACE']; sd = S1 - S0
m.add(S0, pad([110.0, 164.81, 220.0, 277.18], sd, rng, cutoff=900, attack=1.0, release=1.0, voices=2, harmonics=8), gain=0.08, rev=0.7)
m.add(SN[83], boom(rng, 4.0, 34, 15, 2.6, 0.3, 1.0), gain=0.85, rev=0.6)
m.add(48.4, norm(bp(noise(S1 - 48.4, rng, 'white'), 1500, 7000)) * env_at(tt(S1 - 48.4), [0, 1.5, S1 - 48.6, S1 - 48.4], [0, 1, 1, 0]), gain=0.05, rev=0.6)
m.add(S1 - 0.9, riser(rng, 0.9, 400, 4000, 2.0), gain=0.12, rev=0.3)

# ---------- you, not a scratch (51 -> 62): wind, embers, the motif; the next itch ----------
B0 = T['FACE']; bd = T['END'] - B0
m.add(B0, fade(wind(rng, bd, 120, 600, 0.2, 0.5), 0.6, 0.05), gain=0.12, rev=0.3)
crk = np.zeros(int(bd * SR))
for _ in range(int(bd * 9)):
    i = int(rng.uniform(0, len(crk) - 800)); d = int(rng.uniform(0.002, 0.008) * SR); crk[i:i + d] += rng.uniform(-1, 1, d) * np.exp(-np.arange(d) / (d * 0.3))
m.add(B0, norm(hp(crk, 1200)), gain=0.03, rev=0.4)                                                           # embers
m.add(B0, pad([164.81, 246.94, 293.66, 392.0], bd, rng, cutoff=1300, attack=1.5, release=0.3, voices=3, harmonics=10), gain=0.08, rev=0.6)
for j, nn in enumerate(motif):
    m.add(B0 + 0.6 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.65)
m.add(58.9, ahh(rng, 0.8, 170, 220), gain=0.3, rev=0.15); m.add(60.3, ahh(rng, 1.0, 185, 255), gain=0.36, rev=0.15); m.add(61.35, ahh(rng, 0.6, 200, 280), gain=0.4, rev=0.12)
m.add(T['END'] - 2.2, riser(rng, 2.2, 250, 6500, 2.4), gain=0.2, rev=0.3)

# ---------- end card (62 -> 68) ----------
ep_ = pad([164.81, 246.94, 329.63, 392.0], DUR - T['END'] + 0.1, rng, cutoff=1500, attack=0.6, release=2.0, voices=2, harmonics=10)
m.add(T['END'], (fade(ep_[0], 0.6, 2.2), fade(ep_[1], 0.6, 2.2)), gain=0.08, rev=0.6)
for j, nn in enumerate(motif[:5]): m.add(T['END'] + 0.4 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)
m.add(T['END'] + 1.42, woodblock(rng, 1250), gain=0.05, rev=0.25)
m.add(T['END'] + 1.62, woodblock(rng, 1480), gain=0.04, rev=0.25)

# ---------- the voiceover (audio/vo/ep17_vo.wav, made by tools/vo.py): the music ducks under it ----------
import wave
vp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vo', 'ep17_vo.wav')
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

out = sys.argv[1] if len(sys.argv) > 1 else 'ep17.wav'
render_phone(m, out, rev_time=2.6, target=-10.5, tp=-1.5, limit=True)
print('wrote', out)
