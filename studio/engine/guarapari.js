// Guarapari (Espirito Santo, Brazil), Praia da Areia Preta at dusk (ep11): a shallow bay of golden sand streaked with
// black monazite sand, rounded granite boulders, a forested granite headland to the south, white apartment towers
// behind the seafront avenue (palms, street lamps just lit), the Atlantic to the east.
// Layout (metres): +x = east (out to sea), +z = south along the beach, y up; mean sea level y = 0. The shoreline runs
// along x = shoreX(z), the dry beach rises to the promenade wall 42 m inland, the towers stand behind the avenue.
// BX uniforms drive the episode's effects in the materials made here:
//   uCher:  Cherenkov flash: the sea (and anything watery) glows electric blue, brightest in deep water
//   uSand:  the black sand glows as its thorium dumps its energy (dark red -> orange -> white)
//   uRock:  the granite heats to incandescence;  uSteam: the sea surface whitens with steam;  uTime
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, clamp } from './core.js';
import { canvasTex } from './assets.js';
import { fbmT } from './ocean.js';
import { heatize, makeTrees } from './paris.js';

export const BX = { uCher: { value: 0 }, uSand: { value: 0 }, uRock: { value: 0 }, uSteam: { value: 0 }, uTime: { value: 0 }, uBlackK: { value: 1 } };

// ---------------------------------------------------------------------------------------------------------------
// the ground (same function in JS and GLSL: the sea shader reads its own depth from it)
// ---------------------------------------------------------------------------------------------------------------
export const shoreX = (z) => -16 * (1 - Math.min(1, (z / 270) ** 2));                 // the middle of the bay recedes 16 m
const headland = (x, z) => { const dx = (x - 70) / 130, dz = (z - 360) / 150; return 75 * Math.exp(-(dx * dx + dz * dz) * 2.2); };
export function groundY(x, z) {
  const d = x - shoreX(z);
  const y = Math.max(d < 0 ? Math.min(2.3, -d * 0.055) : -d * 0.035, -14);
  return y + headland(x, z);
}
export const PROM_Y = 2.5;                                                              // promenade level
export const promX = (z) => shoreX(z) - 42;                                             // beach side of the promenade
const GROUND_GLSL = `
  float shoreX(float z){ float k = clamp(z / 270.0, -1.0, 1.0); return -16.0 * (1.0 - k * k); }
  float headland(vec2 p){ vec2 d = (p - vec2(70.0, 360.0)) / vec2(130.0, 150.0); return 75.0 * exp(-dot(d, d) * 2.2); }
  float groundY(vec2 p){ float d = p.x - shoreX(p.y); float y = max(d < 0.0 ? min(2.3, -d * 0.055) : -d * 0.035, -14.0); return y + headland(p); }`;
const NOISE_GLSL = `
  float bh21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float bnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(bh21(i), bh21(i + vec2(1.0, 0.0)), f.x), mix(bh21(i + vec2(0.0, 1.0)), bh21(i + vec2(1.0, 1.0)), f.x), f.y); }
  float bfbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * bnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }`;
const BLACKBODY_GLSL = `
  vec3 bbody(float k){ vec3 c = mix(vec3(0.0), vec3(0.55, 0.03, 0.0), smoothstep(0.0, 0.25, k));
    c = mix(c, vec3(1.0, 0.32, 0.04), smoothstep(0.2, 0.5, k)); c = mix(c, vec3(1.0, 0.75, 0.35), smoothstep(0.45, 0.75, k));
    return mix(c, vec3(1.0, 0.97, 0.92), smoothstep(0.7, 1.0, k)); }`;

