import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";
import { DESIGN_WIDTH, DESIGN_HEIGHT, BG_DEEP, GOLD, GOLD_MUTED } from "./design-tokens.js";

// ── Ambient light tints ────────────────────────────
const AMBIENT_CORE = 0x101828;      // cool blue-black center glow
const AMBIENT_WARM = 0x1a1208;      // warm gold undertone
const RAY_COLOR = GOLD_MUTED;
const PARTICLE_COLOR = GOLD;

// ── Particle system config ─────────────────────────
const PARTICLE_COUNT = 35;
const PARTICLE_MIN_SIZE = 1;
const PARTICLE_MAX_SIZE = 2.5;
const PARTICLE_DRIFT_SPEED = 0.15;  // px per frame
const PARTICLE_ALPHA_MIN = 0.04;
const PARTICLE_ALPHA_MAX = 0.18;
const PARTICLE_TWINKLE_SPEED = 0.002;

interface Particle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;      // twinkle phase offset
  driftX: number;     // per-frame drift
  driftY: number;
}

/**
 * Creates the persistent background layer for the entire app.
 * Contains: deep base, ambient radial light, diagonal light rays,
 * and softly drifting gold particles.
 */
export function createSceneBackground(
  ticker: Ticker,
): Container {
  const bg = new Container();

  // ── Layer 1: Deep base fill ──────────────────────
  const base = new Graphics();
  base.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  base.fill({ color: BG_DEEP });
  bg.addChild(base);

  // ── Layer 2: Ambient radial glow (center-top) ────
  // Large soft circle behind where the reels sit
  const ambientCore = new Graphics();
  ambientCore.circle(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.38, 420);
  ambientCore.fill({ color: AMBIENT_CORE, alpha: 0.5 });
  bg.addChild(ambientCore);

  // Wider, dimmer warm halo
  const ambientWarm = new Graphics();
  ambientWarm.circle(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.35, 650);
  ambientWarm.fill({ color: AMBIENT_WARM, alpha: 0.2 });
  bg.addChild(ambientWarm);

  // ── Layer 3: Subtle diagonal light rays ──────────
  // Two faint converging rays from top corners toward center
  const rays = new Graphics();

  // Left ray — narrow triangle from top-left toward center
  rays.moveTo(0, 0);
  rays.lineTo(DESIGN_WIDTH * 0.15, 0);
  rays.lineTo(DESIGN_WIDTH * 0.48, DESIGN_HEIGHT * 0.7);
  rays.lineTo(DESIGN_WIDTH * 0.42, DESIGN_HEIGHT * 0.7);
  rays.closePath();
  rays.fill({ color: RAY_COLOR, alpha: 0.015 });

  // Right ray — mirror
  rays.moveTo(DESIGN_WIDTH, 0);
  rays.lineTo(DESIGN_WIDTH * 0.85, 0);
  rays.lineTo(DESIGN_WIDTH * 0.52, DESIGN_HEIGHT * 0.7);
  rays.lineTo(DESIGN_WIDTH * 0.58, DESIGN_HEIGHT * 0.7);
  rays.closePath();
  rays.fill({ color: RAY_COLOR, alpha: 0.015 });

  // Center ray — very faint vertical
  rays.moveTo(DESIGN_WIDTH * 0.47, 0);
  rays.lineTo(DESIGN_WIDTH * 0.53, 0);
  rays.lineTo(DESIGN_WIDTH * 0.51, DESIGN_HEIGHT * 0.65);
  rays.lineTo(DESIGN_WIDTH * 0.49, DESIGN_HEIGHT * 0.65);
  rays.closePath();
  rays.fill({ color: RAY_COLOR, alpha: 0.012 });

  bg.addChild(rays);

  // ── Layer 4: Top edge highlight (stage lighting) ─
  const topGlow = new Graphics();
  topGlow.rect(0, 0, DESIGN_WIDTH, 3);
  topGlow.fill({ color: GOLD, alpha: 0.06 });
  topGlow.rect(0, 3, DESIGN_WIDTH, 2);
  topGlow.fill({ color: GOLD, alpha: 0.02 });
  bg.addChild(topGlow);

  // ── Layer 5: Bottom vignette (darkens toward HUD) ─
  const bottomVignette = new Graphics();
  bottomVignette.rect(0, DESIGN_HEIGHT * 0.75, DESIGN_WIDTH, DESIGN_HEIGHT * 0.25);
  bottomVignette.fill({ color: 0x000000, alpha: 0.15 });
  bg.addChild(bottomVignette);

  // ── Layer 6: Animated particles ──────────────────
  const particles = initParticles();
  const particleGfx = new Graphics();
  bg.addChild(particleGfx);

  const tickCallback = (): void => {
    updateParticles(particles);
    drawParticles(particleGfx, particles);
  };
  ticker.add(tickCallback);

  return bg;
}

// ── Particle helpers ─────────────────────────────────

function initParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * DESIGN_WIDTH,
      y: Math.random() * DESIGN_HEIGHT * 0.8, // keep above HUD area
      size: PARTICLE_MIN_SIZE + Math.random() * (PARTICLE_MAX_SIZE - PARTICLE_MIN_SIZE),
      alpha: PARTICLE_ALPHA_MIN + Math.random() * (PARTICLE_ALPHA_MAX - PARTICLE_ALPHA_MIN),
      phase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - 0.5) * PARTICLE_DRIFT_SPEED * 2,
      driftY: -PARTICLE_DRIFT_SPEED * (0.3 + Math.random() * 0.7), // float upward
    });
  }
  return particles;
}

function updateParticles(particles: Particle[]): void {
  for (const p of particles) {
    p.x += p.driftX;
    p.y += p.driftY;
    p.phase += PARTICLE_TWINKLE_SPEED;

    // Wrap around edges
    if (p.y < -10) {
      p.y = DESIGN_HEIGHT * 0.8;
      p.x = Math.random() * DESIGN_WIDTH;
    }
    if (p.x < -10) p.x = DESIGN_WIDTH + 10;
    if (p.x > DESIGN_WIDTH + 10) p.x = -10;
  }
}

function drawParticles(gfx: Graphics, particles: Particle[]): void {
  gfx.clear();
  for (const p of particles) {
    // Twinkle: sinusoidal alpha modulation
    const twinkle = 0.5 + 0.5 * Math.sin(performance.now() * PARTICLE_TWINKLE_SPEED + p.phase);
    const alpha = p.alpha * twinkle;

    if (alpha < 0.01) continue;

    // Soft glow halo
    gfx.circle(p.x, p.y, p.size * 3);
    gfx.fill({ color: PARTICLE_COLOR, alpha: alpha * 0.15 });

    // Bright core
    gfx.circle(p.x, p.y, p.size);
    gfx.fill({ color: PARTICLE_COLOR, alpha });
  }
}
