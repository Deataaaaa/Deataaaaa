// « 12 % » Saison 2 · Partie 1 · Le VTC (~96 s). A week after season 1, Inès goes out for the first time: 2:14 am, Pigalle, 12 %
// battery, she orders a VTC (a grey saloon, 6 minutes). Two minutes later a black car stops at the kerb, the window comes down:
// « C'est pour Inès ? ». He knows her name. « ET SI… » she gets in: the locks drop, her real car is still 4 minutes away on the
// app, the car turns the wrong way, the child lock, his eyes in the mirror; April 2024, Paris (notes/facts.md). Rewind: the real
// moves: a VTC never picks you up without a booking, check plate, model and photo, the red VTC sticker, a name proves nothing.
// The black car drives off; four minutes later the grey one: right plate, right photo. In the back seat, sharing her trip, one
// question: how did he know her name? 9 %. « Un traceur inconnu se déplace avec vous. »
// Every cut sits on the narration (audio/vo/ep24_*.json); every pose is rebuilt from rest each frame.
import * as THREE from 'three';
import { createRenderer, rng, smooth, clamp, CamPath } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { fadeShadowBorders } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, walk, sit, POSE } from '../engine/poses.js';
import { makeCat } from '../engine/cat.js';
import { makePhone } from '../engine/props16.js';
import { makeEndTag } from '../engine/endtag.js';
import { buildPigalle, PG } from '../engine/pigalle24.js';
import { makeCar24, CAR, topPt, topY, vtcTex, MIR_Y } from '../engine/car24.js';
import { renderShot } from '../engine/ads19.js';
import { Overlay12 } from '../engine/s12.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(new THREE.Vector3());
const lerp = (a, b, k) => a + (b - a) * k;
const K = PG.KERB;
// the black car's stop at the kerb (heading -x, its curb side 25 cm off the kerb); car local (x, y, z) → world (CX - z, y, CZ + x)
const CX = 2.9, CZ = PG.ZK + 0.25 + CAR.B, YAW = -Math.PI / 2;
const I_P = V(2.62, K, 3.58);                                     // Inès at the kerb, by the front passenger window
const I_D = V(3.6, K, 3.84);                                      // by the rear door's handle, facing the car's rear (the door only unlatches)

