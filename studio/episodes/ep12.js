// Post 6: What if every atom on Earth stopped moving for 1 second? (approved by the owner, 10 Oct 2026)
// Hook (0-3.6): flash-forward, the sky falling on Times Square. Glide (3.6-10.6): dusk, a drone sinks to you on the red
// steps with a coffee, countdown. Frozen second (10.6-17): bullet time, silence. Restart (17-27): absolute zero, the
// screens die, frost, the moisture in the air snows out. The sky falls (27-38). Space (38-50): Earth turns white.
// Vostok 1983 (50-62): the coldest ever measured. Loop end card + Follow for more (62-68).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRenderer, Overlay, W, H, rng, smooth, clamp, captionAt } from '../engine/core.js';
import { loadTex } from '../engine/assets.js';
import { makeSpace6, geoDir } from '../engine/space6.js';
import { makeVostok } from '../engine/vostok6.js';
import { makeEndTag } from '../engine/endtag.js';
import { makeDuskSky } from '../engine/guarapari.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { TSQ, TQ, xb, xW, xE, makeGround, makeSteps, makeBuildings, makeStreet, frostize } from '../engine/tsq.js';
import { loadAdFonts, makeAdAtlases } from '../engine/ads6.js';
import { fadeShadowBorders, Sparks, Billboards, Streaks, smokeAtlas } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { sit, stand } from '../engine/poses.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { makeCat } from '../engine/cat.js';
import { makeCar } from '../engine/town5.js';
import { makeCoffee, makeSnowman, taxiSign } from '../engine/props6.js';
import { HERO, T, DUR, hookCam, glide, frozen, restart, sky } from './ep12cams.js';

