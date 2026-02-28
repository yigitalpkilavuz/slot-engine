import { describe, it, expect } from "vitest";
import { spinReels } from "../reel-spinner.js";
import { FixedRng } from "./helpers.js";

const REELS = [
  ["cherry", "bar", "seven", "cherry", "bar"],
  ["bar", "seven", "cherry", "bar", "seven"],
  ["seven", "cherry", "bar", "seven", "cherry"],
];

describe("spinReels", () => {
  it("generates a grid with correct dimensions", () => {
    const rng = new FixedRng([0, 0, 0]);
    const grid = spinReels(REELS, 3, rng);

    expect(grid).toHaveLength(3);
    for (const row of grid) {
      expect(row).toHaveLength(3);
    }
  });

  it("reads consecutive symbols from stop position", () => {
    const rng = new FixedRng([0, 0, 0]);
    const grid = spinReels(REELS, 3, rng);

    expect(grid[0]).toEqual(["cherry", "bar", "seven"]);
    expect(grid[1]).toEqual(["bar", "seven", "cherry"]);
    expect(grid[2]).toEqual(["seven", "cherry", "bar"]);
  });

  it("wraps around reel strip", () => {
    const rng = new FixedRng([4, 4, 4]);
    const grid = spinReels(REELS, 3, rng);

    expect(grid[0]).toEqual(["bar", "seven", "cherry"]);
    expect(grid[1]).toEqual(["cherry", "bar", "seven"]);
    expect(grid[2]).toEqual(["bar", "seven", "cherry"]);
  });

  it("uses different stop positions per reel", () => {
    const rng = new FixedRng([0, 2, 1]);
    const grid = spinReels(REELS, 3, rng);

    expect(grid[0]).toEqual(["cherry", "cherry", "cherry"]);
    expect(grid[1]).toEqual(["bar", "bar", "bar"]);
    expect(grid[2]).toEqual(["seven", "seven", "seven"]);
  });
});
