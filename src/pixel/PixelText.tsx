import { ReactNode } from 'react';
import { glyph, GLYPH_HEIGHT } from './font';

interface PixelTextProps {
  text: string;
  color?: string;
  /** Drop shadow colour; defaults to the text colour at a quarter brightness, as in Minecraft. */
  shadow?: string | false;
  /** How many pixels the shadow is extruded. */
  depth?: number;
  /** Screen pixels per font pixel; leave out to size the SVG from CSS. */
  scale?: number;
  /** Every glyph five pixels wide, so counters don't jitter. */
  mono?: boolean;
  defs?: ReactNode;
  className?: string;
}

function quarter(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = (shift: number) => Math.floor(((n >> shift) & 255) / 4);
  return `rgb(${c(16)} ${c(8)} ${c(0)})`;
}

export function PixelText({
  text,
  color = '#ffffff',
  shadow,
  depth = 1,
  scale,
  mono = false,
  defs,
  className,
}: PixelTextProps) {
  let x = 0;
  let d = '';
  for (const ch of text.toUpperCase()) {
    const g = glyph(ch, mono);
    g.rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '#') d += `M${x + i} ${y}h1v1h-1z`;
      }
    });
    x += g.width + 1;
  }
  const shadowColor = shadow === false ? null : (shadow ?? (color.startsWith('#') ? quarter(color) : '#000'));
  const extrude = shadowColor ? depth : 0;
  const w = Math.max(1, x - 1) + extrude;
  const h = GLYPH_HEIGHT + extrude;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      width={scale ? w * scale : undefined}
      height={scale ? h * scale : undefined}
      shapeRendering="crispEdges"
      role="img"
      aria-label={text}
    >
      {defs && <defs>{defs}</defs>}
      {shadowColor &&
        Array.from({ length: extrude }, (_, i) => (
          <path key={i} d={d} fill={shadowColor} transform={`translate(${extrude - i} ${extrude - i})`} />
        ))}
      <path d={d} fill={color} />
    </svg>
  );
}
