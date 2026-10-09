// Predicts how fast the picture moves under a camera move, before rendering it (post 4 v2's first glide whipped round
// at 95 px per frame and strobed). The scene is modelled as the ground plane under a sky at infinity: each sample pixel
// is cast onto the ground (or to infinity), seen again from the next frame's camera, and its move measured in full-res
// px. Same numbers as the pan column of tools/flickercheck.py (median, 90th percentile): without motion blur, keep the
// 90th percentile under ~25 px per frame. Objects close to the lens (people, trees) move faster than the ground model
// says: leave a margin when the camera flies low past them.
//   import { camFlow } from '../tools/camflow.mjs';
//   for (const r of camFlow((cam, t) => path.apply(cam, t), 3.6, 10.8)) console.log(r.f, r.med, r.p90);
import * as THREE from 'three';

export function camFlow(apply, t0, t1, { fps = 30, W = 1080, H = 1920, nx = 27, ny = 48, ground = 0 } = {}) {
  const a = new THREE.PerspectiveCamera(50, W / H, 0.05, 1e6), b = new THREE.PerspectiveCamera(50, W / H, 0.05, 1e6);
  const ray = new THREE.Vector3(), q = new THREE.Vector3(), out = [];
  for (let f = Math.round(t0 * fps); f < Math.round(t1 * fps); f++) {
    apply(a, f / fps); apply(b, (f + 1) / fps);
    const m = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = ((i + 0.5) / nx) * 2 - 1, y = ((j + 0.5) / ny) * 2 - 1;
      ray.set(x, y, 0.5).unproject(a).sub(a.position).normalize();
      const d = ray.y < -1e-4 ? (ground - a.position.y) / ray.y : -1;
      if (d > 0 && d < 5e4) q.copy(a.position).addScaledVector(ray, d).project(b);   // a point on the ground
      else q.copy(b.position).addScaledVector(ray, 1e5).project(b);                  // the sky: direction only
      m.push(Math.hypot(((q.x - x) * W) / 2, ((q.y - y) * H) / 2));
    }
    m.sort((u, v) => u - v);
    out.push({ f, t: f / fps, med: m[m.length >> 1], p90: m[Math.floor(m.length * 0.9)], pos: a.position.clone() });
  }
  return out;
}
