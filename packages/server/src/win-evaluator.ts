import type { Payline, PayoutRule, Win } from "@slot-engine/shared";

export function evaluateWins(
  grid: readonly (readonly string[])[],
  paylines: readonly Payline[],
  payouts: readonly PayoutRule[],
  bet: number,
  wildIds: ReadonlySet<string>,
): readonly Win[] {
  const wins: Win[] = [];

  for (let paylineIndex = 0; paylineIndex < paylines.length; paylineIndex++) {
    const payline = paylines[paylineIndex]!;

    // Find base symbol (first non-wild) and count consecutive matches
    let baseSymbol: string | null = null;
    let count = 0;

    for (let reelIndex = 0; reelIndex < payline.length; reelIndex++) {
      const rowIndex = payline[reelIndex]!;
      const symbol = grid[rowIndex]![reelIndex]!;

      if (wildIds.has(symbol)) {
        count++;
      } else if (baseSymbol === null) {
        baseSymbol = symbol;
        count++;
      } else if (symbol === baseSymbol) {
        count++;
      } else {
        break;
      }
    }

    // All wilds = no win (wild symbols have no payout rules)
    if (baseSymbol === null) continue;

    const matchingPayout = findBestPayout(payouts, baseSymbol, count);
    if (matchingPayout) {
      wins.push({
        paylineIndex,
        symbolId: baseSymbol,
        count: matchingPayout.count,
        payout: bet * matchingPayout.multiplier,
      });
    }
  }

  return wins;
}

function findBestPayout(
  payouts: readonly PayoutRule[],
  symbolId: string,
  maxCount: number,
): PayoutRule | undefined {
  let best: PayoutRule | undefined;

  for (const rule of payouts) {
    if (rule.symbolId !== symbolId || rule.count > maxCount) {
      continue;
    }
    if (!best || rule.multiplier > best.multiplier) {
      best = rule;
    }
  }

  return best;
}
