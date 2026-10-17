// Post 9 props: your umbrella (eight panels between ribs, wet black nylon, J handle), a London double-decker bus (made-up
// operator, no logo), a black cab, a pigeon caught mid-flap, and rule 19's WTF: a cup of tea on its saucer hanging in the
// air beside you, the tea frozen in a splash as it leaves the cup.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// the umbrella, open: handle at the origin, shaft up +y, canopy radius 0.52 m
export function makeUmbrella() {
  const g = new THREE.Group();
  const nylon = new THREE.MeshPhysicalMaterial({ color: '#101113', roughness: 0.38, metalness: 0, sheen: 0.4, sheenColor: new THREE.Color('#4a5060'), side: THREE.DoubleSide, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  const steel = new THREE.MeshStandardMaterial({ color: '#8d9196', roughness: 0.3, metalness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: '#3a2416', roughness: 0.45 });
  const top = 0.98, R = 0.52, nr = 8, ns = 10, na = 6, pos = [], idx = [];
  // canopy: for each panel, a grid from the tip (s = 0) to the edge (s = 1) and across between two ribs (a = 0..1)
  for (let p = 0; p < nr; p++) for (let i = 0; i <= ns; i++) for (let j = 0; j <= na; j++) {
    const s = i / ns, a = (p + j / na) / nr * Math.PI * 2, mid = Math.sin(Math.PI * j / na);
    const rr = R * Math.sin(s * 1.25) / Math.sin(1.25) * (1 - 0.06 * mid * s), y = top - 0.3 * (1 - Math.cos(s * 1.25)) / (1 - Math.cos(1.25)) - 0.035 * mid * s * s;
    pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
  }
  const per = (ns + 1) * (na + 1);
  for (let p = 0; p < nr; p++) for (let i = 0; i < ns; i++) for (let j = 0; j < na; j++) { const a = p * per + i * (na + 1) + j, b = a + na + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setIndex(idx); cg.computeVertexNormals();
  const canopy = new THREE.Mesh(cg, nylon); canopy.castShadow = true; g.add(canopy);
  // ribs (thin rods just under the canopy) and the tip ferrules
  for (let p = 0; p < nr; p++) { const a = p / nr * Math.PI * 2, pts = []; for (let i = 0; i <= 8; i++) { const s = i / 8, rr = R * Math.sin(s * 1.25) / Math.sin(1.25), y = top - 0.3 * (1 - Math.cos(s * 1.25)) / (1 - Math.cos(1.25)) - 0.006; pts.push(V(Math.cos(a) * rr, y, Math.sin(a) * rr)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.0035, 4), steel));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), steel); tip.position.copy(pts[8]); g.add(tip);
    // stretchers from the runner up to mid-rib
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.3, 4), steel); const m = pts[4], r0 = V(0, top - 0.33, 0); st.position.copy(m).add(r0).multiplyScalar(0.5); st.lookAt(m); st.rotateX(Math.PI / 2); st.scale.y = m.distanceTo(r0) / 0.3; g.add(st); }
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, top + 0.06, 8), steel); shaft.position.y = (top + 0.06) / 2; g.add(shaft);
  const fer = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.06, 6), steel); fer.position.y = top + 0.08; g.add(fer);
  // the J handle (wood)
  const hp = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; hp.push(i === 0 ? V(0, 0.02, 0) : V(0.04 - 0.04 * Math.cos(a), -0.02 - 0.04 * Math.sin(a) * 1.1, 0)); }
  hp.unshift(V(0, 0.16, 0));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 20, 0.013, 8), wood));
  return g;
}

