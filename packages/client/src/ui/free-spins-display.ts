import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { FreeSpinModifierState } from "@slot-engine/shared";
import {
  FONT_DISPLAY, FONT_BODY,
  GOLD, GOLD_BRIGHT, GOLD_MUTED,
  BG_SURFACE, BORDER_SUBTLE,
  MINT,
} from "./design-tokens.js";

const LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 11,
  fontWeight: "600",
  fill: GOLD_MUTED,
  letterSpacing: 3,
});

const COUNT_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 22,
  fontWeight: "700",
  fill: GOLD_BRIGHT,
  letterSpacing: 1,
  dropShadow: {
    color: GOLD,
    blur: 16,
    alpha: 0.35,
    distance: 0,
  },
});

const MULTIPLIER_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 18,
  fontWeight: "700",
  fill: MINT,
  letterSpacing: 1,
  dropShadow: {
    color: MINT,
    blur: 12,
    alpha: 0.35,
    distance: 0,
  },
});

const SEPARATOR_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 14,
  fontWeight: "400",
  fill: GOLD_MUTED,
});

// Children: [0] bar, [1] label, [2] dividerLeft, [3] count, [4] dividerRight, [5] multiplier
const BAR_HEIGHT = 36;
const BAR_PADDING_X = 20;
const SECTION_GAP = 12;

export function createFreeSpinsDisplay(canvasWidth: number): Container {
  const container = new Container();
  container.visible = false;

  // Background bar
  const bar = new Graphics();
  container.addChild(bar);

  // "FREE SPINS" label
  const label = new Text({ text: "FREE SPINS", style: LABEL_STYLE });
  label.anchor.set(0, 0.5);
  container.addChild(label);

  // Left divider dot
  const divLeft = new Text({ text: "\u2022", style: SEPARATOR_STYLE });
  divLeft.anchor.set(0.5, 0.5);
  container.addChild(divLeft);

  // Count text
  const count = new Text({ text: "", style: COUNT_STYLE });
  count.anchor.set(0, 0.5);
  container.addChild(count);

  // Right divider dot (only shown with multiplier)
  const divRight = new Text({ text: "\u2022", style: SEPARATOR_STYLE });
  divRight.anchor.set(0.5, 0.5);
  divRight.visible = false;
  container.addChild(divRight);

  // Multiplier text
  const mult = new Text({ text: "", style: MULTIPLIER_STYLE });
  mult.anchor.set(0, 0.5);
  mult.visible = false;
  container.addChild(mult);

  // Store canvasWidth for centering
  container.label = String(canvasWidth);

  return container;
}

export function updateFreeSpinsDisplay(
  display: Container,
  remaining: number,
  modifierStates?: readonly FreeSpinModifierState[] | null,
): void {
  if (!(remaining > 0)) {
    display.visible = false;
    return;
  }

  display.visible = true;
  const canvasWidth = Number(display.label);
  const centerY = BAR_HEIGHT / 2;

  const bar = display.children[0] as Graphics;
  const label = display.children[1] as Text;
  const divLeft = display.children[2] as Text;
  const count = display.children[3] as Text;
  const divRight = display.children[4] as Text;
  const mult = display.children[5] as Text;

  // Update text content
  count.text = `${String(remaining)} remaining`;

  // Check for multiplier
  let hasMultiplier = false;
  if (modifierStates) {
    const multState = modifierStates.find((s) => s.type === "increasingMultiplier");
    if (multState) {
      hasMultiplier = true;
      mult.text = `${String(multState.currentMultiplier)}x`;
      mult.visible = true;
      divRight.visible = true;
    }
  }
  if (!hasMultiplier) {
    mult.visible = false;
    divRight.visible = false;
  }

  // Layout: label • count [• Nx]
  // Calculate total content width to center everything
  let totalWidth = label.width + SECTION_GAP + divLeft.width + SECTION_GAP + count.width;
  if (hasMultiplier) {
    totalWidth += SECTION_GAP + divRight.width + SECTION_GAP + mult.width;
  }

  const startX = (canvasWidth - totalWidth) / 2;
  let x = startX;

  label.x = x;
  label.y = centerY;
  x += label.width + SECTION_GAP;

  divLeft.x = x + divLeft.width / 2;
  divLeft.y = centerY;
  x += divLeft.width + SECTION_GAP;

  count.x = x;
  count.y = centerY;
  x += count.width;

  if (hasMultiplier) {
    x += SECTION_GAP;
    divRight.x = x + divRight.width / 2;
    divRight.y = centerY;
    x += divRight.width + SECTION_GAP;

    mult.x = x;
    mult.y = centerY;
  }

  // Draw background bar
  bar.clear();
  const barWidth = totalWidth + BAR_PADDING_X * 2;
  const barX = (canvasWidth - barWidth) / 2;

  // Main fill
  bar.roundRect(barX, 0, barWidth, BAR_HEIGHT, 10);
  bar.fill({ color: BG_SURFACE, alpha: 0.85 });

  // Subtle border
  bar.roundRect(barX, 0, barWidth, BAR_HEIGHT, 10);
  bar.stroke({ width: 1, color: BORDER_SUBTLE, alpha: 0.6 });

  // Gold accent line at bottom
  const accentInset = 20;
  bar.moveTo(barX + accentInset, BAR_HEIGHT - 0.5);
  bar.lineTo(barX + barWidth - accentInset, BAR_HEIGHT - 0.5);
  bar.stroke({ width: 1, color: GOLD, alpha: 0.2 });
}
