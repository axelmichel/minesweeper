import { useState, useEffect, useCallback } from 'react';
import { GameBoard } from './components/GameBoard';
import { GameHeader } from './components/GameHeader';
import { DifficultySelector } from './components/DifficultySelector';
import { createBoard, revealCell, toggleFlag, checkWin } from './utils/gameLogic';
import { Cell, Difficulty, GameConfig, DIFFICULTY_CONFIGS } from './types';
import './App.css';

function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [customConfig, setCustomConfig] = useState<GameConfig>(DIFFICULTY_CONFIGS.custom);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [flagsRemaining, setFlagsRemaining] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [firstClick, setFirstClick] = useState(true);

  const getCurrentConfig = useCallback((): GameConfig => {
    if (difficulty === 'custom') {
      return customConfig;
    }
    return DIFFICULTY_CONFIGS[difficulty];
  }, [difficulty, customConfig]);

  const initializeGame = useCallback(() => {
    const config = getCurrentConfig();
    const newBoard = createBoard(config);
    setBoard(newBoard);
    setGameStatus('playing');
    setFlagsRemaining(config.bombs);
    setStartTime(null);
    setElapsedTime(0);
    setFirstClick(true);
  }, [getCurrentConfig]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    let interval: number | null = null;
    if (gameStatus === 'playing' && startTime !== null) {
      interval = window.setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [gameStatus, startTime]);

  const handleCellClick = (row: number, col: number) => {
    if (gameStatus !== 'playing' || board[row][col].state !== 'hidden') {
      return;
    }

    const config = getCurrentConfig();
    let currentBoard = board;

    // If first click, regenerate board to ensure it's not a bomb
    if (firstClick) {
      currentBoard = createBoard(config, row, col);
      setFirstClick(false);
    }

    if (startTime === null) {
      setStartTime(Date.now());
    }

    const newBoard = revealCell(currentBoard, row, col, config.rows, config.cols);

    // Check if clicked on bomb (shouldn't happen on first click, but safety check)
    if (currentBoard[row][col].isBomb) {
      // Reveal all bombs
      for (let i = 0; i < config.rows; i++) {
        for (let j = 0; j < config.cols; j++) {
          if (newBoard[i][j].isBomb) {
            newBoard[i][j].state = 'revealed';
          }
        }
      }
      setBoard(newBoard);
      setGameStatus('lost');
      return;
    }

    setBoard(newBoard);

    // Check for win
    if (checkWin(newBoard, config.bombs)) {
      setGameStatus('won');
    }
  };

  const handleCellRightClick = (row: number, col: number) => {
    if (gameStatus !== 'playing' || board[row][col].state === 'revealed') {
      return;
    }

    const newBoard = toggleFlag(board, row, col);
    setBoard(newBoard);

    // Update flags remaining
    const config = getCurrentConfig();
    let flagCount = 0;
    for (let i = 0; i < config.rows; i++) {
      for (let j = 0; j < config.cols; j++) {
        if (newBoard[i][j].state === 'flagged') {
          flagCount++;
        }
      }
    }
    setFlagsRemaining(config.bombs - flagCount);
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
  };

  const handleCustomConfigChange = (config: GameConfig) => {
    setCustomConfig(config);
  };

  return (
    <div className="app">
      <h1>Minesweeper</h1>
      <DifficultySelector
        currentDifficulty={difficulty}
        customConfig={customConfig}
        onDifficultyChange={handleDifficultyChange}
        onCustomConfigChange={handleCustomConfigChange}
      />
      <div className="game-container">
        <GameHeader
          bombsRemaining={flagsRemaining}
          gameStatus={gameStatus}
          elapsedTime={elapsedTime}
          onNewGame={initializeGame}
        />
        <GameBoard
          board={board}
          onCellClick={handleCellClick}
          onCellRightClick={handleCellRightClick}
        />
      </div>
      {gameStatus === 'won' && (
        <div className="game-message won">Congratulations! You won! 🎉</div>
      )}
      {gameStatus === 'lost' && (
        <div className="game-message lost">Game Over! Try again! 💣</div>
      )}
    </div>
  );
}

export default App;
