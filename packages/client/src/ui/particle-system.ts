import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";
import { GOLD_BRIGHT, GOLD, CORAL, MINT } from "./design-tokens.js";

const MAX_POOL_SIZE = 200;

type ParticleShape = "circle" | "star" | "diamond";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  shape: ParticleShape;
  active: boolean;
}

export interface ParticlePreset {
  readonly color: number;
  readonly shape: ParticleShape;
  readonly sizeMin: number;
  readonly sizeMax: number;
  readonly speedMin: number;
  readonly speedMax: number;
  readonly lifetime: number;
  readonly gravity: number;
  readonly spread: number;
  readonly direction: number;
}

export const PRESET_SPARKLE: ParticlePreset = {
  color: GOLD_BRIGHT,
  shape: "star",
  sizeMin: 1.5,
  sizeMax: 3.5,
  speedMin: 1,
  speedMax: 3,
  lifetime: 600,
  gravity: 0.02,
  spread: Math.PI,
  direction: -Math.PI / 2,
};

export const PRESET_COIN_SHOWER: ParticlePreset = {
  color: GOLD,
  shape: "diamond",
  sizeMin: 3,
  sizeMax: 6,
  speedMin: 1,
  speedMax: 4,
  lifetime: 1200,
  gravity: 0.12,
  spread: Math.PI * 0.4,
  direction: Math.PI / 2,
};

export const PRESET_BURST: ParticlePreset = {
  color: 0xffffff,
  shape: "circle",
  sizeMin: 1,
  sizeMax: 3,
  speedMin: 4,
  speedMax: 8,
  lifetime: 400,
  gravity: 0,
  spread: Math.PI,
  direction: 0,
};

export const PRESET_CELEBRATION: ParticlePreset = {
  color: GOLD_BRIGHT,
  shape: "star",
  sizeMin: 2,
  sizeMax: 5,
  speedMin: 3,
  speedMax: 7,
  lifetime: 1000,
  gravity: 0.08,
  spread: Math.PI * 0.6,
  direction: -Math.PI / 2,
};

export const PRESET_SCATTER_SPARK: ParticlePreset = {
  color: CORAL,
  shape: "star",
  sizeMin: 1.5,
  sizeMax: 3,
  speedMin: 1.5,
  speedMax: 4,
  lifetime: 500,
  gravity: 0.03,
  spread: Math.PI,
  direction: -Math.PI / 2,
};

export const PRESET_MINT_SPARKLE: ParticlePreset = {
  color: MINT,
  shape: "star",
  sizeMin: 1.5,
  sizeMax: 3.5,
  speedMin: 1,
  speedMax: 3,
  lifetime: 600,
  gravity: 0.02,
  spread: Math.PI,
  direction: -Math.PI / 2,
};

export interface ParticleEmitter {
  readonly container: Container;
  emit: (x: number, y: number, preset: ParticlePreset, count?: number) => void;
  stop: () => void;
  destroy: () => void;
}

export function createParticleEmitter(ticker: Ticker): ParticleEmitter {
  const container = new Container();
  const gfx = new Graphics();
  container.addChild(gfx);

  const pool: Particle[] = [];
  for (let i = 0; i < MAX_POOL_SIZE; i++) {
    pool.push({
      x: 0, y: 0, vx: 0, vy: 0, gravity: 0,
      life: 0, maxLife: 0, size: 0, color: 0,
      shape: "circle", active: false,
    });
  }

  function getInactive(): Particle | undefined {
    for (const p of pool) {
      if (!p.active) return p;
    }
    return undefined;
  }

  function emit(x: number, y: number, preset: ParticlePreset, count = 20): void {
    for (let i = 0; i < count; i++) {
      const p = getInactive();
      if (!p) break;

      const angle = preset.direction + (Math.random() - 0.5) * 2 * preset.spread;
      const speed = preset.speedMin + Math.random() * (preset.speedMax - preset.speedMin);

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = preset.gravity;
      p.size = preset.sizeMin + Math.random() * (preset.sizeMax - preset.sizeMin);
      p.color = preset.color;
      p.shape = preset.shape;
      p.life = preset.lifetime;
      p.maxLife = preset.lifetime;
      p.active = true;
    }
  }

  function draw(): void {
    gfx.clear();
    for (const p of pool) {
      if (!p.active) continue;

      const t = 1 - p.life / p.maxLife;
      const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      if (alpha < 0.01 || p.size < 0.5) continue;

      if (p.shape === "circle") {
        gfx.circle(p.x, p.y, p.size * 2.5);
        gfx.fill({ color: p.color, alpha: alpha * 0.1 });
        gfx.circle(p.x, p.y, p.size);
        gfx.fill({ color: p.color, alpha });
      } else if (p.shape === "star") {
        gfx.circle(p.x, p.y, p.size * 2);
        gfx.fill({ color: p.color, alpha: alpha * 0.12 });
        gfx.star(p.x, p.y, 4, p.size, p.size * 0.4, 0);
        gfx.fill({ color: p.color, alpha });
      } else {
        gfx.circle(p.x, p.y, p.size * 2);
        gfx.fill({ color: p.color, alpha: alpha * 0.1 });
        gfx.star(p.x, p.y, 4, p.size, p.size * 0.3, Math.PI / 4);
        gfx.fill({ color: p.color, alpha });
      }
    }
  }

  const tickCallback = (): void => {
    for (const p of pool) {
      if (!p.active) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= 16.67;
      if (p.life <= 0) {
        p.active = false;
      }
    }
    draw();
  };

  ticker.add(tickCallback);

  function stop(): void {
    for (const p of pool) {
      p.active = false;
    }
    gfx.clear();
  }

  function destroy(): void {
    ticker.remove(tickCallback);
    stop();
    container.destroy({ children: true });
  }

  return { container, emit, stop, destroy };
}
