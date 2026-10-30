// The Giza plateau at night for post 10 (What if Earth's magnetic field flipped in 5 seconds?). Metres; x east, z south,
// y up; the Great Pyramid's centre at the origin. You stand at the "panorama" point 1.5 km south-west of it, the classic
// view of the three pyramids lined up (Menkaure and its three queens in front, Khafre, Khufu) with Giza and Cairo's
// lights spread over the Nile valley 40 m below the plateau. Pieces:
//   hAt(x, z)            the ground height (JS; the terrain mesh is built from it, people and rocks stand on it)
//   makeDesert()         the terrain (sand, limestone, gravel; the valley floor under the city), floodlight pools
//   makePyramids()       pyramids with courses and blocks (fwidth-clamped), Khafre's casing cap, queens, mastabas;
//                        floodlit from their bases, each with its own power level (they go dark one by one)
//   CityLights           points (window / street / minaret lights), each with its own blackout time and a short
//                        brown-out before it; a few come back on generators
//   makeCity()           the lights of Nazlet el-Samman, Giza and Cairo, the Pyramids Road, village houses, flash events
//   makeNightSky()       night sky: city glow dome, Milky Way, analytic aurora curtains (sheets solved per pixel)
//   makePowerLine()      lattice pylons, insulator strings, conductors drawn as >= 1.6 px ribbons
import * as THREE from 'three';
import { rng } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash2 = (ix, iz) => { let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
export const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1); return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz; };

// the pyramids: centre, base side, height today, the bedrock level they stand on, Khafre's casing cap, stepped queens
export const PYR = [
  { name: 'Khufu', x: 0, z: 0, base: 230.3, h: 138.5, y0: 0, cap: 0, course: 0.68 },
  { name: 'Khafre', x: -328, z: 344, base: 215.3, h: 136.4, y0: 9, cap: 0.2, course: 0.75 },
  { name: 'Menkaure', x: -588, z: 744, base: 103.4, h: 61, y0: 5, cap: 0, course: 0.8 },
  { name: 'G3a', x: -540, z: 862, base: 44, h: 28, y0: 6, cap: 0, course: 0.6 },
  { name: 'G3b', x: -588, z: 860, base: 31, h: 21, y0: 6, cap: 0, course: 0.6, steps: 4 },
  { name: 'G3c', x: -636, z: 860, base: 31, h: 21, y0: 6, cap: 0, course: 0.6, steps: 4 },
  { name: 'G1a', x: 172, z: -52, base: 49, h: 30, y0: 0, cap: 0, course: 0.6 },
  { name: 'G1b', x: 172, z: 4, base: 49, h: 30, y0: 0, cap: 0, course: 0.6 },
  { name: 'G1c', x: 172, z: 58, base: 46, h: 29, y0: 0, cap: 0, course: 0.6 },
];
export const GZ = { HERO: V(-950, 0, 1150), VALLEY: -42, CAIRO: V(9800, -40, -7200) };

// the ground: gentle desert swells, the higher desert of the panorama point, the escarpment down to the valley, the
// bedrock levelled round each pyramid
export function hAt(x, z) {
  let h = 3.2 * (vn(x / 260 + 17.3, z / 260 + 5.1) - 0.5) + 1.3 * (vn(x / 70 + 3.7, z / 70 + 9.9) - 0.5) + 0.35 * (vn(x / 14 + 1.1, z / 14 + 7.7) - 0.5);
  h += 26 * (1 - smooth(150, 1100, Math.hypot(x + 1150, z - 1400)));
  const ex = x + 0.15 * z + 40 * (vn(z / 400 + 2.2, 3.3) - 0.5), valley = smooth(380, 720, ex);
  h = h * (1 - valley) + (GZ.VALLEY + 0.6 * (vn(x / 500, z / 500) - 0.5)) * valley;
  for (const p of PYR) { const d = Math.max(Math.abs(x - p.x), Math.abs(z - p.z)) - p.base / 2, k = 1 - smooth(4, 45, d); h += (p.y0 - h) * k; }
  return h;
}
GZ.HERO.y = hAt(GZ.HERO.x, GZ.HERO.z);

const NOISE = /* glsl */`
  float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float gn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(gh(i), gh(i + vec2(1.0, 0.0)), u.x), mix(gh(i + vec2(0.0, 1.0)), gh(i + vec2(1.0, 1.0)), u.x), u.y); }
  float gfbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * gn(p); p = p * 2.03 + 7.1; a *= 0.5; } return v; }
  // value noise faded to its mean where its cells get under a few pixels (no shimmer)
  float gnAA(vec2 p){ vec2 w = fwidth(p); return mix(gn(p), 0.5, smoothstep(0.25, 0.7, max(w.x, w.y))); }`;

