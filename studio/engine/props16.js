// Props for post 10 (Giza): your phone with a live compass app, and the WTF, a drinks vending machine standing alone in
// the desert that keeps glowing through the blackout (its cable just ends in the sand).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// a phone (71.5 x 146.7 x 7.8 mm), screen on +z, long axis +y. g.draw({ heading, field, label }) repaints the compass app:
// heading = where magnetic north is on the dial (degrees, the dial turns so its N points there; the readout is the phone's own heading), field in microtesla
export function makePhone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.0715, 0.1467, 0.0078, 4, 0.0035), new THREE.MeshPhysicalMaterial({ color: '#2a2c31', roughness: 0.32, metalness: 0.7, clearcoat: 0.5 }));
  g.add(body);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 1050; const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.0672, 0.1420), new THREE.MeshPhysicalMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.25, roughness: 0.06, metalness: 0, clearcoat: 1 }));
  scr.position.z = 0.0040; g.add(scr);
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 16), new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.1 })); cam.rotation.x = Math.PI / 2; cam.position.set(0.024, 0.062, -0.0045); g.add(cam);
  g.screen = scr; g.tex = tex;
  g.draw = ({ heading = 0, field = 43, label = '' }) => {
    const W = cv.width, H = cv.height; ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#060607'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8e8ea'; ctx.font = '600 26px Inter, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('20:40', 34, 50);
    ctx.textAlign = 'right'; ctx.fillText('87%', W - 34, 50); ctx.textAlign = 'center';
    ctx.font = '700 40px Inter, Arial, sans-serif'; ctx.fillText('Compass', W / 2, 130);
    const cx = W / 2, cy = 410, R = 200;   // (a gap under the dial where the caption sits)
    // lubber line (the phone's heading) at the top
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(cx, cy - R - 40); ctx.lineTo(cx - 12, cy - R - 14); ctx.lineTo(cx + 12, cy - R - 14); ctx.fill();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-heading * Math.PI / 180);
    for (let a = 0; a < 360; a += 3) { const big = a % 30 === 0, mid = a % 15 === 0; ctx.strokeStyle = big ? '#ffffff' : '#8a8a90'; ctx.lineWidth = big ? 4 : 2;
      const r0 = R - (big ? 30 : mid ? 20 : 12); ctx.beginPath(); ctx.moveTo(Math.sin(a * Math.PI / 180) * r0, -Math.cos(a * Math.PI / 180) * r0); ctx.lineTo(Math.sin(a * Math.PI / 180) * R, -Math.cos(a * Math.PI / 180) * R); ctx.stroke(); }
    ctx.font = '700 44px Inter, Arial, sans-serif';
    for (const [l, a] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) { ctx.save(); ctx.rotate(a * Math.PI / 180); ctx.fillStyle = l === 'N' ? '#ff3b30' : '#ffffff'; ctx.fillText(l, 0, -R + 78); ctx.restore(); }
    ctx.font = '500 22px Inter, Arial, sans-serif'; ctx.fillStyle = '#b0b0b6';
    for (let a = 30; a < 360; a += 30) { if (a % 90 === 0) continue; ctx.save(); ctx.rotate(a * Math.PI / 180); ctx.fillText(String(a), 0, -R + 62); ctx.restore(); }
    // the needle: red to north
    ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.moveTo(0, -R + 100); ctx.lineTo(-14, 0); ctx.lineTo(14, 0); ctx.fill();
    ctx.fillStyle = '#d8d8dc'; ctx.beginPath(); ctx.moveTo(0, R - 100); ctx.lineTo(-14, 0); ctx.lineTo(14, 0); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1c1c1f'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    const hd = ((Math.round(-heading) % 360) + 360) % 360, card = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(hd / 45) % 8];
    ctx.fillStyle = '#ffffff'; ctx.font = '300 92px Inter, Arial, sans-serif'; ctx.fillText(`${hd}° ${card}`, cx, 850);
    ctx.font = '500 28px Inter, Arial, sans-serif'; ctx.fillStyle = Math.abs(field) < 8 ? '#ff453a' : '#9a9aa0';
    ctx.fillText(`Magnetic field: ${field.toFixed(1)} µT`, cx, 905);
    if (label) { ctx.fillStyle = '#ff453a'; ctx.font = '600 30px Inter, Arial, sans-serif'; ctx.fillText(label, cx, 958); }
    tex.needsUpdate = true;
  };
  g.draw({});
  return g;
}

