// « 12 % » Partie 3 · Le 5e (~2 min). 4:28 am: the police leave (a neighbour who says good night breaks no law). Inès's power is
// out, her phone at 1 %. 4:41: « Police, ouvrez ! » On the landing a man holds a card in front of his face, an orange POLICE armband
// on his arm. « ET SI… » she opens: it is the man from the 5th. The real moves (notes/facts.md): don't open, ask for the name and the
// service, ask to see the card at the peephole (credit-card size, a photo), a plainclothes officer wears his 7-digit RIO on his
// armband, and when in doubt call the 17. No patrol was sent; he goes back down. Twist: from the wall vent, « Je t'entends, Inès. »
// Her phone dies: 0 %. Every cut sits on the narration (audio/vo/ep22_*.json); every pose is rebuilt from rest each frame.
import * as THREE from 'three';
import { createRenderer, rng, smooth, clamp, CamPath } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { fadeShadowBorders, Billboards, smokeAtlas, SIMPLEX } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, walk, sit, POSE } from '../engine/poses.js';
import { makeCat } from '../engine/cat.js';
import { makePhone } from '../engine/props16.js';
import { makeEndTag } from '../engine/endtag.js';
import { buildWorld12 } from '../engine/world12.js';
import { LV, HERO_BAY, FIRE_BAY } from '../engine/paris12.js';
import { ROOM, STAIR } from '../engine/room12.js';
import { updateBeacons, pulse } from '../engine/trucks12.js';
import { makePoliceCar } from '../engine/police12.js';
import { Overlay12, fmtClock } from '../engine/s12.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(new THREE.Vector3());
const S_ = STAIR;
const lerp = (a, b, k) => a + (b - a) * k;
const [LV2, LV5, LV6] = [LV[2], LV[5], LV[6]];
const Y0 = ROOM.Y0, DW = ROOM.DX1 - ROOM.DX0, DOORX = (ROOM.DX0 + ROOM.DX1) / 2;
const FACE_IN = ROOM.Z0 + 0.0525;            // her door's room face (closed); its landing face is ROOM.Z0 + 0.0075

