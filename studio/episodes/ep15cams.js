// Post 9 camera moves and clocks (shared by ep15.js and the camflow check: node can import this file, it needs only three
// + core). London frame: x east, z south, y up, Tower Bridge's centre at the origin, the deck at y = 9. You walk south on
// the bridge's east pavement; the air turns thick at THICK (story clock 0) and thin again at story second 5.
import * as THREE from 'three';
import { CamPath } from '../engine/core.js';

export const T = { HOOK: 3.6, THICK: 11.0, BRIDGE: 23.0, PLANE: 33.0, SPACE: 44.0, BACK2: 50.0, BACK: 51.0, RET2: 56.0, END: 62.0 };
export const DUR = 68.0;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// the story clock (s since the air turned thick): real time before; slow motion from THICK to BACK (x1/15 at first,
// x1/2.5 just before the air returns); real time again after
const KEYS = [[T.THICK, 0], [T.BRIDGE, 0.8], [T.PLANE, 1.8], [T.SPACE, 3.2], [T.BACK2, 4.6], [T.BACK, 5.0]];
export function story(t) {
  if (t < T.HOOK) return 3.0 + t * 0.1;                               // the hook: a flash-forward into the third second
  if (t < T.THICK) return t - T.THICK;
  for (let i = 0; i < KEYS.length - 1; i++) { const [a, pa] = KEYS[i], [b, pb] = KEYS[i + 1]; if (t <= b) return pa + (t - a) / (b - a) * (pb - pa); }
  return 5.0 + (t - T.BACK);
}
// story seconds per video frame (for motion blur of the fans, etc.)
export const storyRate = (t) => (story(t + 0.02) - story(t - 0.02)) / 0.04;

// the plane: on approach to Heathrow, heading west 1,260 m up, straight over Tower Bridge; in the thick air it loses its engines and
// most of its lift: it slows (about 0.26 g) and sinks faster and faster; after second 5 it glides with dead engines
export const PLANE_Z = 18;
export function planeAt(ph) {
  if (ph < 0) return V(200 - 70 * ph, 1260 - 3.67 * ph, PLANE_Z);
  if (ph <= 5) return V(200 - (70 * ph - 1.25 * ph * ph), 1260 - 3.67 * ph - 3 * ph * ph, PLANE_Z);
  const x5 = 200 - (350 - 31.25), y5 = 1260 - 18.35 - 75;
  return V(x5 - 57.5 * (ph - 5), y5 - 8 * (ph - 5), PLANE_Z);
}
// its pitch (nose up +): level on the glide slope, nose dropping as it sinks, held at -4 degrees gliding after
export function planePitch(ph) { if (ph < 0) return 0.03; if (ph <= 5) return 0.03 - 0.025 * ph; return -0.07; }

// you: walking south on the east pavement (x = 7.4), at z = 62 when the air turns thick
export const HERO = V(7.4, 9.0, 62.0);
export const heroZ = (t) => HERO.z + 1.3 * (Math.min(t, T.THICK) - T.THICK);
// after the air thickens you slow like someone wading, and stop ~0.8 m on
export const heroDist = (ph) => { if (ph <= 0) return 1.3 * ph; const k = 1.6; return 1.3 * (1 - Math.exp(-k * ph)) / k; };
const HZ = (t) => HERO.z + (t < T.THICK ? 1.3 * (t - T.THICK) : heroDist(story(t)));

