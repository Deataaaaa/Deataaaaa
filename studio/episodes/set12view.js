// Look-dev for the « 12 % » set: t picks a view. 0 street from the far pavement, 1 from across at the 5th floor toward Inès's
// dormer, 2 the room from the door, 3 the room from the window, 4 down the stairwell, 5 the ladder at her window.
import * as THREE from 'three';
import { createRenderer, Overlay } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { buildWorld12 } from '../engine/world12.js';
import { LV, HERO_BAY } from '../engine/paris12.js';
import { ROOM } from '../engine/room12.js';
import { updateBeacons } from '../engine/trucks12.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 1); globalThis.MSAA = 0;
  const R = createRenderer();
  const W = buildWorld12(R.renderer);
  const cam = new THREE.PerspectiveCamera(55, 1080 / 1920, 0.05, 12000);
  R.renderPass.scene = W.scene; R.renderPass.camera = cam;
  R.renderer.toneMappingExposure = Number(q.get('exp') ?? 1.0);
  R.bloom.threshold = 0.9; R.bloom.strength = 0.35;
  await Promise.all(TEX_PENDING);
  const views = [
    [V(-2, 1.65, 11.6), V(1, 9, 0), 62],
    [V(4.5, 17.5, 12.6), V(HERO_BAY, 20.6, 0), 40],
    [V(4.4, ROOM.Y0 + 1.6, ROOM.Z0 + 0.3), V(3.0, ROOM.Y0 + 0.9, ROOM.Z1), 70],
    [V(3.0, ROOM.Y0 + 1.5, ROOM.Z1 - 0.2), V(4.2, ROOM.Y0 + 1.0, ROOM.Z0), 70],
    [V(6.25, LV[6] + 1.6, -5.9), V(6.25, LV[3], -7.0), 75],
    [V(6.0, 3.5, 11.0), V(HERO_BAY, 19, 0), 50],
  ];
  if (W.epa) W.epa.aim(V(HERO_BAY, 20.3, 0.9), 1);
  return {
    duration: 6, fps: 30, captions: [],
    frame(t) {
      const v = views[Math.min(views.length - 1, Math.floor(t))];
      cam.position.copy(v[0]); cam.lookAt(v[1]); cam.fov = v[2]; cam.updateProjectionMatrix();
      if (W.epa) { updateBeacons(W.epa.beacons, t); updateBeacons(W.fpt.beacons, t); }
      R.composer.render();
    },
  };
}
