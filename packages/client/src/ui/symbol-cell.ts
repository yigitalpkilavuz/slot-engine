import { Assets, Container, Graphics, Sprite, Text, Texture, TextStyle } from "pixi.js";
import { getSymbolTextureAlias } from "../assets/game-asset-registry.js";
import {
  FONT_DISPLAY,
  FONT_BODY,
  WHITE_SOFT,
  GOLD,
  GOLD_BRIGHT,
  CORAL,
  BORDER_SUBTLE,
  SYMBOL_COLORS,
  SYMBOL_LABELS,
  getRegisteredSymbolName,
  hashSymbolColor,
  darkenColor,
  lightenColor,
} from "./design-tokens.js";

export const CELL_WIDTH = 130;
export const CELL_HEIGHT = 100;
const CELL_CORNER_RADIUS = 12;

const ICON_CY = 34;
const LABEL_BOTTOM_Y = 82;

// ── Label Styles ──────────────────────────────────────

const LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 11,
  fontWeight: "600",
  fill: WHITE_SOFT,
  letterSpacing: 0.8,
});

const SEVEN_LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 42,
  fontWeight: "900",
  fill: 0x6898e8,
  dropShadow: {
    color: 0x2050a0,
    blur: 8,
    alpha: 0.6,
    distance: 0,
  },
});

const BAR_LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 24,
  fontWeight: "900",
  fill: 0x48d888,
  letterSpacing: 4,
  dropShadow: {
    color: 0x1a8f50,
    blur: 8,
    alpha: 0.5,
    distance: 0,
  },
});

const WILD_LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 24,
  fontWeight: "900",
  fill: 0xffeebb,
  letterSpacing: 5,
  dropShadow: {
    color: GOLD_BRIGHT,
    blur: 12,
    alpha: 0.9,
    distance: 0,
  },
});

const SCATTER_LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 20,
  fontWeight: "900",
  fill: WHITE_SOFT,
  letterSpacing: 3,
  dropShadow: {
    color: CORAL,
    blur: 12,
    alpha: 0.9,
    distance: 0,
  },
});

const BADGE_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 10,
  fontWeight: "900",
  fill: 0x08090f,
});

// ── Public API ────────────────────────────────────────

export function getSymbolColor(symbolId: string): number {
  return SYMBOL_COLORS[symbolId] ?? hashSymbolColor(symbolId);
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
    drawCellContent(bg, symbolId);
    cell.addChild(bg);

    const label = new Text({
      text: getLabel(symbolId),
      style: getLabelStyle(symbolId),
    });
    label.anchor.set(0.5);
    label.x = CELL_WIDTH / 2;
    label.y = getLabelY(symbolId);
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
      drawCellContent(bg, symbolId);

      label.style = getLabelStyle(symbolId);
      label.text = getLabel(symbolId);
      label.y = getLabelY(symbolId);
    }
  }

  if (badgeText) {
    addBadge(cell, badgeText);
  }
}

// ── Layout Helpers ────────────────────────────────────

function hasIcon(symbolId: string): boolean {
  return symbolId !== "wild" && symbolId !== "scatter" && symbolId !== "seven" && symbolId !== "bar";
}

function getLabelY(symbolId: string): number {
  if (symbolId === "wild" || symbolId === "scatter") return 58;
  if (hasIcon(symbolId)) return LABEL_BOTTOM_Y;
  return CELL_HEIGHT / 2;
}

function getLabelStyle(symbolId: string): TextStyle {
  if (symbolId === "wild") return WILD_LABEL_STYLE;
  if (symbolId === "scatter") return SCATTER_LABEL_STYLE;
  if (symbolId === "seven") return SEVEN_LABEL_STYLE;
  if (symbolId === "bar") return BAR_LABEL_STYLE;
  return LABEL_STYLE;
}

function getLabel(symbolId: string): string {
  return SYMBOL_LABELS[symbolId] ?? getRegisteredSymbolName(symbolId)?.toUpperCase() ?? symbolId.toUpperCase();
}

function getSymbolTexture(symbolId: string): Texture | undefined {
  const alias = getSymbolTextureAlias(symbolId);
  const texture = Assets.get<Texture>(alias);
  return texture instanceof Texture ? texture : undefined;
}

// ── Cell Content Drawing ──────────────────────────────

function drawCellContent(bg: Graphics, symbolId: string): void {
  if (symbolId === "wild") {
    drawWildCell(bg);
    return;
  }
  if (symbolId === "scatter") {
    drawScatterCell(bg);
    return;
  }
  drawRegularBackground(bg, symbolId);
  if (hasIcon(symbolId)) {
    drawSymbolIcon(bg, symbolId, CELL_WIDTH / 2, ICON_CY);
  }
}

