// Elevator set: car interior (brushed steel, mirror, granite floor, LED ceiling), floor display, button panel,
// car frame with safety gear, shaft with rails/landings/counterweight, and the posable mannequin.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './core.js';

export const CAR = { W: 2.0, D: 1.6, H: 2.45 };
export const FLOOR_H = 3.1;

// ---------- textures ----------
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
export function brushedMaps(seed = 1, tone = 200) {
  const r = rng(seed);
  const col = canvas(512, 512, (g, w, h) => {
    g.fillStyle = `rgb(${tone},${tone + 2},${tone + 6})`; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const y = r() * h, a = r() * 0.035, l = 60 + r() * 400; const v = r() < 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(r() * w - 50, y, l, 1 + (r() < 0.2 ? 1 : 0)); }
  });
  const rough = canvas(512, 512, (g, w, h) => {
    g.fillStyle = 'rgb(92,92,92)'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { const y = r() * h, v = 75 + r() * 40; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(r() * w - 50, y, 80 + r() * 380, 1); }
  });
  const t1 = new THREE.CanvasTexture(col); t1.colorSpace = THREE.SRGBColorSpace;
  const t2 = new THREE.CanvasTexture(rough);
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map: t1, roughnessMap: t2 };
}
// every texture request is tracked so an episode can wait for all of them before the first frame
export const TEX_PENDING = [];
export function loadPH(name, repeat = 1) {
  const L = new THREE.TextureLoader();
  const ld = (f, srgb) => { let t; TEX_PENDING.push(new Promise((res) => { t = L.load(`/engine/tex/ph/${name}_${f}.jpg`, res, undefined, (e) => { console.error('texture failed', name, f); res(); }); })); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: ld('diff', true), roughnessMap: ld('rough'), normalMap: ld('nor') };
}

// LED dot-matrix floor display (canvas texture you can redraw)
export class FloorDisplay {
  constructor(w = 256, h = 96) {
    this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h; this.g = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace; this.last = null;
  }
  draw(text, arrow = '', color = '#ff5a3c', dim = 1) {
    const key = text + arrow + color + dim.toFixed(2); if (key === this.last) return; this.last = key;
    const g = this.g, w = this.c.width, h = this.c.height;
    g.fillStyle = '#050505'; g.fillRect(0, 0, w, h);
    // dot grid background
    g.fillStyle = 'rgba(255,90,60,0.06)';
    for (let y = 6; y < h; y += 8) for (let x = 6; x < w; x += 8) g.fillRect(x, y, 3, 3);
    g.font = 'bold 74px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 14 * dim; g.fillStyle = color; g.globalAlpha = dim;
    g.fillText(text, w * 0.58, h * 0.56);
    if (arrow) { g.font = 'bold 54px sans-serif'; g.fillText(arrow, w * 0.16, h * 0.54); }
    g.globalAlpha = 1; g.shadowBlur = 0;
    this.tex.needsUpdate = true;
  }
}