export async function create() {
  const q = new URLSearchParams(location.search);
  const DBG = q.get('dbg') === '1';
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = 0;
  POSE.lookFirst = true;
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer(); R.renderer.localClippingEnabled = true;
  const VO = await (await fetch(`/audio/vo/ep24_${q.get('voice') || 'developpeuse'}.json`)).json();
  const ov = new Overlay12(VO, { etsiSub: 'ELLE MONTE' });
  const W = buildPigalle(R.renderer, { ssaa: globalThis.SSAA });
  const scene = W.scene;
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.03, 900); cam.layers.enable(1);
  R.renderPass.scene = scene; R.renderPass.camera = cam;
  R.bloom.strength = 0.4; R.bloom.radius = 0.55;
  const G = R.grade.uniforms;

  // ---------- the timeline, read from the narration ----------
  const Ln = VO.lines, L = (i) => Ln[i].t0;
  const Lw = (i, w, n = 1) => { const us = Ln[i].units.filter((x) => x.shown.toLowerCase().replace(/[«»"]/g, '').startsWith(w.toLowerCase())); const u = us[n - 1]; return u ? u.t0 : Ln[i].t0; };
  const END0 = Ln[Ln.length - 1].t0 - 0.25, DUR = Math.ceil((VO.duration + 4.4) * 10) / 10;
  const cut = (x) => x - 0.08;
  const SH = [
    ['hook', 0], ['s1', cut(L(1))], ['s2', cut(L(2))], ['s3', cut(L(3))], ['s4', cut(L(4))], ['s5', cut(L(5))], ['etsi', cut(L(6))],
    ['e1', cut(L(7))], ['e2', cut(L(8))], ['e3', cut(L(9))], ['e4', cut(L(10))], ['e5', cut(L(11))], ['stat1', cut(L(12))], ['stat2', cut(L(13))],
    ['rewind', cut(L(15))], ['r1', cut(L(16))], ['tip1', cut(L(17))], ['tip2a', cut(L(18))], ['tip2b', cut(Lw(18, 'Tout'))], ['tip3', cut(L(19))],
    ['tip4', cut(L(20))], ['r2', cut(L(21))], ['r3', cut(L(22))], ['r4a', cut(L(23))], ['r4b', cut(Lw(23, 'Bonne'))], ['r5', cut(L(24))],
    ['tw1', cut(L(25))], ['tw2', cut(L(26))], ['tw3', cut(L(27))], ['end', END0],
  ].map(([id, t0], i, a) => ({ id, t0, t1: a[i + 1] ? a[i + 1][1] : DUR }));
  const S = Object.fromEntries(SH.map((s) => [s.id, s]));
  const shotAt = (t) => { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; };
  const kOf = (id, t) => clamp((t - S[id].t0) / (S[id].t1 - S[id].t0));
  const ETSI = (t) => t >= S.etsi.t0 && t < S.r1.t0;
  console.log('SHOTS ' + SH.map((x) => `${x.id}:${x.t0.toFixed(2)}`).join(' ') + ' DUR ' + DUR);
  // story times: the black car arrives, the window, the door; the grey car
  const T_ARR = S.s3.t0, T_STOP = Lw(3, 'La') - 0.25, T_WIN = Lw(3, 'descend') - 0.1, T_DOOR = Lw(5, 'ouvre');
  const T_LOCK = Lw(7, 'Clac') + 0.05, T_GO = S.e1.t0 + 0.6;
  const T_MARK = Lw(19, 'en') - 0.05;
  // e4: she pulls the inner handle twice (on « tire » and « Rien »): the lever comes, the door stays shut
  const T_PULL = [Lw(10, 'tire') + 0.05, Lw(10, 'Rien')], pullK = (t) => Math.max(...T_PULL.map((a) => smooth(a, a + 0.12, t) * (1 - smooth(a + 0.45, a + 0.6, t))));
  const T_LEAVE = S.r3.t0 + 0.6, T_ARR2 = S.r4a.t0 - 0.2, T_STOP2 = S.r4a.t0 + 2.2;

  // ---------- cars ----------
  const black = makeCar24({ paint: '#0b0c0f', metal: 0.55, plate: 'HV-917-RB', vtc: false, mirrorReflect: true }); scene.add(black.group);
  black.mirror.layers.set(2); cam.layers.enable(2);                // the car's mirror: out of the ground reflection's view (no nested reflections)
  const grey = makeCar24({ paint: '#6a6f75', metal: 0.75, plate: 'GK-482-TL', vtc: true, mirrorReflect: false }); scene.add(grey.group);
  const place = (car, x, z, yaw = YAW) => { car.group.position.set(x, 0, z); car.group.rotation.set(0, yaw, 0); car.group.updateMatrixWorld(true); };
  const toW = (car, x, y, z) => car.group.localToWorld(V(x, y, z));
  // headlights as real spots (only for the car that is on screen)
  const headSpot = (car) => { const s = new THREE.SpotLight('#eef2ff', 0, 40, 0.3, 0.6, 2);   // narrow: a wide cone burnt the road just ahead of the bumper white
     s.position.set(0, 0.72, 2.2); const tg = new THREE.Object3D(); tg.position.set(0, 0.3, 12); car.group.add(s, tg); s.target = tg; return s; };
  const bHead = headSpot(black), gHead = headSpot(grey);
  // the arrival: a uniform deceleration from x0 to the stop; the departure: a gentle start
  const arrive = (t, t0, t1, x0, x1) => { const u = clamp((t - t0) / (t1 - t0)); return { x: x1 + (x0 - x1) * (1 - u) * (1 - u), v: 2 * (x0 - x1) * (1 - u) / (t1 - t0) }; };
  const depart = (t, t0, x0, a = 1.1, vmax = 7) => { const d = Math.max(0, t - t0), tv = vmax / a; return x0 - (d < tv ? 0.5 * a * d * d : 0.5 * a * tv * tv + vmax * (d - tv)); };

  // ---------- the tunnel (far west, out of the boulevard's fog): concrete box, sodium lamps every 6 m ----------
  const TX = -700;
  const tunnel = new THREE.Group(); scene.add(tunnel);
  { const wallM = new THREE.MeshStandardMaterial({ color: '#6d6a62', roughness: 0.85 }), roadM = new THREE.MeshStandardMaterial({ color: '#232325', roughness: 0.55 });
    const lampM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffae55', emissiveIntensity: 9 });
    const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.receiveShadow = true; tunnel.add(o); return o; };
    add(new THREE.BoxGeometry(320, 0.1, 11), roadM, TX - 160, -0.05, 7.6);
    add(new THREE.BoxGeometry(320, 0.3, 11), wallM, TX - 160, 5.15, 7.6);
    for (const z of [2.0, 13.2]) add(new THREE.BoxGeometry(320, 5.2, 0.3), wallM, TX - 160, 2.6, z);
    add(new THREE.BoxGeometry(0.6, 1.4, 11.8), wallM, TX + 0.3, 5.7, 7.6);
    for (let x = TX - 3; x > TX - 318; x -= 6) for (const z of [2.4, 12.8]) add(new THREE.BoxGeometry(1.1, 0.12, 0.25), lampM, x, 4.6, z);
    for (let x = TX - 4; x > TX - 80; x -= 12) { const p = new THREE.PointLight('#ffae55', 14, 14, 2); p.position.set(x, 4.2, 7.6); tunnel.add(p); }
    for (let x = TX - 1; x > TX - 318; x -= 3) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.12), new THREE.MeshStandardMaterial({ color: '#b8b6ae', roughness: 0.6 })); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.005, 7.6); tunnel.add(d); }
  }

  // ---------- people ----------
  const env = scene.environment;
  const ines = await loadAvatar('Female_Adult_11', { env, facial: true }); scene.add(ines.root);
  const fake = await loadAvatar('Business_Male_06', { env }); scene.add(fake.root);
  const real = await loadAvatar('Male_Adult_09', { env }); scene.add(real.root);
  for (const a of [fake, real]) a.root.scale.multiplyScalar(0.96);           // tall Rocketbox men: seated, their heads went through the roof
  const extraA = await loadAvatar('Female_Adult_03', { env, lod: 512 }); scene.add(extraA.root);
  const extraB = await loadAvatar('Male_Adult_08', { env, lod: 512 }); scene.add(extraB.root);
  const everyone = [ines, fake, real, extraA, extraB];
  const morph = (av, map) => { for (const m of av.meshes) { const d = m.morphTargetDictionary; if (!d) continue; m.morphTargetInfluences.fill(0);
    for (const [k, v] of Object.entries(map)) for (const [nm, i] of Object.entries(d)) if (nm.toLowerCase().includes(k.toLowerCase())) m.morphTargetInfluences[i] = v; } };

  // ---------- her phone ----------
  const phone = makePhone(); scene.add(phone);
  const pcv = phone.tex.image, pc = pcv.getContext('2d');
  // portraits drawn once: Lucas (the real driver, his app photo) and Apple (her lock screen)
  const studio = () => { const s = new THREE.Scene(); const pm = new THREE.PMREMGenerator(R.renderer); s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.6;
    const k = new THREE.DirectionalLight('#fff4ea', 3); k.position.set(-2, 2.5, 3); const r = new THREE.DirectionalLight('#ffffff', 2.2); r.position.set(2.5, 2, -2.5); const f = new THREE.DirectionalLight('#e6eeff', 0.8); f.position.set(3, 0.5, 2); s.add(k, r, f); return s; };
  await Promise.all(TEX_PENDING);
  let lucasCv = null, appleCv = null;
  { const s = studio(); const prev = real.root.parent; s.add(real.root); stand(real, { pos: V(0, 0, 0), yaw: 0, look: V(0, 1.62, 2), lookK: 1 }); real.root.updateMatrixWorld(true);
    const hd = wp(real.bones.Head), c2 = new THREE.PerspectiveCamera(18, 1, 0.05, 20); c2.position.copy(hd).add(V(0, 0.04, 1.25)); c2.lookAt(hd.clone().add(V(0, 0.02, 0)));
    lucasCv = renderShot(R.renderer, s, c2, 256, 256, { exposure: 1.1, bg: '#2b3a52' }); prev.add(real.root); }
  { const s = studio(); const cat = makeCat(); s.add(cat.root); cat.update(1.0, { look: V(0, 0.18, 1) }); const pil = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.6), new THREE.MeshStandardMaterial({ color: '#c9b9a2', roughness: 0.9 })); pil.position.y = -0.03; s.add(pil);
    const c2 = new THREE.PerspectiveCamera(30, 0.5, 0.05, 20); c2.position.set(0.05, 0.22, 0.75); c2.lookAt(0, 0.13, 0);
    appleCv = renderShot(R.renderer, s, c2, 360, 720, { exposure: 1.15, bg: '#cdbda4' }); }
  // the app (no brand): map, the driver's card; the lock screen with Apple; vibrating
  const appMap = (ctx, w, h, carAt, me, route) => {
    ctx.fillStyle = '#1c2230'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2c3446'; ctx.lineWidth = 18; for (const [x0, y0, x1, y1] of [[-20, 180, 540, 120], [80, -20, 160, 700], [330, -20, 300, 700], [-20, 420, 540, 470], [-20, 620, 540, 560]]) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
    ctx.strokeStyle = '#3b4560'; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(-20, 300); ctx.lineTo(540, 270); ctx.stroke();
    if (route) { ctx.strokeStyle = '#4c8dff'; ctx.lineWidth = 8; ctx.beginPath(); route.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    if (carAt) { ctx.save(); ctx.translate(carAt[0], carAt[1]); ctx.rotate(carAt[2] || 0); ctx.fillStyle = '#e8e8ea'; ctx.fillRect(-12, -22, 24, 44); ctx.fillStyle = '#1c2230'; ctx.fillRect(-9, -12, 18, 10); ctx.restore(); }
    if (me) { ctx.fillStyle = 'rgba(76,141,255,0.25)'; ctx.beginPath(); ctx.arc(me[0], me[1], 34, 0, 7); ctx.fill(); ctx.fillStyle = '#4c8dff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(me[0], me[1], 13, 0, 7); ctx.fill(); ctx.stroke(); }
  };
  const statusBar = (ctx, w, clock, pct) => { ctx.fillStyle = '#f2f2f4'; ctx.font = '600 28px Inter, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(clock, 36, 52);
    ctx.textAlign = 'right'; ctx.fillStyle = pct <= 10 ? '#ff453a' : '#f2f2f4'; ctx.fillText(`${pct} %`, w - 92, 52); ctx.strokeStyle = '#f2f2f4'; ctx.lineWidth = 3; ctx.strokeRect(w - 80, 30, 44, 24);
    ctx.fillStyle = pct <= 10 ? '#ff453a' : '#f2f2f4'; ctx.fillRect(w - 77, 33, Math.max(3, 38 * pct / 100), 18); ctx.fillRect(w - 34, 38, 4, 8); };
  let lastScreen = '';
  const drawScreen = (mode, o = {}) => {
    phone.screen.material.emissiveIntensity = mode === 'off' ? 0 : mode === 'lock' ? 0.8 : 0.42;
    const key = JSON.stringify([mode, o]); if (key === lastScreen) return; lastScreen = key;
    const w = pcv.width, h = pcv.height, ctx = pc; ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (mode === 'off') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); phone.tex.needsUpdate = true; return; }
    if (mode === 'lock') {
      ctx.drawImage(appleCv, 0, 0, w, h); const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      statusBar(ctx, w, '', o.pct ?? 9); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '300 150px Inter, Arial, sans-serif'; ctx.fillText(o.clock || '02:31', w / 2, 260);
      ctx.font = '500 30px Inter, Arial, sans-serif'; ctx.fillText('dimanche 1 novembre', w / 2, 150);
      if (o.notif) { const a = o.notif; ctx.globalAlpha = a; ctx.fillStyle = 'rgba(40,40,46,0.9)'; ctx.beginPath(); ctx.roundRect(24, 330, w - 48, 190, 30); ctx.fill();
        ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.roundRect(48, 360, 64, 64, 16); ctx.fill(); ctx.fillStyle = '#1c1c1e'; ctx.beginPath(); ctx.arc(80, 392, 16, 0, 7); ctx.fill(); ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(80, 392, 7, 0, 7); ctx.fill();
        ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '700 30px Inter, Arial, sans-serif'; ctx.fillText('Traceur inconnu détecté', 130, 384); ctx.font = '500 26px Inter, Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('maintenant', 130, 420);
        ctx.fillStyle = '#eee'; ctx.font = '500 28px Inter, Arial, sans-serif'; ctx.fillText('Un traceur inconnu se déplace', 48, 468); ctx.fillText('avec vous depuis 1 h 07.', 48, 504); ctx.globalAlpha = 1; }
      phone.tex.needsUpdate = true; return;
    }
    // the ride app
    appMap(ctx, w, h * 0.62, o.car, o.me, o.route);
    statusBar(ctx, w, o.clock || '02:14', o.pct ?? 12);
    ctx.fillStyle = '#f5f5f7'; ctx.beginPath(); ctx.roundRect(0, h * 0.56, w, h * 0.44 + 40, 34); ctx.fill();
    ctx.fillStyle = '#111'; ctx.textAlign = 'left';
    if (mode === 'search') { ctx.font = '700 40px Inter, Arial, sans-serif'; ctx.fillText('Recherche d’un chauffeur…', 36, h * 0.56 + 80); ctx.fillStyle = '#4c8dff'; ctx.fillRect(36, h * 0.56 + 120, (w - 72) * (o.k ?? 0.5), 8); phone.tex.needsUpdate = true; return; }
    if (mode === 'shared') { ctx.font = '700 40px Inter, Arial, sans-serif'; ctx.fillText('Trajet partagé ✓', 36, h * 0.56 + 84); ctx.font = '500 30px Inter, Arial, sans-serif'; ctx.fillStyle = '#555'; ctx.fillText('Maman suit votre course en direct', 36, h * 0.56 + 134);
      ctx.fillText('Lucas · berline grise · GK-482-TL', 36, h * 0.56 + 184); phone.tex.needsUpdate = true; return; }
    ctx.font = '700 44px Inter, Arial, sans-serif'; ctx.fillText(o.eta || 'Arrive dans 6 min', 36, h * 0.56 + 84);
    ctx.drawImage(lucasCv, 36, h * 0.56 + 120, 120, 120);
    ctx.font = '700 36px Inter, Arial, sans-serif'; ctx.fillText('Lucas', 176, h * 0.56 + 160); ctx.font = '500 28px Inter, Arial, sans-serif'; ctx.fillStyle = '#555'; ctx.fillText('★ 4,9 · berline grise', 176, h * 0.56 + 204);
    ctx.fillStyle = '#e6e6ea'; ctx.beginPath(); ctx.roundRect(36, h * 0.56 + 262, w - 72, 96, 18); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = '800 56px "Arial Narrow", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GK-482-TL', w / 2, h * 0.56 + 330);
    ctx.textAlign = 'left'; ctx.font = '500 26px Inter, Arial, sans-serif'; ctx.fillStyle = '#666'; ctx.fillText('Vérifiez la plaque avant de monter', 36, h * 0.56 + 400);
    phone.tex.needsUpdate = true;
  };
  drawScreen('ride');
  // the phone in a hand, resting on the nearly straight fingers (ep21's fit)
  const tA = V(0, 0, 0), tB = V(0, 0, 0), mB = new THREE.Matrix4(), PHZ = 0.0195;   // the palm sat 1.3 mm into the phone at 17.5
  const avgJ = (B, side, j) => tB.copy(wp(B[side + 'HandIndex' + j])).add(wp(B[side + 'HandMiddle' + j])).add(wp(B[side + 'HandRing' + j])).multiplyScalar(1 / 3).clone();
  function phoneFit(av, side, ph) {
    const B = av.bones, k1 = avgJ(B, side, 1), k3 = avgJ(B, side, 3), i1 = wp(B[side + 'HandIndex1']), p1 = wp(B[side + 'HandPinky1']);
    const X = k1.clone().sub(k3).normalize();
    const Z = X.clone().cross(tA.copy(i1).sub(p1)).normalize(); if (side === 'Left') Z.negate();
    const Yv = Z.clone().cross(X).normalize();
    mB.makeBasis(side === 'Left' ? X.clone().negate() : X, side === 'Left' ? Yv.clone().negate() : Yv, Z); ph.quaternion.setFromRotationMatrix(mB);
    ph.position.copy(k1).lerp(k3, 0.55).addScaledVector(Z, PHZ).addScaledVector(Yv, side === 'Left' ? -0.004 : 0.004); ph.updateMatrixWorld(true);
  }

  // ---------- the end card ----------
  const endEl = document.getElementById('end');
  // tip3: a red frame on the corner of the black car's windscreen where the VTC sticker should be (it has none)
  const mark = document.createElement('div');
  mark.style.cssText = 'position:absolute;left:0;top:0;border:6px solid #ff2e2e;border-radius:14px;box-shadow:0 0 0 3px rgba(0,0,0,.45),0 0 18px rgba(255,46,46,.4);opacity:0;pointer-events:none;box-sizing:border-box';
  (document.getElementById('s12') || document.body).appendChild(mark);
  const STK = topPt(CAR.COWL - 0.07, 0.78), VTC_IMG = vtcTex('GK-482-TL').image.toDataURL('image/png');
  const sign = document.createElement('div');
  sign.style.cssText = 'position:absolute;left:50%;top:620px;transform:translateX(-50%);background:#22397a;border:8px solid #2e6b4a;outline:5px solid #e8e6df;border-radius:16px;padding:28px 56px;text-align:center;min-width:640px;font-family:Inter,sans-serif;color:#fff';
  sign.innerHTML = `<div style="display:inline-block;background:#ff2e2e;font-weight:800;font-size:30px;padding:6px 14px;border-radius:8px;letter-spacing:.06em">12 % · SAISON 2</div>
    <div style="font-weight:800;font-size:42px;margin-top:16px;letter-spacing:.03em">PARTIE 2</div><div style="font-weight:800;font-size:76px;line-height:1;margin-top:6px">LE TRACEUR</div>`;
  const ask = document.createElement('div');
  ask.style.cssText = 'position:absolute;left:0;right:0;top:250px;text-align:center;font:800 64px/1.08 Inter,sans-serif;color:#fff;text-transform:uppercase;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  ask.innerHTML = 'Il connaît<br>votre <span style="color:#ff2e2e">prénom</span>…<br>vous <span style="color:#ff2e2e">montez</span> ?';
  const reply = document.createElement('div');
  reply.style.cssText = 'position:absolute;left:0;right:0;top:500px;text-align:center;font:700 42px/1.2 Inter,sans-serif;color:rgba(255,255,255,.92);text-shadow:0 0 3px #000,0 3px 0 rgba(0,0,0,.6)';
  reply.innerHTML = 'Réponds <span style="color:#ff2e2e;font-weight:800">OUI</span> ou <span style="color:#ff2e2e;font-weight:800">NON</span> en commentaire';
  const follow = document.createElement('div');
  follow.style.cssText = 'position:absolute;left:0;right:0;top:920px;text-align:center;font:800 52px/1.15 Inter,sans-serif;color:#fff;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  follow.innerHTML = '<span style="color:#ff2e2e">ABONNE-TOI</span><br><span style="font-weight:700;font-size:44px">pour voir la Partie 2</span>';
  const fine = document.createElement('div');
  fine.style.cssText = 'position:absolute;left:60px;right:60px;top:1075px;text-align:center;font:500 29px Inter,sans-serif;color:rgba(255,255,255,.8);line-height:1.45';
  fine.innerHTML = 'Fiction. Conseils vérifiés : code des transports, service-public.fr, conseils des plateformes VTC.<br>Voix : Kyutai TTS (CC BY 4.0).';
  endEl.querySelector('.t').innerHTML = ''; endEl.querySelector('.n').innerHTML = '';
  endEl.appendChild(ask); endEl.appendChild(reply); endEl.appendChild(sign); endEl.appendChild(fine); endEl.appendChild(follow);
  const tag = makeEndTag({ text: 'Abonne-toi pour la suite', ssaa: globalThis.SSAA });
  // the tracker notification banner: a neutral icon instead of the messages bubble
  { const ic = document.querySelector('#s12 .notif .ic'); if (ic) { ic.style.background = '#2c2c30'; ic.innerHTML = '<svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="17" fill="#ffcc00"/><circle cx="23" cy="23" r="8" fill="#1c1c1e"/><circle cx="23" cy="23" r="3.5" fill="#ffcc00"/></svg>'; } }

  // ---------- poses ----------
  const BL = []; { const r = rng(24); for (let b = 1.2; b < 110; b += 3.0 + 2.6 * r()) BL.push(b); }
  const blinkK = (t) => { let k = 0; for (const b0 of BL) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  let curT = 0;
  const show = (av, fn) => { av.root.visible = true; fn(); if (av === ines) ines.blink(blinkK(curT)); av.root.updateMatrixWorld(true); };
  const palmN = (av, sd) => { const B = av.bones, lat = wp(B[sd + 'HandIndex1']).sub(wp(B[sd + 'HandPinky1'])), f = wp(B[sd + 'HandMiddle1']).sub(wp(B[sd + 'Hand']));
    return (sd === 'Right' ? lat.cross(f) : f.cross(lat)).normalize(); };
  const pressPose = (av, side, tgt, pose, spec, probe) => {
    pose(spec); const want = tgt.clone().sub(probe().sub(wp(av.bones[side + 'Hand']))), res = [];
    for (let i = 0; i < 4; i++) { pose((sh, fwd, left, up) => ({ ...spec(sh, fwd, left, up), hand: want })); const r = tgt.clone().sub(probe()); res.push((r.length() * 100).toFixed(1)); if (i < 3) want.add(r); }
    if (DBG) console.log(`DBG press ${side} residuals ${res.join(' -> ')} cm`);
    return want;
  };
  const THUMB = Number(q.get('thumb') ?? -0.15), PK = Number(q.get('pk') ?? -0.45);                     // the thumb's lift off the screen (checked with ?dbg=1)
  const LEVER_IN = Number(q.get('lin') ?? 0.036), LEVER_CURL = Number(q.get('lcurl') ?? 0);   // e4: fingers behind the lever
  // her phone held at the chest, standing (stand()'s arm spec: sh = the shoulder)
  const phoneStand = (lift = 0) => (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.3 + lift).addScaledVector(left, 0.12),
    pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.45).addScaledVector(fwd, -0.15), F: up.clone().addScaledVector(fwd, 0.25).addScaledVector(left, 0.25).normalize(), N: up.clone().multiplyScalar(0.4).addScaledVector(fwd, -1).normalize(), curl: 0.08, pk: PK, thumb: THUMB });
  const armDown = (s) => (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(up, -0.56).addScaledVector(left, s * 0.1).addScaledVector(fwd, 0.04),
    pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.5).addScaledVector(left, s * 0.25), F: V(0, -1, 0).addScaledVector(fwd, 0.1).normalize(), N: left.clone().multiplyScalar(-s), curl: 0.3 });
  // her phone in her lap, seated (sit()'s hand spec: P = the hips)
  const phoneLap = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.3).addScaledVector(up, 0.24).addScaledVector(left, -0.04),
    pole: P.clone().addScaledVector(up, 0.2).addScaledVector(left, -0.6).addScaledVector(fwd, -0.2), F: up.clone().addScaledVector(fwd, 0.6).normalize(), N: up.clone().multiplyScalar(0.8).addScaledVector(fwd, -0.6).normalize(), curl: 0.08, pk: PK, thumb: THUMB });
  const lapL = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.26).addScaledVector(up, 0.13).addScaledVector(left, 0.1),
    pole: P.clone().addScaledVector(up, 0.25).addScaledVector(left, 0.6).addScaledVector(fwd, -0.3), F: fwd.clone().addScaledVector(left, -0.4).normalize(), N: V(0, -1, 0) });
  // drivers: hands on the wheel at a quarter to three
  const GRIP_L = { curlL: Number(q.get('rc') ?? 0.5), thumbL: Number(q.get('rt') ?? -1.0) }, GRIP = { ...GRIP_L, curlR: GRIP_L.curlL, thumbR: GRIP_L.thumbL };
  const REAL_FZ = Number(q.get('rfz') ?? 0.035), REAL_LEAN = Number(q.get('rlean') ?? -0.42), RECLINE = Number(q.get('recl') ?? -0.36);   // drivers lie back against the backrest (20 degrees)                    // Lucas sits 3.5 cm further forward (his hips went into the backrest)
  const EYES_WIN = V(2.95, 1.24, 4.06);
  const E4 = { fd: Number(q.get('e4fd') ?? 1), li: LEVER_IN, lc: LEVER_CURL, py: Number(q.get('e4py') ?? -0.006), pm: 0.5 };
  const MIR_AIM = Number(q.get('maim') ?? 0.06);   // e5: the point on the driver the mirror is turned to show (above his head bone)
  const E4LEAN = Number(q.get('e4ln') ?? 0.38), E4DZ = Number(q.get('e4dz') ?? -0.05), E4FO = Number(q.get('e4fo') ?? 0.35);
  const S5 = { dx: Number(q.get('s5dx') ?? 0.05), dz: Number(q.get('s5dz') ?? 0.08), yaw: Number(q.get('s5y') ?? 0.9), hb: Number(q.get('s5hb') ?? 0.75), cr: Number(q.get('s5cr') ?? 0.1) };
  const S5C = Number(q.get('s5c') ?? 0.12), S5PY = Number(q.get('s5py') ?? 0), S5PK = Number(q.get('s5pk') ?? -0.25);
  const S5P = [Number(q.get('s5o0') ?? 0.06), Number(q.get('s5o1') ?? 0.07), Number(q.get('s5u2') ?? 0.16), Number(q.get('s5ii') ?? 0.0085), Number(q.get('s5cd') ?? 0)];   // s5's reach: out at the start, out past the bar, up above it, in toward the skin
  const TIP4_BEND = Number(q.get('tb') ?? 0.95), TIP4_CR = Number(q.get('tc') ?? 0.27), TIP4_Z = Number(q.get('tz') ?? 3.55), TIP4_X = Number(q.get('tx') ?? 2.92);                              // her eyes bent to the passenger window (hook, s4, tip4)
  const RIM_U0 = Number(q.get('ru') ?? 0.045), RIM_A0 = Number(q.get('ra') ?? 0.065), RIM_CURL = Number(q.get('rc') ?? 0.7), RIM_TH = Number(q.get('rt') ?? -0.4);
  const SWEEP = DBG ? q.get('sweep') : null;
  const wheelHand = (car, sd, pr = {}) => (P, fwd, left, up) => { const W = car.wheel, ph = sd > 0 ? 0.26 : Math.PI - 0.26, RIM_U = pr.u ?? RIM_U0, RIM_A = pr.a ?? RIM_A0;
    const u = V(Math.cos(ph), Math.sin(ph), 0).transformDirection(W.matrixWorld), a = V(0, 0, 1).transformDirection(W.matrixWorld), R = W.localToWorld(V(0.185 * Math.cos(ph), 0.185 * Math.sin(ph), 0));
    return { hand: R.addScaledVector(u, RIM_U).addScaledVector(a, -RIM_A), pole: P.clone().addScaledVector(up, 0.3).addScaledVector(left, sd * 0.7).addScaledVector(fwd, -0.2), F: a, N: u.clone().negate(), curl: RIM_CURL, thumb: RIM_TH }; };
  const seatPose = (av, car, seat, o = {}) => { const h = car.group.localToWorld(car.seats[seat].clone().add(V(0, 0, o.fz ?? 0)));
    sit(av, { pos: V(h.x, h.y, h.z), yaw: car.group.rotation.y, legs: 'chair', floor: toW(car, 0, 0.31, 0).y, seat: 0.11, curl: 0.55, ...o }); };

  // ---------- clearance checks (?dbg=1): skin against what it touches, measured in that object's own frame ----------
  const skinPts = (av, step, fn) => { const v = V(0, 0, 0); av.root.updateMatrixWorld(true);
    for (const mesh of av.meshes) { if (!mesh.isSkinnedMesh) continue; mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count;
      for (let i = 0; i < n; i += step) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); fn(v, mesh, i); } } };
  const boneOf = (mesh, i) => { const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight; let bi = 0, bw = -1;
    for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; bi = si.getComponent(i, j); } } return mesh.skeleton.bones[bi]; };
  const handSets = new Map();
  const handSet = (av, sd) => { const key = av.root.uuid + sd; if (!handSets.has(key)) { const st = new Set(); av.bones[sd + 'Hand'].traverse((o) => st.add(o)); handSets.set(key, st); } return handSets.get(key); };
  // deepest skin inside boxes given in an object's frame: [{ c, h, nm }] (c centre, h half extents); > 0 mm = inside
  const boxPen = (av, obj, boxes, only = null) => { const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), p = V(0, 0, 0); let best = [-1e9, '', ''];
    skinPts(av, 1, (v, mesh, i) => { const b = only || boxes.length > 3 ? boneOf(mesh, i) : null; if (only && !only.has(b)) return; p.copy(v).applyMatrix4(inv);
      for (const bx of boxes) { const d = Math.min(bx.h.x - Math.abs(p.x - bx.c.x), bx.h.y - Math.abs(p.y - bx.c.y), bx.h.z - Math.abs(p.z - bx.c.z)); if (d > best[0]) best = [d, bx.nm, (b || boneOf(mesh, i)).name]; } });
    return `${(best[0] * 1000).toFixed(1)}mm ${best[1]} ${best[2]}`; };
  // the steering wheel's rim (a torus, radius 0.185, tube 0.017, in the wheel's frame): deepest hand skin into the tube, and the nearest
  const rimPen = (av, car, sd) => { const inv = new THREE.Matrix4().copy(car.wheel.matrixWorld).invert(), st = handSet(av, sd), p = V(0, 0, 0); let pen = -1e9, nm = '';
    skinPts(av, 1, (v, mesh, i) => { const b = boneOf(mesh, i); if (!st.has(b)) return; p.copy(v).applyMatrix4(inv); const q2 = Math.hypot(p.x, p.y) - 0.185, d = 0.017 - Math.hypot(q2, p.z); if (d > pen) { pen = d; nm = b.name; } });
    return `${(pen * 1000).toFixed(1)}mm ${nm}`; };
  // seats and bench (car.boxes, rounded boxes taken as boxes): the deepest skin of a seated body
  const seatPen = (av, car) => { let best = [-1e9, '', '']; const p = V(0, 0, 0);
    for (const bx of car.boxes) { const inv = new THREE.Matrix4().copy(bx.m.matrixWorld).invert();
      skinPts(av, 3, (v, mesh, i) => { p.copy(v).applyMatrix4(inv); const d = Math.min(bx.w / 2 - Math.abs(p.x), bx.h / 2 - Math.abs(p.y), bx.d / 2 - Math.abs(p.z)); if (d > best[0]) best = [d, bx.nm, boneOf(mesh, i).name]; }); }
    return `${(best[0] * 1000).toFixed(1)}mm ${best[1]} ${best[2]}`; };
  // the car's body as a shell (car frame): skin inside the side or under the roof, outside the open front-right window
  const shellPen = (av, car, win) => { const inv = new THREE.Matrix4().copy(car.group.matrixWorld).invert(), p = V(0, 0, 0); let best = [-1e9, ''];
    skinPts(av, 2, (v, mesh, i) => { p.copy(v).applyMatrix4(inv); if (p.z > CAR.AF || p.z < CAR.AR || p.y < 0.25 || p.y > 1.5 || Math.abs(p.x) > 0.95) return;
      const inWin = win && p.x < 0 && p.z > CAR.FW[0] && p.z < CAR.FW[1] && p.y > 0.97 && p.y < 1.3;
      const d = Math.min(0.9 - Math.abs(p.x), 1.45 - p.y); if (inWin) { const e = Math.min(p.y - 0.97, 1.3 - p.y, p.z - CAR.FW[0], CAR.FW[1] - p.z); if (-e > best[0]) best = [-e, 'window edge ' + boneOf(mesh, i).name]; return; }
      if (d > best[0]) best = [d, boneOf(mesh, i).name]; });
    return `${(best[0] * 1000).toFixed(1)}mm ${best[1]}`; };
  // the headliner (3 cm under the roof's skin): the highest skin of a seated head against it, > 0 mm = through it
  const roofPen = (av, car) => { const inv = new THREE.Matrix4().copy(car.group.matrixWorld).invert(), p = V(0, 0, 0); let best = [-1e9, ''];
    skinPts(av, 2, (v, mesh, i) => { p.copy(v).applyMatrix4(inv); if (Math.abs(p.x) > 0.8 || p.y < 1.0 || p.z > CAR.WS + 0.3 || p.z < CAR.RW) return; const u = THREE.MathUtils.clamp(p.x / Math.max(0.3, topPt(p.z, 1).x), -1, 1), d = p.y - (topPt(p.z, u).y - 0.03); if (d > best[0]) best = [d, boneOf(mesh, i).name]; });
    return `${(best[0] * 1000).toFixed(1)}mm ${best[1]}`; };
  const headTop = (av, car) => { const inv = new THREE.Matrix4().copy(car.group.matrixWorld).invert(), p = V(0, 0, 0), top = V(0, -9, 0);
    skinPts(av, 1, (v) => { p.copy(v).applyMatrix4(inv); if (p.y > top.y) top.copy(p); }); const u = THREE.MathUtils.clamp(top.x / Math.max(0.3, topPt(top.z, 1).x), -1, 1);
    return `top (${top.x.toFixed(2)}, ${top.y.toFixed(3)}, ${top.z.toFixed(2)}) liner ${(topPt(top.z, u).y - 0.03).toFixed(3)}`; };
  const phoneBox = [{ c: V(0, 0, 0), h: V(0.0358, 0.0734, 0.0039), nm: 'phone' }, { c: V(0, 0, 0.0055), h: V(0.0336, 0.071, 0.0016), nm: 'screen+1.5mm' }];
  const doorBoxes = [{ c: V(0.105, 0.66, -0.365), h: V(0.025, 0.31, 0.33), nm: 'panel' }, { c: V(0.152, 0.80, -0.283), h: V(0.0225, 0.01, 0.006), nm: 'bracket' }, { c: V(0.16, 0.66, -0.39), h: V(0.045, 0.025, 0.18), nm: 'armrest' }];
  const DOOR_OUT = [{ c: V(0.05, 0.62, -0.52), h: V(0.056, 0.32, 0.53), nm: 'door skin' }, { c: V(-0.012, 0.885, -0.66), h: V(0.006, 0.0175, 0.075), nm: 'recess' }, { c: V(-0.058, 0.885, -0.66), h: V(0.008, 0.013, 0.065), nm: 'bar' }, { c: V(-0.034, 0.885, -0.715), h: V(0.016, 0.008, 0.006), nm: 'post' }, { c: V(-0.034, 0.885, -0.605), h: V(0.016, 0.008, 0.006), nm: 'post' }];
  const leverBox = [{ c: V(0, 0, 0), h: V(0.0125, 0.0175, 0.07), nm: 'lever' }];
  const dbgShot = (id, t) => {
    const out = [`DBG ${id} t=${t.toFixed(2)}`];
    const inB = ['e1', 'e2', 'e3', 'e4', 'e5'].includes(id), inG = ['r5', 'tw1', 'tw2', 'tw3'].includes(id);
    if (q.get('heads')) { if (fake.root.visible) out.push(`fake ${headTop(fake, black)}`); if (real.root.visible) out.push(`real ${headTop(real, grey)}`); if (ines.root.visible && (inB || inG)) out.push(`ines ${headTop(ines, inB ? black : grey)}`); }
    if (fake.root.visible) out.push(`fake rimL ${rimPen(fake, black, 'Left')} rimR ${rimPen(fake, black, 'Right')} seat ${seatPen(fake, black)} roof ${roofPen(fake, black)} console ${boxPen(fake, black.group, [{ c: V(0, 0.45, -0.02), h: V(0.1, 0.15, 0.375), nm: 'console' }], handSet(fake, 'Right'))}`);
    if (real.root.visible) out.push(`real rimL ${rimPen(real, grey, 'Left')} rimR ${rimPen(real, grey, 'Right')} seat ${seatPen(real, grey)} roof ${roofPen(real, grey)}`);
    if (ines.root.visible) {
      if (phone.visible) { const th = phone.worldToLocal(wp(ines.bones.RightHandThumb3).lerp(wp(ines.bones.RightHandThumb2), -0.8)), pk = phone.worldToLocal(wp(ines.bones.RightHandPinky3));
        out.push(`phone ${boxPen(ines, phone, phoneBox, handSet(ines, 'Right'))} thumbtip (${(th.x * 100).toFixed(1)}, ${(th.y * 100).toFixed(1)}, ${(th.z * 100).toFixed(1)}) cm pinky3 (${(pk.x * 100).toFixed(1)}, ${(pk.y * 100).toFixed(1)}, ${(pk.z * 100).toFixed(1)})`); }
      if (inB || inG) out.push(`ines seat ${seatPen(ines, inB ? black : grey)} roof ${roofPen(ines, inB ? black : grey)}`);
      if (id === 'e4') { black.door.updateMatrixWorld(true); out.push(`door ${boxPen(ines, black.door, doorBoxes, handSet(ines, 'Right'))} lever ${boxPen(ines, black.handleIn, leverBox, handSet(ines, 'Right'))}`); }
      if (['s5', 'etsi'].includes(id)) { out.push(`door ${boxPen(ines, black.door, DOOR_OUT)}`);
        const dj = (nm) => { const p = black.door.worldToLocal(wp(ines.bones[nm])); return `${nm.replace('RightHand', '')}(${(p.x * 100).toFixed(1)},${(p.y * 100).toFixed(1)},${(p.z * 100).toFixed(1)})`; };
        const B = ines.bones, lat = wp(B.RightHandIndex1).sub(wp(B.RightHandPinky1)), f = wp(B.RightHandMiddle1).sub(wp(B.RightHand)), n = lat.clone().cross(f).normalize(), nd = n.transformDirection(new THREE.Matrix4().copy(black.door.matrixWorld).invert());
        out.push(`joints door-local cm ${['RightHand', 'RightHandMiddle1', 'RightHandMiddle2', 'RightHandMiddle3', 'RightHandPinky1', 'RightHandPinky2', 'RightHandIndex1', 'RightHandIndex2'].map(dj).join(' ')} palmN door-local (${nd.x.toFixed(2)},${nd.y.toFixed(2)},${nd.z.toFixed(2)})`); }
      if (['hook', 's4', 'tip4', 'r1', 's3', 'tip1', 'r2'].includes(id)) out.push(`shell ${shellPen(ines, black, true)}`);
    }
    const hd = (av) => { const h = wp(av.bones.Head); return `(${h.x.toFixed(3)}, ${h.y.toFixed(3)}, ${h.z.toFixed(3)})`; };
    out.push(`heads ines ${hd(ines)} fake ${hd(fake)}`); if (fake.root.visible) { const hl = black.group.worldToLocal(wp(fake.bones.Head)); out.push(`fake head local (${hl.x.toFixed(3)}, ${hl.y.toFixed(3)}, ${hl.z.toFixed(3)})`); }
    if (id === 'tip4' || id === 'hook') { const W = black.windows.RF; let gl = null; W.g.traverse((o) => { if (o.material && o.material.clippingPlanes) gl = o; }); out.push(`RF plane ${W.plane.constant.toFixed(3)} n (${W.plane.normal.x},${W.plane.normal.y},${W.plane.normal.z}) glass clip same ${gl && gl.material.clippingPlanes[0] === W.plane} visible ${gl && gl.visible} group ${W.g.visible}`); }
    if (id === 'tip4' || id === 'hook') { const eye = id === 'tip4' ? wp(ines.bones.Head).add(V(0, 0.06, 0)) : toW(black, 0.37, 1.27, -0.17), dir = eye.clone().sub(cam.position), dist = dir.length();
      const rc = new THREE.Raycaster(cam.position.clone(), dir.normalize(), 0.02, dist - 0.05); rc.layers.enableAll(); const hits = rc.intersectObject(black.group, true).filter((h) => h.object.visible);
      out.push(`ray to eyes: ${hits.length ? hits.slice(0, 3).map((h) => { const pl = black.group.worldToLocal(h.point.clone()); return `${h.object.geometry.type} #${h.object.material.color ? h.object.material.color.getHexString() : '?'} at (${pl.x.toFixed(2)}, ${pl.y.toFixed(2)}, ${pl.z.toFixed(2)})`; }).join(', ') : 'clear'}`); }
    const cl = (car) => { const p = car.group.worldToLocal(cam.position.clone()); return `cam local (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`; };
    if (inB || ['hook', 's4', 'tip4'].includes(id)) out.push(cl(black)); if (inG) out.push(cl(grey));
    if (black.mirror && (id === 'e5' || id === 'e3')) { black.mirror.updateWorldMatrix(true, false); const Mw = black.mirror.getWorldPosition(V(0, 0, 0)), nw = V(0, 0, 1).transformDirection(black.mirror.matrixWorld), toE = cam.position.clone().sub(Mw).normalize(), toD = wp(fake.bones.Head).add(V(0, 0.06, 0)).sub(Mw).normalize();
      out.push(`mirror n·toEye ${nw.dot(toE).toFixed(3)} n·toDriver ${nw.dot(toD).toFixed(3)} reflected·toDriver ${toE.clone().reflect(nw).negate().dot(toD).toFixed(4)} visible ${black.mirror.visible} layer ${black.mirror.layers.mask}`); }
    if (black.mirror) { const m = black.mirror.getWorldPosition(V(0, 0, 0)).project(cam); out.push(`mirror ndc (${m.x.toFixed(2)}, ${m.y.toFixed(2)}, ${m.z.toFixed(3)})`); }
    console.log(out.join(' | '));
  };

  // ---------- camera paths ----------
  const P2 = (s, a, b, ta, tb, fa, fb = fa) => new CamPath([[s.t0, a, ta, fa], [s.t1, b, tb, fb]], { easeIn: false, easeOut: false, arc: true });
  const CAM = {
    s1: P2(S.s1, V(-6.6, 1.75, 15.6), V(-6.2, 1.72, 15.0), V(1.4, 2.2, 1.6), V(1.6, 2.1, 1.8), 50, 47),
    s3: P2(S.s3, V(-4.6, 1.55, 2.85), V(-4.5, 1.54, 2.88), V(5.2, 0.95, 4.9), V(4.6, 0.95, 4.85), 40, 39),
    s5: P2(S.s5, V(5.6, 1.35, 3.72), V(5.55, 1.345, 3.73), V(3.9, 1.15, 4.15), V(3.9, 1.15, 4.15), 40, 38),
    etsi: P2(S.etsi, V(4.5, 1.53, 3.5), V(4.44, 1.53, 3.54), V(3.93, 1.5, 4.17), V(3.93, 1.5, 4.17), 32, 29),
    stat1: P2(S.stat1, V(TX + 9, 1.45, 5.6), V(TX + 8.6, 1.44, 5.6), V(TX - 40, 1.6, 6.6), V(TX - 40, 1.6, 6.6), 40, 38),
    stat2: P2(S.stat2, V(TX - 6, 1.5, 4.4), V(TX - 6.6, 1.5, 4.4), V(TX - 80, 1.5, 6.4), V(TX - 80, 1.5, 6.4), 36, 34),
    r1: P2(S.r1, V(0.05, 1.5, 4.75), V(0.1, 1.5, 4.72), V(2.7, 1.55, 3.72), V(2.7, 1.55, 3.72), 38, 35),
    tip1: P2(S.tip1, V(-3.4, 1.6, 2.1), V(-3.2, 1.58, 2.15), V(3.0, 1.0, 4.6), V(3.0, 1.0, 4.6), 44, 42),
    r2: P2(S.r2, V(-1.6, 1.42, 1.75), V(-1.5, 1.41, 1.8), V(2.9, 1.05, 3.6), V(2.9, 1.05, 3.6), 44, 42),
    r3: P2(S.r3, V(-0.9, 1.45, 11.0), V(-0.95, 1.45, 10.95), V(2.45, 1.2, 2.65), V(2.45, 1.2, 2.65), 30, 29),
    r4a: P2(S.r4a, V(-2.2, 1.2, 3.05), V(-2.15, 1.19, 3.08), V(6.0, 0.85, 4.95), V(5.6, 0.85, 4.9), 42, 41),
    r4b: P2(S.r4b, V(1.55, 1.38, 6.75), V(1.58, 1.375, 6.71), V(2.75, 1.13, 5.72), V(2.75, 1.13, 5.72), 34, 31),
    end: P2(S.end, V(1.05, 1.55, 1.75), V(1.0, 1.54, 1.78), V(1.6, 1.0, 5.2), V(1.6, 1.0, 5.2), 46),
  };
  // cameras that ride a car (local keys, eased by the shot's k)
  const carCam = (car, k, a, b, ta, tb, fa, fb = fa) => { const e = smooth(0, 1, k);
    cam.position.copy(toW(car, lerp(a.x, b.x, e), lerp(a.y, b.y, e), lerp(a.z, b.z, e))); cam.up.set(0, 1, 0);
    cam.lookAt(toW(car, lerp(ta.x, tb.x, e), lerp(ta.y, tb.y, e), lerp(ta.z, tb.z, e))); cam.fov = lerp(fa, fb, e); cam.updateProjectionMatrix(); };
  // a camera that rides the phone (screen close-ups)
  const phoneCam = (dist = 0.27, fov = 34) => { const upv = V(0, 1, 0).applyQuaternion(phone.quaternion), n = V(0, 0, 1).applyQuaternion(phone.quaternion);
    cam.position.copy(phone.position).addScaledVector(n, dist); const hd = wp(ines.bones.Head).add(V(0, 0.06, 0)), dh = cam.position.distanceTo(hd);
    if (dh < 0.14) cam.position.addScaledVector(V(-1, 0, 0).applyQuaternion(ines.root.quaternion), 0.14 - dh); cam.up.copy(upv); cam.lookAt(phone.position.clone().addScaledVector(upv, -0.012)); cam.up.set(0, 1, 0); cam.fov = fov; cam.updateProjectionMatrix(); };

  // ---------- lights that move with the story ----------
  const fill = new THREE.PointLight('#ffd8b0', 0, 3, 2); scene.add(fill);
  const cabin = new THREE.PointLight('#9ec2ff', 0, 1.8, 2); scene.add(cabin);           // the dashboard's glow on faces in the car
  const passing = new THREE.PointLight('#ffb070', 0, 6, 2); scene.add(passing);         // street lamps sweeping past the car's windows
  const tunnelFill = new THREE.PointLight('#ffae55', 0, 10, 2); scene.add(tunnelFill);

  return {
    duration: DUR, fps: 30, captions: [],
    frame(t, opts = {}) {
      curT = t;
      let sh = shotAt(t), id = sh.id, tt = t;
      // the rewind plays the ET SI branch backwards (to the moment before the door)
      if (id === 'rewind') { const r = (t - S.rewind.t0) / (S.rewind.t1 - S.rewind.t0); tt = S.stat2.t1 - 0.001 - r * (S.stat2.t1 - S.s5.t0 - 0.002); sh = shotAt(tt); id = sh.id; }
      const k = clamp((tt - sh.t0) / (sh.t1 - sh.t0));
      const etsi = ETSI(tt);
      for (const a of everyone) a.root.visible = false;
      black.group.visible = false; grey.group.visible = false; phone.visible = false;
      bHead.intensity = 0; gHead.intensity = 0; fill.intensity = 0; cabin.intensity = 0; passing.intensity = 0; tunnelFill.intensity = 0;
      R.renderer.toneMappingExposure = 1.0; G.uSat.value = 1.0; G.uTint.value.set(1, 1, 1); G.uScan.value = 0; G.uAberr.value = 0; G.uFade.value = 0; G.uVignette.value = 0.75;
      black.setWindow('RF', 0); black.setDoor(0); black.setLocks(0); grey.setWindow('RF', 0); grey.setDoor(0); grey.setLocks(0);
      morph(ines, {});
      // --- the black car: arriving, at the kerb, in the ET SI drive, leaving
      const atKerb = ['hook', 's4', 's5', 'etsi', 'r1', 'tip1', 'tip2a', 'tip2b', 'tip3', 'tip4', 'r2'].includes(id);
      let bx = CX, byaw = YAW, bz = CZ, bdist = 0;
      if (id === 's3') { const a = arrive(tt, T_ARR - 0.6, T_STOP, 16, CX); bx = a.x; bdist = 16 - bx; }
      if (id === 'r3') { bx = depart(tt, T_LEAVE, CX); bdist = CX - bx; }
      if (['e1', 'e2', 'e3', 'e4', 'e5'].includes(id)) {
        // the ET SI drive: away from the kerb, then down the boulevard (re-placed per shot so the street stays in view)
        const start = { e1: [CX, T_GO], e2: [CX - 3, S.e2.t0 - 1.6], e3: [12, S.e3.t0 - 2.5], e4: [6, S.e4.t0 - 2.5], e5: [0, S.e5.t0 - 2.5] }[id];
        bx = depart(tt, start[1], start[0], 1.4, 7.5); bdist = start[0] - bx;
        if (id === 'e3') { byaw = YAW + 0.16 * smooth(0.25, 0.95, k); bz = CZ + 1.6 * smooth(0.2, 1.0, k); }
        else if (id !== 'e1') bz = CZ + 1.3;
      }
      if (['stat1', 'stat2'].includes(id)) { const t0 = S.stat1.t0 - 0.8; bx = TX + 6 - (6 * (tt - t0) + 0.4 * (tt - t0) ** 2); bz = 7.6 - 1.6; bdist = (TX + 6) - bx; }
      const blackOn = id === 'hook' || atKerb || ['s3', 'r3', 'e1', 'e2', 'e3', 'e4', 'e5', 'stat1', 'stat2'].includes(id);
      if (blackOn) {
        black.group.visible = true; place(black, bx, bz, byaw); black.spin(bdist);
        const moving = ['s3', 'r3', 'e3', 'stat1', 'stat2'].includes(id);
        black.setLights({ head: id === 'tip2b' ? 0.3 : 1, tail: 1, brake: id === 's3' ? smooth(T_STOP - 1.6, T_STOP - 1.2, tt) * (1 - smooth(T_STOP + 0.3, T_STOP + 0.8, tt)) : 0, blink: id === 's3' && Math.floor(tt * 2.6) % 2 === 0 ? 1 : 0, dash: 1 });
        bHead.intensity = id === 'hook' ? 9 : moving ? 6 : id === 'tip2b' ? 1.5 : 5;
        const win = id === 'hook' ? 1 : id === 's3' ? smooth(T_WIN, T_WIN + 1.0, tt) : atKerb ? 1 : id === 'r3' ? 1 - smooth(T_LEAVE - 0.5, T_LEAVE + 0.2, tt) : 0;
        black.setWindow('RF', win);
        if (id === 's5' || id === 'etsi') black.setDoor(0.05 * smooth(T_DOOR + 0.1, T_DOOR + 0.35, tt) + 0.03 * smooth(S.etsi.t0 + 0.2, S.etsi.t1, tt));
        // the dome light: on once the rear door unlatches, off with the central locking (e1)
        black.setDome(id === 's5' || id === 'etsi' ? smooth(T_DOOR + 0.12, T_DOOR + 0.3, tt) : id === 'e1' ? 1 - smooth(T_LOCK, T_LOCK + 0.45, tt) : 0);
        black.setHandleIn(id === 'e4' ? pullK(tt) : 0);
        if (['e1', 'e2', 'e3', 'e4', 'e5'].includes(id)) black.setLocks(id === 'e1' ? smooth(T_LOCK, T_LOCK + 0.06, tt) : 1);
      }
      // --- the grey car: arriving, at the kerb, driving her home
      let gx = CX + 0.4, gz = CZ, gdist = 0;
      if (id === 'r4a') { const a = arrive(tt, T_ARR2, T_STOP2, 15, CX + 0.4); gx = a.x; gdist = 15 - gx; }
      if (['r5', 'tw1', 'tw2', 'tw3'].includes(id)) { const start = { r5: [CX + 0.4, S.r5.t0 + 0.9], tw1: [10, S.tw1.t0 - 2], tw2: [4, S.tw2.t0 - 2], tw3: [0, S.tw3.t0 - 2] }[id]; gx = depart(tt, start[1], start[0], 1.2, 6); gdist = start[0] - gx; if (id !== 'r5') gz = CZ + 1.3; }
      const greyOn = ['r4a', 'r4b', 'r5', 'tw1', 'tw2', 'tw3'].includes(id);
      if (id === 'tip3') { grey.group.visible = true; place(grey, -9, CZ); grey.spin(0); grey.setLights({ head: 0, tail: 0, dash: 0 }); }
      if (greyOn) { grey.group.visible = true; place(grey, gx, gz); grey.spin(gdist); grey.setLights({ head: 1, tail: 1, brake: id === 'r4a' ? smooth(T_STOP2 - 1.4, T_STOP2 - 1.0, tt) : 0, dash: 1 }); gHead.intensity = id === 'r4a' ? 6 : 4; }

      // --- the fake driver
      if (blackOn && !['stat1', 'stat2', 'tip4'].includes(id)) {
        const face = toW(black, -0.55, 1.18, -0.05);                     // toward the passenger window
        const lean = id === 'hook' || id === 's4' || id === 'tip4', back = id === 's5' || id === 'etsi';
        show(fake, () => seatPose(fake, black, 'driver', lean
          ? { lean: RECLINE, headUp: 0.3, look: id === 'tip4' || id === 's4' ? EYES_WIN : toW(black, -1.6, 1.42, -0.02), lookK: 1, ...GRIP_L, curlR: 0.3, handL: wheelHand(black, 1), handR: (P, fwd, left, up) => ({ hand: toW(black, 0.02, 0.67, -0.05), pole: P.clone().addScaledVector(left, -0.6).addScaledVector(up, 0.2), F: fwd.clone(), N: V(0, -1, 0) }) }
          : back ? { fz: 0.03, lean: RECLINE, twist: -0.25, look: V(3.93, 1.52, 4.17), lookK: 0.85, ...GRIP_L, curlR: 0.3, handL: wheelHand(black, 1), handR: (P, fwd, left, up) => ({ hand: toW(black, 0.02, 0.67, -0.05), pole: P.clone().addScaledVector(left, -0.6).addScaledVector(up, 0.2), F: fwd.clone(), N: V(0, -1, 0) }) }
          : { look: id === 'e5' ? toW(black, 0, MIR_Y, -0.13) : id === 's3' && tt > T_STOP - 0.8 ? toW(black, -1.6, 1.45, 0.1) : toW(black, 0.3, 1.1, 6), lookK: 0.9, lean: RECLINE, headUp: 0.3, ...GRIP, handL: wheelHand(black, 1), handR: wheelHand(black, -1) }));
        if (lean) morph(fake, { mouthsmile: id === 'hook' ? 0.35 : 0.25 });
      }
      if (SWEEP?.includes('rim') && fake.root.visible) { for (const u of [0.045, 0.052]) for (const a of [0.055, 0.065]) for (const th of [-1.0, -1.5]) for (const c of [0.4, 0.5]) {
          seatPose(fake, black, 'driver', { look: toW(black, 0.3, 1.1, 6), lookK: 0.9, curlL: c, curlR: c, thumbL: th, thumbR: th, handL: wheelHand(black, 1, { u, a }), handR: wheelHand(black, -1, { u, a }) }); fake.root.updateMatrixWorld(true);
          console.log(`SWEEP rim u=${u} a=${a} th=${th} c=${c} L ${rimPen(fake, black, 'Left')} R ${rimPen(fake, black, 'Right')}`); }
        show(fake, () => seatPose(fake, black, 'driver', { look: toW(black, 0.3, 1.1, 6), lookK: 0.9, lean: RECLINE, headUp: 0.3, ...GRIP, handL: wheelHand(black, 1), handR: wheelHand(black, -1) })); }
      if (SWEEP?.includes('roof') && fake.root.visible) { for (const nm of ['lean', 'back']) for (const ln of [0, 0.04]) for (const tw of [-0.15, -0.25]) for (const fz of [0, 0.03]) {
          seatPose(fake, black, 'driver', { fz, lean: RECLINE + ln, twist: tw, look: nm === 'lean' ? EYES_WIN : V(3.93, 1.52, 4.17), lookK: 1, ...GRIP_L, curlR: 0.3, handL: wheelHand(black, 1), handR: (P, fwd, left, up) => ({ hand: toW(black, 0.02, 0.67, -0.05), pole: P.clone().addScaledVector(left, -0.6).addScaledVector(up, 0.2), F: fwd.clone(), N: V(0, -1, 0) }) });
          fake.root.updateMatrixWorld(true); console.log(`SWEEP roof fake ${nm} lean+${ln} tw ${tw} fz ${fz} roof ${roofPen(fake, black)} seat ${seatPen(fake, black)} rimL ${rimPen(fake, black, 'Left')}`); }
        show(fake, () => seatPose(fake, black, 'driver', { look: toW(black, 0.3, 1.1, 6), lookK: 0.9, lean: RECLINE, headUp: 0.3, ...GRIP, handL: wheelHand(black, 1), handR: wheelHand(black, -1) })); }
      if (SWEEP?.includes('console') && fake.root.visible) { for (const hy of [0.64, 0.67, 0.7]) for (const th of [0.15, 0.6, 1.0]) {
          seatPose(fake, black, 'driver', { lean: RECLINE, headUp: 0.3, look: EYES_WIN, lookK: 1, ...GRIP_L, curlR: 0.3, thumbR: th, handL: wheelHand(black, 1), handR: (P, fwd, left, up) => ({ hand: toW(black, 0.02, hy, -0.05), pole: P.clone().addScaledVector(left, -0.6).addScaledVector(up, 0.2), F: fwd.clone(), N: V(0, -1, 0) }) });
          fake.root.updateMatrixWorld(true); console.log(`SWEEP console hy ${hy} th ${th} console ${boxPen(fake, black.group, [{ c: V(0, 0.45, -0.02), h: V(0.1, 0.15, 0.375), nm: 'console' }], handSet(fake, 'Right'))} seat ${seatPen(fake, black)}`); } }
      if (SWEEP?.includes('real') && greyOn) { for (const hu of [0, 0.25]) for (const fz of [0.035, 0.02]) for (const ln of [-0.42, -0.48]) {
          seatPose(real, grey, 'driver', { fz, lean: ln, headUp: hu, look: toW(grey, 0.3, 1.1, 6), lookK: 0.9, ...GRIP, handL: wheelHand(grey, 1), handR: wheelHand(grey, -1) }); real.root.updateMatrixWorld(true);
          console.log(`SWEEP real hu ${hu} fz ${fz} lean ${ln} roof ${roofPen(real, grey)} seat ${seatPen(real, grey)} rimL ${rimPen(real, grey, 'Left')}`); } }
      if (SWEEP?.includes('head') && fake.root.visible) { for (const hu of [0.3, 0.55, 0.8]) for (const fz of [0, -0.025, -0.05]) {
          seatPose(fake, black, 'driver', { fz, look: toW(black, 0.3, 1.1, 6), lookK: 0.9, lean: RECLINE, headUp: hu, ...GRIP, handL: wheelHand(black, 1), handR: wheelHand(black, -1) }); fake.root.updateMatrixWorld(true);
          console.log(`SWEEP head fake hu ${hu} fz ${fz} roof ${roofPen(fake, black)} seat ${seatPen(fake, black)} rimL ${rimPen(fake, black, 'Left')} rimR ${rimPen(fake, black, 'Right')}`); } }
      if (SWEEP?.includes('roof') && greyOn) { for (const [fz, ln] of [[0.035, -0.42], [0.015, -0.36], [0.015, -0.42], [0.0, -0.4]]) {
          seatPose(real, grey, 'driver', { fz, lean: ln, look: toW(grey, 0.3, 1.1, 6), lookK: 0.9, ...GRIP, handL: wheelHand(grey, 1), handR: wheelHand(grey, -1) }); real.root.updateMatrixWorld(true);
          console.log(`SWEEP roof real fz ${fz} lean ${ln} roof ${roofPen(real, grey)} seat ${seatPen(real, grey)} rimL ${rimPen(real, grey, 'Left')}`); } }
      // --- the real driver
      if (greyOn) show(real, () => seatPose(real, grey, 'driver', { fz: REAL_FZ, lean: REAL_LEAN, headUp: 0.25, look: toW(grey, 0.3, 1.1, 6), lookK: 0.9, ...GRIP, handL: wheelHand(grey, 1), handR: wheelHand(grey, -1) }));
      // --- Inès
      const IN_BLACK = ['e1', 'e2', 'e3', 'e4', 'e5'].includes(id), IN_GREY = ['r5', 'tw1', 'tw2', 'tw3'].includes(id);
      if (id === 's1') {
        // out of the bar to the kerb
        const A0 = V(0.95, K, 1.05), u = smooth(0, 0.85, k), pos = A0.clone().lerp(I_P, u);
        show(ines, () => walk(ines, { pos, yaw: Math.atan2(I_P.x - A0.x, I_P.z - A0.z), phase: A0.distanceTo(pos) / (2 * 0.6), stride: 0.6, look: V(6, 1.4, 8), lookK: 0.4 }));
      }
      if (id === 's2' || id === 'tip2a') {
        show(ines, () => stand(ines, { pos: I_P, yaw: 0.25, breath: t * 0.4, look: phone.position.clone().lengthSq() > 0 ? I_P.clone().add(V(0.12, 1.15, 0.38)) : V(3, 1.2, 5), lookK: 0.85, armR: phoneStand(0.04), armL: armDown(1) }));
        phone.visible = true; phoneFit(ines, 'Right', phone);
      }
      if (id === 's3' || id === 'r4a') {
        const lookCar = id === 's3' ? V(bx, 1.2, CZ) : V(gx, 1.2, CZ);
        show(ines, () => stand(ines, { pos: I_P, yaw: 0.25, breath: t * 0.4, look: lookCar, lookK: 0.8, armR: phoneStand(-0.08), armL: armDown(1) }));
        phone.visible = true; phoneFit(ines, 'Right', phone);
      }
      if (id === 'tip4' || id === 'r1') {
        // bent to the open window (r1: upright again, looking at him)
        const bend = id === 'r1' ? 0.08 : TIP4_BEND, pos = id === 'r1' ? I_P.clone().add(V(0.05, 0, 0.12)) : V(TIP4_X, K, TIP4_Z);
        show(ines, () => stand(ines, { pos, yaw: 0.05, hipBend: bend, headUp: id === 'r1' ? 0 : 0.85, crouch: id === 'r1' ? 0 : TIP4_CR, lean: id === 'r1' ? 0.0 : 0.1, breath: t * 0.4, look: id === 'tip4' ? toW(black, 0.35, 1.3, -0.18) : wp(fake.bones.Head), lookK: 1.0, armR: armDown(-1), armL: armDown(1) }));
        if (id === 'tip4') { const sp = Math.max(0, Math.sin((tt - Lw(20, 'Vous')) * 13)) * smooth(Lw(20, 'Vous') - 0.05, Lw(20, 'Vous'), tt) * (1 - smooth(Ln[20].t1, Ln[20].t1 + 0.1, tt)); morph(ines, { jawopen: 0.28 * sp, mouthfunnel: 0.15 * sp }); }
      }
      if (id === 's5' || id === 'etsi') {
        // her right hand on the rear door's handle; it comes with the door
        const hTgt = (py = S5PY) => black.grips.handleRR().add(V(0, py, 0));     // the fingers' middle behind the bar
        const s5Pose = (o) => { const pos = I_D.clone().add(V(o.dx, 0, o.dz)); const pose = (arm) => stand(ines, { pos, yaw: o.yaw, hipBend: o.hb, crouch: o.cr, breath: t * 0.4, look: id === 'etsi' ? toW(black, 0.1, 1.05, -0.7) : hTgt(), lookK: 0.7, armR: arm, armL: armDown(1) });
          const spec = (sh, fwd, left, up) => ({ hand: hTgt(o.py ?? S5PY), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.6).addScaledVector(fwd, -0.2), F: V(0, -1, 0).addScaledVector(fwd, o.ff ?? 0.15).normalize(), N: V(-1, 0, 0).transformDirection(black.door.matrixWorld), curl: o.c ?? S5C, pk: o.pk ?? S5PK });
          const reach = o.r ?? smooth(S.s5.t0 + 0.1, T_DOOR - 0.1, tt);
          // the final grip first (the wrist where the fingers' middle sits behind the bar), then the reach ends exactly there
          const want = pressPose(ines, 'Right', hTgt(o.py ?? S5PY), pose, spec, () => wp(ines.bones.RightHandMiddle1).lerp(wp(ines.bones.RightHandMiddle2), 0.5));
          if (reach < 0.999) {
            // the hand swings out past the bar, comes in above it and slides the fingers down behind it (a straight line takes the
            // forearm through the door skin and the fingers through the bar)
            const outD = V(-1, 0, 0).transformDirection(black.door.matrixWorld), U = V(0, 1, 0);
            pose((sh, fwd, left, up) => { const a = armDown(-1)(sh, fwd, left, up), b = spec(sh, fwd, left, up);
              const u2 = o.u2 ?? S5P[2], ii = o.ii ?? S5P[3], P3 = want.clone(), P1 = P3.clone().addScaledVector(outD, o.o1 ?? S5P[1]).addScaledVector(U, u2 + 0.01);
              const P2 = P3.clone().addScaledVector(U, u2).addScaledVector(outD, -ii), P2b = P3.clone().addScaledVector(U, 0.35 * u2).addScaledVector(outD, -ii);   // down close to the skin, then onto the bar
              const P0 = a.hand.clone().addScaledVector(outD, o.o0 ?? S5P[0]);
              // the fingers stay straight on the way down (curled, their tips catch the top of the bar) and close behind it
              return { ...b, hand: new THREE.CatmullRomCurve3([P0, P1, P2, P2b, P3]).getPoint(reach), F: a.F.clone().lerp(b.F, smooth(0, 0.6, reach)).normalize(), curl: lerp(o.cd ?? S5P[4], b.curl, smooth(0.86, 1, reach)) }; });
          } };
        const dl = DOOR_OUT;
        if (SWEEP?.includes('reach')) for (const yaw of [0.9]) for (const hb of [0.75]) for (const cr of [0.1]) for (const [dx, dz] of [[0.05, 0.08]]) for (const py of [0, -0.004]) for (const c of [0.12, 0.18, 0.22]) for (const pk of [-0.25]) { const ff = 0;
          s5Pose({ dx, dz, yaw, hb, cr, c, py, ff, pk }); ines.root.updateMatrixWorld(true); const r = hTgt(py).sub(wp(ines.bones.RightHandMiddle1).lerp(wp(ines.bones.RightHandMiddle2), 0.5));
          console.log(`SWEEP reach c=${c} pk=${pk} py=${py} res ${(r.length() * 100).toFixed(1)}cm door ${boxPen(ines, black.door, dl)}`); }
        if (SWEEP?.includes('path')) for (const o0 of [S5P[0]]) for (const o1 of [S5P[1]]) for (const u2 of [S5P[2]]) for (const ii of [S5P[3]]) for (const cd of [S5P[4]]) {
          let wd = -1e9, wb = '', wr = 0; for (let r = 0; r <= 0.999; r += 0.01) { s5Pose({ ...S5, r, o0, o1, u2, ii, cd }); ines.root.updateMatrixWorld(true); const d = boxPen(ines, black.door, dl), v = parseFloat(d); if (v > wd) { wd = v; wb = d; wr = r; } }
          console.log(`SWEEP path o0=${o0} o1=${o1} u2=${u2} ii=${ii} cd=${cd} worst door ${wb} at r=${wr.toFixed(3)}`); }
        show(ines, () => s5Pose(S5));
      }
      if (IN_BLACK || IN_GREY) {
        const car = IN_BLACK ? black : grey;
        const lookAt2 = id === 'e3' ? toW(car, 0.1, 1.1, 4) : id === 'e5' ? toW(car, 0, MIR_Y, -0.13) : id === 'e4' ? car.grips.handleInRR() : id === 'tw1' ? toW(car, -3, 1.2, -1.5) : phone.position.clone();
        const phoneIn = ['e2', 'r5', 'tw2', 'tw3'].includes(id);
        if (id !== 'e5') show(ines, () => {
          const base = { look: lookAt2, lookK: 0.9, handL: lapL, curlL: 0.35, footFwd: 0.4, ...(phoneIn ? { curlR: 0.08, pkR: PK, thumbR: THUMB } : id === 'e4' ? { curlR: LEVER_CURL } : {}) };
          if (id === 'e4') {
            // her fingers hooked into the gap behind the lever (from above: F down, the pads toward her), then she pulls
            const e4Pose = (o) => { const pose = (arm) => seatPose(ines, car, 'rearR', { ...base, curlR: o.lc, lean: o.ln ?? E4LEAN, handR: (P, fwd, left, up) => arm(wp(ines.bones.RightArm), fwd, left, up) });
              const out = V(-1, 0, 0).transformDirection(car.handleIn.matrixWorld), tgt = car.grips.handleInRR().addScaledVector(out, o.li).add(V(0, o.py, 0)).addScaledVector(V(0, 0, 1).transformDirection(car.handleIn.matrixWorld), o.dz ?? E4DZ);
              const spec = (sh, fwd, left, up) => ({ hand: tgt, pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(left, -0.5).addScaledVector(fwd, -0.3), F: (o.fd ? V(0, -1, 0).lerp(fwd, 0.15).normalize() : fwd.clone()).addScaledVector(out, o.fo ?? E4FO).normalize(), N: out.clone().negate() });
              pressPose(ines, 'Right', tgt, pose, spec, () => wp(ines.bones.RightHandMiddle1).lerp(wp(ines.bones.RightHandMiddle2), o.pm)); };
            if (SWEEP?.includes('lever')) { black.door.updateMatrixWorld(true); for (const fd of [1]) for (const li of [0.036]) for (const lc of [0]) for (const py of [-0.006]) for (const ln of [0.38]) for (const dz of [-0.05]) for (const fo of [0, 0.2, 0.35, 0.5]) for (const li2 of [0.03, 0.036, 0.042]) {
              e4Pose({ fd, li: li2, lc, py, pm: 0.5, ln, dz, fo }); ines.root.updateMatrixWorld(true);
              console.log(`SWEEP lever fo=${fo} li=${li2} py=${py} dz=${dz} | door ${boxPen(ines, black.door, doorBoxes, handSet(ines, 'Right'))} lever ${boxPen(ines, black.handleIn, leverBox, handSet(ines, 'Right'))}`); } }
            e4Pose(E4);
          } else seatPose(ines, car, 'rearR', { ...base, handR: phoneIn ? phoneLap : (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.26).addScaledVector(up, 0.13).addScaledVector(left, -0.1), pole: P.clone().addScaledVector(up, 0.25).addScaledVector(left, -0.6).addScaledVector(fwd, -0.3), F: fwd.clone().addScaledVector(left, 0.4).normalize(), N: V(0, -1, 0) }) });
        });
        if (phoneIn) { phone.visible = true; phoneFit(ines, 'Right', phone); }
        cabin.intensity = 0.5; cabin.position.copy(toW(car, -0.1, 1.05, -0.4));
        // street light sweeping across the cabin as the car drives
        const ph = ((car === black ? bdist : gdist) / 9) % 1; passing.intensity = 5 * Math.pow(Math.sin(Math.PI * ph), 6); passing.position.copy(toW(car, -2.5, 3.2, lerp(3, -4, ph)));
      }
      if (id === 'r2') {
        const A0 = I_P.clone().add(V(0.05, 0, 0.12)), A1 = V(2.45, K, 2.65), u = smooth(0.15, 0.95, k), pos = A0.clone().lerp(A1, u);
        show(ines, () => walk(ines, { pos, yaw: 0.05, phase: -A0.distanceTo(pos) / (2 * 0.45), stride: 0.45, look: wp(fake.bones.Head), lookK: 0.8 }));
      }
      if (id === 'r3' || id === 'tip1' || id === 'end') show(ines, () => stand(ines, { pos: id === 'tip1' ? I_P : V(2.45, K, 2.65), yaw: id === 'r3' ? -0.6 : 0.2, breath: t * 0.4, look: V(bx, 1.1, CZ), lookK: 0.8, armR: armDown(-1), armL: armDown(1) }));
      // --- smokers by the bar door (the wide shots)
      if (['s1', 'tip1'].includes(id)) {
        show(extraA, () => stand(extraA, { pos: V(-1.6, K, 1.2), yaw: 0.9, breath: t * 0.35 + 0.3, look: V(-0.6, 1.6, 1.8), lookK: 0.7 }));
        show(extraB, () => stand(extraB, { pos: V(-0.75, K, 1.65), yaw: -2.2, breath: t * 0.33, look: V(-1.6, 1.6, 1.2), lookK: 0.7 }));
      }
      // --- phone screens
      if (phone.visible) {
        const clock = IN_GREY ? '02:31' : IN_BLACK ? '02:17' : '02:14', pct = IN_GREY ? (['tw2', 'tw3'].includes(id) ? 9 : 10) : 12;
        if (id === 's2') { if (k < 0.45) drawScreen('search', { clock, pct, k: k / 0.45, me: [256, 300] }); else drawScreen('ride', { clock, pct, me: [256, 300], car: [420, 120, 0.4], eta: 'Arrive dans 6 min' }); }
        else if (id === 'tip2a') drawScreen('ride', { clock: '02:16', pct: 12, me: [256, 300], car: [380, 170, 0.6], eta: 'Arrive dans 4 min' });
        else if (id === 'e2') drawScreen('ride', { clock: '02:17', pct: 11, me: [256 - 90 * k, 300 + 20 * k], car: [380, 170, 0.6], eta: 'Arrive dans 4 min', route: [[256, 300], [150, 310], [40, 330]] });
        else if (id === 'r5') drawScreen('shared', { clock: '02:21', pct: 10, me: [256, 300], car: [262, 292, 0] });
        else if (id === 'tw2') drawScreen(k < 0.3 ? 'off' : 'lock', { clock: '02:31', pct: 9 });
        else if (id === 'tw3') drawScreen('lock', { clock: '02:31', pct: 9, notif: smooth(0.0, 0.25, k) });
        else drawScreen('ride', { clock, pct, me: [256, 300], car: [420, 120, 0.4] });
      }

      // --- cameras
      if (CAM[id]) CAM[id].apply(cam, tt);
      if (id === 'hook' || id === 's4') {
        // her eyes, bent to the window: his face in the frame of the open window (a slow push-in)
        const e = smooth(0, 1, id === 'hook' ? k : 0.4 + 0.6 * k); cam.position.set(lerp(2.94, 2.96, e), lerp(1.215, 1.2, e), lerp(3.98, 4.06, e)); cam.lookAt(toW(black, 0.37, 1.27, -0.17)); cam.fov = lerp(46, 43, e); cam.updateProjectionMatrix();
      }
      if (id === 'tip3') carCam(grey, k, V(STK.x + 0.5, STK.y + 0.26, STK.z + 0.52), V(STK.x + 0.47, STK.y + 0.25, STK.z + 0.49), STK.clone().add(V(0, -0.03, 0)), STK.clone().add(V(0, -0.03, 0)), 30, 27);
      if (id === 'tip2b') { const e = smooth(0, 1, k), pl = black.plateF.getWorldPosition(V(0, 0, 0)); cam.position.set(lerp(-1.25, -1.18, e), 0.62, pl.z); cam.lookAt(pl.x, pl.y - 0.07, pl.z); cam.fov = lerp(44, 40, e); cam.updateProjectionMatrix(); }
      if (id === 'tip4') { const e = smooth(0, 1, k); cam.position.copy(toW(black, lerp(0.36, 0.34, e), 1.3, lerp(-0.19, -0.17, e))); cam.lookAt(wp(ines.bones.Head).add(V(0, 0.06, 0))); cam.fov = lerp(34, 30, e); cam.updateProjectionMatrix(); }
      if (id === 's2' || id === 'tip2a') phoneCam(0.27, 34);
      if (id === 'e1') carCam(black, k, V(-0.6, 1.09, -0.66), V(-0.61, 1.085, -0.68), V(-0.795, 0.975, -0.89), V(-0.795, 0.975, -0.89), 34, 31);
      if (id === 'e2' || id === 'r5' || id === 'tw2' || id === 'tw3') phoneCam(id === 'tw3' || id === 'tw2' ? 0.31 : 0.28, 34);
      if (id === 'e3') carCam(black, k, V(-0.12, 1.16, -1.18), V(-0.1, 1.155, -1.15), V(0.05, 1.05, 4), V(0.08, 1.05, 4), 56, 54);
      if (id === 'e4') carCam(black, k, V(-0.36, 1.0, -0.42), V(-0.37, 0.995, -0.43), V(-0.72, 0.84, -0.62), V(-0.72, 0.84, -0.62), 40, 37);
      if (id === 'e5') carCam(black, k, V(-0.4, 1.17, -1.22), V(-0.39, 1.17, -1.2), V(0, MIR_Y, -0.13), V(0, MIR_Y, -0.13), 17, 15);
      if (id === 'tw1') { carCam(grey, k, V(0.02, 1.13, -0.4), V(0.0, 1.13, -0.42), V(-0.42, 1.17, -0.96), V(-0.42, 1.17, -0.96), 36, 33); const hd = wp(ines.bones.Head).add(V(0, 0.07, 0)); cam.lookAt(hd); }
      if (DBG && q.get('dbgcam')) { const c = q.get('dbgcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6]; }   // look-dev of contacts
      cam.near = IN_BLACK || IN_GREY || id === 's4' || id === 'tip4' || id === 's5' || phone.visible || (DBG && q.get('dbgcam')) ? 0.012 : 0.05; if (id === 'e5') cam.near = Number(q.get('e5near') ?? 0.1); cam.far = id === 'e5' ? Number(q.get('e5far') ?? 900) : 900; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      // the rear-view mirror turned so that her eyes meet his (e5)
      if (DBG && q.get('noglass')) black.group.traverse((o) => { if (o.material && o.material.color && o.material.color.getHexString() === '080a0e') o.visible = false; });
      if (DBG && q.get('mirhide')) black.group.children.forEach((c) => { if (c !== black.mirror.parent) c.visible = false; });
      if (DBG && q.get('mirball')) { if (!globalThis.MB) { globalThis.MB = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshBasicMaterial({ color: '#ff0000' })); globalThis.MB.frustumCulled = false; scene.add(globalThis.MB); } globalThis.MB.position.copy(wp(fake.bones.Head).add(V(0, 0.06, 0))); }
      if (blackOn) { const M = toW(black, 0, MIR_Y, -0.13), eI = toW(black, -0.4, 1.17, -1.22), eD = wp(fake.bones.Head).add(V(0, MIR_AIM, 0));
        const n = eI.clone().sub(M).normalize().add(eD.clone().sub(M).normalize()).normalize(); black.mirror.parent.lookAt(M.clone().sub(n)); }
      // looks
      if (etsi && !['etsi'].includes(id)) { G.uSat.value = 0.4; G.uTint.value.set(1.05, 0.96, 0.94); }
      if (['stat1', 'stat2'].includes(id)) { tunnelFill.intensity = 6; tunnelFill.position.copy(cam.position).add(V(-3, 2, 1)); R.renderer.toneMappingExposure = 0.95; }
      if (IN_BLACK || IN_GREY) { R.renderer.toneMappingExposure = id === 'e3' ? 1.6 : 1.35; fill.intensity = id === 'e5' ? 0.05 : 0.22; fill.position.copy(cam.position).add(V(0, 0.18, 0)); }
      if (id === 's4' || id === 'tip4' || id === 'hook') { cabin.intensity = 0.7; cabin.position.copy(toW(black, -0.1, 1.05, 0.15)); fill.intensity = 0.35; fill.position.copy(cam.position).add(V(0.2, 0.25, 0)); }
      if (id === 'tip4') { fill.intensity = 0.5; fill.position.copy(toW(black, -0.5, 1.3, 0.0)); }
      if (id === 'tip2b') { fill.intensity = 6; fill.position.copy(toW(black, 0.0, 1.2, 3.2)); }
      if (id === 'tip3') { fill.intensity = 1.2; fill.position.copy(toW(grey, STK.x + 0.9, STK.y + 0.9, STK.z + 0.6)); }
      if (id === 'e5') { cabin.intensity = Number(q.get('e5l') ?? 0.18); cabin.position.copy(toW(black, 0.35, 1.0, 0.28)); }
      if (id === 'r4b') { cabin.intensity = 0.45; cabin.position.copy(toW(grey, 0.3, 1.12, 0.25)); }
      if (id === 'e5' && k > 0.88) G.uFade.value = smooth(0.88, 1.0, k);
      if (S.rewind.t0 <= t && t < S.rewind.t1) { G.uScan.value = 1.0; G.uSat.value = 0.4; G.uAberr.value = 0.012; }
      // overlay
      const endK = smooth(S.end.t0, S.end.t0 + 0.6, t);
      const close = ['s4', 'tip4', 'r1', 'tw1', 'e5', 'hook'].includes(id), phoneShot = phone.visible && ['s2', 'tip2a', 'e2', 'r5', 'tw2', 'tw3'].includes(id);
      const plate = id === 's1' ? { a: '2 h 14', b: 'PIGALLE · PARIS 18e', k: smooth(S.s1.t0 + 0.1, S.s1.t0 + 0.4, t) * (1 - smooth(S.s1.t1 - 0.35, S.s1.t1, t)) }
        : id === 'r4a' ? { a: '2 h 20', b: '4 MINUTES PLUS TARD', k: smooth(S.r4a.t0 + 0.1, S.r4a.t0 + 0.4, t) * (1 - smooth(S.r4a.t1 - 0.3, S.r4a.t1, t)) } : null;
      const bat = IN_GREY ? (['tw2', 'tw3'].includes(id) ? 9 : 10) : IN_BLACK ? 11 : 12;
      ov.apply({ t, time: IN_GREY ? '02:31' : '02:14', bat, statA: id === 'end' || id === 'hook' ? 0 : 1, serA: id === 'end' ? 0 : 1, part: 'S2 · PARTIE 1',
        capA: id === 'end' ? 0 : 1, capY: id === 'hook' ? 76 : close ? 72 : phoneShot ? 84 : 57, plate,
        etsi: id === 'etsi' ? smooth(S.etsi.t0, S.etsi.t0 + 0.25, t) : 0,
        rew: S.rewind.t0 <= t && t < S.rewind.t1 ? 1 : 0,
        news: id === 'stat1' ? { a: 'AVRIL 2024 · PARIS', b: 'deux jeunes femmes montent dans une voiture qu’elles prennent pour leur VTC', k: smooth(S.stat1.t0 + 0.1, S.stat1.t0 + 0.4, t) }
          : id === 'stat2' ? { a: 'LA COMMANDE N’ÉTAIT JAMAIS PASSÉE', b: 'le conducteur, sans carte VTC, a été condamné en 2025', k: smooth(S.stat2.t0 + 0.1, S.stat2.t0 + 0.4, t) }
            : id === 'tip1' ? { a: 'SANS RÉSERVATION, CE N’EST PAS UN VTC', b: 'dans la rue, seul un taxi peut vous prendre', k: smooth(S.tip1.t0 + 0.1, S.tip1.t0 + 0.4, t) }
              : id === 'tip2a' || id === 'tip2b' ? { a: 'PLAQUE · MODÈLE · PHOTO', b: 'tout doit correspondre à l’appli', k: smooth(S.tip2a.t0 + 0.1, S.tip2a.t0 + 0.4, t) }
                : id === 'tip3' ? { a: `<img src="${VTC_IMG}" style="float:left;height:96px;margin:2px 24px 0 0;border-radius:8px">LA VIGNETTE VTC`, b: 'rouge, en bas du pare-brise côté chauffeur', k: smooth(S.tip3.t0 + 0.1, S.tip3.t0 + 0.4, t) }
                  : id === 'tip4' ? { a: 'UN PRÉNOM NE PROUVE RIEN', b: 'demandez : « Vous êtes là pour qui ? »', k: smooth(S.tip4.t0 + 0.1, S.tip4.t0 + 0.4, t) } : null,
        capHtml: opts.cover ? '<span class="w1">Le chauffeur connaît votre </span><span class="r1">prénom</span><span class="w1">…</span><br><span class="w1">vous </span><span class="r1">montez ?</span>'
          : id === 'hook' ? Ln[0].units.map((u) => { const on = t >= u.t0 - 0.12; return `<span class="${u.red ? (on ? 'r1' : 'r0') : (on ? 'w1' : 'w0')}">${u.shown}</span>${u.shown.endsWith('…') ? '<br>' : ' '}`; }).join('') : null,
        peep: 0, black: 0 });
      if (id === 'end') G.uFade.value = 1;
      endEl.style.opacity = String(endK);
      const mk = id === 'tip3' ? smooth(T_MARK, T_MARK + 0.25, t) : 0; mark.style.opacity = String(mk);
      if (mk > 0) { const c = toW(grey, STK.x, STK.y, STK.z), p = c.clone().project(cam), q = c.clone().add(V(0, 0.055, 0)).project(cam), r = Math.abs(q.y - p.y) * 960;
        mark.style.width = mark.style.height = `${2 * r}px`; mark.style.transform = `translate(${(p.x + 1) * 540 - r}px, ${(1 - p.y) * 960 - r}px)`; }
      tag.update(t, S.end.t0 + 0.6, endK);
      R.bloom.threshold = Math.min(0.85, 0.95 / R.renderer.toneMappingExposure);
      if (DBG) dbgShot(id, t);
      R.composer.render();
      if (DBG && q.get('mirball') && black.mirror) { const rt = black.mirror.getRenderTarget(), w = rt.width, h = rt.height, buf = new Uint16Array(w * h * 4); R.renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
        let red = 0, sum = 0; const f = THREE.DataUtils.fromHalfFloat; for (let i = 0; i < w * h; i++) { const r = f(buf[4 * i]), g = f(buf[4 * i + 1]); sum += r + g + f(buf[4 * i + 2]); if (r > 0.3 && g < 0.1) red++; }
        { const rt2 = new THREE.WebGLRenderTarget(384, 96, { type: THREE.HalfFloatType }), b2 = new Uint16Array(384 * 96 * 4), f2 = THREE.DataUtils.fromHalfFloat;
          const prevT = R.renderer.getRenderTarget(); black.mirror.visible = false; R.renderer.setRenderTarget(rt2); R.renderer.clear(); R.renderer.render(scene, black.mirror.camera); R.renderer.setRenderTarget(prevT); black.mirror.visible = true;
          R.renderer.readRenderTargetPixels(rt2, 0, 0, 384, 96, b2); let r2 = 0; for (let i = 0; i < 384 * 96; i++) if (f2(b2[4 * i]) > 0.3 && f2(b2[4 * i + 1]) < 0.1) r2++;
          const pc = black.mirror.camera.clone(); pc.projectionMatrix.copy(cam.projectionMatrix); pc.projectionMatrixInverse.copy(cam.projectionMatrixInverse); R.renderer.setRenderTarget(rt2); R.renderer.clear(); R.renderer.render(scene, pc); R.renderer.setRenderTarget(prevT);
          R.renderer.readRenderTargetPixels(rt2, 0, 0, 384, 96, b2); let r3 = 0; for (let i = 0; i < 384 * 96; i++) if (f2(b2[4 * i]) > 0.3 && f2(b2[4 * i + 1]) < 0.1) r3++;
          console.log(`MIRROR TEST vcam oblique red ${r2} plain-projection red ${r3}`); }
        const vc = black.mirror.camera, pb = globalThis.MB.position.clone().project(vc), pm = black.mirror.getWorldPosition(V(0, 0, 0)).project(vc);
        console.log(`MIRROR RT ${w}x${h} red px ${red} mean ${(sum / (3 * w * h)).toFixed(4)} | vcam (${vc.position.x.toFixed(2)}, ${vc.position.y.toFixed(2)}, ${vc.position.z.toFixed(2)}) ball ndc (${pb.x.toFixed(2)}, ${pb.y.toFixed(2)}, ${pb.z.toFixed(3)}) mirror ndc (${pm.x.toFixed(2)}, ${pm.y.toFixed(2)}, ${pm.z.toFixed(3)}) cam (${cam.position.x.toFixed(2)}, ${cam.position.y.toFixed(2)}, ${cam.position.z.toFixed(2)})`); }
    },
  };
}
