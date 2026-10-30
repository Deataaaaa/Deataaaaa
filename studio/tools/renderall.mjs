// Renders a whole episode with a pool of workers sharing the machine (the owner's PC: one graphics card).
// The frames are cut into small chunks that the workers take one after the other (render.mjs --queue), so a fast worker
// takes more chunks and workers can join while the render runs. With --gpu the pool grows on its own (owner, 30 Oct 2026:
// « utilise bien 100 % de mon GPU »): every ~25 s it reads the graphics card's 3D load and the frame rate, and starts one
// more worker while the card is below ~90 % busy, there is memory for it, and the last worker added still raised the
// frame rate (past that point the processor is the limit and more workers only queue up). Every frame is a pure function
// of t, so the order does not matter. A worker that lands on a software renderer exits with code 3: the pool switches to
// --headed (a real browser window, which always gets the graphics card). A last pass re-renders anything missing.
// usage: node tools/renderall.mjs --ep ep10 --out DIR [--workers 3] [--max 10] [--gpu] [--from 0 --to 2250] [--q "ssaa=2"]
import { spawn, execFile } from 'child_process'; import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a), []));
const studio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(args.out); fs.mkdirSync(out, { recursive: true });
const W0 = Math.max(1, Number(args.workers || 3));
const WMAX = Math.max(W0, Number(args.max || Math.min(12, Math.max(2, os.cpus().length - 1))));
const adaptive = !!args.gpu && args.adaptive !== 'off';
const base = ['--ep', args.ep, '--out', out];
for (const k of ['q', 'fps']) if (args[k] !== undefined) base.push('--' + k, String(args[k]));
if (args.force) base.push('--force');
const log = (s) => console.log(`[ctl] ${s}`);
const have = (i) => fs.existsSync(path.join(out, `f_${String(i).padStart(5, '0')}.jpg`));
const count = () => fs.readdirSync(out).filter((f) => /^f_\d{5}\.jpg$/.test(f)).length;

// the frame range: from the episode's duration (asked once from a worker's metadata), or --from/--to
const t0 = Date.now();
let total = null;
function chunksOf(a, b, size = 12) { const c = []; for (let i = a; i < b; i += size) { const j = Math.min(b, i + size); let done = true; for (let k = i; k < j; k++) if (!have(k)) { done = false; break; } if (!done) c.push([i, j]); } return c; }
let queue = null;   // built once the first worker reports the episode's frame count

// the graphics card's 3D load (Windows performance counters, the same ones pc/render.ps1 shows); -1 elsewhere
function gpuLoad() {
  if (process.platform !== 'win32') return Promise.resolve(-1);
  const ps = "$s=0.0; foreach ($e in @(Get-CimInstance -ClassName Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -Filter \"Name LIKE '%engtype_3D%'\" -ErrorAction Stop)) { $s += [double]$e.UtilizationPercentage }; [Math]::Min(100.0, $s)";
  return new Promise((res) => execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 15000, windowsHide: true }, (err, so) => res(err ? -1 : Number(String(so).trim()) || 0)));
}

