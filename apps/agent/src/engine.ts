import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@trader/db";
import type { OrderRequest, Signal } from "@trader/shared";
import type { AgentConfig } from "./config.js";
import { evaluateOrder } from "./risk/guardrails.js";
import { Portfolio } from "./portfolio.js";
import { SimulatedMarket } from "./market/simFeed.js";
import { STRATEGIES, type TradingStrategy } from "./strategies/index.js";
import type { BrokerAdapter } from "./execution/types.js";

export interface StepRecords {
  signals: Prisma.SignalCreateManyInput[];
  orders: Prisma.OrderCreateManyInput[];
  trades: Prisma.TradeCreateManyInput[];
  snapshot: Prisma.PortfolioSnapshotCreateManyInput;
  tradeCount: number;
  rejected: number;
}

/**
 * The trading engine. One `step()` performs a full analysis -> signal -> risk
 * -> execution -> ledger cycle for the whole symbol universe, returning the
 * rows to persist. Persistence is separated so backfill can bulk-insert while
 * the live loop writes incrementally.
 */
export class TradingEngine {
  readonly portfolio: Portfolio;
  private readonly market: SimulatedMarket;
  private readonly strategies: TradingStrategy[];
  private dayKey = "";
  private ordersToday = 0;

  constructor(
    private readonly config: AgentConfig,
    private readonly accountId: string,
    private readonly strategyIds: Map<string, string>,
    private readonly broker: BrokerAdapter,
  ) {
    this.portfolio = new Portfolio(config.startingCash);
    this.market = new SimulatedMarket(config.symbols);
    this.strategies = STRATEGIES;
  }

  seedCash(cash: number, realizedPnl: number): void {
    this.portfolio.cash = cash;
    this.portfolio.realizedPnl = realizedPnl;
  }

  loadPosition(symbol: string, qty: number, avgPrice: number): void {
    if (qty > 0) this.portfolio.positions.set(symbol, { qty, avgPrice });
  }

  /** Warm up indicator history without trading (used when resuming). */
  warmup(bars: number): void {
    for (let i = 0; i < bars; i++) this.market.step();
  }

  async step(ts: Date): Promise<StepRecords> {
    const priceOf = (s: string): number => this.market.price(s);
    const dayKey = ts.toISOString().slice(0, 10);
    if (dayKey !== this.dayKey) {
      this.dayKey = dayKey;
      this.ordersToday = 0;
    }

    this.market.step();

    const records: StepRecords = {
      signals: [],
      orders: [],
      trades: [],
      snapshot: {} as Prisma.PortfolioSnapshotCreateManyInput,
      tradeCount: 0,
      rejected: 0,
    };

    for (const strat of this.strategies) {
      const strategyId = this.strategyIds.get(strat.key);
      if (!strategyId) continue;

      for (const symbol of this.config.symbols) {
        const state = this.market.state(symbol);
        if (!state) continue;

        const signal = strat.analyze({
          symbol,
          price: state.price,
          history: state.history,
          sentiment: state.sentiment,
        });
        if (!signal) continue;

        records.signals.push({
          strategyId,
          symbol,
          side: signal.side,
          strength: signal.strength,
          price: signal.price,
          rationale: signal.rationale,
          createdAt: ts,
        });

        const order = this.sizeOrder(signal);
        if (!order) continue;

        const holding = this.portfolio.holding(symbol);
        const decision = evaluateOrder(order, this.config.risk, {
          equity: this.portfolio.equity(priceOf),
          cash: this.portfolio.cash,
          price: state.price,
          currentPositionQty: holding.qty,
          currentPositionValue: Math.abs(holding.qty) * state.price,
          grossExposure: this.portfolio.grossExposure(priceOf),
          ordersToday: this.ordersToday,
        });

        if (!decision.approved || !decision.adjustedQty) {
          records.rejected += 1;
          continue;
        }

        const exec = await this.broker.execute(
          { ...order, qty: decision.adjustedQty },
          state.price,
        );
        if (!exec.accepted || exec.status !== "FILLED") {
          records.rejected += 1;
          continue;
        }

        const orderId = randomUUID();
        records.orders.push({
          id: orderId,
          accountId: this.accountId,
          strategyId,
          symbol,
          side: order.side,
          type: "MARKET",
          qty: exec.filledQty,
          status: exec.status,
          simulated: this.broker.simulated,
          brokerRef: exec.brokerRef ?? null,
          createdAt: ts,
          updatedAt: ts,
        });

        let realized = 0;
        if (order.side === "BUY") {
          this.portfolio.applyBuy(symbol, exec.filledQty, exec.filledPrice, exec.fees);
        } else {
          realized = this.portfolio.applySell(
            symbol,
            exec.filledQty,
            exec.filledPrice,
            exec.fees,
          );
        }

        records.trades.push({
          id: randomUUID(),
          accountId: this.accountId,
          orderId,
          strategyId,
          symbol,
          side: order.side,
          qty: exec.filledQty,
          price: exec.filledPrice,
          notional: exec.filledQty * exec.filledPrice,
          fees: exec.fees,
          realizedPnl: realized,
          executedAt: ts,
          createdAt: ts,
        });
        records.tradeCount += 1;
        this.ordersToday += 1;
      }
    }

    const positionsValue = this.portfolio.positionsValue(priceOf);
    records.snapshot = {
      accountId: this.accountId,
      ts,
      equity: this.portfolio.cash + positionsValue,
      cash: this.portfolio.cash,
      positionsValue,
      realizedPnl: this.portfolio.realizedPnl,
      unrealizedPnl: this.portfolio.unrealized(priceOf),
      createdAt: ts,
    };

    return records;
  }

