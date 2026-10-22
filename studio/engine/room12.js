// Series « 12 % »: Inès's room under the roof (6th floor, behind the dormer of bay 3) and the building's stairwell.
// Same world frame as paris12.js: x along the street, the façade on z = 0, the room behind it (z < 0), the stairwell behind
// the room's door. Everything here is built once and reused by every part.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SIMPLEX } from './fx.js';
import { LV, DORMER, HERO_BAY } from './paris12.js';

export const ROOM = { X0: 1.5, X1: 4.9, Z0: -4.4, Z1: -0.9, Y0: LV[6], CEIL: LV[6] + 2.6, KNEE: LV[6] + 1.3, SZ: -1.7,
  DX0: 3.88, DX1: 4.71, DH: 2.05, AX0: HERO_BAY - DORMER.w / 2, AX1: HERO_BAY + DORMER.w / 2, SILL: DORMER.sill, WTOP: DORMER.sill + DORMER.win, AZ: -0.46 };
export const STAIR = { XA0: 6.5, XA1: 7.5, XB0: 5.0, XB1: 6.0, ZC: -5.7, ZH: -8.4, ZB: -9.4, X0: 1.5, X1: 7.6, ZW: -4.4, STEPS: 10, RUN: 0.27 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g.toNonIndexed(); };
const rbox = (w, h, d, r, x, y, z) => { const g = new RoundedBoxGeometry(w, h, d, 3, r); g.translate(x, y, z); return g.toNonIndexed(); };
const merge = (list, mat, { cast = true, recv = true } = {}) => { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast; m.receiveShadow = recv; return m; };
// a flat polygon given in (z, y) placed in the plane x = x0 (walls are drawn double-sided, so winding does not matter)
function sidePoly(pts, x0) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const sx = p.getX(i), sy = p.getY(i); p.setXYZ(i, x0, sy, sx); }
  g.computeVertexNormals(); return g.toNonIndexed();
}
function quad(a, b, c, d) {          // two triangles a-b-c, a-c-d (counter-clockwise seen from the front)
  const g = new THREE.BufferGeometry(); const P = [a, b, c, a, c, d].flatMap((v) => [v.x, v.y, v.z]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  const uv = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]; g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
}

// ---------- materials ----------
export function plasterMat(color = '#e4ddd1', key = 'plaster12') {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.93 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; ${SIMPLEX}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= 0.95 + 0.05 * snoise(vWP * 1.7) + 0.03 * snoise(vWP * 7.0);`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}
export function parquetMat() {
  const m = new THREE.MeshStandardMaterial({ color: '#8a5c3a', roughness: 0.45 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; ${SIMPLEX}
      float hh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      { float u = vWP.x / 0.12; float row = floor(u); float v = vWP.z / 0.9 + hh(vec2(row, 1.0));
        float fu = fract(u), fv = fract(v), wu = fwidth(u), wv = fwidth(v);
        float j = max(1.0 - smoothstep(0.0, 0.04 + wu, min(fu, 1.0 - fu)), 1.0 - smoothstep(0.0, 0.01 + wv, min(fv, 1.0 - fv)));
        float plank = hh(vec2(row, floor(v)));
        float grain = snoise(vec3(vWP.x * 40.0, vWP.z * 2.0, plank * 9.0)) * 0.5 + 0.5;
        diffuseColor.rgb *= (0.78 + 0.32 * plank) * (0.9 + 0.12 * grain) * (1.0 - 0.45 * j); }`);
  };
  m.customProgramCacheKey = () => 'parquet12';
  return m;
}
// fabric: a little weave noise
function fabricMat(color, rough = 0.95) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }); }

