import { Container, Graphics, Text, TextStyle } from "pixi.js";

export const CELL_WIDTH = 120;
export const CELL_HEIGHT = 90;
const CELL_CORNER_RADIUS = 10;

const SYMBOL_COLORS: ReadonlyMap<string, number> = new Map([
  ["cherry", 0xdc2626],
  ["lemon", 0xeab308],
  ["orange", 0xea580c],
  ["plum", 0x9333ea],
  ["bell", 0xf59e0b],
  ["bar", 0x16a34a],
  ["seven", 0x2563eb],
  ["strawberry", 0xbe123c],
  ["watermelon", 0x059669],
  ["grape", 0x7c3aed],
  ["banana", 0xfbbf24],
  ["pineapple", 0xb45309],
  ["coconut", 0x78716c],
  ["diamond", 0x06b6d4],
  ["star", 0xf59e0b],
  ["wild", 0xd4a846],
]);

const SYMBOL_LABELS: ReadonlyMap<string, string> = new Map([
  ["cherry", "CHERRY"],
  ["lemon", "LEMON"],
  ["orange", "ORANGE"],
  ["plum", "PLUM"],
  ["bell", "BELL"],
  ["bar", "BAR"],
  ["seven", "7"],
  ["strawberry", "STRW"],
  ["watermelon", "WTML"],
  ["grape", "GRAPE"],
  ["banana", "BANA"],
  ["pineapple", "PINE"],
  ["coconut", "COCO"],
  ["diamond", "\u2666"],
  ["star", "\u2605"],
  ["wild", "WILD"],
]);

const DEFAULT_COLOR = 0x64748b;
const CELL_BORDER_COLOR = 0x1e293b;
const WILD_BORDER_COLOR = 0xf0c850;

const LABEL_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 17,
  fontWeight: "bold",
  fill: 0xffffff,
});

const WILD_LABEL_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 17,
  fontWeight: "bold",
  fill: 0xffffff,
  dropShadow: {
    color: 0xf0c850,
    blur: 6,
    alpha: 0.5,
    distance: 0,
  },
});

export function createSymbolCell(symbolId: string): Container {
  const cell = new Container();

  const bg = new Graphics();
  drawCellBackground(bg, symbolId);
  cell.addChild(bg);

  const isWild = symbolId === "wild";
  const label = new Text({
    text: getLabel(symbolId),
    style: isWild ? WILD_LABEL_STYLE : LABEL_STYLE,
  });
  label.anchor.set(0.5);
  label.x = CELL_WIDTH / 2;
  label.y = CELL_HEIGHT / 2;
  cell.addChild(label);

  return cell;
}

export function updateSymbolCell(cell: Container, symbolId: string): void {
  const bg = cell.children[0] as Graphics;
  const label = cell.children[1] as Text;

  bg.clear();
  drawCellBackground(bg, symbolId);

  const isWild = symbolId === "wild";
  label.style = isWild ? WILD_LABEL_STYLE : LABEL_STYLE;
  label.text = getLabel(symbolId);
}

export function getSymbolColor(symbolId: string): number {
  return SYMBOL_COLORS.get(symbolId) ?? DEFAULT_COLOR;
}

function drawCellBackground(bg: Graphics, symbolId: string): void {
  const color = getSymbolColor(symbolId);
  const isWild = symbolId === "wild";

  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_CORNER_RADIUS);
  bg.fill({ color });
  bg.stroke({
    width: isWild ? 2 : 1,
    color: isWild ? WILD_BORDER_COLOR : CELL_BORDER_COLOR,
    alpha: isWild ? 0.9 : 0.5,
  });
}

function getLabel(symbolId: string): string {
  return SYMBOL_LABELS.get(symbolId) ?? symbolId.toUpperCase();
}
