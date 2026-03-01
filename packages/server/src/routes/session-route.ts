import type { FastifyInstance } from "fastify";
import type { SessionStore } from "../session/session-store.js";
import { ApiError } from "../errors/api-error.js";

const DEFAULT_INITIAL_BALANCE = 10000;

export function registerSessionRoute(app: FastifyInstance, sessionStore: SessionStore): void {
  app.post("/api/session", (_request, reply) => {
    const session = sessionStore.create(DEFAULT_INITIAL_BALANCE);
    return reply.status(201).send({
      sessionId: session.id,
      balance: session.balance,
    });
  });

  app.get<{ Params: { sessionId: string } }>("/api/session/:sessionId", (request, reply) => {
    const session = sessionStore.get(request.params.sessionId);
    if (!session) {
      throw new ApiError(404, `Session not found: ${request.params.sessionId}`);
    }

    return reply.send({
      sessionId: session.id,
      balance: session.balance,
      freeSpinsRemaining: session.freeSpinsRemaining,
      freeSpinBet: session.freeSpinBet,
      freeSpinAccumulatedWin: session.freeSpinAccumulatedWin,
      freeSpinModifierStates: session.freeSpinModifierStates ?? null,
      activeGameId: session.activeGameId ?? null,
    });
  });
}
