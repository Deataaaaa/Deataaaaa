// Post 4 v2: What if light became instant for 5 seconds? (Paris, Champ de Mars; space; Holmdel 1964)
// v2 after the owner's notes ("flickering at the beginning", "not visual enough, it must be hella impressive"):
//  - anti-flicker: no film grain, 2x supersampling, every particle at least 1.6 px wide (alpha drops instead),
//    ember specks frequency-clamped, shadows fade toward the shadow-map edge (no line to pop), frustum switches only
//    inside the flash and the blast, a slower drone.
//  - spectacle, one long Paris take after the hook: late-afternoon golden light; the flash bursts out of the sun in
//    frame; time slowed 1,000x: a frozen sea of embers and a carpet of frozen flames, the people's shadows left
//    unburnt; the Milky Way blazing in daylight; the sky turning into the Big Bang's afterglow (false colour), then the
//    air glowing; the blast: the air explodes upward; the Eiffel Tower vaporising from the top into sparks.
// Space (38.6-57): the burning planet, its air streaming away; light back to normal, the Sun goes black, the light
// front crossing space. Reconstruction (57-69.2): the 1964 hiss in the Holmdel horn. Loop end card (69.2-75).
import * as THREE from 'three';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeOut, easeIn, CamPath, project, W, H } from '../engine/core.js';
import { makeParis, makeGrassField, FX, heatize, makeDaySky, makeTrees } from '../engine/paris.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { sit, stand } from '../engine/poses.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { loadTex, makeStars, softDotTex, canvasTex } from '../engine/assets.js';
import { Sparks, SkyStars, Billboards, Streaks, Flare, flameAtlas, fireStripAtlas, smokeAtlas, fireballAtlas, milkyWayMap, cmbMap, fadeShadowBorders } from '../engine/fx.js';

const DUR = 75.0;
export const T = { HOOK: 3.6, T0: 10.6, STARS: 17.6, BIG: 21.0, AIR: 24.7, KT: 27.8, MELT: 32.5, SPACE: 38.6, REAL: 41.5, NORMAL: 46.5, DARK: 46.7, SUNBACK: 56.0, REC: 57.0, END: 69.2 };

const CAPTIONS = [
  [3.75, 6.66, 'A summer afternoon in Paris.'],
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
const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
const hash1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

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
  return grp;
}

// ---------------------------------------------------------------------------------------------------------------
// space: the burning planet (dark crust, glowing cracks, oceans boiling into incandescent steam), its air streaming
// away; the glowing Moon; the Sun; the Milky Way and the stars (no air in space); the light front of the black Sun
// ---------------------------------------------------------------------------------------------------------------
const VNOISE = /* glsl */`
  float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
  float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y), mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
  float fbmv(vec3 p){ return n3(p) * 0.5 + n3(p * 2.03 + 7.1) * 0.25 + n3(p * 4.1 - 3.3) * 0.125 + n3(p * 8.3 + 1.1) * 0.0625; }`;
