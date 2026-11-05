// Post 6's real anchor: Vostok station, Antarctica, the polar night of 21 July 1983 (-89.2 C, the coldest temperature ever
// measured on Earth). A reconstruction: the high plateau's wind-carved snow (sastrugi) under the stars and an aurora,
// the station's low buildings with lit windows and a radio mast, the white louvered weather screen that held the
// thermometer, diamond dust glinting in the station's lamp. Everything is a pure function of t.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';
import { SkyStars, Sparks } from './fx.js';
import { NOISE_GLSL } from './guarapari.js';

export function makeVostok() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#02040a');
  const r = rng(1983);
  // stars, brighter toward a band (the Milky Way over the plateau)
  const list = [];
  for (let i = 0; i < 9000; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = new THREE.Vector3(s * Math.cos(th), Math.abs(u), s * Math.sin(th));
    const band = Math.exp(-Math.pow(d.dot(new THREE.Vector3(0.3, 0.5, -0.81).normalize()) / 0.25, 2));
    const m = Math.pow(r(), 3.2), I = (0.2 + 2.2 * m * m) * (0.6 + 0.8 * band), c = r() < 0.3 ? [0.75, 0.85, 1] : [1, 0.96, 0.9];
    list.push({ d, px: 1.0 + m * 2.0, r: c[0] * I, g: c[1] * I, b: c[2] * I });
  }
  const stars = new SkyStars(list, { radius: 3000, minPx: 1.6 }); stars.u.uGain.value = 1.6; scene.add(stars.points);
  // the aurora: two curtains across the southern sky, a sharp folded lower edge, rays rising from it and fading, green
  // below, faint red above; drawn on a sky sphere from the view direction (the camera stays near the origin)
  const aur = new THREE.Mesh(new THREE.SphereGeometry(2600, 96, 48), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, uniforms: { uT: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT; varying vec3 vD; ${NOISE_GLSL}
      vec3 curtain(float az, float el, float el0, float amp, float f, float ph, float w0, float w1, float k){
        float base = el0 + amp * sin(az * f + ph + uT * 0.05) + amp * 0.45 * sin(az * f * 2.7 + ph * 1.3 - uT * 0.03);
        float h = el - base; if (h < -0.02) return vec3(0.0);
        float edge = smoothstep(-0.012, 0.004, h);
        vec2 rq = vec2(az * 60.0 + 0.3 * sin(el * 9.0 + uT * 0.1), el * 1.5 + uT * 0.02); float rays = 0.35 + 0.65 * bfbmAA(rq, max(fwidth(rq.x), fwidth(rq.y)));
        float up = exp(-max(h, 0.0) * 9.0), along = smoothstep(w0, w0 + 0.12, az) * (1.0 - smoothstep(w1 - 0.12, w1, az)) * (0.45 + 0.55 * bfbm(vec2(az * 3.0 + ph, uT * 0.02)));
        vec3 green = vec3(0.14, 1.0, 0.42), red = vec3(0.75, 0.16, 0.36);
        vec3 c = mix(green, red, smoothstep(0.05, 0.3, h));
        return c * edge * up * rays * along * k;
      }
      void main(){ vec3 d = normalize(vD); float el = asin(clamp(d.y, -1.0, 1.0)), az = atan(d.x, -d.z);
        if (el < -0.02) discard;
        vec3 c = curtain(az, el, 0.16, 0.035, 3.0, 0.7, -1.1, 0.9, 1.0) + curtain(az, el, 0.3, 0.05, 2.2, 2.9, -0.5, 1.4, 0.55);
        c *= smoothstep(-0.02, 0.06, el);
        gl_FragColor = vec4(c * 0.16, 1.0); }`,
  }));
  scene.add(aur);
  // the plateau: snow carved into sastrugi by the katabatic wind (ridges elongated along the wind), box-filtered
  const g = new THREE.PlaneGeometry(3000, 3000, 1, 1); g.rotateX(-Math.PI / 2);
  const snowM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.62 });
  snowM.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSW;').replace('#include <project_vertex>', '#include <project_vertex>\nvSW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vSW;\n${NOISE_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 p = vec2(vSW.x * 0.35 + vSW.z * 0.94, vSW.z * 0.35 - vSW.x * 0.94);   // wind-aligned frame
        float fw = max(fwidth(p.x), fwidth(p.y));
        float ridges = bfbmAA(vec2(p.x * 0.25, p.y * 1.6), fw * 1.6), drift = bfbmAA(p * 0.03, fw * 0.03);
        diffuseColor.rgb *= vec3(0.86, 0.9, 0.98) * (0.82 + 0.3 * ridges) * (0.9 + 0.2 * drift);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 q = vec2(vSW.x * 0.35 + vSW.z * 0.94, vSW.z * 0.35 - vSW.x * 0.94); float fw2 = max(fwidth(q.x), fwidth(q.y));
          float e = 0.12, a = bfbmAA(vec2(q.x * 0.25, q.y * 1.6), fw2 * 1.6), b = bfbmAA(vec2((q.x + e) * 0.25, q.y * 1.6), fw2 * 1.6), c2 = bfbmAA(vec2(q.x * 0.25, (q.y + e) * 1.6), fw2 * 1.6);
          float k = 1.0 - smoothstep(0.05, 0.4, fw2 * 1.6);
          normal = normalize(normal + mat3(viewMatrix) * (vec3(a - b, 0.0, a - c2) * 2.2 * k)); }`);
  };
  snowM.customProgramCacheKey = () => 'vostok_snow_v1';
  const ground = new THREE.Mesh(g, snowM); ground.receiveShadow = true; scene.add(ground);
  // the station: low modules raised on legs, snow on their roofs and banked against them in drifts, lit windows, a
  // lattice radio mast with a red light and its guy wires, a tracked tractor parked by the main building
  const wallM = new THREE.MeshStandardMaterial({ color: '#56636a', roughness: 0.75, metalness: 0.15 });
  const snowW = new THREE.MeshStandardMaterial({ color: '#e9eef6', roughness: 0.7 });
  const darkM = new THREE.MeshStandardMaterial({ color: '#23272b', roughness: 0.8, metalness: 0.3 });
  const winM = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffbf7a', emissiveIntensity: 2.2 });
  const bodies = [], wins = [], snows = [], darks = [];
  for (const [x, z, w, d, h] of [[-18, -42, 22, 9, 4.2], [8, -48, 16, 8, 3.8], [26, -36, 10, 7, 3.4], [-40, -30, 12, 8, 3.6]]) {
    const b = new THREE.BoxGeometry(w, h, d); b.translate(x, 1.0 + h / 2, z); bodies.push(b);
    const rf = new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5); rf.translate(x, 1.0 + h + 0.17, z); snows.push(rf);                 // snow on the roof
    for (let k = 0; k < Math.floor(w / 3.2); k++) if (r() < 0.6) { const wn = new THREE.BoxGeometry(1.1, 0.7, 0.05); wn.translate(x - w / 2 + 1.8 + k * 3.2, 1.0 + h * 0.55, z + d / 2 + 0.03); wins.push(wn); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.BoxGeometry(0.25, 1.1, 0.25); l.translate(x + sx * (w / 2 - 0.5), 0.5, z + sz * (d / 2 - 0.5)); darks.push(l); }
    const dr = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2); dr.scale(w * 0.62, 1.5 + r() * 0.6, 2.6); dr.translate(x - 0.6, 0, z - d / 2 - 0.8); snows.push(dr);   // drift on the windward side
    const dr2 = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2); dr2.scale(2.4, 1.1, d * 0.6); dr2.translate(x + w / 2 + 0.4, 0, z); snows.push(dr2);
  }
  // the tractor: a body, a cab with a lit window, two tracks
  { const tx = -3, tz = -36; const bd = new THREE.BoxGeometry(2.4, 1.2, 4.2); bd.translate(tx, 1.2, tz); bodies.push(bd);
    const cab = new THREE.BoxGeometry(2.0, 1.2, 1.8); cab.translate(tx, 2.4, tz - 0.9); bodies.push(cab);
    for (const sx of [-1, 1]) { const tr = new THREE.BoxGeometry(0.6, 0.8, 4.8); tr.translate(tx + sx * 1.35, 0.4, tz); darks.push(tr); }
    const cw = new THREE.BoxGeometry(1.6, 0.6, 0.04); cw.translate(tx, 2.55, tz + 0.02); wins.push(cw); }
  const station = new THREE.Mesh(mergeGeometries(bodies), wallM); station.castShadow = true; station.receiveShadow = true; scene.add(station);
  const snowy = new THREE.Mesh(mergeGeometries(snows), snowW); snowy.receiveShadow = true; snowy.castShadow = true; scene.add(snowy);
  scene.add(new THREE.Mesh(mergeGeometries(darks), darkM), new THREE.Mesh(mergeGeometries(wins), winM));
  // the mast: a three-legged lattice, braced every 1.5 m, guy wires to the snow
  const mg = [], MX = 14, MZ = -60, MH = 30, rad = 0.45;
  for (let k = 0; k < 3; k++) { const a = k * 2.094; const l = new THREE.CylinderGeometry(0.03, 0.03, MH, 5); l.translate(MX + Math.cos(a) * rad, MH / 2, MZ + Math.sin(a) * rad); mg.push(l); }
  for (let y = 0.75; y < MH; y += 1.5) for (let k = 0; k < 3; k++) {
    const a0 = k * 2.094, a1 = a0 + 2.094, p0 = new THREE.Vector3(MX + Math.cos(a0) * rad, y, MZ + Math.sin(a0) * rad), p1 = new THREE.Vector3(MX + Math.cos(a1) * rad, y + 0.75, MZ + Math.sin(a1) * rad);
    const L = p0.distanceTo(p1), c = new THREE.CylinderGeometry(0.012, 0.012, L, 4); c.translate(0, L / 2, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize())); c.translate(p0.x, p0.y, p0.z); mg.push(c);
  }
  for (const [gx, gz, gy] of [[MX + 16, MZ + 8, 22], [MX - 15, MZ + 10, 22], [MX + 2, MZ - 18, 22]]) {
    const p0 = new THREE.Vector3(MX, gy, MZ), p1 = new THREE.Vector3(gx, 0, gz), L = p0.distanceTo(p1), c = new THREE.CylinderGeometry(0.008, 0.008, L, 3); c.translate(0, L / 2, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p0.clone().sub(p1).normalize())); c.translate(p1.x, p1.y, p1.z); mg.push(c);
  }
  scene.add(new THREE.Mesh(mergeGeometries(mg), darkM));
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshStandardMaterial({ color: '#300', emissive: '#ff2a1a', emissiveIntensity: 4 })); red.position.set(MX, MH + 0.3, MZ); scene.add(red);
  // the weather screen: a white louvered box on four legs, its door ajar, a thermometer inside
  const whiteM = new THREE.MeshStandardMaterial({ color: '#f2f3f0', roughness: 0.55 });
  const sg = [];
  const bx = 0, bz = 0, bw = 0.9, bd = 0.6, bh = 0.8, by = 1.25;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.BoxGeometry(0.06, by, 0.06); l.translate(bx + sx * (bw / 2 - 0.05), by / 2, bz + sz * (bd / 2 - 0.05)); sg.push(l); }
  const top = new THREE.BoxGeometry(bw + 0.14, 0.05, bd + 0.14); top.translate(bx, by + bh + 0.04, bz); sg.push(top);
  const top2 = new THREE.BoxGeometry(bw + 0.2, 0.03, bd + 0.2); top2.translate(bx, by + bh + 0.1, bz); sg.push(top2);
  const flo = new THREE.BoxGeometry(bw, 0.03, bd); flo.translate(bx, by, bz); sg.push(flo);
  for (let k = 0; k < 11; k++) for (const [ax, az, len, rot] of [[0, bd / 2, bw, 0], [0, -bd / 2, bw, 0], [bw / 2, 0, bd, Math.PI / 2], [-bw / 2, 0, bd, Math.PI / 2]]) {   // louvres
    const s = new THREE.BoxGeometry(len, 0.012, 0.07); s.rotateX(0.6); s.rotateY(rot); s.translate(bx + ax, by + 0.06 + k * 0.068, bz + az); sg.push(s);
  }
  const screen = new THREE.Mesh(mergeGeometries(sg), whiteM); screen.castShadow = true; scene.add(screen);
  const thermo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 8), new THREE.MeshStandardMaterial({ color: '#dfe8f0', roughness: 0.1, metalness: 0.2, emissive: '#ffffff', emissiveIntensity: 0.15 }));
  thermo.position.set(bx, by + bh * 0.5, bz + bd / 2 - 0.05); scene.add(thermo);
  // lights: starlight and aurora from above (cold, faint), the station's lamp on a pole (warm), a snow bounce
  scene.add(new THREE.HemisphereLight('#3b5a8a', '#0c1220', 0.55));
  const moon = new THREE.DirectionalLight('#9fb8ff', 0.5); moon.position.set(-60, 40, 50); scene.add(moon, moon.target);
  const lamp = new THREE.PointLight('#ffc48a', 260, 70, 2); lamp.position.set(-9, 9.5, -16); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; scene.add(lamp);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 9.5, 8), wallM); pole.position.set(-9, 4.75, -16); scene.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffd6a0', emissiveIntensity: 6 })); bulb.position.copy(lamp.position); scene.add(bulb);
  // diamond dust: ice crystals hanging in the air, glinting near the lamp
  const N = 2400, dust = new Sparks(N, { minPx: 1.6, maxPx: 5, near: 0.4, additive: true });
  for (let i = 0; i < N; i++) { const x = -14 + r() * 26, y = 0.3 + r() * 7, z = -20 + r() * 26, c = 0.6 + 0.4 * r(); dust.set(i, x, y, z, (r() - 0.5) * 0.05, -0.04 - r() * 0.05, (r() - 0.5) * 0.05, c * 0.95, c * 0.97, c, 0.002 + r() * 0.003, -100, 400, r()); }
  dust.commit(); dust.u.uTurb.value = 0.12; dust.u.uTurbF.value = 0.3; scene.add(dust.points);
  return { scene, aurora: aur, dust, stars, screenPos: new THREE.Vector3(bx, by + bh / 2, bz) };
}
