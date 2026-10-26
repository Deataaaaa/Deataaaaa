// Series « 12 % »: the overlay. Word-by-word captions driven by the narration's word times (tools/vo_align.py), the
// phone status bar (time, signal, battery = lives), the series tag, a Paris street-sign info card, the « ET SI… » banner,
// the tape-rewind look, a news card, the end card (with Apple peeking, engine/endtag.js). Every value is a pure function of t.
import { smooth, clamp } from './core.js';

const CSS = `
  #s12 { position: absolute; inset: 0; pointer-events: none; font-family: 'Inter', sans-serif; color: #fff; }
  #s12 .kara { position: absolute; left: 0; right: 0; top: 57%; margin: 0 auto; width: 920px; text-align: center; font-weight: 800; font-size: 74px;
    line-height: 1.06; letter-spacing: -0.005em; text-transform: uppercase; text-wrap: balance;
    text-shadow: 0 0 3px #000, 0 0 2px #000, 0 4px 0 rgba(0,0,0,.7), 0 0 26px rgba(0,0,0,.8); -webkit-text-stroke: 2px rgba(0,0,0,.6); }
  #s12 .kara span { opacity: 1; transition: none; }
  /* unspoken words: opaque grey with a hard dark outline, so they read over a bright floor or a lit wall too */
  #s12 .kara .w0 { color: #b4b4b8; }
  #s12 .kara .w1 { color: #fff; }
  #s12 .kara .r1 { color: #ff2e2e; }
  #s12 .kara .r0 { color: #d98a8a; }
  #s12 .stat { position: absolute; right: 70px; top: 196px; display: flex; align-items: center; gap: 16px; padding: 12px 22px; border-radius: 30px;
    background: rgba(8,9,12,.52); backdrop-filter: blur(6px); font-weight: 650; font-size: 31px; font-variant-numeric: tabular-nums; letter-spacing: .01em;
    box-shadow: 0 2px 14px rgba(0,0,0,.35); }
  #s12 .stat .bars { display: flex; gap: 4px; align-items: flex-end; height: 22px; }
  #s12 .stat .bars i { display: block; width: 6px; background: #fff; border-radius: 2px; }
  #s12 .stat .bat { position: relative; width: 50px; height: 24px; border: 2.5px solid rgba(255,255,255,.9); border-radius: 7px; box-sizing: border-box; }
  #s12 .stat .bat::after { content: ''; position: absolute; right: -7px; top: 6px; width: 4px; height: 8px; border-radius: 0 2px 2px 0; background: rgba(255,255,255,.9); }
  #s12 .stat .bat b { position: absolute; left: 2px; top: 2px; bottom: 2px; border-radius: 3px; background: #fff; }
  #s12 .stat.low .bat b { background: #ff2e2e; } #s12 .stat.low .pct { color: #ff4a4a; }
  #s12 .ser { position: absolute; left: 70px; top: 200px; display: flex; gap: 12px; align-items: center; font-weight: 800; font-size: 26px; letter-spacing: .06em; }
  #s12 .ser .p { background: #ff2e2e; color: #fff; padding: 7px 14px; border-radius: 8px; }
  #s12 .ser .n { color: rgba(255,255,255,.9); text-shadow: 0 1px 10px rgba(0,0,0,.7); }
  #s12 .plate { position: absolute; left: 50%; top: 22%; transform: translateX(-50%); background: #22397a; border: 7px solid #2e6b4a; outline: 4px solid #e8e6df;
    border-radius: 14px; padding: 22px 40px 24px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,.5); min-width: 560px; }
  #s12 .plate .a { font-weight: 800; font-size: 54px; letter-spacing: .02em; }
  #s12 .plate .b { font-weight: 600; font-size: 30px; margin-top: 8px; letter-spacing: .04em; color: #e8ecf6; }
  #s12 .etsi { position: absolute; left: 0; right: 0; top: 30%; text-align: center; font-family: 'Instrument Serif', serif; font-style: italic; font-size: 150px;
    color: #fff; text-shadow: 0 0 40px rgba(255,46,46,.55), 0 4px 30px rgba(0,0,0,.6); letter-spacing: -.01em; }
  #s12 .etsi small { display: block; font-family: 'Inter', sans-serif; font-style: normal; font-weight: 700; font-size: 26px; letter-spacing: .4em; color: #ff2e2e; margin-top: -10px; }
  #s12 .rew { position: absolute; inset: 0; }
  #s12 .rew .ico { position: absolute; left: 70px; top: 300px; font-weight: 800; font-size: 44px; letter-spacing: .06em; color: #fff; text-shadow: 0 0 12px rgba(0,0,0,.8); }
  #s12 .rew .lines { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 2px, rgba(0,0,0,0) 2px 6px); }
  #s12 .rew .band { position: absolute; left: 0; right: 0; height: 90px; background: linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,.16), rgba(255,255,255,0)); }
  #s12 .news { position: absolute; left: 60px; right: 60px; top: 24%; background: rgba(10,10,12,.82); border-left: 10px solid #ff2e2e; padding: 26px 34px; }
  #s12 .news .a { font-weight: 800; font-size: 40px; letter-spacing: .03em; } #s12 .news .b { font-weight: 500; font-size: 30px; color: #d6d6da; margin-top: 8px; }
  #s12 .notif { position: absolute; left: 50px; right: 50px; top: 300px; display: flex; gap: 22px; align-items: center; padding: 26px 30px; border-radius: 34px;
    background: rgba(28,28,32,.88); backdrop-filter: blur(10px); box-shadow: 0 12px 40px rgba(0,0,0,.45); }
  #s12 .notif .ic { width: 78px; height: 78px; border-radius: 18px; background: linear-gradient(#5be36f, #2fbf4a); flex: none; display: flex; align-items: center; justify-content: center; font-size: 44px; }
  #s12 .notif .tx { flex: 1; min-width: 0; } #s12 .notif .h { display: flex; justify-content: space-between; font-weight: 700; font-size: 32px; }
  #s12 .notif .h span { font-weight: 500; color: rgba(255,255,255,.55); font-size: 26px; } #s12 .notif .m { font-weight: 500; font-size: 34px; margin-top: 6px; color: #f2f2f5; }
  #s12 .peep { position: absolute; inset: 0; background: radial-gradient(circle at 50% 46%, rgba(0,0,0,0) 0 330px, rgba(0,0,0,.96) 352px); }
  #s12 .black { position: absolute; inset: 0; background: #000; }
  #s12 .end { position: absolute; inset: 0; background: #0b0c0f; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px; }
  #s12 .end .sign { background: #22397a; border: 8px solid #2e6b4a; outline: 5px solid #e8e6df; border-radius: 16px; padding: 30px 54px; text-align: center; min-width: 620px; }
  #s12 .end .sign .k { display: inline-block; background: #ff2e2e; color: #fff; font-weight: 800; font-size: 30px; padding: 6px 14px; border-radius: 8px; letter-spacing: .06em; }
  #s12 .end .sign .a { font-weight: 800; font-size: 46px; margin-top: 18px; letter-spacing: .03em; }
  #s12 .end .sign .b { font-weight: 800; font-size: 74px; letter-spacing: .01em; line-height: 1.0; margin-top: 4px; }
  #s12 .end .fine { position: absolute; bottom: 330px; left: 0; right: 0; text-align: center; font-weight: 500; font-size: 22px; color: rgba(255,255,255,.5); letter-spacing: .03em; line-height: 1.5; }
`;

