import type { GameConfig } from "@slot-engine/shared";

export interface SimulationOptions {
  readonly configs: readonly GameConfig[];
  readonly spins: number;
  readonly seed: number;
  readonly bet?: number;
  readonly onProgress?: (gameId: string, completedSpins: number, totalSpins: number) => void;
}

export interface GameMetrics {
  readonly gameId: string;
  readonly gameName: string;
  readonly totalSpins: number;
  readonly bet: number;
  readonly totalWagered: number;
  readonly totalPayout: number;
  readonly baseGamePayout: number;
  readonly freeSpinPayout: number;
  readonly rtp: number;
  readonly baseGameRtp: number;
  readonly freeSpinRtp: number;
  readonly hitFrequency: number;
  readonly freeSpinTriggerRate: number;
  readonly avgFreeSpinsPerTrigger: number;
  readonly avgFreeSpinPayout: number;
  readonly volatility: number;
}

export interface SimulationResult {
  readonly games: readonly GameMetrics[];
  readonly seed: number;
  readonly spinsPerGame: number;
  readonly elapsedMs: number;
}
