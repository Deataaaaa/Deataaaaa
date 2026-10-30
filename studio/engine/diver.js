// The diver ("you"): the realistic human rig (Michelle.glb) in a black 7 mm wetsuit and neoprene gloves.
// POV: the head is hidden and the camera sits at the eyes; only the arms and hands are seen, with a dive computer on
// the left wrist and a dive light strapped to the right forearm. Third person: a hood with a mask and regulator
// replaces the head, plus a tank, fins and the mesh catch bag. Every strap and case is sized from the arm mesh
// itself, so nothing passes through the skin.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { cloneHuman, twoBoneIK, orientHand, offsetBone, aimBone } from './elevator.js';
import { waterize } from './ocean.js';
import { canvasTex } from './assets.js';
import { rng, clamp, lerp, smooth } from './core.js';

function knitNormal() {
  return canvasTex(256, 256, (g) => {
    const N = 256, img = g.createImageData(N, N), d = img.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const w = (2 * Math.PI) / N; const nx = Math.sin(x * w * 64) * 0.18 + Math.sin((x + y) * w * 36) * 0.05, ny = Math.sin(y * w * 64 + Math.sin(x * w * 32)) * 0.18;
      const l = Math.hypot(nx, ny, 1), k = (y * N + x) * 4;
      d[k] = (nx / l * 0.5 + 0.5) * 255; d[k + 1] = (ny / l * 0.5 + 0.5) * 255; d[k + 2] = (1 / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true, linear: true });
}

export function makeDiver(gltf, { env = null } = {}) {
  const me = cloneHuman(gltf);
  let skinned = null; me.root.traverse((o) => { if (o.isSkinnedMesh) skinned = o; });
  const geo = skinned.geometry, bones = skinned.skeleton.bones;
  const bi = (n) => bones.findIndex((b) => b.name.replace('mixamorig', '').replace(':', '') === n);
  const handIdx = new Set(bones.map((b, i) => (/Hand/.test(b.name) ? i : -1)).filter((i) => i >= 0));
  const headIdx = new Set([bi('Head'), bi('HeadTop_End')]), neckIdx = bi('Neck');
  const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, n = si.count;
  const aGlove = new Float32Array(n), aHide = new Float32Array(n), aNeck = new Float32Array(n);
  for (let v = 0; v < n; v++) for (let k = 0; k < 4; k++) {
    const b = si.getComponent(v, k), w = sw.getComponent(v, k);
    if (handIdx.has(b)) aGlove[v] += w; if (headIdx.has(b)) aHide[v] += w; if (b === neckIdx) aNeck[v] += w;
  }
  geo.setAttribute('aGlove', new THREE.BufferAttribute(aGlove, 1)); geo.setAttribute('aHide', new THREE.BufferAttribute(aHide, 1)); geo.setAttribute('aNeck', new THREE.BufferAttribute(aNeck, 1));
  const knit = knitNormal(); knit.repeat.set(40, 40);
  const suit = new THREE.MeshPhysicalMaterial({ color: '#101113', roughness: 0.66, metalness: 0, normalMap: knit, normalScale: new THREE.Vector2(0.35, 0.35), sheen: 0.3, sheenColor: new THREE.Color('#2f343a'), sheenRoughness: 0.6, envMap: env, envMapIntensity: 0.2 });
  waterize(suit, { caustic: 0.8 });
  const hideU = { value: 1 }, neckU = { value: 1 };
  { const prev = suit.onBeforeCompile;
    suit.onBeforeCompile = (sh) => { prev(sh); sh.uniforms.uHideHead = hideU; sh.uniforms.uHideNeck = neckU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlove, aHide, aNeck; varying float vGlove, vHide, vNeck;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlove = aGlove; vHide = aHide; vNeck = aNeck;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uHideHead, uHideNeck; varying float vGlove, vHide, vNeck;')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if (uHideHead > 0.5 && (vHide > 0.3 || vNeck * uHideNeck > 0.45)) discard;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float gl = smoothstep(0.35, 0.65, vGlove);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.032, 0.034, 0.037), gl);
          diffuseColor.rgb *= 1.0 - 0.45 * smoothstep(0.12, 0.0, abs(vGlove - 0.5));   // cuff seam`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.78, smoothstep(0.35, 0.65, vGlove));'); };
    suit.customProgramCacheKey = () => 'water-suit'; }
  skinned.material = suit; skinned.castShadow = true; skinned.receiveShadow = true; skinned.frustumCulled = false;
  const B = me.bones;

  // measure the wrist and forearm from the bind pose (T-pose, arms along ±x, palms down)
  me.root.updateMatrixWorld(true);
  const bindPos = geo.attributes.position;
  function armSection(side, along) {   // section of the forearm at a fraction `along` from the elbow (0) to the wrist (1)
    const el = B[side + 'ForeArm'].getWorldPosition(new THREE.Vector3()), wr = B[side + 'Hand'].getWorldPosition(new THREE.Vector3());
    const ax = wr.clone().sub(el), Lf = ax.length(); ax.normalize();
    const c = el.clone().addScaledVector(ax, Lf * along);
    let ymin = 1e9, ymax = -1e9, zmin = 1e9, zmax = -1e9, rmax = 0, cnt = 0;
    const fi = bi(side + 'ForeArm'), hi = bi(side + 'Hand');
    for (let v = 0; v < n; v++) {
      let w = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(v, k); if (b === fi || b === hi) w += sw.getComponent(v, k); }
      if (w < 0.5) continue;
      const p = new THREE.Vector3(bindPos.getX(v), bindPos.getY(v), bindPos.getZ(v)); skinned.applyBoneTransform(v, p); p.applyMatrix4(skinned.matrixWorld);
      const d = p.clone().sub(c); const t = d.dot(ax); if (Math.abs(t) > 0.02) continue;
      const rad = d.addScaledVector(ax, -t);
      cnt++; ymin = Math.min(ymin, rad.y); ymax = Math.max(ymax, rad.y); zmin = Math.min(zmin, rad.z); zmax = Math.max(zmax, rad.z); rmax = Math.max(rmax, rad.length());
    }
    return { up: ymax, down: -ymin, front: zmax, back: -zmin, r: rmax, Lf, cnt };
  }
  const secL = armSection("Left", 0.8), secR = armSection("Right", 0.45), secR2 = armSection("Right", 0.75);
  const upMaxR = Math.max(...[0.35, 0.45, 0.55, 0.65, 0.75, 0.85].map((f) => armSection('Right', f).up));

  // ---------- dive computer on the left forearm, just above the wrist ----------
  const screenC = document.createElement('canvas'); screenC.width = 256; screenC.height = 256; const sg = screenC.getContext('2d');
  const screenT = new THREE.CanvasTexture(screenC); screenT.colorSpace = THREE.SRGBColorSpace;
  let screenKey = '';
  function drawScreen(depth, minutes, warn = false) {
    const key = depth.toFixed(1) + '|' + minutes + warn; if (key === screenKey) return; screenKey = key;
    sg.fillStyle = '#05080a'; sg.fillRect(0, 0, 256, 256);
    sg.fillStyle = warn ? '#ff4a3a' : '#e8f6ff'; sg.font = '700 92px "JetBrains Mono", monospace'; sg.textAlign = 'center';
    sg.fillText(depth.toFixed(1), 128, 132); sg.font = '500 30px "JetBrains Mono", monospace'; sg.fillStyle = '#7fd6ff'; sg.fillText('m', 210, 130);
    sg.fillStyle = '#9fb6c2'; sg.font = '500 26px "JetBrains Mono", monospace'; sg.fillText(`${minutes} min  ·  13°C`, 128, 196);
    sg.strokeStyle = '#25333b'; sg.lineWidth = 4; sg.strokeRect(14, 14, 228, 228);
    screenT.needsUpdate = true;
  }
  drawScreen(14.2, 23);
  const caseMat = waterize(new THREE.MeshStandardMaterial({ color: '#1b1d20', roughness: 0.45, metalness: 0.2 }));
  const bezelMat = waterize(new THREE.MeshStandardMaterial({ color: '#8d949b', roughness: 0.3, metalness: 0.9 }));
  const strapMat = waterize(new THREE.MeshStandardMaterial({ color: '#0e0f11', roughness: 0.7, metalness: 0 }));
  const screenMat = new THREE.MeshBasicMaterial({ map: screenT, toneMapped: true });
  const computer = new THREE.Group();
  { // band: elliptical ring hugging the measured forearm section (+3 mm clearance), case on the back of the arm
    // ring centreline sits one tube radius outside the skin (+3 mm), so its inner edge never touches the arm
    const f = 0.06, a = (Math.max(secL.front, secL.back) + 0.002) / (1 - f), b = (Math.max(secL.up, secL.down) + 0.002) / (1 - f);
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, f, 8, 40), strapMat); band.scale.set(b, a, 0.16);
    // torus lies in its local xy plane; we orient x = back-of-arm direction, z = along the forearm
    computer.add(band);
    const top = b * (1 + f) - 0.001;
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.044, 0.044, 0.012, 3, 0.006), caseMat); body.position.set(top + 0.006, 0, 0); body.rotation.y = Math.PI / 2; computer.add(body);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.002, 6, 28), bezelMat); bezel.position.set(top + 0.0122, 0, 0); bezel.rotation.y = Math.PI / 2; computer.add(bezel);
    const scr = new THREE.Mesh(new THREE.CircleGeometry(0.017, 32), screenMat); scr.position.set(top + 0.0121, 0, 0); scr.rotation.y = Math.PI / 2; computer.add(scr);
    computer.userData = { b, top };
  }
  // ---------- dive light strapped along the right forearm ----------
  const torch = new THREE.Group();
  const torchMat = waterize(new THREE.MeshStandardMaterial({ color: '#202326', roughness: 0.35, metalness: 0.6 }));
  const lensMat = new THREE.MeshBasicMaterial({ color: '#fff7e6' });
  const tR = 0.02, tL = 0.12;
  const torchAt = 0.6;
  { const fr = 0.06; let strapTop = upMaxR + 0.002;
    const zs = [-(torchAt - 0.45) * secR.Lf, (0.75 - torchAt) * secR.Lf];
    for (const [s, z] of [[secR, zs[0]], [secR2, zs[1]]]) {   // two straps, each sized to its own section of the forearm
      const a = (Math.max(s.front, s.back) + 0.002) / (1 - fr), b = (Math.max(s.up, s.down, upMaxR) + 0.002) / (1 - fr);
      const band = new THREE.Mesh(new THREE.TorusGeometry(1, fr, 8, 40), strapMat); band.scale.set(b, a, 0.14); band.position.z = z; torch.add(band);
      strapTop = Math.max(strapTop, b * (1 + fr));
    }
    // mounting plate resting on the straps, the light on the plate
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.004, 0.034, zs[1] - zs[0] + 0.03, 2, 0.0015), torchMat); plate.position.set(strapTop + 0.002, 0, (zs[0] + zs[1]) / 2); torch.add(plate);
    const offR = strapTop + 0.004;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(tR, tR, tL, 20), torchMat); body.rotation.x = Math.PI / 2; body.position.set(offR + tR, 0, 0.0); torch.add(body);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(tR * 1.25, tR, 0.03, 20), torchMat); head.rotation.x = Math.PI / 2; head.position.set(offR + tR, 0, tL / 2 + 0.012); torch.add(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(tR * 1.1, 20), lensMat); lens.position.set(offR + tR, 0, tL / 2 + 0.0275); torch.add(lens);
    torch.userData = { lensLocal: new THREE.Vector3(offR + tR, 0, tL / 2 + 0.03) };
  }
  torch.visible = false;
  me.root.add(computer); me.root.add(torch);   // re-parented to world space every frame (see place())

  // ---------- third person: hood + mask + regulator, tank, fins (world-space objects, placed from the bones) ----------
  const extras = new THREE.Group(); extras.visible = false;
  const hoodMat = waterize(new THREE.MeshPhysicalMaterial({ color: '#111214', roughness: 0.66, sheen: 0.3, sheenColor: new THREE.Color('#2f343a'), envMap: env, envMapIntensity: 0.2 }));
  const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), hoodMat); extras.add(hood);
  const mask = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.08, 0.06, 3, 0.022), waterize(new THREE.MeshPhysicalMaterial({ color: '#0b0c0e', roughness: 0.12, metalness: 0.3, clearcoat: 1, envMap: env }))); extras.add(mask);
  const reg = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.06, 0.05, 2, 0.015), waterize(new THREE.MeshStandardMaterial({ color: '#151618', roughness: 0.5 }))); extras.add(reg);
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.092, 0.5, 6, 18), waterize(new THREE.MeshStandardMaterial({ color: '#9aa2a8', roughness: 0.35, metalness: 0.7, envMap: env }))); extras.add(tank);
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 10), waterize(new THREE.MeshStandardMaterial({ color: '#6b7076', roughness: 0.3, metalness: 0.9 }))); extras.add(valve);
  const finMat = waterize(new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.5, side: THREE.DoubleSide }));
  const fins = ['Left', 'Right'].map(() => { const g = new THREE.Group(); const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.11, 0.3, 3, 0.045), finMat); pocket.position.z = 0.08; g.add(pocket);
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.52, 1, 6), finMat); blade.rotation.x = -Math.PI / 2; blade.position.set(0, -0.01, 0.48); g.add(blade); extras.add(g); return g; });
  const _m = new THREE.Matrix4();
  function placeExtras(fwd, upB) {
    // hood: centred on the skull (head joint + 9 cm along the body's up axis), big enough to swallow the hidden head
    const neck = wpos(B.Neck), head = wpos(B.Head);
    const hu = head.clone().sub(neck).normalize();
    const hc = head.clone().addScaledVector(hu, 0.085).addScaledVector(fwd, 0.015);
    const zf = fwd.clone().addScaledVector(hu, -fwd.dot(hu)).normalize(), xs = new THREE.Vector3().crossVectors(hu, zf);
    const q = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(xs, hu, zf));
    hood.position.copy(hc); hood.quaternion.copy(q); hood.scale.set(0.105, 0.135, 0.12);
    mask.position.copy(hc).addScaledVector(zf, 0.15).addScaledVector(hu, 0.015); mask.quaternion.copy(q);
    reg.position.copy(hc).addScaledVector(zf, 0.12).addScaledVector(hu, -0.075); reg.quaternion.copy(q);
    // tank on the back, along the spine
    const sp = wpos(B.Spine2), hips = wpos(B.Hips), axis = sp.clone().sub(hips).normalize();
    const back = upB.clone().negate().addScaledVector(axis, upB.dot(axis)).normalize();
    tank.position.copy(sp).addScaledVector(axis, -0.12).addScaledVector(back, 0.13 + 0.092 + 0.03);
    tank.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    valve.position.copy(tank.position).addScaledVector(axis, 0.36); valve.quaternion.copy(tank.quaternion);
    // fins: pocket around each foot, blade in line with the foot
    ['Left', 'Right'].forEach((side, i) => {
      const ft = wpos(B[side + 'Foot']), toe = wpos(B[side + 'ToeBase']); const dir = toe.clone().sub(ft).normalize();
      const sideAx = new THREE.Vector3().crossVectors(dir, upB).normalize(), upF = new THREE.Vector3().crossVectors(sideAx, dir).normalize();
      fins[i].position.copy(ft).addScaledVector(upF, -0.045); fins[i].quaternion.setFromRotationMatrix(_m.makeBasis(sideAx, upF, dir));
    });
  }

  const wpos = (b) => b.getWorldPosition(new THREE.Vector3());
  const wquat = (b) => b.getWorldQuaternion(new THREE.Quaternion());
  // straps and cases ride on the forearms: x = back of the arm (opposite the palm), z = toward the wrist
  function place(side, grp, along) {
    const el = wpos(B[side + 'ForeArm']), wr = wpos(B[side + 'Hand']);
    const ax = wr.clone().sub(el); const Lf = ax.length(); ax.normalize();
    // back-of-arm direction: the forearm bone's frame carries the twist; in the bind pose the back of the arm is +y
    const q = wquat(B[side + 'ForeArm']), q0 = me.bindForeArm[side];
    const back = new THREE.Vector3(0, 1, 0).applyQuaternion(q0.clone().invert()).applyQuaternion(q); back.addScaledVector(ax, -back.dot(ax)).normalize();
    const zz = ax, xx = back, yy = new THREE.Vector3().crossVectors(zz, xx);
    const m = new THREE.Matrix4().makeBasis(xx, yy, zz); m.setPosition(el.clone().addScaledVector(ax, Lf * along));
    me.root.updateMatrixWorld(true);
    grp.matrix.copy(me.root.matrixWorld.clone().invert().multiply(m)); grp.matrix.decompose(grp.position, grp.quaternion, grp.scale);
  }
  me.bindForeArm = { Left: wquat(B.LeftForeArm), Right: wquat(B.RightForeArm) };
  // hand lengths for reach checks
  const rest = Object.fromEntries(Object.entries(B).map(([k, b]) => [k, [b.quaternion.clone(), b.position.clone()]]));

  // relaxed glove fingers: a gentle curl on every finger joint (axis found on this rig: local z for the left hand)
  const FAX = new URLSearchParams(location.search).get('fax') || 'z';
  function fingers(side, curl = 0.35, spread = 0.0) {
    const s = side === 'Left' ? 1 : -1;
    const rot = (name, a, sp = 0) => { const v = { x: 0, y: 0, z: 0 }; v[FAX] = s * a; offsetBone(me, name, v.x, v.y + sp * s, v.z); };
    const fs = ['Index', 'Middle', 'Ring', 'Pinky'];
    fs.forEach((f, i) => { const sp = spread * (i - 1.2) * 0.12; rot(`${side}Hand${f}1`, curl * (0.85 + i * 0.1), sp); rot(`${side}Hand${f}2`, curl * (1.1 + i * 0.08)); rot(`${side}Hand${f}3`, curl * 0.7); });
    rot(`${side}HandThumb1`, curl * 0.25); rot(`${side}HandThumb2`, curl * 0.45); rot(`${side}HandThumb3`, curl * 0.5);
  }

  return {
    me, B, suit, computer, torch, extras, hood, mask, tank, fins, drawScreen, secL, secR, torchLens: () => torch.localToWorld(torch.userData.lensLocal.clone()),
    resetPose() { for (const [k, [q, p]] of Object.entries(rest)) { B[k].quaternion.copy(q); B[k].position.copy(p); } me.root.updateMatrixWorld(true); },
    // POV: body hangs behind the camera; arms by IK to targets given in camera space
    pov(cam, { L = null, R = null, curlL = 0.35, curlR = 0.35, spread = 0.3, bodyPitch = 1.15, torchOn = false } = {}) {
      hideU.value = 1; neckU.value = 1; extras.visible = false; computer.visible = true;
      this.resetPose();
      const Q = cam.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0))).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(bodyPitch, 0, 0)));
      me.root.quaternion.copy(Q); me.root.position.set(0, 0, 0); me.root.updateMatrixWorld(true);
      const head = wpos(B.Head);
      const off = new THREE.Vector3(0, -0.07, 0.05).applyQuaternion(cam.quaternion);    // head joint a little below/behind the eyes
      me.root.position.copy(cam.position).sub(head).add(off); me.root.updateMatrixWorld(true);
      const toW = (v) => v.clone().applyQuaternion(cam.quaternion).add(cam.position);
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), down = new THREE.Vector3(0, -1, 0).applyQuaternion(cam.quaternion);
      for (const [side, tgt] of [['Left', L], ['Right', R]]) {
        if (!tgt) continue;
        const s = side === 'Left' ? -1 : 1;
        const pole = toW(tgt.pole || new THREE.Vector3(s * 0.55, -0.55, 0.1));
        twoBoneIK(me, side + 'Arm', side + 'ForeArm', side + 'Hand', toW(tgt.p), pole);
        orientHand(me, side, (tgt.f ? tgt.f.clone().applyQuaternion(cam.quaternion) : fwd), (tgt.n ? tgt.n.clone().applyQuaternion(cam.quaternion) : down));
        fingers(side, side === 'Left' ? curlL : curlR, spread);
      }
      me.root.updateMatrixWorld(true);
      place('Left', computer, 0.8); place('Right', torch, torchAt); torch.visible = torchOn;
    },
    // third person: swimming along `dir`, belly toward `belly`; legs flutter-kick, hands to targets (world)
    third(pos, dir, t, { belly = new THREE.Vector3(0, -1, 0), kick = 1, handL = null, handR = null, tumble = null } = {}) {
      hideU.value = 1; neckU.value = 0; extras.visible = true; torch.visible = false; computer.visible = true;
      this.resetPose();
      const yW = dir.clone().normalize(), zW = belly.clone().addScaledVector(yW, -belly.dot(yW)).normalize(), xW = new THREE.Vector3().crossVectors(yW, zW);
      const Q = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(xW, yW, zW));
      if (tumble) Q.premultiply(tumble);
      me.root.quaternion.copy(Q); me.root.position.set(0, 0, 0); me.root.updateMatrixWorld(true);
      const hips0 = wpos(B.Hips); me.root.position.copy(pos).sub(hips0); me.root.updateMatrixWorld(true);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(Q), fwdB = new THREE.Vector3(0, 0, 1).applyQuaternion(Q), lat = new THREE.Vector3(1, 0, 0).applyQuaternion(Q);
      // legs: thighs swing about the hips, knees soft, feet pointed (in line with the shins)
      for (const [side, sg] of [['Left', 1], ['Right', -1]]) {
        const hp = wpos(B[side + 'UpLeg']), ph = t * 4.2 + (sg > 0 ? 0 : Math.PI);
        const swing = 0.22 * kick * Math.sin(ph);
        const footT = hp.clone().addScaledVector(up, -0.8).addScaledVector(fwdB, swing).addScaledVector(lat, sg * 0.06);
        twoBoneIK(me, side + 'UpLeg', side + 'Leg', side + 'Foot', footT, hp.clone().addScaledVector(fwdB, 1.0).addScaledVector(up, -0.4));
        me.root.updateMatrixWorld(true);
        const kn = wpos(B[side + 'Leg']), ft = wpos(B[side + 'Foot']), shin = ft.clone().sub(kn).normalize();
        aimBone(B[side + 'Foot'], wpos(B[side + 'ToeBase']), ft.clone().addScaledVector(shin, 0.15).addScaledVector(fwdB, -0.03));
        me.root.updateMatrixWorld(true);
      }
      for (const [side, tgt] of [['Left', handL], ['Right', handR]]) {
        if (!tgt) continue;
        const sg = side === 'Left' ? 1 : -1;
        twoBoneIK(me, side + 'Arm', side + 'ForeArm', side + 'Hand', tgt, wpos(B[side + 'Arm']).addScaledVector(lat, sg * 0.6).addScaledVector(fwdB, 0.3));
        fingers(side, 0.35, 0.4);
      }
      me.root.updateMatrixWorld(true);
      place('Left', computer, 0.8);
      placeExtras(fwdB, up);
      return { up, fwd: fwdB, lat };
    },
  };
}
