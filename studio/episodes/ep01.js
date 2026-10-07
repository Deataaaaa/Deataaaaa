// EP 01 — What if Earth stopped spinning for 1 second?  (Paris, 48.86°N)
import * as THREE from 'three';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeOut, easeIn, project, W, H } from '../engine/core.js';
import {
  makeSky, makeStars, Puffs, streakTex, makeEiffel, makePerson, Trees, makeBuilding, makeAirliner, makeTrampoline,
  makeGlobe, latLon, latCircle, loadTex, canvasTex, getFacadeTex,
} from '../engine/assets.js';

// ---------------- facts (see notes/ep01-facts.md) ----------------
const V = 306.6;            // m/s eastward ground speed at the Eiffel Tower (48.86°N)
const MU_G = 5.9;           // friction deceleration of things sliding on the ground (mu ~0.6)
const SLOW = 30;            // slow-motion factor during the stopped second
const T_STOP = 13.5;        // screen time when Earth stops
const T_RESTART = T_STOP + SLOW;
const DUR = 60;

const tauOf = (t) => clamp((t - T_STOP) / SLOW, 0, 1);
const slide = (tau) => V * tau - 0.5 * MU_G * tau * tau;

// ---------------- script ----------------
const CAPTIONS = [
  [3.5, 5.6, "You're in Paris."],
  [5.7, 8.45, "And you're moving at 1,104 km/h."],
  [8.7, 11.3, 'Earth has been spinning for 4.5 billion years.'],
  [11.4, 13.35, 'It has never stopped.'],
  [13.75, 16.75, "The ground stops. You don't."],
  [17.0, 20.45, 'Everything not bolted down keeps going east. At 1,104 km/h.'],
  [20.75, 24.25, 'The Eiffel Tower is ripped off its feet.'],
  [24.55, 26.6, 'The air keeps going too.'],
  [26.7, 30.1, 'Every building is hit by a wind twice as fast as any tornado ever recorded.'],
  [30.35, 32.55, 'The Atlantic pulls away from New York…'],
  [32.65, 34.9, '…and slams into Europe.'],
  [35.15, 37.25, 'But a kid mid-jump on a trampoline…'],
  [37.35, 39.3, '…feels nothing. Nothing is touching them.'],
  [39.55, 41.45, 'Same for every plane in the sky.'],
  [41.55, 43.4, "They're moving with the air."],
  [43.75, 45.45, 'Then Earth spins again.'],
  [45.55, 48.5, 'Everything that crashed gets hit a second time.'],
  [48.75, 51.5, 'The kid lands 300 meters away.'],
  [51.75, 53.85, 'And Earth is now 1 second late. Forever.'],
  [53.95, 55.9, 'Every clock on the planet would need a leap second.'],
];
const TITLE = 'What if Earth stopped <span class="k">spinning</span> for 1 second?';
const ENDNOTE = 'Earth spins at 1,674 km/h at the equator<br>and 0 km/h at the poles';

export const cues = { stop: T_STOP, restart: T_RESTART, duration: DUR };

// ---------------- helpers ----------------
function timer(sec) {
  const s = Math.max(0, sec); const m = Math.floor(s / 60); const r = s - m * 60;
  return `${m}:${r.toFixed(3).padStart(6, '0')}`;
}
function grassTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6f9a45'; g.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = `rgba(${40 + v * 70},${90 + v * 70},${30 + v * 30},${0.25})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 3); }
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 8; i += 2) g.fillRect(0, i * h / 8, w, h / 8);
  }, { repeat: true });
}
function gravelTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#cdb690'; g.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 7000; i++) { const v = r(); g.fillStyle = `rgba(${150 + v * 80},${130 + v * 70},${100 + v * 50},.35)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  }, { repeat: true });
}
function checkerTex(c1, c2) {
  return canvasTex(64, 64, (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? c1 : c2; g.fillRect(x * 8, y * 8, 8, 8); } });
}

