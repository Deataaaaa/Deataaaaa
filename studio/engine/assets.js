// Reusable low-poly asset builders.
import * as THREE from 'three';
import { rng } from './core.js';

// ---------- textures ----------
export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

export function softDotTex() {
  return canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { linear: true });
}

export function loadTex(url, srgb = true) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; res(t);
  }, undefined, rej));
}

// ---------- sky ----------
export function makeSky(o = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uSunDir: { value: (o.sunDir || new THREE.Vector3(-0.8, 0.12, -0.5)).clone().normalize() },
      uZenith: { value: new THREE.Color(o.zenith || '#27467a') },
      uHorizon: { value: new THREE.Color(o.horizon || '#f2b27a') },
      uBelow: { value: new THREE.Color(o.below || '#6d5a4a') },
      uSunCol: { value: new THREE.Color(o.sunCol || '#ffd29a') },
      uSunSize: { value: o.sunSize ?? 0.0012 }, uGlow: { value: o.glow ?? 1.0 },
      uDark: { value: 0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uSunDir,uZenith,uHorizon,uBelow,uSunCol; uniform float uSunSize,uGlow,uDark; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 mid = mix(uHorizon, vec3(0.98,0.86,0.66), 0.55);
        vec3 col = mix(uHorizon, mid, smoothstep(0.0, 0.12, h));
        col = mix(col, uZenith, smoothstep(0.06, 0.7, h));
        col = mix(col, uBelow, smoothstep(0.0, -0.06, h));
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunCol * (pow(s, 6.0)*0.45 + pow(s, 48.0)*0.9) * uGlow;
        col += uSunCol * smoothstep(1.0-uSunSize, 1.0-uSunSize*0.5, s) * 8.0;
        col = mix(col, vec3(0.0), uDark);
        gl_FragColor = vec4(col,1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// ---------- stars (points) ----------
export function makeStars(n = 4000, radius = 900, seed = 7) {
  const r = rng(seed); const pos = new Float32Array(n * 3); const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    pos.set([s * Math.cos(th) * radius, u * radius, s * Math.sin(th) * radius], i * 3);
    const b = Math.pow(r(), 3) * 1.6 + 0.15; const tint = r();
    col.set([b * (0.85 + tint * 0.15), b * 0.92, b * (1.0 - tint * 0.12 + 0.12)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, map: softDotTex(), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}

// soft noisy smoke puff and a teardrop flame (alpha textures)
export function smokeTex(seed = 3) {
  return canvasTex(128, 128, (g, w, h) => {
    const r = rng(seed), img = g.createImageData(w, h);
    const blobs = Array.from({ length: 14 }, () => [32 + r() * 64, 32 + r() * 64, 14 + r() * 26]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let a = 0; for (const [bx, by, br] of blobs) a += Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / (br * br));
      const d = Math.hypot(x - 64, y - 64) / 64; a = Math.min(1, a * 0.45) * Math.max(0, 1 - d * d);
      const k = (y * w + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
  }, { linear: true });
}
export function flameTex() {
  return canvasTex(64, 128, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = 1 - y / (h - 1), u = (x / (w - 1) - 0.5) * 2;              // v: 0 bottom .. 1 top
      const width = Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.15)), 0.8) * (1 - v * 0.7);
      const a = Math.max(0, 1 - Math.abs(u) / Math.max(width, 1e-3)) * Math.min(1, v * 6) * (1 - Math.pow(v, 3));
      const k = (y * w + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = Math.round(Math.pow(a, 0.7) * 255);
    }
    g.putImageData(img, 0, 0);
  }, { linear: true });
}

// ---------- instanced billboard puffs (dust, smoke, sparks) ----------
export class Puffs {
  constructor(n, o = {}) {
    this.n = n;
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.getAttribute('position')); g.setAttribute('uv', base.getAttribute('uv'));
    this.off = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.size = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.col = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
    this.rot = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.stretch = new THREE.InstancedBufferAttribute(new Float32Array(n).fill(1), 1);
    for (const a of [this.off, this.size, this.alpha, this.col, this.rot, this.stretch]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aOff', this.off); g.setAttribute('aSize', this.size); g.setAttribute('aAlpha', this.alpha);
    g.setAttribute('aCol', this.col); g.setAttribute('aRot', this.rot); g.setAttribute('aStretch', this.stretch);
    g.instanceCount = n;
    const map = o.map || softDotTex();
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { map: { value: map }, uFogColor: { value: new THREE.Color(o.fogColor || '#d9b48c') }, uFogNear: { value: o.fogNear ?? 1e6 }, uFogFar: { value: o.fogFar ?? 2e6 } },
      vertexShader: `
        attribute vec3 aOff; attribute float aSize; attribute float aAlpha; attribute vec3 aCol; attribute float aRot; attribute float aStretch;
        varying vec2 vUv; varying float vA; varying vec3 vC; varying float vDepth;
        void main(){
          vUv = uv; vA = aAlpha; vC = aCol;
          vec4 mv = modelViewMatrix * vec4(aOff, 1.0);
          float c = cos(aRot), s = sin(aRot);
          vec2 p = position.xy * vec2(aSize*aStretch, aSize);
          p = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
          mv.xy += p; vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform vec3 uFogColor; uniform float uFogNear, uFogFar;
        varying vec2 vUv; varying float vA; varying vec3 vC; varying float vDepth;
        void main(){
          vec4 t = texture2D(map, vUv);
          float f = smoothstep(uFogNear, uFogFar, vDepth);
          gl_FragColor = vec4(mix(vC, uFogColor, f), t.a * vA);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = o.renderOrder ?? 5;
  }
  set(i, x, y, z, size, alpha, r = 1, g = 1, b = 1, rot = 0, stretch = 1) {
    this.off.array[i * 3] = x; this.off.array[i * 3 + 1] = y; this.off.array[i * 3 + 2] = z;
    this.size.array[i] = size; this.alpha.array[i] = alpha;
    this.col.array[i * 3] = r; this.col.array[i * 3 + 1] = g; this.col.array[i * 3 + 2] = b;
    this.rot.array[i] = rot; this.stretch.array[i] = stretch;
  }
  commit() { for (const a of [this.off, this.size, this.alpha, this.col, this.rot, this.stretch]) a.needsUpdate = true; }
}

// streak texture: soft along both axes, long fade at the ends
export function streakTex() {
  return canvasTex(256, 32, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / (w - 1), v = y / (h - 1);
      const a = Math.pow(Math.sin(Math.PI * u), 1.5) * Math.pow(Math.max(0, 1 - Math.abs(v - 0.5) * 2), 1.6) * (0.4 + 0.6 * u);
      const k = (y * w + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
  }, { linear: true });
}

// ---------- beams (instanced boxes between two points) ----------
export class Beams {
  constructor() { this.list = []; }
  add(a, b, t, tz) { this.list.push([a.clone(), b.clone(), t, tz ?? t]); }
  build(material) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.InstancedMesh(geo, material, Math.max(1, this.list.length));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), mid = new THREE.Vector3(), sc = new THREE.Vector3();
    this.list.forEach(([a, b, t, tz], i) => {
      dir.subVectors(b, a); const len = dir.length(); dir.normalize();
      q.setFromUnitVectors(up, dir); mid.addVectors(a, b).multiplyScalar(0.5); sc.set(t, len + t * 0.5, tz);
      m.compose(mid, q, sc); mesh.setMatrixAt(i, m);
    });
    mesh.count = this.list.length; mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
}

// ---------- Eiffel Tower (procedural, ~1:1 metres) ----------
export function makeEiffel(cutH = 7) {
  const Wf = (h) => 57 * Math.exp(-h / 90) + 5.5;          // outer half-width vs height
  const Lf = (h) => 26 - 5.5 * Math.min(h, 115.7) / 115.7;   // leg width
  const body = new Beams(), stumps = new Beams();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const pick = (a, b) => (Math.max(a.y, b.y) <= cutH + 0.01 ? stumps : body);
  const add = (a, b, t) => {
    if (a.y < cutH && b.y > cutH) { // split at the cut
      const k = (cutH - a.y) / (b.y - a.y); const c = a.clone().lerp(b, k);
      stumps.add(a, c, t); body.add(c, b, t); return;
    }
    if (b.y < cutH && a.y > cutH) return add(b, a, t);
    pick(a, b).add(a, b, t);
  };
  const levels = []; for (let h = 0; h <= 115.7 + 0.01; h += 115.7 / 26) levels.push(h);
  // four legs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const corners = (h) => { const w = Wf(h), l = Lf(h), i = w - l; return [V(sx * w, h, sz * w), V(sx * i, h, sz * w), V(sx * i, h, sz * i), V(sx * w, h, sz * i)]; };
    for (let k = 0; k < levels.length - 1; k++) {
      const A = corners(levels[k]), B = corners(levels[k + 1]);
      for (let c = 0; c < 4; c++) add(A[c], B[c], 1.5);
      for (let c = 0; c < 4; c++) { const n = (c + 1) % 4; add(A[c], B[n], 0.55); add(A[n], B[c], 0.55); }
      if (k % 2 === 0) for (let c = 0; c < 4; c++) add(B[c], B[(c + 1) % 4], 0.7);
    }
  }
  // upper shaft
  const shaft = []; for (let h = 115.7; h <= 276 + 0.01; h += (276 - 115.7) / 30) shaft.push(h);
  const sq = (h, w) => [V(w, h, w), V(-w, h, w), V(-w, h, -w), V(w, h, -w)];
  for (let k = 0; k < shaft.length - 1; k++) {
    const A = sq(shaft[k], Wf(shaft[k])), B = sq(shaft[k + 1], Wf(shaft[k + 1]));
    for (let c = 0; c < 4; c++) add(A[c], B[c], 1.2);
    for (let c = 0; c < 4; c++) { const n = (c + 1) % 4; add(A[c], B[n], 0.45); add(A[n], B[c], 0.45); }
    if (k % 2 === 0) for (let c = 0; c < 4; c++) add(B[c], B[(c + 1) % 4], 0.5);
    // inner columns (makes the shaft read as 4 merged legs)
    const ia = Wf(shaft[k]) * 0.45, ib = Wf(shaft[k + 1]) * 0.45;
    for (const [px, pz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) add(V(px * ia, shaft[k], pz * Wf(shaft[k])), V(px * ib, shaft[k + 1], pz * Wf(shaft[k + 1])), 0.6);
  }
  // decorative arches on each face below the first platform
  for (let f = 0; f < 4; f++) {
    const rotY = f * Math.PI / 2; const pts = [];
    const span = Wf(0) - Lf(0), z = 0;
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * i / 18; const x = -Math.cos(a) * span * 0.98; const hh = 8 + Math.sin(a) * 33;
      const zz = Wf(hh) - 0.5;
      pts.push(V(x, hh, zz).applyAxisAngle(V(0, 1, 0), rotY));
    }
    for (let i = 0; i < pts.length - 1; i++) add(pts[i], pts[i + 1], 1.1);
  }
  // platforms
  const plat = (h, w, th, ring) => {
    const g = new THREE.Group();
    if (ring) {
      const wid = 8;
      for (let f = 0; f < 4; f++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w * 2 + 2, th, wid), towerMat);
        m.position.set(0, h, w - wid / 2 + 1); m.rotation.y = 0; m.castShadow = true;
        const piv = new THREE.Group(); piv.rotation.y = f * Math.PI / 2; piv.add(m); g.add(piv);
      }
    } else {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w * 2 + 2, th, w * 2 + 2), towerMat); m.position.y = h; m.castShadow = true; g.add(m);
    }
    return g;
  };
  const towerMat = new THREE.MeshStandardMaterial({ color: '#94704c', roughness: 0.6, metalness: 0.15, flatShading: true });
  const bodyGroup = new THREE.Group();
  bodyGroup.add(body.build(towerMat));
  bodyGroup.add(plat(57.6, Wf(57.6) + 1.5, 4.5, true));
  bodyGroup.add(plat(115.7, Wf(115.7) + 1, 3.5, false));
  bodyGroup.add(plat(276, Wf(276) + 1.2, 3, false));
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(9, 10, 9), towerMat); cabin.position.y = 283; bodyGroup.add(cabin);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.6, 18, 8), towerMat); top.position.y = 297; bodyGroup.add(top);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 24, 6), towerMat); ant.position.y = 318; bodyGroup.add(ant);
  const stumpMesh = stumps.build(towerMat);
  // concrete foundations
  const footMat = new THREE.MeshStandardMaterial({ color: '#b9ad98', roughness: 0.9, flatShading: true });
  const feet = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(30, 2.2, 30), footMat);
    f.position.set(sx * (Wf(0) - 13), 1.1, sz * (Wf(0) - 13)); f.receiveShadow = true; f.castShadow = true; feet.add(f);
  }
  const root = new THREE.Group();
  const pivot = new THREE.Group(); // pivot at base centre so we can slide + tilt the body
  pivot.add(bodyGroup);
  root.add(pivot, stumpMesh, feet);
  return { root, body: pivot, stumps: stumpMesh, Wf };
}

// ---------- people ----------
const SKIN = ['#f1c7a5', '#e0a982', '#c68a62', '#a76b47', '#7b4a2e', '#5a3622'];
const CLOTH = ['#d9534f', '#f0ad4e', '#5bc0de', '#4a6fa5', '#2f3e46', '#e8e1d0', '#8e6c8a', '#3d7a5c', '#c9a227', '#ececec', '#1f2a36', '#b5651d', '#7d9bb5', '#e07a5f'];
const HAIR = ['#2b1d14', '#4a3322', '#1a1a1a', '#8a6a3c', '#c9a46c', '#6b4b2f'];
const matCache = new Map();
function mat(c) { if (!matCache.has(c)) matCache.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true })); return matCache.get(c); }
const GEO = {
  leg: new THREE.BoxGeometry(0.16, 0.86, 0.19), torso: new THREE.BoxGeometry(0.44, 0.62, 0.25), head: new THREE.IcosahedronGeometry(0.125, 1),
  arm: new THREE.BoxGeometry(0.11, 0.6, 0.12), hair: new THREE.SphereGeometry(0.132, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
};
export function makePerson(r, pose = 'stand', scale = 1) {
  const p = new THREE.Group();
  const skin = mat(SKIN[Math.floor(r() * SKIN.length)]);
  const top = mat(CLOTH[Math.floor(r() * CLOTH.length)]);
  const bottom = mat(CLOTH[Math.floor(r() * CLOTH.length)]);
  const hip = new THREE.Group(); hip.position.y = 0.86; p.add(hip);
  const legs = [];
  for (const s of [-1, 1]) {
    const lp = new THREE.Group(); lp.position.x = s * 0.1; hip.add(lp);
    const l = new THREE.Mesh(GEO.leg, bottom); l.position.y = -0.43; l.castShadow = true; lp.add(l); legs.push(lp);
  }
  const torso = new THREE.Group(); hip.add(torso);
  const tm = new THREE.Mesh(GEO.torso, top); tm.position.y = 0.31; tm.castShadow = true; torso.add(tm);
  const head = new THREE.Mesh(GEO.head, skin); head.position.y = 0.76; head.castShadow = true; torso.add(head);
  if (r() < 0.85) { const h = new THREE.Mesh(GEO.hair, mat(HAIR[Math.floor(r() * HAIR.length)])); h.position.y = 0.78; h.rotation.x = -0.25; torso.add(h); }
  const arms = [];
  for (const s of [-1, 1]) {
    const ap = new THREE.Group(); ap.position.set(s * 0.285, 0.58, 0); torso.add(ap);
    const a = new THREE.Mesh(GEO.arm, top); a.position.y = -0.29; a.castShadow = true; ap.add(a); arms.push(ap);
  }
  if (pose === 'sit') {
    hip.position.y = 0.12; legs.forEach((l, i) => { l.rotation.x = -Math.PI / 2 + 0.15; l.rotation.z = (i ? -1 : 1) * 0.12; });
    arms.forEach((a, i) => { a.rotation.x = -0.5; a.rotation.z = (i ? -1 : 1) * 0.15; });
  } else if (pose === 'walk') {
    legs[0].rotation.x = 0.35; legs[1].rotation.x = -0.35; arms[0].rotation.x = -0.35; arms[1].rotation.x = 0.35;
  } else if (pose === 'lie') {
    hip.position.y = 0.12; hip.rotation.x = -Math.PI / 2;
  }
  p.scale.setScalar(scale);
  p.userData = { hip, legs, arms, torso };
  return p;
}

// ---------- low-poly trees (instanced, with per-tree transforms) ----------
export class Trees {
  constructor(list, seed = 3) { // list of {x,z,h}
    const r = rng(seed);
    this.list = list;
    const trunkG = new THREE.CylinderGeometry(0.22, 0.38, 1, 6); trunkG.translate(0, 0.5, 0);
    const crownG = new THREE.IcosahedronGeometry(1, 1);
    this.trunk = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 1, flatShading: true }), list.length);
    this.stump = new THREE.InstancedMesh(trunkG, this.trunk.material, list.length);
    this.crown = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), list.length);
    const greens = ['#4f7a35', '#5c8a3a', '#3f6b2c', '#6b8f3e', '#577f33'];
    list.forEach((t, i) => {
      t.h = t.h ?? (9 + r() * 4); t.cr = t.cr ?? (2.8 + r() * 1.2); t.seed = r();
      const c = new THREE.Color(greens[Math.floor(r() * greens.length)]).multiplyScalar(0.9 + r() * 0.2);
      this.crown.setColorAt(i, c);
    });
    for (const m of [this.trunk, this.stump, this.crown]) { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
    this.group = new THREE.Group(); this.group.add(this.trunk, this.stump, this.crown);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
    this.update(() => null);
  }
  // fn(tree, i) -> null (static) or {dx, dy, rz, rx} for the ripped upper part
  update(fn) {
    const m = this._m, q = this._q, e = this._e, P = new THREE.Vector3(), S = new THREE.Vector3();
    this.list.forEach((t, i) => {
      const a = fn(t, i); const cut = 1.4;
      // stump
      S.set(1, a ? cut : t.h * 0.55, 1); P.set(t.x, 0, t.z); q.identity(); m.compose(P, q, S); this.stump.setMatrixAt(i, m);
      if (!a) {
        S.set(0.0001, 0.0001, 0.0001); m.compose(P, q, S); this.trunk.setMatrixAt(i, m);
        e.set(0, t.seed * 6, 0); q.setFromEuler(e); P.set(t.x, t.h * 0.62, t.z); S.set(t.cr, t.cr * 1.25, t.cr); m.compose(P, q, S); this.crown.setMatrixAt(i, m);
        return;
      }
      // ripped part pivots around the cut point
      const piv = new THREE.Vector3(t.x + a.dx, cut + a.dy, t.z + (a.dz || 0));
      e.set(a.rx || 0, 0, a.rz || 0); q.setFromEuler(e);
      S.set(1, t.h * 0.55 - cut + 0.3, 1); m.compose(piv, q, S); this.trunk.setMatrixAt(i, m);
      const off = new THREE.Vector3(0, t.h * 0.62 - cut, 0).applyQuaternion(q);
      const q2 = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, t.seed * 6, 0)));
      S.set(t.cr, t.cr * 1.25, t.cr); m.compose(piv.clone().add(off), q2, S); this.crown.setMatrixAt(i, m);
    });
    this.trunk.instanceMatrix.needsUpdate = this.stump.instanceMatrix.needsUpdate = this.crown.instanceMatrix.needsUpdate = true;
    if (this.crown.instanceColor) this.crown.instanceColor.needsUpdate = true;
  }
}

// ---------- Haussmann facade + building ----------
let facadeTex = null;
export function getFacadeTex() {
  if (facadeTex) return facadeTex;
  facadeTex = canvasTex(512, 640, (g, w, h) => {
    // 4 bays x 7 floors module: ground floor shops, 5 floors, attic under roof handled by roof mesh
    g.fillStyle = '#e6d8bd'; g.fillRect(0, 0, w, h);
    const R = rng(11);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${150 + R() * 60},${130 + R() * 50},${100 + R() * 40},${R() * 0.08})`; g.fillRect(R() * w, R() * h, 2 + R() * 6, 1 + R() * 3); }
    const floors = 6, fh = h / floors, bw = w / 4;
    for (let f = 0; f < floors; f++) {
      const y0 = f * fh;
      g.fillStyle = 'rgba(120,100,70,.25)'; g.fillRect(0, y0 + fh - 3, w, 3); // cornice line
      for (let b = 0; b < 4; b++) {
        const x0 = b * bw;
        if (f === floors - 1) { // ground floor shops (bottom of texture)
          g.fillStyle = '#2b2f36'; g.fillRect(x0 + 12, y0 + 18, bw - 24, fh - 18);
          g.fillStyle = 'rgba(255,214,150,.35)'; g.fillRect(x0 + 16, y0 + 24, bw - 32, fh * 0.45);
          continue;
        }
        g.fillStyle = '#39424f'; g.fillRect(x0 + bw * 0.3, y0 + fh * 0.2, bw * 0.4, fh * 0.66);
        g.fillStyle = 'rgba(160,190,220,.35)'; g.fillRect(x0 + bw * 0.3, y0 + fh * 0.2, bw * 0.4, fh * 0.22);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x0 + bw * 0.27, y0 + fh * 0.16, bw * 0.46, 5);
        if (f === 1 || f === 4) { g.fillStyle = '#1d1f22'; g.fillRect(x0, y0 + fh * 0.82, bw, 6); for (let k = 0; k < 10; k++) g.fillRect(x0 + k * bw / 10, y0 + fh * 0.7, 2, fh * 0.13); }
      }
    }
  });
  facadeTex.wrapS = facadeTex.wrapT = THREE.RepeatWrapping;
  return facadeTex;
}

