import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";
import type { SymbolDefinition } from "@slot-engine/shared";
import { createSymbolCell, updateSymbolCell, CELL_HEIGHT, CELL_WIDTH } from "./symbol-cell.js";
import { easeOutBack, easeOutCubic } from "./design-tokens.js";

export const CELL_GAP = 10;
const STEP = CELL_HEIGHT + CELL_GAP;
const SCROLL_SPEED = 1800;

const DECEL_EXTRA_CELLS = 2;
const BOUNCE_DURATION_MS = 250;
const BOUNCE_OFFSET = -(STEP * 0.5);

interface SpinState {
  callback: () => void;
  mask: Graphics;
  wrapCount: number;
  gameSymbols: readonly SymbolDefinition[];
}

export function createReelColumn(rowCount: number): Container {
  const reel = new Container();

  const strip = new Container();
  reel.addChild(strip);

  for (let row = 0; row < rowCount; row++) {
    const cell = createSymbolCell("cherry");
    cell.y = row * STEP;
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
  const rowCount = strip.children.length;

  // Buffer cell above visible area for seamless scroll-in
  const bufferCell = createSymbolCell(
    gameSymbols[Math.floor(Math.random() * gameSymbols.length)]!.id,
  );
  bufferCell.y = -STEP;
  strip.addChildAt(bufferCell, 0);

  // Mask clips rendering to the visible reel area
  const visibleHeight = rowCount * CELL_HEIGHT + (rowCount - 1) * CELL_GAP;
  const mask = new Graphics();
  mask.rect(0, 0, CELL_WIDTH, visibleHeight);
  mask.fill({ color: 0xffffff });
  reel.addChild(mask);
  reel.mask = mask;

  let wrapCount = 0;

  const callback = (): void => {
    strip.y += SCROLL_SPEED * ticker.deltaMS / 1000;

    const newWrapCount = Math.floor(strip.y / STEP);
    while (wrapCount < newWrapCount) {
      wrapCount++;

      // Recycle the bottom-most cell to the top
      let bottomChild: Container | null = null;
      let maxY = -Infinity;
      let topY = Infinity;
      for (const child of strip.children) {
        if (child.y > maxY) { maxY = child.y; bottomChild = child as Container; }
        if (child.y < topY) topY = child.y;
      }
      if (bottomChild) {
        bottomChild.y = topY - STEP;
        const randomId = gameSymbols[Math.floor(Math.random() * gameSymbols.length)]!.id;
        updateSymbolCell(bottomChild, randomId);
      }
    }
  };

  (reel as unknown as { _spinState: SpinState })._spinState = {
    callback, mask, wrapCount, gameSymbols,
  };
  ticker.add(callback);
}

export function stopReelSpin(
  reel: Container,
  finalSymbols: readonly string[],
  ticker: Ticker,
  badgeMap?: ReadonlyMap<string, string>,
): Promise<void> {
  const stored = reel as unknown as { _spinState?: SpinState };

  if (!stored._spinState) {
    const strip = reel.children[0] as Container;
    for (let i = 0; i < finalSymbols.length; i++) {
      updateSymbolCell(strip.children[i] as Container, finalSymbols[i]!, badgeMap?.get(finalSymbols[i]!));
    }
    return Promise.resolve();
  }

  const { callback, mask, gameSymbols } = stored._spinState;
  ticker.remove(callback);

  const strip = reel.children[0] as Container;
  const rowCount = finalSymbols.length;

  // Destroy old cells
  const removed = strip.removeChildren();
  for (const child of removed) {
    child.destroy({ children: true });
  }

  // Build deceleration strip: finals (top) → extra fillers → visible fillers (bottom)
  // strip.y starts negative; as it increases toward 0, top cells scroll into view.
  const scrollCells = rowCount + DECEL_EXTRA_CELLS;
  const scrollDistance = scrollCells * STEP;

  // easeOutCubic derivative at t=0 is 3, so initial speed = scrollDistance * 3 / duration.
  // Match spin speed for seamless transition: duration = scrollDistance * 3 / SCROLL_SPEED.
  const decelDuration = scrollDistance * 3 / SCROLL_SPEED;

  // Final symbols — will end up as the visible cells at strip.y = 0
  for (let i = 0; i < rowCount; i++) {
    const symbolId = finalSymbols[i]!;
    const cell = createSymbolCell(symbolId, badgeMap?.get(symbolId));
    cell.y = i * STEP;
    strip.addChild(cell);
  }

  // Extra filler cells — scroll through during deceleration
  for (let i = 0; i < DECEL_EXTRA_CELLS; i++) {
    const randomId = gameSymbols[Math.floor(Math.random() * gameSymbols.length)]!.id;
    const cell = createSymbolCell(randomId);
    cell.y = (rowCount + i) * STEP;
    strip.addChild(cell);
  }

  // Visible filler cells — currently in view, will scroll out at the bottom
  for (let i = 0; i < rowCount; i++) {
    const randomId = gameSymbols[Math.floor(Math.random() * gameSymbols.length)]!.id;
    const cell = createSymbolCell(randomId);
    cell.y = (scrollCells + i) * STEP;
    strip.addChild(cell);
  }

  // Position so visible fillers fill the mask area
  strip.y = -scrollDistance;

  return new Promise((resolve) => {
    const startTime = performance.now();

    const decelCallback = (): void => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / decelDuration, 1);
      strip.y = -scrollDistance * (1 - easeOutCubic(t));

      if (t >= 1) {
        strip.y = 0;
        ticker.remove(decelCallback);

        // Remove mask
        reel.mask = null;
        reel.removeChild(mask);
        mask.destroy();
        delete stored._spinState;

        // Remove filler cells, keep only finals
        while (strip.children.length > rowCount) {
          const last = strip.children[strip.children.length - 1]!;
          strip.removeChild(last);
          last.destroy({ children: true });
        }

        // Landing bounce
        strip.y = BOUNCE_OFFSET;
        const bounceStart = performance.now();
        const bounceCallback = (): void => {
          const be = performance.now() - bounceStart;
          const bt = Math.min(be / BOUNCE_DURATION_MS, 1);
          strip.y = BOUNCE_OFFSET * (1 - easeOutBack(bt));
          if (bt >= 1) {
            strip.y = 0;
            ticker.remove(bounceCallback);
            resolve();
          }
        };
        ticker.add(bounceCallback);
      }
    };

    ticker.add(decelCallback);
  });
}
