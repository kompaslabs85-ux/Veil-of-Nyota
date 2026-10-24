// WARDEN WARS — static game data (iteration 3a; maps in maps.js, text in strings.js)
'use strict';
const W = 360, T = 40; let H = 640; // H grows on tall phones to fill the screen
const C = (c) => c * T + T / 2;
const GOOD = '#5FD08A', BAD = '#E0605A', GOLD = '#F2C14E', RED = '#C8102E', PLUM = '#1a0f22', INK = '#f3e9d8';


// Damage type x armour class (impl-spec DMG_MATRIX)
const DMG_MATRIX = {
  pierce:{ flesh:1.0, plate:1.35, arcane:0.8, air:1.0 },
  blunt: { flesh:1.15, plate:0.85, arcane:1.0, air:0.5 },
  fire:  { flesh:1.25, plate:0.8, arcane:1.1, air:0.9 },
  arcane:{ flesh:0.9, plate:1.1, arcane:1.35, air:1.1 },
};

// iter3b: five factions from five worlds and eras. `base` = the shared tower kit / rules they draw on (stone = hold & pierce,
// forge = burst & heat); each faction re-skins that kit (palette tint, tower names, hero, ability) and keeps its own trade-off.
// All five draw on the same mystical resource: Nyota's Veil-light, which always takes something back.
const FACTIONS = [
  { key:'sun', base:'forge', name:'Sunveil', full:'Sunveil Dominion', accent:'#F2B134', playable:true, era:'Kush · Iron Age',
    tint:'sepia(0.35) saturate(1.5) hue-rotate(-12deg) brightness(1.08)', ab:'SUN',
    lore:'Pyramid priests bank Veil-light in gold. Every blessing burns hotter than it should.',
    hero:{ key:'amanirenas', spr:'amanirenas', name:'Amanikhatashan', title:'Candace of the Sun Gate', dmg:22, rate:1.2, range:110, splash:30, dtype:'fire', ability:'Noon Judgement',
      abilityDesc:'A sun-lance strikes the lead Hollow: big damage and stun.', cd:25 },
    towers:['cannon','slag','lance','bell','kiln'] },
  { key:'jade', base:'stone', name:'Jade Court', full:'Jade Court', accent:'#4FC28A', playable:true, era:'Imperial E. Asia',
    tint:'hue-rotate(95deg) saturate(1.15)', ab:'INK',
    lore:'Scholars write Veil-light in silk and lantern-ink. What is written stays written.',
    hero:{ key:'meilin', spr:'meilin', name:'Lady Meilin', title:'Grand Scholar of the Jade Court', dmg:22, rate:1.0, range:115, dtype:'pierce', ability:'Edict of Stillness',
      abilityDesc:'An ink edict binds every ground Hollow near the hero for 4s.', cd:30 },
    towers:['monolith','bastion','drum','spire','skyhook'] },
  { key:'stone', base:'stone', name:'Frostmark', full:'Frostmark Holds', accent:'#2EC4B6', playable:true, era:'Norse fjords',
    tint:'', ab:'OATH',
    lore:'Runesmiths cut Veil-light into granite. A carved rune holds forever.',
    hero:{ key:'thandeka', spr:'thandeka', name:'Sigrun', title:'Runesmith of Frostmark', dmg:22, rate:1.0, range:115, dtype:'pierce', ability:'Shieldwall Oath',
      abilityDesc:'Rune-shards pin every ground Hollow near the hero for 4s.', cd:30 },
    towers:['monolith','bastion','drum','spire','skyhook'] },
  { key:'forge', base:'forge', name:'Foundry Row', full:'Foundry Row Guild', accent:'#E8702A', playable:true, era:'Victorian',
    tint:'', ab:'ANVIL',
    lore:'Brass engines boil Veil-light into steam. Run them hard and the pressure bites back.',
    hero:{ key:'jabari', spr:'jabari', name:'Jabari', title:'Chief Engineer of Foundry Row', dmg:22, rate:1.2, range:110, splash:30, dtype:'fire', ability:'Steam Hammer',
      abilityDesc:'Drop a steam hammer on the lead Hollow: big damage and stun.', cd:25 },
    towers:['cannon','slag','lance','bell','kiln'] },
  { key:'star', base:'forge', name:'Starfall Ascendancy', full:'Starfall Ascendancy', accent:'#9FB8FF', playable:true, era:'Far future',
    tint:'hue-rotate(200deg) saturate(1.2) brightness(1.1)', ab:'LANCE',
    lore:'An orbital order forges Veil-light into hard light. Precise, brilliant, and slow to recharge.',
    hero:{ key:'vael', spr:'vael', name:'Vael Orin', title:'Lightwright of the Ascendancy', dmg:22, rate:1.2, range:110, splash:30, dtype:'fire', ability:'Orbital Lance',
      abilityDesc:'A light-lance from orbit hits the lead Hollow: big damage and stun.', cd:25 },
    towers:['cannon','slag','lance','bell','kiln'] },
];
const FAC = (k) => FACTIONS.find(f => f.key === k) || FACTIONS[2];
const BASE = (k) => FAC(k).base;
const HERO_FAC = (hk) => FACTIONS.find(f => f.hero.key === hk);
// per-faction tower display names (falls back to TOWER_NAMES)
const FAC_TNAMES = {
  sun: { cannon:'Sun Mortar', slag:'Solar Brazier', lance:'Obelisk Ray', bell:'Temple Gong', kiln:'Falcon Pyre' },
  jade: { monolith:'Ink Stele', bastion:'Silk Banner Wall', drum:'Thunder Drum', spire:'Lantern Pagoda', skyhook:'Kite Snare' },
  forge: { cannon:'Steam Mortar', slag:'Boiler Sprayer', lance:'Tesla Lance', bell:'Clocktower Bell', kiln:'Brass Flak Gun' },
  star: { cannon:'Plasma Battery', slag:'Ion Field', lance:'Hardlight Lance', bell:'Resonance Pylon', kiln:'Orbital Flak' },
};
const tName = (k, f) => (FAC_TNAMES[f || (typeof P !== 'undefined' && P && P.faction)] || {})[k] || TOWER_NAMES[k];


