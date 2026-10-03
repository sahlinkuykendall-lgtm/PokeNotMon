// Scripted story events.

import { createMonster } from './monster.js';
import { SPECIES, COUNTER_STARTER } from './data/monsters.js';

const PROF = { speaker: 'Prof. Hazel' };
const KAI = { speaker: 'Kai' };
const MOM = { speaker: 'Mom' };

// Kai's first monster only knows basic moves, so the first battle is fair.
function rivalStarter(id) {
  const m = createMonster(id, 5);
  m.moves = [{ id: 'tackle', pp: 35 }, { id: 'growl', pp: 40 }];
  return m;
}

export async function starterSequence(game) {
  const ui = game.ui;
  game.flags.metProf = true;
  await ui.dialog([
    'Ah, {name}! Perfect timing!',
    'The monsters are finally ready.',
    'On that table are three capture orbs, each with a monster inside.',
    'One of them will become your partner. Go on, take your pick!',
  ], PROF);
  await ui.dialog(['Hey! What about me, Professor?!'], KAI);
  await ui.dialog(['Patience, Kai. You can choose right after {name}.'], PROF);

  const id = await ui.starterScreen();
  game.giveMonster(createMonster(id, 5));
  game.flags.hasStarter = true;
  game.flags.starter = id;
  game.audio.sfx('caught');
  await ui.dialog([`{name} received ${SPECIES[id].name}!`]);

  const rivalId = COUNTER_STARTER[id];
  game.flags.rivalStarter = rivalId;
  await ui.dialog(["Then I'll take this one!", `${SPECIES[rivalId].name} is WAY cooler anyway.`], KAI);
  await ui.dialog(['Wonderful! Oh, and take these along too.'], PROF);
  game.addItem('orb', 5);
  game.addItem('potion', 3);
  game.audio.sfx('save');
  await ui.dialog(['{name} received 5 Capture Orbs, 3 Potions and a Monster Dex!']);
  await ui.dialog(['The Monster Dex records every monster you see and catch.', 'Fill it up for me, would you?'], PROF);
  await ui.dialog([
    'Throw a Capture Orb at a wild monster to catch it.',
    'Weaken it first. The lower its HP, the better your chances!',
  ], PROF);
  await ui.dialog(["Wait, {name}! Let's see whose monster is stronger.", 'Come on, battle me!'], KAI);

  const outcome = await game.startBattle({
    trainer: {
      name: 'Kai',
      look: 'kai',
      prize: 120,
      loseLines: ['What?! No way! I must have picked the wrong one!'],
      winLines: ['Yeah! Am I great or what?!'],
    },
    foes: [rivalStarter(rivalId)],
    theme: 'lab',
    noBlackout: true,
  });

  game.healParty();
  if (outcome.result === 'win') {
    await ui.dialog(["Hmph. Beginner's luck.", "I'm heading out to train. Catch you later, {name}!"], KAI);
  } else {
    await ui.dialog(['Ha! Told you I would be the strongest!', "I'm heading out to train. Try to keep up, {name}!"], KAI);
  }
  game.flags.kaiLeft = true;
  await game.ui.fade(true);
  game.world.npcs = game.world.npcs.filter((n) => n.def.id !== 'kai');
  await game.ui.fade(false);
  await ui.dialog([
    "That Kai... Well, I've healed your monster for you.",
    'Wild monsters live in the tall grass on Route 1, north of town.',
    'Catch some and build a strong team!',
    'When your monsters get tired, visit the Monster Center next door. It heals them for free!',
  ], PROF);
  game.saveGame(false);
}

export async function profTalk(game) {
  if (!game.flags.hasStarter) return starterSequence(game);
  const caught = game.data.dex.caught.length;
  await game.ui.dialog([
    `You've caught ${caught} kind${caught === 1 ? '' : 's'} of monster so far, {name}!`,
    caught < 3 ? 'Try catching more on Route 1. Every monster is different!' : 'Wonderful work! Keep it up!',
  ], PROF);
}

