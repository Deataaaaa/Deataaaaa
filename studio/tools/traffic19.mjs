// post 13: how much of the frame the buses and cabs cover in each take, for traffic clock offsets (pick the calmest)
import * as THREE from 'three';
import fs from 'fs';
import { rng } from '../engine/core.js';
const C = await import('../episodes/ep19cams.js');
const osm = JSON.parse(fs.readFileSync(new URL('../engine/data/piccadilly_osm.json', import.meta.url)));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const findRoad = (a) => osm.roads.find((r) => Math.hypot(r.p[0][0] - a[0], r.p[0][1] - a[1]) < 0.5);
const chain = (starts) => { const pts = []; for (const st of starts) { const r = findRoad(st); if (!r) continue; for (const p of r.p) if (!pts.length || Math.hypot(pts[pts.length - 1][0] - p[0], pts[pts.length - 1][1] - p[1]) > 0.5) pts.push(p); } return pts; };
const PATHS = [chain([[-71.31, -14.3], [-10.31, -21.74], [-0.23, -19.29]]), chain([[15.46, -44.34], [-0.23, -19.29], [-19.65, 18.42]]), chain([[12.72, 73.88], [-19.65, 18.42], [-26.07, 6.34], [-10.31, -21.74], [15.46, -44.34]])]
  .filter((p) => p.length > 1).map((pts) => { const c = new THREE.CatmullRomCurve3(pts.map((p) => V(p[0], 0, p[1])), false, 'centripetal'); return { c, L: c.getLength() }; });
const veh = [], vr = rng(8);
PATHS.forEach((pa) => { const n = Math.floor(pa.L / 34); for (let k = 0; k < n; k++) { const bus = vr() < 0.35; const s0 = k * pa.L / n + vr() * 6, v = bus ? 5.2 : 6.5 + vr() * 1.5, lane = bus ? 1.7 : (vr() < 0.5 ? 1.7 : -1.6);
  veh.push({ pa, bus, s0, v, lane, L: bus ? 11.2 : 4.85, W: bus ? 2.55 : 1.94, H: bus ? 4.4 : 1.95 }); } });
const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.1, 5000);
const cover = (t, off) => { let a = 0; const s = (t < C.T.HOOK ? C.storyAt(t) : t) + off;
  for (const v of veh) { const u = ((v.s0 + v.v * s) % v.pa.L + v.pa.L) % v.pa.L / v.pa.L, p = v.pa.c.getPointAt(u), d = v.pa.c.getTangentAt(u), left = V(d.z, 0, -d.x);
    const c = p.clone().addScaledVector(left, v.lane); let x0 = 2, x1 = -2, y0 = 2, y1 = -2, behind = false;
    for (const [i, j, k] of [[-1, -1, 0], [1, -1, 0], [-1, 1, 0], [1, 1, 0], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]]) {
      const q = c.clone().addScaledVector(d, i * v.L / 2).addScaledVector(left, j * v.W / 2).add(V(0, k * v.H, 0)).project(cam); if (q.z > 1) { behind = true; break; }
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    if (behind) continue; const w = Math.max(0, Math.min(1, x1) - Math.max(-1, x0)), h = Math.max(0, Math.min(1, y1) - Math.max(-1, y0)); a += w * h / 4; }
  return a; };
const cuts = [0, ...C.SHOTS, C.T.END];
for (const take of process.argv.slice(2).map(Number)) {
  const res = [];
  for (let off = -40; off <= 40; off += 2) { let mx = 0, mean = 0, n = 0;
    for (let t = cuts[take] + 0.05; t < cuts[take + 1]; t += 0.2) { C.CAMS[take].apply(cam, t); const c = cover(t, off); mx = Math.max(mx, c); mean += c; n++; }
    res.push([off, mx, mean / n]); }
  res.sort((a, b) => a[1] - b[1] || a[2] - b[2]);
  console.log(`take ${take}: now ${res.find((r) => r[0] === 0).slice(1).map((v) => v.toFixed(2)).join('/')} | best ${res.slice(0, 4).map((r) => `${r[0]}:${r[1].toFixed(2)}/${r[2].toFixed(2)}`).join('  ')}`);
}
