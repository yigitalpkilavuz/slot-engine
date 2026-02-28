import { describe, it, expect, beforeEach } from "vitest";
import type { GameConfig } from "@slot-engine/shared";
import { createApp } from "../app.js";
import { InMemorySessionStore } from "../session/session-store.js";
import { GameRegistry } from "../game-registry.js";
import { CryptoRng } from "../rng.js";
import type { FastifyInstance } from "fastify";

const TEST_CONFIG: GameConfig = {
  id: "test-game",
  name: "Test Game",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
  ],
  reels: [
    ["cherry", "bar", "cherry"],
    ["bar", "cherry", "bar"],
    ["cherry", "bar", "cherry"],
  ],
  paylines: [[1, 1, 1]],
  payouts: [{ symbolId: "cherry", count: 3, multiplier: 10 }],
  betOptions: [10, 50],
  defaultBet: 10,
};

let app: FastifyInstance;
let sessionId: string;

beforeEach(async () => {
  const gameRegistry = new GameRegistry();
  gameRegistry.register(TEST_CONFIG);

  app = createApp(
    {
      sessionStore: new InMemorySessionStore(),
      gameRegistry,
      rng: new CryptoRng(),
    },
    { logger: false },
  );

  const sessionResponse = await app.inject({
    method: "POST",
    url: "/api/session",
  });
  sessionId = sessionResponse.json().sessionId;
});

describe("POST /api/spin", () => {
  it("returns a spin result and updated balance", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/spin",
      payload: { sessionId, gameId: "test-game", bet: 10 },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.result.grid).toHaveLength(3);
    expect(typeof body.balance).toBe("number");
  });

  it("deducts bet from balance", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/spin",
      payload: { sessionId, gameId: "test-game", bet: 50 },
    });

    const body = response.json();
    // Balance should be 10000 - 50 + whatever was won
    expect(body.balance).toBe(10000 - 50 + body.result.totalPayout);
  });

  it("returns 404 for unknown session", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/spin",
      payload: { sessionId: "nonexistent", gameId: "test-game", bet: 10 },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 404 for unknown game", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/spin",
      payload: { sessionId, gameId: "nonexistent", bet: 10 },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 400 for invalid bet", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/spin",
      payload: { sessionId, gameId: "test-game", bet: 999 },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for non-integer bet", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/spin",
      payload: { sessionId, gameId: "test-game", bet: 5.5 },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for null body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/spin",
      headers: { "content-type": "application/json" },
      body: "null",
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/spin",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when balance is insufficient", async () => {
    // Create a fresh app with a session store where we control the balance
    const lowBalanceStore = new InMemorySessionStore();
    const lowSession = lowBalanceStore.create(5);
    const lowGameRegistry = new GameRegistry();
    lowGameRegistry.register(TEST_CONFIG);

    const lowApp = createApp(
      {
        sessionStore: lowBalanceStore,
        gameRegistry: lowGameRegistry,
        rng: new CryptoRng(),
      },
      { logger: false },
    );

    const response = await lowApp.inject({
      method: "POST",
      url: "/api/spin",
      payload: { sessionId: lowSession.id, gameId: "test-game", bet: 10 },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toContain("Insufficient balance");
  });
});

describe("GET /api/games/:gameId", () => {
  it("returns game config without reel strips", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/games/test-game",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe("test-game");
    expect(body.symbols).toHaveLength(2);
    expect(body.betOptions).toEqual([10, 50]);
    expect(body.reels).toBeUndefined();
  });

  it("returns 404 for unknown game", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/games/nonexistent",
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("GET /api/games", () => {
  it("lists available games", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/games",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.games).toHaveLength(1);
    expect(body.games[0]!.id).toBe("test-game");
  });
});
