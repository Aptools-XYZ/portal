import Link from "next/link";
import cn from "services/cn";
import { MENUS } from "config/constants";
import React, { useEffect, useMemo, useState } from "react";
import MobileMenu from "components/Header/MobileMenu";
import { chromeStoreExtURL, getAptosClient } from "config/config";
import Footer from "components/Footer/Footer";
import Head from "next/head";
import Header from "components/Header/Header";
import { U64 } from "aptos/src/generated";
import { AptosClient, Types } from "aptos";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { useWalletConnector } from "../services/WalletService";
import { useInterval } from "usehooks-ts";
import { notification } from "antd";

export const HeaderContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <h2 className="font-bold text-[28px] leading-[3.5rem] !text-left">
      {content}
    </h2>
  );
};

interface LaunchpadNFT {
  allowance: string;
  collection_name: string;
  cost: number;
  count: number;
  max_allowance: number;
  max_per_tx: number;
  max_supply: number;
  start_timestamp: number;
  token_name: number;
  whitelist: string;
  whitelist_enabled: boolean;
  whitelist_start_timestamp: number;
}

export const ContentContainer: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return <div className="text-justify">{children}</div>;
};

const Mint = () => {
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
  const [aptosClient, setAptosClient] = useState<AptosClient>();
  const [nft, setNFT] = useState<LaunchpadNFT>();

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

  const launchpad =
    "0xd9d4314512a7d23acff5d282a1e64f1228ba8aca2f952621dd57f49cf101854e";
  const creator =
    "0xf932dcb9835e681b21d2f411ef99f4f5e577e6ac299eebee2272a39fb348f702";
  const collection_name = "Aptos Monkeys";
  const marketplace_v2 =
    "0x2c7bccf7b31baf770fdbcc768d9e9cb3d87805e255355df5db32ac9a669010a2";

  useEffect(() => {
    (async () => {
      if (!connected || !account || !aptosClient) return;
      const res = await aptosClient.getAccountResource(
        launchpad,
        `${launchpad}::launchpad_nft::CollectionData`
      );

      setNFT({
        ...res.data,
        allowance: (res.data as any).allowance.handle,
        whitelist: (res.data as any).whitelist.handle,
      } as LaunchpadNFT);

      console.log(nft);
    })();
  }, [account, aptosClient, connected, nft]);

  // useInterval(() => {
  //   aptosClient?.getAccountResources()
  // }, 1000)

  async function mint() {
    const payload = {
      type: "entry_function_payload",
      function: `${launchpad}::launchpad_nft::mint`,
      type_arguments: [],
      arguments: ["1"],
    } as Types.TransactionPayload;

    const transactionRes = await signAndSubmitTransaction(payload);
    await aptosClient!.waitForTransaction(transactionRes?.hash || "", {
      checkSuccess: true,
    });

    notification["success"]({
      message: "Mint Successful.",
      description: "You have minted a NFT!",
    });
  }

  return (
    <>
      <Head>
        <title>NFT Minter</title>
      </Head>
      <section className="bg-white">
        <div className="container pb-12">
          <Header />
          <div className="flex flex-col justify-center">
            <div className="flex flex-col gap-16 h-320 font-medium leading-6  pt-[120px]">
              <a onClick={mint}>Mint NFT</a>
            </div>
          </div>
        </div>
        {/* <Footer /> */}
      </section>
    </>
  );
};

export default Mint;
