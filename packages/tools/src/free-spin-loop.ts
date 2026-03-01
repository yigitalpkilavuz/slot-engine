import type { GameConfig, FreeSpinModifierState } from "@slot-engine/shared";
import type { RandomNumberGenerator } from "@slot-engine/server";
import { spin } from "@slot-engine/server";

const MAX_FREE_SPINS_PER_ROUND = 500;

export interface FreeSpinRoundResult {
  readonly totalPayout: number;
  readonly totalSpins: number;
}

export function runFreeSpinRound(
  config: GameConfig,
  bet: number,
  initialFreeSpins: number,
  initialModifierStates: readonly FreeSpinModifierState[] | undefined,
  rng: RandomNumberGenerator,
): FreeSpinRoundResult {
  let remaining = initialFreeSpins;
  let totalPayout = 0;
  let totalSpins = 0;
  let modifierStates: readonly FreeSpinModifierState[] | undefined = initialModifierStates;

  while (remaining > 0 && totalSpins < MAX_FREE_SPINS_PER_ROUND) {
    remaining--;
    totalSpins++;

    const result = spin(config, bet, rng, false, true, modifierStates);
    totalPayout += result.totalPayout;

    if (result.freeSpinsAwarded > 0) {
      remaining += result.freeSpinsAwarded;
    }

    modifierStates = result.freeSpinModifierStates;
  }

  return { totalPayout, totalSpins };
}
