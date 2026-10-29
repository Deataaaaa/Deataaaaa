// « 12 % » season 2: a hero saloon for close-ups (a VTC-sized four-door, ~4.7 m), built from parametric surfaces so every
// panel meets its neighbours: a skin "tube" round the plan outline (rounded top edge, shoulder bulge, tucked sill, wheel arches
// cut into its bottom edge), lids over the hood and the trunk, a greenhouse (windshield, roof, rear window, side glass between
// black pillars), a real cabin (floor, inner door panels with handles and lock pins, dashboard with lit screens, steering wheel,
// seats, rear-view mirror) and separate parts where the story needs them: the curb-side front window rolls down, the curb-side
// rear door opens on its hinges, the locks drop.
// Car frame: origin on the ground at the middle of the car, +z forward, +x the driver's side (left-hand drive), y up.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export const CAR = {
  AF: 2.36, AR: -2.36, B: 0.915,          // half-length front / rear, half-width
  RCF: 0.42, RCR: 0.36, RE: 0.06,         // plan corner radii, the rounded top edge
  COWL: 0.98, DECK: -1.72,                // windshield base, rear-window base
  WS: 0.16, RW: -1.12,                    // windshield top, rear-window top (at -0.22 the header was over the driver's head and the
                                          // rear-view mirror hung 4 cm in front of his eyes; now 0.33 m ahead of them, as in a saloon)
  AXF: 1.39, AXR: -1.40, RA: 0.395, WY: 0.335, TRACK: 1.58, RT: 0.335,
  SILL: 0.21,
  XB: 0.82,                               // greenhouse foot (the window sill line), half-width
  FW: [-0.235, 0.86],                     // front door window, z range
  BP: [-0.315, -0.235],                   // B-pillar
  RWZ: [-1.16, -0.315],                   // rear door window
  DOOR_R: [-1.0, -0.27],                  // rear door skin: rear edge (below the arch line) to the hinge line
};
const C = CAR;

// ---------- shape functions ----------
// height of the body's top over the plan (hood, the cabin's beltline at the sides, trunk deck)
export function topY(x, z) {
  const c = 1 - Math.min(1, (x / C.B) ** 2);
  if (z > C.COWL) { const t = (z - C.COWL) / (C.AF - C.COWL); return 0.985 - 0.16 * t - 0.04 * t * t + 0.028 * c * (1 - 0.3 * t); }
  if (z < C.DECK) { const t = (C.DECK - z) / (C.DECK - C.AR); return 1.015 - 0.035 * t * t + 0.02 * c; }
  return 0.985 + 0.03 * (C.COWL - z) / (C.COWL - C.DECK);
}
// the bottom edge of the skin: sills, bumpers, and the wheel arches cut into it
function botY(x, z) {
  const side = Math.abs(x) > C.B - 0.16;
  let y = z > C.AF - C.RCF ? 0.27 : z < C.AR + C.RCR ? 0.30 : C.SILL;
  if (side) for (const za of [C.AXF, C.AXR]) { const d = Math.abs(z - za); if (d < C.RA) y = Math.max(y, C.WY + Math.sqrt(C.RA * C.RA - d * d)); }
  return y;
}
// the plan outline: point and outward normal for a parameter s along one of four runs
function outlinePt(run, s) {
  const { AF, AR, B, RCF, RCR } = C;
  if (run === 'R') return { p: V(-B, 0, lerp(AR + RCR, AF - RCF, s)), n: V(-1, 0, 0) };
  if (run === 'L') return { p: V(B, 0, lerp(AF - RCF, AR + RCR, s)), n: V(1, 0, 0) };
  // front (right corner → face → left corner) and rear (left corner → face → right corner), by arc length
  const front = run === 'F', R0 = front ? RCF : RCR, zc = front ? AF - R0 : AR + R0, sgn = front ? 1 : -1;
  const arc = Math.PI / 2 * R0, flat = 2 * (B - R0), L = 2 * arc + flat, d = s * L;
  const x0 = front ? -1 : 1;                                           // start side
  if (d < arc) { const a = d / R0; const nx = x0 * Math.cos(a), nz = sgn * Math.sin(a); return { p: V(x0 * (B - R0) + nx * R0, 0, zc + nz * R0), n: V(nx, 0, nz) }; }
  if (d < arc + flat) { const u = (d - arc) / flat; return { p: V(lerp(x0 * (B - R0), -x0 * (B - R0), u), 0, front ? AF : AR), n: V(0, 0, sgn) }; }
  const a = Math.PI / 2 - (d - arc - flat) / R0; const nx = -x0 * Math.cos(a), nz = sgn * Math.sin(a);
  return { p: V(-x0 * (B - R0) + nx * R0, 0, zc + nz * R0), n: V(nx, 0, nz) };
}
// the skin's cross-section at an outline point: v 0..1 from the lid edge (inset RE) over the rounded edge and down the face
function skinPt(o, v, out = V(0, 0, 0)) {
  const { RE } = C, e = o.p.clone().addScaledVector(o.n, -RE), top = topY(e.x, e.z), bot = botY(o.p.x, o.p.z);
  const v1 = 0.16;
  let dn, y;
  if (v < v1) { const ph = v / v1 * Math.PI / 2; dn = -RE + RE * Math.sin(ph); y = top - RE * (1 - Math.cos(ph)); }
  else { const t = (v - v1) / (1 - v1); y = lerp(top - RE, bot, t); dn = 0.02 * Math.sin(Math.PI * Math.pow(t, 0.7)) - 0.05 * Math.pow(t, 3); }
  return out.copy(o.p).addScaledVector(o.n, dn).setY(y);
}
// greenhouse: the rail (top edge of the side glass) and the window-sill line, as functions of z
const ROOF = 1.445;                       // the roof rail's height (1.405 put seated heads through the headliner)
function rail(z) {
  const { COWL, WS, RW, DECK, XB } = C, yb = topY(C.B - C.RE, z) + 0.005;
  if (z > WS) { const t = (COWL - z) / (COWL - WS), e = 1 - (1 - t) * (1 - t) * 0.15; return { x: lerp(XB - 0.015, 0.665, Math.pow(t, 0.9)), y: lerp(yb, ROOF, t * e) }; }
  if (z > RW) { const t = (WS - z) / (WS - RW); return { x: 0.665, y: ROOF + 0.012 * Math.sin(Math.PI * t) }; }
  const t = (RW - z) / (RW - DECK); return { x: lerp(0.665, XB - 0.04, t), y: lerp(ROOF, yb + 0.01, Math.pow(t, 1.15)) };
}
const sill = (z) => ({ x: C.XB, y: topY(C.B - C.RE, z) + 0.005 });
// a point on the greenhouse side face (side ±1, v 0 at the sill .. 1 at the rail)
function sidePt(sd, z, v, out = V(0, 0, 0)) { const a = sill(z), b = rail(z); const bow = 0.012 * Math.sin(Math.PI * v); return out.set(sd * (lerp(a.x, b.x, v) + bow), lerp(a.y, b.y, v), z); }
// a point on the top face (u -1..1 from the right rail to the left rail)
function topPt(z, u, out = V(0, 0, 0)) { const r = rail(z), crown = (z > C.WS || z < C.RW ? 0.018 : 0.035) * (1 - u * u); return out.set(u * r.x, r.y + crown, z); }

