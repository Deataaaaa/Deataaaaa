// Series « 12 % »: Paris fire brigade trucks. An aerial ladder truck (EPA) whose turntable, elevation and four nested
// sections are posed by setLadder(), and a pump engine (FPT). Red with white reflective bands, blue beacons whose pulse is a
// smooth function of t (no hard on/off, so no strobing). Both face +x, origin at the middle of the chassis on the ground.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g.toNonIndexed(); };
const rbox = (w, h, d, r, x, y, z) => { const g = new RoundedBoxGeometry(w, h, d, 2, r); g.translate(x, y, z); return g.toNonIndexed(); };
const mesh = (list, mat) => { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = true; m.receiveShadow = true; return m; };
const RED = () => new THREE.MeshPhysicalMaterial({ color: '#b3121a', roughness: 0.35, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });

function bandTex(text) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#b3121a'; c.fillRect(0, 0, 1024, 128);
  c.fillStyle = '#f2f2f2'; c.fillRect(0, 44, 1024, 40);
  if (text) { c.fillStyle = '#b3121a'; c.font = '700 30px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.fillText(text, 512, 75); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function cab(g, L, red, glass, black) {
  g.add(mesh([rbox(2.0, 2.0, 2.45, 0.12, L / 2 - 1.0, 1.55, 0)], red));
  g.add(mesh([box(0.05, 0.85, 2.2, L / 2 + 0.005, 2.0, 0), box(1.3, 0.8, 0.05, L / 2 - 1.05, 2.0, 1.23), box(1.3, 0.8, 0.05, L / 2 - 1.05, 2.0, -1.23)], glass));
  g.add(mesh([box(0.25, 0.35, 2.5, L / 2 + 0.05, 0.55, 0)], black));
  const head = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#fff1d6', emissiveIntensity: 4 });
  for (const s of [-1, 1]) g.add(mesh([box(0.06, 0.16, 0.3, L / 2 + 0.03, 0.9, s * 0.9)], head));
}
function wheels(g, xs, black) {
  const tyre = new THREE.MeshStandardMaterial({ color: '#121212', roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: '#9a9ea4', metalness: 0.8, roughness: 0.35 });
  for (const x of xs) for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 24), tyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.5, s * 1.05); w.castShadow = true; g.add(w);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16), rim); h.rotation.x = Math.PI / 2; h.position.set(x, 0.5, s * 1.235); g.add(h);
  }
}
// beacons: emissive lenses + a few point lights; pulse(t) is applied by update()
function beacons(g, spots) {
  const lens = new THREE.MeshStandardMaterial({ color: '#0a1530', emissive: '#2a62ff', emissiveIntensity: 0, roughness: 0.2 });
  const list = [];
  for (const [x, y, z, ph] of spots) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), lens.clone()); m.position.set(x, y, z); g.add(m);
    list.push({ m, ph });
  }
  return list;
}
export const pulse = (t, ph) => { const s = 0.5 + 0.5 * Math.sin((t * 1.45 + ph) * Math.PI * 2); return Math.pow(s, 3); };   // smooth, ~1.5 Hz

