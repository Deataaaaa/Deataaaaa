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
export function makeBuildings(layout) {
  const group = new THREE.Group(), r = rng(31);
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
      ${PASTEL.map((c, i) => `if (i == ${i}) return ${c};`).join(' ')} return ${PASTEL[0]}; }`;
  const mat = new THREE.MeshStandardMaterial({ color: '#d4d6dc', roughness: 0.82, metalness: 0, envMapIntensity: 0.7 });   // facades in the dusk shade: a little darker and cooler
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTown = BX.uTown;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aStyle; attribute vec2 aFace; varying vec3 vTW; varying vec3 vTN; varying vec4 vSt; varying vec2 vFace;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vTW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal); vSt = aStyle; vFace = aFace;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        ${FACADE}
        float gGlass, gLit, gWarm;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float vert = 1.0 - abs(vTN.y), st = vSt.x, tint = vSt.y, kind = vSt.z, hue = vSt.w;
        // the face's horizontal axis: the building's own along-street direction (vFace) or across it
        vec2 fa = normalize(vFace), fb = vec2(-fa.y, fa.x);
        float alongN = abs(dot(vTN.xz, fa));                          // 1 on the end walls, 0 on the long walls
        float hz = alongN > 0.5 ? dot(vTW.xz, fb) : dot(vTW.xz, fa), y = vTW.y - ${PROM_Y.toFixed(2)};
        bool sea = dot(vTN.xz, vec2(1.0, 0.0)) > 0.7;                 // faces the beach (+x)
        float FH = st > 3.5 && st < 4.5 ? 3.0 : 2.9, fy = (y - (kind > 1.5 ? 0.0 : 0.0)) / FH, fwy = fwidth(fy);
        // per-building character from its seeds: window grid, cladding (ceramic tiles, the Brazilian 'pastilhas'), bands
        float bs1 = fract(tint * 7.13), bs2 = fract(tint * 13.7 + hue * 3.1), bs3 = fract(hue * 9.3 + 0.37);
        float glass = 0.0, mull = 0.0, ac = 0.0, wcx = 3.2, frameK = 0.0, sill = 0.0, wx = 0.0, wy = 0.0, curtain = 0.0;
        vec3 frameC = mix(vec3(0.82, 0.82, 0.8), vec3(0.3, 0.3, 0.32), step(0.6, bs3));
        if (st > 1.5 && st < 2.5) {                                   // glass curtain wall
          wcx = 1.5; float fx = hz / wcx, fwx = fwidth(fx);
          mull = pulse(fx, 0.0, 0.05, fwx); glass = (1.0 - mull) * (1.0 - pulse(fy, 0.0, 0.3, fwy));
          wx = fract(fx); wy = clamp((fract(fy) - 0.3) / 0.7, 0.0, 1.0);
        } else if (sea && (st < 0.5 || (st > 2.5 && st < 3.5))) {     // balcony doors behind the parapets
          wcx = 1.6; float fx = hz / wcx, fwx = fwidth(fx);
          glass = pulse(fy, 0.4, 0.93, fwy) * (1.0 - pulse(fx, 0.0, 0.05, fwx));
          wx = fract(fx); wy = clamp((fract(fy) - 0.4) / 0.53, 0.0, 1.0);
          mull = pulse(fx, 0.0, 0.05, fwx) * pulse(fy, 0.4, 0.93, fwy);
        } else {                                                      // punched windows: frame, sliding panes, sill, AC unit
          wcx = (st > 3.5 ? 2.6 : 2.8) + bs1 * 0.9; float fx = hz / wcx, fwx = fwidth(fx);
          float x0 = 0.24 - bs2 * 0.06, x1 = 1.0 - x0, y0 = 0.34 + bs3 * 0.05, y1 = 0.82;
          float open = pulse(fx, x0, x1, fwx) * pulse(fy, y0, y1, fwy);
          float inner = pulse(fx, x0 + 0.025, x1 - 0.025, fwx) * pulse(fy, y0 + 0.035, y1 - 0.03, fwy);
          frameK = open - inner;
          wx = clamp((fract(fx) - x0) / (x1 - x0), 0.0, 1.0); wy = clamp((fract(fy) - y0) / (y1 - y0), 0.0, 1.0);
          mull = pulse(fx, 0.5 - 0.012, 0.5 + 0.012, fwx) * open;      // where the two sliding panes meet
          glass = inner * (1.0 - mull);
          sill = pulse(fx, x0 - 0.03, x1 + 0.03, fwx) * pulse(fy, y0 - 0.045, y0 - 0.005, fwy);
          float hasAC = step(0.55, th21(floor(vec2(hz / wcx, fy)) + tint * 13.0)) * step(1.0, fy);
          ac = hasAC * pulse(fx, 0.3, 0.6, fwx) * pulse(fy, 0.12, 0.27, fwy) * (st > 0.5 && st < 1.5 || st > 3.5 ? 1.0 : 0.0);
        }
        float ground = 1.0 - step(1.0, fy);                           // the ground floor
        float winOK = vert * (1.0 - ground) * (1.0 - step(0.5, kind) * (1.0 - step(1.5, kind)));   // roof boxes: no windows
        glass *= winOK; frameK *= winOK; sill *= winOK; mull *= winOK;
        vec3 wall = st < 0.5 ? vec3(0.6, 0.59, 0.56) : st < 1.5 ? pastel(hue) * 0.72 : st < 2.5 ? vec3(0.18, 0.22, 0.26) : st < 3.5 ? vec3(0.52, 0.53, 0.54) : pastel(hue) * 0.76;
        // ceramic tile cladding on some blocks: a fine grid of small tiles, each a slightly different shade (fades to its mean far away)
        if ((st > 0.5 && st < 1.5 || st > 3.5) && bs1 < 0.42) {
          vec3 tileC = bs2 < 0.3 ? vec3(0.42, 0.55, 0.66) : bs2 < 0.55 ? vec3(0.7, 0.62, 0.5) : bs2 < 0.75 ? vec3(0.52, 0.4, 0.32) : vec3(0.76, 0.75, 0.72);
          vec2 tg = vec2(hz, y) / 0.11; vec2 tfw = fwidth(tg);
          float grout = 1.0 - pulse(tg.x, 0.0, 0.88, tfw.x) * pulse(tg.y, 0.0, 0.88, tfw.y);
          float var = mix(th21(floor(tg)) - 0.5, 0.0, smoothstep(0.3, 0.8, max(tfw.x, tfw.y)));
          wall = tileC * (1.0 + 0.22 * var) * (1.0 - 0.18 * grout);
        }
        // floor slab bands and the odd pilaster
        float slabB = (st > 0.5 && st < 1.5 || st > 3.5) ? pulse(fy, 0.0, 0.09, fwy) * step(0.35, bs3) : 0.0;
        wall = mix(wall, vec3(0.78, 0.77, 0.74), slabB * 0.8);
        wall *= 0.92 + 0.1 * th21(floor(vec2(hz * 0.05, fy * 0.2)) + tint * 7.0);
        wall *= 1.0 - 0.12 * smoothstep(0.45, 0.8, bnT(vec2(hz * 0.7, y * 0.025 + tint * 13.0))) * (1.0 - smoothstep(0.3, 1.0, fwidth(hz) * 0.7));   // rain streaks
        wall = mix(wall, vec3(0.35, 0.37, 0.4), mull * 0.7);
        wall = mix(wall, frameC, clamp(frameK, 0.0, 1.0));
        wall = mix(wall, vec3(0.8, 0.79, 0.76), clamp(sill, 0.0, 1.0) * 0.9);
        wall = mix(wall, vec3(0.8, 0.8, 0.78), ac);
        if (vTN.y > 0.5) wall = vec3(0.42, 0.41, 0.4);
        float ao = mix(0.62, 1.0, smoothstep(0.0, 26.0, y));
        if (sea && (st < 0.5 || (st > 2.5 && st < 3.5))) ao *= mix(1.0, 0.5, smoothstep(0.3, 1.0, fract(fy)));
        // shops on the ground floor: dark storefronts, warm light inside, a sign band in one of a few colours
        float shop = ground * vert * (1.0 - step(0.5, kind) * (1.0 - step(1.5, kind))) * step(0.5, fract(tint * 3.0 + 0.2) + (sea ? 1.0 : 0.0));
        float sx = hz / (8.0 + bs2 * 4.0), sfw = fwidth(sx); float sid = floor(sx) + tint * 31.0;
        float band = pulse(fy, 0.74, 0.92, fwy), win = pulse(fy, 0.04, 0.68, fwy) * pulse(sx, 0.06, 0.94, sfw), post = pulse(sx, 0.47, 0.53, sfw) * win;
        float sc = th21(vec2(sid, 1.0));
        vec3 signC = sc < 0.2 ? vec3(0.62, 0.1, 0.08) : sc < 0.4 ? vec3(0.1, 0.24, 0.52) : sc < 0.55 ? vec3(0.1, 0.38, 0.2) : sc < 0.75 ? vec3(0.85, 0.68, 0.16) : vec3(0.82, 0.8, 0.76);
        wall = mix(wall, mix(mix(vec3(0.07, 0.07, 0.08), vec3(0.25), post), signC, band), shop * max(band, win));
        wall *= ao;
        gGlass = glass;
        vec2 cell = floor(vec2(hz / wcx, fy)) + floor(vTW.xz * 0.011) * 17.0;
        float h1 = th21(cell), hc = th21(cell + 11.3);
        gLit = step(0.66, h1) * (0.55 + 0.45 * th21(cell + 3.1));
        gWarm = step(0.86, th21(cell + 5.7));                         // a few cool white rooms (LED, TV)
        curtain = hc < 0.3 ? (1.0 - pulse(wx, 0.3, 0.7, fwidth(wx))) : hc < 0.42 ? 1.0 : 0.0;   // open or drawn curtains
        float blinds = step(0.9, hc) * pulse(wy * 14.0, 0.0, 0.5, fwidth(wy * 14.0));
        vec3 glassCol = mix(vec3(0.05, 0.06, 0.07), vec3(0.09, 0.1, 0.11), th21(cell + 8.0));
        glassCol += vec3(0.05, 0.06, 0.08) * smoothstep(0.3, 1.0, wy);                     // the sky reflected in the upper panes
        glassCol *= mix(0.55, 1.0, smoothstep(0.0, 0.12, 1.0 - wy)) * mix(0.6, 1.0, smoothstep(0.0, 0.1, wx));   // the window recess
        glassCol = mix(glassCol, mix(vec3(0.62, 0.56, 0.46), vec3(0.6, 0.62, 0.64), step(0.5, th21(cell + 2.2))) * 0.5, clamp(curtain + blinds * 0.6, 0.0, 1.0) * 0.85);
        diffuseColor.rgb *= mix(wall, glassCol * ao, glass);
        gLit = max(gLit * glass * (1.0 - 0.45 * clamp(curtain, 0.0, 1.0)), shop * win * (0.5 + 0.5 * step(0.4, th21(vec2(sid, 9.0)))) * 0.9);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.07, gGlass);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float fwm = max(fwidth(vTW.x + vTW.z) / 3.0, fwidth(vTW.y) / 2.9);
        float sub = smoothstep(0.35, 0.9, fwm);
        float avg = 0.34 * 0.6 * 0.5 * step(1.0, (vTW.y - ${PROM_Y.toFixed(2)}) / 2.9) * (1.0 - abs(vTN.y)) * (1.0 - step(0.5, vSt.z) * (1.0 - step(1.5, vSt.z)));
        // inside a lit room: brighter toward the ceiling lamp
        float room = 0.75 + 0.35 * smoothstep(0.4, 0.95, fract((vTW.y - ${PROM_Y.toFixed(2)}) / 2.9));
        vec3 lampC = mix(vec3(1.0, 0.66, 0.36), vec3(0.8, 0.86, 1.0), gWarm);
        totalEmissiveRadiance += lampC * mix(gLit * room, avg, sub) * 1.45;
        float tk = uTown * (0.75 + 0.25 * bnT(vTW.xy * 0.08 + vTW.zy * 0.05)) * (0.6 + 0.4 * smoothstep(0.0, 40.0, vTW.y - 2.5));
        totalEmissiveRadiance += (bb2(clamp(tk * 0.8, 0.0, 1.0)) * tk * tk * 1.1 + vec3(1.0, 0.5, 0.2) * gGlass * smoothstep(0.0, 0.4, uTown) * 1.3);`);
  };
  mat.customProgramCacheKey = () => 'town_bld_v1';
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
      const bw = b.w * 0.94;
      for (let f = 1; f < b.fl; f++) {
        const y0 = PROM_Y + f * 2.9;
        if (b.style === 0) slabs.push([b.fx + 0.8, y0 + 0.55, z, 1.6, 1.1, bw, ang]);
        else { slabs.push([b.fx + 0.8, y0 + 0.1, z, 1.6, 0.2, bw, ang]); rails.push([b.fx + 1.57, y0 + 0.65, z, 0.04, 0.9, bw, ang]); }
      }
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const im = new THREE.InstancedMesh(box.clone(), mat, inst.length);
  const sty = new Float32Array(inst.length * 4), fac = new Float32Array(inst.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  inst.forEach((o, i) => { q.setFromAxisAngle(up, o.ang); m4.compose(new THREE.Vector3(o.x, o.y, o.z), q, new THREE.Vector3(o.sx, o.sy, o.sz)); im.setMatrixAt(i, m4); sty.set([o.st, o.tint, o.kind, o.hue], i * 4); fac.set(o.face, i * 2); });
  im.geometry.setAttribute('aStyle', new THREE.InstancedBufferAttribute(sty, 4)); im.geometry.setAttribute('aFace', new THREE.InstancedBufferAttribute(fac, 2));
  im.computeBoundingSphere(); im.receiveShadow = true; group.add(im);
  const slabMat = new THREE.MeshStandardMaterial({ color: '#b9b6b0', roughness: 0.85 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#4f6466', roughness: 0.06, metalness: 0.35, envMapIntensity: 1.2 });
  for (const [arr, m] of [[slabs, slabMat], [rails, railMat]]) {
    if (!arr.length) continue;
    const bm = new THREE.InstancedMesh(box.clone(), m, arr.length);
    arr.forEach(([x, y, z, sx, sy, sz, ang], i) => { q.setFromAxisAngle(up, ang); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)); bm.setMatrixAt(i, m4); });
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
  sedan: { L: 4.55, W: 1.8, body: [[0, 0.3], [0.04, 0.6], [0.9, 0.78], [1.5, 0.84], [3.4, 0.86], [3.95, 0.9], [4.5, 0.86], [4.55, 0.55], [4.5, 0.3]], cab: [[1.55, 0.86], [2.25, 1.38], [3.2, 1.4], [3.85, 0.9]] },
  hatch: { L: 3.95, W: 1.72, body: [[0, 0.3], [0.04, 0.6], [0.8, 0.78], [1.35, 0.84], [3.85, 0.88], [3.95, 0.6], [3.9, 0.3]], cab: [[1.4, 0.86], [2.05, 1.42], [3.6, 1.44], [3.88, 0.9]] },
  suv: { L: 4.6, W: 1.88, body: [[0, 0.38], [0.04, 0.72], [0.85, 0.95], [1.4, 1.0], [4.5, 1.04], [4.6, 0.72], [4.55, 0.38]], cab: [[1.45, 1.02], [2.05, 1.66], [4.3, 1.68], [4.52, 1.06]] },
  bus: { L: 12, W: 2.55, body: [[0, 0.4], [0.05, 1.1], [0.2, 1.25], [11.85, 1.25], [12, 1.1], [11.95, 0.4]], cab: [[0.1, 1.27], [0.25, 2.9], [11.9, 2.9], [11.95, 1.27]] },
};
function extrudeProfile(pts, width, bevel = 0.05) {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, 0, -(width - 2 * bevel) / 2); return g;
}
function makeCar(type, color, r) {
  const T = CAR_TYPES[type], grp = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#0b0e12', metalness: 0.2, roughness: 0.06, clearcoat: 1 });
  const body = new THREE.Mesh(extrudeProfile(T.body, T.W, type === 'bus' ? 0.08 : 0.07), paint);
  const cab = new THREE.Mesh(extrudeProfile(T.cab, T.W - (type === 'bus' ? 0.04 : 0.16), 0.05), glassM);
  const roofPts = [[T.cab[1][0] + 0.06, T.cab[1][1] - 0.02], [T.cab[1][0] + 0.12, T.cab[1][1] + 0.03], [T.cab[2][0] - 0.06, T.cab[2][1] + 0.03], [T.cab[2][0], T.cab[2][1] - 0.02]];
  const roof = new THREE.Mesh(extrudeProfile(roofPts, T.W - 0.12, 0.04), paint);
  grp.add(body, cab, roof);
  const tyre = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: '#b8bcc2', metalness: 0.9, roughness: 0.3 });
  const R = type === 'bus' ? 0.5 : type === 'suv' ? 0.36 : 0.32;
  const wx = type === 'bus' ? [2.2, 9.6] : [0.82, T.L - 0.88];
  for (const x of wx) for (const sd of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.22, 20), tyre); w.rotation.x = Math.PI / 2; w.position.set(x, R, sd * (T.W / 2 - 0.12)); grp.add(w);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.6, R * 0.6, 0.23, 16), rim); h.rotation.x = Math.PI / 2; h.position.copy(w.position); h.position.z += sd * 0.005; grp.add(h);
  }
  const head = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#fff1d6', emissiveIntensity: 5 }), tail = new THREE.MeshStandardMaterial({ color: '#200', emissive: '#ff1a10', emissiveIntensity: 3 });
  const hy = type === 'bus' ? 0.75 : T.body[2][1] - 0.08, ty = type === 'bus' ? 0.9 : T.body[T.body.length - 3][1] - 0.1;
  for (const sd of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.28), head); hl.position.set(0.02, hy, sd * (T.W / 2 - 0.3)); grp.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3), tail); tl.position.set(T.L - 0.02, ty, sd * (T.W / 2 - 0.25)); grp.add(tl);
  }
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // centre: origin at the middle of the car on the ground, heading +x
  grp.children.forEach((c) => { c.position.x -= T.L / 2; });
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
