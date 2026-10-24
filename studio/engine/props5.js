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
    const r = rng(seed);
    // a Turkish-style towel: wide bands with thin pinstripes, woven texture, a knotted fringe at both ends
    g.fillStyle = cols[0]; g.fillRect(0, 0, w, h);
    const bands = [[0.08, 0.16, 1], [0.84, 0.92, 1], [0.3, 0.33, 2], [0.67, 0.7, 2], [0.47, 0.53, 1]];
    for (const [a, b, k] of bands) { g.fillStyle = cols[k]; g.fillRect(0, a * h, w, (b - a) * h); }
    for (let i = 0; i < 26; i++) { const y = (0.18 + 0.64 * r()) * h; g.fillStyle = cols[1 + (i % 2)]; g.globalAlpha = 0.85; g.fillRect(0, y, w, 2 + r() * 2); }
    g.globalAlpha = 1;
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${0.035 + 0.03 * Math.sin(y * 0.9)})`; g.fillRect(0, y, w, 1); }       // weave
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,255,${0.025 + 0.02 * Math.sin(x * 1.3)})`; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 30000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.07})`; g.fillRect(r() * w, r() * h, 1, 1 + r() * 2); }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(60,40,20,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 1 + r(), 1 + r()); }     // a few sand grains
    for (const y0 of [0, h - 16]) for (let x = 2; x < w; x += 7) { g.fillStyle = cols[0]; g.fillRect(x, y0, 3, 16); }                   // fringe
  });
}
// a towel laid on the sand: follows the ground with soft wrinkles, the hem settles on the sand; its exact top surface is
// userData.topAt(x, z) (people sit on it)
export function makeTowel(cx, cz, yaw, { w = 0.9, l = 1.8, seed = 3, cols = ['#ece3d2', '#24395c', '#b4482e'] } = {}) {
  const nx = 36, nz = 72, g = new THREE.PlaneGeometry(w, l, nx, nz); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, r = rng(seed), c = Math.cos(yaw), s = Math.sin(yaw);
  const folds = [0, 1, 2, 3].map(() => [r() * 6.28, 4 + r() * 7, r() * 6.28, 0.002 + r() * 0.003]);
  const ridges = [0, 1, 2].map(() => { const a = r() * 6.28; return [(r() - 0.5) * w * 0.8, (r() - 0.5) * l * 0.8, Math.cos(a), Math.sin(a), 0.006 + r() * 0.01, 0.025 + r() * 0.03]; });
  const lift = (x, z) => {
    let y = 0.014;
    for (const [a, f, ph, k] of folds) y += k * Math.sin((x * Math.cos(a) + z * Math.sin(a)) * f + ph);
    for (const [x0, z0, ca, sa, hgt, wd] of ridges) { const dd = (x - x0) * sa - (z - z0) * ca, along = (x - x0) * ca + (z - z0) * sa; y += hgt * Math.exp(-(dd * dd) / (wd * wd)) * Math.exp(-(along * along) / 0.09); }
    const e = Math.min(w / 2 - Math.abs(x), l / 2 - Math.abs(z));     // distance to the hem
    return 0.004 + (y - 0.004) * smoothstepJS(0.0, 0.035, e);
  };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), wx = cx + x * c + z * s, wz = cz - x * s + z * c;
    p.setXYZ(i, x, groundY(wx, wz) + lift(x, z), z);
  }
  g.computeVertexNormals();
  const mat = heatize(new THREE.MeshStandardMaterial({ map: towelTex(seed, cols), roughness: 0.97 }), { organic: 1 });
  mat.map.anisotropy = 8;
  const m = new THREE.Mesh(g, mat); m.position.set(cx, 0, cz); m.rotation.y = yaw; m.receiveShadow = true; m.castShadow = true;
  m.userData.topAt = (wx, wz) => {
    const dx = wx - cx, dz = wz - cz, x = dx * c - dz * s, z = dx * s + dz * c;
    if (Math.abs(x) > w / 2 || Math.abs(z) > l / 2) return groundY(wx, wz);
    return groundY(wx, wz) + lift(x, z) + 0.002;   // + the pile
  };
  return m;
}
const smoothstepJS = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// banana: a curved rounded-pentagon tube, thick in the middle, a tapering neck and cut stem at one end, a small dark
// blossom tip at the other; yellow with green near the neck, faint ridges and a few sugar spots (canvas texture)
function bananaTex() {
  return canvasTex(512, 128, (g, w, h) => {
    const r = rng(17);
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#5a5524'); gr.addColorStop(0.07, '#7d8a2c'); gr.addColorStop(0.2, '#d9c234'); gr.addColorStop(0.5, '#efcf3a');
    gr.addColorStop(0.85, '#eccb38'); gr.addColorStop(0.95, '#b99a2a'); gr.addColorStop(1, '#2e2414');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 5; k++) { const y = (k / 5) * h; g.fillStyle = 'rgba(150,160,40,0.28)'; g.fillRect(0, y - 1.5, w * 0.95, 3); }   // ridges: a touch greener
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,240,180,${r() * 0.08})`; g.fillRect(r() * w, r() * h, 2, 1); }
    for (let i = 0; i < 60; i++) { const x = (0.2 + 0.7 * r()) * w, y = r() * h, s = 0.6 + r() * 1.6; g.fillStyle = `rgba(90,55,20,${0.25 + r() * 0.4})`; g.beginPath(); g.ellipse(x, y, s * 1.6, s, 0, 0, 6.28); g.fill(); }
  });
}
export function makeBanana() {
  const L = 0.2, R = 0.019, segs = 64, rad = 30;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, a = (t - 0.5) * 1.0, cx = Math.sin(a) * L, cy = (1 - Math.cos(a)) * L;
    // radius along the fruit: neck (t < 0.22) tapering to a 5 mm stem, round blossom end
    let k;
    if (t < 0.06) k = 0.26;                                                       // cut stem
    else if (t < 0.24) { const u = (t - 0.06) / 0.18; k = 0.26 + 0.74 * (u * u * (3 - 2 * u)); }
    else if (t < 0.9) k = 1 - 0.08 * Math.pow((t - 0.55) / 0.35, 2);
    else { const u = (t - 0.9) / 0.1; k = 0.92 * Math.sqrt(Math.max(0, 1 - u * u * 0.94)); }
    const nx = -Math.sin(a), ny = Math.cos(a);
    for (let j = 0; j <= rad; j++) {
      const ph = (j / rad) * Math.PI * 2, sec = 2 * Math.PI / 5, m = ((ph % sec) + sec) % sec - sec / 2;
      const poly = Math.cos(sec / 2) / Math.cos(m), rr = R * k * (t < 0.06 ? 1 : (0.55 + 0.45 * Math.min(poly, 1.12)) * 1.05);
      const ox = Math.cos(ph) * rr, oz = Math.sin(ph) * rr;
      pos.push(cx + nx * ox, cy + ny * ox, oz); uv.push(t, j / rad);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const A = i * (rad + 1) + j, B2 = A + 1, C = A + rad + 1, D = C + 1; idx.push(A, C, B2, B2, C, D); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.translate(0, -0.03, 0); g.computeVertexNormals();
  const m = new THREE.Mesh(g, heatize(new THREE.MeshPhysicalMaterial({ map: bananaTex(), roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.45 }), { organic: 1 }));
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

// sand heaped over a person lying in the sand, only the head out: a heightfield that rises from the beach with a smooth
// fillet (no crease), higher over the chest, lumpy, hand-patted. (hx, hz): the neck; dir: unit vector neck -> feet (x, z)
export function makeMound(hx, hz, dir, mat, { L = 2.0, Wd = 0.95, Hh = 0.24, seed = 6 } = {}) {
  const nu = 70, nv = 34, r = rng(seed), bumps = [0, 1, 2, 3, 4].map(() => [r() * 6.28, 5 + r() * 9, r() * 6.28]);
  const px = -dir.z, pz = dir.x;   // across
  const pos = [], idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const u = -0.12 + (i / nu) * (L + 0.24), v = (j / nv - 0.5) * (Wd + 0.5);
    const along = u / L;                                                    // 0 at the neck, 1 past the feet
    const prof = along < 0 ? 0 : (along < 0.12 ? smoothstepJS(0, 0.12, along) * 0.85 : along < 0.4 ? 0.85 + 0.15 * smoothstepJS(0.12, 0.3, along) : 1 - 0.25 * smoothstepJS(0.45, 0.9, along));
    const half = (Wd / 2) * (along < 0.15 ? 0.75 + along * 1.6 : 1 - 0.18 * smoothstepJS(0.5, 1, along));
    const rr = Math.abs(v) / half, endFall = 1 - smoothstepJS(0.86, 1.08, along);
    let h = Hh * prof * endFall * (1 - smoothstepJS(0.55, 1.25, rr));
    h *= 1 + bumps.reduce((a, [ph, f, ph2]) => a + 0.035 * Math.sin(u * f + ph) * Math.cos(v * f * 1.3 + ph2), 0);
    const wx = hx + dir.x * u + px * v, wz = hz + dir.z * u + pz * v;
    pos.push(wx, groundY(wx, wz) - 0.006 + Math.max(0, h), wz);
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c2 = a + nv + 1, d = c2 + 1; idx.push(a, b, c2, b, d, c2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((nu + 1) * (nv + 1) * 2), 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
