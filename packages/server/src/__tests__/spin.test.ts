import { describe, it, expect } from "vitest";
import type { GameConfig, ReelStrip } from "@slot-engine/shared";
import { spin } from "../spin.js";
import { FixedRng } from "./helpers.js";

// Weight-1 reels: totalWeight=3, roll 0→cherry, 1→bar, 2→seven
const W_REELS: readonly ReelStrip[] = [
  [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }],
  [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }],
  [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }],
];

const TEST_CONFIG: GameConfig = {
  id: "test-game",
  name: "Test Game",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
    { id: "seven", name: "Seven" },
  ],
  reels: W_REELS,
  paylines: [
    [1, 1, 1],
    [0, 0, 0],
    [2, 2, 2],
  ],
  payouts: [
    { symbolId: "cherry", count: 3, multiplier: 10 },
    { symbolId: "bar", count: 3, multiplier: 20 },
    { symbolId: "seven", count: 3, multiplier: 50 },
  ],
  betOptions: [10, 25, 50, 100],
  defaultBet: 10,
};

describe("spin", () => {
  it("returns a valid SpinResult", () => {
    // 9 values for 3×3 grid
    const rng = new FixedRng([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = spin(TEST_CONFIG, 10, rng);

    expect(result.grid).toHaveLength(3);
    expect(result.wins).toBeDefined();
    expect(typeof result.totalPayout).toBe("number");
  });

  it("throws on invalid bet amount", () => {
    const rng = new FixedRng([0, 0, 0, 0, 0, 0, 0, 0, 0]);

    expect(() => spin(TEST_CONFIG, 999, rng)).toThrow("Invalid bet amount");
  });

  it("throws on non-integer bet (floating point guard)", () => {
    const rng = new FixedRng([0, 0, 0, 0, 0, 0, 0, 0, 0]);

    expect(() => spin(TEST_CONFIG, 5.5, rng)).toThrow("positive integer");
    expect(() => spin(TEST_CONFIG, 0, rng)).toThrow("positive integer");
    expect(() => spin(TEST_CONFIG, -10, rng)).toThrow("positive integer");
  });

  it("calculates correct total payout", () => {
    // Grid: row0=cherry×3, row1=bar×3, row2=seven×3
    // All 3 paylines win
    const rng = new FixedRng([0, 0, 0, 1, 1, 1, 2, 2, 2]);
    const result = spin(TEST_CONFIG, 10, rng);

    // payline [1,1,1] → bar×3 = 200
    // payline [0,0,0] → cherry×3 = 100
    // payline [2,2,2] → seven×3 = 500
    expect(result.wins.length).toBe(3);
    expect(result.totalPayout).toBe(800);
  });

  it("returns zero payout when no wins", () => {
    // Mixed grid: row0=[cherry,bar,seven], row1=[bar,seven,cherry], row2=[seven,cherry,bar]
    const rng = new FixedRng([0, 1, 2, 1, 2, 0, 2, 0, 1]);
    const result = spin(TEST_CONFIG, 10, rng);

    expect(result.totalPayout).toBe(0);
  });
});

const WILD_CONFIG: GameConfig = {
  id: "wild-test",
  name: "Wild Test",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
    { id: "wild", name: "Wild", wild: true },
  ],
  reels: [
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "wild", weight: 1 }],
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "wild", weight: 1 }],
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "wild", weight: 1 }],
  ],
  paylines: [[0, 0, 0]],
  payouts: [
    { symbolId: "cherry", count: 3, multiplier: 10 },
    { symbolId: "bar", count: 3, multiplier: 20 },
  ],
  betOptions: [10],
  defaultBet: 10,
};

describe("spin with wild symbols", () => {
  it("wild substitutes in win evaluation", () => {
    // row 0: cherry, wild, cherry → cherry×3 with wild sub = 100
    const rng = new FixedRng([0, 2, 0, 1, 1, 1, 2, 0, 2]);
    const result = spin(WILD_CONFIG, 10, rng);

    expect(result.wins).toHaveLength(1);
    expect(result.wins[0]!.symbolId).toBe("cherry");
    expect(result.wins[0]!.count).toBe(3);
    expect(result.totalPayout).toBe(100);
  });
});

