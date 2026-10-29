// « 12 % » season 2, Part 1: the boulevard de Clichy at Pigalle at 2 am, wet after the rain. Local frame: x along the
// boulevard (the cars on the near carriageway drive toward -x), z across, y up. The hero façade stands at z = 0 facing +z,
// its pavement runs to the kerb at z = 4, the near carriageway to z = 11, the planted central reservation (terre-plein)
// to z = 21, the far carriageway to z = 28, the far pavement to 32, the far façades at z = 32 facing -z.
// Ground floors are bars, a tabac, a hotel, a pharmacy, a kebab, a club: lit glass fronts with interiors drawn on canvas,
// neon over them, coloured light on the pavement. The wet ground mirrors it all (a planar reflection, layer 0 only; the
// ground itself is on layer 1), streaked toward the viewer, sharp in the puddles.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeHaussmann } from './paris12.js';
import { makeNightSky } from './piccadilly.js';
import { SIMPLEX } from './fx.js';
import { rng } from './core.js';
import { makeTrees } from './paris.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const PG = { KERB: 0.14, ZK: 4.0, ZR1: 11.0, ZR2: 21.0, ZR3: 28.0, ZF: 32.0, X0: -46, X1: 46 };

// ---------- canvas helpers ----------
const canvas = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
const texOf = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
// a neon word: a soft halo and a bright core in the tube colour, transparent elsewhere
function neonTex(txt, col, { w = 1024, h = 256, font = 'bold 150px "Arial Rounded MT Bold", Arial, sans-serif', italic = false } = {}) {
  const cv = canvas(w, h), c = cv.getContext('2d');
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = (italic ? 'italic ' : '') + font;
  for (const [blur, a, lw] of [[40, 0.35, 16], [18, 0.6, 9], [6, 1, 5]]) { c.shadowColor = col; c.shadowBlur = blur; c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = lw; c.strokeText(txt, w / 2, h / 2); }
  c.shadowBlur = 0; c.globalAlpha = 1; c.strokeStyle = '#fff'; c.lineWidth = 2.2; c.strokeText(txt, w / 2, h / 2);
  return texOf(cv);
}
// a shop interior seen through the glass: a lit back wall, a counter, shelves of bottles or goods, a few lamps
function interiorTex(kind, seed) {
  const r = rng(seed), cv = canvas(512, 512), c = cv.getContext('2d');
  const base = { bar: ['#5a2a14', '#c27a3a'], tabac: ['#d8d2c2', '#f6f1e2'], hotel: ['#2a3550', '#a9b6d8'], pharma: ['#16301f', '#3f7a52'], kebab: ['#e8dcc0', '#fff6dc'], club: ['#2a0c2e', '#a0307a'] }[kind] || ['#222', '#555'];
  const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, base[0]); g.addColorStop(0.55, base[1]); g.addColorStop(1, base[0]); c.fillStyle = g; c.fillRect(0, 0, 512, 512);
  if (kind === 'bar' || kind === 'club') {
    for (let row = 0; row < 3; row++) for (let i = 0; i < 26; i++) { c.fillStyle = `hsla(${20 + r() * 40}, 70%, ${35 + r() * 35}%, 0.9)`; c.fillRect(20 + i * 18 + r() * 4, 110 + row * 70, 9, 36 + r() * 14); }
    c.fillStyle = 'rgba(20,8,4,0.85)'; c.fillRect(0, 330, 512, 182);
    for (let i = 0; i < 4; i++) { const x = 60 + i * 120 + r() * 40; c.fillStyle = 'rgba(10,4,2,0.75)'; c.beginPath(); c.ellipse(x, 300, 28, 34, 0, 0, 7); c.fill(); c.fillRect(x - 40, 330, 80, 182); }
    for (let i = 0; i < 5; i++) { const gl = c.createRadialGradient(50 + i * 105, 40, 2, 50 + i * 105, 40, 60); gl.addColorStop(0, 'rgba(255,220,160,1)'); gl.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = gl; c.fillRect(0, 0, 512, 160); }
  } else if (kind === 'tabac' || kind === 'kebab' || kind === 'pharma') {
    for (let row = 0; row < 4; row++) for (let i = 0; i < 14; i++) { c.fillStyle = `hsl(${r() * 360}, ${kind === 'pharma' ? 20 : 55}%, ${45 + r() * 30}%)`; c.fillRect(14 + i * 35, 60 + row * 62, 28, 40); }
    c.fillStyle = kind === 'kebab' ? '#8a5a2a' : '#6a6458'; c.fillRect(0, 340, 512, 172);
  } else if (kind === 'hotel') {
    c.fillStyle = '#d8c79a'; c.fillRect(170, 250, 170, 110); c.fillStyle = 'rgba(255,240,200,0.9)'; c.fillRect(220, 120, 70, 60);
  }
  return texOf(cv);
}
// the red « carotte » of a French tabac (a double cone in a lozenge, lit)
function carotteTex() {
  const cv = canvas(256, 512), c = cv.getContext('2d');
  c.fillStyle = '#b3141e'; c.beginPath(); c.moveTo(128, 6); c.lineTo(250, 256); c.lineTo(128, 506); c.lineTo(6, 256); c.closePath(); c.fill();
  c.strokeStyle = '#ffd7d0'; c.lineWidth = 6; c.stroke();
  c.fillStyle = '#fff3ea'; c.font = 'bold 54px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  ['T', 'A', 'B', 'A', 'C'].forEach((ch, i) => c.fillText(ch, 128, 140 + i * 58));
  return texOf(cv);
}
function crossTex() {
  const cv = canvas(256, 256), c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256);
  c.shadowColor = '#3cff7a'; c.shadowBlur = 24; c.fillStyle = '#5dff8f'; c.fillRect(88, 20, 80, 216); c.fillRect(20, 88, 216, 80);
  return texOf(cv);
}

