import { describe, it, expect } from "vitest";
import type { ReelStrip } from "@slot-engine/shared";
import { spinReels, selectWeightedSymbol } from "../reel-spinner.js";
import { FixedRng } from "./helpers.js";

const REELS: readonly ReelStrip[] = [
  [
    { symbolId: "cherry", weight: 3 },
    { symbolId: "bar", weight: 1 },
    { symbolId: "seven", weight: 1 },
  ],
  [
    { symbolId: "bar", weight: 2 },
    { symbolId: "seven", weight: 2 },
    { symbolId: "cherry", weight: 1 },
  ],
  [
    { symbolId: "seven", weight: 1 },
    { symbolId: "cherry", weight: 2 },
    { symbolId: "bar", weight: 2 },
  ],
];

describe("selectWeightedSymbol", () => {
  it("returns the only symbol for a single-entry reel", () => {
    const reel: ReelStrip = [{ symbolId: "cherry", weight: 5 }];
    const rng = new FixedRng([0]);
    expect(selectWeightedSymbol(reel, rng)).toBe("cherry");
  });

  it("selects based on cumulative weight", () => {
    const reel: ReelStrip = [
      { symbolId: "cherry", weight: 1 },
      { symbolId: "bar", weight: 1 },
      { symbolId: "seven", weight: 1 },
    ];
    // roll=0 → cherry (cumulative 1 > 0), roll=1 → bar (cumulative 2 > 1), roll=2 → seven
    const rng0 = new FixedRng([0]);
    expect(selectWeightedSymbol(reel, rng0)).toBe("cherry");
    const rng1 = new FixedRng([1]);
    expect(selectWeightedSymbol(reel, rng1)).toBe("bar");
    const rng2 = new FixedRng([2]);
    expect(selectWeightedSymbol(reel, rng2)).toBe("seven");
  });
});

describe("spinReels", () => {
  it("generates a grid with correct dimensions", () => {
    const rng = new FixedRng([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const grid = spinReels(REELS, 3, rng);

    expect(grid).toHaveLength(3);
    for (const row of grid) {
      expect(row).toHaveLength(3);
    }
  });

  it("only produces symbols from the reel definitions", () => {
    const rng = new FixedRng([0, 1, 2, 3, 4, 0, 1, 2, 3]);
    const grid = spinReels(REELS, 3, rng);

    const validSymbols = new Set(["cherry", "bar", "seven"]);
    for (const row of grid) {
      for (const sym of row) {
        expect(validSymbols.has(sym)).toBe(true);
      }
    }
  });

  it("respects weight distribution over many draws", () => {
    // Reel 0: cherry=3, bar=1, seven=1 (total=5)
    // Over 1000 draws, cherry should appear ~60% of the time
    const counts: Record<string, number> = { cherry: 0, bar: 0, seven: 0 };
    const draws = 1000;
    // Generate sequential values 0-4 repeating
    const values = Array.from({ length: draws }, (_, i) => i % 5);
    const rng = new FixedRng(values);
    const reel = REELS[0]!;
    for (let i = 0; i < draws; i++) {
      const sym = selectWeightedSymbol(reel, rng);
      counts[sym]!++;
    }
    expect(counts["cherry"]).toBe(600);
    expect(counts["bar"]).toBe(200);
    expect(counts["seven"]).toBe(200);
  });
});
