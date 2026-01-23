# Minesweeper

A classic Windows Minesweeper game built with React and TypeScript.

## Features

- 🎮 Three classic difficulty levels:
  - **Beginner**: 9×9 grid with 10 bombs
  - **Intermediate**: 16×16 grid with 40 bombs
  - **Expert**: 16×30 grid with 99 bombs
- ⚙️ Custom difficulty option with adjustable:
  - Grid size (rows and columns)
  - Number of bombs
- 🎨 Classic Windows Minesweeper styling
- ⏱️ Timer and bomb counter
- 🚩 Flag cells with right-click
- 🎯 Win/lose detection

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
2. Right-click (or long-press on mobile) to flag a cell you think contains a bomb
3. Numbers indicate how many bombs are adjacent to that cell
4. Reveal all non-bomb cells to win!
5. Click the face button to start a new game

## Controls

- **Left Click**:** Reveal cell
- **Right Click:** Flag/unflag cell
- **Face Button:** Start new game
