import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { createBalanceDisplay } from "./balance-display.js";
import { createBetSelector } from "./bet-selector.js";
import { createSpinButton } from "./spin-button.js";

const BAR_HEIGHT = 60;
const BAR_COLOR = 0x0a0f1a;

const INFO_BTN_SIZE = 36;
const INFO_BTN_COLOR = 0x1a2535;
const INFO_BTN_BORDER = 0x2a3a4d;

const INFO_TEXT_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 18,
  fontWeight: "bold",
  fill: 0xd4a846,
});

export interface HudComponents {
  readonly container: Container;
  readonly balanceDisplay: Container;
  readonly betSelector: Container;
  readonly infoButton: Container;
  readonly spinButton: Container;
}

export function createHud(
  canvasWidth: number,
  betOptions: readonly number[],
  defaultBet: number,
  onBetChange: (bet: number) => void,
  onInfo: () => void,
  onSpin: () => void,
): HudComponents {
  const container = new Container();

  // Background bar
  const bg = new Graphics();
  bg.rect(0, 0, canvasWidth, BAR_HEIGHT);
  bg.fill({ color: BAR_COLOR });
  container.addChild(bg);

  // Subtle top border
  const topLine = new Graphics();
  topLine.moveTo(0, 0);
  topLine.lineTo(canvasWidth, 0);
  topLine.stroke({ width: 1, color: 0x1a2d45 });
  container.addChild(topLine);

  const balanceDisplay = createBalanceDisplay();
  balanceDisplay.x = 40;
  balanceDisplay.y = 8;
  container.addChild(balanceDisplay);

  const betSelector = createBetSelector(betOptions, defaultBet, onBetChange);
  betSelector.x = 360;
  betSelector.y = 4;
  container.addChild(betSelector);

  const infoButton = createInfoButton(onInfo);
  infoButton.x = canvasWidth - 270;
  infoButton.y = 12;
  container.addChild(infoButton);

  const spinButton = createSpinButton(onSpin);
  spinButton.x = canvasWidth - 220;
  spinButton.y = 5;
  container.addChild(spinButton);

  return { container, balanceDisplay, betSelector, infoButton, spinButton };
}

function createInfoButton(onInfo: () => void): Container {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";

  const bg = new Graphics();
  bg.roundRect(0, 0, INFO_BTN_SIZE, INFO_BTN_SIZE, INFO_BTN_SIZE / 2);
  bg.fill({ color: INFO_BTN_COLOR });
  bg.stroke({ width: 1, color: INFO_BTN_BORDER });
  btn.addChild(bg);

  const label = new Text({ text: "i", style: INFO_TEXT_STYLE });
  label.anchor.set(0.5);
  label.x = INFO_BTN_SIZE / 2;
  label.y = INFO_BTN_SIZE / 2;
  btn.addChild(label);

  btn.on("pointerdown", onInfo);
  return btn;
}
