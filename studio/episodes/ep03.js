// EP 03 — What if the atmosphere disappeared for 5 seconds?  (a beach at noon)
import * as THREE from 'three';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeOut, easeIn, project, W, H } from '../engine/core.js';
import { makeStars, Puffs, streakTex, makePerson, makeAirliner, canvasTex } from '../engine/assets.js';
import { makeOcean, sandTex, makePalm, makeUmbrella, makeTowel, makeGull, makeFirepit, makeDrink, makeSailboat } from '../engine/beach.js';

const T_V = 9.0;            // air vanishes
const SLOW = 6;             // 5 s shown over 30 s
const T_R = T_V + 5 * SLOW; // air returns (39.0)
const DUR = 51.6;
const tauOf = (t) => clamp((t - T_V) / SLOW, 0, 5); // real seconds without air (0..5)

const CAPTIONS = [
  [3.5, 5.7, "You're at the beach."],
  [5.8, 8.8, 'Above you: 5 quadrillion tonnes of air.'],
  [9.15, 11.6, 'The sky turns black. At noon.'],
  [11.7, 14.5, 'With no air to scatter sunlight, the stars come out.'],
  [14.7, 16.9, 'Every flame on Earth goes out.'],
  [17.1, 19.5, 'Shadows turn pitch black.'],
  [19.7, 22.1, 'Total silence. Sound has nothing to travel through.'],
  [22.3, 24.5, 'Birds and planes start to fall.'],
  [24.7, 26.9, 'Your cold drink starts to boil.'],
  [27.1, 29.3, 'So does the ocean.'],
  [29.5, 31.9, 'So does the saliva on your tongue.'],
  [32.1, 34.0, 'Your ears pop.'],
  [34.1, 36.5, "Don't hold your breath. Your lungs could tear."],
  [36.7, 38.85, 'You have about 15 seconds before you pass out. You only need 5.'],
  [39.2, 41.5, 'Then the air comes back.'],
  [41.6, 43.9, 'The sky turns blue again.'],
  [44.0, 47.3, 'Because the blue was never the sky. It was the air.'],
];
const TITLE = 'What if the <span class="k">atmosphere</span> disappeared for 5 seconds?';
const ENDNOTE = "Earth's atmosphere weighs about 5.1 quadrillion tonnes<br>and presses on you with 10 tonnes per square metre";

function timer(sec) { const s = Math.max(0, sec); const m = Math.floor(s / 60); const r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; }

function makeAirSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: new THREE.Vector3(-0.35, 0.78, -0.52).normalize() }, uAir: { value: 1 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uSun; uniform float uAir; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0);
        vec3 zen = vec3(0.10,0.32,0.78), hor = vec3(0.62,0.80,0.95);
        vec3 col = mix(hor, zen, pow(h, 0.45));
        col = mix(col, vec3(0.55,0.62,0.66), smoothstep(0.0,-0.05,d.y));
        float s = max(dot(d, uSun), 0.0);
        col += vec3(1.0,0.95,0.85) * (pow(s, 12.0)*0.35 + pow(s, 200.0)*1.2);
        vec3 air = col;
        vec3 vac = vec3(1.0) * smoothstep(0.99996, 0.99998, s) * 12.0 + vec3(1.0,0.98,0.95) * pow(s, 3000.0) * 1.0;
        vec3 airDisc = vec3(1.0,0.97,0.9) * smoothstep(0.99996, 0.99998, s) * 12.0;
        gl_FragColor = vec4(mix(vac, air + airDisc, uAir), 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -10;
  return { mesh: m, mat };
}

