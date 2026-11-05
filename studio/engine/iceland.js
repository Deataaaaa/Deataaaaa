// Post 12's set: Diamond Beach (Breiðamerkursandur), Iceland, on a late-October evening (16:45, the sun 3 degrees up in
// the south-west), with Jökulsárlón, the glacier lagoon, behind the beach and Breiðamerkurjökull, an outlet glacier of
// Vatnajökull, ending in it. Frame (metres): +x = north (inland, up the glacier), +z = east, y up, sea level y = 0.
// The waterline runs along z near x = 0; the black-sand beach rises to a berm at ~6 m; Route 1 runs along z on a low
// embankment ~262 m inland and crosses the Jökulsá (the lagoon's outlet, x 0..600 near z = 0) on its suspension bridge;
// the lagoon spreads from x ~560 to the glacier front at x ~3900; the glacier tongue rises north to the ice cap.
// The ground is one analytic function in JS and GLSL (the GLSL twin leaves out the inland relief and the mountains,
// which the sea never reaches).
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';
import { SIMPLEX } from './fx.js';
import { NOISE_GLSL } from './guarapari.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// the Sun on 21 October at 16:45 UTC (64.05 N, 16.18 W): azimuth 237.4 degrees, 3.0 degrees up
export const SUN = (() => { const az = THREE.MathUtils.degToRad(238), el = THREE.MathUtils.degToRad(3.2);
  return V(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize(); })();
// shared uniforms: uT story time; uGlac 0..1 the glacier turned to water; uDrain 0..1 the meltwater drained off it;
// uFogC/uFogD haze
export const IU = { uT: { value: 0 }, uSun: { value: SUN.clone() }, uGlac: { value: 0 }, uDrain: { value: 0 }, uSkyI: { value: 1 },
  uFogC: { value: new THREE.Color('#c9a99c') }, uFogD: { value: 0.000085 }, uWall: { value: -1e5 }, uWallH: { value: 40 }, uCapK: { value: 0 } };

// ---------------------------------------------------------------------------------------------------------------
// the ground
// ---------------------------------------------------------------------------------------------------------------
export const coastX = (z) => 6 * Math.sin(z * 0.0014) + 3 * Math.sin(z * 0.0043 + 1.0);   // the waterline (x) at mean sea level
export const riverZ = (x) => 18 * Math.sin(x * 0.004 + 0.5) - 10;                         // the Jökulsá's centre line (z)
const riverHW = (x) => 40 + 40 * sst(90, -30, x);                                          // its half-width, wider at the mouth
export const shoreS = (z) => 560 + 0.00011 * (z + 250) ** 2 + 40 * Math.sin(z * 0.004);    // the lagoon's south shore (x)
export const frontX = (z) => 3900 + 200 * Math.sin(z * 0.0011 + 0.8) + 80 * Math.sin(z * 0.0037 + 2) - 0.00008 * (z + 250) ** 2;   // the glacier front
export const LZW = -2400, LZE = 1900;
export const lagoonIn = (x, z) => Math.min(x - shoreS(z), frontX(z) + 400 - x, z - LZW, LZE - z);   // > 0 inside (the trough runs on under the ice)
export const ROAD_D = 262;                                                                 // Route 1, metres inland of the waterline
export function baseY(x, z) {
  const d = x - coastX(z);
  let y;
  if (d < 0) y = -9 * (1 - Math.exp(d / 45)) - 0.004 * Math.max(0, -d - 400);
  else y = 0.125 * Math.min(d, 40) + 1.3 * sst(40, 75, d) + 0.004 * Math.max(0, d - 75) + 1.7 * Math.exp(-(((d - ROAD_D) / 9) ** 2));
  const hw = riverHW(x), dz = Math.abs(z - riverZ(x));
  const ch = sst(hw, hw * 0.55, dz) * sst(-90, -20, d) * sst(660, 580, x);
  y += (-2.6 - 1.2 * sst(hw * 0.6, 0, dz) - y) * ch;
  const s = lagoonIn(x, z), Lm = sst(-45, 20, s);
  y += (-(4 + 110 * sst(0, 700, s)) - y) * Lm;
  return y;
}
export const BASE_GLSL = `
  float sst(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  float coastX(float z){ return 6.0 * sin(z * 0.0014) + 3.0 * sin(z * 0.0043 + 1.0); }
  float riverZ(float x){ return 18.0 * sin(x * 0.004 + 0.5) - 10.0; }
  float shoreS(float z){ return 560.0 + 0.00011 * (z + 250.0) * (z + 250.0) + 40.0 * sin(z * 0.004); }
  float frontX(float z){ return 3900.0 + 200.0 * sin(z * 0.0011 + 0.8) + 80.0 * sin(z * 0.0037 + 2.0) - 0.00008 * (z + 250.0) * (z + 250.0); }
  float lagoonIn(float x, float z){ return min(min(x - shoreS(z), frontX(z) + 400.0 - x), min(z + 2400.0, 1900.0 - z)); }
  float baseY(vec2 p){
    float x = p.x, z = p.y, d = x - coastX(z), y;
    if (d < 0.0) y = -9.0 * (1.0 - exp(d / 45.0)) - 0.004 * max(0.0, -d - 400.0);
    else y = 0.125 * min(d, 40.0) + 1.3 * sst(40.0, 75.0, d) + 0.004 * max(0.0, d - 75.0) + 1.7 * exp(-pow((d - ${ROAD_D.toFixed(1)}) / 9.0, 2.0));
    float hw = 40.0 + 40.0 * sst(90.0, -30.0, x), dz = abs(z - riverZ(x));
    float ch = sst(hw, hw * 0.55, dz) * sst(-90.0, -20.0, d) * sst(660.0, 580.0, x);
    y += (-2.6 - 1.2 * sst(hw * 0.6, 0.0, dz) - y) * ch;
    float s = lagoonIn(x, z), Lm = sst(-45.0, 20.0, s);
    y += (-(4.0 + 110.0 * sst(0.0, 700.0, s)) - y) * Lm;
    return y;
  }`;

// small JS noise for the inland relief
function hashJS(ix, iz, s) { let h = (ix * 374761393 + iz * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z, s) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hashJS(ix, iz, s), b = hashJS(ix + 1, iz, s), c = hashJS(ix, iz + 1, s), d = hashJS(ix + 1, iz + 1, s); return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz; }
export function fbmJ(x, z, s = 1, oct = 5) { let v = 0, a = 0.5; for (let i = 0; i < oct; i++) { v += a * vnoise(x, z, s + i * 17); x = x * 2.03 + 1.7; z = z * 2.03 + 9.2; a *= 0.5; } return v; }
const ridged = (x, z, s) => { let v = 0, a = 0.5; for (let i = 0; i < 5; i++) { v += a * (1 - Math.abs(2 * vnoise(x, z, s + i * 13) - 1)); x = x * 2.1 + 3.1; z = z * 2.1 - 1.3; a *= 0.5; } return v; };
// the mountains: Breiðamerkurfjall west of the tongue, the ridges east of it, Öræfajökull far to the west
const MTN = [[9200, -6800, 1700, 2300, 780], [7600, 7400, 1500, 2600, 640], [11500, 10800, 2600, 2800, 900], [12500, -15500, 2600, 3200, 620],
  [16000, -27500, 5200, 6200, 2050], [6200, -12500, 1300, 2400, 420], [19000, 14500, 3500, 3500, 1000], [24000, -2500, 2000, 2000, 1250]];
export function mountains(x, z) {
  let m = 0;
  for (const [cx, cz, sx, sz, h] of MTN) { const g = Math.exp(-(((x - cx) / sx) ** 2) - (((z - cz) / sz) ** 2)); if (g > 0.002) m += h * g * (0.72 + 0.5 * ridged(x * 0.0007, z * 0.0007, 5)); }
  return m;
}
export function groundY(x, z) {
  let y = baseY(x, z);
  const d = x - coastX(z), hw = riverHW(x), dz = Math.abs(z - riverZ(x));
  const awayRiver = x > 700 ? 1 : sst(hw * 1.1, hw * 2.2, dz);
  const inland = sst(110, 330, d) * (1 - sst(-140, -10, lagoonIn(x, z))) * awayRiver * (1 - sst(-3, 3, 30 - Math.abs(d - ROAD_D)));
  y += inland * (5.2 * (fbmJ(x * 0.0055, z * 0.0055, 3) - 0.5) + 2.2 * (fbmJ(x * 0.02, z * 0.02, 7, 3) - 0.5) + 2.5 * sst(400, 1200, d));
  y += mountains(x, z) * sst(900, 2500, d);
  return y;
}

// the hero's spot on the beach, east of the river mouth, ~30 m up from the waterline
export const HERO = (() => { const z = 150, x = coastX(z) + 31; return V(x, baseY(x, z), z); })();

// a grid whose spacing is fine in [a, b] and grows outward up to `cap(x)`
function axisPts(lo, hi, a, b, fine, grow, cap) {
  const out = []; for (let x = a; x <= b; x += fine) out.push(x);
  let x = b, st = fine; while (x < hi) { st = Math.min(st * grow, cap(x)); x += st; out.push(Math.min(x, hi)); }
  x = a; st = fine; const lowSide = []; while (x > lo) { st = Math.min(st * grow, cap(x)); x -= st; lowSide.push(Math.max(x, lo)); }
  return lowSide.reverse().concat(out);
}
function gridGeo(xs, zs, yf) {
  const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let k = 0; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { pos[k++] = xs[i]; pos[k++] = yf(xs[i], zs[j]); pos[k++] = zs[j]; }
  k = 0; for (let i = 0; i < nx - 1; i++) for (let j = 0; j < nz - 1; j++) { const a = i * nz + j, b = a + 1, c = a + nz, d = c + 1; idx[k++] = a; idx[k++] = b; idx[k++] = c; idx[k++] = b; idx[k++] = d; idx[k++] = c; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// the sky: clear and deep blue overhead, warm toward the low sun, the Belt of Venus over the glacier (north-east), a
// broken deck of altocumulus lit orange from below, the sun's disc
// ---------------------------------------------------------------------------------------------------------------
export const SKY_GLSL = `
  uniform vec3 uSun; uniform float uSkyI, uT;
  vec3 iceSky(vec3 d, float clouds){
    float el = d.y, cs = dot(d, uSun);
    vec2 hz2 = normalize(d.xz + 1e-5), sz2 = normalize(uSun.xz); float az = dot(hz2, sz2), anti = clamp(-az, 0.0, 1.0), toward = clamp(az, 0.0, 1.0);
    float hz = exp(-max(el, 0.0) / 0.11);
    vec3 zen = vec3(0.075, 0.15, 0.36);
    vec3 horSun = vec3(1.0, 0.56, 0.26), horMid = vec3(0.72, 0.62, 0.66), horAnti = vec3(0.5, 0.52, 0.68);
    vec3 hor = mix(mix(horMid, horSun, pow(toward, 1.5)), horAnti, anti);
    vec3 c = mix(zen, hor, hz);
    c = mix(c, vec3(0.88, 0.58, 0.6), exp(-pow((el - 0.085) / 0.06, 2.0)) * anti * 0.75);       // the Belt of Venus
    c = mix(c, vec3(0.3, 0.36, 0.55), exp(-pow((el - 0.01) / 0.03, 2.0)) * anti * 0.6);        // Earth's shadow
    c += vec3(1.0, 0.5, 0.18) * (pow(max(cs, 0.0), 5.0) * 0.7 + pow(max(cs, 0.0), 40.0) * 1.2);
    if (clouds > 0.0 && el > 0.003) {
      // a broken deck of altocumulus ~4 km up: billows (domain-warped noise), lit pink-orange from below by the low sun,
      // grey-violet where thick and away from it, silver edges toward it; octaves fade where they get too small
      vec2 p = d.xz / (el + 0.03) * 0.5 * (1.0 + 2.2 * smoothstep(0.12, 0.6, el)) + vec2(uT * 0.003, 0.0);
      float fw = 0.5 / (el + 0.03) * 0.003 * (1.0 + 2.2 * smoothstep(0.12, 0.6, el));
      vec2 w = vec2(snoise(vec3(p * 0.7, 3.1)), snoise(vec3(p * 0.7 + 5.2, 7.7))) * 0.6;
      float n = 0.0, a = 0.5, f = 1.0;
      for (int i = 0; i < 5; i++){ n += a * mix(0.0, snoise(vec3((p + w) * f * 1.3, 1.7 + float(i))), 1.0 - smoothstep(0.2, 0.55, fw * f * 8.0)); f *= 2.1; a *= 0.5; }
      float cov = smoothstep(0.02, 0.38, n + 0.05) * smoothstep(0.003, 0.04, el) * (1.0 - 0.6 * smoothstep(0.4, 0.9, el));
      float thick = smoothstep(0.1, 0.6, n);
      vec3 under = mix(vec3(0.95, 0.5, 0.42), vec3(1.0, 0.68, 0.4), toward);                    // lit from below
      vec3 shade = mix(vec3(0.36, 0.33, 0.45), vec3(0.55, 0.38, 0.4), toward);
      vec3 cc = mix(under, shade, thick * (0.55 + 0.35 * anti));
      cc += vec3(1.0, 0.75, 0.5) * pow(max(cs, 0.0), 10.0) * (1.0 - thick) * 1.5;
      c = mix(c, cc, cov * 0.92 * clouds);
    }
    c = mix(c, hor * 0.45, smoothstep(0.0, -0.08, el));
    return c * uSkyI;
  }`;
export function makeSky() {
  const U = { uSun: IU.uSun, uSkyI: IU.uSkyI, uT: IU.uT, uDisk: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `${SIMPLEX}${SKY_GLSL}
      uniform float uDisk; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); vec3 c = iceSky(d, 1.0);
        c += vec3(1.0, 0.72, 0.45) * smoothstep(0.99988, 0.99994, dot(d, uSun)) * 12.0 * uDisk * uSkyI;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(90000, 64, 32), mat); mesh.frustumCulled = false; mesh.renderOrder = -10;
  return { mesh, U };
}

// ---------------------------------------------------------------------------------------------------------------
// the ground material: black volcanic sand (glossy where the swash keeps it wet), Route 1, gravel and moss on the
// outwash plain, dark rock and early snow on the mountains. A standard material (shadows from the ice, the people)
// with its colour, roughness and fine bump computed from the world position.
// ---------------------------------------------------------------------------------------------------------------
export function groundMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uT: IU.uT, uWall: IU.uWall, uFloodWet: { value: 0 } });
    m.userData.sh = sh;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWp; varying vec3 vWn; uniform float uT, uWall;
      ${NOISE_GLSL}${BASE_GLSL}
      float gWet; float gRough;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec2 p = vWp.xz; float y = vWp.y, d = p.x - coastX(p.y);
        float fw = max(fwidth(p.x), fwidth(p.y)) + 1e-4;
        float g1 = bfbmAA(p * 3.1, fw * 3.1), g2 = bfbmAA(p * 0.21 + 4.0, fw * 0.21), g3 = bfbmAA(p * 0.018 + 9.0, fw * 0.018);
        // black sand: blue-black, a little lighter where it is dry and loose higher up the beach
        vec3 sand = vec3(0.034, 0.036, 0.04) * (0.82 + 0.36 * g1) * (0.85 + 0.3 * g2);
        sand = mix(sand, vec3(0.058, 0.056, 0.055) * (0.8 + 0.4 * g1), sst(60.0, 140.0, d) * 0.7);
        // the swash keeps the lower beach wet (glossy, darker); its top edge wanders along the beach
        float wetTop = 17.0 + 3.0 * sin(p.y * 0.031) + 2.0 * g2;
        gWet = sst(wetTop, wetTop - 6.0, d);
        // the outwash plain: grey gravel, olive-brown moss in hollows, lighter tracks
        vec3 gravel = vec3(0.13, 0.125, 0.115) * (0.65 + 0.7 * g2) * (0.8 + 0.4 * g1);
        vec3 moss = vec3(0.16, 0.15, 0.075) * (0.7 + 0.6 * g1);
        float mossK = smoothstep(0.42, 0.62, g3 + 0.25 * (g2 - 0.5)) * sst(150.0, 400.0, d);
        vec3 plain = mix(gravel, moss, mossK);
        vec3 col = mix(sand, plain, sst(95.0, 210.0, d));
        // the road: asphalt, white edge lines, the yellow centre line
        float rd = abs(d - ${ROAD_D.toFixed(1)});
        float road = sst(4.6, 3.9, rd) * (1.0 - sst(380.0, 300.0, abs(p.y - riverZ(p.x))) * 0.0);
        vec3 asph = vec3(0.07, 0.07, 0.072) * (0.85 + 0.3 * g1);
        float lines = sst(0.22, 0.12, abs(rd - 3.3)) * 0.8 + sst(0.14, 0.07, rd) * step(0.5, fract(p.y / 9.0));
        asph = mix(asph, rd < 0.3 ? vec3(0.62, 0.52, 0.18) : vec3(0.7), clamp(lines, 0.0, 1.0) * (1.0 - smoothstep(0.08, 0.25, fw)));
        col = mix(col, asph, road);
        // the river banks and the lagoon shore: wet gravel
        float bank = sst(-0.3, 1.2, y) * sst(3.5, 0.6, y) * sst(100.0, 140.0, d);
        col = mix(col, vec3(0.06, 0.06, 0.062) * (0.8 + 0.4 * g1), bank * 0.8);
        // mountains: dark basalt on the slopes, early snow above ~420 m and on gentle ledges
        float slope = 1.0 - clamp(vWn.y, 0.0, 1.0);
        vec3 rock = vec3(0.075, 0.07, 0.068) * (0.7 + 0.6 * g2);
        col = mix(col, rock, sst(60.0, 160.0, y) * sst(0.18, 0.4, slope));
        float fy = fwidth(y) * 1.5; float snow = smoothstep(380.0 + 120.0 * g3 - fy, 560.0 + 120.0 * g3 + fy, y) * (1.0 - sst(0.5, 0.8, slope) * 0.7);
        col = mix(col, vec3(0.86, 0.88, 0.92), snow);
        gRough = mix(0.93, 0.18 + 0.2 * g1, gWet);
        gRough = mix(gRough, 0.85, sst(95.0, 210.0, d)); gRough = mix(gRough, 0.6, road); gRough = mix(gRough, 0.7, snow);
        col *= mix(1.0, 0.55, gWet * (1.0 - sst(95.0, 210.0, d)));
        diffuseColor.rgb = col;
      }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {
        // wind ripples in the dry sand, very faint (faded once they get smaller than a few pixels)
        vec2 p = vWp.xz; float fw = max(fwidth(p.x), fwidth(p.y)) + 1e-4;
        float rk = 1.0 - smoothstep(0.02, 0.08, fw);
        float r = sin(p.x * 9.0 + 2.0 * bnoise(p * 0.7)) * rk * (1.0 - gWet) * sst(30.0, 60.0, p.x - coastX(p.y)) * (1.0 - sst(110.0, 150.0, p.x - coastX(p.y)));
        normal = normalize(normal + (viewMatrix * vec4(0.06 * r, 0.0, 0.0, 0.0)).xyz);
      }`);
  };
  m.customProgramCacheKey = () => 'ice18ground';
  return m;
}
export function makeGround() {
  const capX = (x) => (x < -420 ? 70 : x < 4700 ? 22 : x < 26000 ? 140 : 600), capZ = (z) => (z > -3100 && z < 2700 ? 22 : Math.abs(z) < 22000 ? 140 : 600);
  const xs = axisPts(-3000, 42000, -24, 112, 0.7, 1.06, capX), zs = axisPts(-32000, 32000, 60, 300, 0.7, 1.06, capZ);
  const g = gridGeo(xs, zs, (x, z) => groundY(x, z));
  const mesh = new THREE.Mesh(g, groundMaterial()); mesh.receiveShadow = true; mesh.frustumCulled = false;
  return { mesh, count: xs.length * zs.length };
}

// ---------------------------------------------------------------------------------------------------------------
// the sea: a long swell rolling in from the south (Gerstner), dark over the black sand, a turquoise plume of glacial
// meltwater off the river mouth, foam where the waves run out of depth, the swash sliding up the beach and back
// ---------------------------------------------------------------------------------------------------------------
export const WAVES = [   // [direction (deg, 0 = travelling north, onshore), wavelength m, amplitude m, steepness]
  [4, 92, 0.62, 0.55], [-12, 55, 0.36, 0.6], [17, 33, 0.18, 0.55], [-26, 18, 0.09, 0.5], [33, 9.5, 0.045, 0.45], [-41, 4.7, 0.02, 0.4]];
const WAVE_GLSL = `
  const int NW = ${WAVES.length};
  uniform vec4 uW[NW]; uniform float uQ[NW];
  vec3 gerstner(vec2 p, float att, float t, out vec3 n){
    vec3 o = vec3(0.0); vec3 dx = vec3(1.0, 0.0, 0.0), dz = vec3(0.0, 0.0, 1.0);
    for (int i = 0; i < NW; i++){
      vec2 D = uW[i].xy; float k = uW[i].z, A = uW[i].w * att, Q = uQ[i], w = sqrt(9.81 * k);
      float ph = k * dot(D, p) - w * t + float(i) * 1.7, c = cos(ph), s = sin(ph);
      o.x += Q * A * D.x * c; o.z += Q * A * D.y * c; o.y += A * s;
      dx += vec3(-Q * A * D.x * D.x * k * s, A * D.x * k * c, -Q * A * D.x * D.y * k * s);
      dz += vec3(-Q * A * D.x * D.y * k * s, A * D.y * k * c, -Q * A * D.y * D.y * k * s);
    }
    n = normalize(cross(dz, dx)); return o;
  }`;
export function makeSea() {
  const uW = WAVES.map(([deg, L, A]) => { const a = THREE.MathUtils.degToRad(deg); return new THREE.Vector4(Math.cos(a), Math.sin(a), (2 * Math.PI) / L, A); });
  const U = { uT: IU.uT, uSun: IU.uSun, uSkyI: IU.uSkyI, uW: { value: uW }, uQ: { value: WAVES.map((w) => w[3]) }, uFogC: IU.uFogC, uFogD: IU.uFogD, uWall: IU.uWall, uWallH: IU.uWallH,
    uLevel: { value: 0 }, uMud: { value: 0 } };
  const capX = (x) => (x < -420 ? 90 : 14), capZ = (z) => (z > -3100 && z < 2700 ? 14 : 500);
  const xs = axisPts(-9000, 630, -40, 40, 0.9, 1.07, capX), zs = axisPts(-32000, 32000, 40, 320, 0.9, 1.07, capZ);
  const g = gridGeo(xs, zs, () => 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: true,
    vertexShader: `${BASE_GLSL}${WAVE_GLSL}
      uniform float uT, uLevel; varying vec3 vW; varying vec3 vN; varying float vDepth; varying float vCrest;
      void main(){
        vec2 p = position.xz; float depth = uLevel - baseY(p);
        float riv = sst(-60.0, 10.0, p.x - coastX(p.y));                        // up the river: no swell, a current
        float att = clamp(depth / 2.6, 0.1, 1.0) * (1.0 - riv);
        vec3 n; vec3 o = gerstner(p, att, uT, n);
        vec3 w = vec3(p.x + o.x, uLevel + o.y + 0.25 * riv, p.y + o.z);
        vW = w; vN = n; vDepth = depth; vCrest = o.y / (0.62 * att + 0.05);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: `${BASE_GLSL}${NOISE_GLSL}${SIMPLEX}${SKY_GLSL}
      uniform float uFogD, uWall, uMud; uniform vec3 uFogC;
      varying vec3 vW; varying vec3 vN; varying float vDepth; varying float vCrest;
      void main(){
        vec2 p = vW.xz; float dist = length(vW - cameraPosition);
        vec2 fwv = fwidth(p); float fw = max(fwv.x, fwv.y) + 1e-4;
        float riv = sst(-60.0, 10.0, p.x - coastX(p.y));
        vec2 flow = vec2(-uT * 0.9 * riv, 0.0);
        vec2 q = p * 0.7 + vec2(uT * 0.21, uT * 0.07) + flow, q2 = p * 1.9 - vec2(uT * 0.15, -uT * 0.27) + flow * 2.0;
        float e = 0.35, rk = 1.0 - smoothstep(0.15, 0.6, fw * 1.9);
        float h0 = bnoise(q) + 0.5 * bnoise(q2);
        vec2 gr = vec2(bnoise(q + vec2(e, 0.0)) + 0.5 * bnoise(q2 + vec2(e, 0.0)) - h0, bnoise(q + vec2(0.0, e)) + 0.5 * bnoise(q2 + vec2(0.0, e)) - h0) / e;
        vec3 N = normalize(vN + vec3(-gr.x, 0.0, -gr.y) * 0.16 * rk);
        vec3 Vd = normalize(cameraPosition - vW);
        float fres = 0.02 + 0.98 * pow(clamp(1.0 - dot(N, Vd), 0.0, 1.0), 5.0);
        vec3 R = reflect(-Vd, N); R.y = abs(R.y) + 0.01;
        float thick = vW.y - baseY(p);
        float plume = exp(-pow((p.y - riverZ(0.0)) / (160.0 + 0.7 * abs(p.x)), 2.0)) * sst(-900.0, -60.0, p.x) + riv;
        vec3 deep = vec3(0.012, 0.03, 0.045), shal = vec3(0.02, 0.03, 0.03), glac = vec3(0.06, 0.13, 0.14);
        vec3 body = mix(mix(shal, deep, sst(0.6, 8.0, thick)), glac, clamp(plume, 0.0, 1.0) * 0.75) * uSkyI;
        body = mix(body, vec3(0.16, 0.13, 0.1) * uSkyI, uMud);
        vec3 col = mix(body, iceSky(R, 0.0), fres);
        float sp = pow(max(dot(R, uSun), 0.0), 300.0) * (1.0 - smoothstep(0.3, 2.0, fw * 4.0)); col += vec3(1.0, 0.72, 0.45) * sp * 9.0 * uSkyI;
        float sp2 = pow(max(dot(R, uSun), 0.0), 18.0); col += vec3(1.0, 0.6, 0.35) * sp2 * 0.18 * uSkyI;
        // foam: broken crests in the surf zone, the run-out of each wave (lace), and the swash edge
        float fz = bfbmAA(p * vec2(0.5, 0.2) + vec2(uT * 0.11, 0.0), fw * 0.5);
        float lace = bfbmAA(p * 1.6 + vec2(uT * 0.3, 0.0), fw * 1.6);
        float brk = smoothstep(0.5, 0.95, vCrest) * smoothstep(4.5, 0.8, vDepth) * smoothstep(0.32, 0.62, fz);
        float wash = smoothstep(0.22, 0.0, thick) * smoothstep(0.42, 0.7, lace + 0.2) + smoothstep(0.035, 0.0, thick) * 0.6;
        float trail = smoothstep(2.5, 0.6, vDepth) * smoothstep(0.55, 0.75, lace) * 0.5 * (1.0 - riv);
        float dd = max(0.0, coastX(p.y) - p.x);                                                    // metres out from the waterline
        float lines = 0.0;
        for (int i = 0; i < 3; i++) { float ph = fract((dd + uT * 4.6 + float(i) * 23.0 + 9.0 * fz) / 70.0);
          lines = max(lines, smoothstep(0.035, 0.0, abs(ph - 0.5) - 0.01) * smoothstep(0.45, 0.7, bfbmAA(p * vec2(0.08, 0.03) + float(i) * 3.3, fw * 0.08))); }
        lines *= smoothstep(150.0, 60.0, dd) * smoothstep(2.0, 12.0, dd) * (1.0 - riv);
        float surf = smoothstep(55.0, 10.0, dd) * smoothstep(0.35, 0.7, lace) * 0.55 * (1.0 - riv);
        brk = max(brk, max(lines * 0.75, surf));
        vec3 fcol = vec3(0.82, 0.8, 0.78) * uSkyI * (0.75 + 0.25 * fz);
        col = mix(col, fcol, clamp(brk + wash + trail, 0.0, 1.0) * 0.8 * (1.0 - riv * 0.7));
        float fog = 1.0 - exp(-uFogD * dist);
        col = mix(col, uFogC * uSkyI, fog);
        gl_FragColor = vec4(col, smoothstep(0.0, 0.05, thick) * (1.0 - sst(560.0, 620.0, p.x)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = -1;
  return { mesh: m, U };
}

// ---------------------------------------------------------------------------------------------------------------
// the lagoon: still, milky-teal glacial water mirroring the icebergs, the glacier and the pink sky (a Reflector over
// the lagoon's bounding box; the land around it hides the rest). Foam rings where icebergs melt (uBerg: x, z, r, a).
// ---------------------------------------------------------------------------------------------------------------
export function makeLagoon({ ssaa = 2, nb = 16 } = {}) {
  const x0 = 380, x1 = 4500, z0 = -2700, z1 = 2200;
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  const shader = {
    name: 'IceLagoonShader',
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uT: IU.uT, uSun: IU.uSun, uSkyI: IU.uSkyI, uFogC: IU.uFogC, uFogD: IU.uFogD,
      uBerg: { value: Array.from({ length: nb }, () => new THREE.Vector4(0, 0, 0, 0)) }, uChop: { value: 0 }, uMud: { value: 0 } },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${SIMPLEX}${BASE_GLSL}
      uniform sampler2D tDiffuse; uniform vec3 color, uSun, uFogC; uniform float uT, uFogD, uSkyI, uChop, uMud; uniform vec4 uBerg[${nb}];
      varying vec4 vUv; varying vec3 vW;
      void main(){
        if (lagoonIn(vW.x, vW.z) < -60.0) discard;
        vec2 fw2 = fwidth(vW.xz); float px = max(fw2.x, fw2.y), t = uT;
        vec2 n = vec2(fbm3(vec3(vW.xz * 0.03, t * 0.05), 3), fbm3(vec3(vW.zx * 0.03 + 4.0, t * 0.05), 3)) * 0.03;
        n += vec2(fbm3(vec3(vW.xz * 0.22 + vec2(t * 0.06, 0.0), t * 0.08), 2), fbm3(vec3(vW.zx * 0.22 + 9.0, t * 0.08), 2)) * 0.012 * (1.0 - smoothstep(0.1, 0.7, px * 0.22));
        float foam = 0.0;
        for (int i = 0; i < ${nb}; i++) { vec4 b = uBerg[i]; if (b.w <= 0.0) continue;
          vec2 dv = vW.xz - b.xy; float d = length(dv) * (0.75 + 0.5 * fbm3(vec3(vW.xz * 0.012, b.x * 0.01), 2)), x = (d - b.z * 0.6) / max(4.0, b.z * 0.6);
          float a = exp(-x * x) * b.w; foam += a * smoothstep(0.0, 0.5, fbm3(vec3(vW.xz * 0.05, t * 0.3 + b.y), 3) + 0.25);
          n += normalize(dv + 1e-4) * a * 0.05 * sin(d * 0.3 - t * 6.0);
        }
        n *= 1.0 + 3.0 * uChop;
        vec3 Vd = normalize(cameraPosition - vW), N = normalize(vec3(-n.x * 2.4, 1.0, -n.y * 2.4));
        float mu = clamp(dot(Vd, N), 0.0, 1.0), fres = 0.02 + 0.98 * pow(max(1.0 - mu, 0.0), 5.0);
        vec2 uv = vUv.xy / vUv.w + n * vec2(0.5, 0.25) * 0.4;
        vec3 refl = texture2D(tDiffuse, uv).rgb;
        vec3 body = vec3(0.03, 0.075, 0.085) * uSkyI;
        body = mix(body, vec3(0.2, 0.17, 0.13) * uSkyI, uMud);
        vec3 c = mix(body, refl, clamp(0.25 + 0.75 * fres, 0.0, 1.0));
        float glit = pow(max(dot(reflect(-Vd, N), uSun), 0.0), 90.0) * (1.0 - smoothstep(0.3, 2.0, px * 0.25));
        c += vec3(1.0, 0.7, 0.45) * glit * 1.4 * uSkyI;
        c = mix(c, vec3(0.86, 0.85, 0.84) * uSkyI, clamp(foam, 0.0, 1.0) * 0.8);
        float fd = 1.0 - exp(-uFogD * length(cameraPosition - vW));
        c = mix(c, uFogC * uSkyI, fd);
        gl_FragColor = vec4(c, 1.0);
      }`,
  };
  const w = Math.round(1080 * ssaa / 2), h = Math.round(1920 * ssaa / 2);
  const water = new Reflector(geo, { textureWidth: w, textureHeight: h, clipBias: 0.02, shader, multisample: 0 });
  water.rotation.x = -Math.PI / 2; water.position.set((x0 + x1) / 2, 0.12, (z0 + z1) / 2);
  water.camera.layers.set(0);
  return { mesh: water, U: water.material.uniforms };
}

// ---------------------------------------------------------------------------------------------------------------
// Route 1's suspension bridge over the Jökulsá: two steel portal towers, main cables over them anchored behind,
// hangers every 6 m, a narrow deck with railings. Local frame: z along the span (the river's width), x across.
// ---------------------------------------------------------------------------------------------------------------
export const BRIDGE = (() => { const x = ROAD_D + coastX(riverZ(ROAD_D)), z = riverZ(ROAD_D); return { x, z, span: 108, deckY: baseY(x, z + 80) + 0.6 }; })();
export function makeBridge() {
  const steel = new THREE.MeshStandardMaterial({ color: '#8d9297', roughness: 0.55, metalness: 0.6 });
  const deckM = new THREE.MeshStandardMaterial({ color: '#3b3d40', roughness: 0.85 });
  const conc = new THREE.MeshStandardMaterial({ color: '#8c8a84', roughness: 0.9 });
  const half = BRIDGE.span / 2, dy = BRIDGE.deckY, parts = { deck: [], steel: [], conc: [] };
  const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
  parts.deck.push(box(6.4, 0.5, BRIDGE.span + 24, 0, dy - 0.25, 0));
  for (const s of [-1, 1]) {
    parts.steel.push(box(0.12, 1.0, BRIDGE.span + 24, s * 3.15, dy + 0.5, 0), box(0.25, 0.9, BRIDGE.span + 24, s * 3.25, dy - 0.7, 0));   // railings, edge girders
    for (const e of [-1, 1]) {
      const zt = e * half;
      parts.steel.push(box(0.7, 13, 0.7, s * 3.6, dy + 6.0, zt));                        // tower legs
      parts.conc.push(box(1.6, 6, 1.6, s * 3.6, dy - 3.2, zt));                          // piers
    }
  }
  for (const e of [-1, 1]) { parts.steel.push(box(7.9, 0.7, 0.6, 0, dy + 12.2, e * half), box(7.9, 0.5, 0.5, 0, dy + 4.6, e * half)); }   // portal beams
  const geo = (list) => mergeGeometries(list);
  const g = new THREE.Group();
  const mk = (list, mat) => { const m = new THREE.Mesh(geo(list), mat); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  mk(parts.deck, deckM); mk(parts.steel, steel); mk(parts.conc, conc);
  // main cables (parabolic) and hangers, as thin tubes
  const cab = [];
  for (const s of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 40; i++) { const zz = -half - 40 + (BRIDGE.span + 80) * i / 40; let y;
      if (Math.abs(zz) <= half) y = dy + 1.2 + 11.0 * (zz / half) ** 2; else y = dy + 12.2 - (Math.abs(zz) - half) * 0.3; pts.push(V(s * 3.6, y, zz)); }
    cab.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.09, 6, false));
    for (let zz = -half + 6; zz < half; zz += 6) { const y = dy + 1.2 + 11.0 * (zz / half) ** 2; cab.push(box(0.05, y - dy - 0.9, 0.05, s * 3.6, dy + 0.9 + (y - dy - 0.9) / 2, zz)); }
  }
  mk(cab, steel);
  g.position.set(BRIDGE.x, 0, BRIDGE.z);
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// the glacier and the ice cap: one height field from the calving front up to Vatnajökull's plateau (crevasse fields,
// dark medial moraines, bare blue ice low down, old snow higher up), and the front's ice cliff. uGlac turns the ice to
// water: dark, glossy, streaming downhill; uDrain lowers the meltwater as it pours out.
// ---------------------------------------------------------------------------------------------------------------
export function iceY(x, z) {
  const u = x - frontX(z);
  if (u < -5) return -1e3;
  let y = 30 + 330 * (1 - Math.exp(-Math.max(u, 0) / 2200)) + 0.03 * Math.max(0, x - 9000) + 900 * sst(12000, 38000, x);
  const lat = sst(-5600, -4500, z) * sst(5000, 3900, z), latK = lat + (1 - lat) * sst(9000, 14000, x);
  y -= (1 - latK) * 420;
  y += 14 * (fbmJ(x * 0.0009, z * 0.0009, 11, 4) - 0.5) * sst(0, 3000, u);
  return y;
}
const GLAC_GLSL = `
  vec3 glacierCol(vec2 p, float y, float fw, out float rough){
    float u = p.x - frontX(p.y);
    float n1 = bfbmAA(p * 0.004, fw * 0.004), n2 = bfbmAA(p * 0.03 + 3.0, fw * 0.03), n3 = bfbmAA(p * 0.25 + 7.0, fw * 0.25);
    // crevasses: dark-blue lines across the flow where the ice stretches (near the front and over the steps)
    float cz = p.y * 0.012 + 1.6 * n1, cx = p.x * 0.09 + 3.0 * n2;
    float crev = (1.0 - smoothstep(0.0, 0.25 + fw * 0.09, abs(fract(cx) - 0.5) * 2.0 - 0.55)) * smoothstep(0.45, 0.7, n2) * (sst(0.0, 600.0, u) * sst(4500.0, 2500.0, u) + 0.6 * sst(9000.0, 11000.0, p.x) * sst(14000.0, 12000.0, p.x));
    crev *= 1.0 - smoothstep(0.08, 0.3, fw * 0.09);
    // medial moraines: dark bands of rock debris carried down the tongue
    float mm = 0.0; for (int i = 0; i < 4; i++){ float zc = -1800.0 + float(i) * 1100.0 + 300.0 * sin(p.x * 0.00045 + float(i)); float wdt = 70.0 + 40.0 * mod(float(i), 2.0);
      mm = max(mm, sst(wdt, wdt * 0.4, abs(p.y - zc + 60.0 * (n1 - 0.5)))); }
    mm *= sst(0.0, 300.0, u) * sst(16000.0, 9000.0, p.x);
    vec3 ice = mix(vec3(0.55, 0.62, 0.68), vec3(0.82, 0.86, 0.89), n3) * (0.8 + 0.3 * n2);
    vec3 snow = vec3(0.94, 0.95, 0.97) * (0.92 + 0.1 * n3);
    vec3 col = mix(ice, snow, sst(450.0, 800.0, y + 120.0 * (n1 - 0.5)));
    col = mix(col, vec3(0.06, 0.12, 0.2), crev * 0.9);
    col *= mix(0.72, 1.08, smoothstep(0.3, 0.7, n2 + 0.3 * (n1 - 0.5)));                       // dirty and clean patches
    col = mix(col, vec3(0.07, 0.065, 0.06) * (0.8 + 0.5 * n3), mm * 0.9);
    col = mix(col, col * vec3(0.55, 0.5, 0.45), sst(300.0, 0.0, u) * 0.6);                // grimy near the front
    rough = mix(0.35, 0.65, sst(450.0, 800.0, y));
    return col;
  }`;
export function iceMaterialPatch(m, { key, cliff = false } = {}) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uT: IU.uT, uGlac: IU.uGlac, uDrain: IU.uDrain, uSun: IU.uSun, uSkyI: IU.uSkyI, uCapK: IU.uCapK });
    m.userData.sh = sh;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      varying vec3 vWp; varying vec3 vWn; uniform float uGlac, uDrain, uCapK, uT;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        vec4 wq = modelMatrix * vec4(transformed, 1.0);
        float u = wq.x - (3900.0 + 200.0 * sin(wq.z * 0.0011 + 0.8) + 80.0 * sin(wq.z * 0.0037 + 2.0) - 0.00008 * (wq.z + 250.0) * (wq.z + 250.0));
        // melted: the meltwater surface sags as it pours out over the front (lower near the front, later further up)
        float drop = uDrain * (wq.y - 2.0) * (0.75 * exp(-max(u, 0.0) / (1500.0 + 9000.0 * uDrain)) + 0.15) * (1.0 - uCapK * 0.0);
        transformed.y -= drop * uGlac;
        ${cliff ? 'transformed.x += uGlac * uDrain * 60.0 * (1.0 - position.y / 40.0); transformed.y = mix(transformed.y, -4.0, uGlac * smoothstep(0.0, 0.04, uDrain));' : ''}
        vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);
      }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWp; varying vec3 vWn; uniform float uT, uGlac, uDrain, uSkyI; uniform vec3 uSun;
      ${NOISE_GLSL}${BASE_GLSL}${GLAC_GLSL}
      float gRough; float gWater;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec2 p = vWp.xz; float fw = max(fwidth(p.x), fwidth(p.y)) + 1e-4;
        vec3 col;
        ${cliff ? `
        float n = bfbmAA(vec2(p.y * 0.06, vWp.y * 0.05), fw * 0.06), n2 = bfbmAA(vec2(p.y * 0.3, vWp.y * 0.2) + 3.0, fw * 0.3);
        col = mix(vec3(0.1, 0.3, 0.45), vec3(0.62, 0.78, 0.88), smoothstep(0.35, 0.8, n)) * (0.85 + 0.3 * n2);
        col = mix(col, vec3(0.16, 0.15, 0.14), smoothstep(0.7, 0.85, bfbmAA(vec2(p.y * 0.02, vWp.y * 0.35), fw * 0.35)) * 0.35);   // dirt layers
        gRough = 0.3;` : 'col = glacierCol(p, vWp.y, fw, gRough);'}
        // turned to water: dark glossy meltwater streaming down, whitewater where it is steep or shallow
        float fl = bfbmAA(vec2(p.y * 0.02, p.x * 0.006 + uT * 0.9), fw * 0.02) + 0.5 * bfbmAA(vec2(p.y * 0.07, p.x * 0.03 + uT * 2.4), fw * 0.07);
        vec3 water = mix(vec3(0.045, 0.06, 0.065), vec3(0.13, 0.12, 0.1), smoothstep(0.4, 0.9, fl));
        float white = smoothstep(0.85, 1.15, fl + 0.25 * (1.0 - vWn.y) * 4.0);
        water = mix(water, vec3(0.7, 0.7, 0.68), white * 0.7);
        gWater = uGlac;
        col = mix(col, water, uGlac);
        gRough = mix(gRough, mix(0.06, 0.4, white), uGlac);
        diffuseColor.rgb = col;
      }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      ${cliff ? '' : `{ float far = 0.45 + 0.55 * smoothstep(4500.0, 14000.0, vWp.x); totalEmissiveRadiance += vec3(1.0, 0.56, 0.44) * 0.16 * far * dot(diffuseColor.rgb, vec3(0.33)) * uSkyI * (1.0 - uGlac); }`}
      ${cliff ? `{ vec3 Vd = normalize(cameraPosition - vWp); float back = pow(max(dot(-Vd, uSun), 0.0), 2.0) * 0.25 + 0.06 + 0.22 * smoothstep(0.2, -0.3, dot(normalize(vWn), uSun));
        totalEmissiveRadiance += vec3(0.25, 0.55, 0.75) * back * uSkyI * (1.0 - uGlac); }` : ''}`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}
export function makeGlacier() {
  // a grid in (u = x - frontX(z), z): dense near the front, growing up-glacier
  const us = axisPts(-6, 39000, 0, 300, 10, 1.05, (u) => (u < 4000 ? 40 : 700));
  const zs = axisPts(-34000, 34000, -2800, 2400, 22, 1.05, (z) => (z > -6500 && z < 5500 ? 60 : 900));
  const nu = us.length, nz = zs.length, pos = new Float32Array(nu * nz * 3), idx = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nz; j++) { const z = zs[j], x = frontX(z) + us[i]; let y = iceY(x, z); const gy = groundY(x, z);
    if (y < gy + 0.5) y = gy - 6;                      // no ice here: tucked under the ground
    const k = (i * nz + j) * 3; pos[k] = x; pos[k + 1] = y; pos[k + 2] = z; }
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nz - 1; j++) { const a = i * nz + j, b = a + 1, c = a + nz, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mat = iceMaterialPatch(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), { key: 'ice18glacier' });
  const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; mesh.castShadow = false; mesh.frustumCulled = false;
  // the calving front: a jagged ice cliff from below the waterline to the surface
  const NZc = 700, cpos = [], cidx = []; const cr = rng(41);
  for (let j = 0; j <= NZc; j++) { const z = LZW - 300 + (LZE - LZW + 600) * j / NZc, xf = frontX(z), top = iceY(xf + 2, z);
    const jag = 9 * (fbmJ(z * 0.03, 1.5, 4) - 0.5) + 4 * (cr() - 0.5);
    for (let r = 0; r <= 6; r++) { const v = r / 6, y = -3 + (top + 3) * v, ins = (1 - v) * 3 + v * v * 6;
      cpos.push(xf + jag + ins + 3 * (fbmJ(z * 0.12, y * 0.08, 6, 3) - 0.5), y + (r === 6 ? 2.5 * (fbmJ(z * 0.07, 3.3, 3) - 0.5) : 0), z); } }
  for (let j = 0; j < NZc; j++) for (let r = 0; r < 6; r++) { const a = j * 7 + r, b = a + 1, c = a + 7, d = c + 1; cidx.push(a, c, b, b, c, d); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3)); cg.setIndex(cidx); cg.computeVertexNormals();
  const cmat = iceMaterialPatch(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, side: THREE.DoubleSide }), { key: 'ice18cliff', cliff: true });
  const cliff = new THREE.Mesh(cg, cmat); cliff.castShadow = true; cliff.receiveShadow = true; cliff.frustumCulled = false;
  return { mesh, cliff };
}
