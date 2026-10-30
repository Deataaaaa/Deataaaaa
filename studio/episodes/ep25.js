// « 12 % » Saison 2 · Partie 2 · Le traceur (~90 s). 2:31 am, Inès is in the right car at last (Lucas, the grey saloon), 9 %, and her
// phone says an unknown tracker has been moving with her for 1 h 07. Lucas shrugs (« Ça arrive tout le temps. Un client l'aura
// oublié. Je vous laisse en bas de chez vous ? »). « ET SI… » she goes home: he drops her off, six floors, the bolt; on a map a dot
// stops on her building; 3:02, « Bien rentrée, Inès ? »; under her window someone looks up. April 2024, Bordeaux: 18 months for a
// man who tracked his ex (notes/facts.md). Rewind: never go home with a tracker on you; a lit public place, for her the commissariat
// of the 18e; « Faire sonner »; the beep in her coat's lining; the tracker against the phone's back (serial number, part of the
// owner's number); a screenshot, keep it as evidence; art. 226-1; the police must take the complaint. « Quelqu'un a touché votre
// manteau, ce soir ? » 1:24, the bar: « Inès, ton manteau ! », a man picks it up, hands it back with a smile, slips the tracker into
// the lining… and sets a glass next to hers. 6 %.
// Four sets in four scenes (Pigalle, her street and room, the commissariat, the bar); the cast and the props move between them.
// Every cut sits on the narration (audio/vo/ep25_*.json); every pose is rebuilt from rest each frame.
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
import { makeCar24, CAR, MIR_Y, MIR_Z } from '../engine/car24.js';
import { renderShot } from '../engine/ads19.js';
import { Overlay12 } from '../engine/s12.js';
import { buildWorld12 } from '../engine/world12.js';
import { ROOM } from '../engine/room12.js';
import { STREET, HERO_BAY } from '../engine/paris12.js';
import { buildStation, ST } from '../engine/station25.js';
import { buildBar, makeGlass, BAR } from '../engine/bar25.js';
import { makeCoat, makeTracker } from '../engine/props25.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(new THREE.Vector3());
const lerp = (a, b, k) => a + (b - a) * k;
const YAW = -Math.PI / 2;                                         // cars head -x: their right side (Inès's door) faces the façades (z = 0)

