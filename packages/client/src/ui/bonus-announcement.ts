import type { Ticker } from "pixi.js";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ParticleEmitter } from "./particle-system.js";
import { PRESET_SPARKLE, PRESET_BURST } from "./particle-system.js";
import { screenShake } from "./screen-effects.js";
import {
  FONT_DISPLAY, FONT_BODY,
  GOLD_BRIGHT, GOLD,
  easeOutBack, easeInOutQuart, easeOutCubic,
} from "./design-tokens.js";

const VIGNETTE_MS = 600;
const SHOCKWAVE_MS = 300;
const TITLE_ENTRY_MS = 500;
const DETAILS_MS = 400;
const HOLD_MS = 1400;
const EXIT_MS = 600;

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
  particleEmitter?: ParticleEmitter,
  sceneContainer?: Container,
): { overlay: Container; waitForComplete: () => Promise<void> } {
  const overlay = new Container();
  const cx = canvasWidth / 2;

  // Backdrop
  const backdrop = new Graphics();
  backdrop.rect(0, 0, canvasWidth, canvasHeight);
  backdrop.fill({ color: 0x000000 });
  backdrop.alpha = 0;
  backdrop.eventMode = "static";
  overlay.addChild(backdrop);

  // Shockwave ring (drawn dynamically)
  const shockwave = new Graphics();
  shockwave.alpha = 0;
  overlay.addChild(shockwave);

  // Title
  const titleText = new Text({ text: "FREE SPINS!", style: BONUS_TITLE_STYLE });
  titleText.anchor.set(0.5);
  titleText.x = cx;
  titleText.y = canvasHeight * 0.38;
  titleText.scale.set(0.5);
  titleText.alpha = 0;
  overlay.addChild(titleText);

  // Decorative line
  const decoLine = new Graphics();
  decoLine.alpha = 0;
  overlay.addChild(decoLine);

  // Count text
  const countText = new Text({
    text: `${String(freeSpinsAwarded)} SPINS AWARDED`,
    style: BONUS_COUNT_STYLE,
  });
  countText.anchor.set(0.5);
  countText.x = cx;
  countText.y = canvasHeight * 0.55;
  countText.alpha = 0;
  overlay.addChild(countText);

  // Modifier text
  let modifierText: Text | null = null;
  if (modifierNames && modifierNames.length > 0) {
    modifierText = new Text({
      text: modifierNames.join(" \u2022 "),
      style: MODIFIER_STYLE,
    });
    modifierText.anchor.set(0.5);
    modifierText.x = cx;
    modifierText.y = canvasHeight * 0.62;
    modifierText.alpha = 0;
    overlay.addChild(modifierText);
  }

  const lineY = canvasHeight * 0.47;
  const lineMaxWidth = 200;

  const waitForComplete = (): Promise<void> =>
    new Promise((resolve) => {
      const startTime = performance.now();
      let sparkleTimer = 0;

      const animCallback = (): void => {
        const elapsed = performance.now() - startTime;

        // Phase 0: Vignette approach (0 - VIGNETTE_MS)
        if (elapsed < VIGNETTE_MS) {
          const t = elapsed / VIGNETTE_MS;
          backdrop.alpha = easeInOutQuart(t) * 0.85;
          return;
        }

        // Phase 1: Shockwave (VIGNETTE_MS - VIGNETTE_MS + SHOCKWAVE_MS)
        const shockStart = VIGNETTE_MS;
        const shockEnd = shockStart + SHOCKWAVE_MS;
        if (elapsed < shockEnd) {
          backdrop.alpha = 0.85;
          const t = (elapsed - shockStart) / SHOCKWAVE_MS;
          const maxRadius = Math.max(canvasWidth, canvasHeight) * 0.7;
          const radius = t * maxRadius;
          shockwave.clear();
          shockwave.circle(cx, canvasHeight * 0.45, radius);
          shockwave.stroke({ width: 3, color: 0xffffff, alpha: 0.3 * (1 - t) });
          shockwave.alpha = 1;

          if (sceneContainer && t < 0.1) {
            void screenShake(sceneContainer, 6, 300, ticker);
          }
          return;
        }
        shockwave.alpha = 0;

        // Phase 2: Title reveal (shockEnd - shockEnd + TITLE_ENTRY_MS)
        const titleStart = shockEnd;
        const titleEnd = titleStart + TITLE_ENTRY_MS;
        if (elapsed < titleEnd) {
          const t = (elapsed - titleStart) / TITLE_ENTRY_MS;
          const eased = easeOutBack(t);
          titleText.scale.set(0.5 + 0.5 * eased);
          titleText.alpha = easeOutCubic(t);

          // Particle burst at ~30% through
          if (particleEmitter && t > 0.3 && t < 0.4) {
            particleEmitter.emit(cx, canvasHeight * 0.38, PRESET_BURST, 30);
            particleEmitter.emit(cx, canvasHeight * 0.38, PRESET_SPARKLE, 30);
          }
          return;
        }
        titleText.scale.set(1);
        titleText.alpha = 1;

        // Phase 3: Details (titleEnd - titleEnd + DETAILS_MS)
        const detailsStart = titleEnd;
        const detailsEnd = detailsStart + DETAILS_MS;
        if (elapsed < detailsEnd) {
          const t = (elapsed - detailsStart) / DETAILS_MS;

          // Decorative line
          const lineProgress = Math.min(1, t / 0.6);
          const currentWidth = lineMaxWidth * lineProgress;
          decoLine.clear();
          decoLine.moveTo(cx - currentWidth / 2, lineY);
          decoLine.lineTo(cx + currentWidth / 2, lineY);
          decoLine.stroke({ width: 1, color: GOLD, alpha: 0.3 });
          decoLine.alpha = 1;

          // Count text slide up
          const countT = Math.max(0, (t - 0.1) / 0.6);
          const countEased = easeOutCubic(Math.min(countT, 1));
          countText.alpha = countEased;
          countText.y = canvasHeight * 0.55 + 20 * (1 - countEased);

          // Modifier text
          if (modifierText) {
            const modT = Math.max(0, (t - 0.4) / 0.6);
            const modEased = easeOutCubic(Math.min(modT, 1));
            modifierText.alpha = modEased;
            modifierText.y = canvasHeight * 0.62 + 15 * (1 - modEased);
          }
          return;
        }
        countText.alpha = 1;
        countText.y = canvasHeight * 0.55;
        if (modifierText) {
          modifierText.alpha = 1;
          modifierText.y = canvasHeight * 0.62;
        }

        // Phase 4: Hold (detailsEnd - detailsEnd + HOLD_MS)
        const holdStart = detailsEnd;
        const holdEnd = holdStart + HOLD_MS;
        if (elapsed < holdEnd) {
          const holdElapsed = elapsed - holdStart;

          // Title subtle pulse
          const pulse = 1 + 0.02 * Math.sin(holdElapsed / 400);
          titleText.scale.set(pulse);

          // Continuous sparkles (every ~200ms)
          if (particleEmitter) {
            sparkleTimer += 16.67;
            if (sparkleTimer > 200) {
              sparkleTimer = 0;
              particleEmitter.emit(
                cx + (Math.random() - 0.5) * 300,
                canvasHeight * 0.8,
                PRESET_SPARKLE,
                3,
              );
            }
          }
          return;
        }

        // Phase 5: Exit (holdEnd - holdEnd + EXIT_MS)
        const exitStart = holdEnd;
        if (elapsed < exitStart + EXIT_MS) {
          const t = (elapsed - exitStart) / EXIT_MS;
          overlay.alpha = 1 - easeOutCubic(t);
          const scale = 1 + 0.05 * t;
          titleText.scale.set(scale);
          countText.scale.set(scale);
          if (modifierText) modifierText.scale.set(scale);
          return;
        }

        ticker.remove(animCallback);
        resolve();
      };

      ticker.add(animCallback);
    });

  return { overlay, waitForComplete };
}
