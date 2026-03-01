import { describe, it, expect } from "vitest";
import { InMemorySessionStore } from "../session/session-store.js";

describe("InMemorySessionStore", () => {
  it("creates a session with initial balance", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);

    expect(session.id).toBeDefined();
    expect(session.balance).toBe(10000);
  });

  it("retrieves a session by id", () => {
    const store = new InMemorySessionStore();
    const session = store.create(5000);
    const retrieved = store.get(session.id);

    expect(retrieved).toEqual(session);
  });

  it("returns undefined for unknown session", () => {
    const store = new InMemorySessionStore();

    expect(store.get("nonexistent")).toBeUndefined();
  });

  it("updates balance with positive delta (payout)", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);
    const updated = store.updateBalance(session.id, 500);

    expect(updated.balance).toBe(10500);
  });

  it("updates balance with negative delta (bet)", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);
    const updated = store.updateBalance(session.id, -100);

    expect(updated.balance).toBe(9900);
  });

  it("throws on insufficient balance", () => {
    const store = new InMemorySessionStore();
    const session = store.create(100);

    expect(() => store.updateBalance(session.id, -200)).toThrow("Insufficient balance");
  });

  it("throws on unknown session id", () => {
    const store = new InMemorySessionStore();

    expect(() => store.updateBalance("nonexistent", 100)).toThrow("Session not found");
  });

  it("creates session with zero free spins by default", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);

    expect(session.freeSpinsRemaining).toBe(0);
    expect(session.freeSpinBet).toBe(0);
  });

  it("sets free spins remaining and bet", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);
    const updated = store.setFreeSpins(session.id, 10, 25);

    expect(updated.freeSpinsRemaining).toBe(10);
    expect(updated.freeSpinBet).toBe(25);
  });

  it("persists free spin state", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);
    store.setFreeSpins(session.id, 5, 50);
    const retrieved = store.get(session.id);

    expect(retrieved!.freeSpinsRemaining).toBe(5);
    expect(retrieved!.freeSpinBet).toBe(50);
  });

  it("throws when setting free spins for unknown session", () => {
    const store = new InMemorySessionStore();

    expect(() => store.setFreeSpins("nonexistent", 10, 25)).toThrow("Session not found");
  });

  it("sets and retrieves modifier states", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);
    const states = [{ type: "increasingMultiplier" as const, currentMultiplier: 3 }];
    const updated = store.setModifierStates(session.id, states);

    expect(updated.freeSpinModifierStates).toEqual(states);

    const retrieved = store.get(session.id);
    expect(retrieved!.freeSpinModifierStates).toEqual(states);
  });

  it("clears modifier states", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);
    store.setModifierStates(session.id, [{ type: "increasingMultiplier" as const, currentMultiplier: 2 }]);
    const cleared = store.clearModifierStates(session.id);

    expect(cleared.freeSpinModifierStates).toBeUndefined();
  });

  it("creates session without modifier states by default", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);

    expect(session.freeSpinModifierStates).toBeUndefined();
  });

  it("creates session with zero accumulated win", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);

    expect(session.freeSpinAccumulatedWin).toBe(0);
  });

  it("accumulates free spin wins", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);
    store.addFreeSpinWin(session.id, 100);
    store.addFreeSpinWin(session.id, 200);

    const retrieved = store.get(session.id)!;
    expect(retrieved.freeSpinAccumulatedWin).toBe(300);
    expect(retrieved.balance).toBe(10000); // balance unchanged
  });

  it("collects accumulated win and resets to zero", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);
    store.addFreeSpinWin(session.id, 150);
    store.addFreeSpinWin(session.id, 250);

    const { session: updated, collected } = store.collectFreeSpinWin(session.id);
    expect(collected).toBe(400);
    expect(updated.freeSpinAccumulatedWin).toBe(0);
  });

  it("creates session without activeGameId by default", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);

    expect(session.activeGameId).toBeUndefined();
  });

  it("sets activeGameId", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);
    const updated = store.setActiveGameId(session.id, "test-game");

    expect(updated.activeGameId).toBe("test-game");
  });

  it("clears activeGameId", () => {
    const store = new InMemorySessionStore();
    const session = store.create(10000);
    store.setActiveGameId(session.id, "test-game");
    const cleared = store.setActiveGameId(session.id, undefined);

    expect(cleared.activeGameId).toBeUndefined();
  });
});
