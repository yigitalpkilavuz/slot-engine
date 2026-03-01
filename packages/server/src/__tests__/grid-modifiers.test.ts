import { describe, it, expect } from "vitest";
import { expandWilds } from "../grid-modifiers.js";

describe("expandWilds", () => {
  it("returns same grid when no expanding wild ids", () => {
    const grid = [
      ["cherry", "bar", "seven"],
      ["bar", "seven", "cherry"],
      ["seven", "cherry", "bar"],
    ];

    const result = expandWilds(grid, new Set());
    expect(result).toBe(grid); // reference equality — no clone
  });

  it("returns same grid when expanding wild not present in grid", () => {
    const grid = [
      ["cherry", "bar", "seven"],
      ["bar", "seven", "cherry"],
      ["seven", "cherry", "bar"],
    ];

    const result = expandWilds(grid, new Set(["wild"]));
    expect(result).toBe(grid);
  });

  it("expands a single wild to fill the entire column", () => {
    const grid = [
      ["cherry", "wild", "seven"],
      ["bar", "cherry", "cherry"],
      ["seven", "bar", "bar"],
    ];

    const result = expandWilds(grid, new Set(["wild"]));
    expect(result).toEqual([
      ["cherry", "wild", "seven"],
      ["bar", "wild", "cherry"],
      ["seven", "wild", "bar"],
    ]);
  });

  it("expands wilds in multiple columns", () => {
    const grid = [
      ["wild", "cherry", "wild"],
      ["bar", "bar", "cherry"],
      ["seven", "seven", "bar"],
    ];

    const result = expandWilds(grid, new Set(["wild"]));
    expect(result).toEqual([
      ["wild", "cherry", "wild"],
      ["wild", "bar", "wild"],
      ["wild", "seven", "wild"],
    ]);
  });

  it("does not expand non-expanding wilds", () => {
    // "wild" is in the grid but NOT in the expanding set
    const grid = [
      ["cherry", "wild", "seven"],
      ["bar", "cherry", "cherry"],
      ["seven", "bar", "bar"],
    ];

    const result = expandWilds(grid, new Set(["expanding-wild"]));
    expect(result).toBe(grid); // unchanged
  });

  it("does not mutate the original grid", () => {
    const grid = [
      ["cherry", "wild", "seven"],
      ["bar", "cherry", "cherry"],
    ];
    const original = grid.map((row) => [...row]);

    expandWilds(grid, new Set(["wild"]));
    expect(grid).toEqual(original);
  });

  it("handles 4-row grid", () => {
    const grid = [
      ["cherry", "bar", "seven"],
      ["bar", "wild", "cherry"],
      ["seven", "cherry", "bar"],
      ["cherry", "bar", "seven"],
    ];

    const result = expandWilds(grid, new Set(["wild"]));
    expect(result).toEqual([
      ["cherry", "wild", "seven"],
      ["bar", "wild", "cherry"],
      ["seven", "wild", "bar"],
      ["cherry", "wild", "seven"],
    ]);
  });
});
