export interface WeightedSymbol {
  readonly symbolId: string;
  readonly weight: number;
}

export type ReelStrip = readonly WeightedSymbol[];