// ── Regular Symbol Background ─────────────────────────

function drawRegularBackground(bg: Graphics, symbolId: string): void {
  const color = getSymbolColor(symbolId);
  const darkColor = darkenColor(color, 0.5);
  const brightColor = lightenColor(color, 1.4);

  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_CORNER_RADIUS);
  bg.fill({ color: darkColor });

  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT * 0.35, CELL_CORNER_RADIUS);
  bg.fill({ color: brightColor, alpha: 0.12 });

  bg.roundRect(1, 1, CELL_WIDTH - 2, CELL_HEIGHT - 2, CELL_CORNER_RADIUS - 1);
  bg.stroke({ width: 1, color, alpha: 0.25 });

  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_CORNER_RADIUS);
  bg.stroke({ width: 1, color: BORDER_SUBTLE, alpha: 0.3 });
}

// ── Wild Cell ─────────────────────────────────────────

function drawWildCell(bg: Graphics): void {
  const cx = CELL_WIDTH / 2;
  const cy = CELL_HEIGHT / 2;

  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_CORNER_RADIUS);
  bg.fill({ color: 0x2a2008 });

  // Starburst rays
  const rayCount = 10;
  const innerR = 6;
  const outerR = 75;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 - Math.PI / 2;
    const spread = (0.3 / rayCount) * Math.PI * 2;
    bg.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    bg.lineTo(cx + Math.cos(angle - spread) * outerR, cy + Math.sin(angle - spread) * outerR);
    bg.lineTo(cx + Math.cos(angle + spread) * outerR, cy + Math.sin(angle + spread) * outerR);
    bg.closePath();
    bg.fill({ color: GOLD, alpha: 0.1 });
  }

  // Center glow layers
  bg.circle(cx, cy, 30);
  bg.fill({ color: GOLD_BRIGHT, alpha: 0.08 });
  bg.circle(cx, cy, 18);
  bg.fill({ color: GOLD_BRIGHT, alpha: 0.06 });

  // Small diamond icon above text
  bg.star(cx, 26, 4, 10, 4, 0);
  bg.fill({ color: GOLD_BRIGHT, alpha: 0.7 });

  // Thick gold border
  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_CORNER_RADIUS);
  bg.stroke({ width: 3, color: GOLD_BRIGHT, alpha: 0.9 });
  bg.roundRect(3, 3, CELL_WIDTH - 6, CELL_HEIGHT - 6, CELL_CORNER_RADIUS - 2);
  bg.stroke({ width: 1, color: GOLD, alpha: 0.35 });

  // Corner sparkles
  const corners: [number, number][] = [[12, 12], [CELL_WIDTH - 12, 12], [12, CELL_HEIGHT - 12], [CELL_WIDTH - 12, CELL_HEIGHT - 12]];
  for (const [sx, sy] of corners) {
    bg.star(sx, sy, 4, 3.5, 1.2, 0);
    bg.fill({ color: GOLD_BRIGHT, alpha: 0.5 });
  }
}

// ── Scatter Cell ──────────────────────────────────────

function drawScatterCell(bg: Graphics): void {
  const cx = CELL_WIDTH / 2;
  const cy = CELL_HEIGHT / 2;

  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_CORNER_RADIUS);
  bg.fill({ color: 0x200a0a });

  // Concentric rings
  bg.circle(cx, cy, 42);
  bg.stroke({ width: 1.5, color: CORAL, alpha: 0.1 });
  bg.circle(cx, cy, 32);
  bg.stroke({ width: 1.5, color: CORAL, alpha: 0.14 });
  bg.circle(cx, cy, 22);
  bg.stroke({ width: 1.5, color: CORAL, alpha: 0.18 });

  // Center glow
  bg.circle(cx, cy, 26);
  bg.fill({ color: CORAL, alpha: 0.06 });

  // Orbital dots
  const dotR = 34;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    bg.circle(cx + Math.cos(angle) * dotR, cy + Math.sin(angle) * dotR, 2);
    bg.fill({ color: 0xff8080, alpha: 0.3 });
  }

  // Small ring icon above text
  bg.circle(cx, 24, 8);
  bg.stroke({ width: 2.5, color: 0xff8080, alpha: 0.7 });
  bg.circle(cx, 24, 3);
  bg.fill({ color: 0xff8080, alpha: 0.5 });

  // Thick coral border
  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_CORNER_RADIUS);
  bg.stroke({ width: 3, color: CORAL, alpha: 0.9 });
  bg.roundRect(3, 3, CELL_WIDTH - 6, CELL_HEIGHT - 6, CELL_CORNER_RADIUS - 2);
  bg.stroke({ width: 1, color: 0xff8080, alpha: 0.25 });
}

