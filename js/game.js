// Veil of Nyota — iteration 1. Vanilla canvas, logical 360x640 portrait, scaled to fit.
'use strict';
(() => {
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let scale = 1, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  cv.style.width = Math.floor(W * scale) + 'px'; cv.style.height = Math.floor(H * scale) + 'px';
  cv.width = Math.floor(W * scale * dpr); cv.height = Math.floor(H * scale * dpr);
}
window.addEventListener('resize', resize); resize();

buildSprites();
const MAP = buildMap();
const titleBg = new Image(); titleBg.src = 'assets/title-bg.jpg';

// ---------- Profile (localStorage) ----------
const PKEY = 'von_profile_v1';
function defaultProfile() { return { xp: 0, gear: { weapon: null, charm: null, relic: null }, inv: [], stars: {}, wins: 0, losses: 0, faction: 'stone' }; }
let profile;
try { profile = Object.assign(defaultProfile(), JSON.parse(localStorage.getItem(PKEY) || '{}')); } catch (e) { profile = defaultProfile(); }
const saveProfile = () => { try { localStorage.setItem(PKEY, JSON.stringify(profile)); } catch (e) {} };
const level = () => 1 + Math.floor(profile.xp / 100);
const gearVal = (slot) => { const it = profile.gear[slot]; return it ? GEAR[slot].vals[it.r] / 100 : 0; };

// ---------- Path helpers ----------
const segLen = []; let PATH_LEN = 0;
for (let i = 0; i < PATH.length - 1; i++) { const l = Math.hypot(PATH[i + 1].x - PATH[i].x, PATH[i + 1].y - PATH[i].y); segLen.push(l); PATH_LEN += l; }
function posAt(d) {
  let i = 0;
  while (i < segLen.length - 1 && d > segLen[i]) { d -= segLen[i]; i++; }
  const a = PATH[i], b = PATH[i + 1], f = Math.max(0, Math.min(1, d / segLen[i]));
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
function nearestD(x, y) { let best = 0, bd = 1e9; for (let d = 0; d < PATH_LEN; d += 4) { const p = posAt(d), q = Math.hypot(p.x - x, p.y - y); if (q < bd) { bd = q; best = d; } } return best; }

// ---------- Input / buttons ----------
let buttons = [];
function btn(x, y, w, h, fn, opts = {}) { buttons.push({ x, y, w, h, fn, id: opts.id }); }
function toLogical(ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H }; }
cv.addEventListener('pointerdown', ev => {
  ev.preventDefault(); Sfx.ensure();
  const p = toLogical(ev); tap(p.x, p.y);
});
function tap(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) { const b = buttons[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); return true; } }
  if (scene === 'game') mapTap(x, y);
  return false;
}
window.addEventListener('keydown', e => { if (scene === 'game' && g && (e.key === ' ')) { callWave(); } if (e.key === 'm') Sfx.toggle(); });

// ---------- Drawing helpers ----------
function txt(s, x, y, size = 12, col = '#fff', align = 'left', shadow = true) {
  ctx.font = `bold ${size}px "Courier New", monospace`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (shadow) { ctx.fillStyle = PAL.ink; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function wrap(s, x, y, maxW, size = 11, col = '#ddd', lh = 14) {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  const words = s.split(' '); let line = '', yy = y;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { txt(line, x, yy, size, col); line = w; yy += lh; } else line = t; }
  if (line) txt(line, x, yy, size, col); return yy + lh;
}
function panel(x, y, w, h, fill = PAL.deep, rim = PAL.goldD) {
  ctx.fillStyle = PAL.ink; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = rim; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
}
function button(x, y, w, h, label, fn, { col = PAL.blue, size = 13, disabled = false, sub = null, subCol = PAL.gold } = {}) {
  panel(x, y, w, h, disabled ? '#2a2f40' : col, disabled ? '#444a5a' : PAL.gold);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 2, y + 2, w - 4, 3);
  if (sub) { txt(label, x + w / 2, y + h / 2 - 7, size, disabled ? '#888' : '#fff', 'center'); txt(sub, x + w / 2, y + h / 2 + 8, 11, disabled ? '#777' : subCol, 'center'); }
  else txt(label, x + w / 2, y + h / 2 + 1, size, disabled ? '#888' : '#fff', 'center');
  btn(x, y, w, h, () => { if (!disabled) { Sfx.play('ui'); fn(); } });
}
function spr(name, x, y, flash = false, alpha = 1) { // draw centred-bottom at x,y
  const s = SPR[flash ? name + 'W' : name] || SPR[name]; if (!s) return;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height));
  ctx.globalAlpha = 1;
}
function iconButtons() { // mute toggle, top-right, shared across scenes
  const x = W - 34, y = 6;
  panel(x, y, 28, 28, PAL.night);
  ctx.fillStyle = PAL.gold; ctx.fillRect(x + 7, y + 11, 4, 7); ctx.beginPath(); ctx.moveTo(x + 11, y + 11); ctx.lineTo(x + 16, y + 7); ctx.lineTo(x + 16, y + 22); ctx.lineTo(x + 11, y + 18); ctx.fill();
  if (Sfx.muted) { ctx.strokeStyle = PAL.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 18, y + 10); ctx.lineTo(x + 24, y + 19); ctx.moveTo(x + 24, y + 10); ctx.lineTo(x + 18, y + 19); ctx.stroke(); }
  else { ctx.fillRect(x + 19, y + 10, 2, 9); ctx.fillRect(x + 22, y + 8, 2, 13); }
  btn(x, y, 28, 28, () => Sfx.toggle());
}

// ---------- Scenes ----------
let scene = 'title', sceneT = 0, chosen = null, g = null, result = null;
function go(s) { scene = s; sceneT = 0; }

