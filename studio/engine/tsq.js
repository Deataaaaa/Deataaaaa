// Times Square at dusk for post 6 (What if every atom on Earth stopped moving for 1 second?), laid out like the real
// one. Local frame: x east, z south (the Manhattan grid's south), y up, street level y = 0. Cross streets every 80 m:
// 48th z = -160, 47th -80, 46th 0, 45th 80, 44th 160, 43rd 240, 42nd 320, 41st 400. Seventh Avenue runs straight
// south along x = 0 (traffic, 18 m curb to curb); Broadway runs diagonally (x = 0.32 (z - 120)), crossing it between
// 44th and 45th: that crossing is the "bowtie". Broadway is a pedestrian plaza from 42nd to 47th. Duffy Square (the
// island between 46th and 47th, Broadway west, 7th east) carries the red TKTS steps, facing south; One Times Square
// stands on the island between 42nd and 43rd with 7th Avenue on its west side and Broadway on its east side, its north
// face stacked with screens. Buildings line both corridors; their podiums are covered in screens showing invented
// adverts (engine/ads6.js). Every pattern is box-filtered; the adverts change slowly (no strobing).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';
import { makeFacadeMaterial } from './town5.js';
import { NOISE_GLSL } from './guarapari.js';
import { AD_NEWS } from './ads6.js';

export const S_BW = 0.32, Z_X = 120;                                   // Broadway's slope (dx/dz) and where it crosses 7th
export const xb = (z) => S_BW * (z - Z_X);                             // Broadway's centre line
export const CROSS = [-240, -160, -80, 0, 80, 160, 240, 320, 400, 480];
export const xW = (z) => Math.min(-14, xb(z) - 14), xE = (z) => Math.max(14, xb(z) + 14);   // the building lines
export const TSQ = { CROSS, STEP: { x0: -30, x1: -14, zF: -12, n: 20, rise: 0.24, run: 0.6 }, OTS: { x0: 15, x1: 30, z0: 252, z1: 316 } };
const PULSE = `
  float pulse(float x, float a, float b, float fw){ float w = max(fw, 1e-4);
    float F0 = floor(x - 0.5 * w) * (b - a) + clamp(fract(x - 0.5 * w), a, b) - a, F1 = floor(x + 0.5 * w) * (b - a) + clamp(fract(x + 0.5 * w), a, b) - a;
    return (F1 - F0) / w; }
  float th21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.55); }`;

// shared uniforms: time on the screens (frozen with the atoms), screen power (the grid dies after the restart), frost
export const TQ = { uScrT: { value: 0 }, uPower: { value: 1 }, uFrost: { value: 0 }, uTime: { value: 0 } };

