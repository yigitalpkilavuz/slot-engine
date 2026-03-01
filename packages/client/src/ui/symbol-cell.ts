import { Assets, Container, Graphics, Sprite, Text, Texture, TextStyle } from "pixi.js";
import { getSymbolTextureAlias } from "../assets/game-asset-registry.js";
import {
  FONT_BODY,
  WHITE_SOFT,
  GOLD,
  GOLD_BRIGHT,
  CORAL,
  BORDER_SUBTLE,
  SYMBOL_COLORS,
  SYMBOL_LABELS,
  darkenColor,
  lightenColor,
} from "./design-tokens.js";

export const CELL_WIDTH = 130;
export const CELL_HEIGHT = 100;
const CELL_CORNER_RADIUS = 12;
const DEFAULT_COLOR = 0x64748b;

const LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 15,
  fontWeight: "bold",
  fill: WHITE_SOFT,
  letterSpacing: 1,
});

const WILD_LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 15,
  fontWeight: "bold",
  fill: WHITE_SOFT,
  letterSpacing: 1,
  dropShadow: {
    color: GOLD_BRIGHT,
    blur: 8,
    alpha: 0.6,
    distance: 0,
  },
});

const SCATTER_LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 15,
  fontWeight: "bold",
  fill: WHITE_SOFT,
  letterSpacing: 1,
  dropShadow: {
    color: CORAL,
    blur: 8,
    alpha: 0.6,
    distance: 0,
  },
});

const BADGE_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 10,
  fontWeight: "900",
  fill: 0x08090f,
});

export function getSymbolColor(symbolId: string): number {
  return SYMBOL_COLORS[symbolId] ?? DEFAULT_COLOR;
}

export function createSymbolCell(symbolId: string, badgeText?: string): Container {
  const cell = new Container();
  const texture = getSymbolTexture(symbolId);

  if (texture) {
    const sprite = new Sprite(texture);
    sprite.width = CELL_WIDTH;
    sprite.height = CELL_HEIGHT;
    cell.addChild(sprite);
    (cell as unknown as { _spriteMode: boolean })._spriteMode = true;
  } else {
    const bg = new Graphics();
    drawCellBackground(bg, symbolId);
    cell.addChild(bg);

    const label = new Text({
      text: getLabel(symbolId),
      style: getLabelStyle(symbolId),
    });
    label.anchor.set(0.5);
    label.x = CELL_WIDTH / 2;
    label.y = CELL_HEIGHT / 2;
    cell.addChild(label);
  }

  if (badgeText) {
    addBadge(cell, badgeText);
  }

  return cell;
}

export function updateSymbolCell(cell: Container, symbolId: string, badgeText?: string): void {
  const isSpriteMode = (cell as unknown as { _spriteMode?: boolean })._spriteMode === true;

  removeBadge(cell);

  if (isSpriteMode) {
    const sprite = cell.children[0] as Sprite;
    const texture = getSymbolTexture(symbolId);
    if (texture) {
      sprite.texture = texture;
    }
  } else {
    const texture = getSymbolTexture(symbolId);
    if (texture) {
      cell.removeChildren();
      const sprite = new Sprite(texture);
      sprite.width = CELL_WIDTH;
      sprite.height = CELL_HEIGHT;
      cell.addChild(sprite);
      (cell as unknown as { _spriteMode: boolean })._spriteMode = true;
    } else {
      const bg = cell.children[0] as Graphics;
      const label = cell.children[1] as Text;

      bg.clear();
      drawCellBackground(bg, symbolId);

      label.style = getLabelStyle(symbolId);
      label.text = getLabel(symbolId);
    }
  }

  if (badgeText) {
    addBadge(cell, badgeText);
  }
}

function getSymbolTexture(symbolId: string): Texture | undefined {
  const alias = getSymbolTextureAlias(symbolId);
  const texture = Assets.get<Texture>(alias);
  return texture instanceof Texture ? texture : undefined;
}

function drawCellBackground(bg: Graphics, symbolId: string): void {
  const color = getSymbolColor(symbolId);
  const darkColor = darkenColor(color, 0.6);
  const brightColor = lightenColor(color, 1.3);

  // Layer 1: Dark base fill
  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_CORNER_RADIUS);
  bg.fill({ color: darkColor });

  // Layer 2: Top highlight gradient (brighter top 40%)
  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT * 0.4, CELL_CORNER_RADIUS);
  bg.fill({ color: brightColor, alpha: 0.2 });

  // Layer 3: Inner glow (inset stroke)
  bg.roundRect(1, 1, CELL_WIDTH - 2, CELL_HEIGHT - 2, CELL_CORNER_RADIUS - 1);
  bg.stroke({ width: 1, color, alpha: 0.3 });

  // Layer 4: Outer border
  let borderColor = BORDER_SUBTLE;
  let borderAlpha = 0.3;
  let borderWidth = 1;

  if (symbolId === "wild") {
    borderColor = GOLD;
    borderAlpha = 0.7;
    borderWidth = 1.5;
  } else if (symbolId === "scatter") {
    borderColor = CORAL;
    borderAlpha = 0.7;
    borderWidth = 1.5;
  }

  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_CORNER_RADIUS);
  bg.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha });
}

function getLabelStyle(symbolId: string): TextStyle {
  if (symbolId === "wild") return WILD_LABEL_STYLE;
  if (symbolId === "scatter") return SCATTER_LABEL_STYLE;
  return LABEL_STYLE;
}

function getLabel(symbolId: string): string {
  return SYMBOL_LABELS[symbolId] ?? symbolId.toUpperCase();
}

const BADGE_TAG = "_badge";

function addBadge(cell: Container, text: string): void {
  const badge = new Container();
  (badge as unknown as { _tag: string })._tag = BADGE_TAG;

  const badgeW = 26;
  const badgeH = 17;

  const bg = new Graphics();
  bg.roundRect(0, 0, badgeW, badgeH, 6);
  bg.fill({ color: GOLD_BRIGHT });
  bg.stroke({ width: 0.5, color: GOLD, alpha: 0.5 });
  badge.addChild(bg);

  const label = new Text({ text, style: BADGE_STYLE });
  label.anchor.set(0.5);
  label.x = badgeW / 2;
  label.y = badgeH / 2;
  badge.addChild(label);

  badge.x = CELL_WIDTH - badgeW - 5;
  badge.y = CELL_HEIGHT - badgeH - 5;
  cell.addChild(badge);
}

function removeBadge(cell: Container): void {
  for (let i = cell.children.length - 1; i >= 0; i--) {
    const child = cell.children[i] as Container;
    if ((child as unknown as { _tag?: string })._tag === BADGE_TAG) {
      cell.removeChildAt(i);
      child.destroy({ children: true });
      return;
    }
  }
}
