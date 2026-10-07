// Frame renderer: serves the studio folder, drives the player page in headless Chromium,
// and writes JPEG frames (or a few preview stills).
// usage: node render.mjs --ep ep01 --stills 1,14,22 --out /path
//        node render.mjs --ep ep01 --out /path/frames [--from 0 --to 1800] [--fps 30]
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a), []));
const root = path.dirname(new URL(import.meta.url).pathname);
const ep = args.ep || 'ep01';
const out = args.out || path.join(root, 'out', ep);
fs.mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css' };
const port = 8200 + Math.floor(Math.random() * 600);
const srv = http.createServer((q, s) => {
  const p = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(s);
}).listen(port);

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-driver-bug-workarounds'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', (m) => { const t = m.text(); if (!/GPU stall|GroupMarkerNotSet|Automatic fallback/.test(t)) console.log('[page]', t); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/engine/player.html?ep=${ep}${args.q ? '&' + args.q : ''}`, { timeout: 120000 });
console.log('page loaded');
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
      await page.screenshot({ path: file, type: 'jpeg', quality: 93, timeout: 180000 });
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
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    const f = path.join(out, `f_${String(i).padStart(5, '0')}.jpg`);
    if (args.resume && fs.existsSync(f)) continue;
    await shot(i / fps, f);
    if ((i - from) % 30 === 0) { const el = (Date.now() - t0) / 1000; const per = el / (i - from + 1); console.log(`frame ${i}/${to} ${per.toFixed(2)}s/f eta ${((to - i) * per / 60).toFixed(1)} min`); }
  }
  console.log('done', from, to, ((Date.now() - t0) / 1000).toFixed(1), 's');
}
await browser.close(); srv.close();
