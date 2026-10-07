// NEW DAY 2 — What if your elevator's cable snapped?
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeIn, easeOut, project, W, H } from '../engine/core.js';
import { Puffs, streakTex, makeStars } from '../engine/assets.js';
import { makeOtisScene } from '../engine/otis.js';
import { CAR, FLOOR_H, makeCar, makeShaft, makeCables, loadMannequin, cloneMannequin, offsetBone, loadPH, twoBoneIK, orientHand, handAxes, cloneHuman, makeRetarget, TEX_PENDING } from '../engine/elevator.js';

// ---------- facts (notes/facts.md) ----------
const G = 9.81;
const FALL_H = 50;                          // 16th floor ~ 50 m
const T_FALL = Math.sqrt(2 * FALL_H / G);   // 3.19 s
const V_HIT = G * T_FALL;                   // 31.3 m/s = 113 km/h
const T_SNAP = 8.6, SLOW = 8;
const T_FREEZE = 24.3, T_REW_END = 27.6;
const DUR = 53.8;

const CAPTIONS = [
  [3.5, 5.6, "You're in an elevator on the 16th floor."],
  [5.7, 8.4, '50 meters above the ground.'],
  [8.8, 11.4, 'The cable snaps.'],
  [11.5, 14.6, "You're in free fall. For 3 seconds, you weigh nothing."],
  [14.7, 18.0, "You'd hit the bottom at 113 km/h."],
  [18.1, 21.4, "Jump at the last second? You're floating. There's no floor to push off."],
  [21.5, 24.2, 'And even a perfect jump only takes off 10% of the speed.'],
  [24.45, 27.5, 'But this almost never happens. Here’s why.'],
  [27.8, 31.4, 'Elevators hang from 4 to 8 steel cables. Usually any one of them can hold the car.'],
  [31.5, 35.3, 'If the car ever falls too fast, brakes clamp onto the rails.'],
  [35.45, 38.3, "You'd drop a meter or two. Then stop."],
  [38.5, 42.3, 'Elisha Otis showed this off in 1854, by having his own rope cut.'],
  [42.45, 46.2, 'The longest elevator fall anyone survived: 75 floors, in 1945.'],
  [46.4, 49.6, 'So next time an elevator jolts… relax.'],
];
const TITLE = 'What if your elevator’s <span class="k">cable</span> snapped?';
const ENDNOTE = 'Free fall from 50 m: 3.2 s, 113 km/h<br>Modern elevators: several cables + overspeed brakes';

function timer(sec) { const s = Math.max(0, sec); const m = Math.floor(s / 60); const r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; }

