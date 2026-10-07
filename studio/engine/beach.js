// Beach set: ocean shader, sand, palms, umbrellas, towels, gulls, fire, drink. Reused by several episodes.
import * as THREE from 'three';
import { rng, clamp, smooth } from './core.js';
import { canvasTex, makePerson, Puffs, softDotTex } from './assets.js';

export function makeOcean(o = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uSun: { value: new THREE.Vector3(0.3, 0.8, -0.5).normalize() },
      uDeep: { value: new THREE.Color(o.deep || '#0b4a78') }, uShallow: { value: new THREE.Color(o.shallow || '#2bb3b8') },
      uSky: { value: new THREE.Color(o.sky || '#8fc4f0') }, uSkyAmt: { value: 1.0 }, uSunCol: { value: new THREE.Color('#fff4dc') },
      uBoil: { value: 0 }, uTide: { value: 0 }, uShore: { value: o.shore ?? 0 }, uNight: { value: 0 }, uMoon: { value: new THREE.Vector3(0, 0.3, -1).normalize() }, uMoonAmt: { value: 0 },
    }]),
    vertexShader: `
      #include <fog_pars_vertex>
      uniform float uTime, uTide; varying vec3 vW; varying float vH;
      float wave(vec2 p, vec2 d, float f, float sp){ return sin(dot(p,d)*f + uTime*sp); }
      void main(){
        vec3 p = position;
        vec4 w = modelMatrix*vec4(p,1.0);
        float h = 0.18*wave(w.xz, normalize(vec2(0.2,1.0)), 0.18, 1.3) + 0.09*wave(w.xz, normalize(vec2(-0.7,1.0)), 0.33, 1.9) + 0.05*wave(w.xz, normalize(vec2(1.0,0.4)), 0.71, 2.6);
        w.y += h + uTide; vH = h; vW = w.xyz;
        vec4 mvPosition = viewMatrix*w;
        gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform float uTime, uBoil, uShore, uSkyAmt, uNight, uMoonAmt; uniform vec3 uSun, uDeep, uShallow, uSky, uSunCol, uMoon;
      varying vec3 vW; varying float vH;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
      void main(){
        vec2 p = vW.xz;
        float e = 0.08;
        float n1 = vn(p*0.9 + vec2(uTime*0.35, uTime*0.2)) + 0.5*vn(p*2.3 - vec2(uTime*0.6, uTime*0.4));
        float nx = vn((p+vec2(e,0.0))*0.9 + vec2(uTime*0.35, uTime*0.2)) + 0.5*vn((p+vec2(e,0.0))*2.3 - vec2(uTime*0.6, uTime*0.4));
        float nz = vn((p+vec2(0.0,e))*0.9 + vec2(uTime*0.35, uTime*0.2)) + 0.5*vn((p+vec2(0.0,e))*2.3 - vec2(uTime*0.6, uTime*0.4));
        vec3 n = normalize(vec3(-(nx-n1)*0.9, 1.0, -(nz-n1)*0.9));
        vec3 v = normalize(cameraPosition - vW);
        float fres = 0.04 + 0.96*pow(1.0 - max(dot(n, v), 0.0), 5.0);
        float dist = length(vW.xz - cameraPosition.xz);
        float shallow = smoothstep(60.0, 5.0, vW.z - uShore) ;
        vec3 water = mix(uDeep, uShallow, shallow*0.85);
        vec3 col = mix(water, uSky*uSkyAmt, fres*0.85);
        vec3 r = reflect(-v, n);
        float sp = pow(max(dot(r, uSun), 0.0), 220.0) * 6.0 + pow(max(dot(r, uSun), 0.0), 24.0) * 0.4;
        col += uSunCol * sp * (1.0 - uNight);
        float mp = pow(max(dot(r, uMoon), 0.0), 140.0) * 3.0;
        col += vec3(0.85,0.9,1.0) * mp * uMoonAmt;
        // foam near the shore line
        float shoreD = vW.z - uShore;
        float foam = smoothstep(2.5, 0.0, abs(shoreD - 1.2 - sin(uTime*0.8 + vW.x*0.15)*1.2)) * vn(p*3.0 + uTime);
        col = mix(col, vec3(0.95), clamp(foam*0.8, 0.0, 1.0)*(1.0-uNight*0.7));
        // boiling: white froth cells
        if (uBoil > 0.0) {
          float b = vn(p*4.0 + vec2(uTime*3.0, -uTime*2.1)) * vn(p*9.0 - uTime*4.0);
          float bub = smoothstep(0.45 - 0.25*uBoil, 0.6, b) * uBoil;
          col = mix(col, vec3(0.92,0.95,0.97)*(0.35 + 0.65*max(dot(n, uSun),0.0)), bub*0.85);
        }
        col *= mix(1.0, 0.12, uNight);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
  });
  const geo = new THREE.PlaneGeometry(6000, 6000, 300, 300); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.position.z = -2990; m.receiveShadow = false;
  return { mesh: m, mat };
}

export function sandTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#e8d3a8'; g.fillRect(0, 0, w, h);
    const r = rng(17);
    for (let i = 0; i < 24000; i++) { const v = r(); g.fillStyle = `rgba(${170 + v * 70},${150 + v * 60},${110 + v * 50},.28)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    g.strokeStyle = 'rgba(160,130,90,.10)'; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { g.beginPath(); const y = r() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 6); g.stroke(); }
  }, { repeat: true });
}

