import type { Ticker } from "pixi.js";
import { Assets, Container, Graphics, Sprite, Text, Texture, TextStyle } from "pixi.js";
import {
  FONT_DISPLAY, FONT_BODY,
  BG_DEEP,
  GOLD, SILVER,
  easeOutCubic,
} from "../ui/design-tokens.js";

const FADE_OUT_DURATION_MS = 500;
const PULSE_SPEED = 700;

const GAME_TITLE_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 48,
  fontWeight: "700",
  fill: GOLD,
  dropShadow: {
    color: GOLD,
    blur: 24,
    alpha: 0.2,
    distance: 0,
  },
});

const PROMPT_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 16,
  fontWeight: "500",
  fill: SILVER,
  letterSpacing: 4,
});

export function buildGameSplashScene(
  canvasWidth: number,
  canvasHeight: number,
  gameName: string,
  ticker: Ticker,
): { scene: Container; waitForDismiss: () => Promise<void> } {
  const scene = new Container();

  // Background
  const bgTexture = Assets.get<Texture>("ui-background");
  if (bgTexture instanceof Texture) {
    const bg = new Sprite(bgTexture);
    bg.width = canvasWidth;
    bg.height = canvasHeight;
    scene.addChild(bg);

    const overlay = new Graphics();
    overlay.rect(0, 0, canvasWidth, canvasHeight);
    overlay.fill({ color: 0x000000 });
    overlay.alpha = 0.5;
    scene.addChild(overlay);
  } else {
    const bg = new Graphics();
    bg.rect(0, 0, canvasWidth, canvasHeight);
    bg.fill({ color: BG_DEEP });
    scene.addChild(bg);
  }

  // Title
  const title = new Text({ text: gameName, style: GAME_TITLE_STYLE });
  title.anchor.set(0.5);
  title.x = canvasWidth / 2;
  title.y = canvasHeight * 0.4;
  scene.addChild(title);

  // Pulsing prompt
  const prompt = new Text({ text: "TAP TO START", style: PROMPT_STYLE });
  prompt.anchor.set(0.5);
  prompt.x = canvasWidth / 2;
  prompt.y = canvasHeight * 0.62;
  scene.addChild(prompt);

  const pulseCallback = (): void => {
    prompt.alpha = 0.4 + 0.6 * Math.sin(performance.now() / PULSE_SPEED);
  };
  ticker.add(pulseCallback);

  scene.eventMode = "static";
  scene.cursor = "pointer";
  scene.hitArea = { contains: () => true };

  const waitForDismiss = (): Promise<void> =>
    new Promise((resolve) => {
      scene.on("pointerdown", () => {
        ticker.remove(pulseCallback);
        scene.eventMode = "none";

        const startTime = performance.now();
        const fadeCallback = (): void => {
          const elapsed = performance.now() - startTime;
          const t = Math.min(elapsed / FADE_OUT_DURATION_MS, 1);
          const e = easeOutCubic(t);
          scene.alpha = 1 - e;
          scene.scale.set(1 + 0.03 * e);

          if (t >= 1) {
            ticker.remove(fadeCallback);
            resolve();
          }
        };
        ticker.add(fadeCallback);
      });
    });

  return { scene, waitForDismiss };
}
