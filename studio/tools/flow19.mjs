// camera flow for post 13's takes (worst 90th-percentile px per frame in each half second)
import { camFlow } from './camflow.mjs';
const C = await import('../episodes/ep19cams.js');
const cuts = [0, ...C.SHOTS, C.T.END];
for (let i = 0; i < cuts.length - 1; i++) {
  const rows = camFlow((cam, t) => C.CAMS[i].apply(cam, Math.min(t, cuts[i + 1] - 1e-4)), cuts[i], cuts[i + 1] - 1 / 30, { ground: 0.12 });
  const worst = [];
  for (let k = 0; k < rows.length; k += 15) { const sl = rows.slice(k, k + 15); worst.push(Math.round(Math.max(...sl.map((r) => r.p90)))); }
  console.log(`take ${i} ${cuts[i]}-${cuts[i + 1]}: max ${Math.max(...worst)} px | ${worst.join(' ')}`);
}
