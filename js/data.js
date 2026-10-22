// Veil of Nyota — static game data (iteration 1)
'use strict';
const W = 360, H = 640, T = 40;
const C = (c) => c * T + T / 2;

// Winding path (tile coords) for Act I, Mission 1: "The Thinning Rim"
const PATH_TILES = [[1,1],[1,3],[7,3],[7,6],[1,6],[1,9],[7,9],[7,12],[4,12],[4,13]];
const PATH = PATH_TILES.map(([c, r]) => ({ x: C(c), y: C(r) }));
const HERO_SPOT = [4,5];
const BUILD_SPOTS = [[0,2],[2,2],[5,2],[3,4],[6,4],[2,5],[8,5],[0,7],[3,7],[5,7],[8,8],[2,10],[5,10],[8,11],[5,11],[2,12],[3,13],[6,13]];

const FACTIONS = [
  { key:'stone', name:'Stonewardens', full:'Stonewardens of Kagoro', accent:'#7fa6c9', playable:true,
    blurb:'Living granite. Towers pierce armour and the shrine holds +5 lives.',
    tradeoff:'Petrified: towers can never be sold. Slowest fire rate.',
    hero:{ name:"Warden's Throne", dmg:20, rate:1.0, range:115, pierce:0.5, ability:"Mountain's Oath",
      abilityDesc:'Raise a crystal wall across the lane: Hollow are held for 6s.', cd:30 },
    towers:['monolith','drum','spire'] },
  { key:'forge', name:'Emberforged', full:'Emberforged of Zuri', accent:'#ff8a2a', playable:true,
    blurb:'Molten splash and raw burst damage. Highest damage in the valley.',
    tradeoff:'Heat: sustained fire overheats a tower, shutting it down for 4s. Vent for gold.',
    hero:{ name:'Master Forge', dmg:20, rate:1.25, range:110, splash:30, ability:'Molten Anvil',
      abilityDesc:'Drop a burning anvil on the lead Hollow: big damage, stun, fire.', cd:25 },
    towers:['cannon','slag','lance'] },
  { key:'tide', name:'Tidecallers', full:'Tidecallers of Mbuyu Falls', accent:'#3fd0d0', playable:false },
  { key:'sky', name:'Skyborne Asari', full:'Skyborne Asari', accent:'#e8e0a0', playable:false },
  { key:'mask', name:'Maskbearers', full:'Maskbearers of the Hush', accent:'#b07ae0', playable:false },
  { key:'pride', name:'Pridebound', full:'Pridebound of the Ochre Plains', accent:'#e0b040', playable:false },
  { key:'star', name:'Starwrights', full:'Starwrights of Nyota', accent:'#9ab8ff', playable:false },
  { key:'ash', name:'The Ashborn', full:'The Ashborn', accent:'#d04040', playable:false },
];

// Tower defs. tiers: [t1,t2,t3]; cost = build cost for t1, upgrade cost for t2/t3.
const TOWERS = {
  monolith:{ faction:'stone', name:['Standing Stone','Ward Pillar','Crowned Monolith'], kind:'bolt',
    tiers:[{cost:70,dmg:17,rate:1.1,range:95},{cost:70,dmg:32,rate:1.05,range:100},{cost:115,dmg:54,rate:1.0,range:108,stun:0.6}],
    pierce:0.5, desc:'Steady stone bolts. T3 stuns.' },
  drum:{ faction:'stone', name:['Hide Drum','Earth Drum','Mountain Heart'], kind:'slam',
    tiers:[{cost:90,dmg:11,rate:1.6,range:72},{cost:90,dmg:20,rate:1.5,range:78},{cost:145,dmg:34,rate:1.4,range:86}],
    shred:0.3, desc:'Ground slam hits all nearby and shreds armour.' },
  spire:{ faction:'stone', name:['Vein Shard','Seam Spire','Ember Lode'], kind:'bolt',
    tiers:[{cost:110,dmg:54,rate:2.2,range:150},{cost:110,dmg:96,rate:2.1,range:160},{cost:175,dmg:160,rate:2.0,range:175}],
    pierce:1.0, desc:'Long-range sniper. Ignores armour.' },
  cannon:{ faction:'forge', name:['Clay Kiln','Bellows Cannon','Grand Furnace'], kind:'shell',
    tiers:[{cost:80,dmg:16,rate:1.25,range:100,splash:42},{cost:80,dmg:28,rate:1.2,range:105,splash:48},{cost:130,dmg:46,rate:1.15,range:112,splash:56}],
    heat:15, desc:'Splash shells. Heats up fast.' },
  slag:{ faction:'forge', name:['Slag Pot','Slag Catapult','Magma Sling'], kind:'slag',
    tiers:[{cost:90,dmg:8,rate:1.8,range:95,burn:10},{cost:90,dmg:14,rate:1.7,range:100,burn:18},{cost:145,dmg:22,rate:1.6,range:108,burn:28}],
    heat:18, desc:'Leaves burning ground (damage per second).' },
  lance:{ faction:'forge', name:['Ember Rod','Ember Lance','Starsteel Spear'], kind:'beam',
    tiers:[{cost:120,dmg:42,rate:2.1,range:135},{cost:120,dmg:72,rate:2.0,range:145},{cost:190,dmg:115,rate:1.9,range:155}],
    pierce:0.4, heat:26, desc:'Line beam pierces every Hollow in its path.' },
};

const ENEMIES = {
  husk:   { name:'Hollow Husk', hp:42, spd:36, armour:0,   gold:5,  lives:1, r:9 },
  ling:   { name:'Hollowling',  hp:24, spd:68, armour:0,   gold:4,  lives:1, r:7 },
  shard:  { name:'Shardback',   hp:95, spd:26, armour:0.5, gold:9,  lives:2, r:11 },
  herald: { name:'Herald of Kasiri', hp:4200, spd:17, armour:0.35, gold:120, lives:10, r:17, boss:true },
};

// Waves: list of [type, count, gap seconds]; groups run in sequence.
const WAVES = [
  [['husk',8,1.2]],
  [['husk',8,1.0],['ling',5,0.6]],
  [['ling',14,0.55]],
  [['husk',8,0.9],['shard',3,2.0]],
  [['husk',12,0.7],['ling',8,0.45]],
  [['shard',6,1.5],['ling',12,0.4]],
  [['husk',16,0.6],['shard',6,1.2]],
  [['ling',22,0.35],['shard',7,1.1]],
  [['husk',14,0.5],['ling',12,0.35],['shard',9,0.9]],
  [['husk',10,0.6],['shard',5,1.0],['herald',1,1],['ling',10,0.4]],
];
const waveHpScale = (w) => 1 + 0.28 * w + 0.03 * w * w;

const START_GOLD = 220, START_LIVES = 20;

// Gear (RPG layer)
const RARITY = [
  { key:'common', name:'Common', color:'#c8c0a8' },
  { key:'rare',   name:'Rare',   color:'#5fa8ff' },
  { key:'epic',   name:'Epic',   color:'#c070ff' },
];
const GEAR = {
  weapon:{ label:'Weapon', stat:'Hero damage', vals:[10,25,45], names:['Clay Spear','Bronze Spearhead','Starsteel Assegai'] },
  charm: { label:'Charm',  stat:'Ability cooldown', vals:[10,20,30], names:['Bead Charm','Hornbill Charm','Ember-bead Charm'] },
  relic: { label:'Relic',  stat:'Ability power', vals:[15,35,60], names:['Shard of Memory','Ember Relic','Heart of Nyota'] },
};