// ── Symbol Icon Dispatch ──────────────────────────────

function drawSymbolIcon(bg: Graphics, symbolId: string, cx: number, cy: number): void {
  const drawer = ICON_DRAWERS[symbolId];
  if (drawer) drawer(bg, cx, cy);
}

const ICON_DRAWERS: Record<string, (g: Graphics, cx: number, cy: number) => void> = {
  cherry: drawCherry,
  lemon: drawLemon,
  orange: drawOrange,
  plum: drawPlum,
  bell: drawBell,
  strawberry: drawStrawberry,
  watermelon: drawWatermelon,
  grape: drawGrape,
  banana: drawBanana,
  pineapple: drawPineapple,
  coconut: drawCoconut,
  diamond: drawDiamond,
  star: drawStarIcon,
  coin: drawCoin,
  amphora: drawAmphora,
  helmet: drawHelmet,
  shield: drawShield,
  medusa: drawMedusa,
  pegasus: drawPegasus,
  athena: drawAthena,
  poseidon: drawPoseidon,
};

// ── Individual Icon Drawings ──────────────────────────

function drawCherry(g: Graphics, cx: number, cy: number): void {
  // Berries
  g.circle(cx - 9, cy + 5, 10);
  g.fill({ color: 0xff4040 });
  g.circle(cx + 7, cy + 2, 10);
  g.fill({ color: 0xe83838 });
  // Highlights
  g.circle(cx - 12, cy + 1, 3);
  g.fill({ color: 0xff9090, alpha: 0.45 });
  g.circle(cx + 4, cy - 2, 2.5);
  g.fill({ color: 0xff9090, alpha: 0.4 });
  // Stems
  g.moveTo(cx - 7, cy - 4);
  g.quadraticCurveTo(cx - 2, cy - 22, cx + 2, cy - 18);
  g.stroke({ width: 2.5, color: 0x3d9e3d });
  g.moveTo(cx + 5, cy - 7);
  g.quadraticCurveTo(cx + 1, cy - 22, cx + 2, cy - 18);
  g.stroke({ width: 2.5, color: 0x3d9e3d });
  // Leaf
  g.ellipse(cx + 7, cy - 17, 7, 3.5);
  g.fill({ color: 0x4db84d });
}

function drawLemon(g: Graphics, cx: number, cy: number): void {
  // Body
  g.ellipse(cx, cy, 22, 14);
  g.fill({ color: 0xffd740 });
  // Pointed tips
  g.moveTo(cx - 22, cy);
  g.lineTo(cx - 27, cy - 2);
  g.lineTo(cx - 23, cy + 3);
  g.closePath();
  g.fill({ color: 0xf0c830 });
  g.moveTo(cx + 22, cy);
  g.lineTo(cx + 27, cy + 2);
  g.lineTo(cx + 23, cy - 3);
  g.closePath();
  g.fill({ color: 0xf0c830 });
  // Highlight
  g.ellipse(cx - 5, cy - 4, 10, 5);
  g.fill({ color: 0xffeb80, alpha: 0.35 });
}

function drawOrange(g: Graphics, cx: number, cy: number): void {
  g.circle(cx, cy + 2, 18);
  g.fill({ color: 0xff8030 });
  // Highlight
  g.circle(cx - 6, cy - 4, 7);
  g.fill({ color: 0xffa060, alpha: 0.35 });
  // Navel
  g.circle(cx + 1, cy + 16, 2.5);
  g.fill({ color: 0xd06020, alpha: 0.5 });
  // Stem
  g.moveTo(cx, cy - 16);
  g.lineTo(cx + 1, cy - 20);
  g.stroke({ width: 2, color: 0x6b4226 });
  // Leaf
  g.ellipse(cx + 5, cy - 19, 6, 3);
  g.fill({ color: 0x4db84d });
}

function drawPlum(g: Graphics, cx: number, cy: number): void {
  g.circle(cx, cy + 2, 16);
  g.fill({ color: 0x9040d0 });
  // Highlight
  g.circle(cx - 5, cy - 3, 6);
  g.fill({ color: 0xb870f0, alpha: 0.3 });
  // Stem
  g.moveTo(cx + 1, cy - 13);
  g.lineTo(cx + 3, cy - 21);
  g.stroke({ width: 2, color: 0x6b4226 });
  // Leaf
  g.ellipse(cx + 7, cy - 19, 5, 3);
  g.fill({ color: 0x4db84d });
}

