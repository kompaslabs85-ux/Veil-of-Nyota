// WARDEN WARS — game: scenes, input, simulation, UI (iteration 3a)
(function () {
'use strict';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const TEST = new URLSearchParams(location.search).get('test') === '1';
let SCALE = 1, scene = 'title', g = null, P = null, now = 0, tReal = 0;
const PKEY = 'ww_profile_v3', RKEY = 'ww_run_v3', CPKEY = 'ww_cp_v3', TKEY = 'ww_tel_v1';
let rnd = Math.random; const pick = (a) => a[(rnd() * a.length) | 0], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const HUD_H = 44;
const MAPY = () => HUD_H; // Zara: map butts against the HUD; spare height goes to the framed dock
const DOCK_Y = () => MAPY() + MAP_H;
const OY = () => Math.round((H - 640) / 2);
const DMG_K = 0.8;
const STAR3_LEAKS = 2, STAR3_LIVES = 0.85;
const HERALD_ART = [1, 1, 2, 3]; // Thandi: regalia until 50%, cracked at 50%, plates shed at 25%
const BOSS_SCALE = 1.6; // Zara: boss reads at a glance
const SPAWN_DX = 48; // global tower damage scale (tuned by tools/sim.py)
const STONE_K = 1.6; // Rimehold towers trade damage for control; sim showed 110-185s Herald fights at 1.0

// ---------------- Telemetry (local only, never sent) ----------------
function tel(ev, extra) { try { const a = JSON.parse(localStorage.getItem(TKEY) || '[]'); a.push(Object.assign({ ts: Date.now(), ev, map: g ? g.mk : null, wave: g ? g.wi + (g.inWave ? 1 : 0) : null, lives: g ? g.lives : null, gold: g ? Math.round(g.gold) : null }, extra || {})); while (a.length > 600) a.shift(); localStorage.setItem(TKEY, JSON.stringify(a)); } catch (e) {} }
function telSummary() {
  let a = []; try { a = JSON.parse(localStorage.getItem(TKEY) || '[]'); } catch (e) {}
  const out = {}; a.forEach(x => { if (!x.map) return; const m = out[x.map] = out[x.map] || { starts: 0, wins: 0, defeats: {}, quits: {}, leaksByWave: {} };
    if (x.ev === 'mission_start') m.starts++; if (x.ev === 'victory') m.wins++; if (x.ev === 'defeat') m.defeats[x.wave] = (m.defeats[x.wave] || 0) + 1;
    if (x.ev === 'quit') m.quits[x.wave] = (m.quits[x.wave] || 0) + 1; if (x.ev === 'wave_end') m.leaksByWave[x.wave] = (m.leaksByWave[x.wave] || 0) + (x.leaks || 0); });
  return { events: a.length, maps: out };
}

// ---------------- Profile ----------------
function newHero() { return { lvl: 1, xp: 0, evo: 0, equip: {} }; }
function freshProfile() { return { v: 3, faction: null, heroes: Object.fromEntries(FACTIONS.map(f => [f.hero.key, newHero()])), inv: [], nextId: 1, shards: 0, clears: 0, plays: 0, best: 0, memories: 3, tutDone: false, stars: { glacier: 0, foundry: 0 }, missions: 0 }; }
function loadProfile() {
  try { const s = localStorage.getItem(PKEY); if (s) { const p = JSON.parse(s); if (p && p.v === 3) { const f = freshProfile(); return Object.assign(f, p, { stars: Object.assign(f.stars, p.stars || {}), heroes: Object.assign(f.heroes, p.heroes || {}) }); } } } catch (e) {}
  const p = freshProfile();
  try { const o = JSON.parse(localStorage.getItem('ww_profile_v2') || 'null'); if (o && o.v === 2) { Object.assign(p, { heroes: o.heroes || p.heroes, inv: o.inv || [], nextId: o.nextId || 1, shards: o.shards || 0, clears: o.clears || 0, plays: o.plays || 0, faction: o.faction || null, tutDone: !!o.tutDone, migrated: 'v2' }); } } catch (e) {}
  return p;
}
function save() { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {} }
function heroKey(f) { return FAC(f).hero.key; }
function FB() { return BASE(P.faction); }
function genItem(rar, slotKey, fac) {
  const slot = slotKey ? SLOTS.find(s => s.key === slotKey) : pick(SLOTS); fac = fac || (P && P.faction) || 'stone';
  const r = RARITY[rar]; const nAff = [0, 1, 1, 2, 2, 3][rar];
  const it = { id: (P ? P.nextId++ : 0), slot: slot.key, rar, name: `${r.name} ${pick(slot.names)}`, stat: slot.stat, val: Math.round(slot.base * (1 + rar * 0.6)), aff: [] };
  const pool = AFFIXES.slice();
  for (let i = 0; i < nAff; i++) { const a = pool.splice((rnd() * pool.length) | 0, 1)[0]; const v = Math.round(a.v[0] + (a.v[1] - a.v[0]) * (rar / 5));
    const af = { k: a.key, v }; if (a.key === 'towerBoost') af.t = pick(FACTIONS.find(f => f.key === fac).towers); if (a.key === 'skillBoost') af.t = pick(SKILLS.filter(s => s.f === BASE(fac) && s.key !== 'pride')).key; it.aff.push(af); }
  return it;
}
function statTxt(it) { const neg = it.stat === 'cd', pct = /%/.test(STAT_LABEL[it.stat]); return `${STAT_LABEL[it.stat].replace(/ ?-?%$/, '')} ${neg ? '-' : '+'}${it.val}${pct ? '%' : ''}`; }
function affText(a) { const d = AFFIXES.find(x => x.key === a.k); return d.desc(a.v, a.t); }
function rollRarity(bonus = 0) { const w = [40, 28, 16, 9, 5, 2]; let r = rnd() * 100, i = 0; for (; i < 6; i++) { r -= w[i]; if (r < 0) break; } return clamp(Math.min(i, 5) + bonus, 0, 5); }
function heroMods(hk) {
  const st = P.heroes[hk]; const m = { dmg: 0, range: 0, hp: 0, cd: 0, rate: 0, ability: 0, kin: 0, tower: {}, skill: {}, bias: 0, sky: 0, daring: 0 };
  Object.values(st.equip).forEach(id => { const it = P.inv.find(i => i.id === id); if (!it) return; m[it.stat] += it.val;
    it.aff.forEach(a => { if (a.k === 'fierce') m.dmg += a.v; else if (a.k === 'swift') m.rate += a.v; else if (a.k === 'oath') m.hp += a.v; else if (a.k === 'kin') m.kin += a.v; else if (a.k === 'towerBoost') m.tower[a.t] = (m.tower[a.t] || 0) + a.v; else if (a.k === 'skillBoost') m.skill[a.t] = (m.skill[a.t] || 0) + a.v; else if (a.k === 'offerBias') m.bias = 1; else if (a.k === 'skyward') m.sky += a.v; else if (a.k === 'daring') m.daring += a.v; }); });
  m.cd = Math.min(m.cd, 50); m.lvlDmg = Math.round((st.lvl - 1) * 4 + EVOS[hk][st.evo].bonus * 100); m.dmg += m.lvlDmg; return m;
}

// ---------------- Input ----------------
// Reliability rules (iteration 3a):
//  * hit-testing uses the buttons of the frame the player is looking at (the last drawn frame);
//  * every modal/scene change bumps ui.epoch; a press that began in an older epoch is cancelled (no click-through, no
//    tap landing on a popup that opened under the finger);
//  * after a button fires, the hit list is stale until the next frame draws (<= 1 frame, ~17ms) — no time-based locks,
//    so input is accepted again as soon as the new screen is on glass;
//  * irreversible actions (build on Rimehold, branch, sell, skill pick, stakes, cornice, evolve, restart/quit) use a
//    select-then-confirm step.
const ui = { hits: [], pressed: null, pressEpoch: -1, pressT: 0, rel: {}, start: null, oy: 0, epoch: 0, sig: '', stale: false, log: [], dropped: 0, popT: -1e9, guarded: 0 };
const POP_GUARD_MS = 250, POP_IDS = /^(pick|stk|fight)/, HUD_IDS = /^(pause|speed|resume)$/;
function sigChanged(s) { const pop = (x) => /\|O\||\|S\||\|C\|/.test(x); if (pop(s) && !pop(ui.sig)) ui.popT = performance.now(); ui.sig = s; ui.epoch++; } /* press kept: pUp epoch check decides */
function B(id, x, y, w, h, opts, fn) {
  const b = Object.assign({ id, x, y, w, h, fn }, opts || {});
  if (!b.hidden) drawButton(ctx, b, btnScale(id));
  const pad = Math.max(0, (44 - h) / 2), padx = Math.max(0, (44 - w) / 2);
  b.oy = ui.oy; b.hx = x - padx; b.hy = y - pad + ui.oy; b.hw = w + padx * 2; b.hh = h + pad * 2;
  if (!b.disabled || b.allowDisabled) ui.hits.push(b); return b;
}
function btnScale(id) {
  if (ui.pressed && ui.pressed.id === id) return 1 - 0.05 * Math.min(1, (now - ui.pressT) / 80);
  const r = ui.rel[id]; if (r != null) { const k = (now - r) / 160; if (k >= 1) { delete ui.rel[id]; return 1; } return k < 0.5 ? 0.95 + 0.16 * k : 1.03 - 0.06 * (k - 0.5); }
  return 1;
}
function toL(ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H }; }
const inB = (b, p, slop = 0) => p.x >= b.hx - slop && p.x <= b.hx + b.hw + slop && p.y >= b.hy - slop && p.y <= b.hy + b.hh + slop;
function hitAt(p) { // 1) topmost button whose drawn rect holds the point; 2) else nearest centre among padded (44px) hit areas
  for (let i = ui.hits.length - 1; i >= 0; i--) { const b = ui.hits[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y + b.oy && p.y <= b.y + b.oy + b.h) return b; }
  let best = null, bd = 1e9; for (let i = ui.hits.length - 1; i >= 0; i--) { const b = ui.hits[i]; if (!inB(b, p)) continue; const d = Math.hypot(p.x - (b.hx + b.hw / 2), p.y - (b.hy + b.hh / 2)); if (d < bd) { bd = d; best = b; } }
  return best;
}
function pDown(p) {
  const b = hitAt(p);
  if (scene === 'game' && g && (g.offer || g.stakeOffer || g.cinema)) { // Sipho: popup opening under the finger can't preselect — only its own rects are guarded
    const pending = modalSig() !== ui.sig, fresh = pending || performance.now() - ui.popT < POP_GUARD_MS;
    const popB = b && POP_IDS.test(b.id), hud = b && HUD_IDS.test(b.id);
    if (fresh && (popB || (pending && !hud))) { ui.guarded++; ui.pressed = null; return null; }
  }
  ui.start = p;
  if (b) { ui.pressed = b; ui.pressEpoch = ui.epoch; ui.pressT = now; } return b;
}
function pUp(p) {
  const b = ui.pressed; ui.pressed = null; if (!b) return null; ui.rel[b.id] = now;
  if (ui.pressEpoch !== ui.epoch) { // modal changed mid-press: only keep the press if the same button still exists under the finger
    const nb = ui.hits.find(h => h.id === b.id && inB(h, p, 10)); if (!nb) { ui.dropped++; return null; } return fireB(nb, p); }
  const fresh = ui.hits.find(h => h.id === b.id); return fireB(fresh || b, p);
}
function fireB(b, p) {
  if (inB(b, p, 10) && (!b.disabled || b.allowDisabled)) { try { opt.haptics && navigator.vibrate && navigator.vibrate(b.hidden ? 6 : 12); } catch (e) {} if (!b.silent) Sfx.play('ui');
    ui.log.push({ id: b.id, t: Math.round(performance.now()) }); if (ui.log.length > 300) ui.log.shift(); ui.stale = true; b.fn && b.fn(); return b; }
  return null;
}
cv.addEventListener('pointerdown', (ev) => { ev.preventDefault(); Sfx.ensure(); pDown(toL(ev)); });
cv.addEventListener('pointermove', (ev) => { if (!ui.pressed) return; const p = toL(ev); if (!inB(ui.pressed, p, 10) || (ui.pressed.hidden && Math.hypot(p.x - ui.start.x, p.y - ui.start.y) > 14)) { ui.rel[ui.pressed.id] = now; ui.pressed = null; } });
cv.addEventListener('pointerup', (ev) => { pUp(toL(ev)); });
cv.addEventListener('pointercancel', () => { if (ui.pressed) ui.rel[ui.pressed.id] = now; ui.pressed = null; });
// Owner test cheat (undocumented): 7 taps on the gold counter within 3s, or type 'nyota' on desktop. Marks the run so it
// never counts toward telemetry / 3-star metrics; sims never trigger it.
let cheatTaps = [], cheatKeys = '';
function cheatTap() { const t = performance.now(); cheatTaps = cheatTaps.filter(x => t - x < 3000); cheatTaps.push(t); if (cheatTaps.length >= 7) { cheatTaps = []; grantCheat(); } }
function grantCheat() { const A = 10000; if (g && !g.over) { g.gold += A; g.cheated = true; } P.shards = (P.shards || 0) + A; P.memories = (P.memories || 0) + A; P.cheatUsed = (P.cheatUsed || 0) + 1; save(); toast('+10,000', 1.4); }
window.addEventListener('keydown', (e) => { if (e.key && e.key.length === 1) { cheatKeys = (cheatKeys + e.key.toLowerCase()).slice(-5); if (cheatKeys === 'nyota') { cheatKeys = ''; grantCheat(); } } });
window.addEventListener('keydown', (e) => { if (scene === 'game' && g) { if (e.key === ' ') cycleSpeed(); if (e.key === 'Escape') { if (g.ring) closeRing(); else pauseGame(); } } });
document.addEventListener('visibilitychange', () => { if (document.hidden && scene === 'game' && g && !g.over && !g.paused) pauseGame(); });
function modalSig() { if (scene !== 'game' || !g) return scene; return [scene, g.paused ? 'P' : '', g.resumeT > 0 ? 'R' : '', g.offer ? 'O' : '', g.stakeOffer ? 'S' : '', g.cinema ? 'C' : '', g.over ? 'X' : '', g.ring ? 'r' + (g.ring.spot != null ? g.ring.spot : 't') : '', g.confirmQuit || ''].join('|'); }

// ---------------- Routes ----------------
let ROUTES = [], FLY = null;
function buildRoutes(map) {
  ROUTES = map.routes.map(rt => { const pts = rt.map(([c, r]) => ({ x: C(c), y: C(r) })); const segs = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = dist(a, b); const ice = (map.ice || []).some(([u, v]) => { const pu = { x: C(u[0]), y: C(u[1]) }, pv = { x: C(v[0]), y: C(v[1]) }; return dist(pu, a) < 1 && dist(pv, b) < 1; });
      segs.push({ a, b, s: L, l, dx: (b.x - a.x) / l, dy: (b.y - a.y) / l, ice }); L += l; }
    return { pts, segs, len: L }; });
  const a = ROUTES[0].pts[0], b = ROUTES[0].pts[ROUTES[0].pts.length - 1]; FLY = { a, b, len: dist(a, b) };
}
function segAt(rt, d) { for (const s of rt.segs) if (d <= s.s + s.l) return s; return rt.segs[rt.segs.length - 1]; }
function posAt(rt, d) { d = clamp(d, 0, rt.len); const s = segAt(rt, d); const t = (d - s.s); return { x: s.a.x + s.dx * t, y: s.a.y + s.dy * t, dx: s.dx, ice: s.ice }; }
function remaining(e) { return e.fly && !(e.grounded > 0) ? (1 - e.prog) * (e.lane || FLY).len : ROUTES[e.r].len - e.dist; }
// Targeting modes (Gert): First = most path progress (default), Last = least, Strongest/Weakest = current HP; ties by path progress.
const TGT = ['first', 'last', 'strong', 'weak']; const TGT_LBL = { first: '1ST', last: 'LAST', strong: 'HP\u25B2', weak: 'HP\u25BC' }; const TGT_NAME = { first: 'First', last: 'Last', strong: 'Strongest', weak: 'Weakest' };
const TGT_CMP = { first: (a, b) => remaining(a) - remaining(b), last: (a, b) => remaining(b) - remaining(a), strong: (a, b) => (b.hp - a.hp) || (remaining(a) - remaining(b)), weak: (a, b) => (a.hp - b.hp) || (remaining(a) - remaining(b)) };
function cycleTgt(o) { o.tgt = TGT[(TGT.indexOf(o.tgt || 'first') + 1) % TGT.length]; tel('target', { mode: o.tgt }); }

