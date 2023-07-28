import { Modal, notification, Popover, Spin, Steps, Tooltip } from "antd";
import { LoadingOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "@aptstats/aptos-wallet-framework";
import { useWalletConnector } from "../../services/WalletService";
import { AptosClient, Types } from "aptos";
import { getAptosClient } from "../../config/config";
import { Address, U64 } from "aptos/src/generated";
import moment from "moment";
import {
  makeLockupPayload,
  makeTransferPayload,
  makeWithdrawPayload,
} from "../../services/LockupService";
import { useRouter } from "next/router";
import { hexToU64, is_valid_address } from "../../libs/utils";
import { Watermark } from "@hirohe/react-watermark";
import MyCoinsDropdown from "../MyCoinsDropdown";
import { CoinInformation } from "../../models/CoinInformation";

const { Step } = Steps;

interface ErrorMessages {
  coin: string;
  amount: string;
  lockTo: string;
}

interface LockupInfo {
  id: string;
  unlock_time: number;
  locked_at: number;
  owner: Types.Address;
  amount: number;
  coin: string;
}

const isNotZero = (coin: CoinInformation) => {
  return !!(coin.balance || coin.value);
};

const LockCoinForm: React.FC = () => {
  const { account, connected, network, signAndSubmitTransaction, disconnect } =
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
  const [lockupLink, setLockupLink] = useState("");
  const [amountToLock, setAmountToLock] = useState(0);
  const [lockTo, setLockTo] = useState("");
  const [fee, setFee] = useState(0);
  const [locks, setLocks] = useState<LockupInfo[]>();
  const [resources, setResources] = useState<Types.MoveResource[]>([]);
  const [selectedLock, selectLock] = useState("");
  const [newOwner, setNewOwner] = useState<Address>();
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [reloadRequired, setReloadRequired] = useState(false);
  const [showCertificate, setCertificateShow] = useState(false);

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
          setButtonText("Confirm Locking");
          break;
        case 2:
          setButtonText("Done! Show My Certificate");
          break;
      }
    }
  }, [account, connected, currentStep]);

  useMemo(() => {
    (async () => {
      if (!connected || !aptosClient) return;
      const res = await aptosClient.getAccountResources(
        process.env.NEXT_PUBLIC_LOCKER_RESOURCE_ADDRESS!
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

    const price =
      hexToU64((data as any).config.map.data[1].value.value) / Math.pow(10, 8);

    setFee(price);
  }, [resources]);

  useEffect(() => {
    (async () => {
      if (!resources || resources.length == 0 || !selectedCoin) return;
      const res = resources.find(
        (r) =>
          r.type ===
          `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS!}::locker::OwnerLocks`
      );
      if (!res) return;
      try {
        const lock_ids = (await aptosClient!.getTableItem(
          (res.data as any).locks.inner.handle,
          {
            key_type: "address",
            value_type: "vector<u64>",
            key: account?.address,
          }
        )) as string[];
        if (lock_ids.length === 0) return;

        const existing_locks = [] as LockupInfo[];
        const store = resources.find(
          (r) =>
            r.type ===
            `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS!}::locker::InfoStore`
        );

        for await (const id of lock_ids) {
          const handle = ((store as any).data as any).store.inner.handle;
          try {
            const res = await aptosClient!.getTableItem(handle, {
              key_type: "u64",
              value_type: `${process.env
                .NEXT_PUBLIC_FACTORY_ADDRESS!}::locker::LockInfo`,
              key: id,
            });
            if (res.coin === selectedCoin.type) {
              const lock = {
                id,
                locked_at: res.locked_at,
                amount: +res.amount,
                owner: res.owner,
                unlock_time: +res.unlock_time,
                coin: res.coin,
              } as LockupInfo;
              existing_locks.push(lock);
            }
          } catch (e) {
            // console.error(e)
          }
        }
        setLocks(existing_locks);
        if (existing_locks.length > 0) selectLock(existing_locks[0].id);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [
    account,
    aptosClient,
    connected,
    resources,
    selectedCoin,
    reloadRequired,
  ]);

  async function handle() {
    if (!connected) return setModalOpen(true);
    if (currentStep == 0) validate();
    if (currentStep == 1) {
      Modal.confirm({
        title: "Confirm Locking",
        icon: <ExclamationCircleOutlined />,
        content:
          "Please make sure that everything has been checked correctly. Do you want to continue?",
        okText: "Confirm",
        cancelText: "Cancel",
        onOk: () => {
          submit_lock_transaction();
        },
      });
    }
    if (currentStep == 2) {
      setCertificateShow(true);
    }
  }

  function validate() {
    const err = {} as ErrorMessages;
    err.coin = !selectedCoin ? "You need to choose a coin" : "";
    err.amount = is_valid_amount(amountToLock + "")
      ? +selectedCoin!.value < amountToLock
        ? "insufficient balance"
        : ""
      : "Invalid amount";
    err.lockTo = !(
      moment(lockTo).isValid() && moment(lockTo) > moment().add(1, "d")
    )
      ? "invalid lockup period."
      : "";

    setErrorMessages(err);
    const allValid = !Object.keys(err).some((k) => (err as any)[k]);
    if (allValid) setCurrentStep(1);
    return allValid;
  }

  function is_valid_amount(amount: string) {
    return !isNaN(+amount) && +amount > 0;
  }

  async function submit_lock_transaction() {
    if (!selectedCoin) return;
    try {
      setTxLoading({
        ...txLoading,
        transaction: true,
      });

      const payload = makeLockupPayload(
        selectedCoin?.type!,
        amountToLock * Math.pow(10, selectedCoin?.decimals) + "",
        Math.round(new Date(lockTo).getTime() / 1000)
      );
      const transactionRes = await signAndSubmitTransaction(payload);
      const result = await aptosClient!.waitForTransactionWithResult(
        transactionRes?.hash || "",
        {
          checkSuccess: true,
        }
      );
      const index =
        hexToU64(
          (result as any).changes.find((c: any) =>
            c.data.type.includes("ConfigurationV1")
          ).data.data.config.map.data[0].value.value
        ) - 1;

      const link = `${window.location.origin}/locks/${selectedCoin?.type}/${index}`;
      setLockupLink(link);
      const links = [
        ...txLinks,
        `https://explorer.${process.env.NEXT_PUBLIC_APTOS_ENV}.aptos.dev/txn/${transactionRes?.hash}`,
      ];
      setTxLinks(links);
      setCurrentStep(2);
      setReloadRequired(true);
      selectLock(index.toString());
      notification["success"]({
        message: "Congrats!",
        description: "Your coins have been locked up successfully!",
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

  async function submit_withdraw_transaction() {
    if (!selectedCoin) return;
    try {
      setTxLoading({
        ...txLoading,
        transaction: true,
      });

      const payload = makeWithdrawPayload(selectedCoin?.type!, selectedLock);
      const transactionRes = await signAndSubmitTransaction(payload);
      await aptosClient!.waitForTransaction(transactionRes?.hash || "", {
        checkSuccess: true,
      });

      const links = [
        ...txLinks,
        `https://explorer.${process.env.NEXT_PUBLIC_APTOS_ENV}.aptos.dev/txn/${transactionRes?.hash}`,
      ];
      setTxLinks(links);
      notification["success"]({
        message: "Success!",
        description: "Your transaction has been executed successfully!",
      });
      setReloadRequired(true);
    } catch (err) {
      console.log("tx error: ", (err as any).msg);
    } finally {
      setTxLoading({
        ...txLoading,
        transaction: false,
      });
    }
  }

  async function submit_transfer_transaction() {
    if (!selectedCoin || !newOwner) return;
    try {
      setTxLoading({
        ...txLoading,
        transaction: true,
      });

      const payload = makeTransferPayload(
        selectedCoin?.type!,
        newOwner,
        selectedLock
      );
      const transactionRes = await signAndSubmitTransaction(payload);
      await aptosClient!.waitForTransaction(transactionRes?.hash || "", {
        checkSuccess: true,
      });

      const links = [
        ...txLinks,
        `https://explorer.${process.env.NEXT_PUBLIC_APTOS_ENV}.aptos.dev/txn/${transactionRes?.hash}`,
      ];
      setTxLinks(links);
      notification["success"]({
        message: "Success!",
        description: `Your lock has been transferred to ${newOwner} successfully!`,
      });
      setReloadRequired(true);
    } catch (err) {
      console.log("tx error: ", (err as any).msg);
    } finally {
      setTxLoading({
        ...txLoading,
        transaction: false,
      });
    }
  }

  function renderCertificate() {
    if (!locks || locks.length == 0) return <></>;
    const locked_asset = locks?.find((l) => l.id === selectedLock);
    return (
      <>
        <Modal
          title="Lock Certificate"
          className=" min-w-[1080px] select-none"
          open={showCertificate}
          onCancel={() => setCertificateShow(false)}
          footer={null}
        >
          <Watermark text={"aptools.xyz" + " - " + locked_asset?.coin || ""}>
            <div className="certification-bg relative block w-full min-h-[640px] min-w-[960px]">
              <div className="content absolute top-[202px] left-[382px]  block w-full flex flex-col font-sans text-[16px]">
                <label>
                  Locked Assets:
                  <span className="ml-4 underline">
                    {(
                      Math.round(
                        (locked_asset?.amount! /
                          Math.pow(10, selectedCoin?.decimals!)) *
                          10000
                      ) / 10000
                    ).toFixed(4)}{" "}
                    ${selectedCoin?.symbol} ({selectedCoin?.name})
                  </span>
                </label>
                <label>
                  Lock Time:
                  <span className="ml-4 underline">
                    {moment(locked_asset?.locked_at! * 1000).format(
                      "yyyy-MM-DD HH:mm"
                    )}{" "}
                  </span>
                </label>
                <label>
                  Unlock Time:
                  <span className="ml-4 underline">
                    {moment(locked_asset?.unlock_time! * 1000).format(
                      "yyyy-MM-DD HH:mm"
                    )}{" "}
                  </span>
                </label>
              </div>
              <div className="absolute bottom-[100px] left-[262px] font-sans ">
                {locked_asset?.owner}
              </div>
              <div className="absolute bottom-[20px] left-[102px] font-sans ">
                {moment().format("yyyy-MM-DD HH:mm")}
              </div>
              <div className="absolute bottom-[40px] left-[102px] font-sans text-gray-700 text-[12px]">
                Address: {locked_asset?.coin}
              </div>
            </div>
          </Watermark>
        </Modal>
      </>
    );
  }

  function renderPopMenu() {
    if (!locks) return <></>;
    return (
      <>
        <Modal
          title="Confirm Transfer"
          open={transferModalOpen}
          okButtonProps={{
            disabled: false,
            className: "!text-black-200 bg-[#5da9f8]",
          }}
          okText="Confirm"
          cancelText="Cancel"
          onCancel={() => setTransferModalOpen(false)}
          onOk={() => {
            if (newOwner && is_valid_address(newOwner)) {
              setTransferModalOpen(false);
              return submit_transfer_transaction();
            } else {
              notification.error({
                message: "Please specify a valid address for the new owner.",
              });
              return false;
            }
          }}
        >
          <>
            <div className="p-2">
              <label>
                <span className="text-black-700">
                  Enter the new owner address below:{" "}
                </span>
                <input
                  type="text"
                  value={newOwner}
                  onInput={(e) => {
                    setNewOwner(e.currentTarget.value);
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
        </Modal>
        <Popover
          trigger="click"
          content={
            <div className="flex flex-col">
              <Tooltip
                placement="right"
                title={
                  locks.find((a) => a.id === selectedLock)!.unlock_time * 1000 >
                  new Date().getTime()
                    ? `Not withdrawable until ${moment(
                        locks.find((a) => a.id === selectedLock)!.unlock_time *
                          1000
                      ).format("yyyy-MM-DD hh:mm")}`
                    : ""
                }
              >
                <button
                  disabled={
                    locks.find((a) => a.id === selectedLock)!.unlock_time *
                      1000 >
                    new Date().getTime()
                  }
                  className="
                          cursor-default
                          px-6 py-2 text-[14px]
                          disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none
                          hover:opacity-[0.92] hover:bg-gray-100 hover:cursor-pointer
                          "
                  onClick={() => {
                    submit_withdraw_transaction();
                  }}
                >
                  Withdraw
                </button>
              </Tooltip>
              <Tooltip
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
                    setTransferModalOpen(true);
                  }}
                >
                  Transfer
                </button>
              </Tooltip>
              <Tooltip
                placement="right"
                title="View your certificate of this lock."
              >
                <button
                  className="
                          cursor-default
                          disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none
                          px-6 py-2 text-[14px]
                          hover:opacity-[0.92] hover:bg-gray-100 hover:cursor-pointer
                          "
                  onClick={() => {
                    setCertificateShow(true);
                  }}
                >
                  Certificate
                </button>
              </Tooltip>
            </div>
          }
        >
          <a
            aria-disabled={!account}
            onClick={() => {
              // router.push(`/locks/${selectedLock}`)
            }}
            className="border-black-500 ml-2 mt-1 flex justify-between items-center bg-[#4c9d92] max-w-[206px] max-h-[48px] text-white px-6 py-2 text-center text-[17px] leading-[120%] rounded-md hover:cursor-pointer hover:text-gray-200 hover:opacity-[0.92] font-medium"
          >
            Actions
          </a>
        </Popover>
      </>
    );
  }

  function renderForm() {
    return (
      <>
        <label className="block">
          <span className="text-black-700">Select a coin to lock:</span>
          <span className="text-red-700 ml-2">{errorMessages.coin || ""}</span>
          <MyCoinsDropdown
            placeholder="Select a coin to lock"
            disabled={!account}
            value={selectedCoin?.type || (coin as string)}
            coinFilter={isNotZero}
            onChange={(coin) => {
              setLocks([]);
              selectCoin(coin);
            }}
          />
        </label>
        {locks && locks.length > 0 && (
          <>
            <label className="block">
              <span className="text-black-700">View existing locks: </span>
              <div className="block flex flex-row">
                <select
                  disabled={!account}
                  onChange={(e) => {
                    selectLock(e.target.value);
                  }}
                  className="mt-1
          block
          w-full
          rounded-md
          border-black-500
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                  {locks.map((lock, i) => (
                    <option key={i} value={lock.id}>
                      [{lock.id}]
                      {Math.round(
                        (lock.amount / Math.pow(10, selectedCoin?.decimals!)) *
                          10000
                      ) / 10000}{" "}
                      ${selectedCoin?.symbol} locked at{" "}
                      {moment(lock.locked_at * 1000).format("yyyy-MM-DD hh:mm")}
                      , unlock time:{" "}
                      {moment(lock.unlock_time * 1000).format(
                        "yyyy-MM-DD hh:mm"
                      )}
                    </option>
                  ))}
                </select>

                {renderPopMenu()}
              </div>
            </label>
          </>
        )}
        <label className="block">
          <span className="text-black-700">Amount to Lock: </span>
          <span className="text-red-700 ml-2">
            {errorMessages.amount || ""}
          </span>
          <div className="block flex flex-row">
            <input
              type="text"
              disabled={!account}
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
              value={amountToLock || "0"}
              placeholder="0"
              onChange={(e) => setAmountToLock(+e.target.value)}
            />
            <a
              aria-disabled={!account}
              onClick={() => setAmountToLock(+selectedCoin?.value!)}
              className="border-black-500 ml-2 mt-1 flex justify-between items-center bg-[#4c9d92] max-w-[206px] max-h-[48px] text-white px-6 py-2 text-center text-[17px] leading-[120%] rounded-md hover:cursor-pointer hover:text-gray-200 hover:opacity-[0.92] font-medium"
            >
              Max
            </a>
          </div>
        </label>
        <label className="block">
          <span className="text-black-700">Lock to: </span>
          <span className="text-red-700 ml-2">
            {errorMessages.lockTo || ""}
          </span>
          <div className="block flex flex-row">
            <input
              type="datetime-local"
              step={60 * 10}
              min={new Date().toISOString().substring(0, 16)}
              disabled={!account}
              required
              className="
          mt-1
          block
          w-full
          rounded-md
          border-black-500
          shadow-sm
          focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
        "
              value={lockTo ? lockTo.substring(0, 16) : undefined}
              onChange={(ev) => {
                if (!ev.target["validity"].valid) return;
                const dt = ev.target["value"] + ":00Z";
                setLockTo(dt);
              }}
            />
            <select
              disabled={!account}
              onChange={(e) => {
                if (e.target.value === "0") return setLockTo("");
                let val = e.target.value.split("-");
                let date = moment()
                  .add(val[0], val[1] as any)
                  .local(true);
                setLockTo(date.toISOString());
              }}
              className="border-black-500 ml-2 mt-1 flex justify-between items-center bg-[#4c9d92] max-w-[206px] max-h-[48px] text-white px-6 py-2 text-center text-[17px] leading-[120%] rounded-md hover:cursor-pointer hover:text-gray-200 hover:opacity-[0.92] font-medium"
            >
              <option value="0">Manual</option>
              <option value="1-M">1 Month</option>
              <option value="2-M">2 Months</option>
              <option value="3-M">3 Months</option>
              <option value="4-M">4 Months</option>
              <option value="5-M">5 Months</option>
              <option value="6-M">6 Months</option>
              <option value="1-y">1 Year</option>
              <option value="2-y">2 Years</option>
              <option value="3-y">3 Years</option>
            </select>
          </div>
        </label>
      </>
    );
  }

  function renderPreview() {
    return (
      <>
        <p className="text-black-700 text-md">
          You are locking{" "}
          <span className="font-bold underline">
            {amountToLock} ${selectedCoin?.symbol.toUpperCase()}
          </span>{" "}
          to{" "}
          <span className="font-bold underline">
            {moment(lockTo).format("yyyy-MM-DD hh:mm")}
          </span>
          . <br />
          Service Fee: <span className="font-bold underline">{fee} $APT</span>
        </p>

        <p className="text-red-800 text-md">
          Please remember no one can withdraw the locked assets until the
          specified date including yourself.
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
        <p className="block flex place-content-center ">
          <img
            alt="Aptos Coin Maker"
            src="/svgs/aptos-o.svg"
            className="w-48 animate-pulse drop-shadow-lg"
          />
        </p>
        <p className="block flex place-content-center text-green-200">
          Your lock is done, please copy the link below and send back to your
          community to show your determination.
        </p>
        <label className="block">
          <span className="text-black-700">
            Your Lockup Link (click to copy)
          </span>
          <input
            required
            readOnly
            onClick={() => {
              navigator.clipboard.writeText(lockupLink);
              notification["success"]({
                message: "Success",
                description: "The lockup link has copied to your clipboard!",
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
            value={lockupLink || ""}
          />
        </label>
      </>
    );
  }

  return (
    <div className="py-6 pl-6 xs:py-4 xs:pl-2">
      <h2 className="text-2xl font-bold">Create a new lock</h2>
      <div className="mt-6 max-w-md xs:max-w-[96%] sm:max-w-[96%] ">
        <div className="grid grid-cols-1 gap-6">
          {currentStep == 0 && renderForm()}
          {currentStep == 1 && renderPreview()}
          {currentStep == 2 && renderSuccess()}

          {renderCertificate()}

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
              bg-[#14161A] max-h-[48px] text-white px-6 py-[13px] text-[17px] leading-[120%] rounded-[100px] hover:cursor-pointer hover:opacity-[0.92] font-medium"
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

export default LockCoinForm;
