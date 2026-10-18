// London at the blue hour in the rain for post 9 (What if air became as thick as honey for 5 seconds?). Local frame:
// x east, z south, y up, Tower Bridge's centre at the origin, high water at y = 0, the road deck at y = 9, the streets on
// the banks at y = 6. Tower Bridge (two granite-and-Portland-stone towers, the high-level walkways, the blue-and-white
// suspension chains, the shore towers), the Thames as a mirror broken by rain rings (the rings stop being born when the
// air turns thick and the ones already there run out), the embankments, the riverside warehouses, the Tower of London,
// the City's towers and the Shard in the rain haze, a low overcast sky lit orange from below, and London's lights for the
// aerial shots. Everything that moves is a function of the story clock passed in each frame.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { rng } from './core.js';
import { SIMPLEX } from './fx.js';

export const LB = {
  DECK: 9.0, ROAD: 6.0, PAVE: 8.8, PARA: 9.15, TZ: 40.5, THZ: 10, THX: 13.5, WALK_Y: 42.5, SHORE: 132.5, BANK: 125, STREET: 6.0,
  U: { uTime: { value: 0 }, uFlood: { value: 1 }, uWet: { value: 1 }, uFogC: { value: new THREE.Color('#2a3140') }, uFogD: { value: 0.0022 } },
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// the Thames's centreline (metres, local frame) and its width: straight at the bridge, bending east toward the Isle of
// Dogs and west toward Westminster (rough real shape, enough for the aerial shots)
const THAMES = [[-5200, 900], [-4200, 700], [-3200, 150], [-2300, -280], [-1500, -260], [-800, -80], [0, 0], [700, 40], [1400, 300], [2100, 640],
  [2800, 720], [3400, 420], [3900, -40], [4500, -120], [5100, 300], [5400, 1300], [5200, 2300], [4600, 2700], [3900, 2500], [3500, 1900]];
export function riverEdges(width = 250) {
  const pts = THAMES.map(([x, z]) => new THREE.Vector2(x, z)), L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], d = b.clone().sub(a).normalize(), n = new THREE.Vector2(-d.y, d.x);
    const w = (i === 6 ? 250 : width + 30 * Math.sin(i * 1.7)) / 2;
    L.push(pts[i].clone().addScaledVector(n, -w)); R.push(pts[i].clone().addScaledVector(n, w));
  }
  return { L, R, poly: [...L, ...R.slice().reverse()] };
}
export function inRiver(x, z, edges) {          // point-in-polygon on the river outline
  const p = edges.poly; let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) if (((p[i].y > z) !== (p[j].y > z)) && (x < (p[j].x - p[i].x) * (z - p[i].y) / (p[j].y - p[i].y) + p[i].x)) c = !c;
  return c;
}

