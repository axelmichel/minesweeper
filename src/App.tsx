import { useState, useEffect, useCallback, useRef } from 'react';
import { GameBoard } from './components/GameBoard';
import { GameHeader } from './components/GameHeader';
import { DifficultySelector } from './components/DifficultySelector';
import { Hotbar, Tool } from './components/Hotbar';
import { Inventory, ORES } from './components/Inventory';
import { Compass } from './components/Compass';
import {
  createBoard,
  revealCells,
  toggleFlag,
  checkWin,
  chordTargets,
  placeRocks,
  rockCount,
} from './utils/gameLogic';
import { chainReaction, FUSE } from './utils/explosion';
import { sound, setSoundEnabled } from './sound';
import { Cell, Difficulty, GameConfig, Ore, DIFFICULTY_CONFIGS } from './types';
import { PixelText } from './pixel/PixelText';
import { Logo3D } from './pixel/Logo3D';
import { Sprite } from './pixel/Sprite';
import { DIAMOND, EYE_OPEN, EYE_SHUT, FLAG, ORE_SPRITES, PICKAXE } from './pixel/sprites';
import './App.css';

const SPLASHES = [
  'Now with TNT!',
  "Don't dig straight down!",
  'Creeper approved!',
  '100% offline!',
  'Also try Solitaire!',
  'Watch your step!',
  'Diamonds!',
  'Now in 3D!',
  'Also try Lights Off!',
  'Made on a weekend!',
  'Flag responsibly!',
  'Chord like a pro!',
  'No creepers were harmed!',
  'Bring a pickaxe!',
  'Ssssss...',
  'Pixel perfect!',
];

// The how-to on the title screen: an icon, a headline and a line of detail each.
const HOW_TO = [
  { sprite: PICKAXE, title: 'Dig the grass', detail: 'Numbers count the TNT around' },
  { sprite: FLAG, title: 'Flag the TNT', detail: 'Right click, or slot 2 on touch' },
  { sprite: DIAMOND, title: 'Collect ore', detail: 'Coal, iron, gold, diamonds' },
];

// The controls, on the title screen: what to press, and what it does.
const CONTROLS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Mouse',
    rows: [
      ['Left click', 'dig'],
      ['Right click', 'flag'],
      ['Click a number', 'chord'],
      ['Drag', 'turn the field'],
      ['Wheel', 'zoom'],
      ['Shift drag', 'move around'],
    ],
  },
  {
    title: 'Keys',
    rows: [
      ['Arrows', 'pick a cell'],
      ['Space', 'dig'],
      ['F', 'flag'],
      ['Q E', 'turn'],
      ['+ - 0', 'zoom'],
      ['H', 'hide controls'],
    ],
  },
  {
    title: 'Touch',
    rows: [
      ['Tap', 'dig'],
      ['Flag slot', 'then tap to flag'],
      ['Tap a number', 'chord'],
      ['Swipe sideways', 'turn (3D)'],
    ],
  },
];

// Turning the island: degrees per press of a turn button or Q/E, degrees per pixel dragged, and
// how far a press must move before it counts as a drag rather than a click.
const TURN_STEP = 15;
const DEGREES_PER_PIXEL = 0.4;
const DRAG_THRESHOLD = 6;

// Zooming: 1 is the whole field in view (the default), up to MAX_ZOOM times closer; a button or
// key press zooms by ZOOM_STEP.
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.4;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// The ore banked from won games, kept in the browser across visits.
const STASH_KEY = 'minesweeper.ores';
const NO_ORE: Record<Ore, number> = { coal: 0, iron: 0, gold: 0, diamond: 0 };

function loadStash(): Record<Ore, number> {
  try {
    const saved = JSON.parse(localStorage.getItem(STASH_KEY) ?? '{}');
    return Object.fromEntries(ORES.map((ore) => [ore, Number(saved[ore]) || 0])) as Record<Ore, number>;
  } catch {
    return { ...NO_ORE };
  }
}

