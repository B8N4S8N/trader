import type { Signal } from "@trader/shared";
import { clamp } from "@trader/shared";
import { ema, rsi } from "../market/indicators.js";
import type { StrategyContext, TradingStrategy } from "./types.js";

/**
 * Trend following via EMA(12)/EMA(26) crossover, gated by RSI(14) so we do not
 * buy into overbought or sell into oversold extremes.
 */
export const technicalStrategy: TradingStrategy = {
  key: "technical-ema-rsi",
  name: "EMA Crossover + RSI",
  type: "TECHNICAL",
  description:
    "Buys when the fast EMA leads the slow EMA (uptrend) while RSI is not overbought; sells on the inverse.",

  analyze(ctx: StrategyContext): Signal | null {
    const fast = ema(ctx.history, 12);
    const slow = ema(ctx.history, 26);
    const momentum = rsi(ctx.history, 14);
    if (fast === null || slow === null || momentum === null) return null;

    const spread = (fast - slow) / slow;
    if (Math.abs(spread) < 0.001) return null;

    if (spread > 0 && momentum < 72) {
      return {
        strategyKey: this.key,
        strategyType: this.type,
        symbol: ctx.symbol,
        side: "BUY",
        strength: clamp(spread * 40, 0.15, 1),
        price: ctx.price,
        rationale: `EMA12>${"EMA26"} by ${(spread * 100).toFixed(2)}%, RSI ${momentum.toFixed(0)}`,
      };
    }
    if (spread < 0 && momentum > 28) {
      return {
        strategyKey: this.key,
        strategyType: this.type,
        symbol: ctx.symbol,
        side: "SELL",
        strength: clamp(-spread * 40, 0.15, 1),
        price: ctx.price,
        rationale: `EMA12<EMA26 by ${(-spread * 100).toFixed(2)}%, RSI ${momentum.toFixed(0)}`,
      };
    }
    return null;
  },
};
