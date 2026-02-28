import type { FastifyInstance } from "fastify";
import type { GameRegistry } from "../game-registry.js";
import { ApiError } from "../errors/api-error.js";

export function registerConfigRoute(app: FastifyInstance, gameRegistry: GameRegistry): void {
  app.get<{ Params: { gameId: string } }>("/api/games/:gameId", (request, reply) => {
    const config = gameRegistry.get(request.params.gameId);
    if (!config) {
      throw new ApiError(404, `Game not found: ${request.params.gameId}`);
    }
    // Omit reel strips — exposing them lets clients reverse-engineer odds
    const { reels: _, ...clientConfig } = config;
    return reply.send(clientConfig);
  });

  app.get("/api/games", (_request, reply) => {
    const games = gameRegistry.list().map((g) => ({ id: g.id, name: g.name }));
    return reply.send({ games });
  });
}
