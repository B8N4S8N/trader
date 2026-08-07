/**
 * @trader/shared
 *
 * Framework-agnostic domain vocabulary shared by the private trading agent
 * (`apps/agent`) and the public dashboard (`apps/dashboard`). Keeping these
 * contracts in one place prevents the two planes from drifting apart.
 *
 * NOTE ON MONEY: for this paper-trading foundation, monetary values are plain
 * `number`s (USD). A production live-trading system should migrate to a
 * fixed-precision decimal type end-to-end. This trade-off is intentional and
 * documented in the README so the simulation math stays simple and reliable.
 */

export const STRATEGY_TYPES = [
  "TECHNICAL",
  "SENTIMENT",
  "QUANT",
  "SCALPING",
] as const;
export type StrategyType = (typeof STRATEGY_TYPES)[number];

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus =
  | "SIMULATED"
  | "PENDING"
  | "FILLED"
  | "CANCELLED"
  | "REJECTED";
export type AccountKind = "PAPER" | "LIVE";

/** A single OHLCV price bar for one symbol at one point in time. */
export interface MarketBar {
  symbol: string;
  ts: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** A trading intent produced by a strategy. Strength is normalized to [0, 1]. */
export interface Signal {
  strategyKey: string;
  strategyType: StrategyType;
  symbol: string;
  side: OrderSide;
  strength: number;
  price: number;
  rationale: string;
}

/** An order request after it has passed the risk layer, ready for execution. */
export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  limitPrice?: number;
  strategyKey?: string;
}

/** The result of attempting to execute an order via a broker adapter. */
export interface ExecutionResult {
  accepted: boolean;
  status: OrderStatus;
  filledQty: number;
  filledPrice: number;
  fees: number;
  brokerRef?: string;
  reason?: string;
}

/** Outcome of evaluating an order against the risk guardrails. */
export interface RiskDecision {
  approved: boolean;
  reason: string;
  adjustedQty?: number;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const formatUsd = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export const formatPct = (fraction: number, digits = 2): string =>
  `${(fraction * 100).toFixed(digits)}%`;

/** Human-readable label + accent color per strategy type (used by the UI). */
export const STRATEGY_META: Record<
  StrategyType,
  { label: string; color: string }
> = {
  TECHNICAL: { label: "Technical", color: "#38bdf8" },
  SENTIMENT: { label: "Sentiment", color: "#a78bfa" },
  QUANT: { label: "Quant", color: "#34d399" },
  SCALPING: { label: "Scalping", color: "#fbbf24" },
};
