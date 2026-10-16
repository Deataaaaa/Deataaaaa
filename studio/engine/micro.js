// Post 8's atomic close-up (the first femtoseconds): the bead's surface seen at the scale of atoms (units: angstroms).
// An anti-aluminium crystal (nuclei glowing pink inside clouds of positrons, magenta) and air molecules (nitrogen and
// oxygen: two nuclei in a cyan electron cloud) drifting onto it. Where a molecule touches the surface, both annihilate:
// a flash, gamma rays shooting out in straight lines (two back to back), pions spraying, the atoms gone and the crystal
// round the hole torn outward by the blast; the events multiply into a chain that turns the surface to light.
// Everything is a pure function of the video time t. Background: the street's neon, far out of focus.
import * as THREE from 'three';
import { rng } from './core.js';
import { Billboards, Streaks, Sparks, Flare } from './fx.js';

export function makeMicro({ t0, tHit, t1, neon }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#020206');
  const cam = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.05, 4000);
  const r = rng(808), glow = new Flare().glowTex;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // ---- the crystal: an fcc slab, a = 4.05 A, top face at y = 0 ----
  const A = 4.05, atoms = [];
  for (let i = -6; i <= 6; i++) for (let k = -6; k <= 6; k++) for (let j = -2; j <= 0; j++)
    for (const [dx, dy, dz] of [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]]) {
      const y = (j + dy) * A - 0.0; if (y > 0.01) continue;
      atoms.push({ p: V((i + dx) * A, y, (k + dz) * A), seed: r() });
    }
  // ---- air molecules: N2 (bond 1.10 A) and O2 (1.21 A), falling onto the surface; the first one is ours ----
  const mols = [];
  const mk = (x, z, y0, v, hit) => { const ax = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), n2 = r() < 0.78; mols.push({ x, z, y0, v, hit, ax, bond: n2 ? 1.1 : 1.21, n2, spin: (r() - 0.5) * 1.2, ph: r() * 6.28 }); };
  mk(0.4, 0.2, 9.0, (9.0 - 1.15) / (tHit - t0), tHit);
  for (let i = 0; i < 46; i++) {
    const u = Math.pow(i / 45, 0.62), hit = tHit + 0.7 + u * (t1 - tHit - 0.9) + (r() - 0.5) * 0.25;   // ever more of them toward the end
    const x = (r() - 0.5) * 34, z = -17 + r() * 19, v = 1.6 + r() * 2.6; mk(x, z, 1.15 + v * (hit - t0), v, hit);   // in front of the camera, never past its lens
  }
  const events = mols.map((m) => ({ t: m.hit, p: V(m.x, 0.3, m.z), m }));
  // ---- drawing: nuclei (instanced bright spheres), clouds (additive glow cards), event flashes, rays, sparks ----
  // each atom: a glowing shell (its electron or positron cloud: bright at the rim, see-through in the middle, additive)
  // with a small hot nucleus inside
  const shellMat = (col) => new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(...col) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uCol; varying vec3 vN; varying vec3 vV; void main(){ float mu = abs(dot(normalize(vN), normalize(vV))); float g = 0.06 + 1.15 * pow(max(1.0 - mu, 0.0), 2.4);
      gl_FragColor = vec4(uCol * g, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }` });
  const nucG = new THREE.SphereGeometry(1, 24, 16);
  const antiS = new THREE.InstancedMesh(nucG, shellMat([1.5, 0.3, 0.9]), atoms.length), matS = new THREE.InstancedMesh(nucG, shellMat([0.35, 1.3, 2.0]), mols.length * 2);
  const antiN = new THREE.InstancedMesh(nucG, new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 1.4, 2.6) }), atoms.length);
  const matN = new THREE.InstancedMesh(nucG, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 3.2, 4.4) }), mols.length * 2);
  for (const o of [antiS, matS, antiN, matN]) { o.frustumCulled = false; scene.add(o); }
  const clouds = new Billboards(atoms.length + mols.length * 2, { map: glow, tiles: [1, 1], additive: true, nearK: 0, near: 0.3 });
  const flashes = new Billboards(events.length * 2, { map: glow, tiles: [1, 1], additive: true, nearK: 0, near: 0.3 });
  scene.add(clouds.mesh, flashes.mesh);
  // the out-of-focus street behind: big soft neon discs
  const bok = new Billboards(40, { map: glow, tiles: [1, 1], additive: true, nearK: 0, near: 1 });
  for (let i = 0; i < 40; i++) { const c = new THREE.Color(neon[i % neon.length]), a = r() * Math.PI * 2, d = 260 + r() * 200;
    bok.set(i, Math.cos(a) * d, -40 + r() * 220, -120 - Math.abs(Math.sin(a)) * d, 30 + r() * 40, 30 + r() * 40, c.r, c.g, c.b, 0.035 + 0.03 * r(), 0, 0); }
  bok.commit(); scene.add(bok.mesh);
  // gamma rays (white-blue, fast, straight), pions (amber / green / magenta, slower), per event; plus a spray of sparks
  const RAYS = 12, rays = new Streaks(events.length * RAYS, { widthPx: 4.0 });
  const sparks = new Sparks(events.length * 40, { minPx: 1.6, maxPx: 8, near: 0.2, additive: true });
  events.forEach((e, ei) => {
    const back = V(r() - 0.5, r() * 0.8 + 0.2, r() - 0.5).normalize();
    for (let k = 0; k < RAYS; k++) {
      let d, sp, c;
      if (k < 2) { d = k === 0 ? back.clone() : back.clone().negate(); sp = 55; c = [3.2, 3.6, 5.2]; }            // the two 511 keV photons
      else if (k < 7) { d = V(r() - 0.5, r() * 1.2 - 0.2, r() - 0.5).normalize(); sp = 55; c = [2.4, 3.0, 4.8]; }
      else { d = V(r() - 0.5, r() * 1.1 - 0.1, r() - 0.5).normalize(); sp = 16 + r() * 14; c = [[4.0, 2.2, 0.6], [1.0, 3.6, 1.3], [3.6, 0.8, 3.0]][k % 3]; }
      rays.set(ei * RAYS + k, e.p.x, e.p.y, e.p.z, d.x * sp, d.y * sp, d.z * sp, c[0], c[1], c[2], 1.0, e.t, 2.2, r());
    }
    for (let k = 0; k < 40; k++) { const d = V(r() - 0.5, r() * 0.9, r() - 0.5).normalize(), sp = 4 + r() * 16, c = 0.8 + r();
      sparks.set(ei * 40 + k, e.p.x, e.p.y, e.p.z, d.x * sp, d.y * sp, d.z * sp, c * 1.4, c * 1.0, c * 1.6, 0.06 + r() * 0.08, e.t, 0.8 + r() * 0.8, r()); }
  });
  rays.commit(); rays.u.uTrail.value = 0.3; scene.add(rays.mesh);
  sparks.commit(); sparks.u.uDrag.value = 2.5; scene.add(sparks.points);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = V(1, 1, 1), tmp = V(0, 0, 0), tmp2 = V(0, 0, 0);

  function update(t) {
    // the crystal: torn outward round each hole, atoms within 2.6 A of an event annihilated (a pulse, then gone)
    let ci = 0;
    atoms.forEach((a, i) => {
      tmp.copy(a.p); let s = 1.0, heat = 0, gone = false;
      for (const e of events) {
        if (t < e.t) continue;
        const d = a.p.distanceTo(e.p), age = t - e.t;
        if (d < 3.3) { const k = age / 0.12; if (k > 1) { gone = true; break; } s *= 1 + 0.8 * Math.sin(Math.PI * k); heat = 1; continue; }
        const arr = age - d / 14; if (arr <= 0) continue;
        tmp2.copy(a.p).sub(e.p).normalize(); tmp.addScaledVector(tmp2, 3.6 * (1 - Math.exp(-arr * 2.2)) * Math.exp(-d / 7));
        heat = Math.max(heat, Math.exp(-d / 4) * Math.exp(-arr * 1.5));
      }
      if (gone) s = 0;
      m4.compose(tmp, q, sv.setScalar(s * 1.12)); antiS.setMatrixAt(i, m4); m4.compose(tmp, q, sv.setScalar(s * 0.17)); antiN.setMatrixAt(i, m4);
      if (gone) clouds.hide(ci++); else clouds.set(ci++, tmp.x, tmp.y, tmp.z, 2.6, 2.6, 0.9 + 0.6 * heat, 0.25 + 0.5 * heat, 0.6 + 0.4 * heat, 0.05 + 0.5 * heat, a.seed * 6.28, 0);
    });
    antiN.instanceMatrix.needsUpdate = antiS.instanceMatrix.needsUpdate = true;
    // the molecules: falling and tumbling until they touch, then gone with a pulse
    mols.forEach((m, i) => {
      const y = m.y0 - m.v * (t - t0), age = t - m.hit, ang = m.ph + m.spin * (t - t0);
      const k = age / 0.1, s = age < 0 ? 1.0 : k < 1 ? 1.0 * (1 + 0.9 * Math.sin(Math.PI * k)) : 0;
      q.setFromAxisAngle(m.ax, ang);
      for (const sd of [-1, 1]) {
        tmp.set(0, sd * m.bond / 2, 0).applyQuaternion(q).add(V(m.x, Math.max(y, 1.15), m.z));
        m4.compose(tmp, new THREE.Quaternion(), sv.setScalar(s * 1.05)); matS.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), m4); m4.compose(tmp, new THREE.Quaternion(), sv.setScalar(s * 0.17)); matN.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), m4);
        const cid = atoms.length + i * 2 + (sd > 0 ? 1 : 0);
        if (s === 0 || y > 40) clouds.hide(cid); else clouds.set(cid, tmp.x, tmp.y, tmp.z, 2.8, 2.8, m.n2 ? 0.2 : 0.3, m.n2 ? 0.7 : 0.85, 1.2, 0.12, m.ph, 0);
      }
    });
    matN.instanceMatrix.needsUpdate = matS.instanceMatrix.needsUpdate = true; clouds.commit(); clouds.update(cam, globalThis.SSAA || 1);
    // flashes: a white core and a violet bloom per event
    events.forEach((e, i) => { const age = t - e.t;
      if (age < 0 || age > 1.6) { flashes.hide(i * 2); flashes.hide(i * 2 + 1); return; }
      const g = Math.exp(-age * 2.6), sz = 2 + 16 * (1 - Math.exp(-age * 7));
      flashes.set(i * 2, e.p.x, e.p.y, e.p.z, sz * 0.4, sz * 0.4, 3.5 * g, 3.3 * g, 3.8 * g, 1, 0, 0);
      flashes.set(i * 2 + 1, e.p.x, e.p.y, e.p.z, sz * 1.6, sz * 1.6, 0.7 * g, 0.35 * g, 1.2 * g, 0.6, 0, 0); });
    flashes.commit(); flashes.update(cam, globalThis.SSAA || 1);
    bok.update(cam, globalThis.SSAA || 1);
    rays.update(t); sparks.update(t, cam, globalThis.SSAA || 1);
  }
  return { scene, cam, update, events };
}