// ---------------- materials ----------------
// ashlar stone: courses and blocks in world space (fwidth-clamped mortar), per-block tone, wet darkening; floodlit from
// below (uFlood: warm light on the faces fading with height above `floodY`)
export function stoneMat({ color = '#b9ad98', floodY = 9, floodCol = '#ffd9a6', flood = 1.0, course = 0.62, block = 1.25, rough = 0.62 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uFlood = LB.U.uFlood; s.uniforms.uWet = LB.U.uWet; s.uniforms.uFloodCol = { value: new THREE.Color(floodCol).multiplyScalar(flood) }; s.uniforms.uFloodY = { value: floodY };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec3 vWN; uniform float uFlood, uWet, uFloodY; uniform vec3 uFloodCol;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 an = abs(vWN); float hor = an.x > an.z ? vWP.z : vWP.x;            // along the face
      float cy = vWP.y / ${course.toFixed(3)}, row = floor(cy);
      float cx = hor / ${block.toFixed(3)} + 0.5 * mod(row, 2.0), col = floor(cx);
      vec2 f = vec2(fract(cx), fract(cy)), fw = fwidth(vec2(cx, cy)) + 1e-4;
      vec2 mortarW = vec2(0.035 / ${block.toFixed(3)}, 0.05 / ${course.toFixed(3)});
      vec2 m2 = smoothstep(mortarW - fw, mortarW + fw, f) * smoothstep(mortarW - fw, mortarW + fw, 1.0 - f);
      float mortar = 1.0 - m2.x * m2.y; mortar *= 1.0 - smoothstep(0.25, 0.6, max(fw.x, fw.y));   // fades out when finer than a pixel
      float tone = 0.86 + 0.24 * hs(vec2(col, row)) * (1.0 - smoothstep(0.3, 0.8, max(fw.x, fw.y)));
      diffuseColor.rgb *= tone * (1.0 - 0.32 * mortar) * (1.0 - 0.28 * uWet);
      float upFace = smoothstep(0.6, 0.9, vWN.y);
      diffuseColor.rgb *= 1.0 - 0.15 * upFace * uWet;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.28, uWet * (0.35 + 0.5 * smoothstep(0.6, 0.9, vWN.y)));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float hh = max(vWP.y - uFloodY, 0.0);
      float side = 1.0 - smoothstep(0.6, 0.95, abs(vWN.y));
      totalEmissiveRadiance += diffuseColor.rgb * uFloodCol * uFlood * side * (0.1 + 0.35 * exp(-hh / 6.0) + 0.2 * exp(-hh / 35.0));`);
  };
  m.customProgramCacheKey = () => 'stone_' + course + '_' + block + '_' + floodY + flood;
  return m;
}
// painted steel (the bridge's blue)
const paint = (c, r = 0.45) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.35 });
// office/warehouse façades: a window grid in world space, a share of the windows lit (warm or cool), fading to the
// average glow when the grid gets finer than a pixel
export function windowMat({ base = '#3b4048', lit = 0.45, floorH = 3.6, bayW = 1.6, warm = 0.6, glass = 0.55, seed = 1, gain = 1.6 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: base, roughness: 0.55, metalness: 0.1 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uWet = LB.U.uWet;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec3 vWN; uniform float uWet;
      float hs2(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7)) + ${seed.toFixed(2)}) * 43758.5453); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      vec3 an = abs(vWN); float wall = 1.0 - smoothstep(0.5, 0.8, an.y);
      float hor = an.x > an.z ? vWP.z : vWP.x;
      vec2 g = vec2(hor / ${bayW.toFixed(2)}, (vWP.y - 0.8) / ${floorH.toFixed(2)}); vec2 c = floor(g), f = fract(g), fw = fwidth(g) + 1e-4;
      vec2 win = smoothstep(vec2(0.12, 0.22) - fw, vec2(0.12, 0.22) + fw, f) * smoothstep(vec2(0.12, 0.2) - fw, vec2(0.12, 0.2) + fw, 1.0 - f);
      float wm = win.x * win.y;
      float on = step(1.0 - ${lit.toFixed(2)}, hs2(vec3(c, floor(vWP.x * 0.013 + vWP.z * 0.017))));
      vec3 wc = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.78, 0.5), step(1.0 - ${warm.toFixed(2)}, hs2(vec3(c.yx, 3.0))));
      float lvl = 0.6 + 0.8 * hs2(vec3(c, 7.0));
      float far = smoothstep(0.12, 0.4, max(fw.x, fw.y));                       // windows under ~8 px: their average (no shimmer)
      vec3 e = mix(wm * on * lvl * wc, vec3(0.55, 0.62, 0.68) * ${lit.toFixed(2)} * 0.3 * lvl, far);
      totalEmissiveRadiance += e * wall * ${gain.toFixed(2)};
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.035, 0.04), wm * ${glass.toFixed(2)} * wall * (1.0 - far));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.25, uWet * 0.5);`);
  };
  m.customProgramCacheKey = () => 'win_' + seed + '_' + lit + '_' + floorH + '_' + bayW + '_' + base;
  return m;
}
// wet asphalt / paving: puddles (world-space noise), very low roughness in them; lane markings for the road
export function wetGroundMat({ color = '#2a2b2e', lanes = false, slabs = false, glow = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uWet = LB.U.uWet;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      ${SIMPLEX}
      varying vec3 vWP; uniform float uWet;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 fwp = fwidth(vWP.xz) + 1e-4;
      float pud = smoothstep(0.05, 0.35, fbm3(vec3(vWP.xz * 0.35, 1.7), 3) + 0.15) * uWet;
      float grit = 1.0 + 0.12 * (fbm3(vec3(vWP.xz * 6.0, 0.3), 2)) * (1.0 - smoothstep(0.05, 0.2, max(fwp.x, fwp.y)));
      diffuseColor.rgb *= grit * (1.0 - 0.35 * uWet) * (1.0 - 0.25 * pud);
      ${lanes ? `float lx = abs(vWP.x);
        float dash = step(0.5, fract(vWP.z / 6.0));
        float lw = 0.075; float aa = fwp.x;
        float centre = 1.0 - smoothstep(lw - aa, lw + aa, abs(lx - 0.0));          // double centre line (two lines 0.25 apart)
        float c2 = 1.0 - smoothstep(lw - aa, lw + aa, abs(lx - 0.18));
        float lane = (1.0 - smoothstep(0.06 - aa, 0.06 + aa, abs(lx - 3.0))) * dash;
        float edge = 1.0 - smoothstep(0.08 - aa, 0.08 + aa, abs(lx - 5.65));
        float mark = clamp(c2 + lane + edge, 0.0, 1.0) * (1.0 - smoothstep(0.08, 0.25, fwp.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.6, 0.52), mark * 0.85);` : ''}
      ${slabs ? `vec2 sg = vWP.xz / vec2(0.9, 0.6); vec2 sf = fract(sg); vec2 sw = fwidth(sg) + 1e-4;
        vec2 jl = smoothstep(0.03 - sw, 0.03 + sw, sf) * smoothstep(0.03 - sw, 0.03 + sw, 1.0 - sf);
        float joint = (1.0 - jl.x * jl.y) * (1.0 - smoothstep(0.2, 0.5, max(sw.x, sw.y)));
        diffuseColor.rgb *= 1.0 - 0.3 * joint;` : ''}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, mix(0.32, 0.06, pud), uWet);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      ${glow ? `// seen from the sky, the streets are lines of orange light (only when a pixel covers metres of ground)
        float pxm = max(fwp.x, fwp.y), farK = smoothstep(0.1, 0.35, pxm);       // (also right at 2x supersampling)
        float ang = 0.9 * fbm3(vec3(vWP.xz * 0.00045, 1.3), 2);
        vec2 rp = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * vWP.xz + 37.0 * vec2(fbm3(vec3(vWP.xz * 0.004, 2.1), 2), fbm3(vec3(vWP.xz * 0.004, 5.3), 2));
        vec2 gq = rp / vec2(96.0, 83.0); vec2 gf = abs(fract(gq) - 0.5) * 2.0; vec2 gw = fwidth(gq) * 2.0;
        float wl = 0.035; vec2 rd = smoothstep(1.0 - wl - gw, 1.0 - wl + gw, gf);
        rd *= step(-0.25, vec2(fbm3(vec3(floor(gq.y) * 1.7, gq.x * 0.4, 0.0), 2), fbm3(vec3(floor(gq.x) * 1.3, gq.y * 0.4, 3.0), 2)));   // unlit stretches
        vec2 gq2 = rp / vec2(29.0, 25.0); vec2 gf2 = abs(fract(gq2) - 0.5) * 2.0; vec2 gw2 = fwidth(gq2) * 2.0;
        vec2 rd2 = smoothstep(1.0 - 0.08 - gw2, 1.0 - 0.08 + gw2, gf2);
        vec2 gq3 = rp / vec2(610.0, 540.0); vec2 gf3 = abs(fract(gq3) - 0.5) * 2.0; vec2 gw3 = fwidth(gq3) * 2.0;
        vec2 rd3 = smoothstep(1.0 - 0.012 - gw3, 1.0 - 0.012 + gw3, gf3);                                            // main roads
        float dist = 0.45 + 0.7 * fbm3(vec3(vWP.xz * 0.0011, 4.0), 3);
        float lights = (max(rd.x, rd.y) * 0.8 + 0.28 * max(rd2.x, rd2.y) * smoothstep(-0.1, 0.4, fbm3(vec3(gq2 * 0.3, 7.0), 2)) + 1.4 * max(rd3.x, rd3.y)) * dist;
        totalEmissiveRadiance += vec3(1.0, 0.6, 0.3) * lights * 0.9 * farK + vec3(0.04, 0.03, 0.022) * farK;` : ''}`);
  };
  m.customProgramCacheKey = () => 'wet_' + lanes + slabs + glow + color;
  return m;
}

// ---------------- the sky: a low overcast, dark blue-grey overhead, lit orange-grey toward the horizon by the city ----------------
export function makeRainSky() {
  const U = { uZen: { value: new THREE.Color('#0a101c') }, uHor: { value: new THREE.Color('#3f4558') }, uMid: { value: new THREE.Color('#1d2436') }, uTime: { value: 0 }, uGain: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `${SIMPLEX}
      uniform vec3 uZen, uHor, uMid; uniform float uTime, uGain; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD); float el = d.y;
        vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.18, el)); c = mix(c, uZen, smoothstep(0.15, 0.75, el));
        // the cloud deck: soft lumps, their undersides lit orange by the city, darker gaps
        vec2 uv = d.xz / max(el + 0.12, 0.06);
        float n = fbm3(vec3(uv * 0.55, uTime * 0.01), 5), n2 = fbm3(vec3(uv * 1.6 + 3.1, 0.5), 3);
        float lump = smoothstep(-0.3, 0.6, n + 0.25 * n2);
        c *= 0.78 + 0.42 * lump;
        c += vec3(0.16, 0.09, 0.05) * lump * (1.0 - smoothstep(0.0, 0.5, el));
        c = mix(c, uHor * 0.85, 1.0 - smoothstep(-0.02, 0.08, el));                 // haze at the horizon
        gl_FragColor = vec4(c * uGain, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), mat); mesh.frustumCulled = false; mesh.renderOrder = -10;
  return { mesh, U };
}