// a London double-decker (11.2 m x 2.55 m x 4.4 m), red, front toward +z, lit inside; destination "78 Peckham"
export function makeBus() {
  const g = new THREE.Group();
  const red = new THREE.MeshPhysicalMaterial({ color: '#b4141c', roughness: 0.32, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#0c0f12', roughness: 0.05, metalness: 0.2, clearcoat: 1, emissive: new THREE.Color('#fff1d6'), emissiveIntensity: 0.55 });
  const black = new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.6 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.85 });
  const Lb = 11.2, Wb = 2.55, Hb = 4.38;
  const shell = new THREE.Mesh(new RoundedBoxGeometry(Wb, Hb - 0.35, Lb, 4, 0.22), red); shell.position.y = 0.35 + (Hb - 0.35) / 2; shell.castShadow = true; g.add(shell);
  // window bands: lower deck 1.05-2.1 m, upper deck 2.55-3.75 m, sides and front; a curved panoramic front upstairs
  for (const [y0, y1] of [[1.05, 2.15], [2.6, 3.8]]) {
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.04, y1 - y0, Lb - 1.6), glass); w.position.set(s * (Wb / 2 + 0.005), (y0 + y1) / 2, -0.2); g.add(w); }
    const f = new THREE.Mesh(new THREE.BoxGeometry(Wb - 0.3, y1 - y0, 0.04), glass); f.position.set(0, (y0 + y1) / 2, Lb / 2 + 0.005); g.add(f);
    const b = new THREE.Mesh(new THREE.BoxGeometry(Wb - 0.5, (y1 - y0) * 0.7, 0.04), glass); b.position.set(0, (y0 + y1) / 2, -Lb / 2 - 0.005); g.add(b);
  }
  // window pillars over the side glass (every 1.4 m)
  for (const s of [-1, 1]) for (let z = -Lb / 2 + 1.4; z < Lb / 2 - 1; z += 1.4) for (const [y0, y1] of [[1.05, 2.15], [2.6, 3.8]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, y1 - y0, 0.09), red); p.position.set(s * (Wb / 2 + 0.02), (y0 + y1) / 2, z); g.add(p); }
  // destination blind (lit, front, above the windscreen)
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const cx = cv.getContext('2d');
  cx.fillStyle = '#050505'; cx.fillRect(0, 0, 512, 96); cx.fillStyle = '#ffb21a'; cx.font = 'bold 64px Inter, Arial, sans-serif'; cx.textBaseline = 'middle'; cx.fillText('78', 18, 50); cx.font = '600 52px Inter, Arial, sans-serif'; cx.fillText('Peckham', 130, 52);
  const dt = new THREE.CanvasTexture(cv); dt.colorSpace = THREE.SRGBColorSpace;
  const dest = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), new THREE.MeshBasicMaterial({ map: dt, color: new THREE.Color(2.2, 2.2, 2.2) })); dest.position.set(0, 2.35, Lb / 2 + 0.03); g.add(dest);
  // wheels, skirt, lights
  for (const z of [Lb / 2 - 2.4, -Lb / 2 + 2.6]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.32, 20), tyre); w.rotation.z = Math.PI / 2; w.position.set(s * (Wb / 2 - 0.15), 0.5, z); g.add(w); }
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(Wb + 0.02, 0.32, Lb - 0.4), black); skirt.position.y = 0.42; g.add(skirt);
  const hl = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6e8').multiplyScalar(6) }), tl = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1a12').multiplyScalar(6) });
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CircleGeometry(0.11, 14), hl); h.position.set(s * 0.95, 0.75, Lb / 2 + 0.03); g.add(h);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.5), tl); t.position.set(s * 1.05, 1.0, -Lb / 2 - 0.03); t.rotation.y = Math.PI; g.add(t); }
  g.userData.L = Lb; g.userData.headlights = [V(-0.95, 0.75, Lb / 2 + 0.1), V(0.95, 0.75, Lb / 2 + 0.1)];
  return g;
}
// a black cab (front toward +z): tall rounded body, glass, the TAXI sign lit orange
export function makeCab() {
  const g = new THREE.Group();
  const paintM = new THREE.MeshPhysicalMaterial({ color: '#0b0b0c', roughness: 0.25, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.05 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#090b0e', roughness: 0.05, clearcoat: 1 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.85 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.94, 1.0, 4.85, 4, 0.18), paintM); body.position.y = 0.75; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.75, 3.0, 4, 0.2), glass); cabin.position.set(0, 1.55, -0.35); g.add(cabin);
  const roof = new THREE.Mesh(new RoundedBoxGeometry(1.82, 0.1, 2.9, 3, 0.04), paintM); roof.position.set(0, 1.93, -0.35); g.add(roof);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffae2a').multiplyScalar(3.2) })); sign.position.set(0, 2.05, 0.7); g.add(sign);
  for (const z of [1.55, -1.45]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 18), tyre); w.rotation.z = Math.PI / 2; w.position.set(s * 0.86, 0.36, z); g.add(w); }
  const hl = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6e8').multiplyScalar(6) });
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), hl); h.position.set(s * 0.68, 0.82, 2.43); g.add(h); }
  g.userData.L = 4.85; g.userData.headlights = [V(-0.68, 0.82, 2.5), V(0.68, 0.82, 2.5)];
  return g;
}