function drawTitle() {
  if (titleBg.complete && titleBg.naturalWidth) ctx.drawImage(titleBg, 0, 0, W, H);
  else { ctx.fillStyle = PAL.night; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = 'rgba(6,11,28,0.45)'; ctx.fillRect(0, 0, W, H);
  const bob = Math.sin(sceneT * 2) * 3;
  panel(30, 120 + bob, 300, 92, 'rgba(11,20,48,0.85)');
  txt('VEIL OF', W / 2, 146 + bob, 22, PAL.ice, 'center');
  txt('NYOTA', W / 2, 180 + bob, 40, PAL.gold, 'center');
  txt('A tower defence of remembrance', W / 2, 232, 11, '#e8dcc0', 'center');
  button(80, 420, 200, 50, 'PLAY', () => go('faction'), { size: 18, col: PAL.ochreD });
  button(80, 482, 200, 40, 'PROFILE', () => go('profile'));
  txt('Lv ' + level() + '  ·  Act I prototype', W / 2, 600, 11, '#c8c0a8', 'center');
  txt('Sound is muted by default ->', W - 40, 20, 9, '#c8c0a8', 'right');
  iconButtons();
}

function drawFaction() {
  ctx.fillStyle = PAL.night; ctx.fillRect(0, 0, W, H);
  txt('CHOOSE YOUR PEOPLE', W / 2, 30, 16, PAL.gold, 'center');
  const cw = 168, ch = 74;
  FACTIONS.forEach((f, i) => {
    const x = 8 + (i % 2) * (cw + 8), y = 54 + Math.floor(i / 2) * (ch + 8);
    const sel = chosen === f.key;
    panel(x, y, cw, ch, f.playable ? (sel ? PAL.blue : PAL.deep) : '#151a28', sel ? PAL.gold : (f.playable ? f.accent : '#3a3f50'));
    ctx.fillStyle = f.accent; ctx.fillRect(x + 6, y + 8, 4, ch - 16);
    txt(f.name, x + 16, y + 18, 12, f.playable ? '#fff' : '#777');
    if (f.playable) {
      spr(f.key === 'stone' ? 'heroStone' : 'heroForge', x + cw - 26, y + ch - 6);
      wrap(f.key === 'stone' ? 'Maze / tank' : 'Burst / splash', x + 16, y + 38, 100, 10, f.accent);
    } else { spr('lock', x + cw - 20, y + ch - 12); txt('Freed later', x + 16, y + 40, 10, '#666'); }
    if (f.playable) btn(x, y, cw, ch, () => { chosen = f.key; profile.faction = f.key; saveProfile(); Sfx.play('ui'); });
  });
  const f = FACTIONS.find(f => f.key === chosen);
  const y0 = 386;
  panel(8, y0, W - 16, 170, PAL.deep);
  if (f) {
    txt(f.full, 18, y0 + 16, 13, f.accent);
    let yy = wrap('Gift: ' + f.blurb, 18, y0 + 36, W - 40, 10, '#e8dcc0', 13);
    yy = wrap('Price: ' + f.tradeoff, 18, yy + 2, W - 40, 10, PAL.redL, 13);
    yy = wrap('Hero: ' + f.hero.name + ' — ' + f.hero.ability + ': ' + f.hero.abilityDesc, 18, yy + 2, W - 40, 10, PAL.ice, 13);
    wrap('Towers: ' + f.towers.map(t => TOWERS[t].name[0]).join(', '), 18, yy + 2, W - 40, 10, '#c8c0a8', 13);
  } else wrap('Tap Stonewardens or Emberforged. The other six peoples are freed as the campaign unfolds.', 18, y0 + 20, W - 40, 11, '#c8c0a8');
  txt('ACT I · MISSION 1: THE THINNING RIM', W / 2, 572, 10, PAL.gold, 'center');
  button(8, 584, 100, 46, 'BACK', () => go('title'));
  button(116, 584, W - 124, 46, 'BEGIN', () => startMission(chosen), { disabled: !f, col: PAL.ochreD, size: 16 });
}

function drawProfile() {
  ctx.fillStyle = PAL.night; ctx.fillRect(0, 0, W, H);
  txt('PROFILE', W / 2, 30, 18, PAL.gold, 'center');
  panel(12, 56, W - 24, 70);
  txt('Level ' + level(), 24, 76, 16, '#fff');
  const xpIn = profile.xp % 100; ctx.fillStyle = PAL.ink; ctx.fillRect(24, 94, 200, 10); ctx.fillStyle = PAL.gold; ctx.fillRect(24, 94, 2 * xpIn, 10);
  txt(xpIn + '/100 xp', 232, 99, 10, '#c8c0a8');
  txt('Wins ' + profile.wins + '  Losses ' + profile.losses, 24, 116, 10, '#c8c0a8');
  txt('Hero gear (tap a slot to swap)', 16, 146, 12, PAL.ice);
  ['weapon', 'charm', 'relic'].forEach((slot, i) => {
    const y = 160 + i * 66, it = profile.gear[slot];
    panel(12, y, W - 24, 58, PAL.deep, it ? RARITY[it.r].color : '#3a3f50');
    if (it) spr('gear_' + slot + it.r, 40, y + 46);
    txt(GEAR[slot].label, 66, y + 14, 11, '#c8c0a8');
    txt(it ? GEAR[slot].names[it.r] : '— empty —', 66, y + 30, 12, it ? RARITY[it.r].color : '#666');
    txt(it ? `+${GEAR[slot].vals[it.r]}% ${GEAR[slot].stat}` : GEAR[slot].stat, 66, y + 45, 10, it ? PAL.gold : '#666');
    const owned = profile.inv.filter(x => x.slot === slot).length;
    txt(owned + ' owned', W - 24, y + 14, 10, '#888', 'right');
    btn(12, y, W - 24, 58, () => cycleGear(slot));
  });
  txt('Mission stars', 16, 372, 12, PAL.ice);
  panel(12, 386, W - 24, 70);
  ['stone', 'forge'].forEach((fk, i) => {
    const s = profile.stars['a1m1_' + fk] || 0, y = 404 + i * 30;
    txt('Act I-1 · ' + FACTIONS.find(f => f.key === fk).name, 24, y, 11, '#fff');
    for (let k = 0; k < 3; k++) star(W - 80 + k * 20, y, k < s);
  });
  txt('Gear boosts your hero tower in every mission.', W / 2, 480, 10, '#c8c0a8', 'center');
  button(12, 584, 120, 46, 'BACK', () => go('title'));
  button(140, 584, W - 152, 46, 'PLAY', () => go('faction'), { col: PAL.ochreD });
  iconButtons();
}
function star(x, y, on) {
  ctx.fillStyle = on ? PAL.gold : '#3a3f50';
  ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.fill();
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1; ctx.stroke();
}
function cycleGear(slot) {
  const opts = profile.inv.filter(x => x.slot === slot).sort((a, b) => b.r - a.r);
  if (!opts.length) return;
  const cur = profile.gear[slot]; const idx = cur ? opts.findIndex(o => o.id === cur.id) : -1;
  profile.gear[slot] = opts[(idx + 1) % opts.length]; saveProfile(); Sfx.play('ui');
}

// ---------- Mission ----------
function startMission(fk) {
  const f = FACTIONS.find(x => x.key === fk); if (!f) return;
  const hero = { spot: -1, type: 'hero', tier: 0, x: C(HERO_SPOT[0]), y: C(HERO_SPOT[1]), cd: 0.5, heat: 0, over: 0, isHero: true, lvl: 0 };
  g = {
    f, gold: START_GOLD, lives: START_LIVES + (fk === 'stone' ? 5 : 0), maxLives: 0, wave: 0, spawning: null,
    enemies: [], towers: [hero], shots: [], fx: [], texts: [], burns: [], sel: null, speed: 1, t: 0,
    abilityCd: 3, wall: null, shake: 0, over: false, kills: 0, waveDone: true, leaks: 0
  };
  g.maxLives = g.lives; g.hero = hero; g.heroWallD = nearestD(hero.x, hero.y);
  go('game'); Sfx.play('wave');
}
const abilityMaxCd = () => g.f.hero.cd * (1 - gearVal('charm'));
const abilityPower = () => 1 + gearVal('relic');
const heroDmgMul = () => (1 + gearVal('weapon')) * (1 + 0.03 * (level() - 1)) * (1 + 0.3 * g.hero.lvl);

function towerStats(t) {
  if (t.isHero) { const h = g.f.hero; return { dmg: h.dmg * heroDmgMul(), rate: h.rate, range: h.range, splash: h.splash, kind: h.splash ? 'shell' : 'bolt', pierce: h.pierce || 0 }; }
  const d = TOWERS[t.type], s = d.tiers[t.tier];
  return Object.assign({ kind: d.kind, pierce: d.pierce || 0, shred: d.shred, heat: d.heat }, s);
}
function spent(t) { const d = TOWERS[t.type]; let s = 0; for (let i = 0; i <= t.tier; i++) s += d.tiers[i].cost; return s; }

function callWave() {
  if (!g || g.over || g.wave >= WAVES.length) return;
  if (g.spawning) return; // finish spawning current wave first
  if (!g.waveDone) { g.gold += 15; floatText(W / 2, 520, '+15 early call', PAL.gold); }
  const groups = WAVES[g.wave].map(([type, n, gap]) => ({ type, n, gap }));
  g.spawning = { groups, gi: 0, left: groups[0].n, timer: 0 };
  g.wave++; g.waveDone = false; Sfx.play('wave');
  g.banner = { txt: g.wave === WAVES.length ? 'FINAL WAVE: THE HERALD COMES' : 'WAVE ' + g.wave, t: 1.6 };
}
function spawn(type) {
  const d = ENEMIES[type], s = waveHpScale(g.wave - 1);
  const hp = Math.round(d.hp * (d.boss ? 1 : s));
  const p = posAt(0);
  g.enemies.push({ type, hp, maxHp: hp, spd: d.spd * (0.95 + Math.random() * 0.1), armour: d.armour, d: 0, x: p.x, y: p.y, flash: 0, stun: 0, shred: 0, boss: !!d.boss, r: d.r, gold: d.gold, lives: d.lives, anim: Math.random() });
}
function floatText(x, y, s, col = '#fff', size = 11) { g.texts.push({ x, y, s, col, t: 0.9, size }); }

function damage(e, amt, pierce = 0) {
  if (e.hp <= 0) return;
  const arm = Math.max(0, e.armour - (e.shred > 0 ? 0.3 : 0)) * (1 - pierce);
  const dmg = Math.max(1, Math.round(amt * (1 - arm)));
  e.hp -= dmg; e.flash = 0.09;
  floatText(e.x + (Math.random() * 10 - 5), e.y - e.r * 2 - 4, String(dmg), arm > 0.2 ? '#aab' : (dmg >= 60 ? PAL.gold : '#fff'), dmg >= 60 ? 13 : 10);
  if (e.boss) g.shake = Math.max(g.shake, 0.06);
  if (e.hp <= 0) {
    g.gold += e.gold; g.kills++;
    floatText(e.x, e.y - 30, '+' + e.gold, PAL.gold, 11);
    for (let i = 0; i < (e.boss ? 30 : 7); i++) g.fx.push({ k: 'shard', x: e.x, y: e.y - e.r, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 120, t: 0.6 });
    if (e.boss) { g.shake = 0.5; Sfx.play('boom'); }
    Sfx.play('die');
  } else Sfx.play('hit');
}

function fire(t, target, st) {
  const k = st.kind;
  if (k === 'slam') {
    g.fx.push({ k: 'ring', x: t.x, y: t.y, r: st.range, t: 0.3, col: PAL.sand });
    for (const e of g.enemies) if (e.hp > 0 && Math.hypot(e.x - t.x, e.y - t.y) <= st.range) { damage(e, st.dmg, 0.2); e.shred = 3; }
    Sfx.play('boom');
  } else if (k === 'beam') {
    const ang = Math.atan2(target.y - t.y, target.x - t.x), L = st.range + 20;
    const ex = t.x + Math.cos(ang) * L, ey = t.y + Math.sin(ang) * L;
    g.fx.push({ k: 'beam', x: t.x, y: t.y - 22, x2: ex, y2: ey, t: 0.18 });
    for (const e of g.enemies) { if (e.hp <= 0) continue; if (segDist(e.x, e.y, t.x, t.y, ex, ey) < 14 + e.r) damage(e, st.dmg, st.pierce); }
    Sfx.play('shoot');
  } else {
    g.shots.push({ k, x: t.x, y: t.y - 22, tgt: target, tx: target.x, ty: target.y, spd: k === 'bolt' ? 360 : 230, st, hero: t.isHero, tier: t.tier, col: g.f.key === 'stone' ? PAL.ice : PAL.ember });
    Sfx.play('shoot');
  }
}
function segDist(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let u = ((px - x1) * dx + (py - y1) * dy) / l; u = Math.max(0, Math.min(1, u)); return Math.hypot(px - x1 - u * dx, py - y1 - u * dy); }

function useAbility() {
  if (!g || g.abilityCd > 0 || g.over) return;
  const pw = abilityPower(); const alive = g.enemies.filter(e => e.hp > 0);
  if (g.f.key === 'stone') {
    const lead = alive.reduce((a, e) => (!a || e.d > a.d ? e : a), null);
    let d = g.heroWallD; if (lead && lead.d >= d - 10) d = Math.min(PATH_LEN - 30, lead.d + 24);
    g.wall = { d, t: 6 * pw, ...posAt(d) };
    for (const e of alive) if (Math.abs(e.d - d) < 60) damage(e, 30 * pw, 0.5);
    g.shake = 0.25;
  } else {
    if (!alive.length) return;
    const tgt = alive.find(e => e.boss) || alive.reduce((a, e) => (e.d > a.d ? e : a));
    g.fx.push({ k: 'anvil', x: tgt.x, y: tgt.y, t: 0.4, pw, tgt });
  }
  g.abilityCd = abilityMaxCd(); Sfx.play('ability');
}
function anvilImpact(x, y, pw) {
  g.shake = 0.35; Sfx.play('boom');
  g.fx.push({ k: 'ring', x, y, r: 60, t: 0.35, col: PAL.ember });
  for (const e of g.enemies) if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) < 60) { damage(e, 260 * pw, 0.5); e.stun = Math.max(e.stun, 2); }
  g.burns.push({ x, y, r: 46, dps: 30 * pw, t: 4 });
}

