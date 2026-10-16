// Post 8: What if 1 gram of antimatter appeared in front of you? (approved by the owner, 16 Oct 2026)
// Hook (0-3.6): flash-forward, the fireball filling the canyon. Glide (3.6-11): Shibuya Crossing at night, the scramble,
// you walking the diagonal; countdown. The first nanoseconds (11-22): time all but stopped, the bead, the plasma ball
// growing, its light throwing everyone's shadows. The milliseconds (22-33): the fireball swells, the shock runs out
// through the buildings, glass and signs. The city (33-43): from Tokyo Tower, the mushroom cloud. Space (43-51).
// The rewind (51-62): back to the instant it appeared; CERN's real numbers. Loop end card + Follow for more (62-68).
import * as THREE from 'three';
import { createRenderer, Overlay, W, H, rng, smooth, clamp, captionAt, hudK } from '../engine/core.js';
import { loadTex } from '../engine/assets.js';
import { makeSpace6, geoDir } from '../engine/space6.js';
import { makeEndTag } from '../engine/endtag.js';
import { makeDuskSky } from '../engine/guarapari.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { TQ } from '../engine/tsq.js';
import { loadAdFonts, makeAdAtlases } from '../engine/ads6.js';
import { SB, makeShibuyaGround, makeSignAtlases, makeShibuya, makeStreetStuff, makeTokyo } from '../engine/shibuya.js';
import { makeBead, makeFireball, makeHalo, makeShock, shockR, physClock, fmtPhys } from '../engine/antimatter.js';
import { makeTower } from '../engine/paris.js';
import { fadeShadowBorders, Sparks, Billboards, Flare, smokeAtlas } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, walk, cloneAvatar } from '../engine/poses.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { makeCat } from '../engine/cat.js';
import { makePlush } from '../engine/plush.js';
import { makeCar } from '../engine/town5.js';
import { makeMicro } from '../engine/micro.js';
import { T, DUR, DIR, HERO, BEAD, TOWER, glide, bead as beadCam, atomsCam, nano, milli, city, rewind } from './ep14cams.js';

