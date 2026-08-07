/**
 * Minimal, dependency-free technical indicators operating on a close-price
 * series (oldest first, most recent last).
 */

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k);
  }
  return prev;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const change = values[i]! - values[i - 1]!;
    if (change >= 0) gains += change;
    else losses -= change;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

/** Annualized-ish standard deviation of simple returns (per-bar). */
export function returnsStdDev(values: number[], period: number): number | null {
  if (values.length < period + 1) return null;
  const slice = values.slice(-(period + 1));
  const rets: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    rets.push((slice[i]! - slice[i - 1]!) / slice[i - 1]!);
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance =
    rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance);
}

/** Z-score of the latest price versus a rolling window (mean reversion). */
export function zScore(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance =
    slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  if (sd === 0) return 0;
  return (values[values.length - 1]! - mean) / sd;
}
