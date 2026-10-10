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

export const BX = { uCher: { value: 0 }, uSand: { value: 0 }, uRock: { value: 0 }, uSteam: { value: 0 }, uTime: { value: 0 }, uBlackK: { value: 1 },
  uHero: { value: new THREE.Vector4(0, 0, 0, 0) }, uGround: { value: 0 }, uTown: { value: 0 },
  uHeroMap: { value: null }, uHeroRect: { value: new THREE.Vector4(0, 0, 1, 0) } };   // the JS-drawn streak mask round the hero (makeStreakMask)   // a guaranteed black-sand patch: centre x, z, radius, strength

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
  float bfbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * bnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
  // the same fbm with each octave faded to its mean once it gets smaller than ~2 pixels (fw: pixel footprint in p units)
  float bfbmAA(vec2 p, float fw){ float s = 0.0, a = 0.5, f = 1.0;
    for (int i = 0; i < 5; i++){ s += a * mix(0.5, bnoise(p), 1.0 - smoothstep(0.2, 0.5, fw * f)); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; f *= 2.03; } return s; }`;
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
    ...sky.material.uniforms, uTime: BX.uTime, uCher: BX.uCher, uSteam: BX.uSteam, uFire: BX.uGround, uW: { value: uW }, uQ: { value: WAVES.map((w) => w[3]) },
    uDeep: { value: new THREE.Color('#0d2a3a') }, uShallow: { value: new THREE.Color('#2f7d86') }, uSandC: { value: new THREE.Color('#8f7a58') },
    uFogCol: { value: new THREE.Color('#b8a8a8') }, uFogD: { value: 0.0012 }, uSunI: { value: 2.2 }, uCherCol: { value: new THREE.Color(0.05, 0.3, 1.0) },
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
      uniform float uTime, uCher, uSteam, uFogD, uSunI, uFire; uniform vec3 uDeep, uShallow, uSandC, uFogCol, uCherCol;
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
        // the burning coast in the waves: a band of fire just above the land horizon (the land lies toward -x)
        float landDir = smoothstep(-0.1, -0.6, R.x);
        refl += vec3(1.0, 0.45, 0.14) * uFire * landDir * (smoothstep(0.32, 0.02, R.y) * 3.2 + smoothstep(0.6, 0.1, R.y) * 0.6);
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
        // Cherenkov: every beta electron from potassium-40 outruns light in water; the glow comes from the whole depth,
        // brighter where the surface faces you (less of it reflected away) and in the churned foam of the breakers
        float vol = 1.0 - exp(-max(thick, 0.0) * 0.55);
        float var = 0.8 + 0.4 * bfbm(p * 0.03 + 3.1);
        float face = 0.75 + 0.25 * max(dot(N, V), 0.0);
        vec3 cher = uCherCol * uCher * (vol * var * face * (1.0 - fres * 0.3) * 2.6 + clamp(wash * 0.4 + brk, 0.0, 1.0) * 0.9 * smoothstep(0.02, 0.4, thick) + 0.18 * smoothstep(0.0, 0.3, thick));
        col = mix(col, col * 0.5, uCher);                                  // the glow outshines the dusk reflections
        col = mix(col, vec3(0.92, 0.9, 0.88) * uSkyI * 1.4, uSteam * (0.55 + 0.35 * bfbm(p * 0.02 - uTime * 0.05)));
        float fog = 1.0 - exp(-uFogD * uFogD * dist * dist);
        col = mix(col, uFogCol, fog) + cher * (1.0 - 0.55 * fog);
        gl_FragColor = vec4(col, smoothstep(0.0, 0.06, thick));
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = -1;
  return { mesh: m, U: uniforms };
}

// ---------------------------------------------------------------------------------------------------------------
// the black-sand streaks round the hero, drawn in JS so the episode knows exactly where they are (the glow and the
// plasma bursting out of them line up): a mask texture over a square of `size` metres centred on (cx, cz)
// ---------------------------------------------------------------------------------------------------------------
function hashJS(ix, iz, s) { let h = (ix * 374761393 + iz * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoiseJS(x, z, s) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hashJS(ix, iz, s), b = hashJS(ix + 1, iz, s), c = hashJS(ix, iz + 1, s), d = hashJS(ix + 1, iz + 1, s);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
function fbmJS(x, z, s) { let v = 0, a = 0.5; for (let i = 0; i < 5; i++) { v += a * vnoiseJS(x, z, s + i * 17); x = x * 2.03 + 1.7; z = z * 2.03 + 9.2; a *= 0.5; } return v; }
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function makeStreakMask(cx, cz, size = 44, res = 880) {
  const m = new Float32Array(res * res);
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const x = cx - size / 2 + ((i + 0.5) / res) * size, z = cz - size / 2 + ((j + 0.5) / res) * size, d = x - shoreX(z);
    const u = d + (fbmJS(x * 0.05, z * 0.05, 3) - 0.5) * 8 + (fbmJS(x * 0.23, z * 0.23, 5) - 0.5) * 1.1;
    const near = ss(9, 2.5, Math.hypot(x - cx, z - cz) + (fbmJS(x * 0.7, z * 0.7, 7) - 0.5) * 3);
    // ridged noise: thin bright lines where the noise crosses its middle (heavy grains laid in thin seams)
    const ridge = (f, zf, sd, lo, hi) => ss(lo, hi, 1 - Math.abs(2 * fbmJS(u * f, z * zf, sd) - 1));
    const v = ridge(0.9, 0.04, 11, 0.86, 0.94) + 0.9 * ridge(2.1, 0.09, 13, 0.88 - 0.04 * near, 0.95) + 0.7 * ridge(4.4, 0.18, 19, 0.9 - 0.06 * near, 0.96) * (0.4 + 0.6 * near)
      + 0.5 * ss(0.62, 0.7, fbmJS(u * 0.6, z * 0.03, 23)) * near;                                   // a few broad dark beds near you
    m[j * res + i] = Math.min(1, Math.max(v, 0.22 * near));
  }
  const data = new Uint8Array(res * res * 4);
  for (let k = 0; k < res * res; k++) { const v = Math.round(m[k] * 255); data[k * 4] = v; data[k * 4 + 1] = v; data[k * 4 + 2] = v; data[k * 4 + 3] = 255; }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat);   // row 0 = z0 (v = 0): the shader samples (z - z0) / size directly
  tex.colorSpace = THREE.NoColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
  const at = (x, z) => { const i = Math.floor(((x - cx + size / 2) / size) * res), j = Math.floor(((z - cz + size / 2) / size) * res); return i < 0 || j < 0 || i >= res || j >= res ? 0 : m[j * res + i]; };
  return { tex, at, rect: new THREE.Vector4(cx - size / 2, cz - size / 2, size, 1) };
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
    sh.uniforms.uSandGlow = BX.uSand; sh.uniforms.uRockGlow = BX.uRock; sh.uniforms.uBTime = BX.uTime; sh.uniforms.uBlackK = BX.uBlackK; sh.uniforms.uHero = BX.uHero; sh.uniforms.uGround = BX.uGround; sh.uniforms.uCherS = BX.uCher; sh.uniforms.uHeroMap = BX.uHeroMap; sh.uniforms.uHeroRect = BX.uHeroRect;
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vMapUv = (modelMatrix * vec4(position, 1.0)).xz * 0.45;');   // world-space grain, 2.2 m tiles
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uSandGlow, uRockGlow, uBTime, uBlackK, uGround, uCherS; uniform vec4 uHero, uHeroRect; uniform sampler2D uHeroMap; ${GROUND_GLSL}${NOISE_GLSL}${BLACKBODY_GLSL}
        float blackSand(vec3 w){ float d = w.x - shoreX(w.z);
          vec2 fwp = fwidth(w.xz); float fwm = max(fwp.x, fwp.y);                       // metres per pixel
          // heavy-mineral streaks laid down by the swash: long, thin, meandering, roughly parallel to the shore
          float u = d + (bfbmAA(w.xz * 0.05, fwm * 0.05) - 0.5) * 8.0 + (bfbmAA(w.xz * 0.23 + 3.0, fwm * 0.23) - 0.5) * 1.1;
          float hk = uHero.w * smoothstep(uHero.z, uHero.z * 0.3, length(w.xz - uHero.xy) + (bfbmAA(w.xz * 0.7 + 7.0, fwm * 0.7) - 0.5) * uHero.z * 0.7);
          float zone = max(smoothstep(-38.0, -12.0, d) * smoothstep(1.5, -1.0, d), hk);
          float s1 = bfbmAA(vec2(u * 1.3, w.z * 0.045), fwm * 1.3), a1 = fwm * 1.3 * 0.25;
          float s3 = bfbmAA(vec2(u * 3.6, w.z * 0.13) + 17.0, fwm * 3.6), a3 = fwm * 3.6 * 0.25;
          float streak = smoothstep(mix(0.6, 0.53, hk) - a1, mix(0.65, 0.58, hk) + a1, s1)
                       + 0.8 * smoothstep(mix(0.64, 0.58, hk) - a3, mix(0.67, 0.61, hk) + a3, s3);
          // fine feathered marks where the last waves ran up
          float s2 = bfbmAA(vec2(u * 2.4, w.z * 0.22) + 11.0, fwm * 2.4);
          float feather = smoothstep(0.6, 0.7, s2) * smoothstep(-13.0, -5.0, d) * smoothstep(0.8, -1.5, d);
          float patches = smoothstep(0.64, 0.74, bfbmAA(w.xz * 0.05 + 4.0, fwm * 0.05)) * 0.6;
          return clamp(max(streak * zone + feather * 0.85 + patches, 0.33 * hk), 0.0, 1.0); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float bsk0 = blackSand(vHeatW) * uBlackK, dsh = vHeatW.x - shoreX(vHeatW.z);
        if (uHeroRect.w > 0.0) {
          vec2 hu = (vHeatW.xz - uHeroRect.xy) / uHeroRect.z;
          float inR = smoothstep(0.0, 0.12, min(min(hu.x, hu.y), min(1.0 - hu.x, 1.0 - hu.y)));
          if (inR > 0.0) bsk0 = mix(bsk0, texture2D(uHeroMap, hu).r * uBlackK, inR);
        }
        float bsk = smoothstep(0.0, 1.0, clamp(bsk0 * 1.25 + (diffuseColor.r - 0.64) * 2.4 * (1.0 - abs(bsk0 * 2.0 - 1.0)), 0.0, 1.0));   // salt-and-pepper edges, grain by grain (mipmapped)
        float wet = smoothstep(-7.0, -0.8, dsh);
        float rockK = smoothstep(2.6, 7.0, vHeatW.y - max(vHeatW.x - shoreX(vHeatW.z) < 0.0 ? 0.0 : 0.0, 0.0));
        vec3 gold = vec3(0.93, 0.78, 0.55), black = vec3(0.085, 0.08, 0.075), granite = vec3(0.36, 0.33, 0.31), moss = vec3(0.16, 0.2, 0.1);
        vec3 base = mix(gold, black * (0.55 + 0.9 * clamp((diffuseColor.r - 0.48) * 2.6, 0.0, 1.0)) / max(diffuseColor.r, 0.2), bsk) * mix(1.0, 0.7, wet);   // black grains keep their own speckle
        base = mix(base, mix(granite, moss, smoothstep(0.45, 0.62, bfbm(vHeatW.xz * 0.04))), rockK);
        diffuseColor.rgb *= base;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.32, wet * (1.0 - rockK));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float core = smoothstep(0.45, 0.95, bsk0);                                                  // only the seams of black grains get hot
        float sg = uSandGlow * (0.06 + 0.94 * core);
        totalEmissiveRadiance += bbody(clamp(sg * 0.74, 0.0, 1.0)) * (uSandGlow * 0.05 + sg * sg * 1.5) * (1.0 - rockK);
        totalEmissiveRadiance += vec3(0.05, 0.3, 1.0) * uCherS * smoothstep(-6.0, -0.5, dsh) * 0.12 * (1.0 - rockK);   // the wet sand glows faintly with the swash
        totalEmissiveRadiance += bbody(clamp(uGround * (0.55 + 0.45 * bfbmAA(vHeatW.xz * 0.11, max(fwidth(vHeatW.x), fwidth(vHeatW.z)) * 0.11)), 0.0, 1.0)) * uGround * 1.4;
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
// apartment towers behind the avenue, like Guarapari's seafront: white, cream and grey blocks with continuous balcony
// bands facing the sea (solid parapets or glass railings), punched windows on the other sides, a few glass towers;
// machine rooms on the roofs; about a third of the windows lit at dusk. Patterns are box-filtered (windows smaller than
// a pixel average out instead of sparkling).
// ---------------------------------------------------------------------------------------------------------------
export function makeTowers(seed = 9) {
  const r = rng(seed), list = [];
  for (const row of [0, 1]) for (let z = -330; z < 215; ) {
    const w = 16 + r() * 12, d = 13 + r() * 8, fl = Math.round(((row ? 40 : 28) + r() * (row ? 34 : 30)) / 2.9), h = fl * 2.9 + 1.2;
    const x = promX(z) - 32 - row * 48 - d / 2 - r() * 6;
    const st = r(), style = st < 0.5 ? 0 : st < 0.72 ? 3 : st < 0.9 ? 1 : 2;
    list.push({ x, z: z + w / 2, w, d, h, fl, style, tint: r() }); z += w + 5 + r() * 9;
  }
  const group = new THREE.Group();
  const FACADE = `
    varying vec3 vTW; varying vec3 vTN; varying vec4 vSt;
    uniform float uTown;
    vec3 bbody2(float k){ vec3 c = mix(vec3(0.0), vec3(0.55, 0.03, 0.0), smoothstep(0.0, 0.25, k)); c = mix(c, vec3(1.0, 0.32, 0.04), smoothstep(0.2, 0.5, k));
      c = mix(c, vec3(1.0, 0.75, 0.35), smoothstep(0.45, 0.75, k)); return mix(c, vec3(1.0, 0.97, 0.92), smoothstep(0.7, 1.0, k)); }
    float bhT(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float bnoiseT(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(bhT(i), bhT(i + vec2(1.0, 0.0)), f.x), mix(bhT(i + vec2(0.0, 1.0)), bhT(i + vec2(1.0, 1.0)), f.x), f.y); }
    float th21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.55); }
    // box-filtered pulse train: 1 inside [a, b] of each unit cell, averaged over the pixel footprint
    float pulse(float x, float a, float b, float fw){ float w = max(fw, 1e-4);
      float F0 = floor(x - 0.5 * w) * (b - a) + clamp(fract(x - 0.5 * w), a, b) - a, F1 = floor(x + 0.5 * w) * (b - a) + clamp(fract(x + 0.5 * w), a, b) - a;
      return (F1 - F0) / w; }`;
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTown = BX.uTown;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aStyle; varying vec3 vTW; varying vec3 vTN; varying vec4 vSt;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vTW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal); vSt = aStyle;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        ${FACADE}
        float gGlass, gLit;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float vert = 1.0 - abs(vTN.y), st = vSt.x, tint = vSt.y, roofBox = vSt.z;
        bool sea = vTN.x > 0.5;
        float hz = abs(vTN.x) > 0.5 ? vTW.z : vTW.x, y = vTW.y - ${PROM_Y.toFixed(2)};
        float fy = y / 2.9, fwy = fwidth(fy);
        float glass = 0.0, mull = 0.0;
        if (st > 1.5 && st < 2.5) {                                   // glass curtain wall
          float fx = hz / 1.5, fwx = fwidth(fx);
          mull = pulse(fx, 0.0, 0.05, fwx); glass = (1.0 - mull) * (1.0 - pulse(fy, 0.0, 0.3, fwy));
        } else if (sea && st != 1.0) {                                // balcony doors behind the parapets
          float fx = hz / 1.6, fwx = fwidth(fx);
          glass = pulse(fy, 0.4, 0.93, fwy) * (1.0 - pulse(fx, 0.0, 0.05, fwx));
        } else {                                                      // punched windows
          float fx = hz / 3.2, fwx = fwidth(fx);
          glass = pulse(fx, 0.22, 0.78, fwx) * pulse(fy, 0.33, 0.8, fwy);
        }
        glass *= vert * step(1.0, fy) * (1.0 - roofBox);
        vec3 wall = st < 0.5 ? vec3(0.66, 0.65, 0.62) : st < 1.5 ? mix(vec3(0.7, 0.6, 0.48), vec3(0.68, 0.53, 0.46), tint) : st < 2.5 ? vec3(0.2, 0.23, 0.27) : vec3(0.56, 0.57, 0.58);
        wall *= 0.9 + 0.12 * th21(floor(vec2(hz * 0.05, fy * 0.2)) + tint * 7.0);
        float fwh = fwidth(hz);
        wall *= 1.0 - 0.1 * smoothstep(0.45, 0.8, bnoiseT(vec2(hz * 0.7, y * 0.025 + tint * 13.0))) * (1.0 - smoothstep(0.3, 1.0, fwh * 0.7));   // rain streaks
        wall = mix(wall, vec3(0.35, 0.37, 0.4), mull * 0.7);
        if (vTN.y > 0.5) wall = vec3(0.42, 0.41, 0.4);                // roofs
        if (y < 2.6 && vert > 0.5) { wall = mix(wall, vec3(0.1, 0.11, 0.12), 0.85); glass = 0.0; }   // lobby level: dark glass
        float ao = mix(0.6, 1.0, smoothstep(0.0, 28.0, y));                                       // the street canyon sees less sky
        if (sea && (st < 0.5 || st > 2.5)) ao *= mix(1.0, 0.5, smoothstep(0.3, 1.0, fract(fy)));     // under the balcony slab above
        wall *= ao;
        gGlass = glass;
        vec2 cell = floor(vec2(hz / (st > 1.5 && st < 2.5 ? 1.5 : sea ? 1.6 : 3.2), fy)) + floor(vTW.xz * 0.011) * 17.0;
        float h1 = th21(cell);
        gLit = step(0.67, h1) * (0.55 + 0.45 * th21(cell + 3.1));
        vec3 glassCol = mix(vec3(0.05, 0.06, 0.07), vec3(0.09, 0.1, 0.11), th21(cell + 8.0));
        diffuseColor.rgb *= mix(wall, glassCol * ao, glass);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.07, gGlass);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float fwm = max(fwidth(vTW.x + vTW.z) / 3.0, fwidth(vTW.y) / 2.9);
        float sub = smoothstep(0.35, 0.9, fwm);
        float avg = 0.33 * 0.77 * 0.45 * step(1.0, (vTW.y - ${PROM_Y.toFixed(2)}) / 2.9) * (1.0 - abs(vTN.y)) * (1.0 - vSt.z);
        vec3 warm = mix(vec3(1.0, 0.68, 0.38), vec3(0.85, 0.88, 1.0), step(0.9, th21(floor(vTW.xz) + 1.7)) * 0.0);
        totalEmissiveRadiance += warm * mix(gLit * gGlass, avg, sub) * 1.5;
        float tk = uTown * (0.75 + 0.25 * bnoiseT(vTW.xy * 0.08 + vTW.zy * 0.05)) * (0.6 + 0.4 * smoothstep(0.0, 40.0, vTW.y - 2.5));
        totalEmissiveRadiance += (bbody2(clamp(tk * 0.8, 0.0, 1.0)) * tk * tk * 1.1 + vec3(1.0, 0.5, 0.2) * gGlass * smoothstep(0.0, 0.4, uTown) * 1.3) * (1.0 - vSt.z * 0.5);`);
  };
  mat.customProgramCacheKey = () => 'towers_v2';
  const box = new THREE.BoxGeometry(1, 1, 1);
  // cores + roof machine rooms
  const cores = [];
  list.forEach((t) => {
    const bal = t.style === 0 || t.style === 3, dx = bal ? 1.6 : 0;                 // balconies protrude 1.6 m toward the sea
    t.fx = t.x + t.d / 2 - dx;                                                     // the sea-facing wall behind the balconies
    cores.push([t.x - dx / 2, PROM_Y + t.h / 2, t.z, t.d - dx, t.h, t.w, t.style, t.tint, 0]);
    const rw = t.w * (0.3 + 0.2 * r()), rd = t.d * (0.35 + 0.2 * r()), rh = 3.2 + r() * 2.5;
    cores.push([t.x - dx / 2 - (r() - 0.5) * 3, PROM_Y + t.h + rh / 2, t.z + (r() - 0.5) * (t.w - rw) * 0.6, rd, rh, rw, t.style, t.tint, 1]);
  });
  const im = new THREE.InstancedMesh(box.clone(), mat, cores.length);
  const sty = new Float32Array(cores.length * 4), m4 = new THREE.Matrix4();
  cores.forEach(([x, y, z, sx, sy, sz, st, tint, k], i) => { m4.makeScale(sx, sy, sz); m4.setPosition(x, y, z); im.setMatrixAt(i, m4); sty.set([st, tint, k, 0], i * 4); });
  im.geometry.setAttribute('aStyle', new THREE.InstancedBufferAttribute(sty, 4));
  im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; group.add(im);
  // balcony bands: slab + parapet (white concrete) or slab + glass railing
  const slabs = [], rails = [];
  list.forEach((t) => {
    if (t.style !== 0 && t.style !== 3) return;
    const bw = t.w * 0.94;
    for (let f = 1; f < t.fl; f++) {
      const y0 = PROM_Y + f * 2.9;
      if (t.style === 0) slabs.push([t.fx + 0.8, y0 + 0.55, t.z, 1.6, 1.1, bw]);
      else { slabs.push([t.fx + 0.8, y0 + 0.1, t.z, 1.6, 0.2, bw]); rails.push([t.fx + 1.57, y0 + 0.65, t.z, 0.04, 0.9, bw]); }
    }
  });
  const slabMat = new THREE.MeshStandardMaterial({ color: '#b9b6b0', roughness: 0.85 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#4f6466', roughness: 0.06, metalness: 0.35, envMapIntensity: 1.2 });
  for (const [arr, m] of [[slabs, slabMat], [rails, railMat]]) {
    if (!arr.length) continue;
    const bm = new THREE.InstancedMesh(box.clone(), m, arr.length);
    arr.forEach(([x, y, z, sx, sy, sz], i) => { m4.makeScale(sx, sy, sz); m4.setPosition(x, y, z); bm.setMatrixAt(i, m4); });
    bm.computeBoundingSphere(); bm.castShadow = false; bm.receiveShadow = true; group.add(bm);
  }
  return { mesh: group, list, mat, slabMat, railMat };
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
  scene.environment = env; scene.environmentIntensity = 0.8;
  scene.fog = new THREE.FogExp2(o.fog || '#b9a8a6', 0.0012);
  const hemi = new THREE.HemisphereLight('#b8c2ea', '#a3825f', 0.7); scene.add(hemi);
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
