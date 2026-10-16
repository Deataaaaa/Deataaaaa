"""(helpers copied from post 7) Soundtrack for post 8 (What if the air stopped turning with Earth for 30 seconds?). Cue times match episodes/ep13cams.js.
Hook: a hit, the blast in slow motion. Calm: surf, gulls, the Golden Gate foghorn, a warm drone, a motif, ticks speeding up
to zero. Zero: a huge hit and a 30 s roar (howling resonances, sand hiss, debris knocks); the bridge groans and snaps.
Space: the roar muffled. The wind stops: sudden silence, falling sand, then the sea draining (a deep sucking rumble,
rushing water). The wave: a roar that builds to the impact, then black. End card: hush, the motif, Apple's two pops."""
import sys
import numpy as np
from synth import *

DUR = 68.0
T = dict(HOOK=3.6, APPEAR=11.0, MILLI=22.0, CITY=33.0, SHOCK=40.7, SPACE=43.0, REWIND=51.0, END=62.0)
m = Mix(DUR, seed=14)
rng = np.random.default_rng(1313)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)

def howl(dur, r, lo=300, hi=900, rate=0.15, q=0.08):
    t = tt(dur); fc = lo + (hi - lo) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + r.uniform(0, 6)) * (0.7 + 0.3 * np.sin(2 * np.pi * rate * 2.3 * t)))
    return norm(sweep_filter(noise(dur, r, 'white'), list(zip(fc * (1 - q), fc * (1 + q))), 'bandpass'))
def surf(dur, r, period=7.0):
    n = noise(dur, r, 'pink'); t = tt(dur); sw = 0.35 + 0.65 * np.clip(np.sin(2 * np.pi * t / period) * 0.5 + 0.5, 0, 1) ** 3
    return norm(sweep_filter(n, 500 + 1600 * sw, 'lowpass')) * sw
def gull(r):
    d = r.uniform(0.35, 0.6); t = tt(d); f = np.interp(t, [0, 0.12 * d, 0.45 * d, d], [1300, 2300, 1900, 1200]) * (1 + 0.02 * np.sin(2 * np.pi * 30 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR; return bp((np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * np.sin(np.pi * t / d) ** 1.5, 800, 5000)
def foghorn(r, f=178.0, d=2.6):
    """the Golden Gate's diaphone: a low reed tone that drops at the end ('beee-ohh')"""
    t = tt(d); fr = np.where(t < d * 0.62, f, f * 0.84); ph = 2 * np.pi * np.cumsum(fr) / SR
    x = sum(np.sin(k * ph) / k ** 0.8 for k in range(1, 12)); env = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.35)
    return norm(lp(x, 1800) * env)
def knock(r):
    d = r.uniform(0.05, 0.16); x = bp(r.standard_normal(int(d * SR)), r.uniform(300, 900), r.uniform(1500, 4000)) * np.exp(-tt(d) * r.uniform(25, 60)); return norm(x)
def snap(r, d=0.8):
    t = tt(d); x = hp(r.standard_normal(len(t)), 900) * np.exp(-t * 40)
    for _ in range(6): x += 0.3 * np.sin(2 * np.pi * r.uniform(400, 2400) * t) * np.exp(-t * r.uniform(5, 14))
    return norm(x)
def downer(r, d=0.9, f0=1800, f1=90):
    n = int(d * SR); k = np.linspace(0, 1, n); fc = f0 * (f1 / f0) ** (k ** 0.7)
    x = sweep_filter(noise(d, r, 'pink'), list(zip(fc * 0.6, fc * 1.5)), 'bandpass'); return norm(norm(x) + 0.35 * np.sin(2 * np.pi * np.cumsum(fc * 0.25) / SR)) * (1 - k) ** 1.6

def braam(r, d=2.8, f=55.0):
    # trailer-style low brass: detuned saws, the filter opening then closing, saturated
    x = sum(saw_voice(f * k, d, harmonics=24, detune_cents=c) for k, c in [(1, -6), (1, 7), (1.5, 0), (2, -4), (2, 5), (3, 2)])
    k = np.linspace(0, 1, len(x)); fc = 180 + 1300 * np.sin(np.pi * np.minimum(1, k * 1.6)) ** 0.7 * (1 - k) ** 0.5
    x = np.tanh(2.5 * norm(sweep_filter(x, fc))) * env_at(tt(d), [0, 0.06, d * 0.5, d], [0, 1, 0.7, 0]); return norm(x)


def crowd(dur, r):
    """a busy crossing: murmur (band-limited babble), footsteps, a far jingle"""
    t = tt(dur); x = np.zeros_like(t)
    for _ in range(14):
        f0 = r.uniform(140, 260); ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.08 * np.sin(2 * np.pi * r.uniform(2, 5) * t + r.uniform(0, 6)))) / SR
        syl = np.clip(np.sin(2 * np.pi * r.uniform(3, 6) * t + r.uniform(0, 6)), 0, 1) ** 2 * np.clip(np.sin(2 * np.pi * r.uniform(0.2, 0.5) * t + r.uniform(0, 6)), 0, 1)
        x += bp(np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph), 200, 2500) * syl
    return norm(x * 0.7 + 0.3 * norm(bp(noise(dur, r, 'pink'), 300, 3000)))