// a drinks vending machine (1.0 x 1.83 x 0.75 m), front on +z, feet on y = 0: red body, lit sign, a glass window with
// five shelves of cans and bottles lit from inside, buttons, coin and note slots, the flap; its cable runs off into the sand
export function makeVending() {
  const g = new THREE.Group();
  const red = new THREE.MeshPhysicalMaterial({ color: '#b3161c', roughness: 0.35, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.5, metalness: 0.4 });
  // the body: a deep back box, then the front frame around the window recess (the shelves sit in the recess)
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.83, 0.45, 4, 0.03), red); body.position.set(0, 0.915, -0.15); body.castShadow = true; body.receiveShadow = true; g.add(body);
  for (const [w, h, x, y] of [[1.0, 0.26, 0, 1.70], [1.0, 0.53, 0, 0.265], [0.07, 1.04, -0.465, 1.05], [0.27, 1.04, 0.365, 1.05]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), red); m.position.set(x, y, 0.225); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  // the lit sign on top of the front
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 96; const sx = sc.getContext('2d');
  sx.fillStyle = '#d4141c'; sx.fillRect(0, 0, 512, 96); sx.fillStyle = '#ffffff'; sx.font = '800 54px Inter, Arial, sans-serif'; sx.textAlign = 'center'; sx.fillText('COLD DRINKS', 256, 68);
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.17), new THREE.MeshStandardMaterial({ map: st, emissive: '#ffffff', emissiveMap: st, emissiveIntensity: 1.5, roughness: 0.3 }));
  sign.position.set(0, 1.68, 0.3755); g.add(sign);
  // the window: a lit back panel, shelves, cans and bottles, a glass pane in front
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 1.0), new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#eef4ff', emissiveIntensity: 1.1 })); back.position.set(-0.1, 1.05, 0.08); g.add(back);
  const shelfM = new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.3, metalness: 0.8 });
  const canG = new THREE.CylinderGeometry(0.032, 0.032, 0.12, 20), botG = new THREE.CylinderGeometry(0.03, 0.03, 0.16, 20);
  const canM = new THREE.MeshPhysicalMaterial({ roughness: 0.25, metalness: 0.6, clearcoat: 0.6, emissive: '#ffffff', emissiveIntensity: 0.12 });
  const N = 5 * 7, cans = new THREE.InstancedMesh(canG, canM, N), o = new THREE.Object3D(), C = new THREE.Color();
  const hues = [[0.0, 0.85, 0.45], [0.58, 0.8, 0.45], [0.33, 0.7, 0.4], [0.12, 0.9, 0.5], [0.0, 0.0, 0.85], [0.75, 0.6, 0.45], [0.08, 0.95, 0.5]];
  let k = 0;
  for (let row = 0; row < 5; row++) { const y = 0.63 + row * 0.2;
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.3), shelfM); sh.position.set(-0.1, y - 0.07, 0.2); g.add(sh);
    for (let i = 0; i < 7; i++) { o.position.set(-0.37 + i * 0.09, y, 0.25); o.rotation.set(0, i * 0.7, 0); o.scale.setScalar(1); o.updateMatrix(); cans.setMatrixAt(k, o.matrix);
      const hh = hues[(i + row * 3) % hues.length]; C.setHSL(hh[0], hh[1], hh[2]); cans.setColorAt(k, C); k++; } }
  g.add(cans);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.04), new THREE.MeshPhysicalMaterial({ color: '#dfe8ef', roughness: 0.1, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 0.35, clearcoatRoughness: 0.15, depthWrite: false }));
  glass.position.set(-0.1, 1.05, 0.377); g.add(glass);
  for (const [w, h, x, y] of [[0.7, 0.03, -0.1, 1.575], [0.7, 0.03, -0.1, 0.525], [0.03, 1.08, -0.435, 1.05], [0.03, 1.08, 0.235, 1.05]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), dark); m.position.set(x, y, 0.381); g.add(m); }   // window trim
  // the control column: lit selection buttons, a small display, coin and note slots; the dispenser flap below
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.04, 0.02), dark); panel.position.set(0.37, 1.05, 0.376); g.add(panel);
  const btnM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#7fe0ff', emissiveIntensity: 1.4 });
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.012), btnM); b.position.set(0.37, 1.45 - i * 0.06, 0.39); g.add(b); }
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.05), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff4a3a', emissiveIntensity: 1.2 })); disp.position.set(0.37, 1.02, 0.388); g.add(disp);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.01), new THREE.MeshStandardMaterial({ color: '#c0c4ca', metalness: 1, roughness: 0.3 })); slot.position.set(0.37, 0.9, 0.39); g.add(slot);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.03), dark); flap.position.set(-0.05, 0.3, 0.38); g.add(flap);
  // the cable: out of the back, across the sand, ending in a plug (nothing to plug it into)
  const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(new THREE.Vector3(0.3 + u * 2.6, i === 0 ? 0.25 : 0.012, -0.38 - u * 1.8 + 0.25 * Math.sin(u * 5))); }
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.006, 6), new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 0.6 })); g.add(cable);
  const plug = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.05), new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.5 })); plug.position.copy(pts[20]).add(new THREE.Vector3(0.0, 0.012, -0.02)); g.add(plug);
  // its own light on the sand round it
  const L = new THREE.PointLight('#e8f0ff', 1.4, 9, 2); L.position.set(-0.1, 0.75, 0.75); g.add(L);
  g.light = L;
  return g;
}
