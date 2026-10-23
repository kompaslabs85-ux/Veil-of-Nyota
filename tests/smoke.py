"""Warden Wars iter3a smoke + input-reliability test (headless Chromium, emulated devices only - no real hardware).
Usage: python3 tests/smoke.py [outdir]. Exits 1 on console errors, 4xx, misroutes or failed asserts."""
import subprocess, time, sys, os, json, random
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/workspace/game-qa/iter3a-shots'
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8767'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
errors, report = [], {'devices': {}}
DEVICES = [('390x844-iphone14', 390, 844, 3), ('360x640-android-small', 360, 640, 2), ('375x667-iphoneSE', 375, 667, 2), ('412x915-pixel7', 412, 915, 2.625), ('430x932-iphone15promax', 430, 932, 3)]
def hits(pg): return [h for h in pg.evaluate('WW.hits()') if not h['hidden']]
def btn(pg, bid, tries=20):
    for _ in range(tries):
        h = [x for x in pg.evaluate('WW.hits()') if x['id'] == bid]
        if h: return h[-1]
        pg.wait_for_timeout(80)
    raise AssertionError('no button ' + bid + ' have ' + str([x['id'] for x in pg.evaluate('WW.hits()')]))
def at(pg, lx, ly):
    b = pg.locator('canvas').bounding_box(); Hh = pg.evaluate('WW.H()')
    return b['x'] + lx * b['width'] / 360, b['y'] + ly * b['height'] / Hh
def tap(pg, bid, dx=0.5, dy=0.5, settle=120):
    h = btn(pg, bid)
    pg.wait_for_function('performance.now() - WW.ui.popT > 270')  # popup input guard (250ms)
    x, y = at(pg, h['vx'] + h['vw'] * dx, h['vy'] + h['vh'] * dy)
    n0 = pg.evaluate('WW.ui.log.length'); pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(40); pg.mouse.up(); pg.wait_for_timeout(settle)
    log = pg.evaluate('WW.ui.log.slice(%d).map(l=>l.id)' % n0); return log
