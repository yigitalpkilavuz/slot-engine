import type { SpinResult } from "@slot-engine/shared";
import type { ClientGameConfig } from "../api/api-client.js";

export class GameState {
  private _sessionId = "";
  private _balance = 0;
  private _currentBet = 0;
  private _gameConfig: ClientGameConfig | null = null;
  private _isSpinning = false;
  private _lastResult: SpinResult | null = null;

  get sessionId(): string {
    return this._sessionId;
  }

  get balance(): number {
    return this._balance;
  }

  get currentBet(): number {
    return this._currentBet;
  }

  get gameConfig(): ClientGameConfig | null {
    return this._gameConfig;
  }

  get isSpinning(): boolean {
    return this._isSpinning;
  }

  get lastResult(): SpinResult | null {
    return this._lastResult;
  }

  get canSpin(): boolean {
    return !this._isSpinning && this._balance >= this._currentBet && this._currentBet > 0;
  }

  get reelCount(): number {
    if (!this._gameConfig) return 0;
    const firstPayline = this._gameConfig.paylines[0];
    return firstPayline ? firstPayline.length : 0;
  }

  setSession(sessionId: string, balance: number): void {
    this._sessionId = sessionId;
    this._balance = balance;
  }

  setGameConfig(config: ClientGameConfig): void {
    this._gameConfig = config;
    this._currentBet = config.defaultBet;
  }

  setCurrentBet(bet: number): void {
    if (this._gameConfig && this._gameConfig.betOptions.includes(bet)) {
      this._currentBet = bet;
    }
  }

  setSpinning(spinning: boolean): void {
    this._isSpinning = spinning;
  }

  setSpinResult(result: SpinResult, balance: number): void {
    this._lastResult = result;
    this._balance = balance;
  }

  clearLastResult(): void {
    this._lastResult = null;
  }
}
