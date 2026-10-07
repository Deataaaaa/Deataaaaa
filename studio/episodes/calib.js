// pose calibration: 6 mannequins, each with one bone offset, labelled
// ?bone=RightHand&mag=0.9&base=hold&view=front|side|top
import * as THREE from 'three';
import { createRenderer, Overlay, W, H, project } from '../engine/core.js';
import { loadMannequin, cloneMannequin, offsetBone } from '../engine/elevator.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
export async function create() {
  const R = createRenderer(); const ov = new Overlay();
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#202226');
  scene.add(new THREE.HemisphereLight('#ffffff', '#444444', 2.0));
  const dl = new THREE.DirectionalLight('#ffffff', 2); dl.position.set(2, 4, 5); scene.add(dl);
  const gltf = await loadMannequin();
  const params = new URLSearchParams(location.search);
  const bone = params.get('bone') || 'RightArm';
  const mag = parseFloat(params.get('mag') || '0.9');
  const base = params.get('base') || '';
  const view = params.get('view') || 'front';
  const extra = (params.get('extra') || '').split(';').filter(Boolean).map((s) => { const [b, x, y, z] = s.split(','); return [b, +x, +y, +z]; });
  const variants = [[mag, 0, 0], [-mag, 0, 0], [0, mag, 0], [0, -mag, 0], [0, 0, mag], [0, 0, -mag]];
  const close = base === 'hold';
  const sp = close ? 0.8 : 1.1, row = close ? 1.0 : 1.9;
  const ms = variants.map((v, i) => {
    const root = SkeletonUtils.clone(gltf.scene); scene.add(root);
    const fake = { scene: root, animations: gltf.animations };
    const m = cloneMannequin(fake); m.root.position.set((i % 3 - 1) * sp, i < 3 ? row : 0, 0);
    m.mixer.clipAction(m.clips.idle).play(); m.v = v; return m;
  });
  // phone in each right hand, placed like ep07
  const phones = ms.map(() => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.152, 0.008), new THREE.MeshStandardMaterial({ color: '#3a6df0' })); scene.add(p); return p; });
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
  if (close) {
    const c = new THREE.Vector3(0, 1.3 + row / 2, 0);
    const off = view === 'side' ? new THREE.Vector3(5.2, 0.2, 0.8) : view === 'top' ? new THREE.Vector3(0.0, 4.5, 2.0) : new THREE.Vector3(0, 0.1, 5.2);
    cam.position.copy(c).add(off); cam.lookAt(c);
  } else { cam.position.set(0, 2.0, 9.5); cam.lookAt(0, 1.9, 0); }
  function frame(t) {
    ms.forEach((m, i) => {
      m.mixer.setTime(1.0); m.root.updateMatrixWorld(true);
      if (base === 'hold') {
        offsetBone(m, 'RightArm', 0, 0.55, 0.25); offsetBone(m, 'RightForeArm', 0, 1.55, 0); offsetBone(m, 'RightHand', -0.3, 0, 0.2);
        offsetBone(m, 'Head', 0.38, 0, 0); offsetBone(m, 'Neck', 0.12, 0, 0);
      }
      for (const [b, x, y, z] of extra) offsetBone(m, b, x, y, z);
      offsetBone(m, bone, ...m.v);
      m.root.updateMatrixWorld(true);
      const hand = m.bones.RightHand; const hp = new THREE.Vector3(0, 0.06, 0).applyMatrix4(hand.matrixWorld);
      const hq = new THREE.Quaternion(); hand.getWorldQuaternion(hq);
      phones[i].position.copy(hp); phones[i].quaternion.copy(hq);
      phones[i].visible = params.get('phone') === '1';
    });
    cam.updateMatrixWorld();
    const labels = ms.map((m, i) => { const p = project(m.root.position.clone().add(new THREE.Vector3(0, close ? 0.12 : 1.95, 0)), cam); return { x: p.x, y: p.y, a: 1, html: `${bone} ${['x+', 'x-', 'y+', 'y-', 'z+', 'z-'][i]}` }; });
    R.renderPass.scene = scene; R.renderPass.camera = cam; R.bloom.strength = 0; R.composer.render();
    ov.apply({ labels });
  }
  return { duration: 1, fps: 30, frame };
}
