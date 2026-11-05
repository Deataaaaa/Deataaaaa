"""Soundtrack for « 12 % » Partie 1 · La fumée. Cue times come from the narration's timing (audio/vo/ep20_<voice>.json), the
same rules as episodes/ep20.js. A dark drone and a heartbeat under everything; the smoke alarm's three-beep pattern from
3:12 on; the flashback muffled; « ET SI… » a reversed swell, the door, a whoomph and the stairwell's roar, then a tape
rewind; the bolt, the tap, the splash, the 18 ringing; Paris fire-brigade two-tone sirens closing in; the crowd, hoses, the
ladder's hydraulics; a tinnitus tone and a sting on the man; the message ping, a low hit on « Dommage. »; end card.
  python3 audio/ep20.py out/ep20.wav [voice]"""
import sys, os, json, math
import numpy as np
from synth import *

HERE = os.path.dirname(os.path.abspath(__file__))
voice = sys.argv[2] if len(sys.argv) > 2 else 'developpeuse'
VO = json.load(open(os.path.join(HERE, 'vo', f'ep20_{voice}.json')))
Ln = VO['lines']
L = lambda i: Ln[i]['t0']
def Lw(i, w):
    for u in Ln[i]['units']:
        if u['shown'].lower().startswith(w.lower()): return u['t0']
    return Ln[i]['t0']
cut = lambda x: x - 0.08
END0 = Ln[-1]['t0'] - 0.25
DUR = math.ceil((VO['duration'] + 4.4) * 10) / 10
S = dict(hook=0, face=cut(L(1)), ext=cut(L(2)), flash=cut(L(3)), man=cut(L(5)), detector=cut(L(6)), apple=cut(L(7)), gap=cut(L(8)),
         hand=cut(L(9)), peep=cut(L(10)), etsi=cut(L(11)), open=cut(L(12)), well=cut(L(13)), blind=cut(Lw(13, 'Elle')), stat=cut(L(14)),
         rewind=cut(L(15)), bolt=cut(L(16)), sink=cut(Lw(16, 'mouille')), towels=cut(Lw(16, 'et')), splash=cut(L(17)), call=cut(Lw(17, 'Et')),
         speaker=cut(L(18)), low=cut(L(19)), street=cut(L(20)), door=cut(Lw(20, 'Au')), neigh=cut(L(21)), ladder=cut(L(22)), news=cut(L(23)),
         crowd=cut(L(24)), man2=cut(L(25)), manclose=cut(L(26)), msg=cut(L(27)), black=END0, end=END0)
m = Mix(DUR, seed=20)
rng = np.random.default_rng(2020)

def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)
def seg(a, b): return max(0.05, b - a)
def beep(f=3100.0, dur=0.5):
    """the smoke alarm's piezo: a bright square-ish tone, band-limited so it bites without hurting"""
    t = tt(dur); x = np.sign(np.sin(2 * np.pi * f * t)) * 0.6 + np.sin(2 * np.pi * f * t) * 0.4
    return norm(bp(x, 1800, 5200)) * fade(np.ones(len(t)), 0.006, 0.01)
def alarm(t0, t1, gain=0.05, muffle=None):
    """three beeps (0.5 s on, 0.5 s off) then 1.5 s off, again and again (the T3 pattern)"""
    tc = t0
    while tc < t1:
        for k in range(3):
            tb = tc + k * 1.0
            if tb < t1 - 0.1:
                b = beep(); b = lp(b, muffle) if muffle else b
                m.add(tb, b, gain=gain, pan=0.1, rev=0.25)
        tc += 4.0
def heart(t0, t1, bpm0, bpm1, gain=0.22):
    tb = t0
    while tb < t1:
        k = (tb - t0) / max(0.01, t1 - t0); bpm = bpm0 + (bpm1 - bpm0) * k
        m.add(tb, heartbeat(rng), gain=gain, rev=0.1); tb += 60.0 / bpm
def siren(dur, rng, f1=435.0, f2=651.0, per=0.55):
    """the Paris fire brigade's two-tone (pin-pon)"""
    t = tt(dur); hi = (np.floor(t / per) % 2).astype(float); f = f1 + (f2 - f1) * hi
    f = lp(f, 40)                                                         # the tones slide a little into each other
    x = np.sin(2 * np.pi * np.cumsum(f) / SR); x = 0.7 * x + 0.3 * np.sign(x)
    return norm(lp(x, 3200))
