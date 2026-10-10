// Apple, the DeatAnimation cat (rule 19): a black-and-white (tuxedo) cat with red pupils, built procedurally so it is
// ours to commit. The body and head are signed-distance sculptures turned into meshes (surface nets) and covered in
// shell fur (one instanced draw per part, inner shell first); glossy eyes with lids that blink, ears that twitch, a
// tail wrapped round the front paws whose tip flicks, whiskers drawn at least 1.6 px wide (thinner ones fade instead of
// sparkling). Metres, about 31 cm to the top of the head when sitting, standing on y = 0, facing +z.
// makeCat() -> { root, head, update(t, o) }; o: { look (world point), blinkAt: [t...], slowBlinkAt: [t...], earAt: [t...],
// breath }. Every pose is a pure function of t.
import * as THREE from 'three';
import { rng } from './core.js';
import { canvasTex } from './assets.js';

// ---------------------------------------------------------------------------------------------------------------
// signed distances (metres)
// ---------------------------------------------------------------------------------------------------------------
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
function ell(px, py, pz, cx, cy, cz, rx, ry, rz) {
  const x = (px - cx) / rx, y = (py - cy) / ry, z = (pz - cz) / rz;
  const k0 = Math.sqrt(x * x + y * y + z * z), x2 = x / rx, y2 = y / ry, z2 = z / rz, k1 = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2);
  return k1 > 1e-12 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}
// ellipsoid tilted about x by `a` (radians, + = top toward +z)
function ellX(px, py, pz, cx, cy, cz, rx, ry, rz, a) {
  const c = Math.cos(a), s = Math.sin(a), y = py - cy, z = pz - cz;
  return ell(px, cy + c * y + s * z, cz - s * y + c * z, cx, cy, cz, rx, ry, rz);
}
function rcone(px, py, pz, ax, ay, az, bx, by, bz, ra, rb) {
  const bax = bx - ax, bay = by - ay, baz = bz - az, pax = px - ax, pay = py - ay, paz = pz - az;
  let t = (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz); t = Math.min(1, Math.max(0, t));
  const dx = pax - bax * t, dy = pay - bay * t, dz = paz - baz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t);
}
const sph = (px, py, pz, cx, cy, cz, r) => Math.hypot(px - cx, py - cy, pz - cz) - r;

// body: haunches, thighs, belly, chest, neck, slender front legs and paws, hind feet (the head is a separate mesh)
function bodySDF(x, y, z) {
  const ax = Math.abs(x);
  let d = ell(x, y, z, 0, 0.07, -0.066, 0.072, 0.072, 0.086);                                    // haunches
  d = smin(d, ell(ax, y, z, 0.045, 0.056, -0.05, 0.036, 0.051, 0.064), 0.025);                  // thighs
  d = smin(d, ellX(x, y, z, 0, 0.113, -0.022, 0.056, 0.077, 0.06, 0.3), 0.035);                 // belly and back
  d = smin(d, ellX(x, y, z, 0, 0.168, 0.012, 0.046, 0.058, 0.047, 0.45), 0.03);                 // chest
  d = smin(d, rcone(x, y, z, 0, 0.186, 0.008, 0, 0.222, 0.032, 0.036, 0.031), 0.025);           // neck
  d = smin(d, rcone(ax, y, z, 0.019, 0.132, 0.04, 0.0182, 0.024, 0.06, 0.0152, 0.0102), 0.012);  // front legs
  d = smin(d, ell(ax, y, z, 0.0182, 0.0112, 0.07, 0.0142, 0.0112, 0.0195), 0.01);               // front paws
  d = smin(d, ell(ax, y, z, 0.05, 0.0102, -0.01, 0.0152, 0.0102, 0.04), 0.014);                 // hind feet
  return Math.max(d, -y);
}
// head, in head space (origin at the neck pivot, facing +z)
const EYE = { x: 0.0212, y: 0.0315, z: 0.0438, r: 0.0098 };
function headSDF(x, y, z) {
  const ax = Math.abs(x);
  let d = ell(x, y, z, 0, 0.034, 0.002, 0.051, 0.037, 0.047);                                     // cranium (flatter on top)
  d = smin(d, ell(ax, y, z, 0.031, 0.017, 0.025, 0.032, 0.025, 0.03), 0.02);                      // cheeks
  d = smin(d, ell(x, y, z, 0, 0.012, 0.052, 0.022, 0.016, 0.02), 0.014);                          // muzzle
  d = smin(d, sph(ax, y, z, 0.011, 0.0105, 0.061, 0.012), 0.008);                                  // whisker pads
  d = smin(d, ell(x, y, z, 0, -0.002, 0.05, 0.012, 0.009, 0.013), 0.01);                          // chin
  d = smin(d, rcone(x, y, z, 0, 0.038, 0.044, 0, 0.022, 0.066, 0.0095, 0.0072), 0.012);           // nose bridge
  d = smin(d, ell(ax, y, z, 0.02, 0.045, 0.04, 0.016, 0.008, 0.012), 0.008);                      // brows
  d = smax(d, -sph(ax, y, z, EYE.x, EYE.y, EYE.z + 0.003, EYE.r * 1.13), 0.004);                  // eye sockets
  return d;
}

