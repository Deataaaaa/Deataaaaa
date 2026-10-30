// Props for « 12 % » Saison 2 · Partie 2 (Le traceur): Inès's camel wool coat with its burgundy satin lining, and the tracker
// someone slipped into that lining at the bar (a generic black tag: no brand's shape, logo or wording). Season 1 Inès never wore a
// coat on screen; from S2 she carries it folded (S2 P1 too, for continuity).
//   makeCoat('hang')   held by its fold in a fist, both halves hanging (the fold runs along the fist: local x), hem at y < 0
//   makeCoat('drape')  over a bar along local x (a stool's back, a forearm), both halves hanging
//   makeCoat('flat')   folded flat on a seat or a lap (x across, z along the seat, y up from the cushion)
// Every coat is two skins 7 mm apart (wool outside, lining inside) closed by bands along its edges; coat.boxes gives rough boxes
// in its own frame for the contact checks, coat.pocket (flat only) the opening of the inside pocket.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TH = 0.007;
let WOOL = null, LINING = null;
function cloth() {
  if (WOOL) return { wool: WOOL, lining: LINING };
  // wool: a fine twill with a soft fibre noise (tileable), and its bump; lining: satin with a faint sheen ripple
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'), im = c.createImageData(N, N);
  const bv = document.createElement('canvas'); bv.width = bv.height = N; const b = bv.getContext('2d'), bi = b.createImageData(N, N);
  const h = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const tw = 0.5 + 0.5 * Math.sin(((x + y) % 8) / 8 * Math.PI * 2), n = h(x % N, y % N), v = 0.86 + 0.08 * tw + 0.1 * (n - 0.5);
    const i = 4 * (y * N + x); im.data[i] = 172 * v; im.data[i + 1] = 120 * v; im.data[i + 2] = 74 * v; im.data[i + 3] = 255;
    const bb = 128 + 60 * tw + 50 * (n - 0.5); bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = bb; bi.data[i + 3] = 255;
  }
  c.putImageData(im, 0, 0); b.putImageData(bi, 0, 0);
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(9, 9); map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(bv); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(9, 9); bump.anisotropy = 8;
  WOOL = new THREE.MeshStandardMaterial({ color: '#ffffff', map, bumpMap: bump, bumpScale: 0.6, roughness: 0.93, metalness: 0, side: THREE.FrontSide });
  WOOL.sheen = 0;
  LINING = new THREE.MeshPhysicalMaterial({ color: '#43101a', roughness: 0.4, metalness: 0, sheen: 0.35, sheenColor: new THREE.Color('#a05a66'), sheenRoughness: 0.45, side: THREE.FrontSide });
  return { wool: WOOL, lining: LINING };
}

// a skin from a grid of points P[j][i] (j along the cloth, i across), with an offset copy along the normals; edges closed
function skins(P, nu, nv, wool, lining) {
  const pos = [], uv = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const p = P(i / nu, j / nv); pos.push(p.x, p.y, p.z); uv.push(i / nu * 0.5, j / nv * 1.5); }
  const idx = []; for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, c, b, d, c); }   // (u, v) x (+u) faces out
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // the inner skin: the same grid pushed TH along -normal, faces reversed (its front faces look inward)
  const n = g.attributes.normal, pin = new Float32Array(pos.length);
  for (let k = 0; k < pos.length / 3; k++) for (let a = 0; a < 3; a++) pin[3 * k + a] = pos[3 * k + a] - TH * n.array[3 * k + a];
  const gi = new THREE.BufferGeometry(); gi.setAttribute('position', new THREE.BufferAttribute(pin, 3)); gi.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const idi = []; for (let k = 0; k < idx.length; k += 3) idi.push(idx[k], idx[k + 2], idx[k + 1]); gi.setIndex(idi); gi.computeVertexNormals();
  // bands along the four edges: outer edge point to inner edge point
  const band = [], bi = []; let m = 0;
  const edge = (list) => { for (let s = 0; s < list.length - 1; s++) { const [a, b] = [list[s], list[s + 1]];
    for (const k of [a, b]) band.push(pos[3 * k], pos[3 * k + 1], pos[3 * k + 2], pin[3 * k], pin[3 * k + 1], pin[3 * k + 2]);
    bi.push(m, m + 1, m + 2, m + 1, m + 3, m + 2, m, m + 2, m + 1, m + 1, m + 2, m + 3); m += 4; } };
  const row = (j) => Array.from({ length: nu + 1 }, (_, i) => j * (nu + 1) + i), col = (i) => Array.from({ length: nv + 1 }, (_, j) => j * (nu + 1) + i);
  edge(row(0)); edge(row(nv)); edge(col(0)); edge(col(nu));
  const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.Float32BufferAttribute(band, 3)); gb.setIndex(bi); gb.computeVertexNormals();
  const grp = new THREE.Group();
  const outer = new THREE.Mesh(g, wool), inner = new THREE.Mesh(gi, lining), edges = new THREE.Mesh(gb, new THREE.MeshStandardMaterial({ color: '#8a6440', roughness: 0.9, side: THREE.DoubleSide }));
  for (const o of [outer, inner, edges]) { o.castShadow = true; o.receiveShadow = true; grp.add(o); }
  return grp;
}

