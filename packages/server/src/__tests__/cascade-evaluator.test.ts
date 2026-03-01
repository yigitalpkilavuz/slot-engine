import { describe, it, expect } from "vitest";
import type { Payline, PayoutRule, SymbolDefinition } from "@slot-engine/shared";
import { evaluateCascades } from "../cascade-evaluator.js";
import { FixedRng } from "./helpers.js";

const SYMBOLS: readonly SymbolDefinition[] = [
  { id: "cherry", name: "Cherry" },
  { id: "bar", name: "Bar" },
  { id: "seven", name: "Seven" },
];

const PAYLINES: readonly Payline[] = [[0, 0, 0]];

const PAYOUTS: readonly PayoutRule[] = [
  { symbolId: "cherry", count: 3, multiplier: 10 },
  { symbolId: "bar", count: 3, multiplier: 20 },
  { symbolId: "seven", count: 3, multiplier: 50 },
];

const REELS = [
  ["cherry", "bar", "seven"],
  ["cherry", "bar", "seven"],
  ["cherry", "bar", "seven"],
];

const NO_WILDS = new Set<string>();

describe("evaluateCascades", () => {
  it("returns no wins when initial grid has no match", () => {
    const grid = [
      ["cherry", "bar", "seven"],
      ["bar", "seven", "cherry"],
      ["seven", "cherry", "bar"],
    ];

    const rng = new FixedRng([0]);
    const result = evaluateCascades(grid, PAYLINES, PAYOUTS, 10, NO_WILDS, SYMBOLS, REELS, rng);

    expect(result.allWins).toHaveLength(0);
    expect(result.totalPayout).toBe(0);
    expect(result.cascadeSteps).toHaveLength(0);
    expect(result.finalGrid).toEqual(grid);
  });

  it("handles single cascade step (one win, no further wins)", () => {
    const grid = [
      ["cherry", "cherry", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    // After removing row 0 cherry×3, fill with [0, 1, 2] → cherry, bar, seven (no match)
    const rng = new FixedRng([0, 1, 2]);
    const result = evaluateCascades(grid, PAYLINES, PAYOUTS, 10, NO_WILDS, SYMBOLS, REELS, rng);

    expect(result.allWins).toHaveLength(1);
    expect(result.allWins[0]!.symbolId).toBe("cherry");
    expect(result.totalPayout).toBe(100); // 10 * 10
    expect(result.cascadeSteps).toHaveLength(1);
    expect(result.cascadeSteps[0]!.payout).toBe(100);
  });

  it("handles chain of 2 cascades with accumulated payout", () => {
    const grid = [
      ["cherry", "cherry", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    // 1st cascade fill: bar, bar, bar → bar×3 win (200)
    // 2nd cascade fill: cherry, bar, seven → no win
    const rng = new FixedRng([1, 1, 1, 0, 1, 2]);
    const result = evaluateCascades(grid, PAYLINES, PAYOUTS, 10, NO_WILDS, SYMBOLS, REELS, rng);

    expect(result.allWins).toHaveLength(2);
    expect(result.allWins[0]!.symbolId).toBe("cherry");
    expect(result.allWins[1]!.symbolId).toBe("bar");
    expect(result.totalPayout).toBe(300); // 100 + 200
    expect(result.cascadeSteps).toHaveLength(2);
    expect(result.cascadeSteps[0]!.payout).toBe(100);
    expect(result.cascadeSteps[1]!.payout).toBe(200);
  });

  it("shifts surviving symbols down after removal", () => {
    const grid = [
      ["cherry", "cherry", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    // Fill row 0 with cherry, bar, seven → no further wins
    const rng = new FixedRng([0, 1, 2]);
    const result = evaluateCascades(grid, PAYLINES, PAYOUTS, 10, NO_WILDS, SYMBOLS, REELS, rng);

    // After cascade: row 0 = filled, row 1 = bar, row 2 = seven (shifted down from original)
    expect(result.finalGrid[1]).toEqual(["bar", "bar", "bar"]);
    expect(result.finalGrid[2]).toEqual(["seven", "seven", "seven"]);
  });

  it("each cascade step records the grid at that step", () => {
    const grid = [
      ["cherry", "cherry", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const rng = new FixedRng([1, 1, 1, 0, 1, 2]);
    const result = evaluateCascades(grid, PAYLINES, PAYOUTS, 10, NO_WILDS, SYMBOLS, REELS, rng);

    // First step's grid is the original grid
    expect(result.cascadeSteps[0]!.grid).toEqual(grid);
    // Second step's grid has bar×3 in row 0
    expect(result.cascadeSteps[1]!.grid[0]).toEqual(["bar", "bar", "bar"]);
  });

  it("works with wilds in cascade", () => {
    const wildSymbols: readonly SymbolDefinition[] = [
      ...SYMBOLS,
      { id: "wild", name: "Wild", wild: true },
    ];
    const wildIds = new Set(["wild"]);
    const reelsWithWild = [
      ["cherry", "bar", "seven", "wild"],
      ["cherry", "bar", "seven", "wild"],
      ["cherry", "bar", "seven", "wild"],
    ];

    // Grid: cherry, wild, cherry → cherry×3 with wild sub
    const grid = [
      ["cherry", "wild", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    // Fill with [0, 1, 2] → cherry, bar, seven → no match
    const rng = new FixedRng([0, 1, 2]);
    const result = evaluateCascades(
      grid, PAYLINES, PAYOUTS, 10, wildIds, wildSymbols, reelsWithWild, rng,
    );

    expect(result.allWins).toHaveLength(1);
    expect(result.allWins[0]!.symbolId).toBe("cherry");
    expect(result.totalPayout).toBe(100);
  });
});