// ---------- the wet ground ----------
function groundMat({ refl, pave }) {
  const m = new THREE.MeshStandardMaterial({ color: pave ? '#6e6c68' : '#2a2a2c', roughness: 0.8, metalness: 0 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { tRefl: refl.material.uniforms.tDiffuse, uTexMat: refl.material.uniforms.textureMatrix, uRefInv: { value: refl.userData.inv }, uRefK: refl.userData.k });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      ${SIMPLEX}
      varying vec3 vWP; uniform sampler2D tRefl; uniform float uRefK; uniform mat4 uTexMat, uRefInv;
      float hs1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 fw = fwidth(vWP.xz); float px = max(fw.x, fw.y);
      ${pave ? `vec2 sg = vWP.xz / vec2(0.3, 0.2); sg.x += 0.5 * mod(floor(sg.y), 2.0);
        vec2 sf = fract(sg), sw = fwidth(sg) + 1e-4;
        vec2 jl = smoothstep(0.03 - sw, 0.03 + sw, sf) * smoothstep(0.03 - sw, 0.03 + sw, 1.0 - sf);
        float joint = (1.0 - jl.x * jl.y) * (1.0 - smoothstep(0.15, 0.4, max(sw.x, sw.y)));
        diffuseColor.rgb *= (0.85 + 0.25 * hs1(floor(sg)) * (1.0 - smoothstep(0.2, 0.6, max(sw.x, sw.y)))) * (1.0 - 0.4 * joint);`
      : `float grain = snoise(vec3(vWP.xz * 4.0, 0.0)) * (1.0 - smoothstep(0.03, 0.12, px));
        diffuseColor.rgb *= 0.88 + 0.12 * grain + 0.1 * snoise(vec3(vWP.xz * 0.08, 3.0));
        // a dashed lane line and the kerb-side gutter
        float lane = step(abs(vWP.z - 7.5), 0.06) * step(0.5, fract(vWP.x / 6.0));
        float lane2 = step(abs(vWP.z - 24.5), 0.06) * step(0.5, fract(vWP.x / 6.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.62, 0.6), max(lane, lane2) * (1.0 - smoothstep(0.05, 0.2, px)));`}
      float pud = smoothstep(0.42, 0.62, snoise(vec3(vWP.xz * 0.22, 1.7)) * 0.5 + 0.5 + ${pave ? '-0.2' : '0.0'} + 0.22 * smoothstep(1.0, 0.0, abs(vWP.z - ${pave ? '-1.0' : '4.25'})));
      diffuseColor.rgb *= 0.72 - 0.2 * pud;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(${pave ? '0.5' : '0.38'}, 0.06, pud);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      vec4 rp = uTexMat * (uRefInv * vec4(vWP.x, 0.0, vWP.z, 1.0));
      vec2 ruv = rp.xy / max(rp.w, 1e-4);
      vec3 Vv = normalize(cameraPosition - vWP);
      float fres = 0.03 + 0.97 * pow(max(1.0 - Vv.y, 0.0), 5.0);
      float rgh = mix(${pave ? '0.6' : '0.5'}, 0.04, pud);
      vec3 rc = vec3(0.0); float st = rgh * 0.03;
      for (int k = -3; k <= 3; k++) rc += textureLod(tRefl, ruv + vec2(0.0, float(k) * st), rgh * 6.0).rgb;
      rc /= 7.0;
      rc = rc / (1.0 + 0.35 * max(max(rc.r, rc.g), rc.b));   // headlights in the puddles: bright, never a white blob
      totalEmissiveRadiance += rc * fres * uRefK * mix(${pave ? '0.14' : '0.3'}, 0.9, pud);`);
  };
  m.customProgramCacheKey = () => 'pg24ground' + (pave ? 1 : 0);
  return m;
}

// ---------- the boulevard beyond the action ----------
// Owner, 29 Oct 2026: « pas de vide au bout de 10 m ». The boulevard runs on both ways to the fog: three more Haussmann blocks
// each way and side (shopfronts drawn cheaply from shared textures), then plain blocks whose fronts are one painted texture
// (stone, French windows, some lit, balconies, the mansard and its dormers, a lit or shuttered shop per bay), lamps the whole way
// (instanced), the plane trees of the terre-plein, cars parked along the kerbs and a few stopped in the traffic with their lights on.
export const EXT = 320;
const _tc = new Map();
const cachedTex = (key, fn) => { if (!_tc.has(key)) _tc.set(key, fn()); return _tc.get(key); };
const LVF = [0, 4.3, 7.7, 11.0, 14.0, 16.9, 19.7], FAR_H = 22.65;
// one far front, four bays wide (a 3.2 m bay = 256 px; 1 m = 79 px up): the albedo and, apart, what glows at night
function farFrontTex(seed, color) {
  const r = rng(seed), W = 1024, H = 1792, px = H / FAR_H, bw = W / 4, cv = canvas(W, H), c = cv.getContext('2d'), em = canvas(W, H), e = em.getContext('2d');
  const Y = (m) => H - m * px;
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const st = new THREE.Color(color), g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#' + st.clone().multiplyScalar(0.92).getHexString()); g.addColorStop(0.8, '#' + st.getHexString()); g.addColorStop(1, '#' + st.clone().multiplyScalar(0.7).getHexString());
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(40,32,24,${0.03 + r() * 0.05})`; c.fillRect(r() * W, r() * H, 2 + r() * 30, 1 + r() * 3); }   // grime
  const wh = [0, 2.55, 2.45, 2.25, 2.15, 2.0];
  for (let b = 0; b < 4; b++) {
    const cx = b * bw + bw / 2;
    // ground floor: a shop (lit, its sign glowing) or an iron shutter
    const shop = r(), sw = 2.3 * px, top = Y(3.3);
    if (shop < 0.55) {
      const hue = [30, 35, 200, 320, 140, 0][Math.floor(r() * 6)], lit = `hsl(${hue}, 70%, ${55 + r() * 15}%)`;
      c.fillStyle = '#2a2018'; c.fillRect(cx - sw / 2, top, sw, Y(0.15) - top);
      e.fillStyle = lit; e.fillRect(cx - sw / 2, top, sw, Y(0.15) - top); e.fillStyle = 'rgba(0,0,0,0.55)'; e.fillRect(cx - sw / 2, Y(1.1), sw, Y(0.15) - Y(1.1));
      const nh = [330, 200, 50, 280, 10, 160][Math.floor(r() * 6)]; e.fillStyle = `hsl(${nh}, 100%, 62%)`; e.fillRect(cx - sw * 0.38, Y(3.85), sw * 0.76, 0.32 * px);
    } else { c.fillStyle = '#4a4c4e'; c.fillRect(cx - sw / 2, top, sw, Y(0) - top); c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = top; y < Y(0); y += 7) c.fillRect(cx - sw / 2, y, sw, 2); }
    c.fillStyle = '#121212'; c.fillRect(cx - sw / 2 - 6, Y(4.0), sw + 12, 0.55 * px);
    // the five floors of French windows
    for (let L = 1; L <= 5; L++) {
      const y0 = LVF[L] + 0.12, h = wh[L], ww = 1.18 * px, lit = r() < 0.32;
      c.fillStyle = '#e4dfd4'; c.fillRect(cx - ww / 2 - 5, Y(y0 + h) - 5, ww + 10, h * px + 10);
      c.fillStyle = lit ? '#3a2a1a' : '#101216'; c.fillRect(cx - ww / 2, Y(y0 + h), ww, h * px);
      if (lit) { const lg = e.createLinearGradient(0, Y(y0 + h), 0, Y(y0)); const warm = r() < 0.85; lg.addColorStop(0, warm ? '#6a4626' : '#2a3a66'); lg.addColorStop(1, warm ? '#ffbf78' : '#8aa6ff'); e.fillStyle = lg; e.fillRect(cx - ww / 2, Y(y0 + h), ww, h * px); }
      c.fillStyle = '#e4dfd4'; c.fillRect(cx - 2, Y(y0 + h), 4, h * px); c.fillRect(cx - ww / 2, Y(y0 + h * 0.72), ww, 3);
      if (lit) { e.fillStyle = '#000'; e.fillRect(cx - 2, Y(y0 + h), 4, h * px); e.fillRect(cx - ww / 2, Y(y0 + h * 0.72), ww, 3); }
    }
    // the dormer in the mansard
    const dl = r() < 0.3, dw = 0.84 * px;
    c.fillStyle = '#d8d0c0'; c.fillRect(cx - dw / 2 - 10, Y(LVF[6] + 0.82 + 1.3) - 10, dw + 20, 1.3 * px + 20);
    c.fillStyle = dl ? '#3a2a1a' : '#101216'; c.fillRect(cx - dw / 2, Y(LVF[6] + 0.82 + 1.3), dw, 1.3 * px);
    if (dl) { e.fillStyle = '#ffb872'; e.fillRect(cx - dw / 2, Y(LVF[6] + 0.82 + 1.3), dw, 1.3 * px); }
  }
  // cornices, the two balconies (rails as dark hatching), the zinc mansard behind its dormers
  c.fillStyle = 'rgba(255,248,235,0.55)'; for (const L of [1, 2, 3, 4, 5]) c.fillRect(0, Y(LVF[L + 1]) - 4, W, L === 5 ? 16 : L === 1 ? 12 : 6);
  for (const L of [2, 5]) { c.fillStyle = 'rgba(20,20,22,0.85)'; for (let x = 0; x < W; x += 9) c.fillRect(x, Y(LVF[L] + 1.0), 2, 1.0 * px); c.fillRect(0, Y(LVF[L] + 1.0), W, 4); c.fillRect(0, Y(LVF[L] + 0.05), W, 6); }
  const mz = c.createLinearGradient(0, Y(FAR_H), 0, Y(LVF[6] + 0.25)); mz.addColorStop(0, '#3c4550'); mz.addColorStop(1, '#5a646e');
  c.fillStyle = mz; for (let b = 0; b < 4; b++) { const cx = b * bw + bw / 2, dw = 0.84 * px + 20; c.fillRect(b * bw, Y(FAR_H), cx - dw / 2 - b * bw, Y(LVF[6] + 0.25) - Y(FAR_H)); c.fillRect(cx + dw / 2, Y(FAR_H), (b + 1) * bw - cx - dw / 2, Y(LVF[6] + 0.25) - Y(FAR_H)); c.fillRect(cx - dw / 2, Y(FAR_H), dw, Y(LVF[6] + 0.82 + 1.3) - Y(FAR_H) - 10); }
  const t = texOf(cv), te = texOf(em); for (const x of [t, te]) { x.wrapS = THREE.RepeatWrapping; x.anisotropy = 8; }
  return { map: t, emissiveMap: te };
}
// a car parked or stopped in the traffic (low-poly: seen from 30 m and more); lights 0 off, 1 on
function makeParkedCar(color, lights = 0) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.5, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glass = new THREE.MeshStandardMaterial({ color: '#07090c', roughness: 0.05, metalness: 0.3 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.85 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.62, 4.45, 3, 0.14), paint); body.position.y = 0.6; g.add(body);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.52, 2.35, 3, 0.18), glass); cab.position.set(0, 1.12, -0.25); g.add(cab);
  const roof = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.08, 1.8, 2, 0.04), paint); roof.position.set(0, 1.38, -0.3); g.add(roof);
  for (const [x, z] of [[-0.8, 1.38], [0.8, 1.38], [-0.8, -1.38], [0.8, -1.38]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16), tyre); w.rotation.z = Math.PI / 2; w.position.set(x, 0.32, z); g.add(w); }
  const head = new THREE.MeshStandardMaterial({ color: '#cfd4da', emissive: '#f4f6ff', emissiveIntensity: 3.2 * lights, roughness: 0.2 });
  const tail = new THREE.MeshStandardMaterial({ color: '#4a0808', emissive: '#ff1a10', emissiveIntensity: 1.8 * lights, roughness: 0.3 });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.04), head); h.position.set(s * 0.6, 0.72, 2.23); g.add(h);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.04), tail); tl.position.set(s * 0.62, 0.78, -2.23); g.add(tl);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// the same low-poly car, instanced along the kerbs (one draw per part; the paint colour per instance)
