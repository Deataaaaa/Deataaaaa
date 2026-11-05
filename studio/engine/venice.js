// Venice at golden hour for post 11 (What if every sneeze was twice as strong as the last?). Metres; x east, z south,
// y up; the water at y = 0, the Molo's paving at Y0. You stand on the Molo between the two columns, facing the Basin of
// St Mark (south): the Piazzetta behind you (the Library on its west side, the Doge's Palace on its east side, the
// Campanile at its far end), San Giorgio Maggiore across the water, the Salute to the west with the sun setting behind it.
//   VU                  shared uniforms (time, water rings, chop, steam, scorch)
//   patMat(kind)        world-space stone patterns (ashlar, brick, lozenge, plaster, paving), fwidth-clamped
//   makeSky()           golden-hour sky: gradient, sun glow, lit cirrus, a disc; darkens to smoke (uApoc)
//   makeLagoon()        the Basin: a reflector with slow chop, a sun path and the sneezes' rings
//   makeGround()        the Molo, the Piazzetta and the islands (paving, quay walls, steps)
//   makePiazzetta()     Doge's Palace, Library, Zecca, Campanile + Loggetta, the two columns, Basilica, clock tower
//   makeFar()           San Giorgio Maggiore, the Salute, the Dogana, Giudecca, the Lido, the city of roofs
//   makeGondolas()      moored gondolas (bobbing; pushed out over the water by the blasts) and their poles
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';
import { SIMPLEX } from './fx.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const VZ = { Y0: 1.2, QZ: 4 };
// Venice's outline (x, z), roughly: the Molo and the Riva along z = QZ, Cannaregio to the north, Castello to the east
export const VOUT = [[-2300, -900], [-2100, -1500], [-1200, -1850], [0, -1760], [1000, -1610], [1900, -1210], [2350, -700], [2200, -250], [1300, 3.2], [-2100, 3.2]];   // (the paving stops where the quay's edge stones begin: no coplanar fight)
export const inVenice = (x, z) => { let c = false; for (let i = 0, j = VOUT.length - 1; i < VOUT.length; j = i++) { const [xi, zi] = VOUT[i], [xj, zj] = VOUT[j];
  if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
// the sun on 20 October at 18:05 (Venice, UTC+2): azimuth 250 degrees, 6 degrees up, behind the Salute from the Molo
export const SUN = (() => { const az = THREE.MathUtils.degToRad(250), el = THREE.MathUtils.degToRad(6);
  return V(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize(); })();
export const VU = {
  uT: { value: 0 }, uChop: { value: 1 }, uSteam: { value: 0 }, uScorch: { value: 0 }, uApoc: { value: 0 },
  uRing: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -1, 0)) },   // x, z, radius, strength
};

