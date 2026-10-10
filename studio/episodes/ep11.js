// Post 5: What if every radioactive atom decayed at once? (Guarapari, Brazil: Praia da Areia Preta at dusk)
// Hook (0-3.6): a flash-forward to the instant after the decay: Apple the cat on the black sand, the sea glowing electric
// blue behind you. Glide (3.6-10.6): a calm dusk, a drone comes in to you on your towel, a banana in your hand, a hand
// spinner on the towel. T0 = 10.6: every radioactive atom decays. Slow motion (10.6-26.8, time slowed a billion times,
// then a million, then a thousand): the blue Cherenkov flash in the sea and in you; your banana; the black sand burning
// white-hot; the beach erupts. The coast (26.8-38): the granite, the town, the ground itself boil into rock vapour.
// Space (38-50): every continent goes up; Earth melts. Goiania 1987 (50-62): the blue powder. Loop end card (62-68).
// WTF (rule 19): the hand spinner keeps spinning at full speed through every time scale, and later floats in space.
import * as THREE from 'three';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, project, W, H } from '../engine/core.js';
import { makeBeach, BX, groundY, shoreX, makeStreakMask } from '../engine/guarapari.js';
import { FX } from '../engine/paris.js';
import { Sparks, Billboards, flameAtlas, smokeAtlas, fireballAtlas, fireStripAtlas, SkyStars, fadeShadowBorders } from '../engine/fx.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { loadTex } from '../engine/assets.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { sit, stand } from '../engine/poses.js';
import { makeTowel, makeBanana, makeSpinner, makeMound } from '../engine/props5.js';
import { makeCat } from '../engine/cat.js';
import { H0 as H0c, T, DUR, APPLE, hookCam, glide, slowmo, coast } from './ep11cams.js';

const TITLE = 'What if every <span class="k">radioactive</span> atom decayed at once?';
const CAPTIONS = [
  [3.75, 6.85, 'This black sand is radioactive.'],
  [6.95, 10.15, 'People lie in it to feel better.'],
  [10.8, 13.8, 'Every unstable atom goes off.', { shade: 1 }],
  [13.9, 17.25, 'Your body: as much as 7 kg of TNT.', { shade: 1 }],
  [17.35, 20.3, 'Your banana: 20 grams of TNT.', { shade: 1 }],
  [20.4, 23.85, 'Black sand: 4 tonnes of TNT a kilo.', { shade: 1 }],
  [23.9, 26.8, 'Under your towel: a kiloton.', { shade: 1 }],
  [27.0, 30.6, 'Granite: 80 kg of TNT in every kilo.', { shade: 1 }],
  [30.7, 34.1, 'The ground boils into rock vapour.', { shade: 1 }],
  [34.2, 37.7, 'The sea heats up by 36 °C at once.', { shade: 1 }],
  [38.25, 41.8, 'Every continent explodes at once.', { shade: 1 }],
  [41.9, 45.6, 'That’s 1.3 million years of sunlight.', { shade: 1 }],
  [45.7, 49.6, 'Earth doesn’t blow apart. It melts.', { shade: 1 }],
  [50.25, 54.05, 'Brazil, 1987: scrap dealers found this.', { shade: 1 }],
  [54.15, 57.85, 'A powder that glowed blue in the dark.', { shade: 1 }],
  [57.95, 61.85, 'They shared it with family. 4 died.', { shade: 1 }],
];

const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; };
function fmtTau(s) {
  if (s < 1e-3) return s.toFixed(9) + ' s';
  if (s < 1) return s.toFixed(6) + ' s';
  if (s < 60) return s.toFixed(3) + ' s';
  if (s < 3600) { const m = Math.floor(s / 60); return `${m} min ${String(Math.floor(s - m * 60)).padStart(2, '0')} s`; }
  const h = Math.floor(s / 3600); return `${h} h ${String(Math.floor((s - h * 3600) / 60)).padStart(2, '0')} min`;
}
// physical time since the decay: log10 of the time rate (screen second -> real seconds), plateaus joined by smooth ramps
const RATE = [[T.T0, -9], [19.6, -9], [20.4, -6], [24.4, -6], [25.2, -3], [T.SPACE, -3], [39.6, 3], [T.GOI, 3]];
function logRate(t) {
  if (t <= RATE[0][0]) return RATE[0][1];
  for (let i = 0; i < RATE.length - 1; i++) { const [a, ra] = RATE[i], [b, rb] = RATE[i + 1]; if (t <= b) return ra + (rb - ra) * smooth(a, b, t); }
  return RATE[RATE.length - 1][1];
}
const TAU = (() => { const dt = 1 / 600, n = Math.ceil((T.GOI - T.T0) / dt) + 2, tab = new Float64Array(n); let acc = 0; for (let i = 1; i < n; i++) { const t = T.T0 + (i - 0.5) * dt; acc += Math.pow(10, logRate(t)) * dt; tab[i] = acc; } return { dt, tab }; })();
const tauAt = (t) => { if (t <= T.T0) return 0; const x = (Math.min(t, T.GOI) - T.T0) / TAU.dt, i = Math.floor(x), f = x - i; return TAU.tab[Math.min(i, TAU.tab.length - 2)] * (1 - f) + TAU.tab[Math.min(i + 1, TAU.tab.length - 1)] * f; };
const slowLabel = (t) => { const r = logRate(t); return r < -7.5 ? 'Time slowed down 1,000,000,000×' : r < -4.5 ? 'Time slowed down 1,000,000×' : r < -1.5 ? 'Time slowed down 1,000×' : r < 1.5 ? 'Real time' : 'Time sped up 1,000×'; };

const VNOISE = /* glsl */`
  float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
  float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y), mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
  float fbmv(vec3 p){ return n3(p) * 0.5 + n3(p * 2.03 + 7.1) * 0.25 + n3(p * 4.1 - 3.3) * 0.125 + n3(p * 8.3 + 1.1) * 0.0625; }
  vec3 bb(float k){ vec3 c = mix(vec3(0.0), vec3(0.6, 0.04, 0.0), smoothstep(0.0, 0.25, k)); c = mix(c, vec3(1.0, 0.34, 0.05), smoothstep(0.2, 0.5, k));
    c = mix(c, vec3(1.0, 0.76, 0.38), smoothstep(0.45, 0.75, k)); return mix(c, vec3(1.0, 0.97, 0.93), smoothstep(0.7, 1.0, k)); }`;

