import type { AssetManifest } from "./asset-manifest.js";

const GAME_MANIFESTS: ReadonlyMap<string, AssetManifest> = new Map([]);

export function getGameManifest(gameId: string): AssetManifest | undefined {
  return GAME_MANIFESTS.get(gameId);
}

export function getSymbolTextureAlias(symbolId: string): string {
  return `sym-${symbolId}`;
}