// tiers = stats for L1, L3, L4 (L2 = midpoint, L5-10 scale from L4). cost = build cost / upgrade-to-L3 / upgrade-to-L4.
// air: 'no' | 'half' | 'yes' | 'only'.  counter: who it beats.  branches: chosen at L4 (GDD Table 16).
const TOWERS = {
  monolith:{ faction:'stone', sprite:'monolith', kind:'bolt', dtype:'pierce', air:'half',
    tiers:[{cost:70,dmg:19,rate:1.1,range:95},{cost:70,dmg:35,rate:1.05,range:100},{cost:115,dmg:60,rate:1.0,range:108}],
    counter:'Plate (Vowknights)', desc:'Steady piercing bolts. Cracks armour.',
    branches:[{ key:'A', name:'Crowned', desc:'Every shot stuns 1.0s', mod:{stun:1.0} },{ key:'B', name:'Granite Fist', desc:'+30% vs plate', mod:{vsPlate:0.3} }] },
  bastion:{ faction:'stone', sprite:'bastion-ring', kind:'block', dtype:'blunt', air:'no',
    tiers:[{cost:60,dmg:6,rate:0.8,range:62,hold:0.5},{cost:65,dmg:11,rate:0.75,range:68,hold:0.7},{cost:105,dmg:18,rate:0.7,range:74,hold:0.9}],
    counter:'Fast runners (Couriers)', desc:'Stone ring grips the lane: holds ground Hollow in place.',
    branches:[{ key:'A', name:'Taunting Wall', desc:'Holds 50% longer', mod:{holdX:0.5} },{ key:'B', name:'Living Rock', desc:'Regains 1 life every 2 waves', mod:{regen:1} }] },
  drum:{ faction:'stone', sprite:'quake-drum', kind:'slam', dtype:'blunt', air:'no',
    tiers:[{cost:90,dmg:12,rate:1.6,range:72},{cost:90,dmg:22,rate:1.5,range:78},{cost:145,dmg:37,rate:1.4,range:86}],
    shred:0.3, counter:'Swarms (Maidens)', desc:'Ground slam hits all nearby and shreds armour.',
    branches:[{ key:'A', name:'Deep Quake', desc:'Shred raised to 45%', mod:{shred:0.45} },{ key:'B', name:'Thunder Hide', desc:'Knocks Hollow back', mod:{knock:18} }] },
  spire:{ faction:'stone', sprite:'seam-spire', kind:'bolt', dtype:'arcane', air:'yes',
    tiers:[{cost:125,dmg:44,rate:2.6,range:140},{cost:120,dmg:78,rate:2.5,range:148},{cost:190,dmg:130,rate:2.4,range:160}],
    counter:'Bosses & arcane (Sirens)', desc:'Slow crystal sniper. Weak vs swarms and fast runners.',
    branches:[{ key:'A', name:'Twin Seam', desc:'+1 pierce target', mod:{extra:1} },{ key:'B', name:'Kingbreaker', desc:'+40% vs bosses', mod:{vsBoss:0.4} }] },
  skyhook:{ faction:'stone', sprite:'skyhook-sling', kind:'bolt', dtype:'pierce', air:'only',
    tiers:[{cost:85,dmg:26,rate:0.9,range:130,ground:1.2},{cost:85,dmg:44,rate:0.9,range:136,ground:1.4},{cost:135,dmg:66,rate:0.9,range:144,ground:1.6}], // iter2d: reined in (L4 was 80 dmg / 0.8s)
    counter:'Flyers (Harpies, Moths)', desc:'Chains flyers and drags them to the ground.',
    branches:[{ key:'A', name:'Chain Hooks', desc:'Chains to 2 flyers', mod:{extra:1} },{ key:'B', name:'Earthbinder', desc:'+60% vs grounded', mod:{vsGrounded:0.6} }] },
  cannon:{ faction:'forge', sprite:'bellows-cannon', kind:'shell', dtype:'fire', air:'no',
    tiers:[{cost:80,dmg:16,rate:1.25,range:100,splash:42},{cost:80,dmg:28,rate:1.2,range:105,splash:48},{cost:130,dmg:46,rate:1.15,range:112,splash:56}],
    heat:15, counter:'Swarms (Maidens, Couriers)', desc:'Splash shells. Heats up fast.',
    branches:[{ key:'A', name:'Great Bore', desc:'Splash 70', mod:{splash:70} },{ key:'B', name:'Twin Shells', desc:'Fires two shells', mod:{twin:1} }] },
  slag:{ faction:'forge', sprite:'slag-thrower', kind:'slag', dtype:'fire', air:'no',
    tiers:[{cost:90,dmg:8,rate:1.8,range:95,burn:10},{cost:90,dmg:14,rate:1.7,range:100,burn:18},{cost:145,dmg:22,rate:1.6,range:108,burn:28}],
    heat:18, counter:'Heavies (Vowknights)', desc:'Leaves burning ground that ignores armour.',
    branches:[{ key:'A', name:'Deep Pools', desc:'Pools last twice as long', mod:{poolX:2} },{ key:'B', name:'Tar Pitch', desc:'Pools slow 25%', mod:{slow:0.25} }] },
  lance:{ faction:'forge', sprite:'ember-lance', kind:'beam', dtype:'arcane', air:'half',
    tiers:[{cost:120,dmg:42,rate:2.1,range:135},{cost:120,dmg:72,rate:2.0,range:145},{cost:190,dmg:115,rate:1.9,range:155}],
    pierce:0.4, heat:26, counter:'Lines & Sirens', desc:'Line beam pierces every Hollow in its path.',
    branches:[{ key:'A', name:'Piercing Star', desc:'Armour pierce 80%', mod:{pierce:0.8} },{ key:'B', name:'Full Length', desc:'+25% damage, full lane', mod:{dmgX:0.25} }] },
  bell:{ faction:'forge', sprite:'anvil-bell', kind:'aura', dtype:'blunt', air:'half',
    tiers:[{cost:75,dmg:5,rate:1.5,range:80,armourDown:0.10},{cost:75,dmg:9,rate:1.4,range:86,armourDown:0.18},{cost:120,dmg:15,rate:1.3,range:94,armourDown:0.25}],
    counter:'Plate & support (cools heat)', desc:'Each toll strips armour and cools nearby forges.',
    branches:[{ key:'A', name:'War Bell', desc:'Nearby towers +10% damage', mod:{buff:0.1} },{ key:'B', name:'Sky Toll', desc:'Full damage to air, +50% range vs air', mod:{airFull:1} }] },
  kiln:{ faction:'forge', sprite:'spark-kiln', kind:'flak', dtype:'fire', air:'yes',
    tiers:[{cost:85,dmg:18,rate:1.0,range:130,cloud:32},{cost:85,dmg:31,rate:0.95,range:138,cloud:36},{cost:135,dmg:50,rate:0.9,range:146,cloud:40}], // iter2d: Forge anti-air buff (sims: all Forge leaks were flyers)
    heat:14, counter:'Flyers (Harpies, Moths)', desc:'Flak clouds burst in the air. x1.6 vs flyers.',
    branches:[{ key:'A', name:'Starburst', desc:'Clouds 1.5x larger', mod:{cloudX:0.5} },{ key:'B', name:'Ash Net', desc:'Flyers slowed 30%', mod:{airSlow:0.3} }] },
};
const MAX_LVL = 10, BRANCH_LVL = 4;
const UP_DMG_GROWTH = { skyhook: 1.08 }; // per-level dmg growth above L4 (default 1.16); Hook Sling capped so L10 isn't an outlier
// stats for a level (1..10) with optional branch
function towerStats(key, lvl, branch) {
  const d = TOWERS[key], [a, b, c] = d.tiers;
  let s;
  const mix = (x, y, t) => { const o = {}; for (const k in x) o[k] = k === 'cost' ? 0 : +(x[k] + (y[k] - x[k]) * t).toFixed(2); return o; };
  if (lvl <= 1) s = { ...a }; else if (lvl === 2) s = mix(a, b, 0.5); else if (lvl === 3) s = { ...b }; else s = { ...c };
  if (lvl > 4) { const n = lvl - 4; s.dmg = Math.round(c.dmg * Math.pow(UP_DMG_GROWTH[key] || 1.16, n)); // iter2d: L5-10 worth buying (was 1.12) s.rate = +(c.rate * Math.pow(0.97, n)).toFixed(2); s.range = c.range + 3 * n;
    if (c.splash) s.splash = c.splash + 2 * n; if (c.burn) s.burn = Math.round(c.burn * Math.pow(1.1, n)); if (c.hold) s.hold = +(c.hold + 0.05 * n).toFixed(2);
    if (c.ground) s.ground = +(c.ground + 0.1 * n).toFixed(2); if (c.cloud) s.cloud = c.cloud + n; if (c.armourDown) s.armourDown = +Math.min(0.5, c.armourDown + 0.02 * n).toFixed(2); }
  s.dmg = Math.round(s.dmg); delete s.cost;
  if (branch && lvl >= BRANCH_LVL) { const m = d.branches.find(x => x.key === branch).mod; Object.assign(s, { mod: m });
    if (m.splash) s.splash = Math.max(s.splash, m.splash + (lvl - 4) * 2); }
  return s;
}
let COST_FAC = null; // set by game.js to the active faction key
function buildCost(key) { const c = TOWERS[key].tiers[0].cost; return COST_FAC === 'stone' ? Math.round(c * 1.1) : c; } // Frostmark rune-bound: +10% build cost
function upCost(key, lvl) { // cost to go lvl -> lvl+1
  const t = TOWERS[key].tiers; if (lvl >= MAX_LVL) return 0;
  if (lvl === 1 || lvl === 2) return Math.round(t[1].cost * 0.55);
  if (lvl === 3) return t[2].cost;
  return Math.round(t[2].cost * (0.55 + 0.12 * (lvl - 4))); // iter2d: was 0.6 + 0.18/level
}
const spriteTier = (lvl) => lvl >= 7 ? 2 : lvl >= 4 ? 1 : 0; // milestones 1/4/7, L10 crown aura
function towerName(key, lvl, branch) { const b = branch && lvl >= BRANCH_LVL ? TOWERS[key].branches.find(x => x.key === branch).name : ''; return tName(key) + (b ? ' · ' + b : ''); }

