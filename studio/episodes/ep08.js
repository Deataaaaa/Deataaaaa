// POST 2 — What if your plane's window broke at 11,000 m? Worst case, all the way: no "but it almost never happens".
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeIn, easeOut, project, W, H } from '../engine/core.js';
import { Puffs, streakTex } from '../engine/assets.js';
import { loadMannequin, cloneMannequin, offsetBone, twoBoneIK, cloneHuman, makeRetarget, TEX_PENDING } from '../engine/elevator.js';
import { makeCabin, makeOutside, makeWing, makePassenger, makeMask, windowAssembly, cabinMaterials, WIN } from '../engine/cabin.js';
import { makeJetNose, makeJetSide, dressPilot, makeCrewHands } from '../engine/jetnose.js';
import { aimBone } from '../engine/elevator.js';

// ---------- script: every caption passes the reading rule (render.mjs checks it) ----------
const CAPTIONS = [
  [3.8, 7.4, 'You’re cruising at 11,000 meters.', { y: 26 }],            // high: her face fills the middle of shot B
  [7.52, 12.79, 'Outside, it’s −56 °C. The air is too thin to breathe.'],
  [12.91, 18.01, 'Your window is holding back half a ton of pressure.'],
  [18.13, 21.18, 'Then it breaks.'],
  [21.36, 25.48, 'The air rushes out at the speed of sound.'],
  [25.72, 30.18, 'And that half ton now pushes you into the hole.', { y: 26 }],
  [30.42, 34.54, 'The masks drop. But you can’t reach yours.'],
  [34.78, 40.44, 'You have 15 to 30 seconds before you stop thinking clearly.'],
  [40.68, 43.44, 'Then you black out.'],
  [43.68, 48.24, 'The pilots dive toward air you can breathe.'],
  [48.48, 53.88, 'This isn’t fiction. In 2018, it happened on a real flight.', { shade: 1 }],
  [54.1, 58.64, 'A passenger was pulled partly out of the window.', { shade: 1 }],
  [58.76, 61.54, 'She didn’t survive.', { shade: 1 }],
  [61.78, 67.14, 'In 1990, a pilot was sucked halfway out of his window.', { shade: 1 }],
  [67.38, 72.54, 'His crew held on to him for 20 minutes. He survived.', { shade: 1 }],
  [72.78, 77.0, 'Still want the window seat?', { y: 26 }],
];
const TITLE = 'What if your plane’s <span class="k">window</span> broke at 11,000 m?';
const DUR = 77.2;
const T_CRACK = 16.3, T_BRK = 18.2;
const T_R1 = 21.24, T_R2 = 25.6, T_G = 30.3, T_V = 34.66, T_K = 40.56, T_DV = 43.56, T_S1 = 48.36, T_S2 = 54.0, T_O = 61.66, T_P = 67.26, T_Q = 72.66;
const T_DROP_EC = 7.6;                 // masks drop ~7.6 s after the break (cabin altitude passes ~4,300 m)
const RED = '#ff3b30';

