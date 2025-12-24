
export const CardType = {
  TREASURE: 'TREASURE',
  HAZARD: 'HAZARD',
  ARTIFACT: 'ARTIFACT'
} as const;
export type CardType = typeof CardType[keyof typeof CardType];

export const HazardType = {
  SNAKE: 'SNAKE',
  SPIDER: 'SPIDER',
  ROCKFALL: 'ROCKFALL',
  FIRE: 'FIRE',
  MUMMY: 'MUMMY'
} as const;
export type HazardType = typeof HazardType[keyof typeof HazardType];

export interface GameCard {
  id: string;
  type: CardType;
  value?: number;
  hazardType?: HazardType;
  remainder?: number;
  x?: number; // Координата X в сетке
  y?: number; // Координата Y (глубина)
}

export interface Player {
  id: string;
  name: string;
  totalScore: number;
  currentRoundScore: number;
  isInside: boolean;
  isAI: boolean;
  avatar: string;
  ability: string;
}

export const GameState = {
  LOBBY: 'LOBBY',
  EXPEDITION: 'EXPEDITION',
  DECISION_PHASE: 'DECISION_PHASE',
  RESULTS_PHASE: 'RESULTS_PHASE',
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER'
} as const;
export type GameState = typeof GameState[keyof typeof GameState];

export interface RoundInfo {
  number: number;
  revealedCards: GameCard[];
  activeHazards: HazardType[];
}
