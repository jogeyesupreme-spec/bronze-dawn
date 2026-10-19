// Balance playtester for Bronze Dawn Valley (valley.html).
//
// Plays whole games in headless Chromium with a simple scripted ruler and prints the
// score, rank and Collapse tests of each. Needs Playwright: npm install playwright
//
//   node tools/playtest-valley.mjs 6
//   node tools/playtest-valley.mjs 4 '{"raid":true,"verbose":true}'
//   node tools/playtest-valley.mjs 4 '{"diff":"hard"}'
//
// Options (JSON): diff easy|normal|hard · raid · randomChoices · warriors (share of free people) · verbose
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const GAME = 'file://' + path.join(here, '..', 'valley.html');
const games = +(process.argv[2] || 6), opts = JSON.parse(process.argv[3] || '{}');

// Runs inside the page, where the game's functions and state are globals
function ruler(opts) {
  const answer = () => {
    for (let g = 0; modalOpen && g < 30; g++) {
      const m = currentModal;
      let k = m.choices.findIndex(ch => canAfford(ch.cost) && !ch.ghost && !ch.danger);
      if (opts.randomChoices) { const ok = m.choices.map((ch, i) => [ch, i]).filter(([ch]) => canAfford(ch.cost)); k = ok[Math.floor(Math.random() * ok.length)][1]; }
      if (k < 0) k = m.choices.findIndex(ch => canAfford(ch.cost));
      if (m.title === 'The Bronze Age Collapse') { const pass = f => collapseTests(f).filter(t => t[2]).length; const best = ['walls', 'food', 'unity'].sort((a, b) => pass(b) - pass(a))[0]; k = ['walls', 'food', 'unity'].indexOf(best); window.__col = collapseTests(best).map(t => [t[0], t[1], t[2]]); }
      const again = m.choices.findIndex(ch => ch.label === 'Play again'); if (again >= 0) k = again + 1;
      choose(Math.max(0, k));
    }
  };
  const ORDER = ['pottery', 'herding', 'rituals', 'mudbrick', 'boats', 'irrigation', 'copper', 'weaving', 'plough', 'writing', 'bronze', 'masonry', 'wheel', 'sailing', 'mathematics', 'law', 'currency', 'medicine', 'horses', 'astronomy', 'literature', 'monumental', 'metallurgy', 'chariots', 'diplomacy', 'alphabet', 'iron'];
  const snaps = [];
  for (let n = 0; !S.over && n < 200; n++) {
    answer();
    if (!S.research) { const avail = Object.keys(TECHS).filter(id => !has(id) && TECHS[id].req.every(has)); const nx = ORDER.find(id => avail.includes(id)) || avail[0]; if (nx) setResearch(nx); }
    let c = calc();
    if (!expeditionCheck(c) && landCount() <= c.landLimit && S.res.food > c.expedition.food * 1.5) { expedition(); answer(); }
    for (let k = 0; k < 10; k++) {
      c = calc();
      const tryB = id => { if (!buildCheck(id)) { build(id); return true; } return false; };
      if (S.pop >= c.housing - 6 && tryB('house')) continue;
      if (c.moodTarget < 55 && tryB('temple')) continue;
      if (S.res.food > c.foodCap * 0.75 && tryB('granary')) continue;
      if ((S.res.wood > c.storeCap * 0.8 || S.res.stone > c.storeCap * 0.8) && tryB('storehouse')) continue;
      if (has('bronze') && c.oreCap && S.b.forge < 2 && tryB('forge')) continue;
      if (tryB('workshop') || tryB('tablets') || tryB('market') || WONDERS.some(tryB)) continue;
      if (S.turn > 50 && tryB('walls')) continue;
      break;
    }
    Object.keys(PROJECTS).forEach(id => { if (!projectCheck(id)) project(id); });
    // jobs
    const P = S.pop; S.jobs = { farmers: 0, woodcutters: 0, masons: 0, smiths: 0, scholars: 0, warriors: 0 };
    let f = 0; for (; f <= P; f++) { S.jobs.farmers = f; S.jobs.woodcutters = P - f; if (calc().foodNet > Math.max(5, P * 0.12)) break; } S.jobs.woodcutters = 0;
    S.jobs.farmers = Math.min(f, P);
    c = calc();
    let rest = P - S.jobs.farmers;
    const war = S.nbs.some(a => a.alive && a.war) || S.threats.length || S.turn > 70;
    const take = (k, n) => { n = Math.max(0, Math.min(rest, Math.floor(n))); S.jobs[k] += n; rest -= n; };
    take('warriors', rest * (war ? 0.3 : (opts.warriors ?? 0.12)));
    take('scholars', rest * 0.3);
    take('smiths', Math.min(c.smithCap, c.oreCap / 0.4));
    take('woodcutters', Math.max(c.slots.wood, rest * 0.5));
    take('masons', rest);
    S.nbs.forEach(a => { if (!a.alive) return; if (a.war) askPeace(a.id); else if (a.att < -25 && S.res.food > 120) gift(`${a.id}:food`); });
    if (S.mood < 45 && !festivalCheck()) festival();
    if (opts.raid && S.jobs.warriors) { const a = S.nbs.find(x => x.alive && calc().strength > (x.army + 5 + S.turn * 0.5) * 1.5); if (a && !raidCheck(a, calc())) { raidNeighbor(a.id); answer(); } }
    c = calc();
    while (S.tradeUsed < c.trades && S.res.food > c.foodCap * 0.9) trade(S.res.stone < S.res.wood ? 'food:stone' : 'food:wood');
    answer(); checkGoals();
    c = calc();
    snaps.push({ t: S.turn, pop: S.pop, mood: S.mood, def: c.defense, lands: landCount(), techs: S.techs.length, know: c.know, food: S.res.food, wood: S.res.wood, stone: S.res.stone, bronze: S.res.bronze, b: Object.values(S.b).reduce((a, b) => a + b, 0), nb: S.nbs.map(a => R(a.army)) });
    endTurn(); answer();
  }
  const sc = computeScore(window.__col ? window.__col.filter(t => t[2]).length : 0);
  return { snaps, score: sc.total, rank: sc.rank, pop: S.pop, techs: S.techs.length, lore: S.lore, col: window.__col, turn: S.turn, log: S.log.slice(0, 6).map(e => e.text), wonders: WONDERS.filter(k => S.b[k]).length, lands: S.lands };
}
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(GAME);
await page.addScriptTag({ content: `window.__ruler = ${ruler.toString()};` });
const res = [];
for (let g = 0; g < games; g++) {
  const r = await page.evaluate(o => { localStorage.clear(); modalQueue = []; nextModal(); newGame('Playtest', o.diff || 'normal'); return window.__ruler(o); }, opts);
  res.push(r);
  console.log(`#${g + 1} ${r.score} "${r.rank}" · pop ${r.pop} · ideas ${r.techs}${r.lore ? ` + ${r.lore} songs` : ''} · great works ${r.wonders}\n   ${r.col ? r.col.map(t => `${t[2] ? 'pass' : 'FAIL'} ${t[0]} (${t[1]})`).join('; ') : 'did not reach 1200 BC'}`);
  if (opts.verbose) console.log('   ' + [5, 15, 30, 45, 60, 75].map(t => r.snaps.find(x => x.t === t)).filter(Boolean).map(x => `t${x.t}: pop ${x.pop} mood ${x.mood} defence ${x.def} lands ${x.lands} ideas ${x.techs} knowledge ${x.know}`).join('\n   '));
}
console.log(`\naverage score ${Math.round(res.reduce((a, r) => a + r.score, 0) / Math.max(1, res.length))}`);
console.log(errors.length ? `page errors:\n${[...new Set(errors)].join('\n')}` : 'no page errors');
await browser.close();
