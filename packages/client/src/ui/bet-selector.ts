import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { formatCents } from "./balance-display.js";

const BTN_SIZE = 36;
const BTN_RADIUS = 8;
const BTN_COLOR = 0x1a2535;
const BTN_BORDER_COLOR = 0x2a3a4d;

const LABEL_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 11,
  fontWeight: "500",
  fill: 0x7c8a9a,
  letterSpacing: 1,
});

const VALUE_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 20,
  fontWeight: "bold",
  fill: 0xf0e6d3,
});

const BTN_TEXT_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 20,
  fontWeight: "bold",
  fill: 0xd4a846,
});

export function createBetSelector(
  betOptions: readonly number[],
  defaultBet: number,
  onBetChange: (newBet: number) => void,
): Container {
  const container = new Container();
  let currentIndex = betOptions.indexOf(defaultBet);
  if (currentIndex === -1) currentIndex = 0;

  const label = new Text({ text: "BET", style: LABEL_STYLE });
  label.x = 70;
  container.addChild(label);

  // Minus button
  const minusBtn = createButton("\u2212");
  minusBtn.y = 18;
  container.addChild(minusBtn);

  // Value display
  const value = new Text({ text: formatCents(betOptions[currentIndex]!), style: VALUE_STYLE });
  value.anchor.set(0.5, 0);
  value.x = 90;
  value.y = 22;
  container.addChild(value);

  // Plus button
  const plusBtn = createButton("+");
  plusBtn.x = 144;
  plusBtn.y = 18;
  container.addChild(plusBtn);

  minusBtn.on("pointerdown", () => {
    if (currentIndex > 0) {
      currentIndex--;
      const newBet = betOptions[currentIndex]!;
      value.text = formatCents(newBet);
      onBetChange(newBet);
    }
  });

  plusBtn.on("pointerdown", () => {
    if (currentIndex < betOptions.length - 1) {
      currentIndex++;
      const newBet = betOptions[currentIndex]!;
      value.text = formatCents(newBet);
      onBetChange(newBet);
    }
  });

  return container;
}

export function updateBetSelector(selector: Container, currentBet: number, enabled: boolean): void {
  const minusBtn = selector.children[1]!;
  const value = selector.children[2] as Text;
  const plusBtn = selector.children[3]!;

  value.text = formatCents(currentBet);

  const mode = enabled ? "static" : "none";
  const alpha = enabled ? 1 : 0.5;

  minusBtn.eventMode = mode;
  minusBtn.alpha = alpha;
  plusBtn.eventMode = mode;
  plusBtn.alpha = alpha;
}

function createButton(label: string): Container {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";

  const bg = new Graphics();
  bg.roundRect(0, 0, BTN_SIZE, BTN_SIZE, BTN_RADIUS);
  bg.fill({ color: BTN_COLOR });
  bg.stroke({ width: 1, color: BTN_BORDER_COLOR });
  btn.addChild(bg);

  const text = new Text({ text: label, style: BTN_TEXT_STYLE });
  text.anchor.set(0.5);
  text.x = BTN_SIZE / 2;
  text.y = BTN_SIZE / 2;
  btn.addChild(text);

  return btn;
}