function buttonPanelTexture(lit = 16) {
  const c = canvas(256, 640, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, '#9aa0a8'); grad.addColorStop(0.5, '#c9ced5'); grad.addColorStop(1, '#8f959d');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const nums = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    nums.forEach((n, i) => {
      const col = i % 2, row = Math.floor(i / 2); const x = 72 + col * 112, y = 60 + row * 52;
      g.beginPath(); g.arc(x, y, 19, 0, Math.PI * 2); g.fillStyle = '#3a3e44'; g.fill();
      g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fillStyle = n === lit ? '#ffb547' : '#d9dde2'; g.fill();
      if (n === lit) { g.shadowColor = '#ffb547'; g.shadowBlur = 18; g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0; }
      g.fillStyle = n === lit ? '#3a2200' : '#2a2d31'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), x, y + 1);
    });
    g.fillStyle = '#c0392b'; g.beginPath(); g.arc(w / 2, 600, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.fillText('ALARM', w / 2, 600);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- the car ----------
export function makeCar({ mirror = true, envMap = null } = {}) {
  const { W, D, H } = CAR;
  const g = new THREE.Group();
  const steelMaps = brushedMaps(3, 172);
  const steel = new THREE.MeshPhysicalMaterial({ ...steelMaps, color: '#ffffff', metalness: 1.0, roughness: 0.34, anisotropy: 0.6, anisotropyRotation: 0, envMapIntensity: 1.0 });
  const steelDark = new THREE.MeshPhysicalMaterial({ ...brushedMaps(5, 120), color: '#ffffff', metalness: 1.0, roughness: 0.38, anisotropy: 0.7 });
  const groove = new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.6, metalness: 0.4 });
  const granite = new THREE.MeshStandardMaterial({ ...loadPH('granite_tile', 1.5), color: '#cfcfd2', roughness: 1.0 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#f2f4f7', metalness: 1, roughness: 0.08 });
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.58, 1.5) });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#d7d9dc', roughness: 0.5, metalness: 0.6 });

  // floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, D), granite); floor.position.y = -0.02; floor.receiveShadow = true; g.add(floor);
  // wall panels (3 per side wall, 4 on the back), with dark grooves between
  const panelGeo = (w, h) => new THREE.BoxGeometry(w, h, 0.02);
  const addPanels = (n, width, height, place) => { for (let i = 0; i < n; i++) { const p = new THREE.Mesh(panelGeo(width / n - 0.012, height), steel); place(p, i, n); p.receiveShadow = true; g.add(p); } };
  // back wall: lower steel panels + mirror above handrail
  addPanels(4, W, 0.88, (p, i, n) => { p.position.set(-W / 2 + (i + 0.5) * W / n, 0.44, -D / 2); });
  const backTop = new THREE.Mesh(new THREE.BoxGeometry(W, H - 0.9, 0.015), groove); backTop.position.set(0, 0.9 + (H - 0.9) / 2, -D / 2 - 0.01); g.add(backTop);
  let reflector = null;
  if (mirror) {
    reflector = new Reflector(new THREE.PlaneGeometry(W - 0.16, H - 1.06), { textureWidth: 512, textureHeight: 576, color: 0xc9ccd0, clipBias: 0.003 });
    reflector.position.set(0, 0.9 + (H - 0.9) / 2 - 0.02, -D / 2 + 0.006); g.add(reflector);
  }
  // side walls
  for (const s of [-1, 1]) {
    const wall = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, H - 0.02, D / 3 - 0.012), steel);
      p.position.set(s * W / 2, H / 2, -D / 2 + (i + 0.5) * D / 3); p.receiveShadow = true; wall.add(p);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.01, H, D), groove); back.position.set(s * (W / 2 + 0.012), H / 2, 0); wall.add(back);
    g.add(wall);
  }
  // handrails (side + back)
  const railGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 16);
  const rail = (a, b) => { const m = new THREE.Mesh(railGeo, chrome); const d = b.clone().sub(a); m.scale.y = d.length(); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; g.add(m); };
  const y0 = 0.92, off = 0.06;
  rail(new THREE.Vector3(-W / 2 + 0.25, y0, -D / 2 + off), new THREE.Vector3(W / 2 - 0.25, y0, -D / 2 + off));
  for (const s of [-1, 1]) rail(new THREE.Vector3(s * (W / 2 - off), y0, -D / 2 + 0.25), new THREE.Vector3(s * (W / 2 - off), y0, D / 2 - 0.35));
  // ceiling: frame + LED panel + downlights
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, D), ceilMat); ceil.position.y = H + 0.03; g.add(ceil);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.5, D - 0.5), ledMat); led.rotation.x = Math.PI / 2; led.position.y = H - 0.002; g.add(led);
  const ledFrame = new THREE.Mesh(new THREE.BoxGeometry(W - 0.44, 0.02, D - 0.44), steelDark); ledFrame.position.y = H - 0.012; g.add(ledFrame);
  // front wall with doors
  const front = new THREE.Group(); g.add(front);
  const frontPanelW = (W - 1.0) / 2;
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(frontPanelW, H, 0.03), steel); p.position.set(s * (W / 2 - frontPanelW / 2), H / 2, D / 2); front.add(p);
  }
  const transom = new THREE.Mesh(new THREE.BoxGeometry(1.0, H - 2.15, 0.03), steel); transom.position.set(0, 2.15 + (H - 2.15) / 2, D / 2); front.add(transom);
  const doors = [];
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.15, 0.025), steelDark); d.position.set(s * 0.25, 1.075, D / 2 + 0.02); d.castShadow = true; front.add(d); doors.push(d);
  }
  // floor display above the doors + button panel to the right of the doors
  const display = new FloorDisplay();
  const dispMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: display.tex, toneMapped: false }));
  dispMesh.position.set(0, 2.28, D / 2 - 0.018); dispMesh.rotation.y = Math.PI; front.add(dispMesh);
  const btnTex = buttonPanelTexture(16);
  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.012), [groove, groove, groove, groove, groove, new THREE.MeshStandardMaterial({ map: btnTex, metalness: 0.5, roughness: 0.35, emissive: '#ffffff', emissiveMap: btnTex, emissiveIntensity: 0.25 })]);
  btn.position.set(0.68, 1.2, D / 2 - 0.022); btn.rotation.y = Math.PI; front.add(btn);
  // exterior shell (seen from the shaft)
  const shellMat = new THREE.MeshStandardMaterial({ color: '#2c2f34', roughness: 0.7, metalness: 0.5 });
  const shell = new THREE.Group();
  const sh = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shellMat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; shell.add(m); };
  sh(W + 0.1, 0.08, D + 0.1, 0, -0.08, 0); sh(W + 0.1, 0.08, D + 0.1, 0, H + 0.1, 0);
  sh(0.04, H + 0.2, D + 0.1, -W / 2 - 0.05, H / 2, 0); sh(0.04, H + 0.2, D + 0.1, W / 2 + 0.05, H / 2, 0); sh(W + 0.1, H + 0.2, 0.04, 0, H / 2, -D / 2 - 0.05);
  g.add(shell);
  // car frame (sling): stiles + crosshead + safety gear blocks
  const frameMat = new THREE.MeshStandardMaterial({ color: '#c8a23a', roughness: 0.55, metalness: 0.4 });
  const frame = new THREE.Group();
  for (const s of [-1, 1]) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, H + 0.8, 0.14), frameMat); st.position.set(s * (W / 2 + 0.12), H / 2 + 0.15, 0); st.castShadow = true; frame.add(st);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(W + 0.34, 0.16, 0.18), frameMat); cross.position.set(0, H + 0.5, 0); cross.castShadow = true; frame.add(cross);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(W + 0.34, 0.14, 0.18), frameMat); plank.position.set(0, -0.2, 0); frame.add(plank);
  const hitch = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.14), new THREE.MeshStandardMaterial({ color: '#555a61', metalness: 0.8, roughness: 0.4 })); hitch.position.set(0, H + 0.64, 0); frame.add(hitch);
  const safeties = [];
  const gearMat = new THREE.MeshStandardMaterial({ color: '#b8321e', roughness: 0.45, metalness: 0.35 });
  const boltMat = new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 0.9, roughness: 0.3 });
  const wedgeMat = new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 0.95, roughness: 0.22 });
  for (const s of [-1, 1]) {
    const sg = new THREE.Group();
    // two cheeks either side of the rail blade (front/back), joined on the car side
    for (const c of [-1, 1]) {
      const cheek = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.26, 0.05, 2, 0.012), gearMat); cheek.position.set(0, 0, c * 0.04); cheek.castShadow = true; sg.add(cheek);
      for (const [bx, by] of [[0.05, 0.08], [-0.05, 0.08], [0.05, -0.08], [-0.05, -0.08]]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 10), boltMat); bolt.rotation.x = Math.PI / 2; bolt.position.set(bx, by, c * 0.071); sg.add(bolt);
      }
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.13), gearMat); back.position.set(-s * 0.1, 0, 0); sg.add(back);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.15), gearMat); top.position.set(-s * 0.02, 0.145, 0); sg.add(top);
    // wedges ride in the slot either side of the blade; they climb and pinch it when the governor trips
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.006), wedgeMat); w1.position.set(0, -0.02, -0.0115); sg.add(w1);
    const w2 = w1.clone(); w2.position.z = 0.0115; sg.add(w2);
    sg.position.set(s * (W / 2 + 0.245), -0.14, 0); frame.add(sg); safeties.push({ group: sg, wedges: [w1, w2] });
  }
  g.add(frame);
  return { group: g, doors, display, reflector, steel, shell, frame, safeties, led, ledMat, front };
}

