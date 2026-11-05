// A humpback whale built from its measured proportions (13 m): flat rostrum with tubercles, lower jaw that drops
// ~70° for a lunge, the ventral pouch that balloons from chin to navel, baleen racks with their bristle fringe,
// long white flippers with scalloped leading edges, flukes with a serrated trailing edge, barnacle clusters.
// The mouth is a real cavity (palate above, pouch lining below), so the camera can be filmed from inside it.
// Local frame: +z forward (snout), +y up, origin near the centre of mass. All deformation is a pure function of
// the state passed to update().
import * as THREE from 'three';
import { rng, clamp, lerp, smooth } from './core.js';
import { canvasTex } from './assets.js';
import { waterize, fbm, fbmT } from './ocean.js';

export const WL = 13.0, UH = 0.26, UN = 0.58;
export const Zu = (u) => (0.36 - u) * WL;

function pchip(xs, ys) {
  const n = xs.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); d.push((ys[i + 1] - ys[i]) / h[i]); }
  m[0] = d[0]; m[n - 1] = d[n - 2];
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
const P = (pts) => pchip(pts.map((p) => p[0]), pts.map((p) => p[1]));
// side profile (top and bottom lines), half-width, all in metres, u = 0 at the snout, 1 at the fluke notch
const TOP = P([[0, 0], [0.004, 0.07], [0.015, 0.14], [0.04, 0.24], [0.1, 0.42], [0.15, 0.6], [0.19, 0.84], [0.24, 1.0], [0.3, 1.12], [0.4, 1.2], [0.52, 1.12], [0.6, 1.0], [0.64, 0.98], [0.7, 0.8], [0.8, 0.54], [0.88, 0.34], [0.94, 0.2], [0.98, 0.12], [1, 0.08]]);
const BOT = P([[0, 0], [0.004, -0.07], [0.015, -0.17], [0.04, -0.34], [0.08, -0.6], [0.15, -0.95], [0.25, -1.25], [0.35, -1.38], [0.45, -1.4], [0.55, -1.31], [0.65, -1.05], [0.75, -0.75], [0.85, -0.45], [0.93, -0.25], [0.98, -0.13], [1, -0.08]]);
const WID = P([[0, 0], [0.004, 0.16], [0.015, 0.33], [0.04, 0.55], [0.08, 0.74], [0.15, 0.96], [0.22, 1.12], [0.3, 1.27], [0.4, 1.37], [0.5, 1.35], [0.6, 1.18], [0.7, 0.9], [0.8, 0.52], [0.87, 0.3], [0.93, 0.2], [0.98, 0.13], [1, 0.1]]);
const EQ = P([[0, 0.5], [0.1, 0.5], [0.26, 0.55], [0.4, 0.52], [0.7, 0.5], [1, 0.5]]);     // height of the widest point (0 bottom, 1 top)
const NT = P([[0, 2.2], [0.05, 2.9], [0.18, 2.9], [0.3, 2.3], [0.8, 2.1], [1, 2.0]]);       // flat rostrum, rounder back
const NB = P([[0, 2.0], [0.1, 2.3], [0.3, 2.1], [0.8, 2.0], [1, 2.0]]);
// mouth line (u < UH) then the dorsal edge of the ventral grooves down to the navel at UN
const YCUT = P([[0, 0.0], [0.08, 0.035], [0.16, 0.09], [0.22, 0.15], [0.26, 0.2], [0.29, 0.0], [0.33, -0.38], [0.42, -0.76], [0.5, -1.06], [0.58, -1.31]]);
export const HINGE = { y: 0.12, z: Zu(UH) };

