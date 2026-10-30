"""Soundtrack for post 10 (What if Earth's magnetic field flipped in 5 seconds?). Cue times match episodes/ep16cams.js;
the transformer bangs come from audio/ep16_events.json (written by tools/ep16_events.mjs from the same city as the picture).
Hook: a hit, the aurora's shimmer. Calm: the desert at night (wind, crickets), the city's hum far below, the drone, the
motif, ticks speeding up to zero. The flip: a sub drop, the grid's 50 Hz hum swelling. The pylon: a crack, the arcs'
buzz and sizzle. The blackout: transformers banging across the valley, the hum dying, then only wind and crickets. Minutes
later: the aurora (a wide shimmering choir-like pad, faint crackles). Space: hush. Then the motif comes home; end card."""
import sys, os, json
import numpy as np
from synth import *

DUR = 68.0
T = dict(HOOK=3.6, CUT1=7.0, FLIP=11.0, ARC=15.5, CITY=21.0, DARK=28.0, MIN=30.5, AUR=33.0, SPACE=44.0, BACK=50.0, FINAL=56.0, END=62.0)
m = Mix(DUR, seed=16)
rng = np.random.default_rng(1616)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)

def crickets(dur, r, rate=1.1, f=4300):
    """desert crickets: trains of short chirps at ~4.3 kHz"""
    n = int(dur * SR); x = np.zeros(n)
    for _ in range(int(dur * rate)):
        i0 = int(r.uniform(0, max(1, n - SR))); k = r.integers(2, 5); ff = f * r.uniform(0.92, 1.08)
        for j in range(k):
            d = int(0.035 * SR); s = i0 + int(j * 0.06 * SR)
            if s + d >= n: break
            tt_ = np.arange(d) / SR; x[s:s + d] += np.sin(2 * np.pi * ff * tt_) * np.sin(np.pi * tt_ / 0.035) ** 2 * (0.5 + 0.5 * np.sin(2 * np.pi * 34 * tt_))
    return norm(x)
def hum(dur, base=50.0):
    """the grid's hum: 50 Hz and its odd harmonics (transformers), slightly rough"""
    t = tt(dur); x = sum(np.sin(2 * np.pi * base * k * t + k) / k ** 0.8 for k in [2, 4, 6, 3, 5])
    return norm(x)
def arc_buzz(dur, r):
    """an electric arc: a raw 100 Hz buzz, crackling impulses, a hiss"""
    t = tt(dur); n = len(t)
    buzz = np.sign(np.sin(2 * np.pi * 100 * t)) * 0.35 + np.sin(2 * np.pi * 300 * t) * 0.2
    crack = np.zeros(n)
    for _ in range(int(dur * 70)):
        i = int(r.uniform(0, n - 600)); d = int(r.uniform(0.002, 0.012) * SR); crack[i:i + d] += r.uniform(-1, 1, d) * np.exp(-np.arange(d) / (d * 0.3))
    hiss = bp(noise(dur, r, 'white'), 2500, 9000)
    return norm(buzz * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 7.3 * t))) + 1.4 * crack + 0.5 * norm(hiss))
def bang(r, far=0.0):
    """a transformer letting go: a crack and a boom; far ones lose their top and get longer"""
    x = boom(r, 2.2, 58, 26, 0.9, 0.9 * (1 - far), 0.7)
    return norm(lp(x, 9000 * (1 - far) + 600))
def braam(r, d=2.8, f=55.0):
    x = sum(saw_voice(f * k, d, harmonics=24, detune_cents=c) for k, c in [(1, -6), (1, 7), (1.5, 0), (2, -4), (2, 5), (3, 2)])
    k = np.linspace(0, 1, len(x)); fc = 180 + 1300 * np.sin(np.pi * np.minimum(1, k * 1.6)) ** 0.7 * (1 - k) ** 0.5
    x = np.tanh(2.5 * norm(sweep_filter(x, fc))) * env_at(tt(d), [0, 0.06, d * 0.5, d], [0, 1, 0.7, 0]); return norm(x)