// ---------------------------------------------------------------------------------------------------------------
// surface nets: one vertex per cell crossing the surface (the mean of its edge crossings), one quad per crossed edge
// ---------------------------------------------------------------------------------------------------------------
function surfaceNets(sdf, lo, hi, h) {
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const F = new Float32Array(nx * ny * nz), id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[id(i, j, k)] = sdf(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
  const cx = nx - 1, cy = ny - 1, cid = (i, j, k) => i + cx * (j + cy * k);
  const vid = new Int32Array(cx * cy * (nz - 1)).fill(-1), pos = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const co = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]], c = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let neg = 0;
    for (let q = 0; q < 8; q++) { c[q] = F[id(i + co[q][0], j + co[q][1], k + co[q][2])]; if (c[q] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      if ((c[a] < 0) === (c[b] < 0)) continue;
      const t = c[a] / (c[a] - c[b]);
      sx += co[a][0] + (co[b][0] - co[a][0]) * t; sy += co[a][1] + (co[b][1] - co[a][1]) * t; sz += co[a][2] + (co[b][2] - co[a][2]) * t; n++;
    }
    vid[cid(i, j, k)] = pos.length / 3;
    pos.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
  }
  const idx = [];
  const quad = (a, b, cc, d, flip) => { if (a < 0 || b < 0 || cc < 0 || d < 0) return; if (flip) idx.push(a, d, cc, a, cc, b); else idx.push(a, b, cc, a, cc, d); };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const f0 = F[id(i, j, k)] < 0;
    if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && f0 !== (F[id(i + 1, j, k)] < 0))
      quad(vid[cid(i, j - 1, k - 1)], vid[cid(i, j, k - 1)], vid[cid(i, j, k)], vid[cid(i, j - 1, k)], !f0);
    if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && f0 !== (F[id(i, j + 1, k)] < 0))
      quad(vid[cid(i - 1, j, k - 1)], vid[cid(i - 1, j, k)], vid[cid(i, j, k)], vid[cid(i, j, k - 1)], !f0);
    if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && f0 !== (F[id(i, j, k + 1)] < 0))
      quad(vid[cid(i - 1, j - 1, k)], vid[cid(i, j - 1, k)], vid[cid(i, j, k)], vid[cid(i - 1, j, k)], !f0);
  }
  // normals from the field's gradient
  const nrm = new Float32Array(pos.length), e = h * 0.5;
  for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v], y = pos[v + 1], z = pos[v + 2];
    let gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1; nrm[v] = gx / l; nrm[v + 1] = gy / l; nrm[v + 2] = gz / l;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// fur: a tileable clump texture (R: clump height, G: random per clump), shells pushed out along the normal
// ---------------------------------------------------------------------------------------------------------------
let _furTex = null;
function furTex() {
  if (_furTex) return _furTex;
  const N = 512, r = rng(5), H = new Float32Array(N * N), G = new Float32Array(N * N);
  for (let s = 0; s < 52000; s++) {
    const cx = r() * N, cy = r() * N, rad = 1.1 + r() * 1.6, hgt = 0.35 + 0.65 * Math.pow(r(), 0.6), g2 = r();
    const R = Math.ceil(rad);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx + 0.5 - (cx % 1), dy + 0.5 - (cy % 1)); if (d > rad) continue;
      const x = (Math.floor(cx) + dx + N) % N, y = (Math.floor(cy) + dy + N) % N, k = y * N + x, v = hgt * (1 - (d / rad) * (d / rad));
      if (v > H[k]) { H[k] = v; G[k] = g2; }
    }
  }
  const t = canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N), d = img.data;
    for (let k = 0; k < N * N; k++) { d[k * 4] = H[k] * 255; d[k * 4 + 1] = G[k] * 255; d[k * 4 + 2] = 0; d[k * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
  }, { repeat: true, linear: true });
  t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return (_furTex = t);
}