export function makePalm(r, h = 9) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: 1, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#3f8a3a', roughness: 0.9, flatShading: true, side: THREE.DoubleSide });
  const segs = 8; const lean = (r() - 0.5) * 0.5 + 0.25, dir = r() * Math.PI * 2;
  let prev = new THREE.Vector3(0, 0, 0);
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; const off = Math.pow(t, 2) * lean * h;
    pts.push(new THREE.Vector3(Math.cos(dir) * off, t * h, Math.sin(dir) * off));
  }
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[i + 1]; const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.19 - i * 0.012, 0.24 - i * 0.012, len * 1.05, 7), trunkMat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true; g.add(m);
  }
  const top = pts[segs];
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.9, 1.6, 0, 4.2); leafShape.quadraticCurveTo(-0.9, 1.6, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 6);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const L = new THREE.Mesh(leafGeo, leafMat);
    const piv = new THREE.Group(); piv.position.copy(top); piv.rotation.y = (i / n) * Math.PI * 2 + r() * 0.3;
    L.rotation.x = -Math.PI / 2 + 0.55 + r() * 0.35; // droop
    piv.add(L); L.castShadow = true; g.add(piv);
  }
  const coco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: '#5a3d22', flatShading: true }));
  coco.position.copy(top).add(new THREE.Vector3(0.2, -0.35, 0.1)); g.add(coco);
  return g;
}

export function makeUmbrella(r, colA = '#e8453c', colB = '#f6f0e3') {
  const g = new THREE.Group();
  const stripes = canvasTex(256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? colA : colB; c.fillRect(i * w / 8, 0, w / 8, h); } });
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.7, 16, 1, true), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.8, side: THREE.DoubleSide, flatShading: true }));
  canopy.position.y = 2.3; canopy.castShadow = true;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), new THREE.MeshStandardMaterial({ color: '#dddddd', roughness: 0.4, metalness: 0.5 }));
  pole.position.y = 1.2; pole.castShadow = true;
  g.add(canopy, pole); g.rotation.z = (r() - 0.5) * 0.2;
  return g;
}

export function makeTowel(r) {
  const cols = [['#2f7ac2', '#f4efe6'], ['#e85d75', '#ffd23f'], ['#3f8f5a', '#f4efe6'], ['#ff8c42', '#2f3e46']];
  const [a, b] = cols[Math.floor(r() * cols.length)];
  const t = canvasTex(64, 128, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? a : b; c.fillRect(0, i * h / 8, w, h / 8); } });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 1.8), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  m.receiveShadow = true; return m;
}

// gull: two flapping wing triangles + body
export function makeGull() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.8, flatShading: true, side: THREE.DoubleSide });
  const grey = new THREE.MeshStandardMaterial({ color: '#9aa1a8', roughness: 0.8, flatShading: true, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.32, 3, 6), white); body.rotation.z = Math.PI / 2; g.add(body);
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.12, 0, 0.75, -0.18, 0, 0.55, 0, 0, 0, -0.18, 0, 0.55, -0.1, 0, 0.05], 3));
  wingGeo.computeVertexNormals();
  const wl = new THREE.Group(), wr = new THREE.Group();
  const ml = new THREE.Mesh(wingGeo, grey), mr = new THREE.Mesh(wingGeo, grey); mr.scale.z = -1;
  wl.add(ml); wr.add(mr); g.add(wl, wr);
  g.userData = { wl, wr };
  return g;
}

// tiny campfire: logs + embers; flames are particles (driven by the episode)
export function makeFirepit() {
  const g = new THREE.Group();
  const log = new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 1, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 6), log);
    m.rotation.z = Math.PI / 2 - 0.5; m.rotation.y = i * Math.PI / 2; m.position.y = 0.18; g.add(m);
  }
  const stones = new THREE.MeshStandardMaterial({ color: '#7a7570', roughness: 1, flatShading: true });
  for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), stones); const a = i / 9 * Math.PI * 2; s.position.set(Math.cos(a) * 0.55, 0.06, Math.sin(a) * 0.55); g.add(s); }
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6), new THREE.MeshBasicMaterial({ color: '#ff5a1f' })); ember.position.y = 0.08; ember.scale.y = 0.35; g.add(ember);
  g.userData = { ember };
  return g;
}

// glass of soda on a little table (for the boiling close-up)
export function makeDrink() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.14, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
  glass.position.y = 0.07;
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.035, 0.1, 24), new THREE.MeshStandardMaterial({ color: '#c96a1b', roughness: 0.2, transparent: true, opacity: 0.85 }));
  liquid.position.y = 0.052;
  const ice = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, roughness: 0.1 }));
  ice.position.set(0.01, 0.1, 0.0); ice.rotation.set(0.5, 0.3, 0.2);
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 6), new THREE.MeshStandardMaterial({ color: '#ff4f6d' })); straw.position.set(0.015, 0.13, 0); straw.rotation.z = -0.25;
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 24), new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.6 })); table.position.y = -0.015;
  g.add(table, liquid, glass, ice, straw);
  g.userData = { liquid };
  return g;
}

export function makeSailboat() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 1.6), new THREE.MeshStandardMaterial({ color: '#f2f2f2', flatShading: true }));
  hull.position.y = 0.3; g.add(hull);
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0, 6); s.lineTo(2.6, 0.2); s.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ color: '#fbfaf5', side: THREE.DoubleSide }));
  sail.position.set(-0.5, 0.8, 0); g.add(sail);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6.5, 6), new THREE.MeshStandardMaterial({ color: '#aaa' })); mast.position.set(-0.5, 3.9, 0); g.add(mast);
  return g;
}
