import type {
  GameConfig,
  FreeSpinModifierState,
  StickyWildsState,
  IncreasingMultiplierState,
  ExtraWildsState,
  SymbolUpgradeState,
  IncreasingMultiplierModifier,
  ExtraWildsModifier,
  SymbolUpgradeModifier,
  GridPosition,
} from "@slot-engine/shared";
import type { RandomNumberGenerator } from "./rng.js";

export interface ModifierResult {
  readonly grid: readonly (readonly string[])[];
  readonly states: readonly FreeSpinModifierState[];
  readonly payoutMultiplier: number;
}

export function applyFreeSpinModifiers(
  grid: readonly (readonly string[])[],
  config: GameConfig,
  previousStates: readonly FreeSpinModifierState[] | undefined,
  rng: RandomNumberGenerator,
): ModifierResult {
  const modifiers = config.freeSpinModifiers;
  if (!modifiers || modifiers.length === 0) {
    return { grid, states: [], payoutMultiplier: 1 };
  }

  let currentGrid = grid;
  let payoutMultiplier = 1;
  const newStates: FreeSpinModifierState[] = [];

  for (const modifier of modifiers) {
    const prevState = previousStates?.find((s) => s.type === modifier.type);

    switch (modifier.type) {
      case "stickyWilds": {
        const result = applyStickyWilds(currentGrid, config, prevState as StickyWildsState | undefined);
        currentGrid = result.grid;
        newStates.push(result.state);
        break;
      }
      case "increasingMultiplier": {
        const result = applyIncreasingMultiplier(modifier, prevState as IncreasingMultiplierState | undefined);
        payoutMultiplier *= result.state.currentMultiplier;
        newStates.push(result.state);
        break;
      }
      case "extraWilds": {
        const result = applyExtraWilds(currentGrid, modifier, config, rng);
        currentGrid = result.grid;
        newStates.push(result.state);
        break;
      }
      case "symbolUpgrade": {
        const result = applySymbolUpgrade(currentGrid, modifier);
        currentGrid = result.grid;
        newStates.push(result.state);
        break;
      }
    }
  }

  return { grid: currentGrid, states: newStates, payoutMultiplier };
}

// ── Sticky Wilds ─────────────────────────────────────

export function applyStickyWilds(
  grid: readonly (readonly string[])[],
  config: GameConfig,
  previousState: StickyWildsState | undefined,
): { grid: readonly (readonly string[])[]; state: StickyWildsState } {
  const wildIds = new Set(config.symbols.filter((s) => s.wild === true).map((s) => s.id));
  const primaryWildId = config.symbols.find((s) => s.wild === true)?.id ?? "";
  const effectiveWildId = previousState?.wildSymbolId ?? primaryWildId;

  // Collect previously stuck positions
  const allPositions = new Map<string, GridPosition>();
  if (previousState) {
    for (const pos of previousState.positions) {
      allPositions.set(`${String(pos.row)},${String(pos.col)}`, pos);
    }
  }

  // Scan current grid for new wilds
  for (let row = 0; row < grid.length; row++) {
    const rowData = grid[row]!;
    for (let col = 0; col < rowData.length; col++) {
      if (wildIds.has(rowData[col]!)) {
        allPositions.set(`${String(row)},${String(col)}`, { row, col });
      }
    }
  }

  const positions = [...allPositions.values()];

  // Apply sticky positions to grid
  const newGrid = grid.map((r) => [...r]);
  for (const pos of positions) {
    newGrid[pos.row]![pos.col] = effectiveWildId;
  }

  return {
    grid: newGrid,
    state: { type: "stickyWilds", positions, wildSymbolId: effectiveWildId },
  };
}

// ── Increasing Multiplier ────────────────────────────

export function applyIncreasingMultiplier(
  modifier: IncreasingMultiplierModifier,
  previousState: IncreasingMultiplierState | undefined,
): { state: IncreasingMultiplierState } {
  const currentMultiplier = previousState
    ? previousState.currentMultiplier + modifier.increment
    : modifier.startMultiplier;

  return { state: { type: "increasingMultiplier", currentMultiplier } };
}

// ── Extra Wilds ──────────────────────────────────────

export function applyExtraWilds(
  grid: readonly (readonly string[])[],
  modifier: ExtraWildsModifier,
  config: GameConfig,
  rng: RandomNumberGenerator,
): { grid: readonly (readonly string[])[]; state: ExtraWildsState } {
  const wildIds = new Set(config.symbols.filter((s) => s.wild === true).map((s) => s.id));
  const scatterIds = new Set(config.symbols.filter((s) => s.scatter === true).map((s) => s.id));

  // Collect eligible positions (not wild, not scatter)
  const available: GridPosition[] = [];
  for (let row = 0; row < grid.length; row++) {
    const rowData = grid[row]!;
    for (let col = 0; col < rowData.length; col++) {
      const sym = rowData[col]!;
      if (!wildIds.has(sym) && !scatterIds.has(sym)) {
        available.push({ row, col });
      }
    }
  }

  const count = Math.min(modifier.count, available.length);
  const chosen: GridPosition[] = [];
  const newGrid = grid.map((r) => [...r]);

  // Fisher-Yates partial shuffle to pick `count` positions
  for (let i = 0; i < count; i++) {
    const idx = rng.nextInt(i, available.length);
    // Swap
    const temp = available[idx]!;
    available[idx] = available[i]!;
    available[i] = temp;

    chosen.push(temp);
    newGrid[temp.row]![temp.col] = modifier.wildSymbolId;
  }

  return {
    grid: newGrid,
    state: { type: "extraWilds", positions: chosen },
  };
}

// ── Symbol Upgrade ───────────────────────────────────

export function applySymbolUpgrade(
  grid: readonly (readonly string[])[],
  modifier: SymbolUpgradeModifier,
): { grid: readonly (readonly string[])[]; state: SymbolUpgradeState } {
  const upgradeMap = new Map<string, string>();
  for (const mapping of modifier.upgrades) {
    upgradeMap.set(mapping.from, mapping.to);
  }

  const newGrid = grid.map((row) =>
    row.map((sym) => upgradeMap.get(sym) ?? sym),
  );

  return {
    grid: newGrid,
    state: { type: "symbolUpgrade", upgrades: modifier.upgrades },
  };
}
