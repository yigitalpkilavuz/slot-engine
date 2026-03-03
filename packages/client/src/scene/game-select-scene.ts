import { Container, FederatedWheelEvent, Graphics, Text, TextStyle } from "pixi.js";
import {
  FONT_DISPLAY, FONT_BODY,
  BG_SURFACE, BG_ELEVATED, BG_DEEP, BORDER_SUBTLE,
  GOLD, GOLD_MUTED,
  SILVER, SILVER_MUTED, CREAM, WHITE_SOFT,
  RADIUS_LG,
  SPACE_LG,
  easeOutCubic,
} from "../ui/design-tokens.js";

// ── Grid Layout ───────────────────────────────────────

const GRID_PADDING_X = 64;
const GRID_TOP = 140;
const GRID_BOTTOM_PAD = 32;
const CARD_GAP = 24;
const MAX_COLS = 3;

const CARD_WIDTH = 280;
const CARD_HEIGHT = 340;

const CARD_TINTS = [0x3060c0, 0xc93838, 0x20a0b8, 0x6a30c0, 0xd4a620, 0x30a070, 0xc06030, 0x8050c0];

// ── Scroll ────────────────────────────────────────────

const SCROLL_SPEED = 40;
const SCROLL_FRICTION = 0.92;
const SCROLL_SNAP_THRESHOLD = 0.5;
const FADE_HEIGHT = 48;

// ── Entrance Animation ────────────────────────────────

const ENTRANCE_DURATION_MS = 400;
const ENTRANCE_STAGGER_MS = 80;

// ── Text Styles ───────────────────────────────────────

const TITLE_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 34,
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
  fontSize: 20,
  fontWeight: "700",
  fill: CREAM,
  letterSpacing: 1,
  align: "center",
  wordWrap: true,
  wordWrapWidth: CARD_WIDTH - 48,
});

const PLAY_LABEL_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 11,
  fontWeight: "600",
  fill: SILVER_MUTED,
  letterSpacing: 3,
});

// ── Scene Builder ─────────────────────────────────────

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
  title.y = 44;
  scene.addChild(title);

  // Subtitle
  const subtitle = new Text({ text: "SELECT A GAME", style: SUBTITLE_STYLE });
  subtitle.anchor.set(0.5, 0);
  subtitle.x = canvasWidth / 2;
  subtitle.y = 92;
  scene.addChild(subtitle);

  // Calculate grid layout
  const usableWidth = canvasWidth - GRID_PADDING_X * 2;
  const cols = Math.min(games.length, MAX_COLS, Math.floor((usableWidth + CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
  const rowCount = Math.ceil(games.length / cols);
  const contentHeight = rowCount * CARD_HEIGHT + (rowCount - 1) * CARD_GAP;
  const viewportHeight = canvasHeight - GRID_TOP - GRID_BOTTOM_PAD;
  const scrollable = contentHeight > viewportHeight;
  const maxScroll = Math.max(0, contentHeight - viewportHeight);

  // Scroll viewport: masked area for cards
  const viewport = new Container();
  viewport.y = GRID_TOP;
  scene.addChild(viewport);

  const viewportMask = new Graphics();
  viewportMask.rect(0, 0, canvasWidth, viewportHeight);
  viewportMask.fill({ color: 0xffffff });
  viewport.addChild(viewportMask);
  viewport.mask = viewportMask;

  // Scroll content container (moves up/down inside viewport)
  const scrollContent = new Container();
  viewport.addChild(scrollContent);

  // If content fits, vertically center it
  const contentOffsetY = scrollable ? 0 : (viewportHeight - contentHeight) / 2;

  // Place cards in grid
  const startTime = performance.now();

  for (let i = 0; i < games.length; i++) {
    const game = games[i]!;
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Center each row independently
    const itemsInRow = Math.min(cols, games.length - row * cols);
    const rowWidth = itemsInRow * CARD_WIDTH + (itemsInRow - 1) * CARD_GAP;
    const rowStartX = (canvasWidth - rowWidth) / 2;

    const tint = CARD_TINTS[i % CARD_TINTS.length]!;
    const card = createGameCard(game.id, game.name, tint, onSelect);

    const targetX = rowStartX + col * (CARD_WIDTH + CARD_GAP);
    const targetY = contentOffsetY + row * (CARD_HEIGHT + CARD_GAP);

    card.x = targetX;
    card.y = targetY + SPACE_LG;
    card.alpha = 0;

    const delay = i * ENTRANCE_STAGGER_MS;
    animateEntrance(card, targetX, targetY, startTime, delay);

    scrollContent.addChild(card);
  }

  // ── Scrolling ───────────────────────────────────────

  if (scrollable) {
    let scrollY = 0;
    let velocity = 0;
    let dragging = false;
    let lastPointerY = 0;

    const clampScroll = (v: number): number => Math.max(0, Math.min(maxScroll, v));

    const applyScroll = (): void => {
      scrollContent.y = -scrollY;
      updateFades(scrollY, maxScroll, topFade, bottomFade);
    };

    // Hit area for scroll interaction
    const scrollHitArea = new Graphics();
    scrollHitArea.rect(0, 0, canvasWidth, viewportHeight);
    scrollHitArea.fill({ color: 0x000000, alpha: 0.001 });
    scrollHitArea.eventMode = "static";
    viewport.addChildAt(scrollHitArea, 0);

    // Wheel scroll
    scrollHitArea.on("wheel", (e: FederatedWheelEvent) => {
      scrollY = clampScroll(scrollY + e.deltaY * (SCROLL_SPEED / 40));
      velocity = 0;
      applyScroll();
    });

    // Drag scroll (touch / mouse)
    scrollHitArea.on("pointerdown", (e) => {
      dragging = true;
      lastPointerY = e.global.y;
      velocity = 0;
    });

    scrollHitArea.on("globalpointermove", (e) => {
      if (!dragging) return;
      const dy = e.global.y - lastPointerY;
      lastPointerY = e.global.y;
      velocity = -dy;
      scrollY = clampScroll(scrollY - dy);
      applyScroll();
    });

    const stopDrag = (): void => {
      if (!dragging) return;
      dragging = false;
    };
    scrollHitArea.on("pointerup", stopDrag);
    scrollHitArea.on("pointerupoutside", stopDrag);

    // Momentum: apply velocity each frame via rAF
    const momentumTick = (): void => {
      if (!dragging && Math.abs(velocity) > SCROLL_SNAP_THRESHOLD) {
        scrollY = clampScroll(scrollY + velocity);
        velocity *= SCROLL_FRICTION;
        applyScroll();
      }
      requestAnimationFrame(momentumTick);
    };
    requestAnimationFrame(momentumTick);

    // Edge fade gradients
    const topFade = createEdgeFade(canvasWidth, FADE_HEIGHT, "top");
    topFade.y = 0;
    topFade.alpha = 0;
    viewport.addChild(topFade);

    const bottomFade = createEdgeFade(canvasWidth, FADE_HEIGHT, "bottom");
    bottomFade.y = viewportHeight - FADE_HEIGHT;
    bottomFade.alpha = 1;
    viewport.addChild(bottomFade);
  }

  return scene;
}

// ── Edge Fade Gradients ───────────────────────────────

function createEdgeFade(width: number, height: number, direction: "top" | "bottom"): Graphics {
  const g = new Graphics();
  const steps = 8;

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const alpha = direction === "top" ? (1 - t) * 0.8 : t * 0.8;
    const y = (i / steps) * height;
    const h = height / steps + 1;
    g.rect(0, y, width, h);
    g.fill({ color: BG_DEEP, alpha });
  }

  return g;
}

function updateFades(scrollY: number, maxScroll: number, topFade: Graphics, bottomFade: Graphics): void {
  topFade.alpha = Math.min(1, scrollY / 50);
  bottomFade.alpha = Math.min(1, (maxScroll - scrollY) / 50);
}

// ── Entrance Animation ────────────────────────────────

function animateEntrance(
  card: Container,
  targetX: number,
  targetY: number,
  startTime: number,
  delay: number,
): void {
  const tick = (): void => {
    const elapsed = performance.now() - startTime - delay;
    if (elapsed < 0) {
      requestAnimationFrame(tick);
      return;
    }

    const t = Math.min(elapsed / ENTRANCE_DURATION_MS, 1);
    const eased = easeOutCubic(t);

    card.alpha = eased;
    card.x = targetX;
    card.y = targetY + SPACE_LG * (1 - eased);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      card.alpha = 1;
      card.y = targetY;
    }
  };
  requestAnimationFrame(tick);
}

