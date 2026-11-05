// Look-dev for season 2's Pigalle set (engine/pigalle24.js) with the hero car at the kerb: t picks a view.
// 0 wide from the terre-plein, 1 along the hero pavement, 2 down into the passenger window (her eyes), 3 low over the wet road.
import * as THREE from 'three';
import { createRenderer } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { buildPigalle, PG } from '../engine/pigalle24.js';
import { makeCar24 } from '../engine/car24.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 1); globalThis.MSAA = 0;
  const R = createRenderer(); R.renderer.localClippingEnabled = true;
  const W = buildPigalle(R.renderer, { ssaa: globalThis.SSAA });
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 600); cam.layers.enable(1);
  R.renderPass.scene = W.scene; R.renderPass.camera = cam;
  R.renderer.toneMappingExposure = Number(q.get('exp') ?? 1.0);
  R.bloom.threshold = 0.9; R.bloom.strength = 0.38;
  const car = makeCar24({ paint: '#0c0d10', plate: 'HV-917-RB', mirrorReflect: false });
  car.group.position.set(2.5, 0, PG.ZK + 0.25 + 0.915); car.group.rotation.y = -Math.PI / 2; W.scene.add(car.group);
  car.setLights({ head: 1, tail: 1, dash: 1 }); car.setWindow('RF', Number(q.get('win') ?? 1));
  await Promise.all(TEX_PENDING);
  const views = [
    [V(-6, 1.7, 15.5), V(2.0, 2.2, 0), 50],
    [V(-4.5, 1.62, 3.0), V(4.0, 1.0, 4.6), 46],
    [V(2.4, 1.55, 3.7), V(2.3, 0.95, 5.2), 52],
    [V(-9, 0.45, 8.5), V(4, 1.0, 3.0), 40],
  ];
  return {
    duration: views.length, fps: 30, captions: [],
    frame(t) {
      const v = views[Math.min(views.length - 1, Math.floor(t))];
      cam.position.copy(v[0]); cam.lookAt(v[1]); cam.fov = v[2]; cam.updateProjectionMatrix();
      car.setWindow('RF', Number(q.get('win') ?? 1));
      R.composer.render();
    },
  };
}
