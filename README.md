# Minesweeper

A classic Windows Minesweeper game built with React and TypeScript.

## Features

- 🎮 Three classic difficulty levels:
  - **Beginner**: 9×9 grid with 10 bombs
  - **Intermediate**: 16×16 grid with 40 bombs
  - **Expert**: 22×22 grid with 99 bombs (30×16 on a phone held upright)
- ⚙️ Custom difficulty option with adjustable:
  - Grid size (rows and columns)
  - Number of bombs
- 🏠 A title screen in the style of Minecraft's: a 3D stone logo and splash line over the world itself, behind a soft veil, with a short how-to and the controls (only the touch ones on a touch screen)
- 🌳 The game as a Minecraft world: the field dug into a meadow that fills the screen, with oak trees, ponds, flowers and a path round it; the HUD top left, hotbar and help top right, the menu in one line at the bottom
- 🧊 An isometric view: grass, rock and TNT blocks level with the meadow, dug cells as pits, numbers floating above them (turn it freely by dragging or with the compass; switch to 2D with “View”; phones start in 2D)
- 🎨 Minecraft-inspired look: grass to dig, TNT, a creeper, a pixel font – all drawn in code, no image files
- ⏱️ Timer and bomb counter
- 🚩 Flag cells with right-click
- 🖱️ Chording: click a number with all its flags placed to dig the rest around it
- ⛏️ Ore to collect – coal, iron, gold and the odd diamond. Win and it's yours for good (kept in the browser, across games and visits); die and that game's ore is dropped
- 💥 A proper death: fuse, blast, crater, flying blocks and a chain reaction through the rest of the TNT
- 🔊 Sound effects synthesised with the Web Audio API (no audio files), with an on/off switch
- 📱 On a phone held upright, Hard is played tall (30 rows × 16) so it fits the screen
- 🪨 Optional rocks (“Rocks: On”): stone blocks on about 12% of the board that can't be dug and never hide TNT; the setting is remembered in the browser
- 🎯 Win/lose detection, with a win screen to play another round

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The game will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## How to Play

1. Click on a cell to reveal it
2. Right-click (or pick the flag in the hotbar) to flag a cell you think contains a bomb
3. Numbers indicate how many bombs are adjacent to that cell
4. Reveal all non-bomb cells to win!
5. Click the face button to start a new game

## Controls

- **Left Click**:** Reveal cell
- **Right Click:** Flag/unflag cell
- **Face Button:** Start new game
- **1 / 2 or F:** Switch between pickaxe (dig) and flag – the flag slot is how you flag on a touch screen
- **Arrow keys, Space / Enter, F:** Move around the board, dig, flag
- **Drag, Q / E or the compass:** Turn the island freely, or in 15° steps (isometric view)
- **Wheel, pinch, + / − or the zoom buttons:** Zoom in up to 4× (towards the pointer with the wheel); Shift+drag (or drag, in 2D) moves the zoomed view; 0 zooms back out
- **H or the eye button:** Hide everything over the field, to look at it on its own