// =====================================================================
// PARIS
// =====================================================================
function buildParis() {
  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(-0.9, 0.2, -0.38).normalize();
  scene.fog = new THREE.Fog('#e6b58a', 260, 2200);
  const sky = makeSky({ sunDir, zenith: '#3768ad', horizon: '#ffb36e', below: '#9a7c62', sunCol: '#ffcf8f', sunSize: 0.0010, glow: 1.0 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight('#c3d6ff', '#7a6446', 0.85));
  const sun = new THREE.DirectionalLight('#ffd3a2', 3.1);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 10, far: 2000 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5;
  scene.add(sun, sun.target);
  const setShadow = (x, y, z, half) => {
    sun.target.position.set(x, y, z); sun.position.copy(sun.target.position).addScaledVector(sunDir, 800);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half });
    sun.shadow.camera.updateProjectionMatrix();
  };

  const r = rng(2024);
  // ground
  const gTex = gravelTex(); gTex.repeat.set(600, 600);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ map: gTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const grass = grassTex();
  const lawnMat = (w, d) => { const t = grass.clone(); t.needsUpdate = true; t.repeat.set(w / 10, d / 10); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); };
  const addLawn = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0; const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), lawnMat(w, d));
    m.position.set((x0 + x1) / 2, 0.1, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m);
  };
  const zSegs = [[-120, -20], [-8, 80], [92, 180], [192, 280], [292, 380], [392, 480], [492, 600]];
  for (const [z0, z1] of zSegs) { addLawn(-56, -5, z0, z1); addLawn(5, 56, z0, z1); addLawn(-92, -68, z0, z1); addLawn(68, 92, z0, z1); }
  // north of tower: Seine-side gardens + river
  addLawn(-140, 140, -420, -300);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(3000, 90), new THREE.MeshStandardMaterial({ color: '#4d6f7d', roughness: 0.15, metalness: 0.3 }));
  river.rotation.x = -Math.PI / 2; river.position.set(0, 0.05, -480); scene.add(river);
  // avenues
  const roadMat = new THREE.MeshStandardMaterial({ color: '#45474c', roughness: 0.9 });
  for (const s of [-1, 1]) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(22, 1600), roadMat); road.rotation.x = -Math.PI / 2; road.position.set(s * 109, 0.04, 150); road.receiveShadow = true; scene.add(road);
  }
  const roadX = new THREE.Mesh(new THREE.PlaneGeometry(1600, 24), roadMat); roadX.rotation.x = -Math.PI / 2; roadX.position.set(0, 0.03, -290); roadX.receiveShadow = true; scene.add(roadX);

  // lamp posts (anchored)
  const lampG = new THREE.CylinderGeometry(0.09, 0.14, 4.2, 6); lampG.translate(0, 2.1, 0);
  const lampHead = new THREE.BoxGeometry(0.45, 0.6, 0.45); lampHead.translate(0, 4.4, 0);
  const lamps = []; for (let z = -110; z < 600; z += 24) for (const x of [-60, 60]) lamps.push([x, z]);
  const lampMat = new THREE.MeshStandardMaterial({ color: '#1f2326', roughness: 0.5, metalness: 0.5 });
  const lp = new THREE.InstancedMesh(lampG, lampMat, lamps.length), lh = new THREE.InstancedMesh(lampHead, lampMat, lamps.length);
  const mm = new THREE.Matrix4();
  lamps.forEach(([x, z], i) => { mm.makeTranslation(x, 0, z); lp.setMatrixAt(i, mm); lh.setMatrixAt(i, mm); });
  lp.castShadow = lh.castShadow = true; scene.add(lp, lh);

  // trees (rows along the lawns)
  const treeList = [];
  for (let z = -55; z < 600; z += 9.5) for (const x of [-62, -98, 62, 98]) if (!(z > -30 && z < 0)) treeList.push({ x: x + (r() - 0.5) * 0.8, z: z + (r() - 0.5) * 0.8 });
  for (let i = 0; i < 40; i++) treeList.push({ x: (r() - 0.5) * 260, z: -330 - r() * 80, h: 11 + r() * 5 });
  const trees = new Trees(treeList, 17); scene.add(trees.group);
  treeList.forEach((t) => { t.snap = 0.002 + r() * 0.02; t.spin = (r() - 0.5) * 0.4; t.tilt = 0.9 + r() * 0.5; });

  // Haussmann buildings along both avenues
  const buildings = [];
  for (const s of [-1, 1]) {
    let z = -170;
    while (z < 620) {
      const w = [14, 21, 28][Math.floor(r() * 3)]; const hgt = 21 + r() * 4; const d = 18 + r() * 4;
      const b = makeBuilding(w, d, hgt, r); b.root.rotation.y = Math.PI / 2;
      const x = s * (122 + d / 2); b.root.position.set(x, 0, z + w / 2); scene.add(b.root);
      buildings.push({ ...b, x, z: z + w / 2, s, seed: r(), tilt: (r() - 0.5) * 0.12, drop: 0.6 + r() * 0.3 });
      z += w + (r() < 0.12 ? 16 : 0.3);
    }
  }
  // second rows + distant city (simple blocks, slide as one group)
  const far = new THREE.Group(); scene.add(far);
  const farMat = new THREE.MeshStandardMaterial({ color: '#e2d3b6', roughness: 0.95 });
  const farRoof = new THREE.MeshStandardMaterial({ color: '#5f6873', roughness: 0.7, metalness: 0.2 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const farList = [];
  for (let i = 0; i < 520; i++) {
    let x, z;
    const k = r();
    if (k < 0.45) { x = (r() < 0.5 ? -1 : 1) * (165 + r() * 520); z = -500 + r() * 1200; }
    else if (k < 0.8) { x = (r() - 0.5) * 1500; z = -560 - r() * 700; }
    else { x = (r() - 0.5) * 1400; z = 640 + r() * 500; }
    if (z > -560 && Math.abs(x) < 470) continue;
    const h = 18 + r() * 9; const w = 14 + r() * 26, d = 14 + r() * 20;
    farList.push([x, z, w, h, d]);
  }
  const farI = new THREE.InstancedMesh(box, farMat, farList.length), farR = new THREE.InstancedMesh(box, farRoof, farList.length);
  farList.forEach(([x, z, w, h, d], i) => {
    mm.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)); farI.setMatrixAt(i, mm);
    mm.compose(new THREE.Vector3(x, h + 2, z), new THREE.Quaternion(), new THREE.Vector3(w * 0.85, 4, d * 0.85)); farR.setMatrixAt(i, mm);
  });
  farI.castShadow = farR.castShadow = true; farI.receiveShadow = true; far.add(farI, farR);
  // a dome on the horizon (Invalides-like) for a Paris skyline read
  const dome = new THREE.Group(); far.add(dome);
  const dm = new THREE.MeshStandardMaterial({ color: '#c9a64b', roughness: 0.3, metalness: 0.8 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(16, 18, 30, 20), farMat); drum.position.y = 45;
  const cup = new THREE.Mesh(new THREE.SphereGeometry(17, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), dm); cup.position.y = 60; cup.scale.y = 1.4;
  const base = new THREE.Mesh(new THREE.BoxGeometry(90, 30, 60), farMat); base.position.y = 15;
  dome.add(drum, cup, base); dome.position.set(520, 0, 820);

  // Eiffel Tower
  const tower = makeEiffel(7); tower.root.position.set(0, 0, -200); scene.add(tower.root);

  // people + picnic props
  const actors = [];
  const blanketTex = [checkerTex('#d64541', '#f4efe6'), checkerTex('#2e6fb7', '#f4efe6'), checkerTex('#3f8f5a', '#efe6cf'), checkerTex('#e0a526', '#f6f0e3')];
  const propMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true });
  const addGroup = (cx, cz, n, hero = false) => {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 1.9), new THREE.MeshStandardMaterial({ map: blanketTex[Math.floor(r() * 4)], roughness: 1 }));
    bl.position.set(cx, 0.22, cz); bl.rotation.y = (r() - 0.5) * 0.6; bl.receiveShadow = true; bl.castShadow = true; scene.add(bl);
    actors.push({ obj: bl, kind: 'prop', x0: cx, y0: 0.22, z0: cz, ry: bl.rotation.y, mu: 0.5 + r() * 0.3, spin: (r() - 0.5) * 3, flip: (r() - 0.5) * 4, delay: r() * 0.01, hero });
    for (let i = 0; i < n; i++) {
      const p = makePerson(r, 'sit'); const a = (i / n) * Math.PI * 2 + r();
      p.position.set(cx + Math.cos(a) * 0.9, 0.2, cz + Math.sin(a) * 0.75); p.rotation.y = -a - Math.PI / 2 + (r() - 0.5) * 0.5; scene.add(p);
      actors.push({ obj: p, kind: 'sit', x0: p.position.x, y0: 0.2, z0: p.position.z, ry: p.rotation.y, mu: 0.5 + r() * 0.3, roll: (r() < 0.5 ? -1 : 1) * (2 + r() * 3), delay: r() * 0.012, hero });
    }
    const items = [[0.5, 0.35, 0.35, '#8b5a2b'], [0.09, 0.32, 0.09, '#2f6b3a'], [0.09, 0.3, 0.09, '#7a1f2b'], [0.45, 0.06, 0.3, '#f2e8cf']];
    for (const [w, h, d, c] of items) {
      if (r() < 0.25) continue;
      const m = new THREE.Mesh(w < 0.1 ? new THREE.CylinderGeometry(w * 0.8, w, h, 8) : new THREE.BoxGeometry(w, h, d), propMat(c));
      const x = cx + (r() - 0.5) * 1.2, z = cz + (r() - 0.5) * 0.9; m.position.set(x, 0.24 + h / 2, z); m.castShadow = true; scene.add(m);
      actors.push({ obj: m, kind: 'prop', x0: x, y0: 0.24 + h / 2, z0: z, ry: 0, mu: 0.3 + r() * 0.4, spin: (r() - 0.5) * 8, flip: (r() - 0.5) * 9, delay: r() * 0.01, hero });
    }
  };
  // hero picnic right in front of the S4 camera
  addGroup(-6, 126, 4, true);
  addGroup(-1.5, 130.5, 2, true);
  const standHero = makePerson(r, 'stand'); standHero.position.set(-3.6, 0.2, 124.2); standHero.rotation.y = 0.4; scene.add(standHero);
  actors.push({ obj: standHero, kind: 'stand', x0: -3.6, y0: 0.2, z0: 124.2, ry: 0.4, mu: 0.6, roll: 2.5, delay: 0.004, hero: true });
  // more groups on the lawns
  for (let i = 0; i < 26; i++) {
    const side = r() < 0.5 ? -1 : 1; const cx = side * (10 + r() * 42); const cz = 95 + r() * 85;
    if (Math.hypot(cx + 6, cz - 126) < 9) continue;
    addGroup(cx, cz, 1 + Math.floor(r() * 4));
  }
  for (let i = 0; i < 14; i++) { const side = r() < 0.5 ? -1 : 1; addGroup(side * (10 + r() * 42), -5 + r() * 85, 1 + Math.floor(r() * 3)); }
  // standing / walking people on the paths
  for (let i = 0; i < 46; i++) {
    const onPath = r();
    let x, z;
    if (onPath < 0.5) { x = (r() - 0.5) * 9; z = -100 + r() * 290; } else { x = (r() < 0.5 ? -1 : 1) * (58 + r() * 8); z = -100 + r() * 290; }
    const walk = r() < 0.6; const p = makePerson(r, walk ? 'walk' : 'stand'); p.position.set(x, 0.0, z); p.rotation.y = walk ? (r() < 0.5 ? 0 : Math.PI) : r() * 6; scene.add(p);
    actors.push({ obj: p, kind: 'stand', x0: x, y0: 0, z0: z, ry: p.rotation.y, mu: 0.5 + r() * 0.3, roll: (r() < 0.5 ? -1 : 1) * (1.5 + r() * 3), delay: r() * 0.02, walk: walk ? (p.rotation.y === 0 ? 1.3 : -1.3) : 0 });
  }
  // cars on the avenues
  const carCols = ['#c0392b', '#ecf0f1', '#2c3e50', '#7f8c8d', '#2980b9', '#16a085', '#f1c40f', '#1d1d1d'];
  for (let i = 0; i < 26; i++) {
    const s = r() < 0.5 ? -1 : 1; const lane = s * (103 + (r() < 0.5 ? 0 : 11)); const z = -150 + r() * 560;
    const car = new THREE.Group(); const c = propMat(carCols[Math.floor(r() * carCols.length)]);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, 4.3), c); body.position.y = 0.65;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.3), propMat('#2a3442')); cab.position.set(0, 1.3, -0.2);
    car.add(body, cab);
    for (const [wx, wz] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 10), propMat('#111')); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.33, wz); car.add(w); }
    car.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    car.position.set(lane, 0, z); scene.add(car);
    actors.push({ obj: car, kind: 'car', x0: lane, y0: 0, z0: z, ry: 0, mu: 0.7, vz: (lane > 0 ? -1 : 1) * (6 + r() * 5) * (r() < 0.2 ? 0 : 1), roll: -(1.5 + r() * 2), delay: 0 });
  }

  // particles: wind streaks, dust sheet, leaves, debris
  const streaks = new Puffs(320, { map: streakTex(), additive: true, renderOrder: 6 });
  const dust = new Puffs(900, { fogColor: '#e6b58a', fogNear: 260, fogFar: 2200, renderOrder: 5 });
  const leaves = new Puffs(500, { renderOrder: 7 });
  scene.add(streaks.mesh, dust.mesh, leaves.mesh);
  const sparks = new Puffs(420, { map: streakTex(), additive: true, renderOrder: 9 });
  const legDust = new Puffs(260, { fogColor: '#e6b58a', fogNear: 260, fogFar: 2200, renderOrder: 6 });
  scene.add(sparks.mesh, legDust.mesh);
  const debrisN = 700;
  const debris = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#d8c8a8', roughness: 0.95, flatShading: true }), debrisN);
  debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage); debris.castShadow = true; scene.add(debris);
  const dr = rng(77); const debrisSeeds = [];
  for (let i = 0; i < debrisN; i++) {
    const src = dr();
    let ox, oy, oz;
    if (src < 0.6) { const b = buildings[Math.floor(dr() * buildings.length)]; ox = b.x + b.s * (-(b.depth / 2) + dr() * b.depth) * 0; oy = b.gh * (0.6 + dr() * 0.6); oz = b.z + (dr() - 0.5) * b.width; ox = b.x + (dr() - 0.5) * b.depth; }
    else { const leg = Math.floor(dr() * 4); const sx = leg & 1 ? 1 : -1, sz = leg & 2 ? 1 : -1; ox = sx * (49 + (dr() - 0.5) * 20); oz = -200 + sz * (49 + (dr() - 0.5) * 20); oy = 3 + dr() * 6; }
    debrisSeeds.push({ ox, oy, oz, vx: V * (0.25 + dr() * 0.7), vy: 4 + dr() * 14, vz: (dr() - 0.5) * 30, s: 0.25 + Math.pow(dr(), 2) * 1.8, t0: dr() * 0.08, rx: dr() * 20, rz: dr() * 20, c: dr() });
  }

  // ---------------- per-frame update ----------------
  const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  let curCam = null;
  function update(t, cam, focus) {
    curCam = cam;
    const tau = tauOf(t);
    const ev = t >= T_STOP;
    const post = t >= T_RESTART ? t - T_RESTART : -1;
    // actors
    for (const a of actors) {
      const o = a.obj;
      if (!ev) {
        if (a.walk) { const z = a.z0 + a.walk * t * -1; o.position.z = z; const sw = Math.sin(t * 5.2 + a.x0) * 0.45; o.userData.legs[0].rotation.x = sw; o.userData.legs[1].rotation.x = -sw; o.userData.arms[0].rotation.x = -sw * 0.8; o.userData.arms[1].rotation.x = sw * 0.8; }
        if (a.kind === 'car' && a.vz) o.position.z = a.z0 + a.vz * t;
        continue;
      }
      const tt = Math.max(0, tau - a.delay);
      const zBase = a.walk ? a.z0 - a.walk * T_STOP : a.kind === 'car' ? a.z0 + a.vz * T_STOP : a.z0;
      const vzc = a.kind === 'car' ? a.vz : 0;
      o.position.x = a.x0 + V * tt - 0.5 * MU_G * a.mu * tt * tt;
      o.position.z = zBase + vzc * tt * SLOW / SLOW;
      if (a.kind === 'stand') {
        const th = Math.min(Math.PI / 2 - 0.05, Math.PI / 2 * Math.pow(Math.min(1, tt / 0.36), 2));
        tmpE.set(Math.max(0, tt - 0.36) * a.roll, a.ry, -th, 'XYZ'); o.rotation.copy(tmpE);
        o.position.y = a.y0 + 0.12 * Math.max(0, Math.sin(tt * 9)) * smooth(0.36, 0.45, tt);
      } else if (a.kind === 'sit') {
        const th = Math.min(Math.PI / 2, Math.PI / 2 * Math.pow(Math.min(1, tt / 0.3), 1.5));
        tmpE.set(Math.max(0, tt - 0.2) * a.roll, a.ry, -th, 'XYZ'); o.rotation.copy(tmpE);
        o.position.y = a.y0 + 0.3 * smooth(0.0, 0.25, tt);
      } else if (a.kind === 'prop') {
        tmpE.set(tt * a.flip, a.ry + tt * a.spin, -tt * a.flip * 0.7, 'XYZ'); o.rotation.copy(tmpE);
        o.position.y = a.y0 + Math.abs(Math.sin(tt * 7 + a.spin)) * 0.6 * smooth(0, 0.1, tt);
      } else if (a.kind === 'car') {
        const th = a.roll * Math.max(0, tt - 0.05);
        o.rotation.set(0, 0, th); o.position.y = 1.0 * Math.abs(Math.sin(th)) + 0.2;
      }
      if (post >= 0) {
        // restart: relative sliding stops; things settle where they are
        o.position.y = Math.max(0, o.position.y * (1 - smooth(0, 0.5, post)));
      }
    }
    // trees
    trees.update((tr) => {
      if (!ev) return null;
      const tt = tau - tr.snap; if (tt <= 0) return null;
      return { dx: V * tt - 0.5 * MU_G * 0.3 * tt * tt, dy: -Math.min(1.1, 4.9 * tt * tt), rz: -Math.min(1.45, (0.12 + 1.3 * tt) * tr.tilt), rx: tr.spin * tt };
    });
    // buildings
    for (const b of buildings) {
      if (!ev) { b.upper.position.set(0, b.gh, 0); b.upper.rotation.set(0, 0, 0); b.ground.scale.y = 1; b.ground.position.y = b.gh / 2; continue; }
      const tt = Math.max(0, tau - 0.003);
      const dx = V * tt - 0.5 * 3.5 * tt * tt;
      const crush = smooth(0, 0.35, tt) * b.drop;
      // building root is rotated 90° about Y: local x = world -z ... convert world east (+x) to local axis
      b.upper.position.set(0, b.gh * (1 - crush) - Math.min(0, 0), 0);
      b.upper.position.z = dx; // local +z is world +x after rotation.y = +90°
      b.upper.rotation.set(-(0.05 + b.tilt) * smooth(0, 0.6, tt) * 0, 0, 0);
      b.upper.rotation.x = (0.04 + Math.abs(b.tilt)) * smooth(0.05, 0.9, tt);
      b.ground.scale.y = Math.max(0.25, 1 - crush); b.ground.position.y = b.gh * b.ground.scale.y / 2;
    }
    far.position.x = ev ? slide(Math.max(0, tau - 0.003)) : 0; far.position.y = ev ? -Math.min(4, 4.9 * tau * tau) : 0;
    // tower body
    if (ev) {
      const tt = Math.max(0, tau - 0.004);
      tower.body.position.set(V * tt - 0.5 * 1.5 * tt * tt, -4.9 * tt * tt, 0);
      tower.body.rotation.set(0, 0, -0.3 * Math.pow(tt, 1.2));
      if (post >= 0) {
        const k = smooth(0, 0.7, post);
        tower.body.position.y = -4.9 - 2.2 * k;
        tower.body.rotation.z = -0.3 - 0.35 * easeIn(clamp(post / 5.5));
      }
    } else { tower.body.position.set(0, 0, 0); tower.body.rotation.set(0, 0, 0); }

    // ---- particles ----
    const fx = focus || { x: 0, z: 100, span: 260, depth: 160 };
    const active = ev && (post < 0 || post < 6);
    // wind streaks
    const sr = rng(91);
    for (let i = 0; i < streaks.n; i++) {
      const x0 = sr() * fx.span, y = Math.pow(sr(), 2.2) * 38 + 0.3, z = fx.z + (sr() - 0.5) * fx.depth, k = 0.95 + sr() * 0.2;
      const len = 6 + sr() * 22, wdt = 0.12 + sr() * 0.3, br = 0.08 + sr() * 0.22;
      if (!ev || post >= 0 || fx.follow) { streaks.set(i, 0, -999, 0, 0, 0); continue; }
      let x = (x0 + V * tau * k) % fx.span; x = fx.x - fx.span / 2 + x;
      // screen-space angle of world +x at this point
      tmpP.set(x, y, z); const a = project(tmpP, cam); tmpP.x += 5; const b = project(tmpP, cam);
      const ang = Math.atan2(-(b.y - a.y), b.x - a.x);
      const fade = smooth(0, 0.02, tau) * (0.4 + 0.6 * smooth(0, 0.15, tau));
      streaks.set(i, x, y, z, wdt, br * fade, 1.0, 0.9, 0.75, ang, len / wdt);
    }
    streaks.commit();
    // dust sheet (sunlit, warm), grows with time; settles after restart
    const dr2 = rng(55);
    for (let i = 0; i < dust.n; i++) {
      const x0 = dr2() * fx.span, h0 = Math.pow(dr2(), 1.8), z = fx.z + (dr2() - 0.5) * fx.depth * 1.2, k = 0.55 + dr2() * 0.4;
      const sz = (fx.follow ? 0.8 : 2) + dr2() * (fx.follow ? 3 : 8), a0 = (0.03 + dr2() * 0.12) * (fx.follow ? 0.5 : 1), col = 0.85 + dr2() * 0.15, rot = dr2() * 6;
      if (!ev) { dust.set(i, 0, -999, 0, 0, 0); continue; }
      const tl = Math.min(tau, 1) + (post >= 0 ? post / SLOW * 0.15 : 0);
      let x = (x0 + V * tl * k) % fx.span; x = fx.x - fx.span / 2 + x;
      const hh = 0.3 + h0 * (1.5 + 13 * smooth(0, 0.8, tau));
      const birth = smooth(0.002, 0.06 + h0 * 0.2, tau);
      const settle = post >= 0 ? 1 - smooth(1.5, 6, post) * 0.6 : 1;
      dust.set(i, x, hh - (post >= 0 ? post * 0.3 : 0), z, sz * (1 + tau * 0.8 + (post >= 0 ? post * 0.25 : 0)), a0 * birth * settle, 0.93 * col, 0.78 * col, 0.6 * col, rot);
    }
    dust.commit();
    // leaves / paper bits
    const lr = rng(33);
    for (let i = 0; i < leaves.n; i++) {
      const x0 = lr() * fx.span, y0 = 1 + Math.pow(lr(), 1.5) * 18, z = fx.z + (lr() - 0.5) * fx.depth, k = 0.9 + lr() * 0.12;
      const g = lr(); const paper = g < 0.15;
      if (!ev || post >= 0) { leaves.set(i, 0, -999, 0, 0, 0); continue; }
      let x = (x0 + V * tau * k) % fx.span; x = fx.x - fx.span / 2 + x;
      const y = y0 + Math.sin(tau * 40 + i) * 0.6;
      leaves.set(i, x, y, z, paper ? 0.35 : 0.22, smooth(0.005, 0.03, tau) * 0.95, paper ? 0.95 : 0.25 + g * 0.2, paper ? 0.93 : 0.45 + g * 0.2, paper ? 0.88 : 0.12, tau * 50 + i, paper ? 1.4 : 1.8);
    }
    leaves.commit();
    // debris chunks
    debrisSeeds.forEach((d, i) => {
      const tt = tau - d.t0;
      if (!ev || tt <= 0) { mm.makeScale(0.0001, 0.0001, 0.0001); debris.setMatrixAt(i, mm); return; }
      const x = d.ox + d.vx * tt, y = Math.max(d.s / 2, d.oy + d.vy * tt - 4.9 * tt * tt), z = d.oz + d.vz * tt;
      tmpE.set(d.rx * tt, 0, d.rz * tt); tmpQ.setFromEuler(tmpE); tmpS.setScalar(d.s); tmpP.set(x, y, z); mm.compose(tmpP, tmpQ, tmpS); debris.setMatrixAt(i, mm);
    });
    debris.instanceMatrix.needsUpdate = true;
    // sparks + dust where the tower's legs tear away (Eiffel at z=-200, legs at +-49.5)
    const spr = rng(404);
    for (let i = 0; i < sparks.n; i++) {
      const leg = i % 4, sx = leg & 1 ? 1 : -1, sz = leg & 2 ? 1 : -1;
      const ox = sx * 49.5 + (spr() - 0.5) * 22, oy = 5 + spr() * 4, oz = -200 + sz * 49.5 + (spr() - 0.5) * 22;
      const tb = spr() * 0.16, life = 0.04 + spr() * 0.12, vx = V * (0.15 + spr() * 0.8), vy = 6 + spr() * 40, vz = (spr() - 0.5) * 50;
      const tt = tau - tb;
      if (!ev || post >= 0 || tt < 0 || tt > life) { sparks.set(i, 0, -999, 0, 0, 0); continue; }
      const x = ox + vx * tt, y = oy + vy * tt - 4.9 * tt * tt, z = oz + vz * tt;
      tmpP.set(x, y, z); const a = project(tmpP, cam); tmpP.set(x + vx * 0.01, y + (vy - 9.8 * tt) * 0.01, z + vz * 0.01); const b = project(tmpP, cam);
      const ang = Math.atan2(-(b.y - a.y), b.x - a.x); const f = 1 - tt / life;
      sparks.set(i, x, y, z, 0.35, 1.6 * f, 1.0, 0.62, 0.25, ang, 6);
    }
    sparks.commit();
    const ldr = rng(505);
    for (let i = 0; i < legDust.n; i++) {
      const leg = i % 4, sx = leg & 1 ? 1 : -1, sz = leg & 2 ? 1 : -1;
      const ox = sx * 49.5 + (ldr() - 0.5) * 26, oz = -200 + sz * 49.5 + (ldr() - 0.5) * 26;
      const tb = ldr() * 0.3, k = 0.2 + ldr() * 0.75, up = 2 + ldr() * 14, sz0 = 3 + ldr() * 7;
      const tt = tau - tb;
      if (!ev || tt < 0) { legDust.set(i, 0, -999, 0, 0, 0); continue; }
      const x = ox + V * k * tt, y = 1 + up * Math.min(1, tt * 4), z = oz;
      const settle = post >= 0 ? 1 - smooth(1, 5, post) * 0.5 : 1;
      legDust.set(i, x, y, z, sz0 * (1 + tt * 6), 0.32 * smooth(0, 0.02, tt) * (1 - smooth(0.25, 0.9, tt) * 0.7) * settle, 0.9, 0.78, 0.62, ldr() * 6);
    }
    legDust.commit();
  }
  return { scene, update, setShadow, sky, actors };
}

