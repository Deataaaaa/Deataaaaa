"""Soundtrack for « 12 % » Partie 2 · L'escalier. Cue times come from the narration's timing (audio/vo/ep21_<voice>.json), the
same rules as episodes/ep21.js. A dark drone and her heartbeat; the street at 4:20 (crowd, idling trucks, the ladder folding,
police radio); the carriage door; the stair timer's clockwork ticking until it clunks off on the 3rd floor; slow heavy steps
below that stop when she stops; the phone buzzing; « ET SI… »: running steps, keys on the floor, the lock, a door stopped by a
hand, black; the tape rewind; knocks, doorbells, the timer again, a door opening; typing to the 114; two officers on the stairs
with their radios; the 5th-floor door; a sting on « C'est lui. »; the end card's music box.
  python3 audio/ep21.py out/ep21.wav [voice]"""
import sys, os, json, math
import numpy as np
from synth import *

HERE = os.path.dirname(os.path.abspath(__file__))
voice = sys.argv[2] if len(sys.argv) > 2 else 'developpeuse'
VO = json.load(open(os.path.join(HERE, 'vo', f'ep21_{voice}.json')))
Ln = VO['lines']
L = lambda i: Ln[i]['t0']
def Lw(i, w):
    for u in Ln[i]['units']:
        if u['shown'].lower().startswith(w.lower()): return u['t0']
    return Ln[i]['t0']
cut = lambda x: x - 0.08
END0 = Ln[-1]['t0'] - 0.25
DUR = math.ceil((VO['duration'] + 4.4) * 10) / 10
S = dict(hook=0, face=cut(L(1)), street=cut(L(2)), phone3=cut(L(3)), crowd=cut(L(4)), empty=cut(L(5)), police=cut(L(6)), enter=cut(L(7)),
         timer=cut(L(8)), climb1=cut(L(9)), off=cut(L(10)), torch=cut(L(11)), slam=cut(L(12)), hand=cut(L(13)), stop=cut(L(14)),
         stopH=cut(Lw(14, 'Les')), go=cut(L(15)), goH=cut(Lw(15, 'Les')), sms=cut(L(16)), flash=cut(L(18)), etsi=cut(L(19)), run=cut(L(20)),
         runH=cut(Lw(20, 'Derrière')), keys=cut(L(21)), grope=cut(Lw(21, 'Elle')), lock=cut(L(22)), block=cut(L(23)), dark=cut(L(24)),
         stat=cut(L(25)), rewind=cut(L(26)), stay=cut(L(27)), knock=cut(L(28)), bell=cut(Lw(28, 'sonne')) - 0.3, noise=cut(L(29)),
         neigh=cut(L(30)), inside=cut(L(31)), sms114=cut(L(32)), info114=cut(L(33)), cops=cut(L(34)), search=cut(L(35)), door5=cut(L(36)),
         him=cut(L(37)), facade=cut(L(38)), night=cut(L(39)), name=cut(L(40)), end=END0)
m = Mix(DUR, seed=21)
rng = np.random.default_rng(2121)

def norm(x): return x / (np.abs(x).max() + 1e-9)
def env_at(t, pts, vals): return np.interp(t, pts, vals)
def seg(a, b): return max(0.05, b - a)
def heart(t0, t1, bpm0, bpm1, gain=0.22):
    tb = t0
    while tb < t1:
        k = (tb - t0) / max(0.01, t1 - t0); bpm = bpm0 + (bpm1 - bpm0) * k
        m.add(tb, heartbeat(rng), gain=gain, rev=0.1); tb += 60.0 / bpm
def crowd(dur, rng):
    out = np.zeros(int(dur * SR))
    for k in range(9):
        f0 = rng.uniform(250, 850); v = bp(noise(dur, rng, 'pink'), f0, f0 * 2.1)
        out += norm(v) * (0.5 + 0.5 * norm(lp(noise(dur, rng, 'white'), 1.2 + rng.uniform(0, 2))))
    return norm(out)
