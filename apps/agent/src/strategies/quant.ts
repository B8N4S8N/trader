import type { Signal } from "@trader/shared";
import { clamp } from "@trader/shared";
import { zScore } from "../market/indicators.js";
import type { StrategyContext, TradingStrategy } from "./types.js";

/**
 * Statistical mean reversion. Computes the z-score of the latest price against
 * a rolling window and fades extremes: deeply negative z-scores are "cheap"
 * (buy), strongly positive are "rich" (sell).
 */
export const quantStrategy: TradingStrategy = {
  key: "quant-mean-reversion",
  name: "Mean Reversion (z-score)",
  type: "QUANT",
  description:
    "Fades statistical extremes using a 40-bar price z-score; buys oversold dislocations and sells overextended ones.",

  analyze(ctx: StrategyContext): Signal | null {
    const z = zScore(ctx.history, 40);
    if (z === null) return null;
    if (Math.abs(z) < 1.2) return null;

    const side = z < 0 ? "BUY" : "SELL";
    return {
      strategyKey: this.key,
      strategyType: this.type,
      symbol: ctx.symbol,
      side,
      strength: clamp((Math.abs(z) - 1.2) / 1.8, 0.15, 1),
      price: ctx.price,
      rationale: `z-score ${z.toFixed(2)} (${side === "BUY" ? "oversold" : "overbought"})`,
    };
  },
};
