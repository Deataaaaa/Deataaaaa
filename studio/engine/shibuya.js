// Shibuya Crossing at night for post 8 (What if 1 gram of antimatter appeared in front of you?). Local frame: x east,
// z south, y up, street level y = 0, the crossing's centre at the origin. Two avenues cross: the north-south one 26 m curb
// to curb (|x| < 13), the east-west one 22 m (|z| < 11); five zebra crossings (one across each arm plus the two diagonals
// of the scramble). Buildings line the four arms from the building lines |x| = 19 / |z| = 17 out to 300 m: podiums with
// screens (engine/tsq.js makeScreens, invented adverts from ads6.js) and neon signs in Japanese (vertical blade signs and
// shop fascias, drawn once on canvases with a Noto Sans JP subset). Wet asphalt: puddles mirror the neon through the
// environment map. Every procedural pattern is box-filtered (fwidth), nothing changes per frame except slow screens.
import * as THREE from 'three';
import { rng } from './core.js';
import { makeFacadeMaterial } from './town5.js';
import { makeScreens, TQ } from './tsq.js';

export const SB = { RX: 13, RZ: 11, LX: 19, LZ: 17, U: { uShock: { value: -1 }, uSignGain: { value: 1 }, uMinRough: { value: 0 } } };

// ---------------------------------------------------------------------------------------------------------------
// the ground: asphalt (wet, puddles), zebra crossings, stop lines and lane dashes, paved sidewalks with granite curbs
// ---------------------------------------------------------------------------------------------------------------
export function makeShibuyaGround() {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0.0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uMinRough = SB.U.uMinRough;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vGW; uniform float uMinRough;
      float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }
      float gfbm(vec2 p, float fw){ float s = 0.0, a = 0.5, f = 1.0; for (int i = 0; i < 5; i++){ s += a * mix(0.5, gn(p), 1.0 - smoothstep(0.25, 0.6, fw * f)); p = p * 2.03 + 1.7; a *= 0.5; f *= 2.03; } return s; }
      // fraction of a box-filtered square wave (period 1, on for the second half) inside [x - w/2, x + w/2]
      float sqI(float x){ return floor(x) * 0.5 + max(0.0, fract(x) - 0.5); }
      float sqF(float x, float w){ w = max(w, 1e-4); return (sqI(x + 0.5 * w) - sqI(x - 0.5 * w)) / w; }
      float boxF(float x, float a, float b, float w){ return clamp((min(x, b) - max(x, a)) / max(w, 1e-4) + 0.5, 0.0, 1.0) * step(a - w, x) * step(x, b + w); }
      float inR(float x, float a, float b, float w){ return smoothstep(a - w, a + w, x) * (1.0 - smoothstep(b - w, b + w, x)); }
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec2 p = vGW.xz; float fw = max(fwidth(p.x), fwidth(p.y)) + 1e-4;
      float ax = abs(p.x), az = abs(p.y);
      float road = max(1.0 - smoothstep(13.0 - fw, 13.0 + fw, ax), 1.0 - smoothstep(11.0 - fw, 11.0 + fw, az));
      float curb = road < 0.5 ? max(inR(ax, 13.0, 13.25, fw) * step(11.0, az), inR(az, 11.0, 11.25, fw) * step(13.0, ax)) : 0.0;
      // zebra crossings: bars 0.45 m wide every 0.9 m, parallel to the traffic, repeated along the walking direction
      float zeb = 0.0;
      zeb = max(zeb, inR(p.y, -17.0, -11.6, fw) * inR(p.x, -12.2, 12.2, fw) * sqF(p.x / 0.9, fw / 0.9));
      zeb = max(zeb, inR(p.y, 11.6, 17.0, fw) * inR(p.x, -12.2, 12.2, fw) * sqF(p.x / 0.9, fw / 0.9));
      zeb = max(zeb, inR(p.x, 13.6, 19.0, fw) * inR(p.y, -10.2, 10.2, fw) * sqF(p.y / 0.9, fw / 0.9));
      zeb = max(zeb, inR(p.x, -19.0, -13.6, fw) * inR(p.y, -10.2, 10.2, fw) * sqF(p.y / 0.9, fw / 0.9));
      vec2 d1 = normalize(vec2(13.0, 11.0)), d2 = normalize(vec2(13.0, -11.0));
      for (int k = 0; k < 2; k++){ vec2 dd = k == 0 ? d1 : d2; float along = dot(p, dd), across = dot(p, vec2(-dd.y, dd.x));
        zeb = max(zeb, inR(across, -2.6, 2.6, fw) * inR(along, -13.5, 13.5, fw) * sqF(along / 0.9, fw / 0.9) * step(ax, 13.0) * step(az, 11.0)); }
      // stop lines and lane dashes on the arms
      float paint = zeb;
      paint = max(paint, inR(az, 18.4, 18.9, fw) * step(az, 40.0) * inR(ax, 0.0, 12.6, fw) * step(11.0, az));
      paint = max(paint, inR(ax, 20.4, 20.9, fw) * step(13.0, ax) * inR(az, 0.0, 10.6, fw));
      paint = max(paint, inR(ax, -0.1, 0.1, fw) * step(18.9, az) * sqF(p.y / 8.0, fw / 8.0) * (1.0 - step(13.0, ax)));
      paint = max(paint, inR(az, -0.1, 0.1, fw) * step(20.9, ax) * sqF(p.x / 8.0, fw / 8.0) * (1.0 - step(11.0, az)));
      paint = max(paint, (inR(ax, 6.4, 6.55, fw) * step(18.9, az) + inR(az, 5.4, 5.55, fw) * step(20.9, ax)) * 0.85);
      float worn = gfbm(p * 1.3, fw * 1.3);
      paint *= road * smoothstep(0.18, 0.42, worn);
      // wet: a damp film everywhere, puddles in the low spots (large soft shapes)
      float pud = smoothstep(0.52, 0.6, gfbm(p * 0.11 + 3.1, fw * 0.11)) ;
      float grit = gfbm(p * 6.0, fw * 6.0);
      vec3 asph = vec3(0.05, 0.05, 0.055) * (0.75 + 0.5 * grit);
      // sidewalks: 0.6 m pavers, pale grey with a warm cast
      vec2 tp = p / 0.6; float gx = sqF(tp.x + 0.25, fw / 0.6), gz = sqF(tp.y + 0.25, fw / 0.6);
      float joint = 1.0 - (1.0 - smoothstep(0.0, 0.1, abs(fract(tp.x) - 0.5) - 0.42 + fw)) * 0.0;
      vec3 pave = vec3(0.21, 0.2, 0.19) * (0.85 + 0.25 * gn(floor(tp) * 1.7)) * (0.92 + 0.16 * gx * gz);
      vec3 col = mix(pave, asph, road);
      col = mix(col, vec3(0.42, 0.41, 0.39), curb);
      col = mix(col, vec3(0.78, 0.78, 0.76), paint * 0.92);
      float wet = mix(0.35, 1.0, pud);
      diffuseColor.rgb = col * (1.0 - 0.45 * wet * (1.0 - paint * 0.5));
      float gRough = mix(mix(0.62, 0.7, grit), 0.05, pud);
      gRough = mix(gRough, mix(0.45, 0.12, pud), paint);
      gRough = mix(gRough, mix(0.5, 0.1, pud), 1.0 - road);
    `).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = max(gRough, uMinRough);');
  };
  mat.customProgramCacheKey = () => 'shibuya_ground_v1';
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1).rotateX(-Math.PI / 2), mat);
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// the neon signs: two atlases drawn on canvases (vertical blade signs, horizontal shop signs), Japanese shop words only
// ---------------------------------------------------------------------------------------------------------------
const WV = ['ラーメン', 'カラオケ', '居酒屋', '焼肉', '寿司', 'ホテル', '喫茶', '歯科', '中古', '牛丼', '薬', 'ゲーム', '占い', '漫画', '質屋', 'うどん'];
const WH = ['営業中', '駐車場', '不動産', '眼鏡', '古着', '生ビール', '電器', '免税', '両替', '案内所', 'カフェ', 'バー', 'マッサージ', '二十四時間', '焼鳥', '餃子'];
const NEON = ['#ff3b8d', '#2ef0ff', '#ffe23d', '#5dff6a', '#ff4a3a', '#ffffff', '#ff9d2e', '#b46bff'];
export async function makeSignAtlases() {
  await document.fonts.load('800 100px "Noto Sans JP"');
  const r = rng(88);
  const draw = (w, h, cols, rows, words, vertical) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const tw = w / cols, th = h / rows;
    words.forEach((word, i) => {
      const x0 = (i % cols) * tw, y0 = Math.floor(i / cols) * th, col = NEON[Math.floor(r() * NEON.length)], panel = r() < 0.5;
      g.save(); g.beginPath(); g.rect(x0, y0, tw, th); g.clip();
      if (panel) { g.fillStyle = ['#2a0614', '#06202a', '#2a2006', '#0d0d10', '#1a0830'][Math.floor(r() * 5)]; g.fillRect(x0 + 4, y0 + 4, tw - 8, th - 8); }
      g.strokeStyle = col; g.lineWidth = vertical ? 7 : 6; g.shadowColor = col; g.shadowBlur = 18; g.strokeRect(x0 + 10, y0 + 10, tw - 20, th - 20);
      g.fillStyle = panel ? col : '#fff'; g.shadowBlur = 22; g.textAlign = 'center'; g.textBaseline = 'middle';
      const chars = [...word];
      if (vertical) { const fs = Math.min(tw * 0.68, (th - 50) / chars.length * 0.9); g.font = `800 ${fs}px "Noto Sans JP"`;
        chars.forEach((ch, k) => g.fillText(ch, x0 + tw / 2, y0 + 25 + (k + 0.5) * (th - 50) / chars.length)); }
      else { const fs = Math.min(th * 0.62, (tw - 40) / chars.length * 0.95); g.font = `800 ${fs}px "Noto Sans JP"`; g.fillText(word, x0 + tw / 2, y0 + th / 2 + fs * 0.04); }
      if (!panel) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.globalAlpha = 0.55; g.fillRect(x0, y0, tw, th); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      g.restore();
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  return { v: draw(1024, 1536, 8, 2, WV, true), h: draw(1024, 1024, 2, 8, WH, false) };
}
// an instanced set of sign faces: each instance = one face (blade signs get two, back to back, so text never mirrors);
// a sign dies (a short bright flash, then dark) when the shock front's radius uShock passes its distance from the centre
function signMesh(list, tex, cols, rows) {
  const g = new THREE.PlaneGeometry(1, 1), at = new Float32Array(list.length * 4);
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uShock: SB.U.uShock, uGain: SB.U.uSignGain, uCR: { value: new THREE.Vector2(cols, rows) } },
    vertexShader: `attribute vec4 aSign; varying vec2 vUv; varying float vD; varying float vSeed; uniform vec2 uCR;
      void main(){ float c = mod(aSign.x, uCR.x), r = floor(aSign.x / uCR.x);
        vUv = vec2((c + uv.x) / uCR.x, 1.0 - (r + 1.0 - uv.y) / uCR.y); vD = aSign.y; vSeed = aSign.z;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float uShock, uGain; varying vec2 vUv; varying float vD; varying float vSeed;
      void main(){ vec3 c = texture2D(map, vUv).rgb; float past = uShock - vD;
        float on = past < 0.0 ? 1.0 : 3.0 * (1.0 - smoothstep(0.0, 4.0, past));
        gl_FragColor = vec4(c * (1.6 + 0.6 * vSeed) * uGain * on + c * 0.02, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.FrontSide,
  });
  const im = new THREE.InstancedMesh(g, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  list.forEach((s, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw); m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(s.w, s.h, 1)); im.setMatrixAt(i, m4);
    at.set([s.tile, Math.hypot(s.x, s.z), s.seed, 0], i * 4); });
  g.setAttribute('aSign', new THREE.InstancedBufferAttribute(at, 4)); im.frustumCulled = false;
  return im;
}

