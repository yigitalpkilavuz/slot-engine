import { Container, Graphics } from "pixi.js";
import { createBalanceDisplay } from "./balance-display.js";
import { createBetSelector } from "./bet-selector.js";
import { createSpinButton } from "./spin-button.js";

const BAR_HEIGHT = 60;
const BAR_COLOR = 0x0d1117;
const BAR_ALPHA = 0.8;

export interface HudComponents {
  readonly container: Container;
  readonly balanceDisplay: Container;
  readonly betSelector: Container;
  readonly spinButton: Container;
}

export function createHud(
  canvasWidth: number,
  betOptions: readonly number[],
  defaultBet: number,
  onBetChange: (bet: number) => void,
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

  const spinButton = createSpinButton(onSpin);
  spinButton.x = canvasWidth - 220;
  spinButton.y = 5;
  container.addChild(spinButton);

  return { container, balanceDisplay, betSelector, spinButton };
}
