import { Application, Container, Text, TextStyle } from "pixi.js";
import { loadAssets } from "./assets/asset-loader.js";
import { getGameManifest } from "./assets/game-asset-registry.js";
import {
  createSession,
  fetchGameConfig,
  fetchGameList,
} from "./api/api-client.js";
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

  // Responsive scaling — resize renderer to match viewport so text stays sharp
  function resizeCanvas(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT);
    app.renderer.resize(DESIGN_WIDTH * scale, DESIGN_HEIGHT * scale);
    app.stage.scale.set(scale);
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

  async function showGame(gameId: string): Promise<void> {
    if (navigating) return;
    navigating = true;
    try {
      if (!sessionData) {
        const session = await createSession();
        sessionData = { sessionId: session.sessionId, balance: session.balance };
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

  await showGameSelect();

  return app;
}
