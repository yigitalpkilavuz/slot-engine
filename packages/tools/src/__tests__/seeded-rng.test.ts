import { describe, it, expect } from "vitest";
import { SeededRng } from "../seeded-rng.js";

describe("SeededRng", () => {
  it("produces deterministic sequences for the same seed", () => {
    const rng1 = new SeededRng(42);
    const rng2 = new SeededRng(42);

    const seq1 = Array.from({ length: 100 }, () => rng1.nextInt(0, 1000));
    const seq2 = Array.from({ length: 100 }, () => rng2.nextInt(0, 1000));

    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences for different seeds", () => {
    const rng1 = new SeededRng(1);
    const rng2 = new SeededRng(2);

    const seq1 = Array.from({ length: 20 }, () => rng1.nextInt(0, 1000));
    const seq2 = Array.from({ length: 20 }, () => rng2.nextInt(0, 1000));

    expect(seq1).not.toEqual(seq2);
  });

  it("always returns values within [min, max)", () => {
    const rng = new SeededRng(123);

    for (let i = 0; i < 10_000; i++) {
      const value = rng.nextInt(5, 15);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(15);
    }
  });

  it("produces roughly uniform distribution", () => {
    const rng = new SeededRng(99);
    const buckets = new Array<number>(6).fill(0);
    const n = 120_000;

    for (let i = 0; i < n; i++) {
      buckets[rng.nextInt(0, 6)]!++;
    }

    const expected = n / 6;
    for (const count of buckets) {
      // Each bucket should be within 5% of expected
      expect(Math.abs(count - expected) / expected).toBeLessThan(0.05);
    }
  });

  it("handles seed of 0 without degenerate output", () => {
    const rng = new SeededRng(0);
    const values = new Set(Array.from({ length: 100 }, () => rng.nextInt(0, 10000)));
    // Should produce at least 50 unique values out of 100
    expect(values.size).toBeGreaterThan(50);
  });

  it("returns 0 for range of 1", () => {
    const rng = new SeededRng(42);
    for (let i = 0; i < 100; i++) {
      expect(rng.nextInt(0, 1)).toBe(0);
    }
  });
});
