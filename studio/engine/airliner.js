// A narrow-body airliner (A320-class: 37.6 m long, 35.8 m span, 11.8 m tall) built procedurally for post 9, in a made-up
// livery (white body, grey belly, a deep navy tail with a white swoosh, no name or logo). Local frame: nose toward +x,
// up +y, left wing toward -z. Lights: landing lights (with their cones, for the rain), red/green/white navigation lights,
// white strobes and a red beacon (both pulsed smoothly, never a one-frame flash), lit cabin windows. The fans spin with a
// motion-blurred blade pattern (blurred over the angle swept per frame, so they never strobe) and spool down when the
// engines flame out; the ram air turbine drops out of the belly fairing when both engines are lost.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
// fuselage radius and centreline height along x (x = 0 at the tail tip, 37.6 at the nose)
const L = 37.6, R0 = 1.98;
function fusR(x) {
  const n = L - x;                                                   // distance from the nose
  if (n < 6.5) { const u = n / 6.5; return R0 * Math.pow(Math.sin(u * Math.PI / 2), 0.62); }
  if (x < 12.5) { const u = x / 12.5; return Math.max(0.22, R0 * Math.pow(u, 0.75)); }
  return R0;
}
function fusY(x) { return x < 12.5 ? (1 - x / 12.5) ** 1.6 * 1.25 : 0; }   // the tail cone rises
function fuselageGeo() {
  const nx = 90, na = 40, pos = [], uv = [], idx = [];
  for (let i = 0; i <= nx; i++) {
    const x = (i / nx) * L, r = Math.max(fusR(x), 0.02), cy = fusY(x) - (L - x < 6.5 ? 0.35 * (1 - (L - x) / 6.5) ** 2 : 0);
    for (let j = 0; j <= na; j++) { const a = (j / na) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
      pos.push(x - L / 2, cy + c * r * 1.045, s * r); uv.push(x / L, j / na); }
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < na; j++) { const a = i * (na + 1) + j, b = a + na + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a lofted wing-like surface: sections [{ le: Vector3 (leading edge), chord, t (thickness ratio) }] lofted with a
// symmetric-ish airfoil (NACA-like), chord along +x backward (-x)
function loftGeo(sections, flip = false, vertical = false) {
  const nc = 18, pos = [], idx = [];
  const af = []; for (let i = 0; i <= nc; i++) { const u = 0.5 - 0.5 * Math.cos(Math.PI * i / nc); af.push(u); }
  const yt = (u, t) => 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
  for (const s of sections) {
    const ring = [];
    for (let i = 0; i <= nc; i++) ring.push([af[i], yt(af[i], s.t) * 1.05 + (vertical ? 0 : 0.012 * Math.sin(Math.PI * af[i]))]);   // upper (slight camber)
    for (let i = nc - 1; i >= 1; i--) ring.push([af[i], -yt(af[i], s.t) * 0.9 + (vertical ? 0 : 0.008 * Math.sin(Math.PI * af[i]))]);   // lower
    for (const [u, y] of ring) {
      if (vertical) pos.push(s.le.x - u * s.chord, s.le.y, s.le.z + y * s.chord);
      else pos.push(s.le.x - u * s.chord, s.le.y + y * s.chord, s.le.z);
    }
  }
  const m = 2 * nc;
  for (let k = 0; k < sections.length - 1; k++) for (let i = 0; i < m; i++) {
    const a = k * m + i, b = k * m + (i + 1) % m, c = (k + 1) * m + i, d = (k + 1) * m + (i + 1) % m;
    if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  // close the tip
  const tip = (sections.length - 1) * m; const cIdx = pos.length / 3; let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < m; i++) { cx += pos[(tip + i) * 3]; cy += pos[(tip + i) * 3 + 1]; cz += pos[(tip + i) * 3 + 2]; }
  pos.push(cx / m, cy / m, cz / m); for (let i = 0; i < m; i++) { const a = tip + i, b = tip + (i + 1) % m; if (flip) idx.push(a, cIdx, b); else idx.push(a, b, cIdx); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a fan face: blades seen through the inlet, blurred over the angle they sweep in one frame (uSweep, radians)
function fanMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uRot: { value: 0 }, uSweep: { value: 0 }, uLight: { value: 0.12 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uRot, uSweep, uLight; varying vec2 vP;
      void main(){ float r = length(vP), a = atan(vP.y, vP.x) - uRot;
        float nb = 22.0, ph = fract(a * nb / 6.2831853 + r * 0.9);           // swept blades
        float w = clamp(uSweep * nb / 6.2831853, 0.0, 1.0);                  // blur width, in blade periods
        float blade = mix(smoothstep(0.42, 0.5, ph) * (1.0 - smoothstep(0.5 + 0.38, 0.98, ph)), 0.42, w);
        float hub = 1.0 - smoothstep(0.28, 0.31, r);
        vec3 c = mix(vec3(0.02), vec3(0.16, 0.17, 0.19), blade) * (0.6 + 0.4 * r);
        c = mix(c, vec3(0.32), hub * 0.0);
        gl_FragColor = vec4(c * (0.4 + uLight * 6.0), 1.0); }`,
  });
}
export function makeAirliner() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const white = new THREE.MeshPhysicalMaterial({ color: '#f1f3f5', roughness: 0.32, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const grey = new THREE.MeshStandardMaterial({ color: '#a9b0b8', roughness: 0.4, metalness: 0.4 });
  const navy = new THREE.MeshPhysicalMaterial({ color: '#16233d', roughness: 0.35, metalness: 0.1, clearcoat: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: '#c4c8cc', roughness: 0.25, metalness: 1.0 });
  const dark = new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.5, metalness: 0.3 });
  // the fuselage: white over grey belly, a row of cabin windows (lit), the cockpit's dark windscreen
  const fusM = new THREE.MeshPhysicalMaterial({ color: '#f1f3f5', roughness: 0.3, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.18 });
  const U = { uCabin: { value: 1 }, uCabinCol: { value: new THREE.Color('#ffd9a8') } };
  fusM.onBeforeCompile = (s) => {
    s.uniforms.uCabin = U.uCabin; s.uniforms.uCabinCol = U.uCabinCol;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP; uniform float uCabin; uniform vec3 uCabinCol;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float x = vLP.x + ${(L / 2).toFixed(2)}, yy = vLP.y, zz = vLP.z;
        float belly = smoothstep(-0.55, -0.85, yy / ${R0.toFixed(2)});
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.65, 0.69), belly);
        // cabin windows: 0.23 x 0.33 m, every 0.53 m, from x = 8.5 to 31 (both sides)
        float side = abs(zz) / ${R0.toFixed(2)};
        float wx = fract((x - 8.5) / 0.53), wy = (yy - 0.42) / 0.17;
        vec2 fwW = fwidth(vec2((x - 8.5) / 0.53, wy)) + 1e-4;
        float inRow = step(8.5, x) * step(x, 31.0) * step(0.55, side) * (1.0 - step(16.8, x) * step(x, 18.4));
        float wnd = inRow * (1.0 - smoothstep(0.22 - fwW.x, 0.22 + fwW.x, abs(wx - 0.5))) * (1.0 - smoothstep(1.0 - fwW.y * 2.0, 1.0 + fwW.y * 2.0, abs(wy)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03), wnd);
        // the windscreen
        float n = ${L.toFixed(2)} - x;
        float ws = step(2.2, n) * step(n, 3.6) * smoothstep(0.35, 0.45, yy / ${R0.toFixed(2)} + 0.55) * step(yy, 1.3) * step(abs(zz), 1.45);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.025, 0.03), ws);
        // a thin navy cheatline toward the tail
        float cl = step(0.0, x) * smoothstep(0.035, 0.0, abs(yy - 0.05 - 0.02 * (31.0 - x) / 31.0) - 0.06) * step(x, 30.0) * step(0.6, side);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.09, 0.14, 0.24), cl * 0.0);
        float cabinGlow = wnd;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uCabinCol * cabinGlow * uCabin * 2.2;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.05, max(wnd, ws));');
  };
  const fus = new THREE.Mesh(fuselageGeo(), fusM); fus.castShadow = true; body.add(fus);
  // the wings: root chord 6.1 m at the fuselage, tip 1.5 m at 17.05 m, 25 degrees of sweep, 5 degrees of dihedral; sharklets
  const xr = 3.2, wy = -1.1;                                          // root leading edge (x from the centre), height
  const sweep = Math.tan(THREE.MathUtils.degToRad(27)), dih = Math.tan(THREE.MathUtils.degToRad(5));
  for (const sd of [-1, 1]) {
    const secs = [];
    for (const [zz, ch, t] of [[1.7, 6.6, 0.15], [6.3, 4.5, 0.13], [12, 2.7, 0.11], [16.9, 1.55, 0.1]]) secs.push({ le: V(xr - (zz - 1.7) * sweep, wy + (zz - 1.7) * dih, sd * zz), chord: ch, t });
    const w = new THREE.Mesh(loftGeo(secs, sd > 0), white); w.castShadow = true; body.add(w);
    // the sharklet: a near-vertical fin at the tip
    const tip = secs[3].le, sk = loftGeo([{ le: tip.clone().add(V(-0.1, 0, 0)), chord: 1.5, t: 0.08 }, { le: tip.clone().add(V(-1.4, 2.3, sd * 0.35)), chord: 0.55, t: 0.07 }], sd > 0, true);
    const shark = new THREE.Mesh(sk, navy); body.add(shark);
    // the engine: nacelle (inlet lip, body, exhaust cone), pylon, fan face
    // (A320-style: the inlet ~2.7 m ahead of the leading edge, the nacelle tucked under the wing, its top 0.3 m below it)
    const ez = sd * 5.75, le = xr - (5.75 - 1.7) * sweep, ex = le + 1.7, ey = wy - 1.37;
    const prof = [[0, 0.95], [0.15, 1.08], [0.6, 1.12], [2.4, 1.08], [3.6, 0.82], [4.2, 0.62]].map(([x, r]) => new THREE.Vector2(r, x));
    const nac = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), white); nac.rotation.z = Math.PI / 2; nac.position.set(ex + 1.0, ey, ez); body.add(nac);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.1, 10, 36), metal); lip.rotation.y = Math.PI / 2; lip.position.set(ex + 1.0, ey, ez); body.add(lip);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.97, 0.9, 36, 1, true), dark); inner.rotation.z = Math.PI / 2; inner.position.set(ex + 0.55, ey, ez); inner.material.side = THREE.BackSide; body.add(inner);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.95, 48), fanMat()); fan.rotation.y = Math.PI / 2; fan.position.set(ex + 0.25, ey, ez); body.add(fan);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 20), metal); spinner.rotation.z = -Math.PI / 2; spinner.position.set(ex + 0.45, ey, ez); body.add(spinner);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 20), dark); cone.rotation.z = Math.PI / 2; cone.position.set(ex - 3.6, ey, ez); body.add(cone);
    // the pylon: from just behind the fan (between the duct and the outer skin, so nothing shows through the inlet) back
    // and up into the wing's underside, overlapping its chord by 2.4 m
    const pf = ex + 0.15, pb = le - 2.4, py0 = ey + 1.0, py1 = wy + 0.15 + (5.75 - 1.7) * dih;
    const psh = new THREE.Shape([V(pf, py0), V(pf, ey + 1.32), V(le + 0.25, py1), V(pb, py1), V(pb + 0.9, py0)].map((v) => new THREE.Vector2(v.x, v.y)));
    const pg = new THREE.ExtrudeGeometry(psh, { depth: 0.26, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 }); pg.translate(0, 0, -0.13);
    const pyl = new THREE.Mesh(pg, white); pyl.position.z = ez; body.add(pyl);
    (sd < 0 ? (g.fanL = fan) : (g.fanR = fan));
  }
  // belly fairing (the wing box) and the ram air turbine (hidden until both engines are lost)
  const fair = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), grey); fair.scale.set(6.2, 0.9, 2.0); fair.position.set(-0.2, -1.55, 0); body.add(fair);
  const rat = new THREE.Group(); { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), grey); arm.position.y = -0.55; rat.add(arm);
    const hubM = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), grey); hubM.position.y = -1.1; rat.add(hubM);
    for (const a of [0, Math.PI]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.8), dark); bl.position.set(0.12, -1.1, 0); bl.rotation.x = a; rat.add(bl); } }
  rat.position.set(1.6, -1.9, 1.0); body.add(rat); g.rat = rat;
  // the tail: fin (6 m, swept), rudder line, horizontal stabilisers
  const fin = new THREE.Mesh(loftGeo([{ le: V(-11.5, 1.6, 0), chord: 6.6, t: 0.11 }, { le: V(-16.6, 7.6, 0), chord: 2.6, t: 0.1 }], false, true), navy); body.add(fin);
  // a white swoosh on the fin (both sides): a thin curved band
  for (const sd of [-1, 1]) { const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(V(-12.8 - 3.2 * u - 0.6 * Math.sin(Math.PI * u), 2.6 + 4.2 * u, sd * 0.2)); }
    const sw = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.12, 6, false), white); sw.scale.z = 0.6; body.add(sw); }
  for (const sd of [-1, 1]) { const hs = new THREE.Mesh(loftGeo([{ le: V(-14.6, 0.9, sd * 0.6), chord: 3.7, t: 0.1 }, { le: V(-17.4, 1.2, sd * 6.2), chord: 1.5, t: 0.09 }], sd > 0), white); body.add(hs); }
  // lights
  const glow = (col, k, r = 0.12) => new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), toneMapped: true }));
  const navL = glow('#ff2a20', 10), navR = glow('#20ff70', 10), navT = glow('#ffffff', 7);
  navL.position.set(xr - 15.2 * sweep - 0.3, wy + 15.2 * dih + 0.15, -16.95); navR.position.set(xr - 15.2 * sweep - 0.3, wy + 15.2 * dih + 0.15, 16.95); navT.position.set(-18.8, 0.9, 0);
  const strL = glow('#ffffff', 0, 0.16), strR = glow('#ffffff', 0, 0.16); strL.position.copy(navL.position).add(V(-0.25, 0, 0)); strR.position.copy(navR.position).add(V(-0.25, 0, 0));
  const bcnT = glow('#ff1a10', 0, 0.16), bcnB = glow('#ff1a10', 0, 0.16); bcnT.position.set(2, 2.1, 0); bcnB.position.set(1, -2.25, 0);
  const landL = glow('#fff4e0', 0, 0.22), landR = glow('#fff4e0', 0, 0.22); landL.position.set(xr - 0.4, wy - 0.2, -2.4); landR.position.set(xr - 0.4, wy - 0.2, 2.4);
  body.add(navL, navR, navT, strL, strR, bcnT, bcnB, landL, landR);
  g.parts = { navL, navR, navT, strL, strR, bcnT, bcnB, landL, landR };
  g.U = U;
  // state: t = video time (for the light pulses), phys = story clock, out = the flame-out instant (story clock), dt = story s per frame
  g.update = (t, { phys, out = 1e9, dt = 1 / 30, landing = 1, rpmK = 1, tauFan = 0.22, genOff = 0.3, ratAt = 0.6 } = {}) => {
    const after = phys - out, dead = after > 0;
    // fans: ~4,800 rpm at approach thrust (80 rad/s), braked by the thick air (time constant tauFan)
    const w0 = 80 * rpmK, kf = 1 / tauFan, w = dead ? w0 * Math.exp(-after * kf) : w0;
    const ang = dead ? w0 * out + (w0 / kf) * (1 - Math.exp(-after * kf)) : w0 * phys;
    for (const f of [g.fanL, g.fanR]) { f.material.uniforms.uRot.value = ang % (Math.PI * 2); f.material.uniforms.uSweep.value = w * dt; }
    // the lights: strobes double-flash every 1.2 s, the beacon pulses every 1 s (smooth pulses of ~0.12 s)
    const pulse = (x, c, wdt) => Math.exp(-(((x - c) / wdt) ** 2));
    const s = (t % 1.2), st = pulse(s, 0.1, 0.035) + pulse(s, 0.32, 0.035), b = pulse(t % 1.0, 0.5, 0.07);
    for (const m of [g.parts.strL, g.parts.strR]) m.material.color.setRGB(14 * st, 14 * st, 14 * st);
    for (const m of [g.parts.bcnT, g.parts.bcnB]) m.material.color.setRGB(9 * b, 1 * b, 0.6 * b);
    // the generators drop off line as the engines run down: landing lights out, the cabin on emergency lighting
    const ge = phys - out - genOff, off = ge > 0;
    const lk = off ? Math.max(0, 1 - ge * 3) : 1;
    g.landK = landing * lk;
    for (const m of [g.parts.landL, g.parts.landR]) m.material.color.setRGB(16 * g.landK, 15 * g.landK, 13 * g.landK);
    U.uCabin.value = off ? 0.25 + 0.75 * Math.exp(-ge * 6) : 1;
    // the RAT swings down over 0.8 s
    const rk = clamp01((phys - out - ratAt) / 0.8); g.rat.visible = rk > 0; g.rat.rotation.z = -Math.PI / 2 * (1 - rk) * 0.98;
  };
  // the landing lights as spot cones for the rain (world space)
  g.spots = (out = []) => {
    if (!(g.landK > 0.001)) return out;
    g.updateMatrixWorld(true);
    const dir = V(1, -0.12, 0).transformDirection(g.matrixWorld);
    for (const m of [g.parts.landL, g.parts.landR]) out.push({ p: m.getWorldPosition(V(0, 0, 0)), d: dir.clone(), col: new THREE.Color(70 * g.landK, 66 * g.landK, 59 * g.landK), inner: 0.985, outer: 0.92 });
    return out;
  };
  return g;
}
