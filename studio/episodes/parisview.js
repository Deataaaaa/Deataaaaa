// Development views of the Paris set (not an episode). ?view=wide|lawn|tower|hero&exp=1
import * as THREE from 'three';
import { createRenderer, Overlay, W, H } from '../engine/core.js';
import { makeParis, makeGrassField, FX } from '../engine/paris.js';
import { TEX_PENDING } from '../engine/elevator.js';

export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  const q = new URLSearchParams(location.search);
  const view = q.get('view') || 'wide';
  const num = (k) => (q.get(k) !== null ? Number(q.get(k)) : undefined);
  const P = makeParis(R.renderer, { sunAz: Number(q.get('az') || 230), sunEl: Number(q.get('el') || 40) });
  if (q.get('zen')) P.skyU.uZen.value.set('#' + q.get('zen')); if (q.get('hor')) P.skyU.uHor.value.set('#' + q.get('hor')); if (q.get('skyI')) P.skyU.uI.value = Number(q.get('skyI'));
  if (q.get('blades')) { const gf = makeGrassField(-20, 58, 9, Number(q.get('blades'))); P.scene.add(gf.mesh); }
  await Promise.all(TEX_PENDING);
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 12000);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const VIEWS = {
    wide: [V(-30, 60, 280), V(0, 70, -200), 55, [0, 0, 60, 260]],
    lawn: [V(-14, 1.6, 70), V(-20, 6, -120), 50, [-20, 0, 40, 60]],
    tower: [V(-10, 2, 30), V(0, 120, -200), 58, [0, 0, -80, 200]],
    hero: [V(-17, 1.2, 64), V(-20, 0.6, 58), 40, [-20, 0, 58, 25]],
    side: [V(-60, 4, 120), V(-100, 8, 60), 50, [-80, 0, 90, 60]],
    crane: [V(-30, 95, 120), V(-5, 60, -200), 60, [0, 0, -40, 260]],
  };
  const [p, t, fov, sh] = VIEWS[view];
  P.setShadow(sh[0], sh[1], sh[2], sh[3]);
  function frame(time) {
    FX.uTime.value = time; FX.uScorch.value = Number(q.get('scorch') || 0); FX.uHeat.value = Number(q.get('heat') || 0); FX.uMelt.value = Number(q.get('melt') || 0);
    P.glowMat.opacity = Number(q.get('glow') || 0);
    cam.position.copy(p); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(t); cam.updateMatrixWorld();
    R.renderer.toneMappingExposure = Number(q.get('exp') || 0.55);
    R.bloom.strength = 0.25; R.bloom.threshold = 0.9;
    const U = R.grade.uniforms; U.uVignette.value = 0.35; U.uAberr.value = 0.0008; U.uSat.value = Number(q.get('sat') || 1.0); U.uContrast.value = Number(q.get('con') || 1.04);
    R.renderPass.scene = P.scene; R.renderPass.camera = cam;
    R.composer.render(); ov.apply({ tag: 'WHAT IF &nbsp;·&nbsp; 04', tagA: 1 });
  }
  return { duration: 61, fps: 30, frame, captions: [] };
}
