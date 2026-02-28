import { Container, Graphics, Text, TextStyle } from "pixi.js";

const CARD_WIDTH = 260;
const CARD_HEIGHT = 170;
const CARD_GAP = 36;
const CARD_COLOR = 0x111d2e;
const CARD_HOVER_COLOR = 0x162640;
const CARD_CORNER_RADIUS = 14;
const GOLD = 0xd4a846;
const GOLD_BRIGHT = 0xf0c850;

const TITLE_STYLE = new TextStyle({
  fontFamily: ["Cinzel", "Georgia", "serif"],
  fontSize: 42,
  fontWeight: "900",
  fill: GOLD,
  dropShadow: {
    color: GOLD,
    blur: 20,
    alpha: 0.25,
    distance: 0,
  },
});

const SUBTITLE_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 16,
  fontWeight: "500",
  fill: 0x7c8a9a,
  letterSpacing: 2,
});

const CARD_NAME_STYLE = new TextStyle({
  fontFamily: ["Cinzel", "Georgia", "serif"],
  fontSize: 20,
  fontWeight: "700",
  fill: 0xf0e6d3,
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
  const title = new Text({ text: "SLOTENGINE", style: TITLE_STYLE });
  title.anchor.set(0.5, 0);
  title.x = canvasWidth / 2;
  title.y = 55;
  scene.addChild(title);

  // Decorative separator: ─── ◆ ───
  const separator = new Graphics();
  const sepY = 120;
  const sepHalf = 100;
  const cx = canvasWidth / 2;

  // Left line
  separator.moveTo(cx - sepHalf, sepY);
  separator.lineTo(cx - 8, sepY);
  separator.stroke({ width: 1, color: GOLD, alpha: 0.4 });

  // Diamond
  separator.moveTo(cx, sepY - 5);
  separator.lineTo(cx + 5, sepY);
  separator.lineTo(cx, sepY + 5);
  separator.lineTo(cx - 5, sepY);
  separator.closePath();
  separator.fill({ color: GOLD, alpha: 0.6 });

  // Right line
  separator.moveTo(cx + 8, sepY);
  separator.lineTo(cx + sepHalf, sepY);
  separator.stroke({ width: 1, color: GOLD, alpha: 0.4 });

  scene.addChild(separator);

  // Subtitle
  const subtitle = new Text({ text: "SELECT A GAME", style: SUBTITLE_STYLE });
  subtitle.anchor.set(0.5, 0);
  subtitle.x = canvasWidth / 2;
  subtitle.y = 140;
  scene.addChild(subtitle);

  // Game cards
  const totalWidth = games.length * CARD_WIDTH + (games.length - 1) * CARD_GAP;
  const startX = (canvasWidth - totalWidth) / 2;
  const cardsY = (canvasHeight - CARD_HEIGHT) / 2 + 40;

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
  drawCard(bg, CARD_COLOR, 0.3);
  card.addChild(bg);

  const name = new Text({ text: gameName, style: CARD_NAME_STYLE });
  name.anchor.set(0.5);
  name.x = CARD_WIDTH / 2;
  name.y = CARD_HEIGHT / 2;
  card.addChild(name);

  card.on("pointerover", () => {
    bg.clear();
    drawCard(bg, CARD_HOVER_COLOR, 0.8);
  });

  card.on("pointerout", () => {
    bg.clear();
    drawCard(bg, CARD_COLOR, 0.3);
  });

  card.on("pointerdown", () => {
    onSelect(gameId);
  });

  return card;
}

function drawCard(bg: Graphics, fillColor: number, borderAlpha: number): void {
  bg.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_CORNER_RADIUS);
  bg.fill({ color: fillColor });
  bg.stroke({ width: 1.5, color: GOLD_BRIGHT, alpha: borderAlpha });
}
