import type { Payline, PayoutRule, Win } from "@slot-engine/shared";

export function evaluateWins(
  grid: readonly (readonly string[])[],
  paylines: readonly Payline[],
  payouts: readonly PayoutRule[],
  bet: number,
): readonly Win[] {
  const wins: Win[] = [];

  for (let paylineIndex = 0; paylineIndex < paylines.length; paylineIndex++) {
    const payline = paylines[paylineIndex]!;
    const firstSymbol = grid[payline[0]!]![0]!;

    let count = 1;
    for (let reelIndex = 1; reelIndex < payline.length; reelIndex++) {
      const rowIndex = payline[reelIndex]!;
      const symbol = grid[rowIndex]![reelIndex]!;
      if (symbol === firstSymbol) {
        count++;
      } else {
        break;
      }
    }

    const matchingPayout = findBestPayout(payouts, firstSymbol, count);
    if (matchingPayout) {
      wins.push({
        paylineIndex,
        symbolId: firstSymbol,
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
