// 1854, Crystal Palace, New York: Elisha Otis has the hoisting rope cut and his safety catch holds.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { rng, smooth, clamp, lerp } from './core.js';
import { Puffs, streakTex } from './assets.js';
import { loadPH, cloneMannequin, offsetBone } from './elevator.js';

const POST_X = 1.3, TOWER_H = 11, DECK_Y = 4.4, DROP = 0.08;

function gradTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const gv = g.createLinearGradient(0, 0, 0, 256); gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(0.25, 'rgba(0,0,0,1)'); gv.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = gv; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function windowTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#fff3dc'; g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#20160e'; for (let x = 0; x <= 128; x += 32) g.fillRect(x - 3, 0, 6, 256); for (let y = 0; y <= 256; y += 42) g.fillRect(0, y - 3, 128, 6);
  g.beginPath(); g.arc(64, 0, 64, 0, Math.PI); g.lineWidth = 6; g.strokeStyle = '#20160e'; g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// a spectator seen from behind: coat, head, hat (top hat, bowler or bonnet)
function makeSpectator(r) {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.07, 0.25, 0.012 + r() * 0.02), roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: '#1e1610', roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.95, 4, 10), coat); body.position.y = 0.95; body.scale.set(1.15, 1, 0.8); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), skin); head.position.y = 1.62; g.add(head);
  const k = r(); const hm = new THREE.MeshStandardMaterial({ color: '#0d0a08', roughness: 0.75 });
  const hat = new THREE.Group(); hat.position.y = 1.69; g.add(hat);
  if (k < 0.55) { const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.2 + r() * 0.06, 16), hm); cr.position.y = 0.11; hat.add(cr, new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 20), hm)); }
  else if (k < 0.8) { const cr = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hm); hat.add(cr, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 20), hm)); }
  else { const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: '#120d09', roughness: 1 })); b.rotation.x = -0.35; b.position.y = -0.06; hat.add(b); }
  const arm = new THREE.Group(); arm.position.set(0.24, 1.42, 0); g.add(arm);
  const am = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.5, 3, 8), coat); am.position.y = -0.3; arm.add(am);
  g.userData = { hat, body, arm, kind: k };
  return g;
}

