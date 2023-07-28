import { NODE_URLS, getAptosClient, getNetwork } from "../../../config/config";
import { CoinInformation } from "../../../models/CoinInformation";
import structuredClone from "@ungap/structured-clone";
import { AptosClient } from "aptos";
import { IDEXHandler } from "../useDexHandler";
import { TransactionPayload } from "aptos/src/generated";

export const getNodeUrl = (network: string) => NODE_URLS[getNetwork(network)];

export const PANCAKESWAP_ROUTER_V2_ACCOUNT =
  "0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa";
const MINIMAL_LIQUIDITY = 1000

export class PancakeswapHandler implements IDEXHandler {
  private coin_x: CoinInformation;
  private coin_y: CoinInformation;
  private lpDecimals = 8
  private xIsOne = false
  private aptosClient: AptosClient = null as any
  private signAndSubmitTransaction?: (
    transaction: TransactionPayload,
    options?: any
  ) => Promise<{ hash: string }>

  constructor(_coin1: CoinInformation, _coin2: CoinInformation) {
    [this.coin_x, this.coin_y] = [
      structuredClone(_coin1),
      structuredClone(_coin2),
    ].sort((x, y) =>
      x && !y
        ? 1
        : !x && !y
          ? 0
          : !x && y
            ? -1
            : x && y
              ? x.symbol!.localeCompare(y.symbol!)
              : -999
    );
    this.xIsOne = _coin1 && (_coin1.type === this.coin_x.type)
  }

  withSlippage(
    slippage: number,
    value: string | number,
    isPlussed: boolean = false
  ) {
    const multiply = 10000;
    const slippagePercent = slippage * multiply;
    return isPlussed
      ? Math.trunc(+value + (+value * slippagePercent) / multiply)
      : Math.trunc(+value - (+value * slippagePercent) / multiply);
  }

  init(networkName: string, signAndSubmitTransaction?: (
    transaction: TransactionPayload,
    options?: any
  ) => Promise<{ hash: string }>) {
    this.aptosClient = getAptosClient(networkName);
    this.signAndSubmitTransaction = signAndSubmitTransaction
  }
  getLPCoinAddress() {
    return `${PANCAKESWAP_ROUTER_V2_ACCOUNT}::swap::LPToken<${this.coin_x?.type
      }, ${this.coin_y?.type}>`;
  };

  async checkPoolExistence(): Promise<false | { reserve_x: string; reserve_y: string; }> {
    const resKey = `${PANCAKESWAP_ROUTER_V2_ACCOUNT}::swap::TokenPairReserve<${this.coin_x!.type
      }, ${this.coin_y!.type}>`;
    try {
      const lpRes = await this.aptosClient.getAccountResource(
        PANCAKESWAP_ROUTER_V2_ACCOUNT,
        resKey
      );

      if (!lpRes) return false

      const reserve_x = (lpRes.data as any).reserve_x;
      const reserve_y = (lpRes.data as any).reserve_y;

      return { reserve_x, reserve_y }
    } catch (e) {
      return false
    }
  }
  async getAmountIn({ amount }: { amount: number; slippage: number; }) {
    const { reserve_x, reserve_y } = await this.checkPoolExistence() as { reserve_x: string, reserve_y: string }

    const xTotal = +reserve_x;
    const yTotal = +reserve_y;

    const optimalAmount = Math.trunc(amount * yTotal / xTotal)
    return optimalAmount.toFixed(0)
  }
  async getAmountOut({ amount }: { amount: number; slippage: number; }) {
    const { reserve_x, reserve_y } = await this.checkPoolExistence() as { reserve_x: string, reserve_y: string }
    const xTotal = +reserve_x;
    const yTotal = +reserve_y;

    const optimalAmount = Math.trunc(amount * xTotal / yTotal)
    debugger

    return optimalAmount.toFixed(0)
  }
  async getLpCoinSupply() {
    try {
      const lpCoinInfo = await this.aptosClient.getAccountResource(PANCAKESWAP_ROUTER_V2_ACCOUNT, `0x1::coin::CoinInfo<${this.getLPCoinAddress()}>`)
      return +(lpCoinInfo.data as any).supply.vec[0].integer.vec[0].value;
    } catch (e) {
      return 0
    }
  }
  async getMinReceivedLP({ amount, slippage }: { amount: number; slippage: number; }): Promise<string> {
    const lpSupply = await this.getLpCoinSupply();
    const { reserve_x, reserve_y } = await this.checkPoolExistence() as { reserve_x: string, reserve_y: string }
    const xTotal = +reserve_x;
    const yTotal = +reserve_y;

    const x = this.withSlippage(
      slippage,
      this.xIsOne ? Math.trunc(amount * xTotal / yTotal) : amount,
      false,
    )

    const y = this.withSlippage(
      slippage,
      this.xIsOne ? amount : Math.trunc(amount * yTotal / xTotal),
      false
    )

    if (xTotal === 0 || yTotal === 0) {
      return (Math.sqrt(x * y) - (MINIMAL_LIQUIDITY)).toFixed(0);
    }

    const xLp = x * (lpSupply) / (xTotal);
    const yLp = y * (lpSupply) / (yTotal);

    return Math.min(xLp, yLp).toFixed(0);
  }
  async createAddLiquidityPayload({ fromAmount, toAmount, slippage }: { fromAmount: number; toAmount: number; slippage: number; }):
    Promise<TransactionPayload> {
    const payload = {
      type: "entry_function_payload",
      function: `${PANCAKESWAP_ROUTER_V2_ACCOUNT}::router::add_liquidity`,
      type_arguments: [this.coin_x!.type, this.coin_y!.type],
      /*
      amount_x_desired: u64,
      amount_y_desired: u64,
      amount_x_min: u64,
      amount_y_min: u64 */
      arguments: [
        !this.xIsOne ? fromAmount : toAmount,
        !this.xIsOne ? toAmount : fromAmount,
        this.withSlippage(slippage, !this.xIsOne ? fromAmount : toAmount),
        this.withSlippage(slippage, !this.xIsOne ? toAmount : fromAmount),
      ],
    };

    return payload
  }
  async createRemoveLiquidityPayload({ lpAmount, slippage }: { amount?: number | undefined; lpAmount?: number | undefined; slippage: number; })
    : Promise<TransactionPayload> {
    const lpCoinInfo = await this.aptosClient.getAccountResource(PANCAKESWAP_ROUTER_V2_ACCOUNT, `0x1::coin::CoinInfo<${this.getLPCoinAddress()}>`)
    const lpSupply = +(lpCoinInfo.data as any).supply.vec[0].integer.vec[0].value;
    const { reserve_x, reserve_y } = await this.checkPoolExistence() as { reserve_x: string, reserve_y: string }
    const xTotal = +reserve_x;
    const yTotal = +reserve_y;
    // const lpTotal = +(existingLiquidity!.lpCoin!.balance!)
    lpAmount = Math.trunc(lpAmount! * Math.pow(10, this.lpDecimals));

    const payload = {
      type: "entry_function_payload",
      function: `${PANCAKESWAP_ROUTER_V2_ACCOUNT}::router::remove_liquidity`,
      type_arguments: [this.coin_x!.type, this.coin_y!.type],
      arguments: [
        lpAmount,
        this.withSlippage(slippage, (lpAmount * xTotal) / lpSupply),
        this.withSlippage(slippage, (lpAmount * yTotal) / lpSupply),
      ],
    };

    return payload
  }
}
