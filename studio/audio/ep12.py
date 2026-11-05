"""Soundtrack for post 6 (What if every atom on Earth stopped moving for 1 second?). Cue times match episodes/ep12cams.js (T).

The hook: a hit and the roar of the sky coming down on Times Square -> hard cut to the calm square at dusk: traffic, horns,
a crowd talking, a far siren, the screens' electric hum, a cold music-box motif over a mid-range drone, ticks that speed
up toward zero, a riser -> the stop: a huge hit and a crystalline crack, then the city's sound freezes on its last instant
and dies (sound is atoms moving): near silence, a faint ring, a soft drone -> the restart: an ice crack; the screens' hum
comes back for a moment and winds down (every turbine stopped); frost crackling, ice pinging, metal creaking, tinkling
snow, a cold wind -> the sky falls: a roar from above that grows, booms, a howl rising, a riser into the white-out ->
space: a hit, a vast cold drone, the sea freezing far away, bells -> Vostok 1983: the polar wind, the station's
generator, a lonely motif -> the end card: hush, the motif once more, two soft pops when Apple peeks up and ducks."""
import sys
import numpy as np
from synth import *

DUR = 68.0
T = dict(HOOK=3.6, STOP=10.6, RESTART=17.0, SKY=27.0, WHITE=36.6, SPACE=38.0, VOSTOK=50.0, END=62.0)
m = Mix(DUR, seed=12)
rng = np.random.default_rng(1212)


def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)


class Bus:
    """a stereo sub-mix (the city), so it can be cut dead at the stop and frozen into grains"""
    def __init__(self, dur): self.n = int(dur * SR); self.L = np.zeros(self.n); self.R = np.zeros(self.n)

    def add(self, t, sig, gain=1.0, pan=0.0):
        i0 = int(t * SR); l, r = sig if isinstance(sig, tuple) else (sig, sig)
        k = min(len(l), self.n - i0)
        if k <= 0 or i0 < 0: return
        self.L[i0:i0 + k] += l[:k] * gain * np.sqrt(0.5 * (1 - pan)) * 1.414
        self.R[i0:i0 + k] += r[:k] * gain * np.sqrt(0.5 * (1 + pan)) * 1.414


def horn(r, f=None, d=None):
    """a car horn: two buzzy tones a third apart, quick attack"""
    f = f or float(r.choice([349.2, 392.0, 415.3, 440.0, 466.2])); d = d or r.uniform(0.12, 0.5)
    t = tt(d); x = np.zeros_like(t)
    for ff in (f, f * 1.26):
        for k in range(1, 14):
            if ff * k > 6000: break
            x += np.sin(2 * np.pi * ff * k * t + k) / k ** 0.9
    env = np.minimum(1, t / 0.012) * np.minimum(1, np.maximum(0, d - t) / 0.04)
    return norm(bp(x, 280, 4200) * env)


VOWELS = [(730, 1090), (270, 2290), (300, 870), (530, 1840), (570, 840), (440, 1020), (660, 1720)]


