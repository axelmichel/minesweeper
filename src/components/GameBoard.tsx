import { Cell } from '../types';
import './GameBoard.css';

interface GameBoardProps {
  board: Cell[][];
  onCellClick: (row: number, col: number) => void;
  onCellRightClick: (row: number, col: number) => void;
}

export function GameBoard({ board, onCellClick, onCellRightClick }: GameBoardProps) {
  const handleContextMenu = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    onCellRightClick(row, col);
  };

  return (
    <div className="game-board">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              className={`cell ${cell.state} ${cell.state === 'revealed' && cell.adjacentBombs > 0 ? `number-${cell.adjacentBombs}` : ''}`}
              onClick={() => onCellClick(rowIndex, colIndex)}
              onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
              disabled={cell.state === 'revealed' || cell.state === 'flagged'}
            >
              {cell.state === 'flagged' && '🚩'}
              {cell.state === 'revealed' && cell.isBomb && '💣'}
              {cell.state === 'revealed' && !cell.isBomb && cell.adjacentBombs > 0 && cell.adjacentBombs}
              {cell.state === 'revealed' && !cell.isBomb && cell.adjacentBombs === 0 && ''}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
