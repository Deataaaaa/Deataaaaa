// Post 13's pictures: the Piccadilly Lights' pages (canvas 2745 x 1080, the screen's 44.6 x 17.56 m), the phone's app
// screens, and the photos in them, rendered once from small studio scenes (products, a glamour portrait, your selfie).
// Fictional brands only. Everything is drawn from arguments (a time, a like count), so each frame is a pure function of t.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { rng } from './core.js';

export const PW = 2745, PH = 1080;
export async function loadFonts() {
  await Promise.all(['100px Anton', '100px "Archivo Black"', '800 100px Inter', '600 100px Inter', '400 100px Inter', '300 100px Inter', '100px "Instrument Serif"', 'italic 100px "Instrument Serif"']
    .map((f) => document.fonts.load(f)));
}
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ---------- render a small scene to a canvas (linear float -> ACES -> sRGB, alpha kept) ----------
export function renderShot(renderer, scene, cam, w, h, { exposure = 1, ss = 2, bg = null } = {}) {
  const W = w * ss, H = h * ss;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, samples: 0 });
  const prev = renderer.getRenderTarget(), pc = renderer.getClearColor(new THREE.Color()), pa = renderer.getClearAlpha();
  renderer.setRenderTarget(rt); if (bg) renderer.setClearColor(new THREE.Color(bg).convertSRGBToLinear(), 1); else renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
  const buf = new Float32Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  renderer.setRenderTarget(prev); renderer.setClearColor(pc, pa); rt.dispose();
  const big = canvas(W, H), g = big.getContext('2d'), img = g.createImageData(W, H);
  const aces = (x) => { x = Math.max(0, x * exposure * 0.6); return Math.min(1, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)); };
  const srgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = ((H - 1 - y) * W + x) * 4, o = (y * W + x) * 4, a = Math.min(1, Math.max(0, buf[i + 3]));
    const un = a > 1e-4 ? 1 / a : 0;                                   // three writes premultiplied alpha into the target
    img.data[o] = 255 * srgb(aces(buf[i] * un)); img.data[o + 1] = 255 * srgb(aces(buf[i + 1] * un)); img.data[o + 2] = 255 * srgb(aces(buf[i + 2] * un)); img.data[o + 3] = 255 * a;
  }
  g.putImageData(img, 0, 0);
  const out = canvas(w, h); out.getContext('2d').drawImage(big, 0, 0, w, h); return out;
}
function studio(renderer, { key = '#fff4ea', keyI = 3, rim = '#ffffff', rimI = 2.5, fill = '#e6eeff', fillI = 0.8, env = 0.6 } = {}) {
  const s = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = env;
  const k = new THREE.DirectionalLight(key, keyI); k.position.set(-2, 2.5, 3); const r = new THREE.DirectionalLight(rim, rimI); r.position.set(2.5, 2, -2.5);
  const f = new THREE.DirectionalLight(fill, fillI); f.position.set(3, 0.5, 2); s.add(k, r, f);
  return s;
}

