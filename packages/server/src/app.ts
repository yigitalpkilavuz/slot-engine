import Fastify from "fastify";
import cors from "@fastify/cors";
import type { SessionStore } from "./session/session-store.js";
import type { GameRegistry } from "./game-registry.js";
import type { RandomNumberGenerator } from "./rng.js";
import { ApiError } from "./errors/api-error.js";
import { registerSessionRoute } from "./routes/session-route.js";
import { registerSpinRoute } from "./routes/spin-route.js";
import { registerConfigRoute } from "./routes/config-route.js";

interface AppOptions {
  logger?: boolean;
}

interface AppDependencies {
  sessionStore: SessionStore;
  gameRegistry: GameRegistry;
  rng: RandomNumberGenerator;
}

export function createApp(deps: AppDependencies, options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });

  void app.register(cors);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    // Forward Fastify's built-in client errors (JSON parse, content-type, etc.)
    if (
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    app.log.error(error);
    return reply.status(500).send({ error: "Internal server error" });
  });

  registerSessionRoute(app, deps.sessionStore);
  registerSpinRoute(app, deps.sessionStore, deps.gameRegistry, deps.rng);
  registerConfigRoute(app, deps.gameRegistry);

  return app;
}