export async function create() {
  const q = new URLSearchParams(location.search);
  const DBG = q.get('dbg') === '1';
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = 0;
  POSE.lookFirst = true;                                           // heads turn before the arm IK (hands land on their targets)
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer();
  const VO = await (await fetch(`/audio/vo/ep22_${q.get('voice') || 'developpeuse'}.json`)).json();
  const ov = new Overlay12(VO, { etsiSub: 'ELLE OUVRAIT' });
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
    ['hook', 0], ['face', cut(L(1))], ['window', cut(L(2))], ['win5', cut(L(4))], ['power', cut(L(5))], ['phone1', cut(L(6))],
    ['bolt', cut(L(7))], ['sit', cut(Lw(7, 'Elle', 2))], ['apple', cut(L(8))], ['knock', cut(L(9))], ['police', cut(L(11))],
    ['door2', cut(L(12))], ['feet', cut(L(13))], ['approach', cut(L(14))], ['peep1', cut(L(15))], ['armband', cut(L(16))],
    ['etsi', cut(L(17))], ['open', cut(L(18))], ['lower', cut(L(19))], ['inside', cut(L(20))], ['law', cut(L(21))], ['rewind', cut(L(22))],
    ['ask', cut(L(23))], ['answer', cut(L(24))], ['eye', cut(L(25))], ['card', cut(L(26))], ['rio', cut(L(27))], ['rio2', cut(L(28))],
    ['dial', cut(L(29))], ['whisper', cut(L(30))], ['nopatrol', cut(L(31))], ['tip', cut(L(32))], ['stop', cut(L(33))], ['door5', cut(L(34))],
    ['breathe', cut(L(35))], ['apple2', cut(L(36))], ['grille', cut(L(37))], ['murmur', cut(L(38))], ['hear', cut(L(39))], ['dead', cut(L(40))], ['end', END0],
  ].map(([id, t0], i, a) => ({ id, t0, t1: a[i + 1] ? a[i + 1][1] : DUR }));
  const S = Object.fromEntries(SH.map((s) => [s.id, s]));
  const shotAt = (t) => { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; };
  const ETSI = (t) => t >= S.etsi.t0 && t < S.ask.t0;          // the « ET SI » branch (the rewind included)
  // story clock (minutes after midnight) and battery; the landing light (the stairwell timer) and the man behind her door
  const clockAt = (t) => { if (t < S.face.t0 || ETSI(t)) return 4 * 60 + 42;
    const keys = [[S.face.t0, 268], [S.power.t0, 269], [S.knock.t0, 281], [S.approach.t0, 282], [S.ask.t0, 283], [S.dial.t0, 284], [S.stop.t0, 285], [S.breathe.t0, 286]];
    let m = 268; for (const [t0, v] of keys) if (t >= t0) m = v; return m; };
  const T0 = Lw(40, '0');                                         // « 0 % »: her phone dies
  const batAt = (t) => (t >= T0 ? 0 : 1);
  const T_ON = Lw(9, 'On') - 0.4, T_OFF = L(31) + 0.6;            // he presses the timer just before knocking; it runs out during the 17 call
  const landingLit = (t) => (t < S.face.t0) || (ETSI(t) ? t < S.rewind.t0 - 0.8 : t >= T_ON && t < T_OFF);
  const manThere = (t) => t < S.face.t0 || ETSI(t) || (t >= T_ON - 0.3 && t < L(34));
  // the knocks (the soundtrack plays the same times): three hard ones after « On frappe », two soft ones under the nice voice
  const KN = [0, 0.42, 0.84].map((d) => Lw(9, 'frappe') + 0.55 + d).concat([0, 0.5].map((d) => L(14) - 0.75 + d));

  // ---------- people ----------
  const env = scene.environment;
  const ines = await loadAvatar('Female_Adult_11', { env, facial: true }); scene.add(ines.root);
  const man = await loadAvatar('Male_Adult_07', { env }); scene.add(man.root);
  man.meshes.forEach((m) => { [m.material].flat().forEach((x) => { if (x.name && /body|cloth|torso/i.test(x.name) && x.color) x.color.multiplyScalar(0.55); }); });
  const everyone = [ines, man];
  const hideAll = () => { for (const a of everyone) a.root.visible = false; };
  const apple = makeCat(); scene.add(apple.root);
  const police = makePoliceCar(rng(5)); police.group.position.set(4.3, 0, 3.75); scene.add(police.group);

  // her phone: torch (a spot light out of its back) + its screen
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
  const drawPhone = (mode, t, p = 1) => {
    const cv = phone.tex.image, c = cv.getContext('2d'), Wc = cv.width, Hc = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#05060a'; c.fillRect(0, 0, Wc, Hc);
    if (mode === 'dead') { phone.tex.needsUpdate = true; return; }
    const bat = batAt(t), clk = fmtClock(clockAt(t));
    c.fillStyle = '#fff'; c.font = '600 30px Inter, Arial'; c.textAlign = 'left'; c.fillText(clk, 40, 58);
    c.textAlign = 'right'; c.fillStyle = '#ff453a'; c.fillText(`${bat} %`, Wc - 40, 58);
    c.textAlign = 'center';
    if (mode === 'lock') {
      c.fillStyle = '#fff'; c.font = '200 150px Inter, Arial'; c.fillText(clk, Wc / 2, 290);
      c.font = '500 34px Inter, Arial'; c.fillStyle = '#ff453a'; c.fillText(`Batterie faible · ${bat} %`, Wc / 2, 350);
      c.strokeStyle = '#ff453a'; c.lineWidth = 6; c.strokeRect(Wc / 2 - 70, 430, 130, 60); c.fillStyle = '#ff453a'; c.fillRect(Wc / 2 + 63, 448, 10, 24); c.fillRect(Wc / 2 - 62, 438, 7, 44);
      c.fillStyle = '#9a9aa2'; c.font = '500 28px Inter, Arial'; c.fillText('Branchez un chargeur', Wc / 2, 560);
    } else if (mode === 'dial') {
      // p: 0..1 across the shot; « 1 » then « 17 », then the green call button
      c.fillStyle = '#fff'; c.font = '300 120px Inter, Arial'; c.fillText(p < 0.35 ? '1' : '17', Wc / 2, 290);
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
      for (let i = 0; i < 12; i++) {
        const x = Wc / 2 + ((i % 3) - 1) * 150, y = 430 + Math.floor(i / 3) * 132, hot = (keys[i] === '1' && p > 0.12 && p < 0.35) || (keys[i] === '7' && p > 0.4 && p < 0.62);
        c.fillStyle = hot ? '#9a9aa2' : '#2c2c2f'; c.beginPath(); c.arc(x, y, 56, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.font = '400 54px Inter, Arial'; c.fillText(keys[i], x, y + 19);
      }
      c.fillStyle = p > 0.75 ? '#5fe07f' : '#30d158'; c.beginPath(); c.arc(Wc / 2, 960, 58, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 9; c.beginPath(); c.arc(Wc / 2 - 4, 956, 24, 0.6, 2.4); c.stroke();
    } else if (mode === 'call') {
      // p: seconds since the call started
      c.fillStyle = '#fff'; c.font = '600 62px Inter, Arial'; c.fillText('Police secours', Wc / 2, 250);
      c.font = '400 40px Inter, Arial'; c.fillStyle = '#c9c9ce'; c.fillText('17', Wc / 2, 312);
      const s = Math.max(0, Math.floor(p)); c.fillText(`00:${String(s).padStart(2, '0')}`, Wc / 2, 372);
      const lab = ['muet', 'clavier', 'haut-parleur'];
      for (let i = 0; i < 3; i++) { const x = Wc / 2 + (i - 1) * 150, y = 640; c.fillStyle = i === 2 ? '#e5e5ea' : '#2c2c2f'; c.beginPath(); c.arc(x, y, 56, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#c9c9ce'; c.font = '400 24px Inter, Arial'; c.fillText(lab[i], x, y + 96); }
      c.fillStyle = '#ff3b30'; c.beginPath(); c.arc(Wc / 2, 940, 58, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 9; c.beginPath(); c.arc(Wc / 2, 948, 24, 3.6, 5.8); c.stroke();
    }
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
  // an object resting on the fingers the same way, its long side along them, `tip` m further toward the finger tips; halfT its half
  // thickness (2 mm more clearance than the phone: it also lies over the top of the palm)
  function holdFit(av, side, obj, halfT, tip) {
    const B = av.bones, k1 = avgJ(B, side, 1), k3 = avgJ(B, side, 3), i1 = wp(B[side + 'HandIndex1']), p1 = wp(B[side + 'HandPinky1']);
    const X = k1.clone().sub(k3).normalize(), Z = X.clone().cross(tA.copy(i1).sub(p1)).normalize(); if (side === 'Left') Z.negate();
    const Yv = Z.clone().cross(X).normalize();
    mB.makeBasis(X, Yv, Z); obj.quaternion.setFromRotationMatrix(mB);
    obj.position.copy(k1).lerp(k3, 0.55).addScaledVector(X, -tip).addScaledVector(Z, PHZ - 0.0039 + halfT + 0.002); obj.updateMatrixWorld(true);
  }

  // ---------- props ----------
  // his fake police wallet, held open in front of his face: a dark leather case 22 x 8.2 cm, a badge on the top half, a card on the
  // bottom half (« POLICE », a tricolour band, an empty photo box, no number). Its long side runs along his fingers (holdFit)
  const WAL = { L: 0.22, W: 0.082, T: 0.012 };
  const walTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 860; cv.height = 320; const c = cv.getContext('2d');
    c.setTransform(0, -1, 1, 0, 0, 320);
    c.fillStyle = '#1a1512'; c.fillRect(0, 0, 320, 860);
    // top half: a silver shield badge on black leather
    const gr = c.createLinearGradient(80, 80, 240, 360); gr.addColorStop(0, '#e9ecef'); gr.addColorStop(0.5, '#9aa1a8'); gr.addColorStop(1, '#d7dbe0');
    c.fillStyle = gr; c.beginPath(); c.moveTo(160, 70); c.lineTo(262, 120); c.lineTo(250, 270); c.quadraticCurveTo(220, 350, 160, 390); c.quadraticCurveTo(100, 350, 70, 270); c.lineTo(58, 120); c.closePath(); c.fill();
    c.fillStyle = '#20314f'; c.beginPath(); c.arc(160, 225, 62, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e9ecef'; c.font = '800 30px Inter, Arial'; c.textAlign = 'center'; c.fillText('POLICE', 160, 236);
    // bottom half: the card
    c.fillStyle = '#f2f1ec'; c.beginPath(); c.roundRect(24, 452, 272, 380, 14); c.fill();
    c.fillStyle = '#1f3c88'; c.fillRect(24, 452, 30, 380); c.fillStyle = '#ffffff'; c.fillRect(54, 452, 30, 380); c.fillStyle = '#d6262b'; c.fillRect(84, 452, 30, 380);
    c.fillStyle = '#1f2a44'; c.font = '800 38px Inter, Arial'; c.save(); c.translate(205, 500); c.fillText('POLICE', 0, 12); c.restore();
    c.fillStyle = '#c9c9c4'; c.fillRect(140, 545, 130, 160); c.strokeStyle = '#9b9b96'; c.lineWidth = 3; c.strokeRect(140, 545, 130, 160);
    c.fillStyle = '#b5b5b0'; for (let i = 0; i < 4; i++) c.fillRect(140, 730 + i * 22, 130 - i * 18, 10);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
  })();
  const leather = new THREE.MeshStandardMaterial({ color: '#16110e', roughness: 0.55 });
  const wallet = new THREE.Mesh(new THREE.BoxGeometry(WAL.L, WAL.W, WAL.T), [leather, leather, leather, leather, new THREE.MeshStandardMaterial({ map: walTex, roughness: 0.4 }), leather]);
  scene.add(wallet);
  // the orange POLICE armband round his left upper arm, sized from the sleeve measured under it (+4 mm), riding the arm bone. No RIO
  // strip: a real plainclothes officer wears his 7-digit number on it
  const bandTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 180; const c = cv.getContext('2d');
    c.fillStyle = '#ff6a14'; c.fillRect(0, 0, 1024, 180); c.fillStyle = '#d9dde2'; c.fillRect(0, 10, 1024, 16); c.fillRect(0, 154, 1024, 16);
    c.fillStyle = '#16233f'; c.font = '900 92px Inter, Arial'; c.textAlign = 'center';
    for (const x of [256, 768]) c.fillText('POLICE', x, 124);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
  })();
  let band = null;
  const armSet = (m, side, up) => new Set(m.skeleton.bones.map((b, i) => (b === up || /UpArm|Arm.?Twist|UpperArm/i.test(b.name) && b.name.includes(side === 'Left' ? 'L' : 'R') ? i : -1)).filter((i) => i >= 0));
  // posed check: the arm's own skin must stay inside the band, everything else (torso, other arm) outside it
  const bandStats = (av, b, side = 'Left') => {
    const up = av.bones[side + 'Arm'], v = V(0, 0, 0); let arm = Infinity, body = Infinity; b.mesh.updateMatrixWorld(true);
    for (const m of av.meshes) {
      if (!m.isSkinnedMesh) continue; m.skeleton.update(); const ok = armSet(m, side, up);
      const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight, n = m.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) {
        m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); b.mesh.worldToLocal(v);
        if (Math.abs(v.y) > b.hgt / 2 + 0.004) continue; const r = Math.hypot(v.x, v.z), R = b.rOf(Math.atan2(v.x, v.z));
        if (r > R + 0.08) continue;
        let bi = -1, bw = -1; for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; bi = si.getComponent(i, j); } }
        if (ok.has(bi)) arm = Math.min(arm, R - r); else body = Math.min(body, r - R);
      }
    }
    return { arm, body };
  };

  // the armband hugs the sleeve: its radius follows the sleeve's own section, sector by sector (+4 mm), so a relaxed arm can hang
  // against the ribs without the band passing into them. Fitted once in the rest pose; it rides the upper-arm bone
  const NSB = 64;
  function fitBand(av, side = 'Left', u = 0.5, hgt = 0.07) {
    const B = av.bones, up = B[side + 'Arm'], lo = B[side + 'ForeArm'];
    stand(av, { pos: V(0, -50, 0), yaw: 0 }); av.root.updateMatrixWorld(true);
    const S0 = wp(up), E0 = wp(lo), axis = E0.clone().sub(S0), Lb = axis.length(); axis.normalize();
    const C = S0.clone().addScaledVector(axis, u * Lb), v = V(0, 0, 0);
    // the cylinder's +y points up the arm (the canvas's top row stays up); one « POLICE » (texture u 0.25 = local +x) turns to face
    // forward and a little outward, where the peephole and her eye see it
    const axUp = axis.clone().negate(), qw = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), axUp);
    const tc = V(1, 0, 0).applyQuaternion(qw), td = V(side === 'Left' ? 0.34 : -0.34, 0, 0.94);
    tc.addScaledVector(axUp, -tc.dot(axUp)).normalize(); td.addScaledVector(axUp, -td.dot(axUp)).normalize();
    const phi = Math.atan2(axUp.dot(tc.clone().cross(td)), tc.dot(td)), qi = qw.clone().invert();
    const rmax = new Array(NSB).fill(0);
    for (const m of av.meshes) {
      if (!m.isSkinnedMesh) continue; m.skeleton.update();
      const ok = armSet(m, side, up);
      const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight, n = m.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) {
        let bi = -1, bw = -1; for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; bi = si.getComponent(i, j); } }
        if (!ok.has(bi)) continue;
        m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); const l = v.clone().sub(C).applyQuaternion(qi);
        if (Math.abs(l.y) > hgt / 2 + 0.01) continue;
        const k = Math.floor((Math.atan2(l.x, l.z) + Math.PI) / (2 * Math.PI) * NSB) % NSB; rmax[k] = Math.max(rmax[k], Math.hypot(l.x, l.z));
      }
    }
    for (let it = 0; it < NSB && rmax.some((x) => x === 0); it++) rmax.forEach((x, k) => { if (!x) rmax[k] = Math.max(rmax[(k + 1) % NSB], rmax[(k + NSB - 1) % NSB]); });
    const R1 = rmax.map((_, k) => Math.max(rmax[(k + NSB - 1) % NSB], rmax[k], rmax[(k + 1) % NSB]));
    const R = R1.map((_, k) => (R1[(k + NSB - 1) % NSB] + 2 * R1[k] + R1[(k + 1) % NSB]) / 4 + 0.004);
    const rOf = (th) => { const f = ((th + Math.PI) / (2 * Math.PI) * NSB - 0.5 + NSB) % NSB, k0 = Math.floor(f), w = f - k0; return R[k0 % NSB] * (1 - w) + R[(k0 + 1) % NSB] * w; };
    const geo = new THREE.CylinderGeometry(1, 1, hgt, 128, 1, true), pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), th = Math.atan2(x, z), r = rOf(th + phi); pa.setX(i, r * Math.sin(th)); pa.setZ(i, r * Math.cos(th)); }
    geo.computeVertexNormals(); geo.rotateY(phi);
    const g = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.55, side: THREE.DoubleSide }));
    up.updateWorldMatrix(true, false);
    const bq = up.getWorldQuaternion(new THREE.Quaternion()), bs = up.getWorldScale(V(0, 0, 0));
    g.quaternion.copy(bq.clone().invert().multiply(qw));
    g.position.copy(up.worldToLocal(C.clone())); g.scale.set(1 / bs.x, 1 / bs.y, 1 / bs.z); up.add(g);
    if (DBG) console.log(`DBG band radius ${(Math.min(...R) * 100).toFixed(1)}-${(Math.max(...R) * 100).toFixed(1)} cm (sleeve + 4 mm), upper arm ${(Lb * 100).toFixed(1)} cm`);
    return { mesh: g, rOf, phi, u, hgt };
  }
  band = fitBand(man);
  // the landing side of her door (room12 only dressed the room side): an escutcheon with the keyhole under the deadbolt, a fixed knob
  const DW = ROOM.DX1 - ROOM.DX0, KH = V(-DW + 0.08, 1.235, 0.0015);
  const brass2 = new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.32, metalness: 0.9 });
  { const esc = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.006, 24), brass2); esc.rotation.x = Math.PI / 2; esc.position.set(KH.x, 1.24, 0.0045);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.002), new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.9 })); slot.position.set(KH.x, KH.y, 0.0005);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.01, 20), brass2); rose.rotation.x = Math.PI / 2; rose.position.set(-DW + 0.09, 1.02, 0.003);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), brass2); kn.position.set(-DW + 0.09, 1.02, -0.025); room.door.add(esc, slot, rose, kn); }
  // the light under her door from the landing (the stairwell timer lamp), with the shadows of his feet: a strip in the 19 mm gap
  // under the leaf, drawn per frame; a small warm light spills onto her floor
  const stripCv = document.createElement('canvas'); stripCv.width = 512; stripCv.height = 8;
  const stripTex = new THREE.CanvasTexture(stripCv); stripTex.colorSpace = THREE.SRGBColorSpace;
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.03, 0.017), new THREE.MeshBasicMaterial({ map: stripTex, transparent: true, depthWrite: false, toneMapped: true }));
  strip.position.set(DOORX, Y0 + 0.0095, ROOM.Z0 + 0.012); scene.add(strip);
  const underLight = new THREE.PointLight('#ffcf94', 0, 1.6, 2); underLight.position.set(DOORX, Y0 + 0.02, ROOM.Z0 + 0.09); scene.add(underLight);
  const poolCv = document.createElement('canvas'); poolCv.width = 256; poolCv.height = 128;
  const poolTex = new THREE.CanvasTexture(poolCv); poolTex.colorSpace = THREE.SRGBColorSpace;
  const POOL_D = 0.55;
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(DW + 0.16, POOL_D), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(DOORX, Y0 + 0.0015, FACE_IN + POOL_D / 2 - 0.005); scene.add(pool);
  // the night through her dormer: a cool soft key across the room onto the door wall (no power in her flat)
  const winKey = new THREE.SpotLight('#9fb3d8', 0, 9, 0.66, 1, 2); winKey.castShadow = true; winKey.shadow.mapSize.set(1024, 1024); winKey.shadow.bias = -0.0005;
  winKey.shadow.camera.near = 0.2; winKey.position.set(HERO_BAY, Y0 + 1.75, -0.75); winKey.target.position.set(3.75, Y0 + 0.75, ROOM.Z0); scene.add(winKey, winKey.target);
  const drawStrip = (lit, feet) => {
    const c = stripCv.getContext('2d'); c.clearRect(0, 0, 512, 8);
    if (lit > 0) {
      c.fillStyle = `rgba(255,214,160,${lit})`; c.fillRect(0, 0, 512, 8);
      for (const u of feet) { const g = c.createLinearGradient(u * 512 - 40, 0, u * 512 + 40, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.25, `rgba(14,10,8,${0.94 * lit})`); g.addColorStop(0.75, `rgba(14,10,8,${0.94 * lit})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(u * 512 - 40, 0, 80, 8); }
    }
    stripTex.needsUpdate = true; strip.visible = lit > 0;
    // the pool: brightest at the gap, gone ~45 cm in; each foot's shadow widens as it reaches into the room
    const p = poolCv.getContext('2d'); p.clearRect(0, 0, 256, 128);
    if (lit > 0) {
      const W0 = 256 * (DW - 0.03) / (DW + 0.16), x0 = (256 - W0) / 2;
      for (let y = 0; y < 128; y++) { const v = y / 127, a = lit * 0.5 * Math.exp(-v * 6.0) * (1 - v);
        for (let xx = 0; xx < 256; xx += 2) {
          const u = (xx - x0) / W0, spread = 0.03 + 0.05 * v; let m = smooth(-spread - 0.02, spread, u) * (1 - smooth(1 - spread, 1 + spread + 0.02, u));
          for (const f of feet) m *= 1 - 0.9 * (1 - smooth(0.04 + 0.04 * v, 0.07 + 0.07 * v, Math.abs(u - f)));
          if (m > 0.002) { p.fillStyle = `rgba(255,205,150,${(a * m).toFixed(4)})`; p.fillRect(xx, y, 2, 1); } } }
    }
    poolTex.needsUpdate = true; pool.visible = lit > 0;
  };
  // the light switch by her door (no power: it clicks, nothing comes on)
  const swPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.008), new THREE.MeshStandardMaterial({ color: '#efede6', roughness: 0.4 }));
  const SWP = V(3.80, Y0 + 1.08, ROOM.Z0); swPlate.position.copy(SWP).add(V(0, 0, 0.004)); scene.add(swPlate);
  const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.05, 0.008), new THREE.MeshStandardMaterial({ color: '#f7f6f2', roughness: 0.35 }));
  rocker.position.copy(SWP).add(V(0, 0, 0.012)); scene.add(rocker);
  // the vent grille low on the right wall by the door, next to the kitchenette; the duct goes down to the flat below. A canvas
  // backing shows the dark duct, later a faint warm light from below with a shadow passing across it
  const VENT = V(ROOM.X1, Y0 + 0.14, -4.0);
  const ventG = new THREE.Group(); ventG.position.copy(VENT); ventG.rotation.y = -Math.PI / 2; scene.add(ventG);
  { const mt = new THREE.MeshStandardMaterial({ color: '#cfccc4', roughness: 0.45, metalness: 0.55 });
    for (const [w, h, x, y] of [[0.27, 0.014, 0, 0.061], [0.27, 0.014, 0, -0.061], [0.014, 0.136, -0.128, 0], [0.014, 0.136, 0.128, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), mt); b.position.set(x, y, 0.004); ventG.add(b); }
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.242, 0.013, 0.003), mt); s.position.set(0, -0.045 + i * 0.018, 0.005); s.rotation.x = -0.65; ventG.add(s); } }
  const ventCv = document.createElement('canvas'); ventCv.width = 64; ventCv.height = 32;
  const ventTex = new THREE.CanvasTexture(ventCv); ventTex.colorSpace = THREE.SRGBColorSpace;
  const ventBack = new THREE.Mesh(new THREE.PlaneGeometry(0.242, 0.108), new THREE.MeshBasicMaterial({ map: ventTex })); ventBack.position.set(0, 0, 0.0012); ventG.add(ventBack);
  const drawVent = (glow, shade) => {
    const c = ventCv.getContext('2d'); c.fillStyle = '#040303'; c.fillRect(0, 0, 64, 32);
    if (glow > 0) { const g = c.createLinearGradient(0, 32, 0, 0); g.addColorStop(0, `rgba(255,190,120,${0.55 * glow})`); g.addColorStop(1, 'rgba(255,190,120,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 32);
      if (shade > 0) { c.fillStyle = `rgba(4,3,3,${0.85 * shade})`; c.fillRect(64 * (1 - shade) - 10, 0, 26, 32); } }
    ventTex.needsUpdate = true;
  };
  // his window (5th floor, bay 3): a warm curtain with his shadow on it
  const silTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 384; const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 384); g.addColorStop(0, '#ffd8a0'); g.addColorStop(1, '#e9a868'); c.fillStyle = g; c.fillRect(0, 0, 256, 384);
    for (let x = 0; x < 256; x += 22) { c.fillStyle = 'rgba(120,60,20,0.18)'; c.fillRect(x, 0, 7, 384); }
    c.filter = 'blur(7px)'; c.fillStyle = 'rgba(30,16,8,0.92)';
    c.beginPath(); c.ellipse(132, 142, 25, 31, 0, 0, Math.PI * 2); c.fill(); c.fillRect(120, 160, 25, 40);
    c.beginPath(); c.moveTo(52, 384); c.lineTo(58, 252); c.quadraticCurveTo(62, 208, 108, 198); c.lineTo(122, 190); c.lineTo(143, 190); c.lineTo(157, 198);
    c.quadraticCurveTo(203, 208, 207, 252); c.lineTo(213, 384); c.closePath(); c.fill();
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  })();
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
  sign.style.cssText = 'position:absolute;left:50%;top:590px;transform:translateX(-50%);background:#22397a;border:8px solid #2e6b4a;outline:5px solid #e8e6df;border-radius:16px;padding:30px 60px;text-align:center;min-width:640px;font-family:Inter,sans-serif;color:#fff';
  sign.innerHTML = `<div style="display:inline-block;background:#ff2e2e;font-weight:800;font-size:30px;padding:6px 14px;border-radius:8px;letter-spacing:.06em">12 %</div>
    <div style="font-weight:800;font-size:46px;margin-top:18px;letter-spacing:.03em">PARTIE 4</div><div style="font-weight:800;font-size:80px;line-height:1;margin-top:6px">LE NOIR</div>`;
  const ask = document.createElement('div');
  ask.style.cssText = 'position:absolute;left:0;right:0;top:300px;text-align:center;font:800 70px/1.08 Inter,sans-serif;color:#fff;text-transform:uppercase;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  ask.innerHTML = 'Et vous,<br>vous auriez <span style="color:#ff2e2e">ouvert</span> ?';
  const reply = document.createElement('div');
  reply.style.cssText = 'position:absolute;left:0;right:0;top:470px;text-align:center;font:700 42px/1.2 Inter,sans-serif;color:rgba(255,255,255,.92);text-shadow:0 0 3px #000,0 3px 0 rgba(0,0,0,.6)';
  reply.innerHTML = 'Réponds <span style="color:#ff2e2e;font-weight:800">OUI</span> ou <span style="color:#ff2e2e;font-weight:800">NON</span> en commentaire';
  const follow = document.createElement('div');
  follow.style.cssText = 'position:absolute;left:0;right:0;top:900px;text-align:center;font:800 52px/1.15 Inter,sans-serif;color:#fff;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  follow.innerHTML = '<span style="color:#ff2e2e">ABONNE-TOI</span><br><span style="font-weight:700;font-size:44px">pour voir la Partie 4</span>';
  const fine = document.createElement('div');
  fine.style.cssText = 'position:absolute;left:60px;right:60px;top:1060px;text-align:center;font:500 29px Inter,sans-serif;color:rgba(255,255,255,.8);line-height:1.45';
  fine.innerHTML = 'Fiction. Conseils vérifiés : gendarmerie, préfecture, Assemblée nationale (RIO), code pénal.<br>Voix : Kyutai TTS (CC BY 4.0).';
  endEl.querySelector('.t').innerHTML = ''; endEl.querySelector('.n').innerHTML = '';
  endEl.appendChild(ask); endEl.appendChild(reply); endEl.appendChild(sign); endEl.appendChild(fine); endEl.appendChild(follow);
  const tag = makeEndTag({ text: 'Abonne-toi pour la suite', ssaa: globalThis.SSAA });

  await Promise.all(TEX_PENDING);

  // ---------- poses ----------
  const BL = [6.1, 9.8, 14.2, 19.5, 24.6, 31.2, 36.8, 44.3, 51.7, 58.4, 66.9, 73.5, 80.2, 88.6, 95.3, 103.1, 110.7, 117.4];
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
  // her phone held in front of her chest while she sits (sit()'s hand spec: P = her hips)
  const phoneSit = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.27).addScaledVector(up, 0.42).addScaledVector(left, -0.07),
    pole: P.clone().addScaledVector(up, 0.25).addScaledVector(left, -0.6).addScaledVector(fwd, -0.2), F: up.clone().addScaledVector(fwd, 0.35).normalize(), N: up.clone().multiplyScalar(0.55).addScaledVector(fwd, -1).normalize() });
  // his right hand raised in front of his face with the open wallet (kl 0 = up, 1 = lowered to his side)
  // the card faces `at` (the eye that looks at it: hers, or the peephole) while it is up
  const walletArm = (kl, at = POV) => (sh, fwd, left, up) => {
    const hi = sh.clone().addScaledVector(fwd, 0.27).addScaledVector(up, 0.02).addScaledVector(left, 0.15), lo = sh.clone().addScaledVector(fwd, 0.12).addScaledVector(up, -0.45).addScaledVector(left, 0.03);
    const hand = hi.lerp(lo, kl), toEye = at.clone().sub(hand).normalize(), Fu = up.clone().addScaledVector(toEye, -up.dot(toEye)).normalize();
    return { hand, pole: sh.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.45).addScaledVector(fwd, -0.1),
      F: Fu.lerp(fwd, 0.85 * kl).normalize(), N: toEye.lerp(left, 0.8 * kl).normalize(), curl: 0.08, pk: -0.2, thumb: 0.45 };
  };
  // DBG: the extreme z of an avatar's skin (sgn 1: nearest -z, sgn -1: furthest +z)
  // her face's nearest point to the door's room face (vertices carried by the head, within 12 cm of the peephole's x), in metres
  const faceGap = (av) => { let mz = Infinity; const v = V(0, 0, 0), hb = av.bones.Head; av.root.updateMatrixWorld(true);
    for (const mesh of av.meshes) { if (!mesh.isSkinnedMesh) continue; mesh.skeleton.update(); const hi = mesh.skeleton.bones.indexOf(hb); if (hi < 0) continue;
      const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
      for (let i = 0; i < mesh.geometry.attributes.position.count; i++) { let bi = -1, bw = -1; for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; bi = si.getComponent(i, j); } } if (bi !== hi) continue;
        mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); if (Math.abs(v.x - DOORX) < 0.12) mz = Math.min(mz, v.z); } }
    return mz - FACE_IN; };
  // the nearest skin to a surface at z = zs (every vertex with x in [x0, x1]); fitted poses move by the residual
  const nearZ = (av, x0, x1) => { let mz = Infinity; const v = V(0, 0, 0); av.root.updateMatrixWorld(true);
    for (const mesh of av.meshes) { if (!mesh.isSkinnedMesh) continue; mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); if (v.x >= x0 && v.x <= x1) mz = Math.min(mz, v.z); } }
    return mz; };
  // her skin's clearance to the back wall as built: the shut leaf (z FACE_IN), the architrave (Z0 + 0.0245), the plaster (Z0);
  // fitted poses move by -(clearance - target). clearZ.at = [x, y, z, bone] of the nearest vertex
  const surfZ = (x, y) => { const leaf = x > ROOM.DX0 + 0.005 && x < ROOM.DX1 - 0.005 && y < Y0 + ROOM.DH, arch = x > ROOM.DX0 - 0.07 && x < ROOM.DX1 + 0.07 && y < Y0 + ROOM.DH + 0.07;
    return leaf ? (room.door.rotation.y > 0.01 ? -Infinity : FACE_IN) : arch ? ROOM.Z0 + 0.0245 : ROOM.Z0; };
  const clearZ = (av) => { let worst = Infinity; const v = V(0, 0, 0); av.root.updateMatrixWorld(true);
    for (const mesh of av.meshes) { if (!mesh.isSkinnedMesh) continue; mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count, si = mesh.geometry.attributes.skinIndex;
      for (let i = 0; i < n; i++) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); if (v.z > ROOM.Z0 + 0.3) continue;
        const c = v.z - surfZ(v.x, v.y); if (c < worst) { worst = c; clearZ.at = [v.x, v.y, v.z, mesh.skeleton.bones[si.getComponent(i, 0)].name]; } } }
    return worst; };
  // furniture near the door wall (room12.js): the clothes rail (posts, bar, coat) and the bed (frame, mattress, headboard, duvet)
  const FURN = [['rail post', 3.09, 3.11, Y0, Y0 + 1.5, -4.26, -4.24], ['rail post', 3.69, 3.71, Y0, Y0 + 1.5, -4.26, -4.24], ['rail bar', 3.09, 3.71, Y0 + 1.49, Y0 + 1.51, -4.26, -4.24],
    ['coat', 3.10, 3.60, Y0 + 0.525, Y0 + 1.475, -4.28, -4.16], ['bed frame', 1.52, 2.48, Y0 + 0.04, Y0 + 0.30, -4.35, -2.35], ['mattress', 1.55, 2.45, Y0 + 0.30, Y0 + 0.50, -4.32, -2.38],
    ['headboard', 1.52, 2.48, Y0, Y0 + 0.745, -4.36, -4.30], ['duvet', 1.51, 2.49, Y0 + 0.47, Y0 + 0.59, -3.575, -2.325]];
  const furnClear = (av) => { const best = FURN.map(() => Infinity), v = V(0, 0, 0); av.root.updateMatrixWorld(true);
    for (const mesh of av.meshes) { if (!mesh.isSkinnedMesh) continue; mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count;
      for (let i = 0; i < n; i += 2) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld);
        FURN.forEach(([, x0, x1, y0, y1, z0, z1], k) => { const dx = Math.max(x0 - v.x, v.x - x1), dy = Math.max(y0 - v.y, v.y - y1), dz = Math.max(z0 - v.z, v.z - z1);
          const d = Math.max(dx, dy, dz) < 0 ? Math.max(dx, dy, dz) : Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)); if (d < best[k]) best[k] = d; }); } }
    let k = 0; best.forEach((b, j) => { if (b < best[k]) k = j; }); return [FURN[k][0], best[k]]; };
  // most extreme skinned vertex along z (sgn 1: smallest z); extentZ.bone = the bone that carries it
  const extentZ = (av, sgn) => { let m = Infinity, mb = ''; const v = V(0, 0, 0); av.root.updateMatrixWorld(true);
    for (const mesh of av.meshes) { if (!mesh.isSkinnedMesh) continue; mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count;
      const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
      for (let i = 0; i < n; i += 3) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld);
        if (sgn * v.z < m) { m = sgn * v.z; let bi = 0, bw = -1; for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; bi = si.getComponent(i, j); } } mb = mesh.skeleton.bones[bi].name; } } }
    extentZ.bone = mb; return sgn * m; };

  // where people stand (each one checked with ?dbg=1: skin to wall and door distances)
  const SIT_P = V(2.79, Y0, -4.12), PEEP_P = V(4.29, Y0, -4.02), DOOR_P = V(4.27, Y0, -3.99), BACK_P = V(4.22, Y0, -4.15);
  const SWITCH_P = V(3.80, Y0, -3.98), BOLT_P = V(3.82, Y0, -3.98), LAND_P = V(4.25, LV6, -5.05), CARD_P = V(4.27, LV6, -4.86), IN_P = V(4.2, LV6, -4.33);
  const DOOR_OPEN = 0.62;                              // the leaf clears the kitchenette cabinet (it would touch it past ~0.68)
  const APPLE_P = V(3.75, Y0, -3.85), APPLE_YAW = 3.28;
  const POV = V(3.70, Y0 + 1.6, -3.9), PEEPCAM = V(DOORX, Y0 + 1.55, -4.47);
  const doorLook = V(DOORX, Y0 + 0.55, ROOM.Z0), ventLook = VENT.clone().add(V(-0.02, 0.02, 0));

  // ---------- cameras ----------
  const P2 = (s, a, b, ta, tb, fa, fb = fa) => new CamPath([[s.t0, a, ta, fa], [s.t1, b, tb, fb]], { easeIn: false, easeOut: false, arc: true });
  const CAM = {
    hook: P2(S.hook, POV.clone(), V(3.73, Y0 + 1.6, -3.97), V(4.27, Y0 + 1.58, -5.0), V(4.26, Y0 + 1.6, -5.0), 52, 46),
    face: P2(S.face, V(2.87, Y0 + 0.84, -3.5), V(2.86, Y0 + 0.84, -3.56), V(2.79, Y0 + 0.76, -4.16), V(2.79, Y0 + 0.76, -4.16), 40, 36),
    window: P2(S.window, V(3.15, LV6 + 1.3, 0.35), V(3.15, LV6 + 1.28, 0.38), V(2.4, 0, 6.2), V(1.8, 0, 6.2), 52, 50),
    win5: P2(S.win5, V(HERO_BAY + 0.7, LV6 - 0.6, 11.6), V(HERO_BAY + 0.6, LV6 - 0.58, 11.3), V(HERO_BAY, LV6 - 0.4, 0), V(HERO_BAY, LV6 - 0.35, 0), 34, 31),
    power: P2(S.power, V(4.32, Y0 + 1.42, -3.74), V(4.3, Y0 + 1.4, -3.77), V(3.8, Y0 + 1.08, -4.4), V(3.8, Y0 + 1.08, -4.4), 40, 37),
    bolt: P2(S.bolt, V(4.26, Y0 + 1.42, -3.9), V(4.25, Y0 + 1.4, -3.92), V(3.96, Y0 + 1.24, -4.34), V(3.96, Y0 + 1.24, -4.34), 36, 33),
    sit: P2(S.sit, V(3.55, Y0 + 1.3, -2.45), V(3.5, Y0 + 1.25, -2.55), V(2.98, Y0 + 0.55, -4.15), V(2.98, Y0 + 0.55, -4.15), 50, 47),
    apple: P2(S.apple, V(4.08, Y0 + 0.28, -4.27), V(4.06, Y0 + 0.27, -4.25), V(3.76, Y0 + 0.21, -3.86), V(3.76, Y0 + 0.21, -3.86), 38, 35),
    knock: P2(S.knock, V(3.62, Y0 + 1.05, -2.85), V(3.66, Y0 + 1.03, -2.93), V(4.3, Y0 + 0.72, -4.38), V(4.3, Y0 + 0.72, -4.38), 50, 47),
    police: P2(S.police, V(3.09, Y0 + 0.86, -3.62), V(3.08, Y0 + 0.86, -3.66), V(2.8, Y0 + 0.79, -4.16), V(2.8, Y0 + 0.79, -4.16), 38, 34),
    door2: P2(S.door2, V(4.12, Y0 + 0.55, -2.95), V(4.14, Y0 + 0.53, -3.02), V(4.25, Y0 + 0.42, -4.38), V(4.25, Y0 + 0.42, -4.38), 48, 45),
    feet: P2(S.feet, V(4.27, Y0 + 0.24, -3.12), V(4.27, Y0 + 0.23, -3.2), V(4.27, Y0 + 0.01, -4.38), V(4.27, Y0 + 0.01, -4.38), 34, 32),
    approach: P2(S.approach, V(3.6, Y0 + 1.56, -3.98), V(3.63, Y0 + 1.55, -4.02), V(4.28, Y0 + 1.5, -4.18), V(4.28, Y0 + 1.5, -4.24), 42, 40),
    peep1: P2(S.peep1, PEEPCAM.clone(), PEEPCAM.clone().add(V(0, 0.002, 0)), V(4.25, Y0 + 1.48, -5.05), V(4.25, Y0 + 1.5, -5.05), 110, 110),
    armband: P2(S.armband, PEEPCAM.clone(), PEEPCAM.clone().add(V(0, 0.002, 0)), V(4.45, Y0 + 1.3, -5.0), V(4.45, Y0 + 1.28, -5.0), 84, 80),
    etsi: P2(S.etsi, V(3.63, Y0 + 1.55, -4.03), V(3.65, Y0 + 1.55, -4.05), V(4.28, Y0 + 1.5, -4.24), V(4.28, Y0 + 1.5, -4.24), 40, 38),
    open: P2(S.open, POV.clone(), V(3.71, Y0 + 1.6, -3.93), V(4.27, Y0 + 1.5, -5.0), V(4.27, Y0 + 1.55, -5.0), 52, 50),
    lower: P2(S.lower, V(3.71, Y0 + 1.6, -3.93), V(3.73, Y0 + 1.6, -3.97), V(4.27, Y0 + 1.58, -5.0), V(4.26, Y0 + 1.6, -5.0), 48, 44),
    inside: P2(S.inside, V(3.73, Y0 + 1.6, -3.97), V(3.62, Y0 + 1.6, -3.7), V(4.26, Y0 + 1.6, -5.0), V(4.22, Y0 + 1.62, -4.3), 46, 50),
    law: P2(S.law, V(5.55, LV6 + 1.62, -5.55), V(5.5, LV6 + 1.6, -5.5), V(4.3, Y0 + 1.1, -4.4), V(4.3, Y0 + 1.1, -4.4), 50, 47),
    ask: P2(S.ask, V(3.64, Y0 + 1.53, -3.98), V(3.66, Y0 + 1.53, -4.0), V(4.27, Y0 + 1.47, -4.08), V(4.27, Y0 + 1.47, -4.08), 38, 35),
    answer: P2(S.answer, PEEPCAM.clone(), PEEPCAM.clone().add(V(0, 0.002, 0)), V(4.25, Y0 + 1.5, -5.05), V(4.25, Y0 + 1.5, -5.05), 110, 108),
    eye: P2(S.eye, V(3.98, Y0 + 1.57, -4.25), V(4.0, Y0 + 1.57, -4.26), V(4.28, Y0 + 1.54, -4.32), V(4.28, Y0 + 1.54, -4.32), 32, 30),
    card: P2(S.card, PEEPCAM.clone(), PEEPCAM.clone().add(V(0, 0.002, 0)), V(4.29, Y0 + 1.5, -4.62), V(4.29, Y0 + 1.5, -4.62), 110, 106),
    rio: P2(S.rio, PEEPCAM.clone(), PEEPCAM.clone().add(V(0, 0.002, 0)), V(4.45, Y0 + 1.28, -4.95), V(4.45, Y0 + 1.27, -4.95), 95, 85),
    rio2: P2(S.rio2, PEEPCAM.clone(), PEEPCAM.clone().add(V(0, 0.002, 0)), V(4.45, Y0 + 1.25, -4.95), V(4.45, Y0 + 1.25, -4.95), 62, 56),
    whisper: P2(S.whisper, V(3.66, Y0 + 1.5, -3.86), V(3.67, Y0 + 1.5, -3.89), V(4.27, Y0 + 1.46, -4.08), V(4.27, Y0 + 1.46, -4.08), 38, 35),
    tip: P2(S.tip, V(3.66, Y0 + 1.53, -3.97), V(3.68, Y0 + 1.53, -3.99), V(4.27, Y0 + 1.47, -4.08), V(4.27, Y0 + 1.47, -4.08), 35, 33),
    stop: P2(S.stop, V(4.84, Y0 + 1.52, -3.86), V(4.83, Y0 + 1.51, -3.89), V(4.27, Y0 + 1.48, -4.08), V(4.27, Y0 + 1.48, -4.08), 46, 44),
    door5: P2(S.door5, V(5.3, LV5 + 1.5, -5.3), V(5.25, LV5 + 1.5, -5.28), V(4.3, LV5 + 1.1, -4.4), V(4.3, LV5 + 1.1, -4.4), 46, 43),
    breathe: P2(S.breathe, V(4.15, Y0 + 1.48, -3.55), V(4.16, Y0 + 1.48, -3.6), V(4.22, Y0 + 1.55, -4.15), V(4.22, Y0 + 1.55, -4.15), 36, 33),
    apple2: P2(S.apple2, V(4.36, Y0 + 0.26, -4.12), V(4.34, Y0 + 0.25, -4.1), V(3.76, Y0 + 0.2, -3.86), V(3.76, Y0 + 0.2, -3.86), 40, 37),
    grille: P2(S.grille, V(4.3, Y0 + 0.27, -3.72), V(4.36, Y0 + 0.25, -3.76), VENT.clone(), VENT.clone(), 38, 34),
    murmur: P2(S.murmur, V(4.52, Y0 + 0.19, -3.86), V(4.58, Y0 + 0.17, -3.9), VENT.clone(), VENT.clone(), 34, 30),
    hear: P2(S.hear, V(4.62, Y0 + 1.36, -3.6), V(4.61, Y0 + 1.36, -3.64), V(4.3, Y0 + 1.43, -4.07), V(4.3, Y0 + 1.43, -4.07), 36, 33),
    dead: P2(S.dead, V(4.6, Y0 + 1.3, -3.64), V(4.59, Y0 + 1.3, -3.68), V(4.3, Y0 + 1.42, -4.07), V(4.3, Y0 + 1.42, -4.07), 34, 31),
  };
  const smokeLit = (v) => { haze.u.uLitCol.value.setScalar(v); haze.u.uShadeCol.value.setScalar(v * 0.25); };
  const fogTo = (d, col) => { scene.fog.density = d; scene.fog.color.set(col); for (const bb of [haze, wisps]) { bb.u.uFogD.value = d; bb.u.uFogCol.value.set(col); } };
  const lampsOn = (k, floors = [0, 1, 2, 3, 4, 5, 6]) => { ST.lights.forEach((l, f) => (l.intensity = floors.includes(f) ? 7 * k : 0)); ST.lampMat.emissiveIntensity = 3 * k; };
  // the stairwell timer lamps: one material per lamp here, so the 6th-floor globe can glow alone
  ST.lamps.forEach((lp) => { lp.material = ST.lampMat.clone(); });
  const lampsAll = (k) => { ST.lights.forEach((l) => (l.intensity = 7 * k)); ST.lamps.forEach((lp) => (lp.material.emissiveIntensity = 3 * k)); };
  // his window: dark until the façade shot, then his shadow on a lit curtain
  const card5 = (W.hero.userData.cards || []).find((c) => c.userData.L === 5 && Math.abs(c.userData.x - HERO_BAY) < 0.2);
  if (card5) { const m = card5.material; m.emissive.set('#ffffff'); m.emissiveMap = silTex; m.color.set('#000'); m.needsUpdate = true; }

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
      let sh = shotAt(t), id = sh.id, tt = t;
      // the rewind replays the « ET SI » branch backwards (open → lower → inside), with scan lines
      if (id === 'rewind') { const r = (t - S.rewind.t0) / (S.rewind.t1 - S.rewind.t0); tt = S.inside.t1 - 0.001 - r * (S.inside.t1 - S.open.t0 - 0.002); sh = shotAt(tt); id = sh.id; }
      const k = clamp((tt - sh.t0) / Math.max(0.001, sh.t1 - sh.t0));
      const inRoom = !['window', 'win5', 'law', 'door5', 'peep1', 'armband', 'answer', 'card', 'rio', 'rio2', 'end'].includes(id);
      // reset everything a shot may touch (each frame is a pure function of t)
      hideAll(); apple.root.visible = false; phone.visible = false; wallet.visible = false; police.group.visible = false;
      torch.intensity = 0; screenGlow.intensity = 0; screenGlow.position.set(0, 0, 0.22); phone.screen.material.emissiveIntensity = 1.0; beams.forEach((m) => { m.uniforms.uI.value = 0; m.uniforms.uTime.value = t; });
      lampsAll(0); ST.timerMat.emissiveIntensity = 1.2; groundGlow.intensity = 0; fill.intensity = 0; cold.intensity = 0; underLight.intensity = 0; winKey.intensity = 0;
      ST.door3.set(0); ST.door5.set(0); ST.door3.light.intensity = 0; ST.door5.light.intensity = 0;
      W.blueSpot.intensity = 0; W.streetSpot.intensity = 14; groundGlow.position.set(5.6, 1.6, -5.1); cold.position.set(3.2, Y0 + 1.9, -1.6);
      W.stairLamp.intensity = 0; fireLight.intensity = 0; beaconLights.forEach((l) => (l.intensity = 0)); W.hemi.intensity = 0.35;
      room.setDoor(0); room.setBolt(t >= S.bolt.t1 ? 1 : 0); room.openWindow(0); room.setKitchen(0); room.rolled.visible = false; room.towelsHung.visible = false;
      W.hero.userData.setDoor(0); if (W.hero.userData.hallLight) W.hero.userData.hallLight.intensity = 0;
      W.epa.group.visible = W.fpt.group.visible = false;
      if (card5) card5.material.emissiveIntensity = 0;
      rocker.rotation.x = 0; drawVent(0, 0);
      R.renderer.toneMappingExposure = 1.0;
      G.uSat.value = 1.0; G.uContrast.value = 1.05; G.uTint.value.set(1, 1, 1); G.uVignette.value = 0.6; G.uFade.value = 0; G.uFadeWhite.value = 0; G.uScan.value = 0; G.uBarrel.value = 0; G.uAberr.value = 0.0;
      const outside = id === 'window' || id === 'win5';
      if (outside) W.streetSpot.intensity = 0;                     // its glow on her sill would read as a lamp in her (powerless) flat
      fogTo(outside ? 0.012 : 0.035, outside ? '#0b0d12' : '#14120f');
      if (!outside) { G.uAberr.value = 0.0012; W.hemi.intensity = 0.08; }
      updateSmoke(t, 0, outside ? 0.5 : 0);
      // the landing: the timer lamps (all floors) and the strip under her door
      const lit = landingLit(tt) ? 1 : 0;
      lampsAll(lit);
      const feetU = manThere(tt) ? [0.36, 0.58] : [];
      // in her room (no power): the street lamp on the ceiling and the night through the dormer
      if (inRoom) { winKey.intensity = 8; cold.intensity = 0.5; R.renderer.toneMappingExposure = 1.4; drawStrip(lit * (room.door.rotation.y > 0.02 ? 0 : 1), feetU); }
      else drawStrip(0, []);
      // Apple: sitting on the floor near her, between the door and the vent
      if (inRoom && !['hook', 'open', 'lower', 'inside', 'power', 'phone1', 'bolt'].includes(id)) {
        apple.root.visible = true; apple.root.position.copy(APPLE_P); apple.root.rotation.set(0, APPLE_YAW, 0);
        // the head on the door; from « Apple tourne la tête » it turns (by direction, from a fixed eye point) to the vent
        const eye = APPLE_P.clone().add(V(0, 0.24, 0)), dD = doorLook.clone().sub(eye).normalize(), dV = ventLook.clone().sub(eye).normalize();
        const kv = t >= S.apple2.t0 ? smooth(S.apple2.t0 + 0.25, S.apple2.t0 + 1.4, t) : 0;
        apple.update(t, { look: eye.clone().add(dD.lerp(dV, kv).normalize()), blinkAt: [S.apple.t0 + 1.2, S.breathe.t0 + 0.6], slowBlinkAt: [] });
      }
      // ---- the people ----
      // his left arm hangs a little away from his side, so the armband clears his ribs
      const armLout = (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(up, -0.54).addScaledVector(left, 0.24).addScaledVector(fwd, 0.05),
        pole: sh2.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.6).addScaledVector(left, 0.32), F: V(0, -1, 0).addScaledVector(fwd, 0.15).normalize(), N: left.clone().negate() });
      const manPose = (kl, pos = LAND_P, lookAt = POV, faceAt = POV) => show(man, () => stand(man, { pos, yaw: 0, breath: tt * 0.3, armR: walletArm(kl, faceAt), armL: armLout, look: lookAt, lookK: 0.85 }));
      const holdWallet = () => { wallet.visible = true; holdFit(man, 'Right', wallet, WAL.T / 2, 0.05); };
      // sitting against the wall: her nearest skin (her head, resting back) 8 mm off the plaster
      const inesSit = (look, lookK = 0.9) => {
        const poseAt = (p) => show(ines, () => sit(ines, { pos: p, yaw: 0, legs: 'up', arms: 'knees', lean: -0.1, breath: t * 0.35, handR: phoneSit, curlR: 0.08, pkR: -0.2, look, lookK }));
        poseAt(SIT_P); poseAt(SIT_P.clone().add(V(0, 0, ROOM.Z0 + 0.008 - nearZ(ines, SIT_P.x - 0.4, SIT_P.x + 0.4)))); };
      const inesStand = (pos, yaw, lean, look, arms = {}) => show(ines, () => stand(ines, { pos, yaw, lean, breath: t * 0.4, look, lookK: 0.9, ...arms }));
      const phoneIn = (mode, p) => { phone.visible = true; phoneFit(ines, 'Right'); drawPhone(mode, t, p); phone.screen.material.emissiveIntensity = 0.7; };

      if (id === 'hook' || id === 'open' || id === 'lower' || id === 'inside') {
        // her eyes at the door (the hook replays « Il baisse la carte » in slow motion)
        const hk = id === 'hook';
        const kl = hk ? smooth(0.45, 0.95, k) : id === 'lower' ? smooth(0.1, 0.75, k) : id === 'inside' ? 1 : 0;
        room.setBolt(id === 'open' ? 1 - smooth(0.0, 0.2, k) : 0);
        room.setDoor(hk ? lerp(0.3, DOOR_OPEN, smooth(0, 0.3, k)) : id === 'open' ? DOOR_OPEN * smooth(0.25, 0.9, k) : DOOR_OPEN);
        room.door.updateMatrixWorld(true);
        if (id === 'inside') {
          const u = smooth(0.05, 0.85, k), pos = LAND_P.clone().lerp(IN_P, u);
          const ph = u * LAND_P.distanceTo(IN_P) / 1.2, swing = Math.sin(Math.PI * 2 * (ph + 0.5));
          const armLw = (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(up, -0.54).addScaledVector(left, 0.17).addScaledVector(fwd, -0.04 + 0.015 * swing),
            pole: sh2.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.6).addScaledVector(left, 0.32), F: V(0, -1, 0).addScaledVector(fwd, 0.15).normalize(), N: left.clone().negate() });
          const armRw = (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.1).addScaledVector(up, -0.48).addScaledVector(left, 0.02),
            pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.12).addScaledVector(fwd, -0.25), F: up.clone().lerp(fwd, 0.85).normalize(), N: left.clone(), curl: 0.08, pk: -0.2, thumb: 0.45 });
          show(man, () => walk(man, { pos, yaw: 0, phase: ph, look: cam.position.clone(), armL: armLw, armR: armRw })); holdWallet();
        } else { manPose(kl); holdWallet(); }
        G.uSat.value = 0.7; G.uTint.value.set(1.04, 0.97, 0.95); R.renderer.toneMappingExposure = 1.3;
        if (hk) { G.uSat.value = 0.6; G.uVignette.value = 0.85; }
      }
      if (id === 'face' || id === 'sit' || id === 'police' || id === 'knock' || id === 'door2' || id === 'feet') {
        const look = id === 'face' ? V(2.85, Y0 + 0.62, -3.84) : doorLook;
        inesSit(look, id === 'face' ? 0.7 : 0.9); phoneIn('lock', 0); screenGlow.intensity = id === 'face' || id === 'police' ? 0.06 : 0.04;
      }
      if (id === 'window') {
        // from her dormer: the police car pulls out and drives away; its light bar dies first
        police.group.visible = true; const tau = Math.max(0, t - S.window.t0 - 0.9);
        police.group.position.set(4.3 - 0.75 * tau * tau, 0, 3.75 + 1.1 * smooth(0, 2.2, tau)); police.group.rotation.y = 0;
        police.update(t, 1 - smooth(S.window.t0 + 2.6, S.window.t0 + 3.1, t)); police.group.updateMatrixWorld(true);
        R.renderer.toneMappingExposure = 1.1;
      }
      if (id === 'win5') { if (card5) card5.material.emissiveIntensity = 1.5 * smooth(0.05, 0.25, k); R.renderer.toneMappingExposure = 1.05; }
      if (id === 'power') {
        // the switch clicks (her index on the rocker), nothing comes on
        const press = smooth(0.18, 0.3, k) * (1 - smooth(0.62, 0.75, k)); rocker.rotation.x = 0.14 * smooth(0.25, 0.32, k);
        show(ines, () => pressPose(ines, 'Right', SWP.clone().add(V(0, 0.012, 0.018 + 0.05 * (1 - press))),
          (arm) => stand(ines, { pos: SWITCH_P, yaw: Math.PI, breath: t * 0.4, armR: arm, look: SWP, lookK: 0.8 }),
          (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.3), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: fwd.clone(), N: V(0, 1, 0).cross(fwd).normalize(), curl: 1.1, idx: 0.06, thumb: 0.5 })));
      }
      if (id === 'phone1') { inesStand(SWITCH_P, Math.PI, 0.05, null, { armR: phoneUp }); phoneIn('lock', 0); }
      if (id === 'bolt') {
        // the deadbolt turns a quarter under her fingers
        const turn = smooth(0.15, 0.55, k); room.setBolt(turn); room.door.updateMatrixWorld(true);
        const knob = room.door.localToWorld(V(-DW + 0.08, 1.24, 0.083)), dz = V(0, 0, 1), side = V(-0.012, 0, 0).applyAxisAngle(dz, turn * Math.PI / 2);
        show(ines, () => pressPose(ines, 'Right', knob.clone().add(side),
          (arm) => stand(ines, { pos: BOLT_P, yaw: Math.PI, breath: t * 0.4, armR: arm, look: knob, lookK: 0.8 }),
          (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.3), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: fwd.clone(), N: V(1, 0, 0).applyAxisAngle(dz, turn * Math.PI / 2), curl: 0.55, idx: 0.25, thumb: 0.4 })));
      }
      if (id === 'apple') { inesSit(doorLook); phoneIn('lock', 0); screenGlow.intensity = 0.06; }
      if (id === 'knock' || id === 'stop') {
        // each knock rattles the bolted door a little (impulse, decaying in 0.12 s)
        let rat = 0; for (const kt of KN) { const x = tt - kt; if (x >= 0 && x < 0.25) rat += Math.exp(-x / 0.05) * Math.sin(x * 90); }
        if (id === 'knock') { room.setDoor(0.0018 * rat); room.door.updateMatrixWorld(true); }
      }
      if (id === 'approach' || id === 'etsi' || id === 'eye') {
        // her eye at the peephole: she leans in
        // she leans in until her face is 1.2 cm from the door (posed, measured, then moved by the residual: a pure translation)
        const kk = id === 'approach' ? smooth(0.1, 0.7, k) : 1, ln = lerp(0.02, 0.3, kk), gap = lerp(0.16, 0.012, kk);
        const poseAt = (p) => inesStand(p, Math.PI, ln, room.anchors.peep.clone().add(V(0, 0, -0.5)));
        poseAt(PEEP_P); poseAt(PEEP_P.clone().add(V(0, 0, gap - faceGap(ines))));
        if (id === 'etsi') { G.uSat.value = 0.35; G.uTint.value.set(1.06, 0.96, 0.94); }
      }
      if (['peep1', 'armband', 'answer', 'card', 'rio', 'rio2'].includes(id)) {
        // through the peephole: the landing under the timer lamp, the man holding the wallet up; for « card » he holds it to the lens
        const pos = id === 'card' ? CARD_P : LAND_P;
        if (id === 'card') { show(man, () => stand(man, { pos, yaw: 0, breath: tt * 0.3, armR: (sh2, fwd, left, up) => ({ hand: V(DOORX + 0.0, Y0 + 1.44, ROOM.Z0 - 0.33), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.45), F: up.clone(), N: fwd.clone(), curl: 0.08, pk: -0.2 }), armL: armLout, look: PEEPCAM, lookK: 0.6 })); }
        else manPose(0, pos, id === 'answer' ? PEEPCAM.clone().add(V(0.25, -0.1, 0)) : PEEPCAM, PEEPCAM);
        holdWallet();
        fogTo(0.06, '#2c2824'); G.uBarrel.value = 0.55; G.uVignette.value = 0.9; R.renderer.toneMappingExposure = 1.25;
      }
      if (id === 'law') { room.setDoor(0); fogTo(0.05, '#14120f'); cold.intensity = 1.2; cold.position.set(5.6, LV6 + 1.6, -6.2); R.renderer.toneMappingExposure = 1.35; G.uSat.value = 0.5; }
      if (id === 'ask' || id === 'tip' || id === 'whisper') {
        inesStand(DOOR_P, Math.PI, 0.06, room.anchors.peep.clone().add(V(0, -0.15, -0.5)), { armR: phoneUp });
        phoneIn(id === 'whisper' ? 'call' : 'lock', id === 'whisper' ? tt - S.dial.t1 + 1 : 0); screenGlow.intensity = 0.14;
      }
      if (id === 'dial' || id === 'nopatrol') {
        inesStand(DOOR_P, Math.PI, 0.06, null, { armR: phoneUp });
        phoneIn(id === 'dial' ? 'dial' : 'call', id === 'dial' ? k : tt - S.dial.t1 + 1);
      }
      if (id === 'stop') { inesStand(DOOR_P, Math.PI, 0.03, room.anchors.peep.clone().add(V(0, -0.3, -0.5)), { armR: phoneUp }); phoneIn('call', tt - S.dial.t1 + 1); screenGlow.intensity = 0.1; }
      if (id === 'door5') {
        // the 5th floor: his door, ajar on his lit hall, swings shut
        const kd = 1 - smooth(0.45, 0.62, k); ST.door5.set(0.45 * kd); ST.door5.light.intensity = 4 * (0.25 + 0.75 * kd);
        fogTo(0.05, '#14120f'); cold.intensity = 0.8; cold.position.set(5.6, LV5 + 1.6, -6.2); R.renderer.toneMappingExposure = 1.35;
      }
      if (id === 'breathe' || id === 'hear' || id === 'dead') {
        // her back to the door; at « Je t'entends » her head turns toward the vent; at « 0 % » the screen dies
        const turnH = id === 'hear' ? smooth(0.15, 0.6, k) : id === 'dead' ? 1 : 0;
        // her back on the door: posed, then moved so her nearest skin is 6 mm off the leaf (the look target moves with her, so the
        // pose is a pure translation; two rounds take up what the vent's direction still changes)
        const dF = V(0, -0.3, 1).normalize();
        const poseAt = (p) => { const head = p.clone().add(V(0, 1.55, 0.05)), dV = ventLook.clone().sub(head).normalize();
          inesStand(p, 0, -0.04, head.clone().add(dF.clone().lerp(dV, turnH * 0.75).normalize()), { armR: phoneUp }); };
        let bp = BACK_P.clone(); poseAt(bp);
        for (let r = 0; r < 2; r++) { bp = bp.clone().add(V(0, 0, 0.006 - clearZ(ines))); poseAt(bp); }
        const dead = id === 'dead' && t >= T0 + 0.12;
        phoneIn(dead ? 'dead' : 'lock', 0); screenGlow.intensity = dead ? 0 : 0.16;
        if (id === 'dead') { phone.screen.material.emissiveIntensity = 0.7 * (1 - smooth(T0 + 0.05, T0 + 0.2, t)); screenGlow.intensity = 0.16 * (1 - smooth(T0 + 0.05, T0 + 0.2, t)); }
      }
      if (id === 'apple2' || id === 'grille' || id === 'murmur') {
        if (id === 'murmur') { const g = smooth(0.15, 0.55, k), sh2 = smooth(0.55, 0.95, k); drawVent(g, sh2 > 0 && sh2 < 1 ? sh2 : 0); }
        cold.intensity = 1.2; R.renderer.toneMappingExposure = 1.5;
      }
      if (id === 'hear' || id === 'dead') drawVent(1, 0);
      // a faint bounce near the lens in her room (the night light off the pale walls)
      if (inRoom) fill.intensity = ['bolt', 'power', 'apple', 'knock', 'stop'].includes(id) ? 0.16 : ['approach', 'etsi', 'eye', 'ask', 'tip', 'whisper', 'hear', 'dead'].includes(id) ? 0.12 : 0.06;
      // camera
      const C = CAM[id] || CAM.dead;
      C.apply(cam, tt);
      if (id === 'phone1' || id === 'dial' || id === 'nopatrol') {
        // over the phone: the camera rides it
        const n = V(0, 0, 1).applyQuaternion(phone.quaternion), upv = V(0, 1, 0).applyQuaternion(phone.quaternion);
        cam.position.copy(phone.position).addScaledVector(n, 0.34).addScaledVector(upv, -0.06); cam.up.copy(upv); cam.lookAt(phone.position.clone().addScaledVector(upv, -0.036)); cam.up.set(0, 1, 0); cam.fov = 40; cam.updateProjectionMatrix();
        screenGlow.intensity = 0; fill.intensity = 0.06;
      }
      if (id === 'inside') cam.lookAt(wp(man.bones.Head).add(V(0, 0.04, 0)));
      for (const bb of [haze, wisps]) bb.update(cam, R.renderer.getPixelRatio(), V(0.3, 1, 0.2).normalize());
      cam.near = outside ? 0.3 : 0.02; cam.far = outside ? 3000 : 400; cam.updateProjectionMatrix();
      fill.position.copy(cam.position).add(V(0, 0.25, 0));
      if (S.rewind.t0 <= t && t < S.rewind.t1) { G.uScan.value = 1.0; G.uSat.value = 0.4; G.uAberr.value = 0.012; }
      // overlay
      const endK = smooth(S.end.t0, S.end.t0 + 0.6, t);
      const close = ['face', 'police', 'ask', 'tip', 'whisper', 'breathe', 'hear', 'dead', 'eye', 'stop'].includes(id), phoneShot = ['phone1', 'dial', 'nopatrol'].includes(id);
      const peep = ['peep1', 'armband', 'answer', 'card', 'rio', 'rio2'].includes(id) ? 1 : 0;
      const statA = id === 'end' ? 0 : t >= T0 ? 1 - smooth(T0 + 0.35, T0 + 0.75, t) : 1;
      ov.apply({ t, time: fmtClock(clockAt(t)), bat: batAt(t), statA, serA: id === 'end' ? 0 : 1, part: 'PARTIE 3',
        capA: id === 'end' ? 0 : 1, capY: close ? 71 : phoneShot ? 82 : peep ? 76 : 57,
        etsi: id === 'etsi' ? smooth(S.etsi.t0, S.etsi.t0 + 0.25, t) : 0,
        rew: S.rewind.t0 <= t && t < S.rewind.t1 ? 1 : 0,
        news: id === 'law' ? { a: 'USURPATION DE FONCTION', b: 'jusqu’à 3 ans de prison et 45 000 € d’amende · art. 433-12 du code pénal', k: smooth(S.law.t0 + 0.1, S.law.t0 + 0.4, t) }
          : id === 'rio' ? { a: 'RIO · 7 CHIFFRES', b: 'obligatoire depuis 2014 · en civil, il se porte sur le brassard', k: smooth(S.rio.t0 + 0.1, S.rio.t0 + 0.4, t) }
          : id === 'tip' ? { a: '17 · AU MOINDRE DOUTE', b: 'même avec une carte : on n’ouvre pas, on appelle', k: smooth(S.tip.t0 + 0.1, S.tip.t0 + 0.4, t) } : null,
        notif: null,
        capHtml: opts.cover ? '<span class="w1">La </span><span class="r1">police</span><span class="w1"> frappe à 4 h du matin…</span><br><span class="w1">vous </span><span class="r1">ouvrez ?</span>'
          : id === 'hook' ? Ln[0].units.map((u) => { const on = t >= u.t0 - 0.12; return `<span class="${u.red ? (on ? 'r1' : 'r0') : (on ? 'w1' : 'w0')}">${u.shown}</span>${u.shown.endsWith('…') ? '<br>' : ' '}`; }).join('') : null,
        peep, black: 0 });
      if (id === 'end') G.uFade.value = 1;
      endEl.style.opacity = String(endK);
      tag.update(t, S.end.t0 + 0.6, endK);
      R.bloom.threshold = Math.min(0.85, 0.95 / R.renderer.toneMappingExposure);
      if (DBG) {
        if (ines.root.visible && ['approach', 'etsi', 'eye'].includes(id)) console.log(`DBG face ${id} t=${t.toFixed(2)} ${(faceGap(ines) * 100).toFixed(1)} cm from the door face; head y ${wp(ines.bones.Head).y.toFixed(2)} (peephole ${(Y0 + 1.55).toFixed(2)})`);
        if (ines.root.visible) { const c = clearZ(ines), a = clearZ.at, [fn, fc] = furnClear(ines);
          console.log(`DBG wall ${id} t=${t.toFixed(2)} wall ${(c * 100).toFixed(1)} cm at ${a[0].toFixed(2)},${a[1].toFixed(2)},${a[2].toFixed(3)} ${a[3]}; furniture: ${fn} ${(fc * 100).toFixed(1)} cm`); }
        if (ines.root.visible) console.log(`DBG ines ${id} t=${t.toFixed(2)} minZ ${(extentZ(ines, 1) - ROOM.Z0).toFixed(3)} ${extentZ.bone} (wall 0, door face ${(FACE_IN - ROOM.Z0).toFixed(4)})`);
        if (room.door.rotation.y > 0.01) { room.door.updateMatrixWorld(true); const dw = ROOM.DX1 - ROOM.DX0; let hit = false;
          for (const y of [0.1, 0.5, 0.85]) { const c = room.door.worldToLocal(V(4.30, Y0 + y, -3.75)); if (c.x > -dw && c.x < 0 && c.z > 0.0075 && c.z < 0.0525) hit = true; }
          for (const x of [-dw + 0.005, -0.005]) for (const z of [0.0075, 0.0525]) { const w = room.door.localToWorld(V(x, 0.5, z)); if (w.x > 4.30 && w.z > -3.75 && w.z < -2.55) hit = true; }
          const fe = room.door.localToWorld(V(-dw + 0.005, 0.5, 0.0525));
          console.log(`DBG leaf ${id} k=${(room.door.rotation.y / 1.45).toFixed(2)} ${hit ? 'HITS the kitchenette' : 'clear of the kitchenette'} (free edge ${fe.x.toFixed(3)}, ${fe.z.toFixed(3)})`); }
        if (man.root.visible && room.door.rotation.y > 0.01) { let best = Infinity, bestAt = ''; const v = V(0, 0, 0), dw = ROOM.DX1 - ROOM.DX0; room.door.updateMatrixWorld(true);
          for (const mesh of man.meshes) { if (!mesh.isSkinnedMesh) continue; const n = mesh.geometry.attributes.position.count;
            for (let i = 0; i < n; i += 2) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); room.door.worldToLocal(v);
              const dx = Math.max(-dw + 0.005 - v.x, v.x + 0.005), dy = Math.max(0.012 - v.y, v.y - ROOM.DH), dz = Math.max(0.0075 - v.z, v.z - 0.0525);
              const d = Math.max(dx, dy, dz) < 0 ? Math.max(dx, dy, dz) : Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0));
              if (d < best) { best = d; const w = room.door.localToWorld(v.clone()); bestAt = `${w.x.toFixed(2)},${w.y.toFixed(2)},${w.z.toFixed(2)} ${mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(i, 0)].name}`; } } }
          console.log(`DBG man-leaf ${id} t=${t.toFixed(2)} ${(best * 100).toFixed(1)} cm from the open leaf at ${bestAt}`); }
        if (man.root.visible && id === 'inside') { let worst = Infinity, at = ''; const v = V(0, 0, 0);
          for (const mesh of man.meshes) { if (!mesh.isSkinnedMesh) continue; const n = mesh.geometry.attributes.position.count;
            for (let i = 0; i < n; i += 2) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); if (Math.abs(v.z - ROOM.Z0) > 0.04) continue;
              const m = Math.min(v.x - (ROOM.DX0 - 0.0), (ROOM.DX1 + 0.0) - v.x, Y0 + ROOM.DH - v.y);   // inside the opening: > 0
              if (m < worst) { worst = m; at = `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(3)}`; } } }
          console.log(`DBG man-frame ${id} t=${t.toFixed(2)} ${worst === Infinity ? 'not in the doorway' : (worst * 100).toFixed(1) + ' cm inside the opening at ' + at}`); }
        if (man.root.visible) console.log(`DBG man ${id} t=${t.toFixed(2)} maxZ ${(extentZ(man, -1) - ROOM.Z0).toFixed(3)} ${extentZ.bone} (door landing face 0.0075)`);
        if (wallet.visible) { const o = []; for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (const j of [1, 2, 3]) { const q2 = wallet.worldToLocal(wp(man.bones['RightHand' + f + j])); if (Math.abs(q2.x) < 0.13 && Math.abs(q2.y) < 0.06 && q2.z > -0.02) o.push(`${f[0]}${j}:${(q2.x * 100).toFixed(1)},${(q2.y * 100).toFixed(1)},${(q2.z * 100).toFixed(1)}`); }
          console.log(`DBG wallet ${id} t=${t.toFixed(2)} ${o.join(' ') || 'all joints clear'}`); }
        if (man.root.visible && band) { const bs = bandStats(man, band);
          console.log(`DBG band ${id} arm skin ${(bs.arm * 1000).toFixed(1)} mm inside it, body ${(bs.body * 1000).toFixed(1)} mm outside it`); }
        if (phone.visible) { const o = []; for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (const j of [1, 2, 3]) { const bn = ines.bones['RightHand' + f + j]; const q2 = phone.worldToLocal(wp(bn)); if (Math.abs(q2.x) < 0.05 && Math.abs(q2.y) < 0.085 && q2.z > -0.012) o.push(`${f[0]}${j}:${(q2.z * 100).toFixed(1)}`); } if (o.length) console.log(`DBG phone ${id} ${o.join(' ')}`); }
      }
      R.composer.render();
    },
  };
}
