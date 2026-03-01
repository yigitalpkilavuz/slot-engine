import { describe, it, expect } from "vitest";
import type { GameConfig } from "@slot-engine/shared";
import { runSimulation } from "../simulation-engine.js";

const MINI_CONFIG: GameConfig = {
  id: "test-mini",
  name: "Test Mini",
  rows: 1,
  symbols: [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "wild", name: "Wild", wild: true },
  ],
  reels: [["a", "b", "wild"], ["a", "b", "wild"], ["a", "b", "wild"]],
  paylines: [[0, 0, 0]],
  payouts: [
    { symbolId: "a", count: 3, multiplier: 5 },
    { symbolId: "b", count: 3, multiplier: 10 },
  ],
  betOptions: [100],
  defaultBet: 100,
};

describe("runSimulation", () => {
  it("produces deterministic results with the same seed", () => {
    const result1 = runSimulation({ configs: [MINI_CONFIG], spins: 1000, seed: 42 });
    const result2 = runSimulation({ configs: [MINI_CONFIG], spins: 1000, seed: 42 });

    expect(result1.games[0]!.rtp).toBe(result2.games[0]!.rtp);
    expect(result1.games[0]!.hitFrequency).toBe(result2.games[0]!.hitFrequency);
    expect(result1.games[0]!.totalPayout).toBe(result2.games[0]!.totalPayout);
  });

  it("produces different results with different seeds", () => {
    const result1 = runSimulation({ configs: [MINI_CONFIG], spins: 5000, seed: 1 });
    const result2 = runSimulation({ configs: [MINI_CONFIG], spins: 5000, seed: 2 });

    // Very unlikely to be exactly equal with different seeds
    expect(result1.games[0]!.totalPayout).not.toBe(result2.games[0]!.totalPayout);
  });

  it("calculates RTP correctly", () => {
    const result = runSimulation({ configs: [MINI_CONFIG], spins: 10_000, seed: 42 });
    const game = result.games[0]!;

    expect(game.totalWagered).toBe(10_000 * 100);
    expect(game.rtp).toBeCloseTo((game.totalPayout / game.totalWagered) * 100, 10);
    expect(game.baseGameRtp + game.freeSpinRtp).toBeCloseTo(game.rtp, 10);
  });

  it("tracks hit frequency", () => {
    const result = runSimulation({ configs: [MINI_CONFIG], spins: 10_000, seed: 42 });
    const game = result.games[0]!;

    expect(game.hitFrequency).toBeGreaterThan(0);
    expect(game.hitFrequency).toBeLessThanOrEqual(100);
  });

  it("reports metadata correctly", () => {
    const result = runSimulation({ configs: [MINI_CONFIG], spins: 500, seed: 99 });

    expect(result.seed).toBe(99);
    expect(result.spinsPerGame).toBe(500);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.games).toHaveLength(1);
    expect(result.games[0]!.gameId).toBe("test-mini");
    expect(result.games[0]!.gameName).toBe("Test Mini");
    expect(result.games[0]!.bet).toBe(100);
    expect(result.games[0]!.totalSpins).toBe(500);
  });

  it("simulates multiple games", () => {
    const config2: GameConfig = {
      ...MINI_CONFIG,
      id: "test-mini-2",
      name: "Test Mini 2",
    };
    const result = runSimulation({ configs: [MINI_CONFIG, config2], spins: 500, seed: 42 });

    expect(result.games).toHaveLength(2);
    expect(result.games[0]!.gameId).toBe("test-mini");
    expect(result.games[1]!.gameId).toBe("test-mini-2");
  });

  it("throws for invalid bet", () => {
    expect(() => {
      runSimulation({ configs: [MINI_CONFIG], spins: 100, seed: 42, bet: 999 });
    }).toThrow("Bet 999 is not valid");
  });

  it("uses custom bet when provided", () => {
    const config: GameConfig = { ...MINI_CONFIG, betOptions: [50, 100], defaultBet: 50 };
    const result = runSimulation({ configs: [config], spins: 100, seed: 42, bet: 100 });

    expect(result.games[0]!.bet).toBe(100);
    expect(result.games[0]!.totalWagered).toBe(100 * 100);
  });
});