// shared lighting uniforms of the plateau: floodlight power per pyramid, city power (glow on the valley floor), time
export const GU = { uFlood: { value: PYR.map(() => 1) }, uCity: { value: 1 }, uT: { value: 0 } };
const FLOODC = new THREE.Color(1.0, 0.72, 0.42);

// ---- terrain ----
export function makeDesert() {
  // a structured grid, dense round you (1.2 m) and coarser away (up to 120 m)
  const axis = (c, lo, hi) => { const out = [c]; let s = 1.2, p = c; while (p > lo) { p -= s; out.unshift(p); s = Math.min(120, 1.2 + 0.035 * (c - p)); }
    s = 1.2; p = c; while (p < hi) { p += s; out.push(p); s = Math.min(120, 1.2 + 0.035 * (p - c)); } return out; };
  const xs = axis(GZ.HERO.x, -9000, 18000), zs = axis(GZ.HERO.z, -14000, 7000), nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3); let k = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { pos[k++] = xs[i]; pos[k++] = hAt(xs[i], zs[j]); pos[k++] = zs[j]; }
  const idx = []; for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: '#b39b78', roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, GU, { uPoolP: { value: PYR.map((p) => V(p.x, p.base * 0.5 + 25, p.z)) }, uFloodC: { value: FLOODC } });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; uniform float uFlood[${PYR.length}], uCity; uniform vec3 uPoolP[${PYR.length}], uFloodC; ${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 p = vWP.xz;
      float n1 = gfbm(p * 0.012), n2 = gnAA(p * 0.11), n3 = gnAA(p * 0.9), n4 = gnAA(p * 4.0);
      float rock = smoothstep(0.52, 0.7, n1 + 0.25 * (n2 - 0.5));                     // limestone outcrops and gravel
      float urban = smoothstep(-25.0, -38.0, vWP.y);                                   // the valley floor under the city
      vec3 sand = mix(vec3(0.74, 0.62, 0.46), vec3(0.82, 0.7, 0.53), n2) * (0.9 + 0.2 * n3);
      vec3 lime = mix(vec3(0.66, 0.6, 0.52), vec3(0.8, 0.74, 0.64), n3) * (0.85 + 0.3 * n4);
      diffuseColor.rgb = mix(sand, lime, rock) * (0.92 + 0.12 * n4);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.18, 0.16) * (0.8 + 0.4 * n2), urban);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(0.97, 0.8, rock);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      // floodlight spill round each pyramid's base, and the city's streets lit from below their lamps
      for (int i = 0; i < ${PYR.length}; i++) { float d = length(vWP.xz - uPoolP[i].xz) / uPoolP[i].y; totalEmissiveRadiance += diffuseColor.rgb * uFloodC * uFlood[i] * 0.22 * exp(-d * d * 2.2); }
      totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.62, 0.3) * 0.07 * uCity * urban * (0.6 + 0.8 * n2);`);
  };
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true;
  return mesh;
}

// ---- pyramids ----
function pyramidGeo(b, h, steps = 0) {
  if (steps) {   // a small step pyramid (G3-b, G3-c)
    const gs = []; for (let i = 0; i < steps; i++) { const w = b * (1 - i / steps * 0.78), hh = h / steps; const bx = new THREE.BoxGeometry(w, hh + (i ? 0 : 4), w); bx.translate(0, i * hh + hh / 2 - (i ? 0 : 2), 0); gs.push(bx); }
    return mergeGeos(gs);
  }
  const r = b / 2, apex = [0, h, 0], c = [[-r, -4, -r], [r, -4, -r], [r, -4, r], [-r, -4, r]];
  const P = [], N = 12;   // each face subdivided (smooth shading stays flat; detail is in the shader)
  for (let f = 0; f < 4; f++) { const A = c[f], B = c[(f + 1) % 4];
    for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
      const q = (u, v) => { const w = 1 - u - v; return [A[0] * w + B[0] * u + apex[0] * v, A[1] * w + B[1] * u + apex[1] * v, A[2] * w + B[2] * u + apex[2] * v]; };
      const u0 = i / N, v0 = j / N, d = 1 / N; P.push(...q(u0, v0), ...q(u0, v0 + d), ...q(u0 + d, v0));
      if (i + j < N - 1) P.push(...q(u0 + d, v0), ...q(u0, v0 + d), ...q(u0 + d, v0 + d)); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return g;
}
function mergeGeos(list) {
  const P = [], Nn = []; for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); P.push(...g.attributes.position.array); Nn.push(...g.attributes.normal.array); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); return g;
}
function pyramidMat(p, i) {
  const m = new THREE.MeshStandardMaterial({ color: '#bba684', roughness: 0.93, metalness: 0 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, GU, { uH: { value: p.h }, uB: { value: p.base }, uCap: { value: p.cap }, uCourse: { value: p.course }, uFloodC: { value: FLOODC } });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLoc;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vLoc; uniform float uH, uB, uCap, uCourse, uFlood[${PYR.length}]; uniform vec3 uFloodC; ${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float relH = clamp(vLoc.y / uH, 0.0, 1.0);
      vec2 ax = abs(vLoc.xz); float along = ax.x > ax.y ? vLoc.z : vLoc.x;         // position along the face's base
      float cy = vLoc.y / uCourse, row = floor(cy), fy = fract(cy), wy = fwidth(cy) + 1e-4;
      float bx = (along + gh(vec2(row, 3.0)) * 4.0) / 1.7, col = floor(bx), fx = fract(bx), wx = fwidth(bx) + 1e-4;
      float far = smoothstep(0.25, 0.7, max(wy, wx * 0.6));                          // courses finer than ~4 px: their average
      float groove = smoothstep(0.0, 0.1 + wy, fy) * smoothstep(1.0, 0.86 - wy, fy);
      float joint = smoothstep(0.0, 0.05 + wx, fx) * smoothstep(1.0, 0.95 - wx, fx);
      float tone = 0.8 + 0.35 * gh(vec2(col, row));
      float wear = gfbm(vLoc.xz * 0.04 + vLoc.y * 0.07);                               // weathered, missing blocks
      float detail = mix(tone * (0.55 + 0.45 * groove) * (0.7 + 0.3 * joint), 0.8, far);
      diffuseColor.rgb *= detail * (0.85 + 0.3 * wear);
      // Khafre's casing at the top: smoother, paler stone with a ragged lower edge
      float capE = 1.0 - uCap + (gn(vec2(along * 0.15, 1.0)) - 0.5) * 0.05;
      float cap = uCap > 0.0 ? smoothstep(capE - 0.004, capE + 0.004, relH) : 0.0;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.76, 0.68, 0.55) * (0.9 + 0.15 * gn(vLoc.xz * 0.3)), cap);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      // floodlit from the base: pools of light along each face, fading up the slope
      float pools = 0.65 + 0.35 * cos(along / uB * 6.2832 * 3.0);
      totalEmissiveRadiance += diffuseColor.rgb * uFloodC * uFlood[${i}] * (0.18 + 0.82 * exp(-relH * 2.4)) * pools * 0.95;`);
  };
  return m;
}
export function makePyramids() {
  const g = new THREE.Group(), list = [];
  PYR.forEach((p, i) => { const m = new THREE.Mesh(pyramidGeo(p.base, p.h, p.steps || 0), pyramidMat(p, i)); m.position.set(p.x, p.y0, p.z); m.castShadow = m.receiveShadow = true; g.add(m); list.push(m); });
  // the mastaba fields west and east of Khufu: low flat-topped tombs
  const r = rng(4410), mm = new THREE.MeshStandardMaterial({ color: '#a8937a', roughness: 0.95 });
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(box, mm, 160); let n = 0; const o = new THREE.Object3D();
  for (const [x0, x1, z0, z1] of [[-360, -150, -260, 60], [150, 300, 120, 260]]) for (let i = 0; i < 80; i++) {
    const x = x0 + (x1 - x0) * r(), z = z0 + (z1 - z0) * r(); if (Math.abs(x) < 140 && Math.abs(z) < 140) continue;
    o.position.set(x, hAt(x, z) - 0.5, z); o.scale.set(8 + 14 * r(), 3 + 4 * r(), 14 + 18 * r()); o.rotation.set(0, (r() - 0.5) * 0.04, 0); o.updateMatrix(); inst.setMatrixAt(n++, o.matrix); }
  inst.count = n; inst.receiveShadow = true; g.add(inst);
  return { group: g, list };
}

