import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ScatterRule } from "@slot-engine/shared";
import type { ClientGameConfig } from "../api/api-client.js";
import { getSymbolColor } from "./symbol-cell.js";
import {
  FONT_DISPLAY, FONT_BODY,
  BG_SURFACE, BORDER_MEDIUM, BORDER_SUBTLE,
  GOLD, GOLD_BRIGHT, SILVER, SILVER_MUTED, CREAM,
} from "./design-tokens.js";

const PANEL_WIDTH = 720;
const GLASS_ALPHA = 0.92;
const OVERLAY_ALPHA = 0.85;
const ROW_HEIGHT = 40;
const SWATCH_SIZE = 28;

const TITLE_STYLE = new TextStyle({
  fontFamily: [...FONT_DISPLAY],
  fontSize: 24,
  fontWeight: "700",
  fill: GOLD,
});

const HEADER_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 13,
  fontWeight: "700",
  fill: SILVER,
  letterSpacing: 1.5,
});

const CELL_TEXT_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 16,
  fill: CREAM,
});

const MULTIPLIER_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 16,
  fontWeight: "bold",
  fill: GOLD_BRIGHT,
});

const CLOSE_STYLE = new TextStyle({
  fontFamily: [...FONT_BODY],
  fontSize: 22,
  fill: SILVER_MUTED,
});