// seconds of real time since the window broke: 6× slow in E, 2× in R1, real time, then the countdown runs 3× in V
function ecOf(te) {
  if (te < T_BRK) return te - T_BRK;
  if (te < T_R1) return (te - T_BRK) / 6;
  const e1 = (T_R1 - T_BRK) / 6;
  if (te < T_R2) return e1 + (te - T_R1) / 2;
  const e2 = e1 + (T_R2 - T_R1) / 2;
  if (te < T_V) return e2 + (te - T_R2);
  const e3 = e2 + (T_V - T_R2);
  if (te < T_K) return e3 + 3 * (te - T_V);
  return e3 + 3 * (T_K - T_V) + (te - T_K);
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

  // ================= 1990: the captain's windscreen blew out (reconstruction, engine/jetnose.js) =================
  const nose = new THREE.Scene();
  const out2 = makeOutside(); nose.add(out2.group);
  out2.cloudMat.uniforms.uGround.value.set(0.18, 0.28, 0.14); out2.cloudMat.uniforms.uCover.value = 0.5;
  out2.clouds.position.y = -4200;
  const jet = makeJetNose(R.renderer); nose.add(jet.group);
  nose.environment = jet.env; nose.environmentIntensity = 0.8;
  const capt = cloneMannequin({ scene: SkeletonUtils.clone(gltf.scene), animations: gltf.animations });
  const pilot = dressPilot(capt);
  capt.mixer.clipAction(capt.clips.idle).play(); jet.group.add(capt.root);
  // freeze one idle frame and restore it before every pose: offsets must never pile up from frame to frame
  // (the mixer skips re-applying values that did not change, so setTime() alone is not a reset)
  capt.mixer.setTime(1.0);
  const captPose = Object.values(capt.bones).map((b) => [b, b.quaternion.clone(), b.position.clone()]);
  const crew = makeCrewHands(); jet.group.add(crew.group);
  nose.add(new THREE.HemisphereLight('#cfe0f5', '#5b6a52', 0.9));
  const nSun = new THREE.DirectionalLight('#fff3e0', 3.2); nSun.position.set(-6, 8, -4); nSun.target.position.set(-0.3, 1.0, -2.2);
  nSun.castShadow = true; nSun.shadow.mapSize.set(2048, 2048); Object.assign(nSun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 30 });
  nSun.shadow.bias = -0.0005; nSun.shadow.normalBias = 0.02; nose.add(nSun, nSun.target);
  const flow = new Puffs(160, { map: streakTex(), renderOrder: 9 }); nose.add(flow.mesh);

  // ================= 2018: Southwest 1380, a cabin window blown out by engine debris (reconstruction) =================
  const s18 = new THREE.Scene();
  const out3 = makeOutside(); s18.add(out3.group);
  out3.cloudMat.uniforms.uGround.value.set(0.16, 0.24, 0.14); out3.cloudMat.uniforms.uCover.value = 0.52; out3.clouds.position.y = -9000;
  const jet2 = makeJetSide(R.renderer); s18.add(jet2.group);
  s18.environment = jet2.env; s18.environmentIntensity = 0.8;
  s18.add(new THREE.HemisphereLight('#cfe0f5', '#5b6a52', 0.9));
  const sun18 = new THREE.DirectionalLight('#fff3e0', 3.0); sun18.position.set(-8, 9, -6); s18.add(sun18);
  const smoke = new Puffs(150, { renderOrder: 8 }); s18.add(smoke.mesh);
  const vent = new Puffs(110, { renderOrder: 9 }); s18.add(vent.mesh);
  const flow3 = new Puffs(120, { map: streakTex(), renderOrder: 9 }); s18.add(flow3.mesh);

  // ---------- shots ----------
  const shots = [
    ['A', 0, 3.7, 'in'], ['B', 3.7, 7.46, 'in'], ['C', 7.46, 12.85, 'in'], ['D', 12.85, 18.07, 'in'], ['E', 18.07, T_R1, 'in'],
    ['R1', T_R1, T_R2, 'in'], ['R2', T_R2, T_G, 'in'], ['G', T_G, T_V, 'in'], ['V', T_V, T_K, 'in'], ['K', T_K, T_DV, 'in'], ['DV', T_DV, T_S1, 'in'],
    ['S1', T_S1, T_S2, 'ext'], ['S2', T_S2, T_O, 'ext'], ['O', T_O, T_P, 'nose'], ['P', T_P, T_Q, 'nose'], ['Q', T_Q, DUR + 1, 'in'],
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
  // worst case: yanked at the hole by the outflow (lap belt holds her hips), left arm dragged out through the
  // opening, right hand braced, then grabbing at a mask she can't reach, then limp once she passes out
  const wpos = (b) => b.getWorldPosition(new THREE.Vector3());
  function poseWorst(t, ec, id) {
    const pull = smooth(0.5, 0.8, ec);
    if (pull <= 0) return;
    const out = id === 'K' ? smooth(T_K, T_K + 1.4, t) : id === 'DV' ? 1 : 0;
    const jit = (a, f) => Math.sin(t * f + a) * (1 - out);
    const hips = me.bones.Hips, hw = wpos(hips).add(P(-0.09 * pull, -0.01 * pull, -0.05 * pull));
    hips.position.copy(hips.parent.worldToLocal(hw)); me.root.updateMatrixWorld(true);
    const headT = P(winC.x + 0.17, winC.y - 0.03 - 0.08 * out, winC.z + 0.22).add(P(0.004 * jit(0, 31), 0.004 * jit(1, 27), 0));
    const hd = wpos(me.bones.Head);
    aimBone(me.bones.Spine1, hd, hd.clone().lerp(headT, pull)); me.root.updateMatrixWorld(true);
    const top = wpos(me.bones.HeadTop_End);
    aimBone(me.bones.Neck, top, top.clone().lerp(winC.clone().add(P(0.06, 0.04 - 0.25 * out, 0.06)), 0.55 * pull)); me.root.updateMatrixWorld(true);
    const sh = wpos(me.bones.LeftArm);
    const handOut = winC.clone().addScaledVector(winOut, 0.16).add(P(0, -0.02 + 0.01 * jit(2, 23), 0.02));
    const handT = wpos(me.bones.LeftHand).lerp(handOut, pull).lerp(sh.clone().add(P(-0.05, -0.5, 0.05)), out);
    twoBoneIK(me, 'LeftArm', 'LeftForeArm', 'LeftHand', handT, sh.clone().add(P(0.1, -0.35, 0.25)));
    const rs = wpos(me.bones.RightArm);
    let rT = P(seatA.x + 0.22, 0.66, seatA.z - 0.1);
    if (myMask.pos && (id === 'G' || id === 'V' || id === 'K')) {
      const late = P(-1.38 + 0.08 + 0.08 * Math.sin(2.3 * (t - 0.35 - T_G)), myMask.pos.y - 0.03, myMask.pos.z + 0.09);   // where the mask was a moment ago
      const reach = id === 'G' ? 0.5 * smooth(T_G + 2.2, T_V, t) : 0.82 + 0.1 * Math.sin((t - T_V) * 2.3);
      rT = rT.clone().lerp(rs.clone().lerp(late, Math.min(reach, 0.92)), id === 'G' ? smooth(T_G + 2.0, T_G + 3.2, t) : 1);
    }
    rT.lerp(P(seatA.x + 0.06, 0.6, seatA.z - 0.18), out);
    twoBoneIK(me, 'RightArm', 'RightForeArm', 'RightHand', rT, rs.clone().add(P(0.25, -0.4, 0.2)));
    me.root.updateMatrixWorld(true);
  }

  function frame(t, opts = {}) {
    const shot = shotAt(t), id = shot.id;
    const k = clamp((t - shot.t0) / (shot.t1 - shot.t0)), dk = easeInOut(k);
    const st = { tag: 'WHAT IF &nbsp;·&nbsp; 02', tagA: 1, labels: [] };
    let sat = 1.0, tint = [1.0, 1.0, 1.0], vignette = 0.45, aberr = 0.0015, fadeW = 0, fadeB = 0, shake = 0, tunnel = 0, scan = 0, exposure = 0.9, contrast = 1.04;
    let renderScene = scene, useOut = false;

    // ---------------- cabin state (shared by every cabin shot) ----------------
    const te = id === 'Q' ? 10.0 : t;                   // Q: back to the calm cruise, so the video loops
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
    myWin.shade.position.y = WIN.h + 0.07; myWin.shade.rotation.x = 0;
    const dive = id === 'DV' ? smooth(T_DV, T_DV + 1.5, t) : 0;
    const fog = broken ? smooth(0.3, 1.5, ec) * (1 - 0.4 * smooth(4, 16, ec)) * (1 - 0.45 * dive) : 0;
    scene.fog = fog > 0.001 ? new THREE.FogExp2('#cfd6df', 0.26 * fog) : null;
    outside.skyMat.uniforms.uVeil.value = clamp(fog * 0.55);
    const flick = broken && ec < 1.0 ? (Math.sin(t * 57) > 0.1 ? 1 : 0.25) : 1;
    const emerg = broken ? 0.7 : 1;
    wash.intensity = 1.1 * flick * emerg; downs.forEach((d) => { d.intensity = 1.6 * flick * emerg; }); hemi.intensity = 0.12 + 0.12 * fog;
    if (broken && ec > 0.2) drawMap('CABIN ALTITUDE', '', ''); else drawMap('11,000 m', '880 km/h', '−56 °C');
    // masks: doors pop, masks drop in front of every face and swing; in the dive they hang toward the nose
    const drop = broken ? clamp((ec - T_DROP_EC) / 0.32) : 0;
    const pitch = 0.22 * dive;
    for (const row of maskRows) {
      row.psu.doorPivot.rotation.x = broken ? -1.6 * smooth(T_DROP_EC - 0.05, T_DROP_EC + 0.08, ec) : 0;
      for (const m of row.list) {
        const vis = drop > 0;
        m.mask.visible = vis; m.tube.visible = vis;
        if (!vis) { m.pos = null; continue; }
        const tt = Math.max(0, ec - T_DROP_EC - 0.32);
        const bounce = drop < 1 ? 0 : Math.sin(tt * 11 + m.ph) * 0.05 * Math.exp(-tt * 2.2);
        const sway = Math.sin(t * 1.7 + m.ph) * 0.02 * (fog + 0.3);
        const L = m.L * easeIn(drop) - bounce;
        const swing = m === myMask && (id === 'G' || id === 'V' || id === 'K') ? (0.08 + 0.08 * Math.sin(2.3 * (t - T_G))) * smooth(T_G + 0.6, T_G + 1.6, t) : 0;   // hers swings toward the aisle, away from her hand
        m.pos = P(m.x + sway + swing, 1.64 - L * Math.cos(pitch), m.z - L * Math.sin(pitch) + sway * 0.6);
        m.mask.position.copy(m.pos); m.mask.rotation.set(0.15 + sway + pitch, Math.sin(m.ph) * 0.4, 0);
      }
    }

    // ---------------- her ----------------
    me.root.position.set(seatA.x + 0.02, -0.43, seatA.z + 0.06); me.root.rotation.y = Math.PI; me.root.updateMatrixWorld(true);
    poseMe(t, te, ec);
    if (shot.kind === 'in' && broken) poseWorst(t, ec, id);
    for (const row of maskRows) for (const m of row.list) {
      if (!m.mask.visible) continue;
      const a = P(m.x, 1.645, m.z), b = m.mask.position.clone().add(P(0, 0.11 * Math.cos(pitch), -0.02 - 0.11 * Math.sin(pitch)));
      m.tube.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.tube.scale.set(1, Math.max(0.01, a.distanceTo(b)), 1);
      m.tube.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
    }
    passengers.forEach((p) => {
      if (p.userData.rx === undefined) p.userData.rx = p.rotation.x;
      p.rotation.x = p.userData.rx + dive * (0.42 + 0.08 * Math.sin(p.userData.ph * 3));            // out cold in the dive
      p.rotation.z = broken ? Math.sin(t * 2 + p.userData.ph) * 0.06 * (1 - dive) + dive * 0.22 * Math.sign(Math.sin(p.userData.ph * 7)) : Math.sin(t * 0.3 + p.userData.ph) * 0.02;
    });

    // ---------------- cameras ----------------
    const hand = (a) => P(Math.sin(t * 1.3 + a) * 0.004, Math.sin(t * 1.7 + a) * 0.003, 0);
    if (shot.kind === 'in') {
      useOut = true; renderScene = scene;
      if (id === 'A') look(P(0.12, 1.52, lerp(1.85, 1.5, dk)).add(hand(0)), P(-1.1, 1.05, -1.6), 52);
      else if (id === 'B' || id === 'Q') look(P(lerp(-1.02, -1.08, dk), 1.42, lerp(-0.6, -0.66, dk)).add(hand(1)), P(-1.5, 1.08, seatA.z + 0.02), 52);
      else if (id === 'C') look(P(winC.x + 0.42, winC.y + 0.06, winC.z - 0.12).add(hand(2)), P(winC.x - 3, winC.y - 1.15, winC.z + 1.3), 62);
      else if (id === 'D') look(P(winC.x + lerp(0.4, 0.34, dk), winC.y + 0.03, winC.z + 0.3).add(hand(3)), P(winC.x, winC.y, winC.z), 40);
      else if (id === 'E') { look(P(-0.82, 1.46, -0.46).add(hand(4)), P(winC.x + 0.1, winC.y - 0.04, winC.z + 0.04), 48); shake = broken ? 0.012 * Math.exp(-ec * 3) + 0.002 : 0; }
      else if (id === 'R1') { look(P(lerp(-0.5, -0.56, dk), 1.36, lerp(0.2, 0.14, dk)).add(hand(4)), P(-1.7, 1.0, 0.02), 52); shake = 0.008 * Math.exp(-Math.max(0, ec - 0.5) * 2) + 0.003; }
      else if (id === 'R2') { look(P(lerp(-1.28, -1.32, dk), 1.4, lerp(-0.5, -0.46, dk)).add(hand(5)), P(-1.78, 0.95, -0.2), 50); shake = 0.004; }
      else if (id === 'G') look(P(-0.14, 1.3, -0.3).add(hand(6)), P(-1.62, lerp(1.25, 1.02, smooth(T_G, T_G + 1.2, t)), -0.02), 58);
      else if (id === 'V' || id === 'K') {
        // her eyes: the mask swinging just out of reach, the world closing in
        // over her right shoulder: her hand stretching for the mask, never quite getting there
        const tgt = (myMask.pos ? myMask.pos.clone() : P(-1.38, 1.1, -0.15)).add(P(0.01 * Math.sin(t * 1.3), -0.03, 0));
        look(P(-1.24, 1.22, 0.16), tgt.clone().add(P(-0.03, -0.09, 0.05)), 58, 0.06 * Math.sin(t * 0.9));
        shake = 0.004;
        tunnel = 0.3 + 0.62 * smooth(T_V, T_K + 0.6, t);
        fadeB = smooth(T_K + 0.3, T_K + 1.3, t);
      }
      else if (id === 'DV') { look(P(0.05, 1.55, -1.35).add(hand(5)), P(-1.25, 1.08, 0.05), 58, -0.06 * dive); shake = 0.006 * dive; fadeB = 1 - smooth(T_DV, T_DV + 0.8, t); tint = [1.04, 0.99, 0.97]; }
      if (id === 'E') fadeW = broken && ec < 0.05 ? 0.35 * (1 - ec / 0.05) : 0;
      if (tunnel > 0) { sat = 1 - 0.55 * Math.min(1, tunnel); aberr = 0.0015 + 0.01 * Math.min(1, tunnel); }
      exposure = 0.9 * (broken ? lerp(1, 0.86, fog) : 1);
    } else if (shot.kind === 'ext') {
      renderScene = s18;
      if (id === 'S1') look(P(-9.0 + 0.4 * dk, 1.6, -3.0 + 0.4 * dk), P(-2.2, -1.4, 4.2), 46);
      else look(P(lerp(-3.7, -3.2, dk), lerp(0.85, 0.7, dk), lerp(6.0, 5.5, dk)), jet2.hole.p.clone().add(P(-0.1, -0.05, 0.25)), 30);
      const r = rng(17);
      for (let i = 0; i < smoke.n; i++) {          // the failed engine trailing smoke
        const life = (t * 0.9 + r()) % 1, a = r() * 6.283, rr = 0.15 + r() * 0.55;
        const p = jet2.fan.clone().add(P(Math.cos(a) * rr * (0.4 + life), Math.sin(a) * rr * (0.4 + life) + life * 0.5, life * 15));
        const g = 0.16 + 0.12 * r();
        smoke.set(i, p.x, p.y, p.z, 0.45 + life * 2.8, 0.55 * (1 - life) * smooth(0, 0.08, life), g, g, g * 1.03, r() * 6);
      }
      smoke.commit();
      for (let i = 0; i < vent.n; i++) {           // cabin air blasting out of the broken window, swept back
        const life = (t * 1.7 + r()) % 1;
        const p = jet2.hole.p.clone().addScaledVector(jet2.hole.n, 0.04 + life * 0.55).addScaledVector(jet2.hole.ts, life * 5.0).add(P(0, (r() - 0.5) * 0.25 * life, 0));
        vent.set(i, p.x, p.y, p.z, 0.1 + life * 1.1, 0.5 * (1 - life), 0.92, 0.94, 0.97, r() * 6);
      }
      vent.commit();
      for (let i = 0; i < flow3.n; i++) {
        if (id !== 'S1') { flow3.set(i, 0, 0, 0, 0, 0, 1, 1, 1); continue; }
        const life = (t * 1.5 + r()) % 1, a = -1.2 - r() * 2.2, rr = 1.75 + r() * 1.4;
        const p = P(Math.sin(a) * rr, Math.cos(a) * rr, -2 + life * 16), p0 = project(p, cam), p1 = project(p.clone().add(P(0, 0, 0.6)), cam);
        flow3.set(i, p.x, p.y, p.z, id === 'S1' ? 0.016 : 0.008, (id === 'S1' ? 0.28 : 0.1) * Math.sin(Math.PI * life), 1, 1, 1, Math.atan2(-(p1.y - p0.y), p1.x - p0.x), 16);
      }
      flow3.commit();
      out3.cloudMat.uniforms.uOff.value.set(0, -t * 0.05); out3.cloudMat.uniforms.uCam.value.copy(cam.position);
      shake = 0.003; scan = 1.0; sat = 0.85; tint = [1.02, 1.0, 0.97]; aberr = 0.004; vignette = 0.7; exposure = 0.8; contrast = 1.12;
      st.labels.push({ x: W * 0.5, y: H * 0.115, a: 1, html: 'RECONSTRUCTION &nbsp;·&nbsp; 17 APRIL 2018' });
    } else if (shot.kind === 'nose') {
      renderScene = nose;
      pilot.setTime(t);
      // captain: hips inside, just under the top of the empty frame; back arched over the roof, face to the sky,
      // legs held inside the cockpit, arms dragged aft by the wind
      captPose.forEach(([b, q, p]) => { b.quaternion.copy(q); b.position.copy(p); });
      const { p: U, n, ts } = jet.holeTop;
      // pelvis: up axis out through the hole, front toward the nose; the spine then arches back over the frame
      const Yb = n.clone().addScaledVector(ts, 0.25).normalize();
      const Zb = ts.clone().negate().addScaledVector(Yb, ts.dot(Yb)).normalize(), Xb = new THREE.Vector3().crossVectors(Yb, Zb);
      capt.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xb, Yb, Zb));
      const wob = Math.sin(t * 2.3) * 0.04;
      offsetBone(capt, 'Spine', -0.2 + wob, 0, 0); offsetBone(capt, 'Spine1', -0.5, 0, 0); offsetBone(capt, 'Spine2', -0.5 - wob, 0, 0);
      offsetBone(capt, 'Neck', -0.1, 0, 0); offsetBone(capt, 'Head', -0.15 + Math.sin(t * 5.1) * 0.05, -0.6, 0.1);   // face turned away from the camera
      offsetBone(capt, 'LeftUpLeg', -1.0, 0, 0.1); offsetBone(capt, 'RightUpLeg', -1.0, 0, -0.1); offsetBone(capt, 'LeftLeg', 1.2, 0, 0); offsetBone(capt, 'RightLeg', 1.2, 0, 0);
      offsetBone(capt, 'LeftArm', 0.2 + Math.sin(t * 13.7) * 0.06, 0, 2.4 + Math.sin(t * 7.3) * 0.16 + Math.sin(t * 19.1) * 0.05); offsetBone(capt, 'RightArm', -0.3 + Math.sin(t * 11.3) * 0.06, 0, -1.9 + Math.sin(t * 6.1 + 1) * 0.2 + Math.sin(t * 17.3) * 0.05);
      offsetBone(capt, 'LeftForeArm', 0, -0.35 + Math.sin(t * 9.1) * 0.12, 0); offsetBone(capt, 'RightForeArm', 0, 0.45 + Math.sin(t * 8.3) * 0.12, 0);
      capt.root.position.set(0, 0, 0); capt.root.updateMatrixWorld(true);
      const hipsW = capt.bones.Hips.getWorldPosition(new THREE.Vector3());
      const hipsT = U.clone().addScaledVector(n, -0.11).addScaledVector(ts, -0.22);
      capt.root.position.add(hipsT.sub(hipsW));
      capt.root.updateMatrixWorld(true);
      // two crew hands on his belt, reaching from behind him inside the cockpit
      const hp = capt.bones.Hips.getWorldPosition(new THREE.Vector3());
      crew.arms.forEach((a, i) => {
        const sd = i ? 1 : -1, grip = hp.clone().addScaledVector(Xb, sd * 0.15).addScaledVector(Yb, 0.08).addScaledVector(Zb, -0.06);
        const up = n.clone().multiplyScalar(0.8).addScaledVector(ts, -0.5).addScaledVector(Xb, sd * 0.2).normalize();
        a.position.copy(grip); a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      });
      if (id === 'O') look(P(lerp(-5.5, -5.1, dk), lerp(0.25, 0.35, dk), lerp(-7.2, -6.8, dk)), P(-0.05, 1.35, -2.6), 30);
      else look(P(lerp(-2.95, -2.65, dk), lerp(0.85, 0.92, dk), lerp(-4.9, -4.6, dk)), P(-0.2, 1.12, -2.45), 34);
      const r = rng(13);
      for (let i = 0; i < flow.n; i++) { const life = (t * 1.4 + r()) % 1; const a = r() * 3.4 - 0.2, rr = 1.72 + r() * 0.6; const p = P(Math.cos(a) * rr, Math.sin(a) * rr, -3.5 + life * 12); const p0 = project(p, cam), p1 = project(p.clone().add(P(0, 0, 0.6)), cam); flow.set(i, p.x, p.y, p.z, 0.016, 0.3 * Math.sin(Math.PI * life), 1, 1, 1, Math.atan2(-(p1.y - p0.y), p1.x - p0.x), 16); }
      flow.commit();
      out2.cloudMat.uniforms.uOff.value.set(0, -t * 0.06); out2.cloudMat.uniforms.uCam.value.copy(cam.position);
      shake = 0.003; scan = 1.0; sat = 0.9; tint = [1.02, 1.0, 0.97]; aberr = 0.004; vignette = 0.7; exposure = 0.78; contrast = 1.14;
      st.labels.push({ x: W * 0.5, y: H * 0.115, a: 1, html: 'RECONSTRUCTION &nbsp;·&nbsp; 10 JUNE 1990' });
    }

    // debris, fog and the streaks of air: after the camera, so every frame depends on t alone
    if (shot.kind === 'in') {
      const ecR = (T_R1 - T_BRK) / 6;          // after shot E, everything flies up over her head and out the top of the opening
      for (const d of debris) {
        if (!broken) { d.mesh.position.copy(d.p0); d.mesh.rotation.copy(d.r0); d.mesh.visible = true; continue; }
        const path = (e) => {
          const tt = Math.max(0, e - d.d), u = clamp(tt / 0.9);
          const p = d.p0.clone().addScaledVector(winC.clone().sub(d.p0), easeIn(u) * (d.out ? 1.0 : 0.82)).add(P(0, Math.sin(tt * 9 + d.d * 20) * 0.04 * (1 - u), 0));
          if (d.out && u >= 1) p.addScaledVector(winOut, (tt - 0.9) * 8);
          return p;
        };
        const tt = Math.max(0, ec - d.d);
        let p;
        if (ec <= ecR) { p = path(ec); d.mesh.visible = !(d.out && tt > 1.3); }
        else {
          const p0 = path(ecR), u = clamp((ec - ecR) / 0.7), ctrl = P(-1.42, 1.42, -0.32), exitP = winC.clone().add(P(0, 0.11, 0));
          p = p0.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(ctrl, 2 * u * (1 - u)).addScaledVector(exitP, u * u);
          if (u >= 1) p.addScaledVector(winOut, (ec - ecR - 0.7) * 8);
          d.mesh.visible = ec - ecR < 0.85;
        }
        d.mesh.position.copy(p); d.mesh.rotation.set(d.r0.x + d.spin.x * tt, d.r0.y + d.spin.y * tt, d.r0.z + d.spin.z * tt);
      }
      const r = rng(5);
      for (let i = 0; i < fogPuffs.n; i++) {
        const x = -1.7 + r() * 3.4, y = 0.2 + r() * 2.0, z = seatA.z - 3 + r() * 6, ph = r();
        const pull = broken ? clamp((ec * 0.35 + ph) % 1) : 0;
        const pp = P(x, y, z).lerp(winC, pull * 0.6);
        fogPuffs.set(i, pp.x, pp.y + Math.sin(t * 0.7 + i) * 0.05, pp.z, 0.5 + r() * 0.9, fog * (0.1 + 0.16 * r()) * (1 - pull * 0.5) * (id === 'R1' || id === 'R2' ? 0.5 : 1), 0.9, 0.93, 0.97, r() * 6);
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

    // the view outside follows the cabin camera (and tips nose-down in the dive)
    outPass.enabled = useOut;
    R.renderPass.clear = !useOut; R.renderPass.clearDepth = useOut;
    if (useOut) {
      farCam.position.copy(cam.position); farCam.quaternion.copy(cam.quaternion); farCam.fov = cam.fov; farCam.updateProjectionMatrix(); farCam.updateMatrixWorld();
      outside.group.rotation.x = 0.22 * dive;
      outside.cloudMat.uniforms.uCam.value.copy(farCam.position); outside.cloudMat.uniforms.uOff.value.set(t * 0.012, 0);
      outside.clouds.position.y = -8600 + 4200 * smooth(T_DV, T_S1, t) * (id === 'DV' ? 1 : 0);
    }
    const wantFar = renderScene === nose || renderScene === s18 ? 300000 : 80;
    if (cam.far !== wantFar) { cam.far = wantFar; cam.near = wantFar > 80 ? 0.1 : 0.02; cam.updateProjectionMatrix(); }

    // ---------------- HUD ----------------
    const hud = (lab, val, sub, valColor = '') => { st.hud = { a: 1, lab, val, sub, sub2: '', valColor }; };
    const fmt = (n) => Math.round(n).toLocaleString('en-US');
    if (id === 'B') hud('Cruising altitude', '11,000 m', '880 km/h');
    else if (id === 'C') hud('Outside', '−56 °C', 'Air: 22% of sea level');
    else if (id === 'D') hud('Force on this window', '≈ 500 kg', 'Cabin 0.75 bar · outside 0.23 bar');
    else if (id === 'E') hud('Time slowed', '6×', broken ? 'Window gone' : '');
    else if (id === 'R1') hud('Air at the hole', '≈ 1,100 km/h', 'The speed of sound');
    else if (id === 'R2') hud('Pushing you in', '≈ 500 kg', 'The same half ton');
    else if (id === 'G') hud('Cabin altitude', '11,000 m', 'Masks drop above 4,300 m');
    else if (id === 'V') hud('Useful consciousness', timer(30 - ec), 'Without oxygen · shown fast', RED);
    else if (id === 'K') { hud('Useful consciousness', '0:00', '', RED); st.hud.a = 1 - smooth(T_K + 0.4, T_K + 1.2, t); }
    else if (id === 'DV') hud('Emergency dive', `${fmt(Math.round(lerp(11000, 3000, easeInOut(smooth(T_DV + 0.5, T_S1 - 0.3, t))) / 100) * 100)} m`, 'About 4 minutes, shown fast');
    else if (id === 'S1') hud('Southwest 1380', '9,800 m', 'Engine failure');
    else if (id === 'S2') hud('Window seat', 'ROW 14', 'Lap belt on');
    else if (id === 'O') hud('British Airways 5390', '5,300 m', 'Cockpit windscreen blew out');
    else if (id === 'P') hud('The captain', 'SURVIVED', 'Held by his crew for 20 minutes');
    if (t < 3.6) st.title = { html: TITLE, a: Math.min(smooth(0, 0.35, t), 1 - smooth(3.2, 3.55, t)), k: smooth(0, 0.6, t) };
    const c = captionAt(CAPTIONS, t); if (c) st.caption = c;
    if (opts.cover) { st.title = { html: TITLE, a: 1, k: 1 }; st.caption = null; st.hud = null; st.labels = []; }

    // ---------------- grade ----------------
    R.renderer.toneMappingExposure = exposure;
    R.bloom.strength = 0.25; R.bloom.radius = 0.5; R.bloom.threshold = 0.95;
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uSat.value = sat; U.uTint.value.set(...tint); U.uVignette.value = vignette; U.uAberr.value = aberr; U.uFade.value = fadeB; U.uFadeWhite.value = fadeW;
    U.uTunnel.value = Math.min(1, tunnel); U.uScan.value = scan; U.uContrast.value = contrast;
    const sr = rng(Math.floor(t * 30) + 3); U.uShake.value.set((sr() - 0.5) * shake, (sr() - 0.5) * shake);
    R.renderPass.scene = renderScene; R.renderPass.camera = cam;
    R.composer.render(); ov.apply(st);
  }
  await Promise.all(TEX_PENDING);
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
