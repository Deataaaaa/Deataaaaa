"""Tiny offline synth for the soundtracks: pads, ticks, booms, risers, wind, reverb, mastering.
Everything is deterministic (seeded) so re-renders are identical."""
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000


class Mix:
    def __init__(self, dur, seed=1):
        self.n = int(dur * SR)
        self.L = np.zeros(self.n, np.float64)
        self.R = np.zeros(self.n, np.float64)
        self.rev_L = np.zeros(self.n, np.float64)  # reverb send
        self.rev_R = np.zeros(self.n, np.float64)
        self.rng = np.random.default_rng(seed)

    def add(self, t, sig, gain=1.0, pan=0.0, rev=0.0):
        """sig: mono array or (L, R) tuple; t in seconds."""
        i0 = int(t * SR)
        if isinstance(sig, tuple):
            l, r = sig
        else:
            l = r = sig
        m = min(len(l), self.n - i0)
        if m <= 0 or i0 < 0:
            return
        gl = gain * np.sqrt(0.5 * (1 - pan)) * 1.414
        gr = gain * np.sqrt(0.5 * (1 + pan)) * 1.414
        self.L[i0:i0 + m] += l[:m] * gl
        self.R[i0:i0 + m] += r[:m] * gr
        if rev > 0:
            self.rev_L[i0:i0 + m] += l[:m] * gl * rev
            self.rev_R[i0:i0 + m] += r[:m] * gr * rev

    def render(self, path, rev_time=2.8, target_rms_db=-16.0):
        ir_l, ir_r = reverb_ir(rev_time, self.rng)
        wl = signal.fftconvolve(self.rev_L, ir_l)[: self.n]
        wr = signal.fftconvolve(self.rev_R, ir_r)[: self.n]
        L = self.L + wl
        R = self.R + wr
        sos = signal.butter(2, 28, 'highpass', fs=SR, output='sos')
        L = signal.sosfilt(sos, L)
        R = signal.sosfilt(sos, R)
        # gentle bus compression (RMS follower), then soft clip
        env = np.sqrt(signal.sosfilt(signal.butter(1, 4, 'lowpass', fs=SR, output='sos'), (L * L + R * R) / 2) + 1e-12)
        rms = np.sqrt(np.mean((L * L + R * R) / 2)) + 1e-9
        target = 10 ** (target_rms_db / 20)
        g = target / rms
        L *= g
        R *= g
        env *= g
        thr = 10 ** (-12 / 20)
        comp = np.where(env > thr, (thr / env) ** 0.45, 1.0)
        comp = signal.sosfilt(signal.butter(1, 20, 'lowpass', fs=SR, output='sos'), comp)
        L *= comp
        R *= comp
        L = np.tanh(L * 1.1) / np.tanh(1.1)
        R = np.tanh(R * 1.1) / np.tanh(1.1)
        peak = max(np.abs(L).max(), np.abs(R).max())
        if peak > 0.97:
            L *= 0.97 / peak
            R *= 0.97 / peak
        # tiny fades at the ends
        f = int(0.01 * SR)
        L[:f] *= np.linspace(0, 1, f); R[:f] *= np.linspace(0, 1, f)
        out = np.stack([L, R], 1)
        wavfile.write(path, SR, (out * 32767).astype(np.int16))
        return out


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def reverb_ir(rt, rng):
    n = int(rt * SR)
    t = np.arange(n) / SR
    env = np.exp(-6.9 * t / rt)
    pre = int(0.018 * SR)
    out = []
    for _ in range(2):
        x = rng.standard_normal(n) * env
        x = signal.sosfilt(signal.butter(2, 6500, 'lowpass', fs=SR, output='sos'), x)
        x[:pre] = 0
        out.append(x / np.sqrt(np.sum(x * x)) * 0.9)
    return out