// ---------------------------------------------------------------------------------------------------------------
// dusk sky: the sun low behind the town (west); over the sea the Belt of Venus (a pink band) above Earth's blue shadow
// ---------------------------------------------------------------------------------------------------------------
const SKY_GLSL = `
  uniform vec3 uSun, uZen, uHor, uBelt, uShade, uSunCol, uFlashCol; uniform float uSkyI, uFlash;
  vec3 duskSky(vec3 d){
    float el = d.y, cs = dot(d, uSun), anti = clamp(-dot(normalize(d.xz + 1e-5), normalize(uSun.xz)), 0.0, 1.0);
    vec3 c = mix(uHor, uZen, pow(smoothstep(-0.02, 0.75, el), 0.55));
    c = mix(c, uBelt, exp(-pow((el - 0.11) / 0.075, 2.0)) * anti * 0.75);             // Belt of Venus
    c = mix(c, uShade, exp(-pow((el - 0.015) / 0.04, 2.0)) * anti * 0.6);             // Earth's shadow
    c += uSunCol * (pow(max(cs, 0.0), 5.0) * 0.55 + pow(max(cs, 0.0), 48.0) * 1.6) * (1.0 - smoothstep(0.1, 0.5, el) * 0.5);
    c = mix(c, uHor * 0.7, smoothstep(0.0, -0.1, el));
    return c * uSkyI + uFlashCol * uFlash * (0.6 + 0.4 * smoothstep(0.3, -0.05, el));
  }`;