const roofMat = new THREE.MeshStandardMaterial({ color: '#58626e', roughness: 0.6, metalness: 0.3, flatShading: true });
export function makeBuilding(width, depth, height, r) {
  // returns { root, ground, upper } ; ground floor height ~ height/6
  const tex = getFacadeTex().clone(); tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(width / 14)), 1);
  const tint = new THREE.Color('#ffffff').multiplyScalar(0.92 + r() * 0.1);
  const facade = new THREE.MeshStandardMaterial({ map: tex, color: tint, roughness: 0.9 });
  const side = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9cbb0').multiply(tint), roughness: 0.95 });
  const gh = height / 6;
  const mk = (h, v0, v1) => {
    const g = new THREE.BoxGeometry(width, h, depth);
    // remap UV v on side faces so the texture slice matches the floor range
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * (v1 - v0));
    const m = new THREE.Mesh(g, [side, side, side, side, facade, facade]);
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  const ground = mk(gh, 0, 1 / 6); ground.position.y = gh / 2;
  const upperBody = mk(height - gh, 1 / 6, 1); upperBody.position.y = (height - gh) / 2;
  // mansard roof (prism)
  const rs = new THREE.Shape(); const d2 = depth / 2;
  rs.moveTo(-d2, 0); rs.lineTo(d2, 0); rs.lineTo(d2 - 2.6, 5.2); rs.lineTo(-d2 + 2.6, 5.2); rs.closePath();
  const rg = new THREE.ExtrudeGeometry(rs, { depth: width, bevelEnabled: false }); rg.translate(0, 0, -width / 2); rg.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(rg, roofMat); roof.position.y = height - gh; roof.castShadow = true;
  // chimneys
  for (let i = 0; i < Math.max(1, Math.round(width / 10)); i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 3), side); c.position.set(-width / 2 + (i + 0.5) * width / Math.max(1, Math.round(width / 10)), height - gh + 5.6, (r() - 0.5) * 3); c.castShadow = true; roof.parent; upperBody.add(c); c.position.y = (height - gh) / 2 + 5.8;
  }
  const upper = new THREE.Group(); upper.add(upperBody, roof); upper.position.y = gh;
  const root = new THREE.Group(); root.add(ground, upper);
  return { root, ground, upper, gh, width, depth, height };
}