// ---------------------------------------------------------------------------------------------------------------
// the buildings round the crossing: four rows per arm, the corner landmarks (a slim glass tower on the north-west corner
// carrying a giant screen on its cut corner, a stack of three screens on the north-east, the station on the south-west)
// ---------------------------------------------------------------------------------------------------------------
export function makeShibuya(ads, signs, seed = 5) {
  const r = rng(seed), group = new THREE.Group(), screens = [], lights = [], blades = [], fascias = [], bodies = [];
  const mats = {}; for (const [k, f] of [['px', [1, 0]], ['nx', [-1, 0]], ['pz', [0, 1]], ['nz', [0, -1]]]) mats[k] = makeFacadeMaterial({ baseY: 0, front: f, key: 'sby_' + k, power: TQ.uPower });
  const insts = { px: [], nx: [], pz: [], nz: [] };
  const box = (set, x, z, ang, sx, sy, sz, y0, st) => { insts[set].push({ x, y: y0 + sy / 2, z, ang, sx, sy, sz, st, tint: r(), hue: r() }); bodies.push({ x, z, sx: Math.abs(Math.cos(ang)) * sx + Math.abs(Math.sin(ang)) * sz, sz: Math.abs(Math.sin(ang)) * sx + Math.abs(Math.cos(ang)) * sz, h: y0 + sy }); };
  const screen = (o) => screens.push({ tile: Math.floor(r() * 16), seed: r(), kind: 0, ...o });
  // one building: F = front point on the building line, d = unit along-street direction (x, z), o = outward normal (away
  // from the street, into the block), w = frontage
  function building(F, d, o, w, set, near) {
    const depth = 18 + r() * 14, hp = 9 + r() * (near ? 26 : 34), tower = r() < 0.55 ? 15 + r() * 70 : 0;
    const ang = Math.atan2(d[0], d[1]), C = { x: F.x + o[0] * depth / 2, z: F.z + o[1] * depth / 2 };
    box(set, C.x, C.z, ang, depth, hp, w, 0, r() < 0.5 ? 1 : 3);
    if (tower) { const sb = 2 + r() * 4, d2 = depth - sb - 2, w2 = w * (0.6 + 0.35 * r()); box(set, F.x + o[0] * (sb + d2 / 2), F.z + o[1] * (sb + d2 / 2), ang, d2, tower, w2, hp, r() < 0.6 ? 2 : 1); }
    const n = [-o[0], -o[1]], yaw = Math.atan2(n[0], n[1]), dist = Math.hypot(F.x, F.z);
    const along = (k, out = 0.3) => ({ x: F.x + n[0] * out + d[0] * k, z: F.z + n[1] * out + d[1] * k });
    // shop fascia over the ground floor, one or two glowing signs
    const nf = w > 16 && r() < 0.5 ? 2 : 1;
    for (let k = 0; k < nf; k++) { const fwid = (w / nf) * 0.8, p = along(-w / 2 + (k + 0.5) * w / nf, 0.25); fascias.push({ x: p.x, y: 3.6 + r() * 0.6, z: p.z, w: fwid, h: fwid / 4, yaw, tile: Math.floor(r() * 16), seed: r() }); }
    // blade signs sticking out of the front, seen along the street (two faces back to back)
    const nb = dist < 220 ? 1 + Math.floor(r() * 3) : r() < 0.4 ? 1 : 0;
    for (let k = 0; k < nb; k++) {
      const hgt = 4 + r() * 6, y = 5 + hgt / 2 + r() * Math.max(0.5, hp - hgt - 6), p = along(-w / 2 + 1 + r() * (w - 2), 0.9), byaw = Math.atan2(d[0], d[1]), tile = Math.floor(r() * 16), sd = r();
      if (y + hgt / 2 > hp + tower - 1) continue;
      blades.push({ x: p.x, y, z: p.z, w: 1.15, h: hgt, yaw: byaw, tile, seed: sd }, { x: p.x, y, z: p.z, w: 1.15, h: hgt, yaw: byaw + Math.PI, tile, seed: sd });
    }
    // screens on the podiums near the crossing
    if (near && hp > 16 && r() < 0.55) { const hh = Math.min(hp - 8, 6 + r() * 10), p = along(0, 0.35); screen({ x: p.x, y: hp - 2 - hh / 2, z: p.z, w: w * 0.8, h: hh, yaw }); lights.push({ x: p.x + n[0] * 6, y: hp - 2 - hh / 2, z: p.z + n[1] * 6, nx: n[0], nz: n[1], seed: screens[screens.length - 1].seed }); }
  }
  // the four arms: [along-street dir d, which building line, outward normal, facade set], from 32 m to 300 m
  const ROWS = [
    { d: [0, -1], line: (u) => ({ x: -SB.LX, z: -u }), o: [-1, 0], set: 'px' }, { d: [0, -1], line: (u) => ({ x: SB.LX, z: -u }), o: [1, 0], set: 'nx' },
    { d: [0, 1], line: (u) => ({ x: -SB.LX, z: u }), o: [-1, 0], set: 'px' }, { d: [0, 1], line: (u) => ({ x: SB.LX, z: u }), o: [1, 0], set: 'nx' },
    { d: [1, 0], line: (u) => ({ x: u, z: -SB.LZ }), o: [0, -1], set: 'pz' }, { d: [1, 0], line: (u) => ({ x: u, z: SB.LZ }), o: [0, 1], set: 'nz' },
    { d: [-1, 0], line: (u) => ({ x: -u, z: -SB.LZ }), o: [0, -1], set: 'pz' }, { d: [-1, 0], line: (u) => ({ x: -u, z: SB.LZ }), o: [0, 1], set: 'nz' },
  ];
  for (const R of ROWS) { let u = 34; while (u < 300) { const w = 11 + r() * 13; const F = R.line(u + w / 2); building(F, R.d, R.o, w - 0.5, R.set, u < 120); u += w; } }
  // the corners: a cut-corner glass tower (north-west) with a giant screen, a stepped block with three screens (north-east),
  // a big block with two screens (south-east), the station's long low hall (south-west)
  const cut = (cx, cz, nx, nz, w, h, scr) => {
    const ang = Math.atan2(nx, nz), set = Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? 'px' : 'nx') : (nz > 0 ? 'pz' : 'nz');
    box(set, cx, cz, ang, 22, h, w, 0, 2);
    const yaw = ang, fx = cx + nx * 11.3, fz = cz + nz * 11.3;
    for (const s of scr) { screen({ x: fx, y: s[0], z: fz, w: s[2] ?? w * 0.82, h: s[1], yaw }); lights.push({ x: fx + nx * 10, y: s[0], z: fz + nz * 10, nx, nz, seed: screens[screens.length - 1].seed }); }
  };
  const k2 = Math.SQRT1_2;
  cut(-36, -33, k2, k2, 26, 62, [[34, 30, 21]]);                 // north-west: the giant screen
  cut(36, -33, -k2, k2, 28, 38, [[30, 9], [20, 8], [10.5, 7]]);    // north-east: three stacked
  cut(37, 34, -k2, -k2, 30, 46, [[33, 14], [17, 10]]);             // south-east
  box('nz', -44, 36, Math.PI / 4, 40, 18, 30, 0, 1);               // south-west: the station hall
  for (const [x, z] of [[-30, -48], [-50, -30], [48, -28], [28, -50], [50, 30], [30, 52], [-58, 58], [-34, 62]]) box(Math.abs(x) > Math.abs(z) ? (x > 0 ? 'nx' : 'px') : (z > 0 ? 'nz' : 'pz'), x, z, 0, 20, 20 + r() * 40, 20, 0, 1);
  // a second ring of taller towers behind the rows (the skyline)
  for (let i = 0; i < 140; i++) { const a = r() * Math.PI * 2, d = 90 + r() * 420, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.abs(x) < 60 || Math.abs(z) < 55) continue; box(['px', 'nx', 'pz', 'nz'][Math.floor(r() * 4)], x, z, r() * 0.3, 20 + r() * 20, 30 + r() * 140, 20 + r() * 20, 0, 2); }
  for (const [set, list] of Object.entries(insts)) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats[set], list.length);
    const sty = new Float32Array(list.length * 4), fac = new Float32Array(list.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    list.forEach((o, i) => { q.setFromAxisAngle(up, o.ang); m4.compose(new THREE.Vector3(o.x, o.y, o.z), q, new THREE.Vector3(o.sx, o.sy, o.sz)); im.setMatrixAt(i, m4); sty.set([o.st, o.tint, 0, o.hue], i * 4); fac.set([Math.sin(o.ang), Math.cos(o.ang)], i * 2); });
    im.geometry.setAttribute('aStyle', new THREE.InstancedBufferAttribute(sty, 4)); im.geometry.setAttribute('aFace', new THREE.InstancedBufferAttribute(fac, 2));
    im.computeBoundingSphere(); im.receiveShadow = true; im.castShadow = true; group.add(im);
  }
  const scr = makeScreens(screens, ads); group.add(scr.mesh);
  const bl = signMesh(blades, signs.v, 8, 2), fa = signMesh(fascias, signs.h, 2, 8); group.add(bl, fa);
  return { group, screens, lights, bodies, scr, mats: Object.values(mats), signs: [bl, fa] };
}