// frost: any lit material grows white crystalline frost (more on surfaces facing up), driven by TQ.uFrost (0..1).
// Frequency-clamped noise so it never sparkles.
export function frostize(mat, { k = 1 } = {}) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uFrost = TQ.uFrost;
    if (!sh.vertexShader.includes('vFrW')) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFrW; varying vec3 vFrN;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          #ifdef USE_INSTANCING
            vFrW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vFrN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);
          #else
            vFrW = (modelMatrix * vec4(transformed, 1.0)).xyz; vFrN = normalize(mat3(modelMatrix) * objectNormal);
          #endif`);
    }
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vFrW; varying vec3 vFrN; uniform float uFrost;
        float frH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float frN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(frH(i), frH(i + vec3(1,0,0)), f.x), mix(frH(i + vec3(0,1,0)), frH(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(frH(i + vec3(0,0,1)), frH(i + vec3(1,0,1)), f.x), mix(frH(i + vec3(0,1,1)), frH(i + vec3(1,1,1)), f.x), f.y), f.z); }
        float frFbm(vec3 p, float fw){ float s = 0.0, a = 0.5, f = 1.0; for (int i = 0; i < 4; i++){ s += a * mix(0.5, frN(p * f), 1.0 - smoothstep(0.25, 0.6, fw * f)); a *= 0.5; f *= 2.1; } return s; }
        float gFrost;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        gFrost = 0.0;
        if (uFrost > 0.0) {
          float fw = length(fwidth(vFrW)) * 9.0;
          float n = frFbm(vFrW * 9.0, fw), up = clamp(normalize(vFrN).y * 0.5 + 0.55, 0.0, 1.0);
          gFrost = smoothstep(1.0 - uFrost * ${(1.05 * k).toFixed(3)}, 1.0 - uFrost * ${(1.05 * k).toFixed(3)} + 0.25, n * 0.55 + up * 0.55);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.95) * (0.85 + 0.15 * n), gFrost * 0.92);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.55, gFrost);`);
  };
  const key0 = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => key0() + '|frost' + k;
  return mat;
}

// ---------------------------------------------------------------------------------------------------------------
// the ground: Seventh Avenue's lanes and crosswalks, the cross streets, the plaza's dark pavers with pale inlays,
// sidewalks along the building lines (one shader on one big plane)
// ---------------------------------------------------------------------------------------------------------------
export function makeGround() {
  const g = new THREE.PlaneGeometry(1400, 2000, 1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0, 120);
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
  const uC = new Float32Array(10); CROSS.forEach((z, i) => { uC[i] = z; });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCross = { value: uC };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vGW; uniform float uCross[10];
      ${PULSE}${NOISE_GLSL}
      float gRough;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec2 p = vGW.xz; vec2 fw = fwidth(p); float fwm = max(fw.x, fw.y);
      float dc = 1e9, zc = 0.0; for (int i = 0; i < 10; i++) { float d = abs(p.y - uCross[i]); if (d < dc) { dc = d; zc = uCross[i]; } }
      float xbw = ${S_BW.toFixed(3)} * (p.y - ${Z_X.toFixed(1)});
      float lineW = min(-14.0, xbw - 14.0), lineE = max(14.0, xbw + 14.0);
      float nz = bfbmAA(p * 0.4, fwm * 0.4), nz2 = bfbmAA(p * 0.05 + 3.0, fwm * 0.05);
      vec3 asph = vec3(0.07, 0.07, 0.075) * (0.8 + 0.4 * nz), col; gRough = 0.85;
      bool road7 = abs(p.x) < 9.0, crossSt = dc < 9.0;
      if (road7 || crossSt) {
        col = asph;
        if (road7) {                                                   // four southbound lanes and a bus lane, crosswalks
          float lane = (pulse(p.x / 3.6 + 0.5, 0.0, 0.03, fw.x / 3.6)) * pulse(p.y / 9.0, 0.0, 0.45, fw.y / 9.0) * step(abs(p.x), 7.2);
          float edge = pulse(p.x, -8.75, -8.6, fw.x) + pulse(p.x, 8.6, 8.75, fw.x);
          col = mix(col, vec3(0.38, 0.1, 0.07) * (0.8 + 0.3 * nz), step(5.4, p.x) * 0.85);
          col = mix(col, vec3(0.8, 0.79, 0.75), clamp(lane + edge, 0.0, 1.0) * 0.85 * step(4.5, dc));
        }
        float zebra = step(dc, 4.5) * step(2.0, dc) * pulse((road7 ? p.x : p.x) / 1.2, 0.0, 0.5, fw.x / 1.2);
        float zebraX = crossSt && !road7 ? step(abs(p.x - (p.x < 0.0 ? lineW : lineE)), 6.0) * pulse(p.y / 1.2, 0.0, 0.5, fw.y / 1.2) : 0.0;
        col = mix(col, vec3(0.82, 0.81, 0.77), clamp(zebra * (road7 ? 1.0 : 0.0) + zebraX, 0.0, 1.0) * 0.85);
        float stopL = road7 ? pulse(dc, 4.9, 5.2, fw.y) : 0.0; col = mix(col, vec3(0.82, 0.81, 0.77), stopL * 0.85);
        gRough = 0.8;
      } else if (p.x < lineW + 3.0 || p.x > lineE - 3.0) {          // sidewalks along the buildings: concrete flags
        float j = pulse(p.x / 1.5, 0.0, 0.03, fw.x / 1.5) + pulse(p.y / 1.5, 0.0, 0.03, fw.y / 1.5);
        col = vec3(0.34, 0.33, 0.32) * (0.85 + 0.25 * nz) * (1.0 - 0.25 * clamp(j, 0.0, 1.0));
      } else {                                                         // the plaza: dark pavers with pale oval inlays
        vec2 q = vec2(p.x * 0.95 + p.y * 0.31, p.y * 0.95 - p.x * 0.31) / 1.6; vec2 qi = floor(q), qf = fract(q) - 0.5;
        float pav = pulse(p.x / 0.6, 0.0, 0.04, fw.x / 0.6) + pulse(p.y / 0.3, 0.0, 0.06, fw.y / 0.3);
        col = vec3(0.17, 0.17, 0.18) * (0.8 + 0.35 * nz) * (0.9 + 0.2 * th21(floor(p / vec2(0.6, 0.3)))) * (1.0 - 0.3 * clamp(pav, 0.0, 1.0) * (1.0 - smoothstep(0.1, 0.25, fwm)));
        float r = length(qf * vec2(1.0, 1.8)), disc = (1.0 - smoothstep(0.16 - fwm, 0.16 + fwm, r)) * step(0.55, th21(qi));
        col = mix(col, vec3(0.62, 0.62, 0.6), disc * (1.0 - smoothstep(0.3, 0.9, fwm)) * 0.9);
        gRough = 0.72;
      }
      col *= 0.85 + 0.3 * nz2;
      diffuseColor.rgb *= col;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;');
  };
  mat.customProgramCacheKey = () => 'tsq_ground_v2';
  frostize(mat);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true;
  // curbs along 7th Avenue, open at the cross streets
  const cg = [];
  for (const x of [-9.0, 9.0]) for (let z = -600; z < 800; z += 8) { if (CROSS.some((c) => Math.abs(z + 4 - c) < 10)) continue; const b = new THREE.BoxGeometry(0.25, 0.15, 8); b.translate(x, 0.075, z + 4); cg.push(b); }
  const curbs = new THREE.Mesh(mergeGeometries(cg), frostize(new THREE.MeshStandardMaterial({ color: '#77746e', roughness: 0.85 }))); curbs.receiveShadow = true;
  const grp = new THREE.Group(); grp.add(m, curbs);
  return { group: grp, mat };
}

// ---------------------------------------------------------------------------------------------------------------
// the red TKTS steps: 20 glass treads lit from inside, on a dark stepped body with glass balustrades
// ---------------------------------------------------------------------------------------------------------------
export function makeSteps() {
  const S = TSQ.STEP, grp = new THREE.Group(), w = S.x1 - S.x0;
  const red = new THREE.MeshPhysicalMaterial({ color: '#3a0507', roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.12, emissive: '#ff1810', emissiveIntensity: 0.025 });
  const riser = new THREE.MeshStandardMaterial({ color: '#1c0304', roughness: 0.35, emissive: '#ff1a10', emissiveIntensity: 0.07 });
  const nosing = new THREE.MeshStandardMaterial({ color: '#200', emissive: '#ff2a18', emissiveIntensity: 1.1 });
  frostize(red); frostize(riser);
  const tg = [], rg = [];
  for (let i = 0; i < S.n; i++) {
    const y = (i + 1) * S.rise, z = S.zF - i * S.run;
    const t = new THREE.BoxGeometry(w, 0.05, S.run); t.translate(S.x0 + w / 2, y - 0.025, z - S.run / 2); tg.push(t);
    const rr2 = new THREE.BoxGeometry(w, S.rise - 0.05, 0.02); rr2.translate(S.x0 + w / 2, y - S.rise / 2 - 0.025, z); rg.push(rr2);
  }
  const ng = []; for (let i = 0; i < S.n; i++) { const b = new THREE.BoxGeometry(w - 0.1, 0.012, 0.03); b.translate(S.x0 + w / 2, (i + 1) * S.rise + 0.002, S.zF - i * S.run - 0.03); ng.push(b); }
  const treads = new THREE.Mesh(mergeGeometries(tg), red), risers = new THREE.Mesh(mergeGeometries(rg), riser), nose = new THREE.Mesh(mergeGeometries(ng), nosing);
  treads.receiveShadow = true; treads.castShadow = true; grp.add(treads, risers, nose);
  const prof = new THREE.Shape(); prof.moveTo(0, 0);
  for (let i = 0; i < S.n; i++) { prof.lineTo(i * S.run + 0.02, (i + 1) * S.rise - 0.06); prof.lineTo((i + 1) * S.run, (i + 1) * S.rise - 0.06); }
  prof.lineTo(S.n * S.run, 0); prof.lineTo(0, 0);
  const bg = new THREE.ExtrudeGeometry(prof, { depth: w + 0.5, bevelEnabled: false }); bg.rotateY(Math.PI / 2); bg.translate(S.x0 - 0.25, 0, S.zF);
  const body = new THREE.Mesh(bg, frostize(new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.6 }))); body.receiveShadow = true; grp.add(body);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#a8b4bc', roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false });
  const steel = frostize(new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.9, roughness: 0.25 }));
  for (const x of [S.x0 - 0.25, S.x1 + 0.25]) {
    const shape = new THREE.Shape(); shape.moveTo(0, 0.3); shape.lineTo(S.n * S.run, S.n * S.rise + 1.1); shape.lineTo(S.n * S.run, S.n * S.rise); shape.lineTo(0, 0); shape.lineTo(0, 0.3);
    const gg = new THREE.ShapeGeometry(shape); gg.rotateY(Math.PI / 2); gg.translate(x, 0, S.zF);
    const pane = new THREE.Mesh(gg, glass); pane.renderOrder = 2; grp.add(pane);
    const L = Math.hypot(S.n * S.run, S.n * S.rise), rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 8), steel);
    rail.position.set(x, S.n * S.rise / 2 + 1.1, S.zF - S.n * S.run / 2); rail.rotation.x = Math.PI / 2 - Math.atan2(S.n * S.rise, S.n * S.run); grp.add(rail);
  }
  const seat = (i) => ({ y: (i + 1) * S.rise, z: S.zF - i * S.run });   // the tread top of step i and its front edge
  return { group: grp, seat, red, riser, nosing };
}

// ---------------------------------------------------------------------------------------------------------------
// screens: the invented adverts from the atlases, cover-fitted, a new advert every ~10 s (cross-fade), a slow push-in
// like a video, the news zipper scrolling; frozen with the atoms (uScrT), dark when the power dies (uPower)
// ---------------------------------------------------------------------------------------------------------------
const SCREEN_VS = `attribute vec4 aScr; attribute vec3 aSize; varying vec2 vUv; varying vec4 vScr; varying vec3 vSize;
  void main(){ vUv = uv; vScr = aScr; vSize = aSize; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`;
const SCREEN_FS = `uniform float uT, uPower, uFrost; uniform sampler2D uWide, uTall; uniform float uNW, uNT; varying vec2 vUv; varying vec4 vScr; varying vec3 vSize;
  ${PULSE}
  vec3 adAt(float tile, vec2 u, float tall){
    vec2 uv;
    if (tall > 0.5) { float i = mod(tile, uNT), col = mod(i, 4.0), row = floor(i / 4.0); uv = vec2((col + u.x) / 4.0, 1.0 - (row + 1.0 - u.y) / 2.0); return texture2D(uTall, uv).rgb; }
    float i = mod(tile, uNW), col = mod(i, 4.0), row = floor(i / 4.0); uv = vec2((col + u.x) / 4.0, 1.0 - (row + 1.0 - u.y) / 4.0); return texture2D(uWide, uv).rgb;
  }
  void main(){
    vec2 px = vUv * vSize.xy; vec2 fw = fwidth(px) + 1e-4;
    float seed = vScr.x, kind = vScr.y, tall = vSize.z, period = 9.0 + 4.0 * fract(seed * 5.7);
    float tt = uT + seed * 37.0, k = floor(tt / period), f = fract(tt / period);
    float A = vScr.z + k, xf = smoothstep(0.93, 1.0, f);
    // cover-fit the tile (2:1 wide or 1:2 tall) into the screen, inset a little so the mips never pull the next tile in
    float as = vSize.x / vSize.y, at = tall > 0.5 ? 0.5 : 2.0;
    vec2 u = vUv - 0.5; if (as > at) u.y *= at / as; else u.x *= as / at;
    float zoom = 1.0 - 0.06 * f; vec2 u1 = u * zoom * 0.96 + 0.5, u2 = u * 0.96 + 0.5;
    vec3 c;
    if (kind > 1.5) { vec2 uz = vec2(fract(vUv.x * vSize.x / (vSize.y * 2.0) * 0.5 + uT * 0.04 + seed), vUv.y * 0.96 + 0.02); c = adAt(${AD_NEWS.toFixed(1)}, uz, 0.0); }
    else c = mix(adAt(A, u1, tall), adAt(A + 1.0, u2, tall), xf);
    // LED pixels: a faint grid, faded out before it gets smaller than a pixel
    float pg = pulse(px.x / 0.025, 0.0, 0.3, fw.x / 0.025) + pulse(px.y / 0.025, 0.0, 0.3, fw.y / 0.025);
    c *= 1.0 - 0.22 * clamp(pg, 0.0, 1.0) * (1.0 - smoothstep(0.25, 0.7, fw.x / 0.025));
    // a dark bezel
    vec2 dd = abs(px - vSize.xy * 0.5) - (vSize.xy * 0.5 - 0.1); float edge = smoothstep(-fw.x, fw.x, max(dd.x, dd.y));
    vec3 col = c * (1.0 - edge) * uPower * (1.7 + 0.6 * fract(seed * 11.0));
    col = mix(col, vec3(0.03) + vec3(0.6, 0.65, 0.7) * 0.25 * uFrost, edge);
    col = mix(col, vec3(0.06, 0.065, 0.07) + vec3(0.55, 0.6, 0.66) * 0.18 * uFrost, (1.0 - uPower) * (1.0 - edge));   // a dead screen: dark glass, frosting over
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
export function makeScreens(list, ads) {
  const mat = new THREE.ShaderMaterial({ uniforms: { uT: TQ.uScrT, uPower: TQ.uPower, uFrost: TQ.uFrost, uWide: { value: ads.wide }, uTall: { value: ads.tall }, uNW: { value: ads.nWide }, uNT: { value: ads.nTall } },
    vertexShader: SCREEN_VS, fragmentShader: SCREEN_FS, toneMapped: true });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
  const g = new THREE.PlaneGeometry(1, 1);
  const im = new THREE.InstancedMesh(g, mat, list.length);
  const scr = new Float32Array(list.length * 4), sz = new Float32Array(list.length * 3), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  list.forEach((s, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw); m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(s.w, s.h, 1)); im.setMatrixAt(i, m4);
    scr.set([s.seed, s.kind, s.tile, 0], i * 4); sz.set([s.w, s.h, s.h > s.w * 1.15 ? 1 : 0], i * 3);
  });
  g.setAttribute('aScr', new THREE.InstancedBufferAttribute(scr, 4)); g.setAttribute('aSize', new THREE.InstancedBufferAttribute(sz, 3));
  im.computeBoundingSphere(); im.frustumCulled = false;
  return { mesh: im, mat };
}

