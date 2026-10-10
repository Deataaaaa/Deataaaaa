// Post 6 camera moves (shared by ep12.js and the camflow check: node can import this file, it needs only three + core).
// Times Square frame: x east, z south, y up. You sit on step 6 of the red TKTS steps, facing south; HERO = the point on
// the tread under your hips.
import * as THREE from 'three';
import { CamPath } from '../engine/core.js';

export const STEPI = 6, STEP = { rise: 0.24, run: 0.6 };
export const HERO = new THREE.Vector3(-23.2, (STEPI + 1) * STEP.rise, -12 - STEPI * STEP.run - 0.32);   // the steps: x -30..-14, front edge z = -12
export const T = { HOOK: 3.6, STOP: 10.6, RESTART: 17.0, SKY: 27.0, SPACE: 38.0, VOSTOK: 50.0, END: 62.0 };
export const DUR = 68.0;
const V = (x, y, z) => new THREE.Vector3(HERO.x + x, HERO.y + y, HERO.z + z);

// the hook (0-3.6 s): a flash-forward to the sky falling, low on the plaza looking up past the steps at the towers
export function hookCam(cam, t) {
  const k = t / T.HOOK, e = k * k * (3 - 2 * k) * 0.3 + k * 0.7;
  cam.position.set(HERO.x + 6.5 - e * 0.6, 1.1 + e * 0.15, HERO.z + 16 - e * 1.2); cam.fov = 46; cam.updateProjectionMatrix();
  cam.up.set(0, 1, 0); cam.lookAt(HERO.x - 2, 24 + e * 2, HERO.z + 60); cam.updateMatrixWorld();
}

// the glide (3.6-10.6 s): a drone high over Duffy Square looking south down the bowtie to One Times Square, sinking
// over the steps to end over your right shoulder, the screens and the tower ahead of you
export const glide = new CamPath([
  [3.6, V(4, 42, -110), V(26, 16, 260), 50],
  [6.4, V(2.5, 17, -40), V(24, 10, 200), 48],
  [8.7, V(1.4, 4.6, -7.5), V(3, 2.0, 50), 46],
  [10.6, V(0.35, 1.4, -2.4), V(0.1, 0.7, 6), 44],
], { easeIn: false, easeOut: true, arc: true });

// the frozen second (10.6-17 s): a hard cut on the stop's hit, then bullet time: a slow 45-degree arc in front of you,
// from your right to your left, everything still
export const frozen = new CamPath([
  [10.6, V(1.9, 1.15, 1.9), V(0, 0.95, 0), 42],
  [13.8, V(0.9, 1.1, 2.6), V(0, 0.92, 0.05), 41],
  [17.0, V(-0.4, 1.12, 2.75), V(0, 0.9, 0.1), 40],
], { easeIn: false, easeOut: false, arc: true });

// the restart (17-27 s): a cut on the restart's crack; frost and snow; the camera backs away slowly and rises
export const restart = new CamPath([
  [17.0, V(0.6, 1.0, 2.0), V(0, 0.85, 0), 44],
  [21.5, V(1.0, 1.5, 3.4), V(0, 1.0, 0.3), 44],
  [27.0, V(1.8, 2.3, 5.6), V(0, 1.7, 1.0), 46],
], { easeIn: false, easeOut: false, arc: true });

// the sky falls (27-38 s): from the plaza looking south up the canyon at One Times Square, a slow push and tilt up
export const sky = new CamPath([
  [27.0, new THREE.Vector3(-17, 1.7, 30), new THREE.Vector3(4, 30, 300), 50],
  [32.5, new THREE.Vector3(-16.4, 1.8, 37), new THREE.Vector3(4, 48, 300), 50],
  [38.0, new THREE.Vector3(-15.8, 1.9, 44), new THREE.Vector3(4, 62, 300), 50],
], { easeIn: false, easeOut: false, arc: true });
