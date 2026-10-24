# WARDEN WARS (iteration 3b)

Mobile-first tower defence on a vanilla canvas. It is a static site with no build step.

- Run it locally with `python3 -m http.server` and open `index.html`.
- Saves live in `localStorage`:
  - Profile: `ww_profile_v2`. The old `von_profile_v1` save is migrated on first load and left in place.
  - Mid-mission resume: `ww_run_v2`, saved at the start and end of every wave.
  - Mute setting: `ww_muted`.
- Sprites come from Zara's pass 2, as optimised lossless `@3x` WebP files in `assets/sp/`. This includes the 4-frame walk and fly cycles. `js/assets.js` lists the files.
- The smoke test (Playwright, headless) is `python3 tests/smoke.py [/out/dir]`.
- Test hooks are on `window.WW`, with `VON` as an alias.
