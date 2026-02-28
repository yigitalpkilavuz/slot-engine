import { randomUUID } from "node:crypto";

export interface Session {
  readonly id: string;
  readonly balance: number;
}

export interface SessionStore {
  create(initialBalance: number): Session;
  get(id: string): Session | undefined;
  updateBalance(id: string, delta: number): Session;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  create(initialBalance: number): Session {
    const session: Session = { id: randomUUID(), balance: initialBalance };
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
}
