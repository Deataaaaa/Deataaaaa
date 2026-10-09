// Post 4: What if light became instant for 5 seconds? (Paris, Champ de Mars; space; Holmdel 1964)
// Story time = video time. One long Paris take (3.6-38 s): calm drone glide down to "you", the flash at T0, then time
// slowed 1,000x while the camera circles the frozen picnic and rises over Paris as the air turns white-hot.
// Space take (38-57.8 s): the whole planet glows, its air blows off; light slows back down, the Sun goes black for
// 8 min 19 s (sped up) and the stars vanish. Reconstruction (57.8-68.9 s): the 1964 hiss in the Holmdel horn antenna.
// The hook (0-3.6 s) flashes forward to the white-hot sky over the tower. Loop end card (68.9-75 s).
import * as THREE from 'three';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeOut, easeIn, W, H } from '../engine/core.js';
import { makeParis, makeGrassField, FX, heatize, makeDaySky, makeTrees } from '../engine/paris.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { sit, stand, rotW } from '../engine/poses.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { Puffs, loadTex, makeStars, softDotTex, canvasTex, smokeTex, flameTex } from '../engine/assets.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const DUR = 75.0;
export const T = { HOOK: 3.6, T0: 10.6, STARS: 17.6, BIG: 21.0, AIR: 24.7, KT: 27.8, MELT: 32.5, SPACE: 38.6, REAL: 41.5, NORMAL: 46.5, DARK: 46.7, SUNBACK: 56.0, REC: 57.0, END: 69.2 };

const CAPTIONS = [
  [3.80, 6.60, 'A sunny afternoon in Paris.'],
  [6.70, 10.40, 'This light left the Sun 8 minutes ago.'],
  [10.80, 14.15, '8 minutes of sunlight hit at once.', { shade: 1 }],
  [14.25, 17.45, 'Enough to set the grass on fire.', { shade: 1 }],
  [17.55, 20.90, 'The light of every star lands too.', { shade: 1 }],
  [21.00, 24.60, 'But the deadliest light is invisible.', { shade: 1 }],
  [24.70, 27.70, 'The afterglow of the Big Bang.', { shade: 1 }],
  [27.80, 31.60, 'A kiloton of TNT on every square metre.', { shade: 1 }],
  [31.70, 35.80, 'The air gets hotter than the Sun’s surface.', { shade: 1 }],
  [38.90, 42.75, 'Enough to boil two thirds of the oceans.', { shade: 1 }],
  [42.85, 46.30, 'And to blow the air off into space.', { shade: 1 }],
  [46.60, 50.35, 'Then the Sun goes black for 8 minutes.', { shade: 1 }],
  [50.45, 53.45, 'All its light already arrived.', { shade: 1 }],
  [53.55, 56.75, 'The stars vanish too. For years.', { shade: 1 }],
  [57.20, 61.50, 'In 1964, two scientists heard a strange hiss.', { shade: 1 }],
  [61.55, 65.00, 'It came from everywhere in the sky.', { shade: 1 }],
  [65.10, 69.05, 'They blamed pigeons. It was the Big Bang.', { shade: 1 }],
];

const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; };

// ---------------------------------------------------------------------------------------------------------------
// props
// ---------------------------------------------------------------------------------------------------------------
function plaidTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f2ece0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(186,32,38,0.78)'; g.fillRect(i * 64, 0, 32, h); g.fillRect(0, i * 64, w, 32); }
    for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(120,14,20,0.35)'; g.fillRect(i * 64 + 12, 0, 8, h); g.fillRect(0, i * 64 + 12, w, 8); }
    const r = rng(4); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1, 2); }
  }, { repeat: true });
}
function makeBlanket(w, d, seed) {
  const g = new THREE.PlaneGeometry(w, d, 40, 30); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, r = rng(seed);
  const bumps = Array.from({ length: 6 }, () => [(r() - 0.5) * w, (r() - 0.5) * d, 0.08 + r() * 0.15, 0.002 + r() * 0.004]);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); let y = 0.012;
    for (const [bx, bz, s, a] of bumps) y += a * Math.exp(-((x - bx) ** 2 + (z - bz) ** 2) / (s * s));
    const e = Math.max(Math.abs(x) / (w / 2), Math.abs(z) / (d / 2)); y -= Math.max(0, e - 0.93) * 0.12;   // edges settle into the grass
    p.setY(i, y);
  }
  g.computeVertexNormals();
  const t = plaidTex(); t.repeat.set(w / 1.1, d / 1.1);
  const m = new THREE.Mesh(g, heatize(new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, side: THREE.DoubleSide }), { organic: 0.8 }));
  m.receiveShadow = true; m.castShadow = true;
  return m;
}
function makePicnic() {
  const grp = new THREE.Group();
  const glass = heatize(new THREE.MeshPhysicalMaterial({ color: '#2f4a2a', roughness: 0.08, metalness: 0, transmission: 0.0, clearcoat: 1 }));
  const bottle = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.037, 0], [0.038, 0.2], [0.03, 0.24], [0.013, 0.27], [0.013, 0.31], [0, 0.31]].map(([x, y]) => new THREE.Vector2(x, y)), 18), glass);
  bottle.position.set(-0.05, 0.012, -0.66); bottle.castShadow = true; grp.add(bottle);
  const cupM = heatize(new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 }), { organic: 0.7 });
  for (const [x, z] of [[0.22, -0.62], [0.55, -0.52]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.026, 0.09, 14, 1, true), cupM); c.position.set(x, 0.058, z); c.castShadow = true; grp.add(c); }
  const bread = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.5, 6, 12), heatize(new THREE.MeshStandardMaterial({ color: '#c58a45', roughness: 0.8 }), { organic: 1 }));
  bread.rotation.set(Math.PI / 2, 0, 1.35); bread.position.set(-0.52, 0.04, -0.64); bread.castShadow = true; grp.add(bread);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.12), heatize(new THREE.MeshStandardMaterial({ color: '#b89b6c', roughness: 0.95 }), { organic: 1 }));
  bag.position.set(0.88, 0.14, -0.08); bag.rotation.y = 0.4; bag.castShadow = true; grp.add(bag);
  return grp;
}

