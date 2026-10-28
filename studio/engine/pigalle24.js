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
      totalEmissiveRadiance += rc * fres * uRefK * mix(${pave ? '0.14' : '0.3'}, 0.9, pud);`);
  };
  m.customProgramCacheKey = () => 'pg24ground' + (pave ? 1 : 0);
  return m;
}

// ---------- the set ----------
export function buildPigalle(renderer, { ssaa = 2 } = {}) {
  const scene = new THREE.Scene(), r = rng(24);
  scene.fog = new THREE.FogExp2('#0a0b10', 0.014);
  const sky = makeNightSky(); scene.add(sky.mesh || sky);
  const { KERB, ZK, ZR1, ZR2, ZR3, ZF, X0, X1 } = PG, L = X1 - X0;
  // reflection
  const refl = new Reflector(new THREE.PlaneGeometry(400, 400), { textureWidth: 540 * ssaa, textureHeight: 960 * ssaa, clipBias: 0.003, multisample: 0 });
  refl.rotation.x = -Math.PI / 2; refl.updateMatrixWorld(true); refl.userData.inv = refl.matrixWorld.clone().invert(); refl.userData.k = { value: 1.0 };
  const rt = refl.getRenderTarget(); rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
  refl.material.colorWrite = false; refl.material.depthWrite = false; refl.renderOrder = -1000; scene.add(refl);
  const roadM = groundMat({ refl, pave: false }), paveM = groundMat({ refl, pave: true });
  const ground = new THREE.Group(); scene.add(ground);
  const plane = (w, d, x, y, z, m) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; p.layers.set(1); ground.add(p); return p; };
  plane(L + 60, ZR3 - ZK + 1, 0, 0, (ZK + ZR3) / 2, roadM);
  plane(L, ZK + 0.6, 0, KERB, ZK / 2 - 0.3, paveM);
  plane(L, ZR2 - ZR1, 0, KERB, (ZR1 + ZR2) / 2, paveM);
  plane(L, ZF - ZR3 + 0.6, 0, KERB, (ZR3 + ZF) / 2 + 0.3, paveM);
  const kerbM = new THREE.MeshStandardMaterial({ color: '#7d7b76', roughness: 0.5 });
  for (const z of [ZK, ZR1, ZR2, ZR3]) { const k = new THREE.Mesh(new THREE.BoxGeometry(L, KERB + 0.01, 0.2), kerbM); k.position.set(0, (KERB + 0.01) / 2, z + (z === ZK || z === ZR2 ? -0.1 : 0.1)); k.receiveShadow = true; k.layers.set(1); ground.add(k); }
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
  for (const x of [-30, -10, 10, 30]) addLamp(x, (ZR1 + ZR2) / 2, 6.5, true);
  const lampSpots = lamps.filter((p) => Math.abs(p.x) < 22).map((p, i) => { const s = new THREE.SpotLight('#ffcf98', 70, 26, 0.95, 0.65, 2); s.position.copy(p); s.target.position.set(p.x, 0, p.z); if (i === 0 || i === 1) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; } scene.add(s, s.target); return s; });
  // bollards along the hero kerb (the Paris « potelets »), a bin, a scooter
  const potM = new THREE.MeshStandardMaterial({ color: '#3a2f27', roughness: 0.55, metalness: 0.3 });
  for (let x = -40; x < 40; x += 1.6) { if (Math.abs(x - 2) < 4.5) continue; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.95, 10), potM); b.position.set(x, KERB + 0.475, ZK - 0.35); b.castShadow = true; scene.add(b);
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), potM); k.position.set(x, KERB + 0.96, ZK - 0.35); scene.add(k); }
  // a delivery bay where the cars stop (yellow dashes), drawn as thin planes on the road
  const yel = new THREE.MeshStandardMaterial({ color: '#c9a21a', roughness: 0.6 });
  for (let x = -3; x < 8; x += 0.9) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.12), yel); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.004, ZK + 2.1); d.layers.set(1); scene.add(d); }
  // lights of the sky and an ambient
  const hemi = new THREE.HemisphereLight('#26324d', '#120e0b', 0.28); scene.add(hemi);
  const moon = new THREE.DirectionalLight('#9fb4e0', 0.25); moon.position.set(-30, 60, 40); scene.add(moon);
  // environment for reflections: night sky + the boulevard's colours
  const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene(); env.add(makeNightSky().mesh || makeNightSky());
  for (const [x, y, z, c, k] of [[-10, 3, -2, '#ff4fa3', 6], [6, 3, -2, '#b04dff', 5], [-4, 3, -2, '#5aa8ff', 5], [0, 6, 4, '#ffcf98', 8], [12, 3, 34, '#ffb46a', 5], [-20, 3, 34, '#ff3b30', 4], [20, 3, -2, '#4dff88', 3]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(x, y, z); env.add(m); }
  scene.environment = pm.fromScene(env, 0.03).texture; scene.environmentIntensity = 0.55;
  return { scene, sky, refl, ground, buildings: B, shops, shopLights, lampSpots, lamps, hemi, moon, heroBays };
}
