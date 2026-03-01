import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  FONT_DISPLAY, FONT_BODY,
  BG_SURFACE, BG_ELEVATED, BORDER_SUBTLE,
  GOLD,
  SILVER, SILVER_MUTED, CREAM,
} from "../ui/design-tokens.js";

const CARD_WIDTH = 360;
const CARD_HEIGHT = 420;
const CARD_GAP = 32;
const CARD_CORNER_RADIUS = 20;

// Tint colors for each card (atmospheric gradient at top)
const CARD_TINTS = [0x3060c0, 0xc93838, 0x20a0b8, 0x6a30c0, 0xd4a620];

const TITLE_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 36,
  fontWeight: "700",
  fill: GOLD,
  letterSpacing: 8,
});

const SUBTITLE_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 13,
  fontWeight: "500",
  fill: SILVER,
  letterSpacing: 4,
});

const CARD_NAME_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 22,
  fontWeight: "700",
  fill: CREAM,
  letterSpacing: 1,
  align: "center",
  wordWrap: true,
  wordWrapWidth: CARD_WIDTH - 60,
});

const PLAY_LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 12,
  fontWeight: "500",
  fill: SILVER_MUTED,
  letterSpacing: 3,
});

export function buildGameSelectScene(
  canvasWidth: number,
  _canvasHeight: number,
  games: readonly { readonly id: string; readonly name: string }[],
  onSelect: (gameId: string) => void,
): Container {
  const scene = new Container();

  // Title
  const title = new Text({ text: "SLOTENGINE", style: TITLE_STYLE });
  title.anchor.set(0.5, 0);
  title.x = canvasWidth / 2;
  title.y = 48;
  scene.addChild(title);

  // Subtitle (no separator — minimalist)
  const subtitle = new Text({ text: "SELECT A GAME", style: SUBTITLE_STYLE });
  subtitle.anchor.set(0.5, 0);
  subtitle.x = canvasWidth / 2;
  subtitle.y = 96;
  scene.addChild(subtitle);

  // Game cards
  const totalWidth = games.length * CARD_WIDTH + (games.length - 1) * CARD_GAP;
  const startX = (canvasWidth - totalWidth) / 2;
  const cardsY = 150;

  for (let i = 0; i < games.length; i++) {
    const game = games[i]!;
    const tint = CARD_TINTS[i % CARD_TINTS.length]!;
    const card = createGameCard(game.id, game.name, tint, onSelect);
    card.x = startX + i * (CARD_WIDTH + CARD_GAP);
    card.y = cardsY;
    scene.addChild(card);
  }

  return scene;
}

function createGameCard(
  gameId: string,
  gameName: string,
  tintColor: number,
  onSelect: (gameId: string) => void,
): Container {
  const card = new Container();
  card.eventMode = "static";
  card.cursor = "pointer";

  // Base background
  const bg = new Graphics();
  drawCardBase(bg, false);
  card.addChild(bg);

  // Tinted gradient at top (atmospheric)
  const tintOverlay = new Graphics();
  tintOverlay.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT * 0.5, CARD_CORNER_RADIUS);
  tintOverlay.fill({ color: tintColor, alpha: 0.08 });
  card.addChild(tintOverlay);

  // Decorative gold line
  const decoLine = new Graphics();
  const lineW = CARD_WIDTH * 0.6;
  const lineX = (CARD_WIDTH - lineW) / 2;
  decoLine.moveTo(lineX, CARD_HEIGHT * 0.62);
  decoLine.lineTo(lineX + lineW, CARD_HEIGHT * 0.62);
  decoLine.stroke({ width: 1, color: GOLD, alpha: 0.2 });
  card.addChild(decoLine);

  // Game name
  const name = new Text({ text: gameName, style: CARD_NAME_STYLE });
  name.anchor.set(0.5);
  name.x = CARD_WIDTH / 2;
  name.y = CARD_HEIGHT * 0.72;
  card.addChild(name);

  // "PLAY" label
  const playLabel = new Text({ text: "PLAY", style: PLAY_LABEL_STYLE });
  playLabel.anchor.set(0.5);
  playLabel.x = CARD_WIDTH / 2;
  playLabel.y = CARD_HEIGHT * 0.88;
  card.addChild(playLabel);

  // Hover: redraw card bg on enter/leave
  card.on("pointerover", () => {
    bg.clear();
    drawCardBase(bg, true);
  });

  card.on("pointerout", () => {
    bg.clear();
    drawCardBase(bg, false);
  });

  card.on("pointerdown", () => {
    onSelect(gameId);
  });

  return card;
}

function drawCardBase(bg: Graphics, hovered: boolean): void {
  const fillColor = hovered ? BG_ELEVATED : BG_SURFACE;
  const borderColor = hovered ? GOLD : BORDER_SUBTLE;
  const borderAlpha = hovered ? 0.6 : 0.4;

  bg.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_CORNER_RADIUS);
  bg.fill({ color: fillColor });
  bg.stroke({ width: 1, color: borderColor, alpha: borderAlpha });
}