const SCATTER_CONFIG: GameConfig = {
  id: "scatter-test",
  name: "Scatter Test",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
    { id: "scatter", name: "Scatter", scatter: true },
  ],
  reels: [
    [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 2 }, { symbolId: "scatter", weight: 1 }],
    [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 2 }, { symbolId: "scatter", weight: 1 }],
    [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 2 }, { symbolId: "scatter", weight: 1 }],
  ],
  paylines: [[0, 0, 0]],
  payouts: [
    { symbolId: "cherry", count: 3, multiplier: 10 },
  ],
  scatterRules: [
    { symbolId: "scatter", count: 3, multiplier: 5, freeSpins: 10 },
  ],
  betOptions: [10],
  defaultBet: 10,
};

describe("spin with scatter symbols", () => {
  it("returns freeSpinsAwarded=0 when no scatters land", () => {
    // totalWeight=5, cherry:0-1, bar:2-3, scatter:4
    // All values < 4 → no scatter
    const rng = new FixedRng([0, 0, 0, 1, 1, 1, 2, 2, 2]);
    const result = spin(SCATTER_CONFIG, 10, rng);

    expect(result.freeSpinsAwarded).toBe(0);
  });

  it("awards scatter win and free spins when enough scatters land", () => {
    // row2: scatter×3 (roll=4 → scatter)
    const rng = new FixedRng([0, 0, 0, 1, 1, 1, 4, 4, 4]);
    const result = spin(SCATTER_CONFIG, 10, rng);

    expect(result.freeSpinsAwarded).toBe(10);
    const scatterWin = result.wins.find((w) => w.paylineIndex === -1);
    expect(scatterWin).toBeDefined();
    expect(scatterWin!.payout).toBe(50); // 10 * 5
  });

  it("works with config that has no scatterRules (backward compat)", () => {
    const rng = new FixedRng([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = spin(TEST_CONFIG, 10, rng);

    expect(result.freeSpinsAwarded).toBe(0);
  });
});

const MULTIPLIER_WILD_CONFIG: GameConfig = {
  id: "multiplier-wild-test",
  name: "Multiplier Wild Test",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
    { id: "wild", name: "Wild", wild: true, wildMultiplier: 2 },
  ],
  reels: [
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "wild", weight: 1 }],
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "wild", weight: 1 }],
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "wild", weight: 1 }],
  ],
  paylines: [[0, 0, 0]],
  payouts: [
    { symbolId: "cherry", count: 3, multiplier: 10 },
    { symbolId: "bar", count: 3, multiplier: 20 },
  ],
  betOptions: [10],
  defaultBet: 10,
};

describe("spin with multiplier wilds", () => {
  it("multiplier wild doubles payout in spin result", () => {
    // row 0: cherry, wild, cherry → cherry×3 with 2x wild = 10*10*2 = 200
    const rng = new FixedRng([0, 2, 0, 1, 1, 1, 2, 0, 2]);
    const result = spin(MULTIPLIER_WILD_CONFIG, 10, rng);

    expect(result.wins).toHaveLength(1);
    expect(result.wins[0]!.symbolId).toBe("cherry");
    expect(result.wins[0]!.count).toBe(3);
    expect(result.wins[0]!.payout).toBe(200);
    expect(result.totalPayout).toBe(200);
  });
});

const EXPANDING_WILD_CONFIG: GameConfig = {
  id: "expanding-wild-test",
  name: "Expanding Wild Test",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
    { id: "seven", name: "Seven" },
    { id: "wild", name: "Wild", wild: true, expandingWild: true },
  ],
  reels: [
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }],
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }, { symbolId: "wild", weight: 1 }],
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }],
  ],
  paylines: [
    [0, 0, 0],
    [1, 1, 1],
    [2, 2, 2],
  ],
  payouts: [
    { symbolId: "cherry", count: 3, multiplier: 10 },
    { symbolId: "bar", count: 3, multiplier: 20 },
    { symbolId: "seven", count: 3, multiplier: 50 },
  ],
  betOptions: [10],
  defaultBet: 10,
};

