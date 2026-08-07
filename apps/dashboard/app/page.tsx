import { formatPct, formatUsd } from "@trader/shared";
import { AutoRefresh } from "../components/AutoRefresh";
import { EquityChart } from "../components/EquityChart";
import {
  PositionsTable,
  StatCard,
  StrategyTable,
  TradesTable,
} from "../components/panels";
import {
  getEquitySeries,
  getOverview,
  getPositions,
  getPrimaryAccount,
  getRecentTrades,
  getStrategyPerformance,
} from "../lib/queries";

// Always render fresh data — this is a live performance dashboard.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const account = await getPrimaryAccount();

  if (!account) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold text-white">Trader</h1>
        <p className="mt-3 text-slate-400">
          No account data yet. Start the trading agent to begin populating the
          dashboard.
        </p>
        <code className="mt-4 rounded-lg bg-base-850 px-3 py-2 text-sm text-accent">
          pnpm dev:agent
        </code>
      </main>
    );
  }

  const [overview, series, strategies, positions, trades] = await Promise.all([
    getOverview(account.id),
    getEquitySeries(account.id),
    getStrategyPerformance(account.id),
    getPositions(account.id),
    getRecentTrades(account.id),
  ]);

  const up = overview.totalReturn >= 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <header className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium uppercase tracking-widest text-accent">
                {account.name}
              </span>
              <AutoRefresh />
            </div>
            <h1 className="mt-3 text-4xl font-bold tabular-nums text-white sm:text-5xl">
              {formatUsd(overview.equity)}
            </h1>
            <p className={`mt-2 text-lg font-medium ${up ? "text-gain" : "text-loss"}`}>
              {up ? "▲" : "▼"} {formatUsd(Math.abs(overview.equity - overview.baseline))} (
              {formatPct(overview.totalReturn)}) all-time
            </p>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>
              Updated{" "}
              {overview.updatedAt
                ? new Date(overview.updatedAt).toLocaleTimeString()
                : "—"}
            </p>
            <p className="mt-1">
              {overview.tradeCount.toLocaleString()} trades ·{" "}
              {formatPct(overview.winRate)} win rate
            </p>
          </div>
        </div>

        <div className="mt-6">
          <EquityChart data={series} baseline={overview.baseline} />
        </div>
      </header>

      {/* Stat cards */}
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Equity" value={formatUsd(overview.equity)} sub="Cash + positions" />
        <StatCard
          label="Realized P&L"
          value={formatUsd(overview.realizedPnl)}
          tone={overview.realizedPnl >= 0 ? "up" : "down"}
          sub="Closed trades"
        />
        <StatCard
          label="Unrealized P&L"
          value={formatUsd(overview.unrealizedPnl)}
          tone={overview.unrealizedPnl >= 0 ? "up" : "down"}
          sub="Open positions"
        />
        <StatCard
          label="Cash"
          value={formatUsd(overview.cash)}
          sub={`${overview.openPositions} open positions`}
        />
      </section>

      {/* Strategy + positions */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <StrategyTable rows={strategies} />
        <PositionsTable rows={positions} />
      </section>

      {/* Trades */}
      <section className="mt-6">
        <TradesTable rows={trades} />
      </section>

      <footer className="mt-8 border-t border-white/5 pt-6 text-center text-xs text-slate-500">
        <p>
          Autonomous multi-strategy AI trading fund · Paper simulation. Past
          performance does not guarantee future results. This dashboard is for
          informational purposes only and is not investment advice.
        </p>
      </footer>
    </main>
  );
}
