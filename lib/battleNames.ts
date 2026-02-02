import { IHaikunatorConfig } from '@/models/Game';

const DEFAULT_ADJECTIVES = [
  "Swift", "Bold", "Brave", "Lucky", "Noble",
  "Quick", "Sharp", "Calm", "Eager", "Keen"
];

const DEFAULT_NOUNS = [
  "Player", "Warrior", "Scout", "Champion", "Seeker",
  "Runner", "Hunter", "Ranger", "Pioneer", "Voyager"
];

const BATTLE_ADJECTIVES = [
  "Molting", "Brooding", "Plucked", "Flightless", "Migratory",
  "Territorial", "Peckish", "Hollow", "Grounded", "Soaring"
];

const BATTLE_NOUNS = [
  "Skirmish", "Siege", "Sortie", "Standoff", "Offensive",
  "Ambush", "Retreat", "Stalemate", "Incursion", "Blitz"
];

export function generateName(
  seed: string,
  config?: IHaikunatorConfig | null,
  type: 'player' | 'battle' = 'player'
): string {
  const numericId = parseInt(seed.substring(0, 8), 16) || Math.floor(Math.random() * 100000);
  
  let adjectives: string[];
  let nouns: string[];
  
  if (config && config.adjectives.length > 0 && config.nouns.length > 0) {
    adjectives = config.adjectives;
    nouns = config.nouns;
  } else if (type === 'battle') {
    adjectives = BATTLE_ADJECTIVES;
    nouns = BATTLE_NOUNS;
  } else {
    adjectives = DEFAULT_ADJECTIVES;
    nouns = DEFAULT_NOUNS;
  }
  
  const adjIndex = numericId % adjectives.length;
  const nounIndex = Math.floor(numericId / adjectives.length) % nouns.length;
  const suffix = Math.floor(numericId / (adjectives.length * nouns.length)) % 100;
  
  const adj = adjectives[adjIndex];
  const noun = nouns[nounIndex];
  
  return `${adj}-${noun}-${suffix}`;
}

export function generateBattleName(battleId: string, config?: IHaikunatorConfig | null): string {
  return generateName(battleId, config, 'battle');
}

export function generatePlayerName(seed: string, config?: IHaikunatorConfig | null): string {
  return generateName(seed, config, 'player');
}
