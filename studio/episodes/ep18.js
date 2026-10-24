// Post 12: What if all the ice on Earth melted in 5 seconds? (Diamond Beach, Iceland, 68 s)
// Hook (0-3.6): the glacier's front, already water, slumping into a wall that races across the lagoon (slow motion).
// Calm (3.6-12): the glide in from the sea to Diamond Beach at 16:45; you with an iced coffee among the blocks of
// glacier ice on the black sand; a polar bear doing the 6-7 behind you (rule 19's WTF, on a loop the whole video).
// The 5 seconds (12-20, slowed 1.6x): the melt eats into every ice at once, deeper and deeper (millimetres, then
// kilometres): your ice cubes (12-13.6), the blocks on the beach (13.6-16.6), the lagoon's icebergs, the glacier, the
// ice cap (16.6-20). The flood (20-33, 2.9x): the meltwater wall crosses the lagoon toward the coast. Space (33-51):
// Greenland and Antarctica pour into the sea, the oceans rise 66 m. You (51-62): your own eyes as the wall comes over
// Route 1, the bear still doing the 6-7 in front of it. Loop end card + Follow for more (62-68).
import * as THREE from 'three';
import { createRenderer, Overlay, W, H as HH, rng, smooth, clamp, captionAt, hudK } from '../engine/core.js';
import { loadTex } from '../engine/assets.js';
import { makeEndTag } from '../engine/endtag.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { fadeShadowBorders, Sparks, Billboards, smokeAtlas } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, curlFingers } from '../engine/poses.js';
import { makeCat } from '../engine/cat.js';
import { makeCar } from '../engine/town5.js';
import { IU, SUN, HERO, BRIDGE, makeSky, makeGround, makeSea, makeLagoon, makeBridge, makeGlacier, baseY, groundY, coastX, riverZ, frontX, sst } from '../engine/iceland.js';
import { MU, meltD, makeShards, beachIceList, bergList, makePuddles, makeFlood, shardGeo } from '../engine/ice18.js';
import { makeIcedCoffee, cupR, CUP, makePolarBear } from '../engine/props18.js';
import { makeSpace18 } from '../engine/space18.js';
import { T, DUR, tauAt, TAU_FRONT, TAU_FLOOD0, wallX, wallSpeed, wallH, wallBase, hook, glide, ground, cupCam, beach, flood, EYE, BEARP } from './ep18cams.js';

