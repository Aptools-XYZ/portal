/* eslint-disable no-unused-vars */
import { useState } from "react";
import { LoadingOutlined, WalletOutlined } from "@ant-design/icons";
import {
  useWallet,
  SignMessageResponse,
  WalletName,
} from "@aptstats/aptos-wallet-framework";
import { useRouter } from "next/router";
import { Divider, Modal, Popover, Spin } from "antd";
import { useWalletConnector } from "../../services/WalletService";
import { getNetwork } from "../../config/config";

const WalletConnector: React.FC = () => {
  const [scroll, setScroll] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [showDisconnection, setShowDisconnection] = useState(false);
  const router = useRouter();
  const {
    state: { open: modalOpen },
    actions: { setModalOpen },
  } = useWalletConnector();
  const [txLoading, setTxLoading] = useState({
    sign: false,
    transaction: false,
  });
  const [txLinks, setTxLinks] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | SignMessageResponse>("");
  const {
    autoConnect,
    network,
    connect,
    disconnect,
    account,
    wallets,
    signAndSubmitTransaction,
    connecting,
    connected,
    disconnecting,
    wallet: currentWallet,
    signMessage,
    signTransaction,
  } = useWallet();

  const connectWallet = async (name: WalletName) => {
    try {
      if (connected) await disconnect();
      await connect(name);
      setModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const SUPPORTED_WALLETS = ["Petra", "Pontem", "Nightly"];
  const renderWalletConnectorGroup = () => {
    return (
      <div className="flex flex-col gap-4 w-full">
        {wallets
          .map((w) => {
            return w;
          })
          .filter(({ adapter }) => SUPPORTED_WALLETS.includes(adapter.name))
          .map((wallet) => {
            const option = wallet.adapter;
            return (
              <p
                onClick={() => {
                  if (!connected) connectWallet(option.name);
                }}
                title={"Connect to " + option.name + " Wallet"}
                key={option.name}
                className="bg-sky-500/[0.06] justify-between hover:bg-sky-700/[0.1] h-12 cursor-pointer flex flex-row pl-[6px] md:pl-[12px] lg:pl-[16px] border rounded-lg"
              >
                <span
                  id={option.name.split(" ").join("_")}
                  key={option.name}
                  className="connect-btn font-small text-xl flex-none place-self-center"
                >
                  {option.name} Wallet
                </span>
                <img
                  className="flex-initial self-center align-top circle mr-[12px]"
                  src={option.icon}
                  alt={option.name}
                  width={36}
                />
              </p>
            );
          })}
      </div>
    );
  };

  return (
    <>
      <Modal
        className="mobile:hidden bg-roadmap rounded-lg"
        bodyStyle={{ backgroundColor: "transparent !important" }}
        title="Connect Wallet"
        open={modalOpen}
        onCancel={closeModal}
        footer={<></>}
        destroyOnClose={true}
      >
        <span className="justify-center bg-[#4c9d92] w-[3.75rem] m-auto flex text-white text-6xl rounded-[50%] bg-gray color-red">
          <WalletOutlined />
        </span>
        <p className="m-4 text-center">
          To continue working with the site, you need to connect a wallet and
          allow the site access to your account.
        </p>
        <Divider />
        <div className="flex gap-4 items-center">
          {renderWalletConnectorGroup()}
        </div>
      </Modal>

      {connected ? (
        <div className="relative ml-auto flex items-center gap-6 mr-2">
          <a
            rel="noreferrer"
            className="hidden lg:block px-4 py-[10.40px] bg-[#1f9f92] hover:text-primary-500 hover:bg-[#14161a] text-white font-medium rounded-[100px] min-w-[88px] hover:opacity-[0.9] transition-all"
          >
            <div className="flex gap-x-1.5 items-center pl-[3px] capitalize">
              <span>{getNetwork(network.name!)}</span>
            </div>
          </a>
        </div>
      ) : (
        <></>
      )}

      <div className="relative ml-auto flex items-center gap-6">
        <a
          rel="noreferrer"
          onClick={() => (connected ? setShowDisconnection(true) : openModal())}
          className="hidden lg:block px-4 py-[10.40px] bg-[#1f9f92] hover:text-primary-500 hover:bg-[#14161a] text-white font-medium rounded-[100px] w-[188px] hover:opacity-[0.9] transition-all"
        >
          <div className="flex gap-x-1.5 items-center pl-[3px]">
            {!connected && (
              <img
                src="/svgs/aptos-o.svg"
                className="w-[20px] h-[15px]"
                alt="Wallet"
              />
            )}
            <>
              {(connecting || disconnecting) ?? (
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
                />
              )}

              {connected && account ? (
                <>
                  <Popover
                    trigger="hover"
                    content={
                      <span
                        className="cursor-pointer"
                        id="disconnectBtn"
                        onClick={() => {
                          disconnect();
                        }}
                      >
                        Disconnect
                      </span>
                    }
                  >
                    <div className="flex flex-row">
                      <img
                        className="flex-initial place-self-center align-top circle w-[20px] h-[20px] mr-2"
                        src={currentWallet?.adapter.icon}
                        alt={currentWallet?.adapter.name}
                      />
                      <span>
                        {account?.address?.toString().substring(0, 6)}...
                        {account?.address?.toString().substr(-5)}
                      </span>
                    </div>
                  </Popover>
                </>
              ) : (
                <span>Connect Wallet</span>
              )}
            </>
          </div>
        </a>
      </div>
    </>
  );
};

export default WalletConnector;
