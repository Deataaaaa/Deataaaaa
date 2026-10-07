// DAY 3 — What if your plane's window broke at 11,000 m?
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeIn, easeOut, project, W, H } from '../engine/core.js';
import { Puffs, streakTex } from '../engine/assets.js';
import { loadMannequin, cloneMannequin, offsetBone, twoBoneIK, cloneHuman, makeRetarget, TEX_PENDING } from '../engine/elevator.js';
import { makeCabin, makeOutside, makeWing, makePassenger, makeMask, windowAssembly, cabinMaterials, WIN } from '../engine/cabin.js';

// ---------- script: every caption passes the reading rule (render.mjs checks it) ----------
const CAPTIONS = [
  [3.8, 7.4, 'You’re cruising at 11,000 meters.'],
  [7.52, 12.79, 'Outside, it’s −56 °C. The air is too thin to breathe.'],
  [12.91, 18.01, 'Your window is holding back half a ton of pressure.'],
  [18.13, 21.18, 'Then it breaks.'],
  [21.3, 25.82, 'In a split second, the cabin fills with fog.'],
  [25.94, 28.99, 'The masks drop.'],
  [29.11, 34.88, 'You have 15 to 30 seconds before you stop thinking clearly.'],
  [35.0, 39.35, 'That’s why you put your own mask on first.'],
  [39.47, 43.82, 'But this almost never happens. Here’s why.'],
  [43.94, 47.71, 'Airplane windows have three layers.'],
  [47.83, 52.51, 'If the outer one breaks, the middle one holds.'],
  [52.63, 57.56, 'That tiny hole keeps the middle layer as a spare.'],
  [57.68, 63.53, 'And if pressure is lost, pilots dive to air you can breathe.'],
  [63.65, 69.0, 'In 1990, a pilot was sucked halfway out of his window.'],
  [69.12, 74.3, 'His crew held on to him for 20 minutes. He survived.'],
  [74.42, 79.1, 'So on your next flight… keep your seatbelt on.'],
];
const TITLE = 'What if your plane’s <span class="k">window</span> broke at 11,000 m?';
const ENDNOTE = 'Cruise: 11,000 m · −56 °C · ≈ 500 kg on every window<br>3 layers: the middle pane is the spare';
const DUR = 83.4;
const T_CRACK = 16.3, T_BRK = 18.2, T_FRZ = 39.41, T_REW_END = 43.88;
const RED = '#ff3b30';

// seconds of real time since the window broke (slow motion in shots E and F)
function ecOf(te) {
  if (te < T_BRK) return te - T_BRK;
  if (te < 21.24) return (te - T_BRK) / 6;
  if (te < 25.88) return (21.24 - T_BRK) / 6 + (te - 21.24) / 2;
  return (21.24 - T_BRK) / 6 + (25.88 - 21.24) / 2 + (te - 25.88);
}
// effective time of the cabin events (freeze + rewind in shot J; calm cabin afterwards)
function teOf(t) {
  if (t < T_FRZ) return t;
  if (t < T_FRZ + 0.8) return T_FRZ;
  if (t < T_REW_END) return lerp(T_FRZ, 12.0, easeInOut((t - T_FRZ - 0.8) / (T_REW_END - T_FRZ - 0.8)));
  return 10.0;
}
function timer(sec) { const s = Math.max(0, sec); return `0:${String(Math.floor(s)).padStart(2, '0')}`; }

// branching crack pattern (segments in pane-local metres), grown with a 0..1 fraction
function crackSegments(seed, cx, cy, size) {
  const r = rng(seed), segs = [];
  const grow = (x, y, a, len, depth, t0) => {
    let px = x, py = y, t = t0;
    const n = 6 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      a += (r() - 0.5) * 0.7; const l = len / n * (0.6 + r() * 0.8);
      const nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l; segs.push([px, py, nx, ny, t]); t += 1 / (n * (depth + 1.5));
      if (depth < 2 && r() < 0.28) grow(nx, ny, a + (r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.6), len * 0.55, depth + 1, t);
      px = nx; py = ny;
    }
  };
  for (let k = 0; k < 7; k++) grow(cx, cy, (k / 7) * Math.PI * 2 + r() * 0.5, size * (0.6 + r() * 0.6), 0, 0);
  for (let k = 0; k < 3; k++) { const rr = size * (0.12 + k * 0.1); const n = 10; for (let i = 0; i < n; i++) { const a0 = (i / n) * 6.283, a1 = ((i + 1) / n) * 6.283; if (r() < 0.6) segs.push([cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr, 0.35 + k * 0.18]); } }
  const tmax = Math.max(...segs.map((s) => s[4])); segs.forEach((s) => { s[4] /= tmax; });
  return segs;
}
function drawCrack(ctx, segs, frac, w, h, sx, sy) {
  ctx.clearRect(0, 0, w, h); ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1, t] of segs) {
    if (t > frac) continue; const k = clamp((frac - t) * 6);
    ctx.strokeStyle = `rgba(255,255,255,${0.75 * k})`; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(w / 2 + x0 * sx, h / 2 - y0 * sy); ctx.lineTo(w / 2 + (x0 + (x1 - x0) * k) * sx, h / 2 - (y0 + (y1 - y0) * k) * sy); ctx.stroke();
  }
}

