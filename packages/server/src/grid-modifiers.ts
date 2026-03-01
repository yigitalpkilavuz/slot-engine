export function expandWilds(
  grid: readonly (readonly string[])[],
  expandingWildIds: ReadonlySet<string>,
): readonly (readonly string[])[] {
  if (expandingWildIds.size === 0) return grid;

  const rows = grid.length;
  if (rows === 0) return grid;
  const cols = grid[0]!.length;

  // Find columns that contain expanding wilds and which wild symbol to use
  const columnsToExpand = new Map<number, string>();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const symbol = grid[row]![col]!;
      if (expandingWildIds.has(symbol)) {
        columnsToExpand.set(col, symbol);
      }
    }
  }

  if (columnsToExpand.size === 0) return grid;

  // Clone and expand
  const newGrid: string[][] = grid.map((row) => [...row]);
  for (const [col, wildSymbol] of columnsToExpand) {
    for (let row = 0; row < rows; row++) {
      newGrid[row]![col] = wildSymbol;
    }
  }

  return newGrid;
}
