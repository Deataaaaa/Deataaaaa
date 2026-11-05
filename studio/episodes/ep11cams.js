// Post 5 camera moves (shared by ep11.js and the camflow check: node can import this file, it needs only three + core).
// Ground under the hero: H0 = (shoreX(0) - 14, groundY, 0) = (-30, 0.77, 0); the hero sits facing +x (the sea), his right
// hand side is +z. ep11.js checks that H0 matches the set.
import * as THREE from 'three';
import { CamPath } from '../engine/core.js';

export const H0 = new THREE.Vector3(-30, 0.77, 0);
export const T = { HOOK: 3.6, T0: 10.6, BANANA: 17.2, SAND: 20.0, ERUPT: 26.8, SPACE: 38.0, GOI: 50.0, END: 62.0 };
export const DUR = 68.0;
const V = (x, y, z) => new THREE.Vector3(H0.x + x, H0.y + y, H0.z + z);   // relative to the hero's ground point

// Apple sits on the wet black sand at the water's edge, 11 m in front of you and 6 m to your left
const SX = -16;                                                             // shoreX(z) near z = -6 (the bay's middle)
export const APPLE = { pos: new THREE.Vector3(SX - 2.6, 0, -6.1), yaw: -2.0 };

// the hook (0-3.6 s, a flash-forward to just after the decay): low on the wet sand behind Apple, the glowing breakers
// beyond; a slow push-in with a little lateral drift
export function hookCam(cam, t) {
  const k = t / T.HOOK, e = k * k * (3 - 2 * k) * 0.35 + k * 0.65;
  cam.position.set(SX - 4.35 + e * 0.25, 0.62 - e * 0.03, -6.55 + e * 0.05); cam.fov = 44; cam.updateProjectionMatrix();
  cam.up.set(0, 1, 0); cam.lookAt(SX + 20, -1.6 - e * 0.1, -1.6); cam.updateMatrixWorld();
}

// the glide (3.6-10.6 s): a drone comes in from over the sea at dusk, descending round to a three-quarter view of you
export const glide = new CamPath([
  [3.6, V(26, 13, -20), V(-14, 7.0, 6), 44],
  [6.2, V(15, 7, -7), V(-3.5, 1.9, 1.8), 44],
  [8.5, V(7.5, 2.9, -0.6), V(-0.4, 0.9, 0.2), 44],
  [10.6, V(4.1, 1.6, 0.9), V(-0.15, 0.8, 0.05), 44],
], { easeIn: false, easeOut: true, arc: true });

// slow motion (10.6-26.8 s): from behind you toward the blue sea, round your right side to the front, down to the banana
// and the spinner, then low over the burning black sand
export const slowmo = new CamPath([
  [10.6, V(-2.1, 1.25, 1.0), V(0.6, 0.95, -0.25), 46],
  [14.4, V(-0.95, 1.15, 2.2), V(0.35, 0.9, -0.1), 45],
  [18.6, V(0.85, 0.92, 1.7), V(0.05, 0.74, 0.1), 40],
  [21.6, V(1.0, 0.66, 1.6), V(-0.12, 0.3, 0.22), 42],
  [24.2, V(1.6, 0.55, 1.8), V(0.15, 0.22, 0.25), 43],
  [26.8, V(2.5, 0.78, 2.45), V(0.0, 0.32, 0.0), 47],
], { easeIn: false, easeOut: false, arc: true });

// the coast (26.8-38 s): 300 m out over the sea, low, looking at the beach and the towers as the land lifts off into a
// curtain of rock vapour; a slow push-in
export const coast = new CamPath([
  [26.8, new THREE.Vector3(255, 29, -64), new THREE.Vector3(-110, 60, 48), 42],
  [32.4, new THREE.Vector3(228, 31, -50), new THREE.Vector3(-110, 70, 52), 42],
  [38.0, new THREE.Vector3(200, 34, -36), new THREE.Vector3(-110, 82, 56), 41],
], { easeIn: false, easeOut: false, arc: true });
