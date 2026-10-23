// WARDEN WARS — game (iteration 2). Vanilla canvas, logical width 360 (height 640+ on tall phones).
'use strict';
(() => {
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let SCALE = 1, scene = 'title', g = null, P = null, now = 0, tReal = 0;
const PKEY = 'ww_profile_v2', RKEY = 'ww_run_v2';
const SEGS = []; let PATH_LEN = 0;
for (let i = 0; i < PATH.length - 1; i++) { const a = PATH[i], b = PATH[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y); SEGS.push({ a, b, l, s: PATH_LEN }); PATH_LEN += l; }
const FLY_A = PATH[0], FLY_B = PATH[PATH.length - 1], FLY_LEN = Math.hypot(FLY_B.x - FLY_A.x, FLY_B.y - FLY_A.y);
const pathTiles = new Set(); PATH_TILES.forEach(([c, r], i) => { const n = PATH_TILES[i + 1]; if (!n) { pathTiles.add(c + ',' + r); return; } for (let x = Math.min(c, n[0]); x <= Math.max(c, n[0]); x++) for (let y = Math.min(r, n[1]); y <= Math.max(r, n[1]); y++) pathTiles.add(x + ',' + y); });
const posAt = (d) => { d = Math.max(0, Math.min(PATH_LEN, d)); for (const s of SEGS) if (d <= s.s + s.l) { const t = (d - s.s) / s.l; return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, dx: s.b.x - s.a.x }; } return { x: FLY_B.x, y: FLY_B.y, dx: 0 }; };
const rnd = Math.random, pick = (a) => a[(rnd() * a.length) | 0], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const OY = () => Math.round((H - 640) / 2); // vertical offset to centre 640-tall menu layouts
const MAPY = () => Math.min(62, Math.max(0, H - 640)); // map offset in the game scene

// ---------------- Profile ----------------
function newHero() { return { lvl: 1, xp: 0, evo: 0, equip: {} }; }
function freshProfile() { return { v: 2, faction: null, heroes: { thandeka: newHero(), jabari: newHero() }, inv: [], nextId: 1, shards: 0, clears: 0, plays: 0, best: 0, memories: 3, tutDone: false }; }
function loadProfile() {
  try { const s = localStorage.getItem(PKEY); if (s) { const p = JSON.parse(s); if (p && p.v === 2) return Object.assign(freshProfile(), p); } } catch (e) {}
  const p = freshProfile();
  try { const o = JSON.parse(localStorage.getItem('von_profile_v1') || 'null'); // migrate iteration-1 save (old key kept)
    if (o) { p.migrated = true; p.clears = o.clears || o.wins || 0; p.best = o.best || 0; p.plays = o.plays || 0; p.tutDone = true;
      if (o.faction === 'stone' || o.faction === 'forge') p.faction = o.faction; p.shards = (o.clears || 0); p._oldGear = Object.keys(o.gear || o.inventory || {}).length; } } catch (e) {}
  return p;
}
function save() { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {} }
function heroKey(f) { return f === 'forge' ? 'jabari' : 'thandeka'; }
function genItem(rar, slotKey, fac) {
  const slot = slotKey ? SLOTS.find(s => s.key === slotKey) : pick(SLOTS); fac = fac || (P && P.faction) || 'stone';
  const r = RARITY[rar]; const nAff = [0, 1, 1, 2, 2, 3][rar];
  const it = { id: (P ? P.nextId++ : 0), slot: slot.key, rar, name: `${r.name} ${pick(slot.names)}`, stat: slot.stat, val: Math.round(slot.base * (1 + rar * 0.6)), aff: [] };
  const pool = AFFIXES.slice();
  for (let i = 0; i < nAff; i++) { const a = pool.splice((rnd() * pool.length) | 0, 1)[0]; const v = Math.round(a.v[0] + (a.v[1] - a.v[0]) * (rar / 5));
    const af = { k: a.key, v }; if (a.key === 'towerBoost') af.t = pick(FACTIONS.find(f => f.key === fac).towers); if (a.key === 'skillBoost') af.t = pick(SKILLS.filter(s => s.f === fac && s.key !== 'pride')).key; it.aff.push(af); }
  return it;
}
function statTxt(it) { const neg = it.stat === 'cd', pct = /%/.test(STAT_LABEL[it.stat]); return `${STAT_LABEL[it.stat].replace(/ ?-?%$/, '')} ${neg ? '-' : '+'}${it.val}${pct ? '%' : ''}`; }
function affText(a) { const d = AFFIXES.find(x => x.key === a.k); return d.desc(a.v, a.t); }
function rollRarity(bonus = 0) { const w = [40, 28, 16, 9, 5, 2]; let r = rnd() * 100, i = 0; for (; i < 6; i++) { r -= w[i]; if (r < 0) break; } return clamp(Math.min(i, 5) + bonus, 0, 5); }
function heroMods(hk) {
  const st = P.heroes[hk]; const m = { dmg: 0, range: 0, hp: 0, cd: 0, rate: 0, ability: 0, kin: 0, tower: {}, skill: {}, bias: 0, sky: 0, daring: 0 };
  Object.values(st.equip).forEach(id => { const it = P.inv.find(i => i.id === id); if (!it) return; m[it.stat] += it.val;
    it.aff.forEach(a => { if (a.k === 'fierce') m.dmg += a.v; else if (a.k === 'swift') m.rate += a.v; else if (a.k === 'oath') m.hp += a.v; else if (a.k === 'kin') m.kin += a.v; else if (a.k === 'towerBoost') m.tower[a.t] = (m.tower[a.t] || 0) + a.v; else if (a.k === 'skillBoost') m.skill[a.t] = (m.skill[a.t] || 0) + a.v; else if (a.k === 'offerBias') m.bias = 1; else if (a.k === 'skyward') m.sky += a.v; else if (a.k === 'daring') m.daring += a.v; }); });
  m.cd = Math.min(m.cd, 50); m.dmg += (st.lvl - 1) * 4 + EVOS[hk][st.evo].bonus * 100; return m;
}

// ---------------- Input: buttons fire on release (pointerup), drag-out cancels ----------------
const ui = { hits: [], pressed: null, pressT: 0, rel: {}, start: null, oy: 0, lock: 0 };
function B(id, x, y, w, h, opts, fn) {
  const b = Object.assign({ id, x, y, w, h, fn }, opts || {});
  if (!b.hidden) drawButton(ctx, b, btnScale(id));
  const pad = Math.max(0, (44 - h) / 2), padx = Math.max(0, (44 - w) / 2); // min 44px hit area
  b.hx = x - padx; b.hy = y - pad + ui.oy; b.hw = w + padx * 2; b.hh = h + pad * 2;
  if (!b.disabled || b.allowDisabled) ui.hits.push(b); return b;
}
function btnScale(id) {
  if (ui.pressed && ui.pressed.id === id) return 1 - 0.05 * Math.min(1, (now - ui.pressT) / 80);
  const r = ui.rel[id]; if (r != null) { const k = (now - r) / 160; if (k >= 1) { delete ui.rel[id]; return 1; } return k < 0.5 ? 0.95 + 0.16 * k : 1.03 - 0.06 * (k - 0.5); }
  return 1;
}
function toL(ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H }; }
const inB = (b, p, slop = 0) => p.x >= b.hx - slop && p.x <= b.hx + b.hw + slop && p.y >= b.hy - slop && p.y <= b.hy + b.hh + slop;
cv.addEventListener('pointerdown', (ev) => { ev.preventDefault(); Sfx.ensure(); const p = toL(ev); ui.start = p;
  for (let i = ui.hits.length - 1; i >= 0; i--) if (inB(ui.hits[i], p)) { ui.pressed = ui.hits[i]; ui.pressT = now; break; } });
cv.addEventListener('pointermove', (ev) => { if (!ui.pressed) return; const p = toL(ev); if (!inB(ui.pressed, p, 10) || (ui.pressed.hidden && Math.hypot(p.x - ui.start.x, p.y - ui.start.y) > 12)) { ui.rel[ui.pressed.id] = now; ui.pressed = null; } });
cv.addEventListener('pointerup', (ev) => { const b = ui.pressed; ui.pressed = null; if (!b) return; ui.rel[b.id] = now; const p = toL(ev);
  if (inB(b, p, 10) && (!b.disabled || b.allowDisabled)) { try { navigator.vibrate && navigator.vibrate(b.hidden ? 6 : 12); } catch (e) {} Sfx.play('ui'); b.fn && b.fn(); } });
cv.addEventListener('pointercancel', () => { if (ui.pressed) ui.rel[ui.pressed.id] = now; ui.pressed = null; });
window.addEventListener('keydown', (e) => { if (scene === 'game' && g) { if (e.key === ' ') cycleSpeed(); if (e.key === 'Escape') { g.sel = null; g.roadmap = false; } } });

