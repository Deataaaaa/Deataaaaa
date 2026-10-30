// Piccadilly Circus at night for post 13 (What if beauty standards were reversed for 5 years?). The layout comes from
// OpenStreetMap (engine/data/piccadilly_osm.json; map data (c) OpenStreetMap contributors, ODbL): building footprints and
// levels, road centrelines and lanes, crossings, the curve of the Piccadilly Lights, the fountain, Tube entrances and
// phone boxes. Local frame: x east, z south, y up, origin = the Shaftesbury Memorial Fountain (Eros); carriageways at
// y = 0, pavements at KERB. Wet after rain: a planar reflection (layer 0 only; the ground itself is on layer 1) gives
// the streets the screen's colours, blurred into streaks toward the viewer except in the puddles.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { rng } from './core.js';
import { SIMPLEX } from './fx.js';

export const PC = {
  KERB: 0.12, FINE: 72, MED: 288, SCR0: 6.6, SCRH: 17.56,
  U: { uWet: { value: 1 }, uStreet: { value: 1 }, uRefK: { value: 1 }, uLampN: { value: 0 },
    uLampP: { value: Array.from({ length: 40 }, () => new THREE.Vector4(0, -100, 0, 0)) } },
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

export async function loadOSM() { return (await fetch('/engine/data/piccadilly_osm.json')).json(); }

// carriageway width from the road class and lanes (London: ~3.2 m lanes plus a margin)
export function roadWidth(r) {
  const ln = r.ln;
  switch (r.hw) {
    case 'primary': case 'trunk': return ln ? ln * 3.3 + 1.0 : (r.ow ? 7.6 : 11);
    case 'secondary': case 'tertiary': return ln ? ln * 3.2 + 0.8 : (r.ow ? 6.2 : 8.6);
    case 'residential': case 'unclassified': return ln ? ln * 3.0 + 0.6 : (r.ow ? 4.8 : 6.4);
    case 'service': return 3.6;
    default: return 0;                                            // pedestrian streets are paved
  }
}
function offsetLine(pts, o) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    out.push([pts[i][0] - dz * o, pts[i][1] + dx * o]);
  }
  return out;
}
function trimLine(pts, d0, d1) {
  const L = []; let s = 0; L.push(0);
  for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(s); }
  if (s < d0 + d1 + 2) return null;
  const at = (d) => { let i = 1; while (i < L.length - 1 && L[i] < d) i++; const f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; };
  const out = [at(d0)]; for (let i = 1; i < pts.length - 1; i++) if (L[i] > d0 && L[i] < s - d1) out.push(pts[i]); out.push(at(s - d1));
  return out;
}

// ---------------- the road markings: R carriageway, G white paint, B yellow paint ----------------
function marksCanvas(osm, R, N) {
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d');
  const s = N / (2 * R), X = (x) => (x + R) * s, Z = (z) => (z + R) * s;
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
  const roads = osm.roads.filter((r) => roadWidth(r) > 0);
  const path = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Z(p[1])) : ctx.moveTo(X(p[0]), Z(p[1])))); };
  const strokeAll = (ctx, dw, col) => { ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const r of roads) { const w = roadWidth(r) + dw; if (w <= 0) continue; ctx.lineWidth = w * s; path(ctx, r.p); ctx.stroke(); } };
  g.globalCompositeOperation = 'lighter';
  strokeAll(g, 0, '#ff0000');
  // double yellow lines along every kerb: bands inset from the union of the carriageways
  const band = (a, b) => { const c2 = document.createElement('canvas'); c2.width = c2.height = N; const h = c2.getContext('2d');
    strokeAll(h, -a, '#fff'); h.globalCompositeOperation = 'destination-out'; strokeAll(h, -b, '#fff');
    h.globalCompositeOperation = 'source-in'; h.fillStyle = '#0000ff'; h.fillRect(0, 0, N, N); g.drawImage(c2, 0, 0); };
  band(0.4, 0.6); band(0.8, 1.0);
  // lane lines (3 m dashes, 6 m gaps) between the lanes of the one-way carriageways, centre lines on two-way roads
  g.strokeStyle = '#00ff00'; g.lineCap = 'butt'; g.lineWidth = Math.max(1, 0.11 * s);
  for (const r of roads) {
    const w = roadWidth(r), n = r.ln || (r.ow ? 2 : 2), lw = (w - 1.0) / n;
    const t = trimLine(r.p, 7, 7); if (!t) continue;
    g.setLineDash(r.ow ? [3 * s, 6 * s] : [4 * s, 8 * s]);
    if (r.ow) for (let i = 1; i < n; i++) { path(g, offsetLine(t, (i - n / 2) * lw)); g.stroke(); }
    else { path(g, t); g.stroke(); }
  }
  g.setLineDash([]);
  // signalised crossings: two lines of studs across the road, 2.4 m apart (only on the carriageway)
  const cc = document.createElement('canvas'); cc.width = cc.height = N; const h = cc.getContext('2d');
  h.strokeStyle = '#fff'; h.lineCap = 'butt'; h.lineWidth = 0.14 * s; h.setLineDash([0.2 * s, 0.25 * s]);
  for (const c of osm.crossings || []) for (const o of [-1.2, 1.2]) { path(h, offsetLine(c.p, o)); h.stroke(); }
  h.setLineDash([]); h.globalCompositeOperation = 'destination-in'; strokeAll(h, -0.2, '#fff');
  h.globalCompositeOperation = 'source-in'; h.fillStyle = '#00ff00'; h.fillRect(0, 0, N, N); g.drawImage(cc, 0, 0);
  return cv;
}
function texFrom(cv) {
  const t = new THREE.CanvasTexture(cv); t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}

