// Post 6 props: your coffee (paper cup, sleeve, lid), the snowman in July (rule 19's WTF: three snowballs on the red
// steps, coal, a carrot, a scarf and sunglasses), a taxi's roof sign. Metres; every object stands on y = 0.
import * as THREE from 'three';
import { canvasTex } from './assets.js';
import { rng } from './core.js';
import { frostize } from './tsq.js';

export function makeCoffee() {
  const g = new THREE.Group();
  const paper = frostize(new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.7 }));
  const sleeve = frostize(new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.85 }));
  const lid = frostize(new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.45 }));
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.032, 0.13, 28, 1, true), paper); cup.position.y = 0.065;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.032, 24), paper); bottom.rotation.x = Math.PI / 2; bottom.position.y = 0.001;
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.0425 * 0.985 + 0.0015, 0.036, 0.055, 28, 1, true), sleeve); sl.position.y = 0.07;
  const lp = [new THREE.Vector2(0, 0.0), new THREE.Vector2(0.046, 0.0), new THREE.Vector2(0.047, 0.006), new THREE.Vector2(0.041, 0.012), new THREE.Vector2(0.038, 0.02), new THREE.Vector2(0, 0.021)];
  const ld = new THREE.Mesh(new THREE.LatheGeometry(lp, 28), lid); ld.position.y = 0.128;
  g.add(cup, bottom, sl, ld);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.material.side = THREE.DoubleSide; } });
  return g;
}

export function makeSnowman() {
  const g = new THREE.Group();
  const snowTex = canvasTex(256, 256, (c, w, h) => {
    const im = c.createImageData(w, h), rr = rng(5);   // seeded: every worker draws the same snow
    for (let i = 0; i < w * h; i++) { const v = 228 + Math.floor(rr() * 27); im.data[i * 4] = v - 6; im.data[i * 4 + 1] = v - 2; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    c.putImageData(im, 0, 0);
  }, { repeat: true });
  snowTex.repeat.set(3, 3);
  const snow = new THREE.MeshPhysicalMaterial({ color: '#f2f5fa', map: snowTex, roughness: 0.62, sheen: 0.4, sheenColor: new THREE.Color('#dfe8ff'), sheenRoughness: 0.5 });
  const balls = [[0.26, 0.24], [0.19, 0.6], [0.135, 0.88]];
  for (const [r, y] of balls) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), snow); s.scale.y = 0.94; s.position.y = y; g.add(s); }
  const coal = new THREE.MeshStandardMaterial({ color: '#141312', roughness: 0.9 });
  for (const [x, y] of [[-0.045, 0.92], [0.045, 0.92]]) { const e = new THREE.Mesh(new THREE.IcosahedronGeometry(0.014, 1), coal); e.position.set(x, y, 0.12); g.add(e); }
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.016, 1), coal); b.position.set(0, 0.52 + k * 0.08, 0.18 - Math.abs(k - 1) * 0.005); g.add(b); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.12, 16), new THREE.MeshStandardMaterial({ color: '#e86a1c', roughness: 0.6 }));
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.875, 0.18); g.add(nose);
  // sunglasses: two dark lenses on a thin bar
  const lens = new THREE.MeshPhysicalMaterial({ color: '#060708', roughness: 0.05, metalness: 0.3, clearcoat: 1 });
  for (const x of [-0.045, 0.045]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 24), lens); l.rotation.x = Math.PI / 2; l.position.set(x, 0.925, 0.128); g.add(l); }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.006, 0.006), lens); bar.position.set(0, 0.935, 0.13); g.add(bar);
  // a red knitted scarf round the neck, one end hanging
  const knit = new THREE.MeshStandardMaterial({ color: '#b3161b', roughness: 0.95 });
  const sc = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 12, 36), knit); sc.rotation.x = Math.PI / 2; sc.position.y = 0.77; g.add(sc);
  const end = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.02), knit); end.position.set(0.07, 0.68, 0.16); end.rotation.z = 0.15; g.add(end);
  // stick arms
  const wood = new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.9 });
  for (const sd of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.4, 8), wood); a.position.set(sd * 0.32, 0.68, 0); a.rotation.z = sd * -1.0; g.add(a); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function taxiSign() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.2, 0.18), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffe9b0', emissiveIntensity: 1.3 }));
  body.position.y = 0.1; g.add(body);
  return g;
}