function drawBell(g: Graphics, cx: number, cy: number): void {
  // Bell body
  g.moveTo(cx - 18, cy + 10);
  g.quadraticCurveTo(cx - 20, cy - 8, cx, cy - 18);
  g.quadraticCurveTo(cx + 20, cy - 8, cx + 18, cy + 10);
  g.lineTo(cx + 22, cy + 14);
  g.lineTo(cx - 22, cy + 14);
  g.closePath();
  g.fill({ color: 0xffc030 });
  // Highlight
  g.moveTo(cx - 10, cy + 6);
  g.quadraticCurveTo(cx - 14, cy - 4, cx - 4, cy - 12);
  g.quadraticCurveTo(cx - 2, cy - 4, cx - 5, cy + 4);
  g.closePath();
  g.fill({ color: 0xffdd70, alpha: 0.3 });
  // Clapper
  g.circle(cx, cy + 18, 3.5);
  g.fill({ color: 0xd4a020 });
  // Handle
  g.circle(cx, cy - 20, 3);
  g.stroke({ width: 2, color: 0xd4a020 });
}

function drawStrawberry(g: Graphics, cx: number, cy: number): void {
  // Body
  g.moveTo(cx, cy + 18);
  g.quadraticCurveTo(cx - 20, cy + 2, cx - 14, cy - 6);
  g.quadraticCurveTo(cx - 6, cy - 14, cx, cy - 12);
  g.quadraticCurveTo(cx + 6, cy - 14, cx + 14, cy - 6);
  g.quadraticCurveTo(cx + 20, cy + 2, cx, cy + 18);
  g.closePath();
  g.fill({ color: 0xff3050 });
  // Seeds
  const seeds: [number, number][] = [
    [cx - 6, cy - 3], [cx + 6, cy - 3],
    [cx - 8, cy + 5], [cx, cy + 3], [cx + 8, cy + 5],
    [cx - 4, cy + 11], [cx + 4, cy + 11],
  ];
  for (const [sx, sy] of seeds) {
    g.circle(sx, sy, 1.3);
    g.fill({ color: 0xffcc40, alpha: 0.7 });
  }
  // Green top
  g.moveTo(cx - 8, cy - 10);
  g.lineTo(cx - 3, cy - 6);
  g.lineTo(cx, cy - 14);
  g.lineTo(cx + 3, cy - 6);
  g.lineTo(cx + 8, cy - 10);
  g.lineTo(cx + 4, cy - 4);
  g.lineTo(cx, cy - 8);
  g.lineTo(cx - 4, cy - 4);
  g.closePath();
  g.fill({ color: 0x4db84d });
}

function drawWatermelon(g: Graphics, cx: number, cy: number): void {
  // Green rind
  g.arc(cx, cy + 4, 20, Math.PI, 0);
  g.lineTo(cx + 20, cy + 4);
  g.lineTo(cx - 20, cy + 4);
  g.closePath();
  g.fill({ color: 0x30a060 });
  // Red flesh
  g.arc(cx, cy + 4, 16, Math.PI, 0);
  g.lineTo(cx + 16, cy + 4);
  g.lineTo(cx - 16, cy + 4);
  g.closePath();
  g.fill({ color: 0xff4060 });
  // Seeds
  const seeds: [number, number][] = [[-7, -3], [0, -7], [7, -3], [-4, 0], [4, 0]];
  for (const [sx, sy] of seeds) {
    g.ellipse(cx + sx, cy + 4 + sy, 1.5, 2.5);
    g.fill({ color: 0x1a1a1a });
  }
}

function drawGrape(g: Graphics, cx: number, cy: number): void {
  const r = 5.5;
  const positions: [number, number][] = [
    [cx, cy - 11],
    [cx - 7, cy - 1], [cx + 7, cy - 1],
    [cx - 11, cy + 9], [cx, cy + 9], [cx + 11, cy + 9],
  ];
  for (const [gx, gy] of positions) {
    g.circle(gx, gy, r);
    g.fill({ color: 0x9050f0 });
  }
  // Highlight on top grape
  g.circle(cx - 2, cy - 13, 2);
  g.fill({ color: 0xc090ff, alpha: 0.35 });
  // Stem
  g.moveTo(cx, cy - 16);
  g.lineTo(cx, cy - 24);
  g.stroke({ width: 2, color: 0x6b4226 });
  // Leaf
  g.ellipse(cx + 5, cy - 22, 6, 3);
  g.fill({ color: 0x4db84d });
}

