import { describe, it, expect } from "vitest";
import type { ScatterRule } from "@slot-engine/shared";
import { evaluateScatters } from "../scatter-evaluator.js";

const SCATTER_RULES: readonly ScatterRule[] = [
  { symbolId: "scatter", count: 3, multiplier: 5, freeSpins: 10 },
  { symbolId: "scatter", count: 4, multiplier: 20, freeSpins: 15 },
  { symbolId: "scatter", count: 5, multiplier: 100, freeSpins: 20 },
];

const SCATTER_IDS = new Set(["scatter"]);

describe("evaluateScatters", () => {
  it("returns empty result when no scatters on grid", () => {
    const grid = [
      ["cherry", "bar", "seven"],
      ["bar", "cherry", "bar"],
      ["seven", "bar", "cherry"],
    ];

    const result = evaluateScatters(grid, SCATTER_RULES, 10, SCATTER_IDS);

    expect(result.wins).toHaveLength(0);
    expect(result.freeSpinsAwarded).toBe(0);
  });

  it("returns empty result when scatter count below minimum rule", () => {
    const grid = [
      ["scatter", "bar", "seven"],
      ["bar", "scatter", "bar"],
      ["seven", "bar", "cherry"],
    ];

    const result = evaluateScatters(grid, SCATTER_RULES, 10, SCATTER_IDS);

    expect(result.wins).toHaveLength(0);
    expect(result.freeSpinsAwarded).toBe(0);
  });

  it("awards correct payout and free spins for 3 scatters", () => {
    const grid = [
      ["scatter", "bar", "scatter"],
      ["bar", "scatter", "bar"],
      ["seven", "bar", "cherry"],
    ];

    const result = evaluateScatters(grid, SCATTER_RULES, 10, SCATTER_IDS);

    expect(result.wins).toHaveLength(1);
    expect(result.wins[0]!.paylineIndex).toBe(-1);
    expect(result.wins[0]!.symbolId).toBe("scatter");
    expect(result.wins[0]!.payout).toBe(50); // 10 * 5
    expect(result.freeSpinsAwarded).toBe(10);
  });

  it("awards correct payout for 4 scatters", () => {
    const grid = [
      ["scatter", "scatter", "seven"],
      ["bar", "scatter", "bar"],
      ["scatter", "bar", "cherry"],
    ];

    const result = evaluateScatters(grid, SCATTER_RULES, 25, SCATTER_IDS);

    expect(result.wins).toHaveLength(1);
    expect(result.wins[0]!.payout).toBe(500); // 25 * 20
    expect(result.freeSpinsAwarded).toBe(15);
  });

  it("awards correct payout for 5 scatters", () => {
    const grid = [
      ["scatter", "scatter", "scatter"],
      ["bar", "scatter", "scatter"],
      ["cherry", "bar", "cherry"],
    ];

    const result = evaluateScatters(grid, SCATTER_RULES, 10, SCATTER_IDS);

    expect(result.wins).toHaveLength(1);
    expect(result.wins[0]!.payout).toBe(1000); // 10 * 100
    expect(result.freeSpinsAwarded).toBe(20);
  });

  it("returns empty result when scatter rules array is empty", () => {
    const grid = [
      ["scatter", "scatter", "scatter"],
      ["bar", "cherry", "bar"],
      ["seven", "bar", "cherry"],
    ];

    const result = evaluateScatters(grid, [], 10, SCATTER_IDS);

    expect(result.wins).toHaveLength(0);
    expect(result.freeSpinsAwarded).toBe(0);
  });

  it("returns empty result when scatterIds set is empty", () => {
    const grid = [
      ["scatter", "scatter", "scatter"],
      ["bar", "cherry", "bar"],
      ["seven", "bar", "cherry"],
    ];

    const result = evaluateScatters(grid, SCATTER_RULES, 10, new Set());

    expect(result.wins).toHaveLength(0);
    expect(result.freeSpinsAwarded).toBe(0);
  });

  it("awards free spins without payout when multiplier is 0", () => {
    const freeSpinsOnlyRules: readonly ScatterRule[] = [
      { symbolId: "scatter", count: 3, multiplier: 0, freeSpins: 8 },
    ];

    const grid = [
      ["scatter", "bar", "scatter"],
      ["bar", "scatter", "bar"],
      ["seven", "bar", "cherry"],
    ];

    const result = evaluateScatters(grid, freeSpinsOnlyRules, 10, SCATTER_IDS);

    expect(result.wins).toHaveLength(0); // No win entry since multiplier is 0
    expect(result.freeSpinsAwarded).toBe(8);
  });
});
