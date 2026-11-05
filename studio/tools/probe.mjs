import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
// usage: EP=ep09 node tools/probe.mjs '<js expression>'   or   EP=ep09 node tools/probe.mjs <file.js> '[times]'
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2' };
const port = 8900 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s); }).listen(port);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', (m) => console.log('[page]', m.text())); page.on('pageerror', (e) => console.log('[err]', e.message));
await page.setContent(`<html><head><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script></head><body><div id="stage"></div></body></html>`);
await page.goto(`http://localhost:${port}/engine/player.html?ep=${process.env.EP || 'ep09test'}&view=pov`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 300000 });
const code = process.argv[2];
const times = process.argv[3] ? JSON.parse(process.argv[3]) : null;
const out = times ? await page.evaluate(`(${fs.readFileSync(code,'utf8')})(${JSON.stringify(times)})`) : await page.evaluate(code);
console.log(JSON.stringify(out, null, 1));
await browser.close(); srv.close();
