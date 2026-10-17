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


# ---------------- phone-first additions (mid-range instruments + mastering) ----------------
def pluck(freq, rng, dur=0.6, bright=0.6):
    """Karplus-Strong style pluck: bright, mid-range, cuts through phone speakers."""
    n = int(dur * SR); p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p)
    out = np.zeros(n); damp = 0.5 + 0.495 * bright
    for i in range(n):
        out[i] = buf[i % p]
        j = (i + 1) % p
        buf[i % p] = damp * 0.5 * (buf[i % p] + buf[j]) * 0.999 + (1 - damp) * buf[i % p] * 0.0
    out *= np.exp(-np.arange(n) / (0.35 * SR))
    out = hp(out, 120)
    return out / (np.abs(out).max() + 1e-9)


def synth_pluck(freq, dur=0.45, cutoff=3200, decay=6.0):
    """fast synthetic pluck (saw + filter envelope) - cheaper than Karplus-Strong."""
    t = tt(dur)
    x = np.zeros_like(t)
    for h in range(1, 18):
        if freq * h > SR / 2 - 1000: break
        x += np.sin(2 * np.pi * freq * h * t) / h * (0.92 ** h)
    env = np.exp(-t * decay) * np.minimum(1, t * 400)
    x = sweep_filter(x * env, cutoff * np.exp(-t * 4.0) + 300, 'lowpass', block=256)
    return x / (np.abs(x).max() + 1e-9)


def kick(rng, punch=1.0):
    t = tt(0.45)
    f = 45 + 120 * np.exp(-t * 28)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = bp(rng.standard_normal(len(t)), 1500, 5000) * np.exp(-t * 300) * 0.5 * punch
    y = np.tanh((x + click) * 1.8)
    return y / np.abs(y).max()


def snare(rng, tone=190):
    t = tt(0.35)
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t * 25)
    nz = bp(rng.standard_normal(len(t)), 1200, 7000) * np.exp(-t * 14)
    y = body * 0.6 + nz
    return y / np.abs(y).max()


def clap(rng):
    t = tt(0.3); y = np.zeros_like(t)
    for d in [0.0, 0.011, 0.023]:
        i = int(d * SR); seg = bp(rng.standard_normal(len(t) - i), 900, 6000) * np.exp(-np.arange(len(t) - i) / SR * 30)
        y[i:] += seg
    return y / np.abs(y).max()


def hat(rng, open_=False):
    t = tt(0.25 if open_ else 0.07)
    y = hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (12 if open_ else 70))
    return y / (np.abs(y).max() + 1e-9)


def metal_hit(rng, base=420, dur=1.8):
    """bright metallic clang (inharmonic partials) - audible on phones."""
    t = tt(dur); x = np.zeros_like(t)
    for k, a, d in [(1, 1, 0.9), (2.32, 0.7, 0.6), (3.87, 0.5, 0.45), (5.41, 0.35, 0.3), (7.13, 0.25, 0.2), (9.6, 0.15, 0.12)]:
        x += a * np.sin(2 * np.pi * base * k * t + rng.uniform(0, 6)) * np.exp(-t / d)
    x += bp(rng.standard_normal(len(t)), 2000, 9000) * np.exp(-t * 40) * 0.8
    return x / np.abs(x).max()


def crunch(rng, dur=1.2):
    """mid-range impact crunch layer (distorted noise)."""
    t = tt(dur)
    x = bp(rng.standard_normal(len(t)), 300, 4500) * np.exp(-t * 6)
    x = np.tanh(x * 3)
    return x / np.abs(x).max()


def excite_low(x, amount=0.35):
    """turn sub-bass into harmonics a phone speaker can play (missing-fundamental trick)."""
    low = lp(x, 160)
    harm = hp(np.tanh(low * 4.0), 180)
    return x + harm * amount


def eq_curve(x, points):
    """zero-phase EQ: points = [(Hz, dB), ...] interpolated on a log-frequency axis."""
    n = len(x); F = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    fp = np.log10([p[0] for p in points]); gp = [p[1] for p in points]
    g_db = np.interp(np.log10(np.maximum(f, 1.0)), fp, gp)
    return np.fft.irfft(F * 10 ** (g_db / 20), n)


PHONE_EQ = [(20, -18), (50, -14), (90, -10), (150, -6), (250, -3), (450, -0.5), (1000, 0), (2200, 4), (4500, 4.5), (8000, 2.5), (14000, 0), (20000, -3)]


def phone_master(L, R):
    """EQ for small speakers: sub turned into audible harmonics, then cut; presence lifted."""
    out = []
    for x in (L, R):
        x = excite_low(x, 0.6)
        x = eq_curve(x, PHONE_EQ)
        out.append(x)
    return out[0], out[1]


def measure_lufs(path):
    import subprocess, re
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    summ = r.stderr[r.stderr.rfind('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))


def loudnorm_file(path, target=-13.0, tp=-1.0, limit=False):
    """two-pass ffmpeg loudnorm to the social-media target. With limit=True a look-ahead limiter first
    tames the transients so the target loudness is reachable without clipping (delay compensated)."""
    import subprocess, json, os
    if limit:
        # static gain + look-ahead limiter only (loudnorm's dynamic fallback would ride the gain over time)
        lim = 10 ** ((tp - 0.6) / 20)
        for _ in range(6):
            I, _pk = measure_lufs(path)
            g = target - I
            if abs(g) < 0.15: break
            g *= 1.25 if g > 0 else 1.0
            tmp0 = path + '.lim.wav'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-af', f'volume={g:.2f}dB,alimiter=limit={lim:.4f}:attack=3:release=70:level=false:latency=true', '-ar', '48000', '-c:a', 'pcm_s16le', tmp0], check=True)
            os.replace(tmp0, path)
        return
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', f'loudnorm=I={target}:TP={tp}:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    txt = r.stderr; js = json.loads(txt[txt.rfind('{'):txt.rfind('}') + 1])
    tmp = path + '.tmp.wav'
    af = (f"loudnorm=I={target}:TP={tp}:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-af', af, '-ar', '48000', tmp], check=True)
    os.replace(tmp, path)


def render_phone(mix, path, rev_time=2.6, target=-13.0, tp=-1.0, limit=False):
    """render a Mix with the phone-first master + loudness normalisation."""
    ir_l, ir_r = reverb_ir(rev_time, mix.rng)
    wl = signal.fftconvolve(mix.rev_L, ir_l)[: mix.n]; wr = signal.fftconvolve(mix.rev_R, ir_r)[: mix.n]
    L, R = phone_master(mix.L + wl, mix.R + wr)
    pk = max(np.abs(L).max(), np.abs(R).max()) + 1e-9
    L, R = L / pk * 0.5, R / pk * 0.5
    # gentle glue compression
    env = np.sqrt(signal.sosfilt(signal.butter(1, 6, 'lowpass', fs=SR, output='sos'), (L * L + R * R) / 2) + 1e-12)
    g = np.where(env > 0.08, (0.08 / env) ** 0.35, 1.0)
    g = signal.sosfilt(signal.butter(1, 25, 'lowpass', fs=SR, output='sos'), g)
    L, R = np.tanh(L * g * 2.2) / 2.2 * 1.6, np.tanh(R * g * 2.2) / 2.2 * 1.6
    out = np.stack([L, R], 1); out /= np.abs(out).max() + 1e-9; out *= 0.89
    wavfile.write(path, SR, (out * 32767).astype(np.int16))
    loudnorm_file(path, target, tp, limit)
