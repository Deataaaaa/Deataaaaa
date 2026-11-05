"""Soundtrack for post 13 (What if beauty standards were reversed for 5 years?). Cue times match episodes/ep19cams.js.
Hook: midnight in slow motion: a sub hit on frame 1, the crowd's cheer stretched low, the Lights' wipe as a long shimmer,
the cup tumbling. Calm: Piccadilly at 11:59 on New Year's Eve (crowd, buses on wet tarmac), a music-box motif, the drone,
ticks speeding up to midnight. The flip: a hit, the crowd's cheer, fireworks over the river, notification pings pouring
in, then a playful groove for the years (filtered under the snow of Year 2; a cheer and camera shutters when your face
goes up; a ragtime lick for the 1920s). Year 5: the groove stops, the last ticks, the flip back (a tape rewind), the cheer,
your likes deflating; the motif for the question. End card."""
import sys, os
import numpy as np
from synth import *

DUR = 68.0
T = dict(HOOK=3.6, FLIP=12.0, Y1=19.6, Y2=28.4, Y3=36.3, Y4=44.6, Y5=52.2, BACK=54.0, CRASH=56.0, END=62.0)
WIPES = [24.3, 29.0, 37.2, 45.0]
LANDS = [10.05, 18.75, 22.25, 31.45, 39.65, 48.05, 53.85]          # the bin's neighbour's drops landing on his pile
m = Mix(DUR, seed=19)
rng = np.random.default_rng(1919)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)
def crowd(dur, rng, size=1.0):
    """a crowd's murmur: many band-passed voices, slowly swelling"""
    out = np.zeros(int(dur * SR))
    for k in range(10):
        f0 = rng.uniform(260, 900); v = bp(noise(dur, rng, 'pink'), f0, f0 * 2.2)
        out += norm(v) * (0.5 + 0.5 * norm(lp(noise(dur, rng, 'white'), 1.5 + rng.uniform(0, 2))))
    return norm(out + 0.3 * norm(lp(noise(dur, rng, 'brown'), 300)) * size)
def cheer(dur, rng):
    """a crowd cheering: bright voices and whistles, a fast rise, a long tail"""
    t = tt(dur); x = norm(bp(noise(dur, rng, 'pink'), 500, 4500)) * (1 - np.exp(-t / 0.08)) * np.exp(-t / (dur * 0.45))
    for _ in range(4):
        t0 = rng.uniform(0.05, dur * 0.5); d = rng.uniform(0.4, 0.9); f = rng.uniform(1800, 2600)
        k = np.clip((t - t0) / d, 0, 1); x += 0.25 * np.sin(2 * np.pi * np.cumsum(f * (1 + 0.15 * np.sin(np.pi * k))) / SR) * np.sin(np.pi * k) ** 2
    return norm(x)
def thump(rng, dist=1.0):
    """a firework far away over the river: a soft boom and a crackle"""
    d = 2.2; t = tt(d); b = np.sin(2 * np.pi * (50 + 30 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.35) * (1 - np.exp(-t / 0.004))
    c = np.zeros(len(t))
    for _ in range(40):
        i = int(rng.uniform(0.3, 1.8) * SR); c[i:i + 60] += rng.uniform(-1, 1) * np.exp(-np.arange(60) / 12)
    return norm(lp(b, 400) + 0.25 * hp(c, 2000) * dist)
def ping(f=1568.0, dur=0.35):
    """a phone notification: two soft sine tones"""
    t = tt(dur); a = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.09); b = np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-np.maximum(t - 0.07, 0) / 0.12) * (t > 0.07)
    return norm(a + 0.8 * b)
def shutter(rng):
    t = tt(0.12); x = norm(bp(noise(0.12, rng, 'white'), 2000, 8000)) * (np.exp(-t / 0.008) + 0.6 * np.exp(-np.maximum(t - 0.05, 0) / 0.01) * (t > 0.05))
    return norm(x)
def clatter(rng, big=1.0):
    """a cup or a can landing on a heap of rubbish: a hollow knock, a rattle, plastic crackle"""
    d = 0.5 * big; t = tt(d); k = np.sin(2 * np.pi * rng.uniform(380, 700) * t) * np.exp(-t / 0.03)
    r = norm(bp(noise(d, rng, 'white'), 1500, 7000)) * np.exp(-t / (0.08 * big)) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
    return norm(k + 0.7 * r)