// one fur material for the base (layer 0) and the shells (instanced: layer = instance + 1). Per-vertex aWhite picks
// black or white fur (white hairs mix in along the boundary); uv mode for the tail (its rest coordinates move).
function furMaterial({ layers, len, scale = 9, tail = false, shells = true }) {
  const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.62, sheen: 0.7, sheenRoughness: 0.45, sheenColor: new THREE.Color('#9a9a9a'),
    transparent: shells, depthWrite: !shells, side: THREE.FrontSide });
  const U = { uFur: { value: furTex() }, uLen: { value: len }, uLayers: { value: layers }, uScale: { value: scale }, uGlowCol: { value: new THREE.Color(0, 0, 0) } };
  m.userData.U = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute float aWhite; attribute float aLen; varying float vWhite; varying vec3 vRest; varying vec3 vRestN; varying float vLayer; varying vec2 vTailUv;
      uniform float uLen, uLayers;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vWhite = aWhite; vRest = position; vRestN = normal;
      ${tail ? 'vTailUv = uv;' : 'vTailUv = vec2(0.0);'}
      ${shells ? 'vLayer = float(gl_InstanceID + 1) / uLayers;' : 'vLayer = 0.0;'}
      transformed += objectNormal * uLen * aLen * vLayer;
      transformed.y -= uLen * aLen * 0.35 * vLayer * vLayer;   // the tips droop a little`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D uFur; uniform float uScale, uLayers; uniform vec3 uGlowCol;
      varying float vWhite; varying vec3 vRest; varying vec3 vRestN; varying float vLayer; varying vec2 vTailUv;
      vec4 furSample(){
        ${tail ? 'return texture2D(uFur, vTailUv * vec2(uScale * 0.35, uScale * 0.06));' : `
        vec3 w = pow(abs(normalize(vRestN + vec3(1e-5, 2e-5, 3e-5))), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-6);
        vec3 p = vRest * uScale;
        return texture2D(uFur, p.yz) * w.x + texture2D(uFur, p.zx + 0.37) * w.y + texture2D(uFur, p.xy + 0.71) * w.z;`}
      }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec4 fs = furSample();
      float white = smoothstep(0.38, 0.62, vWhite + (fs.g - 0.5) * 0.34);
      vec3 blackFur = vec3(0.018, 0.016, 0.016) * (0.8 + 0.5 * fs.g), whiteFur = vec3(0.8, 0.79, 0.76) * (0.9 + 0.15 * fs.g);
      vec3 furCol = mix(blackFur, whiteFur, white);
      float ao = mix(0.35, 1.0, vLayer) * mix(0.75, 1.0, fs.r);
      diffuseColor.rgb = furCol * ao;
      ${shells ? `
      float fw = fwidth(fs.r) + 0.04;
      float a = smoothstep(vLayer - fw, vLayer + fw, fs.r * (1.0 - 0.15 * vLayer));
      diffuseColor.a = a * (1.0 - smoothstep(0.85, 1.0, vLayer) * 0.5);
      if (diffuseColor.a < 0.01) discard;` : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += uGlowCol;`);
  };
  m.customProgramCacheKey = () => `catfur_${tail}_${shells}`;
  return m;
}
function furred(geo, { layers = 18, len = 0.008, scale = 9, tail = false }) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(geo, furMaterial({ layers, len, scale, tail, shells: false }));
  base.castShadow = true; base.receiveShadow = true;
  const sh = new THREE.InstancedMesh(geo, furMaterial({ layers, len, scale, tail, shells: true }), layers);
  sh.receiveShadow = true; sh.frustumCulled = false; sh.renderOrder = 2;
  g.add(base, sh);
  return { group: g, base, shells: sh };
}

// ---------------------------------------------------------------------------------------------------------------
// eyes: golden-green iris, a red vertical pupil (a little emissive), a clear glossy cornea
// ---------------------------------------------------------------------------------------------------------------
function irisTex() {
  // polar texture for a sphere whose pole looks forward: u = azimuth, v = angle from the pole (0..pi)
  return canvasTex(512, 256, (g, w, h) => {
    const r = rng(23), img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const th = (y / h) * Math.PI, ph = (x / w) * Math.PI * 2, rad = th / (Math.PI * 0.36);   // iris edge at 65 deg
      const a = 0.15, b = 0.82, pr = (a * b) / Math.sqrt((b * Math.cos(ph)) ** 2 + (a * Math.sin(ph)) ** 2);   // vertical slit
      let c;
      if (rad < pr) c = [150, 6, 9];                                                     // the red pupil
      else if (rad < 1.0) {
        const k = (rad - pr) / (1 - pr), streak = 0.9 + 0.1 * Math.sin(ph * 37 + Math.sin(ph * 11) * 2) * Math.sin(ph * 13 + 1.3) + 0.06 * Math.sin(ph * 71 + k * 9);
        const inner = [214, 168, 48], outer = [168, 178, 66];
        c = inner.map((v, i) => (v + (outer[i] - v) * k) * streak * (k > 0.88 ? 0.55 : 1));
        if (k < 0.08) c = c.map((v, i) => v * 0.6 + [120, 20, 10][i] * 0.4);           // a dark-red rim round the pupil
      } else c = [24, 20, 16];
      const n = 0.92 + 0.16 * r(), k = (y * w + x) * 4;
      d[k] = Math.min(255, c[0] * n); d[k + 1] = Math.min(255, c[1] * n); d[k + 2] = Math.min(255, c[2] * n); d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
}
function pupilMask() {
  return canvasTex(512, 256, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const th = (y / h) * Math.PI, ph = (x / w) * Math.PI * 2, rad = th / (Math.PI * 0.36);
      const a = 0.15, b = 0.82, pr = (a * b) / Math.sqrt((b * Math.cos(ph)) ** 2 + (a * Math.sin(ph)) ** 2), k = (y * w + x) * 4;
      const v = rad < pr * 0.92 ? 255 : rad < pr ? 255 * (pr - rad) / (pr * 0.08) : 0;
      d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
}
function makeEye(side) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(EYE.r, 48, 32); geo.rotateX(Math.PI / 2);   // pole (v = 0) looks along +z
  const iris = new THREE.MeshPhysicalMaterial({ map: irisTex(), roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.03, emissive: '#ff1a10', emissiveMap: pupilMask(), emissiveIntensity: 0.22 });
  const ball = new THREE.Mesh(geo, iris); g.add(ball);
  g.position.set(side * EYE.x, EYE.y, EYE.z);
  g.rotation.set(0.05, side * 0.3, side * 0.13);   // forward and slightly out; the outer corner a little higher
  return { group: g, mat: iris };
}
// eyelids: two shells that turn about the eye's horizontal axis; their edges are great circles through the eye corners
// (an almond opening). k: 0 open, 1 closed
function lidGeo(r, a0, a1) {
  const pos = [], idx = [], nu = 24, nv = 10;
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const th = 0.15 + (i / nu) * (Math.PI - 0.3), ph = a0 + (j / nv) * (a1 - a0);   // th from +x, ph about x (0 = up, 90 = forward)
    pos.push(r * Math.cos(th), r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph));
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// whiskers: ribbons at least `minPx` wide on screen; thinner ones fade (alpha = true width / minPx)
// ---------------------------------------------------------------------------------------------------------------
function whiskerMesh(curves, width = 0.0004) {
  const pos = [], nxt = [], side = [], alpha = [], idx = [];
  curves.forEach((pts) => {
    const base = pos.length / 3;
    pts.forEach((p, i) => {
      const q = pts[Math.min(i + 1, pts.length - 1)], pp = pts[Math.max(i - 1, 0)];
      const dir = q.clone().sub(pp);
      for (const s of [-1, 1]) { pos.push(p.x, p.y, p.z); nxt.push(dir.x, dir.y, dir.z); side.push(s); alpha.push(1 - Math.pow(i / (pts.length - 1), 2)); }
    });
    for (let i = 0; i < pts.length - 1; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aDir', new THREE.Float32BufferAttribute(nxt, 3));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1)); g.setAttribute('aFade', new THREE.Float32BufferAttribute(alpha, 1)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({
    uniforms: { uRes: { value: new THREE.Vector2(1080, 1920) }, uPR: { value: 1 }, uW: { value: width }, uCol: { value: new THREE.Color(0.85, 0.85, 0.82) }, uI: { value: 1 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `attribute vec3 aDir; attribute float aSide; attribute float aFade; uniform vec2 uRes; uniform float uPR, uW; varying float vA;
      void main(){
        vec4 c0 = projectionMatrix * modelViewMatrix * vec4(position, 1.0), c1 = projectionMatrix * modelViewMatrix * vec4(position + aDir * 0.01, 1.0);
        vec2 s0 = c0.xy / c0.w * uRes * 0.5, s1 = c1.xy / c1.w * uRes * 0.5, d = normalize(s1 - s0 + 1e-6), n = vec2(-d.y, d.x);
        float pxPerM = uRes.y * 0.5 * projectionMatrix[1][1] / c0.w;               // pixels per metre at this depth (output pixels)
        float wPx = uW * pxPerM, minPx = 1.6;
        vA = aFade * clamp(wPx / minPx, 0.0, 1.0);
        vec2 off = n * aSide * 0.5 * max(wPx, minPx);
        gl_Position = c0; gl_Position.xy += off / (uRes * 0.5) * c0.w;
      }`,
    fragmentShader: `uniform vec3 uCol; uniform float uI; varying float vA; void main(){ gl_FragColor = vec4(uCol * uI, vA * 0.85); }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3;
  return mesh;
}

