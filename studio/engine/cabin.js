// Airliner cabin (A320-class, 3+3 economy): sidewalls with real window reveals and 3-pane windows,
// seats, overhead bins, passenger service units with drop-down oxygen masks, LED cove lighting,
// seat-back screens, the wing and the cloud deck outside. Axis: forward = -z, floor y = 0, centreline x = 0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './core.js';

export const PITCH = 0.79;          // seat pitch (31 in)
export const FRAME = 0.533;         // window/frame pitch (21 in)
export const WIN = { w: 0.235, h: 0.335, y: 1.02, r: 0.085 };   // outer pane opening
export const SIDE_X = 1.86;         // sidewall at the window belt

function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
function noiseFill(g, w, h, base, amp, seed = 1, scale = 1) {
  const r = rng(seed); const img = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = (r() - 0.5) * amp; img.data[i * 4] = base[0] + v; img.data[i * 4 + 1] = base[1] + v; img.data[i * 4 + 2] = base[2] + v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
}
export function roundedRectShape(w, h, r, cx = 0, cy = 0) {
  const s = new THREE.Shape(); const x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
// points of a rounded rectangle outline (for lofting the window reveal)
function rrPoints(w, h, r, n = 48) {
  const s = roundedRectShape(w, h, r); return s.getSpacedPoints(n).slice(0, n);
}
// loft between two outlines (inner opening at z0, outer at z1) -> the window tunnel
function loft(ptsA, za, ptsB, zb) {
  const n = ptsA.length, pos = [], idx = [], uv = [];
  for (let i = 0; i < n; i++) { pos.push(ptsA[i].x, ptsA[i].y, za); uv.push(i / n, 0); }
  for (let i = 0; i < n; i++) { pos.push(ptsB[i].x, ptsB[i].y, zb); uv.push(i / n, 1); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i, j, n + i, j, n + j, n + i); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ---------------- materials ----------------
export function cabinMaterials() {
  const plasticTex = canvasTex(256, 256, (g, w, h) => noiseFill(g, w, h, [232, 231, 227], 10, 3), [6, 6]);
  const fabric = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, [46, 55, 70], 16, 5);
    g.globalAlpha = 0.18; g.strokeStyle = '#8da0bd';
    for (let y = 0; y < h; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x < w; x += 4) { g.globalAlpha = 0.08; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }, [3, 3]);
  const carpet = canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, [52, 60, 76], 22, 7);
    g.globalAlpha = 0.25; g.fillStyle = '#7f8fae';
    for (let y = 0; y < h; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < w; x += 64) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }
  }, [2, 12]);
  return {
    plastic: new THREE.MeshStandardMaterial({ color: '#ecebe7', map: plasticTex, roughness: 0.55, metalness: 0.0 }),
    plasticWarm: new THREE.MeshStandardMaterial({ color: '#e4e1db', map: plasticTex, roughness: 0.5 }),
    dark: new THREE.MeshStandardMaterial({ color: '#3a3d43', roughness: 0.6 }),
    seatShell: new THREE.MeshStandardMaterial({ color: '#5d636c', roughness: 0.42, metalness: 0.05 }),
    fabric: new THREE.MeshStandardMaterial({ color: '#ffffff', map: fabric, roughness: 0.95 }),
    headrest: new THREE.MeshStandardMaterial({ color: '#d8dbe0', roughness: 0.9 }),
    carpet: new THREE.MeshStandardMaterial({ color: '#ffffff', map: carpet, roughness: 1.0 }),
    metal: new THREE.MeshStandardMaterial({ color: '#9aa0a8', metalness: 0.85, roughness: 0.32 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#cfe3f0', transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2 }),
    shade: new THREE.MeshStandardMaterial({ color: '#f1f0ec', roughness: 0.6 }),
    yellow: new THREE.MeshStandardMaterial({ color: '#f2c218', roughness: 0.55 }),
    bag: new THREE.MeshPhysicalMaterial({ color: '#e6f5ea', transparent: true, opacity: 0.22, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide }),
    tube: new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.4, transparent: true, opacity: 0.85 }),
  };
}

