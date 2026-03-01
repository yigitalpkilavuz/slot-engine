import type { CascadeStep, FreeSpinModifierState, GameConfig, SpinResult, Win } from "@slot-engine/shared";
import type { RandomNumberGenerator } from "./rng.js";
import { spinReels } from "./reel-spinner.js";
import { evaluateWins } from "./win-evaluator.js";
import { evaluateScatters } from "./scatter-evaluator.js";
import { expandWilds } from "./grid-modifiers.js";
import { evaluateCascades } from "./cascade-evaluator.js";
import { applyFreeSpinModifiers } from "./free-spin-modifiers.js";
import type { ModifierResult } from "./free-spin-modifiers.js";

export function spin(
  config: GameConfig,
  bet: number,
  rng: RandomNumberGenerator,
  bonusBuy = false,
  isFreeSpinMode = false,
  previousModifierStates?: readonly FreeSpinModifierState[],
): SpinResult {
  if (!Number.isInteger(bet) || bet < 1) {
    throw new Error(`Bet must be a positive integer (cents), got: ${String(bet)}`);
  }

  if (!config.betOptions.includes(bet)) {
    throw new Error(
      `Invalid bet amount: ${String(bet)}. Valid options: ${config.betOptions.join(", ")}`,
    );
  }

  let rawGrid = spinReels(config.reels, config.rows, rng);

  // Bonus buy: force minimum scatter count onto the grid
  if (bonusBuy && config.scatterRules && config.scatterRules.length > 0) {
    rawGrid = forceScatters(rawGrid, config, rng);
  }

  const expandingWildIds = new Set(
    config.symbols.filter((s) => s.expandingWild === true).map((s) => s.id),
  );
  let grid: readonly (readonly string[])[] = expandWilds(rawGrid, expandingWildIds);
  const hasExpansion = grid !== rawGrid;

  // Apply free spin modifiers (only during actual free spins)
  let modifierResult: ModifierResult | undefined;
  if (isFreeSpinMode && config.freeSpinModifiers && config.freeSpinModifiers.length > 0) {
    modifierResult = applyFreeSpinModifiers(grid, config, previousModifierStates, rng);
    grid = modifierResult.grid;
  }

  const wildIds = new Set(config.symbols.filter((s) => s.wild === true).map((s) => s.id));
  const scatterIds = new Set(config.symbols.filter((s) => s.scatter === true).map((s) => s.id));
  const scatterResult = evaluateScatters(grid, config.scatterRules ?? [], bet, scatterIds);

  let paylineWins: readonly Win[];
  let finalGrid = grid;
  let cascadeSteps: readonly CascadeStep[] | undefined;

  if (config.cascading === true) {
    const cascade = evaluateCascades(
      grid, config.paylines, config.payouts, bet, wildIds, config.symbols, config.reels, rng,
    );
    paylineWins = cascade.allWins;
    finalGrid = cascade.finalGrid;
    if (cascade.cascadeSteps.length > 0) {
      cascadeSteps = cascade.cascadeSteps;
    }
  } else {
    paylineWins = evaluateWins(grid, config.paylines, config.payouts, bet, wildIds, config.symbols);
  }

  const wins = [...paylineWins, ...scatterResult.wins];
  let totalPayout = wins.reduce((sum, win) => sum + win.payout, 0);

  // Apply modifier multiplier to total payout
  if (modifierResult && modifierResult.payoutMultiplier !== 1) {
    totalPayout = Math.floor(totalPayout * modifierResult.payoutMultiplier);
  }

  const result: SpinResult = {
    grid: finalGrid,
    wins,
    totalPayout,
    freeSpinsAwarded: scatterResult.freeSpinsAwarded,
    ...(hasExpansion ? { originalGrid: rawGrid } : {}),
    ...(cascadeSteps ? { cascadeSteps } : {}),
    ...(modifierResult && modifierResult.states.length > 0
      ? { freeSpinModifierStates: modifierResult.states }
      : {}),
  };

  return result;
}

function forceScatters(
  grid: readonly (readonly string[])[],
  config: GameConfig,
  rng: RandomNumberGenerator,
): (readonly string[])[] {
  const scatterRules = config.scatterRules!;
  const scatterId = scatterRules[0]!.symbolId;

  // Find minimum scatter count from rules
  let minCount = Infinity;
  for (const rule of scatterRules) {
    if (rule.count < minCount) {
      minCount = rule.count;
    }
  }

  // Count existing scatters
  let existingCount = 0;
  for (const row of grid) {
    for (const sym of row) {
      if (sym === scatterId) {
        existingCount++;
      }
    }
  }

  if (existingCount >= minCount) {
    return grid.map((row) => [...row]);
  }

  // Build list of all positions (row, col) that don't already have a scatter
  const available: { row: number; col: number }[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row]!.length; col++) {
      if (grid[row]![col] !== scatterId) {
        available.push({ row, col });
      }
    }
  }

  // Clone grid
  const newGrid = grid.map((row) => [...row]);

  // Place scatters randomly until we reach minimum count
  const needed = minCount - existingCount;
  for (let i = 0; i < needed && available.length > 0; i++) {
    const idx = rng.nextInt(0, available.length);
    const pos = available[idx]!;
    newGrid[pos.row]![pos.col] = scatterId;
    available.splice(idx, 1);
  }

  return newGrid;
}