// a grid surface: f(i/nu, j/nv) → point; normals computed; optional winding flip
function grid(nu, nv, f, flip = false) {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3), uv = new Float32Array((nu + 1) * (nv + 1) * 2), p = V(0, 0, 0);
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { f(i / nu, j / nv, p); const k = j * (nu + 1) + i; pos.set([p.x, p.y, p.z], k * 3); uv.set([i / nu, j / nv], k * 2); }
  const idx = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ---------- textures ----------
export const MIR_Y = 1.34, MIR_Z = 0.24;   // the rear-view mirror's centre in the car's frame (on the windshield, ahead of the driver)
export function plateTex(txt, dep = '75') {
  const cv = document.createElement('canvas'); cv.width = 1040; cv.height = 220; const c = cv.getContext('2d');
  c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, 1040, 220);
  c.fillStyle = '#1f3f9a'; c.fillRect(0, 0, 110, 220); c.fillRect(930, 0, 110, 220);
  c.fillStyle = '#ffd200'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.beginPath(); c.arc(55 + 30 * Math.cos(a), 70 + 30 * Math.sin(a), 5, 0, 7); c.fill(); }
  c.fillStyle = '#fff'; c.font = 'bold 64px "Arial Narrow", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('F', 55, 165);
  c.font = 'bold 60px "Arial Narrow", Arial, sans-serif'; c.fillText(dep, 985, 165);
  c.fillStyle = '#e8e8ee'; c.fillRect(950, 30, 70, 60);
  c.fillStyle = '#111'; c.font = 'bold 168px "Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif'; c.fillText(txt, 520, 116);
  c.strokeStyle = '#222'; c.lineWidth = 6; c.strokeRect(3, 3, 1034, 214);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// the VTC sticker (red, « VTC », two white boxes: the operator's register number and the car's plate)
