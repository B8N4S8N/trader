import { prisma } from "@trader/db";
import type { StrategyType } from "@trader/shared";

/** Resolve the account to display (prefers the paper account). */
export async function getPrimaryAccount() {
  return (
    (await prisma.account.findFirst({
      where: { kind: "PAPER" },
      orderBy: { createdAt: "asc" },
    })) ?? (await prisma.account.findFirst({ orderBy: { createdAt: "asc" } }))
  );
}

export interface Overview {
  equity: number;
  cash: number;
  positionsValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  baseline: number;
  totalReturn: number;
  updatedAt: string | null;
  tradeCount: number;
  winRate: number;
  openPositions: number;
}

export async function getOverview(accountId: string): Promise<Overview> {
  const [latest, first, tradeCount, sells, wins, openPositions] =
    await Promise.all([
      prisma.portfolioSnapshot.findFirst({
        where: { accountId },
        orderBy: { ts: "desc" },
      }),
      prisma.portfolioSnapshot.findFirst({
        where: { accountId },
        orderBy: { ts: "asc" },
      }),
      prisma.trade.count({ where: { accountId } }),
      prisma.trade.count({ where: { accountId, side: "SELL" } }),
      prisma.trade.count({ where: { accountId, side: "SELL", realizedPnl: { gt: 0 } } }),
      prisma.position.count({ where: { accountId } }),
    ]);

  const equity = latest?.equity ?? 0;
  const baseline = first?.equity ?? equity;
  return {
    equity,
    cash: latest?.cash ?? 0,
    positionsValue: latest?.positionsValue ?? 0,
    realizedPnl: latest?.realizedPnl ?? 0,
    unrealizedPnl: latest?.unrealizedPnl ?? 0,
    baseline,
    totalReturn: baseline > 0 ? (equity - baseline) / baseline : 0,
    updatedAt: latest?.ts.toISOString() ?? null,
    tradeCount,
    winRate: sells > 0 ? wins / sells : 0,
    openPositions,
  };
}

export interface EquityPoint {
  t: string;
  equity: number;
  cash: number;
  pnl: number;
}

export async function getEquitySeries(
  accountId: string,
  limit = 400,
): Promise<EquityPoint[]> {
  const rows = await prisma.portfolioSnapshot.findMany({
    where: { accountId },
    orderBy: { ts: "desc" },
    take: limit,
  });
  const baseline =
    (await prisma.portfolioSnapshot.findFirst({
      where: { accountId },
      orderBy: { ts: "asc" },
    }))?.equity ?? 0;

  return rows
    .reverse()
    .map((r) => ({
      t: r.ts.toISOString(),
      equity: Number(r.equity.toFixed(2)),
      cash: Number(r.cash.toFixed(2)),
      pnl: Number((r.equity - baseline).toFixed(2)),
    }));
}

export interface StrategyPerformance {
  key: string;
  name: string;
  type: StrategyType;
  enabled: boolean;
  trades: number;
  buys: number;
  sells: number;
  realizedPnl: number;
  volume: number;
  lastTradeAt: string | null;
}

export async function getStrategyPerformance(
  accountId: string,
): Promise<StrategyPerformance[]> {
  const strategies = await prisma.strategy.findMany({ orderBy: { type: "asc" } });

  const results = await Promise.all(
    strategies.map(async (s) => {
      const [agg, buys, sells, last] = await Promise.all([
        prisma.trade.aggregate({
          where: { accountId, strategyId: s.id },
          _count: true,
          _sum: { realizedPnl: true, notional: true },
        }),
        prisma.trade.count({ where: { accountId, strategyId: s.id, side: "BUY" } }),
        prisma.trade.count({ where: { accountId, strategyId: s.id, side: "SELL" } }),
        prisma.trade.findFirst({
          where: { accountId, strategyId: s.id },
          orderBy: { executedAt: "desc" },
        }),
      ]);
      return {
        key: s.key,
        name: s.name,
        type: s.type as StrategyType,
        enabled: s.enabled,
        trades: agg._count,
        buys,
        sells,
        realizedPnl: Number((agg._sum.realizedPnl ?? 0).toFixed(2)),
        volume: Number((agg._sum.notional ?? 0).toFixed(2)),
        lastTradeAt: last?.executedAt.toISOString() ?? null,
      };
    }),
  );

  return results.sort((a, b) => b.realizedPnl - a.realizedPnl);
}

export interface PositionRow {
  symbol: string;
  qty: number;
  avgPrice: number;
  marketPrice: number;
  marketValue: number;
  unrealized: number;
  unrealizedPct: number;
}

export async function getPositions(accountId: string): Promise<PositionRow[]> {
  const rows = await prisma.position.findMany({ where: { accountId } });
  return rows
    .map((p) => {
      const marketValue = p.qty * p.marketPrice;
      const cost = p.qty * p.avgPrice;
      const unrealized = marketValue - cost;
      return {
        symbol: p.symbol,
        qty: Number(p.qty.toFixed(4)),
        avgPrice: Number(p.avgPrice.toFixed(2)),
        marketPrice: Number(p.marketPrice.toFixed(2)),
        marketValue: Number(marketValue.toFixed(2)),
        unrealized: Number(unrealized.toFixed(2)),
        unrealizedPct: cost > 0 ? unrealized / cost : 0,
      };
    })
    .sort((a, b) => b.marketValue - a.marketValue);
}

export interface TradeRow {
  id: string;
  executedAt: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  notional: number;
  realizedPnl: number;
  strategyName: string;
  strategyType: StrategyType;
}

export async function getRecentTrades(
  accountId: string,
  limit = 30,
): Promise<TradeRow[]> {
  const rows = await prisma.trade.findMany({
    where: { accountId },
    orderBy: { executedAt: "desc" },
    take: limit,
    include: { strategy: true },
  });
  return rows.map((t) => ({
    id: t.id,
    executedAt: t.executedAt.toISOString(),
    symbol: t.symbol,
    side: t.side as "BUY" | "SELL",
    qty: Number(t.qty.toFixed(4)),
    price: Number(t.price.toFixed(2)),
    notional: Number(t.notional.toFixed(2)),
    realizedPnl: Number(t.realizedPnl.toFixed(2)),
    strategyName: t.strategy?.name ?? "—",
    strategyType: (t.strategy?.type ?? "TECHNICAL") as StrategyType,
  }));
}