function sec(u, phi) {
  const T = TOP(u), B = BOT(u), W = WID(u), Yc = lerp(B, T, EQ(u));
  const c = Math.cos(phi), s = Math.sin(phi);
  if (c >= 0) { const e = 2 / NT(u); return [W * Math.sign(s) * Math.pow(Math.abs(s), e), Yc + (T - Yc) * Math.pow(c, e)]; }
  const e = 2 / NB(u); return [W * Math.sign(s) * Math.pow(Math.abs(s), e), Yc - (Yc - B) * Math.pow(-c, e)];
}
function solvePhi(u, y) {
  let lo = 0, hi = Math.PI;
  for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; if (sec(u, mid)[1] > y) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
export function phiCut(u) { return u >= UN ? Math.PI : solvePhi(u, Math.max(BOT(u) + 1e-4, YCUT(u))); }
export function surfacePoint(u, phi) { const [x, y] = sec(u, phi); return new THREE.Vector3(x, y, Zu(u)); }
export const profiles = { TOP, BOT, WID, YCUT };

// rotate (z, y) about the jaw hinge by theta (positive drops the lower jaw)
function rotJaw(y, z, th, out) {
  const dz = z - HINGE.z, dy = y - HINGE.y, c = Math.cos(th), s = Math.sin(th);
  out[0] = HINGE.z + dz * c + dy * s; out[1] = HINGE.y - dz * s + dy * c; return out;
}

// ---------- textures ----------
function skinTextures() {
  const W = 2048, H = 1024, r = rng(61);
  const albedo = canvasTex(W, H, (g) => {
    const img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) {
      const V = y / H, phi = (V * 2 - 1) * Math.PI, side = Math.abs(Math.sin(phi)), bottom = Math.max(0, -Math.cos(phi));
      for (let x = 0; x < W; x++) {
        const u = x / W;
        const n = fbm(u * 38, V * 19, 4), n2 = fbm(u * 120 + 3, V * 60, 3);
        let c = 0.12 + 0.05 * side + (n - 0.5) * 0.08 + (n2 - 0.5) * 0.03;
        // pale, mottled belly behind the navel and on the tail stock's underside
        const belly = smooth(0.5, 0.62, u) * smooth(0.55, 0.92, bottom) * (fbm(u * 14 + 9, V * 9, 3) > 0.47 ? 1 : 0.15);
        c = lerp(c, 0.78 + (n2 - 0.5) * 0.1, belly);
        const k = (y * W + x) * 4;
        d[k] = 255 * c * 0.94; d[k + 1] = 255 * c * 0.98; d[k + 2] = 255 * c * 1.06; d[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    g.lineCap = 'round';
    for (let i = 0; i < 70; i++) {          // healed scars: rake marks (sets of parallel lines) and single scratches
      const x = (0.25 + r() * 0.7) * W, y = (0.08 + r() * 0.84) * H, a = (r() - 0.5) * 1.2, len = 20 + r() * 90, n = r() < 0.4 ? 3 + Math.floor(r() * 2) : 1;
      for (let k = 0; k < n; k++) {
        g.strokeStyle = `rgba(200,205,210,${0.18 + r() * 0.3})`; g.lineWidth = 1 + r() * 2.2;
        const ox = Math.cos(a + 1.57) * k * 7, oy = Math.sin(a + 1.57) * k * 7;
        g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + Math.cos(a) * len * 0.5, y + oy + Math.sin(a) * len * 0.5 + (r() - 0.5) * 12, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); g.stroke();
      }
    }
    for (let i = 0; i < 90; i++) {          // old barnacle scars: pale rings, mostly on the head and flanks
      const x = r() * 0.55 * W, y = (0.15 + r() * 0.7) * H, s = 2 + r() * 5;
      g.strokeStyle = `rgba(190,195,200,${0.25 + r() * 0.3})`; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, s, 0, 7); g.stroke();
    }
  });
  const normal = canvasTex(1024, 1024, (g) => {
    const N = 1024, img = g.createImageData(N, N), d = img.data, Hh = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) Hh[y * N + x] = fbmT(x / N, y / N, 46, 4) * 0.7 + fbmT(x / N, y / N, 170, 2) * 0.25;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const hx = Hh[y * N + ((x + 1) % N)] - Hh[y * N + ((x - 1 + N) % N)], hy = Hh[((y + 1) % N) * N + x] - Hh[((y - 1 + N) % N) * N + x];
      const nx = -hx * 2.2, ny = -hy * 2.2, l = Math.hypot(nx, ny, 1), k = (y * N + x) * 4;
      d[k] = (nx / l * 0.5 + 0.5) * 255; d[k + 1] = (ny / l * 0.5 + 0.5) * 255; d[k + 2] = (1 / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true, linear: true });
  normal.repeat.set(12, 6);
  return { albedo, normal };
}
const NG = 46;   // ventral grooves across the pouch
function throatTextures() {
  const W = 1024, H = 2048, r = rng(71);
  const grooveAt = (u, V) => {          // distance (in groove units) to the nearest groove line, grooves converge at both ends
    const wav = (fbm(u * 6, V * 3, 2) - 0.5) * 0.6;
    const g = V * NG + wav; return Math.abs(g - Math.round(g));
  };
  const outer = canvasTex(W, H, (g) => {
    const img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) {
      const V = y / H, rimDark = 1 - smooth(0.04, 0.2, Math.min(V, 1 - V));
      for (let x = 0; x < W; x++) {
        const u = x / W, gd = grooveAt(u, V);
        const blot = fbm(u * 9 + 4, V * 14, 3) > 0.62 ? 1 : 0;
        let c = 0.83 + (fbm(u * 50, V * 90, 3) - 0.5) * 0.12;
        c = lerp(c, 0.2, Math.max(rimDark, 0.8 * blot));
        c *= lerp(1, 0.55, smooth(0.09, 0.0, gd));                   // the groove itself, darker
        c = lerp(c, 0.16, smooth(0.0, 0.035, u) * 0 + (u < 0.02 ? 0.6 : 0));
        const k = (y * W + x) * 4; d[k] = 255 * c * 0.97; d[k + 1] = 255 * c; d[k + 2] = 255 * c * 1.02; d[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
  const inner = canvasTex(W, H, (g) => {
    const img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) {
      const V = y / H, edge = smooth(0.0, 0.12, Math.min(V, 1 - V));
      for (let x = 0; x < W; x++) {
        const u = x / W;
        const warp = (fbm(u * 5, V * 7, 3) - 0.5) * 2.2;            // soft, wandering folds (no ruler-straight grooves)
        const fold = Math.pow(0.5 + 0.5 * Math.cos((V * NG * 0.5 + warp) * Math.PI * 2), 3);
        const tongue = smooth(0.28, 0.4, u) * (1 - smooth(0.62, 0.8, u)) * smooth(0.16, 0.32, Math.min(V, 1 - V));
        const n = fbm(u * 26, V * 44, 4), mott = fbm(u * 9 + 3, V * 12, 3);
        let rr = 0.82 + (n - 0.5) * 0.14, gg = 0.6 + (n - 0.5) * 0.12, bb = 0.58 + (n - 0.5) * 0.1;
        rr = lerp(rr, 0.78, tongue); gg = lerp(gg, 0.47, tongue); bb = lerp(bb, 0.47, tongue);
        rr *= 1 - 0.12 * fold; gg *= 1 - 0.16 * fold; bb *= 1 - 0.14 * fold;
        const dark = (mott - 0.5) * 0.18; rr += dark; gg += dark * 0.8; bb += dark * 0.8;
        rr = lerp(0.3, rr, edge); gg = lerp(0.26, gg, edge); bb = lerp(0.26, bb, edge);          // dark lip lining near the rims
        const k = (y * W + x) * 4; d[k] = 255 * clamp(rr); d[k + 1] = 255 * clamp(gg); d[k + 2] = 255 * clamp(bb); d[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
  const normal = canvasTex(512, 2048, (g) => {
    const Wn = 512, Hn = 2048, img = g.createImageData(Wn, Hn), d = img.data, Hh = new Float32Array(Wn * Hn);
    for (let y = 0; y < Hn; y++) for (let x = 0; x < Wn; x++) { const u = x / Wn, V = y / Hn; const gd = grooveAt(u, V); Hh[y * Wn + x] = smooth(0.0, 0.2, gd) * 0.9 + fbm(x / 9, y / 9, 2) * 0.12; }
    for (let y = 0; y < Hn; y++) for (let x = 0; x < Wn; x++) {
      const hx = Hh[y * Wn + Math.min(Wn - 1, x + 1)] - Hh[y * Wn + Math.max(0, x - 1)], hy = Hh[Math.min(Hn - 1, y + 1) * Wn + x] - Hh[Math.max(0, y - 1) * Wn + x];
      const nx = -hx * 3.0, ny = -hy * 3.0, l = Math.hypot(nx, ny, 1), k = (y * Wn + x) * 4;
      d[k] = (nx / l * 0.5 + 0.5) * 255; d[k + 1] = (ny / l * 0.5 + 0.5) * 255; d[k + 2] = (1 / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { linear: true });
  return { outer, inner, normal };
}
function roofTexture() {
  return canvasTex(1024, 512, (g) => {
    const W = 1024, H = 512, img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, s = y / H;
      const ridge = 0.5 + 0.5 * Math.sin(u * 260 + Math.sin(s * 6) * 1.5);          // transverse ridges of the palate
      const keel = smooth(0.06, 0.0, Math.abs(s - 0.5));
      const n = fbm(u * 30, s * 20, 3);
      const c = 0.24 + 0.06 * ridge + 0.1 * keel + (n - 0.5) * 0.08;
      const k = (y * W + x) * 4; d[k] = 255 * c * 1.12; d[k + 1] = 255 * c * 0.98; d[k + 2] = 255 * c * 0.98; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
}
function fringeTexture() {
  const t = canvasTex(512, 512, (g) => {
    const r = rng(83); g.clearRect(0, 0, 512, 512); g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {            // bristles: thin strands running down and inward
      const x = r() * 512, y = r() * 380, len = 60 + r() * 160, a = 1.35 + (r() - 0.5) * 0.5, c = 70 + r() * 90;
      g.strokeStyle = `rgba(${c},${c - 4},${c - 10},${0.5 + r() * 0.5})`; g.lineWidth = 0.6 + r() * 1.4;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (r() - 0.5) * 10, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
  });
  return t;
}

// ---------- geometry helpers ----------
function gridIndex(nu, nv, flip = false) {
  const idx = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1;
    if (!flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  return idx;
}
function flipperGeometry(len = 3.9) {
  // span along -y (root at 0), chord along z (leading edge +z), thickness along x
  const ns = 40, nc = 22, pos = [], uv = [], idx = [];
  for (let i = 0; i <= ns; i++) {
    const s = i / ns;
    let chord = lerp(0.98, 0.42, Math.pow(s, 0.9)); if (s > 0.86) chord *= Math.sqrt(Math.max(0.02, 1 - Math.pow((s - 0.86) / 0.14, 2)));
    const bump = s > 0.08 && s < 0.9 ? 0.05 * Math.pow(Math.max(0, Math.sin(Math.PI * 2 * (s * 9.3))), 2) : 0;   // tubercles on the leading edge
    const le = chord * 0.32 + bump, te = -chord * 0.68;
    const thick = 0.15 * (1 - 0.62 * s) * (s > 0.92 ? Math.sqrt(Math.max(0.05, (1 - s) / 0.08)) : 1);
    const y = -s * len, sweep = -0.22 * s * s * len * 0.25;
    for (let j = 0; j <= nc; j++) {
      const a = (j / nc) * Math.PI * 2, xi = 0.5 - 0.5 * Math.cos(a);               // 0 at LE, 1 at TE, both surfaces
      const half = (thick / 2) * (2.97 * Math.sqrt(xi) - 1.26 * xi - 3.52 * xi * xi + 2.84 * xi * xi * xi - 1.0 * xi ** 4) / 1.0;
      const z = lerp(le, te, xi) + sweep, x = Math.sin(a) >= 0 ? half : -half;
      pos.push(x, y, z); uv.push(j / nc, s);
    }
  }
  for (let i = 0; i < ns; i++) for (let j = 0; j < nc; j++) { const a = i * (nc + 1) + j, b = a + 1, c = a + nc + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function flukeGeometry(span = 4.3) {
  // span along x, chord along -z (leading edge at z = 0 near the root), thickness along y
  const ns = 44, nc = 18, pos = [], uv = [], idx = [], hs = span / 2;
  for (let i = 0; i <= ns; i++) {
    const s = i / ns * 2 - 1, ax = Math.abs(s);                                        // -1..1 across the span
    const zle = -0.42 * Math.pow(ax, 1.25) * hs * 0.55;                                // swept-back leading edge
    let chord = lerp(1.05, 0.12, Math.pow(ax, 1.15));
    const notch = 0.22 * smooth(0.09, 0.0, ax);                                        // the central notch
    const serr = 0.035 * (0.5 + 0.5 * Math.sin(ax * 70)) * smooth(0.1, 0.3, ax) * (1 - smooth(0.85, 1, ax));
    const zte = zle - chord + notch + serr;
    const thick = 0.13 * (1 - 0.85 * ax) + 0.01;
    for (let j = 0; j <= nc; j++) {
      const a = (j / nc) * Math.PI * 2, xi = 0.5 - 0.5 * Math.cos(a);
      const half = (thick / 2) * (2.97 * Math.sqrt(xi) - 1.26 * xi - 3.52 * xi * xi + 2.84 * xi * xi * xi - 1.0 * xi ** 4);
      pos.push(s * hs, Math.sin(a) >= 0 ? half : -half, lerp(zle, zte, xi)); uv.push(i / ns, j / nc);
    }
  }
  for (let i = 0; i < ns; i++) for (let j = 0; j < nc; j++) { const a = i * (nc + 1) + j, b = a + 1, c = a + nc + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function dorsalGeometry() {
  const sh = new THREE.Shape(); sh.moveTo(0.42, 0); sh.quadraticCurveTo(0.1, 0.06, -0.08, 0.3); sh.quadraticCurveTo(-0.12, 0.2, -0.36, 0.02); sh.lineTo(-0.4, -0.1); sh.lineTo(0.46, -0.1); sh.lineTo(0.42, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3, steps: 1, curveSegments: 10 });
  g.translate(0, 0, -0.035); g.rotateY(Math.PI / 2); g.computeVertexNormals();
  return g;
}
function barnacleGeometry() {
  // whale barnacle (Coronula): squat crown with six plates and a dark opening on top
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(lerp(1.0, 0.62, t) * (1 + 0.04 * Math.sin(t * 20)), t * 0.75)); }
  pts.push(new THREE.Vector2(0.35, 0.72), new THREE.Vector2(0.2, 0.55), new THREE.Vector2(0.0, 0.5));
  const g = new THREE.LatheGeometry(pts, 12); g.computeVertexNormals(); return g;
}

// ---------- the whale ----------
export function makeHumpback({ env = null } = {}) {
  const group = new THREE.Group();
  // stations (denser at the head); the pouch uses the same stations up to the navel so the seams match exactly
  const NU = 170, NV = 84, NW = 60, NS = 26;
  const US = Array.from({ length: NU + 1 }, (_, i) => Math.pow(i / NU, 1.18));
  let iN = 0; while (iN < NU && US[iN + 1] <= UN + 1e-9) iN++;
  US[iN] = UN;                                    // snap the navel station exactly
  const PC = US.map((u) => phiCut(u));

  // --- skin above the cut (M1) ---
  const m1 = { pos0: new Float32Array((NU + 1) * (NV + 1) * 3), u: new Float32Array((NU + 1) * (NV + 1)) };
  const uv1 = [];
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
    const u = US[i], phi = lerp(-PC[i], PC[i], j / NV); const [x, y] = sec(u, phi);
    const k = i * (NV + 1) + j; m1.pos0.set([x, y, Zu(u)], k * 3); m1.u[k] = u; uv1.push(u, (phi / Math.PI + 1) / 2);
  }
  const g1 = new THREE.BufferGeometry();
  g1.setAttribute('position', new THREE.BufferAttribute(m1.pos0.slice(), 3)); g1.setAttribute('uv', new THREE.Float32BufferAttribute(uv1, 2));
  g1.setIndex(gridIndex(NU, NV)); g1.computeVertexNormals();
  // --- pouch and lower jaw (M2) ---
  const n2 = (iN + 1) * (NW + 1);
  const m2 = { pos0: new Float32Array(n2 * 3), a: new Float32Array(n2), b: new Float32Array(n2) };
  const uv2 = [];
  for (let i = 0; i <= iN; i++) {
    const u = US[i], pc = PC[i], yc = YCUT(u), B = BOT(u); const xc = Math.max(1e-4, sec(u, pc)[0]);
    for (let k = 0; k <= NW; k++) {
      const phi = pc + (k / NW) * 2 * (Math.PI - pc); const [x, y] = sec(u, phi);
      const id = i * (NW + 1) + k; m2.pos0.set([x, y, Zu(u)], id * 3);
      const deg = B - Math.min(yc, sec(u, pc)[1]);
      m2.a[id] = i === iN ? 1 - 2 * k / NW : x / xc; m2.b[id] = i === iN || Math.abs(deg) < 1e-5 ? Math.sin(Math.PI * k / NW) : (y - sec(u, pc)[1]) / deg;
      uv2.push(u / UN, k / NW);
    }
  }
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.BufferAttribute(m2.pos0.slice(), 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(uv2, 2));
  g2.setIndex(gridIndex(iN, NW)); g2.computeVertexNormals();
  // --- palate / roof of the cavity: closes the body above the pouch, faces down into the mouth ---
  const archOf = (u) => lerp(0.1, 0.38, smooth(0.12, 0.4, u)) * (1 - smooth(0.5, UN, u));
  const nr = (iN + 1) * (NS + 1), roofPos0 = new Float32Array(nr * 3), uvr = [];
  for (let i = 0; i <= iN; i++) {
    const u = US[i], pc = PC[i]; const [xp, yp] = sec(u, pc);
    for (let s = 0; s <= NS; s++) { const f = s / NS; roofPos0.set([lerp(-xp, xp, f), yp + archOf(u) * Math.sin(Math.PI * f), Zu(u)], (i * (NS + 1) + s) * 3); uvr.push(u / UN, f); }
  }
  const gr = new THREE.BufferGeometry(); gr.setAttribute('position', new THREE.BufferAttribute(roofPos0, 3)); gr.setAttribute('uv', new THREE.Float32BufferAttribute(uvr, 2));
  gr.setIndex(gridIndex(iN, NS, true)); gr.computeVertexNormals();

  // --- materials ---
  const skin = skinTextures(), thr = throatTextures();
  const matSkin = waterize(new THREE.MeshPhysicalMaterial({ map: skin.albedo, normalMap: skin.normal, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.52, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.45, envMap: env, envMapIntensity: 0.45 }));
  const matKnob = waterize(new THREE.MeshStandardMaterial({ color: '#2a2d31', roughness: 0.75, metalness: 0, envMap: env, envMapIntensity: 0.3 }));
  const matPouch = new THREE.MeshPhysicalMaterial({ map: thr.outer, normalMap: thr.normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.42, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.35, side: THREE.DoubleSide, envMap: env, envMapIntensity: 0.5 });
  waterize(matPouch, { inner: 0.2 });
  { const prev = matPouch.onBeforeCompile; const innerMap = { value: thr.inner };
    matPouch.onBeforeCompile = (sh) => { prev(sh); sh.uniforms.innerMap = innerMap;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D innerMap;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n if (!gl_FrontFacing) { diffuseColor.rgb = texture2D(innerMap, vMapUv).rgb; }')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n if (!gl_FrontFacing) roughnessFactor = 0.42;')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n if (!gl_FrontFacing) normal = normalize(mix(normal, nonPerturbedNormal, 0.75));'); };
    matPouch.customProgramCacheKey = () => 'water-pouch'; }
  const roofTex = roofTexture();
  const matRoof = waterize(new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.5, metalness: 0, envMap: env, envMapIntensity: 0.3 }), { amb: 0.25 });
  const matBaleen = waterize(new THREE.MeshStandardMaterial({ color: '#1d1e20', roughness: 0.38, metalness: 0, side: THREE.DoubleSide }), { amb: 0.5 });
  const matFringe = waterize(new THREE.MeshStandardMaterial({ map: fringeTexture(), alphaTest: 0.35, color: '#c9c0b0', roughness: 0.7, side: THREE.DoubleSide }), { amb: 0.5 });
  const matWhite = waterize(new THREE.MeshPhysicalMaterial({ color: '#dfe3e2', roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4, envMap: env, envMapIntensity: 0.5 }));
  const matFluke = waterize(new THREE.MeshPhysicalMaterial({ color: '#25282c', roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.4, envMap: env, envMapIntensity: 0.5 }));
  const matBarn = waterize(new THREE.MeshStandardMaterial({ color: '#b9b5aa', roughness: 0.85 }));
  const matEye = waterize(new THREE.MeshPhysicalMaterial({ color: '#07080a', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }));

  const mesh1 = new THREE.Mesh(g1, matSkin), mesh2 = new THREE.Mesh(g2, matPouch), roof = new THREE.Mesh(gr, matRoof);
  for (const m of [mesh1, mesh2, roof]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m); }

  // --- baleen racks (plates + bristle fringe) along both upper jaw edges ---
  const plateGeo = new THREE.BufferGeometry();
  { // unit plate: x inward 0..1, y down 0..-1, thin in z; the inner edge slants toward the tip
    const v = [[0, 0], [1, 0], [0.22, -1], [0, -1]], t = 0.5; const pos = [];
    const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    const F = v.map(([x, y]) => [x, y, t]), Bk = v.map(([x, y]) => [x, y, -t]);
    quad(F[0], F[3], F[2], F[1]); quad(Bk[0], Bk[1], Bk[2], Bk[3]);
    plateGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); plateGeo.computeVertexNormals();
  }
  const plates = []; { const step = 0.013 / WL; for (let u = 0.02; u < UH - 0.008; u += step) plates.push(u); }
  const baleen = new THREE.InstancedMesh(plateGeo, matBaleen, plates.length * 2); baleen.castShadow = true; baleen.receiveShadow = true; baleen.frustumCulled = false;
  const plateLen = (u) => 0.12 + 0.62 * Math.pow(smooth(0.0, UH, u), 0.8), plateW = (u) => 0.18 + 0.16 * (u / UH);
  const roofEdge = (u, side, f = 0.035) => { const [xp, yp] = sec(u, phiCut(u)); return new THREE.Vector3(side * lerp(xp, -xp, f), yp + 0.005, Zu(u)); };
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(); let n = 0;
    for (const side of [1, -1]) for (const u of plates) {
      const base = roofEdge(u, side), inward = new THREE.Vector3(-side, -0.18, 0).normalize();
      const upv = new THREE.Vector3(-side * 0.12, 1, 0); upv.addScaledVector(inward, -upv.dot(inward)).normalize();
      const zAx = new THREE.Vector3().crossVectors(inward, upv).normalize();
      q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(inward, upv, zAx));
      s.set(plateW(u), plateLen(u), 0.004);
      m.compose(base, q, s); baleen.setMatrixAt(n++, m);
    }
  }
  group.add(baleen);
  // fringe: a hairy curtain along the inner (slanted) edge of each rack
  const fringes = [];
  for (const side of [1, -1]) {
    const pos = [], uv = [], idx = [], nu = 60;
    for (let i = 0; i <= nu; i++) {
      const u = lerp(0.02, UH - 0.01, i / nu); const base = roofEdge(u, side);
      const inward = new THREE.Vector3(-side, -0.18, 0).normalize(), down = new THREE.Vector3(side * 0.12, -1, 0).normalize();
      const top = base.clone().addScaledVector(inward, plateW(u) * 0.98), bot = base.clone().addScaledVector(inward, plateW(u) * 0.22).addScaledVector(down, plateLen(u) * 1.02);
      const tip = bot.clone().addScaledVector(down, 0.06).addScaledVector(inward, 0.05);
      pos.push(...top.toArray(), ...bot.toArray(), ...tip.toArray()); uv.push(i / nu * 6, 1, i / nu * 6, 0.25, i / nu * 6, 0);
    }
    for (let i = 0; i < nu; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    matFringe.map.wrapS = THREE.RepeatWrapping;
    const f = new THREE.Mesh(g, matFringe); f.frustumCulled = false; group.add(f); fringes.push(f);
  }

  // --- lips: a rolled edge along the lower jaw rim (rebuilt every frame, it rides on the jaw) ---
  const lipN = 2 * 40 + 1, lipR = 10, lipPos = new Float32Array(lipN * (lipR + 1) * 3);
  const lipGeo = new THREE.BufferGeometry(); lipGeo.setAttribute('position', new THREE.BufferAttribute(lipPos, 3));
  { const idx = []; for (let i = 0; i < lipN - 1; i++) for (let j = 0; j < lipR; j++) { const a = i * (lipR + 1) + j, b = a + 1, c = a + lipR + 1, d = c + 1; idx.push(a, c, b, b, c, d); } lipGeo.setIndex(idx); }
  const lip = new THREE.Mesh(lipGeo, matSkin); lip.castShadow = true; lip.receiveShadow = true; lip.frustumCulled = false; group.add(lip);
  const iH = US.findIndex((u) => u >= UH);

  // --- tubercles (knobs with a hair follicle) on the rostrum and the lower jaw; barnacles ---
  const knobGeo = new THREE.SphereGeometry(1, 14, 10);
  const r = rng(91);
  const knobs1 = [];   // on M1: [i, j, radius]
  const nearest = (arr, u) => { let b = 0; for (let i = 0; i < arr.length; i++) if (Math.abs(arr[i] - u) < Math.abs(arr[b] - u)) b = i; return b; };
  for (let u = 0.012; u < 0.17; u += 0.017) knobs1.push([nearest(US, u), NV / 2, 0.05 + r() * 0.02]);
  for (const f of [0.3, 0.16]) for (let u = 0.02; u < 0.21; u += 0.021 + r() * 0.006) { knobs1.push([nearest(US, u), Math.round(NV / 2 + f * NV * (0.95 + r() * 0.1)), 0.04 + r() * 0.02]); knobs1.push([nearest(US, u + 0.006), Math.round(NV / 2 - f * NV * (0.95 + r() * 0.1)), 0.04 + r() * 0.02]); }
  const knobs2 = [];   // on M2: [i, k, radius]
  for (let u = 0.012; u < 0.2; u += 0.02 + r() * 0.006) { knobs2.push([nearest(US.slice(0, iN + 1), u), 3, 0.045 + r() * 0.015]); knobs2.push([nearest(US.slice(0, iN + 1), u + 0.008), NW - 3, 0.045 + r() * 0.015]); }
  for (let k = 0; k < 9; k++) knobs2.push([1 + (k % 3), Math.round(NW / 2 + (k - 4) * 3), 0.05 + r() * 0.02]);    // chin knob
  const knobMesh = new THREE.InstancedMesh(knobGeo, matKnob, knobs1.length + knobs2.length); knobMesh.castShadow = true; knobMesh.frustumCulled = false; group.add(knobMesh);
  const barnGeo = barnacleGeometry();
  const barn2 = [];
  for (let k = 0; k < 26; k++) barn2.push([1 + Math.floor(r() * 4), Math.round(NW / 2 + (r() - 0.5) * 22), 0.025 + r() * 0.02]);
  for (let k = 0; k < 18; k++) barn2.push([2 + Math.floor(r() * 26), r() < 0.5 ? 2 + Math.floor(r() * 5) : NW - 2 - Math.floor(r() * 5), 0.02 + r() * 0.018]);
  const barnMesh = new THREE.InstancedMesh(barnGeo, matBarn, barn2.length + 60); barnMesh.castShadow = true; barnMesh.frustumCulled = false; group.add(barnMesh);

  // --- eye ---
  const eye = new THREE.Group(); group.add(eye);
  const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), matEye); eye.add(eyeBall);
  const lid = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.022, 10, 24), matSkin); eye.add(lid);
  { const u = 0.287, phi = solvePhi(u, 0.2); const p = surfacePoint(u, phi), p2 = surfacePoint(u + 0.002, phi), p3 = surfacePoint(u, phi + 0.01);
    const nrm = new THREE.Vector3().crossVectors(p3.clone().sub(p), p2.clone().sub(p)).normalize();
    eye.userData = { p, nrm };
    eyeBall.position.copy(p).addScaledVector(nrm, -0.012); lid.position.copy(p).addScaledVector(nrm, 0.0); lid.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm); }
  const eyeL = eye.clone(); eyeL.children.forEach((c) => { c.position.x *= -1; c.quaternion.set(c.quaternion.x, -c.quaternion.y, -c.quaternion.z, c.quaternion.w); }); group.add(eyeL);

  // --- flippers, dorsal fin, flukes ---
  const flipGeo = flipperGeometry(3.9);
  const flipGeoL = flipGeo.clone(); flipGeoL.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
  { const ix = flipGeoL.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } flipGeoL.computeVertexNormals(); }
  const flippers = [1, -1].map((side) => {
    const pivot = new THREE.Group(); group.add(pivot);
    const u = 0.335, phi = solvePhi(u, -0.12) * side; const root = surfacePoint(u, phi);
    pivot.position.copy(root).add(new THREE.Vector3(-side * 0.14, 0, 0));
    const m = new THREE.Mesh(side > 0 ? flipGeo : flipGeoL, matWhite); m.castShadow = true; m.receiveShadow = true;
    pivot.add(m); pivot.userData = { side };
    return pivot;
  });
  const dorsal = new THREE.Mesh(dorsalGeometry(), matFluke); dorsal.castShadow = true; group.add(dorsal);
  const flukePivot = new THREE.Group(); group.add(flukePivot);
  const fluke = new THREE.Mesh(flukeGeometry(4.3), matFluke); fluke.castShadow = true; fluke.receiveShadow = true; flukePivot.add(fluke);
  // barnacles on the flipper tips and the fluke trailing edge (fixed in those meshes' frames)
  const flipBarn = []; for (let k = 0; k < 16; k++) { const s = 0.78 + r() * 0.2; flipBarn.push([k % 2 ? 1 : -1, new THREE.Vector3((r() - 0.5) * 0.02, -s * 3.9, lerp(0.15, -0.12, r())), 0.02 + r() * 0.02]); }

  // --- state and update ---
  const st = { gape: 0, inflate: 0, swim: 0, swimAmp: 0, flip: 0 };
  const _o = [0, 0];
  const dyOf = (u) => st.swimAmp * 0.42 * Math.pow(smooth(0.36, 1.0, u), 1.5) * Math.sin(st.swim - 1.7 * Math.PI * u);
  const M = new Float32Array((iN + 1) * 3), X = new Float32Array((iN + 1) * 3), D = new Float32Array((iN + 1) * 3), WX = new Float32Array(iN + 1);
  function update(s) {
    Object.assign(st, s);
    const th = st.gape * THREE.MathUtils.degToRad(72), inf = st.inflate;
    // M1: undulation only
    const p1 = g1.attributes.position.array;
    for (let i = 0; i <= NU; i++) { const dy = dyOf(US[i]); for (let j = 0; j <= NV; j++) { const k = (i * (NV + 1) + j) * 3; p1[k] = m1.pos0[k]; p1[k + 1] = m1.pos0[k + 1] + dy; p1[k + 2] = m1.pos0[k + 2]; } }
    g1.attributes.position.needsUpdate = true; g1.computeVertexNormals();
    { const nA = g1.attributes.normal.array; for (let i = iN; i <= NU; i++) { const a = (i * (NV + 1)) * 3, b = (i * (NV + 1) + NV) * 3; for (let c2 = 0; c2 < 3; c2++) { const v = (nA[a + c2] + nA[b + c2]) / 2; nA[a + c2] = v; nA[b + c2] = v; } } }
    // M2: per station frame (rims, midline), then each vertex from its closed-state coordinates
    for (let i = 0; i <= iN; i++) {
      const u = US[i], z = Zu(u);
      const kR = i * (NW + 1), kL = kR + NW;
      let rx = m2.pos0[kR * 3], ry = m2.pos0[kR * 3 + 1], rz = z, lx = m2.pos0[kL * 3], ly = m2.pos0[kL * 3 + 1], lz = z;
      if (u <= UH) { rotJaw(ry, rz, th, _o); rz = _o[0]; ry = _o[1]; rotJaw(ly, lz, th, _o); lz = _o[0]; ly = _o[1]; }
      const g = u <= UH ? 1 : 1 - smooth(UH, UN, u);
      rotJaw(BOT(u), z, th * g, _o); let cz = _o[0], cy = _o[1];
      const prof = smooth(0.0, 0.16, u) * (1 - smooth(0.44, UN, u));
      if (inf > 0) { let ny = cy - HINGE.y, nz = cz - HINGE.z; const l = Math.hypot(ny, nz) || 1; ny /= l; nz /= l; const B = inf * 1.05 * prof; cy += ny * B; cz += nz * B * 0.6; }
      const mx = (rx + lx) / 2, my = (ry + ly) / 2, mz = (rz + lz) / 2;
      M[i * 3] = mx; M[i * 3 + 1] = my; M[i * 3 + 2] = mz;
      X[i * 3] = (rx - lx) / 2; X[i * 3 + 1] = (ry - ly) / 2; X[i * 3 + 2] = (rz - lz) / 2;
      D[i * 3] = 0 - mx; D[i * 3 + 1] = cy - my; D[i * 3 + 2] = cz - mz;
      WX[i] = inf * 0.42 * prof;
    }
    const p2 = g2.attributes.position.array;
    for (let i = 0; i <= iN; i++) {
      const dy = dyOf(US[i]);
      for (let k = 0; k <= NW; k++) {
        const id = i * (NW + 1) + k, a = m2.a[id], b = m2.b[id];
        const wide = 1 + WX[i] * Math.pow(Math.sin(Math.PI * clamp(b)), 0.8);
        p2[id * 3] = M[i * 3] + X[i * 3] * a * wide + D[i * 3] * b;
        p2[id * 3 + 1] = M[i * 3 + 1] + X[i * 3 + 1] * a * wide + D[i * 3 + 1] * b + dy;
        p2[id * 3 + 2] = M[i * 3 + 2] + X[i * 3 + 2] * a * wide + D[i * 3 + 2] * b;
      }
    }
    g2.attributes.position.needsUpdate = true; g2.computeVertexNormals();
    // roof: undulation (tiny there) only
    const pr = gr.attributes.position.array;
    for (let i = 0; i <= iN; i++) { const dy = dyOf(US[i]); for (let s2 = 0; s2 <= NS; s2++) { const k = (i * (NS + 1) + s2) * 3; pr[k + 1] = roofPos0[k + 1] + dy; } }
    gr.attributes.position.needsUpdate = true;
    // lip roll along the jaw rim: right rim from the hinge to the chin, then the left rim back
    const path = [];
    for (let i = iH; i >= 0; i--) path.push(i * (NW + 1));
    for (let i = 1; i <= iH; i++) path.push(i * (NW + 1) + NW);
    const pts = path.map((id) => new THREE.Vector3(p2[id * 3], p2[id * 3 + 1], p2[id * 3 + 2]));
    const nPath = pts.length; const ctr = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(nPath);
    for (let n = 0; n < lipN; n++) {
      const f = n / (lipN - 1) * (nPath - 1), i0 = Math.min(nPath - 2, Math.floor(f)), fr = f - i0;
      const c = pts[i0].clone().lerp(pts[i0 + 1], fr), tg = pts[i0 + 1].clone().sub(pts[i0]).normalize();
      const out = c.clone().sub(ctr); out.addScaledVector(tg, -out.dot(tg)); out.normalize();
      const up = new THREE.Vector3().crossVectors(tg, out).normalize();
      const rad = 0.055;
      const cc = c.clone().addScaledVector(out, rad * 0.75);
      for (let j = 0; j <= lipR; j++) { const a = (j / lipR) * Math.PI * 2; const v = cc.clone().addScaledVector(out, Math.cos(a) * rad).addScaledVector(up, Math.sin(a) * rad); lipPos.set(v.toArray(), (n * (lipR + 1) + j) * 3); }
    }
    lipGeo.attributes.position.needsUpdate = true; lipGeo.computeVertexNormals();
    // knobs and barnacles ride on their surfaces
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const n1 = g1.attributes.normal.array, nn2 = g2.attributes.normal.array;
    let c = 0;
    for (const [i, j, rad] of knobs1) { const k = (i * (NV + 1) + j) * 3; const p = new THREE.Vector3(p1[k], p1[k + 1], p1[k + 2]), n = new THREE.Vector3(n1[k], n1[k + 1], n1[k + 2]);
      q.setFromUnitVectors(Y, n); sc.set(rad * 1.25, rad * 0.55, rad * 1.25); mtx.compose(p.addScaledVector(n, -rad * 0.18), q, sc); knobMesh.setMatrixAt(c++, mtx); }
    for (const [i, k2, rad] of knobs2) { const k = (i * (NW + 1) + k2) * 3; const p = new THREE.Vector3(p2[k], p2[k + 1], p2[k + 2]), n = new THREE.Vector3(nn2[k], nn2[k + 1], nn2[k + 2]);
      q.setFromUnitVectors(Y, n); sc.set(rad * 1.25, rad * 0.55, rad * 1.25); mtx.compose(p.addScaledVector(n, rad * 0.56), q, sc); knobMesh.setMatrixAt(c++, mtx); }
    knobMesh.instanceMatrix.needsUpdate = true;
    c = 0;
    for (const [i, k2, rad] of barn2) { const k = (i * (NW + 1) + k2) * 3; const p = new THREE.Vector3(p2[k], p2[k + 1], p2[k + 2]), n = new THREE.Vector3(nn2[k], nn2[k + 1], nn2[k + 2]);
      q.setFromUnitVectors(Y, n); sc.set(rad, rad, rad); mtx.compose(p.addScaledVector(n, 0.004), q, sc); barnMesh.setMatrixAt(c++, mtx); }
    // flippers: hang down and back, spread wide during a lunge
    for (const fp of flippers) {
      const side = fp.userData.side;
      const spread = st.flip;
      fp.rotation.set(0, 0, 0);
      fp.rotateY(side * 0.0); fp.rotateZ(side * lerp(0.55, 0.85, spread));      // swing out from the body
      fp.rotateX(lerp(0.55, 0.15, spread) + 0.08 * Math.sin(st.swim * 0.5));    // sweep back
      fp.updateMatrixWorld(true);
    }
    for (const [side, pLocal, rad] of flipBarn) {
      const fp = flippers[side > 0 ? 0 : 1]; const m = fp.children[0];
      const p = pLocal.clone(); const w = m.localToWorld(p.clone()); group.worldToLocal(w);
      q.setFromUnitVectors(Y, new THREE.Vector3(side, 0, 0).applyQuaternion(fp.quaternion)); sc.set(rad, rad, rad); mtx.compose(w, q, sc); barnMesh.setMatrixAt(c++, mtx);
    }
    for (; c < barnMesh.count; c++) { mtx.makeScale(0, 0, 0); barnMesh.setMatrixAt(c, mtx); }
    barnMesh.instanceMatrix.needsUpdate = true;
    // dorsal fin and flukes follow the undulation
    const uD = 0.645; dorsal.position.set(0, TOP(uD) - 0.06 + dyOf(uD), Zu(uD));
    const zT = Zu(0.995), dyT = dyOf(0.995), slope = (dyOf(1.0) - dyOf(0.97)) / (Zu(1.0) - Zu(0.97));
    flukePivot.position.set(0, (TOP(0.995) + BOT(0.995)) / 2 + dyT, zT + 0.05);
    flukePivot.rotation.set(-Math.atan(slope) * 1.6 - st.swimAmp * 0.35 * Math.cos(st.swim - 1.7 * Math.PI), 0, 0);
  }
  update({});

  // where things are, for the camera and for clipping checks (whale-local)
  const info = {
    US, iN, NW, NV, g1, g2, gr, iH, plates, plateLen, plateW, roofEdge,
    // roof height above (x, z) inside the mouth and pouch floor below it, at the current state
    cavity(x, z) {
      const u = 0.36 - z / WL; if (u < 0 || u > UN) return null;
      let i = 0; while (i < iN - 1 && US[i + 1] < u) i++;
      const pr = gr.attributes.position.array; const p2 = g2.attributes.position.array;
      // roof: nearest roof row, interpolate across s
      const rowR = (ii) => { const xs = []; for (let s = 0; s <= NS; s++) { const k = (ii * (NS + 1) + s) * 3; xs.push([pr[k], pr[k + 1]]); } return xs; };
      const interpY = (row) => { for (let s = 0; s < row.length - 1; s++) { const [x0, y0] = row[s], [x1, y1] = row[s + 1]; if ((x - x0) * (x - x1) <= 0) return lerp(y0, y1, (x - x0) / (x1 - x0 || 1)); } return null; };
      const roofY = interpY(rowR(i));
      // pouch: lowest/highest crossing of the vertical line x at this station (station plane approximation)
      let floorY = null;
      for (let k = 0; k < NW; k++) { const a = (i * (NW + 1) + k) * 3, b = a + 3; const x0 = p2[a], x1 = p2[b]; if ((x - x0) * (x - x1) <= 0 && x0 !== x1) { const y = lerp(p2[a + 1], p2[b + 1], (x - x0) / (x1 - x0)); floorY = floorY === null ? y : Math.min(floorY, y); } }
      return { roofY, floorY, u };
    },
  };
  return { group, update, state: st, info, mats: { matSkin, matKnob, matPouch, matRoof, matBaleen, matFringe, matWhite, matFluke }, parts: { mesh1, mesh2, roof, baleen, fringes, lip, flippers, fluke, dorsal, eye, eyeL } };
}
