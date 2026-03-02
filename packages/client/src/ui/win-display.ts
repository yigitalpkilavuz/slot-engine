import type { Ticker } from "pixi.js";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Win, Payline } from "@slot-engine/shared";
import { formatCents } from "./balance-display.js";
import { CELL_WIDTH, CELL_HEIGHT } from "./symbol-cell.js";
import { CELL_GAP } from "./reel-column.js";
import { REEL_GAP, GRID_PADDING } from "./reel-grid.js";
import { FONT_DISPLAY, GOLD_BRIGHT, GOLD, HIGHLIGHT_COLORS, getRegisteredSymbolName } from "./design-tokens.js";

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

const WIN_INFO_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 14,
  fontWeight: "600",
  fill: GOLD,
  letterSpacing: 1.5,
});

const REVEAL_DURATION_MS = 300;
const PULSE_CYCLE_MS = 800;
const SINGLE_WIN_HOLD_MS = 1500;
const SINGLE_WIN_HOLD_FAST_MS = 600;
const WIN_TRANSITION_MS = 300;
const PAYLINE_LINE_WIDTH = 2;
const PAYLINE_LINE_ALPHA = 0.5;

interface HighlightCell {
  readonly cellX: number;
  readonly cellY: number;
  readonly color: number;
}

export interface WinCycleConfig {
  readonly display: Container;
  readonly wins: readonly Win[];
  readonly paylines: readonly Payline[];
  readonly gridOrigin: { readonly x: number; readonly y: number };
  readonly grid: readonly (readonly string[])[];
  readonly scatterIds: ReadonlySet<string>;
  readonly ticker: Ticker;
  readonly totalPayoutCents: number;
  readonly speed?: "normal" | "fast";
}

export function createWinDisplay(canvasWidth: number): Container {
  const container = new Container();

  // children[0]: main win amount text
  const text = new Text({ text: "", style: WIN_TEXT_STYLE });
  text.anchor.set(0.5, 0);
  text.x = canvasWidth / 2;
  text.y = 0;
  container.addChild(text);

  // children[1]: highlights container
  const highlights = new Container();
  container.addChild(highlights);

  // children[2]: per-win info text
  const infoText = new Text({ text: "", style: WIN_INFO_STYLE });
  infoText.anchor.set(0.5, 0);
  infoText.x = canvasWidth / 2;
  infoText.y = 36;
  container.addChild(infoText);

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

  const infoText = display.children[2] as Text | undefined;
  if (infoText) infoText.text = "";

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

export function showAnimatedWin(
  display: Container,
  totalPayoutCents: number,
  wins: readonly Win[],
  paylines: readonly Payline[],
  gridOrigin: { readonly x: number; readonly y: number },
  grid: readonly (readonly string[])[],
  scatterIds: ReadonlySet<string>,
  ticker: Ticker,
): { cleanup: () => void } {
  const text = display.children[0] as Text;
  text.text = `WIN: ${formatCents(totalPayoutCents)}`;

  const highlights = display.children[1] as Container;
  highlights.removeChildren();

  const infoText = display.children[2] as Text | undefined;
  if (infoText) infoText.text = "";

  const cells = collectAllCells(wins, paylines, gridOrigin, grid, scatterIds, display);

  const gfx = new Graphics();
  highlights.addChild(gfx);

  const startTime = performance.now();

  const callback = (): void => {
    const elapsed = performance.now() - startTime;
    const revealT = Math.min(elapsed / REVEAL_DURATION_MS, 1);
    const pulsePhase = elapsed / PULSE_CYCLE_MS * Math.PI * 2;

    const fillAlpha = revealT < 1
      ? 0.06 * revealT
      : 0.06 + 0.09 * (0.5 + 0.5 * Math.sin(pulsePhase));
    const borderAlpha = revealT < 1
      ? 0.8 * revealT
      : 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(pulsePhase));
    const glowAlpha = revealT < 1
      ? 0.2 * revealT
      : 0.15 + 0.2 * (0.5 + 0.5 * Math.sin(pulsePhase));

    gfx.clear();
    drawCellHighlights(gfx, cells, fillAlpha, borderAlpha, glowAlpha);
  };

  ticker.add(callback);

  const cleanup = (): void => {
    ticker.remove(callback);
  };

  (display as unknown as { _winCleanup?: () => void })._winCleanup = cleanup;

  return { cleanup };
}

