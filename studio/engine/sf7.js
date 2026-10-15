// Post 7's set: Baker Beach, San Francisco, at golden hour, looking up the coast at the Golden Gate Bridge.
// Frame (metres): +x = north-west (out to the Pacific), +z = north-east (along the beach toward the bridge), y up, sea
// level y = 0. The beach runs along z near x = 0, the Sea Cliff bluff and its houses rise inland (-x), the Presidio's
// wooded cliffs lead to Fort Point, the bridge spans the strait (south tower at about 1.9 km), the Marin Headlands
// rise across it. The ground is one analytic function in JS and GLSL (the sea reads its own depth from it).
// S7 uniforms drive the episode: uLevel (the sea drains away), uSpume (wind-torn spray), uTwist/uBend/uBreak (the
// bridge), uTime.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';
import { canvasTex } from './assets.js';
import { NOISE_GLSL, SKY_GLSL, WAVES, WAVE_GLSL } from './guarapari.js';

export const S7 = { uTime: { value: 0 }, uLevel: { value: 0 }, uSpume: { value: 0 }, uFlow: { value: 0 }, uTwist: { value: 0 }, uBend: { value: 0 }, uBreak: { value: -1 },
  uFogC: { value: new THREE.Color('#d8b89a') }, uFogD: { value: 0.00018 } };
export const MX = 1452.5, MZ = 2052.5;                       // bridge mid-span; its axis u = (0.7071, 0, 0.7071), south -> north
export const BU = new THREE.Vector3(0.70711, 0, 0.70711), BV = new THREE.Vector3(0.70711, 0, -0.70711);   // u, and v = across (west)
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, k) => a + (b - a) * k;
export const coastX = (z) => (z > 700 ? (z - 700) * 1.15 : z < -450 ? (-450 - z) * 0.6 : 0);
function landY(x, z, d) {
  const beach = Math.min(d * 0.055, 3.3) + 36 * sst(62, 96, d);
  const pres = 2 * sst(0, 4, d) + (40 - 28 * sst(1250, 1500, z)) * sst(4, 38, d);
  const head = 2 * sst(0, 4, d) + 30 * sst(4, 45, d);
  return mix(mix(beach, pres, sst(650, 760, z)), head, sst(-420, -520, z));
}
export function groundY(x, z) {
  const qx = x - MX, qz = z - MZ, s = (qx + qz) * 0.70711, w = (qx - qz) * 0.70711;
  const dSF = Math.min(coastX(z) - x, -(s + 900)), dM = s - 950;
  if (dM > 0) return 2 * sst(0, 4, dM) + 250 * (1 - Math.exp(-dM / 240)) * (0.82 + 0.18 * Math.sin(x * 0.004 + 1.3) * Math.sin(z * 0.0035 + 0.4));
  if (dSF > 0) return landY(x, z, dSF);
  const off = -Math.max(dSF, dM);
  return -Math.min(off * 0.025, 14) - 4 * sst(400, 1500, off) - 95 * Math.exp(-((s / 620) ** 2)) * sst(2600, 900, w);
}
const GROUND7 = `
  float sst(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  float coastX(float z){ return z > 700.0 ? (z - 700.0) * 1.15 : (z < -450.0 ? (-450.0 - z) * 0.6 : 0.0); }
  float landY(vec2 p, float d){
    float beach = min(d * 0.055, 3.3) + 36.0 * sst(62.0, 96.0, d);
    float pres = 2.0 * sst(0.0, 4.0, d) + (40.0 - 28.0 * sst(1250.0, 1500.0, p.y)) * sst(4.0, 38.0, d);
    float head = 2.0 * sst(0.0, 4.0, d) + 30.0 * sst(4.0, 45.0, d);
    return mix(mix(beach, pres, sst(650.0, 760.0, p.y)), head, sst(-420.0, -520.0, p.y));
  }
  float groundY(vec2 p){
    vec2 q = p - vec2(${MX.toFixed(1)}, ${MZ.toFixed(1)});
    float s = (q.x + q.y) * 0.70711, w = (q.x - q.y) * 0.70711;
    float dSF = min(coastX(p.y) - p.x, -(s + 900.0)), dM = s - 950.0;
    if (dM > 0.0) return 2.0 * sst(0.0, 4.0, dM) + 250.0 * (1.0 - exp(-dM / 240.0)) * (0.82 + 0.18 * sin(p.x * 0.004 + 1.3) * sin(p.y * 0.0035 + 0.4));
    if (dSF > 0.0) return landY(p, dSF);
    float off = -max(dSF, dM);
    return -min(off * 0.025, 14.0) - 4.0 * sst(400.0, 1500.0, off) - 95.0 * exp(-pow(s / 620.0, 2.0)) * sst(2600.0, 900.0, w);
  }`;