motif = [69, 72, 76, 79, 76, 72, 74]
# ---------- the hook (0 -> 3.6): the blast in slow motion ----------
m.add(0.0, boom(rng, 4.0, 48, 20, 2.2, 1.0, 1.0), gain=0.95, rev=0.5)
hk = lp(noise(3.6, rng, 'brown'), 500) * env_at(tt(3.6), [0, 0.2, 3.3, 3.6], [0, 1, 0.8, 0])
m.add(0.0, norm(hk), gain=0.5, rev=0.4)
m.add(0.05, braam(rng, 3.4, 49.0), gain=0.35, rev=0.5)
m.add(T['HOOK'] - 0.9, riser(rng, 0.9, 400, 6000, 2.0), gain=0.15, rev=0.3)

# ---------- the countdown + calm Shibuya (3.6 -> 11) ----------
tk = T['HOOK']
while tk < T['APPEAR'] - 0.05:
    rem = T['APPEAR'] - tk
    m.add(tk, tick(rng, 1.0 + (rem < 3) * 0.4, low=rem < 1.2), gain=0.065, pan=-0.1, rev=0.1)
    tk += 1.0 if rem > 6 else 0.5 if rem > 3 else 0.25 if rem > 1.2 else 0.12
C0, C1 = T['HOOK'], T['APPEAR']; dC = C1 - C0
m.add(C0, fade(crowd(dC, rng), 0.3, 0.004), gain=0.16, rev=0.3)
m.add(C0, fade(norm(lp(noise(dC, rng, 'brown'), 300)), 0.3, 0.004), gain=0.06, rev=0.2)     # the city's hum
# the crossing's walk signal: the bird-call chirps (cuckoo tones)
for k in range(int(dC / 0.7)):
    tc = C0 + 0.3 + k * 0.7; d = 0.09; t0 = tt(d); f = np.where(t0 < d * 0.5, 2100, 1700)
    m.add(tc, norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t0 / d)), gain=0.025, pan=0.4, rev=0.4)
dr = drone([220.0, 329.63, 440.0, 493.88], dC + 0.3, rng, cutoff=1300, lfo=0.06)
m.add(C0, (fade(dr[0], 0.8, 0.1), fade(dr[1], 0.8, 0.1)), gain=0.05, rev=0.4)
for j, nn in enumerate(motif):
    tj = C0 + 0.4 + j * 0.75
    if tj < C1 - 0.5: m.add(tj, bell(midi(nn), rng, 1.8), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.6)
m.add(C1 - 2.4, riser(rng, 2.4, 300, 6500, 2.2), gain=0.22, rev=0.3)

# ---------- the first nanoseconds (11 -> 22): everything stops; a shimmer, a heartbeat, a high tone rising ----------
N0, N1 = T['APPEAR'], T['MILLI']; nd = N1 - N0
m.add(N0, boom(rng, 3.0, 70, 30, 1.4, 0.4, 0.5), gain=0.55, rev=0.6)
sh = sweep_filter(noise(nd, rng, 'white'), list(zip(np.geomspace(2000, 6000, int(nd * SR)) * 0.9, np.geomspace(2000, 6000, int(nd * SR)) * 1.1)), 'bandpass')
m.add(N0, norm(sh) * env_at(tt(nd), [0, 1, nd - 1, nd], [0, 0.6, 1, 0]), gain=0.05, rev=0.6)
tone = sum(np.sin(2 * np.pi * f * tt(nd) * (1 + 0.3 * (tt(nd) / nd) ** 2)) / (k + 1) for k, f in enumerate([440, 660, 880]))
m.add(N0, norm(tone) * env_at(tt(nd), [0, 2, nd - 0.6, nd], [0, 0.3, 1, 0]), gain=0.05, rev=0.7)
pd = pad([110.0, 164.81, 220.0, 261.63], nd, rng, cutoff=900, attack=2.0, release=0.5, voices=2, harmonics=8)
m.add(N0, pd, gain=0.07, rev=0.6)
for k in range(8): m.add(N0 + 1.2 + k * 1.2, heartbeat(rng), gain=0.16, rev=0.2)
m.add(N1 - 1.6, riser(rng, 1.6, 300, 9000, 2.4), gain=0.3, rev=0.3)