// ---------------- Mission state ----------------
function newMission(resume) {
  const fac = FACTIONS.find(f => f.key === P.faction), hk = heroKey(P.faction), hm = heroMods(hk);
  const lives = START_LIVES + (P.faction === 'stone' ? 5 : 0) + hm.hp;
  g = { fac, hk, hm, gold: START_GOLD, lives, maxLives: lives, wave: 0, inWave: false, spawnQ: [], spawnT: 0, enemies: [], towers: [], shots: [], fx: [], pools: [], floats: [],
    speed: 1, sel: null, spot: null, roadmap: false, t: 0, kills: 0, leaked: 0, earned: 0,
    hero: { x: C(HERO_SPOT[0]), y: C(HERO_SPOT[1]), cd: 0, cdMax: fac.hero.cd * (1 - hm.cd / 100), atk: 0, lvl: 1, xp: 0, face: 1, wall: 0, swing: 0 },
    sk: {}, picks: [], pickQ: 0, offer: null, stake: null, stakeOffer: null, stakeDone: {}, banner: null, toast: null, heat: {}, over: false, memoryLost: false,
    tut: P.tutDone ? -1 : 0, built: 0 };
  if (resume) { const r = resume; Object.assign(g, { gold: r.gold, lives: r.lives, maxLives: r.maxLives, wave: r.wave, kills: r.kills, earned: r.earned, sk: r.sk, picks: r.picks, stakeDone: r.stakeDone || {}, speed: r.speed || 1, tut: -1 });
    g.hero.lvl = r.hlvl; g.hero.xp = r.hxp; g.hero.cdMax = fac.hero.cd * (1 - hm.cd / 100) * (g.sk.avalanche ? 0.75 : 1);
    r.towers.forEach(t => { g.towers.push(mkTower(t.key, t.spot, t.lvl, t.branch, t.spent)); }); }
  scene = 'game';
}
function snapshot() { if (!g || g.over) return; try { localStorage.setItem(RKEY, JSON.stringify({ v: 2, fac: P.faction, gold: g.gold, lives: g.lives, maxLives: g.maxLives, wave: g.wave, kills: g.kills, earned: g.earned, sk: g.sk, picks: g.picks, stakeDone: Object.fromEntries(Object.entries(g.stakeDone).filter(([w]) => +w < g.wave || (+w === g.wave && !g.stake && !g.stakeOffer && !g.inWave))), speed: g.speed, hlvl: g.hero.lvl, hxp: g.hero.xp, towers: g.towers.map(t => ({ key: t.key, spot: t.spot, lvl: t.lvl, branch: t.branch, spent: t.spent })) })); } catch (e) {} }
function getRun() { try { const r = JSON.parse(localStorage.getItem(RKEY) || 'null'); return r && r.v === 2 && r.fac === P.faction ? r : null; } catch (e) { return null; } }
function clearRun() { try { localStorage.removeItem(RKEY); } catch (e) {} }
function mkTower(key, spot, lvl = 1, branch = null, spent = buildCost(key)) { const [c, r] = BUILD_SPOTS[spot]; return { key, spot, x: C(c), y: C(r), lvl, branch, spent, cd: 0.3, ang: 0, flash: 0, heat: 0, hot: 0, kills: 0 }; }
function effStats(t) {
  const s = towerStats(t.key, t.lvl, t.branch); const m = s.mod || {}; let dm = 1 + g.hm.kin / 100 + (g.hm.tower[t.key] || 0) / 100;
  if (g.sk.white) dm += 0.08; if (g.sk.echo && t.key === 'monolith') dm += 0.15; if (g.sk.vein && t.key === 'spire') { dm += 0.2; s.range += 10; }
  if (g.sk.starfire && t.key === 'kiln') dm += 0.3; if (g.sk.chain && s.splash) s.splash = Math.round(s.splash * 1.2); if (m.dmgX) dm += m.dmgX;
  g.towers.forEach(o => { if (o !== t && o.key === 'bell' && o.branch === 'A' && o.lvl >= 4 && dist(o, t) < 90) dm += 0.1; });
  s.dmg = Math.round(s.dmg * dm); return s;
}
function heroStats() { const h = g.fac.hero, m = g.hm, lv = g.hero.lvl - 1; return { dmg: Math.round(h.dmg * (1 + m.dmg / 100 + lv * 0.08) * (g.sk.crystal ? 1.25 : 1)), rate: h.rate / (1 + m.rate / 100 + lv * 0.03), range: h.range + m.range + lv * 2, dtype: h.dtype, splash: h.splash }; }
function canBuild(spot) { return !g.towers.some(t => t.spot === spot); }
function build(key, spot) {
  if (spot == null || !canBuild(spot) || (now < ui.lock && !(ui.spotT >= ui.lock - 250))) return; /* iter2f: lock only blocks taps carried over from the last build, not a fresh spot pick */ const c = buildCost(key); if (g.gold < c) { toast('Not enough gold'); return; }
  g.gold -= c; g.towers.push(mkTower(key, spot)); g.spot = null; ui.lock = now + 250; g.built++; Sfx.play('build'); fx('ring', C(BUILD_SPOTS[spot][0]), C(BUILD_SPOTS[spot][1]), GOLD);
  if (g.tut === 1) g.tut = 2;
}
function upgrade(t, branch) {
  if (t.lvl >= MAX_LVL) return; if (t.lvl + 1 === BRANCH_LVL && !branch) return; const c = upCost(t.key, t.lvl); if (g.gold < c) { toast('Not enough gold'); return; }
  g.gold -= c; t.spent += c; t.lvl++; if (branch) t.branch = branch; t.flash = 1; Sfx.play('build');
  if ([4, 7, 10].includes(t.lvl)) { fx('burst', t.x, t.y - 20, t.lvl === 10 ? GOLD : '#fff'); toast(`${towerName(t.key, t.lvl)}${t.lvl === 10 ? ' — CROWNED' : ''}`); }
}
function sell(t) { if (P.faction === 'stone') { toast('Petrified: Stonewarden towers cannot be sold'); return; } g.gold += Math.round(t.spent * 0.6); g.towers.splice(g.towers.indexOf(t), 1); g.sel = null; Sfx.play('ui'); }
function toast(s, d = 1.8) { g.toast = { s, t: d }; }
function fx(k, x, y, col, extra) { g.fx.push(Object.assign({ k, x, y, col, t: 0, d: k === 'burst' ? 0.6 : 0.45 }, extra || {})); }
function callWave() {
  if (g.inWave || g.wave >= WAVES.length || g.offer || g.stakeOffer) return;
  if (STAKE_WAVES.includes(g.wave) && !g.stakeDone[g.wave]) { snapshot(); g.stakeOffer = stakeOptions(); return; }
  startWave();
}
function startWave() {
  if (!g.stake) snapshot(); g.inWave = true; g.stakeOffer = null; const w = WAVES[g.wave]; g.spawnQ = []; let tt = 0.5;
  w.forEach(([k, n, gap]) => { for (let i = 0; i < n; i++) { g.spawnQ.push({ k, at: tt }); tt += gap; } tt += 0.8; });
  g.spawnQ.sort((a, b) => a.at - b.at); g.spawnT = 0; Sfx.play('wave'); if (g.tut === 2) g.tut = 3;
  if (g.wave === 9) g.banner = { s: LINES.heraldIntro, t: 4 };
}
function spawn(k) {
  const d = ENEMIES[k], hp = Math.round(d.hp * (d.boss ? 1 : waveHpScale(g.wave)));
  g.enemies.push({ k, d, hp, max: hp, dist: 0, fly: !!d.fly, prog: 0, x: PATH[0].x, y: PATH[0].y, slow: 0, slowT: 0, stun: 0, shred: 0, armDown: 0, grounded: 0, burn: 0, burnT: 0, healT: 2, stage: 0, flip: false, wob: rnd() * 6, hold: 0 });
}
function armourOf(e) { let a = e.d.armour - e.shred - e.armDown; if (e.stage >= 2) a -= 0.1; return clamp(a, 0, 0.9); }
function damage(e, amt, dtype, src, opts = {}) {
  if (e.hp <= 0) return; let cls = e.fly && !e.grounded ? 'air' : e.d.aclass; let mul = (DMG_MATRIX[dtype] || {})[cls] || 1;
  const m = (src && src.mod) || {}; if (m.vsPlate && e.d.aclass === 'plate') mul += m.vsPlate; if (m.vsBoss && e.d.boss) mul += m.vsBoss; if (m.vsGrounded && e.grounded) mul += m.vsGrounded; if (e.veil > 0) mul *= 0.4; // iter2f: Veil Call shield
  if (e.fly && !e.grounded) { mul *= 1 + (g.hm.sky / 100) + (g.sk.eyes ? 0.25 : 0); }
  const arm = opts.pierce != null ? armourOf(e) * (1 - opts.pierce) : opts.trueDmg ? 0 : armourOf(e);
  e.hp -= amt * mul * (1 - arm);
  const st = e.hp / e.max, ns = st < 0.25 ? 3 : st < 0.5 ? 2 : st < 0.75 ? 1 : 0;
  if (ns > e.stage) { e.stage = ns; if (ns === 2 && !e.d.boss && rnd() < 0.15) g.banner = { s: LINES.costume, t: 2.5 }; }
  if (e.hp <= 0) kill(e, src);
}
function kill(e, src) {
  const gold = Math.round(e.d.gold * KILL_GOLD * (g.sk.tongue ? 1.15 : 1)); g.gold += gold; g.earned += gold; g.kills++; if (src && src.kills != null) src.kills++;
  g.floats.push({ s: '+' + gold, x: e.x, y: e.y - 20, t: 0, col: GOLD }); fx('burst', e.x, e.y - 10, e.d.boss ? GOLD : '#ff8aa0'); Sfx.play('die');
  gainXp(e.d.boss ? 40 : e.d.lives * 2 + 1);
}
function gainXp(n) { const h = g.hero; if (h.lvl >= HERO_LVL_XP.length + 1) return; h.xp += n; const need = HERO_LVL_XP[h.lvl - 1]; if (h.xp >= need) { h.xp -= need; h.lvl++; g.pickQ++; fx('burst', h.x, h.y - 30, GOOD); Sfx.play('wave'); } }
function rollSkills() {
  const hm = g.hm; const pool = SKILLS.filter(s => (s.f === P.faction || s.f === 'any') && !g.sk[s.key]); const out = [];
  while (out.length < 3 && pool.length) { let tot = 0; const ws = pool.map(s => { const w = RAR_W[s.w] * (hm.bias && s.w !== 'c' ? 2 : 1); tot += w; return w; }); let r = rnd() * tot, i = 0; for (; i < pool.length - 1; i++) { r -= ws[i]; if (r < 0) break; } out.push(pool.splice(i, 1)[0]); }
  return out;
}
function pickSkill(s) {
  const boost = 1 + (g.hm.skill[s.key] || 0) / 100; g.sk[s.key] = boost; g.picks.push(s.key); g.offer = null; g.pickQ--;
  if (s.key === 'pride') { g.lives += Math.round(3 * boost); g.maxLives += Math.round(3 * boost); }
  if (s.key === 'mend') g.lives = Math.min(g.maxLives + 5, g.lives + Math.round(4 * boost));
  if (s.key === 'avalanche') g.hero.cdMax *= 0.75; toast(s.name + '!');
}
function useAbility() {
  const h = g.hero; if (h.cd > 0 || !g.inWave) return; if (g.enemies.some(e => e.d.silence && dist(e, h) < 90)) { toast('Silenced by a Moth Enchantress!'); return; }
  const pw = 1 + g.hm.ability / 100; h.cd = h.cdMax;
  if (P.faction === 'stone') { h.wall = 5 * pw; g.enemies.forEach(e => { if (!e.fly || e.grounded) e.stun = Math.max(e.stun, 5 * pw); }); fx('quake', W / 2, 280, '#9fd8ff'); }
  else { const lead = g.enemies.reduce((a, e) => (!a || e.dist > a.dist ? e : a), null); if (lead) { const dm = 240 * pw * (g.sk.rain ? 1.5 * g.sk.rain : 1); g.enemies.forEach(e => { if (dist(e, lead) < 55) { damage(e, dm, 'fire', null); e.stun = Math.max(e.stun, 1.5); } }); fx('anvil', lead.x, lead.y, '#ff8a2a'); } }
  Sfx.play('ability');
}

