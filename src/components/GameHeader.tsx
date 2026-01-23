import './GameHeader.css';

interface GameHeaderProps {
  bombsRemaining: number;
  gameStatus: 'playing' | 'won' | 'lost';
  elapsedTime: number;
  onNewGame: () => void;
}

export function GameHeader({ bombsRemaining, gameStatus, elapsedTime, onNewGame }: GameHeaderProps) {
  const formatTime = (seconds: number): string => {
    return Math.min(999, seconds).toString().padStart(3, '0');
  };

  const formatBombs = (bombs: number): string => {
    return Math.max(0, Math.min(999, bombs)).toString().padStart(3, '0');
  };

  const getFaceEmoji = (): string => {
    if (gameStatus === 'won') return '😎';
    if (gameStatus === 'lost') return '😵';
    return '🙂';
  };

  return (
    <div className="game-header">
      <div className="counter bombs-counter">{formatBombs(bombsRemaining)}</div>
      <button className="face-button" onClick={onNewGame}>
        {getFaceEmoji()}
      </button>
      <div className="counter time-counter">{formatTime(elapsedTime)}</div>
    </div>
  );
}
