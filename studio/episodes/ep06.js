// EP 06 — What if the Sun disappeared?  (8 min 20 s of light still in flight, then the long freeze)
import * as THREE from 'three';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeIn, easeOut, project, W, H } from '../engine/core.js';
import { makeStars, Puffs, streakTex, makeGlobe, latLon, loadTex, makePerson, canvasTex, softDotTex } from '../engine/assets.js';
import { makeOcean, sandTex, makePalm, makeUmbrella, makeTowel } from '../engine/beach.js';

const T_GONE = 3.5, T_DARK = 19.2, DUR = 55.5;
// screen time -> seconds since the Sun vanished
const MAP = [[T_GONE, 0], [9.0, 140], [15.6, 400], [T_DARK, 500], [22.0, 501.5], [25.0, 3600], [28.5, 3 * 86400], [31.7, 6.5 * 86400], [34.85, 7.5 * 86400], [35.0, 300 * 86400], [38.2, 365 * 86400], [45.5, 400 * 86400]];
function secAt(t) { if (t < T_GONE) return 0; for (let i = 1; i < MAP.length; i++) if (t <= MAP[i][0]) { const [a, sa] = MAP[i - 1], [b, sb] = MAP[i]; return sa + (sb - sa) * clamp((t - a) / (b - a)); } return MAP[MAP.length - 1][1]; }

const CAPTIONS = [
  [3.6, 5.9, 'The Sun just vanished.'],
  [6.0, 8.9, 'But here, nothing happens. Not yet.'],
  [9.0, 12.4, 'Its last light is still on the way. 150 million km of it.'],
  [12.5, 15.5, 'For 8 minutes and 20 seconds, the sky stays bright.'],
  [15.7, 19.0, 'Gravity travels at the speed of light too. Earth keeps orbiting… nothing.'],
  [19.35, 21.9, '8:20. Darkness. At noon.'],
  [22.1, 24.9, 'The Moon goes dark too. It only reflects sunlight.'],
  [25.1, 28.4, 'Earth flies off in a straight line at 107,000 km/h.'],
  [28.6, 31.6, 'Plants stop making food. Most die within weeks.'],
  [31.8, 34.8, 'After a week: the average temperature falls below −17 °C.'],
  [35.0, 38.2, 'After a year: −73 °C. The oceans freeze over.'],
  [38.4, 41.8, 'But deep under the ice, the water stays liquid.'],
  [42.0, 45.3, 'And around volcanic vents on the sea floor, life goes on.'],
  [45.6, 48.6, 'The real Sun turns 4 million tonnes of itself into light every second.'],
  [48.7, 51.4, 'The sunlight on your face left it 8 minutes ago.'],
];
const TITLE = 'What if the <span class="k">Sun</span> disappeared?';
const ENDNOTE = 'Sunlight takes 8 min 20 s to reach Earth<br>Earth orbits at 107,000 km/h';

