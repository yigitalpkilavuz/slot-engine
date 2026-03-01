import type { RandomNumberGenerator } from "@slot-engine/server";

export class FixedRng implements RandomNumberGenerator {
  private index = 0;

  constructor(private readonly values: readonly number[]) {}

  nextInt(min: number, max: number): number {
    const value = this.values[this.index % this.values.length]!;
    this.index++;
    if (value < min || value >= max) {
      throw new Error(
        `FixedRng value ${String(value)} out of range [${String(min)}, ${String(max)})`,
      );
    }
    return value;
  }
}