// ---- city lights: points with their own blackout time ----
// attributes: position, aCol, aPrm = (size m, off time, generator-on time (or 1e9), seed)
export class CityLights {
  constructor(n) {
    this.n = n; this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.prm = new Float32Array(n * 4);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 3)); g.setAttribute('aPrm', new THREE.BufferAttribute(this.prm, 4));
    this.geo = g;
    this.u = { uT: { value: 0 }, uPxScale: { value: 1000 }, uPR: { value: 1 }, uMinPx: { value: 1.6 }, uGain: { value: 7.0 }, uFogD: { value: 0.00006 } };
    this.mat = new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uT, uPxScale, uPR, uMinPx, uGain, uFogD; attribute vec3 aCol; attribute vec4 aPrm; varying vec3 vC; varying float vA;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          float depth = max(-mv.z, 1.0), px = aPrm.x * uPxScale / depth, a = 1.0;
          if (px < uMinPx) { a = px * px / (uMinPx * uMinPx); px = uMinPx; }
          px = min(px, 40.0);
          float off = aPrm.y, brown = smoothstep(off - 0.45, off, uT), on = 1.0 - smoothstep(off, off + 0.25, uT);
          float g0 = clamp((uT - aPrm.z) / 0.8, 0.0, 1.0), gen = g0 * g0 * (3.0 - 2.0 * g0) * 0.55;   // (not smoothstep: aPrm.z can be 1e9, edges equal in float32 -> NaN)
          vec3 c = mix(aCol, aCol * vec3(1.0, 0.55, 0.25), brown) * (1.0 - 0.45 * brown) * on + aCol * vec3(1.0, 0.9, 0.75) * gen;
          float ext = exp(-uFogD * depth);                                  // haze over the valley: far lights dimmer, warmer
          vC = c * uGain * ext * mix(vec3(1.0, 0.8, 0.6), vec3(1.0), ext); vA = a;
          gl_PointSize = px * uPR;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vC; varying float vA;
        void main(){ vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q) * 4.0; float f = exp(-r2 * 3.5) * (1.0 - smoothstep(0.7, 1.0, r2));
          if (f * vA < 0.001) discard; gl_FragColor = vec4(vC * f * vA, 1.0); }` });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 2;
  }
  set(i, x, y, z, r, g, b, size, off, gen = 1e6, seed = 0) { this.pos.set([x, y, z], i * 3); this.col.set([r, g, b], i * 3); this.prm.set([size, off, gen, seed], i * 4); }
  update(t, cam, pr) { this.u.uT.value = t; this.u.uPxScale.value = 1920 / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)); this.u.uPR.value = pr; }
}

// the city: transformer events (where and when each district goes dark), the lights, the village houses, minarets
export function makeCity({ density = 1, tFlip = 11 } = {}) {
  const r = rng(7731), g = new THREE.Group(), hm = new THREE.MeshStandardMaterial({ color: '#8a7c6a', roughness: 0.95 });
  // ~44 districts; each fails with a flash (a transformer letting go), some twice (the breakers try again)
  const events = [];
  for (let i = 0; i < 44; i++) {
    const far = i < 10 ? 0 : i < 30 ? 1 : 2;
    const p = far === 0 ? V(650 + 1100 * r(), 0, -1100 + 2600 * r()) : far === 1 ? V(1800 + 6500 * r(), 0, -7500 + 9500 * r()) : V(GZ.CAIRO.x + (r() - 0.5) * 6000, 0, GZ.CAIRO.z + (r() - 0.5) * 6000);
    p.y = GZ.VALLEY + 6;
    const t = tFlip + 7.0 + (far === 0 ? 0.6 + 3.5 * r() : far === 1 ? 1.5 + 6.0 * r() : 4.0 + 5.0 * r());
    events.push({ p, t, twice: r() < 0.35, w: 0 });
  }
  events.sort((a, b) => a.t - b.t);
  const nearest = (x, z) => { let best = 0, bd = 1e18; events.forEach((e, k) => { const d = (e.p.x - x) ** 2 + (e.p.z - z) ** 2; if (d < bd) { bd = d; best = k; } }); return events[best]; };
  const N = Math.round(64000 * density), CAP = N + 24000, L = new CityLights(CAP);
  const colAt = (u) => (u < 0.62 ? [1.0, 0.62, 0.3] : u < 0.88 ? [1.0, 0.86, 0.68] : u < 0.97 ? [0.8, 0.9, 1.0] : [0.5, 1.0, 0.55]);
  let n = 0;
  const add = (x, y, z, size, k = 1, colU = null) => { if (n >= CAP) return; const e = nearest(x, z); e.w += 1; const c = colAt(colU ?? r());
    const gen = r() < 0.006 ? e.t + 3 + 3 * r() : 1e6; L.set(n++, x, y, z, c[0] * k, c[1] * k, c[2] * k, size, e.t + 0.05 + 0.3 * r(), gen, r()); };
  // the village at the foot of the plateau (Nazlet el-Samman): houses with lit windows on the faces toward the plateau
  const houses = [];
  for (let i = 0; i < 2600 && houses.length < 900; i++) { const x = 560 + 1300 * r(), z = -1300 + 2900 * r(), y = hAt(x, z); if (y > GZ.VALLEY + 3) continue;
    houses.push({ x, y, z, w: 8 + 14 * r(), h: 5 + 16 * r() * r(), d: 8 + 14 * r(), rot: 0.15 + (r() - 0.5) * 0.1 }); }
  for (const hs of houses) { const floors = Math.max(1, Math.floor(hs.h / 3.2)), c = Math.cos(hs.rot), sn = Math.sin(hs.rot);
    for (const [fx, fz, len] of [[-0.5, 0, hs.d], [0, 0.5, hs.w]]) {               // the west face (-x) and the south face (+z)
      const bays = Math.max(1, Math.floor(len / 3.4));
      for (let fl = 0; fl < floors; fl++) for (let b = 0; b < bays; b++) { if (r() > 0.42) continue;
        const u = (b + 0.5) / bays - 0.5, lx = fx !== 0 ? fx * hs.w - 0.3 : u * hs.w, lz = fz !== 0 ? fz * hs.d + 0.3 : u * hs.d;
        add(hs.x + lx * c + lz * sn, hs.y + 1.6 + fl * 3.2, hs.z - lx * sn + lz * c, 0.55 + 0.3 * r(), 1.5, r() < 0.8 ? 0.2 : 0.8); } } }
  for (let i = 0; i < N * 0.06; i++) { const x = 560 + 1400 * r(), z = -1300 + 2900 * r(); if (hAt(x, z) > GZ.VALLEY + 3) continue; add(x, GZ.VALLEY + 5 + 3 * r(), z, 0.9, 2.0, 0.3); }   // street lamps
  // Giza: the wide carpet over the valley
  for (let i = 0; i < N * 0.52; i++) { const x = 1800 + 9000 * r(), z = -9000 + 11000 * r(); add(x, GZ.VALLEY + 1 + 18 * r() * r(), z, 2.6 + 3.0 * r(), 1.7); }
  // central Cairo: denser, with towers along the Nile
  for (let i = 0; i < N * 0.28; i++) { const a = r() * 6.283, d = 3200 * Math.sqrt(r()), x = GZ.CAIRO.x + Math.cos(a) * d, z = GZ.CAIRO.z + Math.sin(a) * d;
    const tall = r() < 0.08 ? 40 + 140 * r() : 18 * r() * r(); add(x, GZ.VALLEY + 1 + tall * r(), z, 3.0 + 3.0 * r(), 1.7); }
  // the Pyramids Road (Al-Haram): a straight double line of street lamps toward the Nile, and two cross avenues
  for (const [x0, z0, x1, z1, gap] of [[480, -300, 9200, -5200, 32], [900, -2600, 1300, 2200, 40], [2600, -6200, 3600, 1800, 45]]) {
    const len = Math.hypot(x1 - x0, z1 - z0), nn = Math.floor(len / gap), nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
    for (let k = 0; k < nn && n < CAP - 2; k++) { const u = k / nn, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
      for (const s of [-1, 1]) add(x + nx * 14 * s, GZ.VALLEY + 9, z + nz * 14 * s, 1.6, 2.2, 0.3); } }
  // minarets: a green ring of light near the top
  for (let i = 0; i < 70 && n < CAP; i++) { const x = 700 + 9000 * r(), z = -8000 + 9000 * r(); add(x, GZ.VALLEY + 30 + 25 * r(), z, 2.2, 2.4, 0.99); }
  L.geo.setDrawRange(0, n);
  for (const e of events) e.w /= n;
  // the village houses: dark blocks at the foot of the plateau (their windows are lights above)
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  hm.emissive = new THREE.Color('#3a2414'); hm.emissiveIntensity = 0.25;           // the street glow on their walls
  const inst = new THREE.InstancedMesh(box, hm, houses.length), o = new THREE.Object3D();
  houses.forEach((hs, k) => { o.position.set(hs.x, hs.y - 0.5, hs.z); o.scale.set(hs.w, hs.h + 0.5, hs.d); o.rotation.y = hs.rot; o.updateMatrix(); inst.setMatrixAt(k, o.matrix); });
  g.add(inst);
  g.add(L.points);
  // share of lights still on at time t (drives the sky glow and the valley's street glow)
  const powerAt = (t) => events.reduce((a, e) => a + e.w * (1 - smooth(e.t + 0.05, e.t + 0.6, t)), 0);
  return { group: g, lights: L, events, powerAt, houseMat: hm };
}

// ---- night sky with the Milky Way and the aurora ----
// Aurora curtains are vertical sheets 95-400 km up, laid across the view: each pixel's ray is intersected with each
// sheet (a few Newton steps on the folded sheet), the hit's altitude gives the colour (green oxygen 557.7 nm low, red
// 630 nm high, a magenta nitrogen fringe at the bottom edge of bright folds), the angle between ray and sheet gives the
// brightening where you look along it. Rays (fine vertical striations) drift slowly and fade out when finer than ~4 px.
export function makeNightSky({ milky = null, viewDir = new THREE.Vector2(0.637, -0.771) } = {}) {
  const B = viewDir.clone().normalize().rotateAround(new THREE.Vector2(0, 0), 0.6), A = new THREE.Vector2(-B.y, B.x);   // curtains seen at an angle: folds show
  const U = { uAur: { value: 0 }, uAT: { value: 0 }, uGlow: { value: 1 }, uStars: { value: 0.25 }, tMW: { value: milky }, uMW: { value: milky ? 1 : 0 },
    uA: { value: A }, uB: { value: B }, uCityDir: { value: new THREE.Vector2(0.79, -0.61) }, uPulse: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform float uAur, uAT, uGlow, uStars, uMW, uPulse; uniform sampler2D tMW; uniform vec2 uA, uB, uCityDir; varying vec3 vDir;
      const float RE = 6371.0;
      float sAtAlt(float a, float sE){ float b = RE * sE; return -b + sqrt(b * b + a * a + 2.0 * RE * a); }
      float altAt(float s, float sE){ return sqrt(RE * RE + s * s + 2.0 * RE * s * sE) - RE; }
      // one sheet: offset v0 (km, across), fold amplitudes/wavelengths, brightness; returns emission colour
      vec3 sheet(vec3 d, float v0, float amp, float lam, float ph, float bright, float topA){
        vec2 h = d.xz; float pa = dot(h, uA), pb = dot(h, uB);
        if (abs(pb) < 1e-4 || v0 / pb <= 0.0) return vec3(0.0);
        float t = uAT, s = v0 / pb;
        for (int k = 0; k < 3; k++){
          float u = s * pa;
          float F = amp * sin(u / lam + t * 0.05 + ph) + amp * 0.3 * sin(u / (lam * 0.37) - t * 0.09 + ph * 2.1) + amp * 0.08 * sin(u / (lam * 0.13) + t * 0.17);
          float Fd = amp / lam * cos(u / lam + t * 0.05 + ph) + amp * 0.3 / (lam * 0.37) * cos(u / (lam * 0.37) - t * 0.09 + ph * 2.1) + amp * 0.08 / (lam * 0.13) * cos(u / (lam * 0.13) + t * 0.17);
          float f = s * pb - v0 - F, fd = pb - Fd * pa;
          s -= f / (abs(fd) > 1e-4 ? fd : 1e-4);
        }
        if (s <= 0.0) return vec3(0.0);
        // where Newton did not land on the sheet (grazing rays), fade it instead of speckling
        float u = s * pa, res = abs(s * pb - v0 - (amp * sin(u / lam + t * 0.05 + ph) + amp * 0.3 * sin(u / (lam * 0.37) - t * 0.09 + ph * 2.1) + amp * 0.08 * sin(u / (lam * 0.13) + t * 0.17)));
        float conv = 1.0 - smoothstep(0.6, 3.0, res);
        float sE = d.y, alt = altAt(s, sE);
        if (alt < 92.0 || alt > 420.0 || conv <= 0.0) return vec3(0.0);
        // where along the sheet it is bright (patches drift slowly) and the rays: soft, only where they are many pixels wide
        float pq = 0.5 + 0.3 * sin(u * 0.011 + t * 0.03 + ph) + 0.2 * sin(u * 0.031 - t * 0.05 + ph * 0.7);
        float pch = 0.18 + 0.82 * pow(smoothstep(0.25, 0.8, pq), 1.4) * (1.0 - smoothstep(380.0, 620.0, abs(u + 120.0 * sin(ph))));
        float wu = fwidth(u) + 1e-4;
        float r1 = 0.5 + 0.5 * sin(u * 0.42 + t * 0.22 + ph), r2 = 0.5 + 0.5 * sin(u * 1.15 - t * 0.37 + ph * 3.0);
        float k1 = 1.0 - smoothstep(0.03, 0.12, wu * 0.42 / 6.2832), k2 = 1.0 - smoothstep(0.03, 0.12, wu * 1.15 / 6.2832);
        float rays = 0.8 + 0.14 * mix(0.5, r1, k1) + 0.06 * mix(0.5, r2, k2);
        float top = topA + 45.0 * (0.5 + 0.5 * sin(u * 0.05 + ph * 1.7 + t * 0.04)) + 10.0 * (mix(0.5, r1, k1) - 0.5) * 2.0;
        float green = smoothstep(96.0, 106.0, alt) * exp(-max(alt - 108.0, 0.0) / 32.0) * (1.0 - smoothstep(top - 55.0, top, alt));
        float red = smoothstep(170.0, 240.0, alt) * exp(-max(alt - 250.0, 0.0) / 90.0) * pch;
        float fringe = exp(-pow((alt - 100.0) / 4.0, 2.0)) * pch;
        // looking along the sheet: a longer path through it (capped)
        float Fd = amp / lam * cos(u / lam + t * 0.05 + ph);
        vec2 n2 = normalize(uB - Fd * uA); float sinT = abs(dot(normalize(d), vec3(n2.x, 0.0, n2.y)));
        float path = min(1.0 / max(sinT, 0.2), 3.5);
        vec3 c = (vec3(0.12, 1.0, 0.36) * green * rays + vec3(1.0, 0.16, 0.12) * red * 0.18 * (0.7 + 0.3 * rays) + vec3(0.85, 0.22, 0.6) * fringe * 0.4 * bright) * conv;
        return c * pch * bright * path * 0.16;
      }
      void main(){
        vec3 d = normalize(vDir); float e = d.y;
        // the night sky's base: deep blue at the zenith, the haze band, the ground dark
        vec3 col = mix(vec3(0.016, 0.02, 0.035), vec3(0.0045, 0.006, 0.014), smoothstep(0.0, 0.6, e));
        col *= smoothstep(-0.08, 0.02, e) * 0.85 + 0.15;
        // the city's glow: an orange dome over the valley (dies with the lights)
        float ca = dot(normalize(d.xz + 1e-5), normalize(uCityDir));
        col += vec3(0.42, 0.24, 0.12) * uGlow * exp(-max(e, 0.0) / 0.075) * (0.25 + 0.75 * smoothstep(-0.2, 0.9, ca)) * smoothstep(-0.04, 0.0, e) * 0.45;
        // the Milky Way, brighter once the glow is gone
        if (uMW > 0.5 && e > -0.02) { float lon = atan(d.z, d.x), lat = asin(clamp(d.y, -1.0, 1.0));
          vec3 mw = texture2D(tMW, vec2(lon / 6.2831853 + 0.5, lat / 3.1415927 + 0.5)).rgb;
          col += mw * uStars * 0.18 * smoothstep(-0.02, 0.12, e) * (1.0 - 0.8 * uGlow * exp(-max(e, 0.0) / 0.2)); }
        // the aurora
        if (uAur > 0.001 && e > 0.0) {
          vec3 au = sheet(d, 30.0, 20.0, 60.0, 0.0, 0.9, 175.0) + sheet(d, 150.0, 48.0, 140.0, 1.7, 1.0, 200.0) + sheet(d, 260.0, 62.0, 190.0, 3.1, 1.15, 215.0)
                  + sheet(d, 420.0, 80.0, 240.0, 4.4, 1.0, 230.0) + sheet(d, 640.0, 100.0, 300.0, 5.7, 0.8, 240.0) + sheet(d, -90.0, 30.0, 90.0, 2.5, 0.8, 190.0)
                  + sheet(d, -230.0, 55.0, 170.0, 0.9, 1.0, 205.0) + sheet(d, -380.0, 75.0, 230.0, 3.8, 0.95, 225.0);   // the sky behind you too
          au += vec3(0.08, 0.55, 0.2) * 0.006 * exp(-e / 0.25);                         // diffuse glow low in the sky
          col += au * uAur * uPulse;
        }
        gl_FragColor = vec4(col, 1.0);
      }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), mat); mesh.frustumCulled = false; mesh.renderOrder = -10;
  return { mesh, U };
}

// ---- the power line: lattice pylons, insulator strings, conductors (>= 1.6 px ribbons) ----
export function makePowerLine(towers) {
  const g = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: '#6c7076', roughness: 0.55, metalness: 0.6 });
  const members = [];
  const bar = (a, b, w) => { const d = b.clone().sub(a), L = d.length(), m = new THREE.BoxGeometry(w, L, w); m.translate(0, L / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()); m.applyQuaternion(q); m.translate(a.x, a.y, a.z); members.push(m); };
  const attach = [];
  towers.forEach((T, ti) => {
    const yaw = T.yaw, c = Math.cos(yaw), s = Math.sin(yaw), W = (x, y, z) => V(T.x + x * c + z * s, T.y + y, T.z - x * s + z * c);
    const lv = [0, 8, 15, 21, 25, 29, 33], half = (y) => 3.2 - 2.4 * Math.min(1, y / 25);
    for (let k = 0; k < lv.length - 1; k++) { const y0 = lv[k], y1 = lv[k + 1], h0 = half(y0), h1 = half(y1);
      const c0 = [[-h0, -h0], [h0, -h0], [h0, h0], [-h0, h0]], c1 = [[-h1, -h1], [h1, -h1], [h1, h1], [-h1, h1]];
      for (let q = 0; q < 4; q++) { const a = c0[q], b = c1[q], a2 = c0[(q + 1) % 4], b2 = c1[(q + 1) % 4];
        bar(W(a[0], y0, a[1]), W(b[0], y1, b[1]), 0.22);                              // leg
        bar(W(a[0], y0, a[1]), W(b2[0], y1, b2[1]), 0.08); bar(W(a2[0], y0, a2[1]), W(b[0], y1, b[1]), 0.08);   // X bracing
        bar(W(b[0], y1, b[1]), W(b2[0], y1, b2[1]), 0.1); } }                        // ring
    bar(W(0, 33, 0), W(0, 36.5, 0), 0.18);                                              // peak (earth wire)
    for (const [y, wx] of [[21, 7.5], [27, 6.0]]) {                                      // crossarms
      bar(W(-wx, y, -0.6), W(wx, y, -0.6), 0.16); bar(W(-wx, y, 0.6), W(wx, y, 0.6), 0.16);
      bar(W(-wx, y, -0.6), W(-half(y), y - 2.2, -0.6), 0.1); bar(W(wx, y, 0.6), W(half(y), y - 2.2, 0.6), 0.1);
      for (const sx of [-1, 1]) { const top = W(sx * (wx - 0.3), y, 0), bot = W(sx * (wx - 0.3), y - 2.4, 0); attach.push({ tower: ti, top, bot, arm: y }); } }
    attach.push({ tower: ti, top: W(0, 36.5, 0), bot: W(0, 36.5, 0), arm: 36 });
  });
  g.add(new THREE.Mesh(mergeGeos(members), steel));
  // insulator strings: stacked glass discs (green-grey)
  const discs = [], glass = new THREE.MeshPhysicalMaterial({ color: '#6f8c86', roughness: 0.15, metalness: 0, clearcoat: 1 });
  for (const a of attach) { if (a.arm > 30) continue; for (let k = 0; k < 14; k++) { const d = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 16); d.translate(a.top.x, a.top.y - 0.15 - k * 0.16, a.top.z); discs.push(d); } }
  g.add(new THREE.Mesh(mergeGeos(discs), glass));
  // conductors: catenaries between successive towers (sag 6 m), as screen-space ribbons
  const pts = [], wires = [];
  const byTower = (ti) => attach.filter((a) => a.tower === ti);
  for (let ti = 0; ti < towers.length - 1; ti++) { const A = byTower(ti), Bt = byTower(ti + 1);
    for (let k = 0; k < A.length; k++) { const a = A[k].bot, b = Bt[k].bot, sag = A[k].arm > 30 ? 4 : 6.5; const w = [];
      for (let q = 0; q <= 24; q++) { const u = q / 24; w.push(a.clone().lerp(b, u).add(V(0, -sag * 4 * u * (1 - u), 0))); }
      wires.push(w); } }
  const ribbons = new Ribbons(wires, { width: 0.032, color: new THREE.Color('#15171a') }); g.add(ribbons.mesh);
  return { group: g, attach, ribbons };
}

// polylines drawn as camera-facing ribbons at least 1.6 px wide (alpha = true width / drawn width), DoubleSide
export class Ribbons {
  constructor(lines, { width = 0.03, color = new THREE.Color('#111') } = {}) {
    const P = [], Q = [], S = [], idx = []; let v = 0;
    for (const L of lines) for (let i = 0; i < L.length - 1; i++) { const a = L[i], b = L[i + 1];
      for (const [p, o, sd] of [[a, b, -1], [a, b, 1], [b, a, -1], [b, a, 1]]) { P.push(p.x, p.y, p.z); Q.push(o.x, o.y, o.z); S.push(sd); }
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); v += 4; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aOther', new THREE.Float32BufferAttribute(Q, 3)); g.setAttribute('aSide', new THREE.Float32BufferAttribute(S, 1)); g.setIndex(idx);
    this.u = { uW: { value: width }, uC: { value: color }, uRes: { value: new THREE.Vector2(1080, 1920) }, uMinPx: { value: 1.6 }, uA: { value: 1 } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: /* glsl */`
        uniform float uW, uMinPx; uniform vec2 uRes; attribute vec3 aOther; attribute float aSide; varying float vA;
        void main(){
          vec4 c0 = projectionMatrix * viewMatrix * vec4(position, 1.0), c1 = projectionMatrix * viewMatrix * vec4(aOther, 1.0);
          if (c0.w < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vA = 0.0; return; }
          vec2 s0 = c0.xy / c0.w * 0.5 * uRes, s1 = c1.xy / max(c1.w, 1e-3) * 0.5 * uRes; vec2 dir = normalize(s1 - s0 + 1e-6), nrm = vec2(-dir.y, dir.x);
          float px = uW * projectionMatrix[1][1] * 0.5 * uRes.y / max(c0.w, 1e-3), w = max(px, uMinPx);
          vA = min(1.0, px / uMinPx);
          vec2 sp = s0 + nrm * aSide * w * 0.5;
          gl_Position = vec4(sp / (0.5 * uRes) * c0.w, c0.z, c0.w);
        }`,
      fragmentShader: `uniform vec3 uC; uniform float uA; varying float vA; void main(){ gl_FragColor = vec4(uC, vA * uA); }` });
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false;
  }
  update(W, H, pr) { this.u.uRes.value.set(W * pr, H * pr); }
}
