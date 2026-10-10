// Guarapari's seafront town for post 5 (owner: "the town doesn't have a floor and the buildings are all the same...
// add some life to the city, cars, people, children, benches"). Built along the bay's curve, offsets u measured inland
// from the promenade's beach edge x = promX(z):
//   u 0..-9 the promenade (Copacabana-style black-and-white wave mosaic), -9..-10.8 a red bike lane, -10.8..-24 the
//   beachfront avenue (four lanes, dashed lines, double yellow centre, zebra crossings), -24..-31 the shop-side
//   pavement, then four rows of buildings with parallel streets between them and cross streets every block.
// Buildings: beachfront towers with balcony bands or glass, pastel apartment blocks with AC units under the windows,
// low-rise houses with terracotta roofs and blue water tanks, shops with lit windows and coloured signs on the ground
// floor. Cars with lights on drive the avenue until the decay, then freeze. Street furniture: benches, bins, a beach
// kiosk with plastic chairs, umbrellas and beach chairs, a footvolley net. Every pattern is box-filtered (no shimmer).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';
import { canvasTex } from './assets.js';
import { BX, shoreX, groundY, promX, PROM_Y, NOISE_GLSL, BLACKBODY_GLSL } from './guarapari.js';
import { heatize } from './paris.js';

const PULSE = `
  float pulse(float x, float a, float b, float fw){ float w = max(fw, 1e-4);
    float F0 = floor(x - 0.5 * w) * (b - a) + clamp(fract(x - 0.5 * w), a, b) - a, F1 = floor(x + 0.5 * w) * (b - a) + clamp(fract(x + 0.5 * w), a, b) - a;
    return (F1 - F0) / w; }
  float th21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.55); }`;
const PROMX_GLSL = `float shoreXt(float z){ float k = clamp(z / 270.0, -1.0, 1.0); return -16.0 * (1.0 - k * k); }
  float promXt(float z){ return shoreXt(z) - 42.0; }`;

// ---------------------------------------------------------------------------------------------------------------
// layout: cross streets (z centres) and the rows of buildings
// ---------------------------------------------------------------------------------------------------------------
export const ROWS = [[-33, -55], [-68, -90], [-102, -122], [-134, -154]];          // u ranges of the building rows
export const PSTREETS = [[-66, -56], [-100, -91], [-132, -123]];                  // parallel streets (u)
export function townLayout(seed = 9) {
  const r = rng(seed), cross = [];
  for (let z = -470; z < 300; z += 72 + r() * 26) cross.push(z);
  const blds = [];
  ROWS.forEach(([u0, u1], row) => {
    for (let b = 0; b < cross.length - 1; b++) {
      const z0 = cross[b] + 7, z1 = cross[b + 1] - 7;
      let z = z0 + r() * 3;
      while (z < z1 - 10) {
        const w = Math.min(z1 - z, row < 2 ? 15 + r() * 15 : 10 + r() * 14);
        if (w < 9) break;
        const dmax = u0 - u1, d = Math.min(dmax, row < 2 ? 13 + r() * 9 : 9 + r() * 10);
        const st = r();
        let style, fl;
        if (row === 0) { style = st < 0.38 ? 0 : st < 0.62 ? 3 : st < 0.78 ? 2 : 1; fl = 11 + Math.floor(r() * 15); }
        else if (row === 1) { style = st < 0.45 ? 1 : st < 0.7 ? 0 : st < 0.85 ? 3 : 2; fl = 7 + Math.floor(r() * 13); }
        else { style = st < 0.45 ? 1 : st < 0.85 ? 4 : 0; fl = style === 4 ? 2 + Math.floor(r() * 3) : 4 + Math.floor(r() * 9); }
        blds.push({ row, zc: z + w / 2, w, u0, d, style, fl, tint: r(), hue: r(), podium: row === 0 && r() < 0.65, seed: r() });
        z += w + 3 + r() * 6;
      }
    }
  });
  return { cross, blds };
}

