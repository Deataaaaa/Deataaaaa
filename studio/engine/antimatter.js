// Post 8's event: one gram of antimatter (a 4.5 mm bead of anti-aluminium) meets the air of Shibuya. The plasma ball
// (a noise-displaced sphere glowing by temperature: violet-white, white, yellow, orange, red, then smoke), the ionised
// air ahead of it (a soft violet halo), the shock shell (a faint condensation skin with a bright rim), the mushroom
// cloud for the far shot (lit cards, fire-lit from below), and helpers for the physical clock. Everything is a pure
// function of the physical time the episode passes in.
import * as THREE from 'three';
import { SIMPLEX } from './fx.js';

// Sedov-Taylor blast radius for E = 1.8e14 J in air (1.2 kg/m3): R = 1.03 (E t^2 / rho)^(1/5)
export const E_J = 1.8e14;
export const shockR = (t) => 1.03 * Math.pow((E_J / 1.2) * t * t, 0.2);

const RAMP = /* glsl */`
  vec3 tramp(float k){                                   // temperature ramp, 0 = cold smoke, 1 = hottest (violet-white)
    vec3 c = mix(vec3(0.03, 0.02, 0.02), vec3(0.45, 0.06, 0.02), smoothstep(0.05, 0.25, k));
    c = mix(c, vec3(1.0, 0.36, 0.06), smoothstep(0.2, 0.42, k));
    c = mix(c, vec3(1.0, 0.68, 0.22), smoothstep(0.38, 0.6, k));
    c = mix(c, vec3(1.0, 0.97, 0.93), smoothstep(0.55, 0.78, k));
    return mix(c, vec3(0.86, 0.84, 1.0), smoothstep(0.78, 1.0, k)); }`;

