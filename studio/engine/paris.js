// Paris, Champ de Mars, late-summer afternoon (ep10): physical sky, foliage trees, Haussmann façades, the Eiffel Tower.
// Layout (metres, ~1:1): the tower stands at (0, 0, -200), the Champ de Mars lawns run along +z, the avenues sit at
// x = ±109, the Seine at z = -480. Looking along -z faces north-west, so a 16:30 sun (azimuth ~230°) lights from -x.
// FX uniforms drive the episode's light effects in every material patched by heatize():
//   uScorch: sunlit organic surfaces (grass, leaves, fabric) flash-heat and smoke where the sun hits them (shadows stay cool)
//   uHeat:   global incandescence (dark red -> orange -> white) when the air itself turns white-hot
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, clamp } from './core.js';
import { canvasTex, Beams } from './assets.js';
import { fbmT } from './ocean.js';
import { TEX_PENDING } from './elevator.js';

export const FX = {
  uScorch: { value: 0 }, uHeat: { value: 0 }, uSunI: { value: 3.2 }, uTime: { value: 0 }, uMelt: { value: 0 }, uWind: { value: 0 },
  uVapor: { value: 1e4 }, uTowerK: { value: 0.95 },
};

// ---------------------------------------------------------------------------------------------------------------
// material patch: scorch where sunlit (organic only) + incandescence everywhere
// ---------------------------------------------------------------------------------------------------------------
export function heatize(mat, { organic = 0, heat = 1, heatU = null } = {}) {
  mat.userData.heat = { organic, heat };
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uScorch = FX.uScorch; sh.uniforms.uHeat = FX.uHeat; sh.uniforms.uSunI = FX.uSunI; sh.uniforms.uFxTime = FX.uTime;
    sh.uniforms.uOrganic = { value: organic }; sh.uniforms.uHeatK = heatU || { value: heat };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHeatW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 hw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            hw = instanceMatrix * hw;
          #endif
          vHeatW = (modelMatrix * hw).xyz; }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uScorch, uHeat, uSunI, uOrganic, uHeatK, uFxTime; varying vec3 vHeatW;
        #ifdef BLADE
          varying float vBladeT, vBladeH;
        #endif
        vec3 blackbody(float k){            // k: 0 cold .. 1 white-hot
          vec3 c = mix(vec3(0.0), vec3(0.55,0.03,0.0), smoothstep(0.0,0.25,k));
          c = mix(c, vec3(1.0,0.32,0.04), smoothstep(0.2,0.5,k));
          c = mix(c, vec3(1.0,0.75,0.35), smoothstep(0.45,0.75,k));
          return mix(c, vec3(1.0,0.97,0.92), smoothstep(0.7,1.0,k));
        }
        float hh3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
        float hn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(hh3(i),hh3(i+vec3(1,0,0)),f.x),mix(hh3(i+vec3(0,1,0)),hh3(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(hh3(i+vec3(0,0,1)),hh3(i+vec3(1,0,1)),f.x),mix(hh3(i+vec3(0,1,1)),hh3(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        {
          float alb = max(dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722)), 0.02);
          float sunlit = clamp(dot(reflectedLight.directDiffuse, vec3(0.2126,0.7152,0.0722)) / alb * 3.14159 / max(uSunI, 1e-3), 0.0, 1.0);
          float sc = uScorch * uOrganic * smoothstep(0.12, 0.6, sunlit);
          float ch = clamp(sc * 1.3, 0.0, 1.0);
          #ifdef BLADE
            totalEmissiveRadiance += blackbody(0.5 + 0.25 * vBladeH) * sc * smoothstep(0.45, 1.0, vBladeT) * (1.2 + 2.4 * vBladeH);
          #endif
          reflectedLight.directDiffuse *= 1.0 - 0.8 * ch;                 // charring
          reflectedLight.indirectDiffuse *= 1.0 - 0.72 * ch;
          // tiny glowing specks (grass, leaves). Anti-flicker: once a speck gets smaller than ~1.5 px it is replaced by
          // its average glow (fwidth of the noise coordinate = cells per pixel), so nothing sparkles from frame to frame
          float cpp = length(fwidth(vHeatW * 24.0));
          float en = hn3(vHeatW * 24.0) * 0.65 + hn3(vHeatW * 61.0) * 0.35;
          float sharp = smoothstep(0.78, 0.9, en);
          float ember = mix(sharp, 0.09, smoothstep(0.25, 0.7, cpp)) * sc * step(0.95, uOrganic);
          totalEmissiveRadiance += blackbody(0.55 + 0.15 * en) * ember * 4.0;
          float hk = clamp(uHeat * uHeatK, 0.0, 1.0);
          float hv = 0.8 + 0.4 * hn3(vHeatW * 0.35);
          float fres = pow(1.0 - abs(dot(normal, geometryViewDir)), 2.0);
          totalEmissiveRadiance += blackbody(hk * hv * 0.8) * hk * hk * 1.8 * (0.3 + 0.9 * fres);
        }`);
  };
  mat.customProgramCacheKey = () => `heat${organic}_${heat}${heatU ? 'U' : ''}`;
  return mat;
}

// ---------------------------------------------------------------------------------------------------------------
// textures
// ---------------------------------------------------------------------------------------------------------------
function heightToNormal(H, N, strength) {
  const out = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const hx = H[y * N + ((x + 1) % N)] - H[y * N + ((x - 1 + N) % N)], hy = H[((y + 1) % N) * N + x] - H[((y - 1 + N) % N) * N + x];
    const nx = -hx * strength, ny = hy * strength, nz = 1, l = Math.hypot(nx, ny, nz);
    const k = (y * N + x) * 4; out[k] = (nx / l * 0.5 + 0.5) * 255; out[k + 1] = (ny / l * 0.5 + 0.5) * 255; out[k + 2] = (nz / l * 0.5 + 0.5) * 255; out[k + 3] = 255;
  }
  return out;
}
function dataTex(N, data, { srgb = true, repeat = true } = {}) {
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}
// lawn: late August, mown stripes, dry yellow patches; tile = 8 m
let _grass = null;
export function grassMaps() {
  if (_grass) return _grass;
  const N = 1024, col = new Uint8ClampedArray(N * N * 4), H = new Float32Array(N * N), r = rng(77);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    const dry = clamp((fbmT(u, v, 3, 4) - 0.47) * 3.2, 0, 1) * 0.75 + clamp((fbmT(u + 0.3, v, 9, 3) - 0.55) * 4, 0, 1) * 0.25;
    const fine = fbmT(u, v, 64, 3), blade = r();
    const lum = 0.78 + (fine - 0.5) * 0.5 + (blade - 0.5) * 0.32;
    const g0 = [78, 104, 46], g1 = [150, 138, 78];   // green, straw
    const k = (y * N + x) * 4;
    for (let c = 0; c < 3; c++) col[k + c] = (g0[c] + (g1[c] - g0[c]) * dry) * lum;
    col[k + 3] = 255;
    H[y * N + x] = blade * 0.6 + fine * 0.8;
  }
  // blade strokes (mostly upright, seen from above: short dashes)
  const c2 = document.createElement('canvas'); c2.width = c2.height = N; const g = c2.getContext('2d');
  const img = new ImageData(col, N, N); g.putImageData(img, 0, 0);
  for (let i = 0; i < 26000; i++) {
    const x = r() * N, y = r() * N, l = 3 + r() * 7, a = r() * Math.PI * 2, tone = r();
    g.strokeStyle = tone < 0.5 ? `rgba(${60 + r() * 40},${90 + r() * 40},${30 + r() * 20},0.55)` : `rgba(${150 + r() * 50},${150 + r() * 40},${90 + r() * 30},0.35)`;
    g.lineWidth = 0.8 + r() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const map = new THREE.CanvasTexture(c2); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  const nor = dataTex(N, heightToNormal(H, N, 2.2), { srgb: false });
  _grass = { map, nor };
  return _grass;
}
// stabilised sand paths ("stabilisé"), tile = 4 m
let _gravel = null;
export function gravelMaps() {
  if (_gravel) return _gravel;
  const N = 512, col = new Uint8ClampedArray(N * N * 4), H = new Float32Array(N * N), r = rng(12);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, n = fbmT(u, v, 8, 4), gr = r();
    const lum = 0.86 + (n - 0.5) * 0.3 + (gr - 0.5) * 0.22;
    const k = (y * N + x) * 4; col[k] = 206 * lum; col[k + 1] = 186 * lum; col[k + 2] = 150 * lum; col[k + 3] = 255;
    H[y * N + x] = gr * 0.7 + n;
  }
  _gravel = { map: dataTex(N, col), nor: dataTex(N, heightToNormal(H, N, 1.6), { srgb: false }) };
  return _gravel;
}
// chestnut leaf cluster (alpha), 512²
function leafTex(seed) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    for (let i = 0; i < 110; i++) {
      const x = 40 + r() * 432, y = 40 + r() * 432, s = 22 + r() * 30, a = r() * Math.PI * 2;
      const yel = r() < 0.12 ? 1 : 0, l = 0.55 + r() * 0.5;
      const cr = yel ? 150 * l + 40 : 52 * l + 12, cg = yel ? 140 * l + 30 : 96 * l + 20, cb = yel ? 50 * l : 30 * l + 6;
      g.save(); g.translate(x, y); g.rotate(a);
      for (let f = 0; f < 5; f++) {                    // palmate: 5 leaflets
        const fa = (f - 2) * 0.42, fl = s * (f === 2 ? 1 : f === 1 || f === 3 ? 0.85 : 0.62);
        g.save(); g.rotate(fa);
        const grd = g.createLinearGradient(0, 0, fl, 0);
        grd.addColorStop(0, `rgb(${cr * 0.8},${cg * 0.8},${cb * 0.8})`); grd.addColorStop(1, `rgb(${cr},${cg},${cb})`);
        g.fillStyle = grd; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(fl * 0.5, -fl * 0.22, fl, 0); g.quadraticCurveTo(fl * 0.5, fl * 0.22, 0, 0); g.fill();
        g.restore();
      }
      g.restore();
    }
  });
}
function barkTex() {
  return canvasTex(256, 512, (g, w, h) => {
    const r = rng(5); g.fillStyle = '#4b4036'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${30 + r() * 60},${26 + r() * 50},${20 + r() * 40},${0.25 + r() * 0.4})`; g.fillRect(r() * w, r() * h, 2 + r() * 6, 10 + r() * 50); }
  }, { repeat: true });
}

