import { useMemo } from 'react';
import { glyph, GLYPH_HEIGHT } from './font';

// The Minecraft-style logo: each font pixel a stone block, its front textured and bevelled, its
// sides extruded in perspective towards a vanishing point below the middle of the word.

const SUB = 4; // texture pixels per font pixel, along each side
const DEPTH = 0.1; // how far the back face is pulled towards the vanishing point
const STONE = ['#9c9c9c', '#a8a8a8', '#b4b4b4', '#8f8f8f', '#a2a2a2', '#bdbdbd'];
const LIGHT = '#dcdcdc';
const DARK = '#6a6a6a';

// Seeded, so the logo looks the same on every visit.
function random(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

interface Logo3DProps {
  text: string;
  className?: string;
}

export function Logo3D({ text, className }: Logo3DProps) {
  const { width, height, sides, fronts } = useMemo(() => {
    // The lit font pixels, made bold: every stroke two pixels wide, for chunky letters.
    const lit = new Set<string>();
    let x = 0;
    for (const ch of text.toUpperCase()) {
      const g = glyph(ch);
      g.rows.forEach((row, y) =>
        [...row].forEach((c, i) => {
          if (c === '#') {
            lit.add(`${x + i},${y}`);
            lit.add(`${x + i + 1},${y}`);
          }
        }),
      );
      x += g.width + 2;
    }
    const w = x - 1;
    const on = (px: number, py: number) => lit.has(`${px},${py}`);
    const vx = w / 2;
    const vy = GLYPH_HEIGHT + 24;
    const back = (px: number, py: number): [number, number] => [px + (vx - px) * DEPTH, py + (vy - py) * DEPTH];

    // Side faces, one per open edge, shaded by which way they face; drawn far to near.
    const quads: { d: number; points: string; fill: string }[] = [];
    const quad = (a: [number, number], b: [number, number], fill: string) => {
      const pts = [a, b, back(...b), back(...a)];
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      quads.push({ d: -Math.hypot(vx - mx, vy - my), points: pts.map((p) => p.join(',')).join(' '), fill });
    };
    for (const key of lit) {
      const [px, py] = key.split(',').map(Number);
      if (!on(px, py + 1)) quad([px, py + 1], [px + 1, py + 1], '#454545');
      if (!on(px, py - 1)) quad([px, py], [px + 1, py], '#8a8a8a');
      if (!on(px - 1, py)) quad([px, py], [px, py + 1], '#5c5c5c');
      if (!on(px + 1, py)) quad([px + 1, py], [px + 1, py + 1], '#525252');
    }
    quads.sort((a, b) => a.d - b.d);

    // Front faces: stone noise, lit on the top and left edges, shaded on the bottom and right.
    const rand = random(7);
    const paths: Record<string, string> = {};
    const add = (colour: string, sx: number, sy: number) =>
      (paths[colour] = (paths[colour] ?? '') + `M${sx / SUB} ${sy / SUB}h${1 / SUB}v${1 / SUB}h${-1 / SUB}z`);
    for (const key of lit) {
      const [px, py] = key.split(',').map(Number);
      for (let j = 0; j < SUB; j++) {
        for (let i = 0; i < SUB; i++) {
          let colour = STONE[Math.floor(rand() * STONE.length)];
          if ((j === 0 && !on(px, py - 1)) || (i === 0 && !on(px - 1, py))) colour = LIGHT;
          if ((j === SUB - 1 && !on(px, py + 1)) || (i === SUB - 1 && !on(px + 1, py))) colour = DARK;
          add(colour, px * SUB + i, py * SUB + j);
        }
      }
    }

    const corners = [...lit].map((k) => back(...(k.split(',').map(Number) as [number, number])));
    const bottom = Math.max(GLYPH_HEIGHT, ...corners.map(([, by]) => by + 1));
    return { width: w, height: bottom, sides: quads, fronts: paths };
  }, [text]);

  const pad = 0.5;
  return (
    <svg
      className={className}
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      role="img"
      aria-label={text}
    >
      {sides.map((q, i) => (
        <polygon key={i} points={q.points} fill={q.fill} stroke={q.fill} strokeWidth={0.04} />
      ))}
      {Object.entries(fronts).map(([colour, d]) => (
        <path key={colour} d={d} fill={colour} shapeRendering="crispEdges" />
      ))}
    </svg>
  );
}
