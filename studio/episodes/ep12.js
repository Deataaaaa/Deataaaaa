// Post 6: What if every atom on Earth stopped moving for 1 second? (approved by the owner, 10 Oct 2026)
// Hook (0-3.6): flash-forward, the sky falling on Times Square. Glide (3.6-10.6): dusk, a drone sinks to you on the red
// steps with a coffee, countdown. Frozen second (10.6-17): bullet time, silence. Restart (17-27): absolute zero, the
// screens die, frost, the moisture in the air snows out. The sky falls (27-38). Space (38-50): Earth turns white.
// Vostok 1983 (50-62): the coldest ever measured. Loop end card + Follow for more (62-68).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRenderer, Overlay, W, H, rng, smooth, clamp } from '../engine/core.js';
import { makeDuskSky } from '../engine/guarapari.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { TSQ, TQ, xb, makeGround, makeSteps, makeBuildings, makeStreet, frostize } from '../engine/tsq.js';
import { loadAdFonts, makeAdAtlases } from '../engine/ads6.js';
import { fadeShadowBorders, Sparks, Billboards, smokeAtlas } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { sit, stand } from '../engine/poses.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { makeCat } from '../engine/cat.js';
import { makeCar } from '../engine/town5.js';
import { makeCoffee, makeSnowman, taxiSign } from '../engine/props6.js';
import { HERO, T, DUR, hookCam, glide, frozen, restart, sky } from './ep12cams.js';

