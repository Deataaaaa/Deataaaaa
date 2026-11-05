// EP 05 — What if the Moon stopped moving?  (radial free fall: impact after 4.82 days)
import * as THREE from 'three';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeIn, easeOut, project, W, H } from '../engine/core.js';
import { makeStars, Puffs, streakTex, makeGlobe, latLon, loadTex, makePerson, softDotTex } from '../engine/assets.js';
import { makeOcean, sandTex, makePalm, makeUmbrella, makeFirepit } from '../engine/beach.js';

// ---------- physics (see notes/facts.md) ----------
const MU = 3.986004e14 + 4.9048e12, R0 = 3.844e8, RE = 6.371e6, RM = 1.7374e6;
const Tfall = (r) => Math.sqrt(R0 ** 3 / (2 * MU)) * (Math.sqrt((r / R0) * (1 - r / R0)) + Math.acos(Math.sqrt(r / R0)));
function rAt(sec) { let lo = 0, hi = R0; for (let i = 0; i < 70; i++) { const mid = (lo + hi) / 2; if (Tfall(mid) > sec) lo = mid; else hi = mid; } return lo; }
const T_CONTACT = Tfall(RE + RM) / 3600; // ~115.6 h

const T_STOP = 9.8, DUR = 55.6;
// screen time -> hours since the Moon stopped
const MAP = [[T_STOP, 0], [12.7, 18], [15.4, 30], [15.5, 92], [18.6, 96], [18.7, 107.6], [21.8, 109], [21.9, 113.9], [25.4, 114.4], [25.5, 114.45], [28.6, 115.0], [28.8, 115.18], [35.0, T_CONTACT - 0.004], [41.4, T_CONTACT + 0.4]];
function hoursAt(t) { if (t < T_STOP) return 0; for (let i = 1; i < MAP.length; i++) if (t <= MAP[i][0]) { const [a, ha] = MAP[i - 1], [b, hb] = MAP[i]; return ha + (hb - ha) * clamp((t - a) / (b - a)); } return MAP[MAP.length - 1][1]; }

const CAPTIONS = [
  [3.5, 6.2, 'Right now, the Moon is falling toward Earth.'],
  [6.3, 9.6, 'But it also moves 1 km sideways every second. So it keeps missing.'],
  [9.9, 12.6, 'Now imagine it stops. Dead in its tracks.'],
  [12.8, 15.3, 'Day 1: nothing looks different.'],
  [15.5, 18.5, "Day 4: it's twice as close. Tides pull 8 times harder."],
  [18.7, 21.7, 'Hour 108: four times bigger in the sky.'],
  [21.9, 25.3, 'Hour 114: ten times bigger. Tides pull 1,000 times harder.'],
  [25.5, 28.6, 'The oceans surge hundreds of meters up the coasts.'],
  [28.8, 32.2, "Within 18,000 km, Earth's gravity starts to rip it apart."],
  [32.3, 34.9, '25 minutes later…'],
  [35.1, 37.6, '…impact.'],
  [37.8, 41.3, '35,000 km/h. Enough energy to boil every ocean 1,000 times over.'],
  [41.6, 44.7, "So the Moon isn't just floating up there."],
  [44.9, 48.3, "It's falling around us. And as long as it keeps moving…"],
  [48.5, 51.3, '…it keeps missing.'],
];
const TITLE = 'What if the <span class="k">Moon</span> stopped moving?';
const ENDNOTE = 'Moon orbital speed 1.02 km/s · distance 384,400 km<br>stopped, it would hit Earth after 4.8 days';

function dhm(h) { const H = Math.max(0, h); const d = Math.floor(H / 24), hh = Math.floor(H % 24), mm = Math.floor((H * 60) % 60); return `${d}d ${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m`; }

