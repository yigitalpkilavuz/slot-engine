import { spin } from "@slot-engine/server";
import type { GameConfig } from "@slot-engine/shared";
import { SeededRng } from "./seeded-rng.js";
import { runFreeSpinRound } from "./free-spin-loop.js";
import type { SimulationOptions, SimulationResult, GameMetrics } from "./simulation-types.js";
import {
  createAccumulator,
  recordBaseSpinRound,
  computeVolatility,
} from "./metrics-accumulator.js";

const PROGRESS_INTERVAL = 100_000;

export function runSimulation(options: SimulationOptions): SimulationResult {
  const startTime = performance.now();
  const results: GameMetrics[] = [];

  for (const config of options.configs) {
    results.push(simulateGame(config, options));
  }

  return {
    games: results,
    seed: options.seed,
    spinsPerGame: options.spins,
    elapsedMs: Math.round(performance.now() - startTime),
  };
}

function simulateGame(config: GameConfig, options: SimulationOptions): GameMetrics {
  const bet = options.bet ?? config.defaultBet;

  if (!config.betOptions.includes(bet)) {
    throw new Error(
      `Bet ${String(bet)} is not valid for game '${config.id}'. Valid options: ${config.betOptions.join(", ")}`,
    );
  }

  const rng = new SeededRng(options.seed);
  const acc = createAccumulator();

  for (let i = 0; i < options.spins; i++) {
    const baseResult = spin(config, bet, rng);

    let freeSpinsPayout = 0;
    let freeSpinsTriggered = false;
    let totalFreeSpinsInRound = 0;

    if (baseResult.freeSpinsAwarded > 0) {
      freeSpinsTriggered = true;
      const fsResult = runFreeSpinRound(
        config,
        bet,
        baseResult.freeSpinsAwarded,
        baseResult.freeSpinModifierStates,
        rng,
      );
      freeSpinsPayout = fsResult.totalPayout;
      totalFreeSpinsInRound = fsResult.totalSpins;
    }

    recordBaseSpinRound(
      acc,
      baseResult.totalPayout,
      freeSpinsPayout,
      freeSpinsTriggered,
      totalFreeSpinsInRound,
      bet,
    );

    if (options.onProgress && (i + 1) % PROGRESS_INTERVAL === 0) {
      options.onProgress(config.id, i + 1, options.spins);
    }
  }

  const totalWagered = acc.totalBaseSpins * bet;
  const hasSpins = acc.totalBaseSpins > 0;

  return {
    gameId: config.id,
    gameName: config.name,
    totalSpins: acc.totalBaseSpins,
    bet,
    totalWagered,
    totalPayout: acc.totalPayout,
    baseGamePayout: acc.baseGamePayout,
    freeSpinPayout: acc.freeSpinPayout,
    rtp: hasSpins ? (acc.totalPayout / totalWagered) * 100 : 0,
    baseGameRtp: hasSpins ? (acc.baseGamePayout / totalWagered) * 100 : 0,
    freeSpinRtp: hasSpins ? (acc.freeSpinPayout / totalWagered) * 100 : 0,
    hitFrequency: hasSpins ? (acc.winningBaseSpins / acc.totalBaseSpins) * 100 : 0,
    freeSpinTriggerRate: hasSpins ? (acc.freeSpinTriggers / acc.totalBaseSpins) * 100 : 0,
    avgFreeSpinsPerTrigger:
      acc.freeSpinTriggers > 0 ? acc.totalFreeSpinsAwarded / acc.freeSpinTriggers : 0,
    avgFreeSpinPayout:
      acc.freeSpinTriggers > 0 ? acc.totalBonusRoundPayout / acc.freeSpinTriggers / bet : 0,
    volatility: computeVolatility(acc),
  };
}