function drawBanana(g: Graphics, cx: number, cy: number): void {
  g.moveTo(cx - 6, cy + 14);
  g.quadraticCurveTo(cx - 22, cy - 6, cx - 4, cy - 16);
  g.quadraticCurveTo(cx + 2, cy - 20, cx + 6, cy - 16);
  g.quadraticCurveTo(cx - 8, cy - 2, cx, cy + 12);
  g.closePath();
  g.fill({ color: 0xffe850 });
  // Highlight
  g.moveTo(cx - 3, cy + 8);
  g.quadraticCurveTo(cx - 16, cy - 2, cx, cy - 14);
  g.quadraticCurveTo(cx - 10, cy, cx - 1, cy + 6);
  g.closePath();
  g.fill({ color: 0xfff090, alpha: 0.3 });
  // Tip
  g.circle(cx - 5, cy + 14, 2);
  g.fill({ color: 0x8b6914 });
}

function drawPineapple(g: Graphics, cx: number, cy: number): void {
  // Body
  g.ellipse(cx, cy + 2, 14, 18);
  g.fill({ color: 0xf0a020 });
  // Cross-hatch
  for (let i = -1; i <= 1; i++) {
    g.moveTo(cx + i * 9 - 3, cy - 14);
    g.lineTo(cx + i * 9 + 3, cy + 18);
    g.stroke({ width: 1, color: 0xc08010, alpha: 0.35 });
  }
  for (let j = -1; j <= 1; j++) {
    g.moveTo(cx - 13, cy + 2 + j * 9);
    g.lineTo(cx + 13, cy + 2 + j * 9);
    g.stroke({ width: 1, color: 0xc08010, alpha: 0.35 });
  }
  // Crown
  g.moveTo(cx, cy - 18);
  g.lineTo(cx - 5, cy - 28);
  g.lineTo(cx, cy - 22);
  g.lineTo(cx + 5, cy - 28);
  g.closePath();
  g.fill({ color: 0x40b050 });
  g.moveTo(cx - 3, cy - 18);
  g.lineTo(cx - 10, cy - 25);
  g.stroke({ width: 2, color: 0x40b050 });
  g.moveTo(cx + 3, cy - 18);
  g.lineTo(cx + 10, cy - 25);
  g.stroke({ width: 2, color: 0x40b050 });
}

function drawCoconut(g: Graphics, cx: number, cy: number): void {
  // Shell
  g.circle(cx, cy, 17);
  g.fill({ color: 0x7a5c3a });
  // Texture line
  g.moveTo(cx - 12, cy - 5);
  g.quadraticCurveTo(cx, cy - 12, cx + 12, cy - 5);
  g.stroke({ width: 1.5, color: 0x5a3e20, alpha: 0.5 });
  // White flesh (lower half)
  g.arc(cx, cy + 2, 13, 0, Math.PI);
  g.closePath();
  g.fill({ color: 0xf0e8d8 });
}

function drawDiamond(g: Graphics, cx: number, cy: number): void {
  // Crown (top)
  g.moveTo(cx, cy - 20);
  g.lineTo(cx + 20, cy - 4);
  g.lineTo(cx - 20, cy - 4);
  g.closePath();
  g.fill({ color: 0x60e0ff });
  // Pavilion (bottom)
  g.moveTo(cx - 20, cy - 4);
  g.lineTo(cx + 20, cy - 4);
  g.lineTo(cx, cy + 18);
  g.closePath();
  g.fill({ color: 0x40c8e8 });
  // Facet lines
  g.moveTo(cx - 8, cy - 4);
  g.lineTo(cx, cy + 18);
  g.stroke({ width: 1, color: 0x90f0ff, alpha: 0.4 });
  g.moveTo(cx + 8, cy - 4);
  g.lineTo(cx, cy + 18);
  g.stroke({ width: 1, color: 0x90f0ff, alpha: 0.4 });
  // Girdle line
  g.moveTo(cx - 20, cy - 4);
  g.lineTo(cx + 20, cy - 4);
  g.stroke({ width: 1, color: 0x90f0ff, alpha: 0.45 });
  // Highlight facet
  g.moveTo(cx - 8, cy - 4);
  g.lineTo(cx, cy - 20);
  g.lineTo(cx - 2, cy - 4);
  g.closePath();
  g.fill({ color: 0xb8f4ff, alpha: 0.3 });
}

function drawStarIcon(g: Graphics, cx: number, cy: number): void {
  g.star(cx, cy, 5, 20, 9, -Math.PI / 2);
  g.fill({ color: 0xffd030 });
  // Inner highlight
  g.star(cx - 2, cy - 2, 5, 12, 5, -Math.PI / 2);
  g.fill({ color: 0xffee80, alpha: 0.25 });
}

// ── Olympus Theme Icons ──────────────────────────────

