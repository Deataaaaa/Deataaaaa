"""Soundtrack for « 12 % » Partie 3 · Le 5e. Cue times come from the narration's timing (audio/vo/ep22_<voice>.json), the
same rules as episodes/ep22.js. A dark drone and her heartbeat; the hook (the door opening in slow motion); the street at 4:28 and
the police car leaving; the dead light switch; the low-battery alert; the deadbolt; the landing timer clicking on behind her door
and its clockwork, muffled; three hard knocks that rattle the door, two soft ones; her steps to the peephole; « ET SI… »: the bolt,
the door, a sting on « C'est lui. », the door shut behind him; the tape rewind; the card tapped on the door; DTMF 1-7, the
French ringback tone, knocks during the call; the timer running out; slow steps down, a door below; the murmur in the duct (the
last line goes through it); her phone dying; the end card's music box.
  python3 audio/ep22.py out/ep22.wav [voice]"""
import sys, os, json, math
import numpy as np
from synth import *

HERE = os.path.dirname(os.path.abspath(__file__))
voice = sys.argv[2] if len(sys.argv) > 2 else 'developpeuse'
VO = json.load(open(os.path.join(HERE, 'vo', f'ep22_{voice}.json')))
Ln = VO['lines']
L = lambda i: Ln[i]['t0']
def Lw(i, w, n=1):
    us = [u for u in Ln[i]['units'] if u['shown'].lower().startswith(w.lower())]
    return us[n - 1]['t0'] if len(us) >= n else Ln[i]['t0']
cut = lambda x: x - 0.08
END0 = Ln[-1]['t0'] - 0.25
DUR = math.ceil((VO['duration'] + 4.4) * 10) / 10
names = ['hook', 'face', 'window', 'win5', 'power', 'phone1', 'bolt', 'sit', 'apple', 'knock', 'police', 'door2', 'feet', 'approach', 'peep1',
         'armband', 'etsi', 'open', 'lower', 'inside', 'law', 'rewind', 'ask', 'answer', 'eye', 'card', 'rio', 'rio2', 'dial', 'whisper',
         'nopatrol', 'tip', 'stop', 'door5', 'breathe', 'apple2', 'grille', 'murmur', 'hear', 'dead', 'end']
starts = [0, L(1), L(2), L(4), L(5), L(6), L(7), Lw(7, 'Elle', 2), L(8), L(9), L(11), L(12), L(13), L(14), L(15), L(16), L(17), L(18), L(19),
          L(20), L(21), L(22), L(23), L(24), L(25), L(26), L(27), L(28), L(29), L(30), L(31), L(32), L(33), L(34), L(35), L(36), L(37), L(38),
          L(39), L(40)]
S = {n: (cut(x) if i else 0.0) for i, (n, x) in enumerate(zip(names, starts))}; S['end'] = END0
T0 = Lw(40, '0')                                                     # her phone dies
T_ON, T_OFF = Lw(9, 'On') - 0.4, L(31) + 0.6                         # the landing timer: on just before the knocks, out during the call
KN = [Lw(9, 'frappe') + 0.55 + d for d in (0, 0.42, 0.84)]           # the three hard knocks (the door rattles on screen)
KS = [L(14) - 0.75 + d for d in (0, 0.5)]                            # two soft ones
m = Mix(DUR, seed=22)
rng = np.random.default_rng(2222)
POST = []                                                           # (t, x, kw): mixed after the ducking (knocks, slams)
def addp(t, x, **kw): POST.append((t, x, kw))

def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)
def seg(a, b): return max(0.05, b - a)
def heart(t0, t1, bpm0, bpm1, gain=0.22):
    tb = t0
    while tb < t1:
        k = (tb - t0) / max(0.01, t1 - t0); bpm = bpm0 + (bpm1 - bpm0) * k
        m.add(tb, heartbeat(rng), gain=gain, rev=0.1); tb += 60.0 / bpm
def click(f=2500):
    t = tt(0.05); return norm(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) + 0.4 * noise(0.05, rng, 'white') * np.exp(-t / 0.003))
def creak(dur, rng, f=180):
    t = tt(dur); fm = f * (1 + 0.25 * np.sin(2 * np.pi * 0.7 * t) + 0.1 * norm(lp(noise(dur, rng, 'white'), 6)))
    x = np.sign(np.sin(2 * np.pi * np.cumsum(fm) / SR)) * np.exp(-((t - dur / 2) / (dur / 2.2)) ** 2)
    return norm(bp(x, 300, 2500))