export function makeDuskSky(sunDir, o = {}) {
  const uniforms = {
    uSun: { value: sunDir.clone() }, uZen: { value: new THREE.Color(o.zen || '#2c4a86') }, uHor: { value: new THREE.Color(o.hor || '#e9b88f') },
    uBelt: { value: new THREE.Color(o.belt || '#e3a2a8') }, uShade: { value: new THREE.Color(o.shade || '#5b6b98') }, uSunCol: { value: new THREE.Color(o.sunCol || '#ffb46a') },
    uFlashCol: { value: new THREE.Color('#3a8cff') }, uSkyI: { value: 1 }, uFlash: { value: 0 }, uDisk: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `${SKY_GLSL}
      uniform float uDisk; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); vec3 c = duskSky(d);
        c += uSunCol * smoothstep(0.99990, 0.99996, dot(d, uSun)) * 30.0 * uDisk;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// the sea: Gerstner swell from the east-southeast, foam where it runs out of depth, sky reflection, Cherenkov glow
// ---------------------------------------------------------------------------------------------------------------
const WAVES = [   // [direction (deg, 0 = travelling toward -x), wavelength m, amplitude m, steepness]
  [8, 38, 0.32, 0.55], [-14, 23, 0.2, 0.6], [25, 14, 0.1, 0.5], [-32, 9, 0.06, 0.45], [4, 5.5, 0.035, 0.4], [47, 3.4, 0.02, 0.35],
];
const WAVE_GLSL = `
  uniform float uTime;
  const int NW = ${WAVES.length};
  uniform vec4 uW[NW];   // dir.x, dir.z, k, amplitude ; steepness in uQ
  uniform float uQ[NW];
  vec3 gerstner(vec2 p, float att, out vec3 n){
    vec3 o = vec3(0.0); vec3 dx = vec3(1.0, 0.0, 0.0), dz = vec3(0.0, 0.0, 1.0);
    for (int i = 0; i < NW; i++){
      vec2 D = uW[i].xy; float k = uW[i].z, A = uW[i].w * att, Q = uQ[i], w = sqrt(9.81 * k);
      float ph = k * dot(D, p) - w * uTime + float(i) * 1.7, c = cos(ph), s = sin(ph);
      o.x += Q * A * D.x * c; o.z += Q * A * D.y * c; o.y += A * s;
      dx += vec3(-Q * A * D.x * D.x * k * s, A * D.x * k * c, -Q * A * D.x * D.y * k * s);
      dz += vec3(-Q * A * D.x * D.y * k * s, A * D.y * k * c, -Q * A * D.y * D.y * k * s);
    }
    n = normalize(cross(dz, dx)); return o;
  }`;
export function makeOcean(sky) {
  const uW = WAVES.map(([deg, L, A]) => { const a = THREE.MathUtils.degToRad(deg); return new THREE.Vector4(-Math.cos(a), Math.sin(a), (2 * Math.PI) / L, A); });
  const uniforms = {
    ...sky.material.uniforms, uTime: BX.uTime, uCher: BX.uCher, uSteam: BX.uSteam, uW: { value: uW }, uQ: { value: WAVES.map((w) => w[3]) },
    uDeep: { value: new THREE.Color('#0d2a3a') }, uShallow: { value: new THREE.Color('#2f7d86') }, uSandC: { value: new THREE.Color('#8f7a58') },
    uFogCol: { value: new THREE.Color('#b8a8a8') }, uFogD: { value: 0.0012 }, uSunI: { value: 2.2 }, uCherCol: { value: new THREE.Color('#2f8fff') },
  };
  // a grid dense near the beach (where the swell runs up the sand) and coarse out to the horizon
  const xs = [], zs = [];
  for (let x = -60; x < 40; x += 0.6) xs.push(x); for (let x = 40, s = 0.6; x < 9000; s *= 1.035, x += s) xs.push(x);
  for (let z = -9000, s = 400; z < -150; z += s, s = Math.max(1.0, s / 1.04)) zs.push(z); for (let z = -150; z < 150; z += 1.0) zs.push(z);
  for (let z = 150, s = 1.0; z < 9000; s *= 1.04, z += s) zs.push(z);
  const pos = new Float32Array(xs.length * zs.length * 3), idx = [];
  zs.forEach((z, j) => xs.forEach((x, i) => { const k = (j * xs.length + i) * 3; pos[k] = x; pos[k + 1] = 0; pos[k + 2] = z; }));
  for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
    const a = j * xs.length + i, b = a + 1, c = a + xs.length, d = c + 1; idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: true,
    vertexShader: `${GROUND_GLSL}${WAVE_GLSL}
      varying vec3 vW; varying vec3 vN; varying float vDepth; varying float vCrest;
      void main(){
        vec2 p = position.xz; float depth = -groundY(p);
        float att = clamp(depth / 2.2, 0.12, 1.0);                       // the swell flattens as it runs up the beach
        vec3 n; vec3 o = gerstner(p, att, n);
        vec3 w = vec3(p.x + o.x, o.y, p.y + o.z);
        vW = w; vN = n; vDepth = depth; vCrest = o.y / (0.55 * att + 0.05);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: `${GROUND_GLSL}${NOISE_GLSL}${SKY_GLSL}
      uniform float uTime, uCher, uSteam, uFogD, uSunI; uniform vec3 uDeep, uShallow, uSandC, uFogCol, uCherCol;
      varying vec3 vW; varying vec3 vN; varying float vDepth; varying float vCrest;
      void main(){
        vec2 p = vW.xz; float dist = length(vW - cameraPosition);
        // small ripples: gradient of two drifting noise layers, faded with distance (no shimmer far away)
        float e = 0.35, fd = clamp(1.0 - dist / 260.0, 0.0, 1.0);
        vec2 q = p * 0.9 + vec2(uTime * 0.25, uTime * 0.11), q2 = p * 2.3 - vec2(uTime * 0.18, -uTime * 0.31);
        float h0 = bnoise(q) + 0.5 * bnoise(q2);
        vec2 gr = vec2(bnoise(q + vec2(e, 0.0)) + 0.5 * bnoise(q2 + vec2(e, 0.0)) - h0, bnoise(q + vec2(0.0, e)) + 0.5 * bnoise(q2 + vec2(0.0, e)) - h0) / e;
        vec3 N = normalize(vN + vec3(-gr.x, 0.0, -gr.y) * 0.18 * fd);
        vec3 V = normalize(cameraPosition - vW);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 refl = duskSky(R);
        // water body: turquoise over the sand, deep blue-green further out
        float thick = vW.y - groundY(p);                                   // water depth under this point of the surface
        vec3 body = mix(mix(uSandC, uShallow, smoothstep(0.05, 1.2, thick)), uDeep, smoothstep(1.0, 9.0, thick)) * 0.32 * uSkyI;
        vec3 col = mix(body, refl, fres);
        float sp = pow(max(dot(R, uSun), 0.0), 380.0); col += uSunCol * sp * uSunI * 6.0 * fd;
        // foam: the wash on the sand, and the crests where the swell breaks in shallow water
        float fz = bfbm(p * vec2(0.55, 0.22) + vec2(uTime * 0.12, 0.0));
        float wash = smoothstep(0.1, 0.0, thick) * smoothstep(0.45, 0.75, fz + 0.2) + smoothstep(0.03, 0.0, thick) * 0.5;
        float brk = smoothstep(0.55, 0.95, vCrest) * smoothstep(3.5, 0.6, vDepth) * smoothstep(0.35, 0.7, fz);
        col = mix(col, vec3(0.8, 0.78, 0.76) * uSkyI, clamp(wash + brk, 0.0, 1.0) * 0.7);
        // Cherenkov: every beta electron from potassium-40 outruns light in water; the glow comes from the whole depth
        float vol = 1.0 - exp(-max(thick, 0.0) * 0.7);
        float var = 0.75 + 0.5 * bfbm(p * 0.03 + 3.1);
        col += uCherCol * uCher * vol * var * (0.7 + 0.3 * fres) * 6.0;
        col = mix(col, vec3(0.92, 0.9, 0.88) * uSkyI * 1.4, uSteam * (0.55 + 0.35 * bfbm(p * 0.02 - uTime * 0.05)));
        float fog = 1.0 - exp(-uFogD * uFogD * dist * dist);
        col = mix(col, uFogCol, fog);
        gl_FragColor = vec4(col, smoothstep(0.0, 0.06, thick));
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = -1;
  return { mesh: m, U: uniforms };
}

// ---------------------------------------------------------------------------------------------------------------
// sand: golden quartz streaked with black monazite/ilmenite (bands along the shore where the swash sorts heavy grains),
// wet and darker near the water, granite and soil up the headland; the black sand glows when BX.uSand rises
// ---------------------------------------------------------------------------------------------------------------
function sandGrainMaps() {
  const N = 512, r = rng(71);
  const map = canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N), d = img.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const n = fbmT(x / N, y / N, 32, 3), f = r();
      const v = 0.82 + 0.22 * (n - 0.5) + 0.16 * (f - 0.5); const k = (y * N + x) * 4;
      d[k] = 255 * v; d[k + 1] = 255 * v * 0.97; d[k + 2] = 255 * v * 0.92; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
  return map;
}
export function makeSandMaterial() {
  const mat = new THREE.MeshStandardMaterial({ map: sandGrainMaps(), roughness: 0.93, metalness: 0 });
  mat.map.repeat.set(1, 1);
  heatize(mat, { organic: 0, heat: 0.5 });
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.uniforms.uSandGlow = BX.uSand; sh.uniforms.uRockGlow = BX.uRock; sh.uniforms.uBTime = BX.uTime; sh.uniforms.uBlackK = BX.uBlackK;
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vMapUv = (modelMatrix * vec4(position, 1.0)).xz * 0.45;');   // world-space grain, 2.2 m tiles
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uSandGlow, uRockGlow, uBTime, uBlackK; ${GROUND_GLSL}${NOISE_GLSL}${BLACKBODY_GLSL}
        float blackSand(vec3 w){ float d = w.x - shoreX(w.z);
          float bands = bfbm(vec2(w.x * 0.11, w.z * 0.018)), patches = bfbm(w.xz * 0.05 + 4.0);
          float zone = smoothstep(-36.0, -14.0, d) * smoothstep(1.5, -1.0, d);          // the swash zone sorts heavy grains
          return clamp(smoothstep(0.53, 0.64, bands) * zone + smoothstep(0.62, 0.72, patches) * 0.8, 0.0, 1.0); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float bsk = blackSand(vHeatW) * uBlackK, dsh = vHeatW.x - shoreX(vHeatW.z);
        float wet = smoothstep(-7.0, -0.8, dsh);
        float rockK = smoothstep(2.6, 7.0, vHeatW.y - max(vHeatW.x - shoreX(vHeatW.z) < 0.0 ? 0.0 : 0.0, 0.0));
        vec3 gold = vec3(0.93, 0.78, 0.55), black = vec3(0.07, 0.065, 0.06), granite = vec3(0.36, 0.33, 0.31), moss = vec3(0.16, 0.2, 0.1);
        vec3 base = mix(gold, black, bsk) * mix(1.0, 0.7, wet);
        base = mix(base, mix(granite, moss, smoothstep(0.45, 0.62, bfbm(vHeatW.xz * 0.04))), rockK);
        diffuseColor.rgb *= base;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.32, wet * (1.0 - rockK));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += bbody(clamp(uSandGlow * (0.25 + 0.85 * bsk), 0.0, 1.0)) * uSandGlow * (0.4 + 2.6 * bsk) * (1.0 - rockK);
        totalEmissiveRadiance += bbody(clamp(uRockGlow, 0.0, 1.0)) * uRockGlow * 2.2 * rockK;`);
  };
  const ck = mat.customProgramCacheKey; mat.customProgramCacheKey = () => ck() + '_sand';
  return mat;
}
export function makeTerrain(mat) {
  const xs = [], zs = [];
  for (let x = -66; x < -50; x += 2) xs.push(x); for (let x = -50; x < 40; x += 1) xs.push(x); for (let x = 40; x <= 280; x += 4) xs.push(x);
  for (let z = -460; z < -70; z += 4) zs.push(z); for (let z = -70; z < 70; z += 1) zs.push(z); for (let z = 70; z <= 620; z += 4) zs.push(z);
  const r = rng(12);
  const pos = new Float32Array(xs.length * zs.length * 3), idx = [];
  zs.forEach((z, j) => xs.forEach((x, i) => {
    const k = (j * xs.length + i) * 3, h = headland(x, z);
    const rough = h > 2 ? (fbmT((x + 300) / 600, (z + 300) / 600, 8, 4) - 0.5) * Math.min(h, 30) * 0.5 : 0;   // rocky hillside
    pos[k] = x; pos[k + 1] = groundY(x, z) + rough; pos[k + 2] = z;
  }));
  for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
    const a = j * xs.length + i, b = a + 1, c = a + xs.length, d = c + 1; idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(xs.length * zs.length * 2), 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true;
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// granite boulders (rounded by the sea), speckled grey-pink; they glow white-hot with BX.uRock
// ---------------------------------------------------------------------------------------------------------------
function graniteTex() {
  const N = 512, r = rng(33);
  return canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N), d = img.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const n = fbmT(x / N, y / N, 6, 4), k = (y * N + x) * 4, f = r();
      let c = [0.52, 0.48, 0.46].map((v) => v * (0.78 + 0.45 * n));
      if (f < 0.12) c = [0.12, 0.11, 0.11]; else if (f < 0.2) c = [0.66, 0.5, 0.46]; else if (f < 0.26) c = [0.8, 0.78, 0.75];
      d[k] = c[0] * 255; d[k + 1] = c[1] * 255; d[k + 2] = c[2] * 255; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
}
export function makeBoulders(list, seed = 5) {
  const r = rng(seed);
  const mat = heatize(new THREE.MeshStandardMaterial({ map: graniteTex(), roughness: 0.82, metalness: 0 }), { organic: 0, heat: 1 });
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, rr) => {
    prev(sh, rr); sh.uniforms.uRockGlow = BX.uRock;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uRockGlow; ${BLACKBODY_GLSL}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += bbody(clamp(uRockGlow, 0.0, 1.0)) * uRockGlow * 2.4;`);
  };
  const ck = mat.customProgramCacheKey; mat.customProgramCacheKey = () => ck() + '_granite';
  const variants = [0, 1, 2, 3].map((k) => {
    const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const n = fbmT(v.x * 0.3 + k, v.y * 0.3 + k * 2, 2, 3) - 0.5;
      v.multiplyScalar(1 + n * 0.55); v.y *= v.y < 0 ? 0.55 : 0.8; p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); return g;
  });
  const group = new THREE.Group(), byV = [[], [], [], []];
  list.forEach((b) => byV[Math.floor(r() * 4)].push(b));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  byV.forEach((arr, k) => {
    if (!arr.length) return;
    const im = new THREE.InstancedMesh(variants[k], mat, arr.length);
    arr.forEach((b, i) => {
      q.setFromEuler(new THREE.Euler(r() * 0.3, r() * 6.28, r() * 0.3)); s.set(b.s * (0.8 + r() * 0.5), b.s * (0.6 + r() * 0.4), b.s * (0.8 + r() * 0.5));
      p.set(b.x, groundY(b.x, b.z) + b.s * 0.15, b.z); m4.compose(p, q, s); im.setMatrixAt(i, m4);
    });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); group.add(im);
  });
  return { group, mat };
}

// ---------------------------------------------------------------------------------------------------------------
// apartment towers behind the avenue: white concrete, balconies, windows lit at dusk (procedural, filtered: windows
// smaller than a pixel average out instead of sparkling)
// ---------------------------------------------------------------------------------------------------------------
export function makeTowers(seed = 9) {
  const r = rng(seed), list = [];
  for (const row of [0, 1]) for (let z = -330; z < 215; ) {
    const w = 16 + r() * 12, d = 13 + r() * 8, h = (row ? 40 : 28) + r() * (row ? 34 : 30);
    const x = promX(z) - 32 - row * 48 - d / 2 - r() * 6;
    list.push({ x, z: z + w / 2, w, d, h, tint: r() }); z += w + 5 + r() * 9;
  }
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTW; varying vec3 vTN; varying float vTint;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vTW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);
        vTint = fract(sin(instanceMatrix[3][0] * 12.9 + instanceMatrix[3][2] * 78.2) * 437.5);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vTW; varying vec3 vTN; varying float vTint;
        float th21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.55); }
        // box-filtered pulse train: 1 inside [a, b] of each unit cell, averaged over the pixel footprint
        float pulse(float x, float a, float b, float fw){ float w = max(fw, 1e-4);
          float F0 = floor(x - 0.5 * w) * (b - a) + clamp(fract(x - 0.5 * w), a, b) - a, F1 = floor(x + 0.5 * w) * (b - a) + clamp(fract(x + 0.5 * w), a, b) - a;
          return (F1 - F0) / w; }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float vert = 1.0 - abs(vTN.y);
        vec2 fc = vec2(abs(vTN.x) > 0.5 ? vTW.z : vTW.x, vTW.y) / vec2(3.2, 3.0);   // one window per 3.2 m x 3 m
        vec2 fw = fwidth(fc);
        float win = pulse(fc.x, 0.18, 0.82, fw.x) * pulse(fc.y, 0.28, 0.78, fw.y) * vert * step(1.0, fc.y);
        float slab = pulse(fc.y, 0.0, 0.12, fw.y) * vert;
        vec3 wall = mix(vec3(0.6, 0.6, 0.6), vec3(0.64, 0.6, 0.53), vTint) * (0.92 + 0.16 * th21(floor(fc.yy * 0.25) + vTint));
        diffuseColor.rgb *= mix(mix(wall, vec3(0.62, 0.62, 0.6), slab * 0.6), vec3(0.08, 0.1, 0.13), win * 0.85);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 cell = floor(fc) + floor(vTW.xz * 0.013) * 17.0;
        float lit = step(0.7, th21(cell)) * win * (0.6 + 0.4 * th21(cell + 3.1));
        float avg = 0.3 * 0.8 * 0.6 * 0.5 * vert * step(1.0, fc.y);                // the average once windows go sub-pixel
        float sub = smoothstep(0.35, 0.9, max(fw.x, fw.y));
        totalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * mix(lit, avg, sub) * 1.6;`);
  };
  mat.customProgramCacheKey = () => 'towers_v1';
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, list.length);
  const m4 = new THREE.Matrix4();
  list.forEach((t, i) => { m4.makeScale(t.d, t.h, t.w); m4.setPosition(t.x, PROM_Y + t.h / 2, t.z); im.setMatrixAt(i, m4); });
  im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true;
  return { mesh: im, list };
}

