import { describe, it, expect } from "vitest";
import { validateGameConfig } from "../validation/game-config-validator.js";
import { ConfigValidationError } from "../errors/config-validation-error.js";

const VALID_CONFIG = {
  id: "test",
  name: "Test Game",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry" },
    { id: "bar", name: "Bar" },
  ],
  reels: [
    ["cherry", "bar", "cherry"],
    ["bar", "cherry", "bar"],
    ["cherry", "bar", "cherry"],
  ],
  paylines: [[1, 1, 1]],
  payouts: [{ symbolId: "cherry", count: 3, multiplier: 10 }],
  betOptions: [10, 50],
  defaultBet: 10,
};

function configWith(overrides: Record<string, unknown>): unknown {
  return { ...VALID_CONFIG, ...overrides };
}

describe("validateGameConfig", () => {
  it("accepts a valid config", () => {
    const result = validateGameConfig(VALID_CONFIG);
    expect(result.id).toBe("test");
  });

  it("rejects non-object input", () => {
    expect(() => validateGameConfig("string")).toThrow(ConfigValidationError);
    expect(() => validateGameConfig(null)).toThrow(ConfigValidationError);
    expect(() => validateGameConfig(42)).toThrow(ConfigValidationError);
  });

  it("rejects empty id", () => {
    expect(() => validateGameConfig(configWith({ id: "" }))).toThrow("'id'");
  });

  it("rejects non-integer rows", () => {
    expect(() => validateGameConfig(configWith({ rows: 2.5 }))).toThrow("'rows'");
  });

  it("rejects empty symbols array", () => {
    expect(() => validateGameConfig(configWith({ symbols: [] }))).toThrow("'symbols'");
  });

  it("rejects duplicate symbol ids", () => {
    const symbols = [
      { id: "cherry", name: "Cherry" },
      { id: "cherry", name: "Cherry 2" },
    ];
    expect(() => validateGameConfig(configWith({ symbols }))).toThrow("Duplicate symbol id");
  });

  it("rejects empty symbol id", () => {
    const symbols = [{ id: "", name: "Empty" }];
    expect(() => validateGameConfig(configWith({ symbols }))).toThrow("non-empty string");
  });

  it("rejects reel strips referencing unknown symbols", () => {
    const reels = [["cherry", "diamond", "bar"], ["bar"], ["cherry"]];
    expect(() => validateGameConfig(configWith({ reels }))).toThrow("unknown symbol 'diamond'");
  });

  it("rejects payline length mismatch with reel count", () => {
    const paylines = [[1, 1]];
    expect(() => validateGameConfig(configWith({ paylines }))).toThrow("must match reel count");
  });

  it("rejects payline row index out of range", () => {
    const paylines = [[5, 5, 5]];
    expect(() => validateGameConfig(configWith({ paylines }))).toThrow("invalid row index");
  });

  it("rejects payout referencing unknown symbol", () => {
    const payouts = [{ symbolId: "diamond", count: 3, multiplier: 10 }];
    expect(() => validateGameConfig(configWith({ payouts }))).toThrow("unknown symbol 'diamond'");
  });

  it("rejects payout count exceeding reel count", () => {
    const payouts = [{ symbolId: "cherry", count: 5, multiplier: 10 }];
    expect(() => validateGameConfig(configWith({ payouts }))).toThrow("exceeds reel count");
  });

  it("rejects non-integer multiplier", () => {
    const payouts = [{ symbolId: "cherry", count: 3, multiplier: 1.5 }];
    expect(() => validateGameConfig(configWith({ payouts }))).toThrow("positive integer");
  });

  it("rejects non-integer bet options", () => {
    expect(() => validateGameConfig(configWith({ betOptions: [5.5] }))).toThrow("positive integer");
  });

  it("rejects defaultBet not in betOptions", () => {
    expect(() => validateGameConfig(configWith({ defaultBet: 999 }))).toThrow(
      "must be one of the values",
    );
  });

  it("accepts config with wild symbols", () => {
    const symbols = [
      { id: "cherry", name: "Cherry" },
      { id: "wild", name: "Wild", wild: true },
    ];
    const reels = [
      ["cherry", "wild", "cherry"],
      ["wild", "cherry", "cherry"],
      ["cherry", "cherry", "wild"],
    ];
    const result = validateGameConfig(
      configWith({ symbols, reels, payouts: [{ symbolId: "cherry", count: 3, multiplier: 10 }] }),
    );
    expect(result.symbols[1]!.wild).toBe(true);
  });

  it("rejects payout referencing a wild symbol", () => {
    const symbols = [
      { id: "cherry", name: "Cherry" },
      { id: "wild", name: "Wild", wild: true },
    ];
    const reels = [["cherry", "wild", "cherry"], ["cherry"], ["cherry"]];
    const payouts = [{ symbolId: "wild", count: 3, multiplier: 10 }];
    expect(() => validateGameConfig(configWith({ symbols, reels, payouts }))).toThrow(
      "wild symbol",
    );
  });

  it("rejects non-boolean wild property", () => {
    const symbols = [{ id: "cherry", name: "Cherry", wild: "yes" }];
    expect(() => validateGameConfig(configWith({ symbols }))).toThrow("wild must be a boolean");
  });

  it("accepts config with scatter symbols and scatter rules", () => {
    const symbols = [
      { id: "cherry", name: "Cherry" },
      { id: "scatter", name: "Scatter", scatter: true },
    ];
    const reels = [
      ["cherry", "scatter", "cherry"],
      ["cherry", "cherry", "scatter"],
      ["scatter", "cherry", "cherry"],
    ];
    const scatterRules = [
      { symbolId: "scatter", count: 3, multiplier: 5, freeSpins: 10 },
    ];
    const result = validateGameConfig(
      configWith({ symbols, reels, scatterRules }),
    );
    expect(result.symbols[1]!.scatter).toBe(true);
    expect(result.scatterRules).toHaveLength(1);
  });

  it("rejects non-boolean scatter property", () => {
    const symbols = [{ id: "cherry", name: "Cherry", scatter: "yes" }];
    expect(() => validateGameConfig(configWith({ symbols }))).toThrow("scatter must be a boolean");
  });

  it("rejects symbol that is both wild and scatter", () => {
    const symbols = [{ id: "x", name: "X", wild: true, scatter: true }];
    expect(() => validateGameConfig(configWith({ symbols }))).toThrow(
      "both wild and scatter",
    );
  });

  it("rejects payline payout referencing a scatter symbol", () => {
    const symbols = [
      { id: "cherry", name: "Cherry" },
      { id: "scatter", name: "Scatter", scatter: true },
    ];
    const reels = [["cherry", "scatter"], ["cherry", "scatter"], ["cherry", "scatter"]];
    const payouts = [{ symbolId: "scatter", count: 3, multiplier: 10 }];
    expect(() => validateGameConfig(configWith({ symbols, reels, payouts }))).toThrow(
      "scatter symbol",
    );
  });

  it("rejects scatterRule referencing a non-scatter symbol", () => {
    const symbols = [
      { id: "cherry", name: "Cherry" },
      { id: "scatter", name: "Scatter", scatter: true },
    ];
    const reels = [["cherry", "scatter"], ["cherry", "scatter"], ["cherry", "scatter"]];
    const scatterRules = [{ symbolId: "cherry", count: 3, multiplier: 5, freeSpins: 0 }];
    expect(() => validateGameConfig(configWith({ symbols, reels, scatterRules }))).toThrow(
      "non-scatter symbol",
    );
  });

  it("accepts config without scatterRules (backward compat)", () => {
    const result = validateGameConfig(VALID_CONFIG);
    expect(result.scatterRules).toBeUndefined();
  });

  it("collects multiple errors at once", () => {
    try {
      validateGameConfig({
        id: "",
        name: "",
        rows: -1,
        symbols: [],
        reels: [],
        paylines: [],
        payouts: [],
        betOptions: [],
        defaultBet: 0,
      });
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as ConfigValidationError).errors.length).toBeGreaterThan(3);
    }
  });
});
