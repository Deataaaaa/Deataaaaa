// Frame renderer: serves the studio folder, drives the player page in headless Chromium,
// and writes JPEG frames (or a few preview stills).
// usage: node render.mjs --ep ep01 --stills 1,14,22 --out /path
//        node render.mjs --ep ep01 --out /path/frames [--from 0 --to 1800] [--fps 30] [--resume]
//        [--step N --offset k]   this worker takes frames from+k, from+k+N, ... (tools/renderall.mjs runs N of them)
//        [--gpu [--headed]]      render on the graphics card (the owner's PC) instead of SwiftShader (this cloud box)
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a), []));
const root = path.dirname(fileURLToPath(import.meta.url));   // URL.pathname breaks on Windows (/C:/...)
const ep = args.ep || 'ep01';
const out = args.out || path.join(root, 'out', ep);
fs.mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css' };
const srv = http.createServer((q, s) => {
  const p = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(s);
});
// a free port: parallel workers used to collide on a random pick (EADDRINUSE killed one silently)
const port = await new Promise((res) => { srv.once('listening', () => res(srv.address().port)); srv.listen(0, '127.0.0.1'); });

// --gpu: the full Chromium in new headless mode uses the graphics card (D3D11 on Windows); --headed opens a real window,
// the fallback when headless still lands on a software renderer
const gpu = !!args.gpu;
const browser = await chromium.launch(gpu
  ? { headless: !args.headed, channel: args.headed ? undefined : 'chromium', args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'] }
  : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-driver-bug-workarounds'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', (m) => { const t = m.text(); if (!/GPU stall|GroupMarkerNotSet|Automatic fallback/.test(t)) console.log('[page]', t); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/engine/player.html?ep=${ep}${args.q ? '&' + args.q : ''}`, { timeout: 120000 });
console.log('page loaded');
const glName = await page.evaluate(() => {
  const g = document.createElement('canvas').getContext('webgl2'); if (!g) return 'no WebGL2';
  const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER);
});
console.log('renderer:', glName);
if (gpu && /swiftshader|llvmpipe|software|basic render/i.test(glName)) {
  console.log('GPU requested but the browser fell back to a software renderer');   // tools/renderall.mjs retries --headed
  await browser.close(); srv.close(); process.exit(3);
}
await page.waitForFunction(() => window.ready === true, null, { timeout: 300000 });
console.log('scene ready');
const meta = await page.evaluate(() => window.META);
const fps = Number(args.fps || meta.fps || 30);

// house rules (see CLAUDE.md): videos longer than 60 s, and every caption on screen long enough to read
function ruleProblems(m) {
  const out = [];
  if (!(m.duration > 60)) out.push(`duration ${m.duration} s: must be longer than 60 s`);
  if (!m.captions) { out.push('episode does not export its captions: return { captions: CAPTIONS } from create()'); return out; }
  m.captions.forEach(([t0, t1, html], i) => {
    const text = String(html).replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    const need = Math.max(2.2, text.length / 12), have = t1 - t0 - 0.5;   // fade in 0.28 s + fade out 0.22 s
    if (have + 1e-6 < need) out.push(`caption ${i + 1} at ${t0}s "${text}": fully visible ${have.toFixed(2)} s, needs ${need.toFixed(2)} s`);
    if (i > 0 && t0 < m.captions[i - 1][1]) out.push(`caption ${i + 1} at ${t0}s overlaps the previous one`);
  });
  return out;
}
const problems = ruleProblems(meta);
if (args.check || problems.length) {
  console.log(problems.length ? `RULES: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ') : 'RULES: ok');
  if (args.check) { await browser.close(); srv.close(); process.exit(problems.length ? 1 : 0); }
  if (problems.length && !args.stills && !args.cover && !args.force) {
    console.log('refusing to render a full video that breaks the rules (use --force only to re-render an old episode)');
    await browser.close(); srv.close(); process.exit(1);
  }
}

async function shot(t, file, opts) {
  // generous timeout + retries: under heavy CPU load a motion-blurred frame can take a while to composite
  for (let attempt = 1; ; attempt++) {
    try {
      await page.evaluate(([tt, o]) => window.renderFrame(tt, o), [t, opts || {}]);
      // written under a temporary name, then renamed: a worker killed mid-write never leaves a broken frame for --resume
      const buf = await page.screenshot({ type: 'jpeg', quality: 93, timeout: 180000 });
      fs.writeFileSync(file + '.part', buf); fs.renameSync(file + '.part', file);
      return;
    } catch (e) {
      if (attempt >= 3) throw e;
      console.log(`retry ${attempt} at t=${t}: ${e.message.split('\n')[0]}`);
    }
  }
}

if (args.cover) {
  const t = Number(args.cover); const f = path.join(out, `cover.jpg`); await shot(t, f, { cover: true }); console.log('cover', f);
} else if (args.stills) {
  const list = String(args.stills).split(',').map(Number);
  for (const t of list) { const f = path.join(out, `still_${t.toFixed(2)}.jpg`); const t0 = Date.now(); await shot(t, f); console.log('still', t, f, Date.now() - t0, 'ms'); }
} else {
  const total = Math.round(meta.duration * fps);
  const from = Number(args.from || 0), to = Math.min(total, Number(args.to || total));
  const step = Math.max(1, Number(args.step || 1)), offset = Number(args.offset || 0);
  const t0 = Date.now(); let n = 0;
  for (let i = from + offset; i < to; i += step) {
    const f = path.join(out, `f_${String(i).padStart(5, '0')}.jpg`);
    if (args.resume && fs.existsSync(f)) continue;
    await shot(i / fps, f); n++;
    if (n % 30 === 1) { const per = (Date.now() - t0) / 1000 / n; console.log(`frame ${i}/${to} ${per.toFixed(2)}s/f eta ${(Math.ceil((to - i) / step) * per / 60).toFixed(1)} min`); }
  }
  console.log('done', from, to, ((Date.now() - t0) / 1000).toFixed(1), 's', `${n} frames`);
}
await browser.close(); srv.close();
