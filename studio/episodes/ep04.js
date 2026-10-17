// EP 04 — What if you jumped into a hole through the Earth? (pole-to-pole vacuum tunnel, PREM density)
import * as THREE from 'three';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeIn, easeOut, project, W, H } from '../engine/core.js';
import { makeStars, Puffs, streakTex, makeGlobe, latLon, loadTex, makeSky, canvasTex } from '../engine/assets.js';
import { makeAstronaut } from '../engine/blackhole.js';

// fall table computed from PREM (see notes/facts.md)
const TC = 1144.0;               // seconds from surface to centre
const T_JUMP = 8.0;              // screen time of the jump
const T_CENTER = 30.0;           // screen time at the centre
const T_OUT = 41.6;              // screen time when you reach the far side
const DUR = 54.0;

const CAPTIONS = [
  [3.5, 5.6, 'A tunnel straight through the Earth.'],
  [5.7, 7.9, 'North Pole to South Pole. No air inside.'],
  [8.1, 10.2, 'You jump.'],
  [10.3, 12.9, "A minute later, you're through the crust."],
  [13.0, 15.9, 'Gravity keeps pulling. You keep speeding up.'],
  [16.0, 19.2, "The rock around you glows. You're weightless the whole time."],
  [19.3, 22.4, 'Strangely, gravity gets stronger as you go down.'],
  [22.6, 26.0, '12 minutes in: the liquid iron core. 4,000 °C.'],
  [26.2, 29.9, "19 minutes: the center. 5,400 °C. As hot as the Sun's surface."],
  [30.1, 33.0, 'You fly through at 35,700 km/h. Faster than the space station.'],
  [33.1, 36.4, 'Now gravity pulls you back. You start slowing down.'],
  [36.5, 40.5, '38 minutes after you jumped, you reach the other side…'],
  [40.7, 43.3, '…stop for a split second at the South Pole…'],
  [43.4, 46.5, '…and fall all the way back. Forever.'],
  [46.8, 49.7, 'A 76-minute round trip, with no way to stop.'],
];
const TITLE = 'What if you jumped into a <span class="k">hole</span> through the Earth?';
const ENDNOTE = 'Real density profile (PREM) · vacuum tunnel · heat-proof walls<br>surface to centre: 19 min · full trip: 38 min';

