// writes audio/ep16_events.json: when and how far each district's transformer fails (makeCity), for the soundtrack
import { writeFileSync } from 'fs';
import { makeCity, GZ } from '../engine/giza.js';
import { T } from '../episodes/ep16cams.js';
const city = makeCity({ density: 0.05, tFlip: T.FLIP });
const ev = city.events.map((e) => ({ t: +e.t.toFixed(3), d: Math.round(e.p.distanceTo(GZ.HERO)), twice: e.twice }));
writeFileSync(new URL('../audio/ep16_events.json', import.meta.url), JSON.stringify(ev));
console.log(ev.length, 'events', ev[0], ev[ev.length - 1]);