def talker(dur, r, f0):
    """one voice: a buzzy glottal source through vowel formants, syllables, phrases and pauses (no words)"""
    t = tt(dur); n = len(t)
    f = f0 * (1 + 0.07 * np.sin(2 * np.pi * r.uniform(0.3, 0.8) * t + r.uniform(0, 6)) + 0.03 * norm(lp(r.standard_normal(n), 3)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = sum(np.sin(k * ph) / k for k in range(1, 18))
    rate = r.uniform(3.6, 5.4); nsyl = int(dur * rate) + 2
    seq = r.integers(0, len(VOWELS), nsyl); idx = np.minimum((t * rate).astype(int), nsyl - 1)
    out = np.zeros(n)
    for v, (F1, F2) in enumerate(VOWELS):
        w = lp((seq[idx] == v).astype(float), 25)
        out += (bp(src, F1 * 0.8, F1 * 1.2) + 0.6 * bp(src, F2 * 0.86, F2 * 1.14)) * w
    syl = np.sin(np.pi * ((t * rate) % 1.0)) ** 1.5
    gate = np.zeros(n); tp = r.uniform(-1.0, 0.5)                                  # phrases of 1.2-3 s, pauses of 0.3-1 s
    while tp < dur:
        a = tp; b = tp + r.uniform(1.2, 3.0)
        gate[max(0, int(a * SR)):max(0, min(n, int(b * SR)))] = 1.0; tp = b + r.uniform(0.3, 1.0)
    gate = lp(gate, 12)
    cons = hp(r.standard_normal(n), 2500) * np.exp(-((t * rate) % 1.0) * 30) * 0.25   # consonant bursts at syllable starts
    return norm((out + cons * np.abs(out).max()) * syl * gate)


def crowd(dur, r, voices=14):
    L = np.zeros(int(dur * SR)); R = np.zeros(int(dur * SR))
    for v in range(voices):
        f0 = r.uniform(95, 140) if v % 2 else r.uniform(175, 250)
        x = talker(dur, r, f0); dist = r.uniform(0.3, 1.0)
        x = lp(x, 5200 - 3200 * dist) * (1.0 - 0.6 * dist); p = r.uniform(-0.8, 0.8)
        L += x * np.sqrt(0.5 * (1 - p)); R += x * np.sqrt(0.5 * (1 + p))
    bed = bp(noise(dur, r, 'pink'), 300, 2600) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.17 * tt(dur)))     # the far crowd
    s = max(np.abs(L).max(), np.abs(R).max()) + 1e-9
    return (L / s + 0.12 * norm(bed), R / s + 0.12 * norm(bed))


def traffic(dur, r):
    t = tt(dur)
    rumble = lp(noise(dur, r, 'brown'), 260)
    tyres = bp(noise(dur, r, 'pink'), 300, 2000) * (0.65 + 0.35 * np.sin(2 * np.pi * 0.13 * t + r.uniform(0, 6)))
    pas = np.zeros_like(t)
    for _ in range(int(dur * 0.9)):
        c = r.uniform(0, dur); w = r.uniform(0.7, 1.8); pas += np.exp(-((t - c) / w) ** 2) * r.uniform(0.3, 1.0)
    swish = bp(noise(dur, r, 'pink'), 500, 3800) * pas
    idle = sum(np.sin(2 * np.pi * f * t + r.uniform(0, 6)) / (k + 1) for k, f in enumerate([31, 62, 93, 124, 186]))
    return norm(0.6 * norm(rumble) + 0.5 * norm(tyres) + 0.45 * norm(swish) + 0.25 * norm(idle))


def siren(dur, r, f0=620, f1=1380, period=3.4):
    t = tt(dur); k = 0.5 - 0.5 * np.cos(2 * np.pi * t / period + r.uniform(0, 6))
    ph = 2 * np.pi * np.cumsum(f0 + (f1 - f0) * k) / SR
    return norm(lp(np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph), 2600))


def mains(dur, base=60.0):
    """the screens' electric hum (US mains: 120 Hz and its harmonics, with a faint buzz)"""
    t = tt(dur)
    return norm(sum(a * np.sin(2 * np.pi * base * h * t + h) for h, a in [(2, 1.0), (4, 0.55), (6, 0.35), (8, 0.25), (10, 0.15), (14, 0.08)]))


def icecrack(r, d=None, f0=None, f1=None):
    """ice under tension: a snap and the dispersive 'pew' of a crack running through it"""
    d = d or r.uniform(0.18, 0.45); t = tt(d)
    f0 = f0 or r.uniform(2500, 5200); f1 = f1 or r.uniform(300, 700)
    f = f1 + (f0 - f1) * np.exp(-t * r.uniform(12, 26))
    ping = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * r.uniform(8, 16))
    snap = hp(r.standard_normal(len(t)), 1800) * np.exp(-t * 500)
    return norm(0.7 * ping + snap)


