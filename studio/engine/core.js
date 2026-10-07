// Shared engine: renderer, post-processing, overlay (title / captions / HUD), helpers.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const W = 1080, H = 1920;

// ---------- math helpers ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const fmt = (n) => Math.round(n).toLocaleString('en-US');

// ---------- renderer + post ----------
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.55 }, uGrain: { value: 0.035 },
    uFade: { value: 0 }, uFadeWhite: { value: 0 }, uSat: { value: 1.0 }, uContrast: { value: 1.04 },
    uAberr: { value: 0.006 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uShake: { value: new THREE.Vector2(0, 0) },
    uTunnel: { value: 0 }, uScan: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime,uVignette,uGrain,uFade,uFadeWhite,uSat,uContrast,uAberr,uTunnel,uScan;
    uniform vec3 uTint; uniform vec2 uShake; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv + uShake; vec2 c = uv - 0.5;
      float ab = uAberr * dot(c,c) * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c*ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c*ab).b;
      if (uTunnel > 0.001) {   // hypoxia: soft smear towards the edges, then tunnel vision
        float r = length(c*vec2(1.0,0.62)); vec2 o = c * uTunnel * 0.035 * smoothstep(0.1, 0.6, r);
        col = (col + texture2D(tDiffuse, uv + o).rgb + texture2D(tDiffuse, uv - o).rgb + texture2D(tDiffuse, uv + o.yx).rgb) / 4.0;
        col *= mix(1.0, smoothstep(0.7 - 0.42 * uTunnel, 0.12, r), clamp(uTunnel * 1.15, 0.0, 1.0));
      }
      if (uScan > 0.001) {     // VHS: scanlines, tracking wobble, chroma bleed
        float line = 0.5 + 0.5 * sin(uv.y * 1920.0 * 1.5708);
        col *= 1.0 - uScan * 0.16 * line;
        float band = step(0.985, fract(uv.y * 3.0 + uTime * 0.37));
        col += uScan * band * 0.06;
        col.r = mix(col.r, texture2D(tDiffuse, uv + vec2(0.0035 * uScan, 0.0)).r, 0.5 * uScan);
      }
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(vec3(l), col, uSat);
      col = (col-0.5)*uContrast+0.5;
      col *= uTint;
      float v = smoothstep(0.95, 0.25, length(c*vec2(1.0,0.62)));
      col *= mix(1.0, v, uVignette);
      col += (hash(floor(uv*vec2(1080.,1920.)) + fract(uTime*7.31)*91.7) - 0.5) * uGrain;
      col = mix(col, vec3(0.0), uFade);
      col = mix(col, vec3(1.0), uFadeWhite);
      gl_FragColor = vec4(max(col,0.0), 1.0);
    }`,
};

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('stage').appendChild(renderer.domElement);

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.6, 0.5, 0.85);
  const output = new OutputPass();
  const grade = new ShaderPass(GradeShader);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  composer.addPass(grade);
  return { renderer, composer, renderPass, bloom, grade };
}

// ---------- overlay ----------
// Captions: [[t0, t1, html], ...]. Fades are deterministic functions of t.
export function captionAt(list, t, fadeIn = 0.28, fadeOut = 0.22) {
  for (const [t0, t1, html, opts] of list) {
    if (t >= t0 - 0.001 && t <= t1) {
      const a = Math.min(smooth(t0, t0 + fadeIn, t), 1 - smooth(t1 - fadeOut, t1, t));
      return { html, a, k: smooth(t0, t0 + fadeIn * 1.6, t), opts: opts || {} };
    }
  }
  return null;
}

export class Overlay {
  constructor() {
    this.el = {
      tag: document.getElementById('tag'), title: document.getElementById('title'),
      hud: document.getElementById('hud'), hudLab: document.querySelector('#hud .lab'),
      hudVal: document.querySelector('#hud .val'), hudSub: document.querySelector('#hud .sub'),
      hudSub2: document.querySelector('#hud .sub2'),
      cap: document.getElementById('cap'), labels: document.getElementById('labels'),
      end: document.getElementById('end'), endTitle: document.querySelector('#end .t'), endNote: document.querySelector('#end .n'),
    };
    this.cache = new Map();
  }
  set(key, el, prop, val) {
    const k = key + prop;
    if (this.cache.get(k) === val) return;
    this.cache.set(k, val);
    if (prop === 'html') el.innerHTML = val; else el.style[prop] = val;
  }
  apply(s) {
    const e = this.el;
    // series tag
    this.set('tag', e.tag, 'html', s.tag || '');
    this.set('tag', e.tag, 'opacity', String(s.tagA ?? 0));
    // title
    const ta = s.title ? s.title.a : 0;
    if (s.title) this.set('title', e.title, 'html', s.title.html);
    this.set('title', e.title, 'opacity', String(ta));
    this.set('title', e.title, 'transform', `translateY(${s.title ? (1 - s.title.k) * 14 : 0}px)`);
    // HUD
    const h = s.hud;
    this.set('hud', e.hud, 'opacity', String(h ? h.a : 0));
    if (h) {
      this.set('hudLab', e.hudLab, 'html', h.lab || '');
      this.set('hudVal', e.hudVal, 'html', h.val || '');
      this.set('hudSub', e.hudSub, 'html', h.sub || '');
      this.set('hudSub2', e.hudSub2, 'html', h.sub2 || '');
      this.set('hudVal', e.hudVal, 'color', h.valColor || '');
    }
    // caption
    const c = s.caption;
    this.set('cap', e.cap, 'opacity', String(c ? c.a : 0));
    if (c) {
      this.set('cap', e.cap, 'html', c.html);
      this.set('cap', e.cap, 'transform', `translateY(${(1 - c.k) * 16}px)`);
      this.set('cap', e.cap, 'filter', `blur(${((1 - c.k) * 3).toFixed(2)}px)`);
      this.set('cap', e.cap, 'top', (c.opts.y ?? 63) + '%');
    }
    // projected labels
    const labs = s.labels || [];
    let html = '';
    for (const l of labs) {
      if (l.a <= 0.001) continue;
      const cls = l.cls || 'lbl';
      html += `<div class="${cls}" style="left:${l.x.toFixed(1)}px;top:${l.y.toFixed(1)}px;opacity:${l.a.toFixed(3)}">${l.html}</div>`;
    }
    this.set('labels', e.labels, 'html', html);
    // end card
    const en = s.end;
    this.set('end', e.end, 'opacity', String(en ? en.a : 0));
    if (en) {
      this.set('endT', e.endTitle, 'html', en.title);
      this.set('endN', e.endNote, 'html', en.note || '');
    }
  }
}

// project a world position to overlay pixel coords
const _v = new THREE.Vector3();
export function project(pos, camera) {
  _v.copy(pos).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, behind: _v.z > 1 };
}
