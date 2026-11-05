// Development views of the whale and the underwater set (not an episode). ?view=side|front|open|inside|bed
import * as THREE from 'three';
import { createRenderer, Overlay, clamp, lerp, smooth, W, H } from '../engine/core.js';
import { WATER, waterize, waterEnv, Shafts, Snow, makeSeabed, makeRocks, makeKelp, makeSurfaceBelow, makeWaterDome, Bubbles, FishSchool } from '../engine/ocean.js';
import { makeHumpback, Zu, UH, WL } from '../engine/whale.js';
import { loadMannequin } from '../engine/elevator.js';
import { makeDiver } from '../engine/diver.js';

export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  const q = new URLSearchParams(location.search);
  const view = q.get('view') || 'side';
  const gape = Number(q.get('gape') || 0), infl = Number(q.get('infl') || 0);
  const cam = new THREE.PerspectiveCamera(60, W / H, 0.03, 400);
  const scene = new THREE.Scene();
  const env = waterEnv(R.renderer);
  scene.environment = env; scene.environmentIntensity = 0.6;
  const bed = makeSeabed(); scene.add(bed.mesh);
  const rocks = makeRocks([[3, bed.height(3, -4) + 0.2, -4, 1.2, 0.8, 0.3, 0], [4.5, bed.height(4.5, -2) + 0.1, -2, 0.7, 0.9, 1, 1], [-2, bed.height(-2, -6) + 0.2, -6, 1.6, 0.7, 2, 2]]);
  scene.add(rocks.group);
  const kelp = makeKelp([[3, bed.height(3, -4) + 0.9, -4, 4], [-2, bed.height(-2, -6) + 1.1, -6, 5]]); scene.add(kelp.group);
  const surf = makeSurfaceBelow(); surf.mesh.position.y = 0; scene.add(surf.mesh);
  const dome = makeWaterDome(); scene.add(dome.mesh);
  const sun = new THREE.DirectionalLight('#fff6e8', 7.0); sun.position.set(-6, 30, -4); sun.target.position.set(0, -10, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.intensity = 0.6;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#9fd8d0', '#26302a', 0.9); scene.add(hemi);
  const shafts = new Shafts(64); scene.add(shafts.mesh);
  const snow = new Snow(1800); scene.add(snow.mesh);
  const whale = makeHumpback({ env }); scene.add(whale.group);
  whale.group.position.set(0, -9, 0);
  const diver = makeDiver(await loadMannequin('/engine/models/Michelle.glb'), { env }); scene.add(diver.me.root);
  diver.me.root.visible = view.startsWith('pov');
  window.DBG = { diver, whale, cam, THREE };
  const torchLight = new THREE.SpotLight('#fff3dd', 0, 14, 0.38, 0.5, 1.6); scene.add(torchLight, torchLight.target);
  const look = (p, t, fov = 60) => { cam.position.copy(p); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(t); cam.updateMatrixWorld(); };

  function frame(t) {
    WATER.wTime.value = t;
    whale.update({ gape, inflate: infl, swim: t * 2.2, swimAmp: 0.5, flip: gape });
    kelp.setTime(t);
    const wp = whale.group.position;
    if (view === 'side') look(new THREE.Vector3(14, -8, 2), wp.clone().add(new THREE.Vector3(0, 0, 0)), 55);
    else if (view === 'front') look(wp.clone().add(new THREE.Vector3(3.5, 0.6, 12)), wp.clone().add(new THREE.Vector3(0, -0.5, 3)), 55);
    else if (view === 'open') look(wp.clone().add(new THREE.Vector3(1.2, -0.8, 9.5)), wp.clone().add(new THREE.Vector3(0, -1.2, 3.0)), 62);
    else if (view === 'three') look(wp.clone().add(new THREE.Vector3(7, -1.5, 8)), wp.clone().add(new THREE.Vector3(0, -1, 1)), 55);
    else if (view === 'inside') look(wp.clone().add(new THREE.Vector3(0, -0.45, Zu(0.2))), wp.clone().add(new THREE.Vector3(0, -0.7, Zu(0.0) + 2)), 75);
    else if (view === 'bed') look(new THREE.Vector3(0, -12.4, 6), new THREE.Vector3(2, -13.5, -2), 70);
    else if (view === 'up') look(new THREE.Vector3(0, -12, 6), new THREE.Vector3(1, -2, 0), 75);
    else if (view.startsWith('pov')) {
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      if (view === 'pov') look(V(0, -12.2, 7), V(1.5, -13.6, 2), 72);
      else if (view === 'povwrist') look(V(0, -12.2, 7), V(-0.5, -13.0, 6.2), 50);
      else if (view === 'povtorch') look(wp.clone().add(V(0, -0.5, Zu(0.22))), wp.clone().add(V(0.3, -0.6, Zu(0.0))), 72);
      cam.updateMatrixWorld();
      const pv = q.get('pv') || '0';
      const POSES = {
        '0': [{ p: V(-0.17, -0.2, -0.42), f: V(0.1, -0.35, -1), n: V(0.1, -1, 0.3) }, { p: V(0.2, -0.24, -0.45), f: V(-0.05, -0.3, -1), n: V(-0.2, -1, 0.2) }],
        '1': [{ p: V(-0.13, -0.15, -0.45), f: V(-0.25, 0.15, -1), n: V(0.5, -0.85, 0) }, { p: V(0.14, -0.16, -0.46), f: V(0.25, 0.15, -1), n: V(-0.5, -0.85, 0) }],
        '2': [{ p: V(-0.12, -0.17, -0.44), f: V(0.05, 0.05, -1), n: V(0.85, -0.5, 0) }, { p: V(0.13, -0.18, -0.45), f: V(-0.05, 0.05, -1), n: V(-0.85, -0.5, 0) }],
        '3': [{ p: V(-0.14, -0.16, -0.42), f: V(-0.4, 0.35, -1), n: V(0.3, -0.9, -0.3) }, { p: V(0.15, -0.17, -0.43), f: V(0.4, 0.35, -1), n: V(-0.3, -0.9, -0.3) }],
      };
      const [L, Rr] = POSES[pv].map((o) => ({ p: o.p, f: o.f.normalize(), n: o.n.normalize() }));
      const curl = Number(q.get('curl') || 0.35);
      diver.pov(cam, { L, R: Rr, torchOn: view === 'povtorch', curlL: curl, curlR: curl, spread: Number(q.get('spread') || 0) });
      if (q.get('hcam')) {   // inspect the hands from outside: third-person camera near the left hand
        const hp = diver.B.LeftHand.getWorldPosition(new THREE.Vector3());
        const k = q.get('hcam');
        const off = k === 'side' ? V(-0.25, 0.08, 0.1) : k === 'top' ? V(0.02, 0.3, 0.05) : k === 'front' ? V(0.05, 0.05, -0.3) : V(0.15, -0.2, 0.15);
        const c2 = cam.clone(); c2.position.copy(hp.clone().add(off.applyQuaternion(cam.quaternion))); c2.lookAt(hp); c2.fov = 40; c2.near = 0.01; c2.updateProjectionMatrix(); c2.updateMatrixWorld();
        cam.copy(c2);
      }
      if (view === 'povtorch') {
        const lens = diver.torchLens(); const dir = V(0, 0, 1).applyQuaternion(diver.torch.getWorldQuaternion(new THREE.Quaternion()));
        torchLight.intensity = 60; torchLight.position.copy(lens); torchLight.target.position.copy(lens.clone().add(dir)); torchLight.target.updateMatrixWorld();
      }
    }
    shafts.update(cam.position, 0);
    snow.update(t, cam.position);
    R.renderer.toneMappingExposure = Number(q.get('exp') || 1.0);
    R.bloom.strength = 0.2; R.bloom.threshold = 0.95;
    const U = R.grade.uniforms; U.uVignette.value = 0.5; U.uAberr.value = 0.0015;
    R.renderPass.scene = scene; R.renderPass.camera = cam;
    R.composer.render(); ov.apply({ tag: 'WHAT IF &nbsp;·&nbsp; 03', tagA: 1 });
  }
  return { duration: 61, fps: 30, frame, captions: [] };
}
