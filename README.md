# SlotEngine

A data-driven, configurable slot machine engine. Define game mechanics entirely through JSON configuration files — reel strips, paylines, payout tables, scatter rules, free spin modifiers, and cascading wins. The server computes all outcomes; the client only visualizes results.

## Architecture

```
packages/
  shared/     Types, interfaces, and config validation
  server/     Fastify API server — spin logic, session management
  client/     PixiJS v8 renderer — reel animations, UI
  tools/      Monte Carlo RTP simulator CLI
```

**Server-authoritative**: The client never computes game results. It sends spin requests to the server and renders the response. Reel strip data is never exposed to the client.

**Integer math for money**: All monetary values are stored in cents (smallest unit). `500` means $5.00. No floating point arithmetic for currency.

## Prerequisites

- Node.js >= 20
- pnpm >= 9

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -w run build

# Start the server (port 3000)
node packages/server/dist/server.js

# Start the client dev server (port 5173)
pnpm --filter @slot-engine/client dev
```

Open http://localhost:5173 in a browser. The client proxies `/api` requests to the server.

## Scripts

| Command | Description |
|---|---|
| `pnpm -w run build` | Build all packages |
| `pnpm -w run test` | Run all tests (Vitest) |
| `pnpm -w run lint` | Lint all packages (ESLint) |
| `pnpm -w run format` | Format code (Prettier) |
| `pnpm -w run format:check` | Check formatting without writing |
| `pnpm -w run simulate-rtp` | Run the RTP simulator |

## Game Configuration

Games are defined as JSON files in `packages/server/configs/`. Each config specifies:

- **symbols** — Symbol definitions with optional `wild`, `scatter`, `expandingWild`, `wildMultiplier` flags
- **reels** — Reel strip arrays (symbol ID sequences per reel)
- **paylines** — Row index arrays defining win evaluation paths
- **payouts** — Symbol match count to multiplier mappings
- **scatterRules** — Scatter symbol thresholds for multiplier payouts and free spin awards
- **freeSpinModifiers** — Optional modifiers active during free spins:
  - `stickyWilds` — Wild symbols persist across free spins
  - `increasingMultiplier` — Payout multiplier increments each spin (with optional `maxMultiplier` cap)
  - `extraWilds` — Random positions converted to wilds
  - `symbolUpgrade` — Symbols replaced with higher-value symbols
- **cascading** — When `true`, winning symbols are removed and new symbols fall in, repeating until no wins remain
- **bonusBuyCostMultiplier** — Enables bonus buy at `bet * multiplier` cost, guaranteeing a scatter trigger
- **betOptions / defaultBet** — Available bet amounts in cents

The server validates all configs at startup using `validateGameConfig()`. Invalid configs prevent the server from starting.

### Example Config Structure

```json
{
  "id": "classic-3x5",
  "name": "Classic 3x5",
  "rows": 3,
  "symbols": [
    { "id": "cherry", "name": "Cherry" },
    { "id": "wild", "name": "Wild", "wild": true },
    { "id": "scatter", "name": "Scatter", "scatter": true }
  ],
  "reels": [["cherry", "wild", "scatter", "cherry", "..."]],
  "paylines": [[1, 1, 1, 1, 1]],
  "payouts": [{ "symbolId": "cherry", "count": 3, "multiplier": 3 }],
  "scatterRules": [{ "symbolId": "scatter", "count": 3, "multiplier": 2, "freeSpins": 8 }],
  "betOptions": [10, 25, 50, 100],
  "defaultBet": 25
}
```

## RTP Simulator

The `@slot-engine/tools` package provides a Monte Carlo simulator for verifying Return-to-Player percentages. It runs the actual `spin()` function against real game configs — no simplified math model.

```bash
# Build first
pnpm -w run build

# Simulate all games (1M spins, random seed)
pnpm -w run simulate-rtp

# Simulate a specific game with fixed seed
pnpm -w run simulate-rtp -- --game classic-3x5 --spins 1000000 --seed 42

# JSON output
pnpm -w run simulate-rtp -- --json
```

**CLI flags:**

| Flag | Default | Description |
|---|---|---|
| `--game <id>` | all | Simulate a single game by ID |
| `--spins <n>` | 1,000,000 | Number of base spins per game |
| `--seed <n>` | `Date.now()` | PRNG seed for reproducibility |
| `--bet <cents>` | game default | Override bet amount |
| `--json` | false | Output as JSON |

**Reported metrics:** RTP (total, base game, free spin), hit frequency, free spin trigger rate, average free spins per trigger, average free spin payout, volatility (standard deviation).

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/games` | List all available games |
| `GET` | `/api/games/:gameId` | Get game config (reel strips excluded) |
| `POST` | `/api/sessions` | Create a new session for a game |
| `GET` | `/api/sessions/:sessionId` | Get session state |
| `POST` | `/api/sessions/:sessionId/spin` | Execute a spin |

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Server | Fastify 5 |
| Client | PixiJS 8 |
| Bundler | Vite 7 |
| Monorepo | pnpm workspaces |
| Testing | Vitest |
| Linting | ESLint + Prettier |

## Project Structure

```
packages/
  shared/
    src/
      types/          Type definitions (symbols, paylines, payouts, spin results)
      validation/     Config validation with detailed error messages
      errors/         Custom error classes
  server/
    configs/          Game JSON files (classic-3x5, fruit-frenzy-4x5, gem-cascade-3x5)
    src/
      routes/         API route handlers
      session/        In-memory session store
      reel-spinner    Random reel position selection
      win-evaluator   Payline matching with wild substitution
      scatter-evaluator  Scatter counting and free spin awards
      cascade-evaluator  Cascading win chains
      free-spin-modifiers  Sticky wilds, multipliers, extra wilds, symbol upgrades
      grid-modifiers  Expanding wilds
      spin            Main spin orchestrator
  client/
    src/
      api/            Server API client
      assets/         Asset loading and registry
      scene/          Game scene, game selection, splash screen
      state/          Client-side game state
      ui/             PixiJS UI components (reels, symbols, HUD, animations)
  tools/
    src/
      cli             CLI entry point and arg parsing
      simulation-engine  Monte Carlo simulation loop
      free-spin-loop  Free spin round orchestration
      metrics-accumulator  Welford's online variance algorithm
      seeded-rng      xorshift128 deterministic PRNG
      config-loader   Game config file loader
      table-formatter Console and JSON output formatting
```

## License

This project is not licensed for public use.
