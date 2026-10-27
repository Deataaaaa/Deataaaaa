// Posing for Rocketbox avatars (bones renamed to Mixamo names by rocketbox.js): world-space IK on top of the bind pose,
// so the Biped bone axes never matter. Every pose is rebuilt from the rest pose each frame (a pure function of t).
import * as THREE from 'three';
import { twoBoneIK, aimBone, orientHand } from './elevator.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(new THREE.Vector3());

// POSE.lookFirst: turn the head before the arm IK. Rocketbox (Biped) clavicles hang off the Neck, so a look applied after the
// arms swings them and the hands drift off their targets (P2: up to 10 cm); old episodes keep the old order
export const POSE = { lookFirst: false };
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
export function curlFingers(av, side, curl = 0.35, thumb = 0.2, idx = null, pk = null) {
  const B = av.bones, hand = B[side + 'Hand']; if (!hand || !B[side + 'HandMiddle1']) return;
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) {
    for (let j = 1; j <= 3; j++) {
      const b = B[side + 'Hand' + f + j], c = B[side + 'Hand' + f + (j + 1)] || null; if (!b) continue;
      const pa = wp(b), pc = c ? wp(c) : null;
      const fdir = pc ? pc.clone().sub(pa).normalize() : wp(b).sub(wp(hand)).normalize();
      const lat = wp(B[side + 'HandIndex1']).sub(wp(B[side + 'HandPinky1'])).normalize();
      const palm = side === 'Right' ? lat.clone().cross(fdir) : fdir.clone().cross(lat);
      const axis = fdir.clone().cross(palm).normalize();
      rotW(b, axis, (f === 'Index' && idx != null ? idx : f === 'Pinky' && pk != null ? pk : curl) * (j === 1 ? 0.7 : 1.0));
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

// highest skinned vertex over a footprint on the ground plane: a rectangle centred on c, half sizes ha (along the unit
// xz axis a) and hb (across it); vertices within skipR of `skip` are ignored (the hand being placed)
export function topYIn(av, c, a, ha, hb, skip = null, skipR = 0.12, step = 2) {
  let m = -Infinity;
  av.root.updateMatrixWorld(true);
  for (const mesh of av.meshes) {
    if (!mesh.isSkinnedMesh) continue;
    mesh.skeleton.update();
    const n = mesh.geometry.attributes.position.count;
    for (let i = 0; i < n; i += step) {
      mesh.getVertexPosition(i, _sv); _sv.applyMatrix4(mesh.matrixWorld);
      const dx = _sv.x - c.x, dz = _sv.z - c.z;
      if (Math.abs(dx * a.x + dz * a.z) > ha || Math.abs(-dx * a.z + dz * a.x) > hb) continue;
      if (skip && _sv.distanceTo(skip) < skipR) continue;
      if (_sv.y > m) m = _sv.y;
    }
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
// lean (rad, + forward), look (world point), breath (0..1 phase), curl (curlL / curlR per hand), groundAt (x, z) -> y for
// sloping ground, fit (lap: palms measured onto the thighs) }
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
  if (POSE.lookFirst && o.look) lookAt(av, o.look, o.lookK ?? 1);
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
      if (o.fit && !(side === 'Left' ? o.handL : o.handR)) {   // rest the palm on the thigh as posed (measured), never in it
        hand = P.clone().addScaledVector(fwd, 0.2).addScaledVector(left, s * 0.11);
        F = fwd.clone().addScaledVector(left, -s * 0.3).normalize();
        const c = hand.clone().addScaledVector(F, 0.1);
        hand.y = topYIn(av, c, F, 0.13, 0.06, wp(B[side + 'Hand'])) + 0.035;
      }
    }
    if (o.handL && side === 'Left') ({ hand, pole, F, N } = o.handL(P, fwd, left, up));
    if (o.handR && side === 'Right') ({ hand, pole, F, N } = o.handR(P, fwd, left, up));
    twoBoneIK(av, side + 'Arm', side + 'ForeArm', side + 'Hand', hand, pole);
    if (F && N) orientHand(av, side, F, N);
    curlFingers(av, side, (side === 'Left' ? o.curlL : o.curlR) ?? o.curl ?? 0.3, (side === 'Left' ? o.thumbL : o.thumbR) ?? 0.15, null, side === 'Left' ? o.pkL : o.pkR);
  }
  if (!POSE.lookFirst && o.look) lookAt(av, o.look, o.lookK ?? 1);
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
  // o.hipBend (rad): the pelvis tips forward and the legs come back to the feet (leaning over a sill bends at the hips)
  if (o.hipBend) rotW(B.Hips, left, o.hipBend);
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
  if (POSE.lookFirst && o.look) lookAt(av, o.look, o.lookK ?? 1);
  for (const [side, s] of [['Left', 1], ['Right', -1]]) {
    const fn = side === 'Left' ? o.armL : o.armR;
    const sh = wp(B[side + 'Arm']);
    const def = { hand: sh.clone().addScaledVector(up, -0.56).addScaledVector(left, s * 0.12).addScaledVector(fwd, 0.04), pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.6).addScaledVector(left, s * 0.2), F: V(0, -1, 0).addScaledVector(fwd, 0.15).normalize(), N: left.clone().multiplyScalar(-s) };
    const a = fn ? fn(sh, fwd, left, up) : def;
    twoBoneIK(av, side + 'Arm', side + 'ForeArm', side + 'Hand', a.hand, a.pole);
    if (a.F && a.N) orientHand(av, side, a.F, a.N);
    curlFingers(av, side, a.curl ?? 0.35, a.thumb ?? 0.15, a.idx, a.pk);
  }
  if (!POSE.lookFirst && o.look) lookAt(av, o.look, o.lookK ?? 1);
  if (o.groundAt) { av.root.position.y += 0.004 - lowestAbove(av, o.groundAt); av.root.updateMatrixWorld(true); return; }
  // o.cache (an object): measure the lowest vertex once and reuse its height under the root (still poses in a crowd)
  let low;
  if (o.cache) { if (o.cache.off == null) o.cache.off = lowestY(av) - av.root.position.y; low = av.root.position.y + o.cache.off; } else low = lowestY(av);
  av.root.position.y += (ground + 0.004) - low; av.root.updateMatrixWorld(true);
}

