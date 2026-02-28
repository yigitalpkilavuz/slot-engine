import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";
import type { SymbolDefinition } from "@slot-engine/shared";
import { CELL_WIDTH, CELL_HEIGHT } from "./symbol-cell.js";
import { createReelColumn, setReelSymbols, startReelSpin, stopReelSpin, CELL_GAP } from "./reel-column.js";

export const REEL_GAP = 12;
export const GRID_PADDING = 20;

const PANEL_COLOR = 0x0c1424;
const PANEL_BORDER_COLOR = 0x1a2d45;
const PANEL_CORNER_RADIUS = 14;
const REEL_STOP_STAGGER_MS = 150;

export function createReelGrid(reelCount: number, rowCount: number): Container {
  const grid = new Container();

  const contentWidth = reelCount * CELL_WIDTH + (reelCount - 1) * REEL_GAP;
  const contentHeight = rowCount * CELL_HEIGHT + (rowCount - 1) * CELL_GAP;

  const panel = new Graphics();
  panel.roundRect(0, 0, contentWidth + GRID_PADDING * 2, contentHeight + GRID_PADDING * 2, PANEL_CORNER_RADIUS);
  panel.fill({ color: PANEL_COLOR });
  panel.stroke({ width: 1.5, color: PANEL_BORDER_COLOR });
  grid.addChild(panel);

  for (let i = 0; i < reelCount; i++) {
    const reel = createReelColumn(rowCount);
    reel.x = GRID_PADDING + i * (CELL_WIDTH + REEL_GAP);
    reel.y = GRID_PADDING;
    grid.addChild(reel);
  }

  return grid;
}

export function setGridSymbols(
  grid: Container,
  symbolGrid: readonly (readonly string[])[],
): void {
  const reelCount = grid.children.length - 1; // subtract panel
  const columns = transposeGrid(symbolGrid, reelCount);

  for (let i = 0; i < reelCount; i++) {
    const reel = grid.children[i + 1] as Container;
    setReelSymbols(reel, columns[i]!);
  }
}

export function startGridSpin(
  grid: Container,
  gameSymbols: readonly SymbolDefinition[],
  ticker: Ticker,
): void {
  const reelCount = grid.children.length - 1;
  for (let i = 0; i < reelCount; i++) {
    const reel = grid.children[i + 1] as Container;
    startReelSpin(reel, gameSymbols, ticker);
  }
}

export function stopGridSpin(
  grid: Container,
  symbolGrid: readonly (readonly string[])[],
  ticker: Ticker,
): Promise<void> {
  const reelCount = grid.children.length - 1;
  const columns = transposeGrid(symbolGrid, reelCount);

  const promises: Promise<void>[] = [];

  for (let i = 0; i < reelCount; i++) {
    const reelIndex = i;
    const promise = new Promise<void>((resolve) => {
      setTimeout(() => {
        const reel = grid.children[reelIndex + 1] as Container;
        stopReelSpin(reel, columns[reelIndex]!, ticker).then(resolve, resolve);
      }, reelIndex * REEL_STOP_STAGGER_MS);
    });
    promises.push(promise);
  }

  return Promise.all(promises).then(() => undefined);
}

function transposeGrid(
  grid: readonly (readonly string[])[],
  reelCount: number,
): readonly (readonly string[])[] {
  const columns: string[][] = [];
  for (let reel = 0; reel < reelCount; reel++) {
    const column: string[] = [];
    for (const row of grid) {
      column.push(row[reel]!);
    }
    columns.push(column);
  }
  return columns;
}
