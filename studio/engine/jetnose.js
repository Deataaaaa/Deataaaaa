// 1990 reconstruction (British Airways 5390): the forward fuselage of a 1960s twin-jet, generic livery,
// the captain's windscreen gone, the captain folded back over the roof and two crew hands holding him.
import * as THREE from 'three';

export const NOSE_LEN = 4.4, FUS_R = 1.6;
const LEN = 16.4;                        // nose + 12 m of cabin

// monotone cubic through control points (keeps the nose outline free of wiggles)
function pchip(xs, ys) {
  const n = xs.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); d.push((ys[i + 1] - ys[i]) / h[i]); }
  m[0] = d[0]; m[n - 1] = 0;
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue;
    const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  return (x) => {
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const t = Math.min(1, Math.max(0, (x - xs[i]) / h[i])), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
// side profile (top and bottom lines) and half-width, s = metres back from the nose tip
const TOP = pchip([0, 0.15, 0.5, 1.0, 1.4, 1.8, 2.2, 2.8, 3.6, 4.4], [-0.45, -0.12, 0.22, 0.48, 0.70, 1.00, 1.25, 1.45, 1.57, 1.60]);
const BOT = pchip([0, 0.15, 0.5, 1.0, 1.6, 2.4, 3.4, 4.4], [-0.45, -0.75, -0.98, -1.17, -1.33, -1.47, -1.56, -1.60]);
const WID = pchip([0, 0.15, 0.5, 1.0, 1.6, 2.4, 3.4, 4.4], [0, 0.40, 0.75, 1.03, 1.25, 1.43, 1.55, 1.60]);
function section(s) {
  if (s >= NOSE_LEN) return [0, FUS_R, FUS_R];
  const t = TOP(s), b = BOT(s); return [(t + b) / 2, (t - b) / 2, WID(s)];
}
// θ = 0 on top, negative on the left (captain's) side; the nose points to -z
export function nosePoint(th, s, out = new THREE.Vector3()) {
  const [yc, a, b] = section(Math.max(0, s));
  return out.set(b * Math.sin(th), yc + a * Math.cos(th), s - NOSE_LEN);
}
export function noseFrame(th, s) {
  const e = 0.003, s0 = Math.max(s, e);
  const p = nosePoint(th, s);
  const ts = nosePoint(th, s0 + e).sub(nosePoint(th, s0 - e)).normalize();     // toward the tail
  const tt = nosePoint(th + e, s0).sub(nosePoint(th - e, s0)).normalize();     // around, toward +θ
  const n = new THREE.Vector3().crossVectors(ts, tt).normalize();             // outward
  return { p, n, ts, tt };
}
// θ on the left (sign -1) or right (+1) side for a given height y at station s
function thetaAt(y, s, side) { const [yc, a] = section(s); return side * Math.acos(Math.max(-1, Math.min(1, (y - yc) / a))); }

// texture space: u around (θ from -π to π), v along s. The nose model spends its texels on the cockpit, the
// side model (2018) on the cabin windows; each builder sets VMAP before painting and meshing.
const VMAP_NOSE = (s) => (s < 6 ? 0.72 * s / 6 : 0.72 + 0.28 * (s - 6) / (LEN - 6));
const VMAP_SIDE = (s) => (s < 6 ? 0.22 * s / 6 : s < 12.5 ? 0.22 + 0.64 * (s - 6) / 6.5 : 0.86 + 0.14 * (s - 12.5) / (LEN - 12.5));
let VMAP = VMAP_NOSE;
const vOf = (s) => VMAP(s);
const TW = 4096, TH = 4096;
const tx = (th, w = TW) => ((th + Math.PI) / (2 * Math.PI)) * w;
const ty = (s, h = TH) => (1 - vOf(s)) * h;

// cockpit windows, as [θ, s] corners (left side; mirrored on the right). The first one is the captain's windscreen.
const PANES = [
  [[-0.045, 1.42], [-0.6, 1.56], [-0.56, 2.17], [-0.045, 2.1]],
  [[-0.7, 1.64], [-1.14, 1.82], [-1.08, 2.3], [-0.66, 2.25]],
  [[-0.78, 2.42], [-1.15, 2.42], [-1.13, 2.88], [-0.82, 2.84]],
];
// sampled outline of a pane with rounded corners, in [θ, s]
function paneOutline(c, inset = 0, steps = 10) {
  const ctr = c.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
  const shrink = (p) => { const k = 1 - inset; return [ctr[0] + (p[0] - ctr[0]) * k, ctr[1] + (p[1] - ctr[1]) * k]; };
  const q = c.map(shrink), out = [], r = 0.18;
  for (let i = 0; i < 4; i++) {
    const a = q[(i + 3) % 4], b = q[i], d = q[(i + 1) % 4];
    const p0 = [b[0] + (a[0] - b[0]) * r, b[1] + (a[1] - b[1]) * r], p2 = [b[0] + (d[0] - b[0]) * r, b[1] + (d[1] - b[1]) * r];
    for (let k = 0; k <= steps; k++) { const t = k / steps, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * b[1] + t * t * p2[1]]); }
  }
  return out;
}
const mirror = (pts) => pts.map(([th, s]) => [-th, s]);

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function pathTS(g, pts, w, h) { g.beginPath(); pts.forEach(([th, s], i) => (i ? g.lineTo(tx(th, w), ty(s, h)) : g.moveTo(tx(th, w), ty(s, h)))); g.closePath(); }