def tinnitus(dur):
    t = tt(dur); return np.sin(2 * np.pi * 5800 * t) * np.sin(np.pi * t / dur) ** 2
def tick():
    t = tt(0.04); return norm(bp(np.sin(2 * np.pi * 3400 * t) * np.exp(-t / 0.003) + 0.5 * noise(0.04, rng, 'white') * np.exp(-t / 0.002), 1500, 7000))
def ticking(t0, t1, gain=0.05, muffle=None):
    tb = t0
    while tb < t1:
        x = tick() if muffle is None else norm(lp(tick(), muffle))
        m.add(tb, x, gain=gain * (1.0 if int((tb - t0) * 4) % 2 == 0 else 0.7), pan=0.2, rev=0.3); tb += 0.25
def step(f=95, hard=1.0):
    x = thud(rng, f, 0.18).copy(); c = lp(creak(0.12, rng, 260 + rng.uniform(-40, 40)), 2600); n = min(len(x), len(c))
    x[:n] += 0.25 * hard * c[:n]
    return norm(lp(x, 1800))
def steps(t0, t1, period, gain=0.08, f=95, pan=0.0, rev=0.35, hard=1.0, muffle=None):
    tb = t0
    while tb < t1:
        x = step(f + rng.uniform(-8, 8), hard); x = x if muffle is None else norm(lp(x, muffle))
        m.add(tb, x, gain=gain * rng.uniform(0.85, 1.1), pan=pan, rev=rev); tb += period * rng.uniform(0.94, 1.06)
def breath(dur, rng, rate=0.6):
    t = tt(dur); e = np.maximum(0, np.sin(2 * np.pi * rate * t)) ** 1.5
    return norm(bp(noise(dur, rng, 'pink'), 500, 3200) * e)
def knock_once(hard=1.0):
    """a fist on her door, heard from inside: the panel booms, the bolt rattles in its keeper"""
    x = thud(rng, 120, 0.16) + 0.45 * bp(noise(0.16, rng, 'white'), 500, 2400) * np.exp(-tt(0.16) / 0.012)
    r = bp(noise(0.12, rng, 'white'), 2500, 7000) * np.exp(-tt(0.12) / 0.03) * hard; n = len(r); x[:n] += 0.35 * r
    return norm(lp(x, 3200))
def dtmf(lo, hi, dur=0.16):
    t = tt(dur); return norm(np.sin(2 * np.pi * lo * t) + np.sin(2 * np.pi * hi * t)) * fade(np.ones(len(t)), 0.005, 0.01)
def ringback(dur):
    """the French ringback: 440 Hz, 1.5 s on, 3.5 s off, as heard in a phone's earpiece"""
    t = tt(dur); g = ((t % 5.0) < 1.5).astype(float)
    return norm(bp(np.sin(2 * np.pi * 440 * t) * g, 300, 3400)) * fade(np.ones(len(t)), 0.01, 0.05)
def lowbat():
    t = tt(0.7); a = np.sin(2 * np.pi * 880 * t) * np.exp(-t / 0.09); b = np.where(t > 0.2, np.sin(2 * np.pi * 660 * (t - 0.2)) * np.exp(-(t - 0.2) / 0.12), 0)
    return norm(a + b)
def poweroff():
    t = tt(1.1); f = 900 * np.exp(-2.2 * t); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.35))
def engine(dur, rng, f0=38):
    t = tt(dur); x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.04 * np.sin(2 * np.pi * 0.3 * t))) / SR)
    return norm(lp(np.sign(x) * 0.4 + x + 0.5 * norm(lp(noise(dur, rng, 'brown'), 160)), 700))
def murmur(dur, rng):
    """a man's voice somewhere down the duct: no words, just the rhythm of speech, thin and metallic"""
    t = tt(dur); syl = np.maximum(0, np.sin(2 * np.pi * 3.1 * t + 2 * np.sin(2 * np.pi * 0.7 * t))) ** 2
    phr = (np.sin(2 * np.pi * 0.31 * t) > -0.3).astype(float)
    x = bp(noise(dur, rng, 'pink'), 350, 1600) * syl * phr
    return norm(comb(x, 0.0071, 0.55) + 0.6 * comb(x, 0.0129, 0.45))