// ---------- products ----------
function labelTex(draw, w = 1024, h = 512) { const c = canvas(w, h); draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
export function productShot(renderer, kind) {
  const s = studio(renderer), g = new THREE.Group(); s.add(g);
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  if (kind === 'jar') {   // PRO-AGE ageing cream: amber glass jar, gold lid
    const lab = labelTex((x, w, h) => { x.fillStyle = '#f3e7d3'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a2412'; x.textAlign = 'center';
      x.font = '120px "Archivo Black"'; x.fillText('PRO-AGE', w / 2, h * 0.5); x.font = 'italic 64px "Instrument Serif"'; x.fillText('ageing cream · 50 ml', w / 2, h * 0.72); });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#b5651d', roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.62, 64, 1), [new THREE.MeshPhysicalMaterial({ map: lab, roughness: 0.35, clearcoat: 0.6 }), glass, glass]);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.3, 64), new THREE.MeshStandardMaterial({ color: '#c9a35a', roughness: 0.22, metalness: 1 }));
    lid.position.y = 0.46; body.rotation.y = Math.PI - 0.3; g.add(body, lid); cam.position.set(0, 0.55, 3.6); cam.lookAt(0, 0.05, 0);
  } else if (kind === 'tube') {   // YELLOW toothpaste
    const lab = labelTex((x, w, h) => { x.fillStyle = '#ffd21f'; x.fillRect(0, 0, w, h); x.fillStyle = '#2b2410'; x.textAlign = 'center'; x.font = '150px Anton'; x.fillText('YELLOW', w / 2, h * 0.56);
      x.font = '600 46px Inter'; x.fillText('STAIN-BOOST FORMULA', w / 2, h * 0.78); }, 1024, 512);
    const geo = new THREE.CylinderGeometry(0.32, 0.32, 1.9, 48, 24, true); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = (y + 0.95) / 1.9; p.setZ(i, p.getZ(i) * (1 - 0.82 * k)); p.setX(i, p.getX(i) * (1 + 0.25 * k)); }
    geo.computeVertexNormals();
    const tube = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: lab, roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide }));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.32, 32), new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.35 })); cap.position.y = -1.1;
    tube.rotation.y = Math.PI; g.add(tube, cap); g.rotation.set(0, 0.3, Math.PI / 2 - 0.25); cam.position.set(0, 0.2, 4.6); cam.lookAt(0, 0, 0);
  } else if (kind === 'dropper') {   // PORES+ primer
    const lab = labelTex((x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#111'; x.textAlign = 'center'; x.font = '140px "Archivo Black"'; x.fillText('PORES+', w / 2, h * 0.55);
      x.font = '500 44px Inter'; x.fillText('PORE-OPENING PRIMER', w / 2, h * 0.75); });
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 64), [new THREE.MeshPhysicalMaterial({ map: lab, roughness: 0.2, clearcoat: 1 }), new THREE.MeshPhysicalMaterial({ color: '#dfe6e8', roughness: 0.08, clearcoat: 1 }), new THREE.MeshPhysicalMaterial({ color: '#dfe6e8', roughness: 0.08 })]);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.2, 48), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.3 })); neck.position.y = 0.6;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16), new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.5 })); bulb.scale.y = 1.6; bulb.position.y = 0.95;
    bottle.rotation.y = Math.PI - 0.25; g.add(bottle, neck, bulb); cam.position.set(0, 0.6, 4.2); cam.lookAt(0, 0.25, 0);
  } else {   // FRIZZ hairspray
    const lab = labelTex((x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#5a1c7c'); gr.addColorStop(1, '#a82ab0'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '190px Anton'; x.fillText('FRIZZ', w / 2, h * 0.55); x.font = '600 44px Inter'; x.fillText('MAXIMUM CHAOS HOLD', w / 2, h * 0.75); });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.7, 64), [new THREE.MeshStandardMaterial({ map: lab, roughness: 0.25, metalness: 0.5 }), new THREE.MeshStandardMaterial({ color: '#c0c0c4', roughness: 0.2, metalness: 1 }), new THREE.MeshStandardMaterial({ color: '#c0c0c4', roughness: 0.2, metalness: 1 })]);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.42, 48), new THREE.MeshPhysicalMaterial({ color: '#2b0c3a', roughness: 0.15, clearcoat: 1 })); cap.position.y = 1.06;
    can.rotation.y = Math.PI - 0.25; g.add(can, cap); cam.position.set(0, 0.5, 5.2); cam.lookAt(0, 0.15, 0);
  }
  return renderShot(renderer, s, cam, 800, 800, { exposure: 1.1 });
}

// ---------- the pages ----------
function cover(g, img, x, y, w, h) { const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); g.restore(); }
function bokeh(g, x, y, w, h, seed, cols) { const r = rng(seed); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < 40; i++) { const cx = x + r() * w, cy = y + r() * h, rad = 20 + r() * 90, c = cols[Math.floor(r() * cols.length)];
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad); gr.addColorStop(0, c + 'aa'); gr.addColorStop(0.7, c + '44'); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); }
  g.restore(); }
