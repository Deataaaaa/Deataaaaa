// Post 8's WTF: a furry monster plush keychain (tall bunny ears, a wide toothy grin), the trendy kind people clip to
// their bags. It rides out the blast without a scratch. Same build as Apple (engine/cat.js): a signed-distance
// sculpture -> surface nets -> shell fur; a smooth peach face plate with glossy black eyes and nine little teeth.
// Metres, 0.17 m tall, standing on y = 0, facing +z; a ball chain loops from the top of its head.
import * as THREE from 'three';
import { surfaceNets, furred } from './cat.js';

const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function ell(x, y, z, cx, cy, cz, rx, ry, rz) {
  const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz, k0 = Math.hypot(px, py, pz), k1 = Math.hypot(px / rx, py / ry, pz / rz);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}
function sdf(x, y, z) {
  let d = ell(x, y, z, 0, 0.042, 0, 0.032, 0.036, 0.028);                     // body
  d = smin(d, ell(x, y, z, 0, 0.098, 0.002, 0.038, 0.034, 0.033), 0.012);       // head
  for (const s of [-1, 1]) {
    d = smin(d, ell(x, y, z, s * 0.016, 0.152, -0.002, 0.009, 0.03, 0.006), 0.008);   // ears
    d = smin(d, ell(x, y, z, s * 0.034, 0.05, 0.004, 0.009, 0.018, 0.009), 0.008);    // arms
    d = smin(d, ell(x, y, z, s * 0.016, 0.01, 0.004, 0.012, 0.012, 0.013), 0.006);    // feet
  }
  return d;
}

export function makePlush() {
  const root = new THREE.Group();
  const geo = surfaceNets(sdf, [-0.06, -0.005, -0.04], [0.06, 0.19, 0.045], 0.0022);
  const p = geo.attributes.position, aw = new Float32Array(p.count), al = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); aw[i] = 0.55 + 0.1 * Math.sin(y * 90); al[i] = y > 0.125 ? 0.55 : 1; }
  geo.setAttribute('aWhite', new THREE.BufferAttribute(aw, 1)); geo.setAttribute('aLen', new THREE.BufferAttribute(al, 1));
  const fur = furred(geo, { layers: 12, len: 0.0045, scale: 26, dark: [0.32, 0.2, 0.15], light: [0.66, 0.47, 0.36] });
  root.add(fur.group);
  // face plate: a peach oval just proud of the fur, eyes, a grin with nine pointed teeth
  const skin = new THREE.MeshStandardMaterial({ color: '#f2d3bd', roughness: 0.55 });
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.026, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), skin);
  face.rotation.x = Math.PI / 2; face.scale.set(1.12, 1, 0.85); face.position.set(0, 0.094, 0.018); root.add(face);
  const eyeM = new THREE.MeshPhysicalMaterial({ color: '#070707', roughness: 0.05, clearcoat: 1 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 16, 12), eyeM); e.scale.set(1, 1.25, 0.6); e.position.set(s * 0.0105, 0.102, 0.0385); root.add(e); }
  const mouthM = new THREE.MeshStandardMaterial({ color: '#2a0f0f', roughness: 0.7 }), toothM = new THREE.MeshStandardMaterial({ color: '#fbfaf5', roughness: 0.35 });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0026, 8, 24, Math.PI), mouthM); mouth.rotation.z = Math.PI; mouth.position.set(0, 0.0905, 0.0388); mouth.scale.set(1, 0.6, 0.5); root.add(mouth);
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.12 + 0.76 * i / 8), t = new THREE.Mesh(new THREE.ConeGeometry(0.0016, 0.0042, 6), toothM);
    t.position.set(-Math.cos(a) * 0.0122, 0.0905 - Math.sin(a) * 0.0075 + 0.0012, 0.0402); t.rotation.z = Math.PI; root.add(t); }
  const pinkM = new THREE.MeshStandardMaterial({ color: '#e7a3a3', roughness: 0.6 });
  for (const s of [-1, 1]) { const ie = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), pinkM); ie.scale.set(0.0045, 0.02, 0.002); ie.position.set(s * 0.016, 0.153, 0.0048); root.add(ie); }
  // the ball chain
  const chainM = new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 1, roughness: 0.25 });
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(0.0014, 8, 6), chainM); b.position.set(Math.sin(a) * 0.009, 0.142 + 0.03 + Math.cos(a) * 0.012, -0.006); root.add(b); }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, fur };
}