function paintSkin({ cockpitCut = true, broken = null } = {}) {
  const [cc, g] = canvas(TW, TH);
  const [rc, gr] = canvas(2048, 2048);   // roughness (green channel)
  const [bc, gb] = canvas(2048, 2048);   // bump (panel lines, rivets)
  const [ac, ga] = canvas(1024, 1024);   // alpha: the missing windscreen
  g.fillStyle = '#eceef0'; g.fillRect(0, 0, TW, TH);
  gr.fillStyle = 'rgb(0,97,0)'; gr.fillRect(0, 0, 2048, 2048);
  gb.fillStyle = '#808080'; gb.fillRect(0, 0, 2048, 2048);
  ga.fillStyle = '#ffffff'; ga.fillRect(0, 0, 1024, 1024);
  // faint paint variation so the white is not flat
  { let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1400; i++) { const x = r() * TW, y = r() * TH, rr = 20 + r() * 140; g.fillStyle = `rgba(${r() < 0.5 ? '120,124,130' : '255,255,255'},${0.018 + r() * 0.02})`; g.beginPath(); g.ellipse(x, y, rr * 2.2, rr, 0, 0, 7); g.fill(); } }
  // grey belly, radome a touch warmer
  const band = (sideTh, s0, s1, color, ctx = g, w = TW, h = TH) => { ctx.fillStyle = color; ctx.fillRect(tx(sideTh[0], w), ty(s1, h), tx(sideTh[1], w) - tx(sideTh[0], w), ty(s0, h) - ty(s1, h)); };
  band([-Math.PI, -Math.PI + 1.05], 0.95, LEN, '#c4c9cf'); band([Math.PI - 1.05, Math.PI], 0.95, LEN, '#c4c9cf');
  band([-Math.PI, Math.PI], 0, 0.95, '#e4e3df');
  // cheatline: navy band with a red pinstripe at window height, sweeping down toward the radome
  const lineY = (s) => (s >= 5.2 ? 0.18 : 0.18 - 0.5 * Math.pow((5.2 - s) / 4.25, 1.3));
  const halfH = (s) => (s >= 4 ? 0.165 : 0.165 * (0.45 + 0.55 * Math.max(0, (s - 0.95) / 3.05)));
  for (const side of [-1, 1]) {
    const strip = (yOff0, yOff1, color, scaleH = true) => {
      const top = [], bot = [];
      for (let s = 1.05; s <= LEN + 0.01; s += 0.05) {
        const hh = scaleH ? halfH(s) : 0.165, y0 = lineY(s) + yOff0 * hh / 0.165, y1 = lineY(s) + yOff1 * hh / 0.165;
        top.push([thetaAt(y1, s, side), s]); bot.push([thetaAt(y0, s, side), s]);
      }
      const pts = top.concat(bot.reverse()); pathTS(g, pts, TW, TH); g.fillStyle = color; g.fill();
    };
    strip(-0.165, 0.165, '#1d2b4f');
    strip(-0.245, -0.205, '#b8232d');
  }
  // passenger windows and the forward door (left side), and the right-side windows
  for (const side of [-1, 1]) {
    const thc = thetaAt(0.2, 8, side), dth = 0.17 / FUS_R;
    for (let s = 6.35; s < LEN - 0.3; s += 0.51) {
      for (const [col, k, rough] of [['#a7aeb6', 1.0, 97], ['#151c25', 0.78, 18]]) {
        const ws = 0.12 * k, wt = dth * k, r = 0.045 * k;
        const x0 = tx(thc - wt), x1 = tx(thc + wt), y0 = ty(s + ws), y1 = ty(s - ws);
        g.fillStyle = col; g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, (r / (2 * Math.PI * FUS_R)) * TW); g.fill();
        gr.fillStyle = `rgb(0,${rough},0)`; gr.beginPath(); gr.roundRect(tx(thc - wt, 2048), ty(s + ws, 2048), tx(thc + wt, 2048) - tx(thc - wt, 2048), ty(s - ws, 2048) - ty(s + ws, 2048), 6); gr.fill();
      }
    }
  }
  { // forward passenger door outline + handle (left side)
    const s0 = 4.95, s1 = 5.82, th0 = thetaAt(1.0, 5.4, -1), th1 = thetaAt(-0.85, 5.4, -1);
    const x0 = tx(Math.min(th0, th1)), x1 = tx(Math.max(th0, th1)), y0 = ty(s1), y1 = ty(s0);
    g.strokeStyle = 'rgba(70,76,84,0.85)'; g.lineWidth = 3; g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, 30); g.stroke();
    gb.strokeStyle = '#3c3c3c'; gb.lineWidth = 3; gb.beginPath(); gb.roundRect(tx(Math.min(th0, th1), 2048), ty(s1, 2048), tx(Math.max(th0, th1), 2048) - tx(Math.min(th0, th1), 2048), ty(s0, 2048) - ty(s1, 2048), 15); gb.stroke();
    g.fillStyle = '#7c838c'; g.fillRect(tx(thetaAt(0.05, 5.4, -1)) - 30, ty(5.66) - 10, 60, 20);
  }
  // panel lines (paint + bump) and rivet rows
  const ring = (s, strong) => {
    g.strokeStyle = strong ? 'rgba(90,96,104,0.55)' : 'rgba(120,126,134,0.32)'; g.lineWidth = strong ? 4 : 3;
    g.beginPath(); g.moveTo(0, ty(s)); g.lineTo(TW, ty(s)); g.stroke();
    gb.strokeStyle = '#4a4a4a'; gb.lineWidth = 2; gb.beginPath(); gb.moveTo(0, ty(s, 2048)); gb.lineTo(2048, ty(s, 2048)); gb.stroke();
    gb.fillStyle = '#9a9a9a'; for (let x = 0; x < 2048; x += 7) { gb.fillRect(x, ty(s, 2048) + 4, 2, 2); }
  };
  ring(0.95, true); [3.05, 4.4, 6.0, 7.6, 9.2, 10.8, 12.4, 14.0, 15.6].forEach((s) => ring(s, false));
  for (const th of [-2.2, -1.15, -0.62, 0, 0.62, 1.15, 2.2]) {
    g.strokeStyle = 'rgba(120,126,134,0.26)'; g.lineWidth = 3; g.beginPath(); g.moveTo(tx(th), ty(3.05)); g.lineTo(tx(th), ty(LEN)); g.stroke();
    gb.strokeStyle = '#555555'; gb.lineWidth = 2; gb.beginPath(); gb.moveTo(tx(th, 2048), ty(3.05, 2048)); gb.lineTo(tx(th, 2048), ty(LEN, 2048)); gb.stroke();
  }
  // grime streaking back from the cockpit windows
  for (const side of [-1, 1]) for (let k = 0; k < 18; k++) {
    const th = side * (0.08 + k * 0.06), s0 = 2.3 + (k % 3) * 0.1;
    const grd = g.createLinearGradient(0, ty(s0), 0, ty(s0 + 1.6)); grd.addColorStop(0, 'rgba(110,112,116,0.10)'); grd.addColorStop(1, 'rgba(110,112,116,0)');
    g.fillStyle = grd; g.fillRect(tx(th) - 6, ty(s0 + 1.6), 12, ty(s0) - ty(s0 + 1.6));
  }
  // cockpit windows: black rubber + dark frame, then the glass (glossy)
  PANES.forEach((c, i) => {
    for (const pts of [paneOutline(c, -0.1), mirror(paneOutline(c, -0.1))]) { pathTS(g, pts, TW, TH); g.fillStyle = '#2c3036'; g.fill(); pathTS(gb, pts, 2048, 2048); gb.fillStyle = '#9c9c9c'; gb.fill(); }
    for (const pts of [paneOutline(c, 0.02), mirror(paneOutline(c, 0.02))]) {
      pathTS(g, pts, TW, TH); const yy = ty((c[0][1] + c[2][1]) / 2);
      const grd = g.createLinearGradient(0, yy - 120, 0, yy + 120); grd.addColorStop(0, '#202a36'); grd.addColorStop(1, '#0c1117'); g.fillStyle = grd; g.fill();
      pathTS(gr, pts, 2048, 2048); gr.fillStyle = 'rgb(0,12,0)'; gr.fill();
      pathTS(gb, pts, 2048, 2048); gb.fillStyle = '#808080'; gb.fill();
    }
  });
  // the missing pane: cut out of the skin (the frame stays)
  if (cockpitCut) { pathTS(ga, paneOutline(PANES[0], 0.02), 1024, 1024); ga.fillStyle = '#000000'; ga.fill(); }
  // a passenger window blown out by engine debris: scuffs and dents where the fragment hit, a ragged black hole
  if (broken !== null) {
    let seed = 41; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const thc = thetaAt(0.2, 8, -1), dth = 0.17 / FUS_R, sc = broken;
    for (let k = 0; k < 26; k++) {          // short scratches around the hole
      const a = r() * Math.PI * 2, d = 0.18 + r() * 0.16, th = thc + Math.cos(a) * d / FUS_R, s0 = sc + Math.sin(a) * d, len = 0.02 + r() * 0.06;
      g.strokeStyle = `rgba(${55 + r() * 30},${57 + r() * 30},${62 + r() * 30},${0.18 + r() * 0.25})`; g.lineWidth = 1.5 + r() * 2.5;
      g.beginPath(); g.moveTo(tx(th), ty(s0)); g.lineTo(tx(th + (r() - 0.5) * 0.03), ty(s0 + len)); g.stroke();
    }
    const dent = g.createRadialGradient(tx(thc + 0.08), ty(sc + 0.25), 4, tx(thc + 0.08), ty(sc + 0.25), 170);
    dent.addColorStop(0, 'rgba(60,62,66,0.45)'); dent.addColorStop(1, 'rgba(60,62,66,0)'); g.fillStyle = dent; g.fillRect(tx(thc + 0.08) - 180, ty(sc + 0.25) - 180, 360, 360);
    const hole = []; for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2, k = 1.08 + (r() - 0.4) * 0.3; hole.push([thc + Math.cos(a) * dth * 0.86 * k, sc + Math.sin(a) * 0.13 * k]); }
    pathTS(g, hole, TW, TH); g.fillStyle = '#030406'; g.fill();
    pathTS(gr, hole, 2048, 2048); gr.fillStyle = 'rgb(0,240,0)'; gr.fill();
    for (let k = 0; k < 9; k++) {   // shards of the outer pane still stuck in the frame
      const a = r() * Math.PI * 2, th = thc + Math.cos(a) * dth * 0.9, s0 = sc + Math.sin(a) * 0.135;
      g.fillStyle = `rgba(190,205,215,${0.5 + r() * 0.4})`; g.beginPath(); g.moveTo(tx(th), ty(s0)); g.lineTo(tx(th - Math.cos(a) * 0.03 + (r() - 0.5) * 0.02), ty(s0 - Math.sin(a) * 0.05)); g.lineTo(tx(th + (r() - 0.5) * 0.03), ty(s0 + (r() - 0.5) * 0.04)); g.closePath(); g.fill();
    }
  }
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; return t; };
  return { map: mk(cc, true), rough: mk(rc), bump: mk(bc), alpha: mk(ac) };
}

