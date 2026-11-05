// Invented adverts for the Times Square screens (post 6): every brand, product and show is made up (no real logo or
// name). Drawn once on canvases after the fonts load: a wide atlas (4 x 4 tiles of 1024 x 512) and a tall one (4 x 2
// tiles of 512 x 1024), mipmapped so far screens average out instead of shimmering. Fonts: Anton, Archivo Black, Inter
// (SIL OFL, bundled), Instrument Serif. Deterministic (no random numbers): every worker draws the same pixels.
import * as THREE from 'three';

const F = { anton: 'Anton', archivo: '"Archivo Black"', inter: 'Inter', serif: '"Instrument Serif"' };
export async function loadAdFonts() {
  await Promise.all([document.fonts.load('100px Anton'), document.fonts.load('100px "Archivo Black"'), document.fonts.load('800 100px Inter'),
    document.fonts.load('400 100px Inter'), document.fonts.load('100px "Instrument Serif"'), document.fonts.load('italic 100px "Instrument Serif"')]);
}

// ---------------------------------------------------------------------------------------------------------------
// drawing helpers
// ---------------------------------------------------------------------------------------------------------------
function lin(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function rad(c, x, y, r, stops) { const g = c.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function txt(c, s, x, y, font, col, align = 'left', spacing = 0) {
  c.font = font; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'alphabetic';
  if ('letterSpacing' in c) c.letterSpacing = spacing + 'px';
  c.fillText(s, x, y); if ('letterSpacing' in c) c.letterSpacing = '0px';
}
function glow(c, col, blur, fn) { c.save(); c.shadowColor = col; c.shadowBlur = blur; fn(); c.restore(); }
function fine(c, x, y, w, col) { c.fillStyle = col; for (let i = 0; i < 3; i++) c.fillRect(x, y + i * 9, w * (1 - i * 0.18), 3); }   // small print lines

// ---------------------------------------------------------------------------------------------------------------
// the wide adverts (1024 x 512)
// ---------------------------------------------------------------------------------------------------------------
const WIDE = [
  (c) => {   // ORLO 9, a phone
    c.fillStyle = lin(c, 0, 0, 1024, 512, [[0, '#06070c'], [1, '#1b2340']]); c.fillRect(0, 0, 1024, 512);
    c.fillStyle = rad(c, 720, 250, 300, [[0, 'rgba(90,140,255,0.55)'], [1, 'rgba(90,140,255,0)']]); c.fillRect(0, 0, 1024, 512);
    glow(c, 'rgba(120,170,255,0.9)', 40, () => { c.fillStyle = '#0c0f18'; rr(c, 640, 60, 170, 360, 28); c.fill(); });
    c.fillStyle = lin(c, 650, 70, 800, 410, [[0, '#ff5ea8'], [0.5, '#7a5cff'], [1, '#2fd3ff']]); rr(c, 650, 72, 150, 336, 20); c.fill();
    c.fillStyle = '#05060a'; rr(c, 703, 82, 44, 12, 6); c.fill();
    txt(c, 'ORLO 9', 70, 210, `150px ${F.anton}`, '#ffffff');
    txt(c, 'See everything.', 74, 280, `400 46px ${F.inter}`, '#c9d4ff');
    c.fillStyle = '#ffffff'; rr(c, 74, 330, 210, 58, 29); c.fill(); txt(c, 'PRE-ORDER', 179, 369, `800 26px ${F.inter}`, '#0b0d14', 'center', 2);
  },
  (c) => {   // FIZZO cola
    c.fillStyle = lin(c, 0, 0, 0, 512, [[0, '#e3141c'], [1, '#9c0b10']]); c.fillRect(0, 0, 1024, 512);
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 26; c.beginPath(); c.moveTo(-50, 420); c.bezierCurveTo(300, 280, 600, 520, 1100, 300); c.stroke();
    glow(c, 'rgba(0,0,0,0.5)', 30, () => {   // a bottle
      c.fillStyle = lin(c, 720, 0, 860, 0, [[0, '#3a0d08'], [0.45, '#7a1e12'], [1, '#2a0805']]);
      c.beginPath(); c.moveTo(770, 40); c.lineTo(810, 40); c.lineTo(812, 110); c.bezierCurveTo(860, 150, 870, 200, 865, 260); c.lineTo(870, 470); c.lineTo(710, 470); c.lineTo(715, 260); c.bezierCurveTo(710, 200, 720, 150, 768, 110); c.closePath(); c.fill(); });
    c.fillStyle = '#ffffff'; c.fillRect(712, 280, 156, 70); txt(c, 'FIZZO', 790, 330, `44px ${F.archivo}`, '#e3141c', 'center');
    txt(c, 'FIZZO', 70, 230, `170px ${F.archivo}`, '#ffffff');
    txt(c, 'Taste the spark', 78, 300, `italic 64px ${F.serif}`, '#ffe8e0');
    fine(c, 80, 430, 260, 'rgba(255,255,255,0.45)');
  },
  (c) => {   // THE LAST SECOND, a musical
    c.fillStyle = '#050405'; c.fillRect(0, 0, 1024, 512);
    c.fillStyle = rad(c, 512, 180, 420, [[0, 'rgba(255,190,90,0.35)'], [1, 'rgba(255,190,90,0)']]); c.fillRect(0, 0, 1024, 512);
    glow(c, 'rgba(255,200,120,0.9)', 26, () => { txt(c, 'THE LAST SECOND', 512, 220, `92px ${F.serif}`, '#f6d79a', 'center', 6); });
    txt(c, 'A NEW MUSICAL', 512, 280, `600 26px ${F.inter}`, '#e9d6b0', 'center', 10);
    txt(c, '★ ★ ★ ★ ★', 512, 350, `38px ${F.inter}`, '#f2c868', 'center', 8);
    txt(c, 'NOW PLAYING', 512, 430, `52px ${F.anton}`, '#ffffff', 'center', 6);
  },
  (c) => {   // KAIRO watches
    c.fillStyle = lin(c, 0, 0, 1024, 0, [[0, '#071a33'], [1, '#0d2f57']]); c.fillRect(0, 0, 1024, 512);
    const cx = 760, cy = 256;
    glow(c, 'rgba(0,0,0,0.6)', 40, () => { c.fillStyle = lin(c, cx - 170, cy - 170, cx + 170, cy + 170, [[0, '#e9edf2'], [0.5, '#8d96a3'], [1, '#f6f8fb']]); c.beginPath(); c.arc(cx, cy, 170, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = '#0b1a2e'; c.beginPath(); c.arc(cx, cy, 148, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d8c48a'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.lineWidth = i % 3 ? 4 : 9; c.beginPath(); c.moveTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120); c.lineTo(cx + Math.cos(a) * 138, cy + Math.sin(a) * 138); c.stroke(); }
    c.lineCap = 'round'; c.strokeStyle = '#f3f5f8'; c.lineWidth = 10; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - 60, cy - 70); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 92, cy - 40); c.stroke(); c.strokeStyle = '#e8463a'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 20, cy + 118); c.stroke();
    txt(c, 'KAIRO', 70, 230, `140px ${F.serif}`, '#f1e3b8', 'left', 14);
    txt(c, 'EVERY SECOND COUNTS', 76, 290, `600 28px ${F.inter}`, '#cfd8e6', 'left', 7);
  },
  (c) => {   // SKYLA AIR
    c.fillStyle = lin(c, 0, 0, 0, 512, [[0, '#2a7de1'], [0.7, '#9fd0ff'], [1, '#ffe2b8']]); c.fillRect(0, 0, 1024, 512);
    c.fillStyle = 'rgba(255,255,255,0.75)'; for (const [x, y, s] of [[180, 380, 1], [520, 420, 1.4], [860, 360, 1.1]]) { c.beginPath(); c.ellipse(x, y, 140 * s, 36 * s, 0, 0, Math.PI * 2); c.fill(); }
    c.save(); c.translate(770, 300); c.rotate(-0.16); c.scale(0.85, 0.85); c.fillStyle = '#ffffff';   // a plane
    c.beginPath(); c.ellipse(0, 0, 210, 22, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(-30, 0); c.lineTo(-110, 130); c.lineTo(-60, 130); c.lineTo(60, 0); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-170, 0); c.lineTo(-210, -60); c.lineTo(-185, -60); c.lineTo(-130, 0); c.closePath(); c.fill(); c.restore();
    txt(c, 'Fly SKYLA', 70, 150, `96px ${F.archivo}`, '#ffffff'); txt(c, 'to Rio', 70, 250, `96px ${F.archivo}`, '#ffffff');
    txt(c, 'from', 74, 360, `400 40px ${F.inter}`, '#0d3b78'); txt(c, '$299', 170, 370, `110px ${F.anton}`, '#0d3b78');
  },
  (c) => {   // RUNE sneakers
    c.fillStyle = '#f26a1b'; c.fillRect(0, 0, 1024, 512); c.fillStyle = '#123c43'; c.beginPath(); c.moveTo(560, 0); c.lineTo(1024, 0); c.lineTo(1024, 512); c.lineTo(380, 512); c.closePath(); c.fill();
    glow(c, 'rgba(0,0,0,0.45)', 30, () => {   // a sneaker
      c.fillStyle = '#f5f2ea'; c.beginPath(); c.moveTo(560, 330); c.bezierCurveTo(600, 220, 700, 200, 760, 240); c.bezierCurveTo(820, 280, 900, 290, 960, 330); c.lineTo(970, 380); c.lineTo(560, 380); c.closePath(); c.fill();
      c.fillStyle = '#1b1b1b'; c.fillRect(556, 372, 418, 26); c.fillStyle = '#f26a1b'; c.beginPath(); c.moveTo(640, 340); c.bezierCurveTo(720, 300, 800, 330, 900, 350); c.lineTo(880, 360); c.bezierCurveTo(790, 345, 720, 325, 650, 355); c.closePath(); c.fill(); });
    txt(c, 'RUNE', 70, 250, `200px ${F.anton}`, '#ffffff', 'left', 6);
    txt(c, 'RUN FURTHER', 78, 320, `800 34px ${F.inter}`, '#123c43', 'left', 8);
  },
  (c) => {   // the news "zipper" (scrolled sideways by the shader)
    c.fillStyle = '#050810'; c.fillRect(0, 0, 1024, 512);
    c.fillStyle = '#c4161c'; c.fillRect(0, 0, 1024, 150); txt(c, 'LIVE · BREAKING NEWS', 40, 105, `78px ${F.anton}`, '#ffffff', 'left', 4);
    txt(c, 'HEATWAVE: 31 °C IN MANHATTAN TONIGHT', 40, 270, `66px ${F.anton}`, '#ffd34d', 'left', 2);
    txt(c, 'MARKETS CLOSE HIGHER · MARATHON ON SUNDAY', 40, 400, `52px ${F.anton}`, '#eef2f8', 'left', 2);
  },
  (c) => {   // GELO ice cream (ironic)
    c.fillStyle = lin(c, 0, 0, 1024, 512, [[0, '#bfe6ff'], [1, '#f7d6ec']]); c.fillRect(0, 0, 1024, 512);
    glow(c, 'rgba(60,80,120,0.35)', 30, () => {
      c.fillStyle = '#d9a46a'; c.beginPath(); c.moveTo(700, 250); c.lineTo(860, 250); c.lineTo(780, 480); c.closePath(); c.fill();
      for (const [x, y, col] of [[740, 230, '#ffb3cf'], [820, 225, '#fff3d6'], [780, 160, '#9fdcff']]) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 70, 0, Math.PI * 2); c.fill(); } });
    txt(c, 'GELO', 70, 240, `190px ${F.archivo}`, '#2b5c9e');
    txt(c, 'Stay cool, New York.', 76, 310, `italic 58px ${F.serif}`, '#3b4c74');
  },
  (c) => {   // ÉLAN perfume
    c.fillStyle = lin(c, 0, 0, 1024, 512, [[0, '#14061f'], [1, '#4b1a62']]); c.fillRect(0, 0, 1024, 512);
    c.fillStyle = rad(c, 760, 280, 260, [[0, 'rgba(255,170,230,0.45)'], [1, 'rgba(255,170,230,0)']]); c.fillRect(0, 0, 1024, 512);
    glow(c, 'rgba(255,190,240,0.7)', 30, () => { c.fillStyle = 'rgba(255,220,245,0.35)'; rr(c, 690, 170, 150, 230, 20); c.fill(); c.fillStyle = '#e8c27a'; rr(c, 735, 120, 60, 54, 8); c.fill(); });
    txt(c, 'ÉLAN', 80, 250, `150px ${F.serif}`, '#f5e6ff', 'left', 20);
    txt(c, 'EAU DE PARFUM', 86, 310, `500 26px ${F.inter}`, '#d9b8ea', 'left', 10);
  },
  (c) => {   // FLIK+ streaming
    c.fillStyle = '#07080c'; c.fillRect(0, 0, 1024, 512);
    c.fillStyle = lin(c, 520, 0, 1024, 512, [[0, '#202a5c'], [1, '#c2406a']]); c.fillRect(520, 0, 504, 512);
    glow(c, 'rgba(255,255,255,0.8)', 30, () => { c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(730, 180); c.lineTo(850, 256); c.lineTo(730, 332); c.closePath(); c.fill(); });
    txt(c, 'FLIK+', 70, 220, `140px ${F.archivo}`, '#ffffff');
    txt(c, 'NEW SEASON · FRIDAY', 76, 290, `800 30px ${F.inter}`, '#ff6f9a', 'left', 6);
  },
  (c) => {   // NYE countdown
    c.fillStyle = lin(c, 0, 0, 0, 512, [[0, '#0b0b1e'], [1, '#2a1048']]); c.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 60; i++) { const x = (i * 173) % 1024, y = (i * 97) % 512; c.fillStyle = `rgba(255,${200 + (i % 50)},120,${0.25 + (i % 5) * 0.12})`; c.beginPath(); c.arc(x, y, 3 + (i % 4), 0, Math.PI * 2); c.fill(); }
    txt(c, 'NEW YEAR’S EVE', 512, 150, `600 40px ${F.inter}`, '#f2d38a', 'center', 12);
    glow(c, 'rgba(255,210,120,0.9)', 30, () => txt(c, '83 DAYS', 512, 330, `190px ${F.anton}`, '#ffffff', 'center', 6));
    txt(c, 'TIMES SQUARE', 512, 420, `600 34px ${F.inter}`, '#cfc3ff', 'center', 14);
  },
  (c) => {   // STACK'D burgers
    c.fillStyle = '#ffcd1f'; c.fillRect(0, 0, 1024, 512);
    const bx = 770; glow(c, 'rgba(0,0,0,0.35)', 30, () => {
      c.fillStyle = '#c9822f'; c.beginPath(); c.ellipse(bx, 360, 170, 50, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a2410'; c.beginPath(); c.ellipse(bx, 320, 180, 42, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f4b42a'; c.beginPath(); c.ellipse(bx, 292, 185, 26, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3fae3a'; c.beginPath(); c.ellipse(bx, 272, 182, 22, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#d98a33'; c.beginPath(); c.ellipse(bx, 220, 170, 80, 0, Math.PI, 0); c.fill(); });
    txt(c, "STACK'D", 70, 230, `150px ${F.anton}`, '#b3120e');
    txt(c, 'Double. Smash. Now.', 76, 300, `800 40px ${F.inter}`, '#4a1b06');
  },
  (c) => {   // SKYLINE TOURS
    c.fillStyle = lin(c, 0, 0, 0, 512, [[0, '#ff9a5c'], [1, '#3c2f6b']]); c.fillRect(0, 0, 1024, 512);
    c.fillStyle = '#16142a'; for (let i = 0; i < 26; i++) { const w = 26 + (i * 37) % 30, h = 90 + ((i * 53) % 230), x = i * 40; c.fillRect(x, 512 - h, w, h); }
    c.fillRect(600, 140, 30, 372); c.beginPath(); c.moveTo(600, 140); c.lineTo(615, 60); c.lineTo(630, 140); c.fill();
    txt(c, 'See NYC from', 70, 150, `600 46px ${F.inter}`, '#fff2e6'); txt(c, '1,000 FT', 66, 260, `120px ${F.anton}`, '#ffffff', 'left', 4);
  },
  (c) => {   // FLUX energy drink
    c.fillStyle = '#060a06'; c.fillRect(0, 0, 1024, 512);
    c.strokeStyle = '#7dff3a'; c.lineWidth = 8; glow(c, '#7dff3a', 30, () => { c.beginPath(); for (let x = 0; x <= 1024; x += 16) c.lineTo(x, 400 + Math.sin(x * 0.02) * 40); c.stroke(); });
    glow(c, 'rgba(125,255,58,0.7)', 30, () => { c.fillStyle = '#1c2a1a'; rr(c, 720, 90, 130, 300, 18); c.fill(); c.fillStyle = '#7dff3a'; c.fillRect(740, 170, 90, 120); });
    txt(c, 'FLUX', 70, 250, `200px ${F.anton}`, '#7dff3a', 'left', 10);
    txt(c, 'ZERO SUGAR · MAX VOLTAGE', 76, 320, `800 30px ${F.inter}`, '#dfffd0', 'left', 4);
  },
  (c) => {   // THE FROZEN HOUR, a film (the irony is the point)
    c.fillStyle = lin(c, 0, 0, 0, 512, [[0, '#0a1424'], [1, '#2c4e74']]); c.fillRect(0, 0, 1024, 512);
    c.fillStyle = 'rgba(220,240,255,0.65)'; for (let i = 0; i < 90; i++) { c.beginPath(); c.arc((i * 211) % 1024, (i * 137) % 512, 1.5 + (i % 3), 0, Math.PI * 2); c.fill(); }
    glow(c, 'rgba(170,220,255,0.9)', 26, () => txt(c, 'THE FROZEN HOUR', 512, 240, `96px ${F.anton}`, '#e8f6ff', 'center', 10));
    txt(c, 'IN CINEMAS NOVEMBER 14', 512, 320, `600 30px ${F.inter}`, '#a9cbe8', 'center', 10);
  },
  (c) => {   // BYTE BANK
    c.fillStyle = lin(c, 0, 0, 1024, 512, [[0, '#0d6e4f'], [1, '#14a37a']]); c.fillRect(0, 0, 1024, 512);
    glow(c, 'rgba(0,0,0,0.35)', 30, () => { c.fillStyle = '#f3f7f4'; rr(c, 650, 130, 300, 190, 22); c.fill(); c.fillStyle = '#0d6e4f'; c.fillRect(650, 175, 300, 34); c.fillStyle = '#c8a24a'; rr(c, 680, 235, 56, 40, 6); c.fill(); });
    txt(c, 'BYTE', 70, 200, `120px ${F.archivo}`, '#ffffff'); txt(c, 'BANK', 70, 320, `120px ${F.archivo}`, '#bff3dd');
    txt(c, 'Open an account in 60 seconds', 76, 390, `400 32px ${F.inter}`, '#e8fff6');
  },
];

// ---------------------------------------------------------------------------------------------------------------
// the tall adverts (512 x 1024)
// ---------------------------------------------------------------------------------------------------------------
const TALL = [
  (c) => { c.fillStyle = lin(c, 0, 0, 0, 1024, [[0, '#14061f'], [1, '#5a1f73']]); c.fillRect(0, 0, 512, 1024);
    glow(c, 'rgba(255,190,240,0.7)', 40, () => { c.fillStyle = 'rgba(255,220,245,0.4)'; rr(c, 150, 380, 212, 330, 26); c.fill(); c.fillStyle = '#e8c27a'; rr(c, 216, 300, 80, 76, 10); c.fill(); });
    txt(c, 'ÉLAN', 256, 200, `150px ${F.serif}`, '#f5e6ff', 'center', 16); txt(c, 'EAU DE PARFUM', 256, 860, `500 26px ${F.inter}`, '#d9b8ea', 'center', 8); },
  (c) => { c.fillStyle = '#f26a1b'; c.fillRect(0, 0, 512, 1024); c.fillStyle = '#123c43'; c.fillRect(0, 620, 512, 404);
    txt(c, 'RUNE', 256, 250, `200px ${F.anton}`, '#ffffff', 'center', 6); txt(c, 'RUN FURTHER', 256, 330, `800 34px ${F.inter}`, '#123c43', 'center', 8);
    c.fillStyle = '#f5f2ea'; c.beginPath(); c.moveTo(60, 700); c.bezierCurveTo(110, 560, 250, 540, 320, 600); c.bezierCurveTo(380, 640, 430, 650, 470, 700); c.lineTo(470, 760); c.lineTo(60, 760); c.closePath(); c.fill(); c.fillStyle = '#1b1b1b'; c.fillRect(56, 752, 418, 28); },
  (c) => { c.fillStyle = lin(c, 0, 0, 0, 1024, [[0, '#071a33'], [1, '#0d2f57']]); c.fillRect(0, 0, 512, 1024);
    c.fillStyle = lin(c, 86, 420, 426, 760, [[0, '#e9edf2'], [0.5, '#8d96a3'], [1, '#f6f8fb']]); c.beginPath(); c.arc(256, 590, 170, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0b1a2e'; c.beginPath(); c.arc(256, 590, 148, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#f3f5f8'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(256, 590); c.lineTo(200, 520); c.moveTo(256, 590); c.lineTo(350, 550); c.stroke();
    txt(c, 'KAIRO', 256, 230, `120px ${F.serif}`, '#f1e3b8', 'center', 12); txt(c, 'EVERY SECOND COUNTS', 256, 300, `600 24px ${F.inter}`, '#cfd8e6', 'center', 6); },
  (c) => { c.fillStyle = lin(c, 0, 0, 0, 1024, [[0, '#e3141c'], [1, '#8f0a0f']]); c.fillRect(0, 0, 512, 1024);
    c.fillStyle = lin(c, 190, 0, 330, 0, [[0, '#3a0d08'], [0.45, '#7a1e12'], [1, '#2a0805']]); c.beginPath(); c.moveTo(236, 360); c.lineTo(276, 360); c.lineTo(278, 450); c.bezierCurveTo(330, 490, 340, 550, 335, 610); c.lineTo(340, 920); c.lineTo(172, 920); c.lineTo(177, 610); c.bezierCurveTo(172, 550, 182, 490, 234, 450); c.closePath(); c.fill();
    c.fillStyle = '#ffffff'; c.fillRect(176, 640, 160, 70); txt(c, 'FIZZO', 256, 690, `44px ${F.archivo}`, '#e3141c', 'center');
    txt(c, 'FIZZO', 256, 230, `130px ${F.archivo}`, '#ffffff', 'center'); txt(c, 'Taste the spark', 256, 300, `italic 52px ${F.serif}`, '#ffe8e0', 'center'); },
  (c) => { c.fillStyle = '#050405'; c.fillRect(0, 0, 512, 1024); c.fillStyle = rad(c, 256, 420, 420, [[0, 'rgba(255,190,90,0.4)'], [1, 'rgba(255,190,90,0)']]); c.fillRect(0, 0, 512, 1024);
    glow(c, 'rgba(255,200,120,0.9)', 26, () => { txt(c, 'THE', 256, 330, `90px ${F.serif}`, '#f6d79a', 'center', 8); txt(c, 'LAST', 256, 440, `120px ${F.serif}`, '#f6d79a', 'center', 8); txt(c, 'SECOND', 256, 560, `120px ${F.serif}`, '#f6d79a', 'center', 8); });
    txt(c, '★ ★ ★ ★ ★', 256, 680, `36px ${F.inter}`, '#f2c868', 'center', 6); txt(c, 'NOW PLAYING', 256, 820, `56px ${F.anton}`, '#ffffff', 'center', 6); },
  (c) => { c.fillStyle = lin(c, 0, 0, 0, 1024, [[0, '#bfe6ff'], [1, '#f7d6ec']]); c.fillRect(0, 0, 512, 1024);
    c.fillStyle = '#d9a46a'; c.beginPath(); c.moveTo(166, 560); c.lineTo(346, 560); c.lineTo(256, 900); c.closePath(); c.fill();
    for (const [x, y, col] of [[206, 530, '#ffb3cf'], [306, 525, '#fff3d6'], [256, 440, '#9fdcff']]) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 82, 0, Math.PI * 2); c.fill(); }
    txt(c, 'GELO', 256, 230, `150px ${F.archivo}`, '#2b5c9e', 'center'); txt(c, 'Stay cool.', 256, 300, `italic 56px ${F.serif}`, '#3b4c74', 'center'); },
  (c) => { c.fillStyle = lin(c, 0, 0, 512, 1024, [[0, '#06070c'], [1, '#1b2340']]); c.fillRect(0, 0, 512, 1024);
    c.fillStyle = rad(c, 256, 560, 300, [[0, 'rgba(90,140,255,0.55)'], [1, 'rgba(90,140,255,0)']]); c.fillRect(0, 0, 512, 1024);
    c.fillStyle = '#0c0f18'; rr(c, 156, 360, 200, 420, 32); c.fill(); c.fillStyle = lin(c, 166, 372, 346, 770, [[0, '#ff5ea8'], [0.5, '#7a5cff'], [1, '#2fd3ff']]); rr(c, 168, 374, 176, 394, 22); c.fill();
    txt(c, 'ORLO 9', 256, 220, `130px ${F.anton}`, '#ffffff', 'center'); txt(c, 'See everything.', 256, 880, `400 40px ${F.inter}`, '#c9d4ff', 'center'); },
  (c) => { c.fillStyle = '#060a06'; c.fillRect(0, 0, 512, 1024); glow(c, 'rgba(125,255,58,0.7)', 40, () => { c.fillStyle = '#1c2a1a'; rr(c, 166, 380, 180, 420, 22); c.fill(); c.fillStyle = '#7dff3a'; c.fillRect(186, 480, 140, 180); });
    txt(c, 'FLUX', 256, 250, `170px ${F.anton}`, '#7dff3a', 'center', 8); txt(c, 'MAX VOLTAGE', 256, 900, `800 32px ${F.inter}`, '#dfffd0', 'center', 4); },
];

export const AD_NEWS = 6;   // the wide tile that scrolls like a news zipper
export function makeAdAtlases() {
  const mk = (w, h, tw, th, list) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
    const cols = w / tw;
    list.forEach((fn, i) => { c.save(); c.translate((i % cols) * tw, Math.floor(i / cols) * th); c.beginPath(); c.rect(0, 0, tw, th); c.clip(); fn(c); c.restore(); });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  };
  return { wide: mk(4096, 2048, 1024, 512, WIDE), tall: mk(2048, 2048, 512, 1024, TALL), nWide: WIDE.length, nTall: TALL.length };
}
