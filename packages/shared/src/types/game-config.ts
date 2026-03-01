import type { FreeSpinModifier } from "./free-spin-modifier.js";
import type { Payline } from "./payline.js";
import type { PayoutRule, ScatterRule } from "./payout.js";
import type { ReelStrip } from "./reel.js";
import type { SymbolDefinition } from "./symbol.js";

export interface GameConfig {
  readonly id: string;
  readonly name: string;
  readonly rows: number;
  readonly symbols: readonly SymbolDefinition[];
  readonly reels: readonly ReelStrip[];
  readonly paylines: readonly Payline[];
  readonly payouts: readonly PayoutRule[];
  readonly scatterRules?: readonly ScatterRule[];
  readonly cascading?: boolean;
  readonly bonusBuyCostMultiplier?: number;
  readonly freeSpinModifiers?: readonly FreeSpinModifier[];
  readonly betOptions: readonly number[];
  readonly defaultBet: number;
}
