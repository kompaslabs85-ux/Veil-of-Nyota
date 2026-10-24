import sys, os, subprocess, time
from playwright.sync_api import sync_playwright
ROOT='/workspace/veil-of-nyota'; OUT=sys.argv[1] if len(sys.argv)>1 else '/workspace/game-qa/iter3b1-fix-shots'; os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable,'-m','http.server','8774'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
errs=[]
try:
  with sync_playwright() as p:
    br=p.chromium.launch(); pg=br.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=2)
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto('http://localhost:8774/index.html?test=1'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(2000)
    pg.evaluate("WW.scene='faction'"); pg.wait_for_timeout(400); pg.screenshot(path=f'{OUT}/faction-select.png')
    for i,f in enumerate(['sun','jade','stone','forge','star']):
      pg.evaluate(f"WW.scene='faction'; WW.ui.facSel='{f}'"); pg.wait_for_timeout(250); pg.screenshot(path=f'{OUT}/faction-{f}-selected.png')
      mk='glacier' if i%2==0 else 'foundry'
      pg.evaluate(f"WW.start('{f}','{mk}')"); pg.wait_for_timeout(300)
      
      pg.evaluate("(()=>{const g=WW.g, ks=g.fac.towers||Object.keys(g.fac.tw||{}); for(let i=0;i<g.map.pads.length;i++){g.gold+=400; try{WW.build(ks[i%ks.length], i)}catch(e){}} g.gold=300;})()")
      for step in range(90):
        pg.evaluate("(()=>{const g=WW.g; if(g.offer) WW.pickSkill(g.offer.opts[0]); if(g.stakeOffer) WW.placeStake(-1); if(!g.inWave) WW.callWave(); WW.tick(20);})()"); pg.wait_for_timeout(40)
        if pg.evaluate("WW.g.inWave && WW.g.enemies.length>=7"): break
      pg.evaluate("(()=>{const g=WW.g; g.offer=null; g.stakeOffer=null;})()"); pg.wait_for_timeout(120)
      pg.wait_for_timeout(300); pg.screenshot(path=f'{OUT}/ingame-{f}-{mk}.png')
      hb=pg.evaluate("(()=>{const c=document.querySelector('canvas').getBoundingClientRect(); const k=c.width/360; const g=WW.g; return {x:c.left+g.hero.x*k, y:c.top+(g.hero.y+(typeof MAPY==='function'?0:0))*k, k}})()")
      pg.screenshot(path=f'{OUT}/ingame-hero-{f}.png')
      pg.evaluate("WW.endMission&&WW.endMission(false)"); pg.evaluate("WW.scene='title'"); pg.wait_for_timeout(500); pg.screenshot(path=f'{OUT}/title-{f}.png')
      pg.evaluate("WW.scene='levelup'"); pg.wait_for_timeout(400); pg.screenshot(path=f'{OUT}/hero-{f}.png')
    pg.evaluate("(()=>{WW.start('stone','glacier'); const g=WW.g; g.wi=24; const ks=['monolith','spire','bastion','drum','skyhook']; g.map.pads.forEach((p,i)=>{g.gold=1e5; WW.build(ks[i%5],i)}); g.offer=null; g.stakeOffer=null; WW.callWave(); for(let i=0;i<900 && !(g.boss&&g.boss.hp>0);i++){ if(g.offer) WW.pickSkill(g.offer.opts[0]); if(g.stakeOffer) WW.placeStake(-1); WW.tick(1);} WW.tick(60); })()"); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{OUT}/boss-w25-bar.png')
    br.close()
finally: srv.terminate()
print('ERRORS',errs)
