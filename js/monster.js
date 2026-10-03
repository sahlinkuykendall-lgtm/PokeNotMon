// Monster instances: creation, stats, EXP and leveling.

import { SPECIES } from './data/monsters.js';
import { MOVES } from './data/moves.js';

export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const STAT_NAMES = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
export const STATUS_INFO = {
  psn: { label: 'PSN', color: '#a052c4', name: 'poisoned' },
  brn: { label: 'BRN', color: '#e8602a', name: 'burned' },
  slp: { label: 'SLP', color: '#8a8aa0', name: 'asleep' },
  par: { label: 'PAR', color: '#d8a820', name: 'paralyzed' },
  frz: { label: 'FRZ', color: '#5ab8e0', name: 'frozen' },
};

export const ITEMS = {
  orb: { name: 'Capture Orb', icon: '🔵', price: 200, desc: 'Throw it at a weakened wild monster to catch it.', battle: true, catch: 1 },
  greatorb: { name: 'Great Orb', icon: '🟣', price: 600, desc: 'A better orb with a higher catch rate.', battle: true, catch: 1.5 },
  potion: { name: 'Potion', icon: '🧪', price: 200, desc: 'Restores 20 HP to one monster.', battle: true, field: true, heal: 20 },
  superpotion: { name: 'Super Potion', icon: '💖', price: 700, desc: 'Restores 60 HP to one monster.', battle: true, field: true, heal: 60 },
  antidote: { name: 'Antidote', icon: '💚', price: 100, desc: 'Cures poison.', battle: true, field: true, cure: 'psn' },
  paraheal: { name: 'Paralyze Heal', icon: '💛', price: 200, desc: 'Cures paralysis.', battle: true, field: true, cure: 'par' },
  awakening: { name: 'Awakening', icon: '⏰', price: 200, desc: 'Wakes up a sleeping monster.', battle: true, field: true, cure: 'slp' },
  burnheal: { name: 'Burn Heal', icon: '🧯', price: 250, desc: 'Heals a burn.', battle: true, field: true, cure: 'brn' },
  iceheal: { name: 'Ice Heal', icon: '🧊', price: 250, desc: 'Thaws a frozen monster.', battle: true, field: true, cure: 'frz' },
  fullheal: { name: 'Full Heal', icon: '✨', price: 600, desc: 'Cures any status problem.', battle: true, field: true, cure: 'all' },
  revive: { name: 'Revive', icon: '💫', price: 1500, desc: 'Revives a fainted monster with half its HP.', battle: true, field: true, revive: 0.5 },
  firestone: { name: 'Fire Stone', icon: '🔥', price: 2100, desc: 'Makes certain monsters evolve. It feels warm.', field: true, stone: true },
  icestone: { name: 'Ice Stone', icon: '❄️', price: 2100, desc: 'Makes certain monsters evolve. It never melts.', field: true, stone: true },
  moonstone: { name: 'Moon Stone', icon: '🌙', price: 2100, desc: 'Makes certain monsters evolve. It glows faintly at night.', field: true, stone: true },
};

export const SHOP_STOCK = ['orb', 'greatorb', 'potion', 'superpotion', 'antidote', 'paraheal', 'awakening', 'burnheal', 'iceheal', 'fullheal', 'revive', 'firestone', 'icestone', 'moonstone'];

// The species this stone would evolve the monster into, or null.
export function stoneEvolution(m, itemId) {
  const evo = SPECIES[m.species].evo;
  return evo && evo.item === itemId ? evo.into : null;
}