// =====================================================================
// GLOBE
// =====================================================================
function buildGlobeScene(tex) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  scene.add(makeStars(5000, 900, 4));
  const g = makeGlobe(tex); scene.add(g.group);
  const eq = latCircle(0, 1.004, '#ffffff', 0.55), par = latCircle(48.86, 1.004, '#ffb547', 0.95);
  g.spin.add(eq, par);
  const parisPos = latLon(48.86, 2.29, 1.0);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd38a' }));
  marker.position.copy(parisPos); g.spin.add(marker);
  // ocean flow particles (Atlantic) for the event shot
  const flow = new Puffs(1400, { map: streakTex(), additive: true, renderOrder: 8 });
  scene.add(flow.mesh);
  const coastHit = new Puffs(700, { additive: true, renderOrder: 9 });
  scene.add(coastHit.mesh);
  return { scene, g, eq, par, marker, parisPos, flow, coastHit };
}

// ocean mask from the day texture (for Atlantic flow particles + coastlines)
function oceanSampler(img) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, 1024, 512);
  const d = g.getImageData(0, 0, 1024, 512).data;
  return (lat, lon) => {
    const u = ((lon + 180) / 360) * 1024, v = ((90 - lat) / 180) * 512;
    const i = (Math.floor(v) * 1024 + (Math.floor(u) % 1024)) * 4;
    const R = d[i], G = d[i + 1], B = d[i + 2];
    return B > R * 1.3 + 4 && B + 6 >= G;
  };
}