// ---------------------------------------------------------------------------------------------------------------
// the buildings: rows along both corridors (straight along 7th Avenue, angled along Broadway), each a podium covered in
// screens with a tower set back above it; the island buildings (One Times Square, the blocks north of 47th and south
// of 42nd); a second row behind for the skyline
// ---------------------------------------------------------------------------------------------------------------
export function makeBuildings(ads, seed = 7) {
  const r = rng(seed), group = new THREE.Group(), screens = [], lights = [];
  const A = Math.atan(S_BW), dB = [Math.sin(A), Math.cos(A)];
  // two facade materials: fronts facing east (west rows) and west (east rows); a third for fronts facing north/south
  const matW = frostize(makeFacadeMaterial({ baseY: 0, front: [1, 0], key: 'tsq2_w', power: TQ.uPower }), { k: 0.8 });
  const matE = frostize(makeFacadeMaterial({ baseY: 0, front: [-1, 0], key: 'tsq2_e', power: TQ.uPower }), { k: 0.8 });
  const matN = frostize(makeFacadeMaterial({ baseY: 0, front: [0, -1], key: 'tsq2_n', power: TQ.uPower }), { k: 0.8 });
  const insts = { w: [], e: [], n: [] };
  const addBox = (set, c, ang, depth, h, width, y0, st, extra = {}) => insts[set].push({ x: c.x, y: y0 + h / 2, z: c.z, ang, sx: depth, sy: h, sz: width, st, tint: r(), hue: r(), kind: 0, ...extra });
  const addScreen = (o) => { screens.push({ tile: Math.floor(r() * 16), seed: r(), kind: 0, ...o }); };
  // one building on a row: front point F on the building line, along-street dir d (unit, xz), outward normal o (unit)
  function building(F, d, o, w, set, opts = {}) {
    const ang = Math.atan2(d[0], d[1]), depth = opts.depth ?? (20 + r() * 12);
    const hp = opts.podium ?? (18 + r() * 26), tower = opts.tower ?? (r() < 0.8 ? 40 + r() * 160 : 0);
    const C = { x: F.x + o[0] * depth / 2, z: F.z + o[1] * depth / 2 };
    addBox(set, C, ang, depth, hp, w, 0, r() < 0.5 ? 1 : 3);
    if (tower > 0) {
      const sb = 2 + r() * 6, d2 = depth - sb - r() * 4, w2 = w * (0.62 + 0.33 * r());
      const C2 = { x: F.x + o[0] * (sb + d2 / 2), z: F.z + o[1] * (sb + d2 / 2) };
      const st = r(); addBox(set, C2, ang, d2, tower, w2, hp, st < 0.45 ? 2 : st < 0.75 ? 1 : st < 0.9 ? 3 : 0);
      if (r() < 0.35) { const h3 = 10 + r() * 30; addBox(set, C2, ang, d2 * 0.6, h3, w2 * 0.6, hp + tower, 2); }
    }
    // screens over the podium's front: one to three stacked, nearly full width, the odd tall one
    const n = { x: -o[0], z: -o[1] }, yaw = Math.atan2(n.x, n.z);
    let y = 4.6; const top = hp - 1.2, along = (k) => ({ x: F.x + n.x * 0.35 + d[0] * k, z: F.z + n.z * 0.35 + d[1] * k });
    const zipper = r() < 0.35; if (zipper) { const p = along(0); addScreen({ x: p.x, y: y + 0.7, z: p.z, w: w * 0.96, h: 1.4, yaw, kind: 2 }); y += 2.2; }
    while (y < top - 4) {
      const hh = Math.min(top - y, 7 + r() * 16);
      if (r() < 0.22 && w > 14) {   // a pair: a tall one and a wide one
        const wt = Math.min(hh * 0.55, w * 0.32), p1 = along(-w / 2 + wt / 2 + 0.6), p2 = along(wt / 2 + 0.3);
        addScreen({ x: p1.x, y: y + hh / 2, z: p1.z, w: wt, h: hh, yaw }); addScreen({ x: p2.x, y: y + hh / 2, z: p2.z, w: w - wt - 2.2, h: hh, yaw });
      } else { const p = along((r() - 0.5) * 1.0); addScreen({ x: p.x, y: y + hh / 2, z: p.z, w: w * (0.86 + 0.12 * r()), h: hh, yaw }); }
      y += hh + 0.6 + r() * 1.2;
    }
    lights.push({ x: F.x + n.x * 8, y: Math.min(hp, 22) * 0.6, z: F.z + n.z * 8, nx: n.x, nz: n.z, seed: screens[screens.length - 1].seed });
    return C;
  }
  // a row from zA to zB along a building line, skipping the cross streets
  function row(lineX, slope, side, zA, zB, set, opts = {}) {
    const d = slope ? dB : [0, 1], o = side < 0 ? [-d[1], d[0]] : [d[1], -d[0]];   // west rows face east (o = west), east rows face west
    for (let i = 0; i < CROSS.length - 1; i++) {
      const z0 = Math.max(zA, CROSS[i] + 9.5), z1 = Math.min(zB, CROSS[i + 1] - 9.5);
      if (z1 - z0 < 8) continue;
      let u = 0; const L = (z1 - z0) / d[1];
      while (u < L - 6) {
        const w = Math.min(L - u, 14 + r() * 20), zm = z0 + (u + w / 2) * d[1];
        building({ x: lineX(zm), z: zm }, d, o, w - 0.6, set, opts);
        u += w;
      }
    }
  }
  // the square's own facades (the first row) and the corridors beyond
  row(xW, true, -1, -700, Z_X, 'w');   // west side north of the crossing: along Broadway
  row(xW, false, -1, Z_X, 900, 'w');   // west side south of it: along 7th Avenue
  row(xE, false, 1, -700, Z_X, 'e');   // east side north: along 7th Avenue
  row(xE, true, 1, Z_X, 900, 'e');     // east side south: along Broadway
  // the island north of 47th between Broadway (west) and 7th (east): a block with screens facing south
  for (const [z0, z1] of []) {   // (no island block north of 47th: every shot looks south, and both avenues run on north)
    const xa = xb(z1) + 14, xbb = -14, w = xbb - xa, c = { x: (xa + xbb) / 2, z: (z0 + z1) / 2 };
    if (w > 6) {
      addBox('n', c, 0, w, 30, z1 - z0, 0, 1); addBox('n', { x: c.x + 2, z: c.z - 4 }, 0, w * 0.7, 60 + r() * 60, (z1 - z0) * 0.7, 30, 2);
      for (let k = 0; k < 2; k++) addScreen({ x: c.x, y: 6 + k * 12 + 5, z: z1 + 0.35, w: w * 0.92, h: 10, yaw: 0 });
    }
  }
  // One Times Square: the narrow tower on the island between 42nd and 43rd, its north face stacked with screens
  const O = TSQ.OTS, ow = O.x1 - O.x0, od = O.z1 - O.z0, oc = { x: (O.x0 + O.x1) / 2, z: (O.z0 + O.z1) / 2 };
  addBox('n', oc, 0, ow, 112, od, 0, 1, { tint: 0.31, hue: 0.83 });
  addBox('n', { x: oc.x, z: oc.z + 8 }, 0, ow * 0.6, 12, od * 0.4, 112, 1, { tint: 0.31, hue: 0.83 });
  let oy = 5;
  for (const h of [5, 13, 13, 11, 11, 10, 10, 9, 9]) { addScreen({ x: oc.x, y: oy + h / 2, z: O.z0 - 0.35, w: ow - 0.6, h, yaw: Math.PI, kind: h === 5 ? 2 : 0 }); oy += h + 0.8; }
  for (let k = 0; k < 3; k++) addScreen({ x: O.x0 - 0.35, y: 8 + k * 14 + 6, z: oc.z - 8, w: od * 0.7, h: 12, yaw: -Math.PI / 2 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 24, 10), new THREE.MeshStandardMaterial({ color: '#4a4c50', metalness: 0.8, roughness: 0.4 }));
  mast.position.set(oc.x, 124 + 12, oc.z + 8); group.add(mast);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 2), new THREE.MeshStandardMaterial({ color: '#c8d4ff', emissive: '#9fb4ff', emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.2 }));
  ball.position.set(oc.x, 142, oc.z + 8); group.add(ball);
  // the island south of 42nd (between 7th and Broadway)
  { const z0 = 329.5, z1 = 390.5, xa = 14, xbb = xb(z0) - 14, c = { x: (xa + xbb) / 2, z: (z0 + z1) / 2 }; addBox('n', c, 0, xbb - xa, 34, z1 - z0, 0, 1); addBox('n', { x: c.x, z: c.z + 6 }, 0, (xbb - xa) * 0.6, 90, (z1 - z0) * 0.6, 34, 2);
    addScreen({ x: c.x, y: 20, z: z0 - 0.35, w: (xbb - xa) * 0.9, h: 22, yaw: Math.PI }); }
  // a second row behind the first for the skyline (towers only, no screens)
  for (const [set, lineX, side] of [['w', xW, -1], ['e', xE, 1]]) for (let z = -600; z < 820; z += 22 + r() * 18) {
    if (CROSS.some((c) => Math.abs(z - c) < 12)) continue;
    const x = lineX(z) + side * (38 + r() * 20), h = 60 + r() * 220, wd = 18 + r() * 16;
    insts[set].push({ x, y: h / 2, z, ang: 0, sx: wd, sy: h, sz: 16 + r() * 10, st: r() < 0.6 ? 2 : 1, tint: r(), hue: r(), kind: 0 });
  }
  for (const [set, mat] of [['w', matW], ['e', matE], ['n', matN]]) {
    const list = insts[set]; if (!list.length) continue;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, list.length);
    const sty = new Float32Array(list.length * 4), fac = new Float32Array(list.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    list.forEach((o, i) => { q.setFromAxisAngle(up, o.ang); m4.compose(new THREE.Vector3(o.x, o.y, o.z), q, new THREE.Vector3(o.sx, o.sy, o.sz)); im.setMatrixAt(i, m4); sty.set([o.st, o.tint, o.kind, o.hue], i * 4); fac.set([Math.sin(o.ang), Math.cos(o.ang)], i * 2); });
    im.geometry.setAttribute('aStyle', new THREE.InstancedBufferAttribute(sty, 4)); im.geometry.setAttribute('aFace', new THREE.InstancedBufferAttribute(fac, 2));
    im.computeBoundingSphere(); im.receiveShadow = true; group.add(im);
  }
  const scr = makeScreens(screens, ads); group.add(scr.mesh);
  return { group, screens, lights, mats: [matW, matE, matN], scr };
}

