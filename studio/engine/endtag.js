// "Follow for more" (rule 20, owner 10 Oct 2026): a tiny line at the bottom middle of every end card, just above the strip
// Instagram covers with the username and caption. Apple's head peeks up from behind it for about two seconds, looks at
// you, blinks and ducks back down. The head is drawn by its own small renderer onto a 2D canvas inside the end card,
// over the card's exact background colour, so it sits in the DOM like the text and the canvas edge hides the body.
// makeEndTag({ text }) -> update(t, t0, a): t0 = when the end card is fully in, a = the card's opacity. Pure function of t.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeCat } from './cat.js';

export function makeEndTag({ text = 'Follow for more', bg = '#0d0e11', y = 1486, w = 360, h = 230, ssaa = 2, peekAt = 0.9, seed = 1 } = {}) {
  const end = document.getElementById('end');
  // the head's canvas sits on the text line: its bottom edge is where Apple comes up from
  const cv = document.createElement('canvas'); cv.width = w * ssaa; cv.height = h * ssaa;
  cv.style.cssText = `position:absolute;left:${(1080 - w) / 2}px;top:${y - h + 2}px;width:${w}px;height:${h}px;pointer-events:none`;
  const tx = document.createElement('div'); tx.textContent = text;
  tx.style.cssText = `position:absolute;left:0;width:1080px;top:${y}px;text-align:center;font:500 21px 'JetBrains Mono',monospace;letter-spacing:.34em;text-transform:uppercase;color:rgba(246,242,234,.74);pointer-events:none`;
  end.appendChild(cv); end.appendChild(tx);
  const ctx = cv.getContext('2d');

  const R = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.setSize(w * ssaa, h * ssaa, false);
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.95;
  R.setClearColor(bg, 1);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(R);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;
  const key = new THREE.DirectionalLight('#ffe2c4', 2.6); key.position.set(-1.2, 1.4, 1.6);
  const rim = new THREE.DirectionalLight('#ffffff', 1.8); rim.position.set(0.9, 0.8, -1.4);
  scene.add(key, rim, new THREE.HemisphereLight('#c9cfe8', '#3a3430', 0.45));
  const cat = makeCat({ seed });
  scene.add(cat.root);
  cat.whiskers.material.uniforms.uRes.value.set(w, h);
  // the camera frames the head: 0.17 m from the canvas bottom to its top
  // the head peeks up 7.5 cm higher than when Apple sits, so his chin rests on the text line
  const LIFT = 0.075, cam = new THREE.PerspectiveCamera(16, w / h, 0.05, 10);
  const camPos = new THREE.Vector3(0, 0.36, 0.62);
  cam.position.copy(camPos); cam.lookAt(0, 0.362, 0); cam.updateMatrixWorld();
  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

  function update(t, t0, a = 1) {
    const te = t - t0 - peekAt;                                  // 0 = Apple starts to rise
    const show = a > 0.001 && te > -0.05 && te < 2.35;
    cv.style.opacity = String(a); tx.style.opacity = String(a);
    if (!show) { ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height); return; }
    // up in 0.38 s (eases out, a little overshoot), holds, down in 0.32 s
    const up = smooth(0, 0.38, te), down = smooth(1.95, 2.27, te), bob = Math.sin(Math.min(1, te / 0.5) * Math.PI) * 0.06 * (1 - down);
    const k = up * (1 - down);
    cat.root.position.set(0, LIFT - 0.25 * (1 - k) + bob * 0.05, 0);
    cat.root.rotation.set(0, 0.12 * Math.sin(te * 0.9), 0);
    cat.update(t, { look: camPos, blinkAt: [t0 + peekAt + 1.05], earAt: [t0 + peekAt + 0.55], pr: ssaa });
    R.render(scene, cam);
    ctx.drawImage(R.domElement, 0, 0);
  }
  return { update, cat, renderer: R };
}
