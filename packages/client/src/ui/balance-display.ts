import { Container, Text, TextStyle } from "pixi.js";
import { FONT_BODY, SILVER_MUTED, GOLD } from "./design-tokens.js";

export function formatCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `$${String(dollars)}.${String(remainder).padStart(2, "0")}`;
}

const LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 11,
  fontWeight: "500",
  fill: SILVER_MUTED,
  letterSpacing: 1.5,
});

const VALUE_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 24,
  fontWeight: "bold",
  fill: GOLD,
});

export function createBalanceDisplay(): Container {
  const container = new Container();

  const label = new Text({ text: "BALANCE", style: LABEL_STYLE });
  container.addChild(label);

  const value = new Text({ text: "$0.00", style: VALUE_STYLE });
  value.y = 18;
  container.addChild(value);

  return container;
}

export function updateBalanceDisplay(display: Container, balanceCents: number): void {
  const value = display.children[1] as Text;
  value.text = formatCents(balanceCents);
}
