// Underwater world for the whale episode: a water volume that absorbs light per channel (red first, as in real
// coastal water) and scatters it back as the green-blue haze, sunlight that weakens with depth, caustics dancing on
// everything the sun reaches, light shafts, marine snow, a sandy seabed with rocks and kelp, the surface seen from
// below (Snell's window), exhaled bubbles, and a school of sand lance. Every frame is a pure function of time.
import * as THREE from 'three';
import { rng, clamp, lerp, smooth } from './core.js';
import { canvasTex, softDotTex } from './assets.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- the water volume (shared uniforms, patched into every lit material) ----------
export const WATER = {
  wTime: { value: 0 },
  wOn: { value: 1 },
  wSigma: { value: new THREE.Vector3(0.40, 0.11, 0.13) },       // extinction per metre (coastal green water)
  wScatTop: { value: new THREE.Color('#5e9c9a') },               // haze looking up
  wScatMid: { value: new THREE.Color('#24535a') },               // looking level
  wScatBot: { value: new THREE.Color('#0a1d21') },               // looking down
  wScatK: { value: 1.0 },
  wSurfaceY: { value: 0 },
  wRefDepth: { value: 14 },                                     // colours above are tuned for this depth
  wDepthK: { value: 0.55 },                                     // how fast light dims with depth (artistic)
  wSunDir: { value: new THREE.Vector3(0.22, -1, 0.16).normalize() },   // refracted sun, travelling down
  wCaustic: { value: 0.85 },
  wCausticScale: { value: 1.25 },
  wInside: { value: 0 },                                        // camera inside the whale's mouth
  wGap: { value: new THREE.Vector4(0, 0, 1, 1e6) },             // plane of the open lips (normal points out)
  wInScat: { value: 0.0 },                                      // haze inside the mouth (only what leaks in)
};

const WATER_GLSL = /* glsl */`
uniform float wTime, wOn, wScatK, wSurfaceY, wRefDepth, wDepthK, wCaustic, wCausticScale, wInside, wInScat;
uniform vec3 wSigma, wScatTop, wScatMid, wScatBot, wSunDir;
uniform vec4 wGap;
uniform float wAmbMat, wInnerAmb, wCausMat, wDirMat, wInnerDirMat;
varying vec3 vWPos;
float wCausticPat(vec2 p, float t) {
  vec2 q = mod(p, 6.2831853) - 250.0;
  vec2 i = q; float c = 1.0; float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = q + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(q.x / (sin(i.x + tt) / inten), q.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
float wCaustics(vec3 wp) {
  if (wOn < 0.5) return 1.0;
  vec2 p = (wp.xz - wSunDir.xz * ((wp.y - wSurfaceY) / wSunDir.y)) * wCausticScale;
  float c = 0.5 * (wCausticPat(p, wTime * 0.55) + wCausticPat(p * 1.04 + 0.07, wTime * 0.55 + 0.21));
  float depth = max(0.0, wSurfaceY - wp.y);
  float k = wCaustic * wCausMat * exp(-0.045 * depth);
  return mix(1.0, 0.42 + 2.6 * c, clamp(k, 0.0, 1.0));
}
vec3 wDepthAtt(vec3 wp) {
  if (wOn < 0.5) return vec3(1.0);
  float depth = max(0.0, wSurfaceY - wp.y);
  vec3 s = mix(vec3(0.11), wSigma, 0.18);            // brighter near the surface, a little warmer, never washed out
  return min(exp(-s * (depth - wRefDepth) * wDepthK), vec3(2.2));
}
vec3 wHaze(vec3 dir, vec3 wp) {
  float e = dir.y;
  vec3 sc = e > 0.0 ? mix(wScatMid, wScatTop, smoothstep(0.0, 0.85, e)) : mix(wScatMid, wScatBot, smoothstep(0.0, -0.8, e));
  float camDepth = max(0.0, wSurfaceY - cameraPosition.y);
  return sc * wScatK * exp(-0.11 * (camDepth - wRefDepth) * wDepthK * 0.6);
}
vec3 wFog(vec3 col, vec3 wp) {
  if (wOn < 0.5) return col;
  vec3 d = wp - cameraPosition; float dist = length(d); vec3 dir = d / max(dist, 1e-4);
  vec3 T = exp(-wSigma * dist);
  vec3 sc = wHaze(dir, wp);
  if (wInside > 0.5) {
    float dn = dot(wGap.xyz, dir), s = -(dot(wGap.xyz, cameraPosition) + wGap.w);
    float tc = dn > 1e-4 ? s / dn : 1e9;
    float din = clamp(tc, 0.0, dist);
    vec3 Tin = exp(-wSigma * din);
    return col * T + sc * (Tin - T) + sc * wInScat * (1.0 - Tin);
  }
  return col * T + sc * (1.0 - T);
}
`;

