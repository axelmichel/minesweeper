import { Cell } from '../types';

// The timeline of a lost game, in seconds from the fatal dig: the TNT flashes for FUSE, blows,
// and the rest goes off in a ring spreading outwards, all of it done within CHAIN_SPAN.
export const FUSE = 0.5;
const CHAIN_START = FUSE + 0.15;
const CHAIN_SPAN = 1.4;
const SECONDS_PER_CELL = 0.08;

export interface Chain {
  /** Detonation time per bomb, keyed "row-col"; the one you hit is at FUSE. */
  delays: Map<string, number>;
  /** When the last one goes off. */
  end: number;
}

export function chainReaction(board: Cell[][], [er, ec]: [number, number]): Chain {
  const bombs: { key: string; d: number }[] = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.isBomb && !(r === er && c === ec)) bombs.push({ key: `${r}-${c}`, d: Math.hypot(r - er, c - ec) });
    }),
  );
  const far = Math.max(1, ...bombs.map((b) => b.d));
  const perCell = Math.min(SECONDS_PER_CELL, CHAIN_SPAN / far);
  const delays = new Map<string, number>([[`${er}-${ec}`, FUSE]]);
  let end = FUSE;
  for (const { key, d } of bombs) {
    const t = CHAIN_START + d * perCell;
    delays.set(key, t);
    end = Math.max(end, t);
  }
  return { delays, end };
}

/** Cells blown into a crater around the blast: a round patch two cells across each way. */
export function inCrater([er, ec]: [number, number], r: number, c: number): boolean {
  return Math.hypot(r - er, c - ec) <= 2;
}
