import { Modal, notification, Popover, Spin, Steps, Tooltip } from "antd";
import { LoadingOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { useWalletConnector } from "../../services/WalletService";
import { AptosClient, Types } from "aptos";
import { getAptosClient } from "../../config/config";
import { MoveResource, U64 } from "aptos/src/generated";
import Table, { ColumnsType } from "antd/lib/table";
import {
  makeVestingDepositPayload,
  makeVestingWithdrawalPayload,
} from "../../services/VestingService";
import { hexToU64, is_valid_address, is_valid_amount } from "../../libs/utils";
import moment from "moment";
import MyCoinsDropdown from "../MyCoinsDropdown";
import { useRouter } from "next/router";
import { DEXes } from "../DexDropdown";
import { CoinInformation } from "../../models/CoinInformation";

const { Step } = Steps;

interface ErrorMessages {
  coin: string;
  data: string;
  from: string;
  to: string;
}

interface VestingEntity {
  index: number;
  target_address: string;
  amount: U64;
  cliff: U64;
  valid: boolean;
  duplicated: boolean;
}

interface Amounts {
  sub_total: number;
  fee: number;
  total_amount: number;
}
interface VestingInfo {
  id: string;
  from_seconds: number;
  to_seconds: number;
  created_at: number;
  addresses: number;
  owner: Types.Address;
  amount: string;
  handle: string;
  withdrawn_at: number;
}

const DexLPs = Object.values(DEXes).map((v) => v.address);
const isNotLP = (coin: CoinInformation) => {
  return (
    !DexLPs.some((addr) => coin.type.includes(addr)) &&
    !!(coin.balance || coin.value)
  );
};

const VestingForm: React.FC = () => {
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
  const [entities, setEntities] = useState<VestingEntity[]>([]);
  const [fee, setFee] = useState(0);
  const [amounts, setAmounts] = useState<Amounts>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [claimLik, setClaimLink] = useState("");
  const [vestings, setVestings] = useState<VestingInfo[]>([]);
  const [resources, setResources] = useState<MoveResource[]>([]);
  const [selectedVesting, selectVesting] = useState("");

  const {
    actions: { setModalOpen },
  } = useWalletConnector();

  const router = useRouter();
  const { coin } = router.query;

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
        process.env.NEXT_PUBLIC_VESTING_RESOURCE_ADDRESS!
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
    setFee(price / Math.pow(10, 8));
  }, [resources]);

  // uwc-debug
  useEffect(() => {
    (async () => {
      if (!resources || resources.length == 0 || !selectedCoin) return;
      const res = resources.find(
        (r) =>
          r.type ===
          `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS!}::vesting::OwnerVestings`
      );

      if (!res) return;
      const vesting_ids = (await aptosClient!.getTableItem(
        (res.data as any).vestings.inner.handle,
        {
          key_type: "address",
          value_type: "vector<u64>",
          key: account?.address,
        }
      )) as string[];

      if (vesting_ids.length === 0) return;
      const existing_vestings = [] as VestingInfo[];
      const store = resources.find(
        (r) =>
          r.type ===
          `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS!}::vesting::InfoStore`
      )!;

      for await (const id of vesting_ids) {
        const handle = (store.data as any).store.inner.handle;
        try {
          const res = await aptosClient!.getTableItem(handle, {
            key_type: "u64",
            value_type: `${process.env
              .NEXT_PUBLIC_FACTORY_ADDRESS!}::vesting::VestingInfo`,
            key: id,
          });

          if (
            res.coin === selectedCoin?.type &&
            res.withdrawn_at.vec.length == 0
          ) {
            const vesting = {
              id,
              handle: res.list.inner.handle,
              addresses: res.list.length,
              amount: res.amount,
              owner: res.owner,
              from_seconds: +res.from_seconds,
              to_seconds: +res.to_seconds,
              created_at: +res.created_at,
              withdrawn_at: res.withdrawn_at.vec[0],
            } as VestingInfo;

            existing_vestings.push(vesting);
          }
        } catch (e) {
          // console.error(e)
        }

        setVestings(existing_vestings);
        if (existing_vestings.length > 0)
          selectVesting(existing_vestings[0].id);
      }
    })();
  }, [account, aptosClient, connected, resources, selectedCoin]);

  async function handle() {
    if (!connected) return setModalOpen(true);
    if (currentStep == 0) validate();
    if (currentStep == 1) {
      Modal.confirm({
        title: "Confirm Vesting",
        icon: <ExclamationCircleOutlined />,
        content:
          "Please make sure that everything has been checked correctly. Do you want to continue?",
        okText: "Confirm",
        cancelText: "Cancel",
        onOk: () => {
          submit_vesting_transaction();
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
    const fee_amount = fee;
    const total_amount = sub_amount + fee_amount;
    setAmounts({ sub_total: sub_amount, fee: fee_amount, total_amount });
    err.coin = !selectedCoin
      ? "You need to choose a coin"
      : +selectedCoin.value < total_amount
      ? "You don't have enough balance"
      : "";
    err.from = !from ? "Invalid from" : "";
    err.to = !to ? "Invalid to" : from + 86400 > to ? "range too narrow" : "";
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

  function process_raw_data(): VestingEntity[] {
    const entities = rawData.split("\n").map((l, index) => {
      const tmp = l.split(/[ \t,;]+/gi);
      const target_address = tmp[0];
      const amount = tmp[1];
      const cliff = tmp[2] || "0";
      const valid =
        is_valid_address(target_address) &&
        is_valid_amount(amount) &&
        is_valid_amount(cliff, true) &&
        from + +cliff * 86400 < to;

      return {
        index,
        target_address,
        amount,
        cliff,
        valid,
        duplicated:
          (rawData.match(new RegExp(target_address, "gi")) || [])?.length > 1,
      } as VestingEntity;
    });

    return entities as VestingEntity[];
  }

  async function submit_withdraw_transaction() {
    try {
      setTxLoading({
        ...txLoading,
        transaction: true,
      });

      const payload = makeVestingWithdrawalPayload(
        selectedCoin?.type!,
        +selectedVesting
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
      notification["success"]({
        message: "Success",
        description:
          "Your have withdrawn all your assets, the vesting is now terminated.",
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

  async function submit_vesting_transaction() {
    try {
      setTxLoading({
        ...txLoading,
        transaction: true,
      });

      const payload = makeVestingDepositPayload(
        selectedCoin?.type!,
        entities.map((e) => e.target_address),
        entities.map((e) =>
          (+e.amount * Math.pow(10, selectedCoin?.decimals!)).toString()
        ),
        entities.map((e) => (+e.cliff * 86400).toString()), // cliff is in days
        Math.round(new Date(from).getTime() / 1000),
        Math.round(new Date(to).getTime() / 1000)
      );

      const transactionRes = await signAndSubmitTransaction(payload);
      const result = await aptosClient!.waitForTransactionWithResult(
        transactionRes?.hash || "",
        {
          checkSuccess: true,
        }
      );
      const index =
        +(result as any).changes
          .find((c: any) => c.data.type.includes("ConfigurationV1"))
          .data.data.config.map.data[0].value.value.replace(/0+$/g, "") - 1;
      const link = `${window.location.origin}/vesting/claim/${selectedCoin?.type}/${index}`;
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
        <label className="bvesting">
          <span className="text-black-700">Select a coin:</span>
          <span className="text-red-700 ml-2">{errorMessages.coin || ""}</span>

          <MyCoinsDropdown
            placeholder="Select a coin to be vested"
            disabled={!account}
            coinFilter={isNotLP}
            value={selectedCoin?.type || (coin as string)}
            onChange={(coin) => selectCoin(coin)}
          />
        </label>

        {vestings && vestings.length > 0 && (
          <>
            <label className="bvesting">
              <span className="text-black-700">View existing vestings: </span>
              <div className="bvesting flex flex-row">
                <select
                  disabled={!account}
                  onChange={(e) => {
                    // selectVesting(e.target.value)
                  }}
                  className="mt-1
          bvesting
          w-full
          rounded-md
          border-black-500
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                  {vestings.map((vesting, i) => (
                    <option key={i} value={vesting.id}>
                      [{vesting.id}]
                      {Math.round(
                        (+vesting.amount /
                          Math.pow(10, selectedCoin?.decimals!)) *
                          10000
                      ) / 10000}{" "}
                      ${selectedCoin?.symbol} vested from{" "}
                      {moment(vesting.from_seconds * 1000).format(
                        "yyyy-MM-DD hh:mm"
                      )}
                      , to:{" "}
                      {moment(vesting.to_seconds * 1000).format(
                        "yyyy-MM-DD hh:mm"
                      )}
                      , {vesting.addresses} address(es)
                    </option>
                  ))}
                </select>

                {renderPopMenu()}
              </div>
            </label>
          </>
        )}

        <label className="vesting">
          <span className="text-black-700">
            Addresses & Amounts & Cliff(Optional in days):{" "}
          </span>
          <span className="text-red-700 ml-2">{errorMessages.data || ""}</span>
          <textarea
            disabled={!account}
            placeholder="one address per line, separate with (comma, space or tab) between address/amount/cliff(optional). Maximum is around 1500 addresses per transaction or your wallet might get stuck. ;-) Recommend Pontem Wallet when addresses are large."
            className="mt-1
          bvesting
          w-full
          rounded-md
          border-black-500
          shadow-sm
          xs:max-h-[6rem]
          lg:max-h-[9rem]
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            rows={vestings.length > 0 ? 4 : 7}
            onChange={(e) => setRawData(e.target.value.trim())}
          ></textarea>
        </label>

        <>
          <div className="2xl:flex 2xl:flex-row justify-between">
            <label className="bvesting 2xl:max-w-[45%]">
              <span className="text-black-700">From:</span>
              <span className="text-red-700 ml-2">
                {errorMessages.from || ""}
              </span>
              <input
                disabled={!account}
                type="datetime-local"
                value={from ? from.substring(0, 16) : undefined}
                min={new Date().toISOString().substring(0, 16)}
                onChange={(ev) => {
                  if (!ev.target["validity"].valid) return;
                  const dt = ev.target["value"] + ":00Z";
                  setFrom(dt);
                }}
                className="mt-1
          bvesting
          w-full
          rounded-md
          border-black-500
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </label>
            <label className="bvesting 2xl:max-w-[45%]">
              <span className="text-black-700">To:</span>
              <span className="text-red-700 ml-2">
                {errorMessages.to || ""}
              </span>
              <input
                disabled={!account}
                type="datetime-local"
                value={to ? to.substring(0, 16) : undefined}
                min={(from ? from : new Date().toISOString()).substring(0, 16)}
                onChange={(ev) => {
                  if (!ev.target["validity"].valid) return;
                  const dt = ev.target["value"] + ":00Z";
                  setTo(dt);
                }}
                className="mt-1
          bvesting
          w-full
          rounded-md
          border-black-500
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </label>
          </div>
        </>
      </>
    );
  }

  function renderPopMenu() {
    if (!vestings) return <></>;
    return (
      <>
        {/* <Modal
          title="Confirm Transfer"
          open={transferModalOpen}
          okButtonProps={{
            disabled: false,
            className: '!text-black-200 bg-[#5da9f8]',
          }}
          okText="Confirm"
          cancelText="Cancel"
          onCancel={() => setTransferModalOpen(false)}
          onOk={() => {
            if (newOwner && is_valid_address(newOwner)) {
              setTransferModalOpen(false)
              return submit_transfer_transaction()
            } else {
              notification.error({
                message: 'Please specify a valid address for the new owner.',
              })
              return false
            }
          }}
        >
          <>
            <div className="p-2">
              <label>
                <span className="text-black-700">
                  Enter the new owner address below:{' '}
                </span>
                <input
                  type="text"
                  value={newOwner}
                  onInput={(e) => {
                    setNewOwner(e.currentTarget.value)
                  }}
                  className="mt-1
cursor-default
w-full
rounded-md
shadow-sm
focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </label>
              <span className="text-gray-500">
                Service Fee: {fee / 10} $APT
              </span>
            </div>
          </>
        </Modal> */}
        <Popover
          trigger="click"
          content={
            <div className="flex flex-col">
              <Tooltip
                placement="right"
                title="Withdrawing all your assets would invalidate the vesting."
              >
                <button
                  disabled={false}
                  className="
                          cursor-default
                          px-6 py-2 text-[14px]
                          disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none
                          hover:opacity-[0.92] hover:bg-gray-100 hover:cursor-pointer
                          "
                  onClick={() => {
                    Modal.confirm({
                      title: "Confirm Withdrawal",
                      icon: <ExclamationCircleOutlined />,
                      content:
                        "Withdrawing this assets would terminate the vesting. Do you want to continue?",
                      okText: "Confirm",
                      cancelText: "Cancel",
                      onOk: () => {
                        submit_withdraw_transaction();
                      },
                    });
                  }}
                >
                  Withdraw
                </button>
              </Tooltip>
              <Tooltip
                placement="right"
                title="Copy the link of this vesting and send to your users."
              >
                <button
                  className="
                          cursor-default
                          disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none
                          px-6 py-2 text-[14px]
                          hover:opacity-[0.92] hover:bg-gray-100 hover:cursor-pointer
                          "
                  onClick={() => {
                    const link = `${window.location.origin}/vesting/claim/${selectedCoin?.type}/${selectedVesting}`;
                    navigator.clipboard.writeText(link);
                    notification["success"]({
                      message: "Success",
                      description:
                        "The claim link has copied to your clipboard!",
                    });
                  }}
                >
                  Copy Link
                </button>
              </Tooltip>
              {/* <Tooltip
                placement="right"
                title="Transfer your ownership of this lock to another wallet address"
              >
                <button
                  className="
                          cursor-default
                          disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none
                          px-6 py-2 text-[14px]
                          hover:opacity-[0.92] hover:bg-gray-100 hover:cursor-pointer
                          "
                  onClick={() => {
                    setTransferModalOpen(true)
                  }}
                >
                  Transfer
                </button>
              </Tooltip> */}
            </div>
          }
        >
          <a
            aria-disabled={!account}
            onClick={() => {
              // router.push(`/vestings/${selectedVesting}`)
            }}
            className="border-black-500 ml-2 mt-1 flex justify-between items-center bg-[#4c9d92] max-w-[206px] max-h-[48px] text-white px-6 py-2 text-center text-[17px] leading-[120%] rounded-md hover:cursor-pointer hover:text-gray-200 hover:opacity-[0.92] font-medium"
          >
            Actions
          </a>
        </Popover>
      </>
    );
  }

  function renderPreview() {
    const columns: ColumnsType<VestingEntity> = [
      {
        title: "Address",
        dataIndex: "target_address",
        key: "target_address",
        render: (v) => {
          return (
            v.toString().substring(0, 12) + "..." + v.toString().substr(-6)
          );
        },
      },
      {
        title: "Amount",
        dataIndex: "amount",
        fixed: "right",
        width: 120,
      },
      {
        title: "Cliff",
        dataIndex: "cliff",
        fixed: "right",
        width: 120,
        render: (v) => {
          return v === "0" ? "N/A" : `${v} day(s)`;
        },
      },
    ];
    return (
      <>
        <p className="text-black-500 animate-pulse font-bold">
          Notice: Vesting {amounts?.sub_total} $
          {selectedCoin?.symbol.toUpperCase()} to {entities.length} receiver(s).
          Fee: {amounts?.fee} $APT
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
        <p className="bvesting flex place-content-center ">
          <img
            alt="Aptos Coin Maker"
            src="/svgs/aptos-o.svg"
            className="w-48 animate-pulse drop-shadow-lg"
          />
        </p>
        <p className="bvesting flex place-content-center text-green-200">
          Your vesting is done, please copy the link below and send back to your
          users to claim.
        </p>
        <label className="bvesting">
          <span className="text-black-700">
            Your Vesting Claim Link (click to copy)
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
                bvesting
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
      <h2 className="text-2xl font-bold">Aptos Vesting Tool</h2>
      <div className="mt-6 max-w-md xs:max-w-[96%] sm:max-w-[96%] ">
        <div className="grid grid-cols-1 gap-6">
          {currentStep == 0 && renderForm()}
          {currentStep == 1 && renderPreview()}
          {currentStep == 2 && renderClaim()}

          <div className="bvesting sm:block hidden">
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

          <div className="bvesting place-content-center mt-4">
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

export default VestingForm;
