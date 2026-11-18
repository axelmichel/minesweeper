import { useMemo, useRef, useState } from 'react';
import { Cell } from '../types';
import { PixelText } from '../pixel/PixelText';
import { Sprite } from '../pixel/Sprite';
import { FLAG, ORE_SPRITES } from '../pixel/sprites';
import { chainReaction, FUSE, inCrater } from '../utils/explosion';
import { Landscape } from './Landscape';
import './GameBoard.css';

// Minecraft's chat colours, bright enough to read on dirt.
const NUMBER_COLOURS = ['', '#55ffff', '#55ff55', '#ff7a7a', '#ff77ff', '#ffaa00', '#ffff55', '#ffffff', '#aaaaaa'];

const BLAST_COLOURS = ['#5b9a32', '#75b843', '#866043', '#5d4130', '#df3a22', '#ececec', '#3a3a3a'];
const TNT_COLOURS = ['#df3a22', '#a3200f', '#ececec', '#ffaa00'];

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
  colour: string;
}

/** Block fragments flying out of a cell, in cell units. */
function burst(
  out: Particle[],
  [r, c]: [number, number],
  count: number,
  delay: number,
  speed: number,
  colours: string[],
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    out.push({
      x: c + 0.5,
      y: r + 0.5,
      dx: Math.cos(angle) * v,
      dy: Math.sin(angle) * v - speed * 0.5,
      rot: Math.round(Math.random() * 720 - 360),
      delay,
      colour: colours[Math.floor(Math.random() * colours.length)],
    });
  }
}

interface GameBoardProps {
  board: Cell[][];
  tool: 'dig' | 'flag';
  /** Isometric, with blocks standing on an island of earth; otherwise the flat top-down board. */
  view3d: boolean;
  /** How far the island is turned, in degrees (45 is the first view; any angle). */
  turn: number;
  exploded: [number, number] | null;
  onCellClick: (row: number, col: number) => void;
  onCellRightClick: (row: number, col: number) => void;
}