// ---------------------------------------------------------------------------------------------------------------
// the ground: mosaic promenade, bike lane, avenue with markings, pavements, streets, lots (one shader on a big plane)
// ---------------------------------------------------------------------------------------------------------------
export function makeTownGround(cross) {
  const g = new THREE.PlaneGeometry(1100, 1000, 1, 1); g.rotateX(-Math.PI / 2); g.translate(-500, PROM_Y, -90);
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
  const uC = new Float32Array(24); cross.forEach((z, i) => { if (i < 24) uC[i] = z; });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCross = { value: uC }; sh.uniforms.uNC = { value: Math.min(24, cross.length) };
    sh.uniforms.uGround = BX.uGround; sh.uniforms.uBT = BX.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvTW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vTW; uniform float uCross[24]; uniform int uNC; uniform float uGround, uBT;
      ${PULSE}${PROMX_GLSL}${NOISE_GLSL}${BLACKBODY_GLSL}
      float gRough;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec2 p = vTW.xz; float u = p.x - promXt(p.y), v = p.y;
      if (u > 0.02) discard;
      vec2 fw = fwidth(vec2(u, v)); float fwm = max(fw.x, fw.y);
      float dc = 1e9; for (int i = 0; i < 24; i++) { if (i >= uNC) break; dc = min(dc, abs(v - uCross[i])); }
      float nz = bfbmAA(p * 0.35, fwm * 0.35), nz2 = bfbmAA(p * 0.05 + 7.0, fwm * 0.05);
      vec3 asph = vec3(0.17, 0.17, 0.18) * (0.85 + 0.3 * nz), pave = vec3(0.62, 0.6, 0.56) * (0.88 + 0.2 * nz), col; gRough = 0.9;
      if (u > -9.0) {                                    // the promenade: black-and-white waves (Copacabana style)
        float s = (u + 0.42 * sin(v * 6.2831853 / 3.4)) / 1.15;
        float blk = pulse(s, 0.0, 0.5, fwidth(s));
        col = mix(vec3(0.82, 0.8, 0.76), vec3(0.08, 0.08, 0.085), blk) * (0.92 + 0.12 * nz); gRough = 0.75;
      } else if (u > -10.8) {                            // red bike lane
        col = vec3(0.42, 0.12, 0.09) * (0.85 + 0.25 * nz);
      } else if (u > -24.0) {                            // the avenue
        col = asph;
        float edge = pulse(u, -11.15, -11.0, fw.x) + pulse(u, -23.8, -23.65, fw.x);
        float centre = pulse(u, -17.55, -17.43, fw.x) + pulse(u, -17.37, -17.25, fw.x);
        float dash = (pulse(u, -14.18, -14.06, fw.x) + pulse(u, -20.78, -20.66, fw.x)) * pulse(v / 9.0, 0.0, 0.34, fw.y / 9.0);
        float zebra = step(dc, 3.0) * pulse(u / 1.1, 0.0, 0.5, fw.x / 1.1) * step(-23.6, u) * step(u, -11.2);
        col = mix(col, vec3(0.86, 0.85, 0.8), clamp(edge + dash + zebra, 0.0, 1.0) * 0.9);
        col = mix(col, vec3(0.85, 0.66, 0.12), clamp(centre, 0.0, 1.0) * 0.85);
        gRough = 0.85;
      } else {
        bool street = dc < 6.0;
        bool par = (u < -56.0 && u > -66.0) || (u < -91.0 && u > -100.0) || (u < -123.0 && u > -132.0);
        bool walk = (dc >= 6.0 && dc < 8.5) || (u < -53.5 && u > -68.5 && !par) || (u < -88.5 && u > -102.5 && !par) || (u < -120.5 && u > -134.5 && !par) || (u > -31.0);
        if (street || par) {
          col = asph;
          float cl = street ? pulse(dc, 0.0, 0.1, fw.y) * pulse(u / 6.0, 0.0, 0.5, fw.x / 6.0) : 0.0;
          col = mix(col, vec3(0.8, 0.78, 0.72), cl * 0.7);
        } else if (walk) {
          float tiles = pulse(u / 0.6, 0.0, 0.06, fw.x / 0.6) + pulse(v / 0.6, 0.0, 0.06, fw.y / 0.6);
          col = pave * (1.0 - 0.18 * clamp(tiles, 0.0, 1.0));
        } else {                                         // lots: worn paving, parking, a few lawns
          float lawn = smoothstep(0.6, 0.66, nz2);
          col = mix(vec3(0.42, 0.41, 0.38) * (0.85 + 0.3 * nz), vec3(0.16, 0.24, 0.1) * (0.8 + 0.4 * nz), lawn);
          float stalls = pulse(v / 2.6, 0.0, 0.05, fw.y / 2.6) * (1.0 - lawn) * step(0.5, fract(nz2 * 7.0));
          col = mix(col, vec3(0.75), stalls * 0.6);
        }
      }
      diffuseColor.rgb *= col;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (uGround > 0.0) totalEmissiveRadiance += bbody(clamp(uGround * (0.5 + 0.5 * bfbmAA(vTW.xz * 0.07, max(fwidth(vTW.x), fwidth(vTW.z)) * 0.07)), 0.0, 1.0)) * uGround * 1.2;`);
  };
  mat.customProgramCacheKey = () => 'town_ground_v1';
  mat.polygonOffset = true; mat.polygonOffsetFactor = 1; mat.polygonOffsetUnits = 1;
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true;
  // curbs: between the promenade and the bike lane, and on both sides of the avenue
  const curbG = [];
  for (const u of [-9.0, -10.8, -24.0]) {
    for (let z = -470; z < 300; z += 6) {
      const x0 = promX(z) + u, x1 = promX(z + 6) + u, L = Math.hypot(x1 - x0, 6);
      if (u !== -9.0 && cross.some((c) => Math.abs(z + 3 - c) < 6)) continue;    // the avenue's curbs open at the cross streets
      const b = new THREE.BoxGeometry(0.2, 0.14, L); b.rotateY(Math.atan2(x1 - x0, 6)); b.translate((x0 + x1) / 2, PROM_Y + 0.07, z + 3); curbG.push(b);
    }
  }
  const curbs = new THREE.Mesh(mergeGeometries(curbG), new THREE.MeshStandardMaterial({ color: '#b9b5ad', roughness: 0.85 }));
  curbs.receiveShadow = true;
  const grp = new THREE.Group(); grp.add(m, curbs);
  return { group: grp, mat };
}

// ---------------------------------------------------------------------------------------------------------------
// buildings
// ---------------------------------------------------------------------------------------------------------------
const PASTEL = ['vec3(0.86, 0.82, 0.7)', 'vec3(0.9, 0.82, 0.55)', 'vec3(0.86, 0.66, 0.6)', 'vec3(0.62, 0.74, 0.82)', 'vec3(0.66, 0.8, 0.7)', 'vec3(0.88, 0.86, 0.83)', 'vec3(0.84, 0.72, 0.56)'];
// wall colours by style and hue (GLSL for the facades, JS for the parapets and slabs so they match their building):
// beachfront towers in warm white, cream, grey, peach, pale blue or sand; modern towers in white, warm or dark grey or
// terracotta panels; office glass with blue-green, bronze or grey spandrels; pastel blocks and houses
const WALLS = {
  0: [[0.35, [0.66, 0.64, 0.6]], [0.55, [0.7, 0.63, 0.5]], [0.7, [0.56, 0.57, 0.58]], [0.82, [0.7, 0.52, 0.43]], [0.92, [0.52, 0.58, 0.65]], [1.01, [0.62, 0.55, 0.44]]],
  2: [[0.4, [0.15, 0.22, 0.25]], [0.7, [0.22, 0.2, 0.18]], [1.01, [0.2, 0.22, 0.26]]],
  3: [[0.4, [0.62, 0.62, 0.6]], [0.65, [0.5, 0.49, 0.47]], [0.85, [0.25, 0.26, 0.28]], [1.01, [0.52, 0.32, 0.24]]],
};
const v3 = (c) => `vec3(${c.map((x) => x.toFixed(3)).join(', ')})`;
const WALL_GLSL = `vec3 wallCol(float st, float h){
      if (st < 0.5) { ${WALLS[0].map(([k, c]) => `if (h < ${k.toFixed(2)}) return ${v3(c)};`).join(' ')} }
      if (st < 1.5) return pastel(h) * 0.72;
      if (st < 2.5) { ${WALLS[2].map(([k, c]) => `if (h < ${k.toFixed(2)}) return ${v3(c)};`).join(' ')} }
      if (st < 3.5) { ${WALLS[3].map(([k, c]) => `if (h < ${k.toFixed(2)}) return ${v3(c)};`).join(' ')} }
      return pastel(h) * 0.76; }`;
const PASTEL_JS = PASTEL.map((c) => c.match(/[\d.]+/g).map(Number));
function wallColJS(st, h) {
  if (WALLS[st]) return WALLS[st].find(([k]) => h < k)[1];
  return PASTEL_JS[Math.min(6, Math.floor(h * 7))].map((x) => x * (st === 1 ? 0.72 : 0.76));
}
// the facade material (instanced boxes with aStyle = (style, tint, kind, hue) and aFace = along-street unit vector):
// window grids, rooms behind the glass, shops, cladding. baseY = street level; front = the direction the main facades
// face (balcony doors and shops always on that side)
export function makeFacadeMaterial({ baseY = PROM_Y, front = [1, 0], key = 'town_bld_v2', power = null } = {}) {
  const FACADE = `
    varying vec3 vTW; varying vec3 vTN; varying vec4 vSt; varying vec2 vFace;
    uniform float uTown;
    ${PULSE}
    vec3 bb2(float k){ vec3 c = mix(vec3(0.0), vec3(0.55, 0.03, 0.0), smoothstep(0.0, 0.25, k)); c = mix(c, vec3(1.0, 0.32, 0.04), smoothstep(0.2, 0.5, k));
      c = mix(c, vec3(1.0, 0.75, 0.35), smoothstep(0.45, 0.75, k)); return mix(c, vec3(1.0, 0.97, 0.92), smoothstep(0.7, 1.0, k)); }
    float bhT(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float bnT(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(bhT(i), bhT(i + vec2(1.0, 0.0)), f.x), mix(bhT(i + vec2(0.0, 1.0)), bhT(i + vec2(1.0, 1.0)), f.x), f.y); }
    vec3 pastel(float h){ int i = int(floor(h * 7.0));
      ${PASTEL.map((c, i) => `if (i == ${i}) return ${c};`).join(' ')} return ${PASTEL[0]}; }
    ${WALL_GLSL}
    // interior mapping: the room behind a window as a box (W wide, H high, D deep) seen through the glass, so every room
    // shows its back wall, side walls, floor and ceiling with true parallax as the camera moves. p = the point on the glass
    // in room coordinates, d = the view ray in face space (x along the wall, y up, z into the room). surf: 0 back wall,
    // 1 side wall, 2 floor, 3 ceiling.
    vec3 roomHit(vec2 p, vec3 d, float W, float H, float D, out float surf){
      d.x = abs(d.x) < 1e-4 ? 1e-4 : d.x; d.y = abs(d.y) < 1e-4 ? 1e-4 : d.y; d.z = max(d.z, 1e-3);
      float tx = ((d.x > 0.0 ? W : 0.0) - p.x) / d.x, ty = ((d.y > 0.0 ? H : 0.0) - p.y) / d.y, tz = D / d.z;
      float t = min(min(tx, ty), tz);
      surf = tz <= min(tx, ty) ? 0.0 : (tx < ty ? 1.0 : (d.y > 0.0 ? 3.0 : 2.0));
      return vec3(p, 0.0) + d * t; }
    // what the room looks like: kindR 0 a flat (paint, wooden or tiled floor, a sofa, a picture or a TV), 1 an office
    // (white walls, desks, a grid of ceiling panels), 2 a shop (shelves of colourful goods, white tiles, bright panels).
    // lampK: how much the room's lamp lights that point (ceiling lamp, inverse square), avg-normalised.
    vec3 roomCol(vec3 hp, float surf, vec2 rid, float W, float H, float D, float kindR, out float lampK){
      float r1 = th21(rid), r2 = th21(rid + 4.1), r3 = th21(rid + 7.7);
      vec3 paint = kindR > 0.5 ? vec3(0.82, 0.82, 0.8) : r1 < 0.3 ? vec3(0.8, 0.76, 0.66) : r1 < 0.55 ? vec3(0.84, 0.83, 0.8) : r1 < 0.68 ? vec3(0.6, 0.7, 0.72) : r1 < 0.82 ? vec3(0.78, 0.62, 0.48) : vec3(0.7, 0.74, 0.6);
      vec3 floorC = kindR > 1.5 ? vec3(0.78, 0.78, 0.76) : kindR > 0.5 ? vec3(0.32, 0.34, 0.38) : r2 < 0.55 ? vec3(0.45, 0.3, 0.18) : vec3(0.66, 0.64, 0.6);
      vec3 c = surf < 0.5 ? paint : surf < 1.5 ? paint * 0.84 : surf < 2.5 ? floorC : vec3(0.9);
      vec2 q = surf < 0.5 ? hp.xy : hp.zy;                                // the wall's own coordinates
      if (kindR < 0.5) {
        if (surf < 0.5) {
          float x0 = r3 * 0.35 * W;
          c = mix(c, mix(vec3(0.16, 0.14, 0.13), vec3(0.42, 0.24, 0.16), r2), step(q.y, 0.78) * step(x0, q.x) * step(q.x, x0 + 0.6 * W));   // sofa or cabinet
          float pic = step(1.2, q.y) * step(q.y, 1.75) * step(0.38 * W, q.x) * step(q.x, 0.62 * W);
          c = mix(c, r1 > 0.5 ? vec3(0.03, 0.03, 0.035) : vec3(0.55, 0.4, 0.3) * r3, pic * step(0.35, r2));   // a TV or a picture
        } else if (surf < 1.5) {
          c = mix(c, vec3(0.3, 0.22, 0.16), step(q.y, 2.0) * step(D * 0.55, q.x) * step(q.x, D * 0.85) * step(0.5, r3));   // a wardrobe or a door
        }
      } else if (kindR < 1.5) {
        if (surf < 1.5) c = mix(c, vec3(0.2, 0.21, 0.23), step(q.y, 0.74) * step(0.62, q.y));                       // desk tops
        if (surf > 2.5) c = mix(c, vec3(1.0), pulse(hp.x / 1.2, 0.1, 0.9, 0.05) * pulse(hp.z / 1.2, 0.2, 0.8, 0.05));   // ceiling panels
      } else {
        if (surf < 1.5) {                                                // shelves: rows of coloured goods
          float row = floor(q.y / 0.5), col = floor(q.x / 0.9);
          float h = th21(vec2(col, row) + rid * 3.0);
          vec3 good = h < 0.12 ? vec3(0.7, 0.2, 0.15) : h < 0.24 ? vec3(0.8, 0.66, 0.3) : h < 0.34 ? vec3(0.25, 0.4, 0.6) : h < 0.6 ? vec3(0.78, 0.76, 0.72) : vec3(0.55, 0.5, 0.46);
          float shelf = step(0.25, q.y) * step(q.y, 2.0);
          c = mix(c, good, shelf * step(fract(q.y / 0.5), 0.8));
          c = mix(c, vec3(0.3, 0.3, 0.32), shelf * step(0.8, fract(q.y / 0.5)));
        }
        if (surf > 2.5) c = mix(c, vec3(1.0), pulse(hp.x / 1.5, 0.15, 0.85, 0.05) * pulse(hp.z / 1.5, 0.35, 0.65, 0.05));
      }
      vec3 L = vec3(W * 0.5, H - 0.12, D * 0.45), dl = hp - L;
      lampK = (kindR > 0.5 ? 1.1 : 2.2) / (1.0 + (kindR > 0.5 ? 0.12 : 0.55) * dot(dl, dl)) + (surf > 2.5 ? 0.25 : 0.0);
      return c; }`;
  const mat = new THREE.MeshStandardMaterial({ color: '#d4d6dc', roughness: 0.82, metalness: 0, envMapIntensity: 0.7 });   // facades in the dusk shade: a little darker and cooler
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTown = BX.uTown; sh.uniforms.uRoomP = power || { value: 1 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aStyle; attribute vec2 aFace; varying vec3 vTW; varying vec3 vTN; varying vec4 vSt; varying vec2 vFace;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vTW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal); vSt = aStyle; vFace = aFace;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        ${FACADE}
        float gGlass, gLit, gRefl, gPar, gRec; vec3 gRoomE; uniform float uRoomP;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float vert = 1.0 - abs(vTN.y), st = vSt.x, tint = vSt.y, kind = vSt.z, hue = vSt.w;
        // the face's horizontal axis: the building's own along-street direction (vFace) or across it
        vec2 fa = normalize(vFace), fb = vec2(-fa.y, fa.x);
        bool endW = abs(dot(vTN.xz, fa)) > 0.5;                       // the end walls (across the street)
        float hz = endW ? dot(vTW.xz, fb) : dot(vTW.xz, fa), y = vTW.y - ${baseY.toFixed(2)};
        vec3 T3 = endW ? vec3(fb.x, 0.0, fb.y) : vec3(fa.x, 0.0, fa.y);
        vec3 Vd = normalize(vTW - cameraPosition);
        vec3 rd = vec3(dot(Vd, T3), Vd.y, -dot(Vd, normalize(vTN)));   // the view ray in face space (z into the building)
        bool sea = dot(vTN.xz, vec2(${front[0].toFixed(3)}, ${front[1].toFixed(3)})) > 0.7;                 // faces the beach (+x)
        float FH = st > 3.5 && st < 4.5 ? 3.0 : 2.9, fy = y / FH, fwy = fwidth(fy);
        // how big a window is on screen: interior detail fades to its average before it gets smaller than a few pixels
        float fwm = max(fwidth(hz) / 3.0, fwidth(y) / 2.9), idet = 1.0 - smoothstep(0.1, 0.3, fwm);
        // per-building character from its seeds: window grid, cladding (ceramic tiles, the Brazilian 'pastilhas'), bands
        float bs1 = fract(tint * 7.13), bs2 = fract(tint * 13.7 + hue * 3.1), bs3 = fract(hue * 9.3 + 0.37);
        float glass = 0.0, mull = 0.0, ac = 0.0, wcx = 3.2, frameK = 0.0, sill = 0.0, wx = 0.0, wy = 0.0, curtain = 0.0;
        float roomW = 3.2, kindR = 0.0; vec2 rp = vec2(0.0), rid = vec2(0.0); gPar = 0.0; gRec = 0.0;
        vec3 frameC = mix(vec3(0.82, 0.82, 0.8), vec3(0.3, 0.3, 0.32), step(0.6, bs3));
        if (st > 1.5 && st < 2.5) {                                   // glass curtain wall (offices)
          wcx = 1.5; float fx = hz / wcx, fwx = fwidth(fx);
          mull = pulse(fx, 0.0, 0.05, fwx); glass = (1.0 - mull) * (1.0 - pulse(fy, 0.0, 0.3, fwy));
          wx = fract(fx); wy = clamp((fract(fy) - 0.3) / 0.7, 0.0, 1.0);
          roomW = 3.0; kindR = 1.0;
        } else if (sea && (st < 0.5 || (st > 2.5 && st < 3.5))) {     // balcony doors behind the parapets
          wcx = 1.6; float fx = hz / wcx, fwx = fwidth(fx);
          glass = pulse(fy, 0.4, 0.93, fwy) * (1.0 - pulse(fx, 0.0, 0.05, fwx));
          wx = fract(fx); wy = clamp((fract(fy) - 0.4) / 0.53, 0.0, 1.0);
          mull = pulse(fx, 0.0, 0.05, fwx) * pulse(fy, 0.4, 0.93, fwy);
          roomW = 3.2;
        } else {                                                      // punched windows: frame, sliding panes, sill, AC unit
          wcx = (st > 3.5 ? 2.6 : 2.8) + bs1 * 0.9; float fx = hz / wcx, fwx = fwidth(fx);
          // a rhythm of window types across the facade, repeated every P columns: a loggia (a recessed balcony with a
          // parapet) on some blocks, bedroom and living-room windows, a small high bathroom window
          float P = 3.0 + floor(bs2 * 3.0), kc = mod(floor(fx) + floor(tint * 5.0), P);
          float logg = (kc < 0.5 && bs3 > 0.45 && st < 3.5) ? 1.0 : 0.0, bath = (kc > P - 1.5 && P > 3.5) ? 1.0 : 0.0;
          float x0 = 0.24 - bs2 * 0.06, x1 = 1.0 - x0, y0 = 0.34 + bs3 * 0.05, y1 = 0.82;
          if (logg > 0.5) { x0 = 0.07; x1 = 0.93; y0 = 0.03; y1 = 0.9; }
          else if (bath > 0.5) { x0 = 0.38; x1 = 0.62; y0 = 0.6; y1 = 0.82; }
          float fr = logg > 0.5 ? 0.012 : 0.018;
          float open = pulse(fx, x0, x1, fwx) * pulse(fy, y0, y1, fwy);
          float inner = pulse(fx, x0 + fr, x1 - fr, fwx) * pulse(fy, y0 + fr * 1.4, y1 - fr * 1.2, fwy);
          frameK = open - inner;
          wx = clamp((fract(fx) - x0) / (x1 - x0), 0.0, 1.0); wy = clamp((fract(fy) - y0) / (y1 - y0), 0.0, 1.0);
          mull = pulse(fx, 0.5 - 0.01, 0.5 + 0.01, fwx) * open * (1.0 - bath);   // where the two sliding panes meet
          glass = inner * (1.0 - mull);
          sill = pulse(fx, x0 - 0.03, x1 + 0.03, fwx) * pulse(fy, y0 - 0.045, y0 - 0.005, fwy) * (1.0 - logg);
          float hasAC = step(0.55, th21(floor(vec2(hz / wcx, fy)) + tint * 13.0)) * step(1.0, fy) * (1.0 - bath) * (1.0 - logg);
          ac = hasAC * pulse(fx, 0.3, 0.6, fwx) * pulse(fy, 0.12, 0.27, fwy) * (st > 0.5 && st < 1.5 || st > 3.5 ? 1.0 : 0.0);
          // the loggia: a solid parapet across the bottom, the recess ceiling's shadow along the top
          gPar = logg * pulse(fy, 0.0, 0.36, fwy) * pulse(fx, 0.04, 0.96, fwx);
          gRec = logg * pulse(fy, 0.36, 0.9, fwy) * pulse(fx, x0, x1, fwx);
          roomW = wcx;
        }
        rp = vec2(fract(hz / roomW) * roomW, fract(fy) * FH); rid = vec2(floor(hz / roomW), floor(fy)) + floor(vTW.xz * 0.011) * 17.0;
        float ground = 1.0 - step(1.0, fy);                           // the ground floor
        float winOK = vert * (1.0 - ground) * (1.0 - step(0.5, kind) * (1.0 - step(1.5, kind)));   // roof boxes: no windows
        glass *= winOK; frameK *= winOK; sill *= winOK; mull *= winOK;
        vec3 wall = wallCol(st, hue);
        gRefl = st > 1.5 && st < 2.5 ? 1.0 : 0.0;
        // ceramic tile cladding on some blocks: a fine grid of small tiles, each a slightly different shade (fades to its mean far away)
        if ((st > 0.5 && st < 1.5 || st > 3.5) && bs1 < 0.42) {
          vec3 tileC = bs2 < 0.3 ? vec3(0.42, 0.55, 0.66) : bs2 < 0.55 ? vec3(0.7, 0.62, 0.5) : bs2 < 0.75 ? vec3(0.52, 0.4, 0.32) : vec3(0.76, 0.75, 0.72);
          vec2 tg = vec2(hz, y) / 0.11; vec2 tfw = fwidth(tg);
          float grout = 1.0 - pulse(tg.x, 0.0, 0.88, tfw.x) * pulse(tg.y, 0.0, 0.88, tfw.y);
          float var = mix(th21(floor(tg)) - 0.5, 0.0, smoothstep(0.3, 0.8, max(tfw.x, tfw.y)));
          wall = tileC * (1.0 + 0.08 * var) * (1.0 - 0.12 * grout);
        }
        // floor slab bands
        float slabB = (st > 0.5 && st < 1.5 || st > 3.5) ? pulse(fy, 0.0, 0.09, fwy) * step(0.35, bs3) : 0.0;
        wall = mix(wall, vec3(0.78, 0.77, 0.74), slabB * 0.8);
        wall *= 0.95 + 0.08 * bnT(vec2(hz * 0.04, y * 0.03) + tint * 7.0);    // weathering: broad, soft
        wall *= 1.0 - 0.12 * smoothstep(0.45, 0.8, bnT(vec2(hz * 0.7, y * 0.025 + tint * 13.0))) * (1.0 - smoothstep(0.3, 1.0, fwidth(hz) * 0.7));   // rain streaks
        wall = mix(wall, vec3(0.35, 0.37, 0.4), mull * 0.7);
        wall = mix(wall, frameC, clamp(frameK, 0.0, 1.0));
        wall = mix(wall, vec3(0.8, 0.79, 0.76), clamp(sill, 0.0, 1.0) * 0.9);
        wall = mix(wall, vec3(0.8, 0.8, 0.78), ac);
        if (vTN.y > 0.5) wall = vec3(0.42, 0.41, 0.4);
        gPar *= winOK; gRec *= winOK;
        glass *= 1.0 - gPar;                                          // the parapet hides the bottom of the loggia's glass door
        wall = mix(wall, wallCol(st, hue) * 0.93, gPar);
        float ao = mix(0.62, 1.0, smoothstep(0.0, 26.0, y));
        ao *= 1.0 - gRec * 0.45 * smoothstep(0.55, 0.9, fract(fy));   // under the loggia's ceiling
        if (sea && (st < 0.5 || (st > 2.5 && st < 3.5))) ao *= mix(1.0, 0.5, smoothstep(0.3, 1.0, fract(fy)));
        // shops on the ground floor: a lit shop behind the glass, a sign band in one of a few colours
        float shop = ground * vert * (1.0 - step(0.5, kind) * (1.0 - step(1.5, kind))) * step(0.5, fract(tint * 3.0 + 0.2) + (sea ? 1.0 : 0.0));
        float shW = 8.0 + bs2 * 4.0, sx = hz / shW, sfw = fwidth(sx); float sid = floor(sx) + tint * 31.0;
        float band = pulse(fy, 0.74, 0.92, fwy), win = pulse(fy, 0.04, 0.68, fwy) * pulse(sx, 0.06, 0.94, sfw), post = pulse(sx, 0.47, 0.53, sfw) * win;
        float sc = th21(vec2(sid, 1.0));
        vec3 signC = sc < 0.2 ? vec3(0.62, 0.1, 0.08) : sc < 0.4 ? vec3(0.1, 0.24, 0.52) : sc < 0.55 ? vec3(0.1, 0.38, 0.2) : sc < 0.75 ? vec3(0.85, 0.68, 0.16) : vec3(0.82, 0.8, 0.76);
        float shopG = shop * win * (1.0 - post);
        if (shopG > 0.0) { roomW = shW; kindR = 2.0; rp = vec2(fract(sx) * shW, fract(fy) * FH); rid = vec2(sid, 0.0); }
        wall = mix(wall, mix(vec3(0.25), signC, band), shop * max(band, post));
        wall *= ao;
        // the room behind the glass
        float surf, lampK; vec3 hp = roomHit(rp, rd, roomW, FH, kindR > 1.5 ? 7.0 : kindR > 0.5 ? 5.5 : 4.5, surf);
        vec3 ic = roomCol(hp, surf, rid, roomW, FH, kindR > 1.5 ? 7.0 : kindR > 0.5 ? 5.5 : 4.5, kindR, lampK);
        vec3 icAvg = kindR > 1.5 ? vec3(0.62, 0.55, 0.5) : kindR > 0.5 ? vec3(0.6, 0.6, 0.6) : vec3(0.62, 0.56, 0.48);
        float depthK = mix(1.0, 0.3, hp.z / (kindR > 1.5 ? 7.0 : kindR > 0.5 ? 5.5 : 4.5));   // daylight from the window falls off inside
        ic = mix(icAvg, ic, idet); lampK = mix(1.0, lampK, idet); depthK = mix(0.6, depthK, idet);
        float allG = max(glass, shopG);
        gGlass = allG;
        vec2 cell = floor(vec2(hz / wcx, fy)) + floor(vTW.xz * 0.011) * 17.0;
        float h1 = th21(cell), hc = th21(cell + 11.3);
        gLit = step(0.66, h1) * (0.55 + 0.45 * th21(cell + 3.1));
        float cool = step(0.86, th21(cell + 5.7)) + (kindR > 0.5 && kindR < 1.5 ? 1.0 : 0.0);   // a few cool white rooms (LED, TV), the offices
        curtain = hc < 0.3 ? (1.0 - pulse(wx, 0.3, 0.7, fwidth(wx))) : hc < 0.42 ? 1.0 : 0.0;   // open or drawn curtains
        float blinds = step(0.9, hc) * pulse(wy * 14.0, 0.0, 0.5, fwidth(wy * 14.0));
        float cov = clamp(curtain + blinds * 0.6, 0.0, 1.0) * 0.85 * (1.0 - step(1.5, kindR)) * (1.0 - gRefl * 0.7);
        vec3 glassCol = ic * depthK * 0.32;                           // an unlit room: only the light through its window
        glassCol = mix(glassCol, mix(vec3(0.62, 0.56, 0.46), vec3(0.6, 0.62, 0.64), step(0.5, th21(cell + 2.2))) * 0.45, cov);
        if (gRefl > 0.5) glassCol = mix(glassCol, vec3(0.16, 0.26, 0.3), 0.6);   // tinted, mirrored office glass
        diffuseColor.rgb *= mix(wall, glassCol * mix(1.0, ao, 0.6), allG) * (vTN.y > 0.5 ? 1.0 : 0.88);   // in the shade: below the sunlit sand
        gLit = kindR > 1.5 ? (0.55 + 0.45 * step(0.3, th21(vec2(sid, 9.0)))) : gLit * glass * (1.0 - 0.45 * cov) * (1.0 - 0.5 * gRefl);
        gLit *= allG;
        gRoomE = mix(vec3(1.0, 0.66, 0.36), vec3(0.8, 0.86, 1.0), clamp(cool, 0.0, 1.0)) * mix(ic * lampK, vec3(0.75), cov) * (kindR > 1.5 ? 0.9 : 1.0);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.06, gGlass);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.5, gGlass * gRefl);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float fwm2 = max(fwidth(vTW.x + vTW.z) / 3.0, fwidth(vTW.y) / 2.9);
        float sub = smoothstep(0.35, 0.9, fwm2);
        float avg = 0.34 * 0.6 * 0.5 * step(1.0, (vTW.y - ${baseY.toFixed(2)}) / 2.9) * (1.0 - abs(vTN.y)) * (1.0 - step(0.5, vSt.z) * (1.0 - step(1.5, vSt.z)));
        totalEmissiveRadiance += mix(gLit * gRoomE, vec3(1.0, 0.7, 0.42) * avg, sub) * 1.45 * uRoomP;
        float tk = uTown * (0.75 + 0.25 * bnT(vTW.xy * 0.08 + vTW.zy * 0.05)) * (0.6 + 0.4 * smoothstep(0.0, 40.0, vTW.y - 2.5));
        totalEmissiveRadiance += (bb2(clamp(tk * 0.8, 0.0, 1.0)) * tk * tk * 1.1 + vec3(1.0, 0.5, 0.2) * gGlass * smoothstep(0.0, 0.4, uTown) * 1.3);`);
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}
export function makeBuildings(layout) {
  const group = new THREE.Group(), r = rng(31);
  const mat = makeFacadeMaterial();
  // instances: cores (kind 0), roof boxes (1), podiums (2)
  const inst = [], slabs = [], rails = [], roofs = [], tanks = [], ants = [];
  for (const b of layout.blds) {
    const z = b.zc, xFront = promX(z) + b.u0, ang = Math.atan2(promX(z + 1) - promX(z - 1), 2);   // the row follows the bay's curve
    const h = b.style === 4 ? b.fl * 3.0 + 0.6 : b.fl * 2.9 + 1.2, bal = b.style === 0 || b.style === 3, dx = bal ? 1.6 : 0;
    const cx = xFront - b.d / 2 - dx / 2 * 0;
    const face = [Math.sin(ang), Math.cos(ang)];   // along-street unit vector in xz
    inst.push({ x: xFront - (bal ? (b.d + dx) / 2 : b.d / 2), y: PROM_Y + h / 2, z, sx: b.d - (bal ? dx : 0), sy: h, sz: b.w, ang, st: b.style, tint: b.tint, kind: 0, hue: b.hue, face });
    b.fx = xFront - (bal ? dx : 0); b.h = h; b.ang = ang;
    if (b.podium) inst.push({ x: xFront - (b.d + 2) / 2 + 1.0, y: PROM_Y + 3.6, z, sx: b.d + 2, sy: 7.2, sz: b.w + 4, ang, st: 5, tint: b.tint, kind: 2, hue: b.hue, face });
    if (b.style === 4) {
      roofs.push({ x: xFront - b.d / 2, y: PROM_Y + h, z, d: b.d + 0.6, w: b.w + 0.6, ang });
      for (let k = 0; k < 1 + Math.floor(b.seed * 2); k++) tanks.push([xFront - b.d * (0.42 + 0.16 * r()), PROM_Y + h + b.d * 0.3 + 0.6, z + (r() - 0.5) * b.w * 0.6, 0.7 + r() * 0.3]);
    } else {
      const rw = b.w * (0.3 + 0.2 * r()), rd = b.d * (0.35 + 0.2 * r()), rh = 3.2 + r() * 2.5;
      inst.push({ x: xFront - b.d / 2 - (r() - 0.5) * 3, y: PROM_Y + h + rh / 2, z: z + (r() - 0.5) * (b.w - rw) * 0.6, sx: rd, sy: rh, sz: rw, ang, st: b.style, tint: b.tint, kind: 1, hue: b.hue, face });
      if (r() < 0.6) tanks.push([xFront - b.d * (0.25 + 0.5 * r()), PROM_Y + h + 0.95, z + (r() - 0.5) * b.w * 0.5, 0.9 + r() * 0.5]);
      if (r() < 0.5) ants.push([xFront - b.d * (0.3 + 0.4 * r()), PROM_Y + h + rh, z + (r() - 0.5) * rw, 3 + r() * 6]);
    }
    if (bal) {
      const bw = b.w * 0.94, wc = wallColJS(b.style, b.hue);
      const sc = new THREE.Color(wc[0] * 0.658 * 1.1, wc[1] * 0.672 * 1.1, wc[2] * 0.716 * 1.1);   // the parapets in the building's own colour
      const rc = new THREE.Color(['#4f6466', '#3f5670', '#5a5f63', '#47615a'][Math.floor(b.seed * 4)]);
      for (let f = 1; f < b.fl; f++) {
        const y0 = PROM_Y + f * 2.9;
        if (b.style === 0) slabs.push([b.fx + 0.8, y0 + 0.55, z, 1.6, 1.1, bw, ang, sc]);
        else { slabs.push([b.fx + 0.8, y0 + 0.1, z, 1.6, 0.2, bw, ang, sc]); rails.push([b.fx + 1.57, y0 + 0.65, z, 0.04, 0.9, bw, ang, rc]); }
      }
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const im = new THREE.InstancedMesh(box.clone(), mat, inst.length);
  const sty = new Float32Array(inst.length * 4), fac = new Float32Array(inst.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  inst.forEach((o, i) => { q.setFromAxisAngle(up, o.ang); m4.compose(new THREE.Vector3(o.x, o.y, o.z), q, new THREE.Vector3(o.sx, o.sy, o.sz)); im.setMatrixAt(i, m4); sty.set([o.st, o.tint, o.kind, o.hue], i * 4); fac.set(o.face, i * 2); });
  im.geometry.setAttribute('aStyle', new THREE.InstancedBufferAttribute(sty, 4)); im.geometry.setAttribute('aFace', new THREE.InstancedBufferAttribute(fac, 2));
  im.computeBoundingSphere(); im.receiveShadow = true; group.add(im);
  const slabMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.06, metalness: 0.35, envMapIntensity: 1.2 });
  for (const [arr, m] of [[slabs, slabMat], [rails, railMat]]) {
    if (!arr.length) continue;
    const bm = new THREE.InstancedMesh(box.clone(), m, arr.length);
    arr.forEach(([x, y, z, sx, sy, sz, ang, c], i) => { q.setFromAxisAngle(up, ang); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)); bm.setMatrixAt(i, m4); bm.setColorAt(i, c); });
    bm.computeBoundingSphere(); bm.receiveShadow = true; group.add(bm);
  }
  // terracotta roofs (a ridge along the building) and blue water tanks, antennas
  const rs = new THREE.Shape(); rs.moveTo(-0.5, 0); rs.lineTo(0.5, 0); rs.lineTo(0, 0.5); rs.lineTo(-0.5, 0);   // a gable: triangle across the depth, ridge along the street
  const roofG = new THREE.ExtrudeGeometry(rs, { depth: 1, bevelEnabled: false }); roofG.translate(0, 0, -0.5);
  const roofMat = new THREE.MeshStandardMaterial({ color: '#9c4a2c', roughness: 0.8 });
  const rm = new THREE.InstancedMesh(roofG, roofMat, Math.max(1, roofs.length));
  roofs.forEach((o, i) => { q.setFromAxisAngle(up, o.ang); m4.compose(new THREE.Vector3(o.x, o.y, o.z), q, new THREE.Vector3(o.d, o.d * 0.6, o.w)); rm.setMatrixAt(i, m4); });
  rm.count = roofs.length; rm.computeBoundingSphere(); rm.castShadow = true; rm.receiveShadow = true; group.add(rm);
  const tankG = new THREE.CylinderGeometry(0.75, 0.62, 1.3, 16); const tankMat = new THREE.MeshStandardMaterial({ color: '#2f6fb0', roughness: 0.5 });
  const tm = new THREE.InstancedMesh(tankG, tankMat, Math.max(1, tanks.length));
  tanks.forEach(([x, y, z, s], i) => { m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); tm.setMatrixAt(i, m4); });
  tm.count = tanks.length; tm.computeBoundingSphere(); group.add(tm);
  const antG = new THREE.CylinderGeometry(0.04, 0.06, 1, 6); antG.translate(0, 0.5, 0);
  const am = new THREE.InstancedMesh(antG, new THREE.MeshStandardMaterial({ color: '#555a60', roughness: 0.5, metalness: 0.6 }), Math.max(1, ants.length));
  ants.forEach(([x, y, z, hh], i) => { m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, hh, 1)); am.setMatrixAt(i, m4); });
  am.count = ants.length; am.computeBoundingSphere(); group.add(am);
  return { group, mat, slabMat, railMat, roofMat };
}