// ---------------------------------------------------------------------------------------------------------------
// trees: trimmed horse chestnuts lining the Champ de Mars (instanced, 3 variants)
// ---------------------------------------------------------------------------------------------------------------
function treeVariant(seed, leafMat, barkMat) {
  const r = rng(seed);
  const crownY = 6.4 + r() * 0.8, RX = 3.6 + r() * 0.6, RY = 3.1 + r() * 0.5, RZ = 3.4 + r() * 0.6;
  // trunk + 5 limbs
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.17, 0.27, crownY - 1.0, 9, 1, true); trunk.translate(0, (crownY - 1.0) / 2, 0); parts.push(trunk);
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, len = 2.2 + r() * 1.2;
    const limb = new THREE.CylinderGeometry(0.06, 0.12, len, 6, 1, true); limb.translate(0, len / 2, 0);
    limb.rotateZ(0.55 + r() * 0.35); limb.rotateY(a); limb.translate(0, crownY - 1.6 - r() * 0.6, 0); parts.push(limb);
  }
  const wood = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  // leaf cards in a rounded box (trimmed look), radial normals for soft volumetric shading, AO in vertex colours
  const cards = [], n = 360;
  const card = new THREE.PlaneGeometry(1.25, 1.25);
  const pos = [], nor = [], uv = [], col = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), c0 = new THREE.Vector3(0, crownY, 0);
  for (let i = 0; i < n; i++) {
    // sample inside a superellipsoid, biased to the shell
    let p; for (;;) {
      p = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
      const s = Math.pow(Math.abs(p.x), 3) + Math.pow(Math.abs(p.y), 3) + Math.pow(Math.abs(p.z), 3);
      if (s <= 1 && s > 0.25) break;
    }
    p.set(p.x * RX, p.y * RY, p.z * RZ).add(c0);
    e.set(r() * Math.PI, r() * Math.PI, r() * Math.PI); q.setFromEuler(e);
    const sc = 0.8 + r() * 0.5;
    const radial = p.clone().sub(c0).normalize();
    const shell = clamp(p.clone().sub(c0).divide(new THREE.Vector3(RX, RY, RZ)).length(), 0, 1);
    const ao = 0.45 + 0.55 * shell * (0.65 + 0.35 * clamp((p.y - crownY + RY) / (2 * RY), 0, 1));
    const ap = card.attributes.position, au = card.attributes.uv, idx = card.index.array;
    for (const k of idx) {
      v.fromBufferAttribute(ap, k).multiplyScalar(sc).applyQuaternion(q).add(p);
      pos.push(v.x, v.y, v.z);
      const nn = radial.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, 0, 1).applyQuaternion(q).multiplyScalar(0.2)).normalize();
      nor.push(nn.x, nn.y, nn.z);
      const tile = i % 4, tu = (tile % 2) * 0.5, tv = Math.floor(tile / 2) * 0.5;   // 4 sub-clusters per texture
      uv.push(tu + au.getX(k) * 0.5, tv + au.getY(k) * 0.5);
      col.push(ao, ao, ao);
    }
  }
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  leaves.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  leaves.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  leaves.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return { wood, leaves, height: crownY + RY };
}
export function makeTrees(list, { seed = 3 } = {}) {
  const r = rng(seed);
  const leafMat = heatize(new THREE.MeshStandardMaterial({ map: leafTex(31), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: 0.78, metalness: 0 }), { organic: 1 });
  const barkMat = heatize(new THREE.MeshStandardMaterial({ map: barkTex(), roughness: 0.95 }), { organic: 0.6 });
  const group = new THREE.Group();
  const variants = [0, 1, 2].map((k) => treeVariant(seed * 10 + k, leafMat, barkMat));
  const byVar = [[], [], []];
  list.forEach((t) => byVar[Math.floor(r() * 3)].push(t));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const mats = [[], [], []];   // same random draws, in the same order, as before chunking
  variants.forEach((V, k) => {
    byVar[k].forEach((t) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2); const sc = (t.s || 1) * (0.9 + r() * 0.2);
      s.set(sc, sc * (0.92 + r() * 0.16), sc); p.set(t.x, 0, t.z); m.compose(p, q, s); mats[k].push({ t, m: m.clone() });
    });
  });
  // spatial chunks: off-screen trees are culled in the camera pass and outside the shadow frustum (one InstancedMesh
  // for every tree was drawn whole every frame, twice: the bullet-time frames spent most of their time on leaves)
  const CELL = 40, cells = new Map();
  mats.forEach((arr, k) => arr.forEach((e) => { const key = `${Math.floor(e.t.x / CELL)},${Math.floor(e.t.z / CELL)},${k}`; if (!cells.has(key)) cells.set(key, { k, list: [] }); cells.get(key).list.push(e.m); }));
  for (const { k, list } of cells.values()) {
    const V = variants[k];
    const wood = new THREE.InstancedMesh(V.wood, barkMat, list.length), leaves = new THREE.InstancedMesh(V.leaves, leafMat, list.length);
    list.forEach((mm, i) => { wood.setMatrixAt(i, mm); leaves.setMatrixAt(i, mm); });
    for (const im of [wood, leaves]) { im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); group.add(im); }
  }
  return { group, leafMat, barkMat };
}

