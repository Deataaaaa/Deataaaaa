// « 12 % » Partie 2 · L'escalier (~125 s). 4:20 am, the fire is out and Inès climbs her six floors alone. On the 3rd the timer
// light goes out, slow steps follow her up, a text from an unknown number: « 6e, c'est ça ? » (she told the man her floor at
// 22:41). « ET SI… » she runs home: a hand stops her door. The real moves (checked in notes/facts.md): never lead someone to your
// door; make noise, knock, ring, wake the neighbours; if you can't speak, text the 114. Twist: the police search the stairs; on
// the 5th a door opens: the man lives right below her. « Bonne nuit, Inès. » She never told him her name.
// Every cut sits on the narration (audio/vo/ep21_*.json); every pose is rebuilt from rest each frame (a pure function of t).
import * as THREE from 'three';
import { createRenderer, rng, smooth, clamp, CamPath } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { fadeShadowBorders, Billboards, smokeAtlas, SIMPLEX } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, kneel, walk, climb, cloneAvatar, POSE } from '../engine/poses.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { makeCat } from '../engine/cat.js';
import { makePhone } from '../engine/props16.js';
import { makeEndTag } from '../engine/endtag.js';
import { buildWorld12 } from '../engine/world12.js';
import { LV, STREET, HERO_BAY, FIRE_BAY } from '../engine/paris12.js';
import { ROOM, STAIR } from '../engine/room12.js';
import { updateBeacons, pulse } from '../engine/trucks12.js';
import { makePoliceCar } from '../engine/police12.js';
import { Overlay12, fmtClock } from '../engine/s12.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(new THREE.Vector3());
const K = STREET.KERB, S_ = STAIR;
const lerp = (a, b, k) => a + (b - a) * k;
const [LV1, LV2, LV3, LV4, LV5, LV6] = [LV[1], LV[2], LV[3], LV[4], LV[5], LV[6]];

// a straight flight of the stairwell, for climb(): A rises toward +z from the half landing to floor f, B toward -z from floor
// f - 1 to the half landing (makeStairwellFull: tread j's top is base + 0.02 + j * rise)
const FL = (f, w) => { const yt = LV[f], yb = LV[f - 1], yh = (yt + yb) / 2, rise = (yt - yh) / 10;
  return w === 'A' ? { p0: V(7.0, yh, S_.ZH), dir: V(0, 0, 1), base: yh, rise, run: S_.RUN, n: 10 } : { p0: V(5.5, yb, S_.ZC), dir: V(0, 0, -1), base: yb, rise, run: S_.RUN, n: 10 }; };
// the right hand on the well-side rail, a little ahead of the body
const railArm = (F, a) => (sh, fwd, left, up) => {
  const x = F.dir.z > 0 ? S_.XA0 + 0.03 : S_.XB1 - 0.03, aa = a + 0.32;
  const hand = V(x, F.base + 0.92 + clamp(aa / (F.n * F.run)) * F.n * F.rise + 0.045, F.p0.z + F.dir.z * aa);
  return { hand, pole: sh.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.6), F: F.dir.clone(), N: V(0, -1, 0), curl: 0.55 };
};
// an eased walk along a flight that ends with both feet planted (a stride phase of k + 0.5)
const easeTo = (k, a0, a1) => a0 + (a1 - a0) * (1 - Math.pow(1 - clamp(k), 2));

