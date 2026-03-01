import type { Ticker } from "pixi.js";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { formatCents } from "./balance-display.js";
import { FONT_DISPLAY, FONT_BODY, GOLD_BRIGHT, GOLD, SILVER, MINT, easeOutBack } from "./design-tokens.js";

const ENTRY_DURATION_MS = 500;
const HOLD_DURATION_MS = 2800;
const EXIT_DURATION_MS = 500;

const COMPLETE_TITLE_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 38,
  fontWeight: "700",
  fill: GOLD_BRIGHT,
  dropShadow: {
    color: GOLD,
    blur: 28,
    alpha: 0.5,
    distance: 0,
  },
});

const TOTAL_WIN_LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 16,
  fontWeight: "500",
  fill: SILVER,
  letterSpacing: 4,
});

const TOTAL_WIN_AMOUNT_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 56,
  fontWeight: "700",
  fill: MINT,
  dropShadow: {
    color: MINT,
    blur: 24,
    alpha: 0.4,
    distance: 0,
  },
});

export function showFreeSpinsSummary(
  canvasWidth: number,
  canvasHeight: number,
  totalWinCents: number,
  ticker: Ticker,
): { overlay: Container; waitForComplete: () => Promise<void> } {
  const overlay = new Container();

  const backdrop = new Graphics();
  backdrop.rect(0, 0, canvasWidth, canvasHeight);
  backdrop.fill({ color: 0x000000 });
  backdrop.alpha = 0.82;
  backdrop.eventMode = "static";
  overlay.addChild(backdrop);

  const titleText = new Text({ text: "FREE SPINS COMPLETE", style: COMPLETE_TITLE_STYLE });
  titleText.anchor.set(0.5);
  titleText.x = canvasWidth / 2;
  titleText.y = canvasHeight * 0.32;
  titleText.alpha = 0;
  overlay.addChild(titleText);

  const labelText = new Text({ text: "TOTAL WIN", style: TOTAL_WIN_LABEL_STYLE });
  labelText.anchor.set(0.5);
  labelText.x = canvasWidth / 2;
  labelText.y = canvasHeight * 0.48;
  labelText.alpha = 0;
  overlay.addChild(labelText);

  const amountText = new Text({
    text: formatCents(totalWinCents),
    style: TOTAL_WIN_AMOUNT_STYLE,
  });
  amountText.anchor.set(0.5);
  amountText.x = canvasWidth / 2;
  amountText.y = canvasHeight * 0.6;
  amountText.scale.set(0.4);
  amountText.alpha = 0;
  overlay.addChild(amountText);

  const waitForComplete = (): Promise<void> =>
    new Promise((resolve) => {
      const startTime = performance.now();

      const animCallback = (): void => {
        const elapsed = performance.now() - startTime;

        if (elapsed < ENTRY_DURATION_MS) {
          const t = elapsed / ENTRY_DURATION_MS;
          titleText.alpha = t;
          labelText.alpha = t;

          const eased = easeOutBack(t);
          const scale = 0.4 + 0.6 * eased;
          amountText.scale.set(scale);
          amountText.alpha = t;
        } else if (elapsed < ENTRY_DURATION_MS + HOLD_DURATION_MS) {
          titleText.alpha = 1;
          labelText.alpha = 1;
          amountText.alpha = 1;

          const holdElapsed = elapsed - ENTRY_DURATION_MS;
          const pulse = 1 + 0.02 * Math.sin(holdElapsed / 400);
          amountText.scale.set(pulse);
        } else {
          const exitElapsed = elapsed - ENTRY_DURATION_MS - HOLD_DURATION_MS;
          const t = Math.min(exitElapsed / EXIT_DURATION_MS, 1);
          overlay.alpha = 1 - t;

          if (t >= 1) {
            ticker.remove(animCallback);
            resolve();
          }
        }
      };

      ticker.add(animCallback);
    });

  return { overlay, waitForComplete };
}
