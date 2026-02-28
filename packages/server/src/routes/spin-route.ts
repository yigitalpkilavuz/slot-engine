import type { FastifyInstance } from "fastify";
import type { SessionStore } from "../session/session-store.js";
import type { GameRegistry } from "../game-registry.js";
import type { RandomNumberGenerator } from "../rng.js";
import { ApiError } from "../errors/api-error.js";
import { spin } from "../spin.js";

export function registerSpinRoute(
  app: FastifyInstance,
  sessionStore: SessionStore,
  gameRegistry: GameRegistry,
  rng: RandomNumberGenerator,
): void {
  app.post("/api/spin", (request, reply) => {
    const body = request.body;
    if (typeof body !== "object" || body === null) {
      throw new ApiError(400, "Request body must be a JSON object");
    }

    const { sessionId, gameId, bet } = body as {
      sessionId: unknown;
      gameId: unknown;
      bet: unknown;
    };

    if (typeof sessionId !== "string" || typeof gameId !== "string" || typeof bet !== "number") {
      throw new ApiError(
        400,
        "Request body must include sessionId (string), gameId (string), bet (number)",
      );
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      throw new ApiError(404, `Session not found: ${sessionId}`);
    }

    const config = gameRegistry.get(gameId);
    if (!config) {
      throw new ApiError(404, `Game not found: ${gameId}`);
    }

    const isFreeSpinMode = session.freeSpinsRemaining > 0;
    let effectiveBet: number;

    if (isFreeSpinMode) {
      effectiveBet = session.freeSpinBet;
    } else {
      if (!Number.isInteger(bet) || bet < 1) {
        throw new ApiError(400, "Bet must be a positive integer (cents)");
      }

      if (!config.betOptions.includes(bet)) {
        throw new ApiError(400, `Invalid bet. Options: ${config.betOptions.join(", ")}`);
      }

      if (session.balance < bet) {
        throw new ApiError(
          400,
          `Insufficient balance: ${String(session.balance)}, bet: ${String(bet)}`,
        );
      }

      effectiveBet = bet;
      sessionStore.updateBalance(sessionId, -bet);
    }

    const result = spin(config, effectiveBet, rng);

    const updated = sessionStore.updateBalance(sessionId, result.totalPayout);

    let freeSpinsRemaining: number;

    if (isFreeSpinMode) {
      freeSpinsRemaining = session.freeSpinsRemaining - 1 + result.freeSpinsAwarded;
      sessionStore.setFreeSpins(
        sessionId,
        freeSpinsRemaining,
        freeSpinsRemaining > 0 ? session.freeSpinBet : 0,
      );
    } else if (result.freeSpinsAwarded > 0) {
      freeSpinsRemaining = result.freeSpinsAwarded;
      sessionStore.setFreeSpins(sessionId, freeSpinsRemaining, effectiveBet);
    } else {
      freeSpinsRemaining = 0;
    }

    return reply.send({
      result,
      balance: updated.balance,
      freeSpinsRemaining,
    });
  });
}
