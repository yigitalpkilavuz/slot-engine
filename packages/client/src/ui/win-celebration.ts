import type { Ticker } from "pixi.js";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ParticleEmitter } from "./particle-system.js";
import { PRESET_SPARKLE, PRESET_COIN_SHOWER, PRESET_CELEBRATION } from "./particle-system.js";
import { screenShake, screenFlash } from "./screen-effects.js";
import { animateWinCounter, getCounterDuration } from "./win-counter.js";
import { formatCents } from "./balance-display.js";
import {
  FONT_DISPLAY,
  GOLD_BRIGHT, GOLD, MINT, VIOLET,
  WIN_TIER_BIG, WIN_TIER_MEGA, WIN_TIER_EPIC,
  easeOutBack, easeInOutQuart,
} from "./design-tokens.js";

export type WinTier = "normal" | "big" | "mega" | "epic";

export function getWinTier(totalPayout: number, bet: number): WinTier {
  const ratio = totalPayout / bet;
  if (ratio >= WIN_TIER_EPIC) return "epic";
  if (ratio >= WIN_TIER_MEGA) return "mega";
  if (ratio >= WIN_TIER_BIG) return "big";
  return "normal";
}

const TIER_CONFIGS = {
  big: {
    label: "BIG WIN!",
    fontSize: 48,
    color: GOLD_BRIGHT,
    shadowColor: GOLD,
    shakeIntensity: 3,
    flashColor: GOLD,
    flashAlpha: 0.15,
    particleCount: 40,
    backdropAlpha: 0.4,
  },
  mega: {
    label: "MEGA WIN!",
    fontSize: 54,
    color: MINT,
    shadowColor: 0x1a8f50,
    shakeIntensity: 5,
    flashColor: MINT,
    flashAlpha: 0.2,
    particleCount: 60,
    backdropAlpha: 0.5,
  },
  epic: {
    label: "EPIC WIN!",
    fontSize: 60,
    color: VIOLET,
    shadowColor: 0x4c1d95,
    shakeIntensity: 7,
    flashColor: 0xffffff,
    flashAlpha: 0.25,
    particleCount: 80,
    backdropAlpha: 0.55,
  },
} as const;