function makeSpace(tex, tMilky) {
  const scene = new THREE.Scene();
  const bg = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { tM: { value: tMilky }, uI: { value: 0.32 } },
    vertexShader: `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform sampler2D tM; uniform float uI; varying vec3 vD; void main(){ vec3 d = normalize(vD); vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5); gl_FragColor = vec4(texture2D(tM, uv).rgb * uI, 1.0); }`,
  }));
  bg.frustumCulled = false; bg.renderOrder = -10; scene.add(bg);
  const sr = rng(4242), list = [];
  for (let i = 0; i < 16000; i++) {
    const u = sr() * 2 - 1, th = sr() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
    const m = Math.pow(sr(), 3.0), tp = sr(), I = 0.25 + 3.0 * m * m, c = tp < 0.3 ? [0.72, 0.84, 1] : tp < 0.75 ? [1, 0.97, 0.92] : [1, 0.8, 0.58];
    list.push({ d, px: 1.0 + m * 2.6, r: c[0] * I, g: c[1] * I, b: c[2] * I });
  }
  const stars = new SkyStars(list, { radius: 2800, minPx: 1.6 }); scene.add(stars.points);
  const U = { tDay: { value: tex.day }, tC: { value: tex.clouds }, uSun: { value: new THREE.Vector3(1, 0, 0) }, uSunOn: { value: 1 }, uHeat: { value: 1 }, uTime: { value: 0 } };
  const vs = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vUv = uv; vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`;
  const earthMat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: vs,
    fragmentShader: `uniform sampler2D tDay, tC; uniform vec3 uSun; uniform float uSunOn, uHeat, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      ${VNOISE}
      void main(){
        vec3 n = normalize(vN); float d = dot(n, uSun);
        vec3 day = texture2D(tDay, vUv).rgb; float cl = texture2D(tC, vUv).r;
        float ocean = smoothstep(0.02, -0.05, day.r + day.g * 0.5 - day.b * 1.2);
        vec3 col = mix(day, vec3(0.95), cl * cl * 0.85) * (0.015 + max(d, 0.0)) * uSunOn;
        float f1 = fbmv(vP * 7.0 + vec3(0.0, uTime * 0.01, 0.0));
        vec3 q = vP * 18.0 + vec3(f1 * 1.5);
        float c1 = smoothstep(0.86, 0.985, 1.0 - abs(n3(q) * 2.0 - 1.0)), c2 = smoothstep(0.9, 0.99, 1.0 - abs(n3(q * 2.7 + 5.0) * 2.0 - 1.0));
        float cracks = max(c1, c2 * 0.7);
        float pool = smoothstep(0.62, 0.8, f1);                                   // molten pools
        vec3 land = vec3(0.075, 0.02, 0.012) * (0.4 + f1) + vec3(1.0, 0.3, 0.05) * (cracks * 2.2 + pool * 1.4) + vec3(1.0, 0.62, 0.25) * cracks * pool * 1.5;
        float st = clamp(cl * 0.9 + (fbmv(vP * 12.0 - vec3(uTime * 0.02)) - 0.35) * 1.2, 0.0, 1.0);
        vec3 steam = mix(vec3(0.85, 0.32, 0.12), vec3(1.0, 0.78, 0.55), st) * (0.5 + 0.75 * st);
        vec3 hot = mix(land, steam, ocean) * (0.7 + 0.5 * max(d, 0.0) * uSunOn);
        col = mix(col, hot, uHeat);
        float mu = max(dot(n, normalize(vV)), 0.0), rim = pow(1.0 - mu, 3.0);
        col += mix(vec3(0.25, 0.5, 1.0) * max(d, 0.0) * uSunOn, vec3(1.0, 0.42, 0.12) * 1.7, uHeat) * rim;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 80), earthMat); earth.rotation.set(0.42, -1.62, 0, 'XYZ'); scene.add(earth);
  // atmosphere: a glowing turbulent layer, and an outer one that swells as the air leaves
  const shellMat = (inner) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { uA: { value: 0 }, uTime: U.uTime, uK: { value: inner ? 2.2 : 1.4 } },
    vertexShader: vs,
    fragmentShader: `uniform float uA, uTime, uK; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${VNOISE}
      void main(){
        float mu = abs(dot(normalize(vN), normalize(vV)));
        float nz = fbmv(normalize(vP) * 5.0 + vec3(0.0, uTime * 0.06, 0.0)) * 0.6 + fbmv(normalize(vP) * 15.0 - vec3(uTime * 0.1)) * 0.4;
        float a = pow(1.0 - mu, uK) * smoothstep(0.0, 0.35, mu) * (0.35 + 1.1 * nz * nz) * uA;
        gl_FragColor = vec4(mix(vec3(1.0, 0.36, 0.1), vec3(1.0, 0.78, 0.5), nz) * a, 1.0);
      }`,
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.035, 128, 64), shellMat(true)); scene.add(atmo);
  const atmo2 = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), shellMat(false)); scene.add(atmo2);
  // the air streaming away: sparks and short trails leaving every part of the limb
  const AN = 16000, air = new Sparks(AN, { minPx: 1.5, maxPx: 12, near: 0.05 }), ar = rng(55);
  const ASN = 5000, airS = new Streaks(ASN, { widthPx: 1.8 });
  const rdir = () => { const u = ar() * 2 - 1, th = ar() * Math.PI * 2, s = Math.sqrt(1 - u * u); return new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th)); };
  for (let i = 0; i < AN; i++) {
    const d = rdir(), r0 = 1.01 + ar() * 0.03, sp = 0.02 + ar() * 0.09, tg = rdir().cross(d).multiplyScalar(0.012);
    const tk = ar(), g = 3 + ar() * 5, c = tk < 0.6 ? [1.0, 0.45, 0.14] : [1.0, 0.78, 0.5];
    air.set(i, d.x * r0, d.y * r0, d.z * r0, d.x * sp + tg.x, d.y * sp + tg.y, d.z * sp + tg.z, c[0] * g, c[1] * g, c[2] * g, 0.004 + ar() * 0.008, 40.6 + ar() * 12, 4 + ar() * 6, ar());
  }
  air.commit(); air.u.uCool.value = 0.8; air.u.uTurb.value = 0.012; air.u.uTurbF.value = 0.5; scene.add(air.points);
  for (let i = 0; i < ASN; i++) {
    const d = rdir(), r0 = 1.02 + ar() * 0.03, sp = 0.05 + ar() * 0.12, g = 2.5 + ar() * 3;
    airS.set(i, d.x * r0, d.y * r0, d.z * r0, d.x * sp, d.y * sp, d.z * sp, g, g * 0.55, g * 0.2, 0.7 + ar() * 0.6, 41.0 + ar() * 11, 3 + ar() * 4, ar());
  }
  airS.commit(); airS.u.uTrail.value = 0.5; airS.u.uNear.value = 0.05; scene.add(airS.mesh);
  // the Moon, glowing too (it received the same light)
  const moonMat = new THREE.ShaderMaterial({
    uniforms: { tM: { value: tex.moon }, uSun: U.uSun, uSunOn: U.uSunOn, uHeat: { value: 0.8 }, uTime: U.uTime }, vertexShader: vs,
    fragmentShader: `uniform sampler2D tM; uniform vec3 uSun; uniform float uSunOn, uHeat, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${VNOISE}
      void main(){ vec3 n = normalize(vN); float d = max(dot(n, uSun), 0.0) * uSunOn; vec3 m = texture2D(tM, vUv).rgb;
        float cr = pow(clamp(1.0 - abs(fbmv(vP * 30.0) * 2.0 - 1.0), 0.0, 1.0), 6.0);
        vec3 col = m * (0.01 + 1.1 * d); vec3 hot = vec3(0.12, 0.03, 0.015) * (0.6 + m.r) + vec3(1.0, 0.34, 0.07) * (cr * 1.8 + 0.25 * m.r);
        col = mix(col, hot, uHeat); float rim = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 3.0); col += vec3(1.0, 0.45, 0.15) * rim * uHeat * 0.8;
        gl_FragColor = vec4(col, 1.0); }`,
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.273, 96, 48), moonMat); scene.add(moon);
  // the Sun: a small white-hot disk with a glow (the starburst comes from a Flare)
  const sunGrp = new THREE.Group(); scene.add(sunGrp);
  const glowTex = softDotTex();
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(30, 27, 22), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.4, 1.0, 0.65), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sunCore.scale.setScalar(7); sunHalo.scale.setScalar(70); sunGrp.add(sunHalo, sunCore);
  const flare = new Flare(); scene.add(flare.group);
  // the light front of the black Sun: a thin shell of light growing from the Sun (bright where seen edge-on)
  const front = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uA; varying vec3 vN; varying vec3 vV;
      void main(){ float mu = abs(dot(normalize(vN), normalize(vV)));
        float I = clamp(0.012 / max(mu, 0.03), 0.0, 0.5) + pow(1.0 - mu, 10.0) * 2.2 + pow(1.0 - mu, 40.0) * 4.0;
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * I * uA, 1.0); }`,
  }));
  front.frustumCulled = false; scene.add(front);
  return { scene, earth, U, atmo, atmo2, air, airS, moon, moonMat, sunGrp, sunCore, sunHalo, stars, bg, flare, front };
}

// ---------------------------------------------------------------------------------------------------------------
// Holmdel, May 1964 (reconstruction): the horn antenna at golden hour, two scientists, pigeons. The camera pushes into
// the horn's mouth and onto the hiss it heard: the CMB.
// ---------------------------------------------------------------------------------------------------------------
function makePigeon(body, dark, wing) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), body); b.scale.set(0.95, 0.85, 1.6); g.add(b);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), body); head.position.set(0, 0.1, 0.17); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 6), dark); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.095, 0.235); g.add(beak);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.015, 0.16), dark); tail.position.set(0, -0.01, -0.24); tail.rotation.x = 0.25; g.add(tail);
  const wg = new THREE.PlaneGeometry(0.32, 0.14); wg.translate(0.16, 0, 0);
  const wl = new THREE.Mesh(wg, wing), wr = new THREE.Mesh(wg, wing); wr.scale.x = -1;
  wl.position.set(0.06, 0.06, 0.03); wr.position.set(-0.06, 0.06, 0.03); g.add(wl, wr);
  for (const m of g.children) m.castShadow = true;
  return { g, wl, wr };
}
function makeHolmdel(renderer, tCMB) {
  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(-0.25, 0.36, 0.9).normalize();    // low golden sun from behind-left of the camera
  const skyOpt = { zen: '#3a67ab', mid: '#bcc3c6', hor: '#f3cd94', sunCol: '#ffd090' };
  const sky = makeDaySky(sunDir, skyOpt); scene.add(sky);
  const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(makeDaySky(sunDir, skyOpt)); scene.environment = pm.fromScene(es, 0, 1, 20000).texture; scene.environmentIntensity = 0.55;
  scene.fog = new THREE.FogExp2('#d9c29c', 0.004);
  const sun = new THREE.DirectionalLight('#ffcb8c', 3.6); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 2;
  sun.target.position.set(14, 0, 6); sun.position.copy(sun.target.position).addScaledVector(sunDir, 120);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 260 });
  scene.add(sun, sun.target, new THREE.HemisphereLight('#d9dde4', '#6a5e3e', 0.55));
  const grassT = canvasTex(256, 256, (g, w, h) => { const r = rng(3); g.fillStyle = '#76803e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${80 + r() * 80},${90 + r() * 60},${30 + r() * 30},0.5)`; g.fillRect(r() * w, r() * h, 1, 3); } }, { repeat: true });
  grassT.repeat.set(90, 90);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const r = rng(8), tl = [];
  for (let i = 0; i < 120; i++) { const a = -0.6435 - 2.0 + i / 120 * 4.0, d = 70 + r() * 55; tl.push({ x: 10 + Math.sin(a) * d, z: -3 + Math.cos(a) * d * -1, s: 1.2 + r() * 0.5 }); }
  scene.add(makeTrees(tl, { seed: 17 }).group);
  const panelTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c7cbcf'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { g.fillStyle = 'rgba(0,0,0,0.09)'; g.fillRect(x, 0, 2, h); } for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(0,0,0,0.26)'; g.fillRect(0, y, w, 2); } const rr = rng(2); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,80,60,${rr() * 0.06})`; g.fillRect(rr() * w, rr() * h, 3 + rr() * 20, 2 + rr() * 30); } }, { repeat: true });
  panelTex.repeat.set(3, 3);
  const alu = new THREE.MeshStandardMaterial({ map: panelTex, color: '#ffffff', roughness: 0.42, metalness: 0.65, side: THREE.DoubleSide });
  const steel = new THREE.MeshStandardMaterial({ color: '#6c6f71', roughness: 0.6, metalness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: '#0b0c0e', roughness: 0.95 });
  const horn = new THREE.Group();
  const frus = new THREE.CylinderGeometry(6.2 / Math.SQRT2, 1.0 / Math.SQRT2, 14, 4, 1, true); frus.rotateY(Math.PI / 4); frus.rotateX(-Math.PI / 2); frus.translate(0, 0, -7);
  const fm = new THREE.Mesh(frus, alu); fm.castShadow = fm.receiveShadow = true; horn.add(fm);
  const inner = new THREE.MeshStandardMaterial({ color: '#25282c', roughness: 0.8, metalness: 0.3, side: THREE.DoubleSide });
  const box = new THREE.Mesh(new THREE.BoxGeometry(6.6, 6.6, 6.4), [new THREE.MeshBasicMaterial({ visible: false }), inner, inner, inner, inner, inner]);
  box.position.set(0, 0, -17.1); box.castShadow = box.receiveShadow = true; horn.add(box);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(6.72, 6.72, 6.52), [new THREE.MeshBasicMaterial({ visible: false }), alu, alu, alu, alu, alu]);
  shell.position.set(0, 0, -17.1); shell.castShadow = shell.receiveShadow = true; horn.add(shell);
  const refl = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 9.0), new THREE.MeshStandardMaterial({ color: '#3b3f44', roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }));
  refl.position.set(-0.2, 0, -17.1); refl.rotation.y = Math.PI / 4; refl.scale.set(1, 0.72, 1); refl.receiveShadow = true; horn.add(refl);   // the reflector, at 45 degrees
  const aper = new THREE.Object3D(); aper.position.set(3.31, 0, -17.1); horn.add(aper);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(3.3 * Math.SQRT2, 0.09, 4, 4), steel); lip.rotation.set(0, Math.PI / 2, Math.PI / 4); lip.position.set(3.36, 0, -17.1); horn.add(lip);
  for (let k = 0; k <= 7; k++) {
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
  base.rotation.y = -0.93; scene.add(base);
  base.updateMatrixWorld(true);
  const A = aper.getWorldPosition(new THREE.Vector3()), An = new THREE.Vector3(1, 0, 0).transformDirection(aper.parent.matrixWorld).normalize();
  // pigeons on the reflector box, near the mouth
  const pb = new THREE.MeshStandardMaterial({ color: '#80858d', roughness: 0.8 }), pdk = new THREE.MeshStandardMaterial({ color: '#3c3f45', roughness: 0.8 });
  const pw = new THREE.MeshStandardMaterial({ color: '#6f747c', roughness: 0.85, side: THREE.DoubleSide });
  const pigeons = [[2.4, -15.2, 0.5], [2.6, -16.6, -0.8], [1.2, -18.4, 2.2], [2.2, -19.4, -2.4], [0.4, -14.6, 1.0]].map(([x, z, rot], i) => {
    const p = makePigeon(pb, pdk, pw); const home = new THREE.Vector3(x, 3.42, z).applyMatrix4(horn.matrixWorld);
    scene.add(p.g); return { ...p, home, rot: rot - 0.93, i };
  });
  // the hiss itself: the CMB around the camera (dissolved in at the end of the push)
  const cmbSph = new THREE.Mesh(new THREE.SphereGeometry(40, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthTest: false, depthWrite: false, transparent: true, uniforms: { tC: { value: tCMB }, uA: { value: 0 }, uRot: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tC; uniform float uA, uRot; varying vec3 vD; void main(){ vec3 d = normalize(vD); float c = cos(uRot), s = sin(uRot); d = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z);
      vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5); gl_FragColor = vec4(texture2D(tC, uv).rgb * 0.95, uA); }`,
  }));
  cmbSph.renderOrder = 999; cmbSph.frustumCulled = false; scene.add(cmbSph);
  return { scene, horn, base, pigeons, sun, A, An, cmbSph, sunDir };
}