// small JS noise for land relief (never used near the waterline, so the sea's depth stays exact)
function hashJS(ix, iz, s) { let h = (ix * 374761393 + iz * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z, s) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hashJS(ix, iz, s), b = hashJS(ix + 1, iz, s), c = hashJS(ix, iz + 1, s), d = hashJS(ix + 1, iz + 1, s); return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz; }
export function fbm7(x, z, s = 1) { let v = 0, a = 0.5; for (let i = 0; i < 5; i++) { v += a * vnoise(x, z, s + i * 17); x = x * 2.03 + 1.7; z = z * 2.03 + 9.2; a *= 0.5; } return v; }
// a grid: dense round the hero, growing geometrically outward
function axis(lo, hi, dlo, dhi, step, grow) {
  const a = []; for (let v = dlo; v <= dhi; v += step) a.push(v);
  for (let v = dlo, s = step; v > lo; s *= grow) { v -= s; a.unshift(Math.max(v, lo)); if (v <= lo) break; }
  for (let v = a[a.length - 1], s = step; v < hi; s *= grow) { v += s; a.push(Math.min(v, hi)); if (v >= hi) break; }
  return a;
}
function gridGeo(xs, zs, yf) {
  const pos = new Float32Array(xs.length * zs.length * 3), idx = [];
  zs.forEach((z, j) => xs.forEach((x, i) => { const k = (j * xs.length + i) * 3; pos[k] = x; pos[k + 1] = yf(x, z); pos[k + 2] = z; }));
  for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) { const a = j * xs.length + i, b = a + 1, c = a + xs.length, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function landRelief(x, z) {
  const y = groundY(x, z); if (y < 4) return y;
  const k = Math.min(1, (y - 4) / 6);
  return y + k * ((fbm7(x * 0.02, z * 0.02, 3) - 0.5) * (y > 60 ? 18 : 5) + (fbm7(x * 0.15, z * 0.15, 7) - 0.5) * 1.2);
}

// ---------------------------------------------------------------------------------------------------------------
// the ground: dry sand, wet sand, the seabed the sea leaves behind (dark sand ripples, rock, kelp), serpentine cliffs,
// golden October grass on the bluffs and the Marin hills, the Presidio's cypress woods
// ---------------------------------------------------------------------------------------------------------------
export function makeTerrain7() {
  const g = gridGeo(axis(-2600, 5200, -130, 60, 0.7, 1.045), axis(-3600, 6200, -90, 70, 0.7, 1.045), landRelief);
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uLevel: S7.uLevel, uTime: S7.uTime });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW; varying vec3 vGN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz; vGN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vGW; varying vec3 vGN; uniform float uLevel, uTime; float gRough; ${NOISE_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec2 p = vGW.xz; float y = vGW.y, fwm = max(fwidth(p.x), fwidth(p.y));
      float n1 = bfbmAA(p * 0.35, fwm * 0.35), n2 = bfbmAA(p * 0.04 + 7.0, fwm * 0.04), n3 = bfbmAA(p * 2.2, fwm * 2.2);
      float slope = 1.0 - clamp(normalize(vGN).y, 0.0, 1.0);
      float n4 = bfbmAA(p * 9.0, fwm * 9.0), rip = sin(dot(p, vec2(1.9, 0.6)) + 3.0 * n1) * (1.0 - smoothstep(0.08, 0.4, fwm * 2.0));
      vec3 dry = vec3(0.7, 0.6, 0.46) * (0.82 + 0.22 * n1 + 0.12 * n3 + 0.1 * n4) * (0.97 + 0.03 * rip), wet = vec3(0.3, 0.25, 0.19) * (0.85 + 0.2 * n1 + 0.08 * n4);
      vec3 bed = vec3(0.16, 0.15, 0.13) * (0.8 + 0.3 * n1 + 0.1 * n4) * (0.9 + 0.1 * rip);           // the drained seabed: dark, wet, rippled
      vec3 rock = mix(vec3(0.36, 0.38, 0.33), vec3(0.47, 0.41, 0.33), n2) * (0.75 + 0.35 * n3);           // serpentine and sandstone
      vec3 grass = mix(vec3(0.6, 0.5, 0.29), vec3(0.3, 0.32, 0.18), smoothstep(0.45, 0.7, n2)) * (0.85 + 0.2 * n1);
      vec3 wood = vec3(0.11, 0.16, 0.09) * (0.75 + 0.4 * n1);
      vec3 c = dry; gRough = 0.92;
      float wetK = smoothstep(0.9, 0.2, y + 0.3 * n1);
      c = mix(c, wet, wetK); gRough = mix(gRough, 0.32, wetK);
      if (y < -0.05) {                                                       // the seabed (seen once the sea has drained)
        c = bed; gRough = 0.4 + 0.2 * n3;                                     // glossy: it reflects the sky
        float kelp = smoothstep(0.62, 0.7, n2 + 0.2 * n1) * smoothstep(-0.5, -3.0, y);
        c = mix(c, vec3(0.12, 0.13, 0.06), kelp * 0.85);
        c = mix(c, rock * 0.7, smoothstep(0.66, 0.74, bfbmAA(p * 0.08 + 3.0, fwm * 0.08)) * 0.9);
      }
      float steep = smoothstep(0.35, 0.6, slope);
      float top = smoothstep(6.0, 14.0, y) * (1.0 - steep);
      bool presidio = p.y > 700.0 && p.x < (p.y - 700.0) * 1.15;
      c = mix(c, presidio ? wood : grass, top);
      c = mix(c, rock, steep * smoothstep(2.0, 5.0, y));
      gRough = mix(gRough, 0.85, max(top, steep));
      diffuseColor.rgb *= c;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;');
  };
  mat.customProgramCacheKey = () => 'sf7_ground_v1';
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = false;
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// the Pacific: Gerstner swell toward the beach, sky reflections, foam; uLevel drains it, uSpume tears it into spray
// streaming west, uFlow streaks it as it rushes out
// ---------------------------------------------------------------------------------------------------------------
export function makeOcean7(sky) {
  const uW = WAVES.map(([deg, L, A]) => { const a = THREE.MathUtils.degToRad(deg); return new THREE.Vector4(-Math.cos(a), Math.sin(a), (2 * Math.PI) / L, A); });
  const U = { ...sky.material.uniforms, uTime: S7.uTime, uLevel: S7.uLevel, uSpume: S7.uSpume, uFlow: S7.uFlow, uW: { value: uW }, uQ: { value: WAVES.map((w) => w[3]) },
    uDeep: { value: new THREE.Color('#0b2433') }, uShallow: { value: new THREE.Color('#2a6b70') }, uSandC: { value: new THREE.Color('#8a7656') },
    uFogCol: S7.uFogC, uFogD: S7.uFogD, uSunI: { value: 2.0 } };
  const g = gridGeo(axis(-700, 9000, -60, 1100, 1.5, 1.04), axis(-6000, 9000, -220, 320, 1.5, 1.04), () => 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: true,
    vertexShader: `${GROUND7}${WAVE_GLSL}
      uniform float uLevel; varying vec3 vW; varying vec3 vN; varying float vDepth; varying float vCrest;
      void main(){
        vec2 p = position.xz; float depth = uLevel - groundY(p);
        float att = clamp(depth / 2.2, 0.12, 1.0) * (1.0 - 0.6 * smoothstep(0.0, -6.0, uLevel));
        vec3 n; vec3 o = gerstner(p, att, n);
        vec3 w = vec3(p.x + o.x, uLevel + o.y, p.y + o.z);
        vW = w; vN = n; vDepth = depth; vCrest = o.y / (0.55 * att + 0.05);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: `${GROUND7}${NOISE_GLSL}${SKY_GLSL}
      uniform float uTime, uFogD, uSunI, uSpume, uFlow, uLevel; uniform vec3 uDeep, uShallow, uSandC, uFogCol;
      varying vec3 vW; varying vec3 vN; varying float vDepth; varying float vCrest;
      void main(){
        vec2 p = vW.xz; float dist = length(vW - cameraPosition);
        float e = 0.35, fd = clamp(1.0 - dist / 260.0, 0.0, 1.0);
        vec2 q = p * 0.9 + vec2(uTime * 0.25, uTime * 0.11), q2 = p * 2.3 - vec2(uTime * 0.18, -uTime * 0.31);
        float h0 = bnoise(q) + 0.5 * bnoise(q2);
        vec2 gr = vec2(bnoise(q + vec2(e, 0.0)) + 0.5 * bnoise(q2 + vec2(e, 0.0)) - h0, bnoise(q + vec2(0.0, e)) + 0.5 * bnoise(q2 + vec2(0.0, e)) - h0) / e;
        vec3 N = normalize(vN + vec3(-gr.x, 0.0, -gr.y) * 0.18 * fd);
        vec3 V = normalize(cameraPosition - vW);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 col;
        float thick = vW.y - groundY(p);
        vec3 body = mix(mix(uSandC, uShallow, smoothstep(0.05, 1.2, thick)), uDeep, smoothstep(1.0, 9.0, thick)) * 0.32 * uSkyI;
        col = mix(body, duskSky(R), fres);
        float sp = pow(max(dot(R, uSun), 0.0), 380.0); col += uSunCol * sp * uSunI * 6.0 * fd;
        float fz = bfbm(p * vec2(0.55, 0.22) + vec2(uTime * 0.12, 0.0));
        float wash = smoothstep(0.1, 0.0, thick) * smoothstep(0.45, 0.75, fz + 0.2) + smoothstep(0.03, 0.0, thick) * 0.5;
        float brk = smoothstep(0.55, 0.95, vCrest) * smoothstep(3.5, 0.6, vDepth) * smoothstep(0.35, 0.7, fz);
        col = mix(col, vec3(0.82, 0.8, 0.77) * uSkyI, clamp(wash + brk, 0.0, 1.0) * 0.7);
        // the wind tears the surface into spume streaming west (+x, -z), long streaks along the wind
        vec2 wd = vec2(0.70711, -0.70711), wq = vec2(dot(p, wd), dot(p, vec2(-wd.y, wd.x)));
        float fw2 = max(fwidth(wq.x), fwidth(wq.y));
        float streak = bfbmAA(vec2(wq.x * 0.03 - uTime * 9.0, wq.y * 0.6), fw2 * 0.6);
        col = mix(col, vec3(0.86, 0.84, 0.8) * uSkyI, uSpume * clamp(0.55 + 0.9 * (streak - 0.5), 0.0, 1.0));
        // draining: foam streaks racing out to sea
        float out1 = bfbmAA(vec2(p.x * 0.05 - uTime * 3.0, p.y * 0.35), fw2 * 0.35);
        col = mix(col, vec3(0.7, 0.68, 0.62) * uSkyI, uFlow * smoothstep(0.55, 0.8, out1) * smoothstep(6.0, 0.5, thick) * 0.8);
        float fog = 1.0 - exp(-uFogD * uFogD * dist * dist);
        col = mix(col, uFogCol, fog);
        gl_FragColor = vec4(col, smoothstep(0.0, 0.06, thick));
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = -1;
  return { mesh: m, U };
}

// ---------------------------------------------------------------------------------------------------------------
// lines drawn in screen space (cables, suspenders): never thinner than 1.6 px (thinner ones fade instead of
// sparkling), deformed with the bridge deck (kind 0: cable, bends; 1: deck edge, bends and twists)
// ---------------------------------------------------------------------------------------------------------------
const DEFORM_GLSL = `
  uniform float uTwist, uBend, uBreak, uTime;
  vec3 deform(vec3 p, float s, float kind){
    float inMain = 1.0 - step(640.0, abs(s)), m = (s + 640.0) / 1280.0;
    float bend = uBend * sin(3.14159 * m) * inMain * sin(uTime * 1.1 + 1.0);
    float th = kind > 0.5 ? uTwist * sin(6.28318 * m) * inMain * sin(uTime * 1.7) : 0.0;
    vec2 r = vec2(p.x, p.y - 67.0); float c = cos(th), sn = sin(th); r = vec2(c * r.x - sn * r.y, sn * r.x + c * r.y);
    vec3 q = vec3(r.x + (kind > 0.5 ? 0.0 : 2.0 * bend * 0.3), r.y + 67.0 + bend * (kind > 0.5 ? 1.0 : 0.55), p.z);
    if (uBreak > 0.0 && abs(s) < 190.0 && kind > 0.5) {
      float tb = uBreak; q.y -= 0.5 * 9.81 * tb * tb; q.x += 3.0 * tb * tb; q.y += (abs(s) - 95.0) * 0.06 * tb * tb;
    }
    return q;
  }`;
function lineMesh(segs, widthM, color, { opacity = 1 } = {}) {
  // segs: [ax, ay, az, aKind, bx, by, bz, bKind, snap] in bridge-local metres (z = s along the axis)
  const n = segs.length, A = new Float32Array(n * 4 * 4), B = new Float32Array(n * 4 * 4), side = new Float32Array(n * 4 * 2), idx = [];
  segs.forEach((g, i) => {
    for (let k = 0; k < 4; k++) {
      const end = k < 2 ? 0 : 1, o = (i * 4 + k) * 4, a = end ? g.slice(4, 8) : g.slice(0, 4), b = end ? g.slice(0, 4) : g.slice(4, 8);
      A.set(a, o); B.set(b, o); side.set([k % 2 ? 1 : -1, g[8] || 0], (i * 4 + k) * 2);
    }
    const v = i * 4; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(A.filter((_, j) => j % 4 < 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(A, 4)); geo.setAttribute('aB', new THREE.BufferAttribute(B, 4)); geo.setAttribute('aSide', new THREE.BufferAttribute(side, 2)); geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTwist: S7.uTwist, uBend: S7.uBend, uBreak: S7.uBreak, uTime: S7.uTime, uCol: { value: new THREE.Color(color) }, uW: { value: widthM }, uRes: { value: new THREE.Vector2(1080, 1920) },
      uPx: { value: 1000 }, uOp: { value: opacity }, uFogC: S7.uFogC, uFogD: S7.uFogD, uSunCol: { value: new THREE.Color('#ffb070') }, uSun: { value: new THREE.Vector3(0.5, 0.06, -0.86) } },
    vertexShader: `${DEFORM_GLSL}
      attribute vec4 aA, aB; attribute vec2 aSide; uniform vec2 uRes; uniform float uW, uPx; varying float vA; varying float vD;
      void main(){
        vec3 a = deform(aA.xyz, aA.z, aA.w), b = deform(aB.xyz, aB.z, aB.w);
        vec4 ca = projectionMatrix * modelViewMatrix * vec4(a, 1.0), cb = projectionMatrix * modelViewMatrix * vec4(b, 1.0);
        vec2 sa = ca.xy / ca.w * uRes * 0.5, sb = cb.xy / cb.w * uRes * 0.5, d = normalize(sb - sa + 1e-5), nrm = vec2(-d.y, d.x);
        float px = uW * uPx / max(ca.w, 0.1), w = max(px, 1.6);
        vA = min(1.0, px / 1.6) * (1.0 - aSide.y * step(0.0, uBreak)); vD = ca.w;
        gl_Position = vec4((sa + nrm * aSide.x * w * 0.5) / (uRes * 0.5) * ca.w, ca.z, ca.w);
      }`,
    fragmentShader: `uniform vec3 uCol, uFogC; uniform float uOp, uFogD; varying float vA; varying float vD;
      void main(){ if (vA * uOp < 0.003) discard; float fog = 1.0 - exp(-uFogD * uFogD * vD * vD);
        gl_FragColor = vec4(mix(uCol, uFogC, fog), vA * uOp); }`,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 3;
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// the Golden Gate Bridge in International Orange: Art Deco towers 227 m above the water (legs stepping in at each portal
// strut, fluted panels), the stiffening truss under the roadway 67 m up, two main cables over the tower tops, suspenders
// every 15.2 m, concrete piers and anchorages, red aircraft lights. Local frame: z = s along the axis, x across
// ---------------------------------------------------------------------------------------------------------------
function flutes() {
  return canvasTex(64, 256, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 256); for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(i * 8 + 5, 0, 2, 256); } }, { repeat: true });
}
function truss() {
  return canvasTex(256, 64, (g) => {
    g.clearRect(0, 0, 256, 64); g.strokeStyle = '#ffffff'; g.lineWidth = 7;
    g.strokeRect(0, 3, 256, 58); g.beginPath(); for (const x of [0, 128, 256]) { g.moveTo(x, 0); g.lineTo(x, 64); }
    g.moveTo(0, 61); g.lineTo(128, 3); g.lineTo(256, 61); g.stroke();
  }, { repeat: true });
}
export function makeBridge() {
  const grp = new THREE.Group(); grp.position.set(MX, 0, MZ); grp.rotation.y = Math.PI / 4;
  const orange = new THREE.MeshStandardMaterial({ color: '#b5402e', roughness: 0.55, metalness: 0.25, map: flutes() });
  const concrete = new THREE.MeshStandardMaterial({ color: '#9d978c', roughness: 0.85 });
  const tg = [], cg = [];
  for (const s0 of [-640, 640]) {
    for (const q of [-13.7, 13.7]) {                                   // legs, stepping in at each strut
      const stages = [[-2, 92, 10, 17], [92, 135, 9, 14.5], [135, 175, 8, 12.5], [175, 205, 7.2, 11], [205, 227, 6.6, 10]];
      for (const [y0, y1, w, d] of stages) { const b = new THREE.BoxGeometry(w, y1 - y0, d); b.translate(q, (y0 + y1) / 2, s0); tg.push(b); }
      const cap = new THREE.BoxGeometry(7.4, 3, 7.4); cap.translate(q, 228.5, s0); tg.push(cap);
    }
    for (const [y, h] of [[28, 9], [92, 10], [135, 9], [175, 8], [215, 12]]) { const b = new THREE.BoxGeometry(27.4, h, 7.5); b.translate(0, y, s0); tg.push(b); }
    const pier = new THREE.BoxGeometry(46, 22, 30); pier.translate(0, -1, s0); cg.push(pier);
  }
  for (const s0 of [-983, 983]) { const an = new THREE.BoxGeometry(50, 45, 40); an.translate(0, 15, s0); cg.push(an); }
  for (let s = -1400; s <= 1300; s += 60) if (Math.abs(s) > 1000) { const gy = groundY(MX + BU.x * s, MZ + BU.z * s); if (gy < 60) { for (const q of [-9, 9]) { const p = new THREE.BoxGeometry(3, 63 - gy, 3); p.translate(q, (63 + gy) / 2, s); tg.push(p); } } }
  const towers = new THREE.Mesh(mergeGeometries(tg), orange); towers.castShadow = true; towers.receiveShadow = true; grp.add(towers);
  grp.add(new THREE.Mesh(mergeGeometries(cg), concrete));
  // the deck: segments 12 m long (each keeps its span coordinate so the twist and the break can move it)
  const dg = [];
  for (let s = -1400; s < 1300; s += 12) {
    const b = new THREE.BoxGeometry(27, 7.6, 12); b.translate(0, 67, s + 6);
    const n = b.attributes.position.count, sa = new Float32Array(n).fill(s + 6); b.setAttribute('aS', new THREE.BufferAttribute(sa, 1)); dg.push(b);
  }
  const deckM = new THREE.MeshStandardMaterial({ color: '#b5402e', roughness: 0.6, metalness: 0.25, map: truss(), alphaTest: 0.5, side: THREE.DoubleSide });
  const road = new THREE.MeshStandardMaterial({ color: '#2b2a29', roughness: 0.8 });
  const deform = (m) => { m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, { uTwist: S7.uTwist, uBend: S7.uBend, uBreak: S7.uBreak, uTime: S7.uTime });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nattribute float aS;\n${DEFORM_GLSL}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = deform(transformed, aS, 1.0);'); }; m.customProgramCacheKey = () => 'gg_deform_' + m.uuid; };
  deform(deckM); deform(road);
  const deck = new THREE.Mesh(mergeGeometries(dg), deckM); deck.castShadow = true; deck.frustumCulled = false; grp.add(deck);
  const rg = dg.map((b) => { const r = new THREE.BoxGeometry(25, 0.3, 12); r.translate(0, 70.6, b.attributes.aS.array[0]); r.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(r.attributes.position.count).fill(b.attributes.aS.array[0]), 1)); return r; });
  const roadway = new THREE.Mesh(mergeGeometries(rg), road); roadway.frustumCulled = false; grp.add(roadway);
  // main cables (parabolas) and suspenders
  const cableY = (s) => { const a = Math.abs(s); if (a <= 640) return 76 + 148 * (s / 640) ** 2; const t = (a - 640) / 343; return 224 + (32 - 224) * t - 8 * 4 * t * (1 - t); };
  const cs = [], ss = [];
  for (const q of [-13.7, 13.7]) {
    for (let s = -983; s < 983; s += 8) { const s2 = Math.min(s + 8, 983); cs.push([q, cableY(s), s, 0, q, cableY(s2), s2, 0, 0]); }
    for (let s = -975; s <= 975; s += 15.24) { if (Math.abs(Math.abs(s) - 640) < 6) continue; const top = cableY(s); if (top - 70.8 < 1.5) continue;
      ss.push([q, top, s, 0, q * 0.98, 70.8, s, 1, Math.abs(s) < 190 ? 1 : 0]); }
  }
  grp.add(lineMesh(cs, 0.92, '#b5402e'), lineMesh(ss, 0.18, '#a33a2a', { opacity: 0.9 }));
  // aircraft lights
  const red = new THREE.MeshStandardMaterial({ color: '#300', emissive: '#ff2a1a', emissiveIntensity: 6 });
  for (const s0 of [-640, 640]) for (const q of [-13.7, 13.7]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), red); l.position.set(q, 230.5, s0); grp.add(l); }
  const lines = grp.children.filter((c) => c.material && c.material.uniforms && c.material.uniforms.uPx);
  return { group: grp, lines };
}

