// Posing for Rocketbox avatars (bones renamed to Mixamo names by rocketbox.js): world-space IK on top of the bind pose,
// so the Biped bone axes never matter. Every pose is rebuilt from the rest pose each frame (a pure function of t).
import * as THREE from 'three';
import { twoBoneIK, aimBone, orientHand } from './elevator.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(new THREE.Vector3());

export function resetPose(av) {
  for (const [k, b] of Object.entries(av.bones)) b.quaternion.copy(av.rest[k]);
  av.root.updateMatrixWorld(true);
}
// rotate a bone about a world axis by `a` radians (keeps its children attached)
export function rotW(bone, axis, a) {
  if (!bone || Math.abs(a) < 1e-6) return;
  bone.updateWorldMatrix(true, false);
  const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion()), wq = bone.getWorldQuaternion(new THREE.Quaternion());
  const nw = new THREE.Quaternion().setFromAxisAngle(axis, a).multiply(wq);
  bone.quaternion.copy(pq.invert().multiply(nw)); bone.updateMatrixWorld(true);
}
// body frame from the skeleton: fwd (the way the avatar faces), left, up
export function bodyFrame(av) {
  av.root.updateMatrixWorld(true);
  const fwd = V(0, 0, 1).applyQuaternion(av.root.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize();
  const left = V(0, 1, 0).cross(fwd).normalize();
  return { fwd, left, up: V(0, 1, 0) };
}
// turn the head (neck 40 %, head 60 %) toward a world point, limited to +-70° yaw and +-35° pitch
export function lookAt(av, target, k = 1) {
  const B = av.bones; if (!B.Head) return;
  const { fwd, left } = bodyFrame(av);
  const h = wp(B.Head), d = target.clone().sub(h).normalize();
  const yaw = THREE.MathUtils.clamp(Math.atan2(d.dot(left), d.dot(fwd)), -1.2, 1.2) * k;
  const pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)), -0.6, 0.6) * k;
  for (const [b, f] of [[B.Neck, 0.4], [B.Head, 0.6]]) {
    rotW(b, V(0, 1, 0), yaw * f);
    const lf = bodyFrame(av).left.clone().applyAxisAngle(V(0, 1, 0), yaw * f);
    rotW(b, lf, -pitch * f);
  }
}
// curl the four fingers toward the palm (and the thumb a little)
export function curlFingers(av, side, curl = 0.35, thumb = 0.2) {
  const B = av.bones, hand = B[side + 'Hand']; if (!hand || !B[side + 'HandMiddle1']) return;
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) {
    for (let j = 1; j <= 3; j++) {
      const b = B[side + 'Hand' + f + j], c = B[side + 'Hand' + f + (j + 1)] || null; if (!b) continue;
      const pa = wp(b), pc = c ? wp(c) : null;
      const fdir = pc ? pc.clone().sub(pa).normalize() : wp(b).sub(wp(hand)).normalize();
      const lat = wp(B[side + 'HandIndex1']).sub(wp(B[side + 'HandPinky1'])).normalize();
      const palm = side === 'Right' ? lat.clone().cross(fdir) : fdir.clone().cross(lat);
      const axis = fdir.clone().cross(palm).normalize();
      rotW(b, axis, curl * (j === 1 ? 0.7 : 1.0));
    }
  }
  const t1 = B[side + 'HandThumb1'];
  if (t1) { const lat = wp(B[side + 'HandIndex1']).sub(wp(B[side + 'HandPinky1'])).normalize(); rotW(t1, lat, thumb * (side === 'Right' ? 1 : -1)); }
}
// lowest skinned vertex (world y), sampled
const _sv = new THREE.Vector3();
export function lowestY(av, step = 7) {
  let m = Infinity;
  av.root.updateMatrixWorld(true);
  for (const mesh of av.meshes) {
    if (!mesh.isSkinnedMesh) continue;
    mesh.skeleton.update();
    const n = mesh.geometry.attributes.position.count;
    for (let i = 0; i < n; i += step) { mesh.getVertexPosition(i, _sv); _sv.applyMatrix4(mesh.matrixWorld); if (_sv.y < m) m = _sv.y; }
  }
  return m;
}

// lowest clearance of the skinned vertices above a ground function g(x, z) (sloping beaches, towels)
export function lowestAbove(av, g, step = 7) {
  let m = Infinity;
  av.root.updateMatrixWorld(true);
  for (const mesh of av.meshes) {
    if (!mesh.isSkinnedMesh) continue;
    mesh.skeleton.update();
    const n = mesh.geometry.attributes.position.count;
    for (let i = 0; i < n; i += step) { mesh.getVertexPosition(i, _sv); _sv.applyMatrix4(mesh.matrixWorld); const c = _sv.y - g(_sv.x, _sv.z); if (c < m) m = c; }
  }
  return m;
}

