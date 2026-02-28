import { readFile } from "node:fs/promises";
import { validateGameConfig } from "@slot-engine/shared";
import { createApp } from "./app.js";
import { InMemorySessionStore } from "./session/session-store.js";
import { GameRegistry } from "./game-registry.js";
import { CryptoRng } from "./rng.js";

const PORT = Number(process.env["PORT"]) || 3000;
const CONFIG_PATH = new URL("../configs/classic-3x5.json", import.meta.url);

async function main(): Promise<void> {
  const gameRegistry = new GameRegistry();

  const raw = await readFile(CONFIG_PATH, "utf-8");
  const config = validateGameConfig(JSON.parse(raw) as unknown);
  gameRegistry.register(config);

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