// ---------------------------------------------------------------------------------------------------------------
// space: Earth from above the South Atlantic at dusk; the continents burst into glowing rock vapour, the seas boil
// ---------------------------------------------------------------------------------------------------------------
function makeSpace(tex) {
  const scene = new THREE.Scene();
  const sr = rng(4242), list = [];
  for (let i = 0; i < 14000; i++) {
    const u = sr() * 2 - 1, th = sr() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
    const m = Math.pow(sr(), 3.0), tp = sr(), I = 0.25 + 2.6 * m * m, c = tp < 0.3 ? [0.72, 0.84, 1] : tp < 0.75 ? [1, 0.97, 0.92] : [1, 0.8, 0.58];
    list.push({ d, px: 1.0 + m * 2.4, r: c[0] * I, g: c[1] * I, b: c[2] * I });
  }
  const stars = new SkyStars(list, { radius: 2800, minPx: 1.6 }); scene.add(stars.points);
  const U = { tDay: { value: tex.day }, tNight: { value: tex.night }, tC: { value: tex.clouds }, uSun: { value: new THREE.Vector3(1, 0, 0) }, uHot: { value: 0 }, uVap: { value: 0 }, uBoil: { value: 0 }, uTime: { value: 0 } };
  const vs = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vUv = uv; vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`;
  const earthMat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: vs,
    fragmentShader: `uniform sampler2D tDay, tNight, tC; uniform vec3 uSun; uniform float uHot, uVap, uBoil, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      ${VNOISE}
      void main(){
        vec3 n = normalize(vN); float d = dot(n, uSun);
        vec3 day = texture2D(tDay, vUv).rgb; vec3 night = texture2D(tNight, vUv).rgb; float cl = texture2D(tC, vUv).r;
        float ocean = smoothstep(0.02, -0.05, day.r + day.g * 0.5 - day.b * 1.2), land = 1.0 - ocean;
        float lit = smoothstep(-0.08, 0.25, d);
        vec3 col = mix(day, vec3(0.95), cl * cl * 0.8) * (0.02 + max(d, 0.0) * 1.1) + night * vec3(1.0, 0.75, 0.45) * 1.4 * (1.0 - lit) * (1.0 - cl);
        // the continents: white-hot rock vapour boiling off, cracks of light, the coasts boiling the sea
        float f1 = fbmv(vP * 9.0 + vec3(0.0, uTime * 0.02, 0.0)), f2 = fbmv(vP * 26.0 - vec3(uTime * 0.03));
        float cr = smoothstep(0.82, 0.97, 1.0 - abs(n3(vP * 30.0 + vec3(f1 * 3.0)) * 2.0 - 1.0));    // bright seams in the burning crust
        float heat = uHot * land * (0.45 + 0.3 * f1 + 0.35 * cr) * (0.85 + 0.3 * f2);
        vec3 hot = bb(clamp(heat * 0.95, 0.0, 1.0)) * (0.35 + 1.25 * heat);
        float coast = ocean * smoothstep(0.0, 1.0, uBoil) * smoothstep(0.55, 0.9, fbmv(vP * 14.0 + 3.0) + uBoil * 0.4);
        vec3 steam = mix(vec3(0.9, 0.42, 0.16), vec3(1.0, 0.82, 0.6), f2) * coast * (0.4 + 0.6 * uHot);
        col = mix(col, hot, clamp(heat * 2.0, 0.0, 1.0)) + steam * 0.7;
        float mu = max(dot(n, normalize(vV)), 0.0), rim = pow(1.0 - mu, 3.0);
        col += mix(vec3(0.25, 0.5, 1.0) * max(d, 0.0), vec3(1.0, 0.45, 0.15) * 1.4, uHot) * rim;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 96), earthMat); scene.add(earth);
  // the rock-vapour veil: a turbulent glowing shell that swells away from the land
  const veil = new THREE.Mesh(new THREE.SphereGeometry(1.0, 160, 80), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tDay: U.tDay, uVap: U.uVap, uTime: U.uTime, uR: { value: 1.0 } },
    vertexShader: `uniform float uR; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vUv = uv; vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position * uR, 1.0); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform sampler2D tDay; uniform float uVap, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${VNOISE}
      void main(){
        vec3 day = texture2D(tDay, vUv).rgb; float land = 1.0 - smoothstep(0.02, -0.05, day.r + day.g * 0.5 - day.b * 1.2);
        float mu = abs(dot(normalize(vN), normalize(vV)));
        float nz = fbmv(vP * 6.0 + vec3(0.0, uTime * 0.05, 0.0)) * 0.6 + fbmv(vP * 18.0 - vec3(uTime * 0.08)) * 0.4;
        float a = (0.2 + 0.8 * land) * (0.25 + 1.0 * nz * nz) * uVap * (0.25 + 0.75 * pow(1.0 - mu, 1.5)) * 0.6;
        gl_FragColor = vec4(mix(vec3(1.0, 0.4, 0.12), vec3(1.0, 0.86, 0.62), nz) * a, 1.0);
      }`,
  }));
  scene.add(veil);
  const sunL = new THREE.DirectionalLight('#fff4e6', 2.4); scene.add(sunL, sunL.target);
  const glowL = new THREE.PointLight('#ff7a30', 0, 0, 0); scene.add(glowL);
  const upL = new THREE.DirectionalLight('#ff8a40', 2.6); scene.add(upL, upL.target);   // the burning planet lights whatever floats above it
  const camL = new THREE.DirectionalLight('#c8d4ff', 0.9); scene.add(camL, camL.target);  // a soft fill from the lens side (starlight) so the spinner reads red
  scene.add(new THREE.AmbientLight('#404a60', 0.25));
  return { scene, earth, veil, U, sunL, glowL, upL, camL };
}

