// Post 13: What if beauty standards were reversed for 5 years? (Piccadilly Circus, London, New Year's Eve; 68 s)
// Hook (0-3.6): midnight in slow motion: the Piccadilly Lights flip from a flawless beauty ad to "PRO-AGE: add 20 years",
// the crowd under them frozen, phones up; next to an empty bin, a man drops his coffee cup on the pavement (rule 19's
// WTF: he does it every time we see him, his pile grows through all five years and the bin stays empty).
// Calm (3.6-12): 11:59 pm on New Year's Eve; from over the Circus (the Lights count down to 2027) down to you on Eros'
// steps, your selfie from last week on your phone: 12 likes. The flip (12-19.6): midnight; your worst photo goes to
// 3 million likes. Years 1-2 (19.6-36.3): the beauty industry runs backwards on the Lights; the clinics undo their work;
// snow in Year 2. Years 3-4 (36.3-52.2): your face on the Piccadilly Lights; it has happened before (the 1920s tan).
// Year 5 (52.2-62): New Year's Eve again; at midnight it all flips back; your likes crash to 12. Loop end card (62-68).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { createRenderer, Overlay, W, H as HH, rng, smooth, clamp, captionAt, hudK } from '../engine/core.js';
import { makeEndTag } from '../engine/endtag.js';
import { TEX_PENDING, twoBoneIK, loadMannequin, cloneMannequin } from '../engine/elevator.js';
import { fadeShadowBorders, Sparks } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand, sit, cloneAvatar, rotW, bodyFrame, lookAt } from '../engine/poses.js';
import { makeCat } from '../engine/cat.js';
import { makeBus, makeCab } from '../engine/props15.js';
import { makePhone } from '../engine/props16.js';
import { PC, EROS, loadOSM, makeGround, makeBuildings, makeLightsScreen, makeFountain, poseArcher, makeLamps, lampSites, makeNightSky, thirds } from '../engine/piccadilly.js';
import { PW, PH, loadFonts, renderShot, productShot, drawBefore, drawAfter, drawFace, drawHistory, drawPhone } from '../engine/ads19.js';
import { BIN, makeBin, buildPile, pileMeshes, looseItem, makePhoneBox, crowdPhone, makeBow } from '../engine/props19.js';
import { T, DUR, dayAt, storyAt, likesAt, followersAt, PSI, HERO_DIR, HERO, HF, SEAT_R, SEAT_Y, BIN_P, PILE_C, BINGUY_P, PHONEBOX_P, CAMS, shotAt, SH } from './ep19cams.js';

