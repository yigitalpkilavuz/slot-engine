export class ConfigValidationError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(`Invalid game config:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
    this.name = "ConfigValidationError";
    this.errors = errors;
  }
}