function parkedFleet(scene, spots, paints, r) {
  const N = spots.length, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = V(1, 1, 1), Y = V(0, 1, 0);
  const parts = [
    [new RoundedBoxGeometry(1.8, 0.62, 4.45, 3, 0.14), new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0.5, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }), [[0, 0.6, 0]], true],
    [new RoundedBoxGeometry(1.5, 0.08, 1.8, 2, 0.04), null, [[0, 1.38, -0.3]], true],
    [new RoundedBoxGeometry(1.6, 0.52, 2.35, 3, 0.18), new THREE.MeshStandardMaterial({ color: '#07090c', roughness: 0.05, metalness: 0.3 }), [[0, 1.12, -0.25]], false],
    [new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.85 }), [[-0.8, 0.32, 1.38], [0.8, 0.32, 1.38], [-0.8, 0.32, -1.38], [0.8, 0.32, -1.38]], false],
    [new THREE.BoxGeometry(0.42, 0.1, 0.04), new THREE.MeshStandardMaterial({ color: '#cfd4da', roughness: 0.2 }), [[-0.6, 0.72, 2.23], [0.6, 0.72, 2.23]], false],
    [new THREE.BoxGeometry(0.4, 0.09, 0.04), new THREE.MeshStandardMaterial({ color: '#4a0808', roughness: 0.3 }), [[-0.62, 0.78, -2.23], [0.62, 0.78, -2.23]], false],
  ];
  parts[1][1] = parts[0][1];
  const col = spots.map(() => new THREE.Color(paints[Math.floor(r() * paints.length)]));
  for (const [geo, mat, offs, painted] of parts) {
    const im = new THREE.InstancedMesh(geo, mat, N * offs.length); let j = 0;
    spots.forEach(([x, z, yaw], i) => { q.setFromAxisAngle(Y, yaw); for (const [ox, oy, oz] of offs) { const p = V(ox, oy, oz).applyQuaternion(q).add(V(x, 0, z)); im.setMatrixAt(j, m4.compose(p, q, one)); if (painted) im.setColorAt(j, col[i]); j++; } });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.frustumCulled = false; scene.add(im);
  }
}
function extendBoulevard(scene, { r, iron, lampGlow, glassM, frameM, shutterM }) {
  const { KERB, ZK, ZR1, ZR2, ZR3, ZF } = PG;
  // mid range: detailed blocks with cheap shopfronts (shared interior and neon textures)
  const SH = [['bar', 'COCKTAILS', '#ff8a3d'], ['kebab', 'KEBAB', '#ffd34d'], ['club', 'CLUB', '#b04dff'], ['bar', 'BAR', '#ff4fa3'], ['hotel', 'HÔTEL ★', '#5aa8ff'], ['tabac', 'TABAC', '#ff3b30'], ['bar', 'LE BALTO', '#4fd8ff']];
  const board = new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.6 });
  const cheapShop = (x, face, z0, i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z0); if (face < 0) g.rotation.y = Math.PI; scene.add(g);
    if (i % 3 === 1) { const s = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.3, 0.06), shutterM); s.position.set(0, 1.65, -0.3); g.add(s); return; }
    const [kind, word, col] = SH[i % SH.length];
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.3), cachedTex('m' + kind, () => new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: interiorTex(kind, 70 + kind.length), emissiveIntensity: 1.2 })));
    back.position.set(0, 1.65, -1.2); g.add(back);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.1), glassM); gl.position.set(0, 1.6, -0.22); gl.renderOrder = 3; g.add(gl);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.08), frameM); fr.position.set(0, 3.22, -0.2); g.add(fr);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), cachedTex('n' + word, () => new THREE.MeshBasicMaterial({ map: neonTex(word, col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
    sg.position.set(0, 3.62, 0.12); g.add(sg);
    const bd = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.62, 0.1), board); bd.position.set(0, 3.62, 0.05); g.add(bd);
  };
  const cols = ['#cbbd9f', '#d1c5ad', '#c5b597', '#d6cbb5', '#d0c3a8', '#c8b99d'];
  let n = 0;
  for (const dir of [1, -1]) for (let k = 0; k < 3; k++) {
    const a = dir > 0 ? 50 + 16 * k : -62 - 16 * k, b = a + 16;
    const bays = []; for (let x = a + 1.9; x < b - 1.0; x += 3.2) bays.push(+x.toFixed(2));
    scene.add(makeHaussmann({ x0: a, x1: b, bays, seed: 80 + n, lit: 0.22 + 0.1 * r(), color: cols[n % 6], shops: false, openGF: true }));
    bays.forEach((x, i) => cheapShop(x, 1, 0, n * 7 + i));
    const fb = bays.map((x) => +(x - 6).toFixed(2));
    scene.add(makeHaussmann({ x0: a - 6, x1: b - 6, bays: fb, z0: ZF, face: -1, seed: 90 + n, lit: 0.28 + 0.1 * r(), color: cols[(n + 3) % 6], shops: false, openGF: true }));
    fb.forEach((x, i) => cheapShop(x, -1, ZF, n * 7 + i + 3));
    n++;
  }
  // far range: painted fronts, a cornice and the roof slope behind
  const fronts = [0, 1, 2, 3].map((v) => farFrontTex(400 + v, cols[v + 1]));
  const corM = new THREE.MeshStandardMaterial({ color: '#cfc4ae', roughness: 0.8 }), zincM = new THREE.MeshStandardMaterial({ color: '#4a535c', roughness: 0.6, metalness: 0.3 });
  const farBlock = (xa, xb, side, v) => {
    const W = xb - xa, bays = Math.max(2, Math.round(W / 3.2)), geo = new THREE.PlaneGeometry(W, FAR_H);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * bays / 4); uv.needsUpdate = true;
    const m = cachedTex('far' + v, () => new THREE.MeshStandardMaterial({ map: fronts[v].map, emissiveMap: fronts[v].emissiveMap, emissive: '#ffffff', emissiveIntensity: 1.25, roughness: 0.85 }));
    const f = new THREE.Mesh(geo, m), z = side > 0 ? 0 : ZF; f.position.set((xa + xb) / 2, FAR_H / 2, z); if (side < 0) f.rotation.y = Math.PI; scene.add(f);
    const c = new THREE.Mesh(new THREE.BoxGeometry(W, 0.45, 0.7), corM); c.position.set((xa + xb) / 2, LVF[6] + 0.1, z + side * 0.3); scene.add(c);
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(W, 6.5), zincM); roof.rotation.x = side > 0 ? -Math.PI / 2 + 0.45 : Math.PI / 2 - 0.45; if (side < 0) roof.rotation.y = Math.PI;
    roof.position.set((xa + xb) / 2, FAR_H + 1.4, z - side * 3.0); scene.add(roof);
  };
  for (const side of [1, -1]) for (const dir of [1, -1]) {
    let x = dir > 0 ? (side > 0 ? 98 : 92) : (side > 0 ? -94 : -100), v = side > 0 ? 0 : 2;
    while (Math.abs(x) < EXT) { const w = 12 + Math.floor(r() * 3) * 3.2; const xa = dir > 0 ? x : x - w, xb = dir > 0 ? x + w : x; farBlock(xa, xb, side, v % 4); v++; x += dir * w; }
  }
  // lamps all the way (instanced): the hero pavement and the far one (single), the terre-plein (double)
  const L1 = [], L2 = [];
  for (let x = -EXT + 10; x < EXT - 10; x += 18) {
    if (Math.abs(x) > 46) L1.push([x, ZK - 0.45, -1]);
    L1.push([x + 9, ZR3 + 0.45, 1]);
  }
  const lampsI = (list, two) => {
    const h = two ? 6.5 : 5.2, N = list.length * (two ? 2 : 1), m4 = new THREE.Matrix4();
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.1, h, 10), iron, list.length);
    const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.8), iron, N), head = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.12, 0.42, 8), lampGlow, N), cap = new THREE.InstancedMesh(new THREE.ConeGeometry(0.26, 0.2, 8), iron, N);
    let j = 0;
    list.forEach(([x, z, s0], i) => {
      pole.setMatrixAt(i, m4.makeTranslation(x, KERB + h / 2, z));
      for (const s of two ? [-1, 1] : [s0 > 0 ? -1 : 1]) {
        arm.setMatrixAt(j, m4.makeTranslation(x, KERB + h - 0.1, z - s * 0.4)); head.setMatrixAt(j, m4.makeTranslation(x, KERB + h - 0.35, z - s * 0.8)); cap.setMatrixAt(j, m4.makeTranslation(x, KERB + h - 0.06, z - s * 0.8)); j++;
      }
    });
    for (const im of [pole, arm, head, cap]) { im.computeBoundingSphere(); im.frustumCulled = false; scene.add(im); }
  };
  for (let x = 9 - 18 * 17; x < EXT - 10; x += 18) if (Math.abs(x) > 30) L2.push([x, (ZR1 + ZR2) / 2]);
  lampsI(L1, false); lampsI(L2, true);
  // the plane trees of the terre-plein, two rows (none in front of the camera on the reservation in s1)
  const trees = [];
  // on the lamps' 18 m grid, halfway between them: a crown (with its leaf cards) ends ~1 m short of the nearest lamp head
  for (const z of [ZR1 + 1.7, ZR2 - 1.7]) for (let x = 13.5 - 9 * 34; x < EXT - 25; x += 9) {
    if (z < 15 && x > -16 && x < 8) continue;
    trees.push({ x: x + (r() - 0.5) * 0.4, z, s: 0.85 + r() * 0.1 });
  }
  const T = makeTrees(trees, { seed: 24 }); T.leafMat.color.set('#c9bf86'); scene.add(T.group);
  // parked cars along the kerbs (away from where the story's cars drive), and a few stopped in the traffic, lights on
  const paints = ['#0d0e10', '#d8d8d4', '#6d7177', '#1d2a44', '#7a1414', '#2b2d30', '#9aa0a6'];
  const spots = [];
  for (let x = -EXT + 12; x < EXT - 12; x += 5.4) {
    if (r() < 0.72) spots.push([x + (r() - 0.5) * 0.8, ZR3 - 1.2, Math.PI / 2]);
    if (Math.abs(x) > 64 && r() < 0.7) spots.push([x + (r() - 0.5) * 0.8, ZK + 1.15, -Math.PI / 2]);
  }
  parkedFleet(scene, spots, paints, r);
  for (const [x, z, yaw] of [[132, 8.6, -Math.PI / 2], [214, 7.4, -Math.PI / 2], [-150, 8.2, -Math.PI / 2], [118, 23.8, Math.PI / 2], [176, 25.0, Math.PI / 2], [-128, 24.4, Math.PI / 2], [-206, 23.6, Math.PI / 2]]) {
    const c = makeParkedCar(paints[Math.floor(r() * paints.length)], 1); c.position.set(x, 0, z); c.rotation.y = yaw; scene.add(c);
  }
}

