// Rocketbox avatars (Microsoft Rocketbox library, MIT licence): realistic rigged people, a new face every video.
// tools/fetch_rocketbox.sh <Name> puts the FBX + converted textures in engine/models/rocketbox/<Name>/.
// loadAvatar() returns { root, bones, meshes } with bones renamed to the Mixamo names our rigs use (Hips, Spine,
// LeftArm, ...), the body scaled to metres and standing on y = 0, facing +z.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { TEX_PENDING } from './elevator.js';

// 3ds Max Biped bone -> Mixamo bone
const BIP = {
  Pelvis: 'Hips', Spine: 'Spine', Spine1: 'Spine1', Spine2: 'Spine2', Neck: 'Neck', Head: 'Head',
  L_Clavicle: 'LeftShoulder', L_UpperArm: 'LeftArm', L_Forearm: 'LeftForeArm', L_Hand: 'LeftHand',
  R_Clavicle: 'RightShoulder', R_UpperArm: 'RightArm', R_Forearm: 'RightForeArm', R_Hand: 'RightHand',
  L_Thigh: 'LeftUpLeg', L_Calf: 'LeftLeg', L_Foot: 'LeftFoot', L_Toe0: 'LeftToeBase',
  R_Thigh: 'RightUpLeg', R_Calf: 'RightLeg', R_Foot: 'RightFoot', R_Toe0: 'RightToeBase',
};
const FING = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
function mixamoName(n) {
  const s = n.replace(/^Bip0?1[ _]?/, '').replace(/ /g, '_');
  if (BIP[s]) return BIP[s];
  const m = s.match(/^([LR])_Finger(\d)(\d?)$/);   // Bip01 L Finger0 (thumb root), Finger01, Finger02 ...
  if (m) return (m[1] === 'L' ? 'Left' : 'Right') + 'Hand' + FING[+m[2]] + (m[3] === '' ? 1 : +m[3] + 1);
  return null;
}

const texLoader = new THREE.TextureLoader();
function tex(url, srgb) {
  let t;
  TEX_PENDING.push(new Promise((res) => { t = texLoader.load(url, res, undefined, () => { console.error('texture failed', url); res(); }); }));
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.flipY = true;
  return t;
}

// The FBX normals come out faceted: rebuild them from the faces, averaged over every corner that shares a position
// (across UV seams) when the faces meet at less than `crease` degrees.
export function creaseNormals(g, crease = 70) {
  const pos = g.attributes.position, n = pos.count, cosC = Math.cos(crease * Math.PI / 180);
  const idx = g.index ? g.index.array : null, tri = idx ? idx.length / 3 : n / 3;
  const vi = (k) => (idx ? idx[k] : k);
  const fn = new Float32Array(tri * 3), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let f = 0; f < tri; f++) {
    a.fromBufferAttribute(pos, vi(3 * f)); b.fromBufferAttribute(pos, vi(3 * f + 1)); c.fromBufferAttribute(pos, vi(3 * f + 2));
    c.sub(b); b.sub(a); c.cross(b).negate();   // area-weighted
    fn[3 * f] = c.x; fn[3 * f + 1] = c.y; fn[3 * f + 2] = c.z;
  }
  const key = (i) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const groups = new Map();   // position -> list of [corner index, face]
  for (let f = 0; f < tri; f++) for (let k = 0; k < 3; k++) { const i = vi(3 * f + k), kk = key(i); (groups.get(kk) || groups.set(kk, []).get(kk)).push([i, f]); }
  const out = new Float32Array(n * 3), u = new THREE.Vector3(), v = new THREE.Vector3(), s = new THREE.Vector3();
  for (const list of groups.values()) {
    for (const [i, f] of list) {
      u.set(fn[3 * f], fn[3 * f + 1], fn[3 * f + 2]).normalize(); s.set(0, 0, 0);
      for (const [, g2] of list) { v.set(fn[3 * g2], fn[3 * g2 + 1], fn[3 * g2 + 2]); const l = v.length(); if (l > 0 && v.dot(u) / l >= cosC) s.add(v); }
      s.normalize(); out[3 * i] = s.x; out[3 * i + 1] = s.y; out[3 * i + 2] = s.z;
    }
  }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
}

