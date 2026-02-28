import { Container, Graphics, Text, TextStyle } from "pixi.js";

const BUTTON_WIDTH = 180;
const BUTTON_HEIGHT = 50;
const CORNER_RADIUS = 12;
const COLOR_ENABLED = 0x27ae60;
const COLOR_DISABLED = 0x7f8c8d;

const TEXT_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 22,
  fontWeight: "bold",
  fill: 0xffffff,
});

export function createSpinButton(onSpin: () => void): Container {
  const button = new Container();
  button.eventMode = "static";
  button.cursor = "pointer";

  const bg = new Graphics();
  bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, CORNER_RADIUS);
  bg.fill({ color: COLOR_ENABLED });
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
  const bg = button.children[0] as Graphics;

  bg.clear();
  bg.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, CORNER_RADIUS);
  bg.fill({ color: enabled ? COLOR_ENABLED : COLOR_DISABLED });

  button.eventMode = enabled ? "static" : "none";
  button.cursor = enabled ? "pointer" : "default";
  button.alpha = enabled ? 1 : 0.7;
}
