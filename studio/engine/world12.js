// Series « 12 % »: the whole set in one call (the street at night, the hero building and its neighbours, Inès's room,
// the stairwell, the fire trucks, the lights). Used by every part and by the look-dev page episodes/set12view.js.
import * as THREE from 'three';
import { LV, STREET, BAYS, HERO_BAY, makeHaussmann, makeStreet, makeLanterns } from './paris12.js';
import { ROOM, makeRoom, makeStairwell } from './room12.js';
import { makeEPA, makeFPT } from './trucks12.js';
import { makeNightSky } from './piccadilly.js';
import { makeCar } from './town5.js';
import { rng } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildWorld12(renderer, { trucks = true, cars = true } = {}) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#0b0d12', 0.012);
  const sky = makeNightSky(); scene.add(sky.mesh || sky);
  // buildings: the hero (door in bay 2), neighbours on its side, the facing row across the street
  const B = [];
  const hero = makeHaussmann({ x0: -8.5, x1: 8.5, bays: BAYS, seed: 12, door: 2, lit: 0.3, hero: true, color: '#cdbfa5' }); B.push(hero);
  B.push(makeHaussmann({ x0: -22.0, x1: -8.5, bays: [-19.6, -16.4, -13.2, -10.6], seed: 3, lit: 0.25, color: '#c8b99c' }));
  B.push(makeHaussmann({ x0: 8.5, x1: 21.0, bays: [10.9, 14.1, 17.3, 19.4], seed: 5, lit: 0.28, color: '#d3c7b0' }));
  B.push(makeHaussmann({ x0: -24.0, x1: -7.0, bays: [-21.5, -18.3, -15.1, -11.9, -8.9], z0: STREET.W, face: -1, seed: 7, lit: 0.34, color: '#cfc2a8' }));
  B.push(makeHaussmann({ x0: -7.0, x1: 9.0, bays: [-4.8, -1.6, 1.6, 4.8, 7.4], z0: STREET.W, face: -1, seed: 9, lit: 0.4, color: '#c9bba0', door: 1 }));
  B.push(makeHaussmann({ x0: 9.0, x1: 25.0, bays: [11.4, 14.6, 17.8, 21.0, 23.6], z0: STREET.W, face: -1, seed: 11, lit: 0.3, color: '#d1c4ab' }));
  for (const b of B) scene.add(b);
  scene.add(makeStreet({ x0: -60, x1: 60 }));
  // wall lanterns on both fronts at 5.6 m
  const lan = makeLanterns([{ x: -10.5, y: 5.6, z: 0, face: 1 }, { x: 4.8, y: 5.6, z: 0, face: 1 }, { x: 18.0, y: 5.6, z: 0, face: 1 },
    { x: -16.0, y: 5.6, z: STREET.W, face: -1 }, { x: -1.0, y: 5.6, z: STREET.W, face: -1 }, { x: 13.0, y: 5.6, z: STREET.W, face: -1 }]);
  scene.add(lan.group);
  const lanternLights = lan.pts.map((p) => { const l = new THREE.PointLight('#ffb978', 22, 20, 2); l.position.copy(p); scene.add(l); return l; });
  // parked cars along both kerbs
  if (cars) {
    const r = rng(41), cols = ['#2b2f36', '#8c9196', '#5a1e1e', '#1d2a3c', '#d8d8d4', '#3a3a3a'];
    for (const [z, x0, x1, yaw] of [[STREET.PAVE + 1.0, -30, 30, 0], [STREET.W - STREET.PAVE - 1.0, -30, 30, Math.PI]]) {
      for (let x = x0; x < x1; x += 4.6 + r() * 1.4) {
        if (z < 6 && x > -6 && x < 9) continue;                 // room for the fire trucks in front of the hero building
        const c = makeCar(r() < 0.6 ? 'hatch' : 'sedan', cols[Math.floor(r() * cols.length)], r); c.group.position.set(x, 0, z); c.group.rotation.y = yaw; scene.add(c.group);
      }
    }
  }
  // the room and the stairwell
  const room = makeRoom(); scene.add(room.group);
  const stair = makeStairwell(); scene.add(stair.group);
  // trucks: the ladder truck in front of the building, the pump engine behind it
  let epa = null, fpt = null;
  if (trucks) {
    epa = makeEPA(); epa.group.position.set(-0.5, 0, 6.1); scene.add(epa.group);
    fpt = makeFPT(); fpt.group.position.set(-11.5, 0, 6.3); scene.add(fpt.group);
  }
  // lights
  const hemi = new THREE.HemisphereLight('#2c3a58', '#140f0c', 0.35); scene.add(hemi);
  const moon = new THREE.DirectionalLight('#a9bde6', 0.5); moon.position.set(-30, 60, 40); moon.target.position.set(0, 0, 4);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); const sc = moon.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 10; sc.far = 160;
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.03; scene.add(moon, moon.target);
  // through Inès's window: the lantern below lights her ceiling orange; blue beacons later
  const streetSpot = new THREE.SpotLight('#ffb070', 14, 9, 0.62, 0.8, 2); streetSpot.position.set(HERO_BAY + 0.15, ROOM.SILL - 0.25, -0.12);
  streetSpot.target.position.set(HERO_BAY - 0.2, ROOM.CEIL, -2.6); streetSpot.castShadow = true; streetSpot.shadow.mapSize.set(1024, 1024); streetSpot.shadow.bias = -0.0008;
  scene.add(streetSpot, streetSpot.target);
  const blueSpot = new THREE.SpotLight('#3a6cff', 0, 9, 0.66, 0.8, 2); blueSpot.position.set(HERO_BAY - 0.15, ROOM.SILL - 0.3, -0.1);
  blueSpot.target.position.set(HERO_BAY, ROOM.CEIL, -3.0); scene.add(blueSpot, blueSpot.target);
  const roomFill = new THREE.PointLight('#ffcf9a', 0.6, 6, 2); roomFill.position.set(3.0, ROOM.Y0 + 2.2, -2.8); scene.add(roomFill);
  const stairLamp = new THREE.PointLight('#ffd49a', 0, 9, 2); stairLamp.position.copy(stair.lamp.position).add(V(0, -0.15, -0.2)); scene.add(stairLamp);
  // night environment for reflections (the sky plus a few warm glints), baked once
  const pm = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene();
  envScene.add(makeNightSky().mesh || makeNightSky());
  for (const [x, y, z] of [[10, 3, 10], [-12, 4, 8], [6, 2, -10], [-8, 3, -12]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb070').multiplyScalar(6) })); s.position.set(x, y, z); envScene.add(s); }
  scene.environment = pm.fromScene(envScene, 0.02).texture; scene.environmentIntensity = 0.35;
  return { scene, sky, hero, buildings: B, lanternLights, room, stair, epa, fpt, hemi, moon, streetSpot, blueSpot, roomFill, stairLamp };
}
