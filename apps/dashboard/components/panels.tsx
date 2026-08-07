import { STRATEGY_META, formatPct, formatUsd } from "@trader/shared";
import type {
  PositionRow,
  StrategyPerformance,
  TradeRow,
} from "../lib/queries";

const signedUsd = (v: number): string => `${v >= 0 ? "+" : "-"}${formatUsd(Math.abs(v))}`;
const toneClass = (v: number): string => (v >= 0 ? "text-gain" : "text-loss");

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "up" | "down";
}) {
  const toneColor =
    tone === "up" ? "text-gain" : tone === "down" ? "text-loss" : "text-white";
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneColor}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function StrategyBadge({ type }: { type: StrategyPerformance["type"] }) {
  const meta = STRATEGY_META[type];
  return (
    <span
      className="pill"
      style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

export function StrategyTable({ rows }: { rows: StrategyPerformance[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/5 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Strategy performance</h2>
        <p className="text-xs text-slate-400">Realized P&amp;L attributed per strategy</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-5 py-3 font-medium">Strategy</th>
            <th className="px-5 py-3 text-right font-medium">Trades</th>
            <th className="px-5 py-3 text-right font-medium">Buys / Sells</th>
            <th className="px-5 py-3 text-right font-medium">Volume</th>
            <th className="px-5 py-3 text-right font-medium">Realized P&amp;L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-white/[0.02]">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <StrategyBadge type={r.type} />
                  <span className="text-slate-200">{r.name}</span>
                </div>
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-slate-300">{r.trades}</td>
              <td className="px-5 py-3 text-right tabular-nums text-slate-400">
                {r.buys} / {r.sells}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-slate-400">
                {formatUsd(r.volume)}
              </td>
              <td className={`px-5 py-3 text-right font-medium tabular-nums ${toneClass(r.realizedPnl)}`}>
                {signedUsd(r.realizedPnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PositionsTable({ rows }: { rows: PositionRow[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/5 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Open positions</h2>
        <p className="text-xs text-slate-400">{rows.length} held</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">No open positions.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-medium">Symbol</th>
              <th className="px-5 py-3 text-right font-medium">Qty</th>
              <th className="px-5 py-3 text-right font-medium">Avg</th>
              <th className="px-5 py-3 text-right font-medium">Mark</th>
              <th className="px-5 py-3 text-right font-medium">Value</th>
              <th className="px-5 py-3 text-right font-medium">Unrealized</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((p) => (
              <tr key={p.symbol} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 font-medium text-white">{p.symbol}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-300">{p.qty}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-400">{formatUsd(p.avgPrice)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-400">{formatUsd(p.marketPrice)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-300">{formatUsd(p.marketValue)}</td>
                <td className={`px-5 py-3 text-right tabular-nums ${toneClass(p.unrealized)}`}>
                  {signedUsd(p.unrealized)}
                  <span className="ml-1 text-xs opacity-70">({formatPct(p.unrealizedPct)})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function TradesTable({ rows }: { rows: TradeRow[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/5 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Recent trades</h2>
        <p className="text-xs text-slate-400">Most recent executions with strategy attribution</p>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-base-850">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-medium">Time</th>
              <th className="px-5 py-3 font-medium">Symbol</th>
              <th className="px-5 py-3 font-medium">Side</th>
              <th className="px-5 py-3 font-medium">Strategy</th>
              <th className="px-5 py-3 text-right font-medium">Qty</th>
              <th className="px-5 py-3 text-right font-medium">Price</th>
              <th className="px-5 py-3 text-right font-medium">P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 tabular-nums text-slate-400">
                  {new Date(t.executedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </td>
                <td className="px-5 py-3 font-medium text-white">{t.symbol}</td>
                <td className="px-5 py-3">
                  <span className={`pill ${t.side === "BUY" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
                    {t.side}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs" style={{ color: STRATEGY_META[t.strategyType].color }}>
                    {STRATEGY_META[t.strategyType].label}
                  </span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-300">{t.qty}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-400">{formatUsd(t.price)}</td>
                <td className={`px-5 py-3 text-right tabular-nums ${t.side === "SELL" ? toneClass(t.realizedPnl) : "text-slate-600"}`}>
                  {t.side === "SELL" ? signedUsd(t.realizedPnl) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