export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  const scene = new THREE.Scene();
  const fog = new THREE.Fog('#bcd8ee', 120, 2600); scene.fog = fog;
  const sky = makeAirSky(); scene.add(sky.mesh);
  const stars = makeStars(6000, 3000, 9); stars.material.opacity = 0; stars.material.size = 2.4; scene.add(stars);
  const sunDir = sky.mat.uniforms.uSun.value.clone();
  const hemi = new THREE.HemisphereLight('#bfe0ff', '#d9c08f', 0.85); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3dc', 2.7); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 10, far: 900 }); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  const setShadow = (x, z, half = 60) => { sun.target.position.set(x, 0, z); sun.position.copy(sun.target.position).addScaledVector(sunDir, 400); Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half }); sun.shadow.camera.updateProjectionMatrix(); };

  const r = rng(303);
  // sand (gently sloping into the sea at z ~ 5)
  const st = sandTex(); st.repeat.set(160, 160);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200, 1, 1), new THREE.MeshStandardMaterial({ map: st, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2 - 0.035; sand.position.set(0, 20.7, 595); sand.receiveShadow = true; scene.add(sand);
  const ocean = makeOcean({ shore: 3.5 }); ocean.mat.uniforms.uSun.value.copy(sunDir); scene.add(ocean.mesh);
  const OU = ocean.mat.uniforms;
  // headland on the horizon
  const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#4f7a4a', roughness: 1, flatShading: true }));
  hill.scale.set(420, 120, 160); hill.position.set(-900, -40, -1500); scene.add(hill);
  const hill2 = hill.clone(); hill2.scale.set(300, 80, 120); hill2.position.set(1100, -30, -1700); scene.add(hill2);

  // palms, umbrellas, towels, people
  const palms = [];
  for (const [x, z] of [[-22, 30], [-30, 44], [18, 38], [26, 52], [-12, 58], [34, 26], [-40, 22], [6, 64]]) { const p = makePalm(r, 8 + r() * 4); p.position.set(x, 0.9 + z * 0.035, z); scene.add(p); palms.push(p); }
  const ppl = [];
  const spots = [];
  for (let i = 0; i < 16; i++) spots.push([-28 + r() * 56, 9 + r() * 22]);
  spots.forEach(([x, z], i) => {
    const y0 = 0.0 + (z - 3.5) * 0.035;
    if (i % 2 === 0) { const u = makeUmbrella(r, ['#e8453c', '#2f7ac2', '#ffb547', '#3f8f5a'][i % 4]); u.position.set(x, y0, z); scene.add(u); }
    const tw = makeTowel(r); tw.position.set(x + 0.9, y0 + 0.02, z + 0.6); tw.rotation.y = (r() - 0.5) * 0.4; scene.add(tw);
    const pose = r() < 0.5 ? 'lie' : 'sit';
    const p = makePerson(r, pose); p.position.set(x + 0.9, y0 + (pose === 'lie' ? 0.0 : 0.02), z + (pose === 'lie' ? 1.3 : 0.6)); p.rotation.y = Math.PI + (r() - 0.5) * 0.6; scene.add(p); ppl.push(p);
  });
  // standing people near the water + swimmers
  const standers = [];
  for (let i = 0; i < 12; i++) { const p = makePerson(r, r() < 0.4 ? 'walk' : 'stand'); const z = 2 + r() * 6; p.position.set(-30 + r() * 60, Math.max(0, (z - 3.5) * 0.035) - (z < 3.5 ? 0.3 : 0), z); p.rotation.y = Math.PI + (r() - 0.5) * 2; scene.add(p); standers.push(p); }
  for (let i = 0; i < 10; i++) { const p = makePerson(r, 'stand'); p.position.set(-35 + r() * 70, -1.05, -6 - r() * 18); p.rotation.y = r() * 6; scene.add(p); }
  // hero group close to camera for the shadow / breath shots
  const hero = makePerson(r, 'stand'); hero.position.set(3.2, 0.62, 17.5); hero.rotation.y = Math.PI * 0.85; scene.add(hero);
  const heroU = makeUmbrella(r, '#e8453c'); heroU.position.set(1.4, 0.6, 18.4); scene.add(heroU);
  const heroTw = makeTowel(r); heroTw.position.set(1.8, 0.62, 19.3); scene.add(heroTw);
  // firepit + drink
  const fire = makeFirepit(); fire.position.set(-8, 0.62 + 0, 16.6); scene.add(fire);
  const flames = new Puffs(160, { additive: true, renderOrder: 7 }); scene.add(flames.mesh);
  const smoke = new Puffs(60, { renderOrder: 6 }); scene.add(smoke.mesh);
  const drink = makeDrink(); drink.position.set(5.2, 0.62 + 0.55, 15.0); scene.add(drink);
  const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.55, 8), new THREE.MeshStandardMaterial({ color: '#cccccc', metalness: 0.5, roughness: 0.4 })); tableLeg.position.set(5.2, 0.62 + 0.275, 15.0); scene.add(tableLeg);
  const bubbles = new Puffs(220, { additive: false, renderOrder: 8 }); scene.add(bubbles.mesh);
  const vapor = new Puffs(700, { renderOrder: 6 }); scene.add(vapor.mesh);
  const breath = new Puffs(80, { renderOrder: 9 }); scene.add(breath.mesh);
  // boats, gulls, banner plane, airliner
  const boat = makeSailboat(); boat.position.set(60, 0, -260); boat.rotation.y = 0.6; scene.add(boat);
  const gulls = [];
  for (let i = 0; i < 9; i++) { const g = makeGull(); g.scale.setScalar(2.6); scene.add(g); gulls.push({ g, x0: -16 + i * 3.6 + r() * 2, y0: 62 + r() * 8, z0: -22 - r() * 12, ph: r() * 6, sp: 2 + r() * 1.5 }); }
  const plane = new THREE.Group();
  const prop = makeAirliner(); prop.scale.setScalar(0.22); plane.add(prop);
  const bannerTex = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = '#fbfaf3'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8453c'; g.font = 'bold 84px sans-serif'; g.textBaseline = 'middle'; g.fillText('SUN · SEA · SURF', 40, h / 2 + 4); });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.2), new THREE.MeshStandardMaterial({ map: bannerTex, side: THREE.DoubleSide, roughness: 0.9 }));
  banner.position.set(-16, 0, 0); plane.add(banner);
  scene.add(plane);
  const jet = makeAirliner(); jet.scale.setScalar(0.6); jet.position.set(-400, 900, -1400); jet.rotation.y = -0.2; scene.add(jet);

  const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 9000);
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const look = (pos, tgt, fov = 50) => { cam.position.copy(pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(tgt); };

  const shots = [
    { t0: 0, t1: 3.4, cam: (t, k) => look(P(lerp(-2, 0, k), lerp(5.2, 5.6, k), lerp(46, 43, k)), P(0, 3.5, -40)), sh: [0, 20] },
    { t0: 3.4, t1: 9.0, cam: (t, k) => look(P(lerp(1.5, 1.0, k), lerp(2.0, 1.6, k), lerp(26, 25, k)), P(lerp(2, 0, k), lerp(3, 60, easeInOut(smooth(0.35, 1, k))), -40)), sh: [2, 16] },
    { t0: 9.0, t1: 11.65, cam: (t, k) => look(P(-7.3, lerp(1.0, 1.05, k), lerp(19.4, 19.1, k)), P(-8.5, 2.2, -40), 54), sh: [-8, 12, 30] },
    { t0: 11.65, t1: 14.6, cam: (t, k) => look(P(-7.3, 1.05, 19.1), P(-8.5, lerp(2.2, 26, easeInOut(smooth(0, 0.7, k))), -40), 58), sh: [-8, 12, 30] },
    { t0: 14.6, t1: 17.0, cam: (t, k) => look(P(-8 + lerp(2.8, 2.4, k), 0.62 + 1.25, 16.6 + lerp(3.4, 3.0, k)), P(-8, 0.62 + 0.35, 16.6), 46), sh: [-8, 17, 12] },
    { t0: 17.0, t1: 19.6, cam: (t, k) => look(P(lerp(7.5, 7.0, k), 1.3, lerp(23, 22.4, k)), P(2.4, 1.0, 17.8), 48), sh: [2, 18, 14] },
    { t0: 19.6, t1: 22.2, cam: (t, k) => look(P(lerp(-4, -3, k), 3.2, lerp(34, 32, k)), P(0, 1.5, -40), 50), sh: [0, 14] },
    { t0: 22.2, t1: 24.6, cam: (t, k) => look(P(0, 1.4, 12), P(lerp(-3, -1, k), lerp(44, 40, k), -30), 56), sh: [0, 10] },
    { t0: 24.6, t1: 27.0, cam: (t, k) => look(P(5.2 + lerp(0.5, 0.42, k), 0.62 + 0.55 + 0.24, 15.0 + lerp(0.42, 0.36, k)), P(5.2, 0.62 + 0.55 + 0.06, 15.0), 40), sh: [5, 15, 4] },
    { t0: 27.0, t1: 29.4, cam: (t, k) => look(P(lerp(14, 13, k), 0.9, lerp(-4, -5, k)), P(-14, 0.0, -40), 50), sh: [0, -10, 40] },
    { t0: 29.4, t1: 34.0, cam: (t, k) => look(P(3.2 + lerp(1.7, 1.4, k), 0.62 + 1.55, 17.5 - lerp(1.9, 1.6, k)), P(3.2, 0.62 + 1.55, 17.5), 40), sh: [3, 17, 8] },
    { t0: 34.0, t1: 39.0, cam: (t, k) => look(P(lerp(-1, 1, k), lerp(4, 4.6, k), lerp(40, 38, k)), P(0, 2.5, -40), 50), sh: [0, 20] },
    { t0: 39.0, t1: 44.0, cam: (t, k) => look(P(lerp(1, 2, k), lerp(4.6, 5, k), lerp(38, 36, k)), P(0, lerp(2.5, 3, k), -40), 50), sh: [0, 20] },
    { t0: 44.0, t1: 47.5, cam: (t, k) => look(P(1.5, 1.6, 25), P(lerp(0, -4, k), lerp(20, 80, easeInOut(k)), -40), 58), sh: [0, 14] },
    { t0: 47.5, t1: DUR + 1, end: true },
  ];

  const endScene = new THREE.Scene(); endScene.background = new THREE.Color('#0d0e11');

  function frame(t, opts = {}) {
    const shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
    const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
    const ev = t >= T_V && t < T_R;
    const tau = tauOf(t);
    // air amount: drops instantly (12 frames ease for legibility), returns at T_R
    const air = t < T_V ? 1 : t < T_R ? 1 - smooth(T_V, T_V + 0.4, t) : smooth(T_R, T_R + 0.4, t);
    const sx = { tag: 'WHAT IF &nbsp;·&nbsp; 03', tagA: 1, labels: [] };
    // world time for waves/animals: slowed during the event
    const wt = t < T_V ? t : t < T_R ? T_V + (t - T_V) / SLOW : T_V + 5 + (t - T_R);
    sky.mat.uniforms.uAir.value = air;
    stars.material.opacity = 1 - air;
    hemi.intensity = lerp(0.07, 0.85, air);
    sun.color.set(air > 0.5 ? '#fff3dc' : '#ffffff'); sun.intensity = lerp(3.2, 2.7, air); R.renderer.toneMappingExposure = lerp(1.0, 0.9, air);
    fog.near = lerp(5000, 120, air); fog.far = lerp(9000, 2600, air);
    OU.uTime.value = wt; OU.uSkyAmt.value = air; OU.uSky.value.set('#8fc4f0'); OU.uNight.value = 0.5 * (1 - air);
    OU.uBoil.value = ev ? smooth(0.15, 1.2, tau) : t >= T_R ? 1 - smooth(T_R, T_R + 1.5, t) : 0;
    // gulls
    gulls.forEach((G, i) => {
      const flap = Math.sin(wt * 9 * G.sp / 2.5 + G.ph);
      let x = G.x0 + Math.sin(wt * 0.25 + G.ph) * 6, y = G.y0 + Math.sin(wt * 0.6 + G.ph) * 0.8, z = G.z0;
      if (t >= T_V) {
        const tt = Math.min(tau, 5); // free fall without lift
        y -= 4.9 * tt * tt; x += 0; G.g.rotation.set(0.3 + tt * 1.6, 0, tt * 0.9);
        const w = 0.2 + Math.sin(tt * 14 + G.ph) * 0.6; G.g.userData.wl.rotation.x = w; G.g.userData.wr.rotation.x = -w;
      } else { G.g.rotation.set(0, Math.PI / 2, 0); G.g.userData.wl.rotation.x = flap * 0.6; G.g.userData.wr.rotation.x = -flap * 0.6; }
      G.g.position.set(x, y, z);
    });
    // banner plane
    {
      let x = -34 + (wt - 9) * 20, y = 72, z = -45, pitch = 0;
      if (t >= T_V) { const tt = Math.min(tau, 5); y -= 4.9 * tt * tt; pitch = -0.08 * tt; }
      if (t >= T_R) { const s = t - T_R; y = 72 - 122.5 + Math.min(s, 3) * 4; pitch = 0.05; }
      plane.position.set(x, Math.max(y, 8), z); plane.rotation.set(0, 0, pitch);
    }
    // fire: flames only while there is oxygen
    {
      const fr = rng(55); const fx = fire.position;
      const on = air > 0.5 ? 1 : 0;
      for (let i = 0; i < flames.n; i++) {
        const ph = fr(), sp = 0.9 + fr() * 0.8, life = (wt * sp + ph) % 1, ox = (fr() - 0.5) * 0.5, oz = (fr() - 0.5) * 0.5;
        const y = 0.15 + life * (0.9 + fr() * 0.5); const s = (1 - life) * (0.35 + fr() * 0.3);
        flames.set(i, fx.x + ox * (1 - life), fx.y + y, fx.z + oz * (1 - life), s, on * (1 - life) * 0.75, 1.0, 0.45 + life * 0.3, 0.12, fr() * 6);
      }
      flames.commit();
      fire.userData.ember.material.color.set(air > 0.5 ? '#ff5a1f' : '#c83a10');
      const sr2 = rng(66);
      for (let i = 0; i < smoke.n; i++) {
        const ph = sr2(), life = (wt * 0.35 + ph) % 1; const y = 0.8 + life * 4;
        smoke.set(i, fx.x + Math.sin(life * 4 + i) * 0.3 * life, fx.y + y, fx.z, 0.4 + life * 1.6, 0.18 * (1 - life) * air, 0.55, 0.55, 0.55, sr2() * 6);
      }
      smoke.commit();
    }
    // drink boiling
    {
      const br = rng(77); const d = drink.position; const boil = ev ? smooth(0.0, 0.6, tau) : 0;
      for (let i = 0; i < bubbles.n; i++) {
        const ph = br(), sp = 1.5 + br() * 3, life = ((t - T_V) * sp / SLOW * 3 + ph) % 1;
        const a = br() * 6.28, rr = br() * 0.035;
        const up = boil > 0 ? life * (0.06 + boil * 0.12) : 0;
        bubbles.set(i, d.x + Math.cos(a) * rr, d.y + 0.03 + up, d.z + Math.sin(a) * rr, 0.002 + br() * 0.004 + boil * 0.003, boil * (1 - life) * 0.55, 1, 1, 1);
      }
      bubbles.commit();
      drink.userData.liquid.scale.y = 1 + boil * 0.35 * (0.8 + 0.2 * Math.sin(t * 20));
    }
    // vapor over the ocean
    {
      const vr = rng(88); const boil = OU.uBoil.value;
      for (let i = 0; i < vapor.n; i++) {
        const x = -60 + vr() * 120, z = -2 - vr() * 120, ph = vr(), life = ((wt - T_V) * 0.6 + ph) % 1;
        vapor.set(i, x, 0.2 + life * 3.5, z, 1.5 + vr() * 4 + life * 3, boil * 0.16 * (1 - life), 0.95, 0.96, 0.98, vr() * 6);
      }
      vapor.commit();
    }
    // exhaled breath flashes to fog in vacuum (hero, from 34.1 s)
    {
      const h = hero.position; const brr = rng(99); const s0 = t - 34.3;
      for (let i = 0; i < breath.n; i++) {
        const dl = brr() * 0.8, a = brr() * 6.28, sp = 0.6 + brr() * 1.2; const s = s0 - dl;
        if (!ev || s < 0) { breath.set(i, 0, -99, 0, 0, 0); continue; }
        const dist = s * sp * 0.35;
        breath.set(i, h.x - 0.12 - dist * 0.8, h.y + 1.6 + Math.sin(a) * dist * 0.4, h.z + 0.14 + Math.cos(a) * dist * 0.3, 0.05 + dist * 0.25, 0.4 * (1 - smooth(0.5, 2.5, s)), 0.95, 0.96, 1.0, a);
      }
      breath.commit();
    }
    // people: hands to ears from "ears pop"
    const ears = ev ? smooth(32.0, 32.8, t) : 0;
    hero.userData.arms[0].rotation.set(-ears * 2.6, 0, ears * 0.9); hero.userData.arms[1].rotation.set(-ears * 2.6, 0, -ears * 0.9);
    standers.forEach((p, i) => { const e = ev ? smooth(32.0 + i * 0.1, 33.0 + i * 0.1, t) : 0; p.userData.arms[0].rotation.set(-e * 2.5, 0, e * 0.8); p.userData.arms[1].rotation.set(-e * 2.5, 0, -e * 0.8); });
    jet.position.x = -400 + wt * 60;

    let scn = scene;
    if (shot.end) scn = endScene;
    else { shot.cam(t, k); const sh = shot.sh; setShadow(sh[0], sh[1], sh[2] || 40); }

    // HUD
    if (t < T_V) sx.hud = { a: smooth(3.3, 3.8, t), lab: 'Atmosphere vanishes in', val: timer(T_V - t), sub: 'Air pressure &nbsp;1,013 hPa', sub2: '' };
    else if (t < T_R) sx.hud = { a: 1, lab: 'Air returns in', val: timer(5 - tau), sub: `Time slowed down ${SLOW}×`, sub2: 'Air pressure &nbsp;0 hPa', valColor: '' };
    else if (t < 47.5) sx.hud = { a: 1, lab: 'Atmosphere', val: 'BACK', sub: 'Air pressure &nbsp;1,013 hPa', sub2: '' };
    if (t < 3.4) sx.title = { html: TITLE, a: Math.min(smooth(0.0, 0.35, t), 1 - smooth(3.0, 3.35, t)), k: smooth(0, 0.6, t) };
    const c = captionAt(CAPTIONS, t); if (c) sx.caption = c;
    if (t >= 47.5) { sx.end = { a: smooth(47.5, 47.85, t), title: TITLE, note: ENDNOTE }; sx.hud = null; }
    if (opts.cover) { sx.title = { html: TITLE, a: 1, k: 1 }; sx.caption = null; sx.hud = null; }

    R.bloom.strength = lerp(0.55, 0.28, air); R.bloom.radius = 0.5; R.bloom.threshold = lerp(0.82, 0.9, air);
    const G = R.grade.uniforms;
    G.uTime.value = t; G.uSat.value = lerp(0.9, 1.08, air); G.uTint.value.set(1.0, 1.0, 1.0); G.uVignette.value = lerp(0.6, 0.4, air); G.uAberr.value = 0.003;
    G.uFadeWhite.value = 0; G.uFade.value = 0; G.uShake.value.set(0, 0);
    R.renderPass.scene = scn; R.renderPass.camera = cam;
    R.composer.render();
    ov.apply(sx);
  }
  return { duration: DUR, fps: 30, frame, cues: { vanish: T_V, back: T_R } };
}