// ---------------- the sidewall belt with window cut-outs (one panel per frame bay) ----------------
function sidewallPanel(M, side, z) {
  // a flat panel 0.533 m wide x 0.86 m tall with a rounded opening, slightly tilted inwards at the top
  const ow = WIN.w + 0.075, oh = WIN.h + 0.1, or = WIN.r + 0.04;
  const s = new THREE.Shape(); s.moveTo(-FRAME / 2, -0.43); s.lineTo(FRAME / 2, -0.43); s.lineTo(FRAME / 2, 0.43); s.lineTo(-FRAME / 2, 0.43); s.closePath();
  s.holes.push(roundedRectShape(ow, oh, or));
  const geo = new THREE.ShapeGeometry(s, 24);
  const m = new THREE.Mesh(geo, M.plastic); m.receiveShadow = true; m.castShadow = true;
  const g = new THREE.Group(); g.add(m);
  // window reveal: a tapered tunnel from the panel opening out to the panes
  const rev = new THREE.Mesh(loft(rrPoints(ow, oh, or), 0, rrPoints(WIN.w + 0.02, WIN.h + 0.02, WIN.r + 0.008), -0.11), M.plasticWarm); rev.receiveShadow = true; rev.castShadow = true;
  rev.material = M.plasticWarm; rev.geometry.computeVertexNormals(); g.add(rev);
  // panel orientation: normal points into the cabin
  g.position.set(side * SIDE_X, WIN.y, z); g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; g.rotateX(-0.06);
  return { group: g, panel: m, reveal: rev };
}

// three panes + shade for one window (local frame: z toward the cabin is +)
export function windowAssembly(M) {
  const g = new THREE.Group();
  const paneGeo = (w, h, r, t) => new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), { depth: t, bevelEnabled: false, curveSegments: 10 });
  const outer = new THREE.Mesh(paneGeo(WIN.w + 0.03, WIN.h + 0.03, WIN.r + 0.012, 0.012), M.glass.clone()); outer.position.z = -0.135;
  const middle = new THREE.Mesh(paneGeo(WIN.w + 0.018, WIN.h + 0.018, WIN.r + 0.006, 0.008), M.glass.clone()); middle.position.z = -0.115;
  const inner = new THREE.Mesh(paneGeo(WIN.w + 0.07, WIN.h + 0.095, WIN.r + 0.035, 0.004), M.glass.clone()); inner.position.z = -0.004;
  inner.material.opacity = 0.06;
  // breather hole in the middle pane (lower part)
  const hole = new THREE.Mesh(new THREE.RingGeometry(0.0018, 0.0042, 20), new THREE.MeshBasicMaterial({ color: '#2a2f36', transparent: true, opacity: 0.85 })); hole.position.set(0, -WIN.h * 0.36, -0.106); g.add(hole);
  // shade (slides down from the top)
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w + 0.05, WIN.h + 0.06), M.shade); shade.position.set(0, WIN.h + 0.07, -0.05); shade.userData.open = 1;
  g.add(outer, middle, inner, shade);
  return { group: g, outer, middle, inner, hole, shade };
}

// ---------------- seats ----------------
function makeSeat(M, r) {
  const g = new THREE.Group();
  const cush = new THREE.Mesh(new RoundedBoxGeometry(0.43, 0.11, 0.47, 3, 0.035), M.fabric); cush.position.set(0, 0.45, 0.02); g.add(cush);
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.43, 0.66, 0.1, 3, 0.035), M.fabric); back.position.set(0, 0.83, 0.25); back.rotation.x = -0.12; g.add(back);
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.2, 0.03, 2, 0.012), M.headrest); head.position.set(0, 1.07, 0.218); head.rotation.x = -0.12; g.add(head);
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.72, 0.04, 3, 0.015), M.seatShell); shell.position.set(0, 0.8, 0.312); shell.rotation.x = -0.12; g.add(shell);
  const pan = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.45), M.dark); pan.position.set(0, 0.38, 0.02); g.add(pan);
  // tray table + seat-back screen on the back of the seat (faces the row behind: +z)
  const tray = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.24, 0.012, 2, 0.01), M.seatShell); tray.position.set(0, 0.73, 0.338); tray.rotation.x = -0.12; g.add(tray);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.125), new THREE.MeshBasicMaterial({ color: '#0b0c0e' })); scr.position.set(0, 0.98, 0.335); scr.rotation.x = -0.12; g.add(scr);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, screen: scr };
}
function makeArmrest(M) {
  const a = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.05, 0.42, 2, 0.015), M.dark); a.position.y = 0.66; a.castShadow = true;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.05), M.dark); post.position.set(0, 0.53, 0.16);
  const g = new THREE.Group(); g.add(a, post); return g;
}