// the aerial ladder: 4 nested sections of side rails + rungs
function ladderSection(len, w, mat) {
  const L = [box(0.09, 0.32, len, w / 2, 0.16, len / 2), box(0.09, 0.32, len, -w / 2, 0.16, len / 2), box(0.06, 0.06, len, w / 2, 0.72, len / 2), box(0.06, 0.06, len, -w / 2, 0.72, len / 2)];
  for (let z = 0.25; z < len; z += 0.35) L.push(box(w, 0.04, 0.05, 0, 0.06, z));
  for (let z = 0.4; z < len; z += 1.2) for (const s of [-1, 1]) L.push(box(0.04, 0.52, 0.04, s * w / 2, 0.46, z));
  return mesh(L, mat);
}
export function makeEPA() {
  const g = new THREE.Group(), L = 10.2, red = RED(), black = new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.7 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#0a0c10', roughness: 0.05, metalness: 0.2, clearcoat: 1 });
  const bandM = new THREE.MeshStandardMaterial({ map: bandTex('SAPEURS-POMPIERS DE PARIS'), roughness: 0.4 });
  g.add(mesh([box(L - 2.2, 1.6, 2.45, -1.0, 1.35, 0)], red));
  const band = new THREE.Mesh(new THREE.PlaneGeometry(L - 2.3, 0.62), bandM); band.position.set(-1.0, 1.2, 1.235); g.add(band);
  const band2 = band.clone(); band2.position.z = -1.235; band2.rotation.y = Math.PI; g.add(band2);
  cab(g, L, red, glass, black); wheels(g, [3.6, -1.8, -3.3], black);
  // stabilisers (deployed): beams out to pads on the road
  const metal = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.7, roughness: 0.4 });
  for (const x of [1.6, -4.2]) for (const s of [-1, 1]) g.add(mesh([box(0.25, 0.22, 1.3, x, 0.9, s * 1.6), box(0.2, 0.8, 0.2, x, 0.5, s * 2.15), box(0.6, 0.06, 0.6, x, 0.03, s * 2.15)], metal));
  // turntable at the rear, the ladder pivot on it
  const turn = new THREE.Group(); turn.position.set(-3.6, 2.2, 0); g.add(turn);
  turn.add(mesh([new THREE.CylinderGeometry(0.95, 1.05, 0.35, 28).toNonIndexed(), box(1.0, 0.9, 1.1, 0.0, 0.6, 0)], metal));
  const pivot = new THREE.Group(); pivot.position.set(0.2, 1.0, 0); turn.add(pivot);
  const secs = []; const lens = [7.6, 7.4, 7.2, 7.0];
  let w = 0.92;
  const host = new THREE.Group(); pivot.add(host);
  for (let i = 0; i < 4; i++) { const s = ladderSection(lens[i], w, i % 2 ? metal : red); s.position.y = i * 0.05; host.add(s); secs.push(s); w -= 0.1; }
  const basket = new THREE.Group(); host.add(basket);
  basket.add(mesh([box(1.0, 0.06, 0.8, 0, 0, 0.4), box(1.0, 1.0, 0.04, 0, 0.5, 0.8), box(0.04, 1.0, 0.8, 0.5, 0.5, 0.4), box(0.04, 1.0, 0.8, -0.5, 0.5, 0.4)], metal));
  // pose: yaw (rad, 0 = toward +z), elevation (rad), extension (m beyond the base section)
  const setLadder = ({ yaw = 0, elev = 0, ext = 0 }) => {
    turn.rotation.y = yaw; pivot.rotation.x = -elev;
    const per = ext / 3; secs.forEach((s, i) => { s.position.z = i * per; });
    basket.position.set(0, 0.1, lens[3] + 3 * per); basket.rotation.x = elev;    // the basket stays level
  };
  const tip = () => basket.getWorldPosition(new THREE.Vector3());
  // aim the ladder's basket at a world point; k: 0 folded over the cab, 1 there (lift, swing, then extend)
  const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const aim = (target, k = 1) => {
    g.updateMatrixWorld(true);
    const d = g.worldToLocal(target.clone()).sub(new THREE.Vector3(-3.4, 3.2, 0));
    const yawT = Math.atan2(d.x, d.z), elevT = Math.atan2(d.y, Math.hypot(d.x, d.z)), extT = Math.max(0, d.length() - lens[3] - 0.45);
    const a = sm(0, 0.3, k), b = sm(0.15, 0.6, k), c = sm(0.45, 1, k);
    const y0 = Math.PI / 2, dy = Math.atan2(Math.sin(yawT - y0), Math.cos(yawT - y0));
    setLadder({ yaw: y0 + dy * b, elev: 0.02 + (Math.min(0.35, elevT) - 0.02) * a + (elevT - Math.min(0.35, elevT)) * b, ext: extT * c });
  };
  setLadder({ yaw: Math.PI / 2, elev: 0.02, ext: 0 });
  const bea = beacons(g, [[L / 2 - 0.6, 2.62, 0.7, 0], [L / 2 - 0.6, 2.62, -0.7, 0.5], [-L / 2 + 0.3, 2.3, 1.1, 0.25], [-L / 2 + 0.3, 2.3, -1.1, 0.75]]);
  return { group: g, setLadder, aim, tip, beacons: bea, turn, pivot, L };
}
export function makeFPT() {
  const g = new THREE.Group(), L = 8.4, red = RED(), black = new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.7 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#0a0c10', roughness: 0.05, metalness: 0.2, clearcoat: 1 });
  g.add(mesh([box(L - 2.0, 2.4, 2.45, -1.0, 1.75, 0)], red));
  const bandM = new THREE.MeshStandardMaterial({ map: bandTex('POMPIERS DE PARIS'), roughness: 0.4 });
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(L - 2.1, 0.62), bandM); b.position.set(-1.0, 1.3, s * 1.235); if (s < 0) b.rotation.y = Math.PI; g.add(b); }
  const shutters = new THREE.MeshStandardMaterial({ color: '#c2c5c9', metalness: 0.6, roughness: 0.45 });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.add(mesh([box(1.7, 1.2, 0.02, -3.2 + i * 1.95, 2.25, s * 1.236)], shutters));
  cab(g, L, red, glass, black); wheels(g, [2.7, -2.6], black);
  const bea = beacons(g, [[L / 2 - 0.6, 2.62, 0.7, 0.1], [L / 2 - 0.6, 2.62, -0.7, 0.6], [-L / 2 + 0.3, 3.0, 1.1, 0.35], [-L / 2 + 0.3, 3.0, -1.1, 0.85]]);
  return { group: g, beacons: bea, L };
}
// drive the beacons: lens glow + blue point lights placed by the caller
export function updateBeacons(list, t, k = 1) { for (const { m, ph } of list) m.material.emissiveIntensity = (0.4 + 9 * pulse(t, ph)) * k; }
