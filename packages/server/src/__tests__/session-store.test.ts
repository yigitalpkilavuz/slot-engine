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
});