// ---------------- materials ----------------
const KIND = {
  ashlar: `{ float A = 0.42, B = 1.1; float cy = q.y / A, row = floor(cy); float cx = q.x / B + 0.5 * mod(row, 2.0), col = floor(cx);
    vec2 f = vec2(fract(cx), fract(cy)), fw = fwidth(vec2(cx, cy)) + 1e-4;
    vec2 mw = vec2(0.02 / B, 0.025 / A); vec2 m2 = smoothstep(mw - fw, mw + fw, f) * smoothstep(mw - fw, mw + fw, 1.0 - f);
    float fade = 1.0 - smoothstep(0.25, 0.6, max(fw.x, fw.y));
    float mortar = (1.0 - m2.x * m2.y) * fade, tone = 0.92 + 0.14 * hs(vec2(col, row)) * fade;
    float streak = vn2(vec2(q.x * 0.6, q.y * 0.07)), grime = 0.8 + 0.2 * smoothstep(0.25, 0.85, streak);
    grime *= 0.86 + 0.14 * smoothstep(0.0, 3.0, vWP.y - 1.2);
    diffuseColor.rgb *= tone * (1.0 - 0.22 * mortar) * grime; }`,
  brick: `{ float A = 0.085, B = 0.27; float cy = q.y / A, row = floor(cy); float cx = q.x / B + 0.5 * mod(row, 2.0), col = floor(cx);
    vec2 f = vec2(fract(cx), fract(cy)), fw = fwidth(vec2(cx, cy)) + 1e-4;
    vec2 mw = vec2(0.012 / B, 0.012 / A); vec2 m2 = smoothstep(mw - fw, mw + fw, f) * smoothstep(mw - fw, mw + fw, 1.0 - f);
    float fade = 1.0 - smoothstep(0.2, 0.55, max(fw.x, fw.y)), h = hs(vec2(col, row));
    vec3 bc = mix(vec3(1.0), mix(vec3(0.82, 0.72, 0.66), vec3(1.12, 1.0, 0.92), h), fade);
    diffuseColor.rgb = mix(diffuseColor.rgb * bc, vec3(0.62, 0.58, 0.52), (1.0 - m2.x * m2.y) * fade * 0.7);
    diffuseColor.rgb *= 0.85 + 0.15 * vn2(vec2(q.x * 0.3, q.y * 0.05)); }`,
  lozenge: `{ float s = 0.62; float u = q.x / s, v = (q.y - 0.3) / s; float a1 = u + v, a2 = u - v;
    vec2 f = vec2(fract(a1), fract(a2)), fw = fwidth(vec2(a1, a2)) + 1e-4; float fade = 1.0 - smoothstep(0.2, 0.5, max(fw.x, fw.y));
    vec2 e2 = smoothstep(0.07 - fw, 0.07 + fw, f) * smoothstep(0.07 - fw, 0.07 + fw, 1.0 - f); float pinkK = mix(0.72, e2.x * e2.y, fade) * 0.85;
    float h = hs(floor(vec2(a1, a2)));
    diffuseColor.rgb = mix(diffuseColor.rgb, uC2 * (0.92 + 0.14 * h * fade), pinkK);
    diffuseColor.rgb *= 0.88 + 0.12 * vn2(vec2(q.x * 0.5, q.y * 0.1)); }`,
  plaster: `{ float fwq = max(fwidth(q.x), fwidth(q.y)); float fade = 1.0 - smoothstep(0.08, 0.35, fwq);
    diffuseColor.rgb *= 0.86 + 0.18 * vn2(q * vec2(0.4, 0.3)) * fade + 0.06 * vn2(q * 2.3) * fade;
    if (top < 0.5) { vec2 g = vec2(q.x / 2.9, (q.y - 1.0) / 3.1), c = floor(g), f = fract(g), fw = fwidth(g) + 1e-4;
      vec2 w = smoothstep(vec2(0.32, 0.25) - fw, vec2(0.32, 0.25) + fw, f) * smoothstep(vec2(0.32, 0.22) - fw, vec2(0.32, 0.22) + fw, 1.0 - f);
      vec2 sh = smoothstep(vec2(0.14, 0.25) - fw, vec2(0.14, 0.25) + fw, f) * smoothstep(vec2(0.14, 0.22) - fw, vec2(0.14, 0.22) + fw, 1.0 - f);
      float has = step(0.25, hs(c + 3.1)) * step(0.5, g.y), open = step(0.45, hs(c + 7.7));
      float win = w.x * w.y * has, shut = (sh.x * sh.y - w.x * w.y * open) * has;
      float far = smoothstep(0.1, 0.35, max(fw.x, fw.y));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.045, 0.04), win * (1.0 - far) * open);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.26, 0.18), clamp(shut, 0.0, 1.0) * (1.0 - far));
      diffuseColor.rgb *= 1.0 - 0.18 * far; } }`,
  pave: `{ vec2 p = vWP.xz; float row = floor(p.y / 0.62); vec2 g = vec2(p.x / 1.05 + 0.37 * mod(row, 3.0), p.y / 0.62), f = fract(g), fw = fwidth(g) + 1e-4;
    vec2 m2 = smoothstep(0.03 - fw, 0.03 + fw, f) * smoothstep(0.03 - fw, 0.03 + fw, 1.0 - f); float fade = 1.0 - smoothstep(0.2, 0.55, max(fw.x, fw.y));
    float tone = 0.88 + 0.2 * hs(floor(g)) * fade;
    vec2 l = abs(fract(p / 9.0 + 0.5) - 0.5) * 9.0; float lw = fwidth(p.x) + 1e-3;
    float white = (1.0 - smoothstep(0.15 - lw, 0.15 + lw, min(l.x, l.y))) * (1.0 - smoothstep(0.1, 0.6, lw));
    diffuseColor.rgb *= tone * (1.0 - 0.3 * (1.0 - m2.x * m2.y) * fade);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.6, 0.56), white * uPaveW); }`,
  copper: `{ float n = vn2(q * 0.8) * 0.6 + vn2(q * 3.1) * 0.4; diffuseColor.rgb *= 0.8 + 0.35 * n; }`,
  plain: `{ diffuseColor.rgb *= 0.9 + 0.12 * vn2(q * 0.5); }`,
};
export function patMat(kind, { color = '#d9d2c4', rough = 0.82, metal = 0, c2 = '#c9908a', paveW = 1, side = THREE.FrontSide } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, side });
  m.onBeforeCompile = (s) => {
    s.uniforms.uScorch = VU.uScorch; s.uniforms.uC2 = { value: new THREE.Color(c2) }; s.uniforms.uPaveW = { value: paveW };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n#ifdef USE_INSTANCING\nvWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);\n#else\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);\n#endif');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec3 vWN; uniform float uScorch, uPaveW; uniform vec3 uC2;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hs(i), hs(i + vec2(1.0, 0.0)), f.x), mix(hs(i + vec2(0.0, 1.0)), hs(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 an = abs(vWN); float hor = an.x > an.z ? vWP.z : vWP.x; float top = smoothstep(0.7, 0.95, an.y);
      vec2 q = top > 0.5 ? vWP.xz : vec2(hor, vWP.y);
      ${KIND[kind]}
      diffuseColor.rgb *= 1.0 - 0.8 * uScorch;`);
  };
  m.customProgramCacheKey = () => 'vpat_' + kind + color + c2 + paveW;
  return m;
}
const stdM = (color, rough = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

// ---------------- the sky ----------------
export function makeSky() {
  const U = { uSun: { value: SUN.clone() }, uApoc: VU.uApoc, uDisk: { value: 1 }, uT: VU.uT };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `${SIMPLEX}
      uniform vec3 uSun; uniform float uApoc, uDisk, uT; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float el = d.y, cs = dot(d, uSun);
        float hz = exp(-max(el, 0.0) / 0.1);
        vec3 zen = vec3(0.13, 0.25, 0.5), belt = vec3(0.92, 0.6, 0.6), hor = vec3(1.0, 0.7, 0.42);
        vec3 c = mix(zen, mix(belt, hor, smoothstep(-0.4, 0.95, cs)), hz);
        c += vec3(1.0, 0.5, 0.2) * pow(max(cs, 0.0), 5.0) * 0.55 + vec3(1.0, 0.72, 0.42) * pow(max(cs, 0.0), 80.0) * 1.4;
        // cirrus at ~8 km, lit from below by the low sun (only low octaves: no shimmer near the horizon)
        if (el > 0.0) { vec2 p = d.xz / (el + 0.06) * 0.22;
          float n = fbm3(vec3(p * vec2(0.7, 2.2) + vec2(uT * 0.004, 0.0), 1.7), 4), n2 = fbm3(vec3(p * 3.0, 4.2), 2);
          float cov = smoothstep(0.05, 0.45, n + 0.15 * n2) * smoothstep(0.0, 0.08, el) * (1.0 - smoothstep(0.55, 0.9, el));
          vec3 cc = mix(vec3(1.0, 0.62, 0.5), vec3(1.0, 0.82, 0.62), smoothstep(-0.2, 0.9, cs)) * (0.55 + 0.9 * pow(max(cs, 0.0), 3.0));
          c = mix(c, cc, cov * 0.6); }
        c = mix(c, hor * 0.55, smoothstep(0.0, -0.06, el));
        c += vec3(1.0, 0.86, 0.6) * smoothstep(0.99986, 0.99993, cs) * 22.0 * uDisk;
        vec3 ap = mix(vec3(0.07, 0.03, 0.02), vec3(0.75, 0.24, 0.06), exp(-max(el, 0.0) / 0.06)) * (0.8 + 0.4 * fbm3(vec3(d.xz / (el + 0.15) * 0.8, uT * 0.02), 3));
        c = mix(c, ap, uApoc);
        gl_FragColor = vec4(c, 1.0); }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), mat); mesh.frustumCulled = false; mesh.renderOrder = -10;
  return { mesh, U };
}

