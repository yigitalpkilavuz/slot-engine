import type { FreeSpinModifierState } from "@slot-engine/shared";
import type { Ticker } from "pixi.js";
import { Assets, Container, Sprite, Text, Texture, TextStyle } from "pixi.js";
import type { GameState } from "../state/game-state.js";
import type { ClientGameConfig } from "../api/api-client.js";
import { requestSpin } from "../api/api-client.js";
import {
  createReelGrid,
  setGridSymbols,
  startGridSpin,
  stopGridSpin,
  computeReelDelays,
  animateExpandingWilds,
  animateCascadeTransition,
  REEL_GAP,
  GRID_PADDING,
} from "../ui/reel-grid.js";
import { CELL_WIDTH, CELL_HEIGHT } from "../ui/symbol-cell.js";
import { CELL_GAP } from "../ui/reel-column.js";
import { createHud, updateAutoSpinButton } from "../ui/hud.js";
import { updateBalanceDisplay } from "../ui/balance-display.js";
import { updateBetSelector } from "../ui/bet-selector.js";
import { updateSpinButton, updateSpinButtonAutoStop, resetSpinButtonLabel } from "../ui/spin-button.js";
import { createWinDisplay, showWin, clearWin } from "../ui/win-display.js";
import { createFreeSpinsDisplay, updateFreeSpinsDisplay } from "../ui/free-spins-display.js";
import { showBonusAnnouncement } from "../ui/bonus-announcement.js";
import { showFreeSpinsSummary } from "../ui/free-spins-summary.js";
import { createPaytableOverlay } from "../ui/paytable-overlay.js";
import { createAutoSpinSelector } from "../ui/auto-spin-selector.js";
import { updateBonusBuyButton } from "../ui/bonus-buy-button.js";
import {
  FONT_DISPLAY, FONT_BODY,
  GOLD, SILVER,
  registerGameSymbols,
} from "../ui/design-tokens.js";

const MIN_SPIN_DURATION_MS = 600;
const BAR_HEIGHT = 72;

const TITLE_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 26,
  fontWeight: "700",
  fill: GOLD,
});

const BACK_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 15,
  fontWeight: "500",
  fill: SILVER,
});

