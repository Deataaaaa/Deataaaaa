// Post 7: What if the air stopped turning with Earth for 30 seconds? (approved by the owner: POV, the capybara WTF,
// "then the sea pulls back..." and the biggest tsunami). Hook (0-3.6): slow motion, the capybara with an orange on its
// head sitting in the blast. Walk (3.6-11): your eyes on Baker Beach at golden hour, the bridge, the capybara, Apple on
// a rock. Zero (11): a 1,320 km/h wind; behind the log (11-17); the bridge twists and breaks (17-31); space (31-37);
// the capybara and the torn sea (37-41). The wind stops (41); the sea pulls back (41-45); the view from earlier as the
// wave rises and takes the bridge (45-55.5); the wave over you (55.5-60.2); black; end card + Follow for more (62-68).
import * as THREE from 'three';
import { createRenderer, Overlay, W, H, rng, smooth, clamp, captionAt } from '../engine/core.js';
import { loadTex } from '../engine/assets.js';
import { makeSpace6, geoDir } from '../engine/space6.js';
import { makeEndTag } from '../engine/endtag.js';
import { makeDuskSky } from '../engine/guarapari.js';
import { TEX_PENDING, twoBoneIK, orientHand } from '../engine/elevator.js';
import { S7, BV, groundY, makeTerrain7, makeOcean7, makeBridge, makeHouses, makeLog, makeRocks, makeBoat, makeFish, makeKite, makeTsunami } from '../engine/sf7.js';
import { fadeShadowBorders, Sparks, Billboards, Streaks, smokeAtlas, pxScale } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { resetPose, curlFingers, stand } from '../engine/poses.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { makeCat } from '../engine/cat.js';
import { makeCapybara } from '../engine/capy.js';
import { T, DUR, LOG, CAPY, KNEEL, povCam } from './ep13cams.js';

