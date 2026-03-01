import { describe, it, expect } from "vitest";
import type { GameConfig } from "@slot-engine/shared";
import { runFreeSpinRound } from "../free-spin-loop.js";
import { SeededRng } from "../seeded-rng.js";

const MINI_CONFIG: GameConfig = {
  id: "test-mini",
  name: "Test Mini",
  rows: 1,
  symbols: [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "wild", name: "Wild", wild: true },
  ],
  reels: [
    [{ symbolId: "a", weight: 1 }, { symbolId: "b", weight: 1 }, { symbolId: "wild", weight: 1 }],
    [{ symbolId: "a", weight: 1 }, { symbolId: "b", weight: 1 }, { symbolId: "wild", weight: 1 }],
    [{ symbolId: "a", weight: 1 }, { symbolId: "b", weight: 1 }, { symbolId: "wild", weight: 1 }],
  ],
  paylines: [[0, 0, 0]],
  payouts: [
    { symbolId: "a", count: 3, multiplier: 5 },
    { symbolId: "b", count: 3, multiplier: 10 },
  ],
  betOptions: [100],
  defaultBet: 100,
};

describe("runFreeSpinRound", () => {
  it("returns zero for zero initial free spins", () => {
    const rng = new SeededRng(42);
    const result = runFreeSpinRound(MINI_CONFIG, 100, 0, undefined, rng);

    expect(result.totalPayout).toBe(0);
    expect(result.totalSpins).toBe(0);
  });

  it("runs the correct number of spins", () => {
    const rng = new SeededRng(42);
    const result = runFreeSpinRound(MINI_CONFIG, 100, 5, undefined, rng);

    expect(result.totalSpins).toBe(5);
    expect(result.totalPayout).toBeGreaterThanOrEqual(0);
  });

  it("produces deterministic results with same seed", () => {
    const result1 = runFreeSpinRound(MINI_CONFIG, 100, 10, undefined, new SeededRng(99));
    const result2 = runFreeSpinRound(MINI_CONFIG, 100, 10, undefined, new SeededRng(99));

    expect(result1.totalPayout).toBe(result2.totalPayout);
    expect(result1.totalSpins).toBe(result2.totalSpins);
  });

  it("accumulates payouts across spins", () => {
    const rng = new SeededRng(42);
    const result = runFreeSpinRound(MINI_CONFIG, 100, 100, undefined, rng);

    // With 100 spins on a small config, we should get at least some wins
    expect(result.totalSpins).toBe(100);
    expect(result.totalPayout).toBeGreaterThan(0);
  });
});