// patch a MeshStandard/MeshPhysical material so it lives in the water
export function waterize(mat, { amb = 1, inner = 1, caustic = 1, dir = 1, innerDir = 1 } = {}) {
  mat.userData.wAmb = { value: amb }; mat.userData.wInner = { value: inner }; mat.userData.wCaus = { value: caustic };
  mat.userData.wDir = { value: dir }; mat.userData.wInnerDir = { value: innerDir };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WATER, { wAmbMat: mat.userData.wAmb, wInnerAmb: mat.userData.wInner, wCausMat: mat.userData.wCaus, wDirMat: mat.userData.wDir, wInnerDirMat: mat.userData.wInnerDir });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`);
    const lights = THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= wCaus * wDirMat * (gl_FrontFacing ? 1.0 : wInnerDirMat);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + WATER_GLSL)
      .replace('#include <lights_physical_fragment>', 'float wCaus = wCaustics(vWPos);\n#include <lights_physical_fragment>')
      .replace('#include <lights_fragment_begin>', lights)
      .replace('#include <lights_fragment_end>', `{ float wA = wAmbMat * (gl_FrontFacing ? 1.0 : wInnerAmb); irradiance *= wA; radiance *= wA; iblIrradiance *= wA; }
        #include <lights_fragment_end>`)
      .replace('#include <opaque_fragment>', 'outgoingLight *= wDepthAtt(vWPos);\n#include <opaque_fragment>')
      .replace('#include <fog_fragment>', 'gl_FragColor.rgb = wFog(gl_FragColor.rgb, vWPos);');
  };
  mat.customProgramCacheKey = () => 'water1';
  return mat;
}

// an environment map for reflections underwater: bright above, the green haze around, dark below
export function waterEnv(renderer) {
  const sc = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#d8f2ea') }, mid: { value: new THREE.Color('#2f7470') }, bot: { value: new THREE.Color('#06191a') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, bot; varying vec3 vP;
      void main(){ vec3 d = normalize(vP); float e = d.y;
        vec3 c = e > 0.0 ? mix(mid, top, pow(smoothstep(0.0, 1.0, e), 1.6)) : mix(mid, bot, smoothstep(0.0, -0.7, e));
        c += vec3(1.0, 1.0, 0.95) * 6.0 * pow(max(dot(d, normalize(vec3(-0.22, 1.0, -0.16))), 0.0), 60.0);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), mat));
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(sc, 0.0).texture;
  pm.dispose();
  return env;
}

