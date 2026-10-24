// WARDEN WARS — central strings (iteration 3a). All player-facing narrative text lives here.
'use strict';
const STR = {
  title: 'WARDEN WARS', subtitle: 'Veil of Nyota',
  factions: {
    sun: { name: 'Sunveil', blurb: 'Solar priests of the pyramid city. Molten splash and raw burst.', tradeoff: 'Sun-fever: towers overheat.' },
    jade: { name: 'Jade Court', blurb: 'Scholars of silk and lantern-ink. Bind the lane, hold the line. Shrine +5 lives.', tradeoff: 'Written edict: towers can never be sold.' },
    stone: { name: 'Frostmark', blurb: 'Runesmiths and shieldwalls of the fjords. Pierce armour, hold the line. Shrine +5 lives.', tradeoff: 'Rune-bound: +10% cost, +20% damage.' },
    forge: { name: 'Foundry Row', blurb: 'Steam, brass and clockwork. Splash shells and raw burst.', tradeoff: 'Pressure: Steam Hammer costs 40 gold.' },
    star: { name: 'Starfall Ascendancy', blurb: 'Hard-light engines from orbit. Precise beams and flak.', tradeoff: 'Thermal limit: Lance recharges 60% slower.' },
  },

  brief: {
    glacier: { mosa: 'Frostmark\u2019s pass is groaning under new snow. Something is walking down it. Something that giggles.', stone: 'Then we hold the pass. Stone first.', forge: 'Snow and Hollow. I brought the furnace; they brought the cold.' },
    foundry: { mosa: 'Foundry Row\u2019s streets split at the foundry. They\u2019ll come down both, and meet at the crossing.', stone: 'Two streets, one wall. I\u2019ll be the wall.', forge: 'My streets. Mind the vents \u2014 they bite both ways.' },
  },
  tips: {
    start: 'Tap a stone pad to open the build ring.',
    timer: 'Waves launch themselves when the timer runs out. Call early for bonus gold.',
    ice: 'Ice lanes: the Hollow run 30% faster here.',
    avalanche: 'Cornice above! Tap it to drop the avalanche early, or wait for the 4th wave.',
    vents: 'Steam vents erupt every 8s: 25 dmg/s and Wet. Towers next to a vent run 30% cooler.',
    fork: 'The road forks. Hollow alternate Street A and Street B and merge at X.',
    stake: 'Stakes are paid up front. Clear with no leaks to win them back with interest.',
    bank: 'Spend it: gold in the bank does nothing. Upgrades go all the way to L10.',
  },
  // Named Hollow barks. Each id plays at most once per run. reply = hero comeback by faction.
  barks: [
    { id: 'm1', ev: 'spawn:husk', who: 'Shard Maiden Iselle', txt: 'Oh, a welcome party? You shouldn\u2019t have.', reply: { stone: 'We didn\u2019t. Turn around.', forge: 'Party\u2019s got a cover charge, love. It\u2019s fire.' } },
    { id: 'm2', ev: 'kill:husk', who: 'Shard Maiden Corra', txt: 'Rude! I only came for the view.', reply: { stone: 'Enjoy it from the snow.', forge: 'View\u2019s better from the ash pile.' } },
    { id: 'c1', ev: 'spawn:ling', who: 'Scarlet Courier Vex', txt: 'Catch me and I\u2019ll let you buy me a drink.', reply: { stone: 'Stone doesn\u2019t chase. It waits.', forge: 'I\u2019ll catch you. Drinks are on you.' } },
    { id: 'c2', ev: 'leak:ling', who: 'Scarlet Courier Vex', txt: 'Too slow, Warden. Wave if you miss me.', reply: { stone: 'Next one doesn\u2019t get past.', forge: 'Lucky. Won\u2019t happen twice.' } },
    { id: 'k1', ev: 'spawn:shard', who: 'Vowknight Oriane', txt: 'Plate, vows, and very good posture.', reply: { stone: 'Plate cracks. Ask a glacier.', forge: 'Plate melts. Ask a forge.' } },
    { id: 'h1', ev: 'spawn:harpy', who: 'Harpy-Queen Zeyna', txt: 'Look up, darlings. Further. There.', reply: { stone: 'Hooks up! Bring her down.', forge: 'Flak\u2019s warm. Come closer.' } },
    { id: 's1', ev: 'spawn:siren', who: 'Siren Liesl', txt: 'One little song and you\u2019ll forget why you\u2019re fighting.', reply: { stone: 'I don\u2019t forget. I\u2019m stone.', forge: 'Sing over the bellows, then.' } },
    { id: 'o1', ev: 'spawn:moth', who: 'Moth Enchantress Pell', txt: 'Lights out, wardens. Let\u2019s see what you do in the dark.', reply: { stone: 'Stone doesn\u2019t need light. It needs you to walk into it.', forge: 'I am the light, sweetheart.' } },
    { id: 'mb1', ev: 'mini', who: 'Champion of the Veil', txt: 'Send your best. Or send everyone. I don\u2019t mind.', reply: { stone: 'Everyone, then. On my mark.', forge: 'All of it. Now.' } },
    { id: 'lw1', ev: 'lowlives', who: 'Scarlet Courier Vex', txt: 'Your shrine\u2019s looking a little thin, sweetheart.', reply: { stone: 'Thin isn\u2019t broken.', forge: 'Still standing. Still burning.' } },
    { id: 'st1', ev: 'stake', who: 'Herald of Kasiri', txt: 'A wager? Now you\u2019re interesting.', reply: { stone: 'Stone remembers. Stake it.', forge: 'Push it in. Let it burn.' } },
    { id: 'sw1', ev: 'stakewon', who: 'Herald of Kasiri', txt: 'Fine, you win this round. Don\u2019t let it go to your head.', reply: { stone: 'Too late.', forge: 'Already has.' } },
    { id: 'sl1', ev: 'stakelost', who: 'Herald of Kasiri', txt: 'Pay up, darling. I accept gold and humiliation.', reply: { stone: 'Take the gold. Keep the rest.', forge: 'Put it on my tab.' } },
    { id: 'av1', ev: 'avalanche', who: 'Mosa', txt: 'The cornice is cracking \u2014 clear the pads!', reply: { stone: 'Let it fall. On them.', forge: 'Snow. Wonderful.' } },
    { id: 'vn1', ev: 'vent', who: 'Shard Maiden Corra', txt: 'Ugh, steam! My hair!', reply: { stone: 'Keep walking.', forge: 'Foundry Row says hello.' } },
  ],
  herald: {
    intro: 'Kneel, or don\u2019t. I find both charming.',
    reply: { stone: 'The north doesn\u2019t kneel, Herald.', forge: 'We don\u2019t kneel. We forge.' },
    p75: 'A scratch on the regalia? Phase two, darling. Do keep up.',
    p50: 'You\u2019ve cracked me. How intimate. Mind, I\u2019m a touch more\u2026 approachable now. Don\u2019t let it go to your head.',
    p25: 'Fine. The ceremonial plates were for guests. This is what I wear to work.',
    fall: 'Remember me\u2026 you won\u2019t be able to help it.',
  },
  victory: { glacier: 'The pass is quiet. Those maidens wore clan bangles. Ours. Find out whose.', foundry: 'The foundry fires burn on. Whatever the Herald wanted in Foundry Row, it didn\u2019t get it. Yet.' },
  defeat: {
    stone: 'The shrine cracks. {H} rises from the snow: \u201cNot today. Again.\u201d',
    forge: 'The forge-light gutters. {H} wipes the ash away: \u201cRekindle it. We go again.\u201d',
  },

  // Costume-break and wave-start pools: one random unused line per event; hero replies ~1 in 3 (game.js bark()).
  barks2: [
    { id: 'br1', ev: 'break:husk:2', who: 'Shard Maiden Iselle', txt: 'My silk! Do you know how long these take to wrap?', reply: { stone: 'Longer than you\u2019ll last.', forge: 'Should\u2019ve worn something fireproof.' } },
    { id: 'br2', ev: 'break:shard:2', who: 'Vowknight Oriane', txt: 'Oh, so that\u2019s how you get under my armour.', reply: { stone: 'Patience. And a very big rock.', forge: 'Heat. Always heat.' } },
    { id: 'br3', ev: 'break:harpy:2', who: 'Harpy-Queen Zeyna', txt: 'Still fully dressed, still furious. Look at my face, please.', reply: { stone: 'Looking. Unimpressed.', forge: 'Lovely face. Shame about the aim.' } },
    { id: 'br4', ev: 'break:siren:2', who: 'Siren Liesl', txt: 'A tear in the hem? \u2026Actually, the drama suits me. No. Wait. Stop.', reply: { stone: 'No.', forge: 'Encore!' } },
    { id: 'br5', ev: 'break:shard:1', who: 'Vowknight Oriane', txt: 'A dent. In ceremonial plate. My ancestors are writing to you.' },
    { id: 'br6', ev: 'break:siren:3', who: 'Siren Liesl', txt: 'Hem\u2019s gone, voice isn\u2019t. Second verse!' },
    { id: 'br7', ev: 'break:harpy:3', who: 'Harpy-Queen Zeyna', txt: 'Feathers grow back, darling. Your towers won\u2019t.' },
    { id: 'ws1', ev: 'wavestart', who: 'Shard Maiden Corra', txt: 'Ladies, single file. Let them think they\u2019re winning.', reply: { stone: 'Single file. Easier to count.', forge: 'Line up. I\u2019ll light you in order.' } },
    { id: 'ws2', ev: 'wavestart', who: 'Scarlet Courier Vex', txt: 'Same road, new shoes. Try to keep up, Warden.', reply: { stone: 'The road is mine. So are the shoes, soon.', forge: 'New shoes melt the same.' } },
    { id: 'ws3', ev: 'wavestart', who: 'Moth Enchantress Pell', txt: 'Another round, wardens? We brought friends. And opinions.', reply: { stone: 'Bring both. I\u2019ll keep neither.', forge: 'Friends burn brighter in groups.' } },
    { id: 'ws4', ev: 'wavestart', who: 'Harpy-Queen Zeyna', txt: 'Chins up, darlings. The view from up here is delicious.', reply: { stone: 'Hooks are ready.', forge: 'Flak\u2019s ready too.' } },
  ],
  hero: {
    deploy: { stone: 'Here I stand. Here I stay. It\u2019s sort of my thing.', forge: 'The workshop\u2019s open for business. Today\u2019s special: pain.' },
    ability: { stone: 'No further. That\u2019s not a threat. It\u2019s geography.', forge: 'Heads up, ladies!' },
    low: { stone: 'Cracks show character\u2026 and they\u2019re showing a lot.', forge: 'Running a bit warm here. Even for me.' },
  },
  heraldExit: 'Remember me\u2026 you won\u2019t be able to help it.',
  coldOpen: [
    'A star fell into the valley and stayed. It hid us behind the Veil.',
    'Its gift costs memory. Every spark burns a name.',
    'The forgotten have come back. They want their names.',
  ],
  // Defeat debriefs keyed by cause (stake | leak | boss) and faction; game.js pickDebrief() merges cause:faction + cause pools.
  debrief: {
    'stake:stone': ['You bet the shrine on a no-leak wave? Darling, I\u2019d have taken that bet too. \u2014 Herald', 'The pass broke. I didn\u2019t. Again. \u2014 {H}'],
    'stake:forge': ['You bet the shrine on a no-leak wave? Darling, I\u2019d have taken that bet too. \u2014 Herald', 'Fire\u2019s out. Matches are not. Eish, again. \u2014 {H}'],
    'leak:stone': ['Your shrine\u2019s got more holes than your plan, sweetheart. Again? \u2014 Vex', 'The pass broke. I didn\u2019t. Again. \u2014 {H}', 'Stone holds where you put it. Put more of it on the lane. \u2014 {H}'],
    'leak:forge': ['Your shrine\u2019s got more holes than your plan, sweetheart. Again? \u2014 Vex', 'Fire\u2019s out. Matches are not. Eish, again. \u2014 {H}', 'Both streets, boss. They took the one we didn\u2019t watch. \u2014 {H}'],
    'boss:stone': ['I walked right past you. Next time, at least look at me. \u2014 Herald', 'She walked through like she owned the pass. She doesn\u2019t. Yet. \u2014 {H}'],
    'boss:forge': ['I walked right past you. Next time, at least look at me. \u2014 Herald', 'Gorgeous, terrifying, and gone. Next time she stays for the slag. \u2014 {H}'],
    stake: ['You staked it all on a no-leak wave. Bold. Wrong, but bold. \u2014 Herald', 'Bet smaller, boet. The shrine isn\u2019t a casino. \u2014 {H}', 'Gold on the table and Hollow in the shrine. Bet smaller, Warden. \u2014 Mosa'],
    leak: ['One slipped through, then all of them did. Eish. \u2014 {H}', 'They didn\u2019t break the wall. They walked around it. \u2014 Mosa', 'Count what slipped through. That is your next tower. \u2014 Mosa'],
    boss: ['She curtsied at the shrine. Curtsied. \u2014 {H}', 'Her health bar must reach zero before she reaches the shrine. Save damage for her. \u2014 Mosa'],
  },
  teaser: { glacier: 'Those bangles came from Foundry Row. Their streets are next. \u2014 Mosa', foundry: 'The Herald fled north with a name she stole. The Veil is thinner than we thought. \u2014 Mosa' },
  explain: { shards: 'Crystallised Ember. Spend them to evolve your hero.', remembrance: 'Clear with an ally to earn it. The star counts who stood with you.' },
  ui: {
    unspent: '\u25C9 {g}g unspent: build or upgrade',
    armourHint: 'Herald\u2019s plate cracked: armour \u221210%. Veil shield 3s.',
    reloadNote: 'Reloading mid-wave restarts from the start of that wave.',
    speed: 'Speed', settings: 'SETTINGS', haptics: 'Haptics', motion: 'Reduced motion', textSize: 'Text size', sound: 'Sound',
    skip: 'SKIP', next: 'NEXT', begin: 'BEGIN',
  },
  stakeLines: ['A little flutter? Cute.', 'Double? Oh, now you\u2019re interesting.', 'Everything, darling? Bold. Reckless. Very nearly attractive.'],
};
// Display names for towers (Frostmark / Foundry Row) — base, L4 A, L4 B.
const TOWER_NAMES = {
  monolith: 'Rune Menhir', drum: 'Avalanche Horn', spire: 'Icefang Spire', bastion: 'Shieldwall', skyhook: 'Gale Harpoon',
  cannon: 'Mortar Chapel', slag: 'Brimstone Sprayer', lance: 'Galvanic Lance', bell: 'Cathedral Bell', kiln: 'Flak Gargoyle',
};