export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  const [day, night, clouds, moonTex] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false), loadTex('/engine/tex/moon.jpg')]);

  // ================= night beach =================
  const beach = new THREE.Scene();
  beach.background = new THREE.Color('#05080f'); beach.fog = new THREE.Fog('#0a1220', 200, 4000);
  const stars = makeStars(7000, 3000, 12); beach.add(stars);
  const skyGlow = new THREE.Mesh(new THREE.SphereGeometry(3500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uMoonDir: { value: new THREE.Vector3(0.15, 0.2, -1).normalize() }, uK: { value: 1 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: 'uniform vec3 uMoonDir; uniform float uK; varying vec3 vD; void main(){ vec3 d = normalize(vD); float s = max(dot(d,uMoonDir),0.0); vec3 c = vec3(0.003,0.006,0.014) + vec3(0.25,0.32,0.45)*pow(s,8.0)*0.03*min(uK,30.0) + vec3(0.02,0.03,0.05)*smoothstep(0.2,0.0,d.y)*min(uK,30.0)*0.012; gl_FragColor = vec4(c,1.0); }' }));
  skyGlow.renderOrder = -10; skyGlow.frustumCulled = false; beach.add(skyGlow);
  const moonDir = skyGlow.material.uniforms.uMoonDir.value;
  const moonLight = new THREE.DirectionalLight('#cfe0ff', 0.6); moonLight.castShadow = true; moonLight.shadow.mapSize.set(2048, 2048);
  Object.assign(moonLight.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 10, far: 900 });
  beach.add(moonLight, moonLight.target);
  const amb = new THREE.HemisphereLight('#1c2a44', '#0d0d10', 0.35); beach.add(amb);
  const r = rng(505);
  const st = sandTex(); st.repeat.set(160, 160);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: st, roughness: 1, color: '#bfb3a0' }));
  sand.rotation.x = -Math.PI / 2 - 0.035; sand.position.set(0, 20.7, 595); sand.receiveShadow = true; beach.add(sand);
  const ocean = makeOcean({ shore: 3.5, deep: '#06213a', shallow: '#0f4a5a' }); ocean.mesh.position.z = -2780; beach.add(ocean.mesh);
  const OU = ocean.mat.uniforms; OU.uNight.value = 0.55; OU.uSkyAmt.value = 0.2; OU.uSky.value.set('#1a2a44'); OU.uMoonAmt.value = 1; OU.uMoon.value.copy(moonDir);
  // cliff for the flood shot
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(80, 40, 60), new THREE.MeshStandardMaterial({ color: '#4a4440', roughness: 1, flatShading: true }));
  cliff.visible = false;
  for (const [x, z] of [[-22, 30], [-30, 44], [18, 38], [26, 52], [-12, 58], [34, 26], [-40, 22], [6, 64], [-6, 20], [12, 24]]) { const p = makePalm(r, 8 + r() * 4); p.position.set(x, 0.9 + z * 0.035, z); beach.add(p); }
  const umbs = []; for (let i = 0; i < 7; i++) { const u = makeUmbrella(r, ['#e8453c', '#2f7ac2', '#ffb547'][i % 3]); const z = 10 + r() * 16; u.position.set(-24 + i * 8 + r() * 3, (z - 3.5) * 0.035, z); beach.add(u); umbs.push(u); }
  const fire = makeFirepit(); fire.position.set(-4, (14 - 3.5) * 0.035, 14); beach.add(fire);
  const fireLight = new THREE.PointLight('#ff8a3c', 18, 18, 1.6); fireLight.position.set(-4, 1.2, 14); beach.add(fireLight);
  const flames = new Puffs(120, { additive: true }); beach.add(flames.mesh);
  const couple = []; for (const [x, z, ry] of [[-5.3, 15.0, 2.6], [-3.0, 15.3, 3.6]]) { const p = makePerson(r, 'sit'); p.position.set(x, (z - 3.5) * 0.035 + 0.02, z); p.rotation.y = ry; beach.add(p); couple.push(p); }
  // the Moon in the sky (placed relative to the camera each frame)
  const skyMoon = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshBasicMaterial({ map: moonTex, color: new THREE.Color(1.25, 1.25, 1.2), fog: false }));
  skyMoon.rotation.y = -Math.PI / 2; beach.add(skyMoon);
  const halo = new Puffs(1, { additive: true }); beach.add(halo.mesh);
  const bcam = new THREE.PerspectiveCamera(50, W / H, 0.1, 9000);

  // ================= space =================
  const space = new THREE.Scene(); space.background = new THREE.Color('#000');
  space.add(makeStars(6000, 900, 33));
  const globe = makeGlobe({ day, night, clouds }); space.add(globe.group);
  const EM = globe.earthMat.uniforms;
  const sunL = new THREE.DirectionalLight('#ffffff', 3.0); space.add(sunL);
  space.add(new THREE.AmbientLight('#223', 0.25));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(RM / RE, 64, 32), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 1 })); space.add(moon);
  const fragN = 600;
  const frags = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), fragN);
  frags.instanceMatrix.setUsage(THREE.DynamicDrawUsage); space.add(frags);
  const fr = rng(71); const fragData = [];
  for (let i = 0; i < fragN; i++) {
    const u = fr() * 2 - 1, a = fr() * 6.283, s = Math.sqrt(1 - u * u), rad = Math.pow(fr(), 0.35);
    const o = new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a)).multiplyScalar(rad);
    const g = 0.55 + fr() * 0.35; frags.setColorAt(i, new THREE.Color(g, g, g * 0.97));
    fragData.push({ o, size: 0.025 + Math.pow(fr(), 3) * 0.07, spin: fr() * 6, jit: new THREE.Vector3(fr() - 0.5, fr() - 0.5, fr() - 0.5).multiplyScalar(0.25) });
  }
  const flashes = new Puffs(260, { additive: true, renderOrder: 9 }); space.add(flashes.mesh);
  const dust = new Puffs(400, { additive: true, renderOrder: 8 }); space.add(dust.mesh);
  // orbit infographic
  const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 241 }, (_, i) => new THREE.Vector3(Math.cos(i / 240 * 6.283) * 9, 0, Math.sin(i / 240 * 6.283) * 9))), new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.5 }));
  orbit.computeLineDistances(); space.add(orbit);
  const arrowV = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 3.2, 0xffb547, 0.6, 0.35); space.add(arrowV);
  const arrowF = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 2.4, 0x8fb6ff, 0.5, 0.3); space.add(arrowF);
  const scam = new THREE.PerspectiveCamera(40, W / H, 0.01, 3000);
  const endScene = new THREE.Scene(); endScene.background = new THREE.Color('#0d0e11');

  const shots = [
    { t0: 0, t1: 3.4, kind: 'beach', mode: 'title' },
    { t0: 3.4, t1: 12.7, kind: 'orbit' },
    { t0: 12.7, t1: 25.45, kind: 'beach', mode: 'tele' },
    { t0: 25.45, t1: 28.7, kind: 'beach', mode: 'flood' },
    { t0: 28.7, t1: 41.45, kind: 'space' },
    { t0: 41.45, t1: 48.4, kind: 'beach', mode: 'calm' },
    { t0: 48.4, t1: 51.5, kind: 'orbit', mode: 'end' },
    { t0: 51.5, t1: DUR + 1, kind: 'end' },
  ];

  function placeSkyMoon(cam, angDiamDeg, dist = 2500) {
    skyMoon.position.copy(cam.position).addScaledVector(moonDir, dist);
    const rad = dist * Math.tan(angDiamDeg / 2 * Math.PI / 180);
    skyMoon.scale.setScalar(rad);
    halo.set(0, skyMoon.position.x, skyMoon.position.y, skyMoon.position.z, rad * 3.2, 0.16 / Math.sqrt(Math.max(1, rad / 40)), 0.75, 0.85, 1.0); halo.commit();
  }

  function frame(t, opts = {}) {
    const shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
    const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
    const hrs = hoursAt(t);
    const stopped = t >= T_STOP && t < 41.45;
    const rM = stopped ? rAt(hrs * 3600) : R0;
    const grow = R0 / rM;                          // apparent size factor
    const angDiam = 2 * Math.atan(RM / rM) * 180 / Math.PI;
    const sx = { tag: 'WHAT IF &nbsp;·&nbsp; 05', tagA: 1, labels: [] };
    let scn, cam;

    if (shot.kind === 'beach') {
      scn = beach; cam = bcam;
      const wt = t * 0.6;
      OU.uTime.value = wt;
      // tides: equilibrium tide grows as 1/r^3 (exaggerated only by the flood shot's own timeline)
      const tide = shot.mode === 'flood' ? lerp(2, 14, easeIn(k)) : stopped ? Math.min(2, 0.3 * (Math.pow(grow, 3) - 1) / 8) : 0;
      OU.uTide.value = tide;
      const bright = Math.min(grow * grow, 60);
      moonLight.intensity = 0.35 + 0.025 * bright; amb.intensity = 0.25 + 0.006 * bright;
      skyGlow.material.uniforms.uK.value = bright;
      OU.uNight.value = clamp(0.6 - 0.006 * bright, 0.2, 0.6);
      moonLight.position.copy(moonDir).multiplyScalar(400); moonLight.target.position.set(0, 0, 10);
      if (shot.mode === 'title' || shot.mode === 'calm') {
        const cz = shot.mode === 'title' ? lerp(42, 39, k) : lerp(40, 37, k);
        bcam.position.set(lerp(-2, 0, k), 3.0, cz); bcam.fov = 34; bcam.updateProjectionMatrix(); bcam.lookAt(bcam.position.clone().add(new THREE.Vector3(0.05, 0.1, -1)));
        placeSkyMoon(bcam, 0.52 * 3.2);
      } else if (shot.mode === 'tele') {
        // long lens on the horizon: real growth factor applied to a 3.2x-enlarged base size
        bcam.position.set(lerp(1, -1, k), 1.6, 7); bcam.fov = 13; bcam.updateProjectionMatrix();
        const tgt = bcam.position.clone().addScaledVector(moonDir, 100); tgt.y -= 6.5; bcam.lookAt(tgt);
        placeSkyMoon(bcam, Math.min(0.52 * grow, 40));
      } else {
        bcam.position.set(lerp(20, 18, k), lerp(13, 15, k), lerp(54, 50, k)); bcam.fov = 52; bcam.updateProjectionMatrix(); bcam.lookAt(-4, 1, 8);
        placeSkyMoon(bcam, 0.52 * 3.2 * grow);
      }
      // campfire flames
      const fr2 = rng(5); const fp = fire.position;
      for (let i = 0; i < flames.n; i++) { const ph = fr2(), life = (t * (0.9 + fr2() * 0.7) + ph) % 1; flames.set(i, fp.x + (fr2() - 0.5) * 0.4 * (1 - life), fp.y + 0.15 + life * 1.1, fp.z + (fr2() - 0.5) * 0.4 * (1 - life), (1 - life) * 0.45, (1 - life) * 0.8 * (shot.mode === 'flood' ? 0 : 1), 1.0, 0.5 + life * 0.3, 0.15); }
      flames.commit();
      if (shot.mode === 'tele' || shot.mode === 'flood') sx.labels.push({ x: W * 0.5, y: H * 0.205, a: 1, html: `MOON ${grow.toFixed(1)}× BIGGER &nbsp;·&nbsp; ${Math.round(rM / 1000).toLocaleString('en-US')} KM AWAY` });
    } else if (shot.kind === 'orbit') {
      scn = space; cam = scam;
      globe.group.scale.setScalar(1.0); moon.visible = true; frags.visible = false; orbit.visible = true;
      EM.uBurn.value = 0;
      const lt = t - shot.t0;
      // moon angle on its (compressed) orbit; stops at T_STOP and begins to fall
      let ang = 0.9 + Math.min(t, T_STOP) * 0.05; if (shot.mode === 'end') ang = 1.6 + (t - 48.4) * 0.12;
      let d = 9;
      if (shot.mode !== 'end' && t > T_STOP) d = 9 - 0.6 * easeIn(clamp((t - T_STOP) / 2.8));
      const mp = new THREE.Vector3(Math.cos(ang) * d, 0, Math.sin(ang) * d);
      moon.position.copy(mp); moon.scale.setScalar(3.4);
      const tan = new THREE.Vector3(-Math.sin(ang), 0, Math.cos(ang));
      const showV = shot.mode === 'end' ? 1 : (t < T_STOP ? smooth(5.6, 6.4, t) : 1 - smooth(T_STOP, T_STOP + 0.5, t));
      arrowV.position.copy(mp).addScaledVector(tan, 1.1); arrowV.setDirection(tan); arrowV.visible = showV > 0.02; arrowV.setLength(3.2 * Math.max(0.05, showV), 0.6, 0.35);
      arrowF.position.copy(mp).addScaledVector(mp.clone().normalize(), -1.1); arrowF.setDirection(mp.clone().normalize().negate()); arrowF.visible = t > 4.0;
      orbit.material.opacity = 0.5;
      sunL.position.set(-20, 6, 10);
      EM.uSun.value.set(-0.8, 0.25, 0.5).normalize();
      scam.up.set(0, 1, 0); scam.position.set(lerp(2.6, 2.2, k), lerp(23, 21, k), lerp(12.5, 11.5, k)); scam.fov = 44; scam.updateProjectionMatrix(); scam.lookAt(2.3, 0, 3.4); scam.updateMatrixWorld();
      globe.spin.rotation.y = t * 0.3; globe.cloudSpin.rotation.y = t * 0.3;
      const pv = project(arrowV.position.clone().addScaledVector(tan, 3.6), scam), pf = project(arrowF.position.clone().addScaledVector(mp.clone().normalize(), -2.8), scam);
      const pmn = project(mp, scam); sx.labels.push({ x: pmn.x + 60, y: pmn.y - 110, a: showV, html: '<b>1 KM / SECOND</b>', cls: 'lbl-r' });
      sx.labels.push({ x: pf.x, y: pf.y + 34, a: t > 4.0 ? smooth(4.0, 4.6, t) : 0, html: 'FALLING' });
      sx.labels.push({ x: W * 0.5, y: H * 0.86, a: 0.8, html: '<span style="font-size:16px;opacity:.7">NOT TO SCALE</span>' });
    } else if (shot.kind === 'space') {
      scn = space; cam = scam; orbit.visible = false; arrowV.visible = false; arrowF.visible = false;
      const lt = t - shot.t0;
      const dirM = new THREE.Vector3(0.62, 0.18, 0.76).normalize();
      const cpos = dirM.clone().multiplyScalar(rM / RE);
      sunL.position.set(25, 12, -6); EM.uSun.value.set(0.85, 0.35, -0.25).normalize(); EM.uTime.value = t;
      globe.spin.rotation.y = 1.2; globe.cloudSpin.rotation.y = 1.2;
      const breakT = 30.0; // visual onset of the breakup
      const contact = hoursAt(t) >= T_CONTACT;
      moon.visible = t < breakT + 0.6; frags.visible = t >= breakT;
      moon.position.copy(cpos); moon.scale.set(1, 1, 1);
      // tidal stretch along the Earth-Moon line
      const stretch = 1 + smooth(28.8, 35.0, t) * 2.2;
      if (moon.visible) { const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirM); moon.quaternion.copy(q); moon.scale.set(1, 1 + smooth(28.8, breakT + 0.6, t) * 0.35, 1); }
      const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3();
      const scatter = Math.max(0, t - breakT);
      fragData.forEach((f, i) => {
        const along = f.o.dot(new THREE.Vector3(0, 1, 0));
        const p = cpos.clone()
          .addScaledVector(dirM, along * (RM / RE) * stretch)
          .add(new THREE.Vector3(f.o.x, 0, f.o.z).multiplyScalar(RM / RE * (1 + scatter * 0.08)))
          .addScaledVector(f.jit, scatter * 0.06);
        // fragments nearer Earth fall slightly ahead
        p.addScaledVector(dirM, -Math.max(0, -along) * scatter * 0.05);
        const hit = p.length() < 1.02 || t > 36.2;
        q4.setFromEuler(new THREE.Euler(f.spin + scatter, f.spin * 2, 0)); s4.setScalar(hit ? 0.0001 : f.size * (RM / RE) * 5.0);
        m4.compose(p, q4, s4); frags.setMatrixAt(i, m4);
      });
      frags.instanceMatrix.needsUpdate = true; if (frags.instanceColor) frags.instanceColor.needsUpdate = true;
      // impact glow spreading across the surface
      const sinceHit = Math.max(0, t - 35.0);
      EM.uBurnDir.value.copy(dirM); EM.uBurn.value = contact || t > 35.0 ? 0.15 + Math.min(2.4, sinceHit * 0.42) : 0;
      // flashes + ejecta
      const fl = rng(9);
      for (let i = 0; i < flashes.n; i++) {
        const a = fl() * 6.28, rr = fl() * 0.6, dl = fl() * 3.0, s = sinceHit - dl;
        if (s <= 0) { flashes.set(i, 0, 0, 0, 0, 0); continue; }
        const tang = new THREE.Vector3(Math.cos(a), Math.sin(a), 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirM));
        const p = dirM.clone().multiplyScalar(1.0 + s * 0.05 * fl()).addScaledVector(tang, rr * Math.min(1, s * 0.6));
        flashes.set(i, p.x, p.y, p.z, 0.05 + s * 0.06 * fl(), 0.55 * Math.exp(-s * 0.7), 1.0, 0.6 + fl() * 0.3, 0.25);
      }
      flashes.commit();
      const dd = rng(10);
      for (let i = 0; i < dust.n; i++) {
        const dl = dd() * 2.5, s = t - (breakT + dl);
        if (s <= 0 || contact) { dust.set(i, 0, 0, 0, 0, 0); continue; }
        const o = new THREE.Vector3(dd() - 0.5, dd() - 0.5, dd() - 0.5).multiplyScalar(2 * RM / RE * 1.4);
        const p = cpos.clone().add(o.multiplyScalar(1 + s * 0.3));
        dust.set(i, p.x, p.y, p.z, 0.03 + s * 0.015, 0.07 * Math.exp(-s * 0.4), 0.85, 0.82, 0.78);
      }
      dust.commit();
      // camera: 3/4 view framing Earth and the incoming Moon
      const mid = dirM.clone().multiplyScalar(lerp(1.35, 0.7, easeInOut(k)));
      const perp = new THREE.Vector3(0.775, 0.0, -0.632).normalize();
      scam.up.copy(dirM);
      scam.position.copy(mid).addScaledVector(perp, lerp(8.2, 7.0, easeInOut(k))).add(new THREE.Vector3(0, 0.6, 0));
      scam.fov = 40; scam.updateProjectionMatrix(); scam.lookAt(mid); scam.updateMatrixWorld();
      const mpp = project(cpos, scam);
      if (!contact) sx.labels.push({ x: mpp.x, y: mpp.y - 110, a: smooth(28.8, 29.4, t) * (1 - smooth(34.6, 35.0, t)), html: `${Math.round((rM - RE) / 1000).toLocaleString('en-US')} KM ABOVE THE SURFACE` });
    } else {
      scn = endScene; cam = scam;
    }

    // HUD
    if (t < T_STOP) sx.hud = { a: smooth(3.3, 3.8, t), lab: 'Moon speed', val: '1.02 km/s', sub: 'Distance &nbsp;384,400 km', sub2: '' };
    else if (t < 41.45) {
      const left = T_CONTACT - hrs;
      sx.hud = { a: 1, lab: left > 0 ? 'Impact in' : 'Impact', val: left > 0 ? dhm(left) : '35,500 km/h', sub: `Distance &nbsp;${Math.round(rM / 1000).toLocaleString('en-US')} km`, sub2: `Tidal pull ×${Math.round(Math.pow(grow, 3)).toLocaleString('en-US')}` };
      if (left <= 0) { sx.hud.sub = 'Energy &nbsp;3.6 × 10<sup>30</sup> J'; sx.hud.sub2 = '1,000× what boils the oceans'; }
    } else if (t < 51.5) sx.hud = { a: 1, lab: 'Moon speed', val: '1.02 km/s', sub: 'Still falling. Still missing.', sub2: '' };
    if (t < 3.4) sx.title = { html: TITLE, a: Math.min(smooth(0.0, 0.35, t), 1 - smooth(3.0, 3.35, t)), k: smooth(0, 0.6, t) };
    const c = captionAt(CAPTIONS, t); if (c) sx.caption = c;
    if (t >= 51.5) { sx.end = { a: smooth(51.5, 51.85, t), title: TITLE, note: ENDNOTE }; sx.hud = null; sx.labels = []; }
    if (opts.cover) { sx.title = { html: TITLE, a: 1, k: 1 }; sx.caption = null; sx.hud = null; sx.labels = []; }

    const G = R.grade.uniforms;
    R.bloom.strength = shot.kind === 'space' ? 0.6 : 0.55; R.bloom.radius = 0.55; R.bloom.threshold = shot.kind === 'beach' ? 0.75 : 0.8;
    G.uTime.value = t; G.uSat.value = 1.06; G.uTint.value.set(1.0, 1.0, 1.02); G.uVignette.value = 0.5; G.uAberr.value = 0.003; G.uFade.value = 0;
    let flash = 0; if (t >= 35.0) flash = Math.exp(-(t - 35.0) * 3.0) * 0.9;
    G.uFadeWhite.value = flash;
    let shake = 0; if (t >= 35.0 && t < 41.45) shake = Math.exp(-(t - 35.0) * 0.8) * 0.006; if (shot.mode === 'flood') shake = 0.0015;
    const sr = rng(Math.floor(t * 30) + 3); G.uShake.value.set((sr() - 0.5) * shake, (sr() - 0.5) * shake);
    R.renderPass.scene = scn; R.renderPass.camera = cam;
    R.composer.render();
    ov.apply(sx);
  }
  return { duration: DUR, fps: 30, frame, cues: { stop: T_STOP, impact: 35.0 } };
}