export async function create() {
  RectAreaLightUniformsLib.init();
  const R = createRenderer();
  const ov = new Overlay();
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 80);
  const farCam = new THREE.PerspectiveCamera(50, W / H, 0.5, 300000);
  const UP = new THREE.Vector3(0, 1, 0);
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const look = (pos, tgt, fov = 50, roll = 0) => { cam.up.copy(UP); cam.position.copy(pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(tgt); if (roll) cam.rotateZ(roll); cam.updateMatrixWorld(); };

  // ================= outside (rendered first, behind the cabin) =================
  const outside = makeOutside();
  const outScene = new THREE.Scene(); outScene.add(outside.group);
  const wing = makeWing(); outScene.add(wing.group);
  wing.group.position.set(-2.05, -0.62, -1.7); wing.holder.rotation.set(0, -Math.PI / 2, 0); wing.group.rotation.z = 0.07;
  const outSun = new THREE.DirectionalLight('#fff4e2', 3.2); outSun.position.set(-8, 7, -6); outScene.add(outSun);
  outScene.add(new THREE.HemisphereLight('#bcd4f2', '#e8ecf2', 1.1));
  const outPass = new RenderPass(outScene, farCam); R.composer.insertPass(outPass, 0);

  // ================= cabin =================
  const scene = new THREE.Scene(); scene.background = null;
  const cab = makeCabin({ rowsAhead: 8, rowsBehind: 3 });
  scene.add(cab.group);
  const M = cab.M;
  const pm = new THREE.PMREMGenerator(R.renderer); const roomEnv = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = roomEnv; scene.environmentIntensity = 0.28;
  const sun = new THREE.DirectionalLight('#fff1dc', 6.0); sun.position.set(-9, 5.5, -3.5); sun.target.position.set(0, 0.6, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 25 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const wash = new THREE.RectAreaLight('#eef3ff', 1.1, 0.7, 11); wash.position.set(0, 2.2, -2.5); wash.rotation.x = -Math.PI / 2; scene.add(wash);
  const hemi = new THREE.HemisphereLight('#e9eef7', '#4a4f58', 0.12); scene.add(hemi);
  const downs = [-1, 1].map((side) => { const dl = new THREE.RectAreaLight('#f4f7ff', 1.6, 0.18, 11); dl.position.set(side * 1.25, 1.64, -2.5); dl.rotation.x = -Math.PI / 2; scene.add(dl); return dl; });
  cab.windows.forEach((w) => { [w.outer, w.middle, w.inner].forEach((p) => { p.castShadow = false; }); });
  const passengers = [];
  { const pr = rng(808); const taken = [[-1, 'B'], [-1, 'E'], [-2, 'A'], [-2, 'C'], [-2, 'F'], [-3, 'B'], [-3, 'D'], [-3, 'E'], [-4, 'A'], [-4, 'C'], [-4, 'F'], [-5, 'B'], [-5, 'E'], [-6, 'A'], [-6, 'D'], [-6, 'F'], [-7, 'C'], [-7, 'E'], [0, 'D'], [0, 'F'], [1, 'B'], [1, 'E'], [2, 'A'], [2, 'D']];
    for (const [row, col] of taken) { const s0 = cab.seats.find((x) => x.row === row && x.col === col); if (!s0) continue; const p = makePassenger(pr); p.position.set(s0.x + (pr() - 0.5) * 0.04, 0.86, s0.z + 0.13); p.rotation.y = Math.PI + (pr() - 0.5) * 0.4; p.rotation.x = (pr() - 0.5) * 0.08; p.userData.ph = pr() * 6; scene.add(p); passengers.push(p); } }
  // seat-back screens: moving map
  const mapC = document.createElement('canvas'); mapC.width = 320; mapC.height = 200; const mapG = mapC.getContext('2d');
  const mapT = new THREE.CanvasTexture(mapC); mapT.colorSpace = THREE.SRGBColorSpace;
  let mapKey = '';
  const drawMap = (alt, spd, temp) => {
    const key = alt + spd + temp; if (key === mapKey) return; mapKey = key;
    mapG.fillStyle = '#0a1f3d'; mapG.fillRect(0, 0, 320, 200);
    mapG.fillStyle = '#16365e'; mapG.beginPath(); mapG.ellipse(80, 150, 120, 70, 0.2, 0, 7); mapG.fill(); mapG.beginPath(); mapG.ellipse(270, 60, 90, 60, -0.3, 0, 7); mapG.fill();
    mapG.strokeStyle = '#f2f2f2'; mapG.lineWidth = 2; mapG.setLineDash([5, 4]); mapG.beginPath(); mapG.moveTo(30, 170); mapG.quadraticCurveTo(160, 40, 300, 40); mapG.stroke(); mapG.setLineDash([]);
    mapG.fillStyle = '#ffffff'; mapG.beginPath(); mapG.moveTo(168, 88); mapG.lineTo(160, 96); mapG.lineTo(176, 96); mapG.closePath(); mapG.fill();
    mapG.fillStyle = 'rgba(0,0,0,.55)'; mapG.fillRect(0, 0, 320, 34); mapG.fillStyle = '#e8eef6'; mapG.font = '600 15px sans-serif'; mapG.fillText(`${alt}   ${spd}   ${temp}`, 10, 22);
    mapT.needsUpdate = true;
  };
  cab.screens.forEach((s) => { s.material = new THREE.MeshBasicMaterial({ map: mapT, color: new THREE.Color(0.85, 0.85, 0.85) }); });

  // "you": seat 0A (left window)
  const gltf = await loadMannequin();
  const drv = cloneMannequin({ scene: SkeletonUtils.clone(gltf.scene), animations: gltf.animations });
  const me = cloneHuman(await loadMannequin('/engine/models/Michelle.glb'));
  scene.add(me.root);
  const retarget = makeRetarget(drv, me);
  drv.mixer.clipAction(drv.clips.idle).play();
  const seatA = cab.seats.find((s) => s.row === 0 && s.col === 'A');
  const myWin = cab.windows.reduce((b, w) => (w.side < 0 && Math.abs(w.z - (seatA.z - 0.1)) < Math.abs(b.z - (seatA.z - 0.1)) ? w : b), cab.windows.find((w) => w.side < 0));
  myWin.root.updateMatrixWorld(true);
  const winC = new THREE.Vector3(); myWin.group.getWorldPosition(winC);
  const winOut = new THREE.Vector3(0, 0, -1).applyQuaternion(myWin.group.getWorldQuaternion(new THREE.Quaternion())).normalize();   // pointing outside
  // seatbelt across her lap
  const belt = new THREE.Group(); scene.add(belt);
  { const strap = new THREE.MeshStandardMaterial({ color: '#2a3550', roughness: 0.85 });
    const pts = [P(seatA.x - 0.23, 0.5, seatA.z + 0.05), P(seatA.x - 0.16, 0.62, seatA.z - 0.12), P(seatA.x, 0.66, seatA.z - 0.17), P(seatA.x + 0.16, 0.62, seatA.z - 0.12), P(seatA.x + 0.23, 0.5, seatA.z + 0.05)];
    const curve = new THREE.CatmullRomCurve3(pts); const N = 40, pos = [], idx = [];
    for (let i = 0; i <= N; i++) { const p = curve.getPoint(i / N), tg = curve.getTangent(i / N), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3().crossVectors(tg, up).normalize(); const nrm = new THREE.Vector3().crossVectors(side, tg).normalize();
      const a = p.clone().addScaledVector(nrm, 0.024), b = p.clone().addScaledVector(nrm, -0.024); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals();
    belt.add(new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: '#2b3448', roughness: 0.8, side: THREE.DoubleSide })));
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.06, 0.014), new THREE.MeshStandardMaterial({ color: '#b9bec5', metalness: 0.9, roughness: 0.25 })); buckle.position.set(seatA.x, 0.666, seatA.z - 0.182); buckle.rotation.x = -0.35; belt.add(buckle);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.006), new THREE.MeshStandardMaterial({ color: '#d4d8de', metalness: 0.95, roughness: 0.2 })); lever.position.set(seatA.x, 0.672, seatA.z - 0.19); lever.rotation.x = -0.35; belt.add(lever); }

  // my window: crack overlay, shards, debris, wind streaks, fog puffs
  const crackC = document.createElement('canvas'); crackC.width = 512; crackC.height = 700; const crackG = crackC.getContext('2d');
  const crackT = new THREE.CanvasTexture(crackC); crackT.colorSpace = THREE.SRGBColorSpace;
  const crackSegs = crackSegments(31, 0.05, -0.07, 0.26);
  let crackKey = -1;
  const setCrack = (f) => { const q = Math.round(f * 200) / 200; if (q === crackKey) return; crackKey = q; drawCrack(crackG, crackSegs, q, 512, 700, 512 / (WIN.w + 0.03), 700 / (WIN.h + 0.03)); crackT.needsUpdate = true; };
  const crackMesh = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w + 0.03, WIN.h + 0.03), new THREE.MeshBasicMaterial({ map: crackT, transparent: true, depthWrite: false })); crackMesh.position.z = -0.12; myWin.group.add(crackMesh);
  const shardMat = new THREE.MeshPhysicalMaterial({ color: '#dcebf5', transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  const shards = [];
  { const r = rng(77); const cx = 0.05, cy = -0.07, n = 18, ow = WIN.w + 0.03, oh = WIN.h + 0.03;
    const edge = (a) => { const dx = Math.cos(a), dy = Math.sin(a); const tx = (dx > 0 ? ow / 2 - cx : -ow / 2 - cx) / dx, ty = (dy > 0 ? oh / 2 - cy : -oh / 2 - cy) / dy; const tt = Math.min(Math.abs(tx), Math.abs(ty)); return [cx + dx * tt, cy + dy * tt]; };
    for (let pane = 0; pane < 2; pane++) for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 6.283 + r() * 0.1, a1 = ((i + 1) / n) * 6.283; const [x0, y0] = edge(a0), [x1, y1] = edge(a1); const m = 0.35 + r() * 0.4;
      const pieces = [[[cx, cy], [cx + (x0 - cx) * m, cy + (y0 - cy) * m], [cx + (x1 - cx) * m, cy + (y1 - cy) * m]], [[cx + (x0 - cx) * m, cy + (y0 - cy) * m], [x0, y0], [x1, y1], [cx + (x1 - cx) * m, cy + (y1 - cy) * m]]];
      for (const poly of pieces) {
        const sh = new THREE.Shape(); const ctr = poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);
        poly.forEach((p, k) => (k ? sh.lineTo(p[0] - ctr[0], p[1] - ctr[1]) : sh.moveTo(p[0] - ctr[0], p[1] - ctr[1])));
        const msh = new THREE.Mesh(new THREE.ShapeGeometry(sh), shardMat); msh.visible = false; myWin.group.add(msh);
        shards.push({ mesh: msh, x: ctr[0], y: ctr[1], z: pane ? -0.111 : -0.129, v: 1.2 + r() * 2.6, sx: (ctr[0] - cx) * (1 + r() * 2.5), sy: (ctr[1] - cy) * (1 + r() * 2.5), rx: (r() - 0.5) * 14, ry: (r() - 0.5) * 14, d: r() * 0.03 });
      }
    }
  }
  const debris = [];
  { const r = rng(91); const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; scene.add(m); debris.push({ mesh: m, p0: new THREE.Vector3(x, y, z), r0: new THREE.Euler(r() * 3, r() * 3, r() * 3), d: r() * 0.25, spin: new THREE.Vector3((r() - 0.5) * 14, (r() - 0.5) * 14, (r() - 0.5) * 14), out: r() < 0.6 }); };
    const paper = new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 0.9, side: THREE.DoubleSide }), cup = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: THREE.DoubleSide }), mag = new THREE.MeshStandardMaterial({ color: '#2f6fb3', roughness: 0.7 });
    const flat = (m) => { m.rotation.set(-Math.PI / 2, 0, r() * 3); };
    const seatB = cab.seats.find((x) => x.row === 0 && x.col === 'B'), seatC = cab.seats.find((x) => x.row === 0 && x.col === 'C');
    for (let i = 0; i < 4; i++) mk(new THREE.PlaneGeometry(0.14, 0.14), paper, (i < 2 ? seatB.x : seatC.x) + (r() - 0.5) * 0.2, 0.513 + i * 0.001, seatB.z - 0.05 + (r() - 0.5) * 0.2);
    for (let i = 0; i < 2; i++) mk(new THREE.CylinderGeometry(0.035, 0.028, 0.09, 14, 1, true), cup, seatC.x + (r() - 0.5) * 0.15, 0.555, seatC.z + (r() - 0.5) * 0.15);
    mk(new THREE.BoxGeometry(0.2, 0.004, 0.27), mag, seatB.x + 0.02, 0.515, seatB.z + 0.05);
    for (let i = 0; i < 5; i++) mk(new THREE.PlaneGeometry(0.06, 0.09), paper, seatA.x + 0.2 + r() * 1.0, 0.012, seatA.z - 0.6 + r() * 1.0);
    debris.forEach((d, i) => { if (d.mesh.geometry.type === 'PlaneGeometry') { flat(d.mesh); d.r0.copy(d.mesh.rotation); } else { d.r0.set(0, 0, 0); } });
  }
  const fogPuffs = new Puffs(150, { renderOrder: 8 }); scene.add(fogPuffs.mesh);
  const wind = new Puffs(90, { map: streakTex(), renderOrder: 9 }); scene.add(wind.mesh);
  // masks for the rows around her (one above each seat), hanging on their tubes
  const maskRows = [];
  for (const psu of cab.psus.filter((p) => p.row >= -4 && p.row <= 2)) {
    const xsSide = psu.side < 0 ? [-1.38, -0.96, -0.52] : [0.52, 0.96, 1.38];
    psu.masks.forEach((m) => m.removeFromParent());
    const list = xsSide.map((x, k) => { const mk = makeMask(M); mk.visible = false; scene.add(mk); const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6), M.tube); tube.visible = false; scene.add(tube); return { mask: mk, tube, x, z: psu.anchor.z, L: 0.52 + ((k * 7 + Math.abs(psu.row) * 3) % 5) * 0.025, ph: (k + psu.row) * 1.7, pos: null }; });
    maskRows.push({ psu, list });
  }
  const myMask = maskRows.find((m) => m.psu.row === 0 && m.psu.side < 0).list[0];

  // ================= window lab (exploded 3-pane window) =================
  const lab = new THREE.Scene(); lab.background = new THREE.Color('#0b0d11');
  lab.environment = roomEnv; lab.environmentIntensity = 0.35;
  const labM = cabinMaterials();
  const lw = windowAssembly(labM); lab.add(lw.group); lw.shade.visible = false;
  [lw.outer, lw.middle, lw.inner].forEach((p, i) => { p.material = new THREE.MeshPhysicalMaterial({ color: ['#8fc4ea', '#a8d2f0', '#d3e4f2'][i], transparent: true, opacity: 0.14, roughness: 0.06, metalness: 0, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.6, emissive: '#000000' }); });
  const edgeMat = new THREE.LineBasicMaterial({ color: '#dfeefa', transparent: true, opacity: 0.85 });
  [lw.outer, lw.middle, lw.inner].forEach((p) => p.add(new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry, 30), edgeMat)));
  lw.hole.material = new THREE.MeshBasicMaterial({ color: '#0d1014' });
  const labCrack = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w + 0.03, WIN.h + 0.03), new THREE.MeshBasicMaterial({ map: crackT, transparent: true, depthWrite: false })); lw.outer.add(labCrack); labCrack.position.set(0, 0, 0.013);
  const arrows = new THREE.Group(); lw.group.add(arrows);
  { const am = new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 0.6, roughness: 0.5 });
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8), am); sh.rotation.x = Math.PI / 2; sh.position.z = 0.025; const hd = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.022, 12), am); hd.rotation.x = -Math.PI / 2; hd.position.z = -0.006; a.add(sh, hd); a.position.set(i * 0.07, j * 0.1, 0); arrows.add(a); } }
  lab.add(new THREE.HemisphereLight('#dfe8f5', '#1a1d22', 0.6));
  const key = new THREE.DirectionalLight('#ffffff', 2.4); key.position.set(1.2, 1.5, 1.6); lab.add(key);
  const rimL = new THREE.DirectionalLight('#9cc3ff', 2.0); rimL.position.set(-1.5, 0.5, -1.2); lab.add(rimL);
  const air = new Puffs(60, { renderOrder: 9 }); lab.add(air.mesh);

  // ================= 1990: the cockpit window that blew out (reconstruction) =================
  const nose = new THREE.Scene();
  const out2 = makeOutside(); nose.add(out2.group);
  out2.cloudMat.uniforms.uGround.value.set(0.18, 0.28, 0.14); out2.cloudMat.uniforms.uCover.value = 0.5;
  out2.clouds.position.y = -4200;
  const paint = new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: 0.38, metalness: 0.1, side: THREE.DoubleSide });
  const bellyM = new THREE.MeshStandardMaterial({ color: '#59606b', roughness: 0.45, metalness: 0.2, side: THREE.DoubleSide });
  const glassDark = new THREE.MeshStandardMaterial({ color: '#0e141c', roughness: 0.08, metalness: 0.4 });
  const plane = new THREE.Group(); nose.add(plane);
  let holeAt = null;
  { const R0 = 1.6;
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, 16, 64, 1, true), paint); fus.rotation.x = Math.PI / 2; fus.position.z = 8; plane.add(fus);
    const prof = []; for (let i = 0; i <= 24; i++) { const u = i / 24; prof.push(new THREE.Vector2(R0 * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.2))), -u * 3.6)); }
    const cone = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), paint); cone.rotation.x = Math.PI / 2; plane.add(cone);
    const low = new THREE.Mesh(new THREE.CylinderGeometry(R0 + 0.002, R0 + 0.002, 16, 64, 1, true, Math.PI * 0.62, Math.PI * 0.76), bellyM); low.rotation.x = Math.PI / 2; low.position.z = 8; plane.add(low);
    // nose surface: r(d) = R0*sqrt(1-(d/3.6)^2.2), d = distance forward of the joint (z = -d)
    const rAt = (d) => R0 * Math.sqrt(Math.max(0, 1 - Math.pow(d / 3.6, 2.2)));
    const onNose = (phi, d, lift = 0.004) => { const r = rAt(d), slope = (rAt(d - 0.01) - rAt(d + 0.01)) / 0.02;
      const radial = new THREE.Vector3(Math.sin(phi), Math.cos(phi), 0); const n = radial.clone().add(new THREE.Vector3(0, 0, -slope)).normalize();
      return { p: radial.multiplyScalar(r).add(new THREE.Vector3(0, 0, -d)).addScaledVector(n, lift), n }; };
    const place = (mesh, phi, d, lift) => { const { p, n } = onNose(phi, d, lift); mesh.position.copy(p); mesh.lookAt(p.clone().add(n)); plane.add(mesh); return { p, n }; };
    const pane = (w, h, mat = glassDark) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    place(pane(0.6, 0.42), 0.52, 1.25);
    place(pane(0.5, 0.34), 1.08, 0.8); place(pane(0.5, 0.34), -1.08, 0.8);
    holeAt = place(pane(0.6, 0.42, new THREE.MeshBasicMaterial({ color: '#030406' })), -0.52, 1.25, 0.006);
    const fr = new THREE.MeshStandardMaterial({ color: '#30353d', roughness: 0.5 });
    place(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.03), fr), 0, 1.25, 0.01);
  }
  const capt = cloneMannequin({ scene: SkeletonUtils.clone(gltf.scene), animations: gltf.animations }, { bodyColor: '#cfd5dd', jointColor: '#1d2433' });
  capt.mixer.clipAction(capt.clips.idle).play(); plane.add(capt.root);
  nose.add(new THREE.HemisphereLight('#cfe0f5', '#5b6a52', 1.0));
  const nSun = new THREE.DirectionalLight('#fff3e0', 3.0); nSun.position.set(-6, 8, -4); nose.add(nSun);
  const flow = new Puffs(160, { map: streakTex(), renderOrder: 9 }); nose.add(flow.mesh);

  const endScene = new THREE.Scene(); endScene.background = new THREE.Color('#0d0e11');

  // ---------- shots ----------
  const shots = [
    ['A', 0, 3.7, 'in'], ['B', 3.7, 7.46, 'in'], ['C', 7.46, 12.85, 'in'], ['D', 12.85, 18.07, 'in'], ['E', 18.07, 21.24, 'in'], ['F', 21.24, 25.88, 'in'],
    ['G', 25.88, 29.05, 'in'], ['H', 29.05, 34.94, 'in'], ['I', 34.94, 39.41, 'in'], ['J', 39.41, 43.88, 'in'], ['K', 43.88, 47.77, 'lab'], ['L', 47.77, 52.57, 'lab'],
    ['M', 52.57, 57.62, 'lab'], ['N', 57.62, 63.59, 'in'], ['O', 63.59, 69.06, 'nose'], ['P', 69.06, 74.36, 'nose'], ['Q', 74.36, 79.16, 'in'], ['Z', 79.16, DUR + 1, 'end'],
  ].map(([id, t0, t1, kind]) => ({ id, t0, t1, kind }));
  const shotAt = (t) => shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1];

  // ---------- her pose ----------
  function poseMe(t, te, ec) {
    drv.mixer.setTime((t * 0.6) % 8 + 0.01); drv.root.updateMatrixWorld(true);
    const brk = te >= T_BRK ? 1 : 0;
    const startle = brk * smooth(0, 0.08, ec) * (1 - smooth(0.5, 2.0, ec));
    const drowsy = smooth(5.5, 10, ec) * (1 - smooth(13.4, 15.5, ec));
    offsetBone(drv, 'LeftUpLeg', -1.45, 0, 0.05); offsetBone(drv, 'RightUpLeg', -1.45, 0, -0.05);
    offsetBone(drv, 'LeftLeg', 1.5, 0, 0); offsetBone(drv, 'RightLeg', 1.5, 0, 0);
    offsetBone(drv, 'Spine', -0.06 - 0.12 * startle + 0.1 * drowsy, 0, 0);
    offsetBone(drv, 'LeftArm', 0, -0.55, 0.25 + 0.5 * startle); offsetBone(drv, 'LeftForeArm', 0, -1.1, 0);
    offsetBone(drv, 'RightArm', 0, 0.55, -0.25 - 0.5 * startle); offsetBone(drv, 'RightForeArm', 0, 1.1, 0);
    const lookWin = (1 - brk) * (te < 12.85 ? 1 : 0.8);
    offsetBone(drv, 'Head', 0.05 - 0.2 * startle + 0.28 * drowsy, 0.55 * lookWin - 0.35 * brk * (1 - drowsy * 0.5), 0.12 * drowsy);
    drv.root.updateMatrixWorld(true);
    retarget();
  }
  // right hand reaches for the mask and brings it to her face (IK, blended in and out)
  function maskIK(te, maskPos) {
    const w = smooth(35.3, 35.65, te) * (1 - smooth(37.7, 38.4, te));
    if (w <= 0.001) return null;
    const names = ['RightArm', 'RightForeArm', 'RightHand'];
    const fk = names.map((n) => me.bones[n].quaternion.clone());
    const head = me.bones.Head.getWorldPosition(new THREE.Vector3());
    const face = head.clone().add(P(0.03, 0.03, -0.16));
    const k1 = smooth(35.4, 36.2, te), k2 = smooth(36.2, 36.9, te);
    const target = maskPos.clone().add(P(0.02, -0.02, 0.03)).lerp(face, k2);
    const sh = me.bones.RightArm.getWorldPosition(new THREE.Vector3());
    const rest = sh.clone().add(P(0.12, -0.42, -0.22));
    twoBoneIK(me, 'RightArm', 'RightForeArm', 'RightHand', rest.lerp(target, k1), sh.clone().add(P(0.55, -0.55, 0.25)));
    if (w < 0.999) names.forEach((n, i) => { const b = me.bones[n]; const ik = b.quaternion.clone(); b.quaternion.copy(fk[i]).slerp(ik, w); });
    me.root.updateMatrixWorld(true);
    return { k1, k2 };
  }

  function frame(t, opts = {}) {
    const shot = shotAt(t);
    const k = clamp((t - shot.t0) / (shot.t1 - shot.t0)), dk = easeInOut(k);
    const st = { tag: 'WHAT IF &nbsp;·&nbsp; 03', tagA: 1, labels: [] };
    let sat = 1.0, tint = [1.0, 1.0, 1.0], vignette = 0.45, aberr = 0.0015, fadeW = 0, fadeB = 0, shake = 0, tunnel = 0, scan = 0, exposure = 0.9;
    let renderScene = scene, useOut = false;

    // ---------------- cabin state (shared by every cabin shot) ----------------
    const te = shot.id === 'N' || shot.id === 'Q' ? 10.0 : teOf(t);
    const ec = ecOf(te), broken = te >= T_BRK;
    const crackF = smooth(T_CRACK, T_BRK, te);
    if (shot.kind === 'in') setCrack(broken ? 1 : crackF);
    crackMesh.visible = !broken && crackF > 0;
    [myWin.outer, myWin.middle, myWin.inner].forEach((p) => { p.visible = !broken; });
    for (const s of shards) {
      s.mesh.visible = broken && ec < 1.2;
      if (!s.mesh.visible) continue;
      const tt = Math.max(0, ec - s.d);
      s.mesh.position.set(s.x + s.sx * tt, s.y + s.sy * tt - 2 * tt * tt, s.z - s.v * tt);
      s.mesh.rotation.set(s.rx * tt, s.ry * tt, 0);
    }
    // shade flaps once the window is gone
    myWin.shade.position.y = WIN.h + 0.07; myWin.shade.rotation.x = 0;
    const fog = broken ? smooth(0.3, 1.5, ec) * (1 - 0.4 * smooth(4, 16, ec)) : 0;
    scene.fog = fog > 0.001 ? new THREE.FogExp2('#cfd6df', 0.26 * fog) : null;
    outside.skyMat.uniforms.uVeil.value = clamp(fog * 0.55);
    const flick = broken && ec < 1.0 ? (Math.sin(t * 57) > 0.1 ? 1 : 0.25) : 1;
    const emerg = broken ? 0.7 : 1;
    wash.intensity = 1.1 * flick * emerg; downs.forEach((d) => { d.intensity = 1.6 * flick * emerg; }); hemi.intensity = 0.12 + 0.12 * fog;
    if (broken && ec > 0.2) drawMap('CABIN ALTITUDE', '', ''); else drawMap('11,000 m', '880 km/h', '−56 °C');
    // debris: drawn toward the hole, a few go out
    for (const d of debris) {
      if (!broken) { d.mesh.position.copy(d.p0); d.mesh.rotation.copy(d.r0); d.mesh.visible = true; continue; }
      const tt = Math.max(0, ec - d.d), u = clamp(tt / 0.9);
      const toHole = winC.clone().sub(d.p0);
      const p = d.p0.clone().addScaledVector(toHole, easeIn(u) * (d.out ? 1.0 : 0.82)).add(P(0, Math.sin(tt * 9 + d.d * 20) * 0.04 * (1 - u), 0));
      if (d.out && u >= 1) p.addScaledVector(winOut, (tt - 0.9) * 8);
      d.mesh.position.copy(p); d.mesh.rotation.set(d.r0.x + d.spin.x * tt, d.r0.y + d.spin.y * tt, d.r0.z + d.spin.z * tt);
      d.mesh.visible = !(d.out && tt > 1.3);
    }
    // fog puffs swirl toward the window; streaks of air rushing out through the hole
    { const r = rng(5);
      for (let i = 0; i < fogPuffs.n; i++) {
        const x = -1.7 + r() * 3.4, y = 0.2 + r() * 2.0, z = seatA.z - 3 + r() * 6, ph = r();
        const pull = broken ? clamp((ec * 0.35 + ph) % 1) : 0;
        const pp = P(x, y, z).lerp(winC, pull * 0.6);
        fogPuffs.set(i, pp.x, pp.y + Math.sin(t * 0.7 + i) * 0.05, pp.z, 0.5 + r() * 0.9, fog * (0.1 + 0.16 * r()) * (1 - pull * 0.5), 0.9, 0.93, 0.97, r() * 6);
      }
      fogPuffs.commit();
      for (let i = 0; i < wind.n; i++) {
        const life = ((ec * 2.2 + r()) % 1), side = (r() - 0.5);
        const start = winC.clone().add(P(0.9 + r() * 0.6, (r() - 0.5) * 0.7, (r() - 0.5) * 1.2));
        const pp = start.lerp(winC, easeIn(life));
        const p0 = project(pp, cam), p1 = project(winC, cam);
        wind.set(i, pp.x, pp.y, pp.z + side * 0.05, 0.012, broken && ec < 12 ? 0.35 * (1 - life) * clamp(1.2 - ec * 0.08) : 0, 1, 1, 1, Math.atan2(-(p1.y - p0.y), p1.x - p0.x), 6 + 10 * life);
      }
      wind.commit();
    }
    // masks: doors pop at ec 2.9, masks drop, bounce and sway on their tubes
    const drop = broken ? clamp((ec - 2.9) / 0.32) : 0;
    for (const row of maskRows) {
      row.psu.doorPivot.rotation.x = broken ? -1.6 * smooth(2.85, 2.98, ec) : 0;
      for (const m of row.list) {
        const vis = drop > 0;
        m.mask.visible = vis; m.tube.visible = vis;
        if (!vis) { m.pos = null; continue; }
        const tt = Math.max(0, ec - 2.9 - 0.32);
        const bounce = drop < 1 ? 0 : Math.sin(tt * 11 + m.ph) * 0.05 * Math.exp(-tt * 2.2);
        const sway = Math.sin(t * 1.7 + m.ph) * 0.02 * (fog + 0.3);
        m.pos = P(m.x + sway, 1.64 - m.L * easeIn(drop) + bounce, m.z + sway * 0.6);
        m.mask.position.copy(m.pos); m.mask.rotation.set(0.15 + sway, Math.sin(m.ph) * 0.4, 0);
      }
    }

    // ---------------- her ----------------
    me.root.position.set(seatA.x + 0.02, -0.43, seatA.z + 0.06); me.root.rotation.y = Math.PI; me.root.updateMatrixWorld(true);
    poseMe(t, te, ec);
    if (myMask.pos) {
      const ik = shot.kind === 'in' ? maskIK(te, myMask.pos) : null;
      const head = me.bones.Head.getWorldPosition(new THREE.Vector3());
      const eyes = me.bones.LeftEye && me.bones.RightEye ? me.bones.LeftEye.getWorldPosition(new THREE.Vector3()).add(me.bones.RightEye.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5) : head.clone().add(P(0, 0.09, -0.08));
      const upv = eyes.clone().sub(head); upv.y = Math.abs(upv.y) + 0.05; upv.normalize();
      const fwd = eyes.clone().sub(head).addScaledVector(upv, -eyes.clone().sub(head).dot(upv)).normalize();
      const onFace = eyes.clone().addScaledVector(upv, -0.055).addScaledVector(fwd, 0.055);
      const Zm = fwd.clone().negate(), Ym = upv.clone().addScaledVector(Zm, -upv.dot(Zm)).normalize(), Xm = new THREE.Vector3().crossVectors(Ym, Zm);
      const faceQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xm, Ym, Zm));
      if (te >= 36.9) { myMask.mask.position.copy(onFace); myMask.mask.quaternion.copy(faceQ); }
      else if (ik && ik.k1 >= 1) { const hp = me.bones.RightHand.getWorldPosition(new THREE.Vector3()); myMask.mask.position.copy(hp.add(P(-0.02, 0.04, -0.04)).lerp(onFace, ik.k2 * 0.8)); myMask.mask.quaternion.slerp(faceQ, ik.k2); }
    }
    for (const row of maskRows) for (const m of row.list) {
      if (!m.mask.visible) continue;
      const a = P(m.x, 1.645, m.z), b = m.mask.position.clone().add(P(0, 0.11, -0.02));
      m.tube.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.tube.scale.set(1, Math.max(0.01, a.distanceTo(b)), 1);
      m.tube.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
    }
    passengers.forEach((p) => { p.rotation.z = broken ? Math.sin(t * 2 + p.userData.ph) * 0.06 : Math.sin(t * 0.3 + p.userData.ph) * 0.02; });

    // ---------------- cameras ----------------
    const hand = (a) => P(Math.sin(t * 1.3 + a) * 0.004, Math.sin(t * 1.7 + a) * 0.003, 0);
    const headP = me.bones.Head.getWorldPosition(new THREE.Vector3());
    if (shot.kind === 'in') {
      useOut = true; renderScene = scene;
      if (shot.id === 'A') look(P(0.12, 1.52, lerp(1.85, 1.5, dk)).add(hand(0)), P(-1.1, 1.05, -1.6), 52);
      else if (shot.id === 'B') look(P(lerp(-1.02, -1.08, dk), 1.42, lerp(-0.6, -0.66, dk)).add(hand(1)), P(-1.5, 1.08, seatA.z + 0.02), 52);
      else if (shot.id === 'C' || shot.id === 'N') {
        const roll = shot.id === 'N' ? -0.14 * smooth(57.8, 59.5, t) : 0;
        look(P(winC.x + 0.42, winC.y + 0.06, winC.z - 0.12).add(hand(2)), P(winC.x - 3, winC.y - 1.15, winC.z + 1.3), 62, roll);
      }
      else if (shot.id === 'D') look(P(winC.x + lerp(0.4, 0.34, dk), winC.y + 0.03, winC.z + 0.3).add(hand(3)), P(winC.x, winC.y, winC.z), 40);
      else if (shot.id === 'E') { look(P(-0.82, 1.46, -0.46).add(hand(4)), P(winC.x + 0.1, winC.y - 0.04, winC.z + 0.04), 48); shake = broken ? 0.012 * Math.exp(-ec * 3) + 0.002 : 0; }
      else if (shot.id === 'F' || shot.id === 'J') { look(P(0.05, 1.55, -1.35).add(hand(5)), P(-1.25, 1.08, 0.05), 58); shake = shot.id === 'F' ? 0.003 : 0; }
      else if (shot.id === 'G') look(P(-0.62, 1.18, -0.7).add(hand(6)), P(-1.15, lerp(1.62, 1.35, smooth(25.95, 26.6, t)), -0.15), 60);
      else if (shot.id === 'H') look(P(-0.92, 1.24, -0.42).add(hand(7)), headP.clone().add(P(-0.02, 0.06, 0)), 46);
      else if (shot.id === 'I') look(P(-0.88, 1.34, -0.62).add(hand(8)), P(-1.36, 1.22, -0.08), 54);
      else if (shot.id === 'Q') look(P(lerp(-0.98, -1.04, dk), lerp(1.2, 1.12, dk), -0.42).add(hand(9)), P(seatA.x + 0.02, 0.66, seatA.z - 0.15), 46);
      if (shot.id === 'J') { sat = 0.15; tint = [1.0, 1.0, 1.04]; aberr = 0.012; }
      if (shot.id === 'E') fadeW = broken && ec < 0.05 ? 0.35 * (1 - ec / 0.05) : 0;
      if (shot.id === 'H' || shot.id === 'I') tunnel = smooth(29.3, 34.6, t) * (1 - smooth(37.0, 38.6, te)) * 0.85;
      if (tunnel > 0) { sat = 1 - 0.55 * tunnel; aberr = 0.0015 + 0.01 * tunnel; }
      exposure = 0.9 * (broken ? lerp(1, 0.86, fog) : 1);
    } else if (shot.kind === 'lab') {
      renderScene = lab;
      const ex = smooth(43.95, 45.6, t);
      lw.outer.position.z = -0.135 - 0.2 * ex; lw.middle.position.z = -0.115 - 0.08 * ex; lw.inner.position.z = -0.004 + 0.1 * ex;
      lw.hole.position.z = lw.middle.position.z + 0.0095;
      const cracked = smooth(48.6, 49.6, t);
      setCrack(cracked); labCrack.visible = cracked > 0;
      const onMiddle = smooth(49.4, 50.4, t);
      arrows.position.z = lerp(lw.outer.position.z + 0.075, lw.middle.position.z + 0.07, onMiddle);
      arrows.children.forEach((a, i) => { a.scale.setScalar(1 + 0.08 * Math.sin(t * 6 + i)); });
      lw.middle.material.emissive.set(RED); lw.middle.material.emissiveIntensity = 0.25 * onMiddle * (0.7 + 0.3 * Math.sin(t * 5));
      lw.group.rotation.set(-0.08, lerp(0.35, 0.5, smooth(43.9, 52.5, t)), 0);
      lw.group.updateMatrixWorld(true);
      const hp = lw.hole.getWorldPosition(new THREE.Vector3());
      const C0 = P(0.82, 0.16, 0.72), T0 = P(0, -0.02, -0.12);
      arrows.visible = shot.id !== 'M';
      if (shot.id === 'K' || shot.id === 'L') look(C0, T0, 32);
      else { const kk = smooth(52.7, 55.2, t); look(C0.clone().lerp(hp.clone().add(P(0.14, 0.05, 0.12)), kk), T0.clone().lerp(hp, kk), lerp(32, 30, kk)); }
      const r = rng(9);
      for (let i = 0; i < air.n; i++) { const life = (t * 0.6 + r()) % 1; const p = hp.clone().add(P((r() - 0.5) * 0.04 * life, (r() - 0.5) * 0.03 * life, -0.03 * life + 0.02)); air.set(i, p.x, p.y, p.z, 0.004 + 0.004 * r(), shot.id === 'M' ? 0.6 * (1 - life) : 0, 0.8, 0.9, 1.0); }
      air.commit();
      const lbl = (obj, dx, dy, html, a = 1, oy = 0) => { const p = project(obj.getWorldPosition(new THREE.Vector3()).add(P(dx, dy, 0)), cam); st.labels.push({ x: p.x, y: p.y + oy, a, html }); };
      const row = (obj, y, html, a = 1) => { const p = project(obj.getWorldPosition(new THREE.Vector3()), cam); st.labels.push({ x: Math.min(W - 200, Math.max(200, p.x)), y, a, html }); };
      if (shot.id === 'K') { const a = smooth(45.0, 45.5, t); if (a > 0) { row(lw.outer, H * 0.215, '<b>OUTER</b> PANE', a); row(lw.middle, H * 0.25, '<b>MIDDLE</b> PANE', a); row(lw.inner, H * 0.285, '<b>INNER</b> PANE', a); } }
      if (shot.id === 'L') { row(lw.outer, H * 0.215, cracked > 0.5 ? '<b>OUTER</b> · CRACKED' : '<b>OUTER</b> · CARRIES THE LOAD'); row(lw.middle, H * 0.25, onMiddle > 0.5 ? '<b>MIDDLE</b> · HOLDS' : '<b>MIDDLE</b> · SPARE'); }
      if (shot.id === 'M') { const a = smooth(54.6, 55.2, t); if (a > 0) { const p = project(hp.clone().add(P(0, -0.012, 0)), cam); st.labels.push({ x: Math.min(W - 230, Math.max(230, p.x)), y: Math.min(H * 0.56, p.y + 120), a, html: '<b>BREATHER HOLE</b>' }); } }
      vignette = 0.75; exposure = 1.0;
    } else if (shot.kind === 'nose') {
      renderScene = nose;
      // hips just inside the missing pane, torso folded back over the roof, face up, arms dragged aft
      capt.mixer.setTime(1.0);
      const n = holeAt.n, circ = new THREE.Vector3(Math.cos(-0.52), -Math.sin(-0.52), 0);
      const aft = new THREE.Vector3(0, 0, 1).addScaledVector(n, -n.z).normalize();
      const Yb = aft.clone().multiplyScalar(1.0).addScaledVector(circ, 0.3).addScaledVector(n, 0.22 + Math.sin(t * 2.9) * 0.02).normalize();
      const Zb = n.clone().addScaledVector(Yb, -n.dot(Yb)).normalize(), Xb = new THREE.Vector3().crossVectors(Yb, Zb);
      capt.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xb, Yb, Zb));
      capt.root.position.copy(holeAt.p).addScaledVector(n, -0.12).addScaledVector(Yb, -1.0);
      capt.root.updateMatrixWorld(true);
      offsetBone(capt, 'Spine', -0.12, 0, 0); offsetBone(capt, 'Head', -0.45, 0, 0);
      offsetBone(capt, 'LeftUpLeg', 1.35, 0, 0); offsetBone(capt, 'RightUpLeg', 1.35, 0, 0); offsetBone(capt, 'LeftLeg', 0.6, 0, 0); offsetBone(capt, 'RightLeg', 0.6, 0, 0);
      offsetBone(capt, 'LeftArm', 0, 0, 2.65 + Math.sin(t * 7.3) * 0.1); offsetBone(capt, 'RightArm', 0, 0, -2.65 + Math.sin(t * 6.1) * 0.1);
      offsetBone(capt, 'LeftForeArm', 0, -0.25 + Math.sin(t * 9.1) * 0.08, 0); offsetBone(capt, 'RightForeArm', 0, 0.25, 0);
      capt.root.updateMatrixWorld(true);
      if (shot.id === 'O') look(P(lerp(-10.8, -9.8, dk), lerp(1.7, 1.75, dk), lerp(-6.0, -5.4, dk)), P(-0.2, 1.25, -0.4), 30);
      else look(P(lerp(-3.8, -3.5, dk), lerp(2.7, 2.6, dk), lerp(-1.6, -1.4, dk)), P(-0.4, 1.8, -0.2), 34);
      const r = rng(13);
      for (let i = 0; i < flow.n; i++) { const life = (t * 1.4 + r()) % 1; const a = r() * 3.4 - 0.2, rr = 1.72 + r() * 0.6; const p = P(Math.cos(a) * rr, Math.sin(a) * rr, -3.5 + life * 12); const p0 = project(p, cam), p1 = project(p.clone().add(P(0, 0, 0.6)), cam); flow.set(i, p.x, p.y, p.z, 0.016, 0.35 * Math.sin(Math.PI * life), 1, 1, 1, Math.atan2(-(p1.y - p0.y), p1.x - p0.x), 16); }
      flow.commit();
      out2.cloudMat.uniforms.uOff.value.set(0, -t * 0.06); out2.cloudMat.uniforms.uCam.value.copy(cam.position);
      shake = 0.003; scan = 1.0; sat = 0.72; tint = [1.08, 1.0, 0.9]; aberr = 0.006; vignette = 0.8; exposure = 0.95;
      st.labels.push({ x: W * 0.5, y: H * 0.115, a: 1, html: 'RECONSTRUCTION &nbsp;·&nbsp; 10 JUNE 1990' });
    } else { renderScene = endScene; }

    // the view outside follows the cabin camera
    outPass.enabled = useOut;
    R.renderPass.clear = !useOut; R.renderPass.clearDepth = useOut;
    if (useOut) {
      farCam.position.copy(cam.position); farCam.quaternion.copy(cam.quaternion); farCam.fov = cam.fov; farCam.updateProjectionMatrix(); farCam.updateMatrixWorld();
      outside.cloudMat.uniforms.uCam.value.copy(farCam.position); outside.cloudMat.uniforms.uOff.value.set(t * 0.012, 0);
      outside.clouds.position.y = shot.id === 'N' ? 2400 - lerp(11000, 3000, easeInOut(smooth(58.0, 63.4, t))) : -8600;
    }
    const wantFar = renderScene === nose ? 300000 : 80;
    if (cam.far !== wantFar) { cam.far = wantFar; cam.near = renderScene === nose ? 0.1 : 0.02; cam.updateProjectionMatrix(); }

    // ---------------- HUD ----------------
    const hud = (lab, val, sub, valColor = '') => { st.hud = { a: 1, lab, val, sub, sub2: '', valColor }; };
    const fmt = (n) => Math.round(n).toLocaleString('en-US');
    if (shot.id === 'B') hud('Cruising altitude', '11,000 m', '880 km/h');
    else if (shot.id === 'C') hud('Outside', '−56 °C', 'Air: 22% of sea level');
    else if (shot.id === 'D') hud('Force on this window', '≈ 500 kg', 'Cabin 0.75 bar · outside 0.23 bar');
    else if (shot.id === 'E') hud('Time slowed', '6×', broken ? 'Window gone' : '');
    else if (shot.id === 'F') hud('Cabin altitude', `${fmt(Math.round(lerp(2400, 11000, smooth(0, 2.8, ec)) / 100) * 100)} m`, 'Time slowed 2×');
    else if (shot.id === 'G') hud('Cabin altitude', '11,000 m', 'Masks drop above 4,300 m');
    else if (shot.id === 'H') hud('Useful consciousness', timer(30 - ec), 'Without oxygen, at 11,000 m', RED);
    else if (shot.id === 'I') { if (te >= 36.9) hud('Oxygen', 'FLOWING', 'Each mask: about 12 minutes'); else hud('Useful consciousness', timer(30 - ec), 'Without oxygen, at 11,000 m', RED); }
    else if (shot.id === 'J') hud(t < T_FRZ + 0.8 ? 'Paused' : 'Rewinding', '◀◀', '');
    else if (shot.id === 'K') hud('Airplane window', '3 LAYERS', '');
    else if (shot.id === 'L') hud('Outer pane breaks', 'MIDDLE HOLDS', 'Built to take the full pressure');
    else if (shot.id === 'M') hud('Breather hole', 'TINY HOLE', 'Keeps the load on the outer pane');
    else if (shot.id === 'N') hud('Emergency descent', `${fmt(Math.round(lerp(11000, 3000, easeInOut(smooth(58.0, 63.4, t))) / 100) * 100)} m`, 'About 4 minutes, shown fast');
    else if (shot.id === 'O') hud('British Airways 5390', '5,300 m', 'Cockpit windscreen blew out');
    else if (shot.id === 'P') hud('The captain', 'SURVIVED', 'Held by his crew for 20 minutes');
    if (t < 3.6) st.title = { html: TITLE, a: Math.min(smooth(0, 0.35, t), 1 - smooth(3.2, 3.55, t)), k: smooth(0, 0.6, t) };
    const c = captionAt(CAPTIONS, t); if (c) st.caption = c;
    if (t >= 79.16) { st.end = { a: smooth(79.16, 79.5, t), title: TITLE, note: ENDNOTE }; st.hud = null; st.labels = []; }
    if (opts.cover) { st.title = { html: TITLE, a: 1, k: 1 }; st.caption = null; st.hud = null; st.labels = []; }

    // ---------------- grade ----------------
    R.renderer.toneMappingExposure = exposure;
    R.bloom.strength = 0.25; R.bloom.radius = 0.5; R.bloom.threshold = 0.95;
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uSat.value = sat; U.uTint.value.set(...tint); U.uVignette.value = vignette; U.uAberr.value = aberr; U.uFade.value = fadeB; U.uFadeWhite.value = fadeW;
    U.uTunnel.value = tunnel; U.uScan.value = scan;
    const sr = rng(Math.floor(t * 30) + 3); U.uShake.value.set((sr() - 0.5) * shake, (sr() - 0.5) * shake);
    R.renderPass.scene = renderScene; R.renderPass.camera = cam;
    R.composer.render(); ov.apply(st);
  }
  await Promise.all(TEX_PENDING);
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
