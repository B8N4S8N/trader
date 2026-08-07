import { prisma } from "@trader/db";
import type { AgentConfig } from "./config.js";
import { STRATEGIES } from "./strategies/index.js";

export interface BootstrapResult {
  accountId: string;
  strategyIds: Map<string, string>;
}

/** Idempotently ensure the account and strategy rows exist. */
export async function ensureBootstrap(config: AgentConfig): Promise<BootstrapResult> {
  const account = await prisma.account.upsert({
    where: { name: config.accountName },
    create: {
      name: config.accountName,
      kind: config.mode === "live" ? "LIVE" : "PAPER",
    },
    update: {},
  });

  const strategyIds = new Map<string, string>();
  for (const strat of STRATEGIES) {
    const row = await prisma.strategy.upsert({
      where: { key: strat.key },
      create: {
        key: strat.key,
        name: strat.name,
        type: strat.type,
        description: strat.description,
      },
      update: { name: strat.name, description: strat.description, type: strat.type },
    });
    strategyIds.set(strat.key, row.id);
  }

  return { accountId: account.id, strategyIds };
}
