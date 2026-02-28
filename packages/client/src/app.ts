import { Application, Container, Text, TextStyle } from "pixi.js";
import { loadAssets } from "./assets/asset-loader.js";
import {
  createSession,
  fetchGameConfig,
  fetchGameList,
} from "./api/api-client.js";
import { GameState } from "./state/game-state.js";
import { buildGameScene } from "./scene/game-scene.js";
import { buildGameSelectScene } from "./scene/game-select-scene.js";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const BACKGROUND_COLOR = 0x1a1a2e;

export async function createApp(container: HTMLElement): Promise<Application> {
  const app = new Application();

  await app.init({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    antialias: true,
  });

  container.appendChild(app.canvas);
  await loadAssets();

  let currentScene: Container | null = null;
  let sessionData: { sessionId: string; balance: number } | null = null;
  let navigating = false;

  function setScene(scene: Container): void {
    if (currentScene) {
      app.stage.removeChild(currentScene);
      currentScene.destroy({ children: true });
    }
    currentScene = scene;
    app.stage.addChild(scene);
  }

  function showError(message: string): void {
    const errorStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xe74c3c,
      wordWrap: true,
      wordWrapWidth: 600,
      align: "center",
    });
    const errorText = new Text({ text: message, style: errorStyle });
    errorText.anchor.set(0.5);
    errorText.x = CANVAS_WIDTH / 2;
    errorText.y = CANVAS_HEIGHT / 2;

    const scene = new Container();
    scene.addChild(errorText);
    setScene(scene);
  }

  async function showGameSelect(): Promise<void> {
    if (navigating) return;
    navigating = true;
    try {
      const { games } = await fetchGameList();
      const scene = buildGameSelectScene(
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
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

      const gameState = new GameState();
      gameState.setSession(sessionData.sessionId, sessionData.balance);
      gameState.setGameConfig(gameConfig);

      const scene = buildGameScene(
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
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