def glass(r, d=0.7):
    t = tt(d); x = hp(r.standard_normal(len(t)), 2500) * np.exp(-t * 60)
    for _ in range(9): x += 0.25 * np.sin(2 * np.pi * r.uniform(2400, 7600) * t + r.uniform(0, 6)) * np.exp(-t * r.uniform(5, 20))
    return norm(x)


def creak(r, d=None):
    """metal contracting in the cold: a stick-slip pulse train through a resonance"""
    d = d or r.uniform(0.4, 1.1); t = tt(d)
    rate = r.uniform(22, 60) * (1 + 0.5 * np.sin(np.pi * t / d))
    pulses = (np.sin(2 * np.pi * np.cumsum(rate) / SR) > 0.97).astype(float)
    f = r.uniform(240, 560)
    body = bp(pulses, f * 0.8, f * 1.25) + 0.4 * bp(pulses, f * 2.6, f * 3.2)
    return norm(body * np.sin(np.pi * t / d) ** 1.4)


def powerdown(r, d=1.3, f0=240, f1=32):
    t = tt(d); k = t / d
    ph = 2 * np.pi * np.cumsum(f0 * (f1 / f0) ** (k ** 0.6)) / SR
    x = sum(np.sin(h * ph) / h for h in range(1, 10)) * (1 - k) ** 1.2
    buzz = bp(r.standard_normal(len(t)), 900, 5000) * (1 - k) ** 4 * 0.3
    return norm(lp(x, 3000) + buzz)


def howl(dur, r, lo=300, hi=900, rate=0.15, q=0.08):
    """resonant wind: narrow-band noise whose centre wanders"""
    t = tt(dur)
    fc = lo + (hi - lo) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + r.uniform(0, 6)) * (0.7 + 0.3 * np.sin(2 * np.pi * rate * 2.3 * t)))
    return norm(sweep_filter(noise(dur, r, 'white'), list(zip(fc * (1 - q), fc * (1 + q))), 'bandpass'))


def shimmer(freqs, dur, r, beat=0.7):
    t = tt(dur); x = np.zeros_like(t)
    for i, f in enumerate(freqs): x += np.sin(2 * np.pi * f * t + i) * (0.6 + 0.4 * np.sin(2 * np.pi * beat * (i + 1) * 0.37 * t + i))
    return norm(x)


def tinkle(t0, t1, rate, gain, seed, lo=2600, hi=6200):
    """ice crystals touching: tiny high pings at random"""
    r = np.random.default_rng(seed); t = t0
    while t < t1:
        f = r.uniform(lo, hi); d = 0.25; x = np.sin(2 * np.pi * f * tt(d)) * np.exp(-tt(d) * r.uniform(18, 40))
        m.add(t, x, gain=gain * r.uniform(0.4, 1.0), pan=r.uniform(-0.8, 0.8), rev=0.35)
        t += r.exponential(1.0 / rate)


def downer(r, d=0.9, f0=1800, f1=90):
    """a falling sweep after a cut"""
    n = int(d * SR); k = np.linspace(0, 1, n); fc = f0 * (f1 / f0) ** (k ** 0.7)
    x = sweep_filter(noise(d, r, 'pink'), list(zip(fc * 0.6, fc * 1.5)), 'bandpass')
    ph = 2 * np.pi * np.cumsum(fc * 0.25) / SR
    return norm(norm(x) + 0.35 * np.sin(ph)) * (1 - k) ** 1.6


tl = tt(DUR)
motif = [81, 77, 76, 74, 76, 72, 74]                      # D minor, crystalline

