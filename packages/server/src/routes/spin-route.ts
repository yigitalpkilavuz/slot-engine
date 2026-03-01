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

    const { sessionId, gameId, bet, bonusBuy } = body as {
      sessionId: unknown;
      gameId: unknown;
      bet: unknown;
      bonusBuy: unknown;
    };

    if (typeof sessionId !== "string" || typeof gameId !== "string" || typeof bet !== "number") {
      throw new ApiError(
        400,
        "Request body must include sessionId (string), gameId (string), bet (number)",
      );
    }

    const isBonusBuy = bonusBuy === true;

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

    if (isBonusBuy && isFreeSpinMode) {
      throw new ApiError(400, "Bonus buy is not allowed during free spins");
    }

    if (isBonusBuy && !config.bonusBuyCostMultiplier) {
      throw new ApiError(400, "This game does not support bonus buy");
    }

    if (isFreeSpinMode) {
      effectiveBet = session.freeSpinBet;
    } else {
      if (!Number.isInteger(bet) || bet < 1) {
        throw new ApiError(400, "Bet must be a positive integer (cents)");
      }

      if (!config.betOptions.includes(bet)) {
        throw new ApiError(400, `Invalid bet. Options: ${config.betOptions.join(", ")}`);
      }

      const cost = isBonusBuy ? bet * config.bonusBuyCostMultiplier! : bet;

      if (session.balance < cost) {
        throw new ApiError(
          400,
          `Insufficient balance: ${String(session.balance)}, cost: ${String(cost)}`,
        );
      }

      effectiveBet = bet;
      sessionStore.updateBalance(sessionId, -cost);
    }

    const previousModifierStates = isFreeSpinMode
      ? session.freeSpinModifierStates
      : undefined;

    const result = spin(config, effectiveBet, rng, isBonusBuy, isFreeSpinMode, previousModifierStates);

    // During free spins: accumulate payouts, pay out at once when bonus ends
    let balanceAfter: number;
    let freeSpinsRemaining: number;

    if (isFreeSpinMode) {
      // Accumulate payout — don't add to balance yet
      if (result.totalPayout > 0) {
        sessionStore.addFreeSpinWin(sessionId, result.totalPayout);
      }

      freeSpinsRemaining = session.freeSpinsRemaining - 1 + result.freeSpinsAwarded;
      sessionStore.setFreeSpins(
        sessionId,
        freeSpinsRemaining,
        freeSpinsRemaining > 0 ? session.freeSpinBet : 0,
      );

      if (freeSpinsRemaining > 0 && result.freeSpinModifierStates) {
        sessionStore.setModifierStates(sessionId, result.freeSpinModifierStates);
      } else if (freeSpinsRemaining <= 0) {
        sessionStore.clearModifierStates(sessionId);
      }

      if (freeSpinsRemaining <= 0) {
        // Bonus over — pay out all accumulated winnings at once
        sessionStore.setActiveGameId(sessionId, undefined);
        const { session: paid, collected } = sessionStore.collectFreeSpinWin(sessionId);
        if (collected > 0) {
          const finalSession = sessionStore.updateBalance(sessionId, collected);
          balanceAfter = finalSession.balance;
        } else {
          balanceAfter = paid.balance;
        }
      } else {
        // Still in bonus — balance unchanged
        balanceAfter = session.balance;
      }
    } else {
      // Normal spin — pay out immediately
      const updated = sessionStore.updateBalance(sessionId, result.totalPayout);
      balanceAfter = updated.balance;

      if (result.freeSpinsAwarded > 0) {
        freeSpinsRemaining = result.freeSpinsAwarded;
        sessionStore.setFreeSpins(sessionId, freeSpinsRemaining, effectiveBet);
        sessionStore.setActiveGameId(sessionId, gameId);

        // Initialize empty modifier states for the upcoming free spin round
        if (config.freeSpinModifiers && config.freeSpinModifiers.length > 0) {
          sessionStore.setModifierStates(sessionId, []);
        }
      } else {
        freeSpinsRemaining = 0;
      }
    }

    return reply.send({
      result,
      balance: balanceAfter,
      freeSpinsRemaining,
    });
  });
}
