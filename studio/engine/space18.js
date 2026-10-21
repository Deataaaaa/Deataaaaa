// Post 12's space shot (33-51 s): Earth from ~20,000 km after all its ice has turned to water. Greenland's white goes dark
// (wet rock round an inland sea where the bedrock lies below sea level), a ring of waves races out across the Atlantic,
// the camera swings south to Antarctica (a dark continent and seas where the ice was, turbid meltwater spreading into the
// Southern Ocean, its own wave rings), then back north as the oceans rise 66 m over three days: the Amazon lowlands, the
// Low Countries, Bangladesh go under (land below ~66 m, from NASA's GEBCO elevation map) and the city lights there
// go out. engine/tex/earth_ice18.png: R = share of the land below 66 m, G = ice. The Sun stays where it is at 16:45 UTC on
// 21 October (time is compressed; a turning terminator would strobe).
import * as THREE from 'three';
import { rng, smooth, clamp } from './core.js';
import { SkyStars } from './fx.js';
import { geoDir } from './space6.js';

const VNOISE = /* glsl */`
  float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
  float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y), mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
  float fbmv(vec3 p){ return n3(p) * 0.5 + n3(p * 2.03 + 7.1) * 0.25 + n3(p * 4.1 - 3.3) * 0.125 + n3(p * 8.3 + 1.1) * 0.0625; }`;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// the story clock (hours since the melt) at screen time t: log-spaced keys
const KEYS = [[33.0, 0.05], [36.7, 0.6], [40.5, 3], [44.3, 14], [47.7, 48], [51.0, 72]];
export function hoursAt(t) {
  if (t <= KEYS[0][0]) return KEYS[0][1];
  for (let i = 1; i < KEYS.length; i++) if (t <= KEYS[i][0]) { const [t0, h0] = KEYS[i - 1], [t1, h1] = KEYS[i], k = (t - t0) / (t1 - t0); return Math.exp(Math.log(h0) + (Math.log(h1) - Math.log(h0)) * k); }
  return KEYS[KEYS.length - 1][1];
}
export const seaRise = (h) => 66 * (1 - Math.exp(-h / 18)) / (1 - Math.exp(-72 / 18));
const GREEN = geoDir(72, -40), ANT = V(0, -1, 0);

