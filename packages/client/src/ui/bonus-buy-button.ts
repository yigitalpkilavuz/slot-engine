import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { FONT_BODY, VIOLET, BG_ELEVATED, WHITE_SOFT } from "./design-tokens.js";

const BTN_WIDTH = 130;
const BTN_HEIGHT = 56;
const CORNER_RADIUS = 14;

const LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 11,
  fontWeight: "700",
  fill: 0xffd700,
  letterSpacing: 1.5,
});

const COST_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 14,
  fontWeight: "500",
  fill: WHITE_SOFT,
});

export function createBonusBuyButton(onBuy: () => void): Container {
  const button = new Container();
  button.eventMode = "static";
  button.cursor = "pointer";

  const bg = new Graphics();
  drawButton(bg, VIOLET);
  button.addChild(bg);

  const label = new Text({ text: "BUY BONUS", style: LABEL_STYLE });
  label.anchor.set(0.5);
  label.x = BTN_WIDTH / 2;
  label.y = 18;
  button.addChild(label);

  const costText = new Text({ text: "", style: COST_STYLE });
  costText.anchor.set(0.5);
  costText.x = BTN_WIDTH / 2;
  costText.y = 38;
  button.addChild(costText);

  button.on("pointerdown", onBuy);

  return button;
}

export function updateBonusBuyButton(
  button: Container,
  enabled: boolean,
  costCents: number,
): void {
  const bg = button.children[0] as Graphics;
  const costText = button.children[2] as Text;

  bg.clear();
  drawButton(bg, enabled ? VIOLET : BG_ELEVATED);

  costText.text = `$${(costCents / 100).toFixed(2)}`;

  button.eventMode = enabled ? "static" : "none";
  button.cursor = enabled ? "pointer" : "default";
  button.alpha = enabled ? 1 : 0.4;
}

function drawButton(bg: Graphics, color: number): void {
  bg.roundRect(0, 0, BTN_WIDTH, BTN_HEIGHT, CORNER_RADIUS);
  bg.fill({ color });

  if (color === VIOLET) {
    // Lighter top half for subtle gradient
    bg.roundRect(0, 0, BTN_WIDTH, BTN_HEIGHT * 0.5, CORNER_RADIUS);
    bg.fill({ color: 0xa78bfa, alpha: 0.15 });

    bg.roundRect(0, 0, BTN_WIDTH, BTN_HEIGHT, CORNER_RADIUS);
    bg.stroke({ width: 1, color: 0xa78bfa, alpha: 0.3 });
  } else {
    bg.roundRect(0, 0, BTN_WIDTH, BTN_HEIGHT, CORNER_RADIUS);
    bg.stroke({ width: 1, color: 0x2a3548, alpha: 0.3 });
  }
}
