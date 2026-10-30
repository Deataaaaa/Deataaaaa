// Look-dev for S2 P2's props (engine/props25.js): t picks a view. 0 the three coats and the tracker, 1 the hanging coat close,
// 2 the flat coat with its flap lifted and the tracker in the pocket, 3 the tracker macro (LED on). ?studio=0 for a night look.
import * as THREE from 'three';
import { createRenderer } from '../engine/core.js';
import { makeCoat, makeTracker } from '../engine/props25.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 1); globalThis.MSAA = 0;
  const R = createRenderer();
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#2e3034');
  const cam = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.005, 50);
  R.renderPass.scene = scene; R.renderPass.camera = cam; R.renderer.toneMappingExposure = 1.0; R.bloom.strength = 0.25;
  const pm = new THREE.PMREMGenerator(R.renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.7;
  const key = new THREE.DirectionalLight('#fff1e2', 2.2); key.position.set(-1.5, 2.5, 2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -1.5; key.shadow.camera.right = key.shadow.camera.top = 1.5; scene.add(key);
  scene.add(new THREE.HemisphereLight('#dfe6ff', '#3a3330', 0.6));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: '#55575c', roughness: 0.8 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 16), new THREE.MeshStandardMaterial({ color: '#777', metalness: 0.8, roughness: 0.3 })); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.9, 0); scene.add(bar);
  const drape = makeCoat('drape'); drape.position.set(0, 0.9, 0); scene.add(drape);
  const hang = makeCoat('hang'); hang.position.set(-0.55, 0.85, 0.1); scene.add(hang);
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshStandardMaterial({ color: '#c99a7c', roughness: 0.6 })); fist.position.copy(hang.position).add(V(0, 0.03, 0)); scene.add(fist);
  const flat = makeCoat('flat'); flat.position.set(0.6, 0, 0.15); flat.rotation.y = -0.3; scene.add(flat);
  const tr = makeTracker(); scene.add(tr);
  return {
    duration: 4, fps: 1, captions: [],
    frame(t) {
      const v = Math.floor(t);
      flat.flap(v === 2 ? 0.9 : 0); tr.blink(v >= 2 ? 1 : 0);
      tr.position.copy(flat.localToWorld(flat.pocket.c.clone().add(V(0, 0.004, 0.015)))); tr.rotation.set(-Math.PI / 2, 0, 0.3 - 0.3);
      if (v === 3) { tr.position.set(0, 0.3, 0.4); tr.rotation.set(-0.6, 0.2, 0); }
      const views = [[V(0.05, 1.05, 2.4), V(0.05, 0.55, 0), 40], [V(-0.4, 0.95, 0.75), V(-0.55, 0.6, 0.1), 40], [V(0.62, 0.45, -0.25), flat.localToWorld(flat.pocket.c.clone()), 40], [V(0.0, 0.36, 0.48), V(0, 0.3, 0.4), 30]][v];
      cam.position.copy(views[0]); cam.lookAt(views[1]); cam.fov = views[2]; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      R.composer.render();
    },
  };
}
