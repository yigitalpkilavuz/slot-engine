import { describe, it, expect } from "vitest";
import type { GameConfig, IncreasingMultiplierModifier, ExtraWildsModifier, SymbolUpgradeModifier } from "@slot-engine/shared";
import {
  applyStickyWilds,
  applyIncreasingMultiplier,
  applyExtraWilds,
  applySymbolUpgrade,
  applyFreeSpinModifiers,
} from "../free-spin-modifiers.js";
import type { RandomNumberGenerator } from "../rng.js";

const SYMBOLS = [
  { id: "cherry", name: "Cherry" },
  { id: "bar", name: "Bar" },
  { id: "wild", name: "Wild", wild: true },
  { id: "scatter", name: "Scatter", scatter: true },
];

const BASE_CONFIG = {
  id: "test",
  name: "Test",
  rows: 3,
  symbols: SYMBOLS,
  reels: [["cherry", "bar"], ["cherry", "bar"], ["cherry", "bar"]],
  paylines: [[0, 0, 0]],
  payouts: [{ symbolId: "cherry", count: 3, multiplier: 10 }],
  betOptions: [10],
  defaultBet: 10,
} as unknown as GameConfig;

function deterministicRng(sequence: number[]): RandomNumberGenerator {
  let idx = 0;
  return {
    nextInt(_min: number, _max: number): number {
      return sequence[idx++]!;
    },
  };
}

describe("applyStickyWilds", () => {
  it("returns unchanged grid when no wilds and no previous state", () => {
    const grid = [
      ["cherry", "bar", "cherry"],
      ["bar", "cherry", "bar"],
    ];
    const result = applyStickyWilds(grid, BASE_CONFIG, undefined);
    expect(result.grid).toEqual(grid);
    expect(result.state.positions).toEqual([]);
  });

  it("captures new wild positions", () => {
    const grid = [
      ["cherry", "wild", "cherry"],
      ["bar", "cherry", "bar"],
    ];
    const result = applyStickyWilds(grid, BASE_CONFIG, undefined);
    expect(result.state.positions).toEqual([{ row: 0, col: 1 }]);
    expect(result.grid[0]![1]).toBe("wild");
  });

  it("preserves previous sticky positions plus new ones", () => {
    const grid = [
      ["cherry", "cherry", "wild"],
      ["bar", "cherry", "bar"],
    ];
    const prevState = {
      type: "stickyWilds" as const,
      positions: [{ row: 1, col: 0 }],
      wildSymbolId: "wild",
    };
    const result = applyStickyWilds(grid, BASE_CONFIG, prevState);
    expect(result.state.positions).toHaveLength(2);
    // Previous position applied to grid
    expect(result.grid[1]![0]).toBe("wild");
    // New position captured
    expect(result.grid[0]![2]).toBe("wild");
  });

  it("does not mutate input grid", () => {
    const grid = [["cherry", "wild"]];
    const original = [["cherry", "wild"]];
    applyStickyWilds(grid, BASE_CONFIG, undefined);
    expect(grid).toEqual(original);
  });
});

describe("applyIncreasingMultiplier", () => {
  const modifier: IncreasingMultiplierModifier = {
    type: "increasingMultiplier",
    startMultiplier: 1,
    increment: 1,
  };

  it("returns startMultiplier on first spin", () => {
    const result = applyIncreasingMultiplier(modifier, undefined);
    expect(result.state.currentMultiplier).toBe(1);
  });

  it("increments on subsequent spins", () => {
    const prev = { type: "increasingMultiplier" as const, currentMultiplier: 1 };
    const result = applyIncreasingMultiplier(modifier, prev);
    expect(result.state.currentMultiplier).toBe(2);

    const result2 = applyIncreasingMultiplier(modifier, result.state);
    expect(result2.state.currentMultiplier).toBe(3);
  });

  it("works with custom start and increment", () => {
    const custom: IncreasingMultiplierModifier = {
      type: "increasingMultiplier",
      startMultiplier: 2,
      increment: 3,
    };
    const r1 = applyIncreasingMultiplier(custom, undefined);
    expect(r1.state.currentMultiplier).toBe(2);

    const r2 = applyIncreasingMultiplier(custom, r1.state);
    expect(r2.state.currentMultiplier).toBe(5);

    const r3 = applyIncreasingMultiplier(custom, r2.state);
    expect(r3.state.currentMultiplier).toBe(8);
  });
});

