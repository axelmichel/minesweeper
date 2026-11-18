import { memo, useMemo } from 'react';
import { Sprite } from '../pixel/Sprite';
import { DANDELION, POPPY, SpriteData, TALL_GRASS } from '../pixel/sprites';
import './Landscape.css';

type Side = 'north' | 'east' | 'south' | 'west';

// The meadow the field lies in: how many cells it reaches past the field on every side (well past
// the edges of the screen, at any turn), and how far out from the field's middle the scenery goes.
const MARGIN = 48;
// How wide the beach is, in cells, along the edge of the meadow.
const SHORE = 2;
const SCENERY = 22;
const SIDES: Side[] = ['north', 'east', 'south', 'west'];

// Seeded, so a board of a given size always gets the same scenery.
function random(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

interface Rect {
  x: number;
  y: number;
  w: number;
  d: number;
}

interface Scenery {
  trees: { x: number; y: number }[];
  ponds: Rect[];
  plants: { x: number; y: number; sprite: SpriteData }[];
}

/** Trees, ponds and plants on the meadow, clear of the field, its path and each other. */
function plan(rows: number, cols: number): Scenery {
  const rand = random(rows * 131 + cols * 17 + 7);
  const reach = Math.hypot(rows, cols) / 2 + SCENERY;
  const cx = cols / 2;
  const cy = rows / 2;
  // Distance out from the field (0 on it), and from the middle of the board.
  const out = (x: number, y: number) => Math.max(-x, x - (cols - 1), -y, y - (rows - 1), 0);
  const far = (x: number, y: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy);

  const spots: [number, number][] = [];
  for (let y = -SCENERY; y < rows + SCENERY; y++) {
    for (let x = -SCENERY; x < cols + SCENERY; x++) if (out(x, y) > 1 && far(x, y) < reach) spots.push([x, y]);
  }
  const shuffled = spots
    .map((s) => ({ s, k: rand() }))
    .sort((a, b) => a.k - b.k)
    .map(({ s }) => s);
  const taken = new Set<string>();
  const take = (x: number, y: number) => taken.add(`${x},${y}`);
  const free = (x: number, y: number, w = 1, d = 1, gap = 0) => {
    for (let j = y - gap; j < y + d + gap; j++) for (let i = x - gap; i < x + w + gap; i++) if (taken.has(`${i},${j}`)) return false;
    return true;
  };

  // A few ponds of different sizes, the first close to the field.
  const ponds: Rect[] = [];
  const sizes = [
    [3, 2],
    [4, 3],
    [2, 3],
    [5, 3],
  ];
  for (const [w, d] of sizes) {
    const near = ponds.length === 0;
    for (const [x, y] of shuffled) {
      const cells = Array.from({ length: w * d }, (_, k) => [x + (k % w), y + Math.floor(k / w)]);
      const fits = cells.every(([i, j]) => out(i, j) >= 2 && (!near || out(i, j) <= 4) && far(i, j) < reach - 2);
      if (fits && free(x, y, w, d, 1)) {
        ponds.push({ x, y, w, d });
        for (let j = -1; j <= d; j++) for (let i = -1; i <= w; i++) take(x + i, y + j);
        break;
      }
    }
  }

  // Trees five cells out or more, so their crowns don't hide the field, spaced out: a light wood
  // round the meadow.
  const trees: { x: number; y: number }[] = [];
  for (const [x, y] of shuffled) {
    if (trees.length >= 28) break;
    if (out(x, y) < 5 || !free(x - 1, y - 1, 3, 3, 2)) continue;
    trees.push({ x, y });
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) take(x + i, y + j);
  }

  // Flowers and tall grass scattered in between.
  const plants: Scenery['plants'] = [];
  const kinds = [POPPY, DANDELION, TALL_GRASS, TALL_GRASS];
  for (const [x, y] of shuffled) {
    if (plants.length >= 110) break;
    if (!free(x, y)) continue;
    plants.push({ x, y, sprite: kinds[Math.floor(rand() * kinds.length)] });
    take(x, y);
  }
  return { trees, ponds, plants };
}

interface BoxProps extends Rect {
  /** Base above the ground and height, in cells. */
  z: number;
  h: number;
  top: string;
  side: string;
}

/** A block of any size: a textured top, and sides hanging down to its base. */
function Box({ x, y, w, d, z, h, top, side }: BoxProps) {
  return (
    <div
      className="lbox"
      style={
        { '--x': x, '--y': y, '--w': w, '--d': d, '--z': z + h, '--bh': h, '--top': top, '--box-side': side } as React.CSSProperties
      }
    >
      {SIDES.map((s) => (
        <span key={s} className={`face ${s}`} />
      ))}
    </div>
  );
}