def rewind(rng, dur=0.9):
    """a tape rewinding: a rising, warbling whine"""
    t = tt(dur); f = 300 * np.exp(np.log(12) * t / dur); x = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.04 * np.sin(2 * np.pi * 23 * t))) / SR)
    return norm(lp(x, 4000) * np.sin(np.pi * t / dur) ** 0.5 + 0.3 * norm(bp(noise(dur, rng, 'white'), 2000, 6000)) * t / dur)
def traffic(dur, rng):
    """the Circus: a bus idling and pulling away, tyres hissing on wet tarmac now and then"""
    t = tt(dur); hum = norm(lp(noise(dur, rng, 'brown'), 160)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.07 * t))
    hiss = np.zeros(len(t)); tw = rng.uniform(0.5, 2.0)
    while tw < dur - 1:
        k = t - tw; hiss += np.where((k > 0) & (k < 2.4), np.sin(np.pi * np.clip(k / 2.4, 0, 1)) ** 2, 0); tw += rng.uniform(2.2, 4.5)
    return norm(hum + 0.5 * norm(bp(noise(dur, rng, 'white'), 900, 6000)) * hiss)

motif = [76, 79, 83, 81, 79, 74, 76]          # E minor, a music box
groove_root = [40, 40, 43, 38]               # E, E, G, D (bass, one bar each)

# ---------- hook (0 -> 3.6): midnight in slow motion ----------
m.add(0.0, boom(rng, 3.8, 44, 20, 2.6, 0.4, 1.0), gain=0.9, rev=0.55)                          # the hit on frame 1
m.add(0.0, lp(cheer(3.7, rng), 900) * env_at(tt(3.7), [0, 0.4, 3.3, 3.7], [0.5, 1, 0.9, 0.3]), gain=0.32, rev=0.6)   # the cheer, stretched low
m.add(0.15, norm(bp(noise(3.3, rng, 'white'), 1500, 9000)) * env_at(tt(3.3), [0, 0.5, 2.8, 3.3], [0, 1, 0.8, 0]) * (0.7 + 0.3 * np.sin(2 * np.pi * 3.1 * tt(3.3))), gain=0.08, rev=0.7)   # the wipe's shimmer
m.add(0.4, whoosh(rng, 3.0, 120, 900, 0.6), gain=0.12, rev=0.5)                               # the cup tumbling
dr0 = drone([82.41, 123.47, 164.81], 3.7, rng, cutoff=700, lfo=0.05)
m.add(0.0, (fade(dr0[0], 0.3, 0.4), fade(dr0[1], 0.3, 0.4)), gain=0.06, rev=0.5)
m.add(T['HOOK'] - 0.9, riser(rng, 0.9, 200, 3000, 2.0) * np.linspace(1, 0, int(0.9 * SR)), gain=0.1, rev=0.3)
m.add(T['HOOK'], thud(rng, 50, 0.7), gain=0.5, rev=0.3)

# ---------- calm (3.6 -> 12): 11:59 pm on New Year's Eve ----------
C0, C1 = T['HOOK'], T['FLIP']; dC = C1 - C0
m.add(C0, fade(crowd(dC + 0.4, rng), 0.5, 0.1) * env_at(tt(dC + 0.4), [0, dC - 2, dC + 0.4], [0.7, 0.85, 1.0]), gain=0.16, rev=0.4)
m.add(C0, fade(traffic(dC + 0.4, rng), 0.5, 0.1), gain=0.1, pan=-0.2, rev=0.3)
dr = drone([82.41, 123.47, 164.81, 196.0], dC + 0.3, rng, cutoff=900, lfo=0.06)
m.add(C0, (fade(dr[0], 0.8, 0.1), fade(dr[1], 0.8, 0.1)), gain=0.05, rev=0.45)
for j, nn in enumerate(motif):
    tj = C0 + 0.5 + j * 0.8
    if tj < C1 - 1.4: m.add(tj, bell(midi(nn), rng, 1.8), gain=0.04, pan=0.3 * np.sin(j * 1.7), rev=0.6)
