// WARDEN WARS — art v2: DPR-tiered painted sprites (only ever downscaled), textured procedural maps, UI kit.
'use strict';
const IMG = {};          // name -> HTMLImageElement (the tier currently loaded)
const IMG_TIER = {};     // name -> tier px height loaded
let KPX = 1;             // device pixels per logical pixel (set by resize)
let artReady = false;
const ART_STATS = { clamped: 0, draws: 0 };
function tierFor(kpx) { return kpx <= 1 ? 1 : kpx <= 2 ? 2 : kpx <= 3 ? 3 : 4; }
function loadArt(done) {
  const n = tierFor(KPX); const names = Object.keys(ART_MANIFEST); let left = names.length;
  names.forEach(k => {
    const m = ART_MANIFEST[k]; const tn = m.kind === 'texture' ? Math.min(3, Math.max(n, 3)) : /^e_herald/.test(k) ? 4 : n; // boss drawn 1.6x: always the 4x source // textures: always the 1024 tile (drawn 1:1)
    if (IMG[k] && IMG_TIER[k] === tn) { if (--left === 0) { artReady = true; done && done(); } return; }
    const im = new Image();
    im.onload = im.onerror = () => { if (im.naturalWidth) { IMG[k] = im; IMG_TIER[k] = tn; } if (--left === 0) { artReady = true; done && done(); } };
    im.src = `assets/v2/${k}@${tn}x.webp`;
  });
}
// Draw a sprite bottom-centre anchored at (x,y), logical height h. Never upscales: h is clamped to the loaded tier's pixels / KPX.
// iter3b: faction identity. Hero aliases (h_/hs_<heroKey>N -> the hero's painted base sprite, tinted) and tower tints
// (t_* drawn in the active faction's palette). Tints are baked once per sprite into an offscreen canvas (no per-frame filter).
const TINTED = {}; let TINT_FAC = null; // TINT_FAC overrides the tower palette (faction-select cards)
function tinted(n, im, f) { if (!f) return im; const k = n + '|' + f; if (TINTED[k]) return TINTED[k];
  try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
    if (!('filter' in x)) return (TINTED[k] = im); x.filter = f; x.drawImage(im, 0, 0); c.naturalWidth = c.width; c.naturalHeight = c.height; return (TINTED[k] = c); } catch (e) { return (TINTED[k] = im); } }
const SPRITE_VARIANTS = { e_vg_glacier: ['e_herald2', 'hue-rotate(170deg) saturate(1.2) brightness(1.05)'], e_vg_foundry: ['e_herald2', 'sepia(0.7) hue-rotate(-15deg) saturate(1.7)'] };
function spriteImg(n) {
  if (SPRITE_VARIANTS[n]) { const [b, f] = SPRITE_VARIANTS[n]; return IMG[b] ? tinted(b, IMG[b], f) : null; }
  if (IMG[n]) { if (n.startsWith('t_') && typeof FAC === 'function') { const fk = TINT_FAC || (typeof P !== 'undefined' && P && P.faction); const f = fk && FAC(fk).tint; if (f) return tinted(n, IMG[n], f); } return IMG[n]; }
  const m = /^(hs?_)([a-z]+)(\d)$/.exec(n); if (!m || typeof HERO_FAC !== 'function') return null; const hf = HERO_FAC(m[2]); if (!hf || hf.hero.spr === m[2]) return null;
  const base = m[1] + hf.hero.spr + m[3]; return IMG[base] ? tinted(base, IMG[base], hf.hero.tint) : null; }