// ---------------------------------------------------------------------------------------------------------------
// cars: extruded side profiles, glass greenhouse, wheels, lights on; they drive until the decay, then freeze
// ---------------------------------------------------------------------------------------------------------------
const CAR_TYPES = {
  sedan: { L: 4.55, W: 1.8, R: 0.32, wx: [0.95, 3.7], bot: 0.32,
    body: [[0.05, 0.32], [0, 0.5], [0.06, 0.66], [0.5, 0.75], [1.0, 0.81], [1.55, 0.86], [3.75, 0.9], [4.3, 0.88], [4.52, 0.8], [4.55, 0.55], [4.5, 0.32]],
    cab: [[1.55, 0.86], [2.3, 1.36], [2.5, 1.42], [3.25, 1.42], [3.55, 1.3], [3.85, 0.9]] },
  hatch: { L: 3.95, W: 1.72, R: 0.31, wx: [0.85, 3.2], bot: 0.32,
    body: [[0.05, 0.32], [0, 0.5], [0.06, 0.66], [0.5, 0.75], [0.95, 0.81], [1.35, 0.86], [3.8, 0.9], [3.93, 0.8], [3.95, 0.55], [3.9, 0.32]],
    cab: [[1.35, 0.86], [2.05, 1.4], [2.25, 1.45], [3.55, 1.45], [3.85, 1.25], [3.9, 0.9]] },
  suv: { L: 4.6, W: 1.88, R: 0.37, wx: [1.0, 3.75], bot: 0.4,
    body: [[0.05, 0.4], [0, 0.6], [0.06, 0.82], [0.5, 0.93], [1.0, 0.98], [1.45, 1.02], [4.45, 1.06], [4.58, 0.95], [4.6, 0.65], [4.55, 0.4]],
    cab: [[1.45, 1.02], [2.1, 1.62], [2.3, 1.68], [4.25, 1.68], [4.45, 1.5], [4.52, 1.06]] },
};
// the body's side outline with the wheel arches cut out of its bottom edge (so the tyres show)
function bodyShape(T) {
  const s = new THREE.Shape(), pts = T.body;
  s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  const Ra = T.R + 0.06;
  for (const wx of [...T.wx].sort((x, y) => y - x)) { s.lineTo(wx + Ra, T.bot); s.absarc(wx, T.bot, Ra, 0, Math.PI, false); }
  s.lineTo(pts[0][0], pts[0][1]);
  return s;
}
function extrudeShape(shape, width, bevel = 0.05, segs = 3) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: segs, curveSegments: 10 });
  g.translate(0, 0, -(width - 2 * bevel) / 2); return g;
}
function extrudeProfile(pts, width, bevel = 0.05) {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  return extrudeShape(s, width, bevel);
}
// a soft contact shadow under every vehicle (a rounded rectangle that fades out), so nothing floats on the road
let SHADOW_TEX = null;
function shadowTex() {
  if (SHADOW_TEX) return SHADOW_TEX;
  SHADOW_TEX = canvasTex(128, 128, (g, w, h) => {
    const im = g.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const u = (i + 0.5) / w - 0.5, v = (j + 0.5) / h - 0.5, dx = Math.max(Math.abs(u) - 0.3, 0), dy = Math.max(Math.abs(v) - 0.28, 0);
      const d = Math.hypot(dx, dy), a = Math.exp(-Math.pow(d / 0.09, 2)) * (Math.abs(u) < 0.5 && Math.abs(v) < 0.5 ? 1 : 0);
      const k = (j * w + i) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = 0; im.data[k + 3] = Math.round(255 * a);
    }
    g.putImageData(im, 0, 0);
  }, { linear: true });
  return SHADOW_TEX;
}
function contactShadow(L, W, k = 0.62) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshBasicMaterial({ map: shadowTex(), color: '#000', transparent: true, opacity: k, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 1; return m;
}
// a city bus: white body, a coloured livery band, a dark window band with pillars, two doors (all painted on its sides)
function busTex(livery) {
  return canvasTex(1024, 256, (g, w, h) => {
    const X = (x) => (x / 12) * w, Y = (y) => ((3 - y) / 3) * h;
    g.fillStyle = '#e8e8e4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3d42'; g.fillRect(0, Y(0.62), w, Y(0.4) - Y(0.62));
    g.fillStyle = livery; g.beginPath(); g.moveTo(0, Y(1.08)); g.lineTo(X(7), Y(1.08)); g.quadraticCurveTo(X(9.5), Y(1.1), X(12), Y(2.0)); g.lineTo(X(12), Y(0.72)); g.lineTo(0, Y(0.72)); g.fill();
    g.fillStyle = '#2f9a4a'; g.fillRect(0, Y(1.17), X(7), Y(1.11) - Y(1.17));
    g.fillStyle = '#14181c'; g.fillRect(X(0.1), Y(2.6), X(11.85) - X(0.1), Y(1.32) - Y(2.6));                    // the window band
    g.fillStyle = '#d9d9d5'; for (let x = 1.55; x < 11.8; x += 1.42) g.fillRect(X(x), Y(2.6), X(0.1), Y(1.32) - Y(2.6));   // pillars
    g.fillStyle = 'rgba(160,190,210,0.18)'; for (let x = 0.2; x < 11.8; x += 1.42) { g.beginPath(); g.moveTo(X(x), Y(2.55)); g.lineTo(X(x + 0.5), Y(2.55)); g.lineTo(X(x + 0.2), Y(1.4)); g.lineTo(X(x - 0.3), Y(1.4)); g.fill(); }   // sky glints
    for (const [x0, x1] of [[0.35, 1.35], [5.4, 6.6]]) {                                                     // doors
      g.fillStyle = '#c9c9c4'; g.fillRect(X(x0 - 0.05), Y(2.65), X(x1 + 0.05) - X(x0 - 0.05), Y(0.45) - Y(2.65));
      g.fillStyle = '#171b1f'; g.fillRect(X(x0), Y(2.6), X(x1) - X(x0), Y(0.5) - Y(2.6));
      g.fillStyle = '#9a9a96'; g.fillRect(X((x0 + x1) / 2) - 2, Y(2.6), 4, Y(0.5) - Y(2.6));
    }
    g.fillStyle = '#ffb300'; g.fillRect(X(10.6), Y(2.85), X(11.6) - X(10.6), Y(2.68) - Y(2.85));             // a route number over the back window
  });
}
function makeBus(livery) {
  const L = 12, W = 2.55, grp = new THREE.Group(), R = 0.5, bot = 0.42;
  const s = new THREE.Shape(); s.moveTo(0, bot); s.lineTo(0, 2.75); s.quadraticCurveTo(0.02, 2.95, 0.2, 2.96); s.lineTo(11.8, 2.96); s.quadraticCurveTo(11.98, 2.95, 12, 2.78); s.lineTo(12, bot);
  for (const wx of [9.3, 2.6]) { s.lineTo(wx + R + 0.08, bot); s.absarc(wx, bot, R + 0.08, 0, Math.PI, false); }
  s.lineTo(0, bot);
  const tex = busTex(livery); tex.repeat.set(1 / 12, 1 / 3);
  const side = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const plain = new THREE.MeshPhysicalMaterial({ color: '#e8e8e4', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const body = new THREE.Mesh(extrudeShape(s, W, 0.08, 2), [side, plain]); grp.add(body);
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#0b0e12', roughness: 0.05, clearcoat: 1 });
  const ws = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.35, W - 0.24), glassM); ws.position.set(-0.01, 1.95, 0); grp.add(ws);   // windscreen
  const rw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, W - 0.4), glassM); rw.position.set(12.01, 2.05, 0); grp.add(rw);    // rear window
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 1.7), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ff9a1a', emissiveIntensity: 2.2 })); sign.position.set(-0.02, 2.76, 0); grp.add(sign);
  const ac = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.28, 1.7), new THREE.MeshStandardMaterial({ color: '#cfd0cc', roughness: 0.6 })); ac.position.set(4.2, 3.08, 0); grp.add(ac);
  const tyre = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: '#b8bcc2', metalness: 0.9, roughness: 0.3 });
  for (const x of [2.6, 9.3]) for (const sd of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.3, 22), tyre); w.rotation.x = Math.PI / 2; w.position.set(x, R, sd * (W / 2 - 0.22)); grp.add(w);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.55, R * 0.55, 0.02, 18), rim); h.rotation.x = Math.PI / 2; h.position.set(x, R, sd * (W / 2 - 0.06)); grp.add(h);
  }
  const head = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#fff1d6', emissiveIntensity: 5 }), tail = new THREE.MeshStandardMaterial({ color: '#200', emissive: '#ff1a10', emissiveIntensity: 3 });
  for (const sd of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.3), head); hl.position.set(-0.02, 0.75, sd * (W / 2 - 0.3)); grp.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.16), tail); tl.position.set(12.02, 1.0, sd * (W / 2 - 0.15)); grp.add(tl);
  }
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  grp.children.forEach((c) => { c.position.x -= L / 2; });
  grp.add(contactShadow(L + 1.0, W + 0.9));
  return { group: grp, L, paint: plain };
}
export function makeCar(type, color, r) {
  if (type === 'bus') return makeBus(['#1d5fae', '#1f8a4c', '#d9661f', '#b3262a'][Math.floor(r() * 4)]);
  const T = CAR_TYPES[type], grp = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#0b0e12', metalness: 0.2, roughness: 0.06, clearcoat: 1 });
  const trim = new THREE.MeshStandardMaterial({ color: '#1b1c1e', roughness: 0.6 });
  const body = new THREE.Mesh(extrudeShape(bodyShape(T), T.W, 0.09, 3), paint);
  const cab = new THREE.Mesh(extrudeProfile(T.cab, T.W - 0.2, 0.06), glassM);
  const roofPts = [[T.cab[1][0] + 0.06, T.cab[1][1] - 0.02], [T.cab[2][0], T.cab[2][1] + 0.025], [T.cab[3][0], T.cab[3][1] + 0.025], [T.cab[4][0] - 0.04, T.cab[4][1] - 0.02]];
  const roof = new THREE.Mesh(extrudeProfile(roofPts, T.W - 0.16, 0.05), paint);
  grp.add(body, cab, roof);
  // bumpers, a grille, door lines and mirrors in black trim
  const bh = T.bot + 0.1;
  const fb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, T.W - 0.06), trim); fb.position.set(0.02, bh, 0); grp.add(fb);
  const rb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, T.W - 0.06), trim); rb.position.set(T.L - 0.02, bh, 0); grp.add(rb);
  const gr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, T.W * 0.45), trim); gr.position.set(0.0, T.body[2][1] - 0.06, 0); grp.add(gr);
  for (const sd of [-1, 1]) {
    const mr = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.14), paint); mr.position.set(T.cab[0][0] + 0.25, T.cab[0][1] + 0.12, sd * (T.W / 2 + 0.04)); grp.add(mr);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(T.wx[1] - T.wx[0] - 2 * T.R - 0.2, 0.09, 0.03), trim); sill.position.set((T.wx[0] + T.wx[1]) / 2, T.bot + 0.06, sd * (T.W / 2 - 0.0)); grp.add(sill);
  }
  const tyre = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: '#b8bcc2', metalness: 0.9, roughness: 0.3 });
  for (const x of T.wx) for (const sd of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(T.R, T.R, 0.22, 20), tyre); w.rotation.x = Math.PI / 2; w.position.set(x, T.R, sd * (T.W / 2 - 0.17)); grp.add(w);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(T.R * 0.62, T.R * 0.62, 0.02, 16), rim); h.rotation.x = Math.PI / 2; h.position.set(x, T.R, sd * (T.W / 2 - 0.055)); grp.add(h);
  }
  const head = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#fff1d6', emissiveIntensity: 5 }), tail = new THREE.MeshStandardMaterial({ color: '#200', emissive: '#ff1a10', emissiveIntensity: 3 });
  const hy = T.body[2][1] - 0.04, ty = T.body[T.body.length - 3][1] - 0.08;
  for (const sd of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.3), head); hl.position.set(0.04, hy, sd * (T.W / 2 - 0.28)); grp.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.32), tail); tl.position.set(T.L - 0.03, ty, sd * (T.W / 2 - 0.24)); grp.add(tl);
  }
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // centre: origin at the middle of the car on the ground, heading +x
  grp.children.forEach((c) => { c.position.x -= T.L / 2; });
  grp.add(contactShadow(T.L + 0.9, T.W + 0.8));
  return { group: grp, L: T.L, paint };
}
export function makeCars(cross, seed = 12) {
  const r = rng(seed), group = new THREE.Group(), cars = [];
  const COLS = ['#e9e9e6', '#e9e9e6', '#c9ccd0', '#c9ccd0', '#1c1e21', '#1c1e21', '#8a1c1c', '#24406e', '#5d6168', '#d8d3c4'];
  const lanes = [[-12.45, -1], [-15.75, -1], [-19.05, 1], [-22.35, 1]];   // Brazil drives on the right: toward +z on the inland lanes
  lanes.forEach(([u, dir], li) => {
    let v = -470 + r() * 30;
    while (v < 290) {
      const type = r() < 0.04 ? 'bus' : r() < 0.25 ? 'suv' : r() < 0.55 ? 'hatch' : 'sedan';
      const c = makeCar(type, COLS[Math.floor(r() * COLS.length)], r);
      cars.push({ ...c, u, dir, v0: v, speed: (9 + r() * 4) * (li % 2 ? 0.9 : 1), moving: true });
      group.add(c.group);
      v += c.L + 9 + r() * 38;
    }
  });
  // parked along the pavement side of the cross streets and the parallel streets
  for (const z of cross) for (let k = 0; k < 6; k++) {
    if (r() < 0.35) continue;
    const c = makeCar(r() < 0.3 ? 'suv' : r() < 0.6 ? 'hatch' : 'sedan', COLS[Math.floor(r() * COLS.length)], r);
    const u = -36 - k * 14 - r() * 4, side = r() < 0.5 ? -1 : 1;
    cars.push({ ...c, u, dir: 0, v0: z + side * 4.4, speed: 0, moving: false, cross: true });
    group.add(c.group);
  }
  function update(tMove) {
    for (const c of cars) {
      let v = c.v0, u = c.u;
      if (c.moving) { v = -470 + ((((c.v0 + 470) + c.dir * c.speed * tMove) % 760) + 760) % 760; }
      const x = promX(v) + u;
      c.group.position.set(x, PROM_Y + 0.005, v);
      if (c.cross) c.group.rotation.set(0, 0, 0);                    // parked along a cross street, heading inland
      else { const ang = Math.atan2(promX(v + 1) - promX(v - 1), 2); c.group.rotation.set(0, (c.dir >= 0 ? Math.PI / 2 : -Math.PI / 2) + ang, 0); }   // the car's nose is local -x
    }
  }
  return { group, cars, update };
}