describe("spin with expanding wilds", () => {
  it("expanding wild fills the entire column", () => {
    // Reel 0,2: totalWeight=3 (0→cherry, 1→bar, 2→seven)
    // Reel 1: totalWeight=4 (0→cherry, 1→bar, 2→seven, 3→wild)
    // row 0: cherry(0), wild(3), cherry(0)
    // row 1: bar(1), cherry(0), bar(1)
    // row 2: seven(2), bar(1), seven(2)
    // After expansion (col 1 all wild):
    // cherry, wild, cherry → cherry×3 = 100
    // bar, wild, bar → bar×3 = 200
    // seven, wild, seven → seven×3 = 500
    const rng = new FixedRng([0, 3, 0, 1, 0, 1, 2, 1, 2]);
    const result = spin(EXPANDING_WILD_CONFIG, 10, rng);

    expect(result.grid[0]![1]).toBe("wild");
    expect(result.grid[1]![1]).toBe("wild");
    expect(result.grid[2]![1]).toBe("wild");

    expect(result.wins).toHaveLength(3);
    expect(result.totalPayout).toBe(800); // 100 + 200 + 500
  });

  it("provides originalGrid when expansion occurs", () => {
    const rng = new FixedRng([0, 3, 0, 1, 0, 1, 2, 1, 2]);
    const result = spin(EXPANDING_WILD_CONFIG, 10, rng);

    expect(result.originalGrid).toBeDefined();
    // Original grid had cherry in row 1 col 1, not wild
    expect(result.originalGrid![1]![1]).toBe("cherry");
  });

  it("does not set originalGrid when no expansion occurs", () => {
    const rng = new FixedRng([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = spin(TEST_CONFIG, 10, rng);

    expect(result.originalGrid).toBeUndefined();
  });
});

const CASCADE_CONFIG: GameConfig = {
  id: "cascade-test",
  name: "Cascade Test",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
    { id: "seven", name: "Seven" },
  ],
  reels: W_REELS,
  paylines: [[0, 0, 0]],
  payouts: [
    { symbolId: "cherry", count: 3, multiplier: 10 },
    { symbolId: "bar", count: 3, multiplier: 20 },
    { symbolId: "seven", count: 3, multiplier: 50 },
  ],
  cascading: true,
  betOptions: [10],
  defaultBet: 10,
};

describe("spin with cascading wins", () => {
  it("cascades: single win then no more wins", () => {
    // Spin: row0=cherry×3, row1=bar×3, row2=seven×3
    // Payline [0,0,0] → cherry×3 = 100
    // Cascade fill row 0: cherry,bar,seven → no match
    const rng = new FixedRng([0, 0, 0, 1, 1, 1, 2, 2, 2, 0, 1, 2]);
    const result = spin(CASCADE_CONFIG, 10, rng);

    expect(result.totalPayout).toBe(100);
    expect(result.cascadeSteps).toBeDefined();
    expect(result.cascadeSteps).toHaveLength(1);
  });

  it("cascades: chain of 2 wins with accumulated payout", () => {
    // Spin: row0=cherry×3, row1=bar×3, row2=seven×3
    // 1st cascade fill: bar×3 → bar×3 = 200
    // 2nd cascade fill: cherry,bar,seven → no win
    const rng = new FixedRng([0, 0, 0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0, 1, 2]);
    const result = spin(CASCADE_CONFIG, 10, rng);

    expect(result.totalPayout).toBe(300);
    expect(result.cascadeSteps).toHaveLength(2);
  });

  it("returns final grid after all cascades", () => {
    const rng = new FixedRng([0, 0, 0, 1, 1, 1, 2, 2, 2, 0, 1, 2]);
    const result = spin(CASCADE_CONFIG, 10, rng);

    // Final grid row 0 = filled symbols (cherry, bar, seven)
    expect(result.grid[0]).toEqual(["cherry", "bar", "seven"]);
    // Row 1 and 2 shifted down (bar, seven stayed)
    expect(result.grid[1]).toEqual(["bar", "bar", "bar"]);
    expect(result.grid[2]).toEqual(["seven", "seven", "seven"]);
  });

  it("non-cascading config has no cascadeSteps", () => {
    const rng = new FixedRng([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = spin(TEST_CONFIG, 10, rng);

    expect(result.cascadeSteps).toBeUndefined();
  });
});

const EXPANDING_CASCADE_CONFIG: GameConfig = {
  id: "expanding-cascade-test",
  name: "Expanding + Cascade Test",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
    { id: "seven", name: "Seven" },
    { id: "wild", name: "Wild", wild: true, expandingWild: true },
  ],
  reels: [
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }],
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }, { symbolId: "wild", weight: 1 }],
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }],
  ],
  paylines: [
    [0, 0, 0],
    [1, 1, 1],
    [2, 2, 2],
  ],
  payouts: [
    { symbolId: "cherry", count: 3, multiplier: 10 },
    { symbolId: "bar", count: 3, multiplier: 20 },
    { symbolId: "seven", count: 3, multiplier: 50 },
  ],
  cascading: true,
  betOptions: [10],
  defaultBet: 10,
};

