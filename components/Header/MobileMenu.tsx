import React, { useEffect, useState } from "react";
import { FOOTER_MENU, MENU_MOBILE } from "config/constants";
import Link from "next/link";
import AtButton from "components/AtButton";
import { useRouter } from "next/router";
import cn from "services/cn";

const MobileMenu: React.FC<{ isShow: boolean }> = ({ isShow }) => {
  const { routerList, links } = MENU_MOBILE;
  const router = useRouter();
  const [isShowing, setIsShowing] = useState(false);
  const [forcedHidden, forceHidden] = useState(false);

  useEffect(() => {
    if (isShow !== isShowing) {
      setIsShowing(isShow);
      forceHidden(false);
    }
  }, [isShow, isShowing]);

  // console.log('router: ', router)
  return (
    <div
      className={`lg:hidden bg-[url('/images/road-map-background.png')] bg-cover bg-right-bottom h-[100vh] z-[-1] mt-0 pt-[100px] bg-no-repeat bg-white list ${
        isShow && !forcedHidden ? "is-active" : "hidden"
      }`}
    >
      <div className="hambugerBg"></div>
      {routerList.map((menu, i) => {
        if (menu.external) {
          return (
            <a
              href={menu.external}
              key={i}
              target="_blank"
              rel="noreferrer"
              className="block text-normal-400 text-[24px] leading-[120%] font-sans transition-all ease-in duration-150 hover:text-[#007EFB] py-4 text-left relative"
            >
              {menu.name}
              {menu.icon && (
                <img
                  src={menu.icon}
                  alt="More"
                  className="absolute top-[24px] -right-[19px] w-4 h-4"
                />
              )}
            </a>
          );
        }

        if (menu.href) {
          return (
            <Link
              href={menu.href}
              key={i}
              as={menu.href === "/" ? "/" : `${menu.href}/`}
            >
              <a
                onClick={(e) => forceHidden(true)}
                className={cn(
                  "block text-normal-400 text-[24px] leading-[120%] font-sans transition-all ease-in duration-150 hover:text-[#007EFB] py-4",
                  {
                    "!text-primary-200 font-bold":
                      router.pathname === menu.href,
                  }
                )}
              >
                {menu.name}
              </a>
            </Link>
          );
        }
      })}
      <a href="https://aptools.xyz" target="_blank" rel="noreferrer">
        <AtButton className="hidden shadow-type-1 px-5 py-[14px] bg-[#14161A] text-white font-medium rounded-[34px] mt-8 text-[18px] leading-[120%] ">
          Connect wallet
        </AtButton>
      </a>
      <div className="flex flex-row py-20 mb-8">
        {FOOTER_MENU.map((l, i) => (
          <a
            href={l.href}
            key={i}
            target="_blank"
            rel="noreferrer"
            className="mobile-menu-link block text-normal-400 font-bold text-[36px] leading-[120%] font-sans transition-all ease-in duration-150 hover:text-[#007EFB] py-4 text-left"
          >
            <img
              src={l.icon}
              alt={l.label}
              className="mr-9 h-[24px]"
              style={{ filter: "invert(0.75)" }}
            />
          </a>
        ))}
      </div>
    </div>
  );
};

export default MobileMenu;