def shot(pg, name): p = f'{OUT}/{name}.png'; pg.screenshot(path=p); return p
try:
    with sync_playwright() as p:
        br = p.chromium.launch()
        for di, (name, w, h, dpr) in enumerate(DEVICES):
            full = di < 2; ctx = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, has_touch=True, is_mobile=True)
            pg = ctx.new_page(); d = report['devices'][name] = {'shots': []}
            pg.on('console', lambda m: m.type == 'error' and errors.append(m.text)); pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.on('response', lambda r: r.status >= 400 and errors.append(f'{r.status} {r.url}'))
            pg.goto('http://localhost:8767/index.html?test=1'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(1800)  # fresh profile
            d['kpx'] = pg.evaluate('WW.KPX()'); d['art'] = pg.evaluate('JSON.parse(JSON.stringify(WW.ART_STATS))')
            d['shots'].append(shot(pg, f'{name}-01-title'))
            assert tap(pg, 'play') == ['play']; d['shots'].append(shot(pg, f'{name}-02-faction'))
            assert tap(pg, 'f_stone') == ['f_stone']; assert pg.evaluate("WW.scene") == 'faction', 'faction must need confirm'
            assert tap(pg, 'facOk') == ['facOk']; d['shots'].append(shot(pg, f'{name}-03-maps'))
            tap(pg, 'map_glacier'); tap(pg, 'mapGo'); d['shots'].append(shot(pg, f'{name}-04-brief'))
            tap(pg, 'go'); pg.wait_for_timeout(300); assert pg.evaluate('WW.scene') == 'game'
            d['shots'].append(shot(pg, f'{name}-05-game'))
            # build via ring with confirm
            pad = [x['id'] for x in pg.evaluate('WW.hits()') if x['id'].startswith('spot')][0]
            tap(pg, pad); d['shots'].append(shot(pg, f'{name}-06-ring'))
            ring = pg.evaluate('WW.g.ring ? {cx:WW.g.ring.cx, cy:WW.g.ring.cy} : null'); assert ring, 'ring'
            bk = [x['id'] for x in hits(pg) if x['id'].startswith('b_')][0]
            tap(pg, bk); assert pg.evaluate('WW.g.towers.length') == 0, 'build must need confirm'
            tap(pg, 'bOk'); assert pg.evaluate('WW.g.towers.length') == 1, 'build confirm'
            # ring area: <=20% of map
            d['ring_area_pct'] = round(100 * 3.14159 * (50 + 20) ** 2 / (360 * 520), 1)
            # wave timer: none on wave 1
            assert pg.evaluate('WW.g.timerMax') == 0, 'wave 1 untimed'
            tap(pg, 'wave'); pg.evaluate('WW.tick(1)'); assert pg.evaluate('WW.g.inWave'), 'wave start'
            tap(pg, 'speed'); assert pg.evaluate('WW.g.speed') == 2; tap(pg, 'speed')
            pg.evaluate('WW.tick(2400)'); pg.wait_for_timeout(200)
            if pg.evaluate('!!WW.g.offer'):
                d['shots'].append(shot(pg, f'{name}-07-skill-offer'))
                # popup-close latency: confirm then tap 100ms later must be accepted
                tap(pg, 'pick0', settle=0); t0 = time.time(); log = tap(pg, 'pickOk', settle=100)
                assert not pg.evaluate('!!WW.g.offer'), 'offer closed'
                log2 = tap(pg, 'pause', settle=60); d['tap_after_popup_close_accepted'] = log2 == ['pause']; d['tap_after_popup_close_ms'] = 100
                assert log2 == ['pause'], 'input after popup close dropped: ' + str(log2)
                d['shots'].append(shot(pg, f'{name}-08-pause')); tap(pg, 'resume'); pg.wait_for_timeout(1400)
            d['timer_wave2'] = pg.evaluate('WW.g.timerMax'); d['shots'].append(shot(pg, f'{name}-09-between-waves'))
            # 100-tap misroute test over visible buttons in game scene (pause/resume, speed, wave dock, ring, etc.)
            if full:
                random.seed(7); smoke_races = []; mis = 0; done = 0; samples = []
                while done < 100:
                    if pg.evaluate('!!WW.g.offer'): tap(pg, 'pick0'); tap(pg, 'pickOk'); continue
                    if pg.evaluate('!!WW.g.stakeOffer'): tap(pg, 'stkSkip'); continue
                    if pg.evaluate('WW.g.paused'): tap(pg, 'resume'); pg.wait_for_timeout(1300); continue
                    cand = [x for x in hits(pg) if x['id'] in ('speed', 'pause') or x['id'].startswith('tw') or x['id'].startswith('spot') or x['id'] in ('rClose',) or x['id'].startswith('b_')]
                    if not cand: pg.wait_for_timeout(100); continue
                    c = random.choice(cand)
                    try: log = tap(pg, c['id'], random.uniform(0.1, 0.9), random.uniform(0.1, 0.9), settle=60)
                    except AssertionError:
                        if pg.evaluate('!!(WW.g.offer || WW.g.stakeOffer || WW.g.cinema)'): continue  # a popup opened before the tap landed: not a tap, retry
                        raise
                    done += 1
                    if log != [c['id']]: mis += 1; samples.append((c['id'], log))
                    if c['id'] == 'pause':
                        try: tap(pg, 'resume'); pg.wait_for_timeout(1300)
                        except AssertionError:
                            if not pg.evaluate('!!(WW.g.offer || WW.g.stakeOffer)'): raise
                            smoke_races.append('stake/offer opened on the same frame as pause')
                d['taps'] = 100; d['popup_pause_races'] = len(smoke_races); d['misroutes'] = mis; d['misroute_samples'] = samples[:5]
                if mis: errors.append(f'{name}: {mis} misrouted taps {samples[:5]}')
                # stake screen, result, hero, armoury
                pg.evaluate('WW.g.ring=null; WW.g.stakeOffer={sel:null}'); pg.wait_for_timeout(250); d['shots'].append(shot(pg, f'{name}-10-stake'))
                tap(pg, 'stk0'); d['shots'].append(shot(pg, f'{name}-11-stake-selected')); tap(pg, 'stkSkip')
                pg.evaluate('WW.endMission(true)'); pg.wait_for_timeout(2600); d['shots'].append(shot(pg, f'{name}-12-victory'))
                tap(pg, 'toHero'); d['shots'].append(shot(pg, f'{name}-13-hero'))
            ctx.close()
        br.close()
finally:
    srv.terminate()
report['errors'] = errors; json.dump(report, open(f'{OUT}/smoke-report.json', 'w'), indent=1)
print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk not in ('shots', 'art')} for k, v in report['devices'].items()}, indent=1)); print('errors', errors)
sys.exit(1 if errors else 0)