// ---------------- Stakes (P1 wager) ----------------
function stakeMult() { return 1 + (g.sk.ember ? 0.25 * g.sk.ember : 0) + g.hm.daring / 100; }
function stakeOptions() {
  const boss = g.wave === 9; const pm = stakeMult(), n = v => Math.round(v * pm), ai = g.gold;
  const o = [{ k: 1, name: 'Flutter', risk: 'pay 40 gold', win: `net +${n(80) - 40} gold`, can: g.gold >= 40 }, { k: 2, name: 'Double', risk: 'pay 3 lives', win: `net +${n(150)} gold, +3 lives`, can: g.lives > 3 }, { k: 3, name: 'All-in', risk: ai >= 60 ? `pay all ${ai} gold` : 'needs 60+ gold', win: ai >= 60 ? `net +${n(ai * 2.5) - ai} gold` : 'locked', can: ai >= 60 }];
  if (boss) o.push({ k: 4, name: 'Memory', risk: 'a Memory (fragment)', win: 'Remembered relic', can: P.memories > 0 });
  return { opts: o, boss };
}
function placeStake(k) {
  g.stakeDone[g.wave] = true; if (k) { const amt = k === 1 ? 40 : k === 3 ? g.gold : 0; g.gold -= amt; if (k === 2) g.lives -= 3;
    g.stake = { k, amt, wave: g.wave, raised: false, leaksAt: g.leaked }; const l = k === 4 ? LINES.memory : pick(LINES.stake[Math.min(k, 3)] || LINES.raise); g.banner = { s: l, t: 3 };
    g.raiseT = 6; } startWave();
}
function raise() { const s = g.stake; if (!s || s.raised || g.gold < 30) return; g.gold -= 30; if (s.k !== 2) s.amt += 30; s.raised = true; g.banner = { s: pick(LINES.raise), t: 2.5 }; g.raiseT = 0; }
function resolveStake() {
  const s = g.stake; if (!s) return; g.stake = null; g.stakeHold = 2.2; /* iter2f: let the stake result banner show before a level-up modal */ const won = g.leaked === s.leaksAt, pm = stakeMult(), n = v => Math.round(v * pm), rz = s.raised ? 30 : 0;
  // gross return = stake back + profit; banner shows NET (what the modal promised)
  if (won) { let gross = 0, net = 0, lives = 0;
    if (s.k === 1) { gross = n(80) + (rz ? n(60) : 0); net = gross - s.amt; }
    if (s.k === 2) { gross = n(150) + (rz ? n(60) : 0); net = gross - rz; lives = 6; }
    if (s.k === 3) { gross = n(s.amt * 2.5); net = gross - s.amt; }
    if (s.k === 4) { g.relicWin = true; gross = s.amt; net = gross - s.amt; }
    g.gold += gross; g.lives += lives; g.lastStake = { k: s.k, net, lives: lives ? lives - 3 : 0 };
    g.banner = { s: `${pick(LINES.won)}  net +${net} gold${lives ? ', +3 lives' : ''}`, t: 3.5 }; Sfx.play('win'); }
  else { if (s.k === 4) { g.memoryLost = true; P.memories = Math.max(0, P.memories - 1); save(); } g.lastStake = { k: s.k, net: -s.amt, lives: s.k === 2 ? -3 : 0 }; g.banner = { s: pick(LINES.lost), t: 3.5 }; Sfx.play('lose'); }
}

// ---------------- Simulation ----------------
function update(dt) {
  if (g.over || g.offer || g.stakeOffer) return; g.t += dt; if (g.stakeHold > 0) g.stakeHold -= dt; const h = g.hero;
  if (g.inWave) { g.spawnT += dt; while (g.spawnQ.length && g.spawnQ[0].at <= g.spawnT) spawn(g.spawnQ.shift().k); }
  if (h.cd > 0) h.cd = Math.max(0, h.cd - dt); if (h.wall > 0) h.wall -= dt;
  for (const e of g.enemies) {
    if (e.hp <= 0) continue; e.wob += dt;
    if (e.burnT > 0) { e.burnT -= dt; damage(e, e.burn * dt, 'fire', null, { trueDmg: true }); if (e.hp <= 0) continue; }
    if (e.d.boss) { const ph = e.hp < e.max * 0.33 ? 2 : e.hp < e.max * 0.66 ? 1 : 0; // iter2d boss ability: Veil Call at 66% / 33% HP
      if (ph > (e.phase || 0)) { e.phase = ph; e.veil = 6; g.banner = { s: 'VEIL CALL \u2014 Herald shielded! Kill her darlings. \u201cCome, darlings. Mother needs a shield.\u201d', t: 3.5 }; fx('ring', e.x, e.y, '#ff6a8a', { r: 70 }); Sfx.play('die');
        for (let i = 0; i < 3 + ph; i++) { spawn('ling'); const m = g.enemies[g.enemies.length - 1]; m.dist = Math.max(0, e.dist - 12 - i * 14); m.x = e.x; m.y = e.y; m.veilKid = 1; } }
      if (e.veil > 0) { e.veil -= dt; if (!g.enemies.some(o => o.veilKid && o.hp > 0)) e.veil = Math.min(e.veil, 0.5); } }
    if (e.d.heal) { e.healT -= dt; if (e.healT <= 0) { e.healT = 3; g.enemies.forEach(o => { if (o !== e && o.hp > 0 && dist(o, e) < 60) o.hp = Math.min(o.max, o.hp + o.max * 0.06); }); fx('ring', e.x, e.y, '#ff7ab0'); } }
    if (e.stun > 0) { e.stun -= dt; continue; } if (e.hold > 0) { e.hold -= dt; continue; }
    if (e.slowT > 0) e.slowT -= dt; else e.slow = 0; if (e.grounded > 0) e.grounded -= dt;
    let sp = e.d.spd * (1 - e.slow) * (e.grounded > 0 ? 0.5 : 1);
    if (e.fly && !(e.grounded > 0)) { e.prog += sp * dt / FLY_LEN; const t = Math.min(1, e.prog); const ox = e.x; e.x = FLY_A.x + (FLY_B.x - FLY_A.x) * t + Math.sin(e.wob * 2) * 14; e.y = FLY_A.y + (FLY_B.y - FLY_A.y) * t; e.flip = e.x < ox; if (t >= 1) leak(e); }
    else { if (e.fly) { e.prog += sp * dt / FLY_LEN; } else e.dist += sp * dt; const p = e.fly ? { x: e.x, y: e.y + (posAt(e.dist).y - e.y) * 0 } : posAt(e.dist); if (!e.fly) { e.flip = p.dx < 0; e.x = p.x; e.y = p.y; } if (!e.fly && e.dist >= PATH_LEN) leak(e); }
  }
  g.enemies = g.enemies.filter(e => e.hp > 0 && !e.gone);
  for (const t of g.towers) fireTower(t, dt);
  heroAct(dt);
  g.shots = g.shots.filter(s => { s.t += dt; return s.t < s.d; }); g.fx = g.fx.filter(f => { f.t += dt; return f.t < f.d; });
  g.pools = g.pools.filter(p => { p.t -= dt; g.enemies.forEach(e => { if (!e.fly && dist(e, p) < p.r) { damage(e, p.dmg * dt, 'fire', null, { trueDmg: true }); if (p.slow) { e.slow = Math.max(e.slow, p.slow); e.slowT = 0.3; } } }); return p.t > 0; });
  g.floats = g.floats.filter(f => { f.t += dt; return f.t < 0.9; });
  if (g.inWave && !g.spawnQ.length && !g.enemies.length) endWave();
}
function leak(e) { e.gone = true; e.hp = 0; g.lives -= e.d.lives; g.leaked += e.d.lives; Sfx.play('leak'); fx('ring', FLY_B.x, FLY_B.y, RED); if (g.lives <= 0) { g.lives = 0; endMission(false); } }
function endWave() {
  g.inWave = false; resolveStake(); g.wave++; const bonus = 30 + g.wave * 8; /* iter2f economy (iter2d 35+10w) */ g.gold += bonus; g.floats.push({ s: `Wave bonus +${bonus}`, x: W / 2, y: 280, t: 0, col: GOLD });
  g.towers.forEach(t => { if (t.key === 'bastion' && t.branch === 'B' && g.wave % 2 === 0) g.lives++; });
  if (g.wave >= WAVES.length) { endMission(true); return; } snapshot();
}
function targets(t, range, air) {
  return g.enemies.filter(e => e.hp > 0 && dist(e, t) <= range && (air === 'only' ? e.fly && !(e.grounded > 0) : air === 'no' ? !e.fly || e.grounded > 0 : true)).sort((a, b) => (b.dist + b.prog * PATH_LEN) - (a.dist + a.prog * PATH_LEN));
}
function fireTower(t, dt) {
  const d = TOWERS[t.key]; if (t.flash > 0) t.flash -= dt * 2; t.cd -= dt;
  if (t.hot > 0) { t.hot -= dt; return; } if (t.heat > 0) t.heat = Math.max(0, t.heat - dt * 8);
  if (t.cd > 0) return; const s = effStats(t), m = s.mod || {}; let air = d.air; if (d.kind === 'aura' && m.airFull) air = 'yes';
  let tg = targets(t, s.range, air); if (!tg.length) return; const e = tg[0];
  t.cd = s.rate; t.ang = Math.atan2(e.y - t.y, e.x - t.x);
  const airMul = (x) => (x.fly && !(x.grounded > 0) && d.air === 'half' && !m.airFull) ? 0.5 : 1;
  if (d.heat) { t.heat += d.heat * (g.sk.mastery ? 0.75 : 1); if (t.heat >= 100) { t.heat = 0; t.hot = g.sk.quench ? 2 : 4; fx('ring', t.x, t.y - 20, '#ff6a2a'); Sfx.play('heat'); } }
  Sfx.play('shoot');
  switch (d.kind) {
    case 'bolt': { const n = 1 + (m.extra || 0); tg.slice(0, n).forEach(x => { damage(x, s.dmg * airMul(x), d.dtype, t); if (m.stun) x.stun = Math.max(x.stun, m.stun * 0.5); if (s.ground && x.fly) { x.grounded = s.ground * (g.sk.chains ? 1.5 : 1); } g.shots.push({ k: t.key === 'skyhook' ? 'chain' : t.key === 'spire' ? 'crystal' : 'bolt', x: t.x, y: t.y - 26, tx: x.x, ty: x.y - 12, t: 0, d: 0.18 }); }); break; }
    case 'block': { tg.slice(0, 3).forEach(x => { damage(x, s.dmg, d.dtype, t); x.hold = Math.max(x.hold, s.hold * (1 + (m.holdX || 0))); }); fx('ring', t.x, t.y, '#c9b38a', { r: s.range }); break; }
    case 'slam': { tg.forEach(x => { damage(x, s.dmg, d.dtype, t); x.shred = Math.max(x.shred, m.shred || d.shred); if (m.knock && !x.d.boss) x.dist = Math.max(0, x.dist - m.knock); }); fx('ring', t.x, t.y, '#d9a560', { r: s.range }); break; }
    case 'shell': { const shots = m.twin ? tg.slice(0, 2) : [e]; shots.forEach(x => { g.enemies.forEach(o => { if (dist(o, x) < s.splash && (!o.fly || o.grounded > 0)) damage(o, s.dmg, d.dtype, t); }); fx('boom', x.x, x.y, '#ff8a2a', { r: s.splash }); g.shots.push({ k: 'shell', x: t.x, y: t.y - 24, tx: x.x, ty: x.y, t: 0, d: 0.25 }); }); Sfx.play('boom'); break; }
    case 'slag': { damage(e, s.dmg, d.dtype, t); g.pools.push({ x: e.x, y: e.y, r: 22, dmg: s.burn, t: 2.5 * (m.poolX || 1), slow: m.slow || 0 }); g.shots.push({ k: 'shell', x: t.x, y: t.y - 24, tx: e.x, ty: e.y, t: 0, d: 0.3 }); break; }
    case 'beam': { const ang = t.ang, len = m.dmgX ? 400 : s.range; g.enemies.forEach(x => { const dx = x.x - t.x, dy = x.y - t.y, along = dx * Math.cos(ang) + dy * Math.sin(ang), perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang)); if (along > 0 && along < len && perp < 14) damage(x, s.dmg * airMul(x), d.dtype, t, { pierce: m.pierce || d.pierce }); }); g.shots.push({ k: 'beam', x: t.x, y: t.y - 30, tx: t.x + Math.cos(ang) * len, ty: t.y - 30 + Math.sin(ang) * len, t: 0, d: 0.2 }); break; }
    case 'aura': { tg.forEach(x => { damage(x, s.dmg * airMul(x), d.dtype, t); x.armDown = Math.max(x.armDown, s.armourDown); }); g.towers.forEach(o => { if (o.heat && dist(o, t) < 90) o.heat = Math.max(0, o.heat - 20); }); fx('ring', t.x, t.y - 20, GOLD, { r: s.range }); break; }
    case 'flak': { g.enemies.forEach(x => { if (dist(x, e) < s.cloud * (1 + (m.cloudX || 0))) { damage(x, s.dmg * (x.fly ? 1.6 : 0.6), d.dtype, t); if (m.airSlow && x.fly) { x.slow = m.airSlow; x.slowT = 1.5; } } }); fx('boom', e.x, e.y - 14, '#ffd06a', { r: s.cloud }); g.shots.push({ k: 'bolt', x: t.x, y: t.y - 24, tx: e.x, ty: e.y - 14, t: 0, d: 0.15 }); break; }
  }
}
function heroAct(dt) {
  const h = g.hero, s = heroStats(); h.atk -= dt; if (h.swing > 0) h.swing -= dt * 4; if (h.atk > 0) return;
  const tg = targets(h, s.range, 'yes'); if (!tg.length) return; const e = tg[0]; h.atk = s.rate; h.face = e.x < h.x ? -1 : 1; h.swing = 1;
  if (s.splash) g.enemies.forEach(o => { if (dist(o, e) < s.splash) damage(o, s.dmg, s.dtype, null); }); else damage(e, s.dmg, s.dtype, null);
  g.shots.push({ k: P.faction === 'stone' ? 'crystal' : 'shell', x: h.x, y: h.y - 30, tx: e.x, ty: e.y - 12, t: 0, d: 0.2 });
}

