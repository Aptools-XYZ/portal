import React from "react";
import { FOOTER_MENU } from "config/constants";
import Link from "next/link";

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#000000] lg:bg-normal-500 py-[12px] text-white">
      <div className="container">
        <div className=" mx-auto flex flex-row justify-center gap-x-10 items-center gap-y-4 md:gap-y-9 md:flex-row">
          <Link href="/">
            <a className="w-[108px] h-6 md:w-[108px] md:h-8 hidden sm:block">
              <img src="/images/logo@2x.png" alt="Logo" />
            </a>
          </Link>
          <div className="h-6 flex items-center gap-y-3 md:flex-row justify-center">
            © 2023 Aptools.xyz All rights reserved.
          </div>
          <div className="flex flex-col items-center gap-y-3 md:flex-row sm:flex hidden">
            {FOOTER_MENU.map((item, index) => {
              if (item.external) {
                return <ExternalFooterLink key={index} item={item} />;
              }
              if (item.href) {
                return <FooterLink key={index} item={item} />;
              }
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterLink: React.FC<{
  key: number;
  item: { href: string; label: string; icon?: string };
}> = ({ item }) => {
  return (
    <Link href={item.href}>
      <a className="text-[16px] font-medium leading-[120%] pr-4">
        {item.icon && <img alt={item.label} src={item.icon} />}
        {!item.icon && item.label}
      </a>
    </Link>
  );
};

const ExternalFooterLink: React.FC<{
  key: number;
  item: { external: string; label: string; icon?: string };
}> = ({ item }) => {
  return (
    <a
      href={item.external}
      target="_blank"
      rel="noreferrer"
      className="text-[16px] font-medium leading-[120%] pr-3"
    >
      {item.icon && <img alt={item.label} src={item.icon} />}
      {!item.icon && item.label}
    </a>
  );
};

export default Footer;
