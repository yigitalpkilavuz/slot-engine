import { describe, it, expect } from "vitest";
import type { GameConfig } from "@slot-engine/shared";
import { spin } from "../spin.js";
import { FixedRng } from "./helpers.js";

const TEST_CONFIG: GameConfig = {
  id: "test-game",
  name: "Test Game",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
    { id: "seven", name: "Seven" },
  ],
  reels: [
    ["cherry", "bar", "seven", "cherry", "bar"],
    ["bar", "seven", "cherry", "bar", "seven"],
    ["seven", "cherry", "bar", "seven", "cherry"],
  ],
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
    const rng = new FixedRng([0, 0, 0]);
    const result = spin(TEST_CONFIG, 10, rng);

    expect(result.grid).toHaveLength(3);
    expect(result.wins).toBeDefined();
    expect(typeof result.totalPayout).toBe("number");
  });

  it("throws on invalid bet amount", () => {
    const rng = new FixedRng([0, 0, 0]);

    expect(() => spin(TEST_CONFIG, 999, rng)).toThrow("Invalid bet amount");
  });

  it("throws on non-integer bet (floating point guard)", () => {
    const rng = new FixedRng([0, 0, 0]);

    expect(() => spin(TEST_CONFIG, 5.5, rng)).toThrow("positive integer");
    expect(() => spin(TEST_CONFIG, 0, rng)).toThrow("positive integer");
    expect(() => spin(TEST_CONFIG, -10, rng)).toThrow("positive integer");
  });

  it("calculates correct total payout", () => {
    const rng = new FixedRng([0, 2, 1]);
    const result = spin(TEST_CONFIG, 10, rng);

    // Stop positions [0,2,1] produces:
    // row 0: cherry, cherry, cherry → cherry×3 = 10 * 10 = 100
    // row 1: bar,    bar,    bar    → bar×3    = 10 * 20 = 200
    // row 2: seven,  seven,  seven  → seven×3  = 10 * 50 = 500
    expect(result.wins.length).toBe(3);
    expect(result.totalPayout).toBe(800);
  });

  it("returns zero payout when no wins", () => {
    const rng = new FixedRng([0, 0, 0]);
    const result = spin(TEST_CONFIG, 10, rng);

    // Stop positions [0,0,0] produces mixed grid, no 3-of-a-kind on any payline
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
    ["cherry", "bar", "wild"],
    ["wild", "cherry", "bar"],
    ["cherry", "bar", "wild"],
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
    // Stop positions [0, 0, 0] produces:
    // row 0: cherry, wild, cherry → cherry×3 with wild sub = 10*10 = 100
    const rng = new FixedRng([0, 0, 0]);
    const result = spin(WILD_CONFIG, 10, rng);

    expect(result.wins).toHaveLength(1);
    expect(result.wins[0]!.symbolId).toBe("cherry");
    expect(result.wins[0]!.count).toBe(3);
    expect(result.totalPayout).toBe(100);
  });
});
