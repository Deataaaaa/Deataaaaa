// Post 10: What if Earth's magnetic field flipped in 5 seconds? (Giza at night, 68 s)
// Hook (0-3.6): flash-forward: an aurora over the three pyramids, the valley dark. Calm (3.6-11): the plateau floodlit
// from 230 m up, Cairo's lights over the valley; then behind your shoulder, your phone's compass. The flip (11-15.5): the
// needle swings round to the south. The power line (15.5-21): the pylon beside the plateau arcs. The blackout (21-33):
// transformers flash across Giza and Cairo, the districts go dark, the pyramids' floodlights die, the stars come out.
// Minutes later (33-44): the aurora erupts over the pyramids. Space (44-50): the night side goes dark, aurora everywhere,
// the satellites die. Back (50-56): your face in its green light; Quebec 1989. Last take (56-62): the pyramids under the
// aurora, the vending machine still lit (rule 19's WTF). Loop end card + Follow for more (62-68).
import * as THREE from 'three';
import { createRenderer, Overlay, W, H as HH, rng, smooth, clamp, captionAt, hudK } from '../engine/core.js';
import { loadTex } from '../engine/assets.js';
import { makeSpace6, geoDir } from '../engine/space6.js';
import { makeEndTag } from '../engine/endtag.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { fadeShadowBorders, Sparks, Flare, SkyStars, milkyWayMap, SIMPLEX } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, sit, lookAt } from '../engine/poses.js';
import { makeCat } from '../engine/cat.js';
import { GZ, PYR, GU, hAt, makeDesert, makePyramids, makeCity, makeNightSky, makePowerLine, CityLights } from '../engine/giza.js';
import { makePhone, makeVending } from '../engine/props16.js';
import { T, DUR, H, F, RT, P, HERO_YAW, fieldAt, needleAt, clockAt, aurAt, aurClock, hook, glide, flipCam, TOWERS, arcCam, cityCam, aurCam, backCam, finalCam } from './ep16cams.js';