let flags = args.gpu ? ['--gpu'] : [];
const workers = new Map(); let nextId = 0, headedSwitch = false, finished = false;
function spawnWorker() {
  const id = nextId++, name = `w${id}`;
  const p = spawn(process.execPath, ['render.mjs', ...base, '--queue', ...flags], { cwd: studio, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const w = { id, p, chunk: null, ready: false, born: Date.now(), frames: 0 };
  workers.set(id, w);
  const line = (d) => String(d).split(/\r?\n/).filter((l) => l && !/FBXLoader: TGA loader/.test(l)).forEach((l) => console.log(`[${name}] ${l}`));
  p.stdout.on('data', line); p.stderr.on('data', line);
  p.on('message', (m) => {
    if (m.ready) { w.ready = true; if (total === null) setTotal(m.total); return; }   // the episode's frame count comes with the first 'ready'
    if (m.done) { w.chunk = null; w.frames = m.n; return; }
    if (m.want) feed(w);
  });
  p.on('close', (code) => {
    workers.delete(id);
    if (w.chunk && queue) queue.unshift(w.chunk);                              // a crashed worker's chunk goes back
    if (code === 3 && args.gpu && !headedSwitch) {                             // headless Chromium had no graphics card
      headedSwitch = true; flags = ['--gpu', '--headed'];
      log('headless Chromium had no graphics card: the pool switches to browser windows (--headed)');
    }
    if (code !== 0 && code !== 3) log(`${name} exited with code ${code}`);
    if (!finished && (code === 3 || (code !== 0 && queue && queue.length))) spawnWorker();
    if (workers.size === 0) wrapUp();
  });
  return w;
}
function setTotal(n) {
  total = n; const a = Number(args.from || 0), b = Math.min(n, Number(args.to || n));
  queue = chunksOf(a, b); log(`${b - a} frames, ${queue.length} chunks to render`);
  for (const w of workers.values()) if (w.waiting) feed(w);
}
function feed(w) {
  if (!queue) { w.waiting = true; return; }
  w.waiting = false;
  const c = queue.shift();
  if (c) { w.chunk = c; w.p.send({ chunk: c }); } else { w.p.send({ stop: true }); }
}

// the adaptive pool
let lastN = 0, lastT = Date.now(), lastAddFps = null, plateau = false, history = [];
async function tick() {
  if (finished) return;
  const now = Date.now(), n = count(), fps = (n - lastN) / ((now - lastT) / 1000);
  lastN = n; lastT = now;
  const g = await gpuLoad(), free = os.freemem() / 2 ** 30, live = [...workers.values()].filter((w) => w.ready).length;
  log(`workers ${workers.size} (${live} rendering), ${fps.toFixed(2)} fps, GPU ${g < 0 ? 'n/a' : g.toFixed(0) + ' %'}, free RAM ${free.toFixed(1)} GB`);
  history.push({ workers: workers.size, live, fps });
  if (!adaptive || plateau || !queue || queue.length < 4) return;
  const starting = [...workers.values()].some((w) => !w.ready || Date.now() - w.born < 45000);
  if (starting) return;                                                      // let the newest worker settle before judging it
  if (lastAddFps !== null && fps < lastAddFps * 1.05) { plateau = true; log(`the last worker added nothing (${lastAddFps.toFixed(2)} -> ${fps.toFixed(2)} fps): the processor is the limit, the pool stays at ${workers.size}`); return; }
  if (workers.size >= WMAX) return;
  if (g >= 0 && g >= 90) { log('the graphics card is saturated'); return; }
  if (free < 2.5) { log('not enough free memory for one more worker'); return; }
  lastAddFps = fps; log(`one more worker (${workers.size + 1})`); spawnWorker();
}
const timer = setInterval(() => { tick().catch(() => {}); }, 25000);

let wrapped = false;
async function wrapUp() {
  if (wrapped) return; wrapped = true; finished = true; clearInterval(timer);
  // anything left behind (a worker that died on its last chunk): one plain worker with --resume
  const left = total === null ? 1 : chunksOf(Number(args.from || 0), Math.min(total, Number(args.to || total))).length;
  let fillCode = 0;
  if (left) {
    log(`${left} chunk(s) left: a last pass`);
    fillCode = await new Promise((res) => { const p = spawn(process.execPath, ['render.mjs', ...base, '--resume', ...flags, ...(args.from ? ['--from', String(args.from)] : []), ...(args.to ? ['--to', String(args.to)] : [])], { cwd: studio, stdio: ['ignore', 'inherit', 'inherit'] }); p.on('close', res); });
  }
  const n = count(), min = (Date.now() - t0) / 60000, peak = Math.max(0, ...history.map((h) => h.workers));
  const exp = total === null ? null : Math.min(total, Number(args.to || total)) - Number(args.from || 0);
  const ok = fillCode === 0 && (exp === null || n >= exp);
  console.log(`RENDER ${ok ? 'OK' : 'FAILED'}: ${n} frames in ${min.toFixed(1)} min (up to ${peak} workers${flags.length ? ', ' + flags.join(' ') : ''})`);
  process.exit(ok ? 0 : 1);
}

for (let k = 0; k < W0; k++) spawnWorker();
