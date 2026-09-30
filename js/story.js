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
  await ui.dialog(['{name} received 5 Capture Orbs and 3 Potions!']);
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
    'When your monsters get tired, head home. Your mom can help them rest.',
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
