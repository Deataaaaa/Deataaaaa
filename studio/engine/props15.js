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
  const steel = new THREE.MeshStandardMaterial({ color: '#b4b8bd', roughness: 0.32, metalness: 0.55 });
  const wood = new THREE.MeshStandardMaterial({ color: '#6b4428', roughness: 0.4 });
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
  const hl = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6e8').multiplyScalar(1.6) }), tl = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1a12').multiplyScalar(1.8) });
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
  const hl = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6e8').multiplyScalar(1.6) });
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
  // tea: dark amber, glowing where the lamps behind it shine through (else it reads as a black wire at the blue hour)
  const tea = new THREE.MeshPhysicalMaterial({ color: '#6b3a12', roughness: 0.03, transmission: 0.5, thickness: 0.006, attenuationColor: new THREE.Color('#a0601c'), attenuationDistance: 0.02,
    clearcoat: 1, ior: 1.34, emissive: new THREE.Color('#9c6224'), emissiveIntensity: 0.16 });
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
  // the ribbon thins as it stretches away from the lip (radius 5.5 -> 1.5 mm), then breaks into beads
  const curve = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(curve, 24, 0.0042, 8), tp = tg.attributes.position, c = V(0, 0, 0), q = V(0, 0, 0);
  for (let i = 0; i <= 24; i++) { curve.getPointAt(i / 24, c); const k = (5.5 - 4.0 * i / 24) / 4.2;
    for (let j = 0; j <= 8; j++) { const n = i * 9 + j; q.fromBufferAttribute(tp, n).sub(c).multiplyScalar(k).add(c); tp.setXYZ(n, q.x, q.y, q.z); } }
  tg.computeVertexNormals();
  const ribbon = new THREE.Mesh(tg, tea); g.add(ribbon);
  for (let i = 0; i < 18; i++) { const u = 0.62 + i * 0.03, d = new THREE.Mesh(new THREE.SphereGeometry(0.0018 + 0.0022 * ((i * 37) % 10) / 10, 8, 6), tea);
    d.position.copy(lip).add(V(-0.09 * u - 0.01 * (i % 3), 0.03 * u - 0.07 * u * u - 0.004 * (i % 4), 0.012 * Math.sin(u * 3) + 0.006 * ((i % 5) - 2))); g.add(d); }
  return g;
}