export function showWinCelebration(
  canvasWidth: number,
  canvasHeight: number,
  totalPayoutCents: number,
  betCents: number,
  ticker: Ticker,
  particleEmitter: ParticleEmitter,
  sceneContainer: Container,
): { overlay: Container; waitForComplete: () => Promise<void> } {
  const tier = getWinTier(totalPayoutCents, betCents);
  if (tier === "normal") {
    const empty = new Container();
    return { overlay: empty, waitForComplete: () => Promise.resolve() };
  }

  const overlay = new Container();

  const backdrop = new Graphics();
  backdrop.rect(0, 0, canvasWidth, canvasHeight);
  backdrop.fill({ color: 0x000000 });
  backdrop.alpha = 0;
  backdrop.eventMode = "static";
  overlay.addChild(backdrop);

  const config = TIER_CONFIGS[tier];

  const tierLabel = new Text({
    text: config.label,
    style: new TextStyle({
      fontFamily: ["Sora", "DM Sans", "Helvetica Neue", "sans-serif"],
      fontSize: config.fontSize,
      fontWeight: "900",
      fill: config.color,
      letterSpacing: 4,
      dropShadow: {
        color: config.shadowColor,
        blur: 30,
        alpha: 0.6,
        distance: 0,
      },
    }),
  });
  tierLabel.anchor.set(0.5);
  tierLabel.x = canvasWidth / 2;
  tierLabel.y = canvasHeight * 0.35;
  tierLabel.scale.set(0.5);
  tierLabel.alpha = 0;
  overlay.addChild(tierLabel);

  const amountText = new Text({
    text: `WIN: ${formatCents(0)}`,
    style: new TextStyle({
      fontFamily: [...FONT_DISPLAY],
      fontSize: 36,
      fontWeight: "bold",
      fill: GOLD_BRIGHT,
      letterSpacing: 2,
      dropShadow: { color: GOLD, blur: 16, alpha: 0.4, distance: 0 },
    }),
  });
  amountText.anchor.set(0.5);
  amountText.x = canvasWidth / 2;
  amountText.y = canvasHeight * 0.55;
  amountText.alpha = 0;
  overlay.addChild(amountText);

  const waitForComplete = async (): Promise<void> => {
    const cx = canvasWidth / 2;
    const cy = canvasHeight * 0.35;

    // Phase 1: Backdrop + label entry (400ms)
    await animatePhase(ticker, 400, (t) => {
      const eased = easeOutBack(t);
      backdrop.alpha = easeInOutQuart(t) * config.backdropAlpha;
      tierLabel.scale.set(0.5 + 0.5 * eased);
      tierLabel.alpha = t;
    });

    // Screen effects (fire-and-forget)
    void screenShake(sceneContainer, config.shakeIntensity, 400, ticker);
    void screenFlash(overlay, canvasWidth, canvasHeight, config.flashColor, config.flashAlpha, 300, ticker);
    particleEmitter.emit(cx, cy, PRESET_SPARKLE, config.particleCount);

    // Tier escalation for mega/epic
    if (tier === "mega" || tier === "epic") {
      await animatePhase(ticker, 600, () => {});

      // Escalate label: shrink then grow with new text
      if (tier === "mega") {
        await escalateLabel(tierLabel, "MEGA WIN!", MINT, ticker);
      } else {
        await escalateLabel(tierLabel, "MEGA WIN!", MINT, ticker);
        void screenShake(sceneContainer, 5, 400, ticker);
        particleEmitter.emit(cx, cy, PRESET_COIN_SHOWER, 30);
        await animatePhase(ticker, 400, () => {});
        await escalateLabel(tierLabel, "EPIC WIN!", VIOLET, ticker);
      }

      void screenShake(sceneContainer, config.shakeIntensity, 400, ticker);
      void screenFlash(overlay, canvasWidth, canvasHeight, config.flashColor, config.flashAlpha, 300, ticker);
      particleEmitter.emit(cx, cy, PRESET_CELEBRATION, config.particleCount);
    }

    // Phase 2: Show amount + counter
    amountText.alpha = 1;
    const counterDuration = getCounterDuration(totalPayoutCents, betCents);

    // Amount container for counter
    const counterDisplay = new Container();
    counterDisplay.addChild(amountText);
    await animateWinCounter(counterDisplay, totalPayoutCents, counterDuration, ticker);

    // Coin shower during epic
    if (tier === "epic") {
      particleEmitter.emit(cx, 0, PRESET_COIN_SHOWER, 40);
    }

    // Phase 3: Hold (800ms)
    await animatePhase(ticker, 800, (t) => {
      const pulse = 1 + 0.02 * Math.sin(t * Math.PI * 4);
      tierLabel.scale.set(pulse);
    });

    // Phase 4: Exit (400ms)
    await animatePhase(ticker, 400, (t) => {
      overlay.alpha = 1 - t;
      const scale = 1 + 0.05 * t;
      tierLabel.scale.set(scale);
      amountText.scale.set(scale);
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

async function escalateLabel(
  label: Text,
  newText: string,
  newColor: number,
  ticker: Ticker,
): Promise<void> {
  // Shrink out
  await animatePhase(ticker, 200, (t) => {
    label.scale.set(1 - 0.3 * t);
    label.alpha = 1 - 0.5 * t;
  });

  label.text = newText;
  label.style.fill = newColor;

  // Pop in
  await animatePhase(ticker, 300, (t) => {
    const eased = easeOutBack(t);
    label.scale.set(0.7 + 0.3 * eased);
    label.alpha = 0.5 + 0.5 * t;
  });
}