function skinGeometry({ s0 = 0, s1 = LEN, th0 = -Math.PI, th1 = Math.PI, nTh = 256, inset = 0 } = {}) {
  const ss = [];
  for (let k = 0; k <= 110; k++) { const s = NOSE_LEN * Math.pow(k / 110, 1.35); if (s >= s0 - 1e-6 && s <= s1) ss.push(s); }
  for (let s = NOSE_LEN + 0.5; s <= s1 + 1e-6; s += 0.5) if (s >= s0) ss.push(s);
  if (ss[0] > s0 + 1e-6) ss.unshift(s0);
  const pos = [], nor = [], uv = [], idx = [];
  for (const s of ss) for (let j = 0; j <= nTh; j++) {
    const th = th0 + (j / nTh) * (th1 - th0), f = noseFrame(th, Math.max(s, 0.0008));
    const p = nosePoint(th, s).addScaledVector(f.n, -inset);
    pos.push(p.x, p.y, p.z); nor.push(f.n.x, f.n.y, f.n.z); uv.push((th + Math.PI) / (2 * Math.PI), vOf(s));
  }
  for (let i = 0; i < ss.length - 1; i++) for (let j = 0; j < nTh; j++) { const a = i * (nTh + 1) + j, b = a + nTh + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  return geo;
}

// a soft sky/ground gradient for the paint and glass to reflect
function skyEnvironment(renderer) {
  const sc = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; void main(){ vec3 d = normalize(vP); float h = d.y;
      vec3 zen = vec3(0.16,0.32,0.62), hor = vec3(0.78,0.85,0.93), gnd = vec3(0.30,0.34,0.30);
      vec3 c = h > 0.0 ? mix(hor, zen, pow(h, 0.6)) : mix(hor * 0.85, gnd, pow(-h, 0.35));
      c += vec3(1.0,0.95,0.85) * pow(max(dot(d, normalize(vec3(-0.55,0.62,-0.55))), 0.0), 60.0) * 6.0;
      gl_FragColor = vec4(c, 1.0); }` });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), mat));
  const pm = new THREE.PMREMGenerator(renderer); const tex = pm.fromScene(sc, 0.01, 0.1, 100).texture; pm.dispose();
  return tex;
}

export function makeJetNose(renderer) {
  VMAP = VMAP_NOSE;
  const group = new THREE.Group();
  const tex = paintSkin();
  const paint = new THREE.MeshPhysicalMaterial({ map: tex.map, roughnessMap: tex.rough, roughness: 1, bumpMap: tex.bump, bumpScale: 1.2, alphaMap: tex.alpha, alphaTest: 0.5,
    metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.28, envMapIntensity: 0.9 });
  const skin = new THREE.Mesh(skinGeometry(), paint); skin.receiveShadow = true; group.add(skin);
  // cockpit interior seen through the hole: inner wall, glare shield, control column
  const dark = new THREE.MeshStandardMaterial({ color: '#25282c', roughness: 0.85, side: THREE.BackSide });
  const inner = new THREE.Mesh(skinGeometry({ s0: 0.9, s1: 5.2, th0: -1.9, th1: 1.9, nTh: 96, inset: 0.06 }), dark); group.add(inner);
  const panelM = new THREE.MeshStandardMaterial({ color: '#1b1d20', roughness: 0.7 });
  const glare = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.45), panelM); glare.position.set(0, 0.6, -2.58); group.add(glare);
  const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 8, 24, Math.PI * 1.3), panelM); yoke.position.set(-0.42, 0.3, -2.25); yoke.rotation.set(0.25, 0, Math.PI * 0.85); group.add(yoke);
  // frame around the missing pane (some depth at the cut edge)
  const rim = paneOutline(PANES[0], 0.0, 6).map(([th, s]) => { const f = noseFrame(th, s); return f.p.addScaledVector(f.n, -0.012); });
  const rimM = new THREE.MeshStandardMaterial({ color: '#3a3e44', roughness: 0.5, metalness: 0.4 });
  group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), 160, 0.022, 8, true), rimM));
  // wipers parked on the lower frames
  for (const side of [-1, 1]) {
    const a = noseFrame(side * 0.12, 1.5), b = noseFrame(side * 0.5, 1.6);
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 1), new THREE.MeshStandardMaterial({ color: '#202327', roughness: 0.5, metalness: 0.5 }));
    w.position.copy(a.p).add(b.p).multiplyScalar(0.5).addScaledVector(a.n, 0.012); w.scale.z = a.p.distanceTo(b.p); w.lookAt(b.p.clone().addScaledVector(a.n, 0.012)); group.add(w);
  }
  // a couple of antennas on the spine
  const antM = new THREE.MeshStandardMaterial({ color: '#d9dcdf', roughness: 0.45 });
  for (const s of [6.4, 9.8]) { const f = noseFrame(0, s); const ant = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.14), antM); ant.position.copy(f.p).addScaledVector(f.n, 0.1); ant.rotation.x = -0.35; group.add(ant); }
  const env = skyEnvironment(renderer);
  // where the captain is: the top edge of the missing pane
  const topMid = [(PANES[0][2][0] + PANES[0][3][0]) / 2, (PANES[0][2][1] + PANES[0][3][1]) / 2];
  const holeTop = noseFrame(topMid[0], topMid[1] - 0.04);
  const ctr = PANES[0].reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
  const holeCenter = noseFrame(ctr[0], ctr[1]);
  return { group, env, holeTop, holeCenter };
}

// Mixamo mannequin dressed as a 1990 airline captain: short-sleeved white shirt, tie, navy trousers, skin, hair.
// Colours go per vertex from the bone that drives it; the shirt flutters in the wind (vertex shader).
export function dressPilot(m, { skin = '#d4a284', hair = '#3a2b20', shirt = '#eef1f4', tie = '#1b2440', trousers = '#1e2638', shoes = '#121316' } = {}) {
  const C = (h) => new THREE.Color(h);   // hex is sRGB; Color stores it in the linear working space
  const cSkin = C(skin), cHair = C(hair), cShirt = C(shirt), cTie = C(tie), cTrou = C(trousers), cShoe = C(shoes), cBelt = C('#141414');
  const uT = { value: 0 };
  m.root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const g = o.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, n = pos.count;
    const names = o.skeleton.bones.map((b) => b.name.replace('mixamorig', '').replace(':', ''));
    const col = new Float32Array(n * 3), flap = new Float32Array(n), head = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
      const nm = names[best] || '', x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      let c = cShirt, f = 0;
      if (/Head|Eye/.test(nm)) { c = cSkin; head[i] = 1; }   // hair is drawn per pixel in the shader (smooth hairline)
      else if (/Neck/.test(nm)) c = y > 1.505 ? cSkin : cShirt;
      else if (/Hand|ForeArm/.test(nm)) c = cSkin;
      else if (/Foot|Toe/.test(nm)) c = cShoe;
      else if (/UpLeg|Leg/.test(nm)) c = cTrou;
      else if (/Arm/.test(nm)) { c = Math.abs(x) < 0.36 ? cShirt : cSkin; f = Math.abs(x) < 0.36 ? 1 : 0; }
      else if (y < 1.03) c = cTrou;
      else if (y < 1.065) c = cBelt;
      else { c = Math.abs(x) < 0.024 && z > 0.07 && y < 1.47 ? cTie : cShirt; f = 1; }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; flap[i] = f;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aFlap', new THREE.BufferAttribute(flap, 1)); g.setAttribute('aHead', new THREE.BufferAttribute(head, 1));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.66, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = uT; sh.uniforms.uHair = { value: cHair };
      sh.fragmentShader = 'uniform vec3 uHair;\nvarying vec3 vBind;\nvarying float vHead;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        if (vHead > 0.5) {   // hair: top of the head, and the back down to the nape (bind-pose metres, face toward +z)
          float hair = max(smoothstep(1.692, 1.704, vBind.y), smoothstep(0.03, 0.0, vBind.z) * smoothstep(1.578, 1.592, vBind.y));
          diffuseColor.rgb = mix(diffuseColor.rgb, uHair, hair);
        }`);
      sh.vertexShader = 'uniform float uT;\nattribute float aFlap;\nattribute float aHead;\nvarying vec3 vBind;\nvarying float vHead;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vBind = position; vHead = aHead;
        float ph = position.y * 23.0 + position.x * 17.0 + position.z * 13.0;
        transformed += normal * aFlap * (0.006 * sin(uT * 37.0 + ph) + 0.004 * sin(uT * 59.0 + ph * 1.7) + 0.008 * (0.5 + 0.5 * sin(uT * 6.0 + position.y * 5.0)));`);
    };
    o.material = mat; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
  });
  return { setTime: (t) => { uT.value = t; } };
}

// two forearms in navy sleeves, hands gripping the captain's belt from inside the cockpit
export function makeCrewHands() {
  const g = new THREE.Group();
  const sleeve = new THREE.MeshStandardMaterial({ color: '#1f2a44', roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: '#e0b394', roughness: 0.6 });
  const arms = [];
  for (const side of [-1, 1]) {
    const a = new THREE.Group();
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.32, 4, 12), sleeve); fore.position.y = -0.2; a.add(fore);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 14), new THREE.MeshStandardMaterial({ color: '#f1f2f4', roughness: 0.7 })); cuff.position.y = -0.02; a.add(cuff);
    const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.05, 4, 10), skin); palm.scale.set(1.25, 1, 0.6); palm.position.y = 0.05; a.add(palm);
    for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.05, 3, 8), skin); f.position.set((k - 1.5) * 0.021, 0.115, 0.012); f.rotation.x = 0.9; a.add(f); }
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.04, 3, 8), skin); th.position.set(side * 0.04, 0.06, 0.02); th.rotation.z = -side * 0.7; a.add(th);
    a.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(a); arms.push(a);
  }
  return { group: g, arms };
}

// ---------------- 2018 reconstruction (Southwest 1380): fuselage side, left wing, the failed engine ----------------
// lofted swept wing toward -x (root at the lower fuselage side), NACA-style section with a little camber
function wingGeometry({ span = 12.2, rootX = -1.35, rootY = -0.95, rootZ = 4.8, rootC = 4.0, tipC = 1.3, sweep = 0.47, dihedral = 0.105, tRoot = 0.13, tTip = 0.11, nS = 10, nC = 26 } = {}) {
  const sec = [];
  for (let i = 0; i <= nC; i++) { const x = 0.5 - 0.5 * Math.cos((i / nC) * Math.PI); sec.push(x); }
  const yt = (x, t) => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
  const yc = (x) => 0.025 * 4 * x * (1 - x);
  const ring = []; for (let i = nC; i >= 0; i--) ring.push([sec[i], 1]); for (let i = 1; i <= nC; i++) ring.push([sec[i], -1]);   // TE→LE on top, LE→TE below
  const pos = [], idx = [], R = ring.length;
  for (let k = 0; k <= nS; k++) {
    const f = k / nS, X = rootX - span * f, Y = rootY + span * f * dihedral, Zle = rootZ + span * f * sweep, c = rootC + (tipC - rootC) * f, t = tRoot + (tTip - tRoot) * f;
    for (const [x, sd] of ring) pos.push(X, Y + c * (yc(x) + sd * yt(x, t)), Zle + c * x);
  }
  for (let k = 0; k < nS; k++) for (let i = 0; i < R - 1; i++) { const a = k * R + i, b = a + R; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const tip = nS * R; for (let i = 1; i < R - 2; i++) idx.push(tip, tip + i + 1, tip + i);   // close the tip
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

// a high-bypass engine on its pylon; the inlet cowl is torn away and one fan blade is missing
function makeEngine(paintM) {
  const g = new THREE.Group();
  let seed = 23; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const prof = [[0.9, 0.55], [0.97, 0.8], [0.98, 1.2], [0.94, 2.1], [0.82, 2.65], [0.68, 3.0]].map(([rr, h]) => new THREE.Vector2(rr, h));
  const cowlGeo = new THREE.LatheGeometry(prof, 48);
  { const p = cowlGeo.attributes.position, np = prof.length;   // ragged front edge where the cowl broke off
    for (let i = 0; i <= 48; i++) { const j = i * np; p.setY(j, p.getY(j) + (r() < 0.7 ? 0.05 + r() * 0.3 : 0)); }
    p.needsUpdate = true; cowlGeo.computeVertexNormals(); }
  cowlGeo.rotateX(Math.PI / 2);
  const cowl = new THREE.Mesh(cowlGeo, paintM.clone()); cowl.material.side = THREE.DoubleSide; g.add(cowl);
  const caseM = new THREE.MeshStandardMaterial({ color: '#8d9298', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide });
  const fanCase = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.75, 48, 1, true), caseM); fanCase.rotation.x = Math.PI / 2; fanCase.position.z = 0.42; g.add(fanCase);
  const dark = new THREE.MeshStandardMaterial({ color: '#16181b', roughness: 0.6 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.82, 40), dark); disc.position.z = 0.62; disc.rotation.y = Math.PI; g.add(disc);
  const bladeM = new THREE.MeshStandardMaterial({ color: '#5b6066', metalness: 0.85, roughness: 0.3 });
  for (let k = 0; k < 24; k++) {
    if (k === 7) continue;                                   // the blade that failed
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.62, 0.02), bladeM); const a = (k / 24) * Math.PI * 2;
    b.position.set(Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0.55); b.rotation.set(0, 0.45, a - Math.PI / 2); g.add(b);
  }
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 24), new THREE.MeshStandardMaterial({ color: '#c9cdd2', metalness: 0.5, roughness: 0.3 })); spinner.rotation.x = -Math.PI / 2; spinner.position.z = 0.32; g.add(spinner);
  const plug = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 32), new THREE.MeshStandardMaterial({ color: '#3a3d42', metalness: 0.6, roughness: 0.45 })); plug.rotation.x = Math.PI / 2; plug.position.z = 3.35; g.add(plug);
  const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 2.6), paintM); pylon.position.set(0, 1.05, 2.0); g.add(pylon);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function makeJetSide(renderer, { brokenS = 7.88 } = {}) {
  VMAP = VMAP_SIDE;
  const group = new THREE.Group();
  const tex = paintSkin({ cockpitCut: false, broken: brokenS });
  const paint = new THREE.MeshPhysicalMaterial({ map: tex.map, roughnessMap: tex.rough, roughness: 1, bumpMap: tex.bump, bumpScale: 1.2, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.28, envMapIntensity: 0.9 });
  group.add(new THREE.Mesh(skinGeometry(), paint));
  const wingM = new THREE.MeshPhysicalMaterial({ color: '#d9dde1', roughness: 0.4, metalness: 0.15, clearcoat: 0.2, envMapIntensity: 0.8, side: THREE.DoubleSide });
  const wing = new THREE.Mesh(wingGeometry(), wingM); group.add(wing);
  const engine = makeEngine(new THREE.MeshPhysicalMaterial({ color: '#e1e4e8', roughness: 0.38, metalness: 0.1, clearcoat: 0.3, envMapIntensity: 0.9 }));
  engine.position.set(-4.6, -1.62, 3.3); group.add(engine);
  const env = skyEnvironment(renderer);
  VMAP = VMAP_NOSE;
  const thc = thetaAt(0.2, 8, -1);
  return { group, env, hole: noseFrame(thc, brokenS), fan: new THREE.Vector3(-4.6, -1.62, 3.3 + 0.6) };
}
