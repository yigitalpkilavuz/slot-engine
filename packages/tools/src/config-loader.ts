import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GameConfig } from "@slot-engine/shared";
import { validateGameConfig } from "@slot-engine/shared";

const CONFIGS_DIR = fileURLToPath(new URL("../../server/configs", import.meta.url));

export async function loadGameConfigs(gameFilter?: string): Promise<readonly GameConfig[]> {
  const entries = await readdir(CONFIGS_DIR);
  const jsonFiles = entries.filter((f) => f.endsWith(".json"));

  if (jsonFiles.length === 0) {
    throw new Error(`No game configs found in ${CONFIGS_DIR}`);
  }

  const configs: GameConfig[] = [];
  for (const file of jsonFiles) {
    const filePath = join(CONFIGS_DIR, file);
    const raw = await readFile(filePath, "utf-8");
    const config = validateGameConfig(JSON.parse(raw) as unknown);
    configs.push(config);
  }

  if (gameFilter) {
    const filtered = configs.filter((c) => c.id === gameFilter);
    if (filtered.length === 0) {
      const available = configs.map((c) => c.id).join(", ");
      throw new Error(`Game '${gameFilter}' not found. Available: ${available}`);
    }
    return filtered;
  }

  return configs;
}
