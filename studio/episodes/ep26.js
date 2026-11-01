// « 12 % » Saison 2 · Partie 3 · Le verre (~90 s). Scarier from this part on (owner, 31 Oct 2026). 2:58 am, the commissariat:
// the officer reads Inès's complaint back, « Et ce verre, à côté du vôtre… vous l'avez bu ? ». 1:24, the bar « Minuit »: Léa is in
// the toilets, a full glass stands next to hers, nobody saw it poured; in the mirror behind the bottles, the man who set it there.
// « ET SI… » she drinks: ten minutes later the room tilts, sounds stretch, her legs give way; a hand closes on her arm, « Elle a trop
// bu. Je la ramène. », nobody moves, the bar door swings shut, her phone left on the counter (« t'es où ?? »). ANSM 2024: 1 377
// suspected cases of chemical submission, most often in an alcoholic drink, two victims in three remember nothing (notes/facts.md).
// Rewind: she does not drink; a glass you did not see poured, you do not touch; a glass left alone, you order another; she shows it
// to the barman; a sudden malaise: alert a friend, the staff, the 15 or the 17; then blood and urine samples, fast; art. 222-30-1.
// 3:05, leaving, the bar's receipt in her coat pocket: one cocktail she never ordered; on the back, by hand: « Tu n'as pas bu. La
// prochaine fois, Inès. » 3 %.
// Two sets in two scenes (the bar, the commissariat); every cut sits on the narration (audio/vo/ep26_*.json); every pose is rebuilt
// from rest each frame; the bar's mirror is a real Reflector (his face behind her in it).
import * as THREE from 'three';
import { createRenderer, rng, smooth, clamp } from '../engine/core.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { fadeShadowBorders } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, sit, POSE } from '../engine/poses.js';
import { makeCat } from '../engine/cat.js';
import { makePhone } from '../engine/props16.js';
import { makeEndTag } from '../engine/endtag.js';
import { renderShot } from '../engine/ads19.js';
import { Overlay12 } from '../engine/s12.js';
import { buildStation, ST } from '../engine/station25.js';
import { buildBar, makeGlass, BAR } from '../engine/bar25.js';
import { makeCoat } from '../engine/props25.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
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
  const VO = await (await fetch(`/audio/vo/ep26_${q.get('voice') || 'developpeuse'}.json`)).json();
  const ov = new Overlay12(VO, { etsiSub: 'ELLE BOIT' });
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
    ['hook', 0], ['s1', cut(L(1))], ['s2', cut(L(2))], ['f1', cut(L(3))], ['f2', cut(L(4))], ['etsi', cut(L(5))],
    ['e1a', cut(L(6))], ['e1b', cut(Lw(6, 'Dix'))], ['e2', cut(L(7))], ['e3', cut(L(8))], ['e4', cut(L(9))], ['e4b', cut(Lw(9, 'La'))], ['stat1', cut(L(10))], ['stat2', cut(L(11))],
    ['rewind', cut(L(12))], ['r1', cut(L(13))], ['tip1', cut(L(14))], ['tip2', cut(L(15))], ['tip3', cut(L(16))], ['tip4', cut(L(17))],
    ['tip5', cut(L(18))], ['tip6', cut(L(19))], ['tw1', cut(L(20))], ['tw2', cut(L(21))], ['tw3', cut(L(22))], ['tw4', cut(L(23))], ['end', END0],
  ].map(([id, t0], i, a) => ({ id, t0, t1: a[i + 1] ? a[i + 1][1] : DUR }));
  const S = Object.fromEntries(SH.map((s) => [s.id, s]));
  const shotAt = (t) => { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; };
  const ETSI = (t) => t >= S.etsi.t0 && t < S.r1.t0;
  console.log('SHOTS ' + SH.map((x) => `${x.id}:${x.t0.toFixed(2)}`).join(' ') + ' DUR ' + DUR);
  const SET = (id) => ['s1', 's2', 'tw1', 'tw2', 'tw3', 'tw4', 'end'].includes(id) ? 'stn' : 'bar';
  const SCN = { stn: STN.scene, bar: BR.scene };

  // ---------- the bar's extras: a real mirror, the door to the street, chairs for the tables ----------
  const mirror = new Reflector(new THREE.PlaneGeometry(4.9, 1.06), { textureWidth: 2048, textureHeight: 444, color: 0x9a9894, clipBias: 0.003, multisample: 0 });
  mirror.position.set(-0.5, 1.75, BAR.Z0 + 0.016); BR.scene.add(mirror);
  // no bottles on the two upper shelves behind the stools (x -1.6..0.4): a clear stretch of mirror at head height
  { const m4 = new THREE.Matrix4(), p = V(0, 0, 0), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    BR.scene.traverse((o) => { if (!o.isInstancedMesh) return; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); p.setFromMatrixPosition(m4); if (p.x > -1.6 && p.x < 0.4 && p.y > 1.5) o.setMatrixAt(i, zero); } o.instanceMatrix.needsUpdate = true; }); }
  const wood = new THREE.MeshStandardMaterial({ color: '#2a1810', roughness: 0.45 }), brassM = new THREE.MeshStandardMaterial({ color: '#b08a3e', roughness: 0.25, metalness: 0.95 });
  // the door in the right-hand wall (x = X1): a hole shown by the night street behind it, the leaf hinged at its +z edge, opening into the room
  const DZ0 = 0.35, DZ1 = 1.3, DH = 2.15, DX = BAR.X1 - 0.004;
  const streetTex = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const c = cv.getContext('2d'); const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#0a0d18'); g.addColorStop(0.6, '#2a2230'); g.addColorStop(1, '#5a4236'); c.fillStyle = g; c.fillRect(0, 0, 256, 512);
    const r = rng(9); for (let i = 0; i < 18; i++) { const x = r() * 256, y = 200 + r() * 220, rad = 8 + r() * 22, col = ['#ffb070', '#ff4f9a', '#6aa0ff', '#ffd9a0'][Math.floor(r() * 4)]; const gg = c.createRadialGradient(x, y, 0, x, y, rad); gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 0.6; c.fillStyle = gg; c.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(DZ1 - DZ0, DH), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: streetTex, emissiveIntensity: 1.4 }));
  outside.position.set(BAR.X1 - 0.052, DH / 2, (DZ0 + DZ1) / 2); outside.rotation.y = -Math.PI / 2; BR.scene.add(outside);
  for (const [w, h, y, z] of [[0.07, DH + 0.07, (DH + 0.07) / 2, DZ0 - 0.035], [0.07, DH + 0.07, (DH + 0.07) / 2, DZ1 + 0.035], [DZ1 - DZ0 + 0.14, 0.07, DH + 0.035, (DZ0 + DZ1) / 2]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, w), wood); m.position.set(BAR.X1 - 0.03, y, z); if (w > 0.1) { m.geometry = new THREE.BoxGeometry(0.06, 0.07, w); } m.castShadow = m.receiveShadow = true; BR.scene.add(m); }
  const doorHinge = new THREE.Group(); doorHinge.position.set(BAR.X1 - 0.075, 0, DZ1 - 0.01); BR.scene.add(doorHinge);
  { const W = DZ1 - DZ0 - 0.02, leaf = new THREE.Group(); leaf.position.z = -W / 2; doorHinge.add(leaf);
    const glassM = new THREE.MeshStandardMaterial({ color: '#0d1018', roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.55 });
    const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; leaf.add(m); return m; };
    add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, W), wood), 0, 0.06, 0); add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.75, W), wood), 0, 0.12 + 0.375, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, W), wood), 0, DH - 0.06, 0);
    for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.045, DH - 0.98, 0.1), wood), 0, 0.87 + (DH - 0.98) / 2, s * (W / 2 - 0.05));
    add(new THREE.Mesh(new THREE.BoxGeometry(0.012, DH - 0.98, W - 0.2), glassM), 0, 0.87 + (DH - 0.98) / 2, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 10), brassM), -0.05, 1.05, -W / 2 + 0.1);
    for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), brassM), -0.035, 1.05 + s * 0.13, -W / 2 + 0.1); }
  const setDoor = (a) => { doorHinge.rotation.y = -a; doorHinge.updateMatrixWorld(true); };       // a > 0 swings the free edge (-z) into the room
  // bistro chairs for the two people at the window tables (P2 sat them on nothing, out of frame)
  const CH = [V(-0.2, 0, 2.95), V(0.1, 0, 2.05)];
  for (const [i, p] of CH.entries()) { const g = new THREE.Group(); g.position.copy(p); g.rotation.y = i ? 0 : Math.PI; BR.scene.add(g);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), wood); seat.position.y = 0.445; g.add(seat);
    for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 8), brassM); l.position.set(x, 0.22, z); g.add(l); }
    const back = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.014, 8, 18, Math.PI), wood); back.position.set(0, 0.75, 0.16); back.rotation.set(0, 0, 0); g.add(back);
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.32, 8), wood); l.position.set(s * 0.17, 0.6, 0.16); g.add(l); }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); }

  // ---------- people ----------
  const env = BR.scene.environment;
  const ines = await loadAvatar('Female_Adult_11', { env, facial: true });
  const man = await loadAvatar('Business_Male_06', { env }); man.root.scale.multiplyScalar(0.96);
  const agent = await loadAvatar('Business_Female_02', { env });
  const lea = await loadAvatar('Female_Adult_13', { env, facial: true });
  const barman = await loadAvatar('Business_Male_01', { env });
  const exA = await loadAvatar('Male_Adult_15', { env, lod: 512 }), exB = await loadAvatar('Female_Adult_14', { env, lod: 512 });
  const everyone = [ines, man, agent, lea, barman, exA, exB];
  const morph = (av, map) => { for (const m of av.meshes) { const d = m.morphTargetDictionary; if (!d) continue; m.morphTargetInfluences.fill(0);
    for (const [k, v] of Object.entries(map)) for (const [nm, i] of Object.entries(d)) if (nm.toLowerCase().includes(k.toLowerCase())) m.morphTargetInfluences[i] = v; } };

  // ---------- props ----------
  const phone = makePhone(); const pcv = phone.tex.image, pc = pcv.getContext('2d');
  const coat = makeCoat('flat');
  const glassHer = makeGlass('tumbler'), glassHis = makeGlass('wine'), glass2 = makeGlass('tumbler');
  const drinkHis = glassHis.children[1];
  const setDrink = (s) => { drinkHis.scale.y = s; drinkHis.position.y = 0.1 * (1 - s); };
  // the receipt: 7.5 x 17 cm, the printed face on +y, his handwriting on -y
  const RW = 0.075, RL = 0.17;
  const rcTex = (draw) => { const cv = document.createElement('canvas'); cv.width = 300; cv.height = 680; const c = cv.getContext('2d'); c.fillStyle = '#f3f0e8'; c.fillRect(0, 0, 300, 680); draw(c); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const front = rcTex((c) => { c.translate(300, 680); c.scale(-1, -1); c.fillStyle = '#222'; c.textAlign = 'center'; c.font = '700 40px "Courier New", monospace'; c.fillText('MINUIT', 150, 70); c.font = '20px "Courier New", monospace'; c.fillText('BAR · PIGALLE', 150, 100);
    c.textAlign = 'left'; c.font = '22px "Courier New", monospace'; c.fillText('01/11   01:26', 24, 160); c.fillText('TABLE  COMPTOIR', 24, 192); c.fillText('-'.repeat(19), 24, 222);
    c.fillText('1 COCKTAIL MAISON', 24, 262); c.textAlign = 'right'; c.fillText('12,00', 276, 292); c.textAlign = 'left'; c.fillText('-'.repeat(19), 24, 330);
    c.font = '700 26px "Courier New", monospace'; c.fillText('TOTAL', 24, 370); c.textAlign = 'right'; c.fillText('12,00 €', 276, 370); c.textAlign = 'left'; c.font = '20px "Courier New", monospace'; c.fillText('PAYÉ  ESPÈCES', 24, 410);
    c.textAlign = 'center'; c.fillText('MERCI, À BIENTÔT', 150, 480); });
  const back = rcTex((c) => { c.save(); c.fillStyle = '#16181f'; c.font = 'italic 600 44px "Segoe Script", "Brush Script MT", cursive'; c.textAlign = 'center';
    const lines = [['Tu n’as', 210], ['pas bu.', 270], ['La prochaine', 380], ['fois,', 440], ['Inès.', 530]]; lines.forEach(([s, y], i) => { c.save(); c.translate(150, y); c.rotate(-0.06 + 0.02 * i); c.fillText(s, 0, 0); c.restore(); }); c.restore(); });
  const paper = new THREE.MeshStandardMaterial({ color: '#f3f0e8', roughness: 0.85 });
  const receipt = new THREE.Group();
  { const m = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.0006, RL), [paper, paper, new THREE.MeshStandardMaterial({ map: front, roughness: 0.85 }), new THREE.MeshStandardMaterial({ map: back, roughness: 0.85 }), paper, paper]); m.castShadow = m.receiveShadow = true; receipt.add(m); }
  receipt.box = { c: V(0, 0, 0), h: V(RW / 2, 0.0003, RL / 2), nm: 'receipt' };
  const apple = makeCat();
  const PROPS = [phone, coat, glassHer, glassHis, glass2, receipt, apple.root];
  const putIn = (obj, set) => { if (obj.parent !== SCN[set]) SCN[set].add(obj); };

  // Apple on her lock screen, drawn once in a studio
  const studio = () => { const s = new THREE.Scene(); const pm = new THREE.PMREMGenerator(R.renderer); s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.6;
    const k = new THREE.DirectionalLight('#fff4ea', 3); k.position.set(-2, 2.5, 3); const r = new THREE.DirectionalLight('#ffffff', 2.2); r.position.set(2.5, 2, -2.5); s.add(k, r); return s; };
  await Promise.all(TEX_PENDING);
  let appleCv = null;
  { const s = studio(); const cat = makeCat(); s.add(cat.root); cat.update(1.0, { look: V(0, 0.18, 1) }); const pil = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.6), new THREE.MeshStandardMaterial({ color: '#c9b9a2', roughness: 0.9 })); pil.position.y = -0.03; s.add(pil);
    const c2 = new THREE.PerspectiveCamera(30, 0.5, 0.05, 20); c2.position.set(0.05, 0.22, 0.75); c2.lookAt(0, 0.13, 0);
    appleCv = renderShot(R.renderer, s, c2, 360, 720, { exposure: 1.15, bg: '#cdbda4' }); }

  // ---------- her phone's screens ----------
  const statusBar = (ctx, w, clock, pct) => { ctx.fillStyle = '#f2f2f4'; ctx.font = '600 28px Inter, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(clock, 36, 52);
    ctx.textAlign = 'right'; ctx.fillStyle = pct <= 10 ? '#ff453a' : '#f2f2f4'; ctx.fillText(`${pct} %`, w - 92, 52); ctx.strokeStyle = '#f2f2f4'; ctx.lineWidth = 3; ctx.strokeRect(w - 80, 30, 44, 24);
    ctx.fillStyle = pct <= 10 ? '#ff453a' : '#f2f2f4'; ctx.fillRect(w - 77, 33, Math.max(3, 38 * pct / 100), 18); ctx.fillRect(w - 34, 38, 4, 8); };
  let lastScreen = '';
  const drawScreen = (mode, o = {}) => {
    phone.screen.material.emissiveIntensity = mode === 'lock' ? 0.8 : 0.5; phone.screen.material.envMapIntensity = 0.35;
    const key = JSON.stringify([mode, o]); if (key === lastScreen) return; lastScreen = key;
    const w = pcv.width, h = pcv.height, ctx = pc; ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (mode === 'lock') {
      ctx.fillStyle = '#cdbda4'; ctx.fillRect(0, 0, w, h); ctx.drawImage(appleCv, 0, h * 0.3, w, h); const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      statusBar(ctx, w, '', o.pct ?? 6); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '300 140px Inter, Arial, sans-serif'; ctx.fillText(o.clock || '01:41', w / 2, 430);
      ctx.font = '500 30px Inter, Arial, sans-serif'; ctx.fillText('dimanche 1 novembre', w / 2, 290);
      for (const [i, n] of (o.notifs || []).entries()) { const y = 760 + i * 200; ctx.globalAlpha = n.k; ctx.fillStyle = 'rgba(40,40,46,0.92)'; ctx.beginPath(); ctx.roundRect(24, y, w - 48, 180, 30); ctx.fill(); ctx.textAlign = 'left';
        ctx.fillStyle = '#34c759'; ctx.beginPath(); ctx.roundRect(48, y + 28, 64, 64, 16); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(80, y + 58, 20, 16, 0, 0, 7); ctx.fill();
        ctx.font = '700 30px Inter, Arial, sans-serif'; ctx.fillText('Léa', 130, y + 52); ctx.font = '500 26px Inter, Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText(n.when, 130, y + 88);
        ctx.fillStyle = '#eee'; ctx.font = '600 34px Inter, Arial, sans-serif'; ctx.fillText(n.msg, 48, y + 150); ctx.globalAlpha = 1; }
      phone.tex.needsUpdate = true; return;
    }
    if (mode === 'info') {
      // a note she keeps: what to do (the tip card's content, as a phone note)
      ctx.fillStyle = '#121214'; ctx.fillRect(0, 0, w, h); statusBar(ctx, w, o.clock || '01:31', o.pct ?? 6);
      ctx.textAlign = 'left'; ctx.fillStyle = '#ffcc00'; ctx.font = '600 28px Inter, Arial, sans-serif'; ctx.fillText('‹ Notes', 30, 120);
      ctx.fillStyle = '#fff'; ctx.font = '800 46px Inter, Arial, sans-serif'; ctx.fillText('Si je me sens', 36, 210); ctx.fillText('droguée', 36, 266);
      const it = [['1', 'Le dire à Léa, au barman'], ['2', '15 · SAMU    17 · police'], ['3', 'Prise de sang + urine, VITE'], ['4', 'CRAFS 01 40 05 42 70']];
      it.forEach(([n, s], i) => { const y = 360 + i * 120; ctx.globalAlpha = smooth(i * 0.12, i * 0.12 + 0.12, o.k ?? 1); ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(62, y - 12, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '800 30px Inter, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n, 62, y - 2);
        ctx.textAlign = 'left'; ctx.font = '600 32px Inter, Arial, sans-serif'; ctx.fillText(s, 110, y); ctx.globalAlpha = 1; });
      phone.tex.needsUpdate = true; return;
    }
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
  const show = (av, fn) => { av.root.visible = true; fn(); if (av === ines || av === lea) av.blink(av === ines ? Math.max(eyesShut, blinkK(curT)) : blinkK(curT + 1.3)); av.root.updateMatrixWorld(true); };
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
      for (const bx of boxes) { const d = Math.min(bx.h.x - Math.abs(p.x - bx.c.x), bx.h.y - Math.abs(p.y - bx.c.y), bx.h.z - Math.abs(p.z - bx.c.z)); if (d > best[0]) best = [d, bx.nm, (b || boneOf(mesh, i)).name]; } });
    return `${(best[0] * 1000).toFixed(1)}mm ${best[1]} ${best[2]}`; };
  // the counter's top and front, the stools' seats, in world space (an Object3D at the origin)
  const ORIGIN = new THREE.Object3D(); ORIGIN.updateMatrixWorld(true);
  const BAR_BOXES = [{ c: V(-0.5, BAR.CY - 0.03, BAR.CZ - 0.27), h: V(2.5, 0.03, 0.31), nm: 'counter top' }, { c: V(-0.5, (BAR.CY - 0.06) / 2, BAR.CZ - 0.06), h: V(2.5, (BAR.CY - 0.06) / 2, 0.04), nm: 'counter front' },
    ...BR.stools.map((s, i) => ({ c: V(s.pos.x, BAR.SEAT - 0.025, s.pos.z), h: V(0.13, 0.025, 0.13), nm: 'seat ' + i }))];
  // a hand on someone's arm: the hand's skin against the arm's own skin (distance to the shoulder→elbow segment against the arm's radius there)
  const armGrip = (av, sd, other, side) => { const a = wp(other.bones[side + 'Arm']), b = wp(other.bones[side + 'ForeArm']), ab = b.clone().sub(a), L2 = ab.lengthSq(), seg = (v) => { const u = clamp(v.clone().sub(a).dot(ab) / L2); return [u, v.distanceTo(a.clone().addScaledVector(ab, u))]; };
    // per (length bin, angle sector) the arm's outer radius; a hand vertex inside it in the same cell is inside the arm
    const e1 = V(0, 1, 0).cross(ab).normalize(), e2 = ab.clone().normalize().cross(e1), cell = (v, u) => { const w = v.clone().sub(a).addScaledVector(ab, -u); return Math.min(9, Math.floor(u * 10)) * 16 + Math.floor(((Math.atan2(w.dot(e2), w.dot(e1)) + Math.PI) / (2 * Math.PI)) * 16) % 16; };
    const rad = new Float32Array(160); skinPts(other, 1, (v, mesh, i) => { if (boneOf(mesh, i) !== other.bones[side + 'Arm']) return; const [u, d] = seg(v); if (u > 0.05 && u < 0.95) { const c = cell(v, u); rad[c] = Math.max(rad[c], d); } });
    let pen = -1e9, nm = ''; const st = handSet(av, sd); skinPts(av, 1, (v, mesh, i) => { const bn = boneOf(mesh, i); if (!st.has(bn)) return; const [u, d] = seg(v); if (u < 0.1 || u > 0.9) return; const p = rad[cell(v, u)] - d; if (rad[cell(v, u)] > 0 && p > pen) { pen = p; nm = bn.name; } });
    return `${(pen * 1000).toFixed(1)}mm ${nm}`; };
  const phoneBox = [{ c: V(0, 0, 0), h: V(0.0358, 0.0734, 0.0039), nm: 'phone' }, { c: V(0, 0, 0.0055), h: V(0.0336, 0.071, 0.0016), nm: 'screen+1.5mm' }];

  // ---------- the end card ----------
  const endEl = document.getElementById('end');
  const sign = document.createElement('div');
  sign.style.cssText = 'position:absolute;left:50%;top:620px;transform:translateX(-50%);background:#22397a;border:8px solid #2e6b4a;outline:5px solid #e8e6df;border-radius:16px;padding:28px 56px;text-align:center;min-width:640px;font-family:Inter,sans-serif;color:#fff';
  sign.innerHTML = `<div style="display:inline-block;background:#ff2e2e;font-weight:800;font-size:30px;padding:6px 14px;border-radius:8px;letter-spacing:.06em">12 % · SAISON 2</div>
    <div style="font-weight:800;font-size:42px;margin-top:16px;letter-spacing:.03em">PARTIE 4 · FINALE</div><div style="font-weight:800;font-size:68px;line-height:1;margin-top:6px">LE DERNIER BUS</div>`;
  const ask = document.createElement('div');
  ask.style.cssText = 'position:absolute;left:0;right:0;top:250px;text-align:center;font:800 64px/1.08 Inter,sans-serif;color:#fff;text-transform:uppercase;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  ask.innerHTML = 'Un <span style="color:#ff2e2e">inconnu</span><br>vous offre un verre…<br>vous le <span style="color:#ff2e2e">buvez</span> ?';
  const reply = document.createElement('div');
  reply.style.cssText = 'position:absolute;left:0;right:0;top:500px;text-align:center;font:700 42px/1.2 Inter,sans-serif;color:rgba(255,255,255,.92);text-shadow:0 0 3px #000,0 3px 0 rgba(0,0,0,.6)';
  reply.innerHTML = 'Réponds <span style="color:#ff2e2e;font-weight:800">OUI</span> ou <span style="color:#ff2e2e;font-weight:800">NON</span> en commentaire';
  const follow = document.createElement('div');
  follow.style.cssText = 'position:absolute;left:0;right:0;top:920px;text-align:center;font:800 52px/1.15 Inter,sans-serif;color:#fff;text-shadow:0 0 3px #000,0 4px 0 rgba(0,0,0,.7)';
  follow.innerHTML = '<span style="color:#ff2e2e">ABONNE-TOI</span><br><span style="font-weight:700;font-size:44px">pour voir la Partie 4</span>';
  const fine = document.createElement('div');
  fine.style.cssText = 'position:absolute;left:60px;right:60px;top:1075px;text-align:center;font:500 27px Inter,sans-serif;color:rgba(255,255,255,.8);line-height:1.42';
  fine.innerHTML = 'Fiction. Chiffres : ANSM, enquête soumission chimique 2024. Conseils : gendarmerie, code pénal (art. 222-30-1). Aide : CRAFS 01 40 05 42 70.<br>Voix : Kyutai TTS (CC BY 4.0).';
  endEl.querySelector('.t').innerHTML = ''; endEl.querySelector('.n').innerHTML = '';
  endEl.appendChild(ask); endEl.appendChild(reply); endEl.appendChild(sign); endEl.appendChild(fine); endEl.appendChild(follow);
  const tag = makeEndTag({ text: 'Abonne-toi pour la suite', ssaa: globalThis.SSAA });
  { const ic = document.querySelector('#s12 .notif .ic'); if (ic) { ic.style.background = '#34c759'; } }

  // ---------- lights that move with the story ----------
  const mk = (c, d) => { const o = {}; for (const [k, s] of Object.entries(SCN)) { o[k] = new THREE.PointLight(c, 0, d, 2); s.add(o[k]); } return o; };
  const FILL = mk('#ffd8b0', 3), RIM = mk('#ff6a8a', 4);
  const lightsOff = () => { for (const o of [FILL, RIM]) for (const l of Object.values(o)) l.intensity = 0; };

  // ---------- story positions ----------
  const STOOL = BR.stools[2], STOOL_L = BR.stools[1];
  const D = ST.DESK, DKH = ST.DESK_H;
  const GH = V(STOOL.pos.x - 0.04, BAR.CY, BAR.CZ - 0.22);                // her tumbler
  const GM = V(STOOL.pos.x + 0.15, BAR.CY, BAR.CZ - 0.24);                // his glass, once set down beside hers
  const MAN_END = V(1.55, 0, -0.05);                                      // where he waits, at the far end of the counter
  const BARMAN = V(STOOL.pos.x + 0.35, 0, BAR.CZ - 0.95);
  const COAT_P = V(D.x - 0.2, DKH, D.z - 0.12);
  const PHONE_BAR = V(STOOL.pos.x - 0.3, BAR.CY + 0.0041, BAR.CZ - 0.2);   // her phone on the counter (left behind in e4)

  return {
    duration: DUR, fps: 30, captions: [],
    frame(t, opts = {}) {
      curT = t;
      let sh = shotAt(t), id = sh.id, tt = t;
      // the rewind plays the ET SI branch backwards (to the full glass before she chooses)
      if (id === 'rewind') { const r = (t - S.rewind.t0) / (S.rewind.t1 - S.rewind.t0); tt = S.stat1.t0 - 0.001 - r * (S.stat1.t0 - S.etsi.t0 - 0.002); sh = shotAt(tt); id = sh.id; }
      const k = clamp((tt - sh.t0) / (sh.t1 - sh.t0));
      const etsi = ETSI(tt), set = SET(id), scene = SCN[set];
      R.renderPass.scene = scene;
      for (const a of everyone) { a.root.visible = false; putIn(a.root, set); }
      for (const p of PROPS) { p.visible = false; putIn(p, set); }
      lightsOff(); eyesShut = 0;
      R.renderer.toneMappingExposure = 1.0; G.uSat.value = 1.0; G.uTint.value.set(1, 1, 1); G.uScan.value = 0; G.uAberr.value = 0; G.uFade.value = 0; G.uVignette.value = 0.75;
      G.uGhost.value = 0; G.uGhostO.value.set(0, 0); G.uTunnel.value = 0; G.uHeatA.value = 0;
      morph(ines, {}); morph(man, {}); coat.flap(0); setDrink(1); setDoor(0); mirror.visible = set === 'bar';
      STN.flag.update(t);

      // ===== the commissariat (2:58, 3:05) =====
      if (set === 'stn') {
        show(agent, () => sit(agent, { pos: V(D.x + 0.72, 0.47, D.z), yaw: -Math.PI / 2, legs: 'chair', floor: 0, seat: 0.11, look: id === 's2' ? V(D.x - 0.72, 1.15, D.z + 0.05) : STN.monitorScreen.getWorldPosition(V(0, 0, 0)), lookK: 0.9,
          handR: (P, fwd, left, up) => ({ hand: STN.keyboard.position.clone().add(V(0.02, 0.03, -0.08)), pole: P.clone().addScaledVector(up, 0.2).addScaledVector(left, -0.6), F: fwd.clone(), N: V(0, -1, 0), curl: 0.3 }),
          handL: (P, fwd, left, up) => ({ hand: STN.keyboard.position.clone().add(V(0.02, 0.03, 0.08)), pole: P.clone().addScaledVector(up, 0.2).addScaledVector(left, 0.6), F: fwd.clone(), N: V(0, -1, 0), curl: 0.3 }) }));
        if (id === 's2') { const sp = Math.max(0, Math.sin((tt - S.s2.t0) * 13)) * (1 - smooth(Ln[2].t1, Ln[2].t1 + 0.1, tt)); morph(agent, { jawopen: 0.25 * sp }); }
        // the coat folded on the desk in front of her, the receipt in its inside pocket
        coat.visible = true; coat.position.copy(COAT_P); coat.rotation.set(0, Math.PI / 2 + 0.25, 0); coat.updateMatrixWorld(true);
        const pk = coat.pocket.c, pkW = coat.localToWorld(pk.clone());
        if (id === 'tw1') coat.flap(0.95 * smooth(0, 0.3, k));
        if (['tw2', 'tw3', 'tw4', 'end'].includes(id)) coat.flap(0.95);
        // the receipt: out of the pocket toward her (tw1), flat on the desk (tw2), turned over (tw3)
        let pinch = null;
        if (id === 'tw1') { const out = smooth(0.35, 0.95, k), dir = V(-1, 0, 0);
          receipt.visible = true; receipt.position.copy(pkW).add(V(0, 0.006 + 0.01 * out, 0)).addScaledVector(dir, -0.04 + 0.13 * out); receipt.rotation.set(0, Math.PI / 2 + 0.25, 0); receipt.updateMatrixWorld(true);
          pinch = receipt.localToWorld(V(0, 0.004, RL / 2 - 0.012)); }
        if (['tw2', 'tw3', 'tw4'].includes(id)) {
          const fl = id === 'tw3' ? smooth(0.04, 0.3, k) : id === 'tw4' ? 1 : 0, a = Math.PI * fl;
          receipt.visible = true; receipt.position.set(D.x - 0.12, DKH + 0.0004 + RW / 2 * Math.abs(Math.sin(a)) + 0.01 * Math.sin(a), D.z + 0.33); receipt.rotation.set(0, -Math.PI / 2, 0); receipt.rotateZ(a); receipt.updateMatrixWorld(true); }
        show(ines, () => {
          const o = { pos: V(D.x - 0.7, 0.47, D.z + 0.05), yaw: Math.PI / 2, legs: 'chair', floor: 0, seat: 0.11, look: id === 'tw1' ? pkW : ['tw2', 'tw3'].includes(id) ? receipt.position.clone() : id === 's1' || id === 's2' ? wp(agent.bones.Head) : V(D.x - 0.42, 0.82, D.z + 0.05), lookK: 0.85,
            handL: lapL, curlL: 0.35, handR: id === 'tw4' ? phoneLap : lapR, ...(id === 'tw4' ? { curlR: 0.08, pkR: PK, thumbR: THUMB } : {}), lean: id === 'tw1' ? 0.38 : ['tw2', 'tw3'].includes(id) ? 0.22 : 0 };
          sit(ines, o);
          if (pinch) { const spec = (sh, fwd, left, up) => ({ hand: pinch.clone().add(V(-0.07, 0.03, 0)), pole: sh.clone().addScaledVector(up, -0.45).addScaledVector(left, -0.4), F: V(1, -0.3, 0).normalize(), N: V(0, -1, 0), curl: 0.35, thumb: 0.2 });
            pressPose(ines, 'Right', pinch, (arm) => sit(ines, { ...o, handR: arm }), spec, () => wp(ines.bones.RightHandIndex3).lerp(wp(ines.bones.RightHandThumb3), 0.5)); }
        });
        if (id === 'tw4') { phone.visible = true; phoneFit(ines, 'Right', phone); drawScreen('lock', { clock: '03:06', pct: 3 }); }
        if (id === 'tw3') morph(ines, { jawopen: 0.12 * smooth(0.3, 0.5, k) });
      }

      // ===== the bar (1:24 and after) =====
      if (set === 'bar') {
        const sitBar = (av, st, o = {}) => sit(av, { pos: V(st.pos.x, BAR.SEAT + 0.045, st.pos.z), yaw: Math.PI, legs: 'chair', floor: 0.315, seat: 0.11, footFwd: 0.3, ...o });   // feet on the foot ring
        const handBar = (P, fwd, left, up) => ({ hand: V(STOOL.pos.x - 0.24, BAR.CY + 0.04, BAR.CZ - 0.13), pole: P.clone().addScaledVector(up, 0.2).addScaledVector(left, -0.6), F: fwd.clone(), N: V(0, -1, 0), curl: 0.5 });
        const drunk = ['e1b', 'e2', 'e3'].includes(id);
        const herLook = id === 'tip3' ? wp(barman.bones.Head) : id === 'tip4' ? V(STOOL_L.pos.x, 1.3, STOOL_L.pos.z) : id === 'tip5' ? null : drunk ? V(STOOL.pos.x + 0.05, BAR.CY - 0.1, BAR.CZ - 0.5) : GM.clone().add(V(0, 0.12, 0));
        const herOn = !['e4', 'e4b', 'stat2'].includes(id);
        if (herOn) show(ines, () => {
          const o = { look: herLook || V(STOOL.pos.x, 0.95, -0.15), lookK: 0.85, handL: lapL, curlL: 0.35, handR: id === 'tip5' ? phoneLap : lapR, ...(id === 'tip5' ? { curlR: 0.08, pkR: PK, thumbR: THUMB } : {}),
            lean: id === 'e2' ? 0.5 * smooth(0, 0.6, k) : id === 'e3' ? 0.5 : id === 'e1b' ? 0.12 * smooth(0, 1, k) : 0, headUp: id === 'e2' || id === 'e3' ? -0.6 : 0, twist: id === 'tip4' ? 0.3 : 0 };
          if (id === 'tip3') {
            // she points at the glass for the barman (the index out, the tip 9 cm short of the bowl)
            const tip = V(STOOL.pos.x + 0.12, BAR.CY + 0.17, BAR.CZ + 0.12);
            const spec = (sh, fwd, left, up) => ({ hand: tip.clone().add(V(-0.12, -0.02, 0.06)), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, -0.5), F: GM.clone().add(V(0, 0.1, 0)).sub(tip).normalize(), N: V(0, -1, 0), curl: 0.75, idx: -0.1, thumb: 0.1 });
            pressPose(ines, 'Right', tip, (arm) => sitBar(ines, STOOL, { ...o, handR: arm }), spec, () => wp(ines.bones.RightHandIndex3));
          } else sitBar(ines, STOOL, o);
        });
        eyesShut = id === 'e2' ? 0.55 * smooth(0.2, 1, k) : id === 'e3' ? 0.6 : id === 'e1b' ? 0.25 * smooth(0, 1, k) : 0;
        if (id === 'tip5') { phone.visible = true; phoneFit(ines, 'Right', phone); drawScreen('info', { clock: '01:31', pct: 6, k: smooth(0, 0.7, k) }); }
        if (id === 'r1') morph(ines, { browdown: 0.4 });
        // Léa: back from the toilets after the rewind (tip4)
        if (id === 'tip4') show(lea, () => sitBar(lea, STOOL_L, { look: wp(ines.bones.Head), lookK: 0.85, twist: -0.35, handL: lapL, handR: lapR }));
        if (id === 'tip4') { const sp = Math.max(0, Math.sin((tt - S.tip4.t0) * 11)) * (1 - smooth(Ln[17].t1 - 0.3, Ln[17].t1, tt)); morph(ines, { jawopen: 0.22 * sp }); }
        // the glasses
        const glassesOn = !['tip5'].includes(id);
        if (glassesOn) { glassHer.visible = true; glassHer.position.copy(GH); glassHis.visible = true; glassHis.position.copy(GM); }
        if (['e1b', 'e2', 'e3', 'e4', 'e4b', 'stat1', 'stat2'].includes(id) || (id === 'e1a' && k > 0.25)) setDrink(0.45);
        // the barman: behind the counter, wiping a glass (s: his look); he takes the glass away in tip3
        const barmanOn = ['f1', 'e3', 'e4', 'e4b', 'tip3', 'tip6'].includes(id);
        if (barmanOn) show(barman, () => stand(barman, { pos: BARMAN.clone().add(id === 'f1' || id === 'tip6' ? V(-1.4, 0, -0.05) : V(0, 0, 0)), yaw: 0, breath: t * 0.3, lean: id === 'tip3' ? 0.12 : 0,
          look: id === 'tip3' ? GM.clone().add(V(0, 0.1, 0)) : id === 'e3' ? wp(man.bones.Head) : V(BARMAN.x - 1.4, 1.0, BAR.CZ - 0.6), lookK: 0.7,
          armL: armDown(1), armR: armDown(-1) }));
        if (id === 'e3') morph(barman, { mouthsmile: 0.1 });
        // him
        const manAt = id === 'hook' ? 'glass' : ['f1', 'f2', 'tip6', 'tip1', 'tip2', 'r1'].includes(id) ? 'end' : id === 'e3' ? 'grip' : null;
        if (manAt === 'glass') {
          // P2's last image: his index on the foot of the glass he slides next to hers
          const set2 = smooth(0.0, 0.55, k); glassHis.position.set(GM.x + 0.08 * (1 - set2), GM.y, GM.z); glassHis.updateMatrixWorld(true);
          const stem = glassHis.position.clone().add(V(0.016, 0.06, 0.004));
          const manO = (armL) => ({ pos: V(STOOL.pos.x + 0.42, 0, -0.3), yaw: Math.PI - 0.2, hipBend: 0.3, breath: t * 0.35, look: wp(ines.bones.Head), lookK: 0.6, armL, armR: armDown(-1) });
          const spec = (sh, fwd, left, up) => ({ hand: stem.clone().add(V(0.09, 0.03, 0.02)), pole: sh.clone().addScaledVector(up, -0.4).addScaledVector(left, 0.5), F: V(-1, -0.1, 0).normalize(), N: V(0, -1, 0), curl: 0.45, idx: 0.0, thumb: 0.3 });
          show(man, () => pressPose(man, 'Left', stem, (arm) => stand(man, manO(arm)), spec, () => { const a = wp(man.bones.LeftHandIndex3), b2 = wp(man.bones.LeftHandIndex2); return a.addScaledVector(a.clone().sub(b2).normalize(), 0.009); }));
          morph(man, { mouthsmile: 0.35 });
        }
        if (manAt === 'end') { show(man, () => stand(man, { pos: MAN_END, yaw: -Math.PI / 2 - 0.25, breath: t * 0.3, look: wp(ines.bones.Head), lookK: 0.95, armL: armDown(1), armR: armDown(-1) })); morph(man, { mouthsmile: 0.25 }); }
        if (manAt === 'grip') {
          // behind her right shoulder, his left hand closing on her upper arm, his face by hers: « Elle a trop bu. Je la ramène. »
          const a = wp(ines.bones.RightArm), b = wp(ines.bones.RightForeArm), P = a.clone().lerp(b, 0.45), out = V(1, 0, 0.35).normalize();
          const GOFF = Number(q.get('goff') ?? 0.092);
          const tgt = P.clone().addScaledVector(out, GOFF);
          const manO = (armL) => ({ pos: V(STOOL.pos.x + 0.5, 0, STOOL.pos.z + 0.42), yaw: Math.PI + 0.75, hipBend: 0.15, breath: t * 0.35, look: id === 'e3' && tt < Lw(8, 'Elle') ? wp(ines.bones.Head) : wp(barman.bones.Head), lookK: 0.8, armL, armR: armDown(-1) });
          const spec = (sh, fwd, left, up) => ({ hand: tgt.clone().add(V(0.02, 0.06, 0.02)), pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(left, 0.6).addScaledVector(fwd, -0.3), F: V(-0.2, -0.35, -1).normalize(), N: out.clone().negate(), curl: Number(q.get('gcurl') ?? 0.15), thumb: Number(q.get('gthumb') ?? -0.9) });
          show(man, () => pressPose(man, 'Left', tgt, (arm) => stand(man, manO(arm)), spec, () => wp(man.bones.LeftHand).lerp(wp(man.bones.LeftHandMiddle1), 0.6)));
          const sp = tt > Lw(8, 'Elle') ? Math.max(0, Math.sin((tt - Lw(8, 'Elle')) * 12)) * (1 - smooth(Ln[8].t1, Ln[8].t1 + 0.1, tt)) : 0; morph(man, { jawopen: 0.2 * sp, mouthsmile: 0.15 });
        }
        // nobody moves: two people at the window tables, on their phones
        if (['f1', 'e3', 'e4', 'e4b', 'tip6', 'stat2'].includes(id)) {
          show(exA, () => sit(exA, { pos: V(CH[0].x, 0.46, CH[0].z), yaw: Math.PI, legs: 'chair', floor: 0, seat: 0.11, look: V(CH[0].x, 0.9, CH[0].z - 0.45), lookK: 0.7, handL: lapL, handR: lapR }));
          show(exB, () => sit(exB, { pos: V(CH[1].x, 0.46, CH[1].z), yaw: 0, legs: 'chair', floor: 0, seat: 0.11, look: V(CH[1].x, 0.9, CH[1].z + 0.45), lookK: 0.7, handL: lapL, handR: lapR })); }
        // the door: swinging shut behind them (e4)
        if (id === 'e4b') setDoor(1.25 * (1 - smooth(S.e4b.t0 + 0.5, S.e4b.t0 + 2.0, tt)));
        // her phone left on the counter, Léa writing
        if (['e4', 'e4b', 'stat2'].includes(id)) { phone.visible = true; phone.position.copy(PHONE_BAR); phone.rotation.set(-Math.PI / 2, 0, 0.35); phone.updateMatrixWorld(true);
          drawScreen('lock', { clock: id === 'stat2' ? '01:52' : '01:41', pct: 5, notifs: [{ msg: 't’es où ??', when: id === 'stat2' ? 'il y a 11 min' : 'maintenant', k: id === 'e4' ? smooth(0.6, 0.75, k) : 1 }, ...(id === 'stat2' ? [{ msg: 'Inès réponds stp', when: 'maintenant', k: smooth(0.3, 0.45, k) }] : [])] }); }
      }

      // --- cameras
      const fixed = (a, b, ta, tb, fa, fb = fa) => { const e = smooth(0, 1, k); cam.position.copy(a).lerp(b, e); cam.up.set(0, 1, 0); cam.lookAt(ta.clone().lerp(tb, e)); cam.fov = lerp(fa, fb, e); };
      cam.near = 0.012; cam.far = 200; let roll = 0;
      const sx = STOOL.pos.x;
      if (id === 'hook') fixed(V(sx + 0.12, 1.25, -0.42), V(sx + 0.13, 1.25, -0.44), V(sx + 0.2, 1.5, -3.99), V(sx + 0.2, 1.51, -3.99), 62, 60);
      if (id === 's1') fixed(V(D.x - 1.18, 1.58, D.z + 0.22), V(D.x - 1.14, 1.57, D.z + 0.21), wp(agent.bones.Head).add(V(-0.3, -0.3, 0)), wp(agent.bones.Head).add(V(-0.3, -0.32, 0)), 46, 44);
      if (id === 's2') { const hd = wp(agent.bones.Head); fixed(hd.clone().add(V(-0.95, -0.05, 0.42)), hd.clone().add(V(-0.9, -0.05, 0.4)), hd.clone().add(V(0, 0.02, 0)), hd.clone().add(V(0, 0.02, 0)), 30, 27); }
      if (id === 'f1') fixed(V(sx + 2.4, 1.55, 1.9), V(sx + 2.2, 1.52, 1.75), V(sx + 0.1, 1.05, -0.3), V(sx + 0.1, 1.05, -0.3), 46, 44);
      if (id === 'f2') { const g = GM.clone().add(V(0, 0.1, 0)), m = MAN_END.clone().add(V(0, 1.35, 0)); fixed(g.clone().add(V(-0.42, 0.14, -0.12)), g.clone().add(V(-0.34, 0.13, -0.1)), m, m.clone().add(V(0, 0.03, 0)), 38, 34); }
      if (id === 'etsi' || id === 'r1') { const hd = wp(ines.bones.Head).add(V(0, 0.03, 0)); fixed(hd.clone().add(V(0.18, -0.12, -0.62)), hd.clone().add(V(0.17, -0.12, -0.56)), hd, hd, 34, 31); }
      if (id === 'e1a') { const g = GM.clone().add(V(0, 0.09, 0)); fixed(g.clone().add(V(0.05, 0.12, 0.42)), g.clone().add(V(0.05, 0.11, 0.38)), g, g, 34, 32); }
      if (id === 'e1b') { const eye = wp(ines.bones.Head).add(V(0, 0.08, -0.1)); fixed(eye, eye.clone().add(V(0, -0.01, 0)), V(sx + 0.2, 1.45, -3.9), V(sx + 0.2, 1.38, -3.9), 62, 60); roll = 0.16 * Math.sin((tt - S.e1b.t0) * 0.9) * smooth(0, 0.4, k); }
      if (id === 'e2') { const hd = wp(ines.bones.Head); fixed(V(sx - 1.3, 1.25, 0.55), V(sx - 1.2, 1.22, 0.5), hd.clone().add(V(0, -0.1, 0)), hd.clone().add(V(0, -0.14, 0)), 42, 40); roll = -0.06 * Math.sin((tt - S.e2.t0) * 0.7); }
      if (id === 'e3') { const hd = wp(ines.bones.Head), mid = hd.clone().lerp(wp(man.bones.Head), 0.5).add(V(0, -0.1, 0)); fixed(mid.clone().add(V(0.22, -0.18, -0.95)), mid.clone().add(V(0.2, -0.18, -0.88)), mid, mid, 48, 46); }
      if (id === 'e4') fixed(V(1.7, 1.6, 2.7), V(1.6, 1.58, 2.6), V(sx, 1.0, -0.6), V(sx, 1.0, -0.6), 52, 50);
      if (id === 'e4b') fixed(V(0.9, 1.45, -0.35), V(0.95, 1.45, -0.3), V(BAR.X1, 1.1, 0.85), V(BAR.X1, 1.1, 0.85), 46, 44);
      if (id === 'stat1') { const g = GM.clone().add(V(0, 0.12, 0)); fixed(g.clone().add(V(0.02, 0.3, 0.3)), g.clone().add(V(0.02, 0.27, 0.26)), g, g, 36, 33); }
      if (id === 'stat2') fixed(PHONE_BAR.clone().add(V(0.0, 0.42, 0.22)), PHONE_BAR.clone().add(V(0.0, 0.38, 0.2)), PHONE_BAR, PHONE_BAR, 38, 35);
      if (id === 'tip1') { const g = GM.clone().add(V(0, 0.1, 0)); fixed(g.clone().add(V(0.35, 0.1, 0.3)), g.clone().add(V(0.3, 0.09, 0.27)), g, g, 40, 37); }
      if (id === 'tip2') { const g = GH.clone().lerp(GM, 0.5).add(V(0, 0.07, 0)); fixed(g.clone().add(V(-0.05, 0.3, 0.42)), g.clone().add(V(-0.05, 0.28, 0.38)), g, g, 38, 35); }
      if (id === 'tip3') fixed(V(sx - 0.9, 1.45, 0.75), V(sx - 0.85, 1.44, 0.7), V(sx + 0.2, 1.25, -0.8), V(sx + 0.2, 1.25, -0.8), 48, 46);
      if (id === 'tip4') fixed(V(sx - 0.38, 1.4, -1.65), V(sx - 0.38, 1.4, -1.6), V(sx - 0.38, 1.25, 0.05), V(sx - 0.38, 1.25, 0.05), 54, 52);
      if (id === 'tip5') { const upv = V(0, 1, 0).applyQuaternion(phone.quaternion), n = V(0, 0, 1).applyQuaternion(phone.quaternion); cam.position.copy(phone.position).addScaledVector(n, 0.34); cam.up.copy(upv); cam.lookAt(phone.position.clone().addScaledVector(upv, 0.03)); cam.up.set(0, 1, 0); cam.fov = 34; }
      if (id === 'tip6') fixed(V(sx - 1.2, 1.45, 0.9), V(sx - 1.0, 1.45, 0.82), MAN_END.clone().add(V(0, 1.55, 0)), MAN_END.clone().add(V(0, 1.6, 0)), 34, 28);
      if (id === 'tw1') { const c = coat.localToWorld(coat.pocket.c.clone()); fixed(c.clone().add(V(-0.35, 0.45, 0.32)), c.clone().add(V(-0.32, 0.42, 0.3)), c.clone().add(V(-0.06, 0, 0)), c.clone().add(V(-0.08, 0, 0)), 40, 37); }
      if (id === 'tw2' || id === 'tw3') { const c = receipt.position.clone(); c.y = DKH; fixed(c.clone().add(V(0.07, 0.4, 0.001)), c.clone().add(V(0.065, 0.37, 0.001)), c, c, id === 'tw2' ? 40 : 38, id === 'tw2' ? 37 : 35); }
      if (id === 'tw4') { const hd = wp(ines.bones.Head); fixed(hd.clone().add(V(0.85, 0.0, 0.35)), hd.clone().add(V(0.8, 0.0, 0.33)), hd.clone().add(V(0, -0.04, 0)), hd.clone().add(V(0, -0.04, 0)), 32, 29); }
      if (id === 'end') fixed(V(ST.DOOR + 3.2, 1.6, 6.5), V(ST.DOOR + 3.0, 1.6, 6.3), V(ST.DOOR, 2.4, 0), V(ST.DOOR, 2.4, 0), 50);
      if (q.get('mirtest')) { cam.position.set(sx, 1.6, -2.4); cam.lookAt(sx, 1.6, -4); cam.fov = 70; }
      if (roll) { const fwd = V(0, 0, -1).applyQuaternion(cam.quaternion); cam.up.set(0, 1, 0).applyAxisAngle(fwd, roll); const tgt = cam.position.clone().add(fwd); cam.lookAt(tgt); cam.up.set(0, 1, 0); }
      cam.updateProjectionMatrix(); cam.updateMatrixWorld();

      // --- looks
      if (set === 'bar') { G.uSat.value = 0.62; G.uTint.value.set(1.08, 0.98, 0.88); G.uVignette.value = 1.1; R.renderer.toneMappingExposure = 1.25; FILL.bar.intensity = 0.3; FILL.bar.position.copy(cam.position).add(V(0, 0.3, 0)); }
      if (['hook', 'f2', 'tip6', 'e3'].includes(id)) { RIM.bar.intensity = 0.8; RIM.bar.position.set(BAR.X0 + 0.6, 2.0, 0.8); }
      if (etsi) { G.uSat.value = 0.4; G.uTint.value.set(1.05, 0.95, 0.93); }
      // drugged: blur and double vision, a slow sway, the edges going dark
      const dz = id === 'e1b' ? smooth(0, 0.8, k) * 0.7 : id === 'e2' ? 0.7 + 0.3 * smooth(0, 1, k) : id === 'e3' ? 0.9 : 0;
      if (dz) { const w = tt * 1.1; G.uGhost.value = dz; G.uGhostO.value.set(0.012 * dz * Math.sin(w), 0.006 * dz * Math.cos(w * 0.7)); G.uTunnel.value = 0.55 * dz; G.uHeatA.value = 0.7 * dz; G.uHeatC.value.set(0.5, 0.5); G.uHeatR.value = 0.9; G.uAberr.value = 0.01 * dz; }
      if (['stat1', 'stat2'].includes(id)) { G.uSat.value = 0.25; R.renderer.toneMappingExposure = id === 'stat1' ? 0.9 : 1.2; }
      if (id === 'e4b') { RIM.bar.intensity = 4; RIM.bar.color.set('#ffc98a'); RIM.bar.position.set(2.6, 2.3, 0.6); FILL.bar.intensity = 0.8; FILL.bar.position.set(2.2, 1.6, 0.2); } else RIM.bar.color.set('#ff6a8a');
      if (id === 'hook') R.renderer.toneMappingExposure = 1.0;
      if (['s1', 's2', 'tw4'].includes(id)) R.renderer.toneMappingExposure = 0.95;
      if (['tw1', 'tw2', 'tw3'].includes(id)) { FILL.stn.intensity = 0.35; FILL.stn.position.copy(cam.position).add(V(0.1, 0.25, 0)); }
      if (id === 'end') G.uFade.value = 1;
      if (S.rewind.t0 <= t && t < S.rewind.t1) { G.uScan.value = 1.0; G.uSat.value = 0.4; G.uAberr.value = 0.012; G.uGhost.value = 0; G.uTunnel.value = 0; G.uHeatA.value = 0; }

      // --- overlay
      const endK = smooth(S.end.t0, S.end.t0 + 0.6, t);
      const close = ['etsi', 'r1', 's2', 'tw4', 'e3'].includes(id), phoneShot = id === 'tip5', topShot = ['tw2', 'tw3', 'e1a', 'stat1', 'tip1', 'tip2'].includes(id);
      const plate = id === 's1' ? { a: '2 h 58', b: 'COMMISSARIAT DU 18e · 6 %', k: smooth(S.s1.t0 + 0.1, S.s1.t0 + 0.4, t) * (1 - smooth(S.s1.t1 - 0.3, S.s1.t1, t)) }
        : id === 'f1' ? { a: '1 h 24', b: 'LE BAR · UNE HEURE PLUS TÔT', k: smooth(S.f1.t0 + 0.1, S.f1.t0 + 0.4, t) * (1 - smooth(S.f1.t1 - 0.3, S.f1.t1, t)) }
          : id === 'e1b' ? { a: '+ 10 min', b: '1 h 34', k: smooth(S.e1b.t0 + 0.1, S.e1b.t0 + 0.4, t) * (1 - smooth(S.e1b.t1 - 0.3, S.e1b.t1, t)) } : null;
      const clock = set === 'bar' ? '01:24' : ['tw1', 'tw2', 'tw3', 'tw4', 'end'].includes(id) ? '03:05' : '02:58';
      const bat = ['tw4', 'end'].includes(id) ? 3 : ['tw1', 'tw2', 'tw3'].includes(id) ? 4 : 6;
      const card = (a, b, s0) => ({ a, b, k: smooth(s0 + 0.1, s0 + 0.4, t) });
      ov.apply({ t, time: clock, bat, statA: id === 'end' || id === 'hook' || set === 'bar' ? 0 : 1, serA: id === 'end' ? 0 : 1, part: 'S2 · PARTIE 3',
        capA: id === 'end' ? 0 : 1, capY: id === 'hook' ? 76 : close ? 72 : phoneShot ? 84 : topShot ? 74 : 57, plate,
        etsi: id === 'etsi' ? smooth(S.etsi.t0, S.etsi.t0 + 0.25, t) : 0,
        rew: S.rewind.t0 <= t && t < S.rewind.t1 ? 1 : 0,
        notif: null,
        news: id === 'stat1' ? card('1 377 CAS SUSPECTS EN 2024', 'de soumission chimique signalés en France (ANSM, +30 % en un an)', S.stat1.t0)
          : id === 'stat2' ? card('LE PLUS SOUVENT : UN VERRE D’ALCOOL', 'deux victimes sur trois ne se souviennent de rien (ANSM 2024)', S.stat2.t0)
            : id === 'tip1' ? card('PAS VU SERVIR ? PAS BU.', 'n’acceptez pas un verre d’un inconnu', S.tip1.t0)
              : id === 'tip2' ? card('VERRE LAISSÉ SEUL ?', 'gardez-le à l’œil, sinon recommandez-en un', S.tip2.t0)
                : id === 'tip3' ? card('PRÉVENEZ LE PERSONNEL', 'le barman, la sécurité : ils peuvent agir', S.tip3.t0)
                  : id === 'tip4' ? card('MALAISE SOUDAIN ?', 'une amie, le personnel · 15 SAMU · 17 police', S.tip4.t0)
                    : id === 'tip5' ? card('PRISE DE SANG + URINE, VITE', 'les traces s’effacent en quelques heures · CRAFS 01 40 05 42 70', S.tip5.t0)
                      : id === 'tip6' ? card('ARTICLE 222-30-1 DU CODE PÉNAL', 'droguer quelqu’un pour l’agresser : 5 ans de prison, 75 000 € d’amende', S.tip6.t0) : null,
        capHtml: opts.cover ? '<span class="w1">Un </span><span class="r1">inconnu</span><span class="w1"> vous offre un verre…</span><br><span class="w1">vous le </span><span class="r1">buvez</span><span class="w1"> ?</span>'
          : id === 'hook' ? Ln[0].units.map((u) => { const on = t >= u.t0 - 0.12; return `<span class="${u.red ? (on ? 'r1' : 'r0') : (on ? 'w1' : 'w0')}">${u.shown}</span>${u.shown.endsWith('…') ? '<br>' : ' '}`; }).join('') : null,
        peep: 0, black: 0 });
      endEl.style.opacity = String(endK);
      tag.update(t, S.end.t0 + 0.6, endK);
      R.bloom.threshold = Math.min(0.85, 0.95 / R.renderer.toneMappingExposure);
      if (DBG) {
        const out = [`DBG ${id} t=${t.toFixed(2)}`];
        for (const [nm, av] of [['ines', ines], ['man', man], ['lea', lea], ['barman', barman], ['agent', agent]]) {
          if (!av.root.visible) continue;
          if (set === 'bar') out.push(`${nm} bar ${boxPen(av, ORIGIN, BAR_BOXES)}`);
          for (const g of [glassHer, glassHis]) if (g.visible) out.push(`${nm} ${g === glassHer ? 'gH' : 'gM'} ${boxPen(av, g, g.boxes || [g.box])}`);
          if (phone.visible && av === ines && !['e4', 'e4b', 'stat2'].includes(id)) out.push(`phone ${boxPen(ines, phone, phoneBox, handSet(ines, 'Right'))}`);
          if (coat.visible) out.push(`${nm} coat ${boxPen(av, coat, coat.boxes)}`);
          if (receipt.visible) out.push(`${nm} receipt ${boxPen(av, receipt, [receipt.box])}`);
        }
        if (id === 'e3') out.push(`grip ${armGrip(man, 'Left', ines, 'Right')}`);
        console.log(out.join(' | '));
      }
      R.composer.render();
    },
  };
}