function mmss(sec) { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

// map screen time -> real seconds since the jump (0 .. 2*TC), with a hold near the far side
function realTime(t) {
  if (t < T_JUMP) return 0;
  if (t < T_CENTER) return TC * ((t - T_JUMP) / (T_CENTER - T_JUMP));
  if (t < T_OUT) return TC + TC * ((t - T_CENTER) / (T_OUT - T_CENTER));
  // at the far side: the last/first stretch near the rim is shown slowed down, then the fall back speeds up again
  const s = t - T_OUT;
  if (s < 4.2) return 2 * TC + (s - 1.8) * 6;      // apex 1.8 s after arrival on screen
  return 2 * TC + (4.2 - 1.8) * 6 + (s - 4.2) * 140;
}

export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  const fall = await (await fetch('/episodes/ep04_fall.json')).json();
  const depthAt = (rt0) => { // signed distance from centre in km (+ north); period 4*TC
    const rt = ((rt0 % (4 * TC)) + 4 * TC) % (4 * TC);
    const leg = Math.floor(rt / TC), u = rt - leg * TC;
    const tt = leg % 2 === 0 ? u : TC - u;            // time measured from the nearest surface
    const r = 6371 - interp(fall.t, fall.depth_km, tt);
    return leg === 0 || leg === 3 ? r : -r;
  };
  const speedAt = (rt0) => { const rt = ((rt0 % (4 * TC)) + 4 * TC) % (4 * TC); const leg = Math.floor(rt / TC), u = rt - leg * TC; return interp(fall.t, fall.v_ms, leg % 2 === 0 ? u : TC - u); };
  function interp(xs, ys, x) { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) { const k = (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[i - 1] + (ys[i] - ys[i - 1]) * k; } return ys[ys.length - 1]; }

  const [day, night, clouds] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false)]);

  // ---------------- cutaway Earth ----------------
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#000');
  scene.add(makeStars(5000, 900, 21));
  const globe = makeGlobe({ day, night, clouds }); scene.add(globe.group);
  // cut away the quadrant facing the camera (x>0, z>0) with two clipping planes on every globe material
  const cutA = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), cutB = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  globe.earthMat.uniforms.uCut.value = 1; globe.earthMat.side = THREE.DoubleSide; globe.cloudMat.side = THREE.FrontSide;
  globe.group.children.forEach((c) => { if (c.material && c.material.side === THREE.BackSide) c.visible = false; }); // halo off for the cutaway
  const layers = [ // radius fraction, colour (inner faces of the cut)
    [1.0, '#6b4f3a'], [0.995, '#8a5a36'], [0.9, '#b8542a'], [0.546, '#e88a1a'], [0.192, '#fff1b8'],
  ];
  const faceGroup = new THREE.Group(); scene.add(faceGroup);
  const mkFace = (rot) => {
    const g = new THREE.Group();
    layers.forEach(([rf, col], i) => {
      const ring = new THREE.Mesh(new THREE.CircleGeometry(rf * 0.999, 96, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -i, polygonOffsetUnits: -i }));
      g.add(ring);
    });
    g.rotation.copy(rot); return g;
  };
  // faces on planes x=0 (normal +x) and z=0 (normal +z), each a quarter disc in the cut quadrant (y in [-1,1])
  const faceZ = new THREE.Group(); // plane z=0: quarter discs for y>0 and y<0 with x>0
  for (const s of [1, -1]) { const f = mkFace(new THREE.Euler(0, 0, s > 0 ? 0 : -Math.PI / 2)); faceZ.add(f); }
  const faceX = new THREE.Group();
  for (const s of [1, -1]) { const f = mkFace(new THREE.Euler(0, -Math.PI / 2, s > 0 ? 0 : -Math.PI / 2)); faceX.add(f); }
  faceGroup.add(faceZ, faceX);
  // glow on the hot layers
  const coreGlow = new Puffs(1, { additive: true }); coreGlow.set(0, 0, 0, 0.0001, 0.6, 1.0, 0.7, 0.3); coreGlow.commit(); scene.add(coreGlow.mesh);
  // the tunnel (pole to pole) + marker
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 2.0, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' })); scene.add(tunnel);
  const marker = new Puffs(3, { additive: true, renderOrder: 10 }); scene.add(marker.mesh);
  const trail = new Puffs(120, { additive: true, renderOrder: 9 }); scene.add(trail.mesh);
  scene.add(new THREE.AmbientLight('#ffffff', 0.2));
  const gcam = new THREE.PerspectiveCamera(30, W / H, 0.01, 2000);

  // ---------------- inside the tunnel ----------------
  const tScene = new THREE.Scene(); tScene.background = new THREE.Color('#000');
  const tunMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uOff: { value: 0 }, uDepth: { value: 0 }, uSpeed: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uOff, uDepth, uSpeed; varying vec2 vUv; varying vec3 vP;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
      vec3 layerCol(float d){ // depth km -> rock colour & glow
        vec3 crust = vec3(0.33,0.25,0.19), mantleUp = vec3(0.45,0.20,0.10), mantleLo = vec3(0.85,0.30,0.08), outer = vec3(1.0,0.62,0.15), inner = vec3(1.0,0.95,0.75);
        vec3 c = mix(crust, mantleUp, smoothstep(20.0, 60.0, d));
        c = mix(c, mantleLo, smoothstep(400.0, 2800.0, d));
        c = mix(c, outer, smoothstep(2860.0, 2920.0, d));
        c = mix(c, inner, smoothstep(5120.0, 5180.0, d));
        return c;
      }
      void main(){
        float a = vUv.x * 6.2831853;
        float y = vP.y + uOff;
        float n = vn(vec2(a*3.0, y*0.6)) * 0.6 + vn(vec2(a*9.0, y*2.1)) * 0.4;
        float band = smoothstep(0.3, 0.7, vn(vec2(a*1.5, y*0.15)));
        vec3 c = layerCol(uDepth) * (0.55 + 0.6*n) * (0.8 + 0.3*band) * mix(1.0, 0.5, smoothstep(2000.0, 3000.0, uDepth));
        float glow = smoothstep(300.0, 2900.0, uDepth);
        c += layerCol(uDepth) * glow * 0.35 * (0.6 + 0.4*n);
        float streak = smoothstep(0.92, 1.0, vn(vec2(a*14.0, y*0.08))) * min(1.0, uSpeed/4000.0);
        c += vec3(1.0,0.8,0.6) * streak * 0.4;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 400, 48, 1, true), tunMat); tScene.add(tube);
  const astro = makeAstronaut(); tScene.add(astro);
  const key = new THREE.PointLight('#ffb070', 30, 30, 1.5); key.position.set(1, -3, 1); tScene.add(key);
  const fill = new THREE.AmbientLight('#556070', 0.6); tScene.add(fill);
  const sparks = new Puffs(300, { map: streakTex(), additive: true }); tScene.add(sparks.mesh);
  const tcam = new THREE.PerspectiveCamera(60, W / H, 0.05, 500);

  // surface (North Pole) scene for the jump
  const sScene = new THREE.Scene();
  sScene.fog = new THREE.Fog('#d6e2ee', 300, 3500);
  sScene.add(makeSky({ sunDir: new THREE.Vector3(-0.85, 0.12, -0.5), zenith: '#4f79ad', horizon: '#e9eef3', below: '#d6e2ee', sunCol: '#fff1dc', sunSize: 0.0009, glow: 0.8 }));
  const ice = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000, 120, 120), new THREE.MeshStandardMaterial({ color: '#e4ecf4', roughness: 0.75, flatShading: true, map: (() => { const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); const q = rng(5); for (let i = 0; i < 5000; i++) { const v = q(); g.fillStyle = `rgba(${190 + v * 50},${205 + v * 40},${225 + v * 30},.35)`; g.fillRect(q() * w, q() * h, 1 + q() * 3, 1 + q() * 2); } }, { repeat: true }); t.repeat.set(300, 300); return t; })() }));
  { const pa = ice.geometry.attributes.position; const q = rng(77); for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); if (Math.hypot(x, y) > 6) pa.setZ(i, (q() - 0.5) * 0.5 + Math.sin(x * 0.05) * 0.6); } ice.geometry.computeVertexNormals(); } ice.rotation.x = -Math.PI / 2; sScene.add(ice);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshBasicMaterial({ color: '#05070a' })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.02; sScene.add(hole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.18, 10, 48), new THREE.MeshStandardMaterial({ color: '#30353c', metalness: 0.6, roughness: 0.4 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.1; sScene.add(rim);
  const flag = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 8), new THREE.MeshStandardMaterial({ color: '#c0c4c8', metalness: 0.7, roughness: 0.3 })); pole.position.y = 1.5; flag.add(pole);
  const mkSign = (a, b) => { const c = document.createElement('canvas'); c.width = 512; c.height = 160; const g = c.getContext('2d'); g.fillStyle = '#ffb547'; g.fillRect(0, 0, 512, 160); g.fillStyle = '#121418'; g.font = 'bold 64px sans-serif'; g.fillText(a, 40, 78); g.font = '40px sans-serif'; g.fillText(b, 40, 135); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const signTex = mkSign('SOUTH POLE', '↓ 12,742 km'), signTex2 = mkSign('NORTH POLE', '↓ 12,742 km');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshStandardMaterial({ map: signTex, side: THREE.DoubleSide })); sign.position.set(0.82, 2.6, 0); sign.rotation.y = -0.3; flag.add(sign);
  flag.position.set(-3.2, 0, -1.0); sScene.add(flag);
  sScene.add(new THREE.HemisphereLight('#dbe8ff', '#b8c4d0', 1.2));
  const ssun = new THREE.DirectionalLight('#fff1dc', 2.2); ssun.position.set(-50, 9, -30); ssun.castShadow = true; ssun.shadow.mapSize.set(2048, 2048); Object.assign(ssun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 200 }); sScene.add(ssun);
  sScene.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; } });
  const jumper = makeAstronaut(); sScene.add(jumper);
  const scam = new THREE.PerspectiveCamera(50, W / H, 0.05, 3000);

  const endScene = new THREE.Scene(); endScene.background = new THREE.Color('#0d0e11');

  // ---------------- shots ----------------
  const shots = [
    { t0: 0, t1: 3.4, kind: 'globe', mode: 'title' },
    { t0: 3.4, t1: 8.0, kind: 'surface' },
    { t0: 8.0, t1: 10.2, kind: 'surface', jump: true },
    { t0: 10.2, t1: 16.0, kind: 'tunnel' },
    { t0: 16.0, t1: 19.2, kind: 'globe', mode: 'track' },
    { t0: 19.2, t1: 26.0, kind: 'tunnel' },
    { t0: 26.0, t1: 33.0, kind: 'globe', mode: 'track' },
    { t0: 33.0, t1: 36.4, kind: 'tunnel' },
    { t0: 36.4, t1: 40.6, kind: 'globe', mode: 'track' },
    { t0: 40.6, t1: 46.6, kind: 'surface', south: true },
    { t0: 46.6, t1: 50.0, kind: 'globe', mode: 'wide' },
    { t0: 50.0, t1: DUR + 1, kind: 'end' },
  ];

  function frame(t, opts = {}) {
    const shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
    const k = clamp((t - shot.t0) / (shot.t1 - shot.t0));
    const rt = realTime(t);
    const rkm = depthAt(rt); const depth = 6371 - Math.abs(rkm); const v = speedAt(rt);
    const st = { tag: 'WHAT IF &nbsp;·&nbsp; 04', tagA: 1, labels: [] };
    let scn, cam;

    if (shot.kind === 'globe') {
      scn = scene; cam = gcam;
      // slowly turning view of the cut quadrant
      const yaw = 0.78 + Math.sin(t * 0.05) * 0.1;
      const dist = shot.mode === 'title' ? lerp(9.4, 8.8, k) : shot.mode === 'wide' ? lerp(8.2, 8.8, k) : 8.0;
      const el = 0.32;
      gcam.position.set(Math.sin(yaw) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(yaw) * Math.cos(el) * dist);
      gcam.fov = 30; gcam.updateProjectionMatrix(); gcam.lookAt(0, shot.mode === 'title' ? -0.45 : -0.05, 0); gcam.updateMatrixWorld();
      globe.spin.rotation.y = 2.2; globe.cloudSpin.rotation.y = 2.2;
      globe.earthMat.uniforms.uSun.value.set(0.6, 0.4, 0.7).normalize(); globe.earthMat.uniforms.uSpec.value = 0.5;
      tunnel.scale.set(1, 1, 1); tunnel.material.color.set('#ffffff');
      const y = rkm / 6371;
      for (let i = 0; i < 3; i++) marker.set(i, 0, y, 0, [0.12, 0.05, 0.025][i], [0.35, 0.8, 1.0][i], 1.0, 0.75, 0.35);
      marker.commit();
      const tr = rng(2);
      for (let i = 0; i < trail.n; i++) { const back = i / trail.n * 0.25 * Math.sign(rkm || 1) * (rt < TC ? 1 : -1); trail.set(i, 0, y + back, 0, 0.012, (1 - i / trail.n) * 0.5 * (shot.mode === 'title' ? 0 : 1), 1.0, 0.7, 0.3); }
      trail.commit();
      R.renderer.localClippingEnabled = true;
      // labels for layers
      const lab = (yy, html, a = 1) => { const p = project(new THREE.Vector3(0.02, yy, 0.02), gcam); st.labels.push({ x: p.x + 26, y: p.y, a, html, cls: 'lbl-r' }); };
      const la = shot.mode === 'title' ? 0 : smooth(shot.t0 + 0.2, shot.t0 + 0.8, t);
      if (shot.mode !== 'title') {
        lab(0.985, 'CRUST', la * 0.9); lab(0.72, 'MANTLE', la * 0.9); lab(0.37, 'OUTER CORE', la * 0.9); lab(0.06, 'INNER CORE', la * 0.9);
        const mp = project(new THREE.Vector3(0, y, 0), gcam);
        st.labels.push({ x: mp.x - 30, y: mp.y, a: la, html: '<b>YOU</b>', cls: 'lbl', });
        st.labels[st.labels.length - 1].x = mp.x - 70;
      }
    } else if (shot.kind === 'surface') {
      scn = sScene; cam = scam;
      R.renderer.localClippingEnabled = false;
      const lt = t - 3.4;
      sign.material.map = shot.south ? signTex2 : signTex;
      if (shot.south) {
        const s = t - T_OUT; // 0 = arrival region; apex at 1.8 s
        const y = 1.1 - 1.9 * Math.pow((s - 1.8) / 1.8, 2) * (Math.abs(s - 1.8) < 1.8 ? 1 : 1) - (s > 3.6 ? (s - 3.6) * (s - 3.6) * 9 : 0);
        jumper.position.set(0, y - 0.6, 0); jumper.rotation.set(0, 0.6, 0);
        const ud = jumper.children[0].userData; ud.arms[0].rotation.set(0, 0, 2.5); ud.arms[1].rotation.set(0, 0, -2.5);
        scam.position.set(lerp(3.2, 2.9, k), lerp(1.6, 1.8, k), lerp(5.6, 5.0, k)); scam.lookAt(0, 0.7, 0);
      } else if (!shot.jump) {
        jumper.position.set(-0.4, 1.1, 2.9); jumper.rotation.set(0, Math.PI * 0.85, 0);
        scam.position.set(lerp(3.4, 3.0, k), lerp(1.3, 1.5, k), lerp(7.4, 6.6, k)); scam.lookAt(-0.6, 0.9, 1.2);
      } else {
        // step, hop, drop into the hole
        const s = t - T_JUMP;
        const x = lerp(-0.4, 0, smooth(0, 0.5, s)), z = lerp(2.9, 0, smooth(0, 0.6, s));
        const y = 1.1 + (s < 0.6 ? Math.sin(s / 0.6 * Math.PI) * 0.5 : -4.9 * (s - 0.6) * (s - 0.6) * 1.0);
        jumper.position.set(x, y, z); jumper.rotation.set(-0.3 * smooth(0.3, 0.9, s), Math.PI, 0);
        const ud = jumper.children[0].userData; ud.arms[0].rotation.z = 2.4 * smooth(0.4, 0.9, s); ud.arms[1].rotation.z = -2.4 * smooth(0.4, 0.9, s);
        scam.position.set(2.0, lerp(3.0, 4.6, smooth(0.3, 2.0, s)), lerp(4.5, 2.0, smooth(0.3, 2.0, s))); scam.lookAt(0, lerp(0.6, -2.0, smooth(0.5, 2.0, s)), 0);
      }
      if (!shot.south) st.labels.push({ x: W * 0.5, y: H * 0.205, a: smooth(3.6, 4.2, t) * (1 - smooth(7.6, 8.0, t)), html: 'NORTH POLE &nbsp;·&nbsp; 90° N' });
      else st.labels.push({ x: W * 0.5, y: H * 0.205, a: smooth(40.7, 41.2, t), html: 'SOUTH POLE &nbsp;·&nbsp; 90° S' });
    } else if (shot.kind === 'tunnel') {
      scn = tScene; cam = tcam;
      R.renderer.localClippingEnabled = false;
      const lt = t - shot.t0;
      // wall moves up past the camera at a rate tied to the real speed (compressed for readability)
      const visSpeed = 2 + Math.pow(v / 9900, 0.8) * 70;
      tunMat.uniforms.uOff.value = t * visSpeed; tunMat.uniforms.uDepth.value = depth; tunMat.uniforms.uSpeed.value = v;
      astro.position.set(0, 0, 0); astro.rotation.set(Math.PI + 0.3 + Math.sin(t * 0.4) * 0.1, t * 0.15, 0.15);
      const ud = astro.children[0].userData; ud.arms[0].rotation.set(-0.4, 0, 1.0); ud.arms[1].rotation.set(-0.3, 0, -1.1); ud.legs[0].rotation.set(0.25, 0, 0.15); ud.legs[1].rotation.set(-0.2, 0, -0.15);
      tcam.position.set(Math.sin(lt * 0.3) * 0.3 + 1.0, 2.6, 2.4); tcam.lookAt(0, -0.6, 0); tcam.fov = 62; tcam.updateProjectionMatrix();
      const glow = smooth(300, 2900, depth);
      key.color.setRGB(1, lerp(0.75, 0.55, glow), lerp(0.55, 0.25, glow)); key.intensity = 14 + glow * 22;
      const sr = rng(8);
      for (let i = 0; i < sparks.n; i++) {
        const a = sr() * 6.28, rr = 0.4 + sr() * 1.6, ph = sr(), sp = 0.6 + sr();
        const y = 8 - ((ph * 16 + t * visSpeed * 0.5 * sp) % 16);
        sparks.set(i, Math.cos(a) * rr, y, Math.sin(a) * rr, 0.02, 0.6 * glow * (0.3 + sr() * 0.7), 1.0, 0.65, 0.3, Math.PI / 2, 12 + visSpeed * 0.4);
      }
      sparks.commit();
    } else {
      scn = endScene; cam = gcam;
    }

    // HUD
    if (t < T_JUMP) {
      st.hud = { a: smooth(3.3, 3.8, t), lab: 'Jump in', val: `0:${String(Math.ceil(T_JUMP - t)).padStart(2, '0')}`, sub: 'Tunnel length &nbsp;12,742 km', sub2: '' };
    } else if (t < 50.0) {
      const left = Math.max(0, 2 * TC - rt);
      const sub2 = depth > 2891 && depth < 5150 ? 'Liquid iron core' : depth >= 5150 ? 'Solid iron core' : depth > 35 ? 'Mantle' : 'Crust';
      st.hud = { a: 1, lab: 'Other side in', val: `${mmss(left)}`, sub: `Speed &nbsp;${Math.round(v * 3.6).toLocaleString('en-US')} km/h`, sub2: `Depth ${Math.round(depth).toLocaleString('en-US')} km · ${sub2}` };
      if (rt >= 2 * TC) { st.hud.lab = 'Back at the North Pole in'; st.hud.val = mmss(4 * TC - rt); st.hud.sub2 = depth < 1 ? 'South Pole · speed 0' : st.hud.sub2; }
    }
    if (t < 3.4) st.title = { html: TITLE, a: Math.min(smooth(0.0, 0.35, t), 1 - smooth(3.0, 3.35, t)), k: smooth(0, 0.6, t) };
    const c = captionAt(CAPTIONS, t); if (c) st.caption = c;
    if (t >= 50.0) { st.end = { a: smooth(50.0, 50.35, t), title: TITLE, note: ENDNOTE }; st.hud = null; st.labels = []; }
    if (opts.cover) { st.title = { html: TITLE, a: 1, k: 1 }; st.caption = null; st.hud = null; st.labels = []; }

    R.bloom.strength = shot.kind === 'tunnel' ? 0.5 : 0.5; R.bloom.radius = 0.5; R.bloom.threshold = shot.kind === 'tunnel' ? 0.88 : 0.75;
    const G = R.grade.uniforms;
    G.uTime.value = t; G.uSat.value = 1.08; G.uTint.value.set(1.02, 1.0, 0.98); G.uVignette.value = 0.45; G.uAberr.value = 0.003; G.uFade.value = 0; G.uFadeWhite.value = 0; G.uShake.value.set(0, 0);
    if (shot.kind === 'tunnel') { const sr = rng(Math.floor(t * 30)); const kk = 0.0008 + smooth(300, 6000, depth) * 0.0015; G.uShake.value.set((sr() - 0.5) * kk, (sr() - 0.5) * kk); }
    R.renderPass.scene = scn; R.renderPass.camera = cam;
    R.composer.render();
    ov.apply(st);
  }
  return { duration: DUR, fps: 30, frame, cues: { jump: T_JUMP, center: T_CENTER, out: T_OUT } };
}
