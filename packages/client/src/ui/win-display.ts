import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Win, Payline } from "@slot-engine/shared";
import { formatCents } from "./balance-display.js";
import { CELL_WIDTH, CELL_HEIGHT } from "./symbol-cell.js";
import { CELL_GAP } from "./reel-column.js";
import { REEL_GAP, GRID_PADDING } from "./reel-grid.js";
import { FONT_DISPLAY, GOLD_BRIGHT, GOLD, HIGHLIGHT_COLORS } from "./design-tokens.js";

const WIN_TEXT_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 32,
  fontWeight: "bold",
  fill: GOLD_BRIGHT,
  letterSpacing: 2,
  dropShadow: {
    color: GOLD,
    blur: 16,
    alpha: 0.4,
    distance: 0,
  },
});

export function createWinDisplay(canvasWidth: number): Container {
  const container = new Container();

  const text = new Text({ text: "", style: WIN_TEXT_STYLE });
  text.anchor.set(0.5, 0);
  text.x = canvasWidth / 2;
  text.y = 0;
  container.addChild(text);

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
      for (let row = 0; row < grid.length; row++) {
        const rowData = grid[row]!;
        for (let col = 0; col < rowData.length; col++) {
          if (scatterIds.has(rowData[col]!)) {
            drawHighlight(highlights, gridOrigin, display, col, row, color);
          }
        }
      }
    } else {
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

  // Subtle fill tint
  highlight.roundRect(cellX, cellY, CELL_WIDTH, CELL_HEIGHT, 12);
  highlight.fill({ color, alpha: 0.06 });

  // Inner border
  highlight.roundRect(cellX - 1, cellY - 1, CELL_WIDTH + 2, CELL_HEIGHT + 2, 13);
  highlight.stroke({ width: 2, color, alpha: 0.8 });

  // Outer glow border
  highlight.roundRect(cellX - 3, cellY - 3, CELL_WIDTH + 6, CELL_HEIGHT + 6, 15);
  highlight.stroke({ width: 2, color, alpha: 0.2 });

  container.addChild(highlight);
}

export function clearWin(display: Container): void {
  const text = display.children[0] as Text;
  text.text = "";

  const highlights = display.children[1] as Container;
  highlights.removeChildren();
}
