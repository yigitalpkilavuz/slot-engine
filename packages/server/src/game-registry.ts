import type { GameConfig } from "@slot-engine/shared";

export class GameRegistry {
  private readonly games = new Map<string, GameConfig>();

  register(config: GameConfig): void {
    if (this.games.has(config.id)) {
      throw new Error(`Game already registered: ${config.id}`);
    }
    this.games.set(config.id, config);
  }

  get(id: string): GameConfig | undefined {
    return this.games.get(id);
  }

  list(): readonly GameConfig[] {
    return [...this.games.values()];
  }
}
