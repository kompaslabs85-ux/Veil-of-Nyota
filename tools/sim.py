"""Warden Wars sim harness (iter3a fix pass). Plays seeded runs per faction x map x profile headless.
Profiles: human = Kai stake policy (Flutter >=70% predicted clean, Double >=85%, All-in >=95%) + calls early after a clean wave;
          thin  = Sipho-style underspent build (max 4 towers, nothing above L3, no stakes, no early calls).
Usage: python3 tools/sim.py [runs_per_cell] [profiles comma list]"""
import asyncio, json, sys, os, subprocess, time, statistics as st
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROF = {'human': "{callEarly:'human',stakePolicy:true,profile:'human'}", 'thin': "{callEarly:false,profile:'thin'}"}
async def main(runs, profs):
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    res = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 360, 'height': 640})
            await pg.goto('http://localhost:8766/index.html?test=1'); await pg.wait_for_timeout(1500)
            await pg.add_script_tag(path=os.path.join(ROOT, 'tools', 'sim_bot.js'))
            for pr in profs:
                for mk in ['glacier', 'foundry']:
                    for fac in ['sun', 'jade', 'stone', 'forge', 'star']:
                        for s in range(runs):
                            await pg.evaluate("localStorage.clear()")
                            r = await pg.evaluate(f"runSim('{fac}','{mk}',{1000+s},{PROF[pr]})"); res.append(r)
            await b.close()
    finally: srv.terminate()
    rep = {}
    for pr in profs:
        for mk in ['glacier', 'foundry']:
            rs = [r for r in res if r['mk'] == mk and r['profile'] == pr]
            if not rs: continue
            nW = max(len(r['waves']) for r in rs)
            mid = [sum(w.get('leaks', 0) for w in r['waves'][2:-1]) for r in rs]
            bd = [r['bossDur'] for r in rs if r['bossDur']]
            stk = [x for r in rs for x in r['stakeLog']]; offered = sum(len(r['stakes']) for r in rs); taken = sum(1 for r in rs for x in r['stakes'] if x['tier'] >= 0)
            tiers = {}
            for r in rs:
                for x in r['stakes']:
                    if x['tier'] < 0: continue
                    lg = [y for y in r['stakeLog'] if y['w'] == x['w']]
                    t = tiers.setdefault(['flutter', 'double', 'allin'][x['tier']], [0, 0]); t[1] += 1; t[0] += 1 if (lg and lg[0]['won']) else 0
            calls = sum(r['calls'] for r in rs); early = sum(r['earlyN'] for r in rs)
            rep[f'{pr}/{mk}'] = {
                'runs': len(rs), 'wins': sum(r['win'] for r in rs), 'boss_dur_s': bd, 'boss_in_45_90': sum(45 <= d <= 90 for d in bd), 'boss_escaped': sum(1 for r in rs if r['bossLeaked']),
                'stars': [r['stars'] for r in rs], 'three_star': sum(r['stars'] == 3 for r in rs),
                'leaks_by_wave_mean': [round(st.mean([r['waves'][i].get('leaks', 0) if i < len(r['waves']) else 0 for r in rs]), 2) for i in range(nW)],
                'mid_wave_leaks_per_run': mid, 'leaks_total': [r['leaksTot'] for r in rs],
                'early_calls': f'{early}/{calls}', 'early_rate': round(early / calls, 2) if calls else None,
                'choices_per_min': [r['cpm'] for r in rs], 'stake_takeup': f'{taken}/{offered}', 'stake_tier_won_of_taken': tiers,
                'bank_peak': [r['bankPeak'] for r in rs], 'lives': [f"{r['lives']}/{r['maxLives']}" for r in rs], 'shards': [r['shards'] for r in rs]}
    hum = [r for r in res if r['profile'] == 'human']
    rep['summary'] = {'human_3star_rate': round(sum(r['stars'] == 3 for r in hum) / max(1, len(hum)), 3), 'human_win_rate': round(sum(r['win'] for r in hum) / max(1, len(hum)), 3),
        'human_mid_leaks_mean': round(st.mean([sum(w.get('leaks', 0) for w in r['waves'][2:-1]) for r in hum]), 2) if hum else None,
        'by_faction': {f: {'3star': sum(r['stars'] == 3 for r in hum if r['fac'] == f), 'wins': sum(r['win'] for r in hum if r['fac'] == f), 'runs': sum(1 for r in hum if r['fac'] == f)} for f in ['sun', 'jade', 'stone', 'forge', 'star']}}
    print(json.dumps(rep, indent=1)); json.dump({'report': rep, 'runs': res}, open('/tmp/sim_last.json', 'w'))
asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 3, (sys.argv[2] if len(sys.argv) > 2 else 'human,thin').split(',')))
