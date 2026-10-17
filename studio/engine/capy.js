// Post 7's WTF: a capybara resting on the sand with an orange on its head, totally unbothered (the meme). Same build as
// Apple (engine/cat.js): signed-distance sculpture -> surface nets -> shell fur (coarse reddish-brown hair), glossy dark
// eyes that blink, a head that can turn slowly toward a point, fur that streams in the wind (update's `blow`, world
// space, m/s scaled). Metres, about 1.05 m long and 0.6 m to the top of the orange, lying on y = 0, facing +z.
import * as THREE from 'three';
import { surfaceNets, furred } from './cat.js';
import { canvasTex } from './assets.js';
import { rng } from './core.js';

const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function ell(x, y, z, cx, cy, cz, rx, ry, rz) {
  const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz, k0 = Math.hypot(px, py, pz), k1 = Math.hypot(px / rx, py / ry, pz / rz);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}
function rbox(x, y, z, cx, cy, cz, bx, by, bz, r) {
  const qx = Math.abs(x - cx) - bx + r, qy = Math.abs(y - cy) - by + r, qz = Math.abs(z - cz) - bz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
const NECK = new THREE.Vector3(0, 0.38, 0.34);
// body lying on its belly: barrel, high round rump, shoulders, tucked front legs and haunches
function bodySDF(x, y, z) {
  let d = ell(x, y, z, 0, 0.22, 0.02, 0.235, 0.205, 0.43);
  d = smin(d, ell(x, y, z, 0, 0.25, -0.2, 0.245, 0.215, 0.27), 0.08);
  d = smin(d, ell(x, y, z, 0, 0.29, 0.25, 0.175, 0.17, 0.2), 0.08);
  for (const s of [-1, 1]) {
    d = smin(d, ell(x, y, z, s * 0.1, 0.06, 0.33, 0.055, 0.06, 0.11), 0.05);   // front legs folded forward
    d = smin(d, ell(x, y, z, s * 0.165, 0.13, -0.24, 0.095, 0.12, 0.16), 0.06);  // haunches
  }
  return Math.max(d, -y + 0.004);
}
// the head in its own frame (origin at NECK): big, blunt, a deep square muzzle, small round ears
function headSDF(x, y, z) {
  let d = ell(x, y, z, 0, 0.04, 0.15, 0.1, 0.105, 0.165);
  d = smin(d, rbox(x, y, z, 0, 0.0, 0.29, 0.082, 0.078, 0.06, 0.05), 0.05);
  d = smin(d, ell(x, y, z, 0, -0.02, 0.06, 0.12, 0.12, 0.12), 0.06);            // the neck's fold into the shoulders
  for (const s of [-1, 1]) d = smin(d, ell(x, y, z, s * 0.07, 0.15, 0.08, 0.028, 0.032, 0.014), 0.012);
  return d;
}
function peelTex() {
  const N = 256, r = rng(31);
  return canvasTex(N, N, (g) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 2600; i++) { const x = r() * N, y = r() * N, rr = 1 + r() * 2.2; const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, 'rgba(40,40,40,0.55)'); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  }, { repeat: true, linear: true });
}