// ---------- airliner ----------
export function makeAirliner() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#f4f5f7', roughness: 0.35, metalness: 0.1, flatShading: true });
  const grey = new THREE.MeshStandardMaterial({ color: '#b8bfc8', roughness: 0.4, metalness: 0.3, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#1b2230', roughness: 0.3, flatShading: true });
  const accent = new THREE.MeshStandardMaterial({ color: '#ffb547', roughness: 0.4, flatShading: true });
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 34, 18), white); fus.rotation.z = Math.PI / 2; g.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.95, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), white); nose.scale.set(1, 2.2, 1); nose.rotation.z = -Math.PI / 2; nose.position.x = 17; g.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.95, 10, 18), white); tail.rotation.z = Math.PI / 2; tail.position.set(-22, 0.6, 0); tail.scale.set(1, 1, 0.8); g.add(tail);
  const win = new THREE.Mesh(new THREE.BoxGeometry(30, 0.32, 3.95), dark); win.position.set(1, 0.55, 0); g.add(win);
  const cock = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.6), dark); cock.position.set(18.2, 0.9, 0); cock.rotation.z = -0.35; g.add(cock);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(30, 0.18, 3.96), accent); stripe.position.set(0, -0.15, 0); g.add(stripe);
  const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.lineTo(-9, 19); wingShape.lineTo(-11.5, 19); wingShape.lineTo(-7, 0); wingShape.closePath();
  for (const s of [-1, 1]) {
    const wg = new THREE.ExtrudeGeometry(wingShape, { depth: 0.5, bevelEnabled: false });
    const w = new THREE.Mesh(wg, white); w.rotation.x = -Math.PI / 2 * s; w.position.set(3, -0.9, 0); w.scale.y = 1; if (s < 0) { w.rotation.x = Math.PI / 2; } g.add(w);
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.85, 4.5, 14), grey); eng.rotation.z = Math.PI / 2; eng.position.set(1.2, -2.0, s * 6.5); g.add(eng);
    const hs = new THREE.ExtrudeGeometry((() => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(-3.5, 6.5); sh.lineTo(-5, 6.5); sh.lineTo(-3.4, 0); sh.closePath(); return sh; })(), { depth: 0.3, bevelEnabled: false });
    const h = new THREE.Mesh(hs, white); h.rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2; h.position.set(-21, 0.6, 0); g.add(h);
  }
  const finS = new THREE.Shape(); finS.moveTo(0, 0); finS.lineTo(-4.5, 7.5); finS.lineTo(-7, 7.5); finS.lineTo(-6, 0); finS.closePath();
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finS, { depth: 0.35, bevelEnabled: false }), white); fin.position.set(-20, 1.2, -0.17); g.add(fin);
  const finA = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 0.4), accent); finA.position.set(-24.5, 6.4, 0); finA.rotation.z = 0.0; g.add(finA);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------- trampoline ----------