// ---------------------------------------------------------------------------------------------------------------
// space: the planet glowing white-hot, its air leaving; the Moon; the Sun; stars
// ---------------------------------------------------------------------------------------------------------------
function makeSpace(tex) {
  const scene = new THREE.Scene();
  const stars = makeStars(6000, 900, 21); scene.add(stars);
  const sunDir = new THREE.Vector3(0.75, 0.32, -0.58).normalize();
  const U = { tDay: { value: tex.day }, tNight: { value: tex.night }, tC: { value: tex.clouds }, uSun: { value: sunDir }, uSunOn: { value: 1 }, uHeat: { value: 0 }, uTime: { value: 0 } };
  const earthMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform sampler2D tDay, tNight, tC; uniform vec3 uSun; uniform float uSunOn, uHeat, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y), mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
      void main(){
        vec3 n = normalize(vN); float d = dot(n, uSun) * uSunOn;
        vec3 day = texture2D(tDay, vUv).rgb; float cl = texture2D(tC, vUv).r;
        float ocean = smoothstep(0.02, -0.05, day.r + day.g * 0.5 - day.b * 1.2);
        vec3 col = mix(day, vec3(0.95), cl * cl * 0.85) * (0.02 + 1.0 * max(d, 0.0));
        // incandescence: land glows orange, oceans boil into bright steam, all of it flickering with turbulence
        float nz = n3(n * 14.0 + uTime * 0.25) * 0.6 + n3(n * 37.0 - uTime * 0.4) * 0.4;
        vec3 land = mix(vec3(1.0, 0.28, 0.05), vec3(1.0, 0.72, 0.38), nz);
        vec3 steam = mix(vec3(1.0, 0.86, 0.7), vec3(1.0, 0.97, 0.92), nz);
        vec3 hot = mix(land * (0.45 + 0.9 * nz), steam * (0.55 + 0.5 * nz), ocean) * (0.55 + 0.45 * max(d, 0.0));
        col = mix(col, hot, smoothstep(0.0, 1.0, uHeat) * 0.9);
        float rim = pow(1.0 - max(dot(n, vV), 0.0), 2.5);
        col += mix(vec3(0.3, 0.55, 1.0) * (0.15 + 0.85 * smoothstep(-0.3, 0.6, d)), vec3(1.0, 0.62, 0.3) * 1.4, uHeat) * rim;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), earthMat); scene.add(earth);
  // the air leaving: nested glowing shells growing outward with turbulence
  const shellMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uA: { value: 0 }, uTime: U.uTime, uR: { value: 1.05 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vP = position; vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uA, uTime, uR; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y), mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
      void main(){
        float f = 1.0 - abs(dot(normalize(vN), vV));
        float nz = n3(normalize(vP) * 6.0 + uTime * 0.15) * 0.65 + n3(normalize(vP) * 17.0 - uTime * 0.3) * 0.35;
        float a = pow(f, 1.6) * smoothstep(0.98, 0.6, f) * (0.25 + 0.9 * nz * nz) * uA;
        gl_FragColor = vec4(mix(vec3(1.0, 0.42, 0.14), vec3(1.0, 0.8, 0.55), nz) * a, 1.0);
      }`,
  });
  const shells = [0, 1, 2, 3, 4, 5, 6].map((k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), shellMat.clone()); m.material.uniforms.uTime = U.uTime; scene.add(m); return m; });
  // the Moon (cheated closer for the composition), glowing too
  const moonMat = new THREE.ShaderMaterial({
    uniforms: { tM: { value: tex.moon }, uSun: U.uSun, uSunOn: U.uSunOn, uHeat: { value: 0 }, uTime: U.uTime },
    vertexShader: earthMat.vertexShader,
    fragmentShader: `uniform sampler2D tM; uniform vec3 uSun; uniform float uSunOn, uHeat, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 n = normalize(vN); float d = max(dot(n, uSun), 0.0) * uSunOn; vec3 m = texture2D(tM, vUv).rgb;
        vec3 col = m * (0.01 + 1.1 * d); vec3 hot = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.8, 0.5), m.r) * (0.8 + m.r);
        col = mix(col, hot, uHeat * 0.85); gl_FragColor = vec4(col, 1.0); }`,
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.273, 64, 32), moonMat); moon.position.set(-2.6, 2.2, -6.5); scene.add(moon);
  // the Sun: disk + glow sprites
  const sunGrp = new THREE.Group(); scene.add(sunGrp);
  const glowTex = softDotTex();
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(14, 12.5, 10), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.6, 1.2, 0.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sunCore.scale.setScalar(16); sunHalo.scale.setScalar(120); sunGrp.add(sunHalo, sunCore); sunGrp.position.copy(sunDir).multiplyScalar(400);
  return { scene, earth, U, shells, moon, moonMat, sunGrp, sunCore, sunHalo, stars, sunDir };
}

// ---------------------------------------------------------------------------------------------------------------
// Holmdel 1964: the horn antenna on its turntable, a summer field, two engineers, pigeons
// ---------------------------------------------------------------------------------------------------------------
function makeHolmdel(renderer) {
  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(-0.5, 0.62, 0.6).normalize();
  const sky = makeDaySky(sunDir); sky.material.uniforms.uZen.value.set('#4a78bf'); sky.material.uniforms.uHor.value.set('#d9e2e6'); scene.add(sky);
  const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(makeDaySky(sunDir)); scene.environment = pm.fromScene(es, 0, 1, 20000).texture; scene.environmentIntensity = 0.6;
  scene.fog = new THREE.FogExp2('#cfd8dc', 0.0035);
  const sun = new THREE.DirectionalLight('#fff0d8', 3.0); sun.position.copy(sunDir).multiplyScalar(60); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 140 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, new THREE.HemisphereLight('#d6e4f0', '#5c6b3e', 0.6));
  const grassT = canvasTex(256, 256, (g, w, h) => { const r = rng(3); g.fillStyle = '#6d7f3c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${70 + r() * 70},${90 + r() * 60},${30 + r() * 30},0.5)`; g.fillRect(r() * w, r() * h, 1, 3); } }, { repeat: true });
  grassT.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // tree line
  const r = rng(8), tl = [];
  for (let i = 0; i < 90; i++) { const a = -1.6 + i / 90 * 3.2, d = 55 + r() * 40; tl.push({ x: Math.sin(a) * d - 10, z: -Math.cos(a) * d - 5, s: 1.2 + r() * 0.5 }); }
  scene.add(makeTrees(tl, { seed: 17 }).group);
  // the horn-reflector: a long tapered square horn lying on its side, its wide end a box (the reflector) with a square
  // aperture on the side; the receiver cab at the narrow end; all on a steel frame over a circular track
  const panelTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c3c7cb'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(x, 0, 2, h); } for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, y, w, 2); } }, { repeat: true });
  panelTex.repeat.set(3, 3);
  const alu = new THREE.MeshStandardMaterial({ map: panelTex, color: '#ffffff', roughness: 0.45, metalness: 0.7, side: THREE.DoubleSide });
  const steel = new THREE.MeshStandardMaterial({ color: '#6f7274', roughness: 0.6, metalness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.9 });
  const horn = new THREE.Group();
  const frus = new THREE.CylinderGeometry(6.2 / Math.SQRT2, 1.0 / Math.SQRT2, 14, 4, 1, true); frus.rotateY(Math.PI / 4); frus.rotateX(-Math.PI / 2); frus.translate(0, 0, -7);
  const fm = new THREE.Mesh(frus, alu); fm.castShadow = fm.receiveShadow = true; horn.add(fm);
  const box = new THREE.Mesh(new THREE.BoxGeometry(6.6, 6.6, 6.4), alu); box.position.set(0, 0, -17.1); box.castShadow = box.receiveShadow = true; horn.add(box);
  const aper = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), dark); aper.position.set(3.31, 0, -17.1); aper.rotation.y = Math.PI / 2; horn.add(aper);
  for (let k = 0; k <= 7; k++) {   // ribs around the horn
    const z = -k * 2, w = (1.0 + (6.2 - 1.0) * (k / 7)) / 2 + 0.06;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(w * Math.SQRT2, 0.07, 4, 4), steel); rib.rotation.z = Math.PI / 4; rib.position.z = z; rib.castShadow = true; horn.add(rib);
  }
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 3.0), new THREE.MeshStandardMaterial({ color: '#d9d3c5', roughness: 0.85 })); cab.position.set(0, 0, 1.4); cab.castShadow = true; horn.add(cab);
  horn.position.set(0, 5.6, 7);
  const base = new THREE.Group(); base.add(horn);
  const track = new THREE.Mesh(new THREE.TorusGeometry(9, 0.2, 6, 64), steel); track.rotation.x = Math.PI / 2; track.position.set(0, 0.25, -3); base.add(track);
  const beam = (a, b, t = 0.3) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.BoxGeometry(t, d.length(), t), steel); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; base.add(m); };
  const Vb = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const z of [4.5, -3, -10.5]) { const w = z > 0 ? 1.6 : z > -5 ? 3.2 : 4.4; beam(Vb(-w - 2, 0.3, z), Vb(0, 5.6 - w * 0.55, z)); beam(Vb(w + 2, 0.3, z), Vb(0, 5.6 - w * 0.55, z)); beam(Vb(-w - 2, 0.3, z), Vb(w + 2, 0.3, z), 0.25); }
  beam(Vb(0, 0.3, 4.5), Vb(0, 0.3, -10.5), 0.3);
  base.rotation.y = 1.8; scene.add(base);
  // pigeons on the reflector box
  const pig = new THREE.MeshStandardMaterial({ color: '#7d8188', roughness: 0.8 });
  const pigeons = [];
  for (const [z, rot] of [[-15.4, 0.6], [-18.6, -0.9]]) {
    const p = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), pig); body.scale.set(1, 0.85, 1.5); p.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), pig); head.position.set(0, 0.11, 0.15); p.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.18), pig); tail.position.set(0, -0.02, -0.22); tail.rotation.x = 0.3; p.add(tail);
    p.position.set(2.9, 3.42, z); p.rotation.y = rot; horn.add(p); pigeons.push(p);
  }
  return { scene, horn, base, pigeons, sun };
}

