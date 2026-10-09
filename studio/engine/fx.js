// Light effects shared by episodes (first used by ep10, post 4 v2).
// Anti-flicker by construction: every point and billboard keeps a minimum size in output pixels (its alpha drops
// instead, so the light it carries stays the same); nothing here uses per-frame random noise; motion is a pure
// function of t (positions come from a start point, a velocity and smooth sines).
//   Sparks      glowing points (embers, vapour, stars of the blast), perspective size in metres
//   SkyStars    star points of a fixed pixel size on a big sphere (no fog)
//   Billboards  instanced textured quads (flames, lit smoke puffs), optional upright (cylindrical) facing
//   Streaks     points drawn as short motion trails (fast debris)
//   Flare       sun starburst + anamorphic streak + ghosts, screen-space sprites placed each frame
//   bakeEquirect / milkyWayMap / cmbMap: sky maps rendered once on the GPU into half-float equirect textures
import * as THREE from 'three';
import { rng, clamp, H } from './core.js';
import { fbm } from './ocean.js';

// ---------------------------------------------------------------------------------------------------------------
// GLSL: 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT) + fbm, and the Planck CMB colour map
// ---------------------------------------------------------------------------------------------------------------
export const SIMPLEX = /* glsl */`
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm3(vec3 p, int oct){ float s = 0.0, a = 0.5; for (int i = 0; i < 8; i++){ if (i >= oct) break; s += a * snoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
`;
export const PLANCK = /* glsl */`
vec3 planck(float x){   // Planck collaboration CMB colour map: blue - cyan - cream - orange - red
  x = clamp(x, 0.0, 1.0);
  vec3 c = mix(vec3(0.01, 0.03, 0.30), vec3(0.04, 0.24, 0.80), smoothstep(0.0, 0.2, x));
  c = mix(c, vec3(0.30, 0.66, 0.92), smoothstep(0.18, 0.38, x));
  c = mix(c, vec3(0.86, 0.80, 0.64), smoothstep(0.38, 0.5, x));
  c = mix(c, vec3(1.0, 0.60, 0.20), smoothstep(0.5, 0.64, x));
  c = mix(c, vec3(0.88, 0.22, 0.06), smoothstep(0.62, 0.82, x));
  return mix(c, vec3(0.42, 0.02, 0.02), smoothstep(0.8, 1.0, x));
}
`;

// output pixels per metre at 1 m for a perspective camera (H = output height)
export const pxScale = (cam) => H / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));

// ---------------------------------------------------------------------------------------------------------------
// Sparks: points with a size in metres, a birth time, a life, a velocity, smooth drift, and a global acceleration
// ---------------------------------------------------------------------------------------------------------------
export class Sparks {
  constructor(n, { additive = true, minPx = 1.6, maxPx = 90, near = 0.25, renderOrder = 6 } = {}) {
    this.n = n;
    this.p0 = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
    this.prm = new Float32Array(n * 4);       // size (m), birth (s), life (s), seed 0..1
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p0, 3));
    g.setAttribute('aVel', new THREE.BufferAttribute(this.vel, 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aPrm', new THREE.BufferAttribute(this.prm, 4));
    this.geo = g;
    this.u = {
      uTime: { value: 0 }, uPR: { value: 1 }, uPxScale: { value: 1000 }, uMinPx: { value: minPx }, uMaxPx: { value: maxPx },
      uGain: { value: 1 }, uTurb: { value: 0 }, uTurbF: { value: 0.6 }, uNear: { value: near }, uFogD: { value: 0 },
      uAcc: { value: new THREE.Vector3() }, uAccT0: { value: 1e9 }, uAccVar: { value: 0.6 }, uDrag: { value: 0 },
      uCool: { value: 0 },
    };
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: this.u,
      vertexShader: /* glsl */`
        uniform float uTime, uPR, uPxScale, uMinPx, uMaxPx, uGain, uTurb, uTurbF, uNear, uFogD, uAccT0, uAccVar, uDrag, uCool;
        uniform vec3 uAcc;
        attribute vec3 aVel, aCol; attribute vec4 aPrm;
        varying vec3 vC; varying float vA;
        void main(){
          float age = uTime - aPrm.y, life = aPrm.z, sd = aPrm.w * 6.2831853;
          if (age < 0.0 || age > life){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; vC = vec3(0.0); return; }
          float ag = uDrag > 0.0 ? (1.0 - exp(-uDrag * age)) / uDrag : age;            // drag slows the initial velocity
          vec3 p = position + aVel * ag;
          p += uTurb * vec3(sin(age * uTurbF + sd), 0.5 * sin(age * uTurbF * 0.8 + sd * 1.7), cos(age * uTurbF * 0.9 + sd * 0.6)) * min(age * 2.0, 1.0);
          float ta = max(uTime - max(uAccT0, aPrm.y), 0.0);
          p += 0.5 * uAcc * ta * ta * (1.0 - uAccVar * 0.5 + uAccVar * fract(aPrm.w * 7.13));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          float px = aPrm.x * uPxScale / max(d, 1e-3);
          float a = smoothstep(0.0, 0.08 * life + 0.05, age) * (1.0 - smoothstep(0.65 * life, life, age));
          a *= smoothstep(uNear, uNear * 2.5, d);
          if (px < uMinPx){ a *= (px * px) / (uMinPx * uMinPx); px = uMinPx; }
          px = min(px, uMaxPx);
          a *= exp(-uFogD * uFogD * d * d);
          gl_PointSize = px * uPR;
          float cool = clamp(uCool * age / life, 0.0, 1.0);                             // embers cool from white to red
          vC = aCol * uGain * mix(vec3(1.0), vec3(0.9, 0.35, 0.12), cool) * (1.0 - 0.6 * cool);
          vA = a;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vC; varying float vA;
        void main(){
          vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q) * 4.0;
          float f = exp(-r2 * 3.2) * (1.0 - smoothstep(0.55, 1.0, r2));
          if (f * vA < 0.002) discard;
          gl_FragColor = vec4(vC, f * vA);
        }`,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = renderOrder;
  }
  set(i, x, y, z, vx, vy, vz, r, g, b, size, birth, life, seed) {
    const k = i * 3; this.p0[k] = x; this.p0[k + 1] = y; this.p0[k + 2] = z;
    this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz; this.col[k] = r; this.col[k + 1] = g; this.col[k + 2] = b;
    const j = i * 4; this.prm[j] = size; this.prm[j + 1] = birth; this.prm[j + 2] = life; this.prm[j + 3] = seed;
  }
  commit() { for (const a of Object.values(this.geo.attributes)) a.needsUpdate = true; }
  update(t, cam, pr) { this.u.uTime.value = t; this.u.uPxScale.value = pxScale(cam); this.u.uPR.value = pr; }
}