const TITLE = 'What if beauty standards were <span class="k">reversed</span> for 5 years?';
const CAPTIONS = [
  [3.75, 7.25, 'Piccadilly Circus, London. 11:59 pm.'],
  [7.35, 11.85, 'Your selfie from last week: 12 likes.'],
  [12.05, 14.95, 'At midnight, beauty flips.'],
  [15.05, 18.75, 'Your worst photo: 3 million likes.'],
  [19.7, 24.3, 'Year 1: a $446-billion industry runs backwards.'],
  [24.4, 28.35, 'Anti-ageing cream? Now it\'s ageing cream.'],
  [28.5, 32.25, 'Year 2: clinics undo their own work.'],
  [32.35, 36.25, '35 million procedures a year, reversed.'],
  [36.4, 40.58, 'Year 3: your face on the Piccadilly Lights.'],
  [40.68, 44.53, 'The most-followed people are strangers.'],
  [44.7, 47.5, 'It\'s happened before.'],
  [47.6, 52.12, 'In the 1920s, a tan went from shameful to chic.'],
  [52.3, 55.9, 'Year 5. Midnight. It all flips back.'],
  [56.0, 58.8, 'Your 3 million fans? Gone.'],
  [58.9, 61.7, 'Would you finally be a 10?'],
];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(V(0, 0, 0));
const big = (x) => Math.round(x).toLocaleString('en-US');
const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; };
const K = PC.KERB;

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#2a2226', 0.0032);
  const T0 = performance.now(), tl = (lab) => console.log('t+', ((performance.now() - T0) / 1000).toFixed(1), lab);

  // ---- sky and its reflections ----
  const SKY = makeNightSky(); scene.add(SKY.mesh);
  { const pm = new THREE.PMREMGenerator(R.renderer), envScene = new THREE.Scene(), envSky = makeNightSky(); envScene.add(envSky.mesh);
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(5000, 32), new THREE.MeshBasicMaterial({ color: '#141012' })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -20; envScene.add(gnd);
    scene.environment = pm.fromScene(envScene, 0, 1, 20000).texture; }
  scene.environmentIntensity = 0.8;
  const env = scene.environment;

  // ---- the set ----
  const osm = await loadOSM();
  const G = makeGround(osm, R.renderer, { ssaa: globalThis.SSAA, lo: q.get('lo') === '1' }); scene.add(G.refl, G.road, G.pave, G.kerb);
  const BLD = makeBuildings(osm); scene.add(BLD.mesh, BLD.roofs);
  const SCR = makeLightsScreen(osm); scene.add(SCR.mesh, SCR.frame, ...SCR.lights);
  const FO = makeFountain({ rot: PSI - Math.PI / 8 }); scene.add(FO.group);
  const sites = lampSites(G, { avoid: [[0, 0, 7], [BIN_P.x, BIN_P.z, 3.5], [PHONEBOX_P.x, PHONEBOX_P.z, 2]] });
  { const lp = HF(5.2, 3.8, 0); sites.unshift({ x: lp.x, y: K, z: lp.z }); }                     // a lamp beside the bin's pile (it lights its front)
  const LAMPS = makeLamps(sites); scene.add(LAMPS.group);
  LAMPS.heads.slice(0, 40).forEach((h, i) => PC.U.uLampP.value[i].set(h.x, h.y, h.z, 1)); PC.U.uLampN.value = Math.min(40, LAMPS.heads.length);
  const gy = (x, z) => (G.isRoad(x, z) ? 0 : K);
  console.log('bin on road?', G.isRoad(BIN_P.x, BIN_P.z), 'pile', G.isRoad(PILE_C.x, PILE_C.z), 'box', G.isRoad(PHONEBOX_P.x, PHONEBOX_P.z));
  tl('set');

  // ---- the statue: the Xbot mannequin posed as the archer ----
  const xg = await loadMannequin(); const xb = cloneMannequin(xg); scene.add(xb.root);
  const ARCH = poseArcher(xb);
  {
    const B = xb.bones, S = 1.32, face = PSI + Math.PI * 0.62, fs = V(Math.sin(face), 0, Math.cos(face));
    xb.root.scale.setScalar(S); xb.root.position.set(0, EROS.STATUE_Y, 0); xb.root.rotation.set(0, face, 0);
    for (const [k, qq] of Object.entries(xb.rest)) xb.bones[k].quaternion.copy(qq);
    xb.root.updateMatrixWorld(true);
    const { left, up } = bodyFrame(xb), P = wp(B.Hips);
    rotW(B.Spine, left, 0.22); rotW(B.Spine1, left, 0.12); xb.root.updateMatrixWorld(true);
    twoBoneIK(xb, 'LeftUpLeg', 'LeftLeg', 'LeftFoot', V(0, EROS.STATUE_Y + 0.1, 0).addScaledVector(fs, -0.05).addScaledVector(left, 0.06), P.clone().addScaledVector(fs, 1.5));
    twoBoneIK(xb, 'RightUpLeg', 'RightLeg', 'RightFoot', P.clone().addScaledVector(fs, -0.75).addScaledVector(up, -0.35).addScaledVector(left, -0.12), P.clone().addScaledVector(up, -1.5).addScaledVector(fs, 0.4));
    const shL = wp(B.LeftArm), shR = wp(B.RightArm);
    twoBoneIK(xb, 'LeftArm', 'LeftForeArm', 'LeftHand', shL.clone().addScaledVector(fs, 0.78).addScaledVector(up, 0.08).addScaledVector(left, 0.05), shL.clone().addScaledVector(up, -1).addScaledVector(left, 0.5));
    twoBoneIK(xb, 'RightArm', 'RightForeArm', 'RightHand', shR.clone().addScaledVector(fs, 0.12).addScaledVector(left, 0.12).addScaledVector(up, 0.02), shR.clone().addScaledVector(fs, -1).addScaledVector(up, 0.2).addScaledVector(left, -0.4));
    xb.root.updateMatrixWorld(true);
    const hl = wp(B.LeftHand), bow = makeBow(ARCH.alu); bow.position.copy(hl); bow.lookAt(hl.clone().add(left)); bow.rotateY(Math.PI / 2); scene.add(bow);
    const s2 = wp(B.Spine2); ARCH.wings.position.copy(s2).addScaledVector(fs, -0.12); ARCH.wings.rotation.y = face; ARCH.wings.scale.setScalar(S); scene.add(ARCH.wings);
    let low = 1e9; xb.root.traverse((o) => { if (o.isSkinnedMesh) { const pp = o.geometry.attributes.position, v = V(0, 0, 0); for (let i = 0; i < pp.count; i += 9) { o.getVertexPosition(i, v); o.localToWorld(v); low = Math.min(low, v.y); } } });
    const dy = EROS.STATUE_Y + 0.02 - low; xb.root.position.y += dy; bow.position.y += dy; ARCH.wings.position.y += dy; xb.root.updateMatrixWorld(true);
  }
  tl('statue');

  // ---- people ----
  await loadFonts();
  const you = await loadAvatar('Male_Adult_13', { env, facial: true }); scene.add(you.root);
  console.log('shapes', you.shapeNames.slice(0, 90).join(','));
  const model = await loadAvatar(q.get('glam') || 'Female_Adult_15', { env, facial: false });
  const guy = await loadAvatar('Business_Male_03', { env }); scene.add(guy.root);
  const morph = (av, map) => { for (const m of av.meshes) { const d = m.morphTargetDictionary; if (!d) continue; m.morphTargetInfluences.fill(0);
    for (const [k, v] of Object.entries(map)) for (const [nm, i] of Object.entries(d)) if (nm.toLowerCase().includes(k.toLowerCase())) m.morphTargetInfluences[i] = v; } };
  tl('avatars');

  // ---- the pictures: products, the flawless face, your worst selfie (only once every texture has arrived) ----
  await Promise.all(TEX_PENDING);
  const shots = { jar: productShot(R.renderer, 'jar'), tube: productShot(R.renderer, 'tube'), dropper: productShot(R.renderer, 'dropper'), can: productShot(R.renderer, 'can') };
  function studioRender(av, { camPos, look, fov, w, h, flash = false, exposure = 1, bg = null }) {
    const s = new THREE.Scene(), pm = new THREE.PMREMGenerator(R.renderer); s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = flash ? 0.25 : 0.6;
    if (flash) { const f = new THREE.PointLight('#ffffff', 0.55, 0, 2); f.position.copy(camPos).add(V(0.02, 0.03, 0)); s.add(f, new THREE.AmbientLight('#8a7a9a', 0.6)); }
    else { const k = new THREE.DirectionalLight('#fff3ea', 3.6); k.position.set(-0.6, 1.9, 2.6); const r = new THREE.DirectionalLight('#ffe8d8', 2.6); r.position.set(1.6, 2.2, -2.4); const f = new THREE.DirectionalLight('#e8eeff', 1.3); f.position.set(2, 1.2, 2.2); s.add(k, r, f); }
    const parent = av.root.parent; s.add(av.root);
    const c = new THREE.PerspectiveCamera(fov, w / h, 0.02, 20); c.position.copy(camPos); c.lookAt(look);
    const out = renderShot(R.renderer, s, c, w, h, { exposure, bg });
    if (parent) parent.add(av.root); else s.remove(av.root);
    return out;
  }
  // the flawless face of before (LUMIÈRE)
  stand(model, { pos: V(0, 0, 0), yaw: 0, look: V(0, 1.62, 2), lookK: 1 }); morph(model, { smile: 0.18 }); model.root.updateMatrixWorld(true);
  const mh = wp(model.bones.Head);
  const glamRaw = studioRender(model, { camPos: V(0.05, mh.y + 0.04, 0.95), look: V(0, mh.y - 0.02, 0), fov: 26, w: 1045, h: 1080, exposure: 2.0, bg: '#4a342c' });
  const glam = document.createElement('canvas'); glam.width = 1045; glam.height = 1080;
  { const g = glam.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 1080); gr.addColorStop(0, '#e9ddd2'); gr.addColorStop(1, '#bba493'); g.fillStyle = gr; g.fillRect(0, 0, 1045, 1080); g.drawImage(glamRaw, 0, 0); }
  // your worst selfie: from below, the flash, eyes half shut, mid-word
  stand(you, { pos: V(0, 0, 0), yaw: 0, look: V(0.05, 1.45, 0.5), lookK: 1, armR: (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(fwd, 0.45).addScaledVector(up, -0.1).addScaledVector(left, 0.05), pole: sh.clone().addScaledVector(up, -1).addScaledVector(left, -0.5) }) });
  morph(you, { jawopen: 0.32, mouthfunnel: 0.15, browinnerup: 0.3 }); you.blink(0.55); you.root.updateMatrixWorld(true);
  const yh = wp(you.bones.Head);
  const selfieRaw = studioRender(you, { camPos: V(0.04, yh.y - 0.13, 0.38), look: V(0, yh.y + 0.03, 0), fov: 60, w: 900, h: 1100, flash: true, exposure: 1.4, bg: '#0b0910' });
  const selfie = document.createElement('canvas'); selfie.width = 900; selfie.height = 1100;
  { const g = selfie.getContext('2d'); g.fillStyle = '#0c0a12'; g.fillRect(0, 0, 900, 1100); const r = rng(9);
    for (let i = 0; i < 26; i++) { const x = r() * 900, y = r() * 700, rad = 30 + r() * 90, c = ['#ff9a3c', '#ffd27a', '#ff4f6b', '#7fb4ff'][i % 4]; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, c + '99'); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    g.drawImage(selfieRaw, 0, 0); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, 900, 1100); }
  morph(you, {}); you.blink(0);
  if (q.get('shots') === '1') { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;z-index:99;display:flex;flex-wrap:wrap;width:1080px;background:#222';
    for (const c of [glam, selfie, shots.jar, shots.tube, shots.dropper, shots.can]) { c.style.cssText = 'width:360px;height:auto'; d.appendChild(c); } document.body.appendChild(d); }
  tl('pictures');

  // ---- the Lights' pages ----
  const mkPage = () => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return { c, t, avg: null }; };
  const pCount = mkPage(), pA0 = mkPage(), pA1 = mkPage(), pA2 = mkPage(), pFace = mkPage(), pHist = mkPage(), pLum = mkPage();
  drawAfter(pA0.c, { variant: 0, shots }); drawAfter(pA1.c, { variant: 1, shots }); drawAfter(pA2.c, { variant: 2, shots });
  drawFace(pFace.c, { selfie, likes: '3.2M' }); drawHistory(pHist.c);
  { const g = pLum.c.getContext('2d'); const bgr = g.createLinearGradient(0, 0, PW, PH); bgr.addColorStop(0, '#5a4038'); bgr.addColorStop(1, '#24170f'); g.fillStyle = bgr; g.fillRect(0, 0, PW, PH); g.drawImage(glam, PW - 1045 - 300, 0); g.fillStyle = '#f6ece4'; g.textAlign = 'center';
    g.font = '260px "Instrument Serif"'; g.fillText('LUMIÈRE', 820, 560); g.font = 'italic 110px "Instrument Serif"'; g.fillText('Flawless. Ageless.', 820, 720); g.font = '600 50px Inter'; g.fillText('HAPPY 2032', 820, 860); }
  for (const p of [pA0, pA1, pA2, pFace, pHist, pLum]) { p.t.needsUpdate = true; p.avg = thirds(p.c); }
  let countKey = '';
  const countPage = (year, secs) => { const key = year + ':' + Math.ceil(Math.max(0, secs)); if (key !== countKey) { drawBefore(pCount.c, { secs, year, glam }); pCount.t.needsUpdate = true; pCount.avg = thirds(pCount.c); countKey = key; } return pCount; };
  // the page shown at story time s: [start of each wipe, its length]; page i is shown before wipe i
  const WIPES = [[T.FLIP, 0.7], [24.3, 0.6], [29.0, 0.6], [37.2, 0.8], [45.0, 0.7], [T.BACK, 0.7]];
  const pageN = (i, s) => [() => countPage(2027, T.FLIP - s), () => pA0, () => pA1, () => pA2, () => pFace, () => (s < T.Y5 ? pHist : countPage(2032, T.BACK - s)), () => pLum][i]();
  function screenAt(t) {
    const s = storyAt(t);
    let i = 0; while (i < WIPES.length && s >= WIPES[i][0] + WIPES[i][1]) i++;
    if (i >= WIPES.length) return { a: pageN(6, s), b: null, mix: 0 };
    const [w0, wd] = WIPES[i];
    if (s < w0) return { a: pageN(i, s), b: null, mix: 0 };
    const k = (s - w0) / wd; return { a: pageN(i, s), b: pageN(i + 1, s), mix: k * k * (3 - 2 * k) };
  }

  // ---- you on Eros' steps with your phone ----
  const phone = makePhone(); scene.add(phone); phone.screen.material.emissiveIntensity = 0.45;
  const pcv = phone.tex.image;
  const FLOOR_Y = K + EROS.RISE;
  const tmpA = V(0, 0, 0), tmpB = V(0, 0, 0), mB = new THREE.Matrix4();
  function phoneFit(av, ph, side = 'Right') {
    const B = av.bones, hd = wp(B[side + 'Hand']), i1 = wp(B[side + 'HandIndex1']), p1 = wp(B[side + 'HandPinky1']), m1 = wp(B[side + 'HandMiddle1']);
    const Z = tmpA.copy(i1).sub(p1).cross(tmpB.copy(m1).sub(hd)).normalize(); if (side === 'Left') Z.negate();
    const X = hd.clone().sub(m1); X.addScaledVector(Z, -X.dot(Z)).normalize(); if (side === 'Left') X.negate();
    const Y = Z.clone().cross(X).normalize();
    mB.makeBasis(X, Y, Z); ph.quaternion.setFromRotationMatrix(mB);
    ph.position.copy(m1).addScaledVector(X, -0.03).addScaledVector(Z, 0.0375).addScaledVector(Y, 0.004); ph.updateMatrixWorld(true);
  }
  const blinkK = (t, list) => { let k = 0; for (const b0 of list) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  const BLINKS = [4.9, 7.6, 10.2, 13.4, 16.9, 18.6, 38.1, 42.7, 47.9, 50.6, 53.1, 55.2, 57.4, 59.8, 61.2];
  const camPos = V(0, 0, 0);
  function poseYou(t) {
    const s = storyAt(t);
    const lookUp = s >= T.Y5 ? smooth(T.Y5 + 0.2, T.Y5 + 1.0, s) * (1 - smooth(T.BACK + 1.4, T.BACK + 2.0, s)) : smooth(T.FLIP + 3.4, T.FLIP + 4.6, s) * (1 - smooth(T.Y1 - 0.2, T.Y1, s));
    sit(you, { pos: HERO, yaw: PSI, seat: 0.1, legs: 'chair', floor: FLOOR_Y, breath: t * 0.26, lean: 0.12,
      handR: (P, fwd, left, up) => ({ hand: P.clone().addScaledVector(up, 0.47).addScaledVector(fwd, 0.33).addScaledVector(left, -0.04),
        pole: P.clone().addScaledVector(up, 0.15).addScaledVector(left, -0.45).addScaledVector(fwd, 0.05),
        F: left.clone().multiplyScalar(0.82).addScaledVector(fwd, 0.3).addScaledVector(up, 0.3), N: up.clone().multiplyScalar(0.75).addScaledVector(fwd, -0.66) }),
      curlR: 0.0 });
    you.root.updateMatrixWorld(true);
    phoneFit(you, phone);
    let look = phone.position.clone().lerp(SCR.curve.getPointAt(0.45).setY(14), lookUp);
    const atYou = smooth(58.2, 59.2, s);                                   // the last line: he looks up at you
    if (atYou > 0) look = look.lerp(camPos, atYou);
    lookAt(you, look, 0.9);
    // face: delight at the flip, a slow smile at the very end
    const joy = smooth(T.FLIP + 0.6, T.FLIP + 1.6, s) * (1 - smooth(T.Y1 - 0.3, T.Y1, s));
    morph(you, { jawopen: 0.28 * joy * (1 - smooth(T.FLIP + 2.5, T.FLIP + 4, s)), browinnerup: 0.5 * joy,
      mouthsmile: 0.55 * smooth(T.FLIP + 2.2, T.FLIP + 3.4, s) * (1 - smooth(T.Y1 - 0.3, T.Y1, s)) + 0.55 * smooth(59.0, 60.4, s) });
    you.blink(blinkK(t, BLINKS)); you.root.updateMatrixWorld(true); phoneFit(you, phone);
  }

  // ---- the bin, the pile, its neighbour ----
  const bin = makeBin(); bin.position.set(BIN_P.x, gy(BIN_P.x, BIN_P.z), BIN_P.z); bin.rotation.y = Math.atan2(PILE_C.x - BIN_P.x, PILE_C.z - BIN_P.z) + Math.PI / 2; scene.add(bin);
  const PILE_N = 2100;
  const P = buildPile(PILE_N, { cx: PILE_C.x, cz: PILE_C.z, seed: 19, keepOut: (x, z) => Math.hypot(x - BIN_P.x, z - BIN_P.z) < BIN.R + 0.14 });
  const PM = pileMeshes(P); PM.group.position.y = gy(PILE_C.x, PILE_C.z); scene.add(PM.group);
  
  // each take starts with a pile; he drops the next item every time we see him (the hook's drop is in slow motion)
  const TAKES = [[0, T.HOOK, 3], [T.HOOK, T.FLIP, 2], [T.FLIP, T.Y1, 3], [T.Y1, T.Y3, 300], [T.Y3, T.Y5, 1000], [T.Y5, DUR, 2050]];
  const DROPS = [[12.05, 0], [9.6, 1], [18.3, 2], [21.8, 3], [31.0, 3], [39.2, 4], [47.6, 4], [53.4, 5]];   // [story time of release, take]
  const takeAt = (t) => Math.max(0, TAKES.findIndex(([a, b]) => t >= a && t < b));
  const hand = looseItem(P, 0); hand.userData.k = 0; scene.add(hand);
  const guyYaw = Math.atan2(PILE_C.x - BINGUY_P.x, PILE_C.z - BINGUY_P.z) - 0.6;
  const SCRL = SCR.curve.getPointAt(0.5).setY(13);
  function poseGuy(t) {
    const ti = takeAt(t), base = TAKES[ti][2], drops = DROPS.filter((d) => d[1] === ti);
    const tt = storyAt(t);                                                        // the hook is in slow motion
    let count = base, cur = null;
    for (const [tr] of drops) { if (tt >= tr + 0.7) count++; else if (cur === null) cur = tr; }
    const k = count, tr = cur ?? -1e9, lift = cur !== null ? smooth(tr - 1.3, tr - 0.35, tt) : 0, back = smooth(tr + 0.1, tr + 0.9, tt);
    const topY = PM.group.position.y + (k > 0 ? P.items[Math.max(0, k - 1)].top : 0.1);
    stand(guy, { pos: V(BINGUY_P.x, gy(BINGUY_P.x, BINGUY_P.z), BINGUY_P.z), yaw: guyYaw, breath: tt * 0.24 + 0.4, look: SCRL, lookK: 0.7,
      armR: (sh, fwd, left, up) => { const rest = sh.clone().addScaledVector(up, -0.5).addScaledVector(fwd, 0.18).addScaledVector(left, -0.08);
        const over = PILE_C.clone().setY(Math.max(sh.y - 0.15, topY + 0.35)), dir = over.clone().sub(sh); dir.setLength(Math.min(0.58, dir.length()));
        const a = cur !== null ? lift * (1 - back) : 0;
        return { hand: rest.clone().lerp(sh.clone().add(dir), a), pole: sh.clone().addScaledVector(up, -0.6).addScaledVector(left, -0.4).addScaledVector(fwd, -0.2), curl: 0.55 * (1 - smooth(tr - 0.05, tr + 0.05, tt)) }; } });
    guy.root.updateMatrixWorld(true);
    PM.show(count);
    // the item: in his hand until he lets go, then a parabola onto its spot on the pile
    if (cur !== null && k < P.items.length) {
      const it = P.items[k], hp = wp(guy.bones.RightHand).add(V(0, -0.03, 0)), dest = it.p.clone().add(PM.group.position);
      if (hand.userData.k !== k) { const nm = looseItem(P, k); hand.geometry = nm.geometry; hand.material = nm.material; hand.userData.k = k; }
      hand.visible = true;
      const hq = guy.bones.RightHand.getWorldQuaternion(new THREE.Quaternion());
      if (tt < tr) { hand.position.copy(hp); hand.quaternion.copy(hq); }
      else { const Tf = 0.7, g = -9.81, ft = clamp((tt - tr) / Tf) * Tf, v0 = dest.clone().sub(hp).multiplyScalar(1 / Tf); v0.y -= 0.5 * g * Tf;
        hand.position.copy(hp).addScaledVector(v0, ft); hand.position.y += 0.5 * g * ft * ft; hand.quaternion.copy(hq).slerp(it.q, ft / Tf); }
    } else hand.visible = false;
  }

  // ---- the phone box (Apple sits on its roof) ----
  const box = makePhoneBox(); box.position.set(PHONEBOX_P.x, gy(PHONEBOX_P.x, PHONEBOX_P.z), PHONEBOX_P.z); box.rotation.y = PSI + Math.PI * 0.5; scene.add(box);
  const apple = makeCat(); apple.root.position.set(BIN_P.x, bin.position.y + 1.085, BIN_P.z); apple.root.rotation.y = PSI + Math.PI + 0.5; scene.add(apple.root);

  // ---- the crowd: New Year's Eve under the Lights ----
  const BASES = ['Female_Adult_01', 'Male_Adult_05', 'Female_Adult_12', 'Male_Adult_08', 'Female_Adult_09', 'Male_Adult_11', 'Female_Adult_14', 'Male_Adult_16', 'Female_Adult_06', 'Sports_Male_02', 'Female_Party_02', 'Male_Adult_18'];
  const bases = []; for (const n of BASES) bases.push(await loadAvatar(n, { env, lod: 512 }));
  tl('crowd bases');
  const crowd = [], cr = rng(41);
  const ok = (x, z) => !G.isRoad(x, z) && Math.hypot(x, z) > 5.6 && Math.hypot(x - PILE_C.x, z - PILE_C.z) > 2.4 && Math.hypot(x - BINGUY_P.x, z - BINGUY_P.z) > 1.4
    && Math.hypot(x - PHONEBOX_P.x, z - PHONEBOX_P.z) > 1.3 && sites.every((st) => Math.hypot(x - st.x, z - st.z) > 0.6);
  const spots = [];
  for (let tries = 0; tries < 6000 && spots.length < 34; tries++) {
    const x = -15 + cr() * 34, z = -16 + cr() * 26; if (!ok(x, z)) continue;
    if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < 1.05)) continue;
    spots.push({ x, z });
  }
  spots.forEach((p, i) => {
    const av = cloneAvatar(bases[i % bases.length], skClone); scene.add(av.root);
    const film = cr() < 0.42, ph = film ? crowdPhone() : null; if (ph) scene.add(ph);
    crowd.push({ av, x: p.x, z: p.z, yaw: Math.atan2(SCRL.x - p.x, SCRL.z - p.z) + (cr() - 0.5) * 0.5, film, ph, ph0: cr() * 10 });
  });
  for (let k = 0; k < 3; k++) {   // three more on the steps
    const a = PSI + [0.75, -0.8, 1.35][k], av = cloneAvatar(bases[(k * 5 + 3) % bases.length], skClone); scene.add(av.root);
    crowd.push({ av, sit: true, x: Math.sin(a) * SEAT_R, z: Math.cos(a) * SEAT_R, yaw: a, ph0: k * 3.1 });
  }
  const filmArm = (sh, fwd, left, up) => ({ hand: sh.clone().addScaledVector(up, 0.12).addScaledVector(fwd, 0.42).addScaledVector(left, 0.14),
    pole: sh.clone().addScaledVector(up, -0.6).addScaledVector(left, -0.35).addScaledVector(fwd, -0.15), F: left.clone().multiplyScalar(0.3).addScaledVector(up, 0.9), N: fwd.clone().multiplyScalar(-1), curl: 0.1 });
  function poseCrowd(t) {
    crowd.forEach((c) => {
      if (c.sit) { sit(c.av, { pos: V(c.x, SEAT_Y, c.z), yaw: c.yaw, seat: 0.1, legs: 'chair', floor: FLOOR_Y, breath: t * 0.25 + c.ph0, arms: 'knees', look: SCRL, lookK: 0.6 }); return; }
      const look = SCRL.clone().add(V(Math.sin(t * 0.3 + c.ph0) * 6, Math.sin(t * 0.21 + c.ph0) * 2, 0));
      stand(c.av, { pos: V(c.x, gy(c.x, c.z), c.z), yaw: c.yaw, breath: t * 0.25 + c.ph0, look, lookK: 0.8, armR: c.film ? filmArm : undefined, cache: c.cache || (c.cache = {}) });
      if (c.ph) { c.av.root.updateMatrixWorld(true); phoneFit(c.av, c.ph); }
    });
  }

  // ---- traffic: buses and cabs on the one-way streets round the Circus (driving on the left) ----
  const findRoad = (a) => osm.roads.find((r) => Math.hypot(r.p[0][0] - a[0], r.p[0][1] - a[1]) < 0.5);
  const chain = (starts) => { const pts = []; for (const st of starts) { const r = findRoad(st); if (!r) { console.log('no road at', st); continue; }
    for (const p of r.p) if (!pts.length || Math.hypot(pts[pts.length - 1][0] - p[0], pts[pts.length - 1][1] - p[1]) > 0.5) pts.push(p); } return pts; };
  const PATHS = [chain([[-71.31, -14.3], [-10.31, -21.74], [-0.23, -19.29]]), chain([[15.46, -44.34], [-0.23, -19.29], [-19.65, 18.42]]), chain([[12.72, 73.88], [-19.65, 18.42], [-26.07, 6.34], [-10.31, -21.74], [15.46, -44.34]])]
    .filter((pts) => pts.length > 1).map((pts) => { const c = new THREE.CatmullRomCurve3(pts.map((p) => V(p[0], 0, p[1])), false, 'centripetal'); return { c, L: c.getLength() }; });
  const vehicles = [], vr = rng(8);
  PATHS.forEach((pa) => { const n = Math.floor(pa.L / 34); for (let k = 0; k < n; k++) { const bus = vr() < 0.35, m = bus ? makeBus([{ route: '38', to: 'Victoria' }, { route: '14', to: 'Putney Heath' }, { route: '19', to: 'Battersea Bridge' }][vehicles.length % 3]) : makeCab(); scene.add(m); m.traverse((o) => { if (o.material && o.material.emissiveIntensity > 0.3) o.material.emissiveIntensity = 0.16; if (o.isMesh) o.castShadow = true; });
    vehicles.push({ m, pa, s0: k * pa.L / n + vr() * 6, v: bus ? 5.2 : 6.5 + vr() * 1.5, lane: bus ? 1.7 : (vr() < 0.5 ? 1.7 : -1.6) }); } });
  const TRAFFIC_OFF = [0, 36, 0, 26, 20, -26, -12, 0];   // per shot: a traffic clock offset keeping buses out of the lens (tools/traffic19.mjs)
  function poseTraffic(t) {
    const s = storyAt(t) + TRAFFIC_OFF[shotAt(t)];
    for (const v of vehicles) { const u = ((v.s0 + v.v * s) % v.pa.L + v.pa.L) % v.pa.L / v.pa.L; const p = v.pa.c.getPointAt(u), d = v.pa.c.getTangentAt(u);
      v.m.position.copy(p).addScaledVector(V(d.z, 0, -d.x), v.lane); v.m.position.y = 0; v.m.rotation.set(0, Math.atan2(d.x, d.z), 0); }
  }

  // ---- snow (Year 2) ----
  const SNOW_N = 9000, snow = new Sparks(SNOW_N, { additive: false, minPx: 1.6, maxPx: 16, near: 1.2 }); scene.add(snow.points); snow.points.layers.set(1);
  const sr = rng(77), SN = []; for (let i = 0; i < SNOW_N; i++) SN.push([sr(), sr(), sr(), sr()]);
  function poseSnow(t, c, on) {
    snow.points.visible = on > 0; if (!(on > 0)) return;
    const B = 24, p = c.position;
    for (let i = 0; i < SNOW_N; i++) { const [a, b, cc, d] = SN[i];
      const x = p.x + ((((a * B + Math.sin(t * 0.7 + d * 6) * 0.4 - p.x) % B) + B * 1.5) % B - B / 2);
      const z = p.z + ((((cc * B + Math.cos(t * 0.6 + d * 5) * 0.4 - p.z) % B) + B * 1.5) % B - B / 2);
      const y = p.y - 12 + ((((b * 24 - t * (0.9 + 0.4 * d)) - (p.y - 12)) % 24) + 24) % 24;
      snow.set(i, x, Math.max(y, 0.15), z, 0, 0, 0, 0.95 * on, 0.96 * on, on, 0.032 + 0.02 * d, -1e6, 1e7, d); }
    snow.commit();
  }

  // ---- lights ----
  const hemi = new THREE.HemisphereLight('#4a4f6a', '#221a16', 0.5); scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffffff', 0.6); key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.08;
  { const c = SCR.curve.getPointAt(0.5); key.position.set(c.x, 16, c.z); key.target.position.set(0, 0, 0); const s = key.shadow.camera; s.left = -40; s.right = 40; s.top = 40; s.bottom = -40; s.near = 1; s.far = 140; }
  scene.add(key, key.target);
  const faceFill = new THREE.PointLight('#ffd6b0', 0, 4, 2); scene.add(faceFill);     // the phone's glow on your face
  LAMPS.heads.slice(1).sort((a, b) => a.length() - b.length()).slice(0, 5).concat([LAMPS.heads[0]]).forEach((h) => { const l = new THREE.PointLight('#ffc98a', 14, 22, 2); l.position.copy(h); scene.add(l); });
  const tag = makeEndTag({ text: 'Follow for more', ssaa: globalThis.SSAA });
  await Promise.all(TEX_PENDING);
  tl('ready');

  const cam = new THREE.PerspectiveCamera(40, W / HH, 0.1, 20000);
  cam.layers.enable(1);
  const shotId = shotAt;   // SH: hook, calm, phone, wide, years 1-2, years 3-4, Year 5 (the countdown), your face
  const SUBS = [[T.FLIP, 'Beauty industry: $446 bn a year'], [T.Y2, 'Procedures: 34.9 million a year'], [T.Y3, 'Piccadilly Lights: 783 m² of LEDs'], [T.Y4, 'Your followers: 48 million'], [T.Y5, 'Midnight, Year 5']];
  function hudAt(t) {
    const s = storyAt(t), k = hudK(t, T.FLIP);
    if (t < T.FLIP) return { a: 1, k, lab: 'Beauty flips in', val: fmtT(T.FLIP - (t < T.HOOK ? t : s)), sub: 'Piccadilly Circus · London', sub2: 'New Year\'s Eve · 23:59' };
    if (t >= T.END) return null;
    const a = 1 - smooth(T.END - 0.3, T.END, t), d = Math.floor(dayAt(t)), yr = Math.min(5, 1 + Math.floor(d / 365.25));
    let sub2 = SUBS[0][1]; for (const [t0, s2] of SUBS) if (t >= t0) sub2 = s2;
    if (t >= T.BACK) return { a, k, lab: 'Beauty flipped back', val: 'Day 1,826', sub: `Your likes: ${big(likesAt(t))}`, sub2: 'Everything back to normal' };
    return { a, k, lab: `Year ${yr} · beauty reversed`, val: `Day ${big(Math.max(1, d))}`, sub: `Your likes: ${big(likesAt(t))}`, sub2 };
  }
  const NOTIF = [{ at: T.FLIP + 0.3, text: '1,204 people liked your photo' }, { at: T.FLIP + 1.0, text: 'Your photo is trending in London' }, { at: T.FLIP + 1.8, text: 'You have 98,000 new followers' }];

  function frame(t) {
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.08; U.uContrast.value = 1.06; U.uVignette.value = 0.32; U.uAberr.value = 0.0012; U.uGrain.value = 0; U.uBarrel.value = 0; U.uWarp.value = 0;
    const id = shotId(t), s = storyAt(t);
    // ---- cameras ----
    CAMS[id].apply(cam, t); camPos.copy(cam.position);
    if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
    SKY.mesh.position.copy(cam.position);
    // ---- the Lights and their glow ----
    const sc = screenAt(t);
    SCR.U.tA.value = sc.a.t; SCR.U.tB.value = (sc.b || sc.a).t; SCR.U.uMix.value = sc.b ? sc.mix : 0; SCR.U.uBand.value = sc.b ? 0.9 * Math.sin(Math.PI * sc.mix) : 0; SCR.U.uW.value = 0.035; SCR.U.uGain.value = 1.0;
    SCR.lights.forEach((l, i) => { const ca = sc.a.avg[i], cb = sc.b ? sc.b.avg[i] : ca, w = sc.b ? clamp((sc.mix - i / 3) * 3) : 0; l.color.copy(ca).lerp(cb, w);
      const lum = l.color.r * 0.3 + l.color.g * 0.6 + l.color.b * 0.1; l.color.multiplyScalar(1 / Math.max(lum, 0.05)); l.intensity = 10 * Math.min(1.6, lum * 3.2); });
    { let r = 0, g = 0, b = 0; SCR.lights.forEach((l) => { r += l.color.r * l.intensity; g += l.color.g * l.intensity; b += l.color.b * l.intensity; }); key.color.setRGB(r, g, b).multiplyScalar(1 / Math.max(r, g, b, 1e-3)); key.intensity = 0.55; }
    // ---- people, props ----
    poseYou(t); poseGuy(t); poseCrowd(t); poseTraffic(t);
    drawPhone(pcv, { selfie, likes: likesAt(t), followers: followersAt(t), notif: s >= T.FLIP && s < T.Y1 ? NOTIF : [], t: s, clock: s < T.FLIP ? '23:59' : '00:00', battery: 64 });
    phone.tex.needsUpdate = true;
    faceFill.position.copy(phone.position).add(V(0, 0.12, 0)); faceFill.intensity = 0.35;
    apple.update(t, { look: t > 9.4 && t < 10.6 ? hand.position : cam.position, blinkAt: [1.2, 8.9, 10.8, 15.2], earAt: [9.7], pr: R.SSAA }); apple.root.visible = id <= SH.WIDE;
    poseSnow(t, cam, id === SH.Y12 ? smooth(T.Y2 - 0.6, T.Y2 + 0.8, t) : 0); snow.update(t, cam, R.SSAA);
    PC.U.uWet.value = id === SH.Y12 ? 0.75 : 1;
    // ---- light and exposure ----
    R.renderer.toneMappingExposure = 1.05; R.bloom.strength = 0.38; R.bloom.radius = 0.55; R.bloom.threshold = 0.9 / 1.05;
    cam.near = (id === SH.CALM && t > 10.5) || id === SH.PHONE ? 0.03 : 0.1; cam.updateProjectionMatrix();
    if (id === SH.Y5B) U.uFade.value = smooth(61.55, 61.95, t);
    R.renderPass.scene = scene; R.renderPass.camera = cam;
    R.composer.render();
    const cover = q.get('cover') === '1', endA = smooth(T.END, T.END + 0.5, t);
    ov.apply({ labels: [], tag: 'WHAT IF &nbsp;·&nbsp; 13', tagA: t < T.END ? 1 : 0, title: { html: TITLE, a: cover ? 1 : t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0, k: 1 },
      hud: cover ? null : hudAt(t), caption: cover ? null : captionAt(CAPTIONS, t),
      end: endA > 0 ? { a: endA, title: TITLE, note: '<span class="q">Would you finally be a 10?</span><br><br>Beauty industry: $446 billion a year<br>Cosmetic procedures: 34.9 million a year<br><br><span style="font-size:0.55em;opacity:0.55">Map data © OpenStreetMap contributors</span>' } : null });
    tag.update(t, T.END + 0.5, endA);
  }
  window.EP = { scene, cam, THREE };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
