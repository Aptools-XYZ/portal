import { Modal, notification, Spin, Steps } from "antd";
import { LoadingOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { useWalletConnector } from "../../services/WalletService";
import { AptosClient, Types } from "aptos";
import { getAptosClient, getNetwork } from "../../config/config";
import { MoveResource, U64 } from "aptos/src/generated";
import Table, { ColumnsType } from "antd/lib/table";
import {
  makeAirdropAppendPayload,
  makeAirdropDepositPayload,
} from "../../services/AirdropServicie";
import { hexToU64, is_valid_address, is_valid_amount } from "../../libs/utils";
import MyCoinsDropdown from "../MyCoinsDropdown";
import { DEXes } from "../DexDropdown";
import { useRouter } from "next/router";
import { CoinInformation } from "../../models/CoinInformation";

const { Step } = Steps;
const version = "v2";

interface ErrorMessages {
  coin: string;
  data: string;
}

interface AirdropEntity {
  index: number;
  target_address: string;
  amount: U64;
  valid: boolean;
  duplicated: boolean;
}

interface Amounts {
  sub_total: number;
  fee: number;
  total_amount: number;
}
interface AirdropInfo {
  id: string;
  expires_at: number;
  created_at: number;
  addresses: number;
  owner: Types.Address;
  amount: number;
  coin: string;
  // withdrawn_at: string
}

const DexLPs = Object.values(DEXes).map((v) => v.address);
const isNotLP = (coin: CoinInformation) => {
  return (
    !DexLPs.some((addr) => coin.type.includes(addr)) &&
    !!(coin.balance || coin.value)
  );
};

const AirdropForm: React.FC = () => {
  const { account, signAndSubmitTransaction, connected, network, disconnect } =
    useWallet();
  const [txLoading, setTxLoading] = useState({
    sign: false,
    transaction: false,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [txLinks, setTxLinks] = useState<string[]>([]);
  const [getButtonText, setButtonText] = useState("");
  const [errorMessages, setErrorMessages] = useState({} as ErrorMessages);
  const [selectedCoin, selectCoin] = useState<CoinInformation>();
  const [aptosClient, setAptosClient] = useState<AptosClient>();
  const [rawData, setRawData] = useState("");
  const [entities, setEntities] = useState<AirdropEntity[]>([]);
  const [fee, setFee] = useState(0);
  const [amounts, setAmounts] = useState<Amounts>();
  const [expiry, setExpiry] = useState("");
  const [claimLik, setClaimLink] = useState("");
  const [airdrops, setAirdrops] = useState<AirdropInfo[]>([]);
  const [appendTo, setAppendTo] = useState(-1);
  const [resources, setResources] = useState<MoveResource[]>([]);

  const {
    actions: { setModalOpen },
  } = useWalletConnector();

  const router = useRouter();
  const { coin } = router.query;

  useMemo(() => {
    if (connected && network) {
      try {
        setAptosClient(getAptosClient(getNetwork(network.name!)));
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
          setButtonText("Preview");
          break;
        case 1:
          setButtonText("Confirm Sending");
          break;
        case 2:
          setButtonText("Copy Claim Link");
          break;
        case 3:
          setButtonText("Congrats, All Set!");
          break;
      }
    }
  }, [account, connected, currentStep]);

  useMemo(() => {
    (async () => {
      if (!connected || !aptosClient) return;
      const res = await aptosClient.getAccountResources(
        process.env.NEXT_PUBLIC_AIRDROP_V2_RESOURCE_ADDRESS!
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
    if (!resources || resources.length == 0) return;
    // price
    const { data } = resources.find(
      (r) =>
        r.type ===
        `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS!}::config::ConfigurationV1`
    )!;
    const price = hexToU64((data as any).config.map.data[1].value.value);
    setFee(price / 10000);
  }, [resources]);

  // uwc-debug
  useEffect(() => {
    (async () => {
      if (!resources || resources.length == 0 || !selectedCoin) return;
      const res = resources.find(
        (r) =>
          r.type ===
          `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS!}::airdropper${
            version ? "_" + version : ""
          }::OwnerAirdrops`
      );

      if (!res) return;
      const airdrop_ids = (await aptosClient!.getTableItem(
        (res.data as any).airdrops.inner.handle,
        {
          key_type: "address",
          value_type: "vector<u64>",
          key: account?.address,
        }
      )) as string[];

      if (airdrop_ids.length === 0) return;
      const existing_airdrops = [] as AirdropInfo[];
      const store = resources.find(
        (r) =>
          r.type ===
          `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS!}::airdropper${
            version ? "_" + version : ""
          }::InfoStore`
      )!;

      for await (const id of airdrop_ids) {
        const handle = (store.data as any).store.inner.handle;
        try {
          const res = await aptosClient!.getTableItem(handle, {
            key_type: "u64",
            value_type: `${process.env
              .NEXT_PUBLIC_FACTORY_ADDRESS!}::airdropper${
              version ? "_" + version : ""
            }::AirdropInfo`,
            key: id,
          });

          if (res.coin === selectedCoin?.type) {
            const airdrop = {
              id,
              addresses: res.list.length,
              amount: res.amount,
              owner: res.owner,
              expires_at: +res.expire_at,
              created_at: +res.created_at,
              coin: res.coin,
            } as AirdropInfo;

            existing_airdrops.push(airdrop);
          }
        } catch (e) {
          // console.error(e)
        }

        setAirdrops(existing_airdrops);
      }
    })();
  }, [account, aptosClient, connected, resources, selectedCoin]);

  async function handle() {
    if (!connected) return setModalOpen(true);
    if (currentStep == 0) validate();
    if (currentStep == 1) {
      Modal.confirm({
        title: "Confirm Airdropping",
        icon: <ExclamationCircleOutlined />,
        content:
          "Please make sure that everything has been checked correctly. Do you want to continue?",
        okText: "Confirm",
        cancelText: "Cancel",
        onOk: () => {
          submit_airdrop_transaction();
        },
      });
    }
    if (currentStep == 2) {
      navigator.clipboard.writeText(claimLik);
      notification["success"]({
        message: "Success",
        description: "The claim link has copied to your clipboard!",
      });
    }
  }

  function validate() {
    const err = {} as ErrorMessages;
    const entities = process_raw_data();
    const sub_amount = entities.reduce((amt, a) => amt + +a.amount, 0);
    const fee_amount = Math.round(sub_amount * fee * 10000) / 10000;
    const total_amount = sub_amount + fee_amount;
    setAmounts({ sub_total: sub_amount, fee: fee_amount, total_amount });
    err.coin = !selectedCoin
      ? "You need to choose a coin"
      : +selectedCoin.value < total_amount
      ? "You don't have enough balance"
      : "";
    err.data =
      rawData.trim().length == 0
        ? "Please enter at least one line of data."
        : entities.some((d) => !d.valid)
        ? `line ${entities.find((d) => !d.valid)?.index! + 1} is invalid.`
        : entities.some((d) => d.duplicated)
        ? `line ${
            entities.find((d) => d.duplicated)?.index! + 1
          } is duplicated, remove it.`
        : "";

    setErrorMessages(err);
    const allValid = !Object.keys(err).some((k) => (err as any)[k]);
    if (allValid) {
      setEntities(entities);
      setCurrentStep(1);
    }

    return allValid;
  }

  function process_raw_data(): AirdropEntity[] {
    const entities = rawData.split("\n").map((l, index) => {
      const tmp = l.split(/[ \t,;]+/gi);
      const target_address = tmp[0];
      const amount = tmp[1];
      const valid = is_valid_address(target_address) && is_valid_amount(amount);

      return {
        index,
        target_address,
        amount,
        valid,
        duplicated:
          (rawData.match(new RegExp(target_address, "gi")) || [])?.length > 1,
      } as AirdropEntity;
    });

    return entities as AirdropEntity[];
  }

  async function submit_airdrop_transaction() {
    try {
      setTxLoading({
        ...txLoading,
        transaction: true,
      });

      const payload =
        appendTo === -1
          ? makeAirdropDepositPayload(
              selectedCoin?.type!,
              entities.map((e) => e.target_address),
              entities.map((e) =>
                (+e.amount * Math.pow(10, selectedCoin?.decimals!)).toString()
              ),
              expiry ? Math.round(new Date(expiry).getTime() / 1000) : 0,
              version
            )
          : makeAirdropAppendPayload(
              selectedCoin?.type!,
              entities.map((e) => e.target_address),
              entities.map((e) =>
                (+e.amount * Math.pow(10, selectedCoin?.decimals!)).toString()
              ),
              appendTo,
              version
            );
      const transactionRes = await signAndSubmitTransaction(payload);
      const result = await aptosClient!.waitForTransactionWithResult(
        transactionRes?.hash || "",
        {
          checkSuccess: true,
        }
      );
      const index =
        appendTo === -1
          ? +(result as any).changes
              .find((c: any) => c.data.type.includes("ConfigurationV1"))
              .data.data.config.map.data[0].value.value.replace(/0+$/g, "") - 1
          : appendTo;
      const link = `${window.location.origin}/claim/${selectedCoin?.type}/${index}?ver=v2`;
      setClaimLink(link);
      const links = [
        ...txLinks,
        `https://explorer.${process.env.NEXT_PUBLIC_APTOS_ENV}.aptos.dev/txn/${transactionRes?.hash}`,
      ];
      setTxLinks(links);
      setCurrentStep(2);
      notification["success"]({
        message: "Congrats!",
        description:
          "Your coins have saved into smart contracts and now awaits for your users to claim",
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

  function renderForm() {
    return (
      <>
        <label className="block">
          <span className="text-black-700">Select a coin:</span>
          <span className="text-red-700 ml-2">{errorMessages.coin || ""}</span>
          <MyCoinsDropdown
            placeholder="Select a coin to be airdropped"
            disabled={!account}
            coinFilter={isNotLP}
            value={selectedCoin?.type || (coin as string)}
            onChange={(coin) => selectCoin(coin)}
          />
        </label>
        <label className="block">
          <span className="text-black-700">Addresses & Amounts: </span>
          <span className="text-red-700 ml-2">{errorMessages.data || ""}</span>
          <textarea
            disabled={!account}
            placeholder="one address per line, separate with (comma, space or tab) between address and amount. Maximum is around 1500 addresses per transaction or your wallet might get stuck. ;-) Recommend Pontem Wallet when addresses are large."
            className="mt-1
          block
          w-full
          rounded-md
          xs:max-h-[6rem]
          lg:max-h-[9rem]
          border-black-500
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            rows={airdrops.length > 0 ? (appendTo === -1 ? 4 : 6) : 7}
            onChange={(e) => setRawData(e.target.value.trim())}
          ></textarea>
        </label>
        {airdrops.length > 0 && (
          <>
            <label className="block">
              <span className="text-black-700">Option:</span>
              <select
                disabled={!account}
                onChange={(e) => {
                  setAppendTo(+e.target.value);
                }}
                className="mt-1
          block
          w-full
          rounded-md
          border-black-500
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option key={-1} value={-1}>
                  Make a new airdrop
                </option>
                {airdrops.map((airdrop, i) => (
                  <option key={i} value={airdrop.id}>
                    Append to: {airdrop.id} - ({airdrop.addresses} targets) -{" "}
                    {airdrop.expires_at === 0
                      ? "never expires"
                      : new Date(airdrop.expires_at * 1000)
                          .toISOString()
                          .split("T")[0]}{" "}
                    -{" "}
                    {Math.round(
                      (airdrop.amount / Math.pow(10, selectedCoin?.decimals!)) *
                        10000
                    ) / 10000}{" "}
                    total
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {appendTo === -1 && (
          <>
            <label className="block">
              <span className="text-black-700">
                Expire at? (Leave it empty means never expires)
              </span>
              <input
                disabled={!account}
                type="datetime-local"
                value={expiry ? expiry.substring(0, 16) : undefined}
                min={new Date().toISOString().substring(0, 16)}
                onChange={(ev) => {
                  if (!ev.target["validity"].valid) return;
                  const dt = ev.target["value"] + ":00Z";
                  setExpiry(dt);
                }}
                className="mt-1
          block
          w-full
          rounded-md
          border-black-500
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </label>
          </>
        )}
      </>
    );
  }

  function renderPreview() {
    const columns: ColumnsType<AirdropEntity> = [
      {
        title: "Address",
        dataIndex: "target_address",
        key: "target_address",
        render: (v) => {
          return (
            v.toString().substring(0, 12) + "..." + v.toString().substr(-12)
          );
        },
      },
      {
        title: "Amount",
        dataIndex: "amount",
        fixed: "right",
        width: 120,
      },
    ];
    return (
      <>
        <p className="text-sky-500 animate-pulse font-bold">
          Notice: Airdopping {amounts?.sub_total} $
          {selectedCoin?.symbol.toUpperCase()} to {entities.length} receiver(s).
          Fee: {amounts?.fee} ${selectedCoin?.symbol.toUpperCase()}
        </p>
        <Table
          // rowSelection={rowSelection}
          columns={columns}
          dataSource={entities}
          scroll={{ y: 240 }}
          pagination={{ pageSize: 100, showSizeChanger: false }}
        />
      </>
    );
  }

  function renderClaim() {
    return (
      <>
        <p className="block flex place-content-center ">
          <img
            alt="Aptos Coin Maker"
            src="/svgs/aptos-o.svg"
            className="w-48 animate-pulse drop-shadow-lg"
          />
        </p>
        <p className="block flex place-content-center text-green-200">
          Your airdrop is done, please copy the link below and send back to your
          users to claim.
        </p>
        <label className="block">
          <span className="text-black-700">
            Your Airdrop Claim Link (click to copy)
          </span>
          <input
            required
            readOnly
            onClick={() => {
              navigator.clipboard.writeText(claimLik);
              notification["success"]({
                message: "Success",
                description: "The claim link has copied to your clipboard!",
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
            value={claimLik || ""}
          />
        </label>
      </>
    );
  }

  return (
    <div className="py-6 pl-6 xs:py-4 xs:pl-2">
      <h2 className="text-2xl font-bold">Aptos Airdrop Coin Online</h2>
      <div className="mt-6 max-w-md xs:max-w-[96%] sm:max-w-[96%] ">
        <div className="grid grid-cols-1 gap-6">
          {currentStep == 0 && renderForm()}
          {currentStep == 1 && renderPreview()}
          {currentStep == 2 && renderClaim()}

          <div className="block sm:block hidden">
            <div className="mt-2">
              <div>
                <Steps current={currentStep}>
                  <Step title="Prepare" />
                  <Step title="Confirm" />
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
                  indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
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
};

export default AirdropForm;