# ---------- the countdown (from frame 1): ticks speeding up toward zero ----------
tk = 0.0
while tk < T['STOP'] - 0.05:
    rem = T['STOP'] - tk
    m.add(tk, tick(rng, 1.0 + (rem < 3) * 0.4, low=rem < 1.2), gain=0.065 if tk >= T['HOOK'] else 0.045, pan=-0.1, rev=0.1)
    tk += 1.0 if rem > 6 else 0.5 if rem > 3 else 0.25 if rem > 1.2 else 0.12

# ---------- calm Times Square at dusk (3.6 -> 10.6), cut dead at the stop ----------
C0, C1 = T['HOOK'], T['STOP']
dC = C1 - C0
city = Bus(dC)
city.add(0, fade(traffic(dC, rng), 0.25, 0.0), gain=0.55)
cl, cr_ = crowd(dC, np.random.default_rng(31))
city.add(0, (fade(cl, 0.3, 0.0), fade(cr_, 0.3, 0.0)), gain=0.42)
hr_ = np.random.default_rng(7)
for th, pan in [(0.5, -0.5), (1.9, 0.6), (2.15, 0.6), (3.6, -0.2), (4.4, 0.4), (5.6, -0.7), (6.3, 0.3)]:
    city.add(th, horn(hr_), gain=hr_.uniform(0.1, 0.2), pan=pan)
city.add(0.4, fade(siren(dC - 0.4, rng), 1.5, 0.0), gain=0.06, pan=0.55)
city.add(0, fade(mains(dC), 0.2, 0.0), gain=0.035)
ir = reverb_ir(1.1, np.random.default_rng(3))                                     # the square's own short reverb, baked in
city.L = city.L + 0.25 * signal.fftconvolve(city.L, ir[0])[:city.n]; city.R = city.R + 0.25 * signal.fftconvolve(city.R, ir[1])[:city.n]
fo = int(0.006 * SR); city.L[-fo:] *= np.linspace(1, 0, fo); city.R[-fo:] *= np.linspace(1, 0, fo)
m.add(C0, (city.L, city.R), gain=0.5)
# the score: a cold mid-range drone, the motif on a music box, a riser into the stop
dr = drone([146.83, 220.0, 293.66, 329.63], dC + 0.3, rng, cutoff=1300, lfo=0.06)
m.add(C0, (fade(dr[0], 0.8, 0.1), fade(dr[1], 0.8, 0.1)), gain=0.05, rev=0.4)
for j, nn in enumerate(motif):
    tj = C0 + 0.35 + j * 0.72
    if tj < C1 - 0.4: m.add(tj, bell(midi(nn), rng, 1.8), gain=0.05, pan=0.3 * np.sin(j * 1.7), rev=0.6)
m.add(C1 - 2.4, riser(rng, 2.4, 300, 6500, 2.2), gain=0.22, rev=0.3)
m.add(C1 - 1.0, norm(sweep_filter(noise(1.0, rng, 'pink'), np.linspace(2000, 120, int(SR * 1.0)), 'lowpass')) * np.linspace(0.2, 1, int(SR * 1.0)), gain=0.1)
m.add(C0, downer(rng, 0.8, 1500, 100), gain=0.12, rev=0.3)                         # out of the hook's roar
m.add(C0, thud(rng, 50, 0.8), gain=0.25, rev=0.3)