// ---------- light shafts: long soft billboards along the refracted sun, around the camera ----------
export class Shafts {
  constructor(n = 64, { cell = 3.2, len = 34 } = {}) {
    this.n = n; this.cell = cell; this.len = len;
    const side = Math.ceil(Math.sqrt(n)); this.side = side;
    const base = new THREE.PlaneGeometry(1, 1, 1, 8);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.getAttribute('position')); g.setAttribute('uv', base.getAttribute('uv'));
    this.top = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.prm = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);   // width, intensity, phase
    this.top.setUsage(THREE.DynamicDrawUsage); this.prm.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aTop', this.top); g.setAttribute('aPrm', this.prm); g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { ...WATER, uLen: { value: len }, uCol: { value: new THREE.Color('#bfeee0') }, uGain: { value: 1 } },
      vertexShader: `
        uniform vec3 wSunDir; uniform float uLen; attribute vec3 aTop; attribute vec3 aPrm;
        varying vec2 vUv; varying vec3 vW; varying float vI, vPh;
        void main(){
          vUv = uv; vI = aPrm.y; vPh = aPrm.z;
          vec3 axis = normalize(wSunDir);
          vec3 p = aTop + axis * (1.0 - uv.y) * uLen;
          vec3 toCam = normalize(cameraPosition - p);
          vec3 side = normalize(cross(axis, toCam));
          p += side * position.x * aPrm.x;
          vW = p;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 wSigma, uCol; uniform float wTime, wSurfaceY, uGain, wOn; varying vec2 vUv; varying vec3 vW; varying float vI, vPh;
        void main(){
          float across = exp(-pow((vUv.x - 0.5) * 3.2, 2.0));
          float depth = max(0.0, wSurfaceY - vW.y);
          float along = smoothstep(0.0, 0.06, vUv.y) * exp(-depth * 0.085);
          float flick = 0.55 + 0.45 * sin(wTime * 0.9 + vPh * 6.28 + vW.y * 0.35) * sin(wTime * 0.53 + vPh * 11.0);
          float dist = length(vW - cameraPosition);
          vec3 T = exp(-wSigma * dist * 0.85);
          float near = smoothstep(0.6, 2.5, dist);
          gl_FragColor = vec4(uCol * T * across * along * flick * vI * uGain * near * wOn, 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
    const r = rng(404); this.rnd = Array.from({ length: n }, () => [r(), r(), r(), r(), r()]);
  }
  update(cam, surfaceY) {
    const c = this.cell, s = this.side, half = (s * c) / 2;
    const sun = WATER.wSunDir.value;
    // shafts start at the surface; centre the grid on where the camera's line toward the sun meets the surface
    const k = (surfaceY - cam.y) / -sun.y;
    const cx = cam.x - sun.x * k, cz = cam.z - sun.z * k;
    for (let i = 0; i < this.n; i++) {
      const [a, b, w, inten, ph] = this.rnd[i];
      const gx = (i % s), gz = Math.floor(i / s);
      let x = gx * c + a * c, z = gz * c + b * c;
      x = cx + (((x - cx) % (s * c)) + s * c) % (s * c) - half;
      z = cz + (((z - cz) % (s * c)) + s * c) % (s * c) - half;
      this.top.array.set([x, surfaceY, z], i * 3);
      this.prm.array.set([0.25 + w * 1.4, 0.05 + inten * 0.11, ph], i * 3);
    }
    this.top.needsUpdate = true; this.prm.needsUpdate = true;
  }
}

// ---------- marine snow and other particles that live in the water ----------
const SNOW_VS = `
  attribute vec3 aOff; attribute float aSize; attribute float aAlpha; attribute float aRot;
  varying vec2 vUv; varying float vA; varying vec3 vW;
  void main(){
    vUv = uv; vA = aAlpha;
    vec4 mv = viewMatrix * vec4(aOff, 1.0);
    float c = cos(aRot), s = sin(aRot);
    vec2 p = position.xy * aSize; p = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
    mv.xy += p; vW = aOff;
    gl_Position = projectionMatrix * mv;
  }`;
export class Snow {
  constructor(n = 1800, { box = 9, seed = 21, color = '#cfe5dc', torch = null } = {}) {
    this.n = n; this.box = box;
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.getAttribute('position')); g.setAttribute('uv', base.getAttribute('uv'));
    this.off = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.size = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.rot = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    for (const a of [this.off, this.size, this.alpha, this.rot]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aOff', this.off); g.setAttribute('aSize', this.size); g.setAttribute('aAlpha', this.alpha); g.setAttribute('aRot', this.rot);
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { ...WATER, map: { value: softDotTex() }, uCol: { value: new THREE.Color(color) }, uLight: { value: 1 },
        uTorchPos: { value: new THREE.Vector3() }, uTorchDir: { value: new THREE.Vector3(0, 0, -1) }, uTorch: { value: 0 }, uTorchCos: { value: 0.9 } },
      vertexShader: SNOW_VS,
      fragmentShader: `
        uniform sampler2D map; uniform vec3 uCol, wSigma, uTorchPos, uTorchDir; uniform float uLight, uTorch, uTorchCos, wOn;
        varying vec2 vUv; varying float vA; varying vec3 vW;
        void main(){
          float a = texture2D(map, vUv).a * vA;
          float dist = length(vW - cameraPosition);
          vec3 T = exp(-wSigma * dist);
          vec3 c = uCol * uLight * T;
          if (uTorch > 0.0) {
            vec3 d = vW - uTorchPos; float L = length(d);
            float cone = smoothstep(uTorchCos, uTorchCos + 0.04, dot(d / max(L, 1e-3), uTorchDir));
            c += vec3(1.0, 0.97, 0.9) * uTorch * cone / (1.0 + L * L * 0.6) * exp(-wSigma.g * L);
          }
          gl_FragColor = vec4(c, a);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 7;
    const r = rng(seed); this.p = Array.from({ length: n }, () => [r() * box, r() * box, r() * box, r(), r()]);
  }
  update(t, cam, { drift = new THREE.Vector3(0.02, -0.006, 0.01), surge = 0.05, alpha = 1, sizeK = 1 } = {}) {
    const B = this.box, h = B / 2;
    for (let i = 0; i < this.n; i++) {
      const [x0, y0, z0, s, ph] = this.p[i];
      const sx = Math.sin(t * 0.4 + ph * 6.28) * surge;
      let x = x0 + drift.x * t + sx, y = y0 + drift.y * t + Math.sin(t * 0.6 + ph * 9) * 0.02, z = z0 + drift.z * t + sx * 0.5;
      x = cam.x + ((((x - cam.x + h) % B) + B) % B) - h;
      y = cam.y + ((((y - cam.y + h) % B) + B) % B) - h;
      z = cam.z + ((((z - cam.z + h) % B) + B) % B) - h;
      const d = Math.hypot(x - cam.x, y - cam.y, z - cam.z);
      this.off.array.set([x, y, z], i * 3);
      const big = s > 0.985 ? 3.5 : 1;              // a few bigger flecks
      this.size.array[i] = (0.0035 + s * 0.006) * big * sizeK * (1 + 1.5 * smooth(0.6, 0.05, d));
      this.alpha.array[i] = alpha * (0.35 + 0.5 * s) * smooth(0.04, 0.25, d) * (1 - smooth(h * 0.6, h, d));
      this.rot.array[i] = ph * 6.28;
    }
    for (const a of [this.off, this.size, this.alpha, this.rot]) a.needsUpdate = true;
  }
}

