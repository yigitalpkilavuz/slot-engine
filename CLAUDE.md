# SlotEngine

Data-driven, configurable slot game engine. Monorepo managed with pnpm workspaces.

## Tech Stack

- **Language:** Full TypeScript (client + server)
- **Client Rendering:** PixiJS v8
- **Monorepo:** pnpm workspaces
- **Code Style:** ESLint + Prettier
- **Game Configs:** JSON
- **Git:** Conventional Commits

## Coding Rules

- All code and comments MUST be in English
- Minimal comments — only where "why" is genuinely hard to understand
- Production-grade, secure, best-practice code at all times
- No `any` type — use `unknown` + type guards
- No default exports — named exports only
- Barrel exports — clean public API per package, no internal leaks
- Explicit error handling — no silent swallowing, custom error classes
- Immutable game configs — never mutate configs at runtime
- Server-authoritative — client never computes game results, only visualizes
- Integer math for money — all monetary values stored in smallest unit (cents). Never use floats for money (`500` not `5.00`). This avoids IEEE 754 floating point errors (`0.1 + 0.2 !== 0.3`)
- Minimal dependencies — evaluate necessity before adding any new package

## Naming Conventions

| Element                      | Convention         | Example          |
| ---------------------------- | ------------------ | ---------------- |
| Files                        | `kebab-case.ts`    | `reel-strip.ts`  |
| Classes / Interfaces / Types | `PascalCase`       | `ReelStrip`      |
| Functions / Variables        | `camelCase`        | `spinReels`      |
| Constants                    | `UPPER_SNAKE_CASE` | `MAX_REEL_COUNT` |
