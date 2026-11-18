import { Ore } from '../types';

// Pixel-art sprites as character grids: each character is a pixel, looked up in the palette;
// '.' is transparent.
export interface SpriteData {
  grid: string[];
  palette: Record<string, string>;
}

const CREEPER_GRID = [
  'hgGghgGg',
  'gGhgGghG',
  'gkkhgkkg',
  'Gkkggkkh',
  'ghGkkgGg',
  'Ggkkkkhg',
  'hgkkkkgG',
  'gGkhgkGg',
];

export const CREEPER: SpriteData = {
  grid: CREEPER_GRID,
  palette: { g: '#5daa3a', G: '#3f8a2a', h: '#82c95e', k: '#101010' },
};

export const CREEPER_BLOWN: SpriteData = {
  grid: CREEPER_GRID,
  palette: { g: '#e0e0e0', G: '#c4c4c4', h: '#ffffff', k: '#b02a1a' },
};

export const DIAMOND: SpriteData = {
  grid: [
    '..KKKKKK..',
    '.KwwcccCK.',
    'KwccccccCK',
    'KcccccccCK',
    '.KccccCCK.',
    '..KcccCK..',
    '...KcCK...',
    '....KK....',
  ],
  palette: { K: '#0e3f3a', c: '#4aedd9', w: '#e0fffa', C: '#20a596' },
};

export const FLAG: SpriteData = {
  grid: [
    '..pp........',
    '..pPRRRRRr..',
    '..pPRRRRRRr.',
    '..pPRRRRRRRr',
    '..pPRRRRRRr.',
    '..pPrrrrrr..',
    '..pP........',
    '..pP........',
    '..pP........',
    '..pP........',
    '.SssssS.....',
    'SssssssS....',
  ],
  palette: { p: '#4a3420', P: '#8a6a3a', R: '#e0402e', r: '#9c2323', s: '#9a9a9a', S: '#5c5c5c' },
};

function blank(w: number, h: number): string[][] {
  return Array.from({ length: h }, () => Array(w).fill('.'));
}

// A diamond pickaxe: the handle on the diagonal x + y = 11, the head an arc around the top right.
function pickaxeGrid(): string[] {
  const g = blank(12, 12);
  for (let x = 0; x <= 8; x++) g[11 - x][x] = x % 2 ? 'b' : 'B';
  const outer = [[2, 1], [3, 1], [4, 0], [5, 0], [6, 0], [7, 0], [8, 1], [9, 1]];
  const inner = [[4, 1], [5, 1], [6, 1], [7, 1], [8, 2]];
  // Each point mirrored across the handle's line, so the head is symmetric.
  const mirror = ([x, y]: number[]) => [11 - y, 11 - x];
  for (const p of [...outer, ...outer.map(mirror)]) g[p[1]][p[0]] = 'C';
  for (const p of [...inner, ...inner.map(mirror)]) g[p[1]][p[0]] = 'c';
  g[2][9] = 'w';
  return g.map((r) => r.join(''));
}

export const PICKAXE: SpriteData = {
  grid: pickaxeGrid(),
  palette: { b: '#8a6a3a', B: '#5a4020', C: '#1fa595', c: '#6ff5e4', w: '#ffffff' },
};

// The Minecraft clock: a gold ring around the sky above the ground.
function clockGrid(): string[] {
  const g = blank(10, 10);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const d = Math.hypot(x - 4.5, y - 4.5);
      if (d > 4.9) continue;
      if (d > 4.0) g[y][x] = 'K';
      else if (d > 3.1) g[y][x] = x + y > 9 ? 'Y' : 'y';
      else g[y][x] = y <= 4 ? 's' : 'n';
    }
  }
  g[3][3] = g[3][4] = g[2][4] = 'u';
  return g.map((r) => r.join(''));
}

export const CLOCK: SpriteData = {
  grid: clockGrid(),
  palette: { K: '#3a2a08', y: '#f5c542', Y: '#b8861b', s: '#7ec0ff', n: '#3c8527', u: '#fff36b' },
};

/** The sprite with a one-pixel black outline around it, so it stays visible on any ground. */
export function outlined({ grid, palette }: SpriteData): SpriteData {
  const w = grid[0].length + 2;
  const h = grid.length + 2;
  const g = blank(w, h);
  grid.forEach((row, y) => [...row].forEach((c, x) => (g[y + 1][x + 1] = c)));
  const filled = (x: number, y: number) => grid[y - 1]?.[x - 1] !== undefined && grid[y - 1][x - 1] !== '.';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (g[y][x] === '.' && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) {
        g[y][x] = '#';
      }
    }
  }
  return { grid: g.map((r) => r.join('')), palette: { ...palette, '#': '#000000' } };
}

// Coal, raw iron and raw gold share one lump shape, in their own colours.
const LUMP = [
  '..AAA...',
  '.AahaA..',
  'AahaaaA.',
  'AaaaahaA',
  '.AaaaaaA',
  '.AahaaA.',
  '..AaaA..',
  '...AA...',
];

export const COAL: SpriteData = { grid: LUMP, palette: { A: '#101010', a: '#2e2e2e', h: '#6a6a6a' } };
export const RAW_IRON: SpriteData = { grid: LUMP, palette: { A: '#8a6a55', a: '#d8af93', h: '#f6e2d2' } };
export const RAW_GOLD: SpriteData = { grid: LUMP, palette: { A: '#a87a08', a: '#f9d34a', h: '#fff6a8' } };

export const ORE_SPRITES: Record<Ore, SpriteData> = {
  coal: COAL,
  iron: RAW_IRON,
  gold: RAW_GOLD,
  diamond: DIAMOND,
};

// Arrows for the compass buttons: left, and its mirror image.
const ARROW = ['...w...', '..ww...', '.wwwwww', 'wwwwwww', '.wwwwww', '..ww...', '...w...'];

export const ARROW_LEFT: SpriteData = { grid: ARROW, palette: { w: '#ffffff' } };
export const ARROW_RIGHT: SpriteData = {
  grid: ARROW.map((row) => [...row].reverse().join('')),
  palette: { w: '#ffffff' },
};

// Plants for the meadow around the field.
export const POPPY: SpriteData = {
  grid: ['.rr.', 'rRRr', '.rr.', '.g..', '.g..', 'gg..'],
  palette: { r: '#d92b2b', R: '#2a1a0a', g: '#3f7a26' },
};

export const DANDELION: SpriteData = {
  grid: ['.yy.', 'yYYy', '.yy.', '.g..', '..g.', '.gg.'],
  palette: { y: '#f5d22a', Y: '#e09a10', g: '#4a8a2c' },
};

export const TALL_GRASS: SpriteData = {
  grid: ['..g...', 'g.g..g', 'g.gg.g', '.ggggg', '.gGgg.', '..GG..'],
  palette: { g: '#5b9a32', G: '#3f7a26' },
};

// The eye on the show/hide button: open while the HUD shows, shut while it's hidden.
export const EYE_OPEN: SpriteData = {
  grid: ['..KKKKK..', '.KwwwwwK.', 'KwwbbbwwK', 'KwwbKbwwK', 'KwwbbbwwK', '.KwwwwwK.', '..KKKKK..'],
  palette: { K: '#1a1a1a', w: '#ffffff', b: '#3f76e4' },
};

export const EYE_SHUT: SpriteData = {
  grid: ['.........', '.........', '.........', 'KKKKKKKKK', '.K.K.K.K.', '.........', '.........'],
  palette: { K: '#ffffff' },
};