def shimmer(freqs, dur, r):
    """the aurora: a slow, wide pad of high partials with a gentle chorus"""
    t = tt(dur); x = np.zeros_like(t)
    for f in freqs:
        for dc in (-7, 0, 6):
            ff = f * 2 ** (dc / 1200); x += np.sin(2 * np.pi * ff * t + r.uniform(0, 6)) * (0.6 + 0.4 * np.sin(2 * np.pi * r.uniform(0.05, 0.15) * t + r.uniform(0, 6)))
    return norm(lp(x, 5000))

motif = [62, 65, 69, 72, 69, 65, 67]
# ---------- the hook (0 -> 3.6): a hit under the aurora ----------
m.add(0.0, boom(rng, 4.0, 44, 20, 2.2, 1.0, 1.0), gain=0.95, rev=0.5)
m.add(0.05, braam(rng, 3.4, 43.65), gain=0.32, rev=0.5)
m.add(0.0, shimmer([880.0, 1318.5, 1760.0, 2217.5], 3.6, rng) * env_at(tt(3.6), [0, 0.4, 3.2, 3.6], [0, 1, 0.8, 0]), gain=0.07, rev=0.7)
m.add(0.0, norm(lp(noise(3.6, rng, 'brown'), 300)) * env_at(tt(3.6), [0, 0.3, 3.3, 3.6], [0, 1, 0.8, 0]), gain=0.25, rev=0.3)
m.add(T['HOOK'] - 0.9, riser(rng, 0.9, 400, 6000, 2.0), gain=0.14, rev=0.3)

# ---------- the desert at night, the city below, the countdown (3.6 -> 11) ----------
C0, C1 = T['HOOK'], T['FLIP']; dC = C1 - C0
m.add(C0, fade(wind(rng, DUR - C0 - 6.0, 140, 700, 0.15, 0.4), 0.8, 2.0), gain=0.16, rev=0.2)          # the wind, all along
m.add(C0, (fade(crickets(DUR - C0 - 6.0, rng), 0.8, 2.0), fade(crickets(DUR - C0 - 6.0, np.random.default_rng(7)), 0.8, 2.0)), gain=0.045, rev=0.3)
cityd = T['DARK'] + 0.5 - C0
city_bed = norm(lp(noise(cityd, rng, 'brown'), 420)) * 0.7 + 0.3 * hum(cityd)                               # traffic, horns' blur, the hum
m.add(C0, fade(city_bed, 0.6, 0.01) * env_at(tt(cityd), [0, T['CITY'] - C0, T['DARK'] - C0, cityd], [1, 0.9, 0.0, 0.0]), gain=0.09, rev=0.4)
m.add(T['CUT1'] - 0.1, whoosh(rng, 0.5, 300, 3000, 0.5), gain=0.12, rev=0.3)
tk = T['HOOK']
while tk < T['FLIP'] - 0.05:
    rem = T['FLIP'] - tk
    m.add(tk, tick(rng, 1.0 + (rem < 3) * 0.4, low=rem < 1.2), gain=0.065, pan=-0.1, rev=0.1)
    tk += 1.0 if rem > 6 else 0.5 if rem > 3 else 0.25 if rem > 1.2 else 0.12
dr = drone([146.83, 220.0, 293.66, 349.23], dC + 0.3, rng, cutoff=1100, lfo=0.06)
m.add(C0, (fade(dr[0], 0.8, 0.1), fade(dr[1], 0.8, 0.1)), gain=0.05, rev=0.4)
for j, nn in enumerate(motif):
    tj = C0 + 0.4 + j * 0.75
    if tj < C1 - 0.5: m.add(tj, bell(midi(nn), rng, 1.8), gain=0.04, pan=0.3 * np.sin(j * 1.7), rev=0.6)