// kerb faces: the 0.5 contour of the carriageway mask (marching squares on the texel centres, as the shader samples
// it), each segment a vertical face from the road (y 0) to the pavement (KERB), facing the road
const MS = [null, [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]], [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[1, 3]], [[0, 1]], [[0, 3]], null];
function kerbSegs(cv, R, keep, out) {
  const N = cv.width, img = cv.userData || (cv.userData = cv.getContext('2d').getImageData(0, 0, N, N).data), s = (2 * R) / N, T = 127.5;
  const v = (i, j) => img[(j * N + i) * 4], C = (i) => -R + (i + 0.5) * s;
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
    const idx = (a > T ? 1 : 0) | (b > T ? 2 : 0) | (c > T ? 4 : 0) | (d > T ? 8 : 0);
    if (idx === 0 || idx === 15) continue;
    const x0 = C(i), z0 = C(j); if (!keep(x0, z0)) continue;
    const ip = (p, q) => (T - p) / (q - p);
    const E = (e) => (e === 0 ? [x0 + ip(a, b) * s, z0] : e === 1 ? [x0 + s, z0 + ip(b, c) * s] : e === 2 ? [x0 + ip(d, c) * s, z0 + s] : [x0, z0 + ip(a, d) * s]);
    let gx = (b + c - a - d), gz = (d + c - a - b); const gl = Math.hypot(gx, gz) || 1; gx /= gl; gz /= gl;
    for (const [e0, e1] of MS[idx]) { const p = E(e0), q = E(e1); out.push(p[0], p[1], q[0], q[1], gx, gz); }
  }
}
function kerbMesh(segs) {
  const n = segs.length / 6, pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), idx = new Uint32Array(n * 6), K = PC.KERB;
  for (let k = 0; k < n; k++) {
    const [x0, z0, x1, z1, nx, nz] = segs.slice(k * 6, k * 6 + 6);
    pos.set([x0, 0, z0, x1, 0, z1, x1, K, z1, x0, K, z0], k * 12);
    for (let q = 0; q < 4; q++) nor.set([nx, 0, nz], k * 12 + q * 3);
    idx.set([k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3], k * 6);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = new THREE.MeshStandardMaterial({ color: '#6f6c67', roughness: 0.45, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.layers.set(1); return mesh;
}

// ---------------- the ground (two planes: carriageway at 0, pavement at KERB with the roads cut out) ----------------
function groundMat({ pave, fine, med, refl }) {
  const m = new THREE.MeshStandardMaterial({ color: pave ? '#8d8a84' : '#2e2e30', roughness: 0.85, metalness: 0 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { tFine: { value: fine }, tMed: { value: med }, uFine: { value: PC.FINE }, uMed: { value: PC.MED }, uWet: PC.U.uWet,
      tRefl: refl.material.uniforms.tDiffuse, uTexMat: refl.material.uniforms.textureMatrix, uRefInv: { value: refl.userData.inv }, uRefK: PC.U.uRefK,
      uLampP: PC.U.uLampP, uLampN: PC.U.uLampN });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      ${SIMPLEX}
      varying vec3 vWP; uniform sampler2D tFine, tMed, tRefl; uniform float uFine, uMed, uWet, uRefK; uniform mat4 uTexMat, uRefInv;
      uniform vec4 uLampP[40]; uniform int uLampN;
      float hs1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec4 marksAt(vec2 p){ vec4 a = texture2D(tFine, (p + uFine) / (2.0 * uFine)), b = texture2D(tMed, (p + uMed) / (2.0 * uMed));
        vec2 q = abs(p); return max(q.x, q.y) < uFine * 0.95 ? a : b; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec4 mk = marksAt(vWP.xz);
      vec2 fw = fwidth(vWP.xz); float px = max(fw.x, fw.y);
      ${pave ? `if (mk.r > 0.5) discard;
        // concrete slabs (0.6 m, rows offset), a granite kerb stone along the road
        vec2 sg = vWP.xz / 0.6; sg.x += 0.5 * mod(floor(sg.y), 2.0);
        vec2 sf = fract(sg), sw = fwidth(sg) + 1e-4;
        vec2 jl = smoothstep(0.025 - sw, 0.025 + sw, sf) * smoothstep(0.025 - sw, 0.025 + sw, 1.0 - sf);
        float joint = (1.0 - jl.x * jl.y) * (1.0 - smoothstep(0.15, 0.4, max(sw.x, sw.y)));
        float tone = 0.86 + 0.24 * hs1(floor(sg)) * (1.0 - smoothstep(0.2, 0.6, max(sw.x, sw.y)));
        diffuseColor.rgb *= tone * (1.0 - 0.35 * joint);
        float kb = max(max(step(0.5, marksAt(vWP.xz + vec2(0.17, 0.0)).r), step(0.5, marksAt(vWP.xz - vec2(0.17, 0.0)).r)),
                       max(step(0.5, marksAt(vWP.xz + vec2(0.0, 0.17)).r), step(0.5, marksAt(vWP.xz - vec2(0.0, 0.17)).r)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.44, 0.42), kb);`
    : `float grain = fbm3(vec3(vWP.xz * 4.0, 0.0), 2) * (1.0 - smoothstep(0.03, 0.12, px));
        float patchN = fbm3(vec3(vWP.xz * 0.07, 3.0), 3);
        diffuseColor.rgb *= 0.9 + 0.14 * grain + 0.12 * patchN;
        float wear = smoothstep(-0.5, 0.5, fbm3(vec3(vWP.xz * 1.1, 7.0), 2));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.6, 0.6, 0.57), mk.g * (0.5 + 0.5 * wear));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.5, 0.1), mk.b * (0.55 + 0.45 * wear));`}
      float pud = smoothstep(0.12, 0.42, fbm3(vec3(vWP.xz * 0.2, 1.7), 3) + 0.05) * uWet;
      diffuseColor.rgb *= 1.0 - 0.32 * uWet - 0.22 * pud;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, mix(0.42, 0.06, pud), uWet);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      // warm pools under the lamps
      vec3 pool = vec3(0.0);
      for (int i = 0; i < 40; i++) { if (i >= uLampN) break; vec2 d = vWP.xz - uLampP[i].xz; float d2 = dot(d, d);
        pool += uLampP[i].w * (1.0 / (1.0 + d2 / 5.0)) * exp(-d2 / 140.0); }
      totalEmissiveRadiance += diffuseColor.rgb * pool * vec3(1.0, 0.72, 0.45) * 0.4;
      // the wet sheen: the planar reflection, streaked toward the viewer (rough wet asphalt), sharp in the puddles
      vec4 rp = uTexMat * (uRefInv * vec4(vWP.x, 0.0, vWP.z, 1.0));
      vec2 ruv = rp.xy / max(rp.w, 1e-4);
      vec3 Vv = normalize(cameraPosition - vWP);
      float fres = 0.025 + 0.975 * pow(max(1.0 - Vv.y, 0.0), 5.0);
      float rgh = mix(${pave ? '0.5' : '0.34'}, 0.04, pud);
      vec3 rc = vec3(0.0); float st = rgh * 0.022;
      for (int k = -3; k <= 3; k++) rc += textureLod(tRefl, ruv + vec2(0.0, float(k) * st), rgh * 6.0).rgb;
      rc /= 7.0;
      totalEmissiveRadiance += rc * fres * uWet * uRefK * mix(${pave ? '0.1' : '0.45'}, ${pave ? '0.5' : '1.0'}, pud);`);
  };
  m.customProgramCacheKey = () => 'pcground' + (pave ? 1 : 0);
  return m;
}

export function makeGround(osm, renderer, { ssaa = 2, lo = false } = {}) {
  const NF = lo ? 2048 : 4096, NM = lo ? 2048 : 4096;
  const cf = marksCanvas(osm, PC.FINE, NF), cm = marksCanvas(osm, PC.MED, NM);
  const fine = texFrom(cf), med = texFrom(cm);
  // the planar reflection: renders layer 0 (everything but the ground) mirrored in y = 0, half resolution, mipmapped
  const W = 1080 * ssaa, H = 1920 * ssaa;
  const refl = new Reflector(new THREE.PlaneGeometry(2000, 2000), { textureWidth: W / 2, textureHeight: H / 2, clipBias: 0.003, multisample: 0 });
  refl.rotation.x = -Math.PI / 2; refl.updateMatrixWorld(true); refl.userData.inv = refl.matrixWorld.clone().invert();
  const rt = refl.getRenderTarget(); rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
  refl.material.colorWrite = false; refl.material.depthWrite = false; refl.renderOrder = -1000;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), groundMat({ pave: false, fine, med, refl }));
  road.rotation.x = -Math.PI / 2; road.receiveShadow = true; road.layers.set(1);
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(PC.MED * 2 * 0.98, PC.MED * 2 * 0.98), groundMat({ pave: true, fine, med, refl }));
  pave.rotation.x = -Math.PI / 2; pave.position.y = PC.KERB; pave.receiveShadow = true; pave.layers.set(1);
  const segs = [];
  kerbSegs(cf, PC.FINE, (x, z) => Math.max(Math.abs(x), Math.abs(z)) < PC.FINE * 0.95, segs);
  kerbSegs(cm, PC.MED, (x, z) => { const q = Math.max(Math.abs(x), Math.abs(z)); return q >= PC.FINE * 0.95 && q < PC.MED * 0.98; }, segs);
  const kerb = kerbMesh(segs);
  const isRoad = (x, z) => { const R = PC.FINE, N = NF; if (Math.max(Math.abs(x), Math.abs(z)) >= R * 0.95) return null;
    const i = Math.floor((x + R) / (2 * R) * N), j = Math.floor((z + R) / (2 * R) * N); return cf.userData[(j * N + i) * 4] > 127; };
  return { road, pave, kerb, refl, fine, med, segs, isRoad };
}
// the ground height at a point (pavement or road)
export function groundAt(G, x, z) { const r = G.isRoad(x, z); return r ? 0 : PC.KERB; }

// ---------------- buildings: OSM footprints extruded, one façade shader for all (shops, windows, cornices) ----------------
const STONES = ['#cbbfa6', '#d3cab8', '#c4b394', '#d8d3c6', '#8b4f3e', '#9a6a52', '#b8a586', '#cfc7b7'];
function facadeMat() {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, metalness: 0 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uWet = PC.U.uWet; s.uniforms.uStreet = PC.U.uStreet;
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>
      attribute vec4 aB; attribute vec3 aCol; attribute vec2 aUV; flat varying vec4 vB; flat varying vec3 vCol; varying vec2 vF; varying vec3 vWN; varying vec3 vWP;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vB = aB; vCol = aCol; vF = aUV; vWN = normalize(mat3(modelMatrix) * objectNormal); vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      flat varying vec4 vB; flat varying vec3 vCol; varying vec2 vF; varying vec3 vWN; varying vec3 vWP; uniform float uWet, uStreet;
      float hb(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float band(float x, float a, float b, float w){ return smoothstep(a - w, a + w, x) * (1.0 - smoothstep(b - w, b + w, x)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float seed = vB.x, Hb = vB.y, gH = vB.z, brick = vB.w;
      bool roof = vWN.y > 0.5;
      vec3 base = vCol; vec3 emis = vec3(0.0); float glass = 0.0;
      float u = vF.x, h = vF.y;
      if (!roof) {
        float fh = 3.9, bay = 2.6 + 0.7 * hb(vec3(seed, 1.0, 2.0));
        if (h < gH) {
          // shopfronts: glazed bays between piers, a fascia with a lit sign
          float bx = u / 5.4 + hb(vec3(seed, 4.0, 1.0)), fx = fract(bx), bi = floor(bx);
          float fwx = fwidth(bx) + 1e-4, fwh = fwidth(h) + 1e-4;
          float pier = 1.0 - band(fx, 0.09, 0.91, fwx);
          float win = (1.0 - pier) * band(h, 0.45, gH - 1.25, fwh);
          float fasc = band(h, gH - 1.1, gH - 0.3, fwh) * (1.0 - pier * 0.5);
          float kind = hb(vec3(bi, seed, 3.0));
          vec3 shop = kind < 0.45 ? vec3(1.0, 0.84, 0.62) : kind < 0.8 ? vec3(0.92, 0.96, 1.0) : vec3(1.0, 0.66, 0.48);
          float lvl = 0.55 + 0.9 * hb(vec3(bi, seed, 5.0));
          float shelf = 0.7 + 0.3 * band(fract(h * 1.4), 0.1, 0.8, fwh * 1.4) * band(fract(fx * 6.0), 0.15, 0.9, fwx * 6.0);
          float far = smoothstep(0.2, 0.6, max(fwx * 6.0, fwh * 1.4));
          shelf = mix(shelf, 0.85, far);
          emis += win * shop * lvl * shelf * (0.8 + 0.5 * smoothstep(0.5, gH - 1.3, h)) * 0.55 * step(0.12, hb(vec3(bi, seed, 9.0)));
          glass = win;
          vec3 signC = kind < 0.3 ? vec3(1.0, 0.95, 0.9) : kind < 0.55 ? vec3(1.0, 0.25, 0.2) : kind < 0.8 ? vec3(0.4, 0.6, 1.0) : vec3(1.0, 0.75, 0.3);
          float letters = band(fx, 0.25, 0.75, fwx) * band(h, gH - 0.85, gH - 0.55, fwh) * mix(0.55 + 0.45 * step(0.4, fract(fx * 19.0 + bi)), 0.75, far);
          base = mix(base, base * 0.18, fasc);
          emis += fasc * letters * signC * 1.2;
          base = mix(base, vec3(0.03), win * 0.8);
        } else if (h < Hb - 1.4) {
          float fl = (h - gH) / fh, fy = fract(fl), fi = floor(fl);
          float bx = u / bay + 0.5, fx = fract(bx), bi = floor(bx);
          vec2 fw = vec2(fwidth(bx), fwidth(fl)) + 1e-4;
          float far = smoothstep(0.08, 0.3, max(fw.x, fw.y));
          float w = band(fx, 0.28, 0.72, fw.x) * band(fy, 0.17, 0.8, fw.y);
          float pane = band(fx, 0.31, 0.69, fw.x) * band(fy, 0.2, 0.77, fw.y);
          float on = step(0.6, hb(vec3(bi, fi, seed)));
          vec3 wc = mix(vec3(1.0, 0.76, 0.5), vec3(0.85, 0.9, 1.0), step(0.78, hb(vec3(fi, bi, seed + 3.0))));
          float lvl = 0.45 + 0.8 * hb(vec3(bi, fi, seed + 7.0));
          float ledge = band(fy, 0.13, 0.17, fw.y);                                 // sill / string course
          base *= 1.0 - 0.22 * (1.0 - smoothstep(0.0, 0.07, fy)) * (1.0 - far);       // shadow under each course
          base = mix(base, base * 1.18, ledge * (1.0 - far));
          if (brick > 0.5) { float bw = fwidth(h / 0.075); base *= 1.0 - 0.1 * (1.0 - band(fract(h / 0.075), 0.0, 0.85, bw)) * (1.0 - smoothstep(0.25, 0.6, bw)); }
          vec3 paneCol = mix(vec3(0.015, 0.017, 0.02), wc * 0.12, on);
          base = mix(base, mix(vec3(0.85, 0.84, 0.8) * (brick > 0.5 ? 1.0 : 0.9), paneCol, pane / max(w, 1e-3)), w * (1.0 - far));
          emis += pane * on * wc * lvl * 0.7 * (1.0 - far);
          emis += far * vec3(0.9, 0.72, 0.5) * 0.18 * (0.3 + 0.7 * hb(vec3(floor(fl), floor(u / 12.0), seed)));
          glass = pane * (1.0 - far);
        } else {
          float fwh = fwidth(h) + 1e-4;
          base *= 1.0 - 0.35 * band(h, Hb - 1.4, Hb - 1.15, fwh);                    // the cornice's shadow
          base *= 1.0 + 0.12 * band(h, Hb - 1.15, Hb - 0.9, fwh);
        }
        // the street's light washing up the walls (lamps, shop windows), fading with height
        emis += base * uStreet * vec3(1.0, 0.72, 0.48) * (0.16 * exp(-h / 5.0) + 0.05 * exp(-h / 22.0));
      } else {
        base = vec3(0.1, 0.1, 0.11) * (0.85 + 0.3 * hb(vec3(floor(vWP.xz * 0.4), seed)));
      }
      diffuseColor.rgb = base * (1.0 - 0.2 * uWet * (roof ? 1.0 : 0.25));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.07, glass); if (roof) roughnessFactor = mix(0.85, 0.35, uWet);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += emis;`);
  };
  m.customProgramCacheKey = () => 'pcfacade';
  return m;
}
// one merged mesh for all the footprints; returns it with the list of buildings (outline, height)
const inPoly = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j];
  if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const edgeD = (x, z, pts) => { let d = 1e9; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], ex = b[0] - a[0], ez = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez + 1e-9))); d = Math.min(d, Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t)); } return d; };