const TITLE = 'What if every atom on Earth <span class="k">stopped moving</span> for 1 second?';
const CAPTIONS = [];

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
  const steps = makeSteps(); scene.add(steps.group);
  await loadAdFonts(); const ads = makeAdAtlases();
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
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---- you: on step 7 of the red steps with a coffee, a snowman in sunglasses beside you (rule 19's WTF) ----
  const you = await loadAvatar('Female_Adult_05', { env, facial: true }); scene.add(you.root);
  console.log('blink shapes:', you.shapeNames.filter((n) => /Blink/.test(n)).join(' '));
  const coffee = makeCoffee(); scene.add(coffee);
  const snowman = makeSnowman(); snowman.position.set(HERO.x - 1.25, HERO.y, HERO.z + 0.02); snowman.rotation.y = 0.3; scene.add(snowman);
  // ---- Apple, hidden at the top of the steps (only in the calm part: he is never caught in the freeze) ----
  const apple = makeCat(); apple.root.position.set(-15.0, steps.seat(19).y, steps.seat(19).z - 0.3); apple.root.rotation.y = -0.35; scene.add(apple.root);
  // ---- Times Square crowd: people on the steps and on the plaza (stand / sit, breathing, looking round) ----
  const crowdN = ['Male_Adult_01', 'Female_Adult_17', 'Business_Male_02', 'Female_Party_02', 'Male_Adult_11', 'Business_Male_04', 'Sports_Male_04',
    'Female_Adult_08', 'Male_Adult_08', 'Female_Adult_04', 'Male_Adult_06', 'Female_Adult_03', 'Male_Adult_12', 'Female_Adult_06'];
  const crowd = []; for (const n of crowdN) { const a = await loadAvatar(n, { env, lod: 512 }); scene.add(a.root); crowd.push(a); }
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
  const SN = 9000, snow = new Sparks(SN, { minPx: 1.6, maxPx: 7, near: 0.4, additive: true });
  for (let i = 0; i < SN; i++) {
    const near = i < 6000, x = HERO.x + (fxr() - 0.5) * (near ? 34 : 90), z = HERO.z + 8 + (fxr() - 0.5) * (near ? 40 : 160), y = 0.3 + fxr() * (near ? 14 : 40);
    const c = 0.65 + 0.35 * fxr();
    snow.set(i, x, y, z, (fxr() - 0.5) * 0.25, -(0.25 + fxr() * 0.6), (fxr() - 0.5) * 0.25, c * 0.9, c * 0.95, c, 0.004 + fxr() * 0.006, T.RESTART + fxr() * 0.25, 200, fxr());
  }
  snow.commit(); snow.u.uTurb.value = 0.25; snow.u.uTurbF.value = 0.5; scene.add(snow.points);
  // the cloud deck at 2.5 km: after the restart it falls like everything else in the sky (free fall)
  const CLN = 320, clouds = new Billboards(CLN, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 20 });
  clouds.u.uLitCol.value.set('#e9a58c'); clouds.u.uShadeCol.value.set('#3c3e5c'); clouds.u.uFogD.value = 0;
  const cloudP = []; for (let i = 0; i < CLN; i++) cloudP.push([-700 + fxr() * 1400, (fxr() - 0.5) * 260, -500 + fxr() * 2300, 260 + fxr() * 260, fxr()]);
  scene.add(clouds.mesh);
  const cloudH = (story) => { const tr = Math.max(0, story - T.RESTART); return Math.max(140, 2500 - 0.5 * 9.81 * tr * tr); };
  await Promise.all(TEX_PENDING);

  // the hand with the cup: right hand round the cup in front of you, the cup kept upright
  const B = you.bones, wpos = (n) => B[n].getWorldPosition(new THREE.Vector3());
  const blinkK = (t) => { let k = 0; for (const b0 of [4.1, 6.9, 9.3]) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  function poseAll(tp) {
    const br = (k) => (tp * 0.24 + k) % 1;
    sit(you, { pos: V(HERO.x, HERO.y, HERO.z + 0.04), seat: 0.12, floor: HERO.y - 0.24, yaw: 0, legs: 'chair', arms: 'lap', breath: br(0), curl: 0.62,
      handR: (P, fwd, left, up) => { const C = P.clone().addScaledVector(fwd, 0.36).addScaledVector(up, 0.2).addScaledVector(left, -0.04);
        return { hand: C.clone().addScaledVector(left, -0.05), pole: P.clone().addScaledVector(left, -0.55).addScaledVector(up, -0.05).addScaledVector(fwd, -0.1), F: fwd.clone().addScaledVector(left, 0.5).normalize(), N: left.clone() }; },
      look: V(HERO.x + 6 + 3 * Math.sin(tp * 0.21), HERO.y + 8 + 2 * Math.sin(tp * 0.3), HERO.z + 40) });
    you.blink(blinkK(tp));
    const hp = wpos('RightHand'), pn = wpos('RightHandIndex1').sub(wpos('RightHandPinky1')).normalize();
    const fd = wpos('RightHandMiddle1').sub(hp).normalize(), palm = pn.clone().cross(fd).normalize();
    coffee.position.copy(hp).addScaledVector(fd, 0.055).addScaledVector(palm, -0.045); coffee.position.y -= 0.075; coffee.rotation.set(0, 0, 0); coffee.updateMatrixWorld();
    seats.forEach(([si, x, yaw], i) => { const a = crowd[i], st = steps.seat(si);
      sit(a, { pos: V(x, st.y, st.z - 0.28), seat: 0.12, floor: st.y - 0.24, yaw, legs: 'chair', arms: 'lap', breath: br(i * 0.17), look: V(x + 4 * Math.sin(tp * 0.2 + i), st.y + 6, 40) }); });
    stands.forEach(([x, z, yaw], j) => { const a = crowd[seats.length + j];
      stand(a, { pos: V(x, 0, z), yaw, breath: br(0.3 + j * 0.11), stride: 0.2 * Math.sin(j * 1.7), look: V(x + 10 * Math.sin(yaw), 6 + 3 * Math.sin(tp * 0.25 + j), z + 10 * Math.cos(yaw)) }); });
    for (const c of cars) { const z = -300 + (((c.z0 + 300) + c.v * tp) % 900 + 900) % 900; c.group.position.set(c.x, 0.005, z); c.group.rotation.set(0, Math.PI / 2, 0); }
  }

  function frame(t) {
    const story = t < T.HOOK ? T.SKY + 9.0 + t * 0.12 : t;   // the hook flashes forward: the clouds coming down on the towers
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.06; U.uContrast.value = 1.05; U.uVignette.value = 0.34; U.uAberr.value = 0.0006; U.uGrain.value = 0;
    TQ.uScrT.value = Math.min(story, T.STOP); TQ.uTime.value = t;
    if (t < T.HOOK) hookCam(cam, t); else if (story < T.STOP) glide.apply(cam, story); else if (story < T.RESTART) frozen.apply(cam, story); else if (story < T.SKY) restart.apply(cam, story); else sky.apply(cam, story);
    if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
    poseAll(Math.min(story, T.STOP));
    apple.update(t, { look: cam.position, blinkAt: [7.4], earAt: [5.2], pr: R.SSAA }); apple.root.visible = story < T.STOP;
    setShadow(new THREE.Vector3(HERO.x, 0, HERO.z + 4), 26);
    // the stop and the restart: power dies with the turbines (screens, windows, street lamps), frost grows, snow falls
    const tr = story - T.RESTART, frozenK = story >= T.STOP && story < T.RESTART ? 1 : 0;
    const power = 1 - smooth(T.RESTART + 0.15, T.RESTART + 1.4, story);
    TQ.uPower.value = power; ST.lampM.emissiveIntensity = 3.0 * power;
    for (const l of scrL) l.intensity = 2400 * power;
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
    const exp0 = 0.8 + 0.35 * (1 - power) * (story > T.RESTART ? 1 : 0);
    R.renderer.toneMappingExposure = exp0; R.bloom.strength = 0.5; R.bloom.radius = 0.6; R.bloom.threshold = 0.95 / exp0;
    if (story > T.SKY + 9.6) U.uFadeWhite.value = smooth(T.SKY + 9.6, T.SKY + 11.0, story);   // the cloud wall reaches the rooftops
    R.renderPass.scene = scene; R.renderPass.camera = cam;
    R.composer.render();
    ov.apply({ labels: [], tag: 'WHAT IF &nbsp;·&nbsp; 06', tagA: 1, title: { html: TITLE, a: t < T.HOOK ? 1 : 0, k: 1 }, hud: null, caption: null, end: null });
  }
  window.EP = { scene, cam, THREE, TQ };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