export function makeCapybara() {
  const root = new THREE.Group();
  const dark = [0.15, 0.095, 0.058], light = [0.38, 0.255, 0.16];
  const bodyGeo = surfaceNets(bodySDF, [-0.3, 0, -0.52], [0.3, 0.5, 0.52], 0.0065);
  const bp = bodyGeo.attributes.position, bw = new Float32Array(bp.count), bl = new Float32Array(bp.count);
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i), z = bp.getZ(i);
    bw[i] = 0.5 + 0.12 * Math.sin(z * 9 + y * 5) - 0.12 * Math.min(1, Math.max(0, (y - 0.3) / 0.12));   // darker along the back
    bl[i] = 0.75 + 0.35 * Math.min(1, Math.max(0, (y - 0.1) / 0.2));
  }
  bodyGeo.setAttribute('aWhite', new THREE.BufferAttribute(bw, 1)); bodyGeo.setAttribute('aLen', new THREE.BufferAttribute(bl, 1));
  const body = furred(bodyGeo, { layers: 16, len: 0.016, scale: 6, dark, light });
  root.add(body.group);
  const head = new THREE.Group(); head.position.copy(NECK); root.add(head);
  const headGeo = surfaceNets(headSDF, [-0.14, -0.14, -0.08], [0.14, 0.19, 0.37], 0.004);
  const hp = headGeo.attributes.position, hw = new Float32Array(hp.count), hl = new Float32Array(hp.count);
  for (let i = 0; i < hp.count; i++) {
    const z = hp.getZ(i), y = hp.getY(i);
    hw[i] = 0.42 - 0.18 * Math.min(1, Math.max(0, (z - 0.27) / 0.06));             // a darker muzzle
    hl[i] = Math.max(0.15, 1 - 0.75 * Math.min(1, Math.max(0, (z - 0.25) / 0.08)) - 0.5 * Math.min(1, Math.max(0, (y - 0.13) / 0.03)));
  }
  headGeo.setAttribute('aWhite', new THREE.BufferAttribute(hw, 1)); headGeo.setAttribute('aLen', new THREE.BufferAttribute(hl, 1));
  const hf = furred(headGeo, { layers: 12, len: 0.007, scale: 9, dark, light });
  head.add(hf.group);
  // eyes high on the head, nostrils on the blunt muzzle
  const eyeM = new THREE.MeshPhysicalMaterial({ color: '#0b0705', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });
  const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 16, 12), eyeM); e.position.set(s * 0.083, 0.088, 0.205); e.scale.set(0.8, 1, 0.9); head.add(e); return e; });
  const noseM = new THREE.MeshStandardMaterial({ color: '#1a120d', roughness: 0.7 });
  for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), noseM); n.position.set(s * 0.028, 0.035, 0.348); n.scale.set(1.3, 0.55, 0.5); head.add(n); }
  // the orange, balanced on top of the head (peel dimples as a bump map, a stalk and a leaf)
  const orange = new THREE.Group();
  const om = new THREE.MeshStandardMaterial({ color: '#f0860f', roughness: 0.42, bumpMap: peelTex(), bumpScale: 0.6 });
  const ob = new THREE.Mesh(new THREE.SphereGeometry(0.043, 32, 24), om); ob.scale.set(1, 0.93, 1); ob.castShadow = true; orange.add(ob);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.008, 6), new THREE.MeshStandardMaterial({ color: '#5a4a1c', roughness: 0.8 })); st.position.y = 0.043; orange.add(st);
  const lf = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 6), new THREE.MeshStandardMaterial({ color: '#2f5a1c', roughness: 0.55, side: THREE.DoubleSide }));
  lf.scale.set(1, 0.12, 0.45); lf.position.set(0.012, 0.045, 0.004); lf.rotation.z = -0.35; orange.add(lf);
  orange.position.set(0, 0.145 + 0.007 + 0.043 * 0.93 + 0.003, 0.13); head.add(orange);   // head top + fur + radius + 3 mm
  const _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  function update(t, o = {}) {
    // slow blinks
    let b = 0; for (const t0 of o.blinkAt || []) { const k = (t - t0) / 0.3; if (k > 0 && k < 1) b = Math.max(b, Math.sin(Math.PI * k)); }
    for (const e of eyes) e.scale.y = 1 - 0.9 * b;
    // the head turns toward a point (weight lookK), never more than 60 degrees
    head.rotation.set(0, 0, 0);
    if (o.look && (o.lookK ?? 0) > 0) {
      root.updateMatrixWorld(true);
      const lp = root.worldToLocal(o.look.clone()).sub(NECK);
      const yaw = THREE.MathUtils.clamp(Math.atan2(lp.x, lp.z), -1.05, 1.05), pitch = THREE.MathUtils.clamp(Math.atan2(lp.y, Math.hypot(lp.x, lp.z)), -0.3, 0.4);
      head.rotation.set(-pitch * o.lookK * 0.6, yaw * o.lookK, 0, 'YXZ');
    }
    // wind in the fur: world vector -> each part's frame
    const bw = o.blow || new THREE.Vector3();
    root.updateMatrixWorld(true);
    for (const [part, grp] of [[body, root], [hf, head]]) {
      const inv = _q.copy(grp.getWorldQuaternion(new THREE.Quaternion())).invert(), v = bw.clone().applyQuaternion(inv);
      for (const m of [part.base.material, part.shells.material]) m.userData.U.uBlow.value.copy(v);
    }
    void _m;
  }
  return { root, head, orange, update };
}
