import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";
import type { SymbolDefinition, Win, Payline } from "@slot-engine/shared";
import { CELL_WIDTH, CELL_HEIGHT } from "./symbol-cell.js";
import { createReelColumn, setReelSymbols, startReelSpin, stopReelSpin, CELL_GAP } from "./reel-column.js";
import { BORDER_SUBTLE, GOLD_BRIGHT, easeOutQuint } from "./design-tokens.js";

export const REEL_GAP = 14;
export const GRID_PADDING = 24;

const PANEL_CORNER_RADIUS = 18;
const REEL_STOP_STAGGER_MS = 180;
const ANTICIPATION_EXTRA_DELAY_MS = 1000;

export function createReelGrid(reelCount: number, rowCount: number): Container {
  const grid = new Container();

  const contentWidth = reelCount * CELL_WIDTH + (reelCount - 1) * REEL_GAP;
  const contentHeight = rowCount * CELL_HEIGHT + (rowCount - 1) * CELL_GAP;
  const panelW = contentWidth + GRID_PADDING * 2;
  const panelH = contentHeight + GRID_PADDING * 2;

  // Layer 1: Subtle border frame (no opaque fill — reels float on the scene background)
  const panel = new Graphics();
  panel.roundRect(0, 0, panelW, panelH, PANEL_CORNER_RADIUS);
  panel.stroke({ width: 1, color: BORDER_SUBTLE, alpha: 0.25 });
  grid.addChild(panel);

  // Layer 2: Very faint inner glow at top edge
  const topHighlight = new Graphics();
  topHighlight.roundRect(PANEL_CORNER_RADIUS, 1, panelW - PANEL_CORNER_RADIUS * 2, 1, 0);
  topHighlight.fill({ color: 0xffffff, alpha: 0.03 });
  grid.addChild(topHighlight);

  for (let i = 0; i < reelCount; i++) {
    const reel = createReelColumn(rowCount);
    reel.x = GRID_PADDING + i * (CELL_WIDTH + REEL_GAP);
    reel.y = GRID_PADDING;
    grid.addChild(reel);
  }

  return grid;
}

// Frame occupies children[0..1], reels start at children[2]
const REEL_CHILD_OFFSET = 2;

export function setGridSymbols(
  grid: Container,
  symbolGrid: readonly (readonly string[])[],
  badgeMap?: ReadonlyMap<string, string>,
): void {
  const reelCount = grid.children.length - REEL_CHILD_OFFSET;
  const columns = transposeGrid(symbolGrid, reelCount);

  for (let i = 0; i < reelCount; i++) {
    const reel = grid.children[i + REEL_CHILD_OFFSET] as Container;
    setReelSymbols(reel, columns[i]!, badgeMap);
  }
}

export function startGridSpin(
  grid: Container,
  gameSymbols: readonly SymbolDefinition[],
  ticker: Ticker,
): void {
  const reelCount = grid.children.length - REEL_CHILD_OFFSET;
  for (let i = 0; i < reelCount; i++) {
    const reel = grid.children[i + REEL_CHILD_OFFSET] as Container;
    startReelSpin(reel, gameSymbols, ticker);
  }
}

export function stopGridSpin(
  grid: Container,
  symbolGrid: readonly (readonly string[])[],
  ticker: Ticker,
  reelDelays: readonly number[] | undefined,
  badgeMap?: ReadonlyMap<string, string>,
): Promise<void> {
  const reelCount = grid.children.length - REEL_CHILD_OFFSET;
  const columns = transposeGrid(symbolGrid, reelCount);

  const promises: Promise<void>[] = [];

  for (let i = 0; i < reelCount; i++) {
    const reelIndex = i;
    const delayMs = reelDelays ? reelDelays[reelIndex]! : reelIndex * REEL_STOP_STAGGER_MS;
    const promise = new Promise<void>((resolve) => {
      setTimeout(() => {
        const reel = grid.children[reelIndex + REEL_CHILD_OFFSET] as Container;
        stopReelSpin(reel, columns[reelIndex]!, ticker, badgeMap).then(resolve, resolve);
      }, delayMs);
    });
    promises.push(promise);
  }

  return Promise.all(promises).then(() => undefined);
}

export function computeReelDelays(
  symbolGrid: readonly (readonly string[])[],
  scatterIds: ReadonlySet<string>,
  scatterThreshold: number,
  reelCount: number,
): readonly number[] {
  const anticipationTrigger = scatterThreshold - 1;
  const delays: number[] = [];
  let cumulativeDelay = 0;
  let scattersLanded = 0;
  let anticipationActive = false;

  for (let reel = 0; reel < reelCount; reel++) {
    delays.push(cumulativeDelay);

    let reelHasScatter = false;
    for (const row of symbolGrid) {
      const sym = row[reel];
      if (sym !== undefined && scatterIds.has(sym)) {
        reelHasScatter = true;
        break;
      }
    }

    if (reelHasScatter) {
      scattersLanded++;
    }

    if (!anticipationActive && scattersLanded >= anticipationTrigger) {
      anticipationActive = true;
    }

    if (anticipationActive) {
      cumulativeDelay += REEL_STOP_STAGGER_MS + ANTICIPATION_EXTRA_DELAY_MS;
    } else {
      cumulativeDelay += REEL_STOP_STAGGER_MS;
    }
  }

  return delays;
}