function clock(sec) {
  if (sec < 3600 * 2) { const s = Math.floor(sec); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
  const d = sec / 86400; if (d < 360) return `${Math.floor(d)} days`; return `${(d / 365).toFixed(1)} years`;
}

function makeSky6() {
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: new THREE.Vector3(0.28, 0.3, -0.91).normalize() }, uDay: { value: 1 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uSun; uniform float uDay; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0);
        vec3 col = mix(vec3(0.62,0.80,0.95), vec3(0.10,0.32,0.78), pow(h, 0.45));
        col = mix(col, vec3(0.55,0.62,0.66), smoothstep(0.0,-0.05,d.y));
        float s = max(dot(d, uSun), 0.0);
        col += vec3(1.0,0.95,0.85) * (pow(s, 28.0)*0.25 + pow(s, 300.0)*1.0) + vec3(1.0,0.97,0.9) * smoothstep(0.99996, 0.99998, s) * 12.0;
        vec3 nightC = vec3(0.004,0.006,0.012) + vec3(0.01,0.012,0.02)*smoothstep(0.3,0.0,d.y);
        gl_FragColor = vec4(mix(nightC, col, uDay), 1.0); }` });
  const m = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -10;
  return { mesh: m, mat };
}

export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  const [day, night, clouds, moonTex] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false), loadTex('/engine/tex/moon.jpg')]);

  // ================= beach =================
  const beach = new THREE.Scene();
  const fog = new THREE.Fog('#bcd8ee', 120, 2600); beach.fog = fog;
  const sky = makeSky6(); beach.add(sky.mesh);
  const stars = makeStars(7000, 3000, 61); stars.material.opacity = 0; beach.add(stars);
  const sunDir = sky.mat.uniforms.uSun.value.clone();
  const hemi = new THREE.HemisphereLight('#bfe0ff', '#d9c08f', 0.85); beach.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3dc', 2.7); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 10, far: 900 }); sun.shadow.normalBias = 0.05;
  sun.position.copy(sunDir).multiplyScalar(400).add(new THREE.Vector3(0, 0, 15)); sun.target.position.set(0, 0, 15); beach.add(sun, sun.target);
  const starLight = new THREE.DirectionalLight('#9fb4ff', 0.0); starLight.position.set(0.3, 1, 0.4); beach.add(starLight);
  const r = rng(606);
  const st = sandTex(); st.repeat.set(160, 160);
  const sandMat = new THREE.MeshStandardMaterial({ map: st, roughness: 1, color: '#e9dcc0' });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), sandMat); sand.rotation.x = -Math.PI / 2 - 0.035; sand.position.set(0, 20.7, 595); sand.receiveShadow = true; beach.add(sand);
  const ocean = makeOcean({ shore: 3.5 }); ocean.mat.uniforms.uSun.value.copy(sunDir); beach.add(ocean.mesh);
  const OU = ocean.mat.uniforms;
  const iceTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#dfe9f2'; g.fillRect(0, 0, w, h); const q = rng(4); for (let i = 0; i < 9000; i++) { const v = q(); g.fillStyle = `rgba(${200 + v * 55},${215 + v * 40},${230 + v * 25},.35)`; g.fillRect(q() * w, q() * h, 1 + q() * 3, 1 + q() * 3); } g.strokeStyle = 'rgba(120,150,180,.35)'; g.lineWidth = 1.5; for (let i = 0; i < 60; i++) { g.beginPath(); let x = q() * w, y = q() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (q() - 0.5) * 80; y += (q() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); } }, { repeat: true });
  iceTex.repeat.set(300, 300);
  const iceMat = new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0 });
  const ice = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), iceMat); ice.rotation.x = -Math.PI / 2; ice.position.set(0, 0.25, -2990); beach.add(ice);
  const palms = []; const leafMats = new Set();
  for (const [x, z] of [[-22, 30], [-30, 44], [18, 38], [26, 52], [-12, 58], [34, 26], [-40, 22], [6, 64], [-8, 22]]) { const p = makePalm(r, 8 + r() * 4); p.position.set(x, 0.9 + z * 0.035, z); beach.add(p); palms.push(p); p.traverse((o) => { if (o.material && o.material.side === THREE.DoubleSide) leafMats.add(o.material); }); }
  for (let i = 0; i < 12; i++) { const z = 9 + r() * 20, x = -26 + r() * 52, y0 = (z - 3.5) * 0.035; if (i % 2 === 0) { const u = makeUmbrella(r, ['#e8453c', '#2f7ac2', '#ffb547'][i % 3]); u.position.set(x, y0, z); beach.add(u); } const tw = makeTowel(r); tw.position.set(x + 0.9, y0 + 0.02, z + 0.6); beach.add(tw); const p = makePerson(r, r() < 0.5 ? 'sit' : 'lie'); p.position.set(x + 0.9, y0 + 0.02, z + 0.8); p.rotation.y = Math.PI + (r() - 0.5) * 0.6; beach.add(p); }
  const standers = []; for (let i = 0; i < 8; i++) { const p = makePerson(r, 'stand'); const z = 4 + r() * 5; p.position.set(-20 + r() * 40, Math.max(0, (z - 3.5) * 0.035), z); p.rotation.y = Math.PI + (r() - 0.5) * 1.5; beach.add(p); standers.push(p); }
  // daytime moon (half lit)
  const dayMoon = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshBasicMaterial({ map: moonTex, fog: false }));
  beach.add(dayMoon);
  const moonDirSky = new THREE.Vector3(0.45, 0.42, -0.79).normalize();
  const frostPuffs = new Puffs(400, { renderOrder: 6 }); beach.add(frostPuffs.mesh);
  const bcam = new THREE.PerspectiveCamera(50, W / H, 0.1, 9000);

  // ================= space (Sun, orbit, light front) =================
  const space = new THREE.Scene(); space.background = new THREE.Color('#000'); space.add(makeStars(6000, 900, 62));
  const ORB = 10;
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.2, 2.8) })); space.add(sunBall);
  const sunGlow = new Puffs(2, { additive: true }); space.add(sunGlow.mesh);
  const front = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 wp = modelMatrix*vec4(position,1.0); vV = normalize(cameraPosition-wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }',
    fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0-abs(dot(normalize(vN), vV)), 3.0); gl_FragColor = vec4(vec3(1.0,0.85,0.55)*f*uA, 1.0); }' }));
  space.add(front);
  const orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 361 }, (_, i) => new THREE.Vector3(Math.cos(i / 360 * 6.283) * ORB, 0, Math.sin(i / 360 * 6.283) * ORB))), new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.45 }));
  orbitLine.computeLineDistances(); space.add(orbitLine);
  const pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#ffb547', transparent: true, opacity: 0.9 }));
  space.add(pathLine);
  const globe = makeGlobe({ day, night, clouds }); globe.group.scale.setScalar(0.55); space.add(globe.group);
  const EM = globe.earthMat.uniforms;
  const scam = new THREE.PerspectiveCamera(40, W / H, 0.01, 3000);

  // ================= under the ice + vent =================
  const sea = new THREE.Scene(); sea.background = new THREE.Color('#02060c'); sea.fog = new THREE.FogExp2('#03101c', 0.035);
  const iceCeil = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: iceTex, color: '#7fa3c4', roughness: 0.5, side: THREE.DoubleSide })); iceCeil.rotation.x = Math.PI / 2; iceCeil.position.y = 8; sea.add(iceCeil);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 60, 60), new THREE.MeshStandardMaterial({ color: '#1d1a18', roughness: 1, flatShading: true }));
  { const pa = floor.geometry.attributes.position; const q = rng(8); for (let i = 0; i < pa.count; i++) pa.setZ(i, q() * 0.8); floor.geometry.computeVertexNormals(); }
  floor.rotation.x = -Math.PI / 2; floor.position.y = -30; sea.add(floor);
  const chimney = new THREE.Group();
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5 - i * 0.06, 0.9 - i * 0.07, 1.4, 9), new THREE.MeshStandardMaterial({ color: '#2b2522', roughness: 1, flatShading: true })); c.position.y = 0.7 + i * 1.25; c.rotation.y = i; chimney.add(c); }
  chimney.position.set(0, -30, 0); sea.add(chimney);
  const worms = new THREE.Group();
  const q2 = rng(12);
  for (let i = 0; i < 70; i++) { const a = q2() * 6.28, rr = 1.0 + q2() * 2.8, h = 0.5 + q2() * 1.4; const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, h, 6), new THREE.MeshStandardMaterial({ color: '#e8e2d8', roughness: 0.8 })); tube.position.set(Math.cos(a) * rr, -30 + h / 2, Math.sin(a) * rr); worms.add(tube); const plume = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ color: '#d1243a', emissive: '#4a0610', roughness: 0.6 })); plume.position.set(tube.position.x, -30 + h + 0.05, tube.position.z); worms.add(plume); }
  sea.add(worms);
  const smoke = new Puffs(260, { renderOrder: 5 }); sea.add(smoke.mesh);
  const ventGlow = new THREE.PointLight('#ff7a3c', 40, 20, 1.5); ventGlow.position.set(0, -22, 1.5); sea.add(ventGlow);
  sea.add(new THREE.AmbientLight('#20384f', 0.5));
  const lamp = new THREE.SpotLight('#cfe6ff', 60, 60, 0.5, 0.6, 1.2); lamp.position.set(4, -18, 10); lamp.target.position.set(0, -27, 0); sea.add(lamp, lamp.target);
  const motes = new Puffs(300, { renderOrder: 4 }); sea.add(motes.mesh);
  const diveLamp = new THREE.SpotLight('#d8ecff', 120, 40, 0.6, 0.5, 1.2); sea.add(diveLamp, diveLamp.target);
  const ucam = new THREE.PerspectiveCamera(55, W / H, 0.05, 500);
  const endScene = new THREE.Scene(); endScene.background = new THREE.Color('#0d0e11');

  const shots = [
    { t0: 0, t1: 3.4, kind: 'beach', mode: 'wide' },
    { t0: 3.4, t1: 9.0, kind: 'space', mode: 'gone' },
    { t0: 9.0, t1: 15.6, kind: 'beach', mode: 'people' },
    { t0: 15.6, t1: T_DARK, kind: 'space', mode: 'front' },
    { t0: T_DARK, t1: 22.0, kind: 'beach', mode: 'dark' },
    { t0: 22.0, t1: 25.0, kind: 'beach', mode: 'moon' },
    { t0: 25.0, t1: 28.5, kind: 'space', mode: 'fly' },
    { t0: 28.5, t1: 31.7, kind: 'beach', mode: 'palms' },
    { t0: 31.7, t1: 38.3, kind: 'beach', mode: 'frozen' },
    { t0: 38.3, t1: 41.9, kind: 'sea', mode: 'ice' },
    { t0: 41.9, t1: 45.5, kind: 'sea', mode: 'vent' },
    { t0: 45.5, t1: 51.5, kind: 'beach', mode: 'back' },
    { t0: 51.5, t1: DUR + 1, kind: 'end' },
  ];

  function frame(t, opts = {}) {
    const shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
    const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
    const sec = secAt(t);
    const back = shot.mode === 'back';
    const lit = back || t < T_DARK ? 1 : 0;         // sunlight still arriving?
    const days = sec / 86400;
    const cold = back ? 0 : smooth(0.5, 7, days);   // frost amount
    const frozen = back ? 0 : smooth(7, 365, days);
    const sx = { tag: 'WHAT IF &nbsp;·&nbsp; 06', tagA: 1, labels: [] };
    let scn, cam;

    if (shot.kind === 'beach') {
      scn = beach; cam = bcam;
      sky.mat.uniforms.uDay.value = lit; stars.material.opacity = 1 - lit;
      sun.intensity = 2.7 * lit; hemi.intensity = lerp(0.06, 0.85, lit); starLight.intensity = (1 - lit) * (0.45 + 0.35 * frozen);
      fog.near = lerp(400, 120, lit); fog.far = lerp(3000, 2600, lit); fog.color.set(lit ? '#bcd8ee' : '#05070c');
      const wt = t < T_DARK || back ? t : T_DARK + (t - T_DARK) * (1 - frozen) * 0.4;
      OU.uTime.value = wt; OU.uSkyAmt.value = lit; OU.uNight.value = (1 - lit) * 0.85;
      iceMat.opacity = frozen; ocean.mesh.visible = frozen < 0.999;
      sandMat.color.set(lit ? '#e9dcc0' : '#9aa8b8').lerp(new THREE.Color('#e6eef6'), cold * (1 - lit) * 0.8);
      for (const m of leafMats) m.color.set('#3f8a3a').lerp(new THREE.Color('#6b5a3a'), back ? 0 : smooth(3, 30, days) * 0.85).lerp(new THREE.Color('#dfe8f0'), cold * 0.5);
      // frost / steam puffs over the sea while it freezes
      const fp = rng(3);
      for (let i = 0; i < frostPuffs.n; i++) { const x = -60 + fp() * 120, z = -2 - fp() * 90, ph = fp(), life = (t * 0.25 + ph) % 1; frostPuffs.set(i, x, 0.3 + life * 4, z, 2 + fp() * 4, (1 - lit) * cold * (1 - frozen) * 0.12 * (1 - life), 0.8, 0.85, 0.9, fp() * 6); }
      frostPuffs.commit();
      // daytime moon: half-lit by the Sun until its light stops (1.5 s of screen after darkness)
      const moonLit = back || t < 22.5 ? 1 : 1 - smooth(22.5, 23.1, t);
      dayMoon.material.color.setScalar(moonLit * (lit ? 0.55 : 1.15)); dayMoon.visible = shot.mode === 'moon' || shot.mode === 'people';
      const tele = shot.mode === 'moon';
      const P = (x, y, z) => new THREE.Vector3(x, y, z);
      const L = (pos, tgt, fov) => { bcam.position.copy(pos); bcam.fov = fov; bcam.updateProjectionMatrix(); bcam.lookAt(tgt); };
      if (shot.mode === 'wide' || shot.mode === 'back') L(P(lerp(-2, 0, k), lerp(3.2, 3.6, k), lerp(40, 37, k)), P(4, 13, -40), 54);
      else if (shot.mode === 'people') L(P(lerp(1.5, 0.5, k), 1.7, lerp(27, 25.5, k)), P(lerp(2, -2, k), 4, -40), 50);
      else if (shot.mode === 'dark') L(P(0, 2.2, 30), P(0, lerp(6, 14, k), -40), 54);
      else if (shot.mode === 'moon') { L(P(0, 1.7, 6), P(0, 1.7, 6).addScaledVector(moonDirSky, 100).add(new THREE.Vector3(0, -5, 0)), 10); }
      else if (shot.mode === 'palms') L(P(lerp(-14, -12, k), 2.0, lerp(34, 32, k)), P(-22, 6, 30), 50);
      else L(P(lerp(-1, 1, k), lerp(4.2, 5.0, k), lerp(34, 31, k)), P(0, 1.5, -40), 50);
      dayMoon.position.copy(bcam.position).addScaledVector(moonDirSky, 2600); dayMoon.scale.setScalar(2600 * Math.tan(0.26 * Math.PI / 180) * (tele ? 1 : 3));
      dayMoon.lookAt(bcam.position); dayMoon.rotateY(-Math.PI / 2);
      // a lamp for the moon (direct sunlight) only on that mesh: use emissive trick via material color; scene sun lights it too
    } else if (shot.kind === 'space') {
      scn = space; cam = scam;
      const lt = t - shot.t0;
      const sunOn = t < T_GONE;
      sunBall.visible = sunOn; sunGlow.set(0, 0, 0, 0, sunOn ? 7 : 0, sunOn ? 0.9 : 0, 1.0, 0.8, 0.5); sunGlow.set(1, 0, 0, 0, sunOn ? 2.6 : 0, sunOn ? 1.0 : 0, 1.0, 0.95, 0.85); sunGlow.commit();
      // light front radius: reaches the orbit at T_DARK
      const fr = t < T_GONE ? 0 : ORB * clamp((t - T_GONE) / (T_DARK - T_GONE));
      front.scale.setScalar(Math.max(0.001, fr)); front.material.uniforms.uA.value = t >= T_GONE && t < T_DARK + 0.4 ? 0.9 : 0;
      // Earth position: on the orbit until the gravity change arrives (same moment as the light), then a straight tangent line
      const a0 = 0.7 + Math.min(t, T_DARK) * 0.004;
      const e0 = new THREE.Vector3(Math.cos(a0) * ORB, 0, Math.sin(a0) * ORB);
      const tan = new THREE.Vector3(-Math.sin(a0), 0, Math.cos(a0));
      const off = t > T_DARK ? (shot.mode === 'fly' ? easeIn(clamp((t - 25.0) / 3.5)) * 4.5 : 0) : 0;
      const ep = e0.clone().addScaledVector(tan, off);
      globe.group.position.copy(ep); globe.spin.rotation.y = t * 0.4; globe.cloudSpin.rotation.y = t * 0.4;
      const toSun = ep.clone().negate().normalize();
      EM.uSun.value.copy(toSun); EM.uDayGain.value = t < T_DARK ? 1 : 0; EM.uLights.value = t < T_DARK ? 1 : 1.6; EM.uRim.value = t < T_DARK ? 1 : 0.15;
      pathLine.visible = shot.mode === 'fly';
      pathLine.geometry.setFromPoints([e0, e0.clone().addScaledVector(tan, 9)]); pathLine.material.opacity = smooth(25.2, 26.0, t) * 0.8;
      const outw = e0.clone().normalize();
      if (shot.mode === 'gone' || shot.mode === 'front') {
        const mid = e0.clone().multiplyScalar(shot.mode === 'gone' ? 0.5 : 0.62);
        scam.up.copy(outw).negate(); // Sun at the top of the frame, Earth at the bottom
        scam.position.copy(mid).add(new THREE.Vector3(0, shot.mode === 'gone' ? lerp(17, 16, k) : lerp(13, 12, k), 0)).addScaledVector(tan, 3.5);
        scam.lookAt(mid);
      } else {
        scam.up.set(0, 1, 0);
        scam.position.copy(ep).addScaledVector(tan, -5.0).addScaledVector(outw, 3.2).add(new THREE.Vector3(0, 1.4, 0));
        scam.lookAt(ep.clone().addScaledVector(tan, 1.2).addScaledVector(outw, -0.3));
      }
      scam.fov = 40; scam.updateProjectionMatrix(); scam.updateMatrixWorld();
      const pe = project(ep, scam);
      sx.labels.push({ x: pe.x, y: pe.y + 70, a: shot.mode === 'fly' ? smooth(25.3, 25.9, t) : smooth(shot.t0 + 0.3, shot.t0 + 0.8, t), html: shot.mode === 'fly' ? '<b>107,000 KM/H</b>' : 'EARTH' });
      if (shot.mode !== 'fly') { const ps = project(new THREE.Vector3(0, 0, 0), scam); sx.labels.push({ x: ps.x, y: ps.y + 64, a: 1, html: sunOn ? 'SUN' : 'NO SUN' }); }
      if (t >= T_GONE && t < T_DARK) { const pf = project(toSun.clone().multiplyScalar(-fr).add(new THREE.Vector3(0, 0, 0)), scam); }
    } else if (shot.kind === 'sea') {
      scn = sea; cam = ucam;
      const lt = t - shot.t0;
      if (shot.mode === 'ice') { ucam.position.set(lerp(-2, 0, k), lerp(2.5, 3.5, k), 10); ucam.lookAt(0, 8, -6); ucam.fov = 60; lamp.intensity = 20; diveLamp.intensity = 140; diveLamp.position.copy(ucam.position); diveLamp.target.position.set(0, 8, -4); }
      else { ucam.position.set(lerp(5.5, 4.5, k), lerp(-26.5, -26.8, k), lerp(7.5, 6.5, k)); ucam.lookAt(0, -26.5, 0); ucam.fov = 50; lamp.intensity = 60; diveLamp.intensity = 0; }
      ucam.updateProjectionMatrix();
      const sm = rng(5);
      for (let i = 0; i < smoke.n; i++) { const ph = sm(), life = (t * 0.22 + ph) % 1; const y = -22.6 + life * 14; smoke.set(i, Math.sin(life * 5 + i) * life * 1.5, y, Math.cos(life * 4 + i) * life * 1.2, 0.6 + life * 3.5, 0.5 * (1 - life), 0.06, 0.06, 0.07, sm() * 6); }
      smoke.commit();
      const mo = rng(6);
      for (let i = 0; i < motes.n; i++) { motes.set(i, (mo() - 0.5) * 30, -30 + mo() * 40 + Math.sin(t * 0.3 + i) * 0.3, (mo() - 0.5) * 30, 0.04, 0.35, 0.7, 0.8, 0.9); }
      motes.commit();
    } else { scn = endScene; cam = scam; }

    // HUD
    if (t >= T_GONE && t < 51.5) {
      const temp = back ? null : sec < 86400 ? 15 : sec < 7 * 86400 ? lerp(15, -18, smooth(1, 7, days)) : lerp(-18, -73, smooth(7, 365, days));
      sx.hud = { a: 1, lab: back ? 'Sunlight age' : 'Sun gone for', val: back ? '8:20' : clock(sec), sub: back ? 'Minutes : seconds' : t < T_DARK ? 'Sunlight still arriving' : t < 25 ? 'No sunlight' : `Avg temperature &nbsp;${Math.round(temp)} °C`, sub2: t < T_DARK && !back ? 'Time sped up' : '' };
    }
    if (t < 3.4) sx.title = { html: TITLE, a: Math.min(smooth(0.0, 0.35, t), 1 - smooth(3.0, 3.35, t)), k: smooth(0, 0.6, t) };
    const c = captionAt(CAPTIONS, t); if (c) sx.caption = c;
    if (t >= 51.5) { sx.end = { a: smooth(51.5, 51.85, t), title: TITLE, note: ENDNOTE }; sx.hud = null; sx.labels = []; }
    if (opts.cover) { sx.title = { html: TITLE, a: 1, k: 1 }; sx.caption = null; sx.hud = null; sx.labels = []; }

    const G = R.grade.uniforms;
    R.bloom.strength = shot.kind === 'space' ? 0.9 : 0.4; R.bloom.radius = 0.55; R.bloom.threshold = shot.kind === 'space' ? 0.6 : 0.85;
    R.renderer.toneMappingExposure = shot.kind === 'beach' && !lit ? 1.4 : 0.92;
    G.uTime.value = t; G.uSat.value = shot.kind === 'beach' && !lit ? 0.85 : 1.06; G.uTint.value.set(1, 1, 1.02); G.uVignette.value = 0.5; G.uAberr.value = 0.003; G.uFade.value = 0; G.uShake.value.set(0, 0);
    G.uFadeWhite.value = t >= T_GONE && t < T_GONE + 0.5 ? (1 - (t - T_GONE) / 0.5) * 0.5 : 0;
    R.renderPass.scene = scn; R.renderPass.camera = cam;
    R.composer.render();
    ov.apply(sx);
  }
  return { duration: DUR, fps: 30, frame, cues: { gone: T_GONE, dark: T_DARK } };
}
