// Post 9: What if air became as thick as honey for 5 seconds? (approved by the owner, 17 Oct 2026)
// Hook (0-3.6): flash-forward into the third second, beside a plane over Tower Bridge, engines dead, the rain hanging.
// Glide (3.6-11): London at the blue hour in the rain, down to you on the bridge's east pavement; countdown.
// The thick air, one take (11-33, slow motion): the rain stops dead, you can't breathe in, sound dies; the pigeon, the
// goldfish in a floating ball of water (rule 19's WTF); craning up over the river: every bird hangs, fuel engines choke, cars roll to a stop.
// The plane (33-44): its fans wind down, its landing lights die, the ram air turbine drops out. Space (44-50): Europe at
// dusk, every plane in the sky a red dot. Second 5 (50-56): the air comes back, the rain falls, you gasp. The last take
// (56-65): the plane gliding on toward the City with dead engines; BA 9, 1982; the rain falls back… (65-69.6) …and a GINORMOUS
// tsunami appears out of nowhere behind Tower Bridge (the meme). Loop end card + Follow for more (69.6-75).
import * as THREE from 'three';
import { createRenderer, Overlay, W, H, rng, smooth, clamp, captionAt, hudK } from '../engine/core.js';
import { loadTex } from '../engine/assets.js';
import { makeSpace6, geoDir } from '../engine/space6.js';
import { makeEndTag } from '../engine/endtag.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { fadeShadowBorders, Sparks, Flare } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { walk, cloneAvatar } from '../engine/poses.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { makeCat } from '../engine/cat.js';
import { makeGull } from '../engine/beach.js';
import { S7, makeTsunami } from '../engine/sf7.js';
import { makeDuskSky } from '../engine/guarapari.js';
import { LB, makeRainSky, makeThames, makeBanks, makeTowerBridge, makeRiverside, makeTowerOfLondon, makeSkyline, cityLightPoints, setTowerWindows } from '../engine/london.js';
import { Rain, lightDrop } from '../engine/rain.js';
import { makeAirliner } from '../engine/airliner.js';
import { makeUmbrella, makeBus, makeCab, makePigeon, makeGoldfishBall, makeGull2 } from '../engine/props15.js';
import { T, T_CUT1, DUR, HERO, PLANE_Z, heroZ, heroDist, story, storyRate, planeAt, planePitch, hook, glide, instant, plane as planeCam, back, glideOn, waveCam } from './ep15cams.js';