const P = (ph, dx, dy, dz) => planeAt(ph).add(V(dx, dy, dz));
// a camera flying with the plane: offsets (camera and target, relative to the plane) interpolated between keys
// [t, [dx, dy, dz], [tx, ty, tz], fov]; the plane's own motion carries it, so it never runs ahead of or behind it
class PlaneCam {
  constructor(keys) { this.keys = keys; }
  apply(cam, t) {
    const k = this.keys; let i = 0; while (i < k.length - 2 && t > k[i + 1][0]) i++;
    const a = k[i], b = k[i + 1], u0 = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))), u = u0 * u0 * (3 - 2 * u0) * 0.5 + u0 * 0.5;
    const L = (x, y) => x + (y - x) * u, pl = planeAt(story(t));
    cam.position.set(pl.x + L(a[1][0], b[1][0]), pl.y + L(a[1][1], b[1][1]), pl.z + L(a[1][2], b[1][2]));
    cam.up.set(0, 1, 0); cam.lookAt(pl.x + L(a[2][0], b[2][0]), pl.y + L(a[2][1], b[2][1]), pl.z + L(a[2][2], b[2][2]));
    cam.fov = L(a[3], b[3]); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
}
// the hook (0-3.6 s): beside the plane in the third second, engines dead, the rain hanging, Tower Bridge far below
export const hook = new PlaneCam([
  [0, [-8, 70, 30], [-2, -38, -18], 44],
  [3.6, [-9, 64, 27], [-2, -40, -17], 42],
]);
// the glide (3.6-11 s), two takes cut on a soft hit at 7.0: Tower Bridge side-on from 330 m over the river (a slow
// push), then high over the deck south of you, sinking to eye level in front of you (you walk toward the lens)
export const T_CUT1 = 7.0;
export const glideA = new CamPath([
  [3.6, V(330, 56, 18), V(0, 30, 0), 44],
  [7.0, V(268, 46, 24), V(0, 27, 2), 42],
], { easeIn: false, easeOut: false, arc: true });
export const glideB = new CamPath([
  [7.0, V(6.4, 24, 94), V(7.2, 9.8, 66), 40],
  [11.0, V(7.05, 10.55, 65.6), V(7.4, 10.62, 62.0), 38],
], { easeIn: false, easeOut: true, arc: true });
export const glide = { apply: (cam, t) => (t < T_CUT1 ? glideA : glideB).apply(cam, t) };
// the thick air, one take (11-33 s): close on you, round to the river side (the pigeon, the tea), then craning up and
// back over the water to see the whole bridge
export const instant = new CamPath([
  [11.0, V(7.05, 10.55, 65.6), V(7.4, 10.62, HZ(11)), 38],
  [14.0, V(6.45, 10.5, HZ(14) + 2.3), V(7.4, 10.6, HZ(14)), 34],
  [19.0, V(8.25, 10.45, HZ(19) + 2.0), V(7.4, 10.55, HZ(19)), 33],
  [22.5, V(8.4, 11.4, 66.6), V(7.4, 10.3, HZ(22.5) - 1.5), 36],
  [27.0, V(4.5, 19, 76), V(6, 9.5, 58), 40],
  [33.0, V(2, 34, 98), V(2, 11, 46), 44],
], { easeIn: false, easeOut: false, arc: true });
// the plane (33-44 s): flying with it, ahead and to the left of it (its left wing points south), the fan of its left
// engine winding down, then sliding under the wing as the landing lights die and the ram air turbine drops out
export const plane = new PlaneCam([
  [33.0, [-32, -3, 26], [1, 0.5, 4], 34],
  [38.5, [-24, -6, 23], [2, 0.5, 3], 36],
  [44.0, [-15, -9, 19], [3, 1.0, 1], 40],
]);
// the air comes back (50-56 s): on the bridge, close on you
export const back = new CamPath([
  [50.0, V(8.5, 10.5, HZ(50) + 2.6), V(7.4, 10.62, HZ(50)), 36],
  [56.0, V(8.05, 10.55, HZ(56) + 1.9), V(7.4, 10.64, HZ(56)), 32],
], { easeIn: false, easeOut: false, arc: true });
// the last take (56-62 s): behind and left of the plane as it glides on toward the City and the Shard, engines dead
export const glideOn = new PlaneCam([
  [56.0, [36, 8, 14], [-40, -12, -6], 40],
  [62.0, [32, 7, 13], [-44, -13, -6], 38],
]);