// ---------- seabed: sand ripples, darker detritus, shell bits; rocks with algae; kelp ----------
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
// periodic value noise (period P lattice cells) for tileable textures
function vnoiseP(x, z, P) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const m = (a) => ((a % P) + P) % P;
  const a = hash2(m(xi), m(zi)), b = hash2(m(xi + 1), m(zi)), c = hash2(m(xi), m(zi + 1)), d = hash2(m(xi + 1), m(zi + 1));
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
// tileable fbm over the unit square: u, v in [0,1), base frequency f cells per tile
export function fbmT(u, v, f, oct = 4) { let s = 0, a = 0.5, F = f; for (let i = 0; i < oct; i++) { s += a * vnoiseP(u * F, v * F, F); F *= 2; a *= 0.5; } return s; }
export function fbm(x, z, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; } return s; }
// height of the sea floor (metres, relative to its mean level)
export function bedHeight(x, z) {
  return (fbm(x * 0.045, z * 0.045, 3) - 0.5) * 2.6 + (fbm(x * 0.21 + 7, z * 0.21 - 3, 3) - 0.5) * 0.5;
}

function sandMaps() {
  const N = 1024;
  const albedo = canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N), d = img.data, r = rng(55);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const n = fbmT(x / N, y / N, 16, 4), fine = r();
      const k = (y * N + x) * 4;
      const base = 0.62 + (n - 0.5) * 0.35 + (fine - 0.5) * 0.18;
      d[k] = 196 * base + 8; d[k + 1] = 186 * base + 8; d[k + 2] = 160 * base + 6; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 900; i++) {            // shell bits and darker grains
      const x = r() * N, y = r() * N, s = 1 + r() * 3.5;
      g.fillStyle = r() < 0.6 ? `rgba(240,236,222,${0.35 + r() * 0.4})` : `rgba(60,56,48,${0.25 + r() * 0.35})`;
      g.beginPath(); g.ellipse(x, y, s, s * (0.4 + r() * 0.6), r() * 3, 0, 7); g.fill();
    }
    for (let i = 0; i < 60; i++) {             // patches of detritus / fine algae film
      const x = r() * N, y = r() * N, s = 30 + r() * 110;
      const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(70,82,52,0.22)'); gr.addColorStop(1, 'rgba(70,82,52,0)');
      g.fillStyle = gr; g.fillRect(x - s, y - s, 2 * s, 2 * s);
    }
  }, { repeat: true });
  // ripple normal map: wave ridges with noise in their direction and spacing
  const normal = canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N), d = img.data;
    const H = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      const warp = (fbmT(u, v, 6, 3) - 0.5) * 1.6;
      const ph = (u * 9 + warp) * Math.PI * 2;                // ~9 ripples per tile
      const ridge = Math.pow(0.5 + 0.5 * Math.sin(ph + 0.6 * Math.sin(ph)), 1.6);
      H[y * N + x] = ridge * 0.8 + fbmT(u, v, 40, 2) * 0.35;
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const hx = H[y * N + ((x + 1) % N)] - H[y * N + ((x - 1 + N) % N)], hy = H[((y + 1) % N) * N + x] - H[((y - 1 + N) % N) * N + x];
      const nx = -hx * 3.2, ny = -hy * 3.2, nz = 1, l = Math.hypot(nx, ny, nz);
      const k = (y * N + x) * 4; d[k] = (nx / l * 0.5 + 0.5) * 255; d[k + 1] = (ny / l * 0.5 + 0.5) * 255; d[k + 2] = (nz / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true, linear: true });
  return { albedo, normal };
}

