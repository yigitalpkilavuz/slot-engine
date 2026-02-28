import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateGameConfig } from "@slot-engine/shared";
import { createApp } from "./app.js";
import { InMemorySessionStore } from "./session/session-store.js";
import { GameRegistry } from "./game-registry.js";
import { CryptoRng } from "./rng.js";

const PORT = Number(process.env["PORT"]) || 3000;
const CONFIGS_DIR = fileURLToPath(new URL("../configs", import.meta.url));

async function loadAllConfigs(registry: GameRegistry): Promise<void> {
  const entries = await readdir(CONFIGS_DIR);
  const jsonFiles = entries.filter((f) => f.endsWith(".json"));

  if (jsonFiles.length === 0) {
    throw new Error(`No game configs found in ${CONFIGS_DIR}`);
  }

  for (const file of jsonFiles) {
    const filePath = join(CONFIGS_DIR, file);
    const raw = await readFile(filePath, "utf-8");
    const config = validateGameConfig(JSON.parse(raw) as unknown);
    registry.register(config);
    console.log(`Loaded game config: ${config.name} (${config.id})`);
  }
}

async function main(): Promise<void> {
  const gameRegistry = new GameRegistry();
  await loadAllConfigs(gameRegistry);

  const app = createApp({
    sessionStore: new InMemorySessionStore(),
    gameRegistry,
    rng: new CryptoRng(),
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
