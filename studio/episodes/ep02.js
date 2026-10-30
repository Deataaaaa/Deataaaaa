// EP 02 — What if you fell into a black hole?  (Sagittarius A*, 4.3 million Suns)
import * as THREE from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { createRenderer, Overlay, captionAt, rng, clamp, lerp, smooth, easeInOut, easeIn, W, H } from '../engine/core.js';
import { Puffs, streakTex } from '../engine/assets.js';
import { makeSkyTexture, makeBlackHole, lookBasis, makeAstronaut } from '../engine/blackhole.js';

// ---------------- facts (see notes/ep02-facts.md) ----------------
const RS_KM = 12.7e6;          // Schwarzschild radius of Sgr A* (4.3e6 Msun) in km
const T_CROSS = 23.8;          // screen time of horizon crossing
const T_LEFT = 28.2;           // proper time horizon -> singularity, falling from rest at infinity: (4/3) GM/c^3
const T_SLOW = T_CROSS + T_LEFT - 0.1; // last 0.1 s shown in slow motion
const SLOW = 25;
const T_END = T_SLOW + 0.1 * SLOW;     // singularity
const DUR = T_END + 4.4;

const CAPTIONS = [
  [3.5, 5.7, 'This is Sagittarius A*.'],
  [5.8, 8.6, 'The black hole at the center of our galaxy.'],
  [8.7, 11.4, 'It weighs as much as 4 million Suns.'],
  [11.5, 14.4, 'Its event horizon is 18 times wider than the Sun.'],
  [14.6, 16.9, "Now, let's fall in."],
  [17.1, 20.3, 'Gravity here bends light into rings.'],
  [20.5, 23.6, 'Up ahead: the point of no return.'],
  [24.0, 26.2, 'You just crossed it. You have 28 seconds left.'],
  [26.3, 28.4, 'No wall. No flash. You felt nothing.'],
  [28.5, 31.2, "Inside, the center isn't a place anymore."],
  [31.3, 34.3, "It's a moment in your future. Like tomorrow."],
  [34.5, 37.6, 'Back home, your friends watch you slow down at the edge…'],
  [37.7, 40.4, '…freeze, turn red, and fade away.'],
  [40.5, 43.5, 'They will never see you cross.'],
  [43.7, 46.4, 'Lucky you picked a big one.'],
  [46.5, 49.4, 'A small black hole would have shredded you long before the edge.'],
  [49.5, 51.9, 'This one waits until the last tenth of a second…'],
  [52.0, 54.4, '…then stretches you like spaghetti.'],
];
const TITLE = 'What if you fell into a <span class="k">black hole</span>?';
const ENDNOTE = 'Sagittarius A* &nbsp;·&nbsp; 4.3 million Suns<br>27,000 light-years from Earth';

function timer(sec) { const s = Math.max(0, sec); const m = Math.floor(s / 60); const r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; }
const fmt = (n) => Math.round(n).toLocaleString('en-US');

