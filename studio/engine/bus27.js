// « 12 % » Saison 2 · Partie 4 · Le dernier bus: a generic 12 m low-floor city bus at night (no operator, no line number: « BUS DE
// NUIT » on its displays), its interior (seats, yellow grab poles, LED ceiling strips, the driver's cab with a partition, a wheel and a
// real interior mirror), a lit bus shelter and a high-vis vest fitted to an avatar's torso.
// Bus frame: +z forward, y up, x to the left (the driver sits at +x, left-hand drive; the doors open on the right, -x), floor at FLOOR.
// bus.place(x, z, yaw) puts it on the road; setDoor(i, k) opens door i (0 front, 1 middle, 2 rear); bus.seats / bus.boxes for poses
// and contact checks; bus.mirror (a Reflector) is turned by the episode toward the two eyes it joins.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { rng } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const BUS = { L: 12.0, W: 2.55, H: 3.0, FLOOR: 0.36, WIN0: 1.08, WIN1: 2.42, Z0: -6.0, Z1: 6.0,
  DOORS: [[4.55, 5.65], [0.45, 1.75], [-3.65, -2.55]], WHEELS: [3.9, -2.8], WR: 0.5 };

function tex(w, h, draw, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// an amber LED matrix display (dots, so it reads as a real display up close)
function ledTex(text, w = 1024, h = 128) {
  return tex(w, h, (c) => {
    c.fillStyle = '#050403'; c.fillRect(0, 0, w, h);
    const m = document.createElement('canvas'); m.width = w / 8; m.height = h / 8; const mc = m.getContext('2d');
    mc.fillStyle = '#000'; mc.fillRect(0, 0, m.width, m.height); mc.fillStyle = '#fff'; mc.font = `700 ${Math.floor(m.height * 0.78)}px Arial, sans-serif`;
    mc.textAlign = 'center'; mc.textBaseline = 'middle'; mc.fillText(text, m.width / 2, m.height / 2 + 1);
    const d = mc.getImageData(0, 0, m.width, m.height).data;
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      const on = d[(y * m.width + x) * 4] > 90; c.fillStyle = on ? '#ffb020' : '#1a1208';
      c.beginPath(); c.arc(x * 8 + 4, y * 8 + 4, on ? 3.2 : 2.2, 0, 7); c.fill();
    }
  });
}

