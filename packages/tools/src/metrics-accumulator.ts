export interface MetricsAccumulator {
  totalBaseSpins: number;
  totalPayout: number;
  baseGamePayout: number;
  freeSpinPayout: number;
  winningBaseSpins: number;
  freeSpinTriggers: number;
  totalFreeSpinsAwarded: number;
  totalBonusRoundPayout: number;
  welfordCount: number;
  welfordMean: number;
  welfordM2: number;
}

export function createAccumulator(): MetricsAccumulator {
  return {
    totalBaseSpins: 0,
    totalPayout: 0,
    baseGamePayout: 0,
    freeSpinPayout: 0,
    winningBaseSpins: 0,
    freeSpinTriggers: 0,
    totalFreeSpinsAwarded: 0,
    totalBonusRoundPayout: 0,
    welfordCount: 0,
    welfordMean: 0,
    welfordM2: 0,
  };
}

export function recordBaseSpinRound(
  acc: MetricsAccumulator,
  baseSpinPayout: number,
  freeSpinsPayout: number,
  freeSpinsTriggered: boolean,
  totalFreeSpinsInRound: number,
  bet: number,
): void {
  const roundPayout = baseSpinPayout + freeSpinsPayout;

  acc.totalBaseSpins++;
  acc.totalPayout += roundPayout;
  acc.baseGamePayout += baseSpinPayout;
  acc.freeSpinPayout += freeSpinsPayout;

  if (roundPayout > 0) {
    acc.winningBaseSpins++;
  }

  if (freeSpinsTriggered) {
    acc.freeSpinTriggers++;
    acc.totalFreeSpinsAwarded += totalFreeSpinsInRound;
    acc.totalBonusRoundPayout += freeSpinsPayout;
  }

  // Welford's online variance: track return ratio (payout / bet)
  const returnRatio = roundPayout / bet;
  acc.welfordCount++;
  const delta = returnRatio - acc.welfordMean;
  acc.welfordMean += delta / acc.welfordCount;
  const delta2 = returnRatio - acc.welfordMean;
  acc.welfordM2 += delta * delta2;
}

export function computeVolatility(acc: MetricsAccumulator): number {
  if (acc.welfordCount < 2) return 0;
  const variance = acc.welfordM2 / (acc.welfordCount - 1);
  return Math.sqrt(variance);
}