def roar(dur, rng):
    """a fire in a stairwell: low rumble and crackle"""
    t = tt(dur); r = norm(lp(noise(dur, rng, 'brown'), 220)) * (0.75 + 0.25 * norm(lp(noise(dur, rng, 'white'), 2.0)))
    c = np.zeros(len(t))
    for _ in range(int(dur * 22)):
        t0 = rng.uniform(0, dur - 0.05); i0 = int(t0 * SR); n = int(0.012 * SR)
        c[i0:i0 + n] += rng.uniform(0.3, 1.0) * np.exp(-np.arange(n) / (0.002 * SR)) * rng.choice([-1, 1])
    return norm(r + 0.35 * bp(c, 900, 6000))
def crowd(dur, rng):
    out = np.zeros(int(dur * SR))
    for k in range(9):
        f0 = rng.uniform(250, 850); v = bp(noise(dur, rng, 'pink'), f0, f0 * 2.1)
        out += norm(v) * (0.5 + 0.5 * norm(lp(noise(dur, rng, 'white'), 1.2 + rng.uniform(0, 2))))
    return norm(out)
def radio(dur, rng):
    """fire-radio chatter: band-passed bursts with a squelch"""
    t = tt(dur); g = np.zeros(len(t)); tw = 0.2
    while tw < dur - 0.6:
        d = rng.uniform(0.6, 1.4); k = t - tw; g += np.where((k > 0) & (k < d), 1.0, 0); tw += d + rng.uniform(0.8, 2.0)
    x = norm(bp(noise(dur, rng, 'pink'), 600, 2600)) * g * (0.6 + 0.4 * norm(lp(noise(dur, rng, 'white'), 9)))
    return norm(x)
def ping():
    t = tt(0.6); return norm(np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t / 0.12) + 0.8 * np.where(t > 0.11, np.sin(2 * np.pi * 1760 * t) * np.exp(-(t - 0.11) / 0.18), 0))
def click(f=2500):
    t = tt(0.05); return norm(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) + 0.4 * noise(0.05, rng, 'white') * np.exp(-t / 0.003))
def creak(dur, rng, f=180):
    t = tt(dur); fm = f * (1 + 0.25 * np.sin(2 * np.pi * 0.7 * t) + 0.1 * norm(lp(noise(dur, rng, 'white'), 6)))
    x = np.sign(np.sin(2 * np.pi * np.cumsum(fm) / SR)) * np.exp(-((t - dur / 2) / (dur / 2.2)) ** 2)
    return norm(bp(x, 300, 2500))
def water(dur, rng):
    return norm(bp(noise(dur, rng, 'white'), 900, 7000) * (0.8 + 0.2 * norm(lp(noise(dur, rng, 'white'), 14))))
def tinnitus(dur):
    t = tt(dur); return np.sin(2 * np.pi * 5800 * t) * np.sin(np.pi * t / dur) ** 2

theme = [62, 65, 69, 68, 65, 62, 61]           # D minor with a raised-seventh sigh: the series motif (music box)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

# ---------- under everything: a dark drone that swells with the danger ----------
dr = drone([73.42, 110.0, 146.83, 155.56], DUR, rng, cutoff=520, lfo=0.05)
shape = env_at(tt(DUR), [0, S['face'], S['detector'], S['etsi'], S['stat'], S['rewind'], S['bolt'], S['street'], S['man2'], S['black'], DUR],
               [0.8, 0.6, 0.85, 1.0, 0.25, 0.4, 0.7, 0.8, 1.0, 0.5, 0.0])
m.add(0.0, (dr[0] * shape, dr[1] * shape), gain=0.07, rev=0.45)

