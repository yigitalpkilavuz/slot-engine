export interface PayoutRule {
  readonly symbolId: string;
  readonly count: number;
  readonly multiplier: number;
}

export interface ScatterRule {
  readonly symbolId: string;
  readonly count: number;
  readonly multiplier: number;
  readonly freeSpins: number;
}
