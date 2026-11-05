// Post 10 camera moves and clocks (shared by ep16.js and the camflow check). Giza frame (engine/giza.js): x east, z south,
// y up, the Great Pyramid at the origin; you stand at the panorama point, facing the pyramids (north-east).
import * as THREE from 'three';
import { CamPath } from '../engine/core.js';
import { GZ } from '../engine/giza.js';

export const T = { HOOK: 3.6, CUT1: 7.0, FLIP: 11.0, ARC: 15.5, CITY: 21.0, DARK: 28.0, MIN: 30.5, AUR: 33.0, SPACE: 44.0, BACK: 50.0, FINAL: 56.0, END: 62.0 };
export const DUR = 68.0;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const H = GZ.HERO;
export const F = V(0.637, 0, -0.771).normalize(), RT = V(0.771, 0, 0.637).normalize();   // your forward (to Khufu) and right
export const HERO_YAW = Math.atan2(F.x, F.z);
export const P = (f, r, u) => H.clone().addScaledVector(F, f).addScaledVector(RT, r).add(V(0, u, 0));   // a point in your frame

// the field at Giza (microtesla, + = pointing north): reverses over 5 s, through zero at FLIP + 2.5
export const fieldAt = (t) => (t < T.FLIP ? 43 : t < T.FLIP + 5 ? 43 * Math.cos(Math.PI * (t - T.FLIP) / 5) : -43);
// where the compass needle points on the dial (degrees from the phone's heading): you face 40 degrees (north-east), so
// magnetic north shows at -40; it swings round to +140 (south), hunting while the field is near zero
export const needleAt = (t) => { const k = smooth(T.FLIP + 0.6, T.FLIP + 4.6, t), w = Math.exp(-Math.pow((t - T.FLIP - 2.5) / 0.9, 2));
  return -40 + 180 * k + w * (28 * Math.sin(t * 7.3) + 14 * Math.sin(t * 12.1 + 1.0)); };
// the HUD clock: seconds since the flip; minutes later (a jump at T.MIN, with the caption "Minutes later…")
export const clockAt = (t) => (t < T.MIN ? t - T.FLIP : 240 + (t - T.MIN));
// the aurora's strength: the hook flashes forward to its peak; it erupts at AUR (minutes after the flip)
export const aurAt = (t) => (t < T.HOOK ? 1 : t < T.AUR ? 0 : smooth(T.AUR, T.AUR + 4.0, t));
// the aurora's own clock (the curtains' drift), continuous within each shot
export const aurClock = (t) => (t < T.HOOK ? 41 + 2.5 * t : t);

// the hook (0-3.6): low, behind and left of you, the three pyramids under an aurora that fills the sky, a slow push
export const hook = new CamPath([
  [0, P(-3.0, -1.6, 1.0), P(200, 0, 43), 40],
  [3.6, P(-2.4, -1.45, 0.98), P(200, 0, 45), 37],
], { easeIn: false, easeOut: false, arc: true });
// the glide (3.6-11), two takes cut on a soft hit at 7.0: the plateau from 230 m up, floodlit pyramids and the city's lights;
// then on the ground behind you, pushing in slowly: you alone in front of the pyramids, Apple on a rock ahead
export const glideA = new CamPath([
  [3.6, V(-1500, 255, 1950), V(-170, 28, 210), 42],
  [7.0, V(-1395, 228, 1835), V(-180, 30, 215), 40],
], { easeIn: false, easeOut: false, arc: true });
export const glideB = new CamPath([
  [7.0, P(-8.0, -0.5, 2.6), P(1480.6, -39.5, -114.7), 32],
  [11.0, P(-4.6, -0.3, 2.2), P(1481.5, -26.2, -194.0), 32],
], { easeIn: false, easeOut: true, arc: true });
export const glide = { apply: (cam, t) => (t < T.CUT1 ? glideA : glideB).apply(cam, t) };
// the flip (11-15.5): close on the compass app over your shoulder, easing back a little
export const flipCam = new CamPath([
  [11.0, P(0.02, 0.2, 1.52), P(0.32, 0.06, 1.2), 30],
  [15.5, P(-0.25, 0.32, 1.66), P(0.32, 0.06, 1.18), 34],
], { easeIn: false, easeOut: false, arc: true });
// the power line (15.5-21): the nearest pylon arcing, from beside you (long lens)
export const TOWERS = [V(-918.8, 0, 1253.6), V(-633, 0, 1344), V(-347, 0, 1434), V(-61, 0, 1524)];
export const arcCam = (towerTop) => new CamPath([
  [15.5, P(-1.2, 1.6, 1.7), towerTop.clone().add(V(0, -2, 0)), 27],
  [21.0, P(-1.0, 1.75, 1.72), towerTop.clone().add(V(0, -3, 0)), 24],
], { easeIn: false, easeOut: false, arc: true });
// the blackout (21-33), one take: the same plateau from 500 m up, across the pyramids to the valley; Giza and Cairo flash and
// die district by district, the floodlights go out, then a slow tilt up to the stars
export const cityCam = new CamPath([
  [21.0, V(-2600, 520, 1350), V(2750, -40, -1227), 32],
  [28.0, V(-2450, 500, 1270), V(3066, -40, -1620), 32],
  [33.0, V(-2380, 485, 1230), V(1791, 4200, -2941), 42]   // tilting up and left onto the Milky Way rising in the north-east,
], { easeIn: false, easeOut: false, arc: true });
// the aurora (33-44): low on the sand left of you, the pyramids in the lower third, the curtains filling the sky
export const aurCam = new CamPath([
  [33.0, P(-1.5, -1.2, 0.5), P(300, 0, 95), 52],
  [44.0, P(-1.0, -1.15, 0.48), P(300, 0, 118), 54],
], { easeIn: false, easeOut: false, arc: true });
// back to you (50-56): close on your face, lit green, looking up
export const backCam = new CamPath([
  [50.0, P(1.05, 0.12, 1.32), P(0, 0, 1.6), 36],
  [56.0, P(0.86, 0.1, 1.34), P(0, 0, 1.62), 32],
], { easeIn: false, easeOut: false, arc: true });
// the last take (56-62): behind the group, rising slowly: the pyramids under the aurora, the dark valley
export const finalCam = new CamPath([
  [56.0, P(-12, -2.0, 2.4), P(1500, 0, 150), 46],
  [62.0, P(-14, -2.2, 4.4), P(1500, 0, 205), 46],
], { easeIn: false, easeOut: false, arc: true });
