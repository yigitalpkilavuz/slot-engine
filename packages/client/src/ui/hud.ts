import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { createBalanceDisplay } from "./balance-display.js";
import { createBetSelector } from "./bet-selector.js";
import { createSpinButton } from "./spin-button.js";
import { createBonusBuyButton } from "./bonus-buy-button.js";
import {
  FONT_DISPLAY, FONT_BODY,
  BG_DEEP, BG_SURFACE, BORDER_SUBTLE,
  GOLD, SILVER,
} from "./design-tokens.js";

const BAR_HEIGHT = 72;

const INFO_BTN_SIZE = 38;

const AUTO_BTN_WIDTH = 56;
const AUTO_BTN_HEIGHT = 38;

const INFO_TEXT_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 17,
  fontWeight: "600",
  fill: GOLD,
});

const AUTO_TEXT_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 11,
  fontWeight: "700",
  fill: SILVER,
  letterSpacing: 1.5,
});

export interface HudComponents {
  readonly container: Container;
  readonly balanceDisplay: Container;
  readonly betSelector: Container;
  readonly infoButton: Container;
  readonly bonusBuyButton: Container | null;
  readonly autoSpinButton: Container;
  readonly spinButton: Container;
}

export function createHud(
  canvasWidth: number,
  betOptions: readonly number[],
  defaultBet: number,
  onBetChange: (bet: number) => void,
  onInfo: () => void,
  onBonusBuy: (() => void) | null,
  onAutoSpin: () => void,
  onSpin: () => void,
): HudComponents {
  const container = new Container();

  // Background bar
  const bg = new Graphics();
  bg.rect(0, 0, canvasWidth, BAR_HEIGHT);
  bg.fill({ color: BG_DEEP });
  container.addChild(bg);

  // Top separator (subtle gradient band)
  const topBorder = new Graphics();
  topBorder.rect(0, 0, canvasWidth, 1);
  topBorder.fill({ color: BORDER_SUBTLE, alpha: 0.5 });
  container.addChild(topBorder);

  // Subtle gold glow at top
  const goldGlow = new Graphics();
  goldGlow.rect(0, 0, canvasWidth, 4);
  goldGlow.fill({ color: GOLD, alpha: 0.02 });
  container.addChild(goldGlow);

  const balanceDisplay = createBalanceDisplay();
  balanceDisplay.x = 48;
  balanceDisplay.y = 10;
  container.addChild(balanceDisplay);

  const betSelector = createBetSelector(betOptions, defaultBet, onBetChange);
  betSelector.x = 320;
  betSelector.y = 6;
  container.addChild(betSelector);

  const infoButton = createInfoButton(onInfo);
  infoButton.x = canvasWidth - 450;
  infoButton.y = 17;
  container.addChild(infoButton);

  let bonusBuyButton: Container | null = null;
  if (onBonusBuy) {
    bonusBuyButton = createBonusBuyButton(onBonusBuy);
    bonusBuyButton.x = canvasWidth - 400;
    bonusBuyButton.y = 8;
    container.addChild(bonusBuyButton);
  }

  const autoSpinButton = createAutoButton(onAutoSpin);
  autoSpinButton.x = canvasWidth - 260;
  autoSpinButton.y = 17;
  container.addChild(autoSpinButton);

  const spinButton = createSpinButton(onSpin);
  spinButton.x = canvasWidth - 195;
  spinButton.y = 8;
  container.addChild(spinButton);

  return { container, balanceDisplay, betSelector, infoButton, bonusBuyButton, autoSpinButton, spinButton };
}

function createInfoButton(onInfo: () => void): Container {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";

  const bg = new Graphics();
  bg.roundRect(0, 0, INFO_BTN_SIZE, INFO_BTN_SIZE, INFO_BTN_SIZE / 2);
  bg.fill({ color: BG_SURFACE });
  bg.stroke({ width: 1, color: BORDER_SUBTLE, alpha: 0.4 });
  btn.addChild(bg);

  const label = new Text({ text: "i", style: INFO_TEXT_STYLE });
  label.anchor.set(0.5);
  label.x = INFO_BTN_SIZE / 2;
  label.y = INFO_BTN_SIZE / 2;
  btn.addChild(label);

  btn.on("pointerdown", onInfo);
  return btn;
}

function createAutoButton(onAutoSpin: () => void): Container {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";

  const bg = new Graphics();
  bg.roundRect(0, 0, AUTO_BTN_WIDTH, AUTO_BTN_HEIGHT, 10);
  bg.fill({ color: BG_SURFACE });
  bg.stroke({ width: 1, color: BORDER_SUBTLE, alpha: 0.4 });
  btn.addChild(bg);

  const label = new Text({ text: "AUTO", style: AUTO_TEXT_STYLE });
  label.anchor.set(0.5);
  label.x = AUTO_BTN_WIDTH / 2;
  label.y = AUTO_BTN_HEIGHT / 2;
  btn.addChild(label);

  btn.on("pointerdown", onAutoSpin);
  return btn;
}

export function updateAutoSpinButton(button: Container, enabled: boolean): void {
  button.eventMode = enabled ? "static" : "none";
  button.alpha = enabled ? 1 : 0.4;
}
