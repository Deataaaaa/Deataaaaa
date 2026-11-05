// Series « 12 % », Part 2: a Police nationale patrol car (dark blue, white « POLICE » lettering, the tricolour band, a blue light
// bar). Built on post 5's car body (town5.js makeCar 'suv'); x runs from the front bumper (0) to the back, z across, y up.
import * as THREE from 'three';
import { makeCar } from './town5.js';
import { pulse } from './trucks12.js';

function sideTex() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const c = cv.getContext('2d');
  c.clearRect(0, 0, 1024, 256);
  // the tricolour band along the bottom, then the lettering
  const bw = 1024 / 3; ['#1d3f9a', '#f2f2f2', '#d8232a'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * bw, 196, bw, 26); });
  c.fillStyle = '#f4f6f8'; c.font = '800 132px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText('POLICE', 512, 160);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function makePoliceCar(rand = Math.random) {
  const car = makeCar('suv', '#18203a', rand), g = car.group, L = car.L, W = 1.88;
  const tex = sideTex();
  const decal = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const sd of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), decal); p.position.set(L * 0.52, 0.66, sd * (W / 2 + 0.006)); p.rotation.y = sd > 0 ? 0 : Math.PI;
    if (sd < 0) p.scale.x = 1;            // the mirrored side reads the right way round once turned
    g.add(p);
  }
  // the light bar: a black base, two blue lenses that pulse out of phase
  const roofY = 1.66, bx = L * 0.47;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 1.15), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.5 })); base.position.set(bx, roofY, 0); g.add(base);
  const lenses = [-1, 1].map((sd, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.5), new THREE.MeshStandardMaterial({ color: '#0a1230', emissive: '#2f62ff', emissiveIntensity: 0.4, roughness: 0.2 }));
    m.position.set(bx, roofY + 0.07, sd * 0.29); g.add(m); return { m, ph: i * 0.5 };
  });
  const light = new THREE.PointLight('#3a66ff', 0, 22, 2); light.position.set(bx, roofY + 0.5, 0); g.add(light);
  const update = (t, k = 1) => { for (const { m, ph } of lenses) m.material.emissiveIntensity = (0.4 + 9 * pulse(t, ph)) * k; light.intensity = 260 * k * (0.35 + 0.65 * Math.max(pulse(t, 0), pulse(t, 0.5))); };
  return { group: g, L, update, light };
}
