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
import { makeCar24, CAR } from '../engine/car24.js';
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
const I_D = V(3.62, K, 3.62);                                     // by the rear door

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
  const T_LEAVE = S.r3.t0 + 0.6, T_ARR2 = S.r4a.t0 - 0.2, T_STOP2 = S.r4a.t0 + 2.2;

  // ---------- cars ----------
  const black = makeCar24({ paint: '#0b0c0f', metal: 0.55, plate: 'HV-917-RB', vtc: false, mirrorReflect: true }); scene.add(black.group);
  black.mirror.layers.set(2); cam.layers.enable(2);                // the car's mirror: out of the ground reflection's view (no nested reflections)
  const grey = makeCar24({ paint: '#6a6f75', metal: 0.75, plate: 'GK-482-TL', vtc: true, mirrorReflect: false }); scene.add(grey.group);
  const place = (car, x, z, yaw = YAW) => { car.group.position.set(x, 0, z); car.group.rotation.set(0, yaw, 0); car.group.updateMatrixWorld(true); };
  const toW = (car, x, y, z) => car.group.localToWorld(V(x, y, z));
  // headlights as real spots (only for the car that is on screen)
  const headSpot = (car) => { const s = new THREE.SpotLight('#eef2ff', 0, 40, 0.45, 0.5, 2); s.position.set(0, 0.72, 2.2); const tg = new THREE.Object3D(); tg.position.set(0, 0.3, 12); car.group.add(s, tg); s.target = tg; return s; };
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
      ctx.font = '500 30px Inter, Arial, sans-serif'; ctx.fillText('samedi 1 novembre', w / 2, 150);
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

  // ---------- the end card ----------
  const endEl = document.getElementById('end');
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
  // her phone held at the chest, standing (stand()'s arm spec: sh = the shoulder)
  const phoneStand = (lift = 0) => (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.3 + lift).addScaledVector(left, 0.12),
    pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.45).addScaledVector(fwd, -0.15), F: up.clone().addScaledVector(fwd, 0.25).addScaledVector(left, 0.25).normalize(), N: up.clone().multiplyScalar(0.4).addScaledVector(fwd, -1).normalize(), curl: 0.08, pk: -0.2 });
  const armDown = (s) => (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(up, -0.56).addScaledVector(left, s * 0.1).addScaledVector(fwd, 0.04),
    pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.5).addScaledVector(left, s * 0.25), F: V(0, -1, 0).addScaledVector(fwd, 0.1).normalize(), N: left.clone().multiplyScalar(-s), curl: 0.3 });
  // her phone in her lap, seated (sit()'s hand spec: P = the hips)
  const phoneLap = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.3).addScaledVector(up, 0.24).addScaledVector(left, -0.04),
    pole: P.clone().addScaledVector(up, 0.2).addScaledVector(left, -0.6).addScaledVector(fwd, -0.2), F: up.clone().addScaledVector(fwd, 0.6).normalize(), N: up.clone().multiplyScalar(0.8).addScaledVector(fwd, -0.6).normalize() });
  const lapL = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.26).addScaledVector(up, 0.13).addScaledVector(left, 0.1),
    pole: P.clone().addScaledVector(up, 0.25).addScaledVector(left, 0.6).addScaledVector(fwd, -0.3), F: fwd.clone().addScaledVector(left, -0.4).normalize(), N: V(0, -1, 0) });
  // drivers: hands on the wheel at a quarter to three
  const wheelHand = (car, sd) => (P, fwd, left, up) => { const g = sd > 0 ? car.grips.wheelL() : car.grips.wheelR();
    return { hand: g, pole: P.clone().addScaledVector(up, 0.3).addScaledVector(left, sd * 0.7).addScaledVector(fwd, -0.2), F: up.clone().addScaledVector(fwd, 0.4).normalize(), N: left.clone().multiplyScalar(-sd).addScaledVector(fwd, -0.4).normalize() }; };
  const seatPose = (av, car, seat, o = {}) => { const h = car.group.localToWorld(car.seats[seat].clone());
    sit(av, { pos: V(h.x, h.y, h.z), yaw: car.group.rotation.y, legs: 'chair', floor: toW(car, 0, 0.31, 0).y, seat: 0.11, curl: 0.55, ...o }); };

  // ---------- camera paths ----------
  const P2 = (s, a, b, ta, tb, fa, fb = fa) => new CamPath([[s.t0, a, ta, fa], [s.t1, b, tb, fb]], { easeIn: false, easeOut: false, arc: true });
  const CAM = {
    s1: P2(S.s1, V(-6.6, 1.75, 15.6), V(-6.2, 1.72, 15.0), V(1.4, 2.2, 1.6), V(1.6, 2.1, 1.8), 50, 47),
    s3: P2(S.s3, V(-4.6, 1.55, 2.85), V(-4.5, 1.54, 2.88), V(5.2, 0.95, 4.9), V(4.6, 0.95, 4.85), 40, 39),
    s5: P2(S.s5, V(4.42, 1.6, 2.78), V(4.38, 1.58, 2.82), V(3.75, 0.92, 4.22), V(3.72, 0.93, 4.2), 46, 44),
    etsi: P2(S.etsi, V(4.38, 1.58, 2.82), V(4.5, 1.62, 2.7), V(3.72, 0.93, 4.2), V(3.6, 0.95, 4.3), 44, 46),
    stat1: P2(S.stat1, V(TX + 9, 1.45, 5.6), V(TX + 8.6, 1.44, 5.6), V(TX - 40, 1.6, 6.6), V(TX - 40, 1.6, 6.6), 40, 38),
    stat2: P2(S.stat2, V(TX - 6, 1.5, 4.4), V(TX - 6.6, 1.5, 4.4), V(TX - 80, 1.5, 6.4), V(TX - 80, 1.5, 6.4), 36, 34),
    r1: P2(S.r1, V(0.05, 1.5, 4.75), V(0.1, 1.5, 4.72), V(2.7, 1.55, 3.72), V(2.7, 1.55, 3.72), 38, 35),
    tip1: P2(S.tip1, V(-3.4, 1.6, 2.1), V(-3.2, 1.58, 2.15), V(3.0, 1.0, 4.6), V(3.0, 1.0, 4.6), 44, 42),
    tip2b: P2(S.tip2b, V(-1.75, 0.72, 4.9), V(-1.68, 0.71, 4.92), V(0.53, 0.42, 5.165), V(0.53, 0.42, 5.165), 30, 28),
    tip3: P2(S.tip3, V(1.25, 1.42, 6.75), V(1.28, 1.41, 6.7), V(2.3, 1.03, 5.78), V(2.3, 1.03, 5.78), 34, 32),
    r2: P2(S.r2, V(-1.6, 1.42, 1.75), V(-1.5, 1.41, 1.8), V(2.9, 1.05, 3.6), V(2.9, 1.05, 3.6), 44, 42),
    r3: P2(S.r3, V(3.75, 1.66, 1.55), V(3.7, 1.65, 1.6), V(1.2, 1.1, 5.2), V(-1.0, 1.1, 5.2), 44, 44),
    tip4: P2(S.tip4, V(1.42, 1.34, 3.42), V(1.46, 1.335, 3.45), V(2.74, 1.42, 3.98), V(2.74, 1.42, 3.98), 34, 31),
    r4a: P2(S.r4a, V(-2.2, 1.2, 3.05), V(-2.15, 1.19, 3.08), V(6.0, 0.85, 4.95), V(5.6, 0.85, 4.9), 42, 41),
    r4b: P2(S.r4b, V(1.62, 1.42, 6.72), V(1.65, 1.41, 6.68), V(2.71, 1.05, 5.78), V(2.71, 1.05, 5.78), 32, 30),
    end: P2(S.end, V(1.05, 1.55, 1.75), V(1.0, 1.54, 1.78), V(1.6, 1.0, 5.2), V(1.6, 1.0, 5.2), 46),
  };
  // cameras that ride a car (local keys, eased by the shot's k)
  const carCam = (car, k, a, b, ta, tb, fa, fb = fa) => { const e = smooth(0, 1, k);
    cam.position.copy(toW(car, lerp(a.x, b.x, e), lerp(a.y, b.y, e), lerp(a.z, b.z, e))); cam.up.set(0, 1, 0);
    cam.lookAt(toW(car, lerp(ta.x, tb.x, e), lerp(ta.y, tb.y, e), lerp(ta.z, tb.z, e))); cam.fov = lerp(fa, fb, e); cam.updateProjectionMatrix(); };
  // a camera that rides the phone (screen close-ups)
  const phoneCam = (dist, fov = 40) => { const eye = wp(ines.bones.Head).add(V(0, 0.05, 0)), upv = V(0, 1, 0).applyQuaternion(phone.quaternion);
    cam.position.copy(phone.position).addScaledVector(eye.sub(phone.position).normalize(), dist); cam.up.copy(upv); cam.lookAt(phone.position.clone().addScaledVector(upv, -0.012)); cam.up.set(0, 1, 0); cam.fov = fov; cam.updateProjectionMatrix(); };

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
        black.setLights({ head: 1, tail: 1, brake: id === 's3' ? smooth(T_STOP - 1.6, T_STOP - 1.2, tt) * (1 - smooth(T_STOP + 0.3, T_STOP + 0.8, tt)) : 0, blink: id === 's3' && Math.floor(tt * 2.6) % 2 === 0 ? 1 : 0, dash: 1 });
        bHead.intensity = moving || id === 'hook' ? 9 : 5;
        const win = id === 'hook' ? 1 : id === 's3' ? smooth(T_WIN, T_WIN + 1.0, tt) : atKerb ? 1 : id === 'r3' ? 1 - smooth(T_LEAVE - 0.5, T_LEAVE + 0.2, tt) : 0;
        black.setWindow('RF', win);
        if (id === 's5' || id === 'etsi') black.setDoor(0.62 * smooth(T_DOOR + 0.15, T_DOOR + 0.9, tt) + 0.5 * smooth(S.etsi.t0 + 0.3, S.etsi.t1, tt));
        if (['e1', 'e2', 'e3', 'e4', 'e5'].includes(id)) black.setLocks(id === 'e1' ? smooth(T_LOCK, T_LOCK + 0.06, tt) : 1);
      }
      // --- the grey car: arriving, at the kerb, driving her home
      let gx = CX + 0.4, gz = CZ, gdist = 0;
      if (id === 'r4a') { const a = arrive(tt, T_ARR2, T_STOP2, 15, CX + 0.4); gx = a.x; gdist = 15 - gx; }
      if (['r5', 'tw1', 'tw2', 'tw3'].includes(id)) { const start = { r5: [CX + 0.4, S.r5.t0 + 0.9], tw1: [10, S.tw1.t0 - 2], tw2: [4, S.tw2.t0 - 2], tw3: [0, S.tw3.t0 - 2] }[id]; gx = depart(tt, start[1], start[0], 1.2, 6); gdist = start[0] - gx; if (id !== 'r5') gz = CZ + 1.3; }
      const greyOn = ['r4a', 'r4b', 'r5', 'tw1', 'tw2', 'tw3'].includes(id);
      if (greyOn) { grey.group.visible = true; place(grey, gx, gz); grey.spin(gdist); grey.setLights({ head: 1, tail: 1, brake: id === 'r4a' ? smooth(T_STOP2 - 1.4, T_STOP2 - 1.0, tt) : 0, dash: 1 }); gHead.intensity = id === 'r4a' ? 9 : 4; }

      // --- the fake driver
      if (blackOn && !['stat1', 'stat2'].includes(id)) {
        const face = toW(black, -0.55, 1.18, -0.05);                     // toward the passenger window
        const lean = id === 'hook' || id === 's4' || id === 'tip4';
        show(fake, () => seatPose(fake, black, 'driver', lean
          ? { lean: 0.32, twist: -0.42, look: id === 'tip4' || id === 's4' ? wp(ines.bones.Head) : toW(black, -1.6, 1.42, -0.02), lookK: 1, handL: wheelHand(black, 1), handR: (P, fwd, left, up) => ({ hand: toW(black, 0.02, 0.62, -0.05), pole: P.clone().addScaledVector(left, -0.6).addScaledVector(up, 0.2), F: fwd.clone(), N: V(0, -1, 0) }) }
          : { look: id === 'e5' ? toW(black, 0, 1.315, -0.13) : id === 's3' && tt > T_STOP - 0.8 ? toW(black, -1.6, 1.45, 0.1) : toW(black, 0.3, 1.1, 6), lookK: 0.9, handL: wheelHand(black, 1), handR: wheelHand(black, -1) }));
        if (lean) morph(fake, { mouthsmile: id === 'hook' ? 0.35 : 0.25 });
      }
      // --- the real driver
      if (greyOn) show(real, () => seatPose(real, grey, 'driver', { look: toW(grey, 0.3, 1.1, 6), lookK: 0.9, handL: wheelHand(grey, 1), handR: wheelHand(grey, -1) }));
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
        const bend = id === 'r1' ? 0.08 : 0.62, pos = I_P.clone().add(V(0.05, 0, 0.12));
        show(ines, () => stand(ines, { pos, yaw: 0.05, hipBend: bend, lean: id === 'r1' ? 0.0 : 0.18, breath: t * 0.4, look: wp(fake.bones.Head), lookK: 1.0, armR: armDown(-1), armL: armDown(1) }));
        if (id === 'tip4') { const sp = Math.max(0, Math.sin((tt - Lw(20, 'Vous')) * 13)) * smooth(Lw(20, 'Vous') - 0.05, Lw(20, 'Vous'), tt) * (1 - smooth(Ln[20].t1, Ln[20].t1 + 0.1, tt)); morph(ines, { jawopen: 0.28 * sp, mouthfunnel: 0.15 * sp }); }
      }
      if (id === 's5' || id === 'etsi') {
        // her right hand on the rear door's handle; it comes with the door
        const pos = I_D.clone(); const hTgt = () => black.grips.handleRR().add(V(0, -0.012, -0.03));
        show(ines, () => { const pose = (arm) => stand(ines, { pos, yaw: 0.35, hipBend: 0.12, breath: t * 0.4, look: hTgt(), lookK: 0.6, armR: arm, armL: armDown(1) });
          const spec = (sh, fwd, left, up) => ({ hand: hTgt(), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.6).addScaledVector(fwd, -0.2), F: left.clone().multiplyScalar(-1).addScaledVector(V(0, -1, 0), 0.3).normalize(), N: V(0, 0, -1), curl: 0.55 });
          const reach = smooth(S.s5.t0 + 0.1, T_DOOR - 0.1, tt);
          if (reach < 0.999) pose((sh, fwd, left, up) => { const a = armDown(-1)(sh, fwd, left, up), b = spec(sh, fwd, left, up); return { ...b, hand: a.hand.clone().lerp(b.hand, reach), F: a.F.clone().lerp(b.F, reach).normalize() }; });
          else pressPose(ines, 'Right', hTgt(), pose, spec, () => wp(ines.bones.RightHandMiddle1).lerp(wp(ines.bones.RightHandMiddle2), 0.5)); });
      }
      if (IN_BLACK || IN_GREY) {
        const car = IN_BLACK ? black : grey;
        const lookAt2 = id === 'e3' ? toW(car, 0.1, 1.1, 4) : id === 'e5' ? toW(car, 0, 1.315, -0.13) : id === 'e4' ? car.grips.handleInRR() : id === 'tw1' ? toW(car, -3, 1.2, -1.5) : phone.position.clone();
        const phoneIn = ['e2', 'r5', 'tw2', 'tw3'].includes(id);
        if (id !== 'e5') show(ines, () => {
          const base = { look: lookAt2, lookK: 0.9, handL: lapL, curlL: 0.35 };
          if (id === 'e4') {
            const pose = (arm) => seatPose(ines, car, 'rearR', { ...base, handR: (P, fwd, left, up) => arm(wp(ines.bones.RightArm), fwd, left, up) });
            const spec = (sh, fwd, left, up) => ({ hand: car.grips.handleInRR(), pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(left, -0.5).addScaledVector(fwd, -0.3), F: fwd.clone(), N: left.clone().multiplyScalar(-1), curl: 0.6 });
            pressPose(ines, 'Right', car.grips.handleInRR().add(V(0, 0, 0)), pose, spec, () => wp(ines.bones.RightHandMiddle2));
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
      if (['s1', 'tip1', 'r2'].includes(id)) {
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
        const e = smooth(0, 1, id === 'hook' ? k : 0.4 + 0.6 * k); cam.position.set(lerp(2.74, 2.76, e), lerp(1.42, 1.41, e), lerp(3.9, 3.98, e)); cam.lookAt(V(2.98, 1.13, 5.2)); cam.fov = lerp(46, 43, e); cam.updateProjectionMatrix();
      }
      if (id === 's2' || id === 'tip2a') phoneCam(0.2, 44);
      if (id === 'e1') carCam(black, k, V(-0.52, 1.1, -0.56), V(-0.53, 1.095, -0.58), V(-0.79, 0.975, -0.9), V(-0.79, 0.975, -0.9), 46, 42);
      if (id === 'e2' || id === 'r5' || id === 'tw2' || id === 'tw3') phoneCam(id === 'tw3' ? 0.15 : 0.18, 44);
      if (id === 'e3') carCam(black, k, V(-0.12, 1.16, -1.18), V(-0.1, 1.155, -1.15), V(0.05, 1.05, 4), V(0.08, 1.05, 4), 56, 54);
      if (id === 'e4') carCam(black, k, V(-0.38, 0.98, -0.68), V(-0.385, 0.975, -0.66), V(-0.78, 0.82, -0.42), V(-0.78, 0.82, -0.42), 46, 42);
      if (id === 'e5') carCam(black, k, V(-0.4, 1.17, -1.22), V(-0.39, 1.17, -1.2), V(0, 1.315, -0.13), V(0, 1.315, -0.13), 26, 22);
      if (id === 'tw1') carCam(grey, k, V(-0.06, 1.16, -0.6), V(-0.07, 1.16, -0.62), V(-0.44, 1.18, -1.12), V(-0.44, 1.18, -1.12), 40, 36);
      cam.near = IN_BLACK || IN_GREY || id === 's4' || id === 'tip4' || phone.visible ? 0.012 : 0.05; cam.far = 900; cam.updateProjectionMatrix();
      // the rear-view mirror turned so that her eyes meet his (e5)
      if (blackOn) { const M = toW(black, 0, 1.315, -0.13), eI = toW(black, -0.4, 1.17, -1.22), eD = wp(fake.bones.Head).add(V(0, 0.06, 0));
        const n = eI.clone().sub(M).normalize().add(eD.clone().sub(M).normalize()).normalize(); black.mirror.parent.lookAt(M.clone().sub(n)); }
      // looks
      if (etsi && !['etsi'].includes(id)) { G.uSat.value = 0.4; G.uTint.value.set(1.05, 0.96, 0.94); }
      if (['stat1', 'stat2'].includes(id)) { tunnelFill.intensity = 6; tunnelFill.position.copy(cam.position).add(V(-3, 2, 1)); R.renderer.toneMappingExposure = 0.95; }
      if (IN_BLACK || IN_GREY) { R.renderer.toneMappingExposure = id === 'e3' ? 1.6 : 1.35; fill.intensity = id === 'e5' ? 0.05 : 0.22; fill.position.copy(cam.position).add(V(0, 0.18, 0)); }
      if (id === 's4' || id === 'tip4' || id === 'hook') { cabin.intensity = 0.7; cabin.position.copy(toW(black, -0.1, 1.05, 0.15)); fill.intensity = 0.35; fill.position.copy(cam.position).add(V(0.2, 0.25, 0)); }
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
                : id === 'tip3' ? { a: 'LA VIGNETTE VTC', b: 'rouge, en bas du pare-brise côté chauffeur', k: smooth(S.tip3.t0 + 0.1, S.tip3.t0 + 0.4, t) }
                  : id === 'tip4' ? { a: 'UN PRÉNOM NE PROUVE RIEN', b: 'demandez : « Vous êtes là pour qui ? »', k: smooth(S.tip4.t0 + 0.1, S.tip4.t0 + 0.4, t) } : null,
        notif: id === 'tw3' ? { from: 'Traceur inconnu détecté', when: 'maintenant', msg: 'Il se déplace avec vous depuis 1 h 07.', k: smooth(S.tw3.t0 + 0.05, S.tw3.t0 + 0.35, t) } : null,
        capHtml: opts.cover ? '<span class="w1">Le chauffeur connaît votre </span><span class="r1">prénom</span><span class="w1">…</span><br><span class="w1">vous </span><span class="r1">montez ?</span>'
          : id === 'hook' ? Ln[0].units.map((u) => { const on = t >= u.t0 - 0.12; return `<span class="${u.red ? (on ? 'r1' : 'r0') : (on ? 'w1' : 'w0')}">${u.shown}</span>${u.shown.endsWith('…') ? '<br>' : ' '}`; }).join('') : null,
        peep: 0, black: 0 });
      if (id === 'end') G.uFade.value = 1;
      endEl.style.opacity = String(endK);
      tag.update(t, S.end.t0 + 0.6, endK);
      R.bloom.threshold = Math.min(0.85, 0.95 / R.renderer.toneMappingExposure);
      R.composer.render();
    },
  };
}
