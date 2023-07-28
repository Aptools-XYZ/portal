import React, { useEffect, useMemo, useState } from "react";
import { VESTING_CLAIM_SECTION } from "config/constants";
import { AptosClient, Types } from "aptos";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { useWalletConnector } from "../../services/WalletService";
import { getAptosClient } from "../../config/config";
import { useRouter } from "next/router";
import { notification, Spin, Steps } from "antd";
import { LoadingOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { makeVestingClaimPayload } from "../../services/VestingService";
import moment from "moment";
import { CoinInformation } from "../../models/CoinInformation";

const { Step } = Steps;

interface VestingInfo {
  id: string;
  from_seconds: number;
  to_seconds: number;
  created_at: number;
  addresses: number;
  owner: Types.Address;
  amount: string;
  handle: string;
}

interface VestingItem {
  total: number;
  claimed: number;
  cliff: number;
  claimable: number;
}

function calculatePayroll(
  from_seconds: number,
  to_seconds: number,
  total: number,
  claimed: number,
  cliff: number
) {
  const val =
    (+total * (new Date().getTime() / 1000 - from_seconds - +cliff)) /
      (to_seconds - from_seconds - cliff) -
    claimed;

  return val;
}

const VestingClaimComp: React.FC = () => {
  const { title, des, steps } = VESTING_CLAIM_SECTION;
  const {
    account,
    signAndSubmitTransaction,
    connected,
    wallet: currentWallet,
    network,
    signMessage,
    signTransaction,
  } = useWallet();
  const [txLoading, setTxLoading] = useState({
    sign: false,
    transaction: false,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [txLinks, setTxLinks] = useState<string[]>([]);
  const [getButtonText, setButtonText] = useState("");
  const [aptosClient, setAptosClient] = useState<AptosClient>();
  const [selectedCoin, selectCoin] = useState<CoinInformation>();
  const [vesting, setVesting] = useState<VestingInfo>();
  const [vestingItem, setVestingItem] = useState<VestingItem>();
  const [isReloadRequired, setIsReloadRequired] = useState(false);
  const [payroll, setPayroll] = useState(0);
  const router = useRouter();
  const { currency, index } = router.query;
  const {
    actions: { setModalOpen },
  } = useWalletConnector();

  useMemo(() => {
    if (connected && network) setAptosClient(getAptosClient(network.name!));
  }, [connected, network]);

  useEffect(() => {
    if (!connected || !account) {
      setButtonText("Connect Wallet");
    } else {
      switch (currentStep) {
        case 0:
          setButtonText(
            vestingItem?.claimable! <= 0
              ? "Sorry, nothing to claim."
              : "Claim Your Coins"
          );
          break;
        case 1:
          setButtonText("Congrats, All set.");
          break;
      }
    }
  }, [account, connected, currentStep, vestingItem]);

  useEffect(() => {
    (async () => {
      if (!connected || !account || !aptosClient || !currency) return;
      try {
        // retrieve coin information
        const { data } = await aptosClient.getAccountResource(
          currency.toString().split("::")[0],
          `0x1::coin::CoinInfo<${currency}>`
        );
        const coin = {
          ...data,
          type: currency,
          total_supply: 0,
        } as unknown as CoinInformation;
        selectCoin(coin);

        // retrieve vesting information.
        const store = await aptosClient.getAccountResource(
          process.env.NEXT_PUBLIC_VESTING_RESOURCE_ADDRESS!,
          `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS!}::vesting::InfoStore`
        );
        const handle = (store.data as any).store.inner.handle;
        try {
          const res = await aptosClient.getTableItem(handle, {
            key_type: "u64",
            value_type: `${process.env
              .NEXT_PUBLIC_FACTORY_ADDRESS!}::vesting::VestingInfo`,
            key: index,
          });
          const vesting = {
            id: index,
            handle: res.list.inner.handle,
            addresses: res.list.length,
            amount: res.amount,
            owner: res.owner,
            from_seconds: +res.from_seconds,
            to_seconds: +res.to_seconds,
            created_at: +res.created_at,
            withdrawn_at: res.withdrawn_at,
          } as VestingInfo;

          setVesting(vesting);
        } catch (e) {
          console.error(e);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [account, aptosClient, connected, currency, index]);

  useEffect(() => {
    (async () => {
      if (!aptosClient || !vesting || !account || !selectedCoin) return;

      try {
        const res = await aptosClient.getTableItem(vesting.handle, {
          key_type: "address",
          value_type: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::vesting::VestingItem`,
          key: account.address,
        });
        const item = {
          total: +res.total,
          claimed: +res.claimed,
          cliff: +res.cliff / 86400, // in days
          claimable: 0,
        } as VestingItem;
        item.claimable = calculatePayroll(
          vesting.from_seconds,
          vesting.to_seconds,
          item.total,
          item.claimed,
          item.cliff
        );
        setVestingItem(item);
        // setCurrentStep(1)
      } catch (e) {
        console.error(e);
      }
    })();
  }, [
    account,
    aptosClient,
    connected,
    selectedCoin,
    vesting,
    isReloadRequired,
  ]);

  async function handle() {
    if (!connected) return setModalOpen(true);
    if (currentStep == 0) return await claim();
  }

  async function claim() {
    if (
      !aptosClient ||
      !vesting ||
      !account ||
      vestingItem?.claimable! <= 0 ||
      !selectedCoin
    )
      return;
    setTxLoading({
      ...txLoading,
      transaction: true,
    });
    setPayroll(
      calculatePayroll(
        vesting.from_seconds,
        vesting.to_seconds,
        vestingItem!.total,
        vestingItem!.claimed,
        vestingItem!.cliff
      )
    );

    try {
      const payload = makeVestingClaimPayload(selectedCoin?.type, +index!);
      const transactionRes = await signAndSubmitTransaction(payload);
      await aptosClient!.waitForTransactionWithResult(
        transactionRes?.hash || "",
        {
          checkSuccess: true,
        }
      );
      const links = [
        ...txLinks,
        `https://explorer.${process.env.NEXT_PUBLIC_APTOS_ENV}.aptos.dev/txn/${transactionRes?.hash}`,
      ];
      setTxLinks(links);
      setCurrentStep(2);
      notification["success"]({
        message: "Congrats!",
        description: `Your have claimed ${vestingItem!.claimable} $${
          selectedCoin.symbol
        }!`,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsReloadRequired(true);
      setTxLoading({
        ...txLoading,
        transaction: false,
      });
    }
  }

  function renderCheckQualification() {
    return (
      <>
        <label className="block">
          <span className="text-black-700">Reward Coin: </span>
          <input
            type="text"
            readOnly
            value={`${selectedCoin?.name} - $${selectedCoin?.symbol}`}
            className="mt-1
            bg-[#677489] text-white cursor-default
            block
            w-full
            rounded-md
            shadow-sm
            focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </label>
        <div className="2xl:flex 2xl:flex-row justify-between">
          <label className="block">
            <span className="text-black-700">From: </span>
            <input
              type="text"
              readOnly
              value={`${
                vesting
                  ? moment(vesting!.from_seconds * 1000).format(
                      "yyyy-MM-DD HH:mm"
                    )
                  : "N/A"
              }`}
              className="mt-1
            bg-[#677489] text-white cursor-default
            block
            w-full
            rounded-md
            shadow-sm
            focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </label>
          <label className="block">
            <span className="text-black-700">To: </span>
            <input
              type="text"
              readOnly
              value={`${
                vesting
                  ? moment(vesting!.to_seconds * 1000).format(
                      "yyyy-MM-DD HH:mm"
                    )
                  : "N/A"
              }`}
              className="mt-1
            bg-[#677489] text-white cursor-default
            block
            w-full
            rounded-md
            shadow-sm
            focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </label>
        </div>
        <div className="2xl:flex 2xl:flex-row justify-between">
          <label className="block">
            <span className="text-black-700">Total: </span>
            <input
              type="text"
              readOnly
              value={`${
                vestingItem
                  ? Math.round(
                      (+vestingItem!.total /
                        Math.pow(10, +selectedCoin?.decimals!)) *
                        10000
                    ) / 10000
                  : 0
              }`}
              className="mt-1
            bg-[#677489] text-white cursor-default
            block
            w-full
            rounded-md
            shadow-sm
            focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </label>
          <label className="block">
            <span className="text-black-700">Claimed: </span>
            <input
              type="text"
              readOnly
              value={`${
                vestingItem
                  ? Math.round(
                      (+vestingItem!.claimed /
                        Math.pow(10, +selectedCoin?.decimals!)) *
                        10000
                    ) / 10000
                  : 0
              }`}
              className="mt-1
            bg-[#677489] text-white cursor-default
            block
            w-full
            rounded-md
            shadow-sm
            focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-black-700">Claimable: </span>
          <input
            type="text"
            readOnly
            value={`${
              vestingItem
                ? vestingItem.claimable > 0
                  ? Math.round(
                      (+vestingItem!.claimable /
                        Math.pow(10, +selectedCoin?.decimals!)) *
                        10000
                    ) / 10000
                  : vestingItem.total > vestingItem.claimed
                  ? "Still in cliff"
                  : "You have claimed all."
                : "N/A"
            }`}
            className="mt-1
            bg-[#677489] text-white cursor-default
            block
            w-full
            rounded-md
            shadow-sm
            focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </label>
      </>
    );
  }

  function renderPreview() {
    return (
      <>
        <p className="text-black-500 animate-pulse font-bold">
          You have unclaimed coins, connect wallet to check it out.
        </p>

        <p className="block flex place-content-center ">
          <img
            alt="Aptos Coin Maker"
            src="/svgs/aptos-o.svg"
            className="w-48 animate-pulse drop-shadow-lg"
          />
        </p>
      </>
    );
  }

  function renderClaim() {
    return (
      <>
        {" "}
        <p className="text-white animate-pulse text-lg font-bold">
          Congratulations! <br />
          You have {vestingItem?.claimable} ${selectedCoin?.symbol} to claim!
        </p>
        <p className="block flex place-content-center ">
          <img
            alt="Aptos Coin Maker"
            src="/svgs/aptos-o.svg"
            className="w-48 animate-pulse drop-shadow-lg"
          />
        </p>
      </>
    );
  }

  function renderSuccess() {
    return (
      <>
        {" "}
        <p className="text-black animate-pulse text-lg font-bold">
          Congratulations! <br />
          You have claimed{" "}
          {Math.round(
            (payroll / Math.pow(10, selectedCoin?.decimals!)) * 10000
          ) / 10000}{" "}
          ${selectedCoin?.symbol}!
        </p>
        <p className="block flex place-content-center ">
          <img
            alt="Aptos Coin Maker"
            src="/svgs/aptos-o.svg"
            className="w-48 animate-pulse drop-shadow-lg"
          />
        </p>
      </>
    );
  }

  function renderInner() {
    return (
      <div className="py-6 pl-6 xs:py-4 xs:pl-2">
        <h2 className="text-2xl font-bold">Claim Your Vested Coins on Aptos</h2>
        <div className="mt-6 max-w-md xs:max-w-[96%] sm:max-w-[96%] ">
          <div className="grid grid-cols-1 gap-6">
            {!connected && renderPreview()}
            {connected &&
              account &&
              currentStep == 0 &&
              renderCheckQualification()}
            {currentStep == 1 && vestingItem?.claimable && renderClaim()}
            {currentStep == 2 && renderSuccess()}
            <div className="block sm:block hidden">
              <div className="mt-2">
                <div>
                  <Steps current={currentStep}>
                    <Step title="Check" />
                    <Step title="Claim" />
                    <Step title="Done" />
                  </Steps>
                </div>
              </div>
            </div>
            <div className="block place-content-center mt-4">
              <a
                href="#"
                onClick={handle}
                rel="noreferrer"
                className="flex justify-center
                focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
                bg-[#14161A] max-h-[48px] text-white px-6 py-[13px]  text-[17px] leading-[120%] rounded-[100px] hover:cursor-pointer hover:opacity-[0.92] font-medium"
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="pt-[110px] md:pt-[200px] predict-section-bg overflow-hidden bg-[#F9FCFF] lg:h-[100vh] lg:min-h-[840px]">
      <div className="container lg:flex">
        <div className="md:block hidden xl:w-[418px] pb-12 md:w-[340px] text-[#292C33] flex-none lg:mr-24">
          <h1 className="pt-[90px] sm:pt-[8px] font-sans text-[28px] leading-[120%] font-medium text-center px-6 md:px-0 lg:text-[36px] md:leading-[119%] md:w-[502px] md:text-left">
            {title}
          </h1>
          <p className="hidden lg:block text-[20px] leading-[153%] mt-6">
            {des}
          </p>
          <ul className="flex mt-6 flex-col gap-4 list-inside list-disc">
            {steps.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
        <div className="grow lg:ml-24 pb-6 pl-4 bg-slate-500/75 rounded-[24px]">
          {renderInner()}
        </div>
      </div>
    </section>
  );
};
export default VestingClaimComp;