function update(dt) {
  g.t += dt;
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  g.shake = Math.max(0, g.shake - dt);
  if (g.over) return;
  g.abilityCd = Math.max(0, g.abilityCd - dt);
  // spawning
  const sp = g.spawning;
  if (sp) {
    sp.timer -= dt;
    if (sp.timer <= 0) {
      const gr = sp.groups[sp.gi]; spawn(gr.type); sp.left--; sp.timer = gr.gap;
      if (sp.left <= 0) { sp.gi++; if (sp.gi >= sp.groups.length) g.spawning = null; else { sp.left = sp.groups[sp.gi].n; sp.timer = 1.2; } }
    }
  }
  // wall
  if (g.wall) { g.wall.t -= dt; if (g.wall.t <= 0) g.wall = null; }
  // enemies
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    e.flash = Math.max(0, e.flash - dt); e.shred = Math.max(0, e.shred - dt); e.anim += dt;
    if (e.stun > 0) { e.stun -= dt; continue; }
    let nd = e.d + e.spd * dt;
    if (g.wall && e.d <= g.wall.d && nd > g.wall.d) nd = g.wall.d;
    e.d = nd; const p = posAt(e.d); e.x = p.x; e.y = p.y;
    if (e.d >= PATH_LEN) {
      e.hp = 0; e.leaked = true; g.lives -= e.lives; g.leaks += e.lives; g.shake = 0.2; Sfx.play('leak');
      floatText(C(4), C(13) - 30, '-' + e.lives + ' Veil', PAL.redL, 13);
      if (g.lives <= 0) { g.lives = 0; endMission(false); return; }
    }
  }
  // burns
  for (const b of g.burns) { b.t -= dt; for (const e of g.enemies) if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < b.r) { e._burn = (e._burn || 0) + b.dps * dt; if (e._burn >= 6) { damage(e, e._burn, 0.6); e._burn = 0; } } }
  g.burns = g.burns.filter(b => b.t > 0);
  // towers
  for (const t of g.towers) {
    const st = towerStats(t);
    if (st.heat) {
      if (t.over > 0) { t.over -= dt; if (t.over <= 0) t.heat = 35; continue; }
      t.heat = Math.max(0, t.heat - 9 * dt);
    }
    t.cd -= dt; if (t.cd > 0) continue;
    let tgt = null;
    for (const e of g.enemies) if (e.hp > 0 && Math.hypot(e.x - t.x, e.y - t.y) <= st.range && (!tgt || e.d > tgt.d)) tgt = e;
    if (!tgt) continue;
    fire(t, tgt, st); t.cd = st.rate; t.recoil = 0.12;
    if (st.heat) { t.heat += st.heat; if (t.heat >= 100) { t.heat = 100; t.over = 4; Sfx.play('heat'); floatText(t.x, t.y - 40, 'OVERHEAT', PAL.ember, 11); } }
  }
  for (const t of g.towers) if (t.recoil) t.recoil = Math.max(0, t.recoil - dt);
  // shots
  for (const s of g.shots) {
    if (s.tgt && s.tgt.hp > 0) { s.tx = s.tgt.x; s.ty = s.tgt.y - s.tgt.r; }
    const dx = s.tx - s.x, dy = s.ty - s.y, dist = Math.hypot(dx, dy), step = s.spd * dt;
    if (dist <= step) {
      s.done = true; const st = s.st;
      if (s.k === 'bolt') { if (s.tgt && s.tgt.hp > 0) { damage(s.tgt, st.dmg, st.pierce); if (st.stun && Math.random() < 0.35) s.tgt.stun = Math.max(s.tgt.stun, st.stun); } }
      else if (s.k === 'shell') { g.fx.push({ k: 'ring', x: s.tx, y: s.ty, r: st.splash, t: 0.25, col: PAL.ember }); for (const e of g.enemies) if (e.hp > 0 && Math.hypot(e.x - s.tx, e.y - s.ty) <= st.splash) damage(e, st.dmg, st.pierce); Sfx.play('boom'); }
      else if (s.k === 'slag') { if (s.tgt && s.tgt.hp > 0) damage(s.tgt, st.dmg, 0); g.burns.push({ x: s.tx, y: s.ty + 6, r: 28, dps: st.burn, t: 2.6 }); }
    } else { s.x += dx / dist * step; s.y += dy / dist * step; }
  }
  g.shots = g.shots.filter(s => !s.done);
  // fx
  for (const f of g.fx) {
    f.t -= dt;
    if (f.k === 'shard') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; }
    if (f.k === 'anvil' && f.t <= 0 && !f.hit) { f.hit = true; const x = f.tgt.hp > 0 ? f.tgt.x : f.x, y = f.tgt.hp > 0 ? f.tgt.y : f.y; anvilImpact(x, y, f.pw); }
  }
  g.fx = g.fx.filter(f => f.t > 0);
  for (const tx of g.texts) { tx.t -= dt; tx.y -= 28 * dt; }
  g.texts = g.texts.filter(t => t.t > 0);
  g.enemies = g.enemies.filter(e => e.hp > 0);
  // wave clear
  if (!g.spawning && !g.waveDone && g.enemies.length === 0) {
    g.waveDone = true; const bonus = 20 + 6 * g.wave; g.gold += bonus;
    floatText(W / 2, 300, 'Wave ' + g.wave + ' held! +' + bonus, PAL.gold, 13);
    if (g.wave === 3 || g.wave === 6) { g.hero.lvl++; floatText(g.hero.x, g.hero.y - 46, 'HERO LV ' + (g.hero.lvl + 1), PAL.ice, 12); }
    if (g.wave >= WAVES.length) endMission(true);
  }
}

