// The 15 monster types plus "neutral" (basic moves like Tackle that have no element).

export const TYPE_INFO = {
  neutral: { name: 'Basic', color: '#a8a290' },
  fire: { name: 'Fire', color: '#ee7d38' },
  water: { name: 'Water', color: '#4a93e0' },
  grass: { name: 'Grass', color: '#55b448' },
  electric: { name: 'Electric', color: '#e8bc22' },
  ice: { name: 'Ice', color: '#6cc8e6' },
  ground: { name: 'Ground', color: '#bf954f' },
  wind: { name: 'Wind', color: '#58bfae' },
  flying: { name: 'Flying', color: '#8a9ff0' },
  fighting: { name: 'Fighting', color: '#c4443a' },
  psychic: { name: 'Psychic', color: '#ea5896' },
  ghost: { name: 'Ghost', color: '#6d5aa6' },
  poison: { name: 'Poison', color: '#a052c4' },
  metal: { name: 'Metal', color: '#8c98a6' },
  dragon: { name: 'Dragon', color: '#5c4ee0' },
  mythical: { name: 'Mythical', color: '#e58bd8' },
};

// Attacking type -> defending types it is super effective against (2x).
const STRONG = {
  fire: ['grass', 'ice', 'metal'],
  water: ['fire', 'ground'],
  grass: ['water', 'ground'],
  electric: ['water', 'flying'],
  ice: ['grass', 'dragon', 'flying', 'wind'],
  ground: ['fire', 'electric', 'poison', 'metal'],
  wind: ['grass', 'poison'],
  flying: ['grass', 'fighting'],
  fighting: ['metal', 'ice', 'ground'],
  psychic: ['fighting', 'poison'],
  ghost: ['psychic', 'ghost'],
  poison: ['grass', 'mythical'],
  metal: ['ice', 'mythical'],
  dragon: ['dragon'],
  mythical: ['dragon', 'fighting', 'ghost'],
};

// Attacking type -> defending types that resist it (0.5x). There are no immunities.
const WEAK = {
  fire: ['water', 'ground', 'dragon', 'fire'],
  water: ['grass', 'dragon', 'water'],
  grass: ['fire', 'flying', 'poison', 'grass'],
  electric: ['ground', 'grass', 'electric'],
  ice: ['fire', 'metal', 'ice'],
  ground: ['grass', 'flying', 'wind'],
  wind: ['metal', 'ice'],
  flying: ['electric', 'metal'],
  fighting: ['psychic', 'flying', 'ghost', 'poison'],
  psychic: ['metal', 'psychic', 'ghost'],
  ghost: ['mythical', 'metal'],
  poison: ['poison', 'ground', 'ghost', 'metal'],
  metal: ['fire', 'water', 'electric', 'metal'],
  dragon: ['metal', 'mythical'],
  mythical: ['fire', 'poison', 'metal'],
};

export function effectiveness(attackType, defenderTypes) {
  if (attackType === 'neutral') return 1;
  let m = 1;
  for (const t of defenderTypes) {
    if (STRONG[attackType] && STRONG[attackType].includes(t)) m *= 2;
    else if (WEAK[attackType] && WEAK[attackType].includes(t)) m *= 0.5;
  }
  return m;
}

export function typeChip(type) {
  const t = TYPE_INFO[type] || TYPE_INFO.neutral;
  return `<span class="type-chip" style="background:${t.color}">${t.name}</span>`;
}
