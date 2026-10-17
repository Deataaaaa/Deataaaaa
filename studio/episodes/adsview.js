// Look-dev for the invented Times Square adverts (post 6), not an episode: both atlases on one page.
import { createRenderer } from '../engine/core.js';
import { loadAdFonts, makeAdAtlases } from '../engine/ads6.js';
export async function create() {
  globalThis.SSAA = 1; globalThis.MSAA = 0; createRenderer();
  await loadAdFonts(); const A = makeAdAtlases();
  const wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px;background:#222;z-index:50';
  const a = A.wide.image; a.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:540px';
  const b = A.tall.image; b.style.cssText = 'position:absolute;left:0;top:560px;width:1080px;height:1080px';
  wrap.append(a, b); document.body.appendChild(wrap);
  return { duration: 61, fps: 30, frame() {}, captions: [] };
}
