import type { Ticker } from "pixi.js";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { formatCents } from "./balance-display.js";
import { FONT_DISPLAY, FONT_BODY, GOLD_BRIGHT, GOLD, SILVER, MINT, easeOutBack } from "./design-tokens.js";
import { animateWinCounter, getCounterDuration } from "./win-counter.js";
import type { ParticleEmitter } from "./particle-system.js";
import { PRESET_COIN_SHOWER, PRESET_MINT_SPARKLE } from "./particle-system.js";

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
  betCents?: number,
  particleEmitter?: ParticleEmitter,
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

  const amountContainer = new Container();
  const amountText = new Text({
    text: formatCents(0),
    style: TOTAL_WIN_AMOUNT_STYLE,
  });
  amountText.anchor.set(0.5);
  amountText.x = canvasWidth / 2;
  amountText.y = canvasHeight * 0.6;
  amountText.scale.set(0.4);
  amountText.alpha = 0;
  amountContainer.addChild(amountText);
  overlay.addChild(amountContainer);

  const waitForComplete = async (): Promise<void> => {
    const cx = canvasWidth / 2;

    // Phase 1: Entry (title + label + amount scale in)
    await animatePhase(ticker, ENTRY_DURATION_MS, (t) => {
      titleText.alpha = t;
      labelText.alpha = t;
      const eased = easeOutBack(t);
      amountText.scale.set(0.4 + 0.6 * eased);
      amountText.alpha = t;
    });

    // Phase 2: Counter animation (amount counts up from 0)
    const counterDuration = betCents ? getCounterDuration(totalWinCents, betCents) : 800;
    await animateWinCounter(amountContainer, totalWinCents, counterDuration, ticker);

    // Particle burst after counter finishes
    if (particleEmitter) {
      particleEmitter.emit(cx, canvasHeight * 0.6, PRESET_MINT_SPARKLE, 25);
    }

    // Phase 3: Hold with pulse + continuous particles
    let sparkleTimer = 0;
    await animatePhase(ticker, HOLD_DURATION_MS, (t) => {
      const holdElapsed = t * HOLD_DURATION_MS;
      const pulse = 1 + 0.02 * Math.sin(holdElapsed / 400);
      amountText.scale.set(pulse);

      if (particleEmitter) {
        sparkleTimer += 16.67;
        if (sparkleTimer > 300) {
          sparkleTimer = 0;
          particleEmitter.emit(
            cx + (Math.random() - 0.5) * 200,
            canvasHeight * 0.15,
            PRESET_COIN_SHOWER,
            5,
          );
        }
      }
    });

    // Phase 4: Exit
    await animatePhase(ticker, EXIT_DURATION_MS, (t) => {
      overlay.alpha = 1 - t;
    });
  };

  return { overlay, waitForComplete };
}

function animatePhase(
  ticker: Ticker,
  duration: number,
  onFrame: (t: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const callback = (): void => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      onFrame(t);
      if (t >= 1) {
        ticker.remove(callback);
        resolve();
      }
    };
    ticker.add(callback);
  });
}
