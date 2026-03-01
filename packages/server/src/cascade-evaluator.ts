import type { CascadeStep, Payline, PayoutRule, SymbolDefinition, Win } from "@slot-engine/shared";
import type { RandomNumberGenerator } from "./rng.js";
import { evaluateWins } from "./win-evaluator.js";

const MAX_CASCADE_ITERATIONS = 20;

export interface CascadeResult {
  readonly allWins: readonly Win[];
  readonly totalPayout: number;
  readonly cascadeSteps: readonly CascadeStep[];
  readonly finalGrid: readonly (readonly string[])[];
}

export function evaluateCascades(
  grid: readonly (readonly string[])[],
  paylines: readonly Payline[],
  payouts: readonly PayoutRule[],
  bet: number,
  wildIds: ReadonlySet<string>,
  symbols: readonly SymbolDefinition[],
  reels: readonly (readonly string[])[],
  rng: RandomNumberGenerator,
): CascadeResult {
  const allWins: Win[] = [];
  const cascadeSteps: CascadeStep[] = [];
  let currentGrid = grid;
  let totalPayout = 0;

  for (let iteration = 0; iteration < MAX_CASCADE_ITERATIONS; iteration++) {
    const wins = evaluateWins(currentGrid, paylines, payouts, bet, wildIds, symbols);
    if (wins.length === 0) break;

    const stepPayout = wins.reduce((sum, w) => sum + w.payout, 0);
    cascadeSteps.push({ grid: currentGrid, wins, payout: stepPayout });
    allWins.push(...wins);
    totalPayout += stepPayout;

    const markedPositions = collectWinningPositions(wins, paylines);
    currentGrid = cascadeGrid(currentGrid, markedPositions, reels, rng);
  }

  return { allWins, totalPayout, cascadeSteps, finalGrid: currentGrid };
}

function collectWinningPositions(
  wins: readonly Win[],
  paylines: readonly Payline[],
): ReadonlySet<string> {
  const positions = new Set<string>();
  for (const win of wins) {
    const payline = paylines[win.paylineIndex]!;
    for (let reelIndex = 0; reelIndex < win.count; reelIndex++) {
      const rowIndex = payline[reelIndex]!;
      positions.add(`${String(rowIndex)},${String(reelIndex)}`);
    }
  }
  return positions;
}

function cascadeGrid(
  grid: readonly (readonly string[])[],
  markedPositions: ReadonlySet<string>,
  reels: readonly (readonly string[])[],
  rng: RandomNumberGenerator,
): readonly (readonly string[])[] {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const newGrid: string[][] = Array.from({ length: rows }, () =>
    new Array<string>(cols).fill(""),
  );

  for (let col = 0; col < cols; col++) {
    // Collect surviving symbols from bottom to top
    const surviving: string[] = [];
    for (let row = rows - 1; row >= 0; row--) {
      if (!markedPositions.has(`${String(row)},${String(col)}`)) {
        surviving.push(grid[row]![col]!);
      }
    }

    // Place surviving symbols at the bottom
    for (let i = 0; i < surviving.length; i++) {
      newGrid[rows - 1 - i]![col] = surviving[i]!;
    }

    // Fill remaining top positions with random symbols from reel strip
    const reel = reels[col]!;
    const emptyCount = rows - surviving.length;
    for (let i = 0; i < emptyCount; i++) {
      const randomIndex = rng.nextInt(0, reel.length);
      newGrid[i]![col] = reel[randomIndex]!;
    }
  }

  return newGrid;
}
