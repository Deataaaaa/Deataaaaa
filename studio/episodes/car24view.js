// Look-dev for the season 2 hero car (engine/car24.js): t picks a view.
// 0 three-quarter front (curb side), 1 side, 2 three-quarter rear, 3 down into the open front window, 4 cabin from the rear seat,
// 5 the rear door open, 6 from above. ?paint=#hex&vtc=1&win=0..1&door=rad
import * as THREE from 'three';
import { createRenderer } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { makeNightSky } from '../engine/piccadilly.js';
import { makeCar24 } from '../engine/car24.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 1); globalThis.MSAA = 0;
  const R = createRenderer();
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#05060a');
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.02, 500);
  R.renderPass.scene = scene; R.renderPass.camera = cam;
  R.renderer.toneMappingExposure = Number(q.get('exp') ?? 1.1); R.renderer.localClippingEnabled = true;
  R.bloom.threshold = 0.85; R.bloom.strength = 0.3;
  // wet asphalt, a warm street lamp, pink and blue neon, an environment with coloured glints
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshPhysicalMaterial({ color: '#141518', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const lamp = new THREE.SpotLight('#ffc48a', 60, 30, 0.9, 0.6, 2); lamp.position.set(-4, 6.5, 1); lamp.target.position.set(0, 0, 0); lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); scene.add(lamp, lamp.target);
  const pink = new THREE.PointLight('#ff3a8c', 14, 18, 2); pink.position.set(-5, 2.8, 3); scene.add(pink);
  const blue = new THREE.PointLight('#3a7bff', 10, 18, 2); blue.position.set(-5, 2.6, -4); scene.add(blue);
  scene.add(new THREE.HemisphereLight('#2c3a58', '#140f0c', 0.25));
  const pm = new THREE.PMREMGenerator(R.renderer), env = new THREE.Scene(); const sky = makeNightSky(); env.add(sky.mesh || sky);
  for (const [x, y, z, c, k] of [[-8, 3, 4, '#ff3a8c', 8], [-8, 3, -6, '#3a7bff', 8], [-6, 7, 0, '#ffc48a', 10], [9, 3, 2, '#ffb070', 5], [0, 4, 12, '#ffffff', 3]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(x, y, z); env.add(m); }
  scene.environment = pm.fromScene(env, 0.03).texture; scene.environmentIntensity = 0.6;
  if (q.get('studio') === '1') { scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 1.0; scene.background = new THREE.Color('#3a3d42');
    ground.material.color.set('#5a5d62'); scene.add(new THREE.HemisphereLight('#ffffff', '#444444', 1.2)); const d = new THREE.DirectionalLight('#ffffff', 1.5); d.position.set(-5, 8, 4); d.castShadow = true; scene.add(d); }
  const car = makeCar24({ paint: q.get('paint') || '#0c0d10', vtc: q.get('vtc') === '1', plate: q.get('plate') || 'HV-917-RB', mirrorReflect: true });
  scene.add(car.group);
  car.setWindow('RF', Number(q.get('win') ?? 0)); car.setDoor(Number(q.get("door") ?? 0)); car.setLights({ head: 1, tail: 1, dash: 1 });
  await Promise.all(TEX_PENDING);
  const views = [
    [V(-3.6, 1.35, 4.6), V(0, 0.7, 0.4), 40],
    [V(-6.2, 1.0, 0), V(0, 0.7, 0), 50],
    [V(-3.4, 1.4, -4.8), V(0, 0.7, -0.6), 40],
    [V(-1.55, 1.62, 0.2), V(0.2, 0.95, 0.15), 52],
    [V(-0.42, 1.12, -1.05), V(0.1, 1.0, 1.2), 70],
    [V(-2.6, 1.5, -2.2), V(-0.6, 0.8, -0.6), 50],
    [V(0.01, 9, 0), V(0, 0, 0), 32],
  ];
  return {
    duration: views.length, fps: 30, captions: [],
    frame(t) {
      const i = Math.min(views.length - 1, Math.floor(t)), v = views[i];
      if (i === 5) car.setDoor(0.9);
      if (i === 3) car.setWindow('RF', Number(q.get('win3') ?? 1));
      cam.position.copy(v[0]); cam.up.set(i === 6 ? 1 : 0, i === 6 ? 0 : 1, 0); cam.lookAt(v[1]); cam.fov = v[2]; cam.updateProjectionMatrix();
      R.composer.render();
    },
  };
}