function endMission(win) {
  g.over = true;
  const key = 'a1m1_' + g.f.key;
  const ratio = g.lives / g.maxLives;
  const stars = win ? (ratio >= 0.8 ? 3 : ratio >= 0.4 ? 2 : 1) : 0;
  result = { win, stars, drop: null, equipped: false, xp: win ? 60 + stars * 20 : 20 };
  const before = level();
  profile.xp += result.xp;
  if (win) {
    profile.wins++;
    profile.stars[key] = Math.max(profile.stars[key] || 0, stars);
    const roll = Math.random(), epicP = stars === 3 ? 0.2 : 0.08, rareP = 0.35;
    const r = roll < epicP ? 2 : roll < epicP + rareP ? 1 : 0;
    const slots = ['weapon', 'charm', 'relic'];
    const slot = slots[Math.random() * 3 | 0];
    const item = { id: Date.now() + '_' + (Math.random() * 1e6 | 0), slot, r };
    profile.inv.push(item); result.drop = item;
    const cur = profile.gear[slot]; if (!cur || cur.r < r) { profile.gear[slot] = item; result.equipped = true; }
  } else profile.losses++;
  result.levelUp = level() > before;
  saveProfile();
  setTimeout(() => { go('result'); Sfx.play(win ? 'win' : 'lose'); }, 700);
}

