import { describe, it, expect } from "vitest";
import {
  createAccumulator,
  recordBaseSpinRound,
  computeVolatility,
} from "../metrics-accumulator.js";

describe("MetricsAccumulator", () => {
  it("tracks basic payout stats", () => {
    const acc = createAccumulator();
    recordBaseSpinRound(acc, 200, 0, false, 0, 100);
    recordBaseSpinRound(acc, 0, 0, false, 0, 100);
    recordBaseSpinRound(acc, 50, 0, false, 0, 100);

    expect(acc.totalBaseSpins).toBe(3);
    expect(acc.totalPayout).toBe(250);
    expect(acc.baseGamePayout).toBe(250);
    expect(acc.freeSpinPayout).toBe(0);
    expect(acc.winningBaseSpins).toBe(2);
  });

  it("tracks free spin triggers", () => {
    const acc = createAccumulator();
    recordBaseSpinRound(acc, 100, 500, true, 10, 100);
    recordBaseSpinRound(acc, 0, 0, false, 0, 100);
    recordBaseSpinRound(acc, 50, 300, true, 8, 100);

    expect(acc.freeSpinTriggers).toBe(2);
    expect(acc.totalFreeSpinsAwarded).toBe(18);
    expect(acc.totalBonusRoundPayout).toBe(800);
    expect(acc.freeSpinPayout).toBe(800);
    expect(acc.baseGamePayout).toBe(150);
    expect(acc.totalPayout).toBe(950);
  });

  it("computes volatility using Welford's algorithm", () => {
    const acc = createAccumulator();
    // Return ratios: 0, 2, 0, 2, 0 → mean=0.8, variance should be > 0
    recordBaseSpinRound(acc, 0, 0, false, 0, 100);
    recordBaseSpinRound(acc, 200, 0, false, 0, 100);
    recordBaseSpinRound(acc, 0, 0, false, 0, 100);
    recordBaseSpinRound(acc, 200, 0, false, 0, 100);
    recordBaseSpinRound(acc, 0, 0, false, 0, 100);

    const vol = computeVolatility(acc);
    expect(vol).toBeGreaterThan(0);

    // Manually: values [0,2,0,2,0], mean=0.8
    // Variance = ((0-0.8)^2 + (2-0.8)^2 + (0-0.8)^2 + (2-0.8)^2 + (0-0.8)^2) / 4
    //          = (0.64 + 1.44 + 0.64 + 1.44 + 0.64) / 4 = 4.8 / 4 = 1.2
    // StdDev = sqrt(1.2) ≈ 1.0954
    expect(vol).toBeCloseTo(1.0954, 3);
  });

  it("returns 0 volatility for single data point", () => {
    const acc = createAccumulator();
    recordBaseSpinRound(acc, 100, 0, false, 0, 100);
    expect(computeVolatility(acc)).toBe(0);
  });

  it("returns 0 volatility for no data", () => {
    const acc = createAccumulator();
    expect(computeVolatility(acc)).toBe(0);
  });
});
