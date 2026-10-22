// « 12 % » Partie 1 · La fumée (French serial thriller; ~107 s). Paris 18e, 3:12 am: smoke comes under Inès's door. The real
// advice (checked in notes/facts.md): if the stairwell is full of smoke, stay in: shut the door, wet towels under it, wet the
// door, call 18, show yourself at the window, stay low. « ET SI… » plays the wrong choice (she opens: a black wave, the
// stairwell is a chimney) then rewinds. Twist: in the street a man watches her window, the man who held the door for her
// tonight; a text from an unknown number: « Tu es restée. Dommage. » Every cut sits on the narration (audio/vo/ep20_*.json).
import * as THREE from 'three';
import { createRenderer, rng, smooth, clamp, CamPath } from '../engine/core.js';
import { TEX_PENDING, orientHand } from '../engine/elevator.js';
import { fadeShadowBorders, Sparks, Billboards, smokeAtlas, fireStripAtlas, SIMPLEX } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, kneel, walk, cloneAvatar, lookAt } from '../engine/poses.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { makeCat } from '../engine/cat.js';
import { makePhone } from '../engine/props16.js';
import { crowdPhone } from '../engine/props19.js';
import { makeEndTag } from '../engine/endtag.js';
import { buildWorld12 } from '../engine/world12.js';
import { LV, STREET, HERO_BAY, FIRE_BAY } from '../engine/paris12.js';
import { ROOM, STAIR } from '../engine/room12.js';
import { updateBeacons, pulse } from '../engine/trucks12.js';
import { Overlay12, fmtClock } from '../engine/s12.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(new THREE.Vector3());
const Y0 = ROOM.Y0, K = STREET.KERB;
const lerp = (a, b, k) => a + (b - a) * k;

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = 0;
  const LO = q.get('lo') === '1';
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer();
  const voice = q.get('voice') || 'developpeuse';
  const VO = await (await fetch(`/audio/vo/ep20_${voice}.json`)).json();
  const ov = new Overlay12(VO);
  const W = buildWorld12(R.renderer);
  const scene = W.scene, room = W.room;
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.03, 12000);
  R.renderPass.scene = scene; R.renderPass.camera = cam;
  R.bloom.strength = 0.42; R.bloom.radius = 0.55;
  const G = R.grade.uniforms;

  // ---------- the timeline, read from the narration ----------
  const Ln = VO.lines, L = (i) => Ln[i].t0;
  const Lw = (i, w) => { const u = Ln[i].units.find((x) => x.shown.toLowerCase().startsWith(w.toLowerCase())); return u ? u.t0 : Ln[i].t0; };
  const END0 = Ln[Ln.length - 1].t0 - 0.25, DUR = Math.ceil((VO.duration + 4.4) * 10) / 10;
  const cut = (x) => x - 0.08;
  const SH = [
    ['hook', 0], ['face', cut(L(1))], ['ext', cut(L(2))], ['flash', cut(L(3))], ['man', cut(L(5))], ['detector', cut(L(6))], ['apple', cut(L(7))],
    ['gap', cut(L(8))], ['hand', cut(L(9))], ['peep', cut(L(10))], ['etsi', cut(L(11))], ['open', cut(L(12))], ['well', cut(L(13))],
    ['blind', cut(Lw(13, 'Elle'))], ['stat', cut(L(14))], ['rewind', cut(L(15))], ['bolt', cut(L(16))], ['sink', cut(Lw(16, 'mouille'))],
    ['towels', cut(Lw(16, 'et'))], ['splash', cut(L(17))], ['call', cut(Lw(17, 'Et'))], ['speaker', cut(L(18))], ['low', cut(L(19))],
    ['street', cut(L(20))], ['door', cut(Lw(20, 'Au'))], ['neigh', cut(L(21))], ['ladder', cut(L(22))], ['news', cut(L(23))],
    ['crowd', cut(L(24))], ['man2', cut(L(25))], ['manclose', cut(L(26))], ['msg', cut(L(27))], ['black', END0], ['end', END0 + 1.9],
  ].map(([id, t0], i, a) => ({ id, t0, t1: a[i + 1] ? a[i + 1][1] : DUR }));
  const S = Object.fromEntries(SH.map((s) => [s.id, s]));
  const shotAt = (t) => { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; };
  // story clock (minutes after midnight) and battery
  const clockAt = (t) => { if (t >= S.flash.t0 && t < S.detector.t0 && t >= S.flash.t0) return 22 * 60 + 41;
    const keys = [[S.detector.t0, 192], [S.bolt.t0, 193], [S.splash.t0, 194], [S.street.t0, 199], [S.ladder.t0, 204], [S.msg.t0, 211]];
    let m = 192; for (const [t0, v] of keys) if (t >= t0) m = v; return m; };
  const batAt = (t) => { if (t >= S.flash.t0 && t < S.detector.t0) return 34; let b = 12; for (const [t0, v] of [[L(19) + 3.4, 9], [L(22) + 2.0, 6], [L(27), 3]]) if (t >= t0) b = v; return b; };

  // ---------- people ----------
  const env = scene.environment;
  const ines = await loadAvatar('Female_Adult_11', { env, facial: true }); scene.add(ines.root);
  const man = await loadAvatar('Male_Adult_07', { env }); scene.add(man.root);
  man.meshes.forEach((m) => { const mm = [m.material].flat(); mm.forEach((x) => { if (x.name && /body|cloth|torso/i.test(x.name) && x.color) x.color.multiplyScalar(0.55); }); });
  const fire0 = await loadAvatar('Fire_Male_01', { env, lod: 512 });
  const firemen = [fire0, ...[1, 2, 3].map(() => cloneAvatar(fire0, skClone))]; firemen.forEach((f) => scene.add(f.root));
  const nb = [await loadAvatar('Male_Adult_05', { env, lod: 512 }), await loadAvatar('Female_Adult_06', { env, lod: 512 })]; nb.forEach((a) => scene.add(a.root));
  const CROWD = ['Female_Adult_02', 'Male_Adult_01', 'Female_Adult_09', 'Male_Adult_16', 'Female_Adult_12', 'Male_Adult_18', 'Female_Adult_03', 'Male_Adult_08'];
  const crowd = []; for (const n of CROWD) { const a = await loadAvatar(n, { env, lod: 512 }); scene.add(a.root); crowd.push(a); }
  const cr = rng(2020);
  const crowdPos = crowd.map((_, i) => ({ p: V(-5.2 + i * 1.25 + (cr() - 0.5) * 0.4, K, 11.1 + (cr() - 0.5) * 0.9), film: i % 3 === 1, cache: {} }));
  const crowdPhones = crowdPos.map((c) => { if (!c.film) return null; const p = crowdPhone(); scene.add(p); return p; });
  const MAN_P = V(7.6, K, 11.5);
  const blankets = nb.map((_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0, 12, 24), new THREE.MeshStandardMaterial({ color: '#d8a640', metalness: 0.9, roughness: 0.28, side: THREE.DoubleSide }));
    const p = m.geometry.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, 0.012 * Math.sin(p.getX(k) * 23 + i) * Math.cos(p.getY(k) * 17));
    m.geometry.computeVertexNormals(); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2; m.position.set(5.6 + i * 1.7, K + 0.012, 1.35); scene.add(m); return m; });
  const everyone = [ines, man, ...firemen, ...nb, ...crowd];
  const hideAll = () => { for (const a of everyone) a.root.visible = false; blankets.forEach((b) => (b.visible = false)); crowdPhones.forEach((p) => p && (p.visible = false)); };

  // Apple, her cat
  const apple = makeCat(); scene.add(apple.root); apple.root.scale.setScalar(1.0);
  // her phone: torch (a spot light out of its back) + its screen
  const phone = makePhone(); scene.add(phone);
  const torch = new THREE.SpotLight('#eef3ff', 0, 10, 0.55, 0.5, 2); torch.position.set(-0.02, 0.06, -0.006); torch.castShadow = true; torch.shadow.mapSize.set(1024, 1024);
  torch.shadow.bias = -0.0006; torch.shadow.camera.near = 0.05; phone.add(torch); const tTarget = new THREE.Object3D(); tTarget.position.set(-0.02, 0.06, -1); phone.add(tTarget); torch.target = tTarget;
  const screenGlow = new THREE.PointLight('#cfe0ff', 0, 1.6, 2); screenGlow.position.set(0, 0, 0.22); phone.add(screenGlow);
  // the torch beam seen in smoke: a cone, brighter where we look along it
  const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uI: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vA; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vA = clamp(-position.y / 6.0 + 0.5, 0.0, 1.0); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uI, uTime; varying vec3 vN; varying vec3 vV; varying float vA; varying vec3 vW; ${SIMPLEX}
      void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float n = 0.65 + 0.35 * snoise(vW * 1.7 + vec3(0.0, uTime * 0.25, 0.0));
        gl_FragColor = vec4(vec3(0.75, 0.82, 1.0) * uI * f * n * pow(max(1.0 - vA, 0.0), 1.3), 1.0); }` });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 6, 40, 1, true), beamMat); beam.rotation.x = -Math.PI / 2; beam.position.set(-0.02, 0.06, -3.0); beam.renderOrder = 8; phone.add(beam);
  const drawPhone = (mode, t) => {
    const cv = phone.tex.image, c = cv.getContext('2d'), Wc = cv.width, Hc = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#05060a'; c.fillRect(0, 0, Wc, Hc);
    const bat = batAt(t), clk = fmtClock(clockAt(t));
    c.fillStyle = '#fff'; c.font = '600 30px Inter, Arial'; c.textAlign = 'left'; c.fillText(clk, 40, 58);
    c.textAlign = 'right'; c.fillStyle = bat <= 5 ? '#ff453a' : '#fff'; c.fillText(`${bat} %`, Wc - 40, 58);
    if (mode === 'call') {
      c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = '300 120px Inter, Arial'; c.fillText('18', Wc / 2, 300);
      c.font = '500 34px Inter, Arial'; c.fillStyle = '#c9c9ce'; c.fillText('Pompiers', Wc / 2, 360);
      const s = Math.max(0, Math.floor(t - S.call.t0 + 2)); c.font = '400 32px Inter, Arial'; c.fillText(`00:${String(s).padStart(2, '0')}`, Wc / 2, 410);
      for (const [i, lab] of ['muet', 'clavier', 'haut-parleur'].entries()) { const x = Wc / 2 + (i - 1) * 150, y = 640;
        c.fillStyle = i === 2 ? '#ffffff' : 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(x, y, 52, 0, Math.PI * 2); c.fill();
        c.fillStyle = i === 2 ? '#000' : '#fff'; c.font = '600 22px Inter, Arial'; c.fillText(lab, x, y + 92); }
      c.fillStyle = '#ff3b30'; c.beginPath(); c.arc(Wc / 2, 880, 60, 0, Math.PI * 2); c.fill();
    } else if (mode === 'msg') {
      c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = '200 150px Inter, Arial'; c.fillText(clk, Wc / 2, 290);
      c.fillStyle = 'rgba(40,40,46,.92)'; c.beginPath(); c.roundRect(30, 400, Wc - 60, 210, 34); c.fill();
      c.textAlign = 'left'; c.fillStyle = '#9a9aa2'; c.font = '600 24px Inter, Arial'; c.fillText('MESSAGES · maintenant', 64, 450);
      c.fillStyle = '#fff'; c.font = '700 32px Inter, Arial'; c.fillText('Numéro inconnu', 64, 500);
      c.font = '500 34px Inter, Arial'; c.fillText('Tu es restée. Dommage.', 64, 560);
    } else { c.fillStyle = '#0a0b10'; c.fillRect(0, 80, Wc, Hc); c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '500 26px Inter, Arial'; c.fillText('Lampe torche', Wc / 2, Hc - 120); }
    phone.tex.needsUpdate = true;
  };
  // the phone in a hand: the palm frame ((Index1 - Pinky1) x (Middle1 - Hand) points out of the palm), screen out of the palm
  const tA = V(0, 0, 0), tB = V(0, 0, 0), mB = new THREE.Matrix4();
  function phoneFit(av, side = 'Right') {
    const B = av.bones, hd = wp(B[side + 'Hand']), i1 = wp(B[side + 'HandIndex1']), p1 = wp(B[side + 'HandPinky1']), m1 = wp(B[side + 'HandMiddle1']);
    const Z = tA.copy(i1).sub(p1).cross(tB.copy(m1).sub(hd)).normalize(); if (side === 'Left') Z.negate();
    const X = hd.clone().sub(m1); X.addScaledVector(Z, -X.dot(Z)).normalize(); if (side === 'Left') X.negate();
    const Yv = Z.clone().cross(X).normalize();
    mB.makeBasis(X, Yv, Z); phone.quaternion.setFromRotationMatrix(mB);
    phone.position.copy(m1).addScaledVector(X, -0.03).addScaledVector(Z, 0.0375).addScaledVector(Yv, 0.004); phone.updateMatrixWorld(true);
  }

  // ---------- smoke, fire, water ----------
  const sAtlas = smokeAtlas(12, 1.2);
  const gapSm = new Billboards(110, { map: sAtlas, additive: false, lit: true, minPx: 1.6, near: 0.25, nearK: 0, renderOrder: 4 }); scene.add(gapSm.mesh);
  const landSm = new Billboards(160, { map: sAtlas, additive: false, lit: true, minPx: 1.6, near: 0.15, nearK: 1, renderOrder: 4 }); scene.add(landSm.mesh);
  const fireSm = new Billboards(220, { map: smokeAtlas(5, 1.2), additive: false, lit: true, minPx: 1.6, near: 0.6, renderOrder: 4 }); scene.add(fireSm.mesh);
  const flames = new Billboards(18, { map: fireStripAtlas(3), tiles: [1, 4], additive: true, upright: true, anchor: 1, minPx: 1.6, near: 0.4, renderOrder: 6 }); scene.add(flames.mesh);
  for (const bb of [gapSm, landSm, fireSm]) { bb.u.uShadeCol.value.set(0.05, 0.05, 0.055); }
  fireSm.u.uLitCol.value.set(0.32, 0.27, 0.24);
  const fireLight = new THREE.PointLight('#ff7a2a', 0, 14, 2); fireLight.position.set(FIRE_BAY, LV[2] + 1.4, -1.2); scene.add(fireLight);
  const wellLight = new THREE.PointLight('#ff6a20', 0, 12, 2); wellLight.position.set(6.25, LV[3] + 0.5, -7.0); scene.add(wellLight);
  const beaconLights = [V(-0.5 + 4.5, 2.8, 6.1), V(-0.5 - 4.6, 2.5, 7.3), V(-11.5 + 3.6, 2.8, 6.3)].map((p) => { const l = new THREE.PointLight('#3a66ff', 0, 30, 2); l.position.copy(p); scene.add(l); return l; });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.36, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.05, transparent: true, opacity: 0.55 }));
  water.position.copy(room.anchors.spout).add(V(0, -0.18, 0)); scene.add(water);
  const drops = new Sparks(900, { additive: false, minPx: 1.6, maxPx: 8, near: 0.1 }); scene.add(drops.points);
  { const r = rng(77); let n = 0;
    for (let k = 0; k < 520; k++) { const b = 0.02 * k; drops.set(n++, 3.75 + r() * 0.12, Y0 + 1.05 + r() * 0.1, -3.85 + r() * 0.1, 0.9 + r() * 0.6, 1.2 + r() * 1.2, -1.6 - r() * 0.6, 0.75, 0.82, 0.9, 0.006 + r() * 0.008, 1000 + b * 0.0, 0.6 + r() * 0.3, r()); }
    drops.commit(); drops.u.uAcc.value.set(0, -9.8, 0); drops.u.uAccT0.value = 0; }
  const towelWet = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 2), new THREE.MeshStandardMaterial({ color: '#2f5f7c', roughness: 0.7 }));
  { const p = towelWet.geometry.attributes.position; const r = rng(3); for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); v.multiplyScalar(0.8 + 0.35 * r()); v.y *= 0.45; p.setXYZ(i, v.x, v.y, v.z); } towelWet.geometry.computeVertexNormals(); }
  scene.add(towelWet);

  // ---------- the end card (a Paris street sign) + Apple peeking over "Abonne-toi pour la suite" ----------
  const endEl = document.getElementById('end');
  const sign = document.createElement('div');
  sign.style.cssText = 'position:absolute;left:50%;top:640px;transform:translateX(-50%);background:#22397a;border:8px solid #2e6b4a;outline:5px solid #e8e6df;border-radius:16px;padding:30px 60px;text-align:center;min-width:640px;font-family:Inter,sans-serif;color:#fff';
  sign.innerHTML = `<div style="display:inline-block;background:#ff2e2e;font-weight:800;font-size:30px;padding:6px 14px;border-radius:8px;letter-spacing:.06em">12 %</div>
    <div style="font-weight:800;font-size:46px;margin-top:18px;letter-spacing:.03em">PARTIE 2</div><div style="font-weight:800;font-size:80px;line-height:1;margin-top:6px">L'ESCALIER</div>`;
  const fine = document.createElement('div');
  fine.style.cssText = 'position:absolute;left:0;right:0;top:1560px;text-align:center;font:500 21px Inter,sans-serif;color:rgba(255,255,255,.5);line-height:1.5';
  fine.innerHTML = 'Fiction. Conseils vérifiés : sapeurs-pompiers (pompiers.fr), ministère de l\'Intérieur.<br>Voix : Kyutai TTS (CC BY 4.0).';
  endEl.querySelector('.t').innerHTML = ''; endEl.querySelector('.n').innerHTML = '';
  endEl.appendChild(sign); endEl.appendChild(fine);
  const tag = makeEndTag({ text: 'Abonne-toi pour la suite', ssaa: globalThis.SSAA });

  await Promise.all(TEX_PENDING);

  // ---------- poses ----------
  const BL = [5.1, 8.2, 12.6, 19.9, 24.4, 31.2, 35.8, 44.9, 56.1, 61.3, 66.2, 70.8, 75.5, 96.3, 99.2];
  const blinkK = (t) => { let k = 0; for (const b0 of BL) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  const IP = V(4.22, Y0, -3.5), DOORYAW = Math.PI;                    // where she stands facing her door
  const torchHand = (aimAt) => (sh, fwd, left, up) => {
    const hand = sh.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.28).addScaledVector(left, -0.12);
    const back = aimAt.clone().sub(hand).normalize();                   // the phone's back (torch) points at aimAt
    const N = back.clone().negate();                                    // palm (and screen) face back toward her
    const F = up.clone().addScaledVector(back, -up.dot(back)).normalize();
    return { hand, pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5).addScaledVector(fwd, -0.2), F, N, curl: 0.55 };
  };
  const poseInes = (fn) => { ines.root.visible = true; fn(); ines.blink(blinkK(curT)); ines.root.updateMatrixWorld(true); };
  let curT = 0;

  // ---------- shots: camera + what is visible ----------
  const P2 = (s, a, b, ta, tb, fa, fb = fa) => new CamPath([[s.t0, a, ta, fa], [s.t1, b, tb, fb]], { easeIn: false, easeOut: false, arc: true });
  const CAM = {
    hook: P2(S.hook, V(4.62, Y0 + 0.3, -3.25), V(4.55, Y0 + 0.27, -3.5), V(4.22, Y0 + 0.12, -4.38), V(4.24, Y0 + 0.12, -4.38), 52, 48),
    face: P2(S.face, V(4.33, Y0 + 1.5, -4.18), V(4.31, Y0 + 1.52, -4.06), V(4.22, Y0 + 1.56, -3.5), V(4.22, Y0 + 1.57, -3.5), 36, 32),
    ext: P2(S.ext, V(6.8, 1.7, 11.9), V(6.6, 1.75, 11.6), V(3.6, 13.5, 0), V(3.4, 17.0, 0), 58, 52),
    flash: P2(S.flash, V(1.95, 1.62, 3.7), V(1.8, 1.62, 3.45), V(0.35, 1.45, -0.7), V(0.35, 1.45, -0.7), 42, 40),
    man: P2(S.man, V(1.05, 1.66, 0.75), V(0.95, 1.66, 0.55), V(0.33, 1.66, -0.82), V(0.33, 1.66, -0.82), 30, 27),
    detector: P2(S.detector, V(3.35, Y0 + 1.75, -2.45), V(3.4, Y0 + 1.8, -2.55), V(3.7, ROOM.CEIL - 0.04, -3.0), V(3.7, ROOM.CEIL - 0.04, -3.0), 30, 27),
    apple: P2(S.apple, V(3.45, Y0 + 0.3, -3.35), V(3.5, Y0 + 0.28, -3.45), V(4.02, Y0 + 0.16, -4.05), V(4.02, Y0 + 0.16, -4.05), 40, 36),
    gap: P2(S.gap, V(4.62, Y0 + 0.24, -3.72), V(4.6, Y0 + 0.22, -3.8), V(4.24, Y0 + 0.04, -4.36), V(4.24, Y0 + 0.04, -4.36), 46, 42),
    hand: P2(S.hand, V(3.9, Y0 + 1.42, -3.98), V(3.93, Y0 + 1.41, -4.02), V(4.3, Y0 + 1.3, -4.37), V(4.3, Y0 + 1.3, -4.37), 34, 31),
    peep: P2(S.peep, V(4.295, Y0 + 1.55, -4.47), V(4.295, Y0 + 1.55, -4.5), V(6.1, Y0 + 1.0, -5.5), V(6.1, Y0 + 1.0, -5.5), 110, 110),
    etsi: P2(S.etsi, V(3.22, Y0 + 1.75, -2.72), V(3.23, Y0 + 1.75, -2.75), V(4.15, Y0 + 1.15, -4.45), V(4.15, Y0 + 1.15, -4.45), 50, 49),
    open: P2(S.open, V(2.95, Y0 + 1.62, -2.45), V(3.0, Y0 + 1.6, -2.6), V(4.3, Y0 + 1.15, -4.4), V(4.3, Y0 + 1.2, -4.4), 52, 50),
    well: P2(S.well, V(6.25, LV[6] + 1.45, -5.82), V(6.25, LV[6] + 1.4, -5.9), V(6.25, LV[3], -7.0), V(6.25, LV[3], -7.1), 72, 70),
    blind: P2(S.blind, V(4.62, Y0 + 1.6, -4.95), V(4.75, Y0 + 1.6, -5.0), V(6.6, Y0 + 0.9, -5.3), V(6.6, Y0 + 0.85, -5.3), 60, 58),
    stat: P2(S.stat, V(4.75, Y0 + 1.6, -5.0), V(4.85, Y0 + 1.58, -5.05), V(6.6, Y0 + 0.85, -5.3), V(6.6, Y0 + 0.8, -5.3), 58, 56),
    bolt: P2(S.bolt, V(3.6, Y0 + 1.36, -4.02), V(3.62, Y0 + 1.35, -4.06), V(3.97, Y0 + 1.24, -4.33), V(3.97, Y0 + 1.24, -4.33), 36, 33),
    sink: P2(S.sink, V(4.52, Y0 + 1.5, -1.85), V(4.5, Y0 + 1.48, -1.95), V(4.45, Y0 + 0.92, -2.85), V(4.45, Y0 + 0.92, -2.85), 46, 43),
    towels: P2(S.towels, V(3.58, Y0 + 0.36, -4.02), V(3.62, Y0 + 0.34, -4.06), V(4.3, Y0 + 0.1, -4.33), V(4.3, Y0 + 0.1, -4.33), 50, 47),
    splash: P2(S.splash, V(4.75, Y0 + 1.25, -2.95), V(4.72, Y0 + 1.23, -3.02), V(3.95, Y0 + 0.9, -4.2), V(3.95, Y0 + 0.9, -4.2), 48, 46),
    call: P2(S.call, V(3.92, Y0 + 0.58, -3.68), V(3.93, Y0 + 0.54, -3.72), V(3.97, Y0, -3.98), V(3.97, Y0, -3.98), 40, 38),
    speaker: P2(S.speaker, V(4.02, Y0 + 0.62, -4.18), V(4.03, Y0 + 0.64, -4.15), V(4.3, Y0 + 1.05, -3.72), V(4.3, Y0 + 1.06, -3.72), 42, 40),
    low: P2(S.low, V(4.3, Y0 + 0.75, -2.15), V(4.25, Y0 + 0.73, -2.08), V(3.2, Y0 + 0.65, -1.2), V(3.2, Y0 + 0.65, -1.2), 48, 45),
    street: P2(S.street, V(3.2, ROOM.SILL + 0.45, 0.02), V(3.2, ROOM.SILL + 0.47, 0.08), V(-0.5, 0, 7.0), V(-0.6, 0, 6.9), 62, 60),
    door: P2(S.door, V(3.0, 1.6, 3.7), V(2.8, 1.6, 3.5), V(0, 1.7, -0.4), V(0, 1.7, -0.4), 50, 48),
    neigh: P2(S.neigh, V(9.6, 3.4, 6.6), V(9.4, 3.3, 6.3), V(6.4, 0.35, 1.5), V(6.4, 0.35, 1.5), 40, 38),
    ladder: P2(S.ladder, V(-2.2, 1.45, 9.8), V(-2.0, 1.5, 9.6), V(1.2, 12.5, 2.6), V(1.6, 14.5, 2.2), 62, 60),
    news: P2(S.news, V(-1.0, 3.2, 10.6), V(-1.2, 3.3, 10.3), V(FIRE_BAY, 10.5, 0), V(FIRE_BAY, 11.5, 0), 46, 43),
    crowd: P2(S.crowd, V(-1.6, 1.85, 12.75), V(-1.5, 1.88, 12.6), V(1.0, 5.6, 0), V(1.2, 6.4, 0), 62, 58),
    man2: P2(S.man2, V(6.9, 1.7, 9.7), V(7.0, 1.72, 10.0), V(7.6, 1.8, 11.5), V(7.6, 1.8, 11.5), 34, 30),
    manclose: P2(S.manclose, V(7.22, 1.86, 10.86), V(7.27, 1.86, 10.92), V(7.6, 1.86, 11.5), V(7.6, 1.86, 11.5), 26, 24),
    msg: P2(S.msg, V(3.02, Y0 + 0.98, -1.0), V(3.03, Y0 + 0.99, -1.03), V(3.18, Y0 + 1.22, -1.48), V(3.18, Y0 + 1.22, -1.48), 38, 34),
  };
  const camTmp = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.03, 100);
  const fill = new THREE.PointLight('#a9b9d8', 0, 5, 2); scene.add(fill);                 // a soft bounce near the lens, set per shot
  const smokeLit = (v) => { for (const bb of [gapSm, landSm]) { bb.u.uLitCol.value.setScalar(v); bb.u.uShadeCol.value.setScalar(v * 0.25); } };
  const fogTo = (d, col) => { scene.fog.density = d; scene.fog.color.set(col); for (const bb of [gapSm, landSm, fireSm, flames]) { bb.u.uFogD.value = d; bb.u.uFogCol.value.set(col); } };
  const rsm = rng(909);
  const GAP = Array.from({ length: 90 }, (_, i) => ({ b: i * 0.13, x: (rsm() - 0.5) * 0.7, vx: (rsm() - 0.5) * 0.06, vz: 0.12 + rsm() * 0.1, vy: 0.012 + rsm() * 0.03, s: 0.22 + rsm() * 0.25, r: rsm() * 6.28, life: 7 + rsm() * 3 }));
  const LAND = Array.from({ length: 160 }, () => ({ x: 1.8 + rsm() * 5.6, y: rsm(), z: -4.6 - rsm() * 1.1, s: 0.8 + rsm() * 1.6, r: rsm() * 6.28, w: 0.3 + rsm() * 0.6, ph: rsm() * 6.28 }));
  const FSM = Array.from({ length: 220 }, (_, i) => ({ b: i * 0.17, x: (rsm() - 0.5) * 1.0, life: 10 + rsm() * 5, vy: 1.0 + rsm() * 0.6, vz: 0.25 + rsm() * 0.35, s: 0.8 + rsm() * 1.4, r: rsm() * 6.28 }));
  const smokeStart = S.detector.t0 - 6, gapStop = Lw(16, 'tasse');
  function updateSmoke(t, which) {
    // under the door: cards born at the gap, drifting into the room, growing; no new ones once the towels are in
    for (let i = 0; i < GAP.length; i++) {
      const c = GAP[i], tb = smokeStart + c.b * (0.6 + 0.4 * Math.sin(i)), a = (t - tb) % c.life, born = t >= tb && tb < gapStop + c.life * 0 && (t - tb) < c.life * 6;
      const ag = born ? ((t - tb) % c.life) : -1;
      if (!which.gap || ag < 0 || tb + Math.floor((t - tb) / c.life) * c.life > gapStop) { gapSm.hide(i); continue; }
      const k = ag / c.life, alpha = Math.min(1, ag / 0.5) * (1 - k) * (0.4 + 0.35 * (1 - Math.min(1, ag / 2)));
      gapSm.set(i, 4.3 + c.x + c.vx * ag, Y0 + 0.04 + c.vy * ag + 0.02 * Math.sin(ag * 1.3 + i), ROOM.Z0 + 0.04 + c.vz * ag, c.s * (1 + 1.3 * k), c.s * (0.5 + 0.9 * k), 0.42, 0.4, 0.38, alpha, c.r + ag * 0.15, i % 4);
    }
    // haze drifting under the ceiling (the detector's shot), on the gap system (no near fade)
    for (let i = 90; i < 110; i++) {
      if (!which.ceil) { gapSm.hide(i); continue; }
      const c = GAP[i - 90];
      gapSm.set(i, 3.42 + (i - 90) * 0.03 + 0.03 * Math.sin(t * 0.3 + i), ROOM.CEIL - 0.07 - 0.05 * Math.abs(Math.sin(i)), -3.05 + c.x * 0.7 + 0.03 * Math.sin(t * 0.5 + i), 0.35 + c.s * 0.8, 0.2 + c.s * 0.4, 0.42, 0.4, 0.38, 0.45, c.r + t * 0.04, i % 4);
    }
    gapSm.commit();
    // the landing / stairwell: a slow churn; denser when which.land > 0
    for (let i = 0; i < LAND.length; i++) {
      const c = LAND[i]; if (!which.land) { landSm.hide(i); continue; }
      const inWell = i % 3 === 0, yy = inWell ? LV[3] + ((c.y * 11 + t * 0.9) % 11) : Y0 + 0.2 + c.y * 2.2;
      const x = inWell ? 6.25 + Math.sin(c.ph + t * 0.3) * 0.25 : c.x + Math.sin(c.ph + t * c.w) * 0.2, z = inWell ? -5.8 - c.y * 2.6 : c.z + Math.cos(c.ph + t * 0.4) * 0.15;
      const col = inWell ? [0.5, 0.36, 0.26] : [0.42, 0.4, 0.38];
      landSm.set(i, x, yy, z, c.s * (inWell ? 1.4 : 1), c.s * (inWell ? 1.4 : 1), col[0], col[1], col[2], 0.62 * which.land, c.r + t * 0.05 * (i % 2 ? 1 : -1), i % 4);
    }
    // haze drifting under the ceiling (the detector's shot)
    // the doorway flood when she opens (cards pushed in toward the camera)
    if (which.flood != null) for (let i = 0; i < 80; i++) {
      const c = LAND[i], tb = which.flood + i * 0.03, ag = t - tb; if (ag < 0) { landSm.hide(i); continue; }
      landSm.set(i, 4.3 + (c.x - 4.6) * 0.16 * (1 + ag), Y0 + 1.95 - 0.35 * ag * ag + c.y * 0.25, ROOM.Z0 + 0.15 + ag * (1.1 + c.w), 0.9 + ag * 2.0, 0.8 + ag * 1.7, 0.07, 0.066, 0.062, Math.min(0.97, ag * 3.0), c.r + ag * 0.3, i % 4);
    }
    landSm.commit();
    // outside: the 2nd-floor window pours smoke up the front
    for (let i = 0; i < FSM.length; i++) {
      const c = FSM[i]; if (!which.fire) { fireSm.hide(i); continue; }
      const tb = -20 + c.b, ag = ((t - tb) % c.life + c.life) % c.life, k = ag / c.life;
      const y = LV[2] + 2.3 + c.vy * ag + 0.08 * ag * ag, z = 0.25 + c.vz * ag, x = FIRE_BAY + c.x * (1 + ag * 0.4) + 0.25 * ag;
      const sz = c.s * (1 + ag * 0.55);
      fireSm.set(i, x, y, z, sz, sz, 0.22, 0.2, 0.19, Math.min(1, ag / 1.2) * (1 - k) * 0.78 * which.fire, c.r + ag * 0.1, i % 4);
    }
    fireSm.commit();
    for (let i = 0; i < 18; i++) {
      if (!which.fire) { flames.hide(i); continue; }
      const f = Math.sin(t * (5 + i) + i * 1.7) * 0.5 + 0.5;
      flames.set(i, FIRE_BAY - 0.45 + (i % 6) * 0.18, LV[2] + 0.2 + (i > 11 ? 0.9 : 0), -0.55 + (i % 3) * 0.08, 0.5 + 0.2 * f, 1.4 + 0.6 * f, 2.2, 1.1, 0.4, 0.9 * which.fire, 0, i % 4);
    }
    flames.commit();
  }

  console.log('SHOTS ' + SH.map((x) => `${x.id}:${x.t0.toFixed(2)}`).join(' ') + ' DUR ' + DUR);
  // ---------- frame ----------
  let last = '';
  return {
    duration: DUR, fps: 30, captions: [],
    frame(t, opts = {}) {
      curT = t;
      const sh = shotAt(t), id = sh.id, k = (t - sh.t0) / Math.max(0.001, sh.t1 - sh.t0);
      hideAll(); phone.screen.material.emissiveIntensity = 1.0; apple.root.visible = false; phone.visible = false; water.visible = false; towelWet.visible = false; drops.points.visible = false;
      torch.intensity = 0; beamMat.uniforms.uI.value = 0; screenGlow.intensity = 0; W.stairLamp.intensity = 0; W.stair.lamp.material.emissiveIntensity = 0;
      W.blueSpot.intensity = 0; fireLight.intensity = 0; wellLight.intensity = 0; beaconLights.forEach((l) => (l.intensity = 0));
      room.setDoor(0); room.setBolt(t >= S.bolt.t0 + 0.6 ? 1 : 0); room.openWindow(0); room.rolled.visible = t >= gapStop; room.towelsHung.visible = t < S.sink.t0;
      room.setKitchen(t >= S.sink.t0 ? 1 : 0);
      W.hero.userData.setDoor(0); if (W.hero.userData.hallLight) W.hero.userData.hallLight.intensity = 0;
      W.epa.group.visible = W.fpt.group.visible = t >= S.street.t0 && id !== 'flash' && id !== 'man';
      W.epa.aim(V(HERO_BAY + 0.05, ROOM.SILL - 0.35, 0.95), id === 'ladder' ? lerp(0.25, 1.0, smooth(0, 0.95, k)) : t >= S.ladder.t1 ? 1 : 0);
      R.renderer.toneMappingExposure = 1.0;
      G.uSat.value = 1.0; G.uContrast.value = 1.05; G.uTint.value.set(1, 1, 1); G.uVignette.value = 0.55; G.uFade.value = 0; G.uFadeWhite.value = 0; G.uScan.value = 0; G.uBarrel.value = 0; G.uAberr.value = 0.0; fill.intensity = 0; smokeLit(0.04);
      const inRoom = ['hook', 'face', 'detector', 'apple', 'gap', 'hand', 'etsi', 'open', 'rewind', 'bolt', 'sink', 'towels', 'splash', 'call', 'speaker', 'low', 'msg'].includes(id);
      const roomSmoke = clamp((t - S.detector.t0 + 3) / 25) * (t > gapStop ? 0.8 : 1);
      fogTo(inRoom ? 0.03 + 0.09 * roomSmoke : 0.012, inRoom ? '#1a1816' : '#0b0d12');
      if (inRoom) { fill.intensity = 1.0; G.uAberr.value = 0.0012; }
      const fire = t < S.ext.t0 ? 0 : 1;
      const beaconsOn = t >= S.street.t0;
      // the night outside: beacons, fire glow
      if (beaconsOn) { updateBeacons(W.epa.beacons, t); updateBeacons(W.fpt.beacons, t); beaconLights.forEach((l, i) => (l.intensity = 900 * pulse(t, i * 0.33))); W.blueSpot.intensity = 26 * pulse(t, 0.2); }
      fireLight.intensity = fire ? 160 * (0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1)) : 0;
      let which = { gap: t >= smokeStart && inRoom, land: 0, fire: fire && !inRoom ? 1 : 0, flood: null };
      let isRew = false, tt = t;
      // ---- per shot ----
      if (id === 'hook' || id === 'apple') {
        apple.root.visible = true; apple.root.position.set(id === 'hook' ? 4.42 : 3.92, Y0, id === 'hook' ? -3.9 : -3.9); apple.root.rotation.y = id === 'hook' ? Math.PI + 1.15 : -Math.PI / 2 - 0.35; apple.update(t, { look: V(4.3, Y0 + 0.05, -4.4) });
        torch.intensity = 0; // a standalone torch from where she stands, behind the camera
        phone.visible = true; phone.position.set(4.32, Y0 + 1.25, -3.05); phone.lookAt(V(4.28, Y0 + 0.02, -4.35)); phone.rotateY(Math.PI); phone.updateMatrixWorld(true);
        torch.intensity = id === 'apple' ? 14 : 70; beamMat.uniforms.uI.value = 0.35; smokeLit(id === 'apple' ? 0.15 : 0.3); fill.intensity = id === 'apple' ? 0.25 : 1.2;
        R.renderer.toneMappingExposure = 1.1;
      }
      if (id === 'face' || id === 'gap' || id === 'hand' || id === 'etsi' || id === 'open' || id === 'rewind') {
        let aimAt = V(4.3, Y0 + 0.05, -4.35);
        poseInes(() => {
          const hand = id === 'hand';
          stand(ines, { pos: id === 'hand' ? V(4.2, Y0, -3.82) : (id === 'etsi' || id === 'open' || id === 'rewind') ? V(3.55, Y0, -3.85) : IP, yaw: (id === 'etsi' || id === 'open' || id === 'rewind') ? DOORYAW - 0.35 : DOORYAW, breath: t * 0.33, lean: id === 'face' ? 0.04 : 0.08,
            armR: hand ? (sh2, fwd, left, up) => ({ hand: V(4.3, Y0 + 1.3, ROOM.Z0 + 0.024), pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.6), F: up.clone(), N: fwd.clone().negate(), curl: 0.02 })
              : (id === 'etsi' || id === 'open' || id === 'rewind') ? (sh2, fwd, left, up) => { const lv = room.door.localToWorld(V(-(ROOM.DX1 - ROOM.DX0) + 0.14, 1.02, 0.09)); return { hand: lv, pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.6), F: left.clone().negate(), N: up.clone().negate(), curl: 0.7 }; }
              : torchHand(aimAt),
            armL: hand || id === 'etsi' || id === 'open' || id === 'rewind' ? torchHand(aimAt) : undefined,
            look: id === 'face' ? V(4.3, Y0 + 0.6, -4.4) : V(4.3, Y0 + 1.0, -4.4), lookK: 0.8 });
        });
        phone.visible = true; phoneFit(ines, (id === 'hand' || id === 'etsi' || id === 'open' || id === 'rewind') ? 'Left' : 'Right');
        torch.intensity = id === 'hand' ? 12 : id === 'gap' ? 26 : 70; beamMat.uniforms.uI.value = 0.25 + 0.4 * roomSmoke; screenGlow.intensity = 0.5; smokeLit(id === 'gap' ? 0.55 : 0.28); fill.intensity = id === 'hand' || id === 'gap' ? 0.3 : 1.5;
      }
      if (id === 'face') { drawPhone('torch', t); R.renderer.toneMappingExposure = 1.15; }
      if (id === 'ext') { which.fire = 1; R.renderer.toneMappingExposure = 1.0; phone.visible = true; phone.position.set(4.3, Y0 + 1.25, -3.4); phone.lookAt(V(4.3, Y0, -4.4)); phone.rotateY(Math.PI); phone.updateMatrixWorld(true); torch.intensity = 70; }
      if (id === 'flash' || id === 'man') {
        // 22:41, earlier tonight: he holds the door; she walks in. Cooler, softer picture
        W.hero.userData.hallLight.intensity = 40; which.fire = 0; fireLight.intensity = 0;
        man.root.visible = true; W.hero.userData.setDoor(0.6); W.hero.updateMatrixWorld(true);
        const knob = W.hero.userData.door.hinge.localToWorld(V(-1.35 + 0.14, 1.15, 0.1));
        stand(man, { pos: V(0.3, 0.005, -0.85), yaw: 0.35, breath: t * 0.3,
          armL: (sh2, fwd, left, up) => ({ hand: knob, pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, 0.6).addScaledVector(fwd, -0.3), curl: 0.6 }),
          look: id === 'man' ? (CAM.man.apply(camTmp, t), camTmp.position.clone()) : V(lerp(2.3, 0.9, k), 1.6, lerp(3.0, 0.9, k)), lookK: 0.85, cache: {} });
        if (id === 'flash') {
          poseInes(() => { const u = k, p = V(lerp(2.3, 0.9, u), K, lerp(3.0, 0.9, u)); walk(ines, { pos: p, yaw: Math.atan2(-1.4, -2.1), phase: u * 3.2, look: V(0.2, 1.7, 0.2) }); });
        }
        G.uSat.value = 0.55; G.uTint.value.set(0.9, 0.97, 1.08); G.uContrast.value = 1.0; R.renderer.toneMappingExposure = 1.15;
      }
      if (id === 'detector') {
        const beep = (t - S.detector.t0) % 2.6, on = beep < 1.5 ? (Math.floor(beep / 0.5) % 2 === 0 ? 1 : 0) : 0;
        room.led.material.emissiveIntensity = 6 * on; which.gap = true; which.ceil = true; smokeLit(0.16); fogTo(0.09, '#2a2723');
        poseInes(() => { stand(ines, { pos: V(2.35, Y0, -3.0), yaw: Math.PI * 0.35, breath: t * 0.4, look: V(3.7, ROOM.CEIL, -3.0), lookK: 0.9 }); });
        R.renderer.toneMappingExposure = 1.2;
      } else room.led.material.emissiveIntensity = 0;
      if (id === 'peep') {
        which.land = 1; W.stairLamp.intensity = 9; W.stair.lamp.material.emissiveIntensity = 3; fogTo(0.2, '#3b3631'); smokeLit(0.3);
        G.uBarrel.value = 0.55; G.uVignette.value = 0.9; R.renderer.toneMappingExposure = 1.2;
      }
      if (id === 'etsi' || id === 'open' || id === 'well' || id === 'blind' || id === 'stat' || id === 'rewind') {
        G.uSat.value = 0.6; G.uTint.value.set(1.06, 0.96, 0.94);
      }
      if (id === 'etsi') { tt = S.etsi.t0 + 0.25; G.uSat.value = 0.35; }
      if (id === 'open' || id === 'rewind') {
        const to = id === 'open' ? t : S.open.t1 - (t - S.rewind.t0) * ((S.open.t1 - S.open.t0) / (S.rewind.t1 - S.rewind.t0)) * 0.9;
        const ko = clamp((to - S.open.t0 - 0.35) / 0.9); room.setDoor(0.75 * ko * ko * (3 - 2 * ko));
        which.land = 1; which.flood = S.open.t0 + 0.5; W.stairLamp.intensity = 7; W.stair.lamp.material.emissiveIntensity = 3;
        fogTo(0.05 + 0.45 * clamp((to - S.open.t0 - 0.6) / 1.6), clamp((to - S.open.t0 - 0.6) / 1.6) > 0.5 ? '#161412' : '#2c2824');
        isRew = id === 'rewind'; tt = to;
        updateSmoke(to, which); which = null;
      }
      if (id === 'well') { which.land = 1; wellLight.intensity = 90 * (0.85 + 0.15 * Math.sin(t * 5.1)); W.stairLamp.intensity = 4; fogTo(0.16, '#2e2925'); smokeLit(0.22); R.renderer.toneMappingExposure = 1.25; }
      if (id === 'blind' || id === 'stat') {
        poseInes(() => { stand(ines, { pos: V(4.5, Y0, -5.0), yaw: Math.PI / 2 + 0.25, breath: t * 0.6, lean: 0.15,
          armR: (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.55).addScaledVector(up, -0.05), pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5), F: fwd.clone(), N: left.clone(), curl: 0.25 }),
          armL: torchHand(V(6.6, Y0 + 0.8, -5.3)) }); });
        phone.visible = true; phoneFit(ines, 'Left'); torch.intensity = 50; beamMat.uniforms.uI.value = 0.9; smokeLit(0.2);
        which.land = 1; W.stairLamp.intensity = 2;
        const dk = id === 'stat' ? smooth(0, 0.85, k) : 0;
        fogTo(0.6 + 0.9 * (id === 'blind' ? k : 1), id === 'stat' ? '#0d0c0b' : '#1d1a17');
        torch.intensity = 50 * (1 - dk); beamMat.uniforms.uI.value = 0.9 * (1 - dk); G.uFade.value = 0.9 * dk;
      }
      if (id === 'rewind') { G.uScan.value = 1.0; G.uSat.value = 0.5; G.uAberr.value = 0.012; }
      if (id === 'bolt') {
        poseInes(() => { stand(ines, { pos: V(4.05, Y0, -3.72), yaw: DOORYAW, breath: t * 0.5,
          armR: (sh2, fwd, left, up) => ({ hand: room.anchors.knob.clone().add(V(0.02, -0.03, 0.06)), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: up.clone(), N: fwd.clone().negate(), curl: 0.65 }),
          armL: torchHand(V(4.0, Y0 + 1.1, -4.4)), look: room.anchors.knob }); });
        phone.visible = true; phoneFit(ines, 'Left'); torch.intensity = 10; screenGlow.intensity = 0.3;
        room.setBolt(smooth(0.25, 0.6, k));
      }
      if (id === 'sink') {
        poseInes(() => { stand(ines, { pos: V(4.12, Y0, -2.85), yaw: Math.PI / 2, breath: t * 0.5, lean: 0.12,
          armR: (sh2, fwd, left, up) => ({ hand: room.anchors.sink.clone().add(V(-0.06, 0.12, -0.08)), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: fwd.clone(), N: up.clone().negate(), curl: 0.55 }),
          armL: (sh2, fwd, left, up) => ({ hand: room.anchors.sink.clone().add(V(-0.06, 0.12, 0.1)), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, 0.5), F: fwd.clone(), N: up.clone().negate(), curl: 0.55 }),
          look: room.anchors.sink }); });
        water.visible = true; water.scale.set(1 + 0.08 * Math.sin(t * 31), 1, 1 + 0.08 * Math.cos(t * 27));
        towelWet.visible = true; towelWet.position.copy(room.anchors.sink).add(V(-0.02, 0.06, 0)); towelWet.rotation.set(0.2, t * 0.4, 0.1);
        R.renderer.toneMappingExposure = 1.2;
      }
      if (id === 'towels') {
        poseInes(() => { kneel(ines, { pos: V(4.3, Y0, -3.86), yaw: DOORYAW, hipH: 0.5, lean: 0.55, breath: t * 0.6,
          armR: (sh2, fwd, left, up) => ({ hand: V(4.42 + 0.06 * Math.sin(t * 3), Y0 + 0.1, ROOM.Z0 + 0.15), pole: sh2.clone().addScaledVector(up, -0.3).addScaledVector(left, -0.6), F: fwd.clone(), N: up.clone().negate(), curl: 0.3 }),
          armL: (sh2, fwd, left, up) => ({ hand: V(4.06 - 0.06 * Math.sin(t * 3), Y0 + 0.1, ROOM.Z0 + 0.15), pole: sh2.clone().addScaledVector(up, -0.3).addScaledVector(left, 0.6), F: fwd.clone(), N: up.clone().negate(), curl: 0.3 }),
          look: V(4.3, Y0, -4.3) }); });
        room.rolled.visible = true;
      }
      if (id === 'splash') {
        phone.visible = true; phone.position.set(4.02, Y0 + 0.03, -3.72); phone.lookAt(V(4.3, Y0 + 1.1, -4.4)); phone.rotateY(Math.PI); phone.updateMatrixWorld(true); torch.intensity = 22;
        poseInes(() => { stand(ines, { pos: V(3.55, Y0, -3.55), yaw: DOORYAW + 0.7, breath: t * 0.6, lean: 0.2,
          armR: (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.45 - 0.2 * smooth(0.0, 0.25, k)).addScaledVector(up, -0.25), pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5), curl: 0.6 }),
          armL: (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.45 - 0.2 * smooth(0.0, 0.25, k)).addScaledVector(up, -0.25).addScaledVector(left, 0.18), pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, 0.5), curl: 0.6 }),
          look: V(4.3, Y0 + 1.0, -4.4) }); });
        drops.points.visible = true; drops.u.uAccT0.value = S.splash.t0 + 0.25;
        for (let i = 0; i < 520; i++) drops.prm[i * 4 + 1] = S.splash.t0 + 0.25 + i * 0.0008;
        drops.commit();
        room.rolled.visible = true;
      }
      if (id === 'call' || id === 'speaker') {
        phone.visible = true; phone.position.set(3.97, Y0 + 0.006, -3.98); phone.rotation.set(-Math.PI / 2, 0, 0.35); phone.updateMatrixWorld(true);
        drawPhone('call', t); screenGlow.intensity = 0.35; phone.screen.material.emissiveIntensity = 0.55; room.rolled.visible = true;
        poseInes(() => { kneel(ines, { pos: V(4.32, Y0, -3.72), yaw: DOORYAW + 0.35, hipH: 0.55, lean: 0.25, breath: t * 0.7, look: id === 'speaker' ? V(3.97, Y0, -3.98) : V(4.3, Y0 + 0.3, -4.4), lookK: 0.9 }); });
        if (beaconsOn) W.blueSpot.intensity = 26 * pulse(t, 0.2);
        R.renderer.toneMappingExposure = 1.25;
      }
      if (id === 'low' || id === 'msg') {
        room.openWindow(id === 'low' ? smooth(0.55, 0.85, k) : 1);
        apple.root.visible = true; apple.root.position.set(3.75, Y0, -1.55); apple.root.rotation.y = -0.6; apple.update(t, { look: V(3.2, Y0 + 1.0, -1.4) });
        poseInes(() => { kneel(ines, { pos: V(3.18, Y0, -1.5), yaw: 0.0, hipH: id === 'low' ? 0.42 : 0.6, lean: id === 'low' ? 0.35 : 0.1, breath: t * 0.55,
          armR: id === 'msg' ? (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.3).addScaledVector(left, 0.12), pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.6), F: up.clone().addScaledVector(fwd, 0.4), N: up.clone().addScaledVector(fwd, -1).normalize(), curl: 0.55 }) : undefined,
          look: id === 'msg' ? V(3.12, Y0 + 0.9, -1.15) : V(3.2, ROOM.SILL + 0.4, -0.4), lookK: 0.9 }); });
        if (id === 'msg') { phone.visible = true; phoneFit(ines, 'Right'); drawPhone('msg', t); screenGlow.intensity = 0.12; phone.screen.material.emissiveIntensity = 0.5; }
        W.blueSpot.intensity = 30 * pulse(t, 0.2); R.renderer.toneMappingExposure = 1.3;
      }
      if (id === 'street') { room.openWindow(1); which.fire = 1; }
      if (['street', 'door', 'neigh', 'ladder', 'news', 'crowd', 'man2', 'manclose'].includes(id)) {
        which.fire = 1;
        // firemen: one at the turntable, two by the neighbours, one in the basket (or two going in, in 'door')
        const f = firemen;
        f[0].root.visible = true; stand(f[0], { pos: V(-5.0, 0, 7.6), yaw: -Math.PI / 2 + 0.3, look: V(HERO_BAY, 18, 0), lookK: 0.6, cache: {} });
        if (id === 'door') {
          W.hero.userData.setDoor(1); W.hero.userData.hallLight.intensity = 2;
          for (const [i, x0] of [[1, 1.4], [2, 2.4]]) { f[i].root.visible = true; walk(f[i], { pos: V(lerp(x0, 0.4, k * 0.8), K, lerp(2.0 + i * 0.4, 0.6, k * 0.8)), yaw: Math.atan2(-0.6, -1.2), phase: k * 2.2 + i * 0.5 }); }
        } else {
          for (const [i, a] of [[1, nb[0]], [2, nb[1]]]) {
            f[i].root.visible = true; const bx = 5.6 + (i - 1) * 1.7;
            kneel(f[i], { pos: V(bx, K, 2.25), yaw: Math.PI, hipH: 0.55, lean: 0.4, look: V(bx, K + 0.2, 1.35), cache: {},
              armR: (sh2, fwd, left, up) => ({ hand: V(bx - 0.1, K + 0.26, 1.55), pole: sh2.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5), curl: 0.4 }) });
            a.root.visible = true; blankets[i - 1].visible = true;
            stand(a, { pos: V(0, 0, 0), yaw: 0, cache: {} });
            a.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0)));
            a.root.position.set(bx - 0.95, K + 0.16, 1.35); a.root.updateMatrixWorld(true);
          }
        }
        f[3].root.visible = W.epa.group.visible && t >= S.ladder.t0;
        if (f[3].root.visible) { const tp = W.epa.tip(); stand(f[3], { pos: tp.clone().add(V(0, 0.07, 0)), yaw: 0, look: V(HERO_BAY, ROOM.SILL + 0.5, -0.3), lookK: 0.7, cache: {} }); }
        // the crowd across the street; the man looks at her window, not at the fire
        for (const [i, a] of crowd.entries()) {
          a.root.visible = true; const c = crowdPos[i], tgt = V(FIRE_BAY, LV[2] + 2, 0);
          stand(a, { pos: c.p, yaw: Math.atan2(tgt.x - c.p.x, tgt.z - c.p.z), breath: t * 0.3 + i, look: tgt, lookK: 0.8, cache: c.cache,
            armR: c.film ? (sh2, fwd, left, up) => ({ hand: sh2.clone().addScaledVector(fwd, 0.42).addScaledVector(up, 0.12), pole: sh2.clone().addScaledVector(up, -0.5).addScaledVector(left, -0.5), F: up.clone(), N: fwd.clone().negate(), curl: 0.5 }) : undefined });
          if (c.film) { const p = crowdPhones[i]; p.visible = true; const hb = wp(a.bones.RightHandMiddle1); p.position.copy(hb).add(V(0, 0.06, 0)); p.lookAt(tgt); p.updateMatrixWorld(true); }
        }
        man.root.visible = true;
        stand(man, { pos: MAN_P, yaw: Math.atan2(HERO_BAY - MAN_P.x, 0 - MAN_P.z), breath: t * 0.28, look: V(HERO_BAY, ROOM.SILL + 0.6, -0.3), lookK: 1.0, cache: {} });
        if (id === 'manclose') { const fl = Math.abs(t - (S.manclose.t0 + 0.5)) < 0.25; if (fl) { G.uFadeWhite.value = 0.85 * (1 - Math.abs(t - (S.manclose.t0 + 0.5)) / 0.25); } }
        R.renderer.toneMappingExposure = id === 'man2' || id === 'manclose' ? 1.2 : 1.05;
      }
      if (id === 'black' || id === 'end') { G.uFade.value = 1; }
      // smoke and fire
      if (which) updateSmoke(id === 'hook' ? S.gap.t0 + 2 + t : tt, id === 'hook' ? { ...which, gap: true } : which);
      for (const bb of [gapSm, landSm, fireSm, flames]) bb.update(cam, R.renderer.getPixelRatio(), V(0.3, 1, 0.2).normalize());
      drops.update(t, cam, R.renderer.getPixelRatio()); beamMat.uniforms.uTime.value = t;
      // camera
      const C = CAM[id === 'rewind' ? 'open' : id] || CAM.msg;
      C.apply(cam, isRew || id === 'etsi' ? tt : t);
      if (id === 'hand') cam.lookAt(wp(ines.bones.RightHand).add(V(0, 0.02, 0)));
      fill.position.copy(cam.position).add(V(0, 0.25, 0));
      // overlay
      const endK = smooth(S.end.t0, S.end.t0 + 0.6, t);
      ov.apply({ t, time: fmtClock(clockAt(t)), bat: batAt(t), statA: id === 'black' || id === 'end' ? 0 : 1, serA: id === 'end' ? 0 : 1, part: 'PARTIE 1',
        capA: id === 'end' ? 0 : 1, capY: ['face', 'man', 'man2', 'manclose', 'speaker', 'low'].includes(id) ? 66 : 57,
        plate: id === 'ext' ? { a: 'INÈS, 20 ANS', b: '6e ÉTAGE · PARIS 18e', k: smooth(S.ext.t0 + 0.2, S.ext.t0 + 0.6, t) * (1 - smooth(S.ext.t1 - 0.4, S.ext.t1, t)) } : null,
        etsi: id === 'etsi' ? smooth(0, 0.25, k) : id === 'open' ? 1 - smooth(0, 0.3, k) : 0,
        rew: id === 'rewind' ? 1 : 0,
        news: id === 'news' ? { a: 'RUE ERLANGER · PARIS 16e', b: '5 février 2019 · incendie volontaire · 10 morts', k: smooth(0.04, 0.12, k) } : null,
        capHtml: opts.cover ? '<span class="w1">De la </span><span class="r1">fumée</span><span class="w1"> sous votre porte…</span><br><span class="w1">vous </span><span class="r1">sortez ?</span>' : null,
        notif: id === 'msg' && t >= L(27) + 0.9 ? { from: 'Numéro inconnu', when: 'maintenant', msg: 'Tu es restée. Dommage.', k: smooth(L(27) + 0.9, L(27) + 1.25, t) } : null,
        peep: id === 'peep' ? 1 : 0, black: id === 'black' ? 1 : 0 });
      endEl.style.opacity = String(endK);
      tag.update(t, S.end.t0 + 0.6, endK);
      R.composer.render();
    },
  };
}