// ── Game Card ─────────────────────────────────────────

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
  tintOverlay.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT * 0.5, RADIUS_LG);
  tintOverlay.fill({ color: tintColor, alpha: 0.08 });
  card.addChild(tintOverlay);

  // Decorative gold line
  const decoLine = new Graphics();
  const lineW = CARD_WIDTH * 0.55;
  const lineX = (CARD_WIDTH - lineW) / 2;
  decoLine.moveTo(lineX, CARD_HEIGHT * 0.64);
  decoLine.lineTo(lineX + lineW, CARD_HEIGHT * 0.64);
  decoLine.stroke({ width: 1, color: GOLD_MUTED, alpha: 0.2 });
  card.addChild(decoLine);

  // Game name
  const name = new Text({ text: gameName, style: CARD_NAME_STYLE });
  name.anchor.set(0.5);
  name.x = CARD_WIDTH / 2;
  name.y = CARD_HEIGHT * 0.74;
  card.addChild(name);

  // "PLAY" label
  const playLabel = new Text({ text: "PLAY", style: PLAY_LABEL_STYLE });
  playLabel.anchor.set(0.5);
  playLabel.x = CARD_WIDTH / 2;
  playLabel.y = CARD_HEIGHT * 0.89;
  card.addChild(playLabel);

  // Hover interactions
  card.on("pointerover", () => {
    bg.clear();
    drawCardBase(bg, true);
    playLabel.style.fill = WHITE_SOFT;
  });

  card.on("pointerout", () => {
    bg.clear();
    drawCardBase(bg, false);
    playLabel.style.fill = SILVER_MUTED;
  });

  card.on("pointerdown", () => {
    onSelect(gameId);
  });

  return card;
}

function drawCardBase(bg: Graphics, hovered: boolean): void {
  const fillColor = hovered ? BG_ELEVATED : BG_SURFACE;
  const borderColor = hovered ? GOLD : BORDER_SUBTLE;
  const borderAlpha = hovered ? 0.6 : 0.35;

  bg.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, RADIUS_LG);
  bg.fill({ color: fillColor });
  bg.stroke({ width: 1, color: borderColor, alpha: borderAlpha });
}