export function makeSeabed({ size = 160, seg = 220, y0 = -14, repeat = 26 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, y0 + bedHeight(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const { albedo, normal } = sandMaps();
  albedo.repeat.set(repeat, repeat); normal.repeat.set(repeat, repeat);
  const mat = waterize(new THREE.MeshStandardMaterial({ map: albedo, normalMap: normal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.95, metalness: 0 }));
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true;
  return { mesh, y0, height: (x, z) => y0 + bedHeight(x, z) };
}

// rocks: displaced icosahedra, coloured darker below and furred with algae on top
function rockGeometry(seed, detail = 3) {
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, detail)); const p = g.attributes.position; const r = rng(seed);
  const o = [r() * 10, r() * 10, r() * 10];
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const n = fbm(v.x * 1.4 + o[0], v.y * 1.4 + v.z * 0.7 + o[1], 4), n2 = fbm(v.x * 5 + o[2], v.z * 5 - v.y * 3, 3);
    const facet = Math.abs(Math.sin(v.x * 3.1 + o[0]) * Math.cos(v.z * 2.7 + o[2]) + Math.sin(v.y * 4.3 + o[1]) * 0.5);   // blocky fractures
    const n3 = fbm(v.x * 9 + o[1], v.z * 9 + v.y * 5, 3);
    const k = 0.55 + n * 0.8 + n2 * 0.22 + n3 * 0.08 - facet * 0.16;
    v.multiplyScalar(k); v.y *= 0.62; if (v.y < -0.25) v.y = -0.25 + (v.y + 0.25) * 0.3;     // flat-ish bottoms sit on the sand
    p.setXYZ(i, v.x, v.y, v.z);
    const top = smooth(-0.1, 0.45, v.y / k);
    const base = [0.2 + n2 * 0.08, 0.19 + n2 * 0.07, 0.17 + n2 * 0.06];
    const alg = [0.17, 0.17, 0.08];                       // olive-brown algae film
    const red = n2 > 0.62 ? 1 : 0;                        // a few patches of encrusting red algae
    for (let c = 0; c < 3; c++) col[i * 3 + c] = lerp(base[c], alg[c], top * 0.85) * (1 - 0.15 * red) + (c === 0 ? 0.12 : 0) * red;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
function rockMaps() {
  const N = 512;
  const albedo = canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N), d = img.data, r = rng(301);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, n = fbmT(u, v, 8, 5), n2 = fbmT(u, v, 40, 2);
      const spot = n2 > 0.66 ? 1 : 0;
      const c = 0.55 + (n - 0.5) * 0.7 + (r() - 0.5) * 0.12;
      const k = (y * N + x) * 4; d[k] = 255 * clamp(c * (1 + 0.25 * spot)); d[k + 1] = 255 * clamp(c * (1 + 0.1 * spot)); d[k + 2] = 255 * clamp(c * 0.95); d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 260; i++) {             // tiny barnacles and limpet scars
      const x = r() * N, y = r() * N, s = 1 + r() * 2.5; g.fillStyle = `rgba(225,222,210,${0.3 + r() * 0.4})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    }
  }, { repeat: true });
  const normal = canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N), d = img.data, Hh = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) Hh[y * N + x] = fbmT(x / N, y / N, 10, 5);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const hx = Hh[y * N + ((x + 1) % N)] - Hh[y * N + ((x - 1 + N) % N)], hy = Hh[((y + 1) % N) * N + x] - Hh[((y - 1 + N) % N) * N + x];
      const nx = -hx * 7, ny = -hy * 7, l = Math.hypot(nx, ny, 1), k = (y * N + x) * 4;
      d[k] = (nx / l * 0.5 + 0.5) * 255; d[k + 1] = (ny / l * 0.5 + 0.5) * 255; d[k + 2] = (1 / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true, linear: true });
  albedo.repeat.set(3, 2); normal.repeat.set(3, 2);
  return { albedo, normal };
}
export function makeRocks(list, seed = 9) {
  const group = new THREE.Group();
  const maps = rockMaps();
  const mat = waterize(new THREE.MeshStandardMaterial({ vertexColors: true, map: maps.albedo, normalMap: maps.normal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.95, metalness: 0 }));
  const shapes = [0, 1, 2, 3, 4].map((k) => rockGeometry(seed * 13 + k, 4));
  list.forEach(([x, y, z, s, sy = 1, ry = 0, shape = 0]) => {
    const m = new THREE.Mesh(shapes[shape % shapes.length], mat);
    m.position.set(x, y, z); m.scale.set(s, s * sy, s * (0.8 + 0.2 * ((shape * 7) % 3))); m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true; group.add(m);
  });
  return { group, mat };
}

// kelp: long brown blades swaying in the surge (vertex shader), a stipe each
export function makeKelp(list, seed = 3) {
  const group = new THREE.Group(); const r = rng(seed);
  const blade = new THREE.PlaneGeometry(1, 1, 1, 18); blade.translate(0, 0.5, 0);
  const mat = waterize(new THREE.MeshStandardMaterial({ color: '#6b5a2a', roughness: 0.55, metalness: 0, side: THREE.DoubleSide, emissive: '#1c1608', emissiveIntensity: 0.6 }));
  const swayU = { value: 0 };
  mat.userData.sway = swayU;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh) => {
    prev(sh);
    sh.uniforms.uSway = swayU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSway;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float hk = position.y; float ph = modelMatrix[3][0] * 0.7 + modelMatrix[3][2] * 0.4;
        transformed.x += sin(uSway * 0.9 + ph + hk * 1.3) * 0.22 * hk * hk;
        transformed.z += sin(uSway * 0.7 + ph * 1.7 + hk) * 0.12 * hk * hk;
        transformed.x *= 1.0 - 0.25 * hk; `);
  };
  mat.customProgramCacheKey = () => 'water-kelp';
  list.forEach(([x, y, z, n = 3]) => {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(blade, mat);
      const L = 1.2 + r() * 1.8, Wd = 0.22 + r() * 0.16;
      m.scale.set(Wd, L, 1); m.position.set(x + (r() - 0.5) * 0.3, y, z + (r() - 0.5) * 0.3);
      m.rotation.set((r() - 0.5) * 0.4, r() * 6.28, (r() - 0.5) * 0.4); m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    }
  });
  return { group, mat, setTime: (t) => { swayU.value = t; } };
}

