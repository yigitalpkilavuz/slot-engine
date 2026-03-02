import type { Ticker } from "pixi.js";
import type { Container } from "pixi.js";
import { Text } from "pixi.js";
import { formatCents } from "./balance-display.js";
import { easeOutCubic, easeOutBack } from "./design-tokens.js";

const SNAP_DURATION_MS = 150;

export function animateWinCounter(
  display: Container,
  targetCents: number,
  duration: number,
  ticker: Ticker,
): Promise<void> {
  const text = display.children[0] as Text;

  return new Promise((resolve) => {
    const startTime = performance.now();
    const totalDuration = duration + SNAP_DURATION_MS;

    const callback = (): void => {
      const elapsed = performance.now() - startTime;

      if (elapsed < duration) {
        const t = elapsed / duration;
        // Fast ramp to ~90% then slow reveal to 100%
        const eased = t < 0.7
          ? easeOutCubic(t / 0.7) * 0.9
          : 0.9 + 0.1 * ((t - 0.7) / 0.3);
        const currentCents = Math.round(eased * targetCents);
        text.text = `WIN: ${formatCents(currentCents)}`;
      } else if (elapsed < totalDuration) {
        text.text = `WIN: ${formatCents(targetCents)}`;
        // Scale bump snap effect
        const snapT = (elapsed - duration) / SNAP_DURATION_MS;
        const snapEased = easeOutBack(snapT);
        const scale = snapT < 0.3
          ? 1 + 0.15 * (snapT / 0.3)
          : 1 + 0.15 * (1 - snapEased * 0.87);
        text.scale.set(scale);
      } else {
        text.text = `WIN: ${formatCents(targetCents)}`;
        text.scale.set(1);
        ticker.remove(callback);
        resolve();
      }
    };

    ticker.add(callback);
  });
}

export function getCounterDuration(totalPayout: number, bet: number): number {
  const ratio = totalPayout / bet;
  if (ratio >= 50) return 3500;
  if (ratio >= 25) return 2500;
  if (ratio >= 10) return 1500;
  if (ratio >= 5) return 800;
  return 400;
}
