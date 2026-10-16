// Balance playtester for Bronze Dawn.
//
// Plays whole games in headless Chromium with a simple scripted ruler, then prints
// the score, rank, collapse tests and a few snapshots of each game. Use it after
// changing numbers in index.html to see how the game shifts for different play styles.
//
//   npm install playwright        (once; any recent version)
//   node tools/playtest.mjs                       10 games, normal difficulty, peaceful builder
//   node tools/playtest.mjs 6 '{"aggressive":true}'
//   node tools/playtest.mjs 6 '{"diff":"hard","sargon":"refuse","verbose":true}'
//
// Options (JSON): diff easy|normal|hard · aggressive · diplomacy (false to skip pacts and gifts)
// · randomChoices · sargon bow|gift|refuse · god enki|enlil|inanna|utu|nanna
// · soldiers / scholars (share of non-farmers) · surplus (food margin) · verbose
//
// The game itself needs none of this: it is a single HTML file with no build step.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const GAME = 'file://' + path.join(here, '..', 'index.html');
const games = +(process.argv[2] || 10);
const opts = JSON.parse(process.argv[3] || '{}');

// Runs inside the page, where the game's functions and state are globals
function ruler(opts) {
  const answer = () => {
    for (let guard = 0; modalOpen && guard < 30; guard++) {
      const m = currentModal;
      let k = m.choices.findIndex(ch => canAfford(ch.cost) && !ch.ghost && !ch.danger);
      if (opts.randomChoices) {
        const ok = m.choices.map((ch, i) => [ch, i]).filter(([ch]) => canAfford(ch.cost));
        k = ok[Math.floor(Math.random() * ok.length)][1];
      }
      if (/asks for peace/i.test(m.title)) k = 0;
      if (m.title === 'Sargon of Akkad') k = { bow: 0, gift: canAfford(m.choices[1].cost) ? 1 : 2, refuse: 2 }[opts.sargon || 'bow'];
      if (m.title === 'Choose a patron god') k = Object.keys(GODS).indexOf(opts.god || 'enki');
      if (k < 0) k = m.choices.findIndex(ch => canAfford(ch.cost));
      if (m.title === 'The Bronze Age Collapse') {
        const pass = f => collapseTests(f).filter(t => t[2]).length;
        const best = ['walls', 'food', 'unity'].sort((a, b) => pass(b) - pass(a))[0];
        k = ['walls', 'food', 'unity'].indexOf(best);
        window.__collapse = collapseTests(best).map(t => [t[0], t[1], t[2]]);
      }
      const again = m.choices.findIndex(ch => ch.label === 'Play again');
      if (again >= 0) k = again + 1;
      choose(k);
    }
  };
  const ORDER = ['pottery', 'husbandry', 'rituals', 'copperWorking', 'irrigation', 'weaving', 'masonry', 'plough', 'writing', 'bronzeWorking', 'wheel', 'lawCode', 'mathematics', 'currency', 'medicine', 'sailing', 'horses', 'engineering', 'literature', 'astronomy', 'monumental', 'bureaucracy', 'chariotry', 'diplomacy', 'metallurgy', 'seafaring', 'alphabet', 'ironWorking'];
  const snaps = [];
  const turn = () => {
    answer();
    let c = calc();
    if (!S.research) {
      const avail = Object.keys(TECHS).filter(id => !has(id) && TECHS[id].req.every(has));
      const next = ORDER.find(id => avail.includes(id)) || avail[0];
      if (next) setResearch(next);
    }
    if (has('rituals') && !S.deity) chooseGod(opts.god || 'enki');
    // farmers first, with a margin if the land allows it; the rest split between soldiers, scholars and laborers
    const P = S.pop;
    const feed = goal => { for (let x = 0; x <= P; x++) { S.jobs = { farmers: x, workers: P - x, soldiers: 0, scholars: 0 }; if (calc().foodNet > goal) return x; } return -1; };
    let f = feed(Math.max(10, P * (opts.surplus ?? 0.15)));
    if (f < 0) f = feed(-S.res.food / 6);
    if (f < 0) f = Math.floor(P * 0.85);
    const rest = P - f, war = S.ais.some(a => a.alive && a.war) || S.threats.length;
    const soldiers = Math.floor(rest * (S.turn > 70 ? 0.35 : war ? 0.3 : (opts.soldiers ?? 0.15)));
    const scholars = Math.floor(rest * (opts.scholars ?? 0.3));
    S.jobs = { farmers: f, workers: rest - soldiers - scholars, soldiers, scholars };
    const tryB = id => { if (!buildCheck(id)) { build(id); return true; } return false; };
    for (let k = 0; k < 8; k++) {
      c = calc();
      if (S.pop >= c.housing - 8 && tryB('house')) continue;
      if (c.stabTarget < 55 && tryB('temple')) continue;
      if (S.res.food > c.storage * 0.8 && tryB('granary')) continue;
      if (has('bronzeWorking') && S.b.forge < 2 && (c.copperIn || S.res.copper > 8) && tryB('forge')) continue;
      if (tryB('workshop') || tryB('scribe') || tryB('market') || WONDERS.some(tryB)) continue;
      if (S.turn > 55 && tryB('walls')) continue;
      if (S.turn > 30 && S.b.barracks < 1 && tryB('barracks')) continue;
      if (S.res.materials > 1500 && tryB('stele')) continue;
      break;
    }
    Object.keys(PROJECTS).forEach(id => { if (!projectCheck(id)) project(id); });
    tilesOwnedBy('player').forEach(i => {
      if (S.tiles[i].imp) return;
      ui.sel = i;
      const k = ['canal', 'tinMine', 'copperMine', 'harbor', 'pasture', 'lumber', 'quarry'].find(k => fitsTile(k, i) && !improveCheck(k, i));
      if (k) improve(k);
    });
    c = calc();
    const land = frontier('player').filter(i => !S.tiles[i].owner && S.tiles[i].t !== 'S')
      .sort((a, b) => TERRAIN[S.tiles[b].t].farm - TERRAIN[S.tiles[a].t].farm + (S.tiles[b].t === 'M' ? 15 : 0) - (S.tiles[a].t === 'M' ? 15 : 0));
    if (land.length && S.pop > 80 && S.res.food > 80 && (c.tiles < c.landLimit + 1 || S.stability > 65)) { ui.sel = land[0]; if (!settleCheck(land[0], c)) settle(); }
    S.ais.forEach(a => {
      if (!a.alive) return;
      if (a.war) return askPeace(a.id);
      if (opts.diplomacy !== false) {
        if (!a.pact && !pactCheck(a)) signPact(a.id);
        if (a.pact && !a.ally && !allyCheck(a)) makeAlliance(a.id);
        if (a.att < 20 && a.att > -10 && S.res.silver >= 40) gift(`${a.id}:silver`);
      }
      if (a.att < -25 && bordersPlayer(a.id) && S.res.silver >= 10) gift(`${a.id}:silver`);
    });
    if (S.stability < 45 && !festivalCheck()) festival();
    if (war && !hasMercs() && S.res.silver >= mercCost() + 20) hireMercs();
    if (opts.aggressive && S.jobs.soldiers) {
      const best = frontier('player').filter(i => S.tiles[i].owner && S.tiles[i].owner !== 'player' && !aiById(S.tiles[i].owner).ally)
        .map(i => [calc().strength / defenders(i), i]).sort((a, b) => b[0] - a[0])[0];
      if (best && best[0] > 1.5) { ui.sel = best[1]; attack(); answer(); }
    }
    c = calc();
    while (S.b.forge && S.tradeUsed < c.caravans && S.res.tin < S.res.copper / 2 && S.res.silver >= price('tin', 'buy', c) + 10) trade('tin', 'buy');
    answer();
    checkGoals();
    c = calc();
    snaps.push({ t: S.turn, pop: S.pop, stab: S.stability, str: c.strength, def: c.defense, tiles: c.tiles, techs: S.techs.length, know: c.know, silver: S.res.silver });
    endTurn();
    answer();
  };
  window.__collapse = null;
  for (let n = 0; !S.over && n < 200; n++) turn();
  const sc = computeScore(window.__collapse ? window.__collapse.filter(t => t[2]).length : 0);
  return { snaps, score: sc.total, rank: sc.rank, pop: S.pop, techs: S.techs.length, lore: S.lore, wars: S.stats.wars, wonders: wondersBuilt(), collapse: window.__collapse };
}

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(GAME);
await page.addScriptTag({ content: `window.__ruler = ${ruler.toString()};` });
const results = [];
for (let g = 0; g < games; g++) {
  const r = await page.evaluate(o => {
    localStorage.clear();
    modalQueue = [];
    nextModal();
    newGame('Playtest', o.diff || 'normal');
    return window.__ruler(o);
  }, opts);
  results.push(r);
  const tests = r.collapse ? r.collapse.map(t => `${t[2] ? 'pass' : 'FAIL'} ${t[0]} (${t[1]})`).join('; ') : 'did not reach 1200 BC';
  console.log(`#${g + 1} ${r.score} "${r.rank}" · pop ${r.pop} · ideas ${r.techs}${r.lore ? ` + ${r.lore} lore` : ''} · great works ${r.wonders} · wars ${r.wars}\n   ${tests}`);
  if (opts.verbose) {
    console.log('   ' + [10, 30, 50, 70, 89].map(t => r.snaps.find(x => x.t === t)).filter(Boolean)
      .map(x => `t${x.t}: pop ${x.pop} stab ${x.stab} army ${x.str}/def ${x.def} lands ${x.tiles} ideas ${x.techs} know ${Math.round(x.know)}`).join('\n   '));
  }
}
const avg = k => Math.round(results.reduce((a, r) => a + r[k], 0) / Math.max(1, results.length));
console.log(`\naverage score ${avg('score')} · population ${avg('pop')} · ideas ${avg('techs')}`);
console.log(errors.length ? `page errors:\n${[...new Set(errors)].join('\n')}` : 'no page errors');
await browser.close();
