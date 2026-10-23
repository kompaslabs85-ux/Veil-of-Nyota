"""Fresh-profile campaign sim: plays missions back-to-back (profile persists) and reports shards, hero level and evolve readiness."""
import asyncio, json, sys, os, subprocess, time
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
async def main(fac):
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8768'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 360, 'height': 640})
            await pg.goto('http://localhost:8768/index.html?test=1'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(1200)
            await pg.add_script_tag(path=os.path.join(ROOT, 'tools', 'sim_bot.js'))
            out = []
            for i, mk in enumerate(['glacier', 'foundry', 'glacier', 'foundry', 'glacier']):
                r = await pg.evaluate(f"(()=>{{const r=runSim('{fac}','{mk}',{2000+i},{{}}); const hk=WW.g.hk, st=WW.P.heroes[hk]; return {{mission:{i+1}, mk:'{mk}', win:r.win, stars:r.stars, shardsGained:r.shards, shardsTotal:WW.P.shards, heroLvl:st.lvl, evo:st.evo}}}})()")
                # evolve when possible (as a player would)
                r['evolvedTo'] = await pg.evaluate("(()=>{const hk=WW.g.hk; const before=WW.P.heroes[hk].evo; try{WW.evolve(hk)}catch(e){} return WW.P.heroes[hk].evo>before?WW.P.heroes[hk].evo:null})()")
                out.append(r)
            await b.close()
    finally: srv.terminate()
    print(json.dumps(out, indent=1))
asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'stone'))
