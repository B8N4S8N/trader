import type { ExecutionResult, OrderRequest } from "@trader/shared";

export interface BrokerAdapter {
  readonly name: string;
  readonly simulated: boolean;
  /** Attempt to execute an order. `marketPrice` is the latest known quote. */
  execute(order: OrderRequest, marketPrice: number): Promise<ExecutionResult>;
}
