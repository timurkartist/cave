
export enum CardType {
  TREASURE = 'TREASURE',
  HAZARD = 'HAZARD',
  ARTIFACT = 'ARTIFACT'
}

export enum HazardType {
  SNAKE = 'SNAKE',
  SPIDER = 'SPIDER',
  ROCKFALL = 'ROCKFALL',
  FIRE = 'FIRE',
  MUMMY = 'MUMMY'
}

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

export enum GameState {
  LOBBY = 'LOBBY',
  EXPEDITION = 'EXPEDITION',
  DECISION_PHASE = 'DECISION_PHASE',
  ROUND_END = 'ROUND_END',
  GAME_OVER = 'GAME_OVER'
}

export interface RoundInfo {
  number: number;
  revealedCards: GameCard[];
  activeHazards: HazardType[];
}