// ---------------- Mission ----------------
function newMission(mk, resume) {
  const map = MAPS[mk], fac = FACTIONS.find(f => f.key === P.faction), hk = heroKey(P.faction);
  buildRoutes(map); buildMap(map);
  const hm = heroMods(hk); const [hc, hr] = map.hero;
  g = { mk, map, fac, hk, hm, gold: START_GOLD, lives: START_LIVES + hm.hp + (FB() === 'stone' ? 5 : 0), maxLives: 0, wi: 0, inWave: false, timer: 0, timerMax: 0,
    spawnQ: [], spawnT: 0, enemies: [], towers: [], fx: [], shots: [], floats: [], pools: [], sk: {}, picks: [], pickQ: 0, offer: null, stakeOffer: null, stake: null, stamp: null, stakeLog: [], hitStop: 0,
    speed: 1, paused: false, resumeT: 0, over: false, t: 0, waveT: 0, leaked: 0, waveLeaks: 0, leakLog: [], kills: 0, earned: 0, spent: 0, rflip: 0, ring: null, dock: [], dockCur: null, used: {}, tipsShown: {},
    ava: map.avalanche ? { state: 'idle', t: 0, used: false } : null, ventT: 0, boss: null, bossT0: 0, bossDur: 0, miniKills: 0, bossKilled: false, shake: 0, cinema: null, bankLog: [], earlyGold: 0, waveStartT: 0, built: 0 };
  g.maxLives = g.lives; COST_FAC = fac.key;
  g.hero = { x: C(hc), y: C(hr) + MAPY() * 0, atk: 0, cd: 0, cdMax: fac.hero.cd * (1 - hm.cd / 100) * (fac.key === 'star' ? 1.6 : 1), lvl: 1, xp: 0, face: 1, swing: 0, tgt: 'first' };
  if (resume) { Object.assign(g, { gold: resume.gold, lives: resume.lives, maxLives: resume.maxLives, wi: resume.wi, sk: resume.sk || {}, picks: resume.picks || [], used: resume.used || {}, earned: resume.earned || 0, kills: resume.kills || 0, leaked: resume.leaked || 0, leakLog: resume.leakLog || [], miniKills: resume.miniKills || 0 });
    g.hero.lvl = resume.hlvl || 1; g.hero.tgt = resume.htgt || 'first'; g.hero.xp = resume.hxp || 0; if (g.sk.avalanche) g.hero.cdMax *= 0.75;
    resume.towers.forEach(t => g.towers.push(Object.assign(mkTower(t.key, t.spot, t.lvl, t.branch, t.spent), { tgt: t.tgt || 'first' }))); if (g.ava && resume.avaUsed) g.ava.used = true; }
  else { tel('mission_start', { fac: P.faction }); }
  armTimer(); scene = 'game';
  dockTip('start'); if (map.ice) dockTip('ice'); if (map.fork) dockTip('fork');
}
function snapshotData() { return { v: 3, mk: g.mk, fac: P.faction, gold: Math.round(g.gold), lives: g.lives, maxLives: g.maxLives, wi: g.wi, sk: g.sk, picks: g.picks, used: g.used, earned: g.earned, kills: g.kills, leaked: g.leaked, leakLog: g.leakLog, miniKills: g.miniKills, hlvl: g.hero.lvl, htgt: g.hero.tgt || 'first', hxp: g.hero.xp, avaUsed: g.ava ? g.ava.used : false, towers: g.towers.map(t => ({ key: t.key, spot: t.spot, lvl: t.lvl, branch: t.branch, spent: t.spent, tgt: t.tgt || 'first' })) }; }
function snapshot() { if (!g || g.over) return; try { localStorage.setItem(RKEY, JSON.stringify(snapshotData())); } catch (e) {} }
function checkpoint() { try { localStorage.setItem(CPKEY, JSON.stringify(snapshotData())); } catch (e) {} }
function readKey(k) { try { const r = JSON.parse(localStorage.getItem(k) || 'null'); return r && r.v === 3 && r.fac === P.faction && MAPS[r.mk] ? r : null; } catch (e) { return null; } }
const getRun = () => readKey(RKEY), getCp = () => readKey(CPKEY);
function clearRun() { try { localStorage.removeItem(RKEY); } catch (e) {} }
function mkTower(key, spot, lvl = 1, branch = null, spent = buildCost(key)) { const [c, r] = g.map.pads[spot]; return { tgt: 'first', key, spot, x: C(c), y: C(r), lvl, branch, spent, cd: 0.3, ang: 0, flash: 0, heat: 0, hot: 0, kills: 0, stun: 0, nearVent: g.map.vents ? g.map.vents.some(([vc, vr]) => Math.hypot(C(vc) - C(c), C(vr) - C(r)) <= g.map.vent.near) : false }; }
function effStats(t) {
  const s = towerStats(t.key, t.lvl, t.branch); const m = s.mod || {}; let dm = 1 + g.hm.kin / 100 + (g.hm.tower[t.key] || 0) / 100;
  if (g.sk.white) dm += 0.08; if (g.sk.echo && t.key === 'monolith') dm += 0.15; if (g.sk.vein && t.key === 'spire') { dm += 0.2; s.range += 10; }
  if (g.sk.starfire && t.key === 'kiln') dm += 0.3; if (g.sk.chain && s.splash) s.splash = Math.round(s.splash * 1.2); if (m.dmgX) dm += m.dmgX;
  g.towers.forEach(o => { if (o !== t && o.key === 'bell' && o.branch === 'A' && o.lvl >= 4 && dist(o, t) < 90) dm += 0.1; });
  s.dmg = Math.round(s.dmg * dm * DMG_K * (BASE(g.fac.key) === "stone" ? STONE_K : 1) * (g.fac.key === "stone" ? 1.2 : 1)); return s;
}
function heroStats() { const h = g.fac.hero, m = g.hm, lv = g.hero.lvl - 1; return { dmg: Math.round(h.dmg * DMG_K * (1 + m.dmg / 100 + lv * 0.08) * (g.sk.crystal ? 1.25 : 1)), rate: h.rate / (1 + m.rate / 100 + lv * 0.03), range: h.range + m.range + lv * 2, dtype: h.dtype, splash: h.splash }; }
function canBuild(spot) { return !g.towers.some(t => t.spot === spot); }
function spend(n) { g.gold -= n; g.spent += n; }
function build(key, spot) {
  if (spot == null || !canBuild(spot)) return false; const c = buildCost(key); if (g.gold < c) { toast('Not enough gold'); return false; }
  spend(c); const t = mkTower(key, spot); g.towers.push(t); g.built++; Sfx.play('build'); fx('ring', t.x, t.y, GOLD, { r: 26 }); dust(t.x, t.y, 8, '#e8dcc0');
  closeRing(); if (g.built === 1) dockTip('timer'); return true;
}
function upgrade(t, branch) {
  if (t.lvl >= MAX_LVL) return false; if (t.lvl + 1 === BRANCH_LVL && !branch) return false; const c = upCost(t.key, t.lvl); if (g.gold < c) { toast('Not enough gold'); return false; }
  spend(c); t.spent += c; t.lvl++; if (branch) t.branch = branch; t.flash = 1; Sfx.play('build');
  if ([4, 7, 10].includes(t.lvl)) { fx('burst', t.x, t.y - 24, t.lvl === 10 ? GOLD : '#fff', { n: 14 }); g.shake = Math.max(g.shake, 2); toast(`${towerName(t.key, t.lvl, t.branch)} \u2014 L${t.lvl}${t.lvl === 10 ? ' CROWNED' : ''}`); }
  return true;
}
function sell(t) { if (g.fac.key === 'jade') { toast('Written edict: ' + g.fac.name + ' towers cannot be sold'); return; } const v = Math.round(t.spent * 0.6); g.gold += v; g.towers.splice(g.towers.indexOf(t), 1); closeRing(); Sfx.play('ui'); g.floats.push({ s: '+' + v, x: t.x, y: t.y - 20, t: 0, col: GOLD }); }
let opt = Object.assign({ haptics: true, reduced: false, big: false }, (() => { try { return JSON.parse(localStorage.getItem('ww_opt') || '{}'); } catch (e) { return {}; } })());
try { if (!localStorage.getItem('ww_opt') && matchMedia('(prefers-reduced-motion: reduce)').matches) opt.reduced = true; } catch (e) {}
window.TXT_K = opt.big ? 1.15 : 1;
function setOpt(k, v) { opt[k] = v; window.TXT_K = opt.big ? 1.15 : 1; try { localStorage.setItem('ww_opt', JSON.stringify(opt)); } catch (e) {} }
function outlined(c, s, x, y, sz, col) { c.font = font(sz, 'Nunito', 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = '#1a0a08'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y); }
function toast(s, d = 1.8) { if (g) g.toast = { s, t: d }; }
const FX_CAP = 70, FLOAT_CAP = 20, SHOT_CAP = 60;
function fx(k, x, y, col, extra) { if (g.fx.length >= FX_CAP) g.fx.shift(); g.fx.push(Object.assign({ k, x, y, col, t: 0, d: k === 'burst' ? 0.55 : k === 'boom' ? 0.4 : 0.45 }, extra || {})); }
function dust(x, y, n, col) { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, v = 20 + rnd() * 40; fx('p', x, y, col, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, d: 0.5 + rnd() * 0.3 }); } }

// ---------------- Dock: one strip for tips and chat ----------------
function dockPush(m) { if (m && m.txt && g) m.txt = String(m.txt).replace(/\{H\}/g, g.fac.hero.name); g.dock.push(m); if (g.dock.length > 6) g.dock.splice(0, g.dock.length - 6); }
function dockTip(k) { if (g.tipsShown[k] || P.tipsOff) return; g.tipsShown[k] = 1; dockPush({ kind: 'tip', who: 'Mosa', txt: STR.tips[k], d: 4.5 }); }
function bark(ev) {
  const pool = STR.barks.concat(STR.barks2).filter(x => x.ev === ev && !g.used[x.id]); if (!pool.length) return false; const b = pool[Math.floor(Math.random() * pool.length)]; g.used[b.id] = 1;
  const spr = ev.startsWith('spawn:') || ev.startsWith('kill:') || ev.startsWith('leak:') ? ENEMIES[ev.split(':')[1]].sprite : ev.startsWith('stake') ? 'e_herald1' : ev === 'mini' ? 'e_shard' : ev === 'lowlives' ? 'e_ling' : ev === 'vent' ? 'e_husk' : ev === 'wavestart' ? 'e_husk' : null; const bs = ev.startsWith('break:') ? ENEMIES[ev.split(':')[1]].sprite : null;
  dockPush({ kind: 'bark', who: b.who, txt: b.txt, spr: bs || spr, d: 3 });
  if (b.reply && Math.random() < 0.34) dockPush({ kind: 'reply', who: g.fac.hero.name, txt: b.reply[FB()], spr: `h_${g.hk}${Math.min(3, P.heroes[g.hk].evo + 1)}`, d: 2.6 });
  return true;
}
function updateDock(dt) { if (!g.dockCur && g.dock.length) g.dockCur = Object.assign({ t: 0 }, g.dock.shift()); if (g.dockCur) { g.dockCur.t += dt; if (g.dockCur.t > g.dockCur.d && (g.dock.length || g.dockCur.t > g.dockCur.d + 4)) g.dockCur = null; } }

// ---------------- Waves: timer, call early, spawning ----------------
function armTimer() { g.timerMax = g.timer = waveTimer(g.map, g.wi); }
function callWave(early = true) {
  if (g.inWave || g.over || g.wi >= g.map.waves.length) return;
  if (g.map.stakes.includes(g.wi) && !g.stakeDone) { g.stakeOffer = { sel: null }; bark('stake'); dockTip('stake'); return; }
  if (early && g.timerMax && g.timer > 0) { const b = earlyBonus(g.map, g.wi, g.timer, g.timerMax); if (b > 0) { g.gold += b; g.earned += b; g.earlyGold += b; g.floats.push({ s: `Early +${b}`, x: W - 70, y: DOCK_Y() - 20 - MAPY(), t: 0, col: GOLD }); } }
  startWave();
}
function startWave() {
  const map = g.map, wi = g.wi, w = wi + 1, d = map.waves[wi]; g.inWave = true; g.stakeDone = false; g.timer = 0; g.timerMax = 0; g.spawnT = 0; g.waveT = 0; g.waveLeaks = 0; g.waveStartT = g.t; if (wi === 0) heroLine('deploy'); else if (d.t !== 'boss' && Math.random() < 0.6) bark('wavestart');
  g.bankLog.push(Math.round(g.gold));
  let budget = waveBudget(map, w); const q = []; const uh = (k) => Math.round(ENEMIES[k].hp * (1 + UNIT_HP_GROWTH * (WEFF(w) - 1)));
  if (d.mini) { const hp = uh(d.mini) * MINI_HP_X; q.push({ k: d.mini, mini: true, hp }); budget -= hp * 0.5; }
  const pre = []; // Kai: sirens paired 1:2 with Vowknights in spikes; 6-ling runner burst in spikes (same budget)
  if (d.t === 'spike' && d.mix.siren) { const ns = Math.max(1, Math.round(budget * d.mix.siren / uh('siren'))); for (let i = 0; i < ns; i++) { pre.push({ k: 'siren', hp: uh('siren'), pk: i }); pre.push({ k: 'shard', hp: uh('shard'), pk: i }, { k: 'shard', hp: uh('shard'), pk: i }); } budget -= ns * (uh('siren') + 2 * uh('shard')); }
  const runners = d.t === 'spike' ? Array.from({ length: 6 }, () => ({ k: 'ling', hp: Math.round(uh('ling') * 0.6), spdK: 1.5, runner: true })) : []; budget -= runners.reduce((a, r) => a + r.hp, 0); budget = Math.max(0, budget);
  const types = Object.entries(d.mix).filter(([k]) => !(pre.length && k === 'siren')); const lists = types.map(([k, sh]) => { const n = Math.max(1, Math.round(budget * sh / uh(k))); return Array.from({ length: n }, () => ({ k, hp: uh(k) })); });
  const total = lists.reduce((a, l) => a + l.length, 0); const D = clamp(5 + total * 0.75, 6, 28);
  lists.forEach((l, li) => l.forEach((e, i) => { e.at = (i + 0.5 + li * 0.37) / l.length * D; q.push(e); }));
  const npk = pre.length / 3; pre.forEach((e, i) => { e.at = (e.pk + 0.6) / npk * D * 0.85 + (e.k === 'siren' ? 0.6 : (i % 3) * 0.35); q.push(e); });
  runners.forEach((e, i) => { e.at = D + 2 + i * 0.3; q.push(e); });
  g.flyLane = d.flyCut ? (() => { const a = { x: FLY.a.x + (FLY.b.x - FLY.a.x) * d.flyCut, y: FLY.a.y + (FLY.b.y - FLY.a.y) * d.flyCut }; return { a, b: FLY.b, len: dist(a, FLY.b) }; })() : null; // Kai: shortcut lane past the first pad clusters
  if (d.mini) q[0].at = D * 0.6;
  if (d.boss) q.push({ k: d.boss, boss: true, hp: Math.round(ENEMIES[d.boss].hp * map.M * ((map.bossKFac && map.bossKFac[FB()]) || map.bossK || 1) * (d.bossX || 1)), at: 2 });
  q.sort((a, b) => a.at - b.at); g.spawnQ = q;
  if (g.ava && w % map.avalanche.every === 0 && !g.ava.used) { g.ava.state = 'armed'; g.ava.t = map.avalanche.at; }
  g.ventT = 0; Sfx.play('wave'); tel('wave_start'); g.banner = { s: `WAVE ${w}${d.t === 'spike' ? ' \u2014 SPIKE' : d.t === 'boss' ? (d.boss === 'herald' ? ' \u2014 HERALD OF KASIRI' : ' \u2014 ' + ENEMIES[d.boss].name.toUpperCase()) : d.t === 'breather' ? ' \u2014 breather' : ''}`, t: 1.6 };
}
function spawn(s) {
  const d = ENEMIES[s.k]; const r = d.fly ? 0 : (ROUTES.length > 1 ? (g.rflip++ % 2) : 0); const p0 = ROUTES[r].pts[0];
  const e = { k: s.k, d, hp: s.hp, max: s.hp, r, dist: 0, fly: !!d.fly, prog: 0, x: p0.x, y: p0.y, slow: 0, slowT: 0, stun: 0, shred: 0, armDown: 0, grounded: 0, burn: 0, burnT: 0, healT: 2, stage: 0, flip: false, wob: rnd() * 6, hold: 0, wet: 0, hitT: 0, mini: !!s.mini, boss: !!s.boss, spdK: s.spdK || 1, runner: !!s.runner, lane: d.fly && g.flyLane ? g.flyLane : null };
  g.enemies.push(e);
  if (s.mini) { bark('mini'); g.banner = { s: `CHAMPION: ${d.name}`, t: 1.8 }; }
  else if (s.boss) { g.boss = e; g.bossT0 = g.t; if (s.k === 'herald') g.cinema = { k: 'herald', t: 0 }; else g.banner = { s: `TIER 1 BOSS: ${d.name}`, t: 2.2 }; Sfx.play('boss'); g.shake = 6; }
  else bark('spawn:' + s.k);
  return e;
}

