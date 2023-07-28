import { Dropdown, Space, Avatar } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { LIQUIDSWAP_RESOURCE_ACCOUNT } from "./Liquidity/Liquidswap";

export const DEXes = {
  Liquidswap: {
    address: `${LIQUIDSWAP_RESOURCE_ACCOUNT}::lp_coin::LP`,
    decimals: 6,
    logo: "https://aptstats.xyz/images/projects/liquidswap.jpg",
  },
  Pancakeswap: {
    address:
      "0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa::swap::LPToken",
    decimals: 8,
    logo: "https://aptstats.xyz/images/projects/pancakeswap.jpg",
  },
  // Thalaswap: {
  //   address: "thalaswap",
  //   decimals: 6,
  //   logo: "https://aptstats.xyz/images/projects/thala-labs.png",
  // },
};

export type DEX = {
  name: string;
  address: string;
  logo: string;
  decimals: number;
};

export type DexDropdownProps = {
  onChange?: (dex: DEX) => void;
  value?: string;
};

export default function DexDropdown(props: DexDropdownProps) {
  const [selected, setSelected] = useState<DEX>();

  useMemo(() => {
    if (!props.value) return;
    const item = Object.entries(DEXes).find(
      ([n, v]) => v.address === props.value
    );
    if (item) setSelected({ name: item[0], ...item[1] });
  }, [props.value]);

  return (
    <div
      style={{
        backgroundColor: "white",
        height: 48,
      }}
      className="
   mt-1
   bvesting
   w-full
   rounded-md
   border-black-500
   shadow-sm
   focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
 "
    >
      <Dropdown
        trigger={["click"]}
        menu={{
          items: Object.entries(DEXes).map(([name, value], index) => ({
            key: index,
            label: (
              <>
                <Space
                  style={{ width: "100%" }}
                  onClick={() => {
                    const dex = { name, ...value };
                    setSelected(dex);
                    props.onChange && props.onChange(dex);
                  }}
                >
                  <Avatar src={value.logo} />
                  {name}
                </Space>
              </>
            ),
          })),
        }}
      >
        <a
          onClick={(e) => e.preventDefault()}
          style={{
            width: "100%",
            display: "inline-flex",
            justifyItems: "stretch",
            justifyContent: "space-between",
            padding: 12,
            maxHeight: 46,
          }}
        >
          <Space>
            {selected?.logo ? <Avatar src={selected?.logo} /> : <></>}
            <span>{selected?.name || "Select a DEX"}</span>
          </Space>
          <DownOutlined style={{ alignSelf: "center", color: "gray" }} />
        </a>
      </Dropdown>
    </div>
  );
}
