// Map data. Each character in `tiles` is one 32x32 tile (see TILES legend).
// Buildings and furniture are placed as objects on top of the tile grid.
// NPC and warp positions are in tile units.

export const TILES = {
  '.': { ground: 'grass' },
  ',': { ground: 'flowers' },
  'g': { ground: 'grassDark', obj: 'tallgrass', tallGrass: true },
  '=': { ground: 'path' },
  '_': { ground: 'sand' },
  '~': { ground: 'water', solid: true },
  '#': { ground: 'grassDark', obj: 'tree', solid: true },
  'T': { ground: 'grassDark', obj: 'pine', solid: true },
  'f': { ground: 'grass', obj: 'fence', solid: true },
  's': { ground: 'grass', obj: 'sign', solid: true },
  'S': { ground: 'path', obj: 'sign', solid: true },
  'R': { ground: 'grass', obj: 'rock', solid: true },
  'x': { ground: 'path', obj: 'barrier', solid: true },
  'o': { ground: 'wood' },
  'q': { ground: 'labfloor' },
  'r': { ground: 'rug' },
  'm': { ground: 'mat' },
  'W': { ground: 'wallbase', obj: 'wall', solid: true },
  'V': { ground: 'dark', solid: true },
};

export const MAPS = {
  mossbrook: {
    name: 'Mossbrook Town',
    music: 'town',
    outdoor: true,
    bg: '#1d4a2a',
    tiles: [
      '############==############',
      '############==############',
      '###.........==.........###',
      '##..,,......==......,,..##',
      '##..........==..........##',
      '##..........==..........##',
      '##..........==..........##',
      '##..........==..........##',
      '##...=......==.....=....##',
      '##...===============....##',
      '##..s.......==..........##',
      '##......==========......##',
      '##..,,..=........=..,,..##',
      '##......=........=......##',
      '##......=........=......##',
      '##......=........=......##',
      '##......=........=s.....##',
      '##......=....=...=......##',
      '##......==========.,,,..##',
      '##.~~~~...............,.##',
      '##.~~~~.......,,........##',
      '##.~~~~..R..............##',
      '###....................###',
      '##########################',
    ],
    objects: [
      { sprite: 'house_red', x: 4, y: 5, w: 4, h: 3, door: [5, 7] },
      { sprite: 'house_blue', x: 18, y: 5, w: 4, h: 3 },
      { sprite: 'lab', x: 11, y: 13, w: 5, h: 4, door: [13, 16] },
    ],
    warps: [
      { x: 5, y: 7, w: 1, h: 1, to: 'playerHouse', ax: 5, ay: 6.6, dir: 'up', sfx: 'door' },
      { x: 13, y: 16, w: 1, h: 1, to: 'lab', ax: 6, ay: 9.5, dir: 'up', sfx: 'door' },
      { x: 12, y: 0, w: 2, h: 1, to: 'route1', keepX: 12, ay: 38.4, dir: 'up' },
    ],
    texts: {
      '4,10': ['MOSSBROOK TOWN', 'Where every journey takes root.'],
      '18,16': ["PROF. HAZEL'S MONSTER LAB", 'Visitors welcome! Please wipe your feet.'],
      '19,7': ["It's Kai's house.", 'The door is locked. Kai must be at the lab already.'],
      '20,7': ["It's Kai's house.", 'The door is locked. Kai must be at the lab already.'],
    },
    npcs: [
      {
        id: 'town_kid', look: 'kid', name: 'Kid', x: 9, y: 6, dir: 'down', wander: 2,
        lines: ['Hold the B button to run!', 'Zoom zoom! Nobody can catch me!'],
      },
      {
        id: 'town_girl', look: 'girl', name: 'Maya', x: 8, y: 20, dir: 'left',
        lines: ['The pond is so clear today.', 'I bet Water-type monsters live in there!'],
      },
      {
        id: 'town_oldman', look: 'oldman', name: 'Old Man', x: 20, y: 14, dir: 'left', wander: 1,
        lines: [
          'Tall grass is where wild monsters hide.',
          "Going in there without a monster of your own? That's how you end up running home crying.",
          'Heh. I speak from experience.',
        ],
      },
    ],
  },

  route1: {
    name: 'Route 1',
    music: 'route',
    outdoor: true,
    bg: '#1d4a2a',
    tiles: [
      '#########==###########',
      '#########xx###########',
      '###.....s==......#####',
      '###......==.......####',
      '##..ggg..==..gggg..###',
      '##.ggggg.==.gggggg..##',
      '##.ggggg.==.gggggg..##',
      '##..ggg..==..gggg...##',
      '###......==.........##',
      '####.....=======....##',
      '####..,,......==....##',
      '###...........==....##',
      '##..gggg......==..TT##',
      '##.ggggggg....==....##',
      '##.ggggggg....==.,,.##',
      '##..ggggg.....==....##',
      '###...........==...###',
      '###.~~~~......==....##',
      '##..~~~~~.....==.gg.##',
      '##..~~~~~.....==ggg.##',
      '###..~~~......==ggg.##',
      '###...==========ggg.##',
      '##....==.....,,..gg.##',
      '##.R..==..gggggg....##',
      '##....==.ggggggg....##',
      '##....==.ggggggg..R.##',
      '##gg..==..ggggg.....##',
      '##gg..==............##',
      '##gg..=======.......##',
      '###.........==.....###',
      '###..,,.....==..s..###',
      '##..........==......##',
      '##.gggg.....==.gggg.##',
      '##.gggg.....==.gggg.##',
      '##.gggg.....==......##',
      '###.........==.....###',
      '#####.......==...#####',
      '######......==....####',
      '############==########',
      '############==########',
    ],
    objects: [],
    warps: [
      { x: 12, y: 39, w: 2, h: 1, to: 'mossbrook', keepX: 12, ay: 1.5, dir: 'down' },
    ],
    texts: {
      '8,2': ['ROUTE 1', 'North: Cinderpeak City', 'South: Mossbrook Town'],
      '16,30': ['TRAINER TIP', 'Wild monsters hide in tall grass. Step carefully!'],
      '9,1': ['ROAD CLOSED', 'Rockslide cleanup in progress.'],
      '10,1': ['ROAD CLOSED', 'Rockslide cleanup in progress.'],
    },
    npcs: [
      {
        id: 'r1_guard', look: 'guard', name: 'Guard', x: 11, y: 2, dir: 'down',
        lines: [
          'Sorry, kid! The road to Cinderpeak City is closed.',
          "A rockslide buried the path. We're digging it out as fast as we can.",
          '🚧 This road opens in a future update (Phase 4)!',
        ],
      },
      {
        id: 'r1_hiker', look: 'hiker', name: 'Hiker Bram', x: 4, y: 9, dir: 'right', wander: 2,
        lines: ['Hiking is always better with a monster buddy.', "Mine's napping in its capture orb right now. Lazy thing!"],
      },
      {
        id: 'r1_girl', look: 'girl', name: 'Lass Poppy', x: 17, y: 14, dir: 'down',
        lines: ['These flowers smell amazing!', 'Wild monsters love them too. Sometimes they sneak out to sniff them.'],
      },
      {
        id: 'r1_kid', look: 'kid', name: 'Youngster Tim', x: 16, y: 27, dir: 'left', wander: 2,
        lines: ["When I grow up I'm gonna beat all 8 Gym Leaders!", "...After my mom says it's okay."],
      },
    ],
  },

  playerHouse: {
    name: 'Home',
    music: 'town',
    outdoor: false,
    bg: '#000000',
    wallStyle: 'home',
    tiles: [
      'WWWWWWWWWW',
      'VooooooooV',
      'VooooooooV',
      'VoooorrooV',
      'VoooorrooV',
      'VooooooooV',
      'VooooooooV',
      'VVVVmmVVVV',
    ],
    objects: [
      { sprite: 'bed', x: 1, y: 1, w: 1, h: 2, text: ['Your bed. Still warm.', 'Ten more minutes...? No! Adventure awaits!'] },
      { sprite: 'pc', x: 3, y: 1, w: 1, h: 1, text: ["It's your PC.", '🚧 Monster storage boxes arrive in Phase 3.'] },
      { sprite: 'tv', x: 6, y: 1, w: 1, h: 1, text: ["There's a monster battle on TV!", 'The Champion just won with a single move. So cool!'] },
      { sprite: 'bookshelf', x: 8, y: 1, w: 1, h: 1, text: ['It\'s packed with books.', '"Monsters of the Region, Vol. 1"... "How to Befriend a Dragon"...'] },
      { sprite: 'table', x: 6, y: 5, w: 2, h: 1, text: ['Breakfast is on the table.', 'Mom made pancakes!'] },
      { sprite: 'plant', x: 8, y: 6, w: 1, h: 1, text: ['A healthy potted plant.'] },
    ],
    warps: [
      { x: 4, y: 7, w: 2, h: 1, to: 'mossbrook', ax: 5.5, ay: 8.6, dir: 'down', sfx: 'door' },
    ],
    texts: {},
    npcs: [
      {
        id: 'mom', look: 'mom', name: 'Mom', x: 8, y: 4, dir: 'left',
        talk: (game) => game.flags.metProf
          ? ['How was the lab, {name}?', "Remember: whatever happens out there, you can always come home.", '...And change your socks!']
          : ['Good morning, {name}! Did you sleep well?', 'Professor Hazel stopped by. She wants to see you at her lab!', "It's the big building at the south end of town."],
      },
    ],
  },

  lab: {
    name: "Hazel's Lab",
    music: 'town',
    outdoor: false,
    bg: '#000000',
    wallStyle: 'lab',
    tiles: [
      'WWWWWWWWWWWW',
      'VqqqqqqqqqqV',
      'VqqqqqqqqqqV',
      'VqqqqqqqqqqV',
      'VqqqqqqqqqqV',
      'VqqqqqqqqqqV',
      'VqqqqqqqqqqV',
      'VqqqqqqqqqqV',
      'VqqqqqqqqqqV',
      'VqqqqqqqqqqV',
      'VVVVVmmVVVVV',
    ],
    objects: [
      { sprite: 'bookshelf', x: 1, y: 1, w: 1, h: 1, text: ['Research notes on monster habitats.', '"Type matchups are key. Fire melts Ice, Water douses Fire..."'] },
      { sprite: 'bookshelf', x: 2, y: 1, w: 1, h: 1, text: ['"On Evolution: some monsters change at certain levels, others need special items."'] },
      { sprite: 'machine', x: 4, y: 1, w: 2, h: 1, text: ['A big humming machine.', 'The screen reads: MONSTER DATA SYNC... 87%'] },
      { sprite: 'pc', x: 7, y: 1, w: 1, h: 1, text: ['The Professor\'s PC.', "There's an email titled \"STARTER MONSTERS - READY SOON!\""] },
      { sprite: 'bookshelf', x: 9, y: 1, w: 1, h: 1, text: ['"Rare Prism variants shimmer with color and are stronger than normal."'] },
      { sprite: 'bookshelf', x: 10, y: 1, w: 1, h: 1, text: ['A dusty book: "Legends of the Mythical Types"'] },
      { sprite: 'labtable', x: 5, y: 4, w: 2, h: 1, text: ['Three capture orbs sit on the table.', 'They seem to be... wiggling?', '🚧 Starter monsters arrive in Phase 2!'] },
      { sprite: 'plant', x: 1, y: 9, w: 1, h: 1, text: ['A lab-grown plant. It seems happy.'] },
      { sprite: 'plant', x: 10, y: 9, w: 1, h: 1, text: ['A lab-grown plant. One of its leaves twitched.'] },
    ],
    warps: [
      { x: 5, y: 10, w: 2, h: 1, to: 'mossbrook', ax: 13.5, ay: 17.6, dir: 'down', sfx: 'door' },
    ],
    texts: {},
    npcs: [
      {
        id: 'prof', look: 'prof', name: 'Prof. Hazel', x: 6, y: 3, dir: 'down',
        talk: (game) => {
          if (!game.flags.metProf) {
            game.flags.metProf = true;
            return [
              'Ah, {name}! There you are!',
              "I'm finishing preparations for three very special monsters.",
              'One of them will become your partner!',
              "They're still a bit shy, so give me a little more time.",
              'In the meantime, why not explore Route 1 north of town?',
              '🚧 Choosing your starter comes in Phase 2!',
            ];
          }
          return ['The monsters are almost ready, {name}!', 'Explore a bit and come back soon.'];
        },
      },
      {
        id: 'kai', look: 'kai', name: 'Kai', x: 3, y: 6, dir: 'right', wander: 1,
        talk: (game) => [
          'Yo, {name}! Took you long enough.',
          "The Professor's making us wait for our monsters. Ugh!",
          "Whatever. When I get mine, I'm gonna be the strongest trainer ever.",
          "You'll see!",
        ],
      },
      {
        id: 'aide', look: 'aide', name: 'Lab Aide', x: 9, y: 7, dir: 'left', wander: 1,
        lines: ['Welcome to the lab!', 'The Professor studies how monsters grow, evolve, and battle.', 'There are fifteen known types... and maybe more.'],
      },
    ],
  },
};
