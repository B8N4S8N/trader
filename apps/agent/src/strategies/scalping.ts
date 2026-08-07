import type { Signal } from "@trader/shared";
import { clamp } from "@trader/shared";
import { sma } from "../market/indicators.js";
import type { StrategyContext, TradingStrategy } from "./types.js";

/**
 * Short-horizon momentum "scalper". Reacts to very recent micro-trends
 * (SMA3 vs SMA8) and trades small, frequent clips. Deliberately noisier and
 * higher-turnover than the other strategies.
 */
export const scalpingStrategy: TradingStrategy = {
  key: "scalping-micro-momentum",
  name: "Micro-Momentum Scalper",
  type: "SCALPING",
  description:
    "Captures short-term momentum using a 3-bar vs 8-bar SMA relationship; high turnover, small size.",

  analyze(ctx: StrategyContext): Signal | null {
    const fast = sma(ctx.history, 3);
    const slow = sma(ctx.history, 8);
    if (fast === null || slow === null) return null;

    const edge = (fast - slow) / slow;
    if (Math.abs(edge) < 0.0015) return null;

    const side = edge > 0 ? "BUY" : "SELL";
    return {
      strategyKey: this.key,
      strategyType: this.type,
      symbol: ctx.symbol,
      side,
      strength: clamp(Math.abs(edge) * 60, 0.1, 0.6),
      price: ctx.price,
      rationale: `SMA3 ${side === "BUY" ? "above" : "below"} SMA8 by ${(edge * 100).toFixed(2)}%`,
    };
  },
};
