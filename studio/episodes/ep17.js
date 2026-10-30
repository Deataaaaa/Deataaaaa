// Post 11: What if every sneeze was twice as strong as the last? (Venice at golden hour, 68 s)
// Hook (0-3.6): sneeze 40 in slow motion: the shock dome racing out over the Basin, spray, the gondolas heaving.
// Calm (3.6-11): the glide over the Basin to the Piazzetta; you on the Molo between the columns, an itch, a countdown.
// The fit (11-25): sneeze 1 is a puff; each one doubles: the pigeons go, the water shivers, gusts, a bang (sneeze 20).
// From the water (25-36): rings and domes race out over the Basin, the gondolas are pushed away, sneeze 40, the
// Campanile slumps into its dust (sneeze 45). Far (36-45): fireballs outgrow each other, sneeze 51 = Hiroshima, 63 = the
// largest bomb ever. Space (45-51): sneeze 84 = the dinosaur asteroid, 97 boils the oceans. You (51-62): not a scratch,
// the pigeon still at your feet (rule 19's WTF), and the next one coming. Loop end card + Follow for more (62-68).
import * as THREE from 'three';
import { createRenderer, Overlay, W, H as HH, rng, smooth, clamp, captionAt, hudK } from '../engine/core.js';
import { loadTex } from '../engine/assets.js';
import { makeSpace6, geoDir } from '../engine/space6.js';
import { makeEndTag } from '../engine/endtag.js';
import { TEX_PENDING } from '../engine/elevator.js';
import { fadeShadowBorders, Sparks, Billboards, smokeAtlas, SIMPLEX } from '../engine/fx.js';
import { loadAvatar } from '../engine/rocketbox.js';
import { stand } from '../engine/poses.js';
import { makeCat } from '../engine/cat.js';
import { makeFireball, makeHalo, makeShock } from '../engine/antimatter.js';
import { makePigeon } from '../engine/props15.js';
import { makeGroundPigeon } from '../engine/props17.js';
import { VZ, VU, SUN, PZ, patMat, makeSky, makeLagoon, makeGround, makePiazzetta, makeFar, makeCity, makeGondolas } from '../engine/venice.js';
import { T, DUR, H, SN, nAt, En, blastR, storyT, hook, glideA, ground, water, far, face, farDist } from './ep17cams.js';

