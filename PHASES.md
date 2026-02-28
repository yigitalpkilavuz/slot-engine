# SlotEngine — Development Phases

## Phase 0 — Project Scaffold

Monorepo setup: `pnpm-workspace.yaml`, shared `tsconfig`, ESLint + Prettier config, package structure (`packages/shared`, `packages/server`, `packages/client`).

- [x] Status: Complete

## Phase 1 — Shared Types & Game Config

Core TypeScript types (symbols, reels, paylines, payouts). A JSON config schema for defining a slot game. Config loader + validation.

- [x] Status: Complete

## Phase 2 — Math Engine (Server)

RNG, reel strip spinning, symbol evaluation, payout calculation. Pure logic, no network layer yet. Unit testable.

- [x] Status: Complete

## Phase 3 — Server API

HTTP server, spin endpoint, session/balance management. Consumes the math engine.

- [x] Status: Complete

## Phase 4 — Client Foundation

PixiJS v8 setup, asset loading pipeline, basic rendering loop. No game logic — just a working canvas.

- [x] Status: Complete

## Phase 5 — Client Game UI

Reel rendering, spin animation, win display, bet controls. Connects to server API.

- [x] Status: Complete

## Phase 6 — First Playable Game

Two complete game configs (Classic 3x5, Fruit Frenzy 4x5), game selection screen, paytable overlay, dynamic layout, auto-loading configs from directory. End-to-end playable.

- [x] Status: Complete

## Phase 7 — Wild Symbols

Wild symbol type that substitutes for any other symbol during win evaluation. Config-driven: mark symbols as wild in game config. Update math engine, client rendering (distinct wild visual), and add a game config that uses wilds.

- [ ] Status: Not started

## Phase 8 — Scatter Symbols & Free Spins

Scatter symbols that pay anywhere (not on paylines). Landing N+ scatters triggers a free spins bonus round with a fixed number of spins at the triggering bet. Requires new UI state for free spin mode.

- [ ] Status: Not started

## Phase 9 — Bonus Features

Multiplier wilds, expanding wilds, stacked symbols, cascading wins — each as its own sub-phase.

- [ ] Status: Not started