export function showCycledWins(config: WinCycleConfig): { cleanup: () => void } {
  const {
    display, wins, paylines, gridOrigin, grid, scatterIds, ticker, totalPayoutCents, speed,
  } = config;

  const text = display.children[0] as Text;
  const highlights = display.children[1] as Container;
  const infoText = display.children[2] as Text | undefined;

  highlights.removeChildren();
  if (infoText) infoText.text = "";
  text.text = `WIN: ${formatCents(totalPayoutCents)}`;

  // For 0 or 1 win, skip cycling and go straight to animated pulse
  if (wins.length <= 1) {
    if (wins.length === 1) {
      const win = wins[0]!;
      if (infoText) infoText.text = formatWinInfo(win);
    }
    const cells = collectAllCells(wins, paylines, gridOrigin, grid, scatterIds, display);
    return startPulseAnimation(display, highlights, cells, wins, paylines, gridOrigin, ticker);
  }

  const holdMs = speed === "fast" ? SINGLE_WIN_HOLD_FAST_MS : SINGLE_WIN_HOLD_MS;
  const gfx = new Graphics();
  highlights.addChild(gfx);

  let currentWinIndex = 0;
  let phaseStartTime = performance.now();
  let phase: "show" | "fade" | "all" = "show";

  const renderSingleWin = (winIndex: number, alpha: number): void => {
    const win = wins[winIndex]!;
    const color = HIGHLIGHT_COLORS[winIndex % HIGHLIGHT_COLORS.length]!;
    const cells = collectWinCells(win, winIndex, paylines, gridOrigin, grid, scatterIds, display);

    gfx.clear();
    drawCellHighlights(gfx, cells, 0.06 * alpha, 0.8 * alpha, 0.2 * alpha);

    // Draw payline path
    if (win.paylineIndex !== -1) {
      const payline = paylines[win.paylineIndex];
      if (payline) {
        drawPaylinePath(gfx, win, payline, gridOrigin, display, color, alpha);
      }
    }
  };

  // Show first win immediately
  renderSingleWin(0, 1);
  if (infoText) infoText.text = formatWinInfo(wins[0]!);

  const callback = (): void => {
    const elapsed = performance.now() - phaseStartTime;

    if (phase === "show") {
      if (elapsed >= holdMs) {
        phase = "fade";
        phaseStartTime = performance.now();
      }
      return;
    }

    if (phase === "fade") {
      const t = Math.min(elapsed / WIN_TRANSITION_MS, 1);
      const alpha = 1 - t;
      renderSingleWin(currentWinIndex, alpha);
      if (infoText) infoText.alpha = alpha;

      if (t >= 1) {
        currentWinIndex++;

        if (currentWinIndex >= wins.length) {
          // Transition to "all wins" state
          phase = "all";
          phaseStartTime = performance.now();
          gfx.clear();

          if (infoText) {
            infoText.text = "";
            infoText.alpha = 1;
          }

          // Start the combined pulse animation
          ticker.remove(callback);
          const allCells = collectAllCells(wins, paylines, gridOrigin, grid, scatterIds, display);
          startPulseAnimation(display, highlights, allCells, wins, paylines, gridOrigin, ticker);
          return;
        }

        // Show next win
        phase = "show";
        phaseStartTime = performance.now();
        renderSingleWin(currentWinIndex, 1);
        if (infoText) {
          infoText.text = formatWinInfo(wins[currentWinIndex]!);
          infoText.alpha = 1;
        }
      }
      return;
    }
  };

  ticker.add(callback);

  const cleanup = (): void => {
    ticker.remove(callback);
  };

  (display as unknown as { _winCleanup?: () => void })._winCleanup = cleanup;

  return { cleanup };
}

