import type { Payline } from "./payline.js";
import type { PayoutRule } from "./payout.js";
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
  readonly betOptions: readonly number[];
  readonly defaultBet: number;
}
