import time, random
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page(viewport={'width':1440,'height':900})
    pg.goto('http://localhost:8765/index.html?test=1'); pg.wait_for_timeout(1500)
    pg.evaluate("WW.start('stone','glacier')"); pg.wait_for_timeout(300)
    def click(bid, gap):
        h=[x for x in pg.evaluate('WW.hits()') if x['id']==bid]
        if not h: return 'nobtn'
        h=h[-1]; b=pg.locator('canvas').bounding_box(); Hh=pg.evaluate('WW.H()')
        x=b['x']+(h['vx']+h['vw']*random.uniform(.2,.8))*b['width']/360; y=b['y']+(h['vy']+h['vh']*random.uniform(.2,.8))*b['height']/Hh
        n0=pg.evaluate('WW.ui.log.length'); pg.mouse.click(x,y); pg.wait_for_timeout(gap)
        return pg.evaluate('WW.ui.log.slice(%d).map(l=>l.id)'%n0)
    miss=0; tot=0
    for k in range(25):
        pg.evaluate("WW.g.lives=99; WW.g.picks=[]; WW.g.sk={}; WW.g.offer={opts:WW.rollSkills(),sel:null}"); pg.wait_for_timeout(random.choice([30,200,500]))
        for bid in ['pick1','pickOk']:
            tot+=1; r=click(bid, random.choice([50,150,300]))
            if r!=[bid]: miss+=1; print("miss",k,bid,r,pg.evaluate("({ids:WW.hits().map(h=>h.id).join(),o:!!WW.g.offer,ov:WW.g.over,ow:WW.g.offer&&WW.g.offer.opts.length})"))
        pg.evaluate("WW.g.stakeDone=false; WW.g.stakeOffer={sel:null}"); pg.wait_for_timeout(random.choice([30,200,500]))
        for bid in ['stk0','stkSkip']:
            tot+=1; r=click(bid, random.choice([50,150,300]))
            if r!=[bid]: miss+=1; print('miss',k,bid,r)
        pg.evaluate("WW.g.inWave=false; WW.g.spawnQ=[]; WW.g.enemies=[]")
    print('miss',miss,'of',tot); br.close()
