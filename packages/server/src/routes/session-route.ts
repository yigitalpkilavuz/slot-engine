import type { FastifyInstance } from "fastify";
import type { SessionStore } from "../session/session-store.js";

const DEFAULT_INITIAL_BALANCE = 10000;

export function registerSessionRoute(app: FastifyInstance, sessionStore: SessionStore): void {
  app.post("/api/session", (_request, reply) => {
    const session = sessionStore.create(DEFAULT_INITIAL_BALANCE);
    return reply.status(201).send({
      sessionId: session.id,
      balance: session.balance,
    });
  });
}