// =====================================================================
// PLANE + TRAMPOLINE
// =====================================================================
function buildPlaneScene() {
  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(-0.9, 0.12, -0.35).normalize();
  scene.fog = new THREE.Fog('#f0c49a', 600, 6000);
  scene.add(makeSky({ sunDir, zenith: '#1d3e76', horizon: '#f6c08e', below: '#f3d2b0', sunCol: '#ffd7a8', sunSize: 0.0009 }));
  scene.add(new THREE.HemisphereLight('#c9dbff', '#f0c8a0', 1.1));
  const sun = new THREE.DirectionalLight('#ffd8b0', 3.2); sun.position.copy(sunDir).multiplyScalar(500); scene.add(sun);
  const plane = makeAirliner(); scene.add(plane);
  const clouds = new Puffs(700, { fogColor: '#f0c49a', fogNear: 600, fogFar: 6000 });
  scene.add(clouds.mesh);
  const cr = rng(8);
  for (let i = 0; i < clouds.n; i++) {
    const x = (cr() - 0.5) * 3000, z = -200 - cr() * 2600, y = -180 - cr() * 120; const b = 0.92 + cr() * 0.08;
    clouds.set(i, x, y, z, 60 + cr() * 160, 0.35 + cr() * 0.4, b, b * 0.93, b * 0.88, cr() * 6);
  }
  clouds.commit();
  return { scene, plane };
}

