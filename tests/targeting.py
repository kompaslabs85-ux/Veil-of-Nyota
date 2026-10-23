"""Targeting-mode smoke test: First / Last / Strongest / Weakest on a staged wave, ring toggle by tap (44px hit),
mode kept through upgrade and run save/resume, hero toggle. Usage: python3 tests/targeting.py"""
import json
from playwright.sync_api import sync_playwright
out = {}; fails = []
with sync_playwright() as p:
    br = p.chromium.launch(); c = br.new_context(viewport={'width': 360, 'height': 640}, device_scale_factor=2, has_touch=True, is_mobile=True); pg = c.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/index.html?test=1'); pg.wait_for_timeout(1500)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1500)
    pg.evaluate("WW.setSeed(5); WW.start('stone','glacier'); WW.g.gold = 5000")
    pg.wait_for_timeout(300); pg.evaluate("(()=>{const k=WW.g.fac.towers[0]; for(let i=0;i<WW.g.map.pads.length;i++) WW.build(k,i);})()")
    # stage: pick the tower with the most enemies in range during wave 2
    pg.evaluate("WW.callWave(true)")
    staged = None
    for i in range(400):
        pg.evaluate("WW.g.towers.forEach(t=>t.cd=1e9); WW.g.hero.atk=1e9; WW.tick(3)")
        s = pg.evaluate("""(()=>{ let best=null; WW.g.towers.forEach(t=>{ const r=WW.towerStats? WW.effStats(t).range : 100; const tg=WW.targets(t, r, 'yes'); if(!best||tg.length>best.n) best={spot:t.spot,n:tg.length,r}; }); return best; })()""")
        if s and s['n'] >= 4: staged = s; break
    out['staged_enemies_in_range'] = staged
    modes = ['first', 'last', 'strong', 'weak']; res = {}
    if staged:
        # distinct HP values so strongest/weakest are unambiguous; one HP tie to exercise the progress tie-break
        pg.evaluate("""(()=>{ const t=WW.g.towers.find(t=>t.spot===%d); const tg=WW.targets(t,%f,'yes'); tg.forEach((e,i)=>{ e.hp = 50 + 37*((i*7)%%tg.length); }); if(tg.length>2){ tg[tg.length-1].hp = tg[0].hp; } window._tt=t; })()""" % (staged['spot'], staged['r']))
        for m in modes:
            r = pg.evaluate("""(m)=>{ const t=window._tt; t.tgt=m; const tg=WW.targets(t,%f,'yes'); const prog=e=>e.fly&&!(e.grounded>0)? e.prog*1e4 : e.dist;  // independent oracle
              const c = tg.slice(); const exp = {first:(a,b)=>prog(b)-prog(a), last:(a,b)=>prog(a)-prog(b), strong:(a,b)=>(b.hp-a.hp)||(prog(b)-prog(a)), weak:(a,b)=>(a.hp-b.hp)||(prog(b)-prog(a))}[m];
              c.sort(exp); return {pick:{hp:tg[0].hp,dist:Math.round(tg[0].dist)}, expect:{hp:c[0].hp,dist:Math.round(c[0].dist)}, ok: tg[0]===c[0], n:tg.length}; }""" % staged['r'], m)
            res[m] = r
            if not r['ok']: fails.append(f'mode {m}: picked {r["pick"]} expected {r["expect"]}')
        # live fire: tower actually shoots the selected target
        for m in modes:
            r = pg.evaluate("""(m)=>{ const t=window._tt; t.tgt=m; const tg=WW.targets(t,%f,'yes'); const want=tg[0]; const hp0=new Map(WW.g.enemies.map(e=>[e,e.hp])); t.cd=0; WW.tick(1, 1/60);
              const hit=WW.g.enemies.filter(e=>e.hp<hp0.get(e)); return {hit_selected: hit.includes(want) || want.hp<=0, hits:hit.length}; }""" % staged['r'], m)
            res[m]['live'] = r
    out['modes'] = res
    pg.evaluate("WW.g.enemies=[]; WW.g.spawnQ=[]; WW.g.inWave=false")
    # ring toggle by touch
    def tap(bid):
        hs = [x for x in pg.evaluate('WW.hits()') if x['id'] == bid]
        if not hs: return None
        h = hs[-1]; b = pg.locator('canvas').bounding_box(); Hh = pg.evaluate('WW.H()')
        pg.touchscreen.tap(b['x'] + (h['vx'] + h['vw'] / 2) * b['width'] / 360, b['y'] + (h['vy'] + h['vh'] / 2) * b['height'] / Hh); pg.wait_for_timeout(200); return h
    t0 = pg.evaluate("WW.g.towers[0].spot"); pg.evaluate("WW.g.towers[0].tgt='first'")
    pg.evaluate("WW.g.towers.forEach(t=>t.cd=0.5); WW.g.ring=null"); pg.wait_for_timeout(200); tap('tw%d' % t0); out['ids_after_ring'] = [x['id'] for x in pg.evaluate('WW.hits()')][-8:]; h = tap('tgt'); seq = [pg.evaluate("WW.g.towers[0].tgt")]
    for i in range(3): tap('tgt'); seq.append(pg.evaluate("WW.g.towers[0].tgt"))
    out['ring_cycle'] = seq; out['tgt_hit_box'] = h and {'w': h['w'], 'h': h['h']}
    if seq != ['last', 'strong', 'weak', 'first']: fails.append('ring cycle ' + str(seq))
    if not h or h['w'] < 44 or h['h'] < 44: fails.append('tgt hit box < 44')
    pg.wait_for_timeout(300); pg.screenshot(path='/workspace/game-qa/iter3a-final-shots/12-ring-target.png')
    tap('tgt'); tap('tgt')  # -> strong
    pg.evaluate("(()=>{const t=WW.g.towers[0]; WW.g.gold=5000; WW.upgrade(t)})()"); up = pg.evaluate("[WW.g.towers[0].lvl, WW.g.towers[0].tgt]"); out['after_upgrade'] = up
    if up[1] != 'strong': fails.append('mode lost on upgrade')
    tap('rClose')
    # hero toggle
    tap('heroTap'); hh = tap('tgt'); out['hero_tgt'] = pg.evaluate("WW.g.hero.tgt"); out['hero_tgt_box'] = hh and {'w': hh['w'], 'h': hh['h']}
    if out['hero_tgt'] != 'last': fails.append('hero toggle ' + str(out['hero_tgt']))
    pg.screenshot(path='/workspace/game-qa/iter3a-final-shots/13-hero-target.png'); tap('rClose')
    # save/resume
    pg.evaluate("WW.snapshot()"); snap = pg.evaluate("WW.getRun()"); out['snapshot_tgt'] = snap and [[t.get('spot'), t.get('tgt')] for t in snap['towers'][:3]] + [['hero', snap.get('htgt')]]
    if not snap or snap['towers'][0].get('tgt') != 'strong' or snap.get('htgt') != 'last': fails.append('snapshot lost mode')
    out['page_errors'] = errs[:3]
    br.close()
out['fails'] = fails; print(json.dumps(out, indent=1)); json.dump(out, open('/workspace/game-qa/iter3a-targeting.json', 'w'), indent=1)
raise SystemExit(1 if fails or out['page_errors'] else 0)