# ---------- hook (a flash-forward: she opens, the black wave): a hit on frame 1, the alarm, the smoke's roar, a riser into the cut ----------
m.add(0.0, boom(rng, 3.0, 50, 24, 1.8, 0.5, 1.0), gain=0.8, rev=0.5)
alarm(0.15, S['face'] - 0.1, gain=0.035)
m.add(0.0, fade(roar(S['face'] + 0.2, rng), 0.05, 0.3), gain=0.1, rev=0.4)
m.add(S['face'] - 0.9, riser(rng, 0.9, 200, 3500, 2.0) * np.linspace(1, 0.2, int(0.9 * SR)), gain=0.12, rev=0.3)
m.add(S['face'], thud(rng, 46, 0.7), gain=0.5, rev=0.3)
heart(S['face'] + 0.2, S['ext'], 66, 72, 0.18)

# ---------- the street at 3:12, then the flashback (muffled, warmer) ----------
m.add(S['ext'], fade(wind(rng, seg(S['ext'], S['flash']) + 0.3, 150, 800, 0.2, 0.4), 0.4, 0.3), gain=0.08, rev=0.4)
m.add(S['ext'], fade(norm(lp(noise(seg(S['ext'], S['flash']) + 0.3, rng, 'brown'), 140)), 0.5, 0.3), gain=0.06, rev=0.3)
m.add(S['flash'] - 0.35, whoosh(rng, 0.4, 2500, 300, 0.5), gain=0.1, rev=0.3)
fl = seg(S['flash'], S['detector'])
m.add(S['flash'], fade(lp(crowd(fl, rng), 700), 0.3, 0.2), gain=0.05, rev=0.4)                                         # the street at 22:41
m.add(S['flash'] + 0.4, lp(creak(1.4, rng, 120), 2000), gain=0.08, rev=0.3)                                           # the heavy door
for k in range(7): m.add(S['flash'] + 0.6 + k * 0.52, lp(thud(rng, 120 + 10 * (k % 2), 0.12), 1500), gain=0.05, pan=0.2, rev=0.15)   # her steps
pf = pad([146.83, 174.61, 220.0], fl, rng, cutoff=900, attack=1.0, release=0.4, voices=2, harmonics=8)
m.add(S['flash'], (fade(pf[0], 1.0, 0.3), fade(pf[1], 1.0, 0.3)), gain=0.05, rev=0.6)
m.add(S['man'], metal_hit(rng, 310, 1.6), gain=0.08, rev=0.6)                                                         # « Elle a répondu. »

# ---------- 3:12: the alarm, the smoke, her heart ----------
m.add(S['detector'], thud(rng, 52, 0.6), gain=0.45, rev=0.3)
alarm(S['detector'] + 0.05, S['etsi'] - 0.3, gain=0.06)
heart(S['detector'], S['etsi'], 84, 112, 0.2)
m.add(S['apple'] + 0.3, norm(bp(noise(0.9, rng, 'white'), 2500, 9000)) * np.exp(-tt(0.9) / 0.3), gain=0.07, pan=0.2, rev=0.2)   # the hiss
m.add(S['gap'], fade(roar(seg(S['gap'], S['etsi']), rng), 1.5, 0.2), gain=0.06, rev=0.4)                                # the fire, somewhere below
m.add(S['hand'] + 0.2, lp(thud(rng, 90, 0.25), 900), gain=0.08, rev=0.2)                                              # her hand on the door
m.add(S['peep'] - 0.3, riser(rng, 2.4, 150, 1800, 2.2) * np.linspace(0.3, 1, int(2.4 * SR)), gain=0.08, rev=0.4)

