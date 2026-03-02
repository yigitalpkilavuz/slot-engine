import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";
import { easeOutQuint, easeOutCubic } from "./design-tokens.js";

export function screenShake(
  target: Container,
  intensity: number,
  duration: number,
  ticker: Ticker,
): Promise<void> {
  const originX = target.x;
  const originY = target.y;

  return new Promise((resolve) => {
    const startTime = performance.now();

    const callback = (): void => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const decay = 1 - easeOutQuint(t);
      const currentIntensity = intensity * decay;

      target.x = originX + (Math.random() - 0.5) * 2 * currentIntensity;
      target.y = originY + (Math.random() - 0.5) * 2 * currentIntensity;

      if (t >= 1) {
        target.x = originX;
        target.y = originY;
        ticker.remove(callback);
        resolve();
      }
    };

    ticker.add(callback);
  });
}

export function screenFlash(
  parent: Container,
  width: number,
  height: number,
  color: number,
  peakAlpha: number,
  duration: number,
  ticker: Ticker,
): Promise<void> {
  const flash = new Graphics();
  flash.rect(0, 0, width, height);
  flash.fill({ color });
  flash.alpha = 0;
  parent.addChild(flash);

  return new Promise((resolve) => {
    const startTime = performance.now();

    const callback = (): void => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      if (t < 0.3) {
        flash.alpha = (t / 0.3) * peakAlpha;
      } else {
        flash.alpha = peakAlpha * (1 - easeOutCubic((t - 0.3) / 0.7));
      }

      if (t >= 1) {
        ticker.remove(callback);
        parent.removeChild(flash);
        flash.destroy();
        resolve();
      }
    };

    ticker.add(callback);
  });
}