// ---------------- oxygen mask (cup + reservoir bag + tube) ----------------
export function makeMask(M) {
  // local frame: the cup's opening faces +z (towards the face), the reservoir bag and tube go up (+y)
  const g = new THREE.Group();
  const cupGeo = new THREE.CylinderGeometry(0.026, 0.047, 0.055, 18, 1, true); cupGeo.rotateX(-Math.PI / 2);
  const cup = new THREE.Mesh(cupGeo, M.yellow); g.add(cup);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.0045, 6, 22), M.yellow); rim.position.z = 0.0275; g.add(rim);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), M.yellow); cap.position.z = -0.0275; cap.rotation.y = Math.PI; g.add(cap);
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 10), M.bag); bag.scale.set(0.75, 1.35, 0.6); bag.position.set(0, 0.07, -0.02); g.add(bag);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------- the whole cabin ----------------
export function makeCabin({ rowsAhead = 8, rowsBehind = 3, withWing = true } = {}) {
  const M = cabinMaterials();
  const g = new THREE.Group();
  const z0 = -rowsAhead * PITCH - 1.2, z1 = rowsBehind * PITCH + 1.2, L = z1 - z0, zc = (z0 + z1) / 2;
  // floor + aisle carpet
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3.4, L), M.carpet); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zc); floor.receiveShadow = true; g.add(floor);
  // lower sidewall (dado) + upper transition to the bins, as extruded profiles along z
  const prof = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], p[1]); return s; };
  for (const side of [-1, 1]) {
    const lower = new THREE.Shape(); lower.moveTo(1.62, 0); lower.lineTo(1.82, 0.56); lower.lineTo(1.84, 0.6); lower.lineTo(1.86, 0.6); lower.lineTo(1.66, 0); lower.closePath();
    const lg = new THREE.ExtrudeGeometry(lower, { depth: L, bevelEnabled: false }); const lm = new THREE.Mesh(lg, M.plastic);
    lm.scale.x = side; lm.position.set(0, 0, z0); lm.receiveShadow = true; lm.castShadow = true; g.add(lm);
    // air-return grille strip at the floor
    const gr = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, L), M.dark); gr.position.set(side * 1.66, 0.08, zc); g.add(gr);
    // upper sidewall: from the window belt top up to the bin underside
    const up = new THREE.Shape(); up.moveTo(1.83, 1.45); up.quadraticCurveTo(1.8, 1.6, 1.62, 1.66); up.lineTo(1.62, 1.69); up.quadraticCurveTo(1.83, 1.62, 1.87, 1.45); up.closePath();
    const um = new THREE.Mesh(new THREE.ExtrudeGeometry(up, { depth: L, bevelEnabled: false, curveSegments: 12 }), M.plastic); um.scale.x = side; um.position.set(0, 0, z0); um.castShadow = true; um.receiveShadow = true; g.add(um);
  }
  // window belt panels + windows on both sides
  const windows = [];
  for (const side of [-1, 1]) {
    for (let z = z0 + FRAME / 2; z < z1; z += FRAME) {
      const p = sidewallPanel(M, side, z); g.add(p.group);
      const w = windowAssembly(M); p.group.add(w.group);
      windows.push({ side, z, panel: p, ...w, root: p.group });
    }
  }
  // fuselage shell outside (blocks light except through windows), with an inner skin colour
  const shellMat = new THREE.MeshStandardMaterial({ color: '#8f949b', roughness: 0.8, side: THREE.BackSide });
  // only the part above the window belt: the belt panels (with their window holes) close the sides
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(2.02, 2.02, L, 40, 1, true, 1.821, 2.641), shellMat); shell.rotation.x = Math.PI / 2; shell.position.set(0, 0.95, zc); shell.castShadow = true; g.add(shell);
  // windows punch through the shell visually: dark rim discs are not needed because the reveal hides the shell edge
  // overhead bins
  const bins = [];
  for (const side of [-1, 1]) {
    for (let z = z0 + 0.8; z < z1 - 0.4; z += 1.6) {
      const bin = new THREE.Group();
      const box = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.42, 1.58, 3, 0.03), M.plastic); box.position.set(0, 0, 0); bin.add(box);
      const door = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.4, 1.54, 3, 0.025), M.plasticWarm); door.position.set(-side * 0.29, -0.01, 0); bin.add(door);
      const latch = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.05, 0.16, 2, 0.008), M.dark); latch.position.set(-side * 0.325, 0.12, 0); bin.add(latch);
      bin.position.set(side * 1.42, 1.9, z); bin.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.add(bin); bins.push(bin);
    }
  }
  // ceiling: centre panel with a soft curve, LED cove strips along the bin tops
  const ceil = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, L, 48, 1, true, -0.42, 0.84), new THREE.MeshStandardMaterial({ color: '#f2f1ed', roughness: 0.7, side: THREE.BackSide }));
  ceil.rotation.z = 0; ceil.rotation.x = Math.PI / 2; ceil.rotation.y = 0; ceil.position.set(0, -0.15, zc);
  // orient the arc to the top
  ceil.rotation.set(Math.PI / 2, 0, 0); ceil.geometry.rotateY(Math.PI); ceil.receiveShadow = true; g.add(ceil);
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.25, 1.45) });
  for (const side of [-1, 1]) { const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, L), ledMat); led.position.set(side * 1.13, 2.13, zc); g.add(led); }
  // seats + passenger service units (PSU) with mask doors
  const seats = [], psus = [], screens = [];
  const xs = [-1.42, -0.96, -0.5, 0.5, 0.96, 1.42];
  for (let r = -rowsAhead; r <= rowsBehind; r++) {
    const z = r * PITCH;
    xs.forEach((x, i) => { const s = makeSeat(M, r); s.group.position.set(x, 0, z); g.add(s.group); seats.push({ row: r, col: 'ABCDEF'[i], x, z, ...s }); screens.push(s.screen); });
    for (const x of [-1.65, -1.19, -0.73, -0.27, 0.27, 0.73, 1.19, 1.65]) { const a = makeArmrest(M); a.position.set(x, 0, z + 0.04); g.add(a); }
    for (const side of [-1, 1]) {
      const psu = new THREE.Group(); psu.position.set(side * 1.02, 1.665, z - 0.05);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.5), M.plasticWarm); panel.receiveShadow = true; psu.add(panel);
      for (let k = 0; k < 3; k++) {
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 14), M.metal); lamp.position.set(side * (0.2 - k * 0.15), -0.02, 0.1); psu.add(lamp);
        const gasp = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), M.dark); gasp.position.set(side * (0.2 - k * 0.15), -0.02, -0.05); psu.add(gasp);
      }
      const doorPivot = new THREE.Group(); doorPivot.position.set(0, -0.016, -0.17); psu.add(doorPivot);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.008, 0.13), M.plastic); door.position.z = 0.065; doorPivot.add(door);
      const masks = [];
      for (let k = 0; k < 4; k++) { const mk = makeMask(M); mk.visible = false; mk.userData.x = side * (0.18 - k * 0.12); g.add(mk); masks.push(mk); }
      g.add(psu); psus.push({ row: r, side, group: psu, doorPivot, masks, anchor: new THREE.Vector3(side * 1.02, 1.64, z - 0.15) });
    }
  }
  for (const [zw, dir] of [[z0, 1], [z1, -1]]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), M.plasticWarm); wall.position.set(0, 1.2, zw); wall.rotation.y = dir > 0 ? 0 : Math.PI; wall.receiveShadow = true; g.add(wall);
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.72, 1.9, 0.04, 3, 0.02), dir > 0 ? new THREE.MeshStandardMaterial({ color: '#39404c', roughness: 0.9 }) : M.seatShell);
    door.position.set(0, 0.95, zw + dir * 0.02); g.add(door);
    const ex = document.createElement('canvas'); ex.width = 128; ex.height = 48; const eg = ex.getContext('2d'); eg.fillStyle = '#0b5d2b'; eg.fillRect(0, 0, 128, 48); eg.fillStyle = '#e8fff0'; eg.font = 'bold 30px sans-serif'; eg.textAlign = 'center'; eg.textBaseline = 'middle'; eg.fillText('EXIT', 64, 26);
    const et = new THREE.CanvasTexture(ex); et.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.11), new THREE.MeshBasicMaterial({ map: et, toneMapped: false })); sign.position.set(0, 2.05, zw + dir * 0.03); sign.rotation.y = dir > 0 ? 0 : Math.PI; g.add(sign);
  }
  // the view: wing + cloud deck + sky are added by the episode (they depend on altitude/attitude)
  return { group: g, M, windows, seats, psus, bins, screens, z0, z1 };
}