// ---------------------------------------------------------------------------------------------------------------
// Sea Cliff's houses on the bluff behind the beach (white and cream stucco, tiled hip roofs); the roofs can tear off
// ---------------------------------------------------------------------------------------------------------------
export function makeHouses(seed = 4) {
  const r = rng(seed), list = [];
  for (let z = -430; z < 640; z += 17 + r() * 9) for (let row = 0; row < 2; row++) {
    const x = coastX(z) - (106 + row * 30 + r() * 10), w = 12 + r() * 6, d = 12 + r() * 5, h = 8 + r() * 4;
    list.push({ x, z, y: groundY(x, z), w, d, h, yaw: (r() - 0.5) * 0.15, tone: r(), roofT: r() });
  }
  const fac = canvasTex(512, 256, (g) => {
    g.fillStyle = '#e9e1d2'; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const x = 34 + i * 120, y = 40 + j * 110; g.fillStyle = '#3a3f47'; g.fillRect(x, y, 70, 70); g.fillStyle = 'rgba(255,214,160,0.35)'; g.fillRect(x + 4, y + 4, 30, 62); g.fillStyle = '#f7f3ea'; g.fillRect(x - 6, y + 70, 82, 6); }
  });
  const wallM = new THREE.MeshStandardMaterial({ map: fac, roughness: 0.8 }), roofM = new THREE.MeshStandardMaterial({ color: '#8a4a33', roughness: 0.75 });
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wallM, list.length);
  const rgeo = new THREE.ConeGeometry(0.71, 1, 4, 1); rgeo.rotateY(Math.PI / 4); rgeo.translate(0, 0.5, 0);
  const roofs = new THREE.InstancedMesh(rgeo, roofM, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((o, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw); m4.compose(new THREE.Vector3(o.x, o.y + o.h / 2, o.z), q, new THREE.Vector3(o.d, o.h, o.w)); walls.setMatrixAt(i, m4);
    walls.setColorAt(i, new THREE.Color().setHSL(0.09, 0.25, 0.82 + 0.12 * o.tone));
  });
  walls.castShadow = roofs.castShadow = true; walls.receiveShadow = roofs.receiveShadow = true;
  // roofs: in place until their moment, then lifted and flung west, tumbling (a pure function of time)
  function update(story, t0) {
    list.forEach((o, i) => {
      const tr = t0 + 0.3 + o.roofT * 7.0, k = story - tr;
      const p = new THREE.Vector3(o.x, o.y + o.h, o.z); let s = 1;
      e.set(0, o.yaw, 0);
      if (k > 0) { const dd = 0.5 * 70 * k * k; p.addScaledVector(BV, dd); p.y += 14 * k + 3 * k * k; e.set(k * 2.1, o.yaw + k * 1.3, k * 1.7); if (k > 3.5) s = 0; }
      q.setFromEuler(e); m4.compose(p, q, new THREE.Vector3(o.d * 1.08 * s, 4.2 * s, o.w * 1.08 * s)); roofs.setMatrixAt(i, m4);
    });
    roofs.instanceMatrix.needsUpdate = true;
  }
  update(0, 1e9);
  const g = new THREE.Group(); g.add(walls, roofs);
  return { group: g, update, list };
}

