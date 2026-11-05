// Post 6's space shot: Earth seen from 30,000 km above the Atlantic at New York's blue hour, after every atom on it has
// stopped for a second. The cities are dark (every turbine stopped), the clouds collapse and snow out, the land turns
// white within hours, the sea freezes over from the poles in days, the sunlit rim of the air shrinks (the fallen air is
// about -190 C, so it hugs the ground). Uniforms are driven by the episode; everything is a pure function of them.
import * as THREE from 'three';
import { rng } from './core.js';
import { SkyStars } from './fx.js';

const VNOISE = /* glsl */`
  float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
  float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y), mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
  float fbmv(vec3 p){ return n3(p) * 0.5 + n3(p * 2.03 + 7.1) * 0.25 + n3(p * 4.1 - 3.3) * 0.125 + n3(p * 8.3 + 1.1) * 0.0625; }`;

// a direction on the globe from latitude / longitude (degrees), in the frame of three's SphereGeometry + an
// equirectangular map (u = 0 at 180 W)
export function geoDir(lat, lon) {
  const la = THREE.MathUtils.degToRad(lat), lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(lo) * Math.cos(la), Math.sin(la), -Math.sin(lo) * Math.cos(la));
}

export function makeSpace6(tex) {
  const scene = new THREE.Scene();
  const sr = rng(5151), list = [];
  for (let i = 0; i < 12000; i++) {
    const u = sr() * 2 - 1, th = sr() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
    const m = Math.pow(sr(), 3.0), tp = sr(), I = 0.25 + 2.4 * m * m, c = tp < 0.3 ? [0.72, 0.84, 1] : tp < 0.75 ? [1, 0.97, 0.92] : [1, 0.8, 0.58];
    list.push({ d, px: 1.0 + m * 2.2, r: c[0] * I, g: c[1] * I, b: c[2] * I });
  }
  const stars = new SkyStars(list, { radius: 2800, minPx: 1.6 }); scene.add(stars.points);
  // the Sun on 10 October at 18:15 in New York: over the central Pacific (6.8 S, 167.75 W), New York 7 degrees into the night
  const sun = geoDir(-6.8, -167.75);
  const U = { tDay: { value: tex.day }, tNight: { value: tex.night }, tC: { value: tex.clouds }, uSun: { value: sun.clone() },
    uLights: { value: 0 }, uClouds: { value: 1 }, uSmear: { value: 0 }, uDust: { value: 0 }, uCloudLow: { value: 0 }, uLandW: { value: 0 }, uSeaW: { value: 0 }, uAtm: { value: 1 }, uTime: { value: 0 } };
  const vs = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vUv = uv; vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`;
  const earthMat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: vs,
    fragmentShader: `uniform sampler2D tDay, tNight, tC; uniform vec3 uSun; uniform float uSmear, uDust, uLights, uClouds, uCloudLow, uLandW, uSeaW, uAtm, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      ${VNOISE}
      void main(){
        vec3 n = normalize(vN), v = normalize(vV); float d = dot(n, uSun);
        vec3 day = texture2D(tDay, vUv).rgb; vec3 night = texture2D(tNight, vUv).rgb; float cl = texture2D(tC, vUv).r;
        if (uSmear > 0.0) { float acc = 0.0; for (int i = 0; i < 9; i++) acc += texture2D(tC, vUv + vec2((float(i) - 4.0) * 0.006 * uSmear, 0.0)).r; cl = mix(cl, acc / 9.0, uSmear); }   // the clouds smeared east-west by the wind
        float ocean = smoothstep(0.02, -0.05, day.r + day.g * 0.5 - day.b * 1.2), land = 1.0 - ocean;
        float lit = smoothstep(-0.1, 0.22, d), lat = abs(vP.y);
        // land: snowed-out moisture and frost, patchy first (relief from the map's brightness), then white
        float relief = dot(day, vec3(0.3, 0.5, 0.2));
        float landW = smoothstep(0.0, 1.0, uLandW * 1.25 - 0.25 + (fbmv(vP * 7.0) - 0.5) * 0.6 + relief * 0.3);
        // the sea: ice spreading from the poles (and the coasts) toward the equator, with leads of open water
        float front = 1.0 - lat - (1.0 - uSeaW * 1.15) + (fbmv(vP * 6.0 + 2.0) - 0.5) * 0.25;
        float seaW = smoothstep(-0.05, 0.08, front) * smoothstep(0.0, 0.06, uSeaW);
        float leads = 0.0;                                     // (the sea froze through at the restart: no open water left)
        vec3 snow = vec3(0.93, 0.95, 0.98) * (0.86 + 0.14 * fbmv(vP * 40.0)), ice = vec3(0.78, 0.84, 0.9) * (0.85 + 0.15 * fbmv(vP * 22.0 + 1.0));
        vec3 surf = mix(day, snow, landW * land);
        surf = mix(surf, vec3(0.62, 0.5, 0.36), uDust * (0.35 + 0.4 * land));   // dust and sand torn off the land
        surf = mix(surf, mix(ice, day * 0.6, leads), seaW * ocean);
        // clouds: collapsing (thinner, lower, darker grey as they fall and snow out)
        float c = cl * cl * uClouds * (1.0 - 0.5 * uCloudLow);
        vec3 col = mix(surf, vec3(0.94), c * 0.82) * (0.015 + max(d, 0.0) * 1.05);
        float spec = pow(max(dot(reflect(-uSun, n), v), 0.0), 60.0) * ocean * (1.0 - seaW) * (1.0 - c) * 0.5 * step(0.0, d);
        col += vec3(1.0, 0.9, 0.8) * spec;
        col += night * vec3(1.0, 0.75, 0.45) * 1.4 * (1.0 - lit) * (1.0 - c) * uLights;
        // the air's sunlit rim, thinner once the cold air has fallen
        float mu = max(dot(n, v), 0.0), rim = pow(max(1.0 - mu, 0.0), mix(5.0, 3.0, uAtm));
        col += vec3(0.25, 0.5, 1.0) * max(d + 0.15, 0.0) * rim * (0.35 + 0.65 * uAtm);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 96), earthMat); scene.add(earth);
  // a thin glow shell outside the limb (the air seen edge-on), shrinking with uAtm
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.02, 128, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, uniforms: { uSun: U.uSun, uAtm: U.uAtm },
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; uniform float uAtm; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 v = normalize(cameraPosition - vW); float mu = abs(dot(normalize(vN), v)); float a = pow(max(1.0 - mu, 0.0), 6.0) * smoothstep(-0.3, 0.4, dot(normalize(vW), uSun));
        gl_FragColor = vec4(vec3(0.3, 0.55, 1.0) * a * 0.9 * (0.25 + 0.75 * uAtm), 1.0); }`,
  }));
  scene.add(halo);
  return { scene, earth, halo, U, stars, sun };
}
