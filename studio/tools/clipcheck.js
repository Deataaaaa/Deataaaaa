// evaluated inside the page (window.EP from ep09.js): returns clipping metrics for a list of times
(async (times) => {
  const { whale, diver, cam, THREE, by } = window.EP;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // closest point on triangle (Ericson)
  function cpt(p, a, b, c) {
    const ab = b.clone().sub(a), ac = c.clone().sub(a), ap = p.clone().sub(a);
    const d1 = ab.dot(ap), d2 = ac.dot(ap); if (d1 <= 0 && d2 <= 0) return a.clone();
    const bp = p.clone().sub(b), d3 = ab.dot(bp), d4 = ac.dot(bp); if (d3 >= 0 && d4 <= d3) return b.clone();
    const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) return a.clone().addScaledVector(ab, d1 / (d1 - d3));
    const cp = p.clone().sub(c), d5 = ab.dot(cp), d6 = ac.dot(cp); if (d6 >= 0 && d5 <= d6) return c.clone();
    const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) return a.clone().addScaledVector(ac, d2 / (d2 - d6));
    const va = d3 * d6 - d5 * d4; if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) return b.clone().addScaledVector(c.clone().sub(b), (d4 - d3) / ((d4 - d3) + (d5 - d6)));
    const den = 1 / (va + vb + vc); return a.clone().addScaledVector(ab, vb * den).addScaledVector(ac, vc * den);
  }
  function whaleTris() {
    const tris = []; const M = whale.group.matrixWorld;
    const addGeo = (g, mtx) => { const p = g.attributes.position, ix = g.index; const n = ix ? ix.count : p.count;
      for (let i = 0; i < n; i += 3) { const ia = ix ? ix.getX(i) : i, ib = ix ? ix.getX(i + 1) : i + 1, ic = ix ? ix.getX(i + 2) : i + 2;
        tris.push([V(p.getX(ia), p.getY(ia), p.getZ(ia)).applyMatrix4(mtx), V(p.getX(ib), p.getY(ib), p.getZ(ib)).applyMatrix4(mtx), V(p.getX(ic), p.getY(ic), p.getZ(ic)).applyMatrix4(mtx)]); } };
    for (const m of [whale.parts.mesh1, whale.parts.mesh2, whale.parts.roof, whale.parts.lip, ...whale.parts.fringes]) { m.updateMatrixWorld(true); addGeo(m.geometry, m.matrixWorld); }
    const bl = whale.parts.baleen, im = new THREE.Matrix4();
    for (let k = 0; k < bl.count; k += 2) { bl.getMatrixAt(k, im); const mm = M.clone().multiply(im); addGeo(bl.geometry, mm); }
    for (const fp of whale.parts.flippers) { fp.children[0].updateMatrixWorld(true); addGeo(fp.children[0].geometry, fp.children[0].matrixWorld); }
    whale.parts.fluke.updateMatrixWorld(true); addGeo(whale.parts.fluke.geometry, whale.parts.fluke.matrixWorld);
    return tris;
  }
  function minDist(pts, tris, cutoff = 1.0) {
    // bucket triangles by their bounding box to keep it fast
    let best = 1e9, bp = null;
    const boxes = tris.map(([a, b, c]) => [Math.min(a.x, b.x, c.x), Math.max(a.x, b.x, c.x), Math.min(a.y, b.y, c.y), Math.max(a.y, b.y, c.y), Math.min(a.z, b.z, c.z), Math.max(a.z, b.z, c.z)]);
    for (const p of pts) for (let i = 0; i < tris.length; i++) {
      const bx = boxes[i]; if (p.x < bx[0] - cutoff || p.x > bx[1] + cutoff || p.y < bx[2] - cutoff || p.y > bx[3] + cutoff || p.z < bx[4] - cutoff || p.z > bx[5] + cutoff) continue;
      const q = cpt(p, ...tris[i]); const d = q.distanceTo(p); if (d < best) { best = d; bp = p; }
    }
    return { d: best, at: bp ? bp.toArray().map((v) => +v.toFixed(2)) : null };
  }
  function visibleDiverPts(onlyVisible) {
    let sk = null; diver.me.root.traverse((o) => { if (o.isSkinnedMesh) sk = o; });
    if (!diver.me.root.visible) return [];
    const g = sk.geometry, p = g.attributes.position, hide = g.attributes.aHide, out = [];
    cam.updateMatrixWorld(true); const pv = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    for (let i = 0; i < p.count; i += 2) {
      if (hide.getX(i) > 0.3) continue;
      const v = V(p.getX(i), p.getY(i), p.getZ(i)); sk.applyBoneTransform(i, v); v.applyMatrix4(sk.matrixWorld);
      if (onlyVisible) { const c = v.clone().applyMatrix4(pv); if (c.x < -1.05 || c.x > 1.05 || c.y < -1.05 || c.y > 1.05 || c.z > 1) continue; const vv = v.clone().applyMatrix4(cam.matrixWorldInverse); if (vv.z > -0.02) continue; }
      out.push(v);
    }
    return out;
  }
  const res = [];
  for (const t of times) {
    window.renderFrame(t);
    const shot = window.EP.shotAt(t).id;
    const tris = whale.group.visible ? whaleTris() : [];
    const r = { t, shot };
    r.cam = tris.length ? minDist([cam.position.clone()], tris, 2).d.toFixed(3) : '-';
    const dp = visibleDiverPts(shot[0] !== 'I' && shot !== 'J');
    r.nDiver = dp.length;
    if (dp.length && tris.length) { const m = minDist(dp, tris, 0.4); r.diver = m.d.toFixed(3); r.at = m.at; }
    // whale vs seabed (every 7th vertex of the skin and pouch)
    let bed = 1e9; for (const m of [whale.parts.mesh1, whale.parts.mesh2]) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i += 7) { const v = V(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m.matrixWorld); bed = Math.min(bed, v.y - by(v.x, v.z)); } }
    r.whaleBed = bed.toFixed(2);
    // gloves vs rocks, lobster and sand; kayak vs whale; diver vs kayak
    const extra = [];
    const addMesh = (m) => { m.updateMatrixWorld(true); const g = m.geometry, p = g.attributes.position, ix = g.index; const n = ix ? ix.count : p.count;
      for (let i = 0; i < n; i += 3) { const ia = ix ? ix.getX(i) : i, ib = ix ? ix.getX(i + 1) : i + 1, ic = ix ? ix.getX(i + 2) : i + 2;
        extra.push([V(p.getX(ia), p.getY(ia), p.getZ(ia)).applyMatrix4(m.matrixWorld), V(p.getX(ib), p.getY(ib), p.getZ(ib)).applyMatrix4(m.matrixWorld), V(p.getX(ic), p.getY(ic), p.getZ(ic)).applyMatrix4(m.matrixWorld)]); } };
    if (dp.length) {
      const near = (m) => { const c = new THREE.Box3().setFromObject(m); return c.distanceToPoint(cam.position) < 4; };
      window.EP.rocks.group.children.forEach((m) => { if (near(m)) addMesh(m); });
      if (window.EP.lobster.visible) window.EP.lobster.traverse((m) => { if (m.isMesh) addMesh(m); });
      if (extra.length) { const m = minDist(dp, extra, 0.3); r.rock = m.d.toFixed(3); }
      let sand = 1e9; for (const v of dp) sand = Math.min(sand, v.y - by(v.x, v.z)); r.sand = sand.toFixed(2);
    }
    if (window.EP.kayak.visible && tris.length) { const kp = []; window.EP.kayak.traverse((m) => { if (m.isMesh) { m.updateMatrixWorld(true); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) kp.push(V(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m.matrixWorld)); } }); r.kayak = minDist(kp, tris, 0.5).d.toFixed(3); }
    r.camBed = (cam.position.y - by(cam.position.x, cam.position.z)).toFixed(2);
    res.push(r);
  }
  return res;
})