// ---------------- Combat ----------------
function armourOf(e) { let a = e.d.armour - e.shred - e.armDown; if (e.stage >= 2 || (e.boss && e.phase >= 2)) a -= 0.1; return clamp(a, 0, 0.9); }
function damage(e, amt, dtype, src, opts = {}) {
  if (e.hp <= 0) return; const cls = e.fly && !e.grounded ? 'air' : e.d.aclass; let mul = (DMG_MATRIX[dtype] || {})[cls] || 1;
  const m = (src && src.mod) || {}; if (m.vsPlate && e.d.aclass === 'plate') mul += m.vsPlate; if (m.vsBoss && e.boss) mul += m.vsBoss; if (m.vsGrounded && e.grounded) mul += m.vsGrounded; if (e.veil > 0) mul *= 0.5;
  if (e.fly && !e.grounded) mul *= 1 + (g.hm.sky / 100) + (g.sk.eyes ? 0.25 : 0);
  if (e.wet > 0) { if (dtype === 'fire') mul *= 0.75; if (dtype === 'arcane') mul *= 1.25; } // Wet: fire hisses, galvanic arcs
  const arm = opts.pierce != null ? armourOf(e) * (1 - opts.pierce) : opts.trueDmg ? 0 : armourOf(e);
  const dmg = amt * mul * (1 - arm); e.hp -= dmg; if (!opts.dot) e.hitT = 0.12;
  const st = e.hp / e.max, ns = st < 0.25 ? 3 : st < 0.5 ? 2 : st < 0.75 ? 1 : 0; if (ns > e.stage) { if (!e.boss && g.t - (g.breakT || -99) > 12 && bark(`break:${e.k}:${ns}`)) g.breakT = g.t; e.stage = ns; }
  if (e.hp <= 0) kill(e, src);
}
function kill(e, src) {
  const gold = Math.max(1, Math.round(e.max * GOLD_PER_HP * (g.sk.tongue ? 1.15 : 1))); g.gold += gold; g.earned += gold; g.kills++; if (src && src.kills != null) src.kills++;
  if (g.floats.length < FLOAT_CAP) g.floats.push({ s: '+' + gold, x: e.x, y: e.y - 20, t: 0, col: GOLD });
  fx('burst', e.x, e.y - 12, e.boss ? GOLD : e.mini ? '#ffd877' : '#ff8aa0', { n: e.boss ? 24 : e.mini ? 14 : 7 }); Sfx.play('die');
  if (e.mini) { g.hitStop = Math.max(g.hitStop, 0.06); g.miniKills++; g.shake = Math.max(g.shake, 4); g.floats.push({ s: '+1 SHARD', x: e.x, y: e.y - 40, t: 0, col: '#8fd8ff' }); }
  if (e.boss) { g.hitStop = 0.14; g.exitFx = { x: e.x, y: e.y, t0: tReal }; g.bossKills = (g.bossKills || 0) + 1; if (e.k === 'herald') g.bossKilled = true; g.bossDur = g.t - g.bossT0; g.shake = 9; g.floats.push({ s: '+2 SHARDS', x: e.x, y: e.y - 60, t: 0, col: '#8fd8ff' }); if (e.k === 'herald') dockPush({ kind: 'bark', who: 'Herald of Kasiri', txt: STR.herald.fall, spr: 'e_herald3', d: 3 }); Sfx.play('boom'); }
  if (!e.boss && !e.mini && rnd() < 0.25) bark('kill:' + e.k);
  gainXp(e.boss ? 40 : e.d.lives * 2 + 1);
}
function gainXp(n) { const h = g.hero; if (h.lvl >= HERO_LVL_XP.length + 1) return; h.xp += n; const need = HERO_LVL_XP[h.lvl - 1]; if (h.xp >= need) { h.xp -= need; h.lvl++; g.pickQ++; fx('burst', h.x, h.y - 30, GOOD, { n: 10 }); Sfx.play('wave'); } }
function rollSkills() {
  const hm = g.hm; const pool = SKILLS.filter(s => (s.f === FB() || s.f === 'any') && !g.sk[s.key]); const out = [];
  while (out.length < 3 && pool.length) { let tot = 0; const ws = pool.map(s => { const w = RAR_W[s.w] * (hm.bias && s.w !== 'c' ? 2 : 1); tot += w; return w; }); let r = rnd() * tot, i = 0; for (; i < pool.length - 1; i++) { r -= ws[i]; if (r < 0) break; } out.push(pool.splice(i, 1)[0]); }
  return out;
}
function pickSkill(s) {
  const boost = 1 + (g.hm.skill[s.key] || 0) / 100; g.sk[s.key] = boost; g.picks.push(s.key); g.offer = null; g.pickQ--;
  if (s.key === 'pride') { g.lives += Math.round(3 * boost); g.maxLives += Math.round(3 * boost); }
  if (s.key === 'mend') g.lives = Math.min(g.maxLives, g.lives + Math.round(4 * boost));
  if (s.key === 'avalanche') g.hero.cdMax *= 0.75; toast(s.name + '!');
}
function heroLine(kind) { if (!g || g.used['hero:' + kind]) return; g.used['hero:' + kind] = 1; dockPush({ kind: 'reply', who: g.fac.hero.name, txt: STR.hero[kind][FB()], spr: `h_${g.hk}${Math.min(3, P.heroes[g.hk].evo + 1)}`, d: 2.6 }); }
function useAbility() {
  const h = g.hero; if (h.cd > 0 || !g.inWave) return false; if (g.enemies.some(e => e.d.silence && dist(e, h) < 90)) { toast('Silenced by a Moth Enchantress!'); return false; } if (g.fac.key === 'forge') { if (g.gold < 40) { toast('Pressure: Steam Hammer needs 40 gold'); return false; } g.gold -= 40; } heroLine('ability');
  const pw = (1 + g.hm.ability / 100) * (g.fac.key === 'star' ? 1.35 : 1); h.cd = h.cdMax;
  if (FB() === 'stone') { const R = 140; g.enemies.forEach(e => { if ((!e.fly || e.grounded) && dist(e, h) < R) { e.stun = Math.max(e.stun, (e.boss ? 1.5 : 4) * pw); fx('shard', e.x, e.y, g.fac.key === 'jade' ? '#9ff0bf' : '#bff3ee'); } }); fx('ring', h.x, h.y, g.fac.key === 'jade' ? '#9ff0bf' : '#bff3ee', { r: R, d: 0.6 }); g.shake = 3; }
  else { const lead = g.enemies.filter(e => dist(e, h) < 220).sort((a, b) => remaining(a) - remaining(b))[0] || g.enemies.slice().sort((a, b) => remaining(a) - remaining(b))[0];
    if (lead) { const dm = 240 * DMG_K * pw * (g.sk.rain ? 1.5 * g.sk.rain : 1); g.enemies.forEach(e => { if (dist(e, lead) < 55) { damage(e, dm, 'fire', null); e.stun = Math.max(e.stun, 1.5); } }); fx('anvil', lead.x, lead.y, g.fac.accent); dust(lead.x, lead.y, 10, g.fac.key === 'star' ? '#cfe0ff' : g.fac.key === 'sun' ? '#ffe08a' : '#ffb070'); g.shake = 5; } }
  Sfx.play('ability'); return true;
}

// ---------------- Stakes: 15% / 35% / 100% of the bank, paid up front ----------------
function stakePm() { return 1 + (g.sk.ember ? 0.25 * g.sk.ember : 0) + g.hm.daring / 100; }
function stakeQuote(i) { const s = STAKES[i], amt = Math.floor(g.gold * s.pct); const ret = Math.round(amt * (1 + s.mult * stakePm())); return { ...s, amt, ret, net: ret - amt, can: amt >= 5 }; }
function placeStake(i) {
  g.stakeOffer = null; g.stakeDone = true;
  if (i != null && i >= 0) { const q = stakeQuote(i); if (q.can) { spend(q.amt); g.stake = { i, amt: q.amt, ret: q.ret, wave: g.wi }; dockPush({ kind: 'bark', who: 'Herald of Kasiri', txt: STR.stakeLines[i], spr: 'e_herald1', d: 2.6 }); tel('stake', { i, amt: q.amt }); Sfx.play('stamp'); } }
  callWave(true);
}
function resolveStake() {
  const s = g.stake; if (!s) return; g.stake = null; const won = g.waveLeaks === 0;
  g.stakeLog.push({ won, amt: s.amt, net: won ? s.ret - s.amt : -s.amt, w: s.wave + 1 }); if (won) { g.gold += s.ret; g.earned += s.ret; g.stamp = { won: true, s: `WON +${s.ret - s.amt}g`, t: 2.6 }; bark('stakewon'); Sfx.play('win'); }
  else { g.stamp = { won: false, s: `LOST \u2212${s.amt}g`, t: 2.6 }; bark('stakelost'); Sfx.play('lose'); }
}

// ---------------- Map gimmicks ----------------
function avalancheHit() {
  const a = g.map.avalanche, z = { x: C(a.zone.c), y: C(a.zone.r) }; g.ava.state = 'done'; g.ava.used = true;
  g.enemies.forEach(e => { if ((!e.fly || e.grounded) && dist(e, z) < a.zone.rad) damage(e, a.dmg, 'blunt', null); });
  a.pads.forEach(pi => { const t = g.towers.find(t => t.spot === pi); if (t) { t.stun = a.stun; fx('ring', t.x, t.y, '#ffffff', { r: 22 }); } });
  g.shake = 10; for (let i = 0; i < 26; i++) { const ang = rnd() * 6.28, rr_ = rnd() * a.zone.rad; fx('p', z.x + Math.cos(ang) * rr_, z.y + Math.sin(ang) * rr_ - 20, '#f4f9fc', { vx: (rnd() - 0.5) * 40, vy: 30 + rnd() * 60, d: 0.9 }); }
  fx('ring', z.x, z.y, '#f4f9fc', { r: a.zone.rad, d: 0.7 }); Sfx.play('avalanche');
}
function triggerCornice() { if (!g.ava || g.ava.used || g.ava.state === 'tele' || !g.inWave) return false; g.ava.state = 'tele'; g.ava.t = g.map.avalanche.telegraph; g.ava.early = true; bark('avalanche'); return true; }
function updateGimmicks(dt) {
  if (g.ava && g.inWave) { const a = g.ava;
    if (a.state === 'armed') { a.t -= dt; if (a.t <= 0) { a.state = 'tele'; a.t = g.map.avalanche.telegraph; bark('avalanche'); dockTip('avalanche'); } }
    else if (a.state === 'tele') { a.t -= dt; if (a.t <= 0) avalancheHit(); } }
  if (g.map.vents && g.inWave) { const V = g.map.vent; g.ventT += dt; const ph = g.ventT % V.every; g.venting = ph >= V.every - V.dur;
    if (g.venting) { if (!g.ventWas) { Sfx.play('vent'); if (g.wi >= 1) bark('vent'); }
      g.map.vents.forEach(([vc, vr]) => { const v = { x: C(vc), y: C(vr) }; g.enemies.forEach(e => { if (!e.fly && dist(e, v) < V.rad) { damage(e, V.dps * dt, 'fire', null, { trueDmg: true, dot: true }); e.wet = 3; } });
        if (rnd() < dt * 18) fx('steam', v.x + (rnd() - 0.5) * 14, v.y, '#e8eef0', { d: 0.9, vy: -40 - rnd() * 30 }); }); }
    g.ventWas = g.venting; } else g.venting = false;
}

// ---------------- Simulation ----------------
function update(dt) {
  if (g.over || g.offer || g.stakeOffer || g.paused || g.cinema || g.resumeT > 0) return; g.t += dt; const h = g.hero;
  if (!g.inWave && g.timerMax > 0 && !g.over) { g.timer -= dt; if (g.timer <= 0) { g.timer = 0; callWave(false); if (!g.inWave) return; } }
  if (g.inWave) { g.spawnT += dt; g.waveT += dt; while (g.spawnQ.length && g.spawnQ[0].at <= g.spawnT) spawn(g.spawnQ.shift()); if (g.cinema) return; }
  if (h.cd > 0) h.cd = Math.max(0, h.cd - dt);
  updateGimmicks(dt);
  for (const e of g.enemies) {
    if (e.hp <= 0) continue; e.wob += dt; if (e.hitT > 0) e.hitT -= dt; if (e.wet > 0) e.wet -= dt;
    if (e.burnT > 0) { e.burnT -= dt; damage(e, e.burn * dt, 'fire', null, { trueDmg: true, dot: true }); if (e.hp <= 0) continue; }
    if (e.boss && e.k === 'herald') { const ph = e.hp < e.max * 0.25 ? 3 : e.hp < e.max * 0.5 ? 2 : e.hp < e.max * 0.75 ? 1 : 0;
      if (ph > (e.phase || 0)) { e.phase = ph; if (ph === 2) { e.veil = 3; toast(STR.ui.armourHint, 2.6); } g.hitStop = Math.max(g.hitStop, 0.08); dockPush({ kind: 'bark', who: 'Herald of Kasiri', txt: STR.herald['p' + [75, 50, 25][ph - 1]], spr: 'e_herald' + HERALD_ART[ph], d: 2.8 }); fx('ring', e.x, e.y, '#ff6a8a', { r: 70 }); g.shake = 5; Sfx.play('boss');
        for (let i = 0; i < (ph === 2 ? 4 : 2); i++) { const m = spawn({ k: 'ling', hp: Math.round(ENEMIES.ling.hp * (1 + UNIT_HP_GROWTH * g.wi)) }); m.r = e.r; m.dist = Math.max(0, e.dist - 44 - i * 16); /* Kai: lings spawn behind her */ const p = posAt(ROUTES[m.r], m.dist); m.x = p.x; m.y = p.y; m.veilKid = 1; } }
      if (e.veil > 0) e.veil -= dt; }
    if (e.d.heal) { e.healT -= dt; if (e.healT <= 0) { e.healT = 3; g.enemies.forEach(o => { if (o !== e && o.hp > 0 && dist(o, e) < 60) o.hp = Math.min(o.max, o.hp + o.max * 0.06); }); fx('ring', e.x, e.y, '#ff7ab0', { r: 30 }); } }
    if (e.stun > 0) { e.stun -= dt; continue; } if (e.hold > 0) { e.hold -= dt; continue; }
    if (e.slowT > 0) e.slowT -= dt; else e.slow = 0; if (e.grounded > 0) e.grounded -= dt;
    let sp = e.d.spd * (e.spdK || 1) * (1 - e.slow) * (e.grounded > 0 ? 0.5 : 1) * (e.wet > 0 ? 0.85 : 1);
    if (e.fly && !(e.grounded > 0)) { const F = e.lane || FLY; e.prog += sp * dt / F.len; const t = Math.min(1, e.prog); const ox = e.x; e.x = F.a.x + (F.b.x - F.a.x) * t + Math.sin(e.wob * 2) * 14; e.y = F.a.y + (F.b.y - F.a.y) * t; e.flip = e.x < ox; if (t >= 1) leak(e); }
    else if (e.fly) { /* grounded flyer: held in place, drifting slightly */ e.prog += sp * 0.3 * dt / (e.lane || FLY).len; }
    else { const rt = ROUTES[e.r]; const s0 = segAt(rt, e.dist); if (s0.ice) sp *= 1.3; e.dist += sp * dt; const p = posAt(rt, e.dist); e.flip = p.dx < 0; e.x = p.x; e.y = p.y; if (e.dist >= rt.len) leak(e); }
  }
  g.enemies = g.enemies.filter(e => e.hp > 0 && !e.gone);
  if (g.boss && (g.boss.hp <= 0 || g.boss.gone) && !g.bossDur) g.bossDur = g.t - g.bossT0;
  for (const t of g.towers) fireTower(t, dt);
  heroAct(dt);
  g.shots = g.shots.filter(s => { s.t += dt; return s.t < s.d; }); if (g.shots.length > SHOT_CAP) g.shots.splice(0, g.shots.length - SHOT_CAP);
  g.fx = g.fx.filter(f => { f.t += dt; if (f.vx != null) { f.x += f.vx * dt; f.y += (f.vy || 0) * dt; } else if (f.vy) f.y += f.vy * dt; return f.t < f.d; });
  g.pools = g.pools.filter(p => { p.t -= dt; g.enemies.forEach(e => { if (!e.fly && dist(e, p) < p.r) { damage(e, p.dmg * dt, 'fire', null, { trueDmg: true, dot: true }); if (p.slow) { e.slow = Math.max(e.slow, p.slow); e.slowT = 0.3; } } }); return p.t > 0; });
  g.floats = g.floats.filter(f => { f.t += dt; return f.t < 0.9; });
  if (g.lives > 0 && g.lives <= 6) { if (!bark('lowlives')) heroLine('low'); }
  if (g.inWave && !g.spawnQ.length && !g.enemies.length) endWave();
}
function leak(e) { e.hp_at_leak = e.hp; e.gone = true; e.hp = 0; g.lives -= e.d.lives * (e.mini ? 2 : 1); g.leaked += e.d.lives; g.waveLeaks += e.d.lives; g.leakLog.push({ w: g.wi + 1, k: e.k, mini: e.mini, boss: e.boss }); Sfx.play('leak'); g.shake = Math.max(g.shake, 3);
  const ex = ROUTES[0].pts[ROUTES[0].pts.length - 1]; fx('ring', ex.x, ex.y, RED, { r: 30 }); bark('leak:' + e.k);
  if (e.boss && !g.bossDur) g.bossDur = g.t - g.bossT0;
  if (e.boss) { g.bossEscaped = true; g.lives = Math.max(0, g.lives); endMission(false); return; }
  if (g.lives <= 0) { g.lives = 0; endMission(false); } }
