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
  orb: { name: 'Capture Orb', icon: '🔵', desc: 'Throw it at a weakened wild monster to catch it.', battle: true, catch: 1 },
  potion: { name: 'Potion', icon: '🧪', desc: 'Restores 20 HP to one monster.', battle: true, field: true, heal: 20 },
};

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