// ---------- shaft ----------
export function makeShaft({ floors = 18, width = 2.9, depth = 2.6 } = {}) {
  const g = new THREE.Group();
  const conc = new THREE.MeshStandardMaterial({ ...loadPH('concrete_block_wall', 3), color: '#a9acaf', roughness: 1 });
  const H = floors * FLOOR_H + 6;
  // back + side walls (front is open for the cutaway)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(width, H), conc); back.position.set(0, H / 2 - 3, -depth / 2); back.receiveShadow = true; g.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(depth, H), conc); side.rotation.y = -s * Math.PI / 2; side.position.set(s * width / 2, H / 2 - 3, 0); side.receiveShadow = true; g.add(side);
  }
  // guide rails (T-section) for the car
  const railMat = new THREE.MeshStandardMaterial({ ...loadPH('rusty_metal_04', 1), color: '#8d9198', metalness: 0.8, roughness: 0.55 });
  for (const s of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, H, 0.016), new THREE.MeshStandardMaterial({ color: '#c4c8cd', metalness: 0.9, roughness: 0.26 })); blade.position.set(s * (CAR.W / 2 + 0.245), H / 2 - 3, 0); g.add(blade);
    const flange = new THREE.Mesh(new THREE.BoxGeometry(0.014, H, 0.12), railMat); flange.position.set(s * (CAR.W / 2 + 0.297), H / 2 - 3, 0); g.add(flange);
    for (let y = 0; y < H - 4; y += 2.4) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.2), railMat); br.position.set(s * (CAR.W / 2 + 0.375), y, 0); g.add(br); }
  }
  // landing doors on the (missing) front side are drawn on the back wall as floor bands + numbers
  const bandMat = new THREE.MeshStandardMaterial({ color: '#8a8780', roughness: 1 });
  for (let f = 0; f <= floors; f++) {
    const y = f * FLOOR_H;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.28, 0.12), bandMat); slab.position.set(0, y - 0.14, -depth / 2 + 0.06); slab.receiveShadow = true; g.add(slab);
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#1b1c1e'; x.font = 'bold 50px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(f + 1), 64, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 1 }));
    num.position.set(-width / 2 + 0.45, y + 1.6, -depth / 2 + 0.005); g.add(num);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1.0) })); lamp.position.set(width / 2 - 0.3, y + 2.2, -depth / 2 + 0.03); g.add(lamp);
  }
  // counterweight (on its own rails at the back)
  const cw = new THREE.Group();
  const cwMat = new THREE.MeshStandardMaterial({ color: '#3b3f45', metalness: 0.7, roughness: 0.5 });
  for (let i = 0; i < 14; i++) { const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.11, 0.2), cwMat); plate.position.y = i * 0.12; plate.castShadow = true; cw.add(plate); }
  cw.position.set(0, 0, -depth / 2 + 0.3); g.add(cw);
  return { group: g, counterweight: cw, height: H };
}

