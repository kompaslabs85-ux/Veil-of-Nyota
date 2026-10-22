// Procedural 16-bit style pixel sprites. Every sprite is drawn on a small grid
// (2 screen px per art pixel) with a dark outline pass for readable silhouettes.
'use strict';
const PAL = {
  night:'#0b1430', deep:'#14244f', blue:'#1f3a78', sky:'#3d6fc4', ice:'#9fd4ff',
  gold:'#f2c14e', goldD:'#b8862a', ochre:'#a8692f', ochreD:'#6e4220', sand:'#d6a85e', sandD:'#b38646',
  earth:'#5a3a22', grass:'#3c5a2e', grassD:'#2b4222', stone:'#8a93a6', stoneD:'#565e72', stoneL:'#c3cad8',
  red:'#e0303a', redD:'#8a1525', redL:'#ff7a7a', ember:'#ff8a2a', emberL:'#ffd27a', iron:'#4a4e5a', ironD:'#2a2c34',
  white:'#ffffff', ink:'#0a0710'
};

function makeSprite(gw, gh, draw, scale = 2) {
  const cv = document.createElement('canvas');
  cv.width = gw * scale + 2 * scale; cv.height = gh * scale + 2 * scale;
  const tmp = document.createElement('canvas'); tmp.width = gw; tmp.height = gh;
  const t = tmp.getContext('2d');
  const p = (x, y, w, h, col) => { t.fillStyle = col; t.fillRect(x, y, w, h); };
  draw(p);
  // outline: find opaque pixels, paint neighbours dark
  const img = t.getImageData(0, 0, gw, gh).data;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PAL.ink;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    if (img[(y * gw + x) * 4 + 3] > 0) {
      ctx.fillRect((x) * scale, (y + 1) * scale, scale * 3, scale);
      ctx.fillRect((x + 1) * scale, (y) * scale, scale, scale * 3);
    }
  }
  ctx.drawImage(tmp, scale, scale, gw * scale, gh * scale);
  return cv;
}
function whiteOf(cv) {
  const w = document.createElement('canvas'); w.width = cv.width; w.height = cv.height;
  const x = w.getContext('2d'); x.drawImage(cv, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, w.width, w.height);
  return w;
}

const SPR = {};
function crystal(p, x, y, h, c1, c2) { p(x, y + 1, 2, h - 1, c1); p(x, y, 1, h, c2); p(x + 1, y + 1, 1, 1, '#fff'); }