# ---------- the stop (10.6): a hit, a crystalline crack; the city's last instant frozen, then silence ----------
m.add(C1, boom(rng, 4.5, 70, 22, 1.8, 0.9, 1.0), gain=1.1, rev=0.45)
m.add(C1, glass(rng, 1.4), gain=0.35, rev=0.5)
m.add(C1, icecrack(rng, 0.6, 5200, 500), gain=0.3, rev=0.4)
w0 = city.n - int(0.2 * SR); gL, gR = city.L[w0:w0 + int(0.16 * SR)], city.R[w0:w0 + int(0.16 * SR)]
fd = 1.8; fn = int(fd * SR); frzL = np.zeros(fn); frzR = np.zeros(fn); gr = np.random.default_rng(55); g = int(0.08 * SR); win = np.hanning(g)
for i0 in range(0, fn - g, g // 4):                                               # granular freeze of that last instant
    o = gr.integers(0, len(gL) - g); frzL[i0:i0 + g] += gL[o:o + g] * win; frzR[i0:i0 + g] += gR[o:o + g] * win
fk = np.linspace(0, 1, fn)
frzL = sweep_filter(frzL, 4200 * (600 / 4200) ** fk, 'lowpass') * (1 - fk) ** 2; frzR = sweep_filter(frzR, 4200 * (600 / 4200) ** fk, 'lowpass') * (1 - fk) ** 2
m.add(C1, (frzL, frzR), gain=0.22, rev=0.5)
F0, F1 = C1, T['RESTART']; dF = F1 - F0
ring = shimmer([2637.0, 3951.1], dF, rng, 0.35) * env_at(tt(dF), [0, 0.8, dF - 1.6, dF], [0, 1, 0.8, 0])
m.add(F0, ring, gain=0.012, rev=0.3)                                               # the ring of silence
fz = drone([73.42, 110.0, 146.83, 220.0], dF + 0.3, rng, cutoff=800, lfo=0.05)
fenv = env_at(tt(dF + 0.3), [0, 0.8, dF - 1.5, dF, dF + 0.3], [0, 0.55, 0.7, 1.0, 0])
m.add(F0, (fz[0] * fenv, fz[1] * fenv), gain=0.15, rev=0.4)
gl_ = shimmer([1174.7, 1760.0, 2349.3], dF, rng, 0.5) * env_at(tt(dF), [0, 1.5, dF - 0.5, dF], [0, 0.7, 1.0, 0])
m.add(F0, gl_, gain=0.022, rev=0.6)
m.add(F0 + 1.6, bell(midi(86), rng, 3.0), gain=0.04, rev=0.8)
rb = bell(midi(74), rng, 2.2)[::-1]                                                # reverse swell into the restart
m.add(F1 - len(rb) / SR, rb, gain=0.12, rev=0.4)
m.add(F1 - 1.6, riser(rng, 1.6, 1200, 9000, 2.0), gain=0.12, rev=0.3)

# ---------- the restart (17 -> 27): ice crack; the screens' hum back for a moment, winding down; frost, snow, wind ----------
R0, R1 = T['RESTART'], T['SKY']; dR = R1 - R0
m.add(R0, icecrack(rng, 0.7, 5000, 400), gain=0.6, rev=0.5)
m.add(R0, boom(rng, 3.5, 64, 26, 1.4, 0.8, 0.9), gain=0.75, rev=0.45)
m.add(R0, glass(rng, 1.0), gain=0.25, pan=0.3, rev=0.5)
hm = mains(1.5) * env_at(tt(1.5), [0, 0.02, 0.15, 1.4, 1.5], [0, 1, 1, 0.1, 0]) * np.interp(tt(1.5), [0, 0.15, 1.4], [1, 1, 0.3])
m.add(R0, hm, gain=0.06)
m.add(R0 + 0.15, powerdown(rng, 1.3), gain=0.28, rev=0.3)
cr = np.random.default_rng(66); tc = R0 + 0.4
while tc < R1 - 0.3:                                                               # frost spreading: cracks and pings
    k = (tc - R0) / dR
    m.add(tc, icecrack(cr), gain=cr.uniform(0.04, 0.12) * (1 - 0.4 * k), pan=cr.uniform(-0.8, 0.8), rev=0.45)
    tc += cr.uniform(0.15, 0.7)
for tcr in [19.3, 21.1, 22.6, 24.4, 25.8]: m.add(tcr, creak(cr), gain=0.08, pan=cr.uniform(-0.6, 0.6), rev=0.4)
for tg in [18.2, 20.4, 23.5]: m.add(tg, glass(cr, 0.8), gain=0.08, pan=cr.uniform(-0.7, 0.7), rev=0.5)
tinkle(R0 + 0.3, R1, 6.0, 0.035, 67)
sn = hp(noise(dR, rng, 'pink'), 3000) * env_at(tt(dR), [0, 1.0, dR], [0, 1, 1])  # snow hiss
m.add(R0, norm(sn), gain=0.03, rev=0.3)
wd = howl(dR + 0.5, rng, 260, 700, 0.11, 0.1) * env_at(tt(dR + 0.5), [0, 2.0, dR - 2, dR + 0.5], [0, 0.5, 1.0, 1.0])
m.add(R0, wd, gain=0.06, rev=0.4)
cd = drone([73.42, 110.0, 174.61, 220.0], dR + 0.3, rng, cutoff=900, lfo=0.05)
cenv = env_at(tt(dR + 0.3), [0, 1.0, dR - 0.5, dR + 0.3], [0, 1, 1, 0])
m.add(R0, (cd[0] * cenv, cd[1] * cenv), gain=0.14, rev=0.4)
gp = pad([587.33, 880.0, 1174.66], dR, rng, cutoff=2200, attack=3.0, release=1.5, voices=2, harmonics=6)
m.add(R0, gp, gain=0.035, rev=0.6)
for j, nn in enumerate([74, 77, 76, 72]): m.add(R0 + 3.6 + j * 1.6, bell(midi(nn), rng, 2.4), gain=0.04, pan=0.25 * np.sin(j * 2.1), rev=0.7)
rum0 = lp(noise(dR, rng, 'brown'), 300) * env_at(tt(dR), [0, dR - 4, dR], [0, 0.2, 0.7])   # the sky starting to come down
m.add(R0, norm(rum0), gain=0.25, rev=0.3)
m.add(R1 - 2.4, riser(rng, 2.4, 250, 6000, 2.2), gain=0.2, rev=0.3)

# ---------- the sky falls (27 -> 38): a roar from above, booms, a rising howl, a riser into the white-out ----------
K0, K1 = T['SKY'], T['SPACE']; kd = K1 - K0
m.add(K0, boom(np.random.default_rng(271), 4.5, 50, 20, 2.0, 0.7, 1.0), gain=0.85, rev=0.5)
r1 = lp(noise(kd, rng, 'brown'), 900); r2 = lp(noise(kd, np.random.default_rng(102), 'brown'), 900)
renv = env_at(tt(kd), [0, 0.1, 4.0, kd - 1.5, kd - 0.05, kd], [0.3, 0.45, 0.6, 1.0, 1.0, 0.0])
m.add(K0, (norm(r1) * renv, norm(r2) * renv), gain=0.55, rev=0.35)
hw = howl(kd, rng, 350, 1100, 0.2, 0.07) * env_at(tt(kd), [0, 2, kd - 0.5, kd], [0.2, 0.5, 1.0, 0])
hw *= 1.0                                                                          # the howl climbs as the air speeds up
m.add(K0, sweep_filter(hw, np.linspace(1200, 4000, len(hw)), 'lowpass'), gain=0.09, pan=-0.2, rev=0.4)
hw2 = howl(kd, np.random.default_rng(9), 500, 1600, 0.27, 0.06) * env_at(tt(kd), [0, 4, kd - 0.5, kd], [0, 0.4, 1.0, 0])
m.add(K0, hw2, gain=0.06, pan=0.3, rev=0.4)
for k, tb in enumerate([29.6, 32.3, 34.7]): m.add(tb, boom(np.random.default_rng(400 + k), 3.0, 52, 24, 1.5, 0.5, 0.9), gain=0.4 + 0.08 * k, pan=0.3 * np.sin(k), rev=0.5)
m.add(30.0, whoosh(rng, 3.5, 120, 900, 0.6), gain=0.16, rev=0.5)
m.add(33.2, whoosh(rng, 3.0, 150, 1100, 0.6), gain=0.18, rev=0.5)
sd = drone([58.27, 87.31, 116.54, 174.61], kd, rng, cutoff=700, lfo=0.07)
senv = env_at(tt(kd), [0, 1.0, kd - 0.2, kd], [0, 0.8, 1.0, 0])
m.add(K0, (sd[0] * senv, sd[1] * senv), gain=0.16, rev=0.4)
m.add(T['WHITE'] - 1.6, riser(rng, 3.0, 220, 8000, 2.4), gain=0.3, rev=0.3)

# ---------- space (38 -> 50): a hit, a vast cold drone, the sea freezing far away, bells ----------
S0, S1 = T['SPACE'], T['VOSTOK']; sdur = S1 - S0 + 0.3
m.add(S0, boom(rng, 5.0, 55, 20, 2.2, 0.6, 1.0), gain=1.0, rev=0.5)
m.add(S0, downer(rng, 1.4, 2400, 80), gain=0.15, rev=0.4)
sp = drone([73.42, 110.0, 146.83, 220.0], sdur, rng, cutoff=650, lfo=0.05)
senv = env_at(tt(sdur), [0, 0.5, sdur - 1.0, sdur], [0, 1, 0.9, 0])
m.add(S0, (sp[0] * senv, sp[1] * senv), gain=0.24, rev=0.4)
sp2 = pad([293.66, 349.23, 440.0, 523.25], sdur, rng, cutoff=1500, attack=2.5, release=1.0, voices=2, harmonics=8)
m.add(S0, (sp2[0] * senv, sp2[1] * senv), gain=0.06, rev=0.6)
m.add(S0, norm(lp(noise(sdur, rng, 'brown'), 400)) * senv * env_at(tt(sdur), [0, 3, sdur], [1, 0.4, 0.3]), gain=0.18, rev=0.5)
m.add(S0 + 1.5, whoosh(rng, 3.5, 150, 900, 0.5), gain=0.16, rev=0.6)
cr2 = np.random.default_rng(88); tc = S0 + 3.0
while tc < S1 - 0.6:                                                               # the sea freezing over, far away
    m.add(tc, lp(icecrack(cr2), 3000), gain=cr2.uniform(0.02, 0.05), pan=cr2.uniform(-0.8, 0.8), rev=0.7); tc += cr2.uniform(0.3, 1.2)
tinkle(S0 + 2.0, S1 - 0.5, 2.5, 0.025, 89)
m.add(41.75, bell(midi(86), rng, 2.6), gain=0.06, rev=0.8)
m.add(45.75, thud(rng, 44, 1.2), gain=0.32, rev=0.6)
m.add(45.8, bell(midi(81), rng, 2.6), gain=0.05, rev=0.8)
m.add(S1 - 1.4, riser(rng, 1.4, 300, 4000, 2.0), gain=0.12, rev=0.3)

# ---------- Vostok, 21 July 1983 (50 -> 62): the polar wind, the station's generator, a lonely motif ----------
V0, V1 = T['VOSTOK'], T['END']; vd = V1 - V0
m.add(V0, thud(rng, 40, 1.4), gain=0.45, rev=0.6)
vw = howl(vd, rng, 220, 650, 0.09, 0.12) * env_at(tt(vd), [0, 0.6, vd - 1.0, vd], [0, 1, 1, 0])
m.add(V0, vw, gain=0.1, pan=-0.2, rev=0.4)
vw2 = norm(wind(rng, vd, 300, 1400, 0.12, 0.6)) * env_at(tt(vd), [0, 0.8, vd - 1.0, vd], [0, 1, 1, 0])
m.add(V0, vw2, gain=0.06, pan=0.3, rev=0.3)
gen = mains(vd, 50.0) * env_at(tt(vd), [0, 0.6, vd - 0.8, vd], [0, 1, 1, 0])     # the station's diesel generator (50 Hz)
m.add(V0, lp(gen, 1200), gain=0.012, pan=-0.4, rev=0.2)
vp = pad([110.0, 130.81, 164.81, 196.0], vd, rng, cutoff=900, attack=2.0, release=1.0, voices=2, harmonics=8)
m.add(V0, (fade(vp[0], 1.5, 0.8), fade(vp[1], 1.5, 0.8)), gain=0.07, rev=0.6)
vg = shimmer([987.8, 1318.5, 1760.0], vd, rng, 0.5) * env_at(tt(vd), [0, 2.0, vd - 1.0, vd], [0, 0.8, 1.0, 0])
m.add(V0, vg, gain=0.03, rev=0.7)
for j, nn in enumerate([69, 72, 76, 74, 72, 69, 67, 69]): m.add(V0 + 1.0 + j * 1.3, bell(midi(nn), rng, 2.2), gain=0.04, pan=0.2 * np.sin(j), rev=0.7)
for tcr in [52.4, 55.9]: m.add(tcr, creak(cr2), gain=0.05, pan=0.4, rev=0.5)
m.add(57.7, thud(rng, 42, 1.4), gain=0.38, rev=0.6)
m.add(57.7, bell(midi(62), rng, 3.0), gain=0.05, rev=0.8)
m.add(V1 - 1.2, riser(rng, 1.2, 400, 3000, 2.0), gain=0.07, rev=0.3)

# ---------- end card (62 -> 68): hush, the motif once more; Apple pops up (63.4) and ducks back down (65.4) ----------
ed = DUR - V1 + 0.1
ep_ = pad([146.83, 220.0, 293.66, 349.23], ed, rng, cutoff=1500, attack=1.0, release=2.0, voices=2, harmonics=10)
m.add(V1, (fade(ep_[0], 0.8, 2.2), fade(ep_[1], 0.8, 2.2)), gain=0.08, rev=0.6)
for j, nn in enumerate(motif[:5]): m.add(V1 + 0.4 + j * 0.75, bell(midi(nn), rng, 2.0), gain=0.045, pan=0.3 * np.sin(j * 1.7), rev=0.7)
m.add(63.42, woodblock(rng, 1250), gain=0.05, pan=0.0, rev=0.25)
m.add(65.4, woodblock(rng, 830), gain=0.04, pan=0.0, rev=0.25)

# ---------- the hook (0 -> 3.6): a hit and the roar of the sky coming down on the square ----------
hr = np.random.default_rng(97); th = tt(T['HOOK'])
m.add(0.0, boom(hr, 3.6, 52, 22, 2.0, 0.8, 1.0), gain=1.0, rev=0.4)
hro = lp(noise(T['HOOK'], hr, 'brown'), 900) * env_at(th, [0, 0.02, 3.4, 3.6], [0, 1, 0.85, 0])
m.add(0.0, norm(hro), gain=0.5, rev=0.3)
hh = howl(T['HOOK'], hr, 450, 1300, 0.3, 0.07) * env_at(th, [0, 0.05, 3.4, 3.6], [0, 1, 0.9, 0])
m.add(0.0, hh, gain=0.09, rev=0.4)
hp_ = pad([58.27, 87.31, 116.54], T['HOOK'], hr, cutoff=600, attack=0.05, release=0.2, voices=2, harmonics=8)
m.add(0.0, (fade(hp_[0], 0.02, 0.15), fade(hp_[1], 0.02, 0.15)), gain=0.2, rev=0.3)
m.add(0.0, glass(hr, 1.2), gain=0.18, rev=0.5)
m.add(1.7, boom(np.random.default_rng(98), 1.9, 48, 24, 1.0, 0.4, 0.7), gain=0.45, rev=0.5)
m.add(T['HOOK'] - 0.9, riser(hr, 0.9, 600, 7000, 1.6), gain=0.12, rev=0.2)

out = sys.argv[1] if len(sys.argv) > 1 else 'ep12.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
print('wrote', out)
