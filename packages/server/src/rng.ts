import { randomInt } from "node:crypto";

export interface RandomNumberGenerator {
  /** Returns a random integer in [min, max) — min inclusive, max exclusive. */
  nextInt(min: number, max: number): number;
}

export class CryptoRng implements RandomNumberGenerator {
  nextInt(min: number, max: number): number {
    return randomInt(min, max);
  }
}
