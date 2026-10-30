// Look-dev for Apple the cat (not an episode): ?cam=front|three|side|close|eye&blink=0..1&glow=1&yaw=&t=
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRenderer, Overlay, W, H } from '../engine/core.js';
import { makeCat } from '../engine/cat.js';
import { TEX_PENDING } from '../engine/elevator.js';

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 1); globalThis.MSAA = 0;
  const R = createRenderer();
  const ov = new Overlay();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#6d6a74');
  const pm = new THREE.PMREMGenerator(R.renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: '#8a7a66', roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const key = new THREE.DirectionalLight('#ffd2a8', 3.0); key.position.set(-1.5, 1.2, 1.4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -0.4, right: 0.4, top: 0.5, bottom: -0.1, near: 0.1, far: 5 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01;
  const rim = new THREE.DirectionalLight(q.get('glow') ? '#4aa8ff' : '#ffffff', q.get('glow') ? 4.0 : 1.6); rim.position.set(0.8, 0.9, -1.6);
  scene.add(key, rim, new THREE.HemisphereLight('#c9cfe8', '#6a5a48', 0.5));
  const cat = makeCat();
  scene.add(cat.root);
  if (q.get('wdbg')) { cat.whiskers.material.uniforms.uCol.value.set(1, 0, 0); cat.whiskers.material.uniforms.uW.value = 0.002; cat.whiskers.material.depthTest = q.get('wdbg') !== '2'; }
  if (q.get('wdbg') === '3') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.004), new THREE.MeshBasicMaterial({ color: 'red' })); m.position.set(0.05, 0.01, 0.07); cat.head.add(m); console.log('whisker verts', cat.whiskers.geometry.attributes.position.count, JSON.stringify(cat.whiskers.geometry.attributes.position.array.slice(0, 6))); }
  await Promise.all(TEX_PENDING);
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.02, 50);
  const views = {
    front: [[0, 0.2, 0.95], [0, 0.16, 0], 30], three: [[0.55, 0.24, 0.75], [0, 0.15, 0], 30], side: [[0.95, 0.18, 0.05], [0, 0.15, 0], 30],
    close: [[0.12, 0.29, 0.42], [0, 0.26, 0.05], 22], eye: [[0.05, 0.27, 0.2], [0.02, 0.262, 0.07], 14], back: [[-0.4, 0.3, -0.85], [0, 0.15, 0], 30],
  };
  function frame(t) {
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.0; U.uContrast.value = 1.0; U.uVignette.value = 0.2; U.uAberr.value = 0; U.uGrain.value = 0;
    const b = Number(q.get('blink') || 0);
    cat.update(t, { blinkAt: b ? [t - 0.09] : [], yaw: q.get('yaw') != null ? Number(q.get('yaw')) : null, pitch: q.get('pitch') != null ? Number(q.get('pitch')) : null, pr: R.SSAA });
    const v = views[q.get('cam') || 'three'];
    cam.position.set(...v[0]); cam.fov = v[2]; cam.updateProjectionMatrix(); cam.lookAt(new THREE.Vector3(...v[1])); cam.updateMatrixWorld();
    R.renderer.toneMappingExposure = Number(q.get('exp') || 0.9);
    R.bloom.strength = 0.15; R.bloom.threshold = 1.0;
    R.renderPass.scene = scene; R.renderPass.camera = cam;
    R.composer.render();
    ov.apply({ labels: [], tag: '', tagA: 0, title: { html: '', a: 0, k: 1 }, hud: null, caption: null, end: null });
  }
  return { duration: 10, fps: 30, frame, captions: [] };
}
