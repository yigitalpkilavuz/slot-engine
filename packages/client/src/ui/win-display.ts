import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Win, Payline } from "@slot-engine/shared";
import { formatCents } from "./balance-display.js";
import { CELL_WIDTH, CELL_HEIGHT } from "./symbol-cell.js";

const CELL_GAP = 8;
const REEL_GAP = 12;
const GRID_PADDING = 20;

const WIN_TEXT_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 30,
  fontWeight: "bold",
  fill: 0xf0c850,
  dropShadow: {
    color: 0xd4a846,
    blur: 12,
    alpha: 0.5,
    distance: 0,
  },
});

const HIGHLIGHT_COLORS: readonly number[] = [
  0xf0c850, 0x2dd4a8, 0xe85d5d, 0x3b82f6, 0xea580c,
];

export function createWinDisplay(canvasWidth: number): Container {
  const container = new Container();

  const text = new Text({ text: "", style: WIN_TEXT_STYLE });
  text.anchor.set(0.5, 0);
  text.x = canvasWidth / 2;
  text.y = 0;
  container.addChild(text);

  // Highlights container for payline overlays
  const highlights = new Container();
  container.addChild(highlights);

  return container;
}

export function showWin(
  display: Container,
  totalPayoutCents: number,
  wins: readonly Win[],
  paylines: readonly Payline[],
  gridOrigin: { readonly x: number; readonly y: number },
  grid: readonly (readonly string[])[],
  scatterIds: ReadonlySet<string>,
): void {
  const text = display.children[0] as Text;
  text.text = `WIN: ${formatCents(totalPayoutCents)}`;

  const highlights = display.children[1] as Container;
  highlights.removeChildren();

  for (let i = 0; i < wins.length; i++) {
    const win = wins[i]!;
    const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length]!;

    if (win.paylineIndex === -1) {
      // Scatter win — highlight all scatter positions on the grid
      for (let row = 0; row < grid.length; row++) {
        const rowData = grid[row]!;
        for (let col = 0; col < rowData.length; col++) {
          if (scatterIds.has(rowData[col]!)) {
            drawHighlight(highlights, gridOrigin, display, col, row, color);
          }
        }
      }
    } else {
      // Payline win
      const payline = paylines[win.paylineIndex];
      if (!payline) continue;

      for (let reelIndex = 0; reelIndex < win.count; reelIndex++) {
        const rowIndex = payline[reelIndex];
        if (rowIndex === undefined) continue;

        drawHighlight(highlights, gridOrigin, display, reelIndex, rowIndex, color);
      }
    }
  }
}

function drawHighlight(
  container: Container,
  gridOrigin: { readonly x: number; readonly y: number },
  display: Container,
  col: number,
  row: number,
  color: number,
): void {
  const cellX = gridOrigin.x + GRID_PADDING + col * (CELL_WIDTH + REEL_GAP) - display.x;
  const cellY = gridOrigin.y + GRID_PADDING + row * (CELL_HEIGHT + CELL_GAP) - display.y;

  const highlight = new Graphics();
  highlight.roundRect(cellX - 2, cellY - 2, CELL_WIDTH + 4, CELL_HEIGHT + 4, 12);
  highlight.stroke({ width: 3, color, alpha: 0.9 });
  container.addChild(highlight);
}

export function clearWin(display: Container): void {
  const text = display.children[0] as Text;
  text.text = "";

  const highlights = display.children[1] as Container;
  highlights.removeChildren();
}
