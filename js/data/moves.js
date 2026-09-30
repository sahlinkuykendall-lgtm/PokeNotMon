// Move data.
// cat: 'phys' | 'spec' | 'status'. acc: percent (null = never misses).
// effect: { status: 'psn'|'brn'|'slp'|'par'|'frz'|'cnf', chance } applied to the foe.
// stages: { target: 'foe'|'self', stats: { atk: -1, ... }, chance }.

export const MOVES = {
  // Basic (neutral)
  tackle: { name: 'Tackle', type: 'neutral', cat: 'phys', power: 40, acc: 100, pp: 35, desc: 'A full-body charge.' },
  scratch: { name: 'Scratch', type: 'neutral', cat: 'phys', power: 40, acc: 100, pp: 35, desc: 'Rakes the foe with sharp claws.' },
  quickjab: { name: 'Quick Jab', type: 'neutral', cat: 'phys', power: 40, acc: 100, pp: 30, priority: 1, desc: 'A lightning-fast strike that always goes first.' },
  headbutt: { name: 'Headbutt', type: 'neutral', cat: 'phys', power: 70, acc: 100, pp: 15, desc: 'A hard-headed charge.' },
  bodyslam: { name: 'Body Slam', type: 'neutral', cat: 'phys', power: 85, acc: 100, pp: 15, effect: { status: 'par', chance: 30 }, desc: 'Slams the foe. May paralyze.' },
  growl: { name: 'Growl', type: 'neutral', cat: 'status', acc: 100, pp: 40, stages: { target: 'foe', stats: { atk: -1 } }, desc: "Lowers the foe's Attack." },
  leer: { name: 'Leer', type: 'neutral', cat: 'status', acc: 100, pp: 30, stages: { target: 'foe', stats: { def: -1 } }, desc: "Lowers the foe's Defense." },
  revup: { name: 'Rev Up', type: 'neutral', cat: 'status', acc: null, pp: 20, stages: { target: 'self', stats: { atk: 2 } }, desc: 'Sharply raises Attack.' },
  struggle: { name: 'Struggle', type: 'neutral', cat: 'phys', power: 50, acc: null, pp: 1, recoil: 0.25, desc: 'Used only when out of PP.' },

  // Fire
  ember: { name: 'Ember', type: 'fire', cat: 'spec', power: 40, acc: 100, pp: 25, effect: { status: 'brn', chance: 10 }, desc: 'Small flames. May burn.' },
  flamefang: { name: 'Flame Fang', type: 'fire', cat: 'phys', power: 65, acc: 95, pp: 15, effect: { status: 'brn', chance: 10 }, desc: 'A fiery bite. May burn.' },
  heatwave: { name: 'Heat Wave', type: 'fire', cat: 'spec', power: 90, acc: 90, pp: 10, effect: { status: 'brn', chance: 10 }, desc: 'A scorching blast of hot air.' },

  // Water
  watergun: { name: 'Water Gun', type: 'water', cat: 'spec', power: 40, acc: 100, pp: 25, desc: 'Squirts water at the foe.' },
  aquajet: { name: 'Aqua Jet', type: 'water', cat: 'phys', power: 40, acc: 100, pp: 20, priority: 1, desc: 'A speedy water dash that goes first.' },
  bubblebeam: { name: 'Bubble Beam', type: 'water', cat: 'spec', power: 65, acc: 100, pp: 20, stages: { target: 'foe', stats: { spe: -1 }, chance: 10 }, desc: 'A spray of bubbles. May lower Speed.' },
  aquatail: { name: 'Aqua Tail', type: 'water', cat: 'phys', power: 90, acc: 90, pp: 10, desc: 'Swings its tail like a crashing wave.' },

  // Grass
  vinewhip: { name: 'Vine Whip', type: 'grass', cat: 'phys', power: 45, acc: 100, pp: 25, desc: 'Strikes with slender vines.' },
  absorb: { name: 'Absorb', type: 'grass', cat: 'spec', power: 40, acc: 100, pp: 25, drain: 0.5, desc: 'Drains HP from the foe.' },
  sleeppowder: { name: 'Sleep Powder', type: 'grass', cat: 'status', acc: 75, pp: 15, effect: { status: 'slp' }, desc: 'Puts the foe to sleep.' },
  seedbomb: { name: 'Seed Bomb', type: 'grass', cat: 'phys', power: 80, acc: 100, pp: 15, desc: 'Pelts the foe with hard seeds.' },
  leafblade: { name: 'Leaf Blade', type: 'grass', cat: 'phys', power: 90, acc: 100, pp: 15, crit: true, desc: 'A razor leaf. High critical-hit ratio.' },

  // Electric
  thundershock: { name: 'Thundershock', type: 'electric', cat: 'spec', power: 40, acc: 100, pp: 30, effect: { status: 'par', chance: 10 }, desc: 'A jolt of electricity. May paralyze.' },
  spark: { name: 'Spark', type: 'electric', cat: 'phys', power: 65, acc: 100, pp: 20, effect: { status: 'par', chance: 30 }, desc: 'An electrified tackle. May paralyze.' },
  thunderwave: { name: 'Thunder Wave', type: 'electric', cat: 'status', acc: 90, pp: 20, effect: { status: 'par' }, desc: 'A weak jolt that paralyzes.' },
  thunderbolt: { name: 'Thunderbolt', type: 'electric', cat: 'spec', power: 90, acc: 100, pp: 15, effect: { status: 'par', chance: 10 }, desc: 'A strong electric blast.' },

  // Ice
  frostbreath: { name: 'Frost Breath', type: 'ice', cat: 'spec', power: 40, acc: 100, pp: 25, effect: { status: 'frz', chance: 10 }, desc: 'An icy breath. May freeze.' },
  icefang: { name: 'Ice Fang', type: 'ice', cat: 'phys', power: 65, acc: 95, pp: 15, effect: { status: 'frz', chance: 10 }, desc: 'A frozen bite. May freeze.' },
  icebeam: { name: 'Ice Beam', type: 'ice', cat: 'spec', power: 90, acc: 100, pp: 10, effect: { status: 'frz', chance: 10 }, desc: 'A freezing beam. May freeze.' },

  // Ground
  mudslap: { name: 'Mud Slap', type: 'ground', cat: 'spec', power: 20, acc: 100, pp: 10, stages: { target: 'foe', stats: { spe: -1 } }, desc: "Hurls mud. Lowers the foe's Speed." },
  rockthrow: { name: 'Rock Throw', type: 'ground', cat: 'phys', power: 50, acc: 90, pp: 15, desc: 'Throws a small rock.' },
  rockslide: { name: 'Rock Slide', type: 'ground', cat: 'phys', power: 75, acc: 90, pp: 10, desc: 'Large boulders tumble onto the foe.' },
  earthquake: { name: 'Earthquake', type: 'ground', cat: 'phys', power: 100, acc: 100, pp: 10, desc: 'A powerful quake.' },

  // Wind
  gust: { name: 'Gust', type: 'wind', cat: 'spec', power: 40, acc: 100, pp: 35, desc: 'A gust of wind.' },
  aircutter: { name: 'Air Cutter', type: 'wind', cat: 'spec', power: 60, acc: 95, pp: 25, crit: true, desc: 'Razor-like wind. High critical-hit ratio.' },
  galeforce: { name: 'Gale Force', type: 'wind', cat: 'spec', power: 90, acc: 100, pp: 10, desc: 'A howling storm wind.' },

  // Flying
  peck: { name: 'Peck', type: 'flying', cat: 'phys', power: 35, acc: 100, pp: 35, desc: 'Jabs with a beak.' },
  wingattack: { name: 'Wing Attack', type: 'flying', cat: 'phys', power: 60, acc: 100, pp: 35, desc: 'Strikes with wide wings.' },
  skydive: { name: 'Sky Dive', type: 'flying', cat: 'phys', power: 90, acc: 95, pp: 15, desc: 'Dives from high above.' },

  // Fighting
  lowkick: { name: 'Low Kick', type: 'fighting', cat: 'phys', power: 50, acc: 100, pp: 20, desc: 'A sweeping kick.' },
  karatechop: { name: 'Karate Chop', type: 'fighting', cat: 'phys', power: 55, acc: 100, pp: 25, crit: true, desc: 'A sharp chop. High critical-hit ratio.' },
  bulkup: { name: 'Bulk Up', type: 'fighting', cat: 'status', acc: null, pp: 20, stages: { target: 'self', stats: { atk: 1, def: 1 } }, desc: 'Raises Attack and Defense.' },
  powerpunch: { name: 'Power Punch', type: 'fighting', cat: 'phys', power: 85, acc: 95, pp: 10, desc: 'A mighty punch.' },

  // Psychic
  confusion: { name: 'Confusion', type: 'psychic', cat: 'spec', power: 50, acc: 100, pp: 25, effect: { status: 'cnf', chance: 10 }, desc: 'A telekinetic hit. May confuse.' },
  psybeam: { name: 'Psybeam', type: 'psychic', cat: 'spec', power: 65, acc: 100, pp: 20, effect: { status: 'cnf', chance: 10 }, desc: 'A peculiar ray. May confuse.' },
  calmmind: { name: 'Calm Mind', type: 'psychic', cat: 'status', acc: null, pp: 20, stages: { target: 'self', stats: { spa: 1, spd: 1 } }, desc: 'Raises Sp. Atk and Sp. Def.' },

  // Ghost
  lick: { name: 'Lick', type: 'ghost', cat: 'phys', power: 30, acc: 100, pp: 30, effect: { status: 'par', chance: 30 }, desc: 'A spooky lick. May paralyze.' },
  shadowsneak: { name: 'Shadow Sneak', type: 'ghost', cat: 'phys', power: 40, acc: 100, pp: 30, priority: 1, desc: 'Strikes from the shadows first.' },
  hex: { name: 'Hex', type: 'ghost', cat: 'spec', power: 65, acc: 100, pp: 10, hex: true, desc: 'Double power if the foe has a status problem.' },
  confuseray: { name: 'Confuse Ray', type: 'ghost', cat: 'status', acc: 100, pp: 10, effect: { status: 'cnf' }, desc: 'A sinister ray that confuses.' },

  // Poison
  poisonsting: { name: 'Poison Sting', type: 'poison', cat: 'phys', power: 15, acc: 100, pp: 35, effect: { status: 'psn', chance: 30 }, desc: 'A toxic barb. May poison.' },
  acid: { name: 'Acid', type: 'poison', cat: 'spec', power: 40, acc: 100, pp: 30, stages: { target: 'foe', stats: { spd: -1 }, chance: 10 }, desc: 'Sprays acid. May lower Sp. Def.' },
  poisonpowder: { name: 'Poison Powder', type: 'poison', cat: 'status', acc: 75, pp: 35, effect: { status: 'psn' }, desc: 'A cloud of toxic dust.' },
  sludge: { name: 'Sludge', type: 'poison', cat: 'spec', power: 65, acc: 100, pp: 20, effect: { status: 'psn', chance: 30 }, desc: 'Hurls toxic sludge. May poison.' },

  // Metal
  metalclaw: { name: 'Metal Claw', type: 'metal', cat: 'phys', power: 50, acc: 95, pp: 35, stages: { target: 'self', stats: { atk: 1 }, chance: 10 }, desc: 'Steel claws. May raise Attack.' },
  irondefense: { name: 'Iron Defense', type: 'metal', cat: 'status', acc: null, pp: 15, stages: { target: 'self', stats: { def: 2 } }, desc: 'Sharply raises Defense.' },
  ironhead: { name: 'Iron Head', type: 'metal', cat: 'phys', power: 80, acc: 100, pp: 15, desc: 'Slams with a steel-hard head.' },

  // Dragon
  dragonbreath: { name: 'Dragon Breath', type: 'dragon', cat: 'spec', power: 60, acc: 100, pp: 20, effect: { status: 'par', chance: 30 }, desc: 'A mighty gust. May paralyze.' },
  dragonclaw: { name: 'Dragon Claw', type: 'dragon', cat: 'phys', power: 80, acc: 100, pp: 15, desc: 'Slashes with huge claws.' },

  // Mythical
  stardust: { name: 'Stardust', type: 'mythical', cat: 'spec', power: 50, acc: 100, pp: 25, desc: 'Showers the foe with glittering dust.' },
  moonbeam: { name: 'Moonbeam', type: 'mythical', cat: 'spec', power: 90, acc: 100, pp: 10, desc: 'A beam of pale moonlight.' },
};