// ---------------------------------------------------------------------------------------------------------------
// SkyStars: points of a fixed pixel size (sizeAttenuation off), never below uMinPx
// ---------------------------------------------------------------------------------------------------------------
export class SkyStars {
  constructor(list, { radius = 4600, minPx = 1.7 } = {}) {   // list: [{ d: Vector3 (unit), px, r, g, b }]
    const n = list.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n);
    list.forEach((s, i) => { pos.set([s.d.x * radius, s.d.y * radius, s.d.z * radius], i * 3); col.set([s.r, s.g, s.b], i * 3); sz[i] = s.px; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    this.u = { uPR: { value: 1 }, uMinPx: { value: minPx }, uGain: { value: 0 }, uTwk: { value: 0 } };
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: this.u,
      vertexShader: /* glsl */`
        uniform float uPR, uMinPx, uGain; attribute vec3 aCol; attribute float aSize; varying vec3 vC; varying float vA;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          float px = aSize, a = 1.0; if (px < uMinPx){ a = px * px / (uMinPx * uMinPx); px = uMinPx; }
          gl_PointSize = px * uPR; vC = aCol * uGain; vA = a;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vC; varying float vA;
        void main(){ vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q) * 4.0; float f = exp(-r2 * 3.0) * (1.0 - smoothstep(0.6, 1.0, r2));
          if (f * vA < 0.002) discard; gl_FragColor = vec4(vC, f * vA); }`,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = -4;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Billboards: instanced quads with an atlas tile per instance. additive (flames) or lit (smoke: normal in rgb)
// ---------------------------------------------------------------------------------------------------------------
export class Billboards {
  constructor(n, { map, tiles = [2, 2], additive = true, lit = false, upright = false, anchor = 0, minPx = 1.5, near = 0.3, nearK = 0, renderOrder = 5 } = {}) {
    this.n = n;
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.getAttribute('position')); g.setAttribute('uv', base.getAttribute('uv'));
    const A = (k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * k), k); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.aPos = A(3); this.aSize = A(2); this.aCol = A(3); this.aAlpha = A(1); this.aRot = A(1); this.aTile = A(1);
    g.setAttribute('aPos', this.aPos); g.setAttribute('aSize', this.aSize); g.setAttribute('aCol', this.aCol);
    g.setAttribute('aAlpha', this.aAlpha); g.setAttribute('aRot', this.aRot); g.setAttribute('aTile', this.aTile);
    g.instanceCount = n;
    this.geo = g;
    this.u = {
      map: { value: map }, uTiles: { value: new THREE.Vector2(tiles[0], tiles[1]) }, uUpright: { value: upright ? 1 : 0 }, uAnchor: { value: anchor },
      uPR: { value: 1 }, uPxScale: { value: 1000 }, uMinPx: { value: minPx }, uNear: { value: near }, uNearK: { value: nearK }, uFogD: { value: 0 },
      uFogCol: { value: new THREE.Color('#c3d0dc') }, uLightV: { value: new THREE.Vector3(0, 1, 0) },
      uLitCol: { value: new THREE.Color(1, 1, 1) }, uShadeCol: { value: new THREE.Color(0.3, 0.3, 0.32) }, uGain: { value: 1 },
    };
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: this.u,
      defines: lit ? { LIT: 1 } : {},
      vertexShader: /* glsl */`
        attribute vec3 aPos, aCol; attribute vec2 aSize; attribute float aAlpha, aRot, aTile;
        uniform vec2 uTiles; uniform float uUpright, uAnchor, uPR, uPxScale, uMinPx, uNear, uNearK, uFogD;
        varying vec2 vUv; varying vec3 vC; varying float vA; varying vec2 vR; varying float vFog;
        void main(){
          vec4 mvc = viewMatrix * vec4(aPos, 1.0);
          float d = -mvc.z;
          float px = min(aSize.x, aSize.y) * uPxScale / max(d, 1e-3);
          float k = max(1.0, uMinPx / max(px, 1e-4));
          vec2 corner = position.xy;
          vec2 q = vec2(corner.x, corner.y + 0.5 * uAnchor) * aSize * k;
          float c = cos(aRot), s = sin(aRot);
          q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
          vec4 mv;
          if (uUpright > 0.5){
            vec3 toCam = cameraPosition - aPos; toCam.y = 0.0; toCam = normalize(toCam + vec3(1e-5, 0.0, 0.0));
            vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
            mv = viewMatrix * vec4(aPos + right * q.x + vec3(0.0, q.y, 0.0), 1.0);
          } else { mv = mvc; mv.xy += q; }
          gl_Position = projectionMatrix * mv;
          float a = aAlpha / (k * k);
          a *= smoothstep(uNear, uNear * 2.0, d);
          // nearK > 0: a big card fades as the camera comes within nearK times its size, instead of popping out of view
          // in the last metre (the camera flying through a smoke cloud)
          if (uNearK > 0.0) { float sz = max(aSize.x, aSize.y); a *= smoothstep(0.25 * uNearK * sz, uNearK * sz, d); }
          vFog = 1.0 - exp(-uFogD * uFogD * d * d);
          vUv = (vec2(mod(aTile, uTiles.x), floor(aTile / uTiles.x)) + uv) / uTiles;
          vC = aCol; vA = a; vR = vec2(c, s);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D map; uniform vec3 uFogCol, uLightV, uLitCol, uShadeCol; uniform float uGain;
        varying vec2 vUv; varying vec3 vC; varying float vA; varying vec2 vR; varying float vFog;
        void main(){
          vec4 t = texture2D(map, vUv);
          float a = t.a * vA;
          if (a < 0.002) discard;
          #ifdef LIT
            vec2 nxy = t.rg * 2.0 - 1.0; nxy = vec2(vR.x * nxy.x - vR.y * nxy.y, vR.y * nxy.x + vR.x * nxy.y);
            vec3 n = vec3(nxy, sqrt(max(0.0, 1.0 - dot(nxy, nxy))));
            float dif = clamp(dot(n, uLightV) * 0.5 + 0.5, 0.0, 1.0);
            vec3 col = mix(uShadeCol, uLitCol, dif * dif) * vC * (0.75 + 0.25 * t.b);
            gl_FragColor = vec4(mix(col, uFogCol, vFog), a);
          #else
            gl_FragColor = vec4(vC * t.rgb * uGain * (1.0 - vFog), a);
          #endif
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = renderOrder;
  }
  set(i, x, y, z, w, h, r, g, b, alpha, rot = 0, tile = 0) {
    this.aPos.array[i * 3] = x; this.aPos.array[i * 3 + 1] = y; this.aPos.array[i * 3 + 2] = z;
    this.aSize.array[i * 2] = w; this.aSize.array[i * 2 + 1] = h;
    this.aCol.array[i * 3] = r; this.aCol.array[i * 3 + 1] = g; this.aCol.array[i * 3 + 2] = b;
    this.aAlpha.array[i] = alpha; this.aRot.array[i] = rot; this.aTile.array[i] = tile;
  }
  hide(i) { this.aAlpha.array[i] = 0; this.aPos.array[i * 3 + 1] = -1e4; }
  commit() { for (const a of [this.aPos, this.aSize, this.aCol, this.aAlpha, this.aRot, this.aTile]) a.needsUpdate = true; }
  update(cam, pr, sunDir) {
    this.u.uPxScale.value = pxScale(cam); this.u.uPR.value = pr;
    if (sunDir) this.u.uLightV.value.copy(sunDir).transformDirection(cam.matrixWorldInverse);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Streaks: fast particles drawn as trails from p(t - trail) to p(t) in screen space (motion-blur look)
// ---------------------------------------------------------------------------------------------------------------
export class Streaks {
  constructor(n, { widthPx = 2.2, renderOrder = 7 } = {}) {
    this.n = n;
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.getAttribute('position'));
    const A = (k) => new THREE.InstancedBufferAttribute(new Float32Array(n * k), k);
    this.aP0 = A(3); this.aVel = A(3); this.aCol = A(3); this.aPrm = A(4);
    g.setAttribute('aP0', this.aP0); g.setAttribute('aVel', this.aVel); g.setAttribute('aCol', this.aCol); g.setAttribute('aPrm', this.aPrm);
    g.instanceCount = n; this.geo = g;
    this.u = {
      uTime: { value: 0 }, uTrail: { value: 0.12 }, uRes: { value: new THREE.Vector2(1080, 1920) }, uWidth: { value: widthPx },
      uAcc: { value: new THREE.Vector3() }, uAccT0: { value: 1e9 }, uGain: { value: 1 }, uFogD: { value: 0 }, uNear: { value: 0.5 },
    };
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: this.u,
      vertexShader: /* glsl */`
        uniform float uTime, uTrail, uWidth, uAccT0, uGain, uFogD, uNear; uniform vec2 uRes; uniform vec3 uAcc;
        attribute vec3 aP0, aVel, aCol; attribute vec4 aPrm;   // size scale, birth, life, seed
        varying vec3 vC; varying float vA; varying vec2 vQ;
        vec3 posAt(float tt){
          float age = max(tt - aPrm.y, 0.0);
          float ta = max(tt - max(uAccT0, aPrm.y), 0.0);
          return aP0 + aVel * age + 0.5 * uAcc * ta * ta * (0.7 + 0.6 * fract(aPrm.w * 7.13));
        }
        void main(){
          float age = uTime - aPrm.y;
          vA = 0.0; vC = vec3(0.0); vQ = vec2(0.0);
          if (age < 0.0 || age > aPrm.z){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          vec4 cA = projectionMatrix * viewMatrix * vec4(posAt(uTime), 1.0);
          vec4 cB = projectionMatrix * viewMatrix * vec4(posAt(uTime - min(uTrail, age)), 1.0);
          if (cA.w < uNear || cB.w < uNear){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          vec2 sA = cA.xy / cA.w * uRes * 0.5, sB = cB.xy / cB.w * uRes * 0.5;
          vec2 dir = sA - sB; float len = length(dir);
          vec2 t = len > 1e-3 ? dir / len : vec2(0.0, 1.0); vec2 nrm = vec2(-t.y, t.x);
          float w = uWidth * aPrm.x;
          vec2 corner = position.xy + 0.5;                       // x: 0 tail .. 1 head, y: 0..1 across
          vec2 s = mix(sB - t * w, sA + t * w, corner.x) + nrm * (corner.y - 0.5) * 2.0 * w;
          float wz = mix(cB.w, cA.w, corner.x), z = mix(cB.z / cB.w, cA.z / cA.w, corner.x);
          gl_Position = vec4(s / (uRes * 0.5) * wz, z * wz, wz);
          float fade = smoothstep(0.0, 0.1, age) * (1.0 - smoothstep(0.7 * aPrm.z, aPrm.z, age));
          float spread = w * w / max(w * (len + 2.0 * w), 1e-3);        // longer trails spread the same light thinner
          vA = fade * exp(-uFogD * uFogD * cA.w * cA.w) * clamp(spread * 4.0, 0.08, 1.0);
          vC = aCol * uGain; vQ = corner;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vC; varying float vA; varying vec2 vQ;
        void main(){
          float across = 1.0 - abs(vQ.y - 0.5) * 2.0;
          float f = across * across * (0.25 + 0.75 * vQ.x) * smoothstep(1.0, 0.9, vQ.x);
          if (f * vA < 0.002) discard;
          gl_FragColor = vec4(vC, f * vA);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = renderOrder;
  }
  set(i, x, y, z, vx, vy, vz, r, g, b, size, birth, life, seed) {
    this.aP0.array.set([x, y, z], i * 3); this.aVel.array.set([vx, vy, vz], i * 3); this.aCol.array.set([r, g, b], i * 3);
    this.aPrm.array.set([size, birth, life, seed], i * 4);
  }
  commit() { for (const a of [this.aP0, this.aVel, this.aCol, this.aPrm]) a.needsUpdate = true; }
  update(t) { this.u.uTime.value = t; }
}

// ---------------------------------------------------------------------------------------------------------------
// textures: flame atlas (2x2, colour baked in), lit smoke atlas (2x2: rg = normal, b = shade, a = density),
// starburst, streak, ghost ring
// ---------------------------------------------------------------------------------------------------------------
function dataTex(w, h, data, { srgb = false } = {}) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.flipY = false;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
export function flameAtlas(seed = 1) {
  const TW = 128, TH = 256, W = TW * 2, Hh = TH * 2, d = new Uint8Array(W * Hh * 4);
  for (let tile = 0; tile < 4; tile++) {
    const ox = (tile % 2) * TW, oy = Math.floor(tile / 2) * TH, s = seed * 17 + tile * 5.3;
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const u = (x / (TW - 1)) * 2 - 1, v = y / (TH - 1);        // DataTexture row 0 = bottom of the quad = flame base
      const n1 = fbm(u * 1.5 + s, v * 2.2 - s * 0.5, 4), n2 = fbm(u * 4.0 + s * 1.9, v * 6.0 + s, 3), n3 = fbm(u * 3.0 + s * 0.3, v * 1.3 - s, 3);
      const uu = u + (n1 - 0.5) * 1.3 * Math.pow(v, 1.2) + (n2 - 0.5) * 0.35 * v;
      const wv = 0.72 * Math.pow(Math.max(1 - v, 0), 0.75) * (0.62 + 0.38 * Math.sin(Math.min(v * 1.6, 1) * Math.PI / 2)) + 0.03;
      const q = Math.abs(uu) / wv;
      let dens = clamp((1 - q) / 0.6) * clamp(v / 0.07) * (1 - clamp((v + (n1 - 0.5) * 0.55 - 0.32) / 0.6));
      const tongue = clamp((n3 + 0.12 - 0.42) / 0.2);
      dens *= 1 - clamp((v - 0.18) / 0.6) * (1 - tongue);          // the top breaks into tongues
      dens *= 0.75 + 0.25 * n2;
      dens *= clamp((1 - Math.abs(u)) / 0.1);                     // empty tile border (mipmaps)
      const T = clamp(dens * (1.12 - 0.85 * v) * (1 - 0.45 * clamp(q)));
      const col = T > 0.62 ? [1, 0.8 + (T - 0.62) * 0.4, 0.45 + (T - 0.62) * 0.9] : T > 0.35 ? [1, 0.48 + (T - 0.35) * 1.18, 0.12 + (T - 0.35) * 1.2] : [0.62 + T * 1.08, 0.1 + T * 1.08, 0.02 + T * 0.28];
      const k = ((oy + y) * W + ox + x) * 4;
      d[k] = clamp(col[0]) * 255; d[k + 1] = clamp(col[1]) * 255; d[k + 2] = clamp(col[2]) * 255; d[k + 3] = Math.pow(dens, 1.15) * 0.85 * 255;
    }
  }
  return dataTex(W, Hh, d);
}
// fire fronts: strips of many tongues (4 tiles stacked vertically, each 512 x 128), base at v = 0 of each tile
export function fireStripAtlas(seed = 7) {
  const TW = 512, TH = 128, W = TW, Hh = TH * 4, d = new Uint8Array(W * Hh * 4);
  for (let tile = 0; tile < 4; tile++) {
    const oy = tile * TH, s = seed * 11 + tile * 7.7;
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const u = x / (TW - 1), v = y / (TH - 1);
      const edge = clamp(u / 0.12) * clamp((1 - u) / 0.12);                       // strip ends fade out
      const hgt = (0.28 + 0.72 * Math.pow(fbm(u * 7 + s, s * 0.3, 3), 1.6)) * (0.55 + 0.45 * edge);   // tongue heights along the strip
      const w1 = fbm(u * 18 + s, v * 3.5 - s, 3), w2 = fbm(u * 40 - s, v * 7 + s, 2);
      const vv = v / Math.max(hgt, 0.05) + (w1 - 0.5) * 0.5 * v;
      const tongues = 0.5 + 0.5 * Math.sin((u * 26 + (w1 - 0.5) * 3.2 + s) * Math.PI);  // separate licks
      let dens = clamp((1 - vv) / 0.35) * clamp(v / 0.06) * (0.35 + 0.65 * Math.pow(tongues, 0.6 + 1.6 * clamp(v / Math.max(hgt, 0.05))));
      dens *= (0.7 + 0.3 * w2) * edge * clamp((1 - v) / 0.06);
      const T = clamp(dens * (1.15 - 0.9 * clamp(vv)));
      const col = T > 0.62 ? [1, 0.74 + (T - 0.62) * 0.5, 0.36 + (T - 0.62) * 0.8] : T > 0.32 ? [1, 0.42 + (T - 0.32) * 1.07, 0.1 + (T - 0.32) * 0.87] : [0.55 + T * 1.4, 0.08 + T * 1.06, 0.02 + T * 0.25];
      const k = ((oy + y) * W + x) * 4;
      d[k] = clamp(col[0]) * 255; d[k + 1] = clamp(col[1]) * 255; d[k + 2] = clamp(col[2]) * 255; d[k + 3] = Math.pow(dens, 1.1) * 0.8 * 255;
    }
  }
  return dataTex(W, Hh, d);
}
export function smokeAtlas(seed = 2) {
  const N = 128, W = N * 2, d = new Uint8Array(W * W * 4), dens = new Float32Array(N * N);
  for (let tile = 0; tile < 4; tile++) {
    const ox = (tile % 2) * N, oy = Math.floor(tile / 2) * N, r = rng(seed * 31 + tile);
    const blobs = Array.from({ length: 12 }, () => [0.28 + r() * 0.44, 0.28 + r() * 0.44, 0.1 + r() * 0.16]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / (N - 1), v = y / (N - 1);
      let a = 0; for (const [bx, by, br] of blobs) a += Math.exp(-((u - bx) ** 2 + (v - by) ** 2) / (br * br));
      const n = fbm(u * 6 + tile * 3.1, v * 6 - tile, 4);
      const rr = Math.hypot(u - 0.5, v - 0.5) * 2;
      dens[y * N + x] = clamp(a * 0.42 * (0.55 + 0.9 * n) - 0.08) * clamp((1 - rr) / 0.25);
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const D = (xx, yy) => dens[clamp(yy, 0, N - 1) * N + clamp(xx, 0, N - 1)];
      const gx = D(x + 2, y) - D(x - 2, y), gy = D(x, y + 2) - D(x, y - 2);
      let nx = -gx * 3.2, ny = -gy * 3.2; const l = Math.hypot(nx, ny, 1); nx /= l; ny /= l;   // rows go up in v: outward normal
      const k = ((oy + y) * W + ox + x) * 4, dd = dens[y * N + x];
      d[k] = (nx * 0.5 + 0.5) * 255; d[k + 1] = (ny * 0.5 + 0.5) * 255; d[k + 2] = clamp(0.4 + dd) * 255; d[k + 3] = Math.pow(dd, 0.9) * 255;
    }
  }
  return dataTex(W, W, d);
}
// fireball / burst puffs (additive): billowy density, brighter hot core in rgb (tinted per instance)
export function fireballAtlas(seed = 5) {
  const N = 128, W = N * 2, d = new Uint8Array(W * W * 4);
  for (let tile = 0; tile < 4; tile++) {
    const ox = (tile % 2) * N, oy = Math.floor(tile / 2) * N, r = rng(seed * 13 + tile);
    const blobs = Array.from({ length: 14 }, () => [0.28 + r() * 0.44, 0.28 + r() * 0.44, 0.07 + r() * 0.13]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / (N - 1), v = y / (N - 1);
      let a = 0; for (const [bx, by, br] of blobs) a += Math.exp(-((u - bx) ** 2 + (v - by) ** 2) / (br * br));
      const n = fbm(u * 5 + tile * 2.3, v * 5 + tile, 4), n2 = fbm(u * 14 - tile, v * 14 + 4, 3);
      const rr = Math.hypot(u - 0.5, v - 0.5) * 2;
      const dens = clamp(a * 0.42 * (0.45 + 0.7 * n + 0.35 * n2) - 0.12) * clamp((1 - rr) / 0.3);
      const T = clamp(dens * 1.25 - 0.15) * (0.55 + 0.6 * n2);
      const col = T > 0.6 ? [1, 0.78, 0.42] : T > 0.3 ? [1, 0.42 + (T - 0.3) * 1.2, 0.1 + (T - 0.3) * 1.1] : [0.55 + T * 1.5, 0.1 + T * 1.07, 0.03 + T * 0.23];
      const k = ((oy + y) * W + ox + x) * 4;
      d[k] = col[0] * 255; d[k + 1] = col[1] * 255; d[k + 2] = col[2] * 255; d[k + 3] = Math.pow(dens, 0.9) * 255;
    }
  }
  return dataTex(W, W, d);
}
export function starburstTex() {
  const N = 512, d = new Uint8Array(N * N * 4), r = rng(5);
  const rays = Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * Math.PI * 2 + (r() - 0.5) * 0.06, len: i % 2 ? 0.55 + r() * 0.2 : 0.85 + r() * 0.15, w: i % 2 ? 0.006 : 0.009 }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x / (N - 1)) * 2 - 1, v = (y / (N - 1)) * 2 - 1, rr = Math.hypot(u, v), ang = Math.atan2(v, u);
    let I = Math.exp(-rr * rr * 60) * 1.0 + Math.exp(-rr * 7) * 0.18;
    for (const ray of rays) {
      let da = Math.abs(((ang - ray.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const across = da * rr;
      I += Math.exp(-(across * across) / (ray.w * ray.w)) * Math.pow(clamp(1 - rr / ray.len), 2.2) * 0.55;
    }
    I *= clamp((1 - rr) / 0.08);
    const k = (y * N + x) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = clamp(I) * 255;
  }
  return dataTex(N, N, d);
}
export function anamorphicTex() {
  const W = 512, Hh = 32, d = new Uint8Array(W * Hh * 4);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const u = (x / (W - 1)) * 2 - 1, v = (y / (Hh - 1)) * 2 - 1;
    const I = Math.exp(-v * v * 9) * (Math.exp(-u * u * 3) * 0.7 + Math.exp(-u * u * 40) * 0.3) * clamp((1 - Math.abs(u)) / 0.1);
    const k = (y * W + x) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = clamp(I) * 255;
  }
  return dataTex(W, Hh, d);
}
export function ghostTex() {
  const N = 128, d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const rr = Math.hypot(x / (N - 1) * 2 - 1, y / (N - 1) * 2 - 1);
    const I = (0.35 * clamp((0.9 - rr) / 0.1) + 0.65 * Math.exp(-((rr - 0.85) ** 2) / 0.004)) * clamp((1 - rr) / 0.05);
    const k = (y * N + x) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = clamp(I) * 255;
  }
  return dataTex(N, N, d);
}

// ---------------------------------------------------------------------------------------------------------------
// Flare: sprites over everything (depthTest off), placed in screen space every frame from the sun's world position
// ---------------------------------------------------------------------------------------------------------------
export class Flare {
  constructor() {
    this.group = new THREE.Group(); this.group.renderOrder = 999;
    const mk = (map, color) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false, transparent: true })); s.renderOrder = 999; s.frustumCulled = false; this.group.add(s); return s; };
    this.glowTex = (() => { const N = 256, d = new Uint8Array(N * N * 4); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const rr = Math.hypot(x / (N - 1) * 2 - 1, y / (N - 1) * 2 - 1); const I = (Math.exp(-rr * rr * 18) * 0.6 + Math.exp(-rr * 4.5) * 0.4) * clamp((1 - rr) / 0.1); const k = (y * N + x) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = clamp(I) * 255; } return dataTex(N, N, d); })();
    this.glow = mk(this.glowTex, new THREE.Color(1, 0.85, 0.6));
    this.burst = mk(starburstTex(), new THREE.Color(1, 0.92, 0.8));
    this.streak = mk(anamorphicTex(), new THREE.Color(0.55, 0.7, 1.0));
    const gt = ghostTex();
    this.ghosts = [[-0.35, 0.10, [0.4, 0.8, 0.5]], [-0.7, 0.05, [0.9, 0.5, 0.3]], [0.45, 0.07, [0.4, 0.6, 1.0]], [-1.15, 0.16, [0.6, 0.4, 0.9]]].map(([k, s, c]) => ({ k, s, sp: mk(gt, new THREE.Color(...c)) }));
    this._v = new THREE.Vector3(); this._f = new THREE.Vector3();
  }
  // sunPos: world position of the sun (far away); I: overall intensity; size: burst size as a fraction of the screen height
  update(cam, sunPos, I, size = 0.5, streakW = 1.6) {
    const v = this._v.copy(sunPos).project(cam);
    const vis = I > 0.001 && v.z < 1 && Math.abs(v.x) < 1.6 && Math.abs(v.y) < 1.4;
    this.group.visible = vis; if (!vis) return;
    const fwd = cam.getWorldDirection(this._f), D = 10, hgt = 2 * D * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const place = (sp, x, y, sx, sy, a) => {
      const p = new THREE.Vector3(x, y, 0.5).unproject(cam).sub(cam.position).normalize();
      p.multiplyScalar(D / p.dot(fwd)).add(cam.position); sp.position.copy(p); sp.scale.set(sx * hgt, sy * hgt, 1); sp.material.opacity = a; sp.updateMatrixWorld();
    };
    const edge = clamp(1.25 - Math.max(Math.abs(v.x), Math.abs(v.y)) * 0.25);
    place(this.glow, v.x, v.y, size * 1.6, size * 1.6, Math.min(1, I) * edge);
    place(this.burst, v.x, v.y, size, size, Math.min(1, I) * edge);
    place(this.streak, v.x, v.y, size * streakW * 2.2, size * 0.09, Math.min(1, I * 0.8) * edge);
    for (const g of this.ghosts) place(g.sp, v.x * g.k, v.y * g.k, g.s * (0.6 + size), g.s * (0.6 + size), Math.min(0.22, I * 0.12) * edge);
    // HDR boost (sprites are tone-mapped with the scene): colour multipliers above 1
    const hb = Math.max(1, I);
    this.glow.material.color.setRGB(1.0 * hb, 0.85 * hb, 0.6 * hb); this.burst.material.color.setRGB(1.0 * hb, 0.92 * hb, 0.8 * hb);
    this.streak.material.color.setRGB(0.55 * hb, 0.7 * hb, 1.0 * hb);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// equirect sky maps baked once on the GPU (half float): direction d = (cos lat cos lon, sin lat, cos lat sin lon)
// sample with  uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(d.y) / 3.1415927 + 0.5)
// ---------------------------------------------------------------------------------------------------------------
export function bakeEquirect(renderer, body, { w = 4096, h = 2048, uniforms = {}, header = '' } = {}) {
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.ClampToEdgeWrapping });
  const mat = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: SIMPLEX + PLANCK + header + `
      varying vec2 vUv;
      void main(){
        float lon = (vUv.x - 0.5) * 6.2831853, lat = (vUv.y - 0.5) * 3.1415927;
        vec3 d = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
        vec3 col = vec3(0.0); float alpha = 1.0;
        ${body}
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(quad);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.render(sc, new THREE.Camera()); renderer.setRenderTarget(prev);
  mat.dispose(); quad.geometry.dispose();
  return rt.texture;
}
// the Milky Way: band along the galactic plane (normal gN), bright bulge toward the galactic centre (gC), star clouds,
// dark dust lanes. Linear HDR-ish values ~0..1.5
export function milkyWayMap(renderer, gN, gC) {
  return bakeEquirect(renderer, `
    vec3 N = normalize(uN), Cc = normalize(uC), E = normalize(cross(N, Cc));
    float b = asin(clamp(dot(d, N), -1.0, 1.0));                  // galactic latitude
    float l = atan(dot(d, E), dot(d, Cc));                        // galactic longitude (0 = centre)
    float wid = 0.085 + 0.045 * (1.0 - smoothstep(0.0, 1.4, abs(l)));
    float band = exp(-pow(b / wid, 2.0));
    float bulge = exp(-pow(l / 0.22, 2.0) - pow(b / 0.12, 2.0));
    float g1 = fbm3(d * 28.0, 4), g2 = fbm3(d * 85.0 + 3.0, 3), g3 = fbm3(d * 240.0 - 5.0, 2);
    float clouds = clamp(0.55 + 0.55 * g1 + 0.35 * g2 + 0.25 * g3, 0.0, 2.0);   // star clouds: fine grain
    float ridge = 1.0 - abs(fbm3(d * 14.0 + 11.0, 5));
    float lanes = smoothstep(0.55, 0.9, ridge) * exp(-pow((b - 0.01 * sin(l * 4.0)) / 0.05, 2.0));   // filaments of dust
    float rift = exp(-pow((b - 0.015 * sin(l * 3.0)) / 0.016, 2.0)) * (1.0 - smoothstep(0.1, 1.2, abs(l)));
    float cl2 = clouds * clouds * 0.5;                                   // contrasty star clouds, not fog
    float I = band * (0.12 + 0.55 * cl2) + bulge * (0.35 + 0.9 * cl2);
    I *= 1.0 - 0.9 * clamp(lanes * 1.2 + rift * 0.9, 0.0, 1.0);
    vec3 warm = vec3(1.0, 0.8, 0.58), cool = vec3(0.75, 0.84, 1.0);
    col = mix(cool, warm, clamp(bulge * 1.5 + 0.3, 0.0, 1.0)) * I;
    col += vec3(0.95, 0.45, 0.42) * pow(max(fbm3(d * 18.0 + 2.0, 4), 0.0), 3.0) * band * 0.6;   // pinkish nebulae
    col = max(col, 0.0);`, { uniforms: { uN: { value: gN.clone() }, uC: { value: gC.clone() } }, header: 'uniform vec3 uN, uC;' });
}
// CMB (false colour): a Gaussian-looking random field, most power near 1 degree, through the Planck colour map
export function cmbMap(renderer) {
  return bakeEquirect(renderer, `
    float f = 0.0;
    f += 0.35 * snoise(d * 3.0);
    f += 0.50 * snoise(d * 7.0 + 3.1);
    f += 0.70 * snoise(d * 14.0 - 1.7);
    f += 0.90 * snoise(d * 27.0 + 7.3);
    f += 0.70 * snoise(d * 50.0 - 4.1);
    f += 0.35 * snoise(d * 92.0 + 2.2);
    col = planck(0.5 + f * 0.27);
    alpha = clamp(0.5 + 0.55 * fbm3(d * 5.0 + 20.0, 5), 0.0, 1.0);   // billowing plasma for the glowing-air phase`);
}

// ---------------------------------------------------------------------------------------------------------------
// shadows fade out toward the edge of the shadow map instead of stopping on a hard line (call once, before any
// material compiles). With a shadow frustum that changes between shots, nothing pops at its border.
// ---------------------------------------------------------------------------------------------------------------
let _shadowPatched = false;
export function fadeShadowBorders(width = 0.18) {
  if (_shadowPatched) return; _shadowPatched = true;
  const a = 'return mix( 1.0, shadow, shadowIntensity );\n\t}\n\tvec2 cubeToUV';
  const src = THREE.ShaderChunk.shadowmap_pars_fragment;
  if (!src.includes(a)) { console.warn('fadeShadowBorders: chunk changed, not patched'); return; }
  THREE.ShaderChunk.shadowmap_pars_fragment = src.replace(a,
    `vec2 sEdge = min(shadowCoord.xy, 1.0 - shadowCoord.xy);\n\t\treturn mix( 1.0, shadow, shadowIntensity * smoothstep(0.0, ${width.toFixed(3)}, min(sEdge.x, sEdge.y)) );\n\t}\n\tvec2 cubeToUV`);
}