const TITLE = 'What if every sneeze was <span class="k">twice</span> as strong as the last?';
const CAPTIONS = [
  [3.75, 6.9, 'Venice, Italy. 6:05 pm.'],
  [7.0, 10.85, 'You feel a sneeze coming…'],
  [11.05, 13.9, 'Sneeze one: a puff of air.'],
  [14.0, 18.2, 'But each one is twice the last.'],
  [18.3, 22.65, 'Sneeze 10 scatters the pigeons.'],
  [22.75, 25.6, 'Sneeze 20: six grams of TNT.'],
  [25.7, 28.6, 'Sneeze 25: a hand grenade.'],
  [28.7, 31.65, 'Sneeze 30: the lagoon erupts.'],
  [31.75, 34.5, 'Sneeze 40: 7 tonnes of TNT.'],
  [34.6, 37.7, 'Sneeze 45 drops the bell tower.'],
  [37.75, 40.9, 'Sneeze 51: Hiroshima.'],
  [41.0, 44.9, 'Sneeze 63: the biggest bomb ever.'],
  [45.15, 48.5, 'Sneeze 84: the dinosaur asteroid.'],
  [48.6, 51.4, 'Sneeze 97 boils the oceans.'],
  [51.6, 54.6, 'And you? Not a scratch.'],
  [54.7, 58.5, 'One girl sneezed for 976 days straight.'],
  [58.6, 61.98, 'Could you hold in the next one?'],
];
const fmtT = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(3).padStart(6, '0')}`; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (b) => b.getWorldPosition(V(0, 0, 0));
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sci = (x) => { const e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); return `${m.toFixed(1)} × 10${String(e).split('').map((c) => SUP[c]).join('')}`; };
const big = (x, d = 0) => x.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtE = (J) => { const U = [['J', 1], ['kJ', 1e3], ['MJ', 1e6], ['GJ', 1e9], ['TJ', 1e12], ['PJ', 1e15], ['EJ', 1e18], ['ZJ', 1e21]];
  if (J >= 1e24) return sci(J) + ' J'; let u = U[0]; for (const x of U) if (J >= x[1]) u = x; const v = J / u[1]; return `${v < 10 ? v.toFixed(v < 1 ? 2 : 1) : big(v)} ${u[0]}`; };
const fmtTNT = (J) => { const g = J / 4184; const U = [['g', 1], ['kg', 1e3], ['tonnes', 1e6], ['kilotons', 1e9], ['megatons', 1e12], ['gigatons', 1e15], ['teratons', 1e18]];
  let u = U[0]; for (const x of U) if (g >= x[1]) u = x; const v = g / u[1]; return `${v < 10 ? v.toFixed(1) : big(v)} ${u[0]}`; };

export async function create() {
  const q = new URLSearchParams(location.search);
  globalThis.SSAA = Number(q.get('ssaa') ?? 2); globalThis.MSAA = Number(q.get('msaa') ?? 0);
  fadeShadowBorders(0.2);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('vec4( outgoingLight, diffuseColor.a )', 'vec4( min( outgoingLight, vec3( 20000.0 ) ), diffuseColor.a )');
  const R = createRenderer();
  const ov = new Overlay();
  document.body.classList.add('cine');
  const scene = new THREE.Scene();

  // ---- environment: a golden-hour sky for reflections ----
  const pm = new THREE.PMREMGenerator(R.renderer);
  const SKY = makeSky(); scene.add(SKY.mesh);
  const envScene = new THREE.Scene(); const envSky = makeSky(); envSky.U.uDisk.value = 0; envScene.add(envSky.mesh);
  scene.environment = pm.fromScene(envScene, 0, 1, 20000).texture; scene.environmentIntensity = 0.55;
  scene.fog = new THREE.FogExp2('#d9a888', 0.00012);

  // ---- the set ----
  const LAG = makeLagoon({ ssaa: globalThis.SSAA }); scene.add(LAG.mesh);
  const GR = makeGround(); scene.add(GR);
  const PZS = makePiazzetta(); scene.add(PZS.group);
  const FAR = makeFar(); scene.add(FAR);
  const CITY = makeCity(); scene.add(CITY);
  // a wide plain beyond the lagoon for the far shots: the Adriatic (east), the mainland (west and north), hazy
  const plain = new THREE.Mesh(new THREE.CircleGeometry(160000, 64), new THREE.ShaderMaterial({ fog: false,
    uniforms: { uApoc: VU.uApoc },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${SIMPLEX} uniform float uApoc; varying vec3 vW;
      void main(){ float land = smoothstep(0.0, 1500.0, -vW.x - 9000.0 + 3000.0 * fbm3(vec3(vW.xz * 0.00008, 1.0), 3)) + smoothstep(0.0, 2500.0, -vW.z - 7000.0);
        float sea = smoothstep(0.0, 800.0, vW.z - 3700.0 + 0.2 * vW.x);
        vec3 c = mix(vec3(0.16, 0.22, 0.2), vec3(0.09, 0.15, 0.22), sea);
        c = mix(c, vec3(0.28, 0.27, 0.18) * (0.85 + 0.3 * fbm3(vec3(vW.xz * 0.0006, 2.0), 3)), clamp(land, 0.0, 1.0));
        float d = length(vW.xz - cameraPosition.xz); c = mix(c, vec3(0.55, 0.42, 0.38), 1.0 - exp(-d * 0.000015));
        c *= 1.0 - 0.6 * uApoc;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  plain.rotation.x = -Math.PI / 2; plain.position.y = -1.2; plain.renderOrder = -5; scene.add(plain);
  // the gondolas moored along the Molo in front of you
  const GLIST = []; for (let i = 0; i < 8; i++) GLIST.push({ x: -14 - i * 3.0, z: 11.6, yaw: 0, ph: i * 1.7 });
  const GD = makeGondolas(GLIST); for (const g of GD.list) scene.add(g.group); scene.add(GD.poles);

  // ---- lights ----
  const sun = new THREE.DirectionalLight('#ffc185', 3.1); sun.position.copy(SUN).multiplyScalar(300); sun.target.position.set(0, 0, -20); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); { const c = sun.shadow.camera; c.left = -70; c.right = 70; c.top = 70; c.bottom = -70; c.near = 50; c.far = 700; } sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  const hemi = new THREE.HemisphereLight('#9fb4dc', '#7a5c44', 0.55); scene.add(hemi);
  const flashL = new THREE.PointLight('#fff1d8', 0, 0, 2); scene.add(flashL);
  const fbL = new THREE.PointLight('#ffb26a', 0, 0, 2); scene.add(fbL);
  const keyL = new THREE.PointLight('#ff9a5a', 0, 30, 2); scene.add(keyL);       // the burning horizon's light on you at the end

  // ---- you (Business_Male_04: bald, grey shirt, waistcoat) and the pigeons ----
  const env = scene.environment;
  const you = await loadAvatar('Business_Male_04', { env, facial: true }); scene.add(you.root);
  const faceShapes = {}; for (const m of you.meshes) { const d = m.morphTargetDictionary; if (!d) continue; for (const [n, i] of Object.entries(d)) { const k = n.replace(/^(AK|AU)_\d+_/, ''); (faceShapes[k] = faceShapes[k] || []).push([m, i]); } }
  const setFace = (map) => { for (const [k, v] of Object.entries(map)) for (const [m, i] of faceShapes[k] || []) m.morphTargetInfluences[i] = v; };
  // a sneeze: a short "ah" (head back, eyes narrowing, brows up), then the snap forward with the eyes shut
  const SNEEZE_T = SN.slice();
  const sneezeAB = (s) => { let a = 0, b = 0;
    for (let i = 0; i < SNEEZE_T.length; i++) { const ts = SNEEZE_T[i]; if (ts - s > 2.2) break; if (s - ts > 1.2) continue;
      const pre = i === 0 ? 2.0 : Math.min(0.5, 0.6 * (ts - SNEEZE_T[i - 1]));
      a = Math.max(a, smooth(ts - pre, ts - 0.05, s) * (1 - smooth(ts - 0.05, ts + 0.02, s)) * (i === 0 ? 1 : 0.8));
      b = Math.max(b, smooth(ts - 0.06, ts, s) * Math.exp(-Math.max(s - ts, 0) / 0.24)); }
    // the last itch (the next one coming at the very end)
    a = Math.max(a, 0.9 * smooth(57.0, 61.9, s));
    return [a, b]; };
  const blinkK = (t, list) => { let k = 0; for (const b0 of list) { const x = (t - b0) / 0.16; if (x > 0 && x < 1) k = Math.max(k, Math.sin(Math.PI * x)); } return k; };
  const BLINKS = [4.1, 7.6, 9.3, 21.7, 52.2, 54.0, 55.8];
  function poseYou(t, s) {
    const [a, b] = sneezeAB(s);
    const look = V(0, 2.9 + 1.6 * a - 2.2 * b, 6);
    stand(you, { pos: H.clone(), yaw: 0, breath: s * 0.25 + 0.6 * a, lean: -0.13 * a + 0.5 * b, look, lookK: 1 });
    const bl = Math.max(blinkK(s, BLINKS), b, 0.45 * a);
    you.blink(bl);
    setFace({ JawOpen: 0.32 * a + 0.22 * b, BrowInnerUp: 0.65 * a, EyeSquintLeft: 0.55 * a, EyeSquintRight: 0.55 * a, NoseSneerLeft: 0.7 * a + 0.9 * b, NoseSneerRight: 0.7 * a + 0.9 * b,
      MouthStretchLeft: 0.5 * b, MouthStretchRight: 0.5 * b, BrowDownLeft: 0.7 * b, BrowDownRight: 0.7 * b, CheekSquintLeft: 0.6 * b, CheekSquintRight: 0.6 * b });
    you.root.updateMatrixWorld(true);
  }
  // where the spray leaves your mouth at each sneeze (posed once here; the frames read it back)
  const mouthAt = []; { for (let n = 1; n <= 24; n++) { const ts = SN[n - 1] + 0.005; poseYou(ts, ts); const hd = wp(you.bones.Head), nk = wp(you.bones.Neck);
    const up = hd.clone().sub(nk).normalize(), fwd = V(0, 0, 1).addScaledVector(up, -up.z).normalize();
    mouthAt.push({ p: hd.clone().addScaledVector(up, -0.075).addScaledVector(fwd, 0.1), d: fwd.clone().multiplyScalar(0.95).addScaledVector(up, -0.3).normalize() }); }
    const ts = SN[39] + 0.005; poseYou(ts, ts); const hd = wp(you.bones.Head), nk = wp(you.bones.Neck), up = hd.clone().sub(nk).normalize(), fwd = V(0, 0, 1).addScaledVector(up, -up.z).normalize();
    mouthAt[39] = { p: hd.clone().addScaledVector(up, -0.075).addScaledVector(fwd, 0.1), d: fwd.clone().multiplyScalar(0.95).addScaledVector(up, -0.3).normalize() }; }
  // the spray: fine droplets lit by the low sun (sneezes 1-24, and 40 for the hook's slow motion)
  const fx = rng(1717), SPN = 7800, spray = new Sparks(SPN, { minPx: 1.6, maxPx: 7, near: 0.3, additive: true }); { let k = 0;
    for (const [n, m] of mouthAt.entries()) { if (!m) continue; const cnt = n === 39 ? 1600 : 220 + n * 10; const vmax = 6 + Math.min(n, 20) * 1.2;
      for (let i = 0; i < cnt && k < SPN; i++) { const c = Math.cos(fx() * 6.283), sn = Math.sin(fx() * 6.283), sp = Math.pow(fx(), 0.7) * 0.42, sp2 = vmax * (0.25 + 0.75 * Math.pow(fx(), 0.5));
        const side = V(1, 0, 0), upv = side.clone().cross(m.d).normalize(); const dir = m.d.clone().addScaledVector(side, c * sp).addScaledVector(upv, sn * sp).normalize();
        const br = 0.7 + 0.5 * fx(), lead = n === 39 ? 0.04 + 1.1 * Math.pow(fx(), 1.6) : 0;   // sneeze 40's cone is already out in the hook's slow motion
        spray.set(k++, m.p.x + dir.x * lead, m.p.y + dir.y * lead, m.p.z + dir.z * lead, dir.x * sp2, dir.y * sp2, dir.z * sp2, br, br * 0.92, br * 0.8, 0.0007 + 0.0016 * fx(), SN[n], 0.7 + 0.8 * fx(), fx()); } }
    spray.commit(); spray.u.uDrag.value = 2.6; spray.u.uAcc.value.set(0, -1.5, 0); spray.u.uAccT0.value = 0; scene.add(spray.points); }
  // pigeons: a flock pecking round you takes off on sneezes 6-10; one stays at your feet whatever happens
  const PIG = []; { const pr = rng(808);
    for (let i = 0; i < 16; i++) { const a = pr() * 6.283, d = 1.6 + 5.5 * Math.sqrt(pr()); let x = Math.sin(a) * d, z = Math.cos(a) * d * 0.8 - 1.0; if (z > 3.2) z = 3.2 - pr();
      if (Math.abs(x - PZ.COLS[0].x) < 3 && Math.abs(z - PZ.COLS[0].z) < 3) x += 4; if (Math.abs(x - PZ.COLS[1].x) < 3 && Math.abs(z - PZ.COLS[1].z) < 3) x -= 4;
      const gp = makeGroundPigeon(i), fp = makePigeon(); gp.scale.setScalar(0.95 + 0.12 * pr()); fp.scale.copy(gp.scale);
      gp.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(gp, fp);
      PIG.push({ gp, fp, x, z, yaw: pr() * 6.283, tOff: SN[5 + Math.floor(pr() * 5)] + 0.05 + 0.15 * pr(), ph: pr() * 10, sd: pr() }); } }
  const blobT = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.set(0, VZ.Y0 + 0.004, 0.02); blob.renderOrder = 2; scene.add(blob);
  const blob2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), blob.material); blob2.rotation.x = -Math.PI / 2; blob2.position.set(0.34, VZ.Y0 + 0.004, 0.52); blob2.renderOrder = 2; scene.add(blob2);
  const wtf = makeGroundPigeon(3); wtf.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(wtf);
  // Apple (rule 19): sitting on the bottom step of St Mark's column, the calm part only
  const apple = makeCat(); { const c = PZ.COLS[1]; apple.root.position.set(c.x - 1.9, VZ.Y0 + 0.45, c.z + 1.95); apple.root.rotation.y = -0.6; } scene.add(apple.root);

  // ---- the blasts ----
  const smokeT = smokeAtlas(7, 1.2);
  const sprayB = new Billboards(420, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 3 });     // water thrown up, behind the front
  sprayB.u.uLitCol.value.set('#fff4e6'); sprayB.u.uShadeCol.value.set('#b9bcc4'); scene.add(sprayB.mesh);
  const dustB = new Billboards(360, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 3 });      // dust off the paving and the façades
  dustB.u.uLitCol.value.set('#f2d2ae'); dustB.u.uShadeCol.value.set('#a08670'); scene.add(dustB.mesh);
  const SPR = []; for (let i = 0; i < 420; i++) SPR.push([fx(), fx(), fx(), fx()]);
  const DST = []; for (let i = 0; i < 360; i++) DST.push([fx(), fx(), fx(), fx()]);
  const domes = [makeShock(), makeShock(), makeShock()]; for (const d of domes) scene.add(d.mesh);
  const FB = makeFireball({ detail: 6 }); scene.add(FB.mesh); const HL = makeHalo('#ffd2a0'); scene.add(HL.mesh);
  const MN = 150, mush = new Billboards(MN, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 0, near: 50 }); mush.u.uLitCol.value.set('#ff9a52'); mush.u.uShadeCol.value.set('#4a3028'); mush.u.uFogD.value = 0; scene.add(mush.mesh);
  const MSP = []; for (let i = 0; i < MN; i++) MSP.push([fx(), fx(), fx(), fx()]);
  // the end: haze and embers round you
  const hazeB = new Billboards(90, { map: smokeT, tiles: [2, 2], additive: false, lit: true, nearK: 1, near: 4 }); hazeB.u.uLitCol.value.set('#8a4326'); hazeB.u.uShadeCol.value.set('#1e100c'); hazeB.u.uFogD.value = 0; scene.add(hazeB.mesh);
  const HZ = []; for (let i = 0; i < 90; i++) HZ.push([fx(), fx(), fx(), fx()]);
  const embers = new Sparks(2200, { minPx: 1.6, maxPx: 5, near: 0.6, additive: true }); for (let i = 0; i < 2200; i++) { const a = fx() * 6.283, d = 2 + 40 * Math.sqrt(fx()), c = 0.6 + 0.6 * fx();
    embers.set(i, Math.sin(a) * d, VZ.Y0 + fx() * 6, Math.cos(a) * d - 8, (fx() - 0.5) * 0.4, 0.3 + 0.5 * fx(), (fx() - 0.5) * 0.4, c * 1.0, c * 0.42, c * 0.12, 0.012 + 0.02 * fx(), -1e6, 1e7, fx()); }
  embers.commit(); embers.u.uTurb.value = 0.35; embers.u.uTurbF.value = 0.25; scene.add(embers.points);

  // ---- space (45-51): Venice on the terminator, the blast spreading round the globe ----
  const [day, night, cloudsTex] = await Promise.all([loadTex('/engine/tex/earth_day_4k.jpg'), loadTex('/engine/tex/earth_night_4k.jpg'), loadTex('/engine/tex/earth_clouds.jpg', false)]);
  const SPc = makeSpace6({ day, night, clouds: cloudsTex });
  SPc.U.uSun.value.copy(geoDir(-10.6, -61.2));                  // 16:05 UTC on 20 October: Venice just past sunset
  const VEN = geoDir(45.43, 12.34);
  const blastS = new THREE.Mesh(new THREE.SphereGeometry(1.012, 180, 90), new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { uC: { value: VEN.clone() }, uCore: { value: 0 }, uRing: { value: 0 }, uRingA: { value: 0 }, uSteam: { value: 0 }, uT: { value: 0 }, uSun: SPc.U.uSun },
    vertexShader: `varying vec3 vN, vW, vP; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${SIMPLEX} uniform vec3 uC, uSun; uniform float uCore, uRing, uRingA, uSteam, uT; varying vec3 vN, vW, vP;
      void main(){ vec3 q = normalize(vP); float ang = acos(clamp(dot(q, uC), -1.0, 1.0));
        float n = fbm3(q * 9.0 + vec3(0.0, uT * 0.05, 0.0), 4), n2 = fbm3(q * 30.0, 2);
        float core = smoothstep(uCore * (1.0 + 0.25 * n), uCore * (0.6 + 0.2 * n), ang);
        float x = (ang - uRing) / max(0.012, uRing * 0.06); float ring = exp(-x * x) * uRingA * (0.7 + 0.3 * n2);
        vec3 hot = mix(vec3(0.9, 0.22, 0.05), vec3(1.0, 0.62, 0.25), core * (0.3 + 0.7 * n));
        float steam = uSteam * (0.55 + 0.45 * n) * smoothstep(-0.25, 0.25, dot(q, uSun) + 0.6);
        vec3 sc = mix(vec3(0.3, 0.14, 0.08), vec3(0.95, 0.93, 0.9), smoothstep(-0.15, 0.3, dot(q, uSun)));
        vec3 c = hot * (core * 0.85 * (0.55 + 0.45 * n2) + ring * 1.3) + sc * steam * 0.75;
        float a = clamp(core * 0.9 + ring + steam * 0.55 * (0.55 + 0.45 * n), 0.0, 1.0);
        gl_FragColor = vec4(c / max(a, 0.001), a); }` }));
  SPc.scene.add(blastS);
  const camS = new THREE.PerspectiveCamera(30, W / HH, 0.01, 9000);
  const camDirS = VEN.clone().addScaledVector(geoDir(30, -10), 0.4).normalize();

  const tag = makeEndTag({ text: 'Follow for more', ssaa: globalThis.SSAA });
  await Promise.all(TEX_PENDING);

  const cam = new THREE.PerspectiveCamera(40, W / HH, 0.1, 400000);
  cam.layers.enable(1); for (const o of [sprayB.mesh, dustB.mesh, mush.mesh, hazeB.mesh, embers.points, spray.points, HL.mesh, ...domes.map((d) => d.mesh)]) o.layers.set(1);
  const shotId = (t) => (t < T.HOOK ? 0 : t < T.CUT1 ? 1 : t < T.WATER ? 2 : t < T.FAR ? 3 : t < T.SPACE ? 4 : t < T.FACE ? 5 : 6);
  const camAt = (c, t) => { const id = shotId(t); (id === 0 ? hook : id === 1 ? glideA : id === 2 ? ground : id === 3 ? water : id === 4 ? far : face).apply(c, t); };
  // how far each blast reaches (its front) and how strong it still is, as seen at story time s
  const blastAt = (n, s) => { const ts = SN[n - 1], tp = s - ts; return tp <= 0 ? null : { E: En(n), tp, R: blastR(En(n), tp) }; };

  function hudAt(t, s) {
    const k = hudK(t, T.FIRST);
    if (t < T.FIRST) return { a: 1, k, lab: 'Your next sneeze in', val: fmtT(T.FIRST - t), sub: 'Venice · the Molo, St Mark’s', sub2: 'A normal sneeze: ~0.05 J' };
    if (t >= T.END) return null;
    const a = 1 - smooth(T.END - 0.3, T.END, t);
    if (t >= T.FACE) return { a, k, lab: 'Sneezes so far', val: '97', sub: 'You: not a scratch', sub2: 'Sneeze 113 would blow Earth apart' };
    const n = Math.max(1, nAt(s)), E = En(n);
    let sub2;
    if (n === 1) sub2 = 'A normal sneeze'; else if (n < 17) sub2 = `${big(Math.pow(2, n - 1))}× a normal sneeze`;
    else if (n < 51) sub2 = `≈ ${fmtTNT(E)} of TNT`;
    else if (n < 64) sub2 = `≈ ${big(E / 6.3e13)} Hiroshima bomb${E / 6.3e13 >= 1.5 ? 's' : ''}`;
    else if (n < 84) sub2 = `≈ ${fmtTNT(E)} of TNT`;
    else if (n < 97) sub2 = `≈ ${big(E / 4.2e23)}× the dinosaur asteroid`;
    else sub2 = 'Enough to boil every ocean';
    return { a, k, lab: 'Sneeze', val: `#${n}`, sub: `Energy: ${fmtE(E)}`, sub2 };
  }

  function frame(t) {
    const U = R.grade.uniforms;
    U.uTime.value = t; U.uFade.value = 0; U.uFadeWhite.value = 0; U.uScan.value = 0; U.uTint.value.set(1, 1, 1); U.uShake.value.set(0, 0);
    U.uSat.value = 1.06; U.uContrast.value = 1.05; U.uVignette.value = 0.32; U.uAberr.value = 0.0012; U.uGrain.value = 0; U.uBarrel.value = 0;
    const s = storyT(t), id = shotId(t), space = id === 5;
    VU.uT.value = s; let rscene = scene, rc = cam;
    if (space) {
      rscene = SPc.scene; rc = camS;
      const u = clamp((t - T.SPACE) / (T.FACE - T.SPACE)), S = SPc.U;
      S.uLights.value = 1 - smooth(47.0, 49.5, s); S.uClouds.value = 0.9; S.uCloudLow.value = 0; S.uLandW.value = 0; S.uSeaW.value = 0; S.uAtm.value = 1; S.uTime.value = t;
      const dir = camDirS.clone().applyAxisAngle(V(0, 1, 0), 0.05 * u);
      camS.position.copy(dir).multiplyScalar(4.3 - 0.2 * smooth(0, 1, u)); camS.up.set(0, 1, 0); camS.lookAt(VEN.clone().multiplyScalar(0.55)); camS.updateMatrixWorld();
      SPc.stars.u.uGain.value = 0.9; SPc.stars.u.uPR.value = R.SSAA;
      const bu = blastS.material.uniforms, n = nAt(s);
      bu.uCore.value = 0.01 + 0.05 * smooth(45.3, 47.0, s) + 0.18 * smooth(47.0, 50.3, s);
      bu.uRing.value = s < 47.0 ? 0 : 0.03 + (s - 47.0) * 0.55; bu.uRingA.value = s < 47.0 ? 0 : Math.exp(-(s - 47.0) / 1.6);
      bu.uSteam.value = 0.4 * smooth(48.5, 50.6, s); bu.uT.value = s;
      R.renderer.toneMappingExposure = 1.0; R.bloom.strength = 0.45; R.bloom.radius = 0.6; R.bloom.threshold = 0.9;
      // a soft flash on each sneeze (never a strobe: they overlap into a glow)
      const fl = 0.06 * smooth(45.3, 46.8, s) * (1 - smooth(47.6, 49.5, s)) + (s >= 47.0 ? 0.3 * smooth(47.0, 47.06, s) * Math.exp(-(s - 47.06) / 0.5) : 0);   // a glow, never a strobe
      U.uFadeWhite.value = Math.min(0.35, fl);
    } else {
      // ---- pose before the camera ----
      poseYou(t, s);
      camAt(cam, t);
      if (q.get('dcam')) { const c = q.get('dcam').split(',').map(Number); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.fov = c[6] || 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
      const n = nAt(s), endK = id === 6 ? 1 : 0, farK = id === 4 ? 1 : 0;
      SKY.mesh.position.copy(cam.position);
      // the world after sneeze 97 (the end): no Venice, scorched ground, a smoke sky
      VU.uApoc.value = endK ? 1 : farK ? smooth(39, 45, s) * 0.6 : 0;
      VU.uScorch.value = endK ? 0.78 : farK ? smooth(38.5, 41, s) : smooth(34.3, 36, s) * 0.25;
      PZS.group.visible = CITY.visible = FAR.visible = !endK; LAG.mesh.visible = !endK; plain.visible = !endK;
      for (const g of GD.list) g.group.visible = !endK && id <= 3; GD.poles.visible = !endK && id <= 3;
      scene.fog.color.set(endK ? '#3e1a10' : '#d9a888'); scene.fog.density = endK ? 0.011 : farK ? 0.000006 : 0.00012;
      sun.intensity = endK ? 0.25 : 3.1 * (1 - 0.7 * VU.uApoc.value); sun.color.set(endK ? '#ff5a2a' : '#ffc185'); hemi.intensity = endK ? 0.22 : 0.55; hemi.color.set(endK ? '#7a3a28' : '#9fb4dc');
      keyL.intensity = endK ? 16 : 0; keyL.position.set(-2.6, 1.4, 3.6);
      // ---- the lagoon: chop, the rings of every blast still spreading ----
      const rings = VU.uRing.value; for (const r of rings) r.set(0, 0, -1, 0);
      VU.uChop.value = 1 + Math.min(0.6, Math.max(0, n - 10) * 0.05);
      for (let i = id === 0 ? 40 : Math.max(12, n - 5); i <= n; i++) { const B = blastAt(i, s); if (!B) continue; const slot = i % 6;
        const gust = i < 25, Rr = gust ? Math.min(B.R, 0.6 + 20 * B.tp) : B.R, amp = Math.min(1.2, 0.18 * Math.log10(B.E / 60)) * Math.exp(-B.tp / (gust ? 1.2 : 2.5));
        if (amp > 0.01) rings[slot].set(0, 0.15, Math.sqrt(Math.max(Rr * Rr - 8.1, 0.01)), gust || id === 0 ? amp : amp * 0.35); }
      VU.uSteam.value = farK ? smooth(39, 44, s) * 0.5 : 0; LAG.U.uFogD.value = farK ? 0.000015 : 0.00022; LAG.U.uFogC.value.set(farK ? '#8c6b61' : '#d9a888');
      // ---- the gondolas: bobbing, rocked by the gusts, then pushed straight out over the water ----
      let push = 0, rock = 0; for (let i = 15; i <= n; i++) { const B = blastAt(i, s); if (!B) continue; const kk = Math.pow(B.E, 0.25) * 0.06;
        push += kk * smooth(0, 1.2, B.tp) * 2.2; rock += kk * Math.exp(-B.tp / 0.9) * Math.sin(B.tp * 7); }
      for (const g of GD.list) { const p = g.p, w = s * 1.1 + p.ph; g.group.position.set(p.x, 0.04 * Math.sin(w) + Math.min(0.6, 0.05 * rock * rock), p.z + Math.min(push, 400));
        g.group.rotation.set(0.015 * Math.sin(w * 0.8) + 0.05 * Math.max(-1, Math.min(1, rock)), p.yaw, 0.03 * Math.sin(w * 0.9 + 1) + 0.12 * Math.max(-1, Math.min(1, rock * 0.7))); }
      // ---- pigeons ----
      for (const P of PIG) { const ta = s - P.tOff;
        if (ta < 0 || id === 6) { P.gp.visible = id !== 6 && id <= 2; P.fp.visible = false; P.gp.position.set(P.x, VZ.Y0, P.z); P.gp.rotation.y = P.yaw + 0.3 * Math.sin(s * 0.3 + P.ph);
          const pk = Math.max(0, Math.sin(s * (2.2 + P.sd) + P.ph)); P.gp.peck(Math.pow(pk, 3)); P.gp.look(0.4 * Math.sin(s * 0.7 + P.ph * 2)); }
        else { P.gp.visible = false; P.fp.visible = id <= 2 && ta < 4; const out = V(P.x, 0, P.z + 1.0).normalize();
          const dist = 2.5 * ta + 3.5 * ta * ta, up = 1.6 * ta + 1.4 * ta * ta;
          P.fp.position.set(P.x + out.x * dist, VZ.Y0 + 0.15 + up, P.z + out.z * dist); P.fp.rotation.set(-0.35, Math.atan2(out.x, out.z), 0); P.fp.flap(ta * 7.5 + P.ph); } }
      wtf.position.set(0.34, VZ.Y0, 0.52); wtf.rotation.y = -0.4 + 0.25 * Math.sin(s * 0.4); wtf.peck(Math.pow(Math.max(0, Math.sin(s * 1.9 + 1.0)), 4)); wtf.look(0.35 * Math.sin(s * 0.6));
      apple.update(t, { look: cam.position, blinkAt: [8.3, 10.1], earAt: [9.4], pr: R.SSAA }); apple.root.visible = t >= T.CUT1 && t < T.FIRST + 0.5;
      // ---- spray (sneeze droplets) ----
      spray.update(s, cam, R.SSAA); spray.points.visible = id <= 2;
      // ---- domes: the condensation skin of the biggest recent fronts; faded before they reach the lens ----
      const camD = cam.position.distanceTo(V(0, 2, 0));
      domes.forEach((d) => { d.mesh.visible = false; });
      // (only in the hook's slow motion: at full speed a dome is a 3-frame pop)
      if (id === 0) for (let i = 40, k = 0; i <= n && k < 3; i++, k++) { const B = blastAt(i, s); if (!B) continue; const d = domes[i % 3];
        d.mesh.visible = true; d.mesh.position.set(0, VZ.Y0 + 1.65, 0.15); d.U.uR.value = B.R; d.U.uTime.value = s;
        d.U.uA.value = Math.min(0.9, 0.12 * Math.log10(B.E / 1e6)) * (id === 0 ? 1 : smooth(0, 0.12, B.tp) * (1 - smooth(camD * 0.55, camD * 0.92, B.R))) * Math.exp(-B.tp / 1.5); }
      // the newest big dome bends the light behind it (a refraction ring in the grade); in the hook, the air in it glows
      U.uWarp.value = 0; HL.mesh.visible = false;
      { const i = 40, B = id === 0 ? blastAt(i, s) : null;
        if (B && (id === 0 || B.tp < 0.3)) { const c0 = V(0, VZ.Y0 + 1.65, 0.15), right = V(1, 0, 0).applyQuaternion(cam.quaternion), p0 = c0.clone().project(cam), p1 = c0.clone().addScaledVector(right, B.R).project(cam);
          U.uWarpC.value.set(p0.x * 0.5 + 0.5, p0.y * 0.5 + 0.5); U.uWarpR.value = Math.hypot((p1.x - p0.x) * 0.5, (p1.y - p0.y) * 0.5 * 1.7778); U.uWarpW.value = 0.03; U.uWarp.value = id === 0 ? 0.008 : 0.008 * smooth(0, 0.07, B.tp) * Math.exp(-B.tp / 0.12);
          if (id === 0) { HL.mesh.visible = true; HL.mesh.position.copy(c0); HL.U.uR.value = B.R * 0.6; HL.U.uI.value = 0.3; } } }
      // ---- water thrown up and dust off the paving behind each big front ----
      let sk = 0, dk = 0;
      for (let i = Math.max(25, n - 5); i <= n && id <= 3 && id !== 0; i++) { const ts = SN[i - 1], E = En(i), Rs = Math.min(45, 3 + 3.2 * Math.pow(E / 4.184e6, 1 / 3));
        for (let j = 0; j < 24 && sk < 420; j++) { const [ra, rb, rc2, rd] = SPR[(i * 37 + j) % 420]; const ang = (ra - 0.5) * 2.9, r = Math.max(5, Rs * Math.sqrt(rb)),
          x = Math.sin(ang) * r, z = 2 + Math.cos(ang) * r; if (z < VZ.QZ + 1.5) continue;
          const age = s - ts - r / 343; if (age <= 0 || age > 4.5) continue; const hh = Rs * (0.07 + 0.18 * rc2) * smooth(0, 0.8, age) * (1 - 0.3 * smooth(1.5, 4.5, age)), sz = Math.max(2.0, Rs * 0.16) * (0.7 + 0.6 * rd) * (1 + 0.5 * smooth(0, 3, age));
          sprayB.set(sk++, x, hh * 0.6 + sz * 0.25, z + Math.sign(z) * age * 2, sz, sz, 1, 1, 1, 0.42 * smooth(0, 0.25, age) * (1 - smooth(1.8, 4.5, age)), rd * 6.28 + age * 0.2, Math.floor(rd * 4)); }
        if (i >= 30) for (let j = 0; j < 20 && dk < 360; j++) { const [ra, rb, rc2, rd] = DST[(i * 53 + j) % 360]; const ang = Math.PI + (ra - 0.5) * 3.6, r = Math.max(4, Rs * 0.8 * Math.sqrt(rb)),
          x = Math.sin(ang) * r, z = Math.cos(ang) * r; if (z > VZ.QZ - 0.5 || r > 35) continue; const age = s - ts - r / 343; if (age <= 0 || age > 5) continue;
          const sz = Math.max(2.5, Rs * 0.13) * (0.7 + 0.6 * rd) * (1 + 0.6 * smooth(0, 4, age));
          dustB.set(dk++, x, VZ.Y0 + sz * 0.35 + rc2 * Rs * 0.06 * smooth(0, 1, age), z, sz, sz, 1, 1, 1, 0.6 * smooth(0, 0.3, age) * (1 - smooth(2, 5, age)), rd * 6.28 + age * 0.15, Math.floor(rd * 4)); } }
      for (let i = Math.max(14, n - 3); i <= Math.min(n, 24) && id === 2; i++) { const ts = SN[i - 1], age0 = s - ts; if (age0 <= 0 || age0 > 2.2) continue; const reach = 2 + i * 0.5;
        for (let j = 0; j < 14 && dk < 360; j++) { const [ra, rb, rc2, rd] = DST[(i * 29 + j) % 360]; const ang = ra * 6.283, r = 0.8 + Math.min(reach, 22 * age0) * (0.5 + 0.5 * rb);
          const x = Math.sin(ang) * r, z = Math.cos(ang) * r * 0.9; if (z > VZ.QZ - 0.3) continue; const sz = 0.5 + 0.9 * rd + 0.8 * age0;
          dustB.set(dk++, x, VZ.Y0 + sz * 0.12, z, sz * 1.4, sz * 0.4, 1, 1, 1, 0.16 * smooth(0, 0.15, age0) * (1 - smooth(0.9, 2.2, age0)), rd * 0.4 + age0 * 0.1, Math.floor(rd * 4)); } }
      // the Campanile slumps into its own dust (sneeze 45; it fell by itself once, in 1902)
      const cT = s - SN[44], cK = smooth(0.15, 1.6, cT); PZS.campanile.position.y = VZ.Y0 - 99 * cK * cK; PZS.campanile.visible = cK < 0.999;
      if (id <= 3) for (let j = 0; j < 80 && dk < 360; j++) { if (cT <= 0) break; const [ra, rb, rc2, rd] = DST[j]; const a2 = ra * 6.283, r = 5 + 8 * rb * smooth(0, 1.5, cT);
        const yy = VZ.Y0 + (2 + 40 * rc2) * smooth(0, 1.2, cT) * (1 - 0.6 * rc2 * cK), sz = 7 + 8 * rd + 6 * smooth(0, 2, cT);
        dustB.set(dk++, PZ.CAMP.x + Math.cos(a2) * r, Math.min(yy, VZ.Y0 + 99 - 99 * cK * cK + 4), PZ.CAMP.z + Math.sin(a2) * r, sz, sz, 1, 1, 1, 0.6 * smooth(0, 0.3, cT), rd * 6.28 + cT * 0.1, Math.floor(rd * 4)); }
      if (id === 0) { const B = blastAt(40, s); if (B) for (let j = 0; j < 90; j++) { const [ra, rb, rc2, rd] = SPR[j]; const ang = ra * 6.283, z0 = Math.cos(ang), onW0 = z0 * B.R > VZ.QZ + 1.0, hh0 = onW0 ? 2.85 : 1.65, foot = Math.sqrt(Math.max(B.R * B.R - hh0 * hh0, 0.01)), r = foot * (0.86 + 0.16 * rb), x = Math.sin(ang) * r, z = 0.15 + z0 * r;
          const onW = z > VZ.QZ + 1.0, sz = (1.2 + 1.6 * rd) * (0.6 + 0.4 * B.R / 14), y = (onW ? 0.2 : VZ.Y0) + sz * 0.3 + rc2 * 0.6;
          if (onW && sk < 420) sprayB.set(sk++, x, y, z, sz, sz * 0.75, 1, 1, 1, 0.4, rd * 6.28, Math.floor(rd * 4));
          else if (!onW && dk < 360) dustB.set(dk++, x, y, z, sz, sz * 0.75, 1, 1, 1, 0.3, rd * 6.28, Math.floor(rd * 4)); } }
      for (let i = sk; i < 420; i++) sprayB.set(i, 0, -999, 0, 0, 0, 0, 0, 0, 0); for (let i = dk; i < 360; i++) dustB.set(i, 0, -999, 0, 0, 0, 0, 0, 0, 0);
      sprayB.commit(); sprayB.update(cam, R.SSAA, SUN); dustB.commit(); dustB.update(cam, R.SSAA, SUN); sprayB.mesh.visible = dustB.mesh.visible = id <= 3;
      // ---- the flash of the big ones (the air in the jet glows), the fireballs of the far shot ----
      let fl = 0; for (let i = Math.max(36, n - 3); i <= n && id <= 3; i++) { const B = blastAt(i, s); if (B) fl += Math.pow(B.E / 1e9, 0.5) * 40 * smooth(0, 0.07, B.tp) * Math.exp(-Math.max(0, B.tp - 0.07) / 0.25); }   // rises over two frames, fades over eight
      flashL.position.set(0, VZ.Y0 + 1.7, 1.8); flashL.intensity = Math.min(fl, id === 0 ? 8 : 1500);
      FB.mesh.visible = HL.mesh.visible = mush.mesh.visible = false; fbL.intensity = 0;
      if (farK) { let Rf = 0, heat = 0; for (let i = 46; i <= n; i++) { const B = blastAt(i, s); if (!B) continue; const Rmax = 60 * Math.pow(B.E / 4.184e12, 0.4), g = smooth(0, 0.35, B.tp);
          Rf = Math.max(Rf, Rmax * (0.25 + 0.75 * g)); heat = Math.max(heat, Math.exp(-B.tp / 0.6)); }
        if (Rf > 0) { const cy = Rf * 0.85 + 0.25 * Rf * smooth(0, 3, s - SN[45]); FB.mesh.visible = HL.mesh.visible = true; FB.mesh.position.set(0, cy, 0); FB.U.uR.value = Rf; FB.U.uTime.value = s * 0.4;
          FB.U.uRough.value = 0.24; FB.U.uHeat.value = 0.72 + 0.22 * heat; FB.U.uSmoke.value = 0.3 * (1 - heat); FB.U.uGain.value = 0.55; FB.U.uSoot.value = 0.25; FB.U.uViolet.value = 0; FB.U.uSquash.value = 0.92;
          HL.mesh.position.copy(FB.mesh.position); HL.U.uR.value = Rf * 1.6; HL.U.uI.value = 0.22 + 0.3 * heat;
          fbL.position.copy(FB.mesh.position); fbL.intensity = 2.2 * Math.pow(farDist(t), 2) * (0.35 + 0.65 * heat);
          for (let i = 0; i < MN; i++) { const [a, b, c, sd] = MSP[i]; const an = a * 6.283 + s * 0.04;
            if (i < 60) { const hgt = b * cy, rr = Rf * (0.25 + 0.35 * (1 - b)) * (0.8 + 0.5 * c), sz = Rf * (0.45 + 0.35 * c);
              mush.set(i, Math.cos(an) * rr, hgt, Math.sin(an) * rr, sz, sz, 1, 1, 1, 0.8 * smooth(0.1, 0.5, b + 0.3) * smooth(SN[50], SN[50] + 1.5, s), sd * 6.28, Math.floor(sd * 4)); }
            else { const rr = Rf * (0.55 + 0.75 * c), yy = cy + Rf * (0.15 + b * 0.75), sz = Rf * (0.8 + 0.6 * c);
              mush.set(i, Math.cos(an) * rr, yy, Math.sin(an) * rr, sz, sz * 0.8, 1, 1, 1, 0.85 * smooth(SN[47], SN[47] + 1.2, s), sd * 6.28 + s * 0.05, Math.floor(sd * 4)); } }
          mush.commit(); mush.update(cam, R.SSAA, V(0, -1, 0)); mush.mesh.visible = true; } }
      // ---- the end: haze and embers round you ----
      hazeB.mesh.visible = embers.points.visible = blob.visible = blob2.visible = !!endK;
      if (endK) { for (let i = 0; i < 90; i++) { const [a, b, c, d] = HZ[i]; const an = a * 6.283 + s * 0.015 * (c - 0.5), r = 9 + 60 * b, sz = 8 + 14 * c;
          hazeB.set(i, Math.sin(an) * r, VZ.Y0 + sz * 0.3 + 4 * d, -Math.abs(Math.cos(an)) * r * 0.9 - 6, sz, sz, 1, 1, 1, 0.38, d * 6.28 + s * 0.02, Math.floor(d * 4)); }
        hazeB.commit(); hazeB.update(cam, R.SSAA, V(-0.4, 0.3, 0.8).normalize()); embers.update(s, cam, R.SSAA); }
      // ---- camera shake when a front reaches the lens; exposure ----
      let sh = 0; for (let i = Math.max(14, n - 4); i <= n; i++) { const B = blastAt(i, s); if (!B || id > 4) continue; const dd = id === 4 ? farDist(t) : camD, arr = B.R - dd;
        if (arr > 0) sh += Math.min(1, 0.0025 * Math.pow(B.E, 0.18)) * smooth(0, Math.max(40, dd * 0.5), arr) * Math.exp(-arr / Math.max(30, dd * 1.2)); }   // eases in over a few frames
      U.uShake.value.set((Math.sin(t * 17) + 0.6 * Math.sin(t * 23 + 1)) * sh * 0.004, (Math.cos(t * 19) + 0.6 * Math.sin(t * 29)) * sh * 0.004);   // a sway, not a per-frame jitter
      const ex = endK ? 1.25 : 1.0; R.renderer.toneMappingExposure = ex; R.bloom.strength = farK ? 0.32 : 0.28; R.bloom.radius = 0.5; R.bloom.threshold = 0.9 / ex;
      U.uFadeWhite.value = Math.min(0.5, fl > 0 ? 0.25 * Math.min(1, fl / 2e4) : 0);
      U.uBarrel.value = 0.06 * Math.min(1, sh);
      cam.near = id === 4 ? Math.max(1, farDist(t) * 0.002) : 0.1; cam.updateProjectionMatrix();
    }
    R.renderPass.scene = rscene; R.renderPass.camera = rc;
    R.composer.render();
    const cover = q.get('cover') === '1', endA = smooth(T.END, T.END + 0.5, t);
    ov.apply({ labels: [], tag: 'WHAT IF &nbsp;·&nbsp; 11', tagA: t < T.END ? 1 : 0, title: { html: TITLE, a: cover ? 1 : t < T.HOOK ? 1 - smooth(T.HOOK - 0.25, T.HOOK, t) : 0, k: 1 },
      hud: cover ? null : hudAt(t, s), caption: cover ? null : captionAt(CAPTIONS, t),
      end: endA > 0 ? { a: endA, title: TITLE, note: '<span class="q">Could you hold in the next one?</span><br><br>Sneeze 113 would blow Earth apart<br>Donna Griffiths sneezed for 976 days' } : null });
    tag.update(t, T.END + 0.5, endA);
  }
  window.EP = { scene, cam, THREE };
  return { duration: DUR, fps: 30, frame, captions: CAPTIONS };
}