// Settings are kept in the browser; storage may be unavailable (private mode), so guard it.
function loadSetting(key: string, fallback: boolean): boolean {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === 'on';
  } catch {
    return fallback;
  }
}

function saveSetting(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? 'on' : 'off');
  } catch {
    // Not remembered, still applied.
  }
}

const ROCKS_KEY = 'minesweeper.rocks';
const SOUND_KEY = 'minesweeper.sound';
const VIEW_KEY = 'minesweeper.3d';

// On a phone held upright, a wide board is turned upright so it fits the width, and Hard, square
// elsewhere, is played tall instead: 22 columns would be too narrow to tap. Same TNT, about the
// same number of cells. Decided when a game starts: turning the phone mid-game keeps the board.
const PORTRAIT = '(max-width: 700px) and (orientation: portrait)';
const PHONE_HARD: GameConfig = { rows: 30, cols: 16, bombs: 99 };

function oreCounts(board: Cell[][]): Record<Ore, number> {
  const counts: Record<Ore, number> = { coal: 0, iron: 0, gold: 0, diamond: 0 };
  for (const cell of board.flat()) {
    if (cell.state === 'revealed' && cell.ore) counts[cell.ore]++;
  }
  return counts;
}

function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [customConfig, setCustomConfig] = useState<GameConfig>(DIFFICULTY_CONFIGS.custom);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DIFFICULTY_CONFIGS.beginner);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [flagsRemaining, setFlagsRemaining] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [firstClick, setFirstClick] = useState(true);
  const [tool, setTool] = useState<Tool>('dig');
  const [exploded, setExploded] = useState<[number, number] | null>(null);
  const [deathDelay, setDeathDelay] = useState(0);
  const [spectating, setSpectating] = useState(false);
  // Ore from won games: kept for good. This game's ore only joins it when the game is won; dying
  // (or starting over) drops it, as in Minecraft.
  const [stash, setStash] = useState(loadStash);
  useEffect(() => {
    try {
      localStorage.setItem(STASH_KEY, JSON.stringify(stash));
    } catch {
      // Not remembered, still counted.
    }
  }, [stash]);
  const [rocksOn, setRocksOn] = useState(() => loadSetting(ROCKS_KEY, false));
  const [soundOn, setSoundOn] = useState(() => loadSetting(SOUND_KEY, true));
  // Isometric by default, except on a phone, where the diamond of a big board is too wide.
  // The island's turn in degrees, any angle: 45 is the first view. The buttons and Q/E turn it in
  // steps (held down, the key repeats), dragging turns it freely. Never wrapped, so the animation
  // always goes the short way.
  const [turn, setTurn] = useState(45);
  // Everything over the field hidden, to look at it on its own (H, or the eye button).
  const [hudHidden, setHudHidden] = useState(false);
  const [dragging, setDragging] = useState(false);
  const turnIsland = useCallback((direction: -1 | 1) => {
    setTurn((t) => t + direction * TURN_STEP);
  }, []);
  // Zoom and pan: the field drawn `zoom` times bigger, moved by `pan` pixels from the middle of the
  // screen. Kept in a ref too, for the wheel handler and drags, which read it between renders.
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  // Zoom to `zoom`, keeping the point `at` (pixels from the middle of the screen) where it is.
  // The pan is held so the field's middle can't leave the screen.
  const zoomTo = useCallback((zoom: number, at: [number, number] = [0, 0]) => {
    const { zoom: z1, x, y } = viewRef.current;
    const z = clamp(zoom, 1, MAX_ZOOM);
    const limitX = ((z - 1) * window.innerWidth) / 2;
    const limitY = ((z - 1) * window.innerHeight) / 2;
    setView({
      zoom: z,
      x: clamp(at[0] - ((at[0] - x) * z) / z1, -limitX, limitX),
      y: clamp(at[1] - ((at[1] - y) * z) / z1, -limitY, limitY),
    });
  }, []);
  const drag = useRef<{
    mode: 'turn' | 'pan';
    x: number;
    y: number;
    turn: number;
    pan: [number, number];
    moved: boolean;
  } | null>(null);

  // Dragging over the field or the meadow turns it (3D), or with Shift, or in 2D, moves it while
  // zoomed in. A press that hardly moves is a click and digs as usual; after a real drag, the click
  // that ends it is swallowed.
  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest('.hud, .info, .menu, .navigation, .hud-toggle, input')) return;
    const mode = view3d && !e.shiftKey ? 'turn' : 'pan';
    if (mode === 'pan' && viewRef.current.zoom === 1) return;
    const { x, y } = viewRef.current;
    drag.current = { mode, x: e.clientX, y: e.clientY, turn, pan: [x, y], moved: false };
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, d.mode === 'pan' ? dy : 0) < DRAG_THRESHOLD) return;
      if (!d.moved) {
        d.moved = true;
        setDragging(true);
      }
      if (d.mode === 'turn') setTurn(d.turn + dx * DEGREES_PER_PIXEL);
      else {
        const { zoom } = viewRef.current;
        const limitX = ((zoom - 1) * window.innerWidth) / 2;
        const limitY = ((zoom - 1) * window.innerHeight) / 2;
        setView({ zoom, x: clamp(d.pan[0] + dx, -limitX, limitX), y: clamp(d.pan[1] + dy, -limitY, limitY) });
      }
    };
    const end = () => {
      if (!drag.current?.moved) {
        drag.current = null;
        return;
      }
      setDragging(false);
      // The click that follows (if the drag ended over something) comes in this same task; clear
      // the drag after it, so a drag ending elsewhere doesn't swallow the next real click.
      setTimeout(() => (drag.current = null), 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);
  // The wheel (and a trackpad pinch, which comes as a wheel with Ctrl) zooms towards the pointer.
  // Wide layout only: on a phone the page scrolls, and pinching zooms the page itself.
  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      if (window.innerWidth < 800) return;
      if (e.target instanceof Element && e.target.closest('.hud, .info, .menu, .navigation, .title-screen, .death, .victory')) return;
      e.preventDefault();
      const speed = e.ctrlKey ? 0.01 : 0.002;
      const { zoom } = viewRef.current;
      zoomTo(zoom * Math.exp(-e.deltaY * speed), [e.clientX - window.innerWidth / 2, e.clientY - window.innerHeight / 2]);
    };
    window.addEventListener('wheel', wheel, { passive: false });
    return () => window.removeEventListener('wheel', wheel);
  }, [zoomTo]);

  const swallowDragClick = (e: React.MouseEvent) => {
    if (drag.current?.moved) {
      e.stopPropagation();
      e.preventDefault();
    }
    drag.current = null;
  };
  const [view3d, setView3d] = useState(() => loadSetting(VIEW_KEY, window.innerWidth >= 700));
  const [rocks, setRocks] = useState<boolean[][] | undefined>(undefined);
  const [titleScreen, setTitleScreen] = useState<'shown' | 'leaving' | 'gone'>('shown');
  const [splash] = useState(() => SPLASHES[Math.floor(Math.random() * SPLASHES.length)]);

  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  const getCurrentConfig = useCallback((): GameConfig => {
    if (difficulty === 'custom') {
      // The inputs can hold anything while typing; the game gets a board that can be built.
      const rows = clamp(customConfig.rows, 5, 30);
      const cols = clamp(customConfig.cols, 5, 50);
      const free = rows * cols - (rocksOn ? rockCount(rows, cols) : 0);
      return { rows, cols, bombs: clamp(customConfig.bombs, 1, free - 1) };
    }
    return DIFFICULTY_CONFIGS[difficulty];
  }, [difficulty, customConfig, rocksOn]);

  const initializeGame = useCallback(() => {
    let config = getCurrentConfig();
    if (window.matchMedia(PORTRAIT).matches) {
      if (difficulty === 'expert') config = PHONE_HARD;
      else if (config.cols > config.rows) config = { ...config, rows: config.cols, cols: config.rows };
    }
    const layout = rocksOn ? placeRocks(config) : undefined;
    setGameConfig(config);
    setRocks(layout);
    setBoard(createBoard(config, undefined, undefined, layout));
    setGameStatus('playing');
    setFlagsRemaining(config.bombs);
    setStartTime(null);
    setElapsedTime(0);
    setFirstClick(true);
    setExploded(null);
    setSpectating(false);
    setView({ zoom: 1, x: 0, y: 0 });
  }, [getCurrentConfig, rocksOn, difficulty]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    let interval: number | null = null;
    if (gameStatus === 'playing' && startTime !== null) {
      interval = window.setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [gameStatus, startTime]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'h' || e.key === 'H') setHudHidden((h) => !h);
      else if (e.key === '+' || e.key === '=') zoomTo(viewRef.current.zoom * ZOOM_STEP);
      else if (e.key === '-' || e.key === '_') zoomTo(viewRef.current.zoom / ZOOM_STEP);
      else if (e.key === '0') zoomTo(1);
      else if (e.key === 'q' || e.key === 'Q') turnIsland(-1);
      else if (e.key === 'e' || e.key === 'E') turnIsland(1);
      // On the board, F flags the selected cell (see GameBoard); elsewhere it switches the tool.
      if (e.target instanceof Element && e.target.closest('.game-board')) return;
      if (e.key === '1') setTool('dig');
      else if (e.key === '2') setTool('flag');
      else if (e.key === 'f' || e.key === 'F') setTool((t) => (t === 'dig' ? 'flag' : 'dig'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turnIsland, zoomTo]);

  const handleCellRightClick = (row: number, col: number) => {
    const cell = board[row]?.[col];
    if (gameStatus !== 'playing' || !cell || cell.state === 'revealed' || cell.isRock) {
      return;
    }

    if (cell.state === 'hidden') sound.flag();
    else sound.unflag();
    const newBoard = toggleFlag(board, row, col);
    setBoard(newBoard);
    const flags = newBoard.flat().filter((c) => c.state === 'flagged').length;
    setFlagsRemaining(gameConfig.bombs - flags);
  };

  const lose = (newBoard: Cell[][], hit: [number, number]) => {
    for (const cell of newBoard.flat()) {
      if (cell.isBomb) cell.state = 'revealed';
    }
    setBoard(newBoard);
    setExploded(hit);
    setGameStatus('lost');

    // The sound follows the animation: the fuse, the blast, then a dozen booms spread over the
    // chain reaction (one per bomb would be a wall of noise on Hard).
    const { delays, end } = chainReaction(newBoard, hit);
    sound.explode(FUSE);
    const chain = [...delays.values()].filter((t) => t > FUSE).sort((a, b) => a - b);
    const step = Math.max(1, Math.ceil(chain.length / 12));
    chain.filter((_, i) => i % step === 0).forEach((t) => sound.boom(t));
    setDeathDelay(end + 0.7);
  };

  /** Digs the given cells of `base`: loses on TNT, collects ore, and checks for the win. */
  const dig = (base: Cell[][], cells: [number, number][]) => {
    const newBoard = revealCells(base, cells, gameConfig.rows, gameConfig.cols);

    const hit = cells.find(([r, c]) => base[r][c].isBomb);
    if (hit) {
      lose(newBoard, hit);
      return;
    }

    sound.dig();
    const before = oreCounts(base);
    const after = oreCounts(newBoard);
    const found = ORES.reduce((n, ore) => n + after[ore] - before[ore], 0);
    for (let i = 0; i < Math.min(found, 3); i++) sound.pickup(0.08 + i * 0.07);

    // Check for win: flag the TNT that's left, and stop the clock on the exact time.
    if (checkWin(newBoard)) {
      for (const cell of newBoard.flat()) {
        if (cell.isBomb) cell.state = 'flagged';
      }
      setFlagsRemaining(0);
      setElapsedTime(Math.floor((Date.now() - (startTime ?? Date.now())) / 1000));
      setGameStatus('won');
      const found = oreCounts(newBoard);
      setStash((s) => Object.fromEntries(ORES.map((ore) => [ore, s[ore] + found[ore]])) as Record<Ore, number>);
      sound.win();
    }

    setBoard(newBoard);
  };

  const handleCellClick = (row: number, col: number) => {
    const cell = board[row]?.[col];
    if (gameStatus !== 'playing' || !cell || cell.isRock) {
      return;
    }

    // Chording, with either tool: a number with its flags complete digs the rest around it.
    if (cell.state === 'revealed') {
      const targets = chordTargets(board, row, col);
      if (targets.length) dig(board, targets);
      return;
    }

    if (tool === 'flag') {
      handleCellRightClick(row, col);
      return;
    }
    if (cell.state !== 'hidden') {
      return;
    }

    let currentBoard = board;

    // If first click, regenerate board to ensure it's not a bomb
    if (firstClick) {
      currentBoard = createBoard(gameConfig, row, col, rocks);
      setFirstClick(false);
    }

    if (startTime === null) {
      setStartTime(Date.now());
    }

    dig(currentBoard, [[row, col]]);
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    sound.click();
    setDifficulty(newDifficulty);
  };

  const handleCustomConfigChange = (config: GameConfig) => {
    setCustomConfig(config);
  };

  // Play on the title screen: it flies off, then goes, and the board takes the keyboard focus.
  const closeTitle = () => {
    setTitleScreen('gone');
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.cell[tabindex="0"]')?.focus());
  };
  const play = () => {
    sound.click();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) closeTitle();
    else setTitleScreen('leaving');
  };

  const newGame = () => {
    sound.click();
    initializeGame();
  };

  const score = board.flat().filter((c) => c.state === 'revealed' && !c.isBomb).length;
  // This game's ore, and the inventory: the stash plus what's being dug in a game still going (once
  // won it's in the stash; once lost it's dropped).
  const ores = oreCounts(board);
  const haul = ORES.filter((ore) => ores[ore] > 0);
  const inventory = Object.fromEntries(
    ORES.map((ore) => [ore, stash[ore] + (gameStatus === 'playing' ? ores[ore] : 0)]),
  ) as Record<Ore, number>;

  return (
    <div
      className={`app ${view3d ? '' : 'flat'} ${dragging ? 'dragging' : ''} ${hudHidden || titleScreen === 'shown' ? 'hud-hidden' : ''} ${titleScreen === 'shown' ? 'at-title' : ''}`}
      style={
        {
          '--turn': `${turn}deg`,
          '--zoom': view.zoom,
          '--pan-x': `${view.x}px`,
          '--pan-y': `${view.y}px`,
        } as React.CSSProperties
      }
      onPointerDown={startDrag}
      onClickCapture={swallowDragClick}
    >
      {/* Top left: the state of the game. */}
      <div className="hud">
        <GameHeader
          bombsRemaining={flagsRemaining}
          gameStatus={gameStatus}
          elapsedTime={elapsedTime}
          onNewGame={newGame}
        />
        <Inventory counts={inventory} />
      </div>

      {/* Top right: the tool in hand, and how to play. */}
      <div className="info">
        <Hotbar tool={tool} onToolChange={setTool} />
        <div className="hints">
          <PixelText text="Left click: dig" scale={2} />
          <PixelText text="Right click: flag" scale={2} />
          <PixelText text="Click a number: chord" scale={2} />
          <PixelText text="Keys: arrows space F" scale={2} />
          {view3d && <PixelText text="Drag or Q E: turn the field" scale={2} />}
          <PixelText text="Wheel or + -: zoom" scale={2} />
          <PixelText text={view3d ? 'Shift drag: move' : 'Drag: move when zoomed'} scale={2} />
          <PixelText text="H: hide all this" scale={2} />
        </div>
      </div>

      {/* The island, floating in the middle. */}
      <main className={`stage ${gameStatus === 'lost' ? 'shake' : ''}`}>
        <div className="board-scroll">
          <GameBoard
            board={board}
            tool={tool}
            view3d={view3d}
            turn={turn}
            exploded={exploded}
            onCellClick={handleCellClick}
            onCellRightClick={handleCellRightClick}
          />
        </div>
      </main>

      {/* Bottom left: zoom, and turn the field (isometric view only). */}
      <div className="navigation">
        <div className="zoom" role="group" aria-label="Zoom">
          <button
            className="mc-button"
            onClick={() => zoomTo(view.zoom / ZOOM_STEP)}
            disabled={view.zoom <= 1}
            aria-label="Zoom out (-)"
            title="Zoom out (-)"
          >
            <PixelText text="-" scale={3} />
          </button>
          <button
            className="mc-button"
            onClick={() => zoomTo(view.zoom * ZOOM_STEP)}
            disabled={view.zoom >= MAX_ZOOM}
            aria-label="Zoom in (+)"
            title="Zoom in (+)"
          >
            <PixelText text="+" scale={3} />
          </button>
        </div>
        {view3d && <Compass onTurn={turnIsland} />}
      </div>

      {/* Bottom centre: the menu, in one line. */}
      <nav className="menu" aria-label="Game menu">
        <DifficultySelector
          currentDifficulty={difficulty}
          customConfig={customConfig}
          onDifficultyChange={handleDifficultyChange}
          onCustomConfigChange={handleCustomConfigChange}
        />
        <div className="toggles">
          <button
            className={`mc-button ${rocksOn ? 'active' : ''}`}
            aria-pressed={rocksOn}
            title="Stone blocks that can't be dug and never hide TNT"
            onClick={() => {
              sound.click();
              saveSetting(ROCKS_KEY, !rocksOn);
              setRocksOn(!rocksOn);
            }}
          >
            <PixelText text={`Rocks: ${rocksOn ? 'On' : 'Off'}`} color={rocksOn ? '#ffff55' : '#ffffff'} scale={2} />
          </button>
          <button
            className={`mc-button ${soundOn ? 'active' : ''}`}
            aria-pressed={soundOn}
            onClick={() => {
              saveSetting(SOUND_KEY, !soundOn);
              setSoundEnabled(!soundOn);
              setSoundOn(!soundOn);
              sound.click();
            }}
          >
            <PixelText text={`Sound: ${soundOn ? 'On' : 'Off'}`} color={soundOn ? '#ffff55' : '#ffffff'} scale={2} />
          </button>
          <button
            className={`mc-button ${view3d ? 'active' : ''}`}
            aria-pressed={view3d}
            title="Isometric blocks on an island of earth, or the flat board from above"
            onClick={() => {
              sound.click();
              saveSetting(VIEW_KEY, !view3d);
              setView3d(!view3d);
            }}
          >
            <PixelText text={`View: ${view3d ? '3D' : '2D'}`} color={view3d ? '#ffff55' : '#ffffff'} scale={2} />
          </button>
        </div>
      </nav>

      {titleScreen !== 'gone' && (
        <section
          className={`title-screen ${titleScreen}`}
          aria-label="Title screen"
          onAnimationEnd={(e) => {
            if (e.animationName === 'title-out') closeTitle();
          }}
        >
          <header className="title">
            <Logo3D text="Minesweeper" className="title-logo" />
            <span className="splash-wrap" style={{ '--chars': splash.length } as React.CSSProperties}>
              <PixelText text={splash} color="#ffff55" className="splash" />
            </span>
          </header>
          <PixelText text="Classic Minesweeper, dug out of a blocky world" color="#e0e0e0" className="tagline" />
          <button className="mc-button wide" onClick={play} autoFocus disabled={titleScreen === 'leaving'}>
            <PixelText text="Play" scale={2} />
          </button>
          <ul className="how-to" aria-label="How to play">
            {HOW_TO.map(({ sprite, title, detail }) => (
              <li key={title}>
                <Sprite sprite={sprite} className="how-to-icon" />
                <PixelText text={title} color="#ffffff" scale={2} />
                <PixelText text={detail} color="#c8c8c8" className="how-to-detail" />
              </li>
            ))}
          </ul>
          <div className="controls" aria-label="Controls">
            {CONTROLS.map(({ title, rows }) => (
              <dl key={title} className={title.toLowerCase()}>
                <PixelText text={title} color="#ffff55" scale={2} className="controls-title" />
                {rows.map(([input, action]) => (
                  <div key={input} className="controls-row">
                    <dt>
                      <PixelText text={input} color="#ffffff" className="controls-text" />
                    </dt>
                    <dd>
                      <PixelText text={action} color="#bdbdbd" className="controls-text" />
                    </dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
          <footer className="title-footer">
            <PixelText text="Minesweeper 1.0" color="#ffffff" scale={2} />
            <PixelText text="Not an official Minecraft product" color="#a0a0a0" scale={2} />
          </footer>
        </section>
      )}

      {/* Show or hide everything over the field; stays itself, above the WebAndApp badge. */}
      <button
        className="mc-button hud-toggle"
        onClick={() => setHudHidden((h) => !h)}
        aria-pressed={hudHidden}
        aria-label={hudHidden ? 'Show the controls (H)' : 'Hide the controls (H)'}
        title={hudHidden ? 'Show the controls (H)' : 'Hide the controls (H)'}
      >
        <Sprite sprite={hudHidden ? EYE_SHUT : EYE_OPEN} scale={2} />
      </button>

      {gameStatus === 'lost' && <div className="blast-flash" aria-hidden="true" />}

      {gameStatus === 'won' && (
        <div className="toast" role="status">
          <Sprite sprite={DIAMOND} scale={3} />
          <div>
            <PixelText text="Advancement made!" color="#ffff55" scale={2} />
            <PixelText text={`Cleared in ${elapsedTime}s`} color="#ffffff" scale={2} />
            {haul.length > 0 && (
              <div className="haul">
                {haul.map((ore) => (
                  <span key={ore}>
                    <Sprite sprite={ORE_SPRITES[ore]} scale={2} />
                    <PixelText text={`${ores[ore]}`} scale={2} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {gameStatus === 'lost' && !spectating && (
        <div
          className="death"
          role="alertdialog"
          aria-label="You died"
          style={{ '--death-delay': `${deathDelay}s` } as React.CSSProperties}
        >
          <PixelText text="You died!" className="death-title" />
          <PixelText text="Blown up by TNT" color="#ffffff" scale={2} />
          <p className="death-score">
            <PixelText text="Score: " color="#ffffff" scale={2} />
            <PixelText text={String(score)} color="#ffff55" scale={2} />
          </p>
          {haul.length > 0 && <PixelText text="This game's ore was dropped" color="#ffaaaa" scale={2} />}
          <button className="mc-button wide" onClick={newGame} autoFocus>
            <PixelText text="Respawn" scale={2} />
          </button>
          <button className="mc-button wide" onClick={() => setSpectating(true)}>
            <PixelText text="Look around" scale={2} />
          </button>
        </div>
      )}

      {/* Won: another game, with the ore kept. */}
      {gameStatus === 'won' && !spectating && (
        <div className="victory" role="dialog" aria-label="You won">
          <PixelText text="You won!" color="#ffff55" className="death-title" />
          <PixelText text={`Field cleared in ${elapsedTime}s`} color="#ffffff" scale={2} />
          {haul.length > 0 ? (
            <>
              <div className="haul big">
                {haul.map((ore) => (
                  <span key={ore}>
                    <Sprite sprite={ORE_SPRITES[ore]} scale={3} />
                    <PixelText text={`+${ores[ore]}`} scale={3} />
                  </span>
                ))}
              </div>
              <PixelText text="Added to your inventory" color="#cfe8c0" scale={2} />
            </>
          ) : (
            <PixelText text="No ore this time" color="#cfe8c0" scale={2} />
          )}
          <button className="mc-button wide" onClick={newGame} autoFocus>
            <PixelText text="Play again" scale={2} />
          </button>
          <button className="mc-button wide" onClick={() => setSpectating(true)}>
            <PixelText text="Look around" scale={2} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