# ---------- the milliseconds (22 -> 33): the roar of the fireball, glass, the shock reaches us at 31.8 ----------
M0, M1 = T['MILLI'], T['CITY']; md = M1 - M0
m.add(M0, boom(rng, 4.0, 52, 20, 2.0, 0.8, 1.0), gain=0.9, rev=0.5)
m.add(M0, braam(rng, 3.0, 55.0), gain=0.3, rev=0.5)
ro = lp(noise(md, rng, 'brown'), 800) * env_at(tt(md), [0, 1, md - 1.5, md - 0.3, md], [0.3, 0.6, 1.0, 1.0, 0.0])
ro2 = lp(noise(md, np.random.default_rng(7), 'brown'), 800) * env_at(tt(md), [0, 1, md - 1.5, md - 0.3, md], [0.3, 0.6, 1.0, 1.0, 0.0])
m.add(M0, (norm(ro), norm(ro2)), gain=0.6, rev=0.4)
tg = tt(md); growl = np.tanh(3.0 * norm(lp(noise(md, rng, 'brown'), 240))) * (0.6 + 0.4 * np.sin(2 * np.pi * 5.1 * tg)) * env_at(tg, [0, md - 0.3, md], [1, 1, 0])
m.add(M0, norm(growl), gain=0.28, rev=0.3)
for i in range(70):   # glass: bright shatters, denser toward the shock's arrival
    tc = M0 + 4.0 + (md - 4.6) * (i / 70) ** 0.6 + rng.uniform(-0.1, 0.1)
    m.add(tc, metal_hit(rng, rng.uniform(1800, 4200), 0.5), gain=0.025 + 0.03 * i / 70, pan=rng.uniform(-0.8, 0.8), rev=0.5)
m.add(31.8, boom(rng, 2.5, 60, 24, 1.0, 1.0, 1.0), gain=0.9, rev=0.3)
m.add(31.8, crunch(rng, 1.2), gain=0.4, rev=0.3)
m.add(M1 - 1.2, riser(rng, 1.2, 300, 8000, 2.0), gain=0.25, rev=0.3)

# ---------- the city (33 -> 43): far rumble, the cloud's roll, the shock arrives at 40.7 ----------
K0, K1 = T['CITY'], T['SPACE']; kd = K1 - K0
m.add(K0, boom(rng, 5.0, 44, 18, 3.0, 0.3, 1.0), gain=0.8, rev=0.7)
far = lp(noise(kd, rng, 'brown'), 260) * env_at(tt(kd), [0, 1, kd - 1, kd], [0.5, 0.8, 0.9, 0])
m.add(K0, norm(far), gain=0.45, rev=0.6)
m.add(K0, pad([73.42, 110.0, 146.83, 174.61], kd, rng, cutoff=700, attack=1.0, release=1.0, voices=2, harmonics=10), gain=0.08, rev=0.6)
m.add(T['SHOCK'], boom(rng, 2.5, 56, 22, 1.2, 0.9, 1.0), gain=0.8, rev=0.3)
m.add(T['SHOCK'], crunch(rng, 1.0), gain=0.3, rev=0.3)
m.add(K1 - 1.0, riser(rng, 1.0, 300, 5000, 2.0), gain=0.18, rev=0.3)

# ---------- space (43 -> 51): silence of space, a low pad, the motif slowed ----------
P0, P1 = T['SPACE'], T['REWIND']; pdur = P1 - P0
m.add(P0, boom(rng, 3.0, 60, 30, 1.6, 0.3, 0.6), gain=0.4, rev=0.7)
sp = pad([110.0, 164.81, 220.0, 329.63], pdur, rng, cutoff=1200, attack=1.0, release=1.5, voices=2, harmonics=10)
m.add(P0, sp, gain=0.07, rev=0.7)
for j, nn in enumerate(motif[:5]): m.add(P0 + 1.0 + j * 1.3, bell(midi(nn - 12), rng, 2.5), gain=0.04, pan=0.3 * np.sin(j * 1.7), rev=0.7)
m.add(P1 - 1.2, riser(rng, 1.2, 6000, 300, 0.6), gain=0.16, rev=0.3)                     # the rewind's suck

# ---------- the rewind (51 -> 62): back to the instant it appeared, the crowd frozen, a hush, the question ----------
Q0, Q1 = T['REWIND'], T['END']; qd = Q1 - Q0
m.add(Q0, boom(rng, 2.0, 80, 40, 1.0, 0.3, 0.5), gain=0.4, rev=0.6)
m.add(Q0, pad([220.0, 277.18, 329.63, 440.0], qd, rng, cutoff=1300, attack=1.5, release=1.0, voices=2, harmonics=10), gain=0.06, rev=0.6)
for k in range(9): m.add(Q0 + 0.8 + k * 1.15, heartbeat(rng), gain=0.12, rev=0.2)
m.add(Q1 - 0.9, riser(rng, 0.9, 400, 5000, 2.0), gain=0.15, rev=0.3)

# ---------- end card (62 -> 68) ----------
ep_ = pad([196.0, 293.66, 392.0, 440.0], DUR - T['END'] + 0.1, rng, cutoff=1500, attack=1.0, release=2.0, voices=2, harmonics=10)
m.add(T['END'], (fade(ep_[0], 0.8, 2.2), fade(ep_[1], 0.8, 2.2)), gain=0.08, rev=0.6)
for j, nn in enumerate(motif[:5]): m.add(T['END'] + 0.4 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)
m.add(63.42, woodblock(rng, 1250), gain=0.05, rev=0.25)
m.add(63.62, woodblock(rng, 1480), gain=0.04, rev=0.25)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep14.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
print('wrote', out)