def radio(dur, rng):
    """police radio chatter: band-passed bursts with a squelch"""
    t = tt(dur); g = np.zeros(len(t)); tw = 0.2
    while tw < dur - 0.6:
        d = rng.uniform(0.6, 1.4); k = t - tw; g += np.where((k > 0) & (k < d), 1.0, 0); tw += d + rng.uniform(0.8, 2.0)
    return norm(norm(bp(noise(dur, rng, 'pink'), 600, 2600)) * g * (0.6 + 0.4 * norm(lp(noise(dur, rng, 'white'), 9))))
def click(f=2500):
    t = tt(0.05); return norm(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) + 0.4 * noise(0.05, rng, 'white') * np.exp(-t / 0.003))
def creak(dur, rng, f=180):
    t = tt(dur); fm = f * (1 + 0.25 * np.sin(2 * np.pi * 0.7 * t) + 0.1 * norm(lp(noise(dur, rng, 'white'), 6)))
    x = np.sign(np.sin(2 * np.pi * np.cumsum(fm) / SR)) * np.exp(-((t - dur / 2) / (dur / 2.2)) ** 2)
    return norm(bp(x, 300, 2500))
def tinnitus(dur):
    t = tt(dur); return np.sin(2 * np.pi * 5800 * t) * np.sin(np.pi * t / dur) ** 2
def tick():
    """one beat of the stair timer's clockwork: a dry wooden-metal tick"""
    t = tt(0.04); return norm(bp(np.sin(2 * np.pi * 3400 * t) * np.exp(-t / 0.003) + 0.5 * noise(0.04, rng, 'white') * np.exp(-t / 0.002), 1500, 7000))
def ticking(t0, t1, gain=0.05):
    tb = t0
    while tb < t1: m.add(tb, tick(), gain=gain * (1.0 if int((tb - t0) * 4) % 2 == 0 else 0.7), pan=0.25, rev=0.3); tb += 0.25
def step(f=95, hard=1.0):
    """a shoe on an old wooden stair: a low knock, a little creak"""
    x = thud(rng, f, 0.18).copy(); c = lp(creak(0.12, rng, 260 + rng.uniform(-40, 40)), 2600); n = min(len(x), len(c))
    x[:n] += 0.25 * hard * c[:n]
    return norm(lp(x, 1800))
def steps(t0, t1, period, gain=0.08, f=95, pan=0.0, rev=0.35, hard=1.0):
    tb = t0
    while tb < t1: m.add(tb, step(f + rng.uniform(-8, 8), hard), gain=gain * rng.uniform(0.85, 1.1), pan=pan, rev=rev); tb += period * rng.uniform(0.94, 1.06)
def breath(dur, rng, rate=0.6):
    """breathing: filtered noise swelling at `rate` breaths per second"""
    t = tt(dur); e = np.maximum(0, np.sin(2 * np.pi * rate * t)) ** 1.5
    return norm(bp(noise(dur, rng, 'pink'), 500, 3200) * e)