export async function create() {
  RectAreaLightUniformsLib.init();
  const R = createRenderer();
  R.renderer.toneMappingExposure = 0.95;
  const ov = new Overlay();

  // ================= interior scene =================
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0b0d');
  const car = makeCar({ mirror: true });
  scene.add(car.group);
  car.shell.visible = false; car.frame.visible = false;
  const area = new THREE.RectAreaLight('#fff6ea', 3.0, CAR.W - 0.5, CAR.D - 0.5);
  area.position.set(0, CAR.H - 0.01, 0); area.rotation.x = -Math.PI / 2; scene.add(area);
  const spot = new THREE.SpotLight('#fff4e6', 3.2, 6, 1.15, 1.0, 1.6); spot.position.set(0.1, CAR.H - 0.05, 0.05); spot.target.position.set(0.2, 0, -0.1);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005; spot.shadow.radius = 4; scene.add(spot, spot.target);
  const fill = new THREE.HemisphereLight('#dfe6ee', '#3b3530', 0.18); scene.add(fill);
  // lobby beyond the doors (seen at the end)
  const lobby = new THREE.Group(); scene.add(lobby);
  const lobFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), new THREE.MeshStandardMaterial({ ...loadPH('granite_tile', 4), color: '#e8e6e2', roughness: 0.6 }));
  lobFloor.rotation.x = -Math.PI / 2; lobFloor.position.set(0, -0.005, CAR.D / 2 + 5); lobby.add(lobFloor);
  const lobWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), new THREE.MeshStandardMaterial({ color: '#f1efea', roughness: 0.9 })); lobWall.position.set(0, 2.5, CAR.D / 2 + 7.5); lobWall.rotation.y = Math.PI; lobby.add(lobWall);
  const lobLight = new THREE.RectAreaLight('#fffaf0', 0, 6, 3); lobLight.position.set(0, 3.2, CAR.D / 2 + 3); lobLight.rotation.x = -Math.PI / 2; scene.add(lobLight);
  const plant = new THREE.Group(); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.6, 20), new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.5 })); pot.position.y = 0.3; plant.add(pot);
  for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshStandardMaterial({ color: '#3e6b3a', roughness: 0.8, flatShading: true })); lf.position.set(Math.sin(i * 2.1) * 0.22, 0.8 + (i % 3) * 0.25, Math.cos(i * 2.1) * 0.22); plant.add(lf); }
  plant.position.set(1.05, 0, CAR.D / 2 + 0.5); lobby.add(plant);
  // lobby wall around the landing doorway + hall lantern above it
  { const wm = new THREE.MeshStandardMaterial({ color: '#e7e3dc', roughness: 0.85 }), zf = CAR.D / 2 + 0.07;
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5), wm); p.position.set(sx * (0.55 + 2.75), 2.5, zf); lobby.add(p); }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 5 - 2.25), wm); top.position.set(0, 2.25 + (5 - 2.25) / 2, zf); lobby.add(top);
    const fm = new THREE.MeshStandardMaterial({ color: '#9da2a8', metalness: 0.85, roughness: 0.3 });
    for (const sx of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.28, 0.04), fm); j.position.set(sx * 0.58, 1.14, zf + 0.02); lobby.add(j); }
    const hd = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.06, 0.04), fm); hd.position.set(0, 2.28, zf + 0.02); lobby.add(hd);
    const lc = document.createElement('canvas'); lc.width = 128; lc.height = 64; const lg = lc.getContext('2d'); lg.fillStyle = '#0b0b0c'; lg.fillRect(0, 0, 128, 64); lg.fillStyle = '#ff3326'; lg.font = 'bold 44px monospace'; lg.textAlign = 'center'; lg.textBaseline = 'middle'; lg.fillText('16', 64, 34);
    const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace;
    const lan = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshBasicMaterial({ map: lt, toneMapped: false })); lan.position.set(0, 2.5, zf + 0.01); lobby.add(lan); }
  // static environment captured from inside the car (realistic reflections in the steel)
  {
    const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cubeCam = new THREE.CubeCamera(0.05, 50, cubeRT); cubeCam.position.set(0, 1.4, 0);
    car.reflector.visible = false; lobby.visible = false; scene.add(cubeCam); cubeCam.update(R.renderer, scene); car.reflector.visible = true;
    car.reflector.camera.layers.enable(1); // the mirror still sees the front wall when the main camera does not
    const pm = new THREE.PMREMGenerator(R.renderer); scene.environment = pm.fromCubemap(cubeRT.texture).texture; scene.environmentIntensity = 0.75;
  }

  // mannequin ("you")
  const gltf = await loadMannequin();
  // "you": a real-looking person, posed through the Xbot rig (driver) the poses below were tuned on
  const drv = cloneMannequin({ scene: SkeletonUtils.clone(gltf.scene), animations: gltf.animations });
  const human = await loadMannequin('/engine/models/Michelle.glb');
  const me = cloneHuman(human);
  scene.add(me.root);
  const retarget = makeRetarget(drv, me);
  const idle = drv.mixer.clipAction(drv.clips.idle); idle.play();
  const walk = drv.mixer.clipAction(drv.clips.walk); walk.play(); walk.weight = 0;
  // phone (attached to the right hand)
  const phone = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.156, 0.011), new THREE.MeshPhysicalMaterial({ color: '#e2643a', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }));
  const screenC = document.createElement('canvas'); screenC.width = 128; screenC.height = 256;
  { const gq = screenC.getContext('2d'); const gr = gq.createLinearGradient(0, 0, 128, 256); gr.addColorStop(0, '#3a6df0'); gr.addColorStop(1, '#a24ff0'); gq.fillStyle = gr; gq.fillRect(0, 0, 128, 256); gq.fillStyle = 'rgba(255,255,255,.85)'; gq.font = 'bold 34px sans-serif'; gq.textAlign = 'center'; gq.fillText('9:41', 64, 70); for (let i = 0; i < 4; i++) { gq.fillStyle = 'rgba(255,255,255,.25)'; gq.fillRect(14, 110 + i * 34, 100, 24); } }
  const screenT = new THREE.CanvasTexture(screenC); screenT.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.146), new THREE.MeshBasicMaterial({ map: screenT, color: new THREE.Color(0.82, 0.82, 0.82), toneMapped: false })); screen.position.z = 0.0042;
  const glow = new THREE.PointLight('#a9c1ff', 0.12, 0.7, 2); glow.position.z = 0.06;
  phone.add(body, screen, glow); scene.add(phone);
  screen.position.z = 0.0058;

  // ================= shaft scene =================
  const shaftScene = new THREE.Scene(); shaftScene.background = new THREE.Color('#050506');
  const shaft = makeShaft({ floors: 18 }); shaftScene.add(shaft.group);
  const car2 = makeCar({ mirror: false }); shaftScene.add(car2.group);
  car2.display.draw('16');
  const cables = makeCables(6, 60); car2.group.add(cables.group); cables.group.position.set(0, CAR.H + 0.7, 0);
  shaftScene.add(new THREE.HemisphereLight('#cfd6e0', '#26282b', 0.35));
  const work = new THREE.PointLight('#f4f1ea', 30, 30, 1.6); shaftScene.add(work);
  const work2 = new THREE.PointLight('#bcd2ff', 18, 30, 1.6); shaftScene.add(work2);
  const carGlow = new THREE.PointLight('#f6f3ee', 6, 6, 2); car2.group.add(carGlow); carGlow.position.set(0, CAR.H + 0.4, 0.9);
  const railLight = new THREE.PointLight('#e8eef8', 0, 2.5, 2); shaftScene.add(railLight);
  // the plunge (shot F): front wall with landing doors, the pit 50 m below floor 16, buffers, a light under the car
  const PLUNGE = 50, T_PLUNGE = Math.sqrt(2 * PLUNGE / G), CAR_END = 15 * FLOOR_H - PLUNGE, PIT_Y = CAR_END - 0.62;
  {
    const SW = 2.9, SD = 2.6, wallTop = shaft.height - 3;
    const conc2 = new THREE.MeshStandardMaterial({ ...loadPH('concrete_block_wall', 3), color: '#a9acaf', roughness: 1 });
    const fw = new THREE.Mesh(new THREE.PlaneGeometry(SW, wallTop - PIT_Y), conc2); fw.rotation.y = Math.PI; fw.position.set(0, (wallTop + PIT_Y) / 2, SD / 2); shaftScene.add(fw);
    for (const [w, x, z, ry] of [[SW, 0, -SD / 2, 0], [SD, -SW / 2, 0, Math.PI / 2], [SD, SW / 2, 0, -Math.PI / 2]]) {
      const pw = new THREE.Mesh(new THREE.PlaneGeometry(w, -3 - PIT_Y + 0.02), conc2); pw.rotation.y = ry; pw.position.set(x, (-3 + PIT_Y) / 2, z); shaftScene.add(pw);
    }
    const pitFloor = new THREE.Mesh(new THREE.PlaneGeometry(SW, SD), new THREE.MeshStandardMaterial({ ...loadPH('concrete_block_wall', 1), color: '#6d6f71', roughness: 0.9 }));
    pitFloor.rotation.x = -Math.PI / 2; pitFloor.position.y = PIT_Y; shaftScene.add(pitFloor);
    const doorMat = new THREE.MeshStandardMaterial({ color: '#5d6168', metalness: 0.7, roughness: 0.45 });
    const sillMat = new THREE.MeshStandardMaterial({ color: '#b9bcc0', metalness: 0.9, roughness: 0.35 });
    const hdrMat = new THREE.MeshStandardMaterial({ color: '#2f3237', metalness: 0.6, roughness: 0.5 });
    for (let f = 0; f < 18; f++) {
      const y = f * FLOOR_H;
      for (const sx of [-1, 1]) { const dp = new THREE.Mesh(new THREE.BoxGeometry(0.52, 2.1, 0.03), doorMat); dp.position.set(sx * 0.27, y + 1.05, SD / 2 - 0.03); shaftScene.add(dp); }
      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.09), sillMat); sill.position.set(0, y - 0.015, SD / 2 - 0.045); shaftScene.add(sill);
      const hdr = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.12), hdrMat); hdr.position.set(0, y + 2.22, SD / 2 - 0.06); shaftScene.add(hdr);
    }
    // spring buffers on the pit floor + the pit ladder
    const yel = new THREE.MeshStandardMaterial({ color: '#e0b622', roughness: 0.5, metalness: 0.3 }), red = new THREE.MeshStandardMaterial({ color: '#b3261e', roughness: 0.45, metalness: 0.4 });
    for (const bx of [-0.6, 0.6]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), hdrMat); base.position.set(bx, PIT_Y + 0.03, 0); shaftScene.add(base);
      const pts = []; for (let i = 0; i <= 140; i++) { const a = i / 140 * Math.PI * 2 * 7; pts.push(new THREE.Vector3(bx + Math.cos(a) * 0.12, PIT_Y + 0.06 + i / 140 * 0.5, Math.sin(a) * 0.12)); }
      const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.018, 6, false), red); shaftScene.add(spring);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 20), yel); cap.position.set(bx, PIT_Y + 0.59, 0); shaftScene.add(cap);
    }
    for (let i = 0; i < 9; i++) { const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), sillMat); rung.rotation.z = Math.PI / 2; rung.position.set(-SW / 2 + 0.12, PIT_Y + 0.3 + i * 0.3, -0.9); shaftScene.add(rung); }
    for (const rz of [-1.1, -0.7]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 3.0, 0.03), sillMat); rail.position.set(-SW / 2 + 0.12, PIT_Y + 1.5, rz); shaftScene.add(rail); }
  }
  const downLight = new THREE.SpotLight('#f3f5f8', 0, 60, 0.95, 0.6, 1.1); downLight.position.set(0.3, -0.35, 0.3); car2.group.add(downLight, downLight.target); downLight.target.position.set(0.25, -20, 0.1);
  // motion blur for the plunge: sub-frames averaged into a 2D canvas laid over the WebGL one
  const DBG = Object.fromEntries(new URLSearchParams(location.search));
  const blurC = document.createElement('canvas'); blurC.width = W; blurC.height = H;
  blurC.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px;display:none';
  document.getElementById('stage').appendChild(blurC); const bctx = blurC.getContext('2d');
  const sparks = new Puffs(400, { map: streakTex(), additive: true, renderOrder: 9 }); shaftScene.add(sparks.mesh);
  const dust = new Puffs(260, { renderOrder: 6 }); shaftScene.add(dust.mesh);
  const speedLines = new Puffs(160, { map: streakTex(), additive: true, renderOrder: 7 }); shaftScene.add(speedLines.mesh);
  shaftScene.environment = scene.environment; shaftScene.environmentIntensity = 0.6;

  // ================= 1854 vignette =================
  const otis1854 = makeOtisScene(gltf);

  const endScene = new THREE.Scene(); endScene.background = new THREE.Color('#0d0e11');
  const cam = new THREE.PerspectiveCamera(62, W / H, 0.02, 200);

  // ---------- timeline helpers ----------
  // tau: seconds since the snap in the hypothetical no-brake fall (with freeze + rewind)
  const tauOf = (t) => {
    if (t < T_SNAP) return 0;
    if (t < T_FREEZE) return (t - T_SNAP) / SLOW;
    const tf = (T_FREEZE - T_SNAP) / SLOW;
    if (t < T_FREEZE + 0.9) return tf;                                   // frozen
    if (t < T_REW_END) return tf * (1 - easeInOut((t - T_FREEZE - 0.9) / (T_REW_END - T_FREEZE - 0.9))); // rewind
    return 0;
  };
  const fallDist = (tau) => 0.5 * G * tau * tau;
  // brake scenario (shots J/K): trips at 3 m/s, decelerates at 0.6 g
  const brakeDrop = (s) => { const tTrip = 3 / G; if (s < tTrip) return 0.5 * G * s * s; const v0 = 3, a = 0.6 * G, s2 = s - tTrip, tStop = v0 / a; const d0 = 0.5 * G * tTrip * tTrip; return d0 + (s2 < tStop ? v0 * s2 - 0.5 * a * s2 * s2 : v0 * tStop - 0.5 * a * tStop * tStop); };
  const BRAKE_TOTAL = brakeDrop(10);
  const T_TRIP = 32.0 + 2.5 * (3 / G), T_HOLD = T_TRIP + 2.5 * (3 / (0.6 * G));

  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = new THREE.Vector3(0, 1, 0);
  const look = (pos, tgt, fov = 62, up = UP) => { cam.up.copy(up); cam.position.copy(pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(tgt); cam.updateMatrixWorld(); };

  const shots = [
    { t0: 0, t1: 3.4, kind: 'in', id: 'A' }, { t0: 3.4, t1: 5.6, kind: 'in', id: 'B' }, { t0: 5.6, t1: T_SNAP, kind: 'in', id: 'C' },
    { t0: T_SNAP, t1: 11.5, kind: 'in', id: 'D' }, { t0: 11.5, t1: 14.6, kind: 'in', id: 'E' }, { t0: 14.6, t1: 18.0, kind: 'shaft', id: 'F' },
    { t0: 18.0, t1: T_FREEZE, kind: 'in', id: 'G' }, { t0: T_FREEZE, t1: T_REW_END, kind: 'in', id: 'H' }, { t0: T_REW_END, t1: 31.4, kind: 'shaft', id: 'I' },
    { t0: 31.4, t1: 35.3, kind: 'shaft', id: 'J' }, { t0: 35.3, t1: 38.4, kind: 'in', id: 'K' }, { t0: 38.4, t1: 42.4, kind: 'old', id: 'L' },
    { t0: 42.4, t1: 46.3, kind: 'in', id: 'M' }, { t0: 46.3, t1: 49.8, kind: 'in', id: 'N' }, { t0: 49.8, t1: DUR + 1, kind: 'end', id: 'Z' },
  ];

  // ---------- poses ----------
  const shotAt = (t) => shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  const L2W = (x, y, z) => me.root.localToWorld(new THREE.Vector3(x, y, z));
  const dirL2W = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(me.root.quaternion).normalize();
  // right hand holding the phone in front of the chest, screen towards the eyes (IK, blended by w)
  function holdIK(w) {
    if (w <= 0.001) return;
    const names = ['RightArm', 'RightForeArm', 'RightHand'];
    const fk = names.map((n) => me.bones[n].quaternion.clone());
    twoBoneIK(me, 'RightArm', 'RightForeArm', 'RightHand', L2W(-0.1, 1.1, 0.27), L2W(-0.7, 0.3, -0.4));
    const wrist = me.bones.RightHand.getWorldPosition(new THREE.Vector3());
    orientHand(me, 'Right', dirL2W(0.45, 0.35, 1.0), me.bones.Head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.09, 0)).addScaledVector(dirL2W(0, 0, 1), 0.08).sub(wrist).normalize());
    if (w < 0.999) names.forEach((n, i) => { const b = me.bones[n]; const ik = b.quaternion.clone(); b.quaternion.copy(fk[i]).slerp(ik, w); });
    me.root.updateMatrixWorld(true);
  }
  function palmAnchor() {
    const hb = me.bones.RightHand; hb.updateMatrixWorld(true);
    const { f, n } = handAxes(me, 'Right');
    const q = hb.getWorldQuaternion(new THREE.Quaternion());
    const F = f.clone().applyQuaternion(q), N = n.clone().applyQuaternion(q);
    const pos = hb.getWorldPosition(new THREE.Vector3()).addScaledVector(F, 0.07).addScaledVector(N, 0.024);
    const X = new THREE.Vector3().crossVectors(F, N);
    return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, F, N)), F, N };
  }
  function pose(t, mode) {
    // base: idle animation at a time derived from t (looped), then additive offsets, all on the driver rig
    drv.mixer.setTime((t * 0.9) % 8 + 0.01);
    drv.root.updateMatrixWorld(true);
    const ph = { phoneHold: 1, float: 0, startle: 0, crouch: 0, land: 0, ...mode };
    const hold = ph.phoneHold * (1 - ph.float * 0.8);
    offsetBone(drv, 'Head', (0.38 * hold - 0.25 * ph.startle) * (1 - ph.float * 0.6), 0, 0);
    offsetBone(drv, 'Neck', 0.12 * hold, 0, 0);
    // weightless "neutral body posture": arms float forward/up, knees bend
    const f = ph.float;
    offsetBone(drv, 'LeftArm', 0, -0.55 * f, 0.55 * f + 0.3 * ph.startle);
    offsetBone(drv, 'RightArm', 0, 0.2 * f, -0.65 * f - 0.3 * ph.startle);
    offsetBone(drv, 'LeftForeArm', 0, -0.5 * f, 0);
    offsetBone(drv, 'RightForeArm', 0, 0.4 * f, 0);
    offsetBone(drv, 'LeftUpLeg', -0.45 * f - 0.9 * ph.crouch - 0.5 * ph.land, 0, 0);
    offsetBone(drv, 'RightUpLeg', -0.35 * f - 0.9 * ph.crouch - 0.5 * ph.land, 0, 0);
    offsetBone(drv, 'LeftLeg', 0.7 * f + 1.5 * ph.crouch + 0.9 * ph.land, 0, 0);
    offsetBone(drv, 'RightLeg', 0.6 * f + 1.5 * ph.crouch + 0.9 * ph.land, 0, 0);
    offsetBone(drv, 'Spine', 0.15 * ph.crouch + 0.1 * ph.land, 0, 0);
    drv.root.updateMatrixWorld(true);
    retarget();
    holdIK(hold);
  }
  const meX = 0.42, meZ = -0.32;
  // place + pose "you" at time tt; returns where the phone sits in the palm
  function placeAndPose(tt) {
    const sid = shotAt(tt).id, ta = tauOf(tt);
    let mode = {}, lift = 0;
    if (tt < T_SNAP) mode = { phoneHold: 1 };
    else if (sid === 'K') mode = { phoneHold: 0, land: 1 - smooth(1.2, 2.6, tt - 35.3) };
    else if (sid === 'N') mode = { phoneHold: 0 };
    else if (sid === 'M') mode = { phoneHold: 1 };
    else {
      const fl = smooth(0.05, 0.6, ta);
      mode = { phoneHold: 1 - smooth(0.0, 0.5, ta), startle: smooth(0, 0.15, ta) * (1 - fl * 0.6), float: fl };
      lift = Math.min(0.35, 0.04 * fl + (ta > 1.21 ? (ta - 1.21) * 0.22 : 0));   // legs were pushing when the floor went away
    }
    let px = meX, pz = meZ, ry = -0.35 + (tt > T_SNAP && ta > 0 ? Math.sin(ta * 1.3) * 0.12 : 0);
    if (sid === 'N') { const s = clamp((tt - 47.2) / 2.6); px = lerp(meX, 0.05, s); pz = lerp(meZ, 1.9, easeIn(s)); ry = lerp(-0.35, 0, smooth(0, 0.3, s)); walk.weight = smooth(0, 0.15, s); idle.weight = 1 - walk.weight; }
    else { walk.weight = 0; idle.weight = 1; }
    me.root.position.set(px, lift, pz); me.root.rotation.y = ry; me.root.updateMatrixWorld(true);
    pose(tt, mode);
    return palmAnchor();
  }
  const T_REL = T_SNAP + 0.12 * SLOW;   // the hand lets go of the phone 0.12 s after the snap

  function frame(t, opts = {}) {
    if (!opts._sub && t >= 14.6 && t < 18.0 && !opts.cover && !DBG.nomb) {
      const N = 5, span = 0.5 / 30;
      for (let j = 0; j < N; j++) {
        frame(Math.max(14.6, t - span * (N - 1 - j) / (N - 1)), { ...opts, _sub: true });
        bctx.globalAlpha = 1 / (j + 1); bctx.drawImage(R.renderer.domElement, 0, 0);
      }
      blurC.style.display = 'block';
      return;
    }
    if (!opts._sub) blurC.style.display = 'none';
    const shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
    const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
    const tau = tauOf(t);
    const d = fallDist(tau);
    const v = G * tau;
    const st = { tag: 'WHAT IF &nbsp;·&nbsp; 02', tagA: 1, labels: [] };
    R.renderer.toneMappingExposure = 0.95;
    let fadeB = 0;
    let scn = scene; let sat = 1.0, tint = [1.02, 1.0, 0.97], fadeW = 0, shake = 0, aberr = 0.0025, vignette = 0.5;

    // ---- interior state ----
    const flick = t >= T_SNAP && t < T_SNAP + 0.9 ? (Math.sin(t * 90) > 0.2 ? 1 : 0.15) : 1;
    const freezeK = t >= T_FREEZE && t < T_REW_END ? 1 : 0;
    car.ledMat.color.setScalar(1.6 * flick);
    area.intensity = 3.0 * flick; spot.intensity = 3.2 * flick;
    // floor display: floors passing during the fall
    let floorNow = 16 - Math.floor(d / FLOOR_H);
    let dispText = String(Math.max(1, floorNow)), arrow = t >= T_SNAP && tau > 0 ? '▼' : '';
    if (shot.id === 'M') { const n = Math.max(1, Math.round(lerp(75, 1, easeIn(clamp((t - 42.6) / 3.3))))); dispText = String(n); arrow = '▼'; }
    if (shot.id === 'K' || shot.id === 'N') { dispText = '16'; arrow = ''; }
    car.display.draw(dispText, arrow, '#ff3326', 1);

    // mannequin + phone: in the palm, then floating free (it keeps the little push the hand was giving it)
    const falling = t > T_REL && !['K', 'N', 'M'].includes(shot.id);
    if (falling) {
      const a0 = placeAndPose(T_REL); const p0 = a0.pos.clone(), q0 = a0.quat.clone(), n0 = a0.N.clone();
      placeAndPose(t);
      const dt = tau - 0.12;
      const fw0 = new THREE.Vector3(Math.sin(me.root.rotation.y), 0, Math.cos(me.root.rotation.y));
      phone.position.copy(p0).addScaledVector(n0, 0.04 * dt).addScaledVector(fw0, 0.1 * dt).add(new THREE.Vector3(0, 0.32 * dt, 0));
      // orientation: from the grip to a slow free spin, screen turned up towards your eyes
      const rt0 = new THREE.Vector3(-fw0.z, 0, fw0.x);
      // once free it slowly turns its screen out towards the camera of shot E (her right-front), spinning gently
      const Nn = fw0.clone().multiplyScalar(0.62).addScaledVector(rt0, 0.78).add(new THREE.Vector3(0, 0.35, 0)).normalize();
      const F0 = new THREE.Vector3(0, 1, 0).addScaledVector(fw0, 0.25).addScaledVector(rt0, -0.3).applyAxisAngle(Nn, 0.5 * dt + 0.1 * Math.sin(dt * 2.3));
      const Fn = F0.sub(Nn.clone().multiplyScalar(F0.dot(Nn))).normalize();
      const tilt = new THREE.Quaternion().setFromAxisAngle(Fn, 0.35 * Math.sin(dt * 1.7));
      const Nt = Nn.clone().applyQuaternion(tilt);
      const qd = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(Fn, Nt), Fn, Nt));
      phone.quaternion.copy(q0).slerp(qd, smooth(0.02, 0.32, dt));
    } else { const a = placeAndPose(t); phone.position.copy(a.pos); phone.quaternion.copy(a.quat); }
    phone.visible = !(shot.id === 'K' || shot.id === 'N');

    // doors + lobby light
    const open = shot.id === 'N' ? smooth(46.5, 47.4, t) : 0;
    car.doors[0].position.x = -0.25 - 0.5 * open; car.doors[1].position.x = 0.25 + 0.5 * open;
    lobLight.intensity = shot.id === 'N' ? 9 : 0; lobby.visible = shot.id === 'N';

    // ---- cameras ----
    const hand2 = (a) => P(Math.sin(t * 1.3 + a) * 0.006, Math.sin(t * 1.7 + a) * 0.005, 0);
    if (shot.kind === 'in') {
      scn = scene;
      const jolt = t >= T_SNAP && t < T_SNAP + 1.2 ? Math.exp(-(t - T_SNAP) * 4) * 0.05 * Math.sin(t * 60) : 0;
      const frontHidden = ['A', 'C', 'D', 'G', 'H', 'K'].includes(shot.id);
      car.front.traverse((o) => o.layers.set(frontHidden ? 1 : 0));
      if (shot.id === 'A') look(P(lerp(0.05, 0.12, k), 1.5, lerp(2.9, 2.6, k)).add(hand2(0)), P(0.18, 1.18, -0.6), 44);
      else if (shot.id === 'B') look(P(-0.3, 1.62, lerp(-0.48, -0.3, easeInOut(k))).add(hand2(1)), P(0.02, 2.0, CAR.D / 2), 40);
      else if (shot.id === 'C') look(P(lerp(-0.2, -0.05, k), 1.55, lerp(2.0, 1.6, k)).add(hand2(2)), P(0.42, 1.38, -0.35), 40);
      else if (shot.id === 'D') look(P(-0.15, 1.45 + jolt, 2.7).add(hand2(3)), P(0.3, 1.2, -0.5), 46);
      else if (shot.id === 'E') {
        // three-quarter from your right: your face, your open hand, and the phone drifting up between them
        const fw = new THREE.Vector3(Math.sin(me.root.rotation.y), 0, Math.cos(me.root.rotation.y)), rt = new THREE.Vector3(-fw.z, 0, fw.x);
        const head = me.bones.Head.getWorldPosition(new THREE.Vector3()), dk = easeInOut(k);
        const tgt = head.clone().add(P(0, -0.02, 0)).lerp(phone.position, 0.62);
        const dir = fw.clone().multiplyScalar(0.62).addScaledVector(rt, 0.78).normalize();
        look(tgt.clone().addScaledVector(dir, lerp(1.32, 1.1, dk)).add(P(0, lerp(-0.12, -0.08, dk), 0)).add(hand2(6)), tgt, 44);
      }
      else if (shot.id === 'G' || shot.id === 'H') look(P(0.0, 1.35, 2.8).add(hand2(4)), P(0.3, 1.3, -0.5), 46);
      else if (shot.id === 'K') look(P(0.05, 1.4, 2.7).add(hand2(5)), P(0.32, 1.05, -0.45), 46);
      else if (shot.id === 'M') look(P(0.1, 1.9, 0.1), P(0.0, 2.12, CAR.D / 2), 30);
      else if (shot.id === 'N') { const dk = easeInOut(k); look(P(lerp(0.3, 0.2, dk), 1.5, lerp(3.5, 3.95, dk)).add(hand2(7)), P(0.12, 1.25, 0.3), 48); }
      shake = jolt * 0.2;
      if (shot.id === 'H') { sat = 0.15; tint = [1.0, 1.0, 1.04]; aberr = 0.012; }
    } else if (shot.kind === 'shaft') {
      scn = shaftScene;
      let carY;
      const trF = Math.max(0, t - 14.6), dF = 0.5 * G * Math.min(trF, T_PLUNGE) ** 2, vF = G * Math.min(trF, T_PLUNGE), hitF = trF >= T_PLUNGE;
      if (shot.id === 'F') carY = 15 * FLOOR_H - dF;          // real time: the whole 50 m, no brakes
      else if (shot.id === 'I') carY = 15 * FLOOR_H;
      else { const s = Math.max(0, (t - 32.0) / 2.5); carY = 15 * FLOOR_H - brakeDrop(s); }
      car2.group.position.set(0, carY, 0);
      shaft.counterweight.position.y = 30; shaft.counterweight.visible = shot.id !== 'F'; cables.group.visible = shot.id !== 'F';
      downLight.intensity = shot.id === 'F' ? 55 : 0;
      work.position.set(1.0, carY + 6, 0.8); work2.position.set(-1.0, carY - 4, 0.8);
      // cables: slack + whipping after the snap in F
      const snapped = shot.id === 'F';
      cables.group.scale.y = snapped ? 3.6 / cables.length : 1;
      cables.list.forEach((c, i) => {
        const pa = c.mesh.geometry.attributes.position; const base = c.base;
        for (let j = 0; j < pa.count; j++) {
          const y = base[j * 3 + 1]; const u = (y + cables.length / 2) / cables.length;
          const a = snapped ? Math.pow(u, 1.5) * smooth(0, 0.4, tau) : 0;
          pa.setX(j, base[j * 3] + a * Math.sin(u * 5 + t * 2.2 + i * 1.1) * 0.24);
          pa.setZ(j, base[j * 3 + 2] + a * Math.cos(u * 4 + t * 1.7 + i * 1.3) * 0.2);
        }
        pa.needsUpdate = true;
      });
      // safety brakes: wedges rise and sparks fly in J
      const engage = shot.id === 'J' ? smooth(T_TRIP - 0.04, T_TRIP + 0.1, t) : 0;
      car2.safeties.forEach((sg) => sg.wedges.forEach((w, j) => { w.position.y = -0.02 + 0.07 * engage; w.position.z = (j ? 1 : -1) * (0.0115 - 0.0032 * engage); }));
      const sr = rng(41); const sliding = shot.id === 'J' ? smooth(T_TRIP - 0.02, T_TRIP + 0.08, t) * (1 - smooth(T_HOLD - 0.2, T_HOLD + 0.08, t)) : 0;
      for (let i = 0; i < sparks.n; i++) {
        const side = i % 2 ? 1 : -1; const ph = sr(), sp = 1 + sr() * 4, life = (t * 1.8 + ph) % 1;
        const fb = sr() < 0.7 ? 1 : -1, spread = sr() - 0.5;
        const x = side * (CAR.W / 2 + 0.245) + spread * 0.08 + side * life * spread * 0.6, y = carY - 0.27 - life * sp * 0.22 - 2.2 * life * life, z = fb * (0.012 + life * sp * 0.28);
        const p0 = project(P(x, y, z), cam), p1 = project(P(x + side * spread * 0.05, y - 0.08, z + fb * 0.06), cam);
        sparks.set(i, x, y, z, 0.012 + sr() * 0.02, sliding * (1 - life) * 1.6, 1.0, 0.55 + sr() * 0.3, 0.2, Math.atan2(-(p1.y - p0.y), p1.x - p0.x), 8);
      }
      sparks.commit();
      const dr = rng(42);
      for (let i = 0; i < dust.n; i++) { const x = (dr() - 0.5) * 2.6, y = carY + (dr() - 0.5) * 14, z = (dr() - 0.5) * 2.2; dust.set(i, x, y, z, 0.015 + dr() * 0.03, 0.12 * dr(), 0.9, 0.88, 0.85); }
      dust.commit();
      const sl = rng(43);
      for (let i = 0; i < speedLines.n; i++) {
        const x = (sl() - 0.5) * 2.8, z = -1.25 + sl() * 0.4 + (sl() < 0.3 ? 1.6 : 0), ph = sl();
        const y = carY - 10 + ((ph * 14 + (shot.id === 'F' ? dF : 0)) % 14);
        const p0 = project(P(x, y, z), cam), p1 = project(P(x, y + 0.5, z), cam);
        speedLines.set(i, x, y, z, 0.012, shot.id === 'F' && !hitF ? Math.min(0.35, vF * 0.012) * (0.3 + sl() * 0.7) : 0, 0.9, 0.9, 1.0, Math.atan2(-(p1.y - p0.y), p1.x - p0.x), 4 + vF * 0.8);
      }
      speedLines.commit();
      if (shot.id === 'F') {
        const vib = Math.min(1, vF / 31) * 0.012, jr = rng(Math.floor(t * 240));
        look(P(0.55 + (jr() - 0.5) * vib, carY - 0.42, 0.5 + (jr() - 0.5) * vib), P(0.3, carY - 30, -0.35), 76, P(0, 0, -1));
      }
      else if (shot.id === 'I') look(P(0.35, carY + CAR.H + 1.1, 0.75), P(-0.05, carY + CAR.H + 9, -0.1), 58);
      else { const gx = CAR.W / 2 + 0.245, gy = carY - 0.14; look(P(gx + 0.05, gy + 0.2, 0.72), P(gx - 0.01, gy - 0.05, 0), 46); railLight.position.set(gx - 0.05, gy + 0.55, 0.4); }
      railLight.intensity = shot.id === 'J' ? 1.6 : 0;
      if (shot.id === 'J') shake = sliding * 0.004;
      if (shot.id === 'F') { shake = 0.002 + 0.006 * Math.min(1, vF / 31); fadeB = hitF ? 1 : 0; if (hitF && trF - T_PLUNGE < 0.05) fadeW = 0.6; }
    } else if (shot.kind === 'old') {
      scn = otis1854.scene;
      const s = t - 38.4, ok = otis1854.update(s, cam, project), dk = easeInOut(k);
      look(P(lerp(2.6, 2.05, dk), lerp(1.28, 1.36, dk), lerp(10.2, 8.9, dk)), P(lerp(0.05, -0.05, dk), lerp(4.78, 4.88, dk), 0), 36);
      sat = 0.1; tint = [1.17, 1.0, 0.78]; vignette = 1.05; aberr = 0.0; fadeW = ok.flash; shake = ok.shake;
      R.renderer.toneMappingExposure = 0.95 * (1 + 0.035 * Math.sin(t * 47) * Math.sin(t * 13));   // old film flicker
    } else { scn = endScene; }

    // ---- HUD ----
    if (t < T_SNAP) st.hud = { a: smooth(3.3, 3.8, t), lab: 'Cable snaps in', val: timer(T_SNAP - t), sub: 'Floor 16 &nbsp;·&nbsp; 50 m up', sub2: '' };
    else if (shot.id === 'F') { const tr = Math.min(Math.max(0, t - 14.6), T_PLUNGE), dd = 0.5 * G * tr * tr, kmh = Math.round(G * tr * 3.6), fl = 16 - Math.floor(dd / FLOOR_H); st.hud = { a: 1, lab: 'Real time &nbsp;·&nbsp; no brakes', val: `${kmh} km/h`, sub: fl >= 1 ? `Floor ${fl}` : 'Bottom of the shaft', sub2: '', valColor: kmh > 90 ? '#ff3b30' : '' }; }
    else if (t < T_FREEZE) st.hud = { a: 1, lab: 'Impact in', val: timer(T_FALL - tau), sub: `Time slowed down ${SLOW}×`, sub2: `Speed &nbsp;${Math.round(v * 3.6)} km/h`, valColor: T_FALL - tau < 1.5 ? '#ff3b30' : '' };
    else if (t < T_REW_END) st.hud = { a: 1, lab: t < T_FREEZE + 0.9 ? 'Paused' : 'Rewinding', val: timer(T_FALL - tau), sub: '◀◀', sub2: '' };
    else if (t < 35.3) st.hud = { a: 1, lab: shot.id === 'J' ? 'Safety brakes' : 'Hoist cables', val: shot.id === 'J' ? (t > T_TRIP ? 'ENGAGED' : 'ARMED') : '6 × STEEL', sub: shot.id === 'J' ? `Drop &nbsp;${brakeDrop(Math.max(0, (t - 32) / 2.5)).toFixed(1)} m` : 'Each rated for the full car', sub2: '' };
    else if (t < 38.4) st.hud = { a: 1, lab: 'Car', val: 'STOPPED', sub: `Total drop &nbsp;${BRAKE_TOTAL.toFixed(1)} m`, sub2: '' };
    else if (t < 42.4) st.hud = { a: 1, lab: 'Safety brake', val: '1854', sub: 'Elisha Otis &nbsp;·&nbsp; New York', sub2: '' };
    else if (t < 46.3) st.hud = { a: 1, lab: 'Longest fall survived', val: '75 FLOORS', sub: 'Betty Lou Oliver &nbsp;·&nbsp; 1945', sub2: '' };
    if (t < 3.4) st.title = { html: TITLE, a: Math.min(smooth(0.0, 0.35, t), 1 - smooth(3.0, 3.35, t)), k: smooth(0, 0.6, t) };
    const c = captionAt(CAPTIONS, t); if (c) st.caption = c;
    if (t >= 49.8) { st.end = { a: smooth(49.8, 50.15, t), title: TITLE, note: ENDNOTE }; st.hud = null; st.labels = []; }
    if (opts.cover) { st.title = { html: TITLE, a: 1, k: 1 }; st.caption = null; st.hud = null; st.labels = []; }

    // ---- grade ----
    R.bloom.strength = 0.22; R.bloom.radius = 0.5; R.bloom.threshold = 0.96;
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uSat.value = sat; U.uTint.value.set(...tint); U.uVignette.value = vignette; U.uAberr.value = aberr; U.uFade.value = fadeB;
    if (t >= T_SNAP && t < T_SNAP + 0.25) fadeW = Math.max(fadeW, (1 - (t - T_SNAP) / 0.25) * 0.35);
    U.uFadeWhite.value = fadeW;
    const sr2 = rng(Math.floor(t * 30) + 7); U.uShake.value.set((sr2() - 0.5) * shake, (sr2() - 0.5) * shake);
    R.renderPass.scene = scn; R.renderPass.camera = cam;
    R.composer.render();
    ov.apply(st);
  }
  await Promise.all(TEX_PENDING);   // no frame before every texture is in memory (else it samples black)
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS, cues: { snap: T_SNAP, freeze: T_FREEZE } };
}
