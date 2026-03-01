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
    [{ symbolId: "cherry", weight: 3 }, { symbolId: "bar", weight: 2 }],
    [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 3 }],
    [{ symbolId: "cherry", weight: 3 }, { symbolId: "bar", weight: 2 }],
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
    const reels = [
      [{ symbolId: "cherry", weight: 1 }, { symbolId: "diamond", weight: 1 }],
      [{ symbolId: "bar", weight: 1 }],
      [{ symbolId: "cherry", weight: 1 }],
    ];
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
      [{ symbolId: "cherry", weight: 3 }, { symbolId: "wild", weight: 1 }],
      [{ symbolId: "cherry", weight: 3 }, { symbolId: "wild", weight: 1 }],
      [{ symbolId: "cherry", weight: 3 }, { symbolId: "wild", weight: 1 }],
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
    const reels = [
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "wild", weight: 1 }],
      [{ symbolId: "cherry", weight: 1 }],
      [{ symbolId: "cherry", weight: 1 }],
    ];
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
      [{ symbolId: "cherry", weight: 3 }, { symbolId: "scatter", weight: 1 }],
      [{ symbolId: "cherry", weight: 3 }, { symbolId: "scatter", weight: 1 }],
      [{ symbolId: "cherry", weight: 3 }, { symbolId: "scatter", weight: 1 }],
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
    const reels = [
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "scatter", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "scatter", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "scatter", weight: 1 }],
    ];
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
    const reels = [
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "scatter", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "scatter", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "scatter", weight: 1 }],
    ];
    const scatterRules = [{ symbolId: "cherry", count: 3, multiplier: 5, freeSpins: 0 }];
    expect(() => validateGameConfig(configWith({ symbols, reels, scatterRules }))).toThrow(
      "non-scatter symbol",
    );
  });

  it("accepts config without scatterRules (backward compat)", () => {
    const result = validateGameConfig(VALID_CONFIG);
    expect(result.scatterRules).toBeUndefined();
  });

  it("rejects NaN wildMultiplier", () => {
    const symbols = [
      { id: "cherry", name: "Cherry" },
      { id: "wild", name: "Wild", wild: true, wildMultiplier: NaN },
    ];
    const reels = [
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "wild", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "wild", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "wild", weight: 1 }],
    ];
    expect(() => validateGameConfig(configWith({ symbols, reels }))).toThrow(
      "finite positive number",
    );
  });

  it("rejects Infinity wildMultiplier", () => {
    const symbols = [
      { id: "cherry", name: "Cherry" },
      { id: "wild", name: "Wild", wild: true, wildMultiplier: Infinity },
    ];
    const reels = [
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "wild", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "wild", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "wild", weight: 1 }],
    ];
    expect(() => validateGameConfig(configWith({ symbols, reels }))).toThrow(
      "finite positive number",
    );
  });

  it("accepts valid wildMultiplier on wild symbol", () => {
    const symbols = [
      { id: "cherry", name: "Cherry" },
      { id: "wild", name: "Wild", wild: true, wildMultiplier: 2 },
    ];
    const reels = [
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "wild", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "wild", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "wild", weight: 1 }],
    ];
    const result = validateGameConfig(configWith({ symbols, reels }));
    expect(result.symbols[1]!.wildMultiplier).toBe(2);
  });

  it("rejects wildMultiplier on non-wild symbol", () => {
    const symbols = [
      { id: "cherry", name: "Cherry", wildMultiplier: 2 },
      { id: "bar", name: "Bar" },
    ];
    expect(() => validateGameConfig(configWith({ symbols }))).toThrow(
      "only allowed on wild symbols",
    );
  });

  // ── Free Spin Modifier validation ──

  const MODIFIER_BASE = {
    ...VALID_CONFIG,
    symbols: [
      { id: "cherry", name: "Cherry" },
      { id: "bar", name: "Bar" },
      { id: "wild", name: "Wild", wild: true },
      { id: "scatter", name: "Scatter", scatter: true },
    ],
    reels: [
      [{ symbolId: "cherry", weight: 3 }, { symbolId: "bar", weight: 2 }, { symbolId: "wild", weight: 1 }, { symbolId: "scatter", weight: 1 }],
      [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 3 }, { symbolId: "wild", weight: 1 }, { symbolId: "scatter", weight: 1 }],
      [{ symbolId: "cherry", weight: 3 }, { symbolId: "bar", weight: 2 }, { symbolId: "wild", weight: 1 }, { symbolId: "scatter", weight: 1 }],
    ],
    scatterRules: [
      { symbolId: "scatter", count: 3, multiplier: 5, freeSpins: 10 },
    ],
  };

  function modifierConfigWith(overrides: Record<string, unknown>): unknown {
    return { ...MODIFIER_BASE, ...overrides };
  }

  it("accepts config with stickyWilds modifier", () => {
    const result = validateGameConfig(
      modifierConfigWith({ freeSpinModifiers: [{ type: "stickyWilds" }] }),
    );
    expect(result.freeSpinModifiers).toHaveLength(1);
  });

  it("accepts config with increasingMultiplier modifier", () => {
    const result = validateGameConfig(
      modifierConfigWith({
        freeSpinModifiers: [{ type: "increasingMultiplier", startMultiplier: 1, increment: 1 }],
      }),
    );
    expect(result.freeSpinModifiers).toHaveLength(1);
  });

  it("accepts config with extraWilds modifier", () => {
    const result = validateGameConfig(
      modifierConfigWith({
        freeSpinModifiers: [{ type: "extraWilds", count: 3, wildSymbolId: "wild" }],
      }),
    );
    expect(result.freeSpinModifiers).toHaveLength(1);
  });

  it("accepts config with symbolUpgrade modifier", () => {
    const result = validateGameConfig(
      modifierConfigWith({
        freeSpinModifiers: [{ type: "symbolUpgrade", upgrades: [{ from: "cherry", to: "bar" }] }],
      }),
    );
    expect(result.freeSpinModifiers).toHaveLength(1);
  });

  it("accepts config with multiple modifiers", () => {
    const result = validateGameConfig(
      modifierConfigWith({
        freeSpinModifiers: [
          { type: "stickyWilds" },
          { type: "increasingMultiplier", startMultiplier: 1, increment: 1 },
        ],
      }),
    );
    expect(result.freeSpinModifiers).toHaveLength(2);
  });

  it("rejects freeSpinModifiers without scatterRules", () => {
    const config = { ...MODIFIER_BASE, freeSpinModifiers: [{ type: "stickyWilds" }] };
    delete (config as Record<string, unknown>)["scatterRules"];
    expect(() => validateGameConfig(config)).toThrow("requires 'scatterRules'");
  });

  it("rejects duplicate modifier types", () => {
    expect(() =>
      validateGameConfig(
        modifierConfigWith({
          freeSpinModifiers: [{ type: "stickyWilds" }, { type: "stickyWilds" }],
        }),
      ),
    ).toThrow("Duplicate freeSpinModifiers type");
  });

  it("rejects unknown modifier type", () => {
    expect(() =>
      validateGameConfig(
        modifierConfigWith({ freeSpinModifiers: [{ type: "unknownType" }] }),
      ),
    ).toThrow("not a valid modifier type");
  });

  it("rejects stickyWilds without wild symbols", () => {
    const noWildConfig = {
      ...MODIFIER_BASE,
      symbols: [
        { id: "cherry", name: "Cherry" },
        { id: "bar", name: "Bar" },
        { id: "scatter", name: "Scatter", scatter: true },
      ],
      reels: [
        [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 2 }, { symbolId: "scatter", weight: 1 }],
        [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 2 }, { symbolId: "scatter", weight: 1 }],
        [{ symbolId: "cherry", weight: 2 }, { symbolId: "bar", weight: 2 }, { symbolId: "scatter", weight: 1 }],
      ],
      freeSpinModifiers: [{ type: "stickyWilds" }],
    };
    expect(() => validateGameConfig(noWildConfig)).toThrow("requires at least one wild symbol");
  });

  it("rejects increasingMultiplier with missing fields", () => {
    expect(() =>
      validateGameConfig(
        modifierConfigWith({ freeSpinModifiers: [{ type: "increasingMultiplier" }] }),
      ),
    ).toThrow("startMultiplier");
  });

  it("rejects extraWilds with invalid wildSymbolId", () => {
    expect(() =>
      validateGameConfig(
        modifierConfigWith({
          freeSpinModifiers: [{ type: "extraWilds", count: 2, wildSymbolId: "cherry" }],
        }),
      ),
    ).toThrow("must reference a wild symbol");
  });

  it("rejects extraWilds with non-integer count", () => {
    expect(() =>
      validateGameConfig(
        modifierConfigWith({
          freeSpinModifiers: [{ type: "extraWilds", count: 1.5, wildSymbolId: "wild" }],
        }),
      ),
    ).toThrow("positive integer");
  });

  it("rejects symbolUpgrade with unknown source symbol", () => {
    expect(() =>
      validateGameConfig(
        modifierConfigWith({
          freeSpinModifiers: [{ type: "symbolUpgrade", upgrades: [{ from: "unknown", to: "bar" }] }],
        }),
      ),
    ).toThrow("must reference a known symbol");
  });

  it("rejects symbolUpgrade with empty upgrades", () => {
    expect(() =>
      validateGameConfig(
        modifierConfigWith({
          freeSpinModifiers: [{ type: "symbolUpgrade", upgrades: [] }],
        }),
      ),
    ).toThrow("non-empty array");
  });

  it("accepts config without freeSpinModifiers (backward compat)", () => {
    const result = validateGameConfig(VALID_CONFIG);
    expect(result.freeSpinModifiers).toBeUndefined();
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