interface LandscapeProps {
  rows: number;
  cols: number;
}

/**
 * The meadow the field is dug into: ground level with the field's grass, running off every edge
 * of the screen, with its scenery. It turns with the board; its sides shade themselves from --turn
 * in the CSS, so turning doesn't re-render it.
 */
export const Landscape = memo(function Landscape({ rows, cols }: LandscapeProps) {
  const scenery = useMemo(() => plan(rows, cols), [rows, cols]);

  // Four strips of ground around the field. Along each edge of the field, a wall of earth faces
  // in, seen where a pit at the edge looks into the ground: a one-cell rect just outside the
  // edge, its side towards the field hanging down.
  const strips: (Rect & { wall: Side; edge: Rect })[] = [
    { x: -MARGIN, y: -MARGIN, w: cols + 2 * MARGIN, d: MARGIN, wall: 'south', edge: { x: 0, y: -1, w: cols, d: 1 } },
    { x: -MARGIN, y: rows, w: cols + 2 * MARGIN, d: MARGIN, wall: 'north', edge: { x: 0, y: rows, w: cols, d: 1 } },
    { x: -MARGIN, y: 0, w: MARGIN, d: rows, wall: 'east', edge: { x: -1, y: 0, w: 1, d: rows } },
    { x: cols, y: 0, w: MARGIN, d: rows, wall: 'west', edge: { x: cols, y: 0, w: 1, d: rows } },
  ];

  return (
    <div className="landscape" aria-hidden="true">
      {strips.map(({ x, y, w, d, wall, edge }) => (
        <div key={wall} className="strip">
          <div className="ground" style={{ '--x': x, '--y': y, '--w': w, '--d': d } as React.CSSProperties} />
          <div className="ground-edge" style={{ '--x': edge.x, '--y': edge.y, '--w': edge.w, '--d': edge.d } as React.CSSProperties}>
            <span className={`face ${wall} wall`} />
          </div>
        </div>
      ))}
      {/* The meadow is an island: a ring of sand along its edge, and its bank down to the sea. */}
      {[
        { x: -MARGIN, y: -MARGIN, w: cols + 2 * MARGIN, d: SHORE },
        { x: -MARGIN, y: rows + MARGIN - SHORE, w: cols + 2 * MARGIN, d: SHORE },
        { x: -MARGIN, y: -MARGIN + SHORE, w: SHORE, d: rows + 2 * MARGIN - 2 * SHORE },
        { x: cols + MARGIN - SHORE, y: -MARGIN + SHORE, w: SHORE, d: rows + 2 * MARGIN - 2 * SHORE },
      ].map((r, i) => (
        <div key={i} className="shore" style={{ '--x': r.x, '--y': r.y, '--w': r.w, '--d': r.d } as React.CSSProperties} />
      ))}
      <div
        className="ground-edge bank"
        style={{ '--x': -MARGIN, '--y': -MARGIN, '--w': cols + 2 * MARGIN, '--d': rows + 2 * MARGIN } as React.CSSProperties}
      >
        {SIDES.map((side) => (
          <span key={side} className={`face ${side} wall`} />
        ))}
      </div>
      {/* A path round the field, so its edge shows. */}
      {[
        { x: -1, y: -1, w: cols + 2, d: 1 },
        { x: -1, y: rows, w: cols + 2, d: 1 },
        { x: -1, y: 0, w: 1, d: rows },
        { x: cols, y: 0, w: 1, d: rows },
      ].map((r, i) => (
        <div key={i} className="path" style={{ '--x': r.x, '--y': r.y, '--w': r.w, '--d': r.d } as React.CSSProperties} />
      ))}
      {scenery.ponds.map((p) => (
        <div key={`${p.x},${p.y}`} className="pond" style={{ '--x': p.x, '--y': p.y, '--w': p.w, '--d': p.d } as React.CSSProperties} />
      ))}
      {scenery.trees.map(({ x, y }) => (
        <div key={`${x},${y}`} className="tree">
          <Box x={x} y={y} w={1} d={1} z={0} h={1.2} top="var(--tex-log)" side="var(--tex-log)" />
          <Box x={x - 1} y={y - 1} w={3} d={3} z={1.2} h={1.4} top="var(--tex-leaves)" side="var(--tex-leaves)" />
        </div>
      ))}
      {scenery.plants.map(({ x, y, sprite }) => (
        <span key={`${x},${y}`} className="plant" style={{ '--x': x, '--y': y } as React.CSSProperties}>
          <Sprite sprite={sprite} className="plant-sprite" />
        </span>
      ))}
    </div>
  );
});
