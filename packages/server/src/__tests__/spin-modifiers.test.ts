import { describe, it, expect } from "vitest";
import type { GameConfig } from "@slot-engine/shared";
import { spin } from "../spin.js";
import type { RandomNumberGenerator } from "../rng.js";

function seededRng(seed: number): RandomNumberGenerator {
  let state = seed;
  return {
    nextInt(min: number, max: number): number {
      // Simple LCG for deterministic tests
      state = (state * 1664525 + 1013904223) & 0x7fffffff;
      return min + (state % (max - min));
    },
  };
}

const BASE_CONFIG: GameConfig = {
  id: "test",
  name: "Test",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
    { id: "wild", name: "Wild", wild: true },
    { id: "scatter", name: "Scatter", scatter: true },
  ],
  reels: [
    [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 2 }, { symbolId: "wild", weight: 1 }, { symbolId: "scatter", weight: 1 }],
    [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 2 }, { symbolId: "wild", weight: 1 }, { symbolId: "scatter", weight: 1 }],
    [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 2 }, { symbolId: "wild", weight: 1 }, { symbolId: "scatter", weight: 1 }],
  ],
  paylines: [[0, 0, 0], [1, 1, 1], [2, 2, 2]],
  payouts: [
    { symbolId: "cherry", count: 3, multiplier: 10 },
    { symbolId: "bar", count: 3, multiplier: 20 },
  ],
  scatterRules: [
    { symbolId: "scatter", count: 3, multiplier: 5, freeSpins: 10 },
  ],
  betOptions: [10, 50],
  defaultBet: 10,
};

describe("spin with free spin modifiers", () => {
  it("does not apply modifiers during normal spins", () => {
    const config: GameConfig = {
      ...BASE_CONFIG,
      freeSpinModifiers: [
        { type: "increasingMultiplier", startMultiplier: 5, increment: 1 },
      ],
    };

    const result = spin(config, 10, seededRng(42), false, false);
    // Modifiers should NOT be applied — no freeSpinModifierStates
    expect(result.freeSpinModifierStates).toBeUndefined();
  });

  it("applies increasing multiplier during free spin mode", () => {
    const config: GameConfig = {
      ...BASE_CONFIG,
      freeSpinModifiers: [
        { type: "increasingMultiplier", startMultiplier: 2, increment: 1 },
      ],
    };

    const result = spin(config, 10, seededRng(42), false, true);
    expect(result.freeSpinModifierStates).toBeDefined();

    const multState = result.freeSpinModifierStates!.find(
      (s) => s.type === "increasingMultiplier",
    );
    expect(multState).toBeDefined();
    expect((multState as { currentMultiplier: number }).currentMultiplier).toBe(2);
  });

  it("increments multiplier across spins via previous states", () => {
    const config: GameConfig = {
      ...BASE_CONFIG,
      freeSpinModifiers: [
        { type: "increasingMultiplier", startMultiplier: 1, increment: 1 },
      ],
    };

    const r1 = spin(config, 10, seededRng(1), false, true);
    const r2 = spin(config, 10, seededRng(2), false, true, r1.freeSpinModifierStates);

    const s2 = r2.freeSpinModifierStates!.find((s) => s.type === "increasingMultiplier");
    expect((s2 as { currentMultiplier: number }).currentMultiplier).toBe(2);
  });

  it("applies extra wilds during free spin mode", () => {
    const config: GameConfig = {
      ...BASE_CONFIG,
      freeSpinModifiers: [
        { type: "extraWilds", count: 2, wildSymbolId: "wild" },
      ],
    };

    const result = spin(config, 10, seededRng(42), false, true);
    expect(result.freeSpinModifierStates).toBeDefined();

    const ewState = result.freeSpinModifierStates!.find((s) => s.type === "extraWilds");
    expect(ewState).toBeDefined();
    const positions = (ewState as { positions: readonly unknown[] }).positions;
    expect(positions.length).toBeGreaterThanOrEqual(0);
    expect(positions.length).toBeLessThanOrEqual(2);
  });

  it("applies symbol upgrade during free spin mode", () => {
    const config: GameConfig = {
      ...BASE_CONFIG,
      freeSpinModifiers: [
        { type: "symbolUpgrade", upgrades: [{ from: "cherry", to: "bar" }] },
      ],
    };

    const result = spin(config, 10, seededRng(42), false, true);

    // Grid should have no "cherry" symbols (all upgraded to "bar")
    for (const row of result.grid) {
      for (const sym of row) {
        expect(sym).not.toBe("cherry");
      }
    }
  });

  it("does not apply modifiers on bonus buy trigger spin", () => {
    const config: GameConfig = {
      ...BASE_CONFIG,
      bonusBuyCostMultiplier: 75,
      freeSpinModifiers: [
        { type: "increasingMultiplier", startMultiplier: 10, increment: 1 },
      ],
    };

    // bonusBuy=true, isFreeSpinMode=false (trigger spin, not yet in FS)
    const result = spin(config, 10, seededRng(42), true, false);
    expect(result.freeSpinModifierStates).toBeUndefined();
  });

  it("caps multiplier at maxMultiplier when set", () => {
    const config: GameConfig = {
      ...BASE_CONFIG,
      freeSpinModifiers: [
        { type: "increasingMultiplier", startMultiplier: 1, increment: 1, maxMultiplier: 3 },
      ],
    };

    const r1 = spin(config, 10, seededRng(1), false, true);
    const r2 = spin(config, 10, seededRng(2), false, true, r1.freeSpinModifierStates);
    const r3 = spin(config, 10, seededRng(3), false, true, r2.freeSpinModifierStates);
    const r4 = spin(config, 10, seededRng(4), false, true, r3.freeSpinModifierStates);

    const s3 = r3.freeSpinModifierStates!.find((s) => s.type === "increasingMultiplier");
    expect((s3 as { currentMultiplier: number }).currentMultiplier).toBe(3);

    // Should NOT exceed maxMultiplier
    const s4 = r4.freeSpinModifierStates!.find((s) => s.type === "increasingMultiplier");
    expect((s4 as { currentMultiplier: number }).currentMultiplier).toBe(3);
  });

  it("grows unbounded when maxMultiplier is not set", () => {
    const config: GameConfig = {
      ...BASE_CONFIG,
      freeSpinModifiers: [
        { type: "increasingMultiplier", startMultiplier: 1, increment: 1 },
      ],
    };

    let states = undefined;
    for (let i = 0; i < 10; i++) {
      const r = spin(config, 10, seededRng(i), false, true, states);
      states = r.freeSpinModifierStates;
    }

    const final = states?.find((s) => s.type === "increasingMultiplier");
    expect((final as { currentMultiplier: number }).currentMultiplier).toBe(10);
  });

  it("multiplier scales totalPayout correctly", () => {
    const config: GameConfig = {
      ...BASE_CONFIG,
      freeSpinModifiers: [
        { type: "increasingMultiplier", startMultiplier: 3, increment: 1 },
      ],
    };

    // Spin without modifier to get base payout
    const baseResult = spin(config, 10, seededRng(99), false, false);
    // Spin with modifier at 3x
    const modResult = spin(config, 10, seededRng(99), false, true);

    if (baseResult.totalPayout > 0) {
      // With 3x multiplier, modified payout should be 3x base (floored)
      expect(modResult.totalPayout).toBe(Math.floor(baseResult.totalPayout * 3));
    }
  });
});