# ---------- « ET SI… »: a reversed swell; the door; a whoomph; the stairwell's roar; the dark ----------
sw = riser(rng, 1.2, 300, 5000, 1.6); m.add(S['etsi'] - 0.2, sw, gain=0.12, rev=0.6)
m.add(S['etsi'] + 0.05, bell(midi(74), rng, 2.4), gain=0.06, rev=0.7)
m.add(S['open'] + 0.3, click(1800), gain=0.08, rev=0.2); m.add(S['open'] + 0.4, creak(0.9, rng, 160), gain=0.08, rev=0.3)
m.add(S['open'] + 0.6, boom(rng, 2.0, 40, 22, 1.2, 0.2, 1.0), gain=0.55, rev=0.5)
m.add(S['open'] + 0.6, whoosh(rng, 1.6, 120, 1800, 0.35), gain=0.25, rev=0.4)
m.add(S['open'] + 0.6, fade(roar(seg(S['open'], S['stat']) + 0.5, rng), 0.2, 0.6), gain=0.22, rev=0.5)
heart(S['open'] + 0.6, S['stat'] + 2.5, 130, 150, 0.24)
m.add(S['stat'] + 0.2, fade(lp(noise(3.6, rng, 'brown'), 90), 0.1, 2.5), gain=0.12, rev=0.4)
# ---------- rewind ----------
rw = seg(S['rewind'], S['bolt'])
t_ = tt(rw); f_ = 260 * np.exp(np.log(14) * t_ / rw)
x_ = np.sin(2 * np.pi * np.cumsum(f_ * (1 + 0.05 * np.sin(2 * np.pi * 27 * t_))) / SR)
m.add(S['rewind'], norm(lp(x_, 4500) * np.sin(np.pi * t_ / rw) ** 0.4 + 0.3 * norm(bp(noise(rw, rng, 'white'), 1500, 6000))), gain=0.14, rev=0.25)
m.add(S['bolt'] - 0.03, click(1200), gain=0.12, rev=0.2)

# ---------- what she does: bolt, tap, towels, splash, the 18 ----------
m.add(S['bolt'] + 0.85, click(900) + 0.6 * click(600), gain=0.12, rev=0.2)                                            # the deadbolt
alarm(S['bolt'] + 0.3, S['street'] - 0.2, gain=0.03, muffle=2600)
heart(S['bolt'], S['street'], 104, 96, 0.14)
m.add(S['sink'] + 0.15, fade(water(seg(S['sink'], S['towels']) + 0.1, rng), 0.05, 0.15), gain=0.1, rev=0.2)
m.add(S['towels'] + 0.25, lp(thud(rng, 100, 0.2), 1000), gain=0.08, rev=0.15); m.add(S['towels'] + 0.85, lp(thud(rng, 110, 0.2), 1000), gain=0.07, rev=0.15)
m.add(S['splash'] + 0.25, fade(water(0.7, rng), 0.005, 0.4), gain=0.2, rev=0.25)
m.add(S['splash'] + 0.28, lp(thud(rng, 80, 0.3), 1200), gain=0.12, rev=0.2)
for k in range(3):                                                                                                        # French ring-back: 440 Hz, 1.5 s on
    t0 = S['call'] + 0.6 + k * 1.9
    if t0 + 1.2 < S['speaker'] + 0.3: m.add(t0, fade(np.sin(2 * np.pi * 440 * tt(1.2)), 0.01, 0.02), gain=0.035, rev=0.1)
m.add(S['speaker'] - 0.1, click(3000), gain=0.07, rev=0.1)
m.add(S['speaker'], fade(radio(seg(S['speaker'], S['low']), rng), 0.1, 0.2), gain=0.025, rev=0.1)

# ---------- sirens closing in; the street ----------
si = seg(S['low'] - 3.0, S['crowd'])
m.add(S['low'] - 3.0, siren(si, rng) * env_at(tt(si), [0, 4, 7.5, 11, si], [0.05, 0.3, 0.9, 0.6, 0.4]), gain=0.09, pan=-0.2, rev=0.45)
m.add(S['low'] - 1.4, siren(si - 1.6, rng, 440, 656, 0.6) * env_at(tt(si - 1.6), [0, 5, 9, si - 1.6], [0.0, 0.4, 0.7, 0.3]), gain=0.06, pan=0.3, rev=0.45)
st = seg(S['street'], S['man2'])
m.add(S['street'], fade(crowd(st, rng), 0.5, 0.5), gain=0.09, rev=0.4)
m.add(S['street'], fade(norm(lp(noise(st, rng, 'brown'), 120)), 0.3, 0.3), gain=0.07, rev=0.3)                           # trucks idling
m.add(S['street'], fade(roar(st, rng), 0.4, 0.4), gain=0.07, rev=0.4)
m.add(S['street'] + 0.6, fade(radio(st - 0.6, rng), 0.1, 0.3), gain=0.03, pan=-0.3, rev=0.2)
m.add(S['door'], fade(norm(bp(noise(seg(S['door'], S['ladder']), rng, 'white'), 2000, 9000)), 0.3, 0.3), gain=0.035, rev=0.3)   # hoses
la = seg(S['ladder'], S['news'])
t_ = tt(la); hyd = np.sin(2 * np.pi * np.cumsum(140 + 70 * t_ / la) / SR)
m.add(S['ladder'] + 0.1, norm(lp(hyd + 0.3 * np.sign(hyd), 900)) * env_at(t_, [0, 0.3, la - 0.4, la], [0, 1, 1, 0]), gain=0.06, rev=0.3)
m.add(S['news'], boom(rng, 3.0, 44, 26, 2.0, 0.2, 0.9), gain=0.35, rev=0.55)
pn = pad([73.42, 110.0, 146.83, 174.61], seg(S['news'], S['crowd']), rng, cutoff=900, attack=1.2, release=0.8, voices=2, harmonics=8)
m.add(S['news'], (fade(pn[0], 1.2, 0.6), fade(pn[1], 1.2, 0.6)), gain=0.06, rev=0.6)
m.add(S['crowd'], fade(crowd(seg(S['crowd'], S['man2']) + 0.3, rng), 0.3, 0.4), gain=0.12, rev=0.4)