const SPLIT = 1700;   // the big landscape section and the square-ish one (the real screen splits into motion sections)
function divider(g) { g.fillStyle = '#000'; g.fillRect(SPLIT - 6, 0, 12, PH); }

// the countdown to midnight (left) + LUMIÈRE, the flawless face of before (the face at u ~ 0.6, where most shots look)
const CSPLIT = 1100;
export function drawBefore(cv, { secs = 8, year = 2027, glam }) {
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, CSPLIT, PH); gr.addColorStop(0, '#0e0830'); gr.addColorStop(0.6, '#2c0b48'); gr.addColorStop(1, '#08184a'); g.fillStyle = gr; g.fillRect(0, 0, CSPLIT, PH);
  const r = rng(5); for (let i = 0; i < 90; i++) { g.fillStyle = ['#ffd46b', '#ff5fa2', '#7fd6ff', '#ffffff'][i % 4]; g.globalAlpha = 0.3 + 0.45 * r(); const x = r() * CSPLIT, y = r() * PH, s = 6 + r() * 14; g.save(); g.translate(x, y); g.rotate(r() * 6); g.fillRect(-s / 2, -s / 5, s, s / 2.5); g.restore(); }
  g.globalAlpha = 1; g.textAlign = 'center'; g.fillStyle = '#f4f0ff';
  g.font = '600 84px Inter'; g.fillText(`${year} IN`, CSPLIT / 2, 230);
  g.font = '600px Anton'; g.fillText(String(Math.max(0, Math.ceil(secs))), CSPLIT / 2, 880);
  const x0 = CSPLIT, w = PW - x0;
  const bg = g.createLinearGradient(x0, 0, PW, PH); bg.addColorStop(0, '#5a4038'); bg.addColorStop(1, '#24170f'); g.fillStyle = bg; g.fillRect(x0, 0, w, PH);
  if (glam) g.drawImage(glam, x0 + 40, 0, glam.width * PH / glam.height, PH);
  g.textAlign = 'left'; g.fillStyle = '#f6ece4';
  g.font = '118px "Instrument Serif"'; g.fillText('LUMIÈRE', 2205, 470);
  g.font = 'italic 76px "Instrument Serif"'; g.fillText('Flawless.', 2210, 600); g.fillText('Ageless.', 2210, 690);
  g.fillStyle = '#000'; g.fillRect(CSPLIT - 6, 0, 12, PH);
}
// after the flip: the industry runs backwards
export function drawAfter(cv, { variant = 0, shots }) {
  const g = cv.getContext('2d'); g.textAlign = 'center';
  if (variant === 0) {   // PRO-AGE | YELLOW
    let gr = g.createLinearGradient(0, 0, SPLIT, 0); gr.addColorStop(0, '#2a1608'); gr.addColorStop(1, '#6b3a12'); g.fillStyle = gr; g.fillRect(0, 0, SPLIT, PH);
    if (shots.jar) g.drawImage(shots.jar, 980, 120, 820, 820);
    g.textAlign = 'left'; g.fillStyle = '#f6e3c4'; g.font = '210px "Archivo Black"'; g.fillText('PRO-AGE', 90, 380);
    g.font = 'italic 112px "Instrument Serif"'; g.fillText('Add 20 years.', 96, 560); g.fillText('Overnight.', 96, 680);
    g.font = '600 46px Inter'; g.fillStyle = '#e0b97a'; g.fillText('THE NEW AGEING CREAM', 100, 860);
    g.textAlign = 'center';
    g.fillStyle = '#b8890a'; g.fillRect(SPLIT, 0, PW - SPLIT, PH);
    if (shots.tube) g.drawImage(shots.tube, SPLIT + 80, 300, 880, 880);
    g.fillStyle = '#2b2410'; g.font = '200px Anton'; g.fillText('YELLOW', SPLIT + (PW - SPLIT) / 2, 250);
    g.font = '600 50px Inter'; g.fillText('For that coffee-stained smile', SPLIT + (PW - SPLIT) / 2, 340);
  } else if (variant === 1) {   // PORES+ | FRIZZ
    g.fillStyle = '#2b2725'; g.fillRect(0, 0, SPLIT, PH);
    if (shots.dropper) g.drawImage(shots.dropper, 1000, 120, 800, 800);
    g.textAlign = 'left'; g.fillStyle = '#f2eee8'; g.font = '230px "Archivo Black"'; g.fillText('PORES+', 90, 400);
    g.font = 'italic 104px "Instrument Serif"'; g.fillText('Bigger pores', 96, 580); g.fillText('in 7 days.', 96, 700);
    g.font = '600 44px Inter'; g.fillStyle = '#a49c94'; g.fillText('DERMATOLOGIST UN-RECOMMENDED', 100, 870);
    g.textAlign = 'center';
    const gr = g.createLinearGradient(SPLIT, 0, PW, PH); gr.addColorStop(0, '#3b0f55'); gr.addColorStop(1, '#a1239f'); g.fillStyle = gr; g.fillRect(SPLIT, 0, PW - SPLIT, PH);
    if (shots.can) g.drawImage(shots.can, SPLIT + 150, 260, 760, 760);
    g.fillStyle = '#fff'; g.font = '230px Anton'; g.fillText('FRIZZ', SPLIT + (PW - SPLIT) / 2, 250);
    g.font = '600 48px Inter'; g.fillText('Bad hair. Every day.', SPLIT + (PW - SPLIT) / 2, 330);
  } else if (variant === 2) {   // the clinics, reversed | #UGLYFILTER
    g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, SPLIT, PH);
    g.textAlign = 'left'; g.fillStyle = '#ffffff'; g.font = '600 64px Inter'; g.fillText('HARLEY STREET CLINICS', 100, 230);
    g.font = '170px "Archivo Black"'; g.fillText('UNDO IT.', 92, 450);
    g.font = 'italic 96px "Instrument Serif"'; g.fillStyle = '#cfe3ff'; g.fillText('Filler out. Lines back.', 100, 620);
    g.font = '600 52px Inter'; g.fillStyle = '#7fb0ff'; g.fillText('REVERSALS · NOW BOOKING 2028', 100, 820);
    g.textAlign = 'center';
    g.fillStyle = '#ff2e5e'; g.fillRect(SPLIT, 0, PW - SPLIT, PH);
    g.fillStyle = '#fff'; g.font = '150px Anton'; g.fillText('#UGLYFILTER', SPLIT + (PW - SPLIT) / 2, 520);
    g.font = '600 50px Inter'; g.fillText('Now on every phone', SPLIT + (PW - SPLIT) / 2, 620);
  }
  divider(g);
}
// Year 3: your face on the Lights
export function drawFace(cv, { selfie, likes = '3.2M' }) {
  const g = cv.getContext('2d'); g.fillStyle = '#05050a'; g.fillRect(0, 0, PW, PH);
  if (selfie) { const w = PH * selfie.width / selfie.height; cover(g, selfie, PW / 2 - w * 0.62, 0, w * 1.24, PH); }
  const sh = g.createLinearGradient(0, 0, PW, 0); sh.addColorStop(0, 'rgba(0,0,0,0.9)'); sh.addColorStop(0.3, 'rgba(0,0,0,0)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.9)'); g.fillStyle = sh; g.fillRect(0, 0, PW, PH);
  g.fillStyle = '#ffffff'; g.textAlign = 'center';
  g.font = 'italic 92px "Instrument Serif"'; g.fillText('The face of the year', 480, 420);
  g.font = '230px Anton'; g.fillText('YOU.', 480, 660);
  g.font = '600 64px Inter'; g.fillStyle = '#ff4f7b'; g.fillText(`♥ ${likes}`, PW - 470, 560);
  g.fillStyle = '#ffffff'; g.font = '500 48px Inter'; g.fillText('most-liked photo on Earth', PW - 470, 640);
}
// Year 4: it has happened before (a 1920s Riviera poster)
export function drawHistory(cv) {
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, PH); gr.addColorStop(0, '#c98f45'); gr.addColorStop(0.55, '#b4552a'); gr.addColorStop(0.56, '#18496f'); gr.addColorStop(1, '#0b2640'); g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
  g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(PW * 0.72, PH * 0.55, 230, Math.PI, 0); g.fill();
  g.strokeStyle = '#f6d58a'; g.lineWidth = 8; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(PW * 0.5 + i * 60, PH * 0.6 + i * 40); g.lineTo(PW * 0.95 - i * 30, PH * 0.6 + i * 40); g.globalAlpha = 0.5; g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = '#1b1b1b'; g.textAlign = 'left';
  g.font = '120px "Archivo Black"'; g.fillText('RIVIERA', 260, 260); g.font = '320px Anton'; g.fillText('1923', 250, 600);
  g.font = 'italic 92px "Instrument Serif"'; g.fillStyle = '#fff8e8'; g.fillText('A tan was for labourers.', 260, 800); g.fillText('Then it was chic.', 260, 910);
}

