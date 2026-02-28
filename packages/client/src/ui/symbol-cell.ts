import { Container, Graphics, Text, TextStyle } from "pixi.js";

export const CELL_WIDTH = 120;
export const CELL_HEIGHT = 90;
const CELL_CORNER_RADIUS = 8;

const SYMBOL_COLORS: ReadonlyMap<string, number> = new Map([
  ["cherry", 0xe74c3c],
  ["lemon", 0xf1c40f],
  ["orange", 0xe67e22],
  ["plum", 0x9b59b6],
  ["bell", 0xf39c12],
  ["bar", 0x2ecc71],
  ["seven", 0x3498db],
]);

const SYMBOL_LABELS: ReadonlyMap<string, string> = new Map([
  ["cherry", "CHERRY"],
  ["lemon", "LEMON"],
  ["orange", "ORANGE"],
  ["plum", "PLUM"],
  ["bell", "BELL"],
  ["bar", "BAR"],
  ["seven", "7"],
]);

const DEFAULT_COLOR = 0x7f8c8d;

const LABEL_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 16,
  fontWeight: "bold",
  fill: 0xffffff,
});

export function createSymbolCell(symbolId: string): Container {
  const cell = new Container();

  const bg = new Graphics();
  drawCellBackground(bg, symbolId);
  cell.addChild(bg);

  const label = new Text({ text: getLabel(symbolId), style: LABEL_STYLE });
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
  label.text = getLabel(symbolId);
}

function drawCellBackground(bg: Graphics, symbolId: string): void {
  const color = SYMBOL_COLORS.get(symbolId) ?? DEFAULT_COLOR;
  bg.roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_CORNER_RADIUS);
  bg.fill({ color });
}

function getLabel(symbolId: string): string {
  return SYMBOL_LABELS.get(symbolId) ?? symbolId.toUpperCase();
}
