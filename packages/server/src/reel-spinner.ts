import type { ReelStrip } from "@slot-engine/shared";
import type { RandomNumberGenerator } from "./rng.js";

export function spinReels(
  reels: readonly ReelStrip[],
  rows: number,
  rng: RandomNumberGenerator,
): readonly (readonly string[])[] {
  const stopPositions = reels.map((reel) => rng.nextInt(0, reel.length));

  const grid: string[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowSymbols: string[] = [];
    for (let reelIndex = 0; reelIndex < reels.length; reelIndex++) {
      const reel = reels[reelIndex]!;
      const stop = stopPositions[reelIndex]!;
      const symbolIndex = (stop + row) % reel.length;
      rowSymbols.push(reel[symbolIndex]!);
    }
    grid.push(rowSymbols);
  }

  return grid;
}
