import { randomUUID } from "node:crypto";
import type { FreeSpinModifierState } from "@slot-engine/shared";

export interface Session {
  readonly id: string;
  readonly balance: number;
  readonly freeSpinsRemaining: number;
  readonly freeSpinBet: number;
  readonly freeSpinAccumulatedWin: number;
  readonly freeSpinModifierStates?: readonly FreeSpinModifierState[];
  readonly activeGameId?: string;
}

export interface SessionStore {
  create(initialBalance: number): Session;
  get(id: string): Session | undefined;
  updateBalance(id: string, delta: number): Session;
  setFreeSpins(id: string, remaining: number, bet: number): Session;
  addFreeSpinWin(id: string, amount: number): Session;
  collectFreeSpinWin(id: string): { session: Session; collected: number };
  setActiveGameId(id: string, gameId: string | undefined): Session;
  setModifierStates(id: string, states: readonly FreeSpinModifierState[]): Session;
  clearModifierStates(id: string): Session;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  create(initialBalance: number): Session {
    const session: Session = {
      id: randomUUID(),
      balance: initialBalance,
      freeSpinsRemaining: 0,
      freeSpinBet: 0,
      freeSpinAccumulatedWin: 0,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  updateBalance(id: string, delta: number): Session {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    const newBalance = session.balance + delta;
    if (newBalance < 0) {
      throw new Error(
        `Insufficient balance: ${String(session.balance)}, needed: ${String(-delta)}`,
      );
    }

    const updated: Session = { ...session, balance: newBalance };
    this.sessions.set(id, updated);
    return updated;
  }

  setFreeSpins(id: string, remaining: number, bet: number): Session {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    const updated: Session = {
      ...session,
      freeSpinsRemaining: remaining,
      freeSpinBet: bet,
    };
    this.sessions.set(id, updated);
    return updated;
  }

  addFreeSpinWin(id: string, amount: number): Session {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    const updated: Session = {
      ...session,
      freeSpinAccumulatedWin: session.freeSpinAccumulatedWin + amount,
    };
    this.sessions.set(id, updated);
    return updated;
  }

  collectFreeSpinWin(id: string): { session: Session; collected: number } {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    const collected = session.freeSpinAccumulatedWin;
    const updated: Session = {
      ...session,
      freeSpinAccumulatedWin: 0,
    };
    this.sessions.set(id, updated);
    return { session: updated, collected };
  }

  setActiveGameId(id: string, gameId: string | undefined): Session {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    if (gameId !== undefined) {
      const updated: Session = { ...session, activeGameId: gameId };
      this.sessions.set(id, updated);
      return updated;
    }

    const { activeGameId: _, ...rest } = session;
    const updated = rest as Session;
    this.sessions.set(id, updated);
    return updated;
  }

  setModifierStates(id: string, states: readonly FreeSpinModifierState[]): Session {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    const updated: Session = { ...session, freeSpinModifierStates: states };
    this.sessions.set(id, updated);
    return updated;
  }

  clearModifierStates(id: string): Session {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    const { freeSpinModifierStates: _, ...rest } = session;
    const updated = rest as Session;
    this.sessions.set(id, updated);
    return updated;
  }
}