const TITLE = 'What if air became <span class="k">as thick as honey</span> for 5 seconds?';
const CAPTIONS = [
  [3.75, 7.0, 'Tower Bridge, London. Rush hour.'],
  [7.1, 10.8, 'A plane passes over every 90 seconds.'],
  [11.1, 14.0, 'Air turns as thick as honey.'],
  [14.1, 16.9, 'The rain stops dead.'],
  [17.0, 19.9, 'You can’t pull in a breath.'],
  [20.0, 22.9, 'Sound dies within a metre.'],
  [23.2, 26.6, 'Every bird in the sky hangs.'],
  [26.7, 29.9, 'Every fuel engine chokes.'],
  [30.0, 32.9, 'But the worst is up there.'],
  [33.3, 36.7, 'Jet engines can’t swallow it.'],
  [36.8, 40.2, 'Every jet on Earth flames out.'],
  [40.3, 43.6, '10,000 planes, all at once.'],
  [44.3, 47.3, '8 billion people. No breath.'],
  [47.4, 50.6, 'At second 5, the air comes back.'],
  [51.0, 54.6, 'Every engine must restart. At once.'],
  [54.7, 58.3, 'In 1982, a 747 lost all 4 engines.'],
  [58.4, 61.95, 'Still want to fly home tonight?'],
  [62.0, 65.0, 'And then the water falls back…'],
  [65.05, 69.6, '…and a <span style="color:#ff2e2e">GINORMOUS TSUNAMI</span> appears out of nowhere.'],
];
const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; };

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);
  const RK = 0.7 * Number(q.get('rain') ?? 1);                 // rain density (previews can thin it; 0.7: fewer, softer streaks encode cleanly)
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const scene = new THREE.Scene();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const D = LB.DECK;

  // ---- sky, light, haze ----
  const SKY = makeRainSky(); scene.add(SKY.mesh);
  const pm = new THREE.PMREMGenerator(R.renderer);
  const envScene = new THREE.Scene(); envScene.background = new THREE.Color('#141922');
  { const top = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#1a2130', side: THREE.BackSide })); envScene.add(top);
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, c = new THREE.Color(i % 4 === 0 ? '#ffcf96' : i % 3 === 0 ? '#bcd0ff' : '#ffb070').multiplyScalar(0.8 + (i % 5) * 0.35);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(30 + (i * 37) % 60, 6 + (i * 13) % 14), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); p.position.set(Math.cos(a) * 300, 4 + (i * 7) % 25, Math.sin(a) * 300); p.lookAt(0, 10, 0); envScene.add(p); }
    const glowB = new THREE.Mesh(new THREE.CylinderGeometry(300, 300, 30, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color('#5a4232'), side: THREE.BackSide })); glowB.position.y = 8; envScene.add(glowB); }
  const env = pm.fromScene(envScene, 0, 1, 2000).texture;
  scene.environment = env; scene.environmentIntensity = 0.6;
  scene.fog = new THREE.FogExp2('#232b3a', 0.0024);
  const hemi = new THREE.HemisphereLight('#3a4866', '#2a221c', 0.3); scene.add(hemi);
  const sky = new THREE.DirectionalLight('#8090b0', 0.12); sky.position.set(-200, 400, 150); scene.add(sky);
  // the plane's light up there: the dull sky above, London's orange glow from below (aerial shots only)
  const fillUp = new THREE.DirectionalLight('#7585ad', 1.0), fillDn = new THREE.DirectionalLight('#a88a70', 0.55);
  scene.add(fillUp, fillUp.target, fillDn, fillDn.target);

  // ---- the set ----
  const river = makeThames(R.renderer, { ssaa: globalThis.SSAA }); scene.add(river.mesh);
  scene.add(makeBanks(river.edges));
  const TB = makeTowerBridge(); scene.add(TB.group);
  const RS = makeRiverside(); scene.add(RS.group);
  scene.add(makeTowerOfLondon());
  const SKL = makeSkyline(); scene.add(SKL);
  // the lamps nearest the action are real lights; the rest glow (emissive) and light the rain
  const lampLights = TB.lamps.filter((p) => p.x > 0 && Math.abs(p.z - HERO.z) < 34).sort((a, b) => Math.abs(a.z - HERO.z) - Math.abs(b.z - HERO.z)).slice(0, 4)
    .concat(TB.lamps.filter((p) => p.x < 0 && Math.abs(p.z - HERO.z) < 20).slice(0, 2));
  const lampL = lampLights.map((p) => { const l = new THREE.PointLight('#ffd3a0', 14, 26, 2); l.position.copy(p).add(V(0, -0.25, 0)); scene.add(l); return l; });
  // the lamp over you throws the only hard shadow (yours, the umbrella's)
  const keyL = new THREE.SpotLight('#ffd3a0', 34, 30, 0.9, 0.6, 2); keyL.castShadow = true; keyL.shadow.mapSize.set(2048, 2048); keyL.shadow.bias = -0.0004; keyL.shadow.normalBias = 0.02;
  { const lp = TB.lamps.filter((p) => p.x > 0).sort((a, b) => Math.abs(a.z - (HERO.z + 9)) - Math.abs(b.z - (HERO.z + 9)))[0]; keyL.position.copy(lp).add(V(-0.2, -0.3, 0)); keyL.target.position.set(HERO.x - 0.3, D + 0.8, HERO.z); }
  scene.add(keyL, keyL.target);
  const faceL = new THREE.PointLight('#ffd8b0', 3.0, 5, 2); scene.add(faceL);           // bounce off the wet pavement in front of you
  // floodlights on the towers' faces (the stone shader's flood term does the wash; these light the deck near them)
  for (const z of [-LB.TZ, LB.TZ]) for (const s of [-1, 1]) { const l = new THREE.PointLight('#ffd9a8', 16, 40, 2); l.position.set(s * 15, D + 1.5, z + Math.sign(z) * (LB.THZ + 2)); scene.add(l); }
  // London's lights for the aerial shots
  const CLP = cityLightPoints(Number(q.get('citylights') ?? 90000));
  const cityL = new Sparks(CLP.length, { minPx: 1.6, maxPx: 7, near: 60, additive: true });
  CLP.forEach(([x, y, z, r, g, b, s], i) => cityL.set(i, x, y, z, 0, 0, 0, r * 1.6, g * 1.6, b * 1.6, s * 4, -1e6, 1e7, i * 0.618 % 1));
  cityL.commit(); scene.add(cityL.points);

  const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 20000); cam.layers.enable(1); const camB = cam.clone();

  // ---- the plane (and a second one far off, landing lights only, descending toward Heathrow in the glide) ----
  const AP = makeAirliner(); scene.add(AP);
  const AP2 = makeAirliner(); AP2.scale.setScalar(1); scene.add(AP2);
  const apGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new Flare().glowTex, color: new THREE.Color(3, 2.8, 2.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  apGlow.scale.setScalar(60); scene.add(apGlow);

  // ---- space (44-50) and the end card's Follow for more (rule 20) ----
  const [day, night, cloudsTex] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false)]);
  const SPc = makeSpace6({ day, night, clouds: cloudsTex });
  SPc.U.uSun.value.copy(geoDir(-9.5, -76));                  // 17:04 UTC on 17 October: the Sun over Peru, setting in London
  const LON = geoDir(51.5, -0.1), camDirS = LON.clone().addScaledVector(geoDir(25, -30), 0.5).normalize();
  const camS = new THREE.PerspectiveCamera(30, W / H, 0.1, 9000); camS.setViewOffset(W, H, 0, -260, W, H);
  // every plane in the sky (about 10,000) as a red dot: dense over Europe, the North Atlantic tracks, the US, Asia
  const pr = rng(909), PN = 10000, planesS = new Sparks(PN, { minPx: 1.6, maxPx: 4, near: 0.01, additive: true });
  const HUBS = [[50, 5, 9, 14, 0.24], [52, -30, 6, 22, 0.1], [40, -90, 9, 22, 0.24], [30, 115, 10, 20, 0.16], [25, 50, 8, 14, 0.06], [-10, 130, 12, 20, 0.04], [0, 20, 20, 30, 0.06], [-20, -55, 12, 15, 0.05], [15, 78, 8, 10, 0.05]];
  for (let i = 0; i < PN; i++) { let u = pr(), h = HUBS[0]; for (const hb of HUBS) { if (u < hb[4]) { h = hb; break; } u -= hb[4]; }
    const la = h[0] + (pr() + pr() - 1) * h[2], lo = h[1] + (pr() + pr() - 1) * h[3], p = geoDir(la, lo).multiplyScalar(1.006);
    planesS.set(i, p.x, p.y, p.z, 0, 0, 0, 6, 0.5, 0.4, 0.007, -1e6, 1e7, pr()); }
  planesS.commit(); SPc.scene.add(planesS.points);
  const tag = makeEndTag({ text: 'Follow for more' });

  // ---- you: walking south on the east pavement with your umbrella ----
  const you = await loadAvatar('Male_Adult_12', { env, facial: true }); scene.add(you.root);
  const umb = makeUmbrella(); scene.add(umb);
  // ---- Apple, sitting on the east parapet as you walk past him (glide B, then small behind you on the bridge shots) ----
  const apple = makeCat(); apple.root.position.set(LB.PARA + 0.17, D + 1.21, 57.5); apple.root.rotation.y = -Math.PI * 0.3; scene.add(apple.root);
  // ---- the WTF: a goldfish swimming in a ball of water hanging in the air beside you (where did its bowl go?) ----
  const fishB = makeGoldfishBall(); fishB.scale.setScalar(0.85); scene.add(fishB);
  const FISH0 = V(7.85, 10.6, 63.3);             // in the hook's frame, outside the instant take's first frame, 200+ px clear of your face in the orbit
  // ---- the pigeon (over the parapet) and gulls over the river, hanging mid-flap ----
  const pig = makePigeon(); pig.scale.setScalar(1.05); scene.add(pig);
  const PIG0 = V(6.6, 11.0, 61.2);
  const gulls = []; { const gr = rng(55); for (let i = 0; i < 9; i++) { const gl = makeGull(); gl.scale.setScalar(1.6); gl.position.set(18 + gr() * 70, 14 + gr() * 16, 10 + gr() * 110); gl.rotation.y = gr() * 6.28; gl.userData.ph = gr(); gl.userData.y0 = gl.position.y; scene.add(gl); gulls.push(gl); } }
  // a flock crossing the bridge above the lamps (gulls and pigeons): they fly until the air turns thick, then hang mid-flap
  // in front of the crane (22.5-33 s), which rises over them; kept 2.5 m from every camera that passes them
  const flock = []; { const fr = rng(77), cc = cam.clone(), cams = [];
    for (let t = 3.6; t <= 33; t += 0.1) { (t < T.THICK ? glide : instant).apply(cc, t); cams.push([t, cc.position.clone()]); }
    const at = (b, ph, out) => out.copy(b.userData.p0).addScaledVector(b.userData.v, Math.min(ph, 0)).add(V(0, -0.25 * Math.min(Math.max(ph, 0), 5), 0));
    const tmpF = V(0, 0, 0);
    for (let n = 0; flock.length < 30 && n < 4000; n++) {
      const p0 = V(-2 + fr() * 14, 14 + fr() * 5, 54 + fr() * 18), sp = 7 + 4 * fr(), dir = fr() < 0.5 ? 1 : -1, v = V(dir * sp, 0, (fr() - 0.5) * 2);
      const b = { userData: { p0, v } };
      if (cams.some(([t, c]) => at(b, story(t), tmpF).distanceTo(c) < 2.5) || flock.some((o) => o.userData.p0.distanceTo(p0) < 1.4)) continue;
      const isG = true, m = makeGull2(); m.scale.setScalar(1.05);
      m.rotation.set(fr() * 0.2 - 0.1, isG ? Math.atan2(-v.z, v.x) : Math.atan2(v.x, v.z), fr() * 0.4 - 0.2); const f0 = [0.04, 0.5, 0.96][Math.floor(fr() * 3)] + (fr() - 0.5) * 0.12;   // frozen with the wings near level (|a| < 0.35): they read as birds from above
      Object.assign(m.userData, { p0, v, isG, k0: ((f0 - T.THICK * 2.2) % 1 + 1) % 1 });   // gulls fly along +x, pigeons along +z
      scene.add(m); flock.push(m); }
    flock.at = at; }
  // ---- people on the pavements (some with umbrellas) ----
  const crowdN = ['Female_Adult_02', 'Business_Male_02', 'Female_Adult_08', 'Male_Adult_05', 'Sports_Female_01', 'Female_Adult_06'];
  const crowd = []; for (const n of crowdN) { const a = await loadAvatar(n, { env, lod: 512 }); crowd.push(a); }
  const peds = [];
  for (const [x, z0, dir, k, um] of [[7.6, 30, 1, 0, 0], [7.0, 92, -1, 1, 1], [-7.4, 56, -1, 2, 1], [-7.0, 72, 1, 3, 0], [-7.6, 20, 1, 4, 1], [7.8, 104, -1, 5, 0], [-7.2, 98, -1, 1, 0], [7.2, 12, 1, 2, 1]]) {
    const av = cloneAvatar(crowd[k], skClone); scene.add(av.root);
    const u = um ? makeUmbrella() : null; if (u) scene.add(u);
    peds.push({ av, x, z0, dir, v: 1.15 + 0.1 * k % 0.3, stride: 0.66 + 0.02 * k, u, ph: k * 0.37 });
  }
  // ---- traffic (driving on the left): the bus northbound on the west half, cabs and a car southbound ----
  const bus = makeBus(); scene.add(bus);
  const cab = makeCab(); scene.add(cab);
  const cab2 = makeCab(); cab2.traverse((o) => { if (o.material && o.material.color && o.material.color.getHex() === 0x0b0b0c) { o.material = o.material.clone(); o.material.color.set('#3c4146'); } }); scene.add(cab2);
  const VEH = [
    { m: bus, x: -3.0, z0: 74, dir: -1, v0: 8.5, hl: bus.userData.headlights },
    { m: cab, x: 3.0, z0: 45, dir: 1, v0: 9.5, hl: cab.userData.headlights },
    { m: cab2, x: 3.0, z0: 8, dir: 1, v0: 10, hl: cab2.userData.headlights },
  ];
  const vehZ = (v, ph) => { if (ph <= 0) return v.z0 + v.dir * v.v0 * ph; const tb = 0.7, a = 2.6;   // coasting, then braking
    const s = ph < tb ? v.v0 * ph - 0.15 * ph * ph : v.v0 * tb - 0.15 * tb * tb + (v.v0 * (ph - tb) - 0.5 * a * (ph - tb) ** 2);
    const tStop = tb + v.v0 / a, sMax = v.v0 * tb - 0.15 * tb * tb + v.v0 * v.v0 / (2 * a); return v.z0 + v.dir * (ph >= tStop ? sMax : s); };
  const headL = []; for (let i = 0; i < 6; i++) { const l = new THREE.SpotLight('#fff3e0', 40, 45, 0.45, 0.5, 2); scene.add(l, l.target); headL.push(l); }

  // ---- frozen spray (extra visual): tyre spray thrown up behind the traffic and splash crowns round your feet. Sparks on
  // the story clock, held still while the air is thick (their clock: ph before, 0 during, ph - 5 after), so the spray
  // hangs where it was, lit red by the tail lights, then falls when the air comes back ----
  const sr = rng(808), SPN = Math.round(52000 * RK), spray = new Sparks(SPN, { minPx: 1.6, maxPx: 8, near: 0.35, additive: true });
  let si = 0;
  const wheels = (v) => (v.m === bus ? [[-1.12, 3.2], [1.12, 3.2], [-1.12, -3.0], [1.12, -3.0]] : [[-0.86, 1.55], [0.86, 1.55], [-0.86, -1.45], [0.86, -1.45]]);
  const perW = Math.floor(SPN * 0.72 / (VEH.length * 4));
  for (const v of VEH) for (const [wx, wz] of wheels(v)) for (let k = 0; k < perW; k++) {
    const tb = -(sr() < 0.7 ? sr() * 1.0 : 1.0 + sr() * 3.0);                 // born in the last 4 s, densest in the last one
    const sx = v.dir > 0 ? wx : -wx, x = v.x + sx + Math.sign(sx) * 0.1 * sr(), z = vehZ(v, tb) + v.dir * (wz - 0.35);
    const rear = wz < 0, red = rear && sr() < 0.6, c = (0.7 + 0.9 * sr()) * (rear ? 1.0 : 0.8);
    const col = (red ? [2.6 * c, 0.32 * c, 0.24 * c] : rear ? [1.3 * c, 1.0 * c, 0.75 * c] : [1.6 * c, 1.6 * c, 1.5 * c]).map((v) => v * 3);
    spray.set(si++, x, D + 0.06, z, Math.sign(sx) * (0.4 + 2.2 * sr()), 1.2 + 3.4 * sr(), v.dir * v.v0 * (0.12 + 0.4 * sr()) + (sr() - 0.5) * 0.6,
      col[0], col[1], col[2], 0.0014 + 0.0026 * sr(), tb, 0.9 + 0.5 * sr(), sr());
  }
  // splash crowns on the pavement and the road round you: each a ring of beads leaving the point where a drop hit
  while (si < SPN - 9) {
    const x = -5.8 + sr() * 14.9, z = HERO.z - 9 + sr() * 18; if (Math.hypot(x - HERO.x, z - HERO.z) < 0.7) continue;
    const tb = -0.01 - sr() * 0.12, n = 7 + Math.floor(sr() * 3), sp = 0.55 + 0.6 * sr(), up = 0.8 + 0.7 * sr(), c = 0.6 + 0.8 * sr();
    for (let k = 0; k < n; k++) { const a = (k / n) * 6.283 + sr() * 0.4; spray.set(si++, x, D + 0.02, z, Math.cos(a) * sp, up * (0.8 + 0.4 * sr()), Math.sin(a) * sp, 1.1 * c, 1.0 * c, 0.85 * c, 0.0007 + 0.0009 * sr(), tb, 0.35, sr()); }
  }

  // ---- the rain: near you, over the bridge, round the plane ----
  const rr = rng(4242), lightsForRain = TB.lamps.map((p) => ({ p, c: [1.0, 0.78, 0.5], k: 16 }))
    .concat([-LB.TZ, LB.TZ].map((z) => ({ p: V(0, D + 12, z), c: [1, 0.85, 0.65], k: 260 })));
  const AMB = [0.16, 0.18, 0.24];
  const surf = (x, z) => (Math.abs(x) < LB.PARA + 0.4 && Math.abs(z) < LB.SHORE + 30 ? D : Math.abs(z) > LB.BANK ? LB.STREET : 0.0);
  const NN = Math.round(150000 * RK), NM = Math.round(110000 * RK), NP = Math.round(150000 * RK), NG = Math.round(90000 * RK);
  const rain = new Rain(NN + NM + NP + NG + Math.round(70000 * RK)); let ri = 0;
  const shelter = (x, y, z) => Math.hypot(x - HERO.x, z - (HERO.z + 0.05)) < 0.62 && y < D + 2.35;   // under your umbrella: no rain
  for (let i = 0; i < NN; i++) {   // near you: denser close in
    const a = rr() * 6.283, d = 0.35 + 15 * Math.pow(rr(), 1.6), x = HERO.x + Math.cos(a) * d, z = HERO.z + Math.sin(a) * d * 1.3, y = D + 0.05 + rr() * 12;
    if (shelter(x, y, z)) continue; const yb = surf(x, z); if (y < yb + 0.05) continue;
    const c = lightDrop(V(x, y, z), lightsForRain, AMB), rad = 0.0006 + 0.0011 * rr() * rr(), gl = 0.35 + 1.6 * Math.pow(rr(), 3);
    rain.set(ri++, x, y, z, yb, Math.max(yb + 4, D + 14), rad, c[0] * gl, c[1] * gl, c[2] * gl, rr());
  }
  for (let i = 0; i < Math.round(70000 * RK); i++) {   // heavy rain close round you: bigger drops, the close-ups shimmer
    const a = rr() * 6.283, d = 0.45 + 3.6 * Math.sqrt(rr()), x = HERO.x + Math.cos(a) * d, z = HERO.z + 0.5 + Math.sin(a) * d, y = D + 0.1 + rr() * 3.4;
    if (shelter(x, y, z) || Math.hypot(x - FISH0.x, y - FISH0.y, z - FISH0.z) < 0.22) continue;
    const c = lightDrop(V(x, y, z), lightsForRain, AMB), rad = 0.0009 + 0.0016 * rr() * rr(), gl = 0.5 + 1.8 * Math.pow(rr(), 3);
    rain.set(ri++, x, y, z, D, D + 14, rad, c[0] * gl, c[1] * gl, c[2] * gl, rr());
  }
  for (let i = 0; i < NM; i++) {   // the bridge and the river
    const x = -140 + rr() * 280, z = -180 + rr() * 360, yb = surf(x, z), y = yb + rr() * (72 - yb);
    const c = lightDrop(V(x, y, z), lightsForRain, AMB), rad = 0.0007 + 0.0012 * rr(), gl = 0.3 + 1.6 * Math.pow(rr(), 3);
    rain.set(ri++, x, y, z, yb, 74, rad, c[0] * gl, c[1] * gl, c[2] * gl, rr());
  }
  for (let i = 0; i < NP; i++) {   // round the plane in the hook and the plane take (air columns: fade at both ends)
    const u = rr(), pc = planeAt(1.6 + 2.0 * u), x = pc.x - 45 + rr() * 90, y = pc.y - 22 + rr() * 44, z = PLANE_Z - 32 + rr() * 64;
    const rad = 0.0016 + 0.0014 * rr(), gl = 0.6 + 1.4 * Math.pow(rr(), 2); rain.set(ri++, x, y, z, y - 80, y + 80, rad, 0.55 * gl, 0.5 * gl, 0.48 * gl, 2 + rr());   // lit from below by the city
  }
  for (let i = 0; i < NG; i++) {   // round the plane gliding on (falling again)
    const u = rr(), pc = planeAt(10 + 6.5 * u), x = pc.x - 50 + rr() * 100, y = pc.y - 25 + rr() * 55, z = PLANE_Z - 35 + rr() * 70;
    const rad = 0.0014 + 0.0012 * rr(); rain.set(ri++, x, y, z, y - 60, y + 60, rad, 0.4, 0.38, 0.36, 2 + rr());
  }
  rain.geo.instanceCount = ri; rain.commit(); scene.add(rain.mesh);
  console.log('rain drops', ri);
  await Promise.all(TEX_PENDING);

  // ---- the meme ending: a wall of water 400 m tall coming up the Thames from the sea, out of nowhere (post 7's tsunami) ----
  const waveSky = makeDuskSky(V(1, 0.06, 0.1).normalize(), { zen: '#0b1424', hor: '#27324a', belt: '#33384f', shade: '#161d2c', sunCol: '#9fb4d8' });
  waveSky.material.uniforms.uDisk.value = 0; waveSky.material.uniforms.uSkyI.value = 0.7;
  waveSky.material.uniforms.uSun.value.set(0, 0.3, 1).normalize();   // no sun at night: the face stays green-black, foam and crest catch the city glow
  const wave = makeTsunami(waveSky); wave.mesh.visible = false; scene.add(wave.mesh);
  S7.uFogC.value.set('#1f2533'); S7.uFogD.value = 0.00028; S7.uLevel.value = 0;

  // the camera of every London shot as a function of time; the shot id changes only at the hard cuts
  const shotId = (tt) => (tt < T.HOOK ? 0 : tt < T_CUT1 ? 1 : tt < T.PLANE ? 2 : tt < T.SPACE ? 3 : tt < T.BACK2 ? 4 : tt < T.RET2 ? 5 : tt < T.MEME ? 6 : 7);
  const camAt = (c, tt) => { if (tt < T.HOOK) hook.apply(c, tt); else if (tt < T.THICK) glide.apply(c, tt); else if (tt < T.PLANE) instant.apply(c, tt);
    else if (tt < T.SPACE) planeCam.apply(c, tt); else if (tt < T.RET2) back.apply(c, tt); else if (tt < T.MEME) glideOn.apply(c, tt); else waveCam.apply(c, tt); };

  // ---- posing (a pure function of time) ----
  const blinkK = (t, list) => { let k = 0; for (const b0 of list) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  const tmpA = V(0, 0, 0), tmpB = V(0, 0, 0), tmpC = V(0, 0, 0), tmpD = V(0, 0, 0);
  const wp = (b) => b.getWorldPosition(V(0, 0, 0));
  // your walk slows in the thick air (like wading) and stops; your chest heaves trying to breathe; after second 5 a gasp
  function holdUmbrella(av, u, grip) {
    // the hand: in front of the right shoulder; the umbrella's shaft passes through the fist, tilted back over the head
    return (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(up, -0.3).addScaledVector(fwd, 0.24).addScaledVector(left, 0.07 + grip * 0),
      pole: sh.clone().addScaledVector(up, -0.55).addScaledVector(left, -0.45).addScaledVector(fwd, -0.1), curl: 0.82 });
  }
  function placeUmbrella(av, u, side = 'Right') {
    const B = av.bones, i1 = wp(B[side + 'HandIndex1'] || B[side + 'Hand']), p1 = wp(B[side + 'HandPinky1'] || B[side + 'Hand']), m1 = wp(B[side + 'HandMiddle1'] || B[side + 'Hand']), hd = wp(B[side + 'Hand']);
    const out = tmpA.copy(i1).sub(p1).cross(tmpB.copy(m1).sub(hd)).normalize(); if (side === 'Left') out.negate();
    const fist = tmpC.copy(i1).add(p1).multiplyScalar(0.5).lerp(m1, 0.5).addScaledVector(out, -0.035).addScaledVector(tmpD.copy(m1).sub(hd).normalize(), 0.015);
    // axis: up, leaning back toward the body and in toward the head
    const fwd = V(0, 0, 1).applyQuaternion(av.root.quaternion), axis = V(0, 1, 0).addScaledVector(fwd, -0.2).normalize();
    u.position.copy(fist).addScaledVector(axis, -0.08);
    u.quaternion.setFromUnitVectors(V(0, 1, 0), axis);
    u.updateMatrixWorld(true);
  }
  function poseAll(t, ph) {
    // you
    const z = ph <= 0 ? heroZ(Math.min(t, T.THICK)) : HERO.z + heroDist(ph), dist = (z - (HERO.z - 1.3 * 7.4));
    const live = clamp(1 - ph / 0.9, 0, 1);
    walk(you, { pos: V(HERO.x, D, z), yaw: 0, phase: dist / (2 * 0.68), stride: 0.68 * (0.35 + 0.65 * live), look: V(HERO.x - 0.3, D + 1.6, z + 8), lookK: 0.5,
      armR: holdUmbrella(you, umb, 0) });
    // trying to breathe in the thick air: shoulders rise, the chest heaves against nothing, the head tilts up; a gasp at 5 s
    const B = you.bones;
    if (ph > 0.15) { const k = smooth(0.15, 0.6, ph) * (ph < 5 ? 1 : Math.exp(-(ph - 5) * 1.2)), hv = 0.5 + 0.5 * Math.sin(ph * 9.0);
      if (B.Spine2) B.Spine2.rotateX(-0.05 * k * hv); if (B.Neck) B.Neck.rotateX(-0.08 * k); if (B.Head) B.Head.rotateX(-0.06 * k * (0.6 + 0.4 * hv));
      if (B.LeftShoulder) B.LeftShoulder.rotateZ(0.06 * k * hv); if (B.RightShoulder) B.RightShoulder.rotateZ(-0.06 * k * hv); }
    if (ph > 5) { const g = Math.exp(-(ph - 5) * 1.4) * smooth(5.0, 5.15, ph); if (B.Spine1) B.Spine1.rotateX(-0.1 * g); if (B.Head) B.Head.rotateX(-0.12 * g); }
    if (you.jaw) you.jaw(ph > 0.2 ? 0.35 * smooth(0.2, 0.7, ph) + (ph > 5 ? 0.4 * Math.exp(-(ph - 5) * 1.5) : 0) : 0);
    if (you.blink) you.blink(blinkK(t, [5.0, 8.4, 10.3, 52.8, 55.1]) * (ph > 0.1 && ph < 5 ? 0 : 1));
    you.root.updateMatrixWorld(true);
    placeUmbrella(you, umb);
    // the others: walking until the air thickens, then slowing to a stop (breathing hard)
    for (const p of peds) {
      const s = ph <= 0 ? p.v * ph : p.v * (1 - Math.exp(-1.6 * ph)) / 1.6, zz = p.z0 + p.dir * s;
      walk(p.av, { pos: V(p.x, D, zz), yaw: p.dir > 0 ? 0 : Math.PI, phase: p.ph + (p.dir * (zz - p.z0) + 30) / (2 * p.stride), stride: p.stride * (ph > 0 ? 0.35 + 0.65 * clamp(1 - ph / 0.9, 0, 1) : 1),
        armR: p.u ? holdUmbrella(p.av, p.u, 0) : undefined });
      p.av.root.updateMatrixWorld(true);
      if (p.u) placeUmbrella(p.av, p.u);
    }
  }

  // frozen drips: strings of beads hanging under the back half of your umbrella's rim, where they were rolling off it at
  // the instant the air turned thick (placed from the umbrella's pose at that instant; they stay where they were)
  poseAll(T.THICK, 0); umb.updateMatrixWorld(true);
  { const fwd = V(0, 0, 1);
    for (let k = 0; k < 16 && si < SPN; k++) { const a = (k / 16) * 6.283, tip = V(Math.cos(a) * 0.515, 0.66, Math.sin(a) * 0.515).applyMatrix4(umb.matrixWorld);
      if (tip.clone().sub(umb.position).dot(fwd) > -0.05) continue;                         // the back half only (you move forward)
      const n = 4 + Math.floor(sr() * 6), gap = 0.05 + 0.06 * sr();
      for (let j = 0; j < n && si < SPN; j++) { const c = 1.6 + 1.2 * sr(); spray.set(si++, tip.x + (sr() - 0.5) * 0.01, tip.y - 0.012 - j * gap * (1 + 0.25 * j), tip.z + (sr() - 0.5) * 0.01, 0, 0, 0, c, c * 0.97, c * 0.92, 0.0018 + 0.0012 * sr(), -1e6, 1e7, sr()); } } }
  spray.geo.setDrawRange(0, si); spray.commit(); spray.u.uDrag.value = 1.2; spray.u.uAcc.value.set(0, -9.8, 0); spray.u.uAccT0.value = -1e9; spray.u.uAccVar.value = 0;
  scene.add(spray.points);

  function hudAt(t, ph) {
    const k = hudK(t, T.THICK);
    if (t < T.THICK) return { a: 1, k, lab: 'Air turns as thick as honey in', val: fmtT(T.THICK - t), sub: 'Tower Bridge, London · 6:04 pm', sub2: 'Honey ≈ 500,000 × thicker than air' };
    if (t < T.END) {
      const val = ph.toFixed(2) + ' s';
      if (t >= T.MEME) return { a: 1 - smooth(T.END - 0.3, T.END, t), k, lab: 'Time since the air turned thick', val, sub: t < T.WAVE ? 'The Thames is draining' : 'Out of nowhere', sub2: t < T.WAVE ? 'River level: −4 m' : 'Wave height: ~400 m' };
      if (t >= T.BACK) return { a: 1 - smooth(T.END - 0.3, T.END, t), k, lab: 'Time since the air turned thick', val, sub: t < 54.7 ? 'Second 5: the air is back' : 'British Airways 9 · 24 June 1982', sub2: t < 54.7 ? 'Engines to restart: ~10,000' : 'All 4 engines out in volcanic ash' };
      const sub = t < T.BRIDGE ? 'Raindrops falling at 0.2 mm/s' : t < T.PLANE ? 'Fuel engines: choking' : t < T.SPACE ? '1,250 m over Tower Bridge' : 'Planes in the air: ~10,000';
      return { a: 1, k, lab: 'Time since the air turned thick', val, sub, sub2: 'Second 5: ???' };
    }
    return null;
  }

  function frame(t) {
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.04; U.uContrast.value = 1.06; U.uVignette.value = 0.36; U.uAberr.value = 0.0012; U.uGrain.value = 0;
    U.uWarp.value = 0; U.uHeatA.value = 0; U.uBarrel.value = 0;
    const ph = story(t), rate = storyRate(t);
    let rscene = scene, rc = cam;
    LB.U.uTime.value = ph; SKY.U.uTime.value = t;
    river.U.uT.value = ph; river.U.uTf.value = 0; river.U.uTb.value = 5;
    rain.u.uTf.value = 0; rain.u.uTb.value = 5; rain.u.uFocus.value = 4; rain.u.uAper.value = 0; rain.u.uGain.value = ph > 0 && ph < 5 ? 2.2 : 1.4; rain.u.uFade.value = 1;
    setTowerWindows(0.0);
    if (t >= T.SPACE && t < T.BACK2) {
      // ---------------- space: Europe at dusk, every plane a red dot ----------------
      rscene = SPc.scene; rc = camS;
      const u = clamp((t - T.SPACE) / (T.BACK2 - T.SPACE)), S = SPc.U;
      S.uLights.value = 1; S.uClouds.value = 1; S.uCloudLow.value = 0; S.uLandW.value = 0; S.uSeaW.value = 0; S.uAtm.value = 1; S.uTime.value = t;
      if (S.uSmear) S.uSmear.value = 0; if (S.uDust) S.uDust.value = 0;
      const dir = camDirS.clone().applyAxisAngle(V(0, 1, 0), -0.05 * u);
      camS.position.copy(dir).multiplyScalar(4.6 - 0.35 * smooth(0, 1, u)); camS.up.set(0, 1, 0); camS.lookAt(LON.clone().multiplyScalar(0.55)); camS.updateMatrixWorld();
      SPc.stars.u.uGain.value = 0.9; SPc.stars.u.uPR.value = R.SSAA;
      planesS.update(t, camS, R.SSAA); planesS.u.uGain.value = 1;
      R.renderer.toneMappingExposure = 1.0; R.bloom.strength = 0.45; R.bloom.radius = 0.6; R.bloom.threshold = 0.95;
      U.uFadeWhite.value = 0.25 * Math.exp(-(t - T.SPACE) * 5);
    } else {
      // ---------------- London ----------------
      const aerial = (t >= T.PLANE && t < T.SPACE) || t >= T.RET2;
      camAt(cam, t);
      if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      SKY.mesh.position.copy(cam.position);
      // the plane
      const pp = planeAt(ph); AP.position.copy(pp); AP.rotation.set(0, Math.PI, 0); AP.rotateZ(planePitch(ph));
      AP.update(t, { phys: ph, out: 0.02, dt: rate / 30, genOff: 2.05, ratAt: 2.4, tauFan: 1.5 });
      AP.visible = (aerial && t < T.MEME) || t < T.THICK;
      // the meme: the Thames drains (the sea pulls back), then the wave shoots up out of nowhere on the hit
      const drain = t >= T.MEME ? smooth(T.MEME + 0.3, T.WAVE - 0.4, t) : 0; river.mesh.position.y = -4 * drain; river.U.uRefl.value = 1 - 0.45 * drain;
      wave.mesh.visible = t >= T.WAVE; if (t >= T.WAVE) { const u = t - T.WAVE; S7.uTime.value = t; wave.U.uFront.value = 1050 - 95 * u; wave.U.uH.value = 420 * smooth(0, 0.45, u) + 8 * u; }
      fillUp.position.copy(pp).add(V(-60, 200, 80)); fillUp.target.position.copy(pp); fillDn.position.copy(pp).add(V(40, -300, 60)); fillDn.target.position.copy(pp);
      // the far plane (glide only): landing lights descending toward Heathrow in the west
      AP2.visible = t >= T.HOOK && t < T.THICK; { const u = t - T.HOOK; AP2.position.set(-1500 - 70 * u, 520 - 3.7 * u, -420); AP2.rotation.set(0, Math.PI, 0); AP2.update(t, { phys: -5, out: 1e9 }); apGlow.position.copy(AP2.position).add(V(-18, -1, 0)); apGlow.visible = AP2.visible; }
      poseAll(t, ph);
      faceL.position.set(HERO.x - 0.25, D + 1.15, you.root.position.z + 1.3); faceL.visible = !aerial;
      apple.update(t, { look: cam.position, blinkAt: [7.6, 9.9], earAt: [8.6], pr: R.SSAA }); apple.root.visible = !aerial && t >= T_CUT1;
      // the goldfish and the pigeon: hanging, sinking very slowly (Stokes); visible on the bridge shots only
      const tf = Math.max(0, ph - 5);   // when the air comes back the ball of water drops (out of the close shot within half a second)
      fishB.position.copy(FISH0).add(V(0, -0.06 * Math.min(Math.max(0, ph), 5) - 4.9 * tf * tf, 0)); fishB.rotation.set(2.2 * tf * tf, 0.6, 1.5 * tf * tf); fishB.update(t);
      fishB.visible = !aerial && ph > 0 && fishB.position.y > D + 0.35;            // (out of frame when it appears at 11.0: shown by the orbit at ~18 s)
      pig.position.copy(PIG0).add(ph < 0 ? V(-1.5 * ph, 0.3 * ph, 2.0 * ph) : V(0, -0.18 * Math.min(ph, 5), 0)); pig.rotation.set(-0.2, Math.atan2(-1.5, 2.0), 0.1);   // flies in from the river side behind you, freezes mid-flap
      pig.flap(ph <= 0 ? (t * 5.5) % 1 : 0.12 + 0.08 * (1 - Math.exp(-ph * 3))); pig.visible = !aerial && ph > -1.6;
      for (const b of flock) { b.visible = !aerial && t < T.PLANE; flock.at(b, ph, b.position); const tf = Math.min(t, T.THICK), u = b.userData;   // frozen in the pose of the instant the air thickened
        if (u.isG) b.pose(0.7 * Math.sin(((tf * 2.2 + u.k0) % 1) * Math.PI * 2)); else b.flap((tf * 5.5 + u.k0) % 1); }
      for (const gl of gulls) { const s = ph <= 0 ? 0 : -0.25 * Math.min(ph, 5); gl.visible = !aerial; gl.position.y = gl.userData.y0 + s;
        const k = ph <= 0 ? (t * 2.2 + gl.userData.ph) % 1 : gl.userData.ph + 0.02 * Math.min(ph, 5); const a = 0.7 * Math.sin(k * Math.PI * 2); gl.userData.wl.rotation.x = a; gl.userData.wr.rotation.x = -a; }
      // traffic
      const spots = [];
      VEH.forEach((v, i) => { const zz = vehZ(v, ph); v.m.position.set(v.x, D + 0.01, zz); v.m.rotation.y = v.dir > 0 ? 0 : Math.PI; v.m.visible = !aerial; v.m.updateMatrixWorld(true);
        for (let j = 0; j < 2; j++) { const hp = v.hl[j].clone().applyMatrix4(v.m.matrixWorld), dir = V(0, -0.12, 1).applyQuaternion(v.m.quaternion).normalize();
          const L = headL[i * 2 + j]; L.position.copy(hp); L.target.position.copy(hp).addScaledVector(dir, 10); L.visible = !aerial; L.target.updateMatrixWorld();
          spots.push({ p: hp, d: dir, col: new THREE.Color(3.5, 3.3, 3), inner: 0.975, outer: 0.9 }); } });
      // the plane's landing lights in the aerial shots
      if (aerial) { spots.length = 0; AP.spots(spots); }
      rain.setSpots(spots);
      spray.update(ph < 0 ? ph : ph < 5 ? 0 : ph - 5, cam, R.SSAA); spray.points.visible = !aerial;
      const boxes = [{ c: V(HERO.x, D + 1.15, you.root.position.z + 0.05), h: V(0.6, 1.2, 0.6) }];
      for (const v of VEH) boxes.push({ c: v.m.position.clone().add(V(0, v.m === bus ? 2.2 : 1.0, 0)), h: v.m === bus ? V(1.35, 2.25, 5.7) : V(1.0, 1.05, 2.5) });
      for (const p of peds) if (boxes.length < 6 && Math.abs(p.av.root.position.z - HERO.z) < 30) boxes.push({ c: p.av.root.position.clone().add(V(0, 1.1, 0)), h: V(p.u ? 0.6 : 0.3, 1.15, p.u ? 0.6 : 0.3) });
      rain.setBoxes(aerial ? [] : boxes);
      // exposure and haze: the street at the blue hour; the aerial shots see the whole city through less haze
      fillUp.visible = fillDn.visible = aerial;
      if (aerial) { scene.fog.density = 0.00055; scene.fog.color.set('#1f2533'); R.renderer.toneMappingExposure = 1.1; R.bloom.strength = 0.3; R.bloom.radius = 0.6; R.bloom.threshold = 0.95 / 1.1; cityL.points.visible = true; }
      else { scene.fog.density = 0.0024; scene.fog.color.set('#232b3a'); R.renderer.toneMappingExposure = 1.0; R.bloom.strength = 0.22; R.bloom.radius = 0.5; R.bloom.threshold = 1.1; cityL.points.visible = t < T.THICK && t < 6.5; }
      cityL.update(t, cam, R.SSAA);
      river.U.uFogC.value.copy(scene.fog.color); river.U.uFogD.value = scene.fog.density;
      rain.u.uFogC.value.copy(scene.fog.color); rain.u.uFogD.value = scene.fog.density * 0.8;
      // depth of field on the close shots of you: drops near the lens become soft beads
      // (also on the hook and the descent to you, or the drops falling past the lens are thick white bars)
      let aper = 0, focus = 4; const fHero = cam.position.distanceTo(V(HERO.x, D + 1.6, you.root.position.z));
      if (t < T.HOOK || (t >= T_CUT1 && t < T.BRIDGE + 1)) { focus = fHero; aper = 0.008 * (1 - smooth(T.BRIDGE - 1, T.BRIDGE + 1, t)); }
      if (t >= T.BACK2 && t < T.RET2) { focus = fHero; aper = 0.007; rain.u.uStreakK.value = 2.5; } else rain.u.uStreakK.value = 3.2;
      rain.u.uFocus.value = focus; rain.u.uAper.value = aper;
      // flying cameras: the beads streak past (camera motion blur) and catch the landing lights from tens of metres
      // every moving shot: drops and beads are drawn from where the camera of the previous frame saw them (a 360-degree
      // shutter), so nothing jumps across the frame between frames (the flicker check flagged the rain shots without it)
      let camPrev = null; if (!q.get('dcam') && shotId(t - 1 / 30) === shotId(t)) { camPrev = camB; camPrev.copy(cam); camAt(camPrev, t - 1 / 30); }
      rain.u.uAirK.value = aerial ? 4 : 1; rain.u.uNear.value = aerial ? 2.5 : 0.18; rain.u.uNearFall.value = aerial ? 2.5 : 1.2;   // flying: no long streaks across the lens
      rain.update(ph, cam, R.SSAA, W, H, camPrev);
      if (q.get('raindbg')) rain.u.uGain.value *= Number(q.get('raindbg'));

      // lens: a soft punch when the air turns thick (the sound dies), another when it comes back
      const pulse = (x, x0, d) => (x >= x0 && x < x0 + d ? Math.exp(-(x - x0) / (d * 0.35)) : 0);
      U.uBarrel.value = 0.12 * pulse(t, T.THICK, 0.6) - 0.1 * pulse(t, T.BACK, 0.6) + 0.1 * pulse(t, T.WAVE, 0.6);
      U.uAberr.value = 0.0015 + 0.012 * pulse(t, T.THICK, 0.8) + 0.01 * pulse(t, T.BACK, 0.8) + 0.008 * pulse(t, T.PLANE, 0.6) + 0.008 * pulse(t, T.RET2, 0.6) + 0.012 * pulse(t, T.WAVE, 0.8);
      U.uFadeWhite.value = 0.18 * pulse(t, T.PLANE, 0.5) + 0.18 * pulse(t, T.RET2, 0.5);
      if ((t >= T.THICK && t < T.BACK) || t < T.HOOK) { U.uSat.value = 0.98; U.uTint.value.set(0.94, 0.99, 1.07); U.uContrast.value = 1.1; }   // the frozen world, colder
      keyL.shadow.camera.near = 0.5; keyL.shadow.camera.far = 30;
    }
    R.renderPass.scene = rscene; R.renderPass.camera = rc;
    R.composer.render();
    const cover = q.get('cover') === '1', endA = smooth(T.END, T.END + 0.5, t);
    ov.apply({ labels: [], tag: 'WHAT IF &nbsp;·&nbsp; 09', tagA: t < T.END ? 1 : 0, title: { html: TITLE, a: cover ? 1 : t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0, k: 1 },
      hud: cover ? null : hudAt(t, ph), caption: cover ? null : captionAt(CAPTIONS, t),
      end: endA > 0 ? { a: endA, title: TITLE, note: '<span class="q">Still want to fly home tonight?</span><br><br>Honey is ~500,000 × thicker than air<br>About 10,000 planes are flying right now' } : null });
    tag.update(t, T.END + 0.5, endA);
  }
  window.EP = { scene, cam, THREE };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