def adsr(n, a, d, s, r, sustain_len=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    if sustain_len is None:
        sustain_len = max(0, n - a - d - r)
    else:
        sustain_len = int(sustain_len * SR)
    e = np.concatenate([np.linspace(0, 1, a, endpoint=False), np.linspace(1, s, d, endpoint=False), np.full(sustain_len, s), np.linspace(s, 0, r)])
    if len(e) < n:
        e = np.concatenate([e, np.zeros(n - len(e))])
    return e[:n]


def fade(x, fin=0.0, fout=0.0):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'lowpass', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'highpass', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def sweep_filter(x, fcs, kind='lowpass', block=1024, q_order=2):
    """time-varying filter: fcs is an array (per sample) of cutoffs (or (lo,hi) for bandpass)."""
    out = np.zeros_like(x)
    zi = None
    for i in range(0, len(x), block):
        fc = fcs[min(i + block // 2, len(fcs) - 1)]
        if kind == 'bandpass':
            lo, hi = fc
            sos = signal.butter(q_order, [max(20, lo), min(SR / 2 - 100, hi)], 'bandpass', fs=SR, output='sos')
        else:
            sos = signal.butter(q_order, min(SR / 2 - 100, max(20, fc)), kind, fs=SR, output='sos')
        if zi is None or zi.shape[0] != sos.shape[0]:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
    return out


def noise(dur, rng, color='white'):
    n = int(dur * SR)
    w = rng.standard_normal(n)
    if color == 'white':
        return w
    if color == 'pink':
        f = np.fft.rfft(w)
        k = np.arange(len(f)); k[0] = 1
        f /= np.sqrt(k)
        x = np.fft.irfft(f, n)
        return x / (np.std(x) + 1e-9)
    if color == 'brown':
        x = np.cumsum(w)
        x = hp(x, 15)
        return x / (np.std(x) + 1e-9)


def saw_voice(freq, dur, harmonics=14, detune_cents=0.0, phase=0.0):
    t = tt(dur)
    f = freq * 2 ** (detune_cents / 1200)
    x = np.zeros_like(t)
    for h in range(1, harmonics + 1):
        if f * h > SR / 2 - 1000: break
        x += np.sin(2 * np.pi * f * h * t + phase * h) / h
    return x * 0.5


def pad(freqs, dur, rng, cutoff=1400, attack=2.0, release=2.0, voices=3, harmonics=12):
    L = np.zeros(int(dur * SR)); R = np.zeros(int(dur * SR))
    for f in freqs:
        for v in range(voices):
            d = (v - (voices - 1) / 2) * 6.0 + rng.uniform(-1.5, 1.5)
            x = saw_voice(f, dur, harmonics, d, rng.uniform(0, 6.28))
            if v % 2: L += x
            else: R += x
            if voices == 1: L += x
    env = adsr(len(L), attack, 0.5, 0.85, release)
    L = lp(L, cutoff) * env; R = lp(R, cutoff) * env
    s = max(np.abs(L).max(), np.abs(R).max()) + 1e-9
    return (L / s, R / s)


def tick(rng, bright=1.0, low=False):
    t = tt(0.18)
    click = bp(rng.standard_normal(len(t)), 1800, 7000) * np.exp(-t * 180) * 0.8 * bright
    tone = np.sin(2 * np.pi * 1650 * t) * np.exp(-t * 60) * 0.35 * bright
    x = click + tone
    if low:
        x += np.sin(2 * np.pi * 420 * t) * np.exp(-t * 30) * 0.6 + np.sin(2 * np.pi * 95 * t) * np.exp(-t * 18) * 0.5
    return x / (np.abs(x).max() + 1e-9)


def woodblock(rng, f=880):
    t = tt(0.5)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 28) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 45)
    x += bp(rng.standard_normal(len(t)), 1000, 5000) * np.exp(-t * 300) * 0.4
    return x / np.abs(x).max()


def boom(rng, dur=4.0, f0=72, f1=28, decay=1.6, crack=0.6, body=0.7):
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 2.5)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(ph) * np.exp(-t / decay)
    th = np.sin(2 * np.pi * 115 * t) * np.exp(-t * 7) * body
    n = rng.standard_normal(len(t))
    cr = lp(n, 5000) * np.exp(-t * 14) * crack
    rumble = lp(noise(dur, rng, 'brown'), 180) * np.exp(-t / (decay * 1.2)) * 0.5
    x = sub + th + cr + rumble
    return x / np.abs(x).max()


