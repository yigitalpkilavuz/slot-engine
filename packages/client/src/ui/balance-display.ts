import { Container, Text, TextStyle } from "pixi.js";

export function formatCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `$${String(dollars)}.${String(remainder).padStart(2, "0")}`;
}

const LABEL_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 11,
  fontWeight: "500",
  fill: 0x7c8a9a,
  letterSpacing: 1,
});

const VALUE_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 22,
  fontWeight: "bold",
  fill: 0xd4a846,
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
