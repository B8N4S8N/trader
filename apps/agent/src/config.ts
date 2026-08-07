import { ensureEnvLoaded } from "@trader/db";

ensureEnvLoaded();

const num = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (key: string, fallback: boolean): boolean => {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return raw.toLowerCase() === "true" || raw === "1";
};

const str = (key: string, fallback: string): string =>
  process.env[key] && process.env[key] !== "" ? String(process.env[key]) : fallback;

export type TradingMode = "paper" | "live";

export interface RiskLimits {
  maxOrderNotional: number;
  maxDailyOrders: number;
  maxPositionPct: number;
  maxGrossExposurePct: number;
  killSwitch: boolean;
}

export interface AgentConfig {
  mode: TradingMode;
  allowLive: boolean;
  tickMs: number;
  startingCash: number;
  symbols: string[];
  accountName: string;
  robinhoodMcpUrl: string;
  risk: RiskLimits;
}

export function loadConfig(): AgentConfig {
  const mode = (str("TRADER_MODE", "paper").toLowerCase() as TradingMode) ?? "paper";
  const allowLive = bool("TRADER_ALLOW_LIVE", false);

  const symbols = str("AGENT_SYMBOLS", "AAPL,MSFT,NVDA,TSLA,AMZN,SPY")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  return {
    mode,
    allowLive,
    tickMs: num("AGENT_TICK_MS", 3000),
    startingCash: num("AGENT_STARTING_CASH", 100_000),
    symbols,
    accountName: mode === "live" ? "Robinhood Agentic" : "Paper Trading",
    robinhoodMcpUrl: str("ROBINHOOD_MCP_URL", "https://agent.robinhood.com/mcp/trading"),
    risk: {
      maxOrderNotional: num("RISK_MAX_ORDER_NOTIONAL", 10_000),
      maxDailyOrders: num("RISK_MAX_DAILY_ORDERS", 200),
      maxPositionPct: num("RISK_MAX_POSITION_PCT", 0.25),
      maxGrossExposurePct: num("RISK_MAX_GROSS_EXPOSURE_PCT", 1.0),
      killSwitch: bool("RISK_KILL_SWITCH", false),
    },
  };
}
