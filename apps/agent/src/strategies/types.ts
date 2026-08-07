import type { Signal, StrategyType } from "@trader/shared";

export interface StrategyContext {
  symbol: string;
  price: number;
  /** Rolling close history, oldest first, most recent last. */
  history: number[];
  /** Latent sentiment score in [-1, 1] (from the feed / news pipeline). */
  sentiment: number;
}

export interface TradingStrategy {
  key: string;
  name: string;
  type: StrategyType;
  description: string;
  /** Return a trading intent for this symbol, or null to abstain. */
  analyze(ctx: StrategyContext): Signal | null;
}