function drawSprite(ctx, n, x, y, h, flip, alpha) {
  const im = spriteImg(n); if (!im) return false;
  const maxH = im.naturalHeight / KPX; if (h > maxH + 0.01) { h = maxH; ART_STATS.clamped++; }
  ART_STATS.draws++;
  const w = h * im.naturalWidth / im.naturalHeight;
  if (alpha != null) { ctx.save(); ctx.globalAlpha *= alpha; }
  if (flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, y - h, w, h); ctx.restore(); }
  else ctx.drawImage(im, x - w / 2, y - h, w, h);
  if (alpha != null) ctx.restore();
  return true;
}
// head crop of a sprite for dock portraits (top fraction of the image)
function drawHead(ctx, n, x, y, s) {
  const im = spriteImg(n); if (!im) return false; const iw = im.naturalWidth, ih = im.naturalHeight;
  const cw = Math.min(iw, ih * 0.36), ch = cw; const sx = (iw - cw) / 2;
  ctx.save(); ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, 7); ctx.clip();
  ctx.fillStyle = '#2a1830'; ctx.fillRect(x, y, s, s); ctx.drawImage(im, sx, 0, cw, ch, x, y, s, s); ctx.restore();
  ctx.strokeStyle = 'rgba(242,193,78,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, 7); ctx.stroke(); return true;
}
function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const MIN_TXT = 12;
function font(sz, fam = 'Nunito', wt = 800) { return `${wt} ${Math.max(MIN_TXT, sz)}px "${fam}", sans-serif`; }
function txt(ctx, s, x, y, sz, col = INK, align = 'left', fam = 'Nunito', wt = 800, maxW) {
  sz = Math.max(MIN_TXT, sz * (window.TXT_K || 1)); ctx.font = font(sz, fam, wt); ctx.textAlign = align; ctx.textBaseline = 'middle'; s = String(s);
  if (maxW && ctx.measureText(s).width > maxW) { while (s.length > 1 && ctx.measureText(s + '\u2026').width > maxW) s = s.slice(0, -1); s += '\u2026'; }
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(s, x + 1, y + 1.2); ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function wrap(ctx, s, x, y, maxW, lh, sz, col = INK, align = 'left', fam = 'Nunito', wt = 600, maxLines = 99) {
  sz = Math.max(MIN_TXT, sz * (window.TXT_K || 1)); ctx.font = font(sz, fam, wt); const words = String(s).split(' '); let line = '', yy = y, n = 0;
  for (const w of words) { const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { if (++n >= maxLines) { txt(ctx, line, x, yy, sz, col, align, fam, wt, maxW); return yy + lh; } txt(ctx, line, x, yy, sz, col, align, fam, wt); line = w; yy += lh; } else line = t; }
  if (line) txt(ctx, line, x, yy, sz, col, align, fam, wt, maxW); return yy + lh;
}
function panel(ctx, x, y, w, h, r = 14, a = 0.95) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(52,30,62,${a})`); g.addColorStop(1, `rgba(22,12,30,${a})`);
  rr(ctx, x, y, w, h, r); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.strokeStyle = 'rgba(242,193,78,0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
  rr(ctx, x + 3.5, y + 3.5, w - 7, h - 7, r - 3); ctx.strokeStyle = 'rgba(242,193,78,0.18)'; ctx.lineWidth = 1; ctx.stroke();
}
// rounded button. style: gold | red | plum | green | ghost | ice
function drawButton(ctx, b, scale) {
  const { x, y, w, h } = b; const r = b.r != null ? b.r : Math.min(h / 2, 14);
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(scale, scale); ctx.translate(-w / 2, -h / 2);
  const dis = b.disabled; const st = b.style || 'gold';
  const cols = { gold: ['#ffd877', '#c88a1e'], red: ['#ff4d5e', '#C8102E'], plum: ['#5a3c6e', '#30203e'], green: ['#8ff0b0', '#2f9a5a'], ghost: ['rgba(60,40,70,0.75)', 'rgba(30,18,40,0.75)'], ice: ['#bff3ee', '#2EC4B6'] }[dis ? 'plum' : st];
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
  rr(ctx, 0, 0, w, h, r); const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = b.selected ? '#fff' : dis ? 'rgba(200,180,200,0.3)' : 'rgba(255,240,200,0.75)'; ctx.lineWidth = b.selected ? 3 : 1.5; rr(ctx, 0.75, 0.75, w - 1.5, h - 1.5, r); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; rr(ctx, 3, 2, w - 6, h * 0.42, Math.max(2, r - 3)); ctx.fill();
  const dark = !dis && (st === 'gold' || st === 'green' || st === 'ice'); const tc = dis ? '#b3a3bd' : dark ? '#2a1606' : INK;
  if (b.icon && IMG[b.icon]) { const s = Math.min(w, h) * 0.9; drawSprite(ctx, b.icon, w / 2, h / 2 + s / 2, s); }
  if (b.label) { ctx.font = font(b.sz || 14, b.fam || 'Cinzel', 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const ly = h / 2 + (b.sub ? -6 : 1); if (!dark) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(b.label, w / 2 + 1, ly + 1); } ctx.fillStyle = tc; ctx.fillText(b.label, w / 2, ly); }
  if (b.sub) { ctx.font = font(12, 'Nunito', 800); ctx.textAlign = 'center'; ctx.fillStyle = tc; ctx.fillText(b.sub, w / 2, h / 2 + 9); }
  ctx.restore();
}

// ---------------- Maps: textured ground + procedural road, cached at device resolution ----------------
let MAPC = null;
function texPattern(c, name) {
  const im = IMG[name]; if (!im) return null; const p = c.createPattern(im, 'repeat');
  if (p.setTransform) p.setTransform(new DOMMatrix([1 / KPX, 0, 0, 1 / KPX, 0, 0])); // 1 texture px = 1 device px
  return p;
}
function routePx(route) { return route.map(([c, r]) => ({ x: C(c), y: C(r) })); }
function strokeRoute(m, pts) { m.beginPath(); pts.forEach((p, i) => i ? m.lineTo(p.x, p.y) : m.moveTo(p.x, p.y)); m.stroke(); }
function buildMap(map) {
  const c = document.createElement('canvas'); c.width = Math.round(W * KPX); c.height = Math.round(MAP_H * KPX);
  const m = c.getContext('2d'); m.scale(KPX, KPX); m.imageSmoothingQuality = 'high';
  const snow = map.theme === 'snow';
  const gp = texPattern(m, snow ? 'x_snow' : 'x_soot'); m.fillStyle = gp || (snow ? '#c9d6de' : '#3a2a26'); m.fillRect(0, 0, W, MAP_H);
  // vignette
  const vg = m.createRadialGradient(W / 2, MAP_H / 2, 120, W / 2, MAP_H / 2, 380); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, snow ? 'rgba(10,30,50,0.45)' : 'rgba(20,4,0,0.55)'); m.fillStyle = vg; m.fillRect(0, 0, W, MAP_H);
  // decor (procedural, seeded)
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const used = new Set(); map.routes.forEach(rt => { for (let i = 1; i < rt.length; i++) { const [a, b] = [rt[i - 1], rt[i]]; const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let k = 0; k <= n; k++) used.add(Math.round(a[0] + (b[0] - a[0]) * k / n) + ',' + Math.round(a[1] + (b[1] - a[1]) * k / n)); } });
  map.pads.forEach(p => used.add(p + '')); used.add(map.hero + '');
  for (let r = 0; r < MAP_ROWS; r++) for (let cc = 0; cc < MAP_COLS; cc++) { if (used.has(cc + ',' + r) || rnd() < 0.45) continue;
    const x = C(cc) + (rnd() - 0.5) * 16, y = C(r) + (rnd() - 0.5) * 16;
    if (snow) { if (rnd() < 0.55) pine(m, x, y, 14 + rnd() * 8); else rock(m, x, y, 7 + rnd() * 5, '#6d7f8c', '#eef6fb'); }
    else { if (rnd() < 0.5) crate(m, x, y, 10 + rnd() * 6); else rock(m, x, y, 7 + rnd() * 5, '#3b2b28', '#7a4a32'); } }
  // road
  const road = texPattern(m, snow ? 'x_iceroad' : 'x_cobble');
  m.lineJoin = 'round'; m.lineCap = 'round';
  map.routes.forEach(rt => { const pts = routePx(rt); m.strokeStyle = 'rgba(0,0,0,0.45)'; m.lineWidth = 42; strokeRoute(m, pts); });
  map.routes.forEach(rt => { const pts = routePx(rt); m.strokeStyle = road || '#8a7a6a'; m.lineWidth = 34; strokeRoute(m, pts); });
  map.routes.forEach(rt => { const pts = routePx(rt); m.strokeStyle = snow ? 'rgba(255,255,255,0.25)' : 'rgba(232,112,42,0.18)'; m.lineWidth = 2; m.setLineDash([2, 8]); strokeRoute(m, pts); m.setLineDash([]); });
  if (map.ice) map.ice.forEach(([a, b]) => { const p = routePx([a, b]); m.strokeStyle = 'rgba(46,196,182,0.38)'; m.lineWidth = 30; strokeRoute(m, p);
    m.strokeStyle = 'rgba(240,255,255,0.55)'; m.lineWidth = 2; for (let k = 0; k < 6; k++) { const t = (k + 0.3) / 6; const x = p[0].x + (p[1].x - p[0].x) * t, y = p[0].y + (p[1].y - p[0].y) * t; m.beginPath(); m.moveTo(x - 6, y + 5); m.lineTo(x + 6, y - 5); m.stroke(); } });
  if (map.vents) map.vents.forEach(([vc, vr]) => { const x = C(vc), y = C(vr); m.fillStyle = '#1b1210'; rr(m, x - 13, y - 9, 26, 18, 4); m.fill(); m.strokeStyle = '#C9A14A'; m.lineWidth = 1.5; m.stroke();
    m.strokeStyle = '#5a3a2a'; m.lineWidth = 2; for (let k = -8; k <= 8; k += 4) { m.beginPath(); m.moveTo(x + k, y - 6); m.lineTo(x + k, y + 6); m.stroke(); } });
  if (map.fork) { [['A', [3.35, 5.5]], ['B', [7.65, 5.5]], ['X', map.merge]].forEach(([l, [cx, cy]]) => { const x = C(cx), y = C(cy) + (l === 'X' ? 0 : 0);
    m.fillStyle = 'rgba(107,15,26,0.9)'; m.beginPath(); m.arc(x, y, 10, 0, 7); m.fill(); m.strokeStyle = '#C9A14A'; m.lineWidth = 1.5; m.stroke(); m.font = font(12, 'Cinzel', 800); m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillStyle = '#F4E3B0'; m.fillText(l, x, y + 1); }); }
  // build pads
  map.pads.forEach(([pc, pr]) => pad(m, C(pc), C(pr), snow));
  // hero ring
  const hx = C(map.hero[0]), hy = C(map.hero[1]); m.strokeStyle = 'rgba(242,193,78,0.5)'; m.lineWidth = 2; m.setLineDash([4, 4]); m.beginPath(); m.ellipse(hx, hy + 8, 16, 6, 0, 0, 7); m.stroke(); m.setLineDash([]);
  MAPC = c;
}
function pad(m, x, y, snow) {
  m.fillStyle = 'rgba(0,0,0,0.35)'; m.beginPath(); m.ellipse(x, y + 4, 17, 9, 0, 0, 7); m.fill();
  const g = m.createLinearGradient(0, y - 10, 0, y + 10); g.addColorStop(0, snow ? '#9fb2bf' : '#6b5246'); g.addColorStop(1, snow ? '#4d6170' : '#2e1f1a');
  m.fillStyle = g; m.beginPath(); m.ellipse(x, y, 16, 9, 0, 0, 7); m.fill();
  m.strokeStyle = snow ? 'rgba(46,196,182,0.7)' : 'rgba(201,161,74,0.75)'; m.lineWidth = 1.5; m.stroke();
}
function pine(m, x, y, h) { m.fillStyle = 'rgba(0,0,0,0.25)'; m.beginPath(); m.ellipse(x, y + 2, h * 0.4, h * 0.12, 0, 0, 7); m.fill();
  for (let i = 0; i < 3; i++) { const yy = y - i * h * 0.3, ww = h * (0.45 - i * 0.1); m.fillStyle = i % 2 ? '#2b4a44' : '#21403b'; m.beginPath(); m.moveTo(x - ww, yy); m.lineTo(x + ww, yy); m.lineTo(x, yy - h * 0.5); m.closePath(); m.fill();
    m.fillStyle = 'rgba(244,249,252,0.85)'; m.beginPath(); m.moveTo(x - ww * 0.5, yy - h * 0.25); m.lineTo(x, yy - h * 0.5); m.lineTo(x + ww * 0.3, yy - h * 0.28); m.closePath(); m.fill(); } }
function rock(m, x, y, r, c1, c2) { m.fillStyle = 'rgba(0,0,0,0.3)'; m.beginPath(); m.ellipse(x, y + r * 0.5, r * 1.1, r * 0.4, 0, 0, 7); m.fill();
  m.fillStyle = c1; m.beginPath(); m.moveTo(x - r, y + r * 0.4); m.lineTo(x - r * 0.6, y - r * 0.5); m.lineTo(x + r * 0.2, y - r * 0.8); m.lineTo(x + r, y - r * 0.1); m.lineTo(x + r * 0.8, y + r * 0.4); m.closePath(); m.fill();
  m.fillStyle = c2; m.globalAlpha = 0.6; m.beginPath(); m.moveTo(x - r * 0.6, y - r * 0.5); m.lineTo(x + r * 0.2, y - r * 0.8); m.lineTo(x + r * 0.3, y - r * 0.3); m.closePath(); m.fill(); m.globalAlpha = 1; }
function crate(m, x, y, s) { m.fillStyle = 'rgba(0,0,0,0.35)'; m.fillRect(x - s / 2 + 2, y - s / 2 + 3, s, s); m.fillStyle = '#4a2a1c'; m.fillRect(x - s / 2, y - s / 2, s, s); m.strokeStyle = '#8a5a34'; m.lineWidth = 1.2; m.strokeRect(x - s / 2 + 1, y - s / 2 + 1, s - 2, s - 2); m.beginPath(); m.moveTo(x - s / 2 + 1, y - s / 2 + 1); m.lineTo(x + s / 2 - 1, y + s / 2 - 1); m.stroke(); }

// ---------------- Hero ----------------
function heroLook(profile) {
  const fac = profile.faction || 'stone'; const hero = FAC(fac).hero.key;
  const st = profile.heroes[hero]; const gear = {};
  ['weapon', 'helm', 'mantle'].forEach(s => { const it = st.equip[s] ? profile.inv.find(i => i.id === st.equip[s]) : null; gear[s] = it ? RARITY[it.rar].vis : -1; });
  return { hero, evo: st.evo, gear };
}
// field/portrait hero: painted sprite h_{hero}{evo+1}; gear shown as rarity glints and a mantle aura
function drawHero(ctx, look, x, y, h, t = 0) {
  const { hero, evo, gear } = look; const bob = Math.sin(t * 3) * h * 0.012;
  if (gear.mantle >= 0) { const col = ['rgba(200,160,110,0.30)', 'rgba(95,160,255,0.38)', 'rgba(200,90,255,0.45)'][gear.mantle];
    const g = ctx.createRadialGradient(x, y - h * 0.45, 2, x, y - h * 0.45, h * 0.5); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - h * 0.5, y - h, h, h); }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.24, h * 0.06, 0, 0, 7); ctx.fill();
  drawSprite(ctx, `h_${hero}${Math.min(3, evo + 1)}`, x, y + bob, h);
  const hc = (v) => ['#d9b98a', '#5fa8ff', '#d07aff'][v];
  [['weapon', 0.22, 0.7], ['helm', 0, 0.95]].forEach(([s, dx, dy]) => { if (gear[s] < 0) return; ctx.save(); ctx.fillStyle = hc(gear[s]); ctx.shadowColor = hc(gear[s]); ctx.shadowBlur = 6 + gear[s] * 5;
    const gx = x + h * dx, gy = y - h * dy + bob; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 5); ctx.beginPath(); ctx.moveTo(gx, gy - 4); ctx.lineTo(gx + 3, gy); ctx.lineTo(gx, gy + 4); ctx.lineTo(gx - 3, gy); ctx.closePath(); ctx.fill(); ctx.restore(); });
  if (evo >= 2) { ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2); ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, h * 0.3, h * 0.08, 0, 0, 7); ctx.stroke(); ctx.restore(); }
}