// ---------------------------------------------------------------------------------------------------------------
// promenade: low white wall, light stone pavement, the avenue, street lamps (lit), palms
// ---------------------------------------------------------------------------------------------------------------
function frondTex() {
  return canvasTex(256, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(70,96,40,1)'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
    const r = rng(8);
    for (let y = 8; y < h; y += 7) {
      const L = (w / 2 - 6) * Math.sin(Math.PI * (1 - y / h) * 0.95 + 0.1);
      for (const s of [-1, 1]) {
        g.strokeStyle = `rgba(${60 + r() * 30},${92 + r() * 40},${32 + r() * 18},1)`; g.lineWidth = 2.4 + r();
        g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * L * 0.5, y + 6, w / 2 + s * L, y + 18 + r() * 6); g.stroke();
      }
    }
  });
}
function palmVariant(seed, frondMat, barkMat) {
  const r = rng(seed), H = 8 + r() * 4, lean = (r() - 0.5) * 1.6;
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(lean * t * t, H * t, lean * 0.4 * t * t)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const trunk = new THREE.TubeGeometry(curve, 24, 0.2, 8, false);
  const tp = trunk.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < tp.count; i++) { v.fromBufferAttribute(tp, i); const t = clamp(v.y / H); const c = curve.getPoint(t); v.sub(c).multiplyScalar(1.35 - 0.6 * t).add(c); tp.setXYZ(i, v.x, v.y, v.z); }
  trunk.computeVertexNormals();
  const top = curve.getPoint(1), fronds = [];
  const n = 12 + Math.floor(r() * 4);
  for (let k = 0; k < n; k++) {
    const g = new THREE.PlaneGeometry(1.1, 3.6, 1, 10); g.translate(0, 1.8, 0);
    const p = g.attributes.position;
    const droop = 0.5 + r() * 0.7;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const t = y / 3.6; p.setXYZ(i, p.getX(i), y * Math.cos(t * droop * 1.6), -y * Math.sin(t * droop * 1.6) * 0.9 - Math.abs(p.getX(i)) * 0.25); }
    g.rotateX(-Math.PI / 2 + 0.45 + (r() - 0.5) * 0.4); g.rotateY((k / n) * Math.PI * 2 + r() * 0.3); g.translate(top.x, top.y, top.z);
    fronds.push(g);
  }
  const fr = mergeGeometries(fronds); fr.computeVertexNormals();
  return { trunk, fronds: fr };
}
export function makePromenade(seed = 4) {
  const group = new THREE.Group(), r = rng(seed);
  const zs = []; for (let z = -460; z <= 230; z += 10) zs.push(z);
  const strip = (x0, x1, y, mat) => {   // a strip following the bay's curve between x offsets x0..x1 from promX
    const pos = [], idx = [];
    zs.forEach((z, j) => { const b = promX(z); pos.push(b + x0, y, z, b + x1, y, z); if (j) { const a = (j - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; group.add(m); return m;
  };
  const stone = new THREE.MeshStandardMaterial({ color: '#cfc6b8', roughness: 0.85 });
  const asphalt = new THREE.MeshStandardMaterial({ color: '#3a3b3e', roughness: 0.9 });
  strip(0, -9, PROM_Y, stone); strip(-9, -22, PROM_Y - 0.05, asphalt); strip(-22, -30, PROM_Y, stone);
  // the low wall on the beach side
  const wallG = []; zs.forEach((z, j) => { if (!j) return; const z0 = zs[j - 1], x0 = promX(z0), x1 = promX(z); const L = Math.hypot(x1 - x0, z - z0);
    const b = new THREE.BoxGeometry(0.35, 0.75, L); b.rotateY(Math.atan2(x1 - x0, z - z0)); b.translate((x0 + x1) / 2, PROM_Y + 0.12, (z0 + z) / 2); wallG.push(b); });
  const wall = new THREE.Mesh(mergeGeometries(wallG), new THREE.MeshStandardMaterial({ color: '#e9e5dc', roughness: 0.8 })); wall.castShadow = true; wall.receiveShadow = true; group.add(wall);
  // street lamps, just lit
  const poleG = [], headG = [];
  for (let z = -440; z <= 220; z += 26) { const x = promX(z) - 1.2; const p = new THREE.CylinderGeometry(0.07, 0.1, 6, 8); p.translate(x, PROM_Y + 3, z); poleG.push(p);
    const h = new THREE.SphereGeometry(0.28, 12, 8); h.translate(x, PROM_Y + 6.1, z); headG.push(h); }
  group.add(new THREE.Mesh(mergeGeometries(poleG), new THREE.MeshStandardMaterial({ color: '#2b2d30', roughness: 0.6, metalness: 0.5 })));
  const lampMat = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffcf8a', emissiveIntensity: 6 });
  const lamps = new THREE.Mesh(mergeGeometries(headG), lampMat); group.add(lamps);
  // palms between the pavement and the avenue
  const frondMat = heatize(new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }), { organic: 1 });
  const barkMat = heatize(new THREE.MeshStandardMaterial({ color: '#7d6c58', roughness: 0.95 }), { organic: 0.5 });
  const vars = [0, 1, 2].map((k) => palmVariant(40 + k, frondMat, barkMat));
  const byV = [[], [], []];
  for (let z = -450; z <= 225; z += 13) byV[Math.floor(r() * 3)].push([promX(z) - 6.5 + (r() - 0.5), z + (r() - 0.5) * 3, r() * 6.28, 0.85 + r() * 0.3]);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  byV.forEach((arr, k) => {
    const t = new THREE.InstancedMesh(vars[k].trunk, barkMat, arr.length), f = new THREE.InstancedMesh(vars[k].fronds, frondMat, arr.length);
    arr.forEach(([x, z, ry, sc], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry); s.setScalar(sc); p.set(x, PROM_Y, z); m4.compose(p, q, s); t.setMatrixAt(i, m4); f.setMatrixAt(i, m4); });
    for (const im of [t, f]) { im.castShadow = true; im.computeBoundingSphere(); group.add(im); }
  });
  return { group, lampMat, frondMat };
}

// ---------------------------------------------------------------------------------------------------------------
// the whole set
// ---------------------------------------------------------------------------------------------------------------
export function makeBeach(renderer, o = {}) {
  const scene = new THREE.Scene();
  const sunDir = (o.sunDir || new THREE.Vector3(-0.9, 0.31, -0.3)).clone().normalize();   // low in the west (~17 deg), behind the town
  const sky = makeDuskSky(sunDir, o.sky || {}); scene.add(sky);
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(makeDuskSky(sunDir, o.sky || {}));
  const env = pm.fromScene(envScene, 0, 1, 20000).texture;
  scene.environment = env; scene.environmentIntensity = 0.55;
  scene.fog = new THREE.FogExp2(o.fog || '#b9a8a6', 0.0012);
  const hemi = new THREE.HemisphereLight('#b8c2ea', '#a3825f', 1.15); scene.add(hemi);
  const sun = new THREE.DirectionalLight(o.sunCol || '#ffb46e', 3.3);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const setShadow = (x, y, z, half, depth = 900) => {
    sun.target.position.set(x, y, z); sun.position.copy(sun.target.position).addScaledVector(sunDir, depth / 2);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: depth });
    sun.shadow.camera.updateProjectionMatrix(); sun.target.updateMatrixWorld();
  };
  setShadow(0, 0, 0, 40);
  const sand = makeSandMaterial();
  const terrain = makeTerrain(sand); scene.add(terrain);
  const ocean = makeOcean(sky); scene.add(ocean.mesh);
  const r = rng(77), rocks = [];
  for (let i = 0; i < 60; i++) { const z = 175 + r() * 110, x = shoreX(z) - 6 + r() * 26; rocks.push({ x, z, s: 1.2 + r() * 3.2 }); }   // where the headland meets the sea
  for (let i = 0; i < 14; i++) { const z = -240 - r() * 40, x = shoreX(z) - 4 + r() * 12; rocks.push({ x, z, s: 0.8 + r() * 2.2 }); }   // north end
  const boulders = makeBoulders(rocks.concat(o.rocks || [])); scene.add(boulders.group);
  const towers = makeTowers(); scene.add(towers.mesh);
  const prom = makePromenade(); scene.add(prom.group);
  const tl = []; const tr = rng(61);
  for (let i = 0; i < 900; i++) {   // Atlantic forest on the headland
    const x = -40 + tr() * 260, z = 230 + tr() * 330, h = headland(x, z);
    if (h < 9 || x - shoreX(z) > 120 + tr() * 30) continue;
    tl.push({ x, z, y: groundY(x, z) - 0.5, s: 0.9 + tr() * 0.7 });
  }
  const forest = makeTrees(tl, { seed: 21 }); scene.add(forest.group);
  return { scene, sky, skyU: sky.material.uniforms, sun, hemi, sunDir, setShadow, env, ocean, sand, terrain, boulders, towers, prom, forest, groundY, shoreX };
}
