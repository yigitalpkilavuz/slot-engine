import type { ScatterRule, Win } from "@slot-engine/shared";

export interface ScatterResult {
  readonly wins: readonly Win[];
  readonly freeSpinsAwarded: number;
}

export function evaluateScatters(
  grid: readonly (readonly string[])[],
  scatterRules: readonly ScatterRule[],
  bet: number,
  scatterIds: ReadonlySet<string>,
): ScatterResult {
  if (scatterIds.size === 0 || scatterRules.length === 0) {
    return { wins: [], freeSpinsAwarded: 0 };
  }

  // Count scatter symbols anywhere on the grid
  const counts = new Map<string, number>();
  for (const row of grid) {
    for (const symbol of row) {
      if (scatterIds.has(symbol)) {
        counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
      }
    }
  }

  const wins: Win[] = [];
  let freeSpinsAwarded = 0;

  for (const [symbolId, actualCount] of counts) {
    const bestRule = findBestScatterRule(scatterRules, symbolId, actualCount);
    if (bestRule) {
      if (bestRule.multiplier > 0) {
        wins.push({
          paylineIndex: -1,
          symbolId,
          count: bestRule.count,
          payout: bet * bestRule.multiplier,
        });
      }
      freeSpinsAwarded += bestRule.freeSpins;
    }
  }

  return { wins, freeSpinsAwarded };
}

function findBestScatterRule(
  rules: readonly ScatterRule[],
  symbolId: string,
  maxCount: number,
): ScatterRule | undefined {
  let best: ScatterRule | undefined;

  for (const rule of rules) {
    if (rule.symbolId !== symbolId || rule.count > maxCount) {
      continue;
    }
    if (!best || rule.count > best.count) {
      best = rule;
    }
  }

  return best;
}