// kneeling, sitting back on the heels (o.hipH = hip height above the floor, ~0.5-0.75 for a crouch on the knees), arms by o.armL /
// o.armR like stand(); knees forward, insteps flat behind. Lifted so the lowest skinned vertex sits 4 mm above o.pos.y
export function kneel(av, o) {
  const B = av.bones;
  resetPose(av);
  av.root.position.copy(o.pos); av.root.rotation.set(0, o.yaw || 0, 0); av.root.updateMatrixWorld(true);
  av.root.position.y += (o.pos.y + (o.hipH ?? 0.58)) - wp(B.Hips).y; av.root.updateMatrixWorld(true);
  const { fwd, left, up } = bodyFrame(av);
  const lean = (o.lean ?? 0.12) + (o.breath != null ? Math.sin(o.breath * Math.PI * 2) * 0.012 : 0);
  rotW(B.Spine, left, lean * 0.45); rotW(B.Spine1, left, lean * 0.3); rotW(B.Spine2, left, lean * 0.25);
  if (o.twist) { rotW(B.Spine1, up, o.twist * 0.5); rotW(B.Spine2, up, o.twist * 0.5); }
  const P = wp(B.Hips), gy = o.pos.y;
  for (const [side, s] of [['Left', 1], ['Right', -1]]) {
    const foot = P.clone().addScaledVector(left, s * 0.13).addScaledVector(fwd, -0.12); foot.y = gy + 0.07;
    const pole = P.clone().addScaledVector(fwd, 1.2).addScaledVector(up, -0.3).addScaledVector(left, s * 0.1);
    twoBoneIK(av, side + 'UpLeg', side + 'Leg', side + 'Foot', foot, pole);
    if (B[side + 'ToeBase']) { const toe = foot.clone().addScaledVector(fwd, -0.16); toe.y = gy + 0.03; aimBone(B[side + 'Foot'], wp(B[side + 'ToeBase']), toe); }
  }
  if (POSE.lookFirst && o.look) lookAt(av, o.look, o.lookK ?? 1);
  for (const [side, s] of [['Left', 1], ['Right', -1]]) {
    const fn = side === 'Left' ? o.armL : o.armR, sh = wp(B[side + 'Arm']);
    const def = { hand: sh.clone().addScaledVector(up, -0.45).addScaledVector(left, s * 0.05).addScaledVector(fwd, 0.22), pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.5).addScaledVector(left, s * 0.25) };
    const a = fn ? fn(sh, fwd, left, up) : def;
    twoBoneIK(av, side + 'Arm', side + 'ForeArm', side + 'Hand', a.hand, a.pole);
    if (a.F && a.N) orientHand(av, side, a.F, a.N);
    curlFingers(av, side, a.curl ?? 0.4, a.thumb ?? 0.15, a.idx, a.pk);
  }
  if (!POSE.lookFirst && o.look) lookAt(av, o.look, o.lookK ?? 1);
  let low;
  if (o.cache) { if (o.cache.off == null) o.cache.off = lowestY(av) - av.root.position.y; low = av.root.position.y + o.cache.off; } else low = lowestY(av);
  av.root.position.y += (gy + 0.004) - low; av.root.updateMatrixWorld(true);
}