def riser(rng, dur, f0=250, f1=7000, curve=2.0):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    fc = f0 * (f1 / f0) ** (t ** curve)
    x = sweep_filter(noise(dur, rng, 'white'), list(zip(fc * 0.7, fc * 1.4)), 'bandpass')
    env = t ** 2.2
    tone_f = 140 * (4.0 ** (t ** curve))
    tone = np.sin(2 * np.pi * np.cumsum(tone_f) / SR) * 0.25
    y = (x / (np.abs(x).max() + 1e-9) + tone) * env
    return y / (np.abs(y).max() + 1e-9)


def whoosh(rng, dur=1.6, f0=300, f1=2500, peak=0.55):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    fc = np.where(t < peak, f0 + (f1 - f0) * (t / peak) ** 1.5, f1 - (f1 - f0) * ((t - peak) / (1 - peak)))
    x = sweep_filter(noise(dur, rng, 'pink'), list(zip(fc * 0.6, fc * 1.6)), 'bandpass')
    env = np.where(t < peak, (t / peak) ** 2, ((1 - t) / (1 - peak)) ** 1.5)
    y = x * env
    return y / (np.abs(y).max() + 1e-9)


def wind(rng, dur, lo=160, hi=900, mod=0.18, depth=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = bp(noise(dur, rng, 'pink'), lo, hi)
    am = 1 - depth * 0.5 * (1 + np.sin(2 * np.pi * mod * t + rng.uniform(0, 6)))
    am2 = 1 - 0.25 * (1 + np.sin(2 * np.pi * mod * 2.7 * t + rng.uniform(0, 6))) * 0.5
    y = x * am * am2
    return y / (np.abs(y).max() + 1e-9)


def drone(freqs, dur, rng, cutoff=320, lfo=0.07):
    L, R = pad(freqs, dur, rng, cutoff=cutoff, attack=1.2, release=1.5, voices=2, harmonics=10)
    t = tt(dur)
    m = 0.75 + 0.25 * np.sin(2 * np.pi * lfo * t)
    return (L * m, R * m)


def groan(rng, dur=3.5, base=88):
    t = tt(dur)
    bend = 1 - 0.18 * (t / dur) ** 1.4
    x = np.zeros_like(t)
    for k, a in [(1, 1.0), (1.63, 0.6), (2.41, 0.45), (3.73, 0.3), (5.1, 0.2)]:
        f = base * k * bend * (1 + 0.012 * np.sin(2 * np.pi * (5 + k) * t))
        x += a * np.sin(2 * np.pi * np.cumsum(f) / SR)
    x *= (0.6 + 0.4 * np.sin(2 * np.pi * 7.5 * t) ** 2)
    scrape = bp(rng.standard_normal(len(t)), 500, 2600) * (0.25 + 0.2 * np.sin(2 * np.pi * 3.1 * t))
    y = (x + scrape) * adsr(len(t), 0.25, 0.4, 0.8, 1.2)
    return y / (np.abs(y).max() + 1e-9)


def bell(f, rng, dur=3.0):
    t = tt(dur)
    x = np.zeros_like(t)
    for k, a, d in [(1, 1.0, 1.4), (2.0, 0.35, 0.9), (2.76, 0.25, 0.6), (5.4, 0.1, 0.3)]:
        x += a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / d)
    x *= np.minimum(1, t * 200)
    return x / np.abs(x).max()


def heartbeat(rng):
    t = tt(0.5)
    one = np.sin(2 * np.pi * 52 * t) * np.exp(-t * 22)
    x = one.copy()
    i = int(0.16 * SR)
    x[i:] += 0.7 * one[: len(x) - i]
    return lp(x, 300)


def thud(rng, f=60, dur=0.6):
    t = tt(dur)
    x = np.sin(2 * np.pi * f * t * (1 - 0.3 * t)) * np.exp(-t * 9) + lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 30) * 0.4
    return x / np.abs(x).max()
