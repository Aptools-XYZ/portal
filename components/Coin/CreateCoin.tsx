import React from "react";
import { COIN_SECTION } from "config/constants";
import CreateCoinForm from "./Form";

const CreateCoin: React.FC = () => {
  const { title, des, steps } = COIN_SECTION;
  return (
    <section className="pt-[110px] lg:pt-[200px] predict-section-bg overflow-hidden bg-[#F9FCFF] xl:h-[100vh] lg:min-h-[840px]">
      <div className="container xl:flex">
        <div className="md:block hidden xl:w-[418px] md:w-[318px] text-[#292C33] lg:mr-24">
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
        <div className="grow bg-slate-500/75 rounded-[24px] block max-w-xl my-10 xl:my-0 xl:ml-24">
          <CreateCoinForm />
        </div>
      </div>
    </section>
  );
};
export default CreateCoin;
