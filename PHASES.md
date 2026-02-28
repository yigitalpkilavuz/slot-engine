# SlotEngine — Development Phases

## Phase 0 — Project Scaffold

Monorepo setup: `pnpm-workspace.yaml`, shared `tsconfig`, ESLint + Prettier config, package structure (`packages/shared`, `packages/server`, `packages/client`).

- [x] Status: Complete

## Phase 1 — Shared Types & Game Config

Core TypeScript types (symbols, reels, paylines, payouts). A JSON config schema for defining a slot game. Config loader + validation.

- [ ] Status: Not started

## Phase 2 — Math Engine (Server)

RNG, reel strip spinning, symbol evaluation, payout calculation. Pure logic, no network layer yet. Unit testable.

- [ ] Status: Not started

## Phase 3 — Server API

HTTP server, spin endpoint, session/balance management. Consumes the math engine.

- [ ] Status: Not started

## Phase 4 — Client Foundation

PixiJS v8 setup, asset loading pipeline, basic rendering loop. No game logic — just a working canvas.

- [ ] Status: Not started

## Phase 5 — Client Game UI

Reel rendering, spin animation, win display, bet controls. Connects to server API.

- [ ] Status: Not started

## Phase 6 — First Playable Game

One complete slot game config (e.g. classic 5x3), end-to-end working from config to visuals.

- [ ] Status: Not started

## Phase 7+ — Features

Wilds, scatters, free spins, bonus rounds — each as its own sub-phase.

- [ ] Status: Not started