function buildTrampScene() {
  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(-0.9, 0.2, -0.38).normalize();
  scene.fog = new THREE.Fog('#e6b58a', 120, 1400);
  scene.add(makeSky({ sunDir, zenith: '#2f548c', horizon: '#f2b27a', below: '#9a7c62', sunCol: '#ffd29a', sunSize: 0.0010 }));
  scene.add(new THREE.HemisphereLight('#c3d6ff', '#7a6446', 0.9));
  const sun = new THREE.DirectionalLight('#ffd3a2', 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 600 }); sun.shadow.normalBias = 0.3;
  scene.add(sun, sun.target);
  const gt = grassTex(); gt.repeat.set(400, 400);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const r = rng(12);
  // scattered ground features that make the rushing ground readable
  const fG = new THREE.IcosahedronGeometry(0.4, 0);
  const tufts = new THREE.InstancedMesh(fG, new THREE.MeshStandardMaterial({ color: '#4c7a31', roughness: 1, flatShading: true }), 2600);
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), 1600);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 2600; i++) { m.compose(new THREE.Vector3(-80 + r() * 520, 0.05, -25 + r() * 40), new THREE.Quaternion(), new THREE.Vector3(1 + r(), 0.4 + r() * 0.5, 1 + r())); tufts.setMatrixAt(i, m); }
  const fc = ['#ffffff', '#ffd23f', '#e85d75', '#b8a1ff'];
  for (let i = 0; i < 1600; i++) { m.makeTranslation(-80 + r() * 520, 0.18, -25 + r() * 40); fl.setMatrixAt(i, m); fl.setColorAt(i, new THREE.Color(fc[Math.floor(r() * 4)])); }
  tufts.receiveShadow = true; scene.add(tufts, fl);
  // fence posts + a few trees + houses in the distance
  const postG = new THREE.BoxGeometry(0.15, 1.1, 0.15); postG.translate(0, 0.55, 0);
  const posts = new THREE.InstancedMesh(postG, new THREE.MeshStandardMaterial({ color: '#8b6b4a', roughness: 1 }), 180);
  for (let i = 0; i < 180; i++) { m.makeTranslation(-60 + i * 3, 0, -14); posts.setMatrixAt(i, m); }
  posts.castShadow = true; scene.add(posts);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(540, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: '#8b6b4a' })); rail.position.set(210, 0.9, -14); scene.add(rail);
  const tl = []; for (let i = 0; i < 70; i++) tl.push({ x: -100 + r() * 600, z: -30 - r() * 60, h: 8 + r() * 6 });
  const trees = new Trees(tl, 4); scene.add(trees.group);
  const tramp = makeTrampoline(); tramp.position.set(0, 0, 0); scene.add(tramp);
  const kid = makePerson(r, 'stand', 0.72); scene.add(kid);
  kid.userData.torso.children[0].material = new THREE.MeshStandardMaterial({ color: '#e8452c', roughness: 0.8, flatShading: true });
  kid.userData.arms.forEach((a) => { a.children[0].material = kid.userData.torso.children[0].material; });
  const puffs = new Puffs(60, {}); scene.add(puffs.mesh);
  for (let i = 0; i < 12; i++) {
    const h = makeBuilding(12 + r() * 10, 10, 9 + r() * 4, r); h.root.position.set(-150 + i * 60 + r() * 20, 0, -260 - r() * 80); scene.add(h.root);
  }
  return { scene, kid, tramp, sun, puffs };
}

