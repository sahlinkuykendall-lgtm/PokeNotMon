// Species data. base = [HP, Atk, Def, SpA, SpD, Spe].
// art describes how js/monart.js draws the monster.

export const SPECIES = {
  // ---------------- Starters ----------------
  emberpup: {
    name: 'Emberpup', types: ['fire'], base: [45, 58, 40, 60, 45, 62], catch: 45, exp: 62,
    evo: { level: 16, into: 'blazehound' },
    learn: [[1, 'tackle'], [1, 'growl'], [5, 'ember'], [9, 'quickjab'], [13, 'flamefang'], [17, 'leer'], [21, 'headbutt'], [25, 'revup'], [30, 'heatwave']],
    dex: 'A playful pup with an ember for a tail. The flame burns brighter when it is happy.',
    art: { body: 'quad', size: 0.72, pal: { main: '#f0843a', belly: '#ffd9a6', accent: '#ffd23f', accent2: '#e8402a' }, ears: 'pointy', tail: 'flame', crest: 'flame', eyes: 'cute' },
  },
  blazehound: {
    name: 'Blazehound', types: ['fire'], base: [60, 78, 55, 80, 60, 82], catch: 45, exp: 142,
    evo: { level: 36, into: 'infernox' },
    learn: [[1, 'tackle'], [1, 'growl'], [5, 'ember'], [9, 'quickjab'], [13, 'flamefang'], [17, 'leer'], [22, 'headbutt'], [27, 'revup'], [32, 'heatwave']],
    dex: 'It races across fields leaving scorched pawprints. Its mane of fire can reach 1,000 degrees.',
    art: { body: 'quad', size: 0.88, pal: { main: '#df6a2c', belly: '#ffcf8a', accent: '#ffd23f', accent2: '#d8342a' }, ears: 'pointy', tail: 'flame', crest: 'flame', extras: ['flameMane'], eyes: 'fierce' },
  },
  infernox: {
    name: 'Infernox', types: ['fire', 'fighting'], base: [78, 105, 70, 95, 70, 100], catch: 45, exp: 225,
    learn: [[1, 'tackle'], [1, 'growl'], [5, 'ember'], [9, 'quickjab'], [13, 'flamefang'], [17, 'leer'], [22, 'headbutt'], [27, 'revup'], [32, 'heatwave'], [36, 'powerpunch'], [42, 'karatechop'], [48, 'bulkup']],
    dex: 'It stands tall to fight with blazing fists. Honor matters more to it than winning.',
    art: { body: 'biped', size: 1, pal: { main: '#cf5228', belly: '#ffcf8a', accent: '#ffd23f', accent2: '#c2261e', glove: '#3a2a2a' }, ears: 'pointy', tail: 'flame', crest: 'flame', extras: ['flameMane', 'gloves'], eyes: 'fierce' },
  },

  sproutle: {
    name: 'Sproutle', types: ['grass'], base: [50, 52, 60, 55, 60, 38], catch: 45, exp: 64,
    evo: { level: 16, into: 'thornback' },
    learn: [[1, 'tackle'], [1, 'growl'], [5, 'vinewhip'], [9, 'absorb'], [13, 'sleeppowder'], [17, 'headbutt'], [21, 'seedbomb'], [27, 'irondefense'], [33, 'leafblade']],
    dex: 'The sprout on its head soaks up sunshine. It naps in gardens and is often mistaken for a plant.',
    art: { body: 'quad', size: 0.7, pal: { main: '#74c86a', belly: '#eee6a6', accent: '#3f9b47', accent2: '#a8e07a', shell: '#5aa85a' }, ears: 'none', tail: 'leaf', crest: 'leaf', extras: ['shell'], eyes: 'cute' },
  },
  thornback: {
    name: 'Thornback', types: ['grass'], base: [65, 70, 80, 70, 75, 50], catch: 45, exp: 142,
    evo: { level: 36, into: 'verdantor' },
    learn: [[1, 'tackle'], [1, 'growl'], [5, 'vinewhip'], [9, 'absorb'], [13, 'sleeppowder'], [17, 'headbutt'], [22, 'seedbomb'], [28, 'irondefense'], [34, 'leafblade']],
    dex: 'Its shell sprouted sharp thorns. It curls up and rolls at intruders.',
    art: { body: 'quad', size: 0.86, pal: { main: '#4fa85a', belly: '#e6dc98', accent: '#2d7a3c', accent2: '#8ad07a', shell: '#3f8a4a' }, ears: 'none', tail: 'leaf', crest: 'leaf', extras: ['shell', 'thorns'], eyes: 'fierce' },
  },
  verdantor: {
    name: 'Verdantor', types: ['grass', 'ground'], base: [85, 95, 105, 80, 90, 65], catch: 45, exp: 228,
    learn: [[1, 'tackle'], [1, 'growl'], [5, 'vinewhip'], [9, 'absorb'], [13, 'sleeppowder'], [17, 'headbutt'], [22, 'seedbomb'], [28, 'irondefense'], [34, 'leafblade'], [36, 'rockslide'], [44, 'earthquake']],
    dex: 'A walking hill with a whole tree on its back. Birds nest in its branches.',
    art: { body: 'quad', size: 1, pal: { main: '#3f8a4a', belly: '#d8c890', accent: '#2d6a34', accent2: '#8ad07a', shell: '#8a7456' }, ears: 'none', tail: 'none', crest: 'none', extras: ['shell', 'tree'], eyes: 'fierce' },
  },

  finnlet: {
    name: 'Finnlet', types: ['water'], base: [50, 48, 55, 58, 57, 45], catch: 45, exp: 63,
    evo: { level: 16, into: 'tidalfin' },
    learn: [[1, 'tackle'], [1, 'growl'], [5, 'watergun'], [9, 'aquajet'], [13, 'bubblebeam'], [17, 'leer'], [21, 'headbutt'], [26, 'aquatail']],
    dex: 'A cheerful water pup. It blows bubbles when excited, which is almost always.',
    art: { body: 'blob', size: 0.72, pal: { main: '#5ab0ea', belly: '#e0f4ff', accent: '#2f7fc8', accent2: '#bfe6fb' }, ears: 'fin', tail: 'fin', crest: 'none', eyes: 'cute', cheeks: '#f2a0b0' },
  },
  tidalfin: {
    name: 'Tidalfin', types: ['water'], base: [65, 65, 70, 80, 75, 60], catch: 45, exp: 142,
    evo: { level: 36, into: 'abyssail' },
    learn: [[1, 'tackle'], [1, 'growl'], [5, 'watergun'], [9, 'aquajet'], [13, 'bubblebeam'], [17, 'leer'], [22, 'headbutt'], [28, 'aquatail']],
    dex: 'It surfs river rapids for fun. Its fins can slice through waterfalls.',
    art: { body: 'biped', size: 0.86, pal: { main: '#3a8fd4', belly: '#dff4ff', accent: '#1f5fa8', accent2: '#9ad4f5' }, ears: 'fin', tail: 'fin', crest: 'none', eyes: 'cute' },
  },
  abyssail: {
    name: 'Abyssail', types: ['water', 'ice'], base: [82, 85, 90, 105, 95, 68], catch: 45, exp: 227,
    learn: [[1, 'tackle'], [1, 'growl'], [5, 'watergun'], [9, 'aquajet'], [13, 'bubblebeam'], [17, 'leer'], [22, 'headbutt'], [28, 'aquatail'], [36, 'icebeam'], [42, 'frostbreath']],
    dex: 'It commands the cold deep sea. Icebergs form wherever it rests.',
    art: { body: 'biped', size: 1, pal: { main: '#2a6db2', belly: '#dff4ff', accent: '#173f78', accent2: '#bfe8ff' }, ears: 'fin', tail: 'fin', crest: 'ice', eyes: 'fierce' },
  },

  // ---------------- Electric line ----------------
  sparkrill: {
    name: 'Sparkrill', types: ['electric'], base: [42, 50, 40, 62, 45, 70], catch: 90, exp: 60,
    evo: { level: 18, into: 'voltalon' },
    learn: [[1, 'scratch'], [1, 'leer'], [4, 'thundershock'], [8, 'quickjab'], [12, 'thunderwave'], [16, 'spark'], [22, 'headbutt'], [28, 'thunderbolt']],
    dex: 'A baby dragon that crackles with static. Its crest lights up during thunderstorms.',
    art: { body: 'biped', size: 0.72, pal: { main: '#4aa8e8', belly: '#d8f1ff', accent: '#ffd23f', accent2: '#f0a81c' }, ears: 'fin', tail: 'bolt', crest: 'bolt', eyes: 'cute', cheeks: '#ffd23f' },
  },
  voltalon: {
    name: 'Voltalon', types: ['electric'], base: [58, 70, 55, 85, 60, 90], catch: 45, exp: 145,
    evo: { level: 34, into: 'thundrake' },
    learn: [[1, 'scratch'], [1, 'leer'], [4, 'thundershock'], [8, 'quickjab'], [12, 'thunderwave'], [16, 'spark'], [24, 'headbutt'], [30, 'thunderbolt']],
    dex: 'Its claws spark like live wires. It stores lightning in its crest to use later.',
    art: { body: 'biped', size: 0.88, pal: { main: '#3a8ad8', belly: '#cfeaff', accent: '#ffd23f', accent2: '#f0a81c' }, ears: 'fin', tail: 'bolt', crest: 'bolt', extras: ['claws'], eyes: 'fierce' },
  },
  thundrake: {
    name: 'Thundrake', types: ['electric', 'dragon'], base: [75, 95, 70, 110, 75, 105], catch: 45, exp: 230,
    learn: [[1, 'scratch'], [1, 'leer'], [4, 'thundershock'], [8, 'quickjab'], [12, 'thunderwave'], [16, 'spark'], [24, 'headbutt'], [30, 'thunderbolt'], [34, 'dragonbreath'], [40, 'dragonclaw']],
    dex: 'A storm dragon. When it spreads its wings, thunderclouds gather overhead.',
    art: { body: 'biped', size: 1, pal: { main: '#2f6ec0', belly: '#cfeaff', accent: '#ffd23f', accent2: '#f0a81c' }, ears: 'fin', tail: 'bolt', crest: 'bolt', wings: 'bat', horns: true, extras: ['claws'], eyes: 'fierce' },
  },

  skyrion: {
    name: 'Skyrion', types: ['wind', 'flying'], base: [80, 90, 75, 90, 75, 100], catch: 30, exp: 200,
    learn: [[1, 'tackle'], [1, 'gust'], [1, 'leer'], [6, 'wingattack'], [12, 'aircutter'], [20, 'bodyslam'], [28, 'galeforce'], [36, 'skydive']],
    dex: 'A winged lion said to ride the jet stream. Seeing one is a sign of good fortune.',
    art: { body: 'quad', size: 0.98, pal: { main: '#f4efe0', belly: '#ffffff', accent: '#8fd0ff', accent2: '#5aa8e0', mane: '#bfe6ff' }, ears: 'round', tail: 'fluffy', crest: 'none', wings: 'feather', extras: ['cloudMane'], eyes: 'fierce' },
  },

  // ---------------- Route monsters ----------------
  pebblit: {
    name: 'Pebblit', types: ['ground'], base: [45, 55, 70, 25, 35, 20], catch: 255, exp: 50,
    evo: { level: 20, into: 'boulderon' },
    learn: [[1, 'tackle'], [1, 'irondefense'], [4, 'mudslap'], [8, 'rockthrow'], [14, 'headbutt'], [20, 'rockslide'], [26, 'metalclaw'], [34, 'earthquake']],
    dex: 'It looks just like a rock until it blinks. Hikers trip over it all the time.',
    art: { body: 'blob', size: 0.62, pal: { main: '#a58d6c', belly: '#c8b08a', accent: '#7a6446', accent2: '#d8c4a0' }, ears: 'none', tail: 'none', crest: 'none', extras: ['spots'], eyes: 'cute' },
  },
  boulderon: {
    name: 'Boulderon', types: ['ground', 'metal'], base: [80, 100, 115, 45, 65, 35], catch: 90, exp: 150,
    learn: [[1, 'tackle'], [1, 'irondefense'], [4, 'mudslap'], [8, 'rockthrow'], [14, 'headbutt'], [20, 'rockslide'], [28, 'metalclaw'], [34, 'ironhead'], [40, 'earthquake']],
    dex: 'A rock golem with iron plates. It can carry a house on its back without noticing.',
    art: { body: 'biped', size: 0.98, pal: { main: '#8e7c62', belly: '#b09a78', accent: '#9aa6b2', accent2: '#d0d8e0', glove: '#7a8692' }, ears: 'none', tail: 'none', crest: 'none', extras: ['plates', 'spots', 'gloves'], eyes: 'fierce' },
  },
  fluffinch: {
    name: 'Fluffinch', types: ['flying'], base: [40, 45, 35, 30, 35, 60], catch: 255, exp: 50,
    evo: { level: 18, into: 'galewing' },
    learn: [[1, 'peck'], [1, 'growl'], [5, 'gust'], [9, 'quickjab'], [14, 'wingattack'], [18, 'aircutter'], [26, 'galeforce']],
    dex: 'A round little bird made mostly of fluff. It chirps a wake-up song every sunrise.',
    art: { body: 'bird', size: 0.64, pal: { main: '#f6c65a', belly: '#fff6dc', accent: '#f08a3c', accent2: '#e8a83a' }, crest: 'tuft', eyes: 'cute', cheeks: '#f59a8a' },
  },
  galewing: {
    name: 'Galewing', types: ['wind', 'flying'], base: [65, 70, 60, 75, 60, 95], catch: 120, exp: 145,
    learn: [[1, 'peck'], [1, 'growl'], [5, 'gust'], [9, 'quickjab'], [14, 'wingattack'], [18, 'aircutter'], [28, 'galeforce'], [36, 'skydive']],
    dex: 'It rides whirlwinds for miles without flapping once.',
    art: { body: 'bird', size: 0.92, pal: { main: '#4fb8c8', belly: '#e6fbff', accent: '#f2c832', accent2: '#2f8a9a' }, crest: 'tuft', eyes: 'fierce' },
  },
  brawlbit: {
    name: 'Brawlbit', types: ['fighting'], base: [50, 62, 40, 25, 35, 55], catch: 200, exp: 55,
    evo: { level: 20, into: 'punchare' },
    learn: [[1, 'scratch'], [1, 'leer'], [4, 'lowkick'], [9, 'quickjab'], [13, 'karatechop'], [18, 'bulkup'], [24, 'powerpunch']],
    dex: 'A bunny that practices boxing all day. It hops around its opponent before striking.',
    art: { body: 'biped', size: 0.7, pal: { main: '#ece4d4', belly: '#ffffff', accent: '#d8434f', accent2: '#f2a0b0', glove: '#d8434f' }, ears: 'long', tail: 'fluffy', crest: 'none', extras: ['gloves', 'headband'], eyes: 'fierce' },
  },
  punchare: {
    name: 'Punchare', types: ['fighting'], base: [75, 100, 65, 40, 60, 85], catch: 90, exp: 150,
    learn: [[1, 'scratch'], [1, 'leer'], [4, 'lowkick'], [9, 'quickjab'], [13, 'karatechop'], [18, 'bulkup'], [26, 'powerpunch'], [34, 'bodyslam']],
    dex: 'A champion boxer of the fields. Its punches are faster than the eye can follow.',
    art: { body: 'biped', size: 0.88, pal: { main: '#cdbba2', belly: '#f4ecdc', accent: '#c2261e', accent2: '#f2a0b0', glove: '#c2261e' }, ears: 'long', tail: 'fluffy', crest: 'none', extras: ['gloves', 'headband'], eyes: 'fierce' },
  },
  mothwisp: {
    name: 'Mothwisp', types: ['ghost'], base: [40, 30, 40, 60, 55, 50], catch: 190, exp: 58,
    learn: [[1, 'lick'], [1, 'growl'], [6, 'confuseray'], [10, 'shadowsneak'], [15, 'hex'], [20, 'psybeam']],
    dex: 'A ghostly moth drawn to lantern light. Its wing dust makes people drowsy.',
    art: { body: 'blob', size: 0.64, float: true, pal: { main: '#a592e0', belly: '#d8ccff', accent: '#6a5aa6', accent2: '#f2d0ff' }, ears: 'none', tail: 'none', crest: 'antenna', wings: 'moth', eyes: 'big' },
  },
  toxitoad: {
    name: 'Toxitoad', types: ['poison', 'water'], base: [60, 50, 55, 60, 55, 40], catch: 190, exp: 60,
    learn: [[1, 'tackle'], [1, 'poisonsting'], [5, 'watergun'], [10, 'acid'], [15, 'poisonpowder'], [20, 'sludge'], [26, 'bubblebeam']],
    dex: 'Its bright spots warn predators away. It croaks in a low, bubbly voice.',
    art: { body: 'frog', size: 0.72, pal: { main: '#9b59b6', belly: '#e6cff2', accent: '#7fd46d', accent2: '#5a2a78' }, extras: ['spots'], eyes: 'cute' },
  },
  frostnib: {
    name: 'Frostnib', types: ['ice'], base: [45, 45, 50, 55, 55, 45], catch: 190, exp: 58,
    learn: [[1, 'peck'], [1, 'growl'], [5, 'frostbreath'], [10, 'quickjab'], [15, 'icefang'], [22, 'icebeam']],
    dex: 'A penguin chick that slides everywhere on its belly. Its breath makes tiny snowflakes.',
    art: { body: 'biped', size: 0.66, pal: { main: '#34466e', belly: '#ffffff', accent: '#f2c832', accent2: '#bfe8ff' }, ears: 'none', tail: 'none', crest: 'ice', extras: ['beak'], eyes: 'cute', cheeks: '#8fd0ff' },
  },
  kettlekin: {
    name: 'Kettlekin', types: ['metal', 'fire'], base: [55, 55, 75, 70, 60, 35], catch: 150, exp: 70,
    learn: [[1, 'tackle'], [1, 'irondefense'], [5, 'ember'], [10, 'metalclaw'], [16, 'flamefang'], [22, 'ironhead']],
    dex: 'An old kettle that came to life after a century of tea parties. It whistles when angry.',
    art: { body: 'kettle', size: 0.78, pal: { main: '#b4bec8', belly: '#dfe6ec', accent: '#e8402a', accent2: '#7a8692' }, eyes: 'cute' },
  },
  psyfox: {
    name: 'Psyfox', types: ['psychic'], base: [45, 40, 40, 70, 60, 70], catch: 120, exp: 66,
    learn: [[1, 'scratch'], [1, 'growl'], [5, 'confusion'], [10, 'quickjab'], [15, 'calmmind'], [20, 'psybeam']],
    dex: 'The gem on its forehead glows when it reads minds. It always knows where you hid the snacks.',
    art: { body: 'quad', size: 0.74, pal: { main: '#e48ad8', belly: '#ffe6fa', accent: '#7ee0ff', accent2: '#b85aa8' }, ears: 'pointy', tail: 'fluffy', crest: 'gem', eyes: 'cute' },
  },
  lumiwisp: {
    name: 'Lumiwisp', types: ['mythical'], base: [80, 80, 80, 100, 100, 90], catch: 3, exp: 250,
    learn: [[1, 'stardust'], [1, 'calmmind'], [10, 'psybeam'], [20, 'moonbeam']],
    dex: 'A being of starlight from old legends. Few have ever seen it, and fewer believe them.',
    art: { body: 'blob', size: 0.8, float: true, pal: { main: '#fff2b8', belly: '#ffffff', accent: '#f2a7e8', accent2: '#ffd23f' }, ears: 'none', tail: 'none', crest: 'star', wings: 'moth', eyes: 'big' },
  },
};

export const DEX_ORDER = Object.keys(SPECIES);

export const STARTERS = ['emberpup', 'sproutle', 'finnlet'];

// The rival always picks the starter that beats yours.
export const COUNTER_STARTER = { emberpup: 'finnlet', finnlet: 'sproutle', sproutle: 'emberpup' };
