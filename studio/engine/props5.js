// Post 5 props: a striped beach towel, a banana, a fidget spinner (the WTF), a sand mound for the person buried in the
// black sand. All PBR, sized in metres.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';
import { canvasTex } from './assets.js';
import { heatize } from './paris.js';
import { groundY } from './guarapari.js';

function towelTex(seed, cols) {
  return canvasTex(512, 1024, (g, w, h) => {
    const r = rng(seed); let y = 0, k = 0;
    while (y < h) { const s = 40 + r() * 70; g.fillStyle = cols[k++ % cols.length]; g.fillRect(0, y, w, s + 1); y += s; }
    for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 1, 2); }   // terry loops
    g.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = 0; x < w; x += 6) { g.fillRect(x, 0, 3, 14); g.fillRect(x, h - 14, 3, 14); }   // fringe
  });
}
// a towel laid on the sand: follows the ground plus soft folds; returns the mesh and its top height function
export function makeTowel(cx, cz, yaw, { w = 0.9, l = 1.8, seed = 3, cols = ['#1f5fa8', '#f1ece2', '#e2a21c', '#f1ece2'] } = {}) {
  const g = new THREE.PlaneGeometry(w, l, 30, 60); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, r = rng(seed), c = Math.cos(yaw), s = Math.sin(yaw);
  const folds = [0, 1, 2].map(() => [r() * 6.28, 3 + r() * 6, r() * 6.28]);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), wx = cx + x * c + z * s, wz = cz - x * s + z * c;
    let y = groundY(wx, wz) + 0.006; folds.forEach(([a, f, ph]) => { y += 0.004 * Math.sin((x * Math.cos(a) + z * Math.sin(a)) * f + ph); });
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  const mat = heatize(new THREE.MeshStandardMaterial({ map: towelTex(seed, cols), roughness: 0.95 }), { organic: 1 });
  const m = new THREE.Mesh(g, mat); m.position.set(cx, 0, cz); m.rotation.y = yaw; m.receiveShadow = true; m.castShadow = true;
  return m;
}

// banana: a curved, slightly five-sided tube, yellow with a green stalk end and a brown tip
export function makeBanana() {
  const L = 0.19, R = 0.019, segs = 40, rad = 10;
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, a = (t - 0.5) * 1.1, cx = Math.sin(a) * L * 0.95, cy = (1 - Math.cos(a)) * L * 0.95;
    const taper = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.02)), 0.55) * (t > 0.88 ? 0.75 + (1 - t) * 2 : 1);
    const nx = -Math.sin(a), ny = Math.cos(a);   // normal of the arc in the x-y plane (curve bends up)
    for (let j = 0; j < rad; j++) {
      const ph = (j / rad) * Math.PI * 2, ridge = 1 + 0.07 * Math.cos(ph * 5);
      const rr = R * taper * ridge, ox = Math.cos(ph) * rr, oz = Math.sin(ph) * rr;
      pos.push(cx + nx * ox, cy + ny * ox, oz);
      const k = t < 0.08 ? [0.36, 0.42, 0.12] : t > 0.95 ? [0.22, 0.15, 0.08] : [0.93, 0.77, 0.17];
      col.push(...k);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * rad + j, b = i * rad + (j + 1) % rad, c = a + rad, d = b + rad; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.translate(0, -0.03, 0); g.computeVertexNormals();
  const m = new THREE.Mesh(g, heatize(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }), { organic: 1 }));
  m.castShadow = true; return m;
}

// fidget spinner: three weighted lobes around a bearing; spin it by rotating .rotor about its local y
export function makeSpinner() {
  const s = new THREE.Shape(), R = 0.026, r = 0.0125;
  const lobes = [0, 1, 2].map((k) => (k / 3) * Math.PI * 2 + Math.PI / 2);
  // outline: lobes joined by concave waists
  lobes.forEach((a, k) => {
    const cx = Math.cos(a) * R, cy = Math.sin(a) * R, a0 = a - 1.75, a1 = a + 1.75;
    if (k === 0) s.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    s.absarc(cx, cy, r, a0, a1, false);
    const n = lobes[(k + 1) % 3], mid = (a + (k === 2 ? n + Math.PI * 2 : n)) / 2;
    s.quadraticCurveTo(Math.cos(mid) * R * 0.42, Math.sin(mid) * R * 0.42, Math.cos(n) * R + Math.cos(n - 1.75) * r, Math.sin(n) * R + Math.sin(n - 1.75) * r);
  });
  lobes.forEach((a) => { const h = new THREE.Path(); h.absarc(Math.cos(a) * R, Math.sin(a) * R, r * 0.62, 0, Math.PI * 2, true); s.holes.push(h); });
  const ch = new THREE.Path(); ch.absarc(0, 0, 0.0085, 0, Math.PI * 2, true); s.holes.push(ch);
  const body = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 24 });
  body.rotateX(-Math.PI / 2); body.translate(0, 0.002, 0);
  const metal = new THREE.MeshStandardMaterial({ color: '#c6ccd4', metalness: 1, roughness: 0.28 });
  const rotor = new THREE.Group();
  rotor.add(new THREE.Mesh(body, new THREE.MeshStandardMaterial({ color: '#d4241c', metalness: 0.6, roughness: 0.32 })));   // anodised red
  const weights = mergeGeometries(lobes.map((a) => { const c = new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.0068, 24); c.translate(Math.cos(a) * R, 0.0052, -Math.sin(a) * R); return c; }));
  rotor.add(new THREE.Mesh(weights, metal));
  const hub = new THREE.Group();
  const cap = new THREE.CylinderGeometry(0.0105, 0.0105, 0.0105, 28); cap.translate(0, 0.0052, 0);
  hub.add(new THREE.Mesh(cap, new THREE.MeshStandardMaterial({ color: '#202226', metalness: 0.5, roughness: 0.35 })));
  const root = new THREE.Group(); root.add(rotor, hub);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, rotor };
}

// sand mound over a person lying in the sand (only the head shows): an elongated, softly lumpy dome
export function makeMound(cx, cz, yaw, mat, { L = 1.7, Wd = 0.62, Hh = 0.24, seed = 6 } = {}) {
  const g = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.attributes.position, r = rng(seed), c = Math.cos(yaw), s = Math.sin(yaw), bumps = [0, 1, 2, 3].map(() => [r() * 6.28, 2 + r() * 4]);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const lump = 1 + bumps.reduce((a, [ph, f]) => a + 0.04 * Math.sin(x * f + ph) * Math.cos(z * f * 0.7 + ph), 0);
    x *= Wd * 0.5; z *= L * 0.5; y = y * Hh * lump;
    const wx = cx + x * c + z * s, wz = cz - x * s + z * c;
    p.setXYZ(i, wx, groundY(wx, wz) - 0.02 + y, wz);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
