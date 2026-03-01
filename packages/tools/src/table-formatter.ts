import type { SimulationResult } from "./simulation-types.js";

export function formatTable(result: SimulationResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(
    `RTP Simulation Results (${formatNumber(result.spinsPerGame)} spins/game, seed: ${String(result.seed)})`,
  );
  lines.push(`Completed in ${formatDuration(result.elapsedMs)}`);
  lines.push("");

  for (const game of result.games) {
    lines.push(`--- ${game.gameName} (${game.gameId}) ---`);
    lines.push(`  Bet:                        ${String(game.bet)} cents`);
    lines.push(`  Total Wagered:              ${formatNumber(game.totalWagered)} cents`);
    lines.push(`  Total Payout:               ${formatNumber(game.totalPayout)} cents`);
    lines.push("");
    lines.push(`  RTP:                        ${game.rtp.toFixed(2)}%`);
    lines.push(`    Base Game RTP:            ${game.baseGameRtp.toFixed(2)}%`);
    lines.push(`    Free Spin RTP:            ${game.freeSpinRtp.toFixed(2)}%`);
    lines.push("");
    lines.push(`  Hit Frequency:              ${game.hitFrequency.toFixed(2)}%`);
    lines.push(`  Free Spin Trigger Rate:     ${game.freeSpinTriggerRate.toFixed(4)}%`);
    lines.push(`  Avg Free Spins/Trigger:     ${game.avgFreeSpinsPerTrigger.toFixed(1)}`);
    lines.push(`  Avg Free Spin Payout:       ${game.avgFreeSpinPayout.toFixed(1)}x bet`);
    lines.push(`  Volatility (StdDev):        ${game.volatility.toFixed(4)}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function formatJson(result: SimulationResult): string {
  return JSON.stringify(result, null, 2);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