function buildSprites() {
  // ---- Enemies (Hollow: dark bodies grown over with red crystal) ----
  for (const f of [0, 1]) {
    const b = f; // bob
    SPR['husk' + f] = makeSprite(14, 16, p => {
      p(4, 4 + b, 6, 8, '#2a1a2e'); p(5, 3 + b, 4, 2, '#3a2440');
      p(5, 6 + b, 1, 1, PAL.redL); p(8, 6 + b, 1, 1, PAL.redL);           // glowing eyes
      crystal(p, 3, 1 + b, 4, PAL.red, PAL.redD); crystal(p, 9, 2 + b, 3, PAL.red, PAL.redD);
      p(4, 12, 2, 4 - b, '#2a1a2e'); p(8, 12, 2, 3 + b, '#2a1a2e');
      p(2, 7 + b, 2, 4, '#3a2440'); p(10, 7 + b, 2, 4, '#3a2440');
    });
    SPR['ling' + f] = makeSprite(12, 10, p => {
      p(2, 3, 8, 4, '#3a1830'); p(8, 2, 3, 3, '#3a1830');
      p(9, 3, 1, 1, PAL.redL);
      crystal(p, 3, 0 + b, 3, PAL.red, PAL.redD); crystal(p, 6, 1 - b + 1, 2, PAL.redL, PAL.red);
      p(2, 7, 1, 3 - b, '#3a1830'); p(5, 7, 1, 2 + b, '#3a1830'); p(8, 7, 1, 3 - b, '#3a1830');
    });
    SPR['shard' + f] = makeSprite(18, 14, p => {
      p(2, 5, 14, 6, '#3b2a2a'); p(14, 4, 4, 5, '#3b2a2a'); p(16, 5, 1, 1, PAL.redL);
      p(3, 4, 11, 2, PAL.redD);
      crystal(p, 3, 1, 4, PAL.red, PAL.redD); crystal(p, 6, 0, 5, PAL.redL, PAL.red);
      crystal(p, 9, 1, 4, PAL.red, PAL.redD); crystal(p, 12, 2, 3, PAL.red, PAL.redD);
      p(3, 11, 2, 3 - b, '#3b2a2a'); p(7, 11, 2, 2 + b, '#3b2a2a'); p(11, 11, 2, 3 - b, '#3b2a2a'); p(14, 11, 2, 2 + b, '#3b2a2a');
    });
    SPR['herald' + f] = makeSprite(24, 26, p => {
      p(6, 8 + b, 12, 12, '#2e1a34'); p(8, 4 + b, 8, 5, '#3c2246');
      p(9, 6 + b, 2, 1, PAL.gold); p(13, 6 + b, 2, 1, PAL.gold); // gold eyes of the lost griot
      p(7, 10 + b, 10, 2, PAL.goldD); // remembered bead collar
      crystal(p, 7, 0 + b, 5, PAL.red, PAL.redD); crystal(p, 11, -1 + b + 1, 5, PAL.redL, PAL.red); crystal(p, 15, 1 + b, 4, PAL.red, PAL.redD);
      crystal(p, 3, 9 + b, 6, PAL.red, PAL.redD); crystal(p, 19, 8 + b, 7, PAL.red, PAL.redD);
      p(2, 14 + b, 4, 3, '#3c2246'); p(18, 14 + b, 4, 3, '#3c2246');
      p(8, 20, 3, 6 - b, '#2e1a34'); p(13, 20, 3, 5 + b, '#2e1a34');
      p(10, 14 + b, 4, 3, PAL.red); p(11, 15 + b, 2, 1, PAL.redL);   // red heart crystal
    });
  }
  for (const k of Object.keys(SPR)) SPR[k + 'W'] = whiteOf(SPR[k]);

  // ---- Towers: taller silhouettes for higher tiers ----
  for (let tr = 0; tr < 3; tr++) {
    const h = tr * 2;
    SPR['monolith' + tr] = makeSprite(14, 18, p => {
      p(2, 15, 10, 3, PAL.stoneD);
      p(4, 5 - h, 6, 10 + h, PAL.stone); p(4, 5 - h, 2, 10 + h, PAL.stoneL); p(9, 5 - h, 1, 10 + h, PAL.stoneD);
      p(5, 9, 4, 1, PAL.goldD);
      if (tr >= 1) { p(3, 7, 8, 1, PAL.gold); }
      if (tr >= 2) { crystal(p, 6, 0, 4, PAL.sky, PAL.ice); }
      else p(5, 4 - h, 4, 1, PAL.stoneL);
    });
    SPR['drum' + tr] = makeSprite(16, 16, p => {
      p(2, 6 - h, 12, 9 + h, PAL.ochre); p(2, 6 - h, 12, 2, PAL.sand); p(2, 13, 12, 2, PAL.ochreD);
      for (let i = 0; i < 4; i++) p(3 + i * 3, 9 - h, 1, 4 + h, PAL.earth);
      p(3, 5 - h, 10, 1, tr >= 1 ? PAL.gold : PAL.sandD);
      if (tr >= 2) { p(1, 9, 1, 4, PAL.stoneL); p(14, 9, 1, 4, PAL.stoneL); crystal(p, 7, 0, 4, PAL.sky, PAL.ice); }
    });
    SPR['spire' + tr] = makeSprite(12, 20, p => {
      p(2, 16, 8, 4, PAL.stoneD);
      p(4, 6 - h, 4, 11 + h, PAL.stone); p(4, 6 - h, 1, 11 + h, PAL.stoneL);
      crystal(p, 5, 1 - (tr >= 1 ? 1 : 0) + 2 - h / 2 | 0, 5, tr >= 2 ? PAL.ember : PAL.sky, tr >= 2 ? PAL.emberL : PAL.ice);
      if (tr >= 1) p(3, 12, 6, 1, PAL.gold);
    });
    SPR['cannon' + tr] = makeSprite(16, 16, p => {
      p(2, 9 - h / 2, 12, 7 + h / 2, PAL.ochreD); p(3, 10 - h / 2, 10, 2, PAL.ochre);
      p(5, 3 - h / 2, 7, 7, PAL.iron); p(10, 4 - h / 2, 5, 4, PAL.ironD); p(5, 3 - h / 2, 7, 1, PAL.stone);
      p(6, 12, 4, 2, tr >= 1 ? PAL.ember : PAL.redD); p(7, 12, 2, 1, PAL.emberL);
      if (tr >= 2) { p(1, 8, 2, 8, PAL.goldD); p(13, 8, 2, 8, PAL.goldD); }
    });
    SPR['slag' + tr] = makeSprite(16, 18, p => {
      const h = tr;
      p(3, 13, 10, 5, PAL.earth); p(4, 12, 8, 1, PAL.ochre);
      p(7, 5 - h, 2, 8 + h, PAL.ochreD); p(2, 4 - h, 9, 2, PAL.ochre);
      p(1, 3 - h, 4, 3, PAL.iron); p(2, 3 - h, 2, 1, PAL.ember);
      if (tr >= 1) p(4, 14, 8, 1, PAL.gold);
      if (tr >= 2) { p(10, 7, 3, 3, PAL.ember); p(11, 7, 1, 1, PAL.emberL); }
    });
    SPR['lance' + tr] = makeSprite(12, 20, p => {
      p(2, 16, 8, 4, PAL.ironD); p(3, 15, 6, 1, PAL.iron);
      p(5, 4 - h, 2, 12 + h, PAL.iron); p(5, 4 - h, 1, 12 + h, PAL.stone);
      p(3, 9, 6, 2, tr >= 1 ? PAL.gold : PAL.goldD);
      crystal(p, 5, 1 - h / 2 | 0, 4, tr >= 2 ? PAL.ice : PAL.ember, tr >= 2 ? PAL.white : PAL.emberL);
    });
  }
  // Hero towers
  SPR.heroStone = makeSprite(18, 20, p => {
    p(1, 15, 16, 5, PAL.stoneD); p(2, 14, 14, 1, PAL.gold);
    p(3, 6, 12, 9, PAL.stone); p(3, 6, 3, 9, PAL.stoneL); p(13, 6, 2, 9, PAL.stoneD);
    p(6, 8, 6, 4, PAL.blue); p(8, 9, 2, 2, PAL.gold); // throne seat with Ember
    p(2, 4, 3, 3, PAL.stone); p(13, 4, 3, 3, PAL.stone);
    crystal(p, 8, 0, 6, PAL.sky, PAL.ice); crystal(p, 3, 1, 3, PAL.sky, PAL.ice); crystal(p, 14, 1, 3, PAL.sky, PAL.ice);
  });
  SPR.heroForge = makeSprite(18, 20, p => {
    p(1, 15, 16, 5, PAL.ochreD); p(2, 14, 14, 1, PAL.gold);
    p(3, 6, 12, 9, PAL.iron); p(3, 6, 12, 2, PAL.stone);
    p(6, 9, 6, 5, PAL.ember); p(7, 10, 4, 3, PAL.emberL); // furnace mouth
    p(12, 0, 3, 7, PAL.ironD); p(12, 0, 3, 1, PAL.ember); // chimney
    p(2, 3, 6, 3, PAL.ironD); p(3, 2, 4, 1, PAL.stone); // anvil
  });
  // Build spot, shrine, portal
  SPR.spot = makeSprite(16, 8, p => { p(2, 1, 12, 6, PAL.stoneD); p(1, 2, 14, 4, PAL.stoneD); p(3, 2, 10, 4, PAL.stone); p(4, 3, 8, 2, PAL.stoneL); p(7, 3, 2, 1, PAL.gold); });
  SPR.plinth = makeSprite(18, 8, p => { p(1, 1, 16, 6, PAL.goldD); p(2, 2, 14, 4, PAL.gold); p(8, 3, 2, 2, PAL.ice); });
  SPR.shrine = makeSprite(18, 22, p => {
    p(2, 17, 14, 5, PAL.stoneD); p(3, 16, 12, 1, PAL.gold);
    p(5, 10, 8, 6, PAL.stone); p(5, 10, 8, 1, PAL.stoneL);
    crystal(p, 8, 1, 10, PAL.sky, PAL.ice); crystal(p, 5, 5, 6, PAL.blue, PAL.sky); crystal(p, 11, 4, 7, PAL.blue, PAL.sky);
    p(7, 13, 4, 2, PAL.gold);
  });
  SPR.portal = makeSprite(18, 12, p => {
    p(2, 4, 14, 7, PAL.redD); p(4, 5, 10, 5, '#300818');
    crystal(p, 1, 1, 6, PAL.red, PAL.redD); crystal(p, 15, 0, 7, PAL.red, PAL.redD); crystal(p, 8, 0, 4, PAL.redL, PAL.red);
  });
  SPR.anvil = makeSprite(12, 8, p => { p(0, 0, 12, 3, PAL.iron); p(0, 0, 12, 1, PAL.stoneL); p(3, 3, 6, 3, PAL.ironD); p(2, 6, 8, 2, PAL.iron); });
  SPR.lock = makeSprite(8, 10, p => { p(2, 0, 4, 1, PAL.stone); p(1, 1, 1, 4, PAL.stone); p(6, 1, 1, 4, PAL.stone); p(0, 4, 8, 6, PAL.goldD); p(3, 6, 2, 2, PAL.ink); });
  for (const g of ['weapon', 'charm', 'relic']) for (let r = 0; r < 3; r++) {
    const col = [PAL.stoneL, '#5fa8ff', '#c070ff'][r];
    SPR['gear_' + g + r] = makeSprite(12, 12, p => {
      if (g === 'weapon') { p(5, 0, 2, 4, col); p(5, 4, 2, 6, PAL.ochre); p(3, 4, 6, 1, PAL.gold); p(5, 10, 2, 2, PAL.goldD); }
      if (g === 'charm') { p(1, 2, 10, 1, PAL.ochre); for (let i = 0; i < 5; i++) p(1 + i * 2, 3 + (i % 2), 2, 2, i === 2 ? col : PAL.gold); p(4, 6, 4, 5, col); p(5, 7, 1, 1, '#fff'); }
      if (g === 'relic') { crystal(p, 5, 0, 8, col, PAL.white); p(2, 8, 8, 4, PAL.goldD); p(3, 9, 6, 2, PAL.gold); }
    });
  }
}

