import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ClientGameConfig } from "../api/api-client.js";
import { getSymbolColor } from "./symbol-cell.js";

const PANEL_WIDTH = 620;
const PANEL_COLOR = 0x1a1a2e;
const OVERLAY_ALPHA = 0.85;
const ROW_HEIGHT = 36;
const SWATCH_SIZE = 24;

const TITLE_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 22,
  fontWeight: "bold",
  fill: 0xffffff,
});

const HEADER_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 14,
  fontWeight: "bold",
  fill: 0x95a5a6,
});

const CELL_TEXT_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 16,
  fill: 0xffffff,
});

const MULTIPLIER_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 16,
  fontWeight: "bold",
  fill: 0xf1c40f,
});

const CLOSE_STYLE = new TextStyle({
  fontFamily: "Arial",
  fontSize: 22,
  fill: 0xe74c3c,
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

  const panelHeight = 80 + config.symbols.length * ROW_HEIGHT + 40;
  const panelX = (canvasWidth - PANEL_WIDTH) / 2;
  const panelY = (canvasHeight - panelHeight) / 2;

  // Panel background
  const panel = new Graphics();
  panel.roundRect(panelX, panelY, PANEL_WIDTH, panelHeight, 12);
  panel.fill({ color: PANEL_COLOR });
  panel.eventMode = "static"; // prevent clicks from reaching backdrop
  overlay.addChild(panel);

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

  // Symbol rows
  for (let i = 0; i < config.symbols.length; i++) {
    const sym = config.symbols[i]!;
    const rowY = headerY + 28 + i * ROW_HEIGHT;

    // Color swatch
    const swatch = new Graphics();
    swatch.roundRect(panelX + 24, rowY - 2, SWATCH_SIZE, SWATCH_SIZE, 4);
    swatch.fill({ color: getSymbolColor(sym.id) });
    overlay.addChild(swatch);

    // Symbol name
    addText(overlay, sym.name, CELL_TEXT_STYLE, colName, rowY);

    // Multipliers
    const payouts = payoutMap.get(sym.id);
    addText(overlay, formatMult(payouts, 3), MULTIPLIER_STYLE, col3, rowY);
    addText(overlay, formatMult(payouts, 4), MULTIPLIER_STYLE, col4, rowY);
    addText(overlay, formatMult(payouts, 5), MULTIPLIER_STYLE, col5, rowY);
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
  return mult !== undefined ? `${String(mult)}x` : "-";
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