def buzz(dur=0.42):
    t = tt(dur); x = np.sign(np.sin(2 * np.pi * 172 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
    return norm(lp(x, 900)) * fade(np.ones(len(t)), 0.01, 0.03)
def jingle(rng):
    """keys hitting a tiled floor: bright clinks"""
    out = np.zeros(int(0.7 * SR))
    for k in range(7):
        t0 = 0.02 + k * rng.uniform(0.03, 0.09); f = rng.uniform(2600, 5200); n = int(0.18 * SR); i0 = int(t0 * SR); t = np.arange(n) / SR
        out[i0:i0 + n] += np.sin(2 * np.pi * f * t) * np.exp(-t / 0.035) * rng.uniform(0.4, 1.0) / (1 + k * 0.3)
    return norm(out)
def knock_once():
    return norm(lp(thud(rng, 140, 0.12) + 0.4 * bp(noise(0.12, rng, 'white'), 600, 2500) * np.exp(-tt(0.12) / 0.01), 3000))
def chime():
    """an old flat doorbell: two tones, ding-dong"""
    t = tt(1.4); a = np.sin(2 * np.pi * 659.3 * t) * np.exp(-t / 0.5); b = np.where(t > 0.42, np.sin(2 * np.pi * 523.3 * (t - 0.42)) * np.exp(-(t - 0.42) / 0.6), 0)
    return norm(a + b)
def taps(t0, t1, gain=0.03):
    tb = t0
    while tb < t1: m.add(tb, norm(bp(noise(0.03, rng, 'white'), 2000, 6000) * np.exp(-tt(0.03) / 0.004)), gain=gain, pan=0.1, rev=0.05); tb += rng.uniform(0.11, 0.2)
def ping():
    t = tt(0.6); return norm(np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t / 0.12) + 0.8 * np.where(t > 0.11, np.sin(2 * np.pi * 1760 * t) * np.exp(-(t - 0.11) / 0.18), 0))

theme = [62, 65, 69, 68, 65, 62, 61]           # the series motif (music box)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

# ---------- under everything: a dark drone that swells with the danger ----------
dr = drone([73.42, 110.0, 146.83, 155.56], DUR, rng, cutoff=520, lfo=0.05)
shape = env_at(tt(DUR), [0, S['face'], S['street'], S['timer'], S['off'], S['etsi'], S['dark'], S['stat'], S['stay'], S['inside'], S['door5'], S['end'], DUR],
               [0.9, 0.6, 0.45, 0.4, 0.85, 1.0, 0.3, 0.5, 0.75, 0.5, 1.0, 0.5, 0.0])
m.add(0.0, (dr[0] * shape, dr[1] * shape), gain=0.07, rev=0.45)

# ---------- hook: a hit on frame 1, slow heavy steps coming up, her breath; a riser into the cut ----------
m.add(0.0, boom(rng, 3.0, 48, 22, 1.8, 0.5, 1.0), gain=0.8, rev=0.5)
steps(0.15, S['face'] - 0.2, 0.95, gain=0.14, f=80, rev=0.55)
m.add(0.1, fade(breath(S['face'], rng, 0.9), 0.1, 0.2), gain=0.05, rev=0.1)
m.add(0.0, tinnitus(S['face']), gain=0.01, rev=0.3)
m.add(S['face'] - 0.9, riser(rng, 0.9, 200, 3500, 2.0) * np.linspace(1, 0.2, int(0.9 * SR)), gain=0.12, rev=0.3)
m.add(S['face'], thud(rng, 46, 0.7), gain=0.5, rev=0.3)
heart(S['face'] + 0.2, S['street'], 88, 92, 0.18)

# ---------- the street at 4:20: crowd, idling trucks, the ladder folding, radios ----------
st = seg(S['street'], S['enter'])
m.add(S['street'], fade(crowd(st, rng), 0.4, 0.5), gain=0.08, rev=0.4)
m.add(S['street'], fade(norm(lp(noise(st, rng, 'brown'), 120)), 0.3, 0.5), gain=0.07, rev=0.3)
m.add(S['street'] + 0.5, fade(radio(st - 0.5, rng), 0.1, 0.3), gain=0.03, pan=-0.3, rev=0.2)
la = seg(S['street'], S['phone3']) + 0.6
t_ = tt(la); hyd = np.sin(2 * np.pi * np.cumsum(220 - 90 * t_ / la) / SR)
m.add(S['street'] + 0.1, norm(lp(hyd + 0.3 * np.sign(hyd), 900)) * env_at(t_, [0, 0.3, la - 0.4, la], [0, 1, 1, 0]), gain=0.05, rev=0.3)
m.add(S['empty'], metal_hit(rng, 300, 1.8), gain=0.09, rev=0.6)                                                       # « Disparu. »
m.add(S['empty'], tinnitus(1.6), gain=0.012, rev=0.3)
heart(S['crowd'], S['enter'], 84, 96, 0.16)
# ---------- the carriage door, the porch, the timer and its ticking ----------
m.add(S['enter'] + 0.2, lp(creak(1.3, rng, 120), 2000), gain=0.08, rev=0.35)
steps(S['enter'] + 0.25, S['timer'] - 0.1, 0.55, gain=0.05, f=130, pan=0.1, rev=0.3, hard=0.3)
m.add(S['timer'] - 0.15, lp(thud(rng, 70, 0.5), 900), gain=0.25, rev=0.6)                                             # the door shuts behind her
m.add(S['timer'] + 0.5, click(1400) + 0.5 * click(900), gain=0.12, rev=0.25)
off_t = Lw(10, 'lumière') + 0.3
ticking(S['timer'] + 0.6, off_t, gain=0.045)
steps(S['climb1'] + 0.1, S['off'] + 2.0, 0.42, gain=0.07, f=100, rev=0.4)                                             # her steps up
m.add(off_t, click(700) + 0.7 * click(450), gain=0.16, rev=0.4)                                                       # the timer clunks off
m.add(off_t + 0.02, boom(rng, 2.0, 42, 24, 1.2, 0.3, 0.6), gain=0.35, rev=0.5)
heart(off_t, S['etsi'], 96, 128, 0.2)
m.add(S['torch'] + 0.5, click(3200), gain=0.06, rev=0.1)                                                             # the phone's torch
m.add(S['torch'], fade(breath(seg(S['torch'], S['etsi']), rng, 0.75), 0.4, 0.3), gain=0.05, rev=0.1)
# ---------- below: the street door slams; slow steps that stop when she stops ----------
sl = Lw(12, 'claque')
m.add(sl, boom(rng, 2.6, 60, 30, 1.0, 0.1, 0.9), gain=0.4, rev=0.85)
m.add(sl, lp(thud(rng, 90, 0.4), 1200), gain=0.3, rev=0.8)
steps(S['hand'] + 0.2, S['stopH'] + 0.3, 0.85, gain=0.11, f=78, pan=-0.15, rev=0.7)                                    # « Des pas. Lents. »
steps(S['stop'] + 0.05, S['stop'] + 1.0, 0.42, gain=0.06, f=105, rev=0.35)                                             # hers, then she stops
steps(S['go'] + 0.1, S['goH'], 0.42, gain=0.06, f=105, rev=0.35)
steps(S['goH'] + 0.15, S['sms'] + 0.2, 0.85, gain=0.11, f=78, pan=-0.15, rev=0.7)                                      # his start again
m.add(S['stopH'] + 0.2, tinnitus(seg(S['stopH'], S['go'])), gain=0.012, rev=0.3)
# ---------- the text: the phone buzzing ----------
for k in range(2): m.add(S['sms'] + 0.05 + k * 0.6, buzz(), gain=0.12, rev=0.05)
m.add(L(17), metal_hit(rng, 280, 1.6), gain=0.08, rev=0.6)
# ---------- the flashback, muffled ----------
fl = seg(S['flash'], S['etsi'])
m.add(S['flash'] - 0.35, whoosh(rng, 0.4, 2500, 300, 0.5), gain=0.1, rev=0.3)
m.add(S['flash'], fade(lp(crowd(fl, rng), 700), 0.3, 0.2), gain=0.05, rev=0.4)
m.add(S['flash'] + 0.3, lp(creak(1.4, rng, 120), 2000), gain=0.07, rev=0.3)
m.add(Lw(18, 'répondu'), metal_hit(rng, 310, 1.6), gain=0.08, rev=0.6)
# ---------- « ET SI… »: running; keys on the floor; the lock; a hand stops the door; black ----------
sw = riser(rng, 1.2, 300, 5000, 1.6); m.add(S['etsi'] - 0.2, sw, gain=0.12, rev=0.6)
m.add(S['etsi'] + 0.05, bell(midi(74), rng, 2.4), gain=0.06, rev=0.7)
steps(S['run'] + 0.05, S['keys'], 0.2, gain=0.08, f=110, rev=0.3)
steps(S['runH'] + 0.05, S['keys'] + 0.4, 0.24, gain=0.12, f=82, pan=-0.2, rev=0.55)
m.add(S['run'], fade(breath(seg(S['run'], S['block']), rng, 1.6), 0.1, 0.2), gain=0.08, rev=0.1)
heart(S['run'], S['block'] + 0.6, 140, 168, 0.24)
m.add(S['keys'] + 0.85, jingle(rng), gain=0.16, rev=0.3)
m.add(S['grope'], fade(norm(bp(noise(seg(S['grope'], S['lock']), rng, 'pink'), 300, 2000)) * 0.6, 0.1, 0.1), gain=0.04, rev=0.1)
m.add(S['lock'] + 0.3, norm(bp(noise(0.25, rng, 'white'), 1500, 6000)) * np.exp(-tt(0.25) / 0.08), gain=0.06, rev=0.1)   # the key in the lock
m.add(S['lock'] + 0.55, click(1100) + 0.6 * click(700), gain=0.12, rev=0.2)
m.add(S['lock'] + 0.7, creak(0.9, rng, 150), gain=0.07, rev=0.3)
hit = Lw(23, 'main')
m.add(hit, lp(thud(rng, 75, 0.45), 1400), gain=0.45, rev=0.4)
m.add(hit, boom(rng, 3.0, 44, 20, 2.0, 0.3, 1.0), gain=0.7, rev=0.6)
m.add(hit, metal_hit(rng, 240, 2.4), gain=0.1, rev=0.7)
m.add(S['dark'], fade(norm(lp(noise(seg(S['dark'], S['stat']) + 0.5, rng, 'brown'), 70)), 0.05, 1.0), gain=0.12, rev=0.5)
m.add(S['stat'], boom(rng, 3.0, 44, 26, 2.0, 0.2, 0.9), gain=0.35, rev=0.55)
pn = pad([73.42, 110.0, 146.83, 174.61], seg(S['stat'], S['rewind']), rng, cutoff=900, attack=1.0, release=0.6, voices=2, harmonics=8)
m.add(S['stat'], (fade(pn[0], 1.0, 0.5), fade(pn[1], 1.0, 0.5)), gain=0.06, rev=0.6)
# ---------- rewind ----------
rw = seg(S['rewind'], S['stay'])
t_ = tt(rw); f_ = 260 * np.exp(np.log(14) * t_ / rw)
x_ = np.sin(2 * np.pi * np.cumsum(f_ * (1 + 0.05 * np.sin(2 * np.pi * 27 * t_))) / SR)
m.add(S['rewind'], norm(lp(x_, 4500) * np.sin(np.pi * t_ / rw) ** 0.4 + 0.3 * norm(bp(noise(rw, rng, 'white'), 1500, 6000))), gain=0.14, rev=0.25)
m.add(S['stay'] - 0.03, click(1200), gain=0.12, rev=0.2)
# ---------- what she does: knocks, bells, the light comes back, a door opens ----------
heart(S['stay'], S['inside'], 112, 104, 0.18)
tk = S['knock']
while tk < S['bell'] - 0.05:
    m.add(tk + 0.08, knock_once(), gain=0.22, rev=0.35); tk += 1 / 3.2
m.add(S['bell'] + 0.25, chime(), gain=0.09, rev=0.4)
m.add(S['bell'] + 0.25 + 0.7, lp(chime(), 1800), gain=0.05, pan=-0.4, rev=0.6)                                          # another flat's bell, further off
m.add(S['noise'] + 0.35, click(1400) + 0.5 * click(900), gain=0.1, rev=0.3)
ticking(S['noise'] + 0.45, S['cops'], gain=0.04)
m.add(S['noise'] + 1.0, click(900), gain=0.06, pan=-0.3, rev=0.4)                                                       # a lock turns somewhere
m.add(S['neigh'] + 0.05, click(1000) + 0.5 * click(650), gain=0.1, rev=0.25)
m.add(S['neigh'] + 0.15, creak(1.0, rng, 140), gain=0.07, rev=0.3)
m.add(S['inside'] + 0.6, lp(thud(rng, 85, 0.35), 1300), gain=0.25, rev=0.3)                                             # the neighbour shuts his door
m.add(S['inside'], fade(breath(seg(S['inside'], S['cops']), rng, 0.8), 0.3, 0.4), gain=0.045, rev=0.05)
taps(S['sms114'] + 0.4, S['sms114'] + seg(S['sms114'], S['info114']) - 0.3, gain=0.03)
m.add(S['info114'] - 0.15, whoosh(rng, 0.3, 800, 3200, 0.4), gain=0.05, rev=0.2)                                        # sent
m.add(S['info114'] + 0.9, ping(), gain=0.07, rev=0.2)                                                                   # the reply
# ---------- the police on the stairs; the empty stairwell ----------
co = seg(S['cops'], S['door5'])
steps(S['cops'] + 0.1, S['door5'] - 0.3, 0.33, gain=0.09, f=85, rev=0.55)
m.add(S['cops'] + 0.3, fade(radio(co, rng), 0.1, 0.3), gain=0.04, pan=0.2, rev=0.4)
m.add(S['cops'] + 0.2, click(2600), gain=0.05, rev=0.3); m.add(S['cops'] + 0.4, click(2400), gain=0.05, rev=0.3)        # torches
m.add(Lw(35, 'Personne'), metal_hit(rng, 330, 1.4), gain=0.07, rev=0.6)
# ---------- the 5th floor: the door; « C'est lui. »; « Bonne nuit, Inès. » ----------
m.add(S['door5'] + 0.15, click(1000) + 0.6 * click(600), gain=0.1, rev=0.3)
m.add(S['door5'] + 0.3, creak(1.5, rng, 130), gain=0.08, rev=0.35)
m.add(S['door5'] + 0.3, fade(norm(lp(noise(seg(S['door5'], S['end']), rng, 'brown'), 160)), 0.6, 0.4), gain=0.03, rev=0.2)
m.add(S['him'] + 0.05, whoosh(rng, 0.3, 300, 4000, 0.5), gain=0.12, rev=0.3)
m.add(S['him'] + 0.15, metal_hit(rng, 260, 2.2), gain=0.12, rev=0.7)
m.add(S['him'] + 0.15, boom(rng, 2.4, 46, 24, 1.4, 0.5, 0.9), gain=0.5, rev=0.5)
m.add(S['him'], tinnitus(seg(S['him'], S['end']) + 0.5), gain=0.012, rev=0.3)
heart(S['him'], S['end'], 96, 124, 0.22)
nm = Lw(40, 'jamais')
m.add(nm, boom(rng, 3.5, 40, 20, 2.4, 0.3, 1.0), gain=0.75, rev=0.6)
m.add(nm, fade(norm(lp(noise(3.5, rng, 'brown'), 70)), 0.01, 2.8), gain=0.15, rev=0.5)
# ---------- end card: the series motif on a music box over a dark pad ----------
pe = pad([73.42, 110.0, 146.83, 174.61], DUR - S['end'] + 0.1, rng, cutoff=1100, attack=1.0, release=2.0, voices=2, harmonics=8)
m.add(S['end'] + 0.3, (fade(pe[0], 1.0, 2.0), fade(pe[1], 1.0, 2.0)), gain=0.06, rev=0.6)
for j, nn in enumerate(theme): m.add(S['end'] + 0.4 + j * 0.42, bell(midi(nn + 12), rng, 2.2), gain=0.04, pan=0.25 * math.sin(j * 1.7), rev=0.7)
m.add(S['end'] + 1.2, woodblock(rng, 1250), gain=0.04, rev=0.25)

# ---------- the narration: the music ducks under it ----------
import wave
from scipy import signal
vp = os.path.join(HERE, 'vo', f'ep21_{voice}.wav')
with wave.open(vp, 'rb') as w: vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
vo = signal.resample_poly(vo, SR, vsr)[: m.n]
vo = hp(vo, 80) + 0.25 * bp(vo, 2200, 5200)
env = np.sqrt(signal.sosfilt(signal.butter(1, 12, 'lowpass', fs=SR, output='sos'), vo * vo) + 1e-12)
vo = vo * np.where(env > 0.06, (0.06 / env) ** 0.45, 1.0)
duck = signal.sosfilt(signal.butter(1, 3, 'lowpass', fs=SR, output='sos'), np.clip(env / 0.03, 0, 1))
duck = 1.0 - 0.5 * np.clip(duck, 0, 1)
n = len(duck); m.L[:n] *= duck; m.R[:n] *= duck; m.rev_L[:n] *= duck; m.rev_R[:n] *= duck
m.add(0.0, norm(vo), gain=0.95, rev=0.05)

out = sys.argv[1] if len(sys.argv) > 1 else 'out/ep21.wav'
render_phone(m, out, rev_time=2.4, target=-10.5, tp=-1.5, limit=True)