// ---------------- the Thames: a reflector with rain rings ----------------
// uniforms: uT (story clock, s), uTf (when the air turns thick: rings stop being born), uTb (it thins again: rings return)
export function makeThames(renderer, { res = 1024, ssaa = 2 } = {}) {
  const edges = riverEdges();
  const shape = new THREE.Shape(edges.poly.map((p) => new THREE.Vector2(p.x, -p.y)));
  const geo = new THREE.ShapeGeometry(shape, 1);
  const shader = {
    name: 'ThamesShader',
    uniforms: {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      uT: { value: 0 }, uTf: { value: 0 }, uTb: { value: 5 }, uFogC: { value: new THREE.Color('#2a3140') }, uFogD: { value: 0.0022 },
      uDeep: { value: new THREE.Color('#06090c') }, uSky: { value: new THREE.Color('#1f2533') }, uRainK: { value: 1 }, uRefl: { value: 1 },
    },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${SIMPLEX}
      uniform sampler2D tDiffuse; uniform vec3 color, uFogC, uDeep, uSky; uniform float uT, uTf, uTb, uFogD, uRainK, uRefl;
      varying vec4 vUv; varying vec3 vW;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      // one layer of rain rings on a grid of cells: each cell drops a ring every P seconds; rings born after uTf (until uTb)
      // never exist, the ones already born keep spreading and fade
      vec2 rings(vec2 p, float sc, float t){
        vec2 g = p / sc, c = floor(g), f = fract(g) - 0.5; vec2 acc = vec2(0.0);
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 cc = c + vec2(i, j); float h = hs(cc), P = 0.55 + 0.6 * hs(cc + 7.1);
          vec2 o = vec2(hs(cc + 3.3), hs(cc + 5.7)) - 0.5; vec2 dv = (g - cc - 0.5) - o * 0.8;
          float tb = floor((t + h * P) / P) * P - h * P;                            // this cell's latest birth
          if (tb > uTf && tb < uTb) tb = uTf - mod(uTf - (tb - P * ceil((tb - uTf) / P)), P) ;   // the last ring born before uTf
          if (tb > uTf && tb < uTb) continue;
          float age = t - tb; if (age < 0.0 || age > 1.6) continue;
          float r = age * 0.55 / sc * 1.0, d = length(dv) * 1.0;
          float w = 0.06 / sc + 0.02;
          float x = (d - r) / w; float a = exp(-x * x) * exp(-age * 2.6) * (0.3 + 0.7 * hs(cc + 9.0));
          acc += normalize(dv + 1e-4) * a * cos(x * 2.4);
        }
        return acc;
      }
      void main(){
        vec2 fw = fwidth(vW.xz); float px = max(fw.x, fw.y);
        float t = uT;
        vec2 n = vec2(0.0);
        // slow river chop
        n += vec2(fbm3(vec3(vW.xz * 0.05, t * 0.05), 3), fbm3(vec3(vW.zx * 0.05 + 4.0, t * 0.05), 3)) * 0.06;
        n += vec2(fbm3(vec3(vW.xz * 0.4, t * 0.15), 2), fbm3(vec3(vW.zx * 0.4 + 9.0, t * 0.15), 2)) * 0.03 * (1.0 - smoothstep(0.2, 1.2, px));
        // rain rings, faded out where they get finer than a pixel
        n += rings(vW.xz, 0.9, t) * 0.22 * uRainK * (1.0 - smoothstep(0.08, 0.35, px));
        n += rings(vW.xz + 11.0, 2.3, t) * 0.12 * uRainK * (1.0 - smoothstep(0.2, 0.8, px));
        vec3 V = normalize(cameraPosition - vW);
        float mu = clamp(V.y, 0.0, 1.0), fres = 0.02 + 0.98 * pow(1.0 - mu, 5.0);
        vec2 uv = vUv.xy / vUv.w + n * vec2(0.6, 0.25) * 0.35;
        vec3 refl = texture2D(tDiffuse, uv).rgb;
        vec3 c = mix(uDeep, refl * uRefl, clamp(0.35 + 0.65 * fres, 0.0, 1.0));
        float fd = 1.0 - exp(-uFogD * length(cameraPosition - vW));
        c = mix(c, uFogC, fd);
        gl_FragColor = vec4(c, 1.0);
      }`,
  };
  const w = Math.round(1080 * ssaa / 2), h = Math.round(1920 * ssaa / 2);
  const river = new Reflector(geo, { textureWidth: Math.min(res * 2, w), textureHeight: Math.min(res * 4, h), clipBias: 0.02, shader, multisample: 0 });
  river.rotation.x = -Math.PI / 2; river.position.y = 0;
  river.camera.layers.set(0);                       // the reflection skips the rain (layer 1)
  return { mesh: river, U: river.material.uniforms, edges };
}

// ---------------- the banks: the street level with the river cut out, embankment walls, quays ----------------
export function makeBanks(edges) {
  const g = new THREE.Group();
  const sh = new THREE.Shape([new THREE.Vector2(-9000, 9000), new THREE.Vector2(9000, 9000), new THREE.Vector2(9000, -9000), new THREE.Vector2(-9000, -9000)]);
  sh.holes.push(new THREE.Path(edges.poly.map((p) => new THREE.Vector2(p.x, -p.y))));
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(sh, 1).rotateX(-Math.PI / 2), wetGroundMat({ color: '#2b2c30', slabs: true, glow: true }));
  ground.position.y = LB.STREET; ground.receiveShadow = true; g.add(ground);
  // the embankment walls (granite, dark and wet near the water)
  const wallM = stoneMat({ color: '#6d6a64', floodY: -10, flood: 0.0, course: 0.55, block: 1.1 });
  for (const side of [edges.L, edges.R]) {
    const pos = [], idx = [];
    // (down to -6: the river drains in the meme ending)
    side.forEach((p, i) => { pos.push(p.x, -6, p.y, p.x, LB.STREET, p.y); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx); gg.computeVertexNormals();
    const m = new THREE.Mesh(gg, wallM); m.material.side = THREE.DoubleSide; g.add(m);
  }
  return g;
}

// ---------------- Tower Bridge ----------------
// a tower front with a pointed (Gothic) arch notched out of its base: x in [-hx, hx], y in [0, h]; the arch is hw wide
// each side, springs at y0 and rises `rise` more to its apex (two circular arcs centred on the springing line)
function towerFront(hx, h, hw, y0, rise, n = 12) {
  const s = new THREE.Shape(), R = (hw * hw + rise * rise) / (2 * hw), cL = -hw + R;
  s.moveTo(-hx, 0); s.lineTo(-hw, 0); s.lineTo(-hw, y0);
  for (let i = 1; i <= n; i++) { const x = -hw + (i / n) * hw; s.lineTo(x, y0 + Math.sqrt(Math.max(0, R * R - (x - cL) * (x - cL)))); }
  for (let i = n - 1; i >= 0; i--) { const x = hw - (i / n) * hw; s.lineTo(x, y0 + Math.sqrt(Math.max(0, R * R - (x + cL) * (x + cL)))); }
  s.lineTo(hw, 0); s.lineTo(hx, 0); s.lineTo(hx, h); s.lineTo(-hx, h); s.lineTo(-hx, 0);
  return s;
}
function prism(r, h, sides = 8) { return new THREE.CylinderGeometry(r, r, h, sides, 1); }
function spire(r, h, sides = 8) { return new THREE.ConeGeometry(r, h, sides, 1); }

export function makeTowerBridge() {
  const g = new THREE.Group(), D = LB.DECK;
  const stone = stoneMat({ color: '#b8ae9c', floodY: D, flood: 1.0 });
  const stoneDark = stoneMat({ color: '#8f877a', floodY: 0, flood: 0.55, course: 0.7, block: 1.5 });   // the piers, granite
  const roofM = new THREE.MeshStandardMaterial({ color: '#4a5258', roughness: 0.4, metalness: 0.5 });  // slate/lead roofs, wet
  const gold = new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.3, metalness: 1.0 });
  const blue = paint('#7fa9cf', 0.42), white = paint('#e8ecef', 0.4), dkblue = paint('#2e4a66', 0.5);
  blue.emissive = new THREE.Color('#5d86b8'); blue.emissiveIntensity = 0.55; white.emissive = new THREE.Color('#c8d6e8'); white.emissiveIntensity = 0.35;   // the LED wash
  const glassM = new THREE.MeshStandardMaterial({ color: '#0b1016', roughness: 0.08, metalness: 0.2 });
  const lampGlass = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd49a').multiplyScalar(3.2) });
  const ledM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bcd6ff').multiplyScalar(1.3) });
  const lamps = [], winLit = [];
  // the road deck and pavements, shore to shore (the river is 250 m wide here; the approaches continue onto the banks)
  const road = new THREE.Mesh(new THREE.BoxGeometry(2 * LB.ROAD, 0.6, 2 * LB.SHORE + 60), wetGroundMat({ color: '#25262a', lanes: true }));
  road.position.set(0, D - 0.3, 0); road.receiveShadow = true; g.add(road);
  for (const s of [-1, 1]) {
    const pv = new THREE.Mesh(new THREE.BoxGeometry(LB.PAVE - LB.ROAD, 0.75, 2 * LB.SHORE + 60), wetGroundMat({ color: '#4a4945', slabs: true }));
    pv.position.set(s * (LB.ROAD + LB.PAVE) / 2, D - 0.225, 0); pv.receiveShadow = true; g.add(pv);
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 2 * LB.SHORE + 60), stoneMat({ color: '#77746e', floodY: -10, flood: 0 }));
    kerb.position.set(s * (LB.ROAD + 0.15), D + 0.065, 0); g.add(kerb);
    // the parapet: a painted steel girder with a Gothic arcade in relief (solid: no thin bars to shimmer from afar)
    const par = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.15, 2 * LB.SHORE + 60), arcadeMat('#5f86a8'));
    par.position.set(s * (LB.PARA + 0.17), D + 0.575, 0); par.castShadow = true; g.add(par);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 2 * LB.SHORE + 60), white); cap.position.set(s * (LB.PARA + 0.17), D + 1.17, 0); g.add(cap);
    // the deck's edge girder below the parapet (outside face)
    const eg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 2 * LB.SHORE), dkblue); eg.position.set(s * (LB.PARA + 0.5), D - 0.9, 0); g.add(eg);
    // lamp standards every 15 m on the parapets (the cast-iron lanterns)
    for (let z = -LB.SHORE - 17.5; z <= LB.SHORE + 25; z += 15) {
      if (Math.abs(Math.abs(z) - LB.TZ) < LB.THZ + 1) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 3.6, 8), paint('#1f2a2e', 0.5)); post.position.set(s * (LB.PARA + 0.17), D + 1.2 + 1.8, z); g.add(post);
      const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.55, 6), lampGlass); lan.position.set(s * (LB.PARA + 0.17), D + 1.2 + 3.85, z); g.add(lan);
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.3, 6), paint('#1f2a2e', 0.5)); top.position.set(s * (LB.PARA + 0.17), D + 1.2 + 4.27, z); g.add(top);
      lamps.push(V(s * (LB.PARA + 0.17), D + 5.05, z));
    }
  }
  // the bascule seam and the central span's deck girders
  // ---- the two main towers ----
  for (const sz of [-1, 1]) {
    const zc = sz * LB.TZ, T = new THREE.Group(); T.position.set(0, 0, zc); g.add(T);
    // the pier (granite, cutwaters up and down stream)
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2 * LB.THX + 6, D + 6, 2 * LB.THZ + 8), stoneDark); pier.position.y = (D + 6) / 2 - 6; T.add(pier);
    for (const sx of [-1, 1]) { const cw = new THREE.Mesh(new THREE.CylinderGeometry(LB.THZ + 4, LB.THZ + 4, D + 0.5, 3, 1), stoneDark); cw.rotation.y = sx > 0 ? 0 : Math.PI; cw.position.set(sx * (LB.THX + 3 + 4), (D + 0.5) / 2 - 0.5, 0); cw.scale.set(0.9, 1, 1); T.add(cw); }
    // the tower body with the road arch: a front shape extruded through the tower (z)
    const H0 = D, H1 = 50;
    const sh = towerFront(LB.THX, H1 - H0, LB.PARA + 0.1, 4.5, 10.0);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 2 * LB.THZ, bevelEnabled: false, curveSegments: 4 }), stone);
    body.position.set(0, H0, -LB.THZ); body.castShadow = true; body.receiveShadow = true; T.add(body);
    // string courses (thin projecting bands) and a crenellated parapet at the top
    for (const yy of [H0 + 15, H0 + 28, H1 - 0.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2 * LB.THX + 0.5, 0.5, 2 * LB.THZ + 0.5), stone); b.position.y = yy; T.add(b); }
    // the four corner turrets: octagonal, taller than the body, with lead spires and gilded finials
    for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const tx = cx * (LB.THX - 0.4), tz = cz * (LB.THZ - 0.4);
      const tur = new THREE.Mesh(prism(2.6, H1 + 8 - H0, 8), stone); tur.position.set(tx, (H0 + H1 + 8) / 2, tz); tur.castShadow = true; T.add(tur);
      const sp = new THREE.Mesh(spire(2.9, 7.5, 8), roofM); sp.position.set(tx, H1 + 8 + 3.75, tz); T.add(sp);
      const fi = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), gold); fi.position.set(tx, H1 + 8 + 7.8, tz); T.add(fi);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), gold); rod.position.set(tx, H1 + 8 + 8.6, tz); T.add(rod);
      // turret windows (lancets) on the outward faces
      for (let k = 0; k < 4; k++) { const w = lancet(0.5, 2.2); w.position.set(tx + cx * 2.45, H0 + 18 + k * 8, tz + cz * 0.2); w.rotation.y = cx > 0 ? Math.PI / 2 : -Math.PI / 2; T.add(w); winLit.push(w); }
    }
    // the main roof: a steep pyramid with a small lantern spire
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(LB.THX - 2.5, LB.THZ - 2.5), 9, 4, 1), roofM); roof.rotation.y = Math.PI / 4; roof.scale.set((LB.THX - 2.5) / Math.hypot(LB.THX - 2.5, LB.THZ - 2.5) * 1.41, 1, (LB.THZ - 2.5) / Math.hypot(LB.THX - 2.5, LB.THZ - 2.5) * 1.41); roof.position.y = H1 + 4.5; T.add(roof);
    const lantern = new THREE.Mesh(prism(1.2, 3, 8), stone); lantern.position.y = H1 + 9.5; T.add(lantern);
    const lsp = new THREE.Mesh(spire(1.4, 5, 8), roofM); lsp.position.y = H1 + 13.5; T.add(lsp);
    const lfi = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), gold); lfi.position.y = H1 + 16.2; T.add(lfi);
    // Gothic windows on the faces (two tiers above the arch, a row higher up on the river faces)
    for (const fz of [-1, 1]) for (let k = -2; k <= 2; k++) for (const yy of [H0 + 17, H0 + 23.5, H0 + 31.5]) {
      if (Math.abs(k) === 2 && yy > H0 + 30) continue;
      const w = lancet(0.75, yy > H0 + 30 ? 4.2 : 3.2); w.position.set(k * 3.6, yy, fz * (LB.THZ + 0.02)); w.rotation.y = fz > 0 ? 0 : Math.PI; T.add(w); winLit.push(w);
    }
    for (const fx of [-1, 1]) for (let k = -1; k <= 1; k++) for (const yy of [H0 + 17, H0 + 24, H0 + 33]) {
      const w = lancet(0.75, 3.4); w.position.set(fx * (LB.THX + 0.02), yy, k * 4.4); w.rotation.y = fx > 0 ? Math.PI / 2 : -Math.PI / 2; T.add(w); winLit.push(w);
    }
  }
  // ---- the high-level walkways: two glazed lattice girders between the towers at 42.5 m ----
  const span = 2 * (LB.TZ - LB.THZ);
  for (const sx of [-1, 1]) {
    const W = new THREE.Group(); W.position.set(sx * 7.6, LB.WALK_Y, 0); g.add(W);
    const chordM = blue;
    for (const yy of [0, 3.6]) for (const xx of [-1.8, 1.8]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, span), chordM); c.position.set(xx, yy, 0); W.add(c); }
    const n = 16, dz = span / n;
    for (let i = 0; i < n; i++) for (const xx of [-1.8, 1.8]) {
      const z0 = -span / 2 + i * dz;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 0.35), white); post.position.set(xx, 1.8, z0); W.add(post);
      const len = Math.hypot(dz, 3.6), d1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, len, 0.22), chordM); d1.position.set(xx, 1.8, z0 + dz / 2); d1.rotation.x = (i % 2 ? 1 : -1) * Math.atan2(dz, 3.6); W.add(d1);
    }
    const floor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, span), dkblue); floor.position.y = -0.1; W.add(floor);
    const roofW = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.25, span), dkblue); roofW.position.y = 3.8; W.add(roofW);
    for (const xx of [-1.75, 1.75]) { const gl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.0, span), glassM); gl.position.set(xx, 1.8, 0); W.add(gl); }
    // the LED strips along the walkways (the bridge's night lighting)
    for (const yy of [-0.35, 3.95]) for (const xx of [-1.9, 1.9]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, span), ledM); l.position.set(xx, yy, 0); W.add(l); }
  }
  // ---- the suspension chains of the side spans: from the main towers (high) to the shore towers (low) ----
  const shoreTop = 24;
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, z = sz * (LB.TZ + LB.THZ + u * (LB.SHORE - LB.TZ - LB.THZ)); const y = THREE.MathUtils.lerp(38, 15, u) - 9 * Math.sin(Math.PI * u) * 0.9; pts.push(V(sx * (LB.PARA + 0.6), y, z)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const ch = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.85, 4, false), blue); g.add(ch);
    // hangers down to the deck every 5.5 m
    for (let i = 1; i < 15; i++) { const u = i / 15, p = curve.getPoint(u), hgt = p.y - (D + 1.2);
      if (hgt < 1) continue; const h = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, hgt, 6), white); h.position.set(p.x, D + 1.2 + hgt / 2, p.z); g.add(h); }
    // the lattice inside the chain girder: a light upper chord
    const up = curve.getPoints(40).map((p) => p.clone().add(V(0, 1.6, 0)));
    const uc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(up), 40, 0.35, 4, false), blue); g.add(uc);
    for (let i = 0; i < 40; i += 2) { const a = curve.getPoint(i / 40), b = up[i]; const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, a.distanceTo(b), 4), white); m.position.copy(a).add(b).multiplyScalar(0.5); g.add(m); }
  }
  // ---- the shore towers (abutments) ----
  for (const sz of [-1, 1]) {
    const zc = sz * LB.SHORE;
    const base = new THREE.Mesh(new THREE.ExtrudeGeometry(towerFront(LB.THX - 2, shoreTop - LB.STREET, LB.PARA + 0.1, (D - LB.STREET) + 1.5, 9.4), { depth: 12, bevelEnabled: false, curveSegments: 4 }), stone);
    base.position.set(0, LB.STREET, zc - 6); g.add(base);
    for (const sx of [-1, 1]) { const t = new THREE.Mesh(prism(1.8, shoreTop + 5 - LB.STREET, 8), stone); t.position.set(sx * (LB.THX - 2.5), (shoreTop + 5 + LB.STREET) / 2, zc); g.add(t);
      const s = new THREE.Mesh(spire(2.0, 4, 8), roofM); s.position.set(sx * (LB.THX - 2.5), shoreTop + 7, zc); g.add(s); }
  }
  return { group: g, lamps, winLit };
}
// a lancet window: dark glass in a pointed arch, a stone frame proud of the wall (some lit from inside)
const lancetGeo = new Map();
function lancet(hw, h) {
  const key = hw + '_' + h; let geo = lancetGeo.get(key);
  if (!geo) { const s = new THREE.Shape(); s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, h - hw * 1.2);
    s.quadraticCurveTo(hw, h - hw * 0.2, 0, h); s.quadraticCurveTo(-hw, h - hw * 0.2, -hw, h - hw * 1.2); s.lineTo(-hw, 0);
    geo = new THREE.ShapeGeometry(s, 6); geo.translate(0, -h / 2, 0.04); lancetGeo.set(key, geo); }
  return new THREE.Mesh(geo, lancetMat);
}
const lancetMat = new THREE.MeshStandardMaterial({ color: '#0a0d12', roughness: 0.55, metalness: 0.1, emissive: new THREE.Color('#ffb46a'), emissiveIntensity: 0.0 });
export function setTowerWindows(k) { lancetMat.emissiveIntensity = k; }
// the parapet's arcade: painted steel with a Gothic blind arcade in shading (normals bent at the arch edges)
function arcadeMat(c) {
  const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.4 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP2;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP2 = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP2;').replace('#include <color_fragment>', `#include <color_fragment>
      float u = fract(vWP2.z / 0.9), v = clamp((vWP2.y - ${(LB.DECK + 0.12).toFixed(2)}) / 0.9, 0.0, 1.2);
      float fw = fwidth(vWP2.z / 0.9) + 1e-4;
      float ax = abs(u - 0.5) * 2.0, archTop = 0.62 + 0.38 * sqrt(max(0.0, 1.0 - ax * ax));
      float inside = smoothstep(0.82 + fw, 0.82 - fw, ax) * smoothstep(archTop + 0.04, archTop - 0.04, v) * step(0.08, v);
      inside *= 1.0 - smoothstep(0.15, 0.4, fw);
      diffuseColor.rgb *= 1.0 - 0.45 * inside;`);
  };
  m.customProgramCacheKey = () => 'arcade_' + c;
  return m;
}

// ---------------- the riverside and the skyline ----------------
// boxes with window façades: [x, z, w, d, h, kind] (kind: 'brick' warehouse, 'office', 'glass' tower)
export function makeRiverside() {
  const g = new THREE.Group(), r = rng(915);
  const mats = {
    brick: windowMat({ base: '#5a3b2e', lit: 0.38, floorH: 3.3, bayW: 1.8, warm: 0.85, glass: 0.7, seed: 3, gain: 0.8 }),
    office: windowMat({ base: '#4a4f57', lit: 0.5, floorH: 3.8, bayW: 1.5, warm: 0.35, glass: 0.75, seed: 5, gain: 1.0 }),
    glass: windowMat({ base: '#1e2a36', lit: 0.55, floorH: 4.0, bayW: 1.5, warm: 0.25, glass: 0.4, seed: 7, gain: 1.1 }),
    stone: windowMat({ base: '#8d877c', lit: 0.35, floorH: 3.8, bayW: 1.9, warm: 0.7, glass: 0.75, seed: 9, gain: 0.8 }),
  };
  const roofM = new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.6 });
  const add = (x, z, w, d, h, kind, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mats[kind], mats[kind], roofM, roofM, mats[kind], mats[kind]]);
    m.position.set(x, LB.STREET + h / 2, z); m.rotation.y = ry; m.castShadow = false; m.receiveShadow = true; g.add(m); return m;
  };
  // south bank east of the bridge: Butler's Wharf's brick warehouses along Shad Thames
  for (let x = 30, i = 0; x < 600; i++) { const w = 26 + r() * 30; add(x + w / 2, LB.BANK + 14 + r() * 6, w, 22 + r() * 8, 18 + r() * 10, 'brick'); x += w + 3 + r() * 5; }
  // south bank west: offices of More London, the old City Hall's rounded glass
  for (let x = -40, i = 0; x > -620; i++) { const w = 30 + r() * 25; add(x - w / 2, LB.BANK + 22 + r() * 20, w, 26 + r() * 14, 28 + r() * 22, i % 3 === 0 ? 'glass' : 'office'); x -= w + 10 + r() * 14; }
  { const ch = new THREE.Mesh(new THREE.SphereGeometry(22, 24, 16), mats.glass); ch.scale.set(1, 1.1, 0.85); ch.position.set(-95, LB.STREET + 22, LB.BANK + 30); ch.rotation.z = 0.25; g.add(ch); }
  // north bank east: St Katharine Docks (warehouses and a hotel block)
  for (let x = 40, i = 0; x < 640; i++) { const w = 28 + r() * 34; add(x + w / 2, -LB.BANK - 18 - r() * 10, w, 24 + r() * 12, 16 + r() * 14, i === 1 ? 'office' : 'brick'); x += w + 4 + r() * 8; }
  // a second row back from the river on both banks
  for (let i = 0; i < 70; i++) { const s = r() < 0.5 ? -1 : 1, x = -900 + r() * 1800; if (Math.abs(x) < 60) continue;
    const z = s * (LB.BANK + 70 + r() * 260); if (s < 0 && x < -60 && x > -420 && z > -330) continue;   // the Tower of London's grounds
    add(x, z, 24 + r() * 40, 20 + r() * 40, 14 + r() * 30, ['brick', 'office', 'stone', 'office'][Math.floor(r() * 4)]); }
  return { group: g, mats };
}
// the Tower of London (north bank, west of the bridge): curtain walls with towers, the White Tower in the middle
export function makeTowerOfLondon() {
  const g = new THREE.Group(), cx = -230, cz = -235;
  const wall = stoneMat({ color: '#9a9284', floodY: LB.STREET, flood: 0.7, course: 0.5, block: 0.9 });
  const white = stoneMat({ color: '#d9d2c2', floodY: LB.STREET, flood: 1.1, course: 0.5, block: 0.9 });
  const lead = new THREE.MeshStandardMaterial({ color: '#4f575c', roughness: 0.45, metalness: 0.5 });
  const ring = (hw, hd, h, th) => { for (const [x, z, w, d] of [[0, -hd, 2 * hw, th], [0, hd, 2 * hw, th], [-hw, 0, th, 2 * hd], [hw, 0, th, 2 * hd]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); m.position.set(cx + x, LB.STREET + h / 2, cz + z); g.add(m);
    const n = Math.floor(Math.max(w, d) / 2.2); for (let i = 0; i < n; i++) { const u = (i + 0.5) / n - 0.5, mm = new THREE.Mesh(new THREE.BoxGeometry(w > d ? 1.1 : th, 1.0, w > d ? th : 1.1), wall); mm.position.set(cx + x + (w > d ? u * w : 0), LB.STREET + h + 0.5, cz + z + (w > d ? 0 : u * d)); g.add(mm); } } };
  ring(115, 105, 11, 3.5); ring(78, 70, 14, 4);
  for (const [x, z] of [[-115, -105], [115, -105], [115, 105], [-115, 105], [-78, -70], [78, -70], [78, 70], [-78, 70], [0, 105], [0, -105]]) { const t = new THREE.Mesh(prism(6, 18, 12), wall); t.position.set(cx + x, LB.STREET + 9, cz + z); g.add(t); }
  const wt = new THREE.Mesh(new THREE.BoxGeometry(36, 27, 32), white); wt.position.set(cx, LB.STREET + 13.5, cz); g.add(wt);
  for (const [x, z] of [[-18, -16], [18, -16], [18, 16], [-18, 16]]) { const t = new THREE.Mesh(prism(3.4, 33, 8), white); t.position.set(cx + x, LB.STREET + 16.5, cz + z); g.add(t);
    const cup = new THREE.Mesh(new THREE.SphereGeometry(3.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lead); cup.position.set(cx + x, LB.STREET + 33, cz + z); g.add(cup);
    const vane = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 5), lead); vane.position.set(cx + x, LB.STREET + 37, cz + z); g.add(vane); }
  return g;
}
// the City (north-west) and the Shard (south-west): towers rising into the cloud, window grids; [x, z, radius-ish, height]
export function makeSkyline() {
  const g = new THREE.Group(), r = rng(77);
  const glassA = windowMat({ base: '#18222c', lit: 0.6, floorH: 4.0, bayW: 1.5, warm: 0.3, glass: 0.35, seed: 11, gain: 2.0 });
  const glassB = windowMat({ base: '#222a30', lit: 0.5, floorH: 4.2, bayW: 3.0, warm: 0.2, glass: 0.35, seed: 13, gain: 1.8 });
  const office = windowMat({ base: '#3d4249', lit: 0.5, floorH: 3.8, bayW: 1.5, warm: 0.45, glass: 0.6, seed: 15, gain: 1.6 });
  const roofM = new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.7 });
  const red = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a1a').multiplyScalar(4) });
  const box = (x, z, w, d, h, m, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [m, m, roofM, roofM, m, m]); b.position.set(x, LB.STREET + h / 2, z); b.rotation.y = ry; g.add(b); return b; };
  const beacon = (x, y, z) => { const b = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), red); b.position.set(x, y, z); g.add(b); };
  // the City cluster: ~1-1.6 km north-west
  const C = V(-1150, 0, -950);
  for (let i = 0; i < 55; i++) { const a = r() * 6.283, d = 60 + 520 * Math.sqrt(r()), x = C.x + Math.cos(a) * d, z = C.z + Math.sin(a) * d, h = 40 + 150 * Math.pow(r(), 2.2) * (1 - d / 700);
    box(x, z, 28 + r() * 30, 26 + r() * 30, h, r() < 0.4 ? glassA : office, (r() - 0.5) * 0.4); }
  // 22 Bishopsgate (278 m), the Cheesegrater (225 m, a wedge), the Gherkin (180 m), the Walkie-Talkie (160 m, widening upward)
  box(C.x - 40, C.z + 10, 55, 50, 278, glassB, 0.2); beacon(C.x - 40, LB.STREET + 280, C.z + 10);
  { const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(48, 0), new THREE.Vector2(48, 30), new THREE.Vector2(0, 225)]);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 40, bevelEnabled: false }), glassA); m.position.set(C.x + 30, LB.STREET, C.z + 60); m.rotation.y = -0.4; g.add(m); beacon(C.x + 30, LB.STREET + 226, C.z + 60); }
  { const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20, y = u * 180, rr = 28 * Math.sin(Math.PI * (0.18 + 0.82 * u * 0.92)) * (1 - 0.12 * u) + 2; pts.push(new THREE.Vector2(Math.max(0.5, rr), y)); }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), glassB); m.position.set(C.x + 120, LB.STREET, C.z - 60); g.add(m); }
  { const geo = new THREE.BoxGeometry(60, 160, 40, 1, 12, 1), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 80, k = 1 + 0.35 * (y / 160) ** 1.5; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * (1 + 0.15 * y / 160)); } geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, glassA); m.position.set(C.x + 260, LB.STREET + 80, C.z + 190); g.add(m); }
  // the Shard (310 m), on the south bank ~1 km west-south-west
  { const geo = new THREE.ConeGeometry(42, 310, 4, 8, true); geo.rotateY(Math.PI / 4); const m = new THREE.Mesh(geo, glassA); m.position.set(-1180, LB.STREET + 155, 230); m.scale.set(1, 1, 0.8); g.add(m); beacon(-1180, LB.STREET + 312, 230); }
  // Canary Wharf, far east (4.5 km): One Canada Square's pyramid top and its blinking beacon
  for (let i = 0; i < 12; i++) box(4300 + (r() - 0.5) * 500, 1500 + (r() - 0.5) * 500, 40 + r() * 20, 40 + r() * 20, 120 + r() * 100, r() < 0.5 ? glassA : office);
  box(4300, 1500, 50, 50, 235, glassB); { const p = new THREE.Mesh(new THREE.ConeGeometry(36, 30, 4), roofM); p.rotation.y = Math.PI / 4; p.position.set(4300, LB.STREET + 250, 1500); g.add(p); } beacon(4300, LB.STREET + 266, 1500);
  // the rest of London: a carpet of mid-rise blocks out to the haze (kept low, far from the cameras)
  const carpetM = windowMat({ base: '#3a3d42', lit: 0.35, floorH: 3.8, bayW: 1.6, warm: 0.6, glass: 0.5, seed: 21, gain: 0.45 });
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [carpetM, carpetM, new THREE.MeshStandardMaterial({ color: '#2c2e31', roughness: 0.5 }), roofM, carpetM, carpetM], 900), mm = new THREE.Matrix4(), edges = riverEdges();
  let k = 0;
  for (let guard = 0; k < 900 && guard < 9000; guard++) { const x = -4500 + r() * 9500, z = -4500 + r() * 8500; if (Math.hypot(x, z) < 650 || inRiver(x, z, edges)) continue;
    const near = Math.hypot(x - C.x, z - C.z) < 600; if (near) continue; const h = 12 + 30 * r() * r();
    mm.compose(V(x, LB.STREET + h / 2, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), r()), V(30 + r() * 50, h, 30 + r() * 50)); inst.setMatrixAt(k++, mm); }
  inst.count = k; g.add(inst);
  return g;
}
// London's lights seen from the aerial shots: street lights and windows as points over 14 km (none on the river)
export function cityLightPoints(n = 60000, seed = 321) {
  const r = rng(seed), edges = riverEdges(), out = [];
  for (let i = 0; out.length < n && i < n * 4; i++) {
    const street = r() < 0.65, x = -7000 + r() * 14000, z = -7000 + r() * 13000;
    let gx = x, gz = z; if (street) { if (r() < 0.5) gx = Math.round(x / 110) * 110 + (r() - 0.5) * 6; else gz = Math.round(z / 95) * 95 + (r() - 0.5) * 6; }
    if (inRiver(gx, gz, edges)) continue;
    const tint = street ? [1, 0.72, 0.42] : [[1, 0.85, 0.65], [0.8, 0.88, 1]][Math.floor(r() * 2)], c = 0.4 + 0.9 * r();
    out.push([gx, LB.STREET + (street ? 6 : 5 + r() * 40), gz, tint[0] * c, tint[1] * c, tint[2] * c, 1.5 + r() * 2]);
  }
  return out;
}
