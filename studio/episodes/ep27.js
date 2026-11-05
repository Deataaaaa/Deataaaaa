// « 12 % » Saison 2 · Partie 4 · Le dernier bus (~90 s), the season 2 finale. 3:12 am, boulevard de Clichy: Inès, 3 %, waits alone at
// a lit night-bus shelter. A man in an orange high-vis vest walks up: « Ligne déviée. L'arrêt provisoire est derrière. Suivez-moi. » He knows
// the line, he has the vest, he smiles. « ET SI… » she follows him: a street without light, steps right behind hers, he takes the vest
// off: it is him (the season's man); her screen dies. 2024: 3 374 victims of sexual violence in public transport, 91 % women, nearly
// half in Île-de-France (notes/facts.md). Rewind: she does not move; a diversion is posted at the stop and in the app, check it
// yourself; never leave a lit stop to follow someone; « Je préfère attendre ici. »; the bus comes, she sits right by the driver; an SMS
// to the 31177; after 22 h, ask the driver to let you off between two stops. In the driver's mirror, at the back of the bus… he is
// there. The driver lets her off at her door and keeps the rear doors shut; the police wait at the next stop; in his pocket a phone,
// on its map a dot: Inès. 3:40, the bolt, 0 %.
// Three sets: the boulevard (the shelter, the bus outside and inside), her street (the dark street of the ET SI, the drop-off, the
// police), her room (the bolt). Every cut sits on the narration (audio/vo/ep27_*.json); every pose is rebuilt from rest each frame.
import * as THREE from 'three';
import { createRenderer, rng, smooth, clamp } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { fadeShadowBorders } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, walk, sit, POSE } from '../engine/poses.js';
import { makeCat } from '../engine/cat.js';
import { makePhone } from '../engine/props16.js';
import { makeEndTag } from '../engine/endtag.js';
import { renderShot } from '../engine/ads19.js';
import { Overlay12 } from '../engine/s12.js';
import { buildPigalle, PG } from '../engine/pigalle24.js';
import { buildWorld12 } from '../engine/world12.js';
import { ROOM } from '../engine/room12.js';
import { STREET } from '../engine/paris12.js';
import { makePoliceCar } from '../engine/police12.js';
import { makeBus, makeShelter, makeVest, BUS } from '../engine/bus27.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(new THREE.Vector3());
const lerp = (a, b, k) => a + (b - a) * k;

