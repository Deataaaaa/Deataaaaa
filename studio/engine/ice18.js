// Post 12's ice and its melt. The premise: every piece of ice on Earth turns to water within 5 seconds. Here the melt
// eats into all ice at once from its surface, at a depth that grows exponentially, so the thinnest ice goes first:
// meltD(tau) = 0.03 m * e^(3 (tau - 1)) after tau seconds: 1.5 mm at the start, 3 cm after 1 s (the ice in a drink),
// 2.7 m after 2.5 s (the blocks on the beach), 240 m after 4 s (icebergs, the glacier's front), 4.9 km at 5 s
// (the thickest ice in Antarctica). Each piece shrinks toward its contact point (k = 1 - d / its half-thickness),
// slumps a little and gets glossier as it goes; its meltwater spreads round it as a puddle that drains to the sea.
// Also: the beach blocks and the lagoon's icebergs (instanced convex shards), and the meltwater flood (a wall of water
// rushing south from the glacier, with the torrent behind it).
import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';
import { SIMPLEX } from './fx.js';
import { NOISE_GLSL } from './guarapari.js';
import { IU, BASE_GLSL, SKY_GLSL, baseY, groundY, coastX, riverZ, lagoonIn, sst } from './iceland.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const meltD = (tau) => (tau <= 0 ? 0 : Math.max(0, 0.03 * Math.exp(3 * (Math.min(tau, 5.2) - 1)) - 0.0015));
export const goneAt = (r) => 1 + Math.log((r + 0.0015) / 0.03) / 3;          // tau at which ice of half-thickness r is gone
export const MU = { uD: { value: 0 }, uTau: { value: -1 } };                  // melting depth (m), story seconds since the start

// a convex shard: the intersection of random half-spaces round the unit sphere (flat faces, sharp edges), slightly
// rounded; `flat` squashes it (blocks lying on the sand), `tall` makes iceberg-like walls
export function shardGeo(seed, { detail = 3, planes = 14, flat = 0.75, round = 0.05 } = {}) {
  const r = rng(seed), P = [];
  for (let i = 0; i < planes; i++) { const u = r() * 2 - 1, th = r() * 6.283, s = Math.sqrt(1 - u * u); P.push([V(s * Math.cos(th), u, s * Math.sin(th)), 0.55 + 0.45 * r()]); }
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, detail).deleteAttribute('normal').deleteAttribute('uv'));
  const p = g.attributes.position, v = V(0, 0, 0);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let rad = 1.0; for (const [n, d] of P) { const c = v.dot(n); if (c > 1e-3) rad = Math.min(rad, d / c); }
    rad = rad * (1 - round) + round * 0.75;
    p.setXYZ(i, v.x * rad, v.y * rad * flat, v.z * rad);
  }
  // sea-polished: smooth faces, crisp edges where the cuts meet (normals creased above 34 degrees)
  const ng = toCreasedNormals(g, THREE.MathUtils.degToRad(34)); ng.computeBoundingSphere();
  return ng;
}

// the ice material: clear glassy ice (dark over the black sand, brilliant edges, bubbles inside) or milky blue-white
// ice, light glowing through it when the low sun is behind; the melt in the vertex stage (shared by the shadow pass)
const MELT_VS = (inst) => `
  ${inst ? 'attribute vec4 aIce; attribute vec3 aBaseO; attribute vec3 aUpO;' : 'uniform vec4 aIce; uniform vec3 aBaseO; uniform vec3 aUpO;'}
  uniform float uD;
  varying vec4 vIce; varying vec3 vObj; varying float vK; varying vec3 vWp; varying vec3 vWn;
  vec3 meltIt(vec3 p){
    float k = clamp(1.0 - uD / max(aIce.x, 1e-4), 0.0, 1.0);
    vec3 rel = p - aBaseO; float h = dot(rel, aUpO);
    rel -= aUpO * h * (1.0 - k) * 0.3;                            // slumps
    rel += (rel - aUpO * dot(rel, aUpO)) * (1.0 - k) * 0.12;       // and spreads a little
    vK = k; return aBaseO + rel * (k < 0.003 ? 0.0 : k);
  }`;