// ---------------- the world outside: sky dome, cloud deck far below, the wing ----------------
export function makeOutside() {
  const g = new THREE.Group();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: new THREE.Vector3(-0.75, 0.42, -0.5).normalize() }, uDim: { value: 1 }, uVeil: { value: 0 }, uVeilCol: { value: new THREE.Color('#cfd6df') } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uSun, uVeilCol; uniform float uDim, uVeil; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 zen = vec3(0.07,0.20,0.52), hor = vec3(0.62,0.76,0.92), low = vec3(0.78,0.84,0.9);
        vec3 c = mix(hor, zen, pow(smoothstep(-0.02, 0.85, h), 0.55)); c = mix(c, low, smoothstep(0.0, -0.08, h));
        float s = max(dot(d, uSun), 0.0); c += vec3(1.0,0.93,0.8) * (pow(s, 8.0)*0.35 + pow(s, 120.0)*1.5) + vec3(1.0) * smoothstep(0.9993, 0.9997, s) * 6.0;
        gl_FragColor = vec4(mix(c * uDim, uVeilCol, uVeil), 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; g.add(sky);
  // cloud deck: procedural, domain-warped fbm, lit from the sun, fading into haze at the horizon
  const cloudMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uOff: { value: new THREE.Vector2() }, uSun: skyMat.uniforms.uSun, uCam: { value: new THREE.Vector3() }, uDim: { value: 1 }, uVeil: skyMat.uniforms.uVeil, uVeilCol: skyMat.uniforms.uVeilCol, uGround: { value: new THREE.Color(0.10, 0.18, 0.30) }, uCover: { value: 0.43 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uTime, uDim, uVeil, uCover; uniform vec2 uOff; uniform vec3 uSun, uCam, uVeilCol, uGround; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<6;i++){ s+=a*n2(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
      void main(){ vec2 p = vW.xz * 0.00042 + uOff;
        vec2 q = vec2(fbm(p), fbm(p + vec2(5.2,1.3)));
        float d = fbm(p + 1.6*q);
        float cov = smoothstep(uCover, uCover + 0.25, d);
        float lit = 0.72 + 0.4 * smoothstep(0.45, 0.8, fbm(p*1.9 + 0.8*q + uSun.xz*0.6));
        vec3 col = mix(vec3(0.55,0.6,0.68), vec3(1.0,0.99,0.97), lit) * mix(0.82, 1.06, cov);
        vec3 sea = uGround * (0.85 + 0.3 * fbm(p * 6.0));
        float dist = length(vW.xz - uCam.xz);
        float haze = smoothstep(9000.0, 60000.0, dist);
        vec3 c = mix(sea, col, cov); c = mix(c, vec3(0.70,0.80,0.92), haze);
        gl_FragColor = vec4(mix(c * uDim, uVeilCol, uVeil), 1.0); }`,
  });
  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(240000, 240000, 1, 1), cloudMat); clouds.rotation.x = -Math.PI / 2; clouds.position.y = -8600; clouds.frustumCulled = false; g.add(clouds);
  return { group: g, sky, skyMat, clouds, cloudMat };
}

// a seated passenger seen from behind/side: head, hair, shoulders (only the top shows above the seat back)
export function makePassenger(r) {
  const g = new THREE.Group();
  const skins = ['#f1c7a5', '#d9a07a', '#a8724e', '#6e4630', '#e8b996'], hairs = ['#1d1612', '#3b2a1e', '#6b4a2b', '#b08a55', '#8c8a86', '#120d0b'], tops = ['#2d3a4f', '#6b2d2d', '#3d4a3a', '#22252b', '#7a6a55', '#4a4f6b'];
  const pick = (a) => a[Math.floor(r() * a.length)];
  const skin = new THREE.MeshStandardMaterial({ color: pick(skins), roughness: 0.6 }), hair = new THREE.MeshStandardMaterial({ color: pick(hairs), roughness: 0.75 }), top = new THREE.MeshStandardMaterial({ color: pick(tops), roughness: 0.9 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 14), skin); head.scale.set(0.9, 1.12, 1.0); head.position.y = 0.3; g.add(head);
  const long = r() < 0.4;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14, 0, Math.PI * 2, 0, long ? Math.PI * 0.75 : Math.PI * 0.55), hair); cap.scale.set(0.95, 1.12, 1.05); cap.position.set(0, 0.315, 0.008); g.add(cap);
  if (long) { const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.14, 4, 10), hair); back.position.set(0, 0.2, 0.05); back.scale.set(1.1, 1, 0.6); g.add(back); }
  const ears = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), skin); ears.scale.set(0.5, 1, 0.8); ears.position.set(0.088, 0.29, 0); g.add(ears); const e2 = ears.clone(); e2.position.x = -0.088; g.add(e2);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 12), skin); neck.position.y = 0.17; g.add(neck);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 12), top); torso.scale.set(1.25, 1, 0.65); torso.position.y = -0.1; g.add(torso);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.head = head; return g;
}

export function makeWing() {
  // swept wing seen from a left window: tapered, thin, with a sharklet and a flap track fairing or two
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: '#dfe3e8', roughness: 0.38, metalness: 0.15 });
  const grey = new THREE.MeshStandardMaterial({ color: '#a9b0b9', roughness: 0.45, metalness: 0.3 });
  const span = 15.5, root = 6.2, tip = 1.6, sweep = 0.47;
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(span * Math.tan(sweep), span); shape.lineTo(span * Math.tan(sweep) + tip, span); shape.lineTo(root, 0); shape.closePath();
  const wg = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 });
  const w = new THREE.Mesh(wg, paint); w.rotation.x = Math.PI / 2; w.castShadow = true; w.receiveShadow = true;
  // shape x = chordwise (toward the tail), shape y = spanwise (outboard)
  const holder = new THREE.Group(); holder.add(w);
  // sharklet
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.7, 2.2); sh.lineTo(1.3, 2.2); sh.lineTo(1.6, 0); sh.closePath();
  const shark = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }), paint); shark.position.set(span * Math.tan(sweep), -0.05, span); holder.add(shark);
  for (let i = 1; i <= 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 1.4, 4, 8), grey); const s = i * span / 4.2; f.rotation.x = Math.PI / 2; f.rotation.z = Math.PI / 2; f.position.set(s * Math.tan(sweep) + root - (root - tip) * s / span - 0.2, 0.18, s); holder.add(f); }
  g.add(holder);
  return { group: g, holder };
}
