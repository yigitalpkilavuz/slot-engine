import { describe, it, expect } from "vitest";
import type { Payline, PayoutRule } from "@slot-engine/shared";
import { evaluateWins } from "../win-evaluator.js";

const PAYLINES: readonly Payline[] = [
  [1, 1, 1],
  [0, 0, 0],
];

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

    const wins = evaluateWins(grid, PAYLINES, PAYOUTS, 100);
    expect(wins).toHaveLength(0);
  });

  it("detects 3-of-a-kind on a payline", () => {
    const grid = [
      ["bar", "bar", "bar"],
      ["cherry", "cherry", "cherry"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, PAYLINES, PAYOUTS, 100);
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

    const wins = evaluateWins(grid, [[1, 1, 1]], PAYOUTS, 100);
    expect(wins[0]!.payout).toBe(1000);
    expect(wins[0]!.count).toBe(3);
  });

  it("counts consecutive symbols from left only", () => {
    const grid = [
      ["cherry", "bar", "cherry"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100);
    expect(wins).toHaveLength(0);
  });

  it("detects partial matches (2-of-a-kind)", () => {
    const grid = [
      ["cherry", "cherry", "bar"],
      ["bar", "bar", "bar"],
      ["seven", "seven", "seven"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100);
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

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 50);
    expect(wins[0]!.payout).toBe(2500);
  });

  it("detects wins on multiple paylines", () => {
    const grid = [
      ["cherry", "cherry", "cherry"],
      ["cherry", "cherry", "cherry"],
      ["bar", "bar", "bar"],
    ];

    const wins = evaluateWins(grid, PAYLINES, PAYOUTS, 100);
    expect(wins).toHaveLength(2);
  });

  it("returns no win when matched symbol has no payout rule", () => {
    const grid = [
      ["bar", "bar", "bar"],
      ["bar", "bar", "bar"],
      ["bar", "bar", "bar"],
    ];

    const wins = evaluateWins(grid, [[0, 0, 0]], PAYOUTS, 100);
    expect(wins).toHaveLength(0);
  });
});
