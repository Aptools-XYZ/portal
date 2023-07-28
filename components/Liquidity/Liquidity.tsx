import React, { useState } from "react";
import { LIQUIDITY_SECTION } from "config/constants";
import CreateForm from "./Form";
import { withDynamicHook } from "../../libs/withDynamicHook";

const LiquidityComp: React.FC = () => {
  const { title, des, steps } = LIQUIDITY_SECTION;
  // const [dexName, setDexName] = useState("Liquidswap");

  // const FormWithDynamicHook = withDynamicHook(
  //   `use${dexName}`,
  //   () => import(`./${dexName}`),
  //   CreateForm,
  //   "useDexHandler"
  // );

  // console.log("Render Liquidity.tsx.");

  return (
    <section className="pt-[110px] md:pt-[200px] vesting-section-bg overflow-hidden bg-[#F9FCFF] lg:h-[100vh] lg:min-h-[840px]">
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
        </div>
        <div className="grow lg:ml-24 pb-6 pl-4 bg-slate-500/75 rounded-[24px] min-w[380px]">
          {/* <FormWithDynamicHook
            onDexChange={(n: string) => {
              if (n !== dexName) {
                setDexName(n);
              }
            }}
          /> */}
          <CreateForm />
        </div>
      </div>
    </section>
  );
};
export default LiquidityComp;