export async function create() {
  const q = new URLSearchParams(location.search);
  const DBG = q.get('dbg') === '1';
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = 0;
  POSE.lookFirst = true;
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer(); R.renderer.localClippingEnabled = true;
  const VO = await (await fetch(`/audio/vo/ep27_${q.get('voice') || 'developpeuse'}.json`)).json();
  const ov = new Overlay12(VO, { etsiSub: 'ELLE LE SUIT' });
  const PGW = buildPigalle(R.renderer, { ssaa: globalThis.SSAA });
  const WD = buildWorld12(R.renderer, { trucks: false, cars: false });
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.03, 900); cam.layers.enable(1); cam.layers.enable(2);
  R.renderPass.camera = cam;
  R.bloom.strength = 0.4; R.bloom.radius = 0.55;
  const G = R.grade.uniforms;

  // ---------- the timeline, read from the narration ----------
  const Ln = VO.lines, L = (i) => Ln[i].t0;
  const Lw = (i, w, n = 1) => { const us = Ln[i].units.filter((x) => x.shown.toLowerCase().replace(/[«»"…]/g, '').startsWith(w.toLowerCase())); const u = us[n - 1]; return u ? u.t0 : Ln[i].t0; };
  const END0 = Ln[Ln.length - 1].t0 - 0.25, DUR = Math.ceil((VO.duration + 4.4) * 10) / 10;
  const cut = (x) => x - 0.08;
  const SH = [
    ['hook', 0], ['s1', cut(L(1))], ['s2', cut(L(2))], ['s3', cut(L(3))], ['etsi', cut(L(4))], ['e1', cut(L(5))], ['e2', cut(L(6))], ['e3', cut(L(7))],
    ['stat1', cut(L(8))], ['stat2', cut(L(9))], ['rewind', cut(L(10))], ['r1', cut(L(11))], ['tip1', cut(L(12))], ['tip2', cut(L(13))], ['tip3', cut(L(14))],
    ['tip4a', cut(L(15))], ['tip4b', cut(Lw(15, 'Elle'))], ['tip5', cut(L(16))], ['tip6', cut(L(17))], ['tw1', cut(L(18))], ['tw2', cut(L(19))], ['tw3', cut(L(20))],
    ['tw4a', cut(L(21))], ['tw4b', cut(Lw(21, 'Dans'))], ['fin1', cut(L(22))], ['fin2', cut(Lw(22, 'Zéro'))], ['end', END0],
  ].map(([id, t0], i, a) => ({ id, t0, t1: a[i + 1] ? a[i + 1][1] : DUR }));
  const S = Object.fromEntries(SH.map((s) => [s.id, s]));
  const shotAt = (t) => { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; };
  const ETSI = (t) => t >= S.etsi.t0 && t < S.r1.t0;
  console.log('SHOTS ' + SH.map((x) => `${x.id}:${x.t0.toFixed(2)}`).join(' ') + ' DUR ' + DUR);
  const IN_BUS = ['tip4b', 'tip5', 'tip6', 'tw1', 'tw2'];
  const SET = (id) => ['e1', 'e2', 'e3', 'stat1', 'tw3', 'tw4a', 'tw4b', 'fin1', 'fin2'].includes(id) ? 'home' : 'pg';
  const SCN = { pg: PGW.scene, home: WD.scene };

  // ---------- the shelter on the boulevard, the bus ----------
  const STOP_X = 14, SZ = PG.ZK - 1.05;
  const shelter = makeShelter({ wait: '4 min' }); shelter.position.set(STOP_X, PG.KERB, SZ); PGW.scene.add(shelter); shelter.updateMatrixWorld(true);
  const POLE = shelter.localToWorld(shelter.userData.pole.clone());
  const bus = makeBus(); bus.mirror.layers.set(2);
  const LANE = PG.ZK + BUS.W / 2 + 0.35, SLANE = STREET.PAVE + BUS.W / 2 + 0.35;
  const T_STOP = S.tip4a.t0 + 2.4;                                    // the bus stops at the shelter
  const BX_STOP = POLE.x + 4.6;                                       // its front door (local z 5.1) just past the pole
  const busPG = (t) => {                                              // its x on the boulevard: decelerating to the stop, waiting, then away
    if (t < T_STOP) { const u = clamp((T_STOP - t) / 3.0); return BX_STOP + 22 * u * u; }
    const T_GO = S.tip4b.t0 + 0.2; if (t < T_GO) return BX_STOP;
    const d = t - T_GO; return BX_STOP - (d < 2 ? 1.5 * d * d : 6 + 6 * (d - 2));
  };
  const police = makePoliceCar(rng(7)); WD.scene.add(police.group);
  const beacon = new THREE.PointLight('#3a6cff', 0, 14, 2); WD.scene.add(beacon);

  // ---------- people ----------
  const env = PGW.scene.environment;
  const ines = await loadAvatar('Female_Adult_11', { env, facial: true });
  const man = await loadAvatar('Business_Male_06', { env }); man.root.scale.multiplyScalar(0.96);
  const driver = await loadAvatar('Business_Male_05', { env });
  const cop1 = await loadAvatar('Police_Male_01', { env }), cop2 = await loadAvatar('Police_Male_02', { env });
  const everyone = [ines, man, driver, cop1, cop2];
  const morph = (av, map) => { for (const m of av.meshes) { const d = m.morphTargetDictionary; if (!d) continue; m.morphTargetInfluences.fill(0);
    for (const [k, v] of Object.entries(map)) for (const [nm, i] of Object.entries(d)) if (nm.toLowerCase().includes(k.toLowerCase())) m.morphTargetInfluences[i] = v; } };

  // ---------- props ----------
  const phone = makePhone(), phone2 = makePhone();
  const pcv = phone.tex.image, pc = pcv.getContext('2d'), p2v = phone2.tex.image, p2 = p2v.getContext('2d');
  const apple = makeCat();
  // the vest he drops in the dark street: a crumpled orange heap with a silver band
  const heap = new THREE.Group();
  { const gg = new THREE.SphereGeometry(0.22, 24, 12), P = gg.attributes.position, r = rng(4);
    for (let i = 0; i < P.count; i++) { const y = P.getY(i); const n = 1 + 0.25 * Math.sin(P.getX(i) * 31 + P.getZ(i) * 17) + 0.12 * (r() - 0.5); P.setXYZ(i, P.getX(i) * n * 1.25, Math.max(0, y) * 0.35 * n + 0.004, P.getZ(i) * n); }
    gg.computeVertexNormals();
    const m = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ color: '#ff6a00', roughness: 0.75, emissive: '#ff6a00', emissiveIntensity: 0.05 })); m.castShadow = m.receiveShadow = true; heap.add(m);
    const b = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 30, 3.6), new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.35, metalness: 0.5, emissive: '#9aa0a6', emissiveIntensity: 0.25 }));
    b.rotation.set(-Math.PI / 2 + 0.25, 0, 0.6); b.position.y = 0.05; heap.add(b); }
  const PROPS = [phone, phone2, apple.root, heap, bus.group];
  const putIn = (obj, set) => { if (obj.parent !== SCN[set]) SCN[set].add(obj); };

  // Apple on her lock screen, drawn once in a studio
  const studio = () => { const s = new THREE.Scene(); const pm = new THREE.PMREMGenerator(R.renderer); s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.6;
    const k = new THREE.DirectionalLight('#fff4ea', 3); k.position.set(-2, 2.5, 3); const r = new THREE.DirectionalLight('#ffffff', 2.2); r.position.set(2.5, 2, -2.5); s.add(k, r); return s; };
  await Promise.all(TEX_PENDING);
  // the stock officers are not French: Police_Male_02's vest says « S.W.A.T. » on the back and the chest (now POLICE patches),
  // Police_Male_01's sleeves carry the Afghan flag (now the French tricolour) and the Afghan police emblem (painted out)
  { const done = new Set(), edit = (av, re, fn) => av.root.traverse((o) => { for (const mt of [o.material].flat()) {
      const tx = mt && mt.map, img = tx && tx.image; if (!img || done.has(tx) || !re.test(img.src || '')) continue; done.add(tx);
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
      fn(c, img, img.width / 2048); tx.image = cv; tx.needsUpdate = true; } });
    edit(cop2, /m158_body_color/, (c, img, u) => {
      for (const [x0, y0, x1, y1] of [[904, 542, 1135, 623], [822, 883, 969, 942]]) {
        const x = (x0 - 4) * u, y = (y0 - 4) * u, w = (x1 - x0 + 9) * u, h = (y1 - y0 + 9) * u;
        c.fillStyle = '#15161a'; c.fillRect(x, y, w, h);
        c.strokeStyle = '#c9ced6'; c.lineWidth = Math.max(1, 3 * u); c.strokeRect(x + 7 * u, y + 7 * u, w - 14 * u, h - 14 * u);
        let fs = Math.round(h * 0.56); c.font = `bold ${fs}px Arial, Helvetica, sans-serif`;
        while (fs > 4 && c.measureText('POLICE').width > w * 0.8) { fs--; c.font = `bold ${fs}px Arial, Helvetica, sans-serif`; }
        c.fillStyle = '#f1f3f6'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('POLICE', x + w / 2, y + h / 2 + h * 0.03);
      } });
    edit(cop1, /m220_body_color/, (c, img, u) => {
      const q = (v) => Math.round(v * u);
      c.drawImage(img, q(1662), q(1128), q(124), q(120), q(1662), q(1002), q(124), q(120));          // the emblem: plain sleeve from below
      const x = q(236), y = q(1032), w = q(122), h = q(80);
      c.fillStyle = '#20242c'; c.fillRect(x, y, w, h);
      [['#0055a4', 0], ['#f4f4f4', 1], ['#ef4135', 2]].forEach(([col, i]) => { c.fillStyle = col; c.fillRect(x + q(3) + i * (w - q(6)) / 3, y + q(3), (w - q(6)) / 3 + 0.5, h - q(6)); });
    });
  }
  const vest = makeVest(man);
  let appleCv = null;
  { const s = studio(); const cat = makeCat(); s.add(cat.root); cat.update(1.0, { look: V(0, 0.18, 1) }); const pil = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.6), new THREE.MeshStandardMaterial({ color: '#c9b9a2', roughness: 0.9 })); pil.position.y = -0.03; s.add(pil);
    const c2 = new THREE.PerspectiveCamera(30, 0.5, 0.05, 20); c2.position.set(0.05, 0.22, 0.75); c2.lookAt(0, 0.13, 0);
    appleCv = renderShot(R.renderer, s, c2, 360, 720, { exposure: 1.15, bg: '#cdbda4' }); }

  // ---------- the phones' screens ----------
  const statusBar = (ctx, w, clock, pct) => { ctx.fillStyle = '#f2f2f4'; ctx.font = '600 28px Inter, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(clock, 36, 52);
    ctx.textAlign = 'right'; ctx.fillStyle = pct <= 10 ? '#ff453a' : '#f2f2f4'; ctx.fillText(`${pct} %`, w - 92, 52); ctx.strokeStyle = '#f2f2f4'; ctx.lineWidth = 3; ctx.strokeRect(w - 80, 30, 44, 24);
    ctx.fillStyle = pct <= 10 ? '#ff453a' : '#f2f2f4'; ctx.fillRect(w - 77, 33, Math.max(3, 38 * pct / 100), 18); ctx.fillRect(w - 34, 38, 4, 8); };
  let lastScreen = '', lastScreen2 = '';
  const drawScreen = (mode, o = {}) => {
    phone.screen.material.emissiveIntensity = mode === 'off' ? 0 : mode === 'lock' ? 0.8 : 0.5; phone.screen.material.envMapIntensity = mode === 'off' ? 0.15 : 0.35;
    const key = JSON.stringify([mode, o]); if (key === lastScreen) return; lastScreen = key;
    const w = pcv.width, h = pcv.height, ctx = pc; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    if (mode === 'off') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); phone.tex.needsUpdate = true; return; }
    if (mode === 'lock') {
      ctx.fillStyle = '#cdbda4'; ctx.fillRect(0, 0, w, h); ctx.drawImage(appleCv, 0, h * 0.3, w, h); const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      statusBar(ctx, w, '', o.pct ?? 3); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '300 140px Inter, Arial, sans-serif'; ctx.fillText(o.clock || '03:12', w / 2, 430);
      ctx.font = '500 30px Inter, Arial, sans-serif'; ctx.fillText('dimanche 1 novembre', w / 2, 290);
      if (o.low) { ctx.globalAlpha = o.low; ctx.fillStyle = 'rgba(40,40,46,0.94)'; ctx.beginPath(); ctx.roundRect(40, 760, w - 80, 230, 30); ctx.fill(); ctx.fillStyle = '#ff453a'; ctx.font = '700 34px Inter, Arial, sans-serif'; ctx.fillText('Batterie faible', w / 2, 830);
        ctx.fillStyle = '#eee'; ctx.font = '500 28px Inter, Arial, sans-serif'; ctx.fillText(`${o.pct ?? 1} % restant`, w / 2, 880); ctx.fillText('Le téléphone va s’éteindre', w / 2, 930); ctx.globalAlpha = 1; }
      if (o.fadeOut) { ctx.fillStyle = `rgba(0,0,0,${o.fadeOut.toFixed(2)})`; ctx.fillRect(0, 0, w, h); }
      phone.tex.needsUpdate = true; return;
    }
    if (mode === 'app') {
      // the transport app's line page: no diversion, the next bus in 4 min, the stop's position
      ctx.fillStyle = '#f5f5f7'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#1c2a4a'; ctx.fillRect(0, 0, w, 210); statusBar(ctx, w, o.clock || '03:13', o.pct ?? 3);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '700 40px Inter, Arial, sans-serif'; ctx.fillText('Bus de nuit', 36, 150); ctx.font = '500 26px Inter, Arial, sans-serif'; ctx.fillText('Arrêt : Clichy', 36, 190);
      ctx.fillStyle = '#e6f6ea'; ctx.beginPath(); ctx.roundRect(28, 250, w - 56, 130, 22); ctx.fill(); ctx.fillStyle = '#1e8f45'; ctx.font = '700 34px Inter, Arial, sans-serif'; ctx.fillText('Trafic normal', 60, 310);
      ctx.fillStyle = '#333'; ctx.font = '500 26px Inter, Arial, sans-serif'; ctx.fillText('Aucune déviation sur la ligne', 60, 352);
      ctx.fillStyle = '#111'; ctx.font = '700 30px Inter, Arial, sans-serif'; ctx.fillText('Prochains passages', 36, 450);
      [['4 min', 'à l’arrêt'], ['34 min', '']].forEach(([a, b], i) => { const y = 520 + i * 110; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(28, y - 50, w - 56, 90, 18); ctx.fill(); ctx.fillStyle = '#1c2a4a'; ctx.font = '800 40px Inter, Arial, sans-serif'; ctx.fillText(a, 60, y + 10); ctx.fillStyle = '#666'; ctx.font = '500 24px Inter, Arial, sans-serif'; ctx.fillText(b, 240, y + 6); });
      phone.tex.needsUpdate = true; return;
    }
    if (mode === 'sms') {
      ctx.fillStyle = '#0e0f12'; ctx.fillRect(0, 0, w, h); statusBar(ctx, w, o.clock || '03:21', o.pct ?? 2);
      ctx.fillStyle = '#1c1c1f'; ctx.fillRect(0, 70, w, 120); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 36px Inter, Arial, sans-serif'; ctx.fillText('31177', w / 2, 140); ctx.fillStyle = '#8e8e93'; ctx.font = '500 22px Inter, Arial, sans-serif'; ctx.fillText('Alerte transports', w / 2, 175);
      const msg = ['Un homme me suit depuis', 'l’arrêt Clichy. Gilet orange,', 'faux agent. Je suis dans le', 'bus de nuit, à l’avant.'];
      const n = Math.round((o.k ?? 1) * msg.join(' ').length); let left = n; const lines = msg.map((l) => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 1; return s; });
      const bub = lines.filter((x) => x).length; if (bub) { ctx.fillStyle = (o.sent ? '#34c759' : '#2a2a2e'); ctx.beginPath(); ctx.roundRect(70, 620 - bub * 44, w - 100, bub * 44 + 40, 26); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '500 28px Inter, Arial, sans-serif'; lines.forEach((l, i) => { if (l) ctx.fillText(l, 96, 640 - bub * 44 + 24 + i * 44); }); }
      if (o.sent) { ctx.fillStyle = '#8e8e93'; ctx.font = '500 22px Inter, Arial, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('Distribué', w - 34, 700); }
      ctx.fillStyle = '#1c1c1f'; ctx.beginPath(); ctx.roundRect(24, h - 130, w - 48, 80, 40); ctx.fill();
      phone.tex.needsUpdate = true; return;
    }
  };
  // his phone (in the officer's hand): a map with her dot, « Inès »
  const drawMap2 = (pulse) => {
    phone2.screen.material.emissiveIntensity = 0.5; phone2.screen.material.envMapIntensity = 0.3;
    const key = pulse.toFixed(2); if (key === lastScreen2) return; lastScreen2 = key;
    const w = p2v.width, h = p2v.height, ctx = p2; ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#161b26'; ctx.fillRect(0, 0, w, h); const r = rng(11); ctx.strokeStyle = '#252d3d'; ctx.lineWidth = 14;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); const y0 = r() * h; ctx.moveTo(-20, y0); ctx.lineTo(w + 20, y0 + (r() - 0.5) * 300); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { ctx.beginPath(); const x0 = r() * w; ctx.moveTo(x0, -20); ctx.lineTo(x0 + (r() - 0.5) * 300, h + 20); ctx.stroke(); }
    statusBar(ctx, w, '03:39', 41);
    const x = w * 0.52, y = h * 0.46; ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.beginPath(); ctx.arc(x, y, 30 + 12 * pulse, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff3b30'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(20,22,28,0.92)'; ctx.beginPath(); ctx.roundRect(x - 80, y - 92, 160, 56, 18); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 32px Inter, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Inès', x, y - 52);
    phone2.tex.needsUpdate = true;
  };

  // ---------- the phone in a hand, reaches and contact checks (from ep25) ----------
  const tA = V(0, 0, 0), tB = V(0, 0, 0), mB = new THREE.Matrix4(), PHZ = 0.0195;
  const avgJ = (B, side, j) => tB.copy(wp(B[side + 'HandIndex' + j])).add(wp(B[side + 'HandMiddle' + j])).add(wp(B[side + 'HandRing' + j])).multiplyScalar(1 / 3).clone();
  function phoneFit(av, side, ph, zoff = PHZ) {
    const B = av.bones, k1 = avgJ(B, side, 1), k3 = avgJ(B, side, 3), i1 = wp(B[side + 'HandIndex1']), p1 = wp(B[side + 'HandPinky1']);
    const X = k1.clone().sub(k3).normalize();
    const Z = X.clone().cross(tA.copy(i1).sub(p1)).normalize(); if (side === 'Left') Z.negate();
    const Yv = Z.clone().cross(X).normalize();
    mB.makeBasis(side === 'Left' ? X.clone().negate() : X, side === 'Left' ? Yv.clone().negate() : Yv, Z); ph.quaternion.setFromRotationMatrix(mB);
    ph.position.copy(k1).lerp(k3, 0.55).addScaledVector(Z, zoff).addScaledVector(Yv, side === 'Left' ? -0.004 : 0.004); ph.updateMatrixWorld(true);
  }
  const BL = []; { const r = rng(26); for (let b = 1.2; b < 120; b += 3.0 + 2.6 * r()) BL.push(b); }
  const blinkK = (t) => { let k = 0; for (const b0 of BL) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  let curT = 0, eyesShut = 0;
  const show = (av, fn) => { av.root.visible = true; fn(); if (av === ines) av.blink(Math.max(eyesShut, blinkK(curT))); av.root.updateMatrixWorld(true); };
  const pressPose = (av, side, tgt, pose, spec, probe) => {
    pose(spec); const want = tgt.clone().sub(probe().sub(wp(av.bones[side + 'Hand']))), res = [];
    for (let i = 0; i < 4; i++) { pose((sh, fwd, left, up) => ({ ...spec(sh, fwd, left, up), hand: want })); const r = tgt.clone().sub(probe()); res.push((r.length() * 100).toFixed(1)); if (i < 3) want.add(r); }
    if (DBG) console.log(`DBG press ${av.name || ''} ${side} residuals ${res.join(' -> ')} cm`);
    return want;
  };
  const THUMB = -0.15, PK = -0.45;
  const armDown = (s) => (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(up, -0.56).addScaledVector(left, s * 0.1).addScaledVector(fwd, 0.04),
    pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.5).addScaledVector(left, s * 0.25), F: V(0, -1, 0).addScaledVector(fwd, 0.1).normalize(), N: left.clone().multiplyScalar(-s), curl: 0.3 });
  const phoneLap = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.3).addScaledVector(up, 0.24).addScaledVector(left, -0.04),
    pole: P.clone().addScaledVector(up, 0.2).addScaledVector(left, -0.6).addScaledVector(fwd, -0.2), F: up.clone().addScaledVector(fwd, 0.6).normalize(), N: up.clone().multiplyScalar(0.8).addScaledVector(fwd, -0.6).normalize(), curl: 0.08, pk: PK, thumb: THUMB });
  const lapL = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.26).addScaledVector(up, 0.13).addScaledVector(left, 0.1),
    pole: P.clone().addScaledVector(up, 0.25).addScaledVector(left, 0.6).addScaledVector(fwd, -0.3), F: fwd.clone().addScaledVector(left, -0.4).normalize(), N: V(0, -1, 0) });
  const lapR = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.26).addScaledVector(up, 0.13).addScaledVector(left, -0.1),
    pole: P.clone().addScaledVector(up, 0.25).addScaledVector(left, -0.6).addScaledVector(fwd, -0.3), F: fwd.clone().addScaledVector(left, 0.4).normalize(), N: V(0, -1, 0) });
  const skinPts = (av, step, fn) => { const v = V(0, 0, 0); av.root.updateMatrixWorld(true);
    for (const mesh of av.meshes) { if (!mesh.isSkinnedMesh) continue; mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count;
      for (let i = 0; i < n; i += step) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); fn(v, mesh, i); } } };
  const boneOf = (mesh, i) => { const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight; let bi = 0, bw = -1;
    for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; bi = si.getComponent(i, j); } } return mesh.skeleton.bones[bi]; };
  const handSets = new Map();
  const handSet = (av, sd) => { const key = av.root.uuid + sd; if (!handSets.has(key)) { const st = new Set(); av.bones[sd + 'Hand'].traverse((o) => st.add(o)); handSets.set(key, st); } return handSets.get(key); };
  const boxPen = (av, obj, boxes, only = null) => { obj.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), p = V(0, 0, 0); let best = [-1e9, '', ''];
    skinPts(av, 1, (v, mesh, i) => { const b = only ? boneOf(mesh, i) : null; if (only && !only.has(b)) return; p.copy(v).applyMatrix4(inv);
      for (const bx of boxes) { const d = Math.min(bx.h.x - Math.abs(p.x - bx.c.x), bx.h.y - Math.abs(p.y - bx.c.y), bx.h.z - Math.abs(p.z - bx.c.z)); if (d > best[0]) best = [d, bx.nm, (b || boneOf(mesh, i)).name, p.clone().sub(bx.c)]; } });
    return `${(best[0] * 1000).toFixed(1)}mm ${best[1]} ${best[2]}${best[3] && best[0] > 0 ? ' at ' + best[3].toArray().map((x) => (x * 100).toFixed(1)).join(',') + 'cm' : ''}`; };
  // the counter's top and front, the stools' seats, in world space (an Object3D at the origin)
  const ORIGIN = new THREE.Object3D(); ORIGIN.updateMatrixWorld(true);
  // a hand on someone's arm: the hand's skin against the arm's own skin (distance to the shoulder→elbow segment against the arm's radius there)
  const armGrip = (av, sd, other, side) => { const a = wp(other.bones[side + 'Arm']), b = wp(other.bones[side + 'ForeArm']), ab = b.clone().sub(a), L2 = ab.lengthSq(), seg = (v) => { const u = clamp(v.clone().sub(a).dot(ab) / L2); return [u, v.distanceTo(a.clone().addScaledVector(ab, u))]; };
    // per (length bin, angle sector) the arm's outer radius; a hand vertex inside it in the same cell is inside the arm
    const e1 = V(0, 1, 0).cross(ab).normalize(), e2 = ab.clone().normalize().cross(e1), cell = (v, u) => { const w = v.clone().sub(a).addScaledVector(ab, -u); return Math.min(9, Math.floor(u * 10)) * 16 + Math.floor(((Math.atan2(w.dot(e2), w.dot(e1)) + Math.PI) / (2 * Math.PI)) * 16) % 16; };
    const rad = new Float32Array(160); skinPts(other, 1, (v, mesh, i) => { if (boneOf(mesh, i) !== other.bones[side + 'Arm']) return; const [u, d] = seg(v); if (u > 0.05 && u < 0.95) { const c = cell(v, u); rad[c] = Math.max(rad[c], d); } });
    let pen = -1e9, nm = ''; const st = handSet(av, sd); skinPts(av, 1, (v, mesh, i) => { const bn = boneOf(mesh, i); if (!st.has(bn)) return; const [u, d] = seg(v); if (u < 0.1 || u > 0.9) return; const p = rad[cell(v, u)] - d; if (rad[cell(v, u)] > 0 && p > pen) { pen = p; nm = bn.name; } });
    return `${(pen * 1000).toFixed(1)}mm ${nm}`; };
  const phoneBox = [{ c: V(0, 0, 0), h: V(0.0358, 0.0734, 0.0039), nm: 'phone' }, { c: V(0, 0, 0.0055), h: V(0.0336, 0.071, 0.0016), nm: 'screen+1.5mm' }];


  // a phone held up in front of the chest, standing (the screen toward her eyes)
  const phoneStand = (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.3).addScaledVector(left, 0.12), pole: sh.clone().addScaledVector(up, -0.35).addScaledVector(left, -0.5).addScaledVector(fwd, -0.2),
    F: up.clone().addScaledVector(fwd, 0.5).addScaledVector(left, 0.2).normalize(), N: up.clone().multiplyScalar(0.55).addScaledVector(fwd, -1).normalize(), curl: 0.08, pk: PK, thumb: THUMB });
  // hands on the bus's near-flat wheel (ep24's grip with the bus wheel's radius)
  const wheelHand = (sd) => (P, fwd, left, up) => { const Wh = bus.wheel, ph = sd > 0 ? 0.35 : Math.PI - 0.35;
    const u = V(Math.cos(ph), Math.sin(ph), 0).transformDirection(Wh.matrixWorld), a = V(0, 0, 1).transformDirection(Wh.matrixWorld), Rr = Wh.localToWorld(V(0.25 * Math.cos(ph), 0.25 * Math.sin(ph), 0));
    return { hand: Rr.addScaledVector(u, 0.045).addScaledVector(a, -0.078), pole: P.clone().addScaledVector(up, 0.3).addScaledVector(left, sd * 0.7).addScaledVector(fwd, -0.2), F: a, N: u.clone().negate(), curl: 0.7, thumb: -0.4 }; };
  // contact checks against boxes that each ride their own object (the bus's seats, partition)
  const multiPen = (av, boxes) => { let best = [-1e9, '', '']; const p = V(0, 0, 0);
    for (const bx of boxes) { bx.m.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(bx.m.matrixWorld).invert();
      skinPts(av, 2, (v, mesh, i) => { p.copy(v).applyMatrix4(inv); const d = Math.min(bx.h.x - Math.abs(p.x - bx.c.x), bx.h.y - Math.abs(p.y - bx.c.y), bx.h.z - Math.abs(p.z - bx.c.z)); if (d > best[0]) best = [d, bx.nm, boneOf(mesh, i).name, p.clone().sub(bx.c), bx.m.position.clone()]; }); }
    return `${(best[0] * 1000).toFixed(1)}mm ${best[1]} ${best[2]}` + (best[3] ? ' at ' + best[3].toArray().map((x) => (x * 100).toFixed(0)).join(',') + 'cm of seat@' + best[4].toArray().map((x) => x.toFixed(2)).join(',') : ''); };

  // ---------- the end card: the season ends ----------
  const endEl = document.getElementById('end');
  const sign = document.createElement('div');
  sign.style.cssText = 'position:absolute;left:50%;top:620px;transform:translateX(-50%);background:#22397a;border:8px solid #2e6b4a;outline:5px solid #e8e6df;border-radius:16px;padding:28px 56px;text-align:center;min-width:640px;font-family:Inter,sans-serif;color:#fff';
  sign.innerHTML = `<div style="display:inline-block;background:#ff2e2e;font-weight:800;font-size:30px;padding:6px 14px;border-radius:8px;letter-spacing:.06em">12 %</div>
    <div style="font-weight:800;font-size:42px;margin-top:16px;letter-spacing:.03em">FIN DE LA</div><div style="font-weight:800;font-size:76px;line-height:1;margin-top:6px">SAISON 2</div>`;
  const ask = document.createElement('div');
  ask.style.cssText = 'position:absolute;left:0;right:0;top:250px;text-align:center;font:800 64px/1.08 Inter,sans-serif;color:#fff;text-transform:uppercase;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  ask.innerHTML = 'Un <span style="color:#ff2e2e">agent</span><br>vous dit de le suivre…<br>vous le <span style="color:#ff2e2e">suivez</span> ?';
  const reply = document.createElement('div');
  reply.style.cssText = 'position:absolute;left:0;right:0;top:500px;text-align:center;font:700 42px/1.2 Inter,sans-serif;color:rgba(255,255,255,.92);text-shadow:0 0 3px #000,0 3px 0 rgba(0,0,0,.6)';
  reply.innerHTML = 'Réponds <span style="color:#ff2e2e;font-weight:800">OUI</span> ou <span style="color:#ff2e2e;font-weight:800">NON</span> en commentaire';
  const follow = document.createElement('div');
  follow.style.cssText = 'position:absolute;left:0;right:0;top:920px;text-align:center;font:800 52px/1.15 Inter,sans-serif;color:#fff;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  follow.innerHTML = '<span style="color:#ff2e2e">ABONNE-TOI</span><br><span style="font-weight:700;font-size:44px">une nouvelle série arrive</span>';
  const fine = document.createElement('div');
  fine.style.cssText = 'position:absolute;left:60px;right:60px;top:1075px;text-align:center;font:500 27px Inter,sans-serif;color:rgba(255,255,255,.8);line-height:1.42';
  fine.innerHTML = 'Fiction. Chiffres : Observatoire national des violences faites aux femmes (SSMSI, 2024). Conseils : Île-de-France Mobilités, SNCF (3117 / 31177).<br>Voix : Kyutai TTS (CC BY 4.0).';
  endEl.querySelector('.t').innerHTML = ''; endEl.querySelector('.n').innerHTML = '';
  endEl.appendChild(ask); endEl.appendChild(reply); endEl.appendChild(sign); endEl.appendChild(fine); endEl.appendChild(follow);
  const tag = makeEndTag({ text: 'Abonne-toi pour la suite', ssaa: globalThis.SSAA });

  // ---------- lights that move with the story ----------
  const mk = (c, d) => { const o = {}; for (const [k, s] of Object.entries(SCN)) { o[k] = new THREE.PointLight(c, 0, d, 2); s.add(o[k]); } return o; };
  const FILL = mk('#ffd8b0', 3), COOL = mk('#cfe0ff', 5);
  const lightsOff = () => { for (const o of [FILL, COOL]) for (const l of Object.values(o)) l.intensity = 0; };
  const lanternK = (k) => { for (const l of WD.lanternLights || []) { if (l.userData.i0 === undefined) l.userData.i0 = l.intensity; l.intensity = l.userData.i0 * k; } };

  // ---------- story positions ----------
  const KB = PG.KERB;
  const INES_STOP = V(POLE.x - 0.9, KB, SZ + 0.45);                     // under the shelter's roof, by its open side
  const MAN_STOP = V(INES_STOP.x - 1.35, KB, INES_STOP.z + 0.1);       // he stops in front of her
  const HOME_X = 0.0, BX_HOME = HOME_X + 1.0 + 5.1;                     // her door; the bus's x when its front door faces it
  const BX_POL = -9.0;                                                   // the next stop, where the police wait
  const BOLT = () => V(ROOM.DX1 - (ROOM.DX1 - ROOM.DX0) + 0.08, ROOM.Y0 + 1.24, ROOM.Z0 + 0.065);
  const seatNear = (x, z) => bus.seats.reduce((a, s) => (Math.hypot(s.pos.x - x, s.pos.z - z) < Math.hypot(a.pos.x - x, a.pos.z - z) ? s : a));
  const HER_SEAT = seatNear(0.38, 3.85), HIS_SEAT = seatNear(-0.38, -5.17);

  return {
    duration: DUR, fps: 30, captions: [],
    frame(t, opts = {}) {
      curT = t;
      let sh = shotAt(t), id = sh.id, tt = t;
      // the rewind plays the ET SI branch backwards (to the moment at the stop before she follows)
      if (id === 'rewind') { const rr = (t - S.rewind.t0) / (S.rewind.t1 - S.rewind.t0); tt = S.stat1.t0 - 0.001 - rr * (S.stat1.t0 - S.etsi.t0 - 0.002); sh = shotAt(tt); id = sh.id; }
      const k = clamp((tt - sh.t0) / (sh.t1 - sh.t0));
      const etsi = ETSI(tt), set = SET(id), scene = SCN[set];
      R.renderPass.scene = scene;
      for (const a of everyone) { a.root.visible = false; putIn(a.root, set); }
      for (const p of PROPS) { p.visible = false; putIn(p, set); }
      lightsOff(); eyesShut = 0; vest.visible = true; beacon.intensity = 0; police.group.visible = false;
      R.renderer.toneMappingExposure = 1.0; G.uSat.value = 1.0; G.uTint.value.set(1, 1, 1); G.uScan.value = 0; G.uAberr.value = 0; G.uFade.value = 0; G.uVignette.value = 0.8;
      morph(ines, {}); morph(man, {}); for (let i = 0; i < 3; i++) bus.setDoor(i, 0);
      WD.streetSpot.intensity = 0; WD.roomFill.intensity = 0.6; lanternK(1);
      const busOn = (x, z) => { bus.group.visible = true; bus.place(x, z); bus.spin(30 - x); };

      // ===== the boulevard: the stop =====
      if (set === 'pg' && !IN_BUS.includes(id)) {
        const facing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
        const herLook = ['hook', 's2', 's3', 'etsi', 'r1', 'tip3', 'tip2'].includes(id) ? wp(man.bones.Head) : id === 'tip1' ? null : V(POLE.x + 30, 1.4, LANE);
        const herPhone = id === 'tip1';
        if (!['stat2'].includes(id)) show(ines, () => stand(ines, { pos: INES_STOP, yaw: id === 's1' || id === 'tip4a' ? Math.PI / 2 + 0.3 : -Math.PI / 2 + 0.15, breath: t * 0.4,
          look: herLook || V(INES_STOP.x, 1.0, INES_STOP.z + 0.5), lookK: 0.85, armL: armDown(1), armR: herPhone ? phoneStand : armDown(-1), ...(herPhone ? { curlR: 0.08 } : {}) }));
        if (herPhone) { phone.visible = true; phoneFit(ines, 'Right', phone); drawScreen('app', { clock: '03:13', pct: 3 }); }
        // him: walking up (s2), standing in front of her, pointing back the way he came; leaving (tip3)
        const manOn = ['hook', 's2', 's3', 'etsi', 'r1', 'tip1', 'tip2', 'tip3'].includes(id);
        if (manOn) {
          const point = (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(fwd, -0.22).addScaledVector(left, 0.48).addScaledVector(up, -0.3), pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(left, 0.2).addScaledVector(fwd, -0.4),
            F: left.clone().addScaledVector(fwd, -0.4).normalize(), N: V(0, -1, 0), curl: 0.8, idx: -0.15, thumb: 0.1 });
          const pointing = (id === 's2' && tt > Lw(2, 'Ligne')) || id === 'hook' || id === 'etsi';
          if (id === 's2' && tt < Lw(2, 'Ligne') + 0.2) {
            const A0 = V(STOP_X - 7, KB, INES_STOP.z + 0.2), u = smooth(S.s2.t0, Lw(2, 'Ligne') + 0.2, tt), pos = A0.clone().lerp(MAN_STOP, u);
            show(man, () => walk(man, { pos, yaw: facing(A0, MAN_STOP), phase: A0.distanceTo(pos) / (2 * 0.66), stride: 0.66, look: wp(ines.bones.Head), lookK: 0.6 }));
          } else if (id === 'tip3' && tt > Lw(14, 'puis')) {
            const A1 = V(STOP_X - 12, KB, INES_STOP.z + 0.3), u = smooth(Lw(14, 'puis'), S.tip3.t1 + 1.5, tt), pos = MAN_STOP.clone().lerp(A1, u);
            show(man, () => walk(man, { pos, yaw: facing(MAN_STOP, A1), phase: MAN_STOP.distanceTo(pos) / (2 * 0.66), stride: 0.66 }));
          } else show(man, () => stand(man, { pos: MAN_STOP, yaw: facing(MAN_STOP, INES_STOP), breath: t * 0.35, look: wp(ines.bones.Head), lookK: 0.9, armL: pointing ? point : armDown(1), armR: armDown(-1) }));
          morph(man, { mouthsmile: id === 's3' ? 0.5 : 0.3 });
          if (id === 's2' && tt > Lw(2, 'Ligne')) { const sp = Math.max(0, Math.sin((tt - Lw(2, 'Ligne')) * 12)) * (1 - smooth(Ln[2].t1, Ln[2].t1 + 0.1, tt)); morph(man, { jawopen: 0.22 * sp, mouthsmile: 0.25 }); }
          if (id === 'tip3' && tt < Lw(14, 'Il')) { const sp = Math.max(0, Math.sin((tt - S.tip3.t0) * 11)) * (1 - smooth(Lw(14, 'Il') - 0.2, Lw(14, 'Il'), tt)); morph(ines, { jawopen: 0.2 * sp }); }
        }
        if (id === 'tip4a') { const x = busPG(tt); busOn(x, LANE); bus.setLights({ inside: 1, head: 1, tail: 1 }); bus.setDoor(0, smooth(T_STOP + 0.1, T_STOP + 0.9, tt)); }
      }
      // ===== inside the bus, driving down the boulevard =====
      if (IN_BUS.includes(id)) {
        const x = busPG(tt); busOn(x, LANE); bus.setLights({ inside: 1, head: 1, tail: 1 });
        const yaw = bus.group.rotation.y, seatPos = (s) => s.g.localToWorld(V(0, 0.435, 0));
        show(driver, () => sit(driver, { pos: bus.toW(bus.DRV.x, bus.DRV.y, bus.DRV.z), yaw, legs: 'chair', floor: bus.toW(0, BUS.FLOOR, 0).y, seat: Number(q.get('dseat') ?? 0.2), footFwd: Number(q.get('dffw') ?? 0.5), curl: 0.55, curlL: 0.5, thumbL: -1.0, curlR: 0.5, thumbR: -1.0,
          look: id === 'tip6' ? wp(ines.bones.Head) : bus.toW(0.3, 1.6, 14), lookK: 0.8, handL: wheelHand(1), handR: wheelHand(-1) }));
        if (id === 'tip6') { const sp = Math.max(0, Math.sin((tt - S.tip6.t0) * 11)) * (1 - smooth(S.tip6.t0 + 1.8, S.tip6.t0 + 2.0, tt)); morph(ines, { jawopen: 0.2 * sp }); }
        const sp = seatPos(HER_SEAT), phoneIn = ['tip5'].includes(id);
        show(ines, () => sit(ines, { pos: sp, yaw, legs: 'chair', floor: bus.toW(0, BUS.FLOOR, 0).y, seat: 0.2, footFwd: 0.45, look: ['tw1', 'tw2'].includes(id) ? bus.mirrorHolder.getWorldPosition(V(0, 0, 0)) : id === 'tip6' ? wp(driver.bones.Head) : id === 'tip5' ? null : bus.toW(0.2, 1.4, 9), lookK: 0.85,
          handL: lapL, curlL: 0.35, handR: phoneIn ? phoneLap : lapR, ...(phoneIn ? { curlR: 0.08, pkR: PK, thumbR: THUMB } : {}), lean: id === 'tip6' ? 0.12 : 0 }));
        if (phoneIn) { phone.visible = true; phoneFit(ines, 'Right', phone); const kk = smooth(0.05, 0.7, k); drawScreen('sms', { clock: '03:21', pct: 2, k: kk, sent: k > 0.78 }); }
        // him at the back, on the last row: head down, then he lifts it and looks into the mirror
        if (['tw1', 'tw2', 'tip4b', 'tip5', 'tip6'].includes(id)) {
          const up = id === 'tw2' ? smooth(0.05, 0.4, k) : 0, M = bus.mirrorHolder.getWorldPosition(V(0, 0, 0));
          show(man, () => sit(man, { pos: seatPos(HIS_SEAT), yaw, legs: 'chair', floor: bus.toW(0, BUS.FLOOR + 0.26, 0).y, seat: 0.17, footFwd: 0.3, lean: 0.25 * (1 - up), headUp: -0.6 * (1 - up),
            look: up > 0 ? M : bus.toW(-0.3, 0.6, -4.2), lookK: 0.9, handL: lapL, handR: lapR }));
          vest.visible = false; morph(man, { mouthsmile: 0.3 * up });
        }
        // the interior mirror joins her eyes and his face
        const M = bus.mirrorHolder.getWorldPosition(V(0, 0, 0)), eI = wp(ines.bones.Head).add(V(0, 0.07, 0)), eM = man.root.visible ? wp(man.bones.Head).add(V(0, 0.06, 0)) : bus.toW(-0.38, 1.9, -5.1);
        const n = eI.clone().sub(M).normalize().add(eM.clone().sub(M).normalize()).normalize(); bus.mirrorHolder.lookAt(M.clone().sub(n)); bus.mirrorHolder.updateMatrixWorld(true);
      }
      // ===== her street: the ET SI's dark street, the drop-off, the police =====
      if (set === 'home') {
        if (['e1', 'e2', 'e3', 'stat1'].includes(id)) {
          lanternK(0.12);
          const A0 = V(12, STREET.KERB, 1.4), A1 = V(-2, STREET.KERB, 1.4);
          if (id === 'e1') {
            const u = smooth(0, 1, k) * 0.6, pi = A0.clone().lerp(A1, u), pm = pi.clone().add(V(1.6, 0, 0.15));
            show(ines, () => walk(ines, { pos: pi, yaw: -Math.PI / 2, phase: A0.distanceTo(pi) / (2 * 0.6), stride: 0.6, look: pi.clone().add(V(-4, 1.5, 0)), lookK: 0.5 }));
            show(man, () => walk(man, { pos: pm, yaw: -Math.PI / 2, phase: (A0.distanceTo(pm) + 0.3) / (2 * 0.66), stride: 0.66, look: wp(ines.bones.Head), lookK: 0.8 }));
          }
          const PI = A0.clone().lerp(A1, 0.6), PM = PI.clone().add(V(1.4, 0, 0.1));
          if (id === 'e2' || id === 'e3') {
            show(ines, () => stand(ines, { pos: PI, yaw: Math.PI / 2 - 0.2, breath: t * 0.6, look: wp(man.bones.Head), lookK: 0.85, armL: armDown(1), armR: id === 'e3' ? phoneStand : armDown(-1), ...(id === 'e3' ? { curlR: 0.08 } : {}) }));
            show(man, () => stand(man, { pos: PM, yaw: -Math.PI / 2 + 0.15, breath: t * 0.35, look: wp(ines.bones.Head), lookK: 0.9, armL: armDown(1), armR: armDown(-1) }));
            vest.visible = id === 'e2' && k < 0.35; morph(man, { mouthsmile: 0.35 });
            if (!vest.visible) { heap.visible = true; heap.position.set(PM.x + 0.25, STREET.KERB, PM.z + 0.35); heap.rotation.y = 0.7; }
            if (id === 'e3') { phone.visible = true; phoneFit(ines, 'Right', phone); const off = smooth(0.35, 0.55, k); if (off < 1) drawScreen('lock', { clock: '03:19', pct: 1, low: 1, fadeOut: off }); else drawScreen('off'); }
          }
          if (id === 'stat1') { heap.visible = true; heap.position.set(PM.x + 0.25, STREET.KERB, PM.z + 0.35); heap.rotation.y = 0.7; phone.visible = true; phone.position.set(PI.x - 0.3, STREET.KERB + 0.004, PI.z + 0.2); phone.rotation.set(-Math.PI / 2, 0, 1.1); phone.updateMatrixWorld(true); drawScreen('off');
            // the only street lamp still on, above the vest he dropped: a cold pool on the pavement
            COOL.home.position.copy(heap.position).add(V(0.35, 2.7, -0.25)); COOL.home.intensity = 9; }
        }
        if (id === 'tw3') {
          // the bus stopped at her door: she steps down and goes to it; his face at the rear window, the rear doors shut
          busOn(BX_HOME, SLANE); bus.setLights({ inside: 1, head: 1, tail: 1 }); bus.setDoor(0, smooth(0, 0.15, k));
          const D0 = bus.toW(-BUS.W / 2 - 0.35, 0, 5.1), D1 = V(HOME_X + 0.25, STREET.KERB, 0.5); D0.y = STREET.KERB; const u = smooth(0.12, 0.95, k), pos = D0.clone().lerp(D1, u);
          show(ines, () => walk(ines, { pos, yaw: Math.atan2(D1.x - D0.x, D1.z - D0.z), phase: D0.distanceTo(pos) / (2 * 0.6), stride: 0.6, look: V(HOME_X, 1.6, -1), lookK: 0.5 }));
          show(man, () => stand(man, { pos: bus.toW(-0.7, BUS.FLOOR + 0.26, -3.9), yaw: bus.group.rotation.y - Math.PI / 2, breath: t * 0.35, look: wp(ines.bones.Head), lookK: 0.9, armL: armDown(1), armR: armDown(-1) }));
          vest.visible = false;
        }
        if (id === 'tw4a' || id === 'tw4b') {
          // the next stop: the police car's lights, the rear doors open, one officer holds his arm, the other has his phone
          busOn(BX_POL, SLANE); bus.setLights({ inside: 1, head: 1, tail: 1 }); bus.setDoor(2, 1);
          police.group.visible = true; police.group.position.set(BX_POL - 11.5, 0, SLANE); police.group.rotation.y = 0; police.update(t, 1); police.group.updateMatrixWorld(true);
          beacon.position.set(BX_POL - 11, 2.4, SLANE - 2); beacon.intensity = 26 * (0.35 + 0.65 * Math.abs(Math.sin(t * 6.3)));
          const MP = V(BX_POL + 3.1, STREET.KERB, STREET.PAVE - 0.6);
          show(man, () => stand(man, { pos: MP, yaw: Math.PI / 2 + 0.3, breath: t * 0.4, look: V(MP.x + 3, 1.6, MP.z - 0.5), lookK: 0.6, armL: armDown(1), armR: armDown(-1) }));
          vest.visible = false;
          // officer 1 behind his right shoulder, his left hand on the man's upper arm (fitted like the bar's grip, ep26)
          const a = wp(man.bones.RightArm), b = wp(man.bones.RightForeArm), Pm = a.clone().lerp(b, 0.45);
          const right = V(-1, 0, 0).applyAxisAngle(V(0, 1, 0), man.root.rotation.y);
          const gt = Pm.clone().addScaledVector(right, Number(q.get('goff') ?? 0.068));
          const o1 = (armL) => ({ pos: MP.clone().addScaledVector(right, 0.6).add(V(0, 0, 0)).addScaledVector(V(0, 0, 1).applyAxisAngle(V(0, 1, 0), man.root.rotation.y), -0.35), yaw: man.root.rotation.y - 0.9, breath: t * 0.35, look: wp(man.bones.Head), lookK: 0.8, armL, armR: armDown(-1) });
          const spec = (sh, fwd, left, up) => ({ hand: gt.clone().add(V(0.0, 0.06, 0)), pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(left, 0.6).addScaledVector(fwd, -0.3), F: V(0, -0.35, 0).addScaledVector(V(0, 0, 1).applyAxisAngle(V(0, 1, 0), man.root.rotation.y), 1).normalize(), N: right.clone().negate(), curl: 0.15, thumb: -0.9 });
          show(cop1, () => pressPose(cop1, 'Left', gt, (arm) => stand(cop1, o1(arm)), spec, () => wp(cop1.bones.LeftHand).lerp(wp(cop1.bones.LeftHandMiddle1), 0.6)));
          // officer 2 facing the man, his phone up in front of him
          const c2p = MP.clone().addScaledVector(V(0, 0, 1).applyAxisAngle(V(0, 1, 0), man.root.rotation.y), 1.0);
          show(cop2, () => stand(cop2, { pos: c2p, yaw: man.root.rotation.y + Math.PI, breath: t * 0.35, look: id === 'tw4b' ? null : wp(man.bones.Head), lookK: 0.8, armL: armDown(1), armR: phoneStand }));
          phone2.visible = true; phoneFit(cop2, 'Right', phone2, 0.0245); drawMap2(0.5 + 0.5 * Math.sin(t * 5));
        }
        if (id === 'fin1' || id === 'fin2') {
          WD.room.setBolt(id === 'fin1' ? smooth(0.2, 0.55, k) : 1); WD.room.setDoor(0);
          const bt = BOLT();
          if (id === 'fin1') show(ines, () => { const pose = (arm) => stand(ines, { pos: V(bt.x - 0.2, ROOM.Y0, bt.z + 0.36), yaw: Math.PI - 0.1, breath: t * 0.5, look: bt, lookK: 0.8, armR: arm, armL: armDown(1) });
            const spec = (sh, fwd, left, up) => ({ hand: bt.clone().add(V(0.02, 0, 0.06)), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5), F: V(0, 1, 0), N: V(0, 0, -1), curl: 0.55 });
            pressPose(ines, 'Right', bt.clone().add(V(0, 0, 0.012)), pose, spec, () => wp(ines.bones.RightHandIndex3).lerp(wp(ines.bones.RightHandThumb3), 0.5)); });
          else { show(ines, () => stand(ines, { pos: V(bt.x - 0.2, ROOM.Y0, bt.z + 0.42), yaw: Math.PI - 0.1, breath: t * 0.5, look: null, lookK: 0.85, armL: armDown(1), armR: phoneStand, curlR: 0.08 }));
            phone.visible = true; phoneFit(ines, 'Right', phone); const off = smooth(0.25, 0.5, k); if (off < 1) drawScreen('lock', { clock: '03:40', pct: 0, low: 1, fadeOut: off }); else drawScreen('off'); }
          WD.roomFill.intensity = 0.25; FILL.home.intensity = 0.16; FILL.home.position.copy(bt).add(V(0.4, 0.3, 1.0));
        }
      }
      // the shelter empty (stat2): her phone's lock screen glow gone, the bench, the night
      // --- phone looking at null: point the head at the phone
      // --- cameras
      const fixed = (a, b, ta, tb, fa, fb = fa) => { const e = smooth(0, 1, k); cam.position.copy(a).lerp(b, e); cam.up.set(0, 1, 0); cam.lookAt(ta.clone().lerp(tb, e)); cam.fov = lerp(fa, fb, e); };
      const busCam = (a, b, ta, tb, fa, fb = fa) => fixed(bus.toW(a.x, a.y, a.z), bus.toW(b.x, b.y, b.z), bus.toW(ta.x, ta.y, ta.z), bus.toW(tb.x, tb.y, tb.z), fa, fb);
      const phoneCam = (ph, dist = 0.27, fov = 34) => { const upv = V(0, 1, 0).applyQuaternion(ph.quaternion), nn = V(0, 0, 1).applyQuaternion(ph.quaternion);
        cam.position.copy(ph.position).addScaledVector(nn, dist); cam.up.copy(upv); cam.lookAt(ph.position.clone().addScaledVector(upv, 0.02)); cam.up.set(0, 1, 0); cam.fov = fov; };
      cam.near = 0.02; cam.far = 900;
      const IH = ines.root.visible ? wp(ines.bones.Head) : INES_STOP.clone().add(V(0, 1.6, 0)), MH = man.root.visible ? wp(man.bones.Head) : MAN_STOP.clone().add(V(0, 1.72, 0));
      if (id === 'hook') { const eye = IH.clone().add(V(0, 0.07, 0)), d = MH.clone().sub(eye).normalize(); cam.position.copy(eye).addScaledVector(d, 0.14); cam.up.set(0, 1, 0); cam.lookAt(MH.clone().add(V(0.0, -0.18, 0))); cam.fov = lerp(52, 48, smooth(0, 1, k)); }
      if (id === 's1') fixed(V(STOP_X + 9, 1.9, LANE + 6), V(STOP_X + 7.5, 1.85, LANE + 5.6), V(STOP_X + 0.6, 1.3, SZ), V(STOP_X + 0.6, 1.3, SZ), 44, 42);
      if (id === 's2') fixed(IH.clone().add(V(0.55, 0.05, 0.45)), IH.clone().add(V(0.52, 0.04, 0.42)), V(MAN_STOP.x - 1.5, 1.4, MAN_STOP.z), V(MAN_STOP.x, 1.5, MAN_STOP.z), 46, 44);
      if (id === 's3') fixed(MH.clone().add(V(0.85, -0.05, 0.25)), MH.clone().add(V(0.78, -0.05, 0.23)), MH.clone().add(V(0, -0.08, 0)), MH.clone().add(V(0, -0.06, 0)), 30, 26);
      if (id === 'etsi' || id === 'r1') fixed(IH.clone().add(V(-0.62, -0.05, 0.25)), IH.clone().add(V(-0.56, -0.05, 0.23)), IH.clone().add(V(0, 0.02, 0)), IH.clone().add(V(0, 0.02, 0)), 32, 29);
      if (id === 'tip1') phoneCam(phone, 0.3, 34);
      if (id === 'tip2') fixed(V(STOP_X + 1.0, 1.7, LANE + 5.5), V(STOP_X + 0.8, 1.68, LANE + 5.2), V(STOP_X - 0.3, 1.2, SZ), V(STOP_X - 0.3, 1.2, SZ), 48, 46);
      if (id === 'tip3') fixed(V(INES_STOP.x - 0.2, 1.6, LANE + 2.6), V(INES_STOP.x - 0.5, 1.6, LANE + 2.5), V(INES_STOP.x - 0.9, 1.3, INES_STOP.z), V(INES_STOP.x - 2.4, 1.3, INES_STOP.z), 52, 54);
      if (id === 'tip4a') fixed(V(INES_STOP.x - 1.6, 1.5, INES_STOP.z + 0.35), V(INES_STOP.x - 1.5, 1.5, INES_STOP.z + 0.4), V(INES_STOP.x + 14, 1.5, LANE), V(INES_STOP.x + 8, 1.4, LANE), 46, 44);
      if (id === 'tip4b') busCam(V(-0.6, 1.75, 2.4), V(-0.58, 1.74, 2.5), V(0.5, 1.2, 4.6), V(0.5, 1.2, 4.6), 52, 50);
      if (id === 'tip5') phoneCam(phone, 0.3, 34);
      if (id === 'tip6') busCam(V(-0.35, 1.62, 2.9), V(-0.33, 1.61, 2.95), V(0.55, 1.35, 4.5), V(0.55, 1.35, 4.5), 48, 46);
      if (id === 'tw1' || id === 'tw2') { const M = bus.mirrorHolder.getWorldPosition(V(0, 0, 0)), e = IH.clone().add(V(0, 0.07, 0)), d = M.clone().sub(e); const e0 = e.clone().addScaledVector(d, 0.35), e1 = e.clone().addScaledVector(d, id === 'tw2' ? 0.62 : 0.45);
        cam.position.copy(e0).lerp(e1, smooth(0, 1, k)); cam.up.set(0, 1, 0); cam.lookAt(M); cam.fov = id === 'tw2' ? lerp(36, 28, smooth(0, 1, k)) : lerp(40, 36, smooth(0, 1, k)); }
      if (id === 'e1') fixed(V(1.0, 0.6, 2.6), V(0.6, 0.6, 2.5), V(8, 1.3, 1.4), V(6.5, 1.3, 1.4), 46, 44);
      if (id === 'e2') { const PM = MH; fixed(PM.clone().add(V(-1.25, -0.25, 0.55)), PM.clone().add(V(-1.15, -0.25, 0.5)), PM.clone().add(V(0, -0.3, 0)), PM.clone().add(V(0, -0.15, 0)), 44, 40); }
      if (id === 'e3') phoneCam(phone, 0.3, 34);
      if (id === 'stat1') { const c = heap.position.clone(); fixed(c.clone().add(V(-1.05, 0.95, 1.05)), c.clone().add(V(-0.92, 0.86, 0.94)), c.clone().add(V(-0.12, 0.02, 0.05)), c.clone().add(V(-0.12, 0.02, 0.05)), 40, 37); }
      if (id === 'stat2') fixed(V(STOP_X + 0.2, 1.4, LANE + 2.0), V(STOP_X + 0.2, 1.42, LANE + 1.7), V(STOP_X, 1.0, SZ - 0.3), V(STOP_X, 1.0, SZ - 0.3), 50, 48);
      if (id === 'tw3') fixed(V(HOME_X - 2.8, 1.6, 0.9), V(HOME_X - 2.6, 1.6, 0.95), V(HOME_X + 2.6, 1.4, 2.6), V(HOME_X + 1.2, 1.3, 1.6), 52, 50);
      if (id === 'tw4a') fixed(V(BX_POL + 7.0, 1.65, 0.7), V(BX_POL + 6.7, 1.65, 0.75), V(BX_POL + 2.4, 1.3, 2.2), V(BX_POL + 2.6, 1.3, 2.2), 52, 50);
      if (id === 'tw4b') { phoneCam(phone2, 0.33, 34); cam.position.add(V(1, 0, 0).applyQuaternion(phone2.quaternion).multiplyScalar(0.07)); cam.lookAt(phone2.position); }
      if (id === 'fin1') { const bt = BOLT(); fixed(V(4.45, ROOM.Y0 + 1.45, -3.25), V(4.43, ROOM.Y0 + 1.44, -3.28), bt.clone().add(V(-0.12, -0.15, 0)), bt.clone().add(V(-0.12, -0.15, 0)), 46, 43); }
      if (id === 'fin2') phoneCam(phone, 0.3, 34);
      if (id === 'end') fixed(V(STOP_X + 6, 1.7, LANE + 5), V(STOP_X + 5.6, 1.7, LANE + 4.8), V(STOP_X, 1.2, SZ), V(STOP_X, 1.2, SZ), 50);
      cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      const phoneShot0 = phone.visible && ['tip1', 'tip5', 'e3', 'fin2'].includes(id) || id === 'tw4b';

      // --- looks
      if (set === 'pg') { R.renderer.toneMappingExposure = 1.3; G.uSat.value = 0.85; COOL.pg.intensity = 0.0; FILL.pg.intensity = 0.25; FILL.pg.position.copy(cam.position).add(V(0, 0.3, 0)); }
      if (IN_BUS.includes(id)) { R.renderer.toneMappingExposure = 1.2; FILL.pg.intensity = 0.12; }
      if (set === 'home' && !['fin1', 'fin2'].includes(id)) { R.renderer.toneMappingExposure = ['tw3', 'tw4a'].includes(id) ? 1.7 : 1.4; FILL.home.intensity = 0.2; FILL.home.position.copy(cam.position).add(V(0, 0.3, 0)); }
      if (etsi) { G.uSat.value = 0.45; G.uTint.value.set(1.0, 0.95, 1.05); G.uVignette.value = 1.15; }
      if (['e1', 'e2', 'e3'].includes(id)) R.renderer.toneMappingExposure = 1.6;
      if (['stat1', 'stat2'].includes(id)) { G.uSat.value = id === 'stat1' ? 0.6 : 0.25; R.renderer.toneMappingExposure = 1.2; }
      if (id === 'tip4b' || id === 'tip6') { R.renderer.toneMappingExposure = 1.45; FILL.pg.intensity = 0.22; }
      // phone close-ups: a fill just above the lens mirrors in the glossy screen as a white blob: move it well off to the side
      if (phoneShot0) for (const L of [FILL.pg, FILL.home]) L.position.copy(cam.position).addScaledVector(V(0, 1, 0), 1.1).addScaledVector(V(1, 0, 0).applyQuaternion(cam.quaternion), 0.9);
      if (id === 'tw4a' || id === 'tw4b') { G.uTint.value.set(0.95, 0.97, 1.08); }
      if (id === 'end') G.uFade.value = 1;
      if (S.rewind.t0 <= t && t < S.rewind.t1) { G.uScan.value = 1.0; G.uSat.value = 0.4; G.uAberr.value = 0.012; }

      // --- overlay
      const endK = smooth(S.end.t0, S.end.t0 + 0.6, t);
      const close = ['etsi', 'r1', 's3', 'e2'].includes(id), phoneShot = phone.visible && ['tip1', 'tip5', 'e3', 'fin2'].includes(id) || id === 'tw4b';
      const plate = id === 's1' ? { a: '3 h 12', b: 'BOULEVARD DE CLICHY · 3 %', k: smooth(S.s1.t0 + 0.1, S.s1.t0 + 0.4, t) * (1 - smooth(S.s1.t1 - 0.3, S.s1.t1, t)) }
        : id === 'fin1' ? { a: '3 h 40', b: 'CHEZ ELLE', k: smooth(S.fin1.t0 + 0.1, S.fin1.t0 + 0.4, t) * (1 - smooth(S.fin1.t1 - 0.2, S.fin1.t1, t)) } : null;
      const clock = etsi ? '03:19' : IN_BUS.includes(id) ? '03:21' : ['tw3', 'tw4a', 'tw4b'].includes(id) ? '03:38' : ['fin1', 'fin2', 'end'].includes(id) ? '03:40' : '03:12';
      const bat = ['fin2', 'end'].includes(id) ? 0 : etsi ? 1 : IN_BUS.includes(id) || ['tw3', 'tw4a', 'tw4b', 'fin1'].includes(id) ? 1 : 3;
      const card = (a, b, s0) => ({ a, b, k: smooth(s0 + 0.1, s0 + 0.4, t) });
      ov.apply({ t, time: clock, bat, statA: id === 'end' || id === 'hook' ? 0 : 1, serA: id === 'end' ? 0 : 1, part: 'S2 · PARTIE 4',
        capA: id === 'end' ? 0 : 1, capY: id === 'hook' ? 74 : close ? 72 : phoneShot ? 84 : 60, plate,
        etsi: id === 'etsi' ? smooth(S.etsi.t0, S.etsi.t0 + 0.25, t) : 0,
        rew: S.rewind.t0 <= t && t < S.rewind.t1 ? 1 : 0,
        notif: null,
        news: id === 'stat1' ? card('3 374 VICTIMES EN 2024', 'de violences sexuelles dans les transports en commun (+86 % depuis 2016)', S.stat1.t0)
          : id === 'stat2' ? card('91 % SONT DES FEMMES', '44 % des victimes en Île-de-France (SSMSI, 2024)', S.stat2.t0)
            : id === 'tip1' ? card('UNE DÉVIATION, ÇA S’AFFICHE', 'à l’arrêt et dans l’appli : vérifiez vous-même', S.tip1.t0)
              : id === 'tip2' ? card('RESTEZ À L’ARRÊT ÉCLAIRÉ', 'ne suivez personne dans une rue sombre', S.tip2.t0)
                : id === 'tip4b' ? card('ASSEYEZ-VOUS PRÈS DU CHAUFFEUR', 'à l’avant du bus', S.tip4b.t0)
                  : id === 'tip5' ? card('3117 OU SMS AU 31177', 'l’alerte des transports, 24 h/24 · danger immédiat : le 17', S.tip5.t0)
                    : id === 'tip6' ? card('APRÈS 22 H : LA DESCENTE À LA DEMANDE', 'prévenez le chauffeur un arrêt avant', S.tip6.t0) : null,
        capHtml: opts.cover ? '<span class="w1">Un </span><span class="r1">agent</span><span class="w1"> vous dit de le suivre…</span><br><span class="w1">vous le </span><span class="r1">suivez</span><span class="w1"> ?</span>'
          : id === 'hook' ? Ln[0].units.map((u) => { const on = t >= u.t0 - 0.12; return `<span class="${u.red ? (on ? 'r1' : 'r0') : (on ? 'w1' : 'w0')}">${u.shown}</span>${u.shown.endsWith('…') ? '<br>' : ' '}`; }).join('') : null,
        peep: 0, black: 0 });
      endEl.style.opacity = String(endK);
      tag.update(t, S.end.t0 + 0.6, endK);
      R.bloom.threshold = Math.min(0.85, 0.95 / R.renderer.toneMappingExposure);
      if (DBG) {
        const out = [`DBG ${id} t=${t.toFixed(2)}`];
        for (const [nm, av] of [['ines', ines], ['man', man], ['driver', driver], ['cop1', cop1], ['cop2', cop2]]) {
          if (!av.root.visible) continue;
          if (bus.group.visible && IN_BUS.includes(id)) out.push(`${nm} bus ${multiPen(av, bus.boxes)}`);
          if (phone.visible && av === ines && ['tip1', 'tip5', 'e3', 'fin2'].includes(id)) out.push(`phone ${boxPen(ines, phone, phoneBox, handSet(ines, 'Right'))}`);
          if (phone2.visible && av === cop2) out.push(`phone2 ${boxPen(cop2, phone2, phoneBox, handSet(cop2, 'Right'))}`);
        }
        if (id === 'tw4a') out.push(`grip ${armGrip(cop1, 'Left', man, 'Right')}`);
        if (IN_BUS.includes(id)) out.push(`rim ${(() => { const inv = new THREE.Matrix4().copy(bus.wheel.matrixWorld).invert(), p = V(0, 0, 0); let pen = -1e9; for (const sd of ['Left', 'Right']) { const st = handSet(driver, sd); skinPts(driver, 1, (v, mesh, i) => { if (!st.has(boneOf(mesh, i))) return; p.copy(v).applyMatrix4(inv); const q2 = Math.hypot(p.x, p.y) - 0.25, d = 0.019 - Math.hypot(q2, p.z); if (d > pen) pen = d; }); } return (pen * 1000).toFixed(1) + 'mm'; })()}`);
        console.log(out.join(' | '));
      }
      R.composer.render();
    },
  };
}
