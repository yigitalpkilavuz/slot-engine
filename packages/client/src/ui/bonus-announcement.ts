import type { Ticker } from "pixi.js";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { FONT_DISPLAY, FONT_BODY, GOLD_BRIGHT, GOLD, easeOutBack } from "./design-tokens.js";

const ENTRY_DURATION_MS = 400;
const HOLD_DURATION_MS = 1800;
const EXIT_DURATION_MS = 500;

const BONUS_TITLE_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 52,
  fontWeight: "700",
  fill: GOLD_BRIGHT,
  letterSpacing: 3,
  dropShadow: {
    color: GOLD,
    blur: 30,
    alpha: 0.5,
    distance: 0,
  },
});

const BONUS_COUNT_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 22,
  fontWeight: "700",
  fill: GOLD,
  letterSpacing: 3,
});

const MODIFIER_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 14,
  fontWeight: "600",
  fill: GOLD_BRIGHT,
  letterSpacing: 2,
});

export function showBonusAnnouncement(
  canvasWidth: number,
  canvasHeight: number,
  freeSpinsAwarded: number,
  ticker: Ticker,
  modifierNames?: readonly string[],
): { overlay: Container; waitForComplete: () => Promise<void> } {
  const overlay = new Container();

  const backdrop = new Graphics();
  backdrop.rect(0, 0, canvasWidth, canvasHeight);
  backdrop.fill({ color: 0x000000 });
  backdrop.alpha = 0.8;
  backdrop.eventMode = "static";
  overlay.addChild(backdrop);

  const titleText = new Text({ text: "FREE SPINS!", style: BONUS_TITLE_STYLE });
  titleText.anchor.set(0.5);
  titleText.x = canvasWidth / 2;
  titleText.y = canvasHeight * 0.38;
  titleText.scale.set(0.6);
  titleText.alpha = 0;
  overlay.addChild(titleText);

  // Decorative line between title and count
  const decoLine = new Graphics();
  decoLine.alpha = 0;
  overlay.addChild(decoLine);

  const countText = new Text({
    text: `${String(freeSpinsAwarded)} SPINS AWARDED`,
    style: BONUS_COUNT_STYLE,
  });
  countText.anchor.set(0.5);
  countText.x = canvasWidth / 2;
  countText.y = canvasHeight * 0.55;
  countText.scale.set(0.6);
  countText.alpha = 0;
  overlay.addChild(countText);

  // Modifier names (e.g. "STICKY WILDS • RISING MULTIPLIER")
  let modifierText: Text | null = null;
  if (modifierNames && modifierNames.length > 0) {
    modifierText = new Text({
      text: modifierNames.join(" \u2022 "),
      style: MODIFIER_STYLE,
    });
    modifierText.anchor.set(0.5);
    modifierText.x = canvasWidth / 2;
    modifierText.y = canvasHeight * 0.62;
    modifierText.scale.set(0.6);
    modifierText.alpha = 0;
    overlay.addChild(modifierText);
  }

  const lineY = canvasHeight * 0.47;
  const lineMaxWidth = 200;

  const waitForComplete = (): Promise<void> =>
    new Promise((resolve) => {
      const startTime = performance.now();

      const animCallback = (): void => {
        const elapsed = performance.now() - startTime;

        if (elapsed < ENTRY_DURATION_MS) {
          const t = elapsed / ENTRY_DURATION_MS;
          const eased = easeOutBack(t);
          const scale = 0.6 + 0.4 * eased;
          titleText.scale.set(scale);
          titleText.alpha = t;
          countText.scale.set(scale);
          countText.alpha = t;
          if (modifierText) {
            modifierText.scale.set(scale);
            modifierText.alpha = t;
          }
        } else if (elapsed < ENTRY_DURATION_MS + HOLD_DURATION_MS) {
          titleText.scale.set(1);
          titleText.alpha = 1;
          countText.scale.set(1);
          countText.alpha = 1;
          if (modifierText) {
            modifierText.scale.set(1);
            modifierText.alpha = 1;
          }

          // Animate decorative line
          const holdElapsed = elapsed - ENTRY_DURATION_MS;
          const lineProgress = Math.min(1, holdElapsed / 300);
          const currentWidth = lineMaxWidth * lineProgress;
          decoLine.clear();
          decoLine.moveTo(canvasWidth / 2 - currentWidth / 2, lineY);
          decoLine.lineTo(canvasWidth / 2 + currentWidth / 2, lineY);
          decoLine.stroke({ width: 1, color: GOLD, alpha: 0.3 });
          decoLine.alpha = 1;
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