// ---------------------------------------------------------------------------------------------------------------
// geometry helpers for the fire layout (shadow tests against the people and the tree crowns)
// ---------------------------------------------------------------------------------------------------------------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
function segSegDist(p1, q1, p2, q2) {   // closest distance between segments p1q1 and p2q2
  const d1 = _a.subVectors(q1, p1), d2 = _b.subVectors(q2, p2), r = _c.subVectors(p1, p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  let s, t;
  if (a <= 1e-9 && e <= 1e-9) return r.length();
  if (a <= 1e-9) { s = 0; t = clamp(f / e); } else {
    const c = d1.dot(r);
    if (e <= 1e-9) { t = 0; s = clamp(-c / a); } else {
      const b = d1.dot(d2), den = a * e - b * b;
      s = den !== 0 ? clamp((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a); } else if (t > 1) { t = 1; s = clamp((b - c) / a); }
    }
  }
  const x = p1.x + d1.x * s - (p2.x + d2.x * t), y = p1.y + d1.y * s - (p2.y + d2.y * t), z = p1.z + d1.z * s - (p2.z + d2.z * t);
  return Math.hypot(x, y, z);
}
function pointSegDist(p, a, b) {
  const ab = _a.subVectors(b, a), ap = _b.subVectors(p, a); const t = clamp(ap.dot(ab) / Math.max(ab.dot(ab), 1e-9));
  return Math.hypot(ap.x - ab.x * t, ap.y - ab.y * t, ap.z - ab.z * t);
}

// ---------------------------------------------------------------------------------------------------------------
export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);   // 2x2 supersampling already gives 4 samples per pixel
  fadeShadowBorders(0.2);
  const R = createRenderer();
  const PR = R.SSAA;
  const ov = new Overlay();
  document.body.classList.add('cine');
  const P = makeParis(R.renderer, { sunAz: 262, sunEl: 38, sky: { zen: '#2a58a6', mid: '#9cbad8', hor: '#f0dcb8', sunCol: '#ffe0b0' }, fog: '#cfc4b0', sunCol: '#ffd7a0' });
  const scene = P.scene, sunDir = P.sunDir;
  P.tower.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });   // same look in every shadow setup
  const H0 = new THREE.Vector3(-20, 0.075, 58);           // hero blanket (lawn top is at y = 0.08)
  const grass = makeGrassField(H0.x, H0.z, 10, 110000, { exclude: [[H0.x, H0.z, 1.2, 0.9]] }); scene.add(grass.mesh);
  const blanket = makeBlanket(2.3, 1.7, 5); blanket.position.copy(H0); blanket.rotation.y = 0.08; scene.add(blanket);
  const picnic = makePicnic(); picnic.position.copy(H0); picnic.rotation.y = 0.08; scene.add(picnic);

  // ---- sky maps: the Milky Way (galactic centre high over the tower) and the CMB, baked once ----
  const gC = new THREE.Vector3(0.35, 0.62, -0.7).normalize(), gA = new THREE.Vector3(-0.8, 0.1, -0.58).normalize();
  const gN = new THREE.Vector3().crossVectors(gC, gA).normalize(), gE = new THREE.Vector3().crossVectors(gN, gC).normalize();
  const tCMB = cmbMap(R.renderer);
  P.skyU.tMilky.value = milkyWayMap(R.renderer, gN, gC); P.skyU.tCMB.value = tCMB;
  const sr0 = rng(808), starList = [];
  while (starList.length < 70000) {
    let d;
    if (sr0() < 0.75) { const l = (sr0() * 2 - 1) * Math.PI, b = gauss(sr0) * (sr0() < 0.6 ? 0.07 : 0.16); d = gC.clone().multiplyScalar(Math.cos(b) * Math.cos(l)).addScaledVector(gE, Math.cos(b) * Math.sin(l)).addScaledVector(gN, Math.sin(b)); }
    else { const u = sr0() * 2 - 1, th = sr0() * Math.PI * 2, s = Math.sqrt(1 - u * u); d = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th)); }
    if (d.y < 0.03) continue;
    const m = Math.pow(sr0(), 3.2), tp = sr0(), I = (0.22 + 2.8 * m * m) * smooth(0.03, 0.14, d.y);
    const c = tp < 0.25 ? [0.72, 0.84, 1.0] : tp < 0.72 ? [1.0, 0.97, 0.92] : [1.0, 0.8, 0.58];
    starList.push({ d, px: 1.0 + m * 3.0, r: c[0] * I, g: c[1] * I, b: c[2] * I });
  }
  const stars = new SkyStars(starList, { radius: 4600, minPx: 1.7 }); stars.u.uPR.value = PR; scene.add(stars.points);
  const flare = new Flare(); scene.add(flare.group);

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

  // ---- the frozen pose at the flash: capsules around the two heroes (for the fire layout) ----
  poseAll(T.T0);
  const caps = [];
  for (const av of [you, friend]) {
    av.root.updateMatrixWorld(true);
    const wp = (n) => (av.bones[n] ? av.bones[n].getWorldPosition(new THREE.Vector3()) : null);
    const seg = (a, b, r) => { const A = wp(a), B = wp(b); if (A && B) caps.push([A, B, r]); };
    seg('Hips', 'Spine2', 0.2); seg('Spine2', 'Head', 0.17);
    const hd = wp('Head'); if (hd) caps.push([hd, hd.clone().add(V(0, 0.16, 0)), 0.14]);
    for (const s of ['Left', 'Right']) { seg(s + 'UpLeg', s + 'Leg', 0.11); seg(s + 'Leg', s + 'Foot', 0.08); seg(s + 'Arm', s + 'ForeArm', 0.07); seg(s + 'ForeArm', s + 'Hand', 0.06); }
  }
  for (const [av, , x, z] of placements.slice(2)) caps.push([V(x, 0.15, z), V(x, 1.0, z), 0.3]);
  for (const p of [TH, CA]) caps.push([p.clone().setY(0.1), p.clone().setY(1.75), 0.25]);
  const crowns = P.treeList.map((t) => ({ c: V(t.x, 6.8 * t.s, t.z), r: 3.4 * t.s }));
  const _far = new THREE.Vector3();
  function inShadow(p) {
    _far.copy(p).addScaledVector(sunDir, 40);
    for (const [A, B, r] of caps) if (Math.abs(A.x - p.x) < 6 && Math.abs(A.z - p.z) < 6 && segSegDist(p, _far, A, B) < r) return true;
    for (const { c, r } of crowns) {
      if (Math.abs(c.x - p.x) > 30 || Math.abs(c.z - p.z) > 30) continue;
      const oc = _a.subVectors(p, c), b = oc.dot(sunDir), cc = oc.dot(oc) - r * r;
      if (b * b - cc > 0 && -b > 0) return true;
    }
    return false;
  }
  const lawnX = [[-56, -6], [6, 56], [-92, -68], [68, 92]], lawnZ = [[-110, -18], [-6, 82], [94, 182], [194, 282], [294, 382]];
  const onLawn = (x, z) => lawnX.some(([a, b]) => x > a + 0.3 && x < b - 0.3) && lawnZ.some(([a, b]) => z > a + 0.3 && z < b - 0.3);
  const blanketList = [[H0.x, H0.z, 0.08, 1.25, 0.95], ...blankets.map(([x, z, ry]) => [x, z, ry, 1.1, 0.85])];
  const onBlanket = (x, z) => blanketList.some(([bx, bz, ry, hw, hd]) => { const dx = x - bx, dz = z - bz, c = Math.cos(ry), s = Math.sin(ry); return Math.abs(dx * c - dz * s) < hw && Math.abs(dx * s + dz * c) < hd; });
  const insideBody = (p, pad) => caps.some(([A, B, r]) => pointSegDist(p, A, B) < r + pad);

  // ---- fire: a carpet of frozen flames on the sunlit grass (shadows stay unburnt), flames on the tree crowns ----
  const C = V(H0.x - 0.1, 0.55, H0.z);                    // between the two heroes
  const fr = rng(31), flames = [];
  // the sunlit grass burns in patches of fire fronts (strips of many tongues), densest around the picnic
  for (let tries = 0; flames.length < 2600 && tries < 80000; tries++) {
    const rr = 1.2 + 70 * Math.pow(fr(), 2.0), a = fr() * Math.PI * 2;
    const px = C.x + Math.cos(a) * rr, pz = C.z + Math.sin(a) * rr;
    if (!onLawn(px, pz) || onBlanket(px, pz) || inShadow(V(px, 0.12, pz))) continue;
    const near = smooth(35, 4, rr), n = 2 + Math.floor(fr() * (3 + 5 * near));
    for (let j = 0; j < n; j++) {
      const x = px + (fr() - 0.5) * 1.6, z = pz + (fr() - 0.5) * 1.6;
      if (!onLawn(x, z) || onBlanket(x, z) || Math.hypot(x - C.x, z - C.z) < 1.05) continue;
      if (inShadow(V(x, 0.12, z))) continue;
      const h = (0.14 + fr() * 0.26) * (1 + (1 - near) * 1.4);
      flames.push({ x, z, h, w: h * (2.2 + fr() * 2.2), birth: T.T0 + 0.45 + fr() * 2.4, tile: Math.floor(fr() * 4), ph: fr() * 6.28, hot: 0.75 + fr() * 0.5, tree: 0 });
    }
  }
  for (const t of P.treeList) {     // leaves facing the sun catch fire
    if (Math.hypot(t.x - C.x, t.z - C.z) > 170) continue;
    for (let k = 0; k < 3; k++) {
      const sp = V(sunDir.x + (fr() - 0.5) * 0.9, sunDir.y * 0.6 + (fr() - 0.3) * 0.6, sunDir.z + (fr() - 0.5) * 0.9).normalize();
      const p = V(t.x, 6.8 * t.s, t.z).addScaledVector(sp, 3.0 * t.s);
      const h = (1.3 + fr() * 1.6) * t.s;
      flames.push({ x: p.x, z: p.z, y: p.y - h * 0.35, h, w: h * 1.6, birth: T.T0 + 0.7 + fr() * 2.2, tile: Math.floor(fr() * 4), ph: fr() * 6.28, hot: 0.7 + fr() * 0.4, tree: 1 });
    }
  }
  const flameBB = new Billboards(flames.length, { map: fireStripAtlas(3), tiles: [1, 4], additive: true, upright: true, anchor: 1, minPx: 1.6, near: 0.4 });
  scene.add(flameBB.mesh);
  // smoke: lit puffs rising slowly from the burning grass near the heroes
  const smokeL = [];
  for (let tries = 0; smokeL.length < 700 && tries < 20000; tries++) {
    const rr = 1.6 + 26 * Math.pow(fr(), 1.3), a = fr() * Math.PI * 2, x = C.x + Math.cos(a) * rr, z = C.z + Math.sin(a) * rr;
    if (!onLawn(x, z)) continue;
    smokeL.push({ x, z, y0: 0.25 + fr() * 0.6, rise: 0.25 + fr() * 1.6, s: 0.5 + fr() * 1.6, birth: T.T0 + 0.9 + fr() * 3.5, tile: Math.floor(fr() * 4), rot: fr() * 6.28, a: 0.22 + fr() * 0.2 });
  }
  const smokeBB = new Billboards(smokeL.length, { map: smokeAtlas(4), additive: false, lit: true, minPx: 1.6, near: 0.6, renderOrder: 4 });
  smokeBB.u.uLitCol.value.setRGB(1.0, 0.86, 0.7); smokeBB.u.uShadeCol.value.setRGB(0.24, 0.23, 0.25);
  scene.add(smokeBB.mesh);

  // ---- embers: a frozen sea of sparks around the heroes, thinner over the whole Champ de Mars ----
  const er = rng(57);
  const EN = 52000, embers = new Sparks(EN, { minPx: 1.6, maxPx: 40, near: 0.3 });
  let ei = 0;
  for (let tries = 0; ei < EN && tries < EN * 4; tries++) {
    const nearSet = ei < 30000;
    const rr = nearSet ? 0.4 + 15 * Math.pow(er(), 1.25) : 15 + 140 * Math.pow(er(), 0.9);
    const a = er() * Math.PI * 2, x = C.x + Math.cos(a) * rr, z = C.z + Math.sin(a) * rr;
    const y = LAWN + 0.02 + (nearSet ? -Math.log(1 - er() * 0.995) * 0.55 : -Math.log(1 - er() * 0.99) * 1.6);
    const p = V(x, y, z);
    if (insideBody(p, 0.06)) continue;
    if (!nearSet && !onLawn(x, z) && er() < 0.7) continue;
    const tk = er(), col = tk < 0.5 ? [1.0, 0.42, 0.1] : tk < 0.85 ? [1.0, 0.62, 0.22] : [1.0, 0.86, 0.6];
    const g = 5 + er() * 9;
    embers.set(ei++, x, y, z, (er() - 0.5) * 0.03, 0.02 + er() * 0.05, (er() - 0.5) * 0.03, col[0] * g, col[1] * g, col[2] * g,
      (nearSet ? 0.0025 + er() * 0.004 : 0.01 + er() * 0.014), T.T0 + 0.3 + er() * 2.6, 60, er());
  }
  embers.geo.setDrawRange(0, ei); embers.commit();
  embers.u.uTurb.value = 0.015; embers.u.uTurbF.value = 0.35;
  scene.add(embers.points);

  // ---- the blast (KT): the air explodes upward; fire bursts out of every lawn, tree and roof; debris streaks ----
  const br2 = rng(73), bursts = [];
  for (let i = 0; bursts.length < 1500 && i < 20000; i++) {   // lawns of the Champ de Mars
    const x = (br2() - 0.5) * 190, z = -110 + br2() * 390;
    if (!onLawn(x, z)) continue;
    bursts.push({ x, y: 0.5, z, s: 5 + br2() * 7, birth: T.KT + 0.05 + br2() * 0.8, tile: Math.floor(br2() * 4), rot: br2() * 6.28, hot: 0.6 + br2() * 0.5, up: 0.3 + br2() });
  }
  for (let i = 0, n = 0; n < 420 && i < 8000; i++) {         // a denser field right under the camera's climb
    const a = br2() * Math.PI * 2, rr = 8 + 75 * Math.sqrt(br2()), x = -26 + Math.cos(a) * rr, z = 40 + Math.sin(a) * rr;
    if (!onLawn(x, z) || onBlanket(x, z)) continue;
    bursts.push({ x, y: 0.4, z, s: 3.5 + br2() * 5, birth: T.KT + br2() * 0.5, tile: Math.floor(br2() * 4), rot: br2() * 6.28, hot: 0.8 + br2() * 0.5, up: 0.4 + br2() }); n++;
  }
  for (const t of P.treeList) bursts.push({ x: t.x, y: 7 * t.s, z: t.z, s: (7 + br2() * 4) * t.s, birth: T.KT + br2() * 0.6, tile: Math.floor(br2() * 4), rot: br2() * 6.28, hot: 0.8 + br2() * 0.4, up: 0.5 + br2() });
  for (const s of [-1, 1]) for (let z = -170; z < 640; z += 9) bursts.push({ x: s * (122 + br2() * 20), y: 27 + br2() * 4, z: z + br2() * 6, s: 10 + br2() * 10, birth: T.KT + 0.1 + br2() * 0.7, tile: Math.floor(br2() * 4), rot: br2() * 6.28, hot: 0.6 + br2() * 0.4, up: 0.4 + br2() });
  for (const [x, z, w, h] of P.farList) if (br2() < 0.55) bursts.push({ x, y: h + 3, z, s: 16 + w * 0.6, birth: T.KT + 0.15 + br2() * 0.9, tile: Math.floor(br2() * 4), rot: br2() * 6.28, hot: 0.55 + br2() * 0.4, up: 0.5 + br2() });
  bursts.forEach((b) => { b.k = 0.5 + br2() * 1.1; b.sx = 0.8 + br2() * 0.5; b.ph = br2(); });
  const burstBB = new Billboards(bursts.length, { map: fireballAtlas(9), additive: true, minPx: 1.6, near: 1.0, renderOrder: 6 });
  const capBB = new Billboards(bursts.length, { map: smokeAtlas(13), additive: false, lit: true, minPx: 1.6, near: 1.0, renderOrder: 5 });
  capBB.u.uLitCol.value.setRGB(1.0, 0.42, 0.12); capBB.u.uShadeCol.value.setRGB(0.07, 0.045, 0.035);
  scene.add(burstBB.mesh, capBB.mesh);
  const SN = 5000, streaks = new Streaks(SN, { widthPx: 2.2 });
  for (let i = 0; i < SN; i++) {   // embers and burning debris thrown up, mostly around the camera's climb
    const a = br2() * Math.PI * 2, rr = 6 + 90 * Math.pow(br2(), 1.4), x = -30 + Math.cos(a) * rr, z = 30 + Math.sin(a) * rr * 1.4, y = br2() < 0.3 ? 3 + br2() * 9 : 0.2 + br2() * 1.5;
    const tk = br2(), col = tk < 0.55 ? [1.0, 0.48, 0.14] : [1.0, 0.78, 0.45], g = 5 + br2() * 7;
    streaks.set(i, x, y, z, (br2() - 0.5) * 4, 5 + br2() * 12, (br2() - 0.5) * 4, col[0] * g, col[1] * g, col[2] * g, 0.6 + br2() * 0.9, T.KT + br2() * 2.6, 6, br2());
  }
  streaks.commit(); streaks.u.uAcc.value.set(0, 6, 0); streaks.u.uAccT0.value = T.KT; streaks.u.uTrail.value = 0.035;
  scene.add(streaks.mesh);

  // ---- the tower vaporising: the front falls from the top (fast), the metal at the front boils off as sparks ----
  const VAP0 = 338, VAPL = 348, VAPD = 5.4;
  const vapFront = (t) => (t < T.MELT ? 1e4 : VAP0 - VAPL * Math.pow(clamp((t - T.MELT) / VAPD), 1.35));
  const vapTime = (y) => T.MELT + VAPD * Math.pow(clamp((VAP0 - y) / VAPL), 1 / 1.35);
  const vr = rng(91), VN = 34000, vapor = new Sparks(VN, { minPx: 1.6, maxPx: 30, near: 2 });
  {
    const beams = P.tower.beams, wts = beams.map(([a, b, t]) => a.distanceTo(b) * t), tot = wts.reduce((s, w) => s + w, 0);
    const cum = []; let acc = 0; for (const w of wts) { acc += w / tot; cum.push(acc); }
    const tp = P.tower.root.position;
    for (let i = 0; i < VN; i++) {
      const u = vr(); let k = 0, lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; } k = lo;
      const [a, b, th] = beams[k], s = vr(), p = a.clone().lerp(b, s).add(V((vr() - 0.5) * th, (vr() - 0.5) * th, (vr() - 0.5) * th)).add(tp);
      const rad = V(p.x - tp.x, 0, p.z - tp.z); const rl = rad.length() || 1; rad.multiplyScalar(1 / rl);
      const sp = 6 + vr() * 16, up = 2 + vr() * 10;
      const birth = vapTime(p.y) + (vr() - 0.5) * 0.25;
      const tk = vr(), g = 10 + vr() * 14;
      vapor.set(i, p.x, p.y, p.z, rad.x * sp + (vr() - 0.5) * 8, up, rad.z * sp + (vr() - 0.5) * 8, 1.0 * g, (0.82 + tk * 0.12) * g, (0.62 + tk * 0.2) * g, 0.45 + vr() * 0.7, birth, 1.6 + vr() * 2.0, vr());
    }
    vapor.commit(); vapor.u.uDrag.value = 0.35; vapor.u.uAcc.value.set(0, 9, 0); vapor.u.uAccT0.value = T.MELT; vapor.u.uCool.value = 1; vapor.u.uTurb.value = 3.5; vapor.u.uTurbF.value = 1.3;
    scene.add(vapor.points);
  }

  const glowL = [];
  { const tp = P.tower.root.position, gr = rng(17);
    for (let i = 0; i < 220; i++) glowL.push({ a: gr() * Math.PI * 2, k: gr(), dy: (gr() - 0.5) * 8, s: 5 + gr() * 9, tile: Math.floor(gr() * 4), rot: gr() * 6.28, ph: gr() });
    var towerAt = (y) => { const w = P.tower.Wf(Math.max(y, 0)); return { x: tp.x, z: tp.z, w }; };
  }
  const glowBB = new Billboards(glowL.length, { map: fireballAtlas(21), additive: true, minPx: 1.6, near: 2, renderOrder: 7 });
  scene.add(glowBB.mesh);

  // ---- space + Holmdel ----
  const [day, night, clouds, moonT] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false), loadTex('/engine/tex/moon.jpg')]);
  const SP = makeSpace({ day, clouds, moon: moonT }, P.skyU.tMilky.value);
  const HD = makeHolmdel(R.renderer, tCMB);
  const eng1 = await loadAvatar('Business_Male_02', { env: HD.scene.environment, lod: 512 });
  const eng2 = await loadAvatar('Business_Male_04', { env: HD.scene.environment, lod: 512 });
  HD.scene.add(eng1.root, eng2.root);
  const hdSide = V(-HD.An.z, 0, HD.An.x);                      // horizontal, across the horn's line of sight
  const hdAxis = V(HD.An.z, 0, -HD.An.x);                      // along the horn, from the receiver cab to the reflector
  const cam64 = HD.A.clone().addScaledVector(HD.An, 30).addScaledVector(hdAxis, -3.5).setY(1.35);
  const look64 = HD.A.clone().addScaledVector(hdAxis, -1.2).setY(-0.1);           // level: the scientists stand above the caption line
  const E1 = HD.A.clone().addScaledVector(HD.An, 14).addScaledVector(hdAxis, -0.4).setY(0), E2 = E1.clone().addScaledVector(hdAxis, 1.35).addScaledVector(HD.An, 0.5);
  const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  function poseEngineers(t) {
    const br = (k) => (t * 0.24 + k) % 1, sway = Math.sin(t * 0.45) * 0.25;
    const toCam = (p) => yawTo(p, cam64);
    stand(eng1, { pos: E1, yaw: toCam(E1) - 1.3, look: HD.A.clone().add(V(0, 0.8 + sway, 0)), breath: br(0.1),            // in profile, pointing up at the horn's mouth
      armR: (sh, f, l, u) => { const d = HD.A.clone().sub(sh).normalize(); return { hand: sh.clone().addScaledVector(d, 0.6), pole: sh.clone().addScaledVector(u, -0.6).addScaledVector(l, -0.3), F: d, N: u.clone().negate(), curl: 0.3 }; } });
    stand(eng2, { pos: E2, yaw: toCam(E2) - 0.55, look: E1.clone().add(V(0, 1.62, 0)).lerp(HD.A, 0.25 + 0.2 * Math.sin(t * 0.3)), breath: br(0.6), weight: 0.3,
      armL: (sh, f, l, u) => ({ hand: sh.clone().addScaledVector(u, -0.5).addScaledVector(l, 0.14).addScaledVector(f, 0.12), pole: sh.clone().addScaledVector(l, 0.6).addScaledVector(u, -0.3).addScaledVector(f, -0.3), F: u.clone().negate(), N: l.clone().negate(), curl: 0.5 }) });
  }
  poseEngineers(T.REC);
  await Promise.all(TEX_PENDING);
  document.getElementById('end').style.background = 'rgba(12,13,16,0.8)';   // the end card lets the CMB show through

  // ---- cameras ----
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 12000);
  // space: close over the burning limb, then back to see the air leaving, then the black Sun and its light front
  const spacePath = new CamPath([
    [38.6, V(0.15, 0.32, 2.05), V(-0.3, 1.05, 0.15), 52],
    [41.5, V(0.32, 0.42, 2.85), V(-0.3, 0.9, 0), 48],
    [46.6, V(1.0, 0.72, 5.0), V(-0.55, 1.0, 0), 46],
    [51.5, V(1.3, 0.8, 5.6), V(-0.8, 1.15, 0), 46],
    [57.0, V(1.55, 0.6, 5.3), V(-0.3, 0.55, 0), 44],
  ]);
  {
    spacePath.apply(cam, 48.5);
    const at = (x, y, d) => new THREE.Vector3(x, y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(d).add(cam.position);
    SP.sunGrp.position.copy(at(-0.3, 0.6, 380)); SP.U.uSun.value.copy(SP.sunGrp.position).normalize();
    spacePath.apply(cam, 44);
    SP.moon.position.copy(at(0.52, 0.18, 11));
  }
  // 1964: a slow push from the scientists into the horn's mouth, onto the hiss (the CMB)
  const A = HD.A, An = HD.An;
  const hdPath = new CamPath([
    [57.0, cam64, look64, 46],
    [62.5, A.clone().addScaledVector(An, 20).addScaledVector(hdAxis, -2.0).setY(2.3), A.clone().addScaledVector(hdAxis, -1.5).add(V(0, -0.9, 0)), 43],
    [67.2, A.clone().addScaledVector(An, 7.5).add(V(0, -0.5, 0)), A.clone(), 40],
    [68.4, A.clone().addScaledVector(An, 1.4), A.clone().addScaledVector(An, -1), 38],
    [69.2, A.clone().addScaledVector(An, 0.6), A.clone().addScaledVector(An, -1), 36],
  ]);
  // Paris: the drone glides down to the heroes and ends low behind them, facing the sun (the flash bursts out of it)
  const sunH = V(sunDir.x, 0, sunDir.z).normalize();
  const camT0 = V(H0.x + 2.25, 0.62, H0.z + 1.75);
  const lookT0 = camT0.clone().addScaledVector(sunH, 10 * Math.cos(0.36)).add(V(0, 10 * Math.sin(0.36), 0));
  const approach = new CamPath([
    [3.6, V(-33, 30, 124), V(-12, 46, -170), 46],
    [6.6, V(-25.5, 11, 90), V(-17, 6, -6), 46],
    [9.0, V(C.x, 1.5, C.z).addScaledVector(sunH, -5.2), V(C.x, 1.5, C.z).addScaledVector(sunH, -5.2).addScaledVector(sunH, 9.7).add(V(0, 2.4, 0)), 50],
    [10.8, camT0, lookT0, 52],
  ], { easeOut: true });
  // time slowed: a slow orbit around the frozen picnic (in front of them -> their right -> behind), then the crane up
  const orb = (phiDeg, R, h) => { const ph = THREE.MathUtils.degToRad(phiDeg); return V(C.x + Math.sin(ph) * R, h, C.z + Math.cos(ph) * R); };
  const frozen = new CamPath([
    [10.8, orb(205, 2.7, 0.72), V(C.x, 0.62, C.z), 42],
    [12.6, orb(160, 2.8, 0.8), V(C.x + 0.05, 0.64, C.z), 42],
    [14.4, orb(108, 2.95, 0.9), V(C.x, 0.66, C.z - 0.05), 42],
    [16.1, orb(58, 3.15, 1.02), V(C.x, 0.7, C.z - 0.3), 43],
    [17.6, orb(22, 3.4, 1.3), V(C.x + 0.4, 1.7, C.z - 9), 44],
    [19.4, V(C.x + 1.9, 3.4, C.z + 6.6), V(-9, 62, -120), 47],
    [21.4, V(C.x + 3.2, 7.0, C.z + 10.5), V(-4, 112, -200), 50],
    [24.6, V(C.x + 4.5, 16, C.z + 16), V(-3, 120, -200), 53],
    [27.8, V(-26, 38, 56), V(-4, 40, -160), 56],
    [30.5, V(-50, 80, 10), V(-2, 170, -200), 56],
    [32.5, V(-78, 122, -22), V(0, 290, -200), 56],
    [34.5, V(-98, 134, -28), V(0, 240, -200), 56],
    [36.5, V(-118, 120, -8), V(0, 132, -200), 57],
    [38.6, V(-140, 104, 16), V(0, 40, -200), 58],
  ], { easeIn: false, easeOut: false });
  // an ember storm around the camera's climb from the blast to the white-out (sparks rise past the lens)
  const stN = 22000, storm = new Sparks(stN, { minPx: 1.6, maxPx: 36, near: 0.8 });
  { const sr = rng(606);
    for (let i = 0; i < stN; i++) {
      const tk0 = T.KT + sr() * (T.SPACE - T.KT), c0 = frozen.P.getPoint(clamp(frozen.u(tk0))), a = sr() * Math.PI * 2, rr = 3 + 40 * Math.sqrt(sr());
      const x = c0.x + Math.cos(a) * rr, z = c0.z + Math.sin(a) * rr, rise = 0.5 * 5.5 * (tk0 - T.KT) ** 2 + 7 * (tk0 - T.KT);
      const y = Math.max(1, c0.y - rise + (sr() - 0.5) * 40);
      const tk = sr(), g = 6 + sr() * 8, c = tk < 0.55 ? [1.0, 0.46, 0.13] : tk < 0.9 ? [1.0, 0.7, 0.35] : [1.0, 0.9, 0.7];
      storm.set(i, x, y, z, (sr() - 0.5) * 2, 3 + sr() * 8, (sr() - 0.5) * 2, c[0] * g, c[1] * g, c[2] * g, 0.03 + sr() * 0.07, T.KT + sr() * 0.8, 12, sr());
    }
    storm.commit(); storm.u.uAcc.value.set(0, 5.5, 0); storm.u.uAccT0.value = T.KT; storm.u.uTurb.value = 1.2; storm.u.uTurbF.value = 0.8; storm.u.uCool.value = 0.5;
    scene.add(storm.points); }
  function hookCam(t) {   // the flash-forward: under the vaporising tower, looking up
    const k = t / T.HOOK;
    cam.position.set(-74 + k * 5, 128 + k * 6, -88 + k * 3); cam.fov = 56; cam.updateProjectionMatrix();
    cam.up.set(0, 1, 0); cam.lookAt(-2, 240 - k * 62, -200); cam.updateMatrixWorld();
  }

  // ---- overlay state ----
  function hudAt(t) {
    if (t < T.T0) return { a: 1, lab: 'Light becomes instant in', val: fmtT(T.T0 - t), sub: 'Sunlight needs 8 min 19 s to get here' };
    const v2 = (tt) => 5 - (Math.min(tt, T.REAL) - T.T0) * 0.001;
    if (t < T.SPACE) {
      const sub2 = t > T.MELT ? 'Iron boils at 2,862 °C' : t > T.KT ? '≥ 1 kiloton of TNT per m²' : t > T.AIR ? 'Light from 13.8 billion years ago' : t > T.BIG ? 'Microwaves · shown in false colour' : t > T.STARS ? 'Milky Way light: up to 80,000 years old' : '8 min 19 s of sunlight in 1 instant';
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
  const sunPos = new THREE.Vector3(), _down = new THREE.Vector3(0, -1, 0);
  function frame(t) {
    const story = t < T.HOOK ? 34.5 + t * 0.5 : t;     // the hook flashes forward to the tower boiling away
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.06; U.uContrast.value = 1.06; U.uVignette.value = 0.36; U.uAberr.value = 0.0008; U.uGrain.value = 0;
    let rscene = scene;
    FX.uTime.value = story; FX.uWind.value = Math.min(story, T.T0) * 1.0;
    if (story < T.SPACE) {
      // ---------------- PARIS ----------------
      poseAll(story);
      if (t < T.HOOK) hookCam(t); else if (story < T.T0 + 0.2) approach.apply(cam, story); else frozen.apply(cam, story);
      const after = story - T.T0;
      const kick = story < T.KT ? 0 : Math.exp(-(story - T.KT) * 2.2);              // the blast
      if (kick > 0.001) { cam.rotateZ(Math.sin(story * 31) * 0.006 * kick); cam.rotateX(Math.sin(story * 23 + 1) * 0.005 * kick); cam.updateMatrixWorld(); }
      if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 30; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      // the flash: 8 min 19 s of sunlight in one instant, then normal sunlight on a scorched, burning, frozen world
      const flash = story < T.T0 ? 0 : Math.exp(-Math.max(0, after - 0.22) * 2.6) * smooth(T.T0, T.T0 + 0.1, story);
      const airK = smooth(T.KT - 0.25, T.KT + 0.45, story) * 0.62 + smooth(T.KT, T.MELT + 1.0, story) * 0.38;   // the air ignites with the blast
      const melt = smooth(T.MELT - 0.5, T.SPACE - 0.6, story);
      P.sun.intensity = (3.1 + flash * 24) * (1 - 0.72 * airK); FX.uSunI.value = Math.max(P.sun.intensity, 0.3);
      FX.uScorch.value = story < T.T0 ? 0 : smooth(T.T0 + 0.08, T.T0 + 1.6, story);
      FX.uHeat.value = airK * 0.5 + melt * 0.45 + kick * 0.15;
      const towerHeat = airK * 0.42 + melt * 0.12;                                     // dark red-hot: a silhouette against the sky
      FX.uTowerK.value = clamp(towerHeat / Math.max(FX.uHeat.value, 1e-3), 0, 2);
      FX.uVapor.value = vapFront(story);
      // sky: Milky Way, then the false-colour microwave sky, then the glowing air
      const milky = smooth(T.STARS, T.STARS + 0.9, story) * (1 - smooth(T.BIG + 0.5, T.BIG + 1.7, story));
      const cmbOn = smooth(T.BIG, T.BIG + 0.12, story) * (1 - smooth(T.KT - 0.1, T.KT + 0.7, story));   // the microwave sky, then it burns
      P.skyU.uMilky.value = milky * 1.5; stars.u.uGain.value = milky * 2.4; P.skyU.uDim.value = 1 - Math.max(0.74 * milky, 0.5 * cmbOn);
      P.skyU.uCMB.value = cmbOn; P.skyU.uCMBI.value = 0.85;
      P.skyU.uCMBR.value = lerp(0, 1.12, smooth(T.BIG, T.BIG + 1.9, story));
      P.skyU.uWhite.value = smooth(0, 0.55, airK) * 0.97; P.skyU.uPlasma.value = 1;
      const hot = smooth(T.MELT - 1, T.SPACE, story);
      P.skyU.uWhiteCol.value.set(lerp(lerp(1.3, 2.6, airK), 2.5, hot), lerp(lerp(0.3, 1.0, airK), 0.9, hot), lerp(lerp(0.08, 0.3, airK), 0.28, hot));
      P.skyU.uI.value = 1 + flash * 2.5;
      scene.fog.color.setRGB(lerp(0.81, 1.0, airK), lerp(0.77, lerp(0.42, 0.55, hot), airK), lerp(0.69, lerp(0.14, 0.2, hot), airK));
      scene.fog.density = lerp(0.00042, 0.0008, airK);
      // fire light from below (hemisphere ground colour), and the glowing air from above
      const fire = FX.uScorch.value;
      P.hemi.intensity = 0.5 + fire * 0.35 + airK * 0.4;
      P.hemi.color.setRGB(lerp(0.82, 1.0, airK), lerp(0.88, 0.62, airK), lerp(1.0, 0.36, airK));
      P.hemi.groundColor.setRGB(lerp(0.49, 1.0, fire), lerp(0.42, 0.42, fire), lerp(0.3, 0.14, fire));
      scene.environmentIntensity = 0.5 * (1 - 0.6 * airK);
      R.renderer.toneMappingExposure = 0.58 / (1 + flash * 1.8) / (1 + airK * 0.3) / (1 + kick * 0.5) * (1 - 0.25 * milky);
      R.bloom.strength = 0.3 + flash * 0.9 + fire * 0.15 + kick * 0.4; R.bloom.radius = 0.55; R.bloom.threshold = 0.95 / R.renderer.toneMappingExposure;
      U.uFadeWhite.value = clamp(flash * 1.05 + smooth(T.SPACE - 0.5, T.SPACE, story) * 0.95 + kick * 0.25, 0, 1);
      U.uTint.value.set(lerp(1, 1.05, airK), lerp(1, 0.8, airK), lerp(1, 0.58, airK)); U.uContrast.value = lerp(1.06, 1.16, airK); U.uSat.value = lerp(1.06, 1.22, airK);
      // shadow frustum: wide for the drone, tight on the picnic after the flash, wide again from the blast (both hidden)
      if (story < T.T0) P.setShadow(-24, 0, 42, 110); else if (story < T.KT) P.setShadow(-28, 0, 54, 40); else P.setShadow(-10, 0, -30, 240);
      // the sun's flare: a soft glare before, the starburst at the flash
      sunPos.copy(cam.position).addScaledVector(sunDir, 4500);
      const flareI = story < T.T0 ? 0.35 * smooth(8.2, 9.6, story) : flash * 30 * (1 - smooth(T.T0 + 0.25, T.T0 + 0.6, story)) + (story < T.T0 + 0.6 ? 0 : 0.3 * (1 - smooth(16.5, 17.5, story)));
      flare.update(cam, sunPos, flareI, story < T.T0 + 0.6 ? lerp(0.16, 1.3, Math.min(1, flash)) : 0.16);
      // particles
      const vis = (t0) => story >= t0;
      embers.update(story, cam, PR); embers.u.uAcc.value.set(0, 4.5, 0); embers.u.uAccT0.value = T.KT;
      embers.u.uGain.value = 1 - 0.5 * smooth(T.SPACE - 3, T.SPACE, story);
      vapor.update(story, cam, PR); vapor.points.visible = story > T.MELT; vapor.u.uGain.value = (1 - 0.45 * smooth(35.5, 37.8, story)) * (t < T.HOOK ? 0.75 : 1);
      glowBB.update(cam, PR);
      { const fy = vapFront(story), on = story > T.MELT && fy > -5 ? 1 : 0;
        for (let i = 0; i < glowL.length; i++) {
          if (!on) { glowBB.hide(i); continue; }
          const g = glowL[i], y = Math.max(fy + g.dy, 2), ta = towerAt(y), rr = ta.w * (0.25 + 0.95 * Math.sqrt(g.k));
          const sz = g.s * (0.6 + 0.4 * Math.min(1, ta.w / 20)), gain = 1.3 * (0.6 + 0.4 * Math.sin(g.ph * 6.28 + story * 0.8));
          glowBB.set(i, ta.x + Math.cos(g.a) * rr, y + sz * 0.15, ta.z + Math.sin(g.a) * rr, sz, sz, gain, gain * 0.86, gain * 0.62, 0.35 * smooth(T.MELT, T.MELT + 0.4, story), g.rot + story * 0.05, g.tile);
        }
        glowBB.commit(); }
      streaks.update(story); streaks.mesh.visible = story > T.KT;
      storm.update(story, cam, PR); storm.points.visible = story > T.KT; storm.u.uGain.value = 1 - 0.5 * smooth(36, 38.3, story);
      flameBB.update(cam, PR);
      for (let i = 0; i < flames.length; i++) {
        const f = flames[i], age = story - f.birth;
        if (age <= 0 || story > T.SPACE) { flameBB.hide(i); continue; }
        const g = easeOut(clamp(age / 1.3)), br = 1 + 0.04 * Math.sin(story * 0.6 + f.ph);
        const blast = smooth(T.KT, T.KT + 2.5, story), hh = f.h * g * br * (1 + blast * 2.2), ww = f.w * (0.7 + 0.3 * g) * (1 + blast * 0.4);
        const gain = (f.tree ? 1.0 : 1.05) * f.hot * (1 - 0.35 * airK) * (f.tree ? 1 : lerp(1, 0.5, smooth(12, 45, Math.hypot(f.x - C.x, f.z - C.z))));
        flameBB.set(i, f.x, (f.y ?? LAWN - 0.02), f.z, ww, hh, gain, gain, gain, 0.9 * g, 0, f.tile);
      }
      flameBB.commit();
      smokeBB.update(cam, PR, sunDir);
      const lowCam = 1 - smooth(5, 14, cam.position.y);                               // near smoke reads as blobs from above
      for (let i = 0; i < smokeL.length; i++) {
        const s = smokeL[i], age = story - s.birth;
        if (age <= 0 || lowCam <= 0.001) { smokeBB.hide(i); continue; }
        const g = clamp(age / 4), up = story > T.KT ? 0.5 * 4 * (story - T.KT) ** 2 : 0;
        smokeBB.set(i, s.x, s.y0 + g * s.rise + up, s.z, s.s * (0.45 + 0.8 * g), s.s * (0.45 + 0.8 * g), 0.62, 0.56, 0.5, s.a * smooth(0, 0.6, age) * lowCam, s.rot + age * 0.02, s.tile);
      }
      smokeBB.commit();
      burstBB.update(cam, PR); capBB.update(cam, PR, _down);
      for (let i = 0; i < bursts.length; i++) {
        const b = bursts[i], age = story - b.birth;
        if (age <= 0) { burstBB.hide(i); capBB.hide(i); continue; }
        const g = easeOut(clamp(age / 2.2)), sz = b.s * b.k * (0.3 + 1.3 * g), y = b.y + age * (2.5 + 5 * b.up) + sz * 0.3;
        const gain = 1.8 * b.hot * (1 - 0.3 * hot) * (0.75 + 0.25 * Math.sin(b.ph * 6.28 + story * 0.7));
        const life = 1 - smooth(3.0, 6.0, age);
        burstBB.set(i, b.x, y, b.z, sz * b.sx, sz * (1.1 + 0.5 * g), gain, gain, gain, 0.8 * smooth(0, 0.25, age) * life, b.rot, b.tile);
        const cs = sz * (1.25 + 0.5 * g);
        capBB.set(i, b.x + (b.ph - 0.5) * sz * 0.3, y + sz * (0.45 + 0.35 * g) + age * 2.5 * b.up, b.z, cs, cs, 1, 1, 1, 0.82 * smooth(0.15, 0.8, age) * (1 - smooth(4.0, 7.5, age)), b.rot + 1.3, (b.tile + 1) % 4);
      }
      burstBB.commit(); capBB.commit();
    } else if (t < T.REC) {
      // ---------------- SPACE ----------------
      rscene = SP.scene;
      spacePath.apply(cam, t);
      SP.U.uTime.value = t; SP.U.uHeat.value = 1;
      const sunOn = t < T.NORMAL ? 1 : smooth(T.SUNBACK - 0.05, T.SUNBACK + 0.25, t);
      SP.U.uSunOn.value = sunOn; SP.sunGrp.visible = sunOn > 0.001; SP.sunCore.material.opacity = sunOn; SP.sunHalo.material.opacity = sunOn * 0.85;
      const starsOn = t < T.NORMAL ? 1 : 0;                                          // their light in transit is used up too
      SP.stars.u.uGain.value = 1.5 * starsOn; SP.stars.u.uPR.value = PR; SP.bg.material.uniforms.uI.value = 0.3 * starsOn;
      const real = smooth(T.REAL - 0.5, T.REAL + 1.5, t);
      SP.atmo.material.uniforms.uA.value = 1.3;
      SP.atmo2.scale.setScalar(1.05 + 0.2 * smooth(T.REAL, T.REC, t)); SP.atmo2.material.uniforms.uA.value = 0.3 + 0.35 * real;
      SP.air.update(t, cam, PR); SP.airS.update(t);
      SP.flare.update(cam, SP.sunGrp.position, sunOn * 0.85, 0.2);
      const fk = clamp((t - T.NORMAL) / (T.SUNBACK - T.NORMAL)), Dse = SP.sunGrp.position.length();
      SP.front.visible = t > T.NORMAL && t < T.SUNBACK + 0.3; SP.front.position.copy(SP.sunGrp.position); SP.front.scale.setScalar(Math.max(0.01, Dse * fk));
      SP.front.material.uniforms.uA.value = smooth(T.NORMAL, T.NORMAL + 0.5, t) * (1 - smooth(T.SUNBACK, T.SUNBACK + 0.3, t));
      R.renderer.toneMappingExposure = 0.72; R.bloom.strength = 0.55; R.bloom.radius = 0.6; R.bloom.threshold = 1.0 / 0.72;
      U.uVignette.value = 0.48; U.uSat.value = 1.1; U.uContrast.value = 1.08;
      U.uFadeWhite.value = Math.max(1 - smooth(T.SPACE, T.SPACE + 0.4, t), 0.35 * Math.exp(-Math.abs(t - T.SUNBACK) * 7) * (t > T.SUNBACK - 0.3 ? 1 : 0));
    } else if (t < T.END) {
      // ---------------- HOLMDEL 1964 (reconstruction: golden hour, warm film grade, no grain) ----------------
      rscene = HD.scene;
      FX.uScorch.value = 0; FX.uHeat.value = 0; FX.uWind.value = t; FX.uVapor.value = 1e4; FX.uTowerK.value = 0.95; FX.uTime.value = t;
      poseEngineers(t);
      hdPath.apply(cam, t);
      HD.pigeons.forEach((p) => {
        const k = t - (65.2 + p.i * 0.17);
        if (k <= 0) {
          p.g.position.copy(p.home); p.g.rotation.set(0, p.rot + Math.sin(t * 1.1 + p.i * 2) * 0.3, 0);
          p.wl.rotation.set(0, Math.PI / 2 - 0.1, 0); p.wr.rotation.set(0, -(Math.PI / 2 - 0.1), 0);
        } else {
          const dir = V(hdSide.x * (p.i % 2 ? 1 : -1) * 0.8 - An.x * 0.5, 0, hdSide.z * (p.i % 2 ? 1 : -1) * 0.8 - An.z * 0.5).normalize();
          p.g.position.copy(p.home).addScaledVector(dir, k * 2.2 + k * k * 1.6).add(V(0, k * 2.4 + k * k * 0.6, 0));
          p.g.rotation.set(-0.45, Math.atan2(dir.x, dir.z), 0);
          const sp = smooth(0, 0.15, k), flap = Math.sin(k * Math.PI * 2 * 5.5) * 1.05;
          p.wl.rotation.set(0, (Math.PI / 2 - 0.1) * (1 - sp), flap * sp); p.wr.rotation.set(0, -(Math.PI / 2 - 0.1) * (1 - sp), -flap * sp);
        }
      });
      HD.cmbSph.position.copy(cam.position); HD.cmbSph.material.uniforms.uA.value = smooth(67.9, 68.55, t); HD.cmbSph.material.uniforms.uRot.value = t * 0.02;
      R.renderer.toneMappingExposure = 0.72; R.bloom.strength = 0.22; R.bloom.radius = 0.6; R.bloom.threshold = 0.95 / 0.72;
      U.uSat.value = 0.86; U.uContrast.value = 1.08; U.uTint.value.set(1.05, 0.98, 0.88); U.uVignette.value = 0.62; U.uAberr.value = 0.002;
      U.uShake.value.set(Math.sin(t * 2.3) * 0.0005, Math.sin(t * 1.7 + 1) * 0.0007);   // gate weave (slow: no per-frame jitter)
      U.uFadeWhite.value = 0;
    } else {
      // ---------------- END CARD over the CMB ----------------
      rscene = HD.scene;
      FX.uScorch.value = 0; FX.uHeat.value = 0;
      cam.position.copy(A).addScaledVector(An, 0.6); cam.fov = 36; cam.updateProjectionMatrix(); cam.up.set(0, 1, 0); cam.lookAt(A.clone().addScaledVector(An, -1)); cam.updateMatrixWorld();
      HD.cmbSph.position.copy(cam.position); HD.cmbSph.material.uniforms.uA.value = 1; HD.cmbSph.material.uniforms.uRot.value = t * 0.02;
      R.renderer.toneMappingExposure = 0.6; R.bloom.strength = 0.1; R.bloom.threshold = 2;
      U.uVignette.value = 0.6; U.uFade.value = 0.25;
    }
    R.renderPass.scene = rscene; R.renderPass.camera = cam;
    R.composer.render();

    // ---------------- overlay ----------------
    const coverMode = q.get('cover') === '1';                  // cover image: the title over any frame, no HUD or caption
    const titleA = coverMode ? 1 : t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0;
    const hud = coverMode ? null : hudAt(t);
    const cap = coverMode ? null : captionAt(CAPTIONS, t);
    const endA = smooth(T.END, T.END + 0.5, t);
    const labels = [];
    if (t > T.NORMAL && t < T.REC && !coverMode) {
      const sp = project(SP.sunGrp.position, cam), la = smooth(47.2, 47.6, t) * (1 - smooth(51.6, 52.0, t));
      if (!sp.behind && la > 0) labels.push({ x: sp.x, y: sp.y + 70, a: la, html: 'THE SUN &nbsp;·&nbsp; <b>STILL SHINING</b>' });
      const fk = clamp((t - T.NORMAL) / (T.SUNBACK - T.NORMAL)), D = cam.position.distanceTo(SP.sunGrp.position), th = Math.asin(Math.min(0.999, fk * SP.sunGrp.position.length() / D));
      const ds = SP.sunGrp.position.clone().sub(cam.position).normalize(), de = new THREE.Vector3().sub(cam.position).normalize();
      const ang = ds.angleTo(de), dir = ds.clone().multiplyScalar(Math.sin(ang - th) / Math.sin(ang)).addScaledVector(de, Math.sin(th) / Math.sin(ang)).normalize();
      const rp = project(cam.position.clone().addScaledVector(dir, 50), cam), lb = smooth(47.8, 48.2, t) * (1 - smooth(51.8, 52.2, t));
      if (!rp.behind && !sp.behind && lb > 0 && th < ang) {   // on the ring's left side, away from the glowing planet
        const rho = Math.hypot(rp.x - sp.x, rp.y - sp.y), lx = sp.x - rho * 0.94, ly = sp.y + rho * 0.34;
        labels.push({ x: clamp(lx, 250, W - 250), y: clamp(ly, 380, H - 420), a: lb, html: 'SUNLIGHT &nbsp;·&nbsp; <b>ON ITS WAY</b>' });
      }
    }
    ov.apply({ labels,
      tag: 'WHAT IF &nbsp;·&nbsp; 04', tagA: t < T.END ? 1 : 0,
      title: { html: 'What if light became <span class="k">instant</span> for 5 seconds?', a: titleA, k: 1 },
      hud, caption: cap,
      end: endA > 0 ? { a: endA, title: 'What if light became <span class="k">instant</span> for 5 seconds?', note: '<span class="q">Scarier: the flash, or the black Sun?</span><br><br>Sunlight takes 8 min 19 s to reach you<br>The Big Bang’s glow is all around you, right now' } : null,
    });
  }
  window.EP = { P, cam, you, friend, crowd, SP, HD, THREE, FX, approach, frozen, embers, flames, bursts };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS.map(([a, b, c]) => [a, b, c]) };
}
