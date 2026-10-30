// Post 11 camera moves, the sneeze schedule and the energy scale (shared by ep17.js, its audio and the camflow check).
// Venice frame (engine/venice.js): x east, z south, y up; you stand on the Molo at the origin, facing the water (+z).
import * as THREE from 'three';
import { CamPath } from '../engine/core.js';
import { VZ } from '../engine/venice.js';

export const T = { HOOK: 3.6, CUT1: 7.0, FIRST: 11.0, WATER: 25.0, FAR: 36.0, SPACE: 45.0, FACE: 51.0, END: 62.0 };
export const DUR = 68.0;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const H = V(0, VZ.Y0, 0);

// when each sneeze happens (SN[n - 1] = sneeze n): the fit speeds up; the counter runs through the cuts
export const SN = (() => { const t = [11.0, 12.5, 13.8, 14.9, 15.85, 16.7, 17.45, 18.15, 18.8, 19.4];
  for (let n = 11; n <= 20; n++) t.push(19.4 + (n - 10) * 0.48);          // #20 at 24.2
  for (let n = 21; n <= 45; n++) t.push(25.2 + (n - 21) * 0.38);          // #40 at 32.42, #45 at 34.32
  for (let n = 46; n <= 63; n++) t.push(36.2 + (n - 46) * 0.45);          // #51 at 38.45, #63 at 43.85
  for (let n = 64; n <= 84; n++) t.push(45.3 + (n - 64) * 0.085);         // #84 at 47.0
  for (let n = 85; n <= 97; n++) t.push(47.25 + (n - 85) * 0.25);         // #97 at 50.25
  return t; })();
export const nAt = (t) => { let n = 0; while (n < SN.length && SN[n] <= t) n++; return n; };
export const E1 = 0.05;                                                    // a normal sneeze's kinetic energy (J)
export const En = (n) => E1 * Math.pow(2, n - 1);
// the blast front of an energy E (J) after tp seconds (Sedov-Taylor in air, 1.2 kg/m3), then a sound wave
export const blastR = (E, tp) => { if (tp <= 0) return 0; const r = 1.03 * Math.pow((E / 1.2) * tp * tp, 0.2);
  const tc = Math.pow(1.03 * 0.4 / 343, 5 / 3) * Math.pow(E / 1.2, 1 / 3);   // when the front has slowed to the speed of sound
  return tp < tc ? r : 1.03 * Math.pow((E / 1.2) * tc * tc, 0.2) + 343 * (tp - tc); };
// the hook shows sneeze 40 in slow motion (story time); everything in the scene reads the story clock
export const storyT = (t) => (t < T.HOOK ? SN[39] + 6.5e-4 * Math.pow((t + 0.5) / 4.1, 2.5) : t);   // 4 microseconds to 0.8 ms after it: the dome grows steadily

const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const hook = new CamPath([
  [0, V(2.9, 2.45, 7.7), V(-0.25, 3.1, 0), 50],
  [3.6, V(2.7, 2.42, 7.2), V(-0.25, 3.15, 0), 50],
], { easeIn: false, easeOut: false, arc: true });
// the glide over the Basin toward the Piazzetta, golden hour
export const glideA = new CamPath([
  [3.6, V(170, 150, 540), V(-5, 24, -45), 38],
  [7.0, V(118, 108, 395), V(-5, 21, -45), 38],
], { easeIn: false, easeOut: false, arc: true });
// on the Molo: close on you for the itch and the first sneezes, then back over the water as they grow
export const ground = new CamPath([
  [7.0, V(-2.6, 2.55, 3.4), V(-0.35, 2.7, 0), 34],
  [11.0, V(-2.1, 2.6, 2.8), V(0, 2.8, 0), 32],
  [15.5, V(-3.2, 2.45, 4.6), V(0, 2.5, 0), 36],
  [20.0, V(-5.5, 2.9, 7.5), V(0, 2.3, 0), 40],
  [25.0, V(-5.0, 3.4, 15.5), V(0, 2.6, -1), 44],
], { easeIn: false, easeOut: false, arc: true });
// from a boat on the Basin: the Piazzetta, the gondolas, the rings and domes racing out over the water
export const water = new CamPath([
  [25.0, V(16, 2.8, 48), V(0, 13, -25), 46],
  [36.0, V(20, 5.0, 66), V(0, 15, -25), 48],
], { easeIn: false, easeOut: false, arc: true });
// far over the lagoon: the camera backs away as each fireball outgrows the last (a steady zoom out, ~1.32x a sneeze)
const FARDIR = V(0.42, 0.25, 0.87).normalize();
export const farDist = (t) => 1500 * (t < 38.0 ? 1 - 0.04 * (38 - t) : Math.pow(1.28, (t - 38.0) / 0.45));
export const far = { apply: (cam, t) => { const d = farDist(t), tgt = V(0, Math.min(0.55 * d / 8.5, 60 + 0.35 * d / 8.5), 0);
  cam.position.copy(tgt).addScaledVector(FARDIR, d); cam.up.set(0, 1, 0); cam.lookAt(tgt); cam.fov = 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); } };
// back to you after it all: full length (the pigeon at your feet), then slowly into a close-up as the next one builds
export const face = new CamPath([
  [51.0, V(-1.7, 1.55, 3.5), V(-0.32, 2.05, 0), 40],
  [54.6, V(-1.3, 2.05, 2.5), V(-0.3, 2.5, 0), 36],
  [62.0, V(-0.75, 2.78, 1.3), V(-0.2, 2.84, 0), 30],
], { easeIn: false, easeOut: false, arc: true });
export { smooth };
