import { Dropdown, Space, Avatar, notification, DropDownProps } from "antd";
import { DownOutlined, StopOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { CoinInformation } from "../models/CoinInformation";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { AptosClient } from "aptos";
import { getAptosClient } from "../config/config";
import { CoinListClient, NetworkType } from "../libs/CoinListClient";

export type MyCoinsDropdownProps = DropDownProps & {
  coinFilter?: (coin: CoinInformation) => boolean;
  value?: string;
  placeholder?: string;
  onChange?: (coin: CoinInformation) => void;
};

export default function MyCoinsDropdown(props: MyCoinsDropdownProps) {
  const { account, signAndSubmitTransaction, connected, network, disconnect } =
    useWallet();

  const [aptosClient, setAptosClient] = useState<AptosClient>();
  const [coins, setCoins] = useState<CoinInformation[]>([]);
  const [selectedCoin, selectCoin] = useState<CoinInformation>();
  const [coinFilter, setCoinFilter] = useState("");

  const { coinFilter: filter } = props;

  useMemo(() => {
    if (connected && network) {
      try {
        setAptosClient(getAptosClient(network.name!));
      } catch (e) {
        disconnect();
      }
    }
  }, [connected, disconnect, network]);

  const listClient = useMemo(() => {
    const isMainnet = connected && network.name === "mainnet";
    return new CoinListClient(
      isMainnet,
      network?.name as unknown as NetworkType
    );
  }, [network, connected]);

  useEffect(() => {
    (async () => {
      if (!connected || !account || !aptosClient) return;
      try {
        const resources = await aptosClient?.getAccountResources(
          account.address!
        );
        const tasks = resources
          .filter((r) => r.type.includes("0x1::coin::CoinStore"))
          .map(async (r) => {
            const { data } = await aptosClient.getAccountResource(
              r.type
                .match(/<(.*)>/g)![0]
                .split("::")[0]
                .replace("<", ""),
              `0x1::coin::CoinInfo${r.type.match(/<(.*)>/g)![0]}`
            );
            return {
              ...data,
              type: r.type.replace(/0x1::coin::CoinStore\<(.*)\>/gi, "$1"),
              total_supply: 0,
              value:
                Math.round(
                  (+(r.data as any).coin.value /
                    Math.pow(10, +(data as any).decimals)) *
                    1000
                ) / 1000,
              ...listClient.getCoinInfoByFullName(
                r.type.replace(/0x1::coin::CoinStore\<(.*)\>/gi, "$1")
              ),
            } as unknown as CoinInformation;
          });

        const coins = await Promise.all(await tasks);
        setCoins(coins);
        if (coins.length && coins.find((c) => c.type === props.value))
          selectCoin(coins.find((c) => c.type === props.value));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [account, aptosClient, connected, listClient, props.value]);

  const filteredCoins = useMemo(() => {
    return coins
      .filter((coin) => {
        if (!coinFilter) return coins;
        return (
          coin.name.toLowerCase().includes(coinFilter.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(coinFilter.toLowerCase()) ||
          coin.type.toLowerCase().includes(coinFilter.toLowerCase())
        );
      })
      .filter((c) => (filter ? filter(c) : true));
  }, [coinFilter, coins, filter]);

  const balance = useMemo(() => {
    return selectedCoin?.value;
  }, [selectedCoin?.value]);

  return (
    <div
      style={{
        backgroundColor: "white",
        height: 48,
      }}
      className="
   mt-1
   bvesting
   w-full
   rounded-md
   border-black-500
   shadow-sm
   focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
 "
    >
      <Dropdown
        trigger={[props.disabled ? "contextMenu" : "click"]}
        menu={{
          className: "max-h-[360px] overflow-scroll",
          items: filteredCoins.map((coin, index) => ({
            key: index,
            label: (
              <>
                <Space
                  style={{
                    display: "inline-flex",
                    width: "100%",
                    justifyContent: "space-between",
                  }}
                  onClick={() => {
                    selectCoin(coin);
                    props.onChange && props.onChange(coin);
                  }}
                >
                  <Space>
                    {coin?.logo_url ? (
                      <img
                        src={coin?.logo_url}
                        alt={coin?.name}
                        style={{ verticalAlign: "bottom" }}
                        width={20}
                      />
                    ) : (
                      <StopOutlined
                        style={{
                          fontSize: 24,
                          backgroundColor: "white",
                          borderRadius: "50%",
                          color: "gray",
                        }}
                      />
                    )}
                    {coin.name}
                  </Space>
                  <span style={{ alignSelf: "flex-end" }}>
                    {coin.value} ${coin.symbol}
                  </span>
                </Space>
              </>
            ),
          })),
        }}
      >
        <a
          onClick={(e) => e.preventDefault()}
          style={{
            width: "100%",
            display: "inline-flex",
            justifyItems: "stretch",
            justifyContent: "space-between",
            padding: 12,
            maxHeight: 46,
          }}
        >
          <Space>
            {selectedCoin ? (
              selectedCoin.logo_url ? (
                <Avatar src={selectedCoin?.logo_url} />
              ) : (
                <StopOutlined
                  style={{
                    fontSize: 24,
                    backgroundColor: "white",
                    borderRadius: "50%",
                    color: "gray",
                  }}
                />
              )
            ) : (
              <></>
            )}
            <span>
              {selectedCoin
                ? selectedCoin?.name +
                  " - " +
                  balance +
                  " $" +
                  selectedCoin?.symbol
                : props.placeholder || "Select a coin"}
            </span>
          </Space>
          <DownOutlined style={{ alignSelf: "center", color: "gray" }} />
        </a>
      </Dropdown>
    </div>
  );
}