// a feral pigeon (32 cm, wingspan 65 cm) with its wings up mid-flap; head toward +z. k = the wingbeat phase (0..1)
export function makePigeon() {
  const g = new THREE.Group();
  const grey = new THREE.MeshStandardMaterial({ color: '#6f7783', roughness: 0.75 });
  const dark = new THREE.MeshStandardMaterial({ color: '#3b414b', roughness: 0.7, side: THREE.DoubleSide });
  const neck = new THREE.MeshPhysicalMaterial({ color: '#4d5a52', roughness: 0.5, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 600] });
  const bodyPts = []; for (let i = 0; i <= 14; i++) { const u = i / 14, r = 0.075 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.7) + 0.004; bodyPts.push(new THREE.Vector2(r, u * 0.27 - 0.13)); }
  const body = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 16), grey); body.rotation.x = Math.PI / 2; body.scale.set(1, 1, 0.92); g.add(body);
  const nk = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), neck); nk.position.set(0, 0.035, 0.12); g.add(nk);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), grey); head.position.set(0, 0.07, 0.165); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.028, 6), new THREE.MeshStandardMaterial({ color: '#2c2a28', roughness: 0.5 })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.066, 0.205); g.add(beak);
  for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshStandardMaterial({ color: '#d4561a', roughness: 0.2 })); eye.position.set(s * 0.024, 0.078, 0.18); g.add(eye); }
  // tail fan
  const ts = new THREE.Shape([new THREE.Vector2(-0.025, 0), new THREE.Vector2(0.025, 0), new THREE.Vector2(0.06, -0.12), new THREE.Vector2(-0.06, -0.12)]);
  const tail = new THREE.Mesh(new THREE.ShapeGeometry(ts), dark); tail.rotation.x = Math.PI / 2 - 0.15; tail.position.set(0, 0.005, -0.12); g.add(tail);
  // wings: a feathered outline (primaries fanned at the tip), hinged at the shoulder
  const ws = new THREE.Shape(); ws.moveTo(0, 0.04); ws.lineTo(0.12, 0.05); ws.lineTo(0.26, 0.03);
  for (let i = 0; i < 6; i++) { const a = -0.25 - i * 0.12; ws.lineTo(0.3 + 0.03 * Math.cos(a), 0.02 - i * 0.022); ws.lineTo(0.26 + 0.02 * Math.cos(a), 0.0 - i * 0.022); }
  ws.lineTo(0.12, -0.11); ws.lineTo(0.02, -0.07); ws.lineTo(0, 0.04);
  const wg = new THREE.ShapeGeometry(ws, 4); wg.rotateX(-Math.PI / 2);
  const wl = new THREE.Group(), wr = new THREE.Group();
  const ml = new THREE.Mesh(wg, dark); ml.scale.x = -1; const mr = new THREE.Mesh(wg, dark);
  wl.add(ml); wr.add(mr); wl.position.set(-0.03, 0.04, 0.04); wr.position.set(0.03, 0.04, 0.04); g.add(wl, wr);
  g.flap = (k) => { const a = 0.9 * Math.cos(k * Math.PI * 2) + 0.15; wl.rotation.z = -a; wr.rotation.z = a; wl.rotation.y = 0.15; wr.rotation.y = -0.15; };
  g.flap(0.12);
  return g;
}

