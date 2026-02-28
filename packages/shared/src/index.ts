export type {
  SymbolDefinition,
  ReelStrip,
  Payline,
  PayoutRule,
  ScatterRule,
  GameConfig,
  Win,
  SpinResult,
} from "./types/index.js";

export { ConfigValidationError } from "./errors/config-validation-error.js";
export { validateGameConfig } from "./validation/game-config-validator.js";