const TITLE = 'What if every atom on Earth <span class="k">stopped moving</span> for 1 second?';
const CAPTIONS = [
  [3.75, 6.95, 'Times Square, New York, at dusk.'],
  [7.05, 10.45, '330,000 people pass here a day.'],
  [10.75, 13.85, 'Every atom on Earth stops.'],
  [13.95, 17.15, 'No sound. Sound is atoms moving.'],
  [17.25, 20.8, 'Time restarts, but the heat is gone.', { shade: 1 }],
  [20.9, 24.0, 'Everything hits −273 °C.', { shade: 1 }],
  [24.1, 27.35, 'The air’s moisture falls as snow.', { shade: 1 }],
  [27.45, 30.95, 'Nothing holds the sky up anymore.', { shade: 1 }],
  [31.05, 34.45, 'The sky falls at up to 1,600 km/h.', { shade: 1 }],
  [34.55, 37.9, '100 million megatons of heat.', { shade: 1 }],
  [38.25, 41.6, 'Earth turns white, pole to pole.', { shade: 1 }],
  [41.7, 45.6, 'It happened once: Snowball Earth.', { shade: 1 }],
  [45.7, 49.6, '700 million years ago. Ice everywhere.', { shade: 1 }],
  [50.25, 53.65, 'Coldest ever measured: −89.2 °C.'],
  [53.75, 57.55, 'Vostok, Antarctica, 21 July 1983.'],
  [57.65, 61.85, 'Absolute zero is 184 degrees colder.'],
];
const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; };
function fmtSince(s) {
  if (s < 60) return s.toFixed(1) + ' s';
  if (s < 3600) { const m = Math.floor(s / 60); return `${m} min ${String(Math.floor(s - m * 60)).padStart(2, '0')} s`; }
  if (s < 86400 * 2) { const h = Math.floor(s / 3600); return `${h} h ${String(Math.floor((s - h * 3600) / 60)).padStart(2, '0')} min`; }
  return `${Math.floor(s / 86400)} days`;
}
// real time since the restart: 1:1 in Times Square, then sped up in space (21 s -> 1 hour on a log scale): the whole
// atmosphere is down within ~2 minutes (99 % of its mass lies below 30 km: 78 s of free fall), frozen over everything
const sinceAt = (story) => story < T.SPACE ? story - T.RESTART : Math.pow(10, Math.log10(T.SPACE - T.RESTART) + (Math.log10(3600) - Math.log10(T.SPACE - T.RESTART)) * clamp((story - T.SPACE) / (T.VOSTOK - T.SPACE)));

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);
  fadeShadowBorders(0.2);
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const scene = new THREE.Scene();
  // dusk: the sun just set in the west-south-west; deep blue overhead, orange low in the west
  const sunDir = new THREE.Vector3(-0.93, -0.1, 0.36).normalize();   // blue hour: the sun 6 degrees under the horizon
  const SKYC = { zen: '#081230', hor: '#4d5378', belt: '#5d5a86', shade: '#26305a', sunCol: '#c96a45' };   // blue hour: deep blue, a faint warm band low in the west
  const skyM = makeDuskSky(sunDir, SKYC);
  skyM.material.uniforms.uDisk.value = 0; scene.add(skyM);
  const pm = new THREE.PMREMGenerator(R.renderer);
  const envScene = new THREE.Scene(); envScene.add(makeDuskSky(sunDir, SKYC));
  for (let i = 0; i < 10; i++) {   // the screens as seen from the street: big coloured panels low on the horizon
    const c = new THREE.Color().setHSL([0.0, 0.08, 0.6, 0.55, 0.85, 0.95, 0.12, 0.62, 0.9, 0.02][i], 0.55, 0.5);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(400, 160), new THREE.MeshBasicMaterial({ color: c.multiplyScalar(2.2), side: THREE.DoubleSide }));
    const a = (i / 10) * Math.PI * 2; p.position.set(Math.cos(a) * 900, 120, Math.sin(a) * 900); p.lookAt(0, 120, 0); envScene.add(p);
  }
  const env = pm.fromScene(envScene, 0, 1, 20000).texture;
  scene.environment = env; scene.environmentIntensity = 0.9;
  scene.fog = new THREE.FogExp2('#2b3352', 0.0011);
  const hemi = new THREE.HemisphereLight('#8794c0', '#6a4a3a', 1.0); scene.add(hemi);
  const key = new THREE.DirectionalLight('#aab8e8', 0.9); key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.03;
  const keyDir = new THREE.Vector3(-0.35, 0.85, -0.4).normalize();
  scene.add(key, key.target);
  const setShadow = (c, half) => { key.target.position.copy(c); key.position.copy(c).addScaledVector(keyDir, 200); Object.assign(key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 400 }); key.shadow.camera.updateProjectionMatrix(); key.target.updateMatrixWorld(); };

  const ground = makeGround(); scene.add(ground.group);
  await loadAdFonts(); const ads = makeAdAtlases();
  const steps = makeSteps(); scene.add(steps.group);
  const BLD = makeBuildings(ads); scene.add(BLD.group);
  const ST = makeStreet(); scene.add(ST.group);
  // light from the screens on the plaza: coloured point lights in front of the biggest ones
  const scrL = [];
  BLD.lights.filter((l) => l.z > -120 && l.z < 340).sort((a, b) => Math.abs(a.z - HERO.z - 40) - Math.abs(b.z - HERO.z - 40)).slice(0, 16).forEach((l, i) => {
    const c = new THREE.Color().setHSL(l.seed, 0.85, 0.55);
    const p = new THREE.SpotLight(c, 1500, 160, 1.0, 1.0, 2); p.position.set(l.x, l.y, l.z);   // aimed out at the plaza, so it never glints on the facade's own glass
    p.target.position.set(l.x + l.nx * 30, 0, l.z + l.nz * 30); scene.add(p, p.target); scrL.push(p);
  });
  // the steps' red glow on whoever sits on them
  const front = new THREE.DirectionalLight('#e8dcff', 0.7); front.position.set(HERO.x + 20, HERO.y + 12, HERO.z + 60); front.target.position.copy(HERO); scene.add(front, front.target);   // the screens across the square, on faces turned south

  const cam = new THREE.PerspectiveCamera(45, W / H, 0.1, 9000);
  const DARKG = new THREE.Color('#1d2640'), HAZEC = new THREE.Color('#7f89a8');
  // ---- space (38-50) and Vostok 1983 (50-62); the end card's Follow for more (rule 20) ----
  const [day, night, cloudsTex] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false)]);
  const SPc = makeSpace6({ day, night, clouds: cloudsTex });
  const VK = makeVostok();
  const tag = makeEndTag({ text: 'Follow for more' });
  const NYC = geoDir(40.7, -74.0), camDirS = NYC.clone().addScaledVector(SPc.sun, 0.6).normalize();
  // space has its own camera, its picture shifted down and a little right (an off-axis window), so Earth sits under the HUD
  const camS = new THREE.PerspectiveCamera(32, W / H, 0.1, 9000); camS.setViewOffset(W, H, -65, -326, W, H);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---- you: on step 7 of the red steps with a coffee, a snowman in sunglasses beside you (rule 19's WTF) ----
  const you = await loadAvatar('Female_Adult_05', { env, facial: true }); scene.add(you.root);
  console.log('blink shapes:', you.shapeNames.filter((n) => /Blink/.test(n)).join(' '));
  const coffee = makeCoffee(); scene.add(coffee);
  const snowman = makeSnowman(); snowman.position.set(HERO.x - 1.25, HERO.y, HERO.z + 0.02); snowman.rotation.y = 0.3; scene.add(snowman);
  // ---- Apple, hidden on the plaza in front of the steps, looking up at the drone as it comes down (8.6-10.6 s, 28-39 px;
  // only in the calm part: he is never caught in the freeze) ----
  const apple = makeCat(); apple.root.position.set(-22.0, 0, -0.5); apple.root.rotation.y = Math.PI - 0.25; scene.add(apple.root);
  // ---- Times Square crowd: people on the steps and on the plaza (stand / sit, breathing, looking round) ----
  const crowdN = ['Male_Adult_01', 'Female_Adult_17', 'Business_Male_02', 'Female_Party_02', 'Male_Adult_11', 'Business_Male_04', 'Sports_Male_04',
    'Female_Adult_08', 'Male_Adult_08', 'Female_Adult_04', 'Male_Adult_06', 'Female_Adult_03', 'Male_Adult_12', 'Female_Adult_06'];
  const crowd = []; for (const n of crowdN) { const a = await loadAvatar(n, { env, lod: 512 }); scene.add(a.root); crowd.push(a); }
  // at absolute zero the frost takes everyone too (the posed copies share these materials)
  const frosted = new Set();
  for (const a of [you, ...crowd]) a.root.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) if (!frosted.has(m) && m.isMeshStandardMaterial) { frostize(m, { k: 0.75 }); frosted.add(m); } });
  for (const o of [coffee, snowman]) o.traverse((c) => { if (c.material) for (const m of [].concat(c.material)) if (!frosted.has(m) && m.isMeshStandardMaterial) { frostize(m, { k: 0.7 }); frosted.add(m); } });
  const cr = rng(17);
  // the rest of the crowd: posed copies of the same people (skeleton clones sharing meshes and textures), standing in
  // twos and threes on the plaza and the sidewalks further away; they hold still, so they stay 12 m or more from the lens
  const okXZ = (x, z) => Math.abs(x) > 10.5 && !TSQ.CROSS.some((c) => Math.abs(z - c) < 10) && !(x > -31 && x < -13 && z > -25 && z < -10) && Math.abs(x - xb(z)) < 11.5;
  const extras = []; let guard = 0;
  while (extras.length < 150 && guard++ < 9000) {
    const z = 6 + cr() * 330, x = xb(z) + (cr() - 0.5) * 23; if (!okXZ(x, z)) continue;
    const n = 1 + Math.floor(cr() * 3), yaw0 = cr() * 6.28;
    for (let k = 0; k < n && extras.length < 150; k++) {
      const base = crowd[(extras.length * 7) % crowd.length], px = x + (k - n / 2) * 0.65, pz = z + (cr() - 0.5) * 0.6;
      if (!okXZ(px, pz)) continue;
      stand(base, { pos: V(0, 0, 0), yaw: 0, breath: cr(), stride: (cr() - 0.5) * 0.8, look: V((cr() - 0.5) * 6, 1.5 + cr() * 2, 8) });
      const c = skClone(base.root); c.position.set(px, c.position.y, pz); c.rotation.y = yaw0 + (cr() - 0.5) * 1.2; scene.add(c); extras.push(c);
    }
  }
  const seats = [[2, -19.2, 0.2], [9, -16.4, -0.3], [11, -25.5, 0.4], [4, -27.5, 0.1], [13, -17.1, -0.2]];   // [step, x, yaw]
  const stands = [[-30, 13, 2.6], [-29.2, 13.6, -2.4], [-22, 16, 3.4], [-36, 22, 1.2], [-17, 26, -2.0], [-31, 31, 0.4], [-21, 38, 3.0], [-38, 44, -1.0], [-16.5, 52, 2.2]];   // [x, z, yaw]: on the plaza south of 46th
  // ---- 7th Avenue: yellow cabs, a few cars and a bus heading south with their lights on (frozen at the stop) ----
  const cars = [], car = rng(23), lanes = [-7.0, -3.4, 0.2, 3.8, 7.1];   // 7th Avenue: four southbound lanes and the bus lane
  lanes.forEach((x, li) => { let z = -300 + car() * 20; while (z < 600) {
    const bus = li === 4; const type = bus ? 'bus' : car() < 0.7 ? 'sedan' : car() < 0.5 ? 'suv' : 'hatch';
    const taxi = !bus && type === 'sedan' && car() < 0.85;
    const c = makeCar(type, taxi ? '#f1b400' : ['#1c1e21', '#c9ccd0', '#8a1c1c', '#24406e'][Math.floor(car() * 4)], car);
    if (taxi) { const sgn = taxiSign(); sgn.position.y = 1.42; c.group.add(sgn); }
    scene.add(c.group); cars.push({ ...c, x, z0: z, v: bus ? 7 : 8.5 + car() * 3 });
    z += c.L + 8 + car() * 26; } });
  // ---- effects ----
  const fxr = rng(41), smokeT = smokeAtlas(5);
  // your coffee's steam: a few soft wisps rising from the lid (frozen in mid-air during the stopped second)
  const STN = 18, steam = new Billboards(STN, { map: smokeT, tiles: [2, 2], additive: true, nearK: 0, near: 0.15 });
  const steamP = []; for (let i = 0; i < STN; i++) steamP.push([fxr(), fxr(), fxr()]);
  scene.add(steam.mesh);
  // the moisture in the air snowing out at the restart: diamond dust round the camera, then heavier snow
  // regions: [x0, x1, z0, z1, top, flake size (m), fall speed (m/s)]: round you, and the plaza in front of the sky shot's camera
  const SREG = [[HERO.x - 17, HERO.x + 17, HERO.z - 12, HERO.z + 28, 14, 0.006, 0.6, 12000], [-48, 12, 32, 150, 34, 0.016, 1.6, 12000]];
  const SN = SREG.reduce((a, r) => a + r[7], 0), snow = new Sparks(SN, { minPx: 1.6, maxPx: 9, near: 0.45, additive: true });
  { let i = 0; for (const [x0, x1, z0, z1, top, sz, vf, n] of SREG) for (let k = 0; k < n; k++, i++) {
    const dust = k < n * 0.45;                                  // 45 % appear at once (the moisture freezing in the air), the rest keep falling from above
    const vy = -vf * (0.6 + 0.8 * fxr()), y = dust ? 0.3 + fxr() * top : top, b = dust ? T.RESTART + fxr() * 0.3 : T.RESTART + fxr() * (T.SPACE - T.RESTART);
    const c = 0.6 + 0.4 * fxr();
    snow.set(i, x0 + fxr() * (x1 - x0), y, z0 + fxr() * (z1 - z0), (fxr() - 0.3) * 0.3 * vf, vy, (fxr() - 0.5) * 0.3 * vf, c * 0.82, c * 0.88, c, sz * (0.6 + 0.8 * fxr()), b, y / -vy, fxr());
  } }
  snow.commit(); snow.u.uTurb.value = 0.25; snow.u.uTurbF.value = 0.5; scene.add(snow.points);
  // the air itself falling (27-38): frozen air crystals streaking down the canyon, more and faster as the higher air arrives
  const FN = 10500, fall = new Streaks(FN, { widthPx: 2.0 });
  for (let i = 0; i < FN; i++) {
    const k = Math.sqrt(fxr()), b = T.SKY - 3 + (T.SPACE - T.SKY + 3) * k, v = 45 + 130 * k * (0.7 + 0.6 * fxr()), y0 = 60 + fxr() * 320;
    const z = i < 7000 ? 46 + fxr() * 300 : -420 + fxr() * 390, x = xW(z) + 1 + fxr() * (xE(z) - xW(z) - 2), c = 0.45 + 0.4 * fxr();   // inside the canyon, south (the sky shot) and north (the hook)
    fall.set(i, x, y0, z, v * 0.04 * (fxr() - 0.5), -v, v * 0.04 * (fxr() - 0.5), c * 0.8, c * 0.88, c, 0.8 + 0.5 * fxr(), b, y0 / v, fxr());
  }
  fall.commit(); fall.u.uTrail.value = 0.1; fall.u.uGain.value = 1.0; scene.add(fall.mesh);
  // dust motes round you, glinting in the screens' light: they hang still in the frozen second (and vanish into the frost)
  const MN = 900, motes = new Sparks(MN, { minPx: 1.6, maxPx: 7, near: 0.5, additive: true });
  for (let i = 0; i < MN; i++) {
    const a = fxr() * 6.283, rr = 0.6 + 3.4 * Math.sqrt(fxr()), y = HERO.y + 0.2 + fxr() * 2.4, tint = [[1, 0.88, 0.72], [0.62, 0.86, 1], [1, 0.62, 0.86]][Math.floor(fxr() * 3)], c = 0.6 + 0.6 * fxr();
    motes.set(i, HERO.x + Math.cos(a) * rr, y, HERO.z + 1.4 + Math.sin(a) * rr, (fxr() - 0.5) * 0.04, (fxr() - 0.5) * 0.02, (fxr() - 0.5) * 0.04, tint[0] * c, tint[1] * c, tint[2] * c, 0.003 + fxr() * 0.003, -100, 1000, fxr());
  }
  motes.commit(); motes.u.uTurb.value = 0.04; motes.u.uTurbF.value = 0.4; scene.add(motes.points);
  // the cloud deck at 2.5 km: after the restart it falls like everything else in the sky (free fall)
  const CLN = 320, clouds = new Billboards(CLN, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 20 });
  clouds.u.uLitCol.value.set('#a7aec8'); clouds.u.uShadeCol.value.set('#1f2338'); clouds.u.uFogD.value = 0;
  const cloudP = []; for (let i = 0; i < CLN; i++) cloudP.push([-700 + fxr() * 1400, (fxr() - 0.5) * 260, -500 + fxr() * 2300, 260 + fxr() * 260, fxr()]);
  scene.add(clouds.mesh);
  const cloudH = (story) => { const tr = Math.max(0, story - T.RESTART); return Math.max(110, 2320 - 0.5 * 9.81 * tr * tr); };   // a 2.3 km cloud base in free fall: on the rooftops (~240 m) at 37.6 s
  await Promise.all(TEX_PENDING);

  // the hand with the cup: right hand round the cup in front of you, the cup kept upright
  const B = you.bones, wpos = (n) => B[n].getWorldPosition(new THREE.Vector3());
  const blinkK = (t) => { let k = 0; for (const b0 of [4.1, 6.9, 9.3]) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  let cupFit = null;   // the cup's base centre in the right hand's bone frame, fitted once below
  function poseAll(tp) {
    const br = (k) => (tp * 0.24 + k) % 1;
    sit(you, { pos: V(HERO.x, HERO.y, HERO.z + 0.04), seat: 0.12, floor: HERO.y - 0.24, yaw: 0, legs: 'chair', arms: 'lap', fit: true, breath: br(0), curlR: Number(q.get('crR') ?? 0.75), thumbR: Number(q.get('thR') ?? -0.6), curlL: 0.18,
      handR: (P, fwd, left, up) => { const C = P.clone().addScaledVector(fwd, 0.36).addScaledVector(up, 0.2).addScaledVector(left, -0.04);
        return { hand: C.clone().addScaledVector(left, -0.05), pole: P.clone().addScaledVector(left, -0.55).addScaledVector(up, -0.05).addScaledVector(fwd, -0.1), F: fwd.clone().addScaledVector(left, 0.5).normalize(), N: left.clone() }; },
      look: V(HERO.x + 6 + 3 * Math.sin(tp * 0.21), HERO.y + 8 + 2 * Math.sin(tp * 0.3), HERO.z + 40) });
    you.blink(blinkK(tp));
    const hp = wpos('RightHand'), pn = wpos('RightHandIndex1').sub(wpos('RightHandPinky1')).normalize();
    const fd = wpos('RightHandMiddle1').sub(hp).normalize(), palm = pn.clone().cross(fd).normalize();
    if (cupFit) coffee.position.copy(B.RightHand.localToWorld(cupFit.clone()));
    else { coffee.position.copy(hp).addScaledVector(fd, 0.055).addScaledVector(palm, 0.06); coffee.position.y -= 0.075; }   // first guess: in front of the palm
    coffee.rotation.set(0, 0, 0); coffee.updateMatrixWorld();
    if (q.get('cupdbg')) {   // clearance of every finger joint from the cup's surface (cylinder r 0.032 at the bottom -> 0.043 at 0.13 m)
      const out = [];
      for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let j = 1; j <= 4; j++) {
        if (j < 4 && !B['RightHand' + f + j]) continue; if (j === 4 && !B['RightHand' + f + 3]) continue;
        const p = j < 4 ? wpos('RightHand' + f + j) : wpos('RightHand' + f + 3).multiplyScalar(1.85).addScaledVector(wpos('RightHand' + f + 2), -0.85);   // 4 = the fingertip (estimated)
        const h = p.y - coffee.position.y, rr = Math.hypot(p.x - coffee.position.x, p.z - coffee.position.z);
        const rc = h < 0 || h > 0.15 ? 0 : 0.032 + 0.011 * Math.min(h, 0.13) / 0.13; out.push(f[0] + j + ':' + (rr - rc).toFixed(3) + '@' + h.toFixed(3)); }
      console.log('cup clearance', tp.toFixed(2), out.join(' '));
    }
    seats.forEach(([si, x, yaw], i) => { const a = crowd[i], st = steps.seat(si);
      sit(a, { pos: V(x, st.y, st.z - 0.28), seat: 0.12, floor: st.y - 0.24, yaw, legs: 'chair', arms: 'lap', fit: true, curl: 0.2, breath: br(i * 0.17), look: V(x + 4 * Math.sin(tp * 0.2 + i), st.y + 6, 40) }); });
    stands.forEach(([x, z, yaw], j) => { const a = crowd[seats.length + j];
      stand(a, { pos: V(x, 0, z), yaw, breath: br(0.3 + j * 0.11), stride: 0.2 * Math.sin(j * 1.7), look: V(x + 10 * Math.sin(yaw), 6 + 3 * Math.sin(tp * 0.25 + j), z + 10 * Math.cos(yaw)) }); });
    for (const c of cars) { const z = -300 + (((c.z0 + 300) + c.v * tp) % 900 + 900) % 900; c.group.position.set(c.x, 0.005, z); c.group.rotation.set(0, Math.PI / 2, 0); }
  }

  // fit the cup into the grip once (the hand barely moves): the axis position where every joint of the hand clears the
  // cup's surface by its skin thickness (palm 16-22 mm, knuckles 12, fingers 8.5, tips 7), then the cup's girth scaled
  // (within 0.9-1.2) so the closest fingers touch it; the cup then rides the hand bone at that offset
  {
    poseAll(0);
    const PT = [[wpos('RightHand'), 0.022]];
    for (const f of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) {
      if (!B['RightHand' + f + '3']) continue;
      const j1 = wpos('RightHand' + f + '1'), j2 = wpos('RightHand' + f + '2'), j3 = wpos('RightHand' + f + '3');
      if (f !== 'Thumb') { PT.push([j1, 0.012], [j1.clone().lerp(wpos('RightHand'), 0.5), 0.016]); } else PT.push([j1, 0.011]);
      PT.push([j2, 0.0085], [j3, 0.008], [j3.clone().multiplyScalar(1.85).addScaledVector(j2, -0.85), 0.007]);
    }
    const c0 = coffee.position.clone(), rAt = (h, k) => (h > 0.125 ? 0.047 : 0.032 + 0.011 * Math.max(0, h) / 0.13) * k;
    // clearance of every hand point from the cup (side wall and lid; points under the base must stay a skin below it)
    const margin = (x, y, z, k) => { let m = 1; for (const [p, sk] of PT) { const h = p.y - y, rr = Math.hypot(p.x - x, p.z - z);
      if (h > 0.152 || h < -0.03) continue;
      if (h < 0) { if (rr < 0.032 * k + sk) m = Math.min(m, -h - sk); continue; }
      m = Math.min(m, rr - rAt(h, k) - sk); } return m; };
    // among the spots where nothing goes through the cup, the one that nestles deepest into the palm and the curled fingers
    const GRIP = PT.slice(1).filter((e, i) => i % 5 !== 0 && i < 20).concat([PT[0]]);   // palm + finger joints 2, 3, tips (not the thumb)
    const snug = (x, y, z) => { let sum = 0, n = 0; for (const [p, sk] of GRIP) { const h = p.y - y; if (h < 0 || h > 0.152) continue; sum += Math.hypot(p.x - x, p.z - z) - rAt(h, 1) - sk; n++; } return n >= 6 ? sum / n : 1; };
    let best = { m: -1, f: 1e9, x: c0.x, y: c0.y, z: c0.z };
    for (let dy = -0.03; dy <= 0.07; dy += 0.005) for (let i = -40; i <= 40; i++) for (let j = -40; j <= 40; j++) {
      const x = c0.x + i * 0.0015, y = c0.y + dy, z = c0.z + j * 0.0015, m = margin(x, y, z, 1); if (m < 0) continue;
      const f = snug(x, y, z); if (f < best.f) best = { m, f, x, y, z };
    }
    let k = 1; if (best.m > 0.0015) k = Math.min(1.2, 1 + (best.m - 0.001) / 0.038);
    coffee.scale.set(k, 1, k);
    console.log('cup fit: margin', best.m.toFixed(4), 'snug', best.f.toFixed(4), 'girth x', k.toFixed(3), 'margin after', margin(best.x, best.y, best.z, k).toFixed(4), 'moved', (best.x - c0.x).toFixed(3), (best.y - c0.y).toFixed(3), (best.z - c0.z).toFixed(3));
    cupFit = B.RightHand.worldToLocal(new THREE.Vector3(best.x, best.y, best.z));
  }

  function hudAt(t, story) {
    if (t < T.STOP) return { a: 1, lab: 'Every atom on Earth stops in', val: fmtT(T.STOP - t), sub: 'Times Square, New York · 6:42 pm', sub2: 'Air molecules: 500 m/s' };
    if (story < T.RESTART) return { a: 1, lab: 'Frozen', val: ((story - T.STOP) / (T.RESTART - T.STOP)).toFixed(3) + ' s', sub: 'Time slowed down 6×', sub2: 'Air molecules: 0 m/s' };
    if (story < T.VOSTOK) {
      const sub2 = story < 21.0 ? 'Everything: −273.15 °C' : story < T.SKY ? 'Every turbine on Earth stopped' : story < T.SPACE ? 'Air from 10 km: up to 1,600 km/h' : 'The air’s fall: 4 × 10²³ joules';
      return { a: 1, lab: 'Time since the restart', val: fmtSince(sinceAt(story)), sub: story < T.SPACE ? 'Real time' : 'Time sped up', sub2 };
    }
    if (t < T.END) return { a: smooth(T.VOSTOK, T.VOSTOK + 0.4, t) * (1 - smooth(T.END - 0.3, T.END, t)), lab: 'Vostok station, Antarctica', val: '−89.2 °C', sub: '21 July 1983', sub2: 'Absolute zero: −273.15 °C' };
    return null;
  }

  function frame(t) {
    const story = t < T.HOOK ? T.SKY + 10.3 + t * 0.08 : t;   // the hook flashes forward (slow motion): the frozen sky coming down on the towers
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.06; U.uContrast.value = 1.05; U.uVignette.value = 0.34; U.uAberr.value = 0.0006; U.uGrain.value = 0;
    TQ.uScrT.value = Math.min(story, T.STOP); TQ.uTime.value = t;
    let rscene = scene;
    if (story >= T.SPACE && story < T.VOSTOK) {
      // ---------------- space: Earth turns white ----------------
      rscene = SPc.scene;
      const u = clamp((story - T.SPACE) / (T.VOSTOK - T.SPACE)), S = SPc.U;
      S.uLights.value = 0; S.uClouds.value = 1 - smooth(0.0, 0.35, u); S.uCloudLow.value = smooth(0.0, 0.3, u);
      S.uLandW.value = smooth(0.1, 0.5, u); S.uSeaW.value = smooth(0.2, 0.75, u); S.uAtm.value = 1 - 0.65 * smooth(0.0, 0.4, u); S.uTime.value = story;   // the frozen air settles on land and sea alike (1-10 min)
      const drift = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.06 * u);
      const dir = camDirS.clone().applyQuaternion(drift);
      camS.position.copy(dir).multiplyScalar(7.0 - 0.4 * smooth(0, 1, u)); camS.up.set(0, 1, 0); camS.lookAt(0, 0, 0); camS.updateMatrixWorld();
      SPc.stars.u.uGain.value = 0.9; SPc.stars.u.uPR.value = R.SSAA;
      const e = 1.0 - 0.3 * smooth(0.3, 0.9, u);
      R.renderer.toneMappingExposure = e; R.bloom.strength = 0.35; R.bloom.radius = 0.5; R.bloom.threshold = 0.95 / e;
      U.uFadeWhite.value = Math.exp(-(story - T.SPACE) * 4) * 0.8;    // out of the white-out of the falling sky
    } else if (story >= T.VOSTOK) {
      // ---------------- Vostok station, 21 July 1983 ----------------
      rscene = VK.scene;
      const k = clamp((story - T.VOSTOK) / (T.END - T.VOSTOK));
      cam.position.set(2.6 - 0.9 * k, 1.25 + 0.1 * k, 7.5 - 3.2 * k); cam.fov = 40; cam.updateProjectionMatrix(); cam.up.set(0, 1, 0);   // low, the screen against the aurora
      cam.lookAt(VK.screenPos.x + 0.3 - 0.15 * k, VK.screenPos.y + 0.6 - 0.25 * k, VK.screenPos.z); cam.updateMatrixWorld();
      VK.aurora.material.uniforms.uT.value = story; VK.dust.update(story, cam, R.SSAA); VK.stars.u.uPR.value = R.SSAA;
      R.renderer.toneMappingExposure = 1.15; R.bloom.strength = 0.5; R.bloom.radius = 0.6; R.bloom.threshold = 0.95 / 1.15;
      U.uVignette.value = 0.45; U.uFade.value = 1 - smooth(T.VOSTOK, T.VOSTOK + 0.3, story);
    } else {
    if (t < T.HOOK) hookCam(cam, t); else if (story < T.STOP) glide.apply(cam, story); else if (story < T.RESTART) frozen.apply(cam, story); else if (story < T.SKY) restart.apply(cam, story); else sky.apply(cam, story);
    if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
    poseAll(Math.min(story, T.STOP));
    apple.update(t, { look: cam.position, blinkAt: [9.5], earAt: [8.9], pr: R.SSAA }); apple.root.visible = story < T.STOP;
    setShadow(new THREE.Vector3(HERO.x, 0, HERO.z + 4), 26);
    // the stop and the restart: power dies with the turbines (screens, windows, street lamps), frost grows, snow falls
    const tr = story - T.RESTART, frozenK = story >= T.STOP && story < T.RESTART ? 1 : 0;
    const power = 1 - smooth(T.RESTART + 0.15, T.RESTART + 1.4, story);
    TQ.uPower.value = power; ST.lampM.emissiveIntensity = 3.0 * power; steps.booth.emissiveIntensity = 0.55 * power;
    for (const l of scrL) l.intensity = 2400 * power;
    const dark = 1 - power;                                     // the blackout: only the twilight sky lights the square
    hemi.intensity = 1.0 - 0.45 * dark; hemi.groundColor.set('#6a4a3a').lerp(DARKG, dark); scene.environmentIntensity = 0.9 - 0.42 * dark;
    key.intensity = 0.9 - 0.3 * dark; front.intensity = 0.7 * (1 - 0.85 * dark);
    const haze = smooth(T.SKY + 3, T.SPACE, story);              // the falling ice fills the canyon
    scene.fog.density = 0.0011 + 0.0024 * haze; scene.fog.color.set('#2b3352').lerp(HAZEC, haze);
    motes.update(Math.min(story, T.STOP), cam, R.SSAA); motes.u.uGain.value = 1 - smooth(T.RESTART, T.RESTART + 0.6, story);
    fall.update(story); fall.u.uTrail.value = t < T.HOOK ? 0.04 : 0.1;
    fall.mesh.visible = story > T.SKY - 3;
    TQ.uFrost.value = smooth(T.RESTART + 0.3, T.RESTART + 6.0, story) * 0.85 + smooth(T.SKY, T.SKY + 8, story) * 0.15;
    snow.update(story, cam, R.SSAA); snow.u.uGain.value = 1.3;
    // coffee steam: rises before the stop, hangs during it, gone (frozen to ice) after the restart
    const ts = Math.min(story, T.STOP), lid = coffee.position.clone().add(V(0, 0.15, 0));
    for (let i = 0; i < STN; i++) {
      const [a, b, c] = steamP[i], age = (ts * 0.35 + a) % 1, rise = age * 0.32;
      if (story >= T.RESTART + 0.4) { steam.hide(i); continue; }
      const fade = story >= T.RESTART ? 1 - smooth(T.RESTART, T.RESTART + 0.4, story) : 1;
      steam.set(i, lid.x + (b - 0.5) * 0.03 + Math.sin(age * 5 + c * 6) * 0.02 * age, lid.y + rise, lid.z + (c - 0.5) * 0.03, 0.05 + age * 0.12, 0.05 + age * 0.12,
        0.9, 0.9, 0.92, 0.18 * Math.sin(Math.PI * age) * fade, a * 6.28 + age, Math.floor(b * 4));
    }
    steam.commit(); steam.update(cam, R.SSAA);
    const ch = cloudH(story);
    for (let i = 0; i < CLN; i++) { const [x, dy, z, sz, sd] = cloudP[i]; clouds.set(i, x, ch + dy + sz * 0.3, z, sz, sz * 0.6, 1, 1, 1, 0.85, sd * 6.28, Math.floor(sd * 4)); }
    clouds.commit(); clouds.update(cam, R.SSAA, new THREE.Vector3(-0.8, -0.1, 0.4).normalize());
    // grade: neutral dusk, a cold blue cast while frozen, then colder and darker after the blackout
    U.uSat.value = 1.06 - 0.35 * frozenK - 0.2 * smooth(T.RESTART, T.RESTART + 3, story);
    U.uTint.value.set(1 - 0.06 * frozenK - 0.08 * (1 - power) * (story > T.RESTART ? 1 : 0), 1 - 0.02 * frozenK, 1 + 0.06 * frozenK + 0.05 * (1 - power));
    const exp0 = 0.8 + 0.12 * (1 - power) * (story > T.RESTART ? 1 : 0);
    R.renderer.toneMappingExposure = exp0; R.bloom.strength = 0.5; R.bloom.radius = 0.6; R.bloom.threshold = 0.95 / exp0;
    if (t >= T.HOOK && story > T.SPACE - 1.0) U.uFadeWhite.value = smooth(T.SPACE - 1.0, T.SPACE, story);   // the cloud wall reaches the rooftops
    }
    R.renderPass.scene = rscene; R.renderPass.camera = rscene === SPc.scene ? camS : cam;
    R.composer.render();
    // ---------------- overlay ----------------
    const cover = q.get('cover') === '1';
    const endA = smooth(T.END, T.END + 0.5, t);
    ov.apply({ labels: [], tag: 'WHAT IF &nbsp;·&nbsp; 06', tagA: t < T.END ? 1 : 0, title: { html: TITLE, a: cover ? 1 : t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0, k: 1 },
      hud: cover ? null : hudAt(t, story), caption: cover ? null : captionAt(CAPTIONS, t),
      end: endA > 0 ? { a: endA, title: TITLE, note: '<span class="q">Would you survive the first second?</span><br><br>Air molecules: 500 m/s → 0 in an instant<br>Coldest ever measured: −89.2 °C (Vostok, 1983)' } : null });
    tag.update(t, T.END + 0.5, endA);
  }
  window.EP = { scene, cam, THREE, TQ };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