// enemies: aclass = armour class; fly = flyer; size: grunt 0.7 / elite 0.85 / boss 1.6 of the hero's 1.0 (HERO_H)
const HERO_H = 60;
const SIZE = { hero: 1.0, tower: 1.1, grunt: 0.7, elite: 0.85, boss: 1.6 };
const ENEMIES = {
  husk:  { name:'Shard Maiden', sprite:'e_husk', hp:30, spd:36, armour:0, aclass:'flesh', lives:1, r:9, size:'grunt' },
  ling:  { name:'Scarlet Courier', sprite:'e_ling', hp:20, spd:66, armour:0, aclass:'flesh', lives:1, r:8, size:'grunt' },
  shard: { name:'Crimson Vowknight', sprite:'e_shard', hp:70, spd:26, armour:0.5, aclass:'plate', lives:2, r:11, size:'elite' },
  harpy: { name:'Harpy-Queen Zeyna', sprite:'e_harpy', hp:36, spd:44, armour:0.1, aclass:'air', lives:1, r:10, size:'elite', fly:true },
  moth:  { name:'Moth Enchantress', sprite:'e_moth', hp:34, spd:38, armour:0, aclass:'air', lives:1, r:10, size:'grunt', fly:true, silence:true },
  siren: { name:'Siren of the Lyre', sprite:'e_siren', hp:56, spd:28, armour:0.2, aclass:'arcane', lives:2, r:10, size:'elite', heal:true },
  // iter3b tier-1 mid-bosses (wave 25), themed to each map; repainted from the Herald's v2 art (see art.js SPRITE_VARIANTS)
  vg_glacier:{ name:'Rime Jarl Colossus', sprite:'e_vg_glacier', hp:1900, spd:12, armour:0.4, aclass:'plate', lives:8, r:16, size:'boss', boss:true, tier:1 },
  vg_foundry:{ name:'Brass Juggernaut', sprite:'e_vg_foundry', hp:1900, spd:12, armour:0.4, aclass:'plate', lives:8, r:16, size:'boss', boss:true, tier:1 },
  herald:{ name:'Herald of Kasiri', tier:2, sprite:'e_herald1', hp:1900, spd:11, armour:0.33, aclass:'arcane', lives:10, r:17, size:'boss', boss:true },
};
const WEFF = (w) => w <= 10 ? w : 10 + (w - 10) * 0.6; // iter3b: 50-wave levels, growth halves after wave 10
const UNIT_HP_GROWTH = 0.16; // per-wave unit HP growth; wave totals follow waveBudget() in maps.js
const MINI_HP_X = 5;         // mini-boss = a 5x HP champion of its type (elite-sized+)
const GOLD_PER_HP = 1 / 12;  // kills pay ~1g per 12 HP
const CLEAR_BONUS = (w) => 15 + 3 * w;
const START_GOLD = 220, START_LIVES = 20;
const BANK_SOFT_CAP = 150;   // design target: bank stays at or below this between waves (measured by tools/sim.py)
const STAKES = [ // all paid up front as a share of the bank; payout = stake * (1 + mult) on a clean (no-leak) wave
  { key:'flutter', name:'Flutter', pct:0.15, mult:0.8 },
  { key:'double', name:'Double', pct:0.35, mult:1.5 },
  { key:'allin', name:'All-in', pct:1.0, mult:2.2 },
];

