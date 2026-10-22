# Headless smoke + balance test. Usage: python tests/smoke.py  (serves on :8765 itself)
import subprocess, time, json, sys, os
from playwright.sync_api import sync_playwright
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765'], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
errors = []
SIM = r"""
([fac, strat, prio]) => {
  VON.resetProfile();
  VON.startMission(fac);
  const g = () => VON.g;
  const spots = prio;
  const towers = fac === 'stone' ? ['monolith','drum','spire'] : ['cannon','slag','lance'];
  let steps = 0, i = 0;
  while (VON.g.over === false && steps < 60*60*30) {
    const G = g();
    if (strat !== 'idle') {
      // spend: alternate building and upgrading
      for (let k = 0; k < 4; k++) {
        const built = G.towers.filter(t => !t.isHero);
        const next = spots.find(s => !G.towers.find(t => t.spot === s));
        const cheapUp = built.filter(t => t.tier < 2).sort((a,b)=>a.tier-b.tier)[0];
        const type = towers[built.length % 3];
        if (next !== undefined && built.length < (strat === 'greedy' ? 14 : strat === 'weak' ? 4 : 8)) VON.build(next, type);
        else if (cheapUp && strat !== 'weak') VON.upgrade(cheapUp);
      }
      if (G.abilityCd <= 0 && G.enemies.length > 3) VON.useAbility();
      if (G.vent !== undefined) {}
    }
    if (!G.spawning && G.waveDone) VON.callWave();
    VON.update(1/30); steps++;
  }
  const G = g();
  return { fac, strat, won: G.lives > 0 && G.wave >= 10 && G.waveDone, lives: G.lives, max: G.maxLives, wave: G.wave, kills: G.kills, gold: G.gold, mins: (steps/30/60).toFixed(1), towers: G.towers.length - 1 };
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True)
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(800)
    pg.screenshot(path='tests/shot-title.png')
    # path vs spots
    bad = pg.evaluate("VON.BUILD_SPOTS.filter(([c,r]) => VON.pathTiles.has(c+','+r))")
    print('spots on path:', bad)
    box = pg.query_selector('canvas').bounding_box()
    def tapL(x, y):  # logical coords -> screen tap
        pg.mouse.click(box['x'] + x / 360 * box['width'], box['y'] + y / 640 * box['height'])
        pg.wait_for_timeout(150)
    tapL(180, 445); print('after PLAY:', pg.evaluate('VON.scene'))
    tapL(90, 90); tapL(250, 607); print('after BEGIN:', pg.evaluate('VON.scene'), pg.evaluate('VON.g && VON.g.f.key'))
    tapL(2*40+20, 2*40+20)  # tap spot (2,2)
    tapL(4+43, 600)          # build first tower
    print('towers after tap-build:', pg.evaluate('VON.g.towers.length'), 'gold', pg.evaluate('VON.g.gold'))
    tapL(180, 300)           # deselect
    tapL(250, 600)           # START wave
    pg.wait_for_timeout(4000)
    print('wave:', pg.evaluate('VON.g.wave'), 'enemies:', pg.evaluate('VON.g.enemies.length'))
    pg.screenshot(path='tests/shot-game.png')
    tapL(4*40+20, 5*40+20); pg.wait_for_timeout(200); pg.screenshot(path='tests/shot-hero.png')
    # balance sims
    prio = [3,9,5,8,2,4,11,12,14,10,1,6,0,7,13,15,16,17]
    res = []
    for fac in ['stone','forge']:
        for strat in ['idle','weak','modest','greedy']:
            for n in range(3 if strat != 'idle' else 1):
                res.append(pg.evaluate(SIM, [fac, strat, prio]))
    for r in res: print(json.dumps(r))
    # result screen render
    pg.evaluate("VON.go('result')"); pg.wait_for_timeout(300); pg.screenshot(path='tests/shot-result.png')
    # victory path with profile/gear
    pg.evaluate(SIM, ['forge','greedy',prio]); pg.wait_for_timeout(1500); pg.screenshot(path='tests/shot-victory.png')
    print('profile:', json.dumps(pg.evaluate('VON.profile')))
    pg.evaluate("VON.go('profile')"); pg.wait_for_timeout(300); pg.screenshot(path='tests/shot-profile.png')
    pg.evaluate("VON.go('faction')"); pg.wait_for_timeout(300); pg.screenshot(path='tests/shot-faction.png')
    b.close()
srv.terminate()
print('console errors:', errors)
