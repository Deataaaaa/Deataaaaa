// Post 13's props: the Westminster litter bin (always empty), the rubbish its neighbour drops next to it (a pile built
// item by item on a height grid, so it grows into a heap at the angle of repose), a red K6 telephone box, the crowd's
// phones, the archer's bow. Units: metres; every prop stands on y = 0 at its origin.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const colorGeo = (g, c) => { const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([col.r, col.g, col.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const nonIndexed = (g) => (g.index ? g.toNonIndexed() : g);

// ---------- the bin: black powder-coated steel, a domed hood with the slot on its side, a gold band ----------
export const BIN = { R: 0.27, H: 1.02 };
export function makeBin() {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: '#0d0e0f', roughness: 0.42, metalness: 0.55 });
  const gold = new THREE.MeshStandardMaterial({ color: '#b08a3e', roughness: 0.3, metalness: 1 });
  const inside = new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.9, side: THREE.BackSide });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(BIN.R, BIN.R * 0.93, 0.78, 40), black); body.position.y = 0.42; body.castShadow = true; g.add(body);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(BIN.R * 0.8, BIN.R * 0.85, 0.05, 32), black); foot.position.y = 0.025; g.add(foot);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(BIN.R + 0.004, BIN.R + 0.004, 0.06, 40, 1, true), gold); band.position.y = 0.72; g.add(band);
  // the hood: a dome over a short collar with an opening (the slot) on the +z side
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(BIN.R * 1.02, BIN.R * 1.02, 0.17, 40, 1, true, Math.PI * 0.32, Math.PI * 2 - Math.PI * 0.64), black);
  collar.position.y = 0.895; collar.castShadow = true; g.add(collar);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(BIN.R * 1.04, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), black); dome.scale.y = 0.42; dome.position.y = 0.98; dome.castShadow = true; g.add(dome);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), gold); knob.position.y = 0.98 + BIN.R * 0.42; g.add(knob);
  const well = new THREE.Mesh(new THREE.CylinderGeometry(BIN.R * 0.97, BIN.R * 0.97, 0.9, 32, 1, true), inside); well.position.y = 0.5; g.add(well);   // empty inside
  const floorIn = new THREE.Mesh(new THREE.CircleGeometry(BIN.R * 0.96, 32), new THREE.MeshStandardMaterial({ color: '#070707', roughness: 1 })); floorIn.rotation.x = -Math.PI / 2; floorIn.position.y = 0.08; g.add(floorIn);
  // the crest plate (a small gold shield) on the band, facing +z
  const sh = new THREE.Shape(); sh.moveTo(-0.05, 0.05); sh.lineTo(0.05, 0.05); sh.lineTo(0.05, -0.01); sh.quadraticCurveTo(0.05, -0.05, 0, -0.07); sh.quadraticCurveTo(-0.05, -0.05, -0.05, -0.01); sh.lineTo(-0.05, 0.05);
  const crest = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }), gold); crest.position.set(0, 0.6, BIN.R + 0.002); g.add(crest);
  return g;
}