def comb(x, d, fb):
    n = int(d * SR); y = x.copy()
    for i in range(n, len(y)): y[i] += fb * y[i - n]
    return y

theme = [62, 65, 69, 68, 65, 62, 61]           # the series motif (music box)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

# ---------- under everything: a dark drone that swells with the danger ----------
dr = drone([73.42, 110.0, 146.83, 155.56], DUR, rng, cutoff=520, lfo=0.05)
shape = env_at(tt(DUR), [0, S['face'], S['window'], S['knock'], S['approach'], S['etsi'], S['law'], S['rewind'], S['ask'], S['nopatrol'], S['breathe'], S['murmur'], S['dead'], S['end'], DUR],
               [0.9, 0.55, 0.4, 0.55, 0.85, 1.0, 0.45, 0.5, 0.75, 0.95, 0.4, 0.85, 1.0, 0.5, 0.0])
m.add(0.0, (dr[0] * shape, dr[1] * shape), gain=0.07, rev=0.45)

# ---------- hook: a hit on frame 1, the door opening in slow motion, the timer ticking slowed, her breath; a riser into the cut ----------
m.add(0.0, boom(rng, 3.0, 48, 22, 1.8, 0.5, 1.0), gain=0.8, rev=0.5)
m.add(0.1, lp(creak(2.6, rng, 70), 1200), gain=0.07, rev=0.6)
tb = 0.3
while tb < S['face'] - 0.3: m.add(tb, norm(lp(tick(), 2500)), gain=0.05, pan=0.2, rev=0.5); tb += 0.75
m.add(0.1, fade(lp(breath(S['face'], rng, 0.5), 1800), 0.1, 0.2), gain=0.05, rev=0.2)
m.add(0.0, tinnitus(S['face']), gain=0.01, rev=0.3)
m.add(S['face'] - 0.9, riser(rng, 0.9, 200, 3500, 2.0) * np.linspace(1, 0.2, int(0.9 * SR)), gain=0.12, rev=0.3)
m.add(S['face'], thud(rng, 46, 0.7), gain=0.5, rev=0.3)
heart(S['face'] + 0.2, S['window'], 84, 86, 0.16)

# ---------- 4:28, the street: the city's hum, the police car pulls away (no siren), a scooter far off ----------
ws = seg(S['window'], S['power'])
m.add(S['window'], fade(norm(lp(noise(ws, rng, 'brown'), 140)), 0.3, 0.4), gain=0.07, rev=0.4)
m.add(S['window'] + 0.6, fade(engine(3.6, rng), 0.2, 1.8) * np.linspace(1, 0.25, int(3.6 * SR)), gain=0.07, pan=0.15, rev=0.35)
m.add(S['window'] + 0.9, fade(norm(bp(noise(2.0, rng, 'pink'), 150, 900)), 0.3, 1.2), gain=0.03, pan=0.2, rev=0.3)      # tyres
m.add(S['window'] + 3.5, fade(norm(bp(np.sign(np.sin(2 * np.pi * np.cumsum(140 + 30 * np.sin(np.linspace(0, 3, int(3.0 * SR)))) / SR)), 300, 1800)), 0.8, 1.2), gain=0.012, pan=-0.5, rev=0.6)
m.add(S['win5'] + 0.2, metal_hit(rng, 290, 1.6), gain=0.06, rev=0.6)                                                     # his light
# ---------- no power: the switch clicks twice, the low-battery alert, the deadbolt, her back down the wall ----------
pw = S['power'] + seg(S['power'], S['phone1']) * 0.27
m.add(pw, click(1600) + 0.6 * click(900), gain=0.13, rev=0.2); m.add(pw + 0.55, click(1600) + 0.6 * click(900), gain=0.11, rev=0.2)
m.add(pw + 1.0, metal_hit(rng, 320, 1.2), gain=0.04, rev=0.5)
m.add(S['phone1'] + 0.35, lowbat(), gain=0.07, rev=0.15)
bt = S['bolt'] + seg(S['bolt'], S['sit']) * 0.15
m.add(bt, norm(bp(noise(0.3, rng, 'white'), 1200, 5000)) * np.exp(-tt(0.3) / 0.1), gain=0.06, rev=0.15)                  # the bolt slides
m.add(bt + seg(S['bolt'], S['sit']) * 0.4, click(1000) + 0.7 * click(620), gain=0.15, rev=0.25)                           # and clacks home
m.add(S['sit'] + 0.1, fade(norm(bp(noise(1.1, rng, 'pink'), 300, 2200)), 0.2, 0.5), gain=0.035, rev=0.1)               # her back down the wall
m.add(S['sit'] + 1.1, lp(thud(rng, 70, 0.25), 900), gain=0.12, rev=0.2)
heart(S['power'], S['knock'], 86, 92, 0.15)

