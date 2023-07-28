import {
  Row,
  Col,
  Input,
  notification,
  InputProps,
  Modal,
  Divider,
  List,
  Avatar,
  Dropdown,
  Space,
} from "antd";
import {
  SearchOutlined,
  DownOutlined,
  StopOutlined,
  CopyOutlined,
  LockOutlined,
} from "@ant-design/icons";
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { CoinInformation } from "../models/CoinInformation";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { AptosClient } from "aptos";
import { CoinListClient, NetworkType } from "../libs/CoinListClient";
import { getAptosClient } from "../config/config";
import { DEXes } from "./DexDropdown";
import { useRouter } from "next/router";

export const SpanLink = styled.span`
  color: gray;
  cursor: pointer !important;
  text-decoration: none;
  font-size: 14px !important;

  &:hover {
    color: #333;
  }
`;

export const HoverableListItem = styled.div`
  padding: 0 24px;
  cursor: pointer !important;

  &:hover {
    background-color: #dcdee0;
  }
`;

function formatUnits(
  val: string,
  coinDecimals: number,
  keepDecimals: number = 4
) {
  return (
    Math.trunc(
      (+val / Math.pow(10, coinDecimals)) * Math.pow(10, keepDecimals)
    ) / Math.pow(10, keepDecimals)
  );
}

function getDexLogo(type: string) {
  const [, d] = type.split(/(.*)<(.*)>/gi);
  return Object.values(DEXes).find((v) => v.address === d)?.logo;
}

export type CurrencyInputProps = {
  onChange?: (coin: CoinInformation) => void;
  onMyCoinReceived?: (coins: CoinInformation[]) => void;
  coinFilter?: (coin: CoinInformation) => boolean;
  disableInput?: boolean;
  selectedCoinType?: string;
  disabledCoin?: string;
  showBalance?: boolean;
  hideUnit?: boolean;
  max?: string;
  label?: string;
  icon?: React.ReactNode;
  refreshRequired?: boolean;
} & Omit<InputProps, "onChange">;