// sitting on the ground. o: { pos (ground point under the pelvis), yaw, legs: 'up'|'cross'|'out', arms: 'behind'|'knees'|'lap',
// lean (rad, + forward), look (world point), breath (0..1 phase), curl, groundAt (x, z) -> y for sloping ground }
export function sit(av, o) {
  const B = av.bones;
  resetPose(av);
  av.root.position.copy(o.pos); av.root.rotation.set(0, o.yaw || 0, 0); av.root.updateMatrixWorld(true);
  const seat = o.seat ?? 0.12;
  av.root.position.y += (o.pos.y + seat) - wp(B.Hips).y; av.root.updateMatrixWorld(true);
  const { fwd, left, up } = bodyFrame(av);
  const P = wp(B.Hips);
  const ground = o.pos.y, gAt = o.groundAt || (() => ground);
  // torso
  const lean = (o.lean ?? 0) + (o.breath ? Math.sin(o.breath * Math.PI * 2) * 0.012 : 0);
  rotW(B.Spine, left, lean * 0.45); rotW(B.Spine1, left, lean * 0.3); rotW(B.Spine2, left, lean * 0.25);
  if (o.twist) { rotW(B.Spine1, up, o.twist * 0.5); rotW(B.Spine2, up, o.twist * 0.5); }
  // legs
  const legs = o.legs || 'up';
  for (const [side, s] of [['Left', 1], ['Right', -1]]) {
    let foot, pole, toe;
    if (legs === 'up') {
      foot = P.clone().addScaledVector(fwd, 0.46 + (o.spread ?? 0) * 0.05).addScaledVector(left, s * (0.16 + (o.spread ?? 0) * 0.08)); foot.y = gAt(foot.x, foot.z) + 0.085;
      pole = P.clone().addScaledVector(fwd, 0.5).addScaledVector(up, 0.8).addScaledVector(left, s * 0.25);
      toe = foot.clone().addScaledVector(fwd, 0.14); toe.y = gAt(toe.x, toe.z) + 0.02;
    } else if (legs === 'cross') {
      foot = P.clone().addScaledVector(fwd, 0.3 + (s > 0 ? 0.04 : 0)).addScaledVector(left, -s * 0.13); foot.y = gAt(foot.x, foot.z) + 0.07 + (s > 0 ? 0.0 : 0.03);
      pole = P.clone().addScaledVector(left, s * 0.9).addScaledVector(fwd, 0.35).addScaledVector(up, 0.12);
      toe = foot.clone().addScaledVector(left, -s * 0.12).addScaledVector(fwd, 0.04); toe.y = foot.y - 0.02;
    } else if (legs === 'chair') {   // sitting on a seat: feet on the floor (o.floor) in front, shins near vertical
      const fl = o.floor ?? ground;
      foot = P.clone().addScaledVector(fwd, 0.5).addScaledVector(left, s * 0.13); foot.y = fl + 0.085;
      pole = P.clone().addScaledVector(fwd, 1.2).addScaledVector(up, 0.4).addScaledVector(left, s * 0.15);
      toe = foot.clone().addScaledVector(fwd, 0.14); toe.y = fl + 0.02;
    } else {   // out: stretched, one knee slightly bent
      foot = P.clone().addScaledVector(fwd, s > 0 ? 0.86 : 0.72).addScaledVector(left, s * 0.17); foot.y = gAt(foot.x, foot.z) + 0.07;
      pole = P.clone().addScaledVector(fwd, 0.4).addScaledVector(up, 1.0);
      toe = foot.clone().addScaledVector(up, 0.14).addScaledVector(fwd, 0.04);
    }
    twoBoneIK(av, side + 'UpLeg', side + 'Leg', side + 'Foot', foot, pole);
    if (B[side + 'ToeBase']) aimBone(B[side + 'Foot'], wp(B[side + 'ToeBase']), toe);
  }
  // arms
  const arms = o.arms || 'knees';
  for (const [side, s] of [['Left', 1], ['Right', -1]]) {
    let hand, pole, F, N;
    if (arms === 'behind') {
      hand = P.clone().addScaledVector(fwd, -0.24).addScaledVector(left, s * 0.3); hand.y = gAt(hand.x, hand.z) + 0.03;
      pole = P.clone().addScaledVector(fwd, -0.7).addScaledVector(left, s * 0.55).addScaledVector(up, 0.5);
      F = fwd.clone().multiplyScalar(-0.6).addScaledVector(left, s * 0.6).normalize(); N = V(0, -1, 0);
    } else if (arms === 'knees') {
      const knee = wp(B[side + 'Leg']);
      hand = knee.clone().addScaledVector(up, 0.06).addScaledVector(fwd, 0.03).addScaledVector(left, s * 0.03);
      pole = wp(B[side + 'Arm']).addScaledVector(left, s * 0.5).addScaledVector(up, -0.5).addScaledVector(fwd, -0.2);
      F = fwd.clone().addScaledVector(up, -0.6).normalize(); N = V(0, -1, 0).addScaledVector(fwd, -0.3).normalize();
    } else {   // lap
      hand = P.clone().addScaledVector(fwd, 0.24).addScaledVector(left, s * 0.1).addScaledVector(up, 0.12);
      pole = wp(B[side + 'Arm']).addScaledVector(left, s * 0.6).addScaledVector(up, -0.6).addScaledVector(fwd, -0.3);
      F = fwd.clone().addScaledVector(left, -s * 0.5).normalize(); N = V(0, -1, 0);
    }
    if (o.handL && side === 'Left') ({ hand, pole, F, N } = o.handL(P, fwd, left, up));
    if (o.handR && side === 'Right') ({ hand, pole, F, N } = o.handR(P, fwd, left, up));
    twoBoneIK(av, side + 'Arm', side + 'ForeArm', side + 'Hand', hand, pole);
    if (F && N) orientHand(av, side, F, N);
    curlFingers(av, side, o.curl ?? 0.3, 0.15);
  }
  if (o.look) lookAt(av, o.look, o.lookK ?? 1);
  // rest on the ground: lowest vertex 4 mm above it
  if (legs === 'chair') return;   // the hips sit at pos.y + seat; the feet reach the floor (nothing to lift)
  if (o.groundAt) { av.root.position.y += 0.004 - lowestAbove(av, o.groundAt); av.root.updateMatrixWorld(true); return; }
  const low = lowestY(av);
  av.root.position.y += (ground + 0.004) - low; av.root.updateMatrixWorld(true);
}

