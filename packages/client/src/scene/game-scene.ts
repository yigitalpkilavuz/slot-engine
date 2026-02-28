import type { Ticker } from "pixi.js";
import { Container, Text, TextStyle } from "pixi.js";
import type { GameState } from "../state/game-state.js";
import { requestSpin } from "../api/api-client.js";
import {
  createReelGrid,
  setGridSymbols,
  startGridSpin,
  stopGridSpin,
  REEL_GAP,
  GRID_PADDING,
} from "../ui/reel-grid.js";
import { CELL_WIDTH } from "../ui/symbol-cell.js";
import { createHud } from "../ui/hud.js";
import { updateBalanceDisplay } from "../ui/balance-display.js";
import { updateBetSelector } from "../ui/bet-selector.js";
import { updateSpinButton } from "../ui/spin-button.js";
import { createWinDisplay, showWin, clearWin } from "../ui/win-display.js";

const MIN_SPIN_DURATION_MS = 600;

const TITLE_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 26,
  fontWeight: "bold",
  fill: 0xffffff,
});

export function buildGameScene(
  canvasWidth: number,
  canvasHeight: number,
  gameState: GameState,
  ticker: Ticker,
): Container {
  const config = gameState.gameConfig;
  if (!config) {
    throw new Error("GameState must have a game config before building the scene");
  }

  const scene = new Container();
  const reelCount = gameState.reelCount;
  const rowCount = config.rows;

  // Title
  const title = new Text({ text: config.name, style: TITLE_STYLE });
  title.anchor.set(0.5, 0);
  title.x = canvasWidth / 2;
  title.y = 20;
  scene.addChild(title);

  // Reel grid
  const reelGrid = createReelGrid(reelCount, rowCount);
  const gridContentWidth = reelCount * CELL_WIDTH + (reelCount - 1) * REEL_GAP;
  const gridPanelWidth = gridContentWidth + GRID_PADDING * 2;
  reelGrid.x = (canvasWidth - gridPanelWidth) / 2;
  reelGrid.y = 60;
  scene.addChild(reelGrid);

  // Set initial display with cycling symbols
  const initialGrid = buildInitialGrid(config.symbols.map((s) => s.id), reelCount, rowCount);
  setGridSymbols(reelGrid, initialGrid);

  // Win display
  const winDisplay = createWinDisplay(canvasWidth);
  winDisplay.y = 400;
  scene.addChild(winDisplay);

  // HUD
  const hud = createHud(
    canvasWidth,
    config.betOptions,
    config.defaultBet,
    handleBetChange,
    () => { void handleSpin(); },
  );
  hud.container.y = canvasHeight - 60;
  scene.addChild(hud.container);

  // Set initial balance
  updateBalanceDisplay(hud.balanceDisplay, gameState.balance);

  function handleBetChange(newBet: number): void {
    gameState.setCurrentBet(newBet);
    clearWin(winDisplay);
    updateSpinButton(hud.spinButton, gameState.canSpin);
  }

  async function handleSpin(): Promise<void> {
    if (!gameState.canSpin || !config) return;

    gameState.setSpinning(true);
    updateSpinButton(hud.spinButton, false);
    updateBetSelector(hud.betSelector, gameState.currentBet, false);
    clearWin(winDisplay);

    const spinStartTime = performance.now();

    // Fire API + start animation in parallel
    const spinPromise = requestSpin({
      sessionId: gameState.sessionId,
      gameId: config.id,
      bet: gameState.currentBet,
    });

    startGridSpin(reelGrid, config.symbols, ticker);

    try {
      const response = await spinPromise;
      gameState.setSpinResult(response.result, response.balance);
    } catch (error: unknown) {
      console.error("Spin failed:", error);
      await stopGridSpin(reelGrid, initialGrid, ticker);
      gameState.setSpinning(false);
      updateSpinButton(hud.spinButton, gameState.canSpin);
      updateBetSelector(hud.betSelector, gameState.currentBet, true);
      return;
    }

    // Enforce minimum spin duration
    const elapsed = performance.now() - spinStartTime;
    if (elapsed < MIN_SPIN_DURATION_MS) {
      await delay(MIN_SPIN_DURATION_MS - elapsed);
    }

    const result = gameState.lastResult!;

    // Stop reels with stagger
    await stopGridSpin(reelGrid, result.grid, ticker);

    // Update balance
    updateBalanceDisplay(hud.balanceDisplay, gameState.balance);

    // Show wins
    if (result.totalPayout > 0) {
      showWin(
        winDisplay,
        result.totalPayout,
        result.wins,
        config.paylines,
        { x: reelGrid.x, y: reelGrid.y },
      );
    }

    gameState.setSpinning(false);
    updateSpinButton(hud.spinButton, gameState.canSpin);
    updateBetSelector(hud.betSelector, gameState.currentBet, true);
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