export function makeCoat(kind = 'hang', o = {}) {
  const { wool, lining } = cloth(), V = (x, y, z) => new THREE.Vector3(x, y, z), g = new THREE.Group();
  const fold = (s, a, k) => Math.sin(s * Math.PI * 2 * k + a);
  if (kind === 'hang' || kind === 'drape') {
    // the path across the fold: front half down from the top, round the top (radius r), back half down; s = 0..1 front hem → back hem
    const hang = kind === 'hang', r = o.r ?? (hang ? 0.03 : 0.022), w0 = o.w0 ?? (hang ? 0.075 : 0.34), w1 = o.w1 ?? (hang ? 0.23 : 0.36);
    const Lf = o.front ?? (hang ? 0.46 : 0.42), Lb = o.back ?? (hang ? 0.5 : 0.47), A = Lf + Math.PI * r + Lb;
    const P = (u, v) => {
      const s = v * A; let y, z, d;                                             // d: depth below the top (folds and flare grow with it)
      if (s < Lf) { d = Lf - s; y = -d; z = r; }
      else if (s < Lf + Math.PI * r) { const th = (s - Lf) / r; y = r * Math.sin(th) - (hang ? 0 : 0); z = r * Math.cos(th); d = 0; }
      else { d = s - Lf - Math.PI * r; y = -d; z = -r; }
      const side = s < Lf + Math.PI * r / 2 ? 1 : -1, dn = Math.min(1, d / Math.max(Lf, Lb));
      const w = w0 + (w1 - w0) * Math.pow(Math.min(1, d / 0.18), 0.7), x = (u - 0.5) * w;
      const flare = (hang ? 0.022 : 0.02) * Math.pow(dn, 1.4) + (hang ? 0.01 : 0) * Math.pow(Math.min(1, d / 0.06), 0.5);
      const fz = (0.017 + 0.006 * side) * Math.pow(dn, 0.8) * (fold(u, side > 0 ? 0.4 : 1.9, side > 0 ? 2.2 : 2.9) + 0.45 * fold(u, side > 0 ? 2.1 : 0.6, side > 0 ? 5.3 : 6.1));   // two sets of folds: no board
      const hem = d > 0.02 ? (0.016 + 0.01 * side) * Math.pow(dn, 2) * fold(u, side > 0 ? 2.2 : 0.9, 1.3) : 0;
      return V(x + 0.006 * dn * fold(v, 0.7, 2), y + hem, z + side * (flare + fz));
    };
    g.add(skins(P, 18, 64, wool, lining));
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, Lb * 0.86, 20, 1, true), wool); sl.material = wool;
    sl.position.set(-w1 * 0.28, -Lb * 0.47, -r - 0.045 - (hang ? 0.012 : 0.006)); sl.rotation.z = 0.05; sl.castShadow = true; g.add(sl);
    const slIn = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), lining); slIn.rotation.x = Math.PI / 2; slIn.position.set(sl.position.x + 0.022, -Lb * 0.9 + 0.002, sl.position.z); g.add(slIn);
    const btnM = new THREE.MeshStandardMaterial({ color: '#3b2a1e', roughness: 0.35 });
    for (let k = 0; k < 3; k++) { const d = 0.1 + k * 0.11, bt = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.005, 16), btnM);
      const p = P(0.86, (Lf - d) / A); bt.position.set(p.x, p.y, p.z + 0.004); bt.rotation.x = Math.PI / 2; g.add(bt); }
    g.userData.top = V(0, r, 0);
    // the halves as thin slabs (the gap between them stays free: a hand can go in), the fold over the top, the sleeve
    const fl = hang ? 0.022 : 0.02, sz = (side, L) => side * (r + TH / 2 + fl * 0.45 + 0.01);
    // (the halves' boxes start under the fold, where the arm or the bar sits: y below -(r + 1 cm))
    const y0 = r + 0.01;
    g.boxes = [{ c: V(0, -(Lf + y0) / 2, sz(1, Lf)), h: V(w1 / 2 + 0.01, Math.max(0.005, (Lf - y0) / 2), fl * 0.55 + 0.034), nm: 'coat front' }, { c: V(0, -(Lb + y0) / 2, sz(-1, Lb)), h: V(w1 / 2 + 0.01, Math.max(0.005, (Lb - y0) / 2), fl * 0.55 + 0.034), nm: 'coat back' },
      { c: V(0, r * 0.4, 0), h: V(w0 / 2 + 0.01, r * 0.65 + TH, r + TH), nm: 'coat fold' }, { c: V(-w1 * 0.28, -Lb * 0.47, -r - 0.05), h: V(0.046, Lb * 0.43, 0.046), nm: 'coat sleeve' }];
  } else {
    // folded in four, about 44 x 40 cm and 6 cm thick; the top layer (the coat's front panel) is a flap hinged along the far edge (+z):
    // coat.flap(a) lifts its near edge, showing the lining and the inside pocket's welt (where the tracker sits)
    const W = o.w ?? 0.44, D = o.d ?? 0.4, H = o.h ?? 0.06, ft = 0.012;
    const base = new THREE.Mesh(new RoundedBoxGeometry(W, H - ft, D, 4, 0.02), wool); base.position.y = (H - ft) / 2;
    const lin = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.03, D - 0.03), lining); lin.rotation.x = -Math.PI / 2; lin.position.y = H - ft + 0.0008;
    const welt = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.003, 0.02, 2, 0.001), new THREE.MeshStandardMaterial({ color: '#3a0c14', roughness: 0.5 }));
    welt.position.set(-0.06, H - ft + 0.0022, -0.06);
    const hinge = new THREE.Group(); hinge.position.set(0, H - ft, D / 2 - 0.01);
    const flapO = new THREE.Mesh(new RoundedBoxGeometry(W, ft, D - 0.01, 3, 0.005), wool); flapO.position.set(0, ft / 2, -(D - 0.01) / 2);
    const flapL = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, D - 0.03), lining); flapL.rotation.x = Math.PI / 2; flapL.position.set(0, -0.0006, -(D - 0.01) / 2);
    hinge.add(flapO, flapL);
    const cuff = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.035, 0.3, 3, 0.012), wool); cuff.position.set(W / 2 - 0.03, H - 0.012, 0.02);
    for (const m of [base, lin, welt, flapO, flapL, cuff]) { m.castShadow = true; m.receiveShadow = true; }
    g.add(base, lin, welt, hinge, cuff);
    g.flap = (a) => { hinge.rotation.x = a; };
    g.pocket = { c: V(-0.06, H - ft + 0.004, -0.06), w: 0.16 };
    g.boxes = [{ c: V(0, H / 2, 0), h: V(W / 2, H / 2, D / 2), nm: 'coat' }];
  }
  return g;
}