// ---------- cables (hoist ropes) ----------
export function makeCables(n = 6, length = 60) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#4a4d52', metalness: 0.85, roughness: 0.45 });
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, length, 6, 40), mat);
    m.position.set(-0.15 + i * 0.06, length / 2, 0); m.castShadow = true; g.add(m);
    list.push({ mesh: m, base: m.geometry.attributes.position.array.slice() });
  }
  return { group: g, list, length };
}

// ---------- mannequin ----------
export async function loadMannequin(url = '/engine/models/Xbot.glb') {
  const gltf = await new GLTFLoader().loadAsync(url);
  return gltf;
}

export function cloneMannequin(gltf, { bodyColor = '#c3c7cd', jointColor = '#33363c' } = {}) {
  // SkeletonUtils-free clone: reload is simpler, so we just use the scene directly for one instance
  const root = gltf.scene;
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const name = o.material.name || '';
      o.material = new THREE.MeshPhysicalMaterial({ color: name.includes('Joints') ? jointColor : bodyColor, roughness: name.includes('Joints') ? 0.5 : 0.42, metalness: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.35 });
    }
  });
  const bones = {};
  root.traverse((o) => { if (o.isBone) bones[o.name.replace('mixamorig', '')] = o; });
  const mixer = new THREE.AnimationMixer(root);
  const clips = Object.fromEntries(gltf.animations.map((a) => [a.name, a]));
  const rest = {}; for (const [k, b] of Object.entries(bones)) rest[k] = b.quaternion.clone();
  return { root, bones, mixer, clips, rest };
}