// ---------- Hero skills (GDD Table 10) ----------
const HERO_LVL_XP = [20, 45, 80, 125, 180, 250, 330];
const SKILLS = [
  { key:'crystal', f:'stone', name:'Crystal Warden', desc:'Hero +25% damage', w:'c' },
  { key:'avalanche', f:'stone', name:'Avalanche', desc:"Mountain's Oath cooldown -25%", w:'r' },
  { key:'chains', f:'stone', name:'Harpoon Chains', desc:'Gale Harpoons ground flyers +50% longer', w:'r' },
  { key:'pride', f:'stone', name:'Petrified Pride', desc:'+3 lives now', w:'c' },
  { key:'echo', f:'stone', name:'Echo Oath', desc:'Rune Menhirs +15% damage', w:'c' },
  { key:'vein', f:'stone', name:'Vein Bloom', desc:'Spires +20% damage, +10 range', w:'e' },
  { key:'mastery', f:'forge', name:'Forge Mastery', desc:'Heat builds 25% slower', w:'c' },
  { key:'chain', f:'forge', name:'Chain Reaction', desc:'Cannon splash +20%', w:'r' },
  { key:'starfire', f:'forge', name:'Starfire Flak', desc:'Kilns +30% damage', w:'r' },
  { key:'quench', f:'forge', name:'Quench', desc:'Overheat lasts 2s, not 4s', w:'c' },
  { key:'rain', f:'forge', name:'Molten Rain', desc:'Molten Anvil +50% damage', w:'e' },
  { key:'white', f:'forge', name:'White Heat', desc:'All towers +8% damage', w:'r' },
  { key:'tongue', f:'any', name:'Gold Tongue', desc:'+15% gold from kills', w:'c' },
  { key:'mend', f:'any', name:'Veil Mend', desc:'Heal 4 lives now', w:'c' },
  { key:'ember', f:'any', name:"Gambler's Ember", desc:'Stake payouts +25%', w:'r' },
  { key:'eyes', f:'any', name:'Eyes Up', desc:'All towers +25% vs flyers', w:'r' },
];
const RAR_W = { c:60, r:30, e:10 };