export function makeSpace18(tex) {
  const scene = new THREE.Scene();
  const sr = rng(1818), list = [];
  for (let i = 0; i < 12000; i++) {
    const u = sr() * 2 - 1, th = sr() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = V(s * Math.cos(th), u, s * Math.sin(th));
    const m = Math.pow(sr(), 3.0), tp = sr(), I = 0.25 + 2.4 * m * m, c = tp < 0.3 ? [0.72, 0.84, 1] : tp < 0.75 ? [1, 0.97, 0.92] : [1, 0.8, 0.58];
    list.push({ d, px: 1.0 + m * 2.2, r: c[0] * I, g: c[1] * I, b: c[2] * I });
  }
  const stars = new SkyStars(list, { radius: 2800, minPx: 1.6 }); scene.add(stars.points);
  tex.ice.generateMipmaps = true; tex.ice.minFilter = THREE.LinearMipmapLinearFilter; tex.ice.needsUpdate = true;
  const U = { tDay: { value: tex.day }, tNight: { value: tex.night }, tC: { value: tex.clouds }, tIce: { value: tex.ice }, uSun: { value: geoDir(-10.9, -75.2) },
    uMelt: { value: 0 }, uRingG: { value: 0 }, uRingA: { value: 0 }, uPlume: { value: 0 }, uFlood: { value: 0 }, uTime: { value: 0 }, uGreen: { value: GREEN.clone() } };
  const earthMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vUv = uv; vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform sampler2D tDay, tNight, tC, tIce; uniform vec3 uSun, uGreen; uniform float uMelt, uRingG, uRingA, uPlume, uFlood, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      ${VNOISE}
      void main(){
        vec3 n = normalize(vN), v = normalize(vV); float d = dot(n, uSun);
        vec3 day = texture2D(tDay, vUv).rgb, night = texture2D(tNight, vUv).rgb; float cl = texture2D(tC, vUv).r;
        vec4 im = texture2D(tIce, vUv); float low = im.r, ice = im.g;
        float iceB = textureLod(tIce, vUv, 5.0).g, iceB2 = textureLod(tIce, vUv, 7.0).g;       // blurred: inland of the ice, and near it
        float ocean = smoothstep(0.02, -0.05, day.r + day.g * 0.5 - day.b * 1.2) * (1.0 - ice);
        float lit = smoothstep(-0.1, 0.22, d);
        // where the ice was: wet dark rock; inland seas where the bedrock lies below sea level (the middle of Greenland,
        // West Antarctica and its basins)
        float basin = smoothstep(0.86, 0.97, iceB) * smoothstep(0.35, 0.6, fbmv(vP * 5.0) + 0.25 * (iceB - 0.9) * 4.0 + (vP.y < -0.8 && vP.x < 0.1 ? 0.25 : 0.0));
        vec3 rock = vec3(0.07, 0.065, 0.06) * (0.7 + 0.6 * fbmv(vP * 30.0));
        vec3 sea = vec3(0.015, 0.035, 0.06);
        vec3 bare = mix(rock, sea, basin);
        float wet = ice * uMelt;
        vec3 surf = mix(day, bare, wet);
        // meltwater pouring off into the sea: turbid plumes spreading from the old ice margins
        float plume = smoothstep(0.02, 0.5, iceB2) * (1.0 - ice) * ocean * uPlume * (0.55 + 0.45 * fbmv(vP * 12.0 + uTime * 0.02));
        surf = mix(surf, vec3(0.16, 0.2, 0.22), clamp(plume, 0.0, 1.0) * 0.8);
        // the waves: rings racing out from Greenland and from Antarctica
        float rg = acos(clamp(dot(normalize(vP), uGreen), -1.0, 1.0)), xg = (rg - uRingG) / 0.012;
        float ra = acos(clamp(-normalize(vP).y, -1.0, 1.0)), xa = (ra - uRingA) / 0.016;
        float ring = (exp(-xg * xg) * step(0.001, uRingG) + exp(-xa * xa) * step(0.001, uRingA)) * ocean;
        surf = mix(surf, vec3(0.75, 0.78, 0.8), ring * 0.55);
        // the sea rising over the lowlands (the lowest go first)
        float fl = smoothstep(1.0 - uFlood, 1.0 - uFlood + 0.25, low + 0.1 * (fbmv(vP * 40.0) - 0.5)) * step(0.02, low) * (1.0 - ocean);
        surf = mix(surf, vec3(0.1, 0.16, 0.2), fl * 0.95);
        float c = cl * cl * 0.55;
        vec3 col = mix(surf, vec3(0.94), c * 0.8) * (0.015 + max(d, 0.0) * 1.05);
        float spec = pow(max(dot(reflect(-uSun, n), v), 0.0), 60.0) * max(ocean, fl) * (1.0 - c) * 0.5 * step(0.0, d);
        col += vec3(1.0, 0.9, 0.8) * spec;
        col += night * vec3(1.0, 0.75, 0.45) * 1.4 * (1.0 - lit) * (1.0 - c) * (1.0 - fl);
        float mu = max(dot(n, v), 0.0), rim = pow(max(1.0 - mu, 0.0), 4.0);
        col += vec3(0.25, 0.5, 1.0) * max(d + 0.15, 0.0) * rim * 0.8;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 128), earthMat); scene.add(earth);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.02, 128, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, uniforms: { uSun: U.uSun },
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 v = normalize(cameraPosition - vW); float mu = abs(dot(normalize(vN), v)); float a = pow(max(1.0 - mu, 0.0), 6.0) * smoothstep(-0.3, 0.4, dot(normalize(vW), uSun));
        gl_FragColor = vec4(vec3(0.3, 0.55, 1.0) * a * 0.9, 1.0); }`,
  }));
  scene.add(halo);

  // the camera: the North Atlantic (Greenland, Iceland, Europe in the night), south to Antarctica, back north over
  // South America as the seas rise, pulling back
  const VIEW = [[33.0, 58, -32, 3.35], [39.6, 60, -30, 3.3], [43.8, -62, -42, 3.25], [47.0, -8, -52, 3.6], [51.0, -4, -50, 4.3]];
  const viewAt = (t) => { let i = 1; while (i < VIEW.length - 1 && t > VIEW[i][0]) i++; const a = VIEW[i - 1], b = VIEW[i], k = smooth(a[0], b[0], t);
    return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k]; };
  function frame(t, cam, R) {
    const h = hoursAt(t);
    U.uTime.value = t;
    U.uMelt.value = smooth(33.0, 34.6, t);                                          // (the ice is already water; its white goes)
    U.uRingG.value = (9 + 6.3 * h) * Math.PI / 180;                                 // ~700 km/h across deep water
    U.uRingA.value = (22 + 6.3 * Math.max(0, h - 0.0)) * Math.PI / 180;
    U.uPlume.value = smooth(0.1, 8, h);
    U.uFlood.value = seaRise(h) / 66;
    const [lat, lon, dist] = viewAt(t), dir = geoDir(lat, lon);
    cam.position.copy(dir).multiplyScalar(dist); cam.up.set(0, 1, 0); if (Math.abs(dir.y) > 0.8) cam.up.set(0, 0, -1).applyAxisAngle(V(0, 1, 0), THREE.MathUtils.degToRad(lon + 90));
    cam.lookAt(dir.clone().multiplyScalar(0.2)); cam.fov = 30; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    stars.u.uGain.value = 0.9; stars.u.uPR.value = R.SSAA;
    R.renderer.toneMappingExposure = 1.15; R.bloom.strength = 0.4; R.bloom.radius = 0.6; R.bloom.threshold = 0.9;
  }
  const fmtH = (h) => (h < 1 ? `${Math.round(h * 60)} min` : h < 24 ? `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} min` : `${Math.floor(h / 24)} d ${Math.floor(h % 24)} h`);
  function hud(t, a, k) {
    const h = hoursAt(t), sl = seaRise(h);
    const sub2 = t < 36.7 ? 'Greenland: 2.9 million km³ of ice' : t < 40.5 ? 'Tallest wave ever recorded: 524 m' : t < 44.3 ? 'Antarctica: 26.5 million km³ of ice' : 'Under water: London · New York · Shanghai';
    return { a, k, lab: 'Since the melt', val: fmtH(h), sub: `Sea level: +${sl.toFixed(1)} m`, sub2 };
  }
  return { scene, U, frame, hud, earth };
}