// the WTF: a cup of tea on its saucer hanging in mid-air, the tea frozen in a splash as it leaves the tilted cup
export function makeTeacup() {
  const g = new THREE.Group();
  const china = new THREE.MeshPhysicalMaterial({ color: '#f6f4ef', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  const rimM = new THREE.MeshStandardMaterial({ color: '#2a4f9e', roughness: 0.2, metalness: 0.2 });
  const tea = new THREE.MeshPhysicalMaterial({ color: '#7a3d12', roughness: 0.08, transmission: 0.25, thickness: 0.01, clearcoat: 1 });
  const cupPts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; cupPts.push(new THREE.Vector2(0.024 + 0.022 * Math.sin(u * 1.35) + 0.008 * u, u * 0.062)); }
  const inner = cupPts.slice().reverse().map((p) => new THREE.Vector2(p.x - 0.0025, Math.max(0.004, p.y)));
  const cup = new THREE.Mesh(new THREE.LatheGeometry([...cupPts, ...inner], 32), china); cup.castShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(cupPts[12].x - 0.0012, 0.0016, 6, 40), rimM); rim.rotation.x = Math.PI / 2; rim.position.y = 0.062;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0045, 8, 20, Math.PI * 1.3), china); handle.position.set(0.055, 0.036, 0); handle.rotation.z = -Math.PI * 0.65;
  const surf = new THREE.Mesh(new THREE.CircleGeometry(0.046, 28), tea); surf.rotation.x = -Math.PI / 2; surf.position.y = 0.045;
  const cupG = new THREE.Group(); cupG.add(cup, rim, handle, surf); g.add(cupG);
  const sauPts = [new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.03, 0.0), new THREE.Vector2(0.05, 0.004), new THREE.Vector2(0.075, 0.012), new THREE.Vector2(0.077, 0.015), new THREE.Vector2(0.073, 0.015), new THREE.Vector2(0.05, 0.008), new THREE.Vector2(0.03, 0.005), new THREE.Vector2(0.0, 0.005)];
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(sauPts, 40), china); saucer.position.y = -0.02; g.add(saucer);
  const srim = new THREE.Mesh(new THREE.TorusGeometry(0.0765, 0.0014, 6, 48), rimM); srim.rotation.x = Math.PI / 2; srim.position.y = -0.006; g.add(srim);
  // the splash: a ribbon of tea leaving the lip, breaking into droplets (frozen)
  cupG.rotation.z = 0.55; cupG.position.set(0, 0.012, 0);
  const lip = V(-0.045, 0.072, 0).applyAxisAngle(V(0, 0, 1), 0.55).add(V(0, 0.012, 0));
  const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(lip.clone().add(V(-0.09 * u, 0.03 * u - 0.07 * u * u, 0.012 * Math.sin(u * 3)))); }
  const ribbon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.006, 8), tea); g.add(ribbon);
  for (let i = 0; i < 14; i++) { const u = 0.7 + i * 0.05, d = new THREE.Mesh(new THREE.SphereGeometry(0.0025 + 0.003 * ((i * 37) % 10) / 10, 8, 6), tea);
    d.position.copy(lip).add(V(-0.09 * u - 0.01 * (i % 3), 0.03 * u - 0.07 * u * u - 0.004 * (i % 4), 0.012 * Math.sin(u * 3) + 0.006 * ((i % 5) - 2))); g.add(d); }
  return g;
}