const TITLE = 'What if Earth’s magnetic field <span class="k">flipped</span> in 5 seconds?';
const CAPTIONS = [
  [3.75, 6.9, 'Giza, Egypt. 8:40 pm.'],
  [7.0, 10.85, 'Every compass on Earth points north.'],
  [11.05, 14.1, 'Then the magnetic field flips.'],
  [14.15, 16.9, 'North is now south.'],
  [17.0, 20.6, 'Every long wire becomes a generator.'],
  [20.7, 24.1, 'Transformers blow across Cairo.'],
  [24.2, 27.6, '22 million people, in the dark.'],
  [27.7, 30.4, 'Then the stars come out.'],
  [30.5, 33.2, 'Minutes later…'],
  [33.3, 36.4, 'The sky catches fire.', { shade: 1 }],
  [36.5, 39.8, 'The radiation belts rain down.', { shade: 1 }],
  [39.9, 43.6, 'Auroras over the pyramids.', { shade: 1 }],
  [44.3, 47.3, 'Every city on Earth goes dark.'],
  [47.4, 50.6, 'Auroras circle the whole planet.'],
  [50.9, 54.7, 'In 1989, a far weaker storm hit Quebec.'],
  [54.8, 58.2, 'The grid collapsed in 90 seconds.'],
  [58.3, 61.98, 'Could you live without power?'],
];
const MU = '<span style="text-transform:none">µT</span>';   // the HUD is upper case: µ would turn into a Greek capital ("MT")
const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(V(0, 0, 0));
// the story's clock for everything that happens in the scene: the hook flashes forward to the aurora (minutes after)
const storyT = (t) => (t < T.HOOK ? 40 + 0.3 * t : t);
// a pyramid's floodlights: a brown-out dip, then off (Khufu and its queens first, Khafre, then Menkaure and its queens)
const FLOOD_OFF = [25.2, 26.0, 26.8, 26.8, 26.8, 26.8, 25.2, 25.2, 25.2];
const floodK = (i, s) => (1 - 0.45 * smooth(FLOOD_OFF[i] - 0.6, FLOOD_OFF[i], s)) * (1 - smooth(FLOOD_OFF[i], FLOOD_OFF[i] + 0.45, s));

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const scene = new THREE.Scene();

  // ---- environment light (a dim night: the sky above, a warm band where the city glows) ----
  const pm = new THREE.PMREMGenerator(R.renderer);
  const envScene = new THREE.Scene(); envScene.background = new THREE.Color('#0b0f1a');
  { const band = new THREE.Mesh(new THREE.CylinderGeometry(300, 300, 40, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a2c22'), side: THREE.BackSide })); band.position.y = 10; envScene.add(band);
    const top = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#141a2a', side: THREE.BackSide })); envScene.add(top); }
  scene.environment = pm.fromScene(envScene, 0, 1, 2000).texture; scene.environmentIntensity = 0.5;
  scene.fog = new THREE.FogExp2('#0b0f19', 0.00005);

  // ---- sky: the Milky Way (rising behind the pyramids at this hour), stars, the aurora ----
  const gN = V(-0.6667, -0.2828, -0.6896), gC = V(-0.7417, 0.1606, 0.6512);   // galactic pole and centre over Giza, 19 Oct 2026, 17:40 UTC
  const SKY = makeNightSky({ milky: milkyWayMap(R.renderer, gN, gC), viewDir: new THREE.Vector2(F.x, F.z) }); scene.add(SKY.mesh);
  const starList = []; { const sr = rng(6161);
    for (let i = 0; i < 9000; i++) { const u = sr() * 2 - 1, th = sr() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = V(s * Math.cos(th), u, s * Math.sin(th)); if (d.y < -0.05) continue;
      const m = Math.pow(sr(), 3.2), tp = sr(), I = 0.18 + 2.2 * m * m, c = tp < 0.3 ? [0.72, 0.84, 1] : tp < 0.78 ? [1, 0.97, 0.92] : [1, 0.82, 0.6];
      starList.push({ d, px: 1.0 + m * 2.0, r: c[0] * I, g: c[1] * I, b: c[2] * I }); } }
  const stars = new SkyStars(starList, { radius: 8500, minPx: 1.6 }); scene.add(stars.points);

  // ---- the plateau, the pyramids, the city, the power line ----
  const desert = makeDesert(); scene.add(desert);
  const PY = makePyramids(); scene.add(PY.group);
  const city = makeCity({ density: Number(q.get('city') ?? 1), tFlip: T.FLIP }); scene.add(city.group);
  if (q.get('cdbg')) console.log('cdbg', city.lights.geo.drawRange.start, city.lights.geo.drawRange.count, Array.from(city.lights.pos.slice(0, 6)).map((v) => v.toFixed(1)).join(','), Array.from(city.lights.prm.slice(0, 8)).map((v) => v.toFixed(2)).join(','), Array.from(city.lights.col.slice(0, 3)).join(','));
  const towers = TOWERS.map((p) => ({ x: p.x, y: hAt(p.x, p.z) - 0.3, z: p.z, yaw: -1.877 }));
  const PL = makePowerLine(towers); scene.add(PL.group);

  // ---- lights ----
  const moon = new THREE.DirectionalLight('#a7b4cc', 0.45); moon.position.copy(H).add(V(-120, 200, 300)); moon.target.position.copy(H); scene.add(moon, moon.target);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); const sc = moon.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 50; sc.far = 600; moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.03;
  const hemi = new THREE.HemisphereLight('#24304a', '#17130f', 0.42); scene.add(hemi);
  const cityL = new THREE.DirectionalLight('#ffb27a', 0.22); cityL.position.copy(H).add(V(800, 60, -900)); cityL.target.position.copy(H); scene.add(cityL, cityL.target);
  const aurL = new THREE.HemisphereLight('#6dffa6', '#0d1a12', 0); scene.add(aurL);
  const arcL = new THREE.PointLight('#9ec2ff', 0, 160, 2); scene.add(arcL);

  // ---- the arcs on the pylons: glow at the insulator strings, sparks raining down, then the line dies ----
  const flare = new Flare();
  const insul = PL.attach.filter((a) => a.arm < 30);
  const ARC = insul.map((a, k) => ({ p: a.top.clone().lerp(a.bot, 0.5), tower: a.tower, t0: T.ARC + 0.15 + a.tower * 0.55 + (k % 4) * 0.12, t1: T.ARC + 3.6 + a.tower * 0.4 + (k % 3) * 0.25, ph: k * 1.7 }));
  const arcSpr = ARC.map((a) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flare.glowTex, color: new THREE.Color(0.36, 0.5, 0.8), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    s.position.copy(a.p); scene.add(s); return s; });
  const arcK = (a, s) => smooth(a.t0, a.t0 + 0.12, s) * (1 - smooth(a.t1 - 0.3, a.t1, s)) * (0.72 + 0.28 * Math.sin(s * 31.4 + a.ph) * Math.sin(s * 19.7 + a.ph * 2.0));
  const SPK = 9000, sparks = new Sparks(SPK, { minPx: 1.6, maxPx: 10, near: 2, additive: true }); { const sr = rng(5150); let n = 0;
    for (const a of ARC) { const cnt = a.tower === 0 ? 1600 : 900; for (let k = 0; k < cnt && n < SPK; k++) { const b = a.t0 + (a.t1 - a.t0) * sr(), sp = 1 + 4.5 * sr(), th = sr() * 6.283;
      sparks.set(n++, a.p.x, a.p.y + (sr() - 0.5) * 2.2, a.p.z, Math.cos(th) * sp, 0.5 + 3.5 * sr(), Math.sin(th) * sp, 3.2, 2.1, 1.1, 0.05 + 0.07 * sr(), b, 1.1 + 1.0 * sr(), sr()); } }
    sparks.commit(); sparks.u.uAcc.value.set(0, -9.8, 0); sparks.u.uAccT0.value = 0; sparks.u.uCool && (sparks.u.uCool.value = 1); }
  scene.add(sparks.points);
  // the transformers' flashes over the valley (some twice: the breakers try again)
  const flashes = city.events.map((e, k) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flare.glowTex, color: new THREE.Color(0.55, 0.78, 1.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    const d = e.p.distanceTo(H); s.position.copy(e.p).add(V(0, 6, 0)); s.scale.setScalar(70 + d * 0.022); scene.add(s); return { s, e }; });
  const pulse = (s, t0, rise = 0.12, fall = 0.32) => (s < t0 ? 0 : smooth(t0, t0 + rise, s) * Math.exp(-Math.max(s - t0 - rise, 0) / fall));

  // ---- the people: you (Female_Adult_04: short blonde hair, leather jacket, cargo trousers) and five other visitors ----
  const env = scene.environment;
  const you = await loadAvatar('Female_Adult_04', { env, facial: true }); scene.add(you.root);
  const phone = makePhone(); scene.add(phone);
  const glowL = new THREE.PointLight('#cfe0ff', 0.03, 1.0, 2); scene.add(glowL);       // the screen's light on your face
  const extrasN = ['Male_Adult_06', 'Female_Party_02', 'Male_Adult_08', 'Female_Adult_17', 'Male_Adult_01'];
  const extras = []; for (const n of extrasN) { const a = await loadAvatar(n, { env, lod: 512 }); scene.add(a.root); extras.push(a); }
  const xPh = [makePhone(), null, null, makePhone(), null]; xPh.forEach((p) => p && scene.add(p));
  // where they stand (your frame: forward, right), how they hold themselves
  const XS = [
    { f: 3.2, r: -3.1, yaw: HERO_YAW - 0.15, mode: 'film' },
    { f: 1.0, r: 5.6, yaw: HERO_YAW - 0.35, mode: 'sit' },
    { f: 5.8, r: 2.6, yaw: HERO_YAW + 0.1, mode: 'stand' },
    { f: 6.1, r: 3.6, yaw: HERO_YAW - 0.25, mode: 'phone' },
    { f: -4.2, r: -4.6, yaw: HERO_YAW + 0.4, mode: 'stand' },
  ];
  // ---- rocks (a seat, Apple's perch, scattered limestone) ----
  const rockM = new THREE.MeshStandardMaterial({ color: '#9c8b74', roughness: 0.92 });
  const rockGeo = (seed, sx, sy, sz) => { const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position, r = rng(seed), o = [r() * 9, r() * 9, r() * 9];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.8 + 0.3 * (Math.sin(x * 3.1 + o[0]) * Math.sin(y * 2.7 + o[1]) * Math.sin(z * 3.3 + o[2]) * 0.5 + 0.5)
        + 0.07 * Math.sin(x * 9.3 + o[1]) * Math.sin(y * 8.1 + o[2]) * Math.sin(z * 10.7 + o[0]) + 0.025 * Math.sin(x * 23 + y * 19 + o[2]) * Math.sin(z * 21 - y * 17 + o[0]);
      p.setXYZ(i, x * sx * k, Math.max(y, -0.3) * sy * k, z * sz * k); }
    g.computeVertexNormals(); return g; };
  const seatP = P(1.0, 5.6, 0); seatP.y = hAt(seatP.x, seatP.z);
  const seat = new THREE.Mesh(rockGeo(11, 0.55, 0.42, 0.5), rockM); seat.position.copy(seatP); seat.castShadow = seat.receiveShadow = true; scene.add(seat);
  const perchP = P(14, -2.4, 0); perchP.y = hAt(perchP.x, perchP.z);
  const perch = new THREE.Mesh(rockGeo(12, 0.5, 0.44, 0.36), rockM); perch.rotation.set(0.12, 0.7, -0.08); perch.position.copy(perchP); perch.castShadow = perch.receiveShadow = true; scene.add(perch);
  { const rr = rng(13), inst = new THREE.InstancedMesh(rockGeo(14, 1, 1, 1), rockM, 90), o = new THREE.Object3D(); let n = 0;
    for (let i = 0; i < 160 && n < 90; i++) { const a = rr() * 6.283, d = 4 + 45 * Math.sqrt(rr()), p = H.clone().add(V(Math.cos(a) * d, 0, Math.sin(a) * d));
      if (p.clone().sub(H).dot(F) > 2 && Math.abs(p.clone().sub(H).dot(RT)) < 9) continue;       // keep the view to the pyramids clear
      const s = 0.15 + 0.6 * Math.pow(rr(), 2); o.position.set(p.x, hAt(p.x, p.z) - s * 0.25, p.z); o.scale.set(s * (0.8 + 0.5 * rr()), s * (0.5 + 0.4 * rr()), s); o.rotation.y = rr() * 6.28; o.updateMatrix(); inst.setMatrixAt(n++, o.matrix); }
    inst.count = n; inst.castShadow = inst.receiveShadow = true; scene.add(inst); }
  // ---- Apple (rule 19): on the rock to your left, calm part ----
  const apple = makeCat(); apple.root.position.set(perchP.x, perchP.y + 0.46, perchP.z); apple.root.rotation.y = HERO_YAW + Math.PI * 0.75; scene.add(apple.root);
  // ---- the WTF: a vending machine in the desert, still lit after the blackout (its cable ends in the sand) ----
  const vend = makeVending(); { const p = P(-2.0, -3.4, 0); vend.position.set(p.x, hAt(p.x, p.z) - 0.03, p.z); const fc = P(-13, -2.1, 0).sub(p); vend.rotation.y = Math.atan2(fc.x, fc.z) + 0.3; } scene.add(vend);   // seen in the last take

  // ---- space (44-50): the night side going dark, aurora everywhere, the satellites dying ----
  const [day, night, cloudsTex] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false)]);
  const SPc = makeSpace6({ day, night, clouds: cloudsTex });
  SPc.U.uSun.value.copy(geoDir(-10.3, -85));                   // 17:40 UTC on 19 October: the Sun over the eastern Pacific; Egypt 2.7 h into the night
  { const m = SPc.earth.material; m.uniforms.uDark = { value: 0 };
    m.fragmentShader = m.fragmentShader.replace('uniform float uSmear', 'uniform float uDark, uSmear').replace('* (1.0 - c) * uLights;', '* (1.0 - c) * uLights * smoothstep(uDark - 0.04, uDark + 0.04, fbmv(vP * 6.0 + 4.0));\n        col += (texture2D(tDay, vUv).rgb * (1.0 - c) + vec3(0.6) * c) * vec3(0.45, 0.55, 0.8) * 0.045 * (1.0 - lit);   // moonlit land and clouds');
    m.needsUpdate = true; }
  const aurS = new THREE.Mesh(new THREE.SphereGeometry(1.016, 160, 80), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSun: SPc.U.uSun, uPole: { value: geoDir(80.7, -72.7) }, uK: { value: 0 }, uT: { value: 0 } },
    vertexShader: `varying vec3 vN, vW, vP; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: SIMPLEX + `uniform vec3 uSun, uPole; uniform float uK, uT; varying vec3 vN, vW, vP;
      void main(){ vec3 n = normalize(vN), v = normalize(cameraPosition - vW), q = normalize(vP);
        // geomagnetic latitude and longitude: arcs run east-west, so the noise is stretched along the longitude
        vec3 e1 = normalize(cross(uPole, vec3(0.0, 1.0, 0.0))), e2 = cross(uPole, e1);
        float lat = asin(clamp(dot(q, uPole), -1.0, 1.0)) * 57.2958, ml = abs(lat), ph = atan(dot(q, e2), dot(q, e1));
        vec3 cp = vec3(cos(ph), sin(ph), lat > 0.0 ? 1.7 : -1.7);
        float wv = fbm3(cp * 3.2 + vec3(0.0, 0.0, uT * 0.003), 4) * 3.5, x1 = ml + wv - 30.0, x2 = ml + wv * 0.7 - 63.0;
        float band = exp(-x1 * x1 / 26.0) + 0.8 * exp(-x2 * x2 / 18.0);                       // the inner and outer belts' footprints
        float arcs = pow(0.5 + 0.5 * cos((ml + wv) * 1.1 + 2.5 * fbm3(cp * 7.0 + 9.0 + vec3(0.0, 0.0, uT * 0.004), 3)), 2.0)
          * (0.65 + 0.35 * fbm3(cp * 16.0 + vec3(ml * 0.3, 0.0, uT * 0.006), 2));   // parallel arcs, folded along their length
        float w = fwidth(ml) * 1.5; arcs = mix(0.3, arcs, 1.0 - smoothstep(0.4, 1.2, w));
        float patchy = 0.4 + 0.6 * smoothstep(0.3, 0.7, 0.5 + 0.5 * fbm3(cp * 3.0 + 5.0, 3)), a = band * patchy * (0.2 + 0.8 * arcs);
        float nightK = smoothstep(0.1, -0.25, dot(n, uSun)), limb = 1.0 / max(abs(dot(n, v)), 0.3);
        vec3 c = (vec3(0.15, 1.0, 0.42) * a * 1.3 + vec3(0.9, 0.12, 0.1) * 0.1 * band * patchy) * nightK * limb * 0.5 * uK;
        gl_FragColor = vec4(c, 1.0); }` }));
  SPc.scene.add(aurS);
  // (no satellites: nothing on screen claims they fail)
  const EG = geoDir(30, 31), camDirS = EG.clone().addScaledVector(geoDir(12, 18), 0.35).normalize();
  const camS = new THREE.PerspectiveCamera(30, W / HH, 0.01, 9000); camS.setViewOffset(W, HH, 0, -200, W, HH);

  const tag = makeEndTag({ text: 'Follow for more', ssaa: globalThis.SSAA });
  await Promise.all(TEX_PENDING);

  // ---- posing (a pure function of time) ----
  const cam = new THREE.PerspectiveCamera(40, W / HH, 0.05, 30000); const camB = cam.clone();
  const towerTop = V(towers[0].x, towers[0].y + 30, towers[0].z), ARCCAM = arcCam(towerTop);
  const shotId = (t) => (t < T.HOOK ? 0 : t < T.CUT1 ? 1 : t < T.FLIP ? 2 : t < T.ARC ? 3 : t < T.CITY ? 4 : t < T.AUR ? 5 : t < T.SPACE ? 6 : t < T.BACK ? 7 : t < T.FINAL ? 8 : 9);
  const camAt = (c, t) => { const id = shotId(t); (id === 0 ? hook : id <= 2 ? glide : id === 3 ? flipCam : id === 4 ? ARCCAM : id === 5 ? cityCam : id === 6 ? aurCam : id === 8 ? backCam : finalCam).apply(c, t); };
  const blinkK = (t, list) => { let k = 0; for (const b0 of list) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  // where you look: your phone, the pylon, the city, then up at the sky (smooth turns between keys)
  const LOOK = [[0, P(0.32, 0.06, 1.15)], [T.ARC + 0.4, towerTop.clone().add(V(0, -8, 0))], [T.CITY + 0.8, P(1500, 0, 30)], [T.DARK + 0.5, P(300, 0, 140)], [T.AUR, P(150, 0, 190)], [T.BACK, P(60, 25, 150)]];
  const lookAtT = (keys, s, dur = 0.9) => { let p = keys[0][1].clone(); for (let i = 1; i < keys.length; i++) p.lerp(keys[i][1], smooth(keys[i][0] - dur * 0.5, keys[i][0] + dur * 0.5, s)); return p; };
  // the phone in the hand: on the palm, screen out of it, its top toward the index finger
  const tmpA = V(0, 0, 0), tmpB = V(0, 0, 0), mB = new THREE.Matrix4();
  function phoneFit(av, ph, side = 'Right') {
    const B = av.bones, hd = wp(B[side + 'Hand']), i1 = wp(B[side + 'HandIndex1']), p1 = wp(B[side + 'HandPinky1']), m1 = wp(B[side + 'HandMiddle1']);
    const Z = tmpA.copy(i1).sub(p1).cross(tmpB.copy(m1).sub(hd)).normalize(); if (side === 'Left') Z.negate();
    const X = hd.clone().sub(m1); X.addScaledVector(Z, -X.dot(Z)).normalize(); if (side === 'Left') X.negate();
    const Y = Z.clone().cross(X).normalize();
    mB.makeBasis(X, Y, Z); ph.quaternion.setFromRotationMatrix(mB);
    ph.position.copy(m1).addScaledVector(X, -0.03).addScaledVector(Z, 0.0375).addScaledVector(Y, 0.004);   // across the fingers, its far edge in the fingertips
    ph.updateMatrixWorld(true);
  }
  const phoneArm = (raise = 0) => (sh, fwd, left, up) => ({
    hand: sh.clone().addScaledVector(up, -0.24 + raise * 0.27).addScaledVector(fwd, 0.36 + raise * 0.06).addScaledVector(left, 0.12),
    pole: sh.clone().addScaledVector(up, -0.6).addScaledVector(left, -0.35).addScaledVector(fwd, -0.15),
    F: left.clone().multiplyScalar(0.82).addScaledVector(fwd, 0.35).addScaledVector(up, 0.25), N: up.clone().multiplyScalar(0.72 - raise * 0.5).addScaledVector(fwd, -0.7 - raise * 0.2), curl: 0.0 });
  function poseAll(t, s) {
    // you: standing still, breathing, your phone at your chest; you look up from it when the line arcs
    stand(you, { pos: V(H.x, H.y, H.z), yaw: HERO_YAW, groundAt: hAt, breath: t * 0.24, armR: phoneArm(0), look: lookAtT(LOOK, s), lookK: 1 });
    if (you.blink) you.blink(blinkK(t, [4.2, 8.1, 10.4, 14.8, 19.6, 23.3, 27.9, 35.4, 40.2, 46.0, 52.1, 55.6, 59.8]));
    if (you.jaw) you.jaw(0.12 * smooth(T.AUR, T.AUR + 2, s) + 0.1 * smooth(T.ARC + 0.2, T.ARC + 0.8, s) * (1 - smooth(T.CITY, T.CITY + 2, s)));
    you.root.updateMatrixWorld(true);
    phoneFit(you, phone);
    if (q.get('phdbg')) { const inv = phone.matrixWorld.clone().invert(), B = you.bones, out = [];
      for (const n of ['RightHand', 'RightHandIndex1', 'RightHandIndex2', 'RightHandIndex3', 'RightHandMiddle1', 'RightHandMiddle2', 'RightHandMiddle3', 'RightHandPinky3', 'RightHandThumb2', 'RightHandThumb3']) if (B[n]) { const l = wp(B[n]).applyMatrix4(inv); out.push(n.replace('RightHand', '') + ':' + [l.x, l.y, l.z].map((v) => (v * 100).toFixed(1)).join('/')); }
      const toHead = wp(B.Head).sub(phone.position).normalize(), Zs = V(0, 0, 1).applyQuaternion(phone.quaternion);
      console.log('phlocal(cm)', out.join(' '), 'screen.toHead', Zs.dot(toHead).toFixed(2)); }
    if (q.get('phdbg')) console.log('phdbg', t.toFixed(2), 'phone', phone.position.toArray().map((v) => v.toFixed(3)).join(','), 'hand', wp(you.bones.RightHand).toArray().map((v) => v.toFixed(3)).join(','), 'head', wp(you.bones.Head).toArray().map((v) => v.toFixed(3)).join(','));
    glowL.position.copy(phone.position).addScaledVector(V(0, 0, 1).applyQuaternion(phone.quaternion), 0.22);
    // the others
    XS.forEach((x, i) => { const a = extras[i], p = P(x.f, x.r, 0); p.y = hAt(p.x, p.z);
      const lk = lookAtT([[0, P(1500, 0, 40 + i * 6)], [T.ARC + 0.6 + i * 0.2, towerTop.clone().add(V(i * 4, -6, 0))], [T.CITY + 1 + i * 0.3, P(1500, 0, 25)], [T.DARK + 0.8 + i * 0.3, P(300, 0, 150 + i * 20)], [T.AUR + 0.5 * i, P(120, 0, 200)]], s, 1.2);
      if (x.mode === 'sit') sit(a, { pos: V(seatP.x, seatP.y, seatP.z), seat: 0.4, yaw: x.yaw, legs: 'chair', floor: hAt(p.x, p.z), arms: 'knees', look: lk, lookK: 0.8, breath: t * 0.22 + i, groundAt: hAt });
      else stand(a, { pos: p, yaw: x.yaw, groundAt: hAt, breath: t * 0.23 + i * 0.37, look: lk, lookK: 0.8, armR: x.mode === 'film' ? phoneArm(1) : x.mode === 'phone' ? phoneArm(0) : undefined });
      a.root.updateMatrixWorld(true);
      if (xPh[i]) phoneFit(a, xPh[i]); });
  }

  function hudAt(t, s) {
    const k = hudK(t, T.FLIP);
    if (t < T.FLIP) return { a: 1, k, lab: 'Earth’s magnetic field flips in', val: fmtT(T.FLIP - t), sub: 'Giza, Egypt · 8:40 pm', sub2: `Field here: 43 ${MU}, pointing north` };
    if (t >= T.END) return null;
    const c = clockAt(t), val = c < 60 ? c.toFixed(2) + ' s' : `${Math.floor(c / 60)} min ${String(Math.floor(c % 60)).padStart(2, '0')} s`;
    const base = { a: 1 - smooth(T.END - 0.3, T.END, t), k, lab: 'Time since the flip', val };
    if (t < T.ARC) { const B = fieldAt(t); return { ...base, sub: `Field here: ${B.toFixed(1)} ${MU}`, sub2: B > 0 ? 'Compass: still north' : 'Compass: points south' }; }
    if (t < T.CITY) return { ...base, sub: 'Induced: ~80,000 V per km of wire', sub2: 'A 50 km line: ~4 million volts' };
    if (t < T.DARK) return { ...base, sub: 'Greater Cairo: 22 million people', sub2: `Grid power: ${Math.round(city.powerAt(t) * 100)} %` };
    if (t < T.MIN) return { ...base, sub: 'Grid power: 0 %', sub2: 'Stars visible: ~2,500 (was ~100)' };
    if (t < T.SPACE) return { ...base, sub: 'Radiation belts: falling into the air', sub2: 'Aurora: 100–300 km up' };
    if (t < T.BACK) return { ...base, sub: 'Every power grid on Earth: down', sub2: '~7.5 billion people, no power' };
    if (t < T.FINAL) return { ...base, sub: 'Quebec · 13 March 1989', sub2: 'Field change ~150× smaller, over hours' };
    return { ...base, sub: 'Big transformers: years to replace', sub2: 'No pumps, no signal, no light' };
  }

  function frame(t) {
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.05; U.uContrast.value = 1.06; U.uVignette.value = 0.38; U.uAberr.value = 0.0012; U.uGrain.value = 0; U.uBarrel.value = 0;
    const s = storyT(t), space = t >= T.SPACE && t < T.BACK;
    let rscene = scene, rc = cam;
    if (space) {
      rscene = SPc.scene; rc = camS;
      const u = clamp((t - T.SPACE) / (T.BACK - T.SPACE)), S = SPc.U;
      S.uLights.value = 1; S.uClouds.value = 0.85; S.uCloudLow.value = 0; S.uLandW.value = 0; S.uSeaW.value = 0; S.uAtm.value = 1; S.uTime.value = t;
      SPc.earth.material.uniforms.uDark.value = 0.32 + 0.75 * smooth(0, 0.75, u);
      const dir = camDirS.clone().applyAxisAngle(V(0, 1, 0), -0.04 * u);
      camS.position.copy(dir).multiplyScalar(3.9 - 0.3 * smooth(0, 1, u)); camS.up.set(0, 1, 0); camS.lookAt(EG.clone().multiplyScalar(0.5)); camS.updateMatrixWorld();
      SPc.stars.u.uGain.value = 0.9; SPc.stars.u.uPR.value = R.SSAA;
      aurS.material.uniforms.uK.value = 0.35 + 0.15 * smooth(0, 0.6, u); aurS.material.uniforms.uT.value = t;
      R.renderer.toneMappingExposure = 1.0; R.bloom.strength = 0.4; R.bloom.radius = 0.6; R.bloom.threshold = 0.95;
      U.uFadeWhite.value = 0.2 * Math.exp(-(t - T.SPACE) * 5);
    } else {
      poseAll(t, s);
      camAt(cam, t);
      if (t >= T.FLIP && t < T.ARC) {   // over your right cheek, square to the screen (its top up), easing back
        const k = smooth(T.FLIP, T.ARC, t), ph = phone.position, Zs = V(0, 0, 1).applyQuaternion(phone.quaternion), Ys = V(0, 1, 0).applyQuaternion(phone.quaternion);
        cam.position.copy(ph).addScaledVector(Zs, 0.27 + 0.06 * k).addScaledVector(RT, 0.17 + 0.03 * k).addScaledVector(Ys, -0.03);
        cam.up.copy(Ys); cam.lookAt(ph.clone().addScaledVector(Ys, 0.004)); cam.fov = 30 + 5 * k; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      cam.near = t >= T.FLIP && t < T.ARC ? 0.03 : t >= T.BACK && t < T.FINAL ? 0.1 : 0.4; cam.updateProjectionMatrix();   // (depth precision for the far city)
      if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      SKY.mesh.position.copy(cam.position); stars.points.position.copy(cam.position);
      // power: the city's share of lights still on; the pyramids' floodlights
      const power = s < T.FLIP ? 1 : city.powerAt(s);
      for (let i = 0; i < PYR.length; i++) GU.uFlood.value[i] = floodK(i, s);
      GU.uCity.value = power; GU.uT.value = s; city.houseMat.emissiveIntensity = 0.25 * power;
      city.lights.update(s, cam, R.SSAA);
      // the sky: the city's glow dies, the stars and the Milky Way come out, the aurora erupts
      const aur = aurAt(t), pul = 0.85 + 0.1 * Math.sin(s * 0.9) + 0.05 * Math.sin(s * 2.3 + 1.0);
      SKY.U.uGlow.value = power; SKY.U.uStars.value = 0.25 + 0.75 * (1 - power); SKY.U.uAur.value = aur; SKY.U.uAT.value = aurClock(t); SKY.U.uPulse.value = pul;
      stars.u.uGain.value = 0.35 + 1.25 * (1 - power); stars.u.uPR.value = R.SSAA;
      aurL.intensity = (t >= T.BACK && t < T.FINAL ? 0.32 : t < T.HOOK ? 0.16 : 0.1) * aur * pul; cityL.intensity = 0.22 * power; hemi.intensity = 0.42 - 0.12 * (1 - power);
      // the arcs, the sparks, the flashes
      let ak = 0; ARC.forEach((a, k) => { const v = arcK(a, s); arcSpr[k].material.opacity = clamp(v); arcSpr[k].scale.set(0.9 + 1.3 * v, 2.6 + 3.0 * v, 1); arcSpr[k].visible = v > 0.002; if (a.tower === 0) ak += v; });
      arcL.position.copy(towerTop).add(V(0, -6, 0)); arcL.intensity = 260 * ak;
      sparks.update(s, cam, R.SSAA);
      for (const f of flashes) { const v = pulse(s, f.e.t - 0.15) + (f.e.twice ? 0.75 * pulse(s, f.e.t + 0.55) : 0); f.s.material.opacity = clamp(v * 1.4); f.s.visible = v > 0.003; }
      PL.ribbons.update(W, HH, R.SSAA);
      // the people (posed above, before the camera)
      phone.draw({ heading: needleAt(s), field: fieldAt(s), label: s > T.FLIP + 1.2 && s < T.FLIP + 3.8 ? 'Interference' : '' });
      for (const p of xPh) if (p) p.screen.material.emissiveIntensity = 0.9;
      glowL.intensity = 0.03;
      apple.update(t, { look: cam.position, blinkAt: [8.0, 9.9], earAt: [9.1], pr: R.SSAA }); apple.root.visible = t >= T.CUT1 && t < T.FLIP;
      // exposure: a night scene, readable on a phone
      R.renderer.toneMappingExposure = 1.35 - 0.2 * aur; R.bloom.strength = 0.3; R.bloom.radius = 0.5; R.bloom.threshold = 0.85 / (1.35 - 0.2 * aur);
      // a lens punch on the flip, and when the aurora erupts
      const pp = (x, x0, d) => (x >= x0 && x < x0 + d ? Math.exp(-(x - x0) / (d * 0.35)) : 0);
      U.uBarrel.value = 0.08 * pp(t, T.FLIP, 0.6) + 0.06 * pp(t, T.AUR, 0.6);
      U.uAberr.value = 0.0012 + 0.01 * pp(t, T.FLIP, 0.8) + 0.008 * pp(t, T.ARC, 0.6) + 0.008 * pp(t, T.AUR, 0.8);
    }
    // flying cameras would smear here; these takes move slowly (checked with tools/camflow.mjs)
    void camB;
    R.renderPass.scene = rscene; R.renderPass.camera = rc;
    R.composer.render();
    const cover = q.get('cover') === '1', endA = smooth(T.END, T.END + 0.5, t);
    ov.apply({ labels: [], tag: 'WHAT IF &nbsp;·&nbsp; 10', tagA: t < T.END ? 1 : 0, title: { html: TITLE, a: cover ? 1 : t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0, k: 1 },
      hud: cover ? null : hudAt(t, s), caption: cover ? null : captionAt(CAPTIONS, t),
      end: endA > 0 ? { a: endA, title: TITLE, note: '<span class="q">Could you live without power?</span><br><br>The field last flipped 780,000 years ago<br>A storm 150× weaker blacked out Quebec in 90 s' } : null });
    tag.update(t, T.END + 0.5, endA);
  }
  window.EP = { scene, cam, THREE };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
