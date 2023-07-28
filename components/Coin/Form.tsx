import { notification, Space, Spin, Steps } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { useWalletConnector } from "../../services/WalletService";
import { AptosClient, Types } from "aptos";
import { getAptosClient, getNetwork } from "../../config/config";
import {
  makeDepositForPayload,
  makeWithdrawPayload,
} from "../../services/FactoryService";
import { hexToU64 } from "../../libs/utils";
import Link from "next/link";
import { makePublishPackagePayload } from "../../services/ModuleService";

const { Step } = Steps;
const version = "v2";

interface ErrorMessages {
  symbol: string;
  name: string;
  decimals: string;
  total_supply: string;
}

interface CoinInformation {
  symbol: string;
  name: string;
  decimals: number;
  total_supply: number;
  owner: string;
}

const CreateCoinForm: React.FC = () => {
  const {
    account,
    signAndSubmitTransaction,
    connected,
    wallet: currentWallet,
    network,
    signMessage,
    signTransaction,
    disconnect,
  } = useWallet();
  const [txLoading, setTxLoading] = useState({
    sign: false,
    transaction: false,
  });
  const [hasFee, setHasFee] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [txLinks, setTxLinks] = useState<string[]>([]);
  const [getButtonText, setButtonText] = useState("");
  const [errorMessages, setErrorMessages] = useState({} as ErrorMessages);
  const [coinInfo, setCoinInfo] = useState({} as CoinInformation);
  const [coinCode, setCoinCode] = useState("");
  const [aptosClient, setAptosClient] = useState<AptosClient>();
  const [resources, setResources] = useState<Types.MoveResource[]>([]);

  const {
    actions: { setModalOpen },
  } = useWalletConnector();

  useMemo(() => {
    if (connected && network) {
      try {
        setAptosClient(getAptosClient(network.name!));
      } catch (e) {
        disconnect();
      }
    }
  }, [connected, disconnect, network]);

  useEffect(() => {
    if (!connected || !account) {
      setButtonText("Connect Wallet");
    } else {
      switch (currentStep) {
        case 0:
          setButtonText("Deposit Fee");
          break;
        case 1:
          setButtonText("Submit Coin Information");
          break;
        case 2:
          setButtonText("Withdraw Your Coins");
          break;
        case 3:
          setButtonText("");
          break;
      }
    }
  }, [account, connected, currentStep]);

  useMemo(() => {
    (async () => {
      if (!connected || !aptosClient) return;
      const res = await aptosClient.getAccountResources(
        process.env.NEXT_PUBLIC_FACTORY_V2_RESOURCE_ADDRESS!
      );
      setResources(
        res.filter(
          (r) =>
            r.type.includes("Owner") ||
            r.type.includes("InfoStore") ||
            r.type.includes("ConfigurationV1")
        )
      );
    })();
  }, [aptosClient, connected]);

  useEffect(() => {
    (async () => {
      if (!resources || resources.length == 0) return;
      // price
      const { data } = resources.find(
        (r) =>
          r.type ===
          `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS!}::config::ConfigurationV1`
      )!;

      const price =
        hexToU64((data as any).config.map.data[0].value.value) /
        Math.pow(10, 8);

      const balanceStore: {
        data: any;
      } = resources.find(
        (r) =>
          r.type ===
          `${process.env
            .NEXT_PUBLIC_FACTORY_ADDRESS!}::factory_${version}::OwnerBalances`
      ) as any;

      const balance = await aptosClient!.getTableItem(
        balanceStore.data.balances.inner.handle,
        {
          key_type: "address",
          value_type: "u64",
          key: account?.address,
        }
      );

      setHasFee(balance >= price);
      if (hasFee) setCurrentStep(1);
      if (coinCode) setCurrentStep(2);

      // TODO: To be removed.
      // setCurrentStep(3);
      // setCoinCode(
      //   "0xa7e7eb1e958410b576b55e202243928941716de0c141c645c51db387e7229808::coins_FUCKSEC_0976::FUCKSEC"
      // );
    })();
  }, [account?.address, aptosClient, coinCode, hasFee, resources]);

  async function make_coin_v2() {
    setTxLoading({
      ...txLoading,
      transaction: true,
    });
    const isProd = process.env.NODE_ENV === "production";
    const prefix = isProd ? "https://build.aptools.xyz" : "";
    try {
      const res = await fetch(`${prefix}/api/coin_create.v2/`, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          ...coinInfo,
          owner: account?.address?.toString(),
          network: getNetwork(network.name!.toLowerCase()),
        }),
      });
      if (!res.ok)
        throw new Error("Unable to make coins, please contact administrator.");
      const json = await res.json();
      const { output: code, meta: metaData, module: moduleData } = json;

      const payload = makePublishPackagePayload(metaData, moduleData);
      const transactionRes = await signAndSubmitTransaction(payload);
      await aptosClient!.waitForTransactionWithResult(
        transactionRes?.hash || "",
        {
          checkSuccess: true,
        }
      );

      setCoinCode(code);
      setCurrentStep(2);
      notification["success"]({
        message: "Coins Created!",
        description:
          "Your coin has been created, please follow next step to withdraw to your wallet.",
      });
    } catch (e) {
      notification["error"]({
        message: "Error creating coin",
        description: (e as any).message,
      });
      console.error(e);
    } finally {
      setTxLoading({
        ...txLoading,
        transaction: false,
      });
    }
  }

  async function make_coin() {
    setTxLoading({
      ...txLoading,
      transaction: true,
    });
    const isProd = process.env.NODE_ENV === "production";
    const prefix = isProd ? "https://build.aptools.xyz" : "";
    try {
      const res = await fetch(`${prefix}/api/coin_create/`, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          ...coinInfo,
          owner: account?.address?.toString(),
          network: getNetwork(network.name!.toLowerCase()),
        }),
      });
      if (!res.ok)
        throw new Error("Unable to make coins, please contact administrator.");
      const code = (await res.json()).output;
      setCoinCode(code);
      setCurrentStep(2);
      notification["success"]({
        message: "Coins Created!",
        description:
          "Your coin has been created, please follow next step to withdraw to your wallet.",
      });
    } catch (e) {
      notification["error"]({
        message: "Error creating coin",
        description: (e as any).message,
      });
      console.error(e);
    } finally {
      setTxLoading({
        ...txLoading,
        transaction: false,
      });
    }
  }

  async function handle() {
    if (!connected) return setModalOpen(true);
    if (!coinCode && !hasFee) await deposit_fee_for();
    if (validate_coin_info() && !coinCode) await make_coin();
    if (currentStep == 2 && coinCode) await withdraw();
    if (currentStep == 3 && coinCode) {
      navigator.clipboard.writeText(coinCode);
      notification["success"]({
        message: "Success",
        description: "The code of your coin has copied to your clipboard!",
      });
    }
  }

  async function withdraw() {
    try {
      setTxLoading({
        ...txLoading,
        transaction: true,
      });

      const payload = makeWithdrawPayload(coinCode, version);
      const transactionRes = await signAndSubmitTransaction(payload);
      await aptosClient!.waitForTransaction(transactionRes?.hash || "", {
        checkSuccess: true,
      });
      const links = [
        ...txLinks,
        `https://explorer.${process.env.NEXT_PUBLIC_APTOS_ENV}.aptos.dev/txn/${transactionRes?.hash}`,
      ];
      setTxLinks(links);
      setCurrentStep(3);
      notification["success"]({
        message: "Coins withdrawn!",
        description:
          "Your coin has been withdrawn to your wallet, please check it. Now please copy the code and save it, fortune awaits!",
      });
    } catch (err) {
      console.log("tx error: ", (err as any).msg);
    } finally {
      setTxLoading({
        ...txLoading,
        transaction: false,
      });
    }
  }

  function updateCoinInfo(val: any) {
    setCoinInfo({ ...coinInfo, ...val });
  }

  function validate_coin_info() {
    const err = {} as ErrorMessages;
    err.symbol =
      !coinInfo.symbol ||
      coinInfo.symbol.length < 2 ||
      coinInfo.symbol.length > 8
        ? "Symbol is invalid."
        : "";

    err.name =
      !coinInfo.name || coinInfo.name.length < 3 || coinInfo.name.length > 16
        ? "Name is invalid."
        : "";

    err.decimals =
      isNaN(coinInfo.decimals) || coinInfo.decimals > 8
        ? "Decimals is invalid."
        : "";

    err.total_supply = !coinInfo.total_supply ? "TotalSupply is invalid." : "";
    setErrorMessages(err);

    return !Object.keys(err).some((k) => (err as any)[k]);
  }

  async function deposit_fee_for() {
    try {
      setTxLoading({
        ...txLoading,
        transaction: true,
      });

      const payload = makeDepositForPayload(version);
      const txOptions = {
        max_gas_amount: "1000",
        gas_unit_price: "1",
      };
      const transactionRes = await signAndSubmitTransaction(payload, txOptions);
      await aptosClient!.waitForTransaction(
        transactionRes?.hash || ", {checkSuccess: true}"
      );
      const links = [
        ...txLinks,
        `https://explorer.${process.env.NEXT_PUBLIC_APTOS_ENV}.aptos.dev/txn/${transactionRes?.hash}`,
      ];
      setTxLinks(links);
      setHasFee(true);
      notification["success"]({
        message: "Fee Deposited!",
        description:
          "Your fee has been deposited successfully, now please fill in the form to continue.",
      });
    } catch (err) {
      console.log("tx error: ", (err as any).msg);
    } finally {
      setTxLoading({
        ...txLoading,
        transaction: false,
      });
    }
  }

  function renderForm() {
    return (
      <>
        <label className="block">
          <span className="text-black-700">Coin Symbol: </span>
          <span className="text-red-700 ml-2">
            {errorMessages.symbol || ""}
          </span>
          <input
            disabled={!hasFee}
            type="text"
            required
            maxLength={8}
            minLength={2}
            className="
          mt-1
          block
          w-full
          rounded-md
          border-black-500
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
        "
            value={coinInfo.symbol || ""}
            placeholder="BTC"
            onChange={(e) =>
              updateCoinInfo({ symbol: e.target.value.toUpperCase() })
            }
          />
        </label>
        <label className="block">
          <span className="text-black-700">Coin Name: </span>
          <span className="text-red-700 ml-2">{errorMessages.name || ""}</span>
          <input
            required
            maxLength={20}
            type="text"
            disabled={!hasFee}
            className="
          mt-1
          block
          w-full
          rounded-md
          border-black-500
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
        "
            value={coinInfo.name || ""}
            onChange={(e) =>
              updateCoinInfo({
                name: e.target.value
                  .split(" ")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" "),
              })
            }
            placeholder="Bitcoin"
          />
        </label>
        <label className="block">
          <span className="text-black-700">Decimals: </span>
          <span className="text-red-700 ml-2">
            {errorMessages.decimals || ""}
          </span>
          <input
            required
            type="number"
            placeholder="6"
            max={18}
            min={0}
            disabled={!hasFee}
            className="
          mt-1
          block
          w-full
          rounded-md
          border-black-300
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
        "
            value={coinInfo.decimals || ""}
            onChange={(e) =>
              updateCoinInfo({ decimals: Math.abs(+e.target.value) })
            }
          />
        </label>
        <label className="block">
          <span className="text-black-700">Total Supply: </span>
          <span className="text-red-700 ml-2">
            {errorMessages.total_supply || ""}
          </span>
          <input
            type="number"
            required
            placeholder="21000000"
            max={18_446_744_073_709_551_615}
            min={1}
            disabled={!hasFee}
            className="
          mt-1
          block
          w-full
          rounded-md
          border-black-300
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
        "
            value={coinInfo.total_supply || ""}
            onChange={(e) =>
              updateCoinInfo({ total_supply: Math.abs(+e.target.value) })
            }
          />
        </label>
      </>
    );
  }

  return (
    <div className="p-6 md:px-10">
      <h2 className="text-2xl font-bold">Aptos Coin Maker</h2>
      <div className="mt-6">
        <div className="grid grid-cols-1 gap-6">
          {connected && account ? (
            coinCode ? (
              <>
                <p className="block flex place-content-center ">
                  <img
                    alt="Aptos Coin Maker"
                    src="/svgs/aptos-o.svg"
                    className="w-48 animate-pulse drop-shadow-lg"
                  />
                </p>
                <p className="block flex place-content-center text-green-200">
                  Your coin has been created, please withdraw to your wallet.
                </p>
              </>
            ) : !hasFee ? (
              <>
                <p className="block flex place-content-center ">
                  <img
                    alt="Aptos Coin Maker"
                    src="/svgs/aptos-o.svg"
                    className="w-48  motion-reduce:animate-spin drop-shadow-lg"
                  />
                </p>
                <p className="block flex place-content-center text-green-200">
                  Please deposit fee first to continue.
                </p>
              </>
            ) : (
              renderForm()
            )
          ) : (
            renderForm()
          )}

          {currentStep == 3 && (
            <label className="block">
              <span className="text-black-700">
                Your Coin Code: (click to copy)
              </span>
              <input
                required
                readOnly
                onClick={() => {
                  navigator.clipboard.writeText(coinCode);
                  notification["success"]({
                    message: "Success",
                    description:
                      "The code of your coin has copied to your clipboard!",
                  });
                }}
                type="text"
                className="
                cursor-copy
                mt-1
                block
                w-full
                rounded-md
                border-black-500
                bg-gray-200
                shadow-sm
                focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
              "
                value={coinCode || ""}
              />
            </label>
          )}

          <div className="block sm:block hidden">
            <div className="mt-2">
              <div>
                <Steps current={currentStep}>
                  <Step title="Pay Fee" />
                  <Step title="Coin Info" />
                  <Step title="Withdraw" />
                  <Step title="Done" />
                </Steps>
              </div>
            </div>
          </div>

          <div className="block place-content-center mt-4">
            {getButtonText ? (
              <a
                href="#"
                onClick={handle}
                rel="noreferrer"
                className="flex justify-center
              focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
              bg-[#14161A] max-h-[48px] text-white px-9 py-[13px]  text-[17px] leading-[120%] rounded-[100px] hover:cursor-pointer hover:opacity-[0.92] font-medium"
              >
                {txLoading.transaction ? (
                  <Spin
                    indicator={
                      <LoadingOutlined style={{ fontSize: 24 }} spin />
                    }
                  />
                ) : (
                  <img src="/svgs/aptos-o.svg" alt="Process" width={24} />
                )}
                <span className="ml-2">{getButtonText}</span>
              </a>
            ) : (
              <>
                <Space className="w-full flex justify-center">
                  <Link href={`/coin_airdrop?coin=${coinCode}`}>
                    <a
                      rel="noreferrer"
                      className="flex justify-center 
              focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
              bg-[#4c9d92] max-h-[48px] text-white px-9 py-[13px]  text-[17px] leading-[120%] rounded-[100px] hover:cursor-pointer hover:opacity-[0.92] font-medium"
                    >
                      Airdrop your coin
                    </a>
                  </Link>
                  <Link href={`/liquidity?coin2=${coinCode}`}>
                    <a
                      rel="noreferrer"
                      className="flex justify-center
              focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
              bg-[#14161A] max-h-[48px] text-white px-9 py-[13px]  text-[17px] leading-[120%] rounded-[100px] hover:cursor-pointer hover:opacity-[0.92] font-medium"
                    >
                      Add Liquidity
                    </a>
                  </Link>
                </Space>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCoinForm;
