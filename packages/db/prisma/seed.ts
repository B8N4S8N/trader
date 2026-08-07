import { prisma, type StrategyType } from "../src/index.js";

/**
 * Seeds baseline reference data: the paper account and the four strategy rows.
 * The agent also ensures these idempotently on boot, so running this is
 * optional — it simply makes the schema explorable before the agent starts.
 */
const STRATEGIES: {
  key: string;
  name: string;
  type: StrategyType;
  description: string;
}[] = [
  {
    key: "technical-ema-rsi",
    name: "EMA Crossover + RSI",
    type: "TECHNICAL",
    description: "Trend following via EMA(12)/EMA(26) gated by RSI(14).",
  },
  {
    key: "sentiment-news-flow",
    name: "News & Social Sentiment",
    type: "SENTIMENT",
    description: "Trades in the direction of aggregate LLM-scored sentiment.",
  },
  {
    key: "quant-mean-reversion",
    name: "Mean Reversion (z-score)",
    type: "QUANT",
    description: "Fades statistical extremes using a 40-bar price z-score.",
  },
  {
    key: "scalping-micro-momentum",
    name: "Micro-Momentum Scalper",
    type: "SCALPING",
    description: "Short-horizon momentum using SMA(3) vs SMA(8).",
  },
];

async function main(): Promise<void> {
  const account = await prisma.account.upsert({
    where: { name: "Paper Trading" },
    create: { name: "Paper Trading", kind: "PAPER" },
    update: {},
  });

  for (const s of STRATEGIES) {
    await prisma.strategy.upsert({
      where: { key: s.key },
      create: s,
      update: { name: s.name, description: s.description, type: s.type },
    });
  }

  console.log(
    `[seed] ready: account="${account.name}" (${account.id}), strategies=${STRATEGIES.length}`,
  );
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