function endWave() {
  g.inWave = false; g.ava && g.ava.state !== 'done' && g.ava.state !== 'idle' && (g.ava.state = 'idle'); resolveStake(); tel('wave_end', { leaks: g.waveLeaks });
  g.wi++; const bonus = CLEAR_BONUS(g.wi); g.gold += bonus; g.earned += bonus; g.floats.push({ s: `Wave clear +${bonus}`, x: W / 2, y: MAP_H / 2, t: 0, col: GOLD });
  g.towers.forEach(t => { if (t.key === 'bastion' && t.branch === 'B' && g.wi % 2 === 0) g.lives = Math.min(g.maxLives, g.lives + 1); });
  if (g.ava && g.wi % g.map.avalanche.every === 0) { g.ava.used = false; g.ava.state = 'idle'; } // cornice regrows each 4-wave cycle
  if (g.wi >= g.map.waves.length) { endMission(true); return; }
  if (g.map.waves[g.wi].cp) checkpoint();
  if (g.gold > BANK_SOFT_CAP) dockTip('bank');
  armTimer(); snapshot();
}
function targets(t, range, air) {
  return g.enemies.filter(e => e.hp > 0 && dist(e, t) <= range && (air === 'only' ? e.fly && !(e.grounded > 0) : air === 'no' ? !e.fly || e.grounded > 0 : true)).sort(TGT_CMP[t.tgt || 'first']);
}
function fireTower(t, dt) {
  const d = TOWERS[t.key]; if (t.flash > 0) t.flash -= dt * 2; if (t.stun > 0) { t.stun -= dt; return; } t.cd -= dt;
  if (t.hot > 0) { t.hot -= dt; return; } if (t.heat > 0) t.heat = Math.max(0, t.heat - dt * 8);
  if (t.cd > 0) return; const s = effStats(t), m = s.mod || {}; let air = d.air; if (d.kind === 'aura' && m.airFull) air = 'yes';
  const tg = targets(t, s.range, air); if (!tg.length) return; const e = tg[0];
  t.cd = s.rate; t.ang = Math.atan2(e.y - t.y, e.x - t.x); t.recoil = 1;
  const airMul = (x) => (x.fly && !(x.grounded > 0) && d.air === 'half' && !m.airFull) ? 0.5 : 1;
  if (d.heat && g.fac.key === 'sun') { t.heat += d.heat * (g.sk.mastery ? 0.75 : 1) * (t.nearVent ? 1 - g.map.vent.heatCut : 1); if (t.heat >= 100) { t.heat = 0; t.hot = g.sk.quench ? 2 : 4; fx('ring', t.x, t.y - 20, '#ff6a2a', { r: 20 }); Sfx.play('heat'); } }
  Sfx.play('shoot');
  switch (d.kind) {
    case 'bolt': { const n = 1 + (m.extra || 0); tg.slice(0, n).forEach(x => { damage(x, s.dmg * airMul(x), d.dtype, t); if (m.stun) x.stun = Math.max(x.stun, m.stun * 0.5); if (s.ground && x.fly) x.grounded = s.ground * (g.sk.chains ? 1.5 : 1); g.shots.push({ k: t.key === 'skyhook' ? 'chain' : t.key === 'spire' ? 'crystal' : 'bolt', x: t.x, y: t.y - 30, tx: x.x, ty: x.y - 12, t: 0, d: 0.18 }); fx('hit', x.x, x.y - 12, '#bff3ee', { d: 0.18 }); }); break; }
    case 'block': { tg.slice(0, 3).forEach(x => { damage(x, s.dmg, d.dtype, t); x.hold = Math.max(x.hold, s.hold * (1 + (m.holdX || 0))); }); fx('ring', t.x, t.y, '#c9b38a', { r: s.range * 0.7 }); break; }
    case 'slam': { tg.forEach(x => { damage(x, s.dmg, d.dtype, t); x.shred = Math.max(x.shred, m.shred || d.shred); if (m.knock && !x.boss) x.dist = Math.max(0, x.dist - m.knock); }); fx('ring', t.x, t.y, '#d9e7ef', { r: s.range }); g.shake = Math.max(g.shake, 1); break; }
    case 'shell': { const shots = m.twin ? tg.slice(0, 2) : [e]; shots.forEach(x => { g.enemies.forEach(o => { if (dist(o, x) < s.splash && (!o.fly || o.grounded > 0)) damage(o, s.dmg, d.dtype, t); }); fx('boom', x.x, x.y, '#E8702A', { r: s.splash * 0.6 }); g.shots.push({ k: 'shell', x: t.x, y: t.y - 28, tx: x.x, ty: x.y, t: 0, d: 0.25 }); }); g.shake = Math.max(g.shake, 1.2); Sfx.play('boom'); break; }
    case 'slag': { damage(e, s.dmg, d.dtype, t); g.pools.push({ x: e.x, y: e.y, r: 22, dmg: s.burn, t: 2.5 * (m.poolX || 1), slow: m.slow || 0 }); if (g.pools.length > 24) g.pools.shift(); g.shots.push({ k: 'shell', x: t.x, y: t.y - 28, tx: e.x, ty: e.y, t: 0, d: 0.3 }); break; }
    case 'beam': { const ang = t.ang, len = m.dmgX ? 400 : s.range; g.enemies.forEach(x => { const dx = x.x - t.x, dy = x.y - t.y, along = dx * Math.cos(ang) + dy * Math.sin(ang), perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang)); if (along > 0 && along < len && perp < 14) damage(x, s.dmg * airMul(x), d.dtype, t, { pierce: m.pierce || d.pierce }); }); g.shots.push({ k: 'beam', x: t.x, y: t.y - 34, tx: t.x + Math.cos(ang) * len, ty: t.y - 34 + Math.sin(ang) * len, t: 0, d: 0.2 }); break; }
    case 'aura': { tg.forEach(x => { damage(x, s.dmg * airMul(x), d.dtype, t); x.armDown = Math.max(x.armDown, s.armourDown); }); g.towers.forEach(o => { if (o.heat && dist(o, t) < 90) o.heat = Math.max(0, o.heat - 20); }); fx('ring', t.x, t.y - 20, '#C9A14A', { r: s.range * 0.8 }); break; }
    case 'flak': { g.enemies.forEach(x => { if (dist(x, e) < s.cloud * (1 + (m.cloudX || 0))) { damage(x, s.dmg * (x.fly ? 1.6 : 0.6), d.dtype, t); if (m.airSlow && x.fly) { x.slow = m.airSlow; x.slowT = 1.5; } } }); fx('boom', e.x, e.y - 14, '#ffd06a', { r: s.cloud * 0.7 }); g.shots.push({ k: 'bolt', x: t.x, y: t.y - 28, tx: e.x, ty: e.y - 14, t: 0, d: 0.15 }); break; }
  }
}
function heroAct(dt) {
  const h = g.hero, s = heroStats(); h.atk -= dt; if (h.swing > 0) h.swing -= dt * 4; if (h.atk > 0) return;
  const tg = targets(h, s.range, 'yes'); if (!tg.length) return; const e = tg[0]; h.atk = s.rate; h.face = e.x < h.x ? -1 : 1; h.swing = 1;
  if (s.splash) g.enemies.forEach(o => { if (dist(o, e) < s.splash) damage(o, s.dmg, s.dtype, null); }); else damage(e, s.dmg, s.dtype, null);
  g.shots.push({ k: FB() === 'stone' ? 'crystal' : 'shell', x: h.x, y: h.y - 34, tx: e.x, ty: e.y - 12, t: 0, d: 0.2 });
}

// ---------------- Mission end + progression ----------------
let result = null, lvlUps = [];
function endMission(win) {
  if (g.over) return; if (g.stake) { g.stakeLog.push({ won: false, amt: g.stake.amt, net: -g.stake.amt, w: g.stake.wave + 1 }); g.stake = null; } g.over = true; g.ring = null; clearRun(); const st = P.heroes[g.hk]; const map = g.map;
  const ratio = g.lives / g.maxLives; const leaksTot = g.leakLog.length; const miniLeak3 = g.leakLog.some(l => l.mini && l.w === 3); const stars = win ? (g.bossKilled && (g.bossKills || 0) >= 2 && leaksTot <= STAR3_LEAKS && ratio >= STAR3_LIVES ? 3 : ratio >= 0.4 ? 2 : 1) : 0; // iter3b: 50-wave rule
  const prevStars = P.stars[g.mk] || 0; const starShards = Math.max(0, stars - prevStars); const miniShards = g.miniKills; const bossShards = g.bossKilled ? 2 : 0;
  const shards = starShards + miniShards + bossShards; if (stars > prevStars) P.stars[g.mk] = stars;
  const xp = 20 + g.wi * 12 + (win ? 60 : 0) + g.kills;
  const drops = []; const nd = win ? 1 + (stars >= 2 ? 1 : 0) : (g.wi >= 4 ? 1 : 0);
  for (let i = 0; i < nd; i++) drops.push(genItem(rollRarity(stars >= 3 ? 1 : 0), null, P.faction)); P.inv.push(...drops);
  P.plays++; P.missions = (P.missions || 0) + 1; if (win) P.clears++; P.best = Math.max(P.best, g.wi); P.shards += shards;
  const from = st.lvl; st.xp += xp; lvlUps = [];
  while (st.lvl < HERO_MAX_LVL && st.xp >= PROFILE_XP(st.lvl)) { st.xp -= PROFILE_XP(st.lvl); st.lvl++; lvlUps.push(st.lvl); }
  // reasons
  let reason, starWhy;
  if (win) { reason = g.bossKilled ? `The Herald of Kasiri fell after ${Math.round(g.bossDur)}s. ${map.name} holds.` : `All ${map.waves.length} waves cleared.`;
    starWhy = `${leaksTot} leak${leaksTot === 1 ? '' : 's'}, ${g.lives}/${g.maxLives} lives. ${stars === 3 ? `3\u2605: both bosses down, \u2264${STAR3_LEAKS} leaks, ${Math.round(STAR3_LIVES * 100)}%+ lives.` : stars === 2 ? (miniLeak3 ? '3\u2605 lost: the wave 3 champion got through.' : `3\u2605 needs both bosses killed, \u2264${STAR3_LEAKS} leaks and ${Math.round(STAR3_LIVES * 100)}%+ lives.`) : '2\u2605 needs 40%+ lives kept.'}`; }
  else { const w = g.wi + 1; const lw = g.leakLog.filter(l => l.w === w); const by = {}; lw.forEach(l => by[l.k] = (by[l.k] || 0) + 1);
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, n]) => `${n} ${ENEMIES[k].name}${n > 1 ? 's' : ''}`).join(' and ');
    reason = g.bossEscaped ? `The Herald of Kasiri reached the shrine after ${Math.round(g.bossDur)}s. Her health bar must hit zero before she walks out.` : `The shrine fell on wave ${w} of ${map.waves.length}${top ? ': ' + top + ' slipped through' : ''}.`;
    const flyers = lw.filter(l => ENEMIES[l.k].fly).length; starWhy = flyers > lw.length / 2 ? 'Most leaks were flyers \u2014 build anti-air (Gale Harpoon / Flak Gargoyle).' : lw.some(l => l.k === 'ling') ? 'Fast Couriers got through \u2014 slow or hold the lane early.' : 'Upgrade earlier and spend the bank before spikes.'; }
  result = { goldEnd: Math.round(g.gold), win, stars, xp, shards, starShards, miniShards, bossShards, drops, from, to: st.lvl, wave: g.wi, kills: g.kills, lives: g.lives, maxLives: g.maxLives, reason, starWhy, mk: g.mk, bossDur: g.bossDur, story: win ? STR.victory[g.mk] : STR.defeat[FB()], cp: !win && !!getCp(), stakeLog: g.stakeLog.slice(), cleared: win ? map.waves.length : g.wi, cause: !win ? (g.bossEscaped ? 'boss' : (g.stakeLog.length && !g.stakeLog[g.stakeLog.length - 1].won && g.stakeLog[g.stakeLog.length - 1].w === g.wi + 1 ? 'stake' : 'leak')) : 'win', fac: P.faction, bank: g.gold };
  result.story = (win ? STR.victory[g.mk] + (STR.teaser[g.mk] ? ' ' + STR.teaser[g.mk] : '') : pickDebrief(result.cause, FB())).replace(/\{H\}/g, g.fac.hero.name);
  if (g.cheated) tel('cheat_run', { win, stars }); else tel(win ? 'victory' : 'defeat', { stars, bossDur: g.bossDur });
  save(); Sfx.play(win ? 'win' : 'lose'); g.endT = 0.8;
}
function pickDebrief(cause, fac) { const L = [...new Set((STR.debrief[cause + ':' + fac] || []).concat(STR.debrief[cause] || []))]; if (!L.length) return STR.defeat[fac];
  const hist = P.debriefHist || (P.debriefHist = []); let pool = L.filter(x => !hist.includes(x)); if (!pool.length) { const oldest = hist.find(x => L.includes(x)); pool = [oldest]; } // Thandi: rolling last-10 no-repeat
  const pick = pool[Math.floor(Math.random() * pool.length)]; const i = hist.indexOf(pick); if (i >= 0) hist.splice(i, 1); hist.push(pick); while (hist.length > 10) hist.shift(); save(); return pick; }
function canEvolve(hk) { const st = P.heroes[hk], n = EVOS[hk][st.evo + 1]; return n && st.lvl >= n.lvl && P.shards >= n.cost; }
function evolve(hk) { const st = P.heroes[hk], n = EVOS[hk][st.evo + 1]; if (!canEvolve(hk)) return; P.shards -= n.cost; st.evo++; save(); evoFx = now; Sfx.play('win'); }
let evoFx = -9999, armSlot = 'weapon', armPage = 0;
function equip(it) { const st = P.heroes[heroKey(P.faction)]; st.equip[it.slot] = st.equip[it.slot] === it.id ? undefined : it.id; if (!st.equip[it.slot]) delete st.equip[it.slot]; save(); }
function cycleSpeed() { if (!g || g.offer || g.stakeOffer || g.cinema || g.paused) return; g.speed = g.speed === 1 ? 2 : g.speed === 2 ? 4 : 1; g.speedPref = g.speed; }
function pauseGame() { if (!g || g.over) return; g.paused = true; g.ring = null; tel('pause'); }
function resumeGame() { g.paused = false; g.confirmQuit = null; g.resumeT = 1.2; tel('resume'); } // safe resume: short countdown, world frozen
function closeRing() { if (g) g.ring = null; }

