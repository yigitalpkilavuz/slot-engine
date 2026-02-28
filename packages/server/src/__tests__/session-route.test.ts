import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../app.js";
import { InMemorySessionStore } from "../session/session-store.js";
import { GameRegistry } from "../game-registry.js";
import { CryptoRng } from "../rng.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeEach(() => {
  app = createApp(
    {
      sessionStore: new InMemorySessionStore(),
      gameRegistry: new GameRegistry(),
      rng: new CryptoRng(),
    },
    { logger: false },
  );
});

describe("POST /api/session", () => {
  it("creates a session with initial balance", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/session",
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(typeof body.sessionId).toBe("string");
    expect(body.balance).toBe(10000);
  });

  it("creates unique sessions", async () => {
    const r1 = await app.inject({ method: "POST", url: "/api/session" });
    const r2 = await app.inject({ method: "POST", url: "/api/session" });

    const b1 = r1.json();
    const b2 = r2.json();
    expect(b1.sessionId).not.toBe(b2.sessionId);
  });
});
