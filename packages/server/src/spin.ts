import type { GameConfig, SpinResult } from "@slot-engine/shared";
import type { RandomNumberGenerator } from "./rng.js";
import { spinReels } from "./reel-spinner.js";
import { evaluateWins } from "./win-evaluator.js";
import { evaluateScatters } from "./scatter-evaluator.js";

export function spin(config: GameConfig, bet: number, rng: RandomNumberGenerator): SpinResult {
  if (!Number.isInteger(bet) || bet < 1) {
    throw new Error(`Bet must be a positive integer (cents), got: ${String(bet)}`);
  }

  if (!config.betOptions.includes(bet)) {
    throw new Error(
      `Invalid bet amount: ${String(bet)}. Valid options: ${config.betOptions.join(", ")}`,
    );
  }

  const grid = spinReels(config.reels, config.rows, rng);
  const wildIds = new Set(config.symbols.filter((s) => s.wild === true).map((s) => s.id));
  const paylineWins = evaluateWins(grid, config.paylines, config.payouts, bet, wildIds);

  const scatterIds = new Set(config.symbols.filter((s) => s.scatter === true).map((s) => s.id));
  const scatterResult = evaluateScatters(grid, config.scatterRules ?? [], bet, scatterIds);

  const wins = [...paylineWins, ...scatterResult.wins];
  const totalPayout = wins.reduce((sum, win) => sum + win.payout, 0);

  return { grid, wins, totalPayout, freeSpinsAwarded: scatterResult.freeSpinsAwarded };
}