// ---------------------------------------------------------------------------------------------------------------
// street and beach furniture
// ---------------------------------------------------------------------------------------------------------------
function stripeTex(cols, n = 8) {
  return canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect((i / n) * w, 0, w / n + 1, h); } }, {});
}
export function makeFurniture(cross, seed = 21) {
  const r = rng(seed), group = new THREE.Group(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4();
  const wood = new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.8 }), iron = new THREE.MeshStandardMaterial({ color: '#2a2c2e', roughness: 0.55, metalness: 0.6 });
  // benches on the promenade facing the sea (wooden slats on two iron frames)
  const slat = [], frame = [], benches = [];
  for (let z = -440; z < 230; z += 17 + r() * 6) {
    const x = promX(z) - 1.6, ang = Math.atan2(promX(z + 1) - promX(z - 1), 2);
    benches.push({ x, z, ang });
    const parts = [];
    for (let k = 0; k < 3; k++) { const b = new THREE.BoxGeometry(0.11, 0.035, 1.8); b.translate(0.12 - k * 0.13, 0.45, 0); parts.push(b); }
    for (let k = 0; k < 2; k++) { const b = new THREE.BoxGeometry(0.035, 0.1, 1.8); b.rotateZ(-0.25); b.translate(-0.24, 0.62 + k * 0.15, 0); parts.push(b); }
    const fr = [];
    for (const sz of [-0.75, 0.75]) { const f1 = new THREE.BoxGeometry(0.42, 0.05, 0.05); f1.translate(0, 0.42, sz); fr.push(f1); const l1 = new THREE.BoxGeometry(0.05, 0.42, 0.05); l1.translate(0.15, 0.21, sz); fr.push(l1); const l2 = new THREE.BoxGeometry(0.05, 0.85, 0.05); l2.rotateZ(-0.2); l2.translate(-0.2, 0.42, sz); fr.push(l2); }
    const mt = new THREE.Matrix4().compose(new THREE.Vector3(x, PROM_Y, z), q.setFromAxisAngle(up, ang), new THREE.Vector3(1, 1, 1));
    for (const p of parts) { p.applyMatrix4(mt); slat.push(p); } for (const p of fr) { p.applyMatrix4(mt); frame.push(p); }
  }
  const sm = new THREE.Mesh(mergeGeometries(slat), wood), fm = new THREE.Mesh(mergeGeometries(frame), iron);
  for (const m of [sm, fm]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
  // bins
  const binG = []; for (let z = -430; z < 230; z += 31) { const b = new THREE.CylinderGeometry(0.22, 0.2, 0.75, 12); b.translate(promX(z) - 8.3, PROM_Y + 0.38, z); binG.push(b); }
  const bins = new THREE.Mesh(mergeGeometries(binG), new THREE.MeshStandardMaterial({ color: '#d2691e', roughness: 0.6 })); bins.castShadow = true; group.add(bins);
  // beach umbrellas with two chairs each, scattered on the dry sand (kept clear of the hero's spot and the camera paths)
  const umbs = [], spots = [[-40, -52], [-30, -61], [-33, -34], [-24, -44], [-36, -14], [-44, 20], [-35, 28], [-27, 36], [-41, 47], [-31, 58], [-24, 22], [-46, -26]];
  const canMat = [['#d6402b', '#f4efe4'], ['#1f5fa8', '#f4efe4'], ['#e2a21c', '#2a7f5b'], ['#f4efe4', '#3b8fd1']].map((c) => new THREE.MeshStandardMaterial({ map: stripeTex(c, 10), roughness: 0.85, side: THREE.DoubleSide }));
  const chairMat = new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.7 }), chairFab = [new THREE.MeshStandardMaterial({ color: '#2a5d9a', roughness: 0.9, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: '#c8452f', roughness: 0.9, side: THREE.DoubleSide })];
  for (const [x, z] of spots) {
    const gy = groundY(x, z), tilt = (r() - 0.5) * 0.18, u = new THREE.Group();
    const can = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.42, 20, 1, true), canMat[Math.floor(r() * canMat.length)]); can.position.y = 2.05;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.3, 8), chairMat); pole.position.y = 1.0;
    u.add(can, pole); u.position.set(x, gy - 0.12, z); u.rotation.set(tilt, r() * 6.28, (r() - 0.5) * 0.18);
    u.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); group.add(u);
    for (let k = 0; k < 2; k++) {
      const c = new THREE.Group(), fab = chairFab[Math.floor(r() * 2)];
      const seat = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.45), fab); seat.rotation.x = -Math.PI / 2 + 0.35; seat.position.set(0, 0.28, 0);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), fab); back.rotation.x = -0.45; back.position.set(0, 0.55, -0.32);
      for (const sx of [-0.25, 0.25]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 6), chairMat); l.rotation.x = 0.6; l.position.set(sx, 0.32, -0.12); c.add(l); }
      c.add(seat, back); const a = r() * 6.28; c.position.set(x + Math.cos(a) * 0.9, groundY(x + Math.cos(a) * 0.9, z + Math.sin(a) * 0.9) + 0.01, z + Math.sin(a) * 0.9); c.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.8;
      c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); group.add(c);
    }
    umbs.push([x, z]);
  }
  // a beach kiosk (quiosque): white walls, tiled roof, lit counter, red plastic tables and chairs
  const kz = -24, kx = promX(kz) + 7, kgy = groundY(kx, kz), kiosk = new THREE.Group();
  const kwall = new THREE.MeshStandardMaterial({ color: '#cfc8bb', roughness: 0.8 });
  const kb = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 3.6), kwall); kb.position.y = 1.3; kiosk.add(kb);
  const kr = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.3, 4, 1), new THREE.MeshStandardMaterial({ color: '#8f4a2c', roughness: 0.85 })); kr.position.y = 3.25; kr.rotation.y = Math.PI / 4; kiosk.add(kr);
  const kc = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 2.2), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd59a', emissiveIntensity: 0.9 })); kc.position.set(1.81, 1.7, 0); kiosk.add(kc);
  const ks = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 2.2), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#2a9d4a', emissiveIntensity: 1.6 })); ks.position.set(1.84, 2.45, 0); kiosk.add(ks);
  const plastic = new THREE.MeshStandardMaterial({ color: '#c81d18', roughness: 0.45 });
  const tables = [];
  for (const [dx, dz] of [[4.2, -2.2], [4.6, 1.6], [7.2, -0.4]]) {
    const t = new THREE.Group(); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20), plastic); top.position.y = 0.72; const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.7, 10), plastic); leg.position.y = 0.36; t.add(top, leg);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4, ch = new THREE.Group(); const s = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), plastic); s.position.y = 0.44; const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.04), plastic); b.position.set(0, 0.68, -0.2); b.rotation.x = -0.12; ch.add(s, b);
      for (const lx of [-0.18, 0.18]) for (const lz of [-0.18, 0.18]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 6), plastic); l.position.set(lx, 0.22, lz); ch.add(l); }
      ch.position.set(Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75); ch.rotation.y = -a - Math.PI / 2; t.add(ch); }
    t.position.set(dx, 0, dz); kiosk.add(t); tables.push(new THREE.Vector3(kx + dx, kgy, kz + dz));
  }
  kiosk.position.set(kx, kgy, kz); kiosk.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); group.add(kiosk);
  // a footvolley net
  const nz0 = -46, nx0 = shoreX(nz0) - 21, ngy = groundY(nx0, nz0), net = new THREE.Group();
  for (const dx of [-4.6, 4.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), iron); p.position.set(dx, 1.3, 0); net.add(p); }
  const netT = canvasTex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(240,240,240,1)'; g.lineWidth = 1.5; for (let x = 0; x <= w; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.fillStyle = '#fff'; g.fillRect(0, 0, w, 6); });
  const netM = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 0.9), new THREE.MeshStandardMaterial({ map: netT, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.8 })); netM.position.y = 2.05; net.add(netM);
  net.position.set(nx0, ngy - 0.1, nz0); net.rotation.y = Math.PI / 2; group.add(net);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshStandardMaterial({ map: stripeTex(['#f2d02b', '#2556b3', '#f4f4f4'], 6), roughness: 0.5 })); ball.castShadow = true; group.add(ball);
  return { group, benches, tables, kiosk: new THREE.Vector3(kx, kgy, kz), net: new THREE.Vector3(nx0, ngy, nz0), ball, umbs };
}

