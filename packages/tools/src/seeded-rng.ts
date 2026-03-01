import type { RandomNumberGenerator } from "@slot-engine/server";

/**
 * xorshift128 PRNG — fast, deterministic, period 2^128-1.
 * State initialized from a single seed via SplitMix32.
 */
export class SeededRng implements RandomNumberGenerator {
  private x: number;
  private y: number;
  private z: number;
  private w: number;

  constructor(seed: number) {
    this.x = splitmix32(seed);
    this.y = splitmix32(this.x);
    this.z = splitmix32(this.y);
    this.w = splitmix32(this.z);

    if ((this.x | this.y | this.z | this.w) === 0) {
      this.w = 1;
    }
  }

  nextInt(min: number, max: number): number {
    const range = max - min;
    const t = this.x ^ ((this.x << 11) & 0xffffffff);
    this.x = this.y;
    this.y = this.z;
    this.z = this.w;
    this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8));

    const raw = this.w >>> 0;
    return min + (raw % range);
  }
}

function splitmix32(state: number): number {
  state = (state + 0x9e3779b9) | 0;
  state = Math.imul(state ^ (state >>> 16), 0x85ebca6b);
  state = Math.imul(state ^ (state >>> 13), 0xc2b2ae35);
  return (state ^ (state >>> 16)) >>> 0;
}