describe("applyExtraWilds", () => {
  const modifier: ExtraWildsModifier = {
    type: "extraWilds",
    count: 2,
    wildSymbolId: "wild",
  };

  it("converts exactly N positions to wild", () => {
    const grid = [
      ["cherry", "bar", "cherry"],
      ["bar", "cherry", "bar"],
    ];
    // RNG: first pick index 0 (swap 0,0), second pick index 1 (swap 1,1 — already in place)
    const rng = deterministicRng([0, 1]);
    const result = applyExtraWilds(grid, modifier, BASE_CONFIG, rng);
    expect(result.state.positions).toHaveLength(2);

    // Count wilds in result grid
    let wildCount = 0;
    for (const row of result.grid) {
      for (const sym of row) {
        if (sym === "wild") wildCount++;
      }
    }
    expect(wildCount).toBe(2);
  });

  it("does not convert scatter or existing wild positions", () => {
    const grid = [
      ["wild", "scatter", "cherry"],
    ];
    const rng = deterministicRng([0]);
    const singleMod: ExtraWildsModifier = { type: "extraWilds", count: 1, wildSymbolId: "wild" };
    const result = applyExtraWilds(grid, singleMod, BASE_CONFIG, rng);
    // Only "cherry" at (0,2) is eligible
    expect(result.state.positions).toEqual([{ row: 0, col: 2 }]);
    expect(result.grid[0]![2]).toBe("wild");
    // Scatter preserved
    expect(result.grid[0]![1]).toBe("scatter");
  });

  it("handles fewer eligible positions than requested count", () => {
    const grid = [["wild", "scatter"]];
    const rng = deterministicRng([]);
    const result = applyExtraWilds(grid, modifier, BASE_CONFIG, rng);
    expect(result.state.positions).toHaveLength(0);
  });

  it("does not mutate input grid", () => {
    const grid = [["cherry", "bar"]];
    const original = [["cherry", "bar"]];
    const rng = deterministicRng([0]);
    applyExtraWilds(grid, { type: "extraWilds", count: 1, wildSymbolId: "wild" }, BASE_CONFIG, rng);
    expect(grid).toEqual(original);
  });
});

describe("applySymbolUpgrade", () => {
  const modifier: SymbolUpgradeModifier = {
    type: "symbolUpgrade",
    upgrades: [{ from: "cherry", to: "bar" }],
  };

  it("replaces all instances of source symbol", () => {
    const grid = [
      ["cherry", "bar", "cherry"],
      ["bar", "cherry", "bar"],
    ];
    const result = applySymbolUpgrade(grid, modifier);
    expect(result.grid).toEqual([
      ["bar", "bar", "bar"],
      ["bar", "bar", "bar"],
    ]);
  });

  it("handles multiple upgrade mappings", () => {
    const multi: SymbolUpgradeModifier = {
      type: "symbolUpgrade",
      upgrades: [
        { from: "cherry", to: "bar" },
        { from: "bar", to: "wild" },
      ],
    };
    const grid = [["cherry", "bar", "wild"]];
    const result = applySymbolUpgrade(grid, multi);
    // cherry→bar, bar→wild, wild stays (not in mapping)
    expect(result.grid).toEqual([["bar", "wild", "wild"]]);
  });

  it("does not affect symbols not in the mapping", () => {
    const grid = [["scatter", "wild"]];
    const result = applySymbolUpgrade(grid, modifier);
    expect(result.grid).toEqual([["scatter", "wild"]]);
  });

  it("does not mutate input grid", () => {
    const grid = [["cherry", "bar"]];
    const original = [["cherry", "bar"]];
    applySymbolUpgrade(grid, modifier);
    expect(grid).toEqual(original);
  });
});

describe("applyFreeSpinModifiers (orchestrator)", () => {
  it("returns unchanged grid when no modifiers configured", () => {
    const grid = [["cherry", "bar"]];
    const result = applyFreeSpinModifiers(grid, BASE_CONFIG, undefined, deterministicRng([]));
    expect(result.grid).toEqual(grid);
    expect(result.states).toEqual([]);
    expect(result.payoutMultiplier).toBe(1);
  });

  it("applies modifiers in config order", () => {
    const config = {
      ...BASE_CONFIG,
      freeSpinModifiers: [
        { type: "symbolUpgrade" as const, upgrades: [{ from: "cherry", to: "bar" }] },
        { type: "increasingMultiplier" as const, startMultiplier: 2, increment: 1 },
      ],
    } as unknown as GameConfig;

    const grid = [["cherry", "bar"]];
    const result = applyFreeSpinModifiers(grid, config, undefined, deterministicRng([]));

    // Symbol upgrade applied
    expect(result.grid).toEqual([["bar", "bar"]]);
    // Multiplier state present
    expect(result.payoutMultiplier).toBe(2);
    expect(result.states).toHaveLength(2);
  });

  it("passes previous states to each modifier", () => {
    const config = {
      ...BASE_CONFIG,
      freeSpinModifiers: [
        { type: "increasingMultiplier" as const, startMultiplier: 1, increment: 1 },
      ],
    } as unknown as GameConfig;

    const grid = [["cherry"]];
    const prevStates = [{ type: "increasingMultiplier" as const, currentMultiplier: 3 }];

    const result = applyFreeSpinModifiers(grid, config, prevStates, deterministicRng([]));
    expect(result.payoutMultiplier).toBe(4); // 3 + 1 increment
  });
});
