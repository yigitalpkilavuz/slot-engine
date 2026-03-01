import type { GameConfig } from "../types/game-config.js";
import { ConfigValidationError } from "../errors/config-validation-error.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  const scatterSymbolIds = new Set<string>();
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
        if ("scatter" in sym && typeof sym["scatter"] !== "boolean") {
          errors.push(`symbols[${String(i)}].scatter must be a boolean if provided`);
        }
        if (sym["wild"] === true && sym["scatter"] === true) {
          errors.push(`symbols[${String(i)}] cannot be both wild and scatter`);
        }
        if ("wildMultiplier" in sym) {
          if (
            typeof sym["wildMultiplier"] !== "number" ||
            !Number.isFinite(sym["wildMultiplier"]) ||
            sym["wildMultiplier"] <= 0
          ) {
            errors.push(`symbols[${String(i)}].wildMultiplier must be a finite positive number`);
          } else if (sym["wild"] !== true) {
            errors.push(`symbols[${String(i)}].wildMultiplier is only allowed on wild symbols`);
          }
        }
        if ("expandingWild" in sym) {
          if (typeof sym["expandingWild"] !== "boolean") {
            errors.push(`symbols[${String(i)}].expandingWild must be a boolean`);
          } else if (sym["wild"] !== true) {
            errors.push(`symbols[${String(i)}].expandingWild is only allowed on wild symbols`);
          }
        }
        symbolIds.add(sym["id"]);
        if (sym["wild"] === true) {
          wildSymbolIds.add(sym["id"]);
        }
        if (sym["scatter"] === true) {
          scatterSymbolIds.add(sym["id"]);
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
      if (!Array.isArray(reel) || reel.length === 0) {
        errors.push(`reels[${String(i)}] must be a non-empty array of weighted symbols`);
      } else {
        const reelSymbolIds = new Set<string>();
        for (const [j, entry] of (reel as unknown[]).entries()) {
          if (!isRecord(entry)) {
            errors.push(`reels[${String(i)}][${String(j)}] must be an object with symbolId and weight`);
            continue;
          }
          if (typeof entry["symbolId"] !== "string" || entry["symbolId"].length === 0) {
            errors.push(`reels[${String(i)}][${String(j)}].symbolId must be a non-empty string`);
          } else {
            if (symbolIds.size > 0 && !symbolIds.has(entry["symbolId"])) {
              errors.push(`reels[${String(i)}][${String(j)}] references unknown symbol '${entry["symbolId"]}'`);
            }
            if (reelSymbolIds.has(entry["symbolId"])) {
              errors.push(`reels[${String(i)}] has duplicate symbolId '${entry["symbolId"]}'`);
            }
            reelSymbolIds.add(entry["symbolId"]);
          }
          if (
            typeof entry["weight"] !== "number" ||
            !Number.isInteger(entry["weight"]) ||
            entry["weight"] < 1
          ) {
            errors.push(`reels[${String(i)}][${String(j)}].weight must be a positive integer`);
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
      } else if (scatterSymbolIds.has(payout["symbolId"])) {
        errors.push(`payouts[${String(i)}] references scatter symbol '${payout["symbolId"]}' (scatter symbols use scatterRules)`);
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

  const scatterRules = data["scatterRules"];
  if (scatterRules !== undefined) {
    if (!Array.isArray(scatterRules)) {
      errors.push("'scatterRules' must be an array if provided");
    } else {
      for (const [i, rule] of scatterRules.entries()) {
        if (!isRecord(rule)) {
          errors.push(`scatterRules[${String(i)}] must be an object`);
          continue;
        }
        if (typeof rule["symbolId"] !== "string") {
          errors.push(`scatterRules[${String(i)}].symbolId must be a string`);
        } else if (symbolIds.size > 0 && !symbolIds.has(rule["symbolId"])) {
          errors.push(`scatterRules[${String(i)}] references unknown symbol '${rule["symbolId"]}'`);
        } else if (!scatterSymbolIds.has(rule["symbolId"])) {
          errors.push(`scatterRules[${String(i)}] references non-scatter symbol '${rule["symbolId"]}'`);
        }
        if (
          typeof rule["count"] !== "number" ||
          !Number.isInteger(rule["count"]) ||
          rule["count"] < 1
        ) {
          errors.push(`scatterRules[${String(i)}].count must be a positive integer`);
        }
        if (
          typeof rule["multiplier"] !== "number" ||
          !Number.isInteger(rule["multiplier"]) ||
          rule["multiplier"] < 0
        ) {
          errors.push(`scatterRules[${String(i)}].multiplier must be a non-negative integer`);
        }
        if (
          typeof rule["freeSpins"] !== "number" ||
          !Number.isInteger(rule["freeSpins"]) ||
          rule["freeSpins"] < 0
        ) {
          errors.push(`scatterRules[${String(i)}].freeSpins must be a non-negative integer`);
        }
      }
    }
  }

  if ("cascading" in data && typeof data["cascading"] !== "boolean") {
    errors.push("'cascading' must be a boolean if provided");
  }

  if ("bonusBuyCostMultiplier" in data) {
    if (
      typeof data["bonusBuyCostMultiplier"] !== "number" ||
      !Number.isFinite(data["bonusBuyCostMultiplier"]) ||
      data["bonusBuyCostMultiplier"] <= 0
    ) {
      errors.push("'bonusBuyCostMultiplier' must be a finite positive number");
    } else if (!Array.isArray(scatterRules) || scatterRules.length === 0) {
      errors.push("'bonusBuyCostMultiplier' requires 'scatterRules' to be defined");
    }
  }

  const freeSpinModifiers = data["freeSpinModifiers"];
  if (freeSpinModifiers !== undefined) {
    if (!Array.isArray(freeSpinModifiers)) {
      errors.push("'freeSpinModifiers' must be an array if provided");
    } else {
      if (!Array.isArray(scatterRules) || scatterRules.length === 0) {
        errors.push("'freeSpinModifiers' requires 'scatterRules' to be defined");
      }

      const seenTypes = new Set<string>();
      for (const [i, mod] of freeSpinModifiers.entries()) {
        if (!isRecord(mod)) {
          errors.push(`freeSpinModifiers[${String(i)}] must be an object`);
          continue;
        }

        const modType = mod["type"];
        if (typeof modType !== "string") {
          errors.push(`freeSpinModifiers[${String(i)}].type must be a string`);
          continue;
        }

        if (seenTypes.has(modType)) {
          errors.push(`Duplicate freeSpinModifiers type: '${modType}'`);
          continue;
        }
        seenTypes.add(modType);

        switch (modType) {
          case "stickyWilds":
            if (wildSymbolIds.size === 0) {
              errors.push(`freeSpinModifiers[${String(i)}] (stickyWilds) requires at least one wild symbol`);
            }
            break;
          case "increasingMultiplier":
            if (typeof mod["startMultiplier"] !== "number" || mod["startMultiplier"] < 1) {
              errors.push(`freeSpinModifiers[${String(i)}].startMultiplier must be a number >= 1`);
            }
            if (typeof mod["increment"] !== "number" || mod["increment"] <= 0) {
              errors.push(`freeSpinModifiers[${String(i)}].increment must be a positive number`);
            }
            if ("maxMultiplier" in mod) {
              if (typeof mod["maxMultiplier"] !== "number" || !Number.isFinite(mod["maxMultiplier"])) {
                errors.push(`freeSpinModifiers[${String(i)}].maxMultiplier must be a finite number`);
              } else if (typeof mod["startMultiplier"] === "number" && mod["maxMultiplier"] < mod["startMultiplier"]) {
                errors.push(`freeSpinModifiers[${String(i)}].maxMultiplier must be >= startMultiplier`);
              }
            }
            break;
          case "extraWilds":
            if (typeof mod["count"] !== "number" || !Number.isInteger(mod["count"]) || mod["count"] < 1) {
              errors.push(`freeSpinModifiers[${String(i)}].count must be a positive integer`);
            }
            if (typeof mod["wildSymbolId"] !== "string" || !wildSymbolIds.has(mod["wildSymbolId"])) {
              errors.push(`freeSpinModifiers[${String(i)}].wildSymbolId must reference a wild symbol`);
            }
            break;
          case "symbolUpgrade":
            if (!Array.isArray(mod["upgrades"]) || mod["upgrades"].length === 0) {
              errors.push(`freeSpinModifiers[${String(i)}].upgrades must be a non-empty array`);
            } else {
              for (const [j, upgrade] of (mod["upgrades"] as unknown[]).entries()) {
                if (!isRecord(upgrade)) {
                  errors.push(`freeSpinModifiers[${String(i)}].upgrades[${String(j)}] must be an object`);
                  continue;
                }
                if (typeof upgrade["from"] !== "string" || !symbolIds.has(upgrade["from"])) {
                  errors.push(`freeSpinModifiers[${String(i)}].upgrades[${String(j)}].from must reference a known symbol`);
                }
                if (typeof upgrade["to"] !== "string" || !symbolIds.has(upgrade["to"])) {
                  errors.push(`freeSpinModifiers[${String(i)}].upgrades[${String(j)}].to must reference a known symbol`);
                }
              }
            }
            break;
          default:
            errors.push(`freeSpinModifiers[${String(i)}].type '${modType}' is not a valid modifier type`);
        }
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
