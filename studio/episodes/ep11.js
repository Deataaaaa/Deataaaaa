// Post 5: What if every radioactive atom decayed at once? (Guarapari, Brazil: Praia da Areia Preta at dusk)
// Work in progress: the set, viewed from preset cameras (?view=hook|beach|town|drone|hero).
import * as THREE from 'three';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, CamPath, project, W, H } from '../engine/core.js';
import { makeBeach, BX, groundY, shoreX, promX, PROM_Y } from '../engine/guarapari.js';
import { FX } from '../engine/paris.js';
import { fadeShadowBorders } from '../engine/fx.js';
import { TEX_PENDING } from '../engine/elevator.js';

const DUR = 66.0;
export const T = { HOOK: 3.6, T0: 10.6 };
const CAPTIONS = [
  [3.75, 6.85, 'This black sand is radioactive.'],
  [6.95, 10.15, 'People lie in it to feel better.'],
];

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);
  fadeShadowBorders(0.2);
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const B = makeBeach(R.renderer);
  const scene = B.scene;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.25, 12000);
  const views = {
    hook: [V(shoreX(10) - 7, 0.55, 10), V(220, 6, 2), 46],
    beach: [V(shoreX(0) - 24, 1.7, -30), V(10, 4, 220), 50],
    town: [V(45, 3.0, 10), V(-90, 18, 0), 50],
    drone: [V(160, 70, -160), V(-20, 0, 60), 50],
    hero: [V(shoreX(0) - 16, 1.2, 4), V(shoreX(0) + 60, 3, -4), 48],
  };
  B.setShadow(shoreX(0) - 15, 0, 0, 30);
  await Promise.all(TEX_PENDING);

  function frame(t) {
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.05; U.uContrast.value = 1.05; U.uVignette.value = 0.34; U.uAberr.value = 0.0006; U.uGrain.value = 0;
    BX.uTime.value = t; FX.uTime.value = t;
    BX.uCher.value = Number(q.get('cher') || 0); BX.uSand.value = Number(q.get('sandglow') || 0); BX.uBlackK.value = Number(q.get('black') ?? 1);
    if (q.get('sunhi')) { B.sun.position.copy(B.sun.target.position).add(new THREE.Vector3(-200, 400, -60)); }
    const v = views[q.get('view') || 'hook'];
    cam.position.copy(v[0]); cam.fov = v[2]; cam.updateProjectionMatrix(); cam.up.set(0, 1, 0); cam.lookAt(v[1]); cam.updateMatrixWorld();
    B.ocean.U.uFogCol.value.copy(scene.fog.color); B.ocean.U.uFogD.value = scene.fog.density;
    R.renderer.toneMappingExposure = Number(q.get('exp') || 0.62);
    R.bloom.strength = 0.35; R.bloom.radius = 0.55; R.bloom.threshold = 0.95 / R.renderer.toneMappingExposure;
    R.renderPass.scene = scene; R.renderPass.camera = cam;
    R.composer.render();
    ov.apply({ labels: [], tag: 'WHAT IF &nbsp;·&nbsp; 05', tagA: 1, title: { html: '', a: 0, k: 1 }, hud: null, caption: captionAt(CAPTIONS, t), end: null });
  }
  window.EP = { B, cam, THREE, BX };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS.map(([a, b, c]) => [a, b, c]) };
}