// ---------------------------------------------------------------------------------------------------------------
export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const q = new URLSearchParams(location.search);
  const P = makeParis(R.renderer, { sunAz: 205, sunEl: 45 });
  const scene = P.scene;
  const H0 = new THREE.Vector3(-20, 0.075, 58);           // hero blanket (lawn top is at y = 0.08)
  const grass = makeGrassField(H0.x, H0.z, 10, 110000, { exclude: [[H0.x, H0.z, 1.2, 0.9]] }); scene.add(grass.mesh);
  const blanket = makeBlanket(2.3, 1.7, 5); blanket.position.copy(H0); blanket.rotation.y = 0.08; scene.add(blanket);
  const picnic = makePicnic(); picnic.position.copy(H0); picnic.rotation.y = 0.08; scene.add(picnic);

  // ---- people ----
  const env = P.env;
  const you = await loadAvatar('Male_Adult_17', { env });
  const friend = await loadAvatar('Female_Adult_12', { env });
  const crowdNames = ['Female_Adult_01', 'Male_Adult_06', 'Female_Party_02', 'Male_Adult_11', 'Female_Adult_08', 'Male_Adult_08', 'Sports_Male_04', 'Female_Adult_17', 'Male_Adult_01', 'Female_Adult_05', 'Male_Adult_04'];
  const crowd = {};
  for (const n of crowdNames) crowd[n] = await loadAvatar(n, { env, lod: 512 });
  for (const a of [you, friend, ...Object.values(crowd)]) scene.add(a.root);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const LAWN = 0.08, BLANKET = 0.075 + 0.012 + 0.008;   // lawn top; blanket top (base + lift + highest fold)
  // groups on the lawns: [avatar, kind, x, z, yaw, extra]
  const towerTop = V(0, 300, -200);
  const placements = [
    [you, 'sit', H0.x + 0.38, H0.z + 0.22, Math.PI + 0.05, { legs: 'up', arms: 'behind', lean: -0.3, look: towerTop.clone().setY(140) }],
    [friend, 'sit', H0.x - 0.58, H0.z - 0.18, Math.PI - 1.1, { legs: 'cross', arms: 'knees', lean: 0.1, look: V(H0.x + 0.38, 1.0, H0.z + 0.22) }],
    [crowd.Female_Adult_01, 'sit', -33.5, 41.0, Math.PI / 2 + 0.3, { legs: 'cross', arms: 'knees', lean: 0.08, look: V(-31, 0.8, 41) }],
    [crowd.Male_Adult_06, 'sit', -31.2, 41.4, -Math.PI / 2 + 0.2, { legs: 'up', arms: 'behind', lean: -0.25, look: V(-33.5, 0.8, 41) }],
    [crowd.Female_Party_02, 'sit', -9.0, 31.0, Math.PI - 0.4, { legs: 'up', arms: 'knees', lean: 0.1, look: towerTop }],
    [crowd.Male_Adult_11, 'sit', -10.4, 30.4, Math.PI + 0.5, { legs: 'cross', arms: 'lap', lean: 0.15, look: V(-9, 0.8, 31) }],
    [crowd.Female_Adult_08, 'sit', -43.0, 72.0, Math.PI + 0.2, { legs: 'up', arms: 'behind', lean: -0.3, look: towerTop }],
    [crowd.Male_Adult_08, 'sit', -41.6, 71.4, Math.PI - 0.6, { legs: 'cross', arms: 'knees', lean: 0.12, look: V(-43, 0.8, 72) }],
    [crowd.Female_Adult_05, 'sit', 18.0, 52.0, Math.PI + 0.3, { legs: 'up', arms: 'knees', lean: 0.1, look: towerTop }],
    [crowd.Male_Adult_04, 'sit', 19.4, 52.6, Math.PI - 0.5, { legs: 'up', arms: 'behind', lean: -0.25, look: towerTop }],
  ];
  const blankets = [[-32.4, 41.2, 0.3], [-9.7, 30.7, -0.4], [-42.3, 71.7, 0.2], [18.7, 52.3, 0.1]];
  blankets.forEach(([x, z, ry], i) => { const b = makeBlanket(2.0, 1.5, 11 + i); b.position.set(x, 0.075, z); b.rotation.y = ry; b.material = b.material.clone(); b.material.color.setHSL([0.6, 0.33, 0.08, 0.95][i], 0.5, 0.75); scene.add(b); });
  // frisbee: thrower and catcher standing, the disc in flight between them
  const thrower = crowd.Sports_Male_04, catcher = crowd.Female_Adult_17;
  const TH = V(-27, LAWN, 20), CA = V(-37, LAWN, 6);
  const discMat = heatize(new THREE.MeshStandardMaterial({ color: '#f26b1d', roughness: 0.45 }), { organic: 0.5 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.125, 0.025, 24), discMat); disc.castShadow = true; scene.add(disc);
  const discAt = (t) => { const k = ((t % 3.2) / 3.2); return { p: TH.clone().lerp(CA, k).setY(1.25 + Math.sin(k * Math.PI) * 1.1), k }; };
  const facing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const yTC = facing(TH, CA), yCT = facing(CA, TH);
  function poseAll(t) {
    const tp = Math.min(t, T.T0);                       // frozen after the flash
    const br = (k) => (tp * 0.23 + k) % 1;
    placements.forEach(([av, kind, x, z, yaw, o], i) => sit(av, { ...o, pos: V(x, BLANKET, z), yaw, breath: br(i * 0.37), curl: 0.28 }));
    const dk = discAt(tp);
    stand(thrower, { pos: TH, yaw: yTC, look: dk.p, stride: 0.6, twist: -0.25,
      armR: (sh, f, l, u) => ({ hand: sh.clone().addScaledVector(f, 0.55).addScaledVector(l, -0.25).addScaledVector(u, -0.05), pole: sh.clone().addScaledVector(l, -0.6).addScaledVector(u, -0.4), F: f.clone(), N: u.clone().negate() }) });
    stand(catcher, { pos: CA, yaw: yCT, look: dk.p, stride: -0.3,
      armL: (sh, f, l, u) => ({ hand: sh.clone().addScaledVector(f, 0.45).addScaledVector(u, 0.25).addScaledVector(l, 0.15), pole: sh.clone().addScaledVector(l, 0.6).addScaledVector(u, -0.5), F: f.clone().addScaledVector(u, 0.6).normalize(), N: f.clone().negate() }),
      armR: (sh, f, l, u) => ({ hand: sh.clone().addScaledVector(f, 0.4).addScaledVector(u, 0.1).addScaledVector(l, -0.2), pole: sh.clone().addScaledVector(l, -0.6).addScaledVector(u, -0.5), F: f.clone().addScaledVector(u, 0.4).normalize(), N: f.clone().negate() }) });
    disc.position.copy(dk.p); disc.rotation.set(0.12, tp * 9, 0.08);
  }

  // ---- smoke wisps from the scorched lawn near the camera, and haze further away ----
  const NW = 520;
  const smoke = new Puffs(NW, { map: smokeTex(5), fogColor: '#c3d0dc', fogNear: 200, fogFar: 1200 }); scene.add(smoke.mesh);
  const sr = rng(91);
  const wisps = Array.from({ length: NW }, () => { const a = sr() * Math.PI * 2, d = 1.4 + Math.pow(sr(), 0.8) * 26; return { x: H0.x + Math.cos(a) * d, z: H0.z + Math.sin(a) * d, s: 0.25 + sr() * 0.9, ph: sr(), rot: sr() * 6, tall: 0.6 + sr() * 1.6 }; });
  const NF = 220;
  const flames = new Puffs(NF, { map: flameTex(), additive: true, fogColor: '#c3d0dc', fogNear: 200, fogFar: 1200 }); scene.add(flames.mesh);
  const flist = Array.from({ length: NF }, () => { const a = sr() * Math.PI * 2, d = 1.3 + Math.pow(sr(), 0.9) * 14; return { x: H0.x + Math.cos(a) * d, z: H0.z + Math.sin(a) * d, s: 0.08 + sr() * 0.16, ph: sr(), fl: sr() * 30 }; });

  // ---- space + Holmdel ----
  const [day, night, clouds, moonT] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false), loadTex('/engine/tex/moon.jpg')]);
  const SP = makeSpace({ day, night, clouds, moon: moonT });
  const HD = makeHolmdel(R.renderer);
  if (q.get('hdbase')) HD.base.rotation.y = Number(q.get('hdbase'));
  const eng1 = await loadAvatar('Business_Male_02', { env: HD.scene.environment, lod: 512 });
  const eng2 = await loadAvatar('Business_Male_04', { env: HD.scene.environment, lod: 512 });
  HD.scene.add(eng1.root, eng2.root);
  stand(eng1, { pos: V(17.2, 0, 22.4), yaw: -2.5, look: V(-4, 6, -6),
    armR: (sh, f, l, u) => ({ hand: sh.clone().addScaledVector(f, 0.5).addScaledVector(u, 0.32).addScaledVector(l, -0.12), pole: sh.clone().addScaledVector(l, -0.5).addScaledVector(u, -0.6), F: f.clone().addScaledVector(u, 0.5).normalize(), N: l.clone().negate(), curl: 0.55 }) });
  stand(eng2, { pos: V(18.6, 0, 21.5), yaw: -2.25, look: V(17.2, 1.7, 22.4), weight: 0.3,
    armL: (sh, f, l, u) => ({ hand: sh.clone().addScaledVector(u, -0.52).addScaledVector(l, 0.16).addScaledVector(f, 0.08), pole: sh.clone().addScaledVector(l, 0.6).addScaledVector(u, -0.3).addScaledVector(f, -0.3), F: u.clone().negate(), N: l.clone().negate(), curl: 0.6 }) });
  await Promise.all(TEX_PENDING);

  // ---- cameras ----
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 12000);
  // space: a slow orbit; the Sun and the Moon are placed where they read in frame at the start of the take
  function spaceCam(k) {
    const a = 0.35 + k * 0.08, D = 6.9 - k * 0.7;
    cam.position.set(Math.sin(a) * D, 1.4 - k * 0.4, Math.cos(a) * D); cam.fov = 40; cam.updateProjectionMatrix();
    cam.lookAt(0, 1.05, 0); cam.updateMatrixWorld();
  }
  {
    spaceCam(0.5);
    const at = (x, y, d) => new THREE.Vector3(x, y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(d).add(cam.position);
    const sunPos = at(0.38, 0.7, 380); SP.sunGrp.position.copy(sunPos); SP.U.uSun.value.copy(sunPos).normalize();
    SP.moon.position.copy(at(-0.55, 0.42, 9));
  }
  // the Paris take: Catmull-Rom through keyed positions/targets, eased per segment
  const KEYS = [
    [3.6, V(-58, 95, 300), V(-14, 60, -60), 50],
    [7.4, V(-30, 26, 118), V(-18, 4, 30), 48],
    [10.6, V(-20.15, 1.45, 63.6), V(-20.0, 2.6, 46), 44],
    [14.6, V(-23.4, 1.05, 58.4), V(-19.7, 0.75, 57.9), 40],
    [18.6, V(-21.9, 0.92, 56.0), V(-19.9, 0.78, 58.1), 40],
    [21.6, V(-22.6, 2.6, 55.2), V(-16, 18, -100), 46],
    [26.6, V(-27, 22, 62), V(-6, 85, -200), 52],
    [31.6, V(-22, 55, 38), V(0, 110, -200), 54],
    [38.6, V(-12, 92, -24), V(0, 150, -200), 56],
  ];
  const curveP = new THREE.CatmullRomCurve3(KEYS.map((k) => k[1]), false, 'centripetal');
  const curveT = new THREE.CatmullRomCurve3(KEYS.map((k) => k[2]), false, 'centripetal');
  function parisCam(t) {
    let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
    const [t0, , , f0] = KEYS[i], [t1, , , f1] = KEYS[i + 1];
    const k = easeInOut(clamp((t - t0) / (t1 - t0)));
    const u = (i + k) / (KEYS.length - 1);
    cam.position.copy(curveP.getPoint(u)); cam.fov = lerp(f0, f1, k); cam.updateProjectionMatrix(); cam.lookAt(curveT.getPoint(u));
    // a whisper of handheld drift (deterministic)
    cam.rotateZ(Math.sin(t * 0.7) * 0.004); cam.rotateX(Math.sin(t * 0.53 + 1) * 0.003);
    cam.updateMatrixWorld();
  }

  // ---- overlay state ----
  function hudAt(t) {
    if (t < T.T0) return { a: 1, lab: 'Light becomes instant in', val: fmtT(T.T0 - t), sub: 'Sunlight needs 8 min 19 s to get here' };
    const v2 = (tt) => 5 - (Math.min(tt, T.REAL) - T.T0) * 0.001;
    if (t < T.SPACE) {
      const sub2 = t > T.KT ? '≥ 1 kiloton of TNT per m²' : t > T.BIG ? 'Light from 13.8 billion years ago' : '8 min 19 s of sunlight in 1 instant';
      return { a: 1, lab: 'Light back to normal in', val: fmtT(v2(t)), sub: 'Time slowed down 1,000×', sub2 };
    }
    if (t < T.NORMAL) {
      const v = t < T.REAL ? v2(t) : v2(T.REAL) * (1 - (t - T.REAL) / (T.NORMAL - T.REAL));
      return { a: 1, lab: 'Light back to normal in', val: fmtT(v), sub: t < T.REAL ? 'Time slowed down 1,000×' : 'Real time', sub2: 'Air: hotter than the Sun’s surface' };
    }
    if (t < T.DARK) return { a: 1, lab: 'Light', val: 'NORMAL', sub: '299,792 km/s again' };
    if (t < T.SUNBACK) { const v = 499 * (1 - (t - T.DARK) / (T.SUNBACK - T.DARK)); return { a: 1, lab: 'The Sun comes back in', val: fmtT(v), sub: 'Time sped up 54×', sub2: t > 53.55 ? 'Alpha Centauri: back in 4.4 years' : '' }; }
    if (t < T.REC) return { a: 1, lab: 'The Sun', val: 'BACK', sub: 'The stars: not for years' };
    if (t < T.END) return { a: smooth(T.REC, T.REC + 0.4, t) * (1 - smooth(T.END - 0.3, T.END, t)), lab: 'Reconstruction · Holmdel, NJ', val: '1964', sub: 'Bell Labs horn antenna' };
    return null;
  }

  // ---------------------------------------------------------------------------------------------------------------
  function frame(t) {
    const story = t < T.HOOK ? 33.2 + t * 0.55 : t;    // the hook flashes forward to the white-hot sky
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1);
    U.uSat.value = 1.08; U.uContrast.value = 1.07; U.uVignette.value = 0.38; U.uAberr.value = 0.0008; U.uGrain.value = 0.035;
    let rscene = scene;
    FX.uTime.value = story; FX.uWind.value = Math.min(story, T.T0) * 1.0;
    if (story < T.SPACE) {
      // ---------------- PARIS ----------------
      poseAll(story);
      if (t < T.HOOK) {   // low, looking up at the tower through the white-hot air
        const k = t / T.HOOK;
        cam.position.set(-14 + k * 1.5, 1.2 + k * 0.6, 40 - k * 3); cam.fov = 58; cam.updateProjectionMatrix(); cam.lookAt(-4, 95 + k * 10, -200); cam.updateMatrixWorld();
      } else parisCam(story);
      if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 30; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      const after = story - T.T0;
      // the flash: 8 min 19 s of sunlight at once; then sunlit surfaces glow and smoke, everything frozen
      const flash = story < T.T0 ? 0 : Math.exp(-Math.max(0, after - 0.25) * 2.4) * smooth(T.T0, T.T0 + 0.12, story);
      const sunI = 3.2 + flash * 18;
      P.sun.intensity = sunI * (1 - 0.8 * smooth(T.AIR, T.MELT, story)); FX.uSunI.value = Math.max(P.sun.intensity, 0.3);
      FX.uScorch.value = story < T.T0 ? 0 : smooth(T.T0 + 0.15, T.T0 + 3.5, story);
      // stars' pulse and the Big Bang light heating the air
      const starPulse = smooth(T.STARS, T.STARS + 0.25, story) * Math.exp(-Math.max(0, story - T.STARS - 0.25) * 2.6);
      const air = smooth(T.AIR + 0.6, T.MELT + 2.5, story);
      FX.uHeat.value = air * 0.6 + smooth(T.MELT, T.SPACE, story) * 0.32;
      FX.uMelt.value = 0;
      const airMix = smooth(0, 0.7, air) * 0.95;
      P.skyU.uWhite.value = clamp(Math.max(starPulse * 0.6, airMix), 0, 1);
      const sw = starPulse / (starPulse + airMix + 1e-3);
      const ar = [lerp(0.7, 2.3, air), lerp(0.12, 0.95, air), lerp(0.04, 0.3, air)];
      P.skyU.uWhiteCol.value.set(lerp(ar[0], 6.0, sw), lerp(ar[1], 5.7, sw), lerp(ar[2], 5.3, sw));
      P.skyU.uI.value = 1 + flash * 2;
      P.glowMat.opacity = 0;
      P.glowMat.color.setRGB(1.0, 0.72, 0.42);
      scene.fog.color.setRGB(lerp(0.76, 0.75, air), lerp(0.81, 0.36, air), lerp(0.86, 0.14, air));
      scene.fog.density = lerp(0.00042, 0.0005, air);
      P.hemi.intensity = 0.55 + starPulse * 1.5 - air * 0.3;
      P.hemi.color.setRGB(lerp(0.81, 1.0, air), lerp(0.88, 0.7, air), lerp(1.0, 0.45, air));
      R.renderer.toneMappingExposure = 0.5 / (1 + flash * 1.6) / (1 + air * 0.15);
      R.bloom.strength = 0.22 + flash * 0.9 + air * 0.12 + starPulse * 0.4; R.bloom.threshold = lerp(0.9, 0.85, air);
      U.uFadeWhite.value = clamp(flash * 0.9 + starPulse * 0.15 + smooth(T.SPACE - 0.5, T.SPACE, story) * 0.9, 0, 0.95);
      // inferno grade while the air glows: deep orange, more contrast
      U.uTint.value.set(lerp(1, 1.04, air), lerp(1, 0.74, air), lerp(1, 0.5, air)); U.uContrast.value = lerp(1.07, 1.2, air); U.uSat.value = lerp(1.08, 1.28, air);
      // shadow frustum follows the take
      if (story < 9.6) P.setShadow(-14, 0, 40, 160); else if (story < 22.0) P.setShadow(H0.x, 0, H0.z, 24); else P.setShadow(-10, 0, -40, 230);
      // smoke wisps rising from the sunlit grass (slow: time runs 1,000x slower)
      for (let i = 0; i < wisps.length; i++) {
        const w = wisps[i]; const age = story - T.T0 - 0.3 - w.ph * 2.5;
        if (age <= 0 || story > T.SPACE) { smoke.set(i, 0, -50, 0, 0.01, 0); continue; }
        const g = clamp(age / 6, 0, 1);
        const near = Math.hypot(w.x - H0.x, w.z - H0.z) < 3 ? 0.45 : 1;
        const high = 1 - smooth(19.6, 21.0, story);          // only while the camera is down among them
        smoke.set(i, w.x, LAWN + 0.1 + g * w.tall * 0.6, w.z, w.s * (0.4 + g * 1.1) * near, 0.3 * g * high, 0.62, 0.6, 0.58, w.rot * 0.15 + age * 0.01, 0.55 - 0.15 * g);
      }
      smoke.commit();
      for (let i = 0; i < flist.length; i++) {
        const f = flist[i]; const age = story - T.T0 - 0.6 - f.ph * 3.0;
        if (age <= 0 || story > T.SPACE) { flames.set(i, 0, -50, 0, 0.01, 0); continue; }
        const g = clamp(age / 2.5, 0, 1), fl = 0.75 + 0.25 * Math.sin(story * 3.1 + f.fl);
        flames.set(i, f.x, LAWN + f.s * (0.8 + 0.5 * g) * fl * 0.5, f.z, f.s * (0.8 + 0.5 * g) * fl, 0.85 * g * (1 - air * 0.5), 1.0, 0.5, 0.15, Math.sin(story * 2.3 + f.fl) * 0.08, 0.5);
      }
      flames.commit();
    } else if (t < T.REC) {
      // ---------------- SPACE ----------------
      rscene = SP.scene;
      const k = (t - T.SPACE) / (T.REC - T.SPACE);
      SP.U.uTime.value = t;
      SP.U.uHeat.value = 0.75 + 0.25 * smooth(T.SPACE, T.SPACE + 6, t);
      SP.moonMat.uniforms.uHeat.value = 0.6 + 0.3 * smooth(T.SPACE, T.SPACE + 6, t);
      const sunOn = t < T.NORMAL + 0.15 ? 1 : (t > T.SUNBACK ? smooth(T.SUNBACK, T.SUNBACK + 0.35, t) : 0);
      SP.U.uSunOn.value = sunOn; SP.sunGrp.visible = sunOn > 0.001; SP.sunCore.material.opacity = sunOn; SP.sunHalo.material.opacity = sunOn * 0.9;
      SP.stars.material.opacity = t < T.NORMAL + 0.15 ? 1 : 0;
      SP.shells.forEach((s, i) => {
        const g = clamp((t - T.SPACE + i * 1.6) / 20, 0, 1);
        const rr = 1.015 + g * (0.3 + i * 0.07); s.scale.setScalar(rr);
        s.material.uniforms.uA.value = Math.sin(Math.PI * Math.min(1, g * 1.15)) * 0.5;
      });
      spaceCam(k);
      R.renderer.toneMappingExposure = 0.62; R.bloom.strength = 0.5; R.bloom.threshold = 0.82;
      U.uVignette.value = 0.5;
      if (t < T.SPACE + 0.35) U.uFadeWhite.value = 1 - smooth(T.SPACE, T.SPACE + 0.35, t);
    } else if (t < T.END) {
      // ---------------- HOLMDEL 1964 (reconstruction, film look) ----------------
      rscene = HD.scene;
      const k = (t - T.REC) / (T.END - T.REC);
      if (q.get('hdcam')) { const c = q.get('hdcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 46; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      else { cam.position.set(27 - k * 3.0, 6.5 - k * 1.2, 33 - k * 4.0); cam.fov = 48; cam.updateProjectionMatrix(); cam.lookAt(-6 + k * 2, 4.2, -8 + k * 2); cam.updateMatrixWorld(); }
      R.renderer.toneMappingExposure = 0.55; R.bloom.strength = 0.15; R.bloom.threshold = 0.95;
      U.uSat.value = 0.78; U.uContrast.value = 1.12; U.uTint.value.set(1.03, 1.0, 0.93); U.uGrain.value = 0.09; U.uVignette.value = 0.75; U.uAberr.value = 0.003;
      U.uShake.value.set(Math.sin(t * 23.0) * 0.0006, Math.sin(t * 17.0 + 1) * 0.0008);   // gate weave
      HD.pigeons.forEach((p, i) => { p.rotation.y = (i ? -0.6 : 0.4) + Math.sin(t * 1.3 + i) * 0.25; });
    } else {
      rscene = SP.scene;   // behind the end card (black)
      U.uFade.value = 1;
    }
    if (t >= T.END || t < T.REC) U.uShake.value.set(0, 0);
    R.renderPass.scene = rscene; R.renderPass.camera = cam;
    R.composer.render();

    // ---------------- overlay ----------------
    const titleA = t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0;
    const hud = hudAt(t);
    const cap = captionAt(CAPTIONS, t);
    const endA = smooth(T.END, T.END + 0.5, t);
    ov.apply({
      tag: 'WHAT IF &nbsp;·&nbsp; 04', tagA: t < T.END ? 1 : 0,
      title: { html: 'What if light became <span class="k">instant</span> for 5 seconds?', a: titleA, k: 1 },
      hud, caption: cap,
      end: endA > 0 ? { a: endA, title: 'What if light became <span class="k">instant</span> for 5 seconds?', note: '<span class="q">Scarier: the flash, or the black Sun?</span><br><br>Sunlight takes 8 min 19 s to reach you<br>The Big Bang’s glow is all around you, right now' } : null,
    });
  }
  window.EP = { P, cam, you, friend, crowd, SP, HD, THREE, FX, parisCam };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS.map(([a, b, c]) => [a, b, c]) };
}
