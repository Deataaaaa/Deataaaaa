// Post 12 timeline, story clocks, the flood's front and the camera moves (shared by ep18.js, its audio and camflow).
// Iceland frame (engine/iceland.js): +x north (inland), +z east, y up, sea level 0; you stand on Diamond Beach at HERO.
import * as THREE from 'three';
import { CamPath } from '../engine/core.js';
import { HERO, baseY, frontX } from '../engine/iceland.js';
import { meltD } from '../engine/ice18.js';

export const T = { HOOK: 3.6, CUT1: 7.4, MELT: 12.0, BEACH: 13.6, LAGOON: 17.2, GONE: 20.0, SPACE: 33.0, POV: 51.0, END: 62.0 };
export const DUR = 68.0;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// story time tau: seconds since the melt began (the 5 seconds run 1.6x slower on screen; the flood runs 2.9x faster)
export const TAU_FLOOD0 = 5 + (T.SPACE - T.GONE) * 2.9;          // where the flood shot leaves off (42.7)
export function tauAt(t) {
  if (t < T.HOOK) return 4.07 + 2.4 + 1.5 * (t / T.HOOK);           // the hook: the wall racing across the lagoon, in slow motion
  if (t < T.MELT) return t - T.MELT;                                // before: negative (the countdown)
  if (t < T.GONE) return (t - T.MELT) / 1.6;
  if (t < T.SPACE) return 5 + (t - T.GONE) * 2.9;
  if (t < T.POV) return TAU_FLOOD0;                                  // (space has its own clock)
  return TAU_FLOOD0 + (t - T.POV);
}
export const dAt = (tau) => meltD(tau);
export const TAU_FRONT = 4.07;                                     // the glacier's front (~300 m of ice) has turned to water
// the flood front's position (x) after fs seconds: 86 m/s over the lagoon (the dam-break speed 2 sqrt(g h) for ~190 m of
// meltwater), all the way to the sea; tabulated once
const XW = (() => { const out = []; let x = 4060, v = 0; for (let i = 0; i <= 6000; i++) { const fs = i * 0.01; out.push(x);
  v = Math.min(86, v + 70 * 0.01); x -= v * 0.01; } return out; })();
export const wallX = (fs) => { if (fs <= 0) return 4060; const k = Math.min(fs / 0.01, XW.length - 1.001), i = Math.floor(k), f = k - i; return XW[i] * (1 - f) + XW[i + 1] * f; };
export const wallSpeed = (fs) => (wallX(fs) - wallX(fs + 0.05)) / 0.05;
export const wallH = (x) => 70 + 25 * sm(300, 1500, x);
export const wallBase = (x) => (x > 600 ? -3 : Math.max(-3, baseY(x, HERO.z) - 3.2));

// ---- cameras ----
// the hook: low over the lagoon, a few hundred metres in front of the wall of meltwater as it comes on (slow motion)
export const hook = new CamPath([
  [0, V(3700, 8.0, 330), V(3930, 46, -420), 46],
  [T.HOOK, V(3696, 7.8, 328), V(3922, 48, -424), 47],
], { easeIn: false, easeOut: false, arc: true });
// the glide in from the sea to Diamond Beach, the lagoon and the glacier beyond
export const glide = new CamPath([
  [T.HOOK, V(-230, 62, 420), V(600, 12, -60), 40],
  [T.CUT1, V(-95, 30, 290), V(600, 10, -80), 40],
], { easeIn: false, easeOut: false, arc: true });
// on the beach, looking inland: you with your iced coffee, the blocks round you, the bear behind, the glacier and the ice
// cap glowing at the horizon (a slow push-in)
export const ground = new CamPath([
  [T.CUT1, V(HERO.x - 9.0, HERO.y + 1.5, HERO.z - 3.0), V(HERO.x + 2.0, HERO.y + 1.35, HERO.z + 2.0), 36],
  [T.MELT, V(HERO.x - 7.6, HERO.y + 1.5, HERO.z - 2.5), V(HERO.x + 2.0, HERO.y + 1.35, HERO.z + 2.0), 34],
], { easeIn: false, easeOut: false, arc: true });
// the melt, beat by beat: your drink; the beach; the lagoon and the glacier, then the flood coming (one long take)
export const cupCam = { off: V(-0.34, 0.24, -0.14), fov: 32 };
export const beach = new CamPath([
  [T.BEACH, V(HERO.x + 2.2, HERO.y + 0.6, HERO.z + 4.6), V(HERO.x - 2.6, HERO.y + 0.95, HERO.z - 3.2), 44],
  [T.LAGOON, V(HERO.x + 2.6, HERO.y + 0.7, HERO.z + 5.1), V(HERO.x - 2.6, HERO.y + 0.95, HERO.z - 3.2), 44],
], { easeIn: false, easeOut: false, arc: true });
export const flood = new CamPath([
  [T.LAGOON, V(1900, 165, -240), V(3300, 0, -250), 34],
  [T.GONE, V(1850, 170, -230), V(3250, 5, -250), 34],
  [26.0, V(1450, 200, -140), V(2900, 10, -220), 36],
  [T.SPACE, V(720, 230, 160), V(1350, 15, -150), 42],
], { easeIn: false, easeOut: false, arc: true });
// your own eyes at the end: looking inland at the wall coming over Route 1, the bear in front of you
export const EYE = V(HERO.x, HERO.y + 1.62, HERO.z);
export const BEARP = V(HERO.x + 12, 0, HERO.z + 9);
