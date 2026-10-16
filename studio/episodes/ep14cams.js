// Post 8 camera moves (shared by ep14.js and the camflow check: node can import this file, it needs only three + core).
// Shibuya frame: x east, z south, y up, the crossing's centre at the origin. You walk the diagonal of the scramble toward
// the north-west corner; at APPEAR you are at HERO (frozen mid-stride from then on), the bead hangs 2.6 m ahead of you.
import * as THREE from 'three';
import { CamPath } from '../engine/core.js';

export const T = { HOOK: 3.6, APPEAR: 11.0, MILLI: 22.0, CITY: 33.0, SPACE: 43.0, REWIND: 51.0, END: 62.0 };
export const DUR = 68.0;
export const DIR = new THREE.Vector3(-13, 0, -11).normalize();              // your way: the diagonal to the north-west corner
export const HERO = new THREE.Vector3(3.8, 0, 3.2);                          // where you are when it appears
export const BEAD = HERO.clone().addScaledVector(DIR, 2.6).setY(1.32);
export const TOWER = new THREE.Vector3(4070, 0, 100);                        // Tokyo Tower: 4.07 km east of the crossing
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const side = new THREE.Vector3(-DIR.z, 0, DIR.x);                            // your right-hand side... (DIR rotated -90 degrees)
const ring = (ang, r, y) => BEAD.clone().addScaledVector(DIR, Math.cos(ang) * r).addScaledVector(side, Math.sin(ang) * r).setY(y);   // ang 0 = beyond the bead, facing you

// the hook (0-3.6 s): flash-forward, 140 m down the south avenue: the fireball fills the canyon, the signs die toward us
export const hook = new CamPath([
  [0, V(4, 14, 300), V(-1, 40, 0), 46],
  [3.6, V(3.5, 14.5, 294), V(-1, 42, 0), 45],
], { easeIn: false, easeOut: false, arc: true });

// the glide (3.6-11 s): a drone high over the north-west corner looking down the scramble at the crowd, sinking to
// eye level in front of you as you walk toward it; it ends 4.6 m ahead of you, where the bead will appear between us
export const glide = new CamPath([
  [3.6, V(-46, 62, -40), V(8, 0, 8), 44],
  [6.6, V(-20, 24, -17), V(5, 1, 4.5), 42],
  [9.0, V(-4.5, 5.2, -4.4), V(4.2, 1.3, 3.6), 40],
  [11.0, HERO.clone().addScaledVector(DIR, 4.6).setY(1.5).addScaledVector(side, 0.35), HERO.clone().setY(1.45), 38],
], { easeIn: false, easeOut: true, arc: true });

// the first nanoseconds (11-22 s): time all but stopped. A macro look at the bead (you behind it, frozen mid-step),
// pulling back as the plasma grows, then a slow arc round to your side
export const nano = new CamPath([
  [11.0, ring(0.0, 0.42, 1.36), BEAD.clone(), 30],
  [13.6, ring(0.22, 1.3, 1.42), BEAD.clone().lerp(HERO.clone().setY(1.4), 0.25), 34],
  [17.5, ring(0.95, 2.6, 1.5), BEAD.clone().lerp(HERO.clone().setY(1.35), 0.4), 38],
  [22.0, ring(1.75, 3.6, 1.65), BEAD.clone().lerp(HERO.clone().setY(1.3), 0.45), 42],
], { easeIn: false, easeOut: false, arc: true });

// the milliseconds (22-33 s): from 45 m over the north avenue, 114 m away, looking down the canyon at the crossing as the
// fireball swells and the shock runs out through the buildings; the shock reaches us at ~31.8 s
export const milli = new CamPath([
  [22.0, V(1.5, 44, -112), V(1.8, 3, 2), 46],
  [27.5, V(1.6, 45, -114), V(1.8, 12, 2), 50],
  [33.0, V(1.7, 46, -116), V(1.8, 34, 2), 56],
], { easeIn: false, easeOut: false, arc: true });

// the city (33-43 s): from beside Tokyo Tower's top deck, looking west 4 km across the city at the fireball rising
// into a mushroom cloud; the view tilts up with it
export const city = new CamPath([
  [33.0, V(TOWER.x + 90, 240, TOWER.z + 20), V(0, 260, -60), 40],
  [38.0, V(TOWER.x + 91, 241, TOWER.z + 20), V(0, 1300, -60), 41],
  [43.0, V(TOWER.x + 92, 242, TOWER.z + 20), V(0, 2700, -60), 42],
], { easeIn: false, easeOut: false, arc: true });

// the rewind (51-62 s): back to the instant it appeared, everyone frozen: down from above to the bead and your face
export const rewind = new CamPath([
  [51.0, V(-24, 26, -22), V(2.5, 1, 2.2), 44],
  [55.5, V(-4.2, 4.0, -4.0), BEAD.clone().lerp(HERO.clone().setY(1.5), 0.5), 40],
  [62.0, ring(0.12, 0.9, 1.4), BEAD.clone().lerp(HERO.clone().setY(1.5), 0.3), 32],
], { easeIn: false, easeOut: true, arc: true });