function startPulseAnimation(
  display: Container,
  highlights: Container,
  cells: readonly HighlightCell[],
  wins: readonly Win[],
  paylines: readonly Payline[],
  gridOrigin: { readonly x: number; readonly y: number },
  ticker: Ticker,
): { cleanup: () => void } {
  highlights.removeChildren();

  const gfx = new Graphics();
  highlights.addChild(gfx);

  const startTime = performance.now();

  const callback = (): void => {
    const elapsed = performance.now() - startTime;
    const revealT = Math.min(elapsed / REVEAL_DURATION_MS, 1);
    const pulsePhase = elapsed / PULSE_CYCLE_MS * Math.PI * 2;

    const fillAlpha = revealT < 1
      ? 0.06 * revealT
      : 0.06 + 0.09 * (0.5 + 0.5 * Math.sin(pulsePhase));
    const borderAlpha = revealT < 1
      ? 0.8 * revealT
      : 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(pulsePhase));
    const glowAlpha = revealT < 1
      ? 0.2 * revealT
      : 0.15 + 0.2 * (0.5 + 0.5 * Math.sin(pulsePhase));

    gfx.clear();
    drawCellHighlights(gfx, cells, fillAlpha, borderAlpha, glowAlpha);

    // Draw payline paths for all non-scatter wins
    for (let i = 0; i < wins.length; i++) {
      const win = wins[i]!;
      if (win.paylineIndex === -1) continue;
      const payline = paylines[win.paylineIndex];
      if (!payline) continue;
      const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length]!;
      drawPaylinePath(gfx, win, payline, gridOrigin, display, color, borderAlpha);
    }
  };

  ticker.add(callback);

  const cleanup = (): void => {
    ticker.remove(callback);
  };

  (display as unknown as { _winCleanup?: () => void })._winCleanup = cleanup;

  return { cleanup };
}

function collectWinCells(
  win: Win,
  winIndex: number,
  paylines: readonly Payline[],
  gridOrigin: { readonly x: number; readonly y: number },
  grid: readonly (readonly string[])[],
  scatterIds: ReadonlySet<string>,
  display: Container,
): HighlightCell[] {
  const color = HIGHLIGHT_COLORS[winIndex % HIGHLIGHT_COLORS.length]!;
  const cells: HighlightCell[] = [];

  if (win.paylineIndex === -1) {
    for (let row = 0; row < grid.length; row++) {
      const rowData = grid[row]!;
      for (let col = 0; col < rowData.length; col++) {
        if (scatterIds.has(rowData[col]!)) {
          cells.push({
            cellX: gridOrigin.x + GRID_PADDING + col * (CELL_WIDTH + REEL_GAP) - display.x,
            cellY: gridOrigin.y + GRID_PADDING + row * (CELL_HEIGHT + CELL_GAP) - display.y,
            color,
          });
        }
      }
    }
  } else {
    const payline = paylines[win.paylineIndex];
    if (payline) {
      for (let reelIndex = 0; reelIndex < win.count; reelIndex++) {
        const rowIndex = payline[reelIndex];
        if (rowIndex === undefined) continue;
        cells.push({
          cellX: gridOrigin.x + GRID_PADDING + reelIndex * (CELL_WIDTH + REEL_GAP) - display.x,
          cellY: gridOrigin.y + GRID_PADDING + rowIndex * (CELL_HEIGHT + CELL_GAP) - display.y,
          color,
        });
      }
    }
  }

  return cells;
}