tk = C0 + 0.4
while tk < C1 - 0.05:
    rem = C1 - tk
    m.add(tk, tick(rng, 1.0 + (rem < 3) * 0.4, low=rem < 1.2), gain=0.06, pan=-0.1, rev=0.1)
    tk += 1.0 if rem > 6 else 0.5 if rem > 3 else 0.25 if rem > 1.2 else 0.12
m.add(C1 - 1.8, riser(rng, 1.8, 300, 6000, 2.2), gain=0.16, rev=0.3)

# ---------- the flip (12 -> 19.6): midnight ----------
F0 = T['FLIP']
m.add(F0, boom(rng, 2.6, 66, 30, 1.4, 0.7, 0.8), gain=0.6, rev=0.4)
m.add(F0, cheer(6.0, rng), gain=0.3, rev=0.55)
m.add(F0, norm(bp(noise(0.9, rng, 'white'), 1200, 9000)) * np.sin(np.pi * tt(0.9) / 0.9), gain=0.08, rev=0.6)   # the wipe
for k, tf in enumerate([12.6, 13.4, 14.1, 15.3, 16.2, 17.6, 18.9]): m.add(tf, thump(rng, 0.8), gain=0.12, pan=float(rng.uniform(-0.6, 0.6)), rev=0.7)
for tp_, f in [(12.3, 1568.0), (13.0, 1760.0), (13.8, 1568.0)]: m.add(tp_, ping(f), gain=0.1, pan=0.2, rev=0.2)
tk, k = F0 + 0.1, 0                                                                             # the likes pouring in
while tk < F0 + 3.4:
    m.add(tk, ping(2093.0 + 180 * (k % 3), 0.12), gain=0.025, pan=float(rng.uniform(-0.3, 0.5)), rev=0.15); k += 1; tk += max(0.035, 0.22 * np.exp(-(tk - F0) / 0.9))
m.add(F0, fade(crowd(T['Y1'] - F0, rng, 1.2), 0.2, 0.3), gain=0.12, rev=0.4)