// ---------------- Mission end + progression ----------------
let result = null, lvlUps = [];
function endMission(win) {
  if (g.over) return; g.over = true; clearRun(); const st = P.heroes[g.hk];
  const stars = win ? (g.lives >= g.maxLives * 0.8 ? 3 : g.lives >= g.maxLives * 0.4 ? 2 : 1) : 0;
  const xp = 20 + g.wave * 12 + (win ? 60 : 0) + g.kills; const shards = win ? 1 + (stars === 3 ? 1 : 0) : 0;
  const drops = []; const nd = win ? 1 + (stars >= 2 ? 1 : 0) : (g.wave >= 5 ? 1 : 0);
  for (let i = 0; i < nd; i++) drops.push(genItem(rollRarity(stars >= 3 ? 1 : 0), null, P.faction));
  if (g.relicWin) drops.push(genItem(5, 'relic', P.faction)); P.inv.push(...drops);
  P.plays++; if (win) P.clears++; P.best = Math.max(P.best, g.wave); P.shards += shards; if (g.memoryLost) P.memories = Math.max(0, P.memories);
  const from = st.lvl; st.xp += xp; lvlUps = [];
  while (st.lvl < HERO_MAX_LVL && st.xp >= PROFILE_XP(st.lvl)) { st.xp -= PROFILE_XP(st.lvl); st.lvl++; lvlUps.push(st.lvl); }
  result = { win, stars, xp, shards, drops, from, to: st.lvl, wave: g.wave, kills: g.kills, lives: g.lives };
  save(); Sfx.play(win ? 'win' : 'lose'); setTimeout(() => { scene = 'result'; }, 700);
}
function canEvolve(hk) { const st = P.heroes[hk], n = EVOS[hk][st.evo + 1]; return n && st.lvl >= n.lvl && P.shards >= n.cost; }
function evolve(hk) { const st = P.heroes[hk], n = EVOS[hk][st.evo + 1]; if (!canEvolve(hk)) return; P.shards -= n.cost; st.evo++; save(); evoFx = now; Sfx.play('win'); }
let evoFx = -9999, armSlot = 'weapon', armPage = 0;
function equip(it) { const st = P.heroes[heroKey(P.faction)]; st.equip[it.slot] = st.equip[it.slot] === it.id ? undefined : it.id; if (!st.equip[it.slot]) delete st.equip[it.slot]; save(); }
function cycleSpeed() { if (!g) return; g.speed = g.speed === 1 ? 2 : g.speed === 2 ? 4 : 1; }

// ---------------- Rendering: world ----------------
function drawWorld() {
  const t = g.t;
  if (MAPC) ctx.drawImage(MAPC, 0, 0, W, 560); else { ctx.fillStyle = '#2b3a1e'; ctx.fillRect(0, 0, W, 560); }
  // build spots (hidden hit buttons). Occupied spots are not buttons -> no stacked builds
  BUILD_SPOTS.forEach(([c, r], i) => { const x = C(c), y = C(r); if (!canBuild(i)) return; const hot = g.spot === i || (g.tut === 0 && i === 3);
    const pulse = 0.85 + 0.15 * Math.sin(now / 300 + i); ctx.save(); ctx.globalAlpha = hot ? 1 : 0.75 * pulse; drawSprite(ctx, hot ? 'build-spot_hover' : 'build-spot', x, y + 14, 30); ctx.restore();
    B('spot' + i, x - 20, y - 20, 40, 40, { hidden: true }, () => { g.sel = null; g.roadmap = false; g.spot = g.spot === i ? null : i; ui.spotT = now; if (g.tut === 0) g.tut = 1; }); });
  g.pools.forEach(p => { ctx.fillStyle = `rgba(255,${100 + 40 * Math.sin(now / 120)},30,0.35)`; ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, p.r, p.r * 0.5, 0, 0, 7); ctx.fill(); });
  // depth-sorted actors
  const actors = [];
  g.towers.forEach(tw => actors.push({ y: tw.y, f: () => drawTower(tw) }));
  g.enemies.forEach(e => actors.push({ y: e.fly && !(e.grounded > 0) ? e.y + 30 : e.y, f: () => drawEnemy(e) }));
  actors.push({ y: g.hero.y, f: () => { const h = g.hero; const look = heroLook(P); ctx.save(); if (h.face < 0) { ctx.translate(h.x * 2, 0); ctx.scale(-1, 1); } drawHero(ctx, look, h.x, h.y + 14, 62 + (h.swing > 0 ? 2 : 0), now / 1000); ctx.restore();
    if (h.wall > 0) { ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 3; SEGS.forEach(s => { ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.b.x, s.b.y); ctx.stroke(); }); ctx.restore(); } } });
  actors.sort((a, b) => a.y - b.y).forEach(a => a.f());
  // tower hit boxes: fixed per-spot cells, registered top-most last so only one tower is ever hit
  g.towers.slice().sort((a, b) => a.y - b.y).forEach(tw => B('tw' + tw.spot, tw.x - 20, tw.y - 30, 40, 48, { hidden: true }, () => { g.spot = null; g.sel = g.sel === tw ? null : tw; g.roadmap = false; }));
  // shots
  g.shots.forEach(s => { const k = s.t / s.d; ctx.save();
    if (s.k === 'beam') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffb36a'; ctx.lineWidth = 5; ctx.shadowColor = '#ff6a2a'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.tx, s.ty); ctx.stroke(); }
    else if (s.k === 'chain') { ctx.strokeStyle = '#d9c8a0'; ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + (s.tx - s.x) * k, s.y + (s.ty - s.y) * k); ctx.stroke(); }
    else { const x = s.x + (s.tx - s.x) * k, y = s.y + (s.ty - s.y) * k - Math.sin(k * Math.PI) * (s.k === 'shell' ? 26 : 0); ctx.fillStyle = s.k === 'crystal' ? '#a8e8ff' : s.k === 'shell' ? '#ff8a2a' : '#ffe3a0'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x, y, s.k === 'shell' ? 4 : 3, 0, 7); ctx.fill(); }
    ctx.restore(); });
  g.fx.forEach(f => { const k = f.t / f.d; ctx.save(); ctx.globalAlpha = 1 - k;
    if (f.k === 'ring') { ctx.strokeStyle = f.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y, (f.r || 26) * (0.4 + k * 0.6), (f.r || 26) * (0.2 + k * 0.3), 0, 0, 7); ctx.stroke(); }
    else if (f.k === 'boom') { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 30) * (0.3 + k * 0.7), 0, 7); ctx.globalAlpha = 0.45 * (1 - k); ctx.fill(); }
    else if (f.k === 'burst') { ctx.fillStyle = f.col; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * k * 22, f.y + Math.sin(a) * k * 22, 2.5, 0, 7); ctx.fill(); } }
    else if (f.k === 'quake' || f.k === 'anvil') { ctx.fillStyle = f.col; ctx.globalAlpha = 0.25 * (1 - k); ctx.fillRect(0, 0, W, 560); if (f.k === 'anvil') { ctx.globalAlpha = 1 - k; ctx.font = font(30, 'Cinzel', 900); ctx.textAlign = 'center'; ctx.fillText('⚒', f.x, f.y - 60 * (1 - k)); } }
    ctx.restore(); });
  g.floats.forEach(f => txt(ctx, f.s, f.x, f.y - f.t * 26, 12, f.col, 'center'));
  if (g.sel) { const s = effStats(g.sel); ctx.save(); ctx.strokeStyle = 'rgba(242,193,78,0.8)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.sel.x, g.sel.y, s.range, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(242,193,78,0.07)'; ctx.fill(); ctx.restore(); }
}
function drawTower(tw) {
  const d = TOWERS[tw.key], tier = spriteTier(tw.lvl), h = [46, 54, 62][tier];
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(tw.x, tw.y + 12, 16, 5, 0, 0, 7); ctx.fill();
  if (tw.lvl >= 10) { ctx.save(); ctx.globalAlpha = 0.45 + 0.2 * Math.sin(now / 250); ctx.fillStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 18; ctx.beginPath(); ctx.ellipse(tw.x, tw.y + 10, 20, 7, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.save(); if (tw.hot > 0) ctx.filter = 'saturate(0.4) brightness(0.8)'; if (tw.flash > 0) ctx.filter = `brightness(${1 + tw.flash})`;
  if (!drawSprite(ctx, `${d.sprite}_t${tier + 1}`, tw.x, tw.y + 14, h)) { ctx.fillStyle = '#888'; rr(ctx, tw.x - 12, tw.y - 20, 24, 34, 6); ctx.fill(); } ctx.restore();
  if (tw.lvl >= 10) txt(ctx, '♛', tw.x, tw.y - h + 8, 14, GOLD, 'center', 'Cinzel');
  // level pip
  rr(ctx, tw.x + 8, tw.y + 2, 16, 13, 6); ctx.fillStyle = tw.lvl >= 10 ? GOLD : 'rgba(20,10,26,0.9)'; ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.stroke();
  txt(ctx, String(tw.lvl), tw.x + 16, tw.y + 8.5, 9, tw.lvl >= 10 ? '#2a1606' : GOLD, 'center');
  if (d.heat && tw.heat > 0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(tw.x - 12, tw.y + 17, 24, 3); ctx.fillStyle = '#ff6a2a'; ctx.fillRect(tw.x - 12, tw.y + 17, 24 * tw.heat / 100, 3); }
  if (tw.hot > 0) txt(ctx, 'OVERHEAT', tw.x, tw.y - h + 4, 8, '#ff8a5a', 'center');
}
function drawEnemy(e) {
  const d = e.d, st = e.stage >= 3 ? 'shed' : e.stage >= 1 ? 'cracked' : 'full'; // Herald stays covered (her 'shed' art is fully robed)
  const fl = e.fly && !(e.grounded > 0), base = `${d.sprite}_${st}`, name = animName(base, d.fly ? 'fly' : 'walk', e.wob, d.fly ? 10 : 7);
  const yy = e.y + (fl ? -18 + Math.sin(e.wob * 4) * 3 : 8);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 8, d.r, d.r * 0.35, 0, 0, 7); ctx.fill();
  ctx.save(); if (e.stun > 0 || e.hold > 0) ctx.filter = 'saturate(0.3) brightness(1.2)'; if (e.burnT > 0) ctx.filter = 'sepia(0.6) saturate(2)';
  if (!drawSprite(ctx, name, e.x, yy, d.sz, e.flip)) { ctx.fillStyle = '#c33'; ctx.beginPath(); ctx.arc(e.x, yy - 10, d.r, 0, 7); ctx.fill(); } ctx.restore();
  if (e.grounded > 0 && e.fly) { ctx.strokeStyle = '#d9c8a0'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(e.x, yy - d.sz); ctx.lineTo(e.x, e.y + 8); ctx.stroke(); ctx.setLineDash([]); }
  const bw = d.boss ? 44 : 22, by = yy - d.sz - 5; ctx.fillStyle = 'rgba(0,0,0,0.65)'; rr(ctx, e.x - bw / 2 - 1, by - 1, bw + 2, 5, 2); ctx.fill();
  if (e.veil > 0) { ctx.save(); ctx.strokeStyle = '#ff6a8a'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 120); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y - (e.d.sz || 40) / 2, (e.d.sz || 40) * 0.62, 0, 7); ctx.stroke(); ctx.restore(); } ctx.fillStyle = e.hp / e.max > 0.5 ? GOOD : e.hp / e.max > 0.25 ? GOLD : BAD; ctx.fillRect(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.max), 3);
}