// ---------------- Drawing: world ----------------
const ENEMY_H = (e) => HERO_H * SIZE[e.d.size] * (e.mini ? 1.0 / SIZE[e.d.size] * SIZE.elite * 1.12 : 1);
function towerSprite(t) { return t.lvl >= BRANCH_LVL && t.branch ? `t_${t.key}_${t.branch}` : `t_${t.key}_1`; }
function drawTower(t) {
  const h = t.lvl >= BRANCH_LVL ? HERO_H * SIZE.tower : HERO_H * SIZE.tower * 0.88; // L1-3 smaller base silhouette; L4+ branch silhouette
  if (t.lvl >= 7) { const gr = ctx.createRadialGradient(t.x, t.y - 4, 2, t.x, t.y - 4, 26); gr.addColorStop(0, t.lvl >= 10 ? 'rgba(242,193,78,0.55)' : 'rgba(191,243,238,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(t.x - 26, t.y - 30, 52, 52); }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(t.x, t.y + 10, 16, 5, 0, 0, 7); ctx.fill();
  const rec = (t.recoil || 0); if (rec > 0) t.recoil = Math.max(0, rec - 0.15);
  const sq = 1 - rec * 0.04; ctx.save(); ctx.translate(t.x, t.y + 12); ctx.scale(1 + rec * 0.03, sq);
  if (t.stun > 0 || t.hot > 0) ctx.filter = t.hot > 0 ? 'sepia(1) saturate(3) hue-rotate(-20deg)' : 'grayscale(0.7) brightness(1.3)';
  drawSprite(ctx, towerSprite(t), 0, 0, h); ctx.restore();
  if (t.flash > 0) { ctx.save(); ctx.globalAlpha = t.flash * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(t.x, t.y - 16, 22, 0, 7); ctx.fill(); ctx.restore(); }
  // level pips (>=12px text rule: use a badge)
  ctx.fillStyle = 'rgba(16,8,22,0.85)'; rr(ctx, t.x + 7, t.y + 1, 24, 16, 8); ctx.fill(); txt(ctx, t.lvl, t.x + 19, t.y + 9.5, 13, t.lvl >= 10 ? GOLD : INK, 'center', 'Nunito', 900);
  if (t.heat > 0 || t.hot > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(t.x - 14, t.y + 18, 28, 4); ctx.fillStyle = t.hot > 0 ? RED : '#E8702A'; ctx.fillRect(t.x - 14, t.y + 18, 28 * (t.hot > 0 ? 1 : t.heat / 100), 4); }
  if (t.stun > 0) txt(ctx, 'STUN', t.x, t.y - 50, 12, '#bff3ee', 'center');
}
function drawEnemy(e) {
  const h = e.boss ? HERO_H * SIZE.boss * BOSS_SCALE : e.mini ? HERO_H * SIZE.elite * 1.12 : HERO_H * SIZE[e.d.size];
  const bob = e.fly ? Math.sin(e.wob * 4) * 3 - 14 : Math.abs(Math.sin(e.wob * 7)) * -2;
  if (e.boss) { const gl = ctx.createRadialGradient(e.x, e.y + 6, 4, e.x, e.y + 6, h * 0.42); const pk = opt.reduced ? 0.55 : 0.5 + 0.12 * Math.sin(tReal * 4); gl.addColorStop(0, `rgba(255,40,60,${pk})`); gl.addColorStop(1, 'rgba(255,40,60,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(e.x, e.y + 6, h * 0.42, h * 0.15, 0, 0, 7); ctx.fill(); } // Zara: red ground glow
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 6, h * 0.22, h * 0.07, 0, 0, 7); ctx.fill();
  const spr = e.k === 'herald' ? 'e_herald' + HERALD_ART[e.phase || 0] : e.d.sprite;
  ctx.save(); if (e.hitT > 0) ctx.filter = 'brightness(2.2)'; else if (e.stun > 0 || e.hold > 0) ctx.filter = 'saturate(0.3) brightness(1.2)'; else if (e.wet > 0) ctx.filter = 'hue-rotate(160deg) saturate(0.7)';
  if (e.veil > 0) ctx.globalAlpha = 0.55;
  if (e.vr == null) e.vr = e.boss ? 0 : Math.floor(Math.random() * 5); const bw = E_BUILD[e.vr], bt = E_TALL[e.vr]; if (bw !== 1 || bt !== 1) { ctx.translate(e.x, e.y); ctx.scale(bw, bt); ctx.translate(-e.x, -e.y); }
  drawSprite(ctx, e.vr ? spr + '~' + e.vr : spr, e.x, e.y + 8 + bob, h, e.flip); ctx.restore();
  if (e.mini) { ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y + 6, h * 0.28, h * 0.09, 0, 0, 7); ctx.stroke(); }
  if (!e.boss) { const w = e.mini ? 34 : 22, y = e.y + 8 + bob - h - 5; ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(e.x - w / 2, y, w, 4); ctx.fillStyle = e.mini ? GOLD : GOOD; ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.max), 4); }
}
function shakeOff() { if (g.shake <= 0 || opt.reduced) return [0, 0]; const s = g.shake; return [(Math.random() - 0.5) * s, (Math.random() - 0.5) * s]; }
function drawWorld(MY) {
  const [sx, sy] = shakeOff(); ctx.save(); ctx.translate(sx, MY + sy); ui.oy = MY;
  if (MAPC) ctx.drawImage(MAPC, 0, 0, W, MAP_H);
  const map = g.map;
  // spawn + exit markers (always visible, never covered: ring avoids them)
  const sp = ROUTES[0].pts[0], ex = ROUTES[0].pts[ROUTES[0].pts.length - 1];
  if (!(g.boss && g.boss.hp > 0)) { const lx = sp.x + SPAWN_DX, ly = sp.y + 6; ctx.save(); ctx.globalAlpha = g.inWave ? 0.45 : 1; ctx.fillStyle = 'rgba(200,16,46,0.9)'; rr(ctx, lx - 30, ly - 10, 60, 20, 10); ctx.fill(); txt(ctx, 'SPAWN', lx, ly + 1, 13, '#fff', 'center', 'Nunito', 900); ctx.fillStyle = 'rgba(200,16,46,0.9)'; ctx.beginPath(); ctx.moveTo(lx - 30, ly - 4); ctx.lineTo(lx - 38, ly); ctx.lineTo(lx - 30, ly + 4); ctx.fill(); ctx.restore(); } // Zara: beside the lane, never under enemies or the boss bar
  ctx.fillStyle = 'rgba(46,196,182,0.9)'; rr(ctx, ex.x - 26, ex.y - 14, 52, 18, 9); ctx.fill(); txt(ctx, 'SHRINE', ex.x, ex.y - 5, 12, '#062a26', 'center', 'Nunito', 900);
  // pads: tap targets
  map.pads.forEach(([c, r], i) => { const t = g.towers.find(t => t.spot === i); const busy = g.ring && g.ring.spot === i;
    if (busy) { ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(C(c), C(r), 19, 0, 7); ctx.stroke(); }
    B(t ? 'tw' + i : 'spot' + i, C(c) - 20, C(r) - 20, 40, 40, { hidden: true, silent: true }, () => openRing(i)); });
  { const h = g.hero; B('heroTap', h.x - 22, h.y - 44, 44, 48, { hidden: true, silent: true }, () => { g.ring = g.ring && g.ring.hero ? null : { hero: true, x: h.x, y: h.y, sel: null }; }); }
  // hazards
  if (g.ava) { const a = map.avalanche, [cc, cr] = a.cornice, x = C(cc), y = C(cr);
    if (!g.ava.used) { ctx.fillStyle = 'rgba(244,249,252,0.92)'; ctx.beginPath(); ctx.moveTo(x - 16, y + 10); ctx.lineTo(x - 6, y - 12); ctx.lineTo(x + 4, y - 4); ctx.lineTo(x + 14, y - 14); ctx.lineTo(x + 18, y + 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2EC4B6'; ctx.lineWidth = 1.5; ctx.stroke(); if (g.inWave && g.ava.state !== 'tele') { ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(tReal * 4); ctx.strokeStyle = '#8ff0e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.stroke(); ctx.restore(); }
      outlined(ctx, 'CORNICE', x - 18, y + 20, 12, '#e8fbff');
      if (g.inWave && g.ava.state !== 'tele') B('cornice', x - 22, y - 22, 44, 44, { hidden: true }, () => { g.ring = { cornice: true, x, y }; }); }
    if (g.ava.state === 'tele') { const z = a.zone, k = 1 - g.ava.t / a.telegraph; ctx.save(); ctx.globalAlpha = 0.25 + 0.25 * Math.sin(now / 80); ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(C(z.c), C(z.r), z.rad, 0, 7); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(C(z.c), C(z.r), z.rad, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke(); txt(ctx, `AVALANCHE ${g.ava.t.toFixed(1)}s`, C(z.c), C(z.r), 13, '#fff', 'center', 'Nunito', 900);
      a.pads.forEach(pi => { const [pc, pr] = map.pads[pi]; ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(C(pc), C(pr), 20, 0, 7); ctx.stroke(); ctx.setLineDash([]); }); } }
  if (map.vents && g.inWave) { const V = map.vent, ph = g.ventT % V.every, warn = ph >= V.every - V.dur - 1.2 && !g.venting;
    map.vents.forEach(([vc, vr]) => { const x = C(vc), y = C(vr); if (g.venting) { ctx.fillStyle = 'rgba(255,140,60,0.28)'; ctx.beginPath(); ctx.arc(x, y, V.rad, 0, 7); ctx.fill(); } else if (warn) { ctx.strokeStyle = 'rgba(255,140,60,' + (0.5 + 0.5 * Math.sin(now / 60)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, V.rad, 0, 7); ctx.stroke(); } }); }
  g.pools.forEach(p => { ctx.fillStyle = `rgba(232,112,42,${0.25 * Math.min(1, p.t)})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, 0, 0, 7); ctx.fill(); });
  // depth-sorted entities
  const ents = [...g.towers.map(t => ({ y: t.y, f: () => drawTower(t) })), ...g.enemies.map(e => ({ y: e.y + (e.fly ? 30 : 0), f: () => drawEnemy(e) })), { y: g.hero.y, f: () => { const h = g.hero; ctx.save(); ctx.translate(h.x, h.y + 10); ctx.scale(h.face, 1); ctx.rotate(h.swing * 0.06); ctx.save(); ctx.scale(h.face, 1); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 5, 0, 0, 7); ctx.fill(); ctx.restore();
      const hh = HERO_H * SIZE.tower * 0.82, ev = P.heroes[g.hk].evo; if (false) { const s = hh * 0.62; ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.14, 0, 0, 7); ctx.fill(); ctx.fillStyle = g.fac.accent; ctx.fillRect(-2, -s * 0.55, 4, s * 0.55); ctx.beginPath(); ctx.arc(0, -s * 0.55 - s / 2, s / 2 + 3, 0, 7); ctx.fill(); drawPortrait(ctx, g.hk, -s / 2, -s * 1.05, s); } else if (!drawSprite(ctx, `hs_${g.hk}${ev >= 2 ? 3 : 0}`, 0, 0, hh)) drawHero(ctx, heroLook(P), 0, 0, HERO_H, now / 1000); ctx.restore(); } }];
  ents.sort((a, b) => a.y - b.y).forEach(o => o.f());
  g.shots.forEach(s => { const k = s.t / s.d; ctx.strokeStyle = s.k === 'beam' ? '#9fe8ff' : s.k === 'chain' ? '#d9e7ef' : s.k === 'crystal' ? '#bff3ee' : s.k === 'shell' ? '#ffb070' : '#fff3c0'; ctx.lineWidth = s.k === 'beam' ? 4 * (1 - k) + 1 : 2.5;
    if (s.k === 'shell') { const x = s.x + (s.tx - s.x) * k, y = s.y + (s.ty - s.y) * k - Math.sin(k * Math.PI) * 30; ctx.fillStyle = '#ffb070'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
    else { ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.tx, s.ty); ctx.stroke(); ctx.globalAlpha = 1; } });
  g.fx.forEach(f => { const k = f.t / f.d; ctx.save(); ctx.globalAlpha = 1 - k;
    if (f.k === 'ring') { ctx.strokeStyle = f.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 30) * (0.4 + k * 0.6), 0, 7); ctx.stroke(); }
    else if (f.k === 'boom') { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 20) * (0.5 + k), 0, 7); ctx.fill(); ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 20) * 0.4 * (1 - k), 0, 7); ctx.fill(); }
    else if (f.k === 'burst') { for (let i = 0; i < (f.n || 8); i++) { const a = i / (f.n || 8) * 6.283; ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * k * 30, f.y + Math.sin(a) * k * 30, 3 * (1 - k) + 1, 0, 7); ctx.fill(); } }
    else if (f.k === 'anvil') { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, 55 * k, 0, 7); ctx.fill(); }
    else if (f.k === 'steam') { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, 5 + k * 9, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = f.col; ctx.fillRect(f.x - 2, f.y - 2, 4, 4); }
    ctx.restore(); });
  g.floats.forEach(f => { ctx.save(); ctx.globalAlpha = 1 - f.t / 0.9; outlined(ctx, f.s, f.x, f.y - f.t * 26, f.s.length > 8 ? 14 : 17, f.col); ctx.restore(); });
  if (g.boss && g.boss.hp > 0) { const b = g.boss; ctx.fillStyle = 'rgba(16,8,22,0.85)'; rr(ctx, 30, 6, W - 60, 22, 11); ctx.fill(); ctx.fillStyle = RED; rr(ctx, 34, 10, (W - 68) * b.hp / b.max, 14, 7); ctx.fill(); txt(ctx, `${b.d.name}${b.veil > 0 ? ' \u2014 VEILED' : ''}`, W / 2, 17, 12, '#fff', 'center', 'Nunito', 900); }
  if (g.ring) drawRing();
  ctx.restore(); ui.oy = 0;
}

// ---------------- Ring menu: <=70px radius incl. buttons (~8% of the map), never over spawn/exit ----------------
function openRing(spot) { if (g.over) return; if (g.ring && g.ring.spot === spot) { g.ring = null; return; } const [c, r] = g.map.pads[spot]; g.ring = { spot, x: C(c), y: C(r), sel: null }; }
function ringCentre(x, y) {
  const R = 70; let cx = clamp(x, R, W - R), cy = clamp(y, R, MAP_H - R);
  const avoid = [ROUTES[0].pts[0], ROUTES[0].pts[ROUTES[0].pts.length - 1]];
  for (let it = 0; it < 4; it++) avoid.forEach(p => { const d = Math.hypot(cx - p.x, cy - p.y); if (d < R + 16) { const k = (R + 16 - d) / Math.max(1, d); cx += (cx - p.x) * k; cy += (cy - p.y) * k; if (d < 1) cy += R; cx = clamp(cx, R, W - R); cy = clamp(cy, R, MAP_H - R); } });
  return { cx, cy };
}
function ringButtons(opts) { const n = opts.length, { cx, cy } = ringCentre(g.ring.x, g.ring.y); g.ring.cx = cx; g.ring.cy = cy; const RAD = 50;
  ctx.fillStyle = 'rgba(16,8,22,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, RAD + 22, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(242,193,78,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  opts.forEach((o, i) => { const a = -Math.PI / 2 + i * 6.283 / n, x = cx + Math.cos(a) * RAD - 20, y = cy + Math.sin(a) * RAD - 20; B(o.id, x, y, 40, 40, Object.assign({ r: 20, sz: 12 }, o), o.fn);
    if (o.cost != null) { ctx.fillStyle = 'rgba(16,8,22,0.9)'; rr(ctx, x + 4, y + 30, 32, 14, 7); ctx.fill(); txt(ctx, o.cost, x + 20, y + 37.5, 12, g.gold >= o.cost ? GOLD : BAD, 'center', 'Nunito', 900); } });
  return { cx, cy };
}
function infoLine(s1, s2) { g.ringInfo = [s1, s2]; }
function drawRing() {
  const R = g.ring; g.ringInfo = null;
  if (R.hero) { const h = g.hero; ringButtons([{ id: 'tgt', style: 'ice', label: TGT_LBL[h.tgt || 'first'], sz: 12, fam: 'Nunito', fn: () => cycleTgt(h) }, { id: 'rClose', style: 'plum', label: '\u2715', sz: 14, fn: () => { g.ring = null; } }]);
    infoLine(`${g.fac.hero.name}: target ${TGT_NAME[h.tgt || 'first']}`, 'Tap the target button to cycle First / Last / Strongest / Weakest'); return; }
  if (R.cornice) { const { cx, cy } = ringButtons([{ id: 'cornOk', style: 'red', label: '\u2713', sz: 18, fn: () => { g.ring = null; triggerCornice(); } }, { id: 'cornNo', style: 'plum', label: '\u2715', sz: 16, fn: () => { g.ring = null; } }]);
    infoLine('Drop the avalanche now?', 'One-shot: 120 blunt in the zone, stuns towers on 2 pads for 2s'); return; }
  const t = g.towers.find(t => t.spot === R.spot);
  if (!t) { const keys = g.fac.towers; const opts = keys.map(k => ({ id: 'b_' + k, icon: towerSprite({ key: k, lvl: 1 }), style: R.sel === k ? 'gold' : 'plum', selected: R.sel === k, cost: buildCost(k), fn: () => { R.sel = k; } }));
    const { cx, cy } = ringButtons(opts);
    if (R.sel) { const k = R.sel, d = TOWERS[k]; B('bOk', cx - 18, cy - 18, 36, 36, { style: g.gold >= buildCost(k) ? 'green' : 'plum', label: '\u2713', sz: 18, r: 18, disabled: g.gold < buildCost(k) }, () => build(k, R.spot));
      infoLine(`${tName(k)} \u2014 ${buildCost(k)}g`, `${d.desc} ${g.fac.key === 'jade' ? 'Can\u2019t be sold.' : ''}`); }
    else { B('rClose', cx - 18, cy - 18, 36, 36, { style: 'plum', label: '\u2715', sz: 14, r: 18 }, () => { g.ring = null; }); infoLine('Choose a tower', 'Tap an icon, then \u2713 to build'); }
    return; }
  const opts = []; const s = effStats(t);
  if (t.lvl < MAX_LVL) { if (t.lvl + 1 === BRANCH_LVL) TOWERS[t.key].branches.forEach(b => opts.push({ id: 'br' + b.key, style: R.sel === b.key ? 'gold' : 'plum', selected: R.sel === b.key, label: b.key, sz: 16, cost: upCost(t.key, t.lvl), fn: () => { R.sel = b.key; } }));
    else opts.push({ id: 'up', style: g.gold >= upCost(t.key, t.lvl) ? 'green' : 'plum', label: '\u25B2', sz: 16, cost: upCost(t.key, t.lvl), fn: () => upgrade(t) }); }
  if (g.fac.key !== 'jade') opts.push({ id: 'sell', style: R.sel === 'sell' ? 'red' : 'plum', selected: R.sel === 'sell', label: '$', sz: 16, fn: () => { R.sel = 'sell'; } });
  opts.push({ id: 'tgt', style: 'ice', label: TGT_LBL[t.tgt || 'first'], sz: 12, fam: 'Nunito', fn: () => { R.sel = null; cycleTgt(t); } });
  opts.push({ id: 'rClose', style: 'plum', label: '\u2715', sz: 14, fn: () => { g.ring = null; } });
  const { cx, cy } = ringButtons(opts);
  if (R.sel === 'sell') { B('sellOk', cx - 18, cy - 18, 36, 36, { style: 'red', label: '\u2713', sz: 18, r: 18 }, () => sell(t)); infoLine(`Sell for ${Math.round(t.spent * 0.6)}g?`, 'Tap \u2713 to confirm'); }
  else if (R.sel === 'A' || R.sel === 'B') { const b = TOWERS[t.key].branches.find(x => x.key === R.sel); const c = upCost(t.key, t.lvl); B('brOk', cx - 18, cy - 18, 36, 36, { style: g.gold >= c ? 'green' : 'plum', label: '\u2713', sz: 18, r: 18, disabled: g.gold < c }, () => { if (upgrade(t, R.sel)) R.sel = null; }); infoLine(`L4 ${b.name} \u2014 ${c}g (permanent)`, b.desc); }
  else infoLine(`${towerName(t.key, t.lvl, t.branch)} L${t.lvl}${t.lvl >= MAX_LVL ? ' (MAX)' : ''}`, `target ${TGT_NAME[t.tgt || 'first']} \u00b7 dmg ${s.dmg} \u00b7 rate ${s.rate}s \u00b7 range ${s.range}${t.lvl < MAX_LVL ? ` \u00b7 next ${upCost(t.key, t.lvl)}g` : ''}`);
}

// ---------------- HUD + dock ----------------
function pill(x, y, w, h, label, col = INK) { ctx.fillStyle = 'rgba(16,8,22,0.82)'; rr(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.strokeStyle = 'rgba(242,193,78,0.35)'; ctx.lineWidth = 1; ctx.stroke(); txt(ctx, label, x + w / 2, y + h / 2 + 1, 13, col, 'center', 'Nunito', 900, w - 8); }
function drawHUD(MY) {
  const y0 = MY - HUD_H; ctx.fillStyle = '#140a1a'; ctx.fillRect(0, 0, W, MY);
  pill(4, y0 + 8, 78, 28, `\u2665 ${g.lives}/${g.maxLives}`, g.lives <= 6 ? BAD : '#ffb3c0'); pill(85, y0 + 8, 62, 28, `\u25C9 ${Math.floor(g.gold)}`, GOLD); B('goldPill', 85, y0 + 8, 62, 28, { hidden: true, silent: true }, cheatTap);
  pill(150, y0 + 8, 92, 28, `Wave ${Math.min(g.wi + (g.inWave ? 1 : 0), g.map.waves.length) || 0}/${g.map.waves.length}`, INK);
  B('speed', 246, y0, 50, 44, { style: g.speed > 1 ? 'gold' : 'plum', label: g.speed + 'x', sz: 13 }, cycleSpeed);
  B('pause', 302, y0, 52, 44, { style: 'plum', label: '\u275A\u275A', sz: 13 }, pauseGame);
}
function drawDock() {
  const y = DOCK_Y(), h = H - y; const gr = ctx.createLinearGradient(0, y, 0, H); gr.addColorStop(0, '#2a1630'); gr.addColorStop(1, '#0e0712'); ctx.fillStyle = gr; ctx.fillRect(0, y, W, h);
  ctx.strokeStyle = 'rgba(242,193,78,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y + 1); ctx.lineTo(W, y + 1); ctx.stroke(); ctx.strokeStyle = 'rgba(242,193,78,0.25)'; ctx.lineWidth = 1; rr(ctx, 3, y + 5, W - 6, h - 8, 10); ctx.stroke();
  const tall = h >= 150; const bh = Math.min(64, h - 12), by = tall ? H - bh - 12 : y + (h - bh) / 2; const hh = g.hero;
  // ability (left)
  const ready = hh.cd <= 0 && g.inWave; B('ability', 6, by, 64, bh, { style: ready ? (FB() === 'stone' ? 'ice' : 'red') : 'plum', label: g.fac.ab, sub: hh.cd > 0 ? Math.ceil(hh.cd) + 's' : ready ? 'ready' : 'in wave', sz: 13, disabled: !ready }, useAbility);
  // wave / call-early (right)
  const wv = g.map.waves.length; let lab, sub, st = 'red', dis = false;
  if (g.inWave) { lab = 'WAVE'; sub = `${g.wi + 1}/${wv}`; st = 'plum'; dis = true; }
  else if (g.wi >= wv) { lab = '\u2014'; dis = true; }
  else { const isBoss = g.map.waves[g.wi].t === 'boss'; const bon = g.timerMax ? earlyBonus(g.map, g.wi, g.timer, g.timerMax) : 0; lab = g.timerMax ? 'CALL' : 'START'; sub = g.timerMax ? (isBoss ? `${Math.ceil(g.timer)}s \u00b7 no bonus` : `${Math.ceil(g.timer)}s \u00b7 +${bon}g`) : `wave ${g.wi + 1}`; }
  B('wave', W - 90, by, 84, bh, { style: st, label: lab, sub, sz: 15, disabled: dis }, () => callWave(true));
  if (!g.inWave && g.wi < wv && !g.offer && !g.stakeOffer) { const keys = Object.keys(TOWERS).filter(k => TOWERS[k].faction === FB());
    const minB = Math.min(...keys.map(buildCost)); const upg = g.towers.filter(t => t.lvl < MAX_LVL && t.lvl + 1 !== BRANCH_LVL).map(t => upCost(t.key, t.lvl)); const minC = Math.min(minB, ...upg);
    if (isFinite(minC) && g.gold >= minC) { const a = 0.75 + 0.25 * Math.sin(tReal * 5); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(16,8,22,0.9)'; const ny = tall ? by - 32 : y - 30; rr(ctx, 80, ny, W - 160, 24, 12); ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      txt(ctx, STR.ui.unspent.replace('{g}', Math.floor(g.gold)), W / 2, ny + 12, 12, GOLD, 'center', 'Nunito', 900, W - 170); } }
  if (!g.inWave && g.timerMax) { const k = g.timer / g.timerMax; ctx.fillStyle = GOLD; ctx.fillRect(W - 86, by + bh - 4, 76 * k, 3); }
  // middle: ring info > chat/tips
  if (tall) { const mx0 = 76, mw0 = W - 76 - 96; ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(ctx, mx0, by, mw0, bh, 10); ctx.fill(); txt(ctx, g.inWave ? `${g.enemies.length + g.spawnQ.length} Hollow left` : `Wave ${Math.min(g.wi + 1, wv)}: ${g.wi < wv ? g.map.waves[g.wi].t : 'done'}`, mx0 + mw0 / 2, by + bh / 2, 12, '#cdb8d6', 'center', 'Nunito', 800, mw0 - 10); }
  const mx = tall ? 10 : 76, mw = tall ? W - 20 : W - 76 - 96; const msgY = tall ? y + 12 : by, msgH = tall ? Math.min(84, by - y - 50) : bh;
  { const by = msgY, bh = msgH;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, mx, by, mw, bh, 10); ctx.fill();
  if (g.ringInfo) { txt(ctx, g.ringInfo[0], mx + 8, by + 14, 13, GOLD, 'left', 'Nunito', 900, mw - 14); wrap(ctx, g.ringInfo[1], mx + 8, by + 29, mw - 14, 13, 12, INK, 'left', 'Nunito', 700, 3); return; }
  const m = g.dockCur; if (!m) { txt(ctx, g.inWave ? 'Hold the line.' : 'Build, upgrade, then call the wave.', mx + mw / 2, by + bh / 2, 12, '#b9a8c4', 'center', 'Nunito', 700, mw - 10); return; }
  const a = Math.min(1, m.t * 4); ctx.save(); ctx.globalAlpha = a; const ps = Math.min(40, bh - 14);
  if (!(m.spr && drawHead(ctx, m.spr, mx + 6, by + (bh - ps) / 2, ps))) { ctx.fillStyle = m.kind === 'tip' ? '#2EC4B6' : '#6b0f1a'; ctx.beginPath(); ctx.arc(mx + 6 + ps / 2, by + bh / 2, ps / 2, 0, 7); ctx.fill(); txt(ctx, m.who[0], mx + 6 + ps / 2, by + bh / 2 + 1, 16, '#fff', 'center', 'Cinzel', 900); }
  const tx = mx + ps + 12, tw = mw - ps - 16; txt(ctx, m.who, tx, by + 12, 12, m.kind === 'reply' ? g.fac.accent : m.kind === 'tip' ? '#8ff0e0' : '#ff8aa0', 'left', 'Nunito', 900, tw);
  wrap(ctx, m.txt, tx, by + 28, tw, 14, 12, INK, 'left', 'Nunito', 700, 3); ctx.restore(); }
}

// ---------------- Modals ----------------
function modalBg(a = 0.72) { ui.hits = []; ctx.fillStyle = `rgba(8,4,12,${a})`; ctx.fillRect(0, 0, W, H); }
function drawOffer() {
  modalBg(); const o = g.offer, y0 = OY() + 90; txt(ctx, `${g.fac.hero.name} grows stronger`, W / 2, y0, 18, GOLD, 'center', 'Cinzel', 900); txt(ctx, 'Pick one skill for this run', W / 2, y0 + 24, 12, INK, 'center');
  o.opts.forEach((s, i) => { const y = y0 + 48 + i * 92, on = o.sel === i; B('pick' + i, 24, y, W - 48, 82, { style: on ? 'gold' : 'plum', selected: on, r: 14 }, () => { o.sel = i; });
    txt(ctx, s.name, 40, y + 22, 15, on ? '#2a1606' : [INK, '#8fd8ff', '#ff8aa0'][['c', 'r', 'e'].indexOf(s.w)], 'left', 'Cinzel', 900, W - 100); wrap(ctx, s.desc, 40, y + 46, W - 90, 15, 13, on ? '#2a1606' : INK, 'left', 'Nunito', 700, 2); txt(ctx, { c: 'common', r: 'rare', e: 'epic' }[s.w], W - 40, y + 22, 12, on ? '#2a1606' : '#b9a8c4', 'right'); });
  const yb = y0 + 48 + 3 * 92 + 10; B('pickOk', 40, yb, W - 80, 52, { style: o.sel != null ? 'green' : 'plum', label: o.sel != null ? `TAKE ${o.opts[o.sel].name.toUpperCase()}` : 'SELECT A SKILL', sz: 14, disabled: o.sel == null }, () => pickSkill(o.opts[o.sel]));
}
function drawStake() {
  modalBg(); const S = g.stakeOffer, y0 = OY() + 70; drawSprite(ctx, 'e_herald1', W / 2, y0 + 96, 96);
  txt(ctx, 'THE HERALD OFFERS A WAGER', W / 2, y0 + 112, 15, GOLD, 'center', 'Cinzel', 900); txt(ctx, `Bank ${Math.floor(g.gold)}g \u00b7 paid now, won back on a no-leak wave`, W / 2, y0 + 134, 12, INK, 'center', 'Nunito', 700, W - 30);
  STAKES.forEach((s, i) => { const q = stakeQuote(i), y = y0 + 150 + i * 74, on = S.sel === i; B('stk' + i, 20, y, W - 40, 66, { style: on ? 'gold' : 'plum', selected: on, r: 12, disabled: !q.can }, () => { S.sel = i; });
    txt(ctx, `${s.name} \u2014 ${Math.round(s.pct * 100)}% (${q.amt}g)`, 34, y + 16, 14, on ? '#2a1606' : GOLD, 'left', 'Cinzel', 900, W - 70);
    txt(ctx, `WIN: +${q.net}g profit (${q.ret}g back)`, 34, y + 36, 12, on ? '#0c3a1c' : GOOD, 'left', 'Nunito', 900); txt(ctx, `LOSE: \u2212${q.amt}g if any Hollow leaks`, 34, y + 53, 12, on ? '#7a0010' : '#ff5a6a', 'left', 'Nunito', 900); });
  const yb = y0 + 150 + 3 * 74 + 4; B('stkOk', 20, yb, (W - 50) * 0.6, 50, { style: S.sel != null ? 'red' : 'plum', label: S.sel != null ? `STAKE ${stakeQuote(S.sel).amt}g` : 'PICK A STAKE', sz: 14, disabled: S.sel == null }, () => placeStake(S.sel));
  B('stkSkip', 30 + (W - 50) * 0.6, yb, (W - 50) * 0.4, 50, { style: 'plum', label: 'NO BET', sz: 13 }, () => placeStake(-1));
}
function drawCinema() {
  modalBg(0.8); const c = g.cinema, y0 = OY() + 60; c.t += 1 / 60;
  const k = Math.min(1, c.t * 1.6); ctx.save(); ctx.globalAlpha = k; drawSprite(ctx, 'e_herald1', W / 2, y0 + 290, 280 * (0.9 + 0.1 * k)); ctx.restore();
  txt(ctx, 'THE HERALD OF KASIRI', W / 2, y0 + 20, 20, '#ff6a8a', 'center', 'Cinzel Decorative', 900, W - 20);
  panel(ctx, 16, y0 + 300, W - 32, 128); txt(ctx, 'Herald of Kasiri', 30, y0 + 318, 12, '#ff8aa0', 'left', 'Nunito', 900); wrap(ctx, STR.herald.intro, 30, y0 + 338, W - 64, 15, 13, INK, 'left', 'Nunito', 700, 2);
  if (c.t > 0.8) { txt(ctx, g.fac.hero.name, 30, y0 + 378, 12, g.fac.accent, 'left', 'Nunito', 900); wrap(ctx, STR.herald.reply[FB()], 30, y0 + 398, W - 64, 15, 13, INK, 'left', 'Nunito', 700, 2); }
  if (c.t > 1.2) B('fight', 60, y0 + 444, W - 120, 52, { style: 'red', label: 'FIGHT', sz: 18 }, () => { g.cinema = null; g.bossT0 = g.t; });
}
function drawPause() {
  modalBg(0.78); const y0 = OY() + 110; panel(ctx, 30, y0, W - 60, opt.big ? 382 : 362); txt(ctx, 'PAUSED', W / 2, y0 + 30, 22, GOLD, 'center', 'Cinzel Decorative', 900);
  txt(ctx, `${g.map.name} \u00b7 wave ${g.wi + (g.inWave ? 1 : 0)}/${g.map.waves.length} \u00b7 ${g.lives} lives`, W / 2, y0 + 56, 12, INK, 'center', 'Nunito', 700, W - 80);
  const cq = g.confirmQuit;
  if (cq) { wrap(ctx, cq === 'restart' ? 'Restart this mission? Progress in this run is lost.' : 'Quit to menu? You can resume from the last wave.', W / 2, y0 + 100, W - 100, 16, 13, INK, 'center', 'Nunito', 700, 3);
    B('cqYes', 50, y0 + 160, W - 100, 52, { style: 'red', label: cq === 'restart' ? 'YES, RESTART' : 'YES, QUIT', sz: 15 }, () => { const mk = g.mk; tel(cq); g.paused = false; g.confirmQuit = null; if (cq === 'restart') { clearRun(); newMission(mk); } else { snapshot(); scene = 'title'; } });
    B('cqNo', 50, y0 + 222, W - 100, 48, { style: 'plum', label: 'CANCEL', sz: 14 }, () => { g.confirmQuit = null; }); return; }
  B('resume', 50, y0 + 72, W - 100, 52, { style: 'green', label: 'RESUME', sz: 17 }, resumeGame);
  const hw = (W - 110) / 2; B('restart', 50, y0 + 132, hw, 44, { style: 'plum', label: 'RESTART', sz: 13 }, () => { g.confirmQuit = 'restart'; });
  B('quit', 60 + hw, y0 + 132, hw, 44, { style: 'plum', label: 'QUIT', sz: 13 }, () => { g.confirmQuit = 'quit'; });
  txt(ctx, STR.ui.settings, W / 2, y0 + 196, 13, GOLD, 'center', 'Cinzel', 900);
  const U = STR.ui, on = (v) => v ? 'ON' : 'OFF';
  B('sound', 50, y0 + 212, hw, 44, { style: Sfx.muted ? 'plum' : 'gold', label: on(!Sfx.muted), sub: U.sound, sz: 13 }, () => Sfx.toggle());
  B('haptics', 60 + hw, y0 + 212, hw, 44, { style: opt.haptics ? 'gold' : 'plum', label: on(opt.haptics), sub: U.haptics, sz: 13 }, () => setOpt('haptics', !opt.haptics));
  B('motion', 50, y0 + 264, hw, 44, { style: opt.reduced ? 'gold' : 'plum', label: on(opt.reduced), sub: U.motion, sz: 13 }, () => setOpt('reduced', !opt.reduced));
  B('textsz', 60 + hw, y0 + 264, hw, 44, { style: opt.big ? 'gold' : 'plum', label: opt.big ? 'LARGE' : 'NORMAL', sub: U.textSize, sz: 13 }, () => setOpt('big', !opt.big));
  wrap(ctx, U.reloadNote, W / 2, y0 + 326, W - 84, opt.big ? 17 : 15, 12, '#b9a8c4', 'center', 'Nunito', 700, 2);
}
function drawHeraldExit(MY) { // Thandi: cape sweep -> Ember sparks + red smoke -> crown glint (reduced motion: glint only)
  const f = g.exitFx, k = tReal - f.t0, x = f.x, y = f.y + MY; if (k > 2.6) return; ctx.save();
  if (!opt.reduced && k < 0.8) { const a = k / 0.8; ctx.globalAlpha = 1 - a * 0.6; ctx.fillStyle = '#7a0f22'; ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.arc(x, y - 6, 26 * (1 - a * 0.7), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a); ctx.closePath(); ctx.fill(); }
  if (!opt.reduced && k > 0.5 && k < 2.0) { const a = (k - 0.5) / 1.5;
    for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.45 * (1 - a); ctx.fillStyle = '#8a1e2a'; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.1) * 18 * a, y - 10 - 40 * a - i * 6, 10 + 22 * a, 0, 7); ctx.fill(); }
    for (let i = 0; i < 16; i++) { const an = i * 0.39 + 0.3, r = 10 + 60 * a * (0.6 + (i % 3) * 0.2); ctx.globalAlpha = 1 - a; ctx.fillStyle = i % 2 ? '#ffb347' : '#8fd8ff'; ctx.fillRect(x + Math.cos(an) * r, y - 12 + Math.sin(an) * r - 30 * a, 3, 3); } }
  if (k > 1.6) { const a = Math.min(1, (k - 1.6) / 0.4), b = Math.max(0, 1 - (k - 2.0) / 0.6); ctx.globalAlpha = a * b; ctx.translate(x, y - 40); ctx.fillStyle = GOLD; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? 3 : 14; ctx.lineTo(Math.cos(i * Math.PI / 4) * r, Math.sin(i * Math.PI / 4) * r); } ctx.closePath(); ctx.fill(); }
  ctx.restore(); }
function drawGame() {
  const MY = MAPY(); ctx.fillStyle = '#140a1a'; ctx.fillRect(0, 0, W, H);
  drawWorld(MY); drawHUD(MY); drawDock();
  if (g.banner) { const b = g.banner; ctx.save(); ctx.globalAlpha = Math.min(1, b.t * 2); ctx.fillStyle = 'rgba(16,8,22,0.85)'; rr(ctx, 20, MY + 40, W - 40, 40, 12); ctx.fill(); txt(ctx, b.s, W / 2, MY + 61, 17, GOLD, 'center', 'Cinzel', 900, W - 60); ctx.restore(); }
  if (g.toast) { ctx.fillStyle = 'rgba(16,8,22,0.9)'; rr(ctx, 30, MY + MAP_H - 70, W - 60, 30, 15); ctx.fill(); txt(ctx, g.toast.s, W / 2, MY + MAP_H - 54, 13, INK, 'center', 'Nunito', 800, W - 70); }
  if (g.stamp) { const s = g.stamp, k = Math.min(1, (2.6 - s.t) * 5); ctx.save(); ctx.translate(W / 2, MY + 200); ctx.rotate(-0.18); ctx.scale(2 - k, 2 - k); ctx.globalAlpha = Math.min(1, s.t);
    ctx.strokeStyle = s.won ? GOOD : RED; ctx.lineWidth = 4; rr(ctx, -120, -30, 240, 60, 8); ctx.stroke(); txt(ctx, s.won ? 'STAKE WON' : 'STAKE LOST', 0, -8, 22, s.won ? GOOD : RED, 'center', 'Cinzel', 900); txt(ctx, s.s, 0, 16, 14, s.won ? GOOD : '#ff5a6a', 'center', 'Nunito', 900); ctx.restore(); }
  if (g.stake) { ctx.fillStyle = 'rgba(107,15,26,0.9)'; rr(ctx, 8, MY + 6, 150, 34, 8); ctx.fill(); txt(ctx, `Stake ${g.stake.amt}g \u2192 ${g.stake.ret}g`, 14, MY + 15, 12, GOLD, 'left', 'Nunito', 900); txt(ctx, `LOSE on any leak (${g.waveLeaks})`, 14, MY + 31, 12, '#ff5a6a', 'left', 'Nunito', 900); }
  if (g.resumeT > 0 && !g.paused) { ctx.fillStyle = 'rgba(8,4,12,0.45)'; ctx.fillRect(0, MY, W, MAP_H); txt(ctx, Math.ceil(g.resumeT / 0.4) + '', W / 2, MY + MAP_H / 2, 48, GOLD, 'center', 'Cinzel Decorative', 900); }
  if (g.cinema) drawCinema(); else if (g.paused) drawPause(); else if (g.stakeOffer) drawStake(); else if (g.offer) drawOffer();
  if (g.exitFx) drawHeraldExit(MY);
  const exitHold = g.exitFx && tReal - g.exitFx.t0 < 2.4;
  if (g.over && g.endT != null && !exitHold) { g.endT -= 1 / 60; ctx.fillStyle = 'rgba(8,4,12,0.5)'; ctx.fillRect(0, 0, W, H); txt(ctx, result.win ? 'VICTORY' : 'DEFEAT', W / 2, H / 2, 40, result.win ? GOLD : RED, 'center', 'Cinzel Decorative', 900); ui.hits = []; if (g.endT <= 0) { g.endT = null; scene = 'result'; } }
}

// ---------------- Scenes ----------------
function bgArt(dim = 0.55, splash, sx) { const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a1636'); gr.addColorStop(1, '#0c0610'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  if (splash) { ctx.save(); ctx.globalAlpha = 1 - dim * 0.6; drawSprite(ctx, splash, sx || W / 2, H - 40, 300); ctx.restore(); }
  const v = ctx.createLinearGradient(0, 0, 0, H); v.addColorStop(0, `rgba(12,6,16,${dim * 0.5})`); v.addColorStop(1, `rgba(12,6,16,${Math.min(1, dim + 0.2)})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
function logo(y) { txt(ctx, 'WARDEN', W / 2, y + 26, 40, GOLD, 'center', 'Cinzel Decorative', 900); txt(ctx, 'WARS', W / 2, y + 70, 40, '#ff6a8a', 'center', 'Cinzel Decorative', 900); return y + 100; }
function scr(fn) { ctx.save(); ctx.translate(0, OY()); ui.oy = OY(); fn(); ctx.restore(); ui.oy = 0; }
const curHero = () => P.faction ? `hs_${heroKey(P.faction)}${P.heroes[heroKey(P.faction)].evo >= 2 ? 3 : 0}` : 'hs_thandeka0';
function drawTitle() {
  bgArt(0.4, curHero(), W * 0.74); const BX = 16, BW = Math.round(W * 0.52); const run = P.faction ? getRun() : null;
  scr(() => { const ly = logo(50); txt(ctx, STR.subtitle, W / 2, ly + 6, 14, INK, 'center', 'Cinzel', 700);
    if (P.migrated) txt(ctx, 'Your earlier save was carried over', W / 2, ly + 28, 12, GOOD, 'center');
    let y = 330;
    if (run) { B('resume', BX, y, BW, 56, { style: 'green', label: 'RESUME', sub: `${MAPS[run.mk].name} \u00b7 wave ${run.wi + 1}/${MAPS[run.mk].waves.length}`, sz: 18 }, () => newMission(run.mk, run)); y += 64; }
    B('play', BX, y, BW, 56, { style: 'red', label: P.faction ? 'PLAY' : 'BEGIN', sz: 18 }, () => { scene = P.faction ? 'maps' : 'faction'; }); y += 66;
    if (P.faction) { const hw = (BW - 8) / 2; B('hero', BX, y, hw, 46, { style: 'gold', label: 'HERO', sz: 14 }, () => { scene = 'levelup'; }); B('arm', BX + 8 + hw, y, hw, 46, { style: 'gold', label: 'ARMOURY', sz: 14 }, () => { scene = 'armoury'; });
      y += 54; B('fac', BX, y, BW, 44, { style: 'plum', label: 'Change faction', sz: 13 }, () => { scene = 'faction'; }); y += 50; }
    B('mute', W - 64, 10, 54, 36, { style: 'plum', label: Sfx.muted ? '\u266A off' : '\u266A on', sz: 12 }, () => Sfx.toggle());
    txt(ctx, `Clears ${P.clears} \u00b7 Shards ${P.shards} \u00b7 \u2605 ${(P.stars.glacier || 0) + (P.stars.foundry || 0)}/6`, W / 2, 620, 12, '#b9a8c4', 'center', 'Nunito', 700); });
}
function drawFaction() { // iter3b: five compact faction cards (fits 360x640)
  bgArt(0.75); scr(() => { txt(ctx, 'Choose your Wardens', W / 2, 26, 18, GOLD, 'center', 'Cinzel Decorative', 900);
    FACTIONS.forEach((f, i) => { const y = 42 + i * 104, on = ui.facSel === f.key, S = STR.factions[f.key], dc = on ? '#2a1606' : INK;
      B('f_' + f.key, 10, y, W - 20, 98, { style: on ? 'gold' : 'plum', selected: on, r: 14 }, () => { ui.facSel = f.key; });
      ctx.fillStyle = f.accent; ctx.fillRect(12, y + 8, 4, 82);
      drawHead(ctx, `h_${f.hero.key}1`, 22, y + 8, 58); drawEmblem(ctx, f.key, 51, y + 82, 10);
      txt(ctx, S.name, 86, y + 17, 14, on ? '#2a1606' : f.accent, 'left', 'Cinzel', 900, 180); txt(ctx, f.era, W - 18, y + 17, 9, on ? '#2a1606' : '#cdb8d6', 'right', 'Nunito', 800, 90);
      txt(ctx, `${f.hero.name} \u00b7 ${f.hero.ability}`, 86, y + 34, 11, on ? '#2a1606' : GOLD, 'left', 'Nunito', 800, W - 104);
      wrap(ctx, f.lore, 86, y + 50, W - 104, 13, 10.5, dc, 'left', 'Nunito', 700, 2);
      txt(ctx, S.tradeoff, 86, y + 86, 10.5, on ? '#7a0010' : BAD, 'left', 'Nunito', 800, W - 104); });
    const s = ui.facSel; B('facOk', 40, 566, W - 80, 48, { style: s ? 'red' : 'plum', label: s ? `JOIN ${STR.factions[s].name.toUpperCase()}` : 'SELECT A FACTION', sz: 13, disabled: !s }, () => { P.faction = s; save(); clearRun(); scene = 'maps'; }); });
}
let mapSel = 'glacier';
function drawMaps() {
  bgArt(0.8); scr(() => { txt(ctx, 'ACT I \u00b7 The Thinning Rim', W / 2, 34, 17, GOLD, 'center', 'Cinzel', 900);
    MAP_ORDER.forEach((mk, i) => { const m = MAPS[mk], y = 64 + i * 200, on = mapSel === mk, st = P.stars[mk] || 0;
      B('map_' + mk, 16, y, W - 32, 186, { style: on ? 'gold' : 'plum', selected: on, r: 16 }, () => { mapSel = mk; });
      const dc = on ? '#2a1606' : INK; txt(ctx, m.name, 34, y + 26, 18, on ? '#2a1606' : GOLD, 'left', 'Cinzel', 900); txt(ctx, '\u2605'.repeat(st) + '\u2606'.repeat(3 - st), W - 34, y + 26, 18, on ? '#2a1606' : GOLD, 'right');
      wrap(ctx, m.blurb, 34, y + 54, W - 68, 16, 13, dc, 'left', 'Nunito', 700, 4);
      txt(ctx, `${m.waves.length} waves \u00b7 stakes before ${m.stakes.map(x => x + 1).join(', ')} \u00b7 boss`, 34, y + 150, 12, on ? '#2a1606' : '#cdb8d6', 'left', 'Nunito', 800, W - 68); });
    B('mapGo', 40, 480, W - 80, 54, { style: 'red', label: 'BRIEFING', sz: 16 }, () => { scene = 'brief'; }); B('mapBack', 40, 544, W - 80, 44, { style: 'plum', label: 'BACK', sz: 13 }, () => { scene = 'title'; }); });
}
function drawBrief() {
  bgArt(0.8); const f = FACTIONS.find(x => x.key === P.faction), m = MAPS[mapSel], b = STR.brief[mapSel];
  scr(() => { txt(ctx, m.name, W / 2, 40, 20, GOLD, 'center', 'Cinzel Decorative', 900);
    panel(ctx, 14, 66, W - 28, 120); ctx.fillStyle = '#2EC4B6'; ctx.beginPath(); ctx.arc(54, 106, 28, 0, 7); ctx.fill(); txt(ctx, 'M', 54, 107, 24, '#062a26', 'center', 'Cinzel', 900);
    txt(ctx, 'Elder Mosa', 96, 86, 13, GOLD, 'left', 'Cinzel', 900); wrap(ctx, b.mosa, 96, 108, W - 124, 15, 12, INK, 'left', 'Nunito', 700, 5);
    panel(ctx, 14, 196, W - 28, 100); drawHead(ctx, `h_${f.hero.key}${Math.min(3, P.heroes[f.hero.key].evo + 1)}`, 26, 214, 56); txt(ctx, f.hero.name, 96, 216, 13, f.accent, 'left', 'Cinzel', 900); wrap(ctx, b[FB()], 96, 238, W - 124, 15, 12, INK, 'left', 'Nunito', 700, 3);
    wrap(ctx, m.howto, W / 2, 330, W - 44, 17, 13, '#cdb8d6', 'center', 'Nunito', 700, 6);
    B('go', 50, 470, W - 100, 58, { style: 'red', label: 'DEFEND THE VEIL', sz: 17 }, () => { clearRun(); newMission(mapSel); }); B('back', 50, 540, W - 100, 44, { style: 'plum', label: 'BACK', sz: 13 }, () => { scene = 'maps'; }); });
}
let introI = 0;
function drawIntro() { // Thandi: 3-card skippable cold open (first launch only)
  ctx.fillStyle = '#0b0610'; ctx.fillRect(0, 0, W, H); const cards = STR.coldOpen, i = Math.min(introI, cards.length - 1);
  const done = () => { P.seenOpen = 1; save(); scene = 'title'; };
  ctx.save(); ctx.globalAlpha = 0.25 + 0.1 * Math.sin(tReal * 2); ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.arc(W / 2, H * 0.3, 6 + i * 4, 0, 7); ctx.fill(); ctx.restore();
  drawSprite(ctx, 'star', W / 2, H * 0.3, 24);
  wrap(ctx, cards[i], W / 2, H * 0.45, W - 60, 24, 18, '#f4e3b0', 'center', 'Cinzel', 700, 5);
  for (let k = 0; k < cards.length; k++) { ctx.fillStyle = k === i ? GOLD : '#5a4a66'; ctx.beginPath(); ctx.arc(W / 2 + (k - 1) * 16, H * 0.68, 4, 0, 7); ctx.fill(); }
  B('introNext', 60, H * 0.74, W - 120, 52, { style: 'gold', label: i < cards.length - 1 ? STR.ui.next : STR.ui.begin, sz: 15 }, () => { if (introI < cards.length - 1) introI++; else done(); });
  B('introSkip', W - 96, 12, 84, 44, { style: 'plum', label: STR.ui.skip, sz: 13 }, done);
}
function drawResult() {
  const r = result; bgArt(0.85); scr(() => {
    txt(ctx, r.win ? 'VICTORY' : 'DEFEAT', W / 2, 40, 30, r.win ? GOLD : RED, 'center', 'Cinzel Decorative', 900);
    for (let i = 0; i < 3; i++) txt(ctx, i < r.stars ? '\u2605' : '\u2606', W / 2 + (i - 1) * 34, 78, 30, i < r.stars ? GOLD : '#6e6475', 'center');
    wrap(ctx, r.reason, W / 2, 106, W - 40, 16, 13, INK, 'center', 'Nunito', 800, 3); wrap(ctx, r.starWhy, W / 2, 144, W - 40, 15, 12, r.win ? '#cdb8d6' : '#ffb070', 'center', 'Nunito', 700, 2);
    panel(ctx, 16, 174, W - 32, 72); wrap(ctx, r.story, W / 2, 190, W - 56, 14, 12, '#f4e3b0', 'center', 'Nunito', 700, 4);
    const sl = r.stakeLog || []; const sNet = sl.reduce((a, x) => a + x.net, 0); const rows = [['Waves cleared', `${r.cleared}/${MAPS[r.mk].waves.length}`], ['Stakes', sl.length ? `${sl.filter(x => x.won).length} won / ${sl.filter(x => !x.won).length} lost \u00b7 ${sNet >= 0 ? '+' : '\u2212'}${Math.abs(sNet)}g` : 'none placed'], ['Lives kept', `${r.lives}/${r.maxLives}`], ['Hero XP', '+' + r.xp], ['Shards', `+${r.shards} (stars ${r.starShards}, champions ${r.miniShards}, boss ${r.bossShards})`], ['Hero level', r.from === r.to ? `Lv ${r.to}` : `Lv ${r.from} \u2192 ${r.to}`], ['Gold left', `${r.goldEnd}g`]];
    rows.forEach(([a, b], i) => { txt(ctx, a, 26, 258 + i * 17, 12, INK, 'left'); txt(ctx, String(b), W - 26, 258 + i * 17, 12, i === 5 && r.from !== r.to ? GOOD : GOLD, 'right', 'Nunito', 800, 220); });
    txt(ctx, r.drops.length ? 'DROPS: ' + r.drops.map(d => d.name).join(', ') : 'No drops this time.', W / 2, 380, 12, r.drops.length ? RARITY[r.drops[0].rar].color : '#a99bb3', 'center', 'Nunito', 800, W - 30);
    let y = 400; if (r.cp) { B('fromCp', 40, y, W - 80, 48, { style: 'green', label: 'RETRY FROM CHECKPOINT', sz: 13 }, () => { const cp = getCp(); if (cp) newMission(cp.mk, cp); }); y += 56; }
    B('toHero', 40, y, W - 80, 46, { style: r.from !== r.to || canEvolve(heroKey(P.faction)) ? 'green' : 'gold', label: canEvolve(heroKey(P.faction)) ? 'EVOLVE READY!' : r.from !== r.to ? `LEVEL UP! Lv ${r.to}` : 'HERO & EVOLUTION', sz: 14 }, () => { scene = 'levelup'; }); y += 54;
    const hw = (W - 90) / 2; B('again', 40, y, hw, 46, { style: 'red', label: 'AGAIN', sz: 14 }, () => { clearRun(); newMission(r.mk); }); B('menu', 50 + hw, y, hw, 46, { style: 'plum', label: 'MENU', sz: 14 }, () => { scene = 'title'; }); });
}
function drawLevelup() {
  bgArt(0.85); const hk = heroKey(P.faction), st = P.heroes[hk], ev = EVOS[hk]; scr(() => {
    txt(ctx, FACTIONS.find(f => f.key === P.faction).hero.name, W / 2, 34, 22, GOLD, 'center', 'Cinzel Decorative', 900); txt(ctx, `Lv ${st.lvl}/${HERO_MAX_LVL} \u00b7 ${ev[st.evo].name} \u00b7 ${P.shards} shards`, W / 2, 60, 13, INK, 'center');
    const need = PROFILE_XP(st.lvl); ctx.fillStyle = 'rgba(0,0,0,0.5)'; rr(ctx, 40, 74, W - 80, 10, 5); ctx.fill(); ctx.fillStyle = GOOD; rr(ctx, 40, 74, (W - 80) * Math.min(1, st.xp / need), 10, 5); ctx.fill(); txt(ctx, `${st.xp}/${need} XP`, W / 2, 96, 12, '#cdb8d6', 'center');
    const k = Math.min(1, (now - evoFx) / 900); if (k < 1) { ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(W / 2, 220, 40 + k * 160, 0, 7); ctx.fill(); ctx.restore(); }
    drawSprite(ctx, `hs_${hk}${st.evo >= 2 ? 3 : 0}`, W / 2, 340, 230);
    ev.forEach((e, i) => { const x = 16 + i * 112, y = 350, on = st.evo >= i; ctx.fillStyle = on ? 'rgba(95,208,138,0.16)' : 'rgba(0,0,0,0.55)'; rr(ctx, x, y, 104, 116, 12); ctx.fill(); ctx.strokeStyle = on ? GOOD : 'rgba(242,193,78,0.4)'; ctx.stroke();
      ctx.save(); if (!on) ctx.filter = 'grayscale(1) brightness(0.6)'; drawSprite(ctx, `h_${hk}${i + 1}`, x + 52, y + 80, 64); ctx.restore();
      txt(ctx, e.name, x + 52, y + 92, 12, on ? GOOD : INK, 'center', 'Nunito', 900, 98); txt(ctx, i ? `Lv ${e.lvl} \u00b7 ${e.cost} shards` : 'Start', x + 52, y + 107, 12, '#b9a8c4', 'center', 'Nunito', 700, 98); });
    const nx = ev[st.evo + 1];
    if (nx) { const ok = canEvolve(hk); if (ui.evoSel && ok) { B('evolveOk', 40, 478, W - 80, 56, { style: 'green', label: `CONFIRM: ${nx.cost} SHARDS`, sub: 'permanent', sz: 14 }, () => { evolve(hk); ui.evoSel = false; }); }
      else B('evolve', 40, 478, W - 80, 56, { style: ok ? 'gold' : 'plum', label: `EVOLVE \u2192 ${nx.name}`, sub: `needs Lv ${nx.lvl} & ${nx.cost} shards (you have ${P.shards})`, sz: 13, disabled: !ok }, () => { ui.evoSel = true; }); }
    else txt(ctx, 'Fully evolved', W / 2, 506, 15, GOLD, 'center', 'Cinzel');
    const hw = (W - 90) / 2; B('toArm', 40, 548, hw, 46, { style: 'gold', label: 'ARMOURY', sz: 13 }, () => { ui.evoSel = false; scene = 'armoury'; }); B('lvBack', 50 + hw, 548, hw, 46, { style: 'plum', label: 'MENU', sz: 13 }, () => { ui.evoSel = false; scene = 'title'; }); });
}
function drawArmoury() {
  bgArt(0.9); const hk = heroKey(P.faction), st = P.heroes[hk]; scr(() => {
    txt(ctx, 'ARMOURY', W / 2, 26, 20, GOLD, 'center', 'Cinzel Decorative', 900); drawHero(ctx, heroLook(P), 70, 226, 64 * 2.6 > 170 ? 64 : 64, now / 1000);
    SLOTS.forEach((s, i) => { const x = 140 + (i % 2) * 108, y = 48 + Math.floor(i / 2) * 58, it = st.equip[s.key] ? P.inv.find(v => v.id === st.equip[s.key]) : null;
      B('sl_' + s.key, x, y, 102, 50, { style: armSlot === s.key ? 'gold' : 'plum', r: 12 }, () => { armSlot = s.key; armPage = 0; });
      txt(ctx, s.label, x + 8, y + 14, 12, armSlot === s.key ? '#2a1606' : '#cdb8d6', 'left'); txt(ctx, it ? it.name : '\u2014 empty \u2014', x + 8, y + 34, 12, it ? RARITY[it.rar].color : '#776a80', 'left', 'Nunito', 800, 88); });
    const m = heroMods(hk); txt(ctx, `Level/evo +${m.lvlDmg}% dmg \u00b7 Gear: +${m.dmg - m.lvlDmg}% dmg \u00b7 +${m.range} rng \u00b7 +${m.hp} lives \u00b7 ${m.cd ? '-' + m.cd : 0}% cd`, W / 2, 236, 12, GOOD, 'center', 'Nunito', 700, W - 16);
    const items = P.inv.filter(i => i.slot === armSlot).sort((a, b) => b.rar - a.rar);
    txt(ctx, `${SLOTS.find(s => s.key === armSlot).label} items (${items.length})`, 16, 258, 13, GOLD, 'left', 'Cinzel');
    if (!items.length) wrap(ctx, 'No items yet. Clear missions for drops.', 16, 282, W - 32, 15, 12, '#a99bb3', 'left');
    const PER = 5, pages = Math.max(1, Math.ceil(items.length / PER)); armPage = clamp(armPage, 0, pages - 1);
    if (pages > 1) { B('armPrev', 12, 554, 80, 34, { style: 'plum', label: '\u2039 PREV', sz: 12, r: 10, disabled: armPage === 0 }, () => { armPage--; }); txt(ctx, `${armPage + 1} / ${pages}`, W / 2, 571, 12, '#cdb8d6', 'center'); B('armNext', W - 92, 554, 80, 34, { style: 'plum', label: 'NEXT \u203A', sz: 12, r: 10, disabled: armPage >= pages - 1 }, () => { armPage++; }); }
    items.slice(armPage * PER, armPage * PER + PER).forEach((it, i) => { const y = 272 + i * 56, on = st.equip[it.slot] === it.id; B('it' + it.id, 12, y, W - 24, 50, { style: on ? 'green' : ui.armSel === it.id ? 'gold' : 'plum', selected: ui.armSel === it.id, r: 12 }, () => { ui.armSel = it.id; });
      txt(ctx, it.name + (on ? '  (equipped)' : ''), 24, y + 14, 13, on ? '#0c2a18' : RARITY[it.rar].color, 'left', 'Nunito', 900, W - 52); txt(ctx, statTxt(it) + (it.aff.length ? ' \u00b7 ' + it.aff.map(affText).join(' \u00b7 ') : ''), 24, y + 34, 12, on ? '#0c2a18' : '#cdb8d6', 'left', 'Nunito', 700, W - 52); });
    const sel = ui.armSel != null && items.find(i => i.id === ui.armSel);
    if (sel) { const was = st.equip[sel.slot]; const m0 = heroMods(hk); if (was === sel.id) delete st.equip[sel.slot]; else st.equip[sel.slot] = sel.id; const m1 = heroMods(hk); if (was) st.equip[sel.slot] = was; else delete st.equip[sel.slot];
      const d = (k, u = '') => { const v = Math.round((m1[k] - m0[k]) * 10) / 10; return v ? `${v > 0 ? '+' : '\u2212'}${Math.abs(v)}${u} ${k === 'cd' ? 'cd' : k === 'hp' ? 'lives' : k === 'range' ? 'rng' : k}` : null; };
      const parts = [d('dmg', '%'), d('range'), d('hp'), d('cd', '%')].filter(Boolean);
      txt(ctx, '\u0394 ' + (parts.length ? parts.join(' \u00b7 ') : 'no change'), W / 2, 252, 12, '#ffd27a', 'center', 'Nunito', 900, W - 20);
      B('armEquip', W - 132, 594, 120, 40, { style: 'green', label: was === sel.id ? 'UNEQUIP' : 'EQUIP', sz: 13 }, () => { equip(sel); ui.armSel = null; }); }
    B('armBack', 40, 594, sel ? W - 192 : W - 80, 40, { style: 'plum', label: 'BACK', sz: 13 }, () => { scene = 'levelup'; }); });
}

// ---------------- Loop, resize, boot ----------------
let last = 0, DPR = 1, curTier = 0;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  H = Math.round(clamp(W * vh / vw, 640, 800));
  SCALE = Math.min(vw / W, vh / H); DPR = Math.min(4, window.devicePixelRatio || 1);
  const cw = Math.round(W * SCALE * DPR); cv.width = cw; cv.height = Math.round(H * cw / W); // canvas = CSS size x DPR, uniform scale
  cv.style.width = (cw / DPR) + 'px'; cv.style.height = (cv.height / DPR) + 'px';
  KPX = cw / W; const tier = tierFor(KPX);
  const rebuild = () => { if (g && g.map) buildMap(g.map); };
  if (tier !== curTier) { curTier = tier; loadArt(rebuild); } else rebuild();
}
function frame(ts) {
  const dtR = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; now = ts; tReal += dtR;
  ctx.setTransform(KPX, 0, 0, KPX, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const sig = modalSig(); if (sig !== ui.sig) sigChanged(sig);
  ui.hits = [];
  try {
    if (!artReady) { ctx.fillStyle = '#120a18'; ctx.fillRect(0, 0, W, H); txt(ctx, 'WARDEN WARS', W / 2, H / 2, 26, GOLD, 'center', 'Cinzel Decorative', 900); txt(ctx, 'Loading\u2026', W / 2, H / 2 + 34, 13, INK, 'center'); }
    else if (scene === 'game') { tick(dtR); drawGame(); }
    else ({ title: drawTitle, faction: drawFaction, maps: drawMaps, brief: drawBrief, intro: drawIntro, result: drawResult, levelup: drawLevelup, armoury: drawArmoury }[scene] || drawTitle)();
  } catch (err) { console.error(err); }
  const s2 = modalSig(); if (s2 !== ui.sig) sigChanged(s2);
  ui.stale = false; ui.frames = (ui.frames || 0) + 1;
  requestAnimationFrame(frame);
}
function tick(dtR) {
  if (!g) return;
  if (g.resumeT > 0 && !g.paused) g.resumeT = Math.max(0, g.resumeT - dtR);
  if (g.speedPref && g.speed !== g.speedPref && !g.offer && !g.stakeOffer && !g.cinema) g.speed = g.speedPref; // Sipho: speed survives popups
  if (g.hitStop > 0) g.hitStop = Math.max(0, g.hitStop - dtR); else for (let i = 0; i < g.speed; i++) update(dtR);
  if (!g.inWave && !g.over && g.pickQ > 0 && !g.offer && !g.stakeOffer && !g.paused) { const o = rollSkills(); if (o.length) { g.offer = { opts: o, sel: null }; if (g.ring) closeRing(); } else g.pickQ = 0; }
  if (!g.paused) { updateDock(dtR); if (g.shake > 0) g.shake = Math.max(0, g.shake - dtR * 18); }
  ['toast', 'banner', 'stamp'].forEach(k => { if (g[k]) { g[k].t -= dtR; if (g[k].t <= 0) g[k] = null; } });
}
P = loadProfile(); if (P.migrated) save(); if (!P.seenOpen && !/test=1/.test(location.search)) scene = 'intro';
if (!P.inv.length) { P.inv.push(genItem(0, 'weapon', P.faction || 'stone'), genItem(1, 'helm', P.faction || 'stone'), genItem(0, 'mantle', P.faction || 'stone')); save(); }
window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();
if (document.fonts && document.fonts.load) ['Cinzel Decorative', 'Cinzel', 'Nunito'].forEach(f => document.fonts.load(`800 16px "${f}"`).catch(() => {}));
requestAnimationFrame(frame);
// test hooks: only with ?test=1
if (TEST) {
  window.WW = window.VON = {
    get scene() { return scene; }, set scene(s) { scene = s; }, get g() { return g; }, get P() { return P; }, get ui() { return ui; }, get result() { return result; },
    start(fac = 'stone', mk = 'glacier') { P.faction = fac; save(); clearRun(); newMission(mk); }, build, upgrade, sell, callWave, cycleSpeed, pickSkill, placeStake, stakeQuote, useAbility, endMission, snapshot, getRun, getCp, evolve, equip, genItem, triggerCornice, rollSkills, TGT, TGT_CMP, targets, cycleTgt, pauseGame, resumeGame,
    tick(n, dt = 1 / 30) { const sp = g ? g.speed : 1; if (g) g.speed = 1; for (let i = 0; i < n && g && !g.over; i++) tick(dt); if (g) g.speed = sp; }, effStats, towerStats, telSummary, setSeed(s) { let x = s >>> 0 || 1; rnd = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); },
    buildCost, upCost, hits: () => ui.hits.map(h => ({ id: h.id, x: h.hx, y: h.hy, w: h.hw, h: h.hh, vx: h.x, vy: h.y + h.oy, vw: h.w, vh: h.h, hidden: !!h.hidden })), H: () => H, KPX: () => KPX, ART_STATS, MAPS, sig: modalSig,
  };
}
})();
