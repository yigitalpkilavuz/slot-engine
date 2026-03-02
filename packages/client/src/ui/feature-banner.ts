import type { Ticker } from "pixi.js";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { FONT_DISPLAY, GOLD_BRIGHT, GOLD, easeOutBack } from "./design-tokens.js";

const BANNER_ENTRY_MS = 150;
const BANNER_HOLD_MS = 400;
const BANNER_EXIT_MS = 150;
const BANNER_HEIGHT = 80;

const BANNER_TEXT_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 36,
  fontWeight: "700",
  fill: GOLD_BRIGHT,
  letterSpacing: 3,
  dropShadow: {
    color: GOLD,
    blur: 24,
    alpha: 0.5,
    distance: 0,
  },
});

export function showFeatureBanner(
  canvasWidth: number,
  canvasHeight: number,
  text: string,
  ticker: Ticker,
): { overlay: Container; waitForComplete: () => Promise<void> } {
  const overlay = new Container();

  const backdrop = new Graphics();
  const bannerY = (canvasHeight - BANNER_HEIGHT) / 2;
  backdrop.rect(0, bannerY, canvasWidth, BANNER_HEIGHT);
  backdrop.fill({ color: 0x000000 });
  backdrop.alpha = 0;
  overlay.addChild(backdrop);

  const label = new Text({ text, style: BANNER_TEXT_STYLE });
  label.anchor.set(0.5);
  label.x = canvasWidth / 2;
  label.y = canvasHeight / 2;
  label.scale.set(0.5);
  label.alpha = 0;
  overlay.addChild(label);

  const totalDuration = BANNER_ENTRY_MS + BANNER_HOLD_MS + BANNER_EXIT_MS;

  const waitForComplete = (): Promise<void> =>
    new Promise((resolve) => {
      const startTime = performance.now();

      const callback = (): void => {
        const elapsed = performance.now() - startTime;

        if (elapsed < BANNER_ENTRY_MS) {
          const t = elapsed / BANNER_ENTRY_MS;
          backdrop.alpha = t * 0.85;
          label.scale.set(0.5 + 0.5 * easeOutBack(t));
          label.alpha = t;
          return;
        }

        if (elapsed < BANNER_ENTRY_MS + BANNER_HOLD_MS) {
          backdrop.alpha = 0.85;
          label.alpha = 1;
          const holdElapsed = elapsed - BANNER_ENTRY_MS;
          const pulse = 1 + 0.02 * Math.sin(holdElapsed / 200 * Math.PI);
          label.scale.set(pulse);
          return;
        }

        if (elapsed < totalDuration) {
          const t = (elapsed - BANNER_ENTRY_MS - BANNER_HOLD_MS) / BANNER_EXIT_MS;
          overlay.alpha = 1 - t;
          return;
        }

        ticker.remove(callback);
        resolve();
      };

      ticker.add(callback);
    });

  return { overlay, waitForComplete };
}
