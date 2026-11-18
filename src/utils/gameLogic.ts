import { Cell, GameConfig, Ore } from '../types';

// Ore odds per safe cell, rarest last: about one cell in nine holds something.
const ORE_ODDS: [Ore, number][] = [
  ['coal', 0.06],
  ['iron', 0.03],
  ['gold', 0.015],
  ['diamond', 0.006],
];

function rollOre(): Ore | null {
  let r = Math.random();
  for (const [ore, odds] of ORE_ODDS) {
    if (r < odds) return ore;
    r -= odds;
  }
  return null;
}

// Share of the board turned to rock when rocks are on.
const ROCK_SHARE = 0.12;

export function rockCount(rows: number, cols: number): number {
  return Math.floor(rows * cols * ROCK_SHARE);
}

/** Where the rocks go: a fresh layout, kept when the board is rebuilt on the first click. */
export function placeRocks(config: GameConfig): boolean[][] {
  const rocks = Array.from({ length: config.rows }, () => Array<boolean>(config.cols).fill(false));
  const count = rockCount(config.rows, config.cols);
  let placed = 0;
  while (placed < count) {
    const row = Math.floor(Math.random() * config.rows);
    const col = Math.floor(Math.random() * config.cols);
    if (!rocks[row][col]) {
      rocks[row][col] = true;
      placed++;
    }
  }
  return rocks;
}

export function createBoard(
  config: GameConfig,
  excludeRow?: number,
  excludeCol?: number,
  rocks?: boolean[][]
): Cell[][] {
  const board: Cell[][] = [];
  
  // Initialize empty board
  for (let i = 0; i < config.rows; i++) {
    board[i] = [];
    for (let j = 0; j < config.cols; j++) {
      board[i][j] = {
        isBomb: false,
        isRock: rocks?.[i]?.[j] ?? false,
        ore: null,
        adjacentBombs: 0,
        state: 'hidden',
      };
    }
  }

  // Never more bombs than free cells, the first click's cell aside.
  const free = board.flat().filter((c) => !c.isRock).length - 1;
  const bombs = Math.min(config.bombs, free);
  
  // Place bombs randomly, excluding the first click position and the rocks
  let bombsPlaced = 0;
  while (bombsPlaced < bombs) {
    const row = Math.floor(Math.random() * config.rows);
    const col = Math.floor(Math.random() * config.cols);
    
    // Skip if this is the excluded position (first click)
    if (excludeRow !== undefined && excludeCol !== undefined && row === excludeRow && col === excludeCol) {
      continue;
    }
    
    if (!board[row][col].isBomb && !board[row][col].isRock) {
      board[row][col].isBomb = true;
      bombsPlaced++;
    }
  }
  
  // Calculate adjacent bombs for each cell, and hide some ore in the safe ones
  for (let i = 0; i < config.rows; i++) {
    for (let j = 0; j < config.cols; j++) {
      if (!board[i][j].isBomb) {
        board[i][j].adjacentBombs = countAdjacentBombs(board, i, j, config.rows, config.cols);
        if (!board[i][j].isRock) board[i][j].ore = rollOre();
      }
    }
  }
  
  return board;
}

function countAdjacentBombs(
  board: Cell[][],
  row: number,
  col: number,
  maxRows: number,
  maxCols: number
): number {
  let count = 0;
  
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      
      const newRow = row + i;
      const newCol = col + j;
      
      if (
        newRow >= 0 &&
        newRow < maxRows &&
        newCol >= 0 &&
        newCol < maxCols &&
        board[newRow][newCol].isBomb
      ) {
        count++;
      }
    }
  }
  
  return count;
}

function revealCellRecursive(
  board: Cell[][],
  row: number,
  col: number,
  rows: number,
  cols: number
): void {
  if (
    row < 0 ||
    row >= rows ||
    col < 0 ||
    col >= cols ||
    board[row][col].state !== 'hidden' ||
    board[row][col].isBomb ||
    board[row][col].isRock
  ) {
    return;
  }
  
  board[row][col].state = 'revealed';
  
  // If cell has no adjacent bombs, reveal adjacent cells recursively
  if (board[row][col].adjacentBombs === 0) {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        revealCellRecursive(board, row + i, col + j, rows, cols);
      }
    }
  }
}

export function revealCell(
  board: Cell[][],
  row: number,
  col: number,
  rows: number,
  cols: number
): Cell[][] {
  return revealCells(board, [[row, col]], rows, cols);
}

/** Digs several cells at once (a chord), with one copy of the board. */
export function revealCells(
  board: Cell[][],
  cells: [number, number][],
  rows: number,
  cols: number
): Cell[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  for (const [row, col] of cells) revealCellRecursive(newBoard, row, col, rows, cols);
  return newBoard;
}

function neighbours(board: Cell[][], row: number, col: number): [number, number][] {
  const result: [number, number][] = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if ((i || j) && board[row + i]?.[col + j]) result.push([row + i, col + j]);
    }
  }
  return result;
}

/**
 * Chording: on a dug number with exactly that many flags around it, the other covered
 * neighbours to dig. Empty when the cell isn't a number or the flags don't add up.
 */
export function chordTargets(board: Cell[][], row: number, col: number): [number, number][] {
  const cell = board[row][col];
  if (cell.state !== 'revealed' || cell.isBomb || cell.adjacentBombs === 0) return [];
  const around = neighbours(board, row, col);
  const flags = around.filter(([r, c]) => board[r][c].state === 'flagged').length;
  if (flags !== cell.adjacentBombs) return [];
  return around.filter(([r, c]) => board[r][c].state === 'hidden' && !board[r][c].isRock);
}

export function toggleFlag(
  board: Cell[][],
  row: number,
  col: number
): Cell[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  
  if (newBoard[row][col].isRock) {
    return newBoard;
  }

  if (newBoard[row][col].state === 'hidden') {
    newBoard[row][col].state = 'flagged';
  } else if (newBoard[row][col].state === 'flagged') {
    newBoard[row][col].state = 'hidden';
  }
  
  return newBoard;
}

export function checkWin(board: Cell[][]): boolean {
  // Won when every cell that is neither TNT nor rock has been dug.
  return board.every((row) => row.every((c) => c.isBomb || c.isRock || c.state === 'revealed'));
}
