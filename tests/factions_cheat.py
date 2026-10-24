"""iter3b: all 5 factions selectable via real touch taps on the faction screen + playable, 50 waves / 2 bosses per map,
owner cheat (7 gold taps in 3s, and typing 'nyota' in production mode). Usage: python3 tests/factions_cheat.py [outdir]"""
import sys, os, subprocess, time, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/ww3b'; os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8773'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
errs, rep = [], {}
def btn(pg, bid):
    for _ in range(25):
        h = [x for x in pg.evaluate('WW.hits()') if x['id'] == bid]
        if h: return h[-1]
        pg.wait_for_timeout(80)
    raise AssertionError('no button ' + bid)
def tap(pg, bid):
    h = btn(pg, bid); pg.wait_for_function('performance.now() - WW.ui.popT > 270')
    b = pg.locator('canvas').bounding_box(); Hh = pg.evaluate('WW.H()')
    pg.touchscreen.tap(b['x'] + (h['vx'] + h['vw'] / 2) * b['width'] / 360, b['y'] + (h['vy'] + h['vh'] / 2) * b['height'] / Hh); pg.wait_for_timeout(90)
try:
    with sync_playwright() as p:
        br = p.chromium.launch(); pg = br.new_page(viewport={'width': 360, 'height': 640}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        pg.goto('http://localhost:8773/index.html?test=1'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(1800)
        tap(pg, 'play'); pg.screenshot(path=f'{OUT}/faction-screen.png')
        for f in ['sun', 'jade', 'stone', 'forge', 'star']:
            if pg.evaluate('WW.scene') != 'faction': pg.evaluate("WW.scene='faction'")
            tap(pg, 'f_' + f); tap(pg, 'facOk'); sel = pg.evaluate('WW.P.faction')
            for mk in ['glacier', 'foundry']:
                pg.evaluate(f"WW.start('{f}','{mk}')"); pg.wait_for_timeout(150)
                w = pg.evaluate("(()=>{const m=WW.g.map; return {waves:m.waves.length, bosses:m.waves.map((w,i)=>w.boss?(i+1)+':'+w.boss:null).filter(Boolean)}})()")
                pg.evaluate("(()=>{WW.callWave(); for(let i=0;i<300;i++) WW.tick(30); WW.useAbility();})()")
                rep[f'{f}/{mk}'] = dict(selected=sel, fac=pg.evaluate('WW.g.fac.name'), **w)
            pg.screenshot(path=f'{OUT}/play-{f}.png'); pg.evaluate("WW.endMission && WW.endMission(false)"); pg.wait_for_timeout(100)
            pg.evaluate("WW.scene='faction'")
        # cheat via 7 real touch taps on the gold counter
        pg.evaluate("WW.start('jade','glacier')"); pg.wait_for_timeout(300); g0 = pg.evaluate('[WW.g.gold, WW.P.shards]')
        for _ in range(7): tap(pg, 'goldPill')
        g1 = pg.evaluate('[WW.g.gold, WW.P.shards, WW.g.toast && WW.g.toast.s, !!WW.g.cheated]'); pg.screenshot(path=f'{OUT}/cheat-toast.png')
        rep['cheat_taps'] = {'before': g0, 'after': g1}
        # production (no ?test=1): type 'nyota', check saved profile shards
        pg2 = br.new_page(viewport={'width': 1280, 'height': 800}); pg2.on('pageerror', lambda e: errs.append(str(e)))
        pg2.goto('http://localhost:8773/index.html'); pg2.evaluate('localStorage.clear()'); pg2.reload(); pg2.wait_for_timeout(1500)
        pg2.mouse.click(640, 400); pg2.keyboard.type('nyota'); pg2.wait_for_timeout(200)
        rep['cheat_keys_prod'] = {'hooks_absent': pg2.evaluate("typeof WW === 'undefined'"), 'shards': pg2.evaluate("(JSON.parse(localStorage.getItem('ww_profile_v3')||localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('ww_profile'))||'x')||'{}')).shards")}
        br.close()
finally: srv.terminate()
print(json.dumps(rep, indent=1)); print('ERRORS', errs)
