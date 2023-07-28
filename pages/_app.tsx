import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
// import 'antd/dist/antd.css'
import "styles/main.scss";
import icon_top from "../public/svgs/arrow-up-solid.svg";
import { WalletProvider } from "@aptstats/aptos-wallet-framework";
import { PetraWalletAdapter } from "@aptstats/petra-wallet-extension";
import { PontemWalletAdapter } from "@aptstats/pontem-wallet-extension";
import { NightlyWalletAdapter } from "@aptstats/nightly-wallet-extension";
import { SpacecyWalletAdapter } from "@aptstats/spacecy-wallet-extension";

import { Analytics } from "@vercel/analytics/react";

function Website({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const wallets = useMemo(
    () => [
      new PetraWalletAdapter(),
      new PontemWalletAdapter(),
      new NightlyWalletAdapter(),
      new SpacecyWalletAdapter(),
      // new TokenPocketWalletAdapter(),
    ],
    []
  );

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      (window as any).gtag("config", process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS, {
        page_path: url,
      });
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  const [showToTop, setShowToTop] = useState(false);

  console.log("test", icon_top);
  useEffect(() => {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 400) {
        setShowToTop(true);
      } else {
        setShowToTop(false);
      }
    });
  }, []);

  const handleClickScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      {showToTop && (
        <button
          title="Scroll To Top"
          onClick={handleClickScrollToTop}
          className="fixed z-[9999] p-2 rounded-full bg-red-500 right-[20px] bottom-[40px] md:bottom-[80px] md:right-[50px] lg:right-[50px] lg:bottom-[60px] "
        >
          <img {...icon_top} alt="To Top" />
        </button>
      )}
      <WalletProvider
        wallets={wallets}
        autoConnect={true}
        onError={(error: Error) => {
          console.log("wallet errors: ", error);
          if (!error.message.includes("reject")) console.error(error);
          // notification['error']({
          //   description: error.message,
          //   message: 'Error occurred',
          //   // placement: 'bottomRight',
          // })
        }}
      >
        <Component {...pageProps} />
        <Analytics />
      </WalletProvider>
    </div>
  );
}

export default Website;
