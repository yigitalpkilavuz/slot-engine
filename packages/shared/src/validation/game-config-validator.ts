import type { GameConfig } from "../types/game-config.js";
import { ConfigValidationError } from "../errors/config-validation-error.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

export function validateGameConfig(data: unknown): GameConfig {
  const errors: string[] = [];

  if (!isRecord(data)) {
    throw new ConfigValidationError(["Config must be a JSON object"]);
  }

  if (typeof data["id"] !== "string" || data["id"].length === 0) {
    errors.push("'id' must be a non-empty string");
  }

  if (typeof data["name"] !== "string" || data["name"].length === 0) {
    errors.push("'name' must be a non-empty string");
  }

  if (typeof data["rows"] !== "number" || !Number.isInteger(data["rows"]) || data["rows"] < 1) {
    errors.push("'rows' must be a positive integer");
  }

  const rows = typeof data["rows"] === "number" ? data["rows"] : 0;

  if (!Array.isArray(data["symbols"]) || data["symbols"].length === 0) {
    errors.push("'symbols' must be a non-empty array");
  }

  const symbolIds = new Set<string>();
  const wildSymbolIds = new Set<string>();
  if (Array.isArray(data["symbols"])) {
    for (const [i, sym] of data["symbols"].entries()) {
      if (
        !isRecord(sym) ||
        typeof sym["id"] !== "string" ||
        sym["id"].length === 0 ||
        typeof sym["name"] !== "string" ||
        sym["name"].length === 0
      ) {
        errors.push(`symbols[${String(i)}] must have non-empty string 'id' and 'name'`);
      } else if (symbolIds.has(sym["id"])) {
        errors.push(`Duplicate symbol id: '${sym["id"]}'`);
      } else {
        if ("wild" in sym && typeof sym["wild"] !== "boolean") {
          errors.push(`symbols[${String(i)}].wild must be a boolean if provided`);
        }
        symbolIds.add(sym["id"]);
        if (sym["wild"] === true) {
          wildSymbolIds.add(sym["id"]);
        }
      }
    }
  }

  const reelCount =
    Array.isArray(data["reels"]) && data["reels"].length > 0 ? data["reels"].length : 0;

  if (!Array.isArray(data["reels"]) || data["reels"].length === 0) {
    errors.push("'reels' must be a non-empty array");
  } else {
    for (const [i, reel] of data["reels"].entries()) {
      if (!isStringArray(reel) || reel.length === 0) {
        errors.push(`reels[${String(i)}] must be a non-empty array of symbol IDs`);
      } else if (symbolIds.size > 0) {
        for (const symbolId of reel) {
          if (!symbolIds.has(symbolId)) {
            errors.push(`reels[${String(i)}] references unknown symbol '${symbolId}'`);
            break;
          }
        }
      }
    }
  }

  if (!Array.isArray(data["paylines"]) || data["paylines"].length === 0) {
    errors.push("'paylines' must be a non-empty array");
  } else {
    for (const [i, payline] of data["paylines"].entries()) {
      if (!isNumberArray(payline)) {
        errors.push(`paylines[${String(i)}] must be an array of numbers`);
      } else {
        if (reelCount > 0 && payline.length !== reelCount) {
          errors.push(
            `paylines[${String(i)}] length (${String(payline.length)}) must match reel count (${String(reelCount)})`,
          );
        }
        for (const rowIndex of payline) {
          if (!Number.isInteger(rowIndex) || rowIndex < 0 || (rows > 0 && rowIndex >= rows)) {
            errors.push(
              `paylines[${String(i)}] contains invalid row index ${String(rowIndex)} (rows: ${String(rows)})`,
            );
            break;
          }
        }
      }
    }
  }

  if (!Array.isArray(data["payouts"]) || data["payouts"].length === 0) {
    errors.push("'payouts' must be a non-empty array");
  } else {
    for (const [i, payout] of data["payouts"].entries()) {
      if (!isRecord(payout)) {
        errors.push(`payouts[${String(i)}] must be an object`);
        continue;
      }
      if (typeof payout["symbolId"] !== "string") {
        errors.push(`payouts[${String(i)}].symbolId must be a string`);
      } else if (symbolIds.size > 0 && !symbolIds.has(payout["symbolId"])) {
        errors.push(`payouts[${String(i)}] references unknown symbol '${payout["symbolId"]}'`);
      } else if (wildSymbolIds.has(payout["symbolId"])) {
        errors.push(`payouts[${String(i)}] references wild symbol '${payout["symbolId"]}' (wild symbols cannot have payouts)`);
      }
      if (
        typeof payout["count"] !== "number" ||
        !Number.isInteger(payout["count"]) ||
        payout["count"] < 1
      ) {
        errors.push(`payouts[${String(i)}].count must be a positive integer`);
      } else if (reelCount > 0 && payout["count"] > reelCount) {
        errors.push(
          `payouts[${String(i)}].count (${String(payout["count"])}) exceeds reel count (${String(reelCount)})`,
        );
      }
      if (
        typeof payout["multiplier"] !== "number" ||
        !Number.isInteger(payout["multiplier"]) ||
        payout["multiplier"] < 1
      ) {
        errors.push(`payouts[${String(i)}].multiplier must be a positive integer`);
      }
    }
  }

  if (!isNumberArray(data["betOptions"]) || data["betOptions"].length === 0) {
    errors.push("'betOptions' must be a non-empty array of numbers");
  } else {
    for (const bet of data["betOptions"]) {
      if (!Number.isInteger(bet) || bet < 1) {
        errors.push(`betOptions contains invalid value ${String(bet)} (must be positive integer)`);
        break;
      }
    }
  }

  if (
    typeof data["defaultBet"] !== "number" ||
    !Number.isInteger(data["defaultBet"]) ||
    data["defaultBet"] < 1
  ) {
    errors.push("'defaultBet' must be a positive integer");
  } else if (
    isNumberArray(data["betOptions"]) &&
    !data["betOptions"].includes(data["defaultBet"])
  ) {
    errors.push("'defaultBet' must be one of the values in 'betOptions'");
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }

  return data as unknown as GameConfig;
}
