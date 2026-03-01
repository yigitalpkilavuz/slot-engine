import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";
import type { SymbolDefinition } from "@slot-engine/shared";
import { createSymbolCell, updateSymbolCell, CELL_HEIGHT } from "./symbol-cell.js";
import { easeOutBack } from "./design-tokens.js";

export const CELL_GAP = 10;
const CYCLE_EVERY_N_FRAMES = 4;
const LANDING_DURATION_MS = 350;
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

export function setReelSymbols(
  reel: Container,
  symbols: readonly string[],
  badgeMap?: ReadonlyMap<string, string>,
): void {
  const strip = reel.children[0] as Container;
  for (let i = 0; i < symbols.length; i++) {
    const cell = strip.children[i] as Container;
    const symbolId = symbols[i]!;
    updateSymbolCell(cell, symbolId, badgeMap?.get(symbolId));
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

  (reel as unknown as { _spinCallback: () => void })._spinCallback = callback;
  ticker.add(callback);
}

export function stopReelSpin(
  reel: Container,
  finalSymbols: readonly string[],
  ticker: Ticker,
  badgeMap?: ReadonlyMap<string, string>,
): Promise<void> {
  const stored = reel as unknown as { _spinCallback?: () => void };
  if (stored._spinCallback) {
    ticker.remove(stored._spinCallback);
    delete stored._spinCallback;
  }

  const strip = reel.children[0] as Container;
  for (let i = 0; i < finalSymbols.length; i++) {
    const cell = strip.children[i] as Container;
    const symbolId = finalSymbols[i]!;
    updateSymbolCell(cell, symbolId, badgeMap?.get(symbolId));
  }

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