const EXPAND_FLASH_DURATION_MS = 500;
const EXPAND_COLUMN_STAGGER_MS = 250;

export function animateExpandingWilds(
  grid: Container,
  originalGrid: readonly (readonly string[])[],
  expandedGrid: readonly (readonly string[])[],
  ticker: Ticker,
  badgeMap?: ReadonlyMap<string, string>,
): Promise<void> {
  const reelCount = grid.children.length - REEL_CHILD_OFFSET;
  const rowCount = originalGrid.length;

  const expandingCols: number[] = [];
  for (let col = 0; col < reelCount; col++) {
    for (let row = 0; row < rowCount; row++) {
      if (originalGrid[row]![col] !== expandedGrid[row]![col]) {
        expandingCols.push(col);
        break;
      }
    }
  }

  if (expandingCols.length === 0) {
    return Promise.resolve();
  }

  setGridSymbols(grid, originalGrid, badgeMap);

  const promises = expandingCols.map((col, idx) => {
    const staggerDelay = 400 + idx * EXPAND_COLUMN_STAGGER_MS;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const reel = grid.children[col + REEL_CHILD_OFFSET] as Container;
        animateColumnExpand(reel, expandedGrid, col, rowCount, ticker, badgeMap).then(resolve, resolve);
      }, staggerDelay);
    });
  });

  return Promise.all(promises).then(() => undefined);
}

function animateColumnExpand(
  reel: Container,
  expandedGrid: readonly (readonly string[])[],
  col: number,
  rowCount: number,
  ticker: Ticker,
  badgeMap?: ReadonlyMap<string, string>,
): Promise<void> {
  const flash = new Graphics();
  const colHeight = rowCount * CELL_HEIGHT + (rowCount - 1) * CELL_GAP;
  flash.roundRect(0, 0, CELL_WIDTH, colHeight, 6);
  flash.fill({ color: GOLD_BRIGHT });
  flash.alpha = 0;

  reel.addChild(flash);

  return new Promise((resolve) => {
    const startTime = performance.now();

    const callback = (): void => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / EXPAND_FLASH_DURATION_MS, 1);

      if (t < 0.5) {
        flash.alpha = t * 2 * 0.6;
      } else {
        flash.alpha = (1 - t) * 2 * 0.6;
      }

      if (t >= 0.5 && reel.children.length > 1) {
        const expandedCol: string[] = [];
        for (let row = 0; row < rowCount; row++) {
          expandedCol.push(expandedGrid[row]![col]!);
        }
        setReelSymbols(reel, expandedCol, badgeMap);
      }

      if (t >= 1) {
        ticker.remove(callback);
        reel.removeChild(flash);
        flash.destroy();
        resolve();
      }
    };

    ticker.add(callback);
  });
}

const CASCADE_FADEOUT_DURATION_MS = 400;

export function animateCascadeTransition(
  grid: Container,
  wins: readonly Win[],
  paylines: readonly Payline[],
  currentGrid: readonly (readonly string[])[],
  scatterIds: ReadonlySet<string>,
  ticker: Ticker,
): Promise<void> {
  const reelCount = grid.children.length - REEL_CHILD_OFFSET;
  const rowCount = currentGrid.length;

  const winPositions = new Set<string>();
  for (const win of wins) {
    if (win.paylineIndex === -1) {
      for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < reelCount; col++) {
          if (scatterIds.has(currentGrid[row]![col]!)) {
            winPositions.add(`${String(row)},${String(col)}`);
          }
        }
      }
    } else {
      const payline = paylines[win.paylineIndex];
      if (!payline) continue;
      for (let reelIdx = 0; reelIdx < win.count; reelIdx++) {
        const rowIdx = payline[reelIdx];
        if (rowIdx !== undefined) {
          winPositions.add(`${String(rowIdx)},${String(reelIdx)}`);
        }
      }
    }
  }

  if (winPositions.size === 0) {
    return Promise.resolve();
  }

  const cells: Container[] = [];
  for (const key of winPositions) {
    const [rowStr, colStr] = key.split(",");
    const row = Number(rowStr);
    const col = Number(colStr);
    const reel = grid.children[col + REEL_CHILD_OFFSET] as Container;
    const strip = reel.children[0] as Container;
    const cell = strip.children[row] as Container | undefined;
    if (cell) {
      cells.push(cell);
    }
  }

  return new Promise((resolve) => {
    const startTime = performance.now();

    const callback = (): void => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / CASCADE_FADEOUT_DURATION_MS, 1);

      // Brief brighten then smooth fade out using easeOutQuint
      const alpha = t < 0.25
        ? 1 + (1 - t / 0.25) * 0.3
        : Math.max(0, 1 - easeOutQuint((t - 0.25) / 0.75));

      for (const cell of cells) {
        cell.alpha = alpha;
      }

      if (t >= 1) {
        ticker.remove(callback);
        for (const cell of cells) {
          cell.alpha = 1;
        }
        resolve();
      }
    };

    ticker.add(callback);
  });
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
