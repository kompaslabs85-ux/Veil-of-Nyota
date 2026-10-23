// WARDEN WARS — art: sprite loading, painted map, hero compositor, UI kit drawing
'use strict';
const IMG = {};
let artReady = false;
function loadArt(done) {
  const list = SPRITE_FILES.map(n => ['assets/sp/' + n + '.webp', n]).concat(
    ['portrait-mosa','portrait-thandeka','portrait-jabari','hero-thandeka','hero-jabari'].map(n => ['assets/ui/' + n + '.webp', n]),
    [['assets/title-bg.jpg','title-bg']]);
  let left = list.length;
  list.forEach(([src, n]) => { const im = new Image(); im.onload = im.onerror = () => { if (im.naturalWidth) IMG[n] = im; if (--left === 0) { artReady = true; done && done(); } }; im.src = src; });
}
function img(n) { return IMG[n]; }
// draw sprite anchored bottom-centre at (x,y) with logical height h
function drawSprite(ctx, n, x, y, h, flip) {
  const im = IMG[n]; if (!im) return false;
  const w = h * im.naturalWidth / im.naturalHeight;
  if (flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, y - h, w, h); ctx.restore(); }
  else ctx.drawImage(im, x - w / 2, y - h, w, h);
  return true;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); } }
function font(sz, fam = 'Nunito', wt = 800) { return `${wt} ${sz}px "${fam}", sans-serif`; }
function txt(ctx, s, x, y, sz, col = INK, align = 'left', fam = 'Nunito', wt = 800) {
  ctx.font = font(sz, fam, wt); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(s, x + 1, y + 1.2); ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function wrap(ctx, s, x, y, maxW, lh, sz, col = INK, align = 'left', fam = 'Nunito', wt = 600) {
  ctx.font = font(sz, fam, wt); const words = s.split(' '); let line = '', yy = y;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { txt(ctx, line, x, yy, sz, col, align, fam, wt); line = w; yy += lh; } else line = t; }
  if (line) txt(ctx, line, x, yy, sz, col, align, fam, wt); return yy + lh;
}
function panel(ctx, x, y, w, h, r = 14, a = 0.94) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(52,30,62,${a})`); g.addColorStop(1, `rgba(22,12,30,${a})`);
  rr(ctx, x, y, w, h, r); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.strokeStyle = 'rgba(242,193,78,0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
  rr(ctx, x + 3.5, y + 3.5, w - 7, h - 7, r - 3); ctx.strokeStyle = 'rgba(242,193,78,0.18)'; ctx.lineWidth = 1; ctx.stroke();
}
// rounded button visual. style: 'gold' | 'red' | 'plum' | 'ghost'
function drawButton(ctx, b, scale) {
  const { x, y, w, h } = b; const r = b.r != null ? b.r : Math.min(h / 2, 14);
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(scale, scale); ctx.translate(-w / 2, -h / 2);
  const dis = b.disabled; const st = b.style || 'gold';
  const cols = { gold:['#ffd877','#c88a1e','#5a3808'], red:['#ff4d5e','#C8102E','#4a0410'], plum:['#5a3c6e','#30203e','#120818'], green:['#8ff0b0','#2f9a5a','#0c3a20'], ghost:['rgba(60,40,70,0.7)','rgba(30,18,40,0.7)','#000'] }[dis ? 'plum' : st];
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
  rr(ctx, 0, 0, w, h, r); const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = dis ? 'rgba(200,180,200,0.3)' : 'rgba(255,240,200,0.75)'; ctx.lineWidth = 1.5; rr(ctx, 0.75, 0.75, w - 1.5, h - 1.5, r); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, 3, 2, w - 6, h * 0.42, Math.max(2, r - 3)); ctx.fill();
  const tc = dis ? '#9c8aa6' : (st === 'gold' || st === 'green') ? '#2a1606' : INK;
  if (b.icon) { const im = IMG[b.icon]; if (im) { const s = Math.min(w, h) * 0.62; ctx.drawImage(im, w / 2 - s / 2 - (b.label ? w * 0.22 : 0), h / 2 - s / 2, s, s); } }
  if (b.label) { ctx.font = font(b.sz || 13, b.fam || 'Cinzel', 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (st !== 'gold' && st !== 'green') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(b.label, w / 2 + 1, h / 2 + (b.sub ? -5 : 0) + 1); }
    ctx.fillStyle = tc; ctx.fillText(b.label, w / 2 + (b.icon ? w * 0.08 : 0), h / 2 + (b.sub ? -5 : 1)); }
  if (b.sub) { ctx.font = font(10, 'Nunito', 800); ctx.fillStyle = tc; ctx.fillText(b.sub, w / 2, h / 2 + 9); }
  ctx.restore();
}

// ---------------- Map (painted in code over Zara's ground tile) ----------------
let MAPC = null;
function buildMap(dpr) {
  const c = document.createElement('canvas'); c.width = W * dpr; c.height = 560 * dpr; const m = c.getContext('2d'); m.scale(dpr, dpr);
  // ground: savanna greens over the tile
  const g = m.createLinearGradient(0, 0, 0, 560); g.addColorStop(0, '#3e5a2a'); g.addColorStop(0.5, '#4e6b2c'); g.addColorStop(1, '#3a4f26'); m.fillStyle = g; m.fillRect(0, 0, W, 560);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) { m.fillStyle = `rgba(${120 + rnd() * 60 | 0},${140 + rnd() * 50 | 0},${50 + rnd() * 30 | 0},${0.15 + rnd() * 0.2})`; const x = rnd() * W, y = rnd() * 560; m.beginPath(); m.ellipse(x, y, 2 + rnd() * 9, 1 + rnd() * 4, rnd() * 3, 0, 7); m.fill(); }
  for (let i = 0; i < 500; i++) { m.strokeStyle = `rgba(${150 + rnd() * 60 | 0},${170 + rnd() * 40 | 0},80,0.5)`; m.lineWidth = 1; const x = rnd() * W, y = rnd() * 560; m.beginPath(); m.moveTo(x, y); m.lineTo(x + rnd() * 3 - 1.5, y - 3 - rnd() * 4); m.stroke(); }
  // river top-right
  m.save(); m.strokeStyle = '#2b5f7a'; m.lineWidth = 16; m.lineCap = 'round'; m.beginPath(); m.moveTo(250, -10); m.bezierCurveTo(300, 40, 340, 50, 370, 90); m.stroke();
  m.strokeStyle = '#4aa0c0'; m.lineWidth = 9; m.stroke(); m.strokeStyle = 'rgba(220,245,255,0.5)'; m.lineWidth = 1.5; m.setLineDash([6, 10]); m.stroke(); m.restore();
  // path: smooth curve through points
  const pts = [{ x: PATH[0].x, y: -20 }, ...PATH, { x: PATH[PATH.length - 1].x, y: 590 }];
  const curve = (ctx) => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) { const p = pts[i], n = pts[i + 1]; const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2; ctx.quadraticCurveTo(p.x, p.y, mx, my); }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); };
  m.lineCap = 'round'; m.lineJoin = 'round';
  curve(m); m.strokeStyle = 'rgba(30,20,10,0.45)'; m.lineWidth = 38; m.stroke();
  curve(m); m.strokeStyle = '#8a6438'; m.lineWidth = 33; m.stroke();
  const tile = IMG['ground_tile_64'];
  if (tile) { m.save(); curve(m); m.lineWidth = 28; m.strokeStyle = m.createPattern(tile, 'repeat'); const p = m.strokeStyle; if (p.setTransform) p.setTransform(new DOMMatrix().scale(1 / 3)); m.globalAlpha = 0.95; m.stroke(); m.restore(); }
  else { curve(m); m.strokeStyle = '#c89a5c'; m.lineWidth = 28; m.stroke(); }
  curve(m); m.strokeStyle = 'rgba(255,230,180,0.12)'; m.lineWidth = 10; m.stroke();
  for (let i = 0; i < 140; i++) { const k = (rnd() * (PATH.length - 1)) | 0, t = rnd(); const a = PATH[k], b = PATH[k + 1]; m.fillStyle = 'rgba(90,60,30,0.35)'; m.beginPath(); m.arc(a.x + (b.x - a.x) * t + (rnd() - 0.5) * 22, a.y + (b.y - a.y) * t + (rnd() - 0.5) * 22, 1 + rnd() * 1.5, 0, 7); m.fill(); }
  // decorations away from path + spots
  const busy = (x, y) => PATH_TILES.some(([c, r], i) => { const n = PATH_TILES[i + 1]; if (!n) return false; const x0 = Math.min(c, n[0]) * T - 10, x1 = (Math.max(c, n[0]) + 1) * T + 10, y0 = Math.min(r, n[1]) * T - 10, y1 = (Math.max(r, n[1]) + 1) * T + 10; return x > x0 && x < x1 && y > y0 && y < y1; })
    || BUILD_SPOTS.concat([HERO_SPOT]).some(([c, r]) => Math.abs(C(c) - x) < 26 && Math.abs(C(r) - y) < 26);
  const deco = [];
  for (let i = 0; i < 60 && deco.length < 16; i++) { const x = 10 + rnd() * 340, y = 20 + rnd() * 530; if (!busy(x, y) && !deco.some(d => Math.hypot(d.x - x, d.y - y) < 40)) deco.push({ x, y, k: rnd() }); }
  deco.sort((a, b) => a.y - b.y).forEach(d => d.k < 0.35 ? baobab(m, d.x, d.y, 0.7 + d.k) : d.k < 0.7 ? rock(m, d.x, d.y, rnd) : bush(m, d.x, d.y));
  // vignette in void-plum
  const v = m.createRadialGradient(W / 2, 280, 160, W / 2, 280, 420); v.addColorStop(0, 'rgba(26,15,34,0)'); v.addColorStop(1, 'rgba(26,15,34,0.6)'); m.fillStyle = v; m.fillRect(0, 0, W, 560);
  // shrine at the exit
  const ex = PATH[PATH.length - 1]; m.fillStyle = 'rgba(200,16,46,0.25)'; m.beginPath(); m.ellipse(ex.x, 552, 34, 10, 0, 0, 7); m.fill();
  MAPC = c;
}
function baobab(m, x, y, s) {
  m.fillStyle = 'rgba(0,0,0,0.25)'; m.beginPath(); m.ellipse(x, y + 2, 16 * s, 5 * s, 0, 0, 7); m.fill();
  const g = m.createLinearGradient(x - 7 * s, 0, x + 7 * s, 0); g.addColorStop(0, '#6b5040'); g.addColorStop(1, '#3c2a22');
  m.fillStyle = g; m.beginPath(); m.moveTo(x - 8 * s, y); m.quadraticCurveTo(x - 6 * s, y - 18 * s, x - 4 * s, y - 28 * s); m.lineTo(x + 4 * s, y - 28 * s); m.quadraticCurveTo(x + 6 * s, y - 18 * s, x + 8 * s, y); m.fill();
  m.strokeStyle = '#3c2a22'; m.lineWidth = 2.5 * s; [[-12, -36], [-4, -40], [6, -39], [13, -34]].forEach(([dx, dy]) => { m.beginPath(); m.moveTo(x, y - 27 * s); m.lineTo(x + dx * s, y + dy * s); m.stroke(); });
  [[-12, -38, 8], [0, -42, 10], [12, -36, 8], [-5, -34, 7], [6, -33, 7]].forEach(([dx, dy, r]) => { m.fillStyle = '#2f5a24'; m.beginPath(); m.arc(x + dx * s, y + dy * s, r * s, 0, 7); m.fill(); m.fillStyle = 'rgba(160,200,90,0.35)'; m.beginPath(); m.arc(x + dx * s - 2, y + dy * s - 2, r * s * 0.5, 0, 7); m.fill(); });
}
function rock(m, x, y, rnd) { const s = 0.6 + rnd() * 0.6; m.fillStyle = 'rgba(0,0,0,0.25)'; m.beginPath(); m.ellipse(x, y + 2, 11 * s, 4 * s, 0, 0, 7); m.fill();
  m.fillStyle = '#6e6a72'; m.beginPath(); m.moveTo(x - 10 * s, y); m.lineTo(x - 6 * s, y - 9 * s); m.lineTo(x + 3 * s, y - 11 * s); m.lineTo(x + 10 * s, y - 2 * s); m.closePath(); m.fill(); m.fillStyle = '#9a96a0'; m.beginPath(); m.moveTo(x - 6 * s, y - 9 * s); m.lineTo(x + 3 * s, y - 11 * s); m.lineTo(x + 1 * s, y - 5 * s); m.closePath(); m.fill(); }
function bush(m, x, y) { [[-5, 0, 6], [4, -1, 7], [0, -5, 6]].forEach(([dx, dy, r]) => { m.fillStyle = '#365e2a'; m.beginPath(); m.arc(x + dx, y + dy, r, 0, 7); m.fill(); }); m.fillStyle = '#e0604a'; m.beginPath(); m.arc(x + 2, y - 4, 1.5, 0, 7); m.fill(); }

// ---------------- Hero compositor (evolution + gear looks) ----------------
// look = { hero:'thandeka'|'jabari', evo:0..2, gear:{ weapon:vis, helm:vis, mantle:vis } } vis 0 base / 1 rare / 2 epic (-1 empty)
function heroLook(profile) {
  const fac = profile.faction || 'stone'; const hero = fac === 'forge' ? 'jabari' : 'thandeka';
  const st = profile.heroes[hero]; const gear = {};
  ['weapon', 'helm', 'mantle'].forEach(s => { const it = st.equip[s] ? profile.inv.find(i => i.id === st.equip[s]) : null; gear[s] = it ? RARITY[it.rar].vis : -1; });
  return { hero, evo: st.evo, gear };
}
function drawHero(ctx, look, x, y, h, t = 0) {
  const { hero, evo, gear } = look; const bob = Math.sin(t * 3) * h * 0.012;
  const best = Math.max(gear.weapon, gear.helm, gear.mantle);
  // mantle aura behind
  if (gear.mantle >= 0) { const col = ['rgba(200,160,110,0.35)', 'rgba(95,160,255,0.45)', 'rgba(200,90,255,0.55)'][gear.mantle];
    ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y - h * 0.42 + bob, h * 0.26, h * 0.4, 0, 0, 7); ctx.filter = 'blur(' + (h * 0.04).toFixed(1) + 'px)'; ctx.fill(); ctx.restore(); }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.24, h * 0.06, 0, 0, 7); ctx.fill();
  const base = best >= 0 && evo === 0 ? `${hero}_gear-${['base', 'rare', 'epic'][best]}` : `${hero}_evo${evo + 1}`;
  drawSprite(ctx, base, x, y + bob, h);
  if (best >= 1) { ctx.save(); ctx.globalAlpha = 0.95; drawSprite(ctx, `${hero}_overlay-${best >= 2 ? 'epic' : 'rare'}`, x, y + bob, h); ctx.restore(); }
  // per-slot accents so each slot is visible
  const hc = (v) => ['#d9b98a', '#5fa8ff', '#d07aff'][v];
  if (gear.helm >= 0) { ctx.save(); ctx.fillStyle = hc(gear.helm); ctx.shadowColor = hc(gear.helm); ctx.shadowBlur = 4 + gear.helm * 4;
    const hy = y - h * 0.86 + bob; ctx.beginPath(); ctx.moveTo(x - h * 0.07, hy + 2); for (let i = 0; i <= 4; i++) { ctx.lineTo(x - h * 0.07 + i * h * 0.035, hy - (i % 2 ? 0 : h * (0.03 + gear.helm * 0.012))); } ctx.lineTo(x + h * 0.07, hy + 2); ctx.closePath(); ctx.fill(); ctx.restore(); }
  if (gear.weapon >= 0) { ctx.save(); const wx = x + h * 0.2, wy = y - h * 0.78 + bob; ctx.fillStyle = hc(gear.weapon); ctx.shadowColor = hc(gear.weapon); ctx.shadowBlur = 6 + gear.weapon * 6;
    ctx.beginPath(); ctx.moveTo(wx, wy - h * 0.06); ctx.lineTo(wx + h * 0.025, wy); ctx.lineTo(wx, wy + h * 0.05); ctx.lineTo(wx - h * 0.025, wy); ctx.closePath(); ctx.fill();
    if (gear.weapon === 2) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6); ctx.beginPath(); ctx.arc(wx, wy, h * 0.06, 0, 7); ctx.fill(); } ctx.restore(); }
  if (evo >= 2) { ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2); ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, h * 0.3, h * 0.08, 0, 0, 7); ctx.stroke(); ctx.restore(); }
}

// ---------------- Pass-2 helpers: walk/fly cycles, 9-slice panels ----------------
// returns the frame name for an animated sprite (4-frame cycles in Zara's /anim/), falling back to the still
function animName(base, kind, t, fps = 8) { const f = 1 + (Math.floor(t * fps) % 4); const n = `${base}_${kind}_f${f}`; return IMG[n] ? n : base; }
function nine(ctx, x, y, w, h, name = 'panel-9slice_48', c = 16) {
  const im = IMG[name]; if (!im) return false; const s = im.naturalWidth / 3; c = Math.min(c, w / 2, h / 2);
  const sx = [0, s, im.naturalWidth - s], sw = [s, im.naturalWidth - 2 * s, s], dx = [x, x + c, x + w - c], dw = [c, w - 2 * c, c];
  const sy = [0, s, im.naturalHeight - s], sh = [s, im.naturalHeight - 2 * s, s], dy = [y, y + c, y + h - c], dh = [c, h - 2 * c, c];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ctx.drawImage(im, sx[i], sy[j], sw[i], sh[j], dx[i], dy[j], dw[i], dh[j]); return true;
}
function panel9(ctx, x, y, w, h) { panel(ctx, x, y, w, h); ctx.save(); ctx.globalAlpha = 0.9; nine(ctx, x, y, w, h); ctx.restore(); }