export { inPoly };
export function makeBuildings(osm, { maxD = 300 } = {}) {
  const screenAt = osm.lights ? osm.lights[4] : null;
  const P = [], Nn = [], UVs = [], Bs = [], Cs = [], I = [];
  const list = [];
  let vi = 0;
  const push = (p, n, uv, b, c) => { P.push(...p); Nn.push(...n); UVs.push(...uv); Bs.push(...b); Cs.push(...c); return vi++; };
  osm.buildings.forEach((bd, k) => {
    const pts = bd.p; if (pts.length < 3) return;
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    if (Math.hypot(cx, cz) > maxD) return;
    const r = hash(k * 1.7 + 0.3, cx * 0.01);
    let H = bd.h || (bd.lv ? bd.lv * 4.15 + 2.2 : (5 + Math.floor(r * 2.6)) * 3.9 + 1.8);
    if (screenAt && pts.some((p) => Math.hypot(p[0] - screenAt[0], p[1] - screenAt[1]) < 14)) H = Math.max(H, 29.5);
    const gH = 4.9, seed = k * 0.37 + 0.11, brickK = hash(k, 7) < 0.18 ? 1 : 0;
    const col = new THREE.Color(brickK ? STONES[4 + Math.floor(hash(k, 3) * 2)] : STONES[[0, 1, 2, 3, 6, 7][Math.floor(hash(k, 5) * 6)]]).convertSRGBToLinear();
    const c = [col.r, col.g, col.b], b = [seed, H, gH, brickK];
    let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; }
    let u = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz); if (L < 0.05) continue;
      const nx = (A > 0 ? dz : -dz) / L, nz = (A > 0 ? -dx : dx) / L, n = [nx, 0, nz];
      const a = push([p[0], 0, p[1]], n, [u, 0], b, c), bq = push([q[0], 0, q[1]], n, [u + L, 0], b, c), cq = push([q[0], H, q[1]], n, [u + L, H], b, c), dq = push([p[0], H, p[1]], n, [u, H], b, c);
      if (A > 0) I.push(a, cq, bq, a, dq, cq); else I.push(a, bq, cq, a, cq, dq);
      u += L;
    }
    const tri = THREE.ShapeUtils.triangulateShape(pts.map((p) => new THREE.Vector2(p[0], p[1])), []);
    const base = vi; for (const p of pts) push([p[0], H, p[1]], [0, 1, 0], [p[0], p[1]], b, c);
    for (const t of tri) { const [i0, i1, i2] = t; const p0 = pts[i0], p1 = pts[i1], p2 = pts[i2];
      const ny = (p1[1] - p0[1]) * (p2[0] - p0[0]) - (p1[0] - p0[0]) * (p2[1] - p0[1]);   // y of (p1 - p0) x (p2 - p0)
      if (ny > 0) I.push(base + i0, base + i1, base + i2); else I.push(base + i0, base + i2, base + i1); }
    list.push({ pts, H, cx, cz, name: bd.n, A: Math.abs(A) / 2 });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  g.setAttribute('aUV', new THREE.Float32BufferAttribute(UVs, 2)); g.setAttribute('aB', new THREE.Float32BufferAttribute(Bs, 4)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(Cs, 3));
  g.setIndex(I);
  const mesh = new THREE.Mesh(g, facadeMat()); mesh.castShadow = true; mesh.receiveShadow = false;
  // roof clutter: plant rooms, lift shafts, skylights (seen from above, the flat roofs read as cardboard without it)
  const boxes = [], rr = rng(77);
  for (const b of list) {
    if (b.A < 120) continue;
    let ang = 0, best = 0; for (let i = 0; i < b.pts.length; i++) { const p = b.pts[i], q = b.pts[(i + 1) % b.pts.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L > best) { best = L; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); } }
    const xs = b.pts.map((p) => p[0]), zs = b.pts.map((p) => p[1]), n = Math.min(9, 1 + Math.floor(b.A / 260));
    for (let k = 0, tries = 0; k < n && tries < 60; tries++) {
      const x = Math.min(...xs) + rr() * (Math.max(...xs) - Math.min(...xs)), z = Math.min(...zs) + rr() * (Math.max(...zs) - Math.min(...zs));
      if (!inPoly(x, z, b.pts)) continue; const sx = 1.5 + rr() * 5, sz = 1.5 + rr() * 4; if (edgeD(x, z, b.pts) < Math.max(sx, sz) * 0.75 + 1.5) continue;
      boxes.push([x, b.H, z, sx, 0.8 + rr() * 2.8, sz, -ang, rr()]); k++;
    }
  }
  const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#7d7b77', roughness: 0.9 }), boxes.length), m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), cc = new THREE.Color();
  boxes.forEach(([x, y, z, sx, sy, sz, a, tone], i) => { qq.setFromAxisAngle(V(0, 1, 0), a); m4.compose(V(x, y + sy / 2, z), qq, V(sx, sy, sz)); bm.setMatrixAt(i, m4); bm.setColorAt(i, cc.setScalar(0.35 + 0.5 * tone)); });
  bm.castShadow = true;
  return { mesh, list, roofs: bm };
}

