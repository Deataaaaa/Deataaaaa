// Post 7 camera: first person (your eyes) on Baker Beach. Shots are key lists [t, x, eye height above the sand, z,
// heading (deg, 0 = +z north-east, 90 = +x the ocean, -90 = the land), pitch (deg), fov], interpolated with C1 cubic
// Hermite curves, plus a smooth handheld sway (sums of sines, no per-frame noise). Hard cuts only on sound hits.
// Node can import this file (three + sf7 only) for the camflow check.
import * as THREE from 'three';
import { groundY } from '../engine/sf7.js';

export const T = { HOOK: 3.6, ZERO: 11.0, BRIDGE: 17.0, SPACE: 31.0, SEA: 37.0, BACK: 41.0, EARLIER: 45.2, WAVE: 56.0, HIT: 60.2, END: 62.0 };
export const DUR = 68.0;
export const LOG = new THREE.Vector3(-9.6, 0, -30.2), CAPY = new THREE.Vector3(-3.5, 0, -29.0), KNEEL = new THREE.Vector3(LOG.x + 0.52, 0, LOG.z - 0.4);
const K = KNEEL;
const SHOTS = [
  { t0: 0, t1: T.HOOK, sway: 0.25, keys: [[0, K.x, 1.12, K.z, 30, 3, 46], [T.HOOK, K.x, 1.12, K.z, 31, 3.2, 46]] },
  // one take from the walk through the gust: shoved down behind the log, looking up at the houses being stripped, then
  // across to the bridge (push-in while it twists and breaks); no cut at zero
  { t0: T.HOOK, t1: T.SPACE, sway: 0.2, walk: T.ZERO, buffet: [T.ZERO, 0.8], jolt: T.ZERO, keys: [[3.6, -6.6, 1.66, -41.0, 33, 2, 55], [6.0, -6.6, 1.66, -38.2, 32, 1.5, 55],
    [8.6, -6.9, 1.66, -35.0, 22, -1, 56], [10.9, -7.7, 1.66, -32.2, 7, 1, 58], [12.8, K.x, 1.12, K.z, -12, 5, 64], [14.6, K.x, 1.12, K.z, -24, 8, 66],
    [16.6, K.x, 1.12, K.z, -6, 5, 62], [19.2, K.x, 1.12, K.z, 28, 3, 52], [22.5, K.x, 1.12, K.z, 32.5, 3.6, 38], [26.5, K.x, 1.12, K.z, 33.5, 4, 29], [31, K.x, 1.12, K.z, 34, 4, 31]] },
  { t0: T.SEA, t1: T.BACK, sway: 0.4, buffet: 1, keys: [[37, K.x, 1.12, K.z, 76, -5, 62], [41, K.x, 1.12, K.z, 78, -4, 62]] },
  { t0: T.BACK, t1: T.EARLIER, sway: 0.15, keys: [[41, K.x, 1.12, K.z, 78, -4, 62], [41.3, K.x, 1.12, K.z, 78.5, -4, 62], [42.6, K.x, 1.66, K.z + 0.1, 82, -3, 62], [45.2, K.x, 1.66, K.z + 0.1, 86, -1.5, 62]] },
  { t0: T.EARLIER, t1: T.WAVE, sway: 0.12, rumble: [50.6, 56, 0.5], keys: [[45.2, -6.6, 1.66, -41.0, 31, 2, 55], [50.6, -6.6, 1.66, -41.0, 31.5, 5, 56.5], [56.0, -6.6, 1.66, -41.0, 30.5, 11, 58]] },
  { t0: T.WAVE, t1: DUR, sway: 0.25, rumble: [56, 60, 1.6], keys: [[56.0, K.x, 1.66, K.z + 0.1, 80, 7, 70], [57.8, K.x, 1.66, K.z + 0.1, 79, 21, 70], [59.1, K.x, 1.64, K.z + 0.1, 77, 37, 72], [60.2, K.x, 1.62, K.z + 0.1, 76, 52, 74], [68, K.x, 1.62, K.z + 0.1, 76, 52, 74]] },
];
function herm(keys, t, c) {
  const n = keys.length; if (t <= keys[0][0]) return keys[0][c]; if (t >= keys[n - 1][0]) return keys[n - 1][c];
  let i = 0; while (t > keys[i + 1][0]) i++;
  const k0 = keys[i], k1 = keys[i + 1], h = k1[0] - k0[0], u = (t - k0[0]) / h;
  const tan = (j) => { const a = keys[Math.max(0, j - 1)], b = keys[Math.min(n - 1, j + 1)]; return j === 0 || j === n - 1 ? 0 : (b[c] - a[c]) / (b[0] - a[0]); };
  const m0 = tan(i) * h, m1 = tan(i + 1) * h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * k0[c] + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * k1[c] + (u3 - u2) * m1;
}
export function shotAt(t) { return SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1]; }
// POV camera at time t (video time); returns the shot so the episode knows how you stand
export function povCam(cam, t) {
  const S = shotAt(t), k = S.keys, D = THREE.MathUtils.degToRad;
  const x = herm(k, t, 1), eh = herm(k, t, 2), z = herm(k, t, 3);
  let hd = herm(k, t, 4), pt = herm(k, t, 5), roll = 0;
  const fov = herm(k, t, 6);
  const sw = S.sway, f = (a, b, c) => Math.sin(t * a + b) * c;
  hd += sw * (f(0.71, 1.3, 1) + f(1.37, 0.4, 0.5) + f(2.9, 2.1, 0.25));
  pt += sw * (f(0.83, 0.2, 0.8) + f(1.91, 1.7, 0.4) + f(3.3, 0.9, 0.2));
  roll += sw * (f(0.53, 2.6, 0.7) + f(1.6, 0.3, 0.3));
  if (S.jolt) { const u = (t - S.jolt) / 0.5; if (u > 0 && u < 1) { pt -= 1.2 * Math.sin(Math.PI * u); roll += 2.5 * Math.sin(Math.PI * u); } }
  if (S.buffet) { const b = Array.isArray(S.buffet) ? S.buffet[1] * Math.min(1, Math.max(0, (t - S.buffet[0]) / 0.4)) : S.buffet; hd += b * (f(4.6, 0.3, 0.32) + f(7.3, 1.1, 0.16)); pt += b * (f(5.2, 2.2, 0.3) + f(8.1, 0.7, 0.15)); roll += b * f(3.9, 1.4, 0.5); }
  if (S.rumble) { const [r0, r1, ra] = S.rumble, r = ra * Math.min(1, Math.max(0, (t - r0) / (r1 - r0))); pt += r * (f(6.1, 0.2, 0.25) + f(9.3, 1.2, 0.12)); hd += r * f(7.7, 2.3, 0.15); roll += r * f(4.4, 0.9, 0.35); }
  let y = groundY(x, z) + eh;
  if (S.walk && t < (S.walk === 1 ? 1e9 : S.walk)) y += 0.022 * Math.abs(Math.sin(Math.PI * 1.8 * t)) - 0.011;   // footsteps
  cam.position.set(x, y, z); cam.fov = fov; cam.updateProjectionMatrix();
  const h = D(hd), p = D(pt);
  const fwd = new THREE.Vector3(Math.sin(h) * Math.cos(p), Math.sin(p), Math.cos(h) * Math.cos(p));
  cam.up.set(0, 1, 0); cam.lookAt(cam.position.clone().add(fwd)); cam.rotateZ(D(roll)); cam.updateMatrixWorld();
  return S;
}
