// Post 13 timeline and camera moves (shared by ep19.js, its audio script and camflow). Piccadilly frame
// (engine/piccadilly.js): x east, z south, y up, Eros at the origin, the Lights ~40 m to the north-north-west.
import * as THREE from 'three';
import { CamPath } from '../engine/core.js';

export const T = { HOOK: 3.6, FLIP: 12.0, Y1: 19.6, Y2: 28.4, Y3: 36.3, Y4: 44.6, Y5: 52.2, BACK: 54.0, CRASH: 56.0, END: 62.0 };
export const SHOTS = [3.6, 12.0, 15.6, 19.6, 36.3, 52.2, 56.0];   // the cuts
export const SH = { HOOK: 0, CALM: 1, PHONE: 2, WIDE: 3, Y12: 4, Y34: 5, Y5A: 6, Y5B: 7 };
export const DUR = 68.0;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// the story clock in days since the flip (midnight, 1 January 2027); Year 5's midnight is day 1,826 (2028 is a leap year)
const DK = [[T.FLIP, 0], [T.Y1, 1], [T.Y2, 380], [T.Y3, 760], [T.Y4, 1130], [T.Y5, 1500], [T.BACK, 1826]];
export function dayAt(t) {
  if (t < T.FLIP) return 0;
  for (let i = 1; i < DK.length; i++) if (t < DK[i][0]) { const [t0, d0] = DK[i - 1], [t1, d1] = DK[i]; const k = (t - t0) / (t1 - t0); return d0 + (d1 - d0) * k; }
  return 1826;
}
// the hook replays the flip in slow motion (9x): story time 12.2 -> 12.6 over the first 3.6 s (the wipe 20% -> 95% across)
export const hookStory = (t) => 12.2 + 0.4 * (t / T.HOOK);
export const storyAt = (t) => (t < T.HOOK ? hookStory(t) : t);

// your likes: 12 until midnight, then the flood (3,214,559 within the first hours), slowly more, then the crash at Year 5
export function likesAt(t) {
  const s = storyAt(t);
  if (s < T.FLIP) return 12;
  if (s < T.BACK + 1.6) { const k = Math.min(1, (s - T.FLIP) / 3.2), e = k * k * (3 - 2 * k); const base = 12 + (3214559 - 12) * (1 - Math.pow(1 - e, 3));
    return Math.round(base + Math.max(0, s - (T.FLIP + 3.2)) * 410); }
  const k = Math.min(1, (s - (T.BACK + 1.6)) / 1.4); return Math.max(12, Math.round((3214559 + 410 * (T.BACK - T.FLIP - 1.6)) * Math.pow(1 - k, 3) + 12 * k));
}
export function followersAt(t) { const d = dayAt(t); if (storyAt(t) < T.FLIP) return 214; if (t >= T.BACK + 1.6) return Math.max(214, Math.round(48200000 * Math.pow(1 - Math.min(1, (t - T.BACK - 1.6) / 1.4), 3))); return Math.round(214 + 48200000 * (1 - Math.exp(-d / 220))); }

// ---- the places ----
export const PSI = Math.atan2(-14, -43);                         // from Eros toward the middle of the Lights
export const HERO_DIR = V(Math.sin(PSI), 0, Math.cos(PSI));
const RT = V(-HERO_DIR.z, 0, HERO_DIR.x);                        // your right
export const SEAT_R = 3.7 * Math.cos(Math.PI / 8) + 0.2, SEAT_Y = 0.12 + 2 * 0.36;
export const HERO = HERO_DIR.clone().multiplyScalar(SEAT_R).setY(SEAT_Y);
// a point in your frame: metres forward (toward the Lights), to your right, and above your seat
export const HF = (f, r, u) => HERO.clone().addScaledVector(HERO_DIR, f).addScaledVector(RT, r).add(V(0, u, 0));
export const BIN_P = HF(6.0, 0.8, 0).setY(0);
export const PILE_C = HF(6.3, 2.2, 0).setY(0);
export const BINGUY_P = HF(5.6, 0.15, 0).setY(0);
export const PHONEBOX_P = HF(5.5, -6.5, 0).setY(0);
const SCR_C = V(-13, 13, -43);

// ---- cameras (checked with tools/frame19.mjs and tools/camflow.mjs) ----
const P = (keys) => new CamPath(keys, { easeIn: false, easeOut: false, arc: true });
const PHONE = HF(0.33, -0.04, 0.57);
// the hook: low on the plaza behind the bin's neighbour, the Lights flipping above (slow motion)
export const hook = P([[0, HF(1.8, 0.9, 0.45), HF(14, 1.3, 1.7), 62], [T.HOOK, HF(1.95, 0.88, 0.47), HF(14, 1.3, 1.75), 61]]);
// the calm: from high over the crowd down to over your shoulder, then into your phone
export const calm = P([[T.HOOK, V(12, 15, 4), V(-9, 8, -36), 50], [6.6, HF(-0.45, 0.12, 1.0), HF(12, 0.8, 2.4), 58], [T.FLIP, HF(-0.12, 0.32, 1.02), PHONE, 38]]);
// the flip: your phone as the likes pour in, then back and up to the flipped Lights and the crowd
export const flipA = P([[T.FLIP, HF(-0.12, 0.32, 1.02), PHONE, 38], [15.6, HF(-0.1, 0.31, 0.99), PHONE, 34]]);
// ...then the Lights flipped and the crowd cheering (a cut on the fireworks)
export const flipB = P([[15.6, HF(0.5, 1.3, 1.0), HF(14, 0.6, 2.6), 60], [T.Y1, HF(0.65, 1.25, 1.4), HF(14, 0.6, 2.9), 58]]);
// Years 1-2: the bin's neighbour, then up over the Circus (snow in Year 2)
export const years12 = P([[T.Y1, HF(0.7, 1.3, 0.95), HF(6.2, 1.3, 0.9), 60], [23.0, HF(0.85, 1.3, 1.15), HF(6.2, 1.3, 1.1), 58], [28.0, HF(1.6, 2.0, 5.0), HF(14, 0.8, 6.0), 54], [32.0, V(6, 13, 6), V(-10, 8, -36), 50], [T.Y3, V(14, 32, 22), V(-8, 4, -22), 44]]);
// Years 3-4: from high down to the crowd filming your face on the Lights, then toward you on the steps
export const years34 = P([[T.Y3, V(-16, 26, 18), V(-12, 12, -40), 44], [42.0, HF(2.6, 2.6, 2.2), HF(14, 0.2, 7), 54], [47.0, HF(1.5, 2.2, 1.7), HF(14, 0.3, 6), 56], [T.Y5, HF(0.4, 1.6, 1.3), HF(12, 0.4, 4.2), 56]]);
// Year 5: over your shoulder for the countdown and the flip back; then your face
export const year5a = P([[T.Y5, HF(-0.45, 0.13, 1.0), HF(12, 0.8, 2.3), 58], [T.CRASH, HF(-0.42, 0.13, 1.0), HF(12, 0.8, 2.1), 56]]);
export const year5b = P([[T.CRASH, HF(1.5, 0.55, 0.95), HF(0.1, 0, 0.9), 40], [T.END, HF(1.05, 0.4, 0.92), HF(0.1, 0, 0.9), 32]]);
export const CAMS = [hook, calm, flipA, flipB, years12, years34, year5a, year5b];
export const shotAt = (t) => { let i = 0; while (i < SHOTS.length && t >= SHOTS[i]) i++; return i; };
