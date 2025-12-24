
import { CardType, HazardType, GameCard } from './types';

export const TOTAL_ROUNDS = 5;

export const INITIAL_DECK: GameCard[] = [
  // Treasures
  ...[1, 2, 3, 4, 5, 5, 7, 7, 9, 11, 11, 13, 14, 15, 17].map((v, i) => ({
    id: `treasure-${i}`,
    type: CardType.TREASURE,
    value: v,
    remainder: 0
  })),
  // Hazards - 3 of each
  ...Object.values(HazardType).flatMap((ht, i) => 
    [1, 2, 3].map(j => ({
      id: `hazard-${ht}-${j}`,
      type: CardType.HAZARD,
      hazardType: ht
    }))
  )
];

export const CHARACTER_ABILITIES = [
  { name: "Scout", ability: "Lucky: 10% chance to dodge a fatal hazard." },
  { name: "Greed Lord", ability: "Hoarder: +2 gems when exiting solo." },
  { name: "Protector", ability: "Shield: Banks 10% of current gems if round fails." },
  { name: "Scholar", ability: "Wisdom: Sees the next card type 20% of the time." }
];

export const HAZARD_ICONS: Record<HazardType, string> = {
  [HazardType.SNAKE]: '🐍',
  [HazardType.SPIDER]: '🕷️',
  [HazardType.ROCKFALL]: '🪨',
  [HazardType.FIRE]: '🔥',
  [HazardType.MUMMY]: '🧟'
};

export const HAZARD_NAMES: Record<HazardType, string> = {
  [HazardType.SNAKE]: 'Venomous Snakes',
  [HazardType.SPIDER]: 'Giant Spiders',
  [HazardType.ROCKFALL]: 'Ancient Rockfall',
  [HazardType.FIRE]: 'Eternal Flames',
  [HazardType.MUMMY]: 'Cursed Mummy'
};