// ---------------------------------------------------------------------------------------------------------------
// props: a driftwood log, boulders, a sailboat, beached fish, a kite
// ---------------------------------------------------------------------------------------------------------------
export function makeLog(len = 6, rad = 0.42) {
  const bark = canvasTex(256, 512, (g) => { const r = rng(9); g.fillStyle = '#8c8173'; g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${60 + r() * 50},${52 + r() * 40},${44 + r() * 30},0.5)`; g.fillRect(r() * 256, r() * 512, 2 + r() * 6, 40 + r() * 160); } }, { repeat: true });
  const m = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.92 });
  const g = new THREE.CylinderGeometry(rad * 0.9, rad, len, 24, 8); g.rotateX(Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), a = Math.atan2(p.getY(i), p.getX(i)); const k = 1 + 0.06 * Math.sin(a * 5 + z * 1.3) + 0.04 * Math.sin(z * 3.1); p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * k); }
  g.computeVertexNormals();
  const log = new THREE.Mesh(g, m); log.castShadow = true; log.receiveShadow = true;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.5, 16, 12), m); knot.scale.set(1, 1.1, 0.6); knot.position.z = len / 2; log.add(knot);
  return log;
}
export function makeRocks(list, seed = 6) {
  const r = rng(seed), geo = new THREE.IcosahedronGeometry(1, 3), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), k = 0.75 + 0.45 * fbm7(v.x * 1.7 + 3, v.z * 1.7 + v.y, 11); p.setXYZ(i, v.x * k, v.y * k * 0.7, v.z * k); }
  geo.computeVertexNormals();
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#4d4b45', roughness: 0.9 }), list.length), m4 = new THREE.Matrix4();
  list.forEach(([x, z, s], i) => { m4.compose(new THREE.Vector3(x, groundY(x, z) - s * 0.25, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r() * 6, r())), new THREE.Vector3(s, s, s * (0.8 + 0.4 * r()))); im.setMatrixAt(i, m4); });
  im.castShadow = true; im.receiveShadow = true; return im;
}
export function makeBoat() {
  const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: '#eceae4', roughness: 0.5 });
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), white); hull.scale.set(1.4, 1.1, 5); g.add(hull);
  const deckm = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshStandardMaterial({ color: '#b9a68a', roughness: 0.8 })); deckm.rotation.x = -Math.PI / 2; deckm.scale.set(1.35, 4.9, 1); deckm.position.y = 0.01; g.add(deckm);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 12, 8), new THREE.MeshStandardMaterial({ color: '#c9c9c9', metalness: 0.7, roughness: 0.3 })); mast.position.set(0, 6, 0.6); g.add(mast);
  const sh = new THREE.Shape(); sh.moveTo(0, 0.6); sh.lineTo(0, 11.5); sh.lineTo(-3.6, 0.6); sh.lineTo(0, 0.6);
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.7, side: THREE.DoubleSide })); sail.rotation.y = Math.PI / 2; sail.position.z = 0.7; g.add(sail);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
export function makeFish(n, seed = 8) {
  const r = rng(seed), mat = new THREE.MeshStandardMaterial({ color: '#b8c0c4', metalness: 0.6, roughness: 0.3 }), fish = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat); body.scale.set(0.035, 0.07, 0.2); g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.09, 4), mat); tail.rotation.x = Math.PI / 2; tail.scale.set(0.3, 1, 1); tail.position.z = -0.23; g.add(tail);
    g.userData = { ph: r() * 6.28, f: 2.5 + r() * 2.5, yaw: r() * 6.28 }; fish.push(g);
  }
  return fish;
}
export function makeKite() {
  const t = canvasTex(128, 128, (g) => { g.fillStyle = '#e2312b'; g.beginPath(); g.moveTo(64, 0); g.lineTo(128, 50); g.lineTo(64, 128); g.lineTo(0, 50); g.fill(); g.fillStyle = '#f5f0e6'; g.beginPath(); g.moveTo(64, 0); g.lineTo(128, 50); g.lineTo(64, 50); g.fill(); g.beginPath(); g.moveTo(64, 50); g.lineTo(0, 50); g.lineTo(64, 128); g.fill(); });
  const k = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 }));
  return k;
}

// ---------------------------------------------------------------------------------------------------------------
// the tsunami: a wall of water along the coast (z), travelling toward -x, its face rising to the crest and a lip that
// curls forward; backlit turquoise where it is thin, foam running down the face, whitewater at the lip and the base.
// uFront: x of the face's base; uH: height; the trough in front sits at the drained sea level (uLevel)
// ---------------------------------------------------------------------------------------------------------------
export function makeTsunami(sky) {
  // the profile (units of H): a = distance ahead of the crest (toward the shore), b = height; t = thinness
  const CP = [[-6.0, 0.0], [-2.6, 0.32], [-1.0, 0.8], [0.0, 1.0], [0.34, 0.95], [0.5, 0.74], [0.36, 0.6], [0.16, 0.62], [0.06, 0.34], [0.1, 0.0]];
  const prof = [];
  for (let i = 0; i < CP.length - 1; i++) {
    const p0 = CP[Math.max(0, i - 1)], p1 = CP[i], p2 = CP[i + 1], p3 = CP[Math.min(CP.length - 1, i + 2)];
    for (let k = 0; k < 10; k++) { const t = k / 10, t2 = t * t, t3 = t2 * t;
      const f = (j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      prof.push([f(0), f(1), i + t]); }
  }
  prof.push([...CP[CP.length - 1], CP.length - 1]);
  const NU = 260, NV = prof.length, pos = new Float32Array(NU * NV * 3), prm = new Float32Array(NU * NV * 4), idx = [];
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const u = i / (NU - 1), z = -5000 + 12000 * Math.pow(u, 1.0), [a, b, c] = prof[j], k = (i * NV + j);
    const jn = Math.min(NV - 1, j + 1), jp = Math.max(0, j - 1), ta = prof[jn][0] - prof[jp][0], tb = prof[jn][1] - prof[jp][1], tl = Math.hypot(ta, tb) || 1;
    pos.set([a, b, z], k * 3); prm.set([-tb / tl, ta / tl, c / (CP.length - 1), 0], k * 4);   // 2D normal (in a, b), position along the profile
  }
  for (let i = 0; i < NU - 1; i++) for (let j = 0; j < NV - 1; j++) { const a = i * NV + j, b = a + 1, c = a + NV, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aP', new THREE.BufferAttribute(prm, 4)); g.setIndex(idx);
  const U = { ...sky.material.uniforms, uTime: S7.uTime, uLevel: S7.uLevel, uFront: { value: 6000 }, uH: { value: 100 }, uFogC: S7.uFogC, uFogD: S7.uFogD };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.DoubleSide,
    vertexShader: `uniform float uFront, uH, uLevel, uTime; attribute vec4 aP; varying vec3 vW; varying vec3 vN; varying float vT; varying float vZ; varying float vB;
      void main(){
        float z = position.z, wob = 1.0 + 0.08 * sin(z * 0.0021 + 1.3) + 0.05 * sin(z * 0.0057 + uTime * 0.3);
        float ends = smoothstep(-5000.0, -2500.0, z) * smoothstep(7000.0, 4000.0, z);
        float H = uH * wob * mix(0.25, 1.0, ends), curl = 0.85 + 0.15 * sin(z * 0.004 + uTime * 0.5);
        float a = position.x * (position.x > 0.0 ? curl : 1.0), b = position.y;
        float base = mix(0.0, uLevel, smoothstep(-0.2, 0.3, a) * step(0.8, aP.z));      // the front stands on the drained seabed
        vec3 w = vec3(uFront - a * H, b * H + base * (1.0 - b), z);
        vW = w; vN = normalize(vec3(-aP.x, aP.y, 0.0)); vT = aP.z; vZ = z; vB = b;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: `${NOISE_GLSL}${SKY_GLSL}
      uniform float uTime, uFogD; uniform vec3 uFogC; varying vec3 vW; varying vec3 vN; varying float vT; varying float vZ; varying float vB;
      void main(){
        vec3 V = normalize(cameraPosition - vW), N = normalize(gl_FrontFacing ? vN : -vN);
        float fres = 0.03 + 0.97 * pow(1.0 - abs(dot(N, V)), 5.0);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 body = vec3(0.015, 0.075, 0.085) * uSkyI;
        float thin = smoothstep(0.3, 0.45, vT) * (1.0 - smoothstep(0.62, 0.75, vT));      // the crest and the lip: thin, lit through
        float back = pow(max(dot(-V, uSun), 0.0), 2.0);
        vec3 glow = vec3(0.08, 0.55, 0.5) * thin * (0.35 + 1.4 * back) * uSkyI;
        vec3 col = mix(body + glow, duskSky(R), fres * 0.8);
        float fwz = fwidth(vZ) * 0.02 + 0.002;
        float run = bfbmAA(vec2(vZ * 0.09, vB * 3.5 + uTime * 0.35), fwz * 4.5);   // vertical streaks running down the face               // foam streaks running down the face
        float face = smoothstep(0.55, 0.9, vT);
        float foam = face * smoothstep(0.52, 0.7, run) * 0.7 + smoothstep(0.42, 0.5, vT) * smoothstep(0.62, 0.55, vT) * smoothstep(0.35, 0.6, run)
          + smoothstep(0.93, 1.0, vT) * 0.9 + smoothstep(0.1, 0.0, vB) * smoothstep(0.8, 0.9, vT);
        col = mix(col, vec3(0.86, 0.88, 0.86) * uSkyI * (0.8 + 0.4 * back), clamp(foam, 0.0, 1.0));
        float dist = length(vW - cameraPosition), fog = 1.0 - exp(-uFogD * uFogD * dist * dist);
        gl_FragColor = vec4(mix(col, uFogC, fog), 1.0);
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false;
  return { mesh: m, U };
}