// ---------------- the Piccadilly Lights: one curved LED screen, 44.6 x 17.56 m, on the corner of Glasshouse Street ----------------
// Two content textures and a wipe (uMix: 0 shows A, 1 shows B; a bright band rides the edge), dimmer seen from the side,
// the LED modules' seams fading out when finer than a pixel. Three RectAreaLights spill its colours onto the Circus.
export function makeLightsScreen(osm) {
  RectAreaLightUniformsLib.init();
  const front = osm.lights.slice(0, 9).map((p) => V(p[0], 0, p[1]));
  const curve = new THREE.CatmullRomCurve3(front, false, 'centripetal');
  const n = 140, pts = curve.getSpacedPoints(n), L = curve.getLength();
  const Y0 = PC.SCR0, Y1 = PC.SCR0 + PC.SCRH;
  const pos = [], nor = [], uv = [], idx = [];
  const norms = pts.map((p, i) => { const t = curve.getTangentAt(i / n); let nn = V(-t.z, 0, t.x); if (nn.dot(V(-p.x, 0, -p.z)) < 0) nn.negate(); return nn; });
  pts.forEach((p, i) => { const q = p.clone().addScaledVector(norms[i], 0.25);
    pos.push(q.x, Y0, q.z, q.x, Y1, q.z); nor.push(norms[i].x, 0, norms[i].z, norms[i].x, 0, norms[i].z); uv.push(i / n, 0, i / n, 1);
    if (i < n) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const U = { tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uW: { value: 0.02 }, uBand: { value: 0 }, uGain: { value: 1 }, uLen: { value: L }, uOff: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide, fog: false,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vWP; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uW, uBand, uGain, uLen, uOff; varying vec2 vUv; varying vec3 vN; varying vec3 vWP;
      void main(){
        vec3 a = texture2D(tA, vUv).rgb, b = texture2D(tB, vUv).rgb;
        float e = vUv.x - uMix, w = max(uW, 1e-3);
        float k = 1.0 - smoothstep(-w, w, e);
        vec3 c = mix(a, b, k) + uBand * exp(-e * e / (w * w)) * vec3(1.0, 0.96, 0.92);
        vec3 Vv = normalize(cameraPosition - vWP); float ax = abs(dot(Vv, vN));
        c *= uGain * (0.5 + 0.5 * ax) * (1.0 - uOff);
        gl_FragColor = vec4(c + vec3(0.004), 1.0);
      }` });
  const mesh = new THREE.Mesh(g, mat);
  // the steel frame round the screen and the dark band above it
  const frameM = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.5, metalness: 0.6 });
  const fr = new THREE.Group();
  for (const [y0, y1] of [[Y0 - 0.45, Y0], [Y1, Y1 + 0.6]]) {
    const fp = [], fi = []; pts.forEach((p, i) => { const q = p.clone().addScaledVector(norms[i], 0.3); fp.push(q.x, y0, q.z, q.x, y1, q.z); if (i < n) fi.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3); });
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi); fg.computeVertexNormals();
    const fm = new THREE.Mesh(fg, frameM); fm.castShadow = true; fr.add(fm);
  }
  // the lights: three panels along the curve
  const lights = [];
  for (let k = 0; k < 3; k++) {
    const t = (k + 0.5) / 3, p = curve.getPointAt(t), tan = curve.getTangentAt(t); let nn = V(-tan.z, 0, tan.x); if (nn.dot(V(-p.x, 0, -p.z)) < 0) nn.negate();
    const l = new THREE.RectAreaLight('#ffffff', 0, L / 3, PC.SCRH); l.position.set(p.x, Y0 + PC.SCRH / 2, p.z).addScaledVector(nn, 0.5);
    l.lookAt(l.position.clone().add(nn)); lights.push(l);
  }
  return { mesh, frame: fr, U, curve, L, lights, pts, norms };
}
// the average colour of each third of a content canvas (linear), for the screen's lights
export function thirds(cv) {
  const w = 48, h = 18, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(cv, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, out = [];
  for (let k = 0; k < 3; k++) { let r = 0, gg = 0, b = 0, n = 0;
    for (let y = 0; y < h; y++) for (let x = Math.floor(k * w / 3); x < Math.floor((k + 1) * w / 3); x++) { const i = (y * w + x) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    out.push(new THREE.Color(r / n / 255, gg / n / 255, b / n / 255).convertSRGBToLinear()); }
  return out;
}

// ---------------- the Shaftesbury Memorial Fountain (Eros) ----------------
// three octagonal granite steps (people sit on them), the bronze basin, the pedestal with its bowl, the aluminium archer
export const EROS = { STEP: [5.0, 4.35, 3.7], RISE: 0.36, BASIN: 3.35, TOP: 0, STATUE_Y: 0 };
export function makeFountain({ rot = Math.PI / 8 } = {}) {
  const g = new THREE.Group(), K = PC.KERB;
  const granite = new THREE.MeshStandardMaterial({ color: '#86827b', roughness: 0.55 });
  const bronze = new THREE.MeshStandardMaterial({ color: '#5e4a33', roughness: 0.42, metalness: 0.85 });
  bronze.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vOP;\n${SIMPLEX}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float pat = smoothstep(0.1, 0.6, fbm3(vOP * 2.2, 3));                       // green patina in patches
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.33, 0.28), pat * 0.55);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.75, smoothstep(0.1, 0.6, fbm3(vOP * 2.2, 3)));`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
      metalnessFactor = mix(metalnessFactor, 0.2, smoothstep(0.1, 0.6, fbm3(vOP * 2.2, 3)));`);
  };
  bronze.customProgramCacheKey = () => 'erosbronze';
  EROS.ROT = rot;
  let y = K;
  EROS.STEP.forEach((r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, EROS.RISE, 8), granite); m.rotation.y = rot; m.position.y = y + EROS.RISE / 2; m.castShadow = m.receiveShadow = true; g.add(m); y += EROS.RISE; });
  EROS.TOP = y;
  // the basin: an octagonal bronze wall with panels, dark water inside
  const wallP = []; const wr = EROS.BASIN, wh = 0.85;
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr * 0.97, wh, 8, 1, true), bronze); basin.rotation.y = rot; basin.position.y = y + wh / 2; basin.castShadow = true; g.add(basin);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(wr * 1.01, 0.09, 8, 8), bronze); rim.rotation.x = Math.PI / 2; rim.rotation.z = rot; rim.position.y = y + wh; g.add(rim);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(wr * 0.94, wr * 0.94, wh, 8, 1, true), bronze); inner.material = bronze; inner.rotation.y = rot; inner.position.y = y + wh / 2; inner.scale.set(1, 1, 1); g.add(inner);
  const water = new THREE.Mesh(new THREE.CircleGeometry(wr * 0.95, 8), new THREE.MeshStandardMaterial({ color: '#05080a', roughness: 0.04, metalness: 0.3 }));
  water.rotation.x = -Math.PI / 2; water.rotation.z = rot; water.position.y = y + wh * 0.72; g.add(water);
  // the pedestal: a lathe profile (base, the lower bowl, the shaft with its swellings, the capital, the plinth)
  const prof = [[0, 0], [1.45, 0], [1.5, 0.25], [1.2, 0.55], [0.75, 0.9], [0.62, 1.4], [0.9, 1.75], [1.95, 2.15], [2.0, 2.3], [1.7, 2.32], [0.6, 2.45],
    [0.45, 2.9], [0.62, 3.25], [0.4, 3.7], [0.55, 4.05], [0.33, 4.5], [0.42, 4.75], [0.62, 4.85], [0.62, 5.05], [0.42, 5.12], [0.4, 5.35], [0, 5.35]];
  const ped = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 24), bronze);
  ped.position.y = y; ped.castShadow = true; g.add(ped);
  EROS.STATUE_Y = y + 5.35;
  return { group: g, bronze, granite };
}
// the archer: the Xbot mannequin posed as Anteros (on the left foot, the right leg raised behind, leaning forward, the
// bow drawn), in weathered aluminium, with wings
export function poseArcher(xbot) {
  const alu = new THREE.MeshStandardMaterial({ color: '#8d9295', roughness: 0.38, metalness: 0.9 });
  xbot.root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) { o.material = alu; o.castShadow = true; } });
  const B = xbot.bones, R = (b, x, y, z) => { if (B[b]) B[b].rotation.set(B[b].rotation.x + x, B[b].rotation.y + y, B[b].rotation.z + z); };
  R('Spine', 0.25, 0, 0); R('Spine1', 0.1, 0.15, 0);
  R('RightUpLeg', 0.0, 0, 0); R('RightLeg', 0, 0, 0);
  R('LeftUpLeg', -0.2, 0, 0.05); R('LeftLeg', 0.6, 0, 0);
  R('RightUpLeg', 1.0, 0, -0.1); R('RightLeg', 1.2, 0, 0);
  R('LeftArm', 0, 0, -1.1); R('LeftForeArm', 0, 0, 0);
  R('RightArm', 0, 0.9, 1.2); R('RightForeArm', 0, 1.9, 0);
  R('Head', -0.15, 0.4, 0);
  // wings: two feathered blades from the shoulder blades, swept up and back
  const wingG = new THREE.Group();
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(0.15, 0.4, 0.35, 0.95, 0.2, 1.35); shape.bezierCurveTo(0.05, 1.05, -0.1, 0.55, -0.2, 0.35); shape.lineTo(0, 0);
  const wg = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  for (const s of [-1, 1]) { const w = new THREE.Mesh(wg, alu); w.scale.set(s * 0.9, 0.9, 0.9); w.position.set(s * 0.1, 0, -0.05); w.rotation.set(-0.5, s * 0.5, s * -0.25); w.castShadow = true; wingG.add(w); }
  return { alu, wings: wingG };
}

// ---------------- street furniture ----------------
// heritage lamp columns (black cast iron, a glowing lantern), placed along the kerbs; returns the lantern positions
export function makeLamps(sites) {
  const iron = new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.45, metalness: 0.6 });
  const glow = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffcf8a', emissiveIntensity: 7, roughness: 0.3 });
  const parts = [
    [new THREE.CylinderGeometry(0.17, 0.22, 0.75, 12), iron, 0.375], [new THREE.CylinderGeometry(0.07, 0.1, 3.5, 10), iron, 2.4],
    [new THREE.CylinderGeometry(0.16, 0.12, 0.12, 8), iron, 4.18], [new THREE.CylinderGeometry(0.2, 0.13, 0.62, 6), glow, 4.55],
    [new THREE.ConeGeometry(0.27, 0.28, 6), iron, 5.0], [new THREE.SphereGeometry(0.05, 8, 6), iron, 5.18],
  ];
  const g = new THREE.Group(), m4 = new THREE.Matrix4();
  for (const [geo, mat, y] of parts) {
    const im = new THREE.InstancedMesh(geo, mat, sites.length); im.castShadow = mat !== glow;
    sites.forEach((s, i) => { m4.makeTranslation(s.x, s.y + y, s.z); im.setMatrixAt(i, m4); }); im.instanceMatrix.needsUpdate = true; g.add(im);
  }
  return { group: g, heads: sites.map((s) => V(s.x, s.y + 4.55, s.z)) };
}
// sites along the kerbs every ~`step` metres (one per grid cell, on the pavement side)
export function lampSites(G, { R = 70, step = 24, inset = 0.55, avoid = [] } = {}) {
  const segs = G.segs, cells = new Map();
  for (let k = 0; k < segs.length; k += 6) {
    const x = (segs[k] + segs[k + 2]) / 2, z = (segs[k + 1] + segs[k + 3]) / 2; if (Math.max(Math.abs(x), Math.abs(z)) > R) continue;
    const key = Math.floor(x / step) + ',' + Math.floor(z / step), cx = (Math.floor(x / step) + 0.5) * step, cz = (Math.floor(z / step) + 0.5) * step;
    const d = Math.hypot(x - cx, z - cz), cur = cells.get(key);
    if (!cur || d < cur.d) cells.set(key, { d, x: x - segs[k + 4] * inset, z: z - segs[k + 5] * inset });
  }
  return [...cells.values()].filter((s) => avoid.every((a) => Math.hypot(s.x - a[0], s.z - a[1]) > (a[2] || 3))).map((s) => ({ x: s.x, y: PC.KERB, z: s.z }));
}

// the night sky over the West End: a low overcast lit orange from below, clearer toward the zenith
export function makeNightSky() {
  const U = { uZen: { value: new THREE.Color('#05070d') }, uHor: { value: new THREE.Color('#3a3036') }, uMid: { value: new THREE.Color('#141621') }, uGain: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `${SIMPLEX}
      uniform vec3 uZen, uHor, uMid; uniform float uGain; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float el = d.y;
        vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.2, el)); c = mix(c, uZen, smoothstep(0.18, 0.8, el));
        vec2 uv = d.xz / max(el + 0.15, 0.08);
        float n = fbm3(vec3(uv * 0.5, 0.3), 5), n2 = fbm3(vec3(uv * 1.7 + 3.1, 0.5), 3);
        float lump = smoothstep(-0.25, 0.65, n + 0.25 * n2);
        c *= 0.75 + 0.45 * lump; c += vec3(0.12, 0.06, 0.035) * lump * (1.0 - smoothstep(0.0, 0.55, el));
        c = mix(c, uHor * 0.9, 1.0 - smoothstep(-0.02, 0.07, el));
        gl_FragColor = vec4(c * uGain, 1.0); }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), mat); mesh.frustumCulled = false; mesh.renderOrder = -10;
  return { mesh, U };
}