const TITLE = 'What if all the ice on Earth melted in <span class="k">5 seconds</span>?';
const CAPTIONS = [
  [3.75, 7.25, 'Diamond Beach, Iceland. 4:45 pm.'],
  [7.35, 11.85, 'Every block of ice here fell off a glacier.'],
  [12.05, 14.75, 'First, your drink.'],
  [14.85, 17.55, 'Then the beach.'],
  [17.65, 21.07, 'Then the glacier, then the ice cap.'],
  [21.15, 24.78, '800 times the great flood of 1996.'],
  [24.85, 29.02, 'That one swept away bridges on this coast.'],
  [29.1, 32.25, 'This one takes the whole coast.'],
  [33.2, 36.2, 'Greenland pours into the sea.'],
  [36.3, 39.8, 'Waves taller than any ever recorded.'],
  [39.92, 43.7, 'Then Antarctica: 26 million km³ of ice.'],
  [43.8, 47.6, 'In three days, the seas rise 66 metres.'],
  [47.68, 50.98, 'London, New York, Shanghai: gone.'],
  [51.2, 54.1, 'And you? Still on the beach.'],
  [54.12, 58.58, '1 billion people live under 10 m above the sea.'],
  [58.65, 61.98, 'Would your city survive?'],
];
const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(V(0, 0, 0));
const big = (x, d = 0) => x.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtD = (d) => (d < 0.01 ? `${(d * 1000).toFixed(1)} mm` : d < 1 ? `${(d * 100).toFixed(1)} cm` : d < 1000 ? `${d.toFixed(d < 10 ? 2 : 0)} m` : `${(d / 1000).toFixed(2)} km`);

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const scene = new THREE.Scene();

  // ---- sky and its reflections ----
  const pm = new THREE.PMREMGenerator(R.renderer);
  const SKY = makeSky(); scene.add(SKY.mesh);
  { const envScene = new THREE.Scene(), envSky = makeSky(); envSky.U.uDisk.value = 0; envScene.add(envSky.mesh);
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(80000, 32), new THREE.MeshBasicMaterial({ color: '#0e0e10' })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -40; envScene.add(gnd);
    scene.environment = pm.fromScene(envScene, 0, 1, 100000).texture; }
  scene.environmentIntensity = 0.55;

  // ---- the set ----
  const GR = makeGround(); scene.add(GR.mesh);
  const SEA = makeSea(); scene.add(SEA.mesh);
  const LAG = makeLagoon({ ssaa: globalThis.SSAA }); scene.add(LAG.mesh);
  const GL = makeGlacier(); scene.add(GL.mesh, GL.cliff);
  const BR = makeBridge(); scene.add(BR);
  // the blocks on the beach, the lagoon's icebergs (and their meltwater)
  const ICEL = beachIceList(7, HERO);
  for (const [dx, dz, sz, typ] of [[1.2, 3.0, 0.75, 0.1], [0.2, 3.7, 1.1, 0.7], [1.9, 2.2, 0.6, 0.2], [-4.6, -3.4, 1.4, 0.15], [-3.2, -4.4, 0.9, 0.8], [-1.6, -3.6, 0.8, 0.1], [-6.0, -5.0, 1.6, 0.2]]) {
    const x = HERO.x + dx, z = HERO.z + dz; ICEL.push({ x, z, y: baseY(x, z), s: sz, typ, seed: (dx * 7.3 + dz * 3.1) % 1 + 0.5 }); }
  const BICE = makeShards(ICEL, { seed: 5, variants: 10, detail: 3, key: 'ice18beach' }); scene.add(BICE.group);
  const PUD = makePuddles(BICE.info); scene.add(PUD);
  const BLIST = bergList(11).filter((b) => !(b.x > 2050 && b.x < 3100 && b.z > -650 && b.z < 250));
  for (const [x, z, L, hgt] of [[2160, -275, 30, 22], [2240, -150, 26, 18], [2330, -360, 42, 30], [2420, -215, 34, 26], [2560, -310, 46, 32], [2700, -120, 38, 24], [2860, -380, 50, 30], [3050, -230, 44, 26]])
    BLIST.push({ x, z, y: 0.12, floatY: 0.12, s: L, hy: hgt / L, typ: 0.8, band: x % 3 < 1 ? 1 : 0, sink: 1.0, half: 140 + (x % 20), seed: (x * 0.37) % 1, yaw: x * 0.013, tilt: 0.05 });
  const BERG = makeShards(BLIST, { seed: 9, variants: 8, detail: 4, planes: 11, tall: 1, key: 'ice18berg' }); scene.add(BERG.group);
  const bigBergs = BERG.info.slice().sort((a, b) => b.s - a.s).slice(0, 16);
  // a black basalt boulder for Apple; the parked cars by the road
  const rockM = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.92 });
  const ROCK = V(HERO.x + 1.9, 0, HERO.z + 2.1); ROCK.y = baseY(ROCK.x, ROCK.z);
  const rock = new THREE.Mesh(shardGeo(77, { detail: 3, planes: 16, flat: 0.7, round: 0.12 }), rockM); rock.scale.set(0.62, 0.48, 0.55); rock.position.set(ROCK.x, ROCK.y + 0.18, ROCK.z); rock.castShadow = rock.receiveShadow = true; scene.add(rock);
  const cr = rng(31), cars = [];
  for (let i = 0; i < 7; i++) { const type = ['suv', 'hatch', 'sedan', 'suv'][i % 4], col = ['#d8d8d4', '#2b2f36', '#8a1c1c', '#3f5f7a', '#c9c9c4', '#1d1f22', '#6b6f73'][i];
    const c = makeCar(type, col, cr); const z = BRIDGE.z + 75 + i * 3.4, x = 232 + coastX(z); c.group.position.set(x, baseY(x, z) + 0.01, z); c.group.rotation.y = Math.PI / 2 + (cr() - 0.5) * 0.08; scene.add(c.group); cars.push(c); }

  // ---- lights ----
  const sun = new THREE.DirectionalLight('#ff9a55', 4.2); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
  const hemi = new THREE.HemisphereLight('#7389c2', '#1d1b1a', 0.55); scene.add(hemi);
  const fill = new THREE.PointLight('#ffcfae', 0, 7, 2); scene.add(fill);                 // a soft fill on your face (the sky behind the camera)
  const setShadow = (c, half, far = 900) => { sun.target.position.copy(c); sun.position.copy(c).addScaledVector(SUN, 520); const s = sun.shadow.camera;
    if (s.right !== half) { s.left = -half; s.right = half; s.top = half; s.bottom = -half; s.near = 40; s.far = far; s.updateProjectionMatrix(); } };

  // ---- you (Female_Adult_07: brunette, brown jacket, jeans, boots) with your iced coffee ----
  const env = scene.environment;
  const you = await loadAvatar('Female_Adult_07', { env, facial: true }); scene.add(you.root);
  const B = you.bones, wpos = (n) => wp(B[n]);
  const ICED = makeIcedCoffee(); scene.add(ICED.group);
  const blinkK = (t, list) => { let k = 0; for (const b0 of list) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  const BLINKS = [4.4, 8.1, 10.6, 13.2, 15.3, 52.0];
  let cupFit = null;
  function poseYou(t) {
    const tau = tauAt(t), shock = smooth(0.8, 2.0, tau) * (t >= T.MELT && t < T.SPACE ? 1 : 0);
    // from the melt on, the look turns by direction (from your cup to the glacier): lerping a point 20 cm away toward one
    // 50 m away whipped the head round in two frames as the shock began (13.3 s)
    const E0 = V(HERO.x, HERO.y + 1.55, HERO.z), dA = V(HERO.x - 0.2, HERO.y + 1.0, HERO.z - 0.1).sub(E0).normalize(), dB = V(HERO.x + 40, HERO.y + 6, HERO.z - 30).sub(E0).normalize();
    const look = t < T.MELT ? V(HERO.x - 30 + 6 * Math.sin(t * 0.21), HERO.y + 1.2, HERO.z - 40) : E0.clone().addScaledVector(dA.lerp(dB, shock).normalize(), 20);
    stand(you, { pos: V(HERO.x, HERO.y, HERO.z), yaw: -2.1, breath: t * 0.27, lean: 0.03, look, lookK: 0.85,
      armR: (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.33).addScaledVector(left, -0.06), pole: P.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5).addScaledVector(fwd, -0.15),
        F: fwd.clone().addScaledVector(left, 0.45).normalize(), N: left.clone(), curl: 0.75 }) });
    curlFingers(you, 'Right', 0.75, -0.6);
    you.blink(blinkK(t, BLINKS));
    you.root.updateMatrixWorld(true);
    const hp = wpos('RightHand'), pn = wpos('RightHandIndex1').sub(wpos('RightHandPinky1')).normalize(), fd = wpos('RightHandMiddle1').sub(hp).normalize(), palm = pn.clone().cross(fd).normalize();
    if (cupFit) ICED.group.position.copy(B.RightHand.localToWorld(cupFit.clone()));
    else { ICED.group.position.copy(hp).addScaledVector(fd, 0.055).addScaledVector(palm, 0.06); ICED.group.position.y -= 0.075; }
    ICED.group.rotation.set(0, 0, 0); ICED.group.updateMatrixWorld(true);
  }
  // fit the cup into the grip once (post 6's method): every joint of the hand clears the cup's wall by its skin
  // thickness, then the spot that nestles deepest into the palm and the curled fingers
  {
    poseYou(T.CUT1);
    const PT = [[wpos('RightHand'), 0.022]];
    for (const f of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) {
      if (!B['RightHand' + f + '3']) continue;
      const j1 = wpos('RightHand' + f + '1'), j2 = wpos('RightHand' + f + '2'), j3 = wpos('RightHand' + f + '3');
      if (f !== 'Thumb') PT.push([j1, 0.012], [j1.clone().lerp(wpos('RightHand'), 0.5), 0.016]); else PT.push([j1, 0.011]);
      PT.push([j2, 0.0085], [j3, 0.008], [j3.clone().multiplyScalar(1.85).addScaledVector(j2, -0.85), 0.007]);
    }
    const c0 = ICED.group.position.clone();
    const margin = (x, y, z) => { let m = 1; for (const [p, sk] of PT) { const h = p.y - y, rr = Math.hypot(p.x - x, p.z - z);
      if (h > CUP.h + 0.012 || h < -0.03) continue; if (h < 0) { if (rr < CUP.rb + sk) m = Math.min(m, -h - sk); continue; } m = Math.min(m, rr - cupR(h) - sk); } return m; };
    const GRIP = PT.slice(1).filter((e, i) => i % 5 !== 0 && i < 20).concat([PT[0]]);
    const snug = (x, y, z) => { let sum = 0, n = 0; for (const [p, sk] of GRIP) { const h = p.y - y; if (h < 0 || h > CUP.h) continue; sum += Math.hypot(p.x - x, p.z - z) - cupR(h) - sk; n++; } return n >= 6 ? sum / n : 1; };
    let best = { m: -1, f: 1e9, x: c0.x, y: c0.y, z: c0.z };
    for (let dy = -0.04; dy <= 0.06; dy += 0.005) for (let i = -40; i <= 40; i++) for (let j = -40; j <= 40; j++) {
      const x = c0.x + i * 0.0015, y = c0.y + dy, z = c0.z + j * 0.0015, m = margin(x, y, z); if (m < 0) continue;
      const f = snug(x, y, z); if (f < best.f) best = { m, f, x, y, z }; }
    console.log('cup fit: margin', best.m.toFixed(4), 'snug', best.f.toFixed(4), 'moved', (best.x - c0.x).toFixed(3), (best.y - c0.y).toFixed(3), (best.z - c0.z).toFixed(3));
    cupFit = B.RightHand.worldToLocal(V(best.x, best.y, best.z));
  }

  // ---- the polar bear doing the 6-7 (rule 19's WTF), Apple on his boulder (rule 19) ----
  const BEAR = makePolarBear(); BEAR.root.position.set(BEARP.x, baseY(BEARP.x, BEARP.z), BEARP.z); BEAR.root.rotation.y = -2.214; scene.add(BEAR.root);
  const bearBlob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false })); bearBlob.rotation.x = -Math.PI / 2;
  bearBlob.position.set(BEARP.x, baseY(BEARP.x, BEARP.z) + 0.01, BEARP.z); scene.add(bearBlob);
  const apple = makeCat(); apple.root.position.set(ROCK.x, ROCK.y + 0.18 + 0.48 * 0.62, ROCK.z); apple.root.rotation.y = -2.6; scene.add(apple.root);
  // a few other visitors along the beach, watching the sunset (gone by the end)
  const extras = [];
  for (const [name, x, z, yaw, walk] of [['Male_Adult_06', 69.7, 158.6, -2.3, 0], ['Female_Adult_12', 91.5, 172.1, -2.0, 0], ['Male_Adult_17', 76.5, 179.7, -2.6, 0], ['Sports_Female_01', 58.0, 196.0, -2.2, 0]]) {
    const a = await loadAvatar(name, { env, lod: 512 }); scene.add(a.root); extras.push({ a, x, z, yaw }); }

  // ---- the flood ----
  const FL = makeFlood(); scene.add(FL.mesh, FL.sheet);
  const smokeT = smokeAtlas(4, 1.2);
  const spray = new Billboards(260, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 6 });   // spray blown off the crest
  spray.u.uLitCol.value.set('#f6dcc0'); spray.u.uShadeCol.value.set('#8e8a86'); scene.add(spray.mesh);
  const SPR = []; { const r = rng(55); for (let i = 0; i < 260; i++) SPR.push([r(), r(), r(), r()]); }

  // ---- space ----
  const [day, night, cloudsTex, iceTex] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false), loadTex('/engine/tex/earth_ice18.png', false)]);
  const SPc = makeSpace18({ day, night, clouds: cloudsTex, ice: iceTex });
  const camS = new THREE.PerspectiveCamera(30, W / HH, 0.01, 9000);

  const tag = makeEndTag({ text: 'Follow for more', ssaa: globalThis.SSAA });
  await Promise.all(TEX_PENDING);

  const cam = new THREE.PerspectiveCamera(40, W / HH, 0.1, 200000);
  cam.layers.enable(1); spray.mesh.layers.set(1);
  const shotId = (t) => (t < T.HOOK ? 0 : t < T.CUT1 ? 1 : t < T.MELT ? 2 : t < T.BEACH ? 3 : t < T.LAGOON ? 4 : t < T.SPACE ? 5 : t < T.POV ? 6 : 7);

  function hudAt(t, tau) {
    const k = hudK(t, T.MELT);
    if (t < T.MELT) return { a: 1, k, lab: 'All the ice on Earth melts in', val: fmtT(T.MELT - t), sub: 'Diamond Beach · Iceland', sub2: 'Ice on land: 30 million km³' };
    if (t >= T.END) return null;
    const a = 1 - smooth(T.END - 0.3, T.END, t);
    if (t < T.GONE) { const d = meltD(tau);
      const what = tau < 0.8 ? 'Ice cubes: 1.3 cm' : tau < 2.3 ? 'Beach ice: up to 1.5 m' : tau < 3.85 ? 'The icebergs' : tau < 4.2 ? 'The glacier: 300 m' : tau < 4.6 ? 'Vatnajökull: 950 m' : 'Antarctica: 4.9 km';
      return { a, k, lab: 'All ice gone in', val: fmtT(5 - tau), sub: `Melting ${fmtD(d)} deep`, sub2: what }; }
    if (t < T.SPACE) { const fs = tau - TAU_FRONT; return { a, k, lab: 'Since the melt', val: fmtT(tau - 5), sub: `Flood front: ${big(wallSpeed(fs) * 3.6)} km/h`, sub2: 'Vatnajökull: 2,800 km³ of water' }; }
    if (t < T.POV) return SPc.hud(t, a, k);
    const fs = tau - TAU_FRONT, dist = Math.max(0, wallX(fs) - HERO.x);
    return { a, k, lab: 'The wall is', val: `${big(dist)} m`, sub: `${Math.round(wallH(wallX(fs)))} m tall · ${big(wallSpeed(fs) * 3.6)} km/h`, sub2: `${Math.round(tau - 5)} s since the melt` };
  }

  function frame(t) {
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.06; U.uContrast.value = 1.05; U.uVignette.value = 0.3; U.uAberr.value = 0.0012; U.uGrain.value = 0; U.uBarrel.value = 0; U.uWarp.value = 0;
    const id = shotId(t), tau = tauAt(t), space = id === 6;
    let rscene = scene, rc = cam;
    if (space) {
      rscene = SPc.scene; rc = camS;
      SPc.frame(t, camS, R);
    } else {
      IU.uT.value = t < T.HOOK ? 20 + tau : tau + 20;
      // ---- the melt: depth, the glacier, the ice cap ----
      const d = meltD(tau); MU.uD.value = d; MU.uTau.value = tau;
      IU.uGlac.value = smooth(TAU_FRONT - 0.5, TAU_FRONT + 0.1, tau);
      const fs = tau - TAU_FRONT;
      IU.uDrain.value = clamp(fs / 40);
      // ---- you, the cup, the bear ----
      poseYou(t);
      const showYou = id >= 2 && id <= 4;
      you.root.visible = ICED.group.visible = showYou;
      BEAR.update(t, { look: id === 7 ? EYE : cam.position }); BEAR.root.visible = bearBlob.visible = id >= 2;
      extras.forEach((e, i) => { e.a.root.visible = id >= 1 && id <= 4; if (!e.a.root.visible) return;
        stand(e.a, { pos: V(e.x, baseY(e.x, e.z), e.z), yaw: e.yaw, breath: t * 0.25 + i * 0.3, look: V(e.x - 40, baseY(e.x, e.z) + 2, e.z - 60), lookK: 0.6 }); });
      apple.update(t, { look: cam.position, blinkAt: [8.6, 10.4], earAt: [9.6], pr: R.SSAA }); apple.root.visible = id === 2;
      // ---- cameras ----
      if (id === 0) hook.apply(cam, t);
      else if (id === 1) glide.apply(cam, t);
      else if (id === 2) ground.apply(cam, t);
      else if (id === 3) { const c = ICED.group.position, k = (t - T.MELT) / (T.BEACH - T.MELT);
        cam.position.set(c.x + cupCam.off.x * (1 + 0.08 * k), c.y + cupCam.off.y, c.z + cupCam.off.z * (1 + 0.08 * k)); cam.up.set(0, 1, 0); cam.lookAt(c.x, c.y + 0.07, c.z); cam.fov = cupCam.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      else if (id === 4) beach.apply(cam, t);
      else if (id === 5) flood.apply(cam, t);
      else { const sh = smooth(52, 61.5, t), back = smooth(54, 61.8, t) * 1.6;
        cam.position.copy(EYE).add(V(-back * 0.7, -0.15 * smooth(58, 61.8, t), -back * 0.4));
        const look = V(EYE.x + 60, EYE.y + 1 + 38 * smooth(55.5, 61.3, t), EYE.z + 28);
        cam.up.set(0.03 * Math.sin(t * 2.1) * sh, 1, 0); cam.lookAt(look); cam.fov = 58; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
        U.uShake.value.set((Math.sin(t * 13) + 0.6 * Math.sin(t * 19 + 1)) * 0.0035 * sh, (Math.cos(t * 11) + 0.6 * Math.sin(t * 17)) * 0.0035 * sh); }
      if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      SKY.mesh.position.copy(cam.position);
      // ---- visibility (the lagoon hides behind the beach ridge from down on the beach) ----
      const low = id >= 2 && id <= 4 || id === 7;
      LAG.mesh.visible = !low; BERG.group.visible = id <= 1 || id === 5;
      BICE.group.visible = PUD.visible = id >= 1 && id <= 5;
      // ---- shadows: round the shot ----
      if (id >= 2 && id <= 4 || id === 7) setShadow(V(HERO.x + 4, HERO.y, HERO.z + 4), 40); else setShadow(V(cam.position.x + 600, 0, cam.position.z - 200), 900, 2500);
      fill.intensity = id === 2 || id === 4 ? 1.3 : 0; fill.position.set(HERO.x - 1.4, HERO.y + 1.4, HERO.z - 0.6);
      // ---- the lagoon: foam round each melting berg ----
      const ub = LAG.U.uBerg.value; bigBergs.forEach((b, i) => { const k = clamp(1 - d / b.half); const melting = k < 0.999 && k > 0 ? 1 : k <= 0 ? Math.exp(-(tau - (1 + Math.log((b.half + 0.0015) / 0.03) / 3)) / 0.8) : 0;
        ub[i].set(b.x, b.z, b.s * 0.55 * (0.4 + 0.6 * k) + 6 * (1 - k), 0.9 * melting); });
      LAG.U.uChop.value = smooth(3.0, 4.0, tau);
      // ---- the flood ----
      const xw = wallX(fs), Hw = wallH(xw), base = wallBase(xw), on = fs > 0 && id !== 2 && id !== 3 && id !== 4;
      FL.mesh.visible = FL.sheet.visible = on; IU.uWall.value = on ? xw : -1e5;
      FL.U.uFront.value = xw; FL.U.uH.value = Hw * smooth(0, 3.0, fs); FL.U.uBase.value = base; FL.U.uA.value = 1;
      SEA.U.uMud.value = 0; LAG.U.uMud.value = 0;
      // spray off the crest (where the camera can see it)
      let sk = 0;
      if (on) { for (let i = 0; i < 260; i++) { const [a, b, c, e] = SPR[i]; const z = -1800 + 3600 * a; const xf = xw + FL.lagF(z) - 0.15 * Hw, sz = Hw * (0.35 + 0.5 * c);
          const life = (fs * 0.6 + e * 3) % 3, y = base + Hw * (0.95 + 0.25 * b) + life * 6;
          spray.set(sk++, xf + life * 4, y, z, sz, sz * 0.7, 1, 1, 1, 0.35 * smooth(0, 0.6, life) * (1 - smooth(1.8, 3.0, life)) * smooth(0, 3, fs), e * 6.28 + life * 0.2, Math.floor(e * 4)); } }
      for (let i = sk; i < 260; i++) spray.set(i, 0, -999, 0, 0, 0, 0, 0, 0, 0);
      spray.commit(); spray.update(cam, R.SSAA, SUN); spray.mesh.visible = on;
      // ---- light and exposure ----
      const ex = id === 4 ? 0.9 : 1.15; R.renderer.toneMappingExposure = ex; U.uTint.value.set(1.03, 1.0, 0.96); U.uContrast.value = 1.08; R.bloom.strength = 0.26; R.bloom.radius = 0.5; R.bloom.threshold = 0.92 / ex;
      cam.near = id === 3 ? 0.03 : id === 1 || id === 5 || id === 0 ? 1.0 : 0.1; cam.updateProjectionMatrix();
      if (id === 7) { U.uFade.value = smooth(61.55, 61.95, t); }
    }
    R.renderPass.scene = rscene; R.renderPass.camera = rc;
    R.composer.render();
    const cover = q.get('cover') === '1', endA = smooth(T.END, T.END + 0.5, t);
    ov.apply({ labels: [], tag: 'WHAT IF &nbsp;·&nbsp; 12', tagA: t < T.END ? 1 : 0, title: { html: TITLE, a: cover ? 1 : t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0, k: 1 },
      hud: cover ? null : hudAt(t, tau), caption: cover ? null : captionAt(CAPTIONS, t),
      end: endA > 0 ? { a: endA, title: TITLE, note: '<span class="q">Would your city survive?</span><br><br>All the ice on Earth = 66 m of sea<br>Vatnajökull: 3,100 km³ of ice' } : null });
    tag.update(t, T.END + 0.5, endA);
  }
  window.EP = { scene, cam, THREE };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