# ---------- the groove (14 -> 52.2): five years ----------
G0, G1 = 14.0, T['Y5']; bpm = 112.0; beat = 60.0 / bpm
nb = int((G1 - G0) / beat)
for i in range(nb):
    tb = G0 + i * beat; bar = (i // 4) % 4; snowk = 0.45 if T['Y2'] <= tb < T['Y3'] else 1.0
    if tb > G1 - 0.1: break
    m.add(tb, kick(rng, 0.9), gain=0.16 * snowk, rev=0.05)
    if i % 2 == 1: m.add(tb, clap(rng), gain=0.07 * snowk, rev=0.25)
    m.add(tb + beat / 2, hat(rng, open_=(i % 4 == 3)), gain=0.03 * snowk, pan=0.25, rev=0.1)
    if i % 4 == 0: m.add(tb, synth_pluck(midi(groove_root[bar]), dur=beat * 3.6, cutoff=900), gain=0.11, rev=0.2)
    if i % 2 == 0: m.add(tb + beat * 0.5, synth_pluck(midi(groove_root[bar] + 24 + [0, 7, 12, 7][(i // 2) % 4]), dur=beat * 0.9, cutoff=3200), gain=0.035 * snowk, pan=-0.2, rev=0.35)
    if T['Y4'] <= tb < T['Y5'] and i % 2 == 1:                                                   # a ragtime lick for the 1920s
        m.add(tb + beat * 0.25, pluck(midi(groove_root[bar] + 28 + (i % 3) * 3), rng, 0.4, 0.8), gain=0.04, pan=0.3, rev=0.3)
for c in [15.6, T['Y1'], T['Y3'], T['Y5'], T['CRASH']]:
    m.add(c - 0.4, whoosh(rng, 0.45, 300, 3500, 0.6), gain=0.12, rev=0.3); m.add(c, thud(rng, 56, 0.6), gain=0.45, rev=0.3)
for w in WIPES: m.add(w, norm(bp(noise(0.8, rng, 'white'), 1500, 9000)) * np.sin(np.pi * tt(0.8) / 0.8), gain=0.06, rev=0.5)
m.add(T['Y1'], fade(crowd(T['Y5'] - T['Y1'], rng, 0.9), 0.3, 0.3), gain=0.08, rev=0.4)
m.add(T['Y1'], fade(traffic(T['Y5'] - T['Y1'], rng), 0.3, 0.3), gain=0.05, pan=0.2, rev=0.3)
m.add(T['Y2'], fade(wind(rng, T['Y3'] - T['Y2'], 200, 1200, 0.25, 0.5), 0.8, 0.6), gain=0.07, rev=0.4)   # the snow
m.add(37.2, cheer(3.0, rng), gain=0.22, rev=0.5)                                                 # your face goes up
for k in range(14): m.add(37.4 + k * 0.17 + rng.uniform(0, 0.08), shutter(rng), gain=0.05, pan=float(rng.uniform(-0.7, 0.7)), rev=0.2)

# ---------- Year 5 (52.2 -> 62): the countdown, the flip back, the crash ----------
Y0 = T['Y5']
m.add(Y0, thud(rng, 52, 0.6), gain=0.4, rev=0.3)
m.add(Y0, fade(crowd(T['END'] - Y0, rng, 1.0), 0.2, 0.6) * env_at(tt(T['END'] - Y0), [0, 1.8, 3, 9.8], [1, 1, 0.6, 0.35]), gain=0.14, rev=0.4)
for tk in [52.25, 53.0, 53.5, 53.75, 53.88]: m.add(tk, tick(rng, 1.3, low=tk > 53.6), gain=0.07, rev=0.1)
m.add(T['BACK'] - 0.9, rewind(rng, 0.9), gain=0.12, rev=0.3)
m.add(T['BACK'], boom(rng, 2.2, 60, 28, 1.2, 0.6, 0.8), gain=0.5, rev=0.45)
m.add(T['BACK'], cheer(4.0, rng), gain=0.24, rev=0.55)
for tf in [54.5, 55.3, 56.6, 57.8]: m.add(tf, thump(rng, 0.7), gain=0.08, pan=float(rng.uniform(-0.6, 0.6)), rev=0.7)
m.add(T['CRASH'] - 0.35, whoosh(rng, 0.4, 3000, 300, 0.5), gain=0.1, rev=0.3)
t5 = tt(1.6); fall = np.sin(2 * np.pi * np.cumsum(330 * np.exp(-1.2 * t5)) / SR) * np.exp(-t5 / 0.9)   # the likes deflating
m.add(T['CRASH'], norm(lp(fall + 0.4 * np.sign(fall) * 0.3, 2500)), gain=0.1, rev=0.35)
for k in range(8): m.add(T['CRASH'] + 0.1 + k * 0.12, ping(2093.0 - 150 * k, 0.1)[::-1].copy(), gain=0.02, rev=0.2)
pq = pad([82.41, 123.47, 164.81, 196.0], T['END'] - T['CRASH'] + 0.2, rng, cutoff=1300, attack=1.0, release=1.0, voices=2, harmonics=8)
m.add(T['CRASH'] + 0.3, (fade(pq[0], 1.0, 0.5), fade(pq[1], 1.0, 0.5)), gain=0.07, rev=0.6)
for j, nn in enumerate(motif[:5]): m.add(58.6 + j * 0.62, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)
for tl in LANDS: m.add(tl, clatter(rng, 1.0), gain=0.07, pan=0.15, rev=0.2)

# ---------- end card (62 -> 68) ----------
ep_ = pad([82.41, 123.47, 164.81, 196.0], DUR - T['END'] + 0.1, rng, cutoff=1500, attack=0.6, release=2.0, voices=2, harmonics=10)
m.add(T['END'] + 0.15, (fade(ep_[0], 0.6, 2.2), fade(ep_[1], 0.6, 2.2)), gain=0.08, rev=0.6)
for j, nn in enumerate(motif[:5]): m.add(T['END'] + 0.5 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)
m.add(T['END'] + 1.42, woodblock(rng, 1250), gain=0.05, rev=0.25)
m.add(T['END'] + 1.62, woodblock(rng, 1480), gain=0.04, rev=0.25)

# ---------- the voiceover (audio/vo/ep19_vo.wav, made by tools/vo.py): the music ducks under it ----------
import wave
from scipy import signal
vp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vo', 'ep19_vo.wav')
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

out = sys.argv[1] if len(sys.argv) > 1 else 'out/ep19.wav'
render_phone(m, out, rev_time=2.6, target=-10.5, tp=-1.5, limit=True)