export async function create() {
  const q = new URLSearchParams(location.search);
  const DBG = q.get('dbg') === '1';
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = 0;
  POSE.lookFirst = true;
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer(); R.renderer.localClippingEnabled = true;
  const VO = await (await fetch(`/audio/vo/ep25_${q.get('voice') || 'developpeuse'}.json`)).json();
  const ov = new Overlay12(VO, { etsiSub: 'ELLE RENTRE' });
  const PGW = buildPigalle(R.renderer, { ssaa: globalThis.SSAA });
  const WD = buildWorld12(R.renderer, { trucks: false, cars: true });
  const STN = buildStation(R.renderer);
  const BR = buildBar(R.renderer);
  const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.03, 900); cam.layers.enable(1);
  R.renderPass.camera = cam;
  R.bloom.strength = 0.4; R.bloom.radius = 0.55;
  const G = R.grade.uniforms;

  // ---------- the timeline, read from the narration ----------
  const Ln = VO.lines, L = (i) => Ln[i].t0;
  const Lw = (i, w, n = 1) => { const us = Ln[i].units.filter((x) => x.shown.toLowerCase().replace(/[«»"…]/g, '').startsWith(w.toLowerCase())); const u = us[n - 1]; return u ? u.t0 : Ln[i].t0; };
  const END0 = Ln[Ln.length - 1].t0 - 0.25, DUR = Math.ceil((VO.duration + 4.4) * 10) / 10;
  const cut = (x) => x - 0.08;
  const SH = [
    ['hook', 0], ['s1a', cut(L(1))], ['s1b', cut(Lw(1, 'mais'))], ['s2', cut(L(2))], ['s3', cut(L(3))], ['etsi', cut(L(4))],
    ['e1a', cut(L(5))], ['e1b', cut(Lw(5, 'Six'))], ['e2', cut(L(6))], ['e3', cut(L(7))], ['e4', cut(L(8))], ['stat1', cut(L(9))], ['stat2', cut(L(10))],
    ['rewind', cut(L(11))], ['r1', cut(L(12))], ['tip1', cut(L(13))], ['tip2', cut(L(14))], ['tip3', cut(L(15))], ['tip4a', cut(L(16))], ['tip4b', cut(Lw(16, 'son'))],
    ['tip5', cut(L(17))], ['tip6', cut(L(18))], ['r2', cut(L(19))], ['tw1', cut(L(20))], ['tw2', cut(L(21))], ['tw3a', cut(L(22))], ['tw3b', cut(Lw(22, 'Il'))],
    ['tw4', cut(L(23))], ['tw5', cut(L(24))], ['end', END0],
  ].map(([id, t0], i, a) => ({ id, t0, t1: a[i + 1] ? a[i + 1][1] : DUR }));
  const S = Object.fromEntries(SH.map((s) => [s.id, s]));
  const shotAt = (t) => { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; };
  const ETSI = (t) => t >= S.etsi.t0 && t < S.r1.t0;
  console.log('SHOTS ' + SH.map((x) => `${x.id}:${x.t0.toFixed(2)}`).join(' ') + ' DUR ' + DUR);
  // which set each shot is in
  const SET = (id) => ['e1a', 'e1b', 'e2', 'e3', 'e4'].includes(id) ? 'home' : ['tip1', 'tip2', 'tip3', 'tip4a', 'tip4b', 'tip5', 'tip6', 'r2', 'tw1', 'tw5', 'end', 'stat2'].includes(id) ? 'stn' : ['tw2', 'tw3a', 'tw3b', 'tw4'].includes(id) ? 'bar' : 'pg';
  const SCN = { pg: PGW.scene, home: WD.scene, stn: STN.scene, bar: BR.scene };

  // ---------- the grey car (it changes scene with the shot) ----------
  const grey = makeCar24({ paint: '#6a6f75', metal: 0.75, plate: 'GK-482-TL', vtc: true, mirrorReflect: true });
  grey.mirror.layers.set(2); cam.layers.enable(2);                   // the rear-view mirror (the hook): out of the ground reflection's view
  const place = (car, x, z, yaw = YAW) => { car.group.position.set(x, 0, z); car.group.rotation.set(0, yaw, 0); car.group.updateMatrixWorld(true); };
  const toW = (car, x, y, z) => car.group.localToWorld(V(x, y, z));
  const gHead = new THREE.SpotLight('#eef2ff', 0, 40, 0.3, 0.6, 2); gHead.position.set(0, 0.72, 2.2); { const tg = new THREE.Object3D(); tg.position.set(0, 0.3, 12); grey.group.add(gHead, tg); gHead.target = tg; }
  const arrive = (t, t0, t1, x0, x1) => { const u = clamp((t - t0) / (t1 - t0)); return { x: x1 + (x0 - x1) * (1 - u) * (1 - u), v: 2 * (x0 - x1) * (1 - u) / (t1 - t0) }; };
  const LANE = PG.ZK + CAR.B + 1.55;                                  // the boulevard's near lane (its kerb at PG.ZK)
  const KZ = STREET.PAVE + CAR.B + 0.25;                              // parked at a kerb in the season 1 street and at the commissariat
  // the coat on the rear bench beside her (car-local: the bench top at 0.48)
  const COAT_SEAT = V(0.2, 0.481, -0.97);

  // ---------- people ----------
  const env = PGW.scene.environment;
  const ines = await loadAvatar('Female_Adult_11', { env, facial: true });
  const lucas = await loadAvatar('Male_Adult_09', { env });
  const man = await loadAvatar('Business_Male_06', { env });
  for (const a of [lucas, man]) a.root.scale.multiplyScalar(0.96);           // (tall Rocketbox men: seated, their heads went through the roof)
  const agent = await loadAvatar('Business_Female_02', { env });
  const lea = await loadAvatar('Female_Adult_13', { env, facial: true });
  const exA = await loadAvatar('Male_Adult_15', { env, lod: 512 }), exB = await loadAvatar('Female_Adult_14', { env, lod: 512 });
  const everyone = [ines, lucas, man, agent, lea, exA, exB];
  const morph = (av, map) => { for (const m of av.meshes) { const d = m.morphTargetDictionary; if (!d) continue; m.morphTargetInfluences.fill(0);
    for (const [k, v] of Object.entries(map)) for (const [nm, i] of Object.entries(d)) if (nm.toLowerCase().includes(k.toLowerCase())) m.morphTargetInfluences[i] = v; } };

  // ---------- props ----------
  const phone = makePhone(), phone2 = makePhone();
  const pcv = phone.tex.image, pc = pcv.getContext('2d'), p2v = phone2.tex.image, p2 = p2v.getContext('2d');
  const coatSeat = makeCoat('flat'), coatDrape = makeCoat('drape', { w0: 0.3, w1: 0.34, front: 0.06, back: 0.46 }), coatArm = makeCoat('drape', { r: 0.075, w0: 0.28, w1: 0.32, front: 0.4, back: 0.44 });
  const tracker = makeTracker();
  const glassHer = makeGlass('tumbler'), glassHis = makeGlass('wine');
  const apple = makeCat();
  const PROPS = [phone, phone2, coatSeat, coatDrape, coatArm, tracker, glassHer, glassHis, apple.root];
  const putIn = (obj, set) => { if (obj.parent !== SCN[set]) SCN[set].add(obj); };

  // portraits for the screens: Apple (her lock screen), drawn once in a studio
  const studio = () => { const s = new THREE.Scene(); const pm = new THREE.PMREMGenerator(R.renderer); s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.6;
    const k = new THREE.DirectionalLight('#fff4ea', 3); k.position.set(-2, 2.5, 3); const r = new THREE.DirectionalLight('#ffffff', 2.2); r.position.set(2.5, 2, -2.5); s.add(k, r); return s; };
  await Promise.all(TEX_PENDING);
  let appleCv = null;
  { const s = studio(); const cat = makeCat(); s.add(cat.root); cat.update(1.0, { look: V(0, 0.18, 1) }); const pil = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.6), new THREE.MeshStandardMaterial({ color: '#c9b9a2', roughness: 0.9 })); pil.position.y = -0.03; s.add(pil);
    const c2 = new THREE.PerspectiveCamera(30, 0.5, 0.05, 20); c2.position.set(0.05, 0.22, 0.75); c2.lookAt(0, 0.13, 0);
    appleCv = renderShot(R.renderer, s, c2, 360, 720, { exposure: 1.15, bg: '#cdbda4' }); }

  // ---------- her phone's screens (no brand: a neutral system look) ----------
  const statusBar = (ctx, w, clock, pct, dark = true) => { ctx.fillStyle = dark ? '#f2f2f4' : '#111'; ctx.font = '600 28px Inter, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(clock, 36, 52);
    ctx.textAlign = 'right'; ctx.fillStyle = pct <= 10 ? '#ff453a' : (dark ? '#f2f2f4' : '#111'); ctx.fillText(`${pct} %`, w - 92, 52); ctx.strokeStyle = dark ? '#f2f2f4' : '#111'; ctx.lineWidth = 3; ctx.strokeRect(w - 80, 30, 44, 24);
    ctx.fillStyle = pct <= 10 ? '#ff453a' : (dark ? '#f2f2f4' : '#111'); ctx.fillRect(w - 77, 33, Math.max(3, 38 * pct / 100), 18); ctx.fillRect(w - 34, 38, 4, 8); };
  const trackIcon = (ctx, x, y, s = 1) => { ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.roundRect(x, y, 64 * s, 64 * s, 16 * s); ctx.fill(); ctx.fillStyle = '#1c1c1e'; ctx.beginPath(); ctx.arc(x + 32 * s, y + 32 * s, 16 * s, 0, 7); ctx.fill(); ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(x + 32 * s, y + 32 * s, 7 * s, 0, 7); ctx.fill(); };
  const darkMap = (ctx, w, h, seed = 3) => { ctx.fillStyle = '#161b26'; ctx.fillRect(0, 0, w, h); const r = rng(seed);
    ctx.strokeStyle = '#252d3d'; ctx.lineWidth = 14; for (let i = 0; i < 7; i++) { ctx.beginPath(); const y0 = r() * h; ctx.moveTo(-20, y0); ctx.lineTo(w + 20, y0 + (r() - 0.5) * 300); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { ctx.beginPath(); const x0 = r() * w; ctx.moveTo(x0, -20); ctx.lineTo(x0 + (r() - 0.5) * 300, h + 20); ctx.stroke(); }
    ctx.strokeStyle = '#33405a'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(-20, h * 0.42); ctx.lineTo(w + 20, h * 0.36); ctx.stroke();
    ctx.fillStyle = '#1d2433'; for (let i = 0; i < 40; i++) ctx.fillRect(r() * w, r() * h, 30 + r() * 60, 24 + r() * 50); };
  // the route a dot follows on a map (canvas px), and where it stops (her building)
  const ROUTE = [[60, 860], [140, 760], [200, 640], [250, 560], [300, 470], [330, 400], [356, 352]];
  const routeAt = (u) => { const n = ROUTE.length - 1, f = clamp(u) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; return [lerp(ROUTE[i][0], ROUTE[i + 1][0], k), lerp(ROUTE[i][1], ROUTE[i + 1][1], k)]; };
  const SERIAL = '4K7Q 82HX 19PM';
  let lastScreen = '', lastScreen2 = '';
  const drawScreen = (mode, o = {}) => {
    phone.screen.material.emissiveIntensity = mode === 'off' ? 0 : mode === 'lock' ? 0.8 : 0.5;
    phone.screen.material.envMapIntensity = mode === 'off' ? 0.15 : 0.35;
    const key = JSON.stringify([mode, o]); if (key === lastScreen) return; lastScreen = key;
    const w = pcv.width, h = pcv.height, ctx = pc; ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (mode === 'off') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); phone.tex.needsUpdate = true; return; }
    if (mode === 'lock') {
      ctx.fillStyle = '#cdbda4'; ctx.fillRect(0, 0, w, h); ctx.drawImage(appleCv, 0, h * 0.3, w, h); const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      statusBar(ctx, w, '', o.pct ?? 9); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '300 140px Inter, Arial, sans-serif'; ctx.fillText(o.clock || '02:31', w / 2, 430);
      ctx.font = '500 30px Inter, Arial, sans-serif'; ctx.fillText('dimanche 1 novembre', w / 2, 290);
      if (o.notif) { const a = o.notif; ctx.globalAlpha = a; ctx.fillStyle = 'rgba(40,40,46,0.92)'; ctx.beginPath(); ctx.roundRect(24, 800, w - 48, 190, 30); ctx.fill(); ctx.textAlign = 'left';
        if (o.sms) { ctx.fillStyle = '#34c759'; ctx.beginPath(); ctx.roundRect(48, 830, 64, 64, 16); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(80, 860, 20, 16, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '700 30px Inter, Arial, sans-serif'; ctx.fillText('+33 6 •• •• •• 58', 130, 854); ctx.font = '500 26px Inter, Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('maintenant', 130, 890);
          ctx.fillStyle = '#eee'; ctx.font = '600 34px Inter, Arial, sans-serif'; ctx.fillText('Bien rentrée, Inès ?', 48, 954); }
        else { trackIcon(ctx, 48, 830); ctx.fillStyle = '#fff'; ctx.font = '700 30px Inter, Arial, sans-serif'; ctx.fillText('Traceur inconnu détecté', 130, 854); ctx.font = '500 26px Inter, Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('il y a 1 min', 130, 890);
          ctx.fillStyle = '#eee'; ctx.font = '500 28px Inter, Arial, sans-serif'; ctx.fillText('Un traceur inconnu se déplace', 48, 938); ctx.fillText('avec vous depuis 1 h 07.', 48, 974); }
        ctx.globalAlpha = 1; }
      phone.tex.needsUpdate = true; return;
    }
    if (mode === 'alert') {
      // the alert opened: the map of where it travelled with her, and the two buttons; o.ring: the « Faire sonner » press and the ringing
      darkMap(ctx, w, h * 0.5, 7); ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 7; ctx.setLineDash([2, 14]); ctx.lineCap = 'round'; ctx.beginPath(); [[40, 470], [120, 380], [210, 330], [300, 260], [380, 220], [440, 150]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
      for (const [x, y] of [[40, 470], [210, 330], [380, 220]]) { ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); }
      statusBar(ctx, w, o.clock || '02:42', o.pct ?? 8);
      ctx.fillStyle = '#f5f5f7'; ctx.beginPath(); ctx.roundRect(0, h * 0.46, w, h * 0.54 + 40, 34); ctx.fill();
      trackIcon(ctx, 36, h * 0.46 + 40, 1.1); ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.font = '700 40px Inter, Arial, sans-serif'; ctx.fillText('Traceur inconnu', 124, h * 0.46 + 84);
      ctx.font = '500 27px Inter, Arial, sans-serif'; ctx.fillStyle = '#555'; ctx.fillText('Avec vous depuis 1 h 18 · 4 lieux', 124, h * 0.46 + 124);
      const by = h * 0.46 + 190, ring = o.ring ?? 0;
      ctx.fillStyle = ring > 0 ? '#ffb800' : '#ffcc00'; ctx.beginPath(); ctx.roundRect(36, by, w - 72, 96, 22); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = '700 36px Inter, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ring > 0 ? 'Sonnerie en cours…' : 'Faire sonner', w / 2, by + 60);
      if (ring > 0) for (let k = 0; k < 3; k++) { const rr = ((o.ringT ?? 0) * 0.9 + k / 3) % 1; ctx.strokeStyle = `rgba(255,184,0,${(1 - rr).toFixed(2)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w / 2, by + 230, 30 + 90 * rr, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#e6e6ea'; ctx.beginPath(); ctx.roundRect(36, by + 330, w - 72, 86, 22); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = '600 30px Inter, Arial, sans-serif'; ctx.fillText('En savoir plus', w / 2, by + 384);
      phone.tex.needsUpdate = true; return;
    }
    if (mode === 'nfc') {
      // what the tracker gives a phone held against it: its serial number and the end of its owner's number (o.k: it slides up; o.shot: the screenshot flash)
      ctx.fillStyle = '#0e0f12'; ctx.fillRect(0, 0, w, h); statusBar(ctx, w, o.clock || '02:44', o.pct ?? 7);
      const k = o.k ?? 1, y0 = h * (1 - 0.62 * k);
      ctx.fillStyle = '#f5f5f7'; ctx.beginPath(); ctx.roundRect(16, y0, w - 32, h * 0.62, 34); ctx.fill();
      trackIcon(ctx, w / 2 - 44, y0 + 40, 1.4); ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.font = '700 38px Inter, Arial, sans-serif'; ctx.fillText('Traceur Bluetooth', w / 2, y0 + 190);
      ctx.font = '500 26px Inter, Arial, sans-serif'; ctx.fillStyle = '#666'; ctx.fillText('Numéro de série', w / 2, y0 + 250); ctx.fillStyle = '#111'; ctx.font = '700 40px "Courier New", monospace'; ctx.fillText(SERIAL, w / 2, y0 + 300);
      ctx.font = '500 26px Inter, Arial, sans-serif'; ctx.fillStyle = '#666'; ctx.fillText('Numéro du propriétaire', w / 2, y0 + 370); ctx.fillStyle = '#111'; ctx.font = '700 40px "Courier New", monospace'; ctx.fillText('•• •• •• •• 58', w / 2, y0 + 420);
      ctx.fillStyle = '#e6e6ea'; ctx.beginPath(); ctx.roundRect(48, y0 + 470, w - 96, 80, 20); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = '600 28px Inter, Arial, sans-serif'; ctx.fillText('Instructions de désactivation', w / 2, y0 + 520);
      if (o.shot) { ctx.fillStyle = `rgba(255,255,255,${(0.85 * o.shot).toFixed(2)})`; ctx.fillRect(0, 0, w, h); }
      if (o.thumb) { ctx.save(); ctx.globalAlpha = o.thumb; ctx.fillStyle = '#fff'; ctx.fillRect(28, h - 330, 150, 300); ctx.drawImage(pcv, 0, 0, w, h, 34, h - 324, 138, 288); ctx.restore(); }
      phone.tex.needsUpdate = true; return;
    }
  };
  // his phone: the map app with her dot (e2)
  const drawMap2 = (u, stop) => {
    phone2.screen.material.emissiveIntensity = 0.5; phone2.screen.material.envMapIntensity = 0.3;
    const key = JSON.stringify([u.toFixed(3), stop]); if (key === lastScreen2) return; lastScreen2 = key;
    const w = p2v.width, h = p2v.height, ctx = p2; ctx.setTransform(1, 0, 0, 1, 0, 0);
    darkMap(ctx, w, h, 11); statusBar(ctx, w, '02:58', 64);
    ctx.strokeStyle = 'rgba(80,140,255,0.5)'; ctx.lineWidth = 6; ctx.beginPath(); for (let k = 0; k <= 40; k++) { const [x, y] = routeAt(u * k / 40); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    const [x, y] = routeAt(u); ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.beginPath(); ctx.arc(x, y, 30 + (stop ? 10 * Math.sin(stop * 6) : 0), 0, 7); ctx.fill();
    ctx.fillStyle = '#ff3b30'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(20,22,28,0.9)'; ctx.beginPath(); ctx.roundRect(24, h - 210, w - 48, 170, 26); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '700 32px Inter, Arial, sans-serif';
    ctx.fillText(stop ? 'Immobile' : 'En déplacement', 52, h - 150); ctx.font = '500 26px Inter, Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillText(stop ? 'depuis 1 min' : 'il y a quelques secondes', 52, h - 106);
    phone2.tex.needsUpdate = true;
  };

  // ---------- the phone in a hand (ep21's fit), and other contact helpers from ep24 ----------
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
  const BL = []; { const r = rng(25); for (let b = 1.2; b < 120; b += 3.0 + 2.6 * r()) BL.push(b); }
  const blinkK = (t) => { let k = 0; for (const b0 of BL) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  let curT = 0;
  const show = (av, fn) => { av.root.visible = true; fn(); if (av === ines || av === lea) av.blink(blinkK(curT + (av === lea ? 1.3 : 0))); av.root.updateMatrixWorld(true); };
  const pressPose = (av, side, tgt, pose, spec, probe) => {
    pose(spec); const want = tgt.clone().sub(probe().sub(wp(av.bones[side + 'Hand']))), res = [];
    for (let i = 0; i < 4; i++) { pose((sh, fwd, left, up) => ({ ...spec(sh, fwd, left, up), hand: want })); const r = tgt.clone().sub(probe()); res.push((r.length() * 100).toFixed(1)); if (i < 3) want.add(r); }
    if (DBG) console.log(`DBG press ${side} residuals ${res.join(' -> ')} cm`);
    return want;
  };
  const THUMB = Number(q.get('thumb') ?? -0.15), PK = Number(q.get('pk') ?? -0.45);
  const TRK_PAD = Number(q.get('tpad') ?? 0.018), TRK_CURL = Number(q.get('tcurl') ?? -0.1);   // tip4: the left finger pads on the tracker's back
  const armDown = (s) => (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(up, -0.56).addScaledVector(left, s * 0.1).addScaledVector(fwd, 0.04),
    pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.5).addScaledVector(left, s * 0.25), F: V(0, -1, 0).addScaledVector(fwd, 0.1).normalize(), N: left.clone().multiplyScalar(-s), curl: 0.3 });
  const phoneLap = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.3).addScaledVector(up, 0.24).addScaledVector(left, -0.04),
    pole: P.clone().addScaledVector(up, 0.2).addScaledVector(left, -0.6).addScaledVector(fwd, -0.2), F: up.clone().addScaledVector(fwd, 0.6).normalize(), N: up.clone().multiplyScalar(0.8).addScaledVector(fwd, -0.6).normalize(), curl: 0.08, pk: PK, thumb: THUMB });
  const phoneUp = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.33).addScaledVector(up, 0.36).addScaledVector(left, -0.02),
    pole: P.clone().addScaledVector(up, 0.25).addScaledVector(left, -0.6).addScaledVector(fwd, -0.2), F: up.clone().addScaledVector(fwd, 0.3).normalize(), N: up.clone().multiplyScalar(0.3).addScaledVector(fwd, -1).normalize(), curl: 0.08, pk: PK, thumb: THUMB });
  const phoneHigh = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.36).addScaledVector(up, 0.48).addScaledVector(left, 0.18),   // before her sternum: in the hook's frame under the mirror
    pole: P.clone().addScaledVector(up, 0.1).addScaledVector(left, -0.6).addScaledVector(fwd, -0.2), F: left.clone().addScaledVector(up, 0.35).normalize(), N: up.clone().multiplyScalar(0.25).addScaledVector(fwd, -1).normalize(), curl: 0.08, pk: PK, thumb: THUMB });   // fingers across: the phone upright
  const lapL = (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.26).addScaledVector(up, 0.13).addScaledVector(left, 0.1),
    pole: P.clone().addScaledVector(up, 0.25).addScaledVector(left, 0.6).addScaledVector(fwd, -0.3), F: fwd.clone().addScaledVector(left, -0.4).normalize(), N: V(0, -1, 0) });
  const GRIP = { curlL: 0.5, thumbL: -1.0, curlR: 0.5, thumbR: -1.0 };
  const REAL_FZ = 0.035, REAL_LEAN = -0.42;
  const wheelHand = (car, sd) => (P, fwd, left, up) => { const Wh = car.wheel, ph = sd > 0 ? 0.26 : Math.PI - 0.26;
    const u = V(Math.cos(ph), Math.sin(ph), 0).transformDirection(Wh.matrixWorld), a = V(0, 0, 1).transformDirection(Wh.matrixWorld), Rr = Wh.localToWorld(V(0.185 * Math.cos(ph), 0.185 * Math.sin(ph), 0));
    return { hand: Rr.addScaledVector(u, 0.045).addScaledVector(a, -0.065), pole: P.clone().addScaledVector(up, 0.3).addScaledVector(left, sd * 0.7).addScaledVector(fwd, -0.2), F: a, N: u.clone().negate(), curl: 0.7, thumb: -0.4 }; };
  const seatPose = (av, car, seat, o = {}) => { const h = car.group.localToWorld(car.seats[seat].clone().add(V(0, 0, o.fz ?? 0)));
    sit(av, { pos: V(h.x, h.y, h.z), yaw: car.group.rotation.y, legs: 'chair', floor: toW(car, 0, 0.31, 0).y, seat: 0.11, curl: 0.55, ...o }); };

  // ---------- clearance checks (?dbg=1) ----------
  const skinPts = (av, step, fn) => { const v = V(0, 0, 0); av.root.updateMatrixWorld(true);
    for (const mesh of av.meshes) { if (!mesh.isSkinnedMesh) continue; mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count;
      for (let i = 0; i < n; i += step) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); fn(v, mesh, i); } } };
  const boneOf = (mesh, i) => { const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight; let bi = 0, bw = -1;
    for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; bi = si.getComponent(i, j); } } return mesh.skeleton.bones[bi]; };
  const handSets = new Map();
  const handSet = (av, sd) => { const key = av.root.uuid + sd; if (!handSets.has(key)) { const st = new Set(); av.bones[sd + 'Hand'].traverse((o) => st.add(o)); handSets.set(key, st); } return handSets.get(key); };
  const boxPen = (av, obj, boxes, only = null) => { obj.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), p = V(0, 0, 0); let best = [-1e9, '', ''];
    skinPts(av, 1, (v, mesh, i) => { const b = only ? boneOf(mesh, i) : null; if (only && !only.has(b)) return; p.copy(v).applyMatrix4(inv);
      for (const bx of boxes) { const d = Math.min(bx.h.x - Math.abs(p.x - bx.c.x), bx.h.y - Math.abs(p.y - bx.c.y), bx.h.z - Math.abs(p.z - bx.c.z)); if (d > best[0]) best = [d, bx.nm, (b || boneOf(mesh, i)).name]; } });
    return `${(best[0] * 1000).toFixed(1)}mm ${best[1]} ${best[2]}`; };
  const seatPen = (av, car) => { let best = [-1e9, '', '']; const p = V(0, 0, 0);
    for (const bx of car.boxes) { const inv = new THREE.Matrix4().copy(bx.m.matrixWorld).invert();
      skinPts(av, 3, (v, mesh, i) => { p.copy(v).applyMatrix4(inv); const d = Math.min(bx.w / 2 - Math.abs(p.x), bx.h / 2 - Math.abs(p.y), bx.d / 2 - Math.abs(p.z)); if (d > best[0]) best = [d, bx.nm, boneOf(mesh, i).name]; }); }
    return `${(best[0] * 1000).toFixed(1)}mm ${best[1]} ${best[2]}`; };
  const rimPen = (av, car, sd) => { const inv = new THREE.Matrix4().copy(car.wheel.matrixWorld).invert(), st = handSet(av, sd), p = V(0, 0, 0); let pen = -1e9, nm = '';
    skinPts(av, 1, (v, mesh, i) => { const b = boneOf(mesh, i); if (!st.has(b)) return; p.copy(v).applyMatrix4(inv); const q2 = Math.hypot(p.x, p.y) - 0.185, d = 0.017 - Math.hypot(q2, p.z); if (d > pen) { pen = d; nm = b.name; } });
    return `${(pen * 1000).toFixed(1)}mm ${nm}`; };
  // the nearest skin to a cloth prop's vertices (a coat's two skins, ~1.5 cm apart in the grid): under ~8 mm reads as touching
  const clothGap = (av, coat) => { coat.updateMatrixWorld(true); const pts = [], v = V(0, 0, 0), cell = 0.03, grid = new Map(), key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    coat.traverse((o) => { if (!o.isMesh || !o.geometry.attributes.position) return; const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); const kk = key(v.x, v.y, v.z); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(v.clone()); } });
    let best = 1e9, bn = ''; skinPts(av, 1, (w, mesh, i) => { const cx = Math.floor(w.x / cell), cy = Math.floor(w.y / cell), cz = Math.floor(w.z / cell);
      for (let a = -1; a <= 1; a++) for (let b2 = -1; b2 <= 1; b2++) for (let c = -1; c <= 1; c++) { const l = grid.get(`${cx + a},${cy + b2},${cz + c}`); if (!l) continue; for (const p of l) { const d = p.distanceTo(w); if (d < best) { best = d; bn = boneOf(mesh, i).name; } } } });
    return best > 1 ? 'clear' : `${(best * 1000).toFixed(1)}mm ${bn}${best < 0.008 ? ' TOUCH' : ''}`; };
  const phoneBox = [{ c: V(0, 0, 0), h: V(0.0358, 0.0734, 0.0039), nm: 'phone' }, { c: V(0, 0, 0.0055), h: V(0.0336, 0.071, 0.0016), nm: 'screen+1.5mm' }];
  const dbgShot = (id, t) => {
    const out = [`DBG ${id} t=${t.toFixed(2)}`];
    for (const [nm, av] of [['ines', ines], ['lucas', lucas], ['man', man], ['agent', agent], ['lea', lea]]) {
      if (!av.root.visible) continue;
      if (grey.group.visible && grey.group.parent && (av === ines || av === lucas) && ['hook', 's1b', 's2', 's3', 'etsi', 'r1', 'tip2', 'tip3', 'tip4a', 'tip4b', 'tip5'].includes(id)) out.push(`${nm} seat ${seatPen(av, grey)}`);
      if (av === lucas && grey.group.visible) out.push(`lucas rimL ${rimPen(lucas, grey, 'Left')} rimR ${rimPen(lucas, grey, 'Right')}`);
      if (phone.visible && av === ines) out.push(`phone ${boxPen(ines, phone, phoneBox, handSet(ines, 'Right'))}`);
      if (phone2.visible && av === man) out.push(`phone2 ${boxPen(man, phone2, phoneBox, handSet(man, 'Right'))}`);
      if (coatSeat.visible && coatSeat.parent) out.push(`${nm} coatSeat ${boxPen(av, coatSeat, coatSeat.boxes)}`);
      if (coatDrape.visible && coatDrape.parent) out.push(`${nm} coatDrape ${boxPen(av, coatDrape, coatDrape.boxes)}`);
      if (coatArm.visible && coatArm.parent) { out.push(`${nm} coatArm halves ${boxPen(av, coatArm, coatArm.boxes.filter((b) => b.nm !== 'coat fold'))} cloth ${clothGap(av, coatArm)}`);
        if (av === man) { const inv = new THREE.Matrix4().copy(coatArm.matrixWorld).invert(), p = V(0, 0, 0); let rmax = 0; const st = new Set(); man.bones.LeftForeArm.traverse((o) => st.add(o));
          skinPts(man, 1, (v, mesh, i) => { if (boneOf(mesh, i) !== man.bones.LeftForeArm) return; p.copy(v).applyMatrix4(inv); if (Math.abs(p.x) < 0.15 && p.y > -0.06) rmax = Math.max(rmax, Math.hypot(p.y, p.z)); });
          out.push(`forearm radius ${(rmax * 1000).toFixed(1)}mm vs fold inner ${((coatArm.userData.top.y - 0.007) * 1000).toFixed(1)}mm`); } }
      if (tracker.visible && tracker.parent) out.push(`${nm} tracker ${boxPen(av, tracker, [tracker.box])}`);
      for (const g of [glassHer, glassHis]) if (g.visible && g.parent) out.push(`${nm} glass ${boxPen(av, g, g.boxes || [g.box])}`);
    }
    if (id === 'hook') { const ndc = (v) => { const p = v.clone().project(cam); return `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`; }; out.push(`mirror ndc ${ndc(toW(grey, 0, MIR_Y, MIR_Z))} phone ndc ${ndc(phone.position)} hand ${ndc(wp(ines.bones.RightHand))} lucas head ${ndc(wp(lucas.bones.Head))}`); }
    console.log(out.join(' | '));
  };

  // ---------- the end card ----------
  const endEl = document.getElementById('end');
  const sign = document.createElement('div');
  sign.style.cssText = 'position:absolute;left:50%;top:620px;transform:translateX(-50%);background:#22397a;border:8px solid #2e6b4a;outline:5px solid #e8e6df;border-radius:16px;padding:28px 56px;text-align:center;min-width:640px;font-family:Inter,sans-serif;color:#fff';
  sign.innerHTML = `<div style="display:inline-block;background:#ff2e2e;font-weight:800;font-size:30px;padding:6px 14px;border-radius:8px;letter-spacing:.06em">12 % · SAISON 2</div>
    <div style="font-weight:800;font-size:42px;margin-top:16px;letter-spacing:.03em">PARTIE 3</div><div style="font-weight:800;font-size:76px;line-height:1;margin-top:6px">LE VERRE</div>`;
  const ask = document.createElement('div');
  ask.style.cssText = 'position:absolute;left:0;right:0;top:250px;text-align:center;font:800 64px/1.08 Inter,sans-serif;color:#fff;text-transform:uppercase;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  ask.innerHTML = 'Un <span style="color:#ff2e2e">traceur</span><br>vous suit…<br>vous <span style="color:#ff2e2e">rentrez</span> ?';
  const reply = document.createElement('div');
  reply.style.cssText = 'position:absolute;left:0;right:0;top:500px;text-align:center;font:700 42px/1.2 Inter,sans-serif;color:rgba(255,255,255,.92);text-shadow:0 0 3px #000,0 3px 0 rgba(0,0,0,.6)';
  reply.innerHTML = 'Réponds <span style="color:#ff2e2e;font-weight:800">OUI</span> ou <span style="color:#ff2e2e;font-weight:800">NON</span> en commentaire';
  const follow = document.createElement('div');
  follow.style.cssText = 'position:absolute;left:0;right:0;top:920px;text-align:center;font:800 52px/1.15 Inter,sans-serif;color:#fff;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  follow.innerHTML = '<span style="color:#ff2e2e">ABONNE-TOI</span><br><span style="font-weight:700;font-size:44px">pour voir la Partie 3</span>';
  const fine = document.createElement('div');
  fine.style.cssText = 'position:absolute;left:60px;right:60px;top:1075px;text-align:center;font:500 29px Inter,sans-serif;color:rgba(255,255,255,.8);line-height:1.45';
  fine.innerHTML = 'Fiction. Conseils vérifiés : code pénal (art. 226-1), service-public.fr, aides Apple et Google sur les traceurs.<br>Voix : Kyutai TTS (CC BY 4.0).';
  endEl.querySelector('.t').innerHTML = ''; endEl.querySelector('.n').innerHTML = '';
  endEl.appendChild(ask); endEl.appendChild(reply); endEl.appendChild(sign); endEl.appendChild(fine); endEl.appendChild(follow);
  const tag = makeEndTag({ text: 'Abonne-toi pour la suite', ssaa: globalThis.SSAA });
  { const ic = document.querySelector('#s12 .notif .ic'); if (ic) { ic.style.background = '#34c759'; } }

  // ---------- lights that move with the story (one set per scene) ----------
  const mk = (c, d) => { const o = {}; for (const [k, s] of Object.entries(SCN)) { o[k] = new THREE.PointLight(c, 0, d, 2); s.add(o[k]); } return o; };
  const FILL = mk('#ffd8b0', 3), CABIN = mk('#9ec2ff', 1.8), PASS = mk('#ffb070', 6);
  const lightsOff = () => { for (const o of [FILL, CABIN, PASS]) for (const l of Object.values(o)) l.intensity = 0; };

  // ---------- story positions ----------
  const HOME_X = 0.0;                                                 // her building's door (season 1: bay 2)
  const MAN_STREET = V(2.6, STREET.KERB, STREET.W - STREET.PAVE + 0.9);    // across the street from her building, under the lantern
  const BOLT = () => V(ROOM.DX1 - (ROOM.DX1 - ROOM.DX0) + 0.08, ROOM.Y0 + 1.24, ROOM.Z0 + 0.065);
  const STOOL = BR.stools[2], STOOL_L = BR.stools[1];
  const herWin = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc27a').multiplyScalar(3.0) }));
  herWin.position.set(HERO_BAY, ROOM.SILL + 0.62, -0.62); herWin.visible = false; WD.scene.add(herWin);   // her room's lamp, seen through the dormer (e4)
  const T_RING = Lw(14, 'Faire') + 0.15;
  const T_BEEP = L(15) + 0.05;

  return {
    duration: DUR, fps: 30, captions: [],
    frame(t, opts = {}) {
      curT = t;
      let sh = shotAt(t), id = sh.id, tt = t;
      // the rewind plays the ET SI branch backwards (to the moment in the car before she chooses)
      if (id === 'rewind') { const r = (t - S.rewind.t0) / (S.rewind.t1 - S.rewind.t0); tt = S.stat1.t0 - 0.001 - r * (S.stat1.t0 - S.etsi.t0 - 0.002); sh = shotAt(tt); id = sh.id; }
      const k = clamp((tt - sh.t0) / (sh.t1 - sh.t0));
      const etsi = ETSI(tt), set = SET(id), scene = SCN[set];
      R.renderPass.scene = scene;
      for (const a of everyone) { a.root.visible = false; putIn(a.root, set); }
      for (const p of PROPS) { p.visible = false; putIn(p, set); }
      putIn(grey.group, set); grey.group.visible = false; gHead.intensity = 0;
      lightsOff();
      R.renderer.toneMappingExposure = 1.0; G.uSat.value = 1.0; G.uTint.value.set(1, 1, 1); G.uScan.value = 0; G.uAberr.value = 0; G.uFade.value = 0; G.uVignette.value = 0.75;
      grey.setWindow('RF', 0); grey.setDoor(0); grey.setLocks(0); grey.setDome(0);
      morph(ines, {}); tracker.blink(0); coatSeat.flap(0);
      WD.streetSpot.intensity = 14; WD.roomFill.intensity = 0.6; herWin.visible = id === 'e4';
      STN.flag.update(t);

      // --- the grey car
      const IN_CAR = ['hook', 's1b', 's2', 's3', 'etsi', 'r1', 'tip2', 'tip3', 'tip4a', 'tip4b', 'tip5'].includes(id);
      let gx = 0, gz = LANE, gdist = 0;
      if (set === 'pg') { gx = 30 - 6.0 * (tt - S.hook.t0); gz = LANE; gdist = 30 - gx; }                          // driving down the boulevard at ~22 km/h (the street through the side windows stays readable)
      if (id === 'e1a') { gx = HOME_X + 1.6; gz = KZ; }
      if (set === 'stn') { gz = KZ; gx = ST.DOOR + 0.6; if (id === 'tip1') { const a = arrive(tt, S.tip1.t0 - 0.3, S.tip1.t0 + 2.6, ST.DOOR + 16, ST.DOOR + 0.6); gx = a.x; gdist = ST.DOOR + 16 - gx; } }
      const greyOn = IN_CAR || ['s1a', 'e1a', 'tip1', 'tip6', 'stat1'].includes(id);
      if (greyOn) {
        grey.group.visible = true; place(grey, gx, gz); grey.spin(gdist);
        const parked = set === 'stn' && id !== 'tip1';
        grey.setLights({ head: parked ? 0.3 : 1, tail: 1, brake: id === 'tip1' && k > 0.55 ? 1 : 0, dash: 1 }); gHead.intensity = parked ? 1 : 5;
        // Lucas drives
        show(lucas, () => seatPose(lucas, grey, 'driver', { fz: REAL_FZ, lean: REAL_LEAN, headUp: 0.25, twist: 0, look: id === 'hook' ? toW(grey, 0, MIR_Y, MIR_Z) : id === 'r1' ? toW(grey, -0.42, 1.17, -0.92) : toW(grey, 0.3, 1.1, 6),
          lookK: ['hook', 'r1'].includes(id) ? 1.0 : 0.9, ...GRIP, handL: wheelHand(grey, 1), handR: wheelHand(grey, -1) }));
        if (id === 'hook') morph(lucas, { mouthsmile: 0.4 });
        if (id === 's2') { const t0 = Lw(2, 'Ça'), sp = tt > t0 ? Math.max(0, Math.sin((tt - t0) * 13)) * (1 - smooth(Ln[2].t1, Ln[2].t1 + 0.1, tt)) : 0; morph(lucas, { mouthsmile: 0.35, jawopen: 0.22 * sp }); }
        // the coat on the bench beside her
        coatSeat.visible = true; coatSeat.position.copy(toW(grey, COAT_SEAT.x, COAT_SEAT.y, COAT_SEAT.z)); coatSeat.rotation.set(0, grey.group.rotation.y + Math.PI / 2 + 0.06, 0);   // the flap's free edge toward her
      }
      // --- Inès in the back (rear right): the phone in her right hand
      if (IN_CAR) {
        const look = id === 'hook' ? toW(grey, 0, MIR_Y, MIR_Z) : id === 's2' ? wp(lucas.bones.Head) : id === 'r1' ? toW(grey, 0.5, 1.12, -0.05) : id === 'tip3' ? coatSeat.position.clone() : ['tip4a', 'tip4b', 'tip5'].includes(id) ? toW(grey, -0.4, 0.92, -0.6) : toW(grey, -0.42, 0.72, -0.64);
        const phoneIn = !['tip3', 'r1'].includes(id);
        const TIP4 = ['tip4a', 'tip4b', 'tip5'].includes(id);
        const opts = { look, lookK: 0.9, handL: lapL, curlL: 0.35, footFwd: 0.4, lean: id === 'r1' ? 0.25 : 0, ...(phoneIn ? { curlR: 0.08, pkR: PK, thumbR: THUMB } : {}),
          handR: phoneIn ? (id === 'hook' ? phoneHigh : TIP4 ? phoneUp : phoneLap) : (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(fwd, 0.26).addScaledVector(up, 0.13).addScaledVector(left, -0.1), pole: P.clone().addScaledVector(up, 0.25).addScaledVector(left, -0.6).addScaledVector(fwd, -0.3), F: fwd.clone().addScaledVector(left, 0.4).normalize(), N: V(0, -1, 0) }) };
        show(ines, () => {
          seatPose(ines, grey, 'rearR', opts);
          if (TIP4) {
            // the tracker flat on the phone's back, her left fingers pressing it there (tip4a: brought in over the first part of the shot)
            phoneFit(ines, 'Right', phone);
            const n = V(0, 0, 1).applyQuaternion(phone.quaternion), upP = V(0, 1, 0).applyQuaternion(phone.quaternion);
            const away = id === 'tip4a' ? 0.03 * (1 - smooth(0.1, 0.7, k)) : 0;   // (from 6 cm the left hand fell 1.1 cm short)
            const tc = phone.position.clone().addScaledVector(n, -(0.0039 + 0.0039 + 0.0006 + away)).addScaledVector(upP, 0.052);
            tracker.position.copy(tc); tracker.quaternion.copy(phone.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0.3))); tracker.updateMatrixWorld(true);
            const tgt = tc.clone().addScaledVector(n, -(0.0039 + TRK_PAD)).addScaledVector(upP, -0.016);
            const spec = (sh, fwd, left, up) => ({ hand: tgt.clone().addScaledVector(n, -0.03).addScaledVector(upP, -0.06), pole: sh.clone().addScaledVector(up, -0.35).addScaledVector(left, 0.5).addScaledVector(fwd, -0.2), F: upP.clone(), N: n.clone() });
            pressPose(ines, 'Left', tgt, (arm) => seatPose(ines, grey, 'rearR', { ...opts, curlL: TRK_CURL, thumbL: -0.3, handL: (P, fwd, left, up) => arm(wp(ines.bones.LeftArm), fwd, left, up) }), spec,
              () => wp(ines.bones.LeftHandMiddle2).lerp(wp(ines.bones.LeftHandIndex2), 0.5));
          }
        });
        if (phoneIn) { phone.visible = true; phoneFit(ines, 'Right', phone); }
        if (TIP4) { tracker.visible = true; tracker.blink(0.5 + 0.5 * Math.sin(tt * 12)); }
        CABIN[set].intensity = 0.12; CABIN[set].position.copy(toW(grey, 0, 1.32, -0.55));
        if (set === 'pg') { const ph = (gdist / 9) % 1; PASS.pg.intensity = 3 * Math.pow(Math.sin(Math.PI * ph), 6); PASS.pg.position.copy(toW(grey, -2.5, 3.2, lerp(3, -4, ph))); }
      }
      // tip3: the beep from the coat; she lifts the top layer: the tracker in the lining, its light blinking
      if (id === 'tip3' || id === 'tip4a') {
        const lift = id === 'tip3' ? smooth(0.08, 0.42, k) : 1; coatSeat.flap(0.85 * lift);
        tracker.visible = true; const pk = coatSeat.pocket.c;
        if (id === 'tip3') { tracker.position.copy(coatSeat.localToWorld(V(pk.x, pk.y + 0.004, pk.z + 0.012))); tracker.quaternion.copy(coatSeat.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.4))); }
        tracker.blink(0.5 + 0.5 * Math.sin(tt * 12));
      }
      // --- home (ET SI): the street, the stairs, her room, under her window
      if (id === 'e1a') {
        const A0 = V(gx + 0.98, STREET.KERB, KZ - 1.35), A1 = V(HOME_X + 0.2, STREET.KERB, 0.45), u = smooth(0.0, 1.0, k), pos = A0.clone().lerp(A1, u);
        show(ines, () => walk(ines, { pos, yaw: Math.atan2(A1.x - A0.x, A1.z - A0.z), phase: A0.distanceTo(pos) / (2 * 0.6), stride: 0.6, look: V(HOME_X, 1.7, -1), lookK: 0.5 }));
      }
      if (id === 'e1b') {
        // inside her door: she pushes the bolt (room12's bolt turns)
        WD.room.setBolt(smooth(0.25, 0.6, k)); WD.room.setDoor(0);
        const bt = BOLT();
        show(ines, () => { const pose = (arm) => stand(ines, { pos: V(bt.x - 0.2, ROOM.Y0, bt.z + 0.36), yaw: Math.PI - 0.1, breath: t * 0.4, look: bt, lookK: 0.8, armR: arm, armL: armDown(1) });
          const spec = (sh, fwd, left, up) => ({ hand: bt.clone().add(V(0.02, 0, 0.06)), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5), F: V(0, 1, 0), N: V(0, 0, -1), curl: 0.55 });
          pressPose(ines, 'Right', bt.clone().add(V(0, 0, 0.012)), pose, spec, () => wp(ines.bones.RightHandIndex3).lerp(wp(ines.bones.RightHandThumb3), 0.5)); });
        WD.roomFill.intensity = 0.25; FILL.home.intensity = 0.16; FILL.home.position.copy(bt).add(V(0.4, 0.3, 1.0));
      }
      if (id === 'e2') {
        // the man in the dark street, his phone: her dot moves, stops on her building
        show(man, () => stand(man, { pos: V(MAN_STREET.x + 3, STREET.KERB, MAN_STREET.z), yaw: Math.PI - 0.4, breath: t * 0.35, look: V(MAN_STREET.x + 3 + 0.35 * Math.sin(Math.PI - 0.4), 1.15, MAN_STREET.z + 0.35 * Math.cos(Math.PI - 0.4)), lookK: 0.9,
          armR: (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.32).addScaledVector(left, 0.1), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.45).addScaledVector(fwd, -0.15), F: up.clone().addScaledVector(fwd, 0.25).addScaledVector(left, 0.25).normalize(), N: up.clone().multiplyScalar(0.4).addScaledVector(fwd, -1).normalize(), curl: 0.08, pk: PK, thumb: -1.0 }), armL: armDown(1) }));
        phone2.visible = true; phoneFit(man, 'Right', phone2, 0.027);
        const u = smooth(0.0, 0.62, k); drawMap2(u, k > 0.62 ? (tt - (S.e2.t0 + 0.62 * (S.e2.t1 - S.e2.t0))) : 0);
        FILL.home.intensity = 0.3; FILL.home.position.copy(phone2.position).add(V(0, 0.25, 0.35));
      }
      if (id === 'e3') {
        // her phone on the bed lights up; Apple asleep against her pillow
        WD.roomFill.intensity = 0.15;
        phone.visible = true; phone.position.set(2.15, ROOM.Y0 + 0.594 + 0.004, -3.0); phone.rotation.set(-Math.PI / 2, 0, 0.3); phone.updateMatrixWorld(true);
        apple.root.visible = true; apple.root.position.set(1.8, ROOM.Y0 + 0.5, -3.72); apple.root.rotation.y = 0.9; apple.update(tt, { look: phone.position.clone(), slowBlinkAt: [S.e3.t0 + 1.4] });
        FILL.home.intensity = 0.05 + 0.25 * smooth(0.15, 0.3, k); FILL.home.position.copy(phone.position).add(V(0, 0.3, 0));
      }
      if (id === 'e4') {
        // under her window, across the street: he looks up from his phone at her window
        const up = smooth(0.25, 0.75, k);
        show(man, () => stand(man, { pos: MAN_STREET, yaw: Math.PI, breath: t * 0.35, look: V(MAN_STREET.x, 1.2, MAN_STREET.z - 1).lerp(V(HERO_BAY, ROOM.SILL + 0.6, 0), up), lookK: 0.95, headUp: 0.6 * up, armR: armDown(-1), armL: armDown(1) }));
      }

      // --- the commissariat
      if (id === 'tip6') {
        // she walks from the car to the doors, her coat over her arm and the tracker in her fist
        const A0 = V(gx - 1.0, STREET.KERB, STREET.PAVE - 0.4), A1 = V(ST.DOOR, STREET.KERB, 0.5), u = smooth(0.05, 0.95, k), pos = A0.clone().lerp(A1, u);
        show(ines, () => walk(ines, { pos, yaw: Math.atan2(A1.x - A0.x, A1.z - A0.z), phase: A0.distanceTo(pos) / (2 * 0.6), stride: 0.6, look: V(ST.DOOR, 1.8, -1), lookK: 0.5 }));
      }
      const D = ST.DESK, DH = ST.DESK_H;
      if (['r2', 'tw1', 'tw5'].includes(id)) {
        // the office: the agent at her screen, Inès across the desk, the tracker on the desk between them
        show(agent, () => sit(agent, { pos: V(D.x + 0.72, 0.47, D.z), yaw: -Math.PI / 2, legs: 'chair', floor: 0, seat: 0.11, look: id === 'tw1' ? V(D.x - 0.72, 1.15, D.z + 0.05) : STN.monitorScreen.getWorldPosition(V(0, 0, 0)), lookK: 0.9,
          handR: (P, fwd, left, up) => ({ hand: STN.keyboard.position.clone().add(V(0.02, 0.03, -0.08)), pole: P.clone().addScaledVector(up, 0.2).addScaledVector(left, -0.6), F: fwd.clone(), N: V(0, -1, 0), curl: 0.3 }),
          handL: (P, fwd, left, up) => ({ hand: STN.keyboard.position.clone().add(V(0.02, 0.03, 0.08)), pole: P.clone().addScaledVector(up, 0.2).addScaledVector(left, 0.6), F: fwd.clone(), N: V(0, -1, 0), curl: 0.3 }) }));
        show(ines, () => sit(ines, { pos: V(D.x - 0.7, 0.47, D.z + 0.05), yaw: Math.PI / 2, legs: 'chair', floor: 0, seat: 0.11, look: id === 'tw5' ? V(D.x - 0.42, 0.82, D.z + 0.05) : wp(agent.bones.Head), lookK: 0.85, handL: lapL, curlL: 0.35,
          handR: id === 'tw5' ? phoneLap : lapL, ...(id === 'tw5' ? { curlR: 0.08, pkR: PK, thumbR: THUMB } : {}) }));
        if (id === 'tw5') { phone.visible = true; phoneFit(ines, 'Right', phone); }
        tracker.visible = true; tracker.position.set(D.x - 0.12, DH + 0.0039, D.z + 0.12); tracker.rotation.set(-Math.PI / 2, 0, 0.5); tracker.updateMatrixWorld(true);
        if (id === 'tw1') { const sp = Math.max(0, Math.sin((tt - S.tw1.t0) * 13)) * (1 - smooth(Ln[20].t1, Ln[20].t1 + 0.1, tt)); morph(agent, { jawopen: 0.25 * sp }); }
      }

      // --- the bar (1:24): the flashback
      if (set === 'bar') {
        const sitBar = (av, st, o = {}) => sit(av, { pos: V(st.pos.x, BAR.SEAT + 0.005, st.pos.z), yaw: Math.PI, legs: 'chair', floor: 0.315, seat: 0.11, ...o });   // feet on the foot ring
        show(ines, () => sitBar(ines, STOOL, { look: id === 'tw3a' || id === 'tw3b' ? V(STOOL.pos.x + 0.55, 1.62, STOOL.pos.z + 0.6) : id === 'tw4' ? V(STOOL.pos.x + 0.1, BAR.CY, BAR.CZ - 0.2) : V(STOOL_L.pos.x, 1.25, STOOL_L.pos.z), lookK: 0.8, handL: lapL, handR: (P, fwd, left, up) => ({ hand: V(STOOL.pos.x - 0.24, BAR.CY + 0.04, BAR.CZ - 0.13), pole: P.clone().addScaledVector(up, 0.2).addScaledVector(left, -0.6), F: fwd.clone(), N: V(0, -1, 0), curl: 0.5 }) }));
        show(lea, () => sitBar(lea, STOOL_L, { look: id === 'tw2' ? STOOL.back.c.clone().add(V(0, -0.2, 0.1)) : wp(ines.bones.Head), lookK: 0.85, twist: id === 'tw2' ? 0.35 : 0, handL: lapL, handR: lapL }));
        if (id === 'tw2') { const sp = Math.max(0, Math.sin((tt - Lw(21, 'Inès')) * 12)) * smooth(Lw(21, 'Inès') - 0.05, Lw(21, 'Inès'), tt); morph(lea, { jawopen: 0.3 * sp }); }
        morph(ines, { mouthsmile: id === 'tw2' ? 0.3 : 0.15 });
        // her coat: over the stool's back, then sliding off (tw2), then in his hands (tw3)
        if (id === 'tw2') { coatDrape.visible = true; const sl = smooth(0.55, 1.0, k); coatDrape.position.copy(STOOL.back.c).add(V(0, -0.35 * sl * sl, 0.12 * sl)); coatDrape.rotation.set(-0.5 * sl, Math.PI, 0); }
        if (id === 'tw3a' || id === 'tw3b') {
          const rise = id === 'tw3a' ? 0.45 + 0.55 * smooth(0.0, 0.7, k) : 1;
          const manO = (armR) => ({ pos: V(STOOL.pos.x + 0.55, 0, STOOL.pos.z + 0.6), yaw: Math.PI + 0.9, crouch: 0.45 * (1 - rise), hipBend: 0.6 * (1 - rise), breath: t * 0.35, look: wp(ines.bones.Head), lookK: 0.85,
            armL: (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(fwd, 0.48).addScaledVector(up, -0.26).addScaledVector(left, -0.12), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, 0.5), F: fwd.clone(), N: V(0, 1, 0), curl: 0.25 }), armR });
          const armR0 = (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(fwd, 0.36).addScaledVector(up, -0.22).addScaledVector(left, 0.12), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5), F: fwd.clone(), N: left.clone().negate(), curl: 0.5 });
          const placeCoat = () => { const fa = wp(man.bones.LeftForeArm), hd = wp(man.bones.LeftHand), X = hd.clone().sub(fa).normalize(), Y = V(0, 1, 0).addScaledVector(X, -X.y).normalize(), Z = X.clone().cross(Y);
            coatArm.position.copy(fa.clone().lerp(hd, 0.4)); coatArm.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); coatArm.updateMatrixWorld(true); };
          show(man, () => {
            stand(man, manO(armR0)); man.root.updateMatrixWorld(true); placeCoat();
            if (id === 'tw3b') {
              const gap = coatArm.localToWorld(V(-0.125, -0.17, 0)), Fd = V(0, 1, 0).transformDirection(coatArm.matrixWorld), Nd = V(0, 0, -1).transformDirection(coatArm.matrixWorld);
              const Xd = V(1, 0, 0).transformDirection(coatArm.matrixWorld);
              const spec = (sh, fwd, left, up) => ({ hand: gap.clone().addScaledVector(Xd, -0.09), pole: sh.clone().addScaledVector(up, -0.45).addScaledVector(left, -0.3), F: Xd.clone(), N: Nd.clone(), curl: 0.35, thumb: 0.2 });
              pressPose(man, 'Right', gap, (arm) => stand(man, manO(arm)), spec, () => wp(man.bones.RightHandIndex3).lerp(wp(man.bones.RightHandThumb3), 0.5));
              man.root.updateMatrixWorld(true); placeCoat();
            }
          });
          morph(man, { mouthsmile: 0.45 });
          coatArm.visible = true;
          if (id === 'tw3b') { tracker.visible = true; tracker.position.copy(wp(man.bones.RightHandIndex3).lerp(wp(man.bones.RightHandThumb3), 0.5)); tracker.quaternion.copy(coatArm.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))); }
        }
        if (id === 'tw4') {
          glassHer.visible = true; glassHer.position.set(STOOL.pos.x - 0.04, BAR.CY, BAR.CZ - 0.22);
          glassHis.visible = true; const set2 = smooth(0.1, 0.75, k); glassHis.position.set(STOOL.pos.x + 0.15 + 0.08 * (1 - set2), BAR.CY, BAR.CZ - 0.24); glassHis.updateMatrixWorld(true);
          // his index finger on the glass's foot as he slides it over to hers
          const stem = glassHis.position.clone().add(V(0.031, 0.0235, 0.004));
          const manO = (armR) => ({ pos: V(STOOL.pos.x + 0.42, 0, -0.3), yaw: Math.PI - 0.2, hipBend: 0.3, breath: t * 0.35, look: stem, lookK: 0.6, armL: armDown(1), armR });
          const spec = (sh, fwd, left, up) => ({ hand: stem.clone().add(V(0.09, 0.03, 0.02)), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, 0.5), F: V(-1, -0.35, 0).normalize(), N: V(0, -1, 0), curl: 0.62, idx: 0.0, thumb: 0.3 });
          show(man, () => pressPose(man, 'Left', stem, (arm) => stand(man, { ...manO(armDown(-1)), armL: arm }), spec, () => { const a = wp(man.bones.LeftHandIndex3), b2 = wp(man.bones.LeftHandIndex2); return a.addScaledVector(a.clone().sub(b2).normalize(), 0.009); }));
        }
        if (['tw2', 'tw3a'].includes(id)) { show(exA, () => sit(exA, { pos: V(-0.2, 0.47, 2.95), yaw: Math.PI, legs: 'chair', floor: 0, seat: 0.11, look: V(-0.2, 1.0, 2.3), lookK: 0.6 })); show(exB, () => sit(exB, { pos: V(0.1, 0.47, 2.05), yaw: 0, legs: 'chair', floor: 0, seat: 0.11, look: V(-0.2, 1.2, 2.9), lookK: 0.6 })); }
      }
      // the Bordeaux cards: a tracker hidden in a car (stat1), in a coat's lining (stat2)
      if (id === 'stat1') { tracker.visible = true; tracker.position.copy(toW(grey, -0.37, 0.33, -0.36)); tracker.quaternion.copy(grey.group.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.2))); tracker.blink(0.5 + 0.5 * Math.sin(tt * 12)); }
      if (id === 'stat2') { coatSeat.visible = true; coatSeat.position.set(ST.DESK.x - 0.1, ST.DESK_H, ST.DESK.z); coatSeat.rotation.set(0, Math.PI + 0.3, 0); coatSeat.flap(0.9);
        tracker.visible = true; const pk = coatSeat.pocket.c; tracker.position.copy(coatSeat.localToWorld(V(pk.x, pk.y + 0.004, pk.z + 0.012))); tracker.quaternion.copy(coatSeat.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.4))); tracker.blink(0.5 + 0.5 * Math.sin(tt * 12)); }

      // --- phone screens
      if (phone.visible) {
        const pct = ['tw5'].includes(id) ? 6 : IN_CAR && set === 'pg' ? 9 : etsi ? 8 : 7;
        if (['hook', 's1b', 's3', 'etsi'].includes(id)) drawScreen('lock', { clock: '02:31', pct: 9, notif: 1 });
        else if (id === 's2') drawScreen('lock', { clock: '02:32', pct: 9, notif: 1 });
        else if (id === 'tip2') drawScreen('alert', { clock: '02:42', pct: 8, ring: tt > T_RING ? 1 : 0, ringT: tt - T_RING });
        else if (id === 'tip4a') drawScreen('alert', { clock: '02:43', pct: 8, ring: 1, ringT: tt - T_RING });
        else if (id === 'tip4b') drawScreen('nfc', { clock: '02:43', pct: 7, k: smooth(0, 0.35, k) });
        else if (id === 'tip5') { const sk = tt - L(17); drawScreen('nfc', { clock: '02:44', pct: 7, k: 1, shot: Math.max(0, 1 - Math.abs(sk - 0.15) / 0.15) * (sk > 0 ? 1 : 0), thumb: smooth(0.3, 0.5, sk) * (1 - smooth(1.6, 1.9, sk)) }); }
        else if (id === 'e3') drawScreen('lock', { clock: '03:02', pct: 8, notif: smooth(0.15, 0.3, k), sms: true });
        else if (id === 'tw5') drawScreen('lock', { clock: '02:56', pct: 6 });
        else drawScreen('lock', { clock: '02:31', pct });
      }

      // --- cameras
      const carCam = (car, kk, a, b, ta, tb, fa, fb = fa) => { const e = smooth(0, 1, kk);
        cam.position.copy(toW(car, lerp(a.x, b.x, e), lerp(a.y, b.y, e), lerp(a.z, b.z, e))); cam.up.set(0, 1, 0);
        cam.lookAt(toW(car, lerp(ta.x, tb.x, e), lerp(ta.y, tb.y, e), lerp(ta.z, tb.z, e))); cam.fov = lerp(fa, fb, e); };
      const phoneCam = (dist = 0.27, fov = 34) => { const upv = V(0, 1, 0).applyQuaternion(phone.quaternion), n = V(0, 0, 1).applyQuaternion(phone.quaternion);
        cam.position.copy(phone.position).addScaledVector(n, dist); if (ines.root.visible) { const hd = wp(ines.bones.Head).add(V(0, 0.06, 0)), dh = cam.position.distanceTo(hd); if (dh < 0.14) cam.position.addScaledVector(V(-1, 0, 0).applyQuaternion(ines.root.quaternion), 0.14 - dh); }
        cam.up.copy(upv); cam.lookAt(phone.position.clone().addScaledVector(upv, -0.012)); cam.up.set(0, 1, 0); cam.fov = fov; };
      const fixed = (a, b, ta, tb, fa, fb = fa) => { const e = smooth(0, 1, k); cam.position.copy(a).lerp(b, e); cam.up.set(0, 1, 0); cam.lookAt(ta.clone().lerp(tb, e)); cam.fov = lerp(fa, fb, e); };
      cam.near = 0.012; cam.far = 900;
      if (id === 'hook') {
        // her eyes in the back seat: Lucas half-turned to her with his easy smile, the alert in her hand at the bottom of the frame
        const e = smooth(0, 1, k), eye = wp(ines.bones.Head).add(V(0, 0.07, 0)), M = toW(grey, 0, MIR_Y, MIR_Z), dM = M.clone().sub(eye).normalize(), dP = phone.position.clone().sub(eye).normalize();
        cam.position.copy(eye).addScaledVector(dM, 0.12).add(toW(grey, 0.1, 0.05, 0).sub(toW(grey, 0, 0, 0))); cam.up.set(0, 1, 0); cam.lookAt(M.clone().lerp(phone.position, 0.72)); cam.fov = lerp(64, 62, e);   // the mirror (his eyes) up, the alert down, both in the narrow frame
      }
      if (id === 's1a') fixed(V(gx + 10, 2.0, LANE + 5.5), V(gx + 6.5, 1.9, LANE + 5.6), V(gx, 0.8, LANE), V(gx, 0.8, LANE), 44, 42);
      if (id === 's1b') phoneCam(0.28, 34);
      if (id === 's2') { const hl = grey.group.worldToLocal(wp(lucas.bones.Head)); carCam(grey, k, V(-0.36, 1.13, 0.2), V(-0.36, 1.13, 0.18), hl.clone().add(V(0, -0.05, 0)), hl.clone().add(V(0, -0.05, 0)), 50, 47); }
      if (id === 's3' || id === 'etsi') { carCam(grey, id === 'etsi' ? 0.6 + 0.4 * k : 0.6 * k, V(0.02, 1.13, -0.4), V(0.0, 1.13, -0.42), V(-0.42, 1.17, -0.96), V(-0.42, 1.17, -0.96), 36, 32); cam.lookAt(wp(ines.bones.Head).add(V(0, 0.06, 0))); }
      if (id === 'r1') { carCam(grey, k, V(0.0, 1.12, -0.3), V(-0.02, 1.12, -0.32), V(-0.42, 1.17, -0.96), V(-0.42, 1.17, -0.96), 40, 37); cam.lookAt(wp(ines.bones.Head).add(V(0, 0.05, 0))); }
      if (id === 'e1a') fixed(V(HOME_X + 6.0, 1.55, 6.3), V(HOME_X + 5.6, 1.55, 6.1), V(HOME_X + 1.2, 1.1, 1.3), V(HOME_X + 1.0, 1.1, 1.2), 40, 38);
      if (id === 'e1b') { const bt = BOLT(); fixed(V(4.45, ROOM.Y0 + 1.45, -3.25), V(4.43, ROOM.Y0 + 1.44, -3.28), bt.clone().add(V(-0.12, -0.15, 0)), bt.clone().add(V(-0.12, -0.15, 0)), 46, 43); }
      if (id === 'e2') { const n = V(0, 0, 1).applyQuaternion(phone2.quaternion), upv = V(0, 1, 0).applyQuaternion(phone2.quaternion); cam.position.copy(phone2.position).addScaledVector(n, 0.3); cam.up.copy(upv); cam.lookAt(phone2.position.clone().addScaledVector(upv, -0.012)); cam.up.set(0, 1, 0); cam.fov = 34; }
      if (id === 'e3') fixed(V(2.62, ROOM.Y0 + 1.12, -2.48), V(2.6, ROOM.Y0 + 1.1, -2.52), V(1.98, ROOM.Y0 + 0.62, -3.38), V(1.98, ROOM.Y0 + 0.62, -3.38), 38, 35);
      if (id === 'e4') { const hd = wp(man.bones.Head), win = V(HERO_BAY, ROOM.SILL + 0.65, -0.3), c0 = hd.clone().add(V(-0.4, -0.04, 1.0)), c1 = hd.clone().add(V(-0.38, -0.05, 0.96));
        const az = win.clone().sub(c0).setY(0).normalize(), aim = (c, el) => c.clone().add(az.clone().multiplyScalar(Math.cos(el))).add(V(0, Math.sin(el), 0));
        fixed(c0, c1, aim(c0, 0.55), aim(c1, 0.53), 72, 70); }
      if (id === 'stat1') carCam(grey, k, V(-0.2, 0.62, -0.75), V(-0.21, 0.6, -0.72), V(-0.37, 0.33, -0.36), V(-0.37, 0.33, -0.36), 34, 30);
      if (id === 'stat2') fixed(V(D.x - 0.1, DH + 0.42, D.z + 0.36), V(D.x - 0.1, DH + 0.4, D.z + 0.33), tracker.position.clone(), tracker.position.clone(), 36, 32);
      if (id === 'tip1') fixed(V(ST.DOOR + 1.0, 1.6, 8.0), V(ST.DOOR + 0.8, 1.6, 7.8), V(ST.DOOR, 2.6, 0), V(ST.DOOR, 2.6, 0), 54, 52);
      if (id === 'tip2') phoneCam(0.27, 34);
      if (id === 'tip3') { const pkw = coatSeat.localToWorld(coatSeat.pocket.c.clone()), pl = grey.group.worldToLocal(pkw.clone()); carCam(grey, k, V(pl.x - 0.32, pl.y + 0.42, pl.z + 0.12), V(pl.x - 0.3, pl.y + 0.4, pl.z + 0.1), pl, pl, 42, 38); }
      if (id === 'tip4a') { const n = V(0, 0, 1).applyQuaternion(phone.quaternion), upP = V(0, 1, 0).applyQuaternion(phone.quaternion), side = V(1, 0, 0).applyQuaternion(phone.quaternion), c = tracker.position.clone();
        cam.position.copy(c).addScaledVector(n, 0.12).addScaledVector(side, -0.26).addScaledVector(upP, 0.07); cam.lookAt(c.clone().addScaledVector(n, 0.004)); cam.fov = 36; }
      if (id === 'tip4b' || id === 'tip5') phoneCam(0.27, 34);
      if (id === 'tip6') fixed(V(ST.DOOR - 3.6, 1.5, 4.8), V(ST.DOOR - 3.4, 1.5, 4.6), V(ST.DOOR, 1.5, 0.4), V(ST.DOOR, 1.5, 0.2), 48, 46);
      if (id === 'r2') { const ah = wp(agent.bones.Head); fixed(V(D.x - 1.18, 1.58, D.z + 0.22), V(D.x - 1.14, 1.57, D.z + 0.21), ah.clone().add(V(-0.3, -0.3, 0)), ah.clone().add(V(-0.3, -0.32, 0)), 46, 44); }
      if (id === 'tw1') { const hd = wp(agent.bones.Head); fixed(hd.clone().add(V(-0.95, -0.05, 0.42)), hd.clone().add(V(-0.9, -0.05, 0.4)), hd.clone().add(V(0, 0.02, 0)), hd.clone().add(V(0, 0.02, 0)), 30, 27); }
      if (id === 'tw5') { const hd = wp(ines.bones.Head); fixed(hd.clone().add(V(0.85, 0.0, 0.35)), hd.clone().add(V(0.8, 0.0, 0.33)), hd.clone().add(V(0, -0.04, 0)), hd.clone().add(V(0, -0.04, 0)), 32, 29); }
      if (id === 'tw2') fixed(V(STOOL.pos.x + 0.95, 1.12, STOOL.pos.z + 0.8), V(STOOL.pos.x + 0.92, 1.11, STOOL.pos.z + 0.77), V(STOOL.pos.x - 0.05, 0.98, STOOL.pos.z + 0.12), V(STOOL.pos.x - 0.05, 0.96, STOOL.pos.z + 0.12), 46, 44);
      if (id === 'tw3a') fixed(V(STOOL.pos.x + 1.25, 1.4, BAR.CZ - 0.85), V(STOOL.pos.x + 1.2, 1.4, BAR.CZ - 0.8), V(STOOL.pos.x + 0.35, 1.2, STOOL.pos.z + 0.5), V(STOOL.pos.x + 0.35, 1.28, STOOL.pos.z + 0.5), 44, 42);
      if (id === 'tw3b') { const c = coatArm.localToWorld(V(-0.125, -0.17, 0)), X = V(1, 0, 0).transformDirection(coatArm.matrixWorld), Z = V(0, 0, 1).transformDirection(coatArm.matrixWorld);
        // the coat's edge by his elbow: his fingers slipping the tracker in between the halves
        fixed(c.clone().addScaledVector(X, -0.22).addScaledVector(Z, 0.2).add(V(0, 0.04, 0)), c.clone().addScaledVector(X, -0.21).addScaledVector(Z, 0.19).add(V(0, 0.04, 0)), c, c, 38, 35); }
      if (id === 'tw4') { const c = V(STOOL.pos.x + 0.06, BAR.CY + 0.07, BAR.CZ - 0.23); fixed(c.clone().add(V(-0.02, 0.26, 0.82)), c.clone().add(V(-0.02, 0.25, 0.79)), c, c, 34, 32); }
      if (id === 'end') fixed(V(ST.DOOR + 3.2, 1.6, 6.5), V(ST.DOOR + 3.0, 1.6, 6.3), V(ST.DOOR, 2.4, 0), V(ST.DOOR, 2.4, 0), 50);
      if (id === 's3' || id === 'etsi' || id === 'r1' || id === 's2') cam.near = 0.012;
      if (set === 'stn' || set === 'home' || set === 'bar') cam.near = Math.min(cam.near, 0.02);
      cam.updateProjectionMatrix(); cam.updateMatrixWorld();

      if (greyOn) { const M = toW(grey, 0, MIR_Y, MIR_Z), eI = ines.root.visible ? wp(ines.bones.Head).add(V(0, 0.07, 0)) : toW(grey, -0.42, 1.17, -0.95), eD = wp(lucas.bones.Head).add(V(0, 0.12, 0));
        const n = eI.clone().sub(M).normalize().add(eD.clone().sub(M).normalize()).normalize(); grey.mirror.parent.lookAt(M.clone().sub(n)); grey.mirror.parent.updateMatrixWorld(true); }
      // --- looks
      if (etsi && id !== 'etsi') { G.uSat.value = 0.4; G.uTint.value.set(1.05, 0.96, 0.94); }
      if (IN_CAR) { R.renderer.toneMappingExposure = 1.35; FILL[set].intensity = 0.22; FILL[set].position.copy(cam.position).add(V(0, 0.18, 0)); }
      if (id === 'hook') { CABIN[set].intensity = 0.16; CABIN[set].position.copy(toW(grey, -0.1, 1.28, -0.2)); }   // (0.5 by the console burnt his hand on the wheel white)
      if (id === 'tip3') { FILL[set].intensity = 0.45; FILL[set].position.copy(coatSeat.position).add(V(0, 0.55, 0)); }
      if (set === 'bar') { G.uSat.value = 0.62; G.uTint.value.set(1.08, 0.98, 0.88); G.uVignette.value = 1.1; R.renderer.toneMappingExposure = 1.25; FILL.bar.intensity = ['tw3b', 'tw4'].includes(id) ? 0.12 : 0.35; FILL.bar.position.copy(cam.position).add(V(0, 0.3, 0)); }
      if (['stat1', 'stat2'].includes(id)) { G.uSat.value = 0.25; R.renderer.toneMappingExposure = 1.25; FILL[set].intensity = id === 'stat1' ? 1.4 : 0.6; FILL[set].position.copy(cam.position).add(V(0.1, 0.25, 0)); }
      if (['r2', 'tw1', 'tw5'].includes(id)) R.renderer.toneMappingExposure = 0.95;
      if (['e1a', 'e4'].includes(id)) R.renderer.toneMappingExposure = 1.45;
      if (id === 'e1b') { R.renderer.toneMappingExposure = 1.3; FILL.home.intensity = 0.3; }
      if (id === 'end') G.uFade.value = 1;
      if (S.rewind.t0 <= t && t < S.rewind.t1) { G.uScan.value = 1.0; G.uSat.value = 0.4; G.uAberr.value = 0.012; }

      // --- overlay
      const endK = smooth(S.end.t0, S.end.t0 + 0.6, t);
      const close = ['s3', 'etsi', 'r1', 'tw1', 'tw5', 'e4'].includes(id), phoneShot = phone.visible && ['s1b', 'tip2', 'tip4b', 'tip5'].includes(id);
      const plate = id === 's1a' ? { a: '2 h 31', b: 'BOULEVARD DE CLICHY · 9 %', k: smooth(S.s1a.t0 + 0.1, S.s1a.t0 + 0.4, t) * (1 - smooth(S.s1a.t1 - 0.3, S.s1a.t1, t)) }
        : id === 'tw2' ? { a: '1 h 24', b: 'LE BAR · UNE HEURE PLUS TÔT', k: smooth(S.tw2.t0 + 0.1, S.tw2.t0 + 0.4, t) * (1 - smooth(S.tw2.t1 - 0.3, S.tw2.t1, t)) } : null;
      const clock = set === 'bar' ? '01:24' : etsi ? (['e3', 'e4'].includes(id) ? '03:02' : '02:45') : ['r2', 'tw1', 'tw5', 'end'].includes(id) ? '02:56' : set === 'stn' ? '02:43' : '02:31';
      const bat = id === 'tw5' || id === 'end' ? 6 : set === 'stn' ? 7 : etsi ? 8 : 9;
      const card = (a, b, s0) => ({ a, b, k: smooth(s0 + 0.1, s0 + 0.4, t) });
      ov.apply({ t, time: clock, bat, statA: id === 'end' || id === 'hook' || set === 'bar' ? 0 : 1, serA: id === 'end' ? 0 : 1, part: 'S2 · PARTIE 2',
        capA: id === 'end' ? 0 : 1, capY: id === 'hook' ? 55 : close ? 72 : phoneShot ? 84 : 57, plate,
        etsi: id === 'etsi' ? smooth(S.etsi.t0, S.etsi.t0 + 0.25, t) : 0,
        rew: S.rewind.t0 <= t && t < S.rewind.t1 ? 1 : 0,
        notif: id === 'e3' ? { from: '+33 6 •• •• •• 58', when: 'maintenant', msg: 'Bien rentrée, Inès ?', k: smooth(S.e3.t0 + 0.5, S.e3.t0 + 0.8, t) } : null,
        news: id === 'stat1' ? card('AVRIL 2024 · BORDEAUX', '18 mois de prison ferme : il suivait son ex avec un traceur caché dans sa voiture', S.stat1.t0)
          : id === 'stat2' ? card('AVANT ÇA : DANS LA DOUBLURE D’UN MANTEAU', 'tribunal correctionnel de Bordeaux, 4 avril 2024', S.stat2.t0)
            : id === 'tip1' ? card('JAMAIS CHEZ VOUS', 'allez dans un lieu public, éclairé', S.tip1.t0)
              : id === 'tip2' ? card('« FAIRE SONNER »', 'sur l’alerte : le traceur sonne, il est sur vous', S.tip2.t0)
                : id === 'tip4a' || id === 'tip4b' ? card('AU DOS DU TÉLÉPHONE', 'son numéro de série, parfois la fin du numéro du propriétaire', S.tip4a.t0)
                  : id === 'tip5' ? card('CAPTURE D’ÉCRAN', 'et gardez le traceur : c’est une preuve', S.tip5.t0)
                    : id === 'tip6' ? card('ARTICLE 226-1 DU CODE PÉNAL', 'géolocaliser quelqu’un sans son accord : 1 an de prison, 45 000 € d’amende', S.tip6.t0)
                      : id === 'r2' ? card('LA POLICE DOIT PRENDRE VOTRE PLAINTE', 'dans le commissariat de votre choix', S.r2.t0) : null,
        capHtml: opts.cover ? '<span class="w1">Un </span><span class="r1">traceur</span><span class="w1"> vous suit…</span><br><span class="w1">vous </span><span class="r1">rentrez</span><span class="w1"> chez vous ?</span>'
          : id === 'hook' ? Ln[0].units.map((u) => { const on = t >= u.t0 - 0.12; return `<span class="${u.red ? (on ? 'r1' : 'r0') : (on ? 'w1' : 'w0')}">${u.shown}</span>${u.shown.endsWith('…') ? '<br>' : ' '}`; }).join('') : null,
        peep: 0, black: 0 });
      endEl.style.opacity = String(endK);
      tag.update(t, S.end.t0 + 0.6, endK);
      R.bloom.threshold = Math.min(0.85, 0.95 / R.renderer.toneMappingExposure);
      if (DBG) dbgShot(id, t);
      R.composer.render();
    },
  };
}
