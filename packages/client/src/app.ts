import { Application, Text, TextStyle } from "pixi.js";
import { loadAssets } from "./assets/asset-loader.js";
import { createSession, fetchGameConfig } from "./api/api-client.js";
import { GameState } from "./state/game-state.js";
import { buildGameScene } from "./scene/game-scene.js";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const BACKGROUND_COLOR = 0x1a1a2e;
const DEFAULT_GAME_ID = "classic-3x5";

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

  try {
    const [sessionResponse, gameConfig] = await Promise.all([
      createSession(),
      fetchGameConfig(DEFAULT_GAME_ID),
    ]);

    const gameState = new GameState();
    gameState.setSession(sessionResponse.sessionId, sessionResponse.balance);
    gameState.setGameConfig(gameConfig);

    const scene = buildGameScene(CANVAS_WIDTH, CANVAS_HEIGHT, gameState, app.ticker);
    app.stage.addChild(scene);
  } catch {
    const errorStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xe74c3c,
      wordWrap: true,
      wordWrapWidth: 600,
      align: "center",
    });
    const errorText = new Text({
      text: "Could not connect to server.\nEnsure the server is running on port 3000.",
      style: errorStyle,
    });
    errorText.anchor.set(0.5);
    errorText.x = CANVAS_WIDTH / 2;
    errorText.y = CANVAS_HEIGHT / 2;
    app.stage.addChild(errorText);
  }

  return app;
}