function drawCoin(g: Graphics, cx: number, cy: number): void {
  // Outer coin
  g.circle(cx, cy, 17);
  g.fill({ color: 0xd4a040 });
  // Inner ring
  g.circle(cx, cy, 13);
  g.stroke({ width: 1.5, color: 0xb08030, alpha: 0.6 });
  // Laurel leaves
  g.ellipse(cx - 10, cy - 2, 3, 7);
  g.fill({ color: 0xc89838, alpha: 0.4 });
  g.ellipse(cx + 10, cy - 2, 3, 7);
  g.fill({ color: 0xc89838, alpha: 0.4 });
  // Center profile dot
  g.circle(cx, cy, 4);
  g.fill({ color: 0xe8c060 });
  // Highlight
  g.circle(cx - 5, cy - 6, 6);
  g.fill({ color: 0xf0d870, alpha: 0.25 });
  // Rim
  g.circle(cx, cy, 17);
  g.stroke({ width: 1.5, color: 0x906820, alpha: 0.5 });
}

function drawAmphora(g: Graphics, cx: number, cy: number): void {
  // Body
  g.moveTo(cx - 4, cy - 16);
  g.quadraticCurveTo(cx - 6, cy - 12, cx - 5, cy - 8);
  g.quadraticCurveTo(cx - 14, cy, cx - 12, cy + 8);
  g.quadraticCurveTo(cx - 10, cy + 16, cx, cy + 18);
  g.quadraticCurveTo(cx + 10, cy + 16, cx + 12, cy + 8);
  g.quadraticCurveTo(cx + 14, cy, cx + 5, cy - 8);
  g.quadraticCurveTo(cx + 6, cy - 12, cx + 4, cy - 16);
  g.closePath();
  g.fill({ color: 0xc06830 });
  // Neck rim
  g.roundRect(cx - 5, cy - 18, 10, 4, 2);
  g.fill({ color: 0xd07838 });
  // Left handle
  g.moveTo(cx - 5, cy - 12);
  g.quadraticCurveTo(cx - 18, cy - 8, cx - 12, cy + 2);
  g.stroke({ width: 2.5, color: 0xa05828 });
  // Right handle
  g.moveTo(cx + 5, cy - 12);
  g.quadraticCurveTo(cx + 18, cy - 8, cx + 12, cy + 2);
  g.stroke({ width: 2.5, color: 0xa05828 });
  // Decorative band
  g.moveTo(cx - 11, cy + 2);
  g.lineTo(cx + 11, cy + 2);
  g.stroke({ width: 1.5, color: 0x804020, alpha: 0.5 });
  // Highlight
  g.ellipse(cx - 4, cy - 4, 4, 8);
  g.fill({ color: 0xe08848, alpha: 0.25 });
}

function drawHelmet(g: Graphics, cx: number, cy: number): void {
  // Dome
  g.arc(cx, cy, 16, Math.PI, 0);
  g.lineTo(cx + 16, cy + 8);
  g.lineTo(cx - 16, cy + 8);
  g.closePath();
  g.fill({ color: 0x909aa0 });
  // Crest
  g.moveTo(cx - 2, cy - 16);
  g.lineTo(cx, cy - 22);
  g.lineTo(cx + 2, cy - 16);
  g.closePath();
  g.fill({ color: 0xc04040 });
  g.moveTo(cx, cy - 22);
  g.quadraticCurveTo(cx + 10, cy - 18, cx + 14, cy - 10);
  g.stroke({ width: 3, color: 0xc04040 });
  // Face opening (T-slit)
  g.moveTo(cx - 7, cy - 2);
  g.lineTo(cx + 7, cy - 2);
  g.stroke({ width: 2, color: 0x404848 });
  g.moveTo(cx, cy - 2);
  g.lineTo(cx, cy + 6);
  g.stroke({ width: 2, color: 0x404848 });
  // Cheek guards
  g.moveTo(cx - 16, cy + 8);
  g.lineTo(cx - 10, cy + 16);
  g.lineTo(cx - 6, cy + 8);
  g.closePath();
  g.fill({ color: 0x808890 });
  g.moveTo(cx + 16, cy + 8);
  g.lineTo(cx + 10, cy + 16);
  g.lineTo(cx + 6, cy + 8);
  g.closePath();
  g.fill({ color: 0x808890 });
  // Metallic highlight
  g.arc(cx - 4, cy - 4, 10, Math.PI + 0.3, -0.3);
  g.stroke({ width: 1, color: 0xc0c8d0, alpha: 0.3 });
}

