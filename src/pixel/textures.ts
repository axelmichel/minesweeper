import { outlined, FLAG, PICKAXE, SpriteData } from './sprites';

// Block textures drawn at start-up on a canvas and handed to the CSS as custom properties
// (--tex-*, --cursor-*). No image files: the page works from a plain folder.

// A small seeded generator, so the blocks look the same on every visit.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Paint = (x: number, y: number, rand: () => number) => string;

function draw(width: number, height: number, paint: Paint, seed = 1): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const rand = random(seed);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colour = paint(x, y, rand);
      if (colour === 'transparent') continue;
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas.toDataURL();
}

const noise = (palette: string[]): Paint => (_x, _y, rand) => palette[Math.floor(rand() * palette.length)];

const GRASS = ['#5b9a32', '#5b9a32', '#4f8a2b', '#67a83a', '#67a83a', '#75b843', '#466f25', '#5b9a32'];
const DIRT = ['#866043', '#866043', '#79553a', '#966c4a', '#5d4130', '#79553a', '#a77a54'];
const DIRT_DARK = ['#3a2a1e', '#33251a', '#412f22', '#2a1e15', '#3a2a1e', '#33251a'];

function tnt(): Paint {
  // "TNT" in a three- and four-pixel font, on the white band across the middle.
  const letters = ['### #..# ###', '.#. ##.# .#.', '.#. #.## .#.', '.#. #..# .#.', '.#. #..# .#.'];
  return (x, y, rand) => {
    if (y >= 5 && y <= 10) {
      const row = letters[y - 6];
      if (row && row[x - 2] === '#') return '#1e1e1e';
      return rand() < 0.2 ? '#cfcfcf' : '#ececec';
    }
    if (y === 0 || y === 15) return '#5e160c';
    if (x % 4 === 0) return '#a3200f';
    return rand() < 0.25 ? '#c42814' : '#df3a22';
  };
}

// Cobblestone: pixels grouped around a few random centres, each stone its own grey, with dark
// mortar where two stones meet.
function cobblestone(seed: number): Paint {
  const rand = random(seed);
  const greys = ['#8a8a8a', '#7a7a7a', '#9a9a9a', '#6e6e6e', '#858585'];
  const stones = Array.from({ length: 7 }, () => ({
    x: rand() * 16,
    y: rand() * 16,
    grey: greys[Math.floor(rand() * greys.length)],
  }));
  return (x, y, r) => {
    const [a, b] = stones
      .map((s) => ({ s, d: Math.hypot(s.x - x - 0.5, s.y - y - 0.5) }))
      .sort((p, q) => p.d - q.d);
    if (b.d - a.d < 1) return r() < 0.5 ? '#3f3f3f' : '#4a4a4a';
    return r() < 0.2 ? '#a8a8a8' : r() < 0.2 ? '#5e5e5e' : a.s.grey;
  };
}

// A grass block from the side: dirt with a ragged fringe of grass along the top.
function grassSide(): Paint {
  const grass = noise(GRASS);
  const dirt = noise(DIRT);
  return (x, y, rand) => {
    const fringe = y < 3 || (y === 3 && rand() < 0.6) || (y === 4 && rand() < 0.25);
    return fringe ? grass(x, y, rand) : dirt(x, y, rand);
  };
}

// TNT from above: red, with the fuse in a pale square in the middle.
function tntTop(): Paint {
  return (x, y, rand) => {
    if (x >= 7 && x <= 8 && y >= 7 && y <= 8) return '#2a2a2a';
    if (x >= 5 && x <= 10 && y >= 5 && y <= 10) return rand() < 0.3 ? '#a9a9a9' : '#c4c4c4';
    if (x === 0 || y === 0 || x === 15 || y === 15) return '#7a1a0c';
    return rand() < 0.3 ? '#c42814' : '#d8361f';
  };
}

// Oak log from the side: brown bark in vertical streaks.
function logSide(): Paint {
  return (x, _y, rand) => {
    const streak = [0, 3, 7, 10, 13].includes(x) ? 1 : 0;
    const shades = streak ? ['#4f3a20', '#5a4224'] : ['#6b5130', '#735834', '#674d2d'];
    return shades[Math.floor(rand() * shades.length)];
  };
}

// Oak leaves: dark greens with gaps of deeper shade.
function leaves(): Paint {
  return (_x, _y, rand) => {
    const r = rand();
    if (r < 0.14) return '#2c5418';
    return ['#3f7a26', '#4a8a2c', '#386d22', '#55962f'][Math.floor(rand() * 4)];
  };
}

// Water: blues with a few light ripples.
function water(): Paint {
  return (_x, _y, rand) => {
    const r = rand();
    if (r < 0.06) return '#9cc8ff';
    return ['#3d6fd6', '#456fe0', '#3a66c8', '#4a7be8'][Math.floor(rand() * 4)];
  };
}

function spriteUrl({ grid, palette }: SpriteData, scale: number): string {
  return draw(
    grid[0].length * scale,
    grid.length * scale,
    (x, y) => {
      const c = grid[Math.floor(y / scale)][Math.floor(x / scale)];
      return c === '.' ? 'transparent' : palette[c];
    },
  );
}

export function installTextures() {
  const css = document.documentElement.style;
  const url = (u: string) => `url("${u}")`;
  for (let i = 0; i < 3; i++) {
    css.setProperty(`--tex-grass-${i}`, url(draw(16, 16, noise(GRASS), 11 + i)));
    css.setProperty(`--tex-dirt-${i}`, url(draw(16, 16, noise(DIRT), 21 + i)));
  }
  css.setProperty('--tex-rock', url(draw(16, 16, cobblestone(51), 52)));
  css.setProperty('--tex-path', url(draw(16, 16, noise(['#9a7b4f', '#8d6f45', '#a88a5a', '#94764b', '#7f6440']), 64)));
  css.setProperty('--tex-log', url(draw(16, 16, logSide(), 61)));
  css.setProperty('--tex-leaves', url(draw(16, 16, leaves(), 62)));
  css.setProperty('--tex-water', url(draw(16, 16, water(), 63)));
  css.setProperty('--tex-tnt', url(draw(16, 16, tnt(), 31)));
  css.setProperty('--tex-tnt-top', url(draw(16, 16, tntTop(), 32)));
  css.setProperty('--tex-grass-side', url(draw(16, 16, grassSide(), 14)));
  css.setProperty('--tex-background', url(draw(16, 16, noise(DIRT_DARK), 41)));
  css.setProperty('--cursor-dig', `${url(spriteUrl(outlined(PICKAXE), 2))} 6 4`);
  css.setProperty('--cursor-flag', `${url(spriteUrl(outlined(FLAG), 2))} 6 2`);
}