export function GameBoard({ board, tool, view3d, turn, exploded, onCellClick, onCellRightClick }: GameBoardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<[number, number]>([0, 0]);

  const handleContextMenu = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    onCellRightClick(row, col);
  };

  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  // The board may have shrunk since the cell was focused.
  const fr = Math.min(focus[0], rows - 1);
  const fc = Math.min(focus[1], cols - 1);

  // Arrow keys move between cells (one cell in the tab order, the rest reached by arrows),
  // Space and Enter dig through the button's own click, F flags. With the island turned, an arrow
  // moves to the neighbour that lies most nearly that way on screen.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const arrows: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const arrow = arrows[e.key];
    let move: [number, number] | undefined;
    if (arrow) {
      // A few degrees off, so the diagonal views always resolve the same way.
      const t = (((view3d ? turn : 0) - 10) * Math.PI) / 180;
      const steps: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      const score = ([dr, dc]: [number, number]) =>
        (dc * Math.cos(t) - dr * Math.sin(t)) * arrow[0] + (dc * Math.sin(t) + dr * Math.cos(t)) * arrow[1];
      move = steps.reduce((best, step) => (score(step) > score(best) ? step : best));
    }
    if (move) {
      e.preventDefault();
      const r = Math.max(0, Math.min(rows - 1, fr + move[0]));
      const c = Math.max(0, Math.min(cols - 1, fc + move[1]));
      setFocus([r, c]);
      ref.current?.querySelector<HTMLElement>(`[data-pos="${r}-${c}"]`)?.focus();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      onCellRightClick(fr, fc);
    }
  };

  const chain = useMemo(() => (exploded ? chainReaction(board, exploded) : null), [board, exploded]);

  const particles = useMemo(() => {
    if (!exploded || !chain) return [];
    const out: Particle[] = [];
    burst(out, exploded, 36, FUSE, 4, BLAST_COLOURS);
    const others = [...chain.delays].filter(([key]) => key !== `${exploded[0]}-${exploded[1]}`);
    const each = others.length > 40 ? 3 : 5;
    for (const [key, delay] of others) {
      const [r, c] = key.split('-').map(Number);
      burst(out, [r, c], each, delay, 2, TNT_COLOURS);
    }
    return out;
  }, [exploded, chain]);

  // Which cells stand as blocks: everything not dug, plus revealed TNT; the crater is blown flat.
  const blown = (r: number, c: number) =>
    !!exploded && !board[r][c].isBomb && !board[r][c].isRock && inCrater(exploded, r, c);
  const raised = (r: number, c: number) => {
    const cell = board[r]?.[c];
    if (!cell) return false;
    return (cell.state !== 'revealed' || cell.isBomb) && !blown(r, c);
  };

  // The frame takes the size the board is drawn at (a diamond in the isometric view), so the
  // layout around it fits; the board itself keeps its square grid and is turned inside it.
  return (
    <div
      className={`board-frame ${view3d ? 'view-3d' : 'view-flat'}`}
      style={{ '--rows': rows, '--cols': cols, '--diag': Math.hypot(rows, cols) } as React.CSSProperties}
    >
      <div ref={ref} className={`game-board tool-${tool}`} onKeyDown={handleKeyDown}>
        {/* The meadow around the field, level with its grass, with trees, a pond and flowers. */}
        {view3d && <Landscape rows={rows} cols={cols} />}
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((cell, colIndex) => {
              // Three texture variants, scattered so the field doesn't look tiled.
              const variant = (rowIndex * 7 + colIndex * 13 + rowIndex * colIndex) % 3;
              const isExploded = exploded?.[0] === rowIndex && exploded?.[1] === colIndex;
              const delay = chain?.delays.get(`${rowIndex}-${colIndex}`);
              const crater = blown(rowIndex, colIndex);
              const revealed = cell.state === 'revealed';
              const block = raised(rowIndex, colIndex);
              // A block's sides, wherever no block stands against them: all four, since the island
              // turns; the ones facing away are hidden behind the block itself.
              const faces = block
                ? (
                    [
                      ['north', !raised(rowIndex - 1, colIndex)],
                      ['east', !raised(rowIndex, colIndex + 1)],
                      ['south', !raised(rowIndex + 1, colIndex)],
                      ['west', !raised(rowIndex, colIndex - 1)],
                    ] as const
                  ).filter(([, open]) => open)
                : [];
              const number = revealed && !cell.isBomb && cell.adjacentBombs > 0;
              const classes = [
                'cell',
                cell.state,
                `v${variant}`,
                revealed && cell.isBomb ? 'bomb' : '',
                cell.isRock ? 'rock' : '',
                isExploded ? 'exploded' : '',
                delay !== undefined && !isExploded ? 'chain' : '',
                crater ? 'crater' : '',
                crater && !revealed ? 'crater-block' : '',
                block ? 'raised' : '',
              ];
              const style = delay !== undefined ? ({ '--delay': `${delay}s` } as React.CSSProperties) : undefined;
              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  data-pos={`${rowIndex}-${colIndex}`}
                  className={classes.filter(Boolean).join(' ')}
                  style={style}
                  tabIndex={rowIndex === fr && colIndex === fc ? 0 : -1}
                  onFocus={() => setFocus([rowIndex, colIndex])}
                  onClick={() => onCellClick(rowIndex, colIndex)}
                  onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
                  aria-disabled={cell.isRock || (revealed && !number)}
                  aria-label={
                    cell.isRock
                      ? 'Rock'
                      : cell.state === 'flagged'
                        ? 'Flagged'
                        : cell.state === 'hidden'
                          ? 'Hidden'
                          : cell.isBomb
                            ? 'TNT'
                            : number
                              ? String(cell.adjacentBombs)
                              : 'Empty'
                  }
                >
                  {view3d && faces.map(([face]) => <span key={face} className={`face ${face}`} />)}
                  {cell.state === 'flagged' && <Sprite sprite={FLAG} className="cell-flag" />}
                  {revealed && cell.ore && (
                    <Sprite sprite={ORE_SPRITES[cell.ore]} className={`cell-ore ${number ? 'corner' : ''}`} />
                  )}
                  {number && (
                    <PixelText
                      text={String(cell.adjacentBombs)}
                      color={NUMBER_COLOURS[cell.adjacentBombs]}
                      className="cell-number"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
        {particles.length > 0 && (
          <div className="particles" aria-hidden="true">
            {particles.map((p, i) => (
              <span
                key={i}
                className="particle"
                style={
                  {
                    '--x': p.x,
                    '--y': p.y,
                    '--dx': p.dx,
                    '--dy': p.dy,
                    '--rot': `${p.rot}deg`,
                    '--delay': `${p.delay}s`,
                    background: p.colour,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
