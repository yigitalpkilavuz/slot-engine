import { Container, Text, TextStyle } from "pixi.js";

export function formatCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `$${String(dollars)}.${String(remainder).padStart(2, "0")}`;
}

const LABEL_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 12,
  fill: 0x95a5a6,
});

const VALUE_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 22,
  fontWeight: "bold",
  fill: 0x2ecc71,
});

export function createBalanceDisplay(): Container {
  const container = new Container();

  const label = new Text({ text: "BALANCE", style: LABEL_STYLE });
  container.addChild(label);

  const value = new Text({ text: "$0.00", style: VALUE_STYLE });
  value.y = 16;
  container.addChild(value);

  return container;
}

export function updateBalanceDisplay(display: Container, balanceCents: number): void {
  const value = display.children[1] as Text;
  value.text = formatCents(balanceCents);
}
