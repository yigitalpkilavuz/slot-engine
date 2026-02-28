import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Win, Payline } from "@slot-engine/shared";
import { formatCents } from "./balance-display.js";
import { CELL_WIDTH, CELL_HEIGHT } from "./symbol-cell.js";

const CELL_GAP = 8;
const REEL_GAP = 12;
const GRID_PADDING = 20;

const WIN_TEXT_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 28,
  fontWeight: "bold",
  fill: 0xf1c40f,
});

const HIGHLIGHT_COLORS: readonly number[] = [
  0xf1c40f, 0x1abc9c, 0xe74c3c, 0x3498db, 0xe67e22,
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
): void {
  const text = display.children[0] as Text;
  text.text = `WIN: ${formatCents(totalPayoutCents)}`;

  const highlights = display.children[1] as Container;
  highlights.removeChildren();

  for (let i = 0; i < wins.length; i++) {
    const win = wins[i]!;
    const payline = paylines[win.paylineIndex];
    if (!payline) continue;

    const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length]!;

    for (let reelIndex = 0; reelIndex < win.count; reelIndex++) {
      const rowIndex = payline[reelIndex];
      if (rowIndex === undefined) continue;

      const cellX = gridOrigin.x + GRID_PADDING + reelIndex * (CELL_WIDTH + REEL_GAP) - display.x;
      const cellY = gridOrigin.y + GRID_PADDING + rowIndex * (CELL_HEIGHT + CELL_GAP) - display.y;

      const highlight = new Graphics();
      highlight.roundRect(cellX - 2, cellY - 2, CELL_WIDTH + 4, CELL_HEIGHT + 4, 10);
      highlight.stroke({ width: 3, color, alpha: 0.9 });
      highlights.addChild(highlight);
    }
  }
}

export function clearWin(display: Container): void {
  const text = display.children[0] as Text;
  text.text = "";

  const highlights = display.children[1] as Container;
  highlights.removeChildren();
}