// ---------------------------------------------------------------------------------------------------------------
// tail: a tube along a curve that wraps round the front paws; positions rebuilt each frame (the tip flicks)
// ---------------------------------------------------------------------------------------------------------------
const TAIL_SEG = 48, TAIL_RAD = 14;
function tailGeometry() {
  const n = (TAIL_SEG + 1) * (TAIL_RAD + 1), g = new THREE.BufferGeometry(), idx = [];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const uv = new Float32Array(n * 2), wh = new Float32Array(n);
  for (let i = 0; i <= TAIL_SEG; i++) for (let j = 0; j <= TAIL_RAD; j++) { const k = i * (TAIL_RAD + 1) + j; uv[k * 2] = i / TAIL_SEG; uv[k * 2 + 1] = j / TAIL_RAD; wh[k] = 0; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aWhite', new THREE.BufferAttribute(wh, 1)); g.setAttribute('aLen', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
  for (let i = 0; i < TAIL_SEG; i++) for (let j = 0; j < TAIL_RAD; j++) { const a = i * (TAIL_RAD + 1) + j, b = a + 1, c = a + TAIL_RAD + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  g.setIndex(idx);
  return g;
}
const _t = new THREE.Vector3(), _n = new THREE.Vector3(), _b = new THREE.Vector3(), _p = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function fillTail(g, curve) {
  const P = g.attributes.position.array, N = g.attributes.normal.array;
  let prevN = null;
  for (let i = 0; i <= TAIL_SEG; i++) {
    const u = i / TAIL_SEG; curve.getPointAt(u, _p); curve.getTangentAt(u, _t);
    if (!prevN) { _n.copy(_up).sub(_t.clone().multiplyScalar(_up.dot(_t))).normalize(); } else { _n.copy(prevN).sub(_t.clone().multiplyScalar(prevN.dot(_t))).normalize(); }
    prevN = _n.clone(); _b.crossVectors(_t, _n);
    const r = 0.0135 * (1 - 0.35 * u) * (u > 0.93 ? Math.sqrt(Math.max(0.05, (1 - u) / 0.07)) : 1) * (u < 0.04 ? 0.85 + u * 3.75 : 1);
    for (let j = 0; j <= TAIL_RAD; j++) {
      const a = (j / TAIL_RAD) * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a), k = (i * (TAIL_RAD + 1) + j) * 3;
      const nx = _n.x * cx + _b.x * sy, ny = _n.y * cx + _b.y * sy, nz = _n.z * cx + _b.z * sy;
      P[k] = _p.x + nx * r; P[k + 1] = _p.y + ny * r; P[k + 2] = _p.z + nz * r; N[k] = nx; N[k + 1] = ny; N[k + 2] = nz;
    }
  }
  g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.computeBoundingSphere();
}

// ---------------------------------------------------------------------------------------------------------------
// the cat
// ---------------------------------------------------------------------------------------------------------------
const NECK = new THREE.Vector3(0, 0.222, 0.03);
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function whiteMaskBody(x, y, z) {
  // white bib down the chest, white front socks, white tips on the hind feet; black everywhere else
  const bib = smooth01(0.0, 0.025, z - 0.004 + Math.abs(x) * 0.35) * smooth01(0.245, 0.2, y + Math.abs(x) * 0.8) * smooth01(0.062, 0.035, Math.abs(x)) * smooth01(0.02, 0.06, y);
  const socks = smooth01(0.05, 0.03, y) * smooth01(0.03, 0.05, z);
  const hind = smooth01(0.022, 0.012, y) * smooth01(0.0, 0.02, z + 0.012);
  return Math.min(1, bib + socks + hind);
}
function whiteMaskHead(x, y, z) {
  // muzzle, chin and an inverted-V blaze up the nose
  const muz = smooth01(0.038, 0.05, z) * smooth01(0.026, 0.013, y + Math.abs(x) * 0.75);
  const blaze = smooth01(0.046, 0.056, z) * smooth01(0.006, 0.0025, Math.abs(x) - (0.03 - y) * 0.3) * smooth01(0.042, 0.03, y);
  const chin = smooth01(0.006, -0.002, y) * smooth01(0.02, 0.035, z);
  return Math.min(1, muz + blaze + chin);
}

export function makeCat({ seed = 1 } = {}) {
  const root = new THREE.Group();
  // body
  const bodyGeo = surfaceNets(bodySDF, [-0.12, -0.004, -0.19], [0.12, 0.27, 0.125], 0.0032);
  const bp = bodyGeo.attributes.position, bw = new Float32Array(bp.count);
  const bl = new Float32Array(bp.count);
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    bw[i] = whiteMaskBody(x, y, z);
    bl[i] = 1.0 + 0.4 * smooth01(0.0, 0.03, z) * smooth01(0.1, 0.16, y) - 0.45 * smooth01(0.11, 0.05, y) * smooth01(0.02, 0.045, z) - 0.3 * smooth01(0.03, 0.01, y);
  }
  bodyGeo.setAttribute('aWhite', new THREE.BufferAttribute(bw, 1)); bodyGeo.setAttribute('aLen', new THREE.BufferAttribute(bl, 1));
  const body = furred(bodyGeo, { layers: 18, len: 0.0085, scale: 8 });
  root.add(body.group);
  // head (turns about the neck)
  const head = new THREE.Group(); head.position.copy(NECK); root.add(head);
  const headGeo = surfaceNets(headSDF, [-0.075, -0.03, -0.055], [0.075, 0.09, 0.09], 0.0022);
  const hp = headGeo.attributes.position, hw = new Float32Array(hp.count);
  const hl = new Float32Array(hp.count);
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    hw[i] = whiteMaskHead(x, y, z);
    hl[i] = Math.max(0, 1.0 + 0.5 * smooth01(0.03, 0.05, Math.abs(x)) * smooth01(0.035, 0.01, y) - 0.45 * smooth01(0.04, 0.055, z) - 0.2 * smooth01(0.03, 0.05, y) * smooth01(0.0, 0.03, z)
      - smooth01(0.064, 0.07, z) * smooth01(0.012, 0.018, y) * smooth01(0.011, 0.006, Math.abs(x)));                 // bare nose leather
  }
  headGeo.setAttribute('aWhite', new THREE.BufferAttribute(hw, 1)); headGeo.setAttribute('aLen', new THREE.BufferAttribute(hl, 1));
  const hf = furred(headGeo, { layers: 14, len: 0.0045, scale: 11 });
  head.add(hf.group);
  // eyes and lids
  const eyes = [-1, 1].map((s) => makeEye(s));
  const lidMat = furMaterial({ layers: 1, len: 0, scale: 11, shells: false });
  const lids = eyes.map((e) => {
    head.add(e.group);
    const up = new THREE.Mesh(lidGeo(EYE.r * 1.065, -1.6, 0.97), lidMat), lo = new THREE.Mesh(lidGeo(EYE.r * 1.055, 2.02, 3.6), lidMat);
    for (const l of [up, lo]) { const n = l.geometry.attributes.position.count; l.geometry.setAttribute('aWhite', new THREE.BufferAttribute(new Float32Array(n), 1)); l.geometry.setAttribute('aLen', new THREE.BufferAttribute(new Float32Array(n), 1)); e.group.add(l); }
    return { up, lo };
  });
  // nose and mouth
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshPhysicalMaterial({ color: '#b07a7c', roughness: 0.38, clearcoat: 0.4 }));
  nose.scale.set(0.0064, 0.0043, 0.0042); nose.position.set(0, 0.0236, 0.0716); nose.rotation.x = -0.35; head.add(nose);
  const mouthMat = new THREE.MeshStandardMaterial({ color: '#2a1d1d', roughness: 0.7 });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0007, 6, 16, Math.PI * 0.8), mouthMat);
  mouth.position.set(0, 0.0118, 0.0686); mouth.rotation.set(0.25, 0, Math.PI * 1.1); head.add(mouth);
  // ears: curved cups with rounded tips, black fur on the back, pink-grey skin and pale hairs inside
  const innerMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.75, sheen: 0.5, sheenColor: new THREE.Color('#8a8080') });
  innerMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vEP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvEP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEP;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float rim = smoothstep(0.6, 1.0, abs(vEP.x) / max(0.0215 * pow(max(1.0 - vEP.y / 0.043, 0.0), 0.65), 1e-4));
        float hairs = fract(sin(dot(floor(vEP.xy * vec2(2500.0, 600.0)), vec2(12.9898, 78.233))) * 43758.5453) * smoothstep(0.03, 0.004, vEP.y);
        diffuseColor.rgb = mix(mix(vec3(0.17, 0.12, 0.12), vec3(0.3, 0.22, 0.22), smoothstep(0.0, 0.03, vEP.y)), vec3(0.03, 0.025, 0.025), rim);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.48, 0.46), hairs * 0.25 * (1.0 - rim));`);
  };
  const earSurf = (front) => {
    const nu = 18, nv = 18, pos = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const u = (i / nu) * 0.97, v = (j / nv) * 2 - 1, w = 0.0215 * Math.pow(1 - u, 0.65) * (1 - 0.25 * u), cup = 0.011 * (1 - v * v) * Math.pow(1 - u, 0.6);
      pos.push(v * w, 0.043 * u, front ? -cup * 0.72 + 0.0014 : -cup - 0.0014);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const A = i * (nv + 1) + j, B2 = A + 1, C = A + nv + 1, D = C + 1; if (front) idx.push(A, B2, C, B2, D, C); else idx.push(A, C, B2, B2, C, D); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const n = pos.length / 3; g.setAttribute('aWhite', new THREE.BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aLen', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
    return g;
  };
  const earBack = earSurf(false), earFront = earSurf(true);
  const ears = [-1, 1].map((s) => {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.031, 0.057, -0.002); pivot.rotation.set(-0.12, s * 0.28, s * -0.45, 'YXZ'); pivot.scale.setScalar(1.12);
    const fur = furred(earBack, { layers: 8, len: 0.0026, scale: 14 }); pivot.add(fur.group);
    const inner = new THREE.Mesh(earFront, innerMat); inner.castShadow = true; pivot.add(inner);
    head.add(pivot); return pivot;
  });
  // whiskers from the pads, fanning out and drooping
  const r = rng(seed), wcurves = [];
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
    const o = new THREE.Vector3(s * (0.012 + r() * 0.004), 0.008 + k * 0.0022, 0.06 + r() * 0.003);
    const dir = new THREE.Vector3(s * (0.85 + r() * 0.2), 0.15 - k * 0.07 + (r() - 0.5) * 0.06, 0.35 + r() * 0.15).normalize();
    const L = 0.055 + r() * 0.02, pts = [];
    for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(o.clone().addScaledVector(dir, L * u).add(new THREE.Vector3(0, -0.012 * u * u, -0.01 * u * u))); }
    wcurves.push(pts);
  }
  const whiskers = whiskerMesh(wcurves); head.add(whiskers);
  // tail
  const tailGeo = tailGeometry();
  const tail = furred(tailGeo, { layers: 14, len: 0.009, scale: 8, tail: true });
  root.add(tail.group);
  const tailBase = [V(0, 0.022, -0.155), V(0.06, 0.013, -0.165), V(0.105, 0.011, -0.1), V(0.11, 0.011, -0.02), V(0.085, 0.012, 0.06), V(0.045, 0.013, 0.106), V(0.0, 0.016, 0.118)];
  const curve = new THREE.CatmullRomCurve3(tailBase.map((p) => p.clone()), false, 'centripetal');
  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o !== whiskers) { o.castShadow = true; o.receiveShadow = true; } });

  const allFur = [body.base, body.shells, hf.base, hf.shells, tail.base, tail.shells];
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _wp = new THREE.Vector3(), _iq = new THREE.Quaternion();
  const hash = (n) => { const x = Math.sin(n * 91.7 + seed * 13.1) * 43758.5453; return x - Math.floor(x); };
  function update(t, o = {}) {
    // breathing (about 25 breaths a minute)
    const br = Math.sin(t * Math.PI * 2 / 2.4);
    body.group.scale.set(1 + 0.008 * br, 1 + 0.003 * br, 1 + 0.01 * br);
    // head: toward a world point, plus slow idle drift
    let yaw = 0.25 * Math.sin(t * 0.37) + 0.08 * Math.sin(t * 1.13 + 1.0), pitch = 0.05 * Math.sin(t * 0.53 + 2.0);
    if (o.look) {
      root.updateMatrixWorld(true);
      _wp.copy(o.look); root.worldToLocal(_wp); _wp.sub(NECK).sub(new THREE.Vector3(0, 0.03, 0));
      yaw = Math.max(-1.0, Math.min(1.0, Math.atan2(_wp.x, _wp.z))) + 0.04 * Math.sin(t * 0.9);
      pitch = Math.max(-0.4, Math.min(0.4, -Math.atan2(_wp.y, Math.hypot(_wp.x, _wp.z)))) + 0.03 * Math.sin(t * 0.7 + 1.0);
    }
    if (o.yaw != null) yaw = o.yaw; if (o.pitch != null) pitch = o.pitch;
    head.rotation.set(pitch, yaw, 0.06 * Math.sin(t * 0.41), 'YXZ');
    // blinks: quick ones every few seconds, slow blinks on cue
    let blink = 0;
    const bp2 = o.blinkAt || [], sp = o.slowBlinkAt || [];
    for (const b0 of bp2) { const x = (t - b0) / 0.18; if (x > 0 && x < 1) blink = Math.max(blink, Math.sin(Math.PI * x)); }
    for (const b0 of sp) { const x = (t - b0) / 1.3; if (x > 0 && x < 1) blink = Math.max(blink, 0.85 * Math.pow(Math.sin(Math.PI * x), 0.6)); }
    const k = Math.min(1, blink);
    lids.forEach(({ up, lo }) => { up.rotation.x = k * 0.98; lo.rotation.x = -k * 0.1; });
    // ears: a flick on cue (one ear, fast back-and-forth)
    ears.forEach((e, i) => {
      let tw = 0; for (const a0 of o.earAt || []) { const x = (t - a0 - i * 0.07) / 0.35; if (x > 0 && x < 1) tw = Math.max(tw, Math.sin(Math.PI * x * 2) * (1 - x)); }
      const sd = i ? 1 : -1;
      e.rotation.set(-0.12 + 0.03 * Math.sin(t * 0.8 + i), sd * 0.28 + tw * 0.5 * sd, sd * -0.45 - tw * 0.22 * sd, 'YXZ');
    });
    // tail: the tip lifts and curls, the middle sways a little
    const flick = Math.max(0, Math.sin(t * 1.7)) ** 3 * 0.8 + 0.2 * Math.sin(t * 0.6);
    curve.points.forEach((p, i) => {
      p.copy(tailBase[i]);
      if (i >= 4) { const w = (i - 3) / 3; p.y += w * w * 0.03 * flick; p.x -= w * 0.012 * flick; p.z += w * 0.008 * Math.sin(t * 2.3); }
      if (i === 2 || i === 3) p.x += 0.004 * Math.sin(t * 0.9 + i);
    });
    fillTail(tailGeo, curve);
    // glow from the episode (Cherenkov blue / heat)
    if (o.glow) for (const m of allFur) m.material.userData.U.uGlowCol.value.copy(o.glow);
    if (o.pr) whiskers.material.uniforms.uPR.value = o.pr;
  }
  update(0);
  return { root, head, eyes, update, whiskers, furMats: allFur.map((m) => m.material) };
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
