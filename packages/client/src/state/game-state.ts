import type { FreeSpinModifierState, SpinResult } from "@slot-engine/shared";
import type { ClientGameConfig } from "../api/api-client.js";

export class GameState {
  private _sessionId = "";
  private _balance = 0;
  private _currentBet = 0;
  private _gameConfig: ClientGameConfig | null = null;
  private _isSpinning = false;
  private _lastResult: SpinResult | null = null;
  private _freeSpinsRemaining = 0;
  private _freeSpinsTotalWin = 0;
  private _activeModifierStates: readonly FreeSpinModifierState[] | null = null;

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

  get freeSpinsRemaining(): number {
    return this._freeSpinsRemaining;
  }

  get inFreeSpins(): boolean {
    return this._freeSpinsRemaining > 0;
  }

  get freeSpinsTotalWin(): number {
    return this._freeSpinsTotalWin;
  }

  get activeModifierStates(): readonly FreeSpinModifierState[] | null {
    return this._activeModifierStates;
  }

  get canSpin(): boolean {
    if (this._isSpinning) return false;
    if (this._freeSpinsRemaining > 0) return true;
    return this._balance >= this._currentBet && this._currentBet > 0;
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

  setSpinResult(result: SpinResult, balance: number, freeSpinsRemaining: number): void {
    this._lastResult = result;
    this._balance = balance;

    // Track free spin winnings
    if (this._freeSpinsRemaining > 0) {
      // Currently in free spins — accumulate payout
      this._freeSpinsTotalWin += result.totalPayout;
    } else if (freeSpinsRemaining > 0) {
      // Free spins just triggered — reset and start accumulating
      this._freeSpinsTotalWin = result.totalPayout;
    }

    this._freeSpinsRemaining = freeSpinsRemaining;

    // Track modifier states
    if (freeSpinsRemaining > 0 && result.freeSpinModifierStates) {
      this._activeModifierStates = result.freeSpinModifierStates;
    } else if (freeSpinsRemaining <= 0) {
      this._activeModifierStates = null;
    }
  }

  restoreFreeSpins(
    freeSpinsRemaining: number,
    freeSpinAccumulatedWin: number,
    bet: number,
    modifierStates: readonly FreeSpinModifierState[] | null,
  ): void {
    this._freeSpinsRemaining = freeSpinsRemaining;
    this._freeSpinsTotalWin = freeSpinAccumulatedWin;
    this._currentBet = bet;
    this._activeModifierStates = modifierStates;
  }

  clearLastResult(): void {
    this._lastResult = null;
  }
}
