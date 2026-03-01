#!/usr/bin/env node

import { loadGameConfigs } from "./config-loader.js";
import { runSimulation } from "./simulation-engine.js";
import type { SimulationOptions } from "./simulation-types.js";
import { formatTable, formatJson } from "./table-formatter.js";

const DEFAULT_SPINS = 1_000_000;

interface CliArgs {
  readonly game?: string;
  readonly spins: number;
  readonly seed: number;
  readonly json: boolean;
  readonly bet?: number;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args = argv.slice(2);
  let game: string | undefined;
  let spins = DEFAULT_SPINS;
  let seed = Date.now();
  let json = false;
  let bet: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    switch (arg) {
      case "--game": {
        i++;
        game = args[i];
        if (!game) throw new Error("--game requires a value");
        break;
      }
      case "--spins": {
        i++;
        const val = args[i];
        if (!val) throw new Error("--spins requires a value");
        spins = Number(val);
        if (!Number.isInteger(spins) || spins < 1) {
          throw new Error(`--spins must be a positive integer, got: ${val}`);
        }
        break;
      }
      case "--seed": {
        i++;
        const val = args[i];
        if (!val) throw new Error("--seed requires a value");
        seed = Number(val);
        if (!Number.isFinite(seed)) {
          throw new Error(`--seed must be a finite number, got: ${val}`);
        }
        break;
      }
      case "--bet": {
        i++;
        const val = args[i];
        if (!val) throw new Error("--bet requires a value");
        bet = Number(val);
        if (!Number.isInteger(bet) || bet < 1) {
          throw new Error(`--bet must be a positive integer (cents), got: ${val}`);
        }
        break;
      }
      case "--json":
        json = true;
        break;
      case "--":
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return {
    spins,
    seed,
    json,
    ...(game != null ? { game } : {}),
    ...(bet != null ? { bet } : {}),
  } as CliArgs;
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv);
  const configs = await loadGameConfigs(cliArgs.game);

  if (!cliArgs.json) {
    process.stdout.write(
      `Simulating ${String(configs.length)} game(s), ${cliArgs.spins.toLocaleString("en-US")} spins each...\n\n`,
    );
  }

  const progressFn = (gameId: string, completed: number, total: number): void => {
    const pct = ((completed / total) * 100).toFixed(0);
    process.stdout.write(
      `\r  ${gameId}: ${pct}% (${completed.toLocaleString("en-US")}/${total.toLocaleString("en-US")})`,
    );
  };

  const result = runSimulation({
    configs,
    spins: cliArgs.spins,
    seed: cliArgs.seed,
    ...(cliArgs.bet != null ? { bet: cliArgs.bet } : {}),
    ...(!cliArgs.json ? { onProgress: progressFn } : {}),
  } as SimulationOptions);

  if (!cliArgs.json) {
    process.stdout.write("\r" + " ".repeat(80) + "\r");
  }

  const output = cliArgs.json ? formatJson(result) : formatTable(result);
  console.log(output);
}

main().catch((error: unknown) => {
  console.error("Simulation failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