// a walking stride, rebuilt from rest each frame (a pure function of the phase): o.pos = the body's ground point now,
// o.yaw, o.phase in cycles (one cycle = two steps; the caller advances it as distance / (2 * stride)), o.stride (m per step).
// Feet: planted for the first half of their cycle (sliding back under the body), swung forward with a lift for the
// second half; hips bob, the pelvis twists against the shoulders, the arms swing opposite to the legs; o.groundAt (x, z) -> y
// puts each foot on uneven ground (a rug's 12 mm)
export function walk(av, o) {
  const B = av.bones, s = o.stride ?? 0.68, ph = o.phase, TAU = Math.PI * 2;
  resetPose(av);
  av.root.position.copy(o.pos); av.root.position.y += -0.018 + 0.018 * Math.cos(2 * TAU * ph) * -1 * 0.6; av.root.rotation.set(0, o.yaw || 0, 0); av.root.updateMatrixWorld(true);
  const { fwd, left, up } = bodyFrame(av);
  rotW(B.Hips, up, 0.07 * Math.sin(TAU * ph)); rotW(B.Spine1, up, -0.05 * Math.sin(TAU * ph)); rotW(B.Spine2, up, -0.05 * Math.sin(TAU * ph));
  rotW(B.Spine, left, 0.04);                                                     // a slight forward lean
  const P = o.pos.clone(), gy = o.pos.y;
  for (const [side, sd, off] of [['Left', 1, 0], ['Right', -1, 0.5]]) {
    const u = ((ph + off) % 1 + 1) % 1;
    let along, lift = 0;
    if (u < 0.5) along = s / 2 - s * (u / 0.5);                                    // stance: planted, the body passes over it
    else { const w = (u - 0.5) / 0.5, e = w * w * (3 - 2 * w); along = -s / 2 + s * e; lift = 0.09 * Math.sin(Math.PI * w); }
    const foot = P.clone().addScaledVector(left, sd * 0.1).addScaledVector(fwd, along); foot.y = (o.groundAt ? o.groundAt(foot.x, foot.z) : gy) + 0.085 + lift;
    const pole = wp(B[side + 'UpLeg']).addScaledVector(fwd, 1.0).addScaledVector(up, -0.4);
    twoBoneIK(av, side + 'UpLeg', side + 'Leg', side + 'Foot', foot, pole);
    if (B[side + 'ToeBase']) { const toe = foot.clone().addScaledVector(fwd, 0.15); toe.y = (o.groundAt ? o.groundAt(toe.x, toe.z) : gy) + 0.02 + lift * (u < 0.5 ? 0 : 0.6); aimBone(B[side + 'Foot'], wp(B[side + 'ToeBase']), toe); }
  }
  if (POSE.lookFirst && o.look) lookAt(av, o.look, o.lookK ?? 0.6);
  for (const [side, sd, off] of [['Left', 1, 0.5], ['Right', -1, 0]]) {
    const sh = wp(B[side + 'Arm']), sw = Math.sin(TAU * (ph + off));
    const fn = side === 'Left' ? o.armL : o.armR;
    const def = { hand: sh.clone().addScaledVector(up, -0.55).addScaledVector(left, sd * 0.1).addScaledVector(fwd, 0.05 + 0.17 * sw), pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.6).addScaledVector(left, sd * 0.25) };
    const a = fn ? fn(sh, fwd, left, up) : def;
    twoBoneIK(av, side + 'Arm', side + 'ForeArm', side + 'Hand', a.hand, a.pole);
    if (a.F && a.N) orientHand(av, side, a.F, a.N);
    curlFingers(av, side, a.curl ?? 0.4, a.thumb ?? 0.15, a.idx, a.pk);
  }
  if (!POSE.lookFirst && o.look) lookAt(av, o.look, o.lookK ?? 0.6);
}
// climbing a straight flight, rebuilt from rest each frame (a pure function of the body's distance along it). o.flight = { p0 (the
// flight's bottom edge on the floor it starts from), dir (horizontal unit vector up the flight), base (that floor's height), rise,
// run, n (treads; tread j's top is base + 0.02 + j * rise, the landing above is base + n * rise) }; o.a = the body's distance along
// the flight from p0 (m; negative on the floor before it, past n * run on the landing), o.side (m, + to the body's left).
// Feet: one tread each per step, planted with the ankle 0.27 of a tread from its back edge (the toe stays clear of the next
// riser), then swung two treads up on an arc that rises in its first half and travels forward over the whole swing, so the toe
// clears both nosings. Arms swing like walk() unless o.armL / o.armR (stand()'s convention) hold the rail.
export function climb(av, o) {
  const B = av.bones, F = o.flight, run = F.run, rise = F.rise, TAU = Math.PI * 2;
  const top = (k) => (k < 0 ? F.base : k >= F.n ? F.base + F.n * rise : F.base + 0.02 + k * rise);
  const along = (k) => (k + (o.ankle ?? 0.27)) * run;                  // o.ankle: a long boot plants further back on the tread
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const ph = o.a / (2 * run);
  const side = F.dir.clone().cross(V(0, 1, 0)).negate();          // the body's left when facing up the flight
  const at = (d, y) => F.p0.clone().addScaledVector(F.dir, d).addScaledVector(side, o.side ?? 0).setY(y);
  const feet = {};
  for (const [nm, off, k0] of [['Left', 0, 0], ['Right', 0.5, -1]]) {
    const c = Math.floor(ph + off), u = ph + off - c, k = 2 * c + k0;
    if (u < 0.5) feet[nm] = { d: along(k), y: top(k) };
    else { const w = (u - 0.5) / 0.5; feet[nm] = { d: along(k) + (along(k + 2) - along(k)) * sm(0, 1, w), y: top(k) + (top(k + 2) - top(k)) * sm(0, 0.5, w) + 0.05 * Math.sin(Math.PI * w), swing: true }; }
  }
  resetPose(av);
  const rootY = F.base + Math.min(F.n, Math.max(0, o.a / run - 0.5)) * rise - 0.02 + 0.012 * Math.cos(2 * TAU * ph);
  av.root.position.copy(at(o.a, rootY)); av.root.rotation.set(0, Math.atan2(F.dir.x, F.dir.z), 0); av.root.updateMatrixWorld(true);
  const { fwd, left, up } = bodyFrame(av);
  rotW(B.Hips, up, 0.06 * Math.sin(TAU * ph)); rotW(B.Spine1, up, -0.04 * Math.sin(TAU * ph));
  rotW(B.Spine, left, o.lean ?? 0.12);
  for (const [nm, sd] of [['Left', 1], ['Right', -1]]) {
    const f = feet[nm], foot = at(f.d, f.y + 0.085).addScaledVector(left, sd * 0.1);
    const pole = wp(B[nm + 'UpLeg']).addScaledVector(fwd, 1.0).addScaledVector(up, 0.2);
    twoBoneIK(av, nm + 'UpLeg', nm + 'Leg', nm + 'Foot', foot, pole);
    if (B[nm + 'ToeBase']) { const toe = foot.clone().addScaledVector(fwd, 0.15); toe.y = foot.y - 0.065 + (f.swing ? 0.02 : 0); aimBone(B[nm + 'Foot'], wp(B[nm + 'ToeBase']), toe); }
  }
  if (POSE.lookFirst && o.look) lookAt(av, o.look, o.lookK ?? 0.7);
  for (const [nm, sd, off] of [['Left', 1, 0.5], ['Right', -1, 0]]) {
    const sh = wp(B[nm + 'Arm']), sw = Math.sin(TAU * (ph + off));
    const fn = nm === 'Left' ? o.armL : o.armR;
    const def = { hand: sh.clone().addScaledVector(up, -0.52).addScaledVector(left, sd * 0.1).addScaledVector(fwd, 0.08 + 0.12 * sw), pole: sh.clone().addScaledVector(up, -0.3).addScaledVector(fwd, -0.6).addScaledVector(left, sd * 0.25) };
    const a = fn ? fn(sh, fwd, left, up) : def;
    twoBoneIK(av, nm + 'Arm', nm + 'ForeArm', nm + 'Hand', a.hand, a.pole);
    if (a.F && a.N) orientHand(av, nm, a.F, a.N);
    curlFingers(av, nm, a.curl ?? 0.4, a.thumb ?? 0.15, a.idx, a.pk);
  }
  if (!POSE.lookFirst && o.look) lookAt(av, o.look, o.lookK ?? 0.7);
  return feet;
}
// a posable copy of an avatar (skeleton clone sharing meshes and textures) with its own bone map
export function cloneAvatar(av, skClone) {
  const root = skClone(av.root), byName = {};
  root.traverse((o) => { if (o.isBone) byName[o.name] = o; });
  const bones = {}; for (const [k, b] of Object.entries(av.bones)) bones[k] = byName[b.name];
  const meshes = []; root.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  return { root, bones, rest: av.rest, meshes };
}