m.add(C1 - 2.4, riser(rng, 2.4, 300, 6500, 2.2), gain=0.22, rev=0.3)

# ---------- the flip (11 -> 15.5): a sub drop, the grid's hum swelling as the currents build ----------
F0, F1 = T['FLIP'], T['ARC']; fd = F1 - F0
m.add(F0, boom(rng, 3.2, 38, 18, 1.8, 0.3, 0.6), gain=0.8, rev=0.3)
sweep = np.sin(2 * np.pi * np.cumsum(np.linspace(38, 110, int(fd * SR))) / SR)
m.add(F0, norm(sweep) * env_at(tt(fd), [0, 0.5, fd - 0.3, fd], [0, 1, 1, 0]), gain=0.16, rev=0.3)          # an eerie rising tone
m.add(F0, hum(fd) * env_at(tt(fd), [0, fd * 0.6, fd], [0.1, 0.6, 1.0]), gain=0.12, rev=0.2)
m.add(F0, pad([73.42, 110.0, 146.83], fd, rng, cutoff=700, attack=1.0, release=0.3, voices=2, harmonics=8), gain=0.08, rev=0.5)
m.add(F1 - 0.8, riser(rng, 0.8, 300, 5000, 2.0), gain=0.14, rev=0.3)

# ---------- the pylon (15.5 -> 21): a crack, the arcs ----------
A0 = T['ARC']; ad = T['CITY'] - A0
m.add(A0, bang(rng, 0.0), gain=0.7, rev=0.35)
arcs = arc_buzz(ad, rng) * env_at(tt(ad), [0, 0.1, 3.4, 4.2, 4.6, ad], [0, 1, 1, 0.5, 0.0, 0.0])
m.add(A0 + 0.1, arcs, gain=0.3, pan=0.25, rev=0.25)
for k, tq in enumerate([16.4, 17.3, 18.6]): m.add(tq, crunch(rng, 0.6), gain=0.12, pan=0.2, rev=0.3)            # insulators cracking
m.add(T['CITY'] - 0.9, downer(rng, 0.9, 1400, 80) if 'downer' in globals() else riser(rng, 0.9, 2000, 200, 2.0), gain=0.12, rev=0.3)

# ---------- the blackout (21 -> 33): transformers across the valley, the hum dying; then wind, crickets ----------
ev = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ep16_events.json')))
for e in ev:
    far = min(1.0, e['d'] / 12000.0); delay = 0.15 + 0.9 * far
    m.add(e['t'] - 0.15 + delay, bang(rng, far), gain=0.5 * (1 - 0.7 * far), pan=float(rng.uniform(-0.4, 0.4)), rev=0.45)
    if e['twice']: m.add(e['t'] + 0.55 + delay, bang(rng, far), gain=0.35 * (1 - 0.7 * far), pan=float(rng.uniform(-0.4, 0.4)), rev=0.45)
m.add(T['CITY'], pad([65.41, 98.0, 130.81, 155.56], T['MIN'] - T['CITY'], rng, cutoff=600, attack=1.5, release=1.5, voices=2, harmonics=8), gain=0.08, rev=0.5)
m.add(T['DARK'], shimmer([1174.7, 1568.0, 1975.5], T['AUR'] - T['DARK'], rng) * env_at(tt(T['AUR'] - T['DARK']), [0, 2, 5], [0, 0.6, 1]), gain=0.03, rev=0.7)
m.add(T['AUR'] - 1.4, riser(rng, 1.4, 200, 6000, 2.4), gain=0.2, rev=0.3)

