// Rain for post 9 (What if air became as thick as honey for 5 seconds?). Drops fall as motion-blurred streaks, stop dead
// the instant the air thickens (a raindrop's Stokes time in honey-thick air is ~20 microseconds) and hang as glass beads
// lit by the lamps, the floodlights and the headlights, then fall again when the air thins (accelerating from rest toward
// their terminal speed). Every drop is a pure function of the story clock: p0 is where the drop is at the instant the air
// thickens (uTf). Before that it falls toward p0 down a column that wraps at the surface below it (it vanishes into the
// deck or the river and comes back at the top of the volume, faded in); after uTb it falls from p0 again.
// Quads are built in screen space: width = the drop's projected diameter widened by depth of field (energy kept, alpha
// drops), never under uMinPx; length = the distance the drop travels during the frame (a 360-degree shutter), so falling
// rain never strobes. Near the lens drops fade out. Additive, on layer 1 (the river's reflection skips it).
import * as THREE from 'three';
import { pxScale } from './fx.js';

const MAXSPOT = 8, MAXBOX = 6;
export class Rain {
  constructor(n, { minPx = 1.6, near = 0.18, renderOrder = 8 } = {}) {
    this.n = n;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3));
    g.setIndex([0, 1, 2, 1, 3, 2]);
    this.aP = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.aPrm = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    g.setAttribute('aP', this.aP); g.setAttribute('aPrm', this.aPrm); g.setAttribute('aCol', this.aCol);
    g.instanceCount = n; this.geo = g;
    const spots = []; for (let i = 0; i < MAXSPOT; i++) spots.push(new THREE.Vector3());
    this.u = {
      uT: { value: 0 }, uTf: { value: 0 }, uTb: { value: 5 }, uPxScale: { value: 1000 }, uPR: { value: 1 }, uMinPx: { value: minPx }, uShutter: { value: 1 / 30 },
      uGain: { value: 1 }, uNear: { value: near }, uFocus: { value: 4 }, uAper: { value: 0 }, uWind: { value: new THREE.Vector3(0.6, 0, 0.3) },
      uRes: { value: new THREE.Vector2(1080, 1920) }, uStreakK: { value: 18 }, uBeadK: { value: 3 }, uFogC: { value: new THREE.Color('#2a3140') }, uFogD: { value: 0.002 }, uFade: { value: 1 },
      uSpotP: { value: spots.map((v) => v.clone()) }, uSpotD: { value: spots.map((v) => v.clone().set(0, -1, 0)) }, uSpotC: { value: spots.map((v) => v.clone().set(0, 0, 0)) },
      uSpotCos: { value: spots.map(() => new THREE.Vector2(0.9, 0.8)) },
      uBoxC: { value: [...Array(MAXBOX)].map(() => new THREE.Vector3(0, -1e5, 0)) }, uBoxH: { value: [...Array(MAXBOX)].map(() => new THREE.Vector3(0, 0, 0)) }, uLight: { value: new THREE.Vector3(-0.4, 0.8, 0.4).normalize() },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,   // screen-space quads: winding flips
      vertexShader: /* glsl */`
        attribute vec3 aP, aCol; attribute vec4 aPrm;                // aPrm: ybot, ytop, radius (m), seed
        uniform float uT, uTf, uTb, uPxScale, uPR, uMinPx, uShutter, uGain, uNear, uFocus, uAper, uFogD, uFade, uStreakK, uBeadK;
        uniform vec3 uWind; uniform vec2 uRes;
        uniform vec3 uSpotP[${MAXSPOT}], uSpotD[${MAXSPOT}], uSpotC[${MAXSPOT}]; uniform vec2 uSpotCos[${MAXSPOT}];
        uniform vec3 uBoxC[${MAXBOX}], uBoxH[${MAXBOX}];
        varying vec2 vQ; varying vec3 vC; varying float vLen, vRpx, vA;
        void main(){
          float ybot = aPrm.x, ytop = aPrm.y, r = aPrm.z, H = ytop - ybot;
          float D = r * 2000.0;                                           // diameter in mm
          float vt = max(0.6, 9.65 - 10.3 * exp(-0.6 * D));              // terminal speed (Atlas et al. 1973)
          vec3 p = aP; float vel = 0.0, s = 0.0, drift = 0.0;
          if (uT < uTf) { s = -vt * (uTf - uT); vel = vt; drift = uT - uTf; }
          else if (uT >= uTb) { float tt = uT - uTb, tau = vt / 9.81, e = exp(-tt / tau); s = vt * (tt - tau * (1.0 - e)); vel = vt * (1.0 - e); drift = tt - tau * (1.0 - e); }
          p.y = ybot + mod(aP.y - ybot - s, H);
          p.xz += uWind.xz * drift;
          float topFade = smoothstep(ytop, ytop - 2.5, p.y) * (aPrm.w > 1.5 ? smoothstep(ybot, ybot + 3.0, p.y) : 1.0);
          // drops inside a vehicle, under an umbrella or inside a person are not there (they hit it)
          for (int i = 0; i < ${MAXBOX}; i++) { vec3 q = abs(p - uBoxC[i]) - uBoxH[i]; if (max(q.x, max(q.y, q.z)) < 0.0) topFade = 0.0; }
          // the streak: from where the drop is now up to where it was a shutter ago
          vec3 tail = p + vec3(-uWind.x, vel, -uWind.z) * uShutter * (vel > 0.0 ? 1.0 : 0.0);
          vec4 cH = projectionMatrix * viewMatrix * vec4(p, 1.0), cT = projectionMatrix * viewMatrix * vec4(tail, 1.0);
          float depth = cH.w;
          if (depth < 0.05 || cT.w < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          vec2 sH = cH.xy / cH.w * 0.5 * uRes, sT = cT.xy / cT.w * 0.5 * uRes;
          float pxs = uPxScale * uPR;
          float rTrue = r * pxs / depth;                                     // true radius, render px
          float coc = uAper * pxs * abs(1.0 / depth - 1.0 / uFocus) * 0.5;   // depth of field (render px)
          float rDraw = max(sqrt(rTrue * rTrue + coc * coc), (vel > 0.0 ? 0.5 : 0.7) * uMinPx * uPR);
          vec2 dir = sT - sH; float len = length(dir);
          vec2 t = len > 1e-3 ? dir / len : vec2(0.0, 1.0), nrm = vec2(-t.y, t.x);
          vec2 sp = sH + nrm * position.x * rDraw + t * (position.y * (len + 2.0 * rDraw) - rDraw);
          gl_Position = vec4(sp / (0.5 * uRes) * cH.w, cH.z, cH.w);
          vQ = vec2(position.x, position.y * (len + 2.0 * rDraw) - rDraw); vLen = len; vRpx = rDraw;
          // brightness: the drop's light + the headlights and landing lights whose cones it sits in
          vec3 c = aCol;
          for (int i = 0; i < ${MAXSPOT}; i++) {
            vec3 dl = p - uSpotP[i]; float dd = length(dl); float cs = dot(dl / max(dd, 1e-3), uSpotD[i]);
            c += uSpotC[i] * smoothstep(uSpotCos[i].y, uSpotCos[i].x, cs) / (1.0 + dd * dd * 0.04);
          }
          float energy = (rTrue * rTrue) / (rDraw * rDraw);                   // spread over a wider disc (DOF / min size)
          // spread along the streak; a falling drop is a tiny lens that catches the brightest light round it, so its
          // streak reads much brighter than its share of the background (uStreakK)
          float spread = min(1.0, (2.0 * rDraw) / (len + 2.0 * rDraw) * (len > rDraw ? uStreakK : 1.0)) * (len > rDraw ? 1.0 : uBeadK);
          float fog = exp(-uFogD * depth);
          vA = energy * spread * topFade * smoothstep(uNear, uNear * 2.2, depth) * fog * uFade;
          vC = c * uGain;
        }`,
      fragmentShader: /* glsl */`
        varying vec2 vQ; varying vec3 vC; varying float vLen, vRpx, vA;
        void main(){
          // distance from the streak's axis segment, in units of the drawn radius
          float along = clamp(vQ.y, 0.0, vLen);
          vec2 d = vec2(vQ.x * vRpx, vQ.y - along) / vRpx;
          float rr = length(d);
          if (rr > 1.0) discard;
          float a;
          if (vLen < vRpx * 0.5) {
            // a hanging drop: a little lens, brighter at its rim, with a glint toward the light
            float rim = smoothstep(0.35, 0.92, rr) * (1.0 - smoothstep(0.92, 1.0, rr));
            float glint = exp(-dot(d - vec2(-0.32, 0.38), d - vec2(-0.32, 0.38)) * 28.0);
            float lens = mix(1.0 - smoothstep(0.6, 1.0, rr), 0.35 + 0.9 * rim + 1.6 * glint, smoothstep(2.5, 6.0, vRpx));
            a = lens;
          } else {
            a = 1.0 - smoothstep(0.35, 1.0, rr);
          }
          gl_FragColor = vec4(vC * a * vA, 1.0);
        }`,
    });
    this.mat = mat;
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = renderOrder; this.mesh.layers.set(1);
  }
  set(i, x, y, z, ybot, ytop, r, cr, cg, cb, seed = 0) {
    this.aP.setXYZ(i, x, y, z); this.aPrm.setXYZW(i, ybot, ytop, r, seed); this.aCol.setXYZ(i, cr, cg, cb);
  }
  commit() { for (const a of [this.aP, this.aPrm, this.aCol]) a.needsUpdate = true; }
  // axis-aligned boxes [{ c: Vector3, h: Vector3 (half extents) }] where drops are hidden
  setBoxes(list) { for (let i = 0; i < MAXBOX; i++) { const b = list[i]; if (b) { this.u.uBoxC.value[i].copy(b.c); this.u.uBoxH.value[i].copy(b.h); } else { this.u.uBoxC.value[i].set(0, -1e5, 0); this.u.uBoxH.value[i].set(0, 0, 0); } } }
  // t = the story clock (s), cam, pr = supersampling factor, W/H = the canvas size in CSS px
  update(t, cam, pr, W = 1080, H = 1920) { this.u.uT.value = t; this.u.uPxScale.value = pxScale(cam); this.u.uPR.value = pr; this.u.uRes.value.set(W * pr, H * pr); }
  // spot lights the drops can sit in: [{ p, d (unit), col (THREE.Color * intensity), inner, outer (cosines) }]
  setSpots(list) {
    for (let i = 0; i < MAXSPOT; i++) { const s = list[i];
      if (!s) { this.u.uSpotC.value[i].set(0, 0, 0); continue; }
      this.u.uSpotP.value[i].copy(s.p); this.u.uSpotD.value[i].copy(s.d); this.u.uSpotC.value[i].set(s.col.r, s.col.g, s.col.b); this.u.uSpotCos.value[i].set(s.inner, s.outer); }
  }
}
// light a drop at p from point lights [{ p: Vector3, c: [r,g,b], k }] plus an ambient colour
export function lightDrop(p, lights, amb) {
  let r = amb[0], g = amb[1], b = amb[2];
  for (const L of lights) { const dx = p.x - L.p.x, dy = p.y - L.p.y, dz = p.z - L.p.z, f = L.k / (1 + dx * dx + dy * dy + dz * dz); r += L.c[0] * f; g += L.c[1] * f; b += L.c[2] * f; }
  return [r, g, b];
}
