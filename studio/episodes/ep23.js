// « 12 % » Partie 4 · Le noir (~2 min, the season 1 finale). 4:47 am: Inès's phone is dead; no light, no 17. A key turns in her
// lock, the handle goes down by itself, the door forces and stops on the bolt she pushed at 4:29 (Part 3). « Inès. Ouvre-moi. »
// « ET SI… » she had not bolted it: he walks in and shuts the door behind him. The real moves (notes/facts.md): no contact, get to
// safety, have someone call the 17; she opens her window and shouts, windows light up across the street, the 3rd-floor neighbour
// calls. The police find him between the 4th and the 5th with his keyring: a tag reads « 6e gauche ». He lived in her studio before
// her and kept a copy; nobody changed the lock. He read her first name on her letterbox. Twist: other keys, other tags.
// Every cut sits on the narration (audio/vo/ep23_*.json); every pose is rebuilt from rest each frame.
import * as THREE from 'three';
import { createRenderer, rng, smooth, clamp, CamPath } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { fadeShadowBorders, SIMPLEX } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, walk, sit, climb, POSE } from '../engine/poses.js';
import { makeCat } from '../engine/cat.js';
import { makePhone } from '../engine/props16.js';
import { makeEndTag } from '../engine/endtag.js';
import { buildWorld12 } from '../engine/world12.js';
import { LV, HERO_BAY, DORMER } from '../engine/paris12.js';
import { ROOM, STAIR } from '../engine/room12.js';
import { makePoliceCar } from '../engine/police12.js';
import { Overlay12 } from '../engine/s12.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(new THREE.Vector3());
const S_ = STAIR;
const lerp = (a, b, k) => a + (b - a) * k;
const [LV3, LV4, LV5, LV6] = [LV[3], LV[4], LV[5], LV[6]];
const Y0 = ROOM.Y0, DW = ROOM.DX1 - ROOM.DX0, DOORX = (ROOM.DX0 + ROOM.DX1) / 2;
const FACE_IN = ROOM.Z0 + 0.0525, FACE_OUT = ROOM.Z0 + 0.0075;    // her door's room face and landing face (shut)
// a straight flight of the stairwell, for climb(): A rises toward +z from the half landing to floor f, B toward -z from floor
// f - 1 to the half landing (makeStairwellFull: tread j's top is base + 0.02 + j * rise)
const FL = (f, w) => { const yt = LV[f], yb = LV[f - 1], yh = (yt + yb) / 2, rise = (yt - yh) / 10;
  return w === 'A' ? { p0: V(7.0, yh, S_.ZH), dir: V(0, 0, 1), base: yh, rise, run: S_.RUN, n: 10 } : { p0: V(5.5, yb, S_.ZC), dir: V(0, 0, -1), base: yb, rise, run: S_.RUN, n: 10 }; };
const YH45 = (LV4 + LV5) / 2;                                       // the half landing between the 4th and the 5th
const bez = (a, b, c, u) => a.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(b, 2 * u * (1 - u)).addScaledVector(c, u * u);

