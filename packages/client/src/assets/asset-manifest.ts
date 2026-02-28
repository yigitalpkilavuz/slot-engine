export interface AssetEntry {
  readonly alias: string;
  readonly src: string;
}

export interface AssetBundle {
  readonly name: string;
  readonly assets: readonly AssetEntry[];
}

export interface AssetManifest {
  readonly bundles: readonly AssetBundle[];
}

export const PLACEHOLDER_MANIFEST: AssetManifest = {
  bundles: [],
};