# ---------- 4:41: the landing timer clicks on behind her door, its clockwork muffled; three hard knocks; two soft ones ----------
m.add(T_ON, norm(lp(click(1400) + 0.5 * click(900), 1500)), gain=0.1, rev=0.5)
ticking(T_ON + 0.1, T_OFF, gain=0.03, muffle=2200)
steps(T_ON - 2.2, T_ON - 0.1, 0.62, gain=0.06, f=88, pan=0.1, rev=0.55, muffle=900)                                     # his steps up to her door
for kt in KN:
    addp(kt, knock_once(1.0), gain=0.5, rev=0.3)
    addp(kt, lp(thud(rng, 60, 0.3), 500), gain=0.3, rev=0.3)
m.add(KN[0] - 0.02, boom(rng, 1.6, 52, 30, 0.8, 0.1, 0.6), gain=0.25, rev=0.4)
for kt in KS: addp(kt, knock_once(0.4), gain=0.2, rev=0.3)
heart(KN[0], S['approach'], 104, 126, 0.2)
m.add(S['police'], tinnitus(seg(S['police'], S['door2'])), gain=0.008, rev=0.3)
# ---------- to the peephole: her socks on the parquet, a board that creaks; through the lens ----------
steps(S['approach'] + 0.3, S['peep1'] - 0.2, 0.55, gain=0.03, f=150, rev=0.15, hard=0.6)
m.add(S['approach'] + 0.9, lp(creak(0.6, rng, 210), 1800), gain=0.04, rev=0.2)
m.add(S['peep1'] - 0.05, whoosh(rng, 0.3, 300, 2000, 0.4), gain=0.05, rev=0.2)
m.add(S['peep1'], fade(norm(lp(noise(seg(S['peep1'], S['etsi']), rng, 'brown'), 110)), 0.1, 0.3), gain=0.05, rev=0.3)
heart(S['approach'], S['etsi'], 118, 132, 0.2)
m.add(Lw(16, 'police'), metal_hit(rng, 300, 1.6), gain=0.07, rev=0.6)

# ---------- « ET SI… »: the bolt, the door, « C'est lui. », the door shut behind him; the law ----------
sw = riser(rng, 1.2, 300, 5000, 1.6); m.add(S['etsi'] - 0.2, sw, gain=0.12, rev=0.6)
m.add(S['etsi'] + 0.05, bell(midi(74), rng, 2.4), gain=0.06, rev=0.7)
m.add(S['open'] + 0.1, norm(bp(noise(0.25, rng, 'white'), 1200, 5000)) * np.exp(-tt(0.25) / 0.08), gain=0.06, rev=0.15)
m.add(S['open'] + 0.35, click(1000) + 0.7 * click(620), gain=0.13, rev=0.25)
m.add(S['open'] + 0.9, creak(1.4, rng, 140), gain=0.08, rev=0.35)
m.add(S['lower'], tinnitus(seg(S['lower'], S['inside'])), gain=0.012, rev=0.3)
heart(S['open'], S['inside'], 132, 150, 0.22)
him = Lw(20, 'lui')
m.add(him - 0.05, whoosh(rng, 0.3, 300, 4000, 0.5), gain=0.12, rev=0.3)
m.add(him, metal_hit(rng, 250, 2.4), gain=0.12, rev=0.7)
m.add(him, boom(rng, 3.0, 44, 20, 2.0, 0.3, 1.0), gain=0.7, rev=0.6)
st_in = Lw(20, 'entré')
m.add(st_in - 0.4, step(90, 1.0), gain=0.16, rev=0.3)
addp(st_in + 0.35, lp(thud(rng, 75, 0.45), 1400), gain=0.5, rev=0.4)                                                   # the door, shut behind him
m.add(st_in + 0.35, click(900) + 0.6 * click(560), gain=0.12, rev=0.3)
m.add(S['law'], fade(norm(lp(noise(seg(S['law'], S['rewind']) + 0.3, rng, 'brown'), 70)), 0.05, 0.8), gain=0.1, rev=0.5)
m.add(S['law'] + 0.1, boom(rng, 2.5, 44, 26, 1.6, 0.2, 0.9), gain=0.3, rev=0.55)
pn = pad([73.42, 110.0, 146.83, 174.61], seg(S['law'], S['rewind']), rng, cutoff=900, attack=0.8, release=0.5, voices=2, harmonics=8)
m.add(S['law'], (fade(pn[0], 0.8, 0.4), fade(pn[1], 0.8, 0.4)), gain=0.06, rev=0.6)
# ---------- rewind ----------
rw = seg(S['rewind'], S['ask'])
t_ = tt(rw); f_ = 260 * np.exp(np.log(14) * t_ / rw)
x_ = np.sin(2 * np.pi * np.cumsum(f_ * (1 + 0.05 * np.sin(2 * np.pi * 27 * t_))) / SR)
m.add(S['rewind'], norm(lp(x_, 4500) * np.sin(np.pi * t_ / rw) ** 0.4 + 0.3 * norm(bp(noise(rw, rng, 'white'), 1500, 6000))), gain=0.14, rev=0.25)
m.add(S['ask'] - 0.03, click(1200), gain=0.12, rev=0.2)

