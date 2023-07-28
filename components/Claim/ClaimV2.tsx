import React, { useEffect, useMemo, useState } from "react";
import { CLAIM_SECTION } from "config/constants";
import { AptosClient, Types } from "aptos";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { useWalletConnector } from "../../services/WalletService";
import { getAptosClient } from "../../config/config";
import { useRouter } from "next/router";
import { notification, Spin, Steps } from "antd";
import { LoadingOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { makeAirdropClaimPayload } from "../../services/AirdropServicie";
import { CoinInformation } from "../../models/CoinInformation";

const { Step } = Steps;

interface AirdropInfo {
  id: string;
  expires_at: number;
  created_at: number;
  addresses: number;
  owner: Types.Address;
  amount: string;
  handle: string;
}

const ClaimCompV2: React.FC = () => {
  const { title, des, steps } = CLAIM_SECTION;
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
  const [airdrop, setAirdrop] = useState<AirdropInfo>();
  const [claimable, setClaimable] = useState(0);
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
          setButtonText("Check Qualification");
          break;
        case 1:
          setButtonText("Claim Your Rewards");
          break;
        case 2:
          setButtonText("Congrats, All set.");
          break;
      }
    }
  }, [account, connected, currentStep]);

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

        // retrieve airdrop information.
        const store = await aptosClient.getAccountResource(
          process.env.NEXT_PUBLIC_AIRDROP_V2_RESOURCE_ADDRESS!,
          `${process.env
            .NEXT_PUBLIC_FACTORY_ADDRESS!}::airdropper_v2::InfoStore`
        );
        const handle = (store.data as any).store.inner.handle;
        try {
          const res = await aptosClient.getTableItem(handle, {
            key_type: "u64",
            value_type: `${process.env
              .NEXT_PUBLIC_FACTORY_ADDRESS!}::airdropper_v2::AirdropInfo`,
            key: index,
          });
          const airdrop = {
            id: index,
            handle: res.list.inner.handle,
            addresses: res.list.length,
            amount: res.amount,
            owner: res.owner,
            expires_at: +res.expire_at,
            created_at: +res.created_at,
          } as AirdropInfo;

          setAirdrop(airdrop);
        } catch (e) {
          console.error(e);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [account, aptosClient, connected, currency, index]);

  async function handle() {
    if (!connected) return setModalOpen(true);
    if (currentStep == 0) return await checkQualification();
    if (currentStep == 1) return await claim();
  }

  async function claim() {
    if (!aptosClient || !airdrop || !account || !claimable || !selectedCoin)
      return;
    setTxLoading({
      ...txLoading,
      transaction: true,
    });

    try {
      const payload = makeAirdropClaimPayload(
        selectedCoin?.type,
        +index!,
        "v2"
      );
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
        description: `Your have claimed ${claimable} $${selectedCoin.symbol}!`,
      });
    } catch (e) {
      console.log(e);
    } finally {
      setTxLoading({
        ...txLoading,
        transaction: false,
      });
    }
  }

  async function checkQualification() {
    if (!aptosClient || !airdrop || !account) return;
    setTxLoading({
      ...txLoading,
      transaction: true,
    });
    try {
      const res = await aptosClient.getTableItem(airdrop.handle, {
        key_type: "address",
        value_type: "u64",
        key: account.address,
      });
      if (+res > 0) {
        setClaimable(+res / Math.pow(10, +selectedCoin?.decimals!));
        setCurrentStep(1);
      } else {
        notification.warning({
          message: "Sorry",
          description:
            "You are not qualified to claim, or you may have already claimed?",
        });
      }
    } catch (e) {
      notification.warning({
        message: "Sorry",
        description:
          "You are not qualified to claim, or you may have already claimed?",
      });
    } finally {
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
        <label className="block">
          <span className="text-black-700">Rewards Remaining: </span>
          <input
            type="text"
            readOnly
            value={`${
              airdrop
                ? Math.round(
                    (+airdrop!.amount /
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
          <span className="text-black-700">Expires at: </span>
          <input
            type="text"
            readOnly
            value={`${
              airdrop?.expires_at
                ? new Date(airdrop?.expires_at! * 1000)
                    .toISOString()
                    .split("T")[0]
                : "Never"
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
          <span className="text-black-700">Total Addresses: </span>
          <input
            type="text"
            readOnly
            value={`${airdrop?.addresses!}`}
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
          You have unclaimed rewards, connect wallet to check it out.
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
          You have {claimable} ${selectedCoin?.symbol} to claim!
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
        <p className="text-white animate-pulse text-lg font-bold">
          Congratulations! <br />
          You have claimed {claimable} ${selectedCoin?.symbol}!
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
        <h2 className="text-2xl font-bold">Claim Airdrop on Aptos (v2)</h2>
        <div className="mt-6 max-w-md xs:max-w-[96%] sm:max-w-[96%] ">
          <div className="grid grid-cols-1 gap-6">
            {!connected && renderPreview()}
            {connected &&
              account &&
              currentStep == 0 &&
              renderCheckQualification()}
            {currentStep == 1 && claimable && renderClaim()}
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
export default ClaimCompV2;