export function createPaytableOverlay(
  canvasWidth: number,
  canvasHeight: number,
  config: ClientGameConfig,
  onClose: () => void,
): Container {
  const overlay = new Container();

  const backdrop = new Graphics();
  backdrop.rect(0, 0, canvasWidth, canvasHeight);
  backdrop.fill({ color: 0x000000 });
  backdrop.alpha = OVERLAY_ALPHA;
  backdrop.eventMode = "static";
  backdrop.on("pointerdown", onClose);
  overlay.addChild(backdrop);

  const countSet = new Set<number>();
  for (const rule of config.payouts) {
    countSet.add(rule.count);
  }
  const counts = [...countSet].sort((a, b) => a - b);

  const payoutMap = buildPayoutMap(config);
  const scatterRules = config.scatterRules ?? [];

  const scatterSectionHeight = scatterRules.length > 0 ? 40 + scatterRules.length * ROW_HEIGHT : 0;
  const panelHeight = 80 + config.symbols.length * ROW_HEIGHT + scatterSectionHeight + 40;
  const panelX = (canvasWidth - PANEL_WIDTH) / 2;
  const panelY = (canvasHeight - panelHeight) / 2;

  // Glass-morphism panel
  const panel = new Graphics();
  panel.roundRect(panelX, panelY, PANEL_WIDTH, panelHeight, 18);
  panel.fill({ color: BG_SURFACE, alpha: GLASS_ALPHA });
  panel.stroke({ width: 1, color: BORDER_MEDIUM, alpha: 0.4 });
  panel.eventMode = "static";
  overlay.addChild(panel);

  // Inner border for depth
  const innerBorder = new Graphics();
  innerBorder.roundRect(panelX + 1, panelY + 1, PANEL_WIDTH - 2, panelHeight - 2, 17);
  innerBorder.stroke({ width: 1, color: BORDER_SUBTLE, alpha: 0.2 });
  overlay.addChild(innerBorder);

  // Gold accent line at top
  const accent = new Graphics();
  accent.roundRect(panelX + 20, panelY, PANEL_WIDTH - 40, 2, 1);
  accent.fill({ color: GOLD, alpha: 0.3 });
  overlay.addChild(accent);

  // Title
  const title = new Text({ text: "PAYTABLE", style: TITLE_STYLE });
  title.anchor.set(0.5, 0);
  title.x = canvasWidth / 2;
  title.y = panelY + 16;
  overlay.addChild(title);

  // Close button
  const closeBtn = new Container();
  closeBtn.eventMode = "static";
  closeBtn.cursor = "pointer";
  const closeText = new Text({ text: "\u2715", style: CLOSE_STYLE });
  closeText.anchor.set(0.5);
  closeBtn.addChild(closeText);
  closeBtn.x = panelX + PANEL_WIDTH - 28;
  closeBtn.y = panelY + 26;
  closeBtn.on("pointerdown", onClose);
  overlay.addChild(closeBtn);

  // Column positions
  const colName = panelX + 68;
  const colAreaStart = panelX + 300;
  const colAreaEnd = panelX + PANEL_WIDTH - 24;
  const colSpacing = counts.length > 0 ? (colAreaEnd - colAreaStart) / counts.length : 0;

  // Column headers
  const headerY = panelY + 54;
  addText(overlay, "SYMBOL", HEADER_STYLE, colName, headerY);
  for (let i = 0; i < counts.length; i++) {
    addText(overlay, `\u00d7${String(counts[i]!)}`, HEADER_STYLE, colAreaStart + i * colSpacing, headerY);
  }

  const headerLine = new Graphics();
  headerLine.moveTo(panelX + 20, headerY + 24);
  headerLine.lineTo(panelX + PANEL_WIDTH - 20, headerY + 24);
  headerLine.stroke({ width: 1, color: BORDER_SUBTLE, alpha: 0.4 });
  overlay.addChild(headerLine);

  // Symbol rows
  for (let i = 0; i < config.symbols.length; i++) {
    const sym = config.symbols[i]!;
    const rowY = headerY + 36 + i * ROW_HEIGHT;

    // Color swatch with inner glow
    const swatch = new Graphics();
    swatch.roundRect(panelX + 28, rowY - 2, SWATCH_SIZE, SWATCH_SIZE, 6);
    swatch.fill({ color: getSymbolColor(sym.id) });
    swatch.roundRect(panelX + 29, rowY - 1, SWATCH_SIZE - 2, SWATCH_SIZE - 2, 5);
    swatch.stroke({ width: 1, color: getSymbolColor(sym.id), alpha: 0.3 });
    overlay.addChild(swatch);

    addText(overlay, sym.name, CELL_TEXT_STYLE, colName, rowY);

    const payouts = payoutMap.get(sym.id);
    for (let j = 0; j < counts.length; j++) {
      addText(overlay, formatMult(payouts, counts[j]!), MULTIPLIER_STYLE, colAreaStart + j * colSpacing, rowY);
    }
  }

  // Scatter rules section
  if (scatterRules.length > 0) {
    const scatterY = headerY + 36 + config.symbols.length * ROW_HEIGHT + 12;

    const scatterLine = new Graphics();
    scatterLine.moveTo(panelX + 20, scatterY);
    scatterLine.lineTo(panelX + PANEL_WIDTH - 20, scatterY);
    scatterLine.stroke({ width: 1, color: BORDER_SUBTLE, alpha: 0.4 });
    overlay.addChild(scatterLine);

    addText(overlay, "SCATTER BONUS", HEADER_STYLE, colName, scatterY + 10);

    for (let i = 0; i < scatterRules.length; i++) {
      const rule = scatterRules[i]!;
      const ruleY = scatterY + 34 + i * ROW_HEIGHT;

      addText(overlay, `\u00d7${String(rule.count)} scatters`, CELL_TEXT_STYLE, colName, ruleY);
      addText(overlay, formatScatterReward(rule), MULTIPLIER_STYLE, colAreaStart, ruleY);
    }
  }

  // Entry animation: scale + fade
  overlay.alpha = 0;
  overlay.scale.set(0.95);
  overlay.pivot.set(canvasWidth / 2, canvasHeight / 2);
  overlay.x = canvasWidth / 2;
  overlay.y = canvasHeight / 2;

  const startTime = performance.now();
  const animDuration = 250;
  const animate = (): void => {
    const t = Math.min(1, (performance.now() - startTime) / animDuration);
    overlay.alpha = t;
    overlay.scale.set(0.95 + 0.05 * t);
    if (t < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);

  return overlay;
}

function buildPayoutMap(
  config: ClientGameConfig,
): ReadonlyMap<string, ReadonlyMap<number, number>> {
  const map = new Map<string, Map<number, number>>();
  for (const rule of config.payouts) {
    let inner = map.get(rule.symbolId);
    if (!inner) {
      inner = new Map<number, number>();
      map.set(rule.symbolId, inner);
    }
    inner.set(rule.count, rule.multiplier);
  }
  return map;
}

function formatMult(
  payouts: ReadonlyMap<number, number> | undefined,
  count: number,
): string {
  const mult = payouts?.get(count);
  return mult !== undefined ? `${String(mult)}x` : "\u2014";
}

function formatScatterReward(rule: ScatterRule): string {
  const parts: string[] = [];
  if (rule.multiplier > 0) {
    parts.push(`${String(rule.multiplier)}x`);
  }
  if (rule.freeSpins > 0) {
    parts.push(`${String(rule.freeSpins)} free spins`);
  }
  return parts.join(" + ") || "\u2014";
}

function addText(
  parent: Container,
  content: string,
  style: TextStyle,
  x: number,
  y: number,
): void {
  const t = new Text({ text: content, style });
  t.x = x;
  t.y = y;
  parent.addChild(t);
}