# ---------- what she does: questions through the door, the card at the peephole, no number ----------
heart(S['ask'], S['dial'], 120, 112, 0.18)
m.add(S['answer'] + 0.1, tinnitus(seg(S['answer'], S['eye'])), gain=0.008, rev=0.3)
m.add(S['card'] + 0.15, norm(lp(bp(noise(0.08, rng, 'white'), 800, 4000) * np.exp(-tt(0.08) / 0.01), 3000)), gain=0.08, rev=0.2)   # the wallet against the door
m.add(Lw(28, 'aucun'), metal_hit(rng, 280, 2.0), gain=0.1, rev=0.65)
m.add(Lw(28, 'aucun'), boom(rng, 2.0, 46, 26, 1.2, 0.3, 0.8), gain=0.3, rev=0.5)
# ---------- the 17: DTMF 1-7, the ringback, knocks during the call, the timer running out ----------
dl = S['dial'] + seg(S['dial'], S['whisper']) * 0.25
m.add(dl, dtmf(697, 1209), gain=0.05, rev=0.1); m.add(dl + 0.32, dtmf(852, 1209), gain=0.05, rev=0.1)
m.add(dl + 0.75, ringback(seg(dl + 0.75, S['whisper'] + 0.6)), gain=0.035, rev=0.05)
m.add(S['whisper'] + 0.55, click(2200), gain=0.04, rev=0.05)                                                           # someone answers
for kt in np.arange(S['whisper'] + 1.2, S['stop'] - 0.3, 1.9): addp(kt + rng.uniform(-0.2, 0.2), knock_once(0.6), gain=0.2, rev=0.3)
m.add(T_OFF, norm(lp(click(700) + 0.7 * click(450), 1500)), gain=0.12, rev=0.5)                                          # the landing timer runs out
m.add(T_OFF + 0.02, boom(rng, 2.0, 42, 24, 1.2, 0.3, 0.6), gain=0.25, rev=0.5)
m.add(Lw(31, 'Aucune'), metal_hit(rng, 300, 1.8), gain=0.09, rev=0.6)
heart(S['nopatrol'], S['stop'], 128, 140, 0.21)
m.add(S['stop'], tinnitus(seg(S['stop'], S['door5'])), gain=0.01, rev=0.3)
# ---------- he goes: slow steps down, a door shuts just below ----------
steps(S['door5'] + 0.2, Lw(34, 'Une') - 0.2, 0.8, gain=0.1, f=80, rev=0.6, muffle=1200)
m.add(Lw(34, 'ferme') + 0.1, lp(thud(rng, 80, 0.4), 1000), gain=0.3, rev=0.7)
m.add(Lw(34, 'ferme') + 0.15, click(800), gain=0.06, rev=0.6)
m.add(S['breathe'] + 0.6, fade(breath(2.6, rng, 0.38), 0.1, 0.6), gain=0.07, rev=0.1)
heart(S['door5'], S['apple2'], 128, 92, 0.18)
# ---------- the vent: a draught, a murmur coming up the duct; the last line goes through it ----------
m.add(S['apple2'] + 0.3, fade(norm(bp(noise(seg(S['apple2'], S['dead']), rng, 'pink'), 120, 700)), 1.0, 0.5), gain=0.04, rev=0.4)
m.add(S['grille'] + 0.2, metal_hit(rng, 340, 1.2), gain=0.04, rev=0.5)
m.add(S['murmur'] + 0.4, fade(murmur(seg(S['murmur'], S['hear']) + 0.3, rng), 0.5, 0.3), gain=0.06, rev=0.5)
heart(S['apple2'], S['dead'], 92, 132, 0.2)
hr = Lw(39, 'Inès')
m.add(hr + 0.1, boom(rng, 2.6, 44, 22, 1.6, 0.3, 1.0), gain=0.55, rev=0.6)
m.add(hr + 0.1, metal_hit(rng, 240, 2.2), gain=0.1, rev=0.7)
# ---------- 0 %: her phone dies; black ----------
m.add(T0 - 0.05, poweroff(), gain=0.08, rev=0.2)
m.add(T0 + 0.2, boom(rng, 3.5, 40, 20, 2.4, 0.3, 1.0), gain=0.75, rev=0.6)
m.add(T0 + 0.2, fade(norm(lp(noise(3.0, rng, 'brown'), 70)), 0.01, 2.5), gain=0.14, rev=0.5)
# ---------- end card: the series motif on a music box over a dark pad ----------
pe = pad([73.42, 110.0, 146.83, 174.61], DUR - S['end'] + 0.1, rng, cutoff=1100, attack=1.0, release=2.0, voices=2, harmonics=8)
m.add(S['end'] + 0.3, (fade(pe[0], 1.0, 2.0), fade(pe[1], 1.0, 2.0)), gain=0.08, rev=0.6)
for j, nn in enumerate(theme): m.add(S['end'] + 0.4 + j * 0.42, bell(midi(nn + 12), rng, 2.2), gain=0.065, pan=0.25 * math.sin(j * 1.7), rev=0.7)
m.add(S['end'] + 1.2, woodblock(rng, 1250), gain=0.04, rev=0.25)