function mapTap(x, y) {
  if (y < T || y > 14 * T) return;
  const c = Math.floor(x / T), r = Math.floor(y / T);
  if (c === HERO_SPOT[0] && r === HERO_SPOT[1]) { g.sel = { kind: 'tower', t: g.hero }; Sfx.play('ui'); return; }
  const i = BUILD_SPOTS.findIndex(s => s[0] === c && s[1] === r);
  if (i < 0) { g.sel = null; return; }
  const t = g.towers.find(t => t.spot === i);
  g.sel = t ? { kind: 'tower', t } : { kind: 'spot', i };
  Sfx.play('ui');
}
function build(i, type) {
  const d = TOWERS[type]; if (g.gold < d.tiers[0].cost) return;
  g.gold -= d.tiers[0].cost;
  const [c, r] = BUILD_SPOTS[i];
  const t = { spot: i, type, tier: 0, x: C(c), y: C(r), cd: 0.2, heat: 0, over: 0 };
  g.towers.push(t); g.sel = { kind: 'tower', t }; Sfx.play('build');
  for (let k = 0; k < 8; k++) g.fx.push({ k: 'dust', x: t.x + (Math.random() - 0.5) * 30, y: t.y + 10, t: 0.4 });
}
function upgrade(t) {
  const d = TOWERS[t.type]; if (t.tier >= 2) return; const cost = d.tiers[t.tier + 1].cost; if (g.gold < cost) return;
  g.gold -= cost; t.tier++; Sfx.play('build'); floatText(t.x, t.y - 40, d.name[t.tier], PAL.gold, 11);
}
function sell(t) { if (g.f.key === 'stone') return; g.gold += Math.floor(spent(t) * 0.7); g.towers = g.towers.filter(x => x !== t); g.sel = null; Sfx.play('ui'); }
function vent(t) { if (g.gold < 10 || !t.heat) return; g.gold -= 10; t.heat = 0; t.over = 0; floatText(t.x, t.y - 40, 'VENTED', PAL.ice, 11); }