export async function loadAvatar(name, { env = null, height = null, facial = false, smoothNormals = true, dbgHair = null, softHair = true, lod = 0 } = {}) {
  const dir = `/engine/models/rocketbox/${name}/`;
  const info = await (await fetch(dir + 'avatar.json')).json();
  // the FBX points at its .tga textures on the artist's disk: swallow those requests, we bind our own maps
  const blank = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const mgr = new THREE.LoadingManager(); mgr.setURLModifier((u) => (/\.(tga|png|jpe?g|dds|tif)$/i.test(u) && !u.startsWith('data:') ? blank : u));
  const root = await new FBXLoader(mgr).loadAsync(dir + name + (facial ? '_facial' : '') + '.fbx');
  const code = info.code;
  const sfx = lod ? '_' + lod : '';
  const set = (k, srgb) => tex(`${dir}${k}${sfx}.${/normal|opacity/.test(k) ? 'png' : 'jpg'}`, srgb);
  const maps = {};
  const get = (part) => (maps[part] ||= {
    map: set(`${code}_${part}_color`, true), normalMap: set(`${code}_${part}_normal`, false), spec: set(`${code}_${part}_specular`, true),
  });
  let opacity = null;
  const meshes = [], matNames = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.geometry.attributes.normal && smoothNormals) creaseNormals(o.geometry, 70);
    meshes.push(o); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      const n = (m.name || '').toLowerCase(); matNames.push(o.name + ':' + m.name);
      if (n.includes('opacity')) {   // hair, eyelashes, eyebrows: alpha-tested cards
        opacity ||= tex(`${dir}${code}_opacity_color${sfx}.png`, true);
        const hm = new THREE.MeshPhysicalMaterial({ map: opacity, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.72, specularIntensity: 0.5, envMap: env, envMapIntensity: 0.3 });
        if (dbgHair) { hm.map = null; hm.color.set(dbgHair); hm.alphaTest = 0; }
        return hm;
      }
      const part = n.includes('head') ? 'head' : 'body';
      const t = get(part);
      return new THREE.MeshPhysicalMaterial({
        map: t.map, normalMap: t.normalMap, specularColorMap: t.spec, specularIntensity: 0.6, roughness: part === 'head' ? 0.52 : 0.78,
        sheen: part === 'head' ? 0.15 : 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffffff'), envMap: env, envMapIntensity: 0.6,
      });
    });
    // hair, lashes, brows: an alpha-tested opaque pass, then the same triangles blended on top (soft strand edges)
    mats.forEach((m, k) => {
      if (!softHair || dbgHair || !(m.name || '').toLowerCase().includes('opacity') || !Array.isArray(o.material)) return;
      const soft = out[k].clone(); soft.alphaTest = 0.02; soft.transparent = true; soft.depthWrite = false;
      out.push(soft);
      for (const gr of o.geometry.groups.filter((gg) => gg.materialIndex === k)) o.geometry.addGroup(gr.start, gr.count, out.length - 1);
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  const bones = {}, bipNames = [];
  root.traverse((o) => { if (o.isBone) { bipNames.push(o.name); const n = mixamoName(o.name); if (n && !bones[n]) bones[n] = o; } });
  // metres, feet on the ground
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  const h = box.max.y - box.min.y;
  const s = (height || (h > 10 ? h / 100 : h)) / h;
  root.scale.multiplyScalar(s); root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root, true);
  root.position.y -= box2.min.y; root.updateMatrixWorld(true);
  const rest = {}; for (const [k, b] of Object.entries(bones)) rest[k] = b.quaternion.clone();
  return { root, bones, meshes, rest, code, debug: { matNames, bipNames, height: box2.max.y - box2.min.y, rawHeight: h } };
}