// ---------- the room ----------
export function makeRoom() {
  const R = ROOM, g = new THREE.Group();
  const wall = plasterMat(), wood = new THREE.MeshStandardMaterial({ color: '#4a2c1c', roughness: 0.5 });
  const W = [];
  // back wall with the door opening
  W.push(quad(V(R.X0, R.Y0, R.Z0), V(R.DX0, R.Y0, R.Z0), V(R.DX0, R.CEIL, R.Z0), V(R.X0, R.CEIL, R.Z0)));
  W.push(quad(V(R.DX1, R.Y0, R.Z0), V(R.X1, R.Y0, R.Z0), V(R.X1, R.CEIL, R.Z0), V(R.DX1, R.CEIL, R.Z0)));
  W.push(quad(V(R.DX0, R.Y0 + R.DH, R.Z0), V(R.DX1, R.Y0 + R.DH, R.Z0), V(R.DX1, R.CEIL, R.Z0), V(R.DX0, R.CEIL, R.Z0)));
  // front knee wall (facing -z, into the room) with the dormer alcove opening above the sill
  const fw = (xa, xb, ya, yb) => W.push(quad(V(xb, ya, R.Z1), V(xa, ya, R.Z1), V(xa, yb, R.Z1), V(xb, yb, R.Z1)));
  fw(R.X0, R.AX0, R.Y0, R.KNEE); fw(R.AX1, R.X1, R.Y0, R.KNEE); fw(R.AX0, R.AX1, R.Y0, R.SILL);
  // the sloped ceiling from the knee wall up to the flat ceiling, with the alcove cut out
  const zAt = (y) => R.Z1 + (R.SZ - R.Z1) * (y - R.KNEE) / (R.CEIL - R.KNEE), zT = zAt(R.WTOP);
  const sl = (xa, xb, y0) => W.push(quad(V(xa, y0, zAt(y0)), V(xb, y0, zAt(y0)), V(xb, R.CEIL, R.SZ), V(xa, R.CEIL, R.SZ)));
  sl(R.X0, R.AX0, R.KNEE); sl(R.AX1, R.X1, R.KNEE); sl(R.AX0, R.AX1, R.WTOP);
  W.push(quad(V(R.X0, R.CEIL, R.SZ), V(R.X1, R.CEIL, R.SZ), V(R.X1, R.CEIL, R.Z0), V(R.X0, R.CEIL, R.Z0)));       // flat ceiling (faces down)
  // the alcove: sides, its little ceiling, the sill board
  const prof = [[R.Z1, R.SILL], [R.AZ, R.SILL], [R.AZ, R.WTOP], [zT, R.WTOP], [R.Z1, R.KNEE]];
  W.push(sidePoly(prof, R.AX0, 1), sidePoly(prof, R.AX1, -1));
  W.push(quad(V(R.AX0, R.WTOP, R.AZ), V(R.AX1, R.WTOP, R.AZ), V(R.AX1, R.WTOP, zT), V(R.AX0, R.WTOP, zT)));
  // side walls (pentagons)
  const side = [[R.Z0, R.Y0], [R.Z1, R.Y0], [R.Z1, R.KNEE], [R.SZ, R.CEIL], [R.Z0, R.CEIL]];
  W.push(sidePoly(side, R.X0, 1), sidePoly(side, R.X1, -1));
  const walls = merge(W.map((x) => x.index ? x.toNonIndexed() : x), wall); walls.material.side = THREE.DoubleSide; g.add(walls);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(R.X1 - R.X0, R.Z1 - R.Z0), parquetMat()); floor.rotation.x = -Math.PI / 2;
  floor.position.set((R.X0 + R.X1) / 2, R.Y0, (R.Z0 + R.Z1) / 2); floor.receiveShadow = true; g.add(floor);
  const skirt = [box(R.X1 - R.X0, 0.09, 0.015, (R.X0 + R.X1) / 2, R.Y0 + 0.045, R.Z1 - 0.008), box(0.015, 0.09, R.Z1 - R.Z0, R.X0 + 0.008, R.Y0 + 0.045, (R.Z0 + R.Z1) / 2),
    box(0.015, 0.09, R.Z1 - R.Z0, R.X1 - 0.008, R.Y0 + 0.045, (R.Z0 + R.Z1) / 2), box(R.DX0 - R.X0, 0.09, 0.015, (R.X0 + R.DX0) / 2, R.Y0 + 0.045, R.Z0 + 0.008)];
  g.add(merge(skirt, new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.6 })));
  // sill board + the window: frame and two casements that open inward
  g.add(merge([box(R.AX1 - R.AX0, 0.04, 0.5, (R.AX0 + R.AX1) / 2, R.SILL - 0.02, (R.Z1 + R.AZ) / 2 - 0.02)], new THREE.MeshStandardMaterial({ color: '#d9d2c5', roughness: 0.55 })));
  const frameM = new THREE.MeshStandardMaterial({ color: '#efebe2', roughness: 0.55 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#0d1014', roughness: 0.04, metalness: 0.05, clearcoat: 1, transparent: true, opacity: 0.22 });
  const wz = R.AZ + 0.02, wx0 = HERO_BAY - DORMER.ww / 2, wy0 = R.SILL, wh = DORMER.win;
  g.add(merge([box(DORMER.ww + 0.08, 0.06, 0.07, HERO_BAY, wy0, wz), box(DORMER.ww + 0.08, 0.06, 0.07, HERO_BAY, wy0 + wh, wz),
    box(0.05, wh, 0.07, wx0, wy0 + wh / 2, wz), box(0.05, wh, 0.07, wx0 + DORMER.ww, wy0 + wh / 2, wz)], frameM));
  const leaves = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(HERO_BAY + s * DORMER.ww / 2, wy0, wz - 0.01); g.add(hinge);
    const lw = DORMER.ww / 2 - 0.02, lx = -s * lw / 2;
    const fr = merge([box(lw, 0.05, 0.05, lx, 0.04, 0), box(lw, 0.05, 0.05, lx, wh - 0.04, 0), box(0.045, wh - 0.06, 0.05, lx - lw / 2 + 0.022, wh / 2, 0),
      box(0.045, wh - 0.06, 0.05, lx + lw / 2 - 0.022, wh / 2, 0), box(lw, 0.03, 0.035, lx, wh * 0.5, 0)], frameM, { cast: true });
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(lw - 0.06, wh - 0.08), glassM); gl.position.set(lx, wh / 2, 0); gl.renderOrder = 3;
    hinge.add(fr, gl); leaves.push({ hinge, s });
  }
  const openWindow = (k) => { for (const { hinge, s } of leaves) hinge.rotation.y = s * k * 1.25; };
  // the door: dark varnished wood with panels, a brass peephole, a lever handle, a deadbolt; hinged at DX1, opens inward
  const door = new THREE.Group(); door.position.set(R.DX1, R.Y0, R.Z0); g.add(door);
  const dw = R.DX1 - R.DX0, leafD = [rbox(dw - 0.01, R.DH - 0.015, 0.045, 0.006, -dw / 2, R.DH / 2 + 0.012, 0.03)];
  for (const [yy, hh] of [[0.55, 0.62], [1.42, 0.86]]) leafD.push(rbox(dw - 0.26, hh, 0.02, 0.004, -dw / 2, yy, 0.058));
  const leaf = merge(leafD, wood); door.add(leaf);
  const brass = new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.32, metalness: 0.9 });
  const pp = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.07, 16), brass); pp.rotation.x = Math.PI / 2; pp.position.set(-dw / 2, 1.55, 0.03); door.add(pp);
  const lever = merge([box(0.13, 0.022, 0.025, -dw + 0.14, 1.02, 0.085), box(0.04, 0.12, 0.012, -dw + 0.08, 1.02, 0.062)], brass); door.add(lever);
  const bolt = new THREE.Group(); bolt.position.set(-dw + 0.08, 1.24, 0.065); door.add(bolt);
  bolt.add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 20), brass).rotateX(Math.PI / 2));
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.034, 0.012), brass); knob.position.z = 0.012; bolt.add(knob);
  const archi = [box(0.07, R.DH + 0.07, 0.025, R.DX0 - 0.035, R.Y0 + R.DH / 2, R.Z0 + 0.012), box(0.07, R.DH + 0.07, 0.025, R.DX1 + 0.035, R.Y0 + R.DH / 2, R.Z0 + 0.012),
    box(dw + 0.14, 0.07, 0.025, (R.DX0 + R.DX1) / 2, R.Y0 + R.DH + 0.035, R.Z0 + 0.012)];
  g.add(merge(archi, new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.6 })));
  door.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const setDoor = (k) => { door.rotation.y = k * 1.45; };                  // 0 shut, 1 wide open (into the room)
  const setBolt = (k) => { bolt.rotation.z = k * Math.PI / 2; };
  // furniture
  const F = [];
  const bedM = new THREE.MeshStandardMaterial({ color: '#6b4a33', roughness: 0.6 });
  F.push([merge([box(0.96, 0.26, 2.0, 2.0, R.Y0 + 0.17, -3.35), box(0.96, 0.75, 0.06, 2.0, R.Y0 + 0.37, -4.33)], bedM)]);
  F.push([merge([rbox(0.9, 0.2, 1.94, 0.06, 2.0, R.Y0 + 0.4, -3.35)], fabricMat('#e9e6e0'))]);
  const duvet = rbox(0.98, 0.12, 1.25, 0.05, 2.0, R.Y0 + 0.53, -2.95); F.push([merge([duvet], fabricMat('#7f8fa3'))]);
  F.push([merge([rbox(0.6, 0.14, 0.38, 0.06, 2.0, R.Y0 + 0.57, -4.05)], fabricMat('#f2efe8'))]);
  // desk along the left wall near the window, a closed laptop, a lamp, books; a chair
  const deskM = new THREE.MeshStandardMaterial({ color: '#c9b79c', roughness: 0.55 });
  F.push([merge([box(0.62, 0.035, 1.05, 1.84, R.Y0 + 0.74, -1.75), box(0.04, 0.72, 0.04, 1.57, R.Y0 + 0.36, -2.25), box(0.04, 0.72, 0.04, 2.12, R.Y0 + 0.36, -2.25),
    box(0.04, 0.72, 0.04, 1.57, R.Y0 + 0.36, -1.25), box(0.04, 0.72, 0.04, 2.12, R.Y0 + 0.36, -1.25)], deskM)]);
  F.push([merge([rbox(0.32, 0.018, 0.22, 0.006, 1.86, R.Y0 + 0.767, -1.9)], new THREE.MeshStandardMaterial({ color: '#9aa0a8', metalness: 0.8, roughness: 0.3 }))]);
  F.push([merge([box(0.05, 0.22, 0.16, 1.62, R.Y0 + 0.87, -1.45), box(0.05, 0.2, 0.15, 1.68, R.Y0 + 0.86, -1.45), box(0.05, 0.24, 0.17, 1.74, R.Y0 + 0.88, -1.45)], new THREE.MeshStandardMaterial({ color: '#7a2f2a', roughness: 0.8 }))]);
  F.push([merge([box(0.42, 0.03, 0.42, 2.4, R.Y0 + 0.46, -1.8), box(0.04, 0.46, 0.04, 2.22, R.Y0 + 0.23, -1.62), box(0.04, 0.46, 0.04, 2.58, R.Y0 + 0.23, -1.62),
    box(0.04, 0.46, 0.04, 2.22, R.Y0 + 0.23, -1.98), box(0.04, 0.46, 0.04, 2.58, R.Y0 + 0.23, -1.98), box(0.04, 0.45, 0.4, 2.6, R.Y0 + 0.7, -1.8)], new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.6 }))]);
  // kitchenette on the right wall: counter, sink, tap, hob, a small fridge, a shelf with jars, a hook with two towels
  const cx = R.X1 - 0.3, kz0 = -3.75, kz1 = -2.55, top = R.Y0 + 0.9;
  F.push([merge([box(0.6, 0.86, kz1 - kz0, cx, R.Y0 + 0.43, (kz0 + kz1) / 2)], new THREE.MeshStandardMaterial({ color: '#f0eee9', roughness: 0.5 }))]);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, kz1 - kz0 + 0.02), new THREE.MeshStandardMaterial({ color: '#3b3a38', roughness: 0.35 }));
  counter.position.set(cx, top - 0.02, (kz0 + kz1) / 2); counter.receiveShadow = true; F.push([counter]);
  const steel = new THREE.MeshStandardMaterial({ color: '#b9bdc2', metalness: 0.9, roughness: 0.25 });
  const sinkZ = -2.85;
  F.push([merge([box(0.42, 0.012, 0.4, cx - 0.02, top - 0.17, sinkZ), box(0.42, 0.16, 0.012, cx - 0.02, top - 0.09, sinkZ - 0.2), box(0.42, 0.16, 0.012, cx - 0.02, top - 0.09, sinkZ + 0.2),
    box(0.012, 0.16, 0.4, cx - 0.23, top - 0.09, sinkZ), box(0.012, 0.16, 0.4, cx + 0.19, top - 0.09, sinkZ)], steel)]);
  const tap = merge([box(0.03, 0.26, 0.03, R.X1 - 0.08, top + 0.13, sinkZ), box(0.2, 0.025, 0.025, R.X1 - 0.17, top + 0.26, sinkZ)], steel); F.push([tap]);
  F.push([merge([box(0.5, 0.012, 0.5, cx, top + 0.006, -3.4)], new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.2 }))]);
  F.push([merge([box(0.3, 0.02, kz1 - kz0, R.X1 - 0.15, R.Y0 + 1.6, (kz0 + kz1) / 2)], deskM)]);
  for (let i = 0; i < 4; i++) F.push([merge([new THREE.CylinderGeometry(0.045, 0.045, 0.14, 14).translate(R.X1 - 0.15, R.Y0 + 1.68, kz0 + 0.15 + i * 0.28).toNonIndexed()],
    new THREE.MeshPhysicalMaterial({ color: ['#c99a5b', '#e8e0cc', '#7b4b2a', '#a8b07a'][i], roughness: 0.3, transparent: true, opacity: 0.9 }))]);
  const towelM = [fabricMat('#3d6f8f'), fabricMat('#c9b38e')];
  const towelsHung = new THREE.Group(); towelsHung.position.set(R.X1 - 0.02, R.Y0 + 1.2, -2.25); F.push([towelsHung]);
  towelsHung.add(new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.5, 0.3, 2, 0.008), towelM[0]).translateZ(-0.12), new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.46, 0.28, 2, 0.008), towelM[1]).translateZ(0.16).translateX(-0.012));
  // rolled wet towels along the bottom of the door (shown once she has packed them)
  const rolled = new THREE.Group(); g.add(rolled);
  for (const [i, m] of towelM.entries()) {
    const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.34, 6, 12), m); c.rotation.z = Math.PI / 2; c.position.set(R.DX0 + 0.22 + i * 0.4, R.Y0 + 0.045, R.Z0 + 0.06); c.castShadow = true; c.receiveShadow = true; rolled.add(c);
  }
  // rug, a clothes rail with a coat, a poster, a plant on the sill, the smoke alarm on the ceiling
  F.push([merge([rbox(1.4, 0.012, 1.0, 0.004, 3.3, R.Y0 + 0.006, -2.6)], fabricMat('#8c3b2f'))]);
  F.push([merge([box(0.02, 1.5, 0.02, 3.1, R.Y0 + 0.75, -4.25), box(0.02, 1.5, 0.02, 3.7, R.Y0 + 0.75, -4.25), box(0.62, 0.02, 0.02, 3.4, R.Y0 + 1.5, -4.25)], steel)]);
  F.push([merge([rbox(0.5, 0.95, 0.12, 0.04, 3.35, R.Y0 + 1.0, -4.22)], fabricMat('#2f3b2e'))]);
  const poster = posterTex();
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ map: poster, roughness: 0.8 })); pm.position.set(R.X0 + 0.01, R.Y0 + 1.45, -3.2); pm.rotation.y = Math.PI / 2; F.push([pm]);
  F.push([merge([new THREE.CylinderGeometry(0.07, 0.055, 0.12, 16).translate(R.AX0 + 0.22, R.SILL + 0.06, -0.72).toNonIndexed()], new THREE.MeshStandardMaterial({ color: '#b5603e', roughness: 0.8 }))]);
  F.push([merge([new THREE.IcosahedronGeometry(0.11, 1).translate(R.AX0 + 0.22, R.SILL + 0.2, -0.72).toNonIndexed()], fabricMat('#3f6b35', 0.8))]);
  const det = new THREE.Group(); det.position.set(3.7, R.CEIL - 0.001, -3.0); g.add(det);
  const detBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.035, 32), new THREE.MeshStandardMaterial({ color: '#f3f2ee', roughness: 0.5 })); detBody.position.y = -0.018; det.add(detBody);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2020', emissiveIntensity: 0 })); led.position.set(0.03, -0.037, 0); det.add(led);
  // an LED strip under the kitchen shelf (she switches it on) and its light
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, kz1 - kz0 - 0.1), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd9ad', emissiveIntensity: 0 }));
  strip.position.set(R.X1 - 0.27, R.Y0 + 1.585, (kz0 + kz1) / 2); g.add(strip);
  const kitchen = new THREE.PointLight('#ffd3a0', 0, 5, 2); kitchen.position.set(R.X1 - 0.35, R.Y0 + 1.5, (kz0 + kz1) / 2); g.add(kitchen);
  const setKitchen = (k) => { kitchen.intensity = 4.5 * k; strip.material.emissiveIntensity = 5 * k; };
  for (const [list] of F) for (const m of [list].flat()) { m.traverse?.((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.add(m); }
  return { group: g, door, setDoor, setBolt, openWindow, rolled, towelsHung, led, det, setKitchen,
    anchors: { gap: V((R.DX0 + R.DX1) / 2, R.Y0 + 0.01, R.Z0 + 0.03), peep: V((R.DX0 + R.DX1) / 2, R.Y0 + 1.55, R.Z0), sink: V(cx - 0.02, top - 0.12, sinkZ),
      spout: V(R.X1 - 0.26, top + 0.25, sinkZ), win: V(HERO_BAY, R.SILL + 0.6, R.AZ), bed: V(2.0, R.Y0 + 0.5, -3.3), knob: V(R.DX0 + 0.08, R.Y0 + 1.24, R.Z0 + 0.07), lever: V(R.DX0 + 0.14, R.Y0 + 1.02, R.Z0 + 0.085) } };
}
function posterTex() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 360; const c = cv.getContext('2d');
  c.fillStyle = '#e8dcc4'; c.fillRect(0, 0, 256, 360);
  c.fillStyle = '#c4402f'; c.beginPath(); c.arc(128, 150, 70, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1f2a44'; c.fillRect(0, 230, 256, 130);
  c.fillStyle = '#e8dcc4'; c.font = '700 30px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.fillText('LISBOA', 128, 300);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- the stairwell: the 6th-floor landing and three floors of a U stair with an open well ----------
export function makeStairwell() {
  const S = STAIR, g = new THREE.Group();
  const wall = plasterMat('#d8cdb8', 'plasterStair12'), stepM = new THREE.MeshStandardMaterial({ color: '#6a4630', roughness: 0.55 });
  const iron = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.5, metalness: 0.6 }), rail = new THREE.MeshStandardMaterial({ color: '#4a2e1f', roughness: 0.4 });
  const steps = [], irons = [], rails = [], walls = [], floors = [];
  for (const f of [6, 5, 4]) {
    const yt = LV[f], yb = LV[f - 1], yh = (yt + yb) / 2, rA = (yt - yh) / S.STEPS;
    // landing (corridor) at yt
    floors.push(box(S.X1 - S.X0, 0.2, S.ZW - S.ZC, (S.X0 + S.X1) / 2, yt - 0.1, (S.ZW + S.ZC) / 2));
    floors.push(box(S.XA1 - S.XB0, 0.2, S.ZH - S.ZB, (S.XB0 + S.XA1) / 2, yh - 0.1, (S.ZH + S.ZB) / 2));
    for (let i = 0; i < S.STEPS; i++) {
      const za = S.ZC - i * S.RUN, ya = yt - (i + 1) * rA;
      steps.push(box(S.XA1 - S.XA0, 0.16, S.RUN + 0.02, (S.XA0 + S.XA1) / 2, ya - 0.08 + 0.02, za - S.RUN / 2));
      const zb = S.ZH + i * S.RUN, yb2 = yh - (i + 1) * rA;
      steps.push(box(S.XB1 - S.XB0, 0.16, S.RUN + 0.02, (S.XB0 + S.XB1) / 2, yb2 - 0.08 + 0.02, zb + S.RUN / 2));
      // balusters on the well side of both flights
      for (const [x, z, y] of [[S.XA0 + 0.03, za - S.RUN / 2, ya], [S.XB1 - 0.03, zb + S.RUN / 2, yb2]]) irons.push(box(0.018, 0.9, 0.018, x, y + 0.45, z));
    }
    // handrails (sloped boxes) along the well
    const hr = (x, za, ya, zb, yb3) => { const L = Math.hypot(zb - za, yb3 - ya); const b = new THREE.BoxGeometry(0.05, 0.05, L); b.rotateX(Math.atan2(yb3 - ya, za - zb)); b.translate(x, (ya + yb3) / 2 + 0.92, (za + zb) / 2); rails.push(b.toNonIndexed()); };
    hr(S.XA0 + 0.03, S.ZC, yt, S.ZH, yh); hr(S.XB1 - 0.03, S.ZH, yh, S.ZC, yb);
    // the landing's railing across the top of the well
    rails.push(box(S.XA0 - S.XB1 + 0.06, 0.05, 0.05, (S.XA0 + S.XB1) / 2, yt + 0.92, S.ZC - 0.03));
    for (let x = S.XB1; x <= S.XA0; x += 0.11) irons.push(box(0.018, 0.9, 0.018, x, yt + 0.45, S.ZC - 0.03));
  }
  // walls of the well and the corridor (seen from inside)
  const y0 = LV[3] - 0.5, y1 = LV[6] + 2.6;
  const wq = (a, b, c, d) => walls.push(quad(a, b, c, d));
  wq(V(S.XA1 + 0.1, y0, S.ZC), V(S.XA1 + 0.1, y0, S.ZB), V(S.XA1 + 0.1, y1, S.ZB), V(S.XA1 + 0.1, y1, S.ZC));     // right
  wq(V(S.XB0 - 0.1, y0, S.ZB), V(S.XB0 - 0.1, y0, S.ZC), V(S.XB0 - 0.1, y1, S.ZC), V(S.XB0 - 0.1, y1, S.ZB));     // left
  wq(V(S.XB0 - 0.1, y0, S.ZB), V(S.XA1 + 0.1, y0, S.ZB), V(S.XA1 + 0.1, y1, S.ZB), V(S.XB0 - 0.1, y1, S.ZB));     // back
  wq(V(S.X0, y0, S.ZC), V(S.XB0 - 0.1, y0, S.ZC), V(S.XB0 - 0.1, y1, S.ZC), V(S.X0, y1, S.ZC));                   // corridor back wall
  wq(V(S.X1, y0, S.ZW), V(4.9, y0, S.ZW), V(4.9, y1, S.ZW), V(S.X1, y1, S.ZW));                                   // the neighbour's side
  wq(V(4.9, y0, S.ZW), V(ROOM.DX1, y0, S.ZW), V(ROOM.DX1, y1, S.ZW), V(4.9, y1, S.ZW));
  wq(V(ROOM.DX0, y0, S.ZW), V(S.X0, y0, S.ZW), V(S.X0, y1, S.ZW), V(ROOM.DX0, y1, S.ZW));
  wq(V(ROOM.DX1, ROOM.Y0 + ROOM.DH, S.ZW), V(ROOM.DX0, ROOM.Y0 + ROOM.DH, S.ZW), V(ROOM.DX0, y1, S.ZW), V(ROOM.DX1, y1, S.ZW));
  wq(V(ROOM.DX1, y0, S.ZW), V(ROOM.DX0, y0, S.ZW), V(ROOM.DX0, ROOM.Y0, S.ZW), V(ROOM.DX1, ROOM.Y0, S.ZW));
  wq(V(S.X0, y1, S.ZW), V(S.X1, y1, S.ZW), V(S.X1, y1, S.ZB), V(S.X0, y1, S.ZB));                                 // ceiling
  wq(V(S.X0, y0, S.ZC), V(S.X0, y0, S.ZW), V(S.X0, y1, S.ZW), V(S.X0, y1, S.ZC));
  wq(V(S.X1, y0, S.ZW), V(S.X1, y0, S.ZC), V(S.X1, y1, S.ZC), V(S.X1, y1, S.ZW));
  const wm = merge(walls, wall); wm.material.side = THREE.DoubleSide; g.add(wm);
  g.add(merge(floors, stepM), merge(steps, stepM), merge(irons, iron, { cast: false }), merge(rails, rail));
  // neighbours' doors on the 6th-floor landing, a wall lamp (the timer light) by Inès's door
  const ndoor = new THREE.MeshStandardMaterial({ color: '#3a2418', roughness: 0.5 });
  g.add(merge([box(0.85, 2.05, 0.05, 2.5, LV[6] + 1.025, S.ZC + 0.03), box(0.85, 2.05, 0.05, 6.8, LV[6] + 1.025, S.ZW - 0.03)], ndoor));
  const lampG = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd9a0', emissiveIntensity: 0 }));
  lampG.position.set(5.4, LV[6] + 2.2, S.ZW - 0.14); g.add(lampG);
  const timer = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), new THREE.MeshStandardMaterial({ color: '#222', emissive: '#ff8a20', emissiveIntensity: 1.2 }));
  timer.position.set(3.6, LV[6] + 1.2, S.ZC + 0.012); g.add(timer);
  return { group: g, lamp: lampG, top: V((S.XB1 + S.XA0) / 2, LV[6], S.ZC - 0.2), well: V((S.XB1 + S.XA0) / 2, LV[3], (S.ZC + S.ZH) / 2) };
}
