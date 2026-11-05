// Post 12 props: an iced coffee (a clear 16 oz cup, coffee with milk, five ice cubes that melt with everything else,
// a black straw), and the WTF: a polar bear standing on its hind legs doing the "6-7" hand gesture (both paws palm-up,
// see-sawing) on a loop, whatever happens. The bear is signed-distance sculptures (body, head, each foreleg) turned
// into meshes by surface nets and covered in cream shell fur (engine/cat.js), with a black nose, eyes, lips and paw
// pads. Metres; the bear stands on y = 0 facing +z, about 2.35 m tall. update(t, { look }) poses it as a pure
// function of t.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './core.js';
import { surfaceNets, furred } from './cat.js';
import { iceMaterial } from './ice18.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------------------------------------------
// the iced coffee: origin at the centre of the cup's base, y up
// ---------------------------------------------------------------------------------------------------------------
export const CUP = { h: 0.135, rb: 0.031, rt: 0.049, level: 0.1 };
export const cupR = (h) => CUP.rb + (CUP.rt - CUP.rb) * Math.min(Math.max(h, 0), CUP.h) / CUP.h;
export function makeIcedCoffee() {
  const g = new THREE.Group();
  const wall = []; for (let i = 0; i <= 24; i++) { const h = CUP.h * i / 24; wall.push(new THREE.Vector2(cupR(h) + 0.0006, h)); }
  const cupM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 2.2, depthWrite: false, side: THREE.DoubleSide });
  const cup = new THREE.Mesh(new THREE.LatheGeometry(wall, 48), cupM); cup.renderOrder = 4; g.add(cup);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CUP.rt + 0.0008, 0.0012, 8, 48), new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.08, transparent: true, opacity: 0.55 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = CUP.h; rim.renderOrder = 4; g.add(rim);
  const base = new THREE.Mesh(new THREE.CircleGeometry(CUP.rb + 0.0006, 40), cupM); base.rotation.x = Math.PI / 2; base.position.y = 0.0005; g.add(base);
  // the coffee: an iced latte, darker below, a pale band of milk near the top
  const liq = []; liq.push(new THREE.Vector2(0, 0.003)); for (let i = 0; i <= 16; i++) { const h = 0.003 + (CUP.level - 0.003) * i / 16; liq.push(new THREE.Vector2(cupR(h) - 0.0004, h)); } liq.push(new THREE.Vector2(0, CUP.level));
  const lg = new THREE.LatheGeometry(liq, 40), lc = new Float32Array(lg.attributes.position.count * 3);
  for (let i = 0; i < lg.attributes.position.count; i++) { const h = lg.attributes.position.getY(i), k = Math.min(1, Math.max(0, (h - 0.06) / 0.04));
    const c = [0.2 + 0.22 * k, 0.1 + 0.14 * k, 0.045 + 0.08 * k]; lc.set(c, i * 3); }
  lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const coffee = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0 })); g.add(coffee);
  // ice cubes floating at the top (four) and one lower down; clear with a cloudy core
  const geo = new RoundedBoxGeometry(0.026, 0.024, 0.026, 3, 0.004);
  const items = [[0.017, 0.104, 0.006, 0.4, 0.35], [-0.016, 0.105, 0.014, 1.1, -0.3], [-0.004, 0.103, -0.021, 2.2, 0.25], [0.021, 0.1, -0.019, 0.7, 0.4], [-0.002, 0.075, 0.003, 1.9, 0.5]];
  const { mat, depth } = iceMaterial({ key: 'ice18cube' });
  const n = items.length, aIce = new Float32Array(n * 4), aBase = new Float32Array(n * 3), aUp = new Float32Array(n * 3);
  const im = new THREE.InstancedMesh(geo, mat, n); im.customDepthMaterial = depth; im.castShadow = true;
  items.forEach(([x, y, z, yaw, tilt], k) => { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, tilt * 0.5, 'YXZ'));
    im.setMatrixAt(k, new THREE.Matrix4().compose(V(x, y, z), q, V(1, 1, 1)));
    const upO = V(0, 1, 0).applyQuaternion(q.clone().invert());
    aIce.set([0.0125, 0.35 + 0.2 * (k % 2), 0.3 + k * 0.17, 0], k * 4); aBase.set([0, 0, 0], k * 3); aUp.set([upO.x, upO.y, upO.z], k * 3); });
  geo.setAttribute('aIce', new THREE.InstancedBufferAttribute(aIce, 4)); geo.setAttribute('aBaseO', new THREE.InstancedBufferAttribute(aBase, 3)); geo.setAttribute('aUpO', new THREE.InstancedBufferAttribute(aUp, 3));
  g.add(im);
  // the straw
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.215, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#16181a', roughness: 0.35, side: THREE.DoubleSide }));
  straw.position.set(-0.012, 0.11, 0.006); straw.rotation.set(0.05, 0, 0.2); g.add(straw);
  g.traverse((o) => { if (o.isMesh && o !== cup && o !== base && o !== rim) o.castShadow = true; });
  return { group: g, cubes: im, coffee };
}