// ---------------------------------------------------------------------------------------------------------------
// street furniture: NYC lamp posts and traffic lights along 7th Avenue, the plaza's red cafe tables and chairs, food
// carts with umbrellas, the orange-and-white steam stack of a Con Ed manhole
// ---------------------------------------------------------------------------------------------------------------
export function makeStreet(seed = 3) {
  const r = rng(seed), group = new THREE.Group();
  const steel = frostize(new THREE.MeshStandardMaterial({ color: '#2b2d30', metalness: 0.7, roughness: 0.45 }));
  const lampM = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffd9a8', emissiveIntensity: 3.0 });
  const pg = [], hg = [];
  for (let z = -300; z < 700; z += 30) for (const x of [-10.2, 10.2]) {
    if (CROSS.some((c) => Math.abs(z - c) < 11)) continue;
    const p = new THREE.CylinderGeometry(0.09, 0.14, 9, 10); p.translate(x, 4.5, z); pg.push(p);
    const arm = new THREE.BoxGeometry(2.6, 0.12, 0.12); arm.translate(x + (x < 0 ? 1.3 : -1.3), 8.9, z); pg.push(arm);
    const hd = new THREE.BoxGeometry(0.75, 0.16, 0.34); hd.translate(x + (x < 0 ? 2.5 : -2.5), 8.8, z); hg.push(hd);
  }
  // traffic lights at the cross streets (a pole on each corner of 7th Avenue, signals facing north)
  const sigM = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.5 }), redM = new THREE.MeshStandardMaterial({ color: '#200', emissive: '#ff2a1a', emissiveIntensity: 2.5 });
  const sg = [], rg2 = [];
  for (const zc of CROSS) for (const x of [-9.6, 9.6]) {
    const p = new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8); p.translate(x, 2.1, zc - 9.8); pg.push(p);
    const b = new THREE.BoxGeometry(0.35, 1.0, 0.3); b.translate(x, 3.7, zc - 9.8); sg.push(b);
    const l = new THREE.SphereGeometry(0.1, 10, 8); l.translate(x, 4.0, zc - 9.95); rg2.push(l);
  }
  const poles = new THREE.Mesh(mergeGeometries(pg), steel), heads = new THREE.Mesh(mergeGeometries(hg), lampM);
  poles.castShadow = true; group.add(poles, heads, new THREE.Mesh(mergeGeometries(sg), sigM), new THREE.Mesh(mergeGeometries(rg2), redM));
  // red cafe tables and chairs in clusters on the plaza (Broadway between 42nd and 47th)
  const redP = frostize(new THREE.MeshStandardMaterial({ color: '#b3151a', roughness: 0.45, metalness: 0.4 }));
  const tg = [], chg = [];
  const okSpot = (x, z) => Math.abs(x) > 11 && Math.abs(x - xb(z)) < 10 && !CROSS.some((c) => Math.abs(z - c) < 11) && !(x > -32 && x < -12 && z > -26 && z < -10);
  let placed = 0, guard = 0;
  while (placed < 26 && guard++ < 2000) {
    const z = -70 + r() * 380, x = xb(z) + (r() - 0.5) * 18; if (!okSpot(x, z)) continue;
    const top = new THREE.CylinderGeometry(0.38, 0.38, 0.03, 18); top.translate(x, 0.72, z); tg.push(top);
    const leg = new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6); leg.translate(x, 0.36, z); tg.push(leg);
    const foot = new THREE.CylinderGeometry(0.22, 0.24, 0.02, 14); foot.translate(x, 0.01, z); tg.push(foot);
    for (let k = 0; k < 3; k++) {
      const a = r() * 6.28, cx = x + Math.cos(a) * 0.7, cz = z + Math.sin(a) * 0.7, mt = new THREE.Matrix4().compose(new THREE.Vector3(cx, 0, cz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2), new THREE.Vector3(1, 1, 1));
      const parts = [new THREE.BoxGeometry(0.42, 0.03, 0.4).translate(0, 0.45, 0), new THREE.BoxGeometry(0.42, 0.42, 0.03).translate(0, 0.68, -0.19)];
      for (const lx of [-0.18, 0.18]) for (const lz of [-0.17, 0.17]) parts.push(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 5).translate(lx, 0.225, lz));
      for (const pp of parts) { pp.applyMatrix4(mt); chg.push(pp); }
    }
    placed++;
  }
  const tables = new THREE.Mesh(mergeGeometries(tg), redP), chairs = new THREE.Mesh(mergeGeometries(chg), redP);
  tables.castShadow = chairs.castShadow = true; group.add(tables, chairs);
  // food carts: a steel box, a striped umbrella, a warm light under it
  const cartM = frostize(new THREE.MeshStandardMaterial({ color: '#b7bcc2', metalness: 0.8, roughness: 0.3 })), umbM = new THREE.MeshStandardMaterial({ color: '#d8a21c', roughness: 0.7, side: THREE.DoubleSide });
  for (const [x, z] of [[-12.5, 40], [12.5, -40], [-12.8, 205], [36, 290]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 2.4), cartM); c.position.set(x, 0.75, z); c.castShadow = true; group.add(c);
    const u = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.5, 16, 1, true), umbM); u.position.set(x, 2.6, z); group.add(u);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), steel); p.position.set(x, 1.95, z); group.add(p);
    const glowM = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.25, 2.2), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffcf8a', emissiveIntensity: 1.8 })); glowM.position.set(x, 1.3, z); group.add(glowM);
  }
  // the Con Ed steam stack on 7th Avenue (orange and white bands)
  const stackT = (() => { const cv = document.createElement('canvas'); cv.width = 16; cv.height = 128; const c = cv.getContext('2d'); for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f3f1ec' : '#ee6a1a'; c.fillRect(0, i * 16, 16, 16); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.2, 20, 1, true), frostize(new THREE.MeshStandardMaterial({ map: stackT, roughness: 0.6, side: THREE.DoubleSide })));
  stack.position.set(-4.5, 1.6, 22); stack.castShadow = true; group.add(stack);
  return { group, lampM, redM, steamAt: new THREE.Vector3(-4.5, 3.2, 22) };
}
