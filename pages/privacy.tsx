import Link from "next/link";
import cn from "services/cn";
import { MENUS } from "config/constants";
import React, { useState } from "react";
import MobileMenu from "components/Header/MobileMenu";
import { chromeStoreExtURL } from "config/config";
import Footer from "components/Footer/Footer";
import Head from "next/head";
import Header from "components/Header/Header";

export const HeaderContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <h2 className="font-bold text-[28px] leading-[3.5rem] !text-left">
      {content}
    </h2>
  );
};
export const ContentContainer: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return <div className="text-justify">{children}</div>;
};

const Privacy = () => {
  const [showMobile, setShowMobile] = useState(false);
  const toggleMobile = () => {
    setShowMobile(!showMobile);
    if (showMobile) {
      document.body.style.overflow = "";
    } else {
      document.body.style.overflow = "hidden";
    }
  };
  return (
    <>
      <Head>
        <title>Privacy</title>
      </Head>
      <section className="bg-white">
        <div className="container pb-12">
          <Header />
          <div className="flex flex-col justify-center">
            <div className="flex flex-col gap-16 font-medium leading-6  pt-[120px]">
              <ContentContainer>
                <p className="text-[16px]">Effective date: Oct 13th, 2022</p>
                <p className="pt-[16px]">
                  Aptools.xyz (“we”, “us” or “our”) values your privacy. In this
                  Privacy Policy (“Policy”), we describe how we collect, use,
                  and disclose information that we obtain about visitors to our
                  website at https://aptools.xyz (the “Site”) and the services
                  available through our Site, including any mobile applications
                  and browser extensions (collectively, the “Services”), and how
                  we use and disclose that information.
                </p>
                <p className="pt-[16px]">
                  By visiting the Site, or using any of our Services, you agree
                  that your personal information will be handled as described in
                  this Policy. Your use of our Site or Services, and any dispute
                  over privacy, is subject to this Policy (including any
                  applicable changes) and an applicable Terms of Use, including
                  its applicable limitations on damages and provisions for the
                  resolution of disputes.
                </p>
              </ContentContainer>
            </div>
          </div>
        </div>
        <Footer />
      </section>
    </>
  );
};

export default Privacy;