export async function create() {
  const q = new URLSearchParams(location.search);
  const DBG = q.get('dbg') === '1';
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = 0;
  POSE.lookFirst = true;                                           // heads turn before the arm IK (hands land on their targets)
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer();
  const VO = await (await fetch(`/audio/vo/ep21_${q.get('voice') || 'developpeuse'}.json`)).json();
  const ov = new Overlay12(VO, { etsiSub: 'ELLE COURAIT' });
  const W = buildWorld12(R.renderer, { stairFull: true });
  const scene = W.scene, room = W.room, ST = W.stair;
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.03, 400);
  R.renderPass.scene = scene; R.renderPass.camera = cam;
  R.bloom.strength = 0.42; R.bloom.radius = 0.55;
  const G = R.grade.uniforms;

  // ---------- the timeline, read from the narration ----------
  const Ln = VO.lines, L = (i) => Ln[i].t0;
  const Lw = (i, w) => { const u = Ln[i].units.find((x) => x.shown.toLowerCase().startsWith(w.toLowerCase())); return u ? u.t0 : Ln[i].t0; };
  const END0 = Ln[Ln.length - 1].t0 - 0.25, DUR = Math.ceil((VO.duration + 4.4) * 10) / 10;
  const cut = (x) => x - 0.08;
  const SH = [
    ['hook', 0], ['face', cut(L(1))], ['street', cut(L(2))], ['phone3', cut(L(3))], ['crowd', cut(L(4))], ['empty', cut(L(5))],
    ['police', cut(L(6))], ['enter', cut(L(7))], ['timer', cut(L(8))], ['climb1', cut(L(9))], ['off', cut(L(10))], ['torch', cut(L(11))],
    ['slam', cut(L(12))], ['hand', cut(L(13))], ['stop', cut(L(14))], ['stopH', cut(Lw(14, 'Les'))], ['go', cut(L(15))], ['goH', cut(Lw(15, 'Les'))],
    ['sms', cut(L(16))], ['flash', cut(L(18))], ['etsi', cut(L(19))], ['run', cut(L(20))], ['runH', cut(Lw(20, 'Derrière'))],
    ['keys', cut(L(21))], ['grope', cut(Lw(21, 'Elle'))], ['lock', cut(L(22))], ['block', cut(L(23))], ['dark', cut(L(24))], ['stat', cut(L(25))],
    ['rewind', cut(L(26))], ['stay', cut(L(27))], ['knock', cut(L(28))], ['bell', cut(Lw(28, 'sonne')) - 0.3], ['noise', cut(L(29))],
    ['neigh', cut(L(30))], ['inside', cut(L(31))], ['sms114', cut(L(32))], ['info114', cut(L(33))], ['cops', cut(L(34))], ['search', cut(L(35))],
    ['door5', cut(L(36))], ['him', cut(L(37))], ['facade', cut(L(38))], ['night', cut(L(39))], ['name', cut(L(40))], ['end', END0],
  ].map(([id, t0], i, a) => ({ id, t0, t1: a[i + 1] ? a[i + 1][1] : DUR }));
  const S = Object.fromEntries(SH.map((s) => [s.id, s]));
  const shotAt = (t) => { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; };
  const ETSI = (t) => t >= S.etsi.t0 && t < S.stay.t0;          // the « ET SI » branch (the rewind included)
  // story clock (minutes after midnight) and battery
  const clockAt = (t) => { if (t >= S.flash.t0 && t < S.etsi.t0) return 22 * 60 + 41;
    if (t < S.face.t0) return 4 * 60 + 22;
    const keys = [[S.street.t0, 260], [S.timer.t0, 261], [S.off.t0, 262], [S.etsi.t0, 263], [S.knock.t0, 264], [S.sms114.t0, 265], [S.cops.t0, 266], [S.door5.t0, 267]];
    let m = 260; for (const [t0, v] of keys) if (t >= t0) m = v; return m; };
  const batAt = (t) => { if (t >= S.flash.t0 && t < S.etsi.t0) return 34; if (t >= S.cops.t0) return 1; if (t >= Lw(32, 'Son')) return 2; return 3; };

  // ---------- people ----------
  const env = scene.environment;
  const ines = await loadAvatar('Female_Adult_11', { env, facial: true }); scene.add(ines.root);
  const man = await loadAvatar('Male_Adult_07', { env }); scene.add(man.root);
  man.meshes.forEach((m) => { [m.material].flat().forEach((x) => { if (x.name && /body|cloth|torso/i.test(x.name) && x.color) x.color.multiplyScalar(0.55); }); });
  const cop1 = await loadAvatar('Police_Male_03', { env, lod: 512 }); scene.add(cop1.root);
  const cop2 = await loadAvatar('Police_Male_06', { env, lod: 512 }); scene.add(cop2.root);
  const neigh = await loadAvatar('Male_Adult_14', { env }); scene.add(neigh.root);
  const fire0 = await loadAvatar('Fire_Male_01', { env, lod: 512 });
  const firemen = [fire0, cloneAvatar(fire0, skClone)]; firemen.forEach((f) => scene.add(f.root));
  const CROWD = ['Female_Adult_02', 'Male_Adult_01', 'Female_Adult_09', 'Male_Adult_16', 'Female_Adult_12', 'Male_Adult_18'];
  const crowd = []; for (const n of CROWD) { const a = await loadAvatar(n, { env, lod: 512 }); scene.add(a.root); crowd.push(a); }
  const cr = rng(2121);
  const crowdPos = crowd.map((_, i) => ({ p: V(-4.6 + i * 1.3 + (cr() - 0.5) * 0.4, K, 11.0 + (cr() - 0.5) * 0.8), cache: {} }));
  crowdPos[5].p.set(3.7, K, 12.3);                                  // clear of Inès (2.45, 11.3) in the crowd shot
  const MAN_P = V(7.6, K, 11.5);                                  // where he stood in Part 1
  const everyone = [ines, man, cop1, cop2, neigh, ...firemen, ...crowd];
  const hideAll = () => { for (const a of everyone) a.root.visible = false; };
  const apple = makeCat(); scene.add(apple.root);
  const police = makePoliceCar(rng(5)); police.group.position.set(4.3, 0, 3.75); scene.add(police.group);

  // her phone: torch (a spot light out of its back) + its screen; the officers' torches
  const phone = makePhone(); scene.add(phone);
  const torch = new THREE.SpotLight('#eef3ff', 0, 12, 0.5, 0.5, 2); torch.position.set(-0.02, 0.06, -0.006); torch.castShadow = true; torch.shadow.mapSize.set(1024, 1024);
  torch.shadow.bias = -0.0006; torch.shadow.camera.near = 0.05; phone.add(torch); const tT = new THREE.Object3D(); tT.position.set(-0.02, 0.06, -1); phone.add(tT); torch.target = tT;
  const screenGlow = new THREE.PointLight('#cfe0ff', 0, 1.6, 2); screenGlow.position.set(0, 0, 0.22); phone.add(screenGlow);
  const beamMat = (k) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uI: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vA; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vA = clamp(-position.y / 6.0 + 0.5, 0.0, 1.0); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uI, uTime; varying vec3 vN; varying vec3 vV; varying float vA; varying vec3 vW; ${SIMPLEX}
      void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float n = 0.65 + 0.35 * snoise(vW * 1.7 + vec3(0.0, uTime * 0.25, ${k.toFixed(1)}));
        float cf = smoothstep(0.4, 1.8, distance(cameraPosition, vW));
        gl_FragColor = vec4(vec3(0.75, 0.82, 1.0) * uI * f * n * cf * pow(max(1.0 - vA, 0.0), 1.3), 1.0); }` });
  const beams = [];
  const addBeam = (parent, k, r = 2.2) => { const m = beamMat(k); const b = new THREE.Mesh(new THREE.ConeGeometry(r, 6, 40, 1, true), m); b.rotation.x = -Math.PI / 2; b.position.set(-0.02, 0.06, -3.0); b.renderOrder = 8; parent.add(b); beams.push(m); return m; };
  const beamP = addBeam(phone, 0);
  const flashlight = (k) => {
    const g = new THREE.Group(); scene.add(g);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.2, 14), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.6 })); body.rotation.x = Math.PI / 2; g.add(body);
    const sp = new THREE.SpotLight('#f4f7ff', 0, 16, 0.32, 0.45, 2); sp.position.set(0, 0, -0.11); const tg = new THREE.Object3D(); tg.position.set(0, 0, -1); g.add(sp, tg); sp.target = tg;
    const b = addBeam(g, k, 1.4); return { g, sp, beam: b };
  };
  const fl1 = flashlight(3), fl2 = flashlight(7);
  const drawPhone = (mode, t, p = 1) => {
    const cv = phone.tex.image, c = cv.getContext('2d'), Wc = cv.width, Hc = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#05060a'; c.fillRect(0, 0, Wc, Hc);
    const bat = batAt(t), clk = fmtClock(clockAt(t));
    c.fillStyle = '#fff'; c.font = '600 30px Inter, Arial'; c.textAlign = 'left'; c.fillText(clk, 40, 58);
    c.textAlign = 'right'; c.fillStyle = bat <= 5 ? '#ff453a' : '#fff'; c.fillText(`${bat} %`, Wc - 40, 58);
    if (mode === 'lock' || mode === 'msg') {
      c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = '200 150px Inter, Arial'; c.fillText(clk, Wc / 2, 290);
      c.font = '500 34px Inter, Arial'; c.fillStyle = bat <= 5 ? '#ff453a' : '#c9c9ce'; c.fillText(`Batterie faible · ${bat} %`, Wc / 2, 350);
      if (mode === 'msg') {
        c.fillStyle = 'rgba(40,40,46,.94)'; c.beginPath(); c.roundRect(30, 420, Wc - 60, 210, 34); c.fill();
        c.textAlign = 'left'; c.fillStyle = '#9a9aa2'; c.font = '600 24px Inter, Arial'; c.fillText('MESSAGES · maintenant', 64, 470);
        c.fillStyle = '#fff'; c.font = '700 32px Inter, Arial'; c.fillText('Numéro inconnu', 64, 520);
        c.font = '500 36px Inter, Arial'; c.fillText('6e, c’est ça ?', 64, 582);
      }
    } else if (mode === 'sms114') {
      c.fillStyle = '#16161a'; c.fillRect(0, 80, Wc, 110); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '700 40px Inter, Arial'; c.fillText('114', Wc / 2, 150);
      const msg = 'Je suis suivie dans l’escalier de mon immeuble. Inès M., 6e étage, Paris 18e. Je ne peux pas parler.';
      const shown = msg.slice(0, Math.round(msg.length * clamp(p)));
      const wrap = (txt, x, y, w, lh) => { const words = txt.split(' '); let line = '', yy = y; for (const wd of words) { const tt = line ? line + ' ' + wd : wd; if (c.measureText(tt).width > w && line) { c.fillText(line, x, yy); line = wd; yy += lh; } else line = tt; } if (line) c.fillText(line, x, yy); return yy; };
      c.font = '500 32px Inter, Arial'; c.textAlign = 'left';
      if (shown.length) { c.fillStyle = '#2f7cf6'; c.beginPath(); c.roundRect(110, 240, Wc - 150, 300, 30); c.fill(); c.fillStyle = '#fff'; wrap(shown, 134, 290, Wc - 200, 44); }
      if (p >= 1.2) { c.fillStyle = '#3a3a40'; c.beginPath(); c.roundRect(40, 580, Wc - 150, 210, 30); c.fill(); c.fillStyle = '#fff'; wrap('Message reçu. La police est prévenue. Restez à l’abri.', 64, 630, Wc - 200, 44); }
      c.fillStyle = '#1c1c22'; c.fillRect(0, Hc - 330, Wc, 330); c.fillStyle = 'rgba(255,255,255,.12)';
      for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { c.beginPath(); c.roundRect(28 + i * ((Wc - 56) / 9) + 4, Hc - 300 + r * 92, (Wc - 56) / 9 - 8, 74, 10); c.fill(); }
    } else { c.fillStyle = '#0a0b10'; c.fillRect(0, 80, Wc, Hc); c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '500 26px Inter, Arial'; c.fillText('Lampe torche', Wc / 2, Hc - 120); }
    phone.tex.needsUpdate = true;
  };
  // the phone in a hand, resting on the nearly straight fingers: its plane follows the knuckle-to-last-joint line of the index,
  // middle and ring fingers (the rest pose keeps the fingers flexed ~25 degrees off the palm), its back PHZ above that line
  const tA = V(0, 0, 0), tB = V(0, 0, 0), mB = new THREE.Matrix4(), PHZ = 0.0175;
  const avgJ = (B, side, j) => tB.copy(wp(B[side + 'HandIndex' + j])).add(wp(B[side + 'HandMiddle' + j])).add(wp(B[side + 'HandRing' + j])).multiplyScalar(1 / 3).clone();
  function phoneFit(av, side = 'Right') {
    const B = av.bones, k1 = avgJ(B, side, 1), k3 = avgJ(B, side, 3), i1 = wp(B[side + 'HandIndex1']), p1 = wp(B[side + 'HandPinky1']);
    const X = k1.clone().sub(k3).normalize();                                    // from the finger tips toward the knuckles
    const Z = X.clone().cross(tA.copy(i1).sub(p1)).normalize(); if (side === 'Left') Z.negate();
    const Yv = Z.clone().cross(X).normalize();
    mB.makeBasis(side === 'Left' ? X.clone().negate() : X, side === 'Left' ? Yv.clone().negate() : Yv, Z); phone.quaternion.setFromRotationMatrix(mB); phone.userData.side = side;
    phone.position.copy(k1).lerp(k3, 0.55).addScaledVector(Z, PHZ).addScaledVector(Yv, side === 'Left' ? -0.004 : 0.004); phone.updateMatrixWorld(true);
  }
  // a flashlight in a hand: along the fingers' line from the fist, pointing at `aim`
  function lightFit(av, f, aim) { const B = av.bones, hd = wp(B.RightHand), m1 = wp(B.RightHandMiddle1); f.g.position.copy(m1).lerp(hd, -0.2); f.g.lookAt(aim); f.g.rotateY(Math.PI); f.g.updateMatrixWorld(true); }

  // the keys: a ring with two keys
  const keys = new THREE.Group(); scene.add(keys);
  { const steel = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.25, metalness: 1 }), brass = new THREE.MeshStandardMaterial({ color: '#c49a4a', roughness: 0.3, metalness: 1 });
    keys.add(new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0016, 8, 24), steel));
    for (const [i, m] of [[0, steel], [1, brass]].map(([i, m]) => [i, m])) { const k = new THREE.Group(); const head = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.003, 18), m); head.rotation.x = Math.PI / 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.042, 0.0025), m); blade.position.y = -0.03; k.add(head, blade); k.position.set(0.012 * (i ? 1 : -1), -0.02, 0); k.rotation.z = (i ? -0.5 : 0.4); keys.add(k); } }
  // the landing side of her door (room12 only dressed the room side): an escutcheon with the keyhole under the deadbolt, a fixed knob;
  // `keyIn`: her key in the lock (its head turns), the ring and a second key hanging from it. All door-local, so they swing with the door
  const DW = ROOM.DX1 - ROOM.DX0, KH = V(-DW + 0.08, 1.235, 0.0015);
  const brass2 = new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.32, metalness: 0.9 });
  { const esc = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.006, 24), brass2); esc.rotation.x = Math.PI / 2; esc.position.set(KH.x, 1.24, 0.0045);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.002), new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.9 })); slot.position.set(KH.x, KH.y, 0.0005);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.01, 20), brass2); rose.rotation.x = Math.PI / 2; rose.position.set(-DW + 0.09, 1.02, 0.003);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), brass2); kn.position.set(-DW + 0.09, 1.02, -0.025); room.door.add(esc, slot, rose, kn); }
  const keyIn = new THREE.Group(); keyIn.position.copy(KH); keyIn.visible = false; room.door.add(keyIn);
  const keyTurn = new THREE.Group(); keyIn.add(keyTurn);
  { const steel = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.25, metalness: 1 });
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.003, 20), steel); head.rotation.z = Math.PI / 2; head.position.z = -0.026;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.006, 0.016), steel); neck.position.z = -0.008; keyTurn.add(head, neck);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0016, 8, 24), steel); ring.rotation.y = Math.PI / 2; ring.position.set(0, -0.02, -0.028);
    const k2 = new THREE.Group(); k2.position.set(0, -0.033, -0.028);
    const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.003, 18), brass2); h2.rotation.z = Math.PI / 2; h2.position.y = -0.01;
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.042, 0.006), brass2); b2.position.y = -0.04; k2.add(h2, b2); keyIn.add(ring, k2); }
  // doorbells and the light under the 3rd-floor doors (neighbours waking up)
  const bellMat = new THREE.MeshStandardMaterial({ color: '#e8e2d4', roughness: 0.4, emissive: '#ffcf8a', emissiveIntensity: 0 });
  const plateMat = new THREE.MeshStandardMaterial({ color: '#b9a77a', roughness: 0.35, metalness: 0.85 }), ringMat = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.5, metalness: 0.3 });
  const labelMat = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 80; const c = cv.getContext('2d'); c.fillStyle = '#efe8d6'; c.fillRect(0, 0, 256, 80);
    c.fillStyle = '#1b1b1b'; c.font = '600 44px Inter, Arial'; c.textAlign = 'center'; c.fillText('LEROY', 128, 56); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6 }); })();
  // a plate on the wall plane at p, facing +z (nz 1) or -z (nz -1); the button sits 18 mm under its centre
  const makeBell = (p, nz) => { const g = new THREE.Group(); g.position.copy(p); g.rotation.y = nz > 0 ? 0 : Math.PI; scene.add(g);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.1, 0.008), plateMat); plate.position.z = 0.004;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.004, 24), ringMat); ring.rotation.x = Math.PI / 2; ring.position.set(0, -0.018, 0.01);
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.006, 24), bellMat); btn.rotation.x = Math.PI / 2; btn.position.set(0, -0.018, 0.012);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.048, 0.015), labelMat); lab.position.set(0, 0.024, 0.0085); g.add(plate, ring, btn, lab); return g; };
  const BELL = V(7.35, LV3 + 1.42, S_.ZW), BELLR = 0.17; makeBell(BELL, -1); makeBell(V(3.0, LV3 + 1.42, S_.ZC), 1);
  const underMat = new THREE.MeshBasicMaterial({ color: '#ffcf94', transparent: true, opacity: 0 });
  for (const [x, z, w] of [[2.5, S_.ZC + 0.06, 0.8], [(ROOM.DX0 + ROOM.DX1) / 2, S_.ZW - 0.06, 0.78]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.012), underMat); m.position.set(x, LV3 + 0.008, z); m.rotation.x = -Math.PI / 2; scene.add(m); }
  const groundGlow = new THREE.PointLight('#ffd09a', 0, 10, 2); groundGlow.position.set(5.6, 1.6, -5.1); scene.add(groundGlow);
  const fill = new THREE.PointLight('#a9b9d8', 0, 5, 2); scene.add(fill);                 // a soft bounce near the lens, set per shot
  const cold = new THREE.PointLight('#7f95c8', 0, 7, 2); scene.add(cold);                 // the night through the stairwell, for the dark shots
  const fireLight = new THREE.PointLight('#ff8a3a', 0, 10, 2); fireLight.position.set(FIRE_BAY, LV2 + 1.2, -1.0); scene.add(fireLight);
  const beaconLights = [V(-0.5 + 4.5, 2.8, 6.1), V(-0.5 - 4.6, 2.5, 7.3), V(-11.5 + 3.6, 2.8, 6.3)].map((p) => { const l = new THREE.PointLight('#3a66ff', 0, 30, 2); l.position.copy(p); scene.add(l); return l; });

  // smoke: the haze left on the 2nd floor, wisps still leaving the burnt flat's window
  const haze = new Billboards(24, { map: smokeAtlas(12, 1.2), additive: false, lit: true, minPx: 1.6, near: 0.3, nearK: 1, renderOrder: 4 }); scene.add(haze.mesh);
  const wisps = new Billboards(60, { map: smokeAtlas(5, 1.2), additive: false, lit: true, minPx: 1.6, near: 0.6, renderOrder: 4 }); scene.add(wisps.mesh);
  for (const bb of [haze, wisps]) { bb.u.uShadeCol.value.set(0.06, 0.06, 0.065); bb.u.uLitCol.value.set(0.3, 0.28, 0.26); }
  const rh = rng(31);
  const HZ = Array.from({ length: 24 }, (_, i) => ({ x: 2.0 + rh() * 5.4, y: 0.9 + rh() * 1.5, z: -4.6 - rh() * 1.0 - (i % 3 === 0 ? rh() * 2.2 : 0), s: 0.9 + rh() * 1.2, r: rh() * 6.28, ph: rh() * 6.28 }));
  const WS = Array.from({ length: 60 }, (_, i) => ({ b: i * 0.45, x: (rh() - 0.5) * 0.8, life: 14 + rh() * 6, vy: 0.5 + rh() * 0.3, s: 0.7 + rh() * 0.9, r: rh() * 6.28 }));
  function updateSmoke(t, hz, ws) {
    for (let i = 0; i < 24; i++) { if (!hz) { haze.hide(i); continue; } const c = HZ[i];
      haze.set(i, c.x + 0.15 * Math.sin(t * 0.21 + c.ph), LV2 + c.y + 0.05 * Math.sin(t * 0.3 + c.ph), c.z, c.s, c.s * 0.7, 0.5, 0.48, 0.45, 0.16 * hz, c.r + t * 0.03, i % 4); }
    haze.commit();
    for (let i = 0; i < 60; i++) { if (!ws) { wisps.hide(i); continue; } const c = WS[i], ag = ((t + 30 - c.b) % c.life + c.life) % c.life, k = ag / c.life;
      wisps.set(i, FIRE_BAY + c.x * (1 + ag * 0.3) + 0.15 * ag, LV2 + 2.2 + c.vy * ag, 0.25 + 0.12 * ag, c.s * (1 + ag * 0.4), c.s * (1 + ag * 0.4), 0.3, 0.29, 0.28, Math.min(1, ag / 1.5) * (1 - k) * 0.4 * ws, c.r + ag * 0.08, i % 4); }
    wisps.commit();
  }

  // ---------- the end card (a Paris street sign) + Apple peeking over "Abonne-toi pour la suite" ----------
  const endEl = document.getElementById('end');
  const sign = document.createElement('div');
  sign.style.cssText = 'position:absolute;left:50%;top:640px;transform:translateX(-50%);background:#22397a;border:8px solid #2e6b4a;outline:5px solid #e8e6df;border-radius:16px;padding:30px 60px;text-align:center;min-width:640px;font-family:Inter,sans-serif;color:#fff';
  sign.innerHTML = `<div style="display:inline-block;background:#ff2e2e;font-weight:800;font-size:30px;padding:6px 14px;border-radius:8px;letter-spacing:.06em">12 %</div>
    <div style="font-weight:800;font-size:46px;margin-top:18px;letter-spacing:.03em">PARTIE 3</div><div style="font-weight:800;font-size:80px;line-height:1;margin-top:6px">LE 5<sup style="font-size:.5em">E</sup></div>`;
  const ask = document.createElement('div');
  ask.style.cssText = 'position:absolute;left:0;right:0;top:330px;text-align:center;font:800 70px/1.08 Inter,sans-serif;color:#fff;text-transform:uppercase;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  ask.innerHTML = 'Et vous,<br>vous auriez <span style="color:#ff2e2e">couru</span> ?';
  const fine = document.createElement('div');
  fine.style.cssText = 'position:absolute;left:60px;right:60px;top:1000px;text-align:center;font:500 29px Inter,sans-serif;color:rgba(255,255,255,.8);line-height:1.45';
  fine.innerHTML = 'Fiction. Conseils vérifiés : gendarmerie, justice.fr (114), Ville de Paris.<br>Voix : Kyutai TTS (CC BY 4.0).';
  endEl.querySelector('.t').innerHTML = ''; endEl.querySelector('.n').innerHTML = '';
  endEl.appendChild(ask); endEl.appendChild(sign); endEl.appendChild(fine);
  const tag = makeEndTag({ text: 'Abonne-toi pour la suite', ssaa: globalThis.SSAA });

  await Promise.all(TEX_PENDING);
  // the stock firefighter texture prints a surname (« ARMSTRONG ») across the back and on the chest tag: paint both out
  { const done = new Set();
    for (const f of firemen) f.root.traverse((o) => { for (const mt of [o.material].flat()) {
      const tx = mt && mt.map, img = tx && tx.image; if (!img || done.has(tx) || !/m138_body_color/.test(img.src || '')) continue; done.add(tx);
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
      const u = img.width / 2048, qq = (x) => Math.round(x * u);
      c.drawImage(img, qq(916), qq(414), qq(220), qq(54), qq(916), qq(468), qq(220), qq(54));
      const d = c.getImageData(qq(824), qq(1002), qq(88), qq(26)), a = d.data; let n = 0, m = [0, 0, 0];
      for (let i = 0; i < a.length; i += 4) if (a[i] + a[i + 1] + a[i + 2] < 210) { m[0] += a[i]; m[1] += a[i + 1]; m[2] += a[i + 2]; n++; }
      for (let i = 0; i < a.length; i += 4) if (a[i] + a[i + 1] + a[i + 2] >= 210) { a[i] = m[0] / n; a[i + 1] = m[1] / n; a[i + 2] = m[2] / n; }
      c.putImageData(d, qq(824), qq(1002));
      tx.image = cv; tx.needsUpdate = true; } });
  }

  // ---------- poses ----------
  const BL = [5.6, 9.1, 13.4, 22.8, 27.5, 33.2, 38.6, 47.3, 55.9, 63.1, 70.4, 76.2, 84.5, 91.8, 99.6, 108.2, 115.4];
  const blinkK = (t) => { let k = 0; for (const b0 of BL) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  let curT = 0;
  const show = (av, fn) => { av.root.visible = true; fn(); if (av === ines) ines.blink(blinkK(curT)); av.root.updateMatrixWorld(true); };
  // the index finger's tip (the distal phalanx is ~21 mm past its last joint)
  const tipOf = (av, sd) => { const a = wp(av.bones[sd + 'HandIndex2']), b = wp(av.bones[sd + 'HandIndex3']); return b.clone().addScaledVector(b.clone().sub(a).normalize(), 0.021); };
  // pose twice: the second time the wrist moves so that a point of the hand (`probe`, the index tip by default) lands on `tgt`;
  // orientHand keeps the hand's world orientation, so the probe's offset from the wrist is the same in both passes
  const pressPose = (av, side, tgt, pose, spec, probe = () => tipOf(av, side)) => {
    pose(spec); const want = tgt.clone().sub(probe().sub(wp(av.bones[side + 'Hand']))), res = [];
    // the arm IK lands a few cm off a target its first guess did not start from: correct by the probe's residual (4 rounds, < 1 mm)
    for (let i = 0; i < 4; i++) {
      pose((sh, fwd, left, up) => ({ ...spec(sh, fwd, left, up), hand: want }));
      const r = tgt.clone().sub(probe()); res.push((r.length() * 100).toFixed(1)); if (i < 3) want.add(r);
    }
    if (DBG) console.log(`DBG press ${side} residuals ${res.join(' -> ')} cm`);
    return want;
  };

  // the torch held low in the right hand, its back pointing at `aimAt`, the screen toward her
  const torchHand = (aimAt, s = 1) => (sh, fwd, left, up) => {
    const hand = sh.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.28).addScaledVector(left, 0.08 * s);
    const back = aimAt.clone().sub(hand).normalize(), N = back.clone().negate();
    const F = up.clone().addScaledVector(back, -up.dot(back)).normalize();
    return { hand, pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5 * s).addScaledVector(fwd, -0.2), F, N, curl: 0.08, pk: -0.2 };
  };
  const phoneUp = (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.24).addScaledVector(left, 0.14), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.6),
    F: up.clone().addScaledVector(fwd, 0.45).normalize(), N: up.clone().addScaledVector(fwd, -1).normalize(), curl: 0.08, pk: -0.2 });
  const flashArm = (aim) => (sh, fwd, left, up) => { const hand = sh.clone().addScaledVector(fwd, 0.36).addScaledVector(up, -0.12).addScaledVector(left, 0.05);
    return { hand, pole: sh.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: aim.clone().sub(hand).normalize(), N: left.clone().negate(), curl: 0.85 }; };

  // ---------- cameras ----------
  const P2 = (s, a, b, ta, tb, fa, fb = fa) => new CamPath([[s.t0, a, ta, fa], [s.t1, b, tb, fb]], { easeIn: false, easeOut: false, arc: true });
  const CAM = {
    hook: P2(S.hook, V(7.02, LV3 + 1.5, -5.62), V(7.0, LV3 + 1.46, -5.72), V(7.0, LV3 - 0.75, -7.7), V(7.0, LV3 - 0.6, -7.5), 56, 52),
    face: P2(S.face, V(6.96, LV3 + 1.5, -6.28), V(6.97, LV3 + 1.5, -6.18), V(7.0, LV3 + 1.56, -5.45), V(7.0, LV3 + 1.56, -5.45), 38, 34),
    street: P2(S.street, V(1.5, 1.7, 12.1), V(1.3, 1.75, 11.8), V(0.5, 7.5, 0), V(0.3, 8.8, 0), 58, 54),
    crowd: P2(S.crowd, V(1.6, 1.62, 9.6), V(1.68, 1.62, 9.75), V(2.45, 1.56, 11.3), V(2.45, 1.56, 11.3), 40, 36),
    empty: P2(S.empty, V(3.2, 1.62, 11.25), V(3.35, 1.62, 11.3), V(7.6, 1.15, 11.55), V(7.6, 1.15, 11.55), 38, 34),
    police: P2(S.police, V(3.45, 1.64, 1.65), V(3.35, 1.64, 1.6), V(0.7, 1.4, 0.65), V(0.65, 1.42, 0.62), 46, 43),
    enter: P2(S.enter, V(0.6, 1.55, -4.7), V(0.55, 1.55, -4.5), V(0.1, 1.42, -0.6), V(0.1, 1.42, -0.6), 52, 48),
    timer: P2(S.timer, V(7.15, 1.36, -4.62), V(7.18, 1.34, -4.68), V(7.585, 1.2, -5.15), V(7.585, 1.2, -5.15), 34, 31),
    climb1: P2(S.climb1, V(7.05, LV2 + 1.6, -5.2), V(7.05, LV2 + 1.58, -5.25), V(7.0, LV2 - 0.25, -7.1), V(7.0, LV2 - 0.05, -6.8), 52, 50),
    off: P2(S.off, V(4.6, LV3 + 1.6, -4.95), V(4.7, LV3 + 1.6, -4.98), V(7.0, LV3 + 1.0, -6.0), V(7.0, LV3 + 1.0, -5.9), 52, 50),
    torch: P2(S.torch, V(6.95, LV3 + 1.5, -4.78), V(6.96, LV3 + 1.51, -4.84), V(7.0, LV3 + 1.56, -5.43), V(7.0, LV3 + 1.56, -5.43), 40, 37),
    slam: P2(S.slam, V(6.25, LV3 + 1.28, -5.92), V(6.25, LV3 + 1.26, -5.94), V(6.25, 0, -7.05), V(6.25, 0, -7.1), 64, 60),
    hand: P2(S.hand, V(6.28, LV3 + 0.95, -5.98), V(6.28, LV3 + 0.93, -6.02), V(5.95, LV2 + 1.75, -7.0), V(5.95, LV2 + 1.85, -7.15), 46, 43),
    stop: P2(S.stop, V(5.42, LV4 - 1.5 + 1.42, -8.62), V(5.44, LV4 - 1.5 + 1.4, -8.58), V(5.5, LV3 + 1.65, -6.25), V(5.5, LV3 + 1.7, -6.35), 46, 44),
    go: P2(S.go, V(5.44, LV4 - 1.5 + 1.4, -8.58), V(5.46, LV4 - 1.5 + 1.38, -8.55), V(5.5, LV3 + 1.75, -6.5), V(5.5, LV3 + 1.85, -6.9), 44, 42),
    flash: P2(S.flash, V(1.05, 1.66, 0.75), V(0.95, 1.66, 0.55), V(0.33, 1.66, -0.82), V(0.33, 1.66, -0.82), 30, 27),
    run: P2(S.run, V(7.05, LV5 + 1.65, -5.25), V(7.05, LV5 + 1.6, -5.3), V(7.0, LV5 - 0.4, -7.6), V(7.0, LV5 - 0.1, -6.9), 58, 56),
    runH: P2(S.runH, V(7.32, LV4 - 1.5 + 0.35 + 3.0 - 3.0, -8.75), V(7.3, LV4 - 1.5 + 0.38, -8.7), V(7.0, LV4 - 1.5 + 1.0, -6.6), V(7.0, LV4 - 1.5 + 1.2, -6.4), 60, 58),
    keys: P2(S.keys, V(3.62, LV6 + 1.42, -4.95), V(3.64, LV6 + 1.36, -4.94), V(3.99, LV6 + 1.16, -4.47), V(4.01, LV6 + 0.85, -4.5), 44, 46),
    grope: P2(S.grope, V(4.16, LV6 + 0.5, -4.52), V(4.17, LV6 + 0.5, -4.54), V(4.25, LV6 + 0.88, -4.92), V(4.25, LV6 + 0.86, -4.92), 50, 48),
    lock: P2(S.lock, V(3.72, LV6 + 1.5, -4.84), V(3.73, LV6 + 1.48, -4.82), V(3.96, LV6 + 1.21, -4.42), V(3.97, LV6 + 1.19, -4.4), 38, 35),
    block: P2(S.block, V(3.5, LV6 + 1.32, -3.74), V(3.53, LV6 + 1.3, -3.77), V(3.97, LV6 + 1.17, -4.07), V(3.97, LV6 + 1.17, -4.07), 48, 44),
    stat: P2(S.stat, V(6.25, LV6 + 1.2, -5.92), V(6.25, LV6 + 0.9, -5.95), V(6.25, LV2, -7.05), V(6.25, LV2, -7.1), 66, 62),
    stay: P2(S.stay, V(6.25, LV3 + 1.52, -4.78), V(6.28, LV3 + 1.52, -4.8), V(6.9, LV3 + 1.56, -5.2), V(6.9, LV3 + 1.56, -5.2), 40, 37),
    knock: P2(S.knock, V(6.28, LV3 + 1.46, -4.98), V(6.3, LV3 + 1.45, -4.97), V(6.84, LV3 + 1.3, -4.47), V(6.84, LV3 + 1.3, -4.47), 42, 40),
    bell: P2(S.bell, V(7.3, LV3 + 1.8, -5.22), V(7.31, LV3 + 1.78, -5.18), V(7.35, LV3 + 1.38, -4.42), V(7.35, LV3 + 1.38, -4.42), 38, 36),
    dark: P2(S.dark, V(3.78, LV6 + 1.76, -5.22), V(3.8, LV6 + 1.74, -5.12), V(3.95, LV6 + 1.2, -4.1), V(3.95, LV6 + 1.2, -4.1), 50, 44),
    noise: P2(S.noise, V(2.3, LV3 + 1.65, -5.35), V(2.4, LV3 + 1.65, -5.33), V(6.8, LV3 + 1.0, -4.8), V(6.8, LV3 + 1.0, -4.8), 58, 56),
    neigh: P2(S.neigh, V(6.32, LV3 + 1.6, -5.48), V(6.36, LV3 + 1.6, -5.42), V(6.8, LV3 + 1.42, -4.3), V(6.8, LV3 + 1.42, -4.3), 42, 40),
    inside: P2(S.inside, V(7.32, LV3 + 1.5, -2.85), V(7.3, LV3 + 1.5, -2.88), V(6.45, LV3 + 1.45, -3.7), V(6.45, LV3 + 1.45, -3.7), 46, 43),
    cops: P2(S.cops, V(7.25, (LV2 + LV3) / 2 + 1.5, -9.28), V(7.2, (LV2 + LV3) / 2 + 1.52, -9.2), V(7.0, LV3 + 1.0, -5.6), V(7.0, LV3 + 1.1, -5.5), 58, 56),
    search: P2(S.search, V(6.25, LV3 + 0.6, -6.05), V(6.25, LV3 + 0.65, -6.08), V(6.3, LV6 + 2.0, -7.2), V(6.3, LV6 + 2.0, -7.25), 66, 62),
    door5: P2(S.door5, V(7.2, LV5 + 1.6, -5.4), V(7.1, LV5 + 1.6, -5.38), V(4.3, LV5 + 1.2, -4.45), V(4.3, LV5 + 1.25, -4.45), 44, 40),
    him: P2(S.him, V(4.85, LV5 + 1.55, -5.6), V(4.8, LV5 + 1.56, -5.5), V(4.2, LV5 + 1.45, -4.12), V(4.2, LV5 + 1.48, -4.12), 36, 32),
    facade: P2(S.facade, V(HERO_BAY + 0.7, LV6 - 0.6, 11.6), V(HERO_BAY + 0.6, LV6 - 0.58, 11.3), V(HERO_BAY, LV6 - 0.4, 0), V(HERO_BAY, LV6 - 0.35, 0), 34, 31),
    night: P2(S.night, V(5.0, LV5 + 1.66, -4.82), V(4.97, LV5 + 1.66, -4.78), V(4.2, LV5 + 1.66, -4.12), V(4.2, LV5 + 1.66, -4.12), 30, 27),
    name: P2(S.name, V(5.95, LV5 + 1.55, -5.04), V(5.98, LV5 + 1.55, -5.06), V(6.6, LV5 + 1.56, -5.4), V(6.6, LV5 + 1.56, -5.4), 34, 31),
  };
  const smokeLit = (v) => { haze.u.uLitCol.value.setScalar(v); haze.u.uShadeCol.value.setScalar(v * 0.25); };
  const fogTo = (d, col) => { scene.fog.density = d; scene.fog.color.set(col); for (const bb of [haze, wisps]) { bb.u.uFogD.value = d; bb.u.uFogCol.value.set(col); } };
  const lampsOn = (k, floors = [0, 1, 2, 3, 4, 5, 6]) => { ST.lights.forEach((l, f) => (l.intensity = floors.includes(f) ? 7 * k : 0)); ST.lampMat.emissiveIntensity = 3 * k; };
  // the window right under Inès's dormer (the 5th floor, bay 3): dark until he switches his light on
  const card5 = (W.hero.userData.cards || []).find((c) => c.userData.L === 5 && Math.abs(c.userData.x - HERO_BAY) < 0.2);
  if (card5) { const m = card5.material; m.emissive.set('#ffffff'); m.emissiveMap = m.emissiveMap || m.map; m.needsUpdate = true; }

  console.log('SHOTS ' + SH.map((x) => `${x.id}:${x.t0.toFixed(2)}`).join(' ') + ' DUR ' + DUR);
  if (q.get('flow') === '1') {   // camera flow of every take (tools/camflow.mjs: keep p90 under ~25 px per frame)
    const { camFlow } = await import('../tools/camflow.mjs'); const c0 = new THREE.PerspectiveCamera();
    for (const sh of SH) { const C = CAM[sh.id]; if (!C) continue; C.apply(c0, sh.t0 + 0.01);
      const rows = camFlow((c, t) => C.apply(c, t), sh.t0 + 0.01, sh.t1 - 0.01, { ground: c0.position.y - 1.6 });
      console.log(`FLOW ${sh.id} p90max ${Math.max(...rows.map((r) => r.p90)).toFixed(1)}`); }
  }
  // ---------- frame ----------
  return {
    duration: DUR, fps: 30, captions: [],
    frame(t, opts = {}) {
      curT = t;
      let sh = shotAt(t), id = sh.id, tt = t, rideQ = null;
      if (id === 'rewind') { const r = (t - S.rewind.t0) / (S.rewind.t1 - S.rewind.t0); tt = S.run.t1 - r * (S.run.t1 - S.run.t0); id = 'run'; sh = S.run; }
      const k = (tt - sh.t0) / Math.max(0.001, sh.t1 - sh.t0);
      hideAll(); apple.root.visible = false; phone.visible = false; keys.visible = false; keyIn.visible = false; police.group.visible = false; fl1.g.visible = fl2.g.visible = false;
      torch.intensity = 0; screenGlow.intensity = 0; screenGlow.position.set(0, 0, 0.22); phone.screen.material.emissiveIntensity = 1.0; beams.forEach((m) => { m.uniforms.uI.value = 0; m.uniforms.uTime.value = t; });
      fl1.sp.intensity = fl2.sp.intensity = 0; lampsOn(0); ST.timerMat.emissiveIntensity = 1.2; groundGlow.intensity = 0; fill.intensity = 0; cold.intensity = 0;
      ST.door3.set(0); ST.door5.set(0); ST.door3.light.intensity = 0; ST.door5.light.intensity = 0; bellMat.emissiveIntensity = 0; underMat.opacity = 0;
      W.blueSpot.intensity = 0; W.streetSpot.intensity = 14; groundGlow.position.set(5.6, 1.6, -5.1); cold.position.set(6.25, LV3 + 1.0, -6.6); W.stairLamp.intensity = 0; fireLight.intensity = 0; beaconLights.forEach((l) => (l.intensity = 0)); W.hemi.intensity = 0.35;
      room.setDoor(0); room.openWindow(0); room.setKitchen(0); room.rolled.visible = true; room.towelsHung.visible = false;
      W.hero.userData.setDoor(0); if (W.hero.userData.hallLight) W.hero.userData.hallLight.intensity = 0;
      W.epa.group.visible = W.fpt.group.visible = true; W.epa.aim(V(HERO_BAY + 0.05, ROOM.SILL - 0.35, 0.95), 0);
      if (card5) { card5.material.emissiveIntensity = 0; }
      R.renderer.toneMappingExposure = 1.0;
      G.uSat.value = 1.0; G.uContrast.value = 1.05; G.uTint.value.set(1, 1, 1); G.uVignette.value = 0.6; G.uFade.value = 0; G.uFadeWhite.value = 0; G.uScan.value = 0; G.uBarrel.value = 0; G.uAberr.value = 0.0;
      const inside = !['street', 'phone3', 'crowd', 'empty', 'police', 'facade', 'flash', 'end'].includes(id);
      fogTo(inside ? 0.035 : 0.012, inside ? '#14120f' : '#0b0d12');
      if (inside) { G.uAberr.value = 0.0012; W.hemi.intensity = 0.06; }
      let hz = 0, ws = !inside ? 1 : 0;
      const outside = !inside;
      // the street: beacons, the police car, the ladder folding away
      if (outside && id !== 'flash') {
        updateBeacons(W.epa.beacons, t); updateBeacons(W.fpt.beacons, t); beaconLights.forEach((l, i) => (l.intensity = 700 * pulse(t, i * 0.33)));
        police.group.visible = true; police.update(t);
        W.epa.aim(V(HERO_BAY + 0.05, ROOM.SILL - 0.35, 0.95), id === 'street' ? lerp(0.55, 0.12, smooth(0, 1, k)) : 0);
        fireLight.intensity = 6;
      }
      if (id === 'street' || id === 'phone3' || id === 'crowd' || id === 'empty' || id === 'police') {
        for (const [i, a] of crowd.entries()) {
          if (id === 'police' && i < 3) {   // three residents crossing back to the door
            const p0 = crowdPos[i].p, p1 = V(0.2 + i * 0.5, K, 1.2), u = clamp(k * 1.1 + i * 0.12), pos = p0.clone().lerp(p1, u); pos.y = K * (1 - smooth(0.2, 0.28, u)) + K * smooth(0.84, 0.92, u);   // down the kerb, up the far one
            show(a, () => walk(a, { pos, yaw: Math.atan2(p1.x - p0.x, p1.z - p0.z), phase: u * p0.distanceTo(p1) / 1.36 + i * 0.3 }));
          } else { const c = crowdPos[i], tgt = V(0, LV2 + 2, 0); show(a, () => stand(a, { pos: c.p, yaw: Math.atan2(tgt.x - c.p.x, tgt.z - c.p.z), breath: t * 0.3 + i, look: tgt, lookK: 0.7, cache: c.cache })); }
        }
        firemen.forEach((f, i) => show(f, () => stand(f, { pos: V(-3.2 + i * 0.9, 0, 4.6 + i * 0.3), yaw: Math.PI * 0.85 + i * 0.4, breath: t * 0.35 + i, look: V(-0.5, 3, 6), lookK: 0.5, cache: {} })));
        show(cop1, () => stand(cop1, { pos: V(1.55, K, 1.0), yaw: -0.35, breath: t * 0.3,
          armR: id === 'police' ? (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(left, -0.42).addScaledVector(up, -0.12 + 0.05 * Math.sin(t * 3.2)).addScaledVector(fwd, 0.2), pole: sh2.clone().addScaledVector(up, -0.6).addScaledVector(fwd, -0.3), curl: 0.2 }) : undefined, look: V(-2.0, 1.6, 8.0), lookK: 0.6, cache: {} }));
        W.hero.userData.setDoor(0.75); W.hero.userData.hallLight.intensity = 10;
      }
      if (id === 'street' || id === 'crowd' || id === 'phone3') {
        const ip = V(2.45, K, 11.3);
        const look = id === 'crowd' ? V(lerp(-3, 9, smooth(0.05, 0.95, k)), 1.6, lerp(10.4, 11.6, k)) : V(0.5, LV2 + 2.5, 0);
        show(ines, () => stand(ines, { pos: ip, yaw: Math.PI, breath: t * 0.45, look, lookK: id === 'crowd' ? 1.0 : 0.6, armR: id === 'phone3' ? phoneUp : undefined }));
        if (id === 'phone3') { phone.visible = true; phoneFit(ines, 'Right'); drawPhone('lock', t); screenGlow.intensity = 0.2; phone.screen.material.emissiveIntensity = 0.75; }
      }
      if (id === 'enter') {
        W.hero.userData.setDoor(0.8); W.hero.userData.hallLight.intensity = 9;
        const p0 = V(0.25, 0, 1.0), p1 = V(0.1, 0, -2.3), u = k, pos = p0.clone().lerp(p1, u); pos.y = 0;
        show(ines, () => walk(ines, { pos, yaw: Math.PI, phase: u * 3.3 / 1.3, look: V(0.1, 1.5, -6) }));
        police.group.visible = true; police.update(t); beaconLights.forEach((l, i) => (l.intensity = 500 * pulse(t, i * 0.33)));
      }
      // ---- the stairwell ----
      const lit = (t >= S.timer.t0 + 0.55 && t < Lw(10, 'lumière') + 0.3) || (t >= S.noise.t0 + 0.4 && t < S.cops.t0);
      if (inside && lit && !ETSI(t)) lampsOn(1);
      if (inside && !lit) { groundGlow.intensity = 1.6; cold.intensity = 0.35; }
      if (id === 'hook') {
        // her eyes, her torch: the man coming up the flight toward her, slowed down
        const F = FL(3, 'A'), a = lerp(-0.45, 0.95, k);
        show(man, () => climb(man, { flight: F, a, armR: railArm(F, a), look: V(7.0, LV3 + 1.5, -5.65), lookK: 0.9, lean: 0.2 }));
        phone.visible = true; cam.updateMatrixWorld(); CAM.hook.apply(cam, t); drawPhone('torch', t);
        phone.position.copy(cam.position).add(V(0.14, -0.1, 0.18)); phone.lookAt(V(7.0, LV3 - 0.6, -7.5)); phone.rotateY(Math.PI); phone.updateMatrixWorld(true);
        torch.intensity = 26; beamP.uniforms.uI.value = 0.5; fill.intensity = 0.15;
        G.uSat.value = 0.75; G.uTint.value.set(0.96, 0.98, 1.06); R.renderer.toneMappingExposure = 1.25;
      }
      if (id === 'face' || id === 'torch' || id === 'off') {
        const F = FL(3, 'A');
        if (id === 'off') { const a = easeTo(smooth(0, 0.62, k), 1.62, 2.97); show(ines, () => climb(ines, { flight: F, a, armR: railArm(F, Math.min(a, 2.2)), look: V(7.0, LV3 + 1.3, -4.4), lookK: 0.6 })); }
        else show(ines, () => stand(ines, { pos: V(7.0, LV3, -5.43), yaw: id === 'face' ? Math.PI : 0, breath: t * 0.9, lean: 0.05,
          armR: id === 'face' ? torchHand(V(7.0, LV3 - 0.6, -7.6)) : phoneUp, look: id === 'face' ? V(7.0, LV3 - 0.4, -7.5) : V(7.05, LV3 + 1.0, -5.1), lookK: 0.9 }));
        if (id !== 'off') { phone.visible = true; phoneFit(ines, 'Right'); drawPhone('torch', t); screenGlow.intensity = id === 'torch' ? 0.22 : 0.3; torch.intensity = id === 'face' ? 22 : 9 * smooth(0.2, 0.35, k); beamP.uniforms.uI.value = id === 'face' ? 0.35 : 0; fill.intensity = id === 'torch' ? 0.25 : 0.35; }
        R.renderer.toneMappingExposure = id === 'off' && !lit ? 1.35 : 1.2;
        if (id !== 'off') { G.uSat.value = 0.85; }
      }
      if (id === 'timer') {
        const press = smooth(0.0, 0.18, k) * (1 - smooth(0.55, 0.8, k));
        show(ines, () => pressPose(ines, 'Right', V(S_.X1 - 0.02 - 0.05 * (1 - press), 1.2, -5.15),
          (arm) => stand(ines, { pos: V(7.12, 0, -5.28), yaw: Math.PI / 2, breath: t * 0.4, armR: arm, look: V(7.6, 1.2, -5.15) }),
          (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.3), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: V(1, 0, 0), N: V(0, 1, 0).cross(V(1, 0, 0)), curl: 1.1, idx: 0.06, thumb: 0.5 })));
        ST.timerMat.emissiveIntensity = 0.35 + 0.5 * press; if (!lit) { groundGlow.intensity = 2.2; }
        R.renderer.toneMappingExposure = 1.15; fill.intensity = 0.3;
      }
      if (id === 'climb1') {
        const F = FL(2, 'A'), a = lerp(0.25, 2.3, k); hz = 1;
        show(ines, () => climb(ines, { flight: F, a, armR: railArm(F, a), look: V(7.0, LV2 + 1.5, -5.0), lookK: 0.5 }));
        smokeLit(0.6); R.renderer.toneMappingExposure = 1.1;
      }
      if (id === 'slam') {
        const bang = Math.exp(-Math.max(0, t - Lw(12, 'claque')) / 0.18) * (t >= Lw(12, 'claque') - 0.03 ? 1 : 0);
        groundGlow.intensity = 1.6 + 26 * bang; cold.intensity = 0.2;
        phone.visible = true; CAM.slam.apply(cam, t); phone.position.copy(cam.position).add(V(0.16, -0.08, 0.22)); phone.lookAt(V(6.2, LV2, -7.0)); phone.rotateY(Math.PI); phone.updateMatrixWorld(true);
        torch.intensity = 30; beamP.uniforms.uI.value = 0.35; R.renderer.toneMappingExposure = 1.35;
      }
      if (id === 'hand' || id === 'stopH' || id === 'goH') {
        // the follower, one floor down: his hand on the rail in the beam of her torch
        const F = FL(3, 'B'), a = id === 'hand' ? easeTo(k, 0.55, 1.35) : id === 'stopH' ? 1.35 : easeTo(smooth(0, 0.8, k), 1.35, 1.89);
        show(man, () => climb(man, { flight: F, a, armR: railArm(F, a), look: V(5.5, F.base + 2.4, -8.0), lookK: 0.6, lean: 0.18 }));
        phone.visible = true; const C = id === 'hand' ? CAM.hand : P2({ t0: sh.t0, t1: sh.t1 }, V(6.28, LV3 + 0.95, -5.98), V(6.28, LV3 + 0.94, -6.0), V(5.95, LV2 + 1.85, -7.1), V(5.95, LV2 + 1.9, -7.2), 44, 43);
        C.apply(cam, t); phone.position.copy(cam.position).add(V(0.12, -0.25, 0.02)); phone.lookAt(V(5.95, LV2 + 1.6, -7.1)); phone.rotateY(Math.PI); phone.updateMatrixWorld(true);
        torch.intensity = 24; beamP.uniforms.uI.value = 0.3; R.renderer.toneMappingExposure = 1.35; G.uSat.value = 0.8;
        if (id !== 'hand') CAM[id] = C;
      }
      if (id === 'stop' || id === 'go' || id === 'sms' || id === 'etsi') {
        const F = FL(4, 'B');
        const a = id === 'stop' ? easeTo(smooth(0, 0.55, k), 0.3, 0.81) : id === 'go' ? easeTo(smooth(0, 0.85, k), 0.81, 1.89) : 1.89;
        const back = id === 'stop' && k > 0.4 ? V(5.5, LV3, -5.0) : null;
        show(ines, () => climb(ines, { flight: F, a, armR: id === 'sms' || id === 'etsi' ? phoneUp : torchHand(V(5.5, F.base + 0.8, -7.4)),
          look: id === 'sms' ? null : back || V(5.5, F.base + 2.2, -8.6), lookK: back ? 1.0 : 0.6, lean: 0.1 }));
        phone.visible = true; phoneFit(ines, 'Right');
        if (id === 'sms' || id === 'etsi') {
          drawPhone('msg', t); screenGlow.intensity = 0.5; phone.screen.material.emissiveIntensity = 0.7;
          if (id === 'sms') { rideQ = phone.quaternion.clone(); const buzz = t < S.sms.t0 + 0.7 ? Math.sin((t - S.sms.t0) * 2 * Math.PI * 4) * 0.012 * (1 - (t - S.sms.t0) / 0.7) : 0; phone.rotateZ(buzz); phone.updateMatrixWorld(true); }
        } else { drawPhone('torch', t); torch.intensity = 2.5; beamP.uniforms.uI.value = 0.04; }
        fill.intensity = 0.2; R.renderer.toneMappingExposure = 1.3;
        if (id === 'etsi') { G.uSat.value = 0.35; G.uTint.value.set(1.06, 0.96, 0.94); }
      }
      if (id === 'flash') {
        // 22:41, earlier tonight: he holds the door and asks her floor. Cooler, softer picture
        W.hero.userData.hallLight.intensity = 40; man.root.visible = true; W.hero.userData.setDoor(0.6); W.hero.updateMatrixWorld(true);
        const knob = W.hero.userData.door.hinge.localToWorld(V(-1.35 + 0.14, 1.15, 0.1));
        CAM.flash.apply(cam, t);
        show(man, () => stand(man, { pos: V(0.3, 0.005, -0.85), yaw: 0.35, breath: t * 0.3,
          armL: (sh2, fwd, left, up) => ({ hand: knob, pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, 0.6).addScaledVector(fwd, -0.3), curl: 0.6 }), look: cam.position.clone(), lookK: 0.85, cache: {} }));
        G.uSat.value = 0.55; G.uTint.value.set(0.9, 0.97, 1.08); G.uContrast.value = 1.0; R.renderer.toneMappingExposure = 1.15;
      }
      if (id === 'run') {
        const F = FL(5, 'A'), a = lerp(-0.2, 2.6, smooth(0, 1, k) * 0.35 + k * 0.65);
        show(ines, () => climb(ines, { flight: F, a, lean: 0.32, armR: torchHand(V(7.0, F.base + 2.4, -5.0)), look: V(7.0, LV5 + 1.6, -5.0), lookK: 0.7 }));
        phone.visible = true; phoneFit(ines, 'Right'); drawPhone('torch', t); torch.intensity = 16; beamP.uniforms.uI.value = 0.3; fill.intensity = 0.25;
        G.uSat.value = 0.45; G.uTint.value.set(1.06, 0.96, 0.94); R.renderer.toneMappingExposure = 1.3;
        if (S.rewind.t0 <= t && t < S.rewind.t1) { G.uScan.value = 1.0; G.uSat.value = 0.4; G.uAberr.value = 0.012; }
      }
      if (id === 'runH') {
        const F = FL(4, 'A'), a = lerp(0.2, 2.2, k);
        show(man, () => climb(man, { flight: F, a, lean: 0.3, look: V(7.0, F.base + 3, -5.0), lookK: 0.5 }));
        cold.intensity = 0.8; cold.position.set(7.2, LV4 - 1.5 + 0.8, -8.8); G.uSat.value = 0.4; G.uTint.value.set(1.06, 0.96, 0.94); R.renderer.toneMappingExposure = 1.45;
      }
      if (id === 'keys' || id === 'grope' || id === 'lock') {
        room.door.updateMatrixWorld(true);
        const kp = room.door.localToWorld(V(KH.x + 0.02, KH.y - 0.03, -0.06));        // in front of the lock
        if (id === 'keys') {
          // the keys slip out of her hand at the lock and fall
          const u = clamp((t - S.keys.t0 - 0.35) / 0.55), y = lerp(kp.y, LV6 + 0.012, u * u);
          show(ines, () => stand(ines, { pos: V(4.18, LV6, -4.98), yaw: 0, breath: t * 1.2, lean: 0.1, armR: (sh2, fwd, left, up) => ({ hand: kp.clone().add(V(-0.03, 0.02, -0.09)), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: fwd.clone(), N: left.clone(), curl: u > 0 ? 0.15 : 0.6 }),
            armL: torchHand(kp, -1), look: kp }));
          keys.visible = true; keys.position.set(kp.x + 0.03 * u, y, kp.z - 0.05 * u); keys.rotation.set(1.2 * u, 0.4, 2.0 * u); keys.updateMatrixWorld(true);
        } else if (id === 'grope') {
          const gx = 4.3 + 0.1 * Math.sin(t * 2.3), gz = -4.74 + 0.05 * Math.cos(t * 1.9);
          show(ines, () => kneel(ines, { pos: V(4.25, LV6, -5.12), yaw: 0, hipH: 0.5, lean: 0.6, breath: t * 1.3,
            armR: (sh2, fwd, left, up) => ({ hand: V(gx, LV6 + 0.28, gz - 0.06), pole: sh2.clone().addScaledVector(up, -0.3).addScaledVector(left, -0.6), F: fwd.clone(), N: up.clone().negate(), curl: 0.2 }),
            armL: torchHand(V(4.4, LV6, -4.6), -1), look: V(4.35, LV6, -4.65) }));
          keys.visible = true; keys.position.set(4.46, LV6 + 0.012, -4.6); keys.rotation.set(Math.PI / 2, 0.4, 2.0); keys.updateMatrixWorld(true);
        } else {
          // the key turns a quarter, the door opens; her index rides the key head (the offset turns with it)
          // on the soundtrack: the key in at +0.3 s, the bolt clicks at +0.55 s, the hinge creaks from +0.7 s
          const turn = smooth(0.06, 0.2, k), open = smooth(0.25, 0.75, k), bl = smooth(0.22, 0.32, k);
          room.setDoor(0.35 * open); room.door.updateMatrixWorld(true);
          keyIn.visible = true; keyTurn.rotation.z = -turn * Math.PI / 2; keyIn.updateMatrixWorld(true);
          const dq = room.door.getWorldQuaternion(new THREE.Quaternion()), dz = V(0, 0, 1).applyQuaternion(dq), dx = V(1, 0, 0).applyQuaternion(dq);
          const ang = -turn * Math.PI / 2, head = room.door.localToWorld(KH.clone().add(V(0, 0, -0.026)));
          const tgt = head.clone().add(dx.clone().multiplyScalar(-0.009).add(V(0, -0.002, 0)).applyAxisAngle(dz, ang));
          const body = (arm) => stand(ines, { pos: V(4.12, LV6, -4.98 + 0.3 * open), yaw: 0, breath: t * 1.2, lean: 0.1, armR: arm, armL: torchHand(head, -1), look: head });
          const keySpec = (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.35), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: dz.clone(), N: dx.clone().applyAxisAngle(dz, ang), curl: 0.55, idx: 0.25, thumb: 0.4 });
          const palmSpec = (sh2, fwd, left, up) => ({ hand: room.door.localToWorld(V(-0.6, 1.12, -0.024)), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: up.clone(), N: dz.clone(), curl: 0.12, idx: 0.12, thumb: 0.15 });
          // she lets go of the key and pushes the door with her palm, blended over 0.27 s (no pose pop)
          if (bl <= 0) show(ines, () => pressPose(ines, 'Right', tgt, body, keySpec));
          else if (bl >= 1) show(ines, () => body(palmSpec));
          else show(ines, () => { const wK = pressPose(ines, 'Right', tgt, body, keySpec);
            body((sh2, fwd, left, up) => { const a = keySpec(sh2, fwd, left, up), c = palmSpec(sh2, fwd, left, up);
              return { hand: wK.clone().lerp(c.hand, bl), pole: a.pole, F: a.F.lerp(c.F, bl).normalize(), N: a.N.lerp(c.N, bl).normalize(), curl: lerp(a.curl, c.curl, bl), idx: lerp(a.idx, c.idx, bl), thumb: lerp(a.thumb, c.thumb, bl) }; }); });
        }
        phone.visible = true; phoneFit(ines, 'Left'); drawPhone('torch', t); torch.intensity = id === 'grope' ? 1.0 : 0.6; beamP.uniforms.uI.value = 0.04; fill.intensity = 0.15;
        cold.intensity = 2.0; cold.position.set(4.6, LV6 + 2.0, -5.4);
        G.uSat.value = 0.45; G.uTint.value.set(1.06, 0.96, 0.94); R.renderer.toneMappingExposure = 1.35;
      }
      if (id === 'block' || id === 'dark') {
        // inside her room: she shoves the door shut, a hand stops it
        const hit = Lw(23, 'main'), shut = t < hit ? lerp(0.5, 0.3, smooth(S.block.t0, hit, t)) : 0.3;
        room.setDoor(shut); room.door.updateMatrixWorld(true);
        const edge = room.door.localToWorld(V(-(ROOM.DX1 - ROOM.DX0) + 0.02, 1.16, -0.02));
        show(ines, () => stand(ines, { pos: V(4.32, LV6, -3.92), yaw: Math.PI + 0.2, breath: t * 1.4, lean: 0.22,
          armR: (sh2, fwd, left, up) => ({ hand: room.door.localToWorld(V(-0.55, 1.15, 0.08)), pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.6), F: up.clone(), N: V(0, 0, -1).applyQuaternion(room.door.getWorldQuaternion(new THREE.Quaternion())), curl: 0.1 }),
          armL: (sh2, fwd, left, up) => ({ hand: room.door.localToWorld(V(-0.3, 1.32, 0.08)), pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, 0.6), F: up.clone(), N: V(0, 0, -1).applyQuaternion(room.door.getWorldQuaternion(new THREE.Quaternion())), curl: 0.1 }), look: edge }));
        if (t >= hit - 0.02) { const dq = room.door.getWorldQuaternion(new THREE.Quaternion());
          // the palm against the door's edge, the fingers round onto its room side, the thumb on the landing side
          show(man, () => stand(man, { pos: V(4.1, LV6, -4.52), yaw: 0, lean: 0.15,
            armR: (sh2, fwd, left, up) => ({ hand: room.door.localToWorld(V(-DW - 0.035, 1.16, -0.026)), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: V(0, 0, 1).applyQuaternion(dq), N: V(1, 0, 0).applyQuaternion(dq), curl: 0.85, thumb: -0.3 }), cache: {} })); }
        W.streetSpot.intensity = 14; cold.intensity = 2.6; cold.position.set(3.95, LV6 + 1.7, -3.3);
        if (id === 'dark') { groundGlow.position.set(3.0, LV6 + 2.4, -5.0); groundGlow.intensity = 1.5; cold.position.set(3.72, LV6 + 1.5, -3.95); cold.intensity = 0.35; }
        G.uSat.value = 0.45; G.uTint.value.set(1.06, 0.96, 0.94); R.renderer.toneMappingExposure = 1.3;
        if (id === 'dark') { G.uSat.value = 0.3; G.uVignette.value = 0.95; R.renderer.toneMappingExposure = 1.5; } else R.renderer.toneMappingExposure = 1.4;
      }
      if (id === 'stat') { cold.intensity = 4; cold.position.set(6.25, LV4, -7.05); groundGlow.intensity = 7; R.renderer.toneMappingExposure = 1.6; G.uSat.value = 0.6; }
      if (id === 'stay' || id === 'knock' || id === 'bell' || id === 'noise' || id === 'neigh') {
        const ring = id === 'bell';
        const kph = (((t - S.knock.t0 - 0.08) * 3.2) % 1 + 1) % 1, knockZ = S_.ZW - 0.055 - 0.001 - 0.07 * (1 - Math.exp(-Math.pow(Math.min(kph, 1 - kph) / 0.09, 2)));
        const press = smooth(0.02, 0.18, k), bF = V(0.12, -0.1, 1).normalize();            // the chime rings at +0.25 s (k 0.18)
        const base = (arms) => stand(ines, { pos: id === 'neigh' ? V(6.78, LV3, -4.92) : id === 'knock' ? V(6.8, LV3, -4.8) : ring ? V(7.04, LV3, -4.92) : V(6.88, LV3, -5.18),
          yaw: id === 'stay' ? lerp(-Math.PI / 2, 0, smooth(0.1, 0.7, k)) : 0, breath: t * 1.1, ...arms,
          look: id === 'neigh' ? V(6.8, LV3 + 1.62, -4.1) : V(6.8, LV3 + 1.3, -4.43), lookK: 0.8 });
        const kSpec = (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.4), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.6), F: up.clone(), N: fwd.clone().negate(), curl: 0.95 });
        const bSpec = (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.35), pole: sh2.clone().addScaledVector(up, -0.6).addScaledVector(left, 0.4), F: bF.clone(), N: bF.clone().cross(V(0, 1, 0)).normalize(), curl: 1.1, idx: 0.06, thumb: 0.5 });
        if (id === 'knock') show(ines, () => pressPose(ines, 'Right', V(6.84, LV3 + 1.32, knockZ), (arm) => base({ armR: arm, armL: torchHand(V(7.0, LV3 + 1.3, -4.4), -1) }), kSpec, () => wp(ines.bones.RightHandMiddle1).add(V(0, 0, 0.012))));
        else if (ring) show(ines, () => pressPose(ines, 'Left', BELL.clone().add(V(0, -0.018, -0.015 - 0.05 * (1 - press))), (arm) => base({ armL: arm, armR: torchHand(V(7.3, LV3 + 1.3, -4.4)) }), bSpec));
        else show(ines, () => base({}));
        if (ring) bellMat.emissiveIntensity = 0.25 * press;
        if (id === 'noise' || id === 'neigh') underMat.opacity = id === 'noise' ? smooth(0.15, 0.6, k) : 1;
        if (id === 'neigh') {
          ST.door3.set(0.85 * smooth(0, 0.3, k)); ST.door3.light.intensity = 3.5;
          show(neigh, () => stand(neigh, { pos: V(6.82, LV3, -4.05), yaw: Math.PI, breath: t * 0.4,
            armL: (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.32).addScaledVector(left, 0.18).addScaledVector(up, -0.25 + 0.06 * Math.sin(t * 4)), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, 0.6), curl: 0.2 }),
            look: V(6.78, LV3 + 1.55, -4.92), lookK: 0.8 }));
        }
        if (id === 'stay' || id === 'knock' || id === 'bell') { phone.visible = true; drawPhone('torch', t); if (id === 'stay') { phoneFit(ines, 'Right'); torch.intensity = 3; } else { phoneFit(ines, ring ? 'Right' : 'Left'); torch.intensity = 0.7; beamP.uniforms.uI.value = 0.04; } }
        fill.intensity = 0.3; R.renderer.toneMappingExposure = lit ? 1.1 : 1.35;
      }
      if (id === 'inside' || id === 'sms114' || id === 'info114') {
        ST.door3.set(id === 'inside' ? 0.85 * (1 - smooth(0.2, 0.7, k)) : 0); ST.door3.light.intensity = 3.5;
        show(ines, () => stand(ines, { pos: V(6.25, LV3, -3.65), yaw: Math.PI / 2 + 0.5, breath: t * 1.3, lean: -0.06, armR: phoneUp, look: id === 'inside' ? V(6.8, LV3 + 1.4, -4.4) : null }));
        if (id === 'inside') show(neigh, () => stand(neigh, { pos: V(7.2, LV3, -3.9), yaw: Math.PI, breath: t * 0.4,
          armR: (sh2, fwd, left, up) => ({ hand: ST.door3.group.localToWorld(V(-0.7, 1.05, 0.06)), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.6), curl: 0.6 }), look: V(6.25, LV3 + 1.55, -3.65), lookK: 0.7 }));
        phone.visible = true; phoneFit(ines, 'Right');
        const p = id === 'sms114' ? smooth(S.sms114.t0 + 0.4, S.sms114.t1 - 0.3, t) : id === 'info114' ? 1.3 : 0;
        drawPhone(id === 'inside' ? 'lock' : 'sms114', t, p); screenGlow.intensity = 0.35; phone.screen.material.emissiveIntensity = 0.75;
        R.renderer.toneMappingExposure = 1.05; fill.intensity = 0.2;
      }
      if (id === 'cops' || id === 'search' || id === 'door5' || id === 'him' || id === 'night' || id === 'name') {
        // the police: on the stairs (cops), then on the 5th-floor corridor with Inès behind them
        if (id === 'cops') {
          const F = FL(3, 'A'), a1 = lerp(1.35, 2.65, k), a2 = a1 - 0.95;
          show(cop1, () => climb(cop1, { flight: F, a: a1, armR: flashArm(V(7.0, F.base + 2.6, -5.0)), look: V(7.0, F.base + 2.8, -5.0), lookK: 0.6 }));
          show(cop2, () => climb(cop2, { flight: F, a: a2, armR: flashArm(V(6.6, F.base + 2.0, -5.6)), look: V(6.8, F.base + 2.2, -5.2), lookK: 0.6 }));
          fl1.g.visible = fl2.g.visible = true; lightFit(cop1, fl1, V(7.0, F.base + 2.6, -5.0)); lightFit(cop2, fl2, V(6.6, F.base + 2.0, -5.6));
        } else if (id === 'search') {
          fl1.g.visible = fl2.g.visible = true;
          fl1.g.position.set(6.9, LV5 - 0.3, -7.6); fl1.g.lookAt(V(5.6 + 0.6 * Math.sin(t * 0.9), LV4 + 0.6, -9.3)); fl1.g.rotateY(Math.PI);
          fl2.g.position.set(5.6, LV4 + 1.1, -6.6); fl2.g.lookAt(V(6.3, LV6 + 1 + Math.sin(t * 0.7), -7.0 + 0.5 * Math.cos(t * 0.8))); fl2.g.rotateY(Math.PI);
          fl1.g.updateMatrixWorld(true); fl2.g.updateMatrixWorld(true);
        } else {
          const doorK = id === 'door5' ? smooth(0.15, 0.85, k) : 1;
          ST.door5.set(0.98 * doorK); ST.door5.light.intensity = 4 * smooth(0.1, 0.5, id === 'door5' ? k : 1);
          if (card5) card5.material.emissiveIntensity = 1.6;
          const manAt = V(4.2, LV5, -4.12);
          show(cop1, () => stand(cop1, { pos: V(5.05, LV5, -5.05), yaw: -2.2, breath: t * 0.3, armR: flashArm(V(4.2, LV5 + 1.3, -4.2)), look: V(4.2, LV5 + 1.6, -4.12), lookK: 0.8, cache: {} }));
          show(cop2, () => stand(cop2, { pos: V(5.75, LV5, -5.35), yaw: -2.0, breath: t * 0.3 + 1, armR: flashArm(V(4.3, LV5 + 0.9, -4.3)), look: V(4.2, LV5 + 1.6, -4.12), lookK: 0.6, cache: {} }));
          fl1.g.visible = fl2.g.visible = true; lightFit(cop1, fl1, V(4.2, LV5 + 1.3, -4.2)); lightFit(cop2, fl2, V(4.3, LV5 + 0.9, -4.3));
          if (doorK > 0.35) show(man, () => stand(man, { pos: manAt, yaw: Math.PI, breath: t * 0.25,
            look: id === 'night' || id === 'name' ? V(6.6, LV5 + 1.55, -5.4) : V(5.05, LV5 + 1.6, -5.05), lookK: 1.0, cache: {} }));
          show(ines, () => stand(ines, { pos: V(6.6, LV5, -5.4), yaw: Math.atan2(4.2 - 6.6, -4.12 + 5.4), breath: t * 1.2, look: V(4.2, LV5 + 1.66, -4.12), lookK: 1.0 }));
        }
        const near5 = id !== 'cops' && id !== 'search';
        fl1.sp.intensity = near5 ? 3 : 40; fl2.sp.intensity = near5 ? 2.5 : 34; fl1.beam.uniforms.uI.value = fl2.beam.uniforms.uI.value = near5 ? 0.08 : 0.22;
        cold.intensity = near5 ? 1.2 : 2.0; cold.position.set(6.2, (id === 'cops' ? LV3 + 0.8 : id === 'search' ? LV4 : LV5) + 1.0, -6.6);
        R.renderer.toneMappingExposure = 1.3; G.uSat.value = 0.85;
      }
      if (id === 'facade') {
        // outside, across the street: Apple at Inès's open window; under it, the 5th floor lights up
        room.openWindow(1); if (card5) card5.material.emissiveIntensity = 1.6 * smooth(0.1, 0.35, k);
        apple.root.visible = true; apple.root.position.set(HERO_BAY, ROOM.SILL + 0.36, -0.42); apple.root.rotation.y = 0.2; apple.update(t, { look: V(HERO_BAY + 2, LV2, 10) });
        police.group.visible = true; police.update(t); beaconLights.forEach((l, i) => (l.intensity = 400 * pulse(t, i * 0.33)));
        R.renderer.toneMappingExposure = 1.05;
      }
      const COLD = { stop: [5.0, LV3 + 2.3, -6.6, 2.5], go: [5.0, LV3 + 2.3, -6.6, 2.5], run: [7.6, LV5 + 0.4, -6.4, 3.0], runH: [7.0, LV4 + 1.2, -5.4, 3.0], knock: [6.2, LV3 + 2.2, -5.9, 1.8], bell: [6.2, LV3 + 2.2, -5.9, 1.8], stay: [6.2, LV3 + 2.2, -5.9, 1.4] };
      if (COLD[id] && !lit) { const c = COLD[id]; cold.position.set(c[0], c[1], c[2]); cold.intensity = c[3]; }
      updateSmoke(t, hz, ws);
      for (const bb of [haze, wisps]) bb.update(cam, R.renderer.getPixelRatio(), V(0.3, 1, 0.2).normalize());
      // camera
      const C = CAM[id] || CAM.name;
      C.apply(cam, id === 'run' ? tt : t);
      if (id === 'sms' || id === 'etsi' || id === 'phone3' || id === 'sms114' || id === 'info114') {
        // over the shoulder onto the screen: the camera rides the phone
        // (the camera holds still while the phone buzzes in front of it)
        const n = V(0, 0, 1).applyQuaternion(rideQ || phone.quaternion), upv = V(0, 1, 0).applyQuaternion(rideQ || phone.quaternion);
        const d = id === 'etsi' ? 0.5 : 0.3 + 0.02 * k;
        cam.position.copy(phone.position).addScaledVector(n, d).addScaledVector(upv, -0.06); cam.up.copy(upv); cam.lookAt(phone.position); cam.up.set(0, 1, 0); cam.fov = id === 'etsi' ? 46 : 40; cam.updateProjectionMatrix();
        screenGlow.intensity = 0; fill.intensity = Math.min(fill.intensity, 0.1);
      }
      if (id === 'neigh' || id === 'inside') ST.door3.group.updateMatrixWorld(true);
      const outsideCam = ['street', 'crowd', 'empty', 'police', 'facade', 'flash'].includes(id);
      cam.near = outsideCam ? 0.3 : 0.03; cam.far = outsideCam ? 3000 : 400; cam.updateProjectionMatrix();
      fill.position.copy(cam.position).add(V(0, 0.25, 0));
      if (id === 'grope') { fill.position.set(4.3, LV6 + 0.12, -4.72); fill.intensity = 0.25; }       // the torch pool's bounce on her face
      // overlay
      const endK = smooth(S.end.t0, S.end.t0 + 0.6, t);
      const close = ['face', 'torch', 'stay', 'him', 'night', 'name', 'crowd'].includes(id), phoneShot = ['phone3', 'sms', 'sms114', 'info114'].includes(id);
      ov.apply({ t, time: fmtClock(clockAt(t)), bat: batAt(t), statA: id === 'end' ? 0 : 1, serA: id === 'end' ? 0 : 1, part: 'PARTIE 2',
        capA: id === 'end' ? 0 : 1, capY: close ? 71 : phoneShot ? 74 : 57,
        etsi: id === 'etsi' ? smooth(S.etsi.t0, S.etsi.t0 + 0.25, t) : 0,
        rew: S.rewind.t0 <= t && t < S.rewind.t1 ? 1 : 0,
        news: id === 'stat' ? { a: '76 % DES FRANÇAISES', b: 'ont déjà été suivies dans la rue · Ville de Paris, d’après le Haut Conseil à l’égalité', k: smooth(S.stat.t0 + 0.1, S.stat.t0 + 0.4, t) }
          : id === 'info114' ? { a: '114 · URGENCE PAR SMS', b: 'Quand on ne peut pas parler · gratuit, 24 h/24', k: smooth(S.info114.t0 + 0.1, S.info114.t0 + 0.4, t) } : null,
        notif: id === 'sms' && t >= S.sms.t0 + 0.35 ? { from: 'Numéro inconnu', when: 'maintenant', msg: '6e, c’est ça ?', k: smooth(S.sms.t0 + 0.35, S.sms.t0 + 0.7, t) } : null,
        capHtml: opts.cover ? '<span class="w1">Quelqu’un vous </span><span class="r1">suit</span><span class="w1"> dans l’escalier…</span><br><span class="w1">vous </span><span class="r1">courez ?</span>' : null,
        peep: 0, black: 0 });
      if (id === 'end') G.uFade.value = 1;
      endEl.style.opacity = String(endK);
      tag.update(t, S.end.t0 + 0.6, endK);
      R.bloom.threshold = Math.min(0.85, 0.95 / R.renderer.toneMappingExposure);
      if (DBG) {
        const J = (n) => wp(ines.bones[n]);
        if (id === 'knock') { let mz = -9; for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let j = 1; j <= 3; j++) mz = Math.max(mz, J('RightHand' + f + j).z); console.log(`DBG knock t=${t.toFixed(2)} maxz=${mz.toFixed(3)} knuckle=${(J('RightHandMiddle1').z + 0.012).toFixed(3)} door=${(S_.ZW - 0.055).toFixed(3)}`); }
        const tipOf2 = (sd) => tipOf(ines, sd);
        if (id === 'bell') { const tip = tipOf2('Left'); console.log(`DBG bell t=${t.toFixed(2)} tip=${tip.x.toFixed(3)},${(tip.y - LV3).toFixed(3)},${tip.z.toFixed(3)} btn=7.350,1.402,${(S_.ZW - 0.015).toFixed(3)}`); }
        if (id === 'timer') { const tip = tipOf2('Right'); console.log(`DBG timer t=${t.toFixed(2)} tip=${tip.x.toFixed(3)},${tip.y.toFixed(3)},${tip.z.toFixed(3)} btn=${(S_.X1 - 0.02).toFixed(3)},1.200,-5.150`); }
        if (man.root.visible && (id === 'night' || id === 'him' || id === 'hook')) { const h = wp(man.bones.Head); console.log(`DBG head ${id} t=${t.toFixed(2)} ${h.x.toFixed(3)},${(h.y - (id === 'hook' ? 0 : LV5)).toFixed(3)},${h.z.toFixed(3)}`); }
        if (id === 'grope') { let mn = 9; for (const f of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) for (let j = 1; j <= 3; j++) mn = Math.min(mn, J('RightHand' + f + j).y - LV6); console.log(`DBG grope t=${t.toFixed(2)} lowest finger joint ${(mn * 100).toFixed(1)} cm above the floor`); }
        if (id === 'lock') { const tip = tipOf2('Right'), hd = room.door.localToWorld(KH.clone().add(V(0, 0, -0.026))); console.log(`DBG lock t=${t.toFixed(2)} tip-head ${(tip.distanceTo(hd) * 100).toFixed(1)} cm`); }
        if ((id === 'block' || id === 'dark') && man.root.visible) { const o = [];
          for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (const j of [1, 2, 3]) { const q2 = room.door.worldToLocal(wp(man.bones['RightHand' + f + j])); o.push(`${f[0]}${j}:${(q2.x * 100).toFixed(1)},${(q2.y * 100).toFixed(0)},${(q2.z * 100).toFixed(1)}`); }
          console.log(`DBG door ${id} t=${t.toFixed(2)} ${o.join(' ')}`); }
        if (phone.visible) {
          // every finger joint of the hand holding the phone, in phone space (cm); the body spans |x| < 3.6, |y| < 7.3, |z| < 0.39
          const side = phone.userData.side || 'Right', o = [];
          for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (const j of [1, 2, 3]) { const bn = ines.bones[side + 'Hand' + f + j]; if (!bn || !ines.root.visible) continue;
            const q2 = phone.worldToLocal(wp(bn)); if (Math.abs(q2.x) < 0.05 && Math.abs(q2.y) < 0.085 && q2.z > -0.016) o.push(`${f[0]}${j}:${(q2.x * 100).toFixed(1)},${(q2.y * 100).toFixed(1)},${(q2.z * 100).toFixed(1)}`); }
          if (o.length) console.log(`DBG phone ${id} t=${t.toFixed(2)} ${side} ${o.join(' ')}`);
        }
      }
      R.composer.render();
    },
  };
}