function drawGame(realDt) {
  const sx = g.shake > 0 ? (Math.random() - 0.5) * 6 : 0, sy = g.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
  ctx.save(); ctx.translate(sx, sy);
  ctx.drawImage(MAP.canvas, 0, 0);
  // portal + shrine
  spr('portal', C(1), C(1) + 2 + Math.sin(g.t * 3));
  spr('shrine', C(4), C(13) + 18);
  // build spots
  BUILD_SPOTS.forEach(([c, r], i) => { if (!g.towers.find(t => t.spot === i)) spr('spot', C(c), C(r) + 10); });
  spr('plinth', C(HERO_SPOT[0]), C(HERO_SPOT[1]) + 12);
  // burns
  for (const b of g.burns) { ctx.globalAlpha = Math.min(1, b.t) * 0.55; ctx.fillStyle = (Math.floor(g.t * 10) % 2) ? PAL.ember : PAL.red; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r * 0.55, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  // wall
  if (g.wall) { const w = g.wall;     ctx.globalAlpha = 0.85 + Math.sin(g.t * 8) * 0.1; ctx.fillStyle = PAL.sky; ctx.fillRect(w.x - 18, w.y - 22, 36, 30); ctx.fillStyle = PAL.ice; for (let k = 0; k < 4; k++) ctx.fillRect(w.x - 16 + k * 9, w.y - 30 + (k % 2) * 6, 6, 30); ctx.globalAlpha = 1;
    txt(Math.ceil(w.t) + 's', w.x, w.y + 14, 10, PAL.ice, 'center'); }
  // selected range
  if (g.sel && g.sel.kind === 'tower') { const st = towerStats(g.sel.t); ctx.strokeStyle = 'rgba(242,193,78,0.8)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.sel.t.x, g.sel.t.y, st.range, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(242,193,78,0.08)'; ctx.fill(); }
  if (g.sel && g.sel.kind === 'spot') { const [c, r] = BUILD_SPOTS[g.sel.i]; ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2; ctx.strokeRect(c * T + 2, r * T + 2, T - 4, T - 4); }
  // drawables sorted by y
  const ds = [];
  for (const t of g.towers) ds.push({ y: t.y, f: () => {
    const name = t.isHero ? (g.f.key === 'stone' ? 'heroStone' : 'heroForge') : t.type + t.tier;
    const oy = t.recoil ? 2 : 0;
    spr(name, t.x, t.y + 14 + oy, t.over > 0 && Math.floor(g.t * 6) % 2 === 0);
    if (TOWERS[t.type] && TOWERS[t.type].heat) { ctx.fillStyle = PAL.ink; ctx.fillRect(t.x - 12, t.y + 15, 24, 4); ctx.fillStyle = t.over > 0 ? PAL.red : (t.heat > 70 ? PAL.ember : PAL.gold); ctx.fillRect(t.x - 11, t.y + 16, 22 * t.heat / 100, 2); }
    if (t.over > 0) txt('HOT', t.x, t.y - 26, 9, PAL.ember, 'center');
    if (!t.isHero) for (let k = 0; k <= t.tier; k++) { ctx.fillStyle = PAL.gold; ctx.fillRect(t.x - 14 + k * 5, t.y + 10, 3, 3); }
    if (t.isHero) txt('LV' + (t.lvl + 1), t.x + 16, t.y + 12, 8, PAL.ice, 'center');
  } });
  for (const e of g.enemies) ds.push({ y: e.y, f: () => {
    const fr = Math.floor(e.anim * (e.spd / 12)) % 2;
    spr(e.type + fr, e.x, e.y + 8, e.flash > 0);
    if (e.stun > 0) txt('*', e.x, e.y - e.r * 2 - 4, 12, PAL.ice, 'center');
    if (!e.boss && e.hp < e.maxHp) { ctx.fillStyle = PAL.ink; ctx.fillRect(e.x - 10, e.y - e.r * 2 - 2, 20, 4); ctx.fillStyle = e.shred > 0 ? PAL.sand : PAL.red; ctx.fillRect(e.x - 9, e.y - e.r * 2 - 1, 18 * e.hp / e.maxHp, 2); }
  } });
  ds.sort((a, b) => a.y - b.y).forEach(d => d.f());
  // shots
  for (const s of g.shots) {
    if (s.k === 'bolt') { ctx.fillStyle = s.col; ctx.fillRect(s.x - 2, s.y - 2, 4, 4); ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 1, s.y - 1, 2, 2); }
    else if (s.k === 'shell') { ctx.fillStyle = PAL.ironD; ctx.fillRect(s.x - 3, s.y - 3, 6, 6); ctx.fillStyle = PAL.ember; ctx.fillRect(s.x - 1, s.y - 1, 2, 2); }
    else { ctx.fillStyle = PAL.ember; ctx.fillRect(s.x - 3, s.y - 3, 6, 6); ctx.fillStyle = PAL.emberL; ctx.fillRect(s.x - 1, s.y - 2, 2, 2); }
  }
  for (const f of g.fx) {
    if (f.k === 'ring') { ctx.strokeStyle = f.col; ctx.globalAlpha = f.t * 3; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - f.t * 2), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    if (f.k === 'beam') { ctx.globalAlpha = f.t * 5; ctx.strokeStyle = PAL.ember; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.strokeStyle = PAL.emberL; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; }
    if (f.k === 'shard') { ctx.fillStyle = PAL.red; ctx.fillRect(f.x, f.y, 3, 3); }
    if (f.k === 'dust') { ctx.fillStyle = PAL.sand; ctx.globalAlpha = f.t * 2; ctx.fillRect(f.x, f.y - (0.4 - f.t) * 30, 4, 4); ctx.globalAlpha = 1; }
    if (f.k === 'anvil') { const x = f.tgt.hp > 0 ? f.tgt.x : f.x, y = f.tgt.hp > 0 ? f.tgt.y : f.y; spr('anvil', x, y - f.t * 400); }
  }
  for (const t of g.texts) { ctx.globalAlpha = Math.min(1, t.t * 2); txt(t.s, t.x, t.y, t.size, t.col, 'center'); ctx.globalAlpha = 1; }
  ctx.restore();
  // boss bar
  const boss = g.enemies.find(e => e.boss);
  if (boss) { panel(20, 46, W - 40, 24, 'rgba(11,20,48,0.9)', PAL.red); txt('HERALD OF KASIRI', 30, 54, 9, PAL.redL); ctx.fillStyle = PAL.ink; ctx.fillRect(28, 60, W - 56, 6); ctx.fillStyle = PAL.red; ctx.fillRect(28, 60, (W - 56) * boss.hp / boss.maxHp, 6); ctx.fillStyle = PAL.redL; ctx.fillRect(28, 60, (W - 56) * boss.hp / boss.maxHp, 2); }
  if (g.banner) { const a = Math.min(1, g.banner.t * 2); ctx.globalAlpha = a; panel(30, 250, W - 60, 40, 'rgba(11,20,48,0.9)'); txt(g.banner.txt, W / 2, 270, g.banner.txt.length > 12 ? 12 : 18, PAL.gold, 'center'); ctx.globalAlpha = 1; }
  drawHud();
  drawPanel();
}
function drawHud() {
  // gold
  ctx.fillStyle = PAL.gold; ctx.fillRect(8, 13, 12, 12); ctx.fillStyle = PAL.goldD; ctx.fillRect(11, 16, 6, 6);
  txt(String(g.gold), 26, 20, 14, PAL.gold);
  // lives (veil crystal)
  ctx.fillStyle = PAL.sky; ctx.fillRect(86, 10, 8, 18); ctx.fillStyle = PAL.ice; ctx.fillRect(88, 10, 3, 18);
  txt(String(g.lives), 100, 20, 14, PAL.ice);
  txt('WAVE ' + g.wave + '/' + WAVES.length, 150, 20, 12, '#fff');
  // speed
  panel(W - 104, 6, 30, 28, g.speed > 1 ? PAL.ochreD : PAL.night); txt(g.speed + 'x', W - 89, 21, 11, '#fff', 'center');
  btn(W - 104, 6, 30, 28, () => { g.speed = g.speed === 1 ? 2 : 1; Sfx.play('ui'); });
  panel(W - 68, 6, 28, 28, PAL.night); txt('II', W - 54, 21, 11, paused ? PAL.gold : '#fff', 'center');
  btn(W - 68, 6, 28, 28, () => { paused = !paused; });
  iconButtons();
}
function drawPanel() {
  const y = 14 * T + 4, s = g.sel;
  if (s && s.kind === 'spot') {
    g.f.towers.forEach((type, k) => {
      const d = TOWERS[type], cost = d.tiers[0].cost, x = 4 + k * 90, ok = g.gold >= cost;
      panel(x, y + 2, 86, 70, ok ? PAL.blue : '#2a2f40', ok ? PAL.gold : '#444a5a');
      spr(type + '0', x + 18, y + 50); txt(d.name[0].split(' ')[0], x + 54, y + 16, 9, '#fff', 'center'); txt(d.name[0].split(' ').slice(1).join(' '), x + 54, y + 28, 9, '#fff', 'center');
      txt(String(cost), x + 56, y + 50, 12, ok ? PAL.gold : '#888', 'center');
      btn(x, y + 2, 86, 70, () => build(s.i, type));
    });
    button(W - 86, y + 2, 82, 70, 'CLOSE', () => { g.sel = null; }, { size: 11, col: PAL.night });
    return;
  }
  if (s && s.kind === 'tower') {
    const t = s.t, st = towerStats(t);
    panel(4, y + 2, 150, 70, PAL.night);
    if (t.isHero) {
      txt(g.f.hero.name, 10, y + 14, 10, PAL.ice); txt('Lv ' + (t.lvl + 1) + '  dmg ' + Math.round(st.dmg), 10, y + 30, 10, '#fff');
      txt('Gear ' + ['weapon', 'charm', 'relic'].filter(k => profile.gear[k]).length + '/3 equipped', 10, y + 46, 9, '#c8c0a8');
      txt('Levels at waves 3 and 6', 10, y + 60, 9, '#888');
      button(160, y + 2, W - 164, 70, g.f.hero.ability, useAbility, { size: 11, col: PAL.ochreD, disabled: g.abilityCd > 0, sub: g.abilityCd > 0 ? Math.ceil(g.abilityCd) + 's' : 'READY' });
      return;
    }
    const d = TOWERS[t.type];
    txt(d.name[t.tier], 10, y + 14, 10, PAL.gold); txt('T' + (t.tier + 1) + ' dmg ' + st.dmg + ' rng ' + st.range, 10, y + 30, 9, '#fff');
    wrap(d.desc, 10, y + 46, 140, 9, '#c8c0a8', 11);
    if (t.tier < 2) { const c = d.tiers[t.tier + 1].cost; button(158, y + 2, 98, 70, 'UPGRADE', () => upgrade(t), { size: 11, disabled: g.gold < c, sub: String(c) }); }
    else button(158, y + 2, 98, 70, 'MAX', () => {}, { size: 11, disabled: true });
    if (g.f.key === 'stone') button(260, y + 2, 96, 70, 'PETRIFIED', () => {}, { size: 10, disabled: true, sub: 'cannot sell' });
    else if (t.heat > 30) button(260, y + 2, 96, 34, 'VENT 10', () => vent(t), { size: 10, col: '#1f5a78', disabled: g.gold < 10 });
    if (g.f.key !== 'stone') button(260, y + (t.heat > 30 ? 38 : 2), 96, t.heat > 30 ? 34 : 70, 'SELL', () => sell(t), { size: 10, col: PAL.redD, sub: t.heat > 30 ? null : '+' + Math.floor(spent(t) * 0.7) });
    return;
  }
  // default: hero ability + wave
  const cdF = g.abilityCd / abilityMaxCd();
  panel(4, y + 2, 130, 70, g.abilityCd > 0 ? '#2a2f40' : PAL.ochreD);
  spr(g.f.key === 'stone' ? 'heroStone' : 'heroForge', 28, y + 60);
  txt(g.f.hero.ability.split(' ')[0], 88, y + 22, 10, '#fff', 'center'); txt(g.f.hero.ability.split(' ').slice(1).join(' '), 88, y + 35, 10, '#fff', 'center');
  txt(g.abilityCd > 0 ? Math.ceil(g.abilityCd) + 's' : 'TAP!', 88, y + 54, 12, g.abilityCd > 0 ? '#888' : PAL.gold, 'center');
  if (cdF > 0) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(6, y + 4, 126 * cdF, 66); }
  btn(4, y + 2, 130, 70, () => useAbility(), { id: 'ability' });
  const canCall = !g.spawning && g.wave < WAVES.length;
  const label = g.wave === 0 ? 'START' : (g.waveDone ? 'NEXT WAVE' : 'CALL EARLY');
  button(140, y + 2, W - 144, 70, canCall ? label : (g.wave >= WAVES.length ? 'HOLD!' : 'INCOMING'), callWave,
    { disabled: !canCall, col: PAL.blue, size: 14, sub: canCall ? (g.waveDone ? 'wave ' + (g.wave + 1) + ': ' + waveSummary(g.wave) : '+15 gold') : null });
}
function waveSummary(w) { return WAVES[w].map(([t, n]) => n + (t === 'husk' ? ' husk' : t === 'ling' ? ' fast' : t === 'shard' ? ' armour' : ' BOSS')).join(' '); }

