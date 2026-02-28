import { Container, Graphics, Text, TextStyle } from "pixi.js";

const SYMBOL_SIZE = 80;
const SYMBOL_GAP = 10;
const GRID_COLS = 5;
const GRID_ROWS = 3;
const SYMBOL_COLORS: readonly number[] = [
  0xe74c3c, 0xf39c12, 0xe67e22, 0x9b59b6, 0xf1c40f, 0x2ecc71, 0x3498db,
];

export function buildPlaceholderScene(canvasWidth: number, canvasHeight: number): Container {
  const scene = new Container();

  const gridWidth = GRID_COLS * (SYMBOL_SIZE + SYMBOL_GAP) - SYMBOL_GAP;
  const gridHeight = GRID_ROWS * (SYMBOL_SIZE + SYMBOL_GAP) - SYMBOL_GAP;

  // Dark panel behind the grid
  const background = new Graphics();
  background.roundRect(-20, -20, gridWidth + 40, gridHeight + 40, 12);
  background.fill({ color: 0x16213e });
  scene.addChild(background);

  // 5x3 grid of colored rounded rectangles
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const colorIndex = (row * GRID_COLS + col) % SYMBOL_COLORS.length;
      const color = SYMBOL_COLORS[colorIndex]!;

      const cell = new Graphics();
      cell.roundRect(0, 0, SYMBOL_SIZE, SYMBOL_SIZE, 8);
      cell.fill({ color });

      cell.x = col * (SYMBOL_SIZE + SYMBOL_GAP);
      cell.y = row * (SYMBOL_SIZE + SYMBOL_GAP);

      scene.addChild(cell);
    }
  }

  const titleStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fontWeight: "bold",
    fill: 0xffffff,
  });

  const title = new Text({ text: "SlotEngine", style: titleStyle });
  title.anchor.set(0.5, 0);
  title.x = gridWidth / 2;
  title.y = gridHeight + 30;
  scene.addChild(title);

  scene.x = (canvasWidth - gridWidth) / 2;
  scene.y = (canvasHeight - gridHeight) / 2 - 20;

  return scene;
}
