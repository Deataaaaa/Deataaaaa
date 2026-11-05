// Look-dev for S2 P2's bar (engine/bar25.js): t picks a view. 0 the room from the window, 1 the counter and stools (her coat on a
// stool's back), 2 two glasses on the bar, 3 the back bar.
import * as THREE from 'three';
import { createRenderer } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { buildBar, makeGlass, BAR } from '../engine/bar25.js';
import { makeCoat } from '../engine/props25.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 1); globalThis.MSAA = 0;
  const R = createRenderer();
  const W = buildBar(R.renderer);
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.02, 100);
  R.renderPass.scene = W.scene; R.renderPass.camera = cam; R.renderer.toneMappingExposure = Number(q.get('exp') ?? 1.2); R.bloom.strength = 0.4;
  const st = W.stools[2], coat = makeCoat('drape', { w0: 0.3, w1: 0.34, front: 0.36, back: 0.42 }); coat.position.copy(st.back.c); W.scene.add(coat);
  const g1 = makeGlass('tumbler'), g2 = makeGlass('wine'); g1.position.set(-0.72, BAR.CY, BAR.CZ - 0.18); g2.position.set(-0.52, BAR.CY, BAR.CZ - 0.2); W.scene.add(g1, g2);
  await Promise.all(TEX_PENDING);
  const views = [[V(0.6, 1.6, 3.0), V(-0.6, 1.2, -1.5), 56], [V(1.2, 1.3, 1.6), V(-0.7, 0.95, -0.1), 46], [V(-0.4, BAR.CY + 0.16, BAR.CZ + 0.45), V(-0.62, BAR.CY + 0.06, BAR.CZ - 0.2), 36], [V(-0.4, 1.5, 0.6), V(-0.4, 1.5, -3.8), 60]];
  return { duration: 4, fps: 1, captions: [],
    frame(t) { const v = views[Math.floor(t)]; cam.position.copy(v[0]); cam.lookAt(v[1]); cam.fov = v[2]; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      R.bloom.threshold = Math.min(0.85, 0.95 / R.renderer.toneMappingExposure); R.composer.render(); } };
}
