// ── Free Spin Modifier Config Types (static, per-game) ──

export interface StickyWildsModifier {
  readonly type: "stickyWilds";
}

export interface IncreasingMultiplierModifier {
  readonly type: "increasingMultiplier";
  readonly startMultiplier: number;
  readonly increment: number;
}

export interface ExtraWildsModifier {
  readonly type: "extraWilds";
  readonly count: number;
  readonly wildSymbolId: string;
}

export interface SymbolUpgradeMapping {
  readonly from: string;
  readonly to: string;
}

export interface SymbolUpgradeModifier {
  readonly type: "symbolUpgrade";
  readonly upgrades: readonly SymbolUpgradeMapping[];
}

export type FreeSpinModifier =
  | StickyWildsModifier
  | IncreasingMultiplierModifier
  | ExtraWildsModifier
  | SymbolUpgradeModifier;

// ── Free Spin Modifier Runtime State (per-session) ──

export interface GridPosition {
  readonly row: number;
  readonly col: number;
}

export interface StickyWildsState {
  readonly type: "stickyWilds";
  readonly positions: readonly GridPosition[];
  readonly wildSymbolId: string;
}

export interface IncreasingMultiplierState {
  readonly type: "increasingMultiplier";
  readonly currentMultiplier: number;
}

export interface ExtraWildsState {
  readonly type: "extraWilds";
  readonly positions: readonly GridPosition[];
}

export interface SymbolUpgradeState {
  readonly type: "symbolUpgrade";
  readonly upgrades: readonly SymbolUpgradeMapping[];
}

export type FreeSpinModifierState =
  | StickyWildsState
  | IncreasingMultiplierState
  | ExtraWildsState
  | SymbolUpgradeState;