export async function create() {
  const R = createRenderer();
  const ov = new Overlay();
  const sky = makeSkyTexture(5);
  const bh = makeBlackHole(sky);
  const bhScene = new THREE.Scene(); bhScene.add(bh.quad);
  const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bhRT = new THREE.WebGLRenderTarget(W / 2, H / 2, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  bh.mat.uniforms.uRes.value.set(W / 2, H / 2);
  const bgScene = new THREE.Scene();
  const show = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ depthWrite: false, depthTest: false, uniforms: { t: { value: bhRT.texture } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }' }));
  show.frustumCulled = false; bgScene.add(show);
  // astronaut layer
  const aScene = new THREE.Scene();
  const aCam = new THREE.PerspectiveCamera(42, W / H, 0.05, 200);
  const astro = makeAstronaut(); aScene.add(astro);
  astro.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = 1; } });
  const key = new THREE.DirectionalLight('#ffb070', 3.2); key.position.set(0.5, -1, 0.6); aScene.add(key);
  const rim = new THREE.DirectionalLight('#8fb6ff', 2.0); rim.position.set(-1, 0.8, -1); aScene.add(rim);
  aScene.add(new THREE.AmbientLight('#404860', 0.6));
  const trail = new Puffs(500, { map: streakTex(), additive: true, renderOrder: 3 }); aScene.add(trail.mesh);
  const motes = new Puffs(260, { additive: true, renderOrder: 2 }); aScene.add(motes.mesh);
  // second render pass for the astronaut on top of the black hole
  R.renderPass.scene = bgScene; R.renderPass.camera = bgCam;
  const pass2 = new RenderPass(aScene, aCam); pass2.clear = false; pass2.clearDepth = true;
  R.composer.insertPass(pass2, 1);
  const U = bh.mat.uniforms;

  // camera path outside: r from 34 -> ~1.02 by T_CROSS
  const rOut = (t) => {
    if (t < 14.5) return lerp(34, 19, easeInOut(t / 14.5));
    const s = clamp((t - 14.5) / (T_CROSS - 14.5));
    return 1.0 + 18 * Math.pow(1 - s, 2.15) + 0.02;
  };
  const setCam = (r, elevDeg, azDeg, pitchDeg = 0, roll = 0, fovDeg = 54, beta = null) => {
    const e = elevDeg * Math.PI / 180, a = azDeg * Math.PI / 180;
    const pos = new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).multiplyScalar(r);
    const f = pos.clone().negate().normalize();
    const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, f).normalize();
    const target = pos.clone().add(f).addScaledVector(up, -Math.tan(pitchDeg * Math.PI / 180));
    U.uCamPos.value.copy(pos); U.uCamRot.value.copy(lookBasis(pos, target, new THREE.Vector3(0, 1, 0), roll));
    U.uFov.value = fovDeg * Math.PI / 180;
    U.uBeta.value = beta ?? Math.min(0.985, Math.sqrt(1 / Math.max(r, 1.0001)));
  };

  function frame(t, opts = {}) {
    const st = { tag: 'WHAT IF &nbsp;·&nbsp; 02', tagA: 1, labels: [] };
    U.uTime.value = t;
    astro.visible = false; trail.mesh.visible = false; motes.mesh.visible = false;
    U.uRed.value = 0; U.uSkyGain.value = 1; U.uDisk.value = 1;
    let fade = 0;

    if (t < T_CROSS) {
      // ---------- approach ----------
      const r = rOut(t);
      const el = lerp(6.5, 3.2, smooth(0, T_CROSS, t));
      const az = 20 + t * 1.1;
      setCam(r, el, az, lerp(-8, 8, smooth(2.6, 4.4, t)) - 4 * smooth(14, T_CROSS, t), -0.12 + 0.05 * Math.sin(t * 0.3), lerp(52, 62, smooth(15, T_CROSS, t)));
      st.hud = { a: smooth(3.3, 3.8, t), lab: 'Distance to event horizon', val: `${fmt((r - 1) * RS_KM)} km`, sub: `Speed &nbsp;${Math.sqrt(1 / r).toFixed(2)} c`, sub2: t > 8.7 && t < 11.4 ? '4,300,000 solar masses' : t > 11.5 && t < 14.4 ? 'Horizon 25,400,000 km wide' : '' };
      if (t > 20.5) { st.hud.sub2 = 'Point of no return'; st.hud.valColor = ''; }
    } else if (t < 34.4) {
      // ---------- just inside: astronaut (you) floating, universe behind ----------
      const lt = t - T_CROSS;
      setCam(1.03, 3.0, 20 + T_CROSS * 1.1 + lt * 2.5, 6 - lt * 0.5, -0.12 + lt * 0.02, 64, 0.985);
      U.uRed.value = smooth(0, 10, lt) * 0.25; U.uSkyGain.value = 1 - smooth(0, 10, lt) * 0.25;
      astro.visible = true; motes.mesh.visible = true;
      aCam.position.set(0, 0.25, 3.2); aCam.lookAt(0, -0.15, 0); aCam.fov = 42; aCam.updateProjectionMatrix();
      astro.position.set(0.05, -0.62 + Math.sin(lt * 0.6) * 0.05, -0.7);
      astro.rotation.set(0.35 + Math.sin(lt * 0.25) * 0.15, -0.6 + lt * 0.08, 0.2 + Math.sin(lt * 0.4) * 0.08);
      astro.scale.set(1, 1, 1);
      // gentle arm drift
      const ud = astro.children[0].userData;
      ud.arms[0].rotation.set(-0.3 + Math.sin(lt * 0.7) * 0.2, 0, 0.5); ud.arms[1].rotation.set(-0.5 + Math.sin(lt * 0.6) * 0.2, 0, -0.6);
      ud.legs[0].rotation.set(0.2, 0, 0.12); ud.legs[1].rotation.set(-0.15, 0, -0.1);
    } else if (t < 43.6) {
      // ---------- outside view: friends watching you freeze and redden ----------
      const lt = t - 34.4;
      setCam(lerp(13, 12, lt / 9), 4.0, 140 + lt * 0.8, 3, -0.05, 54, 0.0);
      astro.visible = true;
      aCam.position.set(0, 0, 10); aCam.lookAt(0, 0, 0); aCam.fov = 54; aCam.updateProjectionMatrix();
      // freeze asymptotically near the shadow edge, redden, fade
      const s = 1 - Math.exp(-lt * 0.55);
      astro.position.set(lerp(-0.7, -0.15, s), lerp(2.6, 1.95, s), 0);
      astro.rotation.set(0.4, 0.8, 0.5 + s * 0.2);
      const sc = 0.34 * (1 - 0.12 * s); astro.scale.set(sc, sc, sc);
      const ud = astro.children[0].userData;
      ud.suit.color.setRGB(1, lerp(1, 0.35, s), lerp(1, 0.2, s));
      ud.suit.emissive.setRGB(0, 0, 0);
      const fadeA = 1 - smooth(4.5, 8.5, lt);
      astro.traverse((o) => { if (o.material) o.material.opacity = fadeA; });
      st.labels.push({ x: W * 0.5, y: H * 0.205, a: smooth(0.4, 1.0, lt) * (1 - smooth(8.4, 9.0, lt)), html: 'AS SEEN FROM FAR AWAY' });
    } else if (t < T_END) {
      // ---------- inside again: stretching ----------
      const lt = t - 43.6;
      const ud = astro.children[0].userData;
      ud.suit.color.setRGB(0.93, 0.94, 0.96);
      astro.traverse((o) => { if (o.material) o.material.opacity = 1; });
      setCam(1.03, 2.0, 200 + lt * 3, 10 + lt * 0.8, 0.3 + lt * 0.03, 70, 0.985);
      U.uRed.value = 0.25 + smooth(0, 10, lt) * 0.55; U.uSkyGain.value = 0.75 - smooth(0, 10, lt) * 0.4; U.uDisk.value = 1 - smooth(4, 10, lt) * 0.5;
      astro.visible = true; motes.mesh.visible = true; trail.mesh.visible = t > T_SLOW - 2;
      aCam.position.set(0, 0.1, 3.6); aCam.lookAt(0, -0.2, 0); aCam.fov = 44; aCam.updateProjectionMatrix();
      // stretch: mild before the slow-motion tenth, extreme during it
      const pre = smooth(T_SLOW - 6, T_SLOW, t) * 0.25;
      const fin = t > T_SLOW ? easeIn((t - T_SLOW) / (0.1 * SLOW)) : 0;
      const sy = 1 + pre + fin * 22, sxz = 1 / Math.sqrt(sy);
      astro.position.set(0.2, -0.6 - fin * 6, -0.3);
      astro.rotation.set(0.15, -0.3 + lt * 0.05, 0.05);
      astro.scale.set(sxz, sy, sxz);
      ud.arms[0].rotation.set(-2.6, 0, 0.2); ud.arms[1].rotation.set(-2.5, 0, -0.2);
      ud.legs[0].rotation.set(0.05, 0, 0.05); ud.legs[1].rotation.set(-0.05, 0, -0.05);
      // particle trail streaming toward the singularity (down)
      const tr = rng(12);
      for (let i = 0; i < trail.n; i++) {
        const x = (tr() - 0.5) * 0.5 * sxz * 2, ph = tr(), sp = 0.5 + tr() * 2.5, len = 0.1 + tr() * 0.5;
        const y = 1.2 - ((ph * 5 + (t - T_SLOW + 2) * sp * (0.3 + fin * 3)) % 5);
        trail.set(i, 0.2 + x, y, -0.3 + (tr() - 0.5) * 0.4, 0.02 + tr() * 0.03, (0.25 + fin * 0.7) * smooth(T_SLOW - 2, T_SLOW - 1, t), 1.0, 0.75, 0.55, -Math.PI / 2, (len + fin * 3) / 0.03);
      }
      trail.commit();
      fade = smooth(T_END - 0.35, T_END, t);
    } else {
      fade = 1;
    }
    // floating motes (sense of motion inside)
    if (motes.mesh.visible) {
      const mr = rng(6);
      for (let i = 0; i < motes.n; i++) {
        const x = (mr() - 0.5) * 8, z = -mr() * 8 - 1, sp = 0.4 + mr() * 1.2; const y = 4 - ((mr() * 8 + t * sp) % 8);
        motes.set(i, x, y, z, 0.02 + mr() * 0.03, 0.5 * mr(), 1.0, 0.8, 0.6);
      }
      motes.commit();
    }

    // ---------- HUD after crossing ----------
    if (t >= T_CROSS && t < T_END) {
      let left = T_LEFT - (t - T_CROSS);
      let sub = 'Time left to live';
      if (t >= T_SLOW) { left = 0.1 - (t - T_SLOW) / SLOW; sub = `Time slowed down ${SLOW}×`; }
      const sub2 = t > 34.4 && t < 43.6 ? 'Their view: you never cross' : t > 46.5 && t < 49.4 ? 'Small black hole: shredded far outside the edge' : '';
      st.hud = { a: 1, lab: 'Singularity in', val: timer(left), sub, sub2, valColor: left < 5 ? '#ff8a5c' : '' };
    }
    if (t < 3.4) st.title = { html: TITLE, a: Math.min(smooth(0.0, 0.35, t), 1 - smooth(3.0, 3.35, t)), k: smooth(0, 0.6, t) };
    const c = captionAt(CAPTIONS, t); if (c) st.caption = c;
    if (t >= T_END + 0.3) { st.end = { a: smooth(T_END + 0.3, T_END + 0.65, t), title: TITLE, note: ENDNOTE }; st.hud = null; }
    if (opts.cover) { st.title = { html: TITLE, a: 1, k: 1 }; st.caption = null; st.hud = null; st.labels = []; }

    R.bloom.strength = 0.7; R.bloom.radius = 0.55; R.bloom.threshold = 0.8;
    const G = R.grade.uniforms;
    G.uTime.value = t; G.uSat.value = 1.1; G.uTint.value.set(1.02, 1.0, 1.0); G.uVignette.value = 0.45; G.uAberr.value = 0.0015;
    G.uFade.value = fade; G.uFadeWhite.value = 0; G.uShake.value.set(0, 0);
    if (t > T_SLOW) { const sr = rng(Math.floor(t * 30)); const k = smooth(T_SLOW, T_END, t) * 0.004; G.uShake.value.set((sr() - 0.5) * k, (sr() - 0.5) * k); }
    R.renderer.setRenderTarget(bhRT); R.renderer.render(bhScene, bgCam); R.renderer.setRenderTarget(null);
    R.composer.render();
    ov.apply(st);
  }
  return { duration: DUR, fps: 30, frame, cues: { cross: T_CROSS, slow: T_SLOW, end: T_END } };
}