// split a line's units into caption chunks: at most ~18 characters or 4 units, breaking after punctuation
export function chunks(lines) {
  const out = [];
  for (const ln of lines) {
    let cur = [], len = 0;
    const flush = () => { if (cur.length) out.push(cur); cur = []; len = 0; };
    ln.units.forEach((u, i) => {
      const mark = /^[»”):;!?…]+$/.test(u.shown);          // a lone mark (a closing quote, French spaced « : » « ? ») stays with its words
      if (mark && !cur.length && out.length) { out[out.length - 1].push(u); return; }
      const L = u.shown.length;
      if (cur.length && !mark && (len + L > 18 || cur.length >= 4)) flush();
      cur.push(u); len += L + 1;
      if (/[.?!…:»]$/.test(u.shown) && i < ln.units.length - 1) flush();
    });
    flush();
  }
  // each chunk shows from its first word's start (-0.08 s) until the next chunk starts (or 0.35 s after its last word)
  return out.map((c, i) => ({ units: c, t0: i === 0 ? 0 : c[0].t0 - 0.08, t1: Math.min(out[i + 1] ? out[i + 1][0].t0 - 0.08 : 1e9, c[c.length - 1].t1 + 0.6) }));
}

export class Overlay12 {
  constructor(vo, { etsiSub = 'ELLE SORTAIT' } = {}) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const root = document.createElement('div'); root.id = 's12';
    root.innerHTML = `<div class="peep"></div><div class="rew"><div class="lines"></div><div class="band"></div><div class="ico">◀◀ RETOUR</div></div>
      <div class="news"><div class="a"></div><div class="b"></div></div><div class="notif"><div class="ic"><svg width="46" height="42" viewBox="0 0 46 42"><path d="M23 2C11 2 2 9.6 2 19c0 5.3 2.9 10 7.4 13.1L7 40l9.2-4.7c2.2.6 4.5.9 6.8.9 12 0 21-7.6 21-17S35 2 23 2z" fill="#fff"/></svg></div><div class="tx"><div class="h"><b></b><span></span></div><div class="m"></div></div></div><div class="plate"><div class="a"></div><div class="b"></div></div>
      <div class="etsi">Et si…<small>${etsiSub}</small></div>
      <div class="ser"><span class="p">12 %</span><span class="n"></span></div>
      <div class="stat"><span class="time"></span><span class="bars"><i style="height:8px"></i><i style="height:12px"></i><i style="height:17px"></i><i style="height:22px"></i></span><span class="pct"></span><span class="bat"><b></b></span></div>
      <div class="kara"></div><div class="black"></div><div class="end"></div>`;
    document.getElementById('ov').appendChild(root);
    const q = (s) => root.querySelector(s);
    this.el = { kara: q('.kara'), stat: q('.stat'), time: q('.time'), pct: q('.pct'), batB: q('.bat b'), bars: [...root.querySelectorAll('.bars i')], ser: q('.ser'), serN: q('.ser .n'),
      plate: q('.plate'), plateA: q('.plate .a'), plateB: q('.plate .b'), etsi: q('.etsi'), rew: q('.rew'), band: q('.rew .band'), news: q('.news'), newsA: q('.news .a'), newsB: q('.news .b'),
      peep: q('.peep'), notif: q('.notif'), notifH: q('.notif .h b'), notifT: q('.notif .h span'), notifM: q('.notif .m'), black: q('.black'), end: q('.end') };
    this.chunks = chunks(vo.lines);
    this.cache = new Map();
  }
  set(k, el, prop, v) { const key = k + prop; if (this.cache.get(key) === v) return; this.cache.set(key, v); if (prop === 'html') el.innerHTML = v; else if (prop === 'class') el.className = v; else el.style[prop] = v; }
  // s: { t, time: '03:12', bat: 12, statA, serA, part, plate: {a, b, k}, etsi: k, rew: k, news: {a, b, k}, peep: k, black: k, end: {html, k}, capA }
  apply(s) {
    const e = this.el, t = s.t;
    // karaoke caption
    const c = this.chunks.find((c) => t >= c.t0 && t < c.t1);
    let html = '';
    if (s.capHtml) html = s.capHtml;
    else if (c && (s.capA ?? 1) > 0) html = c.units.map((u) => { const on = t >= u.t0 - 0.05; return `<span class="${u.red ? (on ? 'r1' : 'r0') : (on ? 'w1' : 'w0')}">${u.shown}</span>`; }).join(' ');
    this.set('k', e.kara, 'html', html);
    this.set('k', e.kara, 'opacity', String(s.capA ?? 1));
    this.set('k', e.kara, 'top', (s.capY ?? 57) + '%');
    // status bar
    this.set('s', e.stat, 'opacity', String(s.statA ?? 0));
    this.set('s', e.time, 'html', s.time || '');
    const b = Math.max(0, s.bat ?? 12);
    this.set('s', e.pct, 'html', `${Math.round(b)} %`);
    this.set('s', e.batB, 'width', `${(Math.max(1.5, b) / 100 * 41).toFixed(1)}px`);
    this.set('s', e.stat, 'class', b <= 5 ? 'stat low' : 'stat');
    // series tag
    this.set('r', e.ser, 'opacity', String(s.serA ?? 0)); this.set('r', e.serN, 'html', s.part || '');
    // info plate
    const p = s.plate; this.set('p', e.plate, 'opacity', String(p ? p.k : 0));
    if (p) { this.set('p', e.plateA, 'html', p.a); this.set('p', e.plateB, 'html', p.b); this.set('p', e.plate, 'transform', `translateX(-50%) translateY(${((1 - p.k) * 18).toFixed(1)}px)`); }
    this.set('e', e.etsi, 'opacity', String(s.etsi || 0));
    this.set('e', e.etsi, 'transform', `scale(${(1.06 - 0.06 * (s.etsi || 0)).toFixed(3)})`);
    // rewind: lines + a tracking band that rolls up the frame once per 0.6 s
    const rw = s.rew || 0; this.set('w', e.rew, 'opacity', String(rw));
    if (rw > 0) this.set('w', e.band, 'top', `${(1920 - ((t * 1.0 / 0.6) % 1) * 2100).toFixed(0)}px`);
    const n = s.news; this.set('n', e.news, 'opacity', String(n ? n.k : 0));
    if (n) { this.set('n', e.newsA, 'html', n.a); this.set('n', e.newsB, 'html', n.b); }
    const nf = s.notif; this.set('nf', e.notif, 'opacity', String(nf ? nf.k : 0));
    if (nf) { this.set('nf', e.notifH, 'html', nf.from); this.set('nf', e.notifT, 'html', nf.when); this.set('nf', e.notifM, 'html', nf.msg); this.set('nf', e.notif, 'transform', `translateY(${((1 - nf.k) * -60).toFixed(1)}px)`); }
    this.set('pp', e.peep, 'opacity', String(s.peep || 0));
    this.set('bk', e.black, 'opacity', String(s.black || 0));
    const en = s.end; this.set('en', e.end, 'opacity', String(en ? en.k : 0));
    if (en) this.set('en', e.end, 'html', en.html);
  }
}
// battery and clock helpers
export const fmtClock = (min) => { const m = ((Math.floor(min) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
export { smooth, clamp };