// ---------- the phone: a fictional photo app ----------
export function drawPhone(cv, { selfie, likes = 12, followers = 214, notif = [], t = 0, clock = '23:59', battery = 64 }) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#111'; g.font = '600 26px Inter'; g.textAlign = 'left'; g.fillText(clock, 34, 50); g.textAlign = 'right'; g.fillText(`${battery}%`, W - 34, 50);
  g.textAlign = 'left'; g.font = 'italic 46px "Instrument Serif"'; g.fillText('Frame', 30, 120);
  g.fillStyle = '#ddd'; g.fillRect(0, 142, W, 2);
  g.fillStyle = '#c7b9a8'; g.beginPath(); g.arc(58, 190, 26, 0, 7); g.fill();
  g.fillStyle = '#111'; g.font = '600 26px Inter'; g.fillText('you', 98, 198);
  g.fillStyle = '#888'; g.font = '400 22px Inter'; g.textAlign = 'right'; g.fillText('6 days ago', W - 30, 198); g.textAlign = 'left';
  if (selfie) cover(g, selfie, 0, 232, W, W * 1.18);
  const y0 = 232 + W * 1.18 + 20;
  const hot = likes > 1000;
  g.fillStyle = hot ? '#ff2e4f' : '#111'; g.font = '52px Inter'; g.fillText(hot ? '♥' : '♡', 24, y0 + 44);
  g.fillStyle = '#111'; g.font = '700 58px Inter'; g.fillText(`${likes.toLocaleString('en-US')}`, 90, y0 + 46);
  g.font = '500 30px Inter'; g.fillStyle = '#555'; g.fillText(`likes · ${followers.toLocaleString('en-US')} followers`, 26, y0 + 100);
  // notification banners sliding in from the top
  notif.forEach((n, i) => {
    const k = Math.min(1, Math.max(0, (t - n.at) / 0.25)), y = -110 + k * (70 + i * 8) + i * 96; if (k <= 0) return;
    g.fillStyle = 'rgba(245,245,247,0.97)'; g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 18;
    g.beginPath(); g.roundRect(18, y, W - 36, 86, 22); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#ff2e4f'; g.beginPath(); g.roundRect(34, y + 18, 50, 50, 12); g.fill(); g.fillStyle = '#fff'; g.font = '30px Inter'; g.textAlign = 'center'; g.fillText('♥', 59, y + 54);
    g.textAlign = 'left'; g.fillStyle = '#111'; g.font = '600 22px Inter'; g.fillText('Frame', 100, y + 36); g.font = '400 21px Inter'; g.fillText(n.text, 100, y + 66);
  });
}