export function vtcTex(plate) {
  const cv = document.createElement('canvas'); cv.width = 360; cv.height = 360; const c = cv.getContext('2d');
  c.fillStyle = '#c8102e'; c.fillRect(0, 0, 360, 360);
  c.fillStyle = '#fff'; c.font = 'bold 120px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('VTC', 180, 110);
  c.fillRect(30, 200, 300, 56); c.fillRect(30, 272, 300, 56);
  c.fillStyle = '#111'; c.font = 'bold 34px Arial, sans-serif'; c.fillText('EVTC075210' + '548', 180, 229); c.fillText(plate, 180, 301);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------- the car ----------
export function makeCar24({ paint = '#0c0d10', metal = 0.55, plate = 'HV-917-RB', vtc = false, mirrorReflect = false, seed = 1 } = {}) {
  const g = new THREE.Group();
  const paintM = new THREE.MeshPhysicalMaterial({ color: paint, metalness: metal, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 1.25 });
  // panel gaps on the skin (drawn, except the curb-side rear door which is a real separate panel)
  paintM.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCarP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCarP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vCarP;
float seamL(float d) { float w = fwidth(d) + 1e-5; return 1.0 - smoothstep(0.0012, 0.0012 + w, abs(d)); }`).replace('#include <color_fragment>', `#include <color_fragment>
{ float s = 0.0; vec3 q = vCarP;
  if (abs(q.x) > 0.80 && q.y > 0.2 && q.y < 0.99) {
    s = max(s, seamL(q.z - (0.98 - 0.12 * smoothstep(0.75, 0.99, q.y))) * step(q.y, 0.99));     // front door, leading edge
    s = max(s, seamL(q.z + 0.27));                                                             // between the doors
    float re = q.y < 0.72 ? q.z + 1.0 : q.z + 1.0 + (q.y - 0.72) / 0.26 * 0.32;                // rear door, trailing edge
    s = max(s, seamL(re) * step(0.0, q.x * 0.0 + 1.0));
  }
  if (q.z > 1.02 && q.z < 2.15 && q.y > 0.7) s = max(s, seamL(abs(q.x) - 0.74) * step(0.93, 1.0));  // hood shut lines
  diffuseColor.rgb *= 1.0 - 0.85 * s; }`);
  };
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#080a0e', metalness: 0.15, roughness: 0.03, transparent: true, opacity: 0.62, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.6, side: THREE.DoubleSide, depthWrite: false });
  const blackM = new THREE.MeshPhysicalMaterial({ color: '#08090a', roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
  const trimM = new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.75 });
  const chromeM = new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 1, roughness: 0.3, envMapIntensity: 0.55 });
  const add = (geo, mat, parent = g) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  // skin tube: right side split round the curb-side rear door, the front and rear wraps, the left side in one piece
  const NV = 26;
  const runSkin = (run, s0, s1, nu) => grid(nu, NV, (a, v, p) => skinPt(outlinePt(run, lerp(s0, s1, a)), v, p), true);
  const zToS = (z) => (z - (C.AR + C.RCR)) / ((C.AF - C.RCF) - (C.AR + C.RCR));
  add(runSkin('F', 0, 1, 64), paintM); add(runSkin('L', 0, 1, 120), paintM); add(runSkin('B', 0, 1, 64), paintM);
  // the rear door's trailing edge: vertical below 0.72 m, then leaning back to z -1.32 at the beltline (rows by height)
  const rowY = (v) => skinPt(outlinePt('R', zToS(-0.6)), v, V(0, 0, 0)).y;
  const trail = (v) => { const y = rowY(v); return y < 0.72 ? C.DOOR_R[0] : C.DOOR_R[0] - (y - 0.72) / 0.26 * 0.32; };
  add(grid(40, NV, (a, v, p) => skinPt(outlinePt('R', lerp(0, zToS(trail(v) - 0.004), a)), v, p), true), paintM);
  add(runSkin('R', zToS(C.DOOR_R[1] + 0.004), 1, 70), paintM);
  // the rear door: its skin, between its trailing edge (vertical below 0.72, then leaning back to the beltline) and the hinge line
  const door = new THREE.Group(); door.position.set(-C.B, 0, C.DOOR_R[1]); g.add(door);
  const doorSkin = grid(30, NV, (a, v, p) => { skinPt(outlinePt('R', zToS(lerp(trail(v) + 0.003, C.DOOR_R[1] - 0.003, a))), v, p); p.x += C.B; p.z -= C.DOOR_R[1]; }, true);
  add(doorSkin, paintM, door);
  // inner panel of the rear door (its trim, an armrest, the handle, the lock pin)
  const cabM = new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.78 });
  const cabL = new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.55 });
  const doorIn = add(new RoundedBoxGeometry(0.05, 0.62, 0.66, 3, 0.02), cabM, door); doorIn.position.set(0.105, 0.66, -0.365);
  const arm = add(new RoundedBoxGeometry(0.09, 0.05, 0.36, 3, 0.02), cabL, door); arm.position.set(0.16, 0.66, -0.39);
  // the inner handle: a lever 3 cm off the panel on a bezel, pivoting about its front end (setHandleIn pulls its rear end in)
  const hPiv = new THREE.Group(); hPiv.position.set(0.185, 0.80, -0.275); door.add(hPiv);
  const handleIn = add(new RoundedBoxGeometry(0.025, 0.035, 0.14, 2, 0.008), new THREE.MeshStandardMaterial({ color: '#b9bcc2', metalness: 1, roughness: 0.45, envMapIntensity: 0.35 }), hPiv);   // satin: chrome blew out in the close-up handleIn.position.set(0, 0, -0.07);
  add(new RoundedBoxGeometry(0.045, 0.02, 0.012, 2, 0.004), cabL, door).position.set(0.152, 0.80, -0.283);   // the pivot bracket (the lever's rear end is free)
  const pinR = add(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 10), chromeM, door); pinR.position.set(0.12, 0.985, -0.62);
  // outer handles: a pull bar on two posts, 3.2 cm off a dark recess (fingers go behind it: a flush bar left them nowhere but the skin)
  const handleOut = (parent, x, z, sd) => { const r = add(new RoundedBoxGeometry(0.012, 0.035, 0.15, 2, 0.006), blackM, parent); r.position.set(x, 0.885, z);
    const b = add(new RoundedBoxGeometry(0.016, 0.026, 0.13, 2, 0.007), paintM, parent); b.position.set(x + sd * 0.046, 0.885, z);
    for (const dz of [-0.055, 0.055]) add(new RoundedBoxGeometry(0.032, 0.016, 0.012, 2, 0.004), paintM, parent).position.set(x + sd * 0.022, 0.885, z + dz); return b; };
  handleOut(door, -0.012, -0.66, -1);
  for (const [sd, z] of [[-1, 0.12], [1, 0.12], [1, -0.92]]) { const x = sd * (C.B + 0.012); handleOut(g, x, z, sd); }

  // lids: hood and trunk deck over the inset outline (extended 3 mm under the rounded edge)
  const inset = C.RE - 0.003;
  const lidF = grid(48, 40, (a, b, p) => {
    const x = lerp(-(C.B - inset), C.B - inset, a), ax = Math.abs(x), R0 = C.RCF - inset;
    const zEdge = ax < C.B - C.RCF ? C.AF - inset : (C.AF - C.RCF) + Math.sqrt(Math.max(0, R0 * R0 - (ax - (C.B - C.RCF)) ** 2));
    const z = lerp(C.COWL - 0.02, zEdge, b); p.set(x, topY(x, z), z);
  }, true);
  add(lidF, paintM);
  const lidR = grid(48, 30, (a, b, p) => {
    const x = lerp(-(C.B - inset), C.B - inset, a), ax = Math.abs(x), R0 = C.RCR - inset;
    const zEdge = ax < C.B - C.RCR ? C.AR + inset : (C.AR + C.RCR) - Math.sqrt(Math.max(0, R0 * R0 - (ax - (C.B - C.RCR)) ** 2));
    const z = lerp(C.DECK + 0.02, zEdge, b); p.set(x, topY(x, z), z);
  });
  add(lidR, paintM);
  // cabin sill tops (the door tops between the skin's edge and the window seal), both sides
  for (const sd of [-1, 1]) add(grid(80, 3, (a, b, p) => { const z = lerp(C.COWL, C.DECK, a); p.set(sd * lerp(C.B - C.RE + 0.002, C.XB - 0.01, b), topY(C.B - C.RE, z) + 0.001 * b, z); }, sd < 0), trimM);

  // greenhouse: the top face (windshield, roof, rear window) and the side faces between the pillars
  const NZ = 70;
  const topRange = (z0, z1, u0, u1, nu, nz, flip) => grid(nu, nz, (a, b, p) => topPt(lerp(z0, z1, b), lerp(u0, u1, a), p), flip);
  const ws = add(topRange(C.COWL - 0.01, C.WS, -0.93, 0.93, 40, 30, false), glassM); ws.renderOrder = 2; ws.castShadow = false;
  add(topRange(C.WS, C.RW, -1, 1, 40, 24, false), paintM);
  const rw = add(topRange(C.RW, C.DECK + 0.01, -0.93, 0.93, 40, 24, false), glassM); rw.renderOrder = 2; rw.castShadow = false;
  // black frit borders and the A/C pillar strips
  for (const [z0, z1] of [[C.COWL - 0.01, C.WS], [C.RW, C.DECK + 0.01]]) {
    for (const s of [-1, 1]) add(topRange(z0, z1, s * 0.93, s * 1.0, 3, 30, s < 0), paintM);
    add(topRange(z0, lerp(z0, z1, 0.07), -0.93, 0.93, 40, 3, false), blackM);
    add(topRange(lerp(z0, z1, 0.93), z1, -0.93, 0.93, 40, 3, false), blackM);
  }
  const sideRange = (sd, z0, z1, v0, v1, mat, parent = g, dx = 0) => { const m = add(grid(Math.max(3, Math.round(Math.abs(z1 - z0) * 60)), Math.max(2, Math.round((v1 - v0) * 20)),
    (a, b, p) => { sidePt(sd, lerp(z0, z1, a), lerp(v0, v1, b), p); p.x += dx; }, sd > 0 ? (z1 > z0) : (z1 < z0)), mat, parent); return m; };
  const windows = {};
  for (const sd of [-1, 1]) {
    sideRange(sd, C.COWL, C.FW[1], 0, 1, blackM);                                   // the mirror sail
    sideRange(sd, C.FW[1], C.FW[0], 0, 0.06, blackM); sideRange(sd, C.FW[1], C.FW[0], 0.92, 1, blackM);
    sideRange(sd, C.BP[1], C.BP[0], 0, 1, blackM);                                    // B-pillar
    sideRange(sd, C.RWZ[0], C.DECK, 0, 1, paintM);                                    // C-pillar
    // the windows themselves: separate glass panes (the curb-side front one rolls down; the curb-side rear one rides the door)
    const fw = new THREE.Group(); g.add(fw);
    const plane = new THREE.Plane(V(0, -1, 0), 10), gm = glassM.clone(); gm.clippingPlanes = [plane];
    const fwm = sideRange(sd, C.FW[1] - 0.01, C.FW[0] + 0.005, 0.05, 0.925, gm, fw, -sd * 0.004); fwm.renderOrder = 2; fwm.castShadow = false;
    const edge = add(new THREE.BoxGeometry(0.004, 0.006, 1), new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: 0.2, roughness: 0.15, transparent: true, opacity: 0.8 }), fw); edge.visible = false;
    windows[sd < 0 ? 'RF' : 'LF'] = { g: fw, sd, plane, edge };
    if (sd > 0) { sideRange(sd, C.RWZ[1], C.RWZ[0], 0, 0.06, blackM); sideRange(sd, C.RWZ[1], C.RWZ[0], 0.92, 1, blackM); const rm = sideRange(sd, C.RWZ[1], C.RWZ[0], 0.05, 0.925, glassM); rm.renderOrder = 2; rm.castShadow = false; }
  }
  // the curb-side rear door's window and frame, in the door's frame
  const toDoor = (m) => { m.geometry.translate(C.B, 0, -C.DOOR_R[1]); door.add(m); };
  toDoor(sideRange(-1, C.RWZ[1], C.RWZ[0], 0, 0.06, blackM)); toDoor(sideRange(-1, C.RWZ[1], C.RWZ[0], 0.92, 1, blackM));
  { const m = sideRange(-1, C.RWZ[1], C.RWZ[0], 0.05, 0.925, glassM); m.renderOrder = 2; m.castShadow = false; toDoor(m); }

  // headliner (under the roof and the pillars' tops) and inner pillars
  const fabric = new THREE.MeshStandardMaterial({ color: '#3a3936', roughness: 0.95, side: THREE.DoubleSide });
  add(grid(40, 40, (a, b, p) => { topPt(lerp(C.WS + 0.05, C.RW - 0.05, b), lerp(-0.97, 0.97, a), p); p.y -= 0.03; }), fabric);
  for (const sd of [-1, 1]) for (const [z0, z1] of [[C.BP[1], C.BP[0]], [C.RWZ[0], C.DECK + 0.08]]) sideRange(sd, z0, z1, 0, 1, fabric, g, -sd * 0.03);

  // cabin: floor, firewall, inner door panels (fixed ones), dashboard, console, seats, wheel, mirror
  const carpet = new THREE.MeshStandardMaterial({ color: '#131416', roughness: 0.95 });
  add(new THREE.BoxGeometry(1.24, 0.04, 2.25), carpet).position.set(0, 0.29, -0.5);
  for (const sd of [-1, 1]) add(new THREE.BoxGeometry(0.21, 0.04, 1.9), carpet).position.set(sd * 0.725, 0.29, -0.03);
  add(new THREE.BoxGeometry(1.24, 0.12, 4.4), trimM).position.set(0, 0.22, 0);        // underbody between the tyres
  for (const [sd, z0, z1] of [[1, 0.8, -0.27], [1, -0.32, -1.25], [-1, 0.8, -0.27]]) {
    const p = add(new RoundedBoxGeometry(0.05, 0.62, z0 - z1, 3, 0.02), cabM); p.position.set(sd * 0.81, 0.66, (z0 + z1) / 2);
    const a2 = add(new RoundedBoxGeometry(0.09, 0.05, (z0 - z1) * 0.55, 3, 0.02), cabL); a2.position.set(sd * 0.755, 0.66, (z0 + z1) / 2 - 0.05);
    const h2 = add(new RoundedBoxGeometry(0.025, 0.035, 0.11, 2, 0.008), chromeM); h2.position.set(sd * 0.775, 0.82, z0 - 0.25);
    add(new RoundedBoxGeometry(0.07, 0.03, z0 - z1, 2, 0.012), cabL).position.set(sd * 0.795, 0.978, (z0 + z1) / 2);           // the sill trim along its top
    if (z0 > 0) { const spk = add(new THREE.CylinderGeometry(0.068, 0.068, 0.014, 28), new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.95 })); spk.rotation.z = Math.PI / 2; spk.position.set(sd * 0.781, 0.48, z0 - 0.16); }
  }
  const pins = [pinR];
  for (const [sd, z] of [[1, 0.35], [1, -0.6], [-1, 0.35]]) { const pn = add(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 10), chromeM); pn.position.set(sd * 0.795, 0.985, z); pins.push(pn); }
  // dashboard: one surface lofted across the cabin from a profile (the windshield base, a deep flat top, the lip, the face, the knee
  // pad), pushed forward in front of the driver (knee room) and back in the middle (the centre stack, which runs down into the console)
  const dashM = new THREE.MeshStandardMaterial({ color: '#17181b', roughness: 0.72, side: THREE.DoubleSide });
  const satinM = new THREE.MeshStandardMaterial({ color: '#7d8188', metalness: 0.85, roughness: 0.38, envMapIntensity: 0.8 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: '#050506', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  const DPROF = [[C.COWL + 0.004, 0.983], [0.82, 0.993], [0.62, 0.999], [0.47, 0.996], [0.425, 0.978], [0.408, 0.935], [0.402, 0.85], [0.405, 0.76], [0.425, 0.68], [0.49, 0.585], [0.6, 0.5], [0.7, 0.45]];
  const dCurve = new THREE.CatmullRomCurve3(DPROF.map(([z, y]) => V(0, y, z)), false, 'centripetal');
  const wDrv = (x) => sm(0.1, 0.2, x) * (1 - sm(0.56, 0.66, x)), wMid = (x) => 1 - sm(0.11, 0.17, Math.abs(x));
  const dashPt = (x, v, out = V(0, 0, 0)) => {
    const p = dCurve.getPoint(v); let z = p.z, y = p.y;
    const knee = sm(0.62, 0.8, v), stack = sm(0.5, 0.6, v), wm = wMid(x);
    z += 0.06 * wDrv(x) * knee;                                                       // the driver's knees
    if (wm > 0) { const zs = v < 0.85 ? z - 0.06 * stack : lerp(z - 0.06, 0.345, sm(0.85, 1, v)), ys = v < 0.85 ? y : lerp(y, 0.47, sm(0.85, 1, v)); z = lerp(z, zs, wm); y = lerp(y, ys, wm); }
    z += 0.006 * (1 - Math.cos(Math.PI * x / 0.8)) * (1 - knee);                      // a slight wrap toward the doors
    return out.set(x, y, z);
  };
  add(grid(128, 56, (a, v, p) => dashPt(lerp(-0.795, 0.795, a), v, p)), dashM);
  // the face's depth at a height (the knees' check): sampled down the profile from the lip
  const dashZ = (x, y) => { let prev = dashPt(x, 0.45); for (let i = 1; i <= 60; i++) { const q = dashPt(x, 0.45 + 0.55 * i / 60); if (q.y <= y) { const t = (prev.y - y) / Math.max(1e-6, prev.y - q.y); return lerp(prev.z, q.z, t); } prev = q; } return prev.z; };
  // the dash screens in night mode (a plain light-blue emissive panel blew out to a white square): a dark cluster, a dark map
  const scrTex = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const clusterTex = scrTex(512, 170, (c, w, h) => { c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h); c.lineWidth = 10;
    for (const cx of [110, 402]) { c.strokeStyle = '#1b2633'; c.beginPath(); c.arc(cx, 112, 72, Math.PI * 0.8, Math.PI * 2.2); c.stroke(); }
    c.strokeStyle = '#3f7fe0'; c.beginPath(); c.arc(110, 112, 72, Math.PI * 0.8, Math.PI * 1.25); c.stroke();
    c.textAlign = 'center'; c.fillStyle = '#c9d3e2'; c.font = '600 52px Arial, sans-serif'; c.fillText('32', 110, 128); c.fillText('D', 256, 112);
    c.fillStyle = '#6f7d90'; c.font = '22px Arial, sans-serif'; c.fillText('km/h', 110, 160); c.fillText('02:17', 256, 150); });
  const navTex = scrTex(480, 300, (c, w, h) => { c.fillStyle = '#090c11'; c.fillRect(0, 0, w, h); c.lineCap = 'round'; c.strokeStyle = '#1c222b';
    for (const [x0, y0, x1, y1, lw] of [[-20, 60, 500, 130, 14], [-20, 230, 500, 170, 9], [90, -20, 150, 320, 9], [330, -20, 280, 320, 14], [-20, 300, 260, -20, 6], [200, 320, 500, 40, 6]]) { c.lineWidth = lw; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    c.strokeStyle = '#2e74e8'; c.lineWidth = 9; c.beginPath(); c.moveTo(240, 262); c.lineTo(232, 150); c.lineTo(120, 98); c.lineTo(30, 44); c.stroke();
    c.fillStyle = '#e8ecf2'; c.beginPath(); c.moveTo(240, 226); c.lineTo(226, 258); c.lineTo(254, 258); c.closePath(); c.fill();
    c.fillStyle = '#10141a'; c.fillRect(0, 0, w, 40); c.fillStyle = '#8fa0b6'; c.font = '20px Arial, sans-serif'; c.fillText('1,2 km', 14, 27); });
  const screenM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: clusterTex, emissiveIntensity: 0.55, roughness: 0.8 });
  // the instruments under a hood in front of the driver; the map on a screen standing on the dash top
  add(new RoundedBoxGeometry(0.42, 0.06, 0.17, 4, 0.026), dashM).position.set(0.37, 1.012, 0.475);
  const cluster = add(new THREE.PlaneGeometry(0.30, 0.10), screenM); cluster.position.set(0.37, 0.932, dashZ(0.37, 0.932) - 0.004); cluster.lookAt(cluster.position.clone().add(V(0, 0.3, -0.95)));
  const scr = new THREE.Group(); scr.position.set(0, 1.07, 0.49); scr.lookAt(V(0, 1.07 + 0.2, 0.49 - 0.98)); g.add(scr);
  add(new RoundedBoxGeometry(0.31, 0.185, 0.014, 3, 0.006), gloss, scr);
  const center = add(new THREE.PlaneGeometry(0.29, 0.165), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: navTex, emissiveIntensity: 0.5, roughness: 0.8 }), scr); center.position.z = 0.0075;
  add(new RoundedBoxGeometry(0.09, 0.07, 0.04, 2, 0.012), dashM).position.set(0, 1.0, 0.505);
  // air vents (a dark louvred box, satin vanes), the climate strip, a satin trim line, the glovebox's shut line
  const ventM = new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.6 });
  const vent = (x, y, w, h, dz = 0.012) => { const z = dashZ(x, y) - dz; add(new RoundedBoxGeometry(w, h, 0.03, 2, 0.008), ventM).position.set(x, y, z);
    for (let k = 1; k < 4; k++) add(new THREE.BoxGeometry(w - 0.014, 0.004, 0.012), satinM).position.set(x, y - h / 2 + k * h / 4, z - 0.016); };
  vent(0.068, 0.885, 0.105, 0.042); vent(-0.068, 0.885, 0.105, 0.042); vent(0.665, 0.9, 0.1, 0.05); vent(-0.665, 0.9, 0.1, 0.05);
  const climTex = scrTex(512, 104, (c, w, h) => { c.fillStyle = '#040506'; c.fillRect(0, 0, w, h); c.fillStyle = '#9fb6d8'; c.font = '600 44px Arial, sans-serif'; c.textAlign = 'center'; c.fillText('21,5', 70, 68); c.fillText('21,5', 442, 68);
    c.fillStyle = '#4c5a6e'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(170 + i * 43, 52, 9, 0, 7); c.fill(); } });
  const clim = add(new THREE.PlaneGeometry(0.22, 0.045), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: climTex, emissiveIntensity: 0.4, roughness: 0.6 }));
  clim.position.set(0, 0.795, dashZ(0, 0.795) - 0.003); clim.rotation.y = Math.PI;
  add(new THREE.BoxGeometry(0.46, 0.012, 0.006), satinM).position.set(-0.4, 0.842, dashZ(-0.4, 0.842) - 0.003);
  const groove = new THREE.MeshStandardMaterial({ color: '#08080a', roughness: 0.9 });
  for (const [x, y, w, h] of [[-0.42, 0.775, 0.4, 0.004], [-0.42, 0.635, 0.4, 0.004], [-0.62, 0.705, 0.004, 0.14], [-0.22, 0.705, 0.004, 0.14]]) add(new THREE.BoxGeometry(w, h, 0.004), groove).position.set(x, y, dashZ(x, y) - 0.0015);
  // steering wheel: its top leans toward the windshield, its face toward the driver's chest (the column runs forward and down into the dash)
  const wheel = new THREE.Group(); wheel.position.set(0.37, 0.96, 0.18); wheel.rotation.x = 0.4; g.add(wheel);   // the rim's bottom 3 cm over the thighs
  const leather = new THREE.MeshStandardMaterial({ color: '#131313', roughness: 0.6 });
  add(new THREE.TorusGeometry(0.185, 0.017, 16, 72), leather, wheel);
  for (const sx of [-1, 1]) { add(new RoundedBoxGeometry(0.12, 0.042, 0.024, 3, 0.01), leather, wheel).position.set(sx * 0.108, -0.01, 0.012);
    add(new RoundedBoxGeometry(0.05, 0.03, 0.008, 2, 0.004), gloss, wheel).position.set(sx * 0.1, -0.006, -0.002); }
  add(new RoundedBoxGeometry(0.045, 0.11, 0.024, 3, 0.01), leather, wheel).position.set(0, -0.125, 0.012);
  add(new RoundedBoxGeometry(0.15, 0.115, 0.05, 4, 0.022), leather, wheel).position.set(0, -0.004, -0.008);
  const shroud = add(new THREE.CylinderGeometry(0.05, 0.065, 0.27, 18), dashM, wheel); shroud.rotation.x = Math.PI / 2; shroud.position.z = 0.16; shroud.scale.set(1.25, 1, 0.85);
  for (const sx of [-1, 1]) { const st2 = add(new THREE.CylinderGeometry(0.006, 0.005, 0.11, 8), dashM, wheel); st2.rotation.z = Math.PI / 2 - sx * 0.12; st2.position.set(sx * 0.1, 0.012, 0.055); }
  // console between the front seats (its body is the 'console' check box): a gloss panel round the selector, cup holders, the armrest lid
  const con = add(new RoundedBoxGeometry(0.2, 0.3, 0.75, 3, 0.03), dashM); con.position.set(0, 0.45, -0.02);
  add(new RoundedBoxGeometry(0.19, 0.01, 0.2, 2, 0.004), gloss).position.set(0, 0.602, 0.235);
  add(new RoundedBoxGeometry(0.035, 0.05, 0.06, 3, 0.012), leather).position.set(0, 0.63, 0.25);
  for (const cx of [-0.045, 0.045]) add(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 24), new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.9 })).position.set(cx, 0.594, 0.08);
  // seats: front pair and the rear bench; the main volumes are also the bodies' check boxes, the bolsters too (a thigh or an arm in them shows)
  const pleat = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); c.fillStyle = '#808080'; c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) { const gr = c.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, '#3a3a3a'); gr.addColorStop(0.12, '#9a9a9a'); gr.addColorStop(0.5, '#8a8a8a'); gr.addColorStop(0.88, '#9a9a9a'); gr.addColorStop(1, '#3a3a3a'); c.fillStyle = gr; c.fillRect(0, y, 256, 32); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const seatM = new THREE.MeshPhysicalMaterial({ color: '#1e1f22', roughness: 0.55, sheen: 0.35, sheenRoughness: 0.6, sheenColor: '#5a5a5a', bumpMap: pleat, bumpScale: 1.5 });
  const sideM = new THREE.MeshPhysicalMaterial({ color: '#1b1c1f', roughness: 0.5, sheen: 0.3, sheenRoughness: 0.6, sheenColor: '#555' });
  const boxes = [];
  const box = (w, h, d, x, y, z, rx = 0, nm = 'seat', mat = seatM, parent = g) => { const m = add(new RoundedBoxGeometry(w, h, d, 4, Math.min(0.045, h / 2.2, d / 2.2)), mat, parent); m.position.set(x, y, z); m.rotation.x = rx; boxes.push({ nm, m, w, h, d }); return m; };
  for (const sx of [0.37, -0.37]) {
    box(0.5, 0.13, 0.5, sx, 0.40, -0.08, 0, 'cushion');
    for (const s of [-1, 1]) box(0.06, 0.07, 0.46, sx + s * 0.22, 0.462, -0.09, 0, 'cushion bolster', sideM);
    const back = box(0.5, 0.66, 0.13, sx, 0.77, -0.36, -0.36, 'backrest');
    for (const s of [-1, 1]) box(0.055, 0.54, 0.1, s * 0.22, -0.03, 0.032, 0, 'back bolster', sideM, back);
    box(0.26, 0.2, 0.1, sx, 1.17, -0.5, -0.2, 'headrest');
  }
  box(1.36, 0.14, 0.52, 0, 0.41, -0.98, 0, 'bench');
  const bb = box(1.36, 0.6, 0.14, 0, 0.77, -1.3, -0.42, 'bench back');
  for (const sx of [-0.45, 0.45]) box(0.24, 0.16, 0.09, sx, 1.05, -1.4, -0.42, 'headrest');
  for (const sx of [-0.235, 0.235]) { add(new THREE.BoxGeometry(0.006, 0.004, 0.5), groove).position.set(sx, 0.481, -0.98); add(new THREE.BoxGeometry(0.006, 0.56, 0.004), groove, bb).position.set(sx, 0, 0.071); }
  // sun visors folded up against the headliner
  for (const sx of [-0.37, 0.37]) add(new RoundedBoxGeometry(0.34, 0.016, 0.16, 2, 0.006), fabric).position.set(sx, 1.423, 0.06);
  // rear-view mirror (a real mirror when asked: a small Reflector)
  const mir = new THREE.Group(); mir.position.set(0, MIR_Y, MIR_Z); g.add(mir);
  add(new RoundedBoxGeometry(0.27, 0.08, 0.025, 3, 0.01), blackM, mir).position.z = 0.004;   // the housing's face 1 cm behind the glass (closer, it showed in the mirror)
  const stem = add(new THREE.CylinderGeometry(0.009, 0.009, 0.075, 8), blackM, mir); stem.position.set(0, 0.045, 0.022); stem.rotation.x = 0.5;
  let mirror = null;
  if (mirrorReflect) { mirror = new Reflector(new THREE.PlaneGeometry(0.245, 0.06), { textureWidth: 768, textureHeight: 192, color: 0x8a8a8a, clipBias: 0.003, multisample: 0 }); mirror.position.z = -0.019; mirror.rotation.y = Math.PI; mir.add(mirror); }
  else { const mm = add(new THREE.PlaneGeometry(0.245, 0.06), new THREE.MeshStandardMaterial({ color: '#7a7f86', metalness: 1, roughness: 0.05 }), mir); mm.position.z = -0.019; mm.rotation.y = Math.PI; }
  // side mirrors
  for (const sd of [-1, 1]) {
    const m = new THREE.Group(); m.position.set(sd * 0.97, 1.03, C.FW[1] + 0.03); g.add(m);
    const sh = add(new RoundedBoxGeometry(0.13, 0.11, 0.2, 4, 0.04), paintM, m); sh.position.set(sd * 0.04, 0.02, 0);
    const st = add(new RoundedBoxGeometry(0.08, 0.04, 0.09, 2, 0.015), blackM, m); st.position.set(-sd * 0.03, -0.02, 0.02);
    const gl = add(new THREE.PlaneGeometry(0.12, 0.085), new THREE.MeshStandardMaterial({ color: '#5a6068', metalness: 1, roughness: 0.06 }), m); gl.position.set(sd * 0.045, 0.02, -0.101); gl.rotation.y = Math.PI;
  }
  // wheels: lathe tyres, five-spoke rims, discs
  const tyreM = new THREE.MeshStandardMaterial({ color: '#121212', roughness: 0.88 });
  const rimM = new THREE.MeshStandardMaterial({ color: '#8d9298', metalness: 0.9, roughness: 0.32 });
  const prof = []; const R = C.RT, Wt = 0.235, rr = 0.245;
  for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + Math.PI * i / 16; prof.push(new THREE.Vector2(rr + (R - rr) * Math.pow(Math.max(0, Math.cos(a)), 0.35), Wt / 2 * Math.sin(a))); }
  const tyreG = new THREE.LatheGeometry(prof, 48); tyreG.rotateZ(Math.PI / 2);
  const rimShape = new THREE.Shape(); rimShape.absarc(0, 0, rr - 0.005, 0, Math.PI * 2, false);
  for (let k = 0; k < 5; k++) { const a0 = k / 5 * Math.PI * 2 + 0.25, a1 = a0 + Math.PI * 2 / 5 - 0.5, h = new THREE.Path();
    h.absarc(0, 0, rr - 0.035, a0, a1, false); h.absarc(0, 0, 0.085, a1 - 0.08, a0 + 0.08, true); h.closePath(); rimShape.holes.push(h); }
  const rimG = new THREE.ExtrudeGeometry(rimShape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 24 }); rimG.rotateY(Math.PI / 2);
  const wheels = [];
  for (const za of [C.AXF, C.AXR]) for (const sd of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sd * C.TRACK / 2, C.WY, za); g.add(w);
    add(tyreG, tyreM, w);
    const rim = add(rimG, rimM, w); rim.position.x = sd * 0.075; if (sd < 0) rim.rotation.y = Math.PI;
    const barrel = add(new THREE.CylinderGeometry(rr, rr, 0.2, 32, 1, true), rimM, w); barrel.rotation.z = Math.PI / 2;
    const disc = add(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 32), new THREE.MeshStandardMaterial({ color: '#4a4c50', metalness: 0.8, roughness: 0.45 }), w); disc.rotation.z = Math.PI / 2; disc.position.x = sd * 0.02;
    const cal = add(new THREE.BoxGeometry(0.05, 0.1, 0.07), new THREE.MeshStandardMaterial({ color: '#202124', roughness: 0.6 }), w); cal.position.set(sd * 0.035, 0.1, -0.11);
    wheels.push(w);
    // wheel-well liner
    const ww = add(new THREE.CylinderGeometry(C.RA - 0.004, C.RA - 0.004, 0.31, 32, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#070707', roughness: 1, side: THREE.DoubleSide }));
    ww.rotation.z = Math.PI / 2; ww.position.set(sd * (C.B - 0.15), C.WY, za);
  }
  // lights, grille and plates sit on the skin: found by height on the front / rear runs, oriented to the skin's normal
  const onSkin = (run, s, y) => {
    const o = outlinePt(run, s); let lo = 0.16, hi = 1;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (skinPt(o, m).y > y) lo = m; else hi = m; }
    const v = (lo + hi) / 2, p = skinPt(o, v), pu = skinPt(outlinePt(run, Math.min(1, s + 0.002)), v), pv = skinPt(o, Math.min(1, v + 0.004));
    const n = pu.clone().sub(p).cross(pv.clone().sub(p)).normalize(); if (n.dot(o.n) < 0) n.negate(); return { p, n };
  };
  const place = (m, at, out = 0) => { m.position.copy(at.p).addScaledVector(at.n, out); m.lookAt(at.p.clone().add(at.n)); return m; };
  const headM = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#f4f6ff', emissiveIntensity: 0 });
  const tailM = new THREE.MeshStandardMaterial({ color: '#2a0505', emissive: '#ff1a12', emissiveIntensity: 0 });
  const blinkM = new THREE.MeshStandardMaterial({ color: '#2a1a05', emissive: '#ffa21a', emissiveIntensity: 0 });
  const lensM = new THREE.MeshPhysicalMaterial({ color: '#0b0d10', roughness: 0.05, clearcoat: 1 });
  for (const [sF, sR] of [[0.23, 0.768], [0.77, 0.232]]) {
    place(add(new RoundedBoxGeometry(0.30, 0.03, 0.02, 2, 0.008), headM), onSkin('F', sF, 0.735), 0.004);     // the LED strip
    place(add(new RoundedBoxGeometry(0.27, 0.07, 0.03, 2, 0.012), lensM), onSkin('F', sF, 0.69), 0.0);         // the projector lens
    place(add(new RoundedBoxGeometry(0.07, 0.03, 0.02, 2, 0.008), blinkM), onSkin('F', sF > 0.5 ? sF + 0.06 : sF - 0.06, 0.70), 0.004);
    place(add(new RoundedBoxGeometry(0.34, 0.055, 0.025, 2, 0.01), tailM), onSkin('B', sR, 0.9), 0.004);
  }
  place(add(new RoundedBoxGeometry(0.75, 0.025, 0.02, 2, 0.008), tailM), onSkin('B', 0.5, 0.925), 0.003);
  place(add(new RoundedBoxGeometry(0.92, 0.2, 0.03, 2, 0.02), new THREE.MeshStandardMaterial({ color: '#060606', roughness: 0.6 })), onSkin('F', 0.5, 0.5), -0.004);
  const plTex = plateTex(plate);
  const plM = new THREE.MeshStandardMaterial({ map: plTex, roughness: 0.4 });
  const plateF = add(new THREE.PlaneGeometry(0.52, 0.11), plM); place(plateF, onSkin('F', 0.5, 0.40), 0.026);   // 1.2 cm off the skin, the bumper's curve hid the top of the letters
  place(add(new THREE.PlaneGeometry(0.52, 0.11), plM), onSkin('B', 0.5, 0.64), 0.008);
  // the VTC stickers (front: lower corner on the driver's side; rear: lower corner on the other side)
  if (vtc) {
    const vm = new THREE.MeshStandardMaterial({ map: vtcTex(plate), roughness: 0.6, side: THREE.DoubleSide });
    const sf = add(new THREE.PlaneGeometry(0.075, 0.075), vm); const pF = topPt(C.COWL - 0.07, 0.78); sf.position.copy(pF).add(V(0, -0.002, 0)); sf.lookAt(pF.clone().add(V(0, 0.9, 0.45)));
    const sr = add(new THREE.PlaneGeometry(0.075, 0.075), vm); const pR = topPt(C.DECK + 0.07, -0.78); sr.position.copy(pR).add(V(0, -0.002, 0)); sr.lookAt(pR.clone().add(V(0, 0.9, -0.5)));
  }
  // the dome light (on while a door is open): a lens in the headliner and a warm point light
  const domeM = new THREE.MeshStandardMaterial({ color: '#cfc9bb', emissive: '#ffe1b5', emissiveIntensity: 0, roughness: 0.45 });
  const domeY = topPt(-0.62, 0).y - 0.038;
  const domeLens = add(new RoundedBoxGeometry(0.16, 0.012, 0.07, 2, 0.005), domeM); domeLens.position.set(0, domeY, -0.62); domeLens.castShadow = false;
  // a spot facing down from the lens (a point light 4 cm under it burnt the headliner around it white, seen through the windows)
  const domeLight = new THREE.SpotLight('#ffd9a8', 0, 2.4, 1.25, 0.7, 2); domeLight.position.set(0, domeY - 0.012, -0.62); g.add(domeLight);
  const domeTg = new THREE.Object3D(); domeTg.position.set(0, domeY - 1, -0.62); g.add(domeTg); domeLight.target = domeTg;
  // interior glow (dash, screens) and a contact shadow
  const dashLight = new THREE.PointLight('#a8c8ff', 0, 1.6, 2); dashLight.position.set(0.33, 1.08, -0.02); g.add(dashLight);   // the screens' glow on his face (3 cm from the dash it burnt a white square into it)
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 5.2), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: 0.8 }));
  cs.rotation.x = -Math.PI / 2; cs.position.y = 0.012; cs.renderOrder = 1; g.add(cs);

  // ---------- controls ----------
  // the front window's top edge comes down from the rail to the sill: glass above it is clipped, a thin strip marks the edge
  const setWindow = (key, k) => {
    const w = windows[key]; if (!w) return;
    const zr = C.FW[0] + 0.01, top = sidePt(w.sd, zr, 0.925).y, bot = sill(zr).y + 0.004, y = lerp(top + 0.02, bot, Math.min(1, k));
    g.updateMatrixWorld(true); const yw = g.localToWorld(V(0, y, 0)).y; w.plane.constant = k > 0.001 ? yw : 10;
    // the edge strip: from the window's rear edge forward to where the A-pillar line meets that height
    let zf = C.FW[1] - 0.01; for (let i = 0; i < 40; i++) { const zz = lerp(C.FW[0], C.FW[1], i / 40); if (sidePt(w.sd, zz, 0.925).y < y) { zf = zz; break; } }
    const v = (y - sill(zr).y) / (rail(zr).y - sill(zr).y), x = sidePt(w.sd, (zr + zf) / 2, Math.max(0, v)).x - w.sd * 0.004;
    w.edge.visible = k > 0.02 && k < 0.98; w.edge.position.set(x, y, (zr + zf) / 2); w.edge.scale.z = Math.max(0.01, zf - zr);
  };
  const setDoor = (a) => { door.rotation.y = a; door.updateMatrixWorld(true); };
  const setLocks = (k) => { for (const p of pins) p.position.y = 0.985 - 0.022 * k; };
  const setHandleIn = (k) => { hPiv.rotation.y = -0.38 * k; hPiv.updateMatrixWorld(true); };
  const setDome = (k) => { domeM.emissiveIntensity = 0.6 * k; domeLight.intensity = 0.7 * k; };
  const setLights = ({ head = 0, tail = 0, brake = 0, blink = 0, dash = 0 } = {}) => {
    headM.emissiveIntensity = 5 * head; tailM.emissiveIntensity = 1.6 * tail + 4 * brake; blinkM.emissiveIntensity = 5 * blink;
    screenM.emissiveIntensity = 0.55 * dash; center.material.emissiveIntensity = 0.5 * dash; dashLight.intensity = 0.02 * dash;
  };
  const spin = (dist) => { for (const w of wheels) w.rotation.x = dist / C.RT; };
  // H-points and grip points for posing people (car frame)
  const seats = { driver: V(0.37, 0.46, -0.12), front: V(-0.37, 0.46, -0.12), rearR: V(-0.42, 0.48, -0.98), rearL: V(0.42, 0.48, -0.98) };
  const grips = { wheelL: () => wheel.localToWorld(V(0.17, 0.05, 0)), wheelR: () => wheel.localToWorld(V(-0.17, 0.05, 0)), handleRR: () => door.localToWorld(V(-0.034, 0.885, -0.66)),        // the gap behind the outer bar
   
    handleInRR: () => handleIn.getWorldPosition(V(0, 0, 0)), pinRR: () => pinR.getWorldPosition(V(0, 0, 0)) };
  setLights({ tail: 1, head: 1, dash: 1 });
  return { group: g, paint: paintM, door, windows, setWindow, setDoor, setLocks, setHandleIn, setDome, setLights, spin, seats, grips, boxes, mirror, wheel, plate: plTex, plateF, handleIn, domeLight, dashZ };
}

function shadowTex() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const c = cv.getContext('2d');
  const gr = c.createRadialGradient(64, 128, 10, 64, 128, 120); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.save(); c.scale(1, 2); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); c.restore();
  return new THREE.CanvasTexture(cv);
}
export { rail, sidePt, topPt, skinPt, outlinePt, sill };
