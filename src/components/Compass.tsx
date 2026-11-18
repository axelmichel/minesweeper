import { PixelText } from '../pixel/PixelText';
import { Sprite } from '../pixel/Sprite';
import { ARROW_LEFT, ARROW_RIGHT } from '../pixel/sprites';
import './Compass.css';

interface CompassProps {
  /** Turn the island a quarter: -1 anticlockwise, 1 clockwise. */
  onTurn: (direction: -1 | 1) => void;
}

/**
 * Turns the island, and shows which way it faces: the dial turns with the board (CSS variable
 * --turn, animated), its needle and N on the board's north, the N staying upright. As tall as the menu beside it.
 */
export function Compass({ onTurn }: CompassProps) {
  return (
    <div className="compass" role="group" aria-label="Turn the island">
      <button className="mc-button compass-turn" onClick={() => onTurn(-1)} aria-label="Turn left (Q)" title="Turn left (Q)">
        <Sprite sprite={ARROW_LEFT} scale={2} />
      </button>
      <div className="slot compass-dial" aria-hidden="true">
        <div className="compass-rose">
          <span className="compass-needle" />
          {/* Small as it is, the dial only marks north. */}
          <span className="compass-point" style={{ '--angle': '0deg' } as React.CSSProperties}>
            <PixelText text="N" color="#ff5555" scale={1} />
          </span>
        </div>
      </div>
      <button className="mc-button compass-turn" onClick={() => onTurn(1)} aria-label="Turn right (E)" title="Turn right (E)">
        <Sprite sprite={ARROW_RIGHT} scale={2} />
      </button>
    </div>
  );
}