// ---------------------------------------------------------------------------------------------------------------
// hills behind the town (Guarapari sits among green granite hills), houses on their slopes
// ---------------------------------------------------------------------------------------------------------------
export function makeHills() {
  const nx = 90, nz = 120, x0 = -1500, x1 = -260, z0 = -900, z1 = 700, pos = [], idx = [];
  const H = (x, z) => { const a = Math.max(0, (-x - 300) / 900); return (60 + 90 * Math.sin(z * 0.004 + 1.3) * Math.sin(z * 0.0021 + 0.4) + 40 * Math.sin(z * 0.011) + 25 * Math.sin(x * 0.009 + z * 0.006)) * Math.min(1, a * 1.6) + 2.5; };
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + (i / nx) * (x1 - x0), z = z0 + (j / nz) * (z1 - z0); pos.push(x, Math.max(PROM_Y - 0.2, H(x, z)), z); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mat = heatize(new THREE.MeshStandardMaterial({ color: '#3c5230', roughness: 0.95 }), { organic: 1 });
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true;
  // little houses with lit windows dotted over the lower slopes (instanced boxes)
  const r = rng(77), hs = [];
  for (let k = 0; k < 900; k++) { const x = -330 - r() * 600, z = -700 + r() * 1300, h = H(x, z); if (h > 70) continue; hs.push([x, h, z, 6 + r() * 6, 4 + r() * 4, 6 + r() * 6, r()]); }
  const hm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#d9cdb8', roughness: 0.85, emissive: '#000' }), hs.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  hs.forEach(([x, y, z, w, hh, d, t], i) => { m4.compose(new THREE.Vector3(x, y + hh / 2 - 0.5, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 3), new THREE.Vector3(w, hh, d)); hm.setMatrixAt(i, m4); col.setHSL(0.08 + t * 0.06, 0.25 + 0.3 * t, 0.62 + 0.15 * t); hm.setColorAt(i, col); });
  hm.computeBoundingSphere();
  const grp = new THREE.Group(); grp.add(m, hm);
  return { group: grp, mat };
}
