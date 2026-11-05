// Post 11 props: a feral pigeon standing on the paving (wings folded, legs, iridescent neck) that pecks and looks
// round; peck(k) drops its head to the ground (0..1), look(a) turns it (radians). Head toward +z, feet on y = 0.
import * as THREE from 'three';

export function makeGroundPigeon(seed = 0) {
  const g = new THREE.Group();
  const shade = 0.9 + 0.2 * ((seed * 0.618) % 1);
  const grey = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5c6470').multiplyScalar(shade), roughness: 0.8 });
  const wingM = new THREE.MeshStandardMaterial({ color: new THREE.Color('#68707c').multiplyScalar(shade), roughness: 0.82 });
  const dark = new THREE.MeshStandardMaterial({ color: '#202328', roughness: 0.75 });
  const neckM = new THREE.MeshPhysicalMaterial({ color: '#4f6158', roughness: 0.45, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [250, 650] });
  const legM = new THREE.MeshStandardMaterial({ color: '#c0535a', roughness: 0.6 });
  const body = new THREE.Group(); body.position.y = 0.105; body.rotation.x = -0.18; g.add(body);
  const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16, r = 0.068 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.03)), 0.62) + 0.003; pts.push(new THREE.Vector2(r, u * 0.25 - 0.12)); }
  const b = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), grey); b.rotation.x = Math.PI / 2; b.scale.set(1, 1, 0.95); b.castShadow = true; body.add(b);
  // folded wings over the back, each with two dark bars; the tail behind them
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), wingM); w.scale.set(0.03, 0.026, 0.115); w.position.set(s * 0.043, 0.02, -0.035); w.rotation.set(0.12, s * 0.1, s * 0.25); w.castShadow = true; body.add(w);
    for (const z of [-0.035, -0.065]) { const bar = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), dark); bar.scale.set(0.012, 0.02, 0.006); bar.position.set(s * 0.068, 0.022, z); bar.rotation.z = s * 0.35; body.add(bar); }
  }
  const ts = new THREE.Shape([new THREE.Vector2(-0.025, 0), new THREE.Vector2(0.025, 0), new THREE.Vector2(0.038, -0.1), new THREE.Vector2(-0.038, -0.1)]);
  const tail = new THREE.Mesh(new THREE.ExtrudeGeometry(ts, { depth: 0.008, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#474e58', roughness: 0.8 })); tail.rotation.x = Math.PI / 2 - 0.35; tail.position.set(0, 0.012, -0.11); body.add(tail);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.009, 0.02), dark); tip.position.set(0, -0.022, -0.2); tip.rotation.x = 0.35; body.add(tip);
  // neck and head on a pivot at the neck's base (pecking and looking turn it)
  const nk = new THREE.Group(); nk.position.set(0, 0.035, 0.09); body.add(nk);
  const neck = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), neckM); neck.scale.set(0.031, 0.047, 0.035); neck.position.set(0, 0.024, 0.016); nk.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), grey); head.position.set(0, 0.064, 0.036); nk.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.0065, 0.024, 6), new THREE.MeshStandardMaterial({ color: '#2b2927', roughness: 0.5 })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.058, 0.073); nk.add(beak);
  const cere = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshStandardMaterial({ color: '#e8e4dc', roughness: 0.7 })); cere.position.set(0, 0.064, 0.06); nk.add(cere);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), new THREE.MeshStandardMaterial({ color: '#d0581c', roughness: 0.25 })); e.position.set(s * 0.021, 0.07, 0.048); nk.add(e); }
  // legs and toes (feet flat on y = 0)
  for (const s of [-1, 1]) {
    const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.005, 0.05, 6), legM); lg.position.set(s * 0.022, 0.025, 0.0); g.add(lg);
    for (const a of [-0.45, 0, 0.45, Math.PI]) { const len = a === Math.PI ? 0.02 : 0.03, t = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, len, 5), legM);
      t.rotation.set(Math.PI / 2, 0, 0); t.rotation.order = 'YXZ'; t.rotation.y = a; t.position.set(s * 0.022 + Math.sin(a) * len / 2, 0.003, Math.cos(a) * len / 2); g.add(t); }
  }
  g.peck = (k) => { nk.rotation.x = 0.95 * k; nk.position.z = 0.09 + 0.012 * k; };
  g.look = (a) => { nk.rotation.y = a; };
  return g;
}