function collectAllCells(
  wins: readonly Win[],
  paylines: readonly Payline[],
  gridOrigin: { readonly x: number; readonly y: number },
  grid: readonly (readonly string[])[],
  scatterIds: ReadonlySet<string>,
  display: Container,
): HighlightCell[] {
  const cells: HighlightCell[] = [];
  for (let i = 0; i < wins.length; i++) {
    const winCells = collectWinCells(wins[i]!, i, paylines, gridOrigin, grid, scatterIds, display);
    cells.push(...winCells);
  }
  return cells;
}

function drawCellHighlights(
  gfx: Graphics,
  cells: readonly HighlightCell[],
  fillAlpha: number,
  borderAlpha: number,
  glowAlpha: number,
): void {
  for (const cell of cells) {
    gfx.roundRect(cell.cellX, cell.cellY, CELL_WIDTH, CELL_HEIGHT, 12);
    gfx.fill({ color: cell.color, alpha: fillAlpha });

    gfx.roundRect(cell.cellX - 1, cell.cellY - 1, CELL_WIDTH + 2, CELL_HEIGHT + 2, 13);
    gfx.stroke({ width: 2, color: cell.color, alpha: borderAlpha });

    gfx.roundRect(cell.cellX - 3, cell.cellY - 3, CELL_WIDTH + 6, CELL_HEIGHT + 6, 15);
    gfx.stroke({ width: 2, color: cell.color, alpha: glowAlpha });
  }
}

function drawPaylinePath(
  gfx: Graphics,
  win: Win,
  payline: Payline,
  gridOrigin: { readonly x: number; readonly y: number },
  display: Container,
  color: number,
  alpha: number,
): void {
  for (let reel = 0; reel < win.count; reel++) {
    const row = payline[reel];
    if (row === undefined) continue;

    const cx = gridOrigin.x + GRID_PADDING + reel * (CELL_WIDTH + REEL_GAP) + CELL_WIDTH / 2 - display.x;
    const cy = gridOrigin.y + GRID_PADDING + row * (CELL_HEIGHT + CELL_GAP) + CELL_HEIGHT / 2 - display.y;

    if (reel === 0) {
      gfx.moveTo(cx, cy);
    } else {
      gfx.lineTo(cx, cy);
    }
  }
  gfx.stroke({ width: PAYLINE_LINE_WIDTH, color, alpha: alpha * PAYLINE_LINE_ALPHA });
}

function formatWinInfo(win: Win): string {
  const name = getRegisteredSymbolName(win.symbolId)?.toUpperCase() ?? win.symbolId.toUpperCase();
  if (win.paylineIndex === -1) {
    return `SCATTER \u00D7${String(win.count)} \u2022 ${formatCents(win.payout)}`;
  }
  return `PAYLINE ${String(win.paylineIndex + 1)} \u2022 ${String(win.count)}\u00D7 ${name} \u2022 ${formatCents(win.payout)}`;
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

  highlight.roundRect(cellX, cellY, CELL_WIDTH, CELL_HEIGHT, 12);
  highlight.fill({ color, alpha: 0.06 });

  highlight.roundRect(cellX - 1, cellY - 1, CELL_WIDTH + 2, CELL_HEIGHT + 2, 13);
  highlight.stroke({ width: 2, color, alpha: 0.8 });

  highlight.roundRect(cellX - 3, cellY - 3, CELL_WIDTH + 6, CELL_HEIGHT + 6, 15);
  highlight.stroke({ width: 2, color, alpha: 0.2 });

  container.addChild(highlight);
}

export function clearWin(display: Container): void {
  const stored = display as unknown as { _winCleanup?: () => void };
  if (stored._winCleanup) {
    stored._winCleanup();
    delete stored._winCleanup;
  }

  const text = display.children[0] as Text;
  text.text = "";
  text.scale.set(1);

  const highlights = display.children[1] as Container;
  highlights.removeChildren();

  const infoText = display.children[2] as Text | undefined;
  if (infoText) {
    infoText.text = "";
    infoText.alpha = 1;
  }
}
