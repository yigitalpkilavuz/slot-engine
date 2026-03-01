import { Application, Container, Text, TextStyle } from "pixi.js";
import { loadAssets } from "./assets/asset-loader.js";
import { getGameManifest } from "./assets/game-asset-registry.js";
import type { FreeSpinModifierState } from "@slot-engine/shared";
import {
  createSession,
  fetchSession,
  fetchGameConfig,
  fetchGameList,
} from "./api/api-client.js";

const SESSION_STORAGE_KEY = "slotengine_session_id";

interface FreeSpinRecoveryData {
  readonly freeSpinsRemaining: number;
  readonly freeSpinAccumulatedWin: number;
  readonly freeSpinBet: number;
  readonly freeSpinModifierStates: readonly FreeSpinModifierState[] | null;
}
import { GameState } from "./state/game-state.js";
import { buildGameScene } from "./scene/game-scene.js";
import { buildGameSelectScene } from "./scene/game-select-scene.js";
import { buildGameSplashScene } from "./scene/game-splash-scene.js";
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  BG_DEEP,
  CORAL,
  FONT_BODY,
  DURATION_SLOW,
  easeOutCubic,
} from "./ui/design-tokens.js";
import { createSceneBackground } from "./ui/scene-background.js";

export async function createApp(container: HTMLElement): Promise<Application> {
  const app = new Application();

  await app.init({
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    backgroundColor: BG_DEEP,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    antialias: true,
  });

  container.appendChild(app.canvas);

  // Responsive canvas scaling
  function resizeCanvas(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT);
    app.canvas.style.width = `${String(DESIGN_WIDTH * scale)}px`;
    app.canvas.style.height = `${String(DESIGN_HEIGHT * scale)}px`;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  await loadAssets();

  // Atmospheric background (persistent behind all scenes)
  const background = createSceneBackground(app.ticker);
  app.stage.addChild(background);

  let currentScene: Container | null = null;
  let sessionData: { sessionId: string; balance: number } | null = null;
  let navigating = false;

  function setScene(scene: Container, animate = true): void {
    const oldScene = currentScene;
    currentScene = scene;

    if (!animate || !oldScene) {
      if (oldScene) {
        app.stage.removeChild(oldScene);
        oldScene.destroy({ children: true });
      }
      app.stage.addChild(scene);
      return;
    }

    // Animated crossfade
    scene.alpha = 0;
    scene.scale.set(1.02);
    app.stage.addChild(scene);

    const startTime = performance.now();
    const duration = DURATION_SLOW;

    const onTick = (): void => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const e = easeOutCubic(t);

      scene.alpha = e;
      scene.scale.set(1.02 - 0.02 * e);
      oldScene.alpha = 1 - e;

      if (t >= 1) {
        app.ticker.remove(onTick);
        app.stage.removeChild(oldScene);
        oldScene.destroy({ children: true });
      }
    };

    app.ticker.add(onTick);
  }

  function showError(message: string): void {
    const errorStyle = new TextStyle({
      fontFamily: [...FONT_BODY],
      fontSize: 18,
      fill: CORAL,
      wordWrap: true,
      wordWrapWidth: 600,
      align: "center",
    });
    const errorText = new Text({ text: message, style: errorStyle });
    errorText.anchor.set(0.5);
    errorText.x = DESIGN_WIDTH / 2;
    errorText.y = DESIGN_HEIGHT / 2;

    const scene = new Container();
    scene.addChild(errorText);
    setScene(scene, false);
  }

  async function showGameSelect(): Promise<void> {
    if (navigating) return;
    navigating = true;
    try {
      const { games } = await fetchGameList();
      const scene = buildGameSelectScene(
        DESIGN_WIDTH,
        DESIGN_HEIGHT,
        games,
        (gameId: string) => { void showGame(gameId); },
      );
      setScene(scene);
    } catch {
      showError("Could not load game list.\nEnsure the server is running on port 3000.");
    } finally {
      navigating = false;
    }
  }

  async function showGame(gameId: string, recovery?: FreeSpinRecoveryData): Promise<void> {
    if (navigating) return;
    navigating = true;
    try {
      if (!sessionData) {
        const session = await createSession();
        sessionData = { sessionId: session.sessionId, balance: session.balance };
        try { localStorage.setItem(SESSION_STORAGE_KEY, session.sessionId); } catch { /* noop */ }
      }

      const gameConfig = await fetchGameConfig(gameId);

      const manifest = getGameManifest(gameId);
      if (manifest) {
        await loadAssets(manifest);
      }

      // Show splash screen
      const { scene: splashScene, waitForDismiss } = buildGameSplashScene(
        DESIGN_WIDTH, DESIGN_HEIGHT, gameConfig.name, app.ticker,
      );
      setScene(splashScene);
      await waitForDismiss();

      const gameState = new GameState();
      gameState.setSession(sessionData.sessionId, sessionData.balance);
      gameState.setGameConfig(gameConfig);

      if (recovery) {
        gameState.restoreFreeSpins(
          recovery.freeSpinsRemaining,
          recovery.freeSpinAccumulatedWin,
          recovery.freeSpinBet,
          recovery.freeSpinModifierStates,
        );
      }

      const scene = buildGameScene(
        DESIGN_WIDTH,
        DESIGN_HEIGHT,
        gameState,
        app.ticker,
        () => {
          sessionData!.balance = gameState.balance;
          void showGameSelect();
        },
      );
      setScene(scene);
    } catch {
      showError("Could not load game.\nEnsure the server is running on port 3000.");
    } finally {
      navigating = false;
    }
  }

  // Attempt session recovery from localStorage
  let recovered = false;
  try {
    const savedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSessionId) {
      try {
        const state = await fetchSession(savedSessionId);
        sessionData = { sessionId: state.sessionId, balance: state.balance };

        if (state.activeGameId && state.freeSpinsRemaining > 0) {
          await showGame(state.activeGameId, {
            freeSpinsRemaining: state.freeSpinsRemaining,
            freeSpinAccumulatedWin: state.freeSpinAccumulatedWin,
            freeSpinBet: state.freeSpinBet,
            freeSpinModifierStates: state.freeSpinModifierStates,
          });
          recovered = true;
        }
      } catch {
        // Session gone (server restarted) — clear and start fresh
        localStorage.removeItem(SESSION_STORAGE_KEY);
        sessionData = null;
      }
    }
  } catch {
    // localStorage unavailable — skip recovery
  }

  if (!recovered) {
    await showGameSelect();
  }

  return app;
}
