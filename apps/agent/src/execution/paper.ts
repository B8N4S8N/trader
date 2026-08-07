import type { ExecutionResult, OrderRequest } from "@trader/shared";
import { round2 } from "@trader/shared";
import type { BrokerAdapter } from "./types.js";

/**
 * Simulated broker. Fills market orders immediately at the latest price with a
 * small, side-dependent slippage and a flat per-trade commission. This mirrors
 * the shape of a real fill so the rest of the pipeline is identical in paper
 * and live mode.
 */
export class PaperBroker implements BrokerAdapter {
  readonly name = "paper";
  readonly simulated = true;

  private readonly slippageBps: number;
  private readonly commission: number;

  constructor(opts: { slippageBps?: number; commission?: number } = {}) {
    this.slippageBps = opts.slippageBps ?? 2;
    this.commission = opts.commission ?? 0;
  }

  async execute(order: OrderRequest, marketPrice: number): Promise<ExecutionResult> {
    const slip = (this.slippageBps / 10_000) * marketPrice;
    const fillPrice =
      order.side === "BUY" ? marketPrice + slip : marketPrice - slip;

    return {
      accepted: true,
      status: "FILLED",
      filledQty: order.qty,
      filledPrice: round2(fillPrice),
      fees: this.commission,
      brokerRef: `paper_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    };
  }
}