export function makeBus({ seed = 27, front = 'BUS DE NUIT' } = {}) {
  const g = new THREE.Group(), r = rng(seed), boxes = [];
  const { L, W, H, FLOOR, WIN0, WIN1, Z0, Z1 } = BUS, hw = W / 2;
  const add = (geo, mat, x, y, z, parent = g, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, parent = g) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  // ---- materials ----
  const paint = new THREE.MeshPhysicalMaterial({ color: '#d9dcdf', roughness: 0.32, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const skirt = new THREE.MeshStandardMaterial({ color: '#1d2a4a', roughness: 0.45, metalness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: '#0c0d0f', roughness: 0.6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#1a2128', roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.32, clearcoat: 1, envMapIntensity: 1.3, depthWrite: false, side: THREE.DoubleSide });
  const panelIn = new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.55 });
  const floorTex = tex(512, 512, (c, w, h) => { c.fillStyle = '#4a4e54'; c.fillRect(0, 0, w, h); const rr = rng(5); for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${rr() < 0.5 ? '200,200,205' : '20,20,25'},${0.25 + 0.25 * rr()})`; c.fillRect(rr() * w, rr() * h, 2, 2); } });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(2, 8);
  const floorM = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#f2c200', roughness: 0.35, metalness: 0.2 });
  const seatTex = tex(256, 256, (c, w, h) => { c.fillStyle = '#1f3a7a'; c.fillRect(0, 0, w, h); const rr = rng(9); for (let i = 0; i < 90; i++) { c.fillStyle = ['#e63a3a', '#2fb5d6', '#f2c200', '#0e1e44'][Math.floor(rr() * 4)]; c.fillRect(rr() * w, rr() * h, 6 + rr() * 16, 3); } });
  const seatM = new THREE.MeshStandardMaterial({ map: seatTex, roughness: 0.85 });
  const shellM = new THREE.MeshStandardMaterial({ color: '#8d939a', roughness: 0.45 });
  const ledM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#e8f0ff', emissiveIntensity: 1.6 });
  // ---- body shell: floor, roof, side panels with the window band, front and rear ----
  const len = Z1 - Z0, cz = (Z1 + Z0) / 2;
  box(W - 0.06, 0.1, len, black, 0, FLOOR - 0.05, cz);                                   // floor slab
  add(new THREE.PlaneGeometry(W - 0.12, len - 0.1), floorM, 0, FLOOR + 0.002, cz).rotation.x = -Math.PI / 2;
  add(new RoundedBoxGeometry(W, 0.12, len, 3, 0.05), paint, 0, H - 0.06, cz);            // roof
  box(W - 0.1, 0.02, len - 0.2, panelIn, 0, H - 0.13, cz);                               // ceiling panel
  box(W * 0.7, 0.28, 3.2, paint, 0, H + 0.12, -3.4);                                     // roof pod (AC)
  // the two sides: everywhere except the door openings on the right (-x); the window band is glass between frames
  const doorsAt = (z) => BUS.DOORS.findIndex(([a, b]) => z > a - 0.02 && z < b + 0.02);
  for (const sd of [1, -1]) {
    const x = sd * (hw - 0.025);
    const spans = [];
    if (sd < 0) { let z = Z0; for (const [a, b] of [...BUS.DOORS].sort((p, q) => p[0] - q[0])) { spans.push([z, a]); z = b; } spans.push([z, Z1]); } else spans.push([Z0, Z1]);
    for (const [a, b] of spans) {
      const l = b - a, c = (a + b) / 2; if (l < 0.05) continue;
      box(0.05, 0.42, l, skirt, x, 0.21 + 0.13, c);                                       // the dark skirt
      box(0.05, WIN0 - 0.55, l, paint, x, 0.55 + (WIN0 - 0.55) / 2, c);                   // below the windows
      add(new THREE.PlaneGeometry(l, WIN1 - WIN0), glass, x, (WIN0 + WIN1) / 2, c, g, false).rotation.y = sd * Math.PI / 2;
      box(0.05, H - 0.12 - WIN1, l, paint, x, WIN1 + (H - 0.12 - WIN1) / 2, c);            // above the windows
      for (let z = a + 0.05; z <= b; z += 1.45) box(0.07, WIN1 - WIN0, 0.07, black, x, (WIN0 + WIN1) / 2, Math.min(z, b - 0.04));   // window pillars
      box(0.04, 0.6, l - 0.04, panelIn, x - sd * 0.04, FLOOR + 0.35, c);                  // inner panel under the windows
    }
  }
  // front: the windscreen, the destination display above it, bumper, headlights
  box(W, 0.6, 0.12, paint, 0, 0.5, Z1 - 0.06); box(W, 0.18, 0.1, black, 0, 0.18, Z1 - 0.05);
  add(new THREE.PlaneGeometry(W - 0.14, 1.9), glass, 0, 1.75, Z1 - 0.04, g, false);
  for (const sd of [1, -1]) box(0.08, 1.95, 0.1, black, sd * (hw - 0.04), 1.75, Z1 - 0.05);
  box(W, 0.45, 0.12, black, 0, H - 0.3, Z1 - 0.06);
  const dest = ledTex(front); const destM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: dest, emissiveIntensity: 1.4 });
  add(new THREE.PlaneGeometry(1.9, 0.26), destM, 0, H - 0.3, Z1 + 0.003, g, false);
  const sideDest = add(new THREE.PlaneGeometry(1.4, 0.2), destM, -hw - 0.003, WIN1 - 0.16, 3.4, g, false); sideDest.rotation.y = -Math.PI / 2;
  const headM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff6e8', emissiveIntensity: 0 });
  const tailM = new THREE.MeshStandardMaterial({ color: '#2a0303', emissive: '#ff1a10', emissiveIntensity: 0 });
  for (const sd of [1, -1]) { add(new RoundedBoxGeometry(0.42, 0.14, 0.04, 2, 0.02), headM, sd * (hw - 0.35), 0.62, Z1 + 0.005, g, false); }
  // rear: panel, small rear window, tail lights
  box(W, H - 0.14, 0.1, paint, 0, (H - 0.14) / 2 + 0.06, Z0 + 0.05);
  add(new THREE.PlaneGeometry(W - 0.5, 0.7), glass, 0, 2.15, Z0 - 0.005, g, false).rotation.y = Math.PI;
  for (const sd of [1, -1]) box(0.16, 0.5, 0.03, tailM, sd * (hw - 0.14), 0.9, Z0 - 0.01);
  // wheels in their arches
  const tyre = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 }), hub = new THREE.MeshStandardMaterial({ color: '#8d9196', roughness: 0.35, metalness: 0.8 });
  const wheels = [];
  for (const z of BUS.WHEELS) for (const sd of [1, -1]) {
    const w = new THREE.Group(); w.position.set(sd * (hw - 0.22), BUS.WR, z); g.add(w);
    const t = add(new THREE.CylinderGeometry(BUS.WR, BUS.WR, 0.32, 28), tyre, 0, 0, 0, w); t.rotation.z = Math.PI / 2;
    const h = add(new THREE.CylinderGeometry(0.28, 0.28, 0.33, 16), hub, 0, 0, 0, w); h.rotation.z = Math.PI / 2;
    box(0.36, 0.06, 0.06, black, 0, 0.12, 0, w); wheels.push(w);
    box(0.06, 0.2, 1.3, black, sd * (hw - 0.02), BUS.WR * 2 + 0.06, z);                   // arch lip
  }
  // ---- doors: double glass leaves; open = they swing out and slide toward the door's ends ----
  const doors = BUS.DOORS.map(([a, b]) => {
    const dg = new THREE.Group(); g.add(dg); const half = (b - a) / 2, leaves = [];
    for (const s of [-1, 1]) {
      const lf = new THREE.Group(); dg.add(lf);
      box(0.04, 2.05, half - 0.02, black, 0, 0, 0, lf); add(new THREE.PlaneGeometry(half - 0.12, 1.75), glass, -0.025, 0.08, 0, lf, false).rotation.y = -Math.PI / 2;
      box(0.03, 0.04, half - 0.14, yellow, 0.03, 0.0, 0, lf);                             // inner grab bar
      leaves.push({ lf, s, base: V(-hw + 0.02, FLOOR + 1.03, (a + b) / 2 + s * half / 2) });
    }
    return { a, b, leaves };
  });
  const setDoor = (i, k) => { const d = doors[i]; for (const L of d.leaves) { L.lf.position.copy(L.base).add(V(-0.14 * Math.sin(Math.PI * Math.min(1, k * 1.4)) - 0.04 * k, 0, L.s * 0.62 * (d.b - d.a) / 2 * k)); } };
  doors.forEach((_, i) => setDoor(i, 0));
  // ---- interior: seats in pairs (forward-facing), grab poles, ceiling LED strips, a raised rear deck ----
  const seats = [];
  const seatAt = (x, z, y0 = FLOOR) => {
    const s = new THREE.Group(); s.position.set(x, y0, z); g.add(s);
    add(new RoundedBoxGeometry(0.44, 0.1, 0.44, 2, 0.03), seatM, 0, 0.385, 0, s);         // cushion (top at 0.435: a bus seat is low)
    add(new RoundedBoxGeometry(0.44, 0.52, 0.08, 2, 0.03), seatM, 0, 0.69, -0.2, s);     // back
    add(new RoundedBoxGeometry(0.46, 0.6, 0.03, 2, 0.012), shellM, 0, 0.67, -0.25, s);   // the plastic shell
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.34, 8), black, 0, 0.17, 0, s);
    boxes.push({ nm: 'seat', m: s, c: V(0, 0.385, 0), h: V(0.22, 0.05, 0.22) }, { nm: 'seat back', m: s, c: V(0, 0.69, -0.22), h: V(0.22, 0.29, 0.06) });
    seats.push({ g: s, pos: V(x, y0 + 0.435, z) });
  };
  for (let z = 3.85; z > -5.5; z -= 0.82) {
    if (doorsAt(z) >= 0 || (z < 0.45 && z > -0.6)) continue;                                // the doors' clear zones and the wheelchair space
    const y0 = z < -2.4 ? FLOOR + 0.26 : FLOOR;
    for (const x of [0.83, 0.38]) seatAt(x, z, y0);
    if (doorsAt(z) < 0 && !(z > -4.3 && z < -1.9)) for (const x of [-0.38, -0.83]) seatAt(x, z, y0);
  }
  box(W - 0.12, 0.26, -2.4 - Z0, black, 0, FLOOR + 0.13, (Z0 - 2.4) / 2);                // rear deck step
  const pole = (x, z, y0 = FLOOR) => add(new THREE.CylinderGeometry(0.018, 0.018, H - 0.14 - y0, 10), yellow, x, (H - 0.14 + y0) / 2, z);
  for (let z = 3.6; z > -5; z -= 1.64) { pole(0.18, z, z < -2.4 ? FLOOR + 0.26 : FLOOR); }
  for (const [a, b] of BUS.DOORS) { pole(-hw + 0.25, a - 0.08); pole(-hw + 0.25, b + 0.08); }
  for (const sd of [1, -1]) { const rl = add(new THREE.CylinderGeometry(0.016, 0.016, len - 2.2, 10), yellow, sd * 0.42, H - 0.36, cz - 0.6); rl.rotation.x = Math.PI / 2; }
  for (const sd of [1, -1]) box(0.08, 0.02, len - 1.6, ledM, sd * 0.78, H - 0.15, cz - 0.4);
  // ---- the driver's cab: seat, dashboard, a near-flat wheel, the partition, the interior mirror ----
  const DRV = V(0.78, FLOOR + 0.46, 4.95);
  add(new RoundedBoxGeometry(0.5, 0.12, 0.5, 2, 0.03), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.8 }), DRV.x, DRV.y - 0.06, DRV.z);
  add(new RoundedBoxGeometry(0.5, 0.65, 0.1, 2, 0.03), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.8 }), DRV.x, DRV.y + 0.32, DRV.z - 0.26);
  boxes.push({ nm: 'driver seat', m: g, c: V(DRV.x, DRV.y - 0.06, DRV.z), h: V(0.25, 0.06, 0.25) });
  add(new RoundedBoxGeometry(1.3, 0.5, 0.7, 3, 0.05), black, 0.62, FLOOR + 0.78, 5.62);   // dashboard
  const dashScr = tex(256, 128, (c, w, h) => { c.fillStyle = '#05080a'; c.fillRect(0, 0, w, h); c.fillStyle = '#34d17a'; c.font = '700 34px Arial'; c.fillText('03:14', 18, 50); c.fillStyle = '#7fa8c8'; c.font = '22px Arial'; c.fillText('PORTES', 18, 92); c.fillText('OK', 150, 92); });
  add(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff', emissiveMap: dashScr, emissiveIntensity: 0.6 }), 0.62, FLOOR + 1.05, 5.27, g, false).rotation.x = -0.6;
  const wheel = new THREE.Group(); wheel.position.set(DRV.x, FLOOR + 1.12, 5.38); wheel.rotation.x = 1.05; g.add(wheel);   // the rim leans back toward the driver
  add(new THREE.TorusGeometry(0.25, 0.019, 10, 40), black, 0, 0, 0, wheel);
  for (let k = 0; k < 3; k++) { const sp = add(new THREE.BoxGeometry(0.02, 0.24, 0.015), black, 0, 0, 0, wheel); sp.rotation.z = k * 2.094; sp.position.set(-Math.sin(k * 2.094) * 0.12, Math.cos(k * 2.094) * 0.12, 0); }
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), black, 0, 0, 0.02, wheel).rotation.x = Math.PI / 2;
  const col = add(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 10), black, 0, 0, 0.25, wheel); col.rotation.x = Math.PI / 2;
  // the partition behind the driver (glass on a frame), from the dashboard back to his seat
  box(0.04, 1.5, 0.04, black, 0.36, FLOOR + 0.75 + 0.3, 4.62); add(new THREE.PlaneGeometry(0.62, 1.25), glass, 0.68, FLOOR + 1.2, 4.6, g, false).rotation.y = Math.PI;
  box(0.66, 0.05, 0.04, black, 0.68, FLOOR + 0.55, 4.6); box(0.66, 0.05, 0.04, black, 0.68, FLOOR + 1.84, 4.6);
  boxes.push({ nm: 'partition', m: g, c: V(0.68, FLOOR + 1.2, 4.6), h: V(0.34, 0.65, 0.03) });
  // the interior mirror: a wide one above the windscreen, centred, tilted down toward the cabin (a Reflector)
  const mir = new THREE.Group(); mir.position.set(0.0, H - 0.52, Z1 - 0.32); g.add(mir);
  add(new RoundedBoxGeometry(0.56, 0.24, 0.04, 2, 0.02), black, 0, 0, 0.022, mir);
  const mirror = new Reflector(new THREE.PlaneGeometry(0.52, 0.2), { textureWidth: 1024, textureHeight: 400, color: 0x9a9a9a, clipBias: 0.003, multisample: 0 });
  mirror.rotation.y = Math.PI; mirror.position.z = -0.001; mir.add(mirror);
  // ---- lights: interior (cool LED), head and tail ----
  const inLights = [];
  for (const z of [3.2, -0.2, -3.6]) { const l = new THREE.PointLight('#dfe8ff', 0, 6, 2); l.position.set(0, H - 0.35, z); g.add(l); inLights.push(l); }
  const setLights = ({ inside = 1, head = 1, tail = 1 } = {}) => { inLights.forEach((l) => { l.intensity = 0.9 * inside; }); ledM.emissiveIntensity = 1.6 * inside; headM.emissiveIntensity = 3.5 * head; tailM.emissiveIntensity = 2.2 * tail; };
  setLights();
  // driving: wheels turn with the distance travelled
  const spin = (dist) => { for (const w of wheels) w.rotation.x = dist / BUS.WR; };
  const place = (x, z, yaw = -Math.PI / 2) => { g.position.set(x, 0, z); g.rotation.set(0, yaw, 0); g.updateMatrixWorld(true); };
  return { group: g, place, setDoor, setLights, spin, seats, boxes, wheel, mirror, mirrorHolder: mir, DRV, toW: (x, y, z) => g.localToWorld(V(x, y, z)) };
}

// ---- a lit bus shelter: glass back and one side, a roof with a light strip, a bench, a lit panel (map), the stop pole and its
// display. Frame: open toward +z (the road), back panel at z = -D/2, length along x.
export function makeShelter({ wait = '4 min' } = {}) {
  const g = new THREE.Group(), Wd = 3.6, D = 1.4, Hh = 2.45;
  const add = (geo, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
  const steel = new THREE.MeshStandardMaterial({ color: '#4a5058', roughness: 0.35, metalness: 0.8 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#c8d4dc', roughness: 0.05, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  for (const x of [-Wd / 2, Wd / 2]) for (const z of [-D / 2, D / 2 - 0.2]) add(new THREE.BoxGeometry(0.07, Hh, 0.07), steel, x, Hh / 2, z);
  add(new THREE.PlaneGeometry(Wd, Hh - 0.25), glass, 0, Hh / 2 + 0.05, -D / 2, false);
  const side = add(new THREE.PlaneGeometry(D - 0.25, Hh - 0.25), glass, Wd / 2, Hh / 2 + 0.05, -0.1, false); side.rotation.y = Math.PI / 2;
  add(new THREE.BoxGeometry(Wd + 0.3, 0.1, D + 0.25), steel, 0, Hh + 0.05, 0);
  const lightM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#eaf2ff', emissiveIntensity: 2.2 });
  add(new THREE.BoxGeometry(Wd - 0.3, 0.02, 0.08), lightM, 0, Hh - 0.005, -0.1, false);
  const lamp = new THREE.PointLight('#e6eeff', 3.2, 7, 2); lamp.position.set(0, Hh - 0.15, 0.1); g.add(lamp);
  // the bench: a perforated steel seat on two legs, against the back glass
  add(new THREE.BoxGeometry(2.2, 0.04, 0.36), steel, -0.4, 0.46, -D / 2 + 0.25); for (const x of [-1.4, 0.6]) add(new THREE.BoxGeometry(0.05, 0.44, 0.3), steel, x, 0.22, -D / 2 + 0.25);
  // the lit panel on the left end: a neighbourhood map (generic streets, a « vous êtes ici » dot)
  const map = (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 768; const c = cv.getContext('2d');
    c.fillStyle = '#f1eee6'; c.fillRect(0, 0, 512, 768); const rr = rng(31); c.strokeStyle = '#d8d0bf'; c.lineWidth = 16;
    for (let i = 0; i < 9; i++) { c.beginPath(); const y = rr() * 768; c.moveTo(0, y); c.lineTo(512, y + (rr() - 0.5) * 200); c.stroke(); }
    for (let i = 0; i < 7; i++) { c.beginPath(); const x = rr() * 512; c.moveTo(x, 0); c.lineTo(x + (rr() - 0.5) * 200, 768); c.stroke(); }
    c.fillStyle = '#9dc39a'; c.fillRect(300, 90, 140, 110); c.fillStyle = '#1c2a4a'; c.fillRect(0, 0, 512, 70); c.fillStyle = '#fff'; c.font = '700 34px Arial'; c.fillText('PLAN DU QUARTIER', 24, 47);
    c.fillStyle = '#e23b2e'; c.beginPath(); c.arc(250, 420, 16, 0, 7); c.fill(); c.font = '700 26px Arial'; c.fillStyle = '#222'; c.fillText('vous êtes ici', 274, 428);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const pan = add(new THREE.PlaneGeometry(1.0, 1.5), new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.55, roughness: 0.4 }), -Wd / 2 + 0.04, 1.25, -0.1, false); pan.rotation.y = Math.PI / 2;
  add(new THREE.BoxGeometry(0.08, 1.62, 1.12), steel, -Wd / 2 - 0.02, 1.25, -0.1);
  // the stop pole by the kerb: a round sign, the timetable box, the « next bus » display
  const P = new THREE.Group(); P.position.set(Wd / 2 + 0.6, 0, D / 2); g.add(P);
  const pm = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; P.add(m); return m; };
  pm(new THREE.CylinderGeometry(0.035, 0.04, 2.9, 12), steel, 0, 1.45, 0);
  const sign = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const c = cv.getContext('2d');
    c.fillStyle = '#1c2a4a'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.arc(128, 128, 112, 0, 7); c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '700 54px Arial'; c.fillText('BUS', 128, 118); c.font = '700 36px Arial'; c.fillText('DE NUIT', 128, 166);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (const s of [1, -1]) { const d = pm(new THREE.CircleGeometry(0.28, 40), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.5, emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.25 }), 0, 2.62, s * 0.012); if (s < 0) d.rotation.y = Math.PI; }
  pm(new THREE.BoxGeometry(0.34, 0.5, 0.06), steel, 0, 1.55, 0.06);
  const disp = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: ledTex(`BUS DE NUIT  ${wait}`, 1024, 128), emissiveIntensity: 1.2 });
  pm(new THREE.PlaneGeometry(0.62, 0.08), disp, 0, 2.05, 0.04);
  pm(new THREE.BoxGeometry(0.66, 0.12, 0.05), steel, 0, 2.05, 0.01);
  g.userData = { W: Wd, D, H: Hh, bench: V(-0.4, 0.48, -D / 2 + 0.25), pole: P.position.clone(), lamp, display: disp };
  return g;
}

// ---- a high-vis vest on an avatar: the torso's skin (vertices carried by the spine bones) copied as its own skinned mesh, pushed out
// along the normals by `off` metres, orange with two silver reflective bands. It deforms with the body (same skeleton, same bind).
export function makeVest(av, { off = 0.009, color = '#ff6a00' } = {}) {
  const B = av.bones, torso = new Set([B.Spine, B.Spine1, B.Spine2].filter(Boolean));
  av.root.updateMatrixWorld(true);
  const body = av.meshes.filter((m) => m.isSkinnedMesh).sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count)[0];
  const geo = body.geometry, P = geo.attributes.position, N = geo.attributes.normal, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const dom = (i) => { let bi = 0, bw = -1; for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (w > bw) { bw = w; bi = SI.getComponent(i, j); } } return body.skeleton.bones[bi]; };
  const idx = geo.index ? geo.index.array : [...Array(P.count).keys()];
  // world heights in the bind pose, for the bands; and the scale from geometry units to metres
  body.skeleton.update(); const v = V(0, 0, 0), ys = new Float32Array(P.count);
  for (let i = 0; i < P.count; i++) { body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld); ys[i] = v.y; }
  const sc = new THREE.Vector3().setFromMatrixScale(body.matrixWorld).x;
  const keep = [];
  let y0 = 1e9, y1 = -1e9;
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (torso.has(dom(a)) && torso.has(dom(b)) && torso.has(dom(c))) { keep.push(a, b, c); for (const q of [a, b, c]) { y0 = Math.min(y0, ys[q]); y1 = Math.max(y1, ys[q]); } } }
  const g2 = new THREE.BufferGeometry(); const pos = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { pos[i * 3] = P.getX(i) + N.getX(i) * off / sc; pos[i * 3 + 1] = P.getY(i) + N.getY(i) * off / sc; pos[i * 3 + 2] = P.getZ(i) + N.getZ(i) * off / sc; }
  g2.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g2.setAttribute('normal', N.clone()); g2.setAttribute('skinIndex', SI.clone()); g2.setAttribute('skinWeight', SW.clone());
  // two groups: orange, and the bands (triangles whose centre lies in two height ranges of the torso)
  const band = (y) => { const k = (y - y0) / Math.max(1e-6, y1 - y0); return (k > 0.22 && k < 0.31) || (k > 0.52 && k < 0.61); };
  const A = [], Bn = [];
  for (let t = 0; t < keep.length; t += 3) { const yc = (ys[keep[t]] + ys[keep[t + 1]] + ys[keep[t + 2]]) / 3; (band(yc) ? Bn : A).push(keep[t], keep[t + 1], keep[t + 2]); }
  g2.setIndex([...A, ...Bn]); g2.addGroup(0, A.length, 0); g2.addGroup(A.length, Bn.length, 1);
  const orange = new THREE.MeshStandardMaterial({ color, roughness: 0.75, emissive: color, emissiveIntensity: 0.08 });
  const silver = new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.35, metalness: 0.5, emissive: '#9aa0a6', emissiveIntensity: 0.25 });
  const vest = new THREE.SkinnedMesh(g2, [orange, silver]);
  vest.bind(body.skeleton, body.bindMatrix); vest.castShadow = true; vest.frustumCulled = false;
  body.parent.add(vest); vest.position.copy(body.position); vest.quaternion.copy(body.quaternion); vest.scale.copy(body.scale);
  return vest;
}
