import { NODE_URLS, getNetwork } from "../../../config/config";
import PontemSDK from "@pontem/liquidswap-sdk";
import { CoinInformation } from "../../../models/CoinInformation";
import structuredClone from "@ungap/structured-clone";
import { IDEXHandler } from "../useDexHandler";
import { TransactionPayload } from "aptos/src/generated";

export const getNodeUrl = (network: string) => NODE_URLS[getNetwork(network)];
export const LIQUIDSWAP_RESOURCE_ACCOUNT =
  "0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948";
export const LIQUIDSWAP_MODULES_ACCOUNT =
  "0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12";

export class LiquidswapHandler implements IDEXHandler {
  private sdk: PontemSDK = null as any
  private coin_x: CoinInformation;
  private coin_y: CoinInformation;
  private lpDecimals = 6
  private xIsOne = false

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
              ? y.symbol!.localeCompare(x.symbol!)
              : -999
    );
    this.xIsOne = _coin1 && (_coin1.type === this.coin_x.type)
  }
  init(networkName: string) {
    this.sdk = new PontemSDK({
      nodeUrl: getNodeUrl(networkName),
      networkOptions: {
        resourceAccount: LIQUIDSWAP_RESOURCE_ACCOUNT,
        moduleAccount: LIQUIDSWAP_MODULES_ACCOUNT,
        modules: {
          Scripts: `${LIQUIDSWAP_MODULES_ACCOUNT}::scripts_v2`,
          CoinInfo: "0x1::coin::CoinInfo",
          CoinStore: "0x1::coin::CoinStore",
        },
      },
    });
  }
  getLPCoinAddress() {
    return `${LIQUIDSWAP_RESOURCE_ACCOUNT}::lp_coin::LP<${this.coin_x?.type
      }, ${this.coin_y?.type}, ${LIQUIDSWAP_MODULES_ACCOUNT}::curves::Uncorrelated>`;
  };
  async checkPoolExistence(): Promise<false | { reserve_x: string; reserve_y: string; }> {
    const existed = await this.sdk.Liquidity.getLiquidityPoolResource({
      fromToken: this.coin_x.type,
      toToken: this.coin_y.type,
      curveType: "uncorrelated",
    });

    if (!existed.liquidityPoolResource) return false

    const reserve_x = existed.liquidityPoolResource.data.coin_x_reserve.value;
    const reserve_y = existed.liquidityPoolResource.data.coin_y_reserve.value;

    return { reserve_x, reserve_y }
  }
  async getAmountIn({ amount, slippage }: { amount: number; slippage: number; }) {
    return await this.sdk.Liquidity.getAmountIn({
      fromToken: this.coin_y.type!,
      toToken: this.coin_x!.type!,
      amount,
      curveType: "uncorrelated",
      slippage
    });
  }
  async getAmountOut({ amount, slippage }: { amount: number; slippage: number; }) {
    return await this.sdk.Liquidity.getAmountOut({
      fromToken: this.coin_y.type,
      toToken: this.coin_x.type,
      amount,
      curveType: "uncorrelated",
      slippage,
    });
  }
  async getMinReceivedLP({ amount, slippage }: { amount: number; slippage: number; }): Promise<string> {
    const { rate, receiveLp } =
      await this.sdk.Liquidity.calculateRateAndMinReceivedLP({
        fromToken: this.coin_y.type!,
        toToken: this.coin_x!.type!,
        amount,
        curveType: "uncorrelated",
        interactiveToken: this.xIsOne ? 'from' : "to",
        slippage,
      });

    return receiveLp
  }
  async createAddLiquidityPayload({ fromAmount, toAmount, slippage }: { fromAmount: number; toAmount: number; slippage: number; }):
    Promise<TransactionPayload> {
    return this.sdk?.Liquidity.createAddLiquidityPayload({
      fromToken: this.coin_x?.type!,
      toToken: this.coin_y?.type!,
      fromAmount,
      toAmount,
      curveType: "uncorrelated",
      interactiveToken: "from",
      slippage,
    });
  }
  async createRemoveLiquidityPayload({ lpAmount, slippage }: { amount?: number | undefined; lpAmount?: number | undefined; slippage: number; })
    : Promise<TransactionPayload> {
    return await this.sdk?.Liquidity.createBurnLiquidityPayload({
      fromToken: this.coin_x?.type!,
      toToken: this.coin_y?.type!,
      curveType: "uncorrelated",
      slippage,
      burnAmount:
        +lpAmount! * Math.pow(10, this.lpDecimals),
    });
  }
}