// apply local Euler offsets (radians) on top of the current (animated) pose
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
export function offsetBone(m, name, x = 0, y = 0, z = 0) {
  const b = m.bones[name]; if (!b) return;
  _e.set(x, y, z, 'XYZ'); _q.setFromEuler(_e); b.quaternion.multiply(_q);
}

// ---------- simple IK: aim bones in world space, keep the animated twist ----------
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qp = new THREE.Quaternion();
function setWorldQuat(bone, qWorld) {
  bone.parent.getWorldQuaternion(_qp);
  bone.quaternion.copy(_qp.invert().multiply(qWorld));
  bone.updateMatrixWorld(true);
}
// rotate `bone` so that its child currently at world `childPos` ends up pointing at world `target`
export function aimBone(bone, childPos, target) {
  const o = bone.getWorldPosition(new THREE.Vector3());
  _v1.copy(childPos).sub(o).normalize(); _v2.copy(target).sub(o).normalize();
  _qa.setFromUnitVectors(_v1, _v2);
  bone.getWorldQuaternion(_qb); _qa.multiply(_qb);
  setWorldQuat(bone, _qa);
}
// two-bone IK: place the end bone (wrist/ankle) at `target`; the middle joint bends toward `pole`
export function twoBoneIK(m, upperName, lowerName, endName, target, pole) {
  const up = m.bones[upperName], lo = m.bones[lowerName], en = m.bones[endName];
  m.root.updateMatrixWorld(true);
  const S = up.getWorldPosition(new THREE.Vector3()), E = lo.getWorldPosition(new THREE.Vector3()), Wr = en.getWorldPosition(new THREE.Vector3());
  const L1 = S.distanceTo(E), L2 = E.distanceTo(Wr);
  const toT = target.clone().sub(S); const d = Math.min(toT.length(), (L1 + L2) * 0.999); const u = toT.normalize();
  const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const pv = pole.clone().sub(S); const v = pv.sub(u.clone().multiplyScalar(pv.dot(u))).normalize();
  const Ed = S.clone().add(u.clone().multiplyScalar(L1 * cosA)).add(v.multiplyScalar(L1 * sinA));
  aimBone(up, E, Ed);
  const E2 = lo.getWorldPosition(new THREE.Vector3()), W2 = en.getWorldPosition(new THREE.Vector3());
  aimBone(lo, W2, S.clone().add(u.clone().multiplyScalar(d)));
  return E2;
}
// local axes of a hand: fingers (wrist -> middle knuckle) and palm normal, in hand-local space
export function handAxes(m, side = 'Right') {
  const f = m.bones[side + 'HandMiddle1'].position.clone().normalize();
  const lat = m.bones[side + 'HandIndex1'].position.clone().sub(m.bones[side + 'HandPinky1'].position);
  const n = side === 'Right' ? new THREE.Vector3().crossVectors(lat, f) : new THREE.Vector3().crossVectors(f, lat);
  n.sub(f.clone().multiplyScalar(n.dot(f))).normalize();
  return { f, n };
}
// orient a hand in world space: fingers along F, palm facing N
export function orientHand(m, side, F, N) {
  const { f, n } = handAxes(m, side);
  const b = new THREE.Vector3().crossVectors(f, n);
  const Fw = F.clone().normalize(); const Nw = N.clone().sub(Fw.clone().multiplyScalar(N.dot(Fw))).normalize(); const Bw = new THREE.Vector3().crossVectors(Fw, Nw);
  const ml = new THREE.Matrix4().makeBasis(f, n, b), mw = new THREE.Matrix4().makeBasis(Fw, Nw, Bw);
  const q = new THREE.Quaternion().setFromRotationMatrix(mw.multiply(ml.transpose()));
  setWorldQuat(m.bones[side + 'Hand'], q);
}