  private sizeOrder(signal: Signal): OrderRequest | null {
    if (signal.price <= 0) return null;
    if (signal.side === "BUY") {
      const qty = (signal.strength * this.config.risk.maxOrderNotional) / signal.price;
      return qty > 0
        ? { symbol: signal.symbol, side: "BUY", type: "MARKET", qty, strategyKey: signal.strategyKey }
        : null;
    }
    const holding = this.portfolio.holding(signal.symbol);
    const qty = holding.qty * signal.strength;
    return qty > 0
      ? { symbol: signal.symbol, side: "SELL", type: "MARKET", qty, strategyKey: signal.strategyKey }
      : null;
  }

  async persist(steps: StepRecords[]): Promise<void> {
    const signals = steps.flatMap((s) => s.signals);
    const orders = steps.flatMap((s) => s.orders);
    const trades = steps.flatMap((s) => s.trades);
    const snapshots = steps.map((s) => s.snapshot);

    await prisma.$transaction([
      prisma.signal.createMany({ data: signals }),
      prisma.order.createMany({ data: orders }),
      prisma.trade.createMany({ data: trades }),
      prisma.portfolioSnapshot.createMany({ data: snapshots, skipDuplicates: true }),
    ]);
  }

  async syncPositions(): Promise<void> {
    const priceOf = (s: string): number => this.market.price(s);
    const held = [...this.portfolio.positions.entries()];

    await prisma.$transaction(
      held.map(([symbol, h]) =>
        prisma.position.upsert({
          where: { accountId_symbol: { accountId: this.accountId, symbol } },
          create: {
            accountId: this.accountId,
            symbol,
            qty: h.qty,
            avgPrice: h.avgPrice,
            marketPrice: priceOf(symbol),
          },
          update: {
            qty: h.qty,
            avgPrice: h.avgPrice,
            marketPrice: priceOf(symbol),
          },
        }),
      ),
    );

    const heldSymbols = held.map(([symbol]) => symbol);
    await prisma.position.deleteMany({
      where: { accountId: this.accountId, symbol: { notIn: heldSymbols } },
    });
  }

  marketPrice(symbol: string): number {
    return this.market.price(symbol);
  }
}