const TITLE = 'What if <span class="k">1 gram of antimatter</span> appeared in front of you?';
const CAPTIONS = [
  [3.75, 7.0, 'Shibuya Crossing, Tokyo, 9 pm.'],
  [7.1, 10.8, 'Up to 3,000 people cross at once.'],
  [11.1, 14.1, '1 gram of antimatter appears.'],
  [14.2, 17.4, 'An air molecule touches it.', { shade: 1 }],
  [17.5, 21.5, 'Both atoms vanish into pure energy.', { shade: 1 }],
  [23.2, 26.6, '1.8 × 10¹⁴ joules in a blink.', { shade: 1 }],
  [26.7, 30.4, '43 kilotons of TNT.', { shade: 1 }],
  [30.5, 33.8, '3 times Hiroshima.', { shade: 1 }],
  [34.2, 37.8, 'From 4 km away, at Tokyo Tower.'],
  [37.9, 43.7, 'The fireball climbs over the city.'],
  [44.2, 47.1, 'Seen from space.'],
  [47.2, 50.3, 'One gram. A paperclip’s weight.'],
  [50.5, 54.3, 'All the antimatter ever made:'],
  [54.4, 58.3, 'less than 10 billionths of a gram.'],
  [58.4, 61.95, 'Still want to see it up close?'],
];
const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; };
const RHO_E = 1.2 / (1.03 ** 5 * 1.8e14);
const tShock = (d) => Math.sqrt(RHO_E * d ** 5);              // when the shock front reaches distance d (s)

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);
  fadeShadowBorders(0.2);
  // a bright light on wet glass and asphalt makes specular peaks past what the half-float buffers hold (Inf, then a NaN
  // that the bloom smears into a black rectangle): cap every built-in material's output
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const scene = new THREE.Scene();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // night: a deep blue-violet sky, the city's glow low on the horizon
  const sunDir = V(-0.3, -0.5, 0.2).normalize();
  const SKYC = { zen: '#05060b', hor: '#1d1a24', belt: '#25202c', shade: '#0b0c14', sunCol: '#3a2a30' };
  const skyM = makeDuskSky(sunDir, SKYC); skyM.material.uniforms.uDisk.value = 0; scene.add(skyM);
  const pm = new THREE.PMREMGenerator(R.renderer);
  const envScene = new THREE.Scene(); envScene.background = new THREE.Color('#06070b');
  // the neon and the screens as the wet street sees them: coloured panels all round, low on the horizon
  const NEONC = ['#ff3b8d', '#2ef0ff', '#ffe23d', '#ff4a3a', '#b46bff', '#ffffff', '#ff9d2e', '#3d7bff', '#ff3b8d', '#5dff6a', '#2ef0ff', '#ffb0d0'];
  for (let i = 0; i < 24; i++) {
    const c = new THREE.Color(NEONC[i % 12]).multiplyScalar(0.9 + (i % 3) * 0.45), a = (i / 24) * Math.PI * 2 + 0.13 * i, h = 30 + (i * 37) % 90;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(60 + (i * 53) % 120, 20 + (i * 29) % 50), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    p.position.set(Math.cos(a) * 500, h, Math.sin(a) * 500); p.lookAt(0, h, 0); envScene.add(p);
  }
  const env = pm.fromScene(envScene, 0, 1, 20000).texture;
  scene.environment = env; scene.environmentIntensity = 0.55;
  scene.fog = new THREE.FogExp2('#15141c', 0.0016);
  const hemi = new THREE.HemisphereLight('#3c4258', '#2a201a', 0.5); scene.add(hemi);
  const key = new THREE.DirectionalLight('#a9b4ff', 0.35); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.03;
  const keyDir = V(0.3, 0.9, 0.25).normalize(); scene.add(key, key.target);
  const setShadow = (c, half) => { key.target.position.copy(c); key.position.copy(c).addScaledVector(keyDir, 200); Object.assign(key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 400 }); key.shadow.camera.updateProjectionMatrix(); key.target.updateMatrixWorld(); };

  // ---- the set ----
  scene.add(makeShibuyaGround());
  await loadAdFonts(); const ads = makeAdAtlases();
  const signs = await makeSignAtlases();
  const SBY = makeShibuya(ads, signs); scene.add(SBY.group);
  const ST = makeStreetStuff(); scene.add(ST.group);
  // light on the crossing from the big screens (coloured spots aimed out at the street) and the nearest lamp posts
  const scrL = SBY.lights.map((l) => { const c = new THREE.Color().setHSL(l.seed, 0.8, 0.55), p = new THREE.SpotLight(c, 700, 150, 1.05, 1.0, 2);
    p.position.set(l.x, l.y, l.z); p.target.position.set(l.x + l.nx * 30, 0, l.z + l.nz * 30); scene.add(p, p.target); return p; });
  const lampL = ST.lamps.filter((p) => Math.hypot(p.x, p.z) < 50).slice(0, 8).map((p) => { const l = new THREE.PointLight('#ffd9a8', 260, 45, 2); l.position.copy(p).add(V(0, -0.4, 0)); scene.add(l); return l; });
  // Tokyo for the far shot: the city field and the tower (only drawn from 33 to 43 s)
  const TK = makeTokyo(); scene.add(TK.mesh); TK.mesh.visible = false;
  const cityGround = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0e0d12', roughness: 0.92 })); cityGround.position.y = -0.08; scene.add(cityGround); cityGround.visible = false;
  const tower = makeTower(); tower.root.position.copy(TOWER); tower.root.scale.setScalar(333 / 330); scene.add(tower.root); tower.root.visible = false;
  if (tower.mat) { tower.mat.color.set('#e2541f'); }
  const towerLights = new THREE.Group(); { const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb070').multiplyScalar(3) });
    for (let i = 0; i < 40; i++) { const h = 10 + i * 7.5, w = 57 * Math.exp(-h / 90) + 5.5; for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), lm); b.position.set(TOWER.x + sx * w, h, TOWER.z + sz * w); towerLights.add(b); } } }
  scene.add(towerLights); towerLights.visible = false;
  // Tokyo's lights from the tower: street lamps, windows and signs as glittering points over 9 km (static)
  const cl = rng(61), CLN = 36000, cityLights = new Sparks(CLN, { minPx: 1.6, maxPx: 4, near: 20, additive: true });
  for (let i = 0; i < CLN; i++) { const street = cl() < 0.6, x = -3500 + cl() * 9000, z = -4500 + cl() * 9000;
    const gx = street ? Math.round(x / 90) * 90 + (cl() - 0.5) * 6 : x, gz = street ? z : z;
    const tint = [[1, 0.82, 0.55], [1, 0.95, 0.85], [0.75, 0.85, 1], [1, 0.5, 0.6]][Math.floor(cl() * 4)], c = 0.5 + 0.8 * cl();
    cityLights.set(i, cl() < 0.5 ? gx : x, 2 + (street ? 6 : cl() * 60), cl() < 0.5 ? gz : Math.round(z / 110) * 110 + (cl() - 0.5) * 6, 0, 0, 0, tint[0] * c, tint[1] * c, tint[2] * c, 1.4 + cl() * 1.6, -100, 1e9, cl()); }
  cityLights.commit(); scene.add(cityLights.points); cityLights.points.visible = false;

  const cam = new THREE.PerspectiveCamera(42, W / H, 0.03, 20000);
  // ---- space (43-51) and the end card's Follow for more (rule 20) ----
  const [day, night, cloudsTex] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false)]);
  const SPc = makeSpace6({ day, night, clouds: cloudsTex });
  SPc.U.uSun.value.copy(geoDir(-8.6, -3.0));                   // 21:12 in Tokyo on 16 October = 12:12 UTC: the Sun over West Africa
  const TKY = geoDir(35.66, 139.70), camDirS = TKY.clone().addScaledVector(geoDir(20, 160), 0.25).normalize();
  const camS = new THREE.PerspectiveCamera(30, W / H, 0.1, 9000); camS.setViewOffset(W, H, -40, -300, W, H);
  const flashS = new THREE.Sprite(new THREE.SpriteMaterial({ map: new Flare().glowTex, color: new THREE.Color(1, 0.8, 0.55), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flashS.position.copy(TKY).multiplyScalar(1.004); SPc.scene.add(flashS);
  const tag = makeEndTag({ text: 'Follow for more' });

  // ---- you: walking the diagonal toward the north-west corner (frozen mid-stride when it appears) ----
  const you = await loadAvatar('Female_Adult_09', { env, facial: true }); scene.add(you.root);
  // ---- Apple, on the vending machine of the south-east corner, in the drone's view from 8 to 10.6 s (23-38 px; calm part only) ----
  const apple = makeCat(); { const v = ST.vend[5]; apple.root.position.set(v.x, v.top, v.z + 0.05); apple.root.rotation.y = Math.PI - 0.6; } scene.add(apple.root);
  // ---- the WTF: a furry monster plush keychain that rides out the blast and tumbles past the rooftop camera ----
  const plush = makePlush(); plush.root.scale.setScalar(2.2); scene.add(plush.root);
  const plushL = new THREE.PointLight('#ffc48a', 6, 3, 2); scene.add(plushL);
  // ---- the crowd: walkers on the five crossings (their own skeletons), people waiting on the corners (posed copies) ----
  const crowdN = ['Male_Adult_01', 'Female_Adult_17', 'Business_Male_02', 'Female_Party_02', 'Male_Adult_11', 'Business_Male_04', 'Sports_Male_04',
    'Female_Adult_08', 'Male_Adult_08', 'Female_Adult_04', 'Male_Adult_06', 'Female_Adult_03', 'Male_Adult_12', 'Female_Adult_06', 'Sports_Male_01', 'Sports_Male_02'];
  const crowd = []; for (const n of crowdN) { const a = await loadAvatar(n, { env, lod: 512 }); crowd.push(a); }
  const cr = rng(17);
  // routes: [A, B] on the curbs at each end; walkers spread along them so they are all on the crossing at 11 s
  const ROUTES = [];
  for (const s of [-1, 1]) { ROUTES.push([V(-14.5, 0, s * 14.3), V(14.5, 0, s * 14.3), 2.4]); ROUTES.push([V(s * 16.3, 0, -12.6), V(s * 16.3, 0, 12.6), 2.4]); }
  ROUTES.push([V(-14, 0, -11.9), V(14, 0, 11.9), 2.2], [V(14, 0, -11.9), V(-14, 0, 11.9), 2.2]);
  const heroAt = (t) => HERO.clone().addScaledVector(DIR, 1.36 * (Math.min(t, T.APPEAR) - T.APPEAR));
  const walkers = [], WN = Number(q.get('walkers') ?? 64);
  const posAt = (w, t) => { const tt = Math.min(t, T.APPEAR), u = clamp(w.u0 + (tt - T.APPEAR) * w.v / w.L, 0, 1); return w.A.clone().lerp(w.B, u).addScaledVector(w.perp, w.off); };
  for (let guard = 0; walkers.length < WN && guard < 4000; guard++) {
    const [A0, B0, half] = ROUTES[Math.floor(cr() * ROUTES.length)], flip = cr() < 0.5, A = flip ? B0 : A0, B = flip ? A0 : B0;
    const dir = B.clone().sub(A), L = dir.length(); dir.normalize();
    const w = { A, B, L, dir, perp: V(-dir.z, 0, dir.x), off: (cr() - 0.5) * 2 * half, v: 1.15 + cr() * 0.45, u0: 0.42 + cr() * 0.5, stride: 0.62 + cr() * 0.12, base: crowd[walkers.length % crowd.length], ph: cr() };
    if (w.u0 * L < w.v * 7.6) continue;                        // must already be walking at 3.6 s
    let ok = true;
    for (let t = 3.6; t <= T.APPEAR + 1e-6 && ok; t += 0.1) {
      const p = posAt(w, t); if (p.distanceTo(heroAt(t)) < 1.1) ok = false;
      for (const o of walkers) if (p.distanceTo(posAt(o, t)) < 0.78) { ok = false; break; }
    }
    const pe = posAt(w, T.APPEAR); if (Math.hypot(pe.x - BEAD.x, pe.z - BEAD.z) < 4.6) ok = false;   // clear of the bead and the cameras that circle it
    if (!ok) continue;
    const av = cloneAvatar(w.base, skClone); scene.add(av.root); w.av = av; walkers.push(w);
  }
  console.log('walkers', walkers.length);
  const extras = [];
  for (let guard = 0; extras.length < 150 && guard < 6000; guard++) {
    const corner = [[-1, -1], [1, -1], [1, 1], [-1, 1]][Math.floor(cr() * 4)], arm = cr() < 0.5;
    const x = arm ? corner[0] * (13.8 + cr() * 4.6) : corner[0] * (14 + cr() * 60), z = arm ? corner[1] * (12 + cr() * 60) : corner[1] * (11.8 + cr() * 4.6);
    if (extras.some((e) => Math.hypot(e.position.x - x, e.position.z - z) < 0.7)) continue;
    if (ST.vend.some((v) => Math.hypot(v.x - x, v.z - z) < 1.2)) continue;
    const base = crowd[(extras.length * 5) % crowd.length];
    stand(base, { pos: V(0, 0, 0), yaw: 0, breath: cr(), stride: (cr() - 0.5) * 0.7, look: V((cr() - 0.5) * 6, 1.5 + cr() * 2, 8) });
    const c = skClone(base.root); c.position.set(x, c.position.y, z); c.rotation.y = Math.atan2(-x, -z) + (cr() - 0.5) * 1.6; scene.add(c); extras.push(c);
  }
  // ---- cars stopped at the red lights on all four arms (the scramble), lights on ----
  const cars = [], car = rng(23);
  const LANES = [[[-3.3, 1], [-9.8, 1]], [[3.3, -1], [9.8, -1]]];
  for (const s of [-1, 1]) for (const [lx, d] of [[-3.2 * s, s], [-9.6 * s, s]]) { let u = 19.6; for (let k = 0; k < 3; k++) {   // north and south arms
    const type = car() < 0.6 ? 'sedan' : car() < 0.5 ? 'suv' : 'hatch', col = ['#151719', '#e9e9e6', '#c9ccd0', '#203a2e', '#8a1c1c', '#24406e'][Math.floor(car() * 6)], c = makeCar(type, col, car);
    c.group.position.set(lx, 0.005, d * (u + c.L / 2)); c.group.rotation.y = d > 0 ? Math.PI : 0; scene.add(c.group); cars.push({ ...c, p0: c.group.position.clone(), r0: c.group.rotation.y }); u += c.L + 1.8 + car() * 2; } }
  for (const s of [-1, 1]) for (const lz of [2.9 * s, 8.2 * s]) { let u = 21.6; for (let k = 0; k < 3; k++) {          // east and west arms
    const type = car() < 0.6 ? 'sedan' : 'suv', col = ['#151719', '#e9e9e6', '#c9ccd0', '#203a2e', '#8a1c1c'][Math.floor(car() * 5)], c = makeCar(type, col, car);
    c.group.position.set(s * (u + c.L / 2), 0.005, lz); c.group.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(c.group); cars.push({ ...c, p0: c.group.position.clone(), r0: c.group.rotation.y }); u += c.L + 1.8 + car() * 2; } }
  void LANES;

  // ---- the event: the bead, the plasma ball, the ionised halo, the shock shell, its light, the lens flare ----
  const bead = makeBead(); bead.group.position.copy(BEAD); scene.add(bead.group);
  const FB = makeFireball(); FB.mesh.position.copy(BEAD); scene.add(FB.mesh);
  const HL = makeHalo(); HL.mesh.position.copy(BEAD); scene.add(HL.mesh);
  const SK = makeShock(); SK.mesh.position.copy(BEAD); scene.add(SK.mesh);
  const fbL = new THREE.PointLight('#d8d0ff', 0, 0, 2); fbL.position.copy(BEAD); fbL.castShadow = true; fbL.shadow.mapSize.set(1024, 1024); fbL.shadow.bias = -0.002; fbL.shadow.camera.near = 0.05; fbL.shadow.camera.far = 600; scene.add(fbL);
  const flare = new Flare(); scene.add(flare.group);
  const clock = physClock(T);
  const MIC = makeMicro({ t0: T.MICRO, tHit: T.HIT, t1: T.MACRO, neon: NEONC });
  // ---- effects ----
  const fxr = rng(41), smokeT = smokeAtlas(5);
  // glass from the facades round the crossing, blown out when the shock reaches them (time unit: milliseconds)
  const GN = 26000, glass = new Sparks(GN, { minPx: 1.6, maxPx: 10, near: 1.5, additive: true });
  for (let i = 0; i < GN; i++) {
    const arm = Math.floor(fxr() * 4), u = 17 + Math.pow(fxr(), 1.4) * 110, y = 3 + fxr() * 40, sd = fxr() < 0.5 ? -1 : 1;
    const x = arm < 2 ? sd * (SB.LX + 0.2) : (arm === 2 ? 1 : -1) * u, z = arm < 2 ? (arm === 0 ? -1 : 1) * u : sd * (SB.LZ + 0.2);
    const p = V(x, y, z), d = p.distanceTo(BEAD), dir = p.clone().sub(BEAD).normalize(), v = (0.04 + 0.1 * fxr()) * Math.min(1, 60 / d);
    const c = 0.7 + 0.5 * fxr();
    glass.set(i, x, y, z, dir.x * v + (fxr() - 0.5) * 0.01, dir.y * v + (fxr() - 0.5) * 0.01, dir.z * v + (fxr() - 0.5) * 0.01, c, c * 0.9, c * 0.8, 0.03 + fxr() * 0.09, tShock(d) * 1000, 400, fxr());
  }
  glass.commit(); scene.add(glass.points);
  // the dust wall at the foot of the shock (it hides what it passes), lit by the fireball
  const DN = 160, dust = new Billboards(DN, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 8 });
  dust.u.uLitCol.value.set('#ffcf9a'); dust.u.uShadeCol.value.set('#3a2a24'); dust.u.uFogD.value = 0;
  const dustP = []; for (let i = 0; i < DN; i++) dustP.push([fxr() * Math.PI * 2, fxr(), fxr(), fxr()]);
  scene.add(dust.mesh);
  // the mushroom cloud for the far shot: the stem and the rolling cap (lit cards, fire-lit from below)
  const MN = 110, mush = new Billboards(MN, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 0, near: 50 });
  mush.u.uLitCol.value.set('#d9a070'); mush.u.uShadeCol.value.set('#3a2a24');
  const CN = 170, cap = new Billboards(CN, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 0, near: 50 });   // the cap, lit from the fireball inside it
  cap.u.uLitCol.value.set('#ff9450'); cap.u.uShadeCol.value.set('#2b2326'); cap.u.uFogD.value = 0; scene.add(cap.mesh); mush.u.uFogD.value = 0;
  const mushP = []; for (let i = 0; i < MN + CN; i++) mushP.push([fxr(), fxr(), fxr(), fxr()]);
  scene.add(mush.mesh);
  // dust motes hanging in the air round the bead (time is all but stopped), lit by the neon, then by the plasma
  const MON = 1400, motes = new Sparks(MON, { minPx: 1.6, maxPx: 6, near: 0.3, additive: true });
  for (let i = 0; i < MON; i++) { const a = fxr() * 6.283, rr = 0.3 + 5.5 * Math.sqrt(fxr()), y = 0.3 + fxr() * 3.2, c = 0.35 + 0.4 * fxr();
    motes.set(i, BEAD.x + Math.cos(a) * rr, y, BEAD.z + Math.sin(a) * rr, (fxr() - 0.5) * 0.03, (fxr() - 0.5) * 0.01, (fxr() - 0.5) * 0.03, c, c * 0.95, c * 1.05, 0.0025 + fxr() * 0.003, -100, 1000, fxr()); }
  motes.commit(); motes.u.uTurb.value = 0.03; motes.u.uTurbF.value = 0.4; scene.add(motes.points);
  // the air lighting up ahead of the ball: sparkles that flash as the ionisation front passes them, then fade
  // (the system's clock here is the front's radius in metres: birth = the sparkle's distance, life = 0.9 m)
  const ION = 5000, ion = new Sparks(ION, { minPx: 1.6, maxPx: 5, near: 0.25, additive: true });
  for (let i = 0; i < ION; i++) { const u = fxr() * 2 - 1, a = fxr() * 6.283, rr = 0.02 + 4.6 * Math.pow(fxr(), 0.6), s1 = Math.sqrt(1 - u * u);
    const c = 0.8 + 0.6 * fxr(); ion.set(i, BEAD.x + rr * s1 * Math.cos(a), BEAD.y + rr * u, BEAD.z + rr * s1 * Math.sin(a), 0, 0, 0, c * 0.8, c * 0.75, c * 1.1, 0.002 + fxr() * 0.003, rr, 0.9, fxr()); }
  ion.commit(); scene.add(ion.points);
  // embers drifting in the far shot (and the space shot's flash fades on its own)
  await Promise.all(TEX_PENDING);

  // ---- posing (a pure function of time; everyone freezes when it appears) ----
  const blinkK = (t) => { let k = 0; for (const b0 of [5.2, 8.1, 10.2]) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  function poseAll(tw) {
    const t = Math.min(tw, T.APPEAR);
    const hp = heroAt(t), dist = 1.36 * (t - 3.0);
    walk(you, { pos: hp, yaw: Math.atan2(DIR.x, DIR.z), phase: dist / (2 * 0.66), stride: 0.66, look: hp.clone().addScaledVector(DIR, 8).setY(1.45), lookK: 0.5 });
    if (you.blink) you.blink(blinkK(t));
    for (const w of walkers) { const p = posAt(w, t), traveled = w.u0 * w.L + (t - T.APPEAR) * w.v;
      walk(w.av, { pos: p, yaw: Math.atan2(w.dir.x, w.dir.z), phase: w.ph + traveled / (2 * w.stride), stride: w.stride }); }
  }

  function hudAt(t, phys) {
    const k = hudK(t, T.APPEAR);                     // rule 23: big during the countdown, small from 1 s before it appears
    if (t < T.APPEAR) return { a: 1, k, lab: '1 gram of antimatter appears in', val: fmtT(T.APPEAR - t), sub: 'Shibuya Crossing, Tokyo · 9:12 pm', sub2: 'Up to 3,000 people per green light' };
    if (t < T.REWIND) {
      if (t >= T.MICRO && t < T.MACRO) return { a: 1, k, lab: 'Time since it appeared', val: fmtPhys(phys), sub: 'Zoomed in a billion times', sub2: 'Air molecule meets anti-aluminium' };
      const sub = t < T.CITY ? 'Slow motion' : 'Time sped up';
      const sub2 = t < T.MILLI ? '1 g + 1 g of air → 1.8 × 10¹⁴ J' : t < T.CITY ? '= 43 kilotons of TNT' : 'Hiroshima, 1945: 15 kilotons';
      return { a: 1, k, lab: 'Time since it appeared', val: fmtPhys(phys), sub, sub2 };
    }
    if (t < T.END) return { k, a: smooth(T.REWIND, T.REWIND + 0.4, t) * (1 - smooth(T.END - 0.3, T.END, t)), lab: 'All the antimatter ever made', val: '< 10 ng', sub: 'Cost of 1 gram: $62.5 trillion', sub2: 'NASA estimate, 1999' };
    return null;
  }

  const tmp = V(0, 0, 0);
  const scr = (v, c) => { const p = v.clone().project(c); return new THREE.Vector2(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5); };
  const pulse = (t, t0, d) => (t >= t0 && t < t0 + d ? Math.exp(-(t - t0) / (d * 0.35)) : 0);
  // the event's state at physical time ph (s): fireball, halo, shock, light, signs, screens, glass, dust, cars, people
  function eventState(ph, t) {
    const on = ph > 0;
    const kn = clamp((t - T.MACRO) / (T.MILLI - T.MACRO)), nanoR = t < T.MACRO ? 0.004 : 0.06 + 1.64 * Math.pow(kn, 1.4);
    const Rs = on ? (t >= T.APPEAR && t < T.MILLI ? nanoR * 1.03 : shockR(ph)) : 0, Rf = Math.max(0.0046, Rs * (ph < 1e-3 ? 0.97 : 0.97 - 0.32 * smooth(1e-3, 2e-2, ph)));
    bead.group.visible = on && Rf < 0.0052; bead.group.rotation.set(t * 0.4, t * 0.7, 0);
    FB.mesh.visible = on && Rf > 0.0046; FB.U.uR.value = Rf; FB.U.uTime.value = t * 0.25; FB.U.uHeat.value = t >= T.MILLI || t < T.HOOK ? 0.74 - 0.2 * smooth(1e-4, 2e-2, ph) : 1.0;
    FB.U.uRough.value = 0.05 + 0.04 * smooth(1e-10, 1e-6, ph); FB.U.uSmoke.value = 0; FB.U.uSquash.value = 1; FB.U.uViolet.value = 1 - smooth(1e-6, 3e-4, ph); FB.U.uSoot.value = 0.55 * smooth(1e-4, 6e-3, ph); FB.U.uGain.value = t >= T.MILLI || t < T.HOOK ? 0.5 : 0.85;
    FB.mesh.position.copy(BEAD).setY(Math.max(BEAD.y, Rf * 0.25 + BEAD.y * (1 - smooth(0.5, 3, Rf))));
    HL.mesh.visible = false; HL.mesh.position.copy(FB.mesh.position); HL.U.uR.value = Math.max(0.012, Rf * (2.6 - 1.2 * smooth(1e-6, 1e-3, ph))); HL.U.uI.value = 0.3 * (1 - smooth(3e-3, 2e-2, ph));
    SK.mesh.visible = on && ph > 2e-6; SK.mesh.position.copy(BEAD).setY(0); SK.U.uR.value = Rs * 1.05; SK.U.uA.value = 0.55 * smooth(2e-6, 2e-5, ph); SK.U.uTime.value = t;
    // the light: grows with the ball; the shadows it throws are the picture in the first nanoseconds
    fbL.visible = on && Rf > 0.0047; fbL.position.copy(FB.mesh.position); SB.U.uMinRough.value = fbL.visible ? 0.22 : 0; fbL.intensity = on ? THREE.MathUtils.lerp(10 * Math.pow(Math.max(Rf, 0.005) / 0.005, 0.7), 150 * Rf * Rf, smooth(1, 5, Rf)) : 0;
    SB.U.uShock.value = on ? Rs : -1;
    TQ.uPower.value = on ? 1 - smooth(38, 50, Rs) : 1;
    glass.update(ph * 1000, cam, R.SSAA); glass.points.visible = Rs > 15;
    // dust wall riding the shock front along the ground
    for (let i = 0; i < DN; i++) { const [a, r1, r2, sd] = dustP[i], rr = Rs * (0.93 + 0.08 * r1), sz = Math.max(4, Rs * (0.12 + 0.12 * r2));
      if (!on || Rs < 12) { dust.hide(i); continue; }
      dust.set(i, BEAD.x + Math.cos(a) * rr, sz * 0.32, BEAD.z + Math.sin(a) * rr, sz, sz * 0.75, 1, 1, 1, 0.85 * smooth(12, 20, Rs), sd * 6.28 + Rs * 0.01, Math.floor(sd * 4)); }
    dust.commit(); dust.update(cam, R.SSAA, V(0, 1, 0));
    // people and cars: hidden once the dust wall or the fireball has passed them (they are never seen being hurt)
    for (const w of walkers) w.av.root.visible = !(on && Rs > Math.hypot(posAt(w, T.APPEAR).x - BEAD.x, posAt(w, T.APPEAR).z - BEAD.z) - 1.5 && ph > 2e-6);
    for (const e of extras) e.visible = !(on && Rs > Math.hypot(e.position.x - BEAD.x, e.position.z - BEAD.z) + 4);
    for (const c of cars) { const d = Math.hypot(c.p0.x - BEAD.x, c.p0.z - BEAD.z), age = on ? (ph - tShock(d)) * 1000 : -1;
      c.group.visible = !(on && Rs > d + 6);
      c.group.position.copy(c.p0); c.group.rotation.set(0, c.r0, 0);
      if (age > 0) { tmp.set(c.p0.x - BEAD.x, 0, c.p0.z - BEAD.z).normalize(); const s = 0.5 * 0.02 * age * age * Math.min(1, 40 / d); c.group.position.addScaledVector(tmp, s); c.group.position.y += s * 0.25; c.group.rotation.z = Math.min(1.2, s * 0.08); } }
    you.root.visible = !(on && Rf > 2.2);
    motes.u.uNear.value = t >= T.REWIND ? 1.0 : 0.3; motes.update(0, cam, R.SSAA);   // the rewind push-in: no mote within 1-2.5 m of the lens (they popped at 57 s)
    motes.points.visible = t >= T.APPEAR && t < T.MILLI || t >= T.REWIND; motes.u.uGain.value = 1 + 2.5 * smooth(0.05, 1.0, Rf);
    ion.update(on && t >= T.MACRO && t < T.MILLI ? Rf * 2.3 : -10, cam, R.SSAA); ion.points.visible = on && t >= T.MACRO && t < T.MILLI;
  }

  function frame(t) {
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.08; U.uContrast.value = 1.06; U.uVignette.value = 0.34; U.uAberr.value = 0.0012; U.uGrain.value = 0;
    U.uWarp.value = 0; U.uHeatA.value = 0; U.uBarrel.value = 0;
    // the physical clock: the hook flashes forward to ~4-6 ms; the rewind returns to the instant it appeared
    const phys = t < T.HOOK ? 0.8e-3 * (1 + 0.15 * t) : t >= T.REWIND ? 1e-15 : clock(t);   // (the nanoseconds' ball size follows its own curve: eventState)
    const story = t < T.HOOK ? T.APPEAR : t >= T.REWIND ? T.APPEAR : Math.min(t, T.APPEAR);
    TQ.uScrT.value = story; TQ.uTime.value = t;
    let rscene = scene, rc = cam;
    if (t >= T.MICRO && t < T.MACRO) {
      // ---------------- the atoms: the first femtoseconds at the bead's surface ----------------
      rscene = MIC.scene; rc = MIC.cam;
      atomsCam.apply(MIC.cam, t); MIC.update(t);
      R.renderer.toneMappingExposure = 0.55; R.bloom.strength = 0.55; R.bloom.radius = 0.5; R.bloom.threshold = 0.95 / 0.55;
      U.uSat.value = 1.12; U.uVignette.value = 0.42;
      U.uFadeWhite.value = 0.8 * Math.exp(-(t - T.MICRO) * 6) + smooth(17.85, 18.4, t);
      const hit = t - T.HIT; if (hit > 0 && hit < 0.8) { const k = Math.exp(-hit * 5) * Math.sin(hit * 50); U.uShake.value.set(0.003 * k, 0.002 * k); }
      U.uAberr.value = 0.005 + 0.012 * smooth(15, 18.4, t) + 0.035 * pulse(t, T.HIT, 0.8) + 0.02 * pulse(t, T.MICRO, 0.5);
      if (hit > 0 && hit < 1.2) { U.uWarpC.value.copy(scr(MIC.events[0].p, MIC.cam)); U.uWarpR.value = hit * 1.5; U.uWarpW.value = 0.06; U.uWarp.value = 0.028 * Math.exp(-hit * 2.2); }
      U.uBarrel.value = 0.22 * pulse(t, T.HIT, 0.6);
    } else if (t >= T.SPACE && t < T.REWIND) {
      // ---------------- space: night over Japan, the flash at Tokyo ----------------
      rscene = SPc.scene; rc = camS;
      const u = clamp((t - T.SPACE) / (T.REWIND - T.SPACE)), S = SPc.U;
      S.uLights.value = 1; S.uClouds.value = 1; S.uCloudLow.value = 0; S.uLandW.value = 0; S.uSeaW.value = 0; S.uAtm.value = 1; S.uTime.value = t;
      if (S.uSmear) S.uSmear.value = 0; if (S.uDust) S.uDust.value = 0;
      const dir = camDirS.clone().applyAxisAngle(V(0, 1, 0), 0.04 * u);
      camS.position.copy(dir).multiplyScalar(6.4 - 0.5 * smooth(0, 1, u)); camS.up.set(0, 1, 0); camS.lookAt(0, 0, 0); camS.updateMatrixWorld();
      SPc.stars.u.uGain.value = 0.9; SPc.stars.u.uPR.value = R.SSAA;
      const fl = 0.35 + 1.6 * Math.exp(-(t - T.SPACE) * 1.6);
      flashS.scale.setScalar(0.035 + 0.05 * Math.exp(-(t - T.SPACE) * 1.2)); flashS.material.opacity = Math.min(1, fl); flashS.material.color.setRGB(1 * fl, 0.75 * fl, 0.5 * fl);
      R.renderer.toneMappingExposure = 1.0; R.bloom.strength = 0.45; R.bloom.radius = 0.6; R.bloom.threshold = 0.95;
      U.uFadeWhite.value = 0.5 * Math.exp(-(t - T.SPACE) * 5); U.uAberr.value = 0.003 + 0.02 * pulse(t, T.SPACE, 0.8);
    } else if (t >= T.CITY && t < T.SPACE) {
      // ---------------- the city: from Tokyo Tower ----------------
      city.apply(cam, t);
      TK.mesh.visible = tower.root.visible = towerLights.visible = cityGround.visible = cityLights.points.visible = true; SBY.group.visible = false; cityLights.update(t, cam, R.SSAA);
      TQ.uPower.value = 1; SB.U.uShock.value = 1e9;
      const p = phys, Rmax = 315, Rb = Math.min(Rmax, shockR(p) * 0.65 + 40), rise = Math.max(0, p - 1.5) * 75, cy = Rb * 0.9 + rise;
      FB.mesh.visible = true; HL.mesh.visible = false; SK.mesh.visible = p < 3; bead.group.visible = false;
      FB.mesh.position.set(BEAD.x, cy, BEAD.z); FB.U.uR.value = Rb; FB.U.uTime.value = t * 0.3; FB.U.uRough.value = 0.09 + 0.08 * smooth(2, 20, p);
      FB.U.uHeat.value = 0.78 - 0.45 * smooth(0.3, 12, p); FB.U.uSmoke.value = smooth(4, 40, p); FB.U.uGain.value = 0.6; FB.U.uSoot.value = 0.7; FB.U.uViolet.value = 0; FB.U.uSquash.value = 1 - 0.3 * smooth(5, 40, p);
      const Rsk = p < 1 ? shockR(p) : 685 + 340 * (p - 1);
      SK.mesh.position.set(BEAD.x, 0, BEAD.z); SK.U.uR.value = Rsk; SK.U.uA.value = 0.35 * (1 - smooth(0.5, 3, p));
      fbL.visible = true; fbL.castShadow = false; fbL.position.copy(FB.mesh.position); fbL.color.set('#ffb36e'); fbL.intensity = 4e8 * (1 - 0.7 * smooth(1, 30, p)); fbL.distance = 0;
      // the stem and the cap
      for (let i = 0; i < MN + CN; i++) { const [a, b, c, sd] = mushP[i];
        if (i < MN) { const h = b * cy, rr = 80 + 140 * (1 - b) + 60 * c, an = a * 6.283 + t * 0.05; const sz = 180 + 220 * c;
          mush.set(i, BEAD.x + Math.cos(an) * rr, h, BEAD.z + Math.sin(an) * rr, sz, sz, 1, 1, 1, 0.85 * smooth(1.5, 5, p) * smooth(0, 0.1, b), sd * 6.28 + t * 0.03, Math.floor(sd * 4)); }
        else { const an = a * 6.283 + t * 0.04, rr = Rb * (1.0 + 0.8 * c) * (1 + 1.5 * smooth(3, 40, p)), yy = cy + Rb * (b - 0.35) * (1 + 0.8 * smooth(3, 40, p)), sz = Rb * (0.75 + 0.6 * c) * (1 + 0.6 * smooth(3, 40, p));
          cap.set(i - MN, BEAD.x + Math.cos(an) * rr, yy, BEAD.z + Math.sin(an) * rr, sz, sz * 0.8, 1, 1, 1, 0.92 * smooth(2.5, 9, p), sd * 6.28 + t * 0.05, Math.floor(sd * 4)); } }
      mush.commit(); mush.update(cam, R.SSAA, V(0, 1, 0)); cap.commit(); cap.update(cam, R.SSAA, V(0, -1, 0)); cap.mesh.visible = true;
      mush.mesh.visible = true; dust.mesh.visible = false; glass.points.visible = false;
      for (const w of walkers) w.av.root.visible = false; for (const e of extras) e.visible = false; for (const c of cars) c.group.visible = false; you.root.visible = false;
      const e = 0.62; R.renderer.toneMappingExposure = e; R.bloom.strength = 0.55; R.bloom.radius = 0.7; R.bloom.threshold = 0.95 / e;
      scene.fog.density = 0.00012; scene.fog.color.set('#241a2c');
      flare.update(cam, FB.mesh.position, 0.5 * (1 - smooth(0.5, 6, p)), 0.6);
      // the shock arrives at the tower (~40.7 s): a jolt
      const hit = t - 41.7; if (hit > 0 && hit < 0.9) { const k = Math.exp(-hit * 4) * Math.sin(hit * 40); U.uShake.value.set(0.004 * k, 0.003 * k); }
      { const fc = scr(FB.mesh.position, cam); U.uHeatC.value.copy(fc); U.uHeatR.value = 0.35; U.uHeatA.value = 0.8; }
      U.uAberr.value = 0.004 + 0.03 * pulse(t, 41.7, 0.9) + 0.02 * pulse(t, T.CITY, 0.6); U.uBarrel.value = 0.15 * pulse(t, 41.7, 0.7);
      if (hit > 0 && hit < 1.0) { U.uWarpC.value.copy(scr(FB.mesh.position, cam)); U.uWarpR.value = hit * 2.2; U.uWarpW.value = 0.08; U.uWarp.value = 0.022 * Math.exp(-hit * 2.5); }
      U.uFadeWhite.value = 0.6 * Math.exp(-(t - T.CITY) * 4);
    } else {
      // ---------------- Shibuya: the glide, the nanoseconds, the milliseconds, the hook, the rewind ----------------
      TK.mesh.visible = tower.root.visible = towerLights.visible = cityGround.visible = cityLights.points.visible = false; SBY.group.visible = true; mush.mesh.visible = cap.mesh.visible = false; dust.mesh.visible = true;
      fbL.color.set('#d8d0ff'); fbL.castShadow = true; scene.fog.color.set('#15141c');
      if (t < T.HOOK) milli.apply(cam, 29.6 + t * 0.12); else if (t < T.APPEAR) glide.apply(cam, t); else if (t < T.MICRO) beadCam.apply(cam, t); else if (t < T.MILLI) nano.apply(cam, t); else if (t < T.CITY) milli.apply(cam, t); else rewind.apply(cam, t);
      if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      poseAll(story);
      apple.update(t, { look: cam.position, blinkAt: [6.8], earAt: [7.9], pr: R.SSAA }); apple.root.visible = t >= T.HOOK && t < T.APPEAR;
      setShadow(V(HERO.x, 0, HERO.z), 30);
      eventState(phys, t);
      // the plush: on the rooftop shot it tumbles past the lens out of the blast, intact (31.0-32.6 s)
      const pk = (t - 32.0) / 1.6; plush.root.visible = t >= T.MILLI && pk > 0 && pk < 1;
      if (plush.root.visible) { const c0 = cam.position, f = V(0, 0, -1).applyQuaternion(cam.quaternion), r = V(1, 0, 0).applyQuaternion(cam.quaternion), up = V(0, 1, 0).applyQuaternion(cam.quaternion);
        plush.root.position.copy(c0).addScaledVector(f, 2.2 - 0.6 * pk).addScaledVector(r, -1.6 + 3.4 * pk).addScaledVector(up, -0.5 + 0.9 * pk - 0.6 * pk * pk); plush.root.lookAt(c0); plush.root.rotateY(0.5 * Math.sin(pk * 5)); plush.root.rotateZ(pk * 2.2); plush.root.rotateX(0.3 * Math.sin(pk * 7)); }
      plushL.visible = plush.root.visible; if (plushL.visible) plushL.position.copy(plush.root.position).lerp(cam.position, 0.45);
      // grade and exposure: night, then the light of the ball (exposure falls as it grows so nothing burns out)
      const Rnow = FB.U.uR.value, burn = phys > 0 && t < T.REWIND && FB.mesh.visible ? smooth(0.05, 1.7, Rnow) : 0, big = t >= T.MILLI || t < T.HOOK ? 1 : 0;
      const e = big ? 0.42 : 0.82 - 0.3 * burn;
      R.renderer.toneMappingExposure = e; R.bloom.strength = big ? 0.3 : 0.42; R.bloom.radius = 0.5; R.bloom.threshold = 0.95 / e;
      hemi.intensity = 0.55; key.intensity = 0.35; for (const l of scrL) l.intensity = 700 * TQ.uPower.value; for (const l of lampL) l.intensity = 260 * (1 - smooth(25, 40, SB.U.uShock.value));
      ST.lampM.emissiveIntensity = 4 * (1 - smooth(25, 40, SB.U.uShock.value));
      scene.fog.density = 0.0016;
      U.uTint.value.set(1 + 0.04 * burn, 1, 1 + 0.06 * burn - 0.08 * big);
      flare.update(cam, FB.mesh.position, t >= T.REWIND ? 0.03 : phys > 0 ? 0.12 + 0.6 * burn : 0, 0.4 + 0.6 * big);
      // lens: chroma, heat shimmer round the ball, the shock front's refraction ring, punches on the hits
      U.uAberr.value = (t < T.APPEAR && t >= T.HOOK ? 0.0015 : big ? 0.012 : 0.004 + 0.01 * burn) + 0.03 * pulse(t, T.APPEAR, 0.8) + 0.03 * pulse(t, T.REWIND, 0.7);
      U.uBarrel.value = 0.25 * pulse(t, T.APPEAR, 0.6) - 0.2 * pulse(t, T.REWIND, 0.6);
      if (FB.mesh.visible && t < T.REWIND) {
        const fc = scr(FB.mesh.position, cam), dist = FB.mesh.position.distanceTo(cam.position), rUV = FB.U.uR.value / (dist * 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
        U.uHeatC.value.copy(fc); U.uHeatR.value = Math.min(1.2, rUV * 1.7778 * 1.7 + 0.04); U.uHeatA.value = big ? 1.4 : 0.9;
        if (SK.mesh.visible) { const ctr = SK.mesh.position.clone(), right = V(1, 0, 0).applyQuaternion(cam.quaternion), edge = scr(ctr.clone().addScaledVector(right, SK.U.uR.value), cam), c0 = scr(ctr, cam);
          U.uWarpC.value.copy(c0); U.uWarpR.value = Math.hypot(edge.x - c0.x, (edge.y - c0.y) * 1.7778); U.uWarpW.value = 0.035; U.uWarp.value = 0.012 * SK.U.uA.value / 0.55; }
      }
      if (t >= T.MILLI && t < T.CITY) { const h2 = t - 33.05; if (h2 > 0 && h2 < 0.8) { U.uWarpC.value.set(0.5, 0.5); U.uWarpR.value = h2 * 2.4; U.uWarpW.value = 0.1; U.uWarp.value = 0.03 * Math.exp(-h2 * 3); }
        U.uAberr.value += 0.04 * pulse(t, 33.05, 0.9); U.uBarrel.value += 0.3 * pulse(t, 33.05, 0.6); }
      // the shock reaches the rooftop camera (~31.8 s): a jolt, then white into the cut
      if (t >= T.MILLI && t < T.CITY) { const hit = t - 33.05; if (hit > 0) { const k = Math.exp(-hit * 3) * Math.sin(hit * 46); U.uShake.value.set(0.006 * k, 0.004 * k); } U.uFadeWhite.value = smooth(33.45, 34.0, t); }
      if (t >= T.APPEAR && t < T.MICRO) U.uFadeWhite.value = 0.8 * Math.exp(-(t - T.APPEAR) * 8) + smooth(12.15, 12.4, t) * 0.9;
      if (t >= T.MACRO && t < T.MILLI) U.uFadeWhite.value = 0.9 * Math.exp(-(t - T.MACRO) * 5) + smooth(22.5, 23.0, t) * 0.9;
      if (t >= T.REWIND) U.uFadeWhite.value = 0.9 * Math.exp(-(t - T.REWIND) * 3);
    }
    skyM.position.copy(cam.position);
    R.renderPass.scene = rscene; R.renderPass.camera = rc;
    R.composer.render();
    const cover = q.get('cover') === '1', endA = smooth(T.END, T.END + 0.5, t);
    ov.apply({ labels: [], tag: 'WHAT IF &nbsp;·&nbsp; 08', tagA: t < T.END ? 1 : 0, title: { html: TITLE, a: cover ? 1 : t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0, k: 1 },
      hud: cover ? null : hudAt(t, phys), caption: cover ? null : captionAt(CAPTIONS, t),
      end: endA > 0 ? { a: endA, title: TITLE, note: '<span class="q">Still want to see it up close?</span><br><br>1 g of antimatter + 1 g of matter = 43 kilotons<br>All the antimatter ever made: less than 10 billionths of a gram' } : null });
    tag.update(t, T.END + 0.5, endA);
  }
  window.EP = { scene, cam, THREE };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
