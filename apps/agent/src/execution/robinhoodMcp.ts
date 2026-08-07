import type { ExecutionResult, OrderRequest } from "@trader/shared";
import type { BrokerAdapter } from "./types.js";

/**
 * LIVE Robinhood execution via the Robinhood Trading MCP.
 * Endpoint: https://agent.robinhood.com/mcp/trading
 * Transport: Streamable HTTP. Auth: OAuth 2.1 + PKCE (public client, no secret).
 *
 * IMPORTANT — this adapter is intentionally inert in this foundation:
 *
 *   1. The OAuth flow requires an interactive browser approval on YOUR host and
 *      periodic refresh. The token must never be committed or shipped to the
 *      dashboard; it lives only in your private host's credential store.
 *   2. Order placement is confined to your funded Agentic account.
 *   3. Tool names are account-specific — discover them at runtime via
 *      `initialize` then `tools/list`, and always call `review_equity_order`
 *      (simulation) before `place_equity_order`.
 *
 * To enable live trading on your private server:
 *   - add `@modelcontextprotocol/sdk` and connect with a persisted OAuth token,
 *   - resolve the place/review/cancel tools from the live schema,
 *   - map {@link OrderRequest} to the advertised inputSchema,
 *   - and set TRADER_MODE=live plus TRADER_ALLOW_LIVE=true.
 *
 * Until then, constructing this adapter refuses to trade so no real order can
 * ever leave the machine by accident.
 */
export class RobinhoodMcpBroker implements BrokerAdapter {
  readonly name = "robinhood-mcp";
  readonly simulated = false;

  constructor(private readonly mcpUrl: string) {}

  async execute(_order: OrderRequest, _marketPrice: number): Promise<ExecutionResult> {
    throw new Error(
      `[robinhood-mcp] Live execution is not wired in this build. Connect the ` +
        `Robinhood Trading MCP (${this.mcpUrl}) on your private host, implement ` +
        `the review_equity_order -> place_equity_order flow, then enable live mode. ` +
        `Refusing to place a real order.`,
    );
  }
}