// ---------- realistic human (Mixamo rig) driven by the Xbot rig through world-space retargeting ----------
export function cloneHuman(gltf) {
  const root = SkeletonUtils.clone(gltf.scene);
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const m = o.material; if (m && m.isMeshStandardMaterial) { m.metalness = 0; if (!m.roughnessMap) m.roughness = 0.8; m.envMapIntensity = 0.8; }
    }
  });
  const bones = {};
  root.traverse((o) => { if (o.isBone) bones[o.name.replace('mixamorig', '')] = o; });
  // put it in its T-pose (the reference pose the retargeting compares against)
  const tclip = gltf.animations.find((a) => a.name === 'TPose');
  if (tclip) { const mx = new THREE.AnimationMixer(root); mx.clipAction(tclip).play(); mx.setTime(0); mx.stopAllAction(); mx.uncacheRoot(root); }
  root.updateMatrixWorld(true);
  return { root, bones };
}
// copy the source skeleton's pose onto the destination: same world-space rotation of every bone relative to its T-pose
export function makeRetarget(src, dst) {
  const rq = (root, o) => root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(o.getWorldQuaternion(new THREE.Quaternion()));
  const rp = (root, o) => root.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
  src.root.updateMatrixWorld(true); dst.root.updateMatrixWorld(true);
  const order = []; dst.root.traverse((o) => { if (o.isBone) { const n = o.name.replace('mixamorig', ''); if (src.bones[n]) order.push(n); } });
  const s0 = {}, d0 = {};
  for (const n of order) { s0[n] = rq(src.root, src.bones[n]).invert(); d0[n] = rq(dst.root, dst.bones[n]); }
  const sHip0 = rp(src.root, src.bones.Hips), dHip0 = rp(dst.root, dst.bones.Hips), ratio = dHip0.y / sHip0.y;
  return function apply() {
    src.root.updateMatrixWorld(true); dst.root.updateMatrixWorld(true);
    const rootQi = dst.root.getWorldQuaternion(new THREE.Quaternion()).invert();
    const cur = {};
    for (const n of order) {
      const db = dst.bones[n];
      const Wt = rq(src.root, src.bones[n]).multiply(s0[n]).multiply(d0[n]);
      const pn = db.parent && db.parent.isBone ? db.parent.name.replace('mixamorig', '') : null;
      const Pq = pn && cur[pn] ? cur[pn].clone() : rootQi.clone().multiply(db.parent.getWorldQuaternion(new THREE.Quaternion()));
      db.quaternion.copy(Pq.invert().multiply(Wt));
      cur[n] = Wt;
    }
    // hips: follow the source's sway/bob, scaled to this body
    const dh = rp(src.root, src.bones.Hips).sub(sHip0).multiplyScalar(ratio);
    const hips = dst.bones.Hips; dst.root.updateMatrixWorld(true);
    const wpos = dst.root.localToWorld(dHip0.clone().add(dh));
    hips.position.copy(hips.parent.worldToLocal(wpos));
    dst.root.updateMatrixWorld(true);
  };
}
