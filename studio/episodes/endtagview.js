// Look-dev for the "Follow for more" end tag (rule 20), not an episode: the end card with Apple peeking. ?t=
import * as THREE from 'three';
import { createRenderer, Overlay } from '../engine/core.js';
import { makeEndTag } from '../engine/endtag.js';
import { TEX_PENDING } from '../engine/elevator.js';

export async function create() {
  globalThis.SSAA = 1; globalThis.MSAA = 0;
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const tag = makeEndTag();
  await Promise.all(TEX_PENDING);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera();
  const TITLE = 'What if every atom on Earth <span class="k">stopped moving</span> for 1 second?';
  function frame(t) {
    R.renderPass.scene = scene; R.renderPass.camera = cam; R.composer.render();
    ov.apply({ labels: [], tag: '', tagA: 0, title: { html: '', a: 0, k: 1 }, hud: null, caption: null,
      end: { a: 1, title: TITLE, note: '<span class="q">Would you survive the first second?</span><br><br>Coldest ever measured on Earth: −89.2 °C' } });
    tag.update(t, 0, 1);
  }
  return { duration: 61, fps: 30, frame, captions: [] };
}
