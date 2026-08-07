import type { OrderRequest, RiskDecision } from "@trader/shared";
import type { RiskLimits } from "../config.js";

export interface RiskContext {
  equity: number;
  cash: number;
  price: number;
  /** Signed current position quantity for this symbol (long-only => >= 0). */
  currentPositionQty: number;
  /** Absolute market value already deployed in this symbol. */
  currentPositionValue: number;
  /** Absolute market value deployed across all symbols. */
  grossExposure: number;
  /** Orders already placed during the current UTC day. */
  ordersToday: number;
}

/**
 * Pure risk gate. Every order must pass here before it reaches a broker.
 * The gate is long-only (the Robinhood MCP supports long equities), never uses
 * margin, and may shrink an order's quantity to fit the configured limits.
 * It returns a rejection rather than throwing so the caller can audit-log it.
 */
export function evaluateOrder(
  order: OrderRequest,
  limits: RiskLimits,
  ctx: RiskContext,
): RiskDecision {
  if (limits.killSwitch) {
    return { approved: false, reason: "Kill switch engaged" };
  }
  if (ctx.ordersToday >= limits.maxDailyOrders) {
    return { approved: false, reason: `Daily order cap reached (${limits.maxDailyOrders})` };
  }
  if (ctx.price <= 0) {
    return { approved: false, reason: "No valid market price" };
  }

  if (order.side === "SELL") {
    const sellQty = Math.min(order.qty, ctx.currentPositionQty);
    if (sellQty <= 0) {
      return { approved: false, reason: "No long position to reduce (long-only)" };
    }
    return { approved: true, reason: "ok", adjustedQty: floorShares(sellQty) };
  }

  // BUY path — apply notional, per-symbol, gross-exposure, and cash limits.
  let qty = order.qty;
  const capByNotional = limits.maxOrderNotional / ctx.price;
  qty = Math.min(qty, capByNotional);

  const perSymbolBudget = Math.max(
    0,
    limits.maxPositionPct * ctx.equity - ctx.currentPositionValue,
  );
  qty = Math.min(qty, perSymbolBudget / ctx.price);

  const grossBudget = Math.max(
    0,
    limits.maxGrossExposurePct * ctx.equity - ctx.grossExposure,
  );
  qty = Math.min(qty, grossBudget / ctx.price);

  // No margin: never spend more cash than we have.
  qty = Math.min(qty, ctx.cash / ctx.price);

  const finalQty = floorShares(qty);
  if (finalQty <= 0) {
    return { approved: false, reason: "Position/exposure/cash limits leave no room" };
  }
  return { approved: true, reason: "ok", adjustedQty: finalQty };
}

/** Whole-share sizing keeps the paper ledger clean and readable. */
function floorShares(qty: number): number {
  return Math.floor(qty);
}