// standing (idle / throwing / reaching). o: { pos, yaw, look, armL/armR: fn -> {hand, pole, F, N}, weight (-1..1 hip shift) }
export function stand(av, o) {
  const B = av.bones;
  resetPose(av);
  av.root.position.copy(o.pos); av.root.rotation.set(0, o.yaw || 0, 0); av.root.updateMatrixWorld(true);
  const { fwd, left, up } = bodyFrame(av);
  const ground = o.pos.y, gAt = o.groundAt || (() => ground);
  if (o.lean) { rotW(B.Spine, left, o.lean * 0.5); rotW(B.Spine1, left, o.lean * 0.5); }
  if (o.twist) { rotW(B.Spine1, up, o.twist * 0.5); rotW(B.Spine2, up, o.twist * 0.5); }
  if (o.breath != null) { const b = Math.sin(o.breath * Math.PI * 2); rotW(B.Spine1, left, b * 0.012); rotW(B.Spine2, left, b * 0.009); }   // breathing
  const P = wp(B.Hips);
  for (const [side, s] of [['Left', 1], ['Right', -1]]) {
    const foot = P.clone().addScaledVector(left, s * 0.12).addScaledVector(fwd, (o.stride ?? 0) * s * 0.18); foot.y = gAt(foot.x, foot.z) + 0.08;
    const pole = P.clone().addScaledVector(fwd, 1.0).addScaledVector(up, -0.4);
    twoBoneIK(av, side + 'UpLeg', side + 'Leg', side + 'Foot', foot, pole);
    if (B[side + 'ToeBase']) { const toe = foot.clone().addScaledVector(fwd, 0.15); toe.y = gAt(toe.x, toe.z) + 0.02; aimBone(B[side + 'Foot'], wp(B[side + 'ToeBase']), toe); }
  }
  for (const [side, s] of [['Left', 1], ['Right', -1]]) {
    const fn = side === 'Left' ? o.armL : o.armR;
    const sh = wp(B[side + 'Arm']);
    const def = { hand: sh.clone().addScaledVector(up, -0.56).addScaledVector(left, s * 0.12).addScaledVector(fwd, 0.04), pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.6).addScaledVector(left, s * 0.2), F: V(0, -1, 0).addScaledVector(fwd, 0.15).normalize(), N: left.clone().multiplyScalar(-s) };
    const a = fn ? fn(sh, fwd, left, up) : def;
    twoBoneIK(av, side + 'Arm', side + 'ForeArm', side + 'Hand', a.hand, a.pole);
    if (a.F && a.N) orientHand(av, side, a.F, a.N);
    curlFingers(av, side, a.curl ?? 0.35, 0.15);
  }
  if (o.look) lookAt(av, o.look, o.lookK ?? 1);
  if (o.groundAt) { av.root.position.y += 0.004 - lowestAbove(av, o.groundAt); av.root.updateMatrixWorld(true); return; }
  const low = lowestY(av);
  av.root.position.y += (ground + 0.004) - low; av.root.updateMatrixWorld(true);
}