export function makeTrampoline() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#9aa3ad', roughness: 0.4, metalness: 0.6, flatShading: true });
  const pad = new THREE.MeshStandardMaterial({ color: '#2f6fb0', roughness: 0.7, flatShading: true });
  const matM = new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.9 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.22, 8, 40), pad); ring.rotation.x = Math.PI / 2; ring.position.y = 0.85; g.add(ring);
  const mt = new THREE.Mesh(new THREE.CircleGeometry(2.05, 40), matM); mt.rotation.x = -Math.PI / 2; mt.position.y = 0.8; g.add(mt);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), metal);
    l.position.set(Math.cos(a) * 2.3, 0.42, Math.sin(a) * 2.3); g.add(l);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------- globe ----------
export function latLon(lat, lon, r = 1) {
  const phi = (lon + 180) / 360 * Math.PI * 2, th = (90 - lat) / 180 * Math.PI;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(phi) * Math.sin(th) * r);
}
export function makeGlobe(tex) {
  const group = new THREE.Group();
  const spin = new THREE.Group(); group.add(spin);
  const earthMat = new THREE.ShaderMaterial({
    uniforms: { tDay: { value: tex.day }, tNight: { value: tex.night }, uSun: { value: new THREE.Vector3(-1, 0.3, 0.6).normalize() }, uRim: { value: 1 }, uSpec: { value: 0.7 },
      uBurnDir: { value: new THREE.Vector3(0, 0, 1) }, uBurn: { value: 0 }, uTime: { value: 0 }, uIce: { value: 0 }, uLights: { value: 1 }, uDayGain: { value: 1 }, uCut: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){ vUv = uv; vN = normalize(mat3(modelMatrix)*normal); vec4 wp = modelMatrix*vec4(position,1.0); vW = wp.xyz; vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform sampler2D tDay,tNight; uniform vec3 uSun, uBurnDir; uniform float uRim, uSpec, uBurn, uTime, uIce, uLights, uDayGain, uCut; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y), mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
      void main(){
        if (uCut > 0.5 && vW.x > 0.0 && vW.z > 0.0) discard;
        vec3 n = normalize(vN); float d = dot(n, uSun);
        vec3 day = texture2D(tDay, vUv).rgb; vec3 night = texture2D(tNight, vUv).rgb;
        float lit = smoothstep(-0.15, 0.2, d);
        float ocean = smoothstep(0.02, -0.05, day.r + day.g*0.5 - day.b*1.2);
        day = mix(day, vec3(0.82,0.88,0.95), ocean*uIce);
        vec3 col = day * (0.03 + 1.05*max(d,0.0)) * uDayGain;
        col = mix(night*night*vec3(1.6,1.25,0.8)*uLights, col, lit);
        vec3 h = normalize(uSun + vV); float sp = pow(max(dot(n,h),0.0), 70.0) * ocean * lit;
        col += vec3(1.0,0.92,0.8) * sp * uSpec;
        if (uBurn > 0.0) {
          float ang = acos(clamp(dot(n, normalize(uBurnDir)), -1.0, 1.0));
          float nz = n3(n*9.0 + uTime*0.3)*0.6 + n3(n*23.0 - uTime*0.5)*0.4;
          float m = smoothstep(uBurn, uBurn - 0.25, ang + (nz-0.5)*0.25);
          vec3 lava = mix(vec3(1.0,0.25,0.03), vec3(1.0,0.78,0.4), nz) * (0.9 + 0.8*smoothstep(uBurn-0.2, uBurn-0.6, ang));
          col = mix(col, lava, m);
        }
        float rim = pow(1.0 - max(dot(n, vV), 0.0), 2.5);
        col += vec3(0.30,0.55,1.0) * rim * (0.15 + 0.85*smoothstep(-0.3,0.6,d)) * uRim;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), earthMat); spin.add(earth);
  const cloudMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { tC: { value: tex.clouds }, uSun: earthMat.uniforms.uSun, uA: { value: 0.6 }, uCut: earthMat.uniforms.uCut },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix)*normal); vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tC; uniform vec3 uSun; uniform float uA, uCut; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){ if (uCut > 0.5 && vW.x > 0.0 && vW.z > 0.0) discard; float c = texture2D(tC, vUv).r; float d = dot(normalize(vN), uSun); float l = smoothstep(-0.15,0.3,d);
        gl_FragColor = vec4(vec3(0.92)*(0.04+0.95*max(d,0.0)), c*c*uA*(0.1+0.9*l)); }`,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.008, 96, 48), cloudMat);
  const cloudSpin = new THREE.Group(); cloudSpin.add(clouds); group.add(cloudSpin);
  const haloMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uSun: earthMat.uniforms.uSun },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 wp = modelMatrix*vec4(position,1.0); vV = normalize(cameraPosition-wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vV;
      void main(){ float k = pow(max(0.0, 1.0 - abs(dot(normalize(vN), vV)) ), 1.0); float f = smoothstep(0.0, 0.55, dot(-normalize(vN), vV)) ;
        float i = pow(f, 4.0) * 1.4; float l = 0.25 + 0.75*smoothstep(-0.4, 0.5, dot(-normalize(vN), uSun));
        gl_FragColor = vec4(vec3(0.35,0.6,1.0)*i*l, 1.0); }`,
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.06, 96, 48), haloMat); group.add(halo);
  return { group, spin, cloudSpin, earth, earthMat, clouds, cloudMat };
}

export function latCircle(lat, r = 1.003, color = '#ffb547', opacity = 1) {
  const pts = []; for (let i = 0; i <= 180; i++) pts.push(latLon(lat, -180 + i * 2, r));
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}
