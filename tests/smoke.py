"""Warden Wars smoke test: headless Chromium, no console errors, plays a mission at 4x, screenshots."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/workspace/ww-shots'
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errors = []
def tap(page, bid):
    h = [x for x in page.evaluate('WW.hits()') if x['id'] == bid]
    for _ in range(4):  # a deferred between-wave skill offer can pop over the panel mid-test (race, not a game bug)
        if h or not page.evaluate('!!WW.g.offer'): break
        while page.evaluate('!!WW.g.offer'): tap(page, 'pick0')
        if bid in ('up', 'brA', 'brB', 'sell') and not page.evaluate('!!WW.g.sel'): tap(page, 'tw3')
        page.wait_for_timeout(100); h = [x for x in page.evaluate('WW.hits()') if x['id'] == bid]
    assert h, 'no button ' + bid
    b = page.locator('canvas').bounding_box(); Hh = page.evaluate('WW.H()')
    x = b['x'] + (h[-1]['x'] + h[-1]['w'] / 2) * b['width'] / 360; y = b['y'] + (h[-1]['y'] + h[-1]['h'] / 2) * b['height'] / Hh
    page.mouse.move(x, y); page.mouse.down(); page.wait_for_timeout(60); page.mouse.up(); page.wait_for_timeout(150)
try:
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, vp, mob in [('mobile', {'width': 390, 'height': 844}, True), ('desktop', {'width': 1440, 'height': 900}, False)]:
            ctx = br.new_context(viewport=vp, device_scale_factor=3 if mob else 1, has_touch=mob, is_mobile=mob)
            page = ctx.new_page()
            page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
            page.on('response', lambda r: r.status >= 400 and errors.append(f'{r.status} {r.url}'))
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto('http://localhost:8765/index.html'); page.wait_for_function('document.readyState=="complete"'); page.wait_for_timeout(1500)
            page.screenshot(path=f'{OUT}/{name}-01-title.png')
            tap(page, 'play'); page.wait_for_timeout(300); page.screenshot(path=f'{OUT}/{name}-02-faction.png')
            tap(page, 'f_stone' if mob else 'f_forge'); page.wait_for_timeout(300); page.screenshot(path=f'{OUT}/{name}-03-brief.png')
            tap(page, 'go'); page.wait_for_timeout(400); page.screenshot(path=f'{OUT}/{name}-04-tutorial.png')
            tap(page, 'spot3'); page.screenshot(path=f'{OUT}/{name}-05-build.png')
            towers = page.evaluate('WW.g.fac.towers')
            tap(page, 'b_' + towers[0]); page.wait_for_timeout(300)
            page.evaluate('WW.g.gold += 300')
            for i, sp in enumerate([5, 9, 4]):
                tap(page, f'spot{sp}'); tap(page, 'b_' + towers[[1, 4, 2][i]])
            n = page.evaluate('WW.g.towers.length'); assert n == 4, f'towers {n}'
            spots = page.evaluate('WW.g.towers.map(t=>t.spot)'); assert len(set(spots)) == len(spots), 'stacked towers'
            tap(page, 'wave'); tap(page, 'speed'); tap(page, 'speed')
            assert page.evaluate('WW.g.speed') == 4, 'speed'
            page.wait_for_timeout(2500); page.screenshot(path=f'{OUT}/{name}-06-wave-4x.png')
            # select tower: panel + NEXT WAVE still visible
            page.evaluate('WW.g.gold += 2000')
            for _ in range(5):
                while page.evaluate('!!WW.g.offer'): tap(page, 'pick0')
                tap(page, 'tw3'); page.wait_for_timeout(100)
                if page.evaluate('!!WW.g.sel && !WW.g.offer'): break
            for _ in range(5):  # a deferred skill offer can open between select and hits() (wave end race)
                ids = [h['id'] for h in page.evaluate('WW.hits()')]
                if 'wave' in ids and 'up' in ids: break
                while page.evaluate('!!WW.g.offer'): tap(page, 'pick0')
                tap(page, 'tw3'); page.wait_for_timeout(100)
            assert 'wave' in ids and 'up' in ids, ids
            page.evaluate('WW.g.speed = 1')  # skill picks are deferred to between waves; keep the wave running while testing the panel
            for _ in range(2):
                while page.evaluate('!!WW.g.offer'): tap(page, 'pick0')
                if not page.evaluate('!!WW.g.sel'): tap(page, 'tw3')
                tap(page, 'up')
            while page.evaluate('!!WW.g.offer'): tap(page, 'pick0')
            if not page.evaluate('!!WW.g.sel'): tap(page, 'tw3')
            page.screenshot(path=f'{OUT}/{name}-07-panel-delta.png')
            tap(page, 'brA'); tap(page, 'road'); page.screenshot(path=f'{OUT}/{name}-08-roadmap.png'); tap(page, 'roadback')
            tap(page, 'close')
            # play on at 4x for a while, accept picks/stakes as they arise
            for _ in range(160):
                st = page.evaluate('({o:!!(WW.g&&WW.g.offer),s:!!(WW.g&&WW.g.stakeOffer),w:WW.g.inWave,over:WW.g.over,wave:WW.g.wave})')
                if st['over']: break
                if st['o']: page.screenshot(path=f'{OUT}/{name}-09-skill-pick.png'); tap(page, 'pick0')
                elif st['s']: page.screenshot(path=f'{OUT}/{name}-10-stake.png'); tap(page, 'stk1')
                elif not st['w']:
                    if st['wave'] >= 4: break
                    tap(page, 'wave')
                page.wait_for_timeout(500)
            page.screenshot(path=f'{OUT}/{name}-11-midgame.png')
            # resume after reload
            wave = page.evaluate('WW.g.wave'); page.reload(); page.wait_for_timeout(1500)
            ids = [h['id'] for h in page.evaluate('WW.hits()')]; assert 'resume' in ids, ids
            page.screenshot(path=f'{OUT}/{name}-12-resume-title.png'); tap(page, 'resume'); page.wait_for_timeout(300)
            assert page.evaluate('WW.g.wave') == wave and page.evaluate('WW.g.towers.length') >= 4
            page.evaluate('WW.endMission(true)'); page.wait_for_timeout(1200); page.screenshot(path=f'{OUT}/{name}-13-result.png')
            page.evaluate('WW.P.shards=20; WW.P.heroes[WW.g.hk].lvl=10'); tap(page, 'toHero'); tap(page, 'evolve'); page.wait_for_timeout(1000); page.screenshot(path=f'{OUT}/{name}-14-evolve.png')
            page.evaluate("for(let i=0;i<3;i++){const it=WW.genItem(4+i%2,['weapon','helm','mantle'][i]);WW.P.inv.push(it);WW.equip(it);}")
            tap(page, 'toArm'); page.wait_for_timeout(300); page.screenshot(path=f'{OUT}/{name}-15-armoury.png')
            ctx.close()
        br.close()
finally:
    srv.terminate()
print(json.dumps({'errors': errors}))
sys.exit(1 if errors else 0)