function drawResult() {
  ctx.drawImage(MAP.canvas, 0, 0);
  ctx.fillStyle = 'rgba(6,11,28,0.82)'; ctx.fillRect(0, 0, W, H);
  const r = result;
  txt(r.win ? 'THE VEIL HOLDS' : 'THE VEIL FALLS', W / 2, 90, 22, r.win ? PAL.gold : PAL.redL, 'center');
  txt(r.win ? 'The Herald of Kasiri shatters into light.' : 'The Hollow pours through the rim.', W / 2, 122, 10, '#e8dcc0', 'center');
  if (r.win) for (let k = 0; k < 3; k++) star(W / 2 - 40 + k * 40, 170, k < r.stars);
  txt('Veil ' + g.lives + '/' + g.maxLives + '  ·  ' + g.kills + ' Hollow cleared  ·  wave ' + g.wave, W / 2, 205, 10, '#c8c0a8', 'center');
  txt('+' + r.xp + ' xp' + (r.levelUp ? '  LEVEL UP! Lv ' + level() : ''), W / 2, 228, 12, PAL.ice, 'center');
  if (r.drop) {
    const it = r.drop, G = GEAR[it.slot], R = RARITY[it.r];
    panel(40, 260, W - 80, 120, PAL.deep, R.color);
    txt('GEAR FOUND', W / 2, 278, 11, PAL.gold, 'center');
    const s = SPR['gear_' + it.slot + it.r]; ctx.drawImage(s, 60, 296, s.width * 2, s.height * 2);
    txt(G.names[it.r], 128, 304, 12, R.color); txt(R.name + ' ' + G.label, 128, 322, 10, '#c8c0a8');
    txt('+' + G.vals[it.r] + '% ' + G.stat, 128, 340, 10, PAL.gold);
    txt(r.equipped ? 'Equipped on your hero' : 'Kept in your satchel', 128, 360, 9, r.equipped ? PAL.ice : '#888');
  }
  button(30, 430, W - 60, 46, r.win ? 'PLAY AGAIN' : 'TRY AGAIN', () => startMission(g.f.key), { col: PAL.ochreD, size: 15 });
  button(30, 486, (W - 70) / 2, 42, 'PROFILE', () => go('profile'));
  button(40 + (W - 70) / 2, 486, (W - 70) / 2, 42, 'FACTIONS', () => go('faction'));
}

// ---------- Loop ----------
let last = performance.now(), paused = false;
function frame(now) {
  const realDt = Math.min(0.05, (now - last) / 1000); last = now; sceneT += realDt;
  buttons = [];
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0); ctx.imageSmoothingEnabled = false;
  try {
    if (scene === 'game' && g && !paused) { const steps = g.speed; for (let i = 0; i < steps; i++) update(realDt); }
    if (scene === 'title') drawTitle();
    else if (scene === 'faction') drawFaction();
    else if (scene === 'profile') drawProfile();
    else if (scene === 'game') { drawGame(realDt); if (paused) { panel(80, 280, 200, 60, PAL.night); txt('PAUSED', W / 2, 310, 18, PAL.gold, 'center'); } }
    else if (scene === 'result') drawResult();
  } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test / debug hooks (used by the headless smoke test)
window.VON = {
  get scene() { return scene; }, get g() { return g; }, get profile() { return profile; }, get buttons() { return buttons; },
  tap, startMission, resetProfile: () => { profile = defaultProfile(); saveProfile(); }, callWave, build, upgrade, useAbility, update: (dt) => update(dt), go,
  BUILD_SPOTS, pathTiles: MAP.pathSet,
};
})();
