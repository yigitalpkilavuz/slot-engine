import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { createBalanceDisplay } from "./balance-display.js";
import { createBetSelector } from "./bet-selector.js";
import { createSpinButton } from "./spin-button.js";

const BAR_HEIGHT = 60;
const BAR_COLOR = 0x0d1117;
const BAR_ALPHA = 0.8;

const INFO_BTN_SIZE = 36;
const INFO_BTN_COLOR = 0x2980b9;

const INFO_TEXT_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 22,
  fontWeight: "bold",
  fill: 0xffffff,
  fontStyle: "italic",
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

  const bg = new Graphics();
  bg.rect(0, 0, canvasWidth, BAR_HEIGHT);
  bg.fill({ color: BAR_COLOR });
  bg.alpha = BAR_ALPHA;
  container.addChild(bg);

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
  btn.addChild(bg);

  const label = new Text({ text: "i", style: INFO_TEXT_STYLE });
  label.anchor.set(0.5);
  label.x = INFO_BTN_SIZE / 2;
  label.y = INFO_BTN_SIZE / 2;
  btn.addChild(label);

  btn.on("pointerdown", onInfo);
  return btn;
}