# ---------- the man: everything thins to a high tone and her heart; a sting on « L'homme de la porte. » ----------
mm = seg(S['man2'], S['msg'])
m.add(S['man2'], tinnitus(mm + 0.6), gain=0.012, rev=0.3)
heart(S['man2'], S['msg'] + 1.0, 70, 92, 0.22)
m.add(S['manclose'] + 0.38, whoosh(rng, 0.3, 300, 4000, 0.5), gain=0.12, rev=0.3)
m.add(S['manclose'] + 0.5, metal_hit(rng, 260, 2.2), gain=0.12, rev=0.7)
m.add(S['manclose'] + 0.5, boom(rng, 2.0, 46, 26, 1.2, 0.5, 0.8), gain=0.45, rev=0.5)
# ---------- the message: a ping; a low hit on « Dommage. »; black ----------
m.add(L(27) + 0.9, ping(), gain=0.09, rev=0.2)
dm = Lw(28, 'Dommage')
m.add(dm, boom(rng, 3.5, 40, 20, 2.4, 0.3, 1.0), gain=0.75, rev=0.6)
m.add(dm, fade(norm(lp(noise(3.5, rng, 'brown'), 70)), 0.01, 2.8), gain=0.15, rev=0.5)
# ---------- end card: the series motif on a music box over a dark pad ----------
pe = pad([73.42, 110.0, 146.83, 174.61], DUR - S['black'] + 0.1, rng, cutoff=1100, attack=1.0, release=2.0, voices=2, harmonics=8)
m.add(S['black'] + 0.4, (fade(pe[0], 1.0, 2.0), fade(pe[1], 1.0, 2.0)), gain=0.06, rev=0.6)
for j, nn in enumerate(theme): m.add(S['end'] + 0.2 + j * 0.42, bell(midi(nn + 12), rng, 2.2), gain=0.04, pan=0.25 * math.sin(j * 1.7), rev=0.7)
m.add(S['end'] + 1.0, woodblock(rng, 1250), gain=0.04, rev=0.25)

# ---------- the narration: the music ducks under it ----------
import wave
from scipy import signal
vp = os.path.join(HERE, 'vo', f'ep20_{voice}.wav')
with wave.open(vp, 'rb') as w: vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
vo = signal.resample_poly(vo, SR, vsr)[: m.n]
vo = hp(vo, 80) + 0.25 * bp(vo, 2200, 5200)
env = np.sqrt(signal.sosfilt(signal.butter(1, 12, 'lowpass', fs=SR, output='sos'), vo * vo) + 1e-12)
vo = vo * np.where(env > 0.06, (0.06 / env) ** 0.45, 1.0)
duck = signal.sosfilt(signal.butter(1, 3, 'lowpass', fs=SR, output='sos'), np.clip(env / 0.03, 0, 1))
duck = 1.0 - 0.5 * np.clip(duck, 0, 1)
n = len(duck); m.L[:n] *= duck; m.R[:n] *= duck; m.rev_L[:n] *= duck; m.rev_R[:n] *= duck
m.add(0.0, norm(vo), gain=0.95, rev=0.05)

out = sys.argv[1] if len(sys.argv) > 1 else 'out/ep20.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
