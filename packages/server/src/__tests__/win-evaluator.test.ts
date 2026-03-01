import { describe, it, expect } from "vitest";
import type { Payline, PayoutRule, SymbolDefinition } from "@slot-engine/shared";
import { evaluateWins } from "../win-evaluator.js";

const PAYLINES: readonly Payline[] = [
  [1, 1, 1],
  [0, 0, 0],
];

const NO_WILDS = new Set<string>();

const PAYOUTS: readonly PayoutRule[] = [
  { symbolId: "cherry", count: 2, multiplier: 2 },
  { symbolId: "cherry", count: 3, multiplier: 10 },
  { symbolId: "seven", count: 3, multiplier: 50 },
];

describe("evaluateWins", () => {
  it("returns no wins when no payline matches", () => {
    const grid = [
      ["cherry", "bar", "seven"],
      ["bar", "cherry", "bar"],
      ["seven", "bar", "cherry"],
    ];

    const wins = evaluateWins(grid, PAYLINES, PAYOUTS, 100, NO_WILDS);
    expect(wins).toHaveLength(0);
  });

  it("detects 3-of-a-kind on a payline", () => {
    const grid = [
      ["bar", "bar", "bar"],
      ["cherry", "cherry", "cherry"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, PAYLINES, PAYOUTS, 100, NO_WILDS);
    expect(wins).toHaveLength(1);
    expect(wins[0]).toEqual({
      paylineIndex: 0,
      symbolId: "cherry",
      count: 3,
      payout: 1000,
    });
  });

  it("picks the best payout when multiple counts match", () => {
    const grid = [
      ["bar", "bar", "bar"],
      ["cherry", "cherry", "cherry"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[1, 1, 1]], PAYOUTS, 100, NO_WILDS);
    expect(wins[0]!.payout).toBe(1000);
    expect(wins[0]!.count).toBe(3);
  });

  it("counts consecutive symbols from left only", () => {
    const grid = [
      ["cherry", "bar", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, NO_WILDS);
    expect(wins).toHaveLength(0);
  });

  it("detects partial matches (2-of-a-kind)", () => {
    const grid = [
      ["cherry", "cherry", "bar"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, NO_WILDS);
    expect(wins).toHaveLength(1);
    expect(wins[0]).toEqual({
      paylineIndex: 0,
      symbolId: "cherry",
      count: 2,
      payout: 200,
    });
  });

  it("calculates payout as bet * multiplier (integer math)", () => {
    const grid = [
      ["seven", "seven", "seven"],
      ["bar", "bar", "bar"],
      ["cherry", "cherry", "cherry"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 50, NO_WILDS);
    expect(wins[0]!.payout).toBe(2500);
  });

  it("detects wins on multiple paylines", () => {
    const grid = [
      ["cherry", "cherry", "cherry"],
      ["cherry", "cherry", "cherry"],
      ["bar", "bar", "bar"],
    ];

    const wins = evaluateWins(grid, PAYLINES, PAYOUTS, 100, NO_WILDS);
    expect(wins).toHaveLength(2);
  });

  it("returns no win when matched symbol has no payout rule", () => {
    const grid = [
      ["bar", "bar", "bar"],
      ["bar", "bar", "bar"],
      ["bar", "bar", "bar"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, NO_WILDS);
    expect(wins).toHaveLength(0);
  });
});

const WILD_IDS = new Set(["wild"]);

describe("evaluateWins with wilds", () => {
  it("wild substitutes for matching symbol in the middle", () => {
    const grid = [
      ["cherry", "wild", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, WILD_IDS);
    expect(wins).toHaveLength(1);
    expect(wins[0]!.symbolId).toBe("cherry");
    expect(wins[0]!.count).toBe(3);
    expect(wins[0]!.payout).toBe(1000);
  });

  it("wild at start uses first non-wild as base symbol", () => {
    const grid = [
      ["wild", "cherry", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, WILD_IDS);
    expect(wins).toHaveLength(1);
    expect(wins[0]!.symbolId).toBe("cherry");
    expect(wins[0]!.count).toBe(3);
  });

  it("multiple consecutive wilds count toward match", () => {
    const grid = [
      ["cherry", "wild", "wild"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, WILD_IDS);
    expect(wins).toHaveLength(1);
    expect(wins[0]!.symbolId).toBe("cherry");
    expect(wins[0]!.count).toBe(3);
  });

  it("all wilds produces no win", () => {
    const grid = [
      ["wild", "wild", "wild"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, WILD_IDS);
    expect(wins).toHaveLength(0);
  });

  it("wild breaks on non-matching symbol", () => {
    const grid = [
      ["cherry", "wild", "bar"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, WILD_IDS);
    expect(wins).toHaveLength(1);
    expect(wins[0]!.symbolId).toBe("cherry");
    expect(wins[0]!.count).toBe(2);
    expect(wins[0]!.payout).toBe(200);
  });

  it("wild at start followed by different non-wilds uses first non-wild", () => {
    const grid = [
      ["wild", "wild", "seven"],
      ["bar", "bar", "bar"],
      ["cherry", "cherry", "cherry"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, WILD_IDS);
    expect(wins).toHaveLength(1);
    expect(wins[0]!.symbolId).toBe("seven");
    expect(wins[0]!.count).toBe(3);
  });
});

const MULTIPLIER_SYMBOLS: readonly SymbolDefinition[] = [
  { id: "cherry", name: "Cherry" },
  { id: "bar", name: "Bar" },
  { id: "seven", name: "Seven" },
  { id: "wild", name: "Wild", wild: true, wildMultiplier: 2 },
];

const MULTI_WILD_SYMBOLS: readonly SymbolDefinition[] = [
  { id: "cherry", name: "Cherry" },
  { id: "seven", name: "Seven" },
  { id: "wild", name: "Wild", wild: true, wildMultiplier: 3 },
];

describe("evaluateWins with multiplier wilds", () => {
  it("single 2x wild doubles the payout", () => {
    const grid = [
      ["cherry", "wild", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, WILD_IDS, MULTIPLIER_SYMBOLS);
    expect(wins).toHaveLength(1);
    expect(wins[0]!.symbolId).toBe("cherry");
    expect(wins[0]!.count).toBe(3);
    // bet(100) * multiplier(10) * wildMultiplier(2) = 2000
    expect(wins[0]!.payout).toBe(2000);
  });

  it("two 3x wilds multiply together (3 * 3 = 9x)", () => {
    const grid = [
      ["cherry", "wild", "wild"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, WILD_IDS, MULTI_WILD_SYMBOLS);
    expect(wins).toHaveLength(1);
    expect(wins[0]!.symbolId).toBe("cherry");
    expect(wins[0]!.count).toBe(3);
    // bet(100) * multiplier(10) * wildMultiplier(3*3=9) = 9000
    expect(wins[0]!.payout).toBe(9000);
  });

  it("wild without wildMultiplier field is treated as 1x", () => {
    const symbolsNoMultiplier: readonly SymbolDefinition[] = [
      { id: "cherry", name: "Cherry" },
      { id: "wild", name: "Wild", wild: true },
    ];

    const grid = [
      ["cherry", "wild", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, WILD_IDS, symbolsNoMultiplier);
    expect(wins).toHaveLength(1);
    // bet(100) * multiplier(10) * wildMultiplier(1) = 1000 (unchanged)
    expect(wins[0]!.payout).toBe(1000);
  });

  it("backward compat: no symbols param defaults to 1x multiplier", () => {
    const grid = [
      ["cherry", "wild", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    // Calling without symbols argument (existing test pattern)
    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100, WILD_IDS);
    expect(wins).toHaveLength(1);
    expect(wins[0]!.payout).toBe(1000);
  });

  it("multiplier wild uses Math.floor to truncate fractional payouts", () => {
    // Two 1.5x wilds: bet(7) * multiplier(10) * (1.5*1.5=2.25) = 157.5 → 157
    const symbols: readonly SymbolDefinition[] = [
      { id: "seven", name: "Seven" },
      { id: "wild", name: "Wild", wild: true, wildMultiplier: 1.5 },
    ];

    const grid = [
      ["wild", "wild", "seven"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const payouts: readonly import("@slot-engine/shared").PayoutRule[] = [
      { symbolId: "seven", count: 3, multiplier: 10 },
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], payouts, 7, WILD_IDS, symbols);
    expect(wins).toHaveLength(1);
    expect(wins[0]!.payout).toBe(157);
  });
});