const TITLE = 'What if the air <span class="k">stopped turning</span> with Earth for 30 seconds?';
const SH = { shade: 1 };
const CAPTIONS = [
  [3.75, 6.75, 'Baker Beach, San Francisco.'],
  [6.85, 10.75, 'The air turns with Earth at 1,320 km/h.'],
  [11.15, 14.5, 'Now it stops. The ground doesn’t.', SH],
  [14.6, 18.4, 'A 1,320 km/h wind, everywhere at once.', SH],
  [18.5, 22.3, 'Strongest gust ever measured: 408 km/h.', SH],
  [22.4, 26.65, 'In 1940, a 64 km/h wind tore a bridge apart.', SH],
  [26.75, 30.5, 'This one is 20 times stronger.', SH],
  [31.1, 35.1, 'Every coast on Earth is blasted at once.', SH],
  [35.2, 40.0, 'The wind shoves the ocean away from the shore.', SH],
  [41.3, 44.6, 'Then the sea pulls back…', SH],
  [45.4, 49.2, '…and all of it comes back at once.', SH],
  [49.3, 52.4, 'Taller than the Golden Gate’s towers.', SH],
  [52.5, 56.5, 'Tallest wave ever recorded: 524 m, Alaska, 1958.', SH],
  [56.6, 58.9, 'This one is bigger.', SH],
  [59.0, 61.9, 'Still going to the beach?', SH],
];
const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);
  fadeShadowBorders(0.2);
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const scene = new THREE.Scene();
  // golden hour: the sun 3 degrees above the Pacific to the west-south-west
  const sunDir = V(0.5, 0.055, -0.866).normalize();
  const SKYC = { zen: '#2c5b9e', hor: '#f4c394', belt: '#d9b6a6', shade: '#7c88a6', sunCol: '#ffb36a' };
  const sky = makeDuskSky(sunDir, SKYC); scene.add(sky);
  const pm = new THREE.PMREMGenerator(R.renderer), envScene = new THREE.Scene(); envScene.add(makeDuskSky(sunDir, SKYC));
  const env = pm.fromScene(envScene, 0, 1, 20000).texture; scene.environment = env; scene.environmentIntensity = 0.85;
  scene.fog = new THREE.FogExp2('#d8b89a', 0.00018);
  const hemi = new THREE.HemisphereLight('#bcc8dc', '#a8885e', 0.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffbf80', 3.0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);
  const keyDir = V(0.5, 0.2, -0.866).normalize();
  const setShadow = (c, half) => { sun.target.position.copy(c); sun.position.copy(c).addScaledVector(keyDir, 300); Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 700 }); sun.shadow.camera.updateProjectionMatrix(); sun.target.updateMatrixWorld(); };
  // ---- the set ----
  scene.add(makeTerrain7());
  const ocean = makeOcean7(sky); scene.add(ocean.mesh);
  const BR = makeBridge(); scene.add(BR.group);
  const HO = makeHouses(); scene.add(HO.group);
  const log = makeLog(); log.position.set(LOG.x, groundY(LOG.x, LOG.z) + 0.38, LOG.z); scene.add(log);
  const r0 = rng(77), rocks = [];
  for (let i = 0; i < 40; i++) { const z = -440 + r0() * 1100; rocks.push([-60 - r0() * 8, z, 1 + r0() * 2.5]); }                // under the bluff
  for (let i = 0; i < 70; i++) rocks.push([30 + r0() * 700, -300 + r0() * 700, 1.2 + r0() * 3.5]);                               // offshore (seen once the sea drains)
  rocks.push([1.0, -26.0, 1.1], [3.5, -33.0, 1.4], [6.0, -21.0, 0.9]);                                                             // in the swash; Apple sits on the first
  scene.add(makeRocks(rocks));
  const boatA = makeBoat(); scene.add(boatA); const boatB = makeBoat(); boatB.scale.setScalar(0.9); scene.add(boatB);
  const fish = makeFish(6); fish.forEach((f) => scene.add(f));
  const fishAt = [[8, -31], [10.5, -27.5], [12, -33.5], [14.5, -29], [9.5, -35], [16, -26]];
  const kite = makeKite(); scene.add(kite);
  // ---- the capybara (rule 19's WTF) and Apple on a rock in the swash (calm part only) ----
  // the same capybara (orange and all) flying past in the storm, small and quick, five times: 0:01 (far, in the slow-motion
  // hook), 0:13, 0:21 (in front of the bridge), 0:28 and 0:38 (behind the one still sitting there). Each pass starts and
  // ends outside the frame and never comes closer than ~15 m.
  const flyer = makeCapybara(); flyer.root.visible = false; scene.add(flyer.root);
  const tmpC = new THREE.PerspectiveCamera(55, W / H, 0.05, 30000);
  const PASSES = [[0.4, 3.4, 24.048, [55, 15, 6], 70, 2.6], [12.9, 14.0, 12.9, [34, -14, 9], 26, 5.5], [21.2, 22.0, 21.2, [36, 9.5, 4.5], 24, 6.0],
    [28.4, 29.3, 28.4, [55, 14, 11], 30, 5.0], [38.2, 39.6, 38.2, [40, 14, 7], 26, 5.5]].map(([t0, t1, s0, [f, rt, u], v, spin]) => {
    povCam(tmpC, t0); const fwd = new THREE.Vector3(); tmpC.getWorldDirection(fwd);
    const right = new THREE.Vector3().crossVectors(fwd, V(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    return { t0, t1, s0, p0: tmpC.position.clone().addScaledVector(fwd, f).addScaledVector(right, rt).addScaledVector(up, u), v: BV.clone().multiplyScalar(v).add(V(0, -1.2, 0)), spin };
  });
  const apple = makeCat(); apple.root.position.set(1.0, groundY(1.0, -26.0) - 0.28 + 1.1 * 0.72, -26.0); apple.root.rotation.y = -2.2; scene.add(apple.root);
  // ---- you (first person): a new person (rule 16), head hidden, arms by IK; people far along the beach ----
  const me = await loadAvatar('Male_Adult_03', { env }); scene.add(me.root);
  me.bones.Head.scale.setScalar(0.001);
  me.root.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) { const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, rr) => { if (prev) prev(sh, rr); sh.fragmentShader = sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (length(vViewPosition) < 0.22) discard;'); };
    const k0 = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => ''; m.customProgramCacheKey = () => k0() + '|pov'; } });
  const folk = []; for (const n of ['Female_Adult_02', 'Male_Adult_05', 'Sports_Female_01']) { const a = await loadAvatar(n, { env, lod: 512 }); folk.push(a); }
  const people = [], pr = rng(19);
  for (let i = 0; i < 9; i++) {
    const a = folk[i % 3], x = -22 + pr() * 18, z = 45 + pr() * 190;
    stand(a, { pos: V(0, 0, 0), yaw: 0, breath: pr(), stride: (pr() - 0.5) * 0.9, look: V(0, 1.6, 8) });
    const c = skClone(a.root); c.position.set(x, groundY(x, z), z); c.rotation.y = pr() * 6.28; scene.add(c); people.push(c);
  }
  folk.forEach((a) => { a.root.visible = false; scene.add(a.root); });
  const cam = new THREE.PerspectiveCamera(55, W / H, 0.05, 30000);
  // ---- space (31-37): Earth at San Francisco's sunset, its clouds smeared by the wind, dust off the land ----
  const [day, night, cloudsTex] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false)]);
  const SPc = makeSpace6({ day, night, clouds: cloudsTex });
  SPc.U.uSun.value.copy(geoDir(-8.6, 157.2));   // 18:31 PDT on 15 October = 01:31 UTC: the Sun over the western Pacific
  const SF = geoDir(37.8, -122.5), camDirS = SF.clone().addScaledVector(SPc.U.uSun.value, 0.5).normalize();
  const camS = new THREE.PerspectiveCamera(32, W / H, 0.1, 9000); camS.setViewOffset(W, H, -40, -300, W, H);
  const tag = makeEndTag({ text: 'Follow for more' });
  // ---- effects ----
  const fx = rng(41), smokeT = smokeAtlas(5);
  // sand torn off the beach (streaks low over the sand, toward the sea), debris off the bluff, spray off the sea
  const SN = 9000, sand = new Streaks(SN, { widthPx: 3.2, additive: false });
  for (let i = 0; i < SN; i++) {
    const x = KNEEL.x - 45 + fx() * 50, z = KNEEL.z - 12 + fx() * 60, y = 0.05 + Math.pow(fx(), 2.0) * 2.6, v = 90 + fx() * 110, b = T.ZERO - 0.6 + fx() * 0.6, c = 0.55 + 0.3 * fx();
    sand.set(i, x, y + Math.max(0, groundY(x, z)), z, BV.x * v, (fx() - 0.4) * 4, BV.z * v, c * 0.72, c * 0.6, c * 0.44, 0.7 + 0.6 * fx(), b, 0.6, fx());
  }
  sand.commit(); sand.u.uLoop.value = 0.6; sand.u.uSpread.value = 0.15; scene.add(sand.mesh);
  const DN = 2600, debris = new Streaks(DN, { widthPx: 3.4, additive: false });
  for (let i = 0; i < DN; i++) {
    const z = -110 + fx() * 160, x = -95 - fx() * 70, y = 22 + fx() * 30, v = 100 + fx() * 110, b = T.ZERO + 0.2 + fx() * 1.6, c = 0.18 + 0.2 * fx();
    debris.set(i, x, y, z, BV.x * v, -8 - fx() * 10, BV.z * v, c * 1.1, c * 0.95, c * 0.8, 0.9 + 0.8 * fx(), b, 1.6, fx());
  }
  debris.commit(); debris.u.uLoop.value = 1.6; debris.u.uSpread.value = 0.2; scene.add(debris.mesh);
  const PN = 5000, spray = new Streaks(PN, { widthPx: 1.8 });
  for (let i = 0; i < PN; i++) {
    const x = -5 + fx() * 260, z = -150 + fx() * 240, y = 0.4 + Math.pow(fx(), 1.6) * 9, v = 140 + fx() * 120, b = T.ZERO + fx() * 1.4, c = 0.75 + 0.25 * fx();
    spray.set(i, x, y, z, BV.x * v, 1 + fx() * 3, BV.z * v, c, c, c * 0.97, 0.8 + 0.6 * fx(), b, 1.4, fx());
  }
  spray.commit(); spray.u.uLoop.value = 1.4; spray.u.uSpread.value = 0.5; scene.add(spray.mesh);
  // dust clouds streaming past (lit cards), wrapped through a box round the kneeling spot, faded at the box's ends
  const DCN = 70, dust = new Billboards(DCN, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 2 });
  dust.u.uLitCol.value.set('#e6c49a'); dust.u.uShadeCol.value.set('#8a7058'); dust.u.uFogD.value = 0;
  const dustP = []; for (let i = 0; i < DCN; i++) dustP.push([fx(), -60 + fx() * 90, 1 + fx() * 14, 8 + fx() * 18, 70 + fx() * 60, fx()]);
  scene.add(dust.mesh);
  // the fog under the bridge (calm), torn away at zero
  const FN = 34, fog = new Billboards(FN, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 50 });
  fog.u.uLitCol.value.set('#ffd7c0'); fog.u.uShadeCol.value.set('#9a93b0'); fog.u.uFogD.value = 0;
  const fogP = []; for (let i = 0; i < FN; i++) { const s = -750 + fx() * 1500, qq = -1400 + fx() * 2200; fogP.push([1452.5 + 0.70711 * (s + qq), 18 + fx() * 30, 2052.5 + 0.70711 * (s - qq), 320 + fx() * 260, fx()]); }
  scene.add(fog.mesh);
  // the sand falling back once the wind stops
  const FAN = 3500, fall = new Sparks(FAN, { minPx: 1.6, maxPx: 5, near: 0.35, additive: false });
  for (let i = 0; i < FAN; i++) { const x = KNEEL.x - 30 + fx() * 50, z = KNEEL.z - 30 + fx() * 50, y = 1 + fx() * 18, c = 0.6 + 0.25 * fx();
    fall.set(i, x, y + groundY(x, z), z, (fx() - 0.3) * 0.6, -(0.8 + fx() * 1.5), (fx() - 0.5) * 0.6, c * 0.85, c * 0.72, c * 0.55, 0.004 + fx() * 0.006, T.BACK, 6, fx()); }
  fall.commit(); scene.add(fall.points);
  // the tsunami and the spray off its lip
  const wave = makeTsunami(sky); scene.add(wave.mesh);
  // the crest's mane (spray torn off backward), the churning toe, the bursts where it hits the towers, debris on the face
  const frontAt = (t) => 263 + 182 * (60.2 - t), heightAt = (t) => 430 + 270 * smooth(45.5, 59.5, t);   // the lip is over you at 60.2 s
  const toeX = (z, t) => wave.at(z, wave.TOE, 0, t, frontAt(t), heightAt(t)).x;
  const TW = [[0, 1], [0, -1]].map(([, s]) => { const x = 1452.5 + s * 452.55, z = 2052.5 + s * 452.55; let th = 99; for (let tt = 44; tt < 62; tt += 0.005) if (toeX(z, tt) <= x) { th = tt; break; } return { x, z, t: th }; });
  if (q.get('wavedbg')) console.log('tower hits ' + TW.map((w) => w.t.toFixed(2)).join(' '));
  const mkB = (n, near, lit, shade) => { const b = new Billboards(n, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near }); b.u.uLitCol.value.set(lit); b.u.uShadeCol.value.set(shade); b.u.uFogD.value = 0; scene.add(b.mesh); return b; };
  const MN = 120, mane = mkB(MN, 60, '#ffe6cc', '#a99c96'), BN = 110, bore = mkB(BN, 25, '#f2efe8', '#7f8a90'), BUN = 32, burst = mkB(BUN, 40, '#f2efe8', '#87929a');
  const mnP = [], boP = [], buP = [];
  for (let i = 0; i < MN; i++) mnP.push([-1600 + 5800 * (i + fx()) / MN, fx(), fx(), fx()]);
  for (let i = 0; i < BN; i++) boP.push([-1600 + 5800 * (i + fx()) / BN, fx(), fx(), fx()]);
  for (let i = 0; i < BUN; i++) buP.push([fx(), fx(), fx(), fx()]);
  const WDN = 64, deb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.15 }), WDN);
  deb.frustumCulled = false; scene.add(deb);
  const KINDS = [[12.2, 2.6, 2.44, ['#9e2f28', '#2a5a8c', '#c0782b', '#3b6a46', '#8c9196']], [4.5, 1.5, 1.8, ['#d6d6d6', '#1d1d1f', '#7a1e1e', '#2d4c78']], [6, 0.35, 0.9, ['#5b4532']], [8, 0.5, 6.5, ['#6a392c', '#474747']]];
  const dbP = []; for (let i = 0; i < WDN; i++) { const kd = KINDS[Math.floor(fx() * 4)]; deb.setColorAt(i, new THREE.Color(kd[3][Math.floor(fx() * kd[3].length)]));
    dbP.push({ s: kd.slice(0, 3), z: -260 + fx() * 980, b0: 0.04 + fx() * 0.5, v: 0.03 + fx() * 0.05, r: [fx() * 6, fx() * 6, fx() * 6], w: [fx() - 0.5, fx() - 0.5, fx() - 0.5] }); }
  const _o = new THREE.Object3D();
  await Promise.all(TEX_PENDING);

  // ---- your arms: hands on the log (crouched), raised against the wave, or down out of sight ----
  const B = me.bones, wp = (b) => b.getWorldPosition(new THREE.Vector3());
  function povBody(t, S) {
    resetPose(me);
    const f = new THREE.Vector3(); cam.getWorldDirection(f); f.y = 0; f.normalize();
    me.root.rotation.set(0, Math.atan2(f.x, f.z), 0); me.root.position.set(0, 0, 0); me.root.updateMatrixWorld(true);
    const want = cam.position.clone().addScaledVector(f, -0.1); want.y -= 0.09;
    me.root.position.add(want.sub(wp(B.Head))); me.root.updateMatrixWorld(true);
    const right = new THREE.Vector3().crossVectors(f, V(0, 1, 0)).normalize(), gy = groundY(LOG.x, LOG.z);
    const raise = smooth(58.4, 59.2, t);
    for (const [side, s] of [['Left', -1], ['Right', 1]]) {
      const sh = wp(B[side + 'Arm']);
      let hand = sh.clone().addScaledVector(V(0, 1, 0), -0.56).addScaledVector(f, 0.06).addScaledVector(right, s * 0.05), pole = sh.clone().addScaledVector(f, -0.4).addScaledVector(right, s * 0.2), F = V(0, -1, 0).addScaledVector(f, 0.2).normalize(), N = right.clone().multiplyScalar(-s), curl = 0.35;
      if (t >= T.ZERO && t < T.BRIDGE) {                       // gripping the top of the log
        hand = V(LOG.x + 0.12, gy + 0.86, LOG.z - 0.4 + s * 0.23); pole = hand.clone().add(V(0.35, -0.3, s * 0.35));
        F = V(-0.8, -0.6, 0).normalize(); N = V(-0.3, -1, 0).normalize(); curl = 0.6;
      } else if (raise > 0) {                                   // raised against the wave, palms out
        const up = cam.position.clone().addScaledVector(f, 0.42).addScaledVector(right, s * 0.17); up.y -= 0.05;
        hand.lerp(up, raise); pole = sh.clone().addScaledVector(V(0, 1, 0), -0.35).addScaledVector(right, s * 0.3);
        F.lerp(V(0, 1, 0).addScaledVector(f, 0.3).normalize(), raise).normalize(); N.lerp(f.clone(), raise).normalize(); curl = 0.15;
      }
      twoBoneIK(me, side + 'Arm', side + 'ForeArm', side + 'Hand', hand, pole); orientHand(me, side, F, N); curlFingers(me, side, curl, 0.2);
    }
  }

  function hudAt(t, story) {
    if (t < T.ZERO) return { a: 1, lab: 'The air stops turning with Earth in', val: fmtT(T.ZERO - t), sub: 'Baker Beach, San Francisco · 6:31 pm', sub2: 'Ground speed here: 1,320 km/h' };
    if (story < T.BACK) {
      const sub2 = story < 21 ? 'Record gust: 408 km/h (1996)' : story < T.SPACE ? 'Tacoma Narrows, 1940: 64 km/h' : story < T.SEA ? 'Equator: 1,670 km/h' : 'Every coast on Earth';
      return { a: 1, lab: 'Air back in', val: fmtT(T.BACK - story), sub: 'Wind: 1,320 km/h', sub2 };
    }
    if (t < T.HIT) return { a: 1, lab: 'Wave arrives in', val: fmtT(T.HIT - t), sub: t < T.EARLIER ? 'Wind: 0 km/h' : 'Golden Gate towers: 227 m', sub2: 'Tallest wave ever: 524 m (1958)' };
    return null;
  }

  function frame(t) {
    const story = t < T.HOOK ? 24.0 + t * 0.12 : t;              // the hook: slow motion, the bridge twisting in the blast
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.05; U.uContrast.value = 1.05; U.uVignette.value = 0.32; U.uAberr.value = 0.0006; U.uGrain.value = 0;
    S7.uTime.value = story;
    let rscene = scene, rcam = cam;
    if (story >= T.SPACE && story < T.SEA) {
      rscene = SPc.scene; rcam = camS;
      const u = clamp((story - T.SPACE) / (T.SEA - T.SPACE)), S = SPc.U;
      S.uLights.value = 0.5; S.uClouds.value = 1; S.uCloudLow.value = 0; S.uLandW.value = 0; S.uSeaW.value = 0; S.uAtm.value = 1; S.uTime.value = story;
      S.uSmear.value = 0.6 + 0.4 * smooth(0, 1, u); S.uDust.value = 0.25 + 0.25 * u;
      const dir = camDirS.clone().applyAxisAngle(V(0, 1, 0), -0.05 * u);
      camS.position.copy(dir).multiplyScalar(7.0 - 0.4 * smooth(0, 1, u)); camS.up.set(0, 1, 0); camS.lookAt(0, 0, 0); camS.updateMatrixWorld();
      SPc.stars.u.uGain.value = 0.9; SPc.stars.u.uPR.value = R.SSAA;
      R.renderer.toneMappingExposure = 1.0; R.bloom.strength = 0.35; R.bloom.radius = 0.5; R.bloom.threshold = 0.95;
      U.uFadeWhite.value = 0.6 * Math.exp(-(story - T.SPACE) * 5);
    } else {
      const S = povCam(cam, t);
      const wind = story >= T.ZERO && story < T.BACK ? 1 : 0, after = smooth(T.BACK, T.BACK + 3, story);
      // ---- the wind's work ----
      S7.uSpume.value = smooth(T.ZERO, T.ZERO + 1.2, story) * (1 - smooth(T.BACK, T.BACK + 1, story));
      S7.uTwist.value = 0.42 * smooth(T.ZERO + 3, T.ZERO + 13, story); S7.uBend.value = 6 * smooth(T.ZERO + 2, T.ZERO + 12, story);
      S7.uBreak.value = story > T.ZERO + 15.5 ? story - (T.ZERO + 15.5) : -1;
      HO.update(story, T.ZERO);
      for (const l of BR.lines) { l.material.uniforms.uPx.value = pxScale(cam); }
      sand.update(story); debris.update(story); spray.update(story);
      const trail = t < T.HOOK ? 0.012 : 0.03; sand.u.uTrail.value = trail; debris.u.uTrail.value = trail * 1.2; spray.u.uTrail.value = trail;
      sand.mesh.visible = debris.mesh.visible = spray.mesh.visible = wind > 0;
      // ---- the sea: torn, then draining ----
      S7.uLevel.value = -24 * Math.pow(smooth(T.BACK + 0.3, T.BACK + 5.5, story), 1.3) - 2 * smooth(T.EARLIER, T.WAVE, story);
      S7.uFlow.value = smooth(T.BACK + 0.3, T.BACK + 1.5, story) * (1 - smooth(46, 48, story));
      // ---- fog, dust, light ----
      const dustK = story < T.ZERO ? 0 : wind ? smooth(T.ZERO, T.ZERO + 1.5, story) : 1 - after;
      S7.uFogC.value.set('#d8b89a').lerp(new THREE.Color('#b59b7c'), dustK); S7.uFogD.value = (story > T.EARLIER ? 0.00011 : 0.00018) + 0.00022 * dustK;
      scene.fog.color.copy(S7.uFogC.value); scene.fog.density = S7.uFogD.value;
      const dark = smooth(T.EARLIER + 0.2, T.EARLIER + 2.2, story);   // the wave swallows the low sun
      sun.intensity = 3.0 * (1 - 0.35 * dustK) * (1 - 0.85 * dark); hemi.intensity = 0.75 * (1 - 0.15 * dustK) * (1 - 0.3 * dark);
      S7.uFogC.value.lerp(new THREE.Color('#7d848c'), 0.7 * dark); scene.fog.color.copy(S7.uFogC.value);
      for (let i = 0; i < DCN; i++) {
        const [ph, z0, y0, sz, v, sd] = dustP[i], L = 140, k = (((story - T.ZERO) * v / L + ph) % 1 + 1) % 1, a = Math.sin(Math.PI * k) * 0.55 * dustK;
        if (!wind && after >= 1) { dust.hide(i); continue; }
        const along = -80 + k * L;
        dust.set(i, KNEEL.x + BV.x * along, y0 + groundY(KNEEL.x, KNEEL.z), KNEEL.z + z0 + BV.z * along, sz, sz * 0.7, 1, 1, 1, a, sd * 6.28 + k, Math.floor(sd * 4));
      }
      dust.commit(); dust.update(cam, R.SSAA, sunDir);
      const tornFog = smooth(T.ZERO, T.ZERO + 1.6, story);
      for (let i = 0; i < FN; i++) { const [x, y, z, sz, sd] = fogP[i]; const drift = 6 * story + tornFog * 900;
        if (tornFog >= 1) { fog.hide(i); continue; }
        fog.set(i, x - 0.70711 * drift * 0.3 + BV.x * tornFog * 900, y, z + 0.70711 * drift * 0.3 + BV.z * tornFog * 900, sz, sz * 0.18, 1, 1, 1, 0.16 * (1 - tornFog), sd * 0.6, Math.floor(sd * 4)); }
      fog.commit(); fog.update(cam, R.SSAA, sunDir);
      fall.update(story, cam, R.SSAA); fall.points.visible = story > T.BACK && story < T.BACK + 6;
      // ---- props, people, animals ----
      const calm = story < T.ZERO;
      people.forEach((p) => { p.visible = calm; }); kite.visible = calm; apple.root.visible = calm; boatA.visible = calm;
      kite.position.set(-14 + Math.sin(story * 0.7) * 1.5, 34 + Math.sin(story * 1.1) * 1.2, 22 + Math.cos(story * 0.6)); kite.lookAt(cam.position); kite.rotateZ(0.3 * Math.sin(story * 1.3));
      boatA.position.set(1250 + story * 1.5, 0.2 + 0.15 * Math.sin(story * 0.9), 1180 - story * 1.5); boatA.rotation.set(0.03 * Math.sin(story), -0.8, 0.12);
      const bx = 230, bz = 60, bed = groundY(bx, bz), floatY = Math.max(S7.uLevel.value + 0.15 * Math.sin(story * 0.8), bed + 1.1), aground = smooth(bed + 1.4, bed + 0.9, S7.uLevel.value);
      boatB.position.set(bx, floatY, bz); boatB.rotation.set(0.04 * Math.sin(story * 0.7) * (1 - aground), 0.6, 0.45 * aground);
      fish.forEach((f, i) => { const [x, z] = fishAt[i], gy = groundY(x, z), show = S7.uLevel.value < gy - 0.05 && story < T.HIT;
        f.visible = show; const ud = f.userData, fl = Math.max(0, Math.sin(story * ud.f + ud.ph)) ** 3;
        f.position.set(x, gy + 0.04 + 0.12 * fl, z); f.rotation.set(0, ud.yaw, Math.PI / 2 - 0.4 * fl); });
      apple.update(t, { look: cam.position, blinkAt: [6.4], earAt: [7.6], pr: R.SSAA });
      const PS = PASSES.find((p) => t >= p.t0 && t < p.t1); flyer.root.visible = !!PS;
      if (PS) { const ds = story - PS.s0; flyer.root.position.copy(PS.p0).addScaledVector(PS.v, ds); flyer.root.rotation.set(ds * PS.spin * 0.7, ds * PS.spin, ds * PS.spin * 0.4);
        flyer.update(story, { blow: PS.v.clone().normalize().multiplyScalar(-2.5) }); }
      // ---- the wave ----
      const wOn = story >= T.EARLIER;
      wave.mesh.visible = mane.mesh.visible = bore.mesh.visible = burst.mesh.visible = wOn;
      wave.U.uFront.value = frontAt(story); wave.U.uH.value = heightAt(story);
      for (let i = 0; i < MN; i++) { const [z, ph, r1, sd] = mnP[i], k = (story * 0.22 + ph) % 1, p = wave.at(z, 0.05 - 0.55 * k, 0.99 + 0.1 * k);
        if (!wOn) { mane.hide(i); continue; }
        mane.set(i, p.x, p.y + 10, z, (200 + 220 * r1) * (0.7 + 0.6 * k), (80 + 70 * r1) * (0.8 + 0.5 * k), 1, 1, 1, 0.42 * Math.sin(Math.PI * k), sd * 6.28 + k * 0.6, Math.floor(sd * 4)); }
      for (let i = 0; i < BN; i++) { const [z, ph, r1, sd] = boP[i], k = (story * 0.5 + ph) % 1, x = wave.at(z, wave.TOE, 0).x - 10 - 50 * k;
        if (!wOn) { bore.hide(i); continue; }
        const sz = (70 + 90 * r1) * (0.6 + 0.8 * k);
        bore.set(i, x, Math.max(groundY(x, z), S7.uLevel.value) + 0.3 * sz + 40 * k * r1, z, sz, sz * 0.75, 1, 1, 1, 0.6 * Math.sin(Math.PI * k), sd * 6.28 + k * 0.8, Math.floor(sd * 4)); }
      for (let i = 0; i < BUN; i++) { const w = TW[i % 2], [r1, r2, r3, sd] = buP[i], age = story - w.t - Math.floor(i / 2) * 0.06;
        if (!wOn || age <= 0 || age > 3.4) { burst.hide(i); continue; }
        const h = (120 + 260 * r1) * (1 - Math.exp(-age * 1.6)), sz = 40 + 60 * r1 + 150 * (1 - Math.exp(-age));
        burst.set(i, wave.at(w.z, wave.TOE, 0).x - 8 - 30 * r2, h, w.z + (r3 - 0.5) * 90, sz, sz * 0.8, 1, 1, 1, 0.75 * smooth(0, 0.12, age) * (1 - smooth(1.6, 3.4, age)), sd * 6.28 + age * 0.5, Math.floor(sd * 4)); }
      mane.commit(); mane.update(cam, R.SSAA, sunDir); bore.commit(); bore.update(cam, R.SSAA, sunDir); burst.commit(); burst.update(cam, R.SSAA, sunDir);
      deb.visible = t >= T.WAVE && t < T.HIT;
      if (deb.visible) { for (let i = 0; i < WDN; i++) { const d = dbP[i], b = Math.min(0.62, d.b0 + d.v * (story - T.WAVE)), p = wave.at(d.z, wave.faceA(b), b);
        _o.position.set(p.x - 1.5, p.y, p.z); _o.rotation.set(d.r[0] + d.w[0] * story * 1.5, d.r[1] + d.w[1] * story, d.r[2] + d.w[2] * story * 1.5); _o.scale.set(...d.s); _o.updateMatrix(); deb.setMatrixAt(i, _o.matrix); }
        deb.instanceMatrix.needsUpdate = true; }
      if (t >= T.WAVE && t < T.HIT) { const k = story - T.WAVE, b = Math.min(0.6, 0.3 + 0.05 * k), p = wave.at(170, wave.faceA(b), b);
        boatA.visible = true; boatA.position.set(p.x - 3, p.y, 170); boatA.rotation.set(0.3 + 0.5 * k, -0.8 + 0.2 * k, 1.2 + 0.3 * k); }
      // ---- you ----
      const kneeling = (t < T.HOOK) || (story >= T.ZERO && story < T.BACK + 1.5);
      me.root.visible = kneeling || t >= T.WAVE;
      if (me.root.visible) povBody(t, S);
      setShadow(V(cam.position.x, 0, cam.position.z).addScaledVector(V(Math.sin(0.6), 0, Math.cos(0.6)), 8), 40);
      const exp0 = 0.78;
      R.renderer.toneMappingExposure = exp0; R.bloom.strength = 0.42; R.bloom.radius = 0.6; R.bloom.threshold = 0.95 / exp0;
      U.uSat.value = 1.05 - 0.12 * dustK; U.uTint.value.set(1 + 0.03 * dustK, 1, 1 - 0.05 * dustK);
      if (t >= T.HIT) U.uFade.value = 1;
    }
    R.renderPass.scene = rscene; R.renderPass.camera = rcam;
    R.composer.render();
    const cover = q.get('cover') === '1', endA = smooth(T.END, T.END + 0.5, t);
    ov.apply({ labels: [], tag: 'WHAT IF &nbsp;·&nbsp; 07', tagA: t < T.END ? 1 : 0, title: { html: TITLE, a: cover ? 1 : t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0, k: 1 },
      hud: cover ? null : hudAt(t, story), caption: cover ? null : captionAt(CAPTIONS, t),
      end: endA > 0 ? { a: endA, title: TITLE, note: '<span class="q">Still going to the beach?</span><br><br>Wind: 1,320 km/h for 30 seconds<br>Strongest gust ever measured: 408 km/h (1996)' } : null });
    tag.update(t, T.END + 0.5, endA);
  }
  window.EP = { scene, cam, THREE };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
