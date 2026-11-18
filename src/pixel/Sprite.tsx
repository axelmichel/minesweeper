import { SpriteData } from './sprites';

interface SpriteProps {
  sprite: SpriteData;
  /** Screen pixels per sprite pixel; leave out to size the SVG from CSS. */
  scale?: number;
  className?: string;
}

export function Sprite({ sprite, scale, className }: SpriteProps) {
  const { grid, palette } = sprite;
  const paths: Record<string, string> = {};
  grid.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== '.') paths[c] = (paths[c] ?? '') + `M${x} ${y}h1v1h-1z`;
    });
  });
  const w = grid[0].length;
  const h = grid.length;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      width={scale ? w * scale : undefined}
      height={scale ? h * scale : undefined}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {Object.entries(paths).map(([c, d]) => (
        <path key={c} d={d} fill={palette[c]} />
      ))}
    </svg>
  );
}