// ---------- Gear (6 rarities, 6 slots; GDD Table 11 affixes) ----------
const RARITY = [
  { key:'clay', name:'Clay', color:'#b9a58a', vis:0 },
  { key:'bronze', name:'Bronze', color:'#d08a4a', vis:0 },
  { key:'iron', name:'Iron', color:'#9fb4c8', vis:1 },
  { key:'gold', name:'Gold', color:'#F2C14E', vis:1 },
  { key:'starsteel', name:'Starsteel', color:'#8fd8ff', vis:2 },
  { key:'remembered', name:'Remembered', color:'#ff6a8a', vis:2 },
];
const SLOTS = [
  { key:'weapon', label:'Weapon', stat:'dmg', base:6, visible:true, names:['Spear','Assegai','Warhammer'] },
  { key:'helm', label:'Helm', stat:'range', base:3, visible:true, names:['Circlet','Crown','Brow-guard'] },
  { key:'mantle', label:'Mantle', stat:'hp', base:2, visible:true, names:['Mantle','Kaross','Cloak'] },
  { key:'charm', label:'Charm', stat:'cd', base:4, names:['Bead Charm','Hornbill Charm','Ember Bead'] },
  { key:'bangles', label:'Bangles', stat:'rate', base:3, names:['Bangles','Clan Rings','Armlets'] },
  { key:'relic', label:'Relic', stat:'ability', base:8, names:['Shard of Memory','Ember Relic','Heart of Nyota'] },
];
const STAT_LABEL = { dmg:'Hero damage %', range:'Hero range', hp:'Bonus lives', cd:'Ability cooldown -%', rate:'Hero speed %', ability:'Ability power %' };
const AFFIXES = [
  { key:'fierce', name:'Fierce', desc:(v)=>`+${v}% hero damage`, v:[4,10] },
  { key:'swift', name:'Swift', desc:(v)=>`+${v}% hero attack speed`, v:[3,8] },
  { key:'oath', name:'of the Oath', desc:(v)=>`+${v} lives`, v:[1,3] },
  { key:'kin', name:'of Kin', desc:(v)=>`+${v}% tower damage`, v:[2,6] },
  { key:'towerBoost', name:'Mason-blessed', desc:(v,t)=>`${TOWERS[t]?towerName(t,1):'Tower'} +${v}% damage`, v:[6,15] },
  { key:'skillBoost', name:'Song-bound', desc:(v,t)=>`Boosts skill ${(SKILLS.find(s=>s.key===t)||{}).name}: +${v}% effect`, v:[20,50] },
  { key:'offerBias', name:'Fated', desc:()=>'Skill offers favour rare+', v:[1,1] },
  { key:'skyward', name:'Skyward', desc:(v)=>`+${v}% damage vs flyers`, v:[8,20] },
  { key:'daring', name:'Daring', desc:(v)=>`Stake payouts +${v}%`, v:[10,25] },
];
// Evolution (GDD Table 14)
const EVOS = {
  thandeka:[{ name:'Rune Apprentice', bonus:0 },{ name:'Glacier-Sworn', bonus:0.15, lvl:7, cost:10 },{ name:'Living Mountain', bonus:0.35, lvl:12, cost:20 }],
  amanirenas:[{ name:'Priestess of the Sun Gate', bonus:0 },{ name:'Daughter of Amun', bonus:0.15, lvl:7, cost:10 },{ name:'Candace Ascendant', bonus:0.35, lvl:12, cost:20 }],
  meilin:[{ name:'Hanlin Scholar', bonus:0 },{ name:'Lantern Sage', bonus:0.15, lvl:7, cost:10 },{ name:'Jade Chancellor', bonus:0.35, lvl:12, cost:20 }],
  vael:[{ name:'Cadet of the Ring', bonus:0 },{ name:'Lightwright', bonus:0.15, lvl:7, cost:10 },{ name:'Starfall Exarch', bonus:0.35, lvl:12, cost:20 }],
  jabari:[{ name:'Apprentice of Foundry Row', bonus:0 },{ name:'Bellows-Master', bonus:0.15, lvl:7, cost:10 },{ name:'Starsteel Smith', bonus:0.35, lvl:12, cost:20 }],
};
const PROFILE_XP = (lvl) => 60 + lvl * 40; // xp to next profile hero level
const HERO_MAX_LVL = 15;

