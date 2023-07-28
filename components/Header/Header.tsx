import { MENUS } from "config/constants";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import cn from "services/cn";
import MobileMenu from "./MobileMenu";
import { useRouter } from "next/router";
import WalletConnector from "../Wallet/WalletConnector";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { getAptosClient, getNetwork } from "../../config/config";
import { MoveResource, U64 } from "aptos/src/generated";
import { AptosClient, CoinClient } from "aptos";
import {
  makeUpdateConfigPayload,
  makeWithdrawPayload,
  registerCoinPayload,
} from "../../services/DaoService";
import { LoadingOutlined } from "@ant-design/icons";
import { hexToU64 } from "../../libs/utils";
import { List, Modal, Input, notification, Popover, Spin, Tooltip } from "antd";
import { CoinInformation } from "../../models/CoinInformation";

const routers: { [path: string]: string } = {
  create_coin: "FACTORY_V2",
  coin_airdrop: "AIRDROP_V2",
  lock_coin: "LOCKER",
  coin_vesting: "VESTING",
};

const contracts: { [path: string]: string } = {
  create_coin: "factory_v2",
  coin_airdrop: "airdropper_v2",
  lock_coin: "locker",
  coin_vesting: "vesting",
};

const ENV: { [path: string]: string | undefined } = {
  FACTORY_ADDRESS: process.env.NEXT_PUBLIC_FACTORY_ADDRESS,
  FACTORY_V1_ADDRESS: process.env.NEXT_PUBLIC_FACTORY_V1_ADDRESS,
  FACTORY_RESOURCE_ADDRESS: process.env.NEXT_PUBLIC_FACTORY_RESOURCE_ADDRESS,
  FACTORY_V2_RESOURCE_ADDRESS:
    process.env.NEXT_PUBLIC_FACTORY_V2_RESOURCE_ADDRESS,
  AIRDROP_RESOURCE_ADDRESS: process.env.NEXT_PUBLIC_AIRDROP_RESOURCE_ADDRESS,
  AIRDROP_V2_RESOURCE_ADDRESS:
    process.env.NEXT_PUBLIC_AIRDROP_V2_RESOURCE_ADDRESS,
  LOCKER_RESOURCE_ADDRESS: process.env.NEXT_PUBLIC_LOCKER_RESOURCE_ADDRESS,
  VESTING_RESOURCE_ADDRESS: process.env.NEXT_PUBLIC_VESTING_RESOURCE_ADDRESS,
  DAO_STORAGE_RESOURCE_ADDRESS:
    process.env.NEXT_PUBLIC_DAO_STORAGE_RESOURCE_ADDRESS,
};

