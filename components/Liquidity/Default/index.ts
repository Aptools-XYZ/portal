import { CoinInformation } from "../../../models/CoinInformation";
import { IDEXHandler } from "../useDexHandler";
import { TransactionPayload } from "aptos/src/generated";

export class DefaultHandler implements IDEXHandler {
  constructor() {

  }
  init(_networkName: string) {

  }
  getLPCoinAddress() {
    return ""
  };
  async checkPoolExistence(): Promise<false | { reserve_x: string; reserve_y: string; }> {
    return false
  }
  async getAmountIn({ amount, slippage }: { amount: number; slippage: number; }) {
    return ""
  }
  async getAmountOut({ amount, slippage }: { amount: number; slippage: number; }) {
    return ""
  }
  async getMinReceivedLP({ amount, slippage }: { amount: number; slippage: number; }): Promise<string> {
    return ""
  }
  async createAddLiquidityPayload(_params: { fromAmount: number; toAmount: number; slippage: number; }): Promise<false | TransactionPayload> {
    return false
  }
  async createRemoveLiquidityPayload(_params: { amount?: number | undefined; lpAmount?: number | undefined; slippage: number; }): Promise<false | TransactionPayload> {
    return false
  }
}
