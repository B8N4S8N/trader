import type { MarketBar } from "@trader/shared";

/**
 * Deterministic-ish simulated market data feed for paper mode.
 *
 * Prices evolve as geometric Brownian motion with a per-symbol drift and
 * volatility, plus an occasional sentiment "shock" so the sentiment strategy
 * has something to react to. This is NOT a market model — it exists purely so
 * the full analysis -> signal -> risk -> execution -> persistence loop can run
 * end-to-end without a live data feed. In live mode this is replaced by real
 * quotes from the Robinhood MCP `get_equity_quotes` tool.
 */
export interface SymbolState {
  symbol: string;
  price: number;
  drift: number;
  vol: number;
  sentiment: number; // [-1, 1], mean-reverting
  history: number[]; // rolling close history (most recent last)
}

const SEED_PRICES: Record<string, number> = {
  AAPL: 231,
  MSFT: 447,
  NVDA: 122,
  TSLA: 248,
  AMZN: 201,
  SPY: 559,
  GOOGL: 178,
  META: 512,
};

export class SimulatedMarket {
  private states = new Map<string, SymbolState>();
  private readonly maxHistory = 300;

  constructor(symbols: string[]) {
    for (const symbol of symbols) {
      const base = SEED_PRICES[symbol] ?? 50 + Math.random() * 250;
      this.states.set(symbol, {
        symbol,
        price: base,
        drift: 0.00005 + Math.random() * 0.0002,
        vol: 0.008 + Math.random() * 0.01,
        sentiment: 0,
        history: [base],
      });
    }
  }

  /** Advance every symbol by one bar and return the new bars. */
  step(): MarketBar[] {
    const bars: MarketBar[] = [];
    const now = new Date();
    for (const state of this.states.values()) {
      // Mean-reverting sentiment with occasional shocks.
      state.sentiment += (Math.random() - 0.5) * 0.15 - state.sentiment * 0.05;
      if (Math.random() < 0.03) state.sentiment += (Math.random() - 0.5) * 1.2;
      state.sentiment = Math.max(-1, Math.min(1, state.sentiment));

      const shock = state.sentiment * state.vol * 0.4;
      const noise = gaussian() * state.vol;
      const ret = state.drift + noise + shock;

      const open = state.price;
      const close = Math.max(1, open * (1 + ret));
      const high = Math.max(open, close) * (1 + Math.random() * state.vol * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * state.vol * 0.5);
      const volume = Math.round(500_000 + Math.random() * 3_000_000);

      state.price = close;
      state.history.push(close);
      if (state.history.length > this.maxHistory) state.history.shift();

      bars.push({ symbol: state.symbol, ts: now, open, high, low, close, volume });
    }
    return bars;
  }

  state(symbol: string): SymbolState | undefined {
    return this.states.get(symbol);
  }

  price(symbol: string): number {
    return this.states.get(symbol)?.price ?? 0;
  }
}

/** Standard-normal sample via the Box-Muller transform. */
function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
