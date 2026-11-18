import { PixelText } from '../pixel/PixelText';
import { Sprite } from '../pixel/Sprite';
import { CLOCK, CREEPER, CREEPER_BLOWN, DIAMOND } from '../pixel/sprites';
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

  const face = gameStatus === 'won' ? DIAMOND : gameStatus === 'lost' ? CREEPER_BLOWN : CREEPER;

  return (
    <div className="game-header">
      <div className="slot counter" title="TNT left">
        <span className="tnt-icon" aria-hidden="true" />
        <PixelText text={formatBombs(bombsRemaining)} mono scale={3} />
      </div>
      <button className={`mc-button face-button ${gameStatus}`} onClick={onNewGame} aria-label="New game" title="New game">
        <Sprite sprite={face} className="face-sprite" />
      </button>
      <div className="slot counter" title="Time">
        <Sprite sprite={CLOCK} scale={2} />
        <PixelText text={formatTime(elapsedTime)} mono scale={3} />
      </div>
    </div>
  );
}