// ---------- the surface seen from below: Snell's window, total internal reflection outside it ----------
export function makeSurfaceBelow({ size = 400 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, 1, 1); geo.rotateX(Math.PI / 2);     // faces down
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, depthWrite: false, transparent: false,
    uniforms: { ...WATER, uSky: { value: new THREE.Color('#e9f6ff') }, uSkyK: { value: 9 }, uSunK: { value: 40 }, uSunTop: { value: new THREE.Vector3(-0.3, 0.9, -0.25).normalize() } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform vec3 wSigma, wScatTop, wScatMid, uSky, uSunTop; uniform float wTime, uSkyK, uSunK, wOn, wScatK, wSurfaceY, wRefDepth, wDepthK;
      varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
      vec2 waveN(vec2 p){
        float e = 0.05, t = wTime;
        float a = n2(p*0.9 + vec2(t*0.35, t*0.2)) + 0.5*n2(p*2.3 - vec2(t*0.5, -t*0.3)) + 0.25*n2(p*5.1 + vec2(-t*0.8, t*0.6));
        float bx = n2((p+vec2(e,0))*0.9 + vec2(t*0.35, t*0.2)) + 0.5*n2((p+vec2(e,0))*2.3 - vec2(t*0.5, -t*0.3)) + 0.25*n2((p+vec2(e,0))*5.1 + vec2(-t*0.8, t*0.6));
        float by = n2((p+vec2(0,e))*0.9 + vec2(t*0.35, t*0.2)) + 0.5*n2((p+vec2(0,e))*2.3 - vec2(t*0.5, -t*0.3)) + 0.25*n2((p+vec2(0,e))*5.1 + vec2(-t*0.8, t*0.6));
        return vec2(bx - a, by - a) / e;
      }
      void main(){
        vec3 d = vW - cameraPosition; float dist = length(d); vec3 dir = d / dist;
        vec2 g = waveN(vW.xz * 0.6) * 0.09;
        vec3 n = normalize(vec3(-g.x, -1.0, -g.y));            // surface normal, pointing down into the water
        float cosI = dot(-dir, n);                              // angle of the ray to the normal
        float sinT2 = (1.33 * 1.33) * (1.0 - cosI * cosI);      // Snell: water -> air
        vec3 col;
        if (sinT2 < 1.0) {
          vec3 tdir = refract(dir, n, 1.33);
          float sun = pow(max(dot(normalize(tdir), uSunTop), 0.0), 220.0) * uSunK + pow(max(dot(normalize(tdir), uSunTop), 0.0), 8.0) * 1.2;
          float edge = smoothstep(1.0, 0.82, sinT2);
          col = (uSky * uSkyK * (0.55 + 0.45 * edge) + vec3(1.0, 0.97, 0.9) * sun) * (0.7 + 0.3 * edge);
        } else {
          col = wScatMid * wScatK * 1.6;                       // total internal reflection: the water below, mirrored
        }
        vec3 T = exp(-wSigma * dist);
        float camDepth = max(0.0, wSurfaceY - cameraPosition.y);
        float e = dir.y;
        vec3 sc = (e > 0.0 ? mix(wScatMid, wScatTop, smoothstep(0.0, 0.85, e)) : wScatMid) * wScatK * exp(-0.11 * (camDepth - wRefDepth) * wDepthK * 0.6);
        gl_FragColor = vec4(wOn > 0.5 ? col * T + sc * (1.0 - T) : col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = -1; mesh.frustumCulled = false;
  return { mesh, mat };
}

// ---------- the water all around, where rays meet nothing ----------
export function makeWaterDome(radius = 380) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { ...WATER },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform vec3 wScatTop, wScatMid, wScatBot; uniform float wScatK, wSurfaceY, wRefDepth, wDepthK, wInside, wInScat; varying vec3 vW;
      void main(){
        vec3 dir = normalize(vW - cameraPosition); float e = dir.y;
        vec3 sc = e > 0.0 ? mix(wScatMid, wScatTop, smoothstep(0.0, 0.85, e)) : mix(wScatMid, wScatBot, smoothstep(0.0, -0.8, e));
        float depth = max(0.0, wSurfaceY - cameraPosition.y);
        sc *= wScatK * exp(-0.11 * (depth - wRefDepth) * wDepthK * 0.6);
        gl_FragColor = vec4(sc, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat); mesh.renderOrder = -2; mesh.frustumCulled = false;
  mesh.onBeforeRender = (r, sc, cam) => { mesh.position.copy(cam.position); mesh.updateMatrixWorld(); };
  return { mesh, mat };
}

// ---------- bubbles: silver rims (total internal reflection), dark-ish cores; rise and wobble ----------
export class Bubbles {
  constructor(n = 220) {
    this.n = n;
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.getAttribute('position')); g.setAttribute('uv', base.getAttribute('uv'));
    this.off = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.size = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.rot = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    for (const a of [this.off, this.size, this.alpha, this.rot]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aOff', this.off); g.setAttribute('aSize', this.size); g.setAttribute('aAlpha', this.alpha); g.setAttribute('aRot', this.rot);
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { ...WATER, uLight: { value: 1 }, uTint: { value: new THREE.Color('#e6fbf4') } },
      vertexShader: SNOW_VS,
      fragmentShader: `
        uniform vec3 wSigma, uTint; uniform float uLight; varying vec2 vUv; varying float vA; varying vec3 vW;
        void main(){
          vec2 q = (vUv - 0.5) * 2.0; float r = length(q);
          if (r > 1.0) discard;
          float rim = smoothstep(0.62, 0.93, r) * (1.0 - smoothstep(0.93, 1.0, r));
          float hi = smoothstep(0.35, 0.0, length(q - vec2(-0.32, 0.38))) * 0.9;     // the bright reflection of the surface
          float core = 0.12 * (1.0 - r);
          float a = clamp(rim * 0.95 + hi + core, 0.0, 1.0) * vA;
          float dist = length(vW - cameraPosition);
          vec3 T = exp(-wSigma * dist * 0.8);
          gl_FragColor = vec4(uTint * uLight * (0.6 + 0.8 * rim + hi) * T, a);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 9;
    this.used = 0;
  }
  begin() { this.used = 0; }
  put(x, y, z, size, alpha, rot = 0) {
    if (this.used >= this.n) return; const i = this.used++;
    this.off.array.set([x, y, z], i * 3); this.size.array[i] = size; this.alpha.array[i] = alpha; this.rot.array[i] = rot;
  }
  end() { for (let i = this.used; i < this.n; i++) this.alpha.array[i] = 0; for (const a of [this.off, this.size, this.alpha, this.rot]) a.needsUpdate = true; }
}
// a diver's exhale: ~40 bubbles leaving the regulator's exhaust (beside the mouth) and rising, merging and wobbling
export function exhale(bub, origin, age, seed, { up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(1, 0, 0), count = 34 } = {}) {
  if (age < 0 || age > 3.2) return;
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const delay = r() * 0.9, a = age - delay; const sz = 0.006 + Math.pow(r(), 2.2) * 0.03, sd = r() < 0.5 ? -1 : 1;
    if (a < 0) { r(); r(); r(); continue; }
    const rise = 0.25 * a + 0.32 * a * a * (0.6 + sz * 14);
    const wob = Math.sin(a * (9 + r() * 5) + i) * 0.012 * (1 + sz * 20);
    const spread = (0.04 + r() * 0.09) * Math.min(1, a * 2.5);
    const p = origin.clone().addScaledVector(side, sd * (0.05 + spread) + wob).addScaledVector(up, rise).add(new THREE.Vector3((r() - 0.5) * 0.06 * a, 0, (r() - 0.5) * 0.06 * a));
    bub.put(p.x, p.y, p.z, sz * (1 + a * 0.18), Math.min(1, (3.2 - age) * 2) * 0.9, r() * 6.28);
  }
}

// ---------- sand lance: slender silver fish, schooling ----------
function fishGeometry() {
  // 15 cm body along -z (head at +z), lateral fins omitted, forked tail
  const seg = 10, rad = 6, L = 0.15, pos = [], col = [], idx = [], bodyZ = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, z = L * (0.5 - u);
    const r = 0.0065 * Math.pow(Math.sin(Math.PI * Math.min(0.98, 0.08 + u * 0.95)), 0.7) * (u > 0.85 ? 0.6 : 1);
    for (let j = 0; j < rad; j++) {
      const a = (j / rad) * Math.PI * 2, y = Math.cos(a) * r * 1.25, x = Math.sin(a) * r * 0.75;
      pos.push(x, y, z); bodyZ.push(u);
      const top = 0.5 + 0.5 * Math.cos(a);
      col.push(lerp(0.85, 0.32, top), lerp(0.88, 0.42, top), lerp(0.86, 0.40, top));
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * rad + j, b = i * rad + (j + 1) % rad, c = a + rad, d = b + rad; idx.push(a, c, b, b, c, d); }
  const t0 = pos.length / 3;   // tail fan
  pos.push(0, 0, -L * 0.48, 0, 0.012, -L * 0.6, 0, -0.012, -L * 0.6); col.push(0.5, 0.56, 0.55, 0.5, 0.56, 0.55, 0.5, 0.56, 0.55); bodyZ.push(1, 1.08, 1.08);
  idx.push(t0, t0 + 1, t0 + 2, t0, t0 + 2, t0 + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('bodyU', new THREE.Float32BufferAttribute(bodyZ, 1)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
export class FishSchool {
  constructor(n = 2200, { env = null, seed = 12 } = {}) {
    this.n = n;
    const geo = fishGeometry();
    this.phase = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); this.phase.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPhase', this.phase);
    const mat = waterize(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.85, roughness: 0.28, envMap: env, envMapIntensity: 1.3 }), { caustic: 0.6 });
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh) => {
      prev(sh);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aPhase; attribute float bodyU;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float bend = sin(aPhase - bodyU * 5.0) * 0.022 * (0.15 + bodyU * bodyU * 1.4);
          transformed.x += bend;`);
    };
    mat.customProgramCacheKey = () => 'water-fish';
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false;
    const r = rng(seed);
    this.f = Array.from({ length: n }, () => ({ a: r() * Math.PI * 2, r: r(), h: r(), w: 0.7 + r() * 0.6, ph: r() * 6.28, s: 0.85 + r() * 0.3, e: r(), tw: r() }));
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
  }
  // posFn(i, fish, t) -> Vector3 (world); orientation follows the path (finite difference)
  update(t, posFn, { keepAway = null, keepR = 0.8, visible = 1 } = {}) {
    const m = this._m, q = this._q, sc = this._s; const fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), z = new THREE.Vector3(0, 0, 1);
    let shown = 0;
    for (let i = 0; i < this.n; i++) {
      const f = this.f[i];
      const p0 = posFn(i, f, t), p1 = posFn(i, f, t + 0.04);
      if (!p0 || f.e > visible) { m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, m); continue; }
      if (keepAway) {   // personal space around the camera / hands: fish swerve, never pass through
        for (const [c, rr] of keepAway) {
          const d = p0.distanceTo(c); const R = rr || keepR;
          if (d < R) { const dir = p0.clone().sub(c).normalize(); p0.copy(c).addScaledVector(dir, R + (R - d) * 0.2); p1.add(dir.multiplyScalar(R - d)); }
        }
      }
      fwd.subVectors(p1, p0); const sp = fwd.length();
      if (sp < 1e-6) fwd.set(0, 0, 1); else fwd.divideScalar(sp);
      const mt = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), fwd, up);   // -z toward fwd
      q.setFromRotationMatrix(mt); q.multiply(new THREE.Quaternion().setFromAxisAngle(up, Math.PI));   // our fish's head is +z
      sc.setScalar(f.s);
      m.compose(p0, q, sc); this.mesh.setMatrixAt(i, m);
      this.phase.array[i] = f.ph + t * (14 + sp * 160) ;
      shown++;
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.phase.needsUpdate = true;
    return shown;
  }
}
