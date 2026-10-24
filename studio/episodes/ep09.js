// POST 3 — What if a whale swallowed you? Point of view, worst case: a lunging humpback engulfs you, mouth shut,
// 30 to 40 seconds in the dark, then it surfaces and spits you out. Then the real cases (Cape Cod 2021, Chile 2025).
import * as THREE from 'three';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeIn, easeOut, W, H } from '../engine/core.js';
import { Puffs } from '../engine/assets.js';
import { WATER, waterEnv, Shafts, Snow, makeSeabed, makeRocks, makeKelp, makeSurfaceBelow, makeWaterDome, Bubbles, exhale, FishSchool, waterize } from '../engine/ocean.js';
import { makeHumpback, Zu, UH, UN, WL, HINGE, profiles } from '../engine/whale.js';
import { loadMannequin, TEX_PENDING } from '../engine/elevator.js';
import { makeDiver } from '../engine/diver.js';

// ---------- script: every caption passes the reading rule (render.mjs checks it) ----------
const CAPTIONS = [
  [3.8, 8.0, 'You’re diving off Cape Cod, 14 meters down.'],
  [8.12, 13.42, 'You’re catching lobsters. All you hear is your breathing.'],
  [13.54, 17.5, 'Thousands of tiny fish swirl around you.'],
  [17.62, 20.8, 'Then they scatter. All at once.'],
  [20.92, 25.6, 'Behind you: a 30-tonne humpback, mouth wide open.'],
  [25.72, 30.0, 'Its mouth is open so wide, it can’t see you.'],
  [30.12, 34.3, 'In one gulp: 20 tonnes of water… and you.'],
  [34.42, 38.9, 'Everything goes black. You’re inside its mouth.', { shade: 1 }],
  [39.02, 44.3, 'It squeezes the water out. With you still inside.', { shade: 1 }],
  [44.42, 47.2, 'It’s moving. Up… or down?', { shade: 1 }],
  [47.32, 51.3, 'Then it surfaces… and spits you out.'],
  [51.42, 56.6, 'This isn’t fiction. In 2021, it happened off Cape Cod.', { shade: 1 }],
  [56.72, 62.4, 'A lobster diver spent 30 to 40 seconds in a humpback’s mouth.', { shade: 1 }],
  [62.52, 66.2, 'He survived, and went back to diving.', { shade: 1 }],
  [66.32, 71.6, 'In 2025, a whale engulfed a kayaker in Chile. On camera.', { shade: 1 }],
  [71.72, 75.0, 'Would you go back in the water?'],
];
const TITLE = 'What if a <span class="k">whale</span> swallowed you?';
const DUR = 75.2;
const T = { A: 0, B: 3.7, C: 13.46, D: 20.84, E: 30.06, F: 34.36, G: 38.96, G2: 44.36, H: 47.26, I1: 51.36, I2: 56.66, I3: 62.46, J: 66.26, K: 71.66 };
// story time (seconds of the real event). E runs at 0.45x; the hook replays the last moments of the jaws closing.
const TS_E = 30.7;                  // the jaw tips reach you
const TS_OPEN0 = 28.7, TS_OPEN1 = 30.3, TS_CLOSE0 = 31.15, TS_CLOSE1 = 31.85;
const TS_RISE0 = 41.6, TS_SURF = 45.0, TS_SPIT = 46.4;
const E_RATE = 0.45;
function storyTime(t, id) {
  if (id === 'A') return TS_CLOSE1 - (3.62 - Math.min(t, 3.62)) * 0.483;
  if (t < T.E) return t;
  if (t < T.F) return T.E + (t - T.E) * E_RATE;
  return T.E + (T.F - T.E) * E_RATE + (t - T.F);
}
// exhales (video time); the soundtrack uses the same list
export const BREATHS = [0.6, 2.2, 5.2, 9.9, 14.6, 18.6, 22.3, 24.3, 26.1, 27.7, 29.2, 35.6, 37.4, 39.1, 40.7, 42.2, 43.6, 45.0, 46.2, 49.6, 72.4];
const RED = '#ff3b30';

