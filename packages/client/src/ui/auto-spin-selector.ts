import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  FONT_BODY, FONT_DISPLAY,
  BG_SURFACE, BG_CHARCOAL, BG_ELEVATED, BORDER_MEDIUM,
  SILVER, WHITE_SOFT, GOLD,
} from "./design-tokens.js";

const OPTION_WIDTH = 140;
const OPTION_HEIGHT = 38;
const OPTION_GAP = 6;
const PADDING = 12;
const CORNER_RADIUS = 14;

const AUTO_SPIN_OPTIONS: readonly { readonly label: string; readonly value: number }[] = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "\u221E", value: Infinity },
];

const HEADER_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 11,
  fontWeight: "700",
  fill: SILVER,
  letterSpacing: 2,
});

const OPTION_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 16,
  fontWeight: "700",
  fill: WHITE_SOFT,
});

const INF_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 22,
  fontWeight: "700",
  fill: GOLD,
});

export function createAutoSpinSelector(
  onSelect: (count: number) => void,
  onClose: () => void,
): Container {
  const popup = new Container();

  const headerHeight = 28;
  const contentHeight = AUTO_SPIN_OPTIONS.length * (OPTION_HEIGHT + OPTION_GAP) - OPTION_GAP;
  const totalHeight = PADDING + headerHeight + contentHeight + PADDING;
  const totalWidth = OPTION_WIDTH + PADDING * 2;

  // Background panel
  const bg = new Graphics();
  bg.roundRect(0, 0, totalWidth, totalHeight, CORNER_RADIUS);
  bg.fill({ color: BG_SURFACE });
  bg.stroke({ width: 1, color: BORDER_MEDIUM });
  popup.addChild(bg);

  // Header
  const header = new Text({ text: "AUTO SPINS", style: HEADER_STYLE });
  header.anchor.set(0.5, 0);
  header.x = totalWidth / 2;
  header.y = PADDING;
  popup.addChild(header);

  // Options
  const optionsStartY = PADDING + headerHeight;
  for (let i = 0; i < AUTO_SPIN_OPTIONS.length; i++) {
    const opt = AUTO_SPIN_OPTIONS[i]!;
    const optContainer = new Container();
    optContainer.y = optionsStartY + i * (OPTION_HEIGHT + OPTION_GAP);
    optContainer.x = PADDING;

    const optBg = new Graphics();
    optBg.roundRect(0, 0, OPTION_WIDTH, OPTION_HEIGHT, 8);
    optBg.fill({ color: BG_CHARCOAL });
    optContainer.addChild(optBg);

    const isInf = opt.value === Infinity;
    const label = new Text({
      text: opt.label,
      style: isInf ? INF_STYLE : OPTION_STYLE,
    });
    label.anchor.set(0.5);
    label.x = OPTION_WIDTH / 2;
    label.y = OPTION_HEIGHT / 2;
    optContainer.addChild(label);

    optContainer.eventMode = "static";
    optContainer.cursor = "pointer";
    optContainer.on("pointerover", () => {
      optBg.clear();
      optBg.roundRect(0, 0, OPTION_WIDTH, OPTION_HEIGHT, 8);
      optBg.fill({ color: BG_ELEVATED });
    });
    optContainer.on("pointerout", () => {
      optBg.clear();
      optBg.roundRect(0, 0, OPTION_WIDTH, OPTION_HEIGHT, 8);
      optBg.fill({ color: BG_CHARCOAL });
    });
    optContainer.on("pointerdown", () => {
      onSelect(opt.value);
    });

    popup.addChild(optContainer);
  }

  // Click-outside backdrop
  const backdrop = new Graphics();
  backdrop.rect(-1000, -1000, 3000, 3000);
  backdrop.fill({ color: 0x000000 });
  backdrop.alpha = 0.01;
  backdrop.eventMode = "static";
  backdrop.on("pointerdown", onClose);
  popup.addChildAt(backdrop, 0);

  // Entry animation: scale + fade
  popup.alpha = 0;
  popup.scale.set(0.95);
  const startTime = performance.now();
  const animDuration = 150;

  const onTick = (): void => {
    const t = Math.min(1, (performance.now() - startTime) / animDuration);
    popup.alpha = t;
    popup.scale.set(0.95 + 0.05 * t);
    if (t >= 1) {
      popup.removeListener("added", startAnim);
    }
  };

  const startAnim = (): void => {
    const ticker = popup.parent;
    if (ticker) {
      // Use RAF-based animation since popup may not have ticker access
      const animate = (): void => {
        onTick();
        if (popup.alpha < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  };

  // Kick off entry animation immediately
  const animate = (): void => {
    onTick();
    if (popup.alpha < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);

  return popup;
}