export async function create() {
  const q = new URLSearchParams(location.search);
  const DBG = q.get('dbg') === '1';
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = 0;
  POSE.lookFirst = true;                                           // heads turn before the arm IK (hands land on their targets)
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer();
  const VO = await (await fetch(`/audio/vo/ep23_${q.get('voice') || 'developpeuse'}.json`)).json();
  const ov = new Overlay12(VO, { etsiSub: 'SANS VERROU' });
  const W = buildWorld12(R.renderer, { stairFull: true });
  const scene = W.scene, room = W.room, ST = W.stair;
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.03, 400);
  R.renderPass.scene = scene; R.renderPass.camera = cam;
  R.bloom.strength = 0.42; R.bloom.radius = 0.55;
  const G = R.grade.uniforms;

  // ---------- the timeline, read from the narration ----------
  const Ln = VO.lines, L = (i) => Ln[i].t0;
  const Lw = (i, w, n = 1) => { const us = Ln[i].units.filter((x) => x.shown.toLowerCase().startsWith(w.toLowerCase())); const u = us[n - 1]; return u ? u.t0 : Ln[i].t0; };
  const END0 = Ln[Ln.length - 1].t0 - 0.25, DUR = Math.ceil((VO.duration + 4.4) * 10) / 10;
  const cut = (x) => x - 0.08;
  const SH = [
    ['hook', 0], ['dead', cut(L(1))], ['dark', cut(L(2))], ['lock', cut(L(3))], ['key', cut(L(4))], ['handle', cut(L(5))], ['force', cut(L(6))],
    ['bolt', cut(L(7))], ['bolt2', cut(L(8))], ['voice', cut(L(9))], ['apple', cut(L(10))], ['etsi', cut(L(11))], ['etsiOpen', cut(L(12))],
    ['etsiIn', cut(L(13))], ['stat', cut(L(14))], ['rewind', cut(L(15))], ['holds', cut(L(16))], ['away', cut(L(17))], ['think', cut(L(18))],
    ['open', cut(L(19))], ['shout', cut(L(20))], ['across', cut(L(21))], ['third', cut(L(22))], ['tip1', cut(L(23))], ['steps', cut(L(24))],
    ['sirens', cut(L(25))], ['found', cut(L(26))], ['keys', cut(L(27))], ['tag', cut(L(28))], ['before', cut(L(29))], ['double', cut(L(30))],
    ['tip2', cut(L(31))], ['mail', cut(L(32))], ['tip3', cut(L(33))], ['sit', cut(L(34))], ['alive', cut(L(35))], ['keys2', cut(L(36))],
    ['tags', cut(L(37))], ['end', END0],
  ].map(([id, t0], i, a) => ({ id, t0, t1: a[i + 1] ? a[i + 1][1] : DUR }));
  const S = Object.fromEntries(SH.map((s) => [s.id, s]));
  const shotAt = (t) => { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; };
  const kOf = (id, t) => clamp((t - S[id].t0) / (S[id].t1 - S[id].t0));
  const ETSI = (t) => t >= S.etsi.t0 && t < S.holds.t0;            // the « ET SI » branch (the rewind included)
  // his key, the handle, the door against the bolt (the soundtrack plays the same times)
  const T_KEY = Lw(3, 'métal') - 0.1;                               // the key slides into her lock
  const T_TURN = [L(4) + 0.15, L(4) + 0.75];                        // two turns of the key
  const HOOK_BANG = S.hook.t0 + 0.7 * (S.hook.t1 - S.hook.t0), BANG = L(7) + 0.1, BANG2 = Lw(16, 'Mais') + 0.15;
  const T_GONE = S.steps.t0 + 0.3;                                  // he pulls the key out and runs
  const atDoor = (t) => t < S.dead.t0 || (ETSI(t) && t < S.etsiOpen.t0 + 0.5) || (!ETSI(t) && t >= T_KEY - 1.0 && t < T_GONE);
  const keyIn = (t) => t < S.dead.t0 || ETSI(t) || (t >= T_KEY && t < T_GONE);
  const LEV = 0.5;                                                   // the handle's travel (rad)
  const leverAt = (t) => {
    if (t < S.dead.t0) return LEV * smooth(0.03, 0.62, kOf('hook', t)) * (1 - smooth(0.9, 1.0, kOf('hook', t)) * 0);
    if (ETSI(t)) return t >= S.etsiOpen.t0 && t < S.etsiIn.t0 ? LEV * smooth(0.06, 0.2, kOf('etsiOpen', t)) * (1 - smooth(0.5, 0.62, kOf('etsiOpen', t))) : 0;
    return LEV * smooth(S.handle.t0 + 0.2, S.handle.t1 - 0.1, t) * (1 - smooth(S.bolt.t1 - 0.3, S.bolt.t1 + 0.05, t));
  };
  const keyAng = (t) => { if (t < S.dead.t0) return 0.6; if (ETSI(t)) return t < S.etsiOpen.t0 ? 0 : 4 * Math.PI * smooth(S.etsiOpen.t0, S.etsiOpen.t0 + 0.9, t) + 0.6 * smooth(S.etsiOpen.t0 + 0.8, S.etsiOpen.t0 + 1.0, t);
    return 4 * Math.PI * smooth(T_TURN[0], T_TURN[1], t) + 0.6 * smooth(T_TURN[1], T_TURN[1] + 0.25, t); };
  // the leaf pushed in against the bolt (rad; the bolt's keeper gives ~2 mm at the latch edge)
  const rattle = (x) => (x >= 0 && x < 0.3 ? Math.exp(-x / 0.06) * Math.sin(x * 55) : 0);
  const pushAt = (t) => {
    if (t < S.dead.t0) { const x = t - HOOK_BANG; return x < 0 ? 0.0006 * smooth(HOOK_BANG - 0.8, HOOK_BANG, t) : 0.0026 * Math.exp(-x / 0.45) + 0.0016 * rattle(x); }
    if (ETSI(t)) return 0;
    let d = 0;
    if (t >= S.force.t0 && t < BANG) d += 0.0010 * smooth(S.force.t0 + 0.05, BANG - 0.1, t) + 0.0003 * Math.sin((t - S.force.t0) * 9.0) * smooth(S.force.t0, S.force.t0 + 0.3, t);
    for (const b of [BANG, BANG2]) { const x = t - b; if (x >= 0 && x < 3) d += 0.0028 * Math.exp(-x / 0.35) + 0.0018 * rattle(x); }
    return Math.max(0, d);
  };
  const boltShake = (t) => (t < S.dead.t0 ? rattle(t - HOOK_BANG) : rattle(t - BANG) + rattle(t - BANG2));

  // ---------- people ----------
  const env = scene.environment;
  const ines = await loadAvatar('Female_Adult_11', { env, facial: true }); scene.add(ines.root);
  const man = await loadAvatar('Male_Adult_07', { env }); scene.add(man.root);
  man.meshes.forEach((m) => { [m.material].flat().forEach((x) => { if (x.name && /body|cloth|torso/i.test(x.name) && x.color) x.color.multiplyScalar(0.55); }); });
  const cop1 = await loadAvatar('Police_Male_03', { env, lod: 512 }); scene.add(cop1.root);
  const cop2 = await loadAvatar('Police_Male_06', { env, lod: 512 }); scene.add(cop2.root);
  const everyone = [ines, man, cop1, cop2];
  const hideAll = () => { for (const a of everyone) a.root.visible = false; };
  const apple = makeCat(); scene.add(apple.root);
  const police = makePoliceCar(rng(5)); police.group.position.set(4.3, 0, 3.75); scene.add(police.group);
  const morph = (av, map) => { for (const m of av.meshes) { const d = m.morphTargetDictionary; if (!d) continue; m.morphTargetInfluences.fill(0);
    for (const [k, v] of Object.entries(map)) for (const [nm, i] of Object.entries(d)) if (nm.toLowerCase().includes(k.toLowerCase())) m.morphTargetInfluences[i] = v; } };

  // the additive beam of a torch (a cone along the light's -z), faded near the lens
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
  // her phone (dead) and his (its torch on: a spot light out of its back)
  const herPhone = makePhone(); scene.add(herPhone);
  const herGlow = new THREE.PointLight('#cfe0ff', 0, 1.2, 2); herGlow.position.set(0, 0, 0.2); herPhone.add(herGlow);
  const hisPhone = makePhone(); scene.add(hisPhone);
  const torch = new THREE.SpotLight('#eef3ff', 0, 12, 0.5, 0.5, 2); torch.position.set(-0.02, 0.06, -0.006); torch.castShadow = true; torch.shadow.mapSize.set(1024, 1024);
  torch.shadow.bias = -0.0006; torch.shadow.camera.near = 0.05; hisPhone.add(torch); { const tg = new THREE.Object3D(); tg.position.set(-0.02, 0.06, -1); hisPhone.add(tg); torch.target = tg; }
  const hisGlow = new THREE.PointLight('#bcd0ff', 0, 1.4, 2); hisGlow.position.set(0, 0, 0.18); hisPhone.add(hisGlow);
  const beamH = addBeam(hisPhone, 0);
  const drawHer = (mode, a = 1) => {
    const cv = herPhone.tex.image, c = cv.getContext('2d'), Wc = cv.width, Hc = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, Wc, Hc);
    if (mode === 'empty' && a > 0) {
      // the dead-battery screen: an empty battery with a red sliver, and the cable under it
      c.globalAlpha = a; c.translate(0, 190); c.strokeStyle = '#8e8e93'; c.lineWidth = 10; c.beginPath(); c.roundRect(Wc / 2 - 130, 380, 240, 120, 22); c.stroke();
      c.fillStyle = '#8e8e93'; c.beginPath(); c.roundRect(Wc / 2 + 116, 418, 18, 44, 6); c.fill();
      c.fillStyle = '#ff3b30'; c.beginPath(); c.roundRect(Wc / 2 - 118, 392, 16, 96, 6); c.fill();
      c.strokeStyle = '#8e8e93'; c.lineWidth = 8; c.beginPath(); c.moveTo(Wc / 2, 560); c.lineTo(Wc / 2, 640); c.stroke();
      c.lineWidth = 6; c.beginPath(); c.roundRect(Wc / 2 - 22, 640, 44, 62, 9); c.stroke(); c.fillStyle = '#8e8e93'; c.fillRect(Wc / 2 - 12, 702, 24, 22); c.globalAlpha = 1; c.setTransform(1, 0, 0, 1, 0, 0);
    }
    herPhone.tex.needsUpdate = true;
  };
  { const cv = hisPhone.tex.image, c = cv.getContext('2d'); const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#1b2740'); g.addColorStop(1, '#0b0f19');
    c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = '#fff'; c.font = '200 150px Inter, Arial'; c.textAlign = 'center'; c.fillText('4:47', cv.width / 2, 300);
    c.fillStyle = '#e8ecf6'; c.beginPath(); c.arc(cv.width / 2 - 110, 900, 46, 0, Math.PI * 2); c.fill(); hisPhone.tex.needsUpdate = true; }
  // the police flashlights (from Part 2)
  const flashlight = (k) => {
    const g = new THREE.Group(); scene.add(g);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.2, 14), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.6 })); body.rotation.x = Math.PI / 2; g.add(body);
    const sp = new THREE.SpotLight('#f4f7ff', 0, 16, 0.32, 0.45, 2); sp.position.set(0, 0, -0.11); const tg = new THREE.Object3D(); tg.position.set(0, 0, -1); g.add(sp, tg); sp.target = tg;
    sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0006; sp.shadow.camera.near = 0.05;
    const b = addBeam(g, k, 1.4); return { g, sp, beam: b, body };
  };
  const fl1 = flashlight(3), fl2 = flashlight(7);
  // the phone in a hand, resting on the nearly straight fingers: its plane follows the knuckle-to-last-joint line of the index,
  // middle and ring fingers (the rest pose keeps the fingers flexed ~25 degrees off the palm), its back PHZ above that line
  const tA = V(0, 0, 0), tB = V(0, 0, 0), mB = new THREE.Matrix4(), PHZ = 0.0175;
  const avgJ = (B, side, j) => tB.copy(wp(B[side + 'HandIndex' + j])).add(wp(B[side + 'HandMiddle' + j])).add(wp(B[side + 'HandRing' + j])).multiplyScalar(1 / 3).clone();
  function phoneFit(av, side, ph) {
    const B = av.bones, k1 = avgJ(B, side, 1), k3 = avgJ(B, side, 3), i1 = wp(B[side + 'HandIndex1']), p1 = wp(B[side + 'HandPinky1']);
    const X = k1.clone().sub(k3).normalize();
    const Z = X.clone().cross(tA.copy(i1).sub(p1)).normalize(); if (side === 'Left') Z.negate();
    const Yv = Z.clone().cross(X).normalize();
    mB.makeBasis(side === 'Left' ? X.clone().negate() : X, side === 'Left' ? Yv.clone().negate() : Yv, Z); ph.quaternion.setFromRotationMatrix(mB);
    ph.position.copy(k1).lerp(k3, 0.55).addScaledVector(Z, PHZ).addScaledVector(Yv, side === 'Left' ? -0.004 : 0.004); ph.updateMatrixWorld(true);
  }
  // a flashlight in a hand: along the fingers' line from the fist, pointing at `aim`
  function lightFit(av, f, aim) { const B = av.bones, hd = wp(B.RightHand), m1 = wp(B.RightHandMiddle1); f.g.position.copy(m1).lerp(hd, -0.2); f.g.lookAt(aim); f.g.rotateY(Math.PI); f.g.updateMatrixWorld(true); }

  // ---------- her door, rebuilt for the close-ups ----------
  // room12's lever and bolt hang a few mm off the leaf: here the roses sit on the leaf and the levers ride a spindle that turns.
  // Both sides get a lever (the handle goes down when he presses his), the main lock a through keyhole under each lever (the old
  // Paris « serrure à gorges »: the light of his torch shows through it until his key goes in). The bolt (Part 3) is a thumb-turn
  // with no key outside: only a hand inside can draw it
  const D = room.door;
  D.children.slice().forEach((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); const c = o.geometry.boundingBox.getCenter(V(0, 0, 0)); if (Math.abs(c.y - 1.02) < 0.03 && c.z > 0.06) o.visible = false; } });
  const boltG = D.children.find((o) => o.isGroup); if (boltG) boltG.position.z = FACE_IN - ROOM.Z0 + 0.006;   // its rose on the leaf
  const brass2 = new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.32, metalness: 0.9 });
  const PIV = [];
  for (const sd of [1, -1]) {                                       // 1 = the room side, -1 = the landing side
    const face = sd > 0 ? FACE_IN - ROOM.Z0 : FACE_OUT - ROOM.Z0;
    const rose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.012), brass2); rose.position.set(-DW + 0.08, 1.02, face + sd * 0.006); D.add(rose);
    const piv = new THREE.Group(); piv.position.set(-DW + 0.08, 1.02, face + sd * 0.012); D.add(piv); PIV.push(piv);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.014, 16), brass2); shank.rotation.x = Math.PI / 2; shank.position.z = sd * 0.006; piv.add(shank);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.022, 0.025), brass2); bar.position.set(0.06, 0, sd * 0.0215); piv.add(bar);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 14, 10), brass2); tip.scale.set(0.9, 0.9, 1); tip.position.set(0.125, 0, sd * 0.0215); piv.add(tip);
  }
  const setLever = (a) => { for (const p of PIV) p.rotation.z = -a; };
  // the keyhole plates: brass with a keyhole; the light through it (emissive) and his key's shank in it are drawn per frame
  const khCv = document.createElement('canvas'); khCv.width = 128; khCv.height = 320;
  const khEm = document.createElement('canvas'); khEm.width = 128; khEm.height = 320;
  const khTex = new THREE.CanvasTexture(khCv), khEmTex = new THREE.CanvasTexture(khEm); khTex.colorSpace = khEmTex.colorSpace = THREE.SRGBColorSpace; khTex.anisotropy = 8;
  const khShape = (c) => { c.beginPath(); c.arc(64, 120, 15, 0, Math.PI * 2); c.moveTo(57, 130); c.lineTo(53, 176); c.lineTo(75, 176); c.lineTo(71, 130); c.closePath(); };
  let khKey = '';
  const drawKeyhole = (lit, kin, ang) => {
    const key = `${lit.toFixed(2)}|${kin}|${ang.toFixed(3)}`; if (key === khKey) return; khKey = key;
    const c = khCv.getContext('2d'), g = c.createLinearGradient(0, 0, 128, 320); g.addColorStop(0, '#caa45e'); g.addColorStop(0.5, '#8f6c36'); g.addColorStop(1, '#bb944f');
    c.fillStyle = g; c.fillRect(0, 0, 128, 320); c.strokeStyle = 'rgba(70,48,18,0.55)'; c.lineWidth = 5; c.strokeRect(7, 7, 114, 306);
    for (const y of [32, 288]) { c.fillStyle = '#6d5126'; c.beginPath(); c.arc(64, y, 10, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#3a2a12'; c.lineWidth = 3; c.beginPath(); c.moveTo(56, y); c.lineTo(72, y); c.stroke(); }
    c.fillStyle = '#050403'; khShape(c); c.fill();
    if (kin) { c.save(); c.translate(64, 120); c.rotate(ang); c.fillStyle = '#41454b'; c.beginPath(); c.arc(0, 0, 11.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#a3a9b1'; c.beginPath(); c.arc(-3.5, -4, 3.6, 0, Math.PI * 2); c.fill(); c.fillStyle = '#25272b'; c.fillRect(-2.2, 1, 4.4, 10.5); c.restore(); }
    khTex.needsUpdate = true;
    const e = khEm.getContext('2d'); e.fillStyle = '#000'; e.fillRect(0, 0, 128, 320);
    if (lit > 0) { e.fillStyle = `rgba(215,228,255,${(kin ? 0.0 : 1) * lit})`; khShape(e); e.fill();
      if (kin) { e.filter = 'blur(1.5px)'; e.strokeStyle = `rgba(215,228,255,${0.22 * lit})`; e.lineWidth = 1.5; khShape(e); e.stroke(); e.filter = 'none'; } }
    khEmTex.needsUpdate = true;
  };
  const khMat = new THREE.MeshStandardMaterial({ map: khTex, emissive: '#ffffff', emissiveMap: khEmTex, emissiveIntensity: 1.6, metalness: 0.85, roughness: 0.35 });
  const KHY = 0.90;                                                  // the plates' centre (door-local y); the keyhole's round top 3.4 cm higher
  const KH_C = 0.9 + 0.045 - 0.09 * 120 / 320;
  for (const sd of [1, -1]) {
    const face = sd > 0 ? FACE_IN - ROOM.Z0 : FACE_OUT - ROOM.Z0;
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.09, 0.004), brass2); pl.position.set(-DW + 0.08, KHY, face + sd * 0.002); D.add(pl);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.09), khMat); fr.position.set(-DW + 0.08, KHY, face + sd * 0.0041); if (sd < 0) fr.rotation.y = Math.PI; D.add(fr);
  }
  // his key in the landing-side keyhole (a long-shanked bit key); it turns about its shank
  const steel = new THREE.MeshStandardMaterial({ color: '#b9bcc1', metalness: 1, roughness: 0.3 });
  const landKey = new THREE.Group(); landKey.position.set(-DW + 0.08, KH_C, FACE_OUT - ROOM.Z0 - 0.0041); D.add(landKey);
  { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.0031, 0.0031, 0.05, 12), steel); sh.rotation.x = Math.PI / 2; sh.position.z = -0.022; landKey.add(sh);
    const bw = new THREE.Mesh(new THREE.TorusGeometry(0.0115, 0.0027, 8, 28), steel); bw.rotation.y = Math.PI / 2; bw.scale.set(1, 1.18, 1); bw.position.z = -0.058; landKey.add(bw);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.006, 12), steel); col.rotation.x = Math.PI / 2; col.position.z = -0.045; landKey.add(col); }
  // light through the gaps: the strip under the leaf (with his feet), the pool it throws on her parquet, the latch-edge line
  const stripCv = document.createElement('canvas'); stripCv.width = 512; stripCv.height = 8;
  const stripTex = new THREE.CanvasTexture(stripCv); stripTex.colorSpace = THREE.SRGBColorSpace;
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.03, 0.017), new THREE.MeshBasicMaterial({ map: stripTex, transparent: true, depthWrite: false, toneMapped: true, side: THREE.DoubleSide }));
  strip.position.set(DOORX, Y0 + 0.0095, ROOM.Z0 + 0.012); scene.add(strip);
  const poolCv = document.createElement('canvas'); poolCv.width = 256; poolCv.height = 128;
  const poolTex = new THREE.CanvasTexture(poolCv); poolTex.colorSpace = THREE.SRGBColorSpace;
  const POOL_D = 0.55;
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(DW + 0.16, POOL_D), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(DOORX, Y0 + 0.0015, FACE_IN + POOL_D / 2 - 0.005); scene.add(pool);
  const edgeLine = new THREE.Mesh(new THREE.PlaneGeometry(0.0035, ROOM.DH - 0.04), new THREE.MeshBasicMaterial({ color: '#dfe8ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  edgeLine.position.set(ROOM.DX0 + 0.002, Y0 + ROOM.DH / 2, FACE_IN + 0.004); scene.add(edgeLine);
  const drawStrip = (lit, feet, rgb = '214,226,255') => {
    const c = stripCv.getContext('2d'); c.clearRect(0, 0, 512, 8);
    if (lit > 0) {
      c.fillStyle = `rgba(${rgb},${lit})`; c.fillRect(0, 0, 512, 8);
      for (const u of feet) { const g = c.createLinearGradient(u * 512 - 40, 0, u * 512 + 40, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.25, `rgba(10,10,12,${0.94 * lit})`); g.addColorStop(0.75, `rgba(10,10,12,${0.94 * lit})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(u * 512 - 40, 0, 80, 8); }
    }
    stripTex.needsUpdate = true; strip.visible = lit > 0;
    const p = poolCv.getContext('2d'); p.clearRect(0, 0, 256, 128);
    if (lit > 0) {
      const W0 = 256 * (DW - 0.03) / (DW + 0.16), x0 = (256 - W0) / 2;
      for (let y = 0; y < 128; y++) { const v = y / 127, a = lit * 0.5 * Math.exp(-v * 6.0) * (1 - v);
        for (let xx = 0; xx < 256; xx += 2) {
          const u = (xx - x0) / W0, spread = 0.03 + 0.05 * v; let m = smooth(-spread - 0.02, spread, u) * (1 - smooth(1 - spread, 1 + spread + 0.02, u));
          for (const f of feet) m *= 1 - 0.9 * (1 - smooth(0.04 + 0.04 * v, 0.07 + 0.07 * v, Math.abs(u - f)));
          if (m > 0.002) { p.fillStyle = `rgba(${rgb},${(a * m).toFixed(4)})`; p.fillRect(xx, y, 2, 1); } } }
    }
    poolTex.needsUpdate = true; pool.visible = lit > 0;
  };
  // the night through her dormer: a cool soft key across the room onto the door wall (no power in her flat)
  const winKey = new THREE.SpotLight('#9fb3d8', 0, 9, 0.66, 1, 2); winKey.castShadow = true; winKey.shadow.mapSize.set(1024, 1024); winKey.shadow.bias = -0.0005;
  winKey.shadow.camera.near = 0.2; winKey.position.set(HERO_BAY, Y0 + 1.75, -0.75); winKey.target.position.set(3.75, Y0 + 0.75, ROOM.Z0); scene.add(winKey, winKey.target);
  const fill = new THREE.PointLight('#a9b9d8', 0, 5, 2); scene.add(fill);                 // a soft bounce near the lens, set per shot
  const cold = new THREE.PointLight('#7f95c8', 0, 7, 2); scene.add(cold);                 // the night through the stairwell, for the dark shots
  const street = new THREE.SpotLight('#ffcf9a', 0, 14, 0.35, 0.8, 2); street.position.set(HERO_BAY + 0.6, LV6 - 3.5, 4.5); street.target.position.set(HERO_BAY, Y0 + 1.35, -0.8); scene.add(street, street.target);
  const beaconLights = [V(4.5, 2.8, 6.1), V(1.0, 2.5, 7.3)].map((p) => { const l = new THREE.PointLight('#3a66ff', 0, 30, 2); l.position.copy(p); scene.add(l); return l; });

  // ---------- the façades at 4:47: everyone asleep, then three windows across and the 3rd-floor neighbour ----------
  const allCards = W.buildings.flatMap((b) => b.userData.cards || []);
  // a 'dark' card keeps a near-black curtain as its emissive map and the warm one as its colour map: light it with the warm one
  for (const c of allCards) { const m = c.material, tx = c.userData.kind === 'dark' ? m.map : m.emissiveMap || m.map; m.map = tx; m.emissiveMap = tx; m.color.set('#1a1714'); m.emissive.set('#ffffff'); m.emissiveIntensity = 0; m.needsUpdate = true; }
  const cardNear = (p) => { let best = null, bd = Infinity; for (const c of allCards) { const d = c.getWorldPosition(V(0, 0, 0)).distanceTo(p); if (d < bd) { bd = d; best = c; } } return best; };
  const ACROSS = [[cardNear(V(1.6, LV5 + 1.4, 13)), 'une'], [cardNear(V(-1.6, LV6 + 0.9, 13)), 'deux'], [cardNear(V(-1.6, LV4 + 1.4, 13)), 'trois']];
  const AWAKE = [cardNear(V(-15.1, LV[2] + 1.4, 13)), cardNear(V(21.0, LV4 + 1.4, 13))];
  if (DBG) for (const [c, w] of ACROSS) { const p = c.getWorldPosition(V(0, 0, 0)); console.log(`DBG across ${w} card at ${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} kind ${c.userData.kind} L ${c.userData.L} visible ${c.visible}`); }
  const card3 = (W.hero.userData.cards || []).find((c) => c.userData.L === 3 && Math.abs(c.userData.x - 6.4) < 0.2);
  // the 3rd-floor neighbour behind his curtain: his shadow lifts the phone to his ear (a 0..1)
  const n3Cv = document.createElement('canvas'); n3Cv.width = 256; n3Cv.height = 384;
  const n3Tex = new THREE.CanvasTexture(n3Cv); n3Tex.colorSpace = THREE.SRGBColorSpace;
  let n3Key = -1;
  const drawN3 = (a) => {
    const ak = Math.round(a * 40) / 40; if (ak === n3Key) return; n3Key = ak;
    const c = n3Cv.getContext('2d'); c.filter = 'none';
    const g = c.createLinearGradient(0, 0, 0, 384); g.addColorStop(0, '#ffd9a2'); g.addColorStop(1, '#eaa96a'); c.fillStyle = g; c.fillRect(0, 0, 256, 384);
    for (let x = 0; x < 256; x += 22) { c.fillStyle = 'rgba(120,60,20,0.18)'; c.fillRect(x, 0, 7, 384); }
    c.filter = 'blur(6px)'; c.fillStyle = 'rgba(30,16,8,0.9)';
    // in profile, facing left: head, neck, shoulders; the right arm comes up, the hand (with the phone) at the ear
    c.beginPath(); c.ellipse(120, 140, 24, 30, 0, 0, Math.PI * 2); c.fill(); c.fillRect(110, 160, 24, 40);
    c.beginPath(); c.moveTo(60, 384); c.lineTo(66, 252); c.quadraticCurveTo(70, 210, 112, 198); c.lineTo(136, 196); c.quadraticCurveTo(186, 206, 192, 252); c.lineTo(198, 384); c.closePath(); c.fill();
    const sx = 168, sy = 214, ex = sx + 22 + 10 * a, ey = sy + 70 - 60 * a, hx = lerp(176, 140, a), hy = lerp(330, 146, a);
    c.lineCap = 'round'; c.strokeStyle = 'rgba(30,16,8,0.9)'; c.lineWidth = 26; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
    c.save(); c.translate(hx - 4, hy - 4); c.rotate(-0.35 * a); c.fillRect(-8, -26, 16, 46); c.restore();
    n3Tex.needsUpdate = true;
  };
  if (card3) { const m = card3.material; m.emissiveMap = n3Tex; m.map = n3Tex; m.needsUpdate = true; }
  const setCards = (t, id) => {
    for (const c of allCards) c.material.emissiveIntensity = 0;
    for (const c of AWAKE) if (c) c.material.emissiveIntensity = 0.9;
    if (ETSI(t) || t < S.shout.t0) return;
    ACROSS.forEach(([c, w], i) => { if (!c) return; const t0 = Lw(21, w) + 0.05; c.material.emissiveIntensity = 1.5 * smooth(t0, t0 + 0.12, t); });
    if (card3) card3.material.emissiveIntensity = 1.5 * smooth(S.across.t0 + 0.5, S.across.t0 + 0.8, t);
  };

  // ---------- his keyring (on a tread of the 4th-5th flight): five keys round a split ring, masking-tape tags in marker ----------
  const T3 = { y: LV4 + 0.02 + 3 * FL(5, 'B').rise, z: S_.ZC - 3.5 * S_.RUN, x: 5.24 };
  const keyring = new THREE.Group(); keyring.position.set(T3.x, T3.y, T3.z); keyring.rotation.y = 0.35; scene.add(keyring);
  const brassK = new THREE.MeshStandardMaterial({ color: '#b48f4e', metalness: 1, roughness: 0.32 });
  const tapeTex = (txt, w = 256, h = 120) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
    c.fillStyle = '#e9dfc4'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(150,130,90,${0.04 + 0.04 * ((i * 37) % 7) / 7})`; c.fillRect((i * 53) % w, (i * 29) % h, 18, 3); }
    c.fillStyle = '#16161a'; c.font = `italic 700 ${Math.round(h * 0.46)}px "Comic Sans MS", "Segoe Print", cursive, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.save(); c.translate(w / 2, h / 2 + 2); c.rotate(-0.04); c.fillText(txt, 0, 0); c.restore();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const tapeM = (txt) => new THREE.MeshStandardMaterial({ map: tapeTex(txt), roughness: 0.85 });
  const RR = 0.015, RT = 0.0012;                                    // the split ring: radius, wire
  { const ring = new THREE.Mesh(new THREE.TorusGeometry(RR, RT, 8, 56), steel); ring.rotation.x = Math.PI / 2; ring.position.y = RT; keyring.add(ring); }
  // a flat cylinder key, lying flat: bow (with its hole at local x = -0.005) and a toothed blade along +x; built in the xy plane
  const flatKeyGeo = (len, seed) => {
    const s = new THREE.Shape(), r = rng(seed); s.moveTo(0.0108, -0.0042); s.lineTo(len, -0.0042); s.lineTo(len + 0.0035, -0.0005);
    const n = 6; for (let i = 0; i <= n; i++) { const x = len + 0.002 - i * (len - 0.016) / n; s.lineTo(x, 0.0042 - (i % 2 ? 0.0012 + 0.0016 * r() : 0)); }
    s.lineTo(0.0108, 0.0042); s.absarc(0, 0, 0.0122, Math.asin(0.0042 / 0.0122), Math.PI * 2 - Math.asin(0.0042 / 0.0122), false);
    const h = new THREE.Path(); h.absarc(-0.0055, 0, 0.0034, 0, Math.PI * 2, true); s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.0021, bevelEnabled: false, curveSegments: 20 }); g.rotateX(-Math.PI / 2); return g; };
  // each key rests on the ring's wire at its hole and on the tread at its tip (tilted a few degrees)
  const KEYS = [];
  const addFlat = (ang, len, mat, txt, seed) => {
    const k = new THREE.Group(); const m = new THREE.Mesh(flatKeyGeo(len, seed), mat); m.position.x = 0.0055; k.add(m);
    if (txt) { const tp = new THREE.Mesh(new THREE.PlaneGeometry(0.019, 0.0105), tapeM(txt)); tp.rotation.x = -Math.PI / 2; tp.position.set(0.0055, 0.0021 + 0.00025, 0); k.add(tp); }
    const tilt = Math.atan2(2 * RT + 0.0002, len + 0.009);
    const hold = new THREE.Group(); hold.rotation.y = -ang; hold.position.set(RR * Math.cos(ang), 0, RR * Math.sin(ang));
    k.rotation.z = -tilt; k.position.y = 2 * RT + 0.0002 - 0.0021 * Math.cos(tilt) * 0 ; hold.add(k); keyring.add(hold); KEYS.push({ k, txt, hold }); return hold; };
  addFlat(0.35, 0.046, steel, '2e droite', 3); addFlat(1.45, 0.05, brassK, '4e face', 5); addFlat(2.5, 0.043, steel, '3e cour', 7); addFlat(4.35, 0.048, brassK, null, 9);
  // hers: a long bit key for an old « serrure à gorges », the tape folded round its shank into a flag
  const bitKey = new THREE.Group();
  { const hold = new THREE.Group(); const ang = 5.45; hold.rotation.y = -ang; hold.position.set((RR + 0.009) * Math.cos(ang), 0, (RR + 0.009) * Math.sin(ang)); keyring.add(hold); hold.add(bitKey);
    const bw = new THREE.Mesh(new THREE.TorusGeometry(0.0105, 0.0026, 8, 28), steel); bw.rotation.x = Math.PI / 2; bitKey.add(bw);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.0031, 0.0031, 0.058, 12), steel); sh.rotation.z = Math.PI / 2; sh.position.x = 0.0105 + 0.029; bitKey.add(sh);
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.0085, 0.0024, 0.0105), steel); bit.position.set(0.0105 + 0.052, 0, 0.0031 + 0.0052); bitKey.add(bit);
    const slv = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.011, 14), new THREE.MeshStandardMaterial({ color: '#e9dfc4', roughness: 0.85 })); slv.rotation.z = Math.PI / 2; slv.position.x = 0.0105 + 0.012; bitKey.add(slv);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.011, 0.03), tapeM('6e gauche')); flag.material.map.rotation = 0; flag.rotation.set(-Math.PI / 2 + 0.09, 0, Math.PI / 2); flag.position.set(0.0105 + 0.012, -0.0012, -0.0036 - 0.015); bitKey.add(flag);
    // the bow lies over the ring's wire: the key tilts down to its bit
    const lift = 2 * RT + 0.0026 + 0.0002; bitKey.position.y = lift; bitKey.rotation.z = -Math.atan2(lift - 0.0031 - 0.0002, 0.058); }
  // rest every key on the tread: its lowest point 0.2 mm above it
  keyring.updateMatrixWorld(true);
  const restOn = (o) => { const b = new THREE.Box3().setFromObject(o, true); o.position.y += T3.y + 0.0002 - b.min.y; o.updateMatrixWorld(true); };
  for (const { hold } of KEYS) restOn(hold);
  restOn(bitKey.parent);
  keyring.visible = false;

  // ---------- the hall's letterboxes at 22:41 (a small set of its own, far from the street) ----------
  const MX = -40, MZ = -30;
  const mail = new THREE.Group(); mail.position.set(MX, 0, MZ); scene.add(mail);
  { const wallM = new THREE.MeshStandardMaterial({ color: '#d8ccb4', roughness: 0.85 }), dado = new THREE.MeshStandardMaterial({ color: '#5a3f2c', roughness: 0.6 });
    const bw = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), wallM); bw.position.set(0, 1.5, 0); mail.add(bw);
    const dd = new THREE.Mesh(new THREE.BoxGeometry(4, 0.9, 0.02), dado); dd.position.set(0, 0.45, 0.01); mail.add(dd);
    const sideW = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), wallM); sideW.rotation.y = Math.PI / 2; sideW.position.set(-0.75, 1.5, 1.5); mail.add(sideW);
    const tc = document.createElement('canvas'); tc.width = 256; tc.height = 256; const c = tc.getContext('2d');
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#e8e4da' : '#1c1c1e'; c.fillRect(x * 32, y * 32, 32, 32); }
    const ft = new THREE.CanvasTexture(tc); ft.colorSpace = THREE.SRGBColorSpace; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(6, 6);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.4 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, 1.5); mail.add(fl); }
  const boxM = new THREE.MeshStandardMaterial({ color: '#9d978a', roughness: 0.45, metalness: 0.55 }), darkM = new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.6 });
  const NAMES = ['M. et Mme LEROY', 'DIALLO', 'S. NGUYEN', 'BENALI', 'Inès MARTIN', 'R. PETIT', 'GARNIER', 'COHEN', 'C. FAURE', 'LAMBERT', 'ROUSSEAU', 'J. MOREL'];
  const labelCv = (txt, hand, a = 1) => { const cv = document.createElement('canvas'); cv.width = 320; cv.height = 80; const c = cv.getContext('2d'); c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 320, 80);
    c.fillStyle = hand ? '#1d2f7a' : '#202024'; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (hand) { c.font = 'italic 600 40px "Segoe Print", "Comic Sans MS", cursive, serif'; const [f, l] = txt.split(' '); c.globalAlpha = a; c.fillText(f, 92, 42); c.globalAlpha = 1; c.fillText(l, 222, 42); }
    else { c.font = '600 30px Inter, Arial'; c.fillText(txt, 160, 42); } return cv; };
  let herLabel = null, herLabelA = -1;
  NAMES.forEach((nm, i) => {
    const col = i % 3, row = 3 - Math.floor(i / 3), x = -0.33 + col * 0.33, y = 0.98 + row * 0.17;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.155, 0.3), boxM); b.position.set(x, y, 0.15); mail.add(b);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.138, 0.006), boxM); fr.position.set(x, y, 0.303); mail.add(fr);
    const sl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.002), darkM); sl.position.set(x, y + 0.045, 0.3065); mail.add(sl);
    const lk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 14), new THREE.MeshStandardMaterial({ color: '#c9c4b5', metalness: 0.9, roughness: 0.3 })); lk.rotation.x = Math.PI / 2; lk.position.set(x + 0.11, y - 0.035, 0.308); mail.add(lk);
    const tx = new THREE.CanvasTexture(labelCv(nm, nm.startsWith('Inès'))); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.025), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7 })); lb.position.set(x - 0.05, y - 0.03, 0.3078); mail.add(lb);
    const lf = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.031, 0.002), boxM); lf.position.set(x - 0.05, y - 0.03, 0.3058); mail.add(lf);
    if (nm.startsWith('Inès')) herLabel = { mesh: lb, tx, x, y };
  });
  const setHerLabel = (a) => { if (!herLabel || Math.abs(a - herLabelA) < 0.004) return; herLabelA = a; herLabel.tx.image = labelCv('Inès MARTIN', true, a); herLabel.tx.needsUpdate = true; };
  const hallLight = new THREE.PointLight('#ffcf94', 0, 6, 2); hallLight.position.set(MX + 0.3, 2.6, MZ + 1.3); scene.add(hallLight);
  mail.visible = false;

  // ---------- the end card (a Paris street sign) + Apple peeking over "Abonne-toi pour la suite" ----------
  const endEl = document.getElementById('end');
  const sign = document.createElement('div');
  sign.style.cssText = 'position:absolute;left:50%;top:590px;transform:translateX(-50%);background:#22397a;border:8px solid #2e6b4a;outline:5px solid #e8e6df;border-radius:16px;padding:30px 60px;text-align:center;min-width:640px;font-family:Inter,sans-serif;color:#fff';
  sign.innerHTML = `<div style="display:inline-block;background:#ff2e2e;font-weight:800;font-size:30px;padding:6px 14px;border-radius:8px;letter-spacing:.06em">12 %</div>
    <div style="font-weight:800;font-size:46px;margin-top:18px;letter-spacing:.03em">FIN DE LA</div><div style="font-weight:800;font-size:80px;line-height:1;margin-top:6px">SAISON 1</div>`;
  const ask = document.createElement('div');
  ask.style.cssText = 'position:absolute;left:0;right:0;top:250px;text-align:center;font:800 62px/1.08 Inter,sans-serif;color:#fff;text-transform:uppercase;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  ask.innerHTML = 'Et vous,<br>vous avez <span style="color:#ff2e2e">changé</span><br>la serrure ?';
  const reply = document.createElement('div');
  reply.style.cssText = 'position:absolute;left:0;right:0;top:478px;text-align:center;font:700 42px/1.2 Inter,sans-serif;color:rgba(255,255,255,.92);text-shadow:0 0 3px #000,0 3px 0 rgba(0,0,0,.6)';
  reply.innerHTML = 'Réponds <span style="color:#ff2e2e;font-weight:800">OUI</span> ou <span style="color:#ff2e2e;font-weight:800">NON</span> en commentaire';
  const follow = document.createElement('div');
  follow.style.cssText = 'position:absolute;left:0;right:0;top:900px;text-align:center;font:800 52px/1.15 Inter,sans-serif;color:#fff;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  follow.innerHTML = '<span style="color:#ff2e2e">ABONNE-TOI</span><br><span style="font-weight:700;font-size:44px">pour voir la saison 2</span>';
  const fine = document.createElement('div');
  fine.style.cssText = 'position:absolute;left:60px;right:60px;top:1060px;text-align:center;font:500 29px Inter,sans-serif;color:rgba(255,255,255,.8);line-height:1.45';
  fine.innerHTML = 'Fiction. Conseils vérifiés : ministère de l’Intérieur, police nationale, gendarmerie, SSMSI.<br>Voix : Kyutai TTS (CC BY 4.0).';
  endEl.querySelector('.t').innerHTML = ''; endEl.querySelector('.n').innerHTML = '';
  endEl.appendChild(ask); endEl.appendChild(reply); endEl.appendChild(sign); endEl.appendChild(fine); endEl.appendChild(follow);
  const tag = makeEndTag({ text: 'Abonne-toi pour la suite', ssaa: globalThis.SSAA });

  await Promise.all(TEX_PENDING);

  // ---------- poses ----------
  const BL = []; { const r = rng(23); for (let b = 1.4; b < 140; b += 3.1 + 2.7 * r()) BL.push(b); }
  const blinkK = (t) => { let k = 0; for (const b0 of BL) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  let curT = 0;
  const show = (av, fn) => { av.root.visible = true; fn(); if (av === ines) ines.blink(blinkK(curT)); av.root.updateMatrixWorld(true); };
  // the palm's skin centre (the palm's normal points out of it: (Index1 - Pinky1) x (Middle1 - Hand) for a right hand)
  const palmN = (av, sd) => { const B = av.bones, lat = wp(B[sd + 'HandIndex1']).sub(wp(B[sd + 'HandPinky1'])), f = wp(B[sd + 'HandMiddle1']).sub(wp(B[sd + 'Hand']));
    return (sd === 'Right' ? lat.cross(f) : f.cross(lat)).normalize(); };
  const PALM = 0.012;
  const palmAt = (av, sd) => wp(av.bones[sd + 'Hand']).lerp(wp(av.bones[sd + 'HandMiddle1']), 0.55).addScaledVector(palmN(av, sd), PALM);
  // pose twice: the second time the wrist moves so that a point of the hand (`probe`) lands on `tgt` (4 rounds, < 1 mm)
  const pressPose = (av, side, tgt, pose, spec, probe) => {
    pose(spec); const want = tgt.clone().sub(probe().sub(wp(av.bones[side + 'Hand']))), res = [];
    for (let i = 0; i < 4; i++) {
      pose((sh, fwd, left, up) => ({ ...spec(sh, fwd, left, up), hand: want }));
      const r = tgt.clone().sub(probe()); res.push((r.length() * 100).toFixed(1)); if (i < 3) want.add(r);
    }
    if (DBG) console.log(`DBG press ${side} residuals ${res.join(' -> ')} cm`);
    return want;
  };
  // the torch held low in the right hand, its back pointing at `aimAt`, the screen toward its holder
  const torchHand = (aimAt, s = 1) => (sh, fwd, left, up) => {
    const hand = sh.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.28).addScaledVector(left, 0.08 * s);
    const back = aimAt.clone().sub(hand).normalize(), N = back.clone().negate();
    const F = up.clone().addScaledVector(back, -up.dot(back)).normalize();
    return { hand, pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5 * s).addScaledVector(fwd, -0.2), F, N, curl: 0.08, pk: -0.2 };
  };
  // the torch held close to the body, low (standing against a door): its back toward `aimAt`
  const torchLow = (aimAt) => (sh, fwd, left, up) => {
    const hand = sh.clone().addScaledVector(fwd, 0.08).addScaledVector(up, -0.44).addScaledVector(left, 0.1);
    const back = aimAt.clone().sub(hand).normalize(), F = up.clone().addScaledVector(back, -up.dot(back)).normalize();
    return { hand, pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(left, -0.35).addScaledVector(fwd, -0.3), F, N: back.clone().negate(), curl: 0.08, pk: -0.2 };
  };
  // her phone held in front of her chest while she sits (sit()'s hand spec: P = her hips)
  const phoneSit = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.27).addScaledVector(up, 0.42).addScaledVector(left, -0.07),
    pole: P.clone().addScaledVector(up, 0.25).addScaledVector(left, -0.6).addScaledVector(fwd, -0.2), F: up.clone().addScaledVector(fwd, 0.35).normalize(), N: up.clone().multiplyScalar(0.55).addScaledVector(fwd, -1).normalize() });
  const flashArm = (aim) => (sh, fwd, left, up) => { const hand = sh.clone().addScaledVector(fwd, 0.36).addScaledVector(up, -0.12).addScaledVector(left, 0.05);
    return { hand, pole: sh.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: aim.clone().sub(hand).normalize(), N: left.clone().negate(), curl: 0.85 }; };
  // his left arm hangs a little away from his side, so the armband clears his ribs
  const armLout = (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(up, -0.54).addScaledVector(left, 0.24).addScaledVector(fwd, 0.05),
    pole: sh2.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.6).addScaledVector(left, 0.32), F: V(0, -1, 0).addScaledVector(fwd, 0.15).normalize(), N: left.clone().negate() });
  // hands up, palms out (the arrest)
  const handsUp = (s) => (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(up, 0.2).addScaledVector(fwd, 0.2).addScaledVector(left, s * 0.13),
    pole: sh2.clone().addScaledVector(up, -0.35).addScaledVector(left, s * 0.6).addScaledVector(fwd, -0.15), F: up.clone().addScaledVector(left, s * 0.15).normalize(), N: fwd.clone(), curl: 0.12, thumb: 0.3 });

  // ---------- measured clearances ----------
  const skinPts = (av, step, fn) => { const v = V(0, 0, 0); av.root.updateMatrixWorld(true);
    for (const mesh of av.meshes) { if (!mesh.isSkinnedMesh) continue; mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count;
      for (let i = 0; i < n; i += step) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); fn(v, mesh, i); } } };
  // the nearest skin to a wall at z = zs (vertices with x in [x0, x1]); fitted poses move by the residual
  const nearZ = (av, x0, x1) => { let mz = Infinity; skinPts(av, 1, (v) => { if (v.x >= x0 && v.x <= x1) mz = Math.min(mz, v.z); }); return mz; };
  // her skin's clearance to the door wall as built: the shut leaf, the architrave, the plaster
  const surfZ = (x, y) => { const leaf = x > ROOM.DX0 + 0.005 && x < ROOM.DX1 - 0.005 && y < Y0 + ROOM.DH, arch = x > ROOM.DX0 - 0.07 && x < ROOM.DX1 + 0.07 && y < Y0 + ROOM.DH + 0.07;
    return leaf ? (room.door.rotation.y > 0.01 ? -Infinity : FACE_IN) : arch ? ROOM.Z0 + 0.0245 : ROOM.Z0; };
  const clearZ = (av) => { let worst = Infinity; skinPts(av, 1, (v, mesh, i) => { if (v.z > ROOM.Z0 + 0.3) return; const c = v.z - surfZ(v.x, v.y);
    if (c < worst) { worst = c; clearZ.at = [v.x, v.y, v.z, mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(i, 0)].name]; } }); return worst; };
  // the window wall as built (room12): the knee wall, the sill's box, the alcove's cheeks, the shut window: the skin's least signed
  // distance to them (> 0 clear); winClear.at = where
  const WINBOX = [['knee wall', ROOM.X0, ROOM.X1, Y0, ROOM.SILL - 0.04, ROOM.Z1, ROOM.Z1 + 0.3], ['knee wall', ROOM.X0, ROOM.AX0, Y0, ROOM.KNEE, ROOM.Z1, ROOM.Z1 + 0.3],
    ['knee wall', ROOM.AX1, ROOM.X1, Y0, ROOM.KNEE, ROOM.Z1, ROOM.Z1 + 0.3], ['sill', ROOM.AX0, ROOM.AX1, ROOM.SILL - 0.04, ROOM.SILL, ROOM.Z1 - 0.05, ROOM.AZ],
    ['cheek', ROOM.AX0 - 0.3, ROOM.AX0, ROOM.SILL, ROOM.WTOP, ROOM.Z1, ROOM.AZ], ['cheek', ROOM.AX1, ROOM.AX1 + 0.3, ROOM.SILL, ROOM.WTOP, ROOM.Z1, ROOM.AZ],
    ['window', ROOM.AX0, ROOM.AX1, ROOM.SILL, ROOM.WTOP, ROOM.AZ + 0.01 - 0.025, ROOM.AZ + 0.1]];
  const winClear = (av, open = false) => { let worst = Infinity;
    skinPts(av, 1, (v, mesh, i) => { if (v.z < ROOM.Z1 - 0.6) return;
      for (const [nm, x0, x1, y0, y1, z0, z1] of WINBOX) { if (open && nm === 'window') continue;
        const dx = Math.max(x0 - v.x, v.x - x1), dy = Math.max(y0 - v.y, v.y - y1), dz = Math.max(z0 - v.z, v.z - z1);
        const d = Math.max(dx, dy, dz) < 0 ? Math.max(dx, dy, dz) : Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0));
        if (d < worst) { worst = d; winClear.at = [nm, v.x.toFixed(2), v.y.toFixed(2), v.z.toFixed(3), domBone(mesh, i).name]; } } });
    return worst; };
  // furniture (room12.js): the clothes rail, the bed, the kitchenette, the desk and its chair, the plant on the sill, the rug's top
  const FURN = [['rail post', 3.09, 3.11, Y0, Y0 + 1.5, -4.26, -4.24], ['rail post', 3.69, 3.71, Y0, Y0 + 1.5, -4.26, -4.24], ['rail bar', 3.09, 3.71, Y0 + 1.49, Y0 + 1.51, -4.26, -4.24],
    ['coat', 3.10, 3.60, Y0 + 0.525, Y0 + 1.475, -4.28, -4.16], ['bed frame', 1.52, 2.48, Y0 + 0.04, Y0 + 0.30, -4.35, -2.35], ['mattress', 1.55, 2.45, Y0 + 0.30, Y0 + 0.50, -4.32, -2.38],
    ['headboard', 1.52, 2.48, Y0, Y0 + 0.745, -4.36, -4.30], ['duvet', 1.51, 2.49, Y0 + 0.47, Y0 + 0.59, -3.575, -2.325], ['kitchenette', 4.30, 4.90, Y0, Y0 + 0.88, -3.75, -2.55],
    ['desk', 1.53, 2.15, Y0, Y0 + 0.76, -2.28, -1.22], ['chair', 2.19, 2.61, Y0, Y0 + 0.9, -2.01, -1.59], ['plant', 2.76, 2.97, ROOM.SILL, ROOM.SILL + 0.3, -0.82, -0.62], ['rug', 2.6, 4.0, Y0, Y0 + 0.012, -3.1, -2.1]];
  const furnClear = (av) => { const best = FURN.map(() => Infinity);
    skinPts(av, 2, (v) => FURN.forEach(([, x0, x1, y0, y1, z0, z1], k) => { const dx = Math.max(x0 - v.x, v.x - x1), dy = Math.max(y0 - v.y, v.y - y1), dz = Math.max(z0 - v.z, v.z - z1);
      const d = Math.max(dx, dy, dz) < 0 ? Math.max(dx, dy, dz) : Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)); if (d < best[k]) best[k] = d; }));
    let k = 0; best.forEach((b, j) => { if (b < best[k]) k = j; }); return [FURN[k][0], best[k]]; };
  // the skin's distance to the door leaf (any angle): > 0 outside it
  const leafDist = (av) => { let best = Infinity, at = ''; const v2 = V(0, 0, 0); room.door.updateMatrixWorld(true);
    skinPts(av, 2, (v, mesh, i) => { v2.copy(v); room.door.worldToLocal(v2);
      const dx = Math.max(-DW + 0.005 - v2.x, v2.x + 0.005), dy = Math.max(0.012 - v2.y, v2.y - ROOM.DH), dz = Math.max(0.0075 - v2.z, v2.z - 0.0525);
      const d = Math.max(dx, dy, dz) < 0 ? Math.max(dx, dy, dz) : Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0));
      if (d < best) { best = d; at = `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)} ${mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(i, 0)].name}`; } });
    leafDist.at = at; return best; };
  // his skin in the doorway: > 0 inside the opening (clear of the jambs and the lintel)
  const frameMargin = (av) => { let worst = Infinity; skinPts(av, 2, (v) => { if (Math.abs(v.z - ROOM.Z0) > 0.04) return; const m = Math.min(v.x - ROOM.DX0, ROOM.DX1 - v.x, Y0 + ROOM.DH - v.y); if (m < worst) worst = m; }); return worst; };
  // the head's skin nearest to a plane z = zs from the -z side (his face at her door): returns zs - max z
  const headGap = (av, zs) => { let mz = -Infinity; const hb = av.bones.Head;
    skinPts(av, 1, (v, mesh, i) => { const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight; let bi = -1, bw = -1;
      for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; bi = si.getComponent(i, j); } } if (mesh.skeleton.bones[bi] !== hb) return; mz = Math.max(mz, v.z); });
    return zs - mz; };

  // a hand resting flat on a surface (the plane n.x = d, n pointing into it): the deepest skin of the hand and fingers past the plane
  const handBones = new Map();
  const handSet = (av, sd) => { const key = av.code + sd; if (!handBones.has(key)) { const st = new Set(); av.bones[sd + 'Hand'].traverse((o) => st.add(o)); handBones.set(key, st); } return handBones.get(key); };
  const handPen = (av, sd, n, d) => { const st = handSet(av, sd); let m = -Infinity;
    skinPts(av, 1, (v, mesh, i) => { const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight; let bi = -1, bw = -1;
      for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; bi = si.getComponent(i, j); } }
      if (st.has(mesh.skeleton.bones[bi])) { const p = n.dot(v) - d; if (p > m) { m = p; handPen.bone = mesh.skeleton.bones[bi].name; } } });
    return m; };
  const thumbFlat = new Map();
  const flatThumb = (av, sd) => { const key = av.code + sd; if (thumbFlat.has(key)) return thumbFlat.get(key);
    let best = 0.2, bestP = Infinity; const n = V(0, -1, 0);
    for (let th = 0.6; th >= -1.21; th -= 0.1) {
      stand(av, { pos: V(0, -50, 0), yaw: 0, [sd === 'Left' ? 'armL' : 'armR']: (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(fwd, 0.45), pole: sh.clone().addScaledVector(up, -0.5).addScaledVector(left, sd === 'Left' ? 0.4 : -0.4), F: fwd.clone(), N: n.clone(), curl: -0.3, pk: -0.3, thumb: th }) });
      av.root.updateMatrixWorld(true); const pn = handPen(av, sd, n, n.dot(palmAt(av, sd))); if (pn < bestP) { bestP = pn; best = th; } }
    thumbFlat.set(key, best); if (DBG) console.log(`DBG thumb ${key} flat at ${best.toFixed(1)}: deepest skin ${(bestP * 1000).toFixed(1)} mm under the palm`); return best; };
  // press a flat hand on a surface: pose with the palm's skin on the target, measure the hand's deepest skin, back off by it (+1.5 mm)
  const flatPress = (av, sd, target, n, pose, spec) => { const tg = target.clone(); let want = null, reach = true;
    const log = [];
    for (let r = 0; r < 4; r++) { want = pressPose(av, sd, tg, pose, spec, () => palmAt(av, sd));
      const res = tg.distanceTo(palmAt(av, sd)), pen = handPen(av, sd, n, n.dot(target)); log.push(`${(res * 1000).toFixed(1)}/${(pen * 1000).toFixed(1)}:${handPen.bone}`);
      if (res > 0.006) { reach = false; break; }
      if (r < 3) tg.addScaledVector(n, -clamp(pen + 0.0015, -0.03, 0.03)); }
    if (DBG) console.log(`DBG flatlog ${sd} residual/pen mm ${log.join(' ')}`);
    if (DBG) console.log(`DBG flat ${sd} hand skin ${(-handPen(av, sd, n, n.dot(target)) * 100).toFixed(2)} cm off the surface${reach ? '' : ' OUT OF REACH'}`);
    return want; };

  // the dominant bone of a skinned vertex
  const domBone = (mesh, i) => { const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight; let bi = -1, bw = -1;
    for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; bi = si.getComponent(i, j); } } return mesh.skeleton.bones[bi]; };
  // a walk over uneven ground (the rug): each foot's skin is measured against the ground under it, and a foot that sinks is
  // lifted by its depth (+1 mm) in a second pass
  const footSets = new Map();
  const footSet = (av, sd) => { const key = av.code + 'F' + sd; if (!footSets.has(key)) { const st = new Set(); av.bones[sd + 'Foot'].traverse((o) => st.add(o)); footSets.set(key, st); } return footSets.get(key); };
  const footPen = (av, sd, g) => { const st = footSet(av, sd); let m = -Infinity; skinPts(av, 1, (v, mesh, i) => { if (st.has(domBone(mesh, i))) m = Math.max(m, g(v.x, v.z) - v.y); }); return m; };
  const walkFit = (av, o) => { walk(av, o); const pL = footPen(av, 'Left', o.groundAt), pR = footPen(av, 'Right', o.groundAt);
    if (pL > -0.001 || pR > -0.001) { const aL = wp(av.bones.LeftFoot), aR = wp(av.bones.RightFoot), g0 = o.groundAt;
      walk(av, { ...o, groundAt: (x, z) => g0(x, z) + Math.max(0, (Math.hypot(x - aL.x, z - aL.z) < Math.hypot(x - aR.x, z - aR.z) ? pL : pR) + 0.001) }); }
    if (DBG) console.log(`DBG walk feet ${(-footPen(av, 'Left', o.groundAt) * 1000).toFixed(1)} / ${(-footPen(av, 'Right', o.groundAt) * 1000).toFixed(1)} mm above the ground (first pass ${(-pL * 1000).toFixed(1)} / ${(-pR * 1000).toFixed(1)})`); };
  // the skin's signed distance to the stair treads of flight B (the boxes room12 builds): < 0 inside a tread
  const treadPen = (av, F) => { let worst = Infinity, at = '';
    skinPts(av, 2, (v, mesh, i) => { if (v.x < S_.XB0 - 0.05 || v.x > S_.XB1 + 0.05) return; const d = (v.z - F.p0.z) * F.dir.z; const j0 = Math.floor(d / F.run);
      for (let j = j0 - 1; j <= j0 + 1; j++) { if (j < 0 || j >= F.n) continue; const top = F.base + 0.02 + j * F.rise, d0 = j * F.run - 0.01, d1 = (j + 1) * F.run + 0.01;
        const dx = Math.max(S_.XB0 - v.x, v.x - S_.XB1), dy = Math.max(top - 0.16 - v.y, v.y - top), dd = Math.max(d0 - d, d - d1);
        const sd = Math.max(dx, dy, dd) < 0 ? Math.max(dx, dy, dd) : Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dd, 0));
        if (sd < worst) { worst = sd; at = `${domBone(mesh, i).name} tread ${j} d ${(d - j * F.run).toFixed(3)}`; } } });
    treadPen.at = at; return worst; };

  // a body posed on flight F by climb(): lifted so its deepest vertex in a tread box clears it by 2 mm
  const liftOnTreads = (av, F) => { let pen = -Infinity;
    skinPts(av, 1, (v) => { if (v.x < S_.XB0 || v.x > S_.XB1) return; const d = (v.z - F.p0.z) * F.dir.z, j = Math.floor(d / F.run);
      if (j < 0 || j >= F.n || d - j * F.run < 0.005 || d - j * F.run > F.run - 0.015) return; pen = Math.max(pen, F.base + 0.02 + j * F.rise - v.y); });
    av.root.position.y += pen + 0.002; av.root.updateMatrixWorld(true); return pen; };

  for (const [av, sd] of [[man, 'Left'], [ines, 'Left'], [ines, 'Right']]) flatThumb(av, sd);

  // ---------- where people stand ----------
  const SIT_P = V(2.79, Y0, -4.12);                                  // Part 3's spot, between the bed and the clothes rail
  const APPLE_P = V(3.42, Y0, -3.93), APPLE_YAW = 2.45, APPLE_S = V(3.09, Y0, -3.98);
  const LAND_P = V(4.25, Y0, -5.0), IN2_P = V(3.78, Y0, -3.66), MAN_DOOR = V(4.1, Y0, -4.7);
  const WIN_P = V(3.2, Y0, -1.12);
  const DOOR_K = 0.62;                              // wide open: the leaf clears the kitchenette cabinet (it would touch it past ~0.68)
  const MAN_H = V(5.55, YH45, -8.82);
  const lockIn = () => room.door.localToWorld(V(-DW + 0.08, KH_C, FACE_IN - ROOM.Z0 + 0.0042));
  const lockOut = () => room.door.localToWorld(V(-DW + 0.08, KH_C, FACE_OUT - ROOM.Z0 - 0.0042));
  const leverIn = () => room.door.localToWorld(V(-DW + 0.14, 1.02, FACE_IN - ROOM.Z0 + 0.034));
  const boltIn = () => room.door.localToWorld(V(-DW + 0.08, 1.24, FACE_IN - ROOM.Z0 + 0.012));
  // the window's two leaves (room12: hinged at the bay's sides, opening outward): a point of a leaf in world space
  const leafPt = (s, k, lx, ly, lz) => { const r = s * k * 1.25, c = Math.cos(r), sn = Math.sin(r); return V(HERO_BAY + s * DORMER.ww / 2 + lx * c + lz * sn, ROOM.SILL + ly, ROOM.AZ + 0.01 - lx * sn + lz * c); };
  const leafNrm = (s, k) => { const r = s * k * 1.25; return V(-Math.sin(r), 0, -Math.cos(r)); };     // the room face's normal
  const stileX = (s) => -s * (DORMER.ww / 2 - 0.02 - 0.022);

  // ---------- cameras ----------
  const P2 = (s, a, b, ta, tb, fa, fb = fa) => new CamPath([[s.t0, a, ta, fa], [s.t1, b, tb, fb]], { easeIn: false, easeOut: false, arc: true });
  const SW = (d = 0.002) => V(0, d, 0);
  const T3c = V(T3.x, T3.y, T3.z);
  const CAM = {
    hook: P2(S.hook, V(4.0, Y0 + 0.95, -3.9), V(4.0, Y0 + 0.95, -3.98), V(4.0, Y0 + 0.95, -4.4), V(4.0, Y0 + 0.95, -4.4), 52, 50),
    dark: P2(S.dark, V(3.55, Y0 + 1.3, -2.45), V(3.5, Y0 + 1.25, -2.55), V(2.98, Y0 + 0.55, -4.15), V(2.98, Y0 + 0.55, -4.15), 50, 47),
    lock: P2(S.lock, V(3.87, Y0 + 0.97, -4.14), V(3.88, Y0 + 0.965, -4.17), V(3.965, Y0 + 0.93, -4.345), V(3.965, Y0 + 0.93, -4.345), 40, 36),
    key: P2(S.key, V(2.87, Y0 + 0.84, -3.5), V(2.86, Y0 + 0.84, -3.56), V(2.79, Y0 + 0.76, -4.16), V(2.79, Y0 + 0.76, -4.16), 40, 36),
    handle: P2(S.handle, V(3.99, Y0 + 1.0, -4.02), V(3.995, Y0 + 0.995, -4.06), V(4.0, Y0 + 0.97, -4.4), V(4.0, Y0 + 0.97, -4.4), 44, 41),
    force: P2(S.force, V(3.55, Y0 + 1.35, -3.05), V(3.57, Y0 + 1.34, -3.12), V(4.27, Y0 + 1.0, -4.4), V(4.27, Y0 + 1.0, -4.4), 50, 47),
    bolt: P2(S.bolt, V(3.92, Y0 + 1.31, -4.12), V(3.925, Y0 + 1.305, -4.15), V(3.965, Y0 + 1.24, -4.34), V(3.965, Y0 + 1.24, -4.34), 40, 37),
    bolt2: P2(S.bolt2, V(4.26, Y0 + 1.42, -3.9), V(4.25, Y0 + 1.4, -3.92), V(3.96, Y0 + 1.24, -4.34), V(3.96, Y0 + 1.24, -4.34), 36, 33),
    voice: P2(S.voice, V(3.32, Y0 + 1.58, -4.72), V(3.35, Y0 + 1.58, -4.7), V(4.2, Y0 + 1.5, -4.5), V(4.2, Y0 + 1.5, -4.5), 44, 41),
    apple: P2(S.apple, V(3.1, Y0 + 0.22, -3.45), V(3.12, Y0 + 0.215, -3.49), V(4.05, Y0 + 0.75, -4.4), V(4.05, Y0 + 0.75, -4.4), 50, 47),
    etsi: P2(S.etsi, V(3.4, Y0 + 0.95, -3.25), V(3.42, Y0 + 0.95, -3.3), V(4.25, Y0 + 1.05, -4.4), V(4.25, Y0 + 1.05, -4.4), 46, 43),
    etsiOpen: P2(S.etsiOpen, V(3.45, Y0 + 1.05, -2.95), V(3.46, Y0 + 1.05, -3.0), V(4.3, Y0 + 1.2, -4.45), V(4.3, Y0 + 1.2, -4.45), 48, 46),
    etsiIn: P2(S.etsiIn, V(4.45, Y0 + 1.9, -5.6), V(4.43, Y0 + 1.88, -5.55), V(4.0, Y0 + 1.1, -3.7), V(4.1, Y0 + 1.1, -4.1), 48, 46),
    stat: P2(S.stat, V(HERO_BAY + 1.5, 9.0, 12.2), V(HERO_BAY + 1.45, 9.1, 11.9), V(HERO_BAY, 15.0, 0), V(HERO_BAY, 15.1, 0), 50, 47),
    holds: P2(S.holds, V(3.8, Y0 + 1.27, -3.98), V(3.81, Y0 + 1.265, -4.02), V(3.98, Y0 + 1.14, -4.36), V(3.98, Y0 + 1.14, -4.36), 46, 43),
    away: P2(S.away, V(3.38, Y0 + 1.28, -1.45), V(3.37, Y0 + 1.27, -1.5), V(3.05, Y0 + 1.05, -3.2), V(3.08, Y0 + 1.1, -2.6), 50, 47),
    think: P2(S.think, V(3.45, Y0 + 1.5, -0.62), V(3.44, Y0 + 1.5, -0.64), V(3.2, Y0 + 1.53, -1.1), V(3.2, Y0 + 1.53, -1.1), 40, 37),
    open: P2(S.open, V(3.5, Y0 + 1.62, -1.8), V(3.48, Y0 + 1.61, -1.76), V(3.2, Y0 + 1.42, -0.45), V(3.2, Y0 + 1.42, -0.45), 50, 48),
    shout: P2(S.shout, V(HERO_BAY + 0.9, Y0 + 1.1, 9.5), V(HERO_BAY + 0.88, Y0 + 1.1, 9.3), V(HERO_BAY, Y0 + 1.35, -0.75), V(HERO_BAY, Y0 + 1.35, -0.75), 18, 16),
    across: P2(S.across, V(3.2, Y0 + 1.42, -0.68), V(3.19, Y0 + 1.42, -0.66), V(-0.5, Y0 - 1.6, 13), V(-0.5, Y0 - 1.6, 13), 42, 40),
    third: P2(S.third, V(7.2, LV3 + 1.2, 10.8), V(7.15, LV3 + 1.2, 10.6), V(6.4, LV3 + 1.4, 0), V(6.4, LV3 + 1.4, 0), 26, 23),
    tip1: P2(S.tip1, V(3.05, Y0 + 1.45, -2.4), V(3.06, Y0 + 1.45, -2.34), V(3.2, Y0 + 1.35, -0.5), V(3.2, Y0 + 1.35, -0.5), 48, 46),
    steps: P2(S.steps, V(4.27, Y0 + 0.24, -3.12), V(4.27, Y0 + 0.23, -3.2), V(4.27, Y0 + 0.01, -4.38), V(4.27, Y0 + 0.01, -4.38), 34, 32),
    sirens: P2(S.sirens, V(3.15, LV6 + 1.3, 0.35), V(3.15, LV6 + 1.28, 0.38), V(2.4, 0, 6.2), V(1.8, 0, 6.2), 52, 50),
    found: P2(S.found, V(6.25, LV4 + 2.05, -6.75), V(6.24, LV4 + 2.05, -6.8), V(5.6, YH45 + 1.1, -8.6), V(5.6, YH45 + 1.1, -8.6), 46, 43),
    keys: P2(S.keys, T3c.clone().add(V(0.2, 0.42, 0.36)), T3c.clone().add(V(0.19, 0.4, 0.33)), T3c.clone(), T3c.clone(), 34, 31),
    tag: P2(S.tag, T3c.clone().add(V(0.02, 0.17, 0.12)), T3c.clone().add(V(0.02, 0.16, 0.11)), T3c.clone().add(V(0.02, 0, -0.02)), T3c.clone().add(V(0.02, 0, -0.02)), 30, 28),
    before: P2(S.before, V(5.75, YH45 + 1.62, -8.1), V(5.74, YH45 + 1.62, -8.13), V(5.55, YH45 + 1.62, -8.75), V(5.55, YH45 + 1.62, -8.75), 32, 30),
    double: P2(S.double, V(4.08, Y0 + 1.08, -4.92), V(4.07, Y0 + 1.07, -4.88), V(3.96, Y0 + 0.93, -4.39), V(3.96, Y0 + 0.93, -4.39), 38, 35),
    tip2: P2(S.tip2, V(5.3, Y0 + 1.55, -5.65), V(5.27, Y0 + 1.54, -5.6), V(4.25, Y0 + 1.05, -4.4), V(4.25, Y0 + 1.05, -4.4), 50, 48),
    mail: P2(S.mail, V(MX + 0.12, 1.62, MZ + 1.0), V(MX + 0.08, 1.52, MZ + 0.78), V(MX - 0.05, 1.27, MZ + 0.3), V(MX - 0.05, 1.28, MZ + 0.3), 40, 32),
    tip3: P2(S.tip3, V(MX - 0.02, 1.33, MZ + 0.66), V(MX - 0.03, 1.32, MZ + 0.6), V(MX - 0.05, 1.29, MZ + 0.3), V(MX - 0.05, 1.29, MZ + 0.3), 30, 28),
    sit: P2(S.sit, V(3.55, Y0 + 1.3, -2.45), V(3.5, Y0 + 1.25, -2.55), V(2.98, Y0 + 0.55, -4.15), V(2.98, Y0 + 0.55, -4.15), 50, 47),
    alive: P2(S.alive, V(2.87, Y0 + 0.84, -3.5), V(2.86, Y0 + 0.84, -3.56), V(2.83, Y0 + 0.74, -4.16), V(2.83, Y0 + 0.74, -4.16), 40, 36),
    keys2: P2(S.keys2, T3c.clone().add(V(-0.16, 0.3, 0.28)), T3c.clone().add(V(-0.15, 0.28, 0.25)), T3c.clone(), T3c.clone(), 34, 31),
    tags: P2(S.tags, T3c.clone().add(V(0.04, 0.17, 0.11)), T3c.clone().add(V(0.0, 0.165, 0.115)), T3c.clone().add(V(0.02, 0, 0.0)), T3c.clone().add(V(-0.01, 0, 0.0)), 30, 29),
    end: P2(S.end, V(2.87, Y0 + 0.84, -3.5), V(2.86, Y0 + 0.84, -3.52), V(2.83, Y0 + 0.74, -4.16), V(2.83, Y0 + 0.74, -4.16), 36, 36),
  };
  const lampsAll = (k) => { ST.lights.forEach((l) => (l.intensity = 7 * k)); ST.lamps.forEach((lp) => (lp.material.emissiveIntensity = 3 * k)); };
  ST.lamps.forEach((lp) => { lp.material = ST.lampMat.clone(); });
  // his torch running down the stairs (« des pas dévalent l'escalier »): a path down the landing, flight A6, the half landing, flight B6
  const RUN = [V(4.3, LV6 + 1.0, -4.9), V(6.95, LV6 + 1.0, -5.55), V(7.0, (LV5 + LV6) / 2 + 1.0, -8.55), V(5.5, (LV5 + LV6) / 2 + 1.0, -8.7), V(5.5, LV5 + 1.0, -5.6), V(7.0, LV5 + 1.0, -5.55), V(7.0, YH45 + 1.0, -8.55)];
  const RUNL = [0]; for (let i = 1; i < RUN.length; i++) RUNL.push(RUNL[i - 1] + RUN[i].distanceTo(RUN[i - 1]));
  const runAt = (d) => { d = clamp(d, 0, RUNL[RUNL.length - 1] - 1e-4); let i = 1; while (RUNL[i] < d) i++; const u = (d - RUNL[i - 1]) / (RUNL[i] - RUNL[i - 1]);
    return { p: RUN[i - 1].clone().lerp(RUN[i], u), dir: RUN[i].clone().sub(RUN[i - 1]).normalize() }; };

  console.log('SHOTS ' + SH.map((x) => `${x.id}:${x.t0.toFixed(2)}`).join(' ') + ' DUR ' + DUR);
  if (DBG) console.log('DBG shapes ' + ines.shapeNames.filter((n) => /jaw|brow|funnel|mouthopen/i.test(n)).slice(0, 12).join(' '));
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
      let sh = shotAt(t), id = sh.id, tt = t;
      // the rewind replays the « ET SI » branch backwards (he walks back out, the door opens again, then shuts on the bolt-less lock)
      if (id === 'rewind') { const r = (t - S.rewind.t0) / (S.rewind.t1 - S.rewind.t0); tt = S.etsiIn.t1 - 0.001 - r * (S.etsiIn.t1 - S.etsiOpen.t0 - 0.002); sh = shotAt(tt); id = sh.id; }
      const k = clamp((tt - sh.t0) / Math.max(0.001, sh.t1 - sh.t0));
      const ROOMSHOTS = ['hook', 'dead', 'dark', 'lock', 'key', 'handle', 'force', 'bolt', 'bolt2', 'apple', 'etsi', 'etsiOpen', 'holds', 'away', 'think', 'open', 'tip1', 'steps', 'sit', 'alive', 'end'];
      const inRoom = ROOMSHOTS.includes(id), landing = ['voice', 'etsiIn', 'double', 'tip2'].includes(id), stairs = ['found', 'keys', 'tag', 'before', 'keys2', 'tags'].includes(id);
      const outside = ['stat', 'shout', 'third', 'sirens', 'across'].includes(id), hall = id === 'mail' || id === 'tip3';
      // reset everything a shot may touch (each frame is a pure function of t)
      hideAll(); apple.root.visible = false; herPhone.visible = false; hisPhone.visible = false; police.group.visible = false; keyring.visible = false; mail.visible = hall;
      fl1.g.visible = fl2.g.visible = true; fl1.body.visible = fl2.body.visible = false; fl1.sp.intensity = fl2.sp.intensity = 0; landKey.visible = false;
      torch.intensity = 0; hisGlow.intensity = 0; herGlow.intensity = 0; herPhone.screen.material.emissiveIntensity = 0; hisPhone.screen.material.emissiveIntensity = 0.6;
      beams.forEach((m) => { m.uniforms.uI.value = 0; m.uniforms.uTime.value = t; });
      lampsAll(0); ST.timerMat.emissiveIntensity = 1.2; fill.intensity = 0; cold.intensity = 0; winKey.intensity = 0; street.intensity = 0; hallLight.intensity = 0;
      ST.door3.set(0); ST.door5.set(0); ST.door3.light.intensity = 0; ST.door5.light.intensity = 0;
      W.blueSpot.intensity = 0; W.streetSpot.intensity = 14; cold.position.set(3.2, Y0 + 1.9, -1.6);
      W.stairLamp.intensity = 0; beaconLights.forEach((l) => (l.intensity = 0)); W.hemi.intensity = 0.35;
      const etsi = ETSI(tt);
      room.setDoor(pushAt(tt) / 1.45); room.setBolt(etsi ? (id === 'etsi' ? 1 - smooth(0.12, 0.5, k) : 0) : 1 + 0.012 * boltShake(tt));
      room.openWindow(0); room.setKitchen(0); room.rolled.visible = false; room.towelsHung.visible = false;
      W.hero.userData.setDoor(0); if (W.hero.userData.hallLight) W.hero.userData.hallLight.intensity = 0;
      W.epa.group.visible = W.fpt.group.visible = false;
      setLever(leverAt(tt)); landKey.visible = keyIn(tt); landKey.rotation.z = keyAng(tt);
      morph(ines, {});
      setCards(tt, id); drawN3(id === 'third' ? smooth(0.2, 0.6, k) : tt >= S.third.t1 ? 1 : 0);
      R.renderer.toneMappingExposure = 1.0;
      G.uSat.value = 1.0; G.uContrast.value = 1.05; G.uTint.value.set(1, 1, 1); G.uVignette.value = 0.6; G.uFade.value = 0; G.uFadeWhite.value = 0; G.uScan.value = 0; G.uBarrel.value = 0; G.uAberr.value = 0.0;
      scene.fog.density = outside ? 0.012 : 0.035; scene.fog.color.set(outside ? '#0b0d12' : '#14120f');
      if (!outside) { G.uAberr.value = 0.0012; W.hemi.intensity = 0.08; }
      if (outside) W.streetSpot.intensity = 0;                     // its glow on her sill reads as a lamp in her window from outside
      // the window: shut until she opens it, then it stays open
      const winK = etsi || tt < S.open.t0 ? 0 : id === 'open' ? 0.85 * smooth(0.2, 0.75, k) : 0.85;
      room.openWindow(winK);
      // light under her door: his torch on the landing (cold), later the landing lamp the police switched on (warm)
      const lit = atDoor(tt) ? 0.75 : tt >= S.sit.t0 - 0.2 ? 0.9 : 0;
      const doorOpen = room.door.rotation.y > 0.02;
      if (inRoom || landing) drawStrip(doorOpen ? 0 : lit, atDoor(tt) ? [0.3, 0.52] : [], atDoor(tt) ? '214,226,255' : '255,214,160'); else drawStrip(0, []);
      drawKeyhole(atDoor(tt) ? 0.85 : 0, keyIn(tt), keyAng(tt));
      edgeLine.material.opacity = atDoor(tt) ? clamp(pushAt(tt) / 0.0025) * 0.85 : 0;
      const atWin = ['think', 'open', 'tip1', 'shout', 'across'].includes(id);
      winKey.position.set(HERO_BAY, Y0 + 1.75, -0.75);
      if (inRoom) { winKey.intensity = 8; cold.intensity = 0.5; R.renderer.toneMappingExposure = 1.4; }
      if (atWin) { winKey.position.set(HERO_BAY + 0.4, Y0 + 2.9, 3.2); winKey.intensity = 11; W.streetSpot.intensity = 0; }
      if (landing) { cold.intensity = 1.2; cold.position.set(5.6, LV6 + 1.6, -6.2); R.renderer.toneMappingExposure = 1.35; }
      if (stairs) { cold.intensity = 0.9; cold.position.set(6.25, YH45 + 2.2, -7.2); R.renderer.toneMappingExposure = 1.35; }

      // ---- the people ----
      const inesSit = (look, lookK = 0.9, phone = true) => {
        const poseAt = (p) => show(ines, () => sit(ines, { pos: p, yaw: 0, legs: 'up', arms: 'knees', lean: -0.1, breath: t * 0.35, handR: phone ? phoneSit : undefined, curlR: phone ? 0.08 : undefined, pkR: phone ? -0.2 : undefined, look, lookK }));
        poseAt(SIT_P); poseAt(SIT_P.clone().add(V(0, 0, ROOM.Z0 + 0.008 - nearZ(ines, SIT_P.x - 0.4, SIT_P.x + 0.4))));
        if (phone) { herPhone.visible = true; phoneFit(ines, 'Right', herPhone); }
      };
      const lockLook = V(3.97, Y0 + 0.95, ROOM.Z0);
      // Apple: by the door, staring at the handle; at the end pressed against her
      const appleAt = (p, yaw, look, blinks = [], slow = []) => { apple.root.visible = true; apple.root.position.copy(p); apple.root.rotation.set(0, yaw, 0); apple.update(t, { look, blinkAt: blinks, slowBlinkAt: slow }); apple.root.updateMatrixWorld(true); };

      if (id === 'hook' || id === 'lock' || id === 'handle' || id === 'force' || id === 'bolt') {
        if (id === 'hook') { G.uSat.value = 0.6; G.uVignette.value = 0.85; }
      }
      if (['dead', 'dark', 'key'].includes(id) || (etsi && inRoom)) {
        inesSit(id === 'dead' ? null : id === 'key' ? lockLook : V(3.6, Y0 + 0.9, -2.0), id === 'key' ? 1.0 : 0.6, id === 'dead');
        if (id !== 'dead') { herPhone.visible = true; herPhone.position.set(2.56, Y0 + 0.0039, -3.93); herPhone.rotation.set(-Math.PI / 2, 0, 0.4); herPhone.updateMatrixWorld(true); }
        if (id === 'dead') { const a = smooth(0.32, 0.4, k) * (1 - smooth(0.78, 0.9, k)); drawHer('empty', a); herPhone.screen.material.emissiveIntensity = 0.32 * a; }
        else drawHer('off');
      }
      if (id === 'bolt2') {
        // 4:29 (Part 3): her fingers turn the bolt
        const turn = smooth(0.15, 0.55, k); room.setBolt(turn); room.setDoor(0); room.door.updateMatrixWorld(true);
        const knob = boltIn(), dz = V(0, 0, 1), side = V(-0.012, 0, 0).applyAxisAngle(dz, turn * Math.PI / 2);
        const tipOf = (sd) => { const a = wp(ines.bones[sd + 'HandIndex2']), b = wp(ines.bones[sd + 'HandIndex3']); return b.clone().addScaledVector(b.clone().sub(a).normalize(), 0.021); };
        show(ines, () => pressPose(ines, 'Right', knob.clone().add(side),
          (arm) => stand(ines, { pos: V(3.82, Y0, -3.98), yaw: Math.PI, breath: t * 0.4, armR: arm, look: knob, lookK: 0.8 }),
          (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.3), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: fwd.clone(), N: V(1, 0, 0).applyAxisAngle(dz, turn * Math.PI / 2), curl: 0.55, idx: 0.25, thumb: 0.4 }),
          () => tipOf('Right')));
        G.uSat.value = 0.2; G.uVignette.value = 0.95; G.uTint.value.set(1.05, 0.98, 0.92);
      }
      if (id === 'voice') {
        // on the landing: his face at the latch edge of her door, his left palm flat on it, the phone low in his right hand
        const palmT = V(4.4, Y0 + 1.42, FACE_OUT);
        const look = V(3.9, Y0 + 1.5, ROOM.Z0);
        const poseAt = (p) => { show(man, () => flatPress(man, 'Left', palmT, V(0, 0, 1),
          (arm) => stand(man, { pos: p, yaw: 0, lean: 0.14, breath: tt * 0.3, armL: arm, armR: torchLow(lockOut()), look, lookK: 0.9 }),
          (sh2, fwd, left, up) => ({ hand: palmT.clone().add(V(0, 0, -0.03)), pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, 0.5).addScaledVector(fwd, -0.1), F: V(0.15, 1, 0).normalize(), N: V(0, 0, 1), curl: -0.3, pk: -0.3, thumb: flatThumb(man, 'Left') }))); };
        let p = MAN_DOOR.clone(); poseAt(p);
        for (let r = 0; r < 2; r++) { p = p.clone().add(V(0, 0, headGap(man, FACE_OUT) - 0.018)); poseAt(p); }
        hisPhone.visible = true; phoneFit(man, 'Right', hisPhone); torch.intensity = 0.7; hisGlow.intensity = 0.1; beamH.uniforms.uI.value = 0.06;
      }
      if (id === 'etsiOpen') {
        // the bolt-less door: the key turns, the handle goes down, he shoves the door open (his left palm on it until it swings away)
        const op = DOOR_K * smooth(0.22, 0.62, k); room.setDoor(op); room.door.updateMatrixWorld(true);
        const touch = 1 - smooth(0.32, 0.42, k), push = room.door.localToWorld(V(-0.25, 1.12, FACE_OUT - ROOM.Z0));
        const P0 = V(4.2, Y0, -4.78);
        const nD = room.door.localToWorld(V(0, 0, 1)).sub(room.door.localToWorld(V(0, 0, 0))).normalize();
        if (touch > 0.01) show(man, () => flatPress(man, 'Left', push, nD,
          (arm) => stand(man, { pos: P0, yaw: 0, lean: 0.08, breath: tt * 0.3, armL: arm, armR: torchHand(V(3.95, Y0, -3.55)), look: V(3.6, Y0 + 1.0, -3.4), lookK: 0.8 }),
          (sh2, fwd, left, up) => ({ hand: push.clone(), pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, 0.5), F: V(0, 1, 0), N: nD, curl: -0.3, pk: -0.3, thumb: flatThumb(man, 'Left') })));
        else show(man, () => stand(man, { pos: P0, yaw: 0, lean: 0.04, breath: tt * 0.3, armL: armLout, armR: torchHand(V(3.95, Y0, -3.55)), look: V(3.6, Y0 + 1.0, -3.4), lookK: 0.8 }));
        hisPhone.visible = true; phoneFit(man, 'Right', hisPhone); torch.intensity = 9 * smooth(0.3, 0.6, k); beamH.uniforms.uI.value = 0.22 * smooth(0.3, 0.6, k); hisGlow.intensity = 0.05;
        G.uSat.value = 0.45; G.uTint.value.set(1.05, 0.97, 0.94);
      }
      if (id === 'etsiIn') {
        // he walks in (short careful steps that end with both feet down, so the pose holds), then his left palm goes to the leaf's
        // edge and draws the door to; it swings the last part on its own. One walk pose all through: no switch, no pop
        const P0 = V(4.3, Y0, -4.85), P1 = V(4.24, Y0, -4.28), u = smooth(0.0, 0.5, k);
        const arcTo = (uu) => { let d = 0, prev = P0; for (let i = 1; i <= 32; i++) { const pp = bez(P0, P1, IN2_P, uu * i / 32); d += pp.distanceTo(prev); prev = pp; } return d; };
        const LEN = arcTo(1), STR = LEN / 3;                                         // phase 1.5 at the end: both feet planted
        const pos = bez(P0, P1, IN2_P, u), tg2 = bez(P0, P1, IN2_P, Math.min(1, u + 0.01)).sub(bez(P0, P1, IN2_P, Math.max(0, u - 0.01)));
        const tEnd = IN2_P.clone().sub(bez(P0, P1, IN2_P, 0.99));
        const yaw = u < 0.995 ? Math.atan2(tg2.x, tg2.z) : Math.atan2(tEnd.x, tEnd.z), ph = arcTo(u) / (2 * STR);
        const dkAt = (kk) => DOOR_K * (1 - smooth(0.55, 0.98, kk)), K_REL = 0.7, dk = dkAt(k);
        room.setDoor(dk); room.door.updateMatrixWorld(true);
        const gw = smooth(0.5, 0.55, k) * (1 - smooth(K_REL, K_REL + 0.06, k));
        const edge = room.door.localToWorld(V(-DW + 0.005, 1.08, 0.03));
        const nIn = room.door.localToWorld(V(1, 0, 0)).sub(room.door.localToWorld(V(0, 0, 0))).normalize(), fIn = room.door.localToWorld(V(0, 0, 1)).sub(room.door.localToWorld(V(0, 0, 0))).normalize();
        const torchR = (sh2, fwd, left, up) => ({ ...torchHand(V(3.0, Y0 + 0.3, -3.6))(sh2, fwd, left, up), pole: sh2.clone().addScaledVector(up, -0.45).addScaledVector(left, -0.12).addScaledVector(fwd, -0.3) });
        const armHang = (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(up, -0.54).addScaledVector(left, 0.17).addScaledVector(fwd, -0.04 + 0.015 * Math.sin(Math.PI * 2 * (ph + 0.5))),
          pole: sh2.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.6).addScaledVector(left, 0.32), F: V(0, -1, 0).addScaledVector(fwd, 0.15).normalize(), N: left.clone().negate() });
        const walkWith = (armL) => walk(man, { pos, yaw, phase: ph, stride: STR, look: V(3.0, Y0 + 0.9, -3.9), lookK: 0.5, armR: torchR, armL });
        const gripSpec = (sh2, fwd, left, up) => ({ hand: edge.clone(), pole: sh2.clone().addScaledVector(up, -0.3).addScaledVector(left, 0.5).addScaledVector(fwd, -0.3), F: fIn.clone(), N: nIn.clone(), curl: -0.3, pk: -0.3, thumb: flatThumb(man, 'Left') });
        if (gw <= 0.001) show(man, () => walkWith(armHang));
        else show(man, () => {
          // the fitted contact (his palm flat on the edge face), then the wrist eased there from where it hangs; once he lets go
          // (K_REL) the contact is the one at that moment, and the door swings on away from his hand
          const rel = k > K_REL;
          if (rel) { room.setDoor(dkAt(K_REL)); room.door.updateMatrixWorld(true); }
          const eF = room.door.localToWorld(V(-DW + 0.005, 1.08, 0.03)), nF = room.door.localToWorld(V(1, 0, 0)).sub(room.door.localToWorld(V(0, 0, 0))).normalize();
          const want = flatPress(man, 'Left', eF, nF, walkWith, (sh2, fwd, left, up) => ({ ...gripSpec(sh2, fwd, left, up), hand: eF.clone(), N: nF.clone(),
            F: room.door.localToWorld(V(0, 0, 1)).sub(room.door.localToWorld(V(0, 0, 0))).normalize() }));
          if (rel) { room.setDoor(dk); room.door.updateMatrixWorld(true); }
          if (gw < 0.999) { walkWith(armHang); const hang = wp(man.bones.LeftHand); walkWith((sh2, fwd, left, up) => { const h = armHang(sh2, fwd, left, up), gs = gripSpec(sh2, fwd, left, up);
            return { hand: hang.clone().lerp(want, gw), pole: h.pole.clone().lerp(gs.pole, gw), F: h.F.clone().lerp(gs.F, gw).normalize(), N: h.N.clone().lerp(gs.N, gw).normalize(), curl: lerp(0.35, -0.3, gw), pk: lerp(0.35, -0.3, gw), thumb: lerp(0.15, flatThumb(man, 'Left'), gw) }; }); }
        });
        hisPhone.visible = true; phoneFit(man, 'Right', hisPhone); torch.intensity = 9; beamH.uniforms.uI.value = 0.2; hisGlow.intensity = 0.05;
        G.uSat.value = 0.45; G.uTint.value.set(1.05, 0.97, 0.94);
        // once the door is shut, his torch shows under it from inside
        if (dk < 0.004) drawStrip(0.6, [0.42, 0.6]);
      }
      if (id === 'etsi') { G.uSat.value = 0.35; G.uTint.value.set(1.06, 0.96, 0.94); }
      if (id === 'force') R.renderer.toneMappingExposure = 1.75;
      if (id === 'etsiIn') cold.intensity = 2.5;
      if (id === 'apple') { cold.intensity = 0.9; cold.position.set(4.1, Y0 + 0.35, -4.15); }   // his torch's light from under the door rims the cat
      if (id === 'stat') { R.renderer.toneMappingExposure = 1.05; if (etsi) { G.uSat.value = 0.4; G.uTint.value.set(1.05, 0.97, 0.94); } }
      if (id === 'away') {
        // she backs off from the door toward the window, over the rug (each foot on its own ground)
        const A0 = V(2.98, Y0, -3.86), A1 = V(3.15, Y0, -1.75), e = smooth(0.0, 1.0, k) * 0.9 + 0.1 * k, pos = A0.clone().lerp(A1, e);
        const gAt = (x, z) => Y0 + (x > 2.6 && x < 4.0 && z > -3.1 && z < -2.1 ? 0.012 : 0);
        pos.y = gAt(pos.x, pos.z);
        show(ines, () => walkFit(ines, { pos, yaw: Math.atan2(A1.x - A0.x, A1.z - A0.z), phase: A0.distanceTo(pos) / (2 * 0.55), stride: 0.55, groundAt: gAt, look: V(3.25, Y0 + 1.4, -0.4), lookK: 0.5 }));
      }
      // at the window: fitted to the knee wall (her nearest skin 1 cm off it), hands on the leaves, then on the sill
      const winPose = (spec, rounds = 2) => { let p = WIN_P.clone(); spec(p); for (let r = 0; r < rounds; r++) { p = p.clone().add(V(0, 0, Math.min(0, winClear(ines, winK > 0.05) - 0.008))); spec(p); } return p; };
      if (id === 'think') { winPose((p) => show(ines, () => stand(ines, { pos: p, yaw: 0, breath: t * 0.5, lean: 0.02, look: V(2.4, Y0 + 0.4, 12), lookK: 0.7 }))); }
      if (id === 'open') {
        // both hands push the leaves' inner stiles (at the middle rail) while the leaves swing out, then the leaves go on alone
        const kp = Math.min(winK, 0.24), hold = 1 - smooth(0.5, 0.62, k);
        const tR = leafPt(-1, kp, stileX(-1), 0.42, -0.025), tL = leafPt(1, kp, stileX(1), 0.42, -0.025), nR = leafNrm(-1, kp).negate(), nL = leafNrm(1, kp).negate();
        const spec = (tgt, nrm, s) => (sh2, fwd, left, up) => ({ hand: tgt.clone().lerp(sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, 0.1 * s), 1 - hold), pole: sh2.clone().addScaledVector(up, -0.45).addScaledVector(left, 0.45 * s).addScaledVector(fwd, -0.2),
          F: V(0, 1, 0).addScaledVector(left, -0.25 * s).normalize(), N: nrm, curl: -0.3, pk: -0.3, thumb: flatThumb(ines, s > 0 ? 'Left' : 'Right') });
        winPose((p) => {
          const lean = 0.35, hipBend = 0.25 + 0.5 * smooth(0.0, 0.3, k), look = V(3.2, Y0 + 1.0, 6);
          let wantR = null;
          show(ines, () => { wantR = flatPress(ines, 'Right', tR, nR, (arm) => stand(ines, { pos: p, yaw: 0, lean, hipBend, breath: t * 0.5, armR: arm, armL: spec(tL, nL, 1), look, lookK: 0.35 }), spec(tR, nR, -1));
            flatPress(ines, 'Left', tL, nL, (arm) => stand(ines, { pos: p, yaw: 0, lean, hipBend, breath: t * 0.5, armL: arm, armR: (a, b, c, d) => ({ ...spec(tR, nR, -1)(a, b, c, d), hand: wantR }), look, lookK: 0.35 }), spec(tL, nL, 1)); });
        });
        R.renderer.toneMappingExposure = 1.3;
      }
      if (['shout', 'across', 'tip1'].includes(id)) {
        // leaning on the sill, both palms on it, shouting into the street
        const sR = V(HERO_BAY - 0.15, ROOM.SILL, -0.8), sL = V(HERO_BAY + 0.17, ROOM.SILL, -0.8);
        const spec = (s) => (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(up, -0.4).addScaledVector(fwd, 0.3), pole: sh2.clone().addScaledVector(up, -0.3).addScaledVector(left, 0.6 * s).addScaledVector(fwd, -0.2),
          F: V(-0.12 * s, 0, 1).normalize(), N: V(0, -1, 0), curl: -0.3, pk: -0.3, thumb: flatThumb(ines, s > 0 ? 'Left' : 'Right') });
        const shoutK = id === 'shout' ? smooth(0.05, 0.2, k) * (1 - smooth(0.85, 1.0, k)) : 0;
        winPose((p) => {
          const lean = 0.35, hipBend = 0.55, look = id === 'across' ? V(1.6, Y0 + 7.5, 13) : V(3.0, Y0 + 9.5, 12);
          let wantR = null;
          show(ines, () => { wantR = flatPress(ines, 'Right', sR, V(0, -1, 0), (arm) => stand(ines, { pos: p, yaw: 0, lean, hipBend, breath: t * 0.9, armR: arm, armL: spec(1), look, lookK: 1.0 }), spec(-1));
            flatPress(ines, 'Left', sL, V(0, -1, 0), (arm) => stand(ines, { pos: p, yaw: 0, lean, hipBend, breath: t * 0.9, armL: arm, armR: (a, b, c, d) => ({ ...spec(-1)(a, b, c, d), hand: wantR }), look, lookK: 1.0 }), spec(1));
            if (shoutK > 0) morph(ines, { jawopen: 0.7 * shoutK, mouthfunnel: 0.15 * shoutK, browinnerup: 0.7 * shoutK, mouthstretch: 0.3 * shoutK }); });
          if (DBG && false) { const f = (v) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`; console.log(`DBG reach root ${f(p)} hips ${f(wp(ines.bones.Hips))} shR ${f(wp(ines.bones.RightArm))} elR ${f(wp(ines.bones.RightForeArm))} wrR ${f(wp(ines.bones.RightHand))} tgt ${f(sR)} want ${f(wantR)} head ${f(wp(ines.bones.Head))}`); }
        });
        if (id === 'shout') { street.intensity = 26; R.renderer.toneMappingExposure = 1.15; W.streetSpot.intensity = 0; if (DBG) { const h = wp(ines.bones.Head); console.log(`DBG shout head ${h.x.toFixed(2)},${h.y.toFixed(2)},${h.z.toFixed(2)} hips z ${wp(ines.bones.Hips).z.toFixed(2)}`); } }
        if (id === 'across') { R.renderer.toneMappingExposure = 1.2; ines.root.visible = false; }      // her eyes: she is the camera
        if (id === 'tip1') { winKey.intensity = 11; cold.intensity = 0.5; R.renderer.toneMappingExposure = 1.4; }
      }
      if (id === 'third') { R.renderer.toneMappingExposure = 1.1; }
      if (id === 'steps') {
        // his feet leave the strip of light under her door, and the light sinks away down the stairwell
        const go = smooth(0.12, 0.45, k), fadeL = 1 - smooth(0.3, 0.85, k);
        drawStrip(0.75 * fadeL, go < 0.98 ? [0.3 + 0.45 * go, 0.52 + 0.5 * go].filter((u) => u < 1.02) : [], '214,226,255');
      }
      if (id === 'sirens') {
        // the police car pulls up under her window, its light bar on
        police.group.visible = true; const u = clamp(k / 0.6);
        police.group.position.set(4.3 - 14 * (1 - u) * (1 - u), 0, 3.75); police.group.rotation.y = 0; police.update(t, 1); police.group.updateMatrixWorld(true);
        beaconLights.forEach((l, i) => { l.position.set(police.group.position.x + (i ? -3 : 0.2), 2.6, 6.0); l.intensity = 30 * (0.4 + 0.6 * Math.abs(Math.sin(t * 6.3 + i))); });
        R.renderer.toneMappingExposure = 1.1;
      }
      if (['found', 'before'].includes(id)) {
        // between the 4th and the 5th: he stands on the half landing, hands up; two officers below him on the flight, flashlights on him
        const F = FL(5, 'B'), face = MAN_H.clone().add(V(0, 1.62, 0));
        show(cop1, () => { climb(cop1, { flight: F, a: 1.89, ankle: -0.05, side: -0.2, armR: flashArm(face), look: face, lookK: 0.8, lean: 0.06 }); const pn = liftOnTreads(cop1, F); if (DBG) console.log(`DBG lift cop1 ${(pn * 100).toFixed(1)} cm`); });
        show(cop2, () => { climb(cop2, { flight: F, a: 1.35, ankle: -0.05, side: 0.15, armR: flashArm(MAN_H.clone().add(V(0, 1.2, 0))), look: face, lookK: 0.6, lean: 0.06 }); liftOnTreads(cop2, F); });
        show(man, () => stand(man, { pos: MAN_H, yaw: 0, breath: tt * 0.6, armR: handsUp(-1), armL: handsUp(1), look: wp(cop1.bones.Head), lookK: 0.8 }));
        fl1.body.visible = fl2.body.visible = true; lightFit(cop1, fl1, face); lightFit(cop2, fl2, MAN_H.clone().add(V(0, 1.2, 0)));
        fl1.sp.intensity = 4.5; fl2.sp.intensity = 3.5; fl1.beam.uniforms.uI.value = fl2.beam.uniforms.uI.value = 0.1;
        keyring.visible = true;
      }
      if (['keys', 'tag', 'keys2', 'tags'].includes(id)) {
        // the keyring on a tread, in a flashlight's beam
        keyring.visible = true;
        fl1.sp.intensity = 2.2; fl1.g.position.set(5.55, T3.y + 1.0, T3.z - 0.95); fl1.g.lookAt(T3c); fl1.g.rotateY(Math.PI); fl1.g.updateMatrixWorld(true);
        fl1.beam.uniforms.uI.value = 0.0; R.renderer.toneMappingExposure = 1.3;
      }
      if (id === 'double' || id === 'tip2') {
        // her door from the landing, a flashlight on the lock: he kept a copy, nobody changed it
        fl1.sp.intensity = id === 'double' ? 3.2 : 0; fl1.g.position.set(4.45, Y0 + 1.45, -5.45); fl1.g.lookAt(lockOut()); fl1.g.rotateY(Math.PI); fl1.g.updateMatrixWorld(true);
      }
      if (hall) {
        // 22:41, the hall's letterboxes: hers says « Inès »; the right label carries the surname only
        hallLight.intensity = 3.2; fill.intensity = 0.3; setHerLabel(id === 'tip3' ? 1 - smooth(0.35, 0.7, k) : 1);
        G.uSat.value = 0.55; G.uTint.value.set(1.06, 0.99, 0.9); G.uVignette.value = 0.85; R.renderer.toneMappingExposure = 1.15;
      }
      if (['sit', 'alive', 'end'].includes(id)) {
        // 5:10: she sits against the wall, the dead phone on the floor beside her; Apple pressed against her
        inesSit(id === 'sit' ? V(3.4, Y0 + 0.6, -3.0) : V(2.95, Y0 + 0.4, -3.6), 0.7, false);
        herPhone.visible = true; herPhone.position.set(2.56, Y0 + 0.0039, -3.93); herPhone.rotation.set(-Math.PI / 2, 0, 0.4); herPhone.updateMatrixWorld(true); drawHer('off');
      }
      if (inRoom && !['sit', 'alive', 'end', 'away', 'think', 'open', 'tip1'].includes(id)) appleAt(APPLE_P, APPLE_YAW, etsi ? lockLook : leverIn(), [S.apple.t0 + 1.4]);
      if (['sit', 'alive', 'end'].includes(id)) appleAt(APPLE_S, 0.05, wp(ines.bones.Head), [], [S.alive.t0 + 0.8]);
      if (inRoom) fill.intensity = id === 'hook' || id === 'holds' || id === 'force' || id === 'apple' ? 0.3 : ['lock', 'handle', 'bolt', 'apple', 'bolt2'].includes(id) ? 0.16 : ['key', 'think', 'alive', 'end', 'dead'].includes(id) ? 0.12 : 0.06;
      if (landing && id !== 'voice') fill.intensity = id === 'double' || id === 'tip2' ? 0.16 : 0.08;
      if (id === 'double' || id === 'tip2') cold.intensity = 2.4;
      if (id === 'tip2') lampsAll(1);                          // the officers have switched the landing light on
      // camera
      const C = CAM[id] || CAM.end;
      C.apply(cam, tt);
      if (id === 'dead') {
        // over the phone: the camera rides it
        const n = V(0, 0, 1).applyQuaternion(herPhone.quaternion), upv = V(0, 1, 0).applyQuaternion(herPhone.quaternion);
        cam.position.copy(herPhone.position).addScaledVector(n, 0.34).addScaledVector(upv, -0.06); cam.up.copy(upv); cam.lookAt(herPhone.position.clone().addScaledVector(upv, -0.036)); cam.up.set(0, 1, 0); cam.fov = 40; cam.updateProjectionMatrix();
        fill.intensity = 0.06; fill.position.copy(cam.position).addScaledVector(V(1, 0, 0).applyQuaternion(cam.quaternion), 0.35);
      }
      // a shake on the door's hits (slow sways, never per-frame jitter)
      { let sk = 0; for (const b of [HOOK_BANG, BANG, BANG2]) { const x = tt - b; if (x >= 0 && x < 0.7) sk += Math.exp(-x / 0.18) * Math.sin(x * 22); }
        if (inRoom && sk) { cam.rotateX(0.006 * sk); cam.rotateZ(0.004 * sk); } }
      cam.near = outside ? 0.3 : stairs || hall ? 0.02 : 0.02; cam.far = outside ? 3000 : 400; cam.updateProjectionMatrix();
      if (id !== 'dead') fill.position.copy(cam.position).add(V(0, 0.25, 0));
      if (S.rewind.t0 <= t && t < S.rewind.t1) { G.uScan.value = 1.0; G.uSat.value = 0.4; G.uAberr.value = 0.012; }
      // overlay
      const endK = smooth(S.end.t0, S.end.t0 + 0.6, t);
      const close = ['key', 'voice', 'think', 'alive', 'before', 'lock', 'handle', 'bolt', 'bolt2', 'apple'].includes(id), phoneShot = id === 'dead';
      const plate = id === 'dead' ? { a: '4 h 47', b: 'PARIS 18e · 6e ÉTAGE', k: smooth(S.dead.t0 + 0.1, S.dead.t0 + 0.4, t) * (1 - smooth(S.dead.t1 - 0.35, S.dead.t1, t)) }
        : id === 'sirens' ? { a: '4 h 58', b: 'PARIS 18e', k: smooth(S.sirens.t0 + 0.1, S.sirens.t0 + 0.4, t) * (1 - smooth(S.sirens.t1 - 0.35, S.sirens.t1, t)) }
          : id === 'mail' ? { a: '22 h 41', b: 'PLUS TÔT DANS LA SOIRÉE', k: smooth(S.mail.t0 + 0.1, S.mail.t0 + 0.4, t) * (1 - smooth(S.mail.t1 - 0.35, S.mail.t1, t)) } : null;
      ov.apply({ t, time: '04:47', bat: 0, statA: 0, serA: id === 'end' ? 0 : 1, part: 'PARTIE 4',
        capA: id === 'end' ? 0 : 1, capY: id === 'hook' ? 79 : close ? 71 : phoneShot ? 82 : 57, plate,
        etsi: id === 'etsi' ? smooth(S.etsi.t0, S.etsi.t0 + 0.25, t) : 0,
        rew: S.rewind.t0 <= t && t < S.rewind.t1 ? 1 : 0,
        news: id === 'stat' ? { a: 'CAMBRIOLAGES DE LOGEMENTS', b: 'plus de 210 000 par an · près de 600 par jour, tentatives comprises (SSMSI)', k: smooth(S.stat.t0 + 0.1, S.stat.t0 + 0.4, t) }
          : id === 'tip1' ? { a: 'QUELQU’UN ESSAIE D’ENTRER', b: 'pas de contact · on se met à l’abri · 17 (ou 112)', k: smooth(S.tip1.t0 + 0.1, S.tip1.t0 + 0.4, t) }
            : id === 'tip2' ? { a: 'EN EMMÉNAGEANT', b: 'on fait changer la serrure : d’anciens doubles circulent', k: smooth(S.tip2.t0 + 0.1, S.tip2.t0 + 0.4, t) }
              : id === 'tip3' ? { a: 'BOÎTE AUX LETTRES', b: 'le nom seul · jamais le prénom', k: smooth(S.tip3.t0 + 0.1, S.tip3.t0 + 0.4, t) } : null,
        notif: null,
        capHtml: opts.cover ? '<span class="w1">Quelqu’un a la </span><span class="r1">clé</span><span class="w1"> de chez vous…</span><br><span class="w1">vous avez changé la </span><span class="r1">serrure ?</span>'
          : id === 'hook' ? Ln[0].units.map((u) => { const on = t >= u.t0 - 0.12; return `<span class="${u.red ? (on ? 'r1' : 'r0') : (on ? 'w1' : 'w0')}">${u.shown}</span>${u.shown.endsWith('…') ? '<br>' : ' '}`; }).join('') : null,
        peep: 0, black: 0 });
      if (id === 'end') G.uFade.value = 1;
      endEl.style.opacity = String(endK);
      tag.update(t, S.end.t0 + 0.6, endK);
      R.bloom.threshold = Math.min(0.85, 0.95 / R.renderer.toneMappingExposure);
      if (DBG) {
        if (ines.root.visible) { const [fn, fc] = furnClear(ines); let s = `DBG ines ${id} t=${t.toFixed(2)} furniture: ${fn} ${(fc * 100).toFixed(1)} cm`;
          if (wp(ines.bones.Hips).z < -3.6) { clearZ.at = null; const c = clearZ(ines), a = clearZ.at; if (a) s += `; door wall ${(c * 100).toFixed(1)} cm at ${a[0].toFixed(2)},${a[1].toFixed(2)},${a[2].toFixed(3)} ${a[3]}`; }
          if (wp(ines.bones.Hips).z > -1.8) { winClear.at = null; const w = winClear(ines, winK > 0.05); if (winClear.at) s += `; window wall ${(w * 100).toFixed(1)} cm at ${winClear.at.join(',')}`; }
          console.log(s); }
        if (man.root.visible && room.door.rotation.y > 0.01) console.log(`DBG man-leaf ${id} t=${t.toFixed(2)} ${(leafDist(man) * 100).toFixed(1)} cm at ${leafDist.at}; doorway margin ${(frameMargin(man) * 100).toFixed(1)} cm`);
        if (man.root.visible && id === 'voice') console.log(`DBG voice face ${(headGap(man, FACE_OUT) * 100).toFixed(1)} cm from the door; leaf ${(leafDist(man) * 100).toFixed(1)} cm at ${leafDist.at}`);
        if (cop1.root.visible) { const a1 = treadPen(cop1, FL(5, 'B')), s1 = treadPen.at, a2 = treadPen(cop2, FL(5, 'B')), s2 = treadPen.at; console.log(`DBG cops ${id} treads ${(a1 * 100).toFixed(1)} cm (${s1}) / ${(a2 * 100).toFixed(1)} cm (${s2})`); }
        if (keyring.visible) { const b = new THREE.Box3().setFromObject(keyring, true); console.log(`DBG keys lowest ${((b.min.y - T3.y) * 1000).toFixed(2)} mm above the tread, z ${b.min.z.toFixed(3)}..${b.max.z.toFixed(3)} (tread top ${(S_.ZC - 3 * S_.RUN).toFixed(3)}..${(S_.ZC - 4 * S_.RUN).toFixed(3)})`); }
        for (const [ph, av] of [[herPhone, ines], [hisPhone, man]]) if (ph.visible && av.root.visible) { const o = []; for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (const j of [1, 2, 3]) { const bn = av.bones['RightHand' + f + j]; const q2 = ph.worldToLocal(wp(bn)); if (Math.abs(q2.x) < 0.05 && Math.abs(q2.y) < 0.085 && q2.z > -0.012) o.push(`${f[0]}${j}:${(q2.z * 100).toFixed(1)}`); } if (o.length) console.log(`DBG phone ${id} ${o.join(' ')}`); }
        if (apple.root.visible && ines.root.visible && ['sit', 'alive'].includes(id)) { let md = Infinity; const pts = []; apple.root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.geometry.attributes.position) { const pa = o.geometry.attributes.position, v = V(0, 0, 0); for (let i = 0; i < pa.count; i += 7) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); pts.push(v.clone()); } } });
          skinPts(ines, 3, (v) => { for (const p of pts) { const d = v.distanceTo(p); if (d < md) md = d; } }); console.log(`DBG apple ${id} nearest skin ${(md * 100).toFixed(1)} cm`); }
      }
      R.composer.render();
    },
  };
}