export function buildGameScene(
  canvasWidth: number,
  canvasHeight: number,
  gameState: GameState,
  ticker: Ticker,
  onBack: () => void,
): Container {
  const config = gameState.gameConfig;
  if (!config) {
    throw new Error("GameState must have a game config before building the scene");
  }

  registerGameSymbols(config.symbols);

  const scene = new Container();

  // Background image (if loaded for this game)
  const bgTexture = Assets.get<Texture>("ui-background");
  if (bgTexture instanceof Texture) {
    const bg = new Sprite(bgTexture);
    bg.width = canvasWidth;
    bg.height = canvasHeight;
    scene.addChild(bg);
  }

  const reelCount = gameState.reelCount;
  const rowCount = config.rows;

  // Back button
  const backBtn = new Container();
  backBtn.eventMode = "static";
  backBtn.cursor = "pointer";
  const backText = new Text({ text: "\u2190 BACK", style: BACK_STYLE });
  backBtn.addChild(backText);
  backBtn.x = 20;
  backBtn.y = 26;
  backBtn.on("pointerdown", onBack);
  scene.addChild(backBtn);

  function setBackEnabled(enabled: boolean): void {
    backBtn.eventMode = enabled ? "static" : "none";
    backBtn.alpha = enabled ? 1 : 0.4;
  }

  // Title
  const title = new Text({ text: config.name, style: TITLE_STYLE });
  title.anchor.set(0.5, 0);
  title.x = canvasWidth / 2;
  title.y = 24;
  scene.addChild(title);

  // Reel grid — vertically centered between header and HUD
  const reelGrid = createReelGrid(reelCount, rowCount);
  const gridContentWidth = reelCount * CELL_WIDTH + (reelCount - 1) * REEL_GAP;
  const gridPanelWidth = gridContentWidth + GRID_PADDING * 2;
  const gridPanelHeight = rowCount * CELL_HEIGHT + (rowCount - 1) * CELL_GAP + GRID_PADDING * 2;
  const contentTop = 60;
  const contentBottom = canvasHeight - BAR_HEIGHT;
  reelGrid.x = (canvasWidth - gridPanelWidth) / 2;
  reelGrid.y = contentTop + Math.max(0, (contentBottom - contentTop - gridPanelHeight) / 2);
  scene.addChild(reelGrid);

  // Build scatter IDs set for highlight logic
  const scatterIds = new Set(config.symbols.filter((s) => s.scatter === true).map((s) => s.id));

  // Build badge map for wild multiplier display
  const badgeMap = new Map<string, string>();
  for (const sym of config.symbols) {
    if (sym.wild === true && sym.wildMultiplier !== undefined && sym.wildMultiplier > 1) {
      badgeMap.set(sym.id, `${String(sym.wildMultiplier)}x`);
    }
  }

  // Set initial display with cycling symbols
  const initialGrid = buildInitialGrid(config.symbols.map((s) => s.id), reelCount, rowCount);
  setGridSymbols(reelGrid, initialGrid, badgeMap);

  // Win display — 16px gap below grid, clamped above HUD
  const winDisplay = createWinDisplay(canvasWidth);
  winDisplay.y = Math.min(reelGrid.y + gridPanelHeight + 16, contentBottom - 28);
  scene.addChild(winDisplay);

  // Free spins display — banner above the grid, replaces title during bonus
  const freeSpinsDisplay = createFreeSpinsDisplay(canvasWidth);
  freeSpinsDisplay.y = reelGrid.y - 42;
  scene.addChild(freeSpinsDisplay);

  function syncFreeSpinsUI(remaining: number, modifierStates?: readonly FreeSpinModifierState[] | null): void {
    updateFreeSpinsDisplay(freeSpinsDisplay, remaining, modifierStates);
    title.visible = !(remaining > 0);
  }

  // Paytable overlay toggle
  let paytableVisible = false;
  let paytableOverlay: Container | null = null;

  function handleInfo(): void {
    if (paytableVisible && paytableOverlay) {
      scene.removeChild(paytableOverlay);
      paytableOverlay.destroy({ children: true });
      paytableOverlay = null;
      paytableVisible = false;
    } else {
      paytableOverlay = createPaytableOverlay(canvasWidth, canvasHeight, config!, handleInfo);
      scene.addChild(paytableOverlay);
      paytableVisible = true;
    }
  }

  // Auto-spin state
  let autoSpinsRemaining = 0;
  let autoSpinActive = false;
  let autoSpinSelectorVisible = false;
  let autoSpinSelectorPopup: Container | null = null;

  function isAutoSpinning(): boolean {
    return autoSpinActive && autoSpinsRemaining > 0;
  }

  function stopAutoSpin(): void {
    autoSpinActive = false;
    autoSpinsRemaining = 0;
    resetSpinButtonLabel(hud.spinButton);
  }

  function handleAutoSpinToggle(): void {
    if (autoSpinSelectorVisible && autoSpinSelectorPopup) {
      scene.removeChild(autoSpinSelectorPopup);
      autoSpinSelectorPopup.destroy({ children: true });
      autoSpinSelectorPopup = null;
      autoSpinSelectorVisible = false;
      return;
    }

    const popup = createAutoSpinSelector(
      (count: number) => {
        // Close popup
        if (autoSpinSelectorPopup) {
          scene.removeChild(autoSpinSelectorPopup);
          autoSpinSelectorPopup.destroy({ children: true });
          autoSpinSelectorPopup = null;
          autoSpinSelectorVisible = false;
        }

        // Start auto-spin
        autoSpinsRemaining = count;
        autoSpinActive = true;
        void handleSpin();
      },
      () => {
        // Close popup
        if (autoSpinSelectorPopup) {
          scene.removeChild(autoSpinSelectorPopup);
          autoSpinSelectorPopup.destroy({ children: true });
          autoSpinSelectorPopup = null;
          autoSpinSelectorVisible = false;
        }
      },
    );

    // Position above the auto button
    popup.x = hud.autoSpinButton.x + hud.container.x - 40;
    popup.y = hud.container.y - 230;
    scene.addChild(popup);
    autoSpinSelectorPopup = popup;
    autoSpinSelectorVisible = true;
  }

  function handleSpinOrStop(): void {
    if (isAutoSpinning()) {
      stopAutoSpin();
      updateSpinButton(hud.spinButton, gameState.canSpin);
      updateAutoSpinButton(hud.autoSpinButton, true);
      updateBetSelector(hud.betSelector, gameState.currentBet, true);
      updateBonusBuyState(true);
      setBackEnabled(true);
      return;
    }
    void handleSpin();
  }

  const hasBonusBuy = config.bonusBuyCostMultiplier !== undefined;

  function handleBonusBuy(): void {
    void handleSpin(true);
  }

  function updateBonusBuyState(enabled: boolean): void {
    if (hud.bonusBuyButton && config) {
      const cost = gameState.currentBet * config.bonusBuyCostMultiplier!;
      const canAfford = gameState.balance >= cost;
      updateBonusBuyButton(hud.bonusBuyButton, enabled && canAfford && !gameState.inFreeSpins, cost);
    }
  }

  // HUD
  const hud = createHud(
    canvasWidth,
    config.betOptions,
    config.defaultBet,
    handleBetChange,
    handleInfo,
    hasBonusBuy ? handleBonusBuy : null,
    handleAutoSpinToggle,
    handleSpinOrStop,
  );
  hud.container.y = canvasHeight - BAR_HEIGHT;
  scene.addChild(hud.container);

  // Set initial balance
  updateBalanceDisplay(hud.balanceDisplay, gameState.balance);

  // Set initial bonus buy button state
  updateBonusBuyState(true);

  function handleBetChange(newBet: number): void {
    gameState.setCurrentBet(newBet);
    clearWin(winDisplay);
    updateSpinButton(hud.spinButton, gameState.canSpin);
    updateBonusBuyState(true);
  }

  async function handleSpin(bonusBuy = false): Promise<void> {
    if (!gameState.canSpin || !config) return;

    gameState.setSpinning(true);
    setBackEnabled(false);
    updateAutoSpinButton(hud.autoSpinButton, false);
    updateBonusBuyState(false);

    // Show stop button during auto-spin, disable during regular spin
    if (isAutoSpinning()) {
      updateSpinButtonAutoStop(hud.spinButton, autoSpinsRemaining);
    } else {
      updateSpinButton(hud.spinButton, false);
    }

    updateBetSelector(hud.betSelector, gameState.currentBet, false);
    clearWin(winDisplay);

    const spinStartTime = performance.now();

    // Fire API + start animation in parallel
    const spinPromise = requestSpin({
      sessionId: gameState.sessionId,
      gameId: config.id,
      bet: gameState.currentBet,
      ...(bonusBuy ? { bonusBuy: true } : {}),
    });

    startGridSpin(reelGrid, config.symbols, ticker);

    const wasInFreeSpins = gameState.inFreeSpins;

    try {
      const response = await spinPromise;
      gameState.setSpinResult(response.result, response.balance, response.freeSpinsRemaining);
    } catch (error: unknown) {
      console.error("Spin failed:", error);
      await stopGridSpin(reelGrid, initialGrid, ticker, undefined, badgeMap);
      gameState.setSpinning(false);
      stopAutoSpin();
      syncFreeSpinsUI(gameState.freeSpinsRemaining, gameState.activeModifierStates);
      setBackEnabled(!gameState.inFreeSpins);
      updateAutoSpinButton(hud.autoSpinButton, !gameState.inFreeSpins);
      updateSpinButton(hud.spinButton, gameState.canSpin);
      updateBetSelector(hud.betSelector, gameState.currentBet, !gameState.inFreeSpins);
      updateBonusBuyState(!gameState.inFreeSpins);
      return;
    }

    // Enforce minimum spin duration
    const elapsed = performance.now() - spinStartTime;
    if (elapsed < MIN_SPIN_DURATION_MS) {
      await delay(MIN_SPIN_DURATION_MS - elapsed);
    }

    const result = gameState.lastResult!;

    // Determine which grid to show on reel stop (original if expanding wilds)
    const displayGrid = result.originalGrid ?? result.grid;

    // Compute scatter anticipation delays (based on the grid the player sees landing)
    const scatterThreshold = getMinScatterThreshold(config);
    const reelDelays = scatterThreshold > 0
      ? computeReelDelays(displayGrid, scatterIds, scatterThreshold, reelCount)
      : undefined;

    // Stop reels with stagger (+ anticipation if 2+ scatters landed early)
    await stopGridSpin(reelGrid, displayGrid, ticker, reelDelays, badgeMap);

    // Animate expanding wilds if triggered
    if (result.originalGrid) {
      await animateExpandingWilds(reelGrid, result.originalGrid, result.grid, ticker, badgeMap);
    }

    // Update balance and free spins
    updateBalanceDisplay(hud.balanceDisplay, gameState.balance);
    syncFreeSpinsUI(gameState.freeSpinsRemaining, gameState.activeModifierStates);

    // Show wins — animate cascade steps if present
    const gridOrigin = { x: reelGrid.x, y: reelGrid.y };
    if (result.cascadeSteps && result.cascadeSteps.length > 1) {
      for (let step = 0; step < result.cascadeSteps.length; step++) {
        const cascade = result.cascadeSteps[step]!;

        // Show this step's grid (step 0 is already displayed from reel stop)
        if (step > 0) {
          setGridSymbols(reelGrid, cascade.grid, badgeMap);
        }

        // Highlight this step's wins
        if (cascade.wins.length > 0) {
          showWin(winDisplay, cascade.payout, cascade.wins, config.paylines, gridOrigin, cascade.grid, scatterIds);
          await delay(1000);
          clearWin(winDisplay);

          // Flash out winning cells
          await animateCascadeTransition(reelGrid, cascade.wins, config.paylines, cascade.grid, scatterIds, ticker);
        }
      }

      // Show final grid + total win
      setGridSymbols(reelGrid, result.grid, badgeMap);
      if (result.totalPayout > 0) {
        showWin(winDisplay, result.totalPayout, result.wins, config.paylines, gridOrigin, result.grid, scatterIds);
      }
    } else if (result.totalPayout > 0) {
      showWin(winDisplay, result.totalPayout, result.wins, config.paylines, gridOrigin, result.grid, scatterIds);
    }

    // Show bonus announcement when free spins are first triggered
    const bonusTriggered = result.freeSpinsAwarded > 0 && !wasInFreeSpins;
    if (bonusTriggered) {
      // Stop auto-spin on bonus trigger
      stopAutoSpin();

      const modifierNames = getModifierDisplayNames(config);
      const { overlay, waitForComplete } = showBonusAnnouncement(
        canvasWidth, canvasHeight, result.freeSpinsAwarded, ticker, modifierNames,
      );
      scene.addChild(overlay);
      await waitForComplete();
      scene.removeChild(overlay);
      overlay.destroy({ children: true });
    }

    gameState.setSpinning(false);

    // During free spins: auto-spin after delay, keep controls locked
    if (gameState.inFreeSpins) {
      await delay(1500);
      void handleSpin();
      return;
    }

    // Show free spins summary when bonus round ends
    if (wasInFreeSpins) {
      const totalWin = gameState.freeSpinsTotalWin;
      const { overlay: summaryOverlay, waitForComplete: waitForSummary } = showFreeSpinsSummary(
        canvasWidth, canvasHeight, totalWin, ticker,
      );
      scene.addChild(summaryOverlay);
      await waitForSummary();
      scene.removeChild(summaryOverlay);
      summaryOverlay.destroy({ children: true });
    }

    // Auto-spin continuation
    if (isAutoSpinning()) {
      if (autoSpinsRemaining !== Infinity) {
        autoSpinsRemaining--;
      }

      if (autoSpinsRemaining > 0) {
        await delay(500);
        void handleSpin();
        return;
      }

      // Auto-spin finished
      stopAutoSpin();
    }

    setBackEnabled(true);
    updateAutoSpinButton(hud.autoSpinButton, true);
    updateSpinButton(hud.spinButton, gameState.canSpin);
    updateBetSelector(hud.betSelector, gameState.currentBet, true);
    updateBonusBuyState(true);
  }

  // If resuming into an active free spin round, auto-start the spin loop
  if (gameState.inFreeSpins) {
    syncFreeSpinsUI(gameState.freeSpinsRemaining, gameState.activeModifierStates);
    updateBetSelector(hud.betSelector, gameState.currentBet, false);
    updateSpinButton(hud.spinButton, false);
    setBackEnabled(false);
    updateAutoSpinButton(hud.autoSpinButton, false);
    updateBonusBuyState(false);
    setTimeout(() => { void handleSpin(); }, 1000);
  }

  return scene;
}

