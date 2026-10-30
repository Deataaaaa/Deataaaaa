// « 12 % » Saison 2 · Partie 2: the Pigalle bar at 1:24 am (the flashback), as its own small set. A narrow room with dark red walls:
// the counter along the room (zinc-edged wood top, dark panelled front, brass foot rail), five stools with low backs on the
// customers' side (z > 0), the back bar with backlit shelves of bottles under a long mirror, three globe pendants, a pink neon
// word on the side wall, framed posters, small tables by the street window. bar.stools[i] = { pos (seat centre on the floor), top
// (seat height), back (the backrest's top bar: centre and axis) }; bar.counter = { z (front edge), y (top) }.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { plasterMat } from './room12.js';
import { rng } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const BAR = { X0: -3.4, X1: 3.4, Z0: -4.0, Z1: 3.4, H: 3.1, CZ: -0.55, CY: 1.08, STOOL_Z: 0.05, STOOL_X: [-2.2, -1.45, -0.7, 0.05, 0.8], SEAT: 0.76 };

function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function buildBar(renderer) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#050506');
  const add = (m, x, y, z, parent = scene) => { m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const B = BAR, W = B.X1 - B.X0, D = B.Z1 - B.Z0, cx = (B.X0 + B.X1) / 2, cz = (B.Z0 + B.Z1) / 2;
  // ---- the room ----
  const wallM = plasterMat('#6e2226', 'plaster25bar'), woodD = new THREE.MeshStandardMaterial({ color: '#2a1810', roughness: 0.45 });
  const floorTex = tex(512, 512, (c, w, h) => { const r = rng(7); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 34 + Math.floor(r() * 10); c.fillStyle = (x + y) % 2 ? `rgb(${v + 110},${v + 100},${v + 84})` : `rgb(${v},${v - 4},${v - 6})`; c.fillRect(x * 64, y * 64, 64, 64); } });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / 2.4, D / 2.4);
  const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35 })), cx, 0, cz); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  const ce = add(new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: '#1c1312', roughness: 0.9 })), cx, B.H, cz); ce.rotation.x = Math.PI / 2; ce.castShadow = false;
  add(box(W, B.H, 0.1, wallM), cx, B.H / 2, B.Z0 - 0.05);
  for (const x of [B.X0 - 0.05, B.X1 + 0.05]) add(box(0.1, B.H, D, wallM), x, B.H / 2, cz);
  // wainscot on the side walls
  for (const [x, s] of [[B.X0 + 0.01, 1], [B.X1 - 0.01, -1]]) add(box(0.02, 1.0, D - 0.2, woodD), x, 0.5, cz).rotation.y = 0;
  // the street window at the front (z = Z1): dark glass, the street's lights blurred behind it
  const street = tex(512, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0c1020'); g.addColorStop(1, '#1d1418'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = rng(3); for (let i = 0; i < 40; i++) { const x = r() * w, y = h * (0.35 + 0.55 * r()), rad = 6 + r() * 16, col = ['#ffb070', '#ff4f9a', '#6aa0ff', '#ffd9a0'][Math.floor(r() * 4)];
      const gg = c.createRadialGradient(x, y, 0, x, y, rad); gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.globalAlpha = 0.5 + 0.5 * r(); c.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); } c.globalAlpha = 1; });
  const win = add(new THREE.Mesh(new THREE.PlaneGeometry(W - 1.2, 2.0), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: street, emissiveIntensity: 0.8 })), cx, 1.55, B.Z1 - 0.02); win.rotation.y = Math.PI; win.castShadow = false;
  add(box(W, 0.55, 0.1, woodD), cx, 0.275, B.Z1 - 0.05);
  // ---- the counter: runs along x, its customers' face at z = CZ ----
  const top = new THREE.MeshStandardMaterial({ color: '#3b2416', roughness: 0.28, metalness: 0.0 }), zinc = new THREE.MeshStandardMaterial({ color: '#a7a9ab', roughness: 0.3, metalness: 0.85 });
  const brass = new THREE.MeshStandardMaterial({ color: '#b08a3e', roughness: 0.25, metalness: 0.95 });
  const cx0 = -3.0, cx1 = 2.0, clen = cx1 - cx0, ccx = (cx0 + cx1) / 2;
  add(new THREE.Mesh(new RoundedBoxGeometry(clen, 0.06, 0.62, 3, 0.02), top), ccx, B.CY - 0.03, B.CZ - 0.27);
  add(box(clen, 0.03, 0.04, zinc), ccx, B.CY - 0.02, B.CZ + 0.035);
  add(box(clen, B.CY - 0.06, 0.08, woodD), ccx, (B.CY - 0.06) / 2, B.CZ - 0.06);
  for (let x = cx0 + 0.25; x < cx1 - 0.1; x += 0.62) add(box(0.5, 0.6, 0.012, new THREE.MeshStandardMaterial({ color: '#3a2216', roughness: 0.5 })), x + 0.06, 0.55, B.CZ - 0.014);
  const rail = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, clen, 14), brass), ccx, 0.22, B.CZ + 0.16); rail.rotation.z = Math.PI / 2;
  for (let x = cx0 + 0.3; x < cx1; x += 1.2) add(box(0.03, 0.03, 0.18, brass), x, 0.22, B.CZ + 0.07);
  // a beer tap tower and a few things on the bar
  const tap = new THREE.Group(); tap.position.set(-2.5, B.CY, B.CZ - 0.35); scene.add(tap);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 16), zinc), 0, 0.2, 0, tap);
  for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 10), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 })), s * 0.06, 0.48, 0.04, tap);
  // ---- the back bar: a long mirror, shelves of backlit bottles ----
  const BZ = B.Z0 + 0.25;
  add(box(clen + 0.4, 0.9, 0.5, woodD), ccx, 0.45, BZ + 0.1);
  const mir = add(new THREE.Mesh(new THREE.PlaneGeometry(clen, 1.1), new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.05, metalness: 1.0, envMapIntensity: 1.2 })), ccx, 1.75, B.Z0 + 0.01); mir.castShadow = false;
  const shelfM = new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.2, metalness: 0.0, transparent: true, opacity: 0.5 });
  const ledM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffb25e', emissiveIntensity: 3.5 });
  const shelves = [1.25, 1.62, 1.99];
  for (const y of shelves) { add(box(clen, 0.02, 0.24, shelfM), ccx, y, BZ); const l = add(box(clen, 0.008, 0.012, ledM), ccx, y - 0.014, BZ + 0.11); l.castShadow = false; }
  // bottles: instanced, three shapes, glass tints lit from behind
  const r = rng(25), shapes = [new THREE.LatheGeometry([[0, 0], [0.037, 0], [0.04, 0.005], [0.04, 0.2], [0.03, 0.235], [0.013, 0.26], [0.013, 0.31], [0, 0.31]].map(([x, y]) => new THREE.Vector2(x, y)), 14),
    new THREE.LatheGeometry([[0, 0], [0.045, 0], [0.047, 0.006], [0.047, 0.15], [0.02, 0.2], [0.015, 0.26], [0, 0.26]].map(([x, y]) => new THREE.Vector2(x, y)), 14),
    new THREE.LatheGeometry([[0, 0], [0.032, 0], [0.034, 0.006], [0.034, 0.24], [0.012, 0.28], [0.012, 0.34], [0, 0.34]].map(([x, y]) => new THREE.Vector2(x, y)), 14)];
  const tints = ['#5c2a0a', '#8a4a12', '#1f3d1c', '#9c8a5a', '#3d0f0a', '#a87a20', '#142a3a', '#b8b2a2'];
  for (let s = 0; s < 3; s++) {
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.14, metalness: 0.0, envMapIntensity: 1.4 });   // (an emissive washed every bottle white)
    const list = []; for (const [k, y] of [0.9, ...shelves].entries()) for (let x = cx0 + 0.15; x < cx1 - 0.1; x += 0.11 + 0.05 * r()) if (Math.floor(r() * 3) === s && (k > 0 || r() < 0.5)) list.push([x, y + 0.01, BZ + (r() - 0.5) * 0.06]);
    const im = new THREE.InstancedMesh(shapes[s], mat, list.length), m4 = new THREE.Matrix4(), col = new THREE.Color();
    list.forEach(([x, y, z], i) => { m4.makeRotationY(r() * 6.28).setPosition(x, y, z); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(tints[Math.floor(r() * tints.length)])); });
    im.castShadow = true; scene.add(im);
  }
  // ---- stools: chrome column, round wooden seat, a low curved back (the coat hangs on it) ----
  const seatM = new THREE.MeshStandardMaterial({ color: '#3a2316', roughness: 0.4 }), chrome = new THREE.MeshStandardMaterial({ color: '#c4c6c8', roughness: 0.2, metalness: 0.95 });
  const stools = [];
  for (const x of B.STOOL_X) {
    const g = new THREE.Group(); g.position.set(x, 0, B.STOOL_Z); scene.add(g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 24), chrome), 0, 0.015, 0, g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, B.SEAT - 0.05, 12), chrome), 0, (B.SEAT - 0.05) / 2, 0, g);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.011, 8, 28), chrome), 0, 0.3, 0, g).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.05, 28), seatM), 0, B.SEAT - 0.025, 0, g);
    // the back: two posts and a curved top bar on the far side from the counter (+z)
    for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.3, 8), chrome), s * 0.13, B.SEAT + 0.15, 0.15, g);
    const backBar = add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 20, Math.PI * 0.62), seatM), 0, B.SEAT + 0.31, 0.0, g); backBar.rotation.set(Math.PI / 2, 0, Math.PI * 0.19);   // the arc from 0.19 to 0.81 pi: behind the seat (+z)
    stools.push({ g, pos: V(x, 0, B.STOOL_Z), top: B.SEAT, back: { c: V(x, B.SEAT + 0.31, B.STOOL_Z + 0.2), axis: V(1, 0, 0) } });
  }
  // ---- small tables by the window ----
  const tables = [];
  for (const [x, z] of [[-2.2, 2.3], [-0.2, 2.5], [1.9, 2.2]]) { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 28), new THREE.MeshStandardMaterial({ color: '#c9c3b5', roughness: 0.25 })), 0, 0.74, 0, g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 10), chrome), 0, 0.36, 0, g); add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.03, 20), chrome), 0, 0.015, 0, g); tables.push(g); }
  // ---- the pink neon on the left wall, posters ----
  const neonTex = tex(1024, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.font = 'italic 700 150px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#ff4fa3'; c.shadowBlur = 24; c.fillStyle = '#ffd0e8'; c.fillText('Minuit', w / 2, h / 2); });
  const neon = add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: neonTex, emissiveIntensity: 2.2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), B.X0 + 0.02, 2.2, 1.0);
  neon.rotation.y = Math.PI / 2; neon.castShadow = false;
  const neonL = new THREE.PointLight('#ff4fa3', 2.2, 4, 2); neonL.position.set(B.X0 + 0.4, 2.2, 1.0); scene.add(neonL);
  for (const [z, hue] of [[-1.6, '#1b3550'], [2.4, '#4b3a1e']]) { const p = tex(300, 420, (c, w, h) => { c.fillStyle = hue; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8c79a'; c.lineWidth = 10; c.strokeRect(14, 14, w - 28, h - 28);
      c.fillStyle = '#efe3c2'; c.font = '700 40px Georgia, serif'; c.textAlign = 'center'; c.fillText('PIGALLE', w / 2, 120); c.font = 'italic 28px Georgia, serif'; c.fillText('1925', w / 2, 170); c.beginPath(); c.arc(w / 2, 280, 70, 0, 7); c.stroke(); });
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ map: p, roughness: 0.5 })), B.X1 - 0.02, 1.85, z); m.rotation.y = -Math.PI / 2; m.castShadow = false; }
  // ---- lights: three globes over the counter, the back bar's glow, a dim fill ----
  const globeM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffcf8f', emissiveIntensity: 1.3 });
  const pend = [];
  for (const x of [-2.0, -0.5, 1.0]) { add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.75, 6), new THREE.MeshStandardMaterial({ color: '#111' })), x, B.H - 0.375, B.CZ - 0.15).castShadow = false;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), globeM), x, B.H - 0.85, B.CZ - 0.15).castShadow = false;
    const l = new THREE.PointLight('#ffc98a', 3.2, 6, 2); l.position.set(x, B.H - 1.0, B.CZ - 0.15); l.castShadow = x === -0.5; if (l.castShadow) { l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.002; } scene.add(l); pend.push(l); }
  const back = new THREE.PointLight('#ffb25e', 2.4, 4, 2); back.position.set(-0.5, 1.6, BZ + 0.3); scene.add(back);
  scene.add(new THREE.HemisphereLight('#4a2a28', '#120a08', 0.35));
  // an environment with warm glints for the glossy wood, glass and chrome
  const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene(); env.background = new THREE.Color('#0d0807');
  for (const [x, y, z, c, k] of [[-2, 2.2, -0.6, '#ffc98a', 6], [1, 2.2, -0.6, '#ffc98a', 6], [-3, 2, 1, '#ff4fa3', 4], [0, 1.6, -3.5, '#ffb25e', 4], [0, 1.5, 3.4, '#6aa0ff', 1.5]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(x, y, z); env.add(m); }
  scene.environment = pm.fromScene(env, 0.03).texture; scene.environmentIntensity = 0.5;
  return { scene, stools, tables, counter: { z: B.CZ, y: B.CY }, pendants: pend, backLight: back, neon: neonL };
}

