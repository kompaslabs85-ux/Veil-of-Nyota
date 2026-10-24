"""iter3b.1 fix: verify each faction trade-off in play + full 50-wave run with both bosses killed. Usage: python3 tests/tradeoffs_w50.py [outdir]"""
import sys, os, subprocess, time, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/wwto'; os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8775'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
errs, rep = [], {}
def tap(pg, bid):
    for _ in range(40):
        h = [x for x in pg.evaluate('WW.hits()') if x['id'] == bid]
        if h: break
        pg.wait_for_timeout(100)
    h = h[-1]; pg.wait_for_timeout(350); b = pg.locator('canvas').bounding_box(); Hh = pg.evaluate('WW.H()')
    pg.touchscreen.tap(b['x'] + (h['vx'] + h['vw'] / 2) * b['width'] / 360, b['y'] + (h['vy'] + h['vh'] / 2) * b['height'] / Hh); pg.wait_for_timeout(120)
CLEAR = "(()=>{for(let k=0;k<20;k++){ if(WW.g.offer) WW.pickSkill(WW.g.offer.opts[0]); if(WW.g.stakeOffer) WW.placeStake(-1); }})()"
PROBE = """((fk)=>{ const g=WW.g, out={fac:fk};
  const keys=Object.keys(g.fac.base==='forge'?{cannon:1,slag:1,lance:1,bell:1,kiln:1}:{monolith:1,drum:1,spire:1,bastion:1,skyhook:1});
  out.cost={}; keys.forEach(k=>out.cost[k]=WW.buildCost(k));
  g.gold=99999; const pads=g.map.pads; let i=0; keys.forEach(k=>{ while(i<pads.length && !WW.build(k,i)) i++; i++; });
  out.dmg={}; g.towers.forEach(t=>out.dmg[t.key]=+WW.effStats(t).dmg.toFixed(2));
  out.cdMax=+g.hero.cdMax.toFixed(2);
  // sell
  const n0=g.towers.length; WW.sell(g.towers[0]); out.sold=n0-g.towers.length; out.sellToast=g.toast&&g.toast.s;
  // play a wave and watch heat
  let maxHeat=0, hotEver=false; for(let wv=0;wv<4;wv++){ for(let k=0;k<20;k++){ if(g.offer) WW.pickSkill(g.offer.opts[0]); if(g.stakeOffer) WW.placeStake(-1); } WW.callWave(); for(let s=0;s<1500&&g.inWave;s++){ WW.tick(1); g.towers.forEach(t=>{maxHeat=Math.max(maxHeat,t.heat||0); if(t.hot>0) hotEver=true;}); } }
  out.maxHeat=+maxHeat.toFixed(1); out.overheated=hotEver;
  // ability gold cost + power
  ${CLEAR}; WW.callWave(); WW.tick(60); g.hero.cd=0; g.gold=1000; const ok=WW.useAbility(); out.ability={ok, goldSpent:1000-g.gold};
  g.hero.cd=0; g.gold=10; out.abilityPoor=WW.useAbility(); out.poorToast=g.toast&&g.toast.s;
  return out; })"""
try:
    with sync_playwright() as p:
        br = p.chromium.launch(); pg = br.new_page(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://localhost:8775/index.html?test=1'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(1500)
        for f in ['sun', 'jade', 'stone', 'forge', 'star']:
            pg.evaluate(f"WW.setSeed(7); WW.start('{f}','glacier')"); pg.wait_for_timeout(100)
            rep[f] = pg.evaluate(PROBE.replace('${CLEAR}', CLEAR) + f"('{f}')")
        # ability damage: same enemy, sun vs star (both forge kit, same 'anvil' ability)
        for f in ['sun', 'star']:
            rep[f]['abilityDmg'] = pg.evaluate(f"""(()=>{{ WW.setSeed(3); WW.start('{f}','glacier'); const g=WW.g; WW.callWave(); for(let i=0;i<400 && !g.enemies.length;i++) WW.tick(1);
              const e=g.enemies[0]; e.hp=e.max=1e6; e.x=g.hero.x+30; e.y=g.hero.y; const h0=e.hp; g.hero.cd=0; g.gold=500; WW.useAbility(); return Math.round(h0-e.hp); }})()""")
        # full 50-wave run (Frostmark): every pad built + upgraded with cheat-level gold; the Herald intro is dismissed with a real tap on FIGHT
        RUN = """((mk, fresh)=>{ const g0=WW.g; if(fresh){ WW.setSeed(11); WW.start('stone',mk); const g=WW.g; window.__L={waves:g.map.waves.length, bosses:[]};
              const ks=['monolith','spire','bastion','drum','skyhook']; g.map.pads.forEach((p,i)=>{ g.gold=1e6; WW.build(ks[i%ks.length],i); }); }
              const g=WW.g, L=window.__L, C=()=>{for(let k=0;k<20;k++){ if(g.offer) WW.pickSkill(g.offer.opts[0]); if(g.stakeOffer) WW.placeStake(-1); }};
              for(let guard=0; !g.over && guard<200; guard++){
                if(!g.inWave){ C(); g.gold=1e6; g.towers.forEach(t=>{ for(let n=0;n<12;n++) WW.upgrade(t, 'A'); }); WW.callWave(); }
                let steps=0; while((g.inWave||g.spawnQ.length) && !g.over && steps<30000){ WW.tick(1); steps++; C();
                  if(g.boss && g.boss.hp>0 && !g.boss.__seen){ g.boss.__seen=1; L.bosses.push({k:g.boss.k,name:g.boss.d.name,max:Math.round(g.boss.max),wave:g.wi,banner:g.banner&&g.banner.s, kb:g.bossKills||0}); }
                  if(g.cinema) return 'cinema'; }
                const lb=L.bosses[L.bosses.length-1]; if(lb && lb.killed==null && !(g.boss&&g.boss.hp>0)){ lb.killed=(g.bossKills||0)>lb.kb; lb.fightSecs=Math.round(g.bossDur); }
              }
              L.over=g.over; L.wi=g.wi; L.lives=g.lives; L.result=WW.result&&{win:WW.result.win, stars:WW.result.stars, reason:WW.result.reason}; L.bossKilledFlag=g.bossKilled; L.bossKills=g.bossKills; return L; })"""
        for mk in ['glacier', 'foundry']:
            r = pg.evaluate(RUN + f"('{mk}', true)")
            while r == 'cinema':
                pg.wait_for_timeout(1800); pg.screenshot(path=f'{OUT}/herald-cinema-{mk}.png'); tap(pg, 'fight')
                pg.evaluate("WW.tick(90)"); pg.screenshot(path=f'{OUT}/herald-fight-{mk}.png')
                r = pg.evaluate(RUN + f"('{mk}', false)")
            rep['run50_' + mk] = r
            pg.wait_for_timeout(600); pg.screenshot(path=f'{OUT}/run50-{mk}-end.png')
        br.close()
finally: srv.terminate()
print(json.dumps(rep, indent=1)); print('ERRORS', errs)
