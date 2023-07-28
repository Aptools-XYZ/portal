import React from "react";
import { LOCK_SECTION } from "config/constants";
import { useRouter } from "next/router";
import CreateForm from "./Form";
import { Modal } from "antd";

const LockerComp: React.FC = () => {
  const { title, des, steps, link } = LOCK_SECTION;
  const router = useRouter();

  return (
    <section className="pt-[110px] md:pt-[200px] lock-section-bg overflow-hidden bg-[#F9FCFF] lg:h-[100vh] lg:min-h-[840px]">
      <div className="container lg:flex">
        <div className="md:block hidden xl:w-[418px] pb-12 md:w-[340px] text-[#292C33] flex-none lg:mr-24">
          <h1 className="pt-[90px] sm:pt-[8px] font-sans text-[28px] leading-[120%] font-medium text-center px-6 md:px-0 lg:text-[36px] md:leading-[119%] md:w-[502px] md:text-left">
            {title}
          </h1>
          <p className="hidden lg:block text-[20px] leading-[153%] mt-6">
            {des}
          </p>
          <ul className="flex mt-6 flex-col gap-4 list-inside list-disc">
            {steps.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          {link && (
            <a
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                Modal.confirm({
                  icon: <></>,
                  style: { minWidth: 660 },
                  closable: true,
                  okText: "",
                  content: (
                    <img
                      src={link.href}
                      className="min-w-[600px]"
                      alt="certificate"
                    />
                  ),
                });
                // router.push(link.href)
              }}
              rel="noreferrer"
              className="mt-4 flex justify-between items-center bg-[#14161A] max-w-[286px] max-h-[48px] text-white px-6 py-[13px] text-center text-[17px] leading-[120%] rounded-[100px] hover:cursor-pointer hover:opacity-[0.92] font-medium"
            >
              <img
                src={link.icon}
                alt="Get Started"
                width={24}
                className="mr-2"
              />
              <span>{link.text}</span>
            </a>
          )}
        </div>

        <div className="grow lg:ml-24 pb-6 pl-4 bg-slate-500/75 rounded-[24px] min-w[380px]">
          <CreateForm />
        </div>
      </div>
    </section>
  );
};
export default LockerComp;
