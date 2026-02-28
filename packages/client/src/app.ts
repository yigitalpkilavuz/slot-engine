import { Application } from "pixi.js";
import { loadAssets } from "./assets/asset-loader.js";
import { buildPlaceholderScene } from "./scene/placeholder-scene.js";

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

  const scene = buildPlaceholderScene(CANVAS_WIDTH, CANVAS_HEIGHT);
  app.stage.addChild(scene);

  return app;
}