// ---------------------------------------------------------------------------------------------------------------
// Goiania, September 1987 (reconstruction): a scrapyard shed at night, the opened capsule, the powder glowing blue
// ---------------------------------------------------------------------------------------------------------------
function corrugatedTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'), r = rng(31);
  for (let x = 0; x < 256; x++) { const v = 120 + 50 * Math.sin((x / 256) * Math.PI * 2 * 8); g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.92})`; g.fillRect(x, 0, 1, 256); }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${90 + r() * 60},${50 + r() * 30},${20 + r() * 20},${r() * 0.25})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 2 + r() * 14, 1 + r() * 6, r() * 3, 0, 6.3); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function makeShed(env) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#020304');
  scene.environment = env; scene.environmentIntensity = 0.04;
  const wallT = corrugatedTex(); wallT.repeat.set(3, 1.2);
  const wallM = new THREE.MeshStandardMaterial({ map: wallT, roughness: 0.55, metalness: 0.6 });
  const floorM = new THREE.MeshStandardMaterial({ color: '#4a4640', roughness: 0.92 });
  const woodM = new THREE.MeshStandardMaterial({ color: '#5b4330', roughness: 0.8 });
  const steelM = new THREE.MeshStandardMaterial({ color: '#8b8f94', roughness: 0.35, metalness: 0.9 });
  const rustM = new THREE.MeshStandardMaterial({ color: '#6b3d22', roughness: 0.85, metalness: 0.3 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  for (const [x, z, ry] of [[0, -2.2, 0], [-2.6, 0, Math.PI / 2], [2.6, 0, -Math.PI / 2]]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), wallM); w.position.set(x, 1.6, z); w.rotation.y = ry; w.receiveShadow = true; scene.add(w);
  }
  // workbench with the capsule
  const bench = new THREE.Group(); scene.add(bench);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.8), woodM); top.position.set(0, 0.88, -1.2); top.castShadow = top.receiveShadow = true; bench.add(top);
  for (const [x, z] of [[-0.82, -0.85], [0.82, -0.85], [-0.82, -1.55], [0.82, -1.55]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.86, 0.06), woodM); l.position.set(x, 0.43, z); l.castShadow = true; bench.add(l); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 32, 1, true), steelM); cap.position.set(0.05, 0.935, -1.12); cap.castShadow = true; bench.add(cap);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.012, 32), steelM); lid.position.set(0.16, 0.917, -1.06); lid.rotation.set(0.1, 0, 1.45); bench.add(lid);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.32, 24), rustM); head.position.set(-0.55, 1.07, -1.35); head.rotation.z = 0.2; head.castShadow = true; bench.add(head);   // the radiotherapy head
  // the powder: a small heap inside the capsule and a trail on the bench, glowing blue
  const powderM = new THREE.MeshStandardMaterial({ color: '#0a1830', emissive: '#3c8dff', emissiveIntensity: 1.6, roughness: 0.9 });
  const heap = new THREE.Mesh(new THREE.SphereGeometry(0.028, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), powderM); heap.scale.set(1, 0.45, 1); heap.position.set(0.05, 0.93, -1.12); bench.add(heap);
  const r = rng(77);
  for (let i = 0; i < 26; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.004 + r() * 0.006, 8, 6), powderM); d.position.set(0.1 + r() * 0.22, 0.912, -1.1 + (r() - 0.5) * 0.1); d.scale.y = 0.4; bench.add(d); }
  const glow = new THREE.PointLight('#4a9bff', 0.55, 0, 2); glow.position.set(0.08, 1.02, -1.1); glow.castShadow = true; glow.shadow.mapSize.set(1024, 1024); glow.shadow.bias = -0.002; scene.add(glow);
  // scrap: drums, crates, a shelf (Apple sits on it, in the dark)
  for (const [x, z, s] of [[-1.9, -1.6, 1], [-1.4, -1.85, 0.9], [1.9, -1.5, 1.1]]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.29 * s, 0.29 * s, 0.88 * s, 28), rustM); d.position.set(x, 0.44 * s, z); d.castShadow = d.receiveShadow = true; scene.add(d); }
  for (const [x, z, s] of [[1.3, -1.9, 0.5], [1.55, -1.3, 0.4]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), woodM); c.position.set(x, s / 2, z); c.rotation.y = r(); c.castShadow = c.receiveShadow = true; scene.add(c); }
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 1.2), woodM); shelf.position.set(-2.42, 1.5, 1.3); shelf.castShadow = shelf.receiveShadow = true; scene.add(shelf);
  scene.add(new THREE.AmbientLight('#1a2440', 0.12));
  const dust = new Sparks(900, { minPx: 1.6, maxPx: 6, near: 0.3 }), dr = rng(12);
  for (let i = 0; i < 900; i++) dust.set(i, (dr() - 0.5) * 2.4, 0.4 + dr() * 1.8, -1.9 + dr() * 2.2, (dr() - 0.5) * 0.02, (dr() - 0.5) * 0.01, (dr() - 0.5) * 0.02, 0.25, 0.42, 0.75, 0.0012 + dr() * 0.0015, 40 + dr() * 2, 60, dr());
  dust.commit(); dust.u.uTurb.value = 0.05; dust.u.uTurbF.value = 0.4; scene.add(dust.points);
  return { scene, glow, powderM, dust, shelfTop: new THREE.Vector3(-2.42, 1.522, 1.25), bench: new THREE.Vector3(0.05, 0.93, -1.12) };
}

// ---------------------------------------------------------------------------------------------------------------
export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);
  fadeShadowBorders(0.2);
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const B = makeBeach(R.renderer);
  const scene = B.scene;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.12, 12000);
  B.setShadow(shoreX(0) - 15, 0, 0, 30);

  // ---- you: on a towel on the black sand, 14 m from the water, facing the sea, a banana in your hand ----
  const env = B.env;
  const H0 = V(shoreX(0) - 14, 0, 0); H0.y = groundY(H0.x, H0.z);
  if (H0.distanceTo(H0c) > 0.02) console.error('ep11cams H0 out of date', H0.toArray());
  BX.uHero.value.set(H0.x + 0.6, H0.z - 0.4, 5.5, 1);
  const mask = makeStreakMask(H0.x + 0.4, H0.z, 26, 1300);               // the streaks round you, known to JS (2 cm texels)
  BX.uHeroMap.value = mask.tex; BX.uHeroRect.value.copy(mask.rect);
  const streakPts = (n, rMax, thr, seed) => { const r = rng(seed), out = []; let guard = 0;
    while (out.length < n && guard++ < n * 400) { const a = r() * Math.PI * 2, rr = 0.55 + Math.sqrt(r()) * rMax, x = H0.x + 0.2 + Math.cos(a) * rr, z = H0.z + Math.sin(a) * rr;
      if (Math.abs(x - (H0.x + 0.2)) < 0.5 && Math.abs(z - H0.z) < 1.0) continue;   // not under the towel
      if (mask.at(x, z) > thr) out.push([x, z, r()]); }
    return out; };
  const towel = makeTowel(H0.x + 0.2, H0.z, Math.PI / 2, { seed: 5 }); scene.add(towel);
  const topAt = towel.userData.topAt;
  const you = await loadAvatar('Male_Adult_10', { env });
  scene.add(you.root);
  const banana = makeBanana(); scene.add(banana);
  const spin = makeSpinner(); scene.add(spin.root);
  const SP = V(H0.x - 0.05, 0, H0.z + 0.33); SP.y = topAt(SP.x, SP.z) + 0.001;   // on the towel by your right hip
  // a woman buried up to the neck in the black sand (the old healing tradition), 6 m to your right
  const buried = await loadAvatar('Female_Adult_01', { env }); scene.add(buried.root);
  const hideBody = new THREE.MeshBasicMaterial({ visible: false });   // under the sand: only the head and hair are drawn
  for (const m of buried.meshes) m.material = (Array.isArray(m.material) ? m.material : [m.material]).map((mt) => (mt.name === 'body' ? hideBody : mt));
  const BU = V(H0.x - 0.6, 0, H0.z + 6.2); BU.y = groundY(BU.x, BU.z);
  const mound = makeMound(BU.x + 0.13, BU.z, { x: 1, z: 0 }, B.sand, { L: 1.85, Wd: 0.9, Hh: 0.22, seed: 9 }); scene.add(mound);
  // beachgoers further along the shore
  const crowdN = ['Female_Adult_08', 'Male_Adult_08', 'Female_Adult_04', 'Male_Adult_06'];
  const crowd = {}; for (const n of crowdN) { crowd[n] = await loadAvatar(n, { env, lod: 512 }); scene.add(crowd[n].root); }
  const gp = (x, z) => V(x, groundY(x, z), z);
  const walkers = [
    [crowd.Female_Adult_08, gp(shoreX(26) - 2.0, 26), -2.6, 0.35], [crowd.Male_Adult_08, gp(shoreX(26.6) - 2.6, 26.6), -2.6, -0.3],
    [crowd.Male_Adult_06, gp(shoreX(-34) - 5, -34), 1.9, 0.1],
  ];
  const sitter = [crowd.Female_Adult_04, gp(shoreX(-15) - 12, -15), Math.PI / 2 + 0.25];
  const qLie = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, Math.PI / 2, 0, 'YXZ'));
  // skin glows blue in the Cherenkov flash (the potassium in your cells): the head materials get an emissive copy of their map
  const skins = [];
  for (const av of [you, buried, ...Object.values(crowd)]) for (const m of av.meshes) for (const mt of (Array.isArray(m.material) ? m.material : [m.material])) if (mt.name === 'head') { mt.emissive = new THREE.Color(0.25, 0.55, 1.0); mt.emissiveMap = mt.map; mt.emissiveIntensity = 0; skins.push(mt); }
  banana.material.emissive = new THREE.Color(0.1, 0.42, 1.0); banana.material.emissiveIntensity = 0;

  function poseAll(t) {
    const tp = Math.min(t, T.T0);                       // frozen from the decay on (only the spinner keeps going)
    const br = (k) => (tp * 0.24 + k) % 1;
    sit(you, { pos: V(H0.x - 0.12, topAt(H0.x - 0.12, H0.z), H0.z), groundAt: topAt, yaw: Math.PI / 2, legs: 'up', arms: 'knees', lean: 0.05, breath: br(0),
      handR: (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.36).addScaledVector(up, 0.36).addScaledVector(left, -0.13),
        pole: P.clone().addScaledVector(left, -0.55).addScaledVector(up, 0.05).addScaledVector(fwd, 0.1),
        F: fwd.clone().addScaledVector(up, 0.25).addScaledVector(left, 0.35).normalize(), N: left.clone().addScaledVector(fwd, -0.2).normalize() }),
      curl: 0.62, look: V(H0.x + 60, 1.5 + 0.6 * Math.sin(tp * 0.3), H0.z - 6 + 3 * Math.sin(tp * 0.21)) });
    // the banana in the fist: across the palm, through the curled fingers
    const b = you.bones, w = (n) => b[n].getWorldPosition(new THREE.Vector3());
    const hp = w('RightHand'), fd = w('RightHandMiddle1').sub(hp).normalize(), lat = w('RightHandIndex1').sub(w('RightHandPinky1')).normalize();
    const pn = lat.clone().cross(fd).normalize(), ax = fd.clone().cross(pn).normalize();
    const bX = ax.clone().negate(), bY = pn.clone(), bZ = bX.clone().cross(bY).normalize();      // stalk up (index side), concave side out of the palm
    banana.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(bX, bY, bZ));
    banana.position.copy(hp).addScaledVector(fd, 0.072).addScaledVector(pn, 0.028).addScaledVector(bY, 0.03).addScaledVector(bX, -0.02);
    banana.updateMatrixWorld();
    // the spinner keeps spinning at 2.2 turns a second, whatever the time scale (rule 19's WTF)
    spin.root.position.copy(SP); spin.root.rotation.set(0, 0, 0); spin.rotor.rotation.y = -t * 2.2 * Math.PI * 2;
    // buried: lying on her back, head toward the promenade, face up, only the head above the sand
    stand(buried, { pos: V(0, 0, 0), yaw: 0, breath: br(0.5), armL: (sh, f, l, u) => ({ hand: sh.clone().addScaledVector(u, -0.58).addScaledVector(l, 0.05), pole: sh.clone().addScaledVector(f, -0.4).addScaledVector(u, -0.3), F: u.clone().negate(), N: l.clone().negate() }),
      armR: (sh, f, l, u) => ({ hand: sh.clone().addScaledVector(u, -0.58).addScaledVector(l, -0.05), pole: sh.clone().addScaledVector(f, -0.4).addScaledVector(u, -0.3), F: u.clone().negate(), N: l.clone() }), look: V(0, 1.6, 5) });
    buried.root.quaternion.copy(qLie); buried.root.position.set(0, 0, 0); buried.root.updateMatrixWorld(true);
    const hd = buried.bones.Head.getWorldPosition(new THREE.Vector3());
    buried.root.position.set(BU.x - hd.x, BU.y - hd.y - 0.02, BU.z - hd.z); buried.root.updateMatrixWorld(true);
    walkers.forEach(([av, p, yaw, ph], i) => stand(av, { pos: p, groundAt: groundY, yaw, breath: br(ph + i * 0.3), stride: 0.25 * Math.sin(ph * 6), look: V(p.x + 40, 1.6, p.z + 3) }));
    sit(sitter[0], { pos: sitter[1], groundAt: groundY, yaw: sitter[2], legs: 'out', arms: 'behind', lean: -0.25, breath: br(0.8), look: V(80, 4, -20) });
  }

  // ---- Apple: sitting on the black sand by you, side-on to the shore ----
  const apple = makeCat();
  apple.root.position.copy(APPLE.pos); apple.root.position.y = groundY(APPLE.pos.x, APPLE.pos.z) + 0.006; apple.root.rotation.y = APPLE.yaw;
  scene.add(apple.root);

  // ---- the eruption (milliseconds): jets of white-hot sand and plasma from the black streaks round your towel ----
  const smokeT = smokeAtlas(4), flameT = flameAtlas(3);
  const er = rng(91), GN = 7000, grains = new Sparks(GN, { minPx: 1.6, maxPx: 12, near: 0.8 });
  streakPts(GN, 8.5, 0.62, 5).forEach(([x, z, sd], i) => {
    const y = groundY(x, z) + 0.01, up = 3.0 + er() * 11.0, c = 0.9 + er() * 0.4;
    grains.set(i, x, y, z, (er() - 0.5) * 1.2, up, (er() - 0.5) * 1.2, c, c * 0.8, c * 0.55, 0.003 + er() * 0.006, 24.6 + er() * 1.8, 3.0, er());
  });
  grains.commit(); grains.u.uDrag.value = 0.3; scene.add(grains.points);
  // plasma curtains: the black streaks boil up in thin sheets of light (micro-seconds), then shoot up (milliseconds)
  const JN = 520, jets = new Billboards(JN, { map: flameT, tiles: [2, 2], additive: true, upright: true, anchor: 1, nearK: 1, near: 0.5 });
  const jetP = streakPts(JN, 8.5, 0.72, 6).map(([x, z, sd]) => [x, z, sd, 0.1 + er() * 0.22]);
  scene.add(jets.mesh);
  const WN = 90, wall = new Billboards(WN, { map: fireballAtlas(6), tiles: [2, 2], additive: true, nearK: 1, near: 0.5 });
  const wallP = streakPts(WN, 7, 0.75, 8).map(([x, z, sd]) => [x, z, sd, 25.2 + er() * 0.9]);
  scene.add(wall.mesh);
  // the coast going up: the land lifts off in a curtain of incandescent rock vapour (milliseconds), black smoke above it
  const CN = 1300, cols = new Billboards(CN, { map: flameT, tiles: [2, 2], additive: true, upright: true, anchor: 1, nearK: 1, near: 5 });
  const colP = [];
  for (let i = 0; i < CN; i++) {
    const z = -300 + er() * 700, beach = er() < 0.3, x = beach ? shoreX(z) - 3 - er() * 22 : shoreX(z) - 26 - Math.pow(er(), 0.7) * 280, y = groundY(x, z);
    colP.push([x, y, z, beach ? 5 + er() * 9 : 14 + er() * 24, er(), 26.85 + er() * 0.9]);
  }
  scene.add(cols.mesh);
  const FN = 700, fog2 = new Billboards(FN, { map: smokeT, tiles: [2, 2], additive: true, nearK: 1, near: 5 });   // the glowing vapour body
  const fogP = [];
  for (let i = 0; i < FN; i++) { const z = -300 + er() * 700, x = shoreX(z) - 5 - Math.pow(er(), 0.7) * 300; fogP.push([x, groundY(x, z), z, 30 + er() * 50, er(), 27.0 + er() * 1.5]); }
  scene.add(fog2.mesh);
  const KN = 520, smoke = new Billboards(KN, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 3 });
  const smokeP = [];
  for (let i = 0; i < KN; i++) { const z = -280 + er() * 760, x = shoreX(z) - 10 - Math.pow(er(), 0.85) * 260; smokeP.push([x, groundY(x, z), z, 30 + er() * 45, er(), 28.4 + er() * 3.5]); }
  scene.add(smoke.mesh);
  const SN = 260, steam = new Billboards(SN, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 2 });
  const steamP = [];
  for (let i = 0; i < SN; i++) { const z = -260 + er() * 640, x = shoreX(z) + 2 + Math.pow(er(), 1.4) * 70; steamP.push([x, z, 10 + er() * 22, er(), 33.0 + er() * 3]); }
  scene.add(steam.mesh);
  const seaLight = new THREE.DirectionalLight('#3a8cff', 0); seaLight.position.set(H0.x + 40, H0.y + 34, H0.z); seaLight.target.position.copy(H0); scene.add(seaLight, seaLight.target);   // high enough that its glint on the wet sand never faces the lens
  const groundGlow = new THREE.HemisphereLight('#ff9a50', '#ffb070', 0); scene.add(groundGlow);

  // ---- space and the 1987 shed ----
  const [day, night, clouds] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false)]);
  const SPc = makeSpace({ day, night, clouds });
  const spin2 = makeSpinner(); SPc.scene.add(spin2.root);
  const shed = makeShed(env);
  const man = await loadAvatar('Male_Adult_04', { env }); shed.scene.add(man.root);
  const apple2 = makeCat({ seed: 2 }); apple2.root.position.copy(shed.shelfTop); apple2.root.rotation.y = 2.6; shed.scene.add(apple2.root);
  await Promise.all(TEX_PENDING);

  // ---- overlay ----
  function hudAt(t) {
    if (t < T.T0) return { a: 1, lab: 'Every radioactive atom decays in', val: fmtT(T.T0 - t), sub: 'Guarapari, Brazil · black sand', sub2: 'Up to 100× normal radiation' };
    if (t < T.GOI) {
      const sub2 = t < 14.0 ? '' : t < T.BANANA ? 'Your dose: 400,000 Gy · 5 Gy kills' : t < T.SAND ? 'A banana holds 0.42 g of potassium' : t < T.ERUPT ? 'Black sand: ~0.1% thorium'
        : t < T.SPACE ? 'Crust: 8× the energy to boil it' : 'Released: 7 × 10³⁰ joules';
      return { a: 1, lab: 'Time since the decay', val: fmtTau(tauAt(t)), sub: slowLabel(t), sub2 };
    }
    if (t < T.END) return { a: smooth(T.GOI, T.GOI + 0.4, t) * (1 - smooth(T.END - 0.3, T.END, t)), lab: 'Reconstruction · Goiânia, Brazil', val: '1987', sub: '93 g of caesium-137', sub2: t > 57.9 ? '249 people contaminated' : '' };
    return null;
  }
  function appleLabel(t) {
    // the hook only: an arrow from his name to his head
    const a = (t < T.HOOK ? smooth(0.0, 0.25, t) : 0) * (1 - smooth(T.HOOK - 0.25, T.HOOK, t));
    if (a <= 0) return null;
    const hp = project(apple.head.getWorldPosition(new THREE.Vector3()).add(V(0, 0.05, 0)), cam);
    if (hp.behind) return null;
    const lx = clamp(hp.x + 210, 300, 900), ly = clamp(hp.y - 250, 1000, 1500), tx = hp.x + 28, ty = hp.y - 46;
    const mx = (lx + tx) / 2 + 70, my = (ly + ty) / 2 - 20, ang = Math.atan2(ty - my, tx - mx), ah = 22;
    const p1 = [tx - ah * Math.cos(ang - 0.45), ty - ah * Math.sin(ang - 0.45)], p2 = [tx - ah * Math.cos(ang + 0.45), ty - ah * Math.sin(ang + 0.45)];
    const svg = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><g fill="none" stroke="#f6f2ea" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 1px 6px rgba(0,0,0,.7))">
      <path d="M ${(lx - 10).toFixed(1)} ${(ly + 34).toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}"/><path d="M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${tx.toFixed(1)} ${ty.toFixed(1)} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}"/></g>
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="#ff2e2e" style="font: italic 400 78px 'Instrument Serif', serif; filter: drop-shadow(0 2px 14px rgba(0,0,0,.65))">Apple</text></svg>`;
    return { x: 0, y: 0, a, html: svg, cls: 'lbl-full' };
  }

  // ---------------------------------------------------------------------------------------------------------------
  const _v = new THREE.Vector3();
  function frame(t) {
    const story = t < T.HOOK ? T.T0 + 0.02 + t * 0.002 : t;         // the hook flashes forward to the decay instant
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.05; U.uContrast.value = 1.05; U.uVignette.value = 0.34; U.uAberr.value = 0.0006; U.uGrain.value = 0;
    let rscene = scene;
    const tFrozen = Math.min(story, T.T0);
    BX.uTime.value = tFrozen; FX.uTime.value = tFrozen;
    const cover = q.get('cover') === '1';
    if (story < T.SPACE) {
      // ---------------- the beach ----------------
      poseAll(story);
      if (t < T.HOOK) hookCam(cam, t); else if (story < T.T0) glide.apply(cam, story); else if (story < T.ERUPT) slowmo.apply(cam, story); else coast.apply(cam, story);
      if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      apple.update(t, { look: cam.position, slowBlinkAt: [1.6], earAt: [0.7], pr: R.SSAA });
      apple.root.visible = story < 19.6;
      for (const [av] of walkers) av.root.visible = story < T.ERUPT;   // nobody small and far away caught in the coast shot
      sitter[0].root.visible = story < T.ERUPT;
      // the decay: a blue flash (Cherenkov light in the sea and in every body), then heat
      const after = story - T.T0, on = story >= T.T0 ? 1 : 0;
      const cher = on * Math.max(0, 1 - smooth(19.2, 20.6, story)) * (0.85 + 0.15 * smooth(T.T0, T.T0 + 0.4, story));
      BX.uCher.value = cher * 1.0;
      for (const m of skins) m.emissiveIntensity = cher * 1.5;
      banana.material.emissiveIntensity = cher * 0.22;
      B.skyU.uFlash.value = cher * 0.06;
      seaLight.intensity = cher * 2.2;
      const dim = 1 - 0.45 * cher;                                     // the blue light outshines the dusk
      // the sand: black streaks heat up (micro-seconds), the ground itself glows (milliseconds on)
      BX.uSand.value = smooth(19.8, 23.6, story) * 0.85 + smooth(24.4, 25.4, story) * 0.35;
      const coastK = smooth(T.ERUPT, 31.0, story);
      BX.uGround.value = smooth(23.8, 26.8, story) * 0.3 + coastK * 0.7;
      BX.uRock.value = smooth(T.ERUPT, 29.0, story) * 1.0;
      BX.uTown.value = smooth(27.4, 35.0, story);
      BX.uSteam.value = smooth(33.0, 37.5, story) * 0.8;
      const town = BX.uTown.value, heatC = new THREE.Color(1.0, 0.45, 0.12);
      B.towers.slabMat.emissive.copy(heatC).multiplyScalar(town * town * 1.6); B.towers.railMat.emissive.copy(heatC).multiplyScalar(town * 1.2);
      FX.uScorch.value = smooth(22.0, 27.5, story); FX.uHeat.value = smooth(23.5, 30.0, story);
      groundGlow.intensity = smooth(20.5, 24.0, story) * 0.7 + smooth(24.4, 25.6, story) * 1.2 * (story < T.ERUPT ? 1 : 0) + coastK * 1.2;
      B.sun.intensity = 3.3 * (1 - 0.75 * coastK) * dim; B.skyU.uSkyI.value = (1 - 0.8 * coastK) * (1 - 0.3 * cher); B.hemi.intensity = 0.7 * dim * (1 - 0.6 * coastK);
      if (story >= T.ERUPT) { B.skyU.uFlashCol.value.setRGB(1.0, 0.36, 0.1); B.skyU.uFlash.value = 0.55 * coastK; } else B.skyU.uFlashCol.value.set('#3a8cff');
      // particles
      grains.update(story, cam, R.SSAA);
      for (let i = 0; i < JN; i++) {
        const [x, z, sd, w0] = jetP[i];
        const grow = smooth(20.6, 24.4, story) * (0.6 + 0.4 * sd), shoot = smooth(24.4, 25.6, story);
        if (story < 20.6 || story >= T.ERUPT || grow <= 0.001) { jets.hide(i); continue; }
        const hgt = 0.03 + grow * (0.18 + 0.3 * sd) + shoot * (2.5 + 5 * sd), wdt = w0 * (1 + shoot * 2.5);
        const c = 0.7 + 0.3 * smooth(22, 24.4, story);
        jets.set(i, x, groundY(x, z) - 0.01, z, wdt, hgt, 1.0 * c, 0.78 * c, 0.52 * c, (0.35 + 0.45 * grow) * (1 - 0.3 * shoot), 0, Math.floor(sd * 4));
      }
      jets.commit(); jets.update(cam, R.SSAA);
      for (let i = 0; i < WN; i++) {
        const [x, z, sd, b0] = wallP[i], age = story - b0;
        if (age < 0 || story >= T.ERUPT) { wall.hide(i); continue; }
        const k = clamp(age / 1.2), sz = 1.2 + k * (6 + 6 * sd);
        wall.set(i, x, groundY(x, z) + sz * 0.35, z, sz, sz, 1.0, 0.85, 0.65, smooth(0, 0.25, age) * 0.7, sd * 6.28, Math.floor(sd * 4));
      }
      wall.commit(); wall.update(cam, R.SSAA);
      for (let i = 0; i < CN; i++) {
        const [x, y, z, s, sd, b0] = colP[i], age = story - b0;
        if (age < 0 || story < T.ERUPT) { cols.hide(i); continue; }
        const w = s * (0.9 + 0.5 * sd + age * 0.1), hgt = Math.min(w * 2.6, s * (1.0 + age * (0.9 + 0.8 * sd)));
        const c = (1.0 - 0.3 * smooth(31, 38, story)) * (0.8 + 0.2 * sd);
        cols.set(i, x, y - 1, z, w, hgt, c, (0.55 + 0.25 * sd) * c, (0.22 + 0.15 * sd) * c, smooth(0, 0.35, age) * (0.3 + 0.3 * sd), 0, Math.floor(sd * 4));
      }
      cols.commit(); cols.update(cam, R.SSAA);
      for (let i = 0; i < FN; i++) {
        const [x, y, z, s, sd, b0] = fogP[i], age = story - b0;
        if (age < 0 || story < T.ERUPT) { fog2.hide(i); continue; }
        const sz = s * (1 + age * 0.15), lift = 10 + age * (12 + 10 * sd) + age * age * 1.2, hot = Math.max(0.3, 1 - age * 0.05);
        fog2.set(i, x, y + lift, z, sz, sz, 1.0 * hot, 0.42 * hot, 0.14 * hot, smooth(0, 1.0, age) * 0.1, sd * 6.28, Math.floor(sd * 4));
      }
      fog2.commit(); fog2.update(cam, R.SSAA);
      cols.commit(); cols.update(cam, R.SSAA);
      for (let i = 0; i < KN; i++) {
        const [x, y, z, s, sd, b0] = smokeP[i], age = story - b0;
        if (age < 0 || story < T.ERUPT) { smoke.hide(i); continue; }
        const g = 0.18 + 0.1 * sd;
        const base = i % 3 === 0 ? 35 : 90;
        smoke.set(i, x, y + base + age * (12 + sd * 10) + age * age * 0.7, z, s * 1.4 * (1 + age * 0.12), s * 1.4 * (1 + age * 0.12), g, g * 0.88, g * 0.82, smooth(0, 1.5, age) * (i % 3 === 0 ? 0.55 : 0.85), sd * 6.28, Math.floor(sd * 4));
      }
      smoke.commit(); smoke.update(cam, R.SSAA, B.sunDir);
      smoke.u.uLitCol.value.setRGB(1.0, 0.55, 0.3); smoke.u.uShadeCol.value.setRGB(0.12, 0.08, 0.07);
      for (let i = 0; i < SN; i++) {
        const [x, z, s, sd, b0] = steamP[i], age = story - b0;
        if (age < 0) { steam.hide(i); continue; }
        steam.set(i, x, s * 0.4 + age * (5 + sd * 6), z, s * (1 + age * 0.3), s * (1.2 + age * 0.4), 0.9, 0.88, 0.86, smooth(0, 1.2, age) * 0.5, sd * 6.28, Math.floor(sd * 4));
      }
      steam.commit(); steam.update(cam, R.SSAA, B.sunDir);
      steam.u.uLitCol.value.setRGB(1.0, 0.62, 0.38); steam.u.uShadeCol.value.setRGB(0.32, 0.26, 0.26); steam.u.uLightV.value.set(-0.6, 0.5, 0.6).normalize();
      // grading and exposure through the act
      R.renderer.toneMappingExposure = story < T.ERUPT ? 0.62 * (1 - 0.15 * smooth(20.0, 23.6, story) - 0.3 * smooth(24.4, 26.0, story)) : 0.48 - 0.1 * coastK;
      R.bloom.strength = 0.35 + cher * 0.3 + smooth(20.0, 23.0, story) * 0.25; R.bloom.radius = 0.55; R.bloom.threshold = 0.95 / R.renderer.toneMappingExposure;
      if (story >= T.ERUPT) { U.uTint.value.set(1.0, 0.9, 0.82); U.uContrast.value = 1.1; }
      // the flash at T0 (a hard cut on the hit) and the white-out as the beach erupts
      U.uFadeWhite.value = (story >= T.T0 && t >= T.HOOK ? Math.exp(-after * 9) * 0.85 : 0) + smooth(25.9, 26.8, story) * (story < T.ERUPT ? 1 : 0) + (story >= T.ERUPT ? Math.exp(-(story - T.ERUPT) * 6) * 0.9 : 0);
      if (story >= T.ERUPT) { const sh = Math.exp(-(story - T.ERUPT) * 0.5) * 0.004; U.uShake.value.set(Math.sin(story * 37) * sh, Math.cos(story * 29) * sh); }
      scene.fog.density = story >= T.ERUPT ? 0.00045 : 0.0012;
      B.ocean.U.uFogCol.value.copy(scene.fog.color); B.ocean.U.uFogD.value = scene.fog.density;
    } else if (story < T.GOI) {
      // ---------------- space ----------------
      rscene = SPc.scene;
      const k = (story - T.SPACE) / (T.GOI - T.SPACE);
      const lat = (-20.67 * Math.PI) / 180, lon = (-40.5 * Math.PI) / 180;   // Guarapari: 20.67 S, 40.5 W
      SPc.earth.rotation.set(0, -Math.PI / 2 - lon, 0); SPc.veil.rotation.copy(SPc.earth.rotation);
      const dirG = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)).applyEuler(SPc.earth.rotation);
      const camD = 6.4 - 0.9 * k, upV = new THREE.Vector3(0, 1, 0);
      cam.position.copy(dirG).multiplyScalar(camD).addScaledVector(upV, -0.35); cam.fov = 40; cam.updateProjectionMatrix();
      cam.up.set(0, 1, 0); cam.lookAt(dirG.clone().multiplyScalar(0.3).addScaledVector(upV, 1.25 - 0.15 * k)); cam.updateMatrixWorld();   // Earth low in the frame, space above
      const sunD = dirG.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -1.35).normalize();   // dusk at Guarapari: the sun over the west
      SPc.U.uSun.value.copy(sunD); SPc.sunL.position.copy(sunD).multiplyScalar(10);
      SPc.U.uTime.value = story; SPc.U.uHot.value = 0.75 + 0.25 * smooth(T.SPACE, 44, story); SPc.U.uBoil.value = smooth(T.SPACE, T.GOI, story);
      SPc.U.uVap.value = 0.5 + 0.4 * k; SPc.veil.material.uniforms.uR.value = 1.01 + 0.07 * k;
      SPc.glowL.position.copy(dirG).multiplyScalar(1.6); SPc.glowL.intensity = 1.6;
      // the spinner drifting through space above the burning planet, still spinning at full speed
      spin2.root.position.copy(cam.position).addScaledVector(cam.getWorldDirection(_v), 0.55).add(new THREE.Vector3(0.04 - 0.05 * k, 0.055 + 0.012 * k, 0).applyQuaternion(cam.quaternion));
      spin2.root.quaternion.copy(cam.quaternion); spin2.root.rotateX(1.05 + 0.1 * k); spin2.root.rotateZ(0.35 - 0.2 * k);
      spin2.rotor.rotation.y = -t * 2.2 * Math.PI * 2;
      SPc.upL.position.copy(spin2.root.position).addScaledVector(dirG, -1).addScaledVector(new THREE.Vector3(0, -1, 0), 0.6); SPc.upL.target.position.copy(spin2.root.position); SPc.upL.target.updateMatrixWorld();
      SPc.camL.position.copy(cam.position).add(new THREE.Vector3(0.3, 0.5, 0)); SPc.camL.target.position.copy(spin2.root.position); SPc.camL.target.updateMatrixWorld();
      R.renderer.toneMappingExposure = 0.62; R.bloom.strength = 0.45; R.bloom.radius = 0.6; R.bloom.threshold = 0.95 / 0.62;
      U.uFadeWhite.value = Math.exp(-(story - T.SPACE) * 5) * 0.6;
    } else {
      // ---------------- Goiania, 1987 ----------------
      rscene = shed.scene;
      const k = clamp((story - T.GOI) / (T.END - T.GOI));
      stand(man, { pos: V(0.05, 0, -0.42), yaw: Math.PI, lean: 0.42, breath: (story * 0.22) % 1, look: shed.bench,
        armL: (sh, f, l, u) => ({ hand: V(-0.32, 0.93, -0.92), pole: sh.clone().addScaledVector(l, 0.5).addScaledVector(u, -0.4), F: f.clone().addScaledVector(u, -0.3).normalize(), N: V(0, -1, 0) }),
        armR: (sh, f, l, u) => ({ hand: V(0.36, 0.93, -0.92), pole: sh.clone().addScaledVector(l, -0.5).addScaledVector(u, -0.4), F: f.clone().addScaledVector(u, -0.3).normalize(), N: V(0, -1, 0) }) });
      apple2.update(story, { look: cam.position, blinkAt: [55.2, 59.7], pr: R.SSAA });
      cam.position.set(0.92 - 0.12 * k, 1.2 - 0.04 * k, -1.85 + 0.12 * k); cam.fov = 42; cam.updateProjectionMatrix(); cam.up.set(0, 1, 0);
      cam.lookAt(-0.1 - 0.05 * k, 1.12 - 0.03 * k, -0.75); cam.updateMatrixWorld();   // from the end of the bench: the powder, his face lit from below
      shed.glow.intensity = 0.55 * (0.97 + 0.03 * Math.sin(story * 2.1)); shed.dust.update(story, cam, R.SSAA);
      R.renderer.toneMappingExposure = 0.9; R.bloom.strength = 0.5; R.bloom.radius = 0.5; R.bloom.threshold = 0.95 / 0.9;
      U.uVignette.value = 0.5; U.uFade.value = 1 - smooth(T.GOI, T.GOI + 0.6, story);
    }
    R.renderPass.scene = rscene; R.renderPass.camera = cam;
    R.composer.render();

    // ---------------- overlay ----------------
    const titleA = cover ? 1 : t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0;
    const endA = smooth(T.END, T.END + 0.5, t);
    const labels = []; const al = cover ? null : appleLabel(t); if (al) labels.push(al);
    ov.apply({ labels,
      tag: 'WHAT IF &nbsp;·&nbsp; 05', tagA: t < T.END ? 1 : 0,
      title: { html: TITLE, a: titleA, k: 1 },
      hud: cover ? null : hudAt(t), caption: cover ? null : captionAt(CAPTIONS, t),
      end: endA > 0 ? { a: endA, title: TITLE, note: '<span class="q">Still eating bananas?</span><br><br>Your body: 4,400 potassium-40 decays a second<br>Guarapari’s sand: up to 100× normal radiation' } : null,
    });
  }
  window.EP = { B, cam, THREE, BX, you, apple, SPc, shed, H0 };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS.map(([a, b, c]) => [a, b, c]) };
}
