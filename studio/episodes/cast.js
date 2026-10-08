// Casting view (not an episode): one Rocketbox avatar under soft studio light, to pick the next "you".
// ?who=Female_Adult_12&shot=full|face|three&pose=relaxed|bind&turn=0.4
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRenderer, Overlay, W, H } from '../engine/core.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { aimBone, TEX_PENDING } from '../engine/elevator.js';

export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  const q = new URLSearchParams(location.search);
  const who = q.get('who') || 'Female_Adult_12', shot = q.get('shot') || 'full', pose = q.get('pose') || 'relaxed';
  const turn = Number(q.get('turn') || 0.35);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#5d6066');
  const pm = new THREE.PMREMGenerator(R.renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env; scene.environmentIntensity = 0.35;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshStandardMaterial({ color: '#6a6d73', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const key = new THREE.DirectionalLight('#fff1e2', 3.2); key.position.set(-2.2, 3.4, 2.6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.2, bottom: -0.2, near: 0.5, far: 10 });
  key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.9); fill.position.set(2.5, 1.6, 2.0);
  const rim = new THREE.DirectionalLight('#ffffff', 2.2); rim.position.set(1.2, 2.6, -2.8);
  scene.add(key, fill, rim, new THREE.HemisphereLight('#e8eef5', '#4a4c50', 0.4));

  const av = await loadAvatar(who, { env, smoothNormals: q.get('smooth') !== '0', dbgHair: q.get('dbghair'), softHair: q.get('soft') !== '0' });
  await Promise.all(TEX_PENDING);
  scene.add(av.root);
  console.log('avatar', who, 'height', av.debug.height.toFixed(3), 'raw', av.debug.rawHeight.toFixed(1), 'code', av.code);
  console.log('materials', av.debug.matNames.join(' | '));
  console.log('bones', av.debug.bipNames.join(','));
  console.log('mapped', Object.keys(av.bones).join(','));
  av.root.rotation.y = turn;
  av.root.updateMatrixWorld(true);

  // relaxed standing pose: arms down along the body, slight elbow bend, hands turned in
  function relax() {
    const B = av.bones, wp = (b) => b.getWorldPosition(new THREE.Vector3());
    av.root.updateMatrixWorld(true);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(av.root.quaternion);
    for (const side of ['Left', 'Right']) {
      const sh = wp(B[side + 'Arm']), el = wp(B[side + 'ForeArm']), wr = wp(B[side + 'Hand']);
      const L1 = sh.distanceTo(el), L2 = el.distanceTo(wr);
      const out = new THREE.Vector3(side === 'Left' ? 1 : -1, 0, 0).applyQuaternion(av.root.quaternion);
      const elT = sh.clone().add(new THREE.Vector3(0, -1, 0).multiplyScalar(L1 * 0.985)).add(out.clone().multiplyScalar(L1 * 0.12)).add(fwd.clone().multiplyScalar(-L1 * 0.04));
      aimBone(B[side + 'Arm'], el, elT);
      const el2 = wp(B[side + 'ForeArm']), wr2 = wp(B[side + 'Hand']);
      const wrT = el2.clone().add(new THREE.Vector3(0, -0.94, 0).multiplyScalar(L2)).add(fwd.clone().multiplyScalar(L2 * 0.3)).add(out.clone().multiplyScalar(L2 * 0.08));
      aimBone(B[side + 'ForeArm'], wr2, wrT);
    }
    av.root.updateMatrixWorld(true);
  }
  if (pose === 'relaxed') relax();

  const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 50);
  const head = av.bones.Head ? av.bones.Head.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1.6, 0);
  function frame(t) {
    if (shot === 'face') { cam.fov = 18; cam.position.set(0.35, head.y + 0.05, 1.55); cam.lookAt(0, head.y - 0.03, 0); }
    else if (shot === 'three') { cam.fov = 24; cam.position.set(0.9, head.y - 0.2, 2.6); cam.lookAt(0, head.y - 0.45, 0); }
    else { cam.fov = 30; cam.position.set(0.0, 1.0, 4.6); cam.lookAt(0, av.debug.height * 0.5, 0); }
    cam.updateProjectionMatrix();
    R.renderer.toneMappingExposure = Number(q.get('exp') || 1.0);
    R.bloom.strength = 0.08; R.bloom.threshold = 0.98;
    const U = R.grade.uniforms; U.uVignette.value = 0.35; U.uAberr.value = 0.0;
    R.renderPass.scene = scene; R.renderPass.camera = cam;
    R.composer.render(); ov.apply({});
  }
  return { duration: 61, fps: 30, frame, captions: [] };
}