// ---------------------------------------------------------------------------------------------------------------
// the polar bear
// ---------------------------------------------------------------------------------------------------------------
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function ell(px, py, pz, cx, cy, cz, rx, ry, rz) {
  const x = (px - cx) / rx, y = (py - cy) / ry, z = (pz - cz) / rz;
  const k0 = Math.sqrt(x * x + y * y + z * z), x2 = x / rx, y2 = y / ry, z2 = z / rz, k1 = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2);
  return k1 > 1e-12 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}
function rcone(px, py, pz, ax, ay, az, bx, by, bz, ra, rb) {
  const bax = bx - ax, bay = by - ay, baz = bz - az, pax = px - ax, pay = py - ay, paz = pz - az;
  let t = (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz); t = Math.min(1, Math.max(0, t));
  const dx = pax - bax * t, dy = pay - bay * t, dz = paz - baz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t);
}
// body: hind feet and legs, haunches, belly, chest, the shoulder hump, the long neck (the head and forelegs are separate)
export const BEAR = { neck: V(0, 1.94, 0.22), shoulder: V(0.24, 1.6, 0.08) };
function bearBody(x, y, z) {
  const ax = Math.abs(x);
  let d = ell(ax, y, z, 0.19, 0.055, 0.1, 0.12, 0.06, 0.21);                                      // hind feet
  d = smin(d, rcone(ax, y, z, 0.19, 0.12, 0.02, 0.2, 0.47, 0.07, 0.105, 0.13), 0.06);              // shins
  d = smin(d, rcone(ax, y, z, 0.2, 0.47, 0.07, 0.17, 0.86, -0.03, 0.14, 0.21), 0.07);              // thighs
  d = smin(d, ell(x, y, z, 0, 0.95, -0.03, 0.35, 0.33, 0.33), 0.1);                                 // haunches
  d = smin(d, ell(x, y, z, 0, 1.22, 0.03, 0.38, 0.4, 0.37), 0.12);                                  // belly
  d = smin(d, ell(x, y, z, 0, 1.52, 0.06, 0.3, 0.32, 0.29), 0.1);                                   // chest
  d = smin(d, ell(x, y, z, 0, 1.68, 0.02, 0.3, 0.16, 0.24), 0.08);                                  // shoulder hump
  d = smin(d, rcone(x, y, z, 0, 1.7, 0.06, 0, 1.96, 0.22, 0.19, 0.13), 0.08);                      // neck, carried forward
  d = smin(d, ell(x, y, z, 0, 0.92, -0.34, 0.07, 0.06, 0.05), 0.04);                                // tail
  return Math.max(d, -y);
}
// head, in head space (origin at the top of the neck, facing +z): a small skull, the long Roman muzzle, little ears
function bearHead(x, y, z) {
  const ax = Math.abs(x);
  let d = ell(x, y, z, 0, 0.06, 0.0, 0.112, 0.105, 0.15);                                          // cranium, flat on top
  d = smin(d, rcone(x, y, z, 0, 0.06, 0.08, 0, 0.02, 0.33, 0.085, 0.045), 0.06);                   // the long Roman muzzle
  d = smin(d, ell(ax, y, z, 0.062, 0.02, 0.06, 0.06, 0.06, 0.08), 0.04);                           // cheeks
  d = smin(d, ell(x, y, z, 0, -0.03, 0.2, 0.05, 0.035, 0.11), 0.03);                                // lower jaw
  d = smin(d, ell(ax, y, z, 0.085, 0.15, -0.04, 0.036, 0.032, 0.02), 0.022);                       // small round ears
  return d;
}
// a foreleg in shoulder space (origin at the shoulder joint, facing +z): upper arm down and forward, the forearm held
// out level, the broad paw turned palm-up (pads on top, toes curled up a little at the tip)
const LEG = { elbow: V(0.02, -0.36, 0.12), wrist: V(0.1, -0.4, 0.47) };
function bearLeg(x, y, z) {
  let d = rcone(x, y, z, 0, 0, 0, LEG.elbow.x, LEG.elbow.y, LEG.elbow.z, 0.14, 0.11);
  d = smin(d, rcone(x, y, z, LEG.elbow.x, LEG.elbow.y, LEG.elbow.z, LEG.wrist.x, LEG.wrist.y, LEG.wrist.z, 0.105, 0.085), 0.05);
  d = smin(d, ell(x, y, z, 0.12, -0.425, 0.6, 0.105, 0.045, 0.13), 0.05);                         // the paw, flat
  for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.32; d = smin(d, ell(x, y, z, 0.12 + Math.sin(a) * 0.085, -0.405, 0.6 + Math.cos(a) * 0.1, 0.03, 0.028, 0.035), 0.02); }   // toes
  return d;
}
export function makePolarBear() {
  const root = new THREE.Group(), torso = new THREE.Group(); root.add(torso);
  const light = [0.86, 0.84, 0.78];
  const furOf = (geo, lenF, o) => { const p = geo.attributes.position, n = p.count, w = new Float32Array(n).fill(1), l = new Float32Array(n);
    for (let i = 0; i < n; i++) l[i] = Math.max(0, lenF(p.getX(i), p.getY(i), p.getZ(i)));
    geo.setAttribute('aWhite', new THREE.BufferAttribute(w, 1)); geo.setAttribute('aLen', new THREE.BufferAttribute(l, 1));
    return furred(geo, { light, dark: light, ...o }); };
  // body (fur longer on the haunches and back of the legs, short on the feet)
  const bodyGeo = surfaceNets(bearBody, [-0.52, -0.01, -0.46], [0.52, 2.12, 0.5], 0.013);
  const body = furOf(bodyGeo, (x, y, z) => 0.7 + 0.5 * Math.min(1, Math.max(0, (y - 0.15) / 0.5)) - 0.3 * Math.max(0, (0.12 - y) / 0.12), { layers: 16, len: 0.038, scale: 1.25 });
  torso.add(body.group);
  // head
  const neck = new THREE.Group(); neck.position.copy(BEAR.neck); torso.add(neck);
  const head = new THREE.Group(); neck.add(head);
  const headGeo = surfaceNets(bearHead, [-0.2, -0.1, -0.18], [0.2, 0.24, 0.42], 0.0055);
  const hf = furOf(headGeo, (x, y, z) => 0.85 - 0.65 * Math.min(1, Math.max(0, (z - 0.1) / 0.15)) - 0.5 * Math.exp(-(((Math.abs(x) - 0.058) / 0.03) ** 2) - (((y - 0.098) / 0.03) ** 2) - (((z - 0.15) / 0.04) ** 2)), { layers: 14, len: 0.02, scale: 2.0 });
  head.add(hf.group);
  const black = new THREE.MeshPhysicalMaterial({ color: '#0b0b0c', roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), black); nose.scale.set(0.034, 0.024, 0.022); nose.position.set(0, 0.03, 0.368); head.add(nose);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 10), black); e.position.set(s * 0.058, 0.098, 0.152); head.add(e); }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 8, 24, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: '#141212', roughness: 0.6 }));
  lip.position.set(0, -0.006, 0.285); lip.rotation.set(0.45, 0, Math.PI * 1.05); lip.scale.set(0.85, 1, 0.8); head.add(lip);
  // forelegs: one sculpture, mirrored for the left; black pads on the palms, dark claws
  const legGeo = surfaceNets(bearLeg, [-0.16, -0.52, -0.16], [0.3, 0.16, 0.8], 0.0075);
  const legs = [-1, 1].map((s) => {
    const sh = new THREE.Group(); sh.position.set(s * BEAR.shoulder.x, BEAR.shoulder.y, BEAR.shoulder.z); torso.add(sh);
    const pivot = new THREE.Group(); sh.add(pivot);
    const f = furOf(legGeo, (x, y, z) => 0.9 - 0.6 * Math.min(1, Math.max(0, (z - 0.45) / 0.15)), { layers: 14, len: 0.03, scale: 1.6 });
    f.group.scale.x = s; pivot.add(f.group);
    const padG = new THREE.Group(); padG.scale.x = s; pivot.add(padG);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), black); pad.scale.set(0.06, 0.012, 0.055); pad.position.set(0.12, -0.378, 0.57); padG.add(pad);
    for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.32, tp = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), black);
      tp.scale.set(0.018, 0.008, 0.02); tp.position.set(0.12 + Math.sin(a) * 0.085, -0.378, 0.6 + Math.cos(a) * 0.1); padG.add(tp);
      const cl = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.045, 8), new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.45 }));
      cl.position.set(0.12 + Math.sin(a) * 0.1, -0.4, 0.6 + Math.cos(a) * 0.135); cl.rotation.set(Math.PI / 2 + 0.5, 0, -a * 0.5); padG.add(cl); }
    return pivot;
  });
  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) o.castShadow = true; });
  // the 6-7: paws see-saw (one up while the other goes down), shoulders and head bob along, the weight shifts
  const update = (t, { look = null } = {}) => {
    const ph = t * Math.PI * 2 * 1.55, s = Math.sin(ph), s2 = Math.sin(ph * 2);
    legs[0].rotation.set(-0.26 * s - 0.08, 0, 0.0); legs[1].rotation.set(0.26 * s - 0.08, 0, 0.0);
    torso.rotation.z = 0.025 * s; torso.rotation.x = 0.012 * s2;
    let yaw = 0, pitch = 0.04 * s2 - 0.05;
    if (look) { const lp = root.worldToLocal(look.clone()).sub(BEAR.neck); yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(lp.x, lp.z))); pitch += Math.max(-0.3, Math.min(0.3, -Math.atan2(lp.y, Math.hypot(lp.x, lp.z)))) * 0.6; }
    neck.rotation.set(pitch, yaw + 0.06 * s, 0.05 * s, 'YXZ');
    const br = Math.sin(t * 1.3) * 0.006; body.group.scale.set(1 + br, 1, 1 + br);
  };
  return { root, update, legs, head: neck };
}
