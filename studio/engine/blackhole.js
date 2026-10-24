// Schwarzschild black hole renderer: per-pixel null-geodesic tracing (units: r_s = 1),
// thin accretion disk with Doppler beaming, lensed galaxy sky, observer aberration.
import * as THREE from 'three';
import { rng } from './core.js';

export function makeSkyTexture(seed = 3) {
  const w = 4096, h = 2048;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const r = rng(seed);
  // Milky Way band along a tilted great circle: draw as many soft blobs
  const band = (lon) => { // returns lat of band centre for given lon (degrees)
    return 22 * Math.sin((lon + 40) * Math.PI / 180);
  };
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26000; i++) {
    const lon = r() * 360 - 180; const spread = (r() + r() + r() - 1.5) * 9;
    const lat = band(lon) + spread;
    const x = (lon + 180) / 360 * w, y = (90 - lat) / 180 * h;
    const rad = 6 + r() * 34; const a = 0.012 + r() * 0.03;
    const warm = r();
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${200 + warm * 55},${180 + warm * 40},${160 + (1 - warm) * 80},${a})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // dust lanes
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 2600; i++) {
    const lon = r() * 360 - 180; const lat = band(lon) + (r() - 0.5) * 5;
    const x = (lon + 180) / 360 * w, y = (90 - lat) / 180 * h; const rad = 4 + r() * 20;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // nebulae (make the lensing visible)
  g.globalCompositeOperation = 'lighter';
  const neb = [[-60, 30, '255,90,140'], [70, -25, '90,170,255'], [150, 10, '255,160,80'], [-140, -40, '140,110,255'], [10, 55, '80,220,200']];
  for (const [lo, la, col] of neb) {
    for (let k = 0; k < 160; k++) {
      const x = (lo + 180 + (r() - 0.5) * 26) / 360 * w, y = (90 - la + (r() - 0.5) * 18) / 180 * h; const rad = 20 + r() * 80;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${col},0.05)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  // stars
  for (let i = 0; i < 52000; i++) {
    const x = r() * w; const y = Math.acos(1 - 2 * r()) / Math.PI * h; // uniform on sphere
    const b = Math.pow(r(), 4); const t = r();
    const col = t < 0.15 ? '255,200,160' : t < 0.3 ? '170,200,255' : '255,250,240';
    g.fillStyle = `rgba(${col},${0.25 + b * 0.75})`;
    const s = b > 0.6 ? 2.2 : b > 0.25 ? 1.6 : 1.1;
    g.fillRect(x, y, s, s);
    if (b > 0.85) { const gr = g.createRadialGradient(x, y, 0, x, y, 9); gr.addColorStop(0, `rgba(${col},0.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 9, y - 9, 18, 18); }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return tex;
}

export function makeBlackHole(skyTex) {
  const mat = new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false,
    uniforms: {
      tSky: { value: skyTex }, uRes: { value: new THREE.Vector2(1080, 1920) }, uCamPos: { value: new THREE.Vector3(0, 2, 30) },
      uCamRot: { value: new THREE.Matrix3() }, uFov: { value: 1.0 }, uBeta: { value: 0 }, uTime: { value: 0 },
      uDisk: { value: 1.0 }, uSkyGain: { value: 1.0 }, uRed: { value: 0 }, uDiskOuter: { value: 14.0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D tSky; uniform vec2 uRes; uniform vec3 uCamPos; uniform mat3 uCamRot; uniform float uFov, uBeta, uTime, uDisk, uSkyGain, uRed, uDiskOuter;
      varying vec2 vUv;
      vec3 sky(vec3 d){
        float u = atan(d.z, d.x) / 6.2831853 + 0.5; float v = acos(clamp(d.y,-1.0,1.0)) / 3.14159265;
        return texture2D(tSky, vec2(u, v)).rgb;
      }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
      vec3 bb(float t){ // approx blackbody tint, t in 0..1 (cool -> hot)
        return mix(mix(vec3(1.0,0.25,0.05), vec3(1.0,0.62,0.25), smoothstep(0.0,0.45,t)), vec3(1.0,0.95,0.88), smoothstep(0.45,1.0,t));
      }
      vec3 accel(vec3 x, float h2){ float r2 = dot(x,x); return -1.5*h2*x/(r2*r2*sqrt(r2)); }
      void main(){
        vec2 p = (vUv - 0.5) * vec2(uRes.x/uRes.y, 1.0) * 2.0 * tan(uFov*0.5);
        vec3 dc = normalize(vec3(p.x, p.y, -1.0));
        vec3 dw = normalize(uCamRot * dc);
        // observer falling inward with speed beta: aberration (moving frame -> static frame)
        vec3 n = normalize(-uCamPos);
        float ct = dot(dw, n);
        float cs = (ct - uBeta) / (1.0 - uBeta*ct);
        vec3 perp = dw - ct*n; float pl = length(perp);
        vec3 ds = pl > 1e-5 ? normalize(n*cs + perp/pl*sqrt(max(0.0,1.0-cs*cs))) : n*sign(cs);
        float dop = clamp((1.0 + uBeta*ct) / sqrt(max(1e-4, 1.0-uBeta*uBeta)), 0.15, 6.0); // brightness boost ahead
        vec3 x = uCamPos; vec3 v = ds;
        vec3 hv = cross(x, v); float h2 = dot(hv, hv);
        vec3 col = vec3(0.0); float alpha = 0.0; bool captured = false;
        for (int i = 0; i < 190; i++) {
          float r = length(x);
          float dt = clamp(0.075 * r, 0.015, 2.5);
          // RK4
          vec3 k1v = accel(x, h2), k1x = v;
          vec3 k2v = accel(x + 0.5*dt*k1x, h2), k2x = v + 0.5*dt*k1v;
          vec3 k3v = accel(x + 0.5*dt*k2x, h2), k3x = v + 0.5*dt*k2v;
          vec3 k4v = accel(x + dt*k3x, h2), k4x = v + dt*k3v;
          vec3 xn = x + dt/6.0*(k1x + 2.0*k2x + 2.0*k3x + k4x);
          vec3 vn = v + dt/6.0*(k1v + 2.0*k2v + 2.0*k3v + k4v);
          // disk crossing (plane y = 0)
          if (x.y * xn.y < 0.0 && alpha < 0.99) {
            float f = x.y / (x.y - xn.y); vec3 c = mix(x, xn, f); float rr = length(c);
            if (rr > 3.0 && rr < uDiskOuter) {
              float ang = atan(c.z, c.x);
              float om = 0.5 / pow(rr, 1.5);
              float sw = ang + uTime * om * 6.0;
              float nz = vnoise(vec2(log(rr)*9.0, sw*4.0)) * 0.6 + vnoise(vec2(log(rr)*23.0, sw*11.0)) * 0.4;
              float temp = pow(3.0/rr, 0.75) * pow(max(0.0, 1.0 - sqrt(3.0/rr)), 0.25) * 1.6;
              vec3 vel = normalize(vec3(-c.z, 0.0, c.x)) * sqrt(0.5/(rr-1.0));
              vec3 toCam = -normalize(vn);
              float gam = 1.0/sqrt(1.0 - dot(vel,vel));
              float g = 1.0 / (gam * (1.0 - dot(vel, toCam))) * sqrt(1.0 - 1.0/rr);
              float I = temp * pow(g, 3.5) * (0.45 + 0.9*nz) * uDisk;
              float edge = smoothstep(3.0, 3.4, rr) * (1.0 - smoothstep(uDiskOuter*0.6, uDiskOuter, rr));
              vec3 dcol = bb(clamp(temp*g*0.55, 0.0, 1.0)) * I * 0.75;
              float a = clamp(edge * (0.55 + 0.4*nz), 0.0, 0.95);
              col += (1.0 - alpha) * dcol * a; alpha += (1.0 - alpha) * a;
            }
          }
          x = xn; v = vn;
          float rn = length(x);
          if (rn < 1.0) { captured = true; break; }
          if (rn > 70.0) break;
        }
        if (!captured) {
          vec3 s = sky(normalize(v)) * uSkyGain * dop;
          s = mix(s, s*vec3(1.2,0.55,0.35), uRed);
          col += (1.0 - alpha) * s;
        }
        // photon-ring glow hint near capture boundary handled by disk; final tone
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false; quad.renderOrder = -100;
  return { quad, mat };
}

// camera basis helper: look from pos toward target with up vector, returns Matrix3 (columns right, up, back)
export function lookBasis(pos, target, up = new THREE.Vector3(0, 1, 0), roll = 0) {
  const f = target.clone().sub(pos).normalize();
  let rt = new THREE.Vector3().crossVectors(f, up).normalize();
  let u = new THREE.Vector3().crossVectors(rt, f).normalize();
  if (roll) { const q = new THREE.Quaternion().setFromAxisAngle(f, roll); rt.applyQuaternion(q); u.applyQuaternion(q); }
  const back = f.clone().negate();
  return new THREE.Matrix3().set(rt.x, u.x, back.x, rt.y, u.y, back.y, rt.z, u.z, back.z);
}

// low-poly astronaut
export function makeAstronaut() {
  const g = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: '#eceff3', roughness: 0.55, metalness: 0.05, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.6, flatShading: true });
  const visor = new THREE.MeshStandardMaterial({ color: '#d9a441', roughness: 0.12, metalness: 1.0, emissive: '#3a2306', flatShading: false });
  const accent = new THREE.MeshStandardMaterial({ color: '#ffb547', roughness: 0.5, flatShading: true });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.66, 0.36), suit); torso.position.y = 1.15; g.add(torso);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.22), suit); pack.position.set(0, 1.2, -0.29); g.add(pack);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.04), dark); panel.position.set(0, 1.2, 0.2); g.add(panel);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.05, 0.37), accent); stripe.position.set(0, 0.92, 0); g.add(stripe);
  const helmet = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 2), suit); helmet.position.y = 1.68; g.add(helmet);
  const vis = new THREE.Mesh(new THREE.SphereGeometry(0.205, 24, 16, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.28, Math.PI * 0.42), visor);
  vis.position.set(0, 1.68, 0.06); g.add(vis);
  const limb = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 8);
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const ap = new THREE.Group(); ap.position.set(s * 0.36, 1.4, 0); g.add(ap);
    const a = new THREE.Mesh(limb(0.09, 0.5), suit); a.position.y = -0.3; ap.add(a);
    const glove = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 1), dark); glove.position.y = -0.62; ap.add(glove); arms.push(ap);
    const lp = new THREE.Group(); lp.position.set(s * 0.15, 0.82, 0); g.add(lp);
    const l = new THREE.Mesh(limb(0.11, 0.55), suit); l.position.y = -0.36; lp.add(l);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, 0.26), dark); boot.position.set(0, -0.74, 0.04); lp.add(boot); legs.push(lp);
  }
  g.userData = { arms, legs, suit, visor };
  const pivot = new THREE.Group(); g.position.y = -1.1; pivot.add(g);
  return pivot;
}
