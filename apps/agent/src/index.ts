import { prisma } from "@trader/db";
import { formatPct, formatUsd } from "@trader/shared";
import { ensureBootstrap } from "./bootstrap.js";
import { loadConfig } from "./config.js";
import { TradingEngine } from "./engine.js";
import { PaperBroker } from "./execution/paper.js";
import { RobinhoodMcpBroker } from "./execution/robinhoodMcp.js";
import type { BrokerAdapter } from "./execution/types.js";

const BACKFILL_STEPS = 180;

async function audit(event: string, detail: Record<string, unknown> = {}, level = "info") {
  await prisma.auditLog.create({ data: { event, level, detail } });
}

function pickBroker(mode: string, allowLive: boolean, url: string): BrokerAdapter {
  if (mode === "live" && allowLive) return new RobinhoodMcpBroker(url);
  if (mode === "live" && !allowLive) {
    console.warn(
      "[agent] TRADER_MODE=live but TRADER_ALLOW_LIVE!=true -> refusing live, using paper broker.",
    );
  }
  return new PaperBroker();
}

async function main(): Promise<void> {
  const config = loadConfig();
  const backfillOnly = process.argv.includes("--backfill-only");

  console.log(
    `[agent] starting mode=${config.mode} broker=${config.mode === "live" && config.allowLive ? "robinhood-mcp" : "paper"} ` +
      `symbols=${config.symbols.join(",")} tick=${config.tickMs}ms`,
  );

  const broker = pickBroker(config.mode, config.allowLive, config.robinhoodMcpUrl);
  const { accountId, strategyIds } = await ensureBootstrap(config);
  const engine = new TradingEngine(config, accountId, strategyIds, broker);

  await audit("agent_start", {
    mode: config.mode,
    broker: broker.name,
    symbols: config.symbols,
    risk: config.risk,
  });

  const existing = await prisma.portfolioSnapshot.findFirst({
    where: { accountId },
    orderBy: { ts: "desc" },
  });

  if (existing) {
    // Resume from the last known ledger state.
    engine.seedCash(existing.cash, existing.realizedPnl);
    const positions = await prisma.position.findMany({ where: { accountId } });
    for (const p of positions) engine.loadPosition(p.symbol, p.qty, p.avgPrice);
    engine.warmup(60);
    console.log(
      `[agent] resumed: cash=${formatUsd(existing.cash)} positions=${positions.length} equity≈${formatUsd(existing.equity)}`,
    );
  } else {
    // First run: backfill history so the dashboard has an immediate curve.
    console.log(`[agent] no history found -> backfilling ${BACKFILL_STEPS} ticks...`);
    const start = Date.now() - BACKFILL_STEPS * config.tickMs;
    const steps = [];
    for (let i = 0; i < BACKFILL_STEPS; i++) {
      steps.push(await engine.step(new Date(start + i * config.tickMs)));
    }
    await engine.persist(steps);
    await engine.syncPositions();
    const trades = steps.reduce((n, s) => n + s.tradeCount, 0);
    console.log(`[agent] backfill complete: ${trades} trades, ${BACKFILL_STEPS} snapshots.`);
    await audit("backfill_complete", { steps: BACKFILL_STEPS, trades });
  }

  if (backfillOnly) {
    console.log("[agent] --backfill-only set, exiting.");
    await prisma.$disconnect();
    return;
  }

  const startEquity = config.startingCash;
  let running = true;

  const tick = async (): Promise<void> => {
    if (!running) return;
    try {
      const records = await engine.step(new Date());
      await engine.persist([records]);
      await engine.syncPositions();
      const eq = records.snapshot.equity;
      const ret = (eq - startEquity) / startEquity;
      console.log(
        `[tick ${new Date().toISOString()}] equity=${formatUsd(eq)} ` +
          `cash=${formatUsd(records.snapshot.cash)} ret=${formatPct(ret)} ` +
          `trades=${records.tradeCount} rejected=${records.rejected}`,
      );
    } catch (err) {
      console.error("[agent] tick error:", err);
      await audit("tick_error", { message: String(err) }, "error");
    }
    if (running) setTimeout(tick, config.tickMs);
  };

  setTimeout(tick, config.tickMs);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[agent] ${signal} received, shutting down...`);
    running = false;
    await audit("agent_stop", { signal });
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch(async (err) => {
  console.error("[agent] fatal:", err);
  await prisma.$disconnect();
  process.exit(1);
});