// ---------- rubbish ----------
// types: [geometry (vertex colours), half-height when lying, footprint radius, weight in the early / late mix]
function crumple(g, amp, seed) { const p = g.attributes.position, r = rng(seed); for (let i = 0; i < p.count; i++) { const k = 1 + amp * (r() - 0.5); p.setXYZ(i, p.getX(i) * k, p.getY(i) * (1 + amp * (r() - 0.5)), p.getZ(i) * k); } g.computeVertexNormals(); return g; }
function makeTypes() {
  const T = [];
  { // coffee cup: white, a brown sleeve, a white lid (lying on its side)
    const cup = colorGeo(nonIndexed(new THREE.CylinderGeometry(0.045, 0.032, 0.12, 20)), '#efeae2');
    const sleeve = colorGeo(nonIndexed(new THREE.CylinderGeometry(0.0445, 0.039, 0.05, 20, 1, true)), '#8a5a33'); sleeve.translate(0, 0.004, 0); sleeve.scale(1.02, 1, 1.02);
    const lid = colorGeo(nonIndexed(new THREE.CylinderGeometry(0.047, 0.047, 0.012, 20)), '#f7f7f5'); lid.translate(0, 0.066, 0);
    const g = mergeGeometries([cup, sleeve, lid]); g.rotateZ(Math.PI / 2); T.push({ g, h: 0.045, r: 0.07, w: [3, 2], tint: false });
  }
  { const g = colorGeo(nonIndexed(new THREE.CylinderGeometry(0.033, 0.033, 0.115, 18)), '#ffffff'); g.rotateZ(Math.PI / 2); T.push({ g, h: 0.033, r: 0.06, w: [3, 2], tint: ['#c8102e', '#b9bcc0', '#1b6e3a', '#1f4fa3', '#f0c419', '#111111'] }); }
  { const b = colorGeo(nonIndexed(new THREE.CylinderGeometry(0.034, 0.036, 0.19, 16)), '#9fd0e6'); const n = colorGeo(nonIndexed(new THREE.CylinderGeometry(0.013, 0.03, 0.05, 12)), '#9fd0e6'); n.translate(0, 0.12, 0);
    const c = colorGeo(nonIndexed(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 12)), '#1e5fd6'); c.translate(0, 0.155, 0);
    const g = mergeGeometries([b, n, c]); g.rotateZ(Math.PI / 2); T.push({ g, h: 0.035, r: 0.1, w: [2, 1.5], tint: false }); }
  { const g = crumple(nonIndexed(new RoundedBoxGeometry(0.16, 0.035, 0.22, 2, 0.015)), 0.25, 3); colorGeo(g, '#ffffff'); T.push({ g, h: 0.02, r: 0.12, w: [2, 1.5], tint: ['#d7261e', '#1d5bbf', '#f2c200', '#2e9e3e', '#7a2ca0'] }); }
  { const g = colorGeo(nonIndexed(new THREE.BoxGeometry(0.34, 0.04, 0.34)), '#a87a4a'); T.push({ g, h: 0.02, r: 0.22, w: [0.6, 1.6], tint: false }); }
  { const g = crumple(nonIndexed(new THREE.BoxGeometry(0.2, 0.26, 0.12, 3, 3, 3)), 0.18, 7); colorGeo(g, '#b48a5c'); g.rotateX(Math.PI / 2); T.push({ g, h: 0.06, r: 0.15, w: [0.8, 1], tint: false }); }
  { const g = colorGeo(nonIndexed(new THREE.BoxGeometry(0.13, 0.075, 0.13)), '#ffffff'); T.push({ g, h: 0.038, r: 0.09, w: [1, 1], tint: ['#e8e2d4', '#d0342c'] }); }
  { const g = crumple(nonIndexed(new THREE.SphereGeometry(0.27, 18, 12)), 0.12, 11); g.scale(1.1, 0.8, 0.95); colorGeo(g, '#ffffff');
    const knot = colorGeo(nonIndexed(new THREE.ConeGeometry(0.05, 0.12, 8)), '#ffffff'); knot.translate(0, 0.25, 0); const gg = mergeGeometries([g, knot]); T.push({ g: gg, h: 0.21, r: 0.3, w: [0, 0.9], tint: ['#141516', '#141516', '#d8dadc', '#cfd6dd', '#2f5f8a'], bag: true }); }
  { const g = crumple(nonIndexed(new THREE.BoxGeometry(0.3, 0.02, 0.4, 2, 1, 2)), 0.3, 13); colorGeo(g, '#d9d6cf'); T.push({ g, h: 0.012, r: 0.22, w: [0.6, 0.6], tint: false }); }
  return T;
}
// build the pile once: n items in order of appearance, each laid on the mound as it is when that item lands (a cone
// that only grows: height 2.5 m and radius 1.5 m at n items), tilted to its slope; keepOut(x, z) excludes the bin
export function buildPile(n, { cx = 0, cz = 0, seed = 19, keepOut = () => false, top = 2.5, rad = 1.5 } = {}) {
  const T = makeTypes(), r = rng(seed), items = [];
  const Hk = (k) => Math.max(0.03, top * Math.pow(k / n, 0.62)), Rk = (k) => 0.25 + (rad - 0.25) * Math.pow(k / n, 0.45);
  const surf = (d, k) => Hk(k) * Math.max(0, 1 - Math.pow(d / Rk(k), 1.6));
  for (let k = 0; k < n; k++) {
    const late = Math.min(1, k / (n * 0.6));
    const ws = T.map((t) => t.w[0] * (1 - late) + t.w[1] * late), tot = ws.reduce((a2, b2) => a2 + b2, 0);
    let u = r() * tot, ti = 0; while (u > ws[ti]) { u -= ws[ti]; ti++; }
    if (k < 8) ti = [0, 1, 0, 0, 1, 0, 2, 0][k];                       // the first ones: coffee cups and cans (the hook's cup is white)
    const t = T[ti];
    let x, z, d, tries = 0;
    do { const a2 = r() * Math.PI * 2; d = Rk(k) * Math.sqrt(r()) * 0.97; x = cx + Math.cos(a2) * d; z = cz + Math.sin(a2) * d; } while (keepOut(x, z) && ++tries < 50);
    const h = surf(d, k), dh = (surf(d + 0.02, k) - surf(Math.max(0, d - 0.02), k)) / 0.04, slope = Math.atan(-dh);
    const yaw = r() * Math.PI * 2, out = Math.atan2(z - cz, x - cx);
    // lie on the slope: a random spin about the vertical, then tilted outward by the slope (plus a little jitter)
    const q = new THREE.Quaternion().setFromAxisAngle(V(-Math.sin(out), 0, Math.cos(out)), -slope + (r() - 0.5) * 0.5)
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.35, yaw, (r() - 0.5) * 0.35, 'YXZ')));
    const y = h + t.h * (t.bag ? 0.55 : 0.8) * Math.cos(slope);
    const tint = t.tint ? t.tint[Math.floor(r() * t.tint.length)] : '#ffffff';
    items.push({ k: items.length, ti, p: V(x, y, z), q, tint, top: Hk(k) });
  }
  return { T, items, height: () => Hk(n) };
}
// the pile as instanced meshes; show(count) sets how many items exist (in order), extra = one item in flight
export function pileMeshes(P) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 });
  const bagMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.28, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const group = new THREE.Group(), meshes = P.T.map((t, ti) => {
    const list = P.items.filter((it) => it.ti === ti);
    const m = new THREE.InstancedMesh(t.g, t.bag ? bagMat : mat, Math.max(1, list.length)); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    list.forEach((it, i) => { m4.compose(it.p, it.q, V(1, 1, 1)); m.setMatrixAt(i, m4); m.setColorAt(i, c.set(it.tint)); it.slot = i; });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    group.add(m); return { m, list };
  });
  return {
    group,
    show(count) { meshes.forEach(({ m, list }) => { let c = 0; for (const it of list) if (it.k < count) c++; else break; m.count = c; }); },
    meshes,
  };
}
// a single loose item (the one in his hand / in flight)
export function looseItem(P, k) { const it = P.items[k], t = P.T[it.ti]; const m = new THREE.Mesh(t.g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  m.material.color = new THREE.Color(it.tint); m.castShadow = true; return m; }

// ---------- a red K6 telephone box (0.91 m square, 2.5 m tall), its door toward +z ----------
export function makePhoneBox() {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: '#b3121b', roughness: 0.38, metalness: 0.15 });
  const glass = new THREE.MeshStandardMaterial({ color: '#0b0c0d', roughness: 0.08, emissive: '#ffd9a0', emissiveIntensity: 0.25 });
  const sign = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveIntensity: 1.1 });
  const W = 0.91, Hh = 2.2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.12, W + 0.06), red); base.position.y = 0.06; g.add(base);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, Hh, 0.1), red); p.position.set(x * (W / 2 - 0.05), Hh / 2 + 0.1, z * (W / 2 - 0.05)); p.castShadow = true; g.add(p); }
  // four sides: glazing bars (3 x 8 panes) over a glowing glass sheet, the TELEPHONE sign above
  for (let s = 0; s < 4; s++) {
    const side = new THREE.Group(); side.rotation.y = s * Math.PI / 2;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 1.75), glass); pane.position.set(0, 1.1, W / 2 - 0.03); side.add(pane);
    for (let i = 0; i <= 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.78, 0.04), red); b.position.set(-(W - 0.2) / 2 + i * (W - 0.2) / 3, 1.1, W / 2 - 0.02); side.add(b); }
    for (let j = 0; j <= 8; j++) { const b = new THREE.Mesh(new THREE.BoxGeometry(W - 0.18, 0.03, 0.04), red); b.position.set(0, 0.22 + j * 1.75 / 8, W / 2 - 0.02); side.add(b); }
    const frieze = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, 0.06), red); frieze.position.set(0, 2.1, W / 2 - 0.02); side.add(frieze);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 40; const c = cv.getContext('2d'); c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 256, 40); c.fillStyle = '#111'; c.font = '600 26px Inter'; c.textAlign = 'center'; c.fillText('TELEPHONE', 128, 30);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.095), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: tx, emissiveIntensity: 1.0 })); sg.position.set(0, 2.1, W / 2 + 0.012); side.add(sg);
    g.add(side);
  }
  // the domed roof: two crossed vaults over a cornice, the crowns on each side
  const cor = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, 0.08, W + 0.08), red); cor.position.y = 2.24; g.add(cor);
  for (const r of [0, Math.PI / 2]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(W / 2 + 0.04, W / 2 + 0.04, W + 0.08, 24, 1, false, -Math.PI / 2, Math.PI), red); v.rotation.set(0, r, Math.PI / 2); v.scale.set(0.42, 1, 1); v.position.y = 2.28; v.castShadow = true; g.add(v); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), red); top.position.y = 2.47; g.add(top);
  g.userData.roof = 2.5;
  return g;
}

// ---------- the crowd's phones (one shared glowing camera screen) ----------
export function crowdPhone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.072, 0.15, 0.008, 3, 0.004), new THREE.MeshStandardMaterial({ color: '#1e1f22', roughness: 0.35, metalness: 0.6 })); g.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#c8d4ff', emissiveIntensity: 0.9, roughness: 0.1 })); scr.position.z = 0.0042; g.add(scr);
  g.screen = scr; return g;
}

// ---------- the archer's bow (a recurve arc with its string), held at its middle ----------
export function makeBow(mat) {
  const g = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.018, 8, 40, 2.0), mat); arc.rotation.z = Math.PI / 2 - 1.0; arc.position.x = -0.75 * Math.cos(0) + 0.0; g.add(arc);
  const s0 = V(-0.75 + 0.75 * Math.cos(1.0), 0.75 * Math.sin(1.0), 0), s1 = V(s0.x, -s0.y, 0);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, s0.distanceTo(s1), 6), mat); str.position.set(s0.x, 0, 0); g.add(str);
  return g;
}
