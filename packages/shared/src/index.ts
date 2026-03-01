export type {
  SymbolDefinition,
  ReelStrip,
  Payline,
  PayoutRule,
  ScatterRule,
  GameConfig,
  Win,
  CascadeStep,
  SpinResult,
  FreeSpinModifier,
  StickyWildsModifier,
  IncreasingMultiplierModifier,
  ExtraWildsModifier,
  SymbolUpgradeModifier,
  SymbolUpgradeMapping,
  FreeSpinModifierState,
  StickyWildsState,
  IncreasingMultiplierState,
  ExtraWildsState,
  SymbolUpgradeState,
  GridPosition,
} from "./types/index.js";

export { ConfigValidationError } from "./errors/config-validation-error.js";
export { validateGameConfig } from "./validation/game-config-validator.js";