export function makeOtisScene(gltf) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b0806');
  scene.fog = new THREE.Fog('#140e09', 9, 34);
  const timber = new THREE.MeshStandardMaterial({ ...loadPH('rough_wood', 1), color: '#b89a7c' });
  const planks = new THREE.MeshStandardMaterial({ ...loadPH('weathered_brown_planks', 2), color: '#a08670' });
  const iron = new THREE.MeshStandardMaterial({ color: '#2e2a26', metalness: 0.7, roughness: 0.45 });

  // light: sun through the glass roof (upper left) + a back light to cut the silhouettes out
  scene.add(new THREE.HemisphereLight('#ffe7c8', '#120c07', 0.22));
  const key = new THREE.DirectionalLight('#ffd9ad', 3.0); key.position.set(-6, 13, 7); key.target.position.set(0, DECK_Y, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 8, bottom: -6, near: 1, far: 40 }); key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#fff1dc', 2.2); rim.position.set(4, 9, -9); scene.add(rim);

  // hall floor + cast-iron columns, arches and tall windows lost in the haze
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ ...loadPH('weathered_brown_planks', 16), color: '#5c4c3e' }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const colMat = new THREE.MeshStandardMaterial({ color: '#2b2520', metalness: 0.5, roughness: 0.6 });
  for (const z of [-8, -14]) for (let x = -13.5; x <= 13.5; x += 4.5) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 13, 12), colMat); c.position.set(x, 6.5, z); scene.add(c);
    if (x < 13) { const a = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.07, 6, 24, Math.PI), colMat); a.position.set(x + 2.25, 11, z); scene.add(a); }
  }
  const winMat = new THREE.MeshBasicMaterial({ map: windowTex(), color: new THREE.Color(1.6, 1.45, 1.2), fog: true });
  for (let x = -15; x <= 15; x += 4.5) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 6.5), winMat); w.position.set(x, 9.5, -19); scene.add(w); }
  // shafts of light from the roof
  const shaftMat = new THREE.MeshBasicMaterial({ map: gradTex(), color: '#ffe2b8', transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const shafts = new THREE.Group(); scene.add(shafts);
  for (const [x, z, w] of [[-4.5, -3, 2.2], [-1.0, -5, 1.6], [3.5, -4, 2.6], [6.5, -7, 1.8]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 22), shaftMat); m.position.set(x, 9, z); m.rotation.z = -0.42; shafts.add(m); }

  // the hoist tower: two guide posts with iron ratchet teeth, a head beam and the sheave
  const tower = new THREE.Group(); scene.add(tower);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, TOWER_H, 0.32), timber); post.position.set(s * POST_X, TOWER_H / 2, 0); post.castShadow = post.receiveShadow = true; tower.add(post);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.16, 10.2, 0.16), timber); strut.position.set(s * (POST_X + 0.05), 4.6, -1.9); strut.rotation.x = -0.43; strut.castShadow = true; tower.add(strut);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 4.6), timber); foot.position.set(s * POST_X, 0.12, -1.8); tower.add(foot);
  }
  {
    const tooth = new THREE.BufferGeometry();
    // saw tooth: flat on top, sloping underneath (the pawl slides up, catches going down)
    const v = [0, 0, -0.05, 0, 0, 0.05, 0, 0.09, -0.05, 0, 0.09, 0.05, 0.05, 0.09, -0.05, 0.05, 0.09, 0.05];
    tooth.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    tooth.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5, 0, 1, 4, 1, 5, 4, 0, 4, 2, 1, 3, 5]); tooth.computeVertexNormals();
    const n = Math.floor((TOWER_H - 0.6) / 0.09);
    const teeth = new THREE.InstancedMesh(tooth, iron.clone(), n * 2); teeth.material.side = THREE.DoubleSide; const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) for (const [j, s] of [[0, -1], [1, 1]]) { m.makeScale(s < 0 ? 1 : -1, 1, 1); m.setPosition(s * (POST_X - 0.13), 0.4 + i * 0.09, 0); teeth.setMatrixAt(i * 2 + j, m); }
    teeth.castShadow = true; tower.add(teeth);
    const strip = new THREE.BoxGeometry(0.02, TOWER_H - 0.4, 0.12);
    for (const s of [-1, 1]) { const st = new THREE.Mesh(strip, iron); st.position.set(s * (POST_X - 0.135), TOWER_H / 2, 0); tower.add(st); }
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(2 * POST_X + 0.5, 0.3, 0.36), timber); head.position.set(0, TOWER_H + 0.15, 0); head.castShadow = true; tower.add(head);
  const sheave = new THREE.Group(); sheave.position.set(0, TOWER_H + 0.75, 0); tower.add(sheave);
  sheave.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 32), iron));
  for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 0.03), iron); sp.rotation.z = (i / 6) * Math.PI; sheave.add(sp); }
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), iron); ch.position.set(0, -0.3, s * 0.12); ch.rotation.x = s * 0.1; sheave.add(ch); }

  // the platform, with its crosshead and the wagon spring the rope pulls on
  const plat = new THREE.Group(); scene.add(plat);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 1.7), planks); deck.castShadow = deck.receiveShadow = true; plat.add(deck);
  for (const s of [-1, 1]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.2, 0.1), timber); edge.position.set(0, -0.04, s * 0.86); plat.add(edge);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.55, 0.08), iron); bar.position.set(s * 1.04, 1.3, 0); bar.castShadow = true; plat.add(bar);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.12, 0.14), timber); cross.position.set(0, 2.6, 0); cross.castShadow = true; plat.add(cross);
  const spring = new THREE.Mesh(new THREE.BufferGeometry(), iron); spring.castShadow = true; plat.add(spring);
  const pawls = [-1, 1].map((s) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.08), iron); plat.add(p); return p; });
  const springAt = (h, half) => {
    const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16 * 2 - 1; pts.push(new THREE.Vector3(u * half, 2.68 + h * (1 - u * u), 0)); }
    spring.geometry.dispose(); spring.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.022, 6, false);
    pawls[0].position.set(-half - 0.04, 2.68, 0); pawls[1].position.set(half + 0.04, 2.68, 0);
  };
  // cargo
  const crateMat = new THREE.MeshStandardMaterial({ ...loadPH('weathered_brown_planks', 1), color: '#c4a888' });
  for (const [x, z, sz, ry] of [[0.62, -0.35, 0.5, 0.2], [0.75, 0.25, 0.42, -0.1], [0.66, -0.3, 0.36, 0.5]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), crateMat); b.position.set(x, 0.07 + sz / 2 + (sz < 0.4 ? 0.5 : 0), z); b.rotation.y = ry; b.castShadow = b.receiveShadow = true; plat.add(b);
  }
  {
    const prof = []; for (let i = 0; i <= 10; i++) { const u = i / 10; prof.push(new THREE.Vector2(0.24 + 0.05 * Math.sin(u * Math.PI), u * 0.75)); }
    const barrel = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), new THREE.MeshStandardMaterial({ ...loadPH('rough_wood', 1), color: '#9a7a5a' })); barrel.position.set(-0.85, 0.07, -0.45); barrel.castShadow = true; plat.add(barrel);
    for (const y of [0.12, 0.63]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.012, 6, 24), iron); hoop.rotation.x = Math.PI / 2; hoop.position.set(-0.85, 0.07 + y, -0.45); plat.add(hoop); }
  }
  // Otis himself, top hat on
  const otis = cloneMannequin({ scene: SkeletonUtils.clone(gltf.scene), animations: gltf.animations }, { bodyColor: '#3b3027', jointColor: '#1c1611' });
  otis.mixer.clipAction(otis.clips.idle).play(); plat.add(otis.root); otis.root.position.set(-0.15, 0.07, 0.15); otis.root.rotation.y = 0.28;
  {
    const hm = new THREE.MeshStandardMaterial({ color: '#100d0b', roughness: 0.6 });
    const hat = new THREE.Group(); const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.095, 0.21, 20), hm); crown.position.y = 0.105;
    hat.add(crown, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 24), hm));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0955, 0.0955, 0.03, 20), new THREE.MeshStandardMaterial({ color: '#3a2c20' })); band.position.y = 0.03; hat.add(band);
    otis.bones.Head.add(hat); const s = 1 / otis.bones.Head.getWorldScale(new THREE.Vector3()).x; hat.scale.setScalar(s); hat.position.set(0, 0.16 * s, 0.01 * s); hat.rotation.x = -0.08;
  }
  // rope: upper piece to the sheave, lower piece hanging from the spring once cut
  const ropeMat = new THREE.MeshStandardMaterial({ color: '#b39a72', roughness: 1 });
  const ropeUp = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 8), ropeMat); ropeUp.castShadow = true; scene.add(ropeUp);
  const ropeLow = new THREE.Mesh(new THREE.BufferGeometry(), ropeMat); ropeLow.castShadow = true; plat.add(ropeLow);
  const chips = new Puffs(90, { map: streakTex(), additive: true, renderOrder: 9 }); scene.add(chips.mesh);
  const dust = new Puffs(160, { renderOrder: 6 }); scene.add(dust.mesh);
  // the crowd
  const crowd = []; const cr = rng(1854);
  for (let i = 0; i < 34; i++) {
    const sp = makeSpectator(cr); const near = i < 12;
    const x = near ? -2.6 + (i / 11) * 6.5 + (cr() - 0.5) * 0.4 : -9 + cr() * 18, z = near ? 5.6 + cr() * 1.6 : (cr() < 0.5 ? 3 + cr() * 3 : -3 - cr() * 4);
    sp.position.set(x, 0, z); sp.rotation.y = Math.PI + (cr() - 0.5) * 0.5 + (z < 0 ? Math.PI : 0); sp.scale.setScalar(0.94 + cr() * 0.12);
    sp.userData.ph = cr() * 6; scene.add(sp); crowd.push(sp);
  }

  const CUT = 1.6;   // seconds into the shot
  function update(s, cam, project) {
    // platform: hangs still, rope cut at CUT, free fall for ~0.13 s, the pawls bite, it stops dead
    const tf = Math.sqrt(2 * DROP / 9.81);
    const ds = s - CUT; const drop = ds <= 0 ? 0 : ds < tf ? 0.5 * 9.81 * ds * ds : DROP + Math.exp(-(ds - tf) * 30) * Math.sin((ds - tf) * 70) * -0.008;
    plat.position.y = DECK_Y - drop;
    const cutK = smooth(CUT, CUT + 0.07, s);
    springAt(lerp(0.17, 0.03, cutK), lerp(0.92, 1.12, cutK));
    // rope geometry
    const attach = new THREE.Vector3(0, 2.68 + lerp(0.17, 0.03, cutK) + DECK_Y - drop, 0);
    const cutY = DECK_Y + 3.3, top = TOWER_H + 0.75;
    const recoil = ds > 0 ? 1.8 * (1 - Math.exp(-ds * 7)) : 0, sway = ds > 0 ? Math.sin(ds * 9) * 0.25 * Math.exp(-ds * 2.5) : 0;
    const lowEnd = ds > 0 ? cutY + recoil : attach.y;
    ropeUp.scale.y = top - lowEnd; ropeUp.position.set(sway * 0.5, (top + lowEnd) / 2, 0); ropeUp.rotation.z = -sway * 0.08;
    ropeLow.visible = ds > 0;
    if (ds > 0) {
      const L = cutY - (attach.y + drop), th = 2.7 * smooth(0, 0.75, ds), pts = [];
      for (let i = 0; i <= 14; i++) { const u = i / 14, a = th * Math.pow(u, 0.8); pts.push(new THREE.Vector3(Math.sin(a) * 0.1 * u, 2.71 + Math.cos(a) * L * u * (1 - 0.3 * smooth(0, 0.75, ds)), Math.sin(a) * L * u * 0.5 + 0.03 * u)); }
      ropeLow.geometry.dispose(); ropeLow.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.022, 6, false);
    }
    // chips + sparks where the axe goes through, dust shaken off the deck when it stops
    const r = rng(77);
    for (let i = 0; i < chips.n; i++) {
      const life = ds > 0 ? ds * (1.6 + r() * 1.5) : -1, dir = new THREE.Vector3(r() - 0.5, r() * 0.8 - 0.2, r() - 0.5).normalize();
      const p = new THREE.Vector3(0, cutY, 0).addScaledVector(dir, Math.max(0, life) * 1.4); p.y -= 2.0 * Math.max(0, life) * Math.max(0, life);
      const p0 = project(p, cam), p1 = project(p.clone().addScaledVector(dir, 0.1), cam);
      chips.set(i, p.x, p.y, p.z, 0.01 + r() * 0.012, life > 0 && life < 1 ? (1 - life) * 1.4 : 0, 1.0, 0.8, 0.55, Math.atan2(-(p1.y - p0.y), p1.x - p0.x), 6);
    }
    chips.commit();
    const r2 = rng(78), stopT = CUT + tf;
    for (let i = 0; i < dust.n; i++) {
      const l = s - stopT, x = (r2() - 0.5) * 2.4, z = (r2() - 0.5) * 1.8, vy = r2() * 0.5, vx = (r2() - 0.5) * 0.8;
      dust.set(i, x + vx * Math.max(0, l), DECK_Y - DROP - 0.05 + vy * Math.max(0, l) - 0.3 * Math.max(0, l) * Math.max(0, l), z, 0.06 + r2() * 0.12, l > 0 ? 0.22 * Math.exp(-l * 1.2) : 0, 0.75, 0.66, 0.55);
    }
    dust.commit();
    // Otis: presenting, a jolt, then arms wide ("All safe, gentlemen!")
    otis.mixer.setTime(s * 0.9 + 1.0); otis.root.updateMatrixWorld(true);
    const jolt = ds > 0 ? Math.exp(-ds * 6) * smooth(0, 0.05, ds) : 0, open = smooth(CUT + 0.55, CUT + 1.15, s);
    offsetBone(otis, 'RightArm', 0, 0.35 * (1 - open), -2.15 * (1 - open) - 1.75 * open);
    offsetBone(otis, 'RightForeArm', 0, 0.25 * (1 - open) + 0.15 * open, 0);
    offsetBone(otis, 'LeftArm', 0, 0, 1.75 * open);
    offsetBone(otis, 'LeftForeArm', 0, -0.15 * open, 0);
    offsetBone(otis, 'Spine', 0.12 * jolt, 0, 0); offsetBone(otis, 'Head', -0.12 * open, 0, 0);
    offsetBone(otis, 'LeftUpLeg', -0.25 * jolt, 0, 0); offsetBone(otis, 'RightUpLeg', -0.25 * jolt, 0, 0); offsetBone(otis, 'LeftLeg', 0.45 * jolt, 0, 0); offsetBone(otis, 'RightLeg', 0.45 * jolt, 0, 0);
    // crowd: gasps at the cut, then cheers and raises hats
    const cheer = smooth(CUT + 0.9, CUT + 1.5, s);
    crowd.forEach((p, i) => {
      const b = Math.sin(s * 7 + p.userData.ph) * 0.03 * cheer; p.position.y = Math.max(0, b);
      const raise = p.userData.kind < 0.8 && i % 3 !== 1 ? cheer * smooth(0, 1, Math.sin(s * 2 + p.userData.ph) * 0.5 + 0.6) : 0;
      const ang = raise * 2.5; p.userData.arm.rotation.z = ang;
      const hx = 0.24 + Math.sin(ang) * 0.62, hy = 1.42 - Math.cos(ang) * 0.62;
      p.userData.hat.position.set(lerp(0, hx, smooth(0, 0.5, raise)), lerp(1.69, hy + 0.05, smooth(0, 0.5, raise)), 0);
    });
    return { shake: ds > 0 && ds < 0.6 ? Math.exp(-(ds - tf) * 6) * 0.006 * (ds > tf ? 1 : 0.2) : 0, flash: ds > 0 && ds < 0.12 ? (1 - ds / 0.12) * 0.25 : 0 };
  }
  return { scene, update, plat, otis, DECK_Y };
}
