"""Mobile touch test (hasTouch/isMobile emulation). Per size: 100 taps on live buttons (misroute = log != [target]),
popup guard probe (tap <250ms after a popup opens must be ignored), speed-survives-popup check, then a full Glacier mission
driven only by touch taps (time advanced with WW.tick between taps). Usage: python3 tests/touch_mobile.py"""
import random, json, sys
from playwright.sync_api import sync_playwright
random.seed(3)
SIZES = [(390, 844, 3), (360, 640, 2)]
import os
if os.environ.get('WW_SIZES') == 'all': SIZES = [(390, 844, 3), (360, 640, 2), (375, 667, 2), (412, 915, 2.625), (430, 932, 3)]
OUT = '/workspace/game-qa/iter3a-fix-shots/'
res = {}
with sync_playwright() as p:
    br = p.chromium.launch()
    for (vw, vh, dpr) in SIZES:
        ctx = br.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=dpr, has_touch=True, is_mobile=True)
        pg = ctx.new_page(); pg.goto('http://localhost:8765/index.html?test=1'); pg.wait_for_timeout(1500)
        pg.evaluate("WW.start('stone','glacier')"); pg.wait_for_timeout(400)
        box = lambda: pg.locator('canvas').bounding_box()
        def xy(h):
            b = box(); Hh = pg.evaluate('WW.H()')
            return (b['x'] + (h['vx'] + h['vw'] * random.uniform(.2, .8)) * b['width'] / 360, b['y'] + (h['vy'] + h['vh'] * random.uniform(.2, .8)) * b['height'] / Hh)
        def tap(bid, gap=120):
            hs = [x for x in pg.evaluate('WW.hits()') if x['id'] == bid]
            if not hs: return 'nobtn'
            pg.wait_for_function('performance.now() - WW.ui.popT > 270'); x, y = xy(hs[-1]); n0 = pg.evaluate('WW.ui.log.length'); pg.touchscreen.tap(x, y); pg.wait_for_timeout(gap)
            return pg.evaluate('WW.ui.log.slice(%d).map(l=>l.id)' % n0)
        miss = taps = nob = 0; log = []
        while taps < 100:
            pg.evaluate("WW.g.lives=99; WW.g.picks=[]; WW.g.sk={}; WW.g.offer={opts:WW.rollSkills(),sel:null}"); pg.wait_for_timeout(300)
            for bid in ['pick1', 'pickOk']:
                r = tap(bid); taps += 1
                if r == 'nobtn': nob += 1
                if r != [bid]: miss += 1; log.append((bid, r))
            pg.evaluate("WW.g.stakeDone=false; WW.g.stakeOffer={sel:null}"); pg.wait_for_timeout(300)
            for bid in ['stk0', 'stkSkip']:
                r = tap(bid); taps += 1
                if r != [bid]: miss += 1; log.append((bid, r))
            pg.evaluate("WW.g.inWave=false; WW.g.stakeOffer=null; WW.g.spawnQ=[]; WW.g.enemies=[]")
            for bid in ['speed', 'speed', 'speed']:
                r = tap(bid, 80); taps += 1
                if r != [bid]: miss += 1; log.append((bid, r))
            r = tap('pause', 150); taps += 1
            if r != ['pause']: miss += 1; log.append(('pause', r))
            r = tap('resume', 150); taps += 1
            if r != ['resume']: miss += 1; log.append(('resume', r))
        # popup guard probe: open popup, tap immediately where pick1 will be
        g_ok = 0; g_n = 10; probe = []
        pg.evaluate("window._pd=[];document.querySelector('canvas').addEventListener('pointerdown',()=>_pd.push(performance.now()-WW.ui.popT),true)")
        for i in range(g_n):
            pg.evaluate("WW.g.offer=null"); pg.wait_for_timeout(120)
            pg.evaluate("WW.g.picks=[]; WW.g.sk={}; WW.g.offer={opts:WW.rollSkills(),sel:null}"); pg.wait_for_function("WW.ui.sig.includes('|O|') || WW.ui.sig.startsWith('O|')")
            n0 = pg.evaluate('WW.ui.log.length'); hs = [x for x in pg.evaluate('WW.hits()') if x['id'] == 'pick1']
            x, y = xy(hs[-1]); el = pg.evaluate('performance.now() - WW.ui.popT'); pg.touchscreen.tap(x, y); pg.wait_for_timeout(30)
            st = pg.evaluate("({n:WW.ui.log.length-%d, sel:WW.g.offer&&WW.g.offer.sel})" % n0); el = pg.evaluate('_pd[_pd.length-1]'); probe.append(round(el))  # in-page time at pointerdown
            if el >= 250: g_n -= 1; pg.evaluate('WW.g.offer=null'); continue  # tap reached the page after the window (test timing), not counted
            if st['n'] == 0 and st['sel'] is None: g_ok += 1
            pg.wait_for_timeout(300); tap('pick1'); tap('pickOk')
        # speed survives popup
        pg.evaluate("WW.g.speed=1; WW.g.speedPref=1"); tap('speed'); tap('speed')  # -> 4
        pg.evaluate("WW.g.offer={opts:WW.rollSkills(),sel:null}"); pg.wait_for_timeout(300); tap('pick1'); tap('pickOk', 200)
        pg.evaluate("WW.g.stakeDone=false; WW.g.stakeOffer={sel:null}"); pg.wait_for_timeout(300); tap('stkSkip', 200)
        spd_after = pg.evaluate('WW.g.speed')
        # full mission via touch
        pg.evaluate("WW.start('stone','glacier')"); pg.wait_for_timeout(400); mt = 0; steps = 0; spot = 0; tries = {}; nontouch = []
        while pg.evaluate("WW.scene") == 'game' and not pg.evaluate("WW.g.over") and steps < 3000:
            steps += 1; ids = [h['id'] for h in pg.evaluate('WW.hits()')]
            if 'pick1' in ids: pg.wait_for_timeout(260); tap('pick1'); tap('pickOk'); mt += 2; continue
            if 'stkSkip' in ids: pg.wait_for_timeout(260); tap('stkSkip'); mt += 1; continue
            if any(i == 'fight' for i in ids):
                b = [i for i in ids if i == 'fight'][0]; tap(b); mt += 1; continue
            st = pg.evaluate("({iw:WW.g.inWave, gold:WW.g.gold, n:WW.g.map.pads.length, used:WW.g.towers.map(t=>t.spot), cost:Math.min(...WW.g.fac.towers.map(WW.buildCost)), ring:!!WW.g.ring})")
            if st['ring']:
                if tap('rClose') == 'nobtn': pg.evaluate('WW.g.ring=null'); nontouch.append('ring-close')
                mt += 1; continue
            wi = pg.evaluate('WW.g.wi'); tries[wi] = tries.get(wi, 0)
            if not st['iw'] and st['gold'] >= st['cost'] + 10 and tries[wi] < 4:
                tries[wi] += 1
                free = [i for i in range(st['n']) if i not in st['used']]
                if free:
                    s = free[spot % len(free)]; spot += 3; tap('spot%d' % s); ids2 = [h['id'] for h in pg.evaluate('WW.hits()')]
                    bt = [i for i in ids2 if i.startswith('b_')]
                    if bt: tap(random.choice(bt)); tap('bOk'); mt += 3
                    if pg.evaluate('!!WW.g.ring'): tap('rClose')
                    continue
            if not st['iw'] and 'wave' in ids: tap('wave'); mt += 1; continue
            pg.evaluate('WW.tick(90)')
        r = pg.evaluate("({scene:WW.scene, over:WW.g&&WW.g.over, res:WW.result&&{win:WW.result.win,stars:WW.result.stars,gold:WW.result.goldEnd}})")
        pg.wait_for_timeout(600); pg.screenshot(path=OUT + f'touch_result_{vw}x{vh}.png')
        res[f'{vw}x{vh}'] = dict(taps=taps, misroutes=miss, nobtn=nob, misroute_log=log[:10], guard_ignored=f'{g_ok}/{g_n}', probe_ms=probe, guarded_counter=pg.evaluate('WW.ui.guarded'), speed_after_popups=spd_after, mission_touch_taps=mt, mission=r, mission_nontouch_closes=len(nontouch), mission_steps=steps)
        ctx.close()
    br.close()
print(json.dumps(res, indent=1)); json.dump(res, open('/workspace/game-qa/iter3a-touch.json', 'w'), indent=1)
