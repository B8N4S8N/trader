# trader

An autonomous, multi-strategy **AI trading agent** (private) paired with a
**public performance dashboard** (Next.js). The agent analyzes the market with
several strategies, sizes and risk-checks orders, executes them, and records
everything to Postgres. The dashboard reads that data and shows fund growth,
P&L, per-strategy performance, open positions, and a live trade log.

> Paper-trading simulation by default. Live trading through the Robinhood
> Trading MCP is an adapter you enable **only** on your own private host.
> Nothing here is investment advice.

---

## For everyone (the plain-English version)

Think of this as two separate rooms:

- **The private trading room** (`apps/agent`) — a robot that watches prices,
  decides what to buy/sell using four different "playbooks" (strategies),
  double-checks every trade against safety limits, and keeps a ledger. Only you
  ever run this room, and only it can touch money.
- **The public window** (`apps/dashboard`) — a website that looks *into* the
  ledger and shows how the fund is doing. It can never place a trade and never
  sees your brokerage login.

The two rooms only share a filing cabinet (the database). That separation is
the whole security idea: even if the website were fully compromised, it cannot
move a single dollar.

## For engineers (the architecture)

```
                 ┌─────────────────────────── PRIVATE (only you) ──────────────────────────┐
   market data → │  apps/agent                                                             │
                 │    market feed → strategies → signals → RISK GUARDRAILS → broker adapter │
                 │                                                   │            │         │
                 │                                                   │       paper | live   │
                 │                                                   ▼            ▼         │
                 │                                            Robinhood MCP (live, yours)   │
                 └───────────────────────────────┬──────────────────────────────┬─────────┘
                                                  ▼ writes trades/snapshots        (OAuth stays on host)
                                          ┌──────────────┐
                                          │  Postgres    │  ← single source of truth
                                          └──────┬───────┘
                                                 ▲ reads only
                 ┌───────────────────────────────┴──────────────── PUBLIC (read-only) ──────┐
                 │  apps/dashboard (Next.js)  — equity curve, P&L, strategies, positions     │
                 └───────────────────────────────────────────────────────────────────────────┘
```

### Monorepo layout

| Path                | What it is                                                        |
| ------------------- | ----------------------------------------------------------------- |
| `apps/agent`        | Private worker: market feed, strategies, risk, execution, ledger. |
| `apps/dashboard`    | Public Next.js dashboard (read-only).                             |
| `packages/db`       | Prisma schema + client singleton + env loader.                    |
| `packages/shared`   | Domain types and formatting helpers shared by both apps.          |

### Strategies (`apps/agent/src/strategies`)

- **Technical** — EMA(12)/EMA(26) crossover gated by RSI(14).
- **Sentiment** — trades aggregate sentiment (LLM-scored news/social in prod).
- **Quant** — mean reversion on a 40-bar price z-score.
- **Scalping** — short-horizon SMA(3)/SMA(8) micro-momentum.

Each is a small, pure `analyze(ctx) => Signal | null` module. Add one by
implementing `TradingStrategy` and registering it in `strategies/index.ts`.

### Risk guardrails (`apps/agent/src/risk/guardrails.ts`)

Every order passes a pure gate before any broker sees it:

- max notional per order, max orders per day,
- max % of equity per symbol, max gross exposure,
- no margin (never spend more cash than available),
- long-only (matches the Robinhood MCP's supported order types),
- global **kill switch**.

Tune via the `RISK_*` variables in `.env`.

---

## Quick start (local)

```bash
# 1. Start Postgres (local, user-owned cluster) and create the app db/role
bash scripts/db-start.sh

# 2. Install deps + generate the Prisma client
pnpm install
pnpm db:generate

# 3. Create the schema and seed reference data
cp .env.example .env      # local dev defaults
pnpm db:push
pnpm db:seed

# 4. Run the agent (paper mode) and the dashboard
pnpm dev:agent            # writes trades/snapshots; backfills history on first run
pnpm dev:dashboard        # http://localhost:3000
```

Useful scripts: `pnpm db:reset` (clear transactional data, keep schema),
`pnpm db:studio` (browse data), `pnpm build`, `pnpm lint`, `pnpm typecheck`.

---

## Enabling live Robinhood trading (private host only)

Live execution is intentionally inert in this repo. To turn it on **on your own
always-on server** (never in the public dashboard):

1. Connect the [Robinhood Trading MCP](https://robinhood.com/us/en/support/articles/agentic-trading-overview/)
   (`https://agent.robinhood.com/mcp/trading`, OAuth 2.1 + PKCE) to your agent
   host and complete the browser approval. Order placement is restricted to
   your funded **Agentic** account.
2. Implement the `review_equity_order → place_equity_order` flow in
   `apps/agent/src/execution/robinhoodMcp.ts` against the tools your account
   advertises (`initialize` → `tools/list`).
3. Set `TRADER_MODE=live` and `TRADER_ALLOW_LIVE=true`.

The OAuth token lives only in your host's credential store — never committed,
never shipped to the dashboard.

---

## Notes & trade-offs

- **Money is `number` (USD)** in this paper foundation for simple, reliable
  simulation math. A live system should move to fixed-precision decimals
  end-to-end.
- The simulated market feed is **not** a market model; it exists so the full
  pipeline runs without a live data source.
- Past performance does not guarantee future results. Not investment advice.
