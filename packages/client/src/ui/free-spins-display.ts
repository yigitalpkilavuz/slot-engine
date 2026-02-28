import { Container, Text, TextStyle } from "pixi.js";

const FREE_SPINS_STYLE = new TextStyle({
  fontFamily: ["Cinzel", "Georgia", "serif"],
  fontSize: 18,
  fontWeight: "700",
  fill: 0xf87171,
  dropShadow: {
    color: 0xe85d5d,
    blur: 10,
    alpha: 0.6,
    distance: 0,
  },
});

export function createFreeSpinsDisplay(canvasWidth: number): Container {
  const container = new Container();
  container.visible = false;

  const text = new Text({ text: "", style: FREE_SPINS_STYLE });
  text.anchor.set(0.5, 0);
  text.x = canvasWidth / 2;
  text.y = 0;
  container.addChild(text);

  return container;
}

export function updateFreeSpinsDisplay(display: Container, remaining: number): void {
  if (remaining <= 0) {
    display.visible = false;
    return;
  }

  display.visible = true;
  const text = display.children[0] as Text;
  text.text = `FREE SPINS \u2022 ${String(remaining)} remaining`;
}