function buildInitialGrid(
  symbolIds: readonly string[],
  reelCount: number,
  rowCount: number,
): readonly (readonly string[])[] {
  const grid: string[][] = [];
  for (let row = 0; row < rowCount; row++) {
    const rowSymbols: string[] = [];
    for (let reel = 0; reel < reelCount; reel++) {
      const idx = (row * reelCount + reel) % symbolIds.length;
      rowSymbols.push(symbolIds[idx]!);
    }
    grid.push(rowSymbols);
  }
  return grid;
}

function getMinScatterThreshold(config: ClientGameConfig): number {
  const rules = config.scatterRules;
  if (!rules || rules.length === 0) return 0;
  let min = Infinity;
  for (const rule of rules) {
    if (rule.count < min) {
      min = rule.count;
    }
  }
  return min === Infinity ? 0 : min;
}

const MODIFIER_DISPLAY_NAMES: Record<string, string> = {
  stickyWilds: "STICKY WILDS",
  increasingMultiplier: "RISING MULTIPLIER",
  extraWilds: "EXTRA WILDS",
  symbolUpgrade: "SYMBOL UPGRADE",
};

function getModifierDisplayNames(config: ClientGameConfig): readonly string[] | undefined {
  if (!config.freeSpinModifiers || config.freeSpinModifiers.length === 0) return undefined;
  return config.freeSpinModifiers.map(
    (m) => MODIFIER_DISPLAY_NAMES[m.type] ?? m.type.toUpperCase(),
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