function CurrencyInput(props: CurrencyInputProps) {
  const {
    disableInput,
    value,
    selectedCoinType,
    onChange,
    disabledCoin,
    hideUnit,
    max,
    showBalance,
    label,
    icon,
    min,
    readOnly,
    disabled,
    onMyCoinReceived,
    refreshRequired,
    coinFilter: filter,
    ...rest
  } = props;

  const { account, connected, network, disconnect } = useWallet();

  const [aptosClient, setAptosClient] = useState<AptosClient>();
  const [coins, setCoins] = useState<CoinInformation[]>([]);
  const [selectedCoin, selectCoin] = useState<CoinInformation>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coinFilter, setCoinFilter] = useState("");
  const [validationRequired, setValidationRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const localOnChange = (val: string, coin?: CoinInformation) => {
    setValidationRequired(!validationRequired);
    coin && (coin.value = +val * Math.pow(10, coin.decimals) + "");
    coin && onChange && onChange(coin);
  };

  const router = useRouter();

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

  useEffect(() => {
    (async () => {
      if (!connected || !account || !aptosClient) return;
      try {
        setIsLoading(true);
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
              value: undefined,
              balance: +(r.data as any).coin.value,
              ...listClient.getCoinInfoByFullName(
                r.type.replace(/0x1::coin::CoinStore\<(.*)\>/gi, "$1")
              ),
            } as unknown as CoinInformation;
          });

        const coins = await Promise.all(await tasks);
        setCoins(coins);
        onMyCoinReceived && onMyCoinReceived(coins);
        if (coins.length) {
          if (selectedCoinType)
            selectCoin(coins.find((c) => c.type === selectedCoinType));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [
    account,
    aptosClient,
    connected,
    listClient,
    onMyCoinReceived,
    selectedCoinType,
    refreshRequired,
  ]);

  const status = useMemo(() => {
    const st =
      (value || selectedCoin?.value || 0) >
      (+max! || (showBalance && selectedCoin?.balance) || 0)
        ? "error"
        : "";

    return st;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    value,
    max,
    showBalance,
    selectedCoin?.balance,
    selectedCoin?.value,
    validationRequired,
  ]);

  return !disableInput ? (
    <>
      <Row style={{ border: "1px", borderColor: "silver" }}>
        <Col span={24}>
          <Input
            {...rest}
            bordered={true}
            size="large"
            placeholder="0.00"
            readOnly={readOnly}
            type="number"
            disabled={disabled}
            width={"100%"}
            value={
              value ||
              (selectedCoin
                ? formatUnits(selectedCoin?.value!, selectedCoin?.decimals!, 6)
                : "")
            }
            status={status}
            max={
              +max! ||
              (showBalance && selectedCoin?.balance
                ? formatUnits(selectedCoin.balance, selectedCoin.decimals, 6)
                : -1)
            }
            min={min || 0}
            style={{ fontSize: "20px", color: "#666" }}
            prefix={
              <Row
                gutter={2}
                style={{
                  minWidth: "98px",
                  backgroundColor: "#dbdee0",
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 4,
                  paddingBottom: 4,
                  borderRadius: 8,
                  marginRight: 8,
                  cursor: "default",
                }}
                onClick={() => setIsModalOpen(true)}
              >
                <Col
                  style={{
                    alignItems: "center",
                    display: "flex",
                    marginRight: 8,
                  }}
                >
                  {icon ||
                    (selectedCoin?.logo_url ? (
                      <img
                        src={selectedCoin?.logo_url}
                        alt={selectedCoin?.name}
                        style={{ verticalAlign: "bottom" }}
                        width={20}
                      />
                    ) : selectedCoin ? (
                      <StopOutlined
                        style={{
                          fontSize: 24,
                          backgroundColor: "white",
                          borderRadius: "50%",
                          color: "gray",
                        }}
                      />
                    ) : null)}
                </Col>
                <Col
                  style={{
                    fontSize: 16,
                    fontWeight: 480,
                    color: "#333",
                    alignItems: "center",
                    display: "flex",
                  }}
                >
                  {label || selectedCoin?.symbol || "Select coin"}
                  {/* <span
                    dangerouslySetInnerHTML={{
                      __html: label || selectedCoin?.symbol,
                    }}
                  ></span> */}
                </Col>
                <Col>
                  <DownOutlined size={20} />
                </Col>
              </Row>
            }
            onChange={(e) => {
              localOnChange(e.target.value, selectedCoin);
            }}
            suffix={
              showBalance && selectedCoin?.balance ? (
                <SpanLink
                  style={{ fontSize: 14 }}
                  onClick={() =>
                    localOnChange(
                      formatUnits(
                        selectedCoin?.balance!,
                        selectedCoin.decimals,
                        4
                      ).toString(),
                      selectedCoin
                    )
                  }
                >
                  {"Bal: "}
                  {selectedCoin.balance &&
                    formatUnits(selectedCoin.balance, selectedCoin.decimals, 2)}
                </SpanLink>
              ) : (
                <span style={{ fontSize: 14 }}>
                  {!hideUnit ? selectedCoin?.symbol : ""}
                </span>
              )
            }
            color="#ccc"
          />
        </Col>
      </Row>
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => setIsModalOpen(false)}
        footer={null}
        title="Select a coin"
        className="coinListModal"
      >
        <div style={{ paddingLeft: 24, paddingRight: 24 }}>
          <Input
            size="large"
            allowClear
            placeholder="Search by name or address"
            onChange={(e) => setCoinFilter(e.target.value)}
            prefix={<SearchOutlined />}
          />
        </div>
        <Divider style={{ marginBottom: 0 }} />
        <List
          style={{ maxHeight: "50vh", overflowY: "scroll" }}
          itemLayout="horizontal"
          dataSource={filteredCoins}
          loading={isLoading}
          renderItem={(item) => (
            <HoverableListItem>
              <List.Item
                style={{ opacity: disabledCoin === item.type ? 0.4 : 1 }}
                onClick={() => {
                  if (disabledCoin !== item.type) {
                    selectCoin(item);
                    setValidationRequired(!validationRequired);
                    onChange && onChange(item);
                    setIsModalOpen(false);
                  }
                }}
              >
                <List.Item.Meta
                  avatar={
                    <>
                      {item.logo_url ? (
                        <Avatar src={item.logo_url} />
                      ) : (
                        <StopOutlined
                          style={{
                            fontSize: 28,
                            backgroundColor: "white",
                            borderRadius: "50%",
                            color: "gray",
                          }}
                        />
                      )}
                    </>
                  }
                  title={
                    <strong>
                      {item.symbol}
                      {network && network.name?.toLowerCase() !== "mainnet" && (
                        <CopyOutlined
                          onClick={(e) => {
                            e.preventDefault();
                            navigator.clipboard.writeText(item.type);
                          }}
                          title="Copy address"
                          style={{
                            color: "lightgray",
                            fontSize: 12,
                            verticalAlign: "top",
                          }}
                        />
                      )}
                    </strong>
                  }
                  description={
                    <span
                      style={{
                        color:
                          disabledCoin === item.type ? "lightgray" : "auto",
                      }}
                    >
                      {item.name}
                    </span>
                  }
                />

                <div>{formatUnits(item.balance!, item.decimals)}</div>
              </List.Item>
            </HoverableListItem>
          )}
        />
      </Modal>
    </>
  ) : (
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
        trigger={["click"]}
        menu={{
          items: filteredCoins.map((item, index) => ({
            key: index,
            label: (
              <>
                <div className="flex w-full">
                  <Space
                    style={{ width: "100%" }}
                    onClick={() => {
                      if (disabledCoin !== item.type) {
                        selectCoin(item);
                        setValidationRequired(!validationRequired);
                        onChange && onChange(item);
                        setIsModalOpen(false);
                      }
                    }}
                  >
                    <Avatar src={item.logo_url || getDexLogo(item.type)} />
                    <span>
                      {item.name} - ${item.symbol}
                    </span>
                  </Space>
                  <span
                    className="flex self-center"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push("/lock_coin?coin=" + item.type);
                    }}
                  >
                    <LockOutlined className="items-center flex text-[#4c9d92]" />
                    <span className="underline text-[#4c9d92]">Lock</span>
                  </span>
                </div>
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
              <Avatar
                src={selectedCoin?.logo_url || getDexLogo(selectedCoin.type)}
              />
            ) : (
              <></>
            )}
            <span>
              {selectedCoin?.name ||
                (filteredCoins.length === 0
                  ? "No data"
                  : label || "Select a Coin")}
            </span>
          </Space>
          <DownOutlined style={{ alignSelf: "center", color: "gray" }} />
        </a>
      </Dropdown>
    </div>
  );
}

export default CurrencyInput;
