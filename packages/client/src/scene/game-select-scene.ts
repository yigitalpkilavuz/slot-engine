import { Container, Graphics, Text, TextStyle } from "pixi.js";

const CARD_WIDTH = 240;
const CARD_HEIGHT = 160;
const CARD_GAP = 30;
const CARD_COLOR = 0x16213e;
const CARD_HOVER_COLOR = 0x1f3460;
const CARD_CORNER_RADIUS = 12;
const CARD_BORDER_COLOR = 0x3498db;

const TITLE_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 36,
  fontWeight: "bold",
  fill: 0xffffff,
});

const SUBTITLE_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 18,
  fill: 0x95a5a6,
});

const CARD_NAME_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 20,
  fontWeight: "bold",
  fill: 0xffffff,
  align: "center",
  wordWrap: true,
  wordWrapWidth: CARD_WIDTH - 40,
});

export function buildGameSelectScene(
  canvasWidth: number,
  canvasHeight: number,
  games: readonly { readonly id: string; readonly name: string }[],
  onSelect: (gameId: string) => void,
): Container {
  const scene = new Container();

  // Title
  const title = new Text({ text: "SlotEngine", style: TITLE_STYLE });
  title.anchor.set(0.5, 0);
  title.x = canvasWidth / 2;
  title.y = 60;
  scene.addChild(title);

  // Subtitle
  const subtitle = new Text({ text: "Select a Game", style: SUBTITLE_STYLE });
  subtitle.anchor.set(0.5, 0);
  subtitle.x = canvasWidth / 2;
  subtitle.y = 110;
  scene.addChild(subtitle);

  // Game cards
  const totalWidth = games.length * CARD_WIDTH + (games.length - 1) * CARD_GAP;
  const startX = (canvasWidth - totalWidth) / 2;
  const cardsY = (canvasHeight - CARD_HEIGHT) / 2 + 20;

  for (let i = 0; i < games.length; i++) {
    const game = games[i]!;
    const card = createGameCard(game.id, game.name, onSelect);
    card.x = startX + i * (CARD_WIDTH + CARD_GAP);
    card.y = cardsY;
    scene.addChild(card);
  }

  return scene;
}

function createGameCard(
  gameId: string,
  gameName: string,
  onSelect: (gameId: string) => void,
): Container {
  const card = new Container();
  card.eventMode = "static";
  card.cursor = "pointer";

  const bg = new Graphics();
  drawCard(bg, CARD_COLOR, 0.5);
  card.addChild(bg);

  const name = new Text({ text: gameName, style: CARD_NAME_STYLE });
  name.anchor.set(0.5);
  name.x = CARD_WIDTH / 2;
  name.y = CARD_HEIGHT / 2;
  card.addChild(name);

  card.on("pointerover", () => {
    bg.clear();
    drawCard(bg, CARD_HOVER_COLOR, 1);
  });

  card.on("pointerout", () => {
    bg.clear();
    drawCard(bg, CARD_COLOR, 0.5);
  });

  card.on("pointerdown", () => {
    onSelect(gameId);
  });

  return card;
}

function drawCard(bg: Graphics, fillColor: number, borderAlpha: number): void {
  bg.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_CORNER_RADIUS);
  bg.fill({ color: fillColor });
  bg.stroke({ width: 2, color: CARD_BORDER_COLOR, alpha: borderAlpha });
}