// ---------- a lobster (Homarus americanus, live colours: olive brown, orange joints) ----------
function makeLobster() {
  const g = new THREE.Group();
  const shell = waterize(new THREE.MeshPhysicalMaterial({ color: '#3a3a1c', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }));
  const joint = waterize(new THREE.MeshStandardMaterial({ color: '#8a4a1c', roughness: 0.5 }));
  const ant = waterize(new THREE.MeshStandardMaterial({ color: '#9a3a1c', roughness: 0.5 }));
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), shell); body.scale.set(0.05, 0.045, 0.1); body.position.set(0, 0.045, 0); g.add(body);
  const rostrum = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 8), shell); rostrum.rotation.x = Math.PI / 2; rostrum.position.set(0, 0.06, 0.11); g.add(rostrum);
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), shell); s.scale.set(0.042 - i * 0.004, 0.03, 0.026); s.position.set(0, 0.04 - i * 0.002, -0.1 - i * 0.04); g.add(s); }
  for (const sd of [1, -1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.1, 10), joint); arm.rotation.set(Math.PI / 2, 0, sd * 0.5); arm.position.set(sd * 0.05, 0.035, 0.12); g.add(arm);
    const claw = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), shell); claw.scale.set(sd > 0 ? 0.04 : 0.032, 0.026, 0.085); claw.position.set(sd * 0.085, 0.035, 0.22); claw.rotation.y = -sd * 0.25; g.add(claw);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 8), joint); tip.rotation.set(Math.PI / 2, 0, 0); tip.position.set(sd * 0.1, 0.035, 0.31); tip.rotation.y = -sd * 0.25; g.add(tip);
    const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push(new THREE.Vector3(sd * (0.02 + u * 0.18), 0.07 + Math.sin(u * 2.4) * 0.09, 0.13 + u * 0.3)); }
    const a = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0025, 5), ant); g.add(a);
    for (let k = 0; k < 4; k++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.08, 6), joint); leg.position.set(sd * 0.06, 0.015, 0.04 - k * 0.03); leg.rotation.z = sd * 1.0; g.add(leg); }
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  const cam = new THREE.PerspectiveCamera(72, W / H, 0.03, 600);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const scene = new THREE.Scene();
  const env = waterEnv(R.renderer); scene.environment = env; scene.environmentIntensity = 0.55;
  scene.add(makeWaterDome().mesh);
  const surf = makeSurfaceBelow(); scene.add(surf.mesh);
  const bed = makeSeabed({ size: 220, seg: 260 }); scene.add(bed.mesh);
  const by = (x, z) => bed.height(x, z);
  // the rocky patch where the lobster hides, and a few more boulders around
  const rockList = [];
  { const r = rng(17);
    const add = (x, z, s, sy, shape) => rockList.push([x, by(x, z) + s * 0.18, z, s, sy, r() * 6.28, shape]);
    add(0.9, -2.6, 0.75, 0.8, 0); add(0.15, -3.1, 0.55, 0.9, 1); add(1.55, -3.4, 0.6, 0.7, 2); add(-0.6, -2.4, 0.4, 0.8, 3); add(1.1, -1.7, 0.3, 0.7, 4);
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 6 + r() * 30; add(Math.cos(a) * d, Math.sin(a) * d - 4, 0.3 + r() * 1.5, 0.6 + r() * 0.4, i % 5); }
  }
  const rocks = makeRocks(rockList); scene.add(rocks.group);
  const lobster = makeLobster(); scene.add(lobster);
  lobster.position.set(0.55, by(0.55, -2.75) + 0.12, -2.75); lobster.rotation.y = 0.5;   // in the gap between two boulders, claws out

  const sun = new THREE.DirectionalLight('#fff3dc', 7.0);
  R.renderer.shadowMap.type = THREE.PCFShadowMap;
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 9; Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 70 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.intensity = 0.55;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#a3d9cf', '#26302a', 0.85); scene.add(hemi);
  const torchL = new THREE.SpotLight('#fff1d8', 0, 14, 0.5, 0.95, 2.0); scene.add(torchL, torchL.target);
  const shafts = new Shafts(72); scene.add(shafts.mesh);
  const snow = new Snow(2000); scene.add(snow.mesh);
  const bubbles = new Bubbles(320); scene.add(bubbles.mesh);
  const fish = new FishSchool(2200, { env }); scene.add(fish.mesh);
  const whale = makeHumpback({ env }); scene.add(whale.group);
  const diver = makeDiver(await loadMannequin('/engine/models/Michelle.glb'), { env }); scene.add(diver.me.root); scene.add(diver.extras);
  // 2025: a small yellow kayak with its paddler (seen from below)
  const kayak = new THREE.Group(); scene.add(kayak);
  { const hullMat = waterize(new THREE.MeshStandardMaterial({ color: '#e0a514', roughness: 0.5 }));
    const darkMat = waterize(new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.7 }));
    const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new THREE.Vector2(0.36 * Math.pow(Math.sin(Math.PI * u), 0.6), (u - 0.5) * 2.8)); }
    const hull = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), hullMat); hull.rotation.x = Math.PI / 2; hull.scale.set(1, 1, 0.42); kayak.add(hull);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 6, 12), darkMat); torso.position.set(0, 0.42, -0.1); kayak.add(torso);
    const headK = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), darkMat); headK.position.set(0, 0.98, -0.1); kayak.add(headK);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.2, 8), darkMat); shaft.rotation.z = 1.2; shaft.position.set(0, 0.55, 0.15); kayak.add(shaft);
    for (const sd of [1, -1]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.46, 0.01), darkMat); bl.position.set(sd * 1.0, 0.55 - sd * 0.42, 0.15); bl.rotation.z = 1.2; kayak.add(bl); }
    kayak.traverse((o) => { if (o.isMesh) { o.castShadow = true; } }); kayak.visible = false; }
  const foam = new Puffs(160, { renderOrder: 9, fogColor: '#9fd0c6', fogNear: 4, fogFar: 40 }); scene.add(foam.mesh);
  // torch beam: a soft additive cone (the water around the beam glows)
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uK: { value: 0 }, uLen: { value: 4.5 } },
    vertexShader: 'varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uK, uLen; varying vec3 vL;
      void main(){ float d = clamp(-vL.y / uLen + 0.5, 0.0, 1.0); float a = exp(-d * 2.6) * smoothstep(0.0, 0.05, d);
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * a * uK, 1.0); }`,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.55, 4.5, 32, 1, true), beamMat); beam.renderOrder = 8; beam.frustumCulled = false; scene.add(beam);

  const look = (pos, tgt, fov = 72, roll = 0) => { cam.up.copy(UP); cam.position.copy(pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(tgt); if (roll) cam.rotateZ(roll); cam.updateMatrixWorld(); };
  const lookDir = (pos, yaw, pitch, fov = 72, roll = 0) => { const d = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); look(pos, pos.clone().add(d), fov, roll); };

  // ---------- the whale's path ----------
  const Y_HOVER = -11.5;                               // you, hovering over the sand lance
  const D0 = V(0.2, Y_HOVER, -2.0);
  const dirW = V(0, 0, -1);                            // it charges from behind you, level
  const qW = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), dirW);
  const mouthPt = V(0, -0.42, Zu(0) - 0.05);           // whale-local point that meets you at TS_E
  const vOf = (ts) => lerp(3.0, 1.35, smooth(TS_E - 0.6, TS_E + 1.0, ts));
  const sOf = (ts) => { const n = 60, a = TS_E, h = (ts - a) / n; let s = 0; for (let i = 0; i < n; i++) { const x0 = a + i * h, x1 = x0 + h, xm = x0 + h / 2; s += h / 6 * (vOf(x0) + 4 * vOf(xm) + vOf(x1)); } return s; };
  const PE = D0.clone().sub(mouthPt.clone().applyQuaternion(qW));
  function whalePose(ts) {
    const p = PE.clone().addScaledVector(dirW, sOf(Math.min(ts, TS_RISE0)));
    const q = qW.clone();
    let gape = smooth(TS_OPEN0, TS_OPEN1, ts) * (1 - smooth(TS_CLOSE0, TS_CLOSE1, ts));
    let inflate = smooth(TS_OPEN1 - 0.4, TS_CLOSE1 - 0.1, ts);
    inflate *= 1 - 0.9 * smooth(T.G - 2.36, T.G2 - 2.36 - 1.0, ts);              // the squeeze (G, in story time)
    let swimAmp = lerp(0.9, 0.35, smooth(TS_E - 1, TS_E + 1, ts)), roll = 0, pitch = 0;
    if (ts > TS_RISE0) {                               // it rises to the surface, nose first
      const k = smooth(TS_RISE0, TS_SURF, ts);
      pitch = 0.62 * k * (1 - smooth(TS_SPIT + 0.8, TS_SPIT + 3.5, ts));
      p.addScaledVector(dirW, (ts - TS_RISE0) * 1.2);
      p.y = lerp(p.y, -2.3, easeInOut(k));
      if (ts > TS_SPIT + 0.8) p.y -= (ts - TS_SPIT - 0.8) * 0.9;              // and sinks away
      swimAmp = 0.6;
    }
    if (ts > TS_SURF) {                                // at the surface: shakes its head, opens, lets you go
      const s = ts - TS_SURF;
      roll = 0.2 * Math.sin(s * 15) * smooth(0, 0.25, s) * (1 - smooth(1.1, 1.9, s));
      gape = 0.12 * smooth(0.0, 0.3, s) + 0.36 * smooth(TS_SPIT - TS_SURF - 0.25, TS_SPIT - TS_SURF + 0.15, s) * (1 - smooth(TS_SPIT - TS_SURF + 1.4, TS_SPIT - TS_SURF + 2.2, s));
      inflate *= 1 - smooth(0.6, 1.6, s);
    }
    q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch, 0, roll)));
    return { p, q, gape, inflate, swim: ts * 2.4, swimAmp, flip: smooth(TS_OPEN0, TS_OPEN1, ts) * (1 - smooth(TS_CLOSE1, TS_CLOSE1 + 2, ts)) };
  }
  const setWhale = (w) => { whale.group.position.copy(w.p); whale.group.quaternion.copy(w.q); whale.group.updateMatrixWorld(true); whale.update(w); };
  const toWorld = (local) => local.clone().applyMatrix4(whale.group.matrixWorld);

  // ---------- the diver's path (B, C, D) ----------
  function diverPos(t) {
    if (t < T.C) { const k = (t - T.B) / (T.C - T.B); return V(lerp(0.45, 0.25, k), -14.0, lerp(1.6, -1.05, easeOut(k))); }
    if (t < T.D) { const k = smooth(T.C, T.D - 0.5, t); return V(0.25 - 0.05 * k, lerp(-14.0, Y_HOVER, k), lerp(-1.05, D0.z, k)); }
    return D0.clone();
  }
  const breathBob = (t) => { let y = 0; for (const b of BREATHS) { const a = t - b; if (a > -2 && a < 3.5) y += (a < 0 ? 0.012 * smooth(-2, 0, a) : 0.012 * (1 - smooth(0, 3.2, a))); } return y; };

  // POV hands (camera space): a gentle sculling motion; per shot offsets
  const hands = (t, kind) => {
    const s1 = Math.sin(t * 1.3), s2 = Math.sin(t * 1.1 + 1);
    const calmL = { p: V(-0.125 + 0.008 * s1, -0.165 + 0.01 * s2, -0.45), f: V(0.0, 0.08, -1).normalize(), n: V(0.85, -0.5, 0).normalize() };
    const calmR = { p: V(0.13 - 0.008 * s2, -0.17 + 0.01 * s1, -0.46), f: V(0.0, 0.08, -1).normalize(), n: V(-0.85, -0.5, 0).normalize() };
    if (kind === 'calm') return { L: calmL, R: calmR };
    if (kind === 'reach') return {   // left hand reaching for the lobster's crevice
      L: { p: V(-0.06 + 0.005 * s1, -0.2, -0.56), f: V(0.0, -0.25, -1).normalize(), n: V(0.35, -0.94, 0).normalize() }, R: calmR };
    if (kind === 'fear') return {    // hands up between you and the whale, palms out, fingers spread
      L: { p: V(-0.14 + 0.008 * s1, -0.15 + 0.008 * s2, -0.46), f: V(-0.05, 0.3, -1).normalize(), n: V(0.75, -0.45, -0.45).normalize() },
      R: { p: V(0.145 - 0.008 * s2, -0.155 + 0.008 * s1, -0.47), f: V(0.05, 0.3, -1).normalize(), n: V(-0.75, -0.45, -0.45).normalize() } };
    if (kind === 'flail') return {
      L: { p: V(-0.17 + 0.04 * Math.sin(t * 7), -0.1 + 0.04 * Math.sin(t * 5.3), -0.4), f: V(-0.3, 0.6 + 0.2 * Math.sin(t * 6), -0.7).normalize(), n: V(0.3, 0.2, -1).normalize() },
      R: { p: V(0.18 + 0.04 * Math.sin(t * 6.1 + 2), -0.11 + 0.04 * Math.sin(t * 4.7), -0.4), f: V(0.3, 0.6 + 0.2 * Math.sin(t * 5.2), -0.7).normalize(), n: V(-0.3, 0.2, -1).normalize() } };
    return null;
  };

  // ---------- shots ----------
  const shots = [['A', 0, T.B, 'mouth'], ['B', T.B, T.C, 'dive'], ['C', T.C, T.D, 'dive'], ['D', T.D, T.E, 'dive'], ['E', T.E, T.F, 'mouth'],
    ['F', T.F, T.G, 'inside'], ['G', T.G, T.G2, 'inside'], ['G2', T.G2, T.H, 'inside'], ['H', T.H, T.I1, 'surface'],
    ['I1', T.I1, T.I2, 'recon'], ['I2', T.I2, T.I3, 'recon'], ['I3', T.I3, T.J, 'recon'], ['J', T.J, T.K, 'recon'], ['K', T.K, DUR + 1, 'dive']]
    .map(([id, t0, t1, kind]) => ({ id, t0, t1, kind }));
  const shotAt = (t) => shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1];

  // fish: the sand lance school (world positions), personal space around you, never inside the whale
  const fishCenter = (t) => diverPos(Math.min(t, T.D)).add(V(0.2, 0.4, -0.6));
  function fishPos(i, f, t) {
    if (t < T.C - 1.5 || t > T.E + 0.5) return null;
    const c = fishCenter(t);
    const R = 1.0 + f.r * 3.2, h = (f.h - 0.5) * 3.2;
    const om = 0.38 + 0.25 * (1 - f.r);
    const a = f.a + om * t + 0.15 * Math.sin(t * 0.7 + f.ph);
    let p = V(Math.cos(a) * R, h + 0.3 * Math.sin(t * 0.9 + f.ph * 2), Math.sin(a) * R).add(c);
    // arrival: they stream in from the front-left
    const arr = smooth(T.C - 1.5 + f.e * 1.2, T.C + 1.2 + f.e * 1.2, t);
    p.lerp(c.clone().add(V(-8 - f.r * 6, 1 + h, -12 - f.h * 6)), 1 - arr);
    // scatter: all at once, away from the whale's line, fast
    const sc = Math.max(0, t - (17.62 + f.tw * 0.25));
    if (sc > 0) { const out = p.clone().sub(c); out.y *= 0.4; out.z -= 1.5; out.normalize(); p.addScaledVector(out, 6 * sc * sc + 2 * sc); }
    return p;
  }
  // whale envelope in its own frame (sections from the profiles, swollen by the pouch): pushes fish out
  const envDist = (pl, inflate) => {
    const u = 0.36 - pl.z / WL; if (u < -0.05 || u > 1.05) return 1;
    const uu = clamp(u, 0, 1), Wd = profiles.WID(uu) * (1 + 0.45 * inflate) + 0.15, Tp = profiles.TOP(uu) + 0.15, Bt = profiles.BOT(uu) * (1 + 1.2 * inflate * (uu < UN ? 1 : 0)) - 0.15;
    const yc = (Tp + Bt) / 2, hh = (Tp - Bt) / 2;
    return Math.hypot(pl.x / Wd, (pl.y - yc) / hh) - 1;   // < 0 inside
  };

  function frame(t, opts = {}) {
    const shot = shotAt(t), id = shot.id;
    const k = clamp((t - shot.t0) / (shot.t1 - shot.t0)), dk = easeInOut(k);
    const st = { tag: 'WHAT IF &nbsp;·&nbsp; 03', tagA: 1, labels: [] };
    let sat = 1.0, tint = [1.0, 1.0, 1.0], vignette = 0.5, aberr = 0.0012, fadeW = 0, fadeB = 0, shake = 0, scan = 0, exposure = 1.0, contrast = 1.05;
    const ts = storyTime(t, id);
    WATER.wTime.value = t;
    WATER.wInside.value = 0; WATER.wInScat.value = 1; WATER.wScatK.value = 1;
    sun.intensity = 7.0; hemi.intensity = 0.85; torchL.intensity = 0; beamMat.uniforms.uK.value = 0; sun.shadow.intensity = 0.6;
    const openK = whalePose(ts).gape;
    for (const m of [whale.mats.matRoof, whale.mats.matBaleen, whale.mats.matFringe]) { m.userData.wAmb.value = 0.2 + 0.8 * openK; m.userData.wDir.value = 0.15 + 0.85 * openK; }
    whale.mats.matPouch.userData.wInner.value = 0.15 + 0.75 * openK; whale.mats.matPouch.userData.wInnerDir.value = 0.1 + 0.9 * openK;
    whale.group.visible = true; diver.me.root.visible = true; fish.mesh.visible = true; lobster.visible = true;
    let povKind = null, torchOn = false;

    // ---------------- whale ----------------
    const w = whalePose(ts); setWhale(w);
    const open = w.gape;

    // ---------------- camera ----------------
    if (shot.kind === 'dive' && id !== 'K') {
      const p = diverPos(t); p.y += breathBob(t);
      if (id === 'B') {
        const yaw = -0.05 + 0.05 * Math.sin(t * 0.21), pitch = lerp(-0.42, -0.62, smooth(9, 13, t));
        lookDir(p, yaw + 0.08 * smooth(9, 13, t), pitch, 72, 0.02 * Math.sin(t * 0.5));
        povKind = t > 9.8 ? 'reach' : 'calm';
      } else if (id === 'C') {
        const yaw = lerp(0.08, -0.9, easeInOut(smooth(T.C, T.D, t))), pitch = lerp(-0.45, 0.12, smooth(T.C, 16.5, t)) - 0.15 * smooth(17.6, 19.5, t);
        lookDir(p, yaw, pitch, 74, 0.03 * Math.sin(t * 0.6));
        povKind = 'calm';
      } else if (id === 'D') {
        // you turn around: it is coming at you out of the green
        const turn = easeInOut(smooth(T.D, T.D + 1.4, t));
        const wm = toWorld(V(0, -0.3, Zu(0.05)));
        const fwd0 = V(Math.sin(-0.9), -0.15, -Math.cos(-0.9)).normalize();
        const toW = wm.clone().sub(p).normalize();
        const dir = fwd0.clone().lerp(toW, turn).normalize();
        const back = smooth(27.5, T.E, t) * 0.25;   // you push back, too late
        p.addScaledVector(toW, -back);
        look(p, p.clone().add(dir), 72, 0.04 * Math.sin(t * 1.7) * smooth(T.D, T.D + 1, t));
        shake = 0.002 + 0.004 * smooth(26, T.E, t);
        povKind = 'fear';
      }
    } else if (id === 'K') {
      whale.group.visible = false;
      const p = V(0.4, -14.0 + breathBob(t), lerp(1.4, 0.9, k));
      lookDir(p, -0.05 + 0.03 * Math.sin(t * 0.3), -0.45, 72, 0.02 * Math.sin(t * 0.5));
      povKind = 'calm';
    } else if (shot.kind === 'mouth') {
      // E and the hook: you are pulled into the mouth; then you see the light shrink between the jaws
      const inside = V(0, -0.5, Zu(0.19));
      const tIn0 = TS_E - 0.05, tIn1 = TS_E + 0.75;
      const pDiver = D0.clone().addScaledVector(dirW, -0.25 * smooth(27.5, TS_E, ts));
      const pIn = toWorld(inside);
      const p = pDiver.clone().lerp(pIn, easeInOut(smooth(tIn0, tIn1, ts)));
      p.y += 0.01 * Math.sin(ts * 9);
      const tgtOut = toWorld(V(0, -0.15, Zu(0) + 0.6));
      const tgtMouth = toWorld(V(0, -0.6, Zu(0.1)));
      const tgtUp = toWorld(V(0.85, 0.1, Zu(0.17)));          // the baleen racing past overhead
      let tgt;
      if (id === 'A') tgt = tgtMouth.clone().lerp(tgtOut, smooth(tIn0 + 0.25, TS_CLOSE0 + 0.2, ts));
      else tgt = tgtMouth.clone().lerp(tgtUp, smooth(tIn0 + 0.1, tIn1, ts)).lerp(tgtOut, smooth(TS_CLOSE0 - 0.1, TS_CLOSE0 + 0.4, ts));
      look(p, tgt, 74, 0.08 * Math.sin(ts * 3.1) * smooth(tIn0, tIn1, ts));
      shake = 0.006 + 0.006 * smooth(tIn0, tIn1, ts);
      povKind = 'flail';
      // inside the closing mouth the water is dark; light only comes in through the gap at the front
      if (ts > tIn0) {
        WATER.wInside.value = 1;
        const tip = toWorld(V(0, 0.0, Zu(0))), chin = whale.info.g2.attributes.position;
        const iC = 0; const chinP = toWorld(V(chin.getX(iC), chin.getY(iC), chin.getZ(iC)));
        const nrm = whale.group.localToWorld(V(0, 0, 1)).sub(whale.group.position).normalize();
        const along = chinP.clone().sub(tip); const n2 = nrm.clone().addScaledVector(along.clone().normalize(), -nrm.dot(along.clone().normalize())).normalize();
        WATER.wGap.value.set(n2.x, n2.y, n2.z, -n2.dot(tip));
        WATER.wInScat.value = 0.05 + 0.55 * open;
        const amb = 0.06 + 0.6 * open;
        for (const m of [whale.mats.matRoof, whale.mats.matBaleen, whale.mats.matFringe]) m.userData.wAmb.value = amb;
        whale.mats.matPouch.userData.wInner.value = amb * 0.6;
        hemi.intensity = 0.85 * (0.3 + 0.7 * open);
      }
      if (id === 'A') { fadeB = smooth(3.45, 3.62, t); }
      if (id === 'E') { fadeB = smooth(TS_CLOSE1 - 0.08, TS_CLOSE1 + 0.02, ts); }
    } else if (shot.kind === 'inside') {
      // mouth shut: pitch dark, your light on; it squeezes, then rises
      const c0 = V(0, -0.5, Zu(0.19));
      const squeeze = smooth(T.G - 2.36, T.G2 - 2.36, ts);
      const pl = c0.clone().add(V(0.04 * Math.sin(t * 1.3), -0.05 * squeeze + 0.03 * Math.sin(t * 2.1), 0.05 * Math.sin(t * 0.9)));
      const p = toWorld(pl);
      let tl;
      if (id === 'F') tl = V(lerp(0.1, 0.9, smooth(36.2, 38.6, t)), lerp(-0.75, -0.3, smooth(36.2, 38.6, t)), Zu(0.12));
      else if (id === 'G') tl = V(lerp(0.9, -0.2, smooth(T.G, 40.5, t)), lerp(-0.3, -1.4, smooth(T.G, 40.8, t)), Zu(0.15));
      else tl = V(0.0, -0.4, Zu(0.05));
      look(p, toWorld(tl), 74, 0.05 * Math.sin(t * 1.1));
      shake = id === 'G' ? 0.004 + 0.004 * squeeze : id === 'G2' ? 0.006 : 0.003;
      fadeB = id === 'F' ? 1 - smooth(T.F + 0.55, T.F + 0.75, t) : 0;
      WATER.wInside.value = 1; WATER.wGap.value.set(0, 1, 0, 1e5); WATER.wInScat.value = 0.0;
      for (const m of [whale.mats.matRoof, whale.mats.matBaleen, whale.mats.matFringe]) m.userData.wAmb.value = 0.06;
      whale.mats.matPouch.userData.wInner.value = 0.04;
      sun.intensity = 0; hemi.intensity = 0.25;
      torchOn = t > T.F + 0.62; povKind = 'torch'; exposure = 0.85;
      fish.mesh.visible = false; lobster.visible = false;
    } else if (shot.kind === 'surface') {
      // at the surface: the jaws part, light pours in, it shakes its head... you are thrown out, then you are in the
      // bright water just under the surface, right beside its head as it sinks away
      const tsE0 = TS_SPIT - 0.05, tsE1 = TS_SPIT + 0.32;
      if (ts < tsE0) {
        const pl = V(0.04 * Math.sin(t * 1.3), -0.28 + 0.03 * Math.sin(t * 2.1), Zu(0.19));
        const p = toWorld(pl);
        look(p, toWorld(V(0, -0.12, Zu(0) + 0.5)), 74, 0.04 * Math.sin(t * 1.9));
        WATER.wInside.value = 1;
        const tip = toWorld(V(0, 0, Zu(0))), nrm = whale.group.localToWorld(V(0, 0, 1)).sub(whale.group.position).normalize();
        WATER.wGap.value.set(nrm.x, nrm.y, nrm.z, -nrm.dot(tip));
        WATER.wInScat.value = 0.05 + 1.4 * open;
        const amb = 0.05 + 1.3 * open;
        for (const m of [whale.mats.matRoof, whale.mats.matBaleen, whale.mats.matFringe]) m.userData.wAmb.value = amb;
        whale.mats.matPouch.userData.wInner.value = amb * 0.7;
        hemi.intensity = 0.85 * (0.15 + open);
        shake = 0.008; povKind = 'flail';
        torchOn = true;
      } else if (ts < tsE1) {
        look(toWorld(V(0, -0.3, Zu(0) + 1.2)), toWorld(V(0, 1.5, Zu(0) + 4)), 80, 0.6 * (ts - tsE0));
        diver.me.root.visible = false;
      } else {
        const w0 = whalePose(TS_SPIT);
        const head = V(0, 0, Zu(0.12)).applyQuaternion(w0.q).add(w0.p);
        const p = V(head.x + 2.7, -1.25 + 0.05 * Math.sin(t * 1.7), head.z + 1.4);
        const eyeL = whale.parts.eye.userData.p; const eye = toWorld(V(-eyeL.x, eyeL.y, eyeL.z));
        const up = p.clone().add(V(0.4, 3, -1.2));
        const tgt = eye.clone().lerp(up, smooth(TS_SPIT + 2.2, TS_SPIT + 3.6, ts));
        look(p, tgt, 76, 0.25 * Math.sin(ts * 1.6) * (1 - smooth(tsE1, tsE1 + 1.5, ts)));
        shake = 0.006 * (1 - smooth(tsE1, tsE1 + 1.2, ts));
        povKind = 'flail';
      }
      fadeW = smooth(tsE0, TS_SPIT + 0.1, ts) * (1 - smooth(TS_SPIT + 0.22, TS_SPIT + 0.6, ts)) * 0.95;
      fish.mesh.visible = false; exposure = 0.92;
    } else if (shot.kind === 'recon') {
      scan = 1.0; sat = 0.85; tint = [1.02, 1.0, 0.97]; aberr = 0.004; vignette = 0.7; contrast = 1.1; exposure = id === 'I1' ? 0.95 : 0.78;
      fish.mesh.visible = false; lobster.visible = id === 'I1';
      if (id === 'I1') {
        // the diver over the rocks, the whale charging out of the green; cut before the jaws reach him
        const tsr = lerp(28.3, TS_E - 0.32, k); const wr = whalePose(tsr); setWhale(wr);
        const dp = D0.clone().add(V(0, 0.02 * Math.sin(t * 1.4), 0));
        const fw = diver.third(dp, V(0, 0.85, 0.52).normalize(), t, { belly: V(0, -0.5, 0.85).normalize(), kick: 0.5 });
        const hl = dp.clone().addScaledVector(fw.up, 0.45).addScaledVector(fw.fwd, 0.38).addScaledVector(fw.lat, 0.2);
        const hr = dp.clone().addScaledVector(fw.up, 0.45).addScaledVector(fw.fwd, 0.38).addScaledVector(fw.lat, -0.2);
        diver.third(dp, V(0, 0.85, 0.52).normalize(), t, { belly: V(0, -0.5, 0.85).normalize(), kick: 0.5, handL: hl, handR: hr });
        const mw = toWorld(V(0, -0.4, Zu(0.1))); const lean = mw.clone().sub(dp); const dl = lean.length();
        const mid = dp.clone().addScaledVector(lean.normalize(), Math.min(0.9, dl * 0.3));
        look(dp.clone().add(V(lerp(1.9, 1.6, dk), lerp(0.85, 0.75, dk), lerp(-4.9, -4.4, dk))), dp.clone().add(V(-0.2, 0.15, 3.0)), 54);   // behind him, the mouth coming at us both
        st.labels.push({ x: W * 0.5, y: H * 0.115, a: 1, html: 'RECONSTRUCTION &nbsp;·&nbsp; 11 JUNE 2021' });
      } else if (id === 'I2') {
        // from below: the whale rising to the surface, mouth shut, throat swollen
        const tsr = lerp(41.7, 44.7, k); const wr = whalePose(tsr); setWhale(wr);
        diver.me.root.visible = false;
        const head = toWorld(V(0, 0, Zu(0.2)));
        const cp = V(head.x + 3.5, Math.max(by(head.x + 3.5, head.z - 7) + 1.5, head.y - 7.5), head.z - 7);
        look(cp, head.clone().add(V(0, 0.4, 1.0)), 52);
        st.labels.push({ x: W * 0.5, y: H * 0.115, a: 1, html: 'RECONSTRUCTION &nbsp;·&nbsp; 11 JUNE 2021' });
      } else if (id === 'I3') {
        // at the surface it shakes its head and he drops out of its mouth
        const tsr = lerp(TS_SPIT - 0.7, TS_SPIT + 1.7, k); const wr = whalePose(tsr); setWhale(wr);
        const wS = whalePose(TS_SPIT + 0.05);
        const exitW = V(0, -0.3, Zu(0) + 1.3).applyQuaternion(wS.q).add(wS.p);           // already clear of the jaws
        const away = V(0, 0, Zu(0)).applyQuaternion(wS.q).setY(0).normalize();
        const sOut = Math.max(0, tsr - TS_SPIT - 0.05);
        diver.me.root.visible = sOut > 0;
        if (sOut > 0) {
          const dp = exitW.clone().addScaledVector(away, 1.3 * sOut).add(V(0.5 * sOut, -1.0 * sOut - 0.5 * sOut * sOut, 0));
          dp.y = Math.min(dp.y, -0.9);
          const tumble = new THREE.Quaternion().setFromEuler(new THREE.Euler(sOut * 1.6, sOut * 0.7, sOut * 1.1));
          diver.third(dp, V(0, 1, 0), t, { belly: V(0, 0, 1), kick: 1.4, tumble });
        }
        const head = toWorld(V(0, 0, Zu(0.1)));
        const ex = V(0, -0.3, Zu(0) + 1.3).applyQuaternion(whalePose(TS_SPIT + 0.05).q).add(whalePose(TS_SPIT + 0.05).p);
        look(V(ex.x + 3.0, Math.min(ex.y - 3.6, -2.5), ex.z - 3.8), ex.clone().add(V(0.3, -0.9, 0.2)), 58);
        st.labels.push({ x: W * 0.5, y: H * 0.115, a: 1, html: 'RECONSTRUCTION &nbsp;·&nbsp; 11 JUNE 2021' });
      } else if (id === 'J') {
        // 2025: a lunge up under a kayak; the surface explodes, the kayak is gone, then it bobs back up
        diver.me.root.visible = false; kayak.visible = true;
        const KP = V(9, 0, 22);
        const headY = lerp(-4.4, -1.15, easeOut(smooth(0.0, 0.4, k))) + 1.75 * smooth(0.43, 0.5, k) * (1 - smooth(0.56, 0.66, k)) - 3.8 * easeIn(smooth(0.62, 1.0, k));
        const pitch = 0.78;
        const q = qW.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch, 0, 0)));
        const tip = V(0, 0, Zu(0)).applyQuaternion(q);
        const pW = V(KP.x + 0.4, headY, KP.z).sub(tip);
        setWhale({ p: pW, q, gape: smooth(0.12, 0.38, k) * (1 - smooth(0.55, 0.75, k)), inflate: smooth(0.3, 0.6, k), swim: t * 2.4, swimAmp: 0.7, flip: 0.4 });
        const burst = smooth(0.42, 0.48, k) * (1 - smooth(0.62, 0.9, k));
        kayak.position.set(KP.x + 1.6 * burst + 1.4 * smooth(0.45, 0.62, k), 0.05 * Math.sin(t * 2.1) + 0.25 * burst, KP.z + 0.6 * burst); kayak.rotation.set(0.05 * Math.sin(t * 1.7) + 0.5 * burst, 0.4, 0.06 * Math.sin(t * 1.3) - 0.35 * burst);
        kayak.visible = k < 0.425 || k > 0.62;            // inside the white water it is gone from sight
        const r = rng(611);
        for (let i = 0; i < foam.n; i++) {
          const a = r() * 6.28, d = 0.3 + r() * 3.2, life = (t * 0.8 + r()) % 1;
          const amt = smooth(0.42, 0.5, k) * (1 - smooth(0.7, 1.0, k) * 0.7);
          foam.set(i, KP.x + Math.cos(a) * d, -0.15 - r() * 0.5 - life * 0.3, KP.z + Math.sin(a) * d, 0.6 + r() * 1.4, amt * (0.35 + 0.4 * r()) * (1 - life * 0.5), 0.93, 0.97, 0.96, r() * 6);
        }
        foam.commit();
        look(V(KP.x + 3.5, -8.0, KP.z - 7.0), V(KP.x, -1.6, KP.z), 56);
        st.labels.push({ x: W * 0.5, y: H * 0.115, a: 1, html: 'RECONSTRUCTION &nbsp;·&nbsp; 8 FEBRUARY 2025' });
      }
    }
    if (id !== 'J') { kayak.visible = false; for (let i = 0; i < foam.n; i++) foam.set(i, 0, 0, 0, 0, 0); foam.commit(); }

    // ---------------- diver (POV arms) ----------------
    if (povKind && shot.kind !== 'recon') {
      let hd;
      if (povKind === 'torch') {
        const s1 = Math.sin(t * 1.7), s2 = Math.sin(t * 1.3 + 1);
        hd = { R: { p: V(0.11 + 0.01 * s1, -0.15 + 0.01 * s2, -0.42), f: V(0.1, 0.05, -1).normalize(), n: V(-0.7, -0.7, 0).normalize() },
          L: id === 'G' ? { p: V(-0.13, -0.2 - 0.04 * smooth(T.G, 41, t), -0.44), f: V(0.05, -0.45, -1).normalize(), n: V(0.3, -0.95, 0.2).normalize() }
            : { p: V(-0.14 + 0.015 * s2, -0.13, -0.42), f: V(-0.2, 0.5, -0.8).normalize(), n: V(0.25, 0.2, -1).normalize() } };
        if (id === 'G') {
          const want = V(-0.13, -0.42, -0.42).applyQuaternion(cam.quaternion).add(cam.position);
          const pl = whale.group.worldToLocal(want.clone()); const cv = whale.info.cavity(pl.x, pl.z);
          if (cv && cv.floorY !== null) {
            pl.y = Math.max(pl.y, cv.floorY + 0.075) * smooth(T.G, T.G + 1.2, t) + pl.y * (1 - smooth(T.G, T.G + 1.2, t));
            const pw = toWorld(pl).sub(cam.position).applyQuaternion(cam.quaternion.clone().invert());
            if (pw.length() < 0.62) hd.L = { p: pw, f: V(0.1, -0.15, -1).normalize(), n: V(0.15, -1, 0.1).normalize() };
          }
        }
      } else hd = hands(t, povKind);
      const curl = povKind === 'fear' ? 0.3 : povKind === 'flail' ? 0.22 : povKind === 'torch' ? 0.45 : 0.35, spread = povKind === 'fear' ? 0.35 : povKind === 'flail' ? 0.6 : 0.3;
      diver.pov(cam, { L: hd.L, R: hd.R, torchOn, curlL: curl, curlR: povKind === 'torch' ? 0.75 : curl, spread });
      const depth = -cam.position.y;
      diver.drawScreen(Math.max(0, depth), 23 + Math.floor(ts / 60), id === 'G2');
      if (torchOn) {
        const lens = diver.torchLens(), dir = V(0, 0, 1).applyQuaternion(diver.torch.getWorldQuaternion(new THREE.Quaternion())).normalize();
        torchL.intensity = id === 'G' ? lerp(2.6, 1.1, smooth(T.G, T.G + 3.5, t)) : id === 'G2' ? 2.2 : id === 'H' ? 2.0 : 3.2; torchL.position.copy(lens); torchL.target.position.copy(lens.clone().addScaledVector(dir, 2)); torchL.target.updateMatrixWorld();
        beamMat.uniforms.uK.value = 0.008; beam.position.copy(lens.clone().addScaledVector(dir, 2.25)); beam.quaternion.setFromUnitVectors(V(0, -1, 0), dir);
      }
    } else diver.me.root.visible = shot.kind === 'recon' ? diver.me.root.visible : false;

    // ---------------- water life (after the camera: every frame depends on t alone) ----------------
    const surfaceY = 0;
    shafts.update(cam.position, surfaceY);
    shafts.mat.uniforms.uGain.value = shot.kind === 'inside' ? 0 : 1;
    snow.update(t, cam.position, { alpha: shot.kind === 'inside' ? 1.4 : 1 });
    snow.mat.uniforms.uTorch.value = torchOn ? 1.6 : 0;
    if (torchOn) { snow.mat.uniforms.uTorchPos.value.copy(torchL.position); snow.mat.uniforms.uTorchDir.value.copy(torchL.target.position.clone().sub(torchL.position).normalize()); }
    snow.mat.uniforms.uLight.value = shot.kind === 'inside' ? 0.0 : 1.0;
    // exhaled bubbles: from beside your mouth, rising past the mask
    bubbles.begin();
    if (shot.kind !== 'recon') {
      const camUp = V(0, 1, 0).applyQuaternion(cam.quaternion), camRight = V(1, 0, 0).applyQuaternion(cam.quaternion), camF = V(0, 0, -1).applyQuaternion(cam.quaternion);
      const mouth = cam.position.clone().addScaledVector(camUp, -0.09).addScaledVector(camF, 0.02);
      for (const b of BREATHS) {
        const age = id === 'A' ? (t - b) * 0.3 : t - b;
        exhale(bubbles, mouth, age, Math.round(b * 100), { up: V(0, 1, 0), side: camRight });
      }
    }
    if (id === 'H' && ts > TS_SPIT + 0.3) {               // the splash: a cloud of air around you
      const w0 = whalePose(TS_SPIT); const head = V(0, 0, Zu(0.12)).applyQuaternion(w0.q).add(w0.p);
      const sp = V(head.x + 2.5, -1.0, head.z + 1.6), r = rng(4401), age0 = ts - TS_SPIT - 0.3;
      for (let i = 0; i < 170; i++) {
        const a = age0 - r() * 0.25, sz = 0.004 + Math.pow(r(), 2) * 0.03, dx = (r() - 0.5) * 1.6, dy = (r() - 0.5) * 1.2, dz = (r() - 0.5) * 1.6;
        if (a < 0) continue;
        const rise = 0.3 * a + 0.5 * a * a * (0.5 + sz * 18);
        bubbles.put(sp.x + dx * (1 + a * 0.3), Math.min(-0.05, sp.y + dy + rise), sp.z + dz * (1 + a * 0.3), sz, Math.min(1, (2.6 - a) * 1.5) * 0.9, r() * 6);
      }
    }
    if (shot.kind === 'inside' || shot.kind === 'mouth' || (id === 'H' && ts < TS_SPIT)) {
      for (let i = 0; i < bubbles.used; i++) {
        const pw = V(bubbles.off.array[i * 3], bubbles.off.array[i * 3 + 1], bubbles.off.array[i * 3 + 2]);
        const pl = whale.group.worldToLocal(pw.clone()); const cv = whale.info.cavity(pl.x, pl.z);
        if (cv && cv.roofY !== null && pl.y > cv.roofY - 0.03 - bubbles.size.array[i]) { pl.y = cv.roofY - 0.03 - bubbles.size.array[i]; const q = toWorld(pl); bubbles.off.array.set([q.x, q.y, q.z], i * 3); }
      }
    }
    bubbles.end();
    bubbles.mat.uniforms.uLight.value = shot.kind === 'inside' ? 0.35 : 1;
    // fish
    if (fish.mesh.visible) {
      const keep = [[cam.position, 0.75]];
      fish.update(t, (i, f, tt) => {
        const p = fishPos(i, f, tt); if (!p) return null;
        const pl = whale.group.worldToLocal(p.clone()); const e = envDist(pl, w.inflate);
        if (e < 0.25) { const u = clamp(0.36 - pl.z / WL, 0, 1); const yc = (profiles.TOP(u) + profiles.BOT(u)) / 2; const d = V(pl.x, pl.y - yc, 0).normalize(); pl.addScaledVector(d, (0.25 - e) * 2.2); return toWorld(pl); }
        return p;
      }, { keepAway: keep, visible: id === 'D' ? 1 - smooth(T.D, T.D + 2.5, t) * 0.92 : 1 });
    }

    // ---------------- HUD ----------------
    const hud = (lab, val, sub, valColor = '') => { st.hud = { a: 1, lab, val, sub, sub2: '', valColor }; };
    const inside = Math.max(0, (ts - TS_CLOSE1) * 3);
    const timer = (s) => `0:${String(Math.floor(s)).padStart(2, '0')}`;
    if (id === 'B') hud('Depth', '14 m', 'Cape Cod, Massachusetts');
    else if (id === 'D') { hud('Humpback whale', '30 t', '14 m long · 11 km/h'); st.hud.a = smooth(T.D + 1.2, T.D + 1.8, t); }
    else if (id === 'E') hud('In one gulp', '≈ 20 t', 'of water · 70% of its weight');
    else if (id === 'F' || id === 'G' || id === 'G2') { hud('Inside the mouth', timer(inside), `Depth ${Math.max(0, Math.round(-cam.position.y))} m · shown 3× fast`, RED); st.hud.a = smooth(T.F + 0.8, T.F + 1.3, t); }
    else if (id === 'H') { hud('Time inside', timer(Math.min(inside, 38)), 'Then it lets go', RED); }
    else if (id === 'I1') hud('Michael Packard', '2021', 'Lobster diver · Provincetown');
    else if (id === 'I2') hud('Inside the mouth', '30–40 s', 'His own estimate');
    else if (id === 'I3') hud('He survived', 'Bruised', 'Dislocated knee, no broken bones');
    else if (id === 'J') hud('Adrián Simancas, 24', '2025', 'Strait of Magellan, Chile');
    if (t < 3.6) st.title = { html: TITLE, a: 1 - smooth(3.2, 3.55, t), k: 1 };
    const c = captionAt(CAPTIONS, t); if (c) st.caption = c;
    if (opts.cover) { st.title = { html: TITLE, a: 1, k: 1 }; st.caption = null; st.hud = null; st.labels = []; }

    // ---------------- grade ----------------
    R.renderer.toneMappingExposure = exposure;
    R.bloom.strength = 0.22; R.bloom.radius = 0.5; R.bloom.threshold = 0.92;
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uSat.value = sat; U.uTint.value.set(...tint); U.uVignette.value = vignette; U.uAberr.value = aberr; U.uFade.value = fadeB; U.uFadeWhite.value = fadeW;
    U.uTunnel.value = 0; U.uScan.value = scan; U.uContrast.value = contrast;
    const sr = rng(Math.floor(t * 30) + 3); U.uShake.value.set((sr() - 0.5) * shake, (sr() - 0.5) * shake);
    // shadows follow the action
    sun.position.copy(cam.position).add(V(-4, 30, -3)); sun.target.position.copy(cam.position).add(V(0, -2, 0)); sun.target.updateMatrixWorld();
    R.renderPass.scene = scene; R.renderPass.camera = cam;
    R.composer.render(); ov.apply(st);
  }
  await Promise.all(TEX_PENDING);
  window.EP = { whale, diver, cam, whalePose, setWhale, storyTime, shotAt, toWorld, envDist, THREE, by, D0, fishPos, rocks, kayak, lobster };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
