import type { Signal } from "@trader/shared";
import { clamp } from "@trader/shared";
import type { StrategyContext, TradingStrategy } from "./types.js";

/**
 * Sentiment-driven strategy. In paper mode it consumes the latent sentiment
 * score from the simulated feed. In production this is where a real news /
 * social sentiment pipeline (LLM-scored headlines, etc.) plugs in.
 */
export const sentimentStrategy: TradingStrategy = {
  key: "sentiment-news-flow",
  name: "News & Social Sentiment",
  type: "SENTIMENT",
  description:
    "Trades in the direction of aggregate sentiment; in production, sentiment is derived from LLM-scored news and social feeds.",

  analyze(ctx: StrategyContext): Signal | null {
    if (Math.abs(ctx.sentiment) < 0.35) return null;

    const side = ctx.sentiment > 0 ? "BUY" : "SELL";
    return {
      strategyKey: this.key,
      strategyType: this.type,
      symbol: ctx.symbol,
      side,
      strength: clamp(Math.abs(ctx.sentiment), 0.2, 1),
      price: ctx.price,
      rationale: `Aggregate sentiment ${ctx.sentiment.toFixed(2)} (${side === "BUY" ? "bullish" : "bearish"})`,
    };
  },
};