// Map background, pre-rendered once with dithered earth tones.
function buildMap() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // land
  for (let ty = 1; ty < 14; ty++) for (let tx = 0; tx < 9; tx++) {
    x.fillStyle = (tx + ty) % 2 ? PAL.grass : '#35522a'; x.fillRect(tx * T, ty * T, T, T);
    for (let i = 0; i < 14; i++) { x.fillStyle = rnd() < 0.5 ? PAL.grassD : '#4a6a34'; x.fillRect(tx * T + (rnd() * 20 | 0) * 2, ty * T + (rnd() * 20 | 0) * 2, 2, 2); }
  }
  // path
  const segs = [];
  for (let i = 0; i < PATH_TILES.length - 1; i++) segs.push([PATH_TILES[i], PATH_TILES[i + 1]]);
  const pathSet = new Set();
  for (const [[c0, r0], [c1, r1]] of segs) {
    for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) pathSet.add(c + ',' + r);
  }
  for (const k of pathSet) {
    const [c, r] = k.split(',').map(Number);
    x.fillStyle = PAL.sandD; x.fillRect(c * T - 3, r * T - 3, T + 6, T + 6);
  }
  for (const k of pathSet) {
    const [c, r] = k.split(',').map(Number);
    x.fillStyle = PAL.sand; x.fillRect(c * T + 1, r * T + 1, T - 2, T - 2);
    for (let i = 0; i < 10; i++) { x.fillStyle = rnd() < 0.5 ? PAL.sandD : '#e2bb76'; x.fillRect(c * T + (rnd() * 19 | 0) * 2, r * T + (rnd() * 19 | 0) * 2, 2, 2); }
  }
  // decor: rocks and red crystal growths at the rim
  for (let i = 0; i < 26; i++) {
    const c = rnd() * 9 | 0, r = 1 + (rnd() * 13 | 0);
    if (pathSet.has(c + ',' + r) || BUILD_SPOTS.some(s => s[0] === c && s[1] === r) || (c === HERO_SPOT[0] && r === HERO_SPOT[1])) continue;
    const px = c * T + 6 + (rnd() * 24 | 0), py = r * T + 6 + (rnd() * 24 | 0);
    if (r < 4 && rnd() < 0.6) { x.fillStyle = PAL.redD; x.fillRect(px, py, 4, 8); x.fillStyle = PAL.red; x.fillRect(px + 1, py - 2, 2, 8); }
    else { x.fillStyle = PAL.stoneD; x.fillRect(px, py, 8, 5); x.fillStyle = PAL.stone; x.fillRect(px + 1, py, 5, 3); }
  }
  // hud + panel backgrounds
  x.fillStyle = PAL.night; x.fillRect(0, 0, W, T); x.fillRect(0, 14 * T, W, H - 14 * T);
  x.fillStyle = PAL.goldD; x.fillRect(0, T - 2, W, 2); x.fillRect(0, 14 * T, W, 2);
  return { canvas: cv, pathSet };
}