// a herring gull (forward +x, up +y, left wing +z), for birds seen close: smooth white body and head, yellow beak, grey wings
// bent at the wrist with black tips and a white trailing edge. g.pose(a): shoulder angle a (rad, + = wings down), the hands
// follow with a bit more; userData { wl, wr } like beach.js's makeGull
export function makeGull2() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#f1f1ec', roughness: 0.75 });
  const prof = [[0, -0.3], [0.03, -0.26], [0.055, -0.18], [0.07, -0.08], [0.074, 0.03], [0.064, 0.12], [0.046, 0.18], [0.04, 0.2]].map(([r, h]) => new THREE.Vector2(r, h));
  const bodyG = new THREE.LatheGeometry(prof, 20); bodyG.rotateZ(-Math.PI / 2); bodyG.scale(1, 0.86, 0.92);
  const body = new THREE.Mesh(bodyG, white); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), white); head.scale.set(1.15, 1, 0.95); head.position.set(0.235, 0.025, 0); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.055, 8), new THREE.MeshStandardMaterial({ color: '#e3b62e', roughness: 0.45 }));
  beak.rotation.z = -Math.PI / 2; beak.position.set(0.305, 0.018, 0); g.add(beak);
  for (const s of [1, -1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.2 })); eye.position.set(0.262, 0.042, 0.036 * s); g.add(eye); }
  const tail = new THREE.BufferGeometry(); tail.setAttribute('position', new THREE.Float32BufferAttribute([-0.2, 0, 0.045, -0.36, 0, 0.075, -0.375, 0, 0, -0.2, 0, 0.045, -0.375, 0, 0, -0.2, 0, -0.045, -0.2, 0, -0.045, -0.375, 0, 0, -0.36, 0, -0.075], 3)); tail.computeVertexNormals();
  g.add(new THREE.Mesh(tail, new THREE.MeshStandardMaterial({ color: '#ecece6', roughness: 0.8, side: THREE.DoubleSide })));
  const wingM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, side: THREE.DoubleSide });
  const grey = new THREE.Color('#8e98a2'), blk = new THREE.Color('#17171a'), wht = new THREE.Color('#eeeeea');
  // a wing panel: spanwise ns x chordwise 2 quads, from lead(s)/trail(s) at z = span * s, coloured by col(s, c)
  const panel = (ns, span, lead, trail, col) => { const P = [], C = [], I = [];
    for (let i = 0; i <= ns; i++) { const s = i / ns; for (let j = 0; j <= 2; j++) { const c = j / 2, x = lead(s) + (trail(s) - lead(s)) * c;
      P.push(x, 0.012 * Math.sin(Math.PI * c) * (1 - 0.5 * s), span * s); const k = col(s, c); C.push(k.r, k.g, k.b); } }
    for (let i = 0; i < ns; i++) for (let j = 0; j < 2; j++) { const a = i * 3 + j, b = a + 3; I.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.setIndex(I); geo.computeVertexNormals(); return new THREE.Mesh(geo, wingM); };
  const tmpCol = new THREE.Color();
  const arm = () => panel(3, 0.32, (s) => 0.065 - 0.01 * s, (s) => -0.11, (s, c) => tmpCol.copy(grey).lerp(wht, c > 0.9 ? 0.7 : 0));
  const hand = () => panel(4, 0.44, (s) => 0.055 - 0.16 * s * s, (s) => -0.11 - 0.045 * s, (s, c) => tmpCol.copy(grey).lerp(blk, THREE.MathUtils.smoothstep(s, 0.5, 0.68)).lerp(wht, c > 0.9 && s < 0.5 ? 0.6 : 0));
  const side = (sgn) => { const w = new THREE.Group(), h = new THREE.Group(); w.position.set(0.02, 0.025, 0.045 * sgn); w.add(arm()); h.position.z = 0.32; h.add(hand()); w.add(h); w.scale.z = sgn; w.userData.hand = h; g.add(w); return w; };
  const wl = side(1), wr = side(-1);
  g.userData = { wl, wr };
  g.pose = (a) => { wl.rotation.x = a; wr.rotation.x = -a; wl.userData.hand.rotation.x = a * 0.5 + 0.05; wr.userData.hand.rotation.x = a * 0.5 + 0.05; };
  g.pose(0.1);
  return g;
}

