import { Cell, GameConfig } from '../types';

export function createBoard(config: GameConfig, excludeRow?: number, excludeCol?: number): Cell[][] {
  const board: Cell[][] = [];
  
  // Initialize empty board
  for (let i = 0; i < config.rows; i++) {
    board[i] = [];
    for (let j = 0; j < config.cols; j++) {
      board[i][j] = {
        isBomb: false,
        adjacentBombs: 0,
        state: 'hidden',
      };
    }
  }
  
  // Place bombs randomly, excluding the first click position
  let bombsPlaced = 0;
  while (bombsPlaced < config.bombs) {
    const row = Math.floor(Math.random() * config.rows);
    const col = Math.floor(Math.random() * config.cols);
    
    // Skip if this is the excluded position (first click)
    if (excludeRow !== undefined && excludeCol !== undefined && row === excludeRow && col === excludeCol) {
      continue;
    }
    
    if (!board[row][col].isBomb) {
      board[row][col].isBomb = true;
      bombsPlaced++;
    }
  }
  
  // Calculate adjacent bombs for each cell
  for (let i = 0; i < config.rows; i++) {
    for (let j = 0; j < config.cols; j++) {
      if (!board[i][j].isBomb) {
        board[i][j].adjacentBombs = countAdjacentBombs(board, i, j, config.rows, config.cols);
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
    board[row][col].isBomb
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
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  revealCellRecursive(newBoard, row, col, rows, cols);
  return newBoard;
}

export function toggleFlag(
  board: Cell[][],
  row: number,
  col: number
): Cell[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  
  if (newBoard[row][col].state === 'hidden') {
    newBoard[row][col].state = 'flagged';
  } else if (newBoard[row][col].state === 'flagged') {
    newBoard[row][col].state = 'hidden';
  }
  
  return newBoard;
}

export function checkWin(board: Cell[][], totalBombs: number): boolean {
  let revealedCount = 0;
  const totalCells = board.length * board[0].length;
  
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j].state === 'revealed') {
        revealedCount++;
      }
    }
  }
  
  return revealedCount === totalCells - totalBombs;
}
