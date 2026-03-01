import type { Payline, PayoutRule, SymbolDefinition, Win } from "@slot-engine/shared";

export function evaluateWins(
  grid: readonly (readonly string[])[],
  paylines: readonly Payline[],
  payouts: readonly PayoutRule[],
  bet: number,
  wildIds: ReadonlySet<string>,
  symbols: readonly SymbolDefinition[] = [],
): readonly Win[] {
  const wildMultiplierMap = buildWildMultiplierMap(symbols);
  const wins: Win[] = [];

  for (let paylineIndex = 0; paylineIndex < paylines.length; paylineIndex++) {
    const payline = paylines[paylineIndex]!;

    // Find base symbol (first non-wild) and count consecutive matches
    let baseSymbol: string | null = null;
    let count = 0;
    let wildMultiplierProduct = 1;

    for (let reelIndex = 0; reelIndex < payline.length; reelIndex++) {
      const rowIndex = payline[reelIndex]!;
      const symbol = grid[rowIndex]![reelIndex]!;

      if (wildIds.has(symbol)) {
        count++;
        wildMultiplierProduct *= wildMultiplierMap.get(symbol) ?? 1;
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
        payout: Math.floor(bet * matchingPayout.multiplier * wildMultiplierProduct),
      });
    }
  }

  return wins;
}

function buildWildMultiplierMap(
  symbols: readonly SymbolDefinition[],
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const sym of symbols) {
    if (sym.wild === true && sym.wildMultiplier !== undefined) {
      map.set(sym.id, sym.wildMultiplier);
    }
  }
  return map;
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