// Applies a healing item. Returns { ok, msg, hpChanged }.
export function applyItem(itemId, m) {
  const it = ITEMS[itemId];
  const n = monName(m);
  if (it.revive) {
    if (m.hp > 0) return { ok: false, msg: "It won't have any effect." };
    m.hp = Math.max(1, Math.floor(m.stats.hp * it.revive));
    m.status = null;
    return { ok: true, msg: `${n} was revived!`, hpChanged: true };
  }
  if (m.hp <= 0) return { ok: false, msg: "It won't have any effect." };
  if (it.heal) {
    if (m.hp >= m.stats.hp) return { ok: false, msg: "It won't have any effect." };
    const before = m.hp;
    m.hp = Math.min(m.stats.hp, m.hp + it.heal);
    return { ok: true, msg: `${n} recovered ${m.hp - before} HP!`, hpChanged: true };
  }
  if (it.cure) {
    if (!m.status || (it.cure !== 'all' && it.cure !== m.status)) return { ok: false, msg: "It won't have any effect." };
    const was = STATUS_INFO[m.status].name;
    m.status = null;
    return { ok: true, msg: `${n} is no longer ${was}!`, statusChanged: true };
  }
  return { ok: false, msg: "It won't have any effect." };
}

// Prism variants are rare recolors with stronger stats.
export const PRISM_CHANCE = 1 / 64;
export const PRISM_BOOST = 1.1;

let uidCounter = Date.now() % 100000;

export function expForLevel(level) {
  return level <= 1 ? 0 : level * level * level;
}

export function calcStats(m) {
  const b = SPECIES[m.species].base;
  const out = {};
  STAT_KEYS.forEach((k, i) => {
    const core = Math.floor(((2 * b[i] + m.iv[i]) * m.level) / 100);
    out[k] = k === 'hp' ? core + m.level + 10 : core + 5;
    if (m.prism) out[k] = Math.floor(out[k] * PRISM_BOOST);
  });
  return out;
}

export function recalc(m) {
  const oldMax = m.stats ? m.stats.hp : null;
  m.stats = calcStats(m);
  if (oldMax != null) m.hp = Math.min(m.stats.hp, Math.max(0, m.hp + (m.stats.hp - oldMax)));
  return m;
}

// The four most recent moves a species knows at this level.
function startingMoves(speciesId, level) {
  const learned = [];
  for (const [lv, id] of SPECIES[speciesId].learn) {
    if (lv <= level && !learned.includes(id)) learned.push(id);
  }
  return learned.slice(-4).map((id) => ({ id, pp: MOVES[id].pp }));
}

export function createMonster(speciesId, level, opts = {}) {
  const m = {
    uid: ++uidCounter,
    species: speciesId,
    level,
    exp: expForLevel(level),
    iv: Array.from({ length: 6 }, () => Math.floor(Math.random() * 16)),
    hp: 0,
    status: null,
    moves: startingMoves(speciesId, level),
    prism: !!opts.prism,
  };
  recalc(m);
  m.hp = m.stats.hp;
  return m;
}

export function monName(m) {
  return m.nick || SPECIES[m.species].name;
}

export function monLabel(m) {
  return (m.prism ? '✨' : '') + monName(m);
}

export function isAlive(m) { return m && m.hp > 0; }

export function healFully(m) {
  recalc(m);
  m.hp = m.stats.hp;
  m.status = null;
  for (const mv of m.moves) mv.pp = MOVES[mv.id].pp;
}

// Moves the species learns exactly at this level.
export function movesAtLevel(speciesId, level) {
  return SPECIES[speciesId].learn.filter(([lv]) => lv === level).map(([, id]) => id);
}

export function expToNext(m) {
  if (m.level >= 100) return 0;
  return expForLevel(m.level + 1) - m.exp;
}

// Fraction of the way from this level to the next (0..1).
export function expProgress(m) {
  if (m.level >= 100) return 1;
  const a = expForLevel(m.level), b = expForLevel(m.level + 1);
  return Math.max(0, Math.min(1, (m.exp - a) / (b - a)));
}

// Restores saved monsters (recomputes derived data).
export function reviveMonster(data) {
  const m = { ...data };
  if (!m.uid) m.uid = ++uidCounter;
  uidCounter = Math.max(uidCounter, m.uid);
  delete m.stats;
  recalc(m);
  m.hp = Math.min(m.hp, m.stats.hp);
  return m;
}

export function serializeMonster(m) {
  const { stats, ...rest } = m;
  return rest;
}