describe("spin with expanding wilds + cascading", () => {
  it("returns both originalGrid and cascadeSteps", () => {
    // Spin: row0=[cherry, wild, cherry], row1=[bar, cherry, bar], row2=[seven, bar, seven]
    // After expansion: col 1 all wild → cherry×3(100) + bar×3(200) + seven×3(500) = 800
    // Cascade: all 9 removed
    // Fill col0: cherry,bar,seven; col1: bar,seven,cherry; col2: seven,cherry,bar → no wins
    const rng = new FixedRng([
      0, 3, 0, 1, 0, 1, 2, 1, 2,     // spin (9 values)
      0, 1, 2, 1, 2, 0, 2, 0, 1,     // cascade fill (9 values, no wins)
    ]);
    const result = spin(EXPANDING_CASCADE_CONFIG, 10, rng);

    // Both fields present
    expect(result.originalGrid).toBeDefined();
    expect(result.cascadeSteps).toBeDefined();

    // originalGrid is the pre-expansion grid
    expect(result.originalGrid![1]![1]).toBe("cherry");

    // Cascade happened (initial expanded grid had 3 payline wins)
    expect(result.cascadeSteps!.length).toBeGreaterThanOrEqual(1);
    expect(result.totalPayout).toBeGreaterThanOrEqual(800); // 100 + 200 + 500 from first step
  });
});

const MULTIPLIER_CASCADE_CONFIG: GameConfig = {
  id: "multiplier-cascade-test",
  name: "Multiplier + Cascade Test",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
    { id: "seven", name: "Seven" },
    { id: "wild", name: "Wild", wild: true, wildMultiplier: 2 },
  ],
  reels: [
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }, { symbolId: "wild", weight: 1 }],
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }, { symbolId: "wild", weight: 1 }],
    [{ symbolId: "cherry", weight: 1 }, { symbolId: "bar", weight: 1 }, { symbolId: "seven", weight: 1 }, { symbolId: "wild", weight: 1 }],
  ],
  paylines: [[0, 0, 0]],
  payouts: [
    { symbolId: "cherry", count: 3, multiplier: 10 },
    { symbolId: "bar", count: 3, multiplier: 20 },
  ],
  cascading: true,
  betOptions: [10],
  defaultBet: 10,
};

describe("spin with multiplier wilds + cascading", () => {
  it("multiplier wild applies in cascade then is removed", () => {
    // row 0: cherry, wild, cherry → cherry×3 with 2x wild = 10*10*2 = 200
    // Cascade fill row 0: cherry,bar,seven → no match
    const rng = new FixedRng([0, 3, 0, 1, 1, 1, 2, 2, 2, 0, 1, 2]);
    const result = spin(MULTIPLIER_CASCADE_CONFIG, 10, rng);

    expect(result.cascadeSteps).toHaveLength(1);
    expect(result.cascadeSteps![0]!.wins[0]!.payout).toBe(200); // 10 * 10 * 2
    expect(result.totalPayout).toBe(200);
  });
});
