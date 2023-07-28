import { useWallet } from "@aptstats/aptos-wallet-framework";
import { NODE_URLS, getNetwork } from "../../config/config";
import { useEffect, useMemo, useState } from "react";
import { notification } from "antd";
import { CoinInformation } from "../../models/CoinInformation";
import structuredClone from "@ungap/structured-clone";
import { LiquidswapHandler } from "./Liquidswap"
import { TransactionPayload } from "aptos/src/generated";
import { DefaultHandler } from "./Default";
import { PancakeswapHandler } from "./Pancakeswap";

export const getNodeUrl = (network: string) => NODE_URLS[getNetwork(network)];

const DEFAULT_SLIPPAGE = 0.005
export interface IDEXHandler {
  init: (networkName: string, signAndSubmitTransaction?: (
    transaction: TransactionPayload,
    options?: any
  ) => Promise<{ hash: string }>) => void,
  getLPCoinAddress: () => string,
  checkPoolExistence: () => Promise<{ reserve_x: string; reserve_y: string; } | false>
  getAmountIn: (params: { amount: number, slippage: number }) => Promise<string>
  getAmountOut: (params: { amount: number, slippage: number }) => Promise<string>
  getMinReceivedLP: (params: { amount: number, slippage: number }) => Promise<string>
  createAddLiquidityPayload: (params: { fromAmount: number, toAmount: number, slippage: number }) => Promise<TransactionPayload | false>
  createRemoveLiquidityPayload: (params: { amount?: number, lpAmount?: number, slippage: number }) => Promise<TransactionPayload | false>
}

export function useDexHandler(
  dex: string,
  coin1?: CoinInformation,
  coin2?: CoinInformation,
  coins?: CoinInformation[],
  changedCoin?: string,
  refreshRequired?: boolean
) {
  const { signAndSubmitTransaction, connected, network, disconnect } =
    useWallet();
  const [poolExisted, setPoolExisted] = useState(false);
  const [receivingLp, setReceivingLp] = useState("");
  const [liqX, setLiqX] = useState("")
  const [liqY, setLiqY] = useState("")
  const [estimated, setEstimated] = useState("")

  const handler = ({
    Liquidswap: new LiquidswapHandler(coin1!, coin2!),
    Pancakeswap: new PancakeswapHandler(coin1!, coin2!),
    undefined: new DefaultHandler(),
  } as unknown as { [dex: string]: IDEXHandler })[dex]

  if (!handler) throw new Error(dex)

  const [coin_x, coin_y] = [
    structuredClone(coin1),
    structuredClone(coin2),
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
  const lpCoinAddress = handler.getLPCoinAddress()
  const lpCoin = coins!.find((c) => c.type === lpCoinAddress);

  useMemo(() => {
    if (connected && network) {
      try {
        handler.init(network.name!, signAndSubmitTransaction)
      } catch (e) {
        disconnect();
      }
    }
  }, [connected, disconnect, handler, network, signAndSubmitTransaction]);

  useEffect(() => {
    if (!coin1 || !coin2 || coin1.type === coin2.type) return;
    (async () => {
      //check pool existence
      const existed = await handler.checkPoolExistence()
      setPoolExisted(!!existed);

      if (existed) {
        setLiqX(existed.reserve_x)
        setLiqY(existed.reserve_y)
      }
    })();
  }, [coin1, coin2, coin_x, coin_y, coins, refreshRequired, lpCoinAddress, handler]);

  useEffect(() => {
    if (!poolExisted) return setEstimated("");
    if (!coin1 || !coin2 || coin1.type === coin2.type) return setEstimated("");

    (async () => {
      if (changedCoin === coin_y?.type && coin_y?.value) {
        console.log(`Y: Calculating amount of ${coin_x!.symbol}...`);
        const amount = await handler.getAmountIn({
          amount: +coin_y!.value!,
          slippage: DEFAULT_SLIPPAGE,
        });
        console.log(`Y: Done with ${amount} for ${coin_x?.symbol}`);
        setEstimated(amount || "")
      } else if (changedCoin === coin_x?.type && coin_x?.value) {
        console.log(`X: Calculating amount of ${coin_y!.symbol}...`);
        const amount = await handler.getAmountOut({
          amount: +coin_x!.value!,
          slippage: DEFAULT_SLIPPAGE,
        });

        console.log(`X: Done with ${amount} for ${coin_y?.symbol}`);
        setEstimated(amount || "")
      }

      // get rate and Minimum received LP
      const receiveLp = await handler.getMinReceivedLP({
        amount: changedCoin === coin_x?.type ? +coin_x!.value! : +coin_y?.value!,
        slippage: DEFAULT_SLIPPAGE,
      });

      receiveLp ? setReceivingLp(receiveLp) : setReceivingLp("");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin1, coin2, poolExisted, changedCoin, refreshRequired]);

  async function addLiquidity() {
    const payload = await handler.createAddLiquidityPayload({
      fromAmount: +coin_x?.value!,
      toAmount: +coin_y?.value!,
      slippage: DEFAULT_SLIPPAGE,
    });
    if (!payload) return false
    console.log("Add liquidity pool payload", payload);
    return await signAndSubmitTransaction(payload!);
  }

  async function removeLiquidity(lpRemoval: number) {
    const payload = await handler.createRemoveLiquidityPayload({
      slippage: DEFAULT_SLIPPAGE,
      lpAmount: lpRemoval,
      amount:
        +lpRemoval! * Math.pow(10, lpCoin?.decimals!),
    });
    if (!payload) return false
    console.log("Remove liquidity pool payload", payload);
    return await signAndSubmitTransaction(payload!);
  }

  return {
    poolExisted,
    receivingLp,
    existingLiquidity: poolExisted ?
      {
        coin_x: { ...coin_x!, value: liqX, balance: liqX },
        coin_y: { ...coin_y!, value: liqY, balance: liqY },
        lpCoin,
      }
      : null,
    estimated: changedCoin === coin1?.type ? { coin2: estimated, } : { coin1: estimated },
    addLiquidity,
    removeLiquidity,
  };
}
