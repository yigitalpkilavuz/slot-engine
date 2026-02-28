export interface Win {
  readonly paylineIndex: number;
  readonly symbolId: string;
  readonly count: number;
  readonly payout: number;
}

export interface SpinResult {
  readonly grid: readonly (readonly string[])[];
  readonly wins: readonly Win[];
  readonly totalPayout: number;
}
