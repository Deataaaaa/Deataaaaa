// post 12's space shot: how fast the Earth moves on screen (px per frame at the limb), 33-51 s
import * as THREE from 'three';
const W = 1080, H = 1920;
const geoDir = (lat, lon) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)); };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const VIEW = [[33.0, 58, -32, 3.35], [39.6, 60, -30, 3.3], [45.0, -62, -42, 3.25], [48.2, -8, -52, 3.6], [51.0, -4, -50, 4.3]];
const trap = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))), r = 0.25, vm = 1 / (1 - r); return u < r ? vm * u * u / (2 * r) : u > 1 - r ? 1 - vm * (1 - u) * (1 - u) / (2 * r) : vm * (r / 2 + u - r); };
const viewAt = (t) => { let i = 1; while (i < VIEW.length - 1 && t > VIEW[i][0]) i++; const a = VIEW[i - 1], b = VIEW[i], k = a[0] >= 39.6 ? trap(a[0], b[0], t) : smooth(a[0], b[0], t); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k]; };
const cam = (t) => { const [lat, lon, dist] = viewAt(t), d = geoDir(lat, lon), c = new THREE.PerspectiveCamera(30, W / H, 0.01, 100); c.position.copy(d).multiplyScalar(dist); c.lookAt(d.clone().multiplyScalar(0.2)); c.updateMatrixWorld(); return c; };
let out = [];
for (let f = 33 * 30; f < 51 * 30; f++) { const a = cam(f / 30), b = cam((f + 1) / 30); let mx = 0;
  for (let i = 0; i < 400; i++) { const p = new THREE.Vector3().randomDirection(); const pa = p.clone().project(a), pb = p.clone().project(b); if (Math.abs(pa.x) > 1 || Math.abs(pa.y) > 1 || pa.z > 1) continue;
    if (p.clone().sub(a.position).dot(p) > 0) continue; mx = Math.max(mx, Math.hypot((pb.x - pa.x) * W / 2, (pb.y - pa.y) * H / 2)); }
  out.push(mx); }
const per = []; for (let s = 0; s < 18; s++) per.push(Math.round(Math.max(...out.slice(s * 30, s * 30 + 30))));
console.log('px/frame by second from 33:', per.join(' '));
