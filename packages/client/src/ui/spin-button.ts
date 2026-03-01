import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { FONT_BODY, GOLD, GOLD_BRIGHT, GOLD_MUTED, BG_ELEVATED, CORAL } from "./design-tokens.js";

const BUTTON_WIDTH = 220;
const BUTTON_HEIGHT = 56;
const CORNER_RADIUS = 14;

const TEXT_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 20,
  fontWeight: "bold",
  fill: 0x08090f,
  letterSpacing: 4,
});

export function createSpinButton(onSpin: () => void): Container {
  const button = new Container();
  button.eventMode = "static";
  button.cursor = "pointer";

  // Shadow layer
  const shadow = new Graphics();
  shadow.roundRect(0, 2, BUTTON_WIDTH, BUTTON_HEIGHT, CORNER_RADIUS);
  shadow.fill({ color: GOLD_MUTED, alpha: 0.3 });
  button.addChild(shadow);

  // Main button
  const bg = new Graphics();
  drawButton(bg, GOLD);
  button.addChild(bg);

  const label = new Text({ text: "SPIN", style: TEXT_STYLE });
  label.anchor.set(0.5);
  label.x = BUTTON_WIDTH / 2;
  label.y = BUTTON_HEIGHT / 2;
  button.addChild(label);

  button.on("pointerdown", onSpin);

  return button;
}

export function updateSpinButton(button: Container, enabled: boolean): void {
  const bg = button.children[1] as Graphics;
  const shadow = button.children[0] as Graphics;

  bg.clear();
  shadow.clear();

  if (enabled) {
    shadow.roundRect(0, 2, BUTTON_WIDTH, BUTTON_HEIGHT, CORNER_RADIUS);
    shadow.fill({ color: GOLD_MUTED, alpha: 0.3 });
    drawButton(bg, GOLD);
  } else {
    drawButton(bg, BG_ELEVATED);
  }

  button.eventMode = enabled ? "static" : "none";
  button.cursor = enabled ? "pointer" : "default";
  button.alpha = enabled ? 1 : 0.5;
}

export function updateSpinButtonAutoStop(button: Container, remaining: number): void {
  const bg = button.children[1] as Graphics;
  const shadow = button.children[0] as Graphics;
  const label = button.children[2] as Text;

  bg.clear();
  shadow.clear();
  drawButton(bg, CORAL);

  const countText = remaining === Infinity ? "\u221E" : String(remaining);
  label.text = `STOP (${countText})`;

  button.eventMode = "static";
  button.cursor = "pointer";
  button.alpha = 1;
}

export function resetSpinButtonLabel(button: Container): void {
  const label = button.children[2] as Text;
  label.text = "SPIN";
}

function drawButton(bg: Graphics, color: number): void {
  // Main fill
  bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, CORNER_RADIUS);
  bg.fill({ color });

  // Top highlight overlay (subtle gradient effect)
  if (color === GOLD) {
    bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT * 0.5, CORNER_RADIUS);
    bg.fill({ color: GOLD_BRIGHT, alpha: 0.15 });

    bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, CORNER_RADIUS);
    bg.stroke({ width: 1, color: GOLD_BRIGHT, alpha: 0.2 });
  } else if (color === BG_ELEVATED) {
    bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, CORNER_RADIUS);
    bg.stroke({ width: 1, color: 0x2a3548, alpha: 0.3 });
  }
}