const Header: React.FC = () => {
  const [txLoading, setTxLoading] = useState(false);
  const [reloadRequired, setReloadRequired] = useState(false);
  const [scroll, setScroll] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const router = useRouter();
  const [aptosClient, setAptosClient] = useState<AptosClient>();
  const [resources, setResources] = useState<MoveResource[]>([]);
  const [isFeeCollector, setIsFeeCollector] = useState(false);
  const [showAdminInput, setShowAdminInput] = useState<{
    [key: string]: Boolean;
  }>({});
  const [coinsWithBalances, setCoinsWithBalances] = useState<{
    [key: string]: CoinInformation;
  }>({});
  const [currentConfigs, setCurrentConfigs] = useState<{
    [key: string]: number;
  }>({});

  const { account, signAndSubmitTransaction, connected, network, disconnect } =
    useWallet();

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useMemo(() => {
    if (connected && network) {
      try {
        setAptosClient(getAptosClient(getNetwork(network.name!)));
      } catch (e) {
        disconnect();
      }
    }
  }, [connected, disconnect, network]);

  useMemo(() => {
    (async () => {
      if (!connected || !aptosClient) return;

      const res = await aptosClient.getAccountResources(
        process.env.NEXT_PUBLIC_DAO_STORAGE_RESOURCE_ADDRESS!
      );
      res.pop();
      res.shift();
      setResources(res);

      const prop = res.find((r) => r.type.includes("ConfigurationV1"));
      if (!prop) return;
      const feeCollector = (prop.data as any).config.map.data[0].value.value;
      const self = account?.address;

      setIsFeeCollector(feeCollector === self);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address, aptosClient, connected, reloadRequired]);

  useEffect(() => {
    if (!isFeeCollector) return setCoinsWithBalances({});
    (async () => {
      const prop = resources.find((r) => r.type.includes("CoinList"));
      if (!prop) return;
      const coins = (prop.data as any).coins;

      const tasks = coins.map(async (coin: string) => {
        const { data } = await aptosClient!.getAccountResource(
          coin.split("::")[0],
          `0x1::coin::CoinInfo<${coin}>`
        );
        const r = resources.find(
          (r) => r.type.includes("Reserve") && r.type.includes(coin)
        );
        const balanceOfCoin = +(r!.data as any).reserve.value;

        return {
          ...data,
          type: coin,
          total_supply: 0,
          balance: balanceOfCoin,
          value:
            Math.round(
              (balanceOfCoin / Math.pow(10, +(data as any).decimals)) * 1000
            ) / 1000,
          decimals: +(data as any).decimals,
        } as unknown as CoinInformation;
      });

      const coinInfo: any = await Promise.all(await tasks);
      setCoinsWithBalances(coinInfo);
    })();
  }, [aptosClient, isFeeCollector, resources]);

  useEffect(() => {
    if (!isFeeCollector) return setCurrentConfigs({});
    const res = routers[router.pathname.slice(1)];
    const res_key = `${res}_RESOURCE_ADDRESS`;

    if (!aptosClient) return;
    if (!ENV[res_key]!) return;

    (async () => {
      try {
        const res = await aptosClient.getAccountResources(ENV[res_key]!);
        const configs = res
          .filter((r) => r.type.includes("config::ConfigurationV1"))
          .map((r) => (r.data as any).config.map.data)[0]
          .filter((r: any) => r.value.type === "u64")
          .map((r: any) => ({
            key: r.key,
            value: hexToU64(r.value.value),
          }))
          .reduce((o: any, c: any) => {
            o[c.key] = c.value;
            return o;
          }, {});
        setCurrentConfigs(configs);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [aptosClient, isFeeCollector, router.pathname]);

  const handleScroll = () => {
    setScroll(window.pageYOffset > 20);
  };

  const toggleMobile = () => {
    setShowMobile(!showMobile);
    // if (showMobile) document.body.style.overflow = "";
    // else document.body.style.overflow = "hidden";
  };

  const handleClick = () => {
    setShowMobile(!showMobile);
  };

  const handleClose = () => {
    if (showMobile) {
      setShowMobile(false);
    }
  };

  async function isCoinRegistered(coin: string) {
    if (!connected || !aptosClient) return;

    try {
      const res = await aptosClient.getAccountResource(
        account?.address!,
        `0x1::coin::CoinStore<${coin}>`
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async function registerCoin(coin: string) {
    setTxLoading(true);
    const payload = registerCoinPayload(coin);
    const transactionRes = await signAndSubmitTransaction(payload);
    await aptosClient!.waitForTransaction(transactionRes?.hash || "", {
      checkSuccess: true,
    });
    notification["success"]({
      message: "Coin registered!",
      description:
        "The coin has been registered into your account! please continue to withdraw.",
    });
    setTxLoading(false);
  }

  async function claimFee(coin: string, amount: string) {
    if (!(await isCoinRegistered(coin))) await registerCoin(coin);
    setTxLoading(true);
    const payload = makeWithdrawPayload(coin, amount);
    const transactionRes = await signAndSubmitTransaction(payload);
    await aptosClient!.waitForTransaction(transactionRes?.hash || "", {
      checkSuccess: true,
    });
    notification["success"]({
      message: "Fee withdrawn!",
      description:
        "The fee has been withdrawn to your wallet, please check it.",
    });
    setReloadRequired(!reloadRequired);
    setTxLoading(false);
  }

  function showModal(key: string, show: boolean) {
    setShowAdminInput({
      ...showAdminInput,
      [key]: show,
    });
  }

  async function updateConfig(key: string) {
    setTxLoading(true);
    const contract = contracts[router.pathname.slice(1)];
    const payload = makeUpdateConfigPayload(
      contract,
      key,
      currentConfigs[key] + ""
    );
    const transactionRes = await signAndSubmitTransaction(payload);
    await aptosClient!.waitForTransaction(transactionRes?.hash || "", {
      checkSuccess: true,
    });
    notification["success"]({
      message: "Fee withdrawn!",
      description:
        "The fee has been withdrawn to your wallet, please check it.",
    });
    setTxLoading(false);
  }

  function renderAdminInput(key: string, inputValue: string) {
    return (
      <>
        <Modal
          title="Enter a value"
          open={!!showAdminInput[key]}
          onOk={() => {
            showModal(key, false);
            updateConfig(key);
          }}
          onCancel={() => showModal(key, false)}
        >
          Set a new {key}:
          <Input
            value={inputValue}
            type="number"
            onChange={(e) => {
              if (+e.target.value)
                setCurrentConfigs({
                  ...currentConfigs,
                  key: +e.target.value,
                });
            }}
          />
        </Modal>
      </>
    );
  }

  function renderAdminMenu() {
    return (
      <List>
        {Object.keys(coinsWithBalances).length
          ? Object.values(coinsWithBalances)
              .filter((coin) => +coin.value > 0)
              .map((coin, i) => (
                <List.Item key={i}>
                  <a
                    rel="noreferrer"
                    onClick={() => claimFee(coin.type, coin.balance!)}
                  >
                    Claim Fee: {coin.value} ${coin.symbol}
                  </a>
                </List.Item>
              ))
          : []}
        {/* <List.Item key="divider">
          <Divider />
        </List.Item> */}
        {Object.keys(currentConfigs).length
          ? Object.keys(currentConfigs).map((key) => (
              <List.Item key={key}>
                {key} :{" "}
                {key === "PRICE" ? (
                  <>
                    <a rel="noreferrer" onClick={() => showModal(key, true)}>
                      {currentConfigs[key] > 1e8
                        ? currentConfigs[key] / 1e8 + " $APT"
                        : currentConfigs[key] / 100 + "%"}
                    </a>
                    {renderAdminInput(key, currentConfigs[key] + "")}
                  </>
                ) : (
                  currentConfigs[key]
                )}
              </List.Item>
            ))
          : []}
      </List>
    );
  }

  return (
    <header
      className={cn(
        "white fixed top-0 left-0 right-0 w-full z-[1] transition-all ease-in-out duration-300 px-2",
        {
          "is-scroll": scroll,
          "py-5 lg:py-5": !scroll,
        }
      )}
    >
      <div
        onClick={handleClose}
        className="container-no-use flex items-center  px-2"
      >
        <Link href="/" className="active">
          <a className="block">
            <img
              src="/images/logo-2@2x.png"
              alt="logo"
              className="w-[115px] md:max-w-[155px]"
            />
          </a>
        </Link>

        <div
          onClick={handleClick}
          className="hidden lg:flex items-center flex-start flex-1 gap-x-8 ml-12"
        >
          {MENUS.map((menu, i) => {
            if (menu.external) {
              return (
                <a
                  href={menu.external}
                  key={i}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "header-link py-2 block text-[#292C33] font-medium font-caption transition-all ease-in duration-150 hover:text-primary-200 mr-4 relative"
                  )}
                >
                  {menu.name}
                  <img
                    src={menu.icon}
                    alt="More"
                    className="absolute top-[6px] -right-[19px] w-4 h-4"
                  />
                </a>
              );
            }

            if (menu.href) {
              return (
                <Link href={menu.href} key={i} as={menu.href}>
                  <a
                    href={menu.href}
                    onClick={handleClick}
                    className={cn(
                      " header-link py-2  font-medium font-caption transition-all ease-in duration-150 hover:text-primary-200 mr-4 ",
                      {
                        "!text-primary-200": router.pathname === menu.href,
                      }
                    )}
                  >
                    {menu.hot ? (
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-sky-400 opacity-75"></span>
                    ) : (
                      <></>
                    )}
                    <Tooltip title={menu.tips}>{menu.name}</Tooltip>
                  </a>
                </Link>
              );
            }
          })}
        </div>

        <WalletConnector />

        {isFeeCollector && connected && account ? (
          <Popover trigger="hover" content={renderAdminMenu()}>
            <div className="relative ml-auto flex items-center gap-6 mr-2">
              <a
                rel="noreferrer"
                className="hidden lg:block ml-2 px-4 py-[10.40px] bg-[#1f9f92] hover:text-primary-500 hover:bg-[#14161a] text-white font-medium rounded-[100px] w-[78px] hover:opacity-[0.9] transition-all"
              >
                <div className="flex gap-x-1.5 items-center pl-[3px] capitalize">
                  {txLoading ? (
                    <Spin
                      className="items-center"
                      indicator={
                        <LoadingOutlined
                          style={{ fontSize: 18, color: "white" }}
                          spin
                        />
                      }
                    />
                  ) : (
                    <span>Admin</span>
                  )}
                </div>
              </a>
            </div>
          </Popover>
        ) : (
          <></>
        )}

        <div
          className={`block lg:hidden hambuger ${
            showMobile ? "is-active" : ""
          }`}
          onClick={toggleMobile}
        >
          <span className="line"></span>
        </div>
      </div>
      <MobileMenu isShow={showMobile} />
    </header>
  );
};

export default Header;
