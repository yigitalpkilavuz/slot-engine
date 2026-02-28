import { Assets } from "pixi.js";
import { PLACEHOLDER_MANIFEST } from "./asset-manifest.js";
import type { AssetManifest } from "./asset-manifest.js";

export async function loadAssets(
  manifest: AssetManifest = PLACEHOLDER_MANIFEST,
  onProgress?: (progress: number) => void,
): Promise<void> {
  for (const bundle of manifest.bundles) {
    const assetMap: Record<string, string> = {};
    for (const asset of bundle.assets) {
      assetMap[asset.alias] = asset.src;
    }
    Assets.addBundle(bundle.name, assetMap);
  }

  for (const bundle of manifest.bundles) {
    await Assets.loadBundle(bundle.name, (progress: number) => {
      onProgress?.(progress);
    });
  }
}
