import { quantStrategy } from "./quant.js";
import { scalpingStrategy } from "./scalping.js";
import { sentimentStrategy } from "./sentiment.js";
import { technicalStrategy } from "./technical.js";
import type { TradingStrategy } from "./types.js";

/** Registry of all strategies the agent can run. */
export const STRATEGIES: TradingStrategy[] = [
  technicalStrategy,
  sentimentStrategy,
  quantStrategy,
  scalpingStrategy,
];

export type { TradingStrategy, StrategyContext } from "./types.js";
