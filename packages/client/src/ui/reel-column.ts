import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";
import type { SymbolDefinition } from "@slot-engine/shared";
import { createSymbolCell, updateSymbolCell, CELL_HEIGHT } from "./symbol-cell.js";

export const CELL_GAP = 8;
const CYCLE_EVERY_N_FRAMES = 4;
const LANDING_DURATION_MS = 250;
const LANDING_OFFSET = -(CELL_HEIGHT + CELL_GAP);

export function createReelColumn(rowCount: number): Container {
  const reel = new Container();

  const strip = new Container();
  reel.addChild(strip);

  for (let row = 0; row < rowCount; row++) {
    const cell = createSymbolCell("cherry");
    cell.y = row * (CELL_HEIGHT + CELL_GAP);
    strip.addChild(cell);
  }

  return reel;
}

export function setReelSymbols(reel: Container, symbols: readonly string[]): void {
  const strip = reel.children[0] as Container;
  for (let i = 0; i < symbols.length; i++) {
    const cell = strip.children[i] as Container;
    updateSymbolCell(cell, symbols[i]!);
  }
}

export function startReelSpin(
  reel: Container,
  gameSymbols: readonly SymbolDefinition[],
  ticker: Ticker,
): void {
  const strip = reel.children[0] as Container;
  let frameCount = 0;

  const callback = (): void => {
    frameCount++;
    if (frameCount % CYCLE_EVERY_N_FRAMES === 0) {
      for (const child of strip.children) {
        const randomId = gameSymbols[Math.floor(Math.random() * gameSymbols.length)]!.id;
        updateSymbolCell(child as Container, randomId);
      }
    }
  };

  // Store callback reference on the reel for removal later
  (reel as unknown as { _spinCallback: () => void })._spinCallback = callback;
  ticker.add(callback);
}

export function stopReelSpin(
  reel: Container,
  finalSymbols: readonly string[],
  ticker: Ticker,
): Promise<void> {
  // Remove spin cycling callback
  const stored = reel as unknown as { _spinCallback?: () => void };
  if (stored._spinCallback) {
    ticker.remove(stored._spinCallback);
    delete stored._spinCallback;
  }

  // Set final symbols
  const strip = reel.children[0] as Container;
  for (let i = 0; i < finalSymbols.length; i++) {
    const cell = strip.children[i] as Container;
    updateSymbolCell(cell, finalSymbols[i]!);
  }

  // Landing animation: offset up, tween down with easeOutBack
  strip.y = LANDING_OFFSET;

  return new Promise((resolve) => {
    const startTime = performance.now();

    const animCallback = (): void => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / LANDING_DURATION_MS, 1);
      strip.y = LANDING_OFFSET * (1 - easeOutBack(t));

      if (t >= 1) {
        strip.y = 0;
        ticker.remove(animCallback);
        resolve();
      }
    };

    ticker.add(animCallback);
  });
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