// =====================================================================
// MAIN
// =====================================================================
export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  const [day, night, clouds] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false)]);
  const paris = buildParis();
  const globe = buildGlobeScene({ day, night, clouds });
  const isOcean = oceanSampler(day.image);
  const planeS = buildPlaneScene();
  const tramp = buildTrampScene();
  const endScene = new THREE.Scene(); endScene.background = new THREE.Color('#0d0e11');

  const cam = new THREE.PerspectiveCamera(50, W / H, 0.5, 12000);
  const gcam = new THREE.PerspectiveCamera(32, W / H, 0.01, 2000);

  // ---- Atlantic flow seeds ----
  const fr = rng(31); const flowSeeds = [];
  while (flowSeeds.length < globe.flow.n) {
    const lat = -35 + fr() * 95, lon = -80 + fr() * 85;
    if (isOcean(lat, lon)) flowSeeds.push({ lat, lon, k: 0.6 + fr() * 0.8, ph: fr() });
  }
  const coastE = [], coastW = [];
  for (let lat = -34; lat <= 60; lat += 0.5) {
    // first land east of mid-Atlantic = west-facing coast (water slams in)
    for (let lon = -30; lon < 25; lon += 0.25) { if (!isOcean(lat, lon)) { if (lon > -26) coastE.push([lat, lon]); break; } }
    for (let lon = -30; lon > -100; lon -= 0.25) { if (!isOcean(lat, lon)) { if (lon < -34) coastW.push([lat, lon]); break; } }
  }

  // ---- shots ----
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const camLook = (c, pos, look, fov = 50) => { c.position.copy(pos); c.fov = fov; c.updateProjectionMatrix(); c.lookAt(look); };
  const kidAt = (tau) => {
    // jump: airtime 1.6 s, takeoff 0.25 s before the stop; horizontal drift only while ground is stopped
    const s = tau + 0.25; const v0 = 7.35; let y = 0.8 + v0 * s - 4.9 * s * s;
    const x = V * clamp(tau, 0, 1);
    return { x, y: Math.max(0, y) };
  };
  const shots = [
    { t0: 0, t1: 3.4, scene: 'paris', focus: { x: 0, z: 120, span: 300, depth: 200 },
      cam: (t, k) => camLook(cam, P(lerp(10, 6, k), lerp(11, 10, k), lerp(345, 318, k)), P(0, 112, -200), 50), shadow: [0, 0, 60, 300] },
    { t0: 3.4, t1: 8.6, scene: 'paris', focus: { x: 0, z: 120, span: 300, depth: 200 },
      cam: (t, k) => camLook(cam, P(lerp(-9.5, -8.5, k), lerp(2.0, 2.3, k), lerp(138.5, 136.5, k)), P(lerp(-5.5, -4.5, k), lerp(20, 22, k), -150), 50), shadow: [-10, 0, 100, 160] },
    { t0: 8.6, t1: 13.5, scene: 'globe', mode: 'spin' },
    { t0: 13.5, t1: 16.9, scene: 'paris', focus: { x: 0, z: 125, span: 280, depth: 120 },
      cam: (t, k) => camLook(cam, P(lerp(-3, -1, k), lerp(5.5, 6, k), lerp(162, 156, k)), P(6, 30, -160), 50), shadow: [10, 0, 80, 170] },
    { t0: 16.9, t1: 20.6, scene: 'paris', focus: null,
      cam: (t, k) => { const tau = tauOf(t); const gx = slide(tau) - 6; camLook(cam, P(gx - 5.5, 1.15, 131.0), P(gx + 1.5, 0.75, 125.5), 46); }, shadow: 'follow' },
    { t0: 20.6, t1: 24.4, scene: 'paris', focus: { x: 40, z: -90, span: 300, depth: 120 },
      cam: (t, k) => camLook(cam, P(lerp(30, 40, k), lerp(7, 9, k), lerp(-38, -48, k)), P(lerp(36, 46, k), 40, -200), 50), shadow: [40, 0, -180, 160] },
    { t0: 24.4, t1: 30.2, scene: 'paris', focus: { x: -30, z: 120, span: 360, depth: 220 },
      cam: (t, k) => camLook(cam, P(lerp(-212, -204, k), lerp(78, 74, k), lerp(232, 224, k)), P(lerp(-112, -104, k), 0, 30), 50), shadow: [-120, 0, 60, 220] },
    { t0: 30.2, t1: 35.0, scene: 'globe', mode: 'atlantic' },
    { t0: 35.0, t1: 39.4, scene: 'tramp', mode: 'fly' },
    { t0: 39.4, t1: 43.5, scene: 'plane' },
    { t0: 43.5, t1: 48.6, scene: 'paris', focus: { x: 280, z: 80, span: 600, depth: 400 },
      cam: (t, k) => camLook(cam, P(lerp(232, 240, k), 26, lerp(430, 418, k)), P(300, 112, -200), 50), shadow: [250, 0, -100, 300] },
    { t0: 48.6, t1: 51.6, scene: 'tramp', mode: 'land' },
    { t0: 51.6, t1: 56.0, scene: 'globe', mode: 'late' },
    { t0: 56.0, t1: DUR + 1, scene: 'end' },
  ];

  const gradeFor = { paris: { sat: 1.06, tint: [1.03, 1.0, 0.96], bloom: [0.32, 0.5, 0.92], exp: 1.0 }, globe: { sat: 1.08, tint: [1, 1, 1.02], bloom: [0.45, 0.5, 0.78], exp: 1.0 },
    plane: { sat: 1.05, tint: [1.02, 1.0, 0.98], bloom: [0.35, 0.5, 0.9], exp: 1.0 }, tramp: { sat: 1.06, tint: [1.03, 1.0, 0.96], bloom: [0.3, 0.5, 0.92], exp: 1.0 }, end: { sat: 1, tint: [1, 1, 1], bloom: [0, 0, 1], exp: 1 } };

  function frame(t, opts = {}) {
    const shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
    const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
    const tau = tauOf(t);
    const post = t >= T_RESTART ? t - T_RESTART : -1;
    const st = { tag: 'WHAT IF &nbsp;·&nbsp; 01', tagA: 1, labels: [] };
    let scene, camera = cam;

    if (shot.scene === 'paris') {
      shot.cam(t, k);
      cam.updateMatrixWorld();
      if (shot.shadow === 'follow') { paris.setShadow(slide(tau) - 6, 0, 126, 45); }
      else if (shot.shadow === 'tower') { paris.setShadow(slide(tau) * 0.6, 0, -120, 260); }
      else paris.setShadow(...shot.shadow);
      const fo = typeof shot.focus === 'function' ? shot.focus(tau) : shot.focus;
      paris.update(t, cam, fo || { x: slide(tau) - 6, z: 126, span: 120, depth: 50, follow: true });
      scene = paris.scene;
    } else if (shot.scene === 'globe') {
      scene = globe.scene; camera = gcam;
      const G = globe.g;
      if (shot.mode === 'spin' || shot.mode === 'late') {
        // time-lapse spin, Paris drifting across the visible face
        const base = shot.mode === 'spin' ? -2.15 : -1.75;
        const ang = base + (t - shot.t0) * 0.16;
        G.spin.rotation.y = ang; G.cloudSpin.rotation.y = ang * 1.0;
        G.earthMat.uniforms.uSun.value.set(-0.8, 0.3, 0.55).normalize(); G.earthMat.uniforms.uSpec.value = 0.7;
        const d = shot.mode === 'spin' ? lerp(7.6, 6.8, easeInOut(k)) : lerp(6.8, 7.4, easeInOut(k));
        gcam.position.set(0, d * 0.22, d); gcam.fov = 30; gcam.updateProjectionMatrix(); gcam.lookAt(0, 0.12, 0);
        globe.eq.visible = globe.par.visible = globe.marker.visible = true;
        globe.flow.mesh.visible = globe.coastHit.mesh.visible = false;
        gcam.updateMatrixWorld(); G.group.updateMatrixWorld(true);
        // labels
        const wp = (lat, lon) => latLon(lat, lon, 1.0).applyMatrix4(G.spin.matrixWorld);
        const vis = (p) => p.clone().normalize().dot(gcam.position.clone().sub(p).normalize()) > 0.15;
        const pp = globe.marker.getWorldPosition(new THREE.Vector3());
        if (vis(pp)) { const s = project(pp, gcam); st.labels.push({ x: s.x + 22, y: s.y - 2, a: smooth(shot.t0 + 0.3, shot.t0 + 0.8, t), html: 'PARIS &nbsp;<b>1,104 KM/H</b>', cls: 'lbl-r' }); }
        // equator label at the near-right limb
        const eqLon = -((ang + Math.PI) * 180 / Math.PI) + 0; // facing longitude ~ camera direction
        let best = null, bz = -9; for (let lon = -180; lon < 180; lon += 2) { const p = wp(0, lon); const z = p.clone().applyMatrix4(gcam.matrixWorldInverse).z; if (z > bz) { bz = z; best = project(p, gcam); } }
        if (best) st.labels.push({ x: best.x + 40, y: best.y + 30, a: smooth(shot.t0 + 0.6, shot.t0 + 1.1, t), html: 'EQUATOR &nbsp;<b>1,674 KM/H</b>', cls: 'lbl', });
        const np = project(P(0, 1.0, 0).applyMatrix4(G.group.matrixWorld), gcam);
        st.labels.push({ x: np.x, y: np.y - 34, a: smooth(shot.t0 + 0.9, shot.t0 + 1.4, t), html: 'NORTH POLE &nbsp;<b>0 KM/H</b>' });
        if (shot.mode === 'late') st.labels = st.labels.map((l) => ({ ...l, a: l.a * (1 - smooth(shot.t0 + 1.5, shot.t0 + 2.2, t)) }));
      } else {
        // Atlantic, surface stopped
        const lat0 = 30, lon0 = -38;
        const p = latLon(lat0, lon0, 1);
        const yaw = Math.atan2(p.x, p.z);
        G.spin.rotation.y = -yaw; G.cloudSpin.rotation.y = -yaw;
        G.earthMat.uniforms.uSun.value.set(-0.55, 0.5, 0.65).normalize(); G.earthMat.uniforms.uSpec.value = 0.25;
        const dist = lerp(4.5, 4.15, easeInOut(k));
        const el = (lat0 + 4) * Math.PI / 180;
        gcam.position.set(0, Math.sin(el) * dist, Math.cos(el) * dist); gcam.fov = 34; gcam.updateProjectionMatrix(); gcam.lookAt(0, 0.33, 0.45);
        globe.eq.visible = globe.par.visible = globe.marker.visible = false;
        globe.flow.mesh.visible = globe.coastHit.mesh.visible = true;
        gcam.updateMatrixWorld(); G.group.updateMatrixWorld(true);
        const M = G.spin.matrixWorld; const q = new THREE.Vector3(), q2 = new THREE.Vector3();
        const lt = t - shot.t0;
        flowSeeds.forEach((f, i) => {
          const span = 14; const lon = f.lon + ((lt * 4.2 * f.k + f.ph * span) % span) - span / 2;
          if (!isOcean(f.lat, lon)) { globe.flow.set(i, 0, 0, 0, 0, 0); return; }
          q.copy(latLon(f.lat, lon, 1.006)).applyMatrix4(M); q2.copy(latLon(f.lat, lon + 1, 1.006)).applyMatrix4(M);
          const a = project(q, gcam), b = project(q2, gcam); const ang = Math.atan2(-(b.y - a.y), b.x - a.x);
          const fade = Math.sin(((lt * 4.2 * f.k + f.ph * span) % span) / span * Math.PI);
          globe.flow.set(i, q.x, q.y, q.z, 0.005, 0.85 * fade * smooth(0, 0.6, lt), 0.6, 0.85, 1.0, ang, 10);
        });
        globe.flow.commit();
        const hitA = smooth(1.9, 2.8, lt), recA = smooth(0.2, 1.0, lt);
        let i = 0;
        for (const [la, lo] of coastE) { if (i >= globe.coastHit.n) break; q.copy(latLon(la, lo, 1.007)).applyMatrix4(M); const pulse = 0.6 + 0.4 * Math.sin(lt * 9 + la); globe.coastHit.set(i++, q.x, q.y, q.z, 0.022, hitA * pulse * 0.9, 1.0, 0.62, 0.22); }
        for (const [la, lo] of coastW) { if (i >= globe.coastHit.n) break; q.copy(latLon(la, lo, 1.007)).applyMatrix4(M); globe.coastHit.set(i++, q.x, q.y, q.z, 0.016, recA * 0.6, 0.45, 0.75, 1.0); }
        for (; i < globe.coastHit.n; i++) globe.coastHit.set(i, 0, 0, 0, 0, 0);
        globe.coastHit.commit();
        const ny = project(latLon(40.7, -74.0, 1).applyMatrix4(M), gcam), fr2 = project(latLon(46.5, -1.5, 1).applyMatrix4(M), gcam);
        st.labels.push({ x: ny.x - 6, y: ny.y + 44, a: recA, html: 'NEW YORK' });
        st.labels.push({ x: fr2.x - 10, y: fr2.y - 40, a: hitA, html: '<b>FRANCE</b>' });
      }
    } else if (shot.scene === 'plane') {
      scene = planeS.scene;
      const lt = t - shot.t0;
      planeS.plane.position.set(lt * 1.2, Math.sin(lt * 0.7) * 0.3, 0); planeS.plane.rotation.set(0.0, 0, Math.sin(lt * 0.5) * 0.01);
      camLook(cam, P(lerp(-62, -54, k) + lt * 1.2, lerp(-24, -20, k), lerp(34, 26, k)), P(lt * 1.2 + 4, 2, 0), 46);
    } else if (shot.scene === 'tramp') {
      scene = tramp.scene;
      let tauK;
      if (shot.mode === 'fly') tauK = tau; else tauK = 1 + (t - shot.t0) * 0.25; // landing in 4x slow motion
      const kp = kidAt(tauK);
      const kid = tramp.kid;
      kid.position.set(kp.x, kp.y, 0); kid.rotation.set(0, Math.PI / 2 - 0.3, 0);
      const air = kp.y > 0.01;
      const arms = kid.userData.arms, legs = kid.userData.legs;
      const up = air ? 1 : 0;
      arms[0].rotation.set(0, 0, 2.3 * up + 0.2); arms[1].rotation.set(0, 0, -2.3 * up - 0.2);
      legs[0].rotation.set(air ? 0.35 : 0, 0, air ? 0.18 : 0); legs[1].rotation.set(air ? -0.25 : 0, 0, air ? -0.18 : 0);
      if (!air && shot.mode === 'land') { arms[0].rotation.z = 2.6; arms[1].rotation.z = -2.6; }
      const lx = kp.x;
      if (shot.mode === 'fly') camLook(cam, P(lx - 1.7, 0.55, 5.6), P(lx - 1.1, kp.y + 0.2, 0), 52);
      else camLook(cam, P(lx + 3.6, 1.25, 5.4), P(lx - 0.3, 0.75, 0), 46);
      tramp.sun.target.position.set(lx, 0, 0); tramp.sun.position.set(lx - 300, 120, -120); tramp.sun.shadow.camera.updateProjectionMatrix();
      // landing puff
      for (let i = 0; i < tramp.puffs.n; i++) tramp.puffs.set(i, 0, -99, 0, 0, 0);
      if (shot.mode === 'land') {
        const landT = 0; const lt = t - shot.t0;
        const pr = rng(4);
        const tl = (kidAt(1.352).y <= 0) ? lt - 1.5 * 0 : lt;
        const touch = (1.352 - 1) / 0.25; // seconds into the shot when kid touches down
        const s = lt - touch;
        if (s > 0) for (let i = 0; i < tramp.puffs.n; i++) { const a = pr() * 6.28; const rr = s * (0.6 + pr() * 1.4); tramp.puffs.set(i, kp.x + Math.cos(a) * rr, 0.2 + pr() * 0.4 * s, Math.sin(a) * rr * 0.5, 0.5 + s * 0.9, 0.35 * (1 - smooth(0, 2.5, s)), 0.82, 0.72, 0.55, pr() * 6); }
      }
      tramp.puffs.commit();
    } else {
      scene = endScene;
    }

    // ---- HUD ----
    if (t < T_STOP) {
      st.hud = { a: smooth(3.3, 3.8, t), lab: 'Earth stops in', val: timer(T_STOP - t), sub: 'Paris &nbsp;·&nbsp; 48.86° N', sub2: t > 5.9 && t < 8.6 ? 'Ground speed &nbsp;1,104 km/h' : '' };
    } else if (t < T_RESTART) {
      const subs = { 3: 'East →', 4: 'Thrown east at 1,104 km/h', 5: `Tower moved &nbsp;${Math.round(V * tau)} m east`, 6: 'Wind &nbsp;1,104 km/h', 7: 'Oceans keep moving', 8: `Distance travelled &nbsp;${Math.round(V * tau)} m`, 9: 'Airspeed &nbsp;unchanged' };
      const si = shots.indexOf(shot);
      st.hud = { a: 1, lab: 'Earth spins again in', val: timer(1 - tau), sub: 'Time slowed down 30×', sub2: subs[si] || '' };
    } else if (t < 51.6) {
      const si = shots.indexOf(shot);
      st.hud = { a: 1, lab: 'Earth', val: 'SPINNING', sub: 'Again', sub2: si === 11 ? 'Landed 307 m away' : '' };
    } else if (t < 56) {
      st.hud = { a: 1, lab: 'Leap second', val: '23:59:60', sub: 'Earth is 1 s behind', sub2: '' };
    }
    // title + captions + end
    if (t < 3.4) st.title = { html: TITLE, a: Math.min(smooth(0.0, 0.35, t), 1 - smooth(3.0, 3.35, t)), k: smooth(0, 0.6, t) };
    const c = captionAt(CAPTIONS, t); if (c) st.caption = c;
    if (t >= 56) { st.end = { a: smooth(56, 56.35, t), title: TITLE, note: ENDNOTE }; st.hud = null; }
    if (opts.cover) { st.title = { html: TITLE, a: 1, k: 1 }; st.caption = null; st.hud = null; st.labels = []; }

    // ---- grade / fx ----
    const gr = gradeFor[shot.scene] || gradeFor.paris;
    R.bloom.strength = gr.bloom[0]; R.bloom.radius = gr.bloom[1]; R.bloom.threshold = gr.bloom[2];
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uSat.value = gr.sat; U.uTint.value.set(...gr.tint);
    let flash = 0, shake = 0;
    if (t >= T_STOP) { const d = t - T_STOP; flash = Math.exp(-d * 5.5) * 0.85; shake = Math.exp(-d * 2.2) * 0.006; }
    if (t >= T_RESTART) { const d = t - T_RESTART; flash = Math.max(flash, Math.exp(-d * 5) * 0.8); shake = Math.max(shake, Math.exp(-d * 1.8) * 0.007); }
    if (t >= T_STOP && t < T_RESTART) shake += 0.0006; // constant rumble during the stop
    U.uFadeWhite.value = flash;
    const sr = rng(Math.floor(t * 30) + 1);
    U.uShake.value.set((sr() - 0.5) * shake, (sr() - 0.5) * shake * 0.7);
    U.uFade.value = 0;
    U.uVignette.value = shot.scene === 'globe' ? 0.35 : 0.5;

    R.renderPass.scene = scene; R.renderPass.camera = camera;
    R.composer.render();
    ov.apply(st);
  }
  return { duration: DUR, fps: 30, frame, cues };
}
