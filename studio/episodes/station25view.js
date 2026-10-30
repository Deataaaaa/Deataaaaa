// Look-dev for S2 P2's commissariat (engine/station25.js): t picks a view. 0 the façade from across the street, 1 the entrance,
// 2 the front office from the doors, 3 the complaint desk.
import * as THREE from 'three';
import { createRenderer } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { buildStation, ST } from '../engine/station25.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 1); globalThis.MSAA = 0;
  const R = createRenderer();
  const W = buildStation(R.renderer);
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 600);
  R.renderPass.scene = W.scene; R.renderPass.camera = cam; R.renderer.toneMappingExposure = Number(q.get('exp') ?? 1.2); R.bloom.strength = 0.35;
  await Promise.all(TEX_PENDING);
  const D = ST.DESK;
  const views = [[V(0.5, 1.6, 11.2), V(1.0, 3.2, 0), 50], [V(3.4, 1.55, 4.2), V(1.6, 2.0, 0), 46], [V(1.6, 1.6, 1.2), V(1.0, 1.2, -4.5), 62], [V(D.x - 0.2, 1.25, D.z + 1.6), V(D.x, 0.95, D.z), 50]];
  return {
    duration: 4, fps: 1, captions: [],
    frame(t) { const v = views[Math.floor(t)]; W.flag.update(t * 0.7);
      cam.position.copy(v[0]); cam.lookAt(v[1]); cam.fov = v[2]; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      R.bloom.threshold = Math.min(0.85, 0.95 / R.renderer.toneMappingExposure); R.composer.render(); },
  };
}