// ---------------- the lagoon ----------------
export function makeLagoon({ ssaa = 2 } = {}) {
  const geo = new THREE.PlaneGeometry(16000, 24000);   // the whole lagoon (the islands sit on it)
  const shader = {
    name: 'LagoonShader',
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uT: VU.uT, uChop: VU.uChop, uSteam: VU.uSteam, uRing: VU.uRing,
      uSun: { value: SUN.clone() }, uDeep: { value: new THREE.Color('#1f4c47') }, uFogC: { value: new THREE.Color('#d9a888') }, uFogD: { value: 0.00022 }, uApoc: VU.uApoc },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${SIMPLEX}
      uniform sampler2D tDiffuse; uniform vec3 color, uSun, uDeep, uFogC; uniform float uT, uChop, uSteam, uFogD, uApoc; uniform vec4 uRing[6];
      varying vec4 vUv; varying vec3 vW;
      void main(){
        vec2 fw = fwidth(vW.xz); float px = max(fw.x, fw.y), t = uT;
        vec2 n = vec2(fbm3(vec3(vW.xz * 0.045, t * 0.06), 3), fbm3(vec3(vW.zx * 0.045 + 4.0, t * 0.06), 3)) * 0.07;
        n += vec2(fbm3(vec3(vW.xz * 0.012, t * 0.03), 3), fbm3(vec3(vW.zx * 0.012 + 2.0, t * 0.03), 3)) * 0.06;
        n += vec2(fbm3(vec3(vW.xz * 0.35 + vec2(t * 0.15, 0.0), t * 0.1), 2), fbm3(vec3(vW.zx * 0.35 + 9.0, t * 0.1), 2)) * 0.035 * uChop * (1.0 - smoothstep(0.15, 0.9, px));
        float foam = 0.0;
        for (int i = 0; i < 6; i++) { vec4 r = uRing[i]; if (r.z < 0.0) continue;
          vec2 dv = vW.xz - r.xy; float d = length(dv), w = max(1.6, r.z * 0.12) + px * 2.0, x = (d - r.z) / w;   // wide enough to cover a fast front's travel in one frame
          float dc = length(cameraPosition.xz - r.xy), a = exp(-x * x) * r.w * min(1.0, 25.0 / max(r.z, 1.0)) * (1.0 - smoothstep(dc * 0.3, dc * 0.7, r.z));   // gone before it sweeps under the lens n += normalize(dv + 1e-4) * a * cos(x * 1.6) * 0.2;
          foam += 0.6 * a * smoothstep(-1.5, 0.2, x) * (1.0 - smoothstep(0.2, 1.4, x));
          n += vec2(fbm3(vec3(vW.xz * 0.25, t), 2), fbm3(vec3(vW.zx * 0.25 + 3.0, t), 2)) * 0.035 * r.w * step(d, r.z) * (1.0 - smoothstep(0.1, 1.0, px));
        }
        vec3 V = normalize(cameraPosition - vW), N = normalize(vec3(-n.x * 2.6, 1.0, -n.y * 2.6));
        float mu = clamp(dot(V, N), 0.0, 1.0), fres = 0.02 + 0.98 * pow(max(1.0 - mu, 0.0), 5.0);
        float glit = pow(max(dot(reflect(-V, N), uSun), 0.0), 70.0) * (1.0 - smoothstep(0.3, 2.0, px * 0.2));
        vec2 uv = vUv.xy / vUv.w + n * vec2(0.5, 0.22) * 0.35;
        vec3 refl = texture2D(tDiffuse, uv).rgb;
        vec3 c = mix(uDeep * (0.75 + 0.25 * n.x * 8.0), refl, clamp(0.18 + 0.82 * fres, 0.0, 1.0));
        c += vec3(1.0, 0.72, 0.42) * glit * 1.1 * (1.0 - uApoc);
        c = mix(c, vec3(0.92, 0.86, 0.8) * (0.6 + 0.6 * max(uSun.y, 0.0) * 5.0), clamp(foam, 0.0, 1.0) * 0.85);
        float fd = 1.0 - exp(-uFogD * length(cameraPosition - vW));
        c = mix(c, uFogC * (1.0 - 0.75 * uApoc), fd);
        c = mix(c, vec3(0.85, 0.8, 0.75), uSteam * (0.4 + 0.6 * fd));
        gl_FragColor = vec4(c, 1.0 - smoothstep(5000.0, 7500.0, length(vW.xz)));   // the far plain takes over beyond the lagoon
      }`,
  };
  const w = Math.round(1080 * ssaa / 2), h = Math.round(1920 * ssaa / 2);
  const water = new Reflector(geo, { textureWidth: w, textureHeight: h, clipBias: 0.02, shader, multisample: 0 });
  water.rotation.x = -Math.PI / 2; water.position.y = 0; water.material.transparent = true;
  water.camera.layers.set(0);                         // the reflection skips the spray, dust and domes (layer 1)
  return { mesh: water, U: water.material.uniforms };
}

// ---------------- arch bands (a polygon tracing the arches: no holes touching the outline) ----------------
// a band from y = spring to y = top, length len, n bays; columns at x = i * len / n (half-width c); kind 'pointed' | 'round'
function archBand(len, n, spring, top, c, kind = 'pointed', thick = 0.7, roundels = 0) {
  const b = len / n, pts = [V(0, top, 0), V(len, top, 0), V(len, spring, 0)];
  for (let i = n - 1; i >= 0; i--) {
    const xa = i * b + (i === 0 ? c * 1.6 : c), xb = (i + 1) * b - (i === n - 1 ? c * 1.6 : c), w = xb - xa, mid = (xa + xb) / 2;
    pts.push(V(xb, spring, 0));
    if (kind === 'round') { for (let k = 1; k < 16; k++) { const th = Math.PI * k / 16; pts.push(V(mid + Math.cos(th) * w / 2, spring + Math.sin(th) * w / 2, 0)); } }
    else { const R = 0.8 * w, ta = Math.acos((R - w / 2) / R);
      for (let k = 1; k <= 8; k++) { const th = ta * k / 8; pts.push(V(xb - R + R * Math.cos(th), spring + R * Math.sin(th), 0)); }
      for (let k = 7; k >= 1; k--) { const th = Math.PI - ta * k / 8; pts.push(V(xa + R + R * Math.cos(th), spring + R * Math.sin(th), 0)); } }
    pts.push(V(xa, spring, 0));
  }
  pts.push(V(0, spring, 0));
  const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.y)));
  if (roundels) for (let i = 1; i < n; i++) { const p = new THREE.Path(); p.absarc(i * b, spring + roundels, 0.34, 0, Math.PI * 2, true); sh.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -thick);
  return g;
}
const boxG = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cylG = (r0, r1, h, x, y, z, seg = 16) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y + h / 2, z); return g; };
const place = (g, x, z, yaw) => { g.rotateY(yaw); g.translate(x, VZ.Y0, z); return g; };

// the Doge's Palace façade (local: x along it, front toward +z, y up from the paving): a portico of squat columns and
// pointed arches, the loggia above (twice as many arches, roundels), the pink-and-white lozenge wall with tall windows,
// white cornice and merlons
function dogeFacade(len, n) {
  const white = [], loz = [], dark = [], glass = [], cols = [];
  const b = len / n;
  for (let i = 0; i <= n; i++) { const x = i * b; cols.push(cylG(0.5, 0.46, 4.0, x, 0, -0.4, 18), cylG(0.46, 0.66, 0.8, x, 4.0, -0.4, 18), boxG(1.45, 0.3, 1.45, x, 4.95, -0.4)); }
  white.push(archBand(len, n, 5.1, 8.3, 0.62, 'pointed', 0.85));
  dark.push(boxG(len, 8.3, 0.3, len / 2, 4.15, -6.0), boxG(len, 0.3, 5.6, len / 2, 8.0, -3.2));      // the portico's back wall and ceiling
  white.push(boxG(len + 0.4, 0.35, 1.0, len / 2, 8.45, -0.4));                                          // string course
  // the loggia
  const n2 = n * 2, b2 = len / n2;
  white.push(boxG(len, 1.0, 0.25, len / 2, 9.1, 0.0));                                                  // balustrade
  for (let i = 0; i <= n2; i++) { const x = i * b2; cols.push(cylG(0.2, 0.18, 2.9, x, 8.6, -0.35, 12), cylG(0.18, 0.3, 0.45, x, 11.5, -0.35, 12)); }
  white.push(archBand(len, n2, 11.95, 14.7, 0.3, 'pointed', 0.6, 1.2));
  dark.push(boxG(len, 6.4, 0.3, len / 2, 11.5, -4.2), boxG(len, 0.3, 4.0, len / 2, 14.5, -2.2));
  white.push(boxG(len + 0.4, 0.3, 0.8, len / 2, 14.85, -0.3));
  // the upper wall and its windows
  loz.push(boxG(len, 10.6, 1.0, len / 2, 20.3, -0.9));
  const nw = Math.max(4, Math.round(len / 12));
  for (let k = 0; k < nw; k++) { const x = (k + 0.5) * len / nw, big = k === Math.floor(nw / 2); const ww = big ? 3.4 : 2.5, wh = big ? 6.0 : 4.6, y0 = big ? 16.0 : 17.0;
    glass.push(boxG(ww, wh, 0.1, x, y0 + wh / 2, -0.38));
    white.push(boxG(ww + 0.5, 0.3, 0.3, x, y0 - 0.1, -0.3), boxG(0.25, wh, 0.25, x - ww / 2 - 0.12, y0 + wh / 2, -0.32), boxG(0.25, wh, 0.25, x + ww / 2 + 0.12, y0 + wh / 2, -0.32));
    const ap = new THREE.Shape(); ap.moveTo(-ww / 2 - 0.25, 0); ap.lineTo(ww / 2 + 0.25, 0); ap.lineTo(0, 1.3); ap.lineTo(-ww / 2 - 0.25, 0);
    const ag = new THREE.ExtrudeGeometry(ap, { depth: 0.25, bevelEnabled: false }); ag.translate(x, y0 + wh, -0.45); white.push(ag); }
  // cornice and merlons
  white.push(boxG(len + 0.6, 0.45, 1.3, len / 2, 25.75, -0.85));
  const ml = new THREE.Shape(); ml.moveTo(-0.32, 0); ml.lineTo(0.32, 0); ml.lineTo(0.32, 0.6); ml.lineTo(0.12, 0.75); ml.lineTo(0, 1.25); ml.lineTo(-0.12, 0.75); ml.lineTo(-0.32, 0.6); ml.lineTo(-0.32, 0);
  for (let x = 0.6; x < len - 0.3; x += 1.25) { const g = new THREE.ExtrudeGeometry(ml, { depth: 0.18, bevelEnabled: false }); g.translate(x, 25.98, -0.5); white.push(g); }
  return { white: mergeGeometries(white), loz: mergeGeometries(loz), dark: mergeGeometries(dark), glass: mergeGeometries(glass), cols: mergeGeometries(cols) };
}

// Sansovino's Library: Doric arcade below, Ionic above, the frieze, the balustrade with statues and corner obelisks
function libraryFacade(len, n, statues = true) {
  const white = [], dark = [], cols = [], glass = [];
  const b = len / n;
  for (let i = 0; i <= n; i++) { const x = i * b, e = i === 0 || i === n ? 1.6 : 1.0;
    white.push(boxG(1.15 * e, 5.0, 1.2, x, 2.5, -0.6), boxG(1.0 * e, 4.6, 1.0, x, 11.1, -0.5));                  // piers
    cols.push(cylG(0.36, 0.33, 7.1, x, 0.0, 0.05, 16), cylG(0.3, 0.27, 5.6, x, 9.4, 0.0, 16), boxG(0.9, 0.35, 0.5, x, 7.2, 0.05), boxG(0.75, 0.3, 0.45, x, 15.1, 0.0)); }
  white.push(archBand(len, n, 5.0, 7.6, 0.58, 'round', 1.2));
  white.push(boxG(len + 0.5, 1.6, 1.4, len / 2, 8.4, -0.5));                       // the Doric entablature
  dark.push(boxG(len, 8.0, 0.3, len / 2, 4.0, -5.5), boxG(len, 0.3, 4.8, len / 2, 7.55, -3.0));
  white.push(archBand(len, n, 12.6, 15.2, 0.5, 'round', 1.0));
  glass.push(boxG(len, 6.0, 0.2, len / 2, 12.2, -1.0));                            // the reading-room windows behind the upper arches
  white.push(boxG(len + 0.5, 2.0, 1.3, len / 2, 16.2, -0.5), boxG(len + 0.6, 0.35, 1.5, len / 2, 17.3, -0.5));
  for (let x = 0.3; x < len; x += 0.5) white.push(cylG(0.09, 0.09, 0.9, x, 17.45, -0.3, 6));          // balusters
  white.push(boxG(len + 0.4, 0.22, 0.6, len / 2, 18.45, -0.3));
  if (statues) for (let i = 0; i <= n; i++) { const x = i * b;
    if (i === 0 || i === n) { white.push(boxG(0.9, 0.8, 0.9, x, 18.95, -0.3)); const ob = new THREE.ConeGeometry(0.42, 3.4, 4); ob.rotateY(Math.PI / 4); ob.translate(x, 21.05, -0.3); white.push(ob); continue; }
    white.push(boxG(0.6, 0.35, 0.6, x, 18.73, -0.3), cylG(0.26, 0.2, 1.3, x, 18.9, -0.3, 10), cylG(0.2, 0.17, 0.45, x, 20.2, -0.3, 8));
    const hd = new THREE.SphereGeometry(0.16, 10, 8); hd.translate(x, 20.85, -0.3); white.push(hd); }
  return { white: mergeGeometries(white), dark: mergeGeometries(dark), cols: mergeGeometries(cols), glass: mergeGeometries(glass) };
}

// ---------------- the ground ----------------
export function makeGround() {
  const g = new THREE.Group();
  const pave = patMat('pave', { color: '#8d8a84', rough: 0.85 });
  // the land: everything north of the quay (one slab); the Molo, Piazzetta and Piazza share the paving
  const sh = new THREE.Shape(VOUT.map(([x, z]) => new THREE.Vector2(x, -z))); const lg = new THREE.ExtrudeGeometry(sh, { depth: 3.2, bevelEnabled: false }); lg.rotateX(-Math.PI / 2); lg.translate(0, VZ.Y0 - 3.2, 0);
  const land = new THREE.Mesh(lg, pave); land.receiveShadow = true; g.add(land);
  // the quay: Istrian stone edge and two steps down to the water
  const edge = patMat('ashlar', { color: '#d6cfc1' });
  const q = new THREE.Mesh(mergeGeometries([boxG(3400, 0.25, 0.8, -400, VZ.Y0 - 0.12, VZ.QZ - 0.4), boxG(3400, 0.4, 0.5, -400, 0.75, VZ.QZ + 0.25), boxG(3400, 0.45, 0.5, -400, 0.3, VZ.QZ + 0.7), boxG(3400, 2.0, 0.5, -400, -0.9, VZ.QZ + 1.0)]), edge);
  q.receiveShadow = q.castShadow = true; g.add(q);
  return g;
}

// ---------------- the Piazzetta ----------------
export const PZ = { LIB_X: -24, DOGE_X: 27, DOGE_Z: -6, CAMP: V(-10, 0, -98), COLS: [V(-9.5, 0, -8), V(9.5, 0, -8)] };
export function makePiazzetta() {
  const g = new THREE.Group();
  const white = patMat('ashlar', { color: '#e3dccd' }), pink = patMat('lozenge', { color: '#efe7da', c2: '#dfb3a6' });
  const dark = stdM('#8a7c6c', 0.95), glass = new THREE.MeshStandardMaterial({ color: '#141a1f', roughness: 0.12, metalness: 0.5 });
  const colM = patMat('plain', { color: '#e9e2d4', rough: 0.55 });
  const add = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = shadow; g.add(m); return m; };
  const addSet = (set, x, z, yaw) => { for (const [k, mat] of [['white', white], ['loz', pink], ['dark', dark], ['glass', glass], ['cols', colM]]) if (set[k]) add(place(set[k], x, z, yaw), mat); };
  // Doge's Palace: south façade on the Molo (17 bays), west façade on the Piazzetta (18 bays); a roofed block behind
  addSet(dogeFacade(71, 17), PZ.DOGE_X, PZ.DOGE_Z, 0);
  addSet(dogeFacade(75, 18), PZ.DOGE_X, PZ.DOGE_Z - 75, -Math.PI / 2);
  add(boxG(62.5, 25, 67.5, PZ.DOGE_X + 37.75, VZ.Y0 + 12.5, PZ.DOGE_Z - 40.25), pink);
  add(boxG(67, 2.0, 70, PZ.DOGE_X + 36, VZ.Y0 + 25.0, PZ.DOGE_Z - 38.5), new THREE.MeshStandardMaterial({ color: '#8a8d90', roughness: 0.5, metalness: 0.5 }));
  // the Library (21 bays along the Piazzetta, 3 on the Molo) and the Zecca beyond it
  const lib = libraryFacade(80, 21); addSet(lib, PZ.LIB_X, -6, Math.PI / 2);
  addSet(libraryFacade(12, 3), PZ.LIB_X - 12, -6, 0);
  add(boxG(14, 18, 80, PZ.LIB_X - 13, VZ.Y0 + 9, -46), white);
  add(boxG(42, 20, 26, PZ.LIB_X - 37, VZ.Y0 + 10, -19.5), white);                      // the Zecca
  for (let i = 0; i < 9; i++) add(boxG(1.0, 2.2, 0.3, PZ.LIB_X - 54 + i * 4.2, VZ.Y0 + 13, -6.4), glass, false);
  // the two columns: stepped plinths, granite shafts, capitals; the winged lion (east) and St Theodore (west)
  const gran = stdM('#8f8380', 0.42), bronze = new THREE.MeshStandardMaterial({ color: '#4a3d2c', roughness: 0.45, metalness: 0.75 });
  for (const [k, c] of PZ.COLS.entries()) {
    for (let s = 0; s < 3; s++) add(boxG(4.4 - s * 1.0, 0.45, 4.4 - s * 1.0, c.x, VZ.Y0 + 0.225 + s * 0.45, c.z), white);
    add(boxG(2.0, 1.2, 2.0, c.x, VZ.Y0 + 1.95, c.z), white);
    add(cylG(0.78, 0.68, 11.5, c.x, VZ.Y0 + 2.55, c.z, 24), gran);
    add(cylG(0.68, 1.0, 1.3, c.x, VZ.Y0 + 14.05, c.z, 16), colM);
    add(boxG(2.3, 0.6, 2.3, c.x, VZ.Y0 + 15.65, c.z), colM);
    if (k === 1) { const L = new THREE.Group(); L.position.set(c.x, VZ.Y0 + 15.95, c.z); g.add(L);       // the lion of St Mark
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.4, 6, 12), bronze); body.rotation.z = Math.PI / 2; body.position.y = 0.9; L.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), bronze); head.position.set(-1.1, 1.45, 0); L.add(head);
      for (const s of [-1, 1]) { const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(1.2, 0.4); ws.lineTo(1.6, 1.9); ws.lineTo(0.6, 1.3); ws.lineTo(0, 0);
        const wm = new THREE.Mesh(new THREE.ExtrudeGeometry(ws, { depth: 0.08, bevelEnabled: false }), bronze); wm.position.set(-0.3, 1.15, s * 0.45); wm.rotation.y = s > 0 ? 0 : 0; L.add(wm); }
      for (const [x, z] of [[-0.8, -0.3], [-0.8, 0.3], [0.8, -0.3], [0.8, 0.3]]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.9, 8), bronze); lg.position.set(x, 0.45, z); L.add(lg); }
      L.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
    else { add(cylG(0.32, 0.28, 2.0, c.x, VZ.Y0 + 15.95, c.z, 12), colM); const hd = new THREE.SphereGeometry(0.22, 12, 8); hd.translate(c.x, VZ.Y0 + 18.2, c.z); add(hd, colM);
      add(boxG(2.0, 0.35, 0.6, c.x + 0.3, VZ.Y0 + 16.1, c.z + 0.2), colM); }
  }
  // the Campanile: brick shaft with pilaster strips, white belfry loggia, attic, green spire, the golden angel
  const brick = patMat('brick', { color: '#a5654a', rough: 0.88 }), cop = patMat('copper', { color: '#5f8f78', rough: 0.55, metal: 0.25 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d8a640', roughness: 0.28, metalness: 1.0 });
  const C = PZ.CAMP, camp = new THREE.Group(); camp.position.set(C.x, VZ.Y0, C.z); g.add(camp);
  const cadd = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; camp.add(m); return m; };
  cadd(boxG(12.8, 2.0, 12.8, 0, 1.0, 0), white);
  cadd(boxG(12.0, 48, 12.0, 0, 26, 0), brick);
  for (const s of [-1, 1]) for (let k = -2; k <= 2; k++) { cadd(boxG(0.9, 47, 0.35, k * 2.6, 25.5, s * 6.1), brick); cadd(boxG(0.35, 47, 0.9, s * 6.1, 25.5, k * 2.6), brick); }
  cadd(boxG(12.6, 0.8, 12.6, 0, 50.4, 0), white);
  for (let k = 0; k < 4; k++) { const yaw = k * Math.PI / 2, rot = (x, z) => [x * Math.cos(yaw) - z * Math.sin(yaw), x * Math.sin(yaw) + z * Math.cos(yaw)];
    const band = archBand(11.4, 4, 54.5, 58.2, 0.32, 'round', 0.6); band.translate(-5.7, 0, 5.9); band.rotateY(yaw); cadd(band, white);
    for (let i = 0; i <= 4; i++) { const [x, z] = rot(-5.7 + i * 2.85, 5.6); cadd(cylG(0.22, 0.2, 3.6, x, 50.8, z, 10), colM); } }
  cadd(boxG(2.6, 3.8, 2.6, 0, 52.7, 0), dark);
  for (const [x, z] of [[0, 3.2], [0, -3.2], [3.2, 0], [-3.2, 0]]) { const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, 1.3, 16), bronze); bl.position.set(x, 53.6, z); camp.add(bl); }
  for (const [x, z] of [[5.65, 5.65], [-5.65, 5.65], [5.65, -5.65], [-5.65, -5.65]]) cadd(boxG(0.9, 7.4, 0.9, x, 54.5, z), white);
  cadd(boxG(12.4, 0.6, 12.4, 0, 58.5, 0), white);
  cadd(boxG(10.6, 7.0, 10.6, 0, 62.3, 0), white);
  cadd(boxG(10.9, 0.5, 10.9, 0, 66.0, 0), white);
  const spire = new THREE.ConeGeometry(6.6, 26, 4, 1); spire.rotateY(Math.PI / 4); spire.translate(0, 79.2, 0); cadd(spire, cop);
  const ang = new THREE.Group(); ang.position.set(0, 92.5, 0); camp.add(ang);
  for (const [geo, y] of [[new THREE.CylinderGeometry(0.4, 0.75, 2.6, 10), 1.3], [new THREE.SphereGeometry(0.35, 10, 8), 2.95]]) { const m = new THREE.Mesh(geo, gold); m.position.y = y; ang.add(m); }
  for (const s of [-1, 1]) { const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(0.3, 1.4); ws.lineTo(-0.5, 2.2); ws.lineTo(-0.3, 0.6); ws.lineTo(0, 0);
    const wm = new THREE.Mesh(new THREE.ExtrudeGeometry(ws, { depth: 0.06, bevelEnabled: false }), gold); wm.position.set(0, 1.4, s * 0.3); wm.rotation.y = Math.PI / 2; ang.add(wm); }
  // the Loggetta at its foot (east side): red and white marble
  cadd(boxG(16, 7.5, 5, 0, 3.75, 8.5), patMat('plain', { color: '#c48a78', rough: 0.6 }));
  cadd(boxG(16.6, 1.2, 5.4, 0, 8.1, 8.5), white);
  // the Basilica (south flank seen past the Palace) and its five domes; the clock tower closing the view
  const leadM = new THREE.MeshStandardMaterial({ color: '#7d8186', roughness: 0.42, metalness: 0.6 });
  add(boxG(76, 24, 78, 68, VZ.Y0 + 12, -145), patMat('plain', { color: '#d9c7ae' }));
  for (const [x, z, r] of [[68, -145, 12.5], [68, -118, 10.5], [68, -172, 10.5], [41, -145, 10.5], [95, -145, 10.5]]) {
    add(cylG(r * 0.95, r * 0.95, 5, x, VZ.Y0 + 24, z, 24), patMat('plain', { color: '#cdbba2' }));
    const d = new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2); d.scale(1, 1.25, 1); d.translate(x, VZ.Y0 + 29, z); add(d, leadM);
    add(cylG(1.1, 0.9, 3.2, x, VZ.Y0 + 29 + r * 1.25 - 0.3, z, 10), leadM);
    const ball = new THREE.SphereGeometry(0.7, 10, 8); ball.translate(x, VZ.Y0 + 33.4 + r * 1.25, z); add(ball, gold); }
  add(boxG(13, 30, 12, 6, VZ.Y0 + 15, -178), white);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(3.0, 40), new THREE.MeshStandardMaterial({ color: '#1d3f8a', roughness: 0.4, metalness: 0.3 })); dial.position.set(6, VZ.Y0 + 17, -171.9); g.add(dial);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.0, 40), gold); ring.position.set(6, VZ.Y0 + 17, -171.85); g.add(ring);
  // the Procuratie round the Piazza (for the far shots)
  add(boxG(180, 21, 18, -115, VZ.Y0 + 10.5, -119), patMat('ashlar', { color: '#dcd3c3' }));
  add(boxG(180, 19, 16, -115, VZ.Y0 + 9.5, -186), patMat('ashlar', { color: '#d8cfbe' }));
  return { group: g, campanile: camp };
}

// ---------------- the far side and the city ----------------
export function makeFar() {
  const g = new THREE.Group();
  const white = patMat('ashlar', { color: '#e6dfd1' }), brick = patMat('brick', { color: '#a9573d' });
  const leadM = new THREE.MeshStandardMaterial({ color: '#868a8f', roughness: 0.45, metalness: 0.55 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d8a640', roughness: 0.3, metalness: 1.0 });
  const add = (geo, mat, shadow = false) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = shadow; g.add(m); return m; };
  const land = patMat('pave', { color: '#8a857c', paveW: 0 });
  // San Giorgio Maggiore: the island, Palladio's white front, the dome, the campanile, the monastery
  add(boxG(300, 2.2, 190, 120, 0.1, 470), land);
  add(boxG(34, 26, 70, 110, 1.2 + 13, 450), white);
  add(boxG(36, 2.5, 4, 110, 1.2 + 27.2, 416), white);
  const ped = new THREE.Shape(); ped.moveTo(-18, 0); ped.lineTo(18, 0); ped.lineTo(0, 8); ped.lineTo(-18, 0); const pg = new THREE.ExtrudeGeometry(ped, { depth: 3, bevelEnabled: false }); pg.translate(110, 29.6, 414.5); add(pg, white);
  for (const x of [-12, -4, 4, 12]) add(cylG(1.2, 1.05, 24, 110 + x, 1.2 + 2.6, 414.5, 16), white);
  add(cylG(10, 10, 6, 110, 28, 462, 24), white); { const d = new THREE.SphereGeometry(10, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); d.scale(1, 1.1, 1); d.translate(110, 34, 462); add(d, leadM); }
  add(cylG(1.6, 1.4, 5, 110, 44.8, 462, 10), white);
  add(boxG(9, 52, 9, 150, 1.2 + 26, 470), brick); add(boxG(9.6, 8, 9.6, 150, 1.2 + 56, 470), white);
  { const c = new THREE.ConeGeometry(5, 16, 16); c.translate(150, 1.2 + 68, 470); add(c, leadM); }
  add(boxG(120, 16, 60, 200, 1.2 + 8, 520), brick); add(boxG(60, 14, 50, 40, 1.2 + 7, 510), brick);
  // the Salute: octagon, drum, great dome, lantern; a smaller dome and two bell towers behind; the Dogana's golden ball
  add(boxG(140, 2.2, 90, -330, 0.1, 115), land);
  add(cylG(26, 26, 26, -300, 1.2, 110, 8), white); add(cylG(19, 19, 9, -300, 27.2, 110, 24), white);
  { const d = new THREE.SphereGeometry(19, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2); d.scale(1, 1.25, 1); d.translate(-300, 36.2, 110); add(d, leadM); }
  add(cylG(3.5, 3, 9, -300, 59.5, 110, 12), white);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, s = new THREE.SphereGeometry(3.2, 10, 8); s.scale(1, 1.6, 0.6); s.rotateY(-a); s.translate(-300 + Math.cos(a) * 21, 30, 110 + Math.sin(a) * 21); add(s, white); }
  add(cylG(11, 11, 22, -345, 1.2, 120, 16), white); { const d = new THREE.SphereGeometry(11, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(-345, 23.2, 120); add(d, leadM); }
  for (const z of [104, 136]) add(boxG(4, 44, 4, -360, 1.2 + 22, z), white);
  add(boxG(40, 2.2, 30, -232, 0.1, 118), land); add(boxG(26, 10, 18, -232, 6.2, 118), white); add(boxG(4, 6, 4, -219, 14.2, 118), white);
  { const b = new THREE.SphereGeometry(2.0, 16, 12); b.translate(-219, 19.2, 118); add(b, gold); }
  // Giudecca (a long low strip with the Redentore), the Lido on the horizon
  add(boxG(1800, 2.2, 160, -900, 0.1, 620), land);
  const gd = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), patMat('plaster', { color: '#d6b08e' }), 160); const o = new THREE.Object3D(), r = rng(441), cc = new THREE.Color();
  for (let i = 0; i < 160; i++) { const w = 10 + 14 * r(), h = 8 + 9 * r(); o.position.set(-1750 + i * 10.8 + r() * 3, 1.2 + h / 2, 560 + 30 * r()); o.scale.set(w, h, 14 + 10 * r()); o.updateMatrix(); gd.setMatrixAt(i, o.matrix);
    cc.setHSL(0.05 + 0.06 * r(), 0.35 + 0.25 * r(), 0.55 + 0.2 * r()); gd.setColorAt(i, cc); }
  g.add(gd);
  add(boxG(40, 22, 30, -720, 12.2, 585), white); { const d = new THREE.SphereGeometry(9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(-720, 23.2 + 8, 595); add(d, leadM); add(cylG(9, 9, 8, -720, 23.2, 595, 20), white); }
  add(boxG(9000, 6, 300, 2500, 1, 3600), stdM('#3c4337', 0.9));
  return g;
}

// the city of roofs: plaster blocks with windows and shutters, hipped terracotta roofs, bell towers; north of the
// Piazza, along the Riva to the east, and west of the Zecca; canals left as gaps
export function makeCity() {
  const g = new THREE.Group(), r = rng(2025);
  const N = 14000, walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), patMat('plaster', { color: '#ffffff' }), N);
  const roofG = new THREE.ConeGeometry(0.7071, 1, 4, 1); roofG.rotateY(Math.PI / 4); roofG.translate(0, 0.5, 0);
  const roofs = new THREE.InstancedMesh(roofG, patMat('plain', { color: '#a9553a', rough: 0.85 }), N);
  const o = new THREE.Object3D(), c = new THREE.Color(), towers = []; let n = 0;
  const canal = (x, z) => { const gc = Math.abs(z + 900 + 450 * Math.sin((x + 300) / 520) + 0.0004 * x * x) < 26; return gc || Math.abs(((x * 0.7 + z * 0.3) % 160 + 160) % 160 - 80) < 3.5; };
  const reserved = (x, z) => (x > -230 && x < 140 && z > -200 && z < 8) || (z > -8);
  for (let gz = -1800; gz < -8 && n < N; gz += 22) for (let gx = -1900; gx < 1900 && n < N; gx += 22) {
    const x = gx + 11 + (r() - 0.5) * 2, z = gz + 11 + (r() - 0.5) * 2; if (reserved(x, z) || canal(x, z) || r() < 0.08 || !inVenice(x - 12, z - 12) || !inVenice(x + 12, z + 12) || !inVenice(x - 12, z + 12) || !inVenice(x + 12, z - 12)) continue;
    if (r() < 0.004) { towers.push([x, z]); continue; }
    const w = 12 + 7 * r(), d = 12 + 7 * r(), h = 10 + 9 * r() + (r() < 0.05 ? 6 : 0);
    o.position.set(x, VZ.Y0 + h / 2, z); o.rotation.set(0, 0, 0); o.scale.set(w, h, d); o.updateMatrix(); walls.setMatrixAt(n, o.matrix);
    c.setHSL(0.04 + 0.07 * r(), 0.3 + 0.35 * r(), 0.5 + 0.25 * r()); walls.setColorAt(n, c);
    o.position.set(x, VZ.Y0 + h, z); o.scale.set(w * 1.04, 2.2 + 1.2 * r(), d * 1.04); o.updateMatrix(); roofs.setMatrixAt(n, o.matrix);
    c.setHSL(0.03 + 0.02 * r(), 0.45 + 0.2 * r(), 0.36 + 0.12 * r()); roofs.setColorAt(n, c); n++;
  }
  walls.count = roofs.count = n; walls.receiveShadow = roofs.receiveShadow = true; g.add(walls, roofs);
  // the Riva degli Schiavoni's façades east of the Palace (seen from the water)
  const rv = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), patMat('plaster', { color: '#ffffff' }), 90);
  let k = 0, x = 140; while (x < 1300 && k < 90) { const w = 12 + 14 * r(), h = 14 + 8 * r(); o.position.set(x + w / 2, VZ.Y0 + h / 2, -14 - 4 * r()); o.rotation.set(0, 0, 0); o.scale.set(w, h, 18); o.updateMatrix(); rv.setMatrixAt(k, o.matrix);
    c.setHSL(0.03 + 0.08 * r(), 0.35 + 0.3 * r(), 0.55 + 0.2 * r()); rv.setColorAt(k, c); k++; x += w + 0.3; }
  rv.count = k; rv.castShadow = rv.receiveShadow = true; g.add(rv);
  // bell towers poking above the roofs
  const tw = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), patMat('brick', { color: '#a6573e' }), 26), tops = new THREE.InstancedMesh(roofG, patMat('copper', { color: '#6f8f7d' }), 26);
  for (let i = 0; i < Math.min(26, towers.length); i++) { const [px, pz] = towers[Math.floor(i * towers.length / Math.min(26, towers.length))]; const h = 40 + 30 * r(), s = 6 + 2 * r();
    o.position.set(px, VZ.Y0 + h / 2, pz); o.rotation.set(0, 0, 0); o.scale.set(s, h, s); o.updateMatrix(); tw.setMatrixAt(i, o.matrix);
    o.position.set(px, VZ.Y0 + h, pz); o.scale.set(s * 1.1, 9 + 6 * r(), s * 1.1); o.updateMatrix(); tops.setMatrixAt(i, o.matrix); }
  tw.count = tops.count = Math.min(26, towers.length); g.add(tw, tops);
  return g;
}

// ---------------- gondolas ----------------
// a gondola (11 m, black, asymmetric), its steel ferro at the bow, the red-cushioned seats; local: bow toward +z
function gondolaGeo() {
  const L = 10.8, secs = 28, ring = 12, pos = [], idx = [];
  for (let i = 0; i <= secs; i++) { const u = i / secs, z = (u - 0.5) * L, wdt = 0.7 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u * 1.02 - 0.01))), 0.55) + 0.02;
    const rise = 0.9 * Math.pow(Math.abs(u - 0.5) * 2, 3.2), skew = 0.06 * (u - 0.5);
    for (let j = 0; j <= ring; j++) { const a = Math.PI * j / ring, x = -Math.cos(a) * wdt + skew, y = -Math.sin(a) * 0.38 * (1 - 0.6 * Math.pow(Math.abs(u - 0.5) * 2, 2)) + rise + 0.32;
      pos.push(x, y, z); } }
  for (let i = 0; i < secs; i++) for (let j = 0; j < ring; j++) { const a = i * (ring + 1) + j, b = a + 1, c = a + ring + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
export function makeGondolas(list) {
  const hull = gondolaGeo(), black = new THREE.MeshPhysicalMaterial({ color: '#0b0b0c', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
  const steel = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.25, metalness: 1 }), red = stdM('#7d1d22', 0.8), wood = stdM('#5a3a22', 0.6);
  const fer = new THREE.Shape(); fer.moveTo(0, 0); fer.lineTo(0.05, 0.9); for (let i = 0; i < 6; i++) { fer.lineTo(0.32, 0.2 + i * 0.12); fer.lineTo(0.08, 0.26 + i * 0.12); } fer.lineTo(0.35, 0.95); fer.lineTo(0.0, 1.15); fer.lineTo(-0.12, 0.1); fer.lineTo(0, 0);
  const ferG = new THREE.ExtrudeGeometry(fer, { depth: 0.03, bevelEnabled: false }); ferG.rotateY(-Math.PI / 2); ferG.translate(0.015, 1.12, 5.15);
  const out = [];
  for (const p of list) {
    const gr = new THREE.Group(); gr.position.set(p.x, 0, p.z); gr.rotation.y = p.yaw;
    const h = new THREE.Mesh(hull, black); h.castShadow = h.receiveShadow = true; gr.add(h);
    const f = new THREE.Mesh(ferG, steel); gr.add(f);
    for (const z of [-0.6, 0.8]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.7), red); s.position.set(0, 0.42, z); gr.add(s); }
    const fl = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 3.4), wood); fl.position.set(0, 0.26, 0.1); gr.add(fl);
    out.push({ group: gr, p });
  }
  // the poles (pali): striped posts where they are moored
  const pal = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });
  pal.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvY = position.y;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vY;').replace('#include <color_fragment>', '#include <color_fragment>\nfloat st = step(0.5, fract(vY / 0.6 + 0.1)); diffuseColor.rgb = mix(vec3(0.85, 0.83, 0.8), vec3(0.08, 0.16, 0.42), st * step(0.0, vY));'); };
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.16, 4.6, 10).translate(0, 0.5, 0), pal, list.length); const o = new THREE.Object3D(); let k = 0;
  for (const p of list) { o.position.set(p.x + 1.45 * Math.cos(p.yaw), 0, p.z - 1.45 * Math.sin(p.yaw)); o.updateMatrix(); poles.setMatrixAt(k++, o.matrix); }
  poles.castShadow = true;
  return { list: out, poles };
}