// ---------------------------------------------------------------------------------------------------------------
// grass blades around a point (close-ups): instanced tapered blades, density falling off toward the edge
// ---------------------------------------------------------------------------------------------------------------
export function makeGrassField(cx, cz, radius, count, { seed = 8, exclude = [] } = {}) {
  const r = rng(seed);
  const seg = 3, pos = [], nor = [], uv = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, w = 0.0032 * (1 - t * 0.85);
    pos.push(-w, t, 0, w, t, 0); nor.push(0, 1, 0.25, 0, 1, 0.25); uv.push(0, t, 1, t);
  }
  const idx = []; for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const mat = heatize(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82, side: THREE.DoubleSide }), { organic: 1 });
  mat.onBeforeCompile = ((prev) => (sh, rr) => {
    prev(sh, rr);
    sh.uniforms.uWind = FX.uWind;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { float t = position.y; vec4 ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
          float ph = ip.x * 0.7 + ip.z * 0.45;
          transformed.z += (0.18 * t * t) + 0.05 * t * t * sin(uWind * 1.7 + ph);
          transformed.x += 0.03 * t * t * sin(uWind * 1.3 + ph * 1.3);
          vBladeT = t; vBladeH = fract(sin(dot(ip.xz, vec2(12.9898, 78.233))) * 43758.5453); }`)
      .replace('uniform float uWind;', 'uniform float uWind;\nvarying float vBladeT, vBladeH;');
  })(mat.onBeforeCompile);
  mat.defines = { BLADE: 1 };
  mat.customProgramCacheKey = () => 'grassblade';
  const mesh = new THREE.InstancedMesh(g, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 4; tries++) {
    const a = r() * Math.PI * 2, d = radius * Math.sqrt(r());
    if (r() > Math.pow(1 - d / radius, 0.6)) continue;            // thinner toward the edge
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (exclude.some((e) => Math.abs(x - e[0]) < e[2] && Math.abs(z - e[1]) < e[3])) continue;
    q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5));
    const h = 0.045 + r() * 0.07; sc.set(1 + r() * 0.6, h, 1); p.set(x, 0.07, z);
    m.compose(p, q, sc); mesh.setMatrixAt(n, m);
    const dry = r();
    c.setRGB(dry < 0.7 ? 0.2 + r() * 0.08 : 0.42 + r() * 0.1, dry < 0.7 ? 0.32 + r() * 0.1 : 0.4 + r() * 0.08, dry < 0.7 ? 0.08 + r() * 0.04 : 0.17 + r() * 0.05);
    mesh.setColorAt(n, c); n++;
  }
  mesh.count = n; mesh.receiveShadow = true; mesh.castShadow = false; mesh.frustumCulled = false;
  return { mesh, mat };
}

// ---------------------------------------------------------------------------------------------------------------
// Eiffel Tower: lattice of beams (Beams), bronze-brown paint darker at the base, platforms, top
// ---------------------------------------------------------------------------------------------------------------
export function makeTower() {
  const Wf = (h) => 57 * Math.exp(-h / 90) + 5.5;
  const Lf = (h) => 26 - 5.5 * Math.min(h, 115.7) / 115.7;
  const B = new Beams();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const add = (a, b, t) => B.add(a, b, t);
  const levels = []; for (let h = 0; h <= 115.7 + 0.01; h += 115.7 / 34) levels.push(h);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const corners = (h) => { const w = Wf(h), l = Lf(h), i = w - l; return [V(sx * w, h, sz * w), V(sx * i, h, sz * w), V(sx * i, h, sz * i), V(sx * w, h, sz * i)]; };
    for (let k = 0; k < levels.length - 1; k++) {
      const A = corners(levels[k]), C = corners(levels[k + 1]);
      for (let c = 0; c < 4; c++) add(A[c], C[c], 1.35);
      for (let c = 0; c < 4; c++) { const n = (c + 1) % 4; add(A[c], C[n], 0.42); add(A[n], C[c], 0.42); }
      // finer lattice inside each leg face: mid-points crossing
      for (let c = 0; c < 4; c++) {
        const n = (c + 1) % 4; const mA = A[c].clone().lerp(A[n], 0.5), mC = C[c].clone().lerp(C[n], 0.5);
        add(mA, mC, 0.28);
      }
      if (k % 2 === 0) for (let c = 0; c < 4; c++) add(C[c], C[(c + 1) % 4], 0.55);
    }
  }
  const shaft = []; for (let h = 115.7; h <= 276 + 0.01; h += (276 - 115.7) / 40) shaft.push(h);
  const sq = (h, w) => [V(w, h, w), V(-w, h, w), V(-w, h, -w), V(w, h, -w)];
  for (let k = 0; k < shaft.length - 1; k++) {
    const A = sq(shaft[k], Wf(shaft[k])), C = sq(shaft[k + 1], Wf(shaft[k + 1]));
    for (let c = 0; c < 4; c++) add(A[c], C[c], 1.05);
    for (let c = 0; c < 4; c++) { const n = (c + 1) % 4; add(A[c], C[n], 0.34); add(A[n], C[c], 0.34); }
    if (k % 2 === 0) for (let c = 0; c < 4; c++) add(C[c], C[(c + 1) % 4], 0.42);
    const ia = Wf(shaft[k]) * 0.45, ib = Wf(shaft[k + 1]) * 0.45;
    for (const [px, pz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
      add(V(px * ia, shaft[k], pz * Wf(shaft[k])), V(px * ib, shaft[k + 1], pz * Wf(shaft[k + 1])), 0.5);
      add(V(px * Wf(shaft[k]), shaft[k], pz * ia), V(px * Wf(shaft[k + 1]), shaft[k + 1], pz * ib), 0.5);
    }
  }
  // the big decorative arches between the legs
  for (let f = 0; f < 4; f++) {
    const rotY = f * Math.PI / 2, pts = [], span = Wf(0) - Lf(0);
    for (let i = 0; i <= 28; i++) {
      const a = Math.PI * i / 28, x = -Math.cos(a) * span * 0.98, hh = 8 + Math.sin(a) * 31;
      pts.push(V(x, hh, Wf(hh) - 0.6).applyAxisAngle(V(0, 1, 0), rotY));
    }
    for (let i = 0; i < pts.length - 1; i++) { add(pts[i], pts[i + 1], 1.0); add(pts[i].clone().setY(pts[i].y + 1.6), pts[i + 1].clone().setY(pts[i + 1].y + 1.6), 0.5); }
  }
  // paint: "brun Tour Eiffel", darker at the base (vertex colour per instance)
  const mat = heatize(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0.12 }), { heat: 0.95, heatU: FX.uTowerK });
  meltize(mat);
  const lattice = B.build(mat);
  const cA = new THREE.Color('#6b5240'), cB = new THREE.Color('#a08263'), tmp = new THREE.Color();
  B.list.forEach(([a, b], i) => { const h = (a.y + b.y) / 2; tmp.copy(cA).lerp(cB, clamp(h / 300, 0, 1)); lattice.setColorAt(i, tmp); });
  lattice.instanceColor.needsUpdate = true;
  const root = new THREE.Group(); root.add(lattice);
  const solid = (geo, y, c = '#86694d') => {
    const mm = heatize(new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.12 }), { heat: 0.95, heatU: FX.uTowerK }); meltize(mm);
    const o = new THREE.Mesh(geo, mm); o.position.y = y; o.castShadow = o.receiveShadow = true; root.add(o); return o;
  };
  // 1st floor: ring deck + frieze, 2nd floor deck, top platform, cabin, antennas
  const w1 = Wf(57.6) + 2;
  for (let f = 0; f < 4; f++) {
    const deck = new THREE.BoxGeometry(w1 * 2 + 1, 4.2, 10); deck.translate(0, 0, w1 - 5); deck.rotateY(f * Math.PI / 2); solid(deck, 57.6);
    const frieze = new THREE.BoxGeometry(w1 * 2 + 1.4, 2.2, 0.6); frieze.translate(0, 0, w1 + 0.1); frieze.rotateY(f * Math.PI / 2); solid(frieze, 61.2, '#7a6248');
  }
  solid(new THREE.BoxGeometry(Wf(115.7) * 2 + 4, 3.4, Wf(115.7) * 2 + 4), 115.7);
  solid(new THREE.BoxGeometry(Wf(276) * 2 + 3, 3, Wf(276) * 2 + 3), 276);
  solid(new THREE.BoxGeometry(9, 9, 9), 282.5);
  solid(new THREE.CylinderGeometry(2.0, 3.4, 16, 10), 295);
  solid(new THREE.CylinderGeometry(0.45, 0.8, 26, 8), 316, '#bdb6aa');
  // concrete piers
  const footMat = heatize(new THREE.MeshStandardMaterial({ color: '#b9ae9b', roughness: 0.9 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(28, 2, 28), footMat); f.position.set(sx * (Wf(0) - 12.5), 1, sz * (Wf(0) - 12.5)); f.receiveShadow = f.castShadow = true; root.add(f);
  }
  return { root, mat, Wf, beams: B.list, lattice };
}
// vaporising tower: everything above a front (uVapor, metres) is gone; the metal just below it glows white-hot.
// The front's edge is low-frequency world-space noise, so it is stable from frame to frame (no sparkle).
function meltize(mat) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.uniforms.uVapor = FX.uVapor;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        { vec4 wp4 = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wp4 = instanceMatrix * wp4;
          #endif
          vWP = (modelMatrix * wp4).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform float uVapor; varying vec3 vWP;
        float hsh(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
        float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(hsh(i),hsh(i+vec3(1,0,0)),f.x),mix(hsh(i+vec3(0,1,0)),hsh(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(hsh(i+vec3(0,0,1)),hsh(i+vec3(1,0,1)),f.x),mix(hsh(i+vec3(0,1,1)),hsh(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float vFront = uVapor + (vn(vWP * 0.07) * 0.65 + vn(vWP * 0.23) * 0.35 - 0.5) * 10.0;
        if (vWP.y > vFront) discard;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float bnd = 1.0 - smoothstep(0.0, 9.0, vFront - vWP.y); totalEmissiveRadiance += vec3(1.0, 0.86, 0.68) * 7.0 * bnd * bnd; }`);
  };
  mat.customProgramCacheKey = () => 'vapor' + (mat.userData.heat ? JSON.stringify(mat.userData.heat) : '');
}

