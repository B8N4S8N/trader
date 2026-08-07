export interface Holding {
  qty: number;
  avgPrice: number;
}

/**
 * In-memory, long-only portfolio ledger. Kept in sync with Postgres by the
 * engine on every tick. All math is plain USD `number` (see note in
 * `@trader/shared`).
 */
export class Portfolio {
  cash: number;
  realizedPnl = 0;
  readonly positions = new Map<string, Holding>();

  constructor(startingCash: number) {
    this.cash = startingCash;
  }

  holding(symbol: string): Holding {
    return this.positions.get(symbol) ?? { qty: 0, avgPrice: 0 };
  }

  applyBuy(symbol: string, qty: number, price: number, fees: number): void {
    const h = this.holding(symbol);
    const newQty = h.qty + qty;
    const newAvg = newQty > 0 ? (h.qty * h.avgPrice + qty * price) / newQty : 0;
    this.positions.set(symbol, { qty: newQty, avgPrice: newAvg });
    this.cash -= qty * price + fees;
  }

  /** Reduce a long position; returns the realized P&L for this sell. */
  applySell(symbol: string, qty: number, price: number, fees: number): number {
    const h = this.holding(symbol);
    const sellQty = Math.min(qty, h.qty);
    const realized = (price - h.avgPrice) * sellQty - fees;
    const remaining = h.qty - sellQty;
    if (remaining <= 0) this.positions.delete(symbol);
    else this.positions.set(symbol, { qty: remaining, avgPrice: h.avgPrice });
    this.cash += sellQty * price - fees;
    this.realizedPnl += realized;
    return realized;
  }

  positionsValue(priceOf: (symbol: string) => number): number {
    let total = 0;
    for (const [symbol, h] of this.positions) total += h.qty * priceOf(symbol);
    return total;
  }

  grossExposure(priceOf: (symbol: string) => number): number {
    let total = 0;
    for (const [symbol, h] of this.positions) total += Math.abs(h.qty) * priceOf(symbol);
    return total;
  }

  unrealized(priceOf: (symbol: string) => number): number {
    let total = 0;
    for (const [symbol, h] of this.positions) {
      total += (priceOf(symbol) - h.avgPrice) * h.qty;
    }
    return total;
  }

  equity(priceOf: (symbol: string) => number): number {
    return this.cash + this.positionsValue(priceOf);
  }
}