// the tracker: a black rounded square tag, 34 x 34 x 7.5 mm, a ring hole in one corner, a pin-head status LED; tag.blink(k) sets it
export function makeTracker() {
  const g = new THREE.Group();
  const shape = new THREE.Shape(); const s = 0.017, rr = 0.007;
  shape.moveTo(-s + rr, -s); shape.lineTo(s - rr, -s); shape.quadraticCurveTo(s, -s, s, -s + rr); shape.lineTo(s, s - rr); shape.quadraticCurveTo(s, s, s - rr, s);
  shape.lineTo(-s + rr, s); shape.quadraticCurveTo(-s, s, -s, s - rr); shape.lineTo(-s, -s + rr); shape.quadraticCurveTo(-s, -s, -s + rr, -s);
  const hole = new THREE.Path(); hole.absarc(-s + 0.0068, s - 0.0068, 0.0028, 0, Math.PI * 2, true); shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.0055, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0012, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, 0, -0.00275);
  const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#131416', roughness: 0.55, metalness: 0.05 })); body.castShadow = true; g.add(body);
  // a slightly glossier face panel, and the LED
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.022), new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.3 })); face.position.set(0.002, -0.002, 0.00376); g.add(face);
  const ledM = new THREE.MeshStandardMaterial({ color: '#0a0a0a', emissive: '#7cff9a', emissiveIntensity: 0 });
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.0011, 12), ledM); led.position.set(0.011, -0.011, 0.00378); g.add(led);
  g.blink = (k) => { ledM.emissiveIntensity = 3 * k; };
  g.box = { c: new THREE.Vector3(0, 0, 0), h: new THREE.Vector3(0.0182, 0.0182, 0.0039), nm: 'tracker' };
  return g;
}
