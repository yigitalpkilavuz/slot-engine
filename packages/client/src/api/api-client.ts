import type { GameConfig, SpinResult } from "@slot-engine/shared";

export type ClientGameConfig = Omit<GameConfig, "reels">;

export interface SessionResponse {
  readonly sessionId: string;
  readonly balance: number;
}

export interface GameListResponse {
  readonly games: readonly { readonly id: string; readonly name: string }[];
}

export interface SpinRequest {
  readonly sessionId: string;
  readonly gameId: string;
  readonly bet: number;
}

export interface SpinResponse {
  readonly result: SpinResult;
  readonly balance: number;
  readonly freeSpinsRemaining: number;
}

export class ApiClientError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      if (typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // Response body is not JSON — fall back to statusText
    }
    throw new ApiClientError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export function createSession(): Promise<SessionResponse> {
  return fetchJson<SessionResponse>("/api/session", { method: "POST" });
}

export function fetchGameConfig(gameId: string): Promise<ClientGameConfig> {
  return fetchJson<ClientGameConfig>(`/api/games/${encodeURIComponent(gameId)}`);
}

export function fetchGameList(): Promise<GameListResponse> {
  return fetchJson<GameListResponse>("/api/games");
}

export function requestSpin(params: SpinRequest): Promise<SpinResponse> {
  return fetchJson<SpinResponse>("/api/spin", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