// ---------------------------------------------------------------------------------------------------------------
// street furniture: traffic and pedestrian signals on the corners, tall lamp posts, guard rails, vending machines
// ---------------------------------------------------------------------------------------------------------------
export function makeStreetStuff() {
  const group = new THREE.Group(), r = rng(9);
  const pole = new THREE.MeshStandardMaterial({ color: '#6f7277', metalness: 0.7, roughness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: '#202226', metalness: 0.4, roughness: 0.5 });
  const lampM = new THREE.MeshStandardMaterial({ color: '#fff3dc', emissive: '#ffe3b0', emissiveIntensity: 4 });
  const green = new THREE.MeshStandardMaterial({ color: '#103018', emissive: '#29ff7a', emissiveIntensity: 3.5 });
  const red = new THREE.MeshStandardMaterial({ color: '#301010', emissive: '#ff3020', emissiveIntensity: 3.5 });
  const corners = [[-14.2, -12.2], [14.2, -12.2], [14.2, 12.2], [-14.2, 12.2]];
  const lamps = [];
  for (const [x, z] of corners) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 6.2, 10), pole); p.position.set(x, 3.1, z); group.add(p);
    // car signals on an arm over the road, pedestrian signals (walking man lit green: the scramble) at head height
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 5.5), pole); arm.position.set(x, 6.0, z - Math.sign(z) * 2.6); group.add(arm);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.42, 0.32), dark); hd.position.set(x, 5.75, z - Math.sign(z) * 5.0); group.add(hd);
    for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), k === 2 ? red : dark); l.position.set(x - 0.4 + k * 0.4, 5.75, z - Math.sign(z) * 5.0 + Math.sign(z) * 0.165); if (z < 0) l.rotation.y = Math.PI; group.add(l); }
    for (const s of [-1, 1]) { const ped = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.75, 0.3), dark); ped.position.set(x, 2.9, z); ped.rotation.y = s > 0 ? 0 : Math.PI / 2; group.add(ped);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.28), green); g.position.set(x + (s > 0 ? 0 : -Math.sign(x) * 0.16), 2.72, z + (s > 0 ? -Math.sign(z) * 0.16 : 0)); g.rotation.y = s > 0 ? (z > 0 ? Math.PI : 0) : (x > 0 ? -Math.PI / 2 : Math.PI / 2); group.add(g); }
  }
  // lamp posts along the curbs of the four arms
  for (const s of [-1, 1]) for (let u = 22; u < 160; u += 24) for (const side of [-1, 1]) {
    for (const [x, z] of [[side * 13.6, s * u], [s * u, side * 11.6]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 8, 8), pole); p.position.set(x, 4, z); group.add(p);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.9), lampM); h.position.set(x - Math.sign(x) * (Math.abs(x) < 14 ? 0.6 : 0), 8, z - Math.sign(z) * (Math.abs(z) < 12 ? 0.6 : 0)); group.add(h);
      lamps.push(h.position.clone());
    }
  }
  // guard rails along the sidewalk edges near the crossing (gaps at the zebra crossings)
  const railM = new THREE.MeshStandardMaterial({ color: '#c9cdd2', metalness: 0.6, roughness: 0.35 });
  for (const s of [-1, 1]) for (const side of [-1, 1]) {
    for (const [x0, z0, dx, dz] of [[side * 13.4, s * 19.5, 0, 1], [s * 21.5, side * 11.4, 1, 0]]) {
      const len = 22, g = new THREE.Mesh(new THREE.BoxGeometry(dx ? len : 0.06, 0.06, dz ? len : 0.06), railM); g.position.set(x0 + s * dx * len / 2, 0.85, z0 + s * dz * len / 2); group.add(g);
      for (let k = 0; k <= 11; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), railM); b.position.set(x0 + s * dx * k * 2, 0.42, z0 + s * dz * k * 2); group.add(b); }
    }
  }
  // vending machines: a row of three on the north-east corner (Apple sits on the middle one), two on the south-west
  const vend = [];
  const vendFront = (hue) => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = `hsl(${hue},70%,45%)`; g.fillRect(0, 0, 128, 256); g.fillStyle = '#e8f4ff'; g.fillRect(10, 18, 108, 120);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) { g.fillStyle = `hsl(${(hue + 40 * j + 90 * i) % 360},75%,55%)`; g.fillRect(16 + j * 17, 24 + i * 29, 12, 22); }
    g.fillStyle = '#111'; g.fillRect(20, 190, 88, 30); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  for (const [x, z, yaw, hue] of [[20.5, -18.6, Math.PI, 210], [21.6, -18.6, Math.PI, 0], [22.7, -18.6, Math.PI, 120], [-20.4, 18.8, 0, 30], [-21.5, 18.8, 0, 200]]) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.85, 0.75), new THREE.MeshStandardMaterial({ color: '#d8dadd', roughness: 0.4, metalness: 0.3 })); body.position.set(x, 0.925, z); body.rotation.y = yaw; group.add(body);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.75), new THREE.MeshStandardMaterial({ map: vendFront(hue), emissive: '#ffffff', emissiveMap: vendFront(hue), emissiveIntensity: 1.2, roughness: 0.3 }));
    f.position.set(x - Math.sin(yaw) * -0.38 * 0 + 0, 0.95, z + (yaw === 0 ? 0.38 : -0.38)); f.rotation.y = yaw; group.add(f); vend.push({ x, z, top: 1.85, yaw });
  }
  void r;
  return { group, lampM, lamps, vend, signalM: [green, red] };
}