function drawShield(g: Graphics, cx: number, cy: number): void {
  // Outer shield
  g.circle(cx, cy, 18);
  g.fill({ color: 0xb89030 });
  // Inner ring
  g.circle(cx, cy, 14);
  g.stroke({ width: 2, color: 0x907020 });
  // Central emblem (sun/compass)
  g.star(cx, cy, 8, 7, 3, -Math.PI / 8);
  g.fill({ color: 0xd4a840 });
  // Center boss
  g.circle(cx, cy, 3.5);
  g.fill({ color: 0xe0c060 });
  // Rim highlight
  g.arc(cx, cy, 17, Math.PI + 0.5, -0.5);
  g.stroke({ width: 1.5, color: 0xd8c070, alpha: 0.3 });
  // Rim shadow
  g.arc(cx, cy, 17, 0.5, Math.PI - 0.5);
  g.stroke({ width: 1.5, color: 0x705818, alpha: 0.3 });
  // Outer border
  g.circle(cx, cy, 18);
  g.stroke({ width: 1.5, color: 0x806020, alpha: 0.5 });
}

function drawMedusa(g: Graphics, cx: number, cy: number): void {
  // Snake hair (behind face)
  const snakes: [number, number, number, number][] = [
    [cx - 10, cy - 12, cx - 18, cy - 20],
    [cx - 5, cy - 14, cx - 8, cy - 24],
    [cx, cy - 15, cx + 2, cy - 26],
    [cx + 5, cy - 14, cx + 10, cy - 24],
    [cx + 10, cy - 12, cx + 20, cy - 18],
  ];
  for (const [sx, sy, ex, ey] of snakes) {
    g.moveTo(sx, sy);
    g.quadraticCurveTo((sx + ex) / 2 + 4, (sy + ey) / 2 - 2, ex, ey);
    g.stroke({ width: 2, color: 0x408048 });
    g.circle(ex, ey, 2);
    g.fill({ color: 0x509058 });
  }
  // Face
  g.ellipse(cx, cy + 2, 12, 14);
  g.fill({ color: 0x70a878 });
  // Eyes
  g.ellipse(cx - 4, cy - 2, 2.5, 1.5);
  g.fill({ color: 0xff3030 });
  g.ellipse(cx + 4, cy - 2, 2.5, 1.5);
  g.fill({ color: 0xff3030 });
  // Mouth
  g.moveTo(cx - 4, cy + 6);
  g.quadraticCurveTo(cx, cy + 9, cx + 4, cy + 6);
  g.stroke({ width: 1.5, color: 0x406848 });
  // Cheek shading
  g.ellipse(cx - 6, cy + 2, 3, 4);
  g.fill({ color: 0x88c890, alpha: 0.2 });
}

function drawPegasus(g: Graphics, cx: number, cy: number): void {
  // Wings (behind body)
  g.moveTo(cx - 2, cy - 2);
  g.lineTo(cx - 16, cy - 20);
  g.lineTo(cx - 6, cy - 6);
  g.closePath();
  g.fill({ color: 0x80a8e0, alpha: 0.5 });
  g.moveTo(cx - 2, cy - 2);
  g.lineTo(cx - 10, cy - 22);
  g.lineTo(cx + 2, cy - 8);
  g.closePath();
  g.fill({ color: 0x6090d0, alpha: 0.4 });
  g.moveTo(cx + 4, cy - 2);
  g.lineTo(cx + 18, cy - 18);
  g.lineTo(cx + 8, cy - 6);
  g.closePath();
  g.fill({ color: 0x80a8e0, alpha: 0.5 });
  g.moveTo(cx + 4, cy - 2);
  g.lineTo(cx + 14, cy - 22);
  g.lineTo(cx + 0, cy - 8);
  g.closePath();
  g.fill({ color: 0x6090d0, alpha: 0.4 });
  // Body
  g.ellipse(cx + 2, cy + 4, 12, 8);
  g.fill({ color: 0xd0d8e8 });
  // Head
  g.circle(cx - 10, cy - 4, 6);
  g.fill({ color: 0xc8d0e0 });
  // Neck
  g.moveTo(cx - 6, cy - 1);
  g.lineTo(cx - 5, cy + 0);
  g.stroke({ width: 4, color: 0xc8d0e0 });
  // Eye
  g.circle(cx - 12, cy - 5, 1.2);
  g.fill({ color: 0x304060 });
  // Legs
  g.moveTo(cx - 4, cy + 10);
  g.lineTo(cx - 6, cy + 18);
  g.stroke({ width: 2, color: 0xa0a8b8 });
  g.moveTo(cx + 6, cy + 10);
  g.lineTo(cx + 8, cy + 18);
  g.stroke({ width: 2, color: 0xa0a8b8 });
  // Tail
  g.moveTo(cx + 14, cy + 4);
  g.quadraticCurveTo(cx + 20, cy + 2, cx + 18, cy - 2);
  g.stroke({ width: 1.5, color: 0xa0a8c0 });
  // Highlight
  g.ellipse(cx - 2, cy + 1, 6, 4);
  g.fill({ color: 0xe8eef8, alpha: 0.3 });
}