# ---------- the narration: the music ducks under it; « Je t'entends, Inès. » comes up the duct ----------
import wave
from scipy import signal
vp = os.path.join(HERE, 'vo', f'ep22_{voice}.wav')
with wave.open(vp, 'rb') as w: vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
vo = signal.resample_poly(vo, SR, vsr)[: m.n]
vo = hp(vo, 80) + 0.25 * bp(vo, 2200, 5200)
a, b = int((Ln[39]['t0'] - 0.05) * SR), int((Ln[39]['t1'] + 0.6) * SR)
seg39 = vo[a:b].copy(); duct = bp(seg39, 380, 2600); duct = comb(duct, 0.0083, 0.5) + 0.5 * comb(duct, 0.0141, 0.4)
x = np.linspace(0, 1, len(seg39)); w_ = np.clip(np.minimum(x / 0.03, (1 - x) / 0.1), 0, 1)
vo[a:b] = seg39 * (1 - w_) + 0.8 * norm(duct) * np.abs(seg39).max() * w_
env = np.sqrt(signal.sosfilt(signal.butter(1, 12, 'lowpass', fs=SR, output='sos'), vo * vo) + 1e-12)
vo = vo * np.where(env > 0.06, (0.06 / env) ** 0.45, 1.0)
duck = signal.sosfilt(signal.butter(1, 3, 'lowpass', fs=SR, output='sos'), np.clip(env / 0.03, 0, 1))
duck = 1.0 - 0.5 * np.clip(duck, 0, 1)
n = len(duck); m.L[:n] *= duck; m.R[:n] *= duck; m.rev_L[:n] *= duck; m.rev_R[:n] *= duck
m.add(0.0, norm(vo), gain=0.95, rev=0.05)
for t_, x_, kw in POST: m.add(t_, x_, **kw)

out = sys.argv[1] if len(sys.argv) > 1 else 'out/ep22.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
