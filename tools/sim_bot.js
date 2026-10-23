// Warden Wars sim bot (runs in-page with ?test=1). Plays a reasonable build/upgrade policy, records leaks, bank and boss time.
window.runSim = function (fac, mk, seed, opts) {
  opts = opts || {}; WW.setSeed(seed); WW.start(fac, mk); const g0 = () => WW.g; const out = { fac, mk, seed, waves: [], bossDur: null, win: false, stars: 0, bankPre: [], bankPeak: 0, early: 0, earlyN: 0, calls: 0, choices: 0, stakes: [], profile: opts.profile || 'full' };
  const thin = opts.profile === 'thin'; let clean = 0, done = 0;
  const F = { stone: ['monolith', 'spire', 'skyhook', 'drum', 'bastion'], forge: ['cannon', 'kiln', 'lance', 'slag', 'bell'] }[fac];
  // pad order: by number of route points within range
  const map = WW.MAPS[mk]; const C = (c) => c * 40 + 20;
  const pts = []; (map.routes||[]).forEach(rt => { for (let i = 1; i < rt.length; i++) { const a = rt[i - 1], b = rt[i]; for (let k = 0; k <= 10; k++) pts.push({ x: C(a[0] + (b[0] - a[0]) * k / 10), y: C(a[1] + (b[1] - a[1]) * k / 10) }); } });
  const order = map.pads.map((p, i) => ({ i, n: pts.filter(q => Math.hypot(q.x - C(p[0]), q.y - C(p[1])) < 100).length })).sort((a, b) => b.n - a.n).map(o => o.i);
  let bi = 0, guard = 0;
  function spendAll() {
    const g = g0(); let did = true;
    while (did && guard++ < 5000) { did = false;
      const free = order.filter(i => !g.towers.some(t => t.spot === i));
      const want = F[bi % F.length]; const nTow = g.towers.length;
      const cheapestUp = g.towers.filter(t => t.lvl < 10).map(t => ({ t, c: WW.towerStats && t.lvl + 1 === 4 ? null : null, cost: upCostOf(t) })).sort((a, b) => a.cost - b.cost)[0];
      if (free.length && (nTow < (thin ? 4 : 6 + g.wi) || !cheapestUp) && (!thin || nTow < 4) && g.gold >= buildCostOf(want)) { if (WW.build(want, free[0])) { bi++; did = true; out.choices++; continue; } }
      if (cheapestUp && (!thin || cheapestUp.t.lvl < 3) && g.gold >= cheapestUp.cost) { const t = cheapestUp.t; if (WW.upgrade(t, t.lvl + 1 === 4 ? (bi++ % 2 ? 'A' : 'B') : undefined)) { did = true; out.choices++; } } }
  }
  function buildCostOf(k) { return WW.buildCost(k); }
  function upCostOf(t) { return WW.upCost(t.key, t.lvl); }
  let lastWi = -1, steps = 0, decided = -1;
  while (g0() && !g0().over && steps++ < 300000) {
    const G = g0();
    if (G.offer) { WW.pickSkill(G.offer.opts[0]); out.choices++; continue; }
    if (G.stakeOffer) { let pick = opts.stake != null ? opts.stake : -1;
      if (opts.stakePolicy) { const pc = (clean + 1) / (done + 2); pick = pc >= 0.95 ? 2 : pc >= 0.85 ? 1 : pc >= 0.70 ? 0 : -1; if (pick >= 0 && !WW.stakeQuote(pick).can) pick = -1; out.stakes.push({ w: G.wi + 1, pc: Math.round(pc * 100), tier: pick }); }
      WW.placeStake(pick); out.choices++; continue; }
    if (G.cinema) { G.cinema = null; G.bossT0 = G.t; continue; }
    if (!G.inWave && G.wi !== lastWi) { spendAll(); out.bankPeak = Math.max(out.bankPeak, Math.round(G.gold)); lastWi = G.wi; out.waves.push({ w: G.wi + 1, l0: G.lives }); if (out.waves.length > 1) { const pw = out.waves[out.waves.length - 2]; pw.lost = G.lives >= 0 ? pw.l0 - G.lives : 0; done++; if (G.leakLog.filter(l => l.w === pw.w).length === 0) clean++; pw.leaks = G.leakLog.filter(l => l.w === pw.w).length; } if (0) out.waves[out.waves.length - 2].lost = out.waves[out.waves.length - 2].l0 - G.lives; if (!G.timerMax) WW.callWave(false); }
    if (!G.inWave && G.timerMax && G.timer < G.timerMax - 3 && G.wi < map.waves.length && decided !== G.wi) { decided = G.wi; const prevClean = out.waves.length > 1 && out.waves[out.waves.length - 2].lost === 0; const go = opts.callEarly === true || (opts.callEarly === 'human' && prevClean); out.calls++; if (go) { out.earlyN++; out.choices++; WW.callWave(true); } }
    if (G.inWave && G.hero.cd <= 0 && G.enemies.length > 4) WW.useAbility();
    if (opts.stopWave && G.inWave && G.wi + 1 >= opts.stopWave && G.enemies.length > 3 && !G.boss) return { stopped: G.wi + 1 };
    if (opts.stopBoss && G.boss && G.boss.hp < G.boss.max * 0.45) return { stopped: 'boss' };
    WW.tick(1, 1 / 30);
    if (G.gold > 60 && steps % 15 === 0) spendAll();
  }
  const G = g0(); if (out.waves.length) { const lw = out.waves[out.waves.length - 1]; lw.lost = lw.l0 - G.lives; } out.bossLeaked = G.leakLog.some(l => l.boss); out.bossHpLeft = G.boss ? Math.round(100 * Math.max(0, G.boss.hp_at_leak || 0) / G.boss.max) : null; out.leakKinds = G.leakLog.map(l => l.w + ':' + l.k); out.waves.forEach(w => { w.leaks = G.leakLog.filter(l => l.w === w.w).length; }); out.bankLog = G.bankLog; out.early = G.earlyGold;
  out.bossDur = G.bossDur ? Math.round(G.bossDur * 10) / 10 : null; out.win = !!(WW.result && WW.result.win); out.stars = WW.result ? WW.result.stars : 0; out.lives = G.lives; out.maxLives = G.maxLives; out.shards = WW.result ? WW.result.shards : 0; out.gameMin = Math.round(G.t / 6) / 10; out.cpm = G.t ? Math.round(out.choices / (G.t / 60) * 10) / 10 : 0; out.leaksTot = G.leakLog.length; out.stakeLog = G.stakeLog; out.goldEnd = Math.round(G.gold);
  return out;
};
