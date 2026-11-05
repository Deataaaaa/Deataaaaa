// « 12 % » Saison 2 · Partie 2: the commissariat of the 18e at night, as its own small set. A Haussmann block whose ground floor is
// the police station (glass entrance doors, a lit blue POLICE NATIONALE lightbox, a projecting POLICE blade sign, the tricolour
// flag on its pole, frosted windows with the lettering), a police car at the kerb, the street and the facing row; behind the doors,
// the front office: the reception counter with its glass screen, a complaint desk with a computer, chairs, posters, cold ceiling
// panels. Façade at z = 0 facing +z (as engine/world12.js); the office runs from z -0.35 to z -6.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { STREET, makeHaussmann, makeStreet, makeLanterns } from './paris12.js';
import { plasterMat } from './room12.js';
import { makePoliceCar } from './police12.js';
import { makeNightSky } from './piccadilly.js';
import { makeCar } from './town5.js';
import { rng } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const ST = { BAYS: [-4.8, -1.6, 1.6, 4.8], DOOR: 1.6, OFF: { x0: -2.8, x1: 4.4, z0: -6.0, z1: -0.35, ceil: 3.2 },
  DESK: V(3.0, 0, -3.7), DESK_H: 0.74 };

function textTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function buildStation(renderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#0b0d12', 0.012);
  const sky = makeNightSky(); scene.add(sky.mesh || sky);
  const add = (m, x, y, z, parent = scene) => { m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

  // ---- the block and the street ----
  const station = makeHaussmann({ x0: -6.5, x1: 6.5, bays: ST.BAYS, seed: 21, lit: 0.22, color: '#d2c6ad', shops: false, openGF: true }); scene.add(station);
  scene.add(makeHaussmann({ x0: -19.5, x1: -6.5, bays: [-17.2, -14.0, -10.8, -8.2], seed: 23, lit: 0.3, color: '#c8b99c' }));
  scene.add(makeHaussmann({ x0: 6.5, x1: 19.5, bays: [8.6, 11.8, 15.0, 17.6], seed: 25, lit: 0.26, color: '#cfc3aa' }));
  for (const [x0, x1, bays, seed, col] of [[-21, -5, [-18.6, -15.4, -12.2, -9.0, -6.6], 27, '#cdbfa5'], [-5, 11, [-2.8, 0.4, 3.6, 6.8, 9.4], 29, '#c9bba0'], [11, 27, [13.4, 16.6, 19.8, 23.0, 25.6], 31, '#d1c4ab']])
    scene.add(makeHaussmann({ x0, x1, bays, z0: STREET.W, face: -1, seed, lit: 0.36, color: col }));
  scene.add(makeStreet({ x0: -60, x1: 60 }));
  const lan = makeLanterns([{ x: -9.5, y: 5.6, z: 0, face: 1 }, { x: 9.5, y: 5.6, z: 0, face: 1 }, { x: -13, y: 5.6, z: STREET.W, face: -1 }, { x: 2, y: 5.6, z: STREET.W, face: -1 }, { x: 17, y: 5.6, z: STREET.W, face: -1 }]);
  scene.add(lan.group);
  const lanterns = lan.pts.map((p) => { const l = new THREE.PointLight('#ffb978', 22, 20, 2); l.position.copy(p); scene.add(l); return l; });
  { const r = rng(52), cols = ['#2b2f36', '#8c9196', '#5a1e1e', '#1d2a3c', '#d8d8d4', '#3a3a3a'];
    for (const [z, yaw] of [[STREET.PAVE + 1.0, 0], [STREET.W - STREET.PAVE - 1.0, Math.PI]]) for (let x = -34; x < 34; x += 4.6 + r() * 1.4) {
      if (z < 6 && x > -7 && x < 9) continue;                                  // the police car and the drop-off in front of the station
      const c = makeCar(r() < 0.6 ? 'hatch' : 'sedan', cols[Math.floor(r() * cols.length)], r); c.group.position.set(x, 0, z); c.group.rotation.y = yaw; scene.add(c.group); } }
  const police = makePoliceCar(rng(53)); police.group.position.set(-4.2, 0, STREET.PAVE + 1.05); scene.add(police.group); police.update(0, 0);
  // bollards along the kerb in front of the entrance
  const iron = new THREE.MeshStandardMaterial({ color: '#1a1b1d', roughness: 0.5, metalness: 0.5 });
  for (let x = -1.5; x <= 7.5; x += 1.5) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.95, 14), iron); add(b, x, STREET.KERB + 0.475, STREET.PAVE - 0.35); }

  // ---- the frontage: four ground-floor openings 2.3 m wide, 3.3 m high, in the 0.3 m deep stone ----
  const alu = new THREE.MeshStandardMaterial({ color: '#3b3e43', roughness: 0.4, metalness: 0.75 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#9fb4c4', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, specularIntensity: 0.35, envMapIntensity: 2, depthWrite: false });
  const frost = new THREE.MeshStandardMaterial({ color: '#c9d2d8', roughness: 0.6, emissive: '#d8e4ef', emissiveIntensity: 0.22, transparent: true, opacity: 0.92 });
  const lettering = textTex(1024, 128, (c, w, h) => { c.fillStyle = '#1e3a78'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 64px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('POLICE NATIONALE', w / 2, h / 2 + 4); });
  const band = new THREE.MeshStandardMaterial({ map: lettering, emissive: '#ffffff', emissiveMap: lettering, emissiveIntensity: 0.35, roughness: 0.5 });
  for (const bx of ST.BAYS) {
    const z = -0.25;
    // frame: posts, head, sill
    for (const sx of [-1.12, 1.12]) add(box(0.08, 3.3, 0.12, alu), bx + sx, 1.65 + 0.0, z);
    add(box(2.3, 0.1, 0.14, alu), bx, 3.25, z);
    if (bx === ST.DOOR) {
      // the entrance: a transom, two glass leaves with push bars, the step
      add(box(2.3, 0.08, 0.12, alu), bx, 2.55, z);
      const tr = add(new THREE.Mesh(new THREE.PlaneGeometry(2.16, 0.62), glass), bx, 2.9, z); tr.castShadow = false;
      for (const sx of [-0.54, 0.54]) {
        const leaf = new THREE.Group(); leaf.position.set(bx + sx, 0, z); scene.add(leaf);
        add(box(1.06, 0.06, 0.06, alu), 0, 0.05, 0, leaf); add(box(1.06, 0.06, 0.06, alu), 0, 2.48, 0, leaf);
        add(box(0.06, 2.5, 0.06, alu), -0.5, 1.26, 0, leaf); add(box(0.06, 2.5, 0.06, alu), 0.5, 1.26, 0, leaf);
        const g = add(new THREE.Mesh(new THREE.PlaneGeometry(0.94, 2.36), glass), 0, 1.26, 0, leaf); g.castShadow = false;
        const bar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.8, 10), new THREE.MeshStandardMaterial({ color: '#b8bcc2', metalness: 0.9, roughness: 0.25 })), -sx * 0.62, 1.05, 0.06, leaf); bar.rotation.z = Math.PI / 2;
        const sticker = add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1), band), 0, 1.55, 0.004, leaf); sticker.castShadow = false;
      }
      add(box(2.4, 0.06, 0.6, new THREE.MeshStandardMaterial({ color: '#77777a', roughness: 0.7 })), bx, STREET.KERB - 0.02 + 0.0, 0.25);
    } else {
      // a window: frosted below 2.2 m with the blue band, clear above; bars on the two outer ones
      const f = add(new THREE.Mesh(new THREE.PlaneGeometry(2.16, 1.9), frost), bx, 1.25, z - 0.01); f.castShadow = false;
      const b = add(new THREE.Mesh(new THREE.PlaneGeometry(2.16, 0.27), band), bx, 1.45, z + 0.002); b.castShadow = false;
      const top = add(new THREE.Mesh(new THREE.PlaneGeometry(2.16, 1.0), glass), bx, 2.72, z); top.castShadow = false;
      add(box(2.3, 0.07, 0.14, alu), bx, 2.22, z);
      if (Math.abs(bx) > 4) for (let k = -4; k <= 4; k++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.9, 8), iron), bx + k * 0.25, 1.7, 0.02);
      // behind the outer windows: a dark back wall (the office only spans the two middle bays)
      if (Math.abs(bx) > 4) add(box(2.4, 3.3, 0.05, new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.9, emissive: '#cfe0ff', emissiveIntensity: 0.04 })), bx, 1.65, -1.2);
    }
  }
  // the lightbox over the entrance, the blade sign, the plaque
  const signTex = textTex(1024, 220, (c, w, h) => { c.fillStyle = '#1b3a82'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '800 112px Inter, Arial, sans-serif'; c.fillText('POLICE', w / 2 + 70, h / 2 - 16); c.font = '600 44px Inter, Arial, sans-serif'; c.fillText('NATIONALE', w / 2 + 70, h / 2 + 68);
    const s = 34; c.fillStyle = '#0055a4'; c.fillRect(70, 52, s, 116); c.fillStyle = '#fff'; c.fillRect(70 + s, 52, s, 116); c.fillStyle = '#ef4135'; c.fillRect(70 + 2 * s, 52, s, 116); });
  const signM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: 1.6, roughness: 0.3 });
  const lb = add(box(2.6, 0.56, 0.16, alu), ST.DOOR, 3.72, 0.1); const lbFace = add(new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.5), signM), ST.DOOR, 3.72, 0.185); lbFace.castShadow = false;
  const bladeTex = textTex(512, 160, (c, w, h) => { c.fillStyle = '#1b3a82'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 96px Inter, Arial, sans-serif'; c.fillText('POLICE', w / 2, h / 2 + 4); });
  const bladeM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: bladeTex, emissiveIntensity: 1.5, roughness: 0.3 });
  const blade = new THREE.Group(); blade.position.set(-3.2, 4.9, 0.5); scene.add(blade);
  add(box(0.12, 0.42, 1.0, alu), 0, 0, 0, blade); for (const s of [1, -1]) { const f = add(new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.36), bladeM), s * 0.061, 0, 0, blade); f.rotation.y = s * Math.PI / 2; f.castShadow = false; }
  add(box(0.06, 0.06, 0.55, iron), 0, 0.3, -0.25, blade);
  const plaqueTex = textTex(512, 256, (c, w, h) => { c.fillStyle = '#e9e6dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b3a82'; c.fillRect(0, 0, w, 54); c.fillStyle = '#fff'; c.font = '700 30px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.fillText('POLICE NATIONALE', w / 2, 38);
    c.fillStyle = '#1d1d1f'; c.font = '700 34px Inter, Arial, sans-serif'; c.fillText('COMMISSARIAT', w / 2, 112); c.font = '600 28px Inter, Arial, sans-serif'; c.fillText('DE POLICE · PARIS 18e', w / 2, 152);
    c.font = '500 24px Inter, Arial, sans-serif'; c.fillStyle = '#444'; c.fillText('Accueil du public 24 h / 24', w / 2, 210); });
  add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.4, metalness: 0.2 })), ST.DOOR + 1.45, 1.6, 0.012).castShadow = false;
  // the flag: a pole out of the façade at 45 degrees, a cloth that waves (flag.update(t))
  const pole = new THREE.Group(); pole.position.set(ST.DOOR + 1.55, 4.25, 0.05); pole.rotation.x = Math.PI / 4; scene.add(pole);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.7, 10), new THREE.MeshStandardMaterial({ color: '#d8d8d8', metalness: 0.6, roughness: 0.3 })), 0, 0.85, 0, pole);
  const fW = 0.9, fH = 0.6, fGeo = new THREE.PlaneGeometry(fH, fW, 14, 20);
  const flagTex = textTex(64, 96, (c, w, h) => { c.fillStyle = '#0055a4'; c.fillRect(0, 0, w, h / 3); c.fillStyle = '#fff'; c.fillRect(0, h / 3, w, h / 3); c.fillStyle = '#ef4135'; c.fillRect(0, 2 * h / 3, w, h / 3); });
  const flagM = new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.75, side: THREE.DoubleSide });
  const flagMesh = new THREE.Mesh(fGeo, flagM); flagMesh.castShadow = true; pole.add(flagMesh);
  const base = fGeo.attributes.position.array.slice();
  // in the pole's frame (+y up the pole, which leans 45 degrees out): the hoist runs up the pole from 1.05 m, the fly hangs along
  // local +z (down and out from the façade, perpendicular to the pole), sags a little and ripples in local x
  const flag = { update(t) { const p = fGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const u = (base[i] + fH / 2) / fH, v = (base[i + 1] + fW / 2) / fW;
      const wave = v * (0.045 * Math.sin(t * 2.1 - v * 6.0 + u * 1.3) + 0.018 * Math.sin(t * 3.7 - v * 9.0 + 0.7));
      p[i] = wave; p[i + 1] = 1.05 + u * fH - 0.16 * v * v; p[i + 2] = 0.02 + v * fW * 0.97; }
    fGeo.attributes.position.needsUpdate = true; fGeo.computeVertexNormals(); } };
  flag.update(0);

  // ---- the front office ----
  const O = ST.OFF, office = new THREE.Group(); scene.add(office);
  const wall = plasterMat('#ddd8cc', 'plaster25'), floorM = new THREE.MeshStandardMaterial({ color: '#7d8187', roughness: 0.55 });
  const blue = new THREE.MeshStandardMaterial({ color: '#23407a', roughness: 0.6 });
  const W = O.x1 - O.x0, D = O.z1 - O.z0, cx = (O.x0 + O.x1) / 2, cz = (O.z0 + O.z1) / 2;
  const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorM), cx, 0.002, cz, office); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  const ce = add(new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: '#e8e6e0', roughness: 0.9 })), cx, O.ceil, cz, office); ce.rotation.x = Math.PI / 2; ce.castShadow = false;
  add(box(W, O.ceil, 0.1, wall), cx, O.ceil / 2, O.z0 - 0.05, office);                                     // back wall
  for (const x of [O.x0 - 0.05, O.x1 + 0.05]) add(box(0.1, O.ceil, D, wall), x, O.ceil / 2, cz, office);    // side walls
  add(box(W, 0.12, 0.012, blue), cx, 1.05, O.z0 + 0.006, office);                                            // the blue stripe
  for (const x of [O.x0 + 0.006, O.x1 - 0.006]) add(box(0.012, 0.12, D, blue), x, 1.05, cz, office);
  add(box(W, 0.1, 0.02, new THREE.MeshStandardMaterial({ color: '#5d6168', roughness: 0.6 })), cx, 0.05, O.z0 + 0.012, office);   // skirting
  // ceiling panels and their light
  const panelM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#eef4ff', emissiveIntensity: 2.2 });
  const lights = [];
  for (const [x, z] of [[-0.6, -2.0], [2.6, -2.0], [-0.6, -4.6], [2.6, -4.6]]) {
    const p = add(box(1.2, 0.03, 0.6, panelM), x, O.ceil - 0.016, z, office); p.castShadow = false;
    const l = new THREE.PointLight('#e9f0ff', 7, 8, 2); l.position.set(x, O.ceil - 0.2, z); office.add(l); lights.push(l);
  }
  // the reception counter facing the doors, with its glass screen
  const lam = new THREE.MeshStandardMaterial({ color: '#b8b2a6', roughness: 0.5 }), top = new THREE.MeshStandardMaterial({ color: '#e7e3da', roughness: 0.35 });
  add(box(2.6, 1.05, 0.6, lam), 0.4, 0.525, -4.9, office); add(box(2.7, 0.04, 0.7, top), 0.4, 1.07, -4.9, office);
  const scr = add(new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.62), glass), 0.4, 1.4, -4.65, office); scr.castShadow = false;
  add(box(2.6, 0.03, 0.03, alu), 0.4, 1.72, -4.65, office);
  const accTex = textTex(512, 96, (c, w, h) => { c.fillStyle = '#23407a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 54px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ACCUEIL', w / 2, h / 2 + 3); });
  add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.2), new THREE.MeshStandardMaterial({ map: accTex, roughness: 0.5 })), 0.4, 2.35, O.z0 + 0.012, office).castShadow = false;
  // the complaint desk at the right, side-on to the room; the officer sits behind it (facing -x), the visitor in front (facing +x)
  const DK = ST.DESK, dh = ST.DESK_H;
  const deskM = new THREE.MeshStandardMaterial({ color: '#d9d4c8', roughness: 0.45 }), legM = new THREE.MeshStandardMaterial({ color: '#4a4d52', metalness: 0.6, roughness: 0.4 });
  add(new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.03, 1.5, 2, 0.008), deskM), DK.x, dh - 0.015, DK.z, office);
  for (const [sx, sz] of [[-0.33, -0.7], [0.33, -0.7], [-0.33, 0.7], [0.33, 0.7]]) add(box(0.04, dh - 0.03, 0.04, legM), DK.x + sx, (dh - 0.03) / 2, DK.z + sz, office);
  add(box(0.02, 0.45, 1.4, deskM), DK.x + 0.36, dh - 0.27, DK.z, office);                                   // modesty panel on the officer's side
  // the computer: a monitor turned to the officer, keyboard, mouse; screen texture = office.screenTex (a blank complaint form)
  const formCv = document.createElement('canvas'); formCv.width = 512; formCv.height = 300; const fc = formCv.getContext('2d');
  fc.fillStyle = '#f4f6f8'; fc.fillRect(0, 0, 512, 300); fc.fillStyle = '#23407a'; fc.fillRect(0, 0, 512, 34); fc.fillStyle = '#fff'; fc.font = '700 18px Inter, Arial, sans-serif'; fc.fillText('PROCÈS-VERBAL DE PLAINTE', 14, 23);
  fc.fillStyle = '#333'; fc.font = '500 13px Inter, Arial, sans-serif'; ['Nom', 'Prénom', 'Date des faits', 'Lieu', 'Nature des faits', 'Objet saisi'].forEach((l, i) => { fc.fillText(l, 16, 62 + i * 36); fc.strokeStyle = '#b8c0c8'; fc.strokeRect(130, 48 + i * 36, 360, 22); });
  fc.fillStyle = '#111'; fc.font = '500 13px Inter, Arial, sans-serif'; fc.fillText('MARTIN', 136, 63); fc.fillText('Inès', 136, 99); fc.fillText('Traceur Bluetooth (n° de série relevé)', 136, 243);
  const formTex = new THREE.CanvasTexture(formCv); formTex.colorSpace = THREE.SRGBColorSpace; formTex.anisotropy = 8;
  const mon = new THREE.Group(); mon.position.set(DK.x + 0.12, dh, DK.z - 0.25); mon.rotation.y = -Math.PI / 2 + 0.35; office.add(mon);   // the screen faces the officer (+x)
  add(new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.34, 0.03, 2, 0.006), new THREE.MeshStandardMaterial({ color: '#1a1b1d', roughness: 0.4 })), 0, 0.33, 0, mon);
  const monS = add(new THREE.Mesh(new THREE.PlaneGeometry(0.53, 0.31), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: formTex, emissiveIntensity: 0.55, roughness: 0.2 })), 0, 0.33, -0.016, mon);
  monS.rotation.y = Math.PI; monS.castShadow = false;
  add(box(0.05, 0.16, 0.05, legM), 0, 0.08, 0.03, mon); add(box(0.22, 0.012, 0.16, legM), 0, 0.006, 0.03, mon);
  const kb = add(new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.018, 0.44, 2, 0.004), new THREE.MeshStandardMaterial({ color: '#222326', roughness: 0.5 })), DK.x + 0.2, dh + 0.009, DK.z - 0.1, office);
  add(new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.03, 0.1, 2, 0.012), new THREE.MeshStandardMaterial({ color: '#222326', roughness: 0.4 })), DK.x + 0.22, dh + 0.015, DK.z + 0.27, office);
  // a tray of forms, a pen pot
  add(box(0.24, 0.05, 0.32, new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.6 })), DK.x + 0.2, dh + 0.025, DK.z + 0.52, office);
  add(box(0.21, 0.012, 0.29, new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.8 })), DK.x + 0.2, dh + 0.045, DK.z + 0.52, office);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 16), new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.5 })), DK.x + 0.26, dh + 0.05, DK.z - 0.55, office);
  // chairs: the officer's office chair, the visitor's chair, a row of waiting chairs by the windows
  const chair = (x, z, yaw, h = 0.46) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; office.add(g);
    const seatM = new THREE.MeshStandardMaterial({ color: '#2c3344', roughness: 0.75 });
    add(new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.07, 0.44, 2, 0.02), seatM), 0, h, 0, g); add(new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.48, 0.06, 2, 0.02), seatM), 0, h + 0.3, -0.2, g).rotation.x = -0.1;
    for (const [sx, sz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) add(box(0.025, h, 0.025, legM), sx, h / 2, sz, g); return g; };
  const officerChair = chair(DK.x + 0.72, DK.z, -Math.PI / 2), visitorChair = chair(DK.x - 0.7, DK.z + 0.05, Math.PI / 2);
  for (const x of [-2.3, -1.75, -1.2]) chair(x, -0.9, 0);
  // posters on the side wall by the desk
  const poster = (txt, sub, col) => textTex(400, 560, (c, w, h) => { c.fillStyle = '#f3f1ea'; c.fillRect(0, 0, w, h); c.fillStyle = col; c.fillRect(0, 0, w, 150); c.fillStyle = '#fff'; c.font = '800 46px Inter, Arial, sans-serif'; c.textAlign = 'center';
    txt.split('\n').forEach((l, i) => c.fillText(l, w / 2, 64 + i * 52)); c.fillStyle = '#222'; c.font = '600 30px Inter, Arial, sans-serif'; sub.split('\n').forEach((l, i) => c.fillText(l, w / 2, 230 + i * 44)); });
  for (const [x, z, t, s, col] of [[O.x1 - 0.012, -2.6, 'VICTIME ?\nPORTEZ PLAINTE', 'La police\ndoit enregistrer\nvotre plainte.\n\nUrgence : 17\nSourds : 114', '#23407a'], [O.x1 - 0.012, -1.6, 'HARCÈLEMENT\nDE RUE', 'Témoin ou victime :\nparlez-en.\n\n17 · 112', '#a3262e']]) {
    const p = add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ map: poster(t, s, col), roughness: 0.6 })), x, 1.6, z, office); p.rotation.y = -Math.PI / 2; p.castShadow = false; }
  // the small things: a wall clock (2:50), a water cooler, a bin, a desk phone, folders on the counter, a coat stand
  const clockTex = textTex(256, 256, (c, w, h) => { c.fillStyle = '#f7f7f4'; c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 8; c.stroke();
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; c.lineWidth = 6; c.beginPath(); c.moveTo(128 + 98 * Math.sin(a), 128 - 98 * Math.cos(a)); c.lineTo(128 + 112 * Math.sin(a), 128 - 112 * Math.cos(a)); c.stroke(); }
    const hand = (a, l, wd) => { c.lineWidth = wd; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + l * Math.sin(a), 128 - l * Math.cos(a)); c.stroke(); };
    hand((2 + 50 / 60) * Math.PI / 6, 60, 9); hand(50 * Math.PI / 30, 92, 6); });
  const clk = add(new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.4 })), -0.9, 2.55, O.z0 + 0.012, office); clk.castShadow = false;
  add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 32), new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.4 })), -0.9, 2.55, O.z0 + 0.014, office);
  const cooler = new THREE.Group(); cooler.position.set(O.x0 + 0.35, 0, -3.2); office.add(cooler);
  add(box(0.32, 1.0, 0.32, new THREE.MeshStandardMaterial({ color: '#e9e9e6', roughness: 0.5 })), 0, 0.5, 0, cooler);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 20), new THREE.MeshPhysicalMaterial({ color: '#8fc3e8', roughness: 0.1, transparent: true, opacity: 0.55 })), 0, 1.22, 0, cooler);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.32, 18), new THREE.MeshStandardMaterial({ color: '#3b3d42', roughness: 0.6 })), DK.x - 0.15, 0.16, DK.z - 0.95, office);
  add(new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.06, 0.16, 2, 0.015), new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.45 })), DK.x + 0.18, dh + 0.03, DK.z + 0.25 + 0.05, office);
  for (let k = 0; k < 4; k++) add(box(0.32, 0.025, 0.24, new THREE.MeshStandardMaterial({ color: ['#c43d3d', '#3d6ec4', '#d6c14a', '#e8e6e0'][k], roughness: 0.7 })), -0.3 + 0.01 * k, 1.1 + 0.026 * k, -4.95, office);
  const stand = new THREE.Group(); stand.position.set(O.x1 - 0.35, 0, -5.4); office.add(stand);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.75, 10), legM), 0, 0.875, 0, stand); add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.03, 20), legM), 0, 0.015, 0, stand);
  add(new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.9, 0.18, 3, 0.06), new THREE.MeshStandardMaterial({ color: '#24272c', roughness: 0.85 })), 0.02, 1.2, 0.08, stand);
  // the light that spills out through the doors onto the pavement
  const spill = new THREE.SpotLight('#e6eeff', 9, 9, 0.75, 0.7, 2); spill.position.set(ST.DOOR, 2.8, -1.4); spill.target.position.set(ST.DOOR, 0, 2.2); scene.add(spill, spill.target);

  // ---- night lights and reflections ----
  const hemi = new THREE.HemisphereLight('#2c3a58', '#140f0c', 0.35); scene.add(hemi);
  const moon = new THREE.DirectionalLight('#a9bde6', 0.5); moon.position.set(-30, 60, 40); moon.target.position.set(0, 0, 4);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); const sc = moon.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 10; sc.far = 160;
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.03; scene.add(moon, moon.target);
  const pm = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(); envScene.add(makeNightSky().mesh || makeNightSky());
  for (const [x, y, z, c] of [[10, 3, 10, '#ffb070'], [-12, 4, 8, '#ffb070'], [2, 2.5, -6, '#e6eeff'], [-8, 3, -12, '#ffb070']]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(6) })); s.position.set(x, y, z); envScene.add(s); }
  scene.environment = pm.fromScene(envScene, 0.02).texture; scene.environmentIntensity = 0.35;
  return { scene, sky, station, police, flag, lanterns, office, officeLights: lights, spill, hemi, moon, officerChair, visitorChair, monitorScreen: monS, keyboard: kb, formCv, formTex };
}
