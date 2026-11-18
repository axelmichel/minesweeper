export type CellState = 'hidden' | 'revealed' | 'flagged';

/** Loot found in a dug cell, purely for show. */
export type Ore = 'coal' | 'iron' | 'gold' | 'diamond';

export interface Cell {
  isBomb: boolean;
  /** A stone block: never dug, never flagged, never hides TNT. */
  isRock: boolean;
  ore: Ore | null;
  adjacentBombs: number;
  state: CellState;
}

export interface GameConfig {
  rows: number;
  cols: number;
  bombs: number;
}

export type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'custom';

export interface GameState {
  board: Cell[][];
  gameStatus: 'playing' | 'won' | 'lost';
  flagsRemaining: number;
  startTime: number | null;
  endTime: number | null;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, GameConfig> = {
  beginner: { rows: 9, cols: 9, bombs: 10 },
  intermediate: { rows: 16, cols: 16, bombs: 40 },
  expert: { rows: 22, cols: 22, bombs: 99 },
  custom: { rows: 9, cols: 9, bombs: 10 },
};