# ---------- minutes later: the aurora (33 -> 44) ----------
U0, U1 = T['AUR'], T['SPACE']; ud = U1 - U0
m.add(U0, boom(rng, 3.5, 50, 24, 1.8, 0.5, 0.8), gain=0.7, rev=0.5)
m.add(U0, braam(rng, 3.0, 48.99), gain=0.22, rev=0.5)
m.add(U0, shimmer([587.33, 880.0, 1174.7, 1318.5, 1760.0], ud, rng) * env_at(tt(ud), [0, 3, ud - 1, ud], [0, 1, 1, 0.6]), gain=0.09, rev=0.75)
m.add(U0, pad([146.83, 220.0, 293.66, 369.99], ud, rng, cutoff=1600, attack=3.0, release=1.0, voices=3, harmonics=10), gain=0.08, rev=0.6)
crk = np.zeros(int(ud * SR))
for _ in range(int(ud * 6)):
    i = int(rng.uniform(0, len(crk) - 800)); d = int(rng.uniform(0.003, 0.01) * SR); crk[i:i + d] += rng.uniform(-1, 1, d) * np.exp(-np.arange(d) / (d * 0.3))
m.add(U0 + 1.0, norm(hp(crk, 1500)), gain=0.02, rev=0.5)                                                    # the faint crackle some hear
for j, nn in enumerate(motif):
    m.add(U0 + 3.0 + j * 1.1, bell(midi(nn + 12), rng, 2.4), gain=0.035, pan=0.3 * np.sin(j * 1.9), rev=0.75)
m.add(U1 - 1.0, riser(rng, 1.0, 300, 4000, 2.0), gain=0.15, rev=0.3)

# ---------- space (44 -> 50): hush ----------
S0, S1 = T['SPACE'], T['BACK']; sd = S1 - S0
m.add(S0, boom(rng, 2.5, 46, 22, 1.2, 0.3, 0.6), gain=0.5, rev=0.5)
m.add(S0, pad([110.0, 164.81, 220.0, 277.18], sd, rng, cutoff=900, attack=1.0, release=1.0, voices=2, harmonics=8), gain=0.08, rev=0.7)
m.add(S0, shimmer([880.0, 1108.7, 1318.5], sd, rng), gain=0.04, rev=0.8)

# ---------- back to you, the last take (50 -> 62): the motif comes home ----------
B0 = T['BACK']; bd = T['END'] - B0
m.add(B0, boom(rng, 2.0, 50, 26, 1.0, 0.3, 0.6), gain=0.4, rev=0.4)
m.add(B0, pad([146.83, 220.0, 261.63, 349.23], bd, rng, cutoff=1300, attack=1.5, release=1.0, voices=3, harmonics=10), gain=0.08, rev=0.6)
m.add(B0, shimmer([587.33, 880.0, 1318.5], bd, rng) * env_at(tt(bd), [0, 2, bd - 1, bd], [0, 0.8, 0.8, 0]), gain=0.05, rev=0.75)
for j, nn in enumerate(motif):
    m.add(T['FINAL'] + 0.3 + j * 0.7, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.65)
m.add(T['END'] - 0.9, riser(rng, 0.9, 400, 5000, 2.0), gain=0.15, rev=0.3)

# ---------- end card (62 -> 68) ----------
ep_ = pad([146.83, 220.0, 293.66, 349.23], DUR - T['END'] + 0.1, rng, cutoff=1500, attack=1.0, release=2.0, voices=2, harmonics=10)
m.add(T['END'], (fade(ep_[0], 0.8, 2.2), fade(ep_[1], 0.8, 2.2)), gain=0.08, rev=0.6)
for j, nn in enumerate(motif[:5]): m.add(T['END'] + 0.4 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)
m.add(T['END'] + 1.42, woodblock(rng, 1250), gain=0.05, rev=0.25)
m.add(T['END'] + 1.62, woodblock(rng, 1480), gain=0.04, rev=0.25)

# ---------- the voiceover (audio/vo/ep16_vo.wav, made by tools/vo.py): the music ducks under it ----------
import wave
vp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vo', 'ep16_vo.wav')
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

out = sys.argv[1] if len(sys.argv) > 1 else 'ep16.wav'
render_phone(m, out, rev_time=2.6, target=-10.5, tp=-1.5, limit=True)
print('wrote', out)