// ---------- the set ----------
export function buildPigalle(renderer, { ssaa = 2 } = {}) {
  const scene = new THREE.Scene(), r = rng(24);
  // the haze takes the colour of the city's glow on the low clouds (a near-black fog made the end of the boulevard a void)
  scene.fog = new THREE.FogExp2('#221d23', 0.0085);
  const sky = makeNightSky(); scene.add(sky.mesh || sky);
  const { KERB, ZK, ZR1, ZR2, ZR3, ZF, X0, X1 } = PG, L = X1 - X0;
  // reflection
  const refl = new Reflector(new THREE.PlaneGeometry(2 * EXT + 100, 400), { textureWidth: 540 * ssaa, textureHeight: 960 * ssaa, clipBias: 0.003, multisample: 0 });
  refl.rotation.x = -Math.PI / 2; refl.updateMatrixWorld(true); refl.userData.inv = refl.matrixWorld.clone().invert(); refl.userData.k = { value: 1.0 };
  const rt = refl.getRenderTarget(); rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
  refl.material.colorWrite = false; refl.material.depthWrite = false; refl.renderOrder = -1000; scene.add(refl);
  const roadM = groundMat({ refl, pave: false }), paveM = groundMat({ refl, pave: true });
  const ground = new THREE.Group(); scene.add(ground);
  const plane = (w, d, x, y, z, m) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; p.layers.set(1); ground.add(p); return p; };
  const GL = 2 * EXT;   // the ground runs the whole length of the boulevard
  plane(GL + 60, ZR3 - ZK + 1, 0, 0, (ZK + ZR3) / 2, roadM);
  plane(GL, ZK + 0.6, 0, KERB, ZK / 2 - 0.3, paveM);
  plane(GL, ZR2 - ZR1, 0, KERB, (ZR1 + ZR2) / 2, paveM);
  plane(GL, ZF - ZR3 + 0.6, 0, KERB, (ZR3 + ZF) / 2 + 0.3, paveM);
  const kerbM = new THREE.MeshStandardMaterial({ color: '#7d7b76', roughness: 0.5 });
  for (const z of [ZK, ZR1, ZR2, ZR3]) { const k = new THREE.Mesh(new THREE.BoxGeometry(GL, KERB + 0.01, 0.2), kerbM); k.position.set(0, (KERB + 0.01) / 2, z + (z === ZK || z === ZR2 ? -0.1 : 0.1)); k.receiveShadow = true; k.layers.set(1); ground.add(k); }
  // façades: five buildings each side, ground floors opened for the shopfronts
  const B = [], heroBays = [], farBays = [];
  const spans = [[-46, -30], [-30, -14], [-14, 2], [2, 18], [18, 34], [34, 50]];
  spans.forEach(([a, b], i) => { const bays = []; for (let x = a + 1.9; x < b - 1.0; x += 3.2) bays.push(+x.toFixed(2));
    B.push(makeHaussmann({ x0: a, x1: b, bays, seed: 30 + i, lit: 0.22 + 0.08 * r(), color: ['#cbbd9f', '#d1c5ad', '#c5b597', '#d6cbb5'][i % 4], shops: false, openGF: true }));
    const fb = bays.map((x) => +(x - 6).toFixed(2));
    B.push(makeHaussmann({ x0: a - 6, x1: b - 6, bays: fb, z0: ZF, face: -1, seed: 50 + i, lit: 0.3 + 0.1 * r(), color: ['#d0c3a8', '#c8b99d'][i % 2], shops: false, openGF: true }));
    heroBays.push(...bays); farBays.push(...fb);
  });
  for (const b of B) scene.add(b);
  // shopfronts
  const signs = { bar: ['LE CHAT NOIR', '#ff4fa3'], club: ['CLUB', '#b04dff'], hotel: ['HÔTEL ★★', '#5aa8ff'], kebab: ['KEBAB', '#ffd34d'], tabac: ['BAR TABAC', '#ff3b30'], pharma: ['PHARMACIE', '#4dff88'] };
  const shops = [], lights = [];
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#0b0d10', roughness: 0.05, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.35, envMapIntensity: 1.5, depthWrite: false });
  const frameM = new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.5, metalness: 0.4 });
  const shutterM = new THREE.MeshStandardMaterial({ color: '#4a4c4e', roughness: 0.6, metalness: 0.5 });
  const addShop = (bx, kind, face, z0, seed) => {
    const g = new THREE.Group(); g.position.set(bx, 0, z0); if (face < 0) g.rotation.y = Math.PI; scene.add(g);
    if (kind === 'closed') { const s = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.3, 0.06), shutterM); s.position.set(0, 1.65, -0.3); g.add(s); shops.push({ g, kind }); return; }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.3), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: interiorTex(kind, seed), emissiveIntensity: kind === 'bar' || kind === 'club' ? 1.1 : 1.5 }));
    back.position.set(0, 1.65, -2.2); g.add(back);
    for (const sx of [-1.15, 1.15]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.3), new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.9 })); w.position.set(sx, 1.65, -1.2); w.rotation.y = -Math.sign(sx) * Math.PI / 2; g.add(w); }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.0), new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.28, -1.2); g.add(ceil);
    const flo = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.0), new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.7 })); flo.rotation.x = -Math.PI / 2; flo.position.set(0, 0.16, -1.2); g.add(flo);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.1), glassM); gl.position.set(0, 1.6, -0.22); gl.renderOrder = 3; g.add(gl);
    for (const [w, h, x, y] of [[2.3, 0.08, 0, 3.22], [2.3, 0.1, 0, 0.05], [0.06, 3.2, -1.12, 1.6], [0.06, 3.2, 1.12, 1.6], [0.05, 3.1, 0.35, 1.6]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), frameM); f.position.set(x, y, -0.2); g.add(f); }
    let [word, col] = signs[kind];
    if (kind === 'bar') { const names = [['LE CHAT NOIR', '#ff4fa3'], ['COCKTAILS', '#ff8a3d'], ['LE NOCTAMBULE', '#4fd8ff'], ['BAR', '#ff4fa3'], ['LE ROYAL', '#ffd34d']]; [word, col] = bx === 0.7 && face > 0 ? names[0] : names[1 + (seed % 4)]; }
    const nm = new THREE.MeshBasicMaterial({ map: neonTex(word, col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), nm); sg.position.set(0, 3.62, 0.12); g.add(sg);
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.62, 0.1), new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.6 })); board.position.set(0, 3.62, 0.05); g.add(board);
    if (kind === 'tabac') { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.84), new THREE.MeshStandardMaterial({ map: carotteTex(), emissive: '#ffffff', emissiveMap: carotteTex(), emissiveIntensity: 1.4, side: THREE.DoubleSide })); c.position.set(1.0, 4.1, 0.75); c.rotation.y = Math.PI / 2; g.add(c); }
    if (kind === 'pharma') { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: crossTex(), blending: THREE.AdditiveBlending, transparent: true, toneMapped: false, side: THREE.DoubleSide })); c.position.set(1.0, 4.2, 0.8); c.rotation.y = Math.PI / 2; g.add(c); }
    shops.push({ g, kind, sign: sg, col });
    // light spilling onto the pavement (only the shops near the action get a real light)
    const wpos = g.localToWorld(V(0, 2.4, 1.4));
    lights.push({ pos: wpos, col: kind === 'bar' || kind === 'kebab' || kind === 'tabac' ? '#ffb46a' : col, kind });
  };
  // the hero side round the delivery bay (x -3..8): the bar behind her at x 0.7 and 3.9, the tabac, the hotel, the club
  const HERO_KINDS = { '-8.9': 'tabac', '-5.7': 'closed', '-2.5': 'hotel', '0.7': 'bar', '3.9': 'bar', '7.1': 'closed', '10.3': 'club', '13.5': 'kebab', '16.7': 'pharma' };
  const CYCLE = ['bar', 'closed', 'kebab', 'bar', 'closed', 'hotel', 'club', 'closed', 'bar'];
  heroBays.forEach((x, i) => addShop(x, HERO_KINDS[String(x)] || CYCLE[i % CYCLE.length], 1, 0, 100 + i));
  farBays.forEach((x, i) => addShop(x, CYCLE[(i + 3) % CYCLE.length], -1, ZF, 200 + i));
  scene.updateMatrixWorld(true);
  const shopLights = lights.filter((l) => l.pos.x > -18 && l.pos.x < 20 && l.pos.z < 10).map((l) => { const pl = new THREE.PointLight(l.col, l.kind === 'bar' ? 9 : 6, 11, 2); pl.position.copy(l.pos); scene.add(pl); return pl; });
  // street lamps: on the hero pavement by the kerb and pairs on the terre-plein
  const iron = new THREE.MeshStandardMaterial({ color: '#1b231e', roughness: 0.5, metalness: 0.5 });
  const lampGlow = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd39a', emissiveIntensity: 7 });
  const lamps = [];
  const addLamp = (x, z, h = 5.2, two = false) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, h, 10), iron); p.position.set(x, KERB + h / 2, z); p.castShadow = true; scene.add(p);
    for (const s of two ? [-1, 1] : [1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.8), iron); arm.position.set(x, KERB + h - 0.1, z - s * 0.4 * (two ? 1 : 1)); scene.add(arm);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.42, 8), lampGlow); head.position.set(x, KERB + h - 0.35, z - s * 0.8); scene.add(head);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 8), iron); cap.position.set(x, KERB + h - 0.06, z - s * 0.8); scene.add(cap);
      lamps.push(V(x, KERB + h - 0.5, z - s * 0.8));
    }
  };
  for (const x of [-34, -16.5, 7.5, 24, 40]) addLamp(x, ZK - 0.45, 5.2, false);   // (none by the delivery bay: she stands there)
  for (const x of [-27, -9, 9, 27]) addLamp(x, (ZR1 + ZR2) / 2, 6.5, true);   // on the 18 m grid the trees are planted between
  const lampSpots = lamps.filter((p) => Math.abs(p.x) < 22).map((p, i) => { const s = new THREE.SpotLight('#ffcf98', 70, 26, 0.95, 0.65, 2); s.position.copy(p); s.target.position.set(p.x, 0, p.z); if (i === 0 || i === 1) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; } scene.add(s, s.target); return s; });
  extendBoulevard(scene, { r, iron, lampGlow, glassM, frameM, shutterM });
  // bollards along the hero kerb (the Paris « potelets »), a bin, a scooter
  const potM = new THREE.MeshStandardMaterial({ color: '#3a2f27', roughness: 0.55, metalness: 0.3 });
  { const xs = []; for (let x = -EXT + 4; x < EXT - 4; x += 1.6) { if (Math.abs(x - 2) < 4.5 || (Math.abs(x) > 60 && Math.abs(x) % 48 < 12)) continue; xs.push(x); }
    const pb = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.05, 0.95, 10), potM, xs.length), pk = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), potM, xs.length), m4 = new THREE.Matrix4();
    xs.forEach((x, i) => { pb.setMatrixAt(i, m4.makeTranslation(x, KERB + 0.475, ZK - 0.35)); pk.setMatrixAt(i, m4.makeTranslation(x, KERB + 0.96, ZK - 0.35)); });
    for (const im of [pb, pk]) { im.castShadow = true; im.computeBoundingSphere(); im.frustumCulled = false; scene.add(im); } }
  // a delivery bay where the cars stop (yellow dashes), drawn as thin planes on the road
  const yel = new THREE.MeshStandardMaterial({ color: '#c9a21a', roughness: 0.6 });
  for (let x = -3; x < 8; x += 0.9) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.12), yel); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.004, ZK + 2.1); d.layers.set(1); scene.add(d); }
  // lights of the sky and an ambient
  const hemi = new THREE.HemisphereLight('#26324d', '#120e0b', 0.28); scene.add(hemi);
  const moon = new THREE.DirectionalLight('#9fb4e0', 0.25); moon.position.set(-30, 60, 40); scene.add(moon);
  // environment for reflections: night sky + the boulevard's colours
  const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene(); env.add(makeNightSky().mesh || makeNightSky());
  for (const [x, y, z, c, k] of [[-10, 3, -2, '#ff4fa3', 6], [6, 3, -2, '#b04dff', 5], [-4, 3, -2, '#5aa8ff', 5], [0, 6, 4, '#ffcf98', 5], [12, 3, 34, '#ffb46a', 5], [-20, 3, 34, '#ff3b30', 4], [20, 3, -2, '#4dff88', 3]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(x, y, z); env.add(m); }
  scene.environment = pm.fromScene(env, 0.03).texture; scene.environmentIntensity = 0.55;
  return { scene, sky, refl, ground, buildings: B, shops, shopLights, lampSpots, lamps, hemi, moon, heroBays };
}
