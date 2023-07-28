import {
  Avatar,
  Card,
  Divider,
  InputNumber,
  Modal,
  notification,
  Slider,
  Space,
  Spin,
} from "antd";
import {
  LoadingOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import React, { useEffect, useMemo, useState, lazy } from "react";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { useWalletConnector } from "../../services/WalletService";
import CurrencyInput from "../CurrencyInput";
import DexDropdown, { DEX, DEXes } from "../DexDropdown";
import { CoinInformation } from "../../models/CoinInformation";
import { useDexHandler } from "./useDexHandler";
import { useRouter } from "next/router";

interface ErrorMessages {
  coin1?: string;
  coin2?: string;
  dex?: string;
}

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

const DexLPs = Object.values(DEXes).map((v) => v.address);
const isLP = (coin: CoinInformation) => {
  return (
    DexLPs.some((addr) => coin.type.includes(addr)) &&
    !!(coin.balance || coin.value)
  );
};
const isNotLP = (coin: CoinInformation) => {
  return (
    !DexLPs.some((addr) => coin.type.includes(addr)) &&
    !!(coin.balance || coin.value)
  );
};

const LiquidityForm: React.FC = () => {
  const { account, connected } = useWallet();
  const [txLoading, setTxLoading] = useState({
    sign: false,
    transaction: false,
  });
  const [txLinks, setTxLinks] = useState<string[]>([]);
  const [errorMessages, setErrorMessages] = useState({} as ErrorMessages);
  const [coin1, selectCoin1] = useState<CoinInformation>();
  const [coin2, selectCoin2] = useState<CoinInformation>();
  const [dex, setDex] = useState<DEX>();

  const [myCoins, setMyCoins] = useState<CoinInformation[]>([]);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [lpRemoval, setLpRemoval] = useState<number>();
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);
  const [isValidating, startValidation] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [changedCoin, setChangedCoin] = useState("");
  const [lpCoin, selectLpCoin] = useState<CoinInformation>();

  const {
    actions: { setModalOpen },
  } = useWalletConnector();

  const router = useRouter();
  const { coin2: coin2_type } = router.query;

  const {
    poolExisted,
    receivingLp,
    existingLiquidity,
    estimated,
    addLiquidity,
    removeLiquidity,
  } = useDexHandler(
    dex?.name!,
    coin1,
    coin2,
    myCoins,
    changedCoin,
    refreshRequired
  );

  if (coin1 && estimated.coin1) coin1.value = estimated.coin1;
  if (coin2 && estimated.coin2) coin2.value = estimated.coin2;

  const selectDex = (d: DEX) => {
    if (!d) return;
    if (dex && d.name === dex?.name) return;
    setDex(d);
  };

  const validate = (check = true) => {
    if (check && !isValidating) return false;

    const err = {} as ErrorMessages;
    if (!coin1 || !coin1.value) {
      err.coin1 = "Select a coin and enter an amount";
    } else {
      delete err.coin1;
    }
    if (!coin2 || !coin2.value) {
      err.coin2 = "Select a coin and enter an amount";
    } else {
      delete err.coin2;
    }
    if (!dex) {
      err.dex = "Select a DEX to operate with.";
    } else {
      delete err.dex;
    }

    setErrorMessages(err);
    const allValid = !Object.keys(err).some((k) => (err as any)[k]);
    return allValid;
  };

  useEffect(() => {
    validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin1, coin2, dex, isValidating, refreshRequired]);

  async function handle() {
    if (!connected) return setModalOpen(true);
    if (!ready) return false;
    startValidation(true);

    if (validate(false))
      Modal.confirm({
        title: "Confirm Adding Liquidity?",
        icon: <ExclamationCircleOutlined />,
        content:
          "Please make sure that everything has been checked correctly. Do you want to continue?",
        okText: "Confirm",
        cancelText: "Cancel",
        onOk: submit_add_liquidity_transaction,
      });
  }

  async function submit_add_liquidity_transaction() {
    try {
      setTxLoading({
        ...txLoading,
        transaction: true,
      });

      const transactionRes = await addLiquidity();
      if (!transactionRes) throw new Error("Transaction Failed.");

      const links = [
        ...txLinks,
        `https://explorer.${process.env.NEXT_PUBLIC_APTOS_ENV}.aptos.dev/txn/${transactionRes?.hash}`,
      ];
      setTxLinks(links);
      setRefreshRequired(!refreshRequired);
      notification["success"]({
        message: "Congrats!",
        description: `Your liquidity has been added to ${dex!.name}`,
      });
    } catch (err) {
      console.log("tx error: ", (err as any).msg || err);
    } finally {
      setTxLoading({
        ...txLoading,
        transaction: false,
      });
    }
  }

  async function removeLiquidityFromDEX() {
    if (!lpRemoval) return;

    try {
      setTxLoading({
        ...txLoading,
        transaction: true,
      });

      const transactionRes = await removeLiquidity(lpRemoval);
      if (!transactionRes) throw new Error("Transaction Failed.");

      const links = [
        ...txLinks,
        `https://explorer.${process.env.NEXT_PUBLIC_APTOS_ENV}.aptos.dev/txn/${transactionRes?.hash}`,
      ];
      setTxLinks(links);
      setRefreshRequired(!refreshRequired);
      notification["success"]({
        message: "Congrats!",
        description: `Your liquidity has been removed.`,
      });
      return true;
    } catch (err) {
      console.log("tx error: ", (err as any).msg || err);
      return false;
    } finally {
      setTxLoading({
        ...txLoading,
        transaction: false,
      });
    }
  }

  const [buttonText, ready] = useMemo(() => {
    if (!connected || !account) {
      return ["Connect Wallet", false];
    } else {
      if (!dex) return ["Choose a DEX", false];
      if (!coin1 || !coin2) return ["Select Pair", false];
      if (
        (coin1 && +coin1?.value! > +coin1.balance!) ||
        (coin2 && +coin2.value > +coin2?.balance!)
      )
        return ["Value exceeds balance", false];

      if (!poolExisted) return ["Create Pool", true];
      return ["Add Liquidity", true];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, coin1, coin2, connected, dex, poolExisted, refreshRequired]);

  async function splitLp(type: string) {
    if (!type) return;
    const [, d, coins] = type.split(/(.*)<(.*)>/gi);
    const [x, y, curve] = coins.split(", ");

    const _dex = Object.entries(DEXes).find(([n, v]) => v.address === d);
    const coin_x = myCoins.find((c) => c.type === x);
    const coin_y = myCoins.find((c) => c.type === y);

    if (_dex) selectDex({ name: _dex[0], ..._dex[1] });
    if (coin_x) selectCoin1(coin_x);
    if (coin_y) selectCoin2(coin_y);
  }

  function renderForm() {
    return (
      <>
        <label className="bvesting">
          <span className="text-black-700">Select Existing Liquidity:</span>
          <CurrencyInput
            label="Select a Pair"
            refreshRequired={refreshRequired}
            showBalance={true}
            onMyCoinReceived={setMyCoins}
            coinFilter={isLP}
            disableInput={true}
            value={lpCoin?.type}
            onChange={(c) => {
              setRefreshRequired(!refreshRequired);
              selectLpCoin(c);
              splitLp(c.type);
            }}
          />
        </label>

        <label className="bvesting">
          <span className="text-black-700">Select a DEX:</span>
          <span className="text-red-700 ml-2">{errorMessages.dex || ""}</span>

          <DexDropdown value={dex?.address} onChange={(d) => selectDex(d)} />
        </label>

        <label className="bvesting">
          <span className="text-black-700">Select a coin:</span>
          <span className="text-red-700 ml-2">{errorMessages.coin1 || ""}</span>
          <CurrencyInput
            refreshRequired={refreshRequired}
            showBalance={true}
            disabledCoin={coin2?.type}
            coinFilter={isNotLP}
            value={formatUnits(
              estimated?.coin1 || coin1?.value!,
              coin1?.decimals!,
              8
            )}
            selectedCoinType={coin1?.type || "0x1::aptos_coin::AptosCoin"}
            onChange={(c) => {
              setChangedCoin(c.type);
              setRefreshRequired(!refreshRequired);
              selectCoin1(c);
            }}
          />
        </label>

        <label className="bvesting">
          <span className="text-black-700">Select another coin:</span>
          <span className="text-red-700 ml-2">{errorMessages.coin2 || ""}</span>
          <CurrencyInput
            refreshRequired={refreshRequired}
            coinFilter={isNotLP}
            showBalance={true}
            value={formatUnits(
              estimated?.coin2 || coin2?.value!,
              coin2?.decimals!,
              8
            )}
            selectedCoinType={coin2?.type || (coin2_type as string)}
            onChange={(c) => {
              setChangedCoin(c.type);
              setRefreshRequired(!refreshRequired);
              selectCoin2(c);
            }}
            disabledCoin={coin1?.type}
          />
        </label>

        {existingLiquidity && (
          <>
            <Modal
              title="Remove Liquidity"
              open={showRemovalModal}
              okText="Remove Liquidity"
              confirmLoading={isRemovingLiquidity}
              onOk={async () => {
                setIsRemovingLiquidity(true);
                if (await removeLiquidityFromDEX()) setShowRemovalModal(false);
                setIsRemovingLiquidity(false);
              }}
              onCancel={() => setShowRemovalModal(false)}
            >
              <Space
                direction="vertical"
                style={{ width: "100%", marginTop: 12 }}
              >
                <p>Please specify how much liquidity you'd like to remove.</p>

                <Slider
                  marks={{
                    [+formatUnits(
                      existingLiquidity.lpCoin?.balance!,
                      existingLiquidity.lpCoin?.decimals!
                    ) * 0]: "0",
                    [+formatUnits(
                      existingLiquidity.lpCoin?.balance!,
                      existingLiquidity.lpCoin?.decimals!
                    ) * 0.25]: "25%",
                    [+formatUnits(
                      existingLiquidity.lpCoin?.balance!,
                      existingLiquidity.lpCoin?.decimals!
                    ) / 2]: "50%",
                    [+formatUnits(
                      existingLiquidity.lpCoin?.balance!,
                      existingLiquidity.lpCoin?.decimals!
                    ) * 0.75]: "75%",
                    [+formatUnits(
                      existingLiquidity.lpCoin?.balance!,
                      existingLiquidity.lpCoin?.decimals!
                    )]: "All",
                  }}
                  min={0}
                  max={formatUnits(
                    existingLiquidity.lpCoin?.balance!,
                    existingLiquidity.lpCoin?.decimals!
                  )}
                  // onChange={changePercentage}
                  defaultValue={formatUnits(
                    existingLiquidity.lpCoin?.balance!,
                    existingLiquidity.lpCoin?.decimals!
                  )}
                  value={lpRemoval || undefined}
                  onChange={(v) => setLpRemoval(v)}
                />
                <label>
                  Total LP amount to be removed:
                  <InputNumber
                    min={0}
                    max={formatUnits(
                      existingLiquidity.lpCoin?.balance!,
                      existingLiquidity.lpCoin?.decimals!
                    )}
                    style={{ margin: "0 12px", width: 160 }}
                    step={0.01}
                    addonAfter={
                      <span
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setLpRemoval(
                            formatUnits(
                              existingLiquidity.lpCoin?.balance!,
                              existingLiquidity.lpCoin?.decimals!
                            )
                          )
                        }
                      >
                        Max
                      </span>
                    }
                    defaultValue={formatUnits(
                      existingLiquidity.lpCoin?.balance!,
                      existingLiquidity.lpCoin?.decimals!
                    )}
                    value={lpRemoval}
                    onChange={(v) => setLpRemoval(v!)}
                  />
                </label>
              </Space>
            </Modal>
            <label className="bvesting">
              <div className="bvesting flex flex-row">
                <Card size="small" style={{ width: "100%" }}>
                  <Space
                    style={{
                      width: "100%",
                      justifyContent: "space-evenly",
                    }}
                    split={<Divider type="vertical" />}
                  >
                    <p>
                      <strong>
                        <Avatar
                          size={16}
                          style={{ marginRight: 4 }}
                          src={existingLiquidity.coin_x.logo_url}
                        />
                        {existingLiquidity.coin_x.symbol}:{" "}
                      </strong>
                      {formatUnits(
                        existingLiquidity.coin_x.value,
                        existingLiquidity.coin_x.decimals,
                        0
                      )}
                    </p>
                    <p>
                      <strong>
                        <Avatar
                          size={16}
                          style={{ marginRight: 4 }}
                          src={existingLiquidity.coin_y.logo_url}
                        />
                        {existingLiquidity.coin_y.symbol}:{" "}
                      </strong>
                      {formatUnits(
                        existingLiquidity.coin_y.value,
                        existingLiquidity.coin_y.decimals,
                        0
                      )}
                    </p>
                  </Space>
                  {receivingLp || existingLiquidity.lpCoin?.balance ? (
                    <Space
                      style={{ width: "100%", justifyContent: "space-evenly" }}
                      split={<Divider type="vertical" />}
                    >
                      <p>
                        <strong>Current LP: </strong>
                        {existingLiquidity.lpCoin?.balance && (
                          <u
                            style={{ cursor: "pointer" }}
                            title="Click to remove this liquidity"
                            onClick={() => {
                              setLpRemoval(
                                formatUnits(
                                  existingLiquidity!.lpCoin?.balance!,
                                  existingLiquidity!.lpCoin?.decimals!
                                )
                              );
                              setShowRemovalModal(true);
                            }}
                          >
                            {formatUnits(
                              existingLiquidity.lpCoin?.balance,
                              dex!.decimals,
                              4
                            ) || 0}
                            <DeleteOutlined
                              style={{
                                color: "red",
                                verticalAlign: "baseline",
                              }}
                            />
                          </u>
                        )}
                      </p>
                      <p>
                        <strong>Min Receiving LP: </strong>
                        {receivingLp && !isNaN(+receivingLp)
                          ? formatUnits(receivingLp, dex!.decimals, 4)
                          : "0"}
                      </p>
                    </Space>
                  ) : (
                    <></>
                  )}
                </Card>
              </div>
            </label>
          </>
        )}
      </>
    );
  }

  return (
    <div className="py-6 pl-6 xs:py-4 xs:pl-2">
      <h2 className="text-2xl font-bold">Liquidity Management</h2>
      <div className="mt-6 max-w-md xs:max-w-[96%] sm:max-w-[96%] ">
        <div className="grid grid-cols-1 gap-6">
          {renderForm()}
          <div className="bvesting place-content-center mt-4">
            <a
              href="#"
              style={{ color: !ready ? "gray" : "white" }}
              onClick={handle}
              rel="noreferrer"
              className="flex justify-center
              focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
              bg-[#14161A] max-h-[48px] text-white px-6 py-[13px]  text-[17px] leading-[120%] rounded-[100px] hover:cursor-pointer hover:opacity-[0.92] font-medium"
            >
              {txLoading.transaction ? (
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
                />
              ) : (
                <img
                  style={{ opacity: !ready ? "0.5" : "1" }}
                  src="/svgs/aptos-o.svg"
                  alt="Process"
                  width={24}
                />
              )}
              <span className="ml-2">{buttonText}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiquidityForm;