// ---------------- Rendering: game HUD / bars / panels ----------------
function fitTxt(s, x, y, maxW, sz, col, align = 'center', fam = 'Cinzel', wt = 800) { ctx.font = font(sz, fam, wt); while (sz > 7 && ctx.measureText(s).width > maxW) { sz -= 0.5; ctx.font = font(sz, fam, wt); } txt(ctx, s, x, y, sz, col, align, fam, wt); }
function pill(x, y, w, h, icon, label, col = INK) { ctx.fillStyle = 'rgba(16,8,22,0.82)'; rr(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.strokeStyle = 'rgba(242,193,78,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  if (icon && IMG[icon]) ctx.drawImage(IMG[icon], x + 3, y + 2, h - 4, h - 4); fitTxt(label, x + (icon ? h + 2 : 6) + (w - (icon ? h + 8 : 12)) / 2, y + h / 2 + 0.5, w - (icon ? h + 8 : 12), 13, col, 'center', 'Nunito', 900); }
function drawGame() {
  const MY = MAPY(), BY = H - 80;
  ctx.fillStyle = '#120a18'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(0, MY); ui.oy = MY; drawWorld(); ctx.restore(); ui.oy = 0;
  if (MY > 0) { const gr = ctx.createLinearGradient(0, MY - 10, 0, MY + 10); gr.addColorStop(0, '#120a18'); gr.addColorStop(1, 'rgba(18,10,24,0)'); ctx.fillStyle = gr; ctx.fillRect(0, MY - 10, W, 20); }
  // HUD
  ctx.fillStyle = 'rgba(18,10,24,0.55)'; ctx.fillRect(0, 0, W, 50);
  pill(6, 8, 84, 30, 'gold', String(g.gold), GOLD); pill(94, 8, 70, 30, 'lives', String(g.lives), g.lives <= 5 ? BAD : INK);
  pill(168, 8, 90, 30, null, g.wave >= WAVES.length ? 'Victory' : `Wave ${Math.min(g.wave + 1, WAVES.length)}/${WAVES.length}`, INK);
  B('speed', 262, 2, 48, 44, { style: 'plum', label: g.speed + 'x', sz: 15, r: 14, icon: null }, cycleSpeed); if (IMG['speed-' + g.speed + 'x']) ctx.drawImage(IMG['speed-' + g.speed + 'x'], 266, 6, 14, 14);
  B('mute', 314, 2, 44, 44, { style: 'plum', label: Sfx.muted ? 'OFF' : '♪', sz: Sfx.muted ? 11 : 16, r: 14 }, () => Sfx.toggle());
  const hk = g.hero; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(6, 42, 120, 4); ctx.fillStyle = GOOD; ctx.fillRect(6, 42, 120 * Math.min(1, hk.xp / (HERO_LVL_XP[hk.lvl - 1] || 1)), 4); txt(ctx, `${g.fac.hero.name} Lv${P.heroes[g.hk].lvl} · Rank ${hk.lvl}`, 130, 45, 9, GOOD);
  if (g.stake) txt(ctx, `Stake: ${['', 'Flutter', 'Double', 'All-in', 'Memory'][g.stake.k]} — no leaks to win`, W - 6, 58 + MY * 0, 10, GOLD, 'right');
  // action row (ability + wave)
  const gap = BY - (MY + 560), ay = gap >= 52 ? MY + 560 + (gap - 48) / 2 : MY + 500;
  const sel = !!g.sel;
  const wy = sel ? Math.max(MY + 4, 64) : g.spot != null ? Math.min(ay, H - 112 - 54) : ay, waveLabel = g.inWave ? `Wave ${g.wave + 1} live` : g.wave >= WAVES.length ? 'Done' : g.wave === 0 ? 'START WAVE' : 'NEXT WAVE';
  B('wave', 214, wy, 140, 48, { style: g.inWave ? 'plum' : 'red', label: waveLabel, sz: waveLabel.length > 10 ? 13 : 15, disabled: g.inWave || g.wave >= WAVES.length, allowDisabled: true }, () => g.inWave ? toast('Wave in progress — clear it to call the next') : callWave());
  if (g.tut === 2 && !g.inWave) arrow(284, wy - 6);
  const ab = hk.cd > 0 || !g.inWave; if (g.spot == null && !sel) B('ability', 6, ay, 140, 48, { style: 'gold', label: g.fac.hero.ability, sz: 12, disabled: ab, sub: hk.cd > 0 ? `${Math.ceil(hk.cd)}s` : g.inWave ? 'ready' : 'in waves' }, useAbility);
  if (g.stake && !g.stake.raised && g.raiseT > 0 && g.spot == null && !sel) B('raise', 150, ay, 60, 48, { style: 'green', label: 'RAISE', sub: '30g', sz: 11 }, raise);
  // bottom bar
  if (g.spot != null) drawBuildMenu(BY); else drawBottomBar(BY);
  if (g.sel) drawPanel(g.sel);
  if (g.toast) { const tw = Math.min(330, 40 + g.toast.s.length * 6.4); ctx.save(); ctx.globalAlpha = Math.min(1, g.toast.t * 3); ctx.fillStyle = 'rgba(16,8,22,0.92)'; rr(ctx, W / 2 - tw / 2, MY + 64, tw, 28, 14); ctx.fill(); fitTxt(g.toast.s, W / 2, MY + 78, tw - 16, 12, INK, 'center', 'Nunito'); ctx.restore(); }
  if (g.banner) drawBanner();
  if (g.tut >= 0) drawTutorial(MY, BY, ay);
  if (g.pickQ > 0 && !g.offer && !g.over && !g.inWave && !g.stakeOffer && !(g.stakeHold > 0)) { g.offer = rollSkills(); if (!g.offer.length) { g.offer = null; g.pickQ = 0; } }
  if (g.offer) drawPick(); else if (g.stakeOffer) drawStake();
}
function arrow(x, y) { const b = Math.sin(now / 160) * 4; ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(x, y + b); ctx.lineTo(x - 9, y - 14 + b); ctx.lineTo(x + 9, y - 14 + b); ctx.closePath(); ctx.fill(); }
function drawBottomBar(BY) {
  ctx.fillStyle = 'rgba(14,8,20,0.95)'; ctx.fillRect(0, BY, W, H - BY); ctx.strokeStyle = 'rgba(242,193,78,0.5)'; ctx.beginPath(); ctx.moveTo(0, BY + 0.5); ctx.lineTo(W, BY + 0.5); ctx.stroke();
  const hk = heroKey(P.faction); ctx.save(); rr(ctx, 8, BY + 10, 60, 60, 12); ctx.clip(); const pi = IMG[`${hk}_portrait_evo${P.heroes[hk].evo + 1}`] || IMG['portrait-' + hk]; if (pi) ctx.drawImage(pi, 8, BY + 10, 60, 60); ctx.restore(); rr(ctx, 8, BY + 10, 60, 60, 12); ctx.strokeStyle = GOLD; ctx.stroke();
  txt(ctx, g.fac.hero.name, 76, BY + 22, 14, GOLD, 'left', 'Cinzel'); txt(ctx, g.fac.name + (P.faction === 'stone' ? ' · Petrified' : ' · Heat'), 76, BY + 40, 10, '#cdb8d6', 'left', 'Nunito', 700);
  const pk = g.picks.slice(-4).map(k => SKILLS.find(s => s.key === k).name).join(' · ') || 'Tap a glowing circle to build'; fitTxt(pk, 76, BY + 58, 270, 10, '#a99bb3', 'left', 'Nunito', 700);
}
function drawBuildMenu(BY) {
  const y0 = H - 112; ctx.fillStyle = 'rgba(14,8,20,0.96)'; ctx.fillRect(0, y0, W, H - y0); ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.moveTo(0, y0 + 0.5); ctx.lineTo(W, y0 + 0.5); ctx.stroke();
  g.fac.towers.forEach((k, i) => { const d = TOWERS[k], c = buildCost(k), x = 4 + i * 71, can = g.gold >= c;
    B('b_' + k, x, y0 + 6, 68, 100, { style: 'plum', r: 12, disabled: !can, allowDisabled: true }, () => can ? build(k, g.spot) : toast(`${d.name[0]} costs ${c} gold`));
    ctx.save(); if (!can) ctx.globalAlpha = 0.45; drawSprite(ctx, d.sprite + '_t1', x + 34, y0 + 62, 50); ctx.restore();
    fitTxt(d.name[0], x + 34, y0 + 72, 64, 10, INK, 'center', 'Nunito', 800); txt(ctx, String(c), x + 34, y0 + 86, 11, can ? GOLD : BAD, 'center');
    const air = { no: '', half: '½✈', yes: '✈', only: '✈ only' }[d.air]; if (air) txt(ctx, air, x + 64, y0 + 16, 9, '#9fd8ff', 'right');
    fitTxt(d.air === 'only' || /flyer/i.test(d.counter) ? 'vs Flyers' : d.counter.split(/[ ,(]/)[0], x + 34, y0 + 98, 62, 8, '#b9a8c4', 'center', 'Nunito', 700); });
  if (g.tut === 1) arrow(40, y0 + 4);
}
function fmt(v) { return typeof v === 'number' ? (Math.round(v * 100) / 100).toString() : v; }
function drawPanel(t) {
  const d = TOWERS[t.key], y0 = H - 318; panel9(ctx, 4, y0, W - 8, 314);
  B('close', W - 50, y0 + 6, 40, 40, { style: 'ghost', label: '✕', sz: 14, r: 12 }, () => { g.sel = null; g.roadmap = false; });
  drawSprite(ctx, `${d.sprite}_t${spriteTier(t.lvl) + 1}`, 42, y0 + 74, 62);
  fitTxt(towerName(t.key, t.lvl) + (t.branch ? ` · ${d.branches.find(b => b.key === t.branch).name}` : ''), 80, y0 + 22, 220, 15, GOLD, 'left', 'Cinzel');
  txt(ctx, `Level ${t.lvl}/${MAX_LVL} · ${d.dtype} · air: ${d.air}`, 80, y0 + 42, 11, '#cdb8d6', 'left', 'Nunito', 700);
  fitTxt('Counters: ' + d.counter, 80, y0 + 58, 266, 11, GOOD, 'left', 'Nunito', 700); fitTxt(d.desc, 80, y0 + 74, 266, 10, '#b9a8c4', 'left', 'Nunito', 600);
  if (g.roadmap) { drawRoadmap(t, y0); return; }
  // stats with next-level delta
  const cur = effStats(t), maxed = t.lvl >= MAX_LVL; const nx = maxed ? null : (() => { const o = Object.assign({}, t, { lvl: t.lvl + 1, branch: t.branch || (t.lvl + 1 === BRANCH_LVL ? d.branches[0].key : null) }); return effStats(o); })();
  const rows = [['Damage', 'dmg', 1], ['Fire every (s)', 'rate', -1], ['Range', 'range', 1]]; ['splash', 'hold', 'burn', 'ground', 'cloud', 'armourDown'].forEach(k => { if (cur[k] != null) rows.push([{ splash: 'Splash', hold: 'Hold (s)', burn: 'Burn/s', ground: 'Ground (s)', cloud: 'Cloud', armourDown: 'Armour -' }[k], k, 1]); });
  const ty = y0 + 94; txt(ctx, 'STAT', 16, ty, 10, '#a99bb3', 'left', 'Cinzel'); txt(ctx, 'NOW', 200, ty, 10, '#a99bb3', 'right', 'Cinzel'); txt(ctx, maxed ? '' : `LV ${t.lvl + 1}`, 300, ty, 10, '#a99bb3', 'right', 'Cinzel');
  rows.slice(0, 5).forEach(([lab, k, dir], i) => { const y = ty + 18 + i * 17; txt(ctx, lab, 16, y, 12, INK, 'left', 'Nunito', 700); txt(ctx, fmt(cur[k]), 200, y, 12, INK, 'right');
    if (nx) { const dv = +(nx[k] - cur[k]).toFixed(2); if (dv) { const good = dir * dv > 0; txt(ctx, (dv > 0 ? '+' : '') + fmt(dv), 300, y, 12, good ? GOOD : BAD, 'right'); } else txt(ctx, '—', 300, y, 12, '#776a80', 'right'); } });
  const by = y0 + 210;
  if (maxed) txt(ctx, '♛ CROWNED — maximum level', W / 2, by + 20, 14, GOLD, 'center', 'Cinzel');
  else if (t.lvl + 1 === BRANCH_LVL) { const c = upCost(t.key, t.lvl); txt(ctx, `Choose a path (${c} gold) — permanent`, W / 2, by - 6, 11, GOLD, 'center');
    d.branches.forEach((b, i) => B('br' + b.key, 12 + i * 170, by + 4, 162, 54, { style: i ? 'red' : 'gold', label: b.name, sub: b.desc.slice(0, 26), sz: 13, disabled: g.gold < c }, () => upgrade(t, b.key))); }
  else { const c = upCost(t.key, t.lvl); B('up', 12, by + 4, 200, 54, { style: 'green', label: `UPGRADE · ${c}`, sub: [4, 7, 10].includes(t.lvl + 1) ? 'new look at this level' : `to level ${t.lvl + 1}`, sz: 14, disabled: g.gold < c }, () => upgrade(t)); }
  B('road', 220, by + 66, 128, 34, { style: 'plum', label: 'ROADMAP 1-10', sz: 11 }, () => { g.roadmap = true; });
  B('sell', 12, by + 66, 200, 34, { style: 'plum', label: P.faction === 'stone' ? 'PETRIFIED (no sell)' : `SELL · ${Math.round(t.spent * 0.6)}`, sz: 11, disabled: P.faction === 'stone' }, () => sell(t));
  if (!maxed && t.lvl + 1 !== BRANCH_LVL) txt(ctx, `${t.kills} kills`, 284, by + 31, 11, '#a99bb3', 'center');
}
function drawRoadmap(t, y0) {
  const d = TOWERS[t.key]; txt(ctx, 'ROADMAP  L1 → L10', 16, y0 + 96, 12, GOLD, 'left', 'Cinzel');
  for (let l = 1; l <= MAX_LVL; l++) { const x = 16 + ((l - 1) % 5) * 66, y = y0 + 112 + Math.floor((l - 1) / 5) * 62, s = effStats(Object.assign({}, t, { lvl: l, branch: l >= BRANCH_LVL ? (t.branch || TOWERS[t.key].branches[0].key) : null })), on = l <= t.lvl;
    ctx.fillStyle = on ? 'rgba(95,208,138,0.18)' : 'rgba(0,0,0,0.35)'; rr(ctx, x, y, 60, 56, 10); ctx.fill(); ctx.strokeStyle = [1, 4, 7, 10].includes(l) ? GOLD : 'rgba(242,193,78,0.3)'; ctx.stroke();
    txt(ctx, 'L' + l + (l === 4 ? ' ★' : l === 10 ? ' ♛' : ''), x + 6, y + 10, 10, on ? GOOD : INK, 'left'); txt(ctx, fmt(s.dmg) + ' dmg', x + 6, y + 26, 10, INK, 'left', 'Nunito', 700); txt(ctx, s.range + ' rng', x + 6, y + 40, 9, '#b9a8c4', 'left', 'Nunito', 700);
    if ([1, 4, 7].includes(l)) drawSprite(ctx, `${d.sprite}_t${spriteTier(l) + 1}`, x + 50, y + 52, 26); }
  const by = y0 + 244; d.branches.forEach((b, i) => { fitTxt(`L4 ${b.key}: ${b.name} — ${b.desc}`, 16, by + i * 16, 330, 11, t.branch === b.key ? GOOD : INK, 'left', 'Nunito', 700); });
  B('roadback', 220, y0 + 274, 128, 34, { style: 'plum', label: 'BACK', sz: 12 }, () => { g.roadmap = false; });
}
function drawBanner() { const b = g.banner; ctx.save(); ctx.globalAlpha = Math.min(1, b.t * 2); panel(ctx, 10, MAPY() + 96, W - 20, 54, 14); wrap(ctx, b.s, W / 2, MAPY() + 114, W - 44, 15, 12, INK, 'center', 'Nunito', 700); ctx.restore(); }
function modalBg() { ui.hits = []; ctx.fillStyle = 'rgba(8,4,12,0.72)'; ctx.fillRect(0, 0, W, H); }
function drawPick() {
  modalBg(); const oy = OY(); ctx.save(); ctx.translate(0, oy); ui.oy = oy;
  txt(ctx, 'LEVEL UP!', W / 2, 120, 26, GOLD, 'center', 'Cinzel Decorative', 900); txt(ctx, `${g.fac.hero.name} reached Battle Rank ${g.hero.lvl} — choose 1 of ${g.offer.length}`, W / 2, 152, 12, INK, 'center');
  g.offer.forEach((s, i) => { const y = 180 + i * 118, col = { c: '#cdb8d6', r: '#5fa8ff', e: '#d07aff' }[s.w];
    B('pick' + i, 24, y, W - 48, 106, { style: 'plum', r: 16 }, () => pickSkill(s)); nine(ctx, 24, y, W - 48, 106);
    txt(ctx, { c: 'COMMON', r: 'RARE', e: 'EPIC' }[s.w], 44, y + 22, 10, col, 'left', 'Cinzel'); txt(ctx, s.name, 44, y + 46, 17, GOLD, 'left', 'Cinzel');
    wrap(ctx, s.desc + ((g.hm.skill[s.key] || 0) ? `  (gear: +${g.hm.skill[s.key]}% effect)` : ''), 44, y + 72, W - 96, 15, 12, INK, 'left'); });
  ctx.restore(); ui.oy = 0;
}
function drawStake() {
  modalBg(); const so = g.stakeOffer, oy = OY(); ctx.save(); ctx.translate(0, oy); ui.oy = oy;
  panel9(ctx, 14, 80, W - 28, 470); txt(ctx, so.boss ? 'THE LAST WAGER' : 'STAKES', W / 2, 112, 22, RED, 'center', 'Cinzel Decorative', 900);
  wrap(ctx, so.boss ? LINES.memory : 'The Hollow offer a wager on this wave. Leak nothing and you win.', W / 2, 140, W - 70, 15, 12, INK, 'center');
  if (so.t0 == null) so.t0 = now; const armed = now - so.t0 > 450; // ignore taps carried over from the board
  so.opts.forEach((o, i) => { const y = 176 + i * 76, conf = so.confirm === o.k; B('stk' + o.k, 30, y, W - 60, 66, { style: i === 3 || conf ? 'red' : 'plum', r: 14, disabled: !o.can || !armed }, () => { if (o.k === 3 && !conf) { so.confirm = 3; so.ct = now; return; } if (o.k === 3 && now - so.ct < 300) return; placeStake(o.k); });
    txt(ctx, o.name, 48, y + 20, 15, o.can ? GOLD : '#776a80', 'left', 'Cinzel'); if (conf) txt(ctx, 'TAP AGAIN TO GO ALL-IN', W - 44, y + 40, 10, GOLD, 'right', 'Cinzel'); txt(ctx, 'Risk: ' + o.risk, 48, y + 40, 11, BAD, 'left'); txt(ctx, 'Win: ' + o.win, 48, y + 55, 11, GOOD, 'left');
    if (!conf) fitTxt((LINES.heroStake[P.faction] || [])[Math.min(o.k - 1, 3)] || '', W - 44, y + 20, W - 74 - 120, 9, '#b9a8c4', 'right', 'Nunito', 600); });
  B('stk0', 30, 176 + so.opts.length * 76 + 4, W - 60, 48, { style: 'green', label: so.confirm ? 'CANCEL — NO STAKE' : 'NO STAKE — JUST FIGHT', sz: 13, disabled: !armed }, () => placeStake(0));
  ctx.restore(); ui.oy = 0;
}
function drawTutorial(MY, BY, ay) {
  const steps = ['Tap a glowing stone circle to build a tower there.', 'Pick a tower. ✈ = hits flyers. Each counters a Hollow type.', 'Press START WAVE. The Hollow walk the path to your shrine.',
    `Tap ${g.fac.hero.ability} when they bunch up, and the speed button for 2x/4x. ${P.faction === 'stone' ? 'Petrified: Stonewarden towers can never be sold.' : 'Heat: forges overheat if they fire nonstop.'}`];
  const s = steps[g.tut]; if (!s) return; const y = g.tut === 1 ? H - 112 - 116 : 54;
  panel(ctx, 12, y, W - 24, 62, 14); txt(ctx, `TUTORIAL ${g.tut + 1}/4`, 26, y + 14, 9, GOLD, 'left', 'Cinzel'); wrap(ctx, s, 26, y + 32, W - 120, 14, 11, INK, 'left', 'Nunito', 700);
  B('tutskip', W - 86, y + 12, 64, 38, { style: 'ghost', label: g.tut === 3 ? 'GOT IT' : 'SKIP', sz: 11 }, () => { g.tut = -1; P.tutDone = true; save(); });
  if (g.tut === 0) { const [c, r] = BUILD_SPOTS[3]; arrow(C(c), MY + C(r) - 22); } if (g.tut === 3) arrow(286, 52);
}

// ---------------- Scenes ----------------
function bgArt(dim = 0.55) { const im = IMG['title-bg']; ctx.fillStyle = '#120a18'; ctx.fillRect(0, 0, W, H); if (im) { const s = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s; ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); }
  const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, `rgba(18,10,24,${dim * 0.6})`); gr.addColorStop(1, `rgba(18,10,24,${Math.min(1, dim + 0.3)})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
function logo(y, w = 300) { const im = IMG['warden-wars-logo']; if (im) { const h = w * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, W / 2 - w / 2, y, w, h); return y + h; } txt(ctx, 'WARDEN WARS', W / 2, y + 30, 34, GOLD, 'center', 'Cinzel Decorative', 900); return y + 60; }
function drawTitle() {
  bgArt(0.35); const run = P.faction ? getRun() : null;
  ctx.save(); ctx.translate(0, OY()); ui.oy = OY();
  const ly = logo(70); txt(ctx, 'Defend the Veil of Nyota', W / 2, ly + 14, 13, INK, 'center', 'Cinzel', 700);
  if (P.migrated) txt(ctx, 'Your Veil of Nyota save was carried over', W / 2, ly + 34, 10, GOOD, 'center');
  let y = run ? 372 : 400;
  if (run) { B('resume', 50, y, W - 100, 56, { style: 'green', label: 'RESUME', sub: `Wave ${run.wave + 1}/${WAVES.length} · ${run.towers.length} towers`, sz: 18 }, () => newMission(run)); y += 62; }
  B('play', 50, y, W - 100, 56, { style: 'red', label: P.faction ? (run ? 'NEW MISSION' : 'PLAY') : 'BEGIN', sz: 18 }, () => { if (!P.faction) scene = 'faction'; else { clearRun(); scene = 'brief'; } }); y += run ? 62 : 66;
  if (P.faction) { B('hero', 50, y, (W - 110) / 2, 46, { style: 'gold', label: 'HERO', sz: 14 }, () => { scene = 'levelup'; }); B('arm', 60 + (W - 110) / 2, y, (W - 110) / 2, 46, { style: 'gold', label: 'ARMOURY', sz: 14 }, () => { scene = 'armoury'; });
    y += 54; B('fac', 50, y, W - 100, 40, { style: 'plum', label: 'Change faction', sz: 12 }, () => { scene = 'faction'; }); }
  txt(ctx, `Clears ${P.clears} · Best wave ${P.best} · Shards ${P.shards}`, W / 2, Math.max(632, y + 54), 10, '#b9a8c4', 'center', 'Nunito', 700);
  ctx.restore(); ui.oy = 0;
}
function drawFaction() {
  bgArt(0.7); ctx.save(); ctx.translate(0, OY()); ui.oy = OY(); txt(ctx, 'Choose your Wardens', W / 2, 40, 20, GOLD, 'center', 'Cinzel Decorative', 900);
  FACTIONS.forEach((f, i) => { const y = 70 + i * 280, hk = f.hero.key; B('f_' + f.key, 14, y, W - 28, 268, { style: 'plum', r: 18 }, () => { P.faction = f.key; save(); scene = 'brief'; }); nine(ctx, 14, y, W - 28, 268);
    drawHero(ctx, heroLook(Object.assign({}, P, { faction: f.key })), 80, y + 250, 210, now / 1000);
    txt(ctx, f.name, 150, y + 30, 18, f.accent, 'left', 'Cinzel'); txt(ctx, `${f.hero.name}, ${f.hero.title}`, 150, y + 52, 11, GOLD, 'left');
    wrap(ctx, f.blurb, 150, y + 76, 186, 15, 11, INK, 'left'); wrap(ctx, f.tradeoff, 150, y + 140, 186, 15, 11, BAD, 'left');
    f.towers.forEach((k, j) => drawSprite(ctx, TOWERS[k].sprite + '_t1', 160 + j * 36, y + 246, 40)); });
  ctx.restore(); ui.oy = 0;
}
function drawBrief() {
  bgArt(0.75); ctx.save(); ctx.translate(0, OY()); ui.oy = OY(); const f = FACTIONS.find(x => x.key === P.faction);
  txt(ctx, 'ACT I · The Thinning Rim', W / 2, 50, 16, GOLD, 'center', 'Cinzel'); panel9(ctx, 14, 74, W - 28, 150);
  if (IMG['portrait-mosa']) { ctx.save(); rr(ctx, 26, 88, 70, 70, 14); ctx.clip(); ctx.drawImage(IMG['portrait-mosa'], 26, 88, 70, 70); ctx.restore(); }
  txt(ctx, 'Elder Mosa', 108, 96, 13, GOLD, 'left', 'Cinzel'); wrap(ctx, LINES.mosaBrief, 108, 118, 220, 15, 11, INK, 'left');
  panel9(ctx, 14, 236, W - 28, 112); const hk = f.hero.key; const pi = IMG[`${hk}_portrait_evo${P.heroes[hk].evo + 1}`]; if (pi) { ctx.save(); rr(ctx, 26, 250, 70, 70, 14); ctx.clip(); ctx.drawImage(pi, 26, 250, 70, 70); ctx.restore(); }
  txt(ctx, f.hero.name, 108, 258, 13, GOLD, 'left', 'Cinzel'); wrap(ctx, LINES.heroBrief[P.faction], 108, 280, 220, 15, 11, INK, 'left');
  wrap(ctx, `10 waves. Harpies and Moths fly straight over the path — build ${P.faction === 'stone' ? 'Hook Slings or Vein Shards' : 'Spark Pots'} for them. Stakes are offered before waves 3, 6, 9 and the boss.`, W / 2, 380, W - 50, 16, 11, '#cdb8d6', 'center');
  B('go', 50, 470, W - 100, 58, { style: 'red', label: 'DEFEND THE VEIL', sz: 17 }, () => newMission()); B('back', 50, 540, W - 100, 42, { style: 'plum', label: 'Back', sz: 12 }, () => { scene = 'title'; });
  ctx.restore(); ui.oy = 0;
}
function drawResult() {
  bgArt(0.8); const r = result; ctx.save(); ctx.translate(0, OY()); ui.oy = OY();
  txt(ctx, r.win ? 'VEIL HELD' : 'THE VEIL TORE', W / 2, 60, 26, r.win ? GOLD : RED, 'center', 'Cinzel Decorative', 900);
  txt(ctx, '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars), W / 2, 100, 30, GOLD, 'center'); if (r.win) wrap(ctx, LINES.win, W / 2, 134, W - 60, 15, 11, INK, 'center');
  panel9(ctx, 20, 160, W - 40, 150); [['Waves', `${r.wave}/${WAVES.length}`], ['Hollow cleared', r.kills], ['Hero XP', '+' + r.xp], ['Remembrance shards', '+' + r.shards], ['Hero level', r.from === r.to ? `Lv ${r.to}` : `Lv ${r.from} → ${r.to}`]].forEach(([a, b], i) => { txt(ctx, a, 40, 182 + i * 25, 12, INK, 'left'); txt(ctx, String(b), W - 40, 182 + i * 25, 12, i === 4 && r.from !== r.to ? GOOD : GOLD, 'right'); });
  txt(ctx, 'DROPS', 32, 330, 12, GOLD, 'left', 'Cinzel'); if (!r.drops.length) txt(ctx, 'None this time.', 32, 352, 11, '#a99bb3', 'left');
  r.drops.slice(0, 3).forEach((it, i) => { txt(ctx, it.name, 32, 352 + i * 34, 12, RARITY[it.rar].color, 'left'); fitTxt(statTxt(it) + (it.aff.length ? ' · ' + it.aff.map(affText).join(' · ') : ''), 32, 368 + i * 34, W - 64, 10, '#cdb8d6', 'left', 'Nunito', 700); });
  B('toHero', 40, 476, W - 80, 52, { style: r.from !== r.to ? 'green' : 'gold', label: r.from !== r.to ? 'LEVEL UP!' : 'HERO & EVOLUTION', sz: 15 }, () => { scene = 'levelup'; });
  B('again', 40, 538, (W - 90) / 2, 46, { style: 'red', label: 'AGAIN', sz: 14 }, () => newMission()); B('menu', 50 + (W - 90) / 2, 538, (W - 90) / 2, 46, { style: 'plum', label: 'MENU', sz: 14 }, () => { scene = 'title'; });
  ctx.restore(); ui.oy = 0;
}
function drawLevelup() {
  bgArt(0.85); const hk = heroKey(P.faction), st = P.heroes[hk], ev = EVOS[hk]; ctx.save(); ctx.translate(0, OY()); ui.oy = OY();
  txt(ctx, `${FACTIONS.find(f => f.key === P.faction).hero.name}`, W / 2, 36, 22, GOLD, 'center', 'Cinzel Decorative', 900); txt(ctx, `Lv ${st.lvl}/${HERO_MAX_LVL} · ${ev[st.evo].name}`, W / 2, 62, 12, INK, 'center');
  const need = PROFILE_XP(st.lvl); ctx.fillStyle = 'rgba(0,0,0,0.5)'; rr(ctx, 40, 76, W - 80, 10, 5); ctx.fill(); ctx.fillStyle = GOOD; rr(ctx, 40, 76, (W - 80) * Math.min(1, st.xp / need), 10, 5); ctx.fill(); txt(ctx, `${st.xp}/${need} XP`, W / 2, 98, 10, '#cdb8d6', 'center');
  const k = Math.min(1, (now - evoFx) / 900); if (k < 1) { ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(W / 2, 250, 40 + k * 160, 0, 7); ctx.fill(); ctx.restore(); }
  drawHero(ctx, heroLook(P), W / 2, 330, 220, now / 1000);
  ev.forEach((e, i) => { const x = 22 + i * 108, y = 350, on = st.evo >= i; ctx.fillStyle = on ? 'rgba(95,208,138,0.16)' : 'rgba(0,0,0,0.45)'; rr(ctx, x, y, 100, 120, 12); ctx.fill(); ctx.strokeStyle = on ? GOOD : 'rgba(242,193,78,0.4)'; ctx.stroke();
    ctx.save(); if (!on) ctx.filter = 'grayscale(1) brightness(0.6)'; drawSprite(ctx, `${hk}_evo${i + 1}`, x + 50, y + 84, 76); ctx.restore();
    fitTxt(e.name, x + 50, y + 96, 92, 10, on ? GOOD : INK, 'center', 'Cinzel'); txt(ctx, i ? `Lv ${e.lvl} · ${e.cost} shards` : 'Start', x + 50, y + 111, 9, '#b9a8c4', 'center', 'Nunito', 700); });
  const nx = ev[st.evo + 1];
  if (nx) B('evolve', 40, 484, W - 80, 54, { style: canEvolve(hk) ? 'green' : 'plum', label: `EVOLVE → ${nx.name}`, sub: `needs Lv ${nx.lvl} & ${nx.cost} shards (you have ${P.shards})`, sz: 13, disabled: !canEvolve(hk) }, () => evolve(hk));
  else txt(ctx, 'Fully evolved', W / 2, 510, 14, GOLD, 'center', 'Cinzel');
  B('toArm', 40, 548, (W - 90) / 2, 46, { style: 'gold', label: 'ARMOURY', sz: 13 }, () => { scene = 'armoury'; }); B('lvBack', 50 + (W - 90) / 2, 548, (W - 90) / 2, 46, { style: 'plum', label: 'MENU', sz: 13 }, () => { scene = 'title'; });
  ctx.restore(); ui.oy = 0;
}
function drawArmoury() {
  bgArt(0.88); const hk = heroKey(P.faction), st = P.heroes[hk]; ctx.save(); ctx.translate(0, OY()); ui.oy = OY();
  txt(ctx, 'ARMOURY', W / 2, 28, 20, GOLD, 'center', 'Cinzel Decorative', 900); drawHero(ctx, heroLook(P), 74, 230, 190, now / 1000);
  SLOTS.forEach((s, i) => { const x = 150 + (i % 2) * 104, y = 52 + Math.floor(i / 2) * 58, it = st.equip[s.key] ? P.inv.find(v => v.id === st.equip[s.key]) : null;
    B('sl_' + s.key, x, y, 98, 50, { style: armSlot === s.key ? 'gold' : 'plum', r: 12 }, () => { armSlot = s.key; armPage = 0; });
    txt(ctx, s.label + (s.visible ? ' 👁' : ''), x + 8, y + 14, 10, armSlot === s.key ? '#2a1606' : '#cdb8d6', 'left'); fitTxt(it ? it.name : '— empty —', x + 8, y + 34, 84, 10, it ? RARITY[it.rar].color : '#776a80', 'left', 'Nunito', 800); });
  const m = heroMods(hk); fitTxt(`Gear: +${m.dmg}% dmg · +${m.range} rng · +${m.hp} lives · -${m.cd}% cd · +${m.kin}% towers`, W / 2, 238, W - 20, 10, GOOD, 'center', 'Nunito', 700);
  const items = P.inv.filter(i => i.slot === armSlot).sort((a, b) => b.rar - a.rar);
  txt(ctx, `${SLOTS.find(s => s.key === armSlot).label} items (${items.length})`, 16, 258, 12, GOLD, 'left', 'Cinzel');
  if (!items.length) wrap(ctx, 'No items yet. Clear missions for drops; win a boss Memory stake for a Remembered relic.', 16, 282, W - 32, 15, 11, '#a99bb3', 'left');
  const PER = 5, pages = Math.max(1, Math.ceil(items.length / PER)); armPage = clamp(armPage, 0, pages - 1); // iter2d: paginate (was capped at 5)
  if (pages > 1) { B('armPrev', 12, 556, 80, 30, { style: 'plum', label: '‹ PREV', sz: 11, r: 10, disabled: armPage === 0 }, () => { armPage--; });
    txt(ctx, `${armPage + 1} / ${pages}`, W / 2, 576, 12, '#cdb8d6', 'center', 'Nunito', 800);
    B('armNext', W - 92, 556, 80, 30, { style: 'plum', label: 'NEXT ›', sz: 11, r: 10, disabled: armPage >= pages - 1 }, () => { armPage++; }); }
  items.slice(armPage * PER, armPage * PER + PER).forEach((it, i) => { const y = 272 + i * 56, on = st.equip[it.slot] === it.id; B('it' + it.id, 12, y, W - 24, 50, { style: on ? 'green' : 'plum', r: 12 }, () => equip(it));
    txt(ctx, it.name + (on ? '  (equipped)' : ''), 24, y + 14, 12, on ? '#0c2a18' : RARITY[it.rar].color, 'left'); fitTxt(statTxt(it) + (it.aff.length ? ' · ' + it.aff.map(affText).join(' · ') : ''), 24, y + 34, W - 52, 10, on ? '#0c2a18' : '#cdb8d6', 'left', 'Nunito', 700); });
  B('armBack', 40, 594, W - 80, 40, { style: 'plum', label: 'BACK', sz: 13 }, () => { scene = 'levelup'; });
  ctx.restore(); ui.oy = 0;
}

// ---------------- Loop, resize, boot ----------------
let last = 0, DPR = 1;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  H = Math.round(clamp(W * vh / vw, 640, 800)); // tall phones: grow the logical height so the game fills the screen
  SCALE = Math.min(vw / W, vh / H); DPR = Math.min(3, window.devicePixelRatio || 1);
  cv.style.width = Math.round(W * SCALE) + 'px'; cv.style.height = Math.round(H * SCALE) + 'px';
  cv.width = Math.round(W * SCALE * DPR); cv.height = Math.round(H * SCALE * DPR);
  if (artReady) buildMap(SCALE * DPR);
}
function frame(ts) {
  const dtR = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; now = ts; tReal += dtR;
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ui.hits = [];
  try {
    if (!artReady) { ctx.fillStyle = '#120a18'; ctx.fillRect(0, 0, W, H); txt(ctx, 'WARDEN WARS', W / 2, H / 2, 26, GOLD, 'center', 'Cinzel Decorative', 900); txt(ctx, 'Loading…', W / 2, H / 2 + 34, 12, INK, 'center'); }
    else if (scene === 'game') {
      if (!g.offer && !g.stakeOffer) for (let i = 0; i < g.speed; i++) update(dtR);
      if (g.toast) { g.toast.t -= dtR; if (g.toast.t <= 0) g.toast = null; } if (g.banner) { g.banner.t -= dtR; if (g.banner.t <= 0) g.banner = null; } if (g.raiseT > 0) g.raiseT -= dtR;
      drawGame();
    }
    else ({ title: drawTitle, faction: drawFaction, brief: drawBrief, result: drawResult, levelup: drawLevelup, armoury: drawArmoury }[scene] || drawTitle)();
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
P = loadProfile();
if (!P.inv.length) { P.inv.push(genItem(0, 'weapon', P.faction || 'stone'), genItem(1, 'helm', P.faction || 'stone'), genItem(0, 'mantle', P.faction || 'stone')); save(); }
window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize(); loadArt(() => { resize(); });
if (document.fonts && document.fonts.load) ['Cinzel Decorative', 'Cinzel', 'Nunito'].forEach(f => document.fonts.load(`800 16px "${f}"`).catch(() => {}));
requestAnimationFrame(frame);
// test hooks
window.WW = window.VON = {
  get scene() { return scene; }, set scene(s) { scene = s; }, get g() { return g; }, get P() { return P; }, get ui() { return ui; },
  start(fac = 'stone') { P.faction = fac; save(); newMission(); }, build, upgrade, callWave, cycleSpeed, pickSkill, placeStake, useAbility, endMission, snapshot, getRun, evolve, equip, genItem,
  tick(n, dt = 1 / 30) { for (let i = 0; i < n && g && !g.over; i++) update(dt); }, setWaves(w) { WAVES.splice(0, WAVES.length, ...w); },
  hits: () => ui.hits.map(h => ({ id: h.id, x: h.hx, y: h.hy, w: h.hw, h: h.hh })), H: () => H,
};
})();
