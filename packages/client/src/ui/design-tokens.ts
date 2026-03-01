// ═══════════════════════════════════════════════════
//  Design Tokens — Single source of truth for the UI
// ═══════════════════════════════════════════════════

// ── Typography ──────────────────────────────────────

export const FONT_DISPLAY = ["Sora", "DM Sans", "Helvetica Neue", "sans-serif"] as const;
export const FONT_BODY = ["DM Sans", "Helvetica Neue", "sans-serif"] as const;

// ── Color Palette ───────────────────────────────────

// Backgrounds
export const BG_DEEP = 0x08090f;
export const BG_CHARCOAL = 0x0e1117;
export const BG_SURFACE = 0x12161e;
export const BG_ELEVATED = 0x181d28;

// Accent: Champagne Gold
export const GOLD = 0xc8a960;
export const GOLD_BRIGHT = 0xdec47a;
export const GOLD_MUTED = 0x9a834a;

// Silver / Platinum
export const SILVER = 0xa0aab8;
export const SILVER_MUTED = 0x6b7585;

// Readable text
export const CREAM = 0xece4d4;
export const WHITE_SOFT = 0xf5f0e8;

// Status
export const MINT = 0x34d399;
export const CORAL = 0xf06060;
export const VIOLET = 0x8b5cf6;

// Borders & Dividers
export const BORDER_SUBTLE = 0x1e2736;
export const BORDER_MEDIUM = 0x2a3548;

// ── Spacing ─────────────────────────────────────────

export const SPACE_XS = 4;
export const SPACE_SM = 8;
export const SPACE_MD = 16;
export const SPACE_LG = 24;
export const SPACE_XL = 32;
export const SPACE_2XL = 48;

// ── Corner Radii ────────────────────────────────────

export const RADIUS_SM = 8;
export const RADIUS_MD = 12;
export const RADIUS_LG = 16;
export const RADIUS_XL = 20;
export const RADIUS_PILL = 100;

// ── Canvas Design Size ──────────────────────────────

export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

// ── Animation Timings (ms) ──────────────────────────

export const DURATION_FAST = 150;
export const DURATION_NORMAL = 300;
export const DURATION_SLOW = 500;

// ── Easing Functions ────────────────────────────────

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function easeOutBack(t: number): number {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;
}

export function easeOutQuint(t: number): number {
  return 1 - (1 - t) ** 5;
}

// ── Symbol Colors (desaturated, refined) ────────────

export const SYMBOL_COLORS: Record<string, number> = {
  cherry: 0xc93838,
  lemon: 0xd4a620,
  orange: 0xd06020,
  plum: 0x7c3abf,
  bell: 0xd49020,
  bar: 0x1a8f50,
  seven: 0x3060c0,
  strawberry: 0xb0203a,
  watermelon: 0x108060,
  grape: 0x6a30c0,
  banana: 0xd4a830,
  pineapple: 0x9a6020,
  coconut: 0x68625a,
  diamond: 0x20a0b8,
  star: 0xd49020,
  wild: 0xc8a960,
  scatter: 0xd05050,
};

// ── Symbol Labels ───────────────────────────────────

export const SYMBOL_LABELS: Record<string, string> = {
  cherry: "CHERRY",
  lemon: "LEMON",
  orange: "ORANGE",
  plum: "PLUM",
  bell: "BELL",
  bar: "BAR",
  seven: "7",
  strawberry: "STRWB",
  watermelon: "MELON",
  grape: "GRAPE",
  banana: "BANANA",
  pineapple: "PINE",
  coconut: "COCO",
  diamond: "DIAM",
  star: "STAR",
  wild: "WILD",
  scatter: "BONUS",
};

// ── Highlight Colors (for win overlays) ─────────────

export const HIGHLIGHT_COLORS = [
  0xdec47a, // gold
  0x34d399, // mint
  0xf06060, // coral
  0x60a0f0, // soft blue
  0xd07030, // warm orange
] as const;

// ── Utility: Darken a color by a factor ─────────────

export function darkenColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

export function lightenColor(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}