// the WTF: a goldfish swimming in a ball of water hanging in mid-air (its bowl is gone; in honey-thick air the water just
// stays where it was), a few drops frozen round it. g.update(t): the fish swims (tail beat, sway, a slow loop inside the
// ball) and the ball's skin wobbles, all functions of t. Ball radius 0.15 m; the fish is 9 cm long.
export function makeGoldfishBall() {
  const g = new THREE.Group();
  // the water: a clear glassy skin (lamp glints, a faint tint) plus a fresnel rim, so the ball reads against the night
  // (transmission rendered it black here)
  const water = new THREE.MeshPhysicalMaterial({ color: '#cfeff2', transparent: true, opacity: 0.14, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, depthWrite: false });
  const rimM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN, vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vN, vV; void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.5); gl_FragColor = vec4(vec3(0.42, 0.62, 0.68) * f * 0.7, 1.0); }` });
  const ballGeo = new THREE.SphereGeometry(0.15, 64, 40), base = ballGeo.attributes.position.array.slice();
  const ball = new THREE.Mesh(ballGeo, water); ball.renderOrder = 2; g.add(ball);
  const rim = new THREE.Mesh(ballGeo, rimM); rim.renderOrder = 3; g.add(rim);
  // the fish: a lathe body along +x, orange-gold with a pearly belly, translucent fins, a forked tail
  const fish = new THREE.Group(); g.add(fish);
  const skin = new THREE.MeshPhysicalMaterial({ color: '#f26a12', roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15, sheen: 0.6, sheenColor: new THREE.Color('#ffd27a'), sheenRoughness: 0.4 });
  const prof = [[0, -0.045], [0.006, -0.042], [0.014, -0.032], [0.019, -0.016], [0.02, 0.0], [0.018, 0.016], [0.012, 0.03], [0.006, 0.038], [0.0015, 0.042]].map(([r, h]) => new THREE.Vector2(r, h));
  const bg = new THREE.LatheGeometry(prof, 24); bg.rotateZ(-Math.PI / 2); bg.scale(1, 1.15, 0.72);
  // a paler belly (vertex colours)
  const bc = [], bp = bg.attributes.position; for (let i = 0; i < bp.count; i++) { const k = THREE.MathUtils.smoothstep(-bp.getY(i), 0.004, 0.02); bc.push(1, 1 - 0.25 * k, 1 - 0.55 * k); }
  bg.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3)); skin.vertexColors = true;
  const body = new THREE.Mesh(bg, skin); fish.add(body);
  const fin = new THREE.MeshPhysicalMaterial({ color: '#ff8a2a', roughness: 0.4, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
  const sh = (pts) => new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
  const tail = new THREE.Group(); tail.position.set(-0.042, 0, 0); fish.add(tail);
  const tg = sh([[0, 0], [-0.02, 0.022], [-0.042, 0.034], [-0.036, 0.012], [-0.03, 0], [-0.036, -0.012], [-0.042, -0.034], [-0.02, -0.022]]); tail.add(new THREE.Mesh(tg, fin));
  const dors = new THREE.Mesh(sh([[0.012, 0], [0.0, 0.016], [-0.02, 0.012], [-0.026, 0]]), fin); dors.position.set(0, 0.021, 0); fish.add(dors);
  const anal = new THREE.Mesh(sh([[0, 0], [-0.008, -0.01], [-0.022, -0.008], [-0.024, 0]]), fin); anal.position.set(-0.012, -0.02, 0); fish.add(anal);
  const pecs = []; for (const s of [1, -1]) { const p = new THREE.Mesh(sh([[0, 0], [-0.006, -0.012], [-0.016, -0.009], [-0.012, 0]]), fin); p.position.set(0.016, -0.008, 0.012 * s); p.rotation.x = 0.9 * s; fish.add(p); pecs.push(p); }
  const eyeW = new THREE.MeshStandardMaterial({ color: '#e8d27a', roughness: 0.3, metalness: 0.3 }), eyeB = new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.05, clearcoat: 1 });
  for (const s of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 12, 10), eyeW); e.position.set(0.03, 0.006, 0.0118 * s); fish.add(e);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 10, 8), eyeB); pu.position.set(0.031, 0.006, 0.0142 * s); fish.add(pu); }
  // a few drops frozen round the ball, two small bubbles inside
  const dropM = water.clone(); dropM.opacity = 0.3;
  const R = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 9; i++) { const dg = new THREE.SphereGeometry(0.006 + 0.01 * R(i), 16, 12), d = new THREE.Mesh(dg, dropM), a = R(i + 20) * 6.28, e = (R(i + 40) - 0.4) * 1.6, r = 0.2 + 0.09 * R(i + 60);
    d.position.set(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); d.add(new THREE.Mesh(dg, rimM)); g.add(d); }
  const bubM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.0, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false });
  const bubs = [0, 1].map((i) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.004 + 0.002 * i, 12, 8), bubM); g.add(b); return b; });
  g.update = (t) => {
    // the skin: two slow lobes of wobble (a ball of water this size is never quite round)
    const p = ballGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const k = 1 + 0.035 * Math.sin(2.1 * t + 9 * y) * Math.cos(1.7 * t + 7 * x) + 0.02 * Math.sin(1.3 * t + 8 * z) - 0.03 * (y / 0.15) * (y / 0.15) * 0.5;
      p.setXYZ(i, x * k * 1.02, y * k * 0.97, z * k * 1.02); }
    p.needsUpdate = true; ballGeo.computeVertexNormals();
    // the fish loops slowly inside the ball, beating its tail
    const a = 0.55 * t, rr = 0.05;
    fish.position.set(Math.cos(a) * rr, 0.012 * Math.sin(0.9 * t), -Math.sin(a) * rr);
    fish.rotation.set(0.08 * Math.sin(1.3 * t), a + Math.PI / 2 + 0.12 * Math.sin(7.5 * t), 0.05 * Math.sin(0.7 * t));   // heading along the loop, swaying with the beat
    tail.rotation.y = 0.55 * Math.sin(7.5 * t - 1.0);
    pecs.forEach((pp, i) => { pp.rotation.y = 0.5 * Math.sin(5.0 * t + i * 3.1); });
    bubs.forEach((b, i) => { const u = (t * 0.25 + i * 0.5) % 1; b.position.set(0.04 - 0.08 * i, -0.1 + 0.2 * u, 0.03); b.visible = u < 0.95; });
  };
  g.update(0);
  return g;
}

// the WTF (v4): someone in an inflatable T-rex costume, mid-jump. Shiny green vinyl (a paler belly), a big head with a felt
// grin and teeth, tiny arms, a tail; the wearer's jeans and white trainers stick out below. Feet on y = 0, facing +z, 2.3 m
// tall. g.pose(hop 0..1 = crouch..airborne, arms -1..1): legs tuck, arms flail, the tail swings.
export function makeTrex() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const vinyl = new THREE.MeshPhysicalMaterial({ color: '#4c9a2c', roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: new THREE.Color('#c8f08a') });
  const belly = new THREE.MeshPhysicalMaterial({ color: '#b9c97a', roughness: 0.4, clearcoat: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: '#f4f1e6', roughness: 0.5 }), black = new THREE.MeshPhysicalMaterial({ color: '#0b0b0b', roughness: 0.15, clearcoat: 1 });
  const denim = new THREE.MeshStandardMaterial({ color: '#2d4060', roughness: 0.85 }), shoe = new THREE.MeshStandardMaterial({ color: '#efefef', roughness: 0.6 });
  const blob = (m, r, sx, sy, sz, x, y, z, seg = 32) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; return o; };
  body.add(blob(vinyl, 0.5, 1.05, 1.25, 1.0, 0, 1.15, 0));                       // torso (the air-filled pear)
  body.add(blob(belly, 0.42, 0.95, 1.15, 0.55, 0, 1.08, 0.3));                   // belly panel
  const neck = blob(vinyl, 0.26, 1, 1.2, 1, 0, 1.78, 0.18); body.add(neck);
  const head = new THREE.Group(); head.position.set(0, 2.02, 0.32); body.add(head);
  head.add(blob(vinyl, 0.24, 1.0, 0.85, 1.6, 0, 0.02, 0.12));                    // skull + snout
  const jaw = new THREE.Group(); jaw.position.set(0, -0.08, -0.05); head.add(jaw);
  jaw.add(blob(belly, 0.2, 0.95, 0.45, 1.6, 0, -0.04, 0.17));
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.2, tt = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), white);
    tt.position.set(Math.sin(a) * 0.19, -0.075, 0.17 + Math.cos(a) * 0.3); tt.rotation.x = Math.PI; head.add(tt); }
  for (const s of [1, -1]) { head.add(blob(white, 0.05, 1, 1, 0.7, 0.15 * s, 0.13, 0.1, 16)); head.add(blob(black, 0.028, 1, 1, 0.7, 0.165 * s, 0.135, 0.13, 12));
    head.add(blob(black, 0.012, 1, 1, 1, 0.06 * s, 0.07, 0.49, 8)); }               // eyes, nostrils
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshPhysicalMaterial({ color: '#111418', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 }));
  win.position.set(0, 1.72, 0.43); win.rotation.x = -0.15; body.add(win);       // the wearer's mesh window in the neck
  const arms = [1, -1].map((s) => { const a = new THREE.Group(); a.position.set(0.3 * s, 1.45, 0.38); body.add(a);
    a.add(blob(vinyl, 0.07, 1, 1.8, 1, 0, -0.1, 0.03, 16)); a.add(blob(vinyl, 0.05, 1, 1, 1.4, 0, -0.22, 0.08, 12)); return a; });
  const tail = []; let prev = body; for (let i = 0; i < 6; i++) { const seg = new THREE.Group(); seg.position.set(0, i ? -0.03 : 0.8, i ? -0.2 : -0.35); prev.add(seg);
    seg.add(blob(vinyl, 0.24 * (1 - i * 0.14), 1, 0.9, 1.3, 0, 0, -0.08, 20)); tail.push(seg); prev = seg; }
  // the costume's thighs and the wearer's legs below
  const legs = [1, -1].map((s) => { const L = new THREE.Group(); L.position.set(0.24 * s, 0.62, 0); g.add(L);
    L.add(blob(vinyl, 0.2, 1, 1.3, 1.05, 0, 0.05, 0, 24));
    const shin = new THREE.Group(); shin.position.set(0, -0.2, 0); L.add(shin);
    const jean = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.36, 14), denim); jean.position.y = -0.18; shin.add(jean);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.27), shoe); sh.position.set(0, -0.38, 0.05); shin.add(sh);
    return { L, shin }; });
  g.pose = (hop, armK = 0, tailK = 0) => {
    legs.forEach(({ L, shin }, i) => { L.rotation.x = -0.9 * hop; shin.rotation.x = 1.5 * hop; });
    body.position.y = -0.12 * (1 - hop); body.rotation.x = 0.12 * hop;
    arms.forEach((a, i) => { a.rotation.x = -0.6 - 0.9 * armK * (i ? 1 : 0.7); a.rotation.z = (i ? -1 : 1) * 0.4 * armK; });
    tail.forEach((s, i) => { s.rotation.y = 0.12 * tailK; s.rotation.x = 0.06 + 0.05 * hop; });
    jaw.rotation.x = 0.25 + 0.15 * hop; head.rotation.x = -0.1 * hop;
  };
  g.pose(0.5);
  return g;
}

// the WTF (v5): a yellow rubber duck hanging in the air beside you, 11 cm long, glossy vinyl, faces +x
export function makeRubberDuck() {
  const g = new THREE.Group();
  const vinyl = new THREE.MeshPhysicalMaterial({ color: '#ffcf1a', roughness: 0.26, clearcoat: 0.9, clearcoatRoughness: 0.12, sheen: 0.3, sheenColor: new THREE.Color('#fff2a0') });
  const orange = new THREE.MeshPhysicalMaterial({ color: '#ff7a10', roughness: 0.3, clearcoat: 0.8 });
  const black = new THREE.MeshPhysicalMaterial({ color: '#080808', roughness: 0.08, clearcoat: 1 });
  const blob = (m, r, sx, sy, sz, x, y, z) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 22), m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  blob(vinyl, 0.045, 1.25, 0.8, 0.95, 0, 0, 0);                  // body
  blob(vinyl, 0.022, 1.2, 1.1, 1, -0.05, 0.016, 0).rotation.z = 0.6;   // tail flick
  blob(vinyl, 0.03, 1, 1, 1, 0.032, 0.044, 0);                   // head
  blob(orange, 0.016, 1.3, 0.45, 1.1, 0.062, 0.038, 0);          // beak
  for (const s of [1, -1]) { blob(black, 0.0055, 1, 1.2, 0.8, 0.05, 0.055, 0.019 * s); blob(vinyl, 0.012, 1.4, 0.5, 1, -0.005, 0.012, 0.038 * s); }   // eyes, wings
  return g;
}
