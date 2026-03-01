import type { ReelStrip } from "@slot-engine/shared";
import type { RandomNumberGenerator } from "./rng.js";

export function selectWeightedSymbol(reel: ReelStrip, rng: RandomNumberGenerator): string {
  let totalWeight = 0;
  for (const entry of reel) {
    totalWeight += entry.weight;
  }
  const roll = rng.nextInt(0, totalWeight);
  let cumulative = 0;
  for (const entry of reel) {
    cumulative += entry.weight;
    if (roll < cumulative) return entry.symbolId;
  }
  return reel[reel.length - 1]!.symbolId;
}

export function spinReels(
  reels: readonly ReelStrip[],
  rows: number,
  rng: RandomNumberGenerator,
): readonly (readonly string[])[] {
  const grid: string[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowSymbols: string[] = [];
    for (const reel of reels) {
      rowSymbols.push(selectWeightedSymbol(reel, rng));
    }
    grid.push(rowSymbols);
  }
  return grid;
}
