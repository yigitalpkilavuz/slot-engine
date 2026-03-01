export interface Win {
  readonly paylineIndex: number;
  readonly symbolId: string;
  readonly count: number;
  readonly payout: number;
}

export interface CascadeStep {
  readonly grid: readonly (readonly string[])[];
  readonly wins: readonly Win[];
  readonly payout: number;
}

import type { FreeSpinModifierState } from "./free-spin-modifier.js";

export interface SpinResult {
  readonly grid: readonly (readonly string[])[];
  readonly originalGrid?: readonly (readonly string[])[];
  readonly wins: readonly Win[];
  readonly totalPayout: number;
  readonly freeSpinsAwarded: number;
  readonly cascadeSteps?: readonly CascadeStep[];
  readonly freeSpinModifierStates?: readonly FreeSpinModifierState[];
}