// a glass on the bar: a tumbler (with ice and an amber drink) or a stemmed wine glass; glass.box for contacts
export function makeGlass(kind = 'tumbler') {
  const g = new THREE.Group();
  const gm = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.28, clearcoat: 1, specularIntensity: 0.6, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
  const drink = new THREE.MeshStandardMaterial({ color: kind === 'wine' ? '#5a0f1c' : '#b8661a', roughness: 0.15, transparent: true, opacity: 0.85, emissive: kind === 'wine' ? '#1a0306' : '#3a1a04', emissiveIntensity: 0.4 });
  if (kind === 'wine') {
    const prof = [[0, 0], [0.035, 0], [0.036, 0.004], [0.004, 0.01], [0.004, 0.09], [0.03, 0.12], [0.042, 0.16], [0.038, 0.205], [0.0375, 0.205]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 28), gm));
    const d = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.1], [0.026, 0.118], [0.037, 0.15], [0, 0.15]].map(([x, y]) => new THREE.Vector2(x, y)), 24), drink); g.add(d);
    g.box = { c: new THREE.Vector3(0, 0.1, 0), h: new THREE.Vector3(0.043, 0.103, 0.043), nm: 'glass' };
  } else {
    const prof = [[0, 0], [0.036, 0], [0.039, 0.005], [0.041, 0.1], [0.0395, 0.1]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 28), gm));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.034, 0.012, 24), gm).translateY(0.006));
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.0375, 0.035, 0.05, 24), drink); d.position.y = 0.037; g.add(d);
    const ice = new THREE.MeshPhysicalMaterial({ color: '#f2f8ff', roughness: 0.08, transparent: true, opacity: 0.5 });
    for (const [x, z, a] of [[-0.012, 0.008, 0.4], [0.014, -0.006, 1.1], [0.0, 0.016, 2.0]]) { const c = new THREE.Mesh(new RoundedBoxGeometry(0.022, 0.022, 0.022, 2, 0.004), ice); c.position.set(x, 0.066, z); c.rotation.set(a, a * 0.7, 0.3); g.add(c); }
    g.box = { c: new THREE.Vector3(0, 0.05, 0), h: new THREE.Vector3(0.042, 0.051, 0.042), nm: 'glass' };
  }
  return g;
}