export function iceMaterial({ inst = true, key = 'ice18shard', single = null } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 0, envMapIntensity: 2.3 });
  const U = { uD: MU.uD, uSun: IU.uSun, uSkyI: IU.uSkyI, uT: IU.uT };
  if (!inst) Object.assign(U, { aIce: { value: single.aIce }, aBaseO: { value: single.aBaseO }, aUpO: { value: single.aUpO } });
  m.userData.U = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${MELT_VS(inst)}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvIce = aIce; vObj = position; transformed = meltIt(transformed);')
      .replace('#include <project_vertex>', `#include <project_vertex>
      { mat4 im4 = modelMatrix;
        #ifdef USE_INSTANCING
        im4 = modelMatrix * instanceMatrix;
        #endif
        vWp = (im4 * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(im4) * objectNormal); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      ${SIMPLEX}
      uniform vec3 uSun; uniform float uSkyI, uD, uT; varying vec4 vIce; varying vec3 vObj; varying float vK; varying vec3 vWp; varying vec3 vWn;
      float gR; float gClear;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        float typ = vIce.y, seed = vIce.z, band = vIce.w;           // 0 = clear, 1 = milky; band: the ash layers of the bergs
        vec3 q = vObj * 2.3 + seed * 17.0;
        float n = fbm3(q, 3), n2 = fbm3(q * 3.1 + 5.0, 2);
        gClear = clamp(1.0 - typ + 0.25 * (n - 0.1), 0.0, 1.0);
        vec3 clearC = vec3(0.012, 0.026, 0.036) * (0.8 + 0.5 * n2);
        vec3 milky = mix(vec3(0.55, 0.72, 0.84), vec3(0.82, 0.88, 0.92), smoothstep(-0.3, 0.5, n)) * (0.9 + 0.15 * n2);
        vec3 col = mix(milky, clearC, gClear);
        // trapped bubbles and cracks, brighter inside the clear ice
        // the bergs' black ash layers (from eruptions under the ice, centuries ago)
        float ash = smoothstep(0.82, 0.95, sin(vObj.y * 9.0 + n * 2.5 + seed * 5.0)) * band;
        col = mix(col, vec3(0.05, 0.045, 0.045), ash * 0.85);
        gR = mix(mix(0.22, 0.035, gClear), 0.025, 1.0 - vK);            // polished; glossier still as it melts
        diffuseColor.rgb = col;
      }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gR;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        // light through the ice: only when the low sun is behind it (looking toward the sun); blue-green through the
        // milky ice, white-gold through the clear; a faint cool rim
        vec3 Vd = normalize(vViewPosition), Ls = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
        float back = pow(max(dot(-Vd, Ls), 0.0), 4.0);
        float rim = pow(1.0 - abs(dot(normalize(normal), Vd)), 4.0);
        vec3 tcol = mix(vec3(0.15, 0.42, 0.55), vec3(1.0, 0.72, 0.45), gClear);
        totalEmissiveRadiance += (tcol * back * (0.5 + 0.5 * gClear) * 0.35 + vec3(0.42, 0.62, 0.75) * rim * (0.06 + 0.55 * gClear)) * uSkyI * (1.0 - 0.6 * vIce.w);
        { float NdL0 = dot(normalize(vWn), uSun); totalEmissiveRadiance += vec3(0.08, 0.2, 0.32) * (1.0 - gClear) * smoothstep(0.2, -0.4, NdL0) * 0.35 * uSkyI; }   // blue in the milky ice's shade
        // bubble veils and cracks seen inside the clear ice (sampled a little way in along the view ray: they shift with
        // the angle like real depth), lit warm where the sun gets in, cool elsewhere
        vec3 Vw = normalize(cameraPosition - vWp); float sc = 1.0 / max(vIce.x, 0.04);
        vec3 pin = vWp - Vw * 0.45 * vIce.x;
        float veil = smoothstep(0.1, 0.75, fbm3(pin * 1.6 * sc + vIce.z * 9.0, 3)) * smoothstep(-0.2, 0.4, fbm3(pin * 0.7 * sc + 2.0, 2));
        float bub = smoothstep(0.35, 0.8, fbm3(pin * 5.0 * sc + vIce.z * 5.0 + 3.0, 2));
        float NdL = max(dot(normalize(vWn), uSun), 0.0);
        vec3 inner = (veil * 0.3 + bub * 0.22) * gClear * (vec3(0.9, 0.85, 0.8) * (0.05 + 0.35 * NdL) + vec3(0.3, 0.45, 0.58) * 0.12);
        totalEmissiveRadiance += inner * uSkyI * (1.0 - 0.5 * vIce.w);
      }`);
  };
  m.customProgramCacheKey = () => key;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${MELT_VS(inst)}`).replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = meltIt(transformed);'); };
  depth.customProgramCacheKey = () => key + 'D';
  return { mat: m, depth };
}

// a field of shards (instanced, several base shapes); list items: { x, z, y (contact height), s (size, m), typ, band,
// yaw, tilt, flat }. Each gets its contact point and up vector in object space, and its half-thickness.
export function makeShards(list, { seed = 3, variants = 8, detail = 3, flatK = 0.72, key = 'ice18shard', planes = 14, tall = 0 } = {}) {
  const r = rng(seed), group = new THREE.Group(), info = [];
  const geos = []; for (let v = 0; v < variants; v++) geos.push(shardGeo(seed * 31 + v * 7, { detail, planes: planes + 6 + (v % 3) * 4, flat: tall ? 1.0 : flatK, round: tall ? 0.01 : 0.02 + 0.02 * (v % 2) }));
  const { mat, depth } = iceMaterial({ key });
  const byV = Array.from({ length: variants }, () => []);
  list.forEach((it, i) => byV[i % variants].push(it));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = V(1, 1, 1), up = V(0, 1, 0), tmp = V(0, 0, 0);
  byV.forEach((items, vi) => {
    if (!items.length) return;
    const g = geos[vi], n = items.length, aIce = new Float32Array(n * 4), aBase = new Float32Array(n * 3), aUp = new Float32Array(n * 3);
    const im = new THREE.InstancedMesh(g, mat, n); im.customDepthMaterial = depth; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    const pos = g.attributes.position;
    items.forEach((it, k) => {
      e.set(it.tilt ?? (r() - 0.5) * 0.5, it.yaw ?? r() * 6.283, (r() - 0.5) * 0.5, 'YXZ'); q.setFromEuler(e);
      const sy = it.s * (it.hy ?? 1); sc.set(it.s, sy, it.s * (0.75 + 0.5 * r()));
      // the lowest point after rotation and scale: the contact point; sink it a little into the sand / water
      let lo = 1e9, li = 0; for (let j = 0; j < pos.count; j++) { tmp.fromBufferAttribute(pos, j).multiply(sc).applyQuaternion(q); if (tmp.y < lo) { lo = tmp.y; li = j; } }
      const sink = it.sink ?? 0.12;
      m4.compose(V(it.x, it.y - lo - sink * it.s * (it.hy ?? 1), it.z), q, sc); im.setMatrixAt(k, m4);
      // object-space contact point and up vector
      const base = V(0, 0, 0).fromBufferAttribute(pos, li);
      if (it.floatY !== undefined) { base.set(0, 0, 0); }
      const upO = up.clone().applyQuaternion(q.clone().invert()).divide(sc).normalize();
      const half = it.half ?? it.s * Math.min(1, (it.hy ?? 1), 0.75) * 0.55;
      aIce.set([half, it.typ ?? 0, it.seed ?? r(), it.band ?? 0], k * 4); aBase.set([base.x, base.y, base.z], k * 3); aUp.set([upO.x, upO.y, upO.z], k * 3);
      info.push({ ...it, half, matrix: m4.clone() });
    });
    g.setAttribute('aIce', new THREE.InstancedBufferAttribute(aIce, 4));
    g.setAttribute('aBaseO', new THREE.InstancedBufferAttribute(aBase, 3));
    g.setAttribute('aUpO', new THREE.InstancedBufferAttribute(aUp, 3));
    im.instanceMatrix.needsUpdate = true; group.add(im);
  });
  return { group, info, mat };
}

// the blocks washed up on Diamond Beach: thousands of years old, broken off the glacier, out to sea and back
export function beachIceList(seed = 7, hero) {
  const r = rng(seed), list = [];
  const add = (x, z, s, typ) => { const y = groundY(x, z); if (y < -0.4) return; list.push({ x, z, y, s, typ, seed: r() }); };
  // dense along the swash, thinning up the beach; a cluster round the hero; a few big ones
  for (let i = 0; i < 900; i++) {
    const z = -900 + 2300 * r(); if (Math.abs(z - riverZ(0)) < 70) continue;
    const up = Math.pow(r(), 1.7) * 62 - 4, x = coastX(z) + up;
    const s = Math.exp(Math.log(0.12) + (Math.log(1.6) - Math.log(0.12)) * Math.pow(r(), 1.8)) * (up > 25 ? 0.7 : 1);
    add(x, z, s, r() < 0.62 ? r() * 0.3 : 0.6 + 0.4 * r());
  }
  for (let i = 0; i < 140; i++) { const a = r() * 6.283, d = 2.2 + 26 * Math.pow(r(), 1.3), x = hero.x + Math.cos(a) * d * 0.8, z = hero.z + Math.sin(a) * d;
    if (Math.hypot(x - hero.x, z - hero.z) < 2.0) continue; add(x, z, 0.1 + 0.7 * Math.pow(r(), 2.2), r() < 0.6 ? r() * 0.3 : 0.7); }
  for (let i = 0; i < 22; i++) { const z = -600 + 1700 * r(); if (Math.abs(z - riverZ(0)) < 80) continue; add(coastX(z) + 2 + 18 * r(), z, 1.6 + 1.6 * r(), r() < 0.5 ? 0.15 : 0.8); }
  return list;
}

// the lagoon's icebergs: blocky, flat-topped or pinnacled, white-blue, some with black ash bands, a few dark-blue
// capsized ones; [x, z, length, height above water]
export function bergList(seed = 11) {
  const r = rng(seed), list = [];
  for (let i = 0; i < 70; i++) {
    let x = 0, z = 0, ok = false; for (let k = 0; k < 20 && !ok; k++) { x = 650 + 3200 * Math.pow(r(), 0.8); z = -2300 + 4100 * r(); ok = lagoonIn(x, z) > 60; }
    if (!ok) continue;
    const near = sst(3800, 2200, x), L = (8 + 55 * Math.pow(r(), 1.6)) * (0.7 + 0.6 * near), hgt = L * (0.18 + 0.3 * r());
    list.push({ x, z, y: 0.12, floatY: 0.12, s: L, hy: hgt / L, typ: r() < 0.2 ? 0.0 : 0.75 + 0.25 * r(), band: r() < 0.35 ? 1 : 0, sink: 1.0, half: 100 + 45 * r(), seed: r(), yaw: r() * 6.283, tilt: (r() - 0.5) * 0.15 });
  }
  return list;
}

// meltwater puddles round the beach blocks: grow while the block melts, then drain toward the sea
export function makePuddles(info) {
  const n = info.length, g = new THREE.CircleGeometry(1, 28); g.rotateX(-Math.PI / 2);
  const a = new Float32Array(n * 4), b = new Float32Array(n * 2);
  info.forEach((it, i) => { a.set([it.x, groundY(it.x, it.z) + 0.03, it.z, it.half], i * 4); b.set([it.s, it.seed ?? 0.5], i * 2); });
  g.setAttribute('aP', new THREE.InstancedBufferAttribute(a, 4)); g.setAttribute('aS', new THREE.InstancedBufferAttribute(b, 2));
  const m = new THREE.MeshStandardMaterial({ color: '#0b0d0f', roughness: 0.04, metalness: 0, transparent: true, depthWrite: false });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uD: MU.uD, uTau: MU.uTau });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec4 aP; attribute vec2 aS; uniform float uD, uTau; varying float vA; varying vec2 vLoc; varying float aSvV;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      float k = clamp(1.0 - uD / max(aP.w, 1e-4), 0.0, 1.0);
      float gone = 1.0 + log((aP.w + 0.0015) / 0.03) / 3.0, age = uTau - gone;
      float grow = (1.0 - k), R = aS.x * (0.45 + 1.4 * grow + 0.5 * max(age, 0.0));
      vA = smoothstep(0.0, 0.25, grow) * (1.0 - smoothstep(0.5, 2.6, age)) * step(-90.0, uTau);
      vLoc = position.xz; aSvV = aS.y * 6.28;
      transformed = vec3(position.x * R * 0.8 + aP.x - max(age, 0.0) * 1.8 - grow * R * 0.4, aP.y + 0.012 * aS.y, position.z * R + aP.z);
      `)
      .replace('#include <project_vertex>', `vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vA; varying vec2 vLoc; varying float aSvV;\n#define aSv aSvV')
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a = vA * smoothstep(1.0, 0.45, length(vLoc) * (0.85 + 0.3 * sin(atan(vLoc.y, vLoc.x) * 3.0 + aSv))) * 0.7;');
  };
  m.customProgramCacheKey = () => 'ice18puddle';
  const mesh = new THREE.InstancedMesh(g, m, n); mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.receiveShadow = true;
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, new THREE.Matrix4());
  return mesh;
}

// ---------------------------------------------------------------------------------------------------------------
// the flood: a wall of silty meltwater sweeping south from the glacier (front at x = uFront, height uH, its base at
// uBase), the torrent behind it (a sheet at ~0.62 uH above the base, rising inland), foam lace, whitewater crest
// ---------------------------------------------------------------------------------------------------------------
export function makeFlood() {
  const CP = [[-7.0, 0.62, 0.3, 0, 0], [-3.4, 0.68, 0.35, 0, 0], [-1.6, 0.8, 0.45, 0, 0], [-0.6, 0.95, 0.6, 0.15, 0], [-0.1, 1.0, 0.95, 0.45, 0],
    [0.12, 1.0, 1, 0.8, 1], [0.3, 0.96, 1, 1, 1], [0.42, 0.86, 0.95, 1, 1], [0.44, 0.76, 0.8, 0.5, 1], [0.38, 0.7, 0.55, 0.25, 1],
    [0.28, 0.66, 0.35, 0.1, 1], [0.2, 0.5, 0.2, 0.08, 1], [0.15, 0.3, 0.3, 0, 1], [0.16, 0.12, 0.65, 0, 1], [0.26, 0.0, 1, 0, 1]];
  const prof = [];
  for (let i = 0; i < CP.length - 1; i++) {
    const p0 = CP[Math.max(0, i - 1)], p1 = CP[i], p2 = CP[i + 1], p3 = CP[Math.min(CP.length - 1, i + 2)];
    for (let k = 0; k < 10; k++) { const t = k / 10, t2 = t * t, t3 = t2 * t;
      const f = (j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      prof.push([f(0), f(1), f(2), f(3), Math.min(1, Math.max(0, f(4)))]); }
  }
  prof.push(CP[CP.length - 1]);
  const Z0 = -7500, Z1 = 6500, NU = 700, NV = prof.length, pos = new Float32Array(NU * NV * 3), prm = new Float32Array(NU * NV * 4), q = new Float32Array(NU * NV * 3), idx = [];
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const z = Z0 + (Z1 - Z0) * i / (NU - 1), [a, b, fo, th, fa] = prof[j], k = (i * NV + j);
    const jn = Math.min(NV - 1, j + 1), jp = Math.max(0, j - 1), ta = prof[jn][0] - prof[jp][0], tb = prof[jn][1] - prof[jp][1], tl = Math.hypot(ta, tb) || 1;
    pos.set([a, b, z], k * 3); prm.set([-tb / tl, ta / tl, j / (NV - 1), 0], k * 4); q.set([fo, th, fa], k * 3);
  }
  for (let i = 0; i < NU - 1; i++) for (let j = 0; j < NV - 1; j++) { const a = i * NV + j, b = a + 1, c = a + NV, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aP', new THREE.BufferAttribute(prm, 4));
  g.setAttribute('aQ', new THREE.BufferAttribute(q, 3)); g.setIndex(idx);
  const U = { uT: IU.uT, uSun: IU.uSun, uSkyI: IU.uSkyI, uFront: { value: 4000 }, uH: { value: 50 }, uBase: { value: -3 }, uFogC: IU.uFogC, uFogD: IU.uFogD, uA: { value: 1 } };
  const SHAPE = `
    float wobW(float z, float t){ return (1.0 + 0.08 * sin(z * 0.0019 + 1.3) + 0.05 * sin(z * 0.0057 + t * 0.3)) * mix(0.25, 1.0, smoothstep(-7500.0, -5200.0, z) * smoothstep(6500.0, 4300.0, z)); }
    float curlW(float z, float t){ return 0.86 + 0.14 * sin(z * 0.0033 + t * 0.5) + 0.05 * sin(z * 0.013 + 2.0); }
    float lagF(float z){ return 160.0 * sin(z * 0.0013 + 0.4) + 70.0 * sin(z * 0.0041 + 1.9); }`;
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.DoubleSide, transparent: true,
    vertexShader: `${NOISE_GLSL}${SHAPE}
      uniform float uFront, uH, uBase, uT; attribute vec4 aP; attribute vec3 aQ; varying vec3 vW; varying vec3 vN; varying float vZ; varying float vBH; varying vec3 vQ;
      void main(){
        float z = position.z, H = uH * wobW(z, uT);
        float a = position.x * (position.x > 0.0 ? curlW(z, uT) : 1.0), b = position.y;
        b += aQ.x * aQ.z * 0.04 * (bfbm(vec2(z * 0.004, uT * 0.15)) - 0.47) * 2.0 * smoothstep(0.6, 0.9, b);
        // lumps of churning water bulging out of the face, rolling up and over
        float lump = bfbm(vec2(z * 0.012, b * 3.0 - uT * 0.35)) - 0.5 + 0.5 * (bfbm(vec2(z * 0.035 + 7.0, b * 8.0 - uT * 0.9)) - 0.5);
        a += lump * 0.34 * aQ.z * smoothstep(0.02, 0.2, b) * (1.0 - smoothstep(0.8, 1.0, b));
        vec3 w = vec3(uFront + lagF(z) - a * H, uBase + b * H, z);
        vW = w; vN = normalize(vec3(-aP.x, aP.y, 0.0)); vZ = z; vBH = b * H; vQ = aQ;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: `${NOISE_GLSL}${SIMPLEX}${SKY_GLSL}
      uniform float uFogD, uH, uA; uniform vec3 uFogC; varying vec3 vW; varying vec3 vN; varying float vZ; varying float vBH; varying vec3 vQ;
      float lacy(vec2 p, float fw, float w){
        float n = bnoise(p) * 0.6 + bnoise(p * 2.13 + 3.7) * 0.4, r = abs(2.0 * n - 1.0), e = fwidth(r) + 0.004;
        return mix(1.0 - smoothstep(w - e, w + e, r), 2.6 * w, smoothstep(0.15, 0.45, fw * 2.13));
      }
      void main(){
        float foamW = clamp(vQ.x, 0.0, 1.0), thin = clamp(vQ.y, 0.0, 1.0), hb = vBH / uH;
        vec3 Vd = normalize(cameraPosition - vW), N = normalize(gl_FrontFacing ? vN : -vN);
        float fz = fwidth(vZ) + 0.01, fh = fwidth(vBH) + 0.01;
        float n1 = bfbmAA(vec2(vZ * 0.012, vBH * 0.012 - uT * 0.25), max(fz * 0.012, fh * 0.012));
        float n2 = bfbmAA(vec2(vZ * 0.04, vBH * 0.035 - uT * 0.7) + 7.3, max(fz * 0.04, fh * 0.035));
        float n3 = bfbmAA(vec2(vZ * 0.11, vBH * 0.1 - uT * 1.5) + 2.1, max(fz * 0.11, fh * 0.1));
        N = normalize(N + vec3(0.0, (n1 - 0.5) * 0.6, (n2 - 0.5) * 0.7));
        float fres = 0.02 + 0.98 * pow(max(1.0 - abs(dot(N, Vd)), 0.0), 5.0);
        vec3 R = reflect(-Vd, N); R.y = abs(R.y) + 0.01;
        float sunF = clamp(0.35 + 0.65 * dot(N, uSun), 0.0, 1.0);
        vec3 silt = vec3(0.17, 0.125, 0.07), dark = vec3(0.06, 0.048, 0.032);
        vec3 body = mix(silt, dark, smoothstep(0.05, 0.6, hb)) * (0.5 + 0.9 * n1) * (0.55 + 0.9 * sunF) * uSkyI;
        vec3 col = mix(body, iceSky(R, 0.0) * 0.5, fres * 0.3);
        col += vec3(1.0, 0.62, 0.32) * pow(max(dot(R, uSun), 0.0), 24.0) * 0.5 * uSkyI;
        float stri = bfbmAA(vec2(vZ * 0.06, vBH * 0.004 - uT * 0.35) + 1.7, max(fz * 0.06, fh * 0.004));       // water sheeting down the face
        float blob = bfbmAA(vec2(vZ * 0.035, vBH * 0.035 - uT * 0.8) + 4.4, max(fz * 0.035, fh * 0.035));
        float fine = bfbmAA(vec2(vZ * 0.22, vBH * 0.22 - uT * 2.2) + 8.1, max(fz * 0.22, fh * 0.22));
        float billow = smoothstep(0.56, 0.74, blob + 0.3 * (foamW - 0.4) + 0.15 * (fine - 0.5));
        float cover = smoothstep(0.5, 0.85, foamW * (0.45 + 0.8 * n1) + 0.3 * (n2 - 0.5));
        float foam = clamp(max(billow * (0.55 + 0.45 * fine), cover), 0.0, 1.0);
        col *= 0.5 + 1.0 * stri;
        col = mix(col, vec3(0.06, 0.045, 0.03) * uSkyI, 0.5 * (1.0 - smoothstep(0.0, 0.35, hb)));               // the dark churning toe
        col *= mix(1.0, 0.45, smoothstep(0.55, 0.75, hb) * (1.0 - smoothstep(0.75, 0.86, hb)) * (1.0 - vQ.z * 0.0));   // in the shadow of the lip
        vec3 fcol = mix(vec3(0.55, 0.52, 0.48), vec3(1.0, 0.86, 0.7) * 1.15, sunF) * uSkyI;
        fcol *= mix(0.8 + 0.3 * n2, 0.5 + 0.75 * n3, cover);
        col = mix(col, fcol, foam * 0.92);
        col = mix(col, uFogC * uSkyI * 0.8, 0.25 * smoothstep(0.55, 0.98, hb));       // spray haze toward the top
        float dist = length(vW - cameraPosition), fog = 1.0 - exp(-uFogD * dist);
        gl_FragColor = vec4(mix(col, uFogC * uSkyI, fog), uA);
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false;
  // the torrent behind the wall: a sheet over everything inland of the front (discarded in front of it)
  const sx = [], sz = []; for (let x = -400; x <= 7200; x += x < 1500 ? 12 : 45) sx.push(x); for (let z = -7500; z <= 6500; z += Math.abs(z - 150) < 1500 ? 12 : 60) sz.push(z);
  const nx = sx.length, nz = sz.length, sp = new Float32Array(nx * nz * 3), si = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) sp.set([sx[i], 0, sz[j]], (i * nz + j) * 3);
  for (let i = 0; i < nx - 1; i++) for (let j = 0; j < nz - 1; j++) { const a = i * nz + j, b = a + 1, c = a + nz, d = c + 1; si.push(a, b, c, b, d, c); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setIndex(si);
  const smat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true,
    vertexShader: `${BASE_GLSL}${NOISE_GLSL}${SHAPE}
      uniform float uFront, uH, uBase, uT; varying vec3 vW; varying float vBehind;
      void main(){
        vec2 p = position.xz; float xf = uFront + lagF(p.y), behind = p.x - xf;
        float lev = uBase + uH * wobW(p.y, uT) * 0.6 + 0.0025 * max(behind - 6.5 * uH, 0.0);
        float y = max(lev + 1.2 * (bfbm(p * 0.01 + vec2(uT * 0.25, 0.0)) - 0.5), baseY(p) + 2.5);
        vW = vec3(p.x, y, p.y); vBehind = behind;
        gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
      }`,
    fragmentShader: `${NOISE_GLSL}${SIMPLEX}${SKY_GLSL}
      uniform float uFogD, uH, uA; uniform vec3 uFogC; varying vec3 vW; varying float vBehind;
      void main(){
        if (vBehind < 6.2 * uH) discard;
        vec2 p = vW.xz; vec2 fwv = fwidth(p); float fw = max(fwv.x, fwv.y) + 1e-4;
        float s1 = bfbmAA(vec2(p.x * 0.012 + uT * 0.7, p.y * 0.05), fw * 0.05), s2 = bfbmAA(vec2(p.x * 0.04 + uT * 2.0, p.y * 0.12) + 3.0, fw * 0.12);
        vec3 Vd = normalize(cameraPosition - vW), N = normalize(vec3((s1 - 0.5) * 0.5, 1.0, (s2 - 0.5) * 0.5));
        float fres = 0.02 + 0.98 * pow(max(1.0 - dot(N, Vd), 0.0), 5.0);
        vec3 R = reflect(-Vd, N); R.y = abs(R.y) + 0.01;
        vec3 body = mix(vec3(0.11, 0.09, 0.06), vec3(0.045, 0.04, 0.035), s1) * uSkyI;
        vec3 col = mix(body, iceSky(R, 0.0) * 0.7, fres * 0.6);
        float white = smoothstep(0.7, 0.9, s2 + 0.3 * s1 - 0.1);
        col = mix(col, vec3(0.62, 0.58, 0.52) * uSkyI, clamp(white, 0.0, 1.0) * 0.3);
        col += vec3(1.0, 0.7, 0.45) * pow(max(dot(R, uSun), 0.0), 120.0) * 2.0 * uSkyI;
        float dist = length(vW - cameraPosition), fog = 1.0 - exp(-uFogD * dist);
        gl_FragColor = vec4(mix(col, uFogC * uSkyI, fog), uA);
      }`,
  });
  const sheet = new THREE.Mesh(sg, smat); sheet.frustumCulled = false;
  return { mesh: m, sheet, U, lagF: (z) => 160 * Math.sin(z * 0.0013 + 0.4) + 70 * Math.sin(z * 0.0041 + 1.9) };
}