export function makeBead() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 32, 24), new THREE.MeshPhysicalMaterial({ color: '#cfd3da', metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
  g.add(m); return { group: g, mesh: m };
}

// the plasma ball: uHeat 1 = hottest; uR = radius (m); uRough = turbulence of the surface; uSmoke = how much of it is
// already cool smoke (the far shot)
export function makeFireball({ detail = 6 } = {}) {
  const U = { uTime: { value: 0 }, uHeat: { value: 1 }, uR: { value: 0.01 }, uRough: { value: 0.12 }, uGain: { value: 1 }, uSmoke: { value: 0 }, uSquash: { value: 1 }, uViolet: { value: 0 }, uSoot: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: false,
    vertexShader: `${SIMPLEX}
      uniform float uTime, uR, uRough, uSquash; varying vec3 vN; varying vec3 vO; varying vec3 vW; varying float vT;
      void main(){
        vec3 n = normalize(position);
        float t = fbm3(n * 2.4 + vec3(0.0, -uTime * 0.35, 0.0), 4), t2 = fbm3(n * 7.0 + vec3(uTime * 0.2), 3);
        float d = 1.0 + uRough * (0.8 * t + 0.35 * t2);
        vec3 p = n * d * uR; p.y *= uSquash;
        vO = n; vN = normalize(mat3(modelMatrix) * n); vT = t * 0.7 + t2 * 0.3;
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `${SIMPLEX}${RAMP}
      uniform float uTime, uHeat, uGain, uSmoke; varying vec3 vN; varying vec3 vO; varying vec3 vW; varying float vT;
      uniform float uViolet, uSoot;
      void main(){
        vec3 V = normalize(cameraPosition - vW), N = normalize(vN);
        float mu = clamp(dot(N, V), 0.0, 1.0);
        float n1 = fbm3(vO * 3.0 + vec3(0.0, -uTime * 0.5, 0.0), 5);
        float rid = 1.0 - abs(fbm3(vO * 7.5 + vec3(uTime * 0.3, 0.0, -uTime * 0.2), 4));
        float k = uHeat * (0.5 + 0.5 * pow(mu, 0.6)) * (0.72 + 0.45 * n1 + 0.22 * rid + 0.1 * vT);
        vec3 c = tramp(clamp(k, 0.0, 1.0)) * (0.12 + 4.2 * pow(clamp(k, 0.0, 1.2), 2.4));
        c = mix(c, c * vec3(0.72, 0.7, 1.3) + vec3(0.02, 0.0, 0.06) * k, uViolet);
        float smk = smoothstep(0.05, -0.45, n1) * pow(max(1.0 - mu, 0.0), 0.7) * uSoot;           // soot patches drifting over the limb
        c *= 1.0 - 0.88 * smk;
        vec3 smoke = mix(vec3(0.05, 0.04, 0.035), vec3(0.3, 0.17, 0.09), clamp(n1 * 0.5 + 0.5, 0.0, 1.0) * (1.0 - mu * 0.5));
        c = mix(c, smoke, uSmoke * smoothstep(0.1, 0.6, 1.0 - k + 0.3 * n1));
        gl_FragColor = vec4(c * uGain, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, detail), mat); mesh.frustumCulled = false;
  return { mesh, U };
}

// the ionised air round the ball: an additive halo brighter toward its middle (fades smoothly at its edge)
export function makeHalo(color = '#a99bff') {
  const U = { uR: { value: 1 }, uI: { value: 1 }, uCol: { value: new THREE.Color(color) } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: `uniform float uR; varying vec3 vW; varying vec3 vC;
      void main(){ vec4 w = modelMatrix * vec4(position * uR, 1.0); vW = w.xyz; vC = (modelMatrix * vec4(0, 0, 0, 1)).xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uR, uI; uniform vec3 uCol; varying vec3 vW; varying vec3 vC;
      void main(){ vec3 V = normalize(vW - cameraPosition); vec3 oc = cameraPosition - vC;
        float b = dot(oc, V), c = dot(oc, oc) - uR * uR, h = b * b - c; float chord = h > 0.0 ? 2.0 * sqrt(h) : 0.0;   // path length through the sphere
        float a = chord / (2.0 * uR); gl_FragColor = vec4(uCol * uI * a * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat); mesh.frustumCulled = false; mesh.renderOrder = 7;
  return { mesh, U };
}

// the shock shell: a thin condensation skin, bright where it is seen edge-on (its rim), faint across its face
export function makeShock() {
  const U = { uR: { value: 1 }, uA: { value: 0.5 }, uCol: { value: new THREE.Color('#e8eef8') }, uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `uniform float uR; varying vec3 vN; varying vec3 vW;
      void main(){ vN = normalize(mat3(modelMatrix) * position); vec4 w = modelMatrix * vec4(position * uR, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${SIMPLEX}
      uniform float uA, uTime; uniform vec3 uCol; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 V = normalize(cameraPosition - vW); float mu = abs(dot(normalize(vN), V));
        float rim = pow(max(1.0 - mu, 0.0), 3.0), mott = 0.6 + 0.4 * fbm3(vN * 6.0 + uTime * 0.1, 3);
        float a = uA * (0.08 * mott + 0.5 * rim) * smoothstep(-2.0, 2.0, vW.y);
        gl_FragColor = vec4(uCol, clamp(a, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), mat); mesh.frustumCulled = false; mesh.renderOrder = 8;
  return { mesh, U };
}

// the physical clock: video time -> seconds since the bead appeared, log-linear inside each phase
export function physClock(T) {
  const seg = [[T.APPEAR, 1e-15], [T.MICRO, 3e-15], [T.MACRO, 1e-13], [T.MILLI, 3e-7], [T.CITY, 0.03], [T.SPACE, 60], [T.REWIND, 600]];
  return (t) => {
    if (t <= T.APPEAR) return 0;
    for (let i = 0; i < seg.length - 1; i++) { const [a, pa] = seg[i], [b, pb] = seg[i + 1]; if (t <= b) { const k = (t - a) / (b - a); return Math.pow(10, Math.log10(pa) + k * (Math.log10(pb) - Math.log10(pa))); } }
    return 600;
  };
}
export function fmtPhys(s) {
  if (s <= 0) return '0 s';
  if (s < 1e-12) return (s * 1e15).toFixed(1) + ' femtoseconds';
  if (s < 1e-9) return (s * 1e12).toFixed(1) + ' picoseconds';
  if (s < 1e-6) return (s * 1e9).toFixed(s < 1e-8 ? 2 : 1) + ' nanoseconds';
  if (s < 1e-3) return (s * 1e6).toFixed(1) + ' microseconds';
  if (s < 1) return (s * 1e3).toFixed(1) + ' milliseconds';
  if (s < 60) return s.toFixed(1) + ' s';
  return `${Math.floor(s / 60)} min ${String(Math.floor(s % 60)).padStart(2, '0')} s`;
}
