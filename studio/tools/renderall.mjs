// Renders a whole episode with several workers sharing the machine (the owner's PC: one graphics card).
// Worker k of N takes frames k, k+N, k+2N... Every frame is a pure function of t, so the order does not matter and
// each worker gets the same mix of cheap and heavy shots (no lane finishes an hour before the others). A last pass
// re-renders anything missing. With --gpu, a worker that lands on a software renderer exits with code 3: everything
// is retried once with --headed (a real browser window, which always gets the graphics card).
// usage: node tools/renderall.mjs --ep ep10 --out DIR [--workers 3] [--gpu] [--from 0 --to 2250] [--q "ssaa=2"]
import { spawn } from 'child_process'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a), []));
const studio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(args.out); fs.mkdirSync(out, { recursive: true });
const W = Math.max(1, Number(args.workers || 3));
const pass = ['--ep', args.ep, '--out', out, '--resume'];
for (const k of ['from', 'to', 'q', 'fps']) if (args[k] !== undefined) pass.push('--' + k, String(args[k]));
if (args.force) pass.push('--force');

function worker(name, extra) {
  return new Promise((res) => {
    const p = spawn(process.execPath, ['render.mjs', ...pass, ...extra], { cwd: studio, stdio: ['ignore', 'pipe', 'pipe'] });
    const line = (d) => String(d).split(/\r?\n/).filter((l) => l && !/FBXLoader: TGA loader/.test(l)).forEach((l) => console.log(`[${name}] ${l}`));
    p.stdout.on('data', line); p.stderr.on('data', line);
    p.on('close', (code) => res(code));
  });
}
const t0 = Date.now();
async function round(flags) {
  const codes = await Promise.all([...Array(W).keys()].map((k) => worker(`w${k}`, ['--step', String(W), '--offset', String(k), ...flags])));
  return codes;
}
let flags = args.gpu ? ['--gpu'] : [];
let codes = await round(flags);
if (args.gpu && codes.includes(3)) {
  console.log('headless Chromium had no graphics card: retrying with a browser window (--headed)');
  flags = ['--gpu', '--headed'];
  codes = await round(flags);
}
const last = await worker('fill', flags);   // anything a crashed worker left behind
const n = fs.readdirSync(out).filter((f) => /^f_\d{5}\.jpg$/.test(f)).length;
const min = (Date.now() - t0) / 60000;
console.log(`RENDER ${codes.every((c) => c === 0) && last === 0 ? 'OK' : 'FAILED'}: ${n} frames in ${min.toFixed(1)} min (${W} workers${flags.length ? ', ' + flags.join(' ') : ''}), worker exit codes ${codes.join(',')},${last}`);
process.exit(codes.every((c) => c === 0) && last === 0 ? 0 : 1);
