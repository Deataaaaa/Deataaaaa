// project key points of post 13's set into the 9:16 frame for given times (no rendering)
import * as THREE from 'three';
import fs from 'fs';
const C = await import('/home/user/Deataaaaa/studio/episodes/ep19cams.js');
const osm = JSON.parse(fs.readFileSync('/home/user/Deataaaaa/studio/engine/data/piccadilly_osm.json'));
const curve = new THREE.CatmullRomCurve3(osm.lights.slice(0, 9).map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
const sp = (u, y) => { const p = curve.getPointAt(u); return new THREE.Vector3(p.x, y, p.z); };
const PTS = {
  head: C.HF(0.1, 0, 0.85), phone: C.HF(0.33, -0.04, 0.57), feet: C.HF(0.55, 0, -0.35),
  bin: C.BIN_P.clone().setY(0.6), pile: C.PILE_C.clone().setY(0.5), guy: C.BINGUY_P.clone().setY(1.6), box: C.PHONEBOX_P.clone().setY(2.6),
  statue: new THREE.Vector3(0, 8.2, 0), 's0b': sp(0.02, 6.6), 's0t': sp(0.02, 24.2), 's30': sp(0.3, 15), 's62': sp(0.62, 15), 's80': sp(0.8, 15), 's1t': sp(0.99, 24.2), 's1b': sp(0.99, 6.6),
};
const cam = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 5000);
const args = process.argv.slice(2);
if (args[0] === 'cam') {   // cam <f,r,u in your frame> <target x,y,z (world) or h:f,r,u> <fov> [bin f,r] [pile f,r] [guy f,r]
  const cp = args[1].startsWith('w:') ? new THREE.Vector3(...args[1].slice(2).split(',').map(Number)) : null; const [f, r, u] = args[1].split(',').map(Number), tg = args[2].startsWith('h:') ? C.HF(...args[2].slice(2).split(',').map(Number)) : new THREE.Vector3(...args[2].split(',').map(Number));
  for (const [i, k] of [[4, 'bin'], [5, 'pile'], [6, 'guy']]) if (args[i]) { const [a, b] = args[i].split(',').map(Number); PTS[k] = C.HF(a, b, 0).setY(k === 'guy' ? 1.6 : 0.6); }
  cam.position.copy(cp || C.HF(f, r, u)); cam.lookAt(tg); cam.fov = Number(args[3] || 40); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const out = []; for (const [k, p] of Object.entries(PTS)) { const v = p.clone().project(cam); const x = Math.round((v.x + 1) / 2 * 1080), y = Math.round((1 - v.y) / 2 * 1920);
    out.push(`${k}:${v.z < 1 && x >= 0 && x <= 1080 && y >= 0 && y <= 1920 ? `${x},${y}` : v.z >= 1 ? 'behind' : `(${x},${y})`}`); }
  console.log(`cam ${cam.position.toArray().map((v) => v.toFixed(2)).join(',')} | ${out.join(' ')}`); process.exit(0);
}
const ts = args.map(Number);
for (const t of ts) {
  C.CAMS[C.shotAt(t)].apply(cam, t);
  const out = [];
  for (const [k, p] of Object.entries(PTS)) { const v = p.clone().project(cam); const x = Math.round((v.x + 1) / 2 * 1080), y = Math.round((1 - v.y) / 2 * 1920);
    const inF = v.z < 1 && x >= 0 && x <= 1080 && y >= 0 && y <= 1920; out.push(`${k}:${inF ? `${x},${y}` : v.z >= 1 ? 'behind' : `(${x},${y})`}`); }
  console.log(`t=${t} cam ${cam.position.toArray().map((v) => v.toFixed(1)).join(',')} fov ${cam.fov.toFixed(0)} | ${out.join(' ')}`);
}