function drawAthena(g: Graphics, cx: number, cy: number): void {
  // Hair (behind)
  g.moveTo(cx - 10, cy);
  g.quadraticCurveTo(cx - 14, cy + 10, cx - 10, cy + 18);
  g.stroke({ width: 3, color: 0x604020 });
  g.moveTo(cx + 10, cy);
  g.quadraticCurveTo(cx + 14, cy + 10, cx + 10, cy + 18);
  g.stroke({ width: 3, color: 0x604020 });
  // Face
  g.ellipse(cx, cy + 4, 10, 12);
  g.fill({ color: 0xe8d0a8 });
  // Helmet
  g.arc(cx, cy - 4, 12, Math.PI, 0);
  g.lineTo(cx + 12, cy);
  g.lineTo(cx - 12, cy);
  g.closePath();
  g.fill({ color: 0xc89030 });
  // Helmet crest
  g.moveTo(cx - 2, cy - 16);
  g.lineTo(cx, cy - 22);
  g.lineTo(cx + 2, cy - 16);
  g.closePath();
  g.fill({ color: 0xc04040 });
  g.moveTo(cx, cy - 22);
  g.quadraticCurveTo(cx + 8, cy - 18, cx + 12, cy - 12);
  g.stroke({ width: 2.5, color: 0xc04040 });
  // Eyes
  g.circle(cx - 3.5, cy + 2, 1.3);
  g.fill({ color: 0x405030 });
  g.circle(cx + 3.5, cy + 2, 1.3);
  g.fill({ color: 0x405030 });
  // Lips
  g.moveTo(cx - 3, cy + 8);
  g.quadraticCurveTo(cx, cy + 10, cx + 3, cy + 8);
  g.stroke({ width: 1, color: 0xc08070 });
  // Helmet highlight
  g.arc(cx - 4, cy - 6, 8, Math.PI + 0.3, -0.3);
  g.stroke({ width: 1, color: 0xe8c060, alpha: 0.3 });
}

function drawPoseidon(g: Graphics, cx: number, cy: number): void {
  // Water glow
  g.circle(cx, cy - 2, 12);
  g.fill({ color: 0x4090c0, alpha: 0.1 });
  // Staff
  g.moveTo(cx, cy + 18);
  g.lineTo(cx, cy - 10);
  g.stroke({ width: 3, color: 0x4090c0 });
  // Center prong
  g.moveTo(cx - 1, cy - 10);
  g.lineTo(cx, cy - 22);
  g.lineTo(cx + 1, cy - 10);
  g.closePath();
  g.fill({ color: 0x50a8d8 });
  // Left prong
  g.moveTo(cx - 3, cy - 10);
  g.lineTo(cx - 7, cy - 19);
  g.lineTo(cx - 5, cy - 10);
  g.closePath();
  g.fill({ color: 0x50a8d8 });
  // Right prong
  g.moveTo(cx + 3, cy - 10);
  g.lineTo(cx + 7, cy - 19);
  g.lineTo(cx + 5, cy - 10);
  g.closePath();
  g.fill({ color: 0x50a8d8 });
  // Crossbar
  g.moveTo(cx - 6, cy - 10);
  g.lineTo(cx + 6, cy - 10);
  g.stroke({ width: 2, color: 0x3880b0 });
  // Water splash left
  g.moveTo(cx - 14, cy + 12);
  g.quadraticCurveTo(cx - 8, cy + 8, cx - 4, cy + 12);
  g.stroke({ width: 1.5, color: 0x3080b0, alpha: 0.4 });
  // Water splash right
  g.moveTo(cx + 4, cy + 12);
  g.quadraticCurveTo(cx + 8, cy + 8, cx + 14, cy + 12);
  g.stroke({ width: 1.5, color: 0x3080b0, alpha: 0.4 });
  // Prong tips highlight
  g.circle(cx, cy - 21, 1.5);
  g.fill({ color: 0x80d0f0, alpha: 0.6 });
  g.circle(cx - 7, cy - 18, 1.2);
  g.fill({ color: 0x80d0f0, alpha: 0.5 });
  g.circle(cx + 7, cy - 18, 1.2);
  g.fill({ color: 0x80d0f0, alpha: 0.5 });
}

// ── Badge Functions ───────────────────────────────────

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
