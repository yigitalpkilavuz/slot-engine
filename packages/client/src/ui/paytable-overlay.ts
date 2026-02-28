import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ScatterRule } from "@slot-engine/shared";
import type { ClientGameConfig } from "../api/api-client.js";
import { getSymbolColor } from "./symbol-cell.js";

const PANEL_WIDTH = 620;
const PANEL_COLOR = 0x0c1424;
const PANEL_BORDER_COLOR = 0x1a2d45;
const OVERLAY_ALPHA = 0.88;
const ROW_HEIGHT = 36;
const SWATCH_SIZE = 24;
const GOLD = 0xd4a846;
const GOLD_BRIGHT = 0xf0c850;

const TITLE_STYLE = new TextStyle({
  fontFamily: ["Cinzel", "Georgia", "serif"],
  fontSize: 22,
  fontWeight: "700",
  fill: GOLD,
});

const HEADER_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 13,
  fontWeight: "700",
  fill: 0x7c8a9a,
  letterSpacing: 1,
});

const CELL_TEXT_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 16,
  fill: 0xf0e6d3,
});

const MULTIPLIER_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 16,
  fontWeight: "bold",
  fill: GOLD_BRIGHT,
});

const CLOSE_STYLE = new TextStyle({
  fontFamily: ["DM Sans", "Helvetica Neue", "sans-serif"],
  fontSize: 20,
  fill: 0x7c8a9a,
});

export function createPaytableOverlay(
  canvasWidth: number,
  canvasHeight: number,
  config: ClientGameConfig,
  onClose: () => void,
): Container {
  const overlay = new Container();

  // Full-canvas dark backdrop (click to dismiss)
  const backdrop = new Graphics();
  backdrop.rect(0, 0, canvasWidth, canvasHeight);
  backdrop.fill({ color: 0x000000 });
  backdrop.alpha = OVERLAY_ALPHA;
  backdrop.eventMode = "static";
  backdrop.on("pointerdown", onClose);
  overlay.addChild(backdrop);

  // Build payout lookup
  const payoutMap = buildPayoutMap(config);
  const scatterRules = config.scatterRules ?? [];

  const scatterSectionHeight = scatterRules.length > 0 ? 40 + scatterRules.length * ROW_HEIGHT : 0;
  const panelHeight = 80 + config.symbols.length * ROW_HEIGHT + scatterSectionHeight + 40;
  const panelX = (canvasWidth - PANEL_WIDTH) / 2;
  const panelY = (canvasHeight - panelHeight) / 2;

  // Panel background with border
  const panel = new Graphics();
  panel.roundRect(panelX, panelY, PANEL_WIDTH, panelHeight, 14);
  panel.fill({ color: PANEL_COLOR });
  panel.stroke({ width: 1.5, color: PANEL_BORDER_COLOR });
  panel.eventMode = "static"; // prevent clicks from reaching backdrop
  overlay.addChild(panel);

  // Gold accent line at top of panel
  const accent = new Graphics();
  accent.roundRect(panelX + 20, panelY, PANEL_WIDTH - 40, 2, 1);
  accent.fill({ color: GOLD, alpha: 0.4 });
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
  closeBtn.x = panelX + PANEL_WIDTH - 24;
  closeBtn.y = panelY + 24;
  closeBtn.on("pointerdown", onClose);
  overlay.addChild(closeBtn);

  // Column positions
  const colName = panelX + 60;
  const col3 = panelX + 280;
  const col4 = panelX + 390;
  const col5 = panelX + 500;

  // Column headers
  const headerY = panelY + 50;
  addText(overlay, "SYMBOL", HEADER_STYLE, colName, headerY);
  addText(overlay, "\u00d73", HEADER_STYLE, col3, headerY);
  addText(overlay, "\u00d74", HEADER_STYLE, col4, headerY);
  addText(overlay, "\u00d75", HEADER_STYLE, col5, headerY);

  // Subtle header separator
  const headerLine = new Graphics();
  headerLine.moveTo(panelX + 20, headerY + 22);
  headerLine.lineTo(panelX + PANEL_WIDTH - 20, headerY + 22);
  headerLine.stroke({ width: 1, color: 0x1a2d45, alpha: 0.6 });
  overlay.addChild(headerLine);

  // Symbol rows
  for (let i = 0; i < config.symbols.length; i++) {
    const sym = config.symbols[i]!;
    const rowY = headerY + 32 + i * ROW_HEIGHT;

    // Color swatch with border
    const swatch = new Graphics();
    swatch.roundRect(panelX + 24, rowY - 2, SWATCH_SIZE, SWATCH_SIZE, 5);
    swatch.fill({ color: getSymbolColor(sym.id) });
    swatch.stroke({ width: 1, color: 0x1e293b, alpha: 0.5 });
    overlay.addChild(swatch);

    // Symbol name
    addText(overlay, sym.name, CELL_TEXT_STYLE, colName, rowY);

    // Multipliers
    const payouts = payoutMap.get(sym.id);
    addText(overlay, formatMult(payouts, 3), MULTIPLIER_STYLE, col3, rowY);
    addText(overlay, formatMult(payouts, 4), MULTIPLIER_STYLE, col4, rowY);
    addText(overlay, formatMult(payouts, 5), MULTIPLIER_STYLE, col5, rowY);
  }

  // Scatter rules section
  if (scatterRules.length > 0) {
    const scatterY = headerY + 32 + config.symbols.length * ROW_HEIGHT + 10;

    const scatterLine = new Graphics();
    scatterLine.moveTo(panelX + 20, scatterY);
    scatterLine.lineTo(panelX + PANEL_WIDTH - 20, scatterY);
    scatterLine.stroke({ width: 1, color: 0x1a2d45, alpha: 0.6 });
    overlay.addChild(scatterLine);

    addText(overlay, "SCATTER BONUS", HEADER_STYLE, colName, scatterY + 8);

    for (let i = 0; i < scatterRules.length; i++) {
      const rule = scatterRules[i]!;
      const ruleY = scatterY + 30 + i * ROW_HEIGHT;

      addText(overlay, `\u00d7${String(rule.count)} scatters`, CELL_TEXT_STYLE, colName, ruleY);
      addText(overlay, formatScatterReward(rule), MULTIPLIER_STYLE, col3, ruleY);
    }
  }

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