// ---------------------------------------------------------------------------------------------------------------
// Tokyo seen from Tokyo Tower (4 km east of the crossing): a field of lit towers, denser and taller toward the centre
// ---------------------------------------------------------------------------------------------------------------
export function makeTokyo(seed = 21) {
  const r = rng(seed), mat = makeFacadeMaterial({ baseY: 0, front: [0, 1], key: 'tokyo_far', power: TQ.uPower }), list = [];
  for (let i = 0; i < 6500; i++) {
    const x = -3500 + r() * 9000, z = -4500 + r() * 9000;
    if (Math.hypot(x, z) < 330 || Math.hypot(x - 4070, z - 100) < 160) continue;
    const dc = Math.min(Math.hypot(x - 2600, z - 600), Math.hypot(x, z) * 1.3);
    const h = 8 + r() * (r() < 0.08 ? 160 : 40) * Math.exp(-dc / 4000) + (r() < 0.03 ? 120 : 0);
    list.push({ x, z, h, w: 14 + r() * 26, d: 14 + r() * 26, ang: r() * 0.5 });
  }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, list.length);
  const sty = new Float32Array(list.length * 4), fac = new Float32Array(list.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((o, i) => { q.setFromAxisAngle(up, o.ang); m4.compose(new THREE.Vector3(o.x, o.h / 2, o.z), q, new THREE.Vector3(o.w, o.h, o.d)); im.setMatrixAt(i, m4); sty.set([r() < 0.6 ? 2 : 1, r(), 0, r()], i * 4); fac.set([Math.sin(o.ang), Math.cos(o.ang)], i * 2); });
  im.geometry.setAttribute('aStyle', new THREE.InstancedBufferAttribute(sty, 4)); im.geometry.setAttribute('aFace', new THREE.InstancedBufferAttribute(fac, 2));
  im.computeBoundingSphere(); im.frustumCulled = false;
  return { mesh: im, list, mat };
}