// ---------------------------------------------------------------------------------------------------------------
// Haussmann buildings: stone façade (4 bays x 7 floors per 15 m x 24 m module) with normal + roughness, zinc mansard
// ---------------------------------------------------------------------------------------------------------------
let _facade = null;
function facadeMaps() {
  if (_facade) return _facade;
  const W = 512, Hh = 820, r = rng(41);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d');
  const hv = document.createElement('canvas'); hv.width = W; hv.height = Hh; const h = hv.getContext('2d');   // height
  const rv = document.createElement('canvas'); rv.width = W; rv.height = Hh; const rr = rv.getContext('2d'); // roughness
  g.fillStyle = '#e7dcc6'; g.fillRect(0, 0, W, Hh); h.fillStyle = '#808080'; h.fillRect(0, 0, W, Hh); rr.fillStyle = '#d8d8d8'; rr.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${140 + r() * 60},${125 + r() * 55},${100 + r() * 40},${r() * 0.07})`; g.fillRect(r() * W, r() * Hh, 2 + r() * 10, 1 + r() * 4); }
  // floors from the top: 7 floors, ground floor taller (bottom of texture)
  const fl = [100, 108, 112, 116, 120, 128, 136];   // pixel heights top->bottom (attic hidden by roof .. ground floor)
  let y = 0; const bw = W / 4;
  fl.forEach((fh, f) => {
    // stone courses
    for (let yy = y + 26; yy < y + fh; yy += 26) { g.fillStyle = 'rgba(110,95,70,0.18)'; g.fillRect(0, yy, W, 1.5); h.fillStyle = '#787878'; h.fillRect(0, yy, W, 1.5); }
    // cornice at the top of each floor
    g.fillStyle = 'rgba(255,250,240,0.35)'; g.fillRect(0, y, W, 6); g.fillStyle = 'rgba(70,58,40,0.35)'; g.fillRect(0, y + 6, W, 3);
    h.fillStyle = '#b0b0b0'; h.fillRect(0, y, W, 6);
    for (let b = 0; b < 4; b++) {
      const x0 = b * bw;
      if (f === fl.length - 1) {          // ground floor: rusticated stone + arched shop windows/doors
        for (let yy = y + 14; yy < y + fh; yy += 18) { g.fillStyle = 'rgba(80,66,48,0.35)'; g.fillRect(0, yy, W, 2.5); h.fillStyle = '#606060'; h.fillRect(0, yy, W, 2.5); }
        const wx = x0 + bw * 0.18, ww = bw * 0.64, wy = y + 22, wh = fh - 22;
        g.fillStyle = '#20252b'; g.fillRect(wx, wy, ww, wh); g.beginPath(); g.ellipse(wx + ww / 2, wy, ww / 2, 16, 0, Math.PI, 0); g.fill();
        const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, 'rgba(150,170,190,0.35)'); gr.addColorStop(1, 'rgba(40,46,54,0.2)');
        g.fillStyle = gr; g.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
        h.fillStyle = '#303030'; h.fillRect(wx, wy - 14, ww, wh + 14); rr.fillStyle = '#303030'; rr.fillRect(wx, wy, ww, wh);
        continue;
      }
      // French window with frame + glass reflection
      const wx = x0 + bw * 0.31, ww = bw * 0.38, wy = y + fh * 0.18, wh = fh * 0.66;
      g.fillStyle = '#d9cdb6'; g.fillRect(wx - 5, wy - 5, ww + 10, wh + 8);            // surround
      g.fillStyle = '#2a3038'; g.fillRect(wx, wy, ww, wh);
      const gr = g.createLinearGradient(wx, wy, wx + ww, wy + wh); gr.addColorStop(0, 'rgba(170,195,220,0.55)'); gr.addColorStop(0.5, 'rgba(70,85,100,0.25)'); gr.addColorStop(1, 'rgba(120,140,160,0.4)');
      g.fillStyle = gr; g.fillRect(wx + 3, wy + 3, ww - 6, wh - 6);
      g.fillStyle = '#eee8dc'; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); g.fillRect(wx, wy + wh * 0.36, ww, 2.5);  // mullion/transom
      h.fillStyle = '#9a9a9a'; h.fillRect(wx - 5, wy - 5, ww + 10, wh + 8); h.fillStyle = '#2a2a2a'; h.fillRect(wx, wy, ww, wh);
      rr.fillStyle = '#262626'; rr.fillRect(wx + 3, wy + 3, ww - 6, wh - 6);
      // pediment over the noble floor
      if (f === 4) { g.fillStyle = 'rgba(255,250,240,0.45)'; g.fillRect(wx - 9, wy - 14, ww + 18, 6); h.fillStyle = '#c4c4c4'; h.fillRect(wx - 9, wy - 14, ww + 18, 6); }
      // balconies: continuous on floors 1 (5th) and 4 (2nd), balconettes elsewhere
      const by = wy + wh - 22;
      if (f === 1 || f === 4) {
        g.fillStyle = 'rgba(40,36,30,0.35)'; g.fillRect(x0, by + 22, bw, 5);
        g.strokeStyle = '#15171a'; g.lineWidth = 2; g.strokeRect(x0 + 1, by, bw - 2, 22);
        for (let k = 0; k <= 12; k++) { g.beginPath(); g.moveTo(x0 + k * bw / 12, by); g.lineTo(x0 + k * bw / 12, by + 22); g.stroke(); }
        h.fillStyle = '#c8c8c8'; h.fillRect(x0, by + 20, bw, 6);
      } else {
        g.strokeStyle = '#15171a'; g.lineWidth = 2; g.strokeRect(wx - 3, by, ww + 6, 20);
        for (let k = 0; k <= 6; k++) { g.beginPath(); g.moveTo(wx - 3 + k * (ww + 6) / 6, by); g.lineTo(wx - 3 + k * (ww + 6) / 6, by + 20); g.stroke(); }
      }
    }
    y += fh;
  });
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  const hd = h.getImageData(0, 0, W, Hh).data, H = new Float32Array(W * Hh);
  for (let i = 0; i < W * Hh; i++) H[i] = hd[i * 4] / 255;
  const nd = new Uint8ClampedArray(W * Hh * 4);
  for (let yy = 0; yy < Hh; yy++) for (let x = 0; x < W; x++) {
    const hx = H[yy * W + Math.min(W - 1, x + 1)] - H[yy * W + Math.max(0, x - 1)], hy = H[Math.min(Hh - 1, yy + 1) * W + x] - H[Math.max(0, yy - 1) * W + x];
    const nx = -hx * 4, ny = hy * 4, l = Math.hypot(nx, ny, 1), k = (yy * W + x) * 4;
    nd[k] = (nx / l * 0.5 + 0.5) * 255; nd[k + 1] = (ny / l * 0.5 + 0.5) * 255; nd[k + 2] = (1 / l * 0.5 + 0.5) * 255; nd[k + 3] = 255;
  }
  const nor = new THREE.DataTexture(nd, W, Hh, THREE.RGBAFormat); nor.wrapS = nor.wrapT = THREE.RepeatWrapping; nor.generateMipmaps = true; nor.minFilter = THREE.LinearMipmapLinearFilter; nor.magFilter = THREE.LinearFilter; nor.flipY = true; nor.needsUpdate = true;
  const rough = new THREE.CanvasTexture(rv); rough.colorSpace = THREE.NoColorSpace; rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  _facade = { map, nor, rough };
  return _facade;
}
const zincMat = () => heatize(new THREE.MeshStandardMaterial({ color: '#6c7783', roughness: 0.45, metalness: 0.55 }));
export function makeBlock(width, depth, height, r) {
  // façade faces +z (local); 15 m per 4-bay module, 24 m to the roof line
  const F = facadeMaps();
  const reps = Math.max(1, Math.round(width / 15));
  const mk = (t) => { const c = t.clone(); c.repeat.set(reps, 1); c.needsUpdate = true; return c; };
  const tint = new THREE.Color().setHSL(0.11, 0.25 + r() * 0.1, 0.86 + r() * 0.06);
  const front = heatize(new THREE.MeshStandardMaterial({ map: mk(F.map), normalMap: mk(F.nor), roughnessMap: mk(F.rough), color: tint, roughness: 1, metalness: 0 }), { heat: 0.75 });
  const side = heatize(new THREE.MeshStandardMaterial({ color: new THREE.Color('#d6c8ad').multiply(tint), roughness: 0.95 }), { heat: 0.75 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [side, side, side, side, front, front]);
  body.position.y = height / 2; body.castShadow = body.receiveShadow = true;
  const grp = new THREE.Group(); grp.add(body);
  // mansard: steep lower slope + flat top, dormers and chimneys
  const zm = zincMat();
  const sh = new THREE.Shape(); const d2 = depth / 2;
  sh.moveTo(-d2, 0); sh.lineTo(d2, 0); sh.lineTo(d2 - 1.6, 4.6); sh.lineTo(d2 - 3.4, 6.0); sh.lineTo(-d2 + 3.4, 6.0); sh.lineTo(-d2 + 1.6, 4.6); sh.closePath();
  const rg = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: false }); rg.translate(0, 0, -width / 2); rg.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(rg, zm); roof.position.y = height; roof.castShadow = roof.receiveShadow = true; grp.add(roof);
  const nd = reps * 4, dg = [];
  for (let i = 0; i < nd; i++) {
    const x = -width / 2 + (i + 0.5) * width / nd;
    const box = new THREE.BoxGeometry(1.3, 1.9, 1.4); box.translate(x, height + 1.9, d2 - 1.1); dg.push(box);
    const cap = new THREE.ConeGeometry(1.0, 0.8, 4); cap.rotateY(Math.PI / 4); cap.translate(x, height + 3.25, d2 - 1.1); dg.push(cap);
  }
  if (dg.length) { const dm = new THREE.Mesh(mergeGeometries(dg.map((x) => x.toNonIndexed())), zm); dm.castShadow = true; grp.add(dm); }
  const chim = [];
  for (let i = 0; i < Math.max(1, reps); i++) {
    const x = -width / 2 + (i + 0.5) * width / reps, c = new THREE.BoxGeometry(1.0, 2.0, 3.4); c.translate(x, height + 7.0, (r() - 0.5) * 2); chim.push(c);
    for (let k = 0; k < 4; k++) { const p = new THREE.CylinderGeometry(0.14, 0.16, 0.6, 6); p.translate(x, height + 8.3, -1.2 + k * 0.8); chim.push(p); }
  }
  const cm = new THREE.Mesh(mergeGeometries(chim.map((x) => x.toNonIndexed())), heatize(new THREE.MeshStandardMaterial({ color: '#b5714e', roughness: 0.9 })));
  cm.castShadow = true; grp.add(cm);
  return grp;
}

// ---------------------------------------------------------------------------------------------------------------
// day sky: elevation gradient (hazy horizon -> deep blue), darker and bluer away from the sun, mie glow, sun disk
// ---------------------------------------------------------------------------------------------------------------
const _blank = (() => { const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); t.needsUpdate = true; return t; })();
export function makeDaySky(sunDir, { zen = '#2f62b8', hor = '#c8d7e6', mid = null, sunCol = '#fff2dc' } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uSun: { value: sunDir.clone() }, uZen: { value: new THREE.Color(zen) }, uHor: { value: new THREE.Color(hor) }, uMid: { value: new THREE.Color(mid || hor) }, uMidK: { value: mid ? 1 : 0 },
      uSunCol: { value: new THREE.Color(sunCol) }, uI: { value: 1.0 }, uDisk: { value: 1.0 }, uWhite: { value: 0 }, uStars: { value: 0 }, uWhiteCol: { value: new THREE.Vector3(6.0, 5.7, 5.3) },
      tMilky: { value: _blank }, uMilky: { value: 0 }, tCMB: { value: _blank }, uCMB: { value: 0 }, uCMBR: { value: 0 }, uCMBI: { value: 1.6 },
      uPlasma: { value: 0 }, uDim: { value: 1 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uSun, uZen, uHor, uMid, uSunCol, uWhiteCol; uniform float uI, uDisk, uWhite, uStars, uMilky, uCMB, uCMBR, uCMBI, uPlasma, uDim, uMidK;
      uniform sampler2D tMilky, tCMB; varying vec3 vDir;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vDir); float el = max(d.y, 0.0);
        float cs = dot(d, uSun);
        vec3 col = mix(uHor, uZen, pow(clamp(el, 0.0, 1.0), 0.42));
        if (uMidK > 0.5) col = mix(mix(uHor, uMid, smoothstep(0.0, 0.22, el)), uZen, smoothstep(0.12, 0.85, pow(el, 0.8)));
        col *= mix(1.0, 0.82, smoothstep(0.2, -0.6, cs));                 // deeper away from the sun
        col += uSunCol * (pow(max(cs, 0.0), 8.0) * 0.35 + pow(max(cs, 0.0), 64.0) * 0.9);
        col = mix(col, uHor * 0.85, smoothstep(0.02, -0.08, d.y));          // below the horizon
        col *= uI * uDim;
        col += uSunCol * smoothstep(0.99996, 0.99999, cs) * 60.0 * uDisk;  // disk
        vec2 euv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5);
        if (uMilky > 0.001) col += texture2D(tMilky, euv).rgb * uMilky * smoothstep(-0.04, 0.1, d.y);
        vec4 cm = vec4(0.0);
        if (uCMB > 0.001 || uWhite > 0.001) cm = texture2D(tCMB, euv);
        if (uCMB > 0.001) {                                                 // false-colour microwave sky, revealed from the zenith down
          float fr = 1.0 - el, rev = smoothstep(uCMBR, uCMBR - 0.08, fr);
          float edge = exp(-pow((fr - uCMBR) / 0.012, 2.0)) * step(0.001, uCMBR) * (1.0 - smoothstep(1.0, 1.1, uCMBR));
          col = mix(col, cm.rgb * uCMBI, rev * uCMB) + vec3(1.0, 0.9, 0.7) * edge * 1.1 * uCMB;
        }
        // the air glowing (CMB energy absorbed): billowing incandescent plasma (alpha channel of the CMB map = fbm)
        vec3 glow = uWhiteCol * (0.8 + 0.35 * pow(1.0 - el, 3.0)) * mix(1.0, 0.55 + 0.9 * cm.a, uPlasma);
        glow *= mix(1.0, 0.35 + 1.5 * dot(cm.rgb, vec3(0.5, 0.35, 0.15)), clamp(uCMB, 0.0, 1.0) * 0.85);   // the microwave pattern burns into the glow
        col = mix(col, glow, uWhite);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// the whole set
// ---------------------------------------------------------------------------------------------------------------
export function makeParis(renderer, { sunAz = 230, sunEl = 40, sky: skyOpt = {}, fog = '#c3d0dc', sunCol = '#fff1dc' } = {}) {
  const scene = new THREE.Scene();
  const r = rng(2026);
  // sun: azimuth measured from north; -z = north-west (315°)
  const azr = THREE.MathUtils.degToRad(sunAz - 315), elr = THREE.MathUtils.degToRad(sunEl);
  const sunDir = new THREE.Vector3(Math.sin(azr) * Math.cos(elr), Math.sin(elr), -Math.cos(azr) * Math.cos(elr)).normalize();
  const sky = makeDaySky(sunDir, skyOpt); scene.add(sky);
  // environment from the sky for PBR reflections
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(makeDaySky(sunDir, skyOpt));
  const env = pm.fromScene(envScene, 0, 1, 20000).texture;
  scene.environment = env; scene.environmentIntensity = 0.5;
  scene.fog = new THREE.FogExp2(fog, 0.00042);
  // white-hot air dome (climax), drawn over the sky
  const glowMat = new THREE.MeshBasicMaterial({ color: '#fff4e6', transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, fog: false });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), glowMat); glow.renderOrder = -5; scene.add(glow);

  const hemi = new THREE.HemisphereLight('#cfe0ff', '#7d6a4c', 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(sunCol, FX.uSunI.value);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.04; sun.shadow.radius = 2;
  scene.add(sun, sun.target);
  const setShadow = (x, y, z, half, depth = 1600) => {
    sun.target.position.set(x, y, z); sun.position.copy(sun.target.position).addScaledVector(sunDir, depth / 2);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: depth });
    sun.shadow.camera.updateProjectionMatrix(); sun.target.updateMatrixWorld();
  };
  setShadow(0, 0, 0, 120);

  // ground: paths everywhere, lawns on top
  const Gm = gravelMaps(), Lm = grassMaps();
  const tile = (t, s) => { const c = t.clone(); c.repeat.set(s, s); c.needsUpdate = true; return c; };
  const groundMat = heatize(new THREE.MeshStandardMaterial({ map: tile(Gm.map, 700), normalMap: tile(Gm.nor, 700), roughness: 0.96 }), { organic: 0.15, heat: 0.55 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2800, 2800), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const lawnMat = heatize(new THREE.MeshStandardMaterial({ map: Lm.map, normalMap: Lm.nor, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.95 }), { organic: 1, heat: 0.6 });
  const lawns = [];
  const addLawn = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0, geo = new THREE.BoxGeometry(w, 0.08, d);
    const uv = geo.attributes.uv; const pa = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pa.getX(i) + (x0 + x1) / 2) / 8, (pa.getZ(i) + (z0 + z1) / 2) / 8);   // world-space 8 m tiles
    const m = new THREE.Mesh(geo, lawnMat); m.position.set((x0 + x1) / 2, 0.04, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); lawns.push(m);
  };
  const zSegs = [[-110, -18], [-6, 82], [94, 182], [194, 282], [294, 382], [394, 482], [494, 600]];
  for (const [z0, z1] of zSegs) { addLawn(-56, -6, z0, z1); addLawn(6, 56, z0, z1); addLawn(-92, -68, z0, z1); addLawn(68, 92, z0, z1); }
  addLawn(-150, 150, -430, -300);
  // the Seine (behind the tower) with a sky reflection
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 110), heatize(new THREE.MeshStandardMaterial({ color: '#3d5560', roughness: 0.12, metalness: 0.0 })));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.03, -485); scene.add(water);
  // avenues
  const roadMat = heatize(new THREE.MeshStandardMaterial({ color: '#4a4c51', roughness: 0.9 }));
  for (const s of [-1, 1]) { const road = new THREE.Mesh(new THREE.PlaneGeometry(22, 1700), roadMat); road.rotation.x = -Math.PI / 2; road.position.set(s * 109, 0.02, 120); road.receiveShadow = true; scene.add(road); }
  const roadX = new THREE.Mesh(new THREE.PlaneGeometry(1800, 26), roadMat); roadX.rotation.x = -Math.PI / 2; roadX.position.set(0, 0.02, -290); roadX.receiveShadow = true; scene.add(roadX);

  // trees: double rows between the central and side lawns, and along the avenues
  const treeList = [];
  for (let z = -100; z < 600; z += 7) for (const x of [-61, -97, -103, 61, 97, 103]) if (!(z > -22 && z < -2)) treeList.push({ x: x + (r() - 0.5) * 0.6, z: z + (r() - 0.5) * 0.6, s: 1.3 + r() * 0.16 });
  for (let i = 0; i < 46; i++) treeList.push({ x: (r() - 0.5) * 280, z: -320 - r() * 90, s: 1.1 + r() * 0.3 });
  const trees = makeTrees(treeList); scene.add(trees.group);

  // Haussmann rows along both avenues + a second row behind
  for (const s of [-1, 1]) {
    let z = -175;
    while (z < 640) {
      const w = [15, 15, 22, 30][Math.floor(r() * 4)], d = 18 + r() * 5, hgt = 22 + r() * 3;
      const b = makeBlock(w, d, hgt, r); b.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      b.position.set(s * (122 + d / 2), 0, z + w / 2); scene.add(b);
      z += w + (r() < 0.1 ? 14 : 0.2);
    }
  }
  // distant city: instanced blocks with the same façade, zinc tops (fog does the rest)
  const F = facadeMaps();
  const farMat = heatize(new THREE.MeshStandardMaterial({ map: F.map, color: '#cfc3ad', roughness: 0.92 }));
  const farRoof = zincMat();
  const box = new THREE.BoxGeometry(1, 1, 1), farList = [];
  for (let i = 0; i < 700; i++) {
    let x, z; const k = r();
    if (k < 0.5) { x = (r() < 0.5 ? -1 : 1) * (175 + r() * 600); z = -560 + r() * 1300; }
    else if (k < 0.85) { x = (r() - 0.5) * 1700; z = -560 - r() * 800; }
    else { x = (r() - 0.5) * 1500; z = 650 + r() * 600; }
    if (z > -560 && Math.abs(x) < 470 && z < 650) continue;
    farList.push([x, z, 16 + r() * 28, 17 + r() * 12, 14 + r() * 22]);
  }
  const fI = new THREE.InstancedMesh(box, farMat, farList.length), fR = new THREE.InstancedMesh(box, farRoof, farList.length), mm = new THREE.Matrix4();
  farList.forEach(([x, z, w, h, d], i) => {
    mm.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)); fI.setMatrixAt(i, mm);
    mm.compose(new THREE.Vector3(x, h + 2.2, z), new THREE.Quaternion(), new THREE.Vector3(w * 0.86, 4.4, d * 0.86)); fR.setMatrixAt(i, mm);
  });
  fI.castShadow = fR.castShadow = true; fI.receiveShadow = true; scene.add(fI, fR);
  // La Défense on the far north-west horizon (~6 km): a hazy cluster of glass towers
  const glass = heatize(new THREE.MeshStandardMaterial({ color: '#8fa3b5', roughness: 0.25, metalness: 0.6 }));
  for (let i = 0; i < 22; i++) {
    const h = 90 + r() * 140, w = 30 + r() * 30, t = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * (0.6 + r() * 0.5)), glass);
    t.position.set(-900 + (r() - 0.5) * 900, h / 2, -5200 - r() * 700); t.rotation.y = r(); scene.add(t);
  }
  // the tower
  const tower = makeTower(); tower.root.position.set(0, 0, -200); scene.add(tower.root);

  return { scene, sky, skyU: sky.material.uniforms, sun, hemi, sunDir, setShadow, env, glow, glowMat, tower, trees, treeList, farList, lawnMat, lawns, groundMat };
}
