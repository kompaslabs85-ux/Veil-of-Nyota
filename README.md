# Veil of Nyota — iteration 1 prototype

A mobile-first, portrait pixel-art tower defence game. It runs as plain HTML and vanilla canvas JS, with no build step and no runtime CDN. Lore and design come from the *Veil of Nyota Design Bible v0.1*.

## Run locally
```
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (Render)
`render.yaml` defines a free **Static Site** named `veil-of-nyota` (`runtime: static`, `staticPublishPath: .`). Connect the repo in Render as a Blueprint. Nothing needs to build.

## How to play
1. **Title → Play → choose your people.** Two factions are playable: the **Stonewardens** and the **Emberforged**. The other six are shown locked.
2. **Act I · Mission 1: The Thinning Rim.** The Hollow leave the red portal at the top and follow the winding road to the Veil Shrine at the bottom. Every leak cracks the Veil and costs lives; the boss costs 10.
3. **Tap a stone build spot** to open the build bar, then tap a tower to build it.
4. **Tap a tower** to see its range and stats, and to **upgrade** it (3 tiers). Emberforged towers can also be **sold** (70% refund) or **vented** (10 gold resets heat).
5. **Hero tower** (on the gold plinth): it is placed for free, levels up after waves 3 and 6, and has one ability you activate by tapping. Tap the ability card bottom-left when it reads `TAP!`.
   - Stonewardens, *Mountain's Oath*: a crystal wall holds the lane for 6s.
   - Emberforged, *Molten Anvil*: an anvil drops on the lead Hollow (or the boss), with big damage, a stun and burning ground.
6. **START / NEXT WAVE** button: 10 waves. Calling a wave early, while enemies remain, pays +15 gold. Wave 10 brings the mini-boss, the **Herald of Kasiri**, who has a boss health bar.
7. Top bar: gold, Veil lives, wave, **1x/2x speed**, **pause**, **sound** (muted by default; `M` toggles it on desktop, and `Space` calls the next wave).

### Faction trade-offs (simplified)
| Faction | Gift | Price |
|---|---|---|
| Stonewardens | Armour-piercing towers, +5 shrine lives | Towers are petrified: they can never be sold, and they fire slowly |
| Emberforged | Splash, burning ground, line beams | Heat: each shot adds heat, and at 100 the tower shuts down for 4s. Vent for gold |

### Enemies
Hollow Husk (basic), Hollowling (fast), Shardback (armoured: 50% damage reduction, so use pierce or the drum's armour shred), and the Herald of Kasiri (mini-boss).

### RPG layer
Each victory drops one piece of gear: a **weapon** (+hero damage), a **charm** (−ability cooldown) or a **relic** (+ability power). Each piece is **Common, Rare or Epic**. Better gear auto-equips. On the Profile screen you can tap a slot to swap pieces. Your level (from XP), gear and best stars per faction (1–3, based on lives remaining) are saved in `localStorage`.

## Code
- `js/data.js`: map, path, factions, towers, enemies, waves, gear tables (all the tuning lives here)
- `js/art.js`: procedural pixel sprites and the pre-rendered map
- `js/audio.js`: WebAudio blips
- `js/game.js`: scenes, simulation, UI and input
- `tests/smoke.py`: headless Chrome smoke test and balance simulation (Playwright)
