// Series « 12 % »: a street in Paris 18e at night. Haussmann buildings (stone fronts with real window recesses, French windows
// with railings, balconies on the 2nd and 5th floors, a zinc mansard with dormers, chimney stacks), the street (asphalt,
// granite kerbs, pavements, wall lanterns, parked cars). Frame: x along the street, y up, the hero building's front on
// z = 0 facing +z, the facing row's front on z = STREET.W facing -z. Inès lives behind the dormer of bay 3 (x = 3.2), 6th floor.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';
import { SIMPLEX } from './fx.js';

export const LV = [0, 4.3, 7.7, 11.0, 14.0, 16.9, 19.7];      // floor levels: ground floor, 1st-5th, 6th (the mansard)
export const STREET = { W: 13, PAVE: 2.5, KERB: 0.14 };        // façade to façade; pavements 2.5 m each side
export const BAYS = [-6.4, -3.2, 0, 3.2, 6.4];                 // the hero building's window bays
export const HERO_BAY = 3.2, FIRE_BAY = -3.2, FIRE_LV = 2;     // Inès's dormer; the fire is on the 2nd floor
export const MANS = { y0: LV[6] + 0.25, back: 1.0, h: 2.7 };   // mansard: from the cornice it slopes 1 m back over 2.7 m (70 deg)
export const DORMER = { z: -0.28, w: 1.12, sill: LV[6] + 0.82, win: 1.3, ww: 0.84 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };

// ---------- materials ----------
// stone with courses and joints in world space (fwidth-limited so far joints fade instead of sparkling)
export function stoneMat({ color = '#cdbfa5', course = 0.44, block = 1.15, rustic = 0, rusticTop = LV[1], dirt = 0.25 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec3 vWN; ${SIMPLEX}
      float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec3 an = abs(vWN); float u = an.z > an.x ? vWP.x : vWP.z;     // along the wall
        float y = vWP.y;
        float row = floor(y / ${course.toFixed(3)});
        float uu = u / ${block.toFixed(3)} + 0.5 * mod(row, 2.0);
        vec2 cell = vec2(floor(uu), row);
        float fy = fract(y / ${course.toFixed(3)}), fu = fract(uu);
        float wy = fwidth(y / ${course.toFixed(3)}), wu = fwidth(uu);
        float jy = 1.0 - smoothstep(0.0, 0.03 + wy, min(fy, 1.0 - fy));
        float ju = 1.0 - smoothstep(0.0, 0.012 + wu, min(fu, 1.0 - fu));
        float fade = 1.0 - smoothstep(0.08, 0.3, max(wy, wu));            // joints fade out with distance
        float joint = max(jy, ju) * fade;
        float rus = ${rustic.toFixed(2)} * step(y, ${rusticTop.toFixed(2)}) * (1.0 - smoothstep(0.0, 0.07 + wy * 1.5, min(fy, 1.0 - fy))) * fade;
        float tone = 0.93 + 0.12 * hh(cell) + 0.05 * snoise(vWP * 0.9);
        float grime = ${dirt.toFixed(2)} * smoothstep(0.4, 1.0, snoise(vec3(vWP.x * 0.35, vWP.y * 1.6, vWP.z * 0.35)) * 0.5 + 0.5);
        diffuseColor.rgb *= tone * (1.0 - 0.32 * joint) * (1.0 - 0.55 * rus) * (1.0 - grime * 0.35);
      }`);
  };
  m.customProgramCacheKey = () => `stone12_${course}_${block}_${rustic}_${dirt}`;
  return m;
}
// zinc roofing with standing seams every 0.45 m (along the slope)
export function zincMat() {
  const m = new THREE.MeshStandardMaterial({ color: '#717a82', roughness: 0.5, metalness: 0.55 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; ${SIMPLEX}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      { float u = (vWP.x + vWP.z * 0.0) / 0.45; float f = fract(u), w = fwidth(u);
        float seam = (1.0 - smoothstep(0.0, 0.05 + w, min(f, 1.0 - f))) * (1.0 - smoothstep(0.1, 0.35, w));
        diffuseColor.rgb *= (1.0 + 0.35 * seam) * (0.92 + 0.08 * snoise(vWP * vec3(0.3, 2.0, 0.3))); }`);
  };
  m.customProgramCacheKey = () => 'zinc12';
  return m;
}
// a wrought-iron railing texture (bars, a rail, rings): alpha blended, mipmapped
let _rail = null;
function railTex() {
  if (_rail) return _rail;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const c = cv.getContext('2d');
  c.clearRect(0, 0, 512, 256); c.strokeStyle = '#fff'; c.lineCap = 'round';
  c.lineWidth = 14; c.beginPath(); c.moveTo(0, 12); c.lineTo(512, 12); c.moveTo(0, 246); c.lineTo(512, 246); c.stroke();
  c.lineWidth = 7; c.beginPath(); c.moveTo(0, 60); c.lineTo(512, 60); c.moveTo(0, 214); c.lineTo(512, 214); c.stroke();
  for (let i = 0; i < 8; i++) {
    const x = i * 64 + 32;
    c.lineWidth = 6; c.beginPath(); c.moveTo(x - 32, 60); c.lineTo(x - 32, 214); c.stroke();
    c.lineWidth = 5; c.beginPath(); c.arc(x, 137, 26, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(x, 60); c.lineTo(x, 111); c.moveTo(x, 163); c.lineTo(x, 214); c.stroke();
    c.beginPath(); c.arc(x - 16, 88, 12, 0, Math.PI * 2); c.arc(x + 16, 186, 12, 0, Math.PI * 2); c.stroke();
  }
  _rail = new THREE.CanvasTexture(cv); _rail.wrapS = THREE.RepeatWrapping; _rail.anisotropy = 8; _rail.generateMipmaps = true;
  _rail.minFilter = THREE.LinearMipmapLinearFilter;
  return _rail;
}
export function railMat(repeat = 1) {
  const t = railTex().clone(); t.needsUpdate = true; t.repeat.set(repeat, 1);
  return new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.5, metalness: 0.6, alphaMap: t, transparent: true, side: THREE.DoubleSide, depthWrite: false });
}
// what is behind a window: a curtain card (lit warm, lit TV-blue or dark) seen through dark glass
const _cards = {};
function curtainTex(kind, seed) {
  const key = kind + seed; if (_cards[key]) return _cards[key];
  const r = rng(seed), cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const c = cv.getContext('2d');
  const base = kind === 'warm' ? [255, 196, 128] : kind === 'tv' ? [140, 170, 255] : [18, 18, 22];
  const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, `rgb(${base.map((v) => v * 0.55).join(',')})`); g.addColorStop(1, `rgb(${base.join(',')})`);
  c.fillStyle = g; c.fillRect(0, 0, 128, 256);
  if (kind !== 'dark') {                                     // curtain folds, a lampshade, a shelf
    for (let x = 0; x < 128; x += 6 + r() * 8) { c.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.12})`; c.fillRect(x, 0, 2 + r() * 3, 256); }
    if (r() < 0.6) { c.fillStyle = 'rgba(255,240,210,0.85)'; c.beginPath(); c.ellipse(30 + r() * 68, 150 + r() * 60, 12, 9, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 205 + r() * 20, 128, 6);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; _cards[key] = t; return t;
}

// ---------- one Haussmann building front (and its mansard roof) ----------
// o: { x0, x1, z0, face: +1 (front faces +z) or -1, bays: [x...], lit: 0..1, seed, color, door: bay index or -1, number }
export function makeHaussmann(o) {
  const { z0 = 0, face = 1, seed = 1, color = '#cdbfa5', lit = 0.35, door = -1, shops = true } = o;
  // a front facing -z is built facing +z at mirrored x, then turned half round onto the requested x range
  const x0 = face === 1 ? o.x0 : -o.x1, x1 = face === 1 ? o.x1 : -o.x0, bays = face === 1 ? o.bays : o.bays.map((b) => -b).reverse();
  const r = rng(seed), grp = new THREE.Group();
  const stone = stoneMat({ color, rustic: 1 }), trimM = stoneMat({ color: new THREE.Color(color).offsetHSL(0, 0, 0.04).getStyle(), course: 9, block: 9, dirt: 0.15 });
  const frameM = new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.6 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#0b0d10', roughness: 0.08, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.62 });
  const G = { stone: [], trim: [], frame: [], glass: [], zinc: [], dark: [], rail: [] }, cards = [], railsL = [];
  const D = 0.26;                                                // window recess depth
  const W = x1 - x0, cx = (x0 + x1) / 2;
  const wh = [0, 2.55, 2.45, 2.25, 2.15, 2.0], ww = 1.18;      // French window heights per floor
  // front wall: piers + spandrels per level, so the windows are real recesses
  const addWall = (xa, xb, ya, yb, g = G.stone) => { if (xb - xa > 0.01 && yb - ya > 0.01) g.push(box(xb - xa, yb - ya, 0.5, (xa + xb) / 2, (ya + yb) / 2, -0.25)); };
  for (let L = 1; L <= 5; L++) {
    const y0 = LV[L], y1 = LV[L + 1], top = y0 + 0.12 + wh[L];
    let xa = x0;
    for (const bx of bays) { addWall(xa, bx - ww / 2, y0, y1); xa = bx + ww / 2; }
    addWall(xa, x1, y0, y1);
    for (const bx of bays) {
      addWall(bx - ww / 2, bx + ww / 2, y0, y0 + 0.12);         // threshold
      addWall(bx - ww / 2, bx + ww / 2, top, y1);               // lintel
      // reveals, frame, glass, the card behind it
      G.trim.push(box(ww + 0.36, 0.16, 0.08, bx, top + 0.1, 0.04));              // moulded surround
      G.trim.push(box(0.14, wh[L] + 0.2, 0.06, bx - ww / 2 - 0.1, y0 + 0.12 + wh[L] / 2, 0.03));
      G.trim.push(box(0.14, wh[L] + 0.2, 0.06, bx + ww / 2 + 0.1, y0 + 0.12 + wh[L] / 2, 0.03));
      if (L === 1 || L === 3) G.trim.push(box(ww + 0.5, 0.42, 0.14, bx, top + 0.38, 0.07));  // a pediment block
      const fy = y0 + 0.12, gz = -D;
      G.frame.push(box(ww, 0.06, 0.08, bx, fy + 0.03, gz), box(ww, 0.07, 0.08, bx, top - 0.035, gz),
        box(0.07, wh[L], 0.08, bx - ww / 2 + 0.035, fy + wh[L] / 2, gz), box(0.07, wh[L], 0.08, bx + ww / 2 - 0.035, fy + wh[L] / 2, gz),
        box(0.05, wh[L], 0.06, bx, fy + wh[L] / 2, gz), box(ww, 0.04, 0.06, bx, fy + wh[L] * 0.72, gz));
      const kind = r() < lit ? (r() < 0.82 ? 'warm' : 'tv') : 'dark';
      cards.push({ x: bx, y: fy + wh[L] / 2, w: ww - 0.1, h: wh[L] - 0.1, kind, s: Math.floor(r() * 6), L });
      G.glass.push(box(ww - 0.1, wh[L] - 0.1, 0.01, bx, fy + wh[L] / 2, gz + 0.03));
      if (L !== 2 && L !== 5) railsL.push({ x: bx, y: y0 + 0.12, w: ww, h: 0.95, z: -0.05 });
    }
    // floor band (cornice) at the top of each level; the big ones under the 2nd-floor balcony and under the mansard
    const big = L === 5 ? 0.55 : L === 1 ? 0.3 : 0.16;
    G.trim.push(box(W, big * 0.6, 0.12 + big * 0.5, cx, y1 - 0.04, (0.12 + big * 0.5) / 2 - 0.02));
  }
  // balconies: 2nd floor (deep, on consoles) and 5th floor (continuous)
  for (const [L, dep] of [[2, 0.85], [5, 0.62]]) {
    const y = LV[L] + 0.02;
    G.trim.push(box(W - 0.2, 0.16, dep, cx, y - 0.08, dep / 2));
    for (let x = x0 + 0.6; x < x1 - 0.4; x += 1.6) G.trim.push(box(0.18, 0.34, dep * 0.8, x, y - 0.3, dep * 0.4));
    railsL.push({ x: cx, y, w: W - 0.3, h: 1.0, z: dep - 0.04, front: true });
    railsL.push({ x: x0 + 0.13, y, w: dep - 0.05, h: 1.0, z: dep / 2, side: true }, { x: x1 - 0.13, y, w: dep - 0.05, h: 1.0, z: dep / 2, side: true });
  }
  // ground floor: rusticated wall, a carriage door, shops with their iron shutters down
  const gf = LV[1];
  let xa = x0;
  const shopW = 2.3, doorW = 2.7;
  bays.forEach((bx, i) => {
    const w = i === door ? doorW : shopW;
    addWall(xa, bx - w / 2, 0, gf); addWall(bx - w / 2, bx + w / 2, (i === door ? 3.9 : 3.3), gf);
    xa = bx + w / 2;
    if (i === door) { if (!o.hero) G.dark.push(box(w, 3.9, 0.1, bx, 1.95, -0.32)); }
    else if (shops) { G.dark.push(box(w, 3.3, 0.1, bx, 1.65, -0.3)); G.trim.push(box(w + 0.2, 0.5, 0.18, bx, 3.55, 0.05)); }
    else G.dark.push(box(w, 3.3, 0.1, bx, 1.65, -0.3));
  });
  addWall(xa, x1, 0, gf);
  // mansard: the steep zinc slope with dormers, then the upper roof
  const my = MANS.y0, mb = MANS.back, mh = MANS.h;
  const slope = new THREE.PlaneGeometry(W, Math.hypot(mb, mh)); slope.rotateX(-Math.atan2(mb, mh)); slope.translate(cx, my + mh / 2, -mb / 2);
  G.zinc.push(slope);
  const roofD = 7.5, ridgeY = my + mh + 1.6;
  const upper = new THREE.PlaneGeometry(W, Math.hypot(roofD - mb, ridgeY - my - mh)); upper.rotateX(-Math.PI / 2 + Math.atan2(ridgeY - my - mh, roofD - mb));
  upper.translate(cx, (my + mh + ridgeY) / 2, -(mb + roofD) / 2); G.zinc.push(upper);
  G.trim.push(box(W, 0.12, 0.3, cx, my + mh, -mb + 0.1));      // the break between the two slopes
  for (const bx of bays) {
    const dz = DORMER.z, w = DORMER.w, sill = DORMER.sill, top = sill + DORMER.win;
    // the dormer's stone front, built around its window opening
    const fz = dz - 0.09, jw = (w - DORMER.ww) / 2;
    G.trim.push(box(w, sill - my, 0.18, bx, (my + sill) / 2, fz), box(w, 0.5, 0.18, bx, top + 0.25, fz),
      box(jw, top - sill, 0.18, bx - w / 2 + jw / 2, (sill + top) / 2, fz), box(jw, top - sill, 0.18, bx + w / 2 - jw / 2, (sill + top) / 2, fz));
    G.zinc.push(box(0.08, top + 0.3 - my, -dz + 0.5, bx - w / 2, (my + top + 0.3) / 2, (dz - 0.5) / 2 + dz / 2), box(0.08, top + 0.3 - my, -dz + 0.5, bx + w / 2, (my + top + 0.3) / 2, (dz - 0.5) / 2 + dz / 2));
    const cap = new THREE.ConeGeometry(w * 0.8, 0.5, 4, 1); cap.rotateY(Math.PI / 4); cap.scale(1, 1, 0.9); cap.translate(bx, top + 0.75, dz - 0.35); G.zinc.push(cap);
    cards.push({ x: bx, y: sill + DORMER.win / 2, w: DORMER.ww, h: DORMER.win, kind: bx === HERO_BAY && face === 1 && o.hero ? 'none' : (r() < lit ? 'warm' : 'dark'), s: 3, L: 6, z: dz - 0.2 });
    G.frame.push(box(DORMER.ww + 0.1, 0.07, 0.08, bx, sill, dz - 0.12), box(DORMER.ww + 0.1, 0.07, 0.08, bx, top, dz - 0.12),
      box(0.06, DORMER.win, 0.08, bx - DORMER.ww / 2, sill + DORMER.win / 2, dz - 0.12), box(0.06, DORMER.win, 0.08, bx + DORMER.ww / 2, sill + DORMER.win / 2, dz - 0.12),
      box(0.045, DORMER.win, 0.06, bx, sill + DORMER.win / 2, dz - 0.12));
    if (!(o.hero && bx === HERO_BAY)) G.glass.push(box(DORMER.ww - 0.06, DORMER.win - 0.06, 0.01, bx, sill + DORMER.win / 2, dz - 0.14));
    railsL.push({ x: bx, y: sill - 0.02, w: DORMER.ww + 0.1, h: 0.45, z: dz + 0.02 });
  }
  // chimney stacks with clay pots on the upper roof
  for (let x = x0 + 1.2; x < x1 - 0.8; x += 3.4 + r() * 1.5) {
    const zc = -mb - 1.2 - r() * 3, y0 = ridgeY - (roofD - (-zc)) / (roofD - mb) * (ridgeY - my - mh) - 0.3;
    G.stone.push(box(1.4, 1.6, 0.6, x, y0 + 0.8, zc));
    for (let k = 0; k < 4; k++) { const p = new THREE.CylinderGeometry(0.08, 0.1, 0.42, 10); p.translate(x - 0.5 + k * 0.33, y0 + 1.8, zc); G.dark.push(p); }
  }
  // build meshes (all front geometry is made for face +1 at z = 0, then mirrored/translated)
  const add = (list, mat, shadow = true) => {
    if (!list.length) return null;
    const m = new THREE.Mesh(mergeGeometries(list.map((g) => g.index ? g.toNonIndexed() : g)), mat);
    m.castShadow = shadow; m.receiveShadow = true; grp.add(m); return m;
  };
  add(G.stone, stone); add(G.trim, trimM); add(G.frame, frameM, false); add(G.glass, glassM, false);
  add(G.zinc, zincMat()); add(G.dark, new THREE.MeshStandardMaterial({ color: '#22262a', roughness: 0.55, metalness: 0.4 }));
  // carriage door: dark green wood with panels; shop shutters: corrugated iron
  if (door >= 0) {
    const bx = bays[door], dm = new THREE.MeshStandardMaterial({ color: '#1f3a2c', roughness: 0.5 });
    const leafG = (cx0) => { const dg = [box(doorW / 2 - 0.04, 3.8, 0.08, cx0, 1.9, 0)]; for (const yy of [0.8, 2.0, 3.1]) dg.push(box(doorW / 2 - 0.4, 0.7, 0.04, cx0, yy, 0.06)); return mergeGeometries(dg.map((g) => g.toNonIndexed())); };
    const left = new THREE.Mesh(leafG(bx - doorW / 4), dm); left.position.z = -0.27; left.castShadow = true; left.receiveShadow = true; grp.add(left);
    // the right leaf opens inward on its hinge (userData.setDoor(k), 0 shut, 1 open)
    const hinge = new THREE.Group(); hinge.position.set(bx + doorW / 2 - 0.02, 0, -0.27); grp.add(hinge);
    const right = new THREE.Mesh(leafG(-doorW / 4 + 0.02), dm); right.castShadow = true; right.receiveShadow = true; hinge.add(right);
    const brass = new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.3, metalness: 0.9 });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), brass); knob.position.set(-doorW / 2 + 0.14, 1.15, 0.1); hinge.add(knob);
    grp.userData.door = { x: bx, w: doorW, hinge };
    grp.userData.setDoor = (k) => { hinge.rotation.y = -k * 1.35; };
    if (o.hero) {   // the porch behind it: stone walls, a tiled floor, a lamp, the inner glass door
      const hall = new THREE.Group(), hw = doorW / 2 + 0.1;
      const hm = new THREE.MeshStandardMaterial({ color: '#cbbfa8', roughness: 0.8, side: THREE.BackSide });
      const hb = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 3.9, 6), hm); hb.position.set(bx, 1.95, -3.3); hb.receiveShadow = true; hall.add(hb);
      const tiles = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 0.02, 5.9), new THREE.MeshStandardMaterial({ color: '#5b5550', roughness: 0.35 }));
      tiles.rotation.x = -Math.PI / 2; tiles.position.set(bx, 0.005, -3.3); tiles.receiveShadow = true; hall.add(tiles);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd59a', emissiveIntensity: 4 })); lamp.position.set(bx, 3.6, -2.6); hall.add(lamp);
      const pl = new THREE.PointLight('#ffcf94', 6, 9, 2); pl.position.set(bx, 3.3, -2.6); hall.add(pl);
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffcf94', emissiveIntensity: 0.9 })); inner.position.set(bx, 1.3, -6.25); hall.add(inner);
      grp.add(hall); grp.userData.hallLight = pl;
    }
  }
  // window cards (one material per kind + seed)
  for (const c of cards) {
    if (c.kind === 'none') continue;
    const em = c.kind === 'dark' ? 0 : c.kind === 'tv' ? 0.9 : 1.6;
    const mm = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: curtainTex(c.kind, c.s), emissiveIntensity: em, roughness: 1 });
    if (c.kind === 'dark') { mm.emissive.set('#000'); mm.color.set('#141518'); mm.map = curtainTex('warm', c.s); mm.color.set('#1a1714'); }
    const p = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), mm); p.position.set(c.x, c.y, (c.z ?? -D) - 0.12);
    p.userData = { kind: c.kind, L: c.L, x: c.x }; grp.add(p);
    (grp.userData.cards ||= []).push(p);
  }
  for (const rl of railsL) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(rl.w, rl.h), railMat(Math.max(1, Math.round(rl.w / 0.9))));
    p.position.set(rl.x, rl.y + rl.h / 2, rl.z); if (rl.side) p.rotation.y = Math.PI / 2; p.renderOrder = 2; grp.add(p);
  }
  // party walls / the sides, so a gap between buildings never shows the sky
  const side = stoneMat({ color: '#b9ae9a', course: 9, block: 9, dirt: 0.5 });
  for (const sx of [x0, x1]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, ridgeY, 8), side); s.position.set(sx, ridgeY / 2, -4.2); s.receiveShadow = true; grp.add(s); }
  if (face === -1) { grp.rotation.y = Math.PI; grp.position.set(0, 0, z0); grp.scale.x = 1; grp.position.x = 0; }
  else grp.position.z = z0;
  grp.userData.ridgeY = ridgeY;
  return grp;
}

// ---------- the street ----------
export function makeStreet({ x0 = -60, x1 = 60 } = {}) {
  const g = new THREE.Group(), L = x1 - x0, cx = (x0 + x1) / 2, { W, PAVE, KERB } = STREET;
  const asph = new THREE.MeshStandardMaterial({ color: '#25262a', roughness: 0.42, metalness: 0 });
  asph.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; ${SIMPLEX}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      { float n = snoise(vWP * 0.6) * 0.5 + 0.5, n2 = snoise(vWP * 3.1);
        diffuseColor.rgb *= 0.85 + 0.2 * n + 0.04 * n2; }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(0.32 + 0.35 * (snoise(vWP * 0.35) * 0.5 + 0.5), 0.2, 0.8);`);
  };
  asph.customProgramCacheKey = () => 'asph12';
  const road = new THREE.Mesh(new THREE.PlaneGeometry(L, W - 2 * PAVE), asph); road.rotation.x = -Math.PI / 2; road.position.set(cx, 0, W / 2); road.receiveShadow = true; g.add(road);
  const paveM = new THREE.MeshStandardMaterial({ color: '#3b3c3f', roughness: 0.6 });
  const kerbM = new THREE.MeshStandardMaterial({ color: '#8b8a86', roughness: 0.7 });
  for (const [z, s] of [[PAVE / 2, 1], [W - PAVE / 2, -1]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(L, KERB, PAVE), paveM); p.position.set(cx, KERB / 2, z); p.receiveShadow = true; g.add(p);
    const k = new THREE.Mesh(new THREE.BoxGeometry(L, KERB + 0.02, 0.22), kerbM); k.position.set(cx, (KERB + 0.02) / 2, z + s * (PAVE / 2 - 0.11)); k.receiveShadow = true; g.add(k);
  }
  // a gutter line of slightly darker, wetter asphalt along both kerbs
  return g;
}
// wall lanterns (Paris "consoles"): an iron bracket and a lantern; returns { group, lights: [pos] }
export function makeLanterns(list) {
  const g = new THREE.Group(), iron = new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.45, metalness: 0.6 });
  const glow = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffc98a', emissiveIntensity: 6 });
  const pts = [];
  for (const { x, y, z, face } of list) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), iron); b.position.set(x, y, z + face * 0.45); g.add(b);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), iron); s.position.set(x, y - 0.22, z + face * 0.2); s.rotation.x = face * 0.8; g.add(s);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 6), iron); cap.position.set(x, y + 0.02, z + face * 0.9); g.add(cap);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.36, 6), glow); lamp.position.set(x, y - 0.22, z + face * 0.9); g.add(lamp);
    pts.push(V(x, y - 0.3, z + face * 0.9));
  }
  return { group: g, pts };
}