export async function momTalk(game) {
  const ui = game.ui;
  if (!game.data.party.length) {
    await ui.dialog(game.flags.metProf
      ? ['Did you see the Professor, {name}?', 'Her lab is the big building at the south end of town.']
      : ['Good morning, {name}! Did you sleep well?', 'Professor Hazel stopped by. She wants to see you at her lab!', "It's the big building at the south end of town."], MOM);
    return;
  }
  await ui.dialog(['{name}! Your monsters look tired.', 'Let them rest here for a bit.'], MOM);
  await restParty(game);
  await ui.dialog(['There! Good as new.', "Now go get 'em, sweetie!"], MOM);
}

export async function bedRest(game) {
  if (!game.data.party.length) {
    await game.ui.dialog(['Your bed. Still warm.', 'Ten more minutes...? No! Adventure awaits!']);
    return;
  }
  await game.ui.dialog(['You took a quick nap...']);
  await restParty(game);
  await game.ui.dialog(['Your monsters are fully rested!']);
}

async function restParty(game) {
  await game.ui.fade(true);
  game.healParty();
  game.audio.sfx('heal');
  await new Promise((r) => setTimeout(r, 700));
  await game.ui.fade(false);
}

// ---------------------------------------------------------------------------
// Monster Center, shop, PC, items, trainers

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function nurseTalk(game) {
  const ui = game.ui;
  const N = { speaker: 'Nurse Clover' };
  const c = await ui.ask(['Welcome to the Monster Center!', 'Shall I restore your monsters to full health?'], ['Yes', 'No'], N);
  if (c !== 0) { await ui.dialog(['We hope to see you again!'], N); return; }
  if (!game.data.party.length) { await ui.dialog(["Oh! You don't have any monsters with you yet."], N); return; }
  await ui.dialog(["Okay, I'll take your monsters for a moment."], N);
  await restParty(game);
  game.flags.respawn = { map: 'center', x: 6, y: 3.7, dir: 'up' };
  await ui.dialog(['Thank you for waiting!', 'Your monsters are fighting fit. We hope to see you again!'], N);
  game.saveGame(false);
}

export async function clerkTalk(game) {
  await game.ui.dialog(['Welcome! How may I help you?'], { speaker: 'Clerk' });
  await game.ui.shopScreen();
  await game.ui.dialog(['Please come again!'], { speaker: 'Clerk' });
}

export async function usePC(game) {
  await game.ui.dialog(['{name} turned on the PC.']);
  if (!game.data.party.length && !game.data.box.length) {
    await game.ui.dialog(['The Monster Storage System is empty.', 'Catch some monsters first!']);
    return;
  }
  game.audio.sfx('select');
  await game.ui.boxScreen();
}

export async function pickUpItem(game, npc) {
  const def = npc.def;
  const it = game.items[def.item];
  game.flags.items = game.flags.items || {};
  game.flags.items[def.id] = true;
  game.addItem(def.item, def.count || 1);
  game.world.npcs = game.world.npcs.filter((n) => n !== npc);
  game.audio.sfx('pickup');
  const what = def.count > 1 ? `${def.count} ${it.name}s` : `a ${it.name}`;
  await game.ui.dialog([`{name} found ${what}!`, `{name} put it in the Bag.`]);
}

export function trainerDefeated(game, id) {
  return !!(game.flags.trainers && game.flags.trainers[id]);
}

export async function trainerBattle(game, npc, spotted) {
  const def = npc.def;
  const tr = def.trainer;
  const world = game.world;
  if (spotted) {
    game.audio.sfx('spotted');
    npc.emote = 1.1;
    await wait(1000);
    await world.approachPlayer(npc);
  }
  world.facePlayerTo(npc);
  await game.ui.dialog(tr.intro, { speaker: def.name });
  const foes = tr.team.map(([sp, lv]) => createMonster(sp, lv));
  const out = await game.startBattle({
    trainer: { name: def.name, look: def.look, prize: tr.prize, loseLines: tr.lose },
    foes,
    theme: 'field',
  });
  if (out.result === 'win') {
    game.flags.trainers = game.flags.trainers || {};
    game.flags.trainers[def.id] = true;
    game.saveGame(false);
  }
}

export async function trainerTalk(game, npc) {
  if (trainerDefeated(game, npc.def.id)) {
    await game.ui.dialog(npc.def.trainer.after, { speaker: npc.def.name });
    return;
  }
  await trainerBattle(game, npc, false);
}
